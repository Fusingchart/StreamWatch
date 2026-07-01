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

// AbortSignal.timeout is not available in Hermes — use AbortController manually
function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Bounding box covers WA-01: Snohomish + north King County + Island County
const EPA_BBOX = encodeURIComponent(
  JSON.stringify({ xmin: -123.5, ymin: 47.4, xmax: -121.3, ymax: 48.7 })
);
const EPA_URL =
  'https://watersgeo.epa.gov/arcgis/rest/services/OWPROGRAM/BEACON_NAD83/MapServer/1/query' +
  `?where=1%3D1&geometry=${EPA_BBOX}` +
  '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects' +
  '&outFields=BEACH_NAME,STATUS,STATUS_DESC,DATE_VALUE,MLOC_LATITUDE,MLOC_LONGITUDE' +
  '&returnGeometry=false&f=json';

// King County swim beach bacteria — /api/views/ path works without an app token
const KING_COUNTY_URL =
  'https://data.kingcounty.gov/api/views/mbzm-4r9y/rows.json?$limit=200';

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
    const features = (json.features ?? []).map((f: any) => f.attributes ?? f);
    console.log('[BeachSafety] EPA: got', features.length, 'features');
    if (features.length > 0) console.log('[BeachSafety] EPA sample:', JSON.stringify(features[0]));
    return features;
  } catch (e: any) {
    console.warn('[BeachSafety] EPA fetch error:', e.message);
    return [];
  }
}

async function fetchKingCountyBeaches(): Promise<KcRecord[]> {
  try {
    const res = await fetchWithTimeout(KING_COUNTY_URL, 10000);
    if (!res.ok) {
      console.warn('[BeachSafety] KC fetch failed:', res.status, res.statusText);
      return [];
    }
    const json = await res.json();
    const records = Array.isArray(json) ? json : (json.data ?? []);
    console.log('[BeachSafety] KC: got', records.length, 'records');
    if (records.length > 0) console.log('[BeachSafety] KC sample:', JSON.stringify(records[0]));
    return records;
  } catch (e: any) {
    console.warn('[BeachSafety] KC fetch error:', e.message);
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
  [key: string]: any;
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
  if (action.includes('open') || action.includes('safe') || action.includes('no action')) return 'SAFE';
  const count = parseFloat(record.enterococcus ?? record.ecoli ?? '');
  if (!isNaN(count)) {
    if (count > 276) return 'AVOID';
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

    if (spot.type === 'saltwater' && epaData.length > 0) {
      // Match by proximity (10km) first, then by name as tiebreaker
      const candidates = epaData
        .filter((f) => f.MLOC_LATITUDE && f.MLOC_LONGITUDE)
        .map((f) => ({
          f,
          dist: haversineKm(spot.latitude, spot.longitude, f.MLOC_LATITUDE, f.MLOC_LONGITUDE),
        }))
        .filter(({ dist }) => dist < 10)
        .sort((a, b) => a.dist - b.dist);

      const match = candidates[0]?.f;
      if (match) {
        baseLevel = epaStatusToLevel(match.STATUS);
        officialStatus = match.STATUS_DESC || (baseLevel === 'SAFE' ? 'No advisory in effect' : baseLevel);
        officialSource = 'EPA BEACON';
        lastUpdated = match.DATE_VALUE ?? null;
        console.log(`[BeachSafety] ${spot.name} matched EPA: "${match.BEACH_NAME}" (${candidates[0].dist.toFixed(1)}km)`);
      } else {
        console.log(`[BeachSafety] ${spot.name}: no EPA match within 10km`);
      }
    }

    if (spot.type === 'freshwater' && kcData.length > 0) {
      const nameKey = (spot.kingCountyLocator ?? spot.waterBody).toLowerCase().split(' ')[0];
      const match = kcData.find((r) => {
        const beachName = (r.beach ?? r.locator ?? '').toLowerCase();
        return beachName.includes(nameKey);
      });
      if (match) {
        baseLevel = kcResultToLevel(match);
        officialStatus = match.action || match.result || (baseLevel === 'SAFE' ? 'No advisory' : baseLevel);
        officialSource = 'King County Environmental Health';
        lastUpdated = match.date ?? null;
        const raw = parseFloat(match.enterococcus ?? match.ecoli ?? '');
        if (!isNaN(raw)) bacteriaCount = raw;
        console.log(`[BeachSafety] ${spot.name} matched KC: "${match.beach ?? match.locator}"`);
      } else {
        console.log(`[BeachSafety] ${spot.name}: no KC match for key "${nameKey}"`);
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
