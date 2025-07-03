import { IndexValue } from './types';

export interface FetchOptions {
	retries?: number;
	retryDelay?: number;
	timeout?: number;
}

const responseCache = new Map<
	string,
	{ data: any; timestamp: number }
>();
const CACHE_TTL = 30 * 60 * 1000; // 5 minutos em milissegundos

export const DEFAULT_FETCH_OPTIONS: FetchOptions = {
	retries: 7,
	retryDelay: 1500,
	timeout: 1000,
};

// src/lib/utils/dateUtils.ts
export function getValidBCBDate(yearsAgo: number): string {
	const date = new Date();
	date.setFullYear(date.getFullYear() - yearsAgo);

	// Formato exigido pela API: DD/MM/YYYY
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();

	return `${day}/${month}/${year}`;
}

// src/lib/utils/dateUtils.ts (novo arquivo)
export function getFiveYearsAgoDate(): string {
	const date = new Date();
	date.setFullYear(date.getFullYear() - 5);
	return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
}

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
			console.log(`[EconomicIndices] ${message}`, data || '');
		}
	}

	public error(message: string, error?: any): void {
		if (this.enabled) {
			const timestamp = new Date().toISOString();
			console.error(
				`[EconomicIndices] ERROR: ${message}`,
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
	responseHandler: (response: Response) => Promise<T>,
	options: FetchOptions = {
		retries: 3,
		retryDelay: 1000,
		timeout: 8000,
	},
): Promise<T> {
	// Verifica se há cache válido
	const cached = responseCache.get(url);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		console.log(`[Cache hit] ${url}`);
		return cached.data;
	}

	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= options.retries!; attempt++) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(
				() => controller.abort(),
				options.timeout,
			);

			const response = await fetch(url, {
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await responseHandler(response);

			// Armazena no cache antes de retornar
			responseCache.set(url, {
				data,
				timestamp: Date.now(),
			});

			return data;
		} catch (error) {
			lastError = error as Error;
			if (attempt < options.retries!) {
				await new Promise((resolve) =>
					setTimeout(resolve, options.retryDelay),
				);
			}
		}
	}

	throw (
		lastError || new Error(`Failed after ${options.retries} retries`)
	);
}

/**
 * Converte taxa diária para equivalente anual (252 dias úteis)
 */
export function diarioUtilToAnual(dailyRate: number): number {
	return parseNumber(
		(Math.pow(1 + dailyRate / 100, 252) - 1) * 100 + '',
	);
}

/**
 * Converte taxa mensal para equivalente anual
 */
export function mensalToAnual(monthlyRate: number): number {
	return parseFloat(
		(Math.pow(1 + monthlyRate / 100, 12) - 1).toFixed(2),
	);
}

export function parseNumber(text: string | number): number {
	return parseFloat(
		parseFloat(`${text}`.replace(',', '.')).toFixed(2),
	);
}

/**
 * Formata data para o padrão IBGE (YYYYMM)
 */
export function getValidIBGEDate(yearsAgo: number): string {
	const date = new Date();
	date.setFullYear(date.getFullYear() - yearsAgo);
	return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
}
