import type { LandmarkType } from '@/types/landmarks';
import type { AppState } from '@/store/storeTypes';
import type { AppSliceCreator } from './types';

type LandmarksSlice = Pick<AppState,
  'userLandmarks' | 'enabledLandmarkGroups' |
  'showAutomaticLandmarks' |
  'enrichedLandmarks' | 'nearbyPlacesEnabled' | 'nearbyPlacesLoading' | 'nearbyPlacesError' |
  'addLandmark' | 'updateLandmark' | 'removeLandmark' | 'setEnabledLandmarkGroups' |
  'setNearbyPlacesEnabled' | 'setEnrichedLandmarks' | 'setNearbyPlacesStatus' | 'setShowAutomaticLandmarks'>;

export const createLandmarksSlice: AppSliceCreator<LandmarksSlice> = (set) => ({
  userLandmarks: [],
  showAutomaticLandmarks: false,
  enabledLandmarkGroups: [],
  enrichedLandmarks: [],
  nearbyPlacesEnabled: false,
  nearbyPlacesLoading: false,
  nearbyPlacesError: null,
  addLandmark: (landmark) => set((state) => { state.userLandmarks.push(landmark); }),
  updateLandmark: (id, updates) => set((state) => {
    const landmark = state.userLandmarks.find((entry) => entry.id === id);
    if (landmark) Object.assign(landmark, updates);
  }),
  removeLandmark: (id) => set((state) => {
    state.userLandmarks = state.userLandmarks.filter((entry) => entry.id !== id);
  }),
  setShowAutomaticLandmarks: (showAutomaticLandmarks) => set((state) => { state.showAutomaticLandmarks = showAutomaticLandmarks; }),
  setEnabledLandmarkGroups: (groups: LandmarkType[]) => set((state) => { state.enabledLandmarkGroups = groups; }),
  setNearbyPlacesEnabled: (enabled) => set((state) => { state.nearbyPlacesEnabled = enabled; if (!enabled) state.enrichedLandmarks = []; }),
  setEnrichedLandmarks: (landmarks) => set((state) => { state.enrichedLandmarks = landmarks; }),
  setNearbyPlacesStatus: (loading, error = null) => set((state) => { state.nearbyPlacesLoading = loading; state.nearbyPlacesError = error; }),
});
