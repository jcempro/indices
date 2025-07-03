import { fetchCDI } from '../indices/cdi';
import { fetchExchange } from '../indices/exchange';
import { fetchINPC } from '../indices/inpc';
import { fetchIPCA } from '../indices/ipca';
import { fetchSelic } from '../indices/selic';
import {
	loadFromStorage,
	saveToStorage,
	shouldUpdate,
} from './storage';
import type {
	EconomicIndices,
	WorkerCommand,
	WorkerMessage,
} from './types';

async function updateIndices(
	p0: EconomicIndices | null,
): Promise<EconomicIndices | null> {
	const storedData = loadFromStorage();

	if (!shouldUpdate(storedData)) {
		return null;
	}

	try {
		const [selic, cdi, ipca, inpc /*, exchange*/] = await Promise.all(
			[
				fetchSelic(storedData?.data.selic),
				fetchCDI(storedData?.data.cdi),
				fetchIPCA(storedData?.data.ipca),
				fetchINPC(storedData?.data.inpc),
				/*fetchExchange(storedData?.data.exchange),*/
			],
		);

		return {
			selic,
			cdi,
			ipca,
			inpc,
			/*exchange,*/
		};
	} catch (error) {
		console.error('Failed to update indices:', error);
		return storedData?.data || null;
	}
}

// Tipagem estendida para Worker em módulos ES
interface WorkerGlobalScope {
	onmessage: ((this: Worker, ev: MessageEvent) => any) | null;
	postMessage: (message: any) => void;
}

declare const self: WorkerGlobalScope;

self.onmessage = async (event: MessageEvent<WorkerCommand>) => {
	if (event.data.type === 'update') {
		try {
			const indices = await updateIndices(event.data.payload);
			const response: WorkerMessage = {
				type: 'indices',
				indices,
			};
			self.postMessage(response);
		} catch (error) {
			const response: WorkerMessage = {
				type: 'error',
				error:
					error instanceof Error ? error.message : 'Unknown error',
			};
			self.postMessage(response);
		}
	}
};

// Exportação vazia para módulo TypeScript
export default null as any;
