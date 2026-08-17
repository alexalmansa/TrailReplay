import { ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import type { AppState } from '@/store/storeTypes';

const steps: Array<{ id: AppState['activePanel']; labelKey: string; descriptionKey: string }> = [
  { id: 'tracks', labelKey: 'sidebar.tabs.tracks', descriptionKey: 'workflow.routesDescription' },
  { id: 'journey', labelKey: 'sidebar.tabs.journey', descriptionKey: 'workflow.timelineDescription' },
  { id: 'annotations', labelKey: 'sidebar.tabs.annotations', descriptionKey: 'workflow.styleDescription' },
  { id: 'settings', labelKey: 'sidebar.tabs.settings', descriptionKey: 'workflow.mapDescription' },
  { id: 'pictures', labelKey: 'sidebar.tabs.pictures', descriptionKey: 'workflow.mediaDescription' },
  { id: 'export', labelKey: 'sidebar.tabs.export', descriptionKey: 'workflow.generateDescription' },
];

export function WorkflowGuide() {
  const { t } = useI18n();
  const activePanel = useAppStore((state) => state.activePanel);
  const setActivePanel = useAppStore((state) => state.setActivePanel);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === activePanel));
  const activeStep = steps[activeIndex];
  const nextStep = steps[activeIndex + 1];
  const durationSeconds = Math.round(journeySegments.reduce((total, segment) => total + (segment.duration || 0), 0) / 1000);

  return (
    <section className="mb-4 rounded-xl border border-[var(--trail-orange)]/35 bg-[var(--trail-orange-15)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--trail-orange)]">
          {t('workflow.step', { current: activeIndex + 1, total: steps.length })}
        </p>
        {activePanel === 'journey' && durationSeconds > 0 && (
          <span className="rounded-full bg-[var(--evergreen)] px-2 py-1 text-[10px] font-bold text-[var(--canvas)]">
            {t('workflow.videoDurationStatus', { seconds: durationSeconds })}
          </span>
        )}
      </div>
      <h2 className="mt-1 text-sm font-bold text-[var(--evergreen)]">{t(activeStep.labelKey)}</h2>
      <p className="mt-1 text-xs leading-4 text-[var(--evergreen-80)]">{t(activeStep.descriptionKey)}</p>
      <div className="mt-3 grid grid-cols-6 gap-1" aria-label={t('workflow.progressLabel')}>
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActivePanel(step.id)}
            aria-label={t(step.labelKey)}
            className={`h-1.5 rounded-full transition-colors ${index <= activeIndex ? 'bg-[var(--trail-orange)]' : 'bg-[var(--evergreen)]/15'}`}
          />
        ))}
      </div>
      {nextStep && (
        <button type="button" onClick={() => setActivePanel(nextStep.id)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--evergreen)] hover:text-[var(--trail-orange)]">
          {t('workflow.next', { step: t(nextStep.labelKey) })}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </section>
  );
}
