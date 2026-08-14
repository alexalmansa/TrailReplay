import type { LandmarkType, NearbyPlacesCoverage } from '@/types/landmarks';
import type { AppState } from '@/store/storeTypes';
import type { AppSliceCreator } from './types';

type LandmarksSlice = Pick<AppState,
  'userLandmarks' | 'enabledLandmarkGroups' |
  'showAutomaticLandmarks' |
  'enrichedLandmarks' | 'nearbyPlacesEnabled' | 'nearbyPlacesLoading' | 'nearbyPlacesError' | 'nearbyPlacesCoverage' |
  'addLandmark' | 'updateLandmark' | 'removeLandmark' | 'setEnabledLandmarkGroups' |
  'setNearbyPlacesEnabled' | 'setEnrichedLandmarks' | 'setNearbyPlacesStatus' | 'setShowAutomaticLandmarks'>;

export const createLandmarksSlice: AppSliceCreator<LandmarksSlice> = (set) => ({
  userLandmarks: [],
  showAutomaticLandmarks: false,
  enabledLandmarkGroups: [],
  enrichedLandmarks: [],
  nearbyPlacesEnabled: true,
  nearbyPlacesLoading: false,
  nearbyPlacesError: null,
  nearbyPlacesCoverage: null,
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
  setNearbyPlacesEnabled: (enabled) => set((state) => { state.nearbyPlacesEnabled = enabled; if (!enabled) { state.enrichedLandmarks = []; state.nearbyPlacesCoverage = null; } }),
  setEnrichedLandmarks: (landmarks) => set((state) => { state.enrichedLandmarks = landmarks; }),
  setNearbyPlacesStatus: (loading, error = null, coverage: NearbyPlacesCoverage | null = null) => set((state) => { state.nearbyPlacesLoading = loading; state.nearbyPlacesError = error; state.nearbyPlacesCoverage = coverage; }),
});
