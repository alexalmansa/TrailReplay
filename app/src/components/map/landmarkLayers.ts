import type { LayerSpecification } from 'maplibre-gl';
import {
  landmarkIconSizeExpression,
  landmarkTextHaloWidth,
  landmarkTextOpacityExpression,
  landmarkTextSizeExpression,
} from '@/components/map/landmarkSymbolStyle';

export const LANDMARK_SOURCE_ID = 'route-landmarks';
export const LANDMARK_ICON_LAYER_ID = 'route-landmarks-icon';
export const LANDMARK_LABEL_LAYER_ID = 'route-landmarks-label';
export const LANDMARK_IMAGE_PREFIX = 'route-landmark-glyph-';

/**
 * Every landmark icon is drawn, always: overlap is allowed so collisions never
 * silently drop pins. Only labels yield to each other, through text-optional.
 */
export function landmarkIconLayer(scale: number): LayerSpecification {
  return {
    id: LANDMARK_ICON_LAYER_ID,
    type: 'symbol',
    source: LANDMARK_SOURCE_ID,
    layout: {
      'icon-image': ['concat', LANDMARK_IMAGE_PREFIX, ['get', 'icon']],
      'icon-size': landmarkIconSizeExpression(scale),
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

export function landmarkLabelLayer(scale: number, labelFade: boolean): LayerSpecification {
  return {
    id: LANDMARK_LABEL_LAYER_ID,
    type: 'symbol',
    source: LANDMARK_SOURCE_ID,
    layout: {
      'text-field': ['get', 'title'],
      'text-font': ['Open Sans Bold'],
      'text-size': landmarkTextSizeExpression(scale),
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
      'text-halo-width': landmarkTextHaloWidth(scale),
      'text-halo-blur': 0.6,
      'text-opacity': landmarkTextOpacityExpression(labelFade),
    },
  } as LayerSpecification;
}
