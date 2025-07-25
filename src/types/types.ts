export interface IndexValue {
	current: number;
	avg?: number;
	updated: Date | number;
	src?: string[];
}

export type EconomicIndices = Record<PropertyKey, IndexValue>;

// Tipos para comunicação com o worker
export type WorkerMessage =
	| { type: 'indices'; indices: EconomicIndices | null }
	| { type: 'error'; error: string };

export type WorkerCommand = {
	type: 'update';
	payload: EconomicIndices | null;
};

export interface StoredIndices {
	indices: EconomicIndices;
	updated: Date | number;
	alias?: Record<PropertyKey, string | number>;
}

export type fetchs = (fallback?: IndexValue) => Promise<IndexValue>;
