import { describe, expect, it } from 'vitest';
import {
  LANDMARK_GLYPH_KEYS,
  PINHEAD_PATHS,
  colorForLandmark,
  glyphForLandmark,
  glyphForType,
  isLandmarkGlyph,
} from './landmarkGlyphs';

describe('landmark glyphs', () => {
  it('has path data for every glyph offered in the picker', () => {
    LANDMARK_GLYPH_KEYS.forEach((key) => {
      expect(PINHEAD_PATHS[key]).toBeTruthy();
    });
  });

  it('falls back to the type glyph when the landmark has no icon', () => {
    expect(glyphForLandmark({ type: 'summit', icon: undefined })).toBe('summit');
    expect(glyphForLandmark({ type: 'lake', icon: undefined })).toBe('water');
    expect(glyphForType('custom')).toBe('pin');
  });

  it('lets an explicit icon override the type glyph', () => {
    expect(glyphForLandmark({ type: 'summit', icon: 'camp' })).toBe('camp');
  });

  it('ignores an icon that is not a known glyph', () => {
    expect(glyphForLandmark({ type: 'summit', icon: 'not-a-glyph' })).toBe('summit');
    expect(isLandmarkGlyph('not-a-glyph')).toBe(false);
  });

  it('lets an explicit color override the palette', () => {
    expect(colorForLandmark({ type: 'summit', source: 'user', color: '#123456' })).toBe('#123456');
    expect(colorForLandmark({ type: 'viewpoint', source: 'enriched', color: undefined })).toBe('#3E9DB0');
  });
});
