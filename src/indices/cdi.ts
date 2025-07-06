import { fetchIndex } from '../engine/fetchIndex.js';
import { IndexValue } from '../types/types.js';
import {
	parseNumber,
	diarioUtilToAnual,
	getValidBCBDate,
} from '../engine/utils.js';

export async function fetchCDI(
	fallback?: IndexValue,
): Promise<IndexValue> {
	return fetchIndex({
		url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json',
		p: (data: any) => {
			if (!Array.isArray(data) || data.length === 0) return null;

			const dailyValue = parseNumber(data[0].valor);
			return diarioUtilToAnual(dailyValue);
		},
		fb:
			fallback ?
				{
					...fallback,
					current:
						fallback.current ?
							diarioUtilToAnual(fallback.current)
						:	0,
				}
			:	undefined,
		iname: 'CDI',
		hCfg: {
			urlBuilder: (baseUrl: string) =>
				baseUrl.replace('/ultimos/1', '') +
				'&dataInicial=' +
				getValidBCBDate(5),
			p: (data: any) => {
				if (!Array.isArray(data)) return [];
				return data.map((item) => {
					const dailyValue = parseNumber(item.valor);
					return diarioUtilToAnual(dailyValue);
				});
			},
		},
	});
}
