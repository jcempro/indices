import { EconomicIndices, StoredIndices } from '../types/types.js';
import { isNodeEnvironment } from './utils.js';

// Helper para detectar ambiente Node.js

// Helper para carregar módulos do Node.js dinamicamente
async function loadNodeModules() {
	const { default: fs } = await import('fs/promises');
	const { default: path } = await import('path');
	return { fs, path };
}

const STORE_PATH = async () => {
	if (isNodeEnvironment()) {
		const { fs, path } = await loadNodeModules();
		return path.join(process.cwd(), 'indices.json');
	}

	return 'economic_indices_data';
};

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

export async function loadFromStorage(): Promise<StoredIndices | null> {
	const fpath = await STORE_PATH();

	try {
		// Navegador
		if (typeof window !== 'undefined' && window.localStorage) {
			const stored = localStorage.getItem(fpath);
			return stored ? JSON.parse(stored) : null;
		}
		// Node.js
		else if (isNodeEnvironment()) {
			const { fs } = await loadNodeModules();

			try {
				const rawData = await fs.readFile(fpath, 'utf-8');
				return JSON.parse(rawData);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
					return null; // Arquivo não existe
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

export async function saveToStorage(
	data: EconomicIndices,
): Promise<void> {
	const fpath = await STORE_PATH();

	try {
		const latestUpdated = getLatestUpdatedDate(data);
		const storedData: StoredIndices = {
			indices: data,
			updated: latestUpdated.toISOString(),
		};

		// Navegador
		if (typeof window !== 'undefined' && window.localStorage) {
			localStorage.setItem(fpath, JSON.stringify(storedData));
		}
		// Node.js
		else if (isNodeEnvironment()) {
			const { fs, path } = await loadNodeModules();
			console.log(process.cwd());

			await fs.writeFile(fpath, JSON.stringify(storedData, null, 2));
		}
	} catch (error) {
		console.error('Failed to save to storage:', error);
	}
}

// shouldUpdate pode permanecer síncrono
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

export async function clearStorage(): Promise<void> {
	const fpath = await STORE_PATH();

	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			localStorage.removeItem(fpath);
		} else if (isNodeEnvironment()) {
			const { fs, path } = await loadNodeModules();
			try {
				await fs.unlink(fpath);
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
					throw error;
				}
				// Arquivo não existe, não precisa fazer nada
			}
		}
	} catch (error) {
		console.error('Failed to clear storage:', error);
		throw error;
	}
}
