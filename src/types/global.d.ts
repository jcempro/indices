interface Window {
	ECONIDX: typeof import('../engine/EconomicIndicesClient.ts').ECONIDX;
	clearIndices: () => Promise<void>;
	economicIndices?: typeof import('./lib').economicIndices;
	localStorage: Storage;
}
