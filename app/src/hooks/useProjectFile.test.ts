import { describe, expect, it } from 'vitest';
import { isReplayFile } from './useProjectFile';

describe('isReplayFile', () => {
  it('recognizes .replay files case-insensitively', () => {
    expect(isReplayFile(new File(['x'], 'my-journey.replay'))).toBe(true);
    expect(isReplayFile(new File(['x'], 'MY-JOURNEY.REPLAY'))).toBe(true);
  });

  it('rejects gpx, kml, and other extensions', () => {
    expect(isReplayFile(new File(['x'], 'route.gpx'))).toBe(false);
    expect(isReplayFile(new File(['x'], 'route.kml'))).toBe(false);
    expect(isReplayFile(new File(['x'], 'not-a-replay.zip'))).toBe(false);
    expect(isReplayFile(new File(['x'], 'noextension'))).toBe(false);
  });
});
