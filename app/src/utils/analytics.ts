const GA4_MEASUREMENT_ID = 'G-0JN6P31VV9';
let isInitialized = false;

declare global {
  interface Window {
    dataLayer?: Array<IArguments | unknown[]>;
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
      void args;
      // GA's recommended bootstrap queue pushes the raw arguments object.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
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

function bootAnalytics() {
  if (isInitialized) return true;

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
    page_path: `${window.location.pathname}${window.location.search}`,
    app_name: 'TrailReplay',
    timestamp: new Date().toISOString(),
  });

  isInitialized = true;
  return true;
}

export function initAnalytics() {
  if (typeof window === 'undefined') return false;
  if (!shouldEnableAnalytics()) return false;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bootAnalytics();
    }, { once: true });
    return true;
  }

  return bootAnalytics();
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
