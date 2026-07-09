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
  // Saltwater, Puget Sound
  {
    id: 'mukilteo',
    name: 'Mukilteo State Park',
    type: 'saltwater',
    latitude: 47.9478,
    longitude: -122.3062,
    county: 'Snohomish',
    waterBody: 'Puget Sound',
    epaBeachName: 'Mukilteo Community Beach',
  },
  {
    id: 'kayak-point',
    name: 'Kayak Point County Park',
    type: 'saltwater',
    latitude: 48.1329,
    longitude: -122.3608,
    county: 'Snohomish',
    waterBody: 'Port Susan',
    epaBeachName: 'Kayak Point County Park',
  },
  {
    id: 'meadowdale',
    name: 'Meadowdale Beach Park',
    type: 'saltwater',
    latitude: 47.8657,
    longitude: -122.3284,
    county: 'Snohomish',
    waterBody: 'Puget Sound',
    epaBeachName: 'Meadowdale County Park',
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
    epaBeachName: "Brackett's Landing & Edmonds Underwater Park",
  },
  // Freshwater, King County lakes (all within WA-01: Kirkland/Redmond/Sammamish)
  {
    id: 'lake-sammamish',
    name: 'Lake Sammamish State Park',
    type: 'freshwater',
    latitude: 47.5643,
    longitude: -122.0657,
    county: 'King',
    waterBody: 'Lake Sammamish',
    kingCountyLocator: 'Lake Sammamish State Park',
  },
  {
    id: 'juanita-beach',
    name: 'Juanita Beach Park',
    type: 'freshwater',
    latitude: 47.7052,
    longitude: -122.2156,
    county: 'King',
    waterBody: 'Lake Washington',
    kingCountyLocator: 'Juanita',
  },
  {
    id: 'houghton-beach',
    name: 'Houghton Beach Park',
    type: 'freshwater',
    latitude: 47.6604,
    longitude: -122.2069,
    county: 'King',
    waterBody: 'Lake Washington',
    kingCountyLocator: 'Houghton',
  },
  {
    id: 'idylwood-beach',
    name: 'Idylwood Park',
    type: 'freshwater',
    latitude: 47.6425,
    longitude: -122.1029,
    county: 'King',
    waterBody: 'Lake Sammamish',
    kingCountyLocator: 'Idylwood',
  },
  {
    id: 'pine-lake',
    name: 'Pine Lake Park',
    type: 'freshwater',
    latitude: 47.5875,
    longitude: -122.0383,
    county: 'King',
    waterBody: 'Pine Lake',
    kingCountyLocator: 'Pine Lake',
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
