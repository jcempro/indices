import { ECONIDX } from './engine/EconomicIndicesClient.js';
import { clearStorage } from './engine/storage.js';
import { isNodeEnvironment } from './engine/utils.js';

if (typeof window !== 'undefined') {
	(window as any).ECONIDX = ECONIDX;
	(window as any).clearIndices = clearStorage;
}

if (isNodeEnvironment()) {
	ECONIDX.getIndices();
}
