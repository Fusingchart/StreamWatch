import { ClassificationResult, PollutionClass } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY;
const MODEL_ID = process.env.EXPO_PUBLIC_ROBOFLOW_MODEL_ID; // e.g. "streamwatch/1"
const BASE_URL = 'https://detect.roboflow.com';

export async function classifyImage(photoUri: string): Promise<ClassificationResult> {
  const body = new FormData();
  body.append('file', { uri: photoUri, type: 'image/jpeg', name: 'photo.jpg' } as any);

  const res = await fetch(`${BASE_URL}/${MODEL_ID}?api_key=${API_KEY}`, {
    method: 'POST',
    body,
  });

  if (!res.ok) throw new Error(`Roboflow error ${res.status}`);

  const json = await res.json();

  // YOLOv8 classification response: json.top / json.confidence / json.predictions
  const predictions: Array<{ class: string; confidence: number }> =
    json.predictions ?? [];

  if (predictions.length === 0) {
    return {
      pollutionClass: 'clean_water',
      confidence: 1,
      allScores: { clean_water: 1 },
    };
  }

  const top = predictions[0];
  const allScores = Object.fromEntries(
    predictions.map((p) => [p.class, p.confidence])
  ) as Partial<Record<PollutionClass, number>>;

  return {
    pollutionClass: top.class as PollutionClass,
    confidence: top.confidence,
    allScores,
  };
}
