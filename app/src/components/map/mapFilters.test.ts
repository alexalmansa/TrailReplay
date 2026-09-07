import { describe, expect, it, vi } from 'vitest';
import type maplibregl from 'maplibre-gl';
import {
  BASEMAP_FILTER_PAINT,
  FILTERABLE_BASEMAP_LAYER_IDS,
  applyBasemapFilter,
} from './mapFilters';

function fakeMap(existingLayerIds: string[]) {
  const setPaintProperty = vi.fn();
  return {
    map: {
      getLayer: (id: string) => (existingLayerIds.includes(id) ? { id } : undefined),
      setPaintProperty,
    } as unknown as maplibregl.Map,
    setPaintProperty,
  };
}

describe('applyBasemapFilter', () => {
  it('desaturates every basemap layer that exists', () => {
    const { map, setPaintProperty } = fakeMap(['background', 'fallback-satellite']);

    applyBasemapFilter(map, 'mono');

    expect(setPaintProperty).toHaveBeenCalledWith('background', 'raster-saturation', -1);
    expect(setPaintProperty).toHaveBeenCalledWith('fallback-satellite', 'raster-saturation', -1);
  });

  it('skips layers the current style has not added', () => {
    const { map, setPaintProperty } = fakeMap([]);

    applyBasemapFilter(map, 'noir');

    expect(setPaintProperty).not.toHaveBeenCalled();
  });

  it('restores neutral paint for the "none" filter', () => {
    const { map, setPaintProperty } = fakeMap(['background']);

    applyBasemapFilter(map, 'none');

    expect(setPaintProperty).toHaveBeenCalledWith('background', 'raster-saturation', 0);
    expect(setPaintProperty).toHaveBeenCalledWith('background', 'raster-contrast', 0);
    expect(setPaintProperty).toHaveBeenCalledWith('background', 'raster-brightness-max', 1);
  });

  it('covers the wayback layers, which are re-added outside the static style', () => {
    expect(FILTERABLE_BASEMAP_LAYER_IDS).toContain('wayback');
    expect(FILTERABLE_BASEMAP_LAYER_IDS).toContain('fallback-wayback');
  });

  it('keeps every filter fully desaturated or neutral, never over-saturated', () => {
    Object.values(BASEMAP_FILTER_PAINT).forEach((paint) => {
      expect(paint['raster-saturation']).toBeLessThanOrEqual(0);
      expect(paint['raster-saturation']).toBeGreaterThanOrEqual(-1);
    });
  });
});
