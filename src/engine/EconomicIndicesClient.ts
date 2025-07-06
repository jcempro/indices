import { SOURCES } from '../config.js';
import {
	deveriaAtualizar,
	loadFromStorage,
	_saveToStorage,
} from './storage.js';
import {
	EconomicIndices,
	WorkerMessage,
	WorkerCommand,
} from '../types/types.js';
import workerScript from './worker-string.js';

class EconomicIndicesClient {
	private worker: Worker | null = null;
	private currentIndices: EconomicIndices | null = null;
	private pendingResolvers: Array<
		(value: EconomicIndices | null) => void
	> = [];
	private readonly isNode: boolean;

	constructor() {
		this.isNode =
			typeof process !== 'undefined' &&
			process.versions?.node !== undefined;
		this._initialize().catch(console.error);
	}

	private async _initialize(): Promise<void> {
		if (!this.isNode) {
			await this._initWebWorker();
		}
	}

	private async _initWebWorker(): Promise<void> {
		if (typeof Worker === 'undefined') return;

		try {
			const blob = new Blob([workerScript], {
				type: 'application/javascript',
			});
			this.worker = new Worker(URL.createObjectURL(blob));

			this.worker.onmessage = (
				event: MessageEvent<WorkerMessage>,
			) => {
				if (event.data.type === 'indices') {
					this._handleNewIndices(event.data.indices);
				}
			};

			this.worker.onerror = (error) => {
				console.error('Worker error:', error);
				this.handleWorkerError();
			};
		} catch (error) {
			console.error('Worker initialization failed:', error);
		}
	}

	private _handleNewIndices(indices: EconomicIndices | null): void {
		this.currentIndices = indices;
		if (indices) {
			_saveToStorage(indices).catch(console.error);
		}
		this.resolvePendingPromises(indices);
	}

	private handleWorkerError(): void {
		this.resolvePendingPromises(null);
	}

	private resolvePendingPromises(
		indices: EconomicIndices | null,
	): void {
		this.pendingResolvers.forEach((resolve) => resolve(indices));
		this.pendingResolvers = [];
	}

	public async getIndices(): Promise<EconomicIndices | null> {
		const stored = await loadFromStorage();

		if (stored && !deveriaAtualizar(stored)) {
			return stored.indices; // Retorna apenas a parte EconomicIndices
		}

		return this.isNode ?
				this.fetchIndicesNode()
			:	this.fetchIndicesBrowser();
	}

	private async fetchIndicesNode(): Promise<EconomicIndices | null> {
		try {
			const indices = await this.fetchAllIndices(this.currentIndices);
			if (indices) {
				await _saveToStorage(indices);
				this.currentIndices = indices;
			}
			return indices;
		} catch (error) {
			console.error('Node fetch failed:', error);
			return null;
		}
	}

	private async fetchIndicesBrowser(): Promise<EconomicIndices | null> {
		if (!this.worker) {
			return this.fetchIndicesNode(); // Fallback
		}

		return new Promise((resolve) => {
			this.pendingResolvers.push(resolve);
			this.worker?.postMessage({ type: 'update' } as WorkerCommand);
		});
	}

	private async fetchAllIndices(
		previousData: EconomicIndices | null,
	): Promise<EconomicIndices> {
		const indices = {} as EconomicIndices;

		await Promise.all(
			Object.entries(SOURCES).map(async ([key, fetchFn]) => {
				const indexKey = key as keyof EconomicIndices;
				indices[indexKey] = await fetchFn(previousData?.[indexKey]);
			}),
		);

		return indices;
	}
}

export const ECONIDX = new EconomicIndicesClient();
