import { fetchIndex } from '../lib/fetchIndex';
import { IndexValue } from '../lib/types';
import { parseNumber } from '../lib/utils';

export async function fetchINPC(
	fallback?: IndexValue,
): Promise<IndexValue> {
	return fetchIndex({
		url: 'https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/-1/variaveis/44?localidades=N1[all]',
		parser: (data) => {
			if (!data.length || !data[0].resultados.length) return null;
			return parseNumber(data[0].resultados[0].series[0].serie['-1']);
		},
		fallback,
		indexName: 'INPC',
	});
}
