import { create } from 'zustand';
import { Sighting, ClassificationResult } from '../types';

interface AppState {
  userId: string | null;
  sightings: Sighting[];
  pendingResult: ClassificationResult | null;
  pendingPhotoUri: string | null;

  setUserId: (id: string) => void;
  setSightings: (sightings: Sighting[]) => void;
  addSighting: (sighting: Sighting) => void;
  setPendingResult: (result: ClassificationResult | null, photoUri: string | null) => void;
  clearPending: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  userId: null,
  sightings: [],
  pendingResult: null,
  pendingPhotoUri: null,

  setUserId: (id) => set({ userId: id }),
  setSightings: (sightings) => set({ sightings }),
  addSighting: (sighting) =>
    set((state) => ({ sightings: [sighting, ...state.sightings] })),
  setPendingResult: (result, photoUri) =>
    set({ pendingResult: result, pendingPhotoUri: photoUri }),
  clearPending: () => set({ pendingResult: null, pendingPhotoUri: null }),
}));
