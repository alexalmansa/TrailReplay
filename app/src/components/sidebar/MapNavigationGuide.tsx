import { MousePointer2, Move, Rotate3D, ZoomIn } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';

const controls = [
  { key: 'tracks.mapControlsPan', icon: Move },
  { key: 'tracks.mapControlsCamera', icon: Rotate3D },
  { key: 'tracks.mapControlsZoom', icon: ZoomIn },
] as const;

export function MapNavigationGuide() {
  const { t } = useI18n();

  return (
    <section className="rounded-xl border border-[var(--trail-orange)]/25 bg-[var(--trail-orange-15)] p-3">
      <div className="flex items-center gap-2">
        <MousePointer2 className="h-4 w-4 text-[var(--trail-orange)]" />
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--evergreen)]">
          {t('tracks.mapControlsTitle')}
        </h3>
      </div>
      <div className="mt-2.5 space-y-2">
        {controls.map(({ key, icon: Icon }) => (
          <div key={key} className="flex items-start gap-2 text-xs leading-4 text-[var(--evergreen-60)]">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--evergreen)]" />
            <span>{t(key)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
