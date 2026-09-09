import type { RawTrackPoint } from '@/utils/gpx/trackStats';

/**
 * Minimal decoder for the ActivityFile subset of the FIT format: enough to
 * turn a watch's original recording into route points. Strava's "Export
 * Original" hands back a .fit, and unlike its GPX route exports that file
 * keeps the per-point timestamps the replay needs to align several people
 * by real time.
 *
 * Only `record` messages are read; the file CRC is not verified, since a
 * stale checksum should not block an import that otherwise decodes cleanly.
 */

const FIT_EPOCH_MS = Date.UTC(1989, 11, 31, 0, 0, 0);
const SEMICIRCLES_TO_DEGREES = 180 / 2 ** 31;
const RECORD_GLOBAL_MESSAGE = 20;

const FIELD_TIMESTAMP = 253;
const FIELD_POSITION_LAT = 0;
const FIELD_POSITION_LONG = 1;
const FIELD_ALTITUDE = 2;
const FIELD_HEART_RATE = 3;
const FIELD_CADENCE = 4;
const FIELD_POWER = 7;
const FIELD_TEMPERATURE = 13;
const FIELD_ENHANCED_ALTITUDE = 78;

const BASE_TYPE_SIZES: Record<number, number> = {
  0: 1, 1: 1, 2: 1, 3: 2, 4: 2, 5: 4, 6: 4, 7: 1,
  8: 4, 9: 8, 10: 1, 11: 2, 12: 4, 13: 1, 14: 8, 15: 8, 16: 8,
};

/** Sentinel each base type uses to mean "no value recorded". */
const INVALID_VALUES: Record<number, number> = {
  0: 0xff, 1: 0x7f, 2: 0xff, 3: 0x7fff, 4: 0xffff,
  5: 0x7fffffff, 6: 0xffffffff, 10: 0, 11: 0, 12: 0, 13: 0xff,
};

interface FieldDefinition {
  number: number;
  size: number;
  baseType: number;
}

interface MessageDefinition {
  globalNumber: number;
  fields: FieldDefinition[];
  littleEndian: boolean;
  totalSize: number;
}

export class FitParseError extends Error {}

function readBaseValue(
  view: DataView,
  offset: number,
  baseType: number,
  littleEndian: boolean
): number | null {
  const type = baseType & 0x1f;
  let value: number;

  switch (type) {
    case 1: value = view.getInt8(offset); break;
    case 0: case 2: case 10: case 13: value = view.getUint8(offset); break;
    case 3: value = view.getInt16(offset, littleEndian); break;
    case 4: case 11: value = view.getUint16(offset, littleEndian); break;
    case 5: value = view.getInt32(offset, littleEndian); break;
    case 6: case 12: value = view.getUint32(offset, littleEndian); break;
    case 8: value = view.getFloat32(offset, littleEndian); break;
    case 9: value = view.getFloat64(offset, littleEndian); break;
    default: return null;
  }

  return value === INVALID_VALUES[type] ? null : value;
}

export function parseFitDocument(
  buffer: ArrayBuffer,
  fileName: string
): { name: string; rawPoints: RawTrackPoint[] } {
  const view = new DataView(buffer);
  if (buffer.byteLength < 14) {
    throw new FitParseError('File is too small to be a FIT recording');
  }

  const headerSize = view.getUint8(0);
  const magic = String.fromCharCode(
    view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
  );
  if (magic !== '.FIT') {
    throw new FitParseError('Not a FIT file (missing .FIT signature)');
  }

  const dataSize = view.getUint32(4, true);
  const end = Math.min(headerSize + dataSize, buffer.byteLength);
  let position = headerSize;

  const definitions = new Map<number, MessageDefinition>();
  // Elevation stays nullable until the end: a handful of records mid-file can
  // lack altitude, and treating those as sea level would carve fake cliffs
  // into the climb totals.
  const points: Array<Omit<RawTrackPoint, 'elevation'> & { elevation: number | null }> = [];

  while (position < end) {
    const header = view.getUint8(position);
    position += 1;

    // Compressed timestamp header: a data message whose local type sits in
    // bits 5-6. The offset it carries only refines the clock, and every
    // record we keep has its own timestamp field, so it is skipped over.
    if (header & 0x80) {
      const localType = (header >> 5) & 0x03;
      const definition = definitions.get(localType);
      if (!definition) throw new FitParseError('FIT data message before its definition');
      position += definition.totalSize;
      continue;
    }

    const localType = header & 0x0f;

    if (header & 0x40) {
      position += 1; // reserved
      const littleEndian = view.getUint8(position) === 0;
      position += 1;
      const globalNumber = view.getUint16(position, littleEndian);
      position += 2;
      const fieldCount = view.getUint8(position);
      position += 1;

      const fields: FieldDefinition[] = [];
      for (let i = 0; i < fieldCount; i++) {
        fields.push({
          number: view.getUint8(position),
          size: view.getUint8(position + 1),
          baseType: view.getUint8(position + 2),
        });
        position += 3;
      }

      // Developer fields carry no route data, but their bytes still have to
      // be counted so the next message starts at the right offset.
      if (header & 0x20) {
        const devFieldCount = view.getUint8(position);
        position += 1;
        for (let i = 0; i < devFieldCount; i++) {
          fields.push({
            number: -1,
            size: view.getUint8(position + 1),
            baseType: 13,
          });
          position += 3;
        }
      }

      definitions.set(localType, {
        globalNumber,
        fields,
        littleEndian,
        totalSize: fields.reduce((total, field) => total + field.size, 0),
      });
      continue;
    }

    const definition = definitions.get(localType);
    if (!definition) throw new FitParseError('FIT data message before its definition');
    if (position + definition.totalSize > buffer.byteLength) break;

    if (definition.globalNumber === RECORD_GLOBAL_MESSAGE) {
      const values = new Map<number, number | null>();
      let fieldOffset = position;
      for (const field of definition.fields) {
        if (field.number >= 0) {
          const baseSize = BASE_TYPE_SIZES[field.baseType & 0x1f] ?? field.size;
          // Arrays are rare on record fields; the first element is the value.
          values.set(
            field.number,
            field.size >= baseSize
              ? readBaseValue(view, fieldOffset, field.baseType, definition.littleEndian)
              : null
          );
        }
        fieldOffset += field.size;
      }

      const lat = values.get(FIELD_POSITION_LAT);
      const lon = values.get(FIELD_POSITION_LONG);
      // Records without a fix (common while the watch is still acquiring)
      // carry cadence or heart rate but no place to put on the map.
      if (typeof lat === 'number' && typeof lon === 'number') {
        const timestamp = values.get(FIELD_TIMESTAMP);
        const enhancedAltitude = values.get(FIELD_ENHANCED_ALTITUDE);
        const altitude = values.get(FIELD_ALTITUDE);
        const rawAltitude = typeof enhancedAltitude === 'number' ? enhancedAltitude : altitude;

        points.push({
          lat: lat * SEMICIRCLES_TO_DEGREES,
          lon: lon * SEMICIRCLES_TO_DEGREES,
          elevation: typeof rawAltitude === 'number' ? rawAltitude / 5 - 500 : null,
          time: typeof timestamp === 'number' ? new Date(FIT_EPOCH_MS + timestamp * 1000) : null,
          heartRate: values.get(FIELD_HEART_RATE) ?? null,
          cadence: values.get(FIELD_CADENCE) ?? null,
          power: values.get(FIELD_POWER) ?? null,
          temperature: values.get(FIELD_TEMPERATURE) ?? null,
        });
      }
    }

    position += definition.totalSize;
  }

  if (points.length === 0) {
    throw new FitParseError('FIT file has no positioned track points');
  }

  return { name: getFitTrackName(fileName), rawPoints: fillElevationGaps(points) };
}

/**
 * Holds elevation flat across records that recorded no altitude, so a gap
 * neither drops the trace to sea level nor counts as climb on either side.
 */
function fillElevationGaps(
  points: Array<Omit<RawTrackPoint, 'elevation'> & { elevation: number | null }>
): RawTrackPoint[] {
  const firstKnown = points.find((point) => point.elevation !== null)?.elevation ?? 0;
  let lastKnown = firstKnown;

  return points.map((point) => {
    if (point.elevation !== null) lastKnown = point.elevation;
    return { ...point, elevation: lastKnown };
  });
}

function getFitTrackName(fileName: string): string {
  const withoutExtension = fileName.split('/').pop()?.replace(/\.fit$/i, '') || 'Route';
  // Watches and Strava name these files "Evening_Trail_Run.fit".
  return withoutExtension.replace(/_+/g, ' ').trim() || 'Route';
}
