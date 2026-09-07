import type { ExpressionSpecification, LayerSpecification } from 'maplibre-gl';
import {
  landmarkTextHaloWidth,
  landmarkTextOpacityExpression,
  landmarkTextSizeExpression,
} from '@/components/map/landmarkLabelStyle';

export const LANDMARK_SOURCE_ID = 'route-landmarks';
export const LANDMARK_ICON_LAYER_ID = 'route-landmarks-icon';
export const LANDMARK_LABEL_LAYER_ID = 'route-landmarks-label';
export const LANDMARK_IMAGE_PREFIX = 'route-landmark-glyph-';

const isSelected: ExpressionSpecification = ['boolean', ['get', 'selected'], false];

/**
 * Every landmark icon is drawn, always: overlap is allowed so collisions never
 * silently drop pins. Only labels yield to each other, through text-optional.
 *
 * The zoom interpolation has to stay the outermost expression — MapLibre
 * rejects a layer whose zoom curve is nested inside another expression — so the
 * selected/unselected size choice sits inside each stop instead.
 */
export function landmarkIconLayer(): LayerSpecification {
  return {
    id: LANDMARK_ICON_LAYER_ID,
    type: 'symbol',
    source: LANDMARK_SOURCE_ID,
    layout: {
      'icon-image': ['concat', LANDMARK_IMAGE_PREFIX, ['get', 'icon']],
      'icon-size': ['interpolate', ['linear'], ['zoom'],
        7, ['case', isSelected, 0.7, 0.52],
        9, ['case', isSelected, 0.84, 0.62],
        15, ['case', isSelected, 1.24, 0.92],
      ],
      'icon-pitch-alignment': 'viewport',
      'icon-rotation-alignment': 'viewport',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'symbol-sort-key': ['get', 'importance'],
    },
    paint: {
      'icon-color': ['get', 'color'],
      'icon-opacity': ['get', 'opacity'],
    },
  } as LayerSpecification;
}

export function landmarkLabelLayer(labelScale: number, labelFade: boolean): LayerSpecification {
  return {
    id: LANDMARK_LABEL_LAYER_ID,
    type: 'symbol',
    source: LANDMARK_SOURCE_ID,
    layout: {
      'text-field': ['get', 'title'],
      'text-font': ['Open Sans Bold'],
      'text-size': landmarkTextSizeExpression(labelScale),
      'text-max-width': 11,
      'text-offset': [0, 1.7],
      'text-anchor': 'top',
      // Labels, unlike icons, drop out when they cannot be placed without
      // overlapping — a wall of colliding names is worse than a missing one.
      'text-optional': true,
      'text-pitch-alignment': 'viewport',
      'symbol-sort-key': ['get', 'importance'],
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#030506',
      'text-halo-width': landmarkTextHaloWidth(labelScale),
      'text-halo-blur': 0.6,
      'text-opacity': landmarkTextOpacityExpression(labelFade),
    },
  } as LayerSpecification;
}
