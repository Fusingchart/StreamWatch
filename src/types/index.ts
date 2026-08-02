export type PollutionClass =
  | 'oil_sheen'
  | 'foam_suds'
  | 'discoloration'
  | 'algal_bloom'
  | 'solid_debris'
  | 'clean_water';

export type Severity = 'HIGH' | 'MEDIUM' | 'NONE';

// A visual estimate from the classifier, not a calibrated instrument
// reading (a real turbidity measurement requires a light-scatter sensor).
export type Turbidity = 'clear' | 'slight' | 'moderate' | 'severe';

export interface Sighting {
  id: string;
  userId: string;
  pollutionClass: PollutionClass;
  confidence: number;
  severity: Severity;
  turbidity: Turbidity;
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
  turbidity: Turbidity;
  allScores: Partial<Record<PollutionClass, number>>;
}
