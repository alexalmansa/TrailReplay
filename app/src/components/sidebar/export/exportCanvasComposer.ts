import { getCropRegion } from '@/utils/crop';
import { mapGlobalRef } from '@/utils/mapRef';
import type { Html2Canvas } from './html2canvasLoader';

export async function updateExportOverlayAsync(params: {
  capture: Html2Canvas | null;
  includeElevation: boolean;
  includeStats: boolean;
  isOverlayBusy: boolean;
  onOverlayBusyChange: (isBusy: boolean) => void;
  onOverlayTimestamp: (timestamp: number) => void;
  onOverlayReady: (overlay: HTMLCanvasElement) => void;
  recordHeight: number;
  recordWidth: number;
}) {
  const {
    capture,
    includeElevation,
    includeStats,
    isOverlayBusy,
    onOverlayBusyChange,
    onOverlayReady,
    onOverlayTimestamp,
    recordHeight,
    recordWidth,
  } = params;

  if (isOverlayBusy || !capture) return;
  onOverlayBusyChange(true);
  onOverlayTimestamp(Date.now());

  try {
    const container = document.getElementById('map-capture-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const { cropX, cropY, cropW } = getCropRegion(containerRect, recordWidth, recordHeight);
    const scaleToRecording = recordWidth / cropW;
    const margin = Math.round(recordWidth * 0.025);

    const overlay = document.createElement('canvas');
    overlay.width = recordWidth;
    overlay.height = recordHeight;
    const overlayContext = overlay.getContext('2d');
    if (!overlayContext) return;

    if (includeStats) {
      await drawCapturedElement({
        capture,
        draw: (canvas) => {
          const drawWidth = canvas.width * scaleToRecording / 2;
          const drawHeight = canvas.height * scaleToRecording / 2;
          overlayContext.drawImage(canvas, 0, 0, canvas.width, canvas.height, margin, margin, drawWidth, drawHeight);
        },
        element: document.querySelector('.tr-stats-overlay') as HTMLElement | null,
        options: { backgroundColor: null, scale: 2, logging: false, useCORS: true, allowTaint: true },
      });
    }

    if (includeElevation) {
      await drawCapturedElement({
        capture,
        draw: (canvas) => {
          const rawWidth = canvas.width * scaleToRecording;
          const drawWidth = Math.min(rawWidth, recordWidth * 0.85);
          const drawHeight = canvas.height * (drawWidth / canvas.width);
          const drawX = (recordWidth - drawWidth) / 2;
          const drawY = recordHeight - drawHeight - margin;
          overlayContext.drawImage(canvas, 0, 0, canvas.width, canvas.height, drawX, drawY, drawWidth, drawHeight);
        },
        element: document.getElementById('mapElevationProfile') as HTMLElement | null,
        options: { backgroundColor: null, scale: 1, logging: false, useCORS: true },
      });
    }

    const picturePopupElement = document.querySelector('.tr-picture-popup') as HTMLElement | null;
    if (picturePopupElement) {
      try {
        const popupRect = picturePopupElement.getBoundingClientRect();
        const popupX = (popupRect.left - containerRect.left - cropX) * scaleToRecording;
        const popupY = (popupRect.top - containerRect.top - cropY) * scaleToRecording;
        const popupWidth = popupRect.width * scaleToRecording;
        const popupHeight = popupRect.height * scaleToRecording;

        if (popupWidth > 0 && popupHeight > 0) {
          const captureCanvas = await capture(picturePopupElement, {
            backgroundColor: null,
            scale: 1,
            logging: false,
            useCORS: true,
            allowTaint: true,
          });
          overlayContext.drawImage(captureCanvas, 0, 0, captureCanvas.width, captureCanvas.height, popupX, popupY, popupWidth, popupHeight);

          const popupImageElement = picturePopupElement.querySelector('img') as HTMLImageElement | null;
          if (popupImageElement && popupImageElement.complete && popupImageElement.naturalWidth > 0) {
            const imageRect = popupImageElement.getBoundingClientRect();
            const imageX = (imageRect.left - containerRect.left - cropX) * scaleToRecording;
            const imageY = (imageRect.top - containerRect.top - cropY) * scaleToRecording;
            const imageWidth = imageRect.width * scaleToRecording;
            const imageHeight = imageRect.height * scaleToRecording;
            overlayContext.drawImage(popupImageElement, imageX, imageY, imageWidth, imageHeight);
          }
        }
      } catch {
        // Skip popup capture when unavailable.
      }
    }

    onOverlayReady(overlay);
  } finally {
    onOverlayBusyChange(false);
  }
}

export function drawExportFrame(params: {
  cachedLogo: HTMLImageElement | null;
  cachedOverlay: HTMLCanvasElement | null;
  onOverlayRefreshNeeded: (recordWidth: number, recordHeight: number) => void;
  overlayBusy: boolean;
  overlayLastUpdate: number;
  recordHeight: number;
  recordWidth: number;
  recordingContext: CanvasRenderingContext2D;
}) {
  const {
    cachedLogo,
    cachedOverlay,
    onOverlayRefreshNeeded,
    overlayBusy,
    overlayLastUpdate,
    recordHeight,
    recordWidth,
    recordingContext,
  } = params;

  const mapCanvas = (mapGlobalRef.current?.getCanvas()
    ?? document.querySelector('.maplibregl-canvas')) as HTMLCanvasElement | null;
  const container = document.getElementById('map-capture-container');

  if (!mapCanvas || !container) {
    recordingContext.fillStyle = '#000';
    recordingContext.fillRect(0, 0, recordWidth, recordHeight);
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const { cropX, cropY, cropW, cropH } = getCropRegion(containerRect, recordWidth, recordHeight);
  const pixelScaleX = mapCanvas.width / containerRect.width;
  const pixelScaleY = mapCanvas.height / containerRect.height;

  recordingContext.drawImage(
    mapCanvas,
    cropX * pixelScaleX,
    cropY * pixelScaleY,
    cropW * pixelScaleX,
    cropH * pixelScaleY,
    0,
    0,
    recordWidth,
    recordHeight
  );

  if (cachedOverlay) {
    recordingContext.drawImage(cachedOverlay, 0, 0, recordWidth, recordHeight);
  }

  drawMarkerOverlay(recordingContext, containerRect, cropH, cropW, cropX, cropY, recordHeight, recordWidth);

  if (cachedLogo) {
    const logoWidth = Math.round(recordWidth * 0.14);
    const logoHeight = Math.round(logoWidth / 2.5);
    const margin = Math.round(recordWidth * 0.025);
    const logoX = recordWidth - logoWidth - margin;
    const logoY = margin;
    recordingContext.save();
    recordingContext.globalAlpha = 0.85;
    recordingContext.drawImage(cachedLogo, logoX, logoY, logoWidth, logoHeight);
    recordingContext.restore();
  }

  if (Date.now() - overlayLastUpdate > 150 && !overlayBusy) {
    onOverlayRefreshNeeded(recordWidth, recordHeight);
  }
}

async function drawCapturedElement(params: {
  capture: Html2Canvas;
  draw: (canvas: HTMLCanvasElement) => void;
  element: HTMLElement | null;
  options: Parameters<Html2Canvas>[1];
}) {
  const { capture, draw, element, options } = params;
  if (!element) return;

  try {
    const canvas = await capture(element, options);
    draw(canvas);
  } catch {
    // Skip overlay when capture fails.
  }
}

function drawMarkerOverlay(
  context: CanvasRenderingContext2D,
  containerRect: DOMRect,
  cropH: number,
  cropW: number,
  cropX: number,
  cropY: number,
  recordHeight: number,
  recordWidth: number
) {
  const markerContainer = document.querySelector('.tr-marker') as HTMLElement | null;
  if (!markerContainer) return;

  const markerRect = markerContainer.getBoundingClientRect();
  const scaleX = recordWidth / cropW;
  const scaleY = recordHeight / cropH;
  const markerX = (markerRect.left + markerRect.width / 2 - containerRect.left - cropX) * scaleX;
  const markerY = (markerRect.top + markerRect.height / 2 - containerRect.top - cropY) * scaleY;

  const circleElement = markerContainer.querySelector('div') as HTMLElement | null;
  if (circleElement) {
    const circleSize = parseFloat(circleElement.style.width || '0');
    const scaledRadius = (circleSize / 2) * scaleX;
    context.fillStyle = circleElement.style.background || 'rgba(255, 152, 0, 0.25)';
    context.beginPath();
    context.arc(markerX, markerY, scaledRadius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = circleElement.style.borderColor || '#FF9800';
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
