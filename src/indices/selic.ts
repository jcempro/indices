import { fetchIndex } from '../lib/fetchIndex.js';
import { IndexValue } from '../lib/types.js';
import { getValidBCBDate, parseNumber } from '../lib/utils.js';

export async function fetchSelic(
	fallback?: IndexValue,
): Promise<IndexValue> {
	const fiveYearsAgo = getValidBCBDate(5);
	const historicalUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json&dataInicial=${fiveYearsAgo}`;

	return fetchIndex({
		url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
		parser: (data) => {
			if (!data?.length) return null;
			return parseNumber(data[0].valor);
		},
		fallback,
		indexName: 'SELIC',
		historicalConfig: {
			urlBuilder: () => historicalUrl,
			parser: (data) => {
				if (!Array.isArray(data)) return [];
				return data.map((item) => parseNumber(item.valor));
			},
		},
	});
}
