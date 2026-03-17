import { createLogger } from '@/utils/logger';

const logger = createLogger('web-vitals');

/**
 * Hooks browser Web Vitals into the shared logger and exposes them as custom
 * events so local debugging and future analytics integrations can observe the
 * same metrics source.
 */
export async function startWebVitalsTracking() {
  if (typeof window === 'undefined') return;

  const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');

  const reportMetric = (metric: { name: string; value: number; id: string }) => {
    logger.info(`Captured ${metric.name}`, {
      id: metric.id,
      value: Number(metric.value.toFixed(2)),
    });

    window.dispatchEvent(
      new CustomEvent('trailreplay:web-vital', {
        detail: metric,
      })
    );
  };

  onCLS(reportMetric);
  onFCP(reportMetric);
  onINP(reportMetric);
  onLCP(reportMetric);
  onTTFB(reportMetric);
}
