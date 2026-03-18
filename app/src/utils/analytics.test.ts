import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LogEntry } from '@/utils/logger';
import { mapLogEntryToAnalyticsEvent, trackAnalyticsEvent } from './analytics';

describe('analytics', () => {
  beforeEach(() => {
    window.gtag = vi.fn();
    window.__TRAILREPLAY_ANALYTICS_ENABLED__ = true;
  });

  it('maps important logger entries into GA4 events', () => {
    const mapped = mapLogEntryToAnalyticsEvent({
      id: '1',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      level: 'info',
      scope: 'video-export-recorder',
      message: 'Starting video export',
      meta: {
        format: 'mp4',
        quality: 'high',
        fps: 60,
        includeStats: true,
        includeElevation: false,
      },
    } satisfies LogEntry);

    expect(mapped).toEqual({
      name: 'export_started',
      params: {
        export_format: 'mp4',
        export_quality: 'high',
        export_fps: 60,
        export_include_stats: true,
        export_include_elevation: false,
      },
    });
  });

  it('ignores logs that are not part of the analytics event schema', () => {
    const mapped = mapLogEntryToAnalyticsEvent({
      id: '2',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      level: 'debug',
      scope: 'use-photos',
      message: 'Photo processed',
      meta: {
        fileName: 'test.jpg',
      },
    } satisfies LogEntry);

    expect(mapped).toBeNull();
  });

  it('sends sanitized GA4 events through gtag', () => {
    const gtagSpy = window.gtag as ReturnType<typeof vi.fn>;

    trackAnalyticsEvent('route_import_completed', {
      route_imported_track_count: 2,
      file_names: ['a.gpx', 'b.gpx'],
      note: 'ok',
    });

    expect(gtagSpy).toHaveBeenCalledWith('event', 'route_import_completed', {
      route_imported_track_count: 2,
      note: 'ok',
    });
  });
});
