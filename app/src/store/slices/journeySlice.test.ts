import { describe, expect, it } from 'vitest';
import { createAppStore } from '@/store/createAppStore';

describe('journeySlice.updateJourneyName', () => {
  it('renames the current journey', () => {
    const store = createAppStore();
    store.getState().createJourney('My Journey');

    store.getState().updateJourneyName('Pyrenees Traverse');

    expect(store.getState().journey?.name).toBe('Pyrenees Traverse');
  });

  it('is a no-op when there is no journey yet', () => {
    const store = createAppStore();

    store.getState().updateJourneyName('Pyrenees Traverse');

    expect(store.getState().journey).toBeNull();
  });
});
