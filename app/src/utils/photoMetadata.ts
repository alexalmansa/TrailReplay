import exifr from 'exifr';

export type PhotoTimestampSource =
  | 'DateTimeOriginal'
  | 'CreateDate'
  | 'MediaCreateDate'
  | 'DateTimeDigitized'
  | 'ModifyDate'
  | 'GPSDateTime'
  | 'fileLastModified';

export type PhotoCoordinateSource =
  | 'latitudeLongitude'
  | 'gpsLatitudeLongitude'
  | 'yandexGps';

export interface NormalizedPhotoMetadata {
  latitude?: number;
  longitude?: number;
  coordinateSource?: PhotoCoordinateSource;
  timestamp?: Date;
  timestampSource?: PhotoTimestampSource;
}

type MetadataRecord = Record<string, unknown>;

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (typeof value === 'object' && value !== null) {
    const numerator = (value as { numerator?: unknown }).numerator;
    const denominator = (value as { denominator?: unknown }).denominator;
    const parsedNumerator = toFiniteNumber(numerator);
    const parsedDenominator = toFiniteNumber(denominator);
    if (parsedNumerator !== undefined && parsedDenominator !== undefined && parsedDenominator !== 0) {
      return parsedNumerator / parsedDenominator;
    }
  }

  return undefined;
}

function toDegrees(value: unknown, ref: unknown): number | undefined {
  const direct = toFiniteNumber(value);
  if (direct !== undefined) {
    return applyCoordinateRef(direct, ref);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => toFiniteNumber(entry))
      .filter((entry): entry is number => entry !== undefined);

    if (parts.length > 0) {
      const degrees = parts[0] + (parts[1] ?? 0) / 60 + (parts[2] ?? 0) / 3600;
      return applyCoordinateRef(degrees, ref);
    }
  }

  return undefined;
}

function applyCoordinateRef(value: number, ref: unknown): number {
  if (typeof ref !== 'string') {
    return value;
  }

  const normalized = ref.trim().toUpperCase();
  if (normalized === 'S' || normalized === 'W') {
    return -Math.abs(value);
  }
  if (normalized === 'N' || normalized === 'E') {
    return Math.abs(value);
  }

  return value;
}

function parseDateCandidate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const exifNormalized = trimmed.replace(
    /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}:\d{2}:\d{2})(?:\.\d+)?$/,
    '$1-$2-$3T$4',
  );
  const exifParsed = new Date(exifNormalized);
  if (!Number.isNaN(exifParsed.getTime())) {
    return exifParsed;
  }

  return undefined;
}

function parseGpsTimestamp(dateStamp: unknown, timeStamp: unknown): Date | undefined {
  let normalizedDate: string | undefined;

  if (typeof dateStamp === 'string' && dateStamp.trim()) {
    normalizedDate = dateStamp.trim().replace(/^(\d{4}):(\d{2}):(\d{2})$/, '$1-$2-$3');
  }

  if (!normalizedDate) {
    return undefined;
  }

  let normalizedTime: string | undefined;
  if (typeof timeStamp === 'string' && timeStamp.trim()) {
    normalizedTime = timeStamp.trim();
  } else if (Array.isArray(timeStamp)) {
    const parts = timeStamp
      .map((entry) => toFiniteNumber(entry))
      .filter((entry): entry is number => entry !== undefined)
      .map((entry, index) => {
        const value = index === 2 ? Math.floor(entry) : entry;
        return String(Math.max(0, Math.floor(value))).padStart(2, '0');
      });
    if (parts.length >= 2) {
      normalizedTime = [parts[0], parts[1], parts[2] ?? '00'].join(':');
    }
  }

  if (!normalizedTime) {
    return undefined;
  }

  const parsed = new Date(`${normalizedDate}T${normalizedTime}`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function extractCoordinates(metadata: MetadataRecord): Pick<NormalizedPhotoMetadata, 'latitude' | 'longitude' | 'coordinateSource'> {
  const directLatitude = toFiniteNumber(metadata.latitude);
  const directLongitude = toFiniteNumber(metadata.longitude);
  if (directLatitude !== undefined && directLongitude !== undefined) {
    return {
      latitude: directLatitude,
      longitude: directLongitude,
      coordinateSource: 'latitudeLongitude',
    };
  }

  const gpsLatitude = toDegrees(metadata.GPSLatitude, metadata.GPSLatitudeRef);
  const gpsLongitude = toDegrees(metadata.GPSLongitude, metadata.GPSLongitudeRef);
  if (gpsLatitude !== undefined && gpsLongitude !== undefined) {
    return {
      latitude: gpsLatitude,
      longitude: gpsLongitude,
      coordinateSource: 'gpsLatitudeLongitude',
    };
  }

  const yandexLatitude = toFiniteNumber(metadata.GPSDestLatitude);
  const yandexLongitude = toFiniteNumber(metadata.GPSDestLongitude);
  if (yandexLatitude !== undefined && yandexLongitude !== undefined) {
    return {
      latitude: yandexLatitude,
      longitude: yandexLongitude,
      coordinateSource: 'yandexGps',
    };
  }

  return {};
}

function extractTimestamp(
  file: File,
  metadata: MetadataRecord,
): Pick<NormalizedPhotoMetadata, 'timestamp' | 'timestampSource'> {
  const candidates: Array<{ source: PhotoTimestampSource; value: unknown }> = [
    { source: 'DateTimeOriginal', value: metadata.DateTimeOriginal },
    { source: 'CreateDate', value: metadata.CreateDate },
    { source: 'MediaCreateDate', value: metadata.MediaCreateDate },
    { source: 'DateTimeDigitized', value: metadata.DateTimeDigitized },
    { source: 'ModifyDate', value: metadata.ModifyDate },
  ];

  for (const candidate of candidates) {
    const parsed = parseDateCandidate(candidate.value);
    if (parsed) {
      return {
        timestamp: parsed,
        timestampSource: candidate.source,
      };
    }
  }

  const gpsDateTime = parseGpsTimestamp(metadata.GPSDateStamp, metadata.GPSTimeStamp);
  if (gpsDateTime) {
    return {
      timestamp: gpsDateTime,
      timestampSource: 'GPSDateTime',
    };
  }

  if (file.lastModified > 0) {
    const lastModified = new Date(file.lastModified);
    if (!Number.isNaN(lastModified.getTime())) {
      return {
        timestamp: lastModified,
        timestampSource: 'fileLastModified',
      };
    }
  }

  return {};
}

export function normalizePhotoMetadata(file: File, rawMetadata: unknown): NormalizedPhotoMetadata {
  const metadata = (rawMetadata && typeof rawMetadata === 'object' ? rawMetadata : {}) as MetadataRecord;

  return {
    ...extractCoordinates(metadata),
    ...extractTimestamp(file, metadata),
  };
}

export async function readPhotoMetadata(file: File): Promise<NormalizedPhotoMetadata> {
  try {
    const metadata = await exifr.parse(file, ['gps', 'exif', 'ifd0', 'xmp', 'quicktime']);
    return normalizePhotoMetadata(file, metadata);
  } catch (error) {
    console.warn('Failed to extract photo metadata:', error);
    return normalizePhotoMetadata(file, null);
  }
}
