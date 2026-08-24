import type { GPXTrack } from '@/types';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function serializeTrackToGpx(track: GPXTrack): string {
  const trackPoints = track.points.map((point) => {
    const extensions: string[] = [];
    if (point.heartRate !== null) extensions.push(`<gpxtpx:hr>${point.heartRate}</gpxtpx:hr>`);
    if (point.cadence !== null) extensions.push(`<gpxtpx:cad>${point.cadence}</gpxtpx:cad>`);
    if (point.power !== null) extensions.push(`<power>${point.power}</power>`);
    if (point.temperature !== null) extensions.push(`<gpxtpx:atemp>${point.temperature}</gpxtpx:atemp>`);

    const timeTag = point.time ? `<time>${point.time.toISOString()}</time>` : '';
    const extensionsTag = extensions.length > 0 ? `<extensions>${extensions.join('')}</extensions>` : '';

    return `<trkpt lat="${point.lat}" lon="${point.lon}"><ele>${point.elevation}</ele>${timeTag}${extensionsTag}</trkpt>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="TrailReplay" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">',
    '<trk>',
    `<name>${escapeXml(track.name)}</name>`,
    '<trkseg>',
    ...trackPoints,
    '</trkseg>',
    '</trk>',
    '</gpx>',
  ].join('');
}
