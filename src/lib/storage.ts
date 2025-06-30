import { EconomicIndices } from './types';

const STORAGE_KEY = 'economic_indices_data';

export interface StoredIndices {
	data: EconomicIndices;
	lastUpdated: string;
}

export function loadFromStorage(): StoredIndices | null {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : null;
	} catch (error) {
		console.error('Failed to load from storage:', error);
		return null;
	}
}

export function saveToStorage(data: EconomicIndices): void {
	try {
		const storedData: StoredIndices = {
			data,
			lastUpdated: new Date().toISOString(),
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
	} catch (error) {
		console.error('Failed to save to storage:', error);
	}
}

export function shouldUpdate(
	storedData: StoredIndices | null,
): boolean {
	if (!storedData) return true;

	const lastUpdated = new Date(storedData.lastUpdated);
	const today = new Date();

	// Verifica se a última atualização foi em um dia útil anterior
	return (
		lastUpdated.getDate() !== today.getDate() ||
		lastUpdated.getMonth() !== today.getMonth() ||
		lastUpdated.getFullYear() !== today.getFullYear()
	);
}
