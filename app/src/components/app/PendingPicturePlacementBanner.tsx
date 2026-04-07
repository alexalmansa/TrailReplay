import { MapPin } from 'lucide-react';
import type { PendingPicturePlacement } from '@/types';
import { useI18n } from '@/i18n/useI18n';

interface PendingPicturePlacementBannerProps {
  pendingPlacement: PendingPicturePlacement;
  totalPendingPlacements: number;
  onCancelAll: () => void;
  onSkip: () => void;
}

export function PendingPicturePlacementBanner({
  pendingPlacement,
  totalPendingPlacements,
  onCancelAll,
  onSkip,
}: PendingPicturePlacementBannerProps) {
  const { t } = useI18n();
  const hintKey = {
    'missing-gps': 'media.manualPlacementHintMissingGps',
    'route-mismatch': 'media.manualPlacementHintRouteMismatch',
    'no-timed-route': 'media.manualPlacementHintNoTimedRoute',
    'timestamp-out-of-range': 'media.manualPlacementHintTimestampOutOfRange',
  }[pendingPlacement.placementReason];

  return (
    <div className="absolute right-4 top-4 z-40 w-[min(24rem,calc(100%-2rem))] rounded-2xl border border-[var(--evergreen)]/15 bg-[var(--canvas)]/95 p-3 shadow-xl backdrop-blur">
      <div className="flex items-start gap-3">
        <img
          src={pendingPlacement.url}
          alt={pendingPlacement.file.name}
          className="h-16 w-16 flex-shrink-0 rounded-xl border border-[var(--evergreen)]/10 object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-[var(--trail-orange)]">
            <MapPin className="h-4 w-4" />
            <p className="text-sm font-semibold text-[var(--evergreen)]">
              {t('media.manualPlacementTitle')}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-[var(--evergreen-60)]">
            {t(hintKey)}
          </p>
          <p className="mt-1 truncate text-[11px] text-[var(--evergreen-60)]">
            {pendingPlacement.file.name}
          </p>
          {pendingPlacement.mismatchDistanceMeters !== undefined && (
            <p className="mt-1 text-[11px] font-medium text-[var(--trail-orange)]">
              {t('media.manualPlacementDistance', {
                distance: Math.round(pendingPlacement.mismatchDistanceMeters),
              })}
            </p>
          )}
          <p className="mt-2 text-[11px] uppercase tracking-[0.08em] text-[var(--evergreen-60)]">
            {t('media.manualPlacementCount', {
              current: 1,
              total: totalPendingPlacements,
            })}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={onSkip}
          className="rounded-lg border border-[var(--evergreen)]/15 px-3 py-1.5 text-xs font-medium text-[var(--evergreen)] hover:bg-[var(--evergreen)]/5"
        >
          {t('media.manualPlacementSkip')}
        </button>
        <button
          onClick={onCancelAll}
          className="rounded-lg bg-[var(--evergreen)] px-3 py-1.5 text-xs font-medium text-[var(--canvas)] hover:bg-[var(--evergreen)]/90"
        >
          {t('media.manualPlacementCancelAll')}
        </button>
      </div>
    </div>
  );
}
