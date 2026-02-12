import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { INTRO_DURATION, OUTRO_DURATION } from '@/components/playback/PlaybackProvider';
import { MapElevationProfile } from './MapElevationProfile';
import { TRANSPORT_ICONS } from '@/utils/journeyUtils';

interface TrailMapProps {
  mapContainerRef?: React.RefObject<HTMLDivElement | null>;
}

// Map style configuration matching original TrailReplay
const MAP_STYLE = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'osm': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    },
    'opentopomap': {
      type: 'raster',
      tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenTopoMap (CC-BY-SA)'
    },
    'satellite': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '© Esri'
    },
    'carto-labels': {
      type: 'raster',
      tiles: ['https://cartodb-basemaps-a.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© CartoDB'
    },
    'enhanced-hillshade': {
      type: 'raster',
      tiles: ['https://cloud.sdsc.edu/v1/AUTH_opentopography/Raster/ASTER_GDEM/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenTopography/ASTER GDEM'
    },
    'terrain-dem': {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      tileSize: 256,
      encoding: 'terrarium',
      maxzoom: 15
    }
  },
  layers: [
    { id: 'background', type: 'raster', source: 'satellite' },
    { id: 'carto-labels', type: 'raster', source: 'carto-labels', layout: { visibility: 'none' } },
    { id: 'opentopomap', type: 'raster', source: 'opentopomap', layout: { visibility: 'none' } },
    { id: 'street', type: 'raster', source: 'osm', layout: { visibility: 'none' } },
    { id: 'enhanced-hillshade', type: 'raster', source: 'enhanced-hillshade', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.6 } }
  ],
  terrain: {
    source: 'terrain-dem',
    exaggeration: 1.2
  }
};

// Map layer names for UI
const MAP_LAYERS: Record<string, { name: string; icon: string }> = {
  satellite: { name: 'Satellite', icon: '🛰️' },
  street: { name: 'Street', icon: '🛣️' },
  opentopomap: { name: 'Topo', icon: '⛰️' },
  'enhanced-hillshade': { name: 'Terrain', icon: '🏔️' },
};

// Smooth bearing using exponential moving average
function smoothBearing(currentBearing: number, targetBearing: number, smoothingFactor: number = 0.015): number {
  let diff = targetBearing - currentBearing;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  const maxChange = 2;
  const change = Math.max(-maxChange, Math.min(maxChange, diff * smoothingFactor));

  return (currentBearing + change + 360) % 360;
}

// Terrain-aware camera settings (based on v1 FollowBehindCamera)
const TERRAIN_CAMERA_SETTINGS = {
  // Risk thresholds
  ELEVATION_RISK_METERS: 1200, // At this elevation, risk is 100%
  STEEPNESS_RISK_FACTOR: 18,   // Multiplier for slope risk
  LOOK_AHEAD_PROGRESS: 0.02,   // How far ahead/behind to check for slope

  // Dynamic adjustments
  MAX_ZOOM_OUT: 2,             // Max zoom levels to reduce
  MAX_PITCH_REDUCE: 15,        // Max pitch degrees to reduce

  // Limits (reduced to prevent white screen from tiles not loading)
  MIN_ZOOM: 8,
  MAX_ZOOM: 14,
  MIN_PITCH: 15,
  MAX_PITCH: 50,
};

// Calculate terrain-aware camera adjustments
function calculateTerrainAwareAdjustments(
  elevation: number,
  elevationData: Array<{ elevation: number; progress: number }>,
  currentProgress: number
): { zoomAdjust: number; pitchAdjust: number } {
  // Calculate elevation risk (0-1 based on how high we are)
  const elevationRisk = Math.min(
    Math.max(0, elevation) / TERRAIN_CAMERA_SETTINGS.ELEVATION_RISK_METERS,
    1
  );

  // Calculate steepness risk based on elevation change
  let steepnessRisk = 0;
  if (elevationData.length > 2) {
    const lookAhead = TERRAIN_CAMERA_SETTINGS.LOOK_AHEAD_PROGRESS;
    const behindIdx = Math.max(0, Math.floor((currentProgress - lookAhead) * (elevationData.length - 1)));
    const aheadIdx = Math.min(elevationData.length - 1, Math.floor((currentProgress + lookAhead) * (elevationData.length - 1)));

    const behindElev = elevationData[behindIdx]?.elevation || elevation;
    const aheadElev = elevationData[aheadIdx]?.elevation || elevation;
    const elevChange = Math.abs(aheadElev - behindElev);

    // Normalize steepness (higher change = more risk)
    steepnessRisk = Math.min(elevChange / 100 * TERRAIN_CAMERA_SETTINGS.STEEPNESS_RISK_FACTOR / 100, 1);
  }

  // Combined risk is the maximum of elevation and steepness risks
  const combinedRisk = Math.max(elevationRisk, steepnessRisk);

  // Calculate adjustments
  const zoomAdjust = combinedRisk * TERRAIN_CAMERA_SETTINGS.MAX_ZOOM_OUT;
  const pitchAdjust = combinedRisk * TERRAIN_CAMERA_SETTINGS.MAX_PITCH_REDUCE;

  return { zoomAdjust, pitchAdjust };
}

export function TrailMap({}: TrailMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const smoothBearingRef = useRef<number>(0);
  const targetBearingRef = useRef<number>(0);
  const introZoomTriggeredRef = useRef<boolean>(false);
  const lastAnimationPhaseRef = useRef<string>('idle');

  const tracks = useAppStore((state) => state.tracks);
  const settings = useAppStore((state) => state.settings);
  const trailStyle = useAppStore((state) => state.settings.trailStyle);
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const pictures = useAppStore((state) => state.pictures);
  const playback = useAppStore((state) => state.playback);
  const animationPhase = useAppStore((state) => state.animationPhase);
  const setCameraPosition = useAppStore((state) => state.setCameraPosition);
  const setSelectedPictureId = useAppStore((state) => state.setSelectedPictureId);

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
  } = useComputedJourney();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE as any,
      center: [0, 0],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      maxPitch: 85,
      preserveDrawingBuffer: true,
      attributionControl: false,
    } as any);

    map.current.on('load', () => {
      setIsMapLoaded(true);
      map.current?.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current?.addControl(new maplibregl.FullscreenControl(), 'top-right');
      setupTrackSources();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Setup track sources
  const setupTrackSources = useCallback(() => {
    if (!map.current) return;

    // Main trail line (full journey)
    if (!map.current.getSource('trail-line')) {
      map.current.addSource('trail-line', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
    }

    // Completed trail (animated portion)
    if (!map.current.getSource('trail-completed')) {
      map.current.addSource('trail-completed', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
    }

    // Transport segments (dashed line)
    if (!map.current.getSource('transport-line')) {
      map.current.addSource('transport-line', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: [] } }
      });
    }

    // Add layers
    if (!map.current.getLayer('trail-line')) {
      map.current.addLayer({
        id: 'trail-line',
        type: 'line',
        source: 'trail-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#C1652F', 'line-width': 4, 'line-opacity': 0.5 }
      });
    }

    // Transport line (dashed)
    if (!map.current.getLayer('transport-line')) {
      map.current.addLayer({
        id: 'transport-line',
        type: 'line',
        source: 'transport-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#888888',
          'line-width': 3,
          'line-opacity': 0.6,
          'line-dasharray': [2, 2]
        }
      });
    }

    if (!map.current.getLayer('trail-completed')) {
      map.current.addLayer({
        id: 'trail-completed',
        type: 'line',
        source: 'trail-completed',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#C1652F', 'line-width': 6 }
      });
    }
  }, []);

  // Update map layer visibility
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const layerMap: Record<string, string> = {
      satellite: 'background',
      street: 'street',
      topo: 'opentopomap',
      outdoor: 'opentopomap',
      terrain: 'enhanced-hillshade',
    };

    const targetLayer = layerMap[settings.mapStyle] || 'background';

    ['background', 'street', 'opentopomap', 'enhanced-hillshade'].forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, 'visibility', 'none');
      }
    });

    if (map.current.getLayer(targetLayer)) {
      map.current.setLayoutProperty(targetLayer, 'visibility', 'visible');
    }

    if ((settings.mapStyle === 'street' || settings.mapStyle === 'topo' || settings.mapStyle === 'outdoor')
        && map.current.getLayer('carto-labels')) {
      map.current.setLayoutProperty('carto-labels', 'visibility', 'visible');
    } else if (map.current.getLayer('carto-labels')) {
      map.current.setLayoutProperty('carto-labels', 'visibility', 'none');
    }
  }, [settings.mapStyle, isMapLoaded]);

  // Update trail colors when trailStyle changes
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const color = currentTrackColor || trailStyle.trailColor;

    if (map.current.getLayer('trail-line')) {
      map.current.setPaintProperty('trail-line', 'line-color', color);
    }
    if (map.current.getLayer('trail-completed')) {
      map.current.setPaintProperty('trail-completed', 'line-color', color);
    }
  }, [trailStyle.trailColor, currentTrackColor, isMapLoaded]);

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
      map.current.setTerrain(null as any);
    }
  }, [settings.show3DTerrain, isMapLoaded]);

  // Update journey lines on map
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Update full trail line with all journey coordinates
    if (allCoordinates.length > 0 && map.current.getSource('trail-line')) {
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

    // Fit bounds to all tracks
    if (allCoordinates.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoordinates.forEach((coord) => bounds.extend(coord as [number, number]));

      // Only fit bounds on initial load or when tracks change significantly
      if (animationPhase === 'idle' && playback.progress === 0) {
        map.current.fitBounds(bounds, { padding: 100, duration: 500, maxZoom: 15 });
      }
    }
  }, [allCoordinates, segmentTimings, isMapLoaded, animationPhase, playback.progress]);

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
          <span style="font-size: ${fontSize}px; position: relative; z-index: 1;">${icon}</span>
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
          <span style="font-size: ${fontSize}px; position: relative; z-index: 1;">${icon}</span>
        `;
      }
    }

    // Update completed track line
    if (completedCoordinates.length > 0 && map.current.getSource('trail-completed')) {
      (map.current.getSource('trail-completed') as maplibregl.GeoJSONSource)?.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: completedCoordinates },
      });
    }

    // Camera follow logic
    const { mode, followBehindPreset } = cameraSettings;

    // Reduced zoom levels to prevent white screen (tiles not loaded)
    const presets = {
      'very-close': { zoom: 14, pitch: 50 },
      'close': { zoom: 13, pitch: 45 },
      'medium': { zoom: 12, pitch: 40 },
      'far': { zoom: 11, pitch: 35 },
    };
    const preset = presets[followBehindPreset] || presets.medium;

    // Reset intro flag when going back to idle
    if (animationPhase === 'idle' && lastAnimationPhaseRef.current !== 'idle') {
      introZoomTriggeredRef.current = false;
    }
    lastAnimationPhaseRef.current = animationPhase;

    // Handle intro phase - smooth zoom from overview to follow position (only once)
    if (animationPhase === 'intro' && mode !== 'overview' && !introZoomTriggeredRef.current) {
      introZoomTriggeredRef.current = true;
      const cameraBearing = currentBearing || 0;

      // During intro, use a longer duration for smooth transition
      map.current.easeTo({
        center: [currentPosition.lon, currentPosition.lat],
        zoom: preset.zoom,
        pitch: mode === 'follow-behind' ? preset.pitch : 0,
        bearing: mode === 'follow-behind' ? cameraBearing : 0,
        duration: 2000, // Match intro duration for smooth transition
      });
    }
    // Handle playing phase - continuous follow
    else if (animationPhase === 'playing' && mode !== 'overview') {
      if (mode === 'follow') {
        map.current.easeTo({
          center: [currentPosition.lon, currentPosition.lat],
          zoom: 13,
          pitch: 0,
          bearing: 0,
          duration: 100,
        });
      } else if (mode === 'follow-behind') {
        const cameraBearing = smoothBearingRef.current;

        // Calculate terrain-aware adjustments for high-elevation trails
        const currentElevation = currentPosition.elevation || 0;
        const { zoomAdjust, pitchAdjust } = calculateTerrainAwareAdjustments(
          currentElevation,
          elevationData,
          playback.progress
        );

        // Apply terrain adjustments - zoom out and reduce pitch at high elevations
        const adjustedZoom = Math.max(
          TERRAIN_CAMERA_SETTINGS.MIN_ZOOM,
          Math.min(TERRAIN_CAMERA_SETTINGS.MAX_ZOOM, preset.zoom - zoomAdjust)
        );
        const adjustedPitch = Math.max(
          TERRAIN_CAMERA_SETTINGS.MIN_PITCH,
          Math.min(TERRAIN_CAMERA_SETTINGS.MAX_PITCH, preset.pitch - pitchAdjust)
        );

        map.current.easeTo({
          center: [currentPosition.lon, currentPosition.lat],
          zoom: adjustedZoom,
          pitch: adjustedPitch,
          bearing: cameraBearing,
          duration: 100,
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
      cameraSettings, trailStyle, isMapLoaded, setCameraPosition, isInTransport, currentSegment, currentTrackColor, elevationData]);

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

  // Add picture markers
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const existingMarkers = document.querySelectorAll('.tr-picture-marker');
    existingMarkers.forEach((el) => el.remove());

    if (!settings.showPictures) return;

    pictures.forEach((picture) => {
      if (picture.lat && picture.lon) {
        const el = document.createElement('div');
        el.className = 'tr-picture-marker';
        el.style.cssText = `
          width: 32px;
          height: 32px;
          background: var(--trail-orange);
          border: 3px solid var(--canvas);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        el.innerHTML = '📷';

        el.addEventListener('click', () => {
          setSelectedPictureId(picture.id);
        });

        new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([picture.lon, picture.lat])
          .addTo(map.current!);
      }
    });
  }, [pictures, isMapLoaded, settings.showPictures, setSelectedPictureId]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainer} className="w-full h-full" />

      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--canvas)]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-[var(--trail-orange)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--evergreen)]">Loading map...</span>
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
