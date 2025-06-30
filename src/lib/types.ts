export interface IndexValue {
	current: number;
	last5YearsAvg?: number;
	lastUpdated?: string;
}

export interface EconomicIndices {
	selic: IndexValue;
	cdi: IndexValue;
	ipca: IndexValue;
	inpc: IndexValue;
	exchange: IndexValue;
	lastUpdated: string;
}
