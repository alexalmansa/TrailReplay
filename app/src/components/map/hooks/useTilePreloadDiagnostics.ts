import { useEffect, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import {
  getMapLibreTileKey,
  NOOP_TILE_PRELOAD_OBSERVER,
  TilePreloadDiagnostics,
  type TilePreloadObserver,
} from '@/utils/tilePreloadDiagnostics';

export function useTilePreloadDiagnostics({
  isMapLoaded,
  isPlaying,
  mapRef,
}: {
  isMapLoaded: boolean;
  isPlaying: boolean;
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
}) {
  const [diagnostics] = useState<TilePreloadObserver>(() => (
    import.meta.env.DEV ? new TilePreloadDiagnostics() : NOOP_TILE_PRELOAD_OBSERVER
  ));
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
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
    if (!(diagnostics instanceof TilePreloadDiagnostics)) return;
    window.__trailReplayTileDiagnostics = () => diagnostics.snapshot();
    const publishSnapshot = () => {
      document.documentElement.dataset.tilePreloadDiagnostics = JSON.stringify(diagnostics.snapshot().summary);
    };
    publishSnapshot();
    const intervalId = window.setInterval(publishSnapshot, 500);

    return () => {
      window.clearInterval(intervalId);
      delete window.__trailReplayTileDiagnostics;
      delete document.documentElement.dataset.tilePreloadDiagnostics;
    };
  }, [diagnostics]);

  return diagnostics;
}
