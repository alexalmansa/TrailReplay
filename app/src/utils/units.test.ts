import { describe, expect, it } from 'vitest';
import {
  convertDistance,
  convertElevation,
  convertSpeed,
  feetToMeters,
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSpeed,
  formatSpeedFromKmh,
  formatStatsDuration,
  getUnitLabels,
  kilometersToMiles,
  kmhToMph,
  metersToFeet,
  metersToKilometers,
  metersToMiles,
  milesToKilometers,
  mphToKmh,
} from './units';

describe('units', () => {
  it('converts base distance, speed, and elevation units correctly', () => {
    expect(metersToKilometers(1500)).toBe(1.5);
    expect(metersToMiles(1609.344)).toBeCloseTo(1, 5);
    expect(kilometersToMiles(10)).toBeCloseTo(6.21371, 5);
    expect(milesToKilometers(5)).toBeCloseTo(8.04672, 5);
    expect(kmhToMph(10)).toBeCloseTo(6.21371, 5);
    expect(mphToKmh(10)).toBeCloseTo(16.09344, 5);
    expect(metersToFeet(100)).toBeCloseTo(328.084, 3);
    expect(feetToMeters(328.084)).toBeCloseTo(100, 3);
  });

  it('formats stored km/h track speeds without applying the m/s conversion again', () => {
    expect(formatSpeedFromKmh(12.5, 'metric')).toBe('12.5 km/h');
    expect(formatSpeedFromKmh(16.1, 'imperial')).toBe('10.0 mph');
  });

  it('formats distances, speeds, and pace in both unit systems', () => {
    expect(formatDistance(12345, 'metric')).toBe('12.3 km');
    expect(formatDistance(950, 'metric')).toBe('0.95 km');
    expect(formatDistance(1609.344, 'imperial')).toBe('1.00 mi');
    expect(formatSpeed(5, 'metric')).toBe('18.0 km/h');
    expect(formatSpeed(5, 'imperial')).toBe('11.2 mph');
    expect(formatPace(3, 'metric')).toBe('5:33 /km');
    expect(formatPace(3, 'imperial')).toBe('8:56 /mi');
    expect(formatPace(0, 'metric')).toBe('--:--');
  });

  it('formats elevation values with elevation units rather than distance units', () => {
    expect(formatElevation(1234, 'metric')).toBe('1234 m');
    expect(formatElevation(100, 'imperial')).toBe('328 ft');
  });

  it('formats durations and stat durations safely', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(59)).toBe('0:59');
    expect(formatDuration(-5)).toBe('0:00');
    expect(formatStatsDuration(3661)).toBe('1h');
    expect(formatStatsDuration(125)).toBe('2:05');
    expect(formatStatsDuration(Number.NaN)).toBe('0:00');
  });

  it('returns display labels and converted values for each unit system', () => {
    expect(getUnitLabels('metric')).toEqual({
      distance: 'km',
      speed: 'km/h',
      pace: '/km',
      elevation: 'm',
    });
    expect(getUnitLabels('imperial')).toEqual({
      distance: 'mi',
      speed: 'mph',
      pace: '/mi',
      elevation: 'ft',
    });
    expect(convertDistance(1000, 'metric')).toBe(1);
    expect(convertDistance(1609.344, 'imperial')).toBeCloseTo(1, 5);
    expect(convertSpeed(5, 'metric')).toBe(18);
    expect(convertSpeed(5, 'imperial')).toBeCloseTo(11.184678, 5);
    expect(convertElevation(100, 'metric')).toBe(100);
    expect(convertElevation(100, 'imperial')).toBeCloseTo(328.084, 3);
  });
});
