import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '@/store/useAppStore';
import { INTRO_DURATION, OUTRO_DURATION } from '@/components/playback/PlaybackProvider';
import type { GPXPoint, GPXTrack } from '@/types';

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
    }
  },
  layers: [
    { id: 'background', type: 'raster', source: 'satellite' },
    { id: 'carto-labels', type: 'raster', source: 'carto-labels', layout: { visibility: 'none' } },
    { id: 'opentopomap', type: 'raster', source: 'opentopomap', layout: { visibility: 'none' } },
    { id: 'street', type: 'raster', source: 'osm', layout: { visibility: 'none' } },
    { id: 'enhanced-hillshade', type: 'raster', source: 'enhanced-hillshade', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.6 } }
  ]
};

// Map layer names for UI
const MAP_LAYERS: Record<string, { name: string; icon: string }> = {
  satellite: { name: 'Satellite', icon: '🛰️' },
  street: { name: 'Street', icon: '🛣️' },
  opentopomap: { name: 'Topo', icon: '⛰️' },
  'enhanced-hillshade': { name: 'Terrain', icon: '🏔️' },
};

// Get position at progress for a track
function getPositionAtProgress(track: GPXTrack, progress: number): GPXPoint | null {
  if (!track || track.points.length === 0) return null;
  
  const targetDistance = track.totalDistance * progress;
  
  let left = 0;
  let right = track.points.length - 1;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (track.points[mid].distance < targetDistance) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  
  const pointIndex = Math.max(1, left);
  const prevPoint = track.points[pointIndex - 1];
  const nextPoint = track.points[pointIndex];
  
  if (!prevPoint || !nextPoint) return track.points[0];
  
  const segmentDistance = nextPoint.distance - prevPoint.distance;
  if (segmentDistance === 0) return prevPoint;
  
  const ratio = (targetDistance - prevPoint.distance) / segmentDistance;
  
  return {
    lat: prevPoint.lat + (nextPoint.lat - prevPoint.lat) * ratio,
    lon: prevPoint.lon + (nextPoint.lon - prevPoint.lon) * ratio,
    elevation: prevPoint.elevation + (nextPoint.elevation - prevPoint.elevation) * ratio,
    time: prevPoint.time,
    heartRate: prevPoint.heartRate,
    cadence: prevPoint.cadence,
    power: prevPoint.power,
    temperature: prevPoint.temperature,
    distance: targetDistance,
    speed: prevPoint.speed + (nextPoint.speed - prevPoint.speed) * ratio,
  };
}

// Calculate bearing between two points
function calculateBearing(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const lon1 = from.lon * Math.PI / 180;
  const lon2 = to.lon * Math.PI / 180;
  
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;
  
  return bearing;
}

// Smooth bearing using exponential moving average
function smoothBearing(currentBearing: number, targetBearing: number, smoothingFactor: number = 0.05): number {
  // Handle the 360/0 wraparound
  let diff = targetBearing - currentBearing;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  return (currentBearing + diff * smoothingFactor + 360) % 360;
}

// Interpolate position between two points
function interpolatePosition(from: { lat: number; lon: number }, to: { lat: number; lon: number }, progress: number) {
  return {
    lat: from.lat + (to.lat - from.lat) * progress,
    lon: from.lon + (to.lon - from.lon) * progress,
  };
}

export function TrailMap({}: TrailMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const smoothBearingRef = useRef<number>(0);
  const targetBearingRef = useRef<number>(0);
  
  const tracks = useAppStore((state) => state.tracks);
  const activeTrackId = useAppStore((state) => state.activeTrackId);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const settings = useAppStore((state) => state.settings);
  const cameraSettings = useAppStore((state) => state.cameraSettings);
  const pictures = useAppStore((state) => state.pictures);
  const iconChanges = useAppStore((state) => state.iconChanges);
  const playback = useAppStore((state) => state.playback);
  const animationPhase = useAppStore((state) => state.animationPhase);
  const setCameraPosition = useAppStore((state) => state.setCameraPosition);
  const setSelectedPictureId = useAppStore((state) => state.setSelectedPictureId);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentIcon, setCurrentIcon] = useState('🏃');
  
  const activeTrack = tracks.find((t) => t.id === activeTrackId);
  
  // Get current position based on journey segments and playback progress
  const getCurrentJourneyPosition = useCallback((): { 
    position: GPXPoint | null; 
    bearing: number;
    isTransport: boolean;
    transportMode?: string;
  } => {
    if (journeySegments.length === 0) {
      if (!activeTrack) return { position: null, bearing: 0, isTransport: false };
      const position = getPositionAtProgress(activeTrack, playback.progress);
      const bearing = getBearingAtProgress(activeTrack, playback.progress);
      return { position, bearing, isTransport: false };
    }
    
    const totalDuration = journeySegments.reduce((sum, seg) => sum + (seg.duration || 0), 0);
    if (totalDuration === 0) return { position: null, bearing: 0, isTransport: false };
    
    const currentTime = playback.progress * totalDuration;
    let accumulatedTime = 0;
    let currentSegmentIndex = 0;
    
    for (let i = 0; i < journeySegments.length; i++) {
      const segmentDuration = journeySegments[i].duration || 0;
      if (currentTime < accumulatedTime + segmentDuration) {
        currentSegmentIndex = i;
        break;
      }
      accumulatedTime += segmentDuration;
    }
    
    const segment = journeySegments[currentSegmentIndex];
    const segmentProgress = (currentTime - accumulatedTime) / (segment.duration || 1);
    
    if (segment.type === 'track') {
      const track = tracks.find((t) => t.id === segment.trackId);
      if (!track) return { position: null, bearing: 0, isTransport: false };
      
      const position = getPositionAtProgress(track, segmentProgress);
      const bearing = getBearingAtProgress(track, segmentProgress);
      return { position, bearing, isTransport: false };
    } else {
      const from = segment.from;
      const to = segment.to;
      const position = interpolatePosition(from, to, segmentProgress);
      const bearing = calculateBearing(from, to);
      return { 
        position: { 
          ...position, 
          elevation: 0, 
          time: null, 
          heartRate: null, 
          cadence: null, 
          power: null, 
          temperature: null, 
          distance: 0, 
          speed: 0 
        }, 
        bearing, 
        isTransport: true,
        transportMode: segment.mode 
      };
    }
  }, [journeySegments, tracks, activeTrack, playback.progress]);
  
  const getBearingAtProgress = (track: GPXTrack, progress: number): number => {
    const pointIndex = Math.floor(progress * (track.points.length - 1));
    const currentPoint = track.points[pointIndex];
    const nextPoint = track.points[Math.min(pointIndex + 5, track.points.length - 1)];
    
    if (currentPoint && nextPoint) {
      return calculateBearing(
        { lat: currentPoint.lat, lon: currentPoint.lon },
        { lat: nextPoint.lat, lon: nextPoint.lon }
      );
    }
    return smoothBearingRef.current;
  };
  
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
      attributionControl: { compact: true },
    } as any);
    
    map.current.on('load', () => {
      setIsMapLoaded(true);
      
      map.current?.addControl(new maplibregl.NavigationControl(), 'bottom-right');
      map.current?.addControl(new maplibregl.FullscreenControl(), 'bottom-right');
      map.current?.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
      
      // Add track sources
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
    
    // Add sources for tracks
    if (!map.current.getSource('trail-line')) {
      map.current.addSource('trail-line', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
    }
    
    if (!map.current.getSource('trail-completed')) {
      map.current.addSource('trail-completed', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
    }
    
    if (!map.current.getSource('current-position')) {
      map.current.addSource('current-position', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [0, 0] } }
      });
    }
    
    // Add layers
    if (!map.current.getLayer('trail-line')) {
      map.current.addLayer({
        id: 'trail-line',
        type: 'line',
        source: 'trail-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#C1652F', 'line-width': 4, 'line-opacity': 0.7 }
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
    
    // Hide all layers first
    ['background', 'street', 'opentopomap', 'enhanced-hillshade'].forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, 'visibility', 'none');
      }
    });
    
    // Show target layer
    if (map.current.getLayer(targetLayer)) {
      map.current.setLayoutProperty(targetLayer, 'visibility', 'visible');
    }
    
    // Show labels for street and topo
    if ((settings.mapStyle === 'street' || settings.mapStyle === 'topo' || settings.mapStyle === 'outdoor') 
        && map.current.getLayer('carto-labels')) {
      map.current.setLayoutProperty('carto-labels', 'visibility', 'visible');
    } else if (map.current.getLayer('carto-labels')) {
      map.current.setLayoutProperty('carto-labels', 'visibility', 'none');
    }
  }, [settings.mapStyle, isMapLoaded]);
  
  // Update tracks on map
  const updateTracks = useCallback(() => {
    if (!map.current || !isMapLoaded) return;
    
    // Build coordinates for all tracks
    const allCoordinates: number[][] = [];
    
    tracks.forEach((track, index) => {
      if (track.points.length === 0) return;
      
      const coordinates = track.points.map((p) => [p.lon, p.lat]);
      allCoordinates.push(...coordinates);
      
      // Update main track line
      if (index === 0 && map.current?.getSource('trail-line')) {
        (map.current.getSource('trail-line') as maplibregl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates }
        });
      }
    });
    
    // Fit bounds to all tracks
    if (allCoordinates.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoordinates.forEach((coord) => bounds.extend(coord as [number, number]));
      map.current.fitBounds(bounds, { padding: 100, duration: 0 });
    }
  }, [tracks, isMapLoaded]);
  
  useEffect(() => {
    updateTracks();
  }, [updateTracks]);
  
  // Update icon based on progress
  useEffect(() => {
    const sortedIcons = [...iconChanges].sort((a, b) => a.progress - b.progress);
    let currentIconIndex = 0;
    
    for (let i = 0; i < sortedIcons.length; i++) {
      if (playback.progress >= sortedIcons[i].progress) {
        currentIconIndex = i;
      }
    }
    
    if (sortedIcons[currentIconIndex]) {
      setCurrentIcon(sortedIcons[currentIconIndex].icon);
    }
  }, [playback.progress, iconChanges]);
  
  // Update marker position and camera follow
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;
    
    const { position, bearing, isTransport } = getCurrentJourneyPosition();
    if (!position) return;
    
    // Update smooth bearing
    targetBearingRef.current = bearing;
    smoothBearingRef.current = smoothBearing(smoothBearingRef.current, bearing, 0.08);
    
    // Create or update marker
    const icon = isTransport ? (
      { car: '🚗', bus: '🚌', train: '🚆', plane: '✈️', bike: '🚲', walk: '🚶', ferry: '⛴️' } as Record<string, string>
    )[getCurrentJourneyPosition().transportMode || 'car'] || '🚗' : currentIcon;
    
    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'tr-marker';
      el.innerHTML = `<span>${icon}</span>`;
      
      markerRef.current = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([position.lon, position.lat])
        .addTo(map.current);
    } else {
      markerRef.current.setLngLat([position.lon, position.lat]);
      const el = markerRef.current.getElement();
      el.innerHTML = `<span>${icon}</span>`;
    }
    
    // Update completed track line
    if (activeTrack && map.current.getSource('trail-completed')) {
      const completedPoints = activeTrack.points.filter(
        (p) => p.distance <= position.distance
      );
      const completedCoords = completedPoints.map((p) => [p.lon, p.lat]);
      
      (map.current.getSource('trail-completed') as maplibregl.GeoJSONSource)?.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: completedCoords },
      });
    }
    
    // Camera follow logic - only during 'playing' phase
    const { mode, followBehindPreset } = cameraSettings;

    if (animationPhase === 'playing' && mode !== 'overview') {
      const presets = {
        'very-close': { zoom: 17, pitch: 60 },
        'close': { zoom: 16, pitch: 55 },
        'medium': { zoom: 15, pitch: 50 },
        'far': { zoom: 14, pitch: 45 },
      };
      const preset = presets[followBehindPreset] || presets.medium;

      if (mode === 'follow') {
        map.current.easeTo({
          center: [position.lon, position.lat],
          zoom: 16,
          pitch: 0,
          bearing: 0,
          duration: 100,
        });
      } else if (mode === 'follow-behind') {
        // Follow from behind - camera is behind the marker looking forward
        // Use the SMOOTHED bearing for camera direction
        const cameraBearing = smoothBearingRef.current;

        map.current.easeTo({
          center: [position.lon, position.lat],
          zoom: preset.zoom,
          pitch: preset.pitch,
          bearing: cameraBearing,
          duration: 100,
        });
      }
    }
    
    // Update camera position in store
    setCameraPosition({
      lat: position.lat,
      lon: position.lon,
      zoom: map.current.getZoom(),
      pitch: map.current.getPitch(),
      bearing: map.current.getBearing(),
    });
  }, [getCurrentJourneyPosition, playback.isPlaying, playback.progress, animationPhase, cameraSettings, activeTrack, currentIcon, isMapLoaded, setCameraPosition]);
  
  // Handle camera mode changes
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const { mode } = cameraSettings;

    if (mode === 'overview') {
      if (tracks.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        tracks.forEach((track) => {
          track.points.forEach((p) => bounds.extend([p.lon, p.lat]));
        });
        map.current.fitBounds(bounds, { padding: 100, duration: 500 });
      }
    }
  }, [cameraSettings.mode, tracks, isMapLoaded]);

  // Handle intro and outro animations based on animation phase
  useEffect(() => {
    if (!map.current || !isMapLoaded || !activeTrack) return;

    const { followBehindPreset } = cameraSettings;
    const presets = {
      'very-close': { zoom: 17, pitch: 60 },
      'close': { zoom: 16, pitch: 55 },
      'medium': { zoom: 15, pitch: 50 },
      'far': { zoom: 14, pitch: 45 },
    };
    const preset = presets[followBehindPreset] || presets.medium;

    if (animationPhase === 'intro') {
      // Cinematic zoom-in from overview to starting position
      const startPoint = activeTrack.points[0];
      if (startPoint) {
        // Calculate bearing from first segment
        const lookAheadIndex = Math.min(10, activeTrack.points.length - 1);
        const lookAheadPoint = activeTrack.points[lookAheadIndex];
        const initialBearing = calculateBearing(
          { lat: startPoint.lat, lon: startPoint.lon },
          { lat: lookAheadPoint.lat, lon: lookAheadPoint.lon }
        );

        // Smooth zoom-in animation
        map.current.flyTo({
          center: [startPoint.lon, startPoint.lat],
          zoom: preset.zoom,
          pitch: preset.pitch,
          bearing: initialBearing,
          duration: INTRO_DURATION,
          easing: (t) => 1 - Math.pow(1 - t, 3), // Ease-out cubic
        });

        // Initialize bearing refs
        smoothBearingRef.current = initialBearing;
        targetBearingRef.current = initialBearing;
      }
    } else if (animationPhase === 'outro') {
      // Zoom out to show entire track
      const bounds = new maplibregl.LngLatBounds();
      tracks.forEach((track) => {
        track.points.forEach((p) => bounds.extend([p.lon, p.lat]));
      });

      map.current.fitBounds(bounds, {
        padding: 100,
        pitch: 45,
        bearing: 0,
        duration: OUTRO_DURATION,
        easing: (t) => 1 - Math.pow(1 - t, 2), // Ease-out quadratic
      } as maplibregl.FitBoundsOptions);
    } else if (animationPhase === 'idle') {
      // Reset to overview when idle
      if (tracks.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        tracks.forEach((track) => {
          track.points.forEach((p) => bounds.extend([p.lon, p.lat]));
        });
        map.current.fitBounds(bounds, { padding: 100, duration: 1000 });
      }
    }
  }, [animationPhase, activeTrack, tracks, cameraSettings.followBehindPreset, isMapLoaded]);
  
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
    </div>
  );
}

export { MAP_LAYERS };
