import { fetchCDI } from './indices/cdi.js';
import { fetchINPC } from './indices/inpc.js';
import { fetchIPCA } from './indices/ipca.js';
import { fetchSelic } from './indices/selic.js';
import { fetchs } from './types/types.js';
import { FetchOptions } from './engine/utils.js';
import { fetchDolar } from './indices/dolar.js';
import { fetchEMBI } from './indices/embi.js';
import { fetchIGPM } from './indices/igmp.js';
import { fetchTR } from './indices/tr.js';

export const CACHE_TTL = 30 * 60 * 1000; // 5 minutos em milissegundos

export const DEFAULT_FETCH_OPTIONS: FetchOptions = {
	retries: 7,
	retryDelay: 1500,
	timeout: 1000,
};

export const SOURCES: Record<PropertyKey, fetchs> = {
	Selic: fetchSelic,
	CDI: fetchCDI,
	ipca: fetchIPCA,
	inpc: fetchINPC,
	dolar: fetchDolar,
	igpm: fetchIGPM,
	tr: fetchTR,
	embi: fetchEMBI,
};
