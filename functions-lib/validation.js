// Input validation for the export delivery endpoints.

// Deliberately permissive: the address only has to be plausible, because the
// real test is whether the delivery email arrives. Rejecting valid-but-unusual
// addresses costs a lead; accepting an invalid one costs one bounce.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const MAX_EMAIL_LENGTH = 254; // RFC 5321 practical limit

// Addresses here can never receive the video, so accepting them would trade a
// real delivery for a dead row. Not an anti-abuse measure — it is trivially
// bypassed, and the token-gated download is what actually protects the file.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'yopmail.com', '10minutemail.com',
  'temp-mail.org', 'throwawaymail.com', 'trashmail.com', 'sharklasers.com',
  'getnada.com', 'dispostable.com', 'maildrop.cc', 'fakeinbox.com',
]);

export function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.length > MAX_EMAIL_LENGTH) return null;
  if (!EMAIL_PATTERN.test(normalized)) return null;
  return normalized;
}

export function isDisposableEmail(email) {
  const domain = email.slice(email.lastIndexOf('@') + 1);
  return DISPOSABLE_DOMAINS.has(domain);
}

const ALLOWED_QUALITY_MODES = new Set(['standard', 'studio']);
const ALLOWED_ASPECT_RATIOS = new Set(['16:9', '1:1', '9:16']);
const ALLOWED_QUALITIES = new Set(['low', 'medium', 'high', 'ultra']);

/**
 * Render settings are recorded for support and product insight only, so an
 * unrecognised value is dropped rather than failing the request — a future app
 * version adding a quality tier must not start rejecting exports from clients
 * that have already shipped.
 */
export function sanitizeRenderSettings(input) {
  const settings = input && typeof input === 'object' ? input : {};
  const positiveInt = (value, max) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 && parsed <= max ? Math.round(parsed) : null;
  };

  return {
    quality: ALLOWED_QUALITIES.has(settings.quality) ? settings.quality : null,
    qualityMode: ALLOWED_QUALITY_MODES.has(settings.qualityMode) ? settings.qualityMode : null,
    aspectRatio: ALLOWED_ASPECT_RATIOS.has(settings.aspectRatio) ? settings.aspectRatio : null,
    fps: positiveInt(settings.fps, 240),
    durationMs: positiveInt(settings.durationMs, 6 * 60 * 60 * 1000),
  };
}

export function normalizeLocale(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().slice(0, 10);
  return /^[a-zA-Z-]+$/.test(normalized) ? normalized.toLowerCase() : null;
}
