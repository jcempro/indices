import { ECONIDX } from './engine/EconomicIndicesClient.js';
import { isNodeEnvironment } from './engine/utils.js';

if (typeof window !== 'undefined') {
	(window as any).ECONIDX = ECONIDX;
}

if (isNodeEnvironment()) {
	ECONIDX.getIndices();
}
