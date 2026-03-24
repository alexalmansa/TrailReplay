const DEFAULT_GA4_MEASUREMENT_ID = 'G-0JN6P31VV9';

export const GA4_MEASUREMENT_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID || DEFAULT_GA4_MEASUREMENT_ID;

export function shouldEnableAnalytics() {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  const isDevelopmentHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.vercel.app');

  if (isDevelopmentHost && !import.meta.env.VITE_ENABLE_ANALYTICS_IN_DEVELOPMENT) {
    return false;
  }

  return Boolean(GA4_MEASUREMENT_ID);
}
