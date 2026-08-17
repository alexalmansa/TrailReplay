import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/i18n/useI18n';
import { useProjectFile } from '@/hooks/useProjectFile';
import { ExportSettingsModal } from './export/ExportSettingsModal';
import { QUALITY_OPTIONS } from './export/exportConfig';
import { useVideoExportRecorder } from './export/useVideoExportRecorder';
import { SocialSharePanel } from './export/SocialSharePanel';
import { Check, Download, Film, ImageIcon, Instagram, Loader2, Save, Settings, X } from 'lucide-react';

export function ExportPanel() {
  const { t } = useI18n();
  const videoExportSettings = useAppStore((state) => state.videoExportSettings);
  const setVideoExportSettings = useAppStore((state) => state.setVideoExportSettings);
  const playback = useAppStore((state) => state.playback);
  const exportMode = useAppStore((state) => state.exportSubMode);
  const setExportMode = useAppStore((state) => state.setExportSubMode);
  const tracks = useAppStore((state) => state.tracks);
  const isAppExporting = useAppStore((state) => state.isExporting);
  const [showSettings, setShowSettings] = useState(false);
  const { saveProject, isSaving } = useProjectFile();

  const {
    actualFormat,
    estimatedSize,
    exportProgress,
    exportStage,
    exportedBlob,
    handleCancelExport,
    handleDownload,
    handleStartExport,
    isExporting,
    mp4Supported,
    resetExportResult,
  } = useVideoExportRecorder();

  return (
    <div className="space-y-4">
      {/* Save Project */}
      <div className="rounded-lg border border-[var(--evergreen)]/15 bg-[var(--evergreen)]/3 p-3">
        <h3 className="text-sm font-bold text-[var(--evergreen)]">{t('export.saveProjectTitle')}</h3>
        <p className="mt-0.5 text-xs text-[var(--evergreen-60)]">{t('export.saveProjectBody')}</p>
        <button
          type="button"
          onClick={() => saveProject('sidebar')}
          disabled={isAppExporting || isSaving || tracks.length === 0}
          className="tr-btn tr-btn-secondary mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-sm disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('sidebar.saveProject')}
        </button>
      </div>

      {/* Mode switch */}
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={() => setExportMode('video')}
          className={`py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 border transition-colors ${
            exportMode === 'video'
              ? 'bg-[var(--evergreen)] text-[var(--canvas)] border-[var(--evergreen)]'
              : 'bg-transparent border-[var(--evergreen-20)] text-[var(--evergreen)] hover:bg-[var(--evergreen-10)]'
          }`}
        >
          <Film className="w-3.5 h-3.5" /> {t('imageExport.modeVideo')}
        </button>
        <button
          onClick={() => setExportMode('image')}
          className={`py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 border transition-colors ${
            exportMode === 'image'
              ? 'bg-[var(--evergreen)] text-[var(--canvas)] border-[var(--evergreen)]'
              : 'bg-transparent border-[var(--evergreen-20)] text-[var(--evergreen)] hover:bg-[var(--evergreen-10)]'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" /> {t('imageExport.modeImage')}
        </button>
      </div>

      {exportMode === 'image' ? (
        <SocialSharePanel />
      ) : (
        <>
          <div className="bg-[var(--evergreen)] text-[var(--canvas)] p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm uppercase tracking-wide">{t('export.title')}</h3>
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 hover:bg-white/10 rounded"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="opacity-70">{t('export.format')}:</span>
                <span className="ml-2 font-bold uppercase">
                  {actualFormat.toUpperCase()}
                  {videoExportSettings.format === 'mp4' && !mp4Supported && (
                    <span className="ml-1 text-yellow-400 text-xs">{t('export.fallbackWebm')}</span>
                  )}
                </span>
              </div>
              <div>
                <span className="opacity-70">{t('export.ratio')}:</span>
                <span className="ml-2 font-bold">{videoExportSettings.aspectRatio}</span>
              </div>
              <div>
                <span className="opacity-70">{t('export.quality')}:</span>
                <span className="ml-2 font-bold">
                  {QUALITY_OPTIONS.find((option) => option.value === videoExportSettings.quality)?.label} · {videoExportSettings.fps}fps
                </span>
              </div>
              <div>
                <span className="opacity-70">{t('export.duration')}:</span>
                <span className="ml-2 font-bold">{Math.round(playback.totalDuration / 1000)}s</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--trail-orange-15)] border border-[var(--trail-orange)] rounded-lg p-3">
            <p className="text-xs text-[var(--evergreen)]">
              <strong>{t('export.howItWorksTitle')}</strong> {t('export.howItWorksBody')}
            </p>
          </div>

          {!isExporting && !exportedBlob && (
            <button
              onClick={handleStartExport}
              disabled={playback.totalDuration === 0}
              className="w-full tr-btn tr-btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Film className="w-5 h-5" />
              {t('export.generateVideo')}
            </button>
          )}

          {playback.totalDuration === 0 && !isExporting && (
            <p className="text-xs text-center text-[var(--evergreen-60)]">
              {t('export.needsJourney')}
            </p>
          )}

          {isExporting && (
            <div className="tr-export-progress">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--evergreen)]">{exportStage}</span>
                <span className="text-sm font-bold text-[var(--trail-orange)]">{Math.round(exportProgress)}%</span>
              </div>

              <div className="tr-progress-bar mb-4">
                <div className="tr-progress-fill" style={{ width: `${exportProgress}%` }} />
              </div>

              <div className="flex items-center gap-2 mb-4 text-sm text-[var(--evergreen)]">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                {t('export.recordingInProgress')}
              </div>

              <button
                onClick={handleCancelExport}
                className="w-full tr-btn tr-btn-secondary flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                {t('common.cancel')}
              </button>
            </div>
          )}

          {exportedBlob && !isExporting && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <Check className="w-5 h-5" />
                <span className="font-medium">{t('export.complete')}</span>
              </div>

              <aside className="rounded-lg border border-[var(--trail-orange)]/35 bg-[var(--trail-orange-15)] p-4">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--trail-orange)] text-white shadow-sm">
                    <Instagram className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[var(--evergreen)]">
                      {t('export.shareTitle')}
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-[var(--evergreen-80)]">
                      {t('export.shareBodyBefore')}{' '}
                      <a
                        href="https://www.instagram.com/trailreplay/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[var(--evergreen)] underline decoration-[var(--trail-orange)] underline-offset-2 hover:text-[var(--trail-orange)]"
                      >
                        @trailreplay
                      </a>{' '}
                      {t('export.shareBodyAfter')}
                    </p>
                    <p className="mt-2 text-xs font-medium leading-5 text-[var(--evergreen)]">
                      {t('export.shareFeature')}
                    </p>
                  </div>
                </div>
              </aside>

              <button
                onClick={handleDownload}
                className="w-full tr-btn tr-btn-primary flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('export.downloadAgain')}
              </button>

              <button onClick={resetExportResult} className="w-full tr-btn tr-btn-secondary">
                {t('export.newExport')}
              </button>
            </div>
          )}

          <ExportSettingsModal
            estimatedSize={estimatedSize}
            isOpen={showSettings}
            mp4Supported={mp4Supported}
            onClose={() => setShowSettings(false)}
            setVideoExportSettings={setVideoExportSettings}
            t={t}
            videoExportSettings={videoExportSettings}
          />
        </>
      )}
    </div>
  );
}
