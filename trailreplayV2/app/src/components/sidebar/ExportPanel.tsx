import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { VideoExporter, estimateFileSize } from '@/utils/videoExport';
import {
  Download,
  Settings,
  Check,
  X,
  Film,
  Monitor
} from 'lucide-react';

const QUALITY_OPTIONS = [
  { value: 'low', label: '720p', resolution: { width: 1280, height: 720 } },
  { value: 'medium', label: '1080p', resolution: { width: 1920, height: 1080 } },
  { value: 'high', label: '1440p', resolution: { width: 2560, height: 1440 } },
  { value: 'ultra', label: '4K', resolution: { width: 3840, height: 2160 } },
];

const FPS_OPTIONS = [24, 30, 60];

export function ExportPanel() {
  const videoExportSettings = useAppStore((state) => state.videoExportSettings);
  const setVideoExportSettings = useAppStore((state) => state.setVideoExportSettings);
  const playback = useAppStore((state) => state.playback);
  const animationPhase = useAppStore((state) => state.animationPhase);
  const isExporting = useAppStore((state) => state.isExporting);
  const exportProgress = useAppStore((state) => state.exportProgress);
  const exportStage = useAppStore((state) => state.exportStage);
  const setIsExporting = useAppStore((state) => state.setIsExporting);
  const setExportProgress = useAppStore((state) => state.setExportProgress);
  const setExportStage = useAppStore((state) => state.setExportStage);
  const resetPlayback = useAppStore((state) => state.resetPlayback);
  const play = useAppStore((state) => state.play);
  const setCinematicPlayed = useAppStore((state) => state.setCinematicPlayed);

  const [showSettings, setShowSettings] = useState(false);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const exporterRef = useRef<VideoExporter | null>(null);
  const recordingStartedRef = useRef(false);
  const waitingForEndRef = useRef(false);

  const estimatedSize = estimateFileSize(playback.totalDuration, videoExportSettings);

  // Watch for animation phase changes to stop recording
  useEffect(() => {
    if (!waitingForEndRef.current) return;

    // Update progress based on playback progress
    if (animationPhase === 'playing') {
      setExportProgress(playback.progress * 100);
      setExportStage(`Recording... ${Math.round(playback.progress * 100)}%`);
    }

    // Stop recording when animation ends
    if (animationPhase === 'ended' || animationPhase === 'outro') {
      // Wait a bit for outro to be captured, then stop
      if (animationPhase === 'outro') {
        setExportStage('Capturing outro...');
      } else if (animationPhase === 'ended') {
        setTimeout(() => {
          finishRecording();
        }, 500);
      }
    }
  }, [animationPhase, playback.progress]);

  const finishRecording = useCallback(() => {
    if (!exporterRef.current || !waitingForEndRef.current) return;

    waitingForEndRef.current = false;
    recordingStartedRef.current = false;

    setExportStage('Finalizing...');

    // Small delay to ensure last frame is captured
    setTimeout(() => {
      const blob = exporterRef.current?.stopRecording();
      if (blob && blob.size > 0) {
        setExportedBlob(blob);
        setExportStage('Complete!');
        setExportProgress(100);

        // Auto download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trail-replay-${Date.now()}.${videoExportSettings.format === 'mp4' ? 'webm' : 'webm'}`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setExportStage('Export failed - no data recorded');
      }
      setIsExporting(false);
    }, 500);
  }, [videoExportSettings.format, setExportStage, setExportProgress, setIsExporting]);

  const handleStartExport = useCallback(async () => {
    // Find the map canvas
    const mapContainer = document.querySelector('.maplibregl-canvas') as HTMLCanvasElement;
    if (!mapContainer) {
      alert('No map canvas found. Please load a track first.');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStage('Preparing...');
    setExportedBlob(null);

    try {
      // Step 1: Reset playback to beginning
      setExportStage('Resetting to start...');
      resetPlayback();
      setCinematicPlayed(false); // Enable intro animation for recording

      // Wait for reset to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Create exporter and start recording
      setExportStage('Starting recording...');
      exporterRef.current = new VideoExporter(
        mapContainer,
        videoExportSettings,
        (progress) => {
          setExportProgress(progress.progress);
        }
      );

      await exporterRef.current.startRecording();
      recordingStartedRef.current = true;
      waitingForEndRef.current = true;

      // Wait a bit for recording to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 3: Start playback - the animation will now play and be recorded
      setExportStage('Recording animation...');
      play();

    } catch (error) {
      console.error('Export failed:', error);
      setExportStage('Export failed: ' + (error as Error).message);
      setIsExporting(false);
      waitingForEndRef.current = false;
      recordingStartedRef.current = false;
    }
  }, [videoExportSettings, setIsExporting, setExportProgress, setExportStage, resetPlayback, setCinematicPlayed, play]);

  const handleCancelExport = useCallback(() => {
    exporterRef.current?.cancel();
    waitingForEndRef.current = false;
    recordingStartedRef.current = false;
    setIsExporting(false);
    setExportProgress(0);
    setExportStage('');
    resetPlayback();
  }, [setIsExporting, setExportProgress, setExportStage, resetPlayback]);

  const handleDownload = useCallback(() => {
    if (!exportedBlob) return;

    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trail-replay-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportedBlob]);

  return (
    <div className="space-y-4">
      {/* Export Settings Summary */}
      <div className="bg-[var(--evergreen)] text-[var(--canvas)] p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm uppercase tracking-wide">Export Settings</h3>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 hover:bg-white/10 rounded"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="opacity-70">Format:</span>
            <span className="ml-2 font-bold uppercase">WebM</span>
          </div>
          <div>
            <span className="opacity-70">Quality:</span>
            <span className="ml-2 font-bold">{QUALITY_OPTIONS.find(q => q.value === videoExportSettings.quality)?.label}</span>
          </div>
          <div>
            <span className="opacity-70">FPS:</span>
            <span className="ml-2 font-bold">{videoExportSettings.fps}</span>
          </div>
          <div>
            <span className="opacity-70">Duration:</span>
            <span className="ml-2 font-bold">{Math.round(playback.totalDuration / 1000)}s</span>
          </div>
        </div>
      </div>

      {/* Info about how export works */}
      <div className="bg-[var(--trail-orange-15)] border border-[var(--trail-orange)] rounded-lg p-3">
        <p className="text-xs text-[var(--evergreen)]">
          <strong>How it works:</strong> Click "Start Recording" to reset the animation to the beginning,
          then it will automatically play and record the entire animation including intro and outro.
        </p>
      </div>

      {/* Export Options */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-[var(--evergreen)]">
          <input
            type="checkbox"
            checked={videoExportSettings.includeElevation}
            onChange={(e) => setVideoExportSettings({ includeElevation: e.target.checked })}
            className="w-4 h-4 accent-[var(--trail-orange)]"
          />
          Include Elevation Profile
        </label>
      </div>

      {/* Export Button */}
      {!isExporting && !exportedBlob && (
        <button
          onClick={handleStartExport}
          disabled={playback.totalDuration === 0}
          className="w-full tr-btn tr-btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Film className="w-5 h-5" />
          Start Recording
        </button>
      )}

      {playback.totalDuration === 0 && !isExporting && (
        <p className="text-xs text-center text-[var(--evergreen-60)]">
          Load a track and add it to the journey first
        </p>
      )}

      {/* Export Progress */}
      {isExporting && (
        <div className="tr-export-progress">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--evergreen)]">
              {exportStage}
            </span>
            <span className="text-sm font-bold text-[var(--trail-orange)]">
              {Math.round(exportProgress)}%
            </span>
          </div>

          <div className="tr-progress-bar mb-4">
            <div
              className="tr-progress-fill"
              style={{ width: `${exportProgress}%` }}
            />
          </div>

          {/* Live recording indicator */}
          {recordingStartedRef.current && (
            <div className="flex items-center gap-2 mb-4 text-sm text-[var(--evergreen)]">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              Recording in progress...
            </div>
          )}

          <button
            onClick={handleCancelExport}
            className="w-full tr-btn tr-btn-secondary flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      )}

      {/* Export Complete */}
      {exportedBlob && !isExporting && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <Check className="w-5 h-5" />
            <span className="font-medium">Export complete!</span>
          </div>

          <button
            onClick={handleDownload}
            className="w-full tr-btn tr-btn-primary flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Again
          </button>

          <button
            onClick={() => {
              setExportedBlob(null);
              setExportProgress(0);
              setExportStage('');
            }}
            className="w-full tr-btn tr-btn-secondary"
          >
            New Export
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--canvas)] border-2 border-[var(--evergreen)] rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[var(--evergreen)] mb-4">
              Export Settings
            </h3>

            {/* Quality */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
                Quality
              </label>
              <div className="grid grid-cols-2 gap-2">
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setVideoExportSettings({
                      quality: opt.value as any,
                      resolution: opt.resolution
                    })}
                    className={`
                      py-2 px-3 rounded-lg text-sm font-medium transition-colors
                      ${videoExportSettings.quality === opt.value
                        ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
                        : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FPS */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
                Frame Rate
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
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Size */}
            <div className="bg-[var(--evergreen)]/10 rounded-lg p-3 flex items-center gap-2 mb-4">
              <Monitor className="w-4 h-4 text-[var(--evergreen-60)]" />
              <span className="text-sm text-[var(--evergreen)]">
                Estimated file size: <strong>{estimatedSize}</strong>
              </span>
            </div>

            {/* Note about format */}
            <p className="text-xs text-[var(--evergreen-60)] mb-4">
              Note: Video will be exported as WebM format which is widely supported.
              You can convert to MP4 using free online tools if needed.
            </p>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full tr-btn tr-btn-primary"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
