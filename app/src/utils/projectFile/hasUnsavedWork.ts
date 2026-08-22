import type { AppState } from '@/store/storeTypes';

export function hasUnsavedProjectContent(state: Pick<AppState, 'tracks' | 'pictures' | 'journey'>): boolean {
  return state.tracks.length > 0 || state.pictures.length > 0 || state.journey !== null;
}
