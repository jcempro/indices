import { fetchIndex } from '../lib/fetchIndex.js';
import { IndexValue } from '../lib/types.js';
import {
	parseNumber,
	diarioUtilToAnual,
	getValidBCBDate,
} from '../lib/utils.js';

export async function fetchCDI(
	fallback?: IndexValue,
): Promise<IndexValue> {
	return fetchIndex({
		url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json',
		parser: (data: any) => {
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
			urlBuilder: (baseUrl: string) =>
				baseUrl.replace('/ultimos/1', '') +
				'&dataInicial=' +
				getValidBCBDate(5),
			parser: (data: any) => {
				if (!Array.isArray(data)) return [];
				return data.map((item) => {
					const dailyValue = parseNumber(item.valor);
					return diarioUtilToAnual(dailyValue);
				});
			},
		},
	});
}
