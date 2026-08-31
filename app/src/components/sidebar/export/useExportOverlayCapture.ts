import { useCallback, useMemo, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getElevationAtProgress } from '@/components/map/elevationProfile';
import { TRANSPORT_ICONS } from '@/utils/journeyUtils';
import { convertElevation } from '@/utils/units';
import {
  getCapturedCanvasDrawSize,
  getElevationOverlayDrawRect,
  getExportOverlayMetrics,
  getObjectContainRect,
  getPopupOverlayDrawRect,
  getStatsOverlayDrawRect,
  isDrawableRect,
} from './exportOverlay';

type Html2Canvas = (
  element: HTMLElement,
  options: {
    backgroundColor: string | null;
    scale: number;
    logging: boolean;
    useCORS: boolean;
    allowTaint?: boolean;
    ignoreElements?: (element: Element) => boolean;
  }
) => Promise<HTMLCanvasElement>;

declare global {
  interface Window {
    html2canvas?: Html2Canvas;
  }
}

interface UseExportOverlayCaptureOptions {
  elevationData: Array<{
    elevation: number;
    progress: number;
    segmentIndex: number;
    segmentType: 'track' | 'transport';
  }>;
  includeElevation: boolean;
  includeStats: boolean;
}

export function useExportOverlayCapture({
  elevationData,
  includeElevation,
  includeStats,
}: UseExportOverlayCaptureOptions) {
  const cachedOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const overlayBusyRef = useRef(false);
  const overlayLastUpdateRef = useRef(0);
  const html2CanvasLoaderRef = useRef<Promise<boolean> | null>(null);
  const overlayRunIdRef = useRef(0);
  const elevationPathCacheRef = useRef(new Map<string, Path2D>());
  const elevationSegments = useMemo(() => {
    const segments = new Map<number, {
      points: Array<{ elevation: number; progress: number }>;
      type: 'track' | 'transport';
    }>();

    elevationData.forEach((sample) => {
      const segment = segments.get(sample.segmentIndex) ?? {
        points: [],
        type: sample.segmentType,
      };
      segment.points.push({ elevation: sample.elevation, progress: sample.progress });
      segments.set(sample.segmentIndex, segment);
    });
    segments.forEach((segment) => segment.points.sort((a, b) => a.progress - b.progress));
    return segments;
  }, [elevationData]);

  const loadHtml2Canvas = useCallback(async (): Promise<boolean> => {
    if (window.html2canvas) return true;
    if (html2CanvasLoaderRef.current) return html2CanvasLoaderRef.current;

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
  }, []);

  const updateOverlayAsync = useCallback(async (recordW: number, recordH: number) => {
    const capture = window.html2canvas;
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

      if (includeStats) {
        const statsElement = document.querySelector('.tr-stats-overlay') as HTMLElement | null;
        if (statsElement) {
          try {
            const statsCaptureScale = 4;
            const statsRect = statsElement.getBoundingClientRect();
            const captureCanvas = await capture(statsElement, { backgroundColor: null, scale: statsCaptureScale, logging: false, useCORS: true, allowTaint: true });
            const { drawWidth, drawHeight } = getCapturedCanvasDrawSize(captureCanvas, scaleToRecording, statsCaptureScale);
            const hasCustomPosition = useAppStore.getState().settings.statsPosition !== null;
            const statsDrawRect = getStatsOverlayDrawRect({
              captureCanvas: { width: drawWidth, height: drawHeight }, scaleToRecording: 1, positionScale: scaleToRecording, recordW, recordH, margin,
              ...(hasCustomPosition && { elementRect: statsRect, containerRect, cropX, cropY }),
            });
            overlayContext.drawImage(captureCanvas, 0, 0, captureCanvas.width, captureCanvas.height, statsDrawRect.drawX, statsDrawRect.drawY, statsDrawRect.drawWidth, statsDrawRect.drawHeight);
          } catch { /* Skip overlay when capture fails. */ }
        }
      }

      if (includeElevation) {
        const elevationElement = document.getElementById('mapElevationProfile') as HTMLElement | null;
        if (elevationElement) {
          try {
            const captureCanvas = await capture(elevationElement, {
              backgroundColor: null,
              scale: 1,
              logging: false,
              useCORS: true,
              // The progress fill and elevation label are drawn directly onto
              // every video frame below. Keeping them out of this comparatively
              // expensive DOM snapshot prevents a stale 12fps copy underneath.
              ignoreElements: (element) => element.hasAttribute('data-export-elevation-dynamic'),
            });
            const rect = getElevationOverlayDrawRect({ captureCanvas, scaleToRecording, recordW, recordH, margin });
            overlayContext.drawImage(captureCanvas, 0, 0, captureCanvas.width, captureCanvas.height, rect.drawX, rect.drawY, rect.drawWidth, rect.drawHeight);
          } catch { /* Skip overlay when capture fails. */ }
        }
      }

      const picturePopupElement = document.querySelector('.tr-picture-popup') as HTMLElement | null;
      if (picturePopupElement) {
        try {
          const popupRect = picturePopupElement.getBoundingClientRect();
          const popupDrawRect = getPopupOverlayDrawRect({ popupRect, containerRect, cropX, cropY, scaleToRecording });
          if (isDrawableRect(popupDrawRect)) {
            // html2canvas doesn't reliably support `object-fit: contain` —
            // it can tile/repeat the source image to fill the element's box
            // instead of letterboxing it, which showed up as the correctly
            // sized photo with a stretched, repeated copy behind it. Skip
            // the <img> in this capture entirely (chrome only: rounded
            // corners, shadow, progress bar, caption gradient) and rely
            // solely on the manually contain-fitted `drawImage` below for
            // the actual photo.
            const captureCanvas = await capture(picturePopupElement, {
              backgroundColor: null,
              scale: 1,
              logging: false,
              useCORS: true,
              allowTaint: true,
              ignoreElements: (element) => element.tagName === 'IMG',
            });
            overlayContext.drawImage(captureCanvas, 0, 0, captureCanvas.width, captureCanvas.height, popupDrawRect.drawX, popupDrawRect.drawY, popupDrawRect.drawWidth, popupDrawRect.drawHeight);
            const popupImageElement = picturePopupElement.querySelector('img') as HTMLImageElement | null;
            if (popupImageElement?.complete && popupImageElement.naturalWidth > 0) {
              // The <img> is styled object-fit: contain, so its own bounding
              // box is the *full* popup box, not the letterboxed photo
              // within it — draw into the contain-fitted sub-rect instead,
              // or the natural image gets stretched to fill the whole box.
              const containRect = getObjectContainRect(
                popupImageElement.getBoundingClientRect(),
                popupImageElement.naturalWidth,
                popupImageElement.naturalHeight,
              );
              const imageRect = getPopupOverlayDrawRect({ popupRect: containRect, containerRect, cropX, cropY, scaleToRecording });
              if (isDrawableRect(imageRect)) overlayContext.drawImage(popupImageElement, imageRect.drawX, imageRect.drawY, imageRect.drawWidth, imageRect.drawHeight);
            }
          }
        } catch { /* Skip popup capture when unavailable. */ }
      }

      if (runId === overlayRunIdRef.current) cachedOverlayRef.current = overlay;
    } finally {
      overlayBusyRef.current = false;
    }
  }, [includeElevation, includeStats]);

  const drawElevationProgress = useCallback((
    context: CanvasRenderingContext2D,
    {
      recordW,
      recordH,
      scaleToRecording,
    }: {
      recordW: number;
      recordH: number;
      scaleToRecording: number;
    },
  ) => {
    if (!includeElevation || typeof Path2D === 'undefined') return;

    const svg = document.getElementById('elevationProfileSvg') as SVGSVGElement | null;
    const elevationElement = document.getElementById('mapElevationProfile');
    if (!svg || !elevationElement) return;

    const viewBox = svg.viewBox.baseVal;
    if (viewBox.width <= 0 || viewBox.height <= 0) return;

    const elementRect = elevationElement.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    if (elementRect.width <= 0 || elementRect.height <= 0) return;

    // Match the exact centered/constrained rect used for the cached static
    // elevation snapshot, then place the SVG and label within that rect using
    // their DOM-relative positions.
    const overlayRect = getElevationOverlayDrawRect({
      captureCanvas: { width: elementRect.width, height: elementRect.height },
      scaleToRecording,
      recordW,
      recordH,
      margin: Math.round(recordW * 0.025),
    });
    const elementScaleX = overlayRect.drawWidth / elementRect.width;
    const elementScaleY = overlayRect.drawHeight / elementRect.height;
    const drawX = overlayRect.drawX + (svgRect.left - elementRect.left) * elementScaleX;
    const drawY = overlayRect.drawY + (svgRect.top - elementRect.top) * elementScaleY;
    const drawWidth = svgRect.width * elementScaleX;
    const drawHeight = svgRect.height * elementScaleY;
    const progress = Math.max(0, Math.min(1, useAppStore.getState().playback.progress));

    context.save();
    context.translate(drawX, drawY);
    context.scale(drawWidth / viewBox.width, drawHeight / viewBox.height);
    context.beginPath();
    context.rect(viewBox.x, viewBox.y, viewBox.width * progress, viewBox.height);
    context.clip();

    svg.querySelectorAll<SVGPathElement>('[data-export-elevation-segment]').forEach((element) => {
      const pathData = element.getAttribute('d');
      if (!pathData) return;

      let path = elevationPathCacheRef.current.get(pathData);
      if (!path) {
        path = new Path2D(pathData);
        elevationPathCacheRef.current.set(pathData, path);
      }

      const color = svg.dataset.exportElevationProgressColor
        || element.dataset.exportElevationColor
        || '#c1652f';
      context.globalAlpha = 0.7;
      context.fillStyle = color;
      context.fill(path);
      context.globalAlpha = 1;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke(path);
    });
    context.restore();

    if (progress <= 0) return;

    let currentSegment: {
      points: Array<{ elevation: number; progress: number }>;
      type: 'track' | 'transport';
    } | undefined;
    let currentSegmentIndex = 0;
    elevationSegments.forEach((segment, segmentIndex) => {
      const first = segment.points[0];
      const last = segment.points[segment.points.length - 1];
      if (first && last && progress >= first.progress && progress <= last.progress) {
        currentSegment = segment;
        currentSegmentIndex = segmentIndex;
      }
    });
    if (!currentSegment) return;

    const state = useAppStore.getState();
    const unitSystem = state.settings.unitSystem;
    const isCompact = recordW > recordH;
    const centerX = drawX + progress * drawWidth;
    const baselineY = overlayRect.drawY
      + overlayRect.drawHeight
      - (isCompact ? 4 : 8) * elementScaleY;

    context.save();
    context.textBaseline = 'bottom';
    context.fillStyle = '#ffffff';
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 5 * elementScaleY;
    context.shadowOffsetY = 2 * elementScaleY;

    if (currentSegment.type === 'transport') {
      const journeySegment = state.journeySegments[currentSegmentIndex];
      const mode = journeySegment?.type === 'transport' ? journeySegment.mode : 'car';
      const icon = TRANSPORT_ICONS[mode] || '🚗';
      context.font = `${(isCompact ? 12 : 18) * elementScaleY}px sans-serif`;
      context.textAlign = 'center';
      context.fillText(icon, centerX, baselineY);
    } else {
      const elevation = getElevationAtProgress(currentSegment.points, progress);
      const value = String(Math.round(convertElevation(elevation, unitSystem)));
      const unit = unitSystem === 'metric' ? 'M' : 'FT';
      const valueSize = (isCompact ? 14 : 22) * elementScaleY;
      const unitSize = (isCompact ? 9 : 14) * elementScaleY;
      const gap = (isCompact ? 4 : 6) * elementScaleX;
      const family = 'JetBrains Mono, monospace';

      context.font = `700 ${valueSize}px ${family}`;
      const valueWidth = context.measureText(value).width;
      context.font = `600 ${unitSize}px ${family}`;
      const unitWidth = context.measureText(unit).width;
      let textX = centerX - (valueWidth + gap + unitWidth) / 2;

      context.textAlign = 'left';
      context.font = `700 ${valueSize}px ${family}`;
      context.fillText(value, textX, baselineY);
      textX += valueWidth + gap;
      context.font = `600 ${unitSize}px ${family}`;
      context.fillText(unit, textX, baselineY);
    }
    context.restore();
  }, [elevationSegments, includeElevation]);

  const resetOverlayCapture = useCallback(() => {
    cachedOverlayRef.current = null;
    overlayBusyRef.current = false;
    overlayLastUpdateRef.current = 0;
    overlayRunIdRef.current += 1;
    elevationPathCacheRef.current.clear();
  }, []);

  return {
    cachedOverlayRef,
    drawElevationProgress,
    loadHtml2Canvas,
    overlayBusyRef,
    overlayLastUpdateRef,
    resetOverlayCapture,
    updateOverlayAsync,
  };
}
