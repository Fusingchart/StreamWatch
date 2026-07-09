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

// AbortSignal.timeout is not available in Hermes, use AbortController manually
function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

// This EPA layer is a polyline feature layer with no lat/lon attribute fields,
// so beaches are matched by BEACH_NAME rather than by distance.
const EPA_URL =
  'https://watersgeo.epa.gov/arcgis/rest/services/OWPROGRAM/BEACON_NAD83/MapServer/1/query' +
  "?where=STATE_CODE%3D%27WA%27" +
  '&outFields=BEACH_NAME,STATUS,STATUS_DESC,DATE_VALUE,COUNTY_NAME' +
  '&returnGeometry=false&f=json';

// King County's rows.json returns plain arrays, not objects. The first 8 entries
// in every row are Socrata system columns (sid, id, position, timestamps, meta);
// the actual dataset columns start at index 8, verified against the view's
// metadata (https://data.kingcounty.gov/api/views/mbzm-4r9y.json):
//   8 beach, 9 jurisdiction, 10 locator, 11 date, 12 day, 13 time,
//   14 sampleA, 15 sampleB, 16 sampleC, 17 geomean30d, 18 nSamplesHigh30d,
//   19 highToday, 20 waterTempC, 21 waterTempF
const KC_COL = {
  beach: 8, date: 11, geomean30d: 17, highToday: 19,
} as const;

const KING_COUNTY_URL =
  'https://data.kingcounty.gov/api/views/mbzm-4r9y/rows.json?$limit=3000';

interface EpaFeature {
  BEACH_NAME: string;
  STATUS: number | string;
  STATUS_DESC: string;
  DATE_VALUE: number;
  COUNTY_NAME: string;
}

interface KcRow {
  beach: string;
  date: string | null;
  geomean30d: number | null;
  highToday: boolean | null;
}

async function fetchEpaBeaches(): Promise<EpaFeature[]> {
  try {
    const res = await fetchWithTimeout(EPA_URL, 10000);
    if (!res.ok) {
      console.warn('[BeachSafety] EPA fetch failed:', res.status, res.statusText);
      return [];
    }
    const json = await res.json();
    if (json.error) {
      console.warn('[BeachSafety] EPA API error:', JSON.stringify(json.error));
      return [];
    }
    const features: EpaFeature[] = (json.features ?? []).map((f: any) => f.attributes ?? f);
    console.log('[BeachSafety] EPA: got', features.length, 'WA features');
    return features;
  } catch (e: any) {
    console.warn('[BeachSafety] EPA fetch error:', e.message);
    return [];
  }
}

async function fetchKingCountyBeaches(): Promise<KcRow[]> {
  try {
    const res = await fetchWithTimeout(KING_COUNTY_URL, 10000);
    if (!res.ok) {
      console.warn('[BeachSafety] KC fetch failed:', res.status, res.statusText);
      return [];
    }
    const json = await res.json();
    const raw: any[][] = json.data ?? [];
    console.log('[BeachSafety] KC: got', raw.length, 'raw rows');

    // Keep only the most recent row per beach
    const latestByBeach = new Map<string, KcRow>();
    for (const row of raw) {
      const beach = row[KC_COL.beach];
      if (!beach) continue;
      const date = row[KC_COL.date];
      const existing = latestByBeach.get(beach);
      if (!existing || (date && (!existing.date || date > existing.date))) {
        latestByBeach.set(beach, {
          beach,
          date: date ?? null,
          geomean30d: row[KC_COL.geomean30d] != null ? Number(row[KC_COL.geomean30d]) : null,
          highToday: row[KC_COL.highToday] === true || row[KC_COL.highToday] === 'true',
        });
      }
    }
    return [...latestByBeach.values()];
  } catch (e: any) {
    console.warn('[BeachSafety] KC fetch error:', e.message);
    return [];
  }
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

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function epaStatusToLevel(status: number | string): SafetyLevel {
  const s = Number(status);
  if (s === 0) return 'SAFE';
  if (s === 1) return 'CAUTION';
  if (s === 2) return 'AVOID';
  return 'UNKNOWN'; // e.g. 3 = Inactive monitoring site
}

function kcRowToLevel(row: KcRow): SafetyLevel {
  if (row.highToday) return 'AVOID';
  if (row.geomean30d != null) {
    // WA DOH freshwater beach action threshold: 126 CFU/100mL geometric mean
    if (row.geomean30d > 126) return 'CAUTION';
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
  const titles = [...new Set(nearby.map((s) =>
    s.pollutionClass.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  ))];

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

    if (spot.type === 'saltwater' && spot.epaBeachName && epaData.length > 0) {
      const target = normalize(spot.epaBeachName);
      const match =
        epaData.find((f) => normalize(f.BEACH_NAME) === target) ??
        epaData.find((f) => normalize(f.BEACH_NAME).includes(target) || target.includes(normalize(f.BEACH_NAME)));

      if (match) {
        baseLevel = epaStatusToLevel(match.STATUS);
        officialStatus = match.STATUS_DESC || (baseLevel === 'SAFE' ? 'No advisory in effect' : baseLevel);
        officialSource = 'EPA BEACON';
        lastUpdated = match.DATE_VALUE ? new Date(match.DATE_VALUE).toISOString() : null;
        console.log(`[BeachSafety] ${spot.name} matched EPA: "${match.BEACH_NAME}"`);
      } else {
        console.log(`[BeachSafety] ${spot.name}: no EPA match for "${spot.epaBeachName}"`);
      }
    }

    if (spot.type === 'freshwater' && spot.kingCountyLocator && kcData.length > 0) {
      const target = normalize(spot.kingCountyLocator);
      const match = kcData.find((r) => normalize(r.beach) === target);

      if (match) {
        baseLevel = kcRowToLevel(match);
        officialStatus =
          match.highToday ? 'Elevated bacteria levels, avoid contact'
          : baseLevel === 'CAUTION' ? 'Bacteria trending above action level'
          : baseLevel === 'SAFE' ? 'No advisory'
          : null;
        officialSource = 'King County Environmental Health';
        lastUpdated = match.date;
        bacteriaCount = match.geomean30d;
        console.log(`[BeachSafety] ${spot.name} matched KC: "${match.beach}"`);
      } else {
        console.log(`[BeachSafety] ${spot.name}: no KC match for "${spot.kingCountyLocator}"`);
      }
    }

    const { level, nearbyHighReports, nearbyReportTitles } = overlayStreamWatch(baseLevel, spot, sightings);

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
