import { ClassificationResult, PollutionClass } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY;
const MODEL_ID = process.env.EXPO_PUBLIC_ROBOFLOW_MODEL_ID;
const BASE_URL = 'https://detect.roboflow.com';

// Mock result used when Roboflow isn't configured yet
function mockClassify(): ClassificationResult {
  const classes: PollutionClass[] = ['oil_sheen', 'foam_suds', 'algal_bloom', 'discoloration', 'solid_debris', 'clean_water'];
  const pollutionClass = classes[Math.floor(Math.random() * classes.length)];
  const confidence = 0.7 + Math.random() * 0.25;
  return {
    pollutionClass,
    confidence,
    allScores: { [pollutionClass]: confidence } as Partial<Record<PollutionClass, number>>,
  };
}

export async function classifyImage(photoUri: string): Promise<ClassificationResult> {
  if (!API_KEY || !MODEL_ID) {
    console.warn('[Roboflow] API key or model ID not configured — returning mock result');
    return mockClassify();
  }

  // React Native new arch requires a real Blob; the old { uri, type, name } object is not supported.
  const fileResponse = await fetch(photoUri);
  const blob = await fileResponse.blob();

  const body = new FormData();
  body.append('file', blob, 'photo.jpg');

  const res = await fetch(`${BASE_URL}/${MODEL_ID}?api_key=${API_KEY}`, {
    method: 'POST',
    body,
  });

  if (!res.ok) throw new Error(`Roboflow error ${res.status}`);

  const json = await res.json();

  const predictions: Array<{ class: string; confidence: number }> =
    json.predictions ?? [];

  if (predictions.length === 0) {
    return { pollutionClass: 'clean_water', confidence: 1, allScores: { clean_water: 1 } };
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
