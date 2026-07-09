export type POIType = 'beach' | 'salmon_habitat' | 'water_intake' | 'park' | 'shellfish' | 'marine';

export interface DownstreamPOI {
  id: string;
  name: string;
  type: POIType;
  waterway: string;
  latitude: number;
  longitude: number;
  description: string;
}

export interface DownstreamHit extends DownstreamPOI {
  distanceKm: number;
}

export const POI_META: Record<POIType, { emoji: string; label: string; color: string }> = {
  beach:          { emoji: '🏖',  label: 'Swim Beach',         color: '#0A84FF' },
  salmon_habitat: { emoji: '🐟',  label: 'Salmon Habitat',     color: '#30D158' },
  water_intake:   { emoji: '🚰',  label: 'Drinking Water',     color: '#64D2FF' },
  park:           { emoji: '🌿',  label: 'Recreation Park',    color: '#30D158' },
  shellfish:      { emoji: '🦪',  label: 'Shellfish Beds',     color: '#FF9F0A' },
  marine:         { emoji: '🌊',  label: 'Marine Habitat',     color: '#0A84FF' },
};

// Real WA-01 downstream points of interest.
// "Downstream" in this watershed = generally westward toward Puget Sound.
const POIS: DownstreamPOI[] = [
  // Snohomish River corridor
  {
    id: 'snohomish_riverfront',
    name: 'Snohomish Riverfront Trail',
    type: 'park',
    waterway: 'Snohomish River',
    latitude: 47.9133, longitude: -122.1106,
    description: 'Popular multi-use trail and boat launch along the lower Snohomish',
  },
  {
    id: 'langus_park',
    name: 'Langus Riverfront Park',
    type: 'park',
    waterway: 'Snohomish River',
    latitude: 47.9621, longitude: -122.1847,
    description: 'City park with wetland habitat and non-motorized boat launch',
  },
  {
    id: 'snohomish_estuary',
    name: 'Snohomish River Estuary',
    type: 'salmon_habitat',
    waterway: 'Snohomish River',
    latitude: 47.9720, longitude: -122.2100,
    description: 'ESA-listed Chinook salmon estuary, one of Puget Sound\'s largest remaining marshes',
  },
  {
    id: 'jetty_island',
    name: 'Jetty Island Beach',
    type: 'beach',
    waterway: 'Port Gardner Bay',
    latitude: 47.9822, longitude: -122.2344,
    description: 'Free summer ferry beach serving ~30,000 visitors per season',
  },
  {
    id: 'possession_sound',
    name: 'Possession Sound Critical Habitat',
    type: 'marine',
    waterway: 'Puget Sound',
    latitude: 47.9400, longitude: -122.3200,
    description: 'Federally designated critical habitat for Southern Resident Killer Whales',
  },

  // Sultan River / Everett water supply
  {
    id: 'sultan_intake',
    name: 'Everett Water Supply (Sultan River)',
    type: 'water_intake',
    waterway: 'Sultan River',
    latitude: 47.8705, longitude: -121.6481,
    description: 'Spada Lake reservoir, primary drinking water for 750,000+ Snohomish County residents',
  },

  // Wallace River
  {
    id: 'wallace_hatchery',
    name: 'Wallace River Salmon Hatchery',
    type: 'salmon_habitat',
    waterway: 'Wallace River',
    latitude: 47.8686, longitude: -121.7139,
    description: 'WDFW hatchery releasing ~500,000 Chinook smolts annually',
  },

  // Pilchuck River
  {
    id: 'pilchuck_salmon',
    name: 'Pilchuck River Salmon Corridor',
    type: 'salmon_habitat',
    waterway: 'Pilchuck River',
    latitude: 48.0175, longitude: -122.0394,
    description: 'Recovered Coho and Chinook spawning grounds after 2019 culvert replacement',
  },

  // Stillaguamish River corridor
  {
    id: 'stillaguamish_salmon',
    name: 'Stillaguamish River Salmon Habitat',
    type: 'salmon_habitat',
    waterway: 'Stillaguamish River',
    latitude: 48.1833, longitude: -121.9667,
    description: 'Threatened bull trout and ESA-listed Chinook spawning corridor',
  },
  {
    id: 'port_susan',
    name: 'Port Susan Bay Shellfish Beds',
    type: 'shellfish',
    waterway: 'Stillaguamish River / Port Susan',
    latitude: 48.1661, longitude: -122.3394,
    description: 'Active commercial and tribal shellfish growing area, closures trigger at 14 cfu/100mL',
  },
  {
    id: 'kayak_point',
    name: 'Kayak Point Regional Park',
    type: 'beach',
    waterway: 'Puget Sound',
    latitude: 48.1378, longitude: -122.3623,
    description: 'County beach park, 2,500 average daily visitors in summer',
  },

  // Tulalip
  {
    id: 'tulalip_shellfish',
    name: 'Tulalip Bay Shellfish Beds',
    type: 'shellfish',
    waterway: 'Puget Sound',
    latitude: 48.0667, longitude: -122.2833,
    description: 'Tulalip Tribes treaty-protected harvesting area, shellfish closures affect tribal food sovereignty',
  },

  // Mukilteo
  {
    id: 'mukilteo_beach',
    name: 'Mukilteo State Park Beach',
    type: 'beach',
    waterway: 'Puget Sound',
    latitude: 47.9497, longitude: -122.3041,
    description: 'Popular swimming, fishing, and scuba beach, 100,000+ annual visitors',
  },

  // Sammamish River corridor (south WA-01)
  {
    id: 'sammamish_salmon',
    name: 'Sammamish River Chinook Corridor',
    type: 'salmon_habitat',
    waterway: 'Sammamish River',
    latitude: 47.7619, longitude: -122.1650,
    description: 'Restored urban salmon corridor through Redmond/Bothell, active recovery project',
  },
  {
    id: 'blyth_park',
    name: 'Blyth Park',
    type: 'park',
    waterway: 'Sammamish River',
    latitude: 47.7792, longitude: -122.2036,
    description: 'Riverside park on the Sammamish River Trail with kayak launch',
  },
  {
    id: 'log_boom_park',
    name: 'Log Boom Park',
    type: 'park',
    waterway: 'Lake Washington / Sammamish River',
    latitude: 47.7558, longitude: -122.2150,
    description: 'Swimming beach and boat launch at the Sammamish River mouth on Lake Washington',
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

export function getDownstreamImpacts(latitude: number, longitude: number): DownstreamHit[] {
  return POIS
    .filter((poi) => poi.longitude <= longitude + 0.08) // west = downstream in WA-01
    .map((poi) => ({
      ...poi,
      distanceKm: haversineKm(latitude, longitude, poi.latitude, poi.longitude),
    }))
    .filter((hit) => hit.distanceKm <= 100)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);
}
