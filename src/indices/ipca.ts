import { fetchIndex } from '../lib/fetchIndex';
import type { IndexValue } from '../lib/types';
import { parseNumber, getValidIBGEDate } from '../lib/utils';

/**
 * Calcula a variação percentual entre dois números-índice
 */
function calculateVariation(
	current: number,
	previous: number,
): number {
	return ((current - previous) / previous) * 100;
}

export async function fetchIPCA(
	fallback?: IndexValue,
): Promise<IndexValue> {
	const currentDate = new Date();
	const fiveYearsAgo = getValidIBGEDate(5);
	const oneYearAgo = getValidIBGEDate(1);

	return fetchIndex({
		url: `https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/-12/variaveis/2266?localidades=N1[all]`,
		parser: (data) => {
			const series = data?.[0]?.resultados?.[0]?.series?.[0]?.serie;
			if (!series || Object.keys(series).length < 12) return null;

			const periods = Object.keys(series).sort();
			const firstPeriod = periods[0];
			const lastPeriod = periods[periods.length - 1];

			const firstValue = parseNumber(series[firstPeriod]);
			const lastValue = parseNumber(series[lastPeriod]);

			// Variação dos últimos 12 meses
			return parseNumber(calculateVariation(lastValue, firstValue));
		},
		fallback,
		indexName: 'IPCA',
		historicalConfig: {
			urlBuilder: () =>
				`https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/${fiveYearsAgo}-${oneYearAgo}/variaveis/2266?localidades=N1[all]`,
			parser: (data) => {
				const series = data?.[0]?.resultados?.[0]?.series?.[0]?.serie;
				if (!series) return [];

				const periods = Object.keys(series).sort();
				const yearlyVariations: number[] = [];

				// Calcula variação anual para cada ano
				for (let i = 12; i < periods.length; i += 12) {
					const current = parseNumber(series[periods[i]]);
					const previous = parseNumber(series[periods[i - 12]]);
					yearlyVariations.push(
						calculateVariation(current, previous),
					);
				}

				return yearlyVariations;
			},
		},
	});
}
