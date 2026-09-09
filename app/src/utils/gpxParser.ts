import type { GPXTrack } from '@/types';
import { interpolateTrackPoint } from '@/utils/gpx/interpolateTrackPoint';
import { parseGpxDocument } from '@/utils/gpx/parseGpxDocument';
import { parseKmlDocument } from '@/utils/gpx/parseKmlDocument';
import { buildTrackFromRawPoints } from '@/utils/gpx/trackStats';
import { serializeTrackToGpx } from '@/utils/gpx/serializeTrackToGpx';

export { serializeTrackToGpx };

// Parse GPX XML content
export function parseGPX(gpxContent: string, fileName: string): GPXTrack {
  const { name, rawPoints } = parseGpxDocument(gpxContent, fileName);

  return buildTrackFromRawPoints({
    idPrefix: 'track',
    name,
    rawPoints,
  });
}

// Parse KML XML content
export function parseKML(kmlContent: string, fileName: string): GPXTrack {
  const { name, rawPoints } = parseKmlDocument(kmlContent, fileName);

  return buildTrackFromRawPoints({
    idPrefix: 'kml',
    name,
    rawPoints,
  });
}

// Parse multiple GPX/KML files
/**
 * Parsed tracks paired with the file each came from. A recipe names its routes
 * by file name, so that pairing has to survive parsing — a file that fails to
 * parse must not shift the ones after it onto the wrong names.
 */
export async function parseRouteFiles(files: File[]): Promise<Array<{ track: GPXTrack; fileName: string }>> {
  const parsed: Array<{ track: GPXTrack; fileName: string }> = [];

  for (const file of files) {
    const extension = getSupportedRouteFileExtension(file.name);
    const isGPX = extension === 'gpx';
    const isKML = extension === 'kml';

    if (!isGPX && !isKML) continue;

    try {
      const content = await file.text();
      const track = isGPX
        ? parseGPX(content, file.name)
        : parseKML(content, file.name);
      parsed.push({ track, fileName: file.name });
    } catch (error) {
      console.error(`Error parsing ${file.name}:`, error);
    }
  }

  return parsed;
}

export async function parseGPXFiles(files: File[]): Promise<GPXTrack[]> {
  return (await parseRouteFiles(files)).map((entry) => entry.track);
}

function getSupportedRouteFileExtension(fileName: string): 'gpx' | 'kml' | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension === 'gpx' || extension === 'kml' ? extension : null;
}

// Get point at a specific distance along the track
export function getPointAtDistance(track: GPXTrack, distance: number) {
  return interpolateTrackPoint(track, distance);
}

// Calculate heart rate zones
export function calculateHeartRateZones(maxHeartRate: number = 180): { [key: string]: { min: number; max: number; color: string } } {
  return {
    recovery: { min: 0, max: maxHeartRate * 0.6, color: '#4ade80' },
    aerobic: { min: maxHeartRate * 0.6, max: maxHeartRate * 0.7, color: '#60a5fa' },
    tempo: { min: maxHeartRate * 0.7, max: maxHeartRate * 0.8, color: '#fbbf24' },
    threshold: { min: maxHeartRate * 0.8, max: maxHeartRate * 0.9, color: '#f97316' },
    anaerobic: { min: maxHeartRate * 0.9, max: maxHeartRate, color: '#ef4444' },
  };
}

// Get color for heart rate
export function getHeartRateColor(heartRate: number, maxHeartRate: number = 180): string {
  const zones = calculateHeartRateZones(maxHeartRate);
  
  for (const [, zone] of Object.entries(zones)) {
    if (heartRate >= zone.min && heartRate < zone.max) {
      return zone.color;
    }
  }
  
  return zones.anaerobic.color;
}
