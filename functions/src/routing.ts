// Server-side copy of src/utils/routing.ts + src/constants/pollution.ts's
// agency data. Cloud Functions can't import from the app's src/ (separate
// package, separate deploy), and this logic must run server-side anyway:
// onSightingCreated recomputes severity/agencyEmailed from pollutionClass +
// county here rather than trusting whatever the client submitted, since a
// client could otherwise submit an internally-inconsistent combination
// (e.g. pollutionClass: 'oil_sheen' with a forged severity: 'NONE' or an
// arbitrary agencyEmailed) that still passes Firestore's per-field
// validation. Keep this in sync with the client copies if either changes.

export type PollutionClass =
  | 'oil_sheen'
  | 'foam_suds'
  | 'discoloration'
  | 'algal_bloom'
  | 'solid_debris'
  | 'clean_water';

export type Severity = 'HIGH' | 'MEDIUM' | 'NONE';

const POLLUTION_CLASSES: Record<PollutionClass, { severity: Severity; agencies: string[] }> = {
  oil_sheen: { severity: 'HIGH', agencies: ['nwroerts@ecy.wa.gov'] },
  foam_suds: { severity: 'HIGH', agencies: ['nwroerts@ecy.wa.gov'] },
  algal_bloom: { severity: 'MEDIUM', agencies: [] },
  discoloration: { severity: 'MEDIUM', agencies: [] },
  solid_debris: { severity: 'MEDIUM', agencies: ['nwroerts@ecy.wa.gov'] },
  clean_water: { severity: 'NONE', agencies: [] },
};

const COUNTY_ALGAL_AGENCIES: Record<string, string> = {
  King: 'lakes@kingcounty.gov',
  _default: 'nwroerts@ecy.wa.gov',
};

const COUNTY_DISCOLORATION_AGENCIES: Record<string, string> = {
  _default: 'nwroerts@ecy.wa.gov',
};

export function getSeverity(pollutionClass: PollutionClass): Severity {
  return POLLUTION_CLASSES[pollutionClass]?.severity ?? 'NONE';
}

export function resolveAgency(
  pollutionClass: PollutionClass,
  county: string,
  confidence: number
): string | null {
  const entry = POLLUTION_CLASSES[pollutionClass];
  if (!entry || entry.severity === 'NONE') return null;
  if (confidence < 0.6) return null;

  if (entry.agencies.length > 0) return entry.agencies[0];

  if (pollutionClass === 'algal_bloom') {
    return COUNTY_ALGAL_AGENCIES[county] ?? COUNTY_ALGAL_AGENCIES._default;
  }

  if (pollutionClass === 'discoloration') {
    return COUNTY_DISCOLORATION_AGENCIES[county] ?? COUNTY_DISCOLORATION_AGENCIES._default;
  }

  return null;
}
