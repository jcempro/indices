import { fetchIndex } from '../engine/fetchIndex.js';
import { IndexValue } from '../types/types.js';
import { getValidBCBDate, parseNumber } from '../engine/utils.js';

export async function fetchSelic(
	fallback?: IndexValue,
): Promise<IndexValue> {
	const fiveYearsAgo = getValidBCBDate(5);
	const historicalUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json&dataInicial=${fiveYearsAgo}`;

	return fetchIndex({
		url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
		p: (data: any) => {
			if (!data?.length) return null;
			return parseNumber(data[0].valor);
		},
		fb: fallback,
		iname: 'SELIC',
		hCfg: {
			urlBuilder: () => historicalUrl,
			p: (data: any) => {
				if (!Array.isArray(data)) return [];
				return data.map((item) => parseNumber(item.valor));
			},
		},
	});
}
