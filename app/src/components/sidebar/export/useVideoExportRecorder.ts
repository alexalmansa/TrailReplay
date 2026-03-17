import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { estimateFileSize } from '@/utils/videoExport';
import { mapGlobalRef } from '@/utils/mapRef';
import { useI18n } from '@/i18n/useI18n';
import {
  getSupportedMimeType,
  getVideoBitrate,
  MP4_MIME_TYPES,
} from './exportConfig';
import { drawExportFrame, updateExportOverlayAsync } from './exportCanvasComposer';
import { loadHtml2Canvas, resolveHtml2Canvas } from './html2canvasLoader';

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

  const updateOverlayAsync = useCallback(async (recordW: number, recordH: number) => {
    await updateExportOverlayAsync({
      capture: resolveHtml2Canvas(),
      includeElevation: videoExportSettings.includeElevation,
      includeStats: videoExportSettings.includeStats,
      isOverlayBusy: overlayBusyRef.current,
      onOverlayBusyChange: (isBusy) => {
        overlayBusyRef.current = isBusy;
      },
      onOverlayReady: (overlay) => {
        cachedOverlayRef.current = overlay;
      },
      onOverlayTimestamp: (timestamp) => {
        overlayLastUpdateRef.current = timestamp;
      },
      recordHeight: recordH,
      recordWidth: recordW,
    });
  }, [videoExportSettings.includeElevation, videoExportSettings.includeStats]);

  const captureFrame = useCallback(() => {
    if (!recordingCanvasRef.current || !recordingContextRef.current) return;
    const { width: recordW, height: recordH } = videoExportSettings.resolution;
    drawExportFrame({
      cachedLogo: cachedLogoRef.current,
      cachedOverlay: cachedOverlayRef.current,
      onOverlayRefreshNeeded: (width, height) => {
        void updateOverlayAsync(width, height);
      },
      overlayBusy: overlayBusyRef.current,
      overlayLastUpdate: overlayLastUpdateRef.current,
      recordHeight: recordH,
      recordWidth: recordW,
      recordingContext: recordingContextRef.current,
    });
  }, [updateOverlayAsync, videoExportSettings.resolution]);

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
        } else {
          setExportStage(t('export.stageFailedNoData'));
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
      console.error('Export failed:', error);
      setExportStage(t('export.stageFailedWithError', { error: (error as Error).message }));
      setIsExporting(false);
      isRecordingRef.current = false;
    }
  }, [play, resetPlayback, setCinematicPlayed, setExportProgress, setExportStage, setIsExporting, startFrameCapture, t, updateOverlayAsync, videoExportSettings]);

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
  }, [resetPlayback, setExportProgress, setExportStage, setIsExporting]);

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
