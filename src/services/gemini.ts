import { File } from 'expo-file-system';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';
import { ClassificationResult, PollutionClass } from '../types';

const CLASSES: PollutionClass[] = [
  'oil_sheen', 'foam_suds', 'discoloration', 'algal_bloom', 'solid_debris', 'clean_water',
];

interface ClassifyResponse {
  pollutionClass: string;
  confidence: number;
}

// Classification runs server-side (functions/src/index.ts: classifyPollution)
// so the Gemini API key never ships inside the app bundle.
export async function classifyImage(photoUri: string): Promise<ClassificationResult> {
  const base64 = await new File(photoUri).base64();

  const functions = getFunctions(app);
  const classifyPollution = httpsCallable<{ imageBase64: string }, ClassifyResponse>(functions, 'classifyPollution');
  const result = await classifyPollution({ imageBase64: base64 });

  const pollutionClass = CLASSES.includes(result.data.pollutionClass as PollutionClass)
    ? (result.data.pollutionClass as PollutionClass)
    : 'clean_water';
  const confidence = typeof result.data.confidence === 'number' ? result.data.confidence : 0.75;

  return {
    pollutionClass,
    confidence,
    allScores: { [pollutionClass]: confidence } as Partial<Record<PollutionClass, number>>,
  };
}
