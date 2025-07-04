import { fetchCDI } from './indices/cdi.js';
import { fetchINPC } from './indices/inpc.js';
import { fetchIPCA } from './indices/ipca.js';
import { fetchSelic } from './indices/selic.js';
import {
	loadFromStorage,
	shouldUpdate,
	saveToStorage,
} from './lib/storage.js';
import {
	EconomicIndices,
	WorkerCommand,
	WorkerMessage,
} from './lib/types.js';

import { economicIndices } from './lib/EconomicIndicesClient.js';

// Função compartilhada (usada tanto no Worker quanto no Node.js)
async function updateIndices(
	p0: EconomicIndices | null,
): Promise<EconomicIndices | null> {
	const storedData = await loadFromStorage();

	if (!shouldUpdate(storedData)) {
		return null;
	}

	try {
		const [selic, cdi, ipca, inpc /*, exchange*/] = await Promise.all(
			[
				fetchSelic(storedData?.indices.selic),
				fetchCDI(storedData?.indices.cdi),
				fetchIPCA(storedData?.indices.ipca),
				fetchINPC(storedData?.indices.inpc),
				/*fetchExchange(storedData?.data.exchange),*/
			],
		);

		const updatedData: EconomicIndices = {
			selic,
			cdi,
			ipca,
			inpc /*, exchange*/,
		};

		// Salva no storage (com o `updated` mais recente)
		saveToStorage(updatedData);

		return updatedData;
	} catch (error) {
		console.error('Failed to update indices:', error);
		return storedData?.indices || null;
	}
}
declare const self: WorkerGlobalScope;
// Tipagem estendida para Worker em módulos ES
interface WorkerGlobalScope {
	onmessage: ((this: Worker, ev: MessageEvent) => any) | null;
	postMessage: (message: any) => void;
}

// ===== Parte do Web Worker =====
if (typeof self !== 'undefined' && 'onmessage' in self) {
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

	// Inicialização automática do worker
	(async () => {
		const stored = await loadFromStorage();
		if (!stored || shouldUpdate(stored)) {
			const indices = await updateIndices(stored?.indices || null);
			if (indices) {
				const response: WorkerMessage = {
					type: 'indices',
					indices,
				};
				self.postMessage(response);
			}
		}
	})();
}
// ===== Parte do Node.js =====
else if (typeof process !== 'undefined' && process.versions?.node) {
	(async () => {
		console.log('Inicializando atualização de índices...');
		const stored = await loadFromStorage();

		if (!stored || shouldUpdate(stored)) {
			console.log('Atualizando índices...');
			const indices = await updateIndices(stored?.indices || null);

			if (indices) {
				console.log('Índices atualizados com sucesso:', indices);
			} else {
				console.log('Nenhuma atualização necessária.');
			}
		} else {
			console.log('Índices já estão atualizados.');
		}
	})();
}
// ===== Parte do Navegador (main) =====
else {
	const economicIndices = {
		async getIndices() {
			const stored = await loadFromStorage();
			return stored?.indices || null;
		},
		async updateIndices() {
			const stored = await loadFromStorage();
			return updateIndices(stored?.indices || null);
		},
	};

	// Exposição para desenvolvimento
	if (typeof window !== 'undefined' && import.meta.env?.DEV) {
		(window as any).economicIndices = economicIndices;
	}
}
