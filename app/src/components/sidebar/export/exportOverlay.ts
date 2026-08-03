import { getCropRegion } from '@/utils/crop';

type Size = {
  width: number;
  height: number;
};

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ExportOverlayMetrics = ReturnType<typeof getExportOverlayMetrics>;

export function getOverlayRefreshIntervalMs(fps: number) {
  return Math.max(21, Math.round(1000 / Math.min(fps * 2, 48)));
}

export function getExportOverlayMetrics(
  containerRect: Size,
  recordW: number,
  recordH: number
) {
  const { cropX, cropY, cropW, cropH } = getCropRegion(containerRect, recordW, recordH);

  return {
    cropX,
    cropY,
    cropW,
    cropH,
    scaleToRecording: recordW / cropW,
    margin: Math.round(recordW * 0.025),
  };
}

export function getCapturedCanvasDrawSize(
  captureCanvas: Size,
  scaleToRecording: number,
  captureScale: number
) {
  return {
    drawWidth: (captureCanvas.width * scaleToRecording) / captureScale,
    drawHeight: (captureCanvas.height * scaleToRecording) / captureScale,
  };
}

export function getStatsOverlayDrawRect(params: {
  captureCanvas: Size;
  /** Scale used only for width/height computation (pass 1 when width is already pre-scaled). */
  scaleToRecording: number;
  /** Scale used to convert screen-pixel position → recording-pixel position. */
  positionScale?: number;
  recordW: number;
  recordH: number;
  margin: number;
  /** When provided, the stats are drawn at the element's actual screen position. */
  elementRect?: { left: number; top: number };
  containerRect?: { left: number; top: number };
  cropX?: number;
  cropY?: number;
}) {
  const rawWidth = params.captureCanvas.width * params.scaleToRecording;
  const isNarrowFrame = params.recordW <= params.recordH;
  const maxWidth = Math.min(
    rawWidth,
    params.recordW - (params.margin * 2),
    params.recordW * (isNarrowFrame ? 0.56 : 0.28),
  );
  const drawWidth = Math.max(0, maxWidth);
  const drawHeight = params.captureCanvas.height * (drawWidth / params.captureCanvas.width);

  // Mirror the element's actual DOM position into video coordinates.
  if (params.elementRect && params.containerRect && params.cropX !== undefined && params.cropY !== undefined) {
    const posScale = params.positionScale ?? params.scaleToRecording;
    const drawX = (params.elementRect.left - params.containerRect.left - params.cropX) * posScale;
    const drawY = (params.elementRect.top - params.containerRect.top - params.cropY) * posScale;
    return {
      drawX: Math.max(0, drawX),
      drawY: Math.max(0, drawY),
      drawWidth,
      drawHeight,
    };
  }

  return {
    drawX: isNarrowFrame ? (params.recordW - drawWidth) / 2 : params.margin,
    drawY: params.margin,
    drawWidth,
    drawHeight,
  };
}

export function getElevationOverlayDrawRect(params: {
  captureCanvas: Size;
  scaleToRecording: number;
  recordW: number;
  recordH: number;
  margin: number;
}) {
  const rawWidth = params.captureCanvas.width * params.scaleToRecording;
  const drawWidth = Math.min(rawWidth, params.recordW * 0.85);
  const drawHeight = params.captureCanvas.height * (drawWidth / params.captureCanvas.width);

  return {
    drawX: (params.recordW - drawWidth) / 2,
    drawY: params.recordH - drawHeight - params.margin,
    drawWidth,
    drawHeight,
  };
}

export function getPopupOverlayDrawRect(params: {
  popupRect: Rect;
  containerRect: Rect;
  cropX: number;
  cropY: number;
  scaleToRecording: number;
}) {
  return {
    drawX: (params.popupRect.left - params.containerRect.left - params.cropX) * params.scaleToRecording,
    drawY: (params.popupRect.top - params.containerRect.top - params.cropY) * params.scaleToRecording,
    drawWidth: params.popupRect.width * params.scaleToRecording,
    drawHeight: params.popupRect.height * params.scaleToRecording,
  };
}

export function isDrawableRect(rect: { drawWidth: number; drawHeight: number }) {
  return rect.drawWidth > 0 && rect.drawHeight > 0;
}
