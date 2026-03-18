import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { estimateFileSize } from '@/utils/videoExport';
import { mapGlobalRef } from '@/utils/mapRef';
import { useI18n } from '@/i18n/useI18n';
import { handleAsyncError } from '@/utils/errorHandler';
import { getCropRegion } from '@/utils/crop';
import { createLogger } from '@/utils/logger';
import {
  getSupportedMimeType,
  getVideoBitrate,
  MP4_MIME_TYPES,
} from './exportConfig';
import {
  getCapturedCanvasDrawSize,
  getElevationOverlayDrawRect,
  getExportOverlayMetrics,
  getOverlayRefreshIntervalMs,
  getPopupOverlayDrawRect,
  isDrawableRect,
} from './exportOverlay';

const logger = createLogger('video-export-recorder');

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

export function useVideoExportRecorder() {
  const { t } = useI18n();
  const videoExportSettings = useAppStore((state) => state.videoExportSettings);
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

  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);

  const mp4Supported = useMemo(
    () => MP4_MIME_TYPES.some((mimeType) => MediaRecorder.isTypeSupported(mimeType)),
    []
  );
  const actualFormat = videoExportSettings.format === 'mp4' && !mp4Supported ? 'webm' : videoExportSettings.format;
  const estimatedSize = estimateFileSize(playback.totalDuration, videoExportSettings);
  const overlayRefreshIntervalMs = useMemo(() => getOverlayRefreshIntervalMs(videoExportSettings.fps), [videoExportSettings.fps]);

  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const frameRequestRef = useRef<number | null>(null);
  const frameCleanupRef = useRef<(() => void) | null>(null);
  const cachedOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const overlayBusyRef = useRef(false);
  const overlayLastUpdateRef = useRef(0);
  const cachedLogoRef = useRef<HTMLImageElement | null>(null);
  const html2CanvasLoaderRef = useRef<Promise<boolean> | null>(null);
  const overlayRunIdRef = useRef(0);

  const html2canvas = useCallback(() => window.html2canvas ?? null, []);

  const loadHtml2Canvas = useCallback(async (): Promise<boolean> => {
    if (html2canvas()) return true;
    if (html2CanvasLoaderRef.current) {
      return html2CanvasLoaderRef.current;
    }

    html2CanvasLoaderRef.current = new Promise((resolve) => {
      const existingScript = document.querySelector('script[data-trailreplay-html2canvas="true"]') as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true), { once: true });
        existingScript.addEventListener('error', () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.crossOrigin = 'anonymous';
      script.dataset.trailreplayHtml2canvas = 'true';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });

    return html2CanvasLoaderRef.current;
  }, [html2canvas]);

  const updateOverlayAsync = useCallback(async (recordW: number, recordH: number) => {
    const capture = html2canvas();
    if (overlayBusyRef.current || !capture) return;
    const runId = overlayRunIdRef.current;
    overlayBusyRef.current = true;
    overlayLastUpdateRef.current = Date.now();

    try {
      const container = document.getElementById('map-capture-container');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const { cropX, cropY, scaleToRecording, margin } = getExportOverlayMetrics(containerRect, recordW, recordH);

      const overlay = document.createElement('canvas');
      overlay.width = recordW;
      overlay.height = recordH;
      const overlayContext = overlay.getContext('2d');
      if (!overlayContext) return;

      if (videoExportSettings.includeStats) {
        const statsElement = document.querySelector('.tr-stats-overlay') as HTMLElement | null;
        if (statsElement) {
          try {
            const statsCaptureScale = 4;
            const captureCanvas = await capture(statsElement, {
              backgroundColor: null,
              scale: statsCaptureScale,
              logging: false,
              useCORS: true,
              allowTaint: true,
            });
            const { drawWidth, drawHeight } = getCapturedCanvasDrawSize(captureCanvas, scaleToRecording, statsCaptureScale);
            overlayContext.drawImage(captureCanvas, 0, 0, captureCanvas.width, captureCanvas.height, margin, margin, drawWidth, drawHeight);
          } catch {
            // Skip overlay when capture fails.
          }
        }
      }

      if (videoExportSettings.includeElevation) {
        const elevationElement = document.getElementById('mapElevationProfile') as HTMLElement | null;
        if (elevationElement) {
          try {
            const captureCanvas = await capture(elevationElement, {
              backgroundColor: null,
              scale: 1,
              logging: false,
              useCORS: true,
            });
            const { drawX, drawY, drawWidth, drawHeight } = getElevationOverlayDrawRect({
              captureCanvas,
              scaleToRecording,
              recordW,
              recordH,
              margin,
            });
            overlayContext.drawImage(captureCanvas, 0, 0, captureCanvas.width, captureCanvas.height, drawX, drawY, drawWidth, drawHeight);
          } catch {
            // Skip overlay when capture fails.
          }
        }
      }

      const picturePopupElement = document.querySelector('.tr-picture-popup') as HTMLElement | null;
      if (picturePopupElement) {
        try {
          const popupRect = picturePopupElement.getBoundingClientRect();
          const popupDrawRect = getPopupOverlayDrawRect({
            popupRect,
            containerRect,
            cropX,
            cropY,
            scaleToRecording,
          });

          if (isDrawableRect(popupDrawRect)) {
            const captureCanvas = await capture(picturePopupElement, {
              backgroundColor: null,
              scale: 1,
              logging: false,
              useCORS: true,
              allowTaint: true,
            });
            overlayContext.drawImage(
              captureCanvas,
              0,
              0,
              captureCanvas.width,
              captureCanvas.height,
              popupDrawRect.drawX,
              popupDrawRect.drawY,
              popupDrawRect.drawWidth,
              popupDrawRect.drawHeight
            );

            const popupImageElement = picturePopupElement.querySelector('img') as HTMLImageElement | null;
            if (popupImageElement && popupImageElement.complete && popupImageElement.naturalWidth > 0) {
              const imageRect = popupImageElement.getBoundingClientRect();
              const imageDrawRect = getPopupOverlayDrawRect({
                popupRect: imageRect,
                containerRect,
                cropX,
                cropY,
                scaleToRecording,
              });
              if (isDrawableRect(imageDrawRect)) {
                overlayContext.drawImage(
                  popupImageElement,
                  imageDrawRect.drawX,
                  imageDrawRect.drawY,
                  imageDrawRect.drawWidth,
                  imageDrawRect.drawHeight
                );
              }
            }
          }
        } catch {
          // Skip popup capture when unavailable.
        }
      }

      if (runId === overlayRunIdRef.current) {
        cachedOverlayRef.current = overlay;
      }
    } finally {
      overlayBusyRef.current = false;
    }
  }, [html2canvas, videoExportSettings.includeElevation, videoExportSettings.includeStats]);

  const captureFrame = useCallback(() => {
    if (!recordingCanvasRef.current || !recordingContextRef.current) return;
    const { width: recordW, height: recordH } = videoExportSettings.resolution;
    const context = recordingContextRef.current;
    const mapCanvas = (mapGlobalRef.current?.getCanvas()
      ?? document.querySelector('.maplibregl-canvas')) as HTMLCanvasElement | null;
    const container = document.getElementById('map-capture-container');

    if (!mapCanvas || !container) {
      context.fillStyle = '#000';
      context.fillRect(0, 0, recordW, recordH);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const { cropX, cropY, cropW, cropH } = getCropRegion(containerRect, recordW, recordH);
    const pixelScaleX = mapCanvas.width / containerRect.width;
    const pixelScaleY = mapCanvas.height / containerRect.height;

    context.drawImage(
      mapCanvas,
      cropX * pixelScaleX,
      cropY * pixelScaleY,
      cropW * pixelScaleX,
      cropH * pixelScaleY,
      0,
      0,
      recordW,
      recordH,
    );

    if (cachedOverlayRef.current) {
      context.drawImage(cachedOverlayRef.current, 0, 0, recordW, recordH);
    }

    const markerContainer = document.querySelector('.tr-marker') as HTMLElement | null;
    if (markerContainer) {
      const markerRect = markerContainer.getBoundingClientRect();
      const scaleX = recordW / cropW;
      const scaleY = recordH / cropH;
      const markerX = (markerRect.left + markerRect.width / 2 - containerRect.left - cropX) * scaleX;
      const markerY = (markerRect.top + markerRect.height / 2 - containerRect.top - cropY) * scaleY;

      const circleElement = markerContainer.querySelector('div') as HTMLElement | null;
      if (circleElement) {
        const circleSize = parseFloat(circleElement.style.width || '0');
        const scaledRadius = (circleSize / 2) * scaleX;
        const borderColor = circleElement.style.borderColor || '#FF9800';

        context.fillStyle = circleElement.style.background || 'rgba(255, 152, 0, 0.25)';
        context.beginPath();
        context.arc(markerX, markerY, scaledRadius, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = borderColor;
        context.lineWidth = 2 * scaleX;
        context.stroke();
      }

      const markerEmoji = markerContainer.querySelector('span') as HTMLElement | null;
      if (markerEmoji?.textContent) {
        const fontSize = Math.round(parseFloat(markerEmoji.style.fontSize || '24') * scaleX);
        context.font = `${fontSize}px serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#000000';
        context.fillText(markerEmoji.textContent, markerX, markerY);
      }
    }

    if (cachedLogoRef.current) {
      const logoWidth = Math.round(recordW * 0.14);
      const logoHeight = Math.round(logoWidth / 2.5);
      const margin = Math.round(recordW * 0.025);
      const logoX = recordW - logoWidth - margin;
      const logoY = margin;
      context.save();
      context.globalAlpha = 0.85;
      context.drawImage(cachedLogoRef.current, logoX, logoY, logoWidth, logoHeight);
      context.restore();
    }

    if (Date.now() - overlayLastUpdateRef.current >= overlayRefreshIntervalMs && !overlayBusyRef.current) {
      updateOverlayAsync(recordW, recordH);
    }
  }, [overlayRefreshIntervalMs, updateOverlayAsync, videoExportSettings.resolution]);

  const startFrameCapture = useCallback(() => {
    const map = mapGlobalRef.current;
    const targetFrameInterval = 1000 / videoExportSettings.fps;
    let lastCaptureTime = 0;

    if (!map) {
      const captureLoop = () => {
        if (!isRecordingRef.current) return;
        captureFrame();
        frameRequestRef.current = requestAnimationFrame(captureLoop);
      };
      frameRequestRef.current = requestAnimationFrame(captureLoop);
      return;
    }

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

    const keepRendering = () => {
      if (!isRecordingRef.current) return;
      map.triggerRepaint();
      frameRequestRef.current = requestAnimationFrame(keepRendering);
    };
    frameRequestRef.current = requestAnimationFrame(keepRendering);
  }, [captureFrame, videoExportSettings.fps]);

  const finishRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    logger.info('Finishing export recording', {
      recordedChunkCount: recordedChunksRef.current.length,
    });

    isRecordingRef.current = false;

    if (frameCleanupRef.current) {
      frameCleanupRef.current();
      frameCleanupRef.current = null;
    }
    if (frameRequestRef.current) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }

    setExportStage(t('export.stageFinalizing'));

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, [setExportStage, t]);

  useEffect(() => {
    if (!isRecordingRef.current) return;

    if (animationPhase === 'playing') {
      setExportProgress(playback.progress * 100);
      setExportStage(t('export.recording'));
    } else if (animationPhase === 'intro') {
      setExportStage(t('export.recordingIntro'));
    } else if (animationPhase === 'outro') {
      setExportStage(t('export.recordingOutro'));
    }

    if (animationPhase === 'ended') {
      setTimeout(() => {
        finishRecording();
      }, 1000);
    }
  }, [animationPhase, finishRecording, playback.progress, setExportProgress, setExportStage, t]);

  const handleStartExport = useCallback(async () => {
    const mapCanvas = document.querySelector('.maplibregl-canvas') as HTMLCanvasElement | null;
    if (!mapCanvas) {
      logger.warn('Export start requested without map canvas');
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
    overlayRunIdRef.current += 1;

    try {
      const { width, height } = videoExportSettings.resolution;
      logger.info('Starting video export', {
        format: videoExportSettings.format,
        quality: videoExportSettings.quality,
        fps: videoExportSettings.fps,
        width,
        height,
        includeStats: videoExportSettings.includeStats,
        includeElevation: videoExportSettings.includeElevation,
      });

      setExportStage(t('export.stageCreateCanvas'));
      if (!recordingCanvasRef.current) {
        recordingCanvasRef.current = document.createElement('canvas');
      }
      recordingCanvasRef.current.width = width;
      recordingCanvasRef.current.height = height;
      recordingContextRef.current = recordingCanvasRef.current.getContext('2d');

      setExportStage(t('export.stageLoadOverlay'));
      await loadHtml2Canvas();

      cachedLogoRef.current = null;
      await new Promise<void>((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
          cachedLogoRef.current = image;
          resolve();
        };
        image.onerror = () => resolve();
        image.src = '/media/images/logohorizontal.svg';
      });

      await updateOverlayAsync(width, height);

      setExportStage(t('export.stageResetting'));
      resetPlayback();
      setCinematicPlayed(false);

      await new Promise((resolve) => setTimeout(resolve, 500));

      setExportStage(t('export.stageSetupRecorder'));
      const stream = recordingCanvasRef.current.captureStream(videoExportSettings.fps);
      const { mimeType, actualFormat: recordedFormat } = getSupportedMimeType(videoExportSettings.format);
      const extension = recordedFormat === 'mp4' ? 'mp4' : 'webm';

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: getVideoBitrate(videoExportSettings.quality),
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          logger.debug('Recorded export chunk', {
            chunkSize: event.data.size,
            chunkCount: recordedChunksRef.current.length,
          });
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          setExportedBlob(blob);
          setExportStage(t('export.stageComplete'));
          setExportProgress(100);

          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `trail-replay-${Date.now()}.${extension}`;
          anchor.click();
          URL.revokeObjectURL(url);

          logger.info('Video export completed', {
            mimeType,
            extension,
            blobSize: blob.size,
            chunkCount: recordedChunksRef.current.length,
          });
        } else {
          setExportStage(t('export.stageFailedNoData'));
          logger.warn('Video export stopped without data');
        }
        setIsExporting(false);
      };

      setExportStage(t('export.stageStartingRecording'));
      mediaRecorderRef.current.start(100);
      isRecordingRef.current = true;

      startFrameCapture();
      await new Promise((resolve) => setTimeout(resolve, 200));

      setExportStage(t('export.stageRecordingAnimation'));
      play();
    } catch (error) {
      const message = handleAsyncError(error, {
        scope: 'video-export',
        fallbackMessage: 'Unknown error',
      });
      logger.error('Video export failed', {
        errorMessage: message,
      });
      setExportStage(t('export.stageFailedWithError', { error: message }));
      setIsExporting(false);
      isRecordingRef.current = false;
    }
  }, [loadHtml2Canvas, play, resetPlayback, setCinematicPlayed, setExportProgress, setExportStage, setIsExporting, startFrameCapture, t, updateOverlayAsync, videoExportSettings]);

  const handleCancelExport = useCallback(() => {
    logger.info('Cancelling video export', {
      currentProgress: exportProgress,
      currentStage: exportStage,
    });
    isRecordingRef.current = false;
    cachedOverlayRef.current = null;
    overlayBusyRef.current = false;
    overlayRunIdRef.current += 1;

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
  }, [exportProgress, exportStage, resetPlayback, setExportProgress, setExportStage, setIsExporting]);

  const handleDownload = useCallback(() => {
    if (!exportedBlob) return;

    const extension = exportedBlob.type.startsWith('video/mp4') ? 'mp4' : 'webm';
    const url = URL.createObjectURL(exportedBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `trail-replay-${Date.now()}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [exportedBlob]);

  const resetExportResult = useCallback(() => {
    logger.debug('Resetting export result state');
    setExportedBlob(null);
    setExportProgress(0);
    setExportStage('');
  }, [setExportProgress, setExportStage]);

  return {
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
  };
}
