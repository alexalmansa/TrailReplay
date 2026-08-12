import { shouldEnableAnalytics } from '@/config/analytics';
import { trackEvent } from '@/utils/analytics';
import type { AnalyticsPageType } from '@/utils/analytics';

export async function startWebVitalsTracking(pageType: AnalyticsPageType = 'app') {
  if (typeof window === 'undefined' || !shouldEnableAnalytics()) return;

  const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');

  const reportMetric = (metric: { name: string; value: number; id: string }) => {
    trackEvent('web_vital', {
      web_vital_name: metric.name,
      web_vital_value: Number(metric.value.toFixed(2)),
      page_type: pageType,
    });
  };

  onCLS(reportMetric);
  onFCP(reportMetric);
  onINP(reportMetric);
  onLCP(reportMetric);
  onTTFB(reportMetric);
}
