import { fetchIndex } from '../lib/fetchIndex';
import type { IndexValue } from '../lib/types';
import {
	parseNumber,
	getValidBCBDate,
	diarioUtilToAnual,
} from '../lib/utils';

export async function fetchCDI(
	fallback?: IndexValue,
): Promise<IndexValue> {
	return fetchIndex({
		url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json',
		parser: (data) => {
			if (!Array.isArray(data) || data.length === 0) return null;

			const dailyValue = parseNumber(data[0].valor);
			return diarioUtilToAnual(dailyValue);
		},
		fallback:
			fallback ?
				{
					...fallback,
					current:
						fallback.current ?
							diarioUtilToAnual(fallback.current)
						:	0,
				}
			:	undefined,
		indexName: 'CDI',
		historicalConfig: {
			urlBuilder: (baseUrl) =>
				baseUrl.replace('/ultimos/1', '') +
				'&dataInicial=' +
				getValidBCBDate(5),
			parser: (data) => {
				if (!Array.isArray(data)) return [];
				return data.map((item) => {
					const dailyValue = parseNumber(item.valor);
					return diarioUtilToAnual(dailyValue);
				});
			},
		},
	});
}
