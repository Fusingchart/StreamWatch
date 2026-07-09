import { PollutionClass, Severity } from '../types';
import { POLLUTION_CLASSES } from '../constants/pollution';

// County-specific agency overrides for classes that depend on location.
// Only King County has a verified direct email (lakes@kingcounty.gov, their
// actual algae/lake-quality contact). Snohomish County's water quality
// reporting is phone-only (425-388-6481, no public email found) and Skagit
// County's is a web form, so both fall back to Ecology's verified regional
// intake instead of a made-up address.
const COUNTY_ALGAL_AGENCIES: Record<string, string> = {
  King: 'lakes@kingcounty.gov',
  _default: 'nwroerts@ecy.wa.gov',
};

const COUNTY_DISCOLORATION_AGENCIES: Record<string, string> = {
  _default: 'nwroerts@ecy.wa.gov',
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
