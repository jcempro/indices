import { fetchIndex } from '../engine/fetchIndex.js';
import {
	EconomicIndicesLogger,
	getValidBCBDate,
	parseNumber,
} from '../engine/utils.js';
import { IndexValue } from '../types/types.js';

const logger = EconomicIndicesLogger.getInstance();

export async function fetchEMBI(
	fallback?: IndexValue,
): Promise<IndexValue> {
	const currentDate = new Date();
	const fiveYearsAgo = new Date(getValidBCBDate(5));

	return fetchIndex({
		// JP Morgan/BCB - Exemplo com dados do BCB (Série 433)
		url: `https://olinda.bcb.gov.br/olinda/servico/IndiceRisk/versao/v1/odata/UltimoValor?$format=json`,
		p: (data: any) => {
			if (!data?.value?.[0]?.pontos) return null;
			const value = parseNumber(data.value[0].pontos);
			logger.log(`EMBI+ atual: ${value} pontos`);
			return value;
		},
		fb: fallback,
		iname: 'EMBI+',
		hCfg: {
			urlBuilder: () =>
				`https://olinda.bcb.gov.br/olinda/servico/IndiceRisk/versao/v1/odata/ValoresSeries?$format=json&dataInicial=${getValidBCBDate(0, fiveYearsAgo)}&dataFinal=${getValidBCBDate(0, currentDate)}`,
			p: (data: any) => {
				if (!data?.value) return [];
				return data.value.map((item: any) =>
					parseNumber(item.pontos),
				);
			},
		},
	});
}
