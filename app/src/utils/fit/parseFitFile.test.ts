import { describe, expect, it } from 'vitest';
import { FitParseError, parseFitDocument } from './parseFitFile';

const FIT_EPOCH_MS = Date.UTC(1989, 11, 31, 0, 0, 0);
const DEGREES_TO_SEMICIRCLES = 2 ** 31 / 180;

const SINT32_INVALID = 0x7fffffff;
const UINT16_INVALID = 0xffff;
const UINT8_INVALID = 0xff;

interface FitRecord {
  secondsFromStart: number;
  lat: number | null;
  lon: number | null;
  /** Metres, or null to write the "no altitude" sentinel. */
  elevation: number | null;
  heartRate: number | null;
}

/**
 * Encodes the smallest FIT file that still exercises the decoder: one
 * definition message for `record`, then one data message per point.
 */
function encodeFit(records: FitRecord[], startTime = Date.UTC(2026, 0, 1, 9, 0, 0)): ArrayBuffer {
  const DEFINITION_SIZE = 1 + 5 + 5 * 3;
  const DATA_SIZE = 1 + 4 + 4 + 4 + 2 + 1;
  const dataSize = DEFINITION_SIZE + records.length * DATA_SIZE;

  const buffer = new ArrayBuffer(12 + dataSize + 2);
  const view = new DataView(buffer);
  let offset = 0;

  const u8 = (value: number) => { view.setUint8(offset, value); offset += 1; };
  const u16 = (value: number) => { view.setUint16(offset, value, true); offset += 2; };
  const u32 = (value: number) => { view.setUint32(offset, value, true); offset += 4; };
  const i32 = (value: number) => { view.setInt32(offset, value, true); offset += 4; };

  // Header
  u8(12);
  u8(0x20);
  u16(2178);
  u32(dataSize);
  '.FIT'.split('').forEach((character) => u8(character.charCodeAt(0)));

  // Definition message for global message 20 (record), local type 0
  u8(0x40);
  u8(0); // reserved
  u8(0); // little endian
  u16(20);
  u8(5); // field count
  [
    [253, 4, 0x86], // timestamp, uint32
    [0, 4, 0x85],   // position_lat, sint32
    [1, 4, 0x85],   // position_long, sint32
    [2, 2, 0x84],   // altitude, uint16
    [3, 1, 0x02],   // heart_rate, uint8
  ].forEach(([number, size, baseType]) => { u8(number); u8(size); u8(baseType); });

  for (const record of records) {
    u8(0x00); // data message, local type 0
    u32((startTime - FIT_EPOCH_MS) / 1000 + record.secondsFromStart);
    i32(record.lat === null ? SINT32_INVALID : Math.round(record.lat * DEGREES_TO_SEMICIRCLES));
    i32(record.lon === null ? SINT32_INVALID : Math.round(record.lon * DEGREES_TO_SEMICIRCLES));
    u16(record.elevation === null ? UINT16_INVALID : Math.round((record.elevation + 500) * 5));
    u8(record.heartRate ?? UINT8_INVALID);
  }

  u16(0); // file CRC, not verified
  return buffer;
}

describe('parseFitDocument', () => {
  it('decodes position, elevation, time and sensor fields', () => {
    const buffer = encodeFit([
      { secondsFromStart: 0, lat: 41.5, lon: 2.1, elevation: 430, heartRate: 120 },
      { secondsFromStart: 60, lat: 41.6, lon: 2.2, elevation: 480, heartRate: 155 },
    ]);

    const { name, rawPoints } = parseFitDocument(buffer, 'Evening_Trail_Run.fit');

    expect(name).toBe('Evening Trail Run');
    expect(rawPoints).toHaveLength(2);
    expect(rawPoints[0].lat).toBeCloseTo(41.5, 5);
    expect(rawPoints[0].lon).toBeCloseTo(2.1, 5);
    expect(rawPoints[0].elevation).toBeCloseTo(430, 5);
    expect(rawPoints[0].heartRate).toBe(120);
    expect(rawPoints[0].time?.toISOString()).toBe('2026-01-01T09:00:00.000Z');
    expect(rawPoints[1].time?.toISOString()).toBe('2026-01-01T09:01:00.000Z');
  });

  it('skips records the watch logged before it had a position fix', () => {
    const buffer = encodeFit([
      { secondsFromStart: 0, lat: null, lon: null, elevation: 430, heartRate: 110 },
      { secondsFromStart: 10, lat: 41.5, lon: 2.1, elevation: 430, heartRate: 120 },
    ]);

    const { rawPoints } = parseFitDocument(buffer, 'run.fit');

    expect(rawPoints).toHaveLength(1);
    expect(rawPoints[0].heartRate).toBe(120);
  });

  it('holds elevation flat across records with no altitude instead of dropping to sea level', () => {
    const buffer = encodeFit([
      { secondsFromStart: 0, lat: 41.5, lon: 2.1, elevation: 430, heartRate: null },
      { secondsFromStart: 10, lat: 41.51, lon: 2.11, elevation: null, heartRate: null },
      { secondsFromStart: 20, lat: 41.52, lon: 2.12, elevation: 440, heartRate: null },
    ]);

    const { rawPoints } = parseFitDocument(buffer, 'run.fit');

    expect(rawPoints.map((point) => point.elevation)).toEqual([430, 430, 440]);
    expect(rawPoints[1].heartRate).toBeNull();
  });

  it('backfills a leading altitude gap from the first known value', () => {
    const buffer = encodeFit([
      { secondsFromStart: 0, lat: 41.5, lon: 2.1, elevation: null, heartRate: null },
      { secondsFromStart: 10, lat: 41.51, lon: 2.11, elevation: 470, heartRate: null },
    ]);

    const { rawPoints } = parseFitDocument(buffer, 'run.fit');

    expect(rawPoints.map((point) => point.elevation)).toEqual([470, 470]);
  });

  it('rejects a file that is not FIT', () => {
    const buffer = new ArrayBuffer(64);
    new DataView(buffer).setUint8(0, 12);
    expect(() => parseFitDocument(buffer, 'notes.fit')).toThrow(FitParseError);
  });

  it('rejects a FIT file with no positioned points', () => {
    const buffer = encodeFit([
      { secondsFromStart: 0, lat: null, lon: null, elevation: 430, heartRate: 110 },
    ]);
    expect(() => parseFitDocument(buffer, 'indoor.fit')).toThrow(FitParseError);
  });
});
