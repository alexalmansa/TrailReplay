import { describe, expect, it } from 'vitest';
import { formatElevation, formatSpeedFromKmh } from './units';

describe('units', () => {
  it('formats stored km/h track speeds without applying the m/s conversion again', () => {
    expect(formatSpeedFromKmh(12.5, 'metric')).toBe('12.5 km/h');
    expect(formatSpeedFromKmh(16.1, 'imperial')).toBe('10.0 mph');
  });

  it('formats elevation values with elevation units rather than distance units', () => {
    expect(formatElevation(1234, 'metric')).toBe('1234 m');
    expect(formatElevation(100, 'imperial')).toBe('328 ft');
  });
});
