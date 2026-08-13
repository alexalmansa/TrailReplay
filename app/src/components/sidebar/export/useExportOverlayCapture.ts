import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  getCapturedCanvasDrawSize,
  getElevationOverlayDrawRect,
  getExportOverlayMetrics,
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
  }
) => Promise<HTMLCanvasElement>;

declare global {
  interface Window {
    html2canvas?: Html2Canvas;
  }
}

interface UseExportOverlayCaptureOptions {
  includeElevation: boolean;
  includeStats: boolean;
}

export function useExportOverlayCapture({
  includeElevation,
  includeStats,
}: UseExportOverlayCaptureOptions) {
  const cachedOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const overlayBusyRef = useRef(false);
  const overlayLastUpdateRef = useRef(0);
  const html2CanvasLoaderRef = useRef<Promise<boolean> | null>(null);
  const overlayRunIdRef = useRef(0);

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
            const captureCanvas = await capture(elevationElement, { backgroundColor: null, scale: 1, logging: false, useCORS: true });
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
            const captureCanvas = await capture(picturePopupElement, { backgroundColor: null, scale: 1, logging: false, useCORS: true, allowTaint: true });
            overlayContext.drawImage(captureCanvas, 0, 0, captureCanvas.width, captureCanvas.height, popupDrawRect.drawX, popupDrawRect.drawY, popupDrawRect.drawWidth, popupDrawRect.drawHeight);
            const popupImageElement = picturePopupElement.querySelector('img') as HTMLImageElement | null;
            if (popupImageElement?.complete && popupImageElement.naturalWidth > 0) {
              const imageRect = getPopupOverlayDrawRect({ popupRect: popupImageElement.getBoundingClientRect(), containerRect, cropX, cropY, scaleToRecording });
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

  const resetOverlayCapture = useCallback(() => {
    cachedOverlayRef.current = null;
    overlayBusyRef.current = false;
    overlayLastUpdateRef.current = 0;
    overlayRunIdRef.current += 1;
  }, []);

  return { cachedOverlayRef, loadHtml2Canvas, overlayBusyRef, overlayLastUpdateRef, resetOverlayCapture, updateOverlayAsync };
}
