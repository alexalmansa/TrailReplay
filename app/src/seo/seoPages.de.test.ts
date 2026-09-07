import { describe, expect, it } from 'vitest';
import { SEO_LANDING_PAGES } from './seoPages';
import { SEO_LANDING_PAGES_DE } from './seoPages.de';

/** Every human-readable string in a page config, flattened. */
function copyStrings(page: unknown): string[] {
  if (typeof page === 'string') return [page];
  if (Array.isArray(page)) return page.flatMap(copyStrings);
  if (page && typeof page === 'object') {
    return Object.entries(page)
      // slug and analyticsPageType are identifiers, not copy; icons are components.
      .filter(([key]) => key !== 'slug' && key !== 'analyticsPageType' && key !== 'icon' && key !== 'heroMedia')
      .flatMap(([, value]) => copyStrings(value));
  }
  return [];
}

describe('German SEO landing copy', () => {
  it.each(Object.keys(SEO_LANDING_PAGES))('translates every string on %s', (slug) => {
    const english = copyStrings(SEO_LANDING_PAGES[slug as keyof typeof SEO_LANDING_PAGES]);
    const german = copyStrings(SEO_LANDING_PAGES_DE[slug as keyof typeof SEO_LANDING_PAGES_DE]);

    expect(english.length).toBeGreaterThan(20);
    expect(german).toHaveLength(english.length);

    // localize() silently falls through to English for anything it has no
    // entry for, so an untranslated string is invisible without this.
    const untranslated = english.filter((value, index) => german[index] === value);
    expect(untranslated).toEqual([]);
  });
});
