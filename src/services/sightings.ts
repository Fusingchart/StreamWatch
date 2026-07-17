import {
  collection,
  addDoc,
  doc,
  updateDoc,
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
  // XHR creates a native RN Blob (not from ArrayBuffer) which Firebase can
  // use directly via xhr.send(blob) without triggering the Hermes restriction.
  const blob: Blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Could not read photo file'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri);
    xhr.send();
  });

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

  const docRef = await addDoc(collection(db, SIGHTINGS), {
    ...params,
    agencyEmailed,
    hidden: false,
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    reportedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function markResolved(sightingId: string): Promise<void> {
  await updateDoc(doc(db, SIGHTINGS, sightingId), {
    resolved: true,
    resolvedAt: serverTimestamp(),
    resolvedBy: 'community',
  });
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
    const sightings: Sighting[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...(data as Omit<Sighting, 'id'>),
        reportedAt: data.reportedAt?.toDate() ?? new Date(),
        resolvedAt: data.resolvedAt?.toDate() ?? null,
        resolved: data.resolved ?? false,
        resolvedBy: data.resolvedBy ?? null,
      };
    });
    onUpdate(sightings);
  });
}
