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
import type { EconomicIndices } from './types';

async function updateIndices(): Promise<EconomicIndices | null> {
	const storedData = loadFromStorage();

	if (!shouldUpdate(storedData)) {
		return null;
	}

	try {
		const [selic, cdi, ipca, inpc, exchange] = await Promise.all([
			fetchSelic(storedData?.data.selic),
			fetchCDI(storedData?.data.cdi),
			fetchIPCA(storedData?.data.ipca),
			fetchINPC(storedData?.data.inpc),
			fetchExchange(storedData?.data.exchange),
		]);

		const newIndices: EconomicIndices = {
			selic,
			cdi,
			ipca,
			inpc,
			exchange,
			lastUpdated: new Date().toISOString(),
		};

		saveToStorage(newIndices);
		return newIndices;
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

const workerScope = self as unknown as WorkerGlobalScope;

workerScope.onmessage = async (event: MessageEvent) => {
	if (event.data === 'update') {
		const indices = await updateIndices();
		if (indices) {
			workerScope.postMessage({ type: 'indices', indices });
		}
	}
};

// Exportação vazia para módulo TypeScript
export default null as any;
