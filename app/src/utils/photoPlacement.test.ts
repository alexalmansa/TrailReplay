import { describe, expect, it } from 'vitest';
import { resolvePhotoPlacement } from './photoPlacement';

function createImageFile(name = 'photo.jpg') {
  return new File(['image'], name, { type: 'image/jpeg' });
}

describe('resolvePhotoPlacement', () => {
  it('queues manual placement when GPS metadata is missing', () => {
    const result = resolvePhotoPlacement({
      id: 'photo-1',
      file: createImageFile(),
      url: 'blob:test',
      exifData: null,
      routeMatch: null,
      fallbackProgress: 0.4,
    });

    expect(result.kind).toBe('pending');
    if (result.kind === 'pending') {
      expect(result.pendingPlacement.placementReason).toBe('missing-gps');
    }
  });

  it('queues manual placement when the nearest route point is too far away', () => {
    const result = resolvePhotoPlacement({
      id: 'photo-2',
      file: createImageFile(),
      url: 'blob:test',
      exifData: { latitude: 41.39, longitude: 2.17 },
      routeMatch: { lat: 41.4, lon: 2.18, progress: 0.2, distanceMeters: 600 },
      fallbackProgress: 0,
    });

    expect(result.kind).toBe('pending');
    if (result.kind === 'pending') {
      expect(result.pendingPlacement.placementReason).toBe('route-mismatch');
      expect(result.pendingPlacement.mismatchDistanceMeters).toBe(600);
    }
  });

  it('creates a GPS-placed picture when the match is valid', () => {
    const result = resolvePhotoPlacement({
      id: 'photo-3',
      file: createImageFile(),
      url: 'blob:test',
      exifData: { latitude: 41.39, longitude: 2.17 },
      routeMatch: { lat: 41.391, lon: 2.171, progress: 0.65, distanceMeters: 40 },
      fallbackProgress: 0.1,
    });

    expect(result.kind).toBe('picture');
    if (result.kind === 'picture') {
      expect(result.picture.placementSource).toBe('gps');
      expect(result.picture.progress).toBe(0.65);
      expect(result.picture.lat).toBe(41.391);
      expect(result.picture.lon).toBe(2.171);
    }
  });
});
