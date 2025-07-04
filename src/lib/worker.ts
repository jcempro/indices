import { fetchCDI } from '../indices/cdi.js';
import { fetchINPC } from '../indices/inpc.js';
import { fetchIPCA } from '../indices/ipca.js';
import { fetchSelic } from '../indices/selic.js';
import {
	loadFromStorage,
	shouldUpdate,
	saveToStorage,
} from './storage.js';
import {
	WorkerCommand,
	WorkerMessage,
	EconomicIndices,
} from './types.js';

// Definindo a tipagem completa para o contexto do Worker
interface WorkerGlobalScope {
	onmessage:
		| ((this: Worker, ev: MessageEvent<WorkerCommand>) => any)
		| null;
	postMessage: (message: WorkerMessage) => void;
	importScripts?: (...urls: string[]) => void;
}

declare const self: WorkerGlobalScope;

async function updateIndices(
	previousData: EconomicIndices | null,
): Promise<EconomicIndices | null> {
	const stored = await loadFromStorage();
	if (stored && !shouldUpdate(stored)) return null;

	try {
		const [selic, cdi, ipca, inpc] = await Promise.all([
			fetchSelic(previousData?.selic),
			fetchCDI(previousData?.cdi),
			fetchIPCA(previousData?.ipca),
			fetchINPC(previousData?.inpc),
		]);

		const indices = { selic, cdi, ipca, inpc };
		await saveToStorage(indices);
		return indices;
	} catch (error) {
		console.error('Worker failed to update indices:', error);
		return null;
	}
}

self.onmessage = async (event: MessageEvent<WorkerCommand>) => {
	if (event.data.type === 'update') {
		try {
			const indices = await updateIndices(event.data.payload);
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
	if (!stored || shouldUpdate(stored)) {
		const indices = await updateIndices(stored?.indices || null);
		if (indices) {
			self.postMessage({
				type: 'indices',
				indices,
			});
		}
	}
})();

export default null as any;
