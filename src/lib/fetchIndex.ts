import {
	fetchWithRetry,
	EconomicIndicesLogger,
	parseNumber,
} from './utils';
import { IndexValue } from './types';

const logger = EconomicIndicesLogger.getInstance();

interface FetchIndexOptions {
	url: string;
	parser: (data: any) => number | IndexValue | null;
	fallback?: IndexValue;
	indexName: string;
	isHistorical?: boolean;
	historicalParser?: (data: any) => number[];
}

export async function fetchIndex(
	options: FetchIndexOptions,
): Promise<IndexValue> {
	const {
		url,
		parser,
		fallback,
		indexName,
		isHistorical,
		historicalParser,
	} = options;

	try {
		logger.log(`Fetching ${indexName} data from ${url}`);

		// Dados atuais
		const currentData = await fetchWithRetry(
			url,
			(data) => {
				const parsed = parser(data);
				if (parsed === null || parsed === undefined) {
					throw new Error(`No ${indexName} data available`);
				}
				return parsed;
			},
			{ retries: 3 },
		);

		// Se for um índice com histórico, busca os dados históricos
		let historicalValues: number[] = [];
		if (isHistorical && historicalParser) {
			const historicalUrl =
				url.replace('/ultimos/1', '') + '&dataInicial=5yearsago';
			try {
				const historicalData = await fetchWithRetry(
					historicalUrl,
					historicalParser,
					{ retries: 3 },
				);
				historicalValues = historicalData;
			} catch (error) {
				logger.error(
					`Failed to fetch historical ${indexName} data`,
					error,
				);
			}
		}

		// Retorna o objeto IndexValue formatado
		if (typeof currentData === 'number') {
			return {
				current: currentData,
				last5YearsAvg:
					historicalValues.length > 0 ?
						getLast5YearsAvg(historicalValues)
					:	undefined,
				lastUpdated: new Date().toISOString(),
			};
		} else {
			return {
				...currentData,
				last5YearsAvg:
					historicalValues.length > 0 ?
						getLast5YearsAvg(historicalValues)
					:	currentData.last5YearsAvg,
				lastUpdated: new Date().toISOString(),
			};
		}
	} catch (error) {
		logger.error(`Failed to fetch ${indexName} data`, error);

		if (fallback) {
			logger.log(`Using fallback ${indexName} data`);
			return fallback;
		}

		return {
			current: 0,
			lastUpdated: new Date().toISOString(),
		};
	}
}

function getLast5YearsAvg(values: number[]): number {
	if (values.length === 0) return 0;
	const sum = values.reduce((a, b) => a + b, 0);
	return sum / values.length;
}
