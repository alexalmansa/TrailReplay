import { describe, expect, it } from 'vitest';
import {
  isDisposableEmail,
  normalizeEmail,
  normalizeLocale,
  sanitizeRenderSettings,
} from './validation.js';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Alex@Example.COM ')).toBe('alex@example.com');
  });

  it('accepts addresses with plus tags and subdomains', () => {
    expect(normalizeEmail('a+studio@mail.example.co.uk')).toBe('a+studio@mail.example.co.uk');
  });

  it('rejects malformed addresses', () => {
    ['', 'no-at-sign', 'a@b', 'a@@b.com', 'a b@example.com', '@example.com', 'a@'].forEach((value) => {
      expect(normalizeEmail(value)).toBeNull();
    });
  });

  it('rejects non-strings', () => {
    [null, undefined, 42, {}, []].forEach((value) => {
      expect(normalizeEmail(value)).toBeNull();
    });
  });

  it('rejects addresses beyond the practical length limit', () => {
    expect(normalizeEmail(`${'a'.repeat(250)}@example.com`)).toBeNull();
  });
});

describe('isDisposableEmail', () => {
  it('flags known throwaway domains', () => {
    expect(isDisposableEmail('someone@mailinator.com')).toBe(true);
    expect(isDisposableEmail('someone@yopmail.com')).toBe(true);
  });

  it('leaves ordinary addresses alone', () => {
    expect(isDisposableEmail('someone@gmail.com')).toBe(false);
    expect(isDisposableEmail('someone@trailreplay.com')).toBe(false);
  });
});

describe('sanitizeRenderSettings', () => {
  it('keeps recognised values', () => {
    expect(sanitizeRenderSettings({
      quality: 'high', qualityMode: 'studio', aspectRatio: '9:16', fps: 30, durationMs: 60000,
    })).toEqual({
      quality: 'high', qualityMode: 'studio', aspectRatio: '9:16', fps: 30, durationMs: 60000,
    });
  });

  it('drops unrecognised values instead of rejecting the request', () => {
    // A future client shipping a new quality tier must not have its exports
    // refused by an older Function.
    const result = sanitizeRenderSettings({ quality: 'insane', qualityMode: 'turbo', aspectRatio: '21:9' });
    expect(result.quality).toBeNull();
    expect(result.qualityMode).toBeNull();
    expect(result.aspectRatio).toBeNull();
  });

  it('rejects out-of-range and non-numeric timings', () => {
    expect(sanitizeRenderSettings({ fps: 0 }).fps).toBeNull();
    expect(sanitizeRenderSettings({ fps: -30 }).fps).toBeNull();
    expect(sanitizeRenderSettings({ fps: 100000 }).fps).toBeNull();
    expect(sanitizeRenderSettings({ fps: 'thirty' }).fps).toBeNull();
    expect(sanitizeRenderSettings({ durationMs: Number.MAX_SAFE_INTEGER }).durationMs).toBeNull();
  });

  it('handles a missing or non-object payload', () => {
    expect(sanitizeRenderSettings(undefined).fps).toBeNull();
    expect(sanitizeRenderSettings('nope').quality).toBeNull();
  });
});

describe('normalizeLocale', () => {
  it('accepts language tags', () => {
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('ca-ES')).toBe('ca-es');
  });

  it('rejects anything else', () => {
    expect(normalizeLocale('en_US; DROP TABLE leads')).toBeNull();
    expect(normalizeLocale(42)).toBeNull();
  });
});
