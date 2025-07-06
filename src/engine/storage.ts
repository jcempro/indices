import { EconomicIndices, StoredIndices } from '../types/types.js';

const STORAGE_KEY = 'economic_indices_data';

// Helper para detectar ambiente Node.js
function isNodeEnvironment(): boolean {
	return (
		typeof process !== 'undefined' &&
		process.versions?.node !== undefined
	);
}

// Helper para carregar módulos do Node.js dinamicamente
async function loadNodeModules() {
	const { default: fs } = await import('fs/promises');
	const { default: path } = await import('path');
	return { fs, path };
}

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
	try {
		// Navegador
		if (typeof window !== 'undefined' && window.localStorage) {
			const stored = localStorage.getItem(STORAGE_KEY);
			return stored ? JSON.parse(stored) : null;
		}
		// Node.js
		else if (isNodeEnvironment()) {
			const { fs, path } = await loadNodeModules();
			const filePath = path.join(process.cwd(), 'indices.json');

			try {
				const rawData = await fs.readFile(filePath, 'utf-8');
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

export async function _saveToStorage(
	data: EconomicIndices,
): Promise<void> {
	try {
		const latestUpdated = getLatestUpdatedDate(data);
		const storedData: StoredIndices = {
			indices: data,
			updated: latestUpdated.toISOString(),
		};

		// Navegador
		if (typeof window !== 'undefined' && window.localStorage) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
		}
		// Node.js
		else if (isNodeEnvironment()) {
			const { fs, path } = await loadNodeModules();
			const filePath = path.join(process.cwd(), 'indices.json');
			await fs.writeFile(
				filePath,
				JSON.stringify(storedData, null, 2),
			);
		}
	} catch (error) {
		console.error('Failed to save to storage:', error);
	}
}

// shouldUpdate pode permanecer síncrono
export function deveriaAtualizar(
	storedData: StoredIndices | null,
): boolean {
	if (!storedData) return true;

	const lastUpdated = new Date(storedData.updated);
	const today = new Date();

	return (
		lastUpdated.getDate() !== today.getDate() ||
		lastUpdated.getMonth() !== today.getMonth() ||
		lastUpdated.getFullYear() !== today.getFullYear()
	);
}
