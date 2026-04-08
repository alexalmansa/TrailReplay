import { describe, expect, it } from 'vitest';
import { normalizePhotoMetadata, readPhotoMetadata } from './photoMetadata';

function createImageFile(name = 'photo.jpg', lastModified = Date.parse('2026-04-07T09:00:00Z')) {
  return new File(['image'], name, { type: 'image/jpeg', lastModified });
}

describe('normalizePhotoMetadata', () => {
  it('extracts direct latitude/longitude and EXIF timestamps', () => {
    const metadata = normalizePhotoMetadata(createImageFile(), {
      latitude: 41.3901,
      longitude: 2.1702,
      DateTimeOriginal: '2026:04:07 10:15:30',
    });

    expect(metadata.latitude).toBe(41.3901);
    expect(metadata.longitude).toBe(2.1702);
    expect(metadata.coordinateSource).toBe('latitudeLongitude');
    expect(metadata.timestampSource).toBe('DateTimeOriginal');
    expect(metadata.timestamp?.getFullYear()).toBe(2026);
    expect(metadata.timestamp?.getMonth()).toBe(3);
    expect(metadata.timestamp?.getDate()).toBe(7);
    expect(metadata.timestamp?.getHours()).toBe(10);
    expect(metadata.timestamp?.getMinutes()).toBe(15);
    expect(metadata.timestamp?.getSeconds()).toBe(30);
  });

  it('extracts DMS coordinates with hemisphere refs', () => {
    const metadata = normalizePhotoMetadata(createImageFile(), {
      GPSLatitude: [41, 23, 24],
      GPSLatitudeRef: 'N',
      GPSLongitude: [2, 10, 12],
      GPSLongitudeRef: 'E',
    });

    expect(metadata.coordinateSource).toBe('gpsLatitudeLongitude');
    expect(metadata.latitude).toBeCloseTo(41.39, 3);
    expect(metadata.longitude).toBeCloseTo(2.17, 3);
  });

  it('extracts nested GPS coordinates from metadata containers', () => {
    const metadata = normalizePhotoMetadata(createImageFile(), {
      exif: {
        GPSLatitude: [41, 23, 24],
        GPSLatitudeRef: 'N',
        GPSLongitude: [2, 10, 12],
        GPSLongitudeRef: 'E',
      },
    });

    expect(metadata.coordinateSource).toBe('gpsLatitudeLongitude');
    expect(metadata.latitude).toBeCloseTo(41.39, 3);
    expect(metadata.longitude).toBeCloseTo(2.17, 3);
  });

  it('extracts coordinates from GPS position strings', () => {
    const metadata = normalizePhotoMetadata(createImageFile(), {
      xmp: {
        GPSPosition: '41.3901, 2.1702',
      },
    });

    expect(metadata.coordinateSource).toBe('gpsLatitudeLongitude');
    expect(metadata.latitude).toBeCloseTo(41.3901, 4);
    expect(metadata.longitude).toBeCloseTo(2.1702, 4);
  });

  it('extracts coordinates from Apple ISO6709 quicktime metadata', () => {
    const metadata = normalizePhotoMetadata(createImageFile('photo.heic'), {
      'com.apple.quicktime.location.ISO6709': '+41.3901+002.1702+015.000/',
    });

    expect(metadata.coordinateSource).toBe('gpsLatitudeLongitude');
    expect(metadata.latitude).toBeCloseTo(41.3901, 4);
    expect(metadata.longitude).toBeCloseTo(2.1702, 4);
  });

  it('extracts coordinates from XMP location shown fields', () => {
    const metadata = normalizePhotoMetadata(createImageFile(), {
      LocationShownGPSLatitude: '41.3901',
      LocationShownGPSLongitude: '2.1702',
    });

    expect(metadata.coordinateSource).toBe('gpsLatitudeLongitude');
    expect(metadata.latitude).toBeCloseTo(41.3901, 4);
    expect(metadata.longitude).toBeCloseTo(2.1702, 4);
  });

  it('builds a timestamp from GPS date and time fields', () => {
    const metadata = normalizePhotoMetadata(createImageFile(), {
      GPSDateStamp: '2026:04:07',
      GPSTimeStamp: ['10', '20', '30'],
    });

    expect(metadata.timestampSource).toBe('GPSDateTime');
    expect(metadata.timestamp?.toISOString()).toBe('2026-04-07T10:20:30.000Z');
  });

  it('falls back to file last modified when no stronger timestamp exists', () => {
    const file = createImageFile('fallback.jpg', Date.parse('2026-04-07T08:45:00Z'));
    const metadata = normalizePhotoMetadata(file, {});

    expect(metadata.timestampSource).toBe('fileLastModified');
    expect(metadata.timestamp?.toISOString()).toBe('2026-04-07T08:45:00.000Z');
  });

  it('falls back to scanning HEIC text for ISO6709 quicktime coordinates', async () => {
    const file = new File(
      ['....location.ISO6709....+41.3901+002.1702+015.000/...'],
      'fallback.heic',
      { type: 'image/heic', lastModified: Date.parse('2026-04-07T08:45:00Z') },
    );

    const metadata = await readPhotoMetadata(file);

    expect(metadata.coordinateSource).toBe('gpsLatitudeLongitude');
    expect(metadata.latitude).toBeCloseTo(41.3901, 4);
    expect(metadata.longitude).toBeCloseTo(2.1702, 4);
  });

  it('falls back to scanning raw GPSLatitude and GPSLongitude text tags', async () => {
    const file = new File(
      ['....GPSLatitudeRef N....GPSLatitude 41 23 24....GPSLongitudeRef E....GPSLongitude 2 10 12....'],
      'fallback.jpg',
      { type: 'image/jpeg', lastModified: Date.parse('2026-04-07T08:45:00Z') },
    );

    const metadata = await readPhotoMetadata(file);

    expect(metadata.coordinateSource).toBe('gpsLatitudeLongitude');
    expect(metadata.latitude).toBeCloseTo(41.39, 3);
    expect(metadata.longitude).toBeCloseTo(2.17, 3);
  });
});
