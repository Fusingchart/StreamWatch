import { Directory, File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { classifyImage } from './gemini';
import { uploadPhoto, submitSighting } from './sightings';
import { getCounty } from '../utils/geocode';
import { getSeverity } from '../utils/routing';
import { Sighting } from '../types';

const QUEUE_KEY = 'streamwatch_pending_reports';

export interface QueuedReport {
  id: string;
  photoPath: string;
  latitude: number;
  longitude: number;
  createdAt: number;
}

function pendingDir(): Directory {
  const dir = new Directory(Paths.document, 'pending-reports');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

async function readQueue(): Promise<QueuedReport[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeQueue(queue: QueuedReport[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueuedReports(): Promise<QueuedReport[]> {
  return readQueue();
}

// Copies the photo out of the camera's temp cache into permanent storage
// (the cache can be cleared by the OS at any time) and remembers it for
// later retry. Used when classification or location fails, most commonly
// because the device has no signal.
export async function enqueueReport(
  photoUri: string,
  latitude: number,
  longitude: number
): Promise<void> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const dest = new File(pendingDir(), `${id}.jpg`);
  await new File(photoUri).copy(dest);

  const queue = await readQueue();
  queue.push({ id, photoPath: dest.uri, latitude, longitude, createdAt: Date.now() });
  await writeQueue(queue);
}

async function removeFromQueue(id: string): Promise<void> {
  const queue = await readQueue();
  const entry = queue.find((q) => q.id === id);
  await writeQueue(queue.filter((q) => q.id !== id));
  if (entry) {
    try {
      new File(entry.photoPath).delete();
    } catch {
      // best-effort cleanup
    }
  }
}

// Attempts to submit every queued report. Stops at the first failure so we
// don't hammer the network with N failing requests when still offline,
// the next trigger (app foreground, screen focus) will pick up where it left off.
export async function flushQueue(
  userId: string,
  onSubmitted?: (sighting: Sighting) => void
): Promise<void> {
  const queue = await readQueue();

  for (const entry of queue) {
    try {
      const classification = await classifyImage(entry.photoPath);
      const severity = getSeverity(classification.pollutionClass);

      const [photoUrl, county] = await Promise.all([
        uploadPhoto(entry.photoPath, userId),
        getCounty(entry.latitude, entry.longitude),
      ]);

      const id = await submitSighting({
        userId,
        pollutionClass: classification.pollutionClass,
        severity,
        confidence: classification.confidence,
        latitude: entry.latitude,
        longitude: entry.longitude,
        county,
        photoUrl,
      });

      onSubmitted?.({
        id, userId, pollutionClass: classification.pollutionClass,
        severity, confidence: classification.confidence,
        latitude: entry.latitude, longitude: entry.longitude, county, photoUrl,
        reportedAt: new Date(), agencyEmailed: null, hidden: false,
        resolved: false, resolvedAt: null, resolvedBy: null,
      });

      await removeFromQueue(entry.id);
    } catch {
      // Still offline (or another transient failure). Leave it queued and
      // stop for now rather than retrying the rest immediately.
      return;
    }
  }
}
