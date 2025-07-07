import { EconomicIndices, StoredIndices } from '../types/types.js';
import { isNodeEnvironment } from './utils.js';

// Helpers para ambiente Node.js
async function loadNodeModules() {
	const { default: fs } = await import('fs/promises');
	const { default: path } = await import('path');
	return { fs, path };
}

// Caminho de armazenamento
const STORE_PATH = async () => {
	if (isNodeEnvironment()) {
		const { path } = await loadNodeModules();
		return path.join(process.cwd(), 'indices.json');
	}
	return 'economic_indices_data';
};

// Converte Date → número YYYYMMDDHHmmss
function formatDateAsNumber(date: Date): number {
	const y = date.getFullYear();
	const M = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	const h = String(date.getHours()).padStart(2, '0');
	const m = String(date.getMinutes()).padStart(2, '0');
	const s = String(date.getSeconds()).padStart(2, '0');
	return parseInt(`${y}${M}${d}${h}${m}${s}`);
}

// Converte número YYYYMMDDHHmmss → Date
function parseNumberAsDate(val: number): Date {
	const str = val.toString().padStart(14, '0');
	const year = parseInt(str.slice(0, 4));
	const month = parseInt(str.slice(4, 6)) - 1;
	const day = parseInt(str.slice(6, 8));
	const hour = parseInt(str.slice(8, 10));
	const minute = parseInt(str.slice(10, 12));
	const second = parseInt(str.slice(12, 14));
	return new Date(year, month, day, hour, minute, second);
}

// Recursivamente transforma todos os campos `updated: Date` em inteiros
function convertUpdatedDates(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map(convertUpdatedDates);
	} else if (obj && typeof obj === 'object') {
		const newObj: any = {};
		for (const key in obj) {
			if (key === 'updated' && obj[key] instanceof Date) {
				newObj[key] = formatDateAsNumber(obj[key]);
			} else {
				newObj[key] = convertUpdatedDates(obj[key]);
			}
		}
		return newObj;
	}
	return obj;
}

// Recursivamente transforma campos `updated: number` → Date
function reviveUpdatedDates(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map(reviveUpdatedDates);
	} else if (obj && typeof obj === 'object') {
		for (const key in obj) {
			if (key === 'updated' && typeof obj[key] === 'number') {
				obj[key] = parseNumberAsDate(obj[key]);
			} else {
				obj[key] = reviveUpdatedDates(obj[key]);
			}
		}
	}
	return obj;
}

// Pega a data mais recente entre todos os índices
function getLatestUpdatedDate(data: EconomicIndices): Date {
	let latestDate = new Date(0);
	Object.values(data).forEach((index) => {
		if (
			index?.updated instanceof Date &&
			index.updated > latestDate
		) {
			latestDate = index.updated;
		}
	});
	return latestDate;
}

export async function saveToStorage(
	data: EconomicIndices,
): Promise<void> {
	const fpath = await STORE_PATH();

	try {
		const storedData: StoredIndices = {
			indices: data,
			updated: getLatestUpdatedDate(data),
		};

		const json = JSON.stringify(
			convertUpdatedDates(storedData),
			null,
			2,
		);

		if (typeof window !== 'undefined' && window.localStorage) {
			localStorage.setItem(fpath, json);
		} else if (isNodeEnvironment()) {
			const { fs } = await loadNodeModules();
			await fs.writeFile(fpath, json, 'utf-8');
		}
	} catch (error) {
		console.error('Failed to save to storage:', error);
	}
}

export async function loadFromStorage(): Promise<StoredIndices | null> {
	const fpath = await STORE_PATH();

	try {
		// Navegador
		if (typeof window !== 'undefined' && window.localStorage) {
			const stored = localStorage.getItem(fpath);
			return stored ? reviveUpdatedDates(JSON.parse(stored)) : null;
		}
		// Node.js
		else if (isNodeEnvironment()) {
			const { fs } = await loadNodeModules();

			try {
				const rawData = await fs.readFile(fpath, 'utf-8');
				return reviveUpdatedDates(JSON.parse(rawData));
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
					return null;
				}
				throw error;
			}
		}
		return null;
	} catch (error) {
		console.error('Failed to load from storage:', error);
		return null;
	}
}

export async function clearStorage(): Promise<void> {
	const fpath = await STORE_PATH();

	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			localStorage.removeItem(fpath);
		} else if (isNodeEnvironment()) {
			const { fs } = await loadNodeModules();
			try {
				await fs.unlink(fpath);
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

// Define se os dados estão desatualizados
export function deveriaAtualizar(
	storedData: StoredIndices | null,
): boolean {
	if (!storedData || isNodeEnvironment()) return true;

	const lastUpdated = new Date(storedData.updated);
	const today = new Date();

	return (
		lastUpdated.getDate() !== today.getDate() ||
		lastUpdated.getMonth() !== today.getMonth() ||
		lastUpdated.getFullYear() !== today.getFullYear()
	);
}
