import { fetchIndex } from '../engine/fetchIndex.js';
import {
	EconomicIndicesLogger,
	parseNumber,
	getValidBCBDate,
} from '../engine/utils.js';
import { IndexValue } from '../types/types.js';

const logger = EconomicIndicesLogger.getInstance();

function calculateAnnualized(values: number[]): number {
	if (values.length < 12) return 0;
	const last12 = values.slice(-12);
	const accumulated =
		last12.reduce((acc, val) => acc * (1 + val / 100), 1) - 1;
	return parseNumber((accumulated * 100).toFixed(2));
}

// src/indices/inflation/fetchIGPM.ts
// src/indices/inflation/fetchIGPM.ts
export async function fetchIGPM(
	fallback?: IndexValue,
): Promise<IndexValue> {
	return fetchIndex({
		url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados/ultimos/12?formato=json',
		p: (data: any) => {
			if (!Array.isArray(data) || data.length < 12) return null;

			// Soma simples dos últimos 12 meses (cálculo oficial do IGPM acumulado)
			const accumulated = data.reduce(
				(sum, item) => sum + parseNumber(item.valor),
				0,
			);
			return parseNumber(accumulated.toFixed(2));
		},
		fb: fallback,
		iname: 'IGPM',
		hCfg: {
			urlBuilder: () =>
				'https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json',
			p: (data: any) => {
				if (!Array.isArray(data)) return [];

				// Agrupa por ano e soma os valores
				const yearlyData: Record<string, number[]> = {};
				data.forEach((item) => {
					const year = new Date(item.data).getFullYear();
					if (!yearlyData[year]) yearlyData[year] = [];
					yearlyData[year].push(parseNumber(item.valor));
				});

				return Object.values(yearlyData)
					.filter((values) => values.length >= 12)
					.map((values) =>
						parseNumber(values.reduce((a, b) => a + b, 0).toFixed(2)),
					);
			},
		},
	});
}
