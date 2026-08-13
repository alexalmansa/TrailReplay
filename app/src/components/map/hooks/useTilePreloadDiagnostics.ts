import { useEffect, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { getMapLibreTileKey, TilePreloadDiagnostics } from '@/utils/tilePreloadDiagnostics';

export function useTilePreloadDiagnostics({
  isMapLoaded,
  isPlaying,
  mapRef,
}: {
  isMapLoaded: boolean;
  isPlaying: boolean;
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
}) {
  const [diagnostics] = useState(() => new TilePreloadDiagnostics());
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;
    const sourceId = (event: unknown) => (event as { sourceId?: string }).sourceId;
    const onLoading = (event: unknown) => {
      if (!isPlayingRef.current) return;
      const key = getMapLibreTileKey(event);
      const source = sourceId(event);
      if (key && source) diagnostics.requestVisibleTile(source, key);
    };
    const onData = (event: unknown) => {
      const key = getMapLibreTileKey(event);
      const source = sourceId(event);
      if (key && source) diagnostics.markTileReady(source, key);
    };

    map.on('sourcedataloading', onLoading);
    map.on('sourcedata', onData);
    return () => {
      map.off('sourcedataloading', onLoading);
      map.off('sourcedata', onData);
    };
  }, [diagnostics, isMapLoaded, mapRef]);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;
    window.__trailReplayTileDiagnostics = () => diagnostics.snapshot();
    return () => { delete window.__trailReplayTileDiagnostics; };
  }, [diagnostics]);

  return diagnostics;
}
