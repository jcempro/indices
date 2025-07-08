import { fetchIndex } from '../engine/fetchIndex.js';
import { IndexValue } from '../types/types.js';
import { getValidBCBDate, parseNumber } from '../engine/utils.js';

export async function fetchTFB(
	fallback?: IndexValue,
): Promise<IndexValue> {
	const fiveYearsAgo = getValidBCBDate(5);
	const historicalUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.2289/dados?formato=json&dataInicial=${fiveYearsAgo}`;

	return fetchIndex({
		url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.2289/dados/ultimos/1?formato=json',
		p: (data) =>
			data?.[0]?.valor ? parseNumber(data[0].valor) : null,
		fb: fallback,
		iname: 'TFB',
		hCfg: {
			urlBuilder: () => historicalUrl,
			p: (data) => data.map((item: any) => parseNumber(item.valor)),
		},
	});
}
