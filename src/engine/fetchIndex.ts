import { DEFAULT_FETCH_OPTIONS } from '../config.js';
import { IndexValue } from '../types/types.js';
import {
	EconomicIndicesLogger,
	FetchOptions,
	fetchWithRetry,
} from './utils.js';

const logger = EconomicIndicesLogger.getInstance();

interface FetchIndexParams<T = any> {
	url: string;
	p: (data: any) => number | IndexValue | null;
	fb?: IndexValue;
	iname: string;
	fOpt?: FetchOptions;
	hCfg?: {
		urlBuilder: (baseUrl: string) => string;
		p: (data: any) => number[];
	};
}

export async function fetchIndex<T = any>(
	params: FetchIndexParams<T>,
): Promise<IndexValue> {
	const {
		url,
		p,
		fb,
		iname,
		fOpt = DEFAULT_FETCH_OPTIONS,
		hCfg,
	} = params;

	try {
		logger.log(`> '${iname}'`, url);

		// 1. Busca dados atuais (com tratamento correto do Response)
		const currentData = await fetchWithRetry(
			url,
			async (response) => {
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();
				const parsed = p(data);

				if (parsed === null || parsed === undefined) {
					throw new Error(`Invalid ${iname} data structure`);
				}
				return parsed;
			},
			fOpt,
		);

		// 2. Busca dados históricos (se configurado)
		let historicalValues: number[] = [];
		if (hCfg) {
			try {
				const historicalUrl = hCfg.urlBuilder(url);
				historicalValues = await fetchWithRetry(
					historicalUrl,
					async (response) => {
						const data = await response.json();
						return hCfg.p(data);
					},
					{ ...fOpt, timeout: 15000 }, // Timeout maior para históricos
				);
			} catch (error) {
				logger.error(
					`Failed to fetch historical ${iname} data`,
					error,
				);
			}
		}

		// 3. Formata a resposta
		return formatIndexValue(currentData, historicalValues);
	} catch (error) {
		logger.error(`Failed to fetch ${iname} data:`, error);
		return fb ?? createfbIndex();
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
		: 'avg' in baseValue ? baseValue.avg
		: undefined;

	return {
		...baseValue,
		avg: avg,
		updated: new Date(),
	};
}

function calculateAverage(values: number[]): number {
	return parseFloat(
		(
			values.reduce((sum, value) => sum + value, 0) / values.length
		).toFixed(2),
	);
}

function createfbIndex(): IndexValue {
	return {
		current: 0,
		updated: new Date(),
	};
}
