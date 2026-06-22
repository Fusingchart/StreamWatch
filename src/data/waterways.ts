import { Sighting } from '../types';

export interface Waterway {
  id: string;
  name: string;
  shortName: string;
  centerLat: number;
  centerLng: number;
  // Approximate region — sightings within this box are assigned here
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

export interface WaterwayHealth {
  waterway: Waterway;
  score: number;          // 0–100
  trend: 'improving' | 'declining' | 'stable';
  trendDelta: number;     // score change vs prior 14-day window
  sightingCount: number;
  lastReportedAt: Date | null;
}

export const WATERWAYS: Waterway[] = [
  {
    id: 'snohomish',
    name: 'Snohomish River',
    shortName: 'Snohomish R.',
    centerLat: 47.935, centerLng: -122.050,
    bounds: { minLat: 47.80, maxLat: 48.00, minLng: -122.25, maxLng: -121.75 },
  },
  {
    id: 'stillaguamish',
    name: 'Stillaguamish River',
    shortName: 'Stillaguamish R.',
    centerLat: 48.175, centerLng: -122.100,
    bounds: { minLat: 48.05, maxLat: 48.30, minLng: -122.45, maxLng: -121.75 },
  },
  {
    id: 'pilchuck',
    name: 'Pilchuck River',
    shortName: 'Pilchuck R.',
    centerLat: 48.010, centerLng: -122.070,
    bounds: { minLat: 47.95, maxLat: 48.10, minLng: -122.20, maxLng: -121.90 },
  },
  {
    id: 'wallace',
    name: 'Wallace River',
    shortName: 'Wallace R.',
    centerLat: 47.865, centerLng: -121.720,
    bounds: { minLat: 47.82, maxLat: 47.92, minLng: -121.85, maxLng: -121.60 },
  },
  {
    id: 'sultan',
    name: 'Sultan River',
    shortName: 'Sultan R.',
    centerLat: 47.870, centerLng: -121.810,
    bounds: { minLat: 47.82, maxLat: 47.93, minLng: -121.98, maxLng: -121.60 },
  },
  {
    id: 'skykomish',
    name: 'Skykomish River',
    shortName: 'Skykomish R.',
    centerLat: 47.855, centerLng: -121.970,
    bounds: { minLat: 47.80, maxLat: 47.92, minLng: -122.10, maxLng: -121.70 },
  },
  {
    id: 'sammamish',
    name: 'Sammamish River',
    shortName: 'Sammamish R.',
    centerLat: 47.770, centerLng: -122.175,
    bounds: { minLat: 47.70, maxLat: 47.83, minLng: -122.30, maxLng: -122.05 },
  },
  {
    id: 'lake_stevens',
    name: 'Lake Stevens',
    shortName: 'Lake Stevens',
    centerLat: 48.012, centerLng: -122.063,
    bounds: { minLat: 47.98, maxLat: 48.05, minLng: -122.12, maxLng: -122.00 },
  },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function assignWaterway(lat: number, lng: number): Waterway | null {
  // Prefer waterways whose bounding box contains the point, pick closest centroid
  const candidates = WATERWAYS.filter(
    (w) =>
      lat >= w.bounds.minLat && lat <= w.bounds.maxLat &&
      lng >= w.bounds.minLng && lng <= w.bounds.maxLng
  );
  const pool = candidates.length > 0 ? candidates : WATERWAYS;
  return pool.reduce<Waterway | null>((best, w) => {
    const d = haversineKm(lat, lng, w.centerLat, w.centerLng);
    if (!best) return w;
    const bestD = haversineKm(lat, lng, best.centerLat, best.centerLng);
    return d < bestD ? w : best;
  }, null);
}

const SEV_PENALTY = { HIGH: 15, MEDIUM: 8, NONE: -2 } as const;

function scoreWindow(sightings: Sighting[], nowMs: number, windowDays: number): number {
  const cutoff = nowMs - windowDays * 86_400_000;
  let score = 100;
  for (const s of sightings) {
    const age = nowMs - new Date(s.reportedAt).getTime();
    if (age > windowDays * 86_400_000) continue;
    // Exponential decay: full weight at age=0, half weight at windowDays/2
    const decay = Math.exp(-age / (cutoff * 0.5));
    const penalty = SEV_PENALTY[s.severity] * decay;
    score -= penalty;
  }
  return Math.max(0, Math.min(100, score));
}

export function computeWaterwayHealth(sightings: Sighting[]): WaterwayHealth[] {
  const now = Date.now();

  // Group sightings by waterway
  const bywaterway = new Map<string, Sighting[]>();
  for (const w of WATERWAYS) bywaterway.set(w.id, []);

  for (const s of sightings) {
    const w = assignWaterway(s.latitude, s.longitude);
    if (w) bywaterway.get(w.id)?.push(s);
  }

  return WATERWAYS.map((w) => {
    const ws = bywaterway.get(w.id) ?? [];
    const currentScore = scoreWindow(ws, now, 30);
    const priorScore = scoreWindow(
      ws.filter((s) => {
        const age = now - new Date(s.reportedAt).getTime();
        return age > 14 * 86_400_000; // only sightings older than 14 days
      }),
      now - 14 * 86_400_000,
      30
    );
    const delta = currentScore - priorScore;
    const trend =
      Math.abs(delta) < 3 ? 'stable' :
      delta > 0 ? 'improving' : 'declining';

    const sorted = [...ws].sort(
      (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
    );

    return {
      waterway: w,
      score: Math.round(currentScore),
      trend,
      trendDelta: Math.round(Math.abs(delta)),
      sightingCount: ws.length,
      lastReportedAt: sorted[0] ? new Date(sorted[0].reportedAt) : null,
    };
  }).sort((a, b) => a.score - b.score); // worst first — most urgent at top
}
