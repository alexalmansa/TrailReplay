import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { estimateFileSize } from '@/utils/videoExport';
import {
  Download,
  Settings,
  Check,
  X,
  Film,
  Monitor,
  AlertTriangle
} from 'lucide-react';

const MP4_MIME_TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1.4D401E,mp4a.40.2',
  'video/mp4;codecs=avc1.64001E,mp4a.40.2',
  'video/mp4;codecs=h264',
  'video/mp4',
];

const WEBM_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

function getSupportedMimeType(format: 'mp4' | 'webm'): { mimeType: string; actualFormat: 'mp4' | 'webm' } {
  if (format === 'mp4') {
    const mp4 = MP4_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t));
    if (mp4) return { mimeType: mp4, actualFormat: 'mp4' };
    // Fall back to WebM if MP4 not natively supported
    const webm = WEBM_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
    return { mimeType: webm, actualFormat: 'webm' };
  }
  const webm = WEBM_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
  return { mimeType: webm, actualFormat: 'webm' };
}

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

  // Check native MP4 support once
  const mp4Supported = useMemo(
    () => MP4_MIME_TYPES.some(t => MediaRecorder.isTypeSupported(t)),
    []
  );
  const actualFormat = videoExportSettings.format === 'mp4' && !mp4Supported ? 'webm' : videoExportSettings.format;

  // Recording refs
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const frameRequestRef = useRef<number | null>(null);

  // Overlay capture refs — updated async via html2canvas, drawn sync each frame
  const cachedOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const overlayBusyRef = useRef(false);
  const overlayLastUpdateRef = useRef(0);

  const estimatedSize = estimateFileSize(playback.totalDuration, videoExportSettings);

  // Watch for animation phase changes to stop recording
  useEffect(() => {
    if (!isRecordingRef.current) return;

    // Update progress based on playback progress
    if (animationPhase === 'playing') {
      setExportProgress(playback.progress * 100);
      setExportStage(`Recording... ${Math.round(playback.progress * 100)}%`);
    } else if (animationPhase === 'intro') {
      setExportStage('Recording intro...');
    } else if (animationPhase === 'outro') {
      setExportStage('Recording outro...');
    }

    // Stop recording when animation ends
    if (animationPhase === 'ended') {
      setTimeout(() => {
        finishRecording();
      }, 1000); // Wait 1 second after ended to capture final frames
    }
  }, [animationPhase, playback.progress]);

  // Load html2canvas dynamically (same as v1)
  const loadHtml2Canvas = useCallback(async (): Promise<boolean> => {
    if ((window as any).html2canvas) return true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }, []);

  // Async overlay update — captures the whole map container (map + all HTML overlays).
  // MapLibre has preserveDrawingBuffer:true so html2canvas can read the WebGL canvas.
  const updateOverlayAsync = useCallback(async (recordW: number, recordH: number) => {
    if (overlayBusyRef.current) return;
    overlayBusyRef.current = true;
    try {
      const container = document.getElementById('map-capture-container');
      if (!container || !(window as any).html2canvas) return;

      const result: HTMLCanvasElement = await (window as any).html2canvas(container, {
        backgroundColor: null,
        scale: 1,
        logging: false,
        useCORS: true,
        allowTaint: true,
        // Ignore sidebar / controls — only the map container is targeted
        ignoreElements: (el: Element) =>
          el.tagName === 'SCRIPT' || el.tagName === 'STYLE',
      });

      // Resize to recording resolution
      const overlay = document.createElement('canvas');
      overlay.width = recordW;
      overlay.height = recordH;
      const ctx = overlay.getContext('2d')!;
      ctx.drawImage(result, 0, 0, recordW, recordH);
      cachedOverlayRef.current = overlay;
    } catch (e) {
      // Silently ignore — the map canvas will still be recorded
    } finally {
      overlayBusyRef.current = false;
      overlayLastUpdateRef.current = Date.now();
    }
  }, []);

  // Capture frame: draw map canvas (sync, fast) + cached overlay (sync).
  // Trigger async overlay refresh every ~150ms in the background.
  const captureFrame = useCallback(() => {
    if (!recordingCanvasRef.current || !recordingContextRef.current) return;

    const ctx = recordingContextRef.current;
    const { width, height } = videoExportSettings.resolution;

    // 1. Draw the MapLibre WebGL canvas
    const mapCanvas = document.querySelector('.maplibregl-canvas') as HTMLCanvasElement;
    if (mapCanvas) {
      ctx.drawImage(mapCanvas, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Composite the last captured overlay (stats + elevation profile)
    if (cachedOverlayRef.current) {
      ctx.drawImage(cachedOverlayRef.current, 0, 0, width, height);
    }

    // 3. Kick off async overlay refresh (throttled to ~150ms)
    if (Date.now() - overlayLastUpdateRef.current > 150) {
      updateOverlayAsync(width, height);
    }
  }, [videoExportSettings.resolution, updateOverlayAsync]);

  // Frame capture loop using requestAnimationFrame
  const startFrameCapture = useCallback(() => {
    const captureLoop = () => {
      if (!isRecordingRef.current) return;
      captureFrame();
      frameRequestRef.current = requestAnimationFrame(captureLoop);
    };
    frameRequestRef.current = requestAnimationFrame(captureLoop);
  }, [captureFrame]);

  const finishRecording = useCallback(() => {
    if (!isRecordingRef.current) return;

    isRecordingRef.current = false;

    // Stop frame capture
    if (frameRequestRef.current) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }

    setExportStage('Finalizing...');

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, [setExportStage]);

  const handleStartExport = useCallback(async () => {
    // Find the map canvas
    const mapCanvas = document.querySelector('.maplibregl-canvas') as HTMLCanvasElement;
    if (!mapCanvas) {
      alert('No map canvas found. Please load a track first.');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStage('Preparing...');
    setExportedBlob(null);
    recordedChunksRef.current = [];
    cachedOverlayRef.current = null;
    overlayBusyRef.current = false;
    overlayLastUpdateRef.current = 0;

    try {
      const { width, height } = videoExportSettings.resolution;

      // Step 1: Create recording canvas
      setExportStage('Creating recording canvas...');

      if (!recordingCanvasRef.current) {
        recordingCanvasRef.current = document.createElement('canvas');
      }
      recordingCanvasRef.current.width = width;
      recordingCanvasRef.current.height = height;
      recordingContextRef.current = recordingCanvasRef.current.getContext('2d');

      // Step 1b: Load html2canvas for overlay capture (stats + elevation profile)
      setExportStage('Loading overlay capture library...');
      await loadHtml2Canvas();

      // Pre-warm the overlay cache before recording starts
      await updateOverlayAsync(width, height);

      // Step 2: Reset playback to beginning
      setExportStage('Resetting to start...');
      resetPlayback();
      setCinematicPlayed(false); // Enable intro animation for recording

      // Wait for reset to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Setup MediaRecorder
      setExportStage('Setting up recorder...');

      const stream = recordingCanvasRef.current.captureStream(videoExportSettings.fps);

      // Find supported MIME type based on selected format
      const { mimeType, actualFormat: recordedFormat } = getSupportedMimeType(videoExportSettings.format);
      const ext = recordedFormat === 'mp4' ? 'mp4' : 'webm';

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: getVideoBitrate(videoExportSettings.quality),
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });

        if (blob.size > 0) {
          setExportedBlob(blob);
          setExportStage('Complete!');
          setExportProgress(100);

          // Auto download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `trail-replay-${Date.now()}.${ext}`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          setExportStage('Export failed - no data recorded');
        }
        setIsExporting(false);
      };

      // Step 4: Start recording
      setExportStage('Starting recording...');
      mediaRecorderRef.current.start(100); // Collect data every 100ms
      isRecordingRef.current = true;

      // Step 5: Start frame capture loop
      startFrameCapture();

      // Wait a bit for recording to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 6: Start playback
      setExportStage('Recording animation...');
      play();

    } catch (error) {
      console.error('Export failed:', error);
      setExportStage('Export failed: ' + (error as Error).message);
      setIsExporting(false);
      isRecordingRef.current = false;
    }
  }, [videoExportSettings, setIsExporting, setExportProgress, setExportStage, resetPlayback, setCinematicPlayed, play, startFrameCapture, loadHtml2Canvas, updateOverlayAsync]);

  const handleCancelExport = useCallback(() => {
    isRecordingRef.current = false;
    cachedOverlayRef.current = null;
    overlayBusyRef.current = false;

    if (frameRequestRef.current) {
      cancelAnimationFrame(frameRequestRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsExporting(false);
    setExportProgress(0);
    setExportStage('');
    resetPlayback();
  }, [setIsExporting, setExportProgress, setExportStage, resetPlayback]);

  const handleDownload = useCallback(() => {
    if (!exportedBlob) return;

    const ext = exportedBlob.type.startsWith('video/mp4') ? 'mp4' : 'webm';
    const url = URL.createObjectURL(exportedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trail-replay-${Date.now()}.${ext}`;
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
            <span className="ml-2 font-bold uppercase">
              {actualFormat.toUpperCase()}
              {videoExportSettings.format === 'mp4' && !mp4Supported && (
                <span className="ml-1 text-yellow-400 text-xs">(WebM fallback)</span>
              )}
            </span>
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
          <strong>How it works:</strong> Recording captures the full map view — including the stats overlay,
          elevation profile, and track animation — exactly as it appears on screen.
          The animation resets to the beginning before recording starts.
        </p>
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
          <div className="flex items-center gap-2 mb-4 text-sm text-[var(--evergreen)]">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            Recording in progress...
          </div>

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

            {/* Format */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--evergreen)] mb-2">
                Format
              </label>
              <div className="flex gap-2">
                {(['mp4', 'webm'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setVideoExportSettings({ format: fmt })}
                    className={`
                      flex-1 py-2 px-3 rounded-lg text-sm font-medium uppercase transition-colors
                      ${videoExportSettings.format === fmt
                        ? 'bg-[var(--trail-orange)] text-[var(--canvas)]'
                        : 'bg-[var(--evergreen)]/10 text-[var(--evergreen)] hover:bg-[var(--evergreen)]/20'
                      }
                    `}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              {videoExportSettings.format === 'mp4' && !mp4Supported && (
                <div className="mt-2 flex items-start gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  MP4 is not natively supported in this browser. Will record as WebM instead. Use Safari or Chrome for native MP4 export.
                </div>
              )}
              {videoExportSettings.format === 'mp4' && mp4Supported && (
                <p className="mt-1 text-xs text-[var(--evergreen-60)]">Native MP4 recording supported.</p>
              )}
            </div>

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

// Helper function for video bitrate
function getVideoBitrate(quality: string): number {
  const bitrates: Record<string, number> = {
    low: 2_000_000,
    medium: 5_000_000,
    high: 10_000_000,
    ultra: 20_000_000,
  };
  return bitrates[quality] || bitrates.high;
}
