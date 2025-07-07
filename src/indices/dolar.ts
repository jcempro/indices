import { fetchIndex } from '../engine/fetchIndex.js';
import { IndexValue } from '../types/types.js';
import {
	parseNumber,
	getValidBCBDate,
	EconomicIndicesLogger,
	calculateAverageRate,
} from '../engine/utils.js';

const logger = EconomicIndicesLogger.getInstance();

/**
 * Adaptação da função existente em utils.ts para formato BCB (dd-mm-yyyy)
 */
function formatBCBDate(date: Date): string {
	return getValidBCBDate(0, date); // Reaproveita a função existente
}

/**
 * Obtém a data do último dia útil
 */
function getPreviousBusinessDay(): Date {
	const date = new Date();

	// Volta 1 dia (considerando final de semana)
	date.setDate(date.getDate() - 1);

	// Se for domingo (0) ou sábado (6), volta para sexta-feira
	if (date.getDay() === 0) date.setDate(date.getDate() - 2);
	else if (date.getDay() === 6) date.setDate(date.getDate() - 1);

	return date;
}

export async function fetchDolar(
	fallback?: IndexValue,
): Promise<IndexValue> {
	const previousBusinessDay = getPreviousBusinessDay();
	const fiveYearsAgo = new Date(getValidBCBDate(5));

	try {
		logger.log(
			'Iniciando busca por cotação PTAX do dólar (dia útil anterior)',
		);

		return await fetchIndex({
			// API do Banco Central para cotação PTAX do dia útil anterior
			url: `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${formatBCBDate(previousBusinessDay)}'&$top=1&$format=json`,
			p: (data: any) => {
				// Verifica se há dados válidos
				if (!data.value || data.value.length === 0) {
					logger.log(
						'Nenhum dado encontrado na API do BCB para o dia útil anterior',
					);
					return null;
				}

				const quote = data.value[0];
				const value = parseNumber(quote.cotacaoCompra);
				logger.log(
					`Cotação PTAX encontrada para ${formatBCBDate(previousBusinessDay)}: ${value}`,
				);
				return value;
			},
			fb: fallback,
			iname: 'Dólar (PTAX)',
			hCfg: {
				// URL para obter dados históricos dos últimos 5 anos
				urlBuilder: () => {
					const endDate = formatBCBDate(previousBusinessDay);
					const startDate = formatBCBDate(fiveYearsAgo);
					const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${startDate}'&@dataFinalCotacao='${endDate}'&$top=10000&$format=json`;
					logger.log(`Buscando dados históricos PTAX: ${url}`);
					return url;
				},
				p: (data) => {
					if (!data.value || data.value.length === 0) {
						logger.log('Nenhum dado histórico PTAX encontrado');
						return [];
					}

					// Filtra apenas cotações PTAX (dias úteis)
					const businessDayQuotes = data.value.filter(
						(entry: any) => {
							const date = new Date(entry.dataHoraCotacao);
							return date.getDay() !== 0 && date.getDay() !== 6; // Remove sábado e domingo
						},
					);

					// Agrupa cotações por ano para calcular médias anuais
					const yearlyAverages: number[] = [];
					const quotesByYear: Record<number, number[]> = {};

					businessDayQuotes.forEach((entry: any) => {
						const date = new Date(entry.dataHoraCotacao);
						const year = date.getFullYear();
						const quote = parseNumber(entry.cotacaoCompra);

						if (!quotesByYear[year]) {
							quotesByYear[year] = [];
						}
						quotesByYear[year].push(quote);
					});

					// Calcula média anual para cada ano com dados
					Object.keys(quotesByYear).forEach((year) => {
						const yearNumber = parseInt(year);
						if (yearNumber >= fiveYearsAgo.getFullYear()) {
							const avg = calculateAverageRate(
								quotesByYear[yearNumber],
							);
							yearlyAverages.push(avg);
							logger.log(`Média anual PTAX ${year}: ${avg}`);
						}
					});

					return yearlyAverages;
				},
			},
		});
	} catch (error) {
		logger.error('Erro ao buscar cotação PTAX do dólar', error);
		throw error;
	}
}
