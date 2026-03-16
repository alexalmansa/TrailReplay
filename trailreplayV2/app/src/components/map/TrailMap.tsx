import { useEffect, useRef, useCallback, useState } from 'react';
import type { Feature, LineString } from 'geojson';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { INTRO_DURATION, OUTRO_DURATION } from '@/components/playback/PlaybackProvider';
import { MapElevationProfile } from './MapElevationProfile';
import { TRANSPORT_ICONS } from '@/utils/journeyUtils';
import { mapGlobalRef } from '@/utils/mapRef';
import { useI18n } from '@/i18n/useI18n';
import { getHeartRateColor } from '@/utils/gpxParser';
import { calculateDistance } from '@/utils/journeyUtils';
import { registerAspectProtocol, registerSlopeProtocol } from './terrainProtocols';
import { MAP_LAYERS, MAP_STYLE } from './mapStyle';
import {
  calculateTerrainAwareAdjustments,
  smoothBearing,
  TERRAIN_CAMERA_SETTINGS,
} from './cameraUtils';
import { setupTrackSources } from './mapSetup';
import { useManualPicturePlacement } from './hooks/useManualPicturePlacement';
import { usePictureMarkers } from './hooks/usePictureMarkers';
import { useComparisonTrackLayers } from './hooks/useComparisonTrackLayers';

interface TrailMapProps {
  mapContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function TrailMap(_props: TrailMapProps) {
  const { t } = useI18n();
  const internalMapContainerRef = useRef<HTMLDivElement>(null);
  const mapContainer = _props.mapContainerRef ?? internalMapContainerRef;
  const map = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const smoothBearingRef = useRef<number>(0);
  const targetBearingRef = useRef<number>(0);
  const introZoomTriggeredRef = useRef<boolean>(false);
  const lastAnimationPhaseRef = useRef<string>('idle');
  const loadZoomDoneRef = useRef<boolean>(false);

  const tracks = useAppStore((state) => state.tracks);
  const settings = useAppStore((state) => state.settings);
  const trailStyle = useAppStore((state) => state.settings.trailStyle);
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const pictures = useAppStore((state) => state.pictures);
  const pendingPicturePlacements = useAppStore((state) => state.pendingPicturePlacements);
  const playback = useAppStore((state) => state.playback);
  const animationPhase = useAppStore((state) => state.animationPhase);
  const setCameraPosition = useAppStore((state) => state.setCameraPosition);
  const setSelectedPictureId = useAppStore((state) => state.setSelectedPictureId);
  const addPicture = useAppStore((state) => state.addPicture);
  const removePendingPicturePlacement = useAppStore((state) => state.removePendingPicturePlacement);
  const comparisonTracks = useAppStore((state) => state.comparisonTracks);

  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Use the computed journey hook for multi-track support
  const {
    currentPosition,
    currentBearing,
    currentSegment,
    completedCoordinates,
    allCoordinates,
    isInTransport,
    currentTrackColor,
    segmentTimings,
    elevationData,
    activeTrack,
    computedJourney,
  } = useComputedJourney();

  // Derive the current track name for the label
  const currentTrackName = currentSegment?.segment.type === 'track' && currentSegment.segment.trackId
    ? tracks.find((t) => t.id === currentSegment.segment.trackId)?.name
    : activeTrack?.name;

  const findNearestRoutePoint = useCallback((lat: number, lon: number) => {
    if (computedJourney && computedJourney.coordinates.length > 0) {
      let closestIndex = 0;
      let minDistanceKm = Infinity;

      computedJourney.coordinates.forEach((point, index) => {
        const distanceKm = calculateDistance(lat, lon, point.lat, point.lon);
        if (distanceKm < minDistanceKm) {
          minDistanceKm = distanceKm;
          closestIndex = index;
        }
      });

      const closestPoint = computedJourney.coordinates[closestIndex];
      if (!closestPoint) return null;

      return {
        lat: closestPoint.lat,
        lon: closestPoint.lon,
        progress:
          computedJourney.coordinates.length > 1
            ? closestIndex / (computedJourney.coordinates.length - 1)
            : playback.progress,
      };
    }

    const track = activeTrack || tracks[0];
    if (!track || track.points.length === 0) return null;

    let closestPoint = track.points[0];
    let minDistanceKm = Infinity;

    track.points.forEach((point) => {
      const distanceKm = calculateDistance(lat, lon, point.lat, point.lon);
      if (distanceKm < minDistanceKm) {
        minDistanceKm = distanceKm;
        closestPoint = point;
      }
    });

    return {
      lat: closestPoint.lat,
      lon: closestPoint.lon,
      progress: track.totalDistance > 0 ? closestPoint.distance / track.totalDistance : playback.progress,
    };
  }, [activeTrack, computedJourney, playback.progress, tracks]);

  useManualPicturePlacement({
    addPicture,
    findNearestRoutePoint,
    isMapLoaded,
    mapRef: map,
    pendingPicturePlacements,
    removePendingPicturePlacement,
    t,
  });

  usePictureMarkers({
    isMapLoaded,
    mapRef: map,
    pictures,
    setSelectedPictureId,
    showPictures: settings.showPictures,
  });

  useComparisonTrackLayers({
    comparisonTracks,
    isMapLoaded,
    mapRef: map,
    progress: playback.progress,
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    registerSlopeProtocol();
    registerAspectProtocol();

    map.current = new maplibregl.Map({
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

    // Expose map instance globally so ExportPanel can call getCanvas() / triggerRepaint()
    mapGlobalRef.current = map.current;

    map.current.on('load', () => {
      setIsMapLoaded(true);
      map.current?.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current?.addControl(new maplibregl.FullscreenControl(), 'top-right');
      if (map.current) {
        setupTrackSources(map.current, trailStyle.trailColor);
      }
    });

    return () => {
      mapGlobalRef.current = null;
      map.current?.remove();
      map.current = null;
      loadZoomDoneRef.current = false;
    };
  }, [trailStyle.trailColor]);

  // Update map layer visibility
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const layerMap: Record<string, string> = {
      satellite: 'background',
      street: 'street',
      topo: 'opentopomap',
      outdoor: 'opentopomap',
      'esri-clarity': 'esri-clarity',
      wayback: 'wayback',
    };

    const targetLayer = layerMap[settings.mapStyle] || 'background';

    // Hide all base layers
    ['background', 'street', 'opentopomap', 'enhanced-hillshade', 'esri-clarity', 'wayback'].forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, 'visibility', 'none');
      }
    });

    if (map.current.getLayer(targetLayer)) {
      map.current.setLayoutProperty(targetLayer, 'visibility', 'visible');
    }

    // Overlays — controlled independently of base map
    if (map.current.getLayer('ski-pistes')) {
      map.current.setLayoutProperty('ski-pistes', 'visibility',
        settings.mapOverlays?.skiPistes ? 'visible' : 'none');
    }

    if (map.current.getLayer('slope-overlay')) {
      map.current.setLayoutProperty('slope-overlay', 'visibility',
        settings.mapOverlays?.slopeOverlay ? 'visible' : 'none');
    }

    if (map.current.getLayer('aspect-overlay')) {
      map.current.setLayoutProperty('aspect-overlay', 'visibility',
        settings.mapOverlays?.aspectOverlay ? 'visible' : 'none');
    }

    // Labels: always on for street/topo/outdoor, optional overlay for any map style
    const showLabels = ['street', 'topo', 'outdoor'].includes(settings.mapStyle)
      || !!settings.mapOverlays?.placeLabels;
    if (map.current.getLayer('carto-labels')) {
      map.current.setLayoutProperty('carto-labels', 'visibility', showLabels ? 'visible' : 'none');
    }
  }, [
    settings.mapStyle,
    settings.mapOverlays?.placeLabels,
    settings.mapOverlays?.skiPistes,
    settings.mapOverlays?.slopeOverlay,
    settings.mapOverlays?.aspectOverlay,
    isMapLoaded
  ]);

  // Update Wayback imagery tile source when date changes
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;
    if (!settings.waybackItemURL) return;

    const tileUrl = settings.waybackItemURL
      .replace('{level}', '{z}')
      .replace('{row}', '{y}')
      .replace('{col}', '{x}');
    const isWaybackActive = settings.mapStyle === 'wayback';

    if (map.current.getLayer('wayback')) map.current.removeLayer('wayback');
    if (map.current.getSource('wayback')) map.current.removeSource('wayback');

    map.current.addSource('wayback', {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
      attribution: '© Esri — Source: Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
    });
    map.current.addLayer(
      { id: 'wayback', type: 'raster', source: 'wayback', layout: { visibility: isWaybackActive ? 'visible' : 'none' } },
      'carto-labels'
    );
  }, [settings.waybackItemURL, settings.mapStyle, isMapLoaded]);

  // Update trail colors when trailStyle changes
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const color = currentTrackColor || trailStyle.trailColor;

    if (trailStyle.colorMode !== 'heartRate') {
      // Fixed color mode: set flat color
      if (map.current.getLayer('trail-line')) {
        map.current.setPaintProperty('trail-line', 'line-color', color);
      }
      if (map.current.getLayer('trail-completed')) {
        map.current.setPaintProperty('trail-completed', 'line-color', color);
      }
    } else {
      // HR mode: use color property from features
      if (map.current.getLayer('trail-line')) {
        map.current.setPaintProperty('trail-line', 'line-color', ['coalesce', ['get', 'color'], color]);
      }
      if (map.current.getLayer('trail-completed')) {
        map.current.setPaintProperty('trail-completed', 'line-color', ['coalesce', ['get', 'color'], color]);
      }
    }
  }, [trailStyle.trailColor, trailStyle.colorMode, currentTrackColor, isMapLoaded]);

  // Update track label visibility, text, and color
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    if (map.current.getLayer('main-track-label')) {
      map.current.setLayoutProperty(
        'main-track-label',
        'visibility',
        trailStyle.showTrackLabels ? 'visible' : 'none'
      );
      const color = currentTrackColor || trailStyle.trailColor;
      map.current.setPaintProperty('main-track-label', 'text-color', color);
    }

    if (map.current.getSource('main-track-label')) {
      (map.current.getSource('main-track-label') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: { label: currentTrackName || '' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      });
    }
  }, [trailStyle.showTrackLabels, currentTrackName, trailStyle.trailColor, currentTrackColor, isMapLoaded]);

  // Toggle 3D terrain
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    if (settings.show3DTerrain) {
      if (map.current.getSource('terrain-dem')) {
        map.current.setTerrain({
          source: 'terrain-dem',
          exaggeration: 1.5
        });
      }
    } else {
      map.current.setTerrain(null);
    }
  }, [settings.show3DTerrain, isMapLoaded]);

  // Update journey lines on map
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Build HR-colored trail when in heart rate mode
    if (trailStyle.colorMode === 'heartRate' && allCoordinates.length > 0 && map.current.getSource('trail-line')) {
      console.log('🏃 Building heart rate trail - colorMode:', trailStyle.colorMode, 'coords:', allCoordinates.length);

      // Build features with color properties based on heart rate
      const features: Array<Feature<LineString, { color: string }>> = [];

      // Get the heart rate points - support both single-track and journey modes
      let hrPoints: Array<{ heartRate: number | null }> = [];

      if (activeTrack && !computedJourney) {
        // Single track mode
        hrPoints = activeTrack.points;
        console.log('🏃 Using activeTrack points:', hrPoints.length, 'sample:', hrPoints.slice(0, 3));
      } else if (computedJourney) {
        // Journey mode - coordinates are JourneyPoint objects with heartRate
        hrPoints = computedJourney.coordinates;
        console.log('🏃 Using computedJourney coordinates:', hrPoints.length, 'sample:', hrPoints.slice(0, 3));
      }

      // Build 2-point line segments with colors
      let hrCount = 0;
      for (let i = 0; i < allCoordinates.length - 1; i++) {
        const startCoord = allCoordinates[i];
        const endCoord = allCoordinates[i + 1];
        const hrData = hrPoints[i];

        let color = trailStyle.trailColor; // Default color

        if (hrData?.heartRate) {
          hrCount++;
          color = getHeartRateColor(hrData.heartRate, 180);
        }

        features.push({
          type: 'Feature',
          properties: { color },
          geometry: {
            type: 'LineString',
            coordinates: [startCoord, endCoord]
          }
        });
      }

      console.log('🏃 Built', features.length, 'features with', hrCount, 'having HR data');
      (map.current.getSource('trail-line') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features
      });
    } else if (trailStyle.colorMode === 'fixed' && allCoordinates.length > 0 && map.current.getSource('trail-line')) {
      // Fixed color mode - simple LineString
      (map.current.getSource('trail-line') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: allCoordinates }
      });
    }

    // Extract transport segment coordinates for dashed lines
    if (segmentTimings.length > 0 && map.current.getSource('transport-line')) {
      const transportCoords: number[][][] = [];

      segmentTimings.forEach(timing => {
        if (timing.type === 'transport') {
          // Get coordinates for this transport segment from allCoordinates
          const segmentCoords: number[][] = [];
          // We need to map from journey coordinates - approximate by progress
          const startIdx = Math.floor(timing.progressStartRatio * allCoordinates.length);
          const endIdx = Math.ceil(timing.progressEndRatio * allCoordinates.length);

          for (let i = startIdx; i <= endIdx && i < allCoordinates.length; i++) {
            segmentCoords.push(allCoordinates[i]);
          }

          if (segmentCoords.length > 1) {
            transportCoords.push(segmentCoords);
          }
        }
      });

      (map.current.getSource('transport-line') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'MultiLineString', coordinates: transportCoords }
      });
    }

    // Fit bounds to all tracks - show overview without aggressive zoom
    if (allCoordinates.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoordinates.forEach((coord) => bounds.extend(coord as [number, number]));

      // Only fit bounds on initial load or when tracks change significantly
      if (animationPhase === 'idle' && playback.progress === 0) {
        if (!loadZoomDoneRef.current) {
          // First load: fit bounds immediately, then simulate mouse-wheel scroll-out
          // at the map center to force MapLibre tile/zoom recalculation.
          loadZoomDoneRef.current = true;
          setTimeout(() => {
            if (!map.current) return;
            map.current.fitBounds(bounds, {
              padding: 80,
              duration: 800,
              maxZoom: 12,
              pitch: 0,
              bearing: 0,
            });
          }, 100);

          // After 2 seconds, simulate mouse movement and wheel scroll to force tile reload
          setTimeout(() => {
            if (!map.current) return;
            const container = map.current.getContainer();
            const canvas = container.querySelector('canvas');
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            // Move mouse to center
            canvas.dispatchEvent(new MouseEvent('mouseenter', {
              bubbles: true,
              cancelable: true,
              clientX: cx,
              clientY: cy,
              view: window,
            }));

            canvas.dispatchEvent(new MouseEvent('mousemove', {
              bubbles: true,
              cancelable: true,
              clientX: cx,
              clientY: cy,
              view: window,
            }));

            // Dispatch multiple wheel events to zoom out
            for (let i = 0; i < 4; i++) {
              setTimeout(() => {
                canvas.dispatchEvent(new WheelEvent('wheel', {
                  bubbles: true,
                  cancelable: true,
                  clientX: cx,
                  clientY: cy,
                  screenX: cx,
                  screenY: cy,
                  deltaY: 100,
                  deltaMode: 0,
                  view: window,
                }));
              }, i * 50);
            }
          }, 2000);
        } else {
          // Subsequent track changes: just fit bounds directly
          setTimeout(() => {
            if (!map.current) return;
            map.current.fitBounds(bounds, {
              padding: 80,
              duration: 800,
              maxZoom: 12,
              pitch: 0,
              bearing: 0,
            });
          }, 100);
        }
      }
    }
  }, [allCoordinates, segmentTimings, isMapLoaded, animationPhase, playback.progress, trailStyle.colorMode, trailStyle.heartRateZones, trailStyle.trailColor, activeTrack, computedJourney]);

  // Update completed trail and marker position
  useEffect(() => {
    if (!map.current || !isMapLoaded || !currentPosition) return;

    // Update smooth bearing
    targetBearingRef.current = currentBearing;
    smoothBearingRef.current = smoothBearing(smoothBearingRef.current, currentBearing, 0.02);

    const shouldShowMarker = trailStyle.showMarker &&
      (animationPhase === 'playing' || (animationPhase === 'idle' && playback.progress > 0));

    // Determine icon based on segment type
    const icon = isInTransport
      ? TRANSPORT_ICONS[currentSegment?.segment.transportMode || 'car'] || '🚗'
      : trailStyle.currentIcon;

    // Get the current color (from active track segment or default)
    const currentColor = currentTrackColor || trailStyle.trailColor;

    // Handle marker
    if (!shouldShowMarker) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    } else {
      const markerSize = trailStyle.markerSize;
      const showCircle = trailStyle.showCircle;
      const fontSize = Math.round(24 * markerSize);
      const circleSize = Math.round(40 * markerSize);

      if (!markerRef.current) {
        const el = document.createElement('div');
        el.className = 'tr-marker';
        el.style.zIndex = '100';
        el.innerHTML = `
          ${showCircle ? `<div style="
            position: absolute;
            width: ${circleSize}px;
            height: ${circleSize}px;
            background: ${currentColor}40;
            border: 2px solid ${currentColor};
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
          "></div>` : ''}
          <span style="font-size: ${fontSize}px; position: relative; z-index: 10;">${icon}</span>
        `;

        markerRef.current = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([currentPosition.lon, currentPosition.lat])
          .addTo(map.current);
      } else {
        markerRef.current.setLngLat([currentPosition.lon, currentPosition.lat]);
        const el = markerRef.current.getElement();
        el.style.zIndex = '100';
        el.innerHTML = `
          ${showCircle ? `<div style="
            position: absolute;
            width: ${circleSize}px;
            height: ${circleSize}px;
            background: ${currentColor}40;
            border: 2px solid ${currentColor};
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
          "></div>` : ''}
          <span style="font-size: ${fontSize}px; position: relative; z-index: 10;">${icon}</span>
        `;
      }
    }

    // Update completed track line with HR coloring if needed
    if (completedCoordinates.length > 0 && map.current.getSource('trail-completed')) {
      if (trailStyle.colorMode === 'heartRate') {
        // Build HR-colored features for completed portion
        const features: Array<Feature<LineString, { color: string }>> = [];

        let hrPoints: Array<{ heartRate: number | null }> = [];
        if (activeTrack && !computedJourney) {
          hrPoints = activeTrack.points;
        } else if (computedJourney) {
          hrPoints = computedJourney.coordinates;
        }

        for (let i = 0; i < completedCoordinates.length - 1; i++) {
          const startCoord = completedCoordinates[i];
          const endCoord = completedCoordinates[i + 1];
          const hrData = hrPoints[i];

          let color = trailStyle.trailColor;
          if (hrData?.heartRate) {
            color = getHeartRateColor(hrData.heartRate, 180);
          }

          features.push({
            type: 'Feature',
            properties: { color },
            geometry: {
              type: 'LineString',
              coordinates: [startCoord, endCoord]
            }
          });
        }

        (map.current.getSource('trail-completed') as maplibregl.GeoJSONSource)?.setData({
          type: 'FeatureCollection',
          features
        });
      } else {
        // Fixed color mode
        (map.current.getSource('trail-completed') as maplibregl.GeoJSONSource)?.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: completedCoordinates },
        });
      }
    }

    // Update track label position to follow marker
    if (trailStyle.showTrackLabels && map.current.getSource('main-track-label')) {
      (map.current.getSource('main-track-label') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: { label: currentTrackName || '' },
        geometry: { type: 'Point', coordinates: [currentPosition.lon, currentPosition.lat] },
      });
    }

    // Camera follow logic - simplified to match v1 approach
    const { mode, followBehindPreset } = cameraSettings;

    // Presets matching v1 CameraController (VERY_CLOSE: 16/55, MEDIUM: 14/35, FAR: 11/30)
    const presets = {
      'very-close': { zoom: 16, pitch: 55 },
      'close': { zoom: 15, pitch: 45 },
      'medium': { zoom: 14, pitch: 35 },
      'far': { zoom: 11, pitch: 30 },
    };
    const preset = presets[followBehindPreset] || presets.medium;

    // Reset intro flag when going back to idle
    if (animationPhase === 'idle' && lastAnimationPhaseRef.current !== 'idle') {
      introZoomTriggeredRef.current = false;
    }
    lastAnimationPhaseRef.current = animationPhase;

    // Handle intro phase - smooth cinematic zoom from overview to follow position (only once)
    if (animationPhase === 'intro' && mode !== 'overview' && !introZoomTriggeredRef.current) {
      introZoomTriggeredRef.current = true;
      const cameraBearing = currentBearing || 0;

      // Get current zoom to prevent too aggressive zoom change (causes white screen)
      const currentZoom = map.current.getZoom();

      // Limit zoom change to max 3 levels to allow tiles to load
      // This prevents white screen when jumping from overview (12) to follow (14-16)
      const maxZoomChange = 3;
      const targetZoom = Math.min(preset.zoom, currentZoom + maxZoomChange);

      // Cinematic zoom-in over 2 seconds (like v1's startCinematicSequence)
      map.current.easeTo({
        center: [currentPosition.lon, currentPosition.lat],
        zoom: targetZoom,
        pitch: mode === 'follow-behind' ? preset.pitch : 0,
        bearing: mode === 'follow-behind' ? cameraBearing : 0,
        duration: 2000,
        easing: (t: number) => 1 - Math.pow(1 - t, 3), // Smooth ease-out cubic like v1
      });
    }
    // Handle playing phase - continuous follow with gradual zoom approach
    else if (animationPhase === 'playing' && mode !== 'overview') {
      const cameraBearing = smoothBearingRef.current;
      const currentZoom = map.current.getZoom();

      // Gradually approach target zoom (0.1 levels per frame) to allow tiles to load
      const zoomStep = 0.1;

      if (mode === 'follow') {
        const targetZoom = 14;
        const newZoom = currentZoom < targetZoom
          ? Math.min(currentZoom + zoomStep, targetZoom)
          : Math.max(currentZoom - zoomStep, targetZoom);

        map.current.easeTo({
          center: [currentPosition.lon, currentPosition.lat],
          zoom: newZoom,
          pitch: 0,
          bearing: 0,
          duration: 100,
        });
      } else if (mode === 'follow-behind') {
        // Gradually approach preset zoom to allow tiles to load
        const newZoom = currentZoom < preset.zoom
          ? Math.min(currentZoom + zoomStep, preset.zoom)
          : Math.max(currentZoom - zoomStep, preset.zoom);

        map.current.easeTo({
          center: [currentPosition.lon, currentPosition.lat],
          zoom: newZoom,
          pitch: preset.pitch,
          bearing: cameraBearing,
          duration: 100,
          easing: (t: number) => t * (2 - t), // Smooth ease-out like v1
        });
      }
    }

    // Update camera position in store
    setCameraPosition({
      lat: currentPosition.lat,
      lon: currentPosition.lon,
      zoom: map.current.getZoom(),
      pitch: map.current.getPitch(),
      bearing: map.current.getBearing(),
    });
  }, [currentPosition, currentBearing, completedCoordinates, playback.progress, animationPhase,
      cameraSettings, trailStyle, isMapLoaded, setCameraPosition, isInTransport, currentSegment, currentTrackColor, elevationData, currentTrackName]);

  // Handle camera mode changes
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const { mode } = cameraSettings;

    if (mode === 'overview') {
      if (allCoordinates.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        allCoordinates.forEach((coord) => bounds.extend(coord as [number, number]));
        map.current.fitBounds(bounds, { padding: 100, duration: 500 });
      }
    }
  }, [cameraSettings.mode, allCoordinates, isMapLoaded]);

  // Handle intro and outro animations
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const { followBehindPreset } = cameraSettings;
    const presets = {
      'very-close': { zoom: 17, pitch: 60 },
      'close': { zoom: 16, pitch: 55 },
      'medium': { zoom: 15, pitch: 50 },
      'far': { zoom: 14, pitch: 45 },
    };
    const preset = presets[followBehindPreset] || presets.medium;

    if (animationPhase === 'intro' && allCoordinates.length > 0) {
      // Cinematic zoom-in to starting position
      const startPoint = allCoordinates[0];
      const lookAheadIndex = Math.min(10, allCoordinates.length - 1);
      const lookAheadPoint = allCoordinates[lookAheadIndex];

      if (startPoint && lookAheadPoint) {
        const lat1 = (startPoint[1] * Math.PI) / 180;
        const lat2 = (lookAheadPoint[1] * Math.PI) / 180;
        const lon1 = (startPoint[0] * Math.PI) / 180;
        const lon2 = (lookAheadPoint[0] * Math.PI) / 180;

        const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        const x =
          Math.cos(lat1) * Math.sin(lat2) -
          Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

        let initialBearing = (Math.atan2(y, x) * 180) / Math.PI;
        initialBearing = (initialBearing + 360) % 360;

        // Calculate terrain-aware adjustments for starting position
        const startElevation = elevationData.length > 0 ? elevationData[0].elevation : 0;
        const { zoomAdjust, pitchAdjust } = calculateTerrainAwareAdjustments(
          startElevation,
          elevationData,
          0
        );

        const adjustedZoom = Math.max(
          TERRAIN_CAMERA_SETTINGS.MIN_ZOOM,
          Math.min(TERRAIN_CAMERA_SETTINGS.MAX_ZOOM, preset.zoom - zoomAdjust)
        );
        const adjustedPitch = Math.max(
          TERRAIN_CAMERA_SETTINGS.MIN_PITCH,
          Math.min(TERRAIN_CAMERA_SETTINGS.MAX_PITCH, preset.pitch - pitchAdjust)
        );

        map.current.flyTo({
          center: startPoint as [number, number],
          zoom: adjustedZoom,
          pitch: adjustedPitch,
          bearing: initialBearing,
          duration: INTRO_DURATION,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });

        smoothBearingRef.current = initialBearing;
        targetBearingRef.current = initialBearing;
      }
    } else if (animationPhase === 'outro' && allCoordinates.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoordinates.forEach((coord) => bounds.extend(coord as [number, number]));

      map.current.fitBounds(bounds, {
        padding: 100,
        pitch: 45,
        bearing: 0,
        duration: OUTRO_DURATION,
        easing: (t) => 1 - Math.pow(1 - t, 2),
      } as maplibregl.FitBoundsOptions);
    } else if (animationPhase === 'idle' && allCoordinates.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoordinates.forEach((coord) => bounds.extend(coord as [number, number]));
      map.current.fitBounds(bounds, { padding: 100, duration: 1000 });
    }
  }, [animationPhase, allCoordinates, cameraSettings.followBehindPreset, isMapLoaded, elevationData]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />

      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--canvas)]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-[var(--trail-orange)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--evergreen)]">{t('map.loading')}</span>
          </div>
        </div>
      )}

      {/* Elevation Profile at bottom of map */}
      {isMapLoaded && (tracks.length > 0 || allCoordinates.length > 0) && (
        <MapElevationProfile />
      )}
    </div>
  );
}

export { MAP_LAYERS };
