import { BeachSpot } from '../data/beachSpots';
import { Sighting } from '../types';

export type SafetyLevel = 'SAFE' | 'CAUTION' | 'AVOID' | 'UNKNOWN';

export interface BeachSafetyResult {
  spotId: string;
  level: SafetyLevel;
  officialStatus: string | null;
  officialSource: string | null;
  lastUpdated: string | null;
  bacteriaCount: number | null;
  nearbyHighReports: number;
  nearbyReportTitles: string[];
}

const EPA_URL =
  'https://watersgeo.epa.gov/arcgis/rest/services/OWPROGRAM/BEACON_NAD83/MapServer/1/query' +
  '?where=STATE_CODE%3D%27WA%27' +
  '&outFields=BEACH_NAME%2CSTATUS%2CSTATUS_DESC%2CDATE_VALUE%2CMLOC_LATITUDE%2CMLOC_LONGITUDE' +
  '&returnGeometry=false&f=json';

const KING_COUNTY_URL =
  'https://data.kingcounty.gov/resource/tc7s-d6aj.json' +
  '?$limit=200&$order=date%20DESC';

// Fetch all WA beach advisories from EPA BEACON
async function fetchEpaBeaches(): Promise<EpaFeature[]> {
  try {
    const res = await fetch(EPA_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.features ?? []).map((f: any) => f.attributes ?? f);
  } catch {
    return [];
  }
}

// Fetch King County freshwater bacteria data
async function fetchKingCountyBeaches(): Promise<KcRecord[]> {
  try {
    const res = await fetch(KING_COUNTY_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

interface EpaFeature {
  BEACH_NAME: string;
  STATUS: number | string;
  STATUS_DESC: string;
  DATE_VALUE: string;
  MLOC_LATITUDE: number;
  MLOC_LONGITUDE: number;
}

interface KcRecord {
  beach?: string;
  locator?: string;
  date?: string;
  enterococcus?: string;
  ecoli?: string;
  result?: string;
  action?: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function epaStatusToLevel(status: number | string): SafetyLevel {
  const s = Number(status);
  if (s === 0) return 'SAFE';
  if (s === 1) return 'CAUTION';
  if (s === 2) return 'AVOID';
  return 'UNKNOWN';
}

function kcResultToLevel(record: KcRecord): SafetyLevel {
  const action = (record.action ?? '').toLowerCase();
  if (action.includes('clos') || action.includes('avoid')) return 'AVOID';
  if (action.includes('caution') || action.includes('advisory') || action.includes('warn')) return 'CAUTION';

  // Fall back to bacteria count if action field is missing
  const count = parseFloat(record.enterococcus ?? record.ecoli ?? '');
  if (!isNaN(count)) {
    if (count > 276) return 'AVOID';   // EPA single-sample limit
    if (count > 104) return 'CAUTION';
    return 'SAFE';
  }
  return 'UNKNOWN';
}

function overlayStreamWatch(
  base: SafetyLevel,
  spot: BeachSpot,
  sightings: Sighting[]
): { level: SafetyLevel; nearbyHighReports: number; nearbyReportTitles: string[] } {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const nearby = sightings.filter((s) => {
    if (s.resolved) return false;
    if (s.severity === 'NONE') return false;
    const age = s.reportedAt instanceof Date ? s.reportedAt.getTime() : 0;
    if (age < sevenDaysAgo) return false;
    return haversineKm(spot.latitude, spot.longitude, s.latitude, s.longitude) <= 3;
  });

  const highNearby = nearby.filter((s) => s.severity === 'HIGH');
  const titles = nearby.map((s) =>
    s.pollutionClass.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );

  let level = base;
  if (highNearby.length > 0) {
    level = level === 'SAFE' ? 'CAUTION' : 'AVOID';
  } else if (nearby.length > 0 && level === 'SAFE') {
    level = 'CAUTION';
  }

  return { level, nearbyHighReports: highNearby.length, nearbyReportTitles: titles };
}

export async function fetchAllBeachSafety(
  spots: BeachSpot[],
  sightings: Sighting[]
): Promise<BeachSafetyResult[]> {
  const [epaData, kcData] = await Promise.all([fetchEpaBeaches(), fetchKingCountyBeaches()]);

  return spots.map((spot): BeachSafetyResult => {
    let officialStatus: string | null = null;
    let officialSource: string | null = null;
    let lastUpdated: string | null = null;
    let bacteriaCount: number | null = null;
    let baseLevel: SafetyLevel = 'UNKNOWN';

    if (spot.type === 'saltwater' && epaData.length > 0) {
      // Match by name similarity or proximity (within 5km)
      const match = epaData.find((f) => {
        const nameSim =
          spot.epaBeachName &&
          f.BEACH_NAME?.toLowerCase().includes(spot.epaBeachName.toLowerCase().split(' ')[0]);
        const proximate =
          f.MLOC_LATITUDE &&
          haversineKm(spot.latitude, spot.longitude, f.MLOC_LATITUDE, f.MLOC_LONGITUDE) < 5;
        return nameSim || proximate;
      });

      if (match) {
        baseLevel = epaStatusToLevel(match.STATUS);
        officialStatus = match.STATUS_DESC || (baseLevel === 'SAFE' ? 'No advisory' : baseLevel);
        officialSource = 'EPA BEACON';
        lastUpdated = match.DATE_VALUE ?? null;
      }
    }

    if (spot.type === 'freshwater' && kcData.length > 0) {
      const locator = spot.kingCountyLocator?.toLowerCase();
      const match = kcData.find((r) =>
        locator
          ? (r.locator ?? r.beach ?? '').toLowerCase().includes(locator.split(' ')[0])
          : (r.beach ?? '').toLowerCase().includes(spot.waterBody.toLowerCase().split(' ')[0])
      );

      if (match) {
        baseLevel = kcResultToLevel(match);
        officialStatus = match.action || match.result || (baseLevel === 'SAFE' ? 'No advisory' : baseLevel);
        officialSource = 'King County Environmental Health';
        lastUpdated = match.date ?? null;
        const raw = parseFloat(match.enterococcus ?? match.ecoli ?? '');
        if (!isNaN(raw)) bacteriaCount = raw;
      }
    }

    const { level, nearbyHighReports, nearbyReportTitles } = overlayStreamWatch(
      baseLevel,
      spot,
      sightings
    );

    return {
      spotId: spot.id,
      level,
      officialStatus,
      officialSource,
      lastUpdated,
      bacteriaCount,
      nearbyHighReports,
      nearbyReportTitles,
    };
  });
}
