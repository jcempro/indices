import { economicIndices } from './EconomicIndicesClient.js';

export interface IndexValue {
	current: number;
	avg?: number;
	updated: Date;
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

export const IndicesName = [
	'SELIC',
	'CDI',
	'IPCA',
	'INPC',
	'Câmbio',
	'update',
];

export interface StoredIndices {
	indices: EconomicIndices;
	updated: string;
}
