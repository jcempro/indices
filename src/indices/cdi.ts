import { fetchIndex } from '../lib/fetchIndex';
import { IndexValue } from '../lib/types';
import { parseNumber } from '../lib/utils';

export async function fetchCDI(
	fallback?: IndexValue,
): Promise<IndexValue> {
	return fetchIndex({
		url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json',
		parser: (data) => {
			if (!data.length) return null;
			return parseNumber(data[0].valor);
		},
		fallback,
		indexName: 'CDI',
	});
}
