import { fetchIndex } from '../engine/fetchIndex.js';
import {
	EconomicIndicesLogger,
	getValidBCBDate,
	parseNumber,
} from '../engine/utils.js';
import { IndexValue } from '../types/types.js';

const logger = EconomicIndicesLogger.getInstance();

export async function fetchTR(
	fallback?: IndexValue,
): Promise<IndexValue> {
	const currentDate = new Date();
	const fiveYearsAgo = new Date(getValidBCBDate(5));

	return fetchIndex({
		// BCB Série 226 (TR) - Exemplo com API BCB
		url: `https://olinda.bcb.gov.br/olinda/servico/taxaReferencial/versao/v1/odata/UltimoValor?$format=json`,
		p: (data: any) => {
			if (!data?.value?.[0]?.taxa) return null;
			const value = parseNumber(data.value[0].taxa);
			logger.log(`TR atual: ${value}%`);
			return value;
		},
		fb: fallback,
		iname: 'TR',
		hCfg: {
			urlBuilder: () =>
				`https://olinda.bcb.gov.br/olinda/servico/taxaReferencial/versao/v1/odata/ValoresSeries?$format=json&dataInicial=${getValidBCBDate(0, fiveYearsAgo)}&dataFinal=${getValidBCBDate(0, currentDate)}`,
			p: (data: any) => {
				if (!data?.value) return [];
				return data.value.map((item: any) => parseNumber(item.taxa));
			},
		},
	});
}
