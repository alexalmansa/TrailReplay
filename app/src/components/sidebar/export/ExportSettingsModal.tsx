import { AlertTriangle, Monitor } from 'lucide-react';
import type { VideoExportSettings, VideoQuality } from '@/types';
import {
  ASPECT_RATIO_OPTIONS,
  FPS_OPTIONS,
  getResolution,
  QUALITY_OPTIONS,
} from './exportConfig';

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

interface ExportSettingsModalProps {
  estimatedSize: string;
  isOpen: boolean;
  mp4Supported: boolean;
  onClose: () => void;
  setVideoExportSettings: (settings: Partial<VideoExportSettings>) => void;
  t: TranslateFn;
  videoExportSettings: VideoExportSettings;
}

export function ExportSettingsModal({
  estimatedSize,
  isOpen,
  mp4Supported,
  onClose,
  setVideoExportSettings,
  t,
  videoExportSettings,
}: ExportSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--canvas)] border-2 border-[var(--evergreen)] rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-[var(--evergreen)] mb-4">
          {t('export.title')}
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
            {t('export.format')}
          </label>
          <div className="flex gap-2">
            {(['mp4', 'webm'] as const).map((format) => (
              <button
                key={format}
                onClick={() => setVideoExportSettings({ format })}
                className={`
                  flex-1 py-2 px-3 rounded-lg text-sm font-medium uppercase transition-colors
                  ${videoExportSettings.format === format
                    ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
                    : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
                  }
                `}
              >
                {format}
              </button>
            ))}
          </div>
          {videoExportSettings.format === 'mp4' && !mp4Supported && (
            <div className="mt-2 flex items-start gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {t('export.mp4Unsupported')}
            </div>
          )}
          {videoExportSettings.format === 'mp4' && mp4Supported && (
            <p className="mt-1 text-xs text-[var(--evergreen-60)]">{t('export.mp4Supported')}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
            {t('export.aspectRatio')}
          </label>
          <div className="flex gap-2">
            {ASPECT_RATIO_OPTIONS.map((aspectRatio) => (
              <button
                key={aspectRatio.id}
                onClick={() => setVideoExportSettings({
                  aspectRatio: aspectRatio.id,
                  resolution: getResolution(videoExportSettings.quality, aspectRatio.id),
                })}
                className={`
                  flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors
                  ${videoExportSettings.aspectRatio === aspectRatio.id
                    ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
                    : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
                  }
                `}
              >
                <span
                  className={`
                    border-2 rounded-sm
                    ${videoExportSettings.aspectRatio === aspectRatio.id ? 'border-white/70' : 'border-[var(--evergreen)]/40'}
                    ${aspectRatio.id === '16:9' ? 'w-8 h-[18px]' : aspectRatio.id === '1:1' ? 'w-5 h-5' : 'w-[11px] h-5'}
                  `}
                />
                <span className="font-bold">{aspectRatio.label}</span>
                <span className="opacity-70 text-[10px]">{t(aspectRatio.descriptionKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
            {t('export.quality')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {QUALITY_OPTIONS.map((qualityOption) => (
              <button
                key={qualityOption.value}
                onClick={() => setVideoExportSettings({
                  quality: qualityOption.value as VideoQuality,
                  resolution: getResolution(qualityOption.value, videoExportSettings.aspectRatio),
                })}
                className={`
                  py-2 px-3 rounded-lg text-sm font-medium transition-colors
                  ${videoExportSettings.quality === qualityOption.value
                    ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
                    : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
                  }
                `}
              >
                {qualityOption.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
            {t('export.frameRate')}
          </label>
          <div className="flex gap-2">
            {FPS_OPTIONS.map((fps) => (
              <button
                key={fps}
                onClick={() => setVideoExportSettings({ fps })}
                className={`
                  flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                  ${videoExportSettings.fps === fps
                    ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
                    : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
                  }
                `}
              >
                {t('export.fpsLabel', { fps })}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
            {t('export.overlays')}
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setVideoExportSettings({ includeStats: !videoExportSettings.includeStats })}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                  videoExportSettings.includeStats ? 'bg-[var(--trail-orange)]' : 'bg-[var(--evergreen)]/20'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  videoExportSettings.includeStats ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
              <span className="text-sm text-[var(--evergreen)]">{t('export.statsOverlay')}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setVideoExportSettings({ includeElevation: !videoExportSettings.includeElevation })}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                  videoExportSettings.includeElevation ? 'bg-[var(--trail-orange)]' : 'bg-[var(--evergreen)]/20'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  videoExportSettings.includeElevation ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
              <span className="text-sm text-[var(--evergreen)]">{t('export.elevationProfile')}</span>
            </label>
            <p className="text-xs text-[var(--evergreen-60)] pl-13">{t('export.logoNote')}</p>
          </div>
        </div>

        <div className="bg-[var(--evergreen)]/10 rounded-lg p-3 flex items-center gap-2 mb-4">
          <Monitor className="w-4 h-4 text-[var(--evergreen-60)]" />
          <span className="text-sm text-[var(--evergreen)]">
            <strong>{videoExportSettings.resolution.width}×{videoExportSettings.resolution.height}</strong>
            <span className="text-[var(--evergreen-60)] ml-2">≈ {estimatedSize}</span>
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full tr-btn tr-btn-primary"
        >
          {t('common.done')}
        </button>
      </div>
    </div>
  );
}
