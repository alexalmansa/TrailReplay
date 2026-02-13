import { useAppStore } from '@/store/useAppStore';
import type { CameraMode } from '@/types';

const CAMERA_MODES: { id: CameraMode; name: string; icon: string }[] = [
  { id: 'overview', name: 'Overview', icon: '🗺️' },
  { id: 'follow', name: 'Follow', icon: '🎯' },
  { id: 'follow-behind', name: 'Behind', icon: '🎬' },
];

export function CameraControls() {
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const setCameraMode = useAppStore((state) => state.setCameraMode);

  return (
    <div className="flex items-center gap-1 bg-[var(--evergreen)]/20 rounded-lg p-1">
      {CAMERA_MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setCameraMode(mode.id)}
          title={mode.name}
          className={`
            p-2 rounded-md text-sm transition-colors flex items-center gap-1
            ${cameraSettings.mode === mode.id
              ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
              : 'text-[var(--canvas)]/70 hover:text-[var(--canvas)] hover:bg-white/10'
            }
          `}
        >
          <span>{mode.icon}</span>
          <span className="hidden sm:inline text-xs">{mode.name}</span>
        </button>
      ))}
    </div>
  );
}
