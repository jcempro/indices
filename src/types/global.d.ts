interface Window {
	ECONIDX: typeof import('../engine/EconomicIndicesClient.ts').ECONIDX;

	economicIndices?: typeof import('./lib').economicIndices;
	localStorage: Storage;
}
