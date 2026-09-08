// Token generation and verification for job ownership, subscription confirmation
// and unsubscribe links.
//
// Only hashes are persisted. The plaintext token exists just long enough to be
// returned to the browser or embedded in an email link, so a dump of the leads
// database yields nothing that can be replayed.

const TOKEN_BYTES = 32;

/** URL-safe random token. 32 bytes of CSPRNG output, base64url encoded. */
export function createToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return base64UrlEncode(bytes);
}

export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Compares a caller-supplied token against a stored hash without leaking, via
 * timing, how much of the hash matched. Both sides are fixed-length SHA-256
 * output here, so a plain loop over the full length is sufficient.
 */
export async function verifyToken(token, expectedHash) {
  if (typeof token !== 'string' || typeof expectedHash !== 'string') return false;
  const actualHash = await hashToken(token);
  if (actualHash.length !== expectedHash.length) return false;

  let mismatch = 0;
  for (let index = 0; index < actualHash.length; index += 1) {
    mismatch |= actualHash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  }
  return mismatch === 0;
}

function base64UrlEncode(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
