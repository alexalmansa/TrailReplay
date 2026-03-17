import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import type { AppSettings, TrailStyleSettings } from '@/types';

interface UseBaseMapPresentationOptions {
  currentTrackColor: string | null;
  currentTrackName: string | null;
  isMapLoaded: boolean;
  mapRef: React.RefObject<maplibregl.Map | null>;
  settings: AppSettings;
  trailStyle: TrailStyleSettings;
}

export function useBaseMapPresentation({
  currentTrackColor,
  currentTrackName,
  isMapLoaded,
  mapRef,
  settings,
  trailStyle,
}: UseBaseMapPresentationOptions) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const layerMap: Record<string, string> = {
      satellite: 'background',
      street: 'street',
      topo: 'opentopomap',
      outdoor: 'opentopomap',
      'esri-clarity': 'esri-clarity',
      wayback: 'wayback',
    };

    const targetLayer = layerMap[settings.mapStyle] || 'background';

    ['background', 'street', 'opentopomap', 'enhanced-hillshade', 'esri-clarity', 'wayback'].forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', 'none');
      }
    });

    if (map.getLayer(targetLayer)) {
      map.setLayoutProperty(targetLayer, 'visibility', 'visible');
    }

    if (map.getLayer('ski-pistes')) {
      map.setLayoutProperty('ski-pistes', 'visibility', settings.mapOverlays?.skiPistes ? 'visible' : 'none');
    }

    if (map.getLayer('slope-overlay')) {
      map.setLayoutProperty('slope-overlay', 'visibility', settings.mapOverlays?.slopeOverlay ? 'visible' : 'none');
    }

    if (map.getLayer('aspect-overlay')) {
      map.setLayoutProperty('aspect-overlay', 'visibility', settings.mapOverlays?.aspectOverlay ? 'visible' : 'none');
    }

    const showLabels = ['street', 'topo', 'outdoor'].includes(settings.mapStyle)
      || !!settings.mapOverlays?.placeLabels;
    if (map.getLayer('carto-labels')) {
      map.setLayoutProperty('carto-labels', 'visibility', showLabels ? 'visible' : 'none');
    }
  }, [
    isMapLoaded,
    mapRef,
    settings.mapOverlays?.aspectOverlay,
    settings.mapOverlays?.placeLabels,
    settings.mapOverlays?.skiPistes,
    settings.mapOverlays?.slopeOverlay,
    settings.mapStyle,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || !settings.waybackItemURL) return;

    const tileUrl = settings.waybackItemURL
      .replace('{level}', '{z}')
      .replace('{row}', '{y}')
      .replace('{col}', '{x}');
    const isWaybackActive = settings.mapStyle === 'wayback';

    if (map.getLayer('wayback')) map.removeLayer('wayback');
    if (map.getSource('wayback')) map.removeSource('wayback');

    map.addSource('wayback', {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
      attribution: '© Esri — Source: Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
    });
    map.addLayer(
      { id: 'wayback', type: 'raster', source: 'wayback', layout: { visibility: isWaybackActive ? 'visible' : 'none' } },
      'carto-labels'
    );
  }, [isMapLoaded, mapRef, settings.mapStyle, settings.waybackItemURL]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const color = currentTrackColor || trailStyle.trailColor;

    if (trailStyle.colorMode !== 'heartRate') {
      if (map.getLayer('trail-line')) {
        map.setPaintProperty('trail-line', 'line-color', color);
      }
      if (map.getLayer('trail-completed')) {
        map.setPaintProperty('trail-completed', 'line-color', color);
      }
    } else {
      if (map.getLayer('trail-line')) {
        map.setPaintProperty('trail-line', 'line-color', ['coalesce', ['get', 'color'], color]);
      }
      if (map.getLayer('trail-completed')) {
        map.setPaintProperty('trail-completed', 'line-color', ['coalesce', ['get', 'color'], color]);
      }
    }
  }, [currentTrackColor, isMapLoaded, mapRef, trailStyle.colorMode, trailStyle.trailColor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    if (map.getLayer('main-track-label')) {
      map.setLayoutProperty('main-track-label', 'visibility', trailStyle.showTrackLabels ? 'visible' : 'none');
      const color = currentTrackColor || trailStyle.trailColor;
      map.setPaintProperty('main-track-label', 'text-color', color);
    }

    if (map.getSource('main-track-label')) {
      (map.getSource('main-track-label') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: { label: currentTrackName || '' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      });
    }
  }, [currentTrackColor, currentTrackName, isMapLoaded, mapRef, trailStyle.showTrackLabels, trailStyle.trailColor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    if (settings.show3DTerrain) {
      if (map.getSource('terrain-dem')) {
        map.setTerrain({
          source: 'terrain-dem',
          exaggeration: 1.5
        });
      }
      return;
    }

    map.setTerrain(null);
  }, [isMapLoaded, mapRef, settings.show3DTerrain]);
}
