import type { IndexValue } from './types';
import {
	EconomicIndicesLogger,
	type FetchOptions,
	fetchWithRetry,
	parseNumber,
} from './utils';

const logger = EconomicIndicesLogger.getInstance();

interface FetchIndexParams<T = any> {
	url: string;
	parser: (data: T) => number | IndexValue | null;
	fallback?: IndexValue;
	indexName: string;
	fetchOptions?: FetchOptions;
	historicalConfig?: {
		urlBuilder: (baseUrl: string) => string;
		parser: (data: any) => number[];
	};
}

export async function fetchIndex<T = any>(
	params: FetchIndexParams<T>,
): Promise<IndexValue> {
	const {
		url,
		parser,
		fallback,
		indexName,
		fetchOptions = { retries: 3, retryDelay: 1000, timeout: 8000 },
		historicalConfig,
	} = params;

	try {
		logger.log(`> '${indexName}'`, url);

		// 1. Busca dados atuais (com tratamento correto do Response)
		const currentData = await fetchWithRetry(
			url,
			async (response) => {
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();
				const parsed = parser(data);

				if (parsed === null || parsed === undefined) {
					throw new Error(`Invalid ${indexName} data structure`);
				}
				return parsed;
			},
			fetchOptions,
		);

		// 2. Busca dados históricos (se configurado)
		let historicalValues: number[] = [];
		if (historicalConfig) {
			try {
				const historicalUrl = historicalConfig.urlBuilder(url);
				historicalValues = await fetchWithRetry(
					historicalUrl,
					async (response) => {
						const data = await response.json();
						return historicalConfig.parser(data);
					},
					{ ...fetchOptions, timeout: 15000 }, // Timeout maior para históricos
				);
			} catch (error) {
				logger.error(
					`Failed to fetch historical ${indexName} data`,
					error,
				);
			}
		}

		// 3. Formata a resposta
		return formatIndexValue(currentData, historicalValues);
	} catch (error) {
		logger.error(`Failed to fetch ${indexName} data:`, error);
		return fallback ?? createFallbackIndex();
	}
}

// Helpers (mantidos exatamente como estão)
function formatIndexValue(
	data: number | IndexValue,
	historicalValues: number[] = [],
): IndexValue {
	const baseValue =
		typeof data === 'number' ? { current: data } : data;

	const avg =
		historicalValues.length > 0 ? calculateAverage(historicalValues)
		: 'last5YearsAvg' in baseValue ? baseValue.last5YearsAvg
		: undefined;

	return {
		...baseValue,
		last5YearsAvg: avg,
		lastUpdated: new Date().toISOString(),
	};
}

function calculateAverage(values: number[]): number {
	return parseFloat(
		(
			values.reduce((sum, value) => sum + value, 0) / values.length
		).toFixed(2),
	);
}

function createFallbackIndex(): IndexValue {
	return {
		current: 0,
		lastUpdated: new Date().toISOString(),
	};
}
