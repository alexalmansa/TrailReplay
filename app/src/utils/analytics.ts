const GA4_MEASUREMENT_ID = 'G-0JN6P31VV9';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isDevelopmentHost() {
  if (typeof window === 'undefined') return true;

  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('vercel.app')
  );
}

function shouldEnableAnalytics() {
  return !isDevelopmentHost() && Boolean(GA4_MEASUREMENT_ID);
}

function installAnalyticsQueue() {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }
}

function loadAnalyticsScript(measurementId: string) {
  if (document.querySelector('script[data-trailreplay-ga="true"]')) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.dataset.trailreplayGa = 'true';
  document.head.appendChild(script);
}

export function initAnalytics() {
  if (typeof window === 'undefined') return false;
  if (!shouldEnableAnalytics()) return false;

  installAnalyticsQueue();
  loadAnalyticsScript(GA4_MEASUREMENT_ID);

  window.gtag?.('js', new Date());
  window.gtag?.('config', GA4_MEASUREMENT_ID, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure',
  });

  window.gtag?.('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    app_name: 'TrailReplay',
    timestamp: new Date().toISOString(),
  });

  return true;
}

export function trackEvent(eventName: string, parameters: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  if (!shouldEnableAnalytics() || typeof window.gtag !== 'function') return;

  window.gtag('event', eventName, {
    ...parameters,
    app_name: 'TrailReplay',
    timestamp: new Date().toISOString(),
  });
}
