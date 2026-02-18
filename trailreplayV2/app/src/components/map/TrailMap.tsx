import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '@/store/useAppStore';
import { useComputedJourney } from '@/hooks/useComputedJourney';
import { INTRO_DURATION, OUTRO_DURATION } from '@/components/playback/PlaybackProvider';
import { MapElevationProfile } from './MapElevationProfile';
import { TRANSPORT_ICONS } from '@/utils/journeyUtils';
import { mapGlobalRef } from '@/utils/mapRef';

interface TrailMapProps {
  mapContainerRef?: React.RefObject<HTMLDivElement | null>;
}

// ── Slope protocol: computes slope from Terrarium elevation tiles ──────────
// Terrarium encoding: elevation = (R * 256 + G + B / 256) - 32768
function terrariumHeight(r: number, g: number, b: number): number {
  return (r * 256 + g + b / 256) - 32768;
}

// Meters per pixel at a given zoom level (at equator; good enough for slope)
function metersPerPixel(zoom: number): number {
  return 40075016.686 / (256 * Math.pow(2, zoom));
}

// Slope color ramp (degrees → RGBA) — ski/mountaineering standard
function slopeColor(degrees: number): [number, number, number, number] {
  if (degrees < 15) return [0, 0, 0, 0];                // flat — transparent
  if (degrees < 25) return [255, 255, 0, 120];           // yellow — mild
  if (degrees < 30) return [255, 200, 0, 150];           // amber — moderate
  if (degrees < 35) return [255, 120, 0, 180];           // orange — steep
  if (degrees < 40) return [255, 50, 0, 200];            // red-orange — very steep
  if (degrees < 45) return [220, 0, 0, 210];             // red — extreme
  return [160, 0, 80, 220];                              // dark magenta — cliff
}

let slopeProtocolRegistered = false;
let aspectProtocolRegistered = false;

function registerSlopeProtocol() {
  if (slopeProtocolRegistered) return;
  slopeProtocolRegistered = true;

  maplibregl.addProtocol('slope', async (params, _abortController) => {
    // URL format: slope://{z}/{x}/{y}
    const parts = params.url.replace('slope://', '').split('/');
    const z = parseInt(parts[0]);
    const x = parseInt(parts[1]);
    const y = parseInt(parts[2]);

    // Clamp to maxzoom 15 (Terrarium tiles max)
    const tz = Math.min(z, 15);
    // Scale tile coords if we're beyond maxzoom
    const scale = Math.pow(2, z - tz);
    const tx = Math.floor(x / scale);
    const ty = Math.floor(y / scale);

    const tileUrl = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${tz}/${tx}/${ty}.png`;

    const response = await fetch(tileUrl);
    if (!response.ok) throw new Error(`Tile fetch error: ${response.statusText}`);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const size = 256;
    // Draw source tile to read pixels (oversized to read neighbor pixels at edges)
    const srcCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(bitmap, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, bitmap.width, bitmap.height);
    const src = srcData.data;
    const w = bitmap.width;

    // If beyond maxzoom, we need to extract a sub-region of the parent tile
    const subSize = Math.floor(w / scale);
    const offX = Math.floor((x % scale) * subSize);
    const offY = Math.floor((y % scale) * subSize);

    // Output canvas
    const outCanvas = new OffscreenCanvas(size, size);
    const outCtx = outCanvas.getContext('2d')!;
    const outImg = outCtx.createImageData(size, size);
    const out = outImg.data;

    const cellSize = metersPerPixel(z);

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        // Map output pixel to source pixel
        const sx = Math.min(Math.floor(offX + px * subSize / size), w - 1);
        const sy = Math.min(Math.floor(offY + py * subSize / size), w - 1);

        const idxL = (sy * w + Math.max(0, sx - 1)) * 4;
        const idxR = (sy * w + Math.min(w - 1, sx + 1)) * 4;
        const idxU = (Math.max(0, sy - 1) * w + sx) * 4;
        const idxD = (Math.min(w - 1, sy + 1) * w + sx) * 4;

        const hL = terrariumHeight(src[idxL], src[idxL + 1], src[idxL + 2]);
        const hR = terrariumHeight(src[idxR], src[idxR + 1], src[idxR + 2]);
        const hU = terrariumHeight(src[idxU], src[idxU + 1], src[idxU + 2]);
        const hD = terrariumHeight(src[idxD], src[idxD + 1], src[idxD + 2]);

        const dzdx = (hR - hL) / (2 * cellSize);
        const dzdy = (hD - hU) / (2 * cellSize);
        const slopeDeg = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);

        const [r, g, b, a] = slopeColor(slopeDeg);
        const oi = (py * size + px) * 4;
        out[oi] = r;
        out[oi + 1] = g;
        out[oi + 2] = b;
        out[oi + 3] = a;
      }
    }

    outCtx.putImageData(outImg, 0, 0);
    const outBlob = await outCanvas.convertToBlob({ type: 'image/png' });
    const arrayBuffer = await outBlob.arrayBuffer();
    return { data: arrayBuffer };
  });
}

// Aspect color ramp (degrees from north → RGBA)
function aspectColor(aspectDegrees: number, slopeDegrees: number): [number, number, number, number] {
  if (slopeDegrees < 5) return [0, 0, 0, 0]; // flat — transparent

  // Normalize to 0–360
  const d = (aspectDegrees + 360) % 360;
  const alpha = 170;

  // 8-direction bins
  if (d >= 337.5 || d < 22.5) return [0, 122, 255, alpha];      // N
  if (d < 67.5) return [0, 200, 255, alpha];                    // NE
  if (d < 112.5) return [0, 200, 90, alpha];                    // E
  if (d < 157.5) return [180, 220, 0, alpha];                   // SE
  if (d < 202.5) return [255, 165, 0, alpha];                   // S
  if (d < 247.5) return [255, 80, 0, alpha];                    // SW
  if (d < 292.5) return [200, 0, 200, alpha];                   // W
  return [120, 0, 255, alpha];                                  // NW
}

function registerAspectProtocol() {
  if (aspectProtocolRegistered) return;
  aspectProtocolRegistered = true;

  maplibregl.addProtocol('aspect', async (params, _abortController) => {
    // URL format: aspect://{z}/{x}/{y}
    const parts = params.url.replace('aspect://', '').split('/');
    const z = parseInt(parts[0]);
    const x = parseInt(parts[1]);
    const y = parseInt(parts[2]);

    // Clamp to maxzoom 15 (Terrarium tiles max)
    const tz = Math.min(z, 15);
    // Scale tile coords if we're beyond maxzoom
    const scale = Math.pow(2, z - tz);
    const tx = Math.floor(x / scale);
    const ty = Math.floor(y / scale);

    const tileUrl = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${tz}/${tx}/${ty}.png`;

    const response = await fetch(tileUrl);
    if (!response.ok) throw new Error(`Tile fetch error: ${response.statusText}`);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const size = 256;
    // Draw source tile to read pixels (oversized to read neighbor pixels at edges)
    const srcCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(bitmap, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, bitmap.width, bitmap.height);
    const src = srcData.data;
    const w = bitmap.width;

    // If beyond maxzoom, we need to extract a sub-region of the parent tile
    const subSize = Math.floor(w / scale);
    const offX = Math.floor((x % scale) * subSize);
    const offY = Math.floor((y % scale) * subSize);

    // Output canvas
    const outCanvas = new OffscreenCanvas(size, size);
    const outCtx = outCanvas.getContext('2d')!;
    const outImg = outCtx.createImageData(size, size);
    const out = outImg.data;

    const cellSize = metersPerPixel(z);

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        // Map output pixel to source pixel
        const sx = Math.min(Math.floor(offX + px * subSize / size), w - 1);
        const sy = Math.min(Math.floor(offY + py * subSize / size), w - 1);

        const idxL = (sy * w + Math.max(0, sx - 1)) * 4;
        const idxR = (sy * w + Math.min(w - 1, sx + 1)) * 4;
        const idxU = (Math.max(0, sy - 1) * w + sx) * 4;
        const idxD = (Math.min(w - 1, sy + 1) * w + sx) * 4;

        const hL = terrariumHeight(src[idxL], src[idxL + 1], src[idxL + 2]);
        const hR = terrariumHeight(src[idxR], src[idxR + 1], src[idxR + 2]);
        const hU = terrariumHeight(src[idxU], src[idxU + 1], src[idxU + 2]);
        const hD = terrariumHeight(src[idxD], src[idxD + 1], src[idxD + 2]);

        const dzdx = (hR - hL) / (2 * cellSize);
        const dzdy = (hD - hU) / (2 * cellSize);
        const slopeDeg = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * (180 / Math.PI);
        // Aspect in degrees clockwise from north
        const aspectDeg = (Math.atan2(dzdy, -dzdx) * (180 / Math.PI) + 360) % 360;

        const [r, g, b, a] = aspectColor(aspectDeg, slopeDeg);
        const oi = (py * size + px) * 4;
        out[oi] = r;
        out[oi + 1] = g;
        out[oi + 2] = b;
        out[oi + 3] = a;
      }
    }

    outCtx.putImageData(outImg, 0, 0);
    const outBlob = await outCanvas.convertToBlob({ type: 'image/png' });
    const arrayBuffer = await outBlob.arrayBuffer();
    return { data: arrayBuffer };
  });
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
    'opensnowmap': {
      type: 'raster',
      tiles: ['https://tiles.opensnowmap.org/pistes/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'Data © OpenStreetMap contributors ODbL, OpenSnowMap.org CC-BY-SA'
    },
    'esri-clarity': {
      type: 'raster',
      tiles: ['https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Tiles © Esri — Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
    },
    'slope': {
      type: 'raster',
      tiles: ['slope://{z}/{x}/{y}'],
      tileSize: 256,
      maxzoom: 15,
      attribution: 'Slope derived from AWS Terrain Tiles'
    },
    'aspect': {
      type: 'raster',
      tiles: ['aspect://{z}/{x}/{y}'],
      tileSize: 256,
      maxzoom: 15,
      attribution: 'Aspect derived from AWS Terrain Tiles'
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
    { id: 'esri-clarity', type: 'raster', source: 'esri-clarity', layout: { visibility: 'none' } },
    { id: 'carto-labels', type: 'raster', source: 'carto-labels', layout: { visibility: 'none' } },
    { id: 'opentopomap', type: 'raster', source: 'opentopomap', layout: { visibility: 'none' } },
    { id: 'street', type: 'raster', source: 'osm', layout: { visibility: 'none' } },
    { id: 'enhanced-hillshade', type: 'raster', source: 'enhanced-hillshade', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.6 } },
    { id: 'ski-pistes', type: 'raster', source: 'opensnowmap', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.9 } },
    { id: 'slope-overlay', type: 'raster', source: 'slope', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.7 } },
    { id: 'aspect-overlay', type: 'raster', source: 'aspect', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.7 } }
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
  'esri-clarity': { name: 'Esri Clarity', icon: '📡' },
  wayback: { name: 'Wayback', icon: '🕰️' },
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
  const loadZoomDoneRef = useRef<boolean>(false);

  const tracks = useAppStore((state) => state.tracks);
  const settings = useAppStore((state) => state.settings);
  const trailStyle = useAppStore((state) => state.settings.trailStyle);
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const pictures = useAppStore((state) => state.pictures);
  const playback = useAppStore((state) => state.playback);
  const animationPhase = useAppStore((state) => state.animationPhase);
  const setCameraPosition = useAppStore((state) => state.setCameraPosition);
  const setSelectedPictureId = useAppStore((state) => state.setSelectedPictureId);
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
  } = useComputedJourney();

  // Derive the current track name for the label
  const currentTrackName = currentSegment?.segment.type === 'track' && currentSegment.segment.trackId
    ? tracks.find((t) => t.id === currentSegment.segment.trackId)?.name
    : activeTrack?.name;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    registerSlopeProtocol();
    registerAspectProtocol();

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

    // Expose map instance globally so ExportPanel can call getCanvas() / triggerRepaint()
    mapGlobalRef.current = map.current;

    map.current.on('load', () => {
      setIsMapLoaded(true);
      map.current?.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current?.addControl(new maplibregl.FullscreenControl(), 'top-right');
      setupTrackSources();
    });

    return () => {
      mapGlobalRef.current = null;
      map.current?.remove();
      map.current = null;
      loadZoomDoneRef.current = false;
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

    // Track label source
    if (!map.current.getSource('main-track-label')) {
      map.current.addSource('main-track-label', {
        type: 'geojson',
        data: { type: 'Feature', properties: { label: '' }, geometry: { type: 'Point', coordinates: [0, 0] } }
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

    // Track label layer
    if (!map.current.getLayer('main-track-label')) {
      map.current.addLayer({
        id: 'main-track-label',
        type: 'symbol',
        source: 'main-track-label',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-offset': [0, -2.5],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'text-anchor': 'center',
          'visibility': 'none',
        },
        paint: {
          'text-color': trailStyle.trailColor,
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
        },
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

    if (map.current.getLayer('trail-line')) {
      map.current.setPaintProperty('trail-line', 'line-color', color);
    }
    if (map.current.getLayer('trail-completed')) {
      map.current.setPaintProperty('trail-completed', 'line-color', color);
    }
  }, [trailStyle.trailColor, currentTrackColor, isMapLoaded]);

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

          // After the view has settled, fire wheel events at the map center
          setTimeout(() => {
            const container = map.current?.getContainer();
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            // Fire a few scroll-down (zoom-out) wheel ticks
            for (let i = 0; i < 4; i++) {
              setTimeout(() => {
                container.dispatchEvent(new WheelEvent('wheel', {
                  bubbles: true,
                  cancelable: true,
                  clientX: cx,
                  clientY: cy,
                  deltaY: 120,      // positive = scroll down = zoom out
                  deltaMode: 0,     // DOM_DELTA_PIXEL
                }));
              }, i * 80);
            }
          }, 2200);
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

  // Setup and update comparison track layers
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Clean up old comparison layers
    ['comparison-trail-line', 'comparison-trail-completed', 'comparison-position-glow', 'comparison-track-label'].forEach((layerId) => {
      if (map.current!.getLayer(layerId)) map.current!.removeLayer(layerId);
    });
    ['comparison-trail', 'comparison-trail-completed', 'comparison-position', 'comparison-track-label'].forEach((sourceId) => {
      if (map.current!.getSource(sourceId)) map.current!.removeSource(sourceId);
    });

    if (comparisonTracks.length === 0) return;

    const ct = comparisonTracks[0]; // Support first comparison track
    const coords = ct.track.points.map((p) => [p.lon, p.lat]);

    // Full trail
    map.current.addSource('comparison-trail', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
    });
    map.current.addLayer({
      id: 'comparison-trail-line',
      type: 'line',
      source: 'comparison-trail',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': ct.color, 'line-width': 4, 'line-opacity': 0.5 },
    });

    // Completed trail
    map.current.addSource('comparison-trail-completed', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
    });
    map.current.addLayer({
      id: 'comparison-trail-completed',
      type: 'line',
      source: 'comparison-trail-completed',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': ct.color, 'line-width': 6 },
    });

    // Marker glow
    map.current.addSource('comparison-position', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: coords[0] || [0, 0] } },
    });
    map.current.addLayer({
      id: 'comparison-position-glow',
      type: 'circle',
      source: 'comparison-position',
      paint: {
        'circle-radius': 8,
        'circle-color': ct.color,
        'circle-opacity': 0.6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF',
      },
    });

    // Label
    map.current.addSource('comparison-track-label', {
      type: 'geojson',
      data: { type: 'Feature', properties: { label: ct.name }, geometry: { type: 'Point', coordinates: coords[0] || [0, 0] } },
    });
    map.current.addLayer({
      id: 'comparison-track-label',
      type: 'symbol',
      source: 'comparison-track-label',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 11,
        'text-offset': [0, -2],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-anchor': 'center',
      },
      paint: {
        'text-color': ct.color,
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 2,
      },
    });
  }, [comparisonTracks, isMapLoaded]);

  // Update comparison track position during animation
  useEffect(() => {
    if (!map.current || !isMapLoaded || comparisonTracks.length === 0) return;

    const ct = comparisonTracks[0];
    if (!ct.visible) return;

    const points = ct.track.points;
    if (points.length === 0) return;

    // Spatial-only: comparison progress matches main progress
    const progress = playback.progress;
    const targetDistance = ct.track.totalDistance * progress;

    // Find the point at this distance
    let pointIndex = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i].distance >= targetDistance) {
        pointIndex = i;
        break;
      }
      pointIndex = i;
    }

    const point = points[pointIndex];
    const currentCoord: [number, number] = [point.lon, point.lat];

    // Completed coordinates
    const completed: number[][] = [];
    for (const p of points) {
      if (p.distance <= targetDistance) {
        completed.push([p.lon, p.lat]);
      } else {
        break;
      }
    }

    // Update sources
    if (map.current.getSource('comparison-trail-completed') && completed.length > 1) {
      (map.current.getSource('comparison-trail-completed') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: completed },
      });
    }

    if (map.current.getSource('comparison-position')) {
      (map.current.getSource('comparison-position') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: currentCoord },
      });
    }

    if (map.current.getSource('comparison-track-label')) {
      (map.current.getSource('comparison-track-label') as maplibregl.GeoJSONSource).setData({
        type: 'Feature',
        properties: { label: ct.name },
        geometry: { type: 'Point', coordinates: currentCoord },
      });
    }
  }, [comparisonTracks, playback.progress, isMapLoaded]);

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
