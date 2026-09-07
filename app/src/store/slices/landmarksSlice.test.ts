import { describe, expect, it } from 'vitest';
import { createAppStore } from '@/store/createAppStore';
import { createUserLandmark } from '@/utils/createUserLandmark';
import type { RouteLandmark } from '@/types/landmarks';

function derivedLandmark(overrides: Partial<RouteLandmark> = {}): RouteLandmark {
  return {
    id: 'osm-123',
    type: 'summit',
    source: 'enriched',
    display: 'subtle',
    lat: 42,
    lon: 1,
    progress: 0.4,
    title: 'Puig Alt',
    importance: 3,
    ...overrides,
  };
}

describe('landmark editing', () => {
  it('adopts a derived landmark into the user list and hides the original', () => {
    const store = createAppStore();
    const landmark = derivedLandmark();

    store.getState().adoptLandmark(landmark);

    const state = store.getState();
    expect(state.userLandmarks).toHaveLength(1);
    expect(state.userLandmarks[0]).toMatchObject({ id: 'osm-123', source: 'user' });
    expect(state.hiddenLandmarkIds).toContain('osm-123');
    expect(state.selectedLandmarkId).toBe('osm-123');
  });

  it('does not duplicate a landmark adopted twice', () => {
    const store = createAppStore();
    const landmark = derivedLandmark();

    store.getState().adoptLandmark(landmark);
    store.getState().updateLandmark('osm-123', { title: 'Renamed' });
    store.getState().adoptLandmark(landmark);

    expect(store.getState().userLandmarks).toHaveLength(1);
    expect(store.getState().userLandmarks[0].title).toBe('Renamed');
  });

  it('keeps an adopted landmark removed once deleted, rather than resurrecting the original', () => {
    const store = createAppStore();
    store.getState().adoptLandmark(derivedLandmark());

    store.getState().removeLandmark('osm-123');

    expect(store.getState().userLandmarks).toHaveLength(0);
    expect(store.getState().hiddenLandmarkIds).toContain('osm-123');
  });

  it('hides a derived landmark without adopting it', () => {
    const store = createAppStore();

    store.getState().hideLandmark('osm-456');

    expect(store.getState().hiddenLandmarkIds).toEqual(['osm-456']);
    expect(store.getState().userLandmarks).toHaveLength(0);
  });

  it('leaves nothing to restore after deleting a hand-placed landmark', () => {
    const store = createAppStore();
    const landmark = createUserLandmark({ lat: 42, lon: 1, progress: 0.2 });
    store.getState().addLandmark(landmark);

    store.getState().removeLandmark(landmark.id);

    expect(store.getState().userLandmarks).toHaveLength(0);
    expect(store.getState().hiddenLandmarkIds).toEqual([]);
  });

  it('clears the selection when the selected landmark goes away', () => {
    const store = createAppStore();
    const landmark = createUserLandmark({ lat: 42, lon: 1, progress: 0.2 });
    store.getState().addLandmark(landmark);
    store.getState().selectLandmark(landmark.id);

    store.getState().removeLandmark(landmark.id);

    expect(store.getState().selectedLandmarkId).toBeNull();
  });

  it('restores every hidden derived landmark at once', () => {
    const store = createAppStore();
    store.getState().hideLandmark('osm-1');
    store.getState().hideLandmark('osm-2');

    store.getState().restoreHiddenLandmarks();

    expect(store.getState().hiddenLandmarkIds).toEqual([]);
  });

  it('drops the selection when placement is armed, so the click adds instead of edits', () => {
    const store = createAppStore();
    store.getState().selectLandmark('osm-9');

    store.getState().setIsPlacingLandmark(true);

    expect(store.getState().selectedLandmarkId).toBeNull();
    expect(store.getState().isPlacingLandmark).toBe(true);
  });
});
