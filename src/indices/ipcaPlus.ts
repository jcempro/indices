import { fetchIndex } from '../engine/fetchIndex.js';
import { IndexValue } from '../types/types.js';
import { parseNumber } from '../engine/utils.js';

export async function fetchIPCAPlus(
	spread: number, // Spread em porcentagem (ex.: 5 para IPCA+5%)
	fallback?: IndexValue,
): Promise<IndexValue> {
	const ipca = await fetchIndex({
		url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json',
		p: (data) =>
			data?.[0]?.valor ? parseNumber(data[0].valor) : null,
		fb: fallback,
		iname: 'IPCA',
	});

	if (ipca.current === 0) return fallback ?? ipca;

	return {
		current: parseNumber((ipca.current + spread).toString()),
		avg:
			ipca.avg ?
				parseNumber((ipca.avg + spread).toString())
			:	undefined,
		updated: ipca.updated,
		src: ipca.src,
	};
}
