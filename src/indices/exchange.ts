import { fetchIndex } from '../lib/fetchIndex';
import type { IndexValue } from '../lib/types';
import { parseNumber } from '../lib/utils';

export async function fetchExchange(
	fallback?: IndexValue,
): Promise<IndexValue> {
	return fetchIndex({
		url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.10813/dados/ultimos/1?formato=json',
		parser: (data) => {
			if (!Array.isArray(data) || data.length === 0) return null;
			return parseNumber(data[0].valor);
		},
		fallback,
		indexName: 'Exchange Rate',
		historicalConfig: {
			urlBuilder: (baseUrl) =>
				baseUrl.replace('/ultimos/1', '') + '&dataInicial=5yearsago',
			parser: (data) => {
				if (!Array.isArray(data)) return [];
				return data.map((item) => parseNumber(item?.valor || 0));
			},
		},
	});
}
