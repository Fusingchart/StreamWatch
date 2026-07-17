export type PollutionClass =
  | 'oil_sheen'
  | 'foam_suds'
  | 'discoloration'
  | 'algal_bloom'
  | 'solid_debris'
  | 'clean_water';

export type Severity = 'HIGH' | 'MEDIUM' | 'NONE';

export interface Sighting {
  id: string;
  userId: string;
  pollutionClass: PollutionClass;
  confidence: number;
  severity: Severity;
  latitude: number;
  longitude: number;
  photoUrl: string;
  county: string;
  reportedAt: Date;
  agencyEmailed: string | null;
  hidden: boolean;
  resolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: 'community' | 'agency' | null;
}

export interface ClassificationResult {
  pollutionClass: PollutionClass;
  confidence: number;
  allScores: Partial<Record<PollutionClass, number>>;
}
