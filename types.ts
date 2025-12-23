
export enum SourceType {
  API = 'API',
  FILE = 'FILE',
  BOT = 'BOT'
}

export interface ForeignResidentData {
  id: string;
  region: string;
  count: number;
  nationality: string;
  visa_type: string;
  collected_at: string;
  source_type: SourceType;
}

export interface PolicyData {
  id: string;
  region: string;
  title: string;
  category: string;
  budget: number;
  target_audience: string;
  collected_at: string;
  source_type: SourceType;
}

export interface MismatchIndex {
  region: string;
  demand_count: number;
  supply_budget: number;
  mismatch_ratio: number; // budget per resident
}
