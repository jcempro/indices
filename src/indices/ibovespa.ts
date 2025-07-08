import { fetchIndex } from '../engine/fetchIndex.js';
import { IndexValue } from '../types/types.js';
import {
	parseNumber,
	EconomicIndicesLogger,
} from '../engine/utils.js';

const logger = EconomicIndicesLogger.getInstance();

function calculateVariation(first: number, last: number): number {
	return parseNumber((((last - first) / first) * 100).toFixed(2));
}

function getValidValues(
	data: any,
): { first: number; last: number; count: number } | null {
	const closes =
		data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
	if (!Array.isArray(closes)) return null;

	// Filtra valores não-nulos e não-zero
	const validValues = closes.filter((v) => v !== null && v > 0);
	if (validValues.length < 2) return null;

	return {
		first: validValues[0],
		last: validValues[validValues.length - 1],
		count: validValues.length,
	};
}

export async function fetchIbovespa(
	fallback?: IndexValue,
): Promise<IndexValue> {
	return fetchIndex({
		url: `https://query1.finance.yahoo.com/v8/finance/chart/^BVSP?interval=1mo&range=1y`,
		p: (data: any): IndexValue | null => {
			try {
				const values = getValidValues(data);
				if (!values) return null;

				logger.log(`Ibovespa: ${values.count} meses válidos`, {
					primeiro: values.first,
					ultimo: values.last,
				});

				return {
					current: calculateVariation(values.first, values.last),
					updated: new Date(),
				};
			} catch (error) {
				logger.error('Erro ao processar Ibovespa:', error);
				return null;
			}
		},
		fb: fallback,
		iname: 'Ibovespa',
		hCfg: {
			urlBuilder: () =>
				`https://query1.finance.yahoo.com/v8/finance/chart/^BVSP?interval=1mo&range=5y`,
			p: (data: any): number[] => {
				const values = getValidValues(data);
				if (!values) return [];

				// Considera que a API retorna aproximadamente 60 meses (5 anos)
				const monthlyData =
					data.chart.result[0].indicators.quote[0].close;
				const yearlyVariations: number[] = [];

				// Calcula variação para cada período de 12 meses
				for (let i = 0; i + 12 < monthlyData.length; i++) {
					const first = monthlyData[i];
					const last = monthlyData[i + 11];
					if (first && last) {
						yearlyVariations.push(calculateVariation(first, last));
					}
				}

				logger.log('Variações anuais calculadas:', yearlyVariations);
				return yearlyVariations;
			},
		},
	});
}
