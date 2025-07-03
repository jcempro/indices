import { fetchIndex } from '../lib/fetchIndex';
import type { IndexValue } from '../lib/types';
import { parseNumber, getValidIBGEDate } from '../lib/utils';

/**
 * Calcula a variação percentual acumulada a partir de uma série de variações mensais
 */
function calculateAccumulated(variations: number[]): number {
	if (variations.length === 0) return 0;

	// Fórmula de variação acumulada: (1 + v1) * (1 + v2) * ... * (1 + vn) - 1
	const accumulated =
		variations.reduce((acc, variation) => {
			return acc * (1 + variation / 100);
		}, 1) - 1;

	return accumulated * 100; // Retorna em porcentagem
}

export async function fetchINPC(
	fallback?: IndexValue,
): Promise<IndexValue> {
	const currentDate = new Date();
	const fiveYearsAgo = getValidIBGEDate(5);
	const oneYearAgo = getValidIBGEDate(1);

	return fetchIndex({
		// URL para obter os últimos 12 meses do INPC
		url: `https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/63/p/${fiveYearsAgo}-${oneYearAgo}?formato=json`,
		parser: (data) => {
			// A API Sidra retorna um array de objetos (primeiro item é cabeçalho)
			if (!Array.isArray(data) || data.length < 13) return null;

			// Pega os últimos 12 meses (ignora cabeçalho e itens extras)
			const last12Months = data.slice(-12);

			// Extrai as variações mensais (campo "V")
			const monthlyVariations = last12Months.map((entry) =>
				parseNumber(entry.V),
			);

			// Calcula o acumulado dos últimos 12 meses
			return parseFloat(
				calculateAccumulated(monthlyVariations).toFixed(2),
			);
		},
		fallback,
		indexName: 'INPC',
		historicalConfig: {
			// URL para obter os dados mensais dos últimos 5 anos
			urlBuilder: () =>
				`https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/63/p/${fiveYearsAgo}-${oneYearAgo}?formato=json`,
			parser: (data) => {
				if (!Array.isArray(data) || data.length < 2) return [];

				// Ignora o cabeçalho (primeiro item)
				const entries = data.slice(1);

				// Agrupa por ano e calcula o acumulado anual
				const yearlyAccumulated: number[] = [];
				const valuesByYear: Record<string, number[]> = {};

				// Organiza os valores por ano
				entries.forEach((entry) => {
					const dateStr = entry.D4N; // Ex: "janeiro 2020"
					const year = dateStr.split(' ')[1];
					const value = parseNumber(entry.V);

					if (!valuesByYear[year]) {
						valuesByYear[year] = [];
					}
					valuesByYear[year].push(value);
				});

				// Calcula o acumulado para cada ano completo (12 meses)
				Object.keys(valuesByYear).forEach((year) => {
					const monthlyValues = valuesByYear[year];
					if (monthlyValues.length === 12) {
						yearlyAccumulated.push(
							calculateAccumulated(monthlyValues),
						);
					}
				});

				return yearlyAccumulated;
			},
		},
	});
}
