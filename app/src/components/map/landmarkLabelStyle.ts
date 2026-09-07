import type { ExpressionSpecification } from 'maplibre-gl';

export const MIN_LANDMARK_LABEL_SCALE = 0.7;
export const MAX_LANDMARK_LABEL_SCALE = 1.8;

/** Zoom/size stops the labels used before the size control existed. */
const BASE_TEXT_SIZE_STOPS: [number, number][] = [
  [7, 9],
  [9, 10],
  [11, 12],
  [15, 13],
];

export function clampLandmarkLabelScale(scale: number | undefined) {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(MAX_LANDMARK_LABEL_SCALE, Math.max(MIN_LANDMARK_LABEL_SCALE, scale as number));
}

/** Text size ramp, with every stop scaled by the user's label size setting. */
export function landmarkTextSizeExpression(scale: number | undefined): ExpressionSpecification {
  const factor = clampLandmarkLabelScale(scale);
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    ...BASE_TEXT_SIZE_STOPS.flatMap(([zoom, size]) => [zoom, Math.round(size * factor * 10) / 10]),
  ] as ExpressionSpecification;
}

/** Halo grows with the text so large labels keep their contrast over imagery. */
export function landmarkTextHaloWidth(scale: number | undefined) {
  return Math.round(3.5 * clampLandmarkLabelScale(scale) * 10) / 10;
}

/**
 * With fade on, labels ease in over a couple of zoom levels instead of popping
 * into place; each feature's own opacity stays the ceiling either way.
 */
export function landmarkTextOpacityExpression(fade: boolean): ExpressionSpecification {
  if (!fade) {
    return ['get', 'opacity'] as ExpressionSpecification;
  }

  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    8, 0,
    10.5, ['get', 'opacity'],
  ] as ExpressionSpecification;
}
