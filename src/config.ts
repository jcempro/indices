export const MAX_ATTEMPTS = 10;

export const SOURCES = {
	selic:
		'https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1?formato=json',
	cdi: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json',
	ipca: 'https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/ultimo/variaveis/63?localidades=N1[all]',
	inpc: 'https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/ultimo/variaveis/188?localidades=N1[all]',
};
