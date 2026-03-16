import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { estimateFileSize } from '@/utils/videoExport';
import { mapGlobalRef } from '@/utils/mapRef';
import { useI18n } from '@/i18n/useI18n';
import { ExportSettingsModal } from './export/ExportSettingsModal';
import {
  getSupportedMimeType,
  getVideoBitrate,
  MP4_MIME_TYPES,
  QUALITY_OPTIONS,
} from './export/exportConfig';
import {
  Download,
  Settings,
  Check,
  X,
  Film
} from 'lucide-react';

type Html2Canvas = (
  element: HTMLElement,
  options: {
    backgroundColor: string | null;
    scale: number;
    logging: boolean;
    useCORS: boolean;
    allowTaint?: boolean;
  }
) => Promise<HTMLCanvasElement>;

declare global {
  interface Window {
    html2canvas?: Html2Canvas;
  }
}

export function ExportPanel() {
  const { t } = useI18n();
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
  const frameCleanupRef = useRef<(() => void) | null>(null);

  // Overlay capture refs — updated async via html2canvas, drawn sync each frame
  const cachedOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const overlayBusyRef = useRef(false);
  const overlayLastUpdateRef = useRef(0);
  const cachedLogoRef = useRef<HTMLImageElement | null>(null);

  const estimatedSize = estimateFileSize(playback.totalDuration, videoExportSettings);

  const html2canvas = useCallback(() => window.html2canvas ?? null, []);

  // Watch for animation phase changes to stop recording
  useEffect(() => {
    if (!isRecordingRef.current) return;

    // Update progress based on playback progress
    if (animationPhase === 'playing') {
      setExportProgress(playback.progress * 100);
      setExportStage(t('export.recording'));
    } else if (animationPhase === 'intro') {
      setExportStage(t('export.recordingIntro'));
    } else if (animationPhase === 'outro') {
      setExportStage(t('export.recordingOutro'));
    }

    // Stop recording when animation ends
    if (animationPhase === 'ended') {
      setTimeout(() => {
        finishRecording();
      }, 1000); // Wait 1 second after ended to capture final frames
    }
  }, [animationPhase, playback.progress, setExportProgress, setExportStage, t]);

  // Load html2canvas dynamically (same as v1)
  const loadHtml2Canvas = useCallback(async (): Promise<boolean> => {
    if (html2canvas()) return true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }, [html2canvas]);

  // Calculate center-crop region so the map canvas is cropped to target aspect ratio.
  // Returns pixel coordinates within the map container's CSS rect.
  const getCropRegion = useCallback((containerRect: DOMRect, recordW: number, recordH: number) => {
    const targetAspect = recordW / recordH;
    const containerAspect = containerRect.width / containerRect.height;
    let cropX = 0, cropY = 0, cropW = containerRect.width, cropH = containerRect.height;
    if (targetAspect < containerAspect - 0.01) {
      // Target is narrower (e.g., 9:16) → trim left/right
      cropW = containerRect.height * targetAspect;
      cropX = (containerRect.width - cropW) / 2;
    } else if (targetAspect > containerAspect + 0.01) {
      // Target is wider → trim top/bottom
      cropH = containerRect.width / targetAspect;
      cropY = (containerRect.height - cropH) / 2;
    }
    return { cropX, cropY, cropW, cropH };
  }, []);

  // Async overlay update — captures ONLY the pure-HTML overlay elements (no WebGL).
  // Draws them at FIXED positions within the recording canvas so they're always
  // visible regardless of aspect ratio crop (stats top-left, elevation bottom).
  const updateOverlayAsync = useCallback(async (recordW: number, recordH: number) => {
    const capture = html2canvas();
    if (overlayBusyRef.current || !capture) return;
    overlayBusyRef.current = true;
    overlayLastUpdateRef.current = Date.now();
    try {
      const container = document.getElementById('map-capture-container');
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const { cropX, cropY, cropW } = getCropRegion(containerRect, recordW, recordH);
      // Screen px → recording px conversion
      const scaleToRec = recordW / cropW;
      const margin = Math.round(recordW * 0.025);

      const overlay = document.createElement('canvas');
      overlay.width = recordW;
      overlay.height = recordH;
      const octx = overlay.getContext('2d')!;

      // Stats overlay — fixed at TOP-LEFT (always visible in any aspect ratio)
      if (videoExportSettings.includeStats) {
        const statsEl = document.querySelector('.tr-stats-overlay') as HTMLElement | null;
        if (statsEl) {
          try {
            const cap = await capture(statsEl, {
              backgroundColor: null, scale: 2, logging: false, useCORS: true, allowTaint: true,
            });
            const dw = cap.width * scaleToRec / 2;
            const dh = cap.height * scaleToRec / 2;
            octx.drawImage(cap, 0, 0, cap.width, cap.height, margin, margin, dw, dh);
          } catch { /* skip */ }
        }
      }

      // Elevation profile — fixed at BOTTOM, centered horizontally
      if (videoExportSettings.includeElevation) {
        const elevEl = document.getElementById('mapElevationProfile') as HTMLElement | null;
        if (elevEl) {
          try {
            const cap = await capture(elevEl, {
              backgroundColor: null, scale: 1, logging: false, useCORS: true,
            });
            const rawDw = cap.width * scaleToRec;
            const dw = Math.min(rawDw, recordW * 0.85);
            const dh = cap.height * (dw / cap.width);
            const dx = (recordW - dw) / 2;
            const dy = recordH - dh - margin;
            octx.drawImage(cap, 0, 0, cap.width, cap.height, dx, dy, dw, dh);
          } catch { /* skip */ }
        }
      }

      // Active picture popup — draw at its on-screen position inside the crop.
      const picturePopupEl = document.querySelector('.tr-picture-popup') as HTMLElement | null;
      if (picturePopupEl) {
        try {
          const popupRect = picturePopupEl.getBoundingClientRect();
          const popupDx = (popupRect.left - containerRect.left - cropX) * scaleToRec;
          const popupDy = (popupRect.top - containerRect.top - cropY) * scaleToRec;
          const popupDw = popupRect.width * scaleToRec;
          const popupDh = popupRect.height * scaleToRec;

          if (popupDw > 0 && popupDh > 0) {
            const cap = await capture(picturePopupEl, {
              backgroundColor: null,
              scale: 1,
              logging: false,
              useCORS: true,
              allowTaint: true,
            });
            octx.drawImage(cap, 0, 0, cap.width, cap.height, popupDx, popupDy, popupDw, popupDh);

            // Draw the uploaded picture into the same cached overlay. html2canvas
            // can omit blob: images, but the DOM <img> already has the decoded pixels.
            const popupImageEl = picturePopupEl.querySelector('img') as HTMLImageElement | null;
            if (popupImageEl && popupImageEl.complete && popupImageEl.naturalWidth > 0) {
              const imageRect = popupImageEl.getBoundingClientRect();
              const imageDx = (imageRect.left - containerRect.left - cropX) * scaleToRec;
              const imageDy = (imageRect.top - containerRect.top - cropY) * scaleToRec;
              const imageDw = imageRect.width * scaleToRec;
              const imageDh = imageRect.height * scaleToRec;
              octx.drawImage(popupImageEl, imageDx, imageDy, imageDw, imageDh);
            }
          }
        } catch { /* skip */ }
      }

      cachedOverlayRef.current = overlay;
    } catch { /* silently ignore */ } finally {
      overlayBusyRef.current = false;
    }
  }, [getCropRegion, html2canvas, videoExportSettings.includeStats, videoExportSettings.includeElevation]);

  // Capture frame:
  // 1. Draw the MapLibre canvas DIRECTLY (always works, preserveDrawingBuffer:true)
  //    cropped to the target aspect ratio from the center.
  // 2. Composite the cached overlay (HTML stats + elevation, updated async).
  const captureFrame = useCallback(() => {
    if (!recordingCanvasRef.current || !recordingContextRef.current) return;

    const ctx = recordingContextRef.current;
    const { width: recordW, height: recordH } = videoExportSettings.resolution;

    // Use map.getCanvas() like v1 does — more reliable than DOM query
    const mapCanvas = (mapGlobalRef.current?.getCanvas() ??
      document.querySelector('.maplibregl-canvas')) as HTMLCanvasElement | null;
    const container = document.getElementById('map-capture-container');

    if (!mapCanvas || !container) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, recordW, recordH);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const { cropX, cropY, cropW, cropH } = getCropRegion(containerRect, recordW, recordH);

    // Map canvas actual pixel size can differ from CSS size (devicePixelRatio)
    const pixelScaleX = mapCanvas.width / containerRect.width;
    const pixelScaleY = mapCanvas.height / containerRect.height;

    // 1. Draw cropped map (this is the only correct way to get WebGL content)
    ctx.drawImage(
      mapCanvas,
      cropX * pixelScaleX, cropY * pixelScaleY,
      cropW * pixelScaleX, cropH * pixelScaleY,
      0, 0, recordW, recordH,
    );

    // 2. Composite overlay (stats + elevation profile), updated async in background
    if (cachedOverlayRef.current) {
      ctx.drawImage(cachedOverlayRef.current, 0, 0, recordW, recordH);
    }

    // 3. Draw activity marker (circle + emoji)
    const markerContainer = document.querySelector('.tr-marker') as HTMLElement | null;
    if (markerContainer && container) {
      const markerRect = markerContainer.getBoundingClientRect();
      const scaleX = recordW / cropW;
      const scaleY = recordH / cropH;
      const markerX = (markerRect.left + markerRect.width / 2 - containerRect.left - cropX) * scaleX;
      const markerY = (markerRect.top + markerRect.height / 2 - containerRect.top - cropY) * scaleY;

      // Draw circle (if present)
      const circleEl = markerContainer.querySelector('div') as HTMLElement | null;
      if (circleEl) {
        const circleSize = parseFloat(circleEl.style.width || '0');
        const scaledRadius = (circleSize / 2) * scaleX;
        const borderColor = circleEl.style.borderColor || '#FF9800';

        // Draw circle background with opacity
        ctx.fillStyle = circleEl.style.background || 'rgba(255, 152, 0, 0.25)';
        ctx.beginPath();
        ctx.arc(markerX, markerY, scaledRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw circle border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2 * scaleX;
        ctx.stroke();
      }

      // Draw emoji text on top
      const markerEl = markerContainer.querySelector('span') as HTMLElement | null;
      if (markerEl && markerEl.textContent) {
        const fontSize = Math.round(parseFloat(markerEl.style.fontSize || '24') * scaleX);
        ctx.font = `${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.fillText(markerEl.textContent, markerX, markerY);
      }
    }

    // 4. Draw logo watermark — always top-right corner (no background)
    if (cachedLogoRef.current) {
      // logohorizontal.svg viewBox 500×200 → aspect ratio 2.5:1
      const logoW = Math.round(recordW * 0.14);
      const logoH = Math.round(logoW / 2.5);
      const margin = Math.round(recordW * 0.025);
      const lx = recordW - logoW - margin;
      const ly = margin;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(cachedLogoRef.current, lx, ly, logoW, logoH);
      ctx.restore();
    }

    // 5. Kick off async overlay refresh (throttled)
    if (Date.now() - overlayLastUpdateRef.current > 150 && !overlayBusyRef.current) {
      updateOverlayAsync(recordW, recordH);
    }
  }, [videoExportSettings.resolution, getCropRegion, updateOverlayAsync]);

  // Frame capture — mirrors v1's approach:
  // Listen to MapLibre's `render` event (fires AFTER each WebGL frame is drawn)
  // so drawImage(mapCanvas) always reads a fresh, fully-rendered frame.
  // A separate rAF loop calls triggerRepaint() to keep MapLibre rendering even
  // when the animation hasn't changed (e.g., during intro/outro holds).
  const startFrameCapture = useCallback(() => {
    const map = mapGlobalRef.current;
    const targetFrameInterval = 1000 / videoExportSettings.fps;
    let lastCaptureTime = 0;

    if (map) {
      // Primary: capture in MapLibre render event (after WebGL draw)
      const onRender = () => {
        if (!isRecordingRef.current) return;
        const now = performance.now();
        if (now - lastCaptureTime >= targetFrameInterval) {
          captureFrame();
          lastCaptureTime = now;
        }
      };
      map.on('render', onRender);
      frameCleanupRef.current = () => map.off('render', onRender);

      // Secondary: rAF loop to keep triggerRepaint() running so render events fire
      const keepRendering = () => {
        if (!isRecordingRef.current) return;
        map.triggerRepaint();
        frameRequestRef.current = requestAnimationFrame(keepRendering);
      };
      frameRequestRef.current = requestAnimationFrame(keepRendering);
    } else {
      // Fallback: plain rAF if map not available
      const captureLoop = () => {
        if (!isRecordingRef.current) return;
        captureFrame();
        frameRequestRef.current = requestAnimationFrame(captureLoop);
      };
      frameRequestRef.current = requestAnimationFrame(captureLoop);
    }
  }, [captureFrame, videoExportSettings.fps]);

  const finishRecording = useCallback(() => {
    if (!isRecordingRef.current) return;

    isRecordingRef.current = false;

    // Stop frame capture — remove render event listener and rAF loop
    if (frameCleanupRef.current) {
      frameCleanupRef.current();
      frameCleanupRef.current = null;
    }
    if (frameRequestRef.current) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }

    setExportStage(t('export.stageFinalizing'));

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, [setExportStage, t]);

  const handleStartExport = useCallback(async () => {
    // Find the map canvas
    const mapCanvas = document.querySelector('.maplibregl-canvas') as HTMLCanvasElement;
    if (!mapCanvas) {
      alert(t('export.noCanvas'));
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStage(t('export.stagePreparing'));
    setExportedBlob(null);
    recordedChunksRef.current = [];
    cachedOverlayRef.current = null;
    overlayBusyRef.current = false;
    overlayLastUpdateRef.current = 0;

    try {
      const { width, height } = videoExportSettings.resolution;

      // Step 1: Create recording canvas
      setExportStage(t('export.stageCreateCanvas'));

      if (!recordingCanvasRef.current) {
        recordingCanvasRef.current = document.createElement('canvas');
      }
      recordingCanvasRef.current.width = width;
      recordingCanvasRef.current.height = height;
      recordingContextRef.current = recordingCanvasRef.current.getContext('2d');

      // Step 1b: Load html2canvas for overlay capture (stats + elevation profile)
      setExportStage(t('export.stageLoadOverlay'));
      await loadHtml2Canvas();

      // Preload logo watermark image
      cachedLogoRef.current = null;
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { cachedLogoRef.current = img; resolve(); };
        img.onerror = () => resolve();
        img.src = '/media/images/logohorizontal.svg';
      });

      // Pre-warm the overlay cache before recording starts
      await updateOverlayAsync(width, height);

      // Step 2: Reset playback to beginning
      setExportStage(t('export.stageResetting'));
      resetPlayback();
      setCinematicPlayed(false); // Enable intro animation for recording

      // Wait for reset to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Setup MediaRecorder
      setExportStage(t('export.stageSetupRecorder'));

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
          setExportStage(t('export.stageComplete'));
          setExportProgress(100);

          // Auto download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `trail-replay-${Date.now()}.${ext}`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          setExportStage(t('export.stageFailedNoData'));
        }
        setIsExporting(false);
      };

      // Step 4: Start recording
      setExportStage(t('export.stageStartingRecording'));
      mediaRecorderRef.current.start(100); // Collect data every 100ms
      isRecordingRef.current = true;

      // Step 5: Start frame capture loop
      startFrameCapture();

      // Wait a bit for recording to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Step 6: Start playback
      setExportStage(t('export.stageRecordingAnimation'));
      play();

    } catch (error) {
      console.error('Export failed:', error);
      setExportStage(t('export.stageFailedWithError', { error: (error as Error).message }));
      setIsExporting(false);
      isRecordingRef.current = false;
    }
  }, [videoExportSettings, setIsExporting, setExportProgress, setExportStage, resetPlayback, setCinematicPlayed, play, startFrameCapture, loadHtml2Canvas, updateOverlayAsync, t]);

  const handleCancelExport = useCallback(() => {
    isRecordingRef.current = false;
    cachedOverlayRef.current = null;
    overlayBusyRef.current = false;

    if (frameCleanupRef.current) {
      frameCleanupRef.current();
      frameCleanupRef.current = null;
    }
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
            <span className="ml-2 font-bold">{QUALITY_OPTIONS.find(q => q.value === videoExportSettings.quality)?.label} · {videoExportSettings.fps}fps</span>
          </div>
          <div>
            <span className="opacity-70">{t('export.duration')}:</span>
            <span className="ml-2 font-bold">{Math.round(playback.totalDuration / 1000)}s</span>
          </div>
        </div>
      </div>

      {/* Info about how export works */}
      <div className="bg-[var(--trail-orange-15)] border border-[var(--trail-orange)] rounded-lg p-3">
        <p className="text-xs text-[var(--evergreen)]">
          <strong>{t('export.howItWorksTitle')}</strong> {t('export.howItWorksBody')}
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
          {t('export.startRecording')}
        </button>
      )}

      {playback.totalDuration === 0 && !isExporting && (
        <p className="text-xs text-center text-[var(--evergreen-60)]">
          {t('export.needsJourney')}
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

      {/* Export Complete */}
      {exportedBlob && !isExporting && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <Check className="w-5 h-5" />
            <span className="font-medium">{t('export.complete')}</span>
          </div>

          <button
            onClick={handleDownload}
            className="w-full tr-btn tr-btn-primary flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('export.downloadAgain')}
          </button>

          <button
            onClick={() => {
              setExportedBlob(null);
              setExportProgress(0);
              setExportStage('');
            }}
            className="w-full tr-btn tr-btn-secondary"
          >
            {t('export.newExport')}
          </button>
        </div>
      )}

      {/* Settings Modal */}
      <ExportSettingsModal
        estimatedSize={estimatedSize}
        isOpen={showSettings}
        mp4Supported={mp4Supported}
        onClose={() => setShowSettings(false)}
        setVideoExportSettings={setVideoExportSettings}
        t={t}
        videoExportSettings={videoExportSettings}
      />
    </div>
  );
}
