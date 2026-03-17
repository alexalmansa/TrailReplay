import type { RawTrackPoint } from './trackStats';

export function parseGpxDocument(gpxContent: string, fileName: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(gpxContent, 'text/xml');
  const parseError = document.querySelector('parsererror');

  if (parseError) {
    throw new Error('Invalid GPX file format');
  }

  const name = document.querySelector('trk > name, gpx > name')?.textContent || fileName.replace('.gpx', '');
  const pointElements = Array.from(document.querySelectorAll('trkpt, rtept'));

  if (pointElements.length === 0) {
    throw new Error('No track points found in GPX file');
  }

  const rawPoints: RawTrackPoint[] = pointElements.map((point) => ({
    lat: parseFloat(point.getAttribute('lat') || '0'),
    lon: parseFloat(point.getAttribute('lon') || '0'),
    elevation: parseFloat(point.querySelector('ele')?.textContent || '0'),
    time: point.querySelector('time')?.textContent
      ? new Date(point.querySelector('time')?.textContent || '')
      : null,
    heartRate: parseSensorValue(point, ['hr', 'gpxtpx\\:hr', 'ns3\\:hr', 'ns2\\:hr'], 'int'),
    cadence: parseSensorValue(point, ['cad', 'gpxtpx\\:cad', 'ns3\\:cad'], 'int'),
    power: parseSensorValue(point, ['power'], 'float'),
    temperature: parseSensorValue(point, ['atemp', 'gpxtpx\\:atemp'], 'float'),
  }));

  return { name, rawPoints };
}

function parseSensorValue(
  point: Element,
  selectors: string[],
  parser: 'int' | 'float'
) {
  const element = point.querySelector(selectors.join(', '));
  if (!element?.textContent) return null;

  return parser === 'int'
    ? Number.parseInt(element.textContent, 10)
    : Number.parseFloat(element.textContent);
}
