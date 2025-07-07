import { fetchIndex } from '../engine/fetchIndex.js';
import { IndexValue } from '../types/types.js';
import { formatBCBDate, parseNumber } from '../engine/utils.js';

/**
 * Transforma lista de TRs mensais em acumulado composto (ex: 1% → 0.01 acumulado)
 */
function acumularTR(valoresMensais: number[]): number {
	return parseNumber(
		(valoresMensais.reduce((acc, taxa) => acc * (1 + taxa / 100), 1) -
			1) *
			100,
	);
}

export async function fetchTR(
	fallback?: IndexValue,
): Promise<IndexValue> {
	const now = new Date();
	const endDate = formatBCBDate(now, '/');
	const start12m = formatBCBDate(
		new Date(now.getFullYear(), now.getMonth() - 11, 1),
		'/',
	);
	const start5y = formatBCBDate(
		new Date(now.getFullYear() - 5, 0, 1),
		'/',
	);

	return fetchIndex({
		url: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados?formato=json&dataInicial=${start12m}&dataFinal=${endDate}`,
		p: (data: any): IndexValue | null => {
			if (!Array.isArray(data) || data.length < 12) return null;

			const taxasMensais: number[] = [];
			const taxasPorMes = new Map<string, number[]>();

			for (const { data: dataStr, valor } of data) {
				const [day, month, year] = dataStr.split('/');
				const key = `${year}-${month}`;
				const taxa = parseNumber(valor);

				if (!taxasPorMes.has(key)) taxasPorMes.set(key, []);
				taxasPorMes.get(key)!.push(taxa);
			}

			for (const taxas of taxasPorMes.values()) {
				const media = taxas.reduce((a, b) => a + b, 0) / taxas.length;
				taxasMensais.push(parseNumber(media));
			}

			return {
				current: acumularTR(taxasMensais),
				updated: new Date(),
			};
		},
		fb: fallback,
		iname: 'TR',
		hCfg: {
			urlBuilder: () =>
				`https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados?formato=json&dataInicial=${start5y}&dataFinal=${endDate}`,
			p: (data: any): number[] => {
				if (!Array.isArray(data) || data.length === 0) return [];

				const anosMap = new Map<string, number[]>();
				for (const { data: dataStr, valor } of data) {
					const [_, __, year] = dataStr.split('/');
					const taxa = parseNumber(valor);
					if (!anosMap.has(year)) anosMap.set(year, []);
					anosMap.get(year)!.push(taxa);
				}

				const acumuladosAnuais: number[] = [];
				for (const taxas of anosMap.values()) {
					const meses = Math.floor(taxas.length / 21);
					const mediasMensais: number[] = [];

					for (let i = 0; i < meses; i++) {
						const grupo = taxas.slice(i * 21, (i + 1) * 21);
						const media =
							grupo.reduce((a, b) => a + b, 0) / grupo.length;
						mediasMensais.push(parseNumber(media));
					}

					acumuladosAnuais.push(acumularTR(mediasMensais));
				}

				return acumuladosAnuais;
			},
		},
	});
}
