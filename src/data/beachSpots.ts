export type BeachType = 'saltwater' | 'freshwater';

export interface BeachSpot {
  id: string;
  name: string;
  type: BeachType;
  latitude: number;
  longitude: number;
  county: string;
  waterBody: string;
  epaBeachName?: string;
  kingCountyLocator?: string;
}

export const BEACH_SPOTS: BeachSpot[] = [
  // Saltwater — Puget Sound
  {
    id: 'mukilteo',
    name: 'Mukilteo State Park',
    type: 'saltwater',
    latitude: 47.9478,
    longitude: -122.3062,
    county: 'Snohomish',
    waterBody: 'Puget Sound',
    epaBeachName: 'Mukilteo State Park',
  },
  {
    id: 'kayak-point',
    name: 'Kayak Point County Park',
    type: 'saltwater',
    latitude: 48.1329,
    longitude: -122.3608,
    county: 'Snohomish',
    waterBody: 'Port Susan',
    epaBeachName: 'Kayak Point',
  },
  {
    id: 'meadowdale',
    name: 'Meadowdale Beach Park',
    type: 'saltwater',
    latitude: 47.8657,
    longitude: -122.3284,
    county: 'Snohomish',
    waterBody: 'Puget Sound',
    epaBeachName: 'Meadowdale Beach',
  },
  {
    id: 'camano-island',
    name: 'Camano Island State Park',
    type: 'saltwater',
    latitude: 48.1205,
    longitude: -122.5115,
    county: 'Island',
    waterBody: 'Saratoga Passage',
    epaBeachName: 'Camano Island State Park',
  },
  {
    id: 'brackett-landing',
    name: "Brackett's Landing (Edmonds)",
    type: 'saltwater',
    latitude: 47.8119,
    longitude: -122.3847,
    county: 'Snohomish',
    waterBody: 'Puget Sound',
    epaBeachName: 'Brackett Landing',
  },
  // Freshwater — Lakes
  {
    id: 'lake-sammamish',
    name: 'Lake Sammamish State Park',
    type: 'freshwater',
    latitude: 47.5643,
    longitude: -122.0657,
    county: 'King',
    waterBody: 'Lake Sammamish',
    kingCountyLocator: 'LAKE SAMMAMISH STATE PARK',
  },
  {
    id: 'lake-stevens',
    name: 'Lake Stevens (North Beach)',
    type: 'freshwater',
    latitude: 48.0138,
    longitude: -122.0607,
    county: 'Snohomish',
    waterBody: 'Lake Stevens',
  },
  {
    id: 'silver-lake',
    name: 'Silver Lake Park',
    type: 'freshwater',
    latitude: 47.9096,
    longitude: -122.1743,
    county: 'Snohomish',
    waterBody: 'Silver Lake',
  },
];

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

export function sortByDistance(
  spots: BeachSpot[],
  userLat: number,
  userLng: number
): (BeachSpot & { distanceKm: number })[] {
  return spots
    .map((s) => ({ ...s, distanceKm: haversineKm(userLat, userLng, s.latitude, s.longitude) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
