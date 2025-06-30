import { fetchIndex } from '../lib/fetchIndex';
import { IndexValue } from '../lib/types';
import { parseNumber } from '../lib/utils';

export async function fetchExchange(
	fallback?: IndexValue,
): Promise<IndexValue> {
	return fetchIndex({
		url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.10813/dados/ultimos/1?formato=json',
		parser: (data) => {
			if (!data.length) return null;
			return parseNumber(data[0].valor);
		},
		fallback,
		indexName: 'Exchange Rate',
		isHistorical: true,
		historicalParser: (data) => {
			return data.map((item: any) => parseNumber(item.valor));
		},
	});
}
