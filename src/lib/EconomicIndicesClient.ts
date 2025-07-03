import {
	loadFromStorage,
	saveToStorage,
	shouldUpdate,
} from './storage';
import {
	IndicesName,
	type EconomicIndices,
	type WorkerCommand,
	type WorkerMessage,
} from './types';

export class EconomicIndicesClient {
	private worker: Worker | null = null;
	private currentIndices: EconomicIndices | null = null;
	private pendingResolvers: Array<() => void> = [];

	constructor() {
		this.initWorker();
	}

	private initWorker(): void {
		if (typeof Worker !== 'undefined') {
			this.worker = new Worker(
				new URL('./worker.ts', import.meta.url),
				{ type: 'module' },
			);

			this.worker.onmessage = (
				event: MessageEvent<WorkerMessage>,
			) => {
				switch (event.data.type) {
					case 'indices':
						this.handleNewIndices(event.data.indices);
						break;

					case 'error':
						this.handleWorkerError(event.data.error);
						break;
				}
			};
		}
	}

	private handleNewIndices(indices: EconomicIndices | null): void {
		if (!indices) {
			throw new Error('Falha, indices nulos');
			return;
		}

		this.currentIndices = indices;
		saveToStorage(indices);
		this.logIndices();
		this.resolvePendingPromises();
	}

	private handleWorkerError(error: string): void {
		console.error('Worker error:', error);
		this.resolvePendingPromises();
	}

	private resolvePendingPromises(): void {
		this.pendingResolvers.forEach((resolve) => resolve());
		this.pendingResolvers = [];
	}

	public async getIndices(): Promise<EconomicIndices | null> {
		if (!this.currentIndices) {
			const stored = loadFromStorage();
			this.currentIndices = stored?.data || null;

			if (!stored || shouldUpdate(stored)) {
				await this.updateIndices();
			}
		}
		return this.currentIndices;
	}

	public async updateIndices(): Promise<void> {
		return new Promise((resolve) => {
			if (this.worker) {
				this.pendingResolvers.push(resolve);
				const stored = loadFromStorage();
				const command: WorkerCommand = {
					type: 'update',
					payload: stored?.data || null,
				};
				this.worker.postMessage(command);
			} else {
				resolve();
			}
		});
	}

	private logIndices(): void {
		if (this.currentIndices) {
			console.log('Índices atualizados:', this.currentIndices);
		}
	}
}

export const economicIndices = new EconomicIndicesClient();
