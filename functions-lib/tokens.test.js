import { describe, expect, it } from 'vitest';
import { createToken, hashToken, verifyToken } from './tokens.js';

describe('createToken', () => {
  it('produces URL-safe tokens with no padding', () => {
    for (let index = 0; index < 20; index += 1) {
      expect(createToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('does not repeat', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => createToken()));
    expect(tokens.size).toBe(200);
  });
});

describe('hashToken', () => {
  it('is stable for the same input', async () => {
    const token = createToken();
    expect(await hashToken(token)).toBe(await hashToken(token));
  });

  it('never returns the token itself', async () => {
    // The whole point is that a database dump yields nothing replayable.
    const token = createToken();
    expect(await hashToken(token)).not.toBe(token);
  });

  it('differs for different inputs', async () => {
    expect(await hashToken('a')).not.toBe(await hashToken('b'));
  });
});

describe('verifyToken', () => {
  it('accepts the token that produced the hash', async () => {
    const token = createToken();
    expect(await verifyToken(token, await hashToken(token))).toBe(true);
  });

  it('rejects a different token', async () => {
    expect(await verifyToken(createToken(), await hashToken(createToken()))).toBe(false);
  });

  it('rejects missing or non-string input rather than throwing', async () => {
    const hash = await hashToken(createToken());
    expect(await verifyToken(null, hash)).toBe(false);
    expect(await verifyToken(undefined, hash)).toBe(false);
    expect(await verifyToken('', hash)).toBe(false);
    expect(await verifyToken(123, hash)).toBe(false);
  });

  it('rejects when no hash is stored', async () => {
    // A job row with a null token hash must never authorise anything.
    expect(await verifyToken(createToken(), null)).toBe(false);
    expect(await verifyToken(createToken(), undefined)).toBe(false);
  });
});
