import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { createAppStore } from '@/store/createAppStore';
import { parseGPX } from '@/utils/gpxParser';
import { buildReplayArchive } from './buildReplayArchive';
import { parseReplayArchive } from './parseReplayArchive';
import { ReplayArchiveError } from './validation';
import { MAX_ARCHIVE_SIZE_BYTES } from './types';

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

async function buildSampleArchive() {
  const store = createAppStore();
  const track = parseGPX(sampleGpx, 'ridge-loop.gpx');
  store.getState().addTrack(track);
  const blob = await buildReplayArchive(store.getState());
  return { blob, track };
}

function blobToFile(blob: Blob, name = 'project.replay') {
  return new File([blob], name, { type: 'application/zip' });
}

describe('parseReplayArchive', () => {
  it('round-trips a real archive built by buildReplayArchive', async () => {
    const { blob, track } = await buildSampleArchive();

    const parsed = await parseReplayArchive(blobToFile(blob));

    expect(parsed.manifest.formatVersion).toBe(1);
    expect(parsed.tracks).toHaveLength(1);
    expect(parsed.tracks[0].meta.id).toBe(track.id);
    expect(parsed.tracks[0].gpxText).toContain('Ridge Loop');
  });

  it('rejects an oversized file before attempting to unzip', async () => {
    const oversized = new File([new Uint8Array(1)], 'huge.replay');
    Object.defineProperty(oversized, 'size', { value: MAX_ARCHIVE_SIZE_BYTES + 1 });

    await expect(parseReplayArchive(oversized)).rejects.toMatchObject({
      code: 'too-large',
    } satisfies Partial<ReplayArchiveError>);
  });

  it('rejects corrupt zip bytes', async () => {
    const corrupt = new File([new Uint8Array([1, 2, 3, 4])], 'corrupt.replay');

    await expect(parseReplayArchive(corrupt)).rejects.toMatchObject({ code: 'corrupt' });
  });

  it('rejects an archive missing manifest.json', async () => {
    const zipped = zipSync({ 'project.json': strToU8('{}') });
    const file = blobToFile(new Blob([zipped as BlobPart]));

    await expect(parseReplayArchive(file)).rejects.toMatchObject({ code: 'corrupt' });
  });

  it('rejects an unsupported format version', async () => {
    const zipped = zipSync({
      'manifest.json': strToU8(JSON.stringify({ formatVersion: 999 })),
      'project.json': strToU8(JSON.stringify({ formatVersion: 999, tracks: [], comparisonTracks: [] })),
    });
    const file = blobToFile(new Blob([zipped as BlobPart]));

    await expect(parseReplayArchive(file)).rejects.toMatchObject({ code: 'unsupported-version' });
  });

  it('rejects a project.json referencing a missing route file', async () => {
    const zipped = zipSync({
      'manifest.json': strToU8(JSON.stringify({
        formatVersion: 1, appVersion: '0.0.0', projectName: 'x', createdAt: '', savedAt: '',
        trackCount: 1, pictureCount: 0, videoCount: 0,
      })),
      'project.json': strToU8(JSON.stringify({
        formatVersion: 1,
        tracks: [{ id: 't1', name: 'Missing', activityIcon: '', color: '#fff', visible: true, routeFile: 'routes/missing.gpx' }],
        comparisonTracks: [],
      })),
    });
    const file = blobToFile(new Blob([zipped as BlobPart]));

    await expect(parseReplayArchive(file)).rejects.toMatchObject({ code: 'missing-asset' });
  });
});
