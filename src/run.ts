import { ECONIDX } from './engine/EconomicIndicesClient.js';

if (typeof window !== 'undefined') {
	(window as any).ECONIDX = ECONIDX;
}
