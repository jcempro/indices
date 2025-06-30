import { IndexValue } from './types';

interface FetchOptions {
	retries?: number;
	retryDelay?: number;
	timeout?: number;
}

export const DEFAULT_FETCH_OPTIONS: FetchOptions = {
	retries: 3,
	retryDelay: 1000,
	timeout: 5000,
};

export function ensureIndexValue(
	value: number | IndexValue | null | undefined,
	fallback: IndexValue,
): IndexValue {
	if (value === null || value === undefined) {
		return fallback;
	}

	// Se já for um objeto IndexValue
	if (typeof value === 'object' && 'current' in value) {
		return value;
	}

	// Se for um número
	if (typeof value === 'number') {
		return {
			current: value,
			last5YearsAvg: fallback.last5YearsAvg, // Mantém o histórico se existir
			lastUpdated: fallback.lastUpdated, // Mantém a data se existir
		};
	}

	return fallback;
}

export class EconomicIndicesLogger {
	private static instance: EconomicIndicesLogger;
	private enabled: boolean = true;

	private constructor() {}

	public static getInstance(): EconomicIndicesLogger {
		if (!EconomicIndicesLogger.instance) {
			EconomicIndicesLogger.instance = new EconomicIndicesLogger();
		}
		return EconomicIndicesLogger.instance;
	}

	public log(message: string, data?: any): void {
		if (this.enabled) {
			const timestamp = new Date().toISOString();
			console.log(
				`[${timestamp}] [EconomicIndices] ${message}`,
				data || '',
			);
		}
	}

	public error(message: string, error?: any): void {
		if (this.enabled) {
			const timestamp = new Date().toISOString();
			console.error(
				`[${timestamp}] [EconomicIndices] ERROR: ${message}`,
				error || '',
			);
		}
	}

	public enable(): void {
		this.enabled = true;
	}

	public disable(): void {
		this.enabled = false;
	}
}

export async function fetchWithRetry<T>(
	url: string,
	parser: (response: any) => T,
	options: FetchOptions = DEFAULT_FETCH_OPTIONS,
): Promise<T> {
	const logger = EconomicIndicesLogger.getInstance();
	const { retries = 3, retryDelay = 1000, timeout = 5000 } = options;

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			logger.log(`Fetching ${url} (attempt ${attempt}/${retries})`);

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeout);

			const response = await fetch(url, {
				signal: controller.signal,
			});
			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			return parser(data);
		} catch (error) {
			if (attempt === retries) {
				logger.error(
					`Failed to fetch ${url} after ${retries} attempts`,
					error,
				);
				throw error;
			}

			logger.log(`Retrying ${url} in ${retryDelay}ms...`);
			await new Promise((resolve) => setTimeout(resolve, retryDelay));
		}
	}

	throw new Error('Unexpected error in fetchWithRetry');
}

export function parseNumber(text: string): number {
	return parseFloat(text.replace(/\./g, '').replace(',', '.'));
}

export function getLast5YearsAvg(values: number[]): number {
	if (values.length === 0) return 0;
	const sum = values.reduce((a, b) => a + b, 0);
	return sum / values.length;
}
