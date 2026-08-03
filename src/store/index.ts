import { create } from 'zustand';
import { Sighting, ClassificationResult } from '../types';

interface AppState {
  userId: string | null;
  authError: string | null;
  sightings: Sighting[];
  sightingsLoaded: boolean;
  pendingResult: ClassificationResult | null;
  pendingPhotoUri: string | null;

  setUserId: (id: string) => void;
  setAuthError: (message: string | null) => void;
  setSightings: (sightings: Sighting[]) => void;
  addSighting: (sighting: Sighting) => void;
  setPendingResult: (result: ClassificationResult | null, photoUri: string | null) => void;
  clearPending: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  userId: null,
  authError: null,
  sightings: [],
  sightingsLoaded: false,
  pendingResult: null,
  pendingPhotoUri: null,

  setUserId: (id) => set({ userId: id, authError: null }),
  setAuthError: (message) => set({ authError: message }),
  setSightings: (sightings) => set({ sightings, sightingsLoaded: true }),
  addSighting: (sighting) =>
    set((state) => ({ sightings: [sighting, ...state.sightings] })),
  setPendingResult: (result, photoUri) =>
    set({ pendingResult: result, pendingPhotoUri: photoUri }),
  clearPending: () => set({ pendingResult: null, pendingPhotoUri: null }),
}));
