import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/analytics', () => ({
  GA4_DEBUG_MODE: false,
  GA4_MEASUREMENT_ID: 'G-TEST',
  shouldEnableAnalytics: () => true,
}));

describe('analytics', () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = '';
    window.dataLayer = [];
    window.gtag = undefined;
    window.__TRAILREPLAY_ANALYTICS_ENABLED__ = undefined;
  });

  it('disables automatic pageviews and sends one contextual manual pageview', async () => {
    const { initAnalytics } = await import('./analytics');

    initAnalytics({ page_type: 'tutorial', page_group: 'help' });
    document.dispatchEvent(new Event('DOMContentLoaded'));
    initAnalytics({ page_type: 'tutorial', page_group: 'help' });

    const queuedCalls = window.dataLayer as IArguments[];
    const configCalls = queuedCalls.filter((call) => call[0] === 'config');
    const pageViewCalls = queuedCalls.filter((call) => call[0] === 'event' && call[1] === 'page_view');

    expect(configCalls).toHaveLength(1);
    expect(configCalls[0]?.[2]).toMatchObject({ send_page_view: false });
    expect(pageViewCalls).toHaveLength(1);
    expect(pageViewCalls[0]?.[2]).toMatchObject({
      page_type: 'tutorial',
      page_group: 'help',
      app_name: 'TrailReplay',
    });
    expect(pageViewCalls[0]?.[2]).not.toHaveProperty('timestamp');
  });

  it('sanitizes event parameters and omits unsupported values', async () => {
    const { sanitizeAnalyticsParams } = await import('./analytics');

    expect(sanitizeAnalyticsParams({
      text: 'x'.repeat(120),
      count: 2.345,
      enabled: true,
      missing: null,
      nested: { unsafe: true },
    })).toEqual({
      text: 'x'.repeat(100),
      count: 2.35,
      enabled: true,
    });
  });

  it('creates stable low-cardinality reporting buckets', async () => {
    const {
      getBlobSizeBucket,
      getDistanceBucket,
      getDurationBucket,
      getProgressBucket,
    } = await import('./analytics');

    expect(getDistanceBucket(9_999)).toBe('short');
    expect(getDistanceBucket(42_000)).toBe('long');
    expect(getDurationBucket(90)).toBe('medium');
    expect(getBlobSizeBucket(250 * 1024 * 1024)).toBe('xlarge');
    expect(getProgressBucket(75)).toBe('75_100');
  });
});
