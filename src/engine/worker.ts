import { ECONIDX } from './EconomicIndicesClient.js';
import { loadFromStorage, deveriaAtualizar } from './storage.js';
import { WorkerCommand, WorkerMessage } from '../types/types.js';

// Definindo a tipagem completa para o contexto do Worker
interface WorkerGlobalScope {
	onmessage:
		| ((this: Worker, ev: MessageEvent<WorkerCommand>) => any)
		| null;
	postMessage: (message: WorkerMessage) => void;
	importScripts?: (...urls: string[]) => void;
}

declare const self: WorkerGlobalScope;

self.onmessage = async (event: MessageEvent<WorkerCommand>) => {
	if (event.data.type === 'update') {
		try {
			const indices = await ECONIDX.getIndices();
			self.postMessage({
				type: 'indices',
				indices,
			});
		} catch (error) {
			self.postMessage({
				type: 'error',
				error:
					error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}
};

// Auto-inicialização
(async () => {
	const stored = await loadFromStorage();
	if (!stored || deveriaAtualizar(stored)) {
		const indices = await ECONIDX.getIndices();
		if (indices) {
			self.postMessage({
				type: 'indices',
				indices,
			});
		}
	}
})();
