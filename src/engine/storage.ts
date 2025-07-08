import {
	EconomicIndices,
	StoredIndices,
	IndexValue,
} from '../types/types.js';
import { isNodeEnvironment } from './utils.js';

/**
 * Utilities for URL manipulation and analysis
 */
const _UrlUtils = {
	/**
	 * Decomposes URL into base, path and full components
	 * @param url The URL to decompose
	 * @returns Object with base, path and full URL components
	 */
	decompose: (url: string) => {
		const cleanUrl = url.replace(/\$\{\w\}/g, '');
		try {
			const urlObj = new URL(cleanUrl);
			return {
				base: `${urlObj.protocol}//${urlObj.hostname}`,
				path: urlObj.pathname,
				full: url,
			};
		} catch {
			return { base: '', path: '', full: url };
		}
	},

	/**
	 * Finds the longest common prefix among an array of strings
	 * @param strings Array of strings to analyze
	 * @returns The common prefix string
	 */
	findCommonPrefix: (strings: string[]) => {
		if (strings.length === 0) return '';
		let prefix = strings[0];
		for (const s of strings) {
			let i = 0;
			while (
				i < prefix.length &&
				i < s.length &&
				prefix[i] === s[i]
			) {
				i++;
			}
			prefix = prefix.slice(0, i);
			if (prefix === '') break;
		}
		return prefix;
	},
};

/**
 * Handles URL compression and expansion using alias substitution
 */
const _UrlCompressor = {
	/**
	 * Compresses URLs by finding common prefixes and creating aliases
	 * @param data Economic indices data containing URLs
	 * @returns Object with compressed data and alias mapping
	 */
	compactSrc: (data: EconomicIndices) => {
		const allSrc: string[] = [];
		for (const idx of Object.values(data)) {
			if (idx?.src) allSrc.push(...idx.src);
		}

		// Group URLs by their base domain
		const groups = new Map<string, string[]>();
		for (const url of allSrc) {
			const { base } = _UrlUtils.decompose(url);
			if (!groups.has(base)) groups.set(base, []);
			groups.get(base)!.push(url);
		}

		// Find common prefixes for each group
		const prefixes: string[] = [];
		groups.forEach((urls) => {
			if (urls.length < 2) return;
			const prefix = _UrlUtils.findCommonPrefix(urls);
			if (prefix.length >= 15) {
				prefixes.push(_UrlCompressor.adjustPrefixCut(prefix));
			}
		});

		// Filter overlapping prefixes
		const filteredPrefixes = prefixes
			.sort((a, b) => b.length - a.length)
			.filter(
				(prefix, i, arr) =>
					!arr.some((p, j) => j < i && prefix.startsWith(p)),
			);

		// Create alias mapping (a-z)
		const alias: Record<string, string> = {};
		let code = 'a'.charCodeAt(0);
		for (const prefix of filteredPrefixes.slice(0, 26)) {
			alias[String.fromCharCode(code++)] = prefix;
		}

		// Apply aliases to all URLs
		const newData: EconomicIndices = JSON.parse(JSON.stringify(data));
		for (const idx of Object.values(newData)) {
			if (idx?.src) {
				idx.src = idx.src.map((url) =>
					_UrlCompressor.applyAlias(url, alias),
				);
			}
		}

		return { newData, alias };
	},

	/**
	 * Adjusts prefix cut point to maintain URL structure
	 * @param prefix The prefix string to adjust
	 * @returns Properly truncated prefix
	 */
	adjustPrefixCut: (prefix: string) => {
		const lastSlash = prefix.lastIndexOf('/');
		const lastDot = prefix.lastIndexOf('.');
		const cutPoint = Math.max(
			lastSlash > 0 ? lastSlash + 1 : 0,
			lastDot > 0 ? lastDot + 1 : 0,
		);
		return prefix.substring(0, cutPoint);
	},

	/**
	 * Applies alias substitution to a URL
	 * @param url The URL to process
	 * @param alias Mapping of aliases to prefixes
	 * @returns URL with alias substitution
	 */
	applyAlias: (url: string, alias: Record<string, string>) => {
		const rawUrl = url.replace(/\$\{\w\}/g, '');
		for (const [key, prefix] of Object.entries(alias)) {
			if (rawUrl.startsWith(prefix)) {
				return `\${${key}}${rawUrl.slice(prefix.length)}`;
			}
		}
		return url;
	},

	/**
	 * Expands aliased URLs back to their full form
	 * @param stored The stored indices data with aliases
	 * @returns Expanded indices data
	 */
	expandSrc: (stored: StoredIndices): StoredIndices => {
		if (!stored.alias) return stored;

		const expandedIndices: EconomicIndices = {};
		for (const [key, value] of Object.entries(stored.indices)) {
			expandedIndices[key] = {
				...value,
				src: value.src?.map((url) => {
					if (typeof url !== 'string') return url;
					return url.replace(/\$\{(\w)\}/g, (_, k) => {
						const aliasValue = stored.alias?.[k];
						return typeof aliasValue === 'string' ? aliasValue : '';
					});
				}),
			};
		}

		return {
			...stored,
			indices: expandedIndices,
			updated: stored.updated,
		};
	},
};

/**
 * Handles date formatting and conversion between Date objects and numeric timestamps
 */
const _DateUtils = {
	/**
	 * Formats a Date object as YYYYMMDDHHmmss number
	 * @param date The Date to format
	 * @returns Numeric timestamp
	 */
	formatDateAsNumber: (date: Date): number => {
		const y = date.getFullYear();
		const M = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		const h = String(date.getHours()).padStart(2, '0');
		const m = String(date.getMinutes()).padStart(2, '0');
		const s = String(date.getSeconds()).padStart(2, '0');
		return parseInt(`${y}${M}${d}${h}${m}${s}`, 10);
	},

	/**
	 * Parses a numeric timestamp back to Date object
	 * @param num Numeric timestamp (YYYYMMDDHHmmss)
	 * @returns Date object
	 */
	parseNumberAsDate: (num: number): Date => {
		const str = num.toString().padStart(14, '0');
		return new Date(
			parseInt(str.slice(0, 4)),
			parseInt(str.slice(4, 6)) - 1,
			parseInt(str.slice(6, 8)),
			parseInt(str.slice(8, 10)),
			parseInt(str.slice(10, 12)),
			parseInt(str.slice(12, 14)),
		);
	},

	/**
	 * Recursively converts Date objects to numeric timestamps in an object
	 * @param obj The object to process
	 * @returns Object with Dates converted to numbers
	 */
	convertUpdatedToNumber: (obj: any): any => {
		if (!obj || typeof obj !== 'object') return obj;

		const result: Record<string, any> = Array.isArray(obj) ? [] : {};
		for (const key in obj) {
			if (key === 'updated') {
				const val = obj[key];
				if (val instanceof Date) {
					result[key] = _DateUtils.formatDateAsNumber(val);
				} else if (typeof val === 'string') {
					const date = new Date(val);
					result[key] =
						isNaN(date.getTime()) ? val : (
							_DateUtils.formatDateAsNumber(date)
						);
				} else {
					result[key] = val;
				}
			} else {
				result[key] = _DateUtils.convertUpdatedToNumber(obj[key]);
			}
		}
		return result;
	},

	/**
	 * Recursively converts numeric timestamps to Date objects in an object
	 * @param obj The object to process
	 * @returns Object with numbers converted to Dates
	 */
	convertUpdatedToDate: (obj: any): any => {
		if (!obj || typeof obj !== 'object') return obj;

		const result: Record<string, any> = Array.isArray(obj) ? [] : {};
		for (const key in obj) {
			if (key === 'updated') {
				const val = obj[key];
				if (typeof val === 'number') {
					result[key] = _DateUtils.parseNumberAsDate(val);
				} else if (typeof val === 'string') {
					const date = new Date(val);
					result[key] = isNaN(date.getTime()) ? val : date;
				} else {
					result[key] = val;
				}
			} else {
				result[key] = _DateUtils.convertUpdatedToDate(obj[key]);
			}
		}
		return result;
	},
};

/**
 * Loads indices data from storage and expands aliased URLs
 * @returns Promise resolving to the loaded data or null if not found
 */
async function loadFromStorage(): Promise<StoredIndices | null> {
	const STORE_PATH = await _getStorePath();

	try {
		let storedData: string | null = null;

		if (typeof window !== 'undefined' && window.localStorage) {
			storedData = localStorage.getItem(STORE_PATH);
		} else if (isNodeEnvironment()) {
			const { fs } = await _loadNodeModules();
			try {
				storedData = await fs.readFile(STORE_PATH, 'utf-8');
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
					return null;
				}
				throw error;
			}
		}

		if (!storedData) return null;

		const parsed: StoredIndices = JSON.parse(storedData);
		const withDates = _DateUtils.convertUpdatedToDate(parsed);
		return _UrlCompressor.expandSrc(withDates);
	} catch (error) {
		console.error('Failed to load from storage:', error);
		return null;
	}
}

/**
 * Saves economic indices data to storage after compressing URLs and converting dates
 * @param data The economic indices data to save
 */
async function saveToStorage(data: EconomicIndices): Promise<void> {
	const STORE_PATH = await _getStorePath();

	try {
		const latestUpdated = _getLatestUpdatedDate(data);
		const { alias, newData } = _UrlCompressor.compactSrc(data);
		const processedData = _DateUtils.convertUpdatedToNumber(newData);

		const storedData: StoredIndices = {
			indices: processedData,
			updated: _DateUtils.formatDateAsNumber(latestUpdated),
			alias,
		};

		const jsonData = JSON.stringify(storedData, null, 2);

		if (typeof window !== 'undefined' && window.localStorage) {
			localStorage.setItem(STORE_PATH, jsonData);
		} else if (isNodeEnvironment()) {
			const { fs } = await _loadNodeModules();
			await fs.writeFile(STORE_PATH, jsonData);
		}
	} catch (error) {
		console.error('Failed to save to storage:', error);
	}
}

/**
 * Determines if stored data should be updated based on date comparison
 * @param storedData The stored data to check
 * @returns Boolean indicating if update is needed
 */
function deveAtualizar(storedData: StoredIndices | null): boolean {
	if (!storedData || isNodeEnvironment()) return true;

	const lastUpdatedNum =
		typeof storedData.updated === 'number' ?
			storedData.updated
		:	_DateUtils.formatDateAsNumber(storedData.updated);
	const lastUpdated = _DateUtils.parseNumberAsDate(lastUpdatedNum);

	const today = new Date();

	return (
		lastUpdated.getDate() !== today.getDate() ||
		lastUpdated.getMonth() !== today.getMonth() ||
		lastUpdated.getFullYear() !== today.getFullYear()
	);
}

/**
 * Clears the stored indices data
 */
async function clearStorage(): Promise<void> {
	const STORE_PATH = await _getStorePath();

	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			localStorage.removeItem(STORE_PATH);
		} else if (isNodeEnvironment()) {
			const { fs } = await _loadNodeModules();
			try {
				await fs.unlink(STORE_PATH);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
					throw error;
				}
			}
		}
	} catch (error) {
		console.error('Failed to clear storage:', error);
		throw error;
	}
}

// Internal helper functions
async function _loadNodeModules() {
	const fs = await import('fs/promises');
	const path = await import('path');
	return { fs: fs.default, path: path.default };
}

async function _getStorePath(): Promise<string> {
	if (isNodeEnvironment()) {
		const { path } = await _loadNodeModules();
		return path.join(process.cwd(), 'indices.json');
	}
	return 'economic_indices_data';
}

function _getLatestUpdatedDate(data: EconomicIndices): Date {
	let latestDate = new Date(0);
	for (const index of Object.values(data)) {
		if (
			index?.updated instanceof Date &&
			index.updated > latestDate
		) {
			latestDate = index.updated;
		}
	}
	return latestDate;
}

export {
	loadFromStorage,
	saveToStorage,
	deveAtualizar as deveriaAtualizar,
	clearStorage,
	formatDateAsNumber,
	parseNumberAsDate,
};

function formatDateAsNumber(date: Date): number {
	return _DateUtils.formatDateAsNumber(date);
}

function parseNumberAsDate(num: number): Date {
	return _DateUtils.parseNumberAsDate(num);
}
