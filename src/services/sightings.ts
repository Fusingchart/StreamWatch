import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Sighting, PollutionClass, Severity } from '../types';
import { resolveAgency } from '../utils/routing';

const SIGHTINGS = 'sightings';

export async function uploadPhoto(uri: string, userId: string): Promise<string> {
  const resp = await fetch(uri);
  const blob = await resp.blob();
  const storageRef = ref(storage, `sightings/${userId}/${Date.now()}.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function submitSighting(params: {
  userId: string;
  pollutionClass: PollutionClass;
  severity: Severity;
  confidence: number;
  latitude: number;
  longitude: number;
  county: string;
  photoUrl: string;
}): Promise<string> {
  const agencyEmailed = resolveAgency(
    params.pollutionClass,
    params.county,
    params.confidence
  );

  const doc = await addDoc(collection(db, SIGHTINGS), {
    ...params,
    agencyEmailed,
    hidden: false,
    reportedAt: serverTimestamp(),
  });

  return doc.id;
}

export function subscribeSightings(
  onUpdate: (sightings: Sighting[]) => void
): Unsubscribe {
  const q = query(
    collection(db, SIGHTINGS),
    where('hidden', '==', false),
    orderBy('reportedAt', 'desc')
  );

  return onSnapshot(q, (snap) => {
    const sightings: Sighting[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Sighting, 'id'>),
      reportedAt: d.data().reportedAt?.toDate() ?? new Date(),
    }));
    onUpdate(sightings);
  });
}
