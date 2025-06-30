import { economicIndices } from './lib';

// 1. Declaração de tipo para o objeto window
declare const window: Window &
	typeof globalThis & {
		economicIndices?: typeof economicIndices;
	};

// 2. Exposição para desenvolvimento
if (import.meta.env.DEV) {
	window.economicIndices = economicIndices;
}

// 3. Exportação principal
export { economicIndices };
