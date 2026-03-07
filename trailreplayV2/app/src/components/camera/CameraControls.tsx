import { useAppStore } from '@/store/useAppStore';
import type { CameraMode } from '@/types';
import { useI18n } from '@/i18n/useI18n';

const CAMERA_MODES: { id: CameraMode; nameKey: string; icon: string }[] = [
  { id: 'overview', nameKey: 'settings.cameraModes.overview', icon: '🗺️' },
  { id: 'follow', nameKey: 'settings.cameraModes.follow', icon: '🎯' },
  { id: 'follow-behind', nameKey: 'settings.cameraModes.followBehind', icon: '🎬' },
];

export function CameraControls() {
  const { t } = useI18n();
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const setCameraMode = useAppStore((state) => state.setCameraMode);

  return (
    <div className="flex items-center gap-1 bg-[var(--evergreen)]/20 rounded-lg p-1">
      {CAMERA_MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setCameraMode(mode.id)}
          title={t(mode.nameKey)}
          className={`
            p-2 rounded-md text-sm transition-colors flex items-center gap-1
            ${cameraSettings.mode === mode.id
              ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
              : 'text-[var(--canvas)]/70 hover:text-[var(--canvas)] hover:bg-white/10'
            }
          `}
        >
          <span>{mode.icon}</span>
          <span className="hidden sm:inline text-xs">{t(mode.nameKey)}</span>
        </button>
      ))}
    </div>
  );
}
