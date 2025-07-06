import { fetchIndex } from '../engine/fetchIndex.js';
import { IndexValue } from '../types/types.js';
import { parseNumber } from '../engine/utils.js';

export async function fetchExchange(
	fallback?: IndexValue,
): Promise<IndexValue> {
	return fetchIndex({
		url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.10813/dados/ultimos/1?formato=json',
		p: (data: any) => {
			if (!Array.isArray(data) || data.length === 0) return null;
			return parseNumber(data[0].valor);
		},
		fb: fallback,
		iname: 'Exchange Rate',
		hCfg: {
			urlBuilder: (baseUrl: string) =>
				baseUrl.replace('/ultimos/1', '') + '&dataInicial=5yearsago',
			p: (data: any) => {
				if (!Array.isArray(data)) return [];
				return data.map((item) => parseNumber(item?.valor || 0));
			},
		},
	});
}
