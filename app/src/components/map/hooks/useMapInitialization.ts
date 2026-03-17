import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { mapGlobalRef } from '@/utils/mapRef';
import { registerAspectProtocol, registerSlopeProtocol } from '@/components/map/terrainProtocols';
import { MAP_STYLE } from '@/components/map/mapStyle';
import { setupTrackSources } from '@/components/map/mapSetup';

interface UseMapInitializationParams {
  mapContainer: React.RefObject<HTMLDivElement | null>;
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  onReadyChange?: (isReady: boolean) => void;
  onSetMapLoaded: (isLoaded: boolean) => void;
}

export function useMapInitialization({
  mapContainer,
  mapRef,
  onReadyChange,
  onSetMapLoaded,
}: UseMapInitializationParams) {
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    onReadyChange?.(false);

    registerSlopeProtocol();
    registerAspectProtocol();

    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE as unknown as maplibregl.StyleSpecification,
      center: [0, 0],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      maxPitch: 85,
      preserveDrawingBuffer: true,
      attributionControl: false,
    } as ConstructorParameters<typeof maplibregl.Map>[0]);

    mapGlobalRef.current = mapRef.current;

    mapRef.current.on('load', () => {
      onSetMapLoaded(true);
      onReadyChange?.(true);
      mapRef.current?.addControl(new maplibregl.NavigationControl(), 'top-right');
      mapRef.current?.addControl(new maplibregl.FullscreenControl(), 'top-right');
      if (mapRef.current) {
        setupTrackSources(mapRef.current, '#C1652F');
      }
    });

    return () => {
      onReadyChange?.(false);
      mapGlobalRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapContainer, mapRef, onReadyChange, onSetMapLoaded]);
}
