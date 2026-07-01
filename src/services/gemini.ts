import { File } from 'expo-file-system';
import { ClassificationResult, PollutionClass } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const CLASSES: PollutionClass[] = [
  'oil_sheen', 'foam_suds', 'discoloration', 'algal_bloom', 'solid_debris', 'clean_water',
];

const PROMPT = `You are a water pollution classifier for a citizen-science app. Look at this photo of a waterway (river, lake, or shoreline) and classify it into exactly one of these categories:

- oil_sheen: a rainbow/iridescent film or sheen on the water surface, or visible oil slicks
- foam_suds: unnatural white or gray foam/suds on the water surface (not natural wave foam)
- discoloration: water that is abnormally colored (murky brown, gray, milky, or unnatural tint) beyond normal sediment
- algal_bloom: green, blue-green, or reddish algae mats/scum on the surface
- solid_debris: visible trash, litter, or solid waste in or floating on the water
- clean_water: normal, clear water with no signs of pollution

Respond with ONLY a JSON object, no markdown formatting, no explanation, in this exact shape:
{"pollutionClass": "<one of the categories above>", "confidence": <number 0 to 1>, "reasoning": "<one short sentence>"}`;

function mockClassify(): ClassificationResult {
  const pollutionClass = CLASSES[Math.floor(Math.random() * CLASSES.length)];
  const confidence = 0.7 + Math.random() * 0.25;
  return {
    pollutionClass,
    confidence,
    allScores: { [pollutionClass]: confidence } as Partial<Record<PollutionClass, number>>,
  };
}

function extractJson(text: string): { pollutionClass: string; confidence: number } {
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

export async function classifyImage(photoUri: string): Promise<ClassificationResult> {
  if (!API_KEY) {
    console.warn('[Gemini] API key not configured — returning mock result');
    return mockClassify();
  }

  const base64 = await new File(photoUri).base64();

  const res = await fetch(`${BASE_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: 'image/jpeg', data: base64 } },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 200 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const text: string | undefined = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no classification text');

  const parsed = extractJson(text);
  const pollutionClass = CLASSES.includes(parsed.pollutionClass as PollutionClass)
    ? (parsed.pollutionClass as PollutionClass)
    : 'clean_water';
  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.75;

  return {
    pollutionClass,
    confidence,
    allScores: { [pollutionClass]: confidence } as Partial<Record<PollutionClass, number>>,
  };
}
