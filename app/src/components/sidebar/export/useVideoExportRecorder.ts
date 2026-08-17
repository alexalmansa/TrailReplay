import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import fixWebmDuration from 'fix-webm-duration';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { estimateFileSize } from '@/utils/videoExport';
import { mapGlobalRef } from '@/utils/mapRef';
import { useI18n } from '@/i18n/useI18n';
import { getCropRegion } from '@/utils/crop';
import {
  getBlobSizeBucket,
  getDurationBucket,
  getProgressBucket,
  trackEvent,
} from '@/utils/analytics';
import { getActivityIconOption, isSvgActivityIcon } from '@/utils/activityIcons';
import {
  getSupportedMimeType,
  getVideoBitrate,
  MP4_MIME_TYPES,
} from './exportConfig';
import {
  createMp4CanvasEncoder,
  isWebCodecsMp4Supported,
  type Mp4CanvasEncoder,
} from './mp4CanvasEncoder';
import { getOverlayRefreshIntervalMs } from './exportOverlay';
import { useExportOverlayCapture } from './useExportOverlayCapture';
import { INTRO_DURATION, OUTRO_DELAY, OUTRO_DURATION } from '@/components/playback/PlaybackProvider';
import {
  getIntroCameraPose,
  getOpeningPreloadProgresses,
  getPlaybackCameraPose,
  type ReplayCameraPose,
} from '@/utils/replayCameraPlan';

const EXPORT_MAP_SETTLE_MS = 150;
const EXPORT_TILE_PRELOAD_TIMEOUT_MS = 6000;
const EXPORT_OPENING_WINDOW_MS = 20000;
const EXPORT_OPENING_SAMPLE_COUNT = 8;

function extractCssUrl(value: string): string | null {
  const match = value.match(/url\((['"]?)(.*?)\1\)/);
  return match?.[2] ?? null;
}

function drawTintedSvgIcon(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  options: {
    centerX: number;
    centerY: number;
    color: string;
    height: number;
    width: number;
  },
) {
  const offscreen = document.createElement('canvas');
  offscreen.width = Math.max(1, Math.round(options.width));
  offscreen.height = Math.max(1, Math.round(options.height));
  const offscreenContext = offscreen.getContext('2d');
  if (!offscreenContext) return;

  offscreenContext.clearRect(0, 0, offscreen.width, offscreen.height);
  offscreenContext.drawImage(image, 0, 0, offscreen.width, offscreen.height);
  offscreenContext.globalCompositeOperation = 'source-in';
  offscreenContext.fillStyle = options.color;
  offscreenContext.fillRect(0, 0, offscreen.width, offscreen.height);

  context.drawImage(
    offscreen,
    options.centerX - options.width / 2,
    options.centerY - options.height / 2,
    options.width,
    options.height,
  );
}

export function useVideoExportRecorder() {
  const { t } = useI18n();
  const videoExportSettings = useAppStore((state) => state.videoExportSettings);
  const visibleStats = useAppStore((state) => state.settings.visibleStats);
  const showElevationProfile = useAppStore((state) => state.settings.showElevationProfile);
  const tracks = useAppStore((state) => state.tracks);
  const pictures = useAppStore((state) => state.pictures);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const trailStyle = useAppStore((state) => state.settings.trailStyle);
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const playback = useAppStore((state) => state.playback);
  const animationPhase = useAppStore((state) => state.animationPhase);
  const isExporting = useAppStore((state) => state.isExporting);
  const exportProgress = useAppStore((state) => state.exportProgress);
  const exportStage = useAppStore((state) => state.exportStage);
  const setIsExporting = useAppStore((state) => state.setIsExporting);
  const setIsDeterministicExport = useAppStore((state) => state.setIsDeterministicExport);
  const setExportProgress = useAppStore((state) => state.setExportProgress);
  const setExportStage = useAppStore((state) => state.setExportStage);
  const resetPlayback = useAppStore((state) => state.resetPlayback);
  const setSpeed = useAppStore((state) => state.setSpeed);
  const play = useAppStore((state) => state.play);
  const setCinematicPlayed = useAppStore((state) => state.setCinematicPlayed);
  const { cameraPathCoordinates, elevationData } = useComputedJourney();

  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);

  const mp4Supported = useMemo(
    () =>
      isWebCodecsMp4Supported() ||
      MP4_MIME_TYPES.some((mimeType) => MediaRecorder.isTypeSupported(mimeType)),
    []
  );
  const actualFormat = videoExportSettings.format === 'mp4' && !mp4Supported ? 'webm' : videoExportSettings.format;
  const estimatedSize = estimateFileSize(playback.totalDuration, videoExportSettings);
  const includeStats = visibleStats.length > 0;
  const includeElevation = showElevationProfile;
  const overlayRefreshIntervalMs = useMemo(() => getOverlayRefreshIntervalMs(videoExportSettings.fps), [videoExportSettings.fps]);
  const {
    cachedOverlayRef,
    loadHtml2Canvas,
    overlayBusyRef,
    overlayLastUpdateRef,
    resetOverlayCapture,
    updateOverlayAsync,
  } = useExportOverlayCapture({
    includeElevation,
    includeStats,
  });

  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef(0);
  const isRecordingRef = useRef(false);
  const recordingCancelledRef = useRef(false);
  const mp4EncoderRef = useRef<Mp4CanvasEncoder | null>(null);
  const useWebCodecsRef = useRef(false);
  const frameRequestRef = useRef<number | null>(null);
  const frameCleanupRef = useRef<(() => void) | null>(null);
  const cachedLogoRef = useRef<HTMLImageElement | null>(null);
  const svgMarkerImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const pendingSvgMarkerLoadsRef = useRef<Set<string>>(new Set());

  const preloadSvgMarkerIcon = useCallback((url: string) => {
    if (!url || svgMarkerImageCacheRef.current.has(url) || pendingSvgMarkerLoadsRef.current.has(url)) {
      return;
    }

    pendingSvgMarkerLoadsRef.current.add(url);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => {
      svgMarkerImageCacheRef.current.set(url, image);
      pendingSvgMarkerLoadsRef.current.delete(url);
    };
    image.onerror = () => {
      pendingSvgMarkerLoadsRef.current.delete(url);
    };
    image.src = url;
  }, []);

  useEffect(() => {
    const iconValues = new Set<string>([trailStyle.currentIcon]);
    tracks.forEach((track) => iconValues.add(track.activityIcon));

    iconValues.forEach((iconValue) => {
      if (!isSvgActivityIcon(iconValue)) return;
      const svgIconUrl = getActivityIconOption(iconValue)?.content;
      if (svgIconUrl) {
        preloadSvgMarkerIcon(svgIconUrl);
      }
    });
  }, [preloadSvgMarkerIcon, tracks, trailStyle.currentIcon]);

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

      const markerIcon = markerContainer.querySelector('span') as HTMLElement | null;
      if (markerIcon) {
        const markerIconWidth = parseFloat(markerIcon.style.width || '24') * scaleX;
        const markerIconHeight = parseFloat(markerIcon.style.height || '24') * scaleY;
        const maskImage = markerIcon.style.maskImage || markerIcon.style.webkitMaskImage || '';
        const maskUrl = extractCssUrl(maskImage);

        if (maskUrl) {
          const markerSvg = svgMarkerImageCacheRef.current.get(maskUrl);
          if (markerSvg) {
            drawTintedSvgIcon(context, markerSvg, {
              centerX: markerX,
              centerY: markerY,
              color: markerIcon.style.backgroundColor || '#000000',
              width: markerIconWidth,
              height: markerIconHeight,
            });
          } else {
            preloadSvgMarkerIcon(maskUrl);
          }
        } else if (markerIcon.textContent) {
          const fontSize = Math.round(parseFloat(markerIcon.style.fontSize || '24') * scaleX);
          context.font = `${fontSize}px serif`;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillStyle = '#000000';
          context.fillText(markerIcon.textContent, markerX, markerY);
        }
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
  }, [cachedOverlayRef, overlayBusyRef, overlayLastUpdateRef, overlayRefreshIntervalMs, preloadSvgMarkerIcon, updateOverlayAsync, videoExportSettings.resolution]);

  // When encoding via WebCodecs, push the freshly drawn canvas to the encoder.
  // No-op for the MediaRecorder path, which samples the canvas stream itself.
  const encodeWebCodecsFrame = useCallback(async (timestampMicros?: number) => {
    if (!useWebCodecsRef.current || !mp4EncoderRef.current || !recordingCanvasRef.current) return;
    const elapsedMicros = timestampMicros ?? (performance.now() - recordingStartTimeRef.current) * 1000;
    await mp4EncoderRef.current.encodeCanvas(recordingCanvasRef.current, elapsedMicros);
  }, []);

  const startFrameCapture = useCallback(() => {
    const map = mapGlobalRef.current;
    const targetFrameInterval = 1000 / videoExportSettings.fps;
    let lastCaptureTime = 0;

    if (!map) {
      const captureLoop = () => {
        if (!isRecordingRef.current) return;
        const now = performance.now();
        if (now - lastCaptureTime >= targetFrameInterval) {
          captureFrame();
          void encodeWebCodecsFrame();
          lastCaptureTime = now;
        }
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
        void encodeWebCodecsFrame();
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
  }, [captureFrame, encodeWebCodecsFrame, videoExportSettings.fps]);

  const waitForMapFrame = useCallback(async () => {
    // Let React commit the new replay state, then wait for MapLibre to draw it.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const map = mapGlobalRef.current;
    if (!map) return;

    await new Promise<void>((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };
      map.once('render', finish);
      map.triggerRepaint();
      // A render event is normally immediate. Keep export cancellable if a map
      // implementation declines to render while its style is changing.
      requestAnimationFrame(() => requestAnimationFrame(finish));
    });
  }, []);

  const preloadExportOpeningTiles = useCallback(async () => {
    const map = mapGlobalRef.current;
    if (!map || cameraSettings.mode === 'overview' || cameraPathCoordinates.length === 0) return;

    const routeDurationMs = useAppStore.getState().playback.totalDuration || 60_000;
    const introPose = getIntroCameraPose({
      cameraMode: cameraSettings.mode,
      coordinates: cameraPathCoordinates,
      elevationData,
      followBehindZoomLevel: cameraSettings.followBehindZoomLevel,
      progress: 0,
    });
    const poses = [
      introPose,
      ...getOpeningPreloadProgresses(
        routeDurationMs,
        EXPORT_OPENING_WINDOW_MS,
        EXPORT_OPENING_SAMPLE_COUNT,
      ).map((progress) => getPlaybackCameraPose({
        cameraMode: cameraSettings.mode,
        coordinates: cameraPathCoordinates,
        elevationData,
        followBehindZoomLevel: cameraSettings.followBehindZoomLevel,
        progress,
      })),
    ].filter((pose): pose is ReplayCameraPose => pose !== null);

    const overview = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
    };
    const deadline = Date.now() + EXPORT_TILE_PRELOAD_TIMEOUT_MS;

    for (const pose of poses) {
      if (recordingCancelledRef.current || Date.now() >= deadline) break;
      map.jumpTo(pose);
      await new Promise<void>((resolve) => {
        let complete = false;
        const finish = () => {
          if (complete) return;
          complete = true;
          map.off('idle', finish);
          resolve();
        };
        map.once('idle', finish);
        window.setTimeout(finish, Math.max(0, deadline - Date.now()));
      });
    }

    map.jumpTo(overview);
    await waitForMapFrame();
  }, [cameraPathCoordinates, cameraSettings.followBehindZoomLevel, cameraSettings.mode, elevationData, waitForMapFrame]);

  const captureDeterministicPhase = useCallback(async (
    durationMs: number,
    timestampOffsetMs: number,
  ) => {
    const frameDurationMs = 1000 / videoExportSettings.fps;
    const frameCount = Math.max(1, Math.ceil(durationMs / frameDurationMs));
    const phaseStartTime = performance.now();

    for (let frameIndex = 0; frameIndex <= frameCount; frameIndex += 1) {
      if (!isRecordingRef.current || recordingCancelledRef.current) break;
      await waitForMapFrame();
      if (!isRecordingRef.current || recordingCancelledRef.current) break;
      captureFrame();
      await encodeWebCodecsFrame((timestampOffsetMs + (frameIndex * frameDurationMs)) * 1000);
      if (frameIndex < frameCount) {
        // Map rendering already consumes part of this frame's budget. Waiting a
        // full additional frame interval made the intro/outro take roughly twice
        // as long to export, while the encoded timestamps and pixels stayed the
        // same. Only wait for the remainder needed to preserve their timeline.
        const nextFrameDueAt = phaseStartTime + ((frameIndex + 1) * frameDurationMs);
        const remainingDelayMs = Math.max(0, nextFrameDueAt - performance.now());
        if (remainingDelayMs > 0) {
          await new Promise<void>((resolve) => window.setTimeout(resolve, remainingDelayMs));
        }
      }
    }
  }, [captureFrame, encodeWebCodecsFrame, videoExportSettings.fps, waitForMapFrame]);

  // Flush and download the WebCodecs-encoded MP4 once recording has stopped.
  const finalizeWebCodecsExport = useCallback(async () => {
    const encoder = mp4EncoderRef.current;
    if (!encoder) return;
    mp4EncoderRef.current = null;
    useWebCodecsRef.current = false;

    if (recordingCancelledRef.current) {
      encoder.close();
      setIsExporting(false);
      resetPlayback();
      return;
    }

    try {
      const blob = await encoder.finalize();
      if (blob.size > 0) {
        setExportedBlob(blob);
        setExportStage(t('export.stageComplete'));
        setExportProgress(100);
        trackEvent('export_completed', {
          export_blob_size_bucket: getBlobSizeBucket(blob.size),
          export_format: 'mp4',
          export_encoder_path: 'webcodecs',
          export_duration_bucket: getDurationBucket(playback.totalDuration),
        });

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `trail-replay-${Date.now()}.mp4`;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        setExportStage(t('export.stageFailedNoData'));
        trackEvent('export_failed', {
          export_failure_scope: 'no_data',
          export_format: 'mp4',
          export_encoder_path: 'webcodecs',
        });
      }
    } catch (error) {
      console.error('WebCodecs export failed', error);
      setExportStage(t('export.stageFailedWithError', { error: (error as Error).message }));
      trackEvent('export_failed', {
        export_failure_scope: 'encoder_finalize',
        export_format: 'mp4',
        export_encoder_path: 'webcodecs',
      });
    } finally {
      setIsDeterministicExport(false);
      setIsExporting(false);
      // Deterministic export drives the animation directly through its outro.
      // Restore an idle, replayable timeline once the file has been finalized.
      resetPlayback();
    }
  }, [playback.totalDuration, resetPlayback, setExportProgress, setExportStage, setIsDeterministicExport, setIsExporting, t]);

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

    if (useWebCodecsRef.current) {
      void finalizeWebCodecsExport();
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      // Flush the trailing partial timeslice before stopping so the tail of
      // the animation isn't dropped from the recording.
      if (recorder.state === 'recording') {
        try {
          recorder.requestData();
        } catch {
          // requestData can throw if the recorder already stopped; ignore.
        }
      }
      recorder.stop();
    }
  }, [finalizeWebCodecsExport, setExportStage, t]);

  const runDeterministicExport = useCallback(async () => {
    if (!mp4EncoderRef.current) return;

    const { fps } = videoExportSettings;
    const frameDurationMs = 1000 / fps;
    const store = useAppStore.getState();
    const routeDurationMs = store.playback.totalDuration;
    // Preview speed only affects interactive playback. Export always preserves
    // the configured journey duration on the encoded timeline.
    const frameCount = Math.ceil(routeDurationMs / frameDurationMs);
    const progressUpdateInterval = Math.max(1, Math.round(fps / 5));

    setIsDeterministicExport(true);
    store.setPlayback({ isPlaying: true, currentTime: 0, progress: 0 });
    // Start the cinematic movement first and wait for its first rendered frame.
    // This ensures the video begins from the actual introductory camera pose,
    // rather than catching the map halfway through a state transition.
    store.setCinematicPlayed(false);
    store.setAnimationPhase('intro');
    await waitForMapFrame();
    await captureDeterministicPhase(INTRO_DURATION, 0);

    if (!isRecordingRef.current || recordingCancelledRef.current) return;

    store.setCinematicPlayed(true);
    store.setAnimationPhase('playing');
    let encodedDurationMs = INTRO_DURATION;

    // The intro already contains the progress-zero pose. Begin at the first
    // advancing route frame so the cut into the route has no duplicate hold.
    for (let frameIndex = 1; frameIndex <= frameCount; frameIndex += 1) {
      if (!isRecordingRef.current || recordingCancelledRef.current) break;

      const currentTime = Math.min(routeDurationMs, frameIndex * frameDurationMs);
      const progress = routeDurationMs > 0 ? currentTime / routeDurationMs : 1;
      useAppStore.getState().setPlayback({ currentTime, progress });
      await waitForMapFrame();

      if (!isRecordingRef.current || recordingCancelledRef.current) break;
      captureFrame();
      await encodeWebCodecsFrame((encodedDurationMs + (frameIndex * frameDurationMs)) * 1000);

      if (frameIndex % progressUpdateInterval === 0 || frameIndex === frameCount) {
        setExportProgress(progress * 100);
        setExportStage(t('export.recording'));
      }
    }

    encodedDurationMs += frameCount * frameDurationMs;
    if (!recordingCancelledRef.current && isRecordingRef.current) {
      // Mirror the on-screen finale: a short hold at the finish, then the
      // outward camera move. Both are encoded before the file is finalized.
      store.setPlayback({ isPlaying: false, currentTime: routeDurationMs, progress: 1 });
      if (OUTRO_DELAY > 0) {
        store.setAnimationPhase('playing');
        await captureDeterministicPhase(OUTRO_DELAY, encodedDurationMs);
        encodedDurationMs += OUTRO_DELAY;
      }

      if (!isRecordingRef.current || recordingCancelledRef.current) return;
      store.setAnimationPhase('outro');
      await captureDeterministicPhase(OUTRO_DURATION, encodedDurationMs);
    }

    if (!recordingCancelledRef.current) finishRecording();
  }, [captureDeterministicPhase, captureFrame, encodeWebCodecsFrame, finishRecording, setExportProgress, setExportStage, setIsDeterministicExport, t, videoExportSettings, waitForMapFrame]);

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

  // Fallback path when WebCodecs MP4 encoding isn't available: record the canvas
  // stream with MediaRecorder. For WebM output we patch the duration on stop so
  // the file stays seekable and doesn't freeze in players other than Chrome.
  const setupMediaRecorderFallback = useCallback(() => {
    if (!recordingCanvasRef.current) return;

    const stream = recordingCanvasRef.current.captureStream(videoExportSettings.fps);
    const { mimeType, actualFormat: recordedFormat } = getSupportedMimeType(videoExportSettings.format);
    const extension = recordedFormat === 'mp4' ? 'mp4' : 'webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: getVideoBitrate(videoExportSettings.quality),
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      // A cancelled export still fires onstop; don't save or download it.
      if (recordingCancelledRef.current) {
        setIsExporting(false);
        resetPlayback();
        return;
      }
      let blob = new Blob(recordedChunksRef.current, { type: mimeType });
      if (blob.size > 0) {
        // MediaRecorder writes WebM without a Duration/Cues header, so many
        // players (QuickTime, Windows, social uploads, editors) freeze after
        // the first cluster. Patch in the real measured duration so the file
        // is seekable and plays to the end everywhere.
        if (recordedFormat === 'webm') {
          const durationMs = recordingStartTimeRef.current > 0
            ? performance.now() - recordingStartTimeRef.current
            : 0;
          if (durationMs > 0) {
            try {
              blob = await fixWebmDuration(blob, durationMs, { logger: false });
            } catch (fixError) {
              console.warn('Failed to patch WebM duration, using raw recording', fixError);
            }
          }
        }

        setExportedBlob(blob);
        setExportStage(t('export.stageComplete'));
        setExportProgress(100);
        trackEvent('export_completed', {
          export_blob_size_bucket: getBlobSizeBucket(blob.size),
          export_format: extension,
          export_encoder_path: 'mediarecorder',
          export_duration_bucket: getDurationBucket(playback.totalDuration),
        });

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `trail-replay-${Date.now()}.${extension}`;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        setExportStage(t('export.stageFailedNoData'));
        trackEvent('export_failed', {
          export_failure_scope: 'no_data',
          export_format: extension,
          export_encoder_path: 'mediarecorder',
        });
      }
      setIsExporting(false);
      // The screen-recording fallback completes after the normal animation has
      // reached its finale. Reset so the next Play starts a fresh replay.
      resetPlayback();
    };

    recorder.onerror = (event) => {
      // On weaker hardware the encoder can stall or error partway through a
      // high-resolution recording. Stop the capture loop and let onstop
      // finalize whatever was captured so the user still gets a video.
      console.error('MediaRecorder error during export', event);
      trackEvent('export_failed', {
        export_failure_scope: 'recorder_error',
        export_format: recordedFormat,
        export_encoder_path: 'mediarecorder',
      });
      if (frameCleanupRef.current) {
        frameCleanupRef.current();
        frameCleanupRef.current = null;
      }
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
        frameRequestRef.current = null;
      }
      isRecordingRef.current = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };

    recorder.start(100);
  }, [playback.totalDuration, resetPlayback, setExportProgress, setExportStage, setIsExporting, t, videoExportSettings]);

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
    recordingCancelledRef.current = false;
    setIsDeterministicExport(false);
    useWebCodecsRef.current = false;
    mp4EncoderRef.current = null;
    resetOverlayCapture();
    trackEvent('export_started', {
      export_format: actualFormat,
      export_quality: videoExportSettings.quality,
      export_fps: videoExportSettings.fps,
      export_aspect_ratio: videoExportSettings.aspectRatio,
      export_include_stats: includeStats,
      export_include_elevation: includeElevation,
      export_duration_bucket: getDurationBucket(playback.totalDuration),
      track_count: tracks.length,
      picture_count: pictures.length,
      journey_segment_count: journeySegments.length,
    });

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
      const exportSpeed = useAppStore.getState().playback.speed;
      resetPlayback();
      setSpeed(exportSpeed);
      setCinematicPlayed(false);

      setExportStage(t('export.stagePreparing'));
      await preloadExportOpeningTiles();

      // Let MapLibre complete its reset pose before starting the intro and its
      // first encoded frame. This avoids a recording that begins mid-reframe.
      await new Promise((resolve) => setTimeout(resolve, EXPORT_MAP_SETTLE_MS));

      setExportStage(t('export.stageSetupRecorder'));

      // Preferred path: encode MP4 with WebCodecs + mp4-muxer. This produces a
      // clean, seekable file with a real moov/duration, avoiding the fragmented
      // MediaRecorder MP4 that freezes after the first fragment in many players.
      if (videoExportSettings.format === 'mp4') {
        try {
          mp4EncoderRef.current = await createMp4CanvasEncoder({
            width,
            height,
            fps: videoExportSettings.fps,
            bitrate: getVideoBitrate(videoExportSettings.quality),
          });
          useWebCodecsRef.current = mp4EncoderRef.current !== null;
        } catch (encoderError) {
          console.warn('WebCodecs MP4 encoder unavailable, falling back to MediaRecorder', encoderError);
          mp4EncoderRef.current = null;
          useWebCodecsRef.current = false;
        }
      }

      if (!useWebCodecsRef.current) {
        setupMediaRecorderFallback();
      }

      setExportStage(t('export.stageStartingRecording'));
      recordingStartTimeRef.current = performance.now();
      isRecordingRef.current = true;

      setExportStage(t('export.stageRecordingAnimation'));
      if (useWebCodecsRef.current) {
        void runDeterministicExport().catch((error) => {
          console.error('Deterministic export failed', error);
          setExportStage(t('export.stageFailedWithError', { error: (error as Error).message }));
          finishRecording();
        });
      } else {
        startFrameCapture();
        await new Promise((resolve) => setTimeout(resolve, 200));
        play();
      }
    } catch (error) {
      console.error('Export failed:', error);
      trackEvent('export_failed', {
        export_failure_scope: 'setup',
        export_format: actualFormat,
        export_encoder_path: useWebCodecsRef.current ? 'webcodecs' : 'unknown',
      });
      setExportStage(t('export.stageFailedWithError', { error: (error as Error).message }));
      setIsExporting(false);
      setIsDeterministicExport(false);
      resetPlayback();
      isRecordingRef.current = false;
      if (mp4EncoderRef.current) {
        mp4EncoderRef.current.close();
        mp4EncoderRef.current = null;
      }
      useWebCodecsRef.current = false;
    }
  }, [actualFormat, finishRecording, includeElevation, includeStats, journeySegments.length, loadHtml2Canvas, pictures.length, play, playback.totalDuration, preloadExportOpeningTiles, resetOverlayCapture, resetPlayback, runDeterministicExport, setCinematicPlayed, setExportProgress, setExportStage, setIsDeterministicExport, setIsExporting, setSpeed, setupMediaRecorderFallback, startFrameCapture, t, tracks.length, updateOverlayAsync, videoExportSettings]);

  const handleCancelExport = useCallback(() => {
    const exportEncoderPath = useWebCodecsRef.current ? 'webcodecs' : 'mediarecorder';
    isRecordingRef.current = false;
    recordingCancelledRef.current = true;
    resetOverlayCapture();

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
    if (mp4EncoderRef.current) {
      mp4EncoderRef.current.close();
      mp4EncoderRef.current = null;
    }
    useWebCodecsRef.current = false;
    setIsDeterministicExport(false);

    trackEvent('export_cancelled', {
      export_progress_bucket: getProgressBucket(exportProgress),
      export_format: actualFormat,
      export_encoder_path: exportEncoderPath,
    });
    setIsExporting(false);
    setExportProgress(0);
    setExportStage('');
    resetPlayback();
  }, [actualFormat, exportProgress, resetOverlayCapture, resetPlayback, setExportProgress, setExportStage, setIsDeterministicExport, setIsExporting]);

  const handleDownload = useCallback(() => {
    if (!exportedBlob) return;

    const extension = exportedBlob.type.startsWith('video/mp4') ? 'mp4' : 'webm';
    const url = URL.createObjectURL(exportedBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `trail-replay-${Date.now()}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
    trackEvent('export_downloaded_again', { export_format: extension });
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
