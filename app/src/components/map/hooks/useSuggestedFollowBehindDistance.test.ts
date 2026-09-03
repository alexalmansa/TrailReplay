import { describe, expect, it } from 'vitest';
import { shouldApplySuggestedDistance } from './useSuggestedFollowBehindDistance';

describe('suggested distance, applied only while untouched', () => {
  it('suggests for a route it has not seen before', () => {
    expect(shouldApplySuggestedDistance({
      isNewRoute: true, lastSuggestedLevel: null, currentLevel: 33,
    })).toBe(true);
    // Even if a level is already set from the previous route.
    expect(shouldApplySuggestedDistance({
      isNewRoute: true, lastSuggestedLevel: 66, currentLevel: 11,
    })).toBe(true);
  });

  it('re-runs while the level is still the suggested one', () => {
    // This is what corrects the distance once clip length settles: a route
    // mounting can briefly report a placeholder duration, and the suggestion
    // made from it has to be replaceable.
    expect(shouldApplySuggestedDistance({
      isNewRoute: false, lastSuggestedLevel: 11, currentLevel: 11,
    })).toBe(true);
  });

  it('never moves a level the user has changed', () => {
    expect(shouldApplySuggestedDistance({
      isNewRoute: false, lastSuggestedLevel: 11, currentLevel: 66,
    })).toBe(false);
    // Including when they move it back one stop from the suggestion.
    expect(shouldApplySuggestedDistance({
      isNewRoute: false, lastSuggestedLevel: 49.5, currentLevel: 33,
    })).toBe(false);
  });
});
