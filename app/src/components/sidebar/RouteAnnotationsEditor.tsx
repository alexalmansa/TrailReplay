import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { convertElevation } from '@/utils/units';
import { Eye, EyeOff, MapPinned, Play, Plus, Trash2 } from 'lucide-react';

const DEFAULT_ANNOTATION_DURATION = 4000;

export function RouteAnnotationsEditor() {
  const { t } = useI18n();
  const playback = useAppStore((state) => state.playback);
  const unitSystem = useAppStore((state) => state.settings.unitSystem);
  const textAnnotations = useAppStore((state) => state.textAnnotations);
  const selectedTextAnnotationId = useAppStore((state) => state.selectedTextAnnotationId);
  const addTextAnnotation = useAppStore((state) => state.addTextAnnotation);
  const updateTextAnnotation = useAppStore((state) => state.updateTextAnnotation);
  const removeTextAnnotation = useAppStore((state) => state.removeTextAnnotation);
  const seekToProgress = useAppStore((state) => state.seekToProgress);
  const setSelectedTextAnnotationId = useAppStore((state) => state.setSelectedTextAnnotationId);

  const [draftAnnotationLabel, setDraftAnnotationLabel] = useState('NOTE');
  const [draftAnnotationTitle, setDraftAnnotationTitle] = useState('');
  const [draftAnnotationSubtitle, setDraftAnnotationSubtitle] = useState('');

  const { currentPosition } = useComputedJourney();
  const canAddAnnotation = Boolean(currentPosition);

  const handleAddAnnotation = () => {
    if (!currentPosition || !draftAnnotationTitle.trim()) return;

    const annotationId = crypto.randomUUID();
    addTextAnnotation({
      id: annotationId,
      progress: playback.progress,
      lat: currentPosition.lat,
      lon: currentPosition.lon,
      label: draftAnnotationLabel.trim() || 'NOTE',
      title: draftAnnotationTitle.trim(),
      subtitle: draftAnnotationSubtitle.trim() || undefined,
      elevation: currentPosition.elevation > 0 ? currentPosition.elevation : undefined,
      displayDuration: DEFAULT_ANNOTATION_DURATION,
    });
    setSelectedTextAnnotationId(annotationId);
    setDraftAnnotationTitle('');
    setDraftAnnotationSubtitle('');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-[var(--evergreen)]/15 p-3 bg-[var(--evergreen)]/3">
        <p className="text-xs text-[var(--evergreen-60)]">
          {t('annotations.routeAnnotationsHint')}
        </p>

        <div className="grid grid-cols-[96px_1fr] gap-2">
          <input
            value={draftAnnotationLabel}
            onChange={(e) => setDraftAnnotationLabel(e.target.value)}
            placeholder={t('annotations.routeAnnotationLabelPlaceholder')}
            className="rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm font-semibold uppercase text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
            maxLength={18}
          />
          <input
            value={draftAnnotationTitle}
            onChange={(e) => setDraftAnnotationTitle(e.target.value)}
            placeholder={t('annotations.routeAnnotationTitlePlaceholder')}
            className="rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
            maxLength={48}
          />
        </div>

        <input
          value={draftAnnotationSubtitle}
          onChange={(e) => setDraftAnnotationSubtitle(e.target.value)}
          placeholder={t('annotations.routeAnnotationSubtitlePlaceholder')}
          className="w-full rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
          maxLength={48}
        />

        <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--evergreen)]/10 bg-[var(--canvas)]/55 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--evergreen)]">
              {canAddAnnotation
                ? t('annotations.routeAnnotationReady', { percent: (playback.progress * 100).toFixed(0) })
                : t('annotations.routeAnnotationNoPosition')}
            </p>
            {currentPosition?.elevation ? (
              <p className="text-[11px] text-[var(--evergreen-60)] mt-0.5">
                {t('annotations.routeAnnotationElevation', {
                  elevation: Math.round(convertElevation(currentPosition.elevation, unitSystem)).toLocaleString(),
                  unit: unitSystem === 'metric' ? 'm' : 'ft',
                })}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleAddAnnotation}
            disabled={!canAddAnnotation || !draftAnnotationTitle.trim()}
            className="tr-btn tr-btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {t('annotations.addRouteAnnotation')}
          </button>
        </div>
      </div>

      {textAnnotations.length === 0 ? (
        <div className="text-center py-8 text-[var(--evergreen-60)]">
          <p className="text-sm">{t('annotations.routeAnnotationsEmpty')}</p>
          <p className="text-xs mt-1">{t('media.routeAnnotationsEmptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {textAnnotations
            .slice()
            .sort((a, b) => a.progress - b.progress)
            .map((annotation) => {
              const isSelected = selectedTextAnnotationId === annotation.id;
              const annotationElevation = annotation.elevation !== undefined
                ? `${Math.round(convertElevation(annotation.elevation, unitSystem)).toLocaleString()} ${unitSystem === 'metric' ? 'm' : 'ft'}`
                : null;

              return (
                <div
                  key={annotation.id}
                  className={`space-y-3 rounded-lg border p-3 ${
                    isSelected
                      ? 'border-[var(--trail-orange)] bg-[var(--trail-orange-15)]'
                      : 'border-[var(--evergreen)]/15 bg-[var(--evergreen)]/3'
                  }`}
                >
                  <div className="grid grid-cols-[96px_1fr] gap-2">
                    <input
                      value={annotation.label}
                      onChange={(e) => updateTextAnnotation(annotation.id, { label: e.target.value })}
                      className="rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm font-semibold uppercase text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
                      maxLength={18}
                    />
                    <input
                      value={annotation.title}
                      onChange={(e) => updateTextAnnotation(annotation.id, { title: e.target.value })}
                      className="rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
                      maxLength={48}
                    />
                  </div>

                  <input
                    value={annotation.subtitle ?? ''}
                    onChange={(e) => updateTextAnnotation(annotation.id, { subtitle: e.target.value || undefined })}
                    placeholder={t('annotations.routeAnnotationSubtitlePlaceholder')}
                    className="w-full rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
                    maxLength={48}
                  />

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--evergreen-60)]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--canvas)]/70 px-2 py-1">
                      <MapPinned className="w-3 h-3" />
                      {t('annotations.routeAnnotationProgress', { percent: (annotation.progress * 100).toFixed(0) })}
                    </span>
                    {annotationElevation && (
                      <span className="rounded-full bg-[var(--canvas)]/70 px-2 py-1">
                        {annotationElevation}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-[1fr_1fr_auto_44px] gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTextAnnotationId(isSelected ? null : annotation.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--evergreen)]/15 bg-[var(--canvas)]/70 px-3 py-2 text-sm text-[var(--evergreen)] hover:bg-[var(--evergreen)]/10"
                    >
                      {isSelected ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {isSelected ? t('annotations.hideRouteAnnotation') : t('annotations.previewRouteAnnotation')}
                    </button>

                    <button
                      type="button"
                      onClick={() => seekToProgress(annotation.progress)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--evergreen)]/15 bg-[var(--canvas)]/70 px-3 py-2 text-sm text-[var(--evergreen)] hover:bg-[var(--evergreen)]/10"
                    >
                      <Play className="w-4 h-4" />
                      {t('annotations.goToAnnotation')}
                    </button>

                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={Math.round(annotation.displayDuration / 1000)}
                      onChange={(e) => {
                        const value = Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1));
                        updateTextAnnotation(annotation.id, { displayDuration: value * 1000 });
                      }}
                      className="rounded-lg border border-[var(--evergreen)]/20 bg-[var(--canvas)] px-2 py-2 text-sm text-[var(--evergreen)] outline-none focus:border-[var(--trail-orange)]"
                      title={t('annotations.annotationDuration')}
                    />

                    <button
                      type="button"
                      onClick={() => removeTextAnnotation(annotation.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 hover:bg-red-100"
                      title={t('annotations.removeRouteAnnotation')}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
