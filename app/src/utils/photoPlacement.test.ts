import { describe, expect, it } from 'vitest';
import { resolvePhotoPlacement } from './photoPlacement';

function createImageFile(name = 'photo.jpg') {
  return new File(['image'], name, { type: 'image/jpeg' });
}

describe('resolvePhotoPlacement', () => {
  it('queues manual placement when GPS metadata and timestamp are missing', () => {
    const result = resolvePhotoPlacement({
      id: 'photo-1',
      file: createImageFile(),
      url: 'blob:test',
      metadata: {},
      gpsRouteMatch: null,
      timestampPlacement: null,
      timestampFailureReason: 'missing-timestamp',
      fallbackProgress: 0.4,
    });

    expect(result.kind).toBe('pending');
    if (result.kind === 'pending') {
      expect(result.pendingPlacement.placementReason).toBe('missing-gps');
    }
  });

  it('queues manual placement when the nearest route point is too far away and timestamp cannot help', () => {
    const result = resolvePhotoPlacement({
      id: 'photo-2',
      file: createImageFile(),
      url: 'blob:test',
      metadata: {
        latitude: 41.39,
        longitude: 2.17,
      },
      gpsRouteMatch: { lat: 41.4, lon: 2.18, progress: 0.2, distanceMeters: 600 },
      timestampPlacement: null,
      timestampFailureReason: 'missing-timestamp',
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
      metadata: {
        latitude: 41.39,
        longitude: 2.17,
      },
      gpsRouteMatch: { lat: 41.391, lon: 2.171, progress: 0.65, distanceMeters: 40 },
      timestampPlacement: null,
      timestampFailureReason: 'missing-timestamp',
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

  it('creates a timestamp-placed picture when GPS is missing', () => {
    const timestamp = new Date('2026-04-07T10:15:00Z');
    const result = resolvePhotoPlacement({
      id: 'photo-4',
      file: createImageFile(),
      url: 'blob:test',
      timestamp,
      metadata: {
        timestamp,
      },
      gpsRouteMatch: null,
      timestampPlacement: { lat: 41.392, lon: 2.172, progress: 0.35 },
      timestampFailureReason: null,
      fallbackProgress: 0.1,
    });

    expect(result.kind).toBe('picture');
    if (result.kind === 'picture') {
      expect(result.picture.placementSource).toBe('timestamp');
      expect(result.picture.progress).toBe(0.35);
      expect(result.picture.timestamp).toEqual(timestamp);
    }
  });

  it('lets timestamp placement rescue a GPS route mismatch', () => {
    const result = resolvePhotoPlacement({
      id: 'photo-5',
      file: createImageFile(),
      url: 'blob:test',
      metadata: {
        latitude: 41.39,
        longitude: 2.17,
        timestamp: new Date('2026-04-07T10:30:00Z'),
      },
      gpsRouteMatch: { lat: 41.4, lon: 2.18, progress: 0.2, distanceMeters: 600 },
      timestampPlacement: { lat: 41.395, lon: 2.175, progress: 0.48 },
      timestampFailureReason: null,
      fallbackProgress: 0.1,
    });

    expect(result.kind).toBe('picture');
    if (result.kind === 'picture') {
      expect(result.picture.placementSource).toBe('timestamp');
      expect(result.picture.progress).toBe(0.48);
    }
  });

  it('surfaces the no-timed-route reason when timestamp fallback is unavailable', () => {
    const result = resolvePhotoPlacement({
      id: 'photo-6',
      file: createImageFile(),
      url: 'blob:test',
      metadata: {
        timestamp: new Date('2026-04-07T10:30:00Z'),
      },
      gpsRouteMatch: null,
      timestampPlacement: null,
      timestampFailureReason: 'no-timed-route',
      fallbackProgress: 0.1,
    });

    expect(result.kind).toBe('pending');
    if (result.kind === 'pending') {
      expect(result.pendingPlacement.placementReason).toBe('no-timed-route');
    }
  });
});
