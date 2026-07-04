import type { OverlayPosition } from '@/types';

export function resolveOverlayPlacement(
  position: OverlayPosition,
  frameWidth: number,
  frameHeight: number,
): {
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
} {
  if (position === 'auto') {
    // Legacy behavior: narrow/portrait frames centered, wide/landscape top-left.
    // Matches the old getStatsOverlayDrawRect isNarrowFrame rule (width <= height).
    const isNarrow = frameWidth <= frameHeight;
    return { vertical: 'top', horizontal: isNarrow ? 'center' : 'left' };
  }

  const [vertical, horizontal] = position.split('-') as [
    'top' | 'bottom',
    'left' | 'center' | 'right',
  ];
  return { vertical, horizontal };
}

export function computeOverlayDrawPosition(params: {
  position: OverlayPosition;
  frameLeft: number;
  frameTop: number;
  frameWidth: number;
  frameHeight: number;
  overlayWidth: number;
  overlayHeight: number;
  margin: number;
}): { drawX: number; drawY: number } {
  const { vertical, horizontal } = resolveOverlayPlacement(
    params.position,
    params.frameWidth,
    params.frameHeight,
  );

  let drawX: number;
  if (horizontal === 'left') {
    drawX = params.frameLeft + params.margin;
  } else if (horizontal === 'right') {
    drawX = params.frameLeft + params.frameWidth - params.overlayWidth - params.margin;
  } else {
    drawX = params.frameLeft + (params.frameWidth - params.overlayWidth) / 2;
  }

  const drawY =
    vertical === 'top'
      ? params.frameTop + params.margin
      : params.frameTop + params.frameHeight - params.overlayHeight - params.margin;

  return { drawX, drawY };
}
