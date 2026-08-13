import type { RawTrackPoint } from './trackStats';

export function parseGpxDocument(gpxContent: string, fileName: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(gpxContent, 'text/xml');
  const parseError = document.querySelector('parsererror');

  if (parseError) {
    throw new Error('Invalid GPX file format');
  }

  const name = document.querySelector('trk > name, gpx > name')?.textContent || getFileStem(fileName);
  const pointElements = Array.from(document.querySelectorAll('trkpt, rtept'));

  if (pointElements.length === 0) {
    throw new Error('No track points found in GPX file');
  }

  const rawPoints = pointElements.flatMap((point): RawTrackPoint[] => {
    const lat = Number.parseFloat(point.getAttribute('lat') || '');
    const lon = Number.parseFloat(point.getAttribute('lon') || '');

    if (!isValidCoordinate(lat, lon)) return [];

    return [{
      lat,
      lon,
      elevation: parseFiniteNumber(point.querySelector('ele')?.textContent, 0),
      time: parseTimestamp(point.querySelector('time')?.textContent),
      heartRate: parseSensorValue(point, ['hr', 'gpxtpx\\:hr', 'ns3\\:hr', 'ns2\\:hr'], 'int'),
      cadence: parseSensorValue(point, ['cad', 'gpxtpx\\:cad', 'ns3\\:cad'], 'int'),
      power: parseSensorValue(point, ['power'], 'float'),
      temperature: parseSensorValue(point, ['atemp', 'gpxtpx\\:atemp'], 'float'),
    }];
  });

  if (rawPoints.length < 2) {
    throw new Error('A GPX route needs at least two valid track points');
  }

  return { name, rawPoints };
}

function getFileStem(fileName: string): string {
  return fileName.replace(/\.gpx$/i, '');
}

function isValidCoordinate(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function parseFiniteNumber(value: string | null | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value || '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseSensorValue(
  point: Element,
  selectors: string[],
  parser: 'int' | 'float'
) {
  const element = point.querySelector(selectors.join(', '));
  if (!element?.textContent) return null;

  const value = parser === 'int'
    ? Number.parseInt(element.textContent, 10)
    : Number.parseFloat(element.textContent);

  return Number.isFinite(value) ? value : null;
}
