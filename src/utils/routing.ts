import { PollutionClass, Severity } from '../types';
import { POLLUTION_CLASSES } from '../constants/pollution';

// County-specific agency overrides for classes that depend on location
const COUNTY_ALGAL_AGENCIES: Record<string, string> = {
  Snohomish: 'snohomish.county@co.snohomish.wa.us',
  King: 'wtd@kingcounty.gov',
  _default: 'wq@ecy.wa.gov',
};

const COUNTY_DISCOLORATION_AGENCIES: Record<string, string> = {
  Snohomish: 'snohomish.environmental@co.snohomish.wa.us',
  King: 'king.environmental@kingcounty.gov',
  Skagit: 'skagit.environmental@co.skagit.wa.us',
  _default: 'wq@ecy.wa.gov',
};

export function resolveAgency(
  pollutionClass: PollutionClass,
  county: string,
  confidence: number
): string | null {
  const { severity, agencies } = POLLUTION_CLASSES[pollutionClass];

  if (severity === 'NONE') return null;
  if (confidence < 0.6) return null;

  if (agencies.length > 0) return agencies[0];

  if (pollutionClass === 'algal_bloom') {
    return COUNTY_ALGAL_AGENCIES[county] ?? COUNTY_ALGAL_AGENCIES._default;
  }

  if (pollutionClass === 'discoloration') {
    // HIGH confidence → state WQ, MEDIUM → county environmental health
    if (confidence >= 0.8) return 'wq@ecy.wa.gov';
    return (
      COUNTY_DISCOLORATION_AGENCIES[county] ??
      COUNTY_DISCOLORATION_AGENCIES._default
    );
  }

  return null;
}

export function getSeverity(pollutionClass: PollutionClass): Severity {
  return POLLUTION_CLASSES[pollutionClass].severity;
}
