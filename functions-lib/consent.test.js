import { describe, expect, it } from 'vitest';
import { CONSENT_TEXT_VERSION, allowsPreTickedMarketing, requiresExplicitConsent } from './consent.js';

describe('allowsPreTickedMarketing', () => {
  it('allows a pre-ticked box outside the EU/EEA/UK', () => {
    ['US', 'CA', 'AU', 'JP', 'BR', 'MX', 'ZA'].forEach((country) => {
      expect(allowsPreTickedMarketing(country)).toBe(true);
    });
  });

  it('refuses a pre-ticked box across the EU', () => {
    ['ES', 'DE', 'FR', 'IT', 'PT', 'NL', 'IE', 'PL'].forEach((country) => {
      expect(allowsPreTickedMarketing(country)).toBe(false);
    });
  });

  it('refuses a pre-ticked box in the EEA and the UK', () => {
    ['NO', 'IS', 'LI', 'GB'].forEach((country) => {
      expect(allowsPreTickedMarketing(country)).toBe(false);
    });
  });

  it('treats an unknown country as EU', () => {
    // Wrongly opting someone in is a compliance problem; wrongly failing to
    // pre-tick is only a conversion one. Fail toward the safe side.
    [null, undefined, '', 'XX!', 'UNKNOWN', 42].forEach((country) => {
      expect(allowsPreTickedMarketing(country)).toBe(false);
    });
  });

  it('accepts lowercase and padded country codes', () => {
    expect(allowsPreTickedMarketing('us')).toBe(true);
    expect(allowsPreTickedMarketing(' de ')).toBe(false);
  });

  it('requiresExplicitConsent is the inverse', () => {
    expect(requiresExplicitConsent('DE')).toBe(true);
    expect(requiresExplicitConsent('US')).toBe(false);
  });

  it('pins a consent text version so stored consent stays evidenceable', () => {
    expect(CONSENT_TEXT_VERSION).toMatch(/^v\d+-\d{4}-\d{2}$/);
  });
});
