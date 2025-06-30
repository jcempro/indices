import { loadFromStorage } from './storage';
import { EconomicIndices } from './types';

export class EconomicIndicesClient {
	private worker: Worker | null = null;
	private currentIndices: EconomicIndices | null = null;

	constructor() {
		this.currentIndices = loadFromStorage()?.data || null;
		this.initWorker();
	}

	private initWorker(): void {
		if (typeof Worker !== 'undefined') {
			this.worker = new Worker(
				new URL('./worker.ts', import.meta.url),
				{
					type: 'module',
				},
			);

			this.worker.onmessage = (event: MessageEvent) => {
				if (event.data.type === 'indices' && event.data.indices) {
					this.currentIndices = event.data.indices;
					this.logIndices();
				}
			};
		}
	}

	public async getIndices(): Promise<EconomicIndices | null> {
		if (!this.currentIndices) {
			await this.updateIndices();
		}
		return this.currentIndices;
	}

	public async updateIndices(): Promise<void> {
		if (this.worker) {
			this.worker.postMessage('update');
		}
	}

	private logIndices(): void {
		if (this.currentIndices) {
			console.log('Índices Econômicos Atualizados:', {
				SELIC: this.currentIndices.selic,
				CDI: this.currentIndices.cdi,
				IPCA: this.currentIndices.ipca,
				INPC: this.currentIndices.inpc,
				Câmbio: this.currentIndices.exchange,
				'Última Atualização': this.currentIndices.lastUpdated,
			});
		}
	}
}

export const economicIndices = new EconomicIndicesClient();
