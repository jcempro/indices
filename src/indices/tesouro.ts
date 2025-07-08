import { fetchIndex } from '../engine/fetchIndex.js';
import { IndexValue } from '../types/types.js';
import { parseNumber } from '../engine/utils.js';

type PapelTesouro =
	| 'LTN'
	| 'NTN-F'
	| 'NTN-B'
	| 'NTN-B Principal'
	| 'LFT';

const NOMES = {
	LTN: 'Tesouro Prefixado',
	'NTN-F': 'Tesouro Prefixado com juros',
	'NTN-B': 'Tesouro IPCA+ com juros',
	'NTN-B Principal': 'Tesouro IPCA+ sem juros',
	LFT: 'Tesouro Selic',
} satisfies Record<PapelTesouro, string>;

function parseCSVToTaxas(csv: string): number[] {
	const lines = csv.split('\n');
	const taxas: number[] = [];

	for (const line of lines) {
		const cols = line.split(';').map((c) => c.trim());
		const taxa = parseNumber(cols[2]);
		if (!isNaN(taxa)) taxas.push(taxa);
	}

	return taxas;
}

function calcVariacaoPct(from: number, to: number): number {
	return parseNumber(((to - from) / from) * 100);
}

function getCurrentFromTaxas(taxas: number[]): number | null {
	if (taxas.length < 13) return null;
	const atual = taxas[taxas.length - 1];
	const anterior = taxas[taxas.length - 13];
	return calcVariacaoPct(anterior, atual);
}

function getVariacoesAnuais(taxas: number[]): number[] {
	const series: number[] = [];
	for (let i = 0; i + 12 <= taxas.length; i += 12) {
		const bloco = taxas.slice(i, i + 12);
		if (bloco.length === 12) {
			series.push(calcVariacaoPct(bloco[0], bloco[11]));
		}
	}
	return series;
}

/**
 * Função genérica para qualquer papel
 */
export function fetchTesouroPorPapel(
	papel: PapelTesouro,
	fallback?: IndexValue,
): Promise<IndexValue> {
	const arquivo = papel.replace(/\s+/g, '_') + '.csv';
	const url = `https://www.anbima.com.br/informacoes/est-indic/indicadores/${arquivo}`;

	return fetchIndex({
		url,
		p: (csv: string): number | IndexValue | null => {
			const taxas = parseCSVToTaxas(csv);
			const current = getCurrentFromTaxas(taxas);
			if (current === null) return null;

			return {
				current: current,
				updated: new Date(),
			};
		},
		fb: fallback,
		iname: NOMES[papel],
		hCfg: {
			urlBuilder: () => url,
			p: (csv: string): number[] => {
				const taxas = parseCSVToTaxas(csv);
				return getVariacoesAnuais(taxas);
			},
		},
	});
}

// Derivações nominais

export const fetchLTN = (fb?: IndexValue) =>
	fetchTesouroPorPapel('LTN', fb);
export const fetchNTNF = (fb?: IndexValue) =>
	fetchTesouroPorPapel('NTN-F', fb);
export const fetchNTNB = (fb?: IndexValue) =>
	fetchTesouroPorPapel('NTN-B', fb);
export const fetchNTNBPrincipal = (fb?: IndexValue) =>
	fetchTesouroPorPapel('NTN-B Principal', fb);
export const fetchLFT = (fb?: IndexValue) =>
	fetchTesouroPorPapel('LFT', fb);
