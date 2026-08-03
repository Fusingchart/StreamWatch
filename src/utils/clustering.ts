// Lightweight grid-based clustering, no native dependency. Groups points
// into cells sized relative to the map's current zoom (region.latitudeDelta)
// so pins that are visually on top of each other collapse into one marker.
export interface MarkerCluster<T> {
  key: string;
  latitude: number;
  longitude: number;
  points: T[];
}

export function clusterPoints<T>(
  points: T[],
  getCoord: (p: T) => { latitude: number; longitude: number },
  cellSizeDeg: number
): MarkerCluster<T>[] {
  const cells = new Map<string, T[]>();
  for (const p of points) {
    const { latitude, longitude } = getCoord(p);
    const cellLat = Math.floor(latitude / cellSizeDeg);
    const cellLng = Math.floor(longitude / cellSizeDeg);
    const key = `${cellLat}:${cellLng}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(p);
    else cells.set(key, [p]);
  }

  return [...cells.entries()].map(([key, pts]) => {
    const latitude = pts.reduce((s, p) => s + getCoord(p).latitude, 0) / pts.length;
    const longitude = pts.reduce((s, p) => s + getCoord(p).longitude, 0) / pts.length;
    return { key, latitude, longitude, points: pts };
  });
}

export function clusterBounds<T>(
  points: T[],
  getCoord: (p: T) => { latitude: number; longitude: number }
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } {
  const lats = points.map((p) => getCoord(p).latitude);
  const lngs = points.map((p) => getCoord(p).longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const PAD = 1.8; // zoom out a bit past the tight bounding box
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * PAD, 0.03),
    longitudeDelta: Math.max((maxLng - minLng) * PAD, 0.03),
  };
}
