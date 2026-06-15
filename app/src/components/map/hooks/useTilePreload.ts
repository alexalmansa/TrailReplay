import { useEffect, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import { getFollowBehindCameraTarget } from '@/utils/followBehindCamera';
import {
  calculateTerrainAwareAdjustments,
  TERRAIN_CAMERA_SETTINGS,
} from '@/components/map/cameraUtils';

// Safety net so a slow or offline tile server can never wedge the UI in the
// preloading phase. If `idle` hasn't fired by now, advance to the intro anyway.
const PRELOAD_TIMEOUT_MS = 6000;

type AnimationPhase = 'idle' | 'preloading' | 'intro' | 'playing' | 'outro' | 'ended';

interface UseTilePreloadParams {
  allCoordinates: number[][];
  animationPhase: AnimationPhase;
  elevationData: Array<{ elevation: number; progress?: number }>;
  followBehindZoomLevel: number;
  isMapLoaded: boolean;
  isPlaying: boolean;
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  setAnimationPhase: (phase: AnimationPhase) => void;
  smoothBearingRef: React.MutableRefObject<number>;
  targetBearingRef: React.MutableRefObject<number>;
}

/**
 * While `animationPhase === 'preloading'`, instantly jump the (overlay-covered)
 * camera to the intro's final target so MapLibre fetches exactly the tiles the
 * cinematic intro and playback will start with. Once those tiles are loaded
 * (`map.once('idle')`) — or a safety timeout elapses — snap the camera back to
 * the overview and advance to the `intro` phase. The intro flyTo then animates
 * from the overview against a warm tile cache, so no white tiles appear.
 *
 * Fixes issue #63 (3D missing map tiles, pre-load).
 */
export function useTilePreload({
  allCoordinates,
  animationPhase,
  elevationData,
  followBehindZoomLevel,
  isMapLoaded,
  isPlaying,
  mapRef,
  setAnimationPhase,
  smoothBearingRef,
  targetBearingRef,
}: UseTilePreloadParams) {
  const hasAdvancedRef = useRef(false);

  useEffect(() => {
    if (animationPhase !== 'preloading') {
      hasAdvancedRef.current = false;
      return;
    }

    // Paused while preloading: abort and return to idle (cleanup of the prior
    // run restores the overview camera).
    if (!isPlaying) {
      setAnimationPhase('idle');
      return;
    }

    const map = mapRef.current;
    if (!map || !isMapLoaded || allCoordinates.length === 0) {
      // Nothing to warm up — go straight to the intro.
      setAnimationPhase('intro');
      return;
    }

    hasAdvancedRef.current = false;

    // Compute the intro's final camera target the same way useTrailPlaybackCamera
    // does, so we prime the exact tiles the intro flyTo lands on.
    const preset = getFollowBehindCameraTarget(followBehindZoomLevel, 'intro');
    const startPoint = allCoordinates[0];
    const lookAheadPoint = allCoordinates[Math.min(10, allCoordinates.length - 1)];

    if (!startPoint || !lookAheadPoint) {
      setAnimationPhase('intro');
      return;
    }

    const lat1 = (startPoint[1] * Math.PI) / 180;
    const lat2 = (lookAheadPoint[1] * Math.PI) / 180;
    const lon1 = (startPoint[0] * Math.PI) / 180;
    const lon2 = (lookAheadPoint[0] * Math.PI) / 180;
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    const initialBearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

    const startElevation = elevationData.length > 0 ? elevationData[0].elevation : 0;
    const { zoomAdjust, pitchAdjust } = calculateTerrainAwareAdjustments(startElevation, elevationData, 0);

    const targetZoom = Math.max(
      TERRAIN_CAMERA_SETTINGS.MIN_ZOOM,
      Math.min(TERRAIN_CAMERA_SETTINGS.MAX_ZOOM, preset.zoom - zoomAdjust)
    );
    const targetPitch = Math.max(
      TERRAIN_CAMERA_SETTINGS.MIN_PITCH,
      Math.min(TERRAIN_CAMERA_SETTINGS.MAX_PITCH, preset.pitch - pitchAdjust)
    );

    // Remember the overview the intro animates from, so we can restore it.
    const overview = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
    };

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const advance = () => {
      if (hasAdvancedRef.current) return;
      hasAdvancedRef.current = true;
      map.off('idle', advance);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      // Snap back to the overview so the intro flyTo still plays the cinematic
      // zoom-in — now against warm tiles.
      map.jumpTo(overview);
      smoothBearingRef.current = initialBearing;
      targetBearingRef.current = initialBearing;
      setAnimationPhase('intro');
    };

    // Prime the start tiles, then wait for them to finish loading.
    map.jumpTo({
      center: startPoint as [number, number],
      zoom: targetZoom,
      pitch: targetPitch,
      bearing: initialBearing,
    });
    map.once('idle', advance);
    timeoutId = setTimeout(advance, PRELOAD_TIMEOUT_MS);

    return () => {
      map.off('idle', advance);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      // If we leave preloading without having advanced (e.g. pause/unmount),
      // restore the overview camera so we don't leave the map at the primed target.
      if (!hasAdvancedRef.current) {
        map.jumpTo(overview);
      }
    };
  }, [
    allCoordinates,
    animationPhase,
    elevationData,
    followBehindZoomLevel,
    isMapLoaded,
    isPlaying,
    mapRef,
    setAnimationPhase,
    smoothBearingRef,
    targetBearingRef,
  ]);
}
