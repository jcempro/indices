import { fetchIndex } from '../engine/fetchIndex.js';
import {
	EconomicIndicesLogger,
	getValidBCBDate,
	parseNumber,
} from '../engine/utils.js';
import { IndexValue } from '../types/types.js';

const logger = EconomicIndicesLogger.getInstance();

export async function fetchIGPM(
	fallback?: IndexValue,
): Promise<IndexValue> {
	const currentDate = new Date();
	const fiveYearsAgo = new Date(getValidBCBDate(5));

	return fetchIndex({
		// FGV Data - Exemplo de endpoint (ajuste conforme API real)
		url: `https://api.fgv.br/igpm/ultimo?data=${getValidBCBDate(0, currentDate)}`,
		p: (data: any) => {
			if (!data?.valor) return null;
			const value = parseNumber(data.valor);
			logger.log(`IGPM atual: ${value}%`);
			return value;
		},
		fb: fallback,
		iname: 'IGPM',
		hCfg: {
			urlBuilder: () =>
				`https://api.fgv.br/igpm/serie?inicio=${getValidBCBDate(0, fiveYearsAgo)}&fim=${getValidBCBDate(0, currentDate)}`,
			p: (data: any) => {
				if (!Array.isArray(data)) return [];
				return data.map((item) => parseNumber(item.valor));
			},
		},
	});
}
