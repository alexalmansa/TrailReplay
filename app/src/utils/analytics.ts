import type { LogEntry } from '@/utils/logger';
import { GA4_MEASUREMENT_ID, shouldEnableAnalytics } from '@/config/analytics';
import { createLogger } from '@/utils/logger';

type AnalyticsPrimitive = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsPrimitive>;

type GtagCommand = 'js' | 'config' | 'event';
type Gtag = (command: GtagCommand, target: string | Date, params?: Record<string, unknown>) => void;

let analyticsStarted = false;
let analyticsLoader: Promise<boolean> | null = null;
const logger = createLogger('analytics');

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    __TRAILREPLAY_ANALYTICS_ENABLED__?: boolean;
  }
}

function isAnalyticsEnabled() {
  if (typeof window === 'undefined') return false;
  return shouldEnableAnalytics() || Boolean(window.gtag) || Boolean(window.__TRAILREPLAY_ANALYTICS_ENABLED__);
}

function sanitizeParamValue(value: unknown): AnalyticsPrimitive | null {
  if (typeof value === 'string') {
    return value.slice(0, 100);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value.toFixed(2));
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return null;
}

function sanitizeParams(params: Record<string, unknown>): AnalyticsParams {
  const safeParams: AnalyticsParams = {};

  Object.entries(params).forEach(([key, value]) => {
    const safeValue = sanitizeParamValue(value);
    if (safeValue !== null) {
      safeParams[key] = safeValue;
    }
  });

  return safeParams;
}

async function loadAnalyticsScript() {
  if (!isAnalyticsEnabled()) return false;
  if (window.gtag) return true;
  if (analyticsLoader) return analyticsLoader;

  analyticsLoader = new Promise<boolean>((resolve) => {
    const existing = document.querySelector('script[data-trailreplay-ga="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
    script.dataset.trailreplayGa = 'true';
    script.onload = () => {
      logger.info('GA script loaded', {
        measurementId: GA4_MEASUREMENT_ID,
      });
      resolve(true);
    };
    script.onerror = () => {
      logger.error('GA script failed to load', {
        measurementId: GA4_MEASUREMENT_ID,
      });
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return analyticsLoader;
}

function installGtagStub() {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? function gtag(...args) {
    window.dataLayer?.push(args);
  };
}

export function trackAnalyticsEvent(name: string, params: Record<string, unknown> = {}) {
  if (!isAnalyticsEnabled()) {
    logger.debug('Skipped analytics event because analytics is disabled', { eventName: name });
    return;
  }
  if (!window.gtag) {
    logger.warn('Skipped analytics event because gtag is unavailable', { eventName: name });
    return;
  }

  const sanitizedParams = sanitizeParams(params);
  logger.info('Sending GA event', {
    eventName: name,
    ...sanitizedParams,
  });
  window.gtag('event', name, sanitizedParams);
}

export function mapLogEntryToAnalyticsEvent(entry: LogEntry): { name: string; params: AnalyticsParams } | null {
  const meta = entry.meta ?? {};

  if (entry.scope === 'use-gpx' && entry.message === 'Starting route import') {
    return { name: 'route_import_started', params: sanitizeParams({ route_file_count: meta.fileCount }) };
  }

  if (entry.scope === 'use-gpx' && entry.message === 'Route import completed') {
    return { name: 'route_import_completed', params: sanitizeParams({ route_imported_track_count: meta.importedTrackCount }) };
  }

  if (entry.scope === 'use-gpx' && entry.message === 'Route import failed') {
    return { name: 'route_import_failed', params: sanitizeParams({ route_failure_scope: 'import' }) };
  }

  if (entry.scope === 'use-photos' && entry.message === 'Starting photo import') {
    return {
        name: 'photo_import_started',
        params: sanitizeParams({
        photo_received_file_count: meta.receivedFileCount,
        photo_image_file_count: meta.imageFileCount,
      }),
    };
  }

  if (entry.scope === 'use-photos' && entry.message === 'Photo import completed') {
    return {
        name: 'photo_import_completed',
        params: sanitizeParams({
        photo_picture_count_added: meta.pictureCountAdded,
        photo_queued_for_manual_placement: meta.queuedForManualPlacement,
      }),
    };
  }

  if (entry.scope === 'video-export-recorder' && entry.message === 'Starting video export') {
    return {
        name: 'export_started',
        params: sanitizeParams({
        export_format: meta.format,
        export_quality: meta.quality,
        export_fps: meta.fps,
        export_include_stats: meta.includeStats,
        export_include_elevation: meta.includeElevation,
      }),
    };
  }

  if (entry.scope === 'video-export-recorder' && entry.message === 'Video export completed') {
    return {
        name: 'export_completed',
        params: sanitizeParams({
        export_blob_size: meta.blobSize,
        export_format: meta.extension,
      }),
    };
  }

  if (entry.scope === 'video-export-recorder' && entry.message === 'Cancelling video export') {
    return {
        name: 'export_cancelled',
        params: sanitizeParams({
        export_progress_percent: meta.currentProgress,
        export_stage: meta.currentStage,
      }),
    };
  }

  if (entry.scope === 'video-export-recorder' && entry.message === 'Video export failed') {
    return {
      name: 'export_failed',
      params: sanitizeParams({
        export_failure_scope: 'recording',
      }),
    };
  }

  return null;
}

function attachAnalyticsBridges() {
  window.addEventListener('trailreplay:log', (event) => {
    const detail = (event as CustomEvent<LogEntry>).detail;
    if (!detail) return;

    const mappedEvent = mapLogEntryToAnalyticsEvent(detail);
    if (!mappedEvent) return;

    trackAnalyticsEvent(mappedEvent.name, mappedEvent.params);
  });

  window.addEventListener('trailreplay:web-vital', (event) => {
    const detail = (event as CustomEvent<{ name: string; value: number; id: string }>).detail;
    if (!detail) return;

    trackAnalyticsEvent('web_vital', {
      web_vital_name: detail.name,
      web_vital_value: detail.value,
    });
  });
}

export async function startAnalytics() {
  if (!isAnalyticsEnabled()) {
    logger.warn('Analytics start skipped because analytics is disabled', {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
      measurementId: GA4_MEASUREMENT_ID,
    });
    return false;
  }
  if (analyticsStarted) {
    logger.debug('Analytics already started');
    return false;
  }

  const loaded = await loadAnalyticsScript();
  if (!loaded) {
    logger.error('Analytics start aborted because GA script did not load');
    return false;
  }

  installGtagStub();
  logger.info('Initializing GA configuration', {
    measurementId: GA4_MEASUREMENT_ID,
    sendPageView: false,
  });
  window.gtag?.('js', new Date());
  window.gtag?.('config', GA4_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: false,
  });

  attachAnalyticsBridges();
  window.__TRAILREPLAY_ANALYTICS_ENABLED__ = true;
  analyticsStarted = true;
  trackAnalyticsEvent('page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname,
  });
  logger.info('Analytics started successfully', {
    measurementId: GA4_MEASUREMENT_ID,
  });
  return true;
}
