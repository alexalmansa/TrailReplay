import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '@/store/createAppStore';
import { parseGPX } from '@/utils/gpxParser';
import { downloadReplayArchive, slugifyProjectFileName } from './downloadReplayArchive';

const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrailReplay">
  <trk>
    <name>Ridge Loop</name>
    <trkseg>
      <trkpt lat="42.10000" lon="1.20000"><ele>1000</ele></trkpt>
      <trkpt lat="42.10050" lon="1.20050"><ele>1015</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('slugifyProjectFileName', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyProjectFileName('Pyrenees Traverse 2026')).toBe('pyrenees-traverse-2026');
  });

  it('strips punctuation and collapses repeated separators', () => {
    expect(slugifyProjectFileName('  My  Trip!! -- Take 2  ')).toBe('my-trip-take-2');
  });

  it('falls back to "project" for an empty or fully-stripped name', () => {
    expect(slugifyProjectFileName('   ')).toBe('project');
    expect(slugifyProjectFileName('!!!')).toBe('project');
  });
});

describe('downloadReplayArchive (File System Access unsupported — anchor download fallback)', () => {
  let clickSpy: () => void;

  beforeEach(() => {
    clickSpy = vi.fn(() => undefined);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('names the downloaded file after the journey name', async () => {
    const store = createAppStore();
    const track = parseGPX(sampleGpx, 'ridge-loop.gpx');
    store.getState().addTrack(track);
    store.getState().updateJourneyName('Pyrenees Traverse');

    let capturedAnchor: HTMLAnchorElement | undefined;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        capturedAnchor = element as HTMLAnchorElement;
        vi.spyOn(element, 'click').mockImplementation(clickSpy);
      }
      return element;
    });

    await downloadReplayArchive(store.getState(), 'sidebar');

    expect(capturedAnchor?.download).toBe('pyrenees-traverse.replay');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
