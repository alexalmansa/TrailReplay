// Marketing consent rules.
//
// The product wants the marketing checkbox pre-ticked. GDPR Recital 32 and the
// CJEU's Planet49 ruling require a "clear affirmative action", which a
// pre-ticked box is not — so the default is decided by where the visitor is,
// using the country Cloudflare already attaches to the request. Pre-ticked
// where that is lawful, unticked in the EU/EEA/UK.
//
// Bump CONSENT_TEXT_VERSION whenever the wording next to the checkbox changes.
// Every lead stores the version it agreed to, which is what makes a consent
// claim evidenceable rather than assertable.

export const CONSENT_TEXT_VERSION = 'v1-2026-09';

const EU_EEA_UK = new Set([
  // EU
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE',
  // EEA (non-EU)
  'IS', 'LI', 'NO',
  // UK
  'GB',
]);

/**
 * Whether the marketing checkbox may be pre-ticked for this visitor.
 *
 * An unknown country is treated as EU: opting someone in by accident is a
 * compliance problem, failing to pre-tick is only a conversion one.
 */
export function allowsPreTickedMarketing(country) {
  if (!country || typeof country !== 'string') return false;
  const normalized = country.trim().toUpperCase();
  if (normalized.length !== 2) return false;
  return !EU_EEA_UK.has(normalized);
}

export function requiresExplicitConsent(country) {
  return !allowsPreTickedMarketing(country);
}
