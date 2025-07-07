import {
	ECONIDX,
	EconomicIndicesClient,
} from './engine/EconomicIndicesClient.js';
import {
	clearStorage,
	deveriaAtualizar,
	loadFromStorage,
} from './engine/storage.js';
import { isNodeEnvironment } from './engine/utils.js';

export {
	EconomicIndicesClient,
	ECONIDX,
	deveriaAtualizar,
	loadFromStorage,
};

if (typeof window !== 'undefined') {
	(window as any).ECONIDX = ECONIDX;
	(window as any).clearIndices = async () => {
		await clearStorage().catch((error) => {
			console.error('Erro ao limpar storage:', error);
		});
	};
}

if (isNodeEnvironment()) {
	ECONIDX.getIndices();
}
