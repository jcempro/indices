import { fetchCDI } from '../indices/cdi.js';
import { fetchINPC } from '../indices/inpc.js';
import { fetchIPCA } from '../indices/ipca.js';
import { fetchSelic } from '../indices/selic.js';
import workerScript from './worker.ts?raw';
import {
	saveToStorage,
	loadFromStorage,
	shouldUpdate,
} from './storage.js';
import {
	EconomicIndices,
	WorkerMessage,
	WorkerCommand,
} from './types.js';

class EconomicIndicesClient {
	private worker: Worker | null = null;
	private currentIndices: EconomicIndices | null = null;
	private pendingResolvers: Array<
		(value: EconomicIndices | null) => void
	> = [];
	private isNode: boolean;

	constructor() {
		this.isNode =
			typeof process !== 'undefined' &&
			process.versions?.node !== undefined;
		this.initWorker();
	}

	private async initWorker(): Promise<void> {
		if (this.isNode) return;

		if (typeof Worker !== 'undefined') {
			try {
				// Cria um URL a partir do worker.ts como string
				const blob = new Blob([workerScript], {
					type: 'application/javascript',
				});
				this.worker = new Worker(URL.createObjectURL(blob));

				this.worker.onmessage = (
					event: MessageEvent<WorkerMessage>,
				) => {
					if (event.data.type === 'indices') {
						this.handleNewIndices(event.data.indices);
					}
				};

				this.worker.onerror = (error) => {
					console.error('Worker error:', error);
					this.handleWorkerError('Worker failed');
				};
			} catch (error) {
				console.warn(
					'Worker initialization failed, falling back to main thread:',
					error,
				);
			}
		}
	}

	private handleNewIndices(indices: EconomicIndices | null): void {
		this.currentIndices = indices;
		if (indices) saveToStorage(indices);
		this.resolvePendingPromises(indices);
	}

	private handleWorkerError(error: string): void {
		console.error('Worker error:', error);
		this.resolvePendingPromises(null);
	}

	private resolvePendingPromises(
		indices: EconomicIndices | null,
	): void {
		this.pendingResolvers.forEach((resolve) => resolve(indices));
		this.pendingResolvers = [];
	}

	public async getIndices(): Promise<EconomicIndices | null> {
		if (this.isNode) {
			return this.nodeGetIndices();
		}
		return this.browserGetIndices();
	}

	private async nodeGetIndices(): Promise<EconomicIndices | null> {
		const stored = await loadFromStorage();
		if (!stored || shouldUpdate(stored)) {
			this.currentIndices = await this.fetchAllIndices(
				stored?.indices || null,
			);
			if (this.currentIndices)
				await saveToStorage(this.currentIndices);
		} else {
			this.currentIndices = stored.indices;
		}
		return this.currentIndices;
	}

	private async browserGetIndices(): Promise<EconomicIndices | null> {
		if (!this.currentIndices) {
			const stored = await loadFromStorage();
			this.currentIndices = stored?.indices || null;

			if (!stored || shouldUpdate(stored)) {
				if (this.worker) {
					// Usa worker se disponível
					return new Promise((resolve) => {
						this.pendingResolvers.push(resolve);
						const command: WorkerCommand = {
							type: 'update',
							payload: this.currentIndices,
						};
						this.worker?.postMessage(command);
					});
				} else {
					// Fallback para Promise
					this.currentIndices = await this.fetchAllIndices(
						this.currentIndices,
					);
					if (this.currentIndices)
						await saveToStorage(this.currentIndices);
				}
			}
		}
		return this.currentIndices;
	}

	private async fetchAllIndices(
		previousData: EconomicIndices | null,
	): Promise<EconomicIndices | null> {
		try {
			const [selic, cdi, ipca, inpc] = await Promise.all([
				fetchSelic(previousData?.selic),
				fetchCDI(previousData?.cdi),
				fetchIPCA(previousData?.ipca),
				fetchINPC(previousData?.inpc),
			]);
			return { selic, cdi, ipca, inpc };
		} catch (error) {
			console.error('Failed to fetch indices:', error);
			return null;
		}
	}
}

export const economicIndices = new EconomicIndicesClient();
