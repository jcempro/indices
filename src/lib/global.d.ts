export interface Window {
	economicIndices?: typeof import('./lib').economicIndices;
	localStorage: Storage;
}
