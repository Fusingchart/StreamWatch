import * as Location from 'expo-location';

export async function getCounty(lat: number, lng: number): Promise<string> {
  if (lat === 0 && lng === 0) return 'Unknown';
  try {
    const [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    return result?.subregion ?? result?.region ?? 'Unknown';
  } catch {
    return 'Unknown';
  }
}
