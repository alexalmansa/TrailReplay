/**
 * MapRenderer - Main map rendering class (refactored for modularity)
 */
import maplibregl from 'maplibre-gl';
import { GPXParser } from '../gpxParser.js';
import { MapUtils } from './MapUtils.js';
import { MapAnnotations } from './MapAnnotations.js';
import { MapIconChanges } from './MapIconChanges.js';
import { MapPictureAnnotations } from './MapPictureAnnotations.js';
import { FollowBehindCamera } from './FollowBehindCamera.js';
import { DEFAULT_SETTINGS } from '../utils/constants.js';
import { heartRateColorMapper } from '../utils/heartRateColors.js';
// TODO: Import other modules as they are created

export class MapRenderer {
    constructor(container, app = null) {
        this.container = container;
        this.app = app;
        this.map = null;
        this.trackData = null;
        this.animationMarker = null;
        this.isAnimating = false;
        this.animationProgress = 0;
        this.animationSpeed = 1;
        this.currentActivityType = 'running';
        this.pathColor = '#C1652F';
        this.markerSize = DEFAULT_SETTINGS.DEFAULT_MARKER_SIZE;
        
        // Heart rate color mode properties
        this.colorMode = 'fixed'; // 'fixed' or 'heartRate'
        this.heartRateColors = null; // Will store color array for heart rate mode
        this.heartRateSegments = [];
        this.heartRateSegmentCollection = { type: 'FeatureCollection', features: [] };
        this.autoZoom = true;
        this.showCircle = true;
        this.showMarker = false; // Disabled by default for more professional look
        this.showEndStats = true;
        this.showTrackLabel = false; // Hide "Track 1" letters by default
        
        // Comparison mode properties
        this.comparisonTrackData = null;
        this.comparisonGpxParser = null;
        this.timeOverlap = null;
        this.additionalComparisons = []; // extra overlapping tracks

        // Track colors for comparison mode
        this.mainTrackColor = '#2563EB'; // Blue for main track
        this.comparisonTrackColor = '#DC2626'; // Red for comparison track
        this.currentIcon = '🏃‍♂️';
        this.userSelectedBaseIcon = null; // Stores user's custom base icon choice
        this.gpxParser = new GPXParser();
        
        // Segment-aware animation properties
        this.segmentTimings = null;
        this.currentSegmentIndex = 0;
        this.segmentProgress = 0;
        this.lastAnimationTime = 0;
        this.journeyElapsedTime = 0;
        
        // Track 3D mode state
        this.is3DMode = false;
        this.currentTerrainSource = 'mapzen';
        
        // Camera mode properties
        this.cameraMode = 'followBehind'; // 'standard' or 'followBehind' - followBehind is default
        
        // Performance mode for video recording
        this.performanceMode = false;
        
        // Initialize modular components AFTER other properties are set
        this.annotations = new MapAnnotations(this);
        this.iconChanges = new MapIconChanges(this);
        this.pictureAnnotations = new MapPictureAnnotations(this);
        this.followBehindCamera = new FollowBehindCamera(this);
        
        // Ensure proper method binding for icon changes
        if (this.iconChanges && typeof this.iconChanges.checkIconChanges === 'function') {
            // Explicitly bind the method to ensure it's available
            this.iconChanges.checkIconChanges = this.iconChanges.checkIconChanges.bind(this.iconChanges);
        }
        
        this.initializeMap();

        // Add resize event listener for dynamic layout detection
        this.setupResizeListener();

        // Initialize default camera mode after a brief delay
        setTimeout(() => {
            this.initializeCameraMode();
            // Detect initial layout after map is fully loaded
            setTimeout(() => {
                this.detectAndSetMapLayout();
            }, 500);
        }, 100);
        this.preloadedTiles = new Set(); // Track preloaded tile URLs
        this.currentMapStyle = 'satellite'; // Track current style for preloading
    }

    // Safely compute interpolated time (ms since epoch) at a given progress for a track's points
    getTimeAtProgressMs(trackData, progress) {
        try {
            const points = trackData?.trackPoints;
            if (!points || points.length === 0) return null;
            const total = points.length;
            const target = Math.min(Math.max(progress, 0), 1) * (total - 1);
            const i = Math.floor(target);
            const f = target - i;
            const p0 = points[i];
            const p1 = points[Math.min(i + 1, total - 1)];
            if (p0?.time && p1?.time) {
                const t0 = p0.time.getTime();
                const t1 = p1.time.getTime();
                return t0 + (t1 - t0) * f;
            }
            // Fallback to stats window if per-point time missing
            const start = trackData?.stats?.startTime?.getTime?.();
            const end = trackData?.stats?.endTime?.getTime?.();
            if (typeof start === 'number' && typeof end === 'number' && end > start) {
                return start + (end - start) * Math.min(Math.max(progress, 0), 1);
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    // Resolve start/end timestamps (ms) for a track (from stats or point times)
    getTrackTimeWindowMs(trackData) {
        try {
            const statsStart = trackData?.stats?.startTime?.getTime?.();
            const statsEnd = trackData?.stats?.endTime?.getTime?.();
            if (typeof statsStart === 'number' && typeof statsEnd === 'number' && statsEnd > statsStart) {
                return { start: statsStart, end: statsEnd };
            }
            const pts = trackData?.trackPoints || [];
            const times = pts.filter(p => p.time).map(p => p.time.getTime());
            if (times.length > 0) {
                const start = Math.min(...times);
                const end = Math.max(...times);
                if (end > start) return { start, end };
            }
        } catch (e) {}
        return { start: null, end: null };
    }

    initializeMap() {
        // Initialize MapLibre GL JS with free tile sources
        this.map = new maplibregl.Map({
            container: this.container,
            style: {
                version: 8,
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
                sources: {
                    'osm': {
                        type: 'raster',
                        tiles: [
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                        ],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors'
                    },
                    // --- OpenTopoMap (topographic/terrain) ---
                    'opentopomap': {
                        type: 'raster',
                        tiles: [
                            'https://a.tile.opentopomap.org/{z}/{x}/{y}.png'
                        ],
                        tileSize: 256,
                        attribution: '© OpenTopoMap (CC-BY-SA)'
                    },
                    'satellite': {
                        type: 'raster',
                        tiles: [
                            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        ],
                        tileSize: 256,
                        attribution: '© Esri'
                    },
                    'carto-labels': {
                        type: 'raster',
                        tiles: [
                            'https://cartodb-basemaps-a.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png'
                        ],
                        tileSize: 256,
                        attribution: '© CartoDB'
                    },
                    // --- Enhanced mountain terrain source ---
                    'enhanced-hillshade': {
                        type: 'raster',
                        tiles: [
                            'https://cloud.sdsc.edu/v1/AUTH_opentopography/Raster/ASTER_GDEM/{z}/{x}/{y}.png'
                        ],
                        tileSize: 256,
                        attribution: '© OpenTopography/ASTER GDEM'
                    }
                },
                layers: [
                    {
                        id: 'background',
                        type: 'raster',
                        source: 'satellite'
                    },
                    // CartoDB labels above satellite (initially hidden)
                    {
                        id: 'carto-labels',
                        type: 'raster',
                        source: 'carto-labels',
                        layout: { visibility: 'none' }
                    },
                    // --- OpenTopoMap layer (initially hidden) ---
                    {
                        id: 'opentopomap',
                        type: 'raster',
                        source: 'opentopomap',
                        layout: { visibility: 'none' }
                    },
                    // OSM street layer (initially hidden)
                    {
                        id: 'street',
                        type: 'raster',
                        source: 'osm',
                        layout: { visibility: 'none' }
                    },
                    // --- Enhanced mountain terrain layer (initially hidden) ---
                    {
                        id: 'enhanced-hillshade',
                        type: 'raster',
                        source: 'enhanced-hillshade',
                        layout: { visibility: 'none' },
                        paint: { 'raster-opacity': 0.6 }
                    }
                ]
            },
            center: [0, 0],
            zoom: 2,
            pitch: 0,
            bearing: 0,
            maxPitch: 85,
            antialias: true,
            preserveDrawingBuffer: true,
            // Improve cache behavior to reduce tile thrash across zooms
            maxTileCacheZoomLevels: 10,
            // Keep label fade minimal; raster fade is set per-layer below
            fadeDuration: 150
        });

        this.map.on('load', () => {
            this.setupMapLayers();
            // Reduce raster cross-fade to avoid visible washout during fast moves
            try {
                ['background','opentopomap','street','carto-labels'].forEach(layerId => {
                    if (this.map.getLayer(layerId)) {
                        this.map.setPaintProperty(layerId, 'raster-fade-duration', 100);
                    }
                });
            } catch (_) {}
            // Allow zooming before animation starts in follow-behind mode
            if (this.cameraMode === 'followBehind' && !this.isAnimating) {
                this.enableZoomOnlyInteractions();
            }
            // Initialize marker-dependent controls state
            this.updateMarkerDependentControls(this.showMarker);
            
            // Initialize elevation profile color
            const progressPath = document.getElementById('progressPath');
            if (progressPath) {
                progressPath.setAttribute('stroke', this.pathColor);
            }
            
            // Initialize elevation profile gradient
            this.updateElevationGradient(this.pathColor);
        });

        // Add click handler for annotations and icon changes
        this.map.on('click', (e) => {
            if (this.isAnnotationMode) {
                this.annotations.handleAnnotationClick(e);
            } else if (this.isIconChangeMode) {
                // Stop event propagation to prevent modal from closing immediately
                e.originalEvent?.stopPropagation();
                this.iconChanges.handleIconChangeClick(e);
            }
        });

        // Change cursor when in special modes
        this.map.on('mouseenter', () => {
            if (this.isAnnotationMode || this.isIconChangeMode) {
                this.map.getCanvas().style.cursor = 'crosshair';
            } else {
                this.map.getCanvas().style.cursor = '';
            }
        });

        // Also update cursor on mousemove to ensure it stays correct
        this.map.on('mousemove', () => {
            if (this.isAnnotationMode || this.isIconChangeMode) {
                if (this.map.getCanvas().style.cursor !== 'crosshair') {
                    this.map.getCanvas().style.cursor = 'crosshair';
                }
            } else {
                if (this.map.getCanvas().style.cursor === 'crosshair') {
                    this.map.getCanvas().style.cursor = '';
                }
            }
        });
    }

    setupMapLayers() {
        // Add sources for trail visualization
        this.map.addSource('trail-line', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: []
                }
            }
        });

        this.map.addSource('trail-completed', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: []
                }
            }
        });

        this.map.addSource('current-position', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            }
        });

        this.map.addSource('annotations', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        // Add trail line layer with data-driven styling for segments
        this.map.addLayer({
            id: 'trail-line',
            type: 'line',
            source: 'trail-line',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': [
                    'case',
                    ['==', ['get', 'isTransportation'], true],
                    [
                        'case',
                        ['==', ['get', 'segmentMode'], 'car'], '#ff6b6b',
                        ['==', ['get', 'segmentMode'], 'driving'], '#ff6b6b',
                        ['==', ['get', 'segmentMode'], 'boat'], '#4ecdc4',
                        ['==', ['get', 'segmentMode'], 'plane'], '#ffe66d',
                        ['==', ['get', 'segmentMode'], 'train'], '#a8e6cf',
                        ['==', ['get', 'segmentMode'], 'walk'], '#ff9f43',
                        ['==', ['get', 'segmentMode'], 'cycling'], '#48cae4',
                        '#ff6b6b' // default transportation color
                    ],
                    this.pathColor // default color for GPX tracks
                ],
                'line-width': [
                    'case',
                    ['==', ['get', 'isTransportation'], true], 6,
                    4
                ],
                'line-opacity': [
                    'case',
                    ['==', ['get', 'isTransportation'], true], 0.7,
                    0.4
                ],
                'line-dasharray': [1, 0]
            }
        });

        // Add completed trail layer (should be above trail-line for visibility during animation)
        this.map.addLayer({
            id: 'trail-completed',
            type: 'line',
            source: 'trail-completed',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': this.pathColor,
                'line-width': 6,
                'line-opacity': 1.0
            }
        });

        // Add current position glow
        this.map.addLayer({
            id: 'current-position-glow',
            type: 'circle',
            source: 'current-position',
            paint: {
                'circle-radius': 15 * this.markerSize,
                'circle-color': this.pathColor,
                'circle-opacity': 0.3
            }
        });

        // Create and add activity icon layer
        this.createAndAddActivityIcon();

        // Add track label for main track
        this.map.addSource('main-track-label', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {
                    label: 'Track 1'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            }
        });

        this.map.addLayer({
            id: 'main-track-label',
            type: 'symbol',
            source: 'main-track-label',
            layout: {
                'text-field': 'Track 1',
                'text-size': 10,
                'text-offset': [0, 2.5], // Position above the marker
                'text-allow-overlap': true,
                'text-ignore-placement': true,
                'text-anchor': 'center',
                'visibility': this.showTrackLabel ? 'visible' : 'none'
            },
            paint: {
                'text-color': this.pathColor,
                'text-halo-color': '#FFFFFF',
                'text-halo-width': 2
            }
        });

        // Add annotations layer (hidden initially)
        this.map.addLayer({
            id: 'annotations',
            type: 'circle',
            source: 'annotations',
            paint: {
                'circle-radius': 8,
                'circle-color': '#4ecdc4',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2,
                'circle-opacity': 0
            }
        });
    }

    // Delegate annotation methods to the annotations module
    enableAnnotationMode() {
        if (this.annotations && typeof this.annotations.enableAnnotationMode === 'function') {
        return this.annotations.enableAnnotationMode();
        } else {
            console.error('annotations.enableAnnotationMode not available');
        }
    }

    disableAnnotationMode() {
        if (this.annotations && typeof this.annotations.disableAnnotationMode === 'function') {
        return this.annotations.disableAnnotationMode();
        } else {
            console.error('annotations.disableAnnotationMode not available');
        }
    }

    addAnnotation(progress, title, description, icon = '📍') {
        if (this.annotations && typeof this.annotations.addAnnotation === 'function') {
        return this.annotations.addAnnotation(progress, title, description, icon);
        } else {
            console.error('annotations.addAnnotation not available');
            return null;
        }
    }

    removeAnnotation(id) {
        if (this.annotations && typeof this.annotations.removeAnnotation === 'function') {
        return this.annotations.removeAnnotation(id);
        } else {
            console.error('annotations.removeAnnotation not available');
        }
    }

    getAnnotations() {
        if (this.annotations && typeof this.annotations.getAnnotations === 'function') {
            return this.annotations.getAnnotations();
        } else {
            console.error('annotations.getAnnotations not available');
            return [];
        }
    }

    // Picture annotation methods
    addPictureAnnotation(progress, title, description, imageData, displayDuration = 3000) {
        if (this.pictureAnnotations && typeof this.pictureAnnotations.addPictureAnnotation === 'function') {
            return this.pictureAnnotations.addPictureAnnotation(progress, title, description, imageData, displayDuration);
        } else {
            console.error('pictureAnnotations.addPictureAnnotation not available');
            return null;
        }
    }

    getPictureAnnotations() {
        if (this.pictureAnnotations && typeof this.pictureAnnotations.getPictureAnnotations === 'function') {
            return this.pictureAnnotations.getPictureAnnotations();
        } else {
            console.error('pictureAnnotations.getPictureAnnotations not available');
            return [];
        }
    }

    removePictureAnnotation(id) {
        if (this.pictureAnnotations && typeof this.pictureAnnotations.removePictureAnnotation === 'function') {
            return this.pictureAnnotations.removePictureAnnotation(id);
        } else {
            console.error('pictureAnnotations.removePictureAnnotation not available');
        }
    }

    // Delegate icon change methods to the iconChanges module
    enableIconChangeMode() {
        if (this.iconChanges && typeof this.iconChanges.enableIconChangeMode === 'function') {
        return this.iconChanges.enableIconChangeMode();
        }
    }

    disableIconChangeMode() {
        if (this.iconChanges && typeof this.iconChanges.disableIconChangeMode === 'function') {
        return this.iconChanges.disableIconChangeMode();
        }
    }

    addIconChange(progress, icon) {
        if (this.iconChanges && typeof this.iconChanges.addIconChange === 'function') {
        return this.iconChanges.addIconChange(progress, icon);
        } else {
            console.error('iconChanges.addIconChange not available');
            return null;
        }
    }

    removeIconChange(id) {
        if (this.iconChanges && typeof this.iconChanges.removeIconChange === 'function') {
        return this.iconChanges.removeIconChange(id);
        } else {
            console.error('iconChanges.removeIconChange not available');
        }
    }

    getIconChanges() {
        if (this.iconChanges && typeof this.iconChanges.getIconChanges === 'function') {
            return this.iconChanges.getIconChanges();
        } else {
            console.error('iconChanges.getIconChanges not available');
            return [];
        }
    }

    clearIconChanges() {
        if (this.iconChanges && this.iconChanges.iconChanges) {
            this.iconChanges.iconChanges = [];
        }
    }

    // Activity type and icon management
    setActivityType(activityType) {
        this.currentActivityType = activityType;
        this.currentIcon = this.getBaseIcon();
        
        if (this.map && this.map.loaded()) {
            this.updateActivityIcon();
        }
    }

    setCurrentIcon(icon) {
        this.currentIcon = icon;
        
        // If not currently animating/playing, save this as the user's preferred base icon
        // This ensures it persists when playback starts
        if (!this.isAnimating) {

            this.userSelectedBaseIcon = icon;
        }
        
        if (this.map && this.map.loaded()) {
            this.updateActivityIcon();
        }
        
        const iconUpdateEvent = new CustomEvent('currentIconUpdated', {
            detail: { icon }
        });
        document.dispatchEvent(iconUpdateEvent);
    }

    // Clear user's custom base icon and return to activity-based icon
    clearUserBaseIcon() {

        this.userSelectedBaseIcon = null;
        const activityIcon = this.getBaseIcon(); // Will now return activity-based icon
        this.setCurrentIcon(activityIcon);
    }

    // Map styling methods
    setPathColor(color) {
        this.pathColor = color;
        
        if (this.map.loaded()) {
            this.map.setPaintProperty('trail-line', 'line-color', color);
            this.map.setPaintProperty('trail-completed', 'line-color', color);
            this.map.setPaintProperty('current-position-glow', 'circle-color', color);
            if (this.map.getLayer('main-track-label')) {
                this.map.setPaintProperty('main-track-label', 'text-color', color);
            }
        }
        
        // Update elevation profile progress color
        const progressPath = document.getElementById('progressPath');
        if (progressPath) {
            progressPath.setAttribute('stroke', color);
        }
        
        // Update elevation profile gradient colors
        this.updateElevationGradient(color);
    }

    /**
     * Set color mode and update visualization
     * @param {string} mode - 'fixed' or 'heartRate'
     */
    setColorMode(mode) {
        console.log(`🎨 Setting color mode to: ${mode}`, {
            hasTrackData: !!this.trackData,
            trackPointsCount: this.trackData?.trackPoints?.length || 0,
            hasOriginalData: !!this.trackData?.originalTrackData,
            hasHeartRateData: this.trackData?.stats?.hasHeartRateData,
            hasHeartRateColors: !!this.heartRateColors,
            heartRateColorsLength: this.heartRateColors?.length || 0
        });

        this.colorMode = mode;

        if (mode === 'heartRate') {
            this.generateHeartRateColors();
            if (this.heartRateColors && this.heartRateColors.length > 0) {
                this.updateTrailWithHeartRateColors();
            }
        } else {
            // Fixed color mode
            this.updateMapColors();
        }
    }

    /**
     * Generate heart rate colors for the current track
     */
    generateHeartRateColors() {
        if (!this.trackData) {
            console.warn('No track data available for heart rate colors');
            return;
        }

        // Use original track data if available (for journeys), otherwise use current track points
        const trackPoints = this.trackData.originalTrackData?.trackPoints || this.trackData.trackPoints;

        if (!trackPoints || trackPoints.length === 0) {
            console.warn('No track points available for heart rate colors');
            return;
        }

        console.log('💓 Generating heart rate colors for track', {
            trackPointsCount: trackPoints.length,
            hasOriginalData: !!this.trackData.originalTrackData,
            colorMode: this.colorMode
        });

        this.heartRateColors = heartRateColorMapper.generateColorsForTrack(trackPoints);

        // Log statistics
        const analysis = heartRateColorMapper.analyzeHeartRateData(trackPoints);
        console.log('💓 Heart rate color analysis:', analysis);

        if (this.trackData?.stats) {
            this.trackData.stats.hasHeartRateData = analysis.hasData;
            this.trackData.stats.heartRateDataPoints = analysis.pointsWithData;
            this.trackData.stats.avgHeartRate = analysis.avgHeartRate;
            this.trackData.stats.minHeartRate = analysis.minHeartRate;
            this.trackData.stats.maxHeartRate = analysis.maxHeartRate;
        }

        if (this.heartRateColors && this.heartRateColors.length > 0) {
            console.log('💓 Generated heart rate colors:', this.heartRateColors.length, 'colors');
            console.log('💓 Sample colors:', this.heartRateColors.slice(0, 10));
            console.log('💓 Heart rate colors array length matches track points:', this.heartRateColors.length === trackPoints.length);

            // Check if colors are being generated correctly
            const validColors = this.heartRateColors.filter(color => color !== '#808080' && color !== this.pathColor);
            console.log('💓 Valid heart rate colors:', validColors.length, 'out of', this.heartRateColors.length);

            this.prepareHeartRateSegments(trackPoints);
        } else {
            console.warn('💓 No heart rate colors generated!');
            this.heartRateSegments = [];
            this.heartRateSegmentCollection = { type: 'FeatureCollection', features: [] };
        }
    }

    prepareHeartRateSegments(trackPoints) {
        if (!Array.isArray(trackPoints) || trackPoints.length < 2 || !this.heartRateColors) {
            this.heartRateSegments = [];
            this.heartRateSegmentCollection = { type: 'FeatureCollection', features: [] };
            return;
        }

        const segments = [];
        const segmentSize = 10;

        for (let start = 0; start < trackPoints.length - 1; start += segmentSize) {
            const end = Math.min(start + segmentSize, trackPoints.length - 1);
            const coordinates = trackPoints.slice(start, end + 1).map(pt => [pt.lon, pt.lat]);
            if (coordinates.length < 2) continue;

            const colorIndex = Math.min(Math.floor((start + end) / 2), this.heartRateColors.length - 1);
            const color = this.heartRateColors[colorIndex] || this.pathColor;

            segments.push({
                type: 'Feature',
                properties: {
                    color,
                    startIndex: start,
                    endIndex: end
                },
                geometry: {
                    type: 'LineString',
                    coordinates
                }
            });
        }

        this.heartRateSegments = segments;
        this.heartRateSegmentCollection = { type: 'FeatureCollection', features: segments };
        console.log('💓 Prepared heart rate segments:', segments.length);
    }

    /**
     * Update heart rate zones from user input
     */
    updateHeartRateZones() {
        const zones = heartRateColorMapper.getZonesFromUI();
        if (zones.length > 0) {
            heartRateColorMapper.setZones(zones);
            
            // Regenerate colors if in heart rate mode
            if (this.colorMode === 'heartRate') {
                this.generateHeartRateColors();
                this.updateMapColors();
            }
        }
    }

    /**
     * Update map colors based on current color mode
     */
    updateMapColors() {
        if (!this.map || !this.map.loaded()) {
            return;
        }

        // Set colors for trail-line source (but don't override trail-completed during animation)
        this.map.setPaintProperty('trail-line', 'line-color', this.pathColor);
        this.map.setPaintProperty('trail-line', 'line-opacity', 0.3); // Make it more transparent

        // Only set trail-completed color if not animating (to avoid overriding heart rate colors)
        if (!this.isAnimating) {
            this.map.setPaintProperty('trail-completed', 'line-color', this.pathColor);
        }
    }

    /**
     * Update completed trail with heart rate colored segments during animation
     */
    updateCompletedTrailWithHeartRateAnimation(currentPoint) {
        if (!this.trackData || !this.heartRateColors || !this.map.loaded()) {
            return;
        }

        try {
            // Use original track data if available (for journeys), otherwise use current track points
            const trackPoints = this.trackData.originalTrackData?.trackPoints || this.trackData.trackPoints;

            if (!trackPoints || trackPoints.length === 0) {
                return;
            }

            // Get completed points up to current position
            const completedIndex = Math.floor(currentPoint.index);

            if (completedIndex < 1) {
                // No completed trail yet
                this.map.getSource('trail-completed').setData({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                });
                return;
            }

            // Create a single LineString with all completed coordinates
            const completedCoordinates = trackPoints
                .slice(0, completedIndex + 1)
                .map(point => [point.lon, point.lat]);

            // Create colored segments for the completed trail (group every 10 points)
            const completedSegments = [];
            const SEGMENT_SIZE = 10; // Group points into segments of 10

            for (let segmentStart = 0; segmentStart < completedIndex; segmentStart += SEGMENT_SIZE) {
                const segmentEnd = Math.min(segmentStart + SEGMENT_SIZE, completedIndex);
                const segmentPoints = trackPoints.slice(segmentStart, segmentEnd);

                if (segmentPoints.length >= 2) {
                    // Calculate average heart rate for this segment
                    const heartRates = segmentPoints
                        .map(p => p.heartRate || 0)
                        .filter(hr => hr > 0);

                    const avgHeartRate = heartRates.length > 0 ?
                        heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length : 0;

                    // Get color for the average heart rate (use the color of the middle point)
                    const middleIndex = Math.floor((segmentStart + segmentEnd) / 2);
                    const color = middleIndex < this.heartRateColors.length ?
                        (this.heartRateColors[middleIndex] || this.pathColor) : this.pathColor;

                    // Create a single segment for this group of points
                    const segmentCoordinates = segmentPoints.map(point => [point.lon, point.lat]);

                    completedSegments.push({
                        type: 'Feature',
                        properties: {
                            color: color,
                            heartRate: avgHeartRate,
                            segmentIndex: Math.floor(segmentStart / SEGMENT_SIZE)
                        },
                        geometry: {
                            type: 'LineString',
                            coordinates: segmentCoordinates
                        }
                    });
                }
            }

            // Update the completed trail source with colored segments
            if (this.map.getSource('trail-completed')) {
                if (completedSegments.length > 0) {
                    console.log('🎬 Displaying', completedSegments.length, 'colored segments for heart rate animation');
                    this.map.getSource('trail-completed').setData({
                        type: 'FeatureCollection',
                        features: completedSegments
                    });

                    // Update paint property to use feature colors
                    this.map.setPaintProperty('trail-completed', 'line-color', ['get', 'color']);
                    this.map.setPaintProperty('trail-completed', 'line-width', 6);
                    this.map.setPaintProperty('trail-completed', 'line-opacity', 1.0);
                } else {
                    // Empty completed trail
                    this.map.getSource('trail-completed').setData({
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: []
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error updating completed trail with heart rate animation:', error);
            // Fallback to simple trail update
            const completedIndex = Math.floor(currentPoint.index);
            const completedCoordinates = this.trackData.trackPoints
                .slice(0, completedIndex + 1)
                .map(point => [point.lon, point.lat]);

            this.map.getSource('trail-completed').setData({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: completedCoordinates
                }
            });
        }
    }

    /**
     * Update trail with multi-segment colored trail during animation
     */
    updateMultiSegmentTrailAnimation(currentPoint) {
        if (!this.trackData || !this.map.loaded()) {
            return;
        }

        try {
            // Use original track data if available (for journeys), otherwise use current track points
            const trackPoints = this.trackData.originalTrackData?.trackPoints || this.trackData.trackPoints;

            if (!trackPoints || trackPoints.length === 0) {
                return;
            }

            // Get completed points up to current position
            const completedIndex = Math.floor(currentPoint.index);

            console.log('🎬 Animation update:', {
                completedIndex,
                totalPoints: trackPoints.length,
                colorMode: this.colorMode,
                hasHeartRateColors: !!this.heartRateColors,
                heartRateColorsLength: this.heartRateColors?.length || 0
            });

            if (completedIndex < 1) {
                // No completed trail yet
                this.map.getSource('trail-completed').setData({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                });
                return;
            }

            // Create colored segments (each segment is 10 points long)
            const completedSegments = [];
            const SEGMENT_SIZE = 10; // Each segment is 10 points long

            for (let segmentStart = 0; segmentStart < completedIndex; segmentStart += SEGMENT_SIZE) {
                const segmentEnd = Math.min(segmentStart + SEGMENT_SIZE, completedIndex);
                const segmentPoints = trackPoints.slice(segmentStart, segmentEnd);

                if (segmentPoints.length >= 2) {
                    // Each segment gets its own color based on heart rate
                    let color = this.pathColor; // Default color

                    if (this.colorMode === 'heartRate' && this.heartRateColors && this.heartRateColors.length > 0) {
                    // Use heart rate color for this segment
                    const segmentIndex = Math.floor(segmentStart / SEGMENT_SIZE);
                    const colorIndex = Math.min(segmentIndex, this.heartRateColors.length - 1);
                    color = this.heartRateColors[colorIndex] || this.pathColor;

                    console.log('🎨 Segment color:', {
                        segmentIndex,
                        colorIndex,
                        color,
                        segmentStart,
                        segmentEnd,
                        heartRates: heartRates.length > 0 ? heartRates.slice(0, 3) : 'none'
                    });
                    }

                    // Create a single LineString for this group of points
                    const segmentCoordinates = segmentPoints.map(point => [point.lon, point.lat]);

                    completedSegments.push({
                        type: 'Feature',
                        properties: {
                            color: color,
                            segmentIndex: Math.floor(segmentStart / SEGMENT_SIZE),
                            pointCount: segmentPoints.length
                        },
                        geometry: {
                            type: 'LineString',
                            coordinates: segmentCoordinates
                        }
                    });

                    console.log('🎨 Created segment:', {
                        segmentIndex: Math.floor(segmentStart / SEGMENT_SIZE),
                        pointCount: segmentPoints.length,
                        color: color,
                        coordinates: segmentCoordinates.length
                    });
                }
            }

            // Update the completed trail source with colored segments
            if (this.map.getSource('trail-completed')) {
                if (completedSegments.length > 0) {
                    console.log('🎬 Displaying', completedSegments.length, 'colored segments');
                    this.map.getSource('trail-completed').setData({
                        type: 'FeatureCollection',
                        features: completedSegments
                    });

                    // Update paint property to use feature colors
                    this.map.setPaintProperty('trail-completed', 'line-color', ['get', 'color']);
                    this.map.setPaintProperty('trail-completed', 'line-width', 6);
                    this.map.setPaintProperty('trail-completed', 'line-opacity', 1.0);
                } else {
                    // Empty completed trail
                    this.map.getSource('trail-completed').setData({
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: []
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error updating multi-segment trail animation:', error);
            // Fallback to simple trail update
            const completedIndex = Math.floor(currentPoint.index);
            const completedCoordinates = this.trackData.trackPoints
                .slice(0, completedIndex + 1)
                .map(point => [point.lon, point.lat]);

            this.map.getSource('trail-completed').setData({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: completedCoordinates
                }
            });
        }
    }



    /**
     * Update trail line during animation with heart rate colors
     */
    updateTrailLineForAnimation(currentPoint) {
        if (!this.trackData || !this.map.loaded()) {
            return;
        }

        try {
            // Use original track data if available (for journeys), otherwise use current track points
            const trackPoints = this.trackData.originalTrackData?.trackPoints || this.trackData.trackPoints;

            if (!trackPoints || trackPoints.length === 0) {
                return;
            }

            // Get completed points up to current position
            const completedIndex = Math.floor(currentPoint.index);

            console.log('🎬 Animation update:', {
                completedIndex,
                totalPoints: trackPoints.length,
                colorMode: this.colorMode,
                hasHeartRateColors: !!this.heartRateColors,
                heartRateColorsLength: this.heartRateColors?.length || 0
            });

            // Update trail-line source to show full track (dimmed during animation)
            if (this.colorMode === 'heartRate' && this.heartRateSegmentCollection.features.length > 0) {
                // Show full track with heart rate colors but dimmed
                this.map.getSource('trail-line').setData(this.heartRateSegmentCollection);
                this.map.setPaintProperty('trail-line', 'line-color', ['get', 'color']);
                this.map.setPaintProperty('trail-line', 'line-opacity', 0.3);
            } else {
                // Show full track with fixed color but dimmed
                const allCoordinates = trackPoints.map(point => [point.lon, point.lat]);
                this.map.getSource('trail-line').setData({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: allCoordinates
                    }
                });
                this.map.setPaintProperty('trail-line', 'line-color', this.pathColor);
                this.map.setPaintProperty('trail-line', 'line-opacity', 0.3);
            }

            // Update trail-completed source with completed portion
            if (completedIndex < 1) {
                // No completed trail yet
                this.map.getSource('trail-completed').setData({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                });
                return;
            }

            this.drawCompletedTrail(trackPoints, completedIndex);
        } catch (error) {
            console.error('Error updating trail line for animation:', error);
        }
    }

    drawCompletedTrail(trackPoints, completedIndex) {
        let features = [];

        console.log('🎬 drawCompletedTrail called:', {
            colorMode: this.colorMode,
            heartRateSegmentsLength: this.heartRateSegments.length,
            completedIndex,
            totalPoints: trackPoints.length
        });

        if (this.colorMode === 'heartRate' && this.heartRateSegments.length > 0) {
            features = this.heartRateSegments.flatMap(segment => {
                const { startIndex, endIndex } = segment.properties;

                if (endIndex < completedIndex) {
                    return segment;
                }

                if (startIndex > completedIndex) {
                    return [];
                }

                const pointsCompleted = Math.max(0, completedIndex - startIndex);
                const coords = segment.geometry.coordinates.slice(0, Math.min(pointsCompleted + 2, segment.geometry.coordinates.length));
                if (coords.length < 2) return [];

                return {
                    type: 'Feature',
                    properties: segment.properties,
                    geometry: {
                        type: 'LineString',
                        coordinates: coords
                    }
                };
            });
        } else {
            const completedCoordinates = trackPoints
                .slice(0, Math.max(completedIndex + 1, 2))
                .map(point => [point.lon, point.lat]);

            features = [{
                type: 'Feature',
                properties: { color: this.pathColor },
                geometry: {
                    type: 'LineString',
                    coordinates: completedCoordinates
                }
            }];
        }

        console.log('🎬 Generated features:', features.length);

        if (this.map.getSource('trail-completed')) {
            this.map.getSource('trail-completed').setData({
                type: 'FeatureCollection',
                features
            });
            this.map.setPaintProperty('trail-completed', 'line-color', [
                'case',
                ['has', 'color'],
                ['to-color', ['get', 'color']],
                this.pathColor
            ]);
            this.map.setPaintProperty('trail-completed', 'line-width', 6);
            this.map.setPaintProperty('trail-completed', 'line-opacity', 1.0);
        }
    }

    /**
     * Update trail visualization with heart rate colors (for static display)
     */
    updateTrailWithHeartRateColors() {
        if (!this.trackData || !this.heartRateColors || !this.map.loaded()) {
            return;
        }

        // Use original track data if available (for journeys), otherwise use current track points
        const trackPoints = this.trackData.originalTrackData?.trackPoints || this.trackData.trackPoints;

        if (!trackPoints || trackPoints.length === 0) {
            return;
        }

        console.log('🎨 Static display - heart rate segments available:', this.heartRateSegments.length);

        if (this.map.getSource('trail-line')) {
            if (this.heartRateSegmentCollection.features.length > 0) {
                this.map.getSource('trail-line').setData(this.heartRateSegmentCollection);
                this.map.setPaintProperty('trail-line', 'line-color', ['get', 'color']);
                this.map.setPaintProperty('trail-line', 'line-opacity', 0.8);
            } else {
                const coordinates = trackPoints.map(point => [point.lon, point.lat]);
                this.map.getSource('trail-line').setData({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: coordinates
                    }
                });
            }
        }
    }


    // Toggle visibility of the main track label ("Track 1" letters)
    setShowTrackLabel(enabled) {
        this.showTrackLabel = !!enabled;
        if (this.map && this.map.getLayer('main-track-label')) {
            this.map.setLayoutProperty('main-track-label', 'visibility', this.showTrackLabel ? 'visible' : 'none');
        }
    }

    updateElevationGradient(baseColor) {
        // Convert hex color to RGB for manipulation
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };

        const rgb = hexToRgb(baseColor);
        if (!rgb) return;

        // Create lighter variants of the base color for gradient
        const lighten = (r, g, b, factor) => {
            return {
                r: Math.min(255, Math.round(r + (255 - r) * factor)),
                g: Math.min(255, Math.round(g + (255 - g) * factor)),
                b: Math.min(255, Math.round(b + (255 - b) * factor))
            };
        };

        const rgbToHex = (r, g, b) => {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        };

        // Generate gradient colors
        const midColor = lighten(rgb.r, rgb.g, rgb.b, 0.3);
        const lightColor = lighten(rgb.r, rgb.g, rgb.b, 0.6);

        const midColorHex = rgbToHex(midColor.r, midColor.g, midColor.b);
        const lightColorHex = rgbToHex(lightColor.r, lightColor.g, lightColor.b);

        // Update gradient stops
        const progressGradient = document.getElementById('progressGradient');
        if (progressGradient) {
            const stops = progressGradient.querySelectorAll('stop');
            if (stops.length >= 3) {
                stops[0].setAttribute('style', `stop-color:${baseColor};stop-opacity:0.9`);
                stops[1].setAttribute('style', `stop-color:${midColorHex};stop-opacity:0.7`);
                stops[2].setAttribute('style', `stop-color:${lightColorHex};stop-opacity:0.5`);
            }
        }

        // Update speed profile gradient stops
        const speedProgressGradient = document.getElementById('speedProgressGradient');
        if (speedProgressGradient) {
            const stops = speedProgressGradient.querySelectorAll('stop');
            if (stops.length >= 3) {
                stops[0].setAttribute('style', `stop-color:${baseColor};stop-opacity:0.9`);
                stops[1].setAttribute('style', `stop-color:${midColorHex};stop-opacity:0.7`);
                stops[2].setAttribute('style', `stop-color:${lightColorHex};stop-opacity:0.5`);
            }
        }

        // Update speed background path stroke color
        const speedBackgroundPath = document.getElementById('speedBackgroundPath');
        if (speedBackgroundPath) {
            speedBackgroundPath.setAttribute('stroke', baseColor);
        }
    }

    setMarkerSize(size) {
        this.markerSize = size;
        
        if (this.map.loaded()) {
            this.map.setPaintProperty('current-position-glow', 'circle-radius', 15 * size);
            if (this.map.getLayer('activity-icon') && this.showMarker) {
                this.map.setLayoutProperty('activity-icon', 'icon-size', size);
            }
            this.updateActivityIcon();
        }
    }

    setAutoZoom(enabled) {
        this.autoZoom = enabled;
    }

    setShowCircle(enabled) {
        this.showCircle = enabled;
        
        if (this.map && this.map.loaded()) {
            this.updateActivityIcon();
        }
    }

    setShowMarker(enabled) {
        this.showMarker = enabled;
        
        if (this.map && this.map.loaded()) {
            this.updateMarkerVisibility();
        }
        
        // Update UI controls that depend on marker visibility
        this.updateMarkerDependentControls(enabled);
    }

    setShowEndStats(enabled) {
        this.showEndStats = enabled;

    }

    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
    }

    getBaseIcon() {
        // If user has selected a custom base icon, use that
        if (this.userSelectedBaseIcon) {
            return this.userSelectedBaseIcon;
        }
        
        // Otherwise, return activity-based icon
        const icons = {
            'running': '🏃‍♂️',
            'cycling': '🚴‍♂️',
            'swimming': '🏊‍♂️',
            'hiking': '🥾',
            'triathlon': '🏆'
        };
        return icons[this.currentActivityType] || icons['running'];
    }

    getAnimationProgress() {
        return this.animationProgress;
    }

    getCurrentProgress() {
        return this.animationProgress;
    }

    ensureGPXParserReady() {
        if (!this.trackData || !this.trackData.trackPoints) {
            console.error('No track data available for GPX parser');
            return false;
        }
        
        // Use original track data
        let trackPoints = this.trackData.trackPoints;
        
        if (!this.gpxParser.trackPoints || this.gpxParser.trackPoints !== trackPoints) {
            this.gpxParser.trackPoints = trackPoints;
        }
        
        return true;
    }

    loadTrack(trackData) {
        this.trackData = trackData;

        this.heartRateSegments = [];
        this.heartRateSegmentCollection = { type: 'FeatureCollection', features: [] };

        // Use optimized track data if available, otherwise fall back to original
        const trackPoints = trackData.trackPoints || [];
        if (trackPoints.length === 0) {
            return;
        }

        // Generate heart rate colors when needed (either data available or heart-rate mode active)
        const shouldGenerateHeartRateColors = this.colorMode === 'heartRate' || trackData.stats?.hasHeartRateData;
        if (shouldGenerateHeartRateColors) {
            console.log('💓 Preparing heart rate colors during track load');
            this.generateHeartRateColors();
        }

        // Create GeoJSON for the trail with elevation data
        const coordinates = trackPoints.map(point => {
            const elevation = point.elevation || 0;
            return [point.lon, point.lat, elevation];
        });
        
        // Handle journey segments if available
        if (trackData.isJourney && trackData.segments) {
            this.loadJourneySegments(trackData, coordinates);
        } else {
            // Standard single track
            const trailLineData = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                },
                properties: {
                    distance: trackData.stats.totalDistance,
                    elevation: trackData.stats.elevationGain
                }
            };

            this.map.getSource('trail-line').setData(trailLineData);
        }

        // Fit map to trail bounds with proper zoom level
        if (trackData.bounds && 
            !isNaN(trackData.bounds.west) && !isNaN(trackData.bounds.south) && 
            !isNaN(trackData.bounds.east) && !isNaN(trackData.bounds.north)) {
            
            // Use fitBounds to properly set both center and zoom level
            const bounds = [
                [trackData.bounds.west, trackData.bounds.south], // Southwest corner
                [trackData.bounds.east, trackData.bounds.north]  // Northeast corner
            ];
            
            // Calculate appropriate padding based on track size
            const latDiff = trackData.bounds.north - trackData.bounds.south;
            const lonDiff = trackData.bounds.east - trackData.bounds.west;
            const maxDiff = Math.max(latDiff, lonDiff);
            
            // Adjust padding based on track size - smaller tracks need more padding
            let padding = 50; // Default padding
            if (maxDiff < 0.01) padding = 100;      // Very small track
            else if (maxDiff < 0.05) padding = 80;  // Small track
            else if (maxDiff < 0.1) padding = 60;   // Medium track
            
            const fitOptions = {
                padding: padding,
                duration: 1000, // Smooth animation to new bounds
                maxZoom: 16 // Prevent zooming in too much for very small tracks
            };
            
            // Wait a moment for map to be fully initialized before fitting bounds
            setTimeout(() => {
                if (this.map && this.map.isStyleLoaded()) {
                    this.map.fitBounds(bounds, fitOptions);
                } else {
                    // If map isn't ready, wait for it
                    this.map.once('load', () => {
                        this.map.fitBounds(bounds, fitOptions);
                    });
                }
            }, 100);
        }

        // Reset animation 
        this.animationProgress = 0;
        if (!trackData.isJourney) {
            this.iconChanges.iconChanges = [];
        }
        this.annotations.annotations = [];
        
        // Initialize camera positioning after track is loaded
        setTimeout(() => {
            this.initializeTrackCameraPosition(trackData);
        }, 200);
        
        // Reset follow-behind camera for new track
        this.followBehindCamera.reset();
        
        // Set current icon to the activity icon if present, otherwise base icon
        if (trackData.activityIcon) {
            this.setCurrentIcon(trackData.activityIcon);
        } else {
            this.currentIcon = this.getBaseIcon();
        }
        
        // Initialize icon if map is loaded
        if (this.map.loaded()) {
            this.updateActivityIcon();
        } else {
            this.map.once('load', () => {
                this.updateActivityIcon();
            });
        }
        
        this.updateCurrentPosition();
        
        // Apply 3D rendering if in 3D mode
        if (this.is3DMode) {
            this.update3DTrailRendering();
        }
        
        // If in follow-behind mode, automatically set up the camera for this track
        if (this.cameraMode === 'followBehind') {

            setTimeout(() => {
                this.followBehindCamera.initialize();
            }, 1500); // Wait for map bounds fitting to complete
        }

        // Detect and apply proper map layout based on aspect ratio
        setTimeout(() => {
            this.detectAndSetMapLayout();
        }, 200); // Small delay to ensure map container is properly sized
    }

    updateCurrentPosition() {
        // Debug: Track animation calls
        if (this.animationProgress > 0 && this.animationProgress < 0.01) {
            console.log('🎬 updateCurrentPosition called at animation start');
        }

        // Ensure GPX parser is ready
        if (!this.ensureGPXParserReady()) {
            return;
        }
        // --- Per-segment progress calculation ---
        let globalProgress = 0;
        if (this.segmentTimings && this.segmentTimings.segments && this.segmentTimings.segments.length > 0) {
            const { segmentIndex, segmentProgress } = this.getSegmentAndLocalProgress(this.journeyElapsedTime);
            const seg = this.segmentTimings.segments[segmentIndex];
            if (this.trackData && this.trackData.trackPoints && typeof seg.startIndex === 'number' && typeof seg.endIndex === 'number') {
                const segStart = seg.startIndex;
                const segEnd = seg.endIndex;
                const segLength = segEnd - segStart;
                globalProgress = (segStart + segmentProgress * segLength) / (this.trackData.trackPoints.length - 1);
            } else {
                globalProgress = Math.min(this.journeyElapsedTime / this.segmentTimings.totalDuration, 1);
            }
        } else {
            globalProgress = this.animationProgress;
        }
        const currentPoint = this.gpxParser.getInterpolatedPoint(globalProgress);
        
        if (isNaN(currentPoint.lat) || isNaN(currentPoint.lon)) {
            console.error('NaN coordinates from interpolated point:', currentPoint, 'Progress:', globalProgress);
            return;
        }
        
        // Update current position marker
        this.map.getSource('current-position').setData({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [currentPoint.lon, currentPoint.lat]
            },
            properties: {
                elevation: currentPoint.elevation,
                speed: currentPoint.speed,
                distance: currentPoint.distance
            }
        });

        // Update comparison position if in comparison mode
        if (this.comparisonMode && this.animationProgress < 0.01) {
            console.log('🔄 Calling updateComparisonPosition from animation loop');
        }
        this.updateComparisonPosition();
        // Update any additional overlapping tracks
        this.updateAdditionalComparisons();

        // Update trail for animation - use unified approach
        const completedIndex = Math.floor(currentPoint.index);
        const trackPoints = this.trackData.originalTrackData?.trackPoints || this.trackData.trackPoints;
        
        // Update trail-line source to show full track (dimmed during animation)
        this.updateTrailLineForAnimation(currentPoint);
        
        // Update trail-completed source with completed portion
        this.drawCompletedTrail(trackPoints, completedIndex);

        // Check for icon changes - ensure method is properly bound
        if (this.iconChanges && typeof this.iconChanges.checkIconChanges === 'function') {
            try {
                this.iconChanges.checkIconChanges(globalProgress);
                } catch (error) {
                console.error('Error calling checkIconChanges:', error);
            }
        }

        // Check for annotations
        if (this.annotations && typeof this.annotations.checkAnnotations === 'function') {
        this.annotations.checkAnnotations(globalProgress);
        }

        // Check for picture annotations
        if (this.pictureAnnotations && typeof this.pictureAnnotations.checkPictureAnnotations === 'function') {
            this.pictureAnnotations.checkPictureAnnotations(globalProgress);
        }

        // Auto zoom to follow the marker (always if auto zoom is enabled and we're animating)
        if (this.autoZoom && this.isAnimating) {
            // Calculate center point for dual marker centering in comparison mode
            const centerPoint = this.calculateDualMarkerCenter(currentPoint);

            if (this.cameraMode === 'followBehind') {
                // Follow-behind camera mode: delegate to FollowBehindCamera
                this.followBehindCamera.updateCameraPosition();
            } else if (this.is3DMode) {
                // Standard 3D mode, maintain the camera angle while following
                this.map.easeTo({
                    center: [centerPoint.lon, centerPoint.lat],
                    duration: this.performanceMode ? 50 : 100, // Faster transitions during recording
                    pitch: this.map.getPitch(), // Maintain current pitch
                    bearing: this.map.getBearing() // Maintain current bearing
                });
            } else {
                // Normal 2D following with dual marker centering
                this.map.easeTo({
                    center: [centerPoint.lon, centerPoint.lat],
                    duration: this.performanceMode ? 50 : 100 // Faster transitions during recording
                });
            }
        }

        // Update main track label position
        if (this.map.getSource('main-track-label')) {
            this.map.getSource('main-track-label').setData({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [currentPoint.lon, currentPoint.lat]
                },
                properties: {
                    label: 'Track 1'
                }
            });
        }

        // Ensure activity icon layer exists and is visible
        this.ensureActivityIconLayer();
    }

    async startAnimation() {
        if (!this.trackData || this.isAnimating || !this.segmentTimings) {
            return;
        }

        // Ensure visible tiles are loaded before starting to avoid flicker
        if (this.map && typeof this.map.loaded === 'function' && !this.map.loaded()) {
            try {
                await new Promise((resolve) => {
                    const onIdle = () => resolve();
                    this.map.once('idle', onIdle);
                });
            } catch (_) {
                // Non-fatal: proceed even if waiting fails
            }
        }
        
        if (this.segmentTimings && this.segmentTimings.totalDuration && this.journeyElapsedTime === 0) {
            this.journeyElapsedTime = this.animationProgress * this.segmentTimings.totalDuration;
        }
        
        // Reset picture annotation triggered states for a clean start
        if (this.pictureAnnotations && this.pictureAnnotations.resetTriggeredStates) {
            this.pictureAnnotations.resetTriggeredStates();
        }
        
        // If in follow-behind mode and should trigger cinematic start
        if (this.cameraMode === 'followBehind' && this.followBehindCamera.shouldTriggerCinematic() && this.animationProgress <= 0.05) {

            this.followBehindCamera.setCinematicStart(false); // Prevent multiple triggers
            
            // Wait for cinematic zoom-in to complete BEFORE starting trail animation
            // Use video export-specific method if available (for consistent timing)
            if (this.followBehindCamera.startCinematicSequenceForVideoExport) {
                await this.followBehindCamera.startCinematicSequenceForVideoExport();
            } else {
                await this.followBehindCamera.startCinematicSequence();
            }

        }
        
        // Now start the actual trail animation
        this.isAnimating = true;
        
        // Hide the full track line during animation - only show completed portion
        if (this.map.getLayer('trail-line')) {
            this.map.setPaintProperty('trail-line', 'line-opacity', 0);
        }
        // Hide the full comparison line during animation - only show its completed portion
        if (this.map.getLayer('comparison-trail-line')) {
            this.map.setPaintProperty('comparison-trail-line', 'line-opacity', 0);
        }
        // Hide all overlapping tracks full lines during animation
        this.applyOverlapLineVisibilityDuringAnimation(true);
        
        // If in follow-behind mode, disable all map interactions during animation
        if (this.cameraMode === 'followBehind') {
            this.disableMapInteractions();
        }
        this.lastAnimationTime = 0;
        this.updateCurrentPosition();
        this.animate();
    }

    animate() {
        if (!this.isAnimating || !this.segmentTimings) return;

        const currentTime = performance.now();
        if (this.lastAnimationTime === 0) {
            this.lastAnimationTime = currentTime;
        }
        
        const deltaTime = (currentTime - this.lastAnimationTime) / 1000;
        this.lastAnimationTime = currentTime;

        const timeIncrement = deltaTime * this.animationSpeed;
        this.journeyElapsedTime += timeIncrement;

        // --- Per-segment progress calculation ---
        let globalProgress = 0;
        if (this.segmentTimings.segments && this.segmentTimings.segments.length > 0) {
            const { segmentIndex, segmentProgress } = this.getSegmentAndLocalProgress(this.journeyElapsedTime);
            const seg = this.segmentTimings.segments[segmentIndex];
            // Map to global progress (index in trackPoints)
            if (this.trackData && this.trackData.trackPoints && typeof seg.startIndex === 'number' && typeof seg.endIndex === 'number') {
                const segStart = seg.startIndex;
                const segEnd = seg.endIndex;
                const segLength = segEnd - segStart;
                globalProgress = (segStart + segmentProgress * segLength) / (this.trackData.trackPoints.length - 1);
            } else {
                // Fallback: use time proportion
                globalProgress = Math.min(this.journeyElapsedTime / this.segmentTimings.totalDuration, 1);
            }
        } else if (this.segmentTimings.totalDuration > 0) {
            // Single GPX fallback
            globalProgress = Math.min(this.journeyElapsedTime / this.segmentTimings.totalDuration, 1);
        }
        this.animationProgress = globalProgress;

        if (this.journeyElapsedTime >= this.segmentTimings.totalDuration) {
            this.animationProgress = 1;
            this.journeyElapsedTime = this.segmentTimings.totalDuration;
            this.isAnimating = false;
            
            // Show the full track line again when animation completes
            if (this.map.getLayer('trail-line')) {
                this.map.setPaintProperty('trail-line', 'line-opacity', [
                    'case',
                    ['==', ['get', 'isTransportation'], true], 0.9,
                    0.8
                ]);
            }
            // Show the full comparison line again when animation completes
            if (this.map.getLayer('comparison-trail-line')) {
                this.map.setPaintProperty('comparison-trail-line', 'line-opacity', 0.8);
            }
            // Show overlapping tracks full lines again when animation completes
            this.applyOverlapLineVisibilityDuringAnimation(false);
            
            // Trigger stats end animation
            this.triggerStatsEndAnimation();
            
            // If in follow-behind mode, trigger zoom-out to show whole track after a brief pause
            if (this.cameraMode === 'followBehind') {

                setTimeout(() => {
                    this.followBehindCamera.zoomOutToWholeTrack();
                }, this.followBehindCamera.getZoomOutDelay());
            }
        }

        this.updateCurrentPosition();

        // Preload tiles 2 seconds ahead in follow-behind mode
        if (this.cameraMode === 'followBehind' && this.autoZoom && this.trackData && this.gpxParser) {
            const lookAheadSeconds = 2;
            const totalDuration = this.segmentTimings.totalDuration || 1;
            const lookAheadTime = Math.min(this.journeyElapsedTime + lookAheadSeconds, totalDuration);
            let lookAheadProgress = 0;
            if (this.segmentTimings.segments && this.segmentTimings.segments.length > 0) {
                const { segmentIndex, segmentProgress } = this.getSegmentAndLocalProgress(lookAheadTime);
                const seg = this.segmentTimings.segments[segmentIndex];
                if (this.trackData && this.trackData.trackPoints && typeof seg.startIndex === 'number' && typeof seg.endIndex === 'number') {
                    const segStart = seg.startIndex;
                    const segEnd = seg.endIndex;
                    const segLength = segEnd - segStart;
                    lookAheadProgress = (segStart + segmentProgress * segLength) / (this.trackData.trackPoints.length - 1);
                } else {
                    lookAheadProgress = lookAheadTime / totalDuration;
                }
            } else {
                lookAheadProgress = lookAheadTime / totalDuration;
            }
            const lookAheadPoint = this.gpxParser.getInterpolatedPoint(lookAheadProgress);
            let lookAheadZoom = 14; // Default
            if (typeof this.followBehindCamera?.getCurrentPresetSettings === 'function') {
                lookAheadZoom = this.followBehindCamera.getCurrentPresetSettings().ZOOM || 14;
            }
            if (lookAheadPoint && lookAheadPoint.lat && lookAheadPoint.lon) {
                const pitch = this.map.getPitch ? this.map.getPitch() : 0;
                const bufferScale = 1.25 + Math.min(pitch, 60) / 120; // widen with pitch
                this.preloadTilesAtPosition(lookAheadPoint.lat, lookAheadPoint.lon, Math.round(lookAheadZoom), this.currentMapStyle, { bufferScale });
            }
        }

        if (this.isAnimating) {
            requestAnimationFrame(() => this.animate());
        }
    }

    stopAnimation() {
        this.isAnimating = false;
        
        // Show the full track line again when animation stops
        if (this.map.getLayer('trail-line')) {
            this.map.setPaintProperty('trail-line', 'line-opacity', [
                'case',
                ['==', ['get', 'isTransportation'], true], 0.9,
                0.8
            ]);
        }
        // Show the full comparison line again when animation stops
        if (this.map.getLayer('comparison-trail-line')) {
            this.map.setPaintProperty('comparison-trail-line', 'line-opacity', 0.8);
        }
        // Show overlapping tracks full lines when animation stops
        this.applyOverlapLineVisibilityDuringAnimation(false);
        
        // If in follow-behind mode, allow zooming when paused
        if (this.cameraMode === 'followBehind') {
            this.enableZoomOnlyInteractions();
        }
    }

    resetAnimation() {
        this.isAnimating = false;
        this.animationProgress = 0;
        this.currentSegmentIndex = 0;
        this.segmentProgress = 0;
        this.lastAnimationTime = 0;
        this.journeyElapsedTime = 0;
        this.annotations.hideActiveAnnotation();
        
        // Reset picture annotation triggered states
        if (this.pictureAnnotations && this.pictureAnnotations.resetTriggeredStates) {
            this.pictureAnnotations.resetTriggeredStates();
        }
        
        // Reset stats end animation
        this.resetStatsEndAnimation();
        
        // Reset follow-behind specific flags for next animation
        this.followBehindCamera.setCinematicStart(true);
        
        // Show the full track line when animation is reset
        if (this.map.getLayer('trail-line')) {
            this.map.setPaintProperty('trail-line', 'line-opacity', [
                'case',
                ['==', ['get', 'isTransportation'], true], 0.9,
                0.8
            ]);
        }
        // Show the full comparison line when animation is reset
        if (this.map.getLayer('comparison-trail-line')) {
            this.map.setPaintProperty('comparison-trail-line', 'line-opacity', 0.8);
        }
        // Show overlapping tracks full lines when animation is reset
        this.applyOverlapLineVisibilityDuringAnimation(false);
        
        this.updateCurrentPosition();
        
        // If in follow-behind mode, reset camera to starting position (instantly, no animation)
        if (this.cameraMode === 'followBehind') {

            setTimeout(() => {
                this.followBehindCamera.setStartingPosition(true); // true = instant, no animation
            }, 100);
        }
    }

    // Enhanced activity icon creation and management
    createAndAddActivityIcon() {
        try {
            const size = 64;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            ctx.clearRect(0, 0, size, size);
            
            // Draw background circle if enabled
            if (this.showCircle) {
                const circleRadius = size * 0.45;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(size/2, size/2, circleRadius, 0, 2 * Math.PI);
                ctx.fill();
                
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // Draw the emoji - make it fill most of the marker
            const fontSize = Math.floor(size * 0.9 * this.markerSize);
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#000000';
            
            if (!this.showCircle) {
                ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                ctx.shadowBlur = 6;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }
            
            ctx.fillText(this.currentIcon, size/2, size/2);
            
            const imageData = ctx.getImageData(0, 0, size, size);
            
            if (this.map.hasImage && this.map.hasImage('activity-icon')) {
                this.map.removeImage('activity-icon');
            }
            
            this.map.addImage('activity-icon', {
                width: size,
                height: size,
                data: imageData.data
            });
            
        } catch (error) {
            console.error('Error creating activity icon:', error);
        }
    }

    updateActivityIcon() {
        if (!this.map.loaded() || !this.map.hasImage) {
            return;
        }
        
        this.createAndAddActivityIcon();
        
        if (this.map.getLayer('activity-icon')) {
            const visibility = this.showMarker ? 'visible' : 'none';
            const opacity = this.showMarker ? 1 : 0;
            
            this.map.setLayoutProperty('activity-icon', 'visibility', visibility);
            this.map.setLayoutProperty('activity-icon', 'icon-size', this.markerSize);
            this.map.setPaintProperty('activity-icon', 'icon-opacity', opacity);
        } else {
            // If the layer is missing, recreate it
            this.createAndAddActivityIconLayer(true);
        }
    }

    updateMarkerVisibility() {
        if (!this.map.loaded()) {
            return;
        }
        
        const visibility = this.showMarker ? 'visible' : 'none';
        const opacity = this.showMarker ? 1 : 0;
        
        if (this.map.getLayer('activity-icon')) {
            this.map.setLayoutProperty('activity-icon', 'visibility', visibility);
            this.map.setPaintProperty('activity-icon', 'icon-opacity', opacity);
        }
    }

    updateMarkerDependentControls(enabled) {
        // Get all marker-related control groups
        const markerSizeGroup = document.getElementById('markerSize')?.closest('.control-group');
        const currentIconGroup = document.getElementById('currentIconDisplay')?.closest('.control-group');
        const showCircleGroup = document.getElementById('showCircle')?.closest('.control-group');
        
        // Disable/enable marker size slider
        const markerSizeSlider = document.getElementById('markerSize');
        if (markerSizeSlider) {
            markerSizeSlider.disabled = !enabled;
            markerSizeSlider.style.opacity = enabled ? '1' : '0.5';
        }
        
        // Disable/enable marker size value display
        const markerSizeValue = document.getElementById('markerSizeValue');
        if (markerSizeValue) {
            markerSizeValue.style.opacity = enabled ? '1' : '0.5';
        }
        
        // Disable/enable current icon display
        const currentIconDisplay = document.getElementById('currentIconDisplay');
        if (currentIconDisplay) {
            currentIconDisplay.style.opacity = enabled ? '1' : '0.5';
        }
        
        // Disable/enable change icon button
        const changeIconBtn = document.getElementById('changeIconBtn');
        if (changeIconBtn) {
            changeIconBtn.disabled = !enabled;
            changeIconBtn.style.opacity = enabled ? '1' : '0.5';
        }
        
        // Disable/enable show circle toggle (since it only affects the marker)
        const showCircleToggle = document.getElementById('showCircle');
        if (showCircleToggle) {
            showCircleToggle.disabled = !enabled;
            showCircleToggle.style.opacity = enabled ? '1' : '0.5';
        }
        
        // Update control group classes for visual feedback
        if (markerSizeGroup) {
            markerSizeGroup.classList.toggle('disabled', !enabled);
        }
        if (currentIconGroup) {
            currentIconGroup.classList.toggle('disabled', !enabled);
        }
        if (showCircleGroup) {
            showCircleGroup.classList.toggle('disabled', !enabled);
        }
    }

    ensureActivityIconLayer() {
        if (!this.map.getLayer('activity-icon')) {
            this.createAndAddActivityIconLayer(true);
        } else {
            const visibility = this.showMarker ? 'visible' : 'none';
            const opacity = this.showMarker ? 1 : 0;
            
            this.map.setLayoutProperty('activity-icon', 'visibility', visibility);
            this.map.setPaintProperty('activity-icon', 'icon-opacity', opacity);
            
            if (!this.map.hasImage('activity-icon')) {
                this.createAndAddActivityIcon();
            }
        }
    }

    createAndAddActivityIconLayer(immediate = false) {
        try {
            this.createAndAddActivityIcon();
            
            const delay = immediate ? 10 : 100;
            setTimeout(() => {
                try {
            if (!this.map.getLayer('activity-icon')) {
                const visibility = this.showMarker ? 'visible' : 'none';
                const opacity = this.showMarker ? 1 : 0;
                
                this.map.addLayer({
                    id: 'activity-icon',
                    type: 'symbol',
                    source: 'current-position',
                    layout: {
                        'icon-image': 'activity-icon',
                        'icon-size': this.markerSize,
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true,
                        'icon-anchor': 'center',
                        'visibility': visibility
                    },
                    paint: {
                        'icon-opacity': opacity
                    }
                });
            }
                } catch (layerError) {
                    console.error('Error adding activity icon layer:', layerError);
                }
            }, delay);
            
        } catch (error) {
            console.error('Error creating activity icon layer:', error);
        }
    }

    forceIconUpdate() {
        try {
            if (this.map.getLayer('activity-icon')) {
                this.map.removeLayer('activity-icon');
            }
            
            if (this.map.hasImage('activity-icon')) {
                this.map.removeImage('activity-icon');
            }
            
            setTimeout(() => {
                this.createAndAddActivityIcon();
                
                setTimeout(() => {
                    if (!this.map.getLayer('activity-icon')) {
                        const visibility = this.showMarker ? 'visible' : 'none';
                        const opacity = this.showMarker ? 1 : 0;
                        
                        this.map.addLayer({
                            id: 'activity-icon',
                            type: 'symbol',
                            source: 'current-position',
                            layout: {
                                'icon-image': 'activity-icon',
                                'icon-size': this.markerSize,
                                'icon-allow-overlap': true,
                                'icon-ignore-placement': true,
                                'icon-anchor': 'center',
                                'visibility': visibility
                            },
                            paint: {
                                'icon-opacity': opacity
                            }
                        });
                    }
                }, 50);
            }, 10);
            
        } catch (error) {
            console.error('Error in forceIconUpdate:', error);
        }
    }

    // Navigation controls
    zoomIn() {
        this.map.zoomIn();
    }

    zoomOut() {
        this.map.zoomOut();
    }

    centerOnTrail() {
        if (this.trackData && this.trackData.bounds) {
            // Calculate center point of the track
            const centerLon = (this.trackData.bounds.west + this.trackData.bounds.east) / 2;
            const centerLat = (this.trackData.bounds.south + this.trackData.bounds.north) / 2;
            
            // Only center the map, don't change zoom
            this.map.setCenter([centerLon, centerLat]);
        }
    }

    // Video export support
    captureFrame() {
        return new Promise((resolve) => {
            this.map.getCanvas().toBlob((blob) => {
                resolve(blob);
            });
        });
    }

    // Setup resize event listener for dynamic layout updates
    setupResizeListener() {
        // Debounce resize events to avoid excessive layout recalculations
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {

                this.detectAndSetMapLayout();
            }, 250); // 250ms debounce
        });


    }

    // Function to detect and set map layout based on aspect ratio
    detectAndSetMapLayout() {
        const overlay = document.getElementById('liveStatsOverlay');
        if (!overlay) {
            return;
        }

        // Detect layout based on screen size and map aspect ratio
        const mapContainer = this.map.getContainer();
        const mapWidth = mapContainer.clientWidth;
        const mapHeight = mapContainer.clientHeight;
        const aspectRatio = mapWidth / mapHeight;
        const isMobile = window.innerWidth <= 768;

        // Remove any existing layout classes
        overlay.classList.remove('mobile-layout', 'square-layout', 'horizontal-layout', 'with-speed');

        // Determine layout based on conditions
        if (isMobile) {
            overlay.classList.add('mobile-layout');
        } else if (aspectRatio >= 0.8 && aspectRatio <= 1.2) {
            // Square-ish aspect ratio (0.8 to 1.2)
            overlay.classList.add('square-layout');
        } else {
            // Horizontal/widescreen aspect ratio
            overlay.classList.add('horizontal-layout');
        }
    }

    triggerStatsEndAnimation() {
        const overlay = document.getElementById('liveStatsOverlay');
        if (!overlay || !this.showEndStats) {
            return;
        }

        // Populate final stats with selected values
        this.populateFinalStats();

        // Use the new layout detection function
        this.detectAndSetMapLayout();

        const liveSpeedSegments = document.getElementById('liveSpeedSegments');
        if (liveSpeedSegments) {
            liveSpeedSegments.style.display = 'none';
        }

        const liveSpeedItem = document.getElementById('liveSpeedItem');
        if (liveSpeedItem) {
            liveSpeedItem.style.display = 'none';
        }

        // Add the end animation class to trigger the CSS transition
        overlay.classList.add('end-animation');

        // Remove the animation after 10 seconds to return to normal state
        setTimeout(() => {
            overlay.classList.remove('end-animation', 'mobile-layout', 'square-layout', 'horizontal-layout', 'with-speed');
        }, 10000);
    }

    populateFinalStats() {
        // Get selected stats from the app
        const selectedStats = this.app.getSelectedEndStats ? this.app.getSelectedEndStats() : ['distance', 'elevation'];
        console.log('populateFinalStats - selectedStats:', selectedStats);

        // Get the final stat elements
        const finalStatsElements = {
            distance: document.getElementById('finalDistance'),
            elevation: document.getElementById('finalElevation'),
            duration: document.getElementById('finalDuration'),
            speed: document.getElementById('finalSpeed'),
            pace: document.getElementById('finalPace'),
            maxelevation: document.getElementById('finalMaxElevation'),
            minelevation: document.getElementById('finalMinElevation')
        };

        // Get source elements
        const sourceElements = {
            distance: document.getElementById('totalDistance'),
            elevation: document.getElementById('elevationGain'),
            duration: document.getElementById('duration'),
            speed: document.getElementById('averageSpeed'),
            pace: document.getElementById('averagePace'),
            maxelevation: document.getElementById('maxElevation'),
            minelevation: document.getElementById('minElevation')
        };

        // Hide all final stat boxes first
        const allBoxes = document.querySelectorAll('.final-stat-box');
        allBoxes.forEach(box => {
            box.style.display = 'none';
        });

        // Show and populate only selected stats
        selectedStats.forEach(statKey => {
            const finalElement = finalStatsElements[statKey];
            const sourceElement = sourceElements[statKey];
            const box = document.querySelector(`.final-stat-box[data-stat="${statKey}"]`);

            if (finalElement && sourceElement && box) {
                finalElement.textContent = sourceElement.textContent;
                box.style.display = 'block';
            }
        });
    }

    resetStatsEndAnimation() {
        const overlay = document.getElementById('liveStatsOverlay');
        if (!overlay) return;

        // Remove the end animation class and layout classes to return to normal state
        overlay.classList.remove('end-animation', 'mobile-layout', 'square-layout', 'horizontal-layout', 'with-speed');

        // Hide final stats content when animation ends
        const finalStatsContent = overlay.querySelector('.final-stats-content');
        if (finalStatsContent) {
            finalStatsContent.style.display = 'none';
        }
    }

    // Toggle all overlapping tracks full-line visibility (hide during animation)
    applyOverlapLineVisibilityDuringAnimation(hide) {
        if (!this.additionalComparisons) return;
        for (let i = 0; i < this.additionalComparisons.length; i++) {
            const entry = this.additionalComparisons[i];
            if (!entry) continue;
            const layerId = `overlap-${entry.index}-trail-line`;
            if (this.map.getLayer(layerId)) {
                this.map.setPaintProperty(layerId, 'line-opacity', hide ? 0 : 0.8);
            }
        }
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }

    // Segment animation setup
    setupSegmentAnimation(segments, segmentTiming) {
        const previousProgress = this.animationProgress || 0;
        const wasAnimating = this.isAnimating;
        
        this.segmentTimings = null;
        this.currentSegmentIndex = 0;
        this.segmentProgress = 0;
        this.journeyElapsedTime = 0;
        this.lastAnimationTime = 0;
        
        this.segmentTimings = segmentTiming;
        
        if (previousProgress > 0 && segmentTiming && segmentTiming.totalDuration > 0) {
            this.journeyElapsedTime = previousProgress * segmentTiming.totalDuration;
            this.animationProgress = previousProgress;
            this.updateSegmentProgress(previousProgress);
        } else {
            this.animationProgress = 0;
            this.journeyElapsedTime = 0;
        }
        
        this.updateCurrentPosition();
    }

    setAnimationProgress(progress) {
        this.animationProgress = Math.max(0, Math.min(1, progress));
        
        // Reset stats animation if seeking away from the end
        if (progress < 0.98) {
            this.resetStatsEndAnimation();
        }
        
        // --- Per-segment time calculation ---
        if (this.segmentTimings && this.segmentTimings.segments && this.segmentTimings.segments.length > 0) {
            // Map global progress to journeyElapsedTime
            const totalPoints = this.trackData.trackPoints.length - 1;
            const targetIndex = progress * totalPoints;
            let found = false;
            for (let i = 0; i < this.segmentTimings.segments.length; i++) {
                const seg = this.segmentTimings.segments[i];
                if (typeof seg.startIndex === 'number' && typeof seg.endIndex === 'number') {
                    if (targetIndex >= seg.startIndex && targetIndex <= seg.endIndex) {
                        const segLength = seg.endIndex - seg.startIndex;
                        const segmentProgress = segLength > 0 ? (targetIndex - seg.startIndex) / segLength : 0;
                        this.journeyElapsedTime = seg.startTime + segmentProgress * seg.duration;
                        found = true;
                        break;
                    }
                }
            }
            if (!found) {
                // Fallback: use total duration
                this.journeyElapsedTime = progress * this.segmentTimings.totalDuration;
            }
        } else if (this.segmentTimings && this.segmentTimings.totalDuration) {
            this.journeyElapsedTime = progress * this.segmentTimings.totalDuration;
        }
        if (this.segmentTimings && this.segmentTimings.segments) {
            this.updateSegmentProgress(progress);
        }
        this.lastAnimationTime = 0;
        this.updateCurrentPosition();
    }

    setJourneyElapsedTime(timeInSeconds) {
        if (!this.segmentTimings) return;
        this.journeyElapsedTime = Math.max(0, Math.min(timeInSeconds, this.segmentTimings.totalDuration));
        // --- Synchronize animationProgress for journeys ---
        if (this.segmentTimings.segments && this.segmentTimings.segments.length > 0) {
            // Find which segment this time falls into
            let found = false;
            for (let i = 0; i < this.segmentTimings.segments.length; i++) {
                const seg = this.segmentTimings.segments[i];
                if (timeInSeconds >= seg.startTime && timeInSeconds <= seg.endTime) {
                    const relativeTimeInSegment = timeInSeconds - seg.startTime;
                    const segmentProgress = seg.duration > 0 ? relativeTimeInSegment / seg.duration : 0;
                    const segStart = seg.startIndex;
                    const segEnd = seg.endIndex;
                    const segLength = segEnd - segStart;
                    const globalIndex = segStart + segmentProgress * segLength;
                    this.animationProgress = globalIndex / (this.trackData.trackPoints.length - 1);
                    found = true;
                    break;
                }
            }
            if (!found) {
                // Fallback: proportional
                this.animationProgress = timeInSeconds / this.segmentTimings.totalDuration;
            }
        } else if (this.segmentTimings.totalDuration) {
            this.animationProgress = timeInSeconds / this.segmentTimings.totalDuration;
        }
        this.lastAnimationTime = 0;
        this.updateCurrentPosition();
    }

    getJourneyElapsedTime() {
        return this.journeyElapsedTime;
    }

    updateSegmentProgress(globalProgress) {
        if (!this.segmentTimings || !this.segmentTimings.segments) return;
        
        const totalDuration = this.segmentTimings.totalDuration;
        const currentTime = globalProgress * totalDuration;
        
        for (let i = 0; i < this.segmentTimings.segments.length; i++) {
            const segment = this.segmentTimings.segments[i];
            if (currentTime >= segment.startTime && currentTime <= segment.endTime) {
                this.currentSegmentIndex = i;
                if (segment.duration > 0) {
                    this.segmentProgress = (currentTime - segment.startTime) / segment.duration;
                } else {
                    this.segmentProgress = 0;
                }
                break;
            }
        }
    }

    // Map style methods
    changeMapStyle(style) {
        const layerConfigs = {
            'satellite': {
                source: 'satellite',
                attribution: '© Esri'
            },
            'opentopomap': {
                source: 'opentopomap',
                attribution: '© OpenTopoMap (CC-BY-SA)'
            },
            'street': {
                source: 'osm',
                attribution: '© OpenStreetMap contributors'
            },
            // Mountain satellite style: satellite + enhanced hillshade + labels (replaces hybrid)
            'hybrid': {
                sources: ['satellite', 'enhanced-hillshade', 'carto-labels'],
                attribution: '© Esri, © OpenTopography/ASTER GDEM, © CartoDB'
            }
        };

        // --- Handle hybrid style (now mountain satellite with 3D terrain) ---
        if (style === 'hybrid') {
            // Show satellite, enhanced hillshade, and labels
            this.showLayers(['background', 'enhanced-hillshade', 'carto-labels']);
            this.hideLayers(['opentopomap', 'street']);
            this.enable3DTerrain(); // Enable 3D for better terrain visualization
            return;
        }

        // --- Handle other styles ---
        const config = layerConfigs[style] || layerConfigs['satellite'];
        if (this.map.getLayer('background')) {
            this.map.setLayoutProperty('background', 'visibility', style === 'satellite' ? 'visible' : 'none');
        }
        if (this.map.getLayer('carto-labels')) {
            this.map.setLayoutProperty('carto-labels', 'visibility', 'none');
        }
        if (this.map.getLayer('opentopomap')) {
            this.map.setLayoutProperty('opentopomap', 'visibility', style === 'opentopomap' ? 'visible' : 'none');
        }
        if (this.map.getLayer('street')) {
            // Show street only if style is street
            this.map.setLayoutProperty('street', 'visibility', style === 'street' ? 'visible' : 'none');
        }
        // Hide enhanced hillshade for standard styles (except hybrid which uses it)
        if (style !== 'hybrid' && this.map.getLayer('enhanced-hillshade')) {
            this.map.setLayoutProperty('enhanced-hillshade', 'visibility', 'none');
        }
        
        // Optionally update attribution UI here
        this.currentMapStyle = style; // Track current style for preloading
    }

    // Helper methods for cleaner layer management
    showLayers(layerIds) {
        layerIds.forEach(id => {
            if (this.map.getLayer(id)) {
                this.map.setLayoutProperty(id, 'visibility', 'visible');
            }
        });
    }

    hideLayers(layerIds) {
        layerIds.forEach(id => {
            if (this.map.getLayer(id)) {
                this.map.setLayoutProperty(id, 'visibility', 'none');
            }
        });
    }

    // Journey segments handling
    loadJourneySegments(trackData, coordinates) {
        const trailLineData = {
            type: 'FeatureCollection',
            features: []
        };

        trackData.segments.forEach((segment, index) => {
            const segmentCoords = coordinates.slice(segment.startIndex, segment.endIndex + 1);
            
            if (segmentCoords.length < 2) return;
            
            const feature = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: segmentCoords
                },
                properties: {
                    segmentType: segment.type,
                    segmentMode: segment.mode || segment.data?.data?.activityType,
                    segmentIndex: index,
                    isTrack: segment.type === 'track',
                    isTransportation: segment.type === 'transportation'
                }
            };
            
            trailLineData.features.push(feature);
        });

        this.map.getSource('trail-line').setData(trailLineData);
        this.addSegmentTransitionMarkers(trackData.segments, coordinates);
    }

    addSegmentTransitionMarkers(segments, coordinates) {
        const transitionFeatures = [];
        
        for (let i = 1; i < segments.length; i++) {
            const prevSegment = segments[i - 1];
            const currentSegment = segments[i];
            const transitionIndex = currentSegment.startIndex;
            
            if (transitionIndex < coordinates.length) {
                const coord = coordinates[transitionIndex];
                
                transitionFeatures.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: coord
                    },
                    properties: {
                        fromType: prevSegment.type,
                        toType: currentSegment.type,
                        fromMode: prevSegment.mode || prevSegment.data?.data?.activityType,
                        toMode: currentSegment.mode || currentSegment.data?.data?.activityType
                    }
                });
            }
        }
        
        if (!this.map.getSource('segment-transitions')) {
            this.map.addSource('segment-transitions', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: transitionFeatures
                }
            });
            
            this.map.addLayer({
                id: 'segment-transitions',
                type: 'circle',
                source: 'segment-transitions',
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#ff6b6b',
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-width': 2,
                    'circle-opacity': 0.8
                }
            });
        } else {
            this.map.getSource('segment-transitions').setData({
                type: 'FeatureCollection',
                features: transitionFeatures
            });
        }
    }

    // 3D Terrain functionality
    enable3DTerrain() {
        if (!this.map || this.is3DMode) return;

        const wasAnimating = this.isAnimating;
        const currentProgress = this.animationProgress;

        try {
            // 1) Ensure DEM source exists
            if (!this.map.getSource('terrain-dem')) {
                this.addTerrainSource(this.currentTerrainSource);
            }

            // 2) Apply terrain immediately
            try {
                this.map.setTerrain({ source: 'terrain-dem', exaggeration: 0.8 });
            } catch (terrainError) {
                console.warn('Could not apply terrain elevation immediately:', terrainError);
            }

            // 3) Preload DEM around current center at current zoom to reduce flashes
            try {
                const center = this.map.getCenter();
                const z = Math.round(this.map.getZoom());
                this.preloadTerrainTilesAtPosition(center.lat, center.lng, z);
            } catch (_) {}

            // 4) After the map goes idle (or short delay), pitch up
            const pitchUp = () => {
                this.map.easeTo({ pitch: 30, duration: 500 });
            };

            // Prefer idle, but fall back to timeout if it doesn't fire soon
            let pitched = false;
            const onIdle = () => { if (!pitched) { pitched = true; pitchUp(); } };
            try {
                this.map.once('idle', onIdle);
                setTimeout(() => { if (!pitched) { pitched = true; pitchUp(); } }, 400);
            } catch (_) {
                setTimeout(pitchUp, 300);
            }

            this.is3DMode = true;

            // Restore animation state if needed
            if (wasAnimating && currentProgress !== undefined) {
                setTimeout(() => {
                    this.setAnimationProgress(currentProgress);
                    if (wasAnimating) this.startAnimation();
                }, 200);
            }
        } catch (error) {
            console.error('Error enabling 3D terrain:', error);
            this.is3DMode = false;
        }
    }

    setupTerrainSourceMinimal() {
        try {
            if (!this.map.getSource('terrain-dem')) {
                this.addTerrainSource(this.currentTerrainSource);
            }
            
            setTimeout(() => {
                try {
                    this.map.setTerrain({
                        source: 'terrain-dem',
                        exaggeration: 0.8
                    });
                } catch (terrainError) {
                    console.warn('Could not apply terrain elevation:', terrainError);
                }
            }, 300);
            
        } catch (error) {
            console.warn('Could not setup terrain source:', error);
        }
    }

    addTerrainSource(provider) {
        const sources = {
            'mapzen': {
                type: 'raster-dem',
                tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
                tileSize: 256,
                encoding: 'terrarium',
                maxzoom: 15
            },
            'opentopo': {
                type: 'raster-dem',
                tiles: ['https://cloud.sdsc.edu/v1/AUTH_opentopography/Raster/SRTM_GL1/{z}/{x}/{y}.png'],
                tileSize: 256,
                encoding: 'mapbox',
                maxzoom: 14
            }
        };

        const sourceConfig = sources[provider] || sources['mapzen'];
        this.map.addSource('terrain-dem', sourceConfig);
    }

    setTerrainSource(provider) {
        if (!this.map || !this.is3DMode) {
            this.currentTerrainSource = provider;
            return;
        }

        try {
            const wasAnimating = this.isAnimating;
            const currentProgress = this.animationProgress;
            
            if (this.map.getSource('terrain-dem')) {
                this.map.setTerrain(null);
                this.map.removeSource('terrain-dem');
            }
            
            this.addTerrainSource(provider);
            this.currentTerrainSource = provider;
            
            setTimeout(() => {
                try {
                    this.map.setTerrain({
                        source: 'terrain-dem',
                        exaggeration: 0.8
                    });
                    
                    if (wasAnimating && currentProgress !== undefined) {
                        setTimeout(() => {
                            this.setAnimationProgress(currentProgress);
                            if (wasAnimating) {
                                this.startAnimation();
                            }
                        }, 200);
                    }
                } catch (terrainError) {
                    console.warn(`Could not apply ${provider} terrain:`, terrainError);
                }
            }, 300);
            
        } catch (error) {
            console.error(`Error switching terrain source to ${provider}:`, error);
        }
    }

    disable3DTerrain() {
        if (!this.map || !this.is3DMode) return;
        
        this.is3DMode = false;
        
        try {
            const wasAnimating = this.isAnimating;
            const currentProgress = this.animationProgress;
            
            this.map.setTerrain(null);
            
            this.map.easeTo({
                pitch: 0,
                duration: 500
            });
            
            if (wasAnimating && currentProgress !== undefined) {
                setTimeout(() => {
                    this.setAnimationProgress(currentProgress);
                    if (wasAnimating) {
                        this.startAnimation();
                    }
                }, 600);
            }
        } catch (error) {
            console.error('Error disabling 3D terrain:', error);
        }
    }

    update3DTrailRendering() {
        if (!this.trackData || !this.map.getLayer('trail-line')) {
            return;
        }
        
        this.map.setPaintProperty('trail-line', 'line-width', [
            'case',
            ['==', ['get', 'isTransportation'], true], 8,
            6
        ]);
        
        if (this.map.getLayer('trail-completed')) {
            this.map.setPaintProperty('trail-completed', 'line-width', 7);
            this.map.setPaintProperty('trail-completed', 'line-opacity', 1.0);
        }
        
        this.map.setPaintProperty('trail-line', 'line-opacity', [
            'case',
            ['==', ['get', 'isTransportation'], true], 0.9,
            0.8
        ]);
        
        if (this.map.getLayer('current-position-glow')) {
            this.map.setPaintProperty('current-position-glow', 'circle-radius', 20 * this.markerSize);
        }
    }

    setTerrainExaggeration(exaggeration) {
        if (this.is3DMode && this.map.getSource('terrain-dem')) {
            try {
                this.map.setTerrain({
                    source: 'terrain-dem',
                    exaggeration: exaggeration
                });
            } catch (error) {
                console.error('Error setting terrain exaggeration:', error);
            }
        }
    }

    isTerrainSupported() {
        return typeof this.map.setTerrain === 'function' && typeof this.map.addSource === 'function';
    }

    // Stats methods for video export
    getCurrentDistance() {
        if (!this.gpxParser || !this.trackData) return 0;
        
        const currentPoint = this.gpxParser.getInterpolatedPoint(this.animationProgress);
        return currentPoint ? currentPoint.distance : 0;
    }

    getCurrentElevation() {
        if (!this.gpxParser || !this.trackData) return 0;
        
        const currentPoint = this.gpxParser.getInterpolatedPoint(this.animationProgress);
        return currentPoint ? currentPoint.elevation : 0;
    }

    getCurrentSpeed() {
        if (!this.gpxParser || !this.trackData) return 0;
        
        const currentPoint = this.gpxParser.getInterpolatedPoint(this.animationProgress);
        return currentPoint ? currentPoint.speed : 0;
    }

    getElevationData() {
        if (!this.trackData || !this.trackData.trackPoints) return [];
        
        return this.trackData.trackPoints.map(point => point.elevation || 0);
    }

    // Camera mode methods
    setCameraMode(mode) {


        
        this.cameraMode = mode;
        
        if (mode === 'followBehind') {
            // Disable map interactions when in follow-behind mode
            this.disableMapInteractions();
            
            // Force auto-follow to be enabled
            const autoFollowToggle = document.getElementById('autoZoom');
            if (autoFollowToggle && !autoFollowToggle.checked) {
                autoFollowToggle.checked = true;
                this.autoZoom = true;

            }
            
            // Disable the auto-follow toggle to prevent user from turning it off
            if (autoFollowToggle) {
                autoFollowToggle.disabled = true;
                console.log('📹 Auto-follow toggle disabled');
            }
            
            // Initialize the follow-behind camera
            console.log('📹 Initializing follow-behind camera');
            this.followBehindCamera.initialize();
            
            // If paused, allow zooming
            if (!this.isAnimating) {
                this.enableZoomOnlyInteractions();
            }
        } else {
            console.log('📹 Entering standard camera mode');
            
            // Reset follow-behind camera to allow re-initialization
            this.followBehindCamera.reset();
            
            // Re-enable map interactions for standard mode
            this.enableMapInteractions();
            
            // Re-enable the auto-follow toggle
            const autoFollowToggle = document.getElementById('autoZoom');
            if (autoFollowToggle) {
                autoFollowToggle.disabled = false;
            }
            
            // Return to a normal overview of the track when switching to standard mode
            if (this.trackData && this.trackData.bounds) {
                console.log('📹 Switching to standard mode - showing track overview');
                this.centerOnTrail();
            }
            
            // Restore original marker size when switching to standard mode
            if (this.followBehindCamera.originalMarkerSize) {
                this.markerSize = this.followBehindCamera.originalMarkerSize;
                this.createAndAddActivityIcon();
                if (this.map.getLayer('activity-icon-layer')) {
                    this.forceIconUpdate();
                }
            }
        }
    }

    initializeFollowBehindCamera() {
        console.log('🎬 initializeFollowBehindCamera called');
        console.log('🎬 Checking prerequisites:', {
            hasTrackData: !!this.trackData,
            hasMap: !!this.map,
            is3DMode: this.is3DMode,
            alreadyInitialized: this.followBehindInitialized
        });
        
        if (!this.trackData || !this.map) {
            console.warn('🎬 Cannot initialize follow-behind camera: missing prerequisites');
            return;
        }
        
        // Prevent multiple initializations
        if (this.followBehindInitialized) {
            console.log('🎬 Follow-behind camera already initialized, skipping');
            return;
        }
        
        console.log('🎬 Initializing follow-behind camera mode');
        this.followBehindInitialized = true;
        
        // Enable 3D if not already enabled for better cinematic effect
        if (!this.is3DMode) {
            console.log('🎬 Enabling 3D terrain for cinematic effect');
            this.enable3DTerrain();
            
            // Wait longer for terrain to actually load
            this.waitForTerrainToLoad().then(() => {
                console.log('🎬 Terrain loaded, initializing terrain-aware settings');
                this.initializeTerrainAwareSettings();
                this.setFollowBehindStartingPosition();
            });
        } else {
            // 3D already enabled, set position immediately
            setTimeout(() => {
                this.initializeTerrainAwareSettings();
                this.setFollowBehindStartingPosition();
            }, 500);
        }
        
        console.log('🎬 Follow-behind camera mode initialized');
    }

    async initializeFollowBehindCameraStart() {
        if (!this.trackData || !this.map) {
            console.warn('🎬 Cannot initialize follow-behind start: missing trackData or map');
            return;
        }
        
        console.log('🎬 Starting follow-behind camera cinematic sequence');
        
        // Ensure terrain is loaded before starting cinematic sequence
        if (this.is3DMode && (!this.map.getTerrain || !this.map.getTerrain())) {
            console.log('🎬 Waiting for terrain before starting cinematic sequence');
            await this.waitForTerrainToLoad();
        }
        
        // Get the CURRENT marker position (not start point) since animation may have already started
        const currentPoint = this.gpxParser.getInterpolatedPoint(this.animationProgress);
        if (!currentPoint) {
            console.warn('🎬 No current point available for follow-behind camera at progress:', this.animationProgress);
            return;
        }
        
        // Calculate bearing from current position
        const bearing = this.calculateCameraBearing(this.animationProgress);
        
        // Get current zoom to use as starting point (should be the overview zoom we set)
        const currentZoom = this.map.getZoom();
        
        console.log(`🎬 Starting cinematic sequence from zoom ${currentZoom.toFixed(1)} at progress ${this.animationProgress.toFixed(3)}`);
        console.log(`🎬 Location: [${currentPoint.lon.toFixed(6)}, ${currentPoint.lat.toFixed(6)}] with bearing ${bearing.toFixed(1)}`);
        
        // Get terrain-aware settings for the current position
        const terrainSettings = this.calculateTerrainAwareCameraSettings(this.animationProgress);
        
        // Initialize the terrain-aware tracking variables properly
        this.lastCameraZoom = terrainSettings.zoom;
        this.lastCameraPitch = terrainSettings.pitch;
        this.lastCameraBearing = bearing;
        
        console.log(`🎬 Calculated terrain-aware start settings: zoom=${terrainSettings.zoom.toFixed(1)}, pitch=${terrainSettings.pitch.toFixed(1)}, bearing=${bearing.toFixed(1)}`);
        
        // Start the cinematic zoom-in from current position to terrain-aware follow-behind view
        this.map.easeTo({
            center: [currentPoint.lon, currentPoint.lat],
            zoom: terrainSettings.zoom,
            pitch: terrainSettings.pitch,
            bearing: bearing,
            duration: 3000 // 3 second cinematic zoom-in
        });
        
        this.lastCameraBearing = bearing;
        console.log('🎬 Follow-behind camera cinematic start sequence initialized');
    }

    setFollowBehindCameraPosition() {
        if (!this.trackData || !this.map) {
            console.warn('🎬 Cannot set follow-behind camera: missing trackData or map');
            return;
        }
        
        console.log('🎬 Setting follow-behind camera position for progress:', this.animationProgress);
        
        // Get current position
        const currentPoint = this.gpxParser.getInterpolatedPoint(this.animationProgress);
        if (!currentPoint) {
            console.warn('🎬 No current point for follow-behind camera at progress:', this.animationProgress);
            return;
        }
        
        // Calculate bearing from movement direction
        const bearing = this.calculateCameraBearing(this.animationProgress);
        
        console.log(`🎬 Setting follow-behind camera: center=[${currentPoint.lon.toFixed(6)}, ${currentPoint.lat.toFixed(6)}], zoom=${this.followBehindSettings.zoom}, pitch=${this.followBehindSettings.pitch}, bearing=${bearing.toFixed(1)}`);
        
        // Set camera position with smooth transition
        this.map.easeTo({
            center: [currentPoint.lon, currentPoint.lat],
            zoom: this.followBehindSettings.zoom,
            pitch: this.followBehindSettings.pitch,
            bearing: bearing,
            duration: 1500
        });
        
        this.lastCameraBearing = bearing;
        console.log('🎬 Follow-behind camera position set successfully');
    }

    calculateCameraBearing(progress) {
        if (!this.trackData || !this.trackData.trackPoints || this.trackData.trackPoints.length < 2) {
            return 0;
        }
        
        // Get a larger segment ahead to calculate direction for better stability
        const lookAheadProgress = Math.min(progress + 0.05, 1); // Look ahead by 5%
        const currentPoint = this.gpxParser.getInterpolatedPoint(progress);
        const futurePoint = this.gpxParser.getInterpolatedPoint(lookAheadProgress);
        
        if (!currentPoint || !futurePoint) {
            return this.lastCameraBearing || 0;
        }
        
        // Calculate bearing between current and future point
        const bearing = this.calculateBearingBetweenPoints(
            currentPoint.lat, currentPoint.lon,
            futurePoint.lat, futurePoint.lon
        );
        
        return bearing;
    }

    calculateTerrainAwareCameraSettings(progress) {
        // Ensure GPX parser is ready
        if (!this.ensureGPXParserReady()) {
            return {
                zoom: this.followBehindSettings.baseZoom,
                pitch: this.followBehindSettings.basePitch,
                markerScale: 1.0
            };
        }
        
        const currentPoint = this.gpxParser.getInterpolatedPoint(progress);
        if (!currentPoint) {
            return {
                zoom: this.followBehindSettings.baseZoom,
                pitch: this.followBehindSettings.basePitch,
                markerScale: 1.0
            };
        }

        const currentElevation = currentPoint.elevation || 0;
        
        // Calculate elevation change and terrain steepness
        const lookAheadProgress = Math.min(progress + 0.02, 1); // Look ahead 2%
        const lookBehindProgress = Math.max(progress - 0.02, 0); // Look behind 2%
        
        const futurePoint = this.gpxParser.getInterpolatedPoint(lookAheadProgress);
        const pastPoint = this.gpxParser.getInterpolatedPoint(lookBehindProgress);
        
        let elevationChange = 0;
        let steepness = 0;
        
        if (futurePoint && pastPoint) {
            elevationChange = futurePoint.elevation - pastPoint.elevation;
            
            // Calculate steepness (elevation change per distance)
            const distance = this.calculateDistanceBetweenPoints(
                pastPoint.lat, pastPoint.lon,
                futurePoint.lat, futurePoint.lon
            );
            steepness = distance > 0 ? Math.abs(elevationChange) / distance : 0;
        }
        
        // Dynamic zoom based on elevation and steepness
        let dynamicZoom = this.followBehindSettings.baseZoom;
        
        // Zoom out for higher elevations and steep terrain
        const elevationFactor = Math.min(currentElevation * this.followBehindSettings.elevationSensitivity, 2);
        const steepnessFactor = Math.min(steepness * 1000, 1.5); // Scale steepness impact
        
        dynamicZoom = this.followBehindSettings.baseZoom - elevationFactor - steepnessFactor;
        dynamicZoom = Math.max(this.followBehindSettings.minZoom, 
                              Math.min(this.followBehindSettings.maxZoom, dynamicZoom));
        
        // Dynamic pitch based on elevation change and steepness
        let dynamicPitch = this.followBehindSettings.basePitch;
        
        // Adjust pitch for terrain
        if (elevationChange > 20) {
            // Ascending: reduce pitch to see more ahead
            dynamicPitch = Math.max(this.followBehindSettings.minPitch, 
                                   this.followBehindSettings.basePitch - 15);
        } else if (elevationChange < -20) {
            // Descending: increase pitch but not too much to avoid going inside terrain
            dynamicPitch = Math.min(this.followBehindSettings.maxPitch - 10, 
                                   this.followBehindSettings.basePitch + 5);
        }
        
        // For very steep terrain, always use lower pitch to stay above terrain
        if (steepness > 0.1) { // Very steep
            dynamicPitch = Math.max(this.followBehindSettings.minPitch, dynamicPitch - 10);
        }
        
        // Extra smooth transitions for terrain changes with rate limiting
        const maxZoomChangePerFrame = 0.1;
        const maxPitchChangePerFrame = 2;
        
        const zoomDiff = dynamicZoom - this.lastCameraZoom;
        const pitchDiff = dynamicPitch - this.lastCameraPitch;
        
        // Limit rapid changes for ultra-smooth movement
        const limitedZoomChange = Math.max(-maxZoomChangePerFrame, 
                                         Math.min(maxZoomChangePerFrame, zoomDiff));
        const limitedPitchChange = Math.max(-maxPitchChangePerFrame, 
                                          Math.min(maxPitchChangePerFrame, pitchDiff));
        
        this.lastCameraZoom = this.lastCameraZoom * 0.95 + (this.lastCameraZoom + limitedZoomChange) * 0.05;
        this.lastCameraPitch = this.lastCameraPitch * 0.95 + (this.lastCameraPitch + limitedPitchChange) * 0.05;
        this.lastElevation = currentElevation;
        
        // Calculate marker scale based on zoom level to prevent it from being too large
        // Higher zoom = smaller marker scale to maintain proportion
        const baseZoom = this.followBehindSettings.baseZoom;
        const currentZoom = this.lastCameraZoom;
        const zoomDifference = currentZoom - baseZoom;
        
        // Scale marker inversely with zoom: closer zoom = smaller marker
        // At base zoom (17): scale = 1.0
        // At min zoom (15): scale = 1.4 (larger marker when zoomed out)
        // At max zoom (18): scale = 0.6 (smaller marker when zoomed in)
        let markerScale = 1.0 - (zoomDifference * 0.2);
        markerScale = Math.max(0.3, Math.min(1.5, markerScale)); // Clamp between 0.3 and 1.5
        
        return {
            zoom: this.lastCameraZoom,
            pitch: this.lastCameraPitch,
            elevation: currentElevation,
            elevationChange: elevationChange,
            steepness: steepness,
            markerScale: markerScale
        };
    }

    calculateDistanceBetweenPoints(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c * 1000; // Return distance in meters
    }

    updateMarkerScaleForZoom(targetScale) {
        // Store the original marker size if not already stored
        if (!this.originalMarkerSize) {
            this.originalMarkerSize = this.markerSize;
        }
        
        // Calculate the adjusted marker size
        const adjustedSize = this.originalMarkerSize * targetScale;
        
        // Only update if the change is significant to avoid constant updates
        if (Math.abs(this.markerSize - adjustedSize) > 0.05) {
            this.markerSize = adjustedSize;
            
            // Force marker icon regeneration with new size
            this.createAndAddActivityIcon();
            
            // Update activity icon layer if it exists
            if (this.map.getLayer('activity-icon-layer')) {
                this.forceIconUpdate();
            }
        }
    }

    async waitForTerrainToLoad() {
        return new Promise((resolve) => {
            const checkTerrain = () => {
                // Check if terrain is actually applied and ready
                if (this.map.getTerrain && this.map.getTerrain()) {
                    console.log('🎬 Terrain confirmed loaded');
                    resolve();
                } else {
                    console.log('🎬 Waiting for terrain to load...');
                    setTimeout(checkTerrain, 500);
                }
            };
            
            // Start checking immediately, but with a fallback timeout
            checkTerrain();
            
            // Fallback: resolve after 3 seconds even if terrain check fails
            setTimeout(() => {
                console.log('🎬 Terrain load timeout, proceeding anyway');
                resolve();
            }, 3000);
        });
    }

    initializeTerrainAwareSettings() {
        console.log('🎬 Initializing terrain-aware camera settings');
        
        // Ensure we have track data and GPX parser is ready
        if (!this.ensureGPXParserReady()) {
            console.warn('🎬 Cannot initialize terrain-aware settings: GPX parser not ready');
            return;
        }
        
        // Get the starting point elevation for initial calculation
        const startPoint = this.gpxParser.getInterpolatedPoint(0);
        if (!startPoint) {
            console.warn('🎬 No start point available for terrain initialization');
            return;
        }
        
        const startElevation = startPoint.elevation || 0;
        
        // Calculate base terrain-aware settings directly without smoothing
        let baseZoom = this.followBehindSettings.baseZoom;
        let basePitch = this.followBehindSettings.basePitch;
        
        // Apply elevation-based adjustments
        const elevationFactor = Math.min(startElevation * this.followBehindSettings.elevationSensitivity, 2);
        baseZoom = Math.max(this.followBehindSettings.minZoom, 
                           Math.min(this.followBehindSettings.maxZoom, baseZoom - elevationFactor));
        
        // Initialize the tracking variables with consistent values
        this.lastCameraZoom = baseZoom;
        this.lastCameraPitch = basePitch;
        this.lastElevation = startElevation;
        
        console.log(`🎬 Initialized terrain-aware settings: zoom=${baseZoom.toFixed(1)}, pitch=${basePitch.toFixed(1)}, elevation=${startElevation.toFixed(0)}m`);
    }

    calculateBearingBetweenPoints(lat1, lon1, lat2, lon2) {
        const toRadians = (degrees) => degrees * (Math.PI / 180);
        const toDegrees = (radians) => radians * (180 / Math.PI);
        
        const dLon = toRadians(lon2 - lon1);
        const lat1Rad = toRadians(lat1);
        const lat2Rad = toRadians(lat2);
        
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        
        let bearing = toDegrees(Math.atan2(y, x));
        return (bearing + 360) % 360; // Normalize to 0-360
    }

    smoothBearing(currentBearing, targetBearing) {
        // Handle bearing wrapping (e.g., 350° -> 10°)
        let diff = targetBearing - currentBearing;
        
        if (diff > 180) {
            diff -= 360;
        } else if (diff < -180) {
            diff += 360;
        }
        
        // Apply smoothing
        const smoothedBearing = currentBearing + (diff * this.followBehindSettings.smoothing);
        return (smoothedBearing + 360) % 360; // Normalize to 0-360
    }

    disableMapInteractions() {
        if (!this.map) return;
        
        // Disable all map interactions for cinematic mode
        this.map.dragPan.disable();
        this.map.scrollZoom.disable();
        this.map.boxZoom.disable();
        this.map.dragRotate.disable();
        this.map.keyboard.disable();
        this.map.doubleClickZoom.disable();
        this.map.touchZoomRotate.disable();
        
        // Change cursor to indicate no interaction
        this.map.getCanvas().style.cursor = 'default';
        
        console.log('🎬 Map interactions disabled for follow-behind mode');
    }

    enableMapInteractions() {
        if (!this.map) return;
        
        // Re-enable all map interactions
        this.map.dragPan.enable();
        this.map.scrollZoom.enable();
        this.map.boxZoom.enable();
        this.map.dragRotate.enable();
        this.map.keyboard.enable();
        this.map.doubleClickZoom.enable();
        this.map.touchZoomRotate.enable();
        
        // Reset cursor
        this.map.getCanvas().style.cursor = '';
        
        console.log('🎬 Map interactions re-enabled for standard mode');
    }

    // Enable only zoom interactions (scroll and double-click) for the map
    enableZoomOnlyInteractions() {
        if (!this.map) return;
        // Disable all interactions first
        this.map.dragPan.disable();
        this.map.boxZoom.disable();
        this.map.dragRotate.disable();
        this.map.keyboard.disable();
        this.map.touchZoomRotate.disable();
        // Enable only zoom interactions
        this.map.scrollZoom.enable();
        this.map.doubleClickZoom.enable();
        // Cursor: default (not crosshair or grab)
        this.map.getCanvas().style.cursor = '';
        console.log('🎬 Zoom-only map interactions enabled (paused, follow-behind)');
    }

    setFollowBehindStartingPosition(instant = false) {
        if (!this.trackData || !this.map) {
            console.warn('🎬 Cannot set starting position: missing data');
            return;
        }
        
        console.log(`🎬 Setting consistent starting position for follow-behind mode ${instant ? '(instant)' : '(animated)'}`);
        
        // Get the track start point and ensure it's centered
        const startPoint = this.gpxParser.getInterpolatedPoint(0);
        if (!startPoint) {
            console.warn('🎬 No start point available');
            return;
        }
        
        console.log(`🎬 Centering overview on start point: [${startPoint.lon.toFixed(6)}, ${startPoint.lat.toFixed(6)}]`);
        
        // Calculate ideal overview zoom based on track bounds - start very wide like Spain-level
        let overviewZoom = 5; // Default very wide overview zoom (Spain-level)
        
        if (this.trackData.bounds) {
            const latDiff = this.trackData.bounds.north - this.trackData.bounds.south;
            const lonDiff = this.trackData.bounds.east - this.trackData.bounds.west;
            const maxDiff = Math.max(latDiff, lonDiff);
            
            // Calculate zoom based on track size - keep it wide for dramatic zoom-in effect
            if (maxDiff < 0.01) overviewZoom = 8;       // Very small track - still wide
            else if (maxDiff < 0.05) overviewZoom = 6;  // Small track - wide
            else if (maxDiff < 0.1) overviewZoom = 5;   // Medium track - very wide 
            else overviewZoom = 4;                      // Large track - extremely wide (Europe-level)
        }
        
        console.log(`🎬 Setting overview position: zoom ${overviewZoom} at start point`);
        
        // Set camera to overview position centered on start point
        if (instant) {
            // Instant positioning for reset
            this.map.jumpTo({
                center: [startPoint.lon, startPoint.lat],
                zoom: overviewZoom,
                pitch: 30, // Moderate 3D angle for overview
                bearing: 0 // North-up for overview
            });
        } else {
            // Animated positioning for initial setup
            this.map.easeTo({
                center: [startPoint.lon, startPoint.lat],
                zoom: overviewZoom,
                pitch: 30, // Moderate 3D angle for overview
                bearing: 0, // North-up for overview
            duration: 1000
        });
    }

        console.log('🎬 Starting position set successfully');
    }

    zoomOutToWholeTrack() {
        if (!this.trackData || !this.map) {
            console.warn('🎬 Cannot zoom out to whole track: missing data');
            return;
        }
        
        console.log('🎬 Zooming out to show whole track');
        
        if (this.trackData.bounds) {
            // Calculate a dramatic zoom-out with 3D perspective
            const fitOptions = {
                padding: 100,
                duration: 3000, // 3 second zoom-out
                pitch: 45, // Maintain 3D perspective
                bearing: 0 // Reset bearing to north-up
            };
            
            this.map.fitBounds([
                [this.trackData.bounds.west, this.trackData.bounds.south],
                [this.trackData.bounds.east, this.trackData.bounds.north]
            ], fitOptions);
            
            console.log('🎬 Zoom-out to whole track completed');
        } else {
            console.warn('🎬 No track bounds available for zoom-out');
        }
    }

    /**
     * Initialize camera position after track data is loaded
     */
    initializeTrackCameraPosition(trackData) {
        console.log('🎬 Initializing camera position for loaded track');
        
        if (!this.map || !trackData) {
            console.warn('🎬 Cannot initialize camera position: missing map or track data');
            return;
        }
        
        // Ensure GPX parser is ready
        if (!this.ensureGPXParserReady()) {
            console.warn('🎬 GPX parser not ready for camera initialization');
            return;
        }
        
        // Initialize based on camera mode
        if (this.cameraMode === 'followBehind') {
            // Initialize follow-behind camera with terrain-aware settings
            this.followBehindCamera.initializeTerrainAwareSettings();
            
            // Set the starting position for follow-behind mode
            this.followBehindCamera.setStartingPosition(true); // instant = true for initial load
            
        } else {
            // Standard mode - ensure proper zoom level is set
            const startPoint = this.gpxParser.getInterpolatedPoint(0);
            if (startPoint && trackData.bounds) {
                // Calculate appropriate zoom based on track size and elevation
                const latDiff = trackData.bounds.north - trackData.bounds.south;
                const lonDiff = trackData.bounds.east - trackData.bounds.west;
                const maxDiff = Math.max(latDiff, lonDiff);
                
                let appropriateZoom = 12; // Default zoom
                if (maxDiff < 0.01) appropriateZoom = 15;      // Very small track
                else if (maxDiff < 0.05) appropriateZoom = 13;  // Small track
                else if (maxDiff < 0.1) appropriateZoom = 12;   // Medium track
                else appropriateZoom = 10;                      // Large track
                
                // Adjust zoom based on elevation if available
                const elevation = startPoint.elevation || 0;
                if (elevation > 1000) appropriateZoom -= 1; // Higher elevation = zoom out more
                else if (elevation > 2000) appropriateZoom -= 2;
                
                // Apply the calculated zoom with smooth transition
                this.map.easeTo({
                    center: [startPoint.lon, startPoint.lat],
                    zoom: Math.max(8, Math.min(16, appropriateZoom)), // Clamp to reasonable range
                    pitch: 0,
                    bearing: 0,
                    duration: 1000
                });
            }
        }
        
        console.log('🎬 Camera position initialized for camera mode:', this.cameraMode);
    }

    initializeCameraMode() {
        console.log('🎬 Initializing default camera mode:', this.cameraMode);
        
        // Apply default camera mode settings
        if (this.cameraMode === 'followBehind') {
            // Disable map interactions and force auto-zoom for follow-behind
            this.disableMapInteractions();
            
            const autoFollowToggle = document.getElementById('autoZoom');
            if (autoFollowToggle) {
                autoFollowToggle.checked = true;
                autoFollowToggle.disabled = true;
                this.autoZoom = true;
            }
            
            console.log('🎬 Follow-behind mode initialized as default');
        } else {
            // Standard mode - ensure map interactions are enabled
            this.enableMapInteractions();
            
            const autoFollowToggle = document.getElementById('autoZoom');
            if (autoFollowToggle) {
                autoFollowToggle.disabled = false;
            }
            
            console.log('🎬 Standard camera mode initialized as default');
        }
    }

    // Getters for compatibility
    get isAnnotationMode() {
        return this.annotations.isAnnotationMode;
    }

    get isIconChangeMode() {
        return this.iconChanges.isIconChangeMode;
    }

    /**
     * Preload all tiles covering the viewport at a given lat/lon/zoom for the current style
     */
    preloadTilesAtPosition(lat, lon, zoom, style, options = {}) {
        if (!this.map) return;
        const bufferScale = options.bufferScale || 1.25; // preload slightly beyond viewport
        const z = Math.max(0, Math.round(zoom));

        // Determine tile URL templates for the style
        const tileTemplates = {
            satellite: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            opentopomap: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
            street: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            hybrid: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                'https://cartodb-basemaps-a.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png'
            ]
        };
        const templates = tileTemplates[style] || tileTemplates['satellite'];

        // Viewport size in CSS pixels (not device pixels)
        const canvas = this.map.getCanvas();
        const viewportWidth = canvas.clientWidth || canvas.width / window.devicePixelRatio;
        const viewportHeight = canvas.clientHeight || canvas.height / window.devicePixelRatio;
        const halfW = (viewportWidth / 2) * bufferScale;
        const halfH = (viewportHeight / 2) * bufferScale;

        // Convert center to world pixel coordinates at zoom z
        const n = 256 * Math.pow(2, z);
        const lonNorm = (lon + 180) / 360;
        const sinLat = Math.sin(lat * Math.PI / 180);
        const xPx = lonNorm * n;
        const yPx = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * n;

        const minXpx = xPx - halfW;
        const maxXpx = xPx + halfW;
        const minYpx = yPx - halfH;
        const maxYpx = yPx + halfH;

        const minX = Math.max(0, Math.floor(minXpx / 256));
        const maxX = Math.min((1 << z) - 1, Math.floor(maxXpx / 256));
        const minY = Math.max(0, Math.floor(minYpx / 256));
        const maxY = Math.min((1 << z) - 1, Math.floor(maxYpx / 256));

        // Also fetch a coarser zoom (z-1) as a guaranteed fallback placeholder
        const extraZooms = [z - 1].filter(v => v >= 0);

        const fetchTile = (tmpl, zVal, x, y) => {
            const url = tmpl.replace('{z}', zVal).replace('{x}', x).replace('{y}', y);
            if (!this.preloadedTiles.has(url)) {
                this.preloadedTiles.add(url);
                const img = new window.Image();
                img.crossOrigin = 'anonymous';
                img.src = url;
            }
        };

        for (const tmpl of templates) {
            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    fetchTile(tmpl, z, x, y);
                }
            }
            for (const zCoarse of extraZooms) {
                const scale = Math.pow(2, z - zCoarse);
                const minXc = Math.max(0, Math.floor(minX / scale));
                const maxXc = Math.min((1 << zCoarse) - 1, Math.floor(maxX / scale));
                const minYc = Math.max(0, Math.floor(minY / scale));
                const maxYc = Math.min((1 << zCoarse) - 1, Math.floor(maxY / scale));
                for (let x = minXc; x <= maxXc; x++) {
                    for (let y = minYc; y <= maxYc; y++) {
                        fetchTile(tmpl, zCoarse, x, y);
                    }
                }
            }
        }

        // Preload DEM tiles when 3D terrain is enabled/likely needed
        if (this.is3DMode) {
            this.preloadTerrainTilesAtPosition(lat, lon, Math.min(15, z));
        }
    }

    preloadTerrainTilesAtPosition(lat, lon, zoom) {
        const z = Math.max(0, Math.round(Math.min(15, zoom)));
        const demTemplates = {
            mapzen: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            opentopo: ['https://cloud.sdsc.edu/v1/AUTH_opentopography/Raster/SRTM_GL1/{z}/{x}/{y}.png']
        };
        const templates = demTemplates[this.currentTerrainSource] || demTemplates['mapzen'];

        const canvas = this.map.getCanvas();
        const viewportWidth = canvas.clientWidth || canvas.width / window.devicePixelRatio;
        const viewportHeight = canvas.clientHeight || canvas.height / window.devicePixelRatio;
        const n = 256 * Math.pow(2, z);
        const xPx = ((lon + 180) / 360) * n;
        const sinLat = Math.sin(lat * Math.PI / 180);
        const yPx = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * n;
        const halfW = (viewportWidth / 2) * 1.25;
        const halfH = (viewportHeight / 2) * 1.25;
        const minX = Math.max(0, Math.floor((xPx - halfW) / 256));
        const maxX = Math.min((1 << z) - 1, Math.floor((xPx + halfW) / 256));
        const minY = Math.max(0, Math.floor((yPx - halfH) / 256));
        const maxY = Math.min((1 << z) - 1, Math.floor((yPx + halfH) / 256));

        const fetchTile = (tmpl, zVal, x, y) => {
            const url = tmpl.replace('{z}', zVal).replace('{x}', x).replace('{y}', y);
            if (!this.preloadedTiles.has(url)) {
                this.preloadedTiles.add(url);
                const img = new window.Image();
                img.crossOrigin = 'anonymous';
                img.src = url;
            }
        };
        for (const tmpl of templates) {
            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    fetchTile(tmpl, z, x, y);
                }
            }
        }
    }

    // Helper: Map journeyElapsedTime to segment and local progress (for journeys)
    getSegmentAndLocalProgress(journeyElapsedTime) {
        if (!this.segmentTimings || !this.segmentTimings.segments) return { segmentIndex: 0, segmentProgress: 0 };
        const segments = this.segmentTimings.segments;
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            if (journeyElapsedTime >= seg.startTime && journeyElapsedTime < seg.endTime) {
                const segmentProgress = (journeyElapsedTime - seg.startTime) / seg.duration;
                return { segmentIndex: i, segmentProgress };
            }
        }
        // If at or past the end, return last segment at 1
        const last = segments.length - 1;
        return { segmentIndex: last, segmentProgress: 1 };
    }

    // Comparison Mode Methods
    addComparisonTrack(comparisonTrackData, timeOverlap = null) {
        console.log('🔧 Setting up comparison track...');
        console.log('📊 Received data:', {
            hasComparisonTrackData: !!comparisonTrackData,
            timeOverlap: timeOverlap,
            timeOverlapType: typeof timeOverlap,
            hasOverlap: timeOverlap?.hasOverlap,
            spatialOnly: timeOverlap?.spatialOnly,
            overlapDuration: timeOverlap?.overlapDuration
        });

        this.comparisonTrackData = comparisonTrackData;
        this.comparisonGpxParser = new GPXParser();
        this.comparisonGpxParser.trackPoints = comparisonTrackData.trackPoints;
        this.comparisonGpxParser.stats = comparisonTrackData.stats;
        this.timeOverlap = timeOverlap;

        console.log('📊 Stored data in MapRenderer:', {
            comparisonTrackData: !!this.comparisonTrackData,
            comparisonGpxParser: !!this.comparisonGpxParser,
            timeOverlap: this.timeOverlap,
            hasOverlap: this.timeOverlap?.hasOverlap
        });

        if (!this.map.loaded()) {
            this.map.on('load', () => this.setupComparisonLayers());
        } else {
            this.setupComparisonLayers();
        }

        // Initialize comparison marker position immediately
        this.updateComparisonPosition();
    }

    setupComparisonLayers() {
        if (!this.comparisonTrackData) return;

        // Add comparison trail line (different color)
        const comparisonCoordinates = this.comparisonTrackData.trackPoints.map(point => [point.lon, point.lat]);
        
        this.map.addSource('comparison-trail', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: comparisonCoordinates
                }
            }
        });

        this.map.addLayer({
            id: 'comparison-trail-line',
            type: 'line',
            source: 'comparison-trail',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': this.comparisonTrackColor, // Use dynamic color
                'line-width': 3,
                'line-opacity': 0.8
            }
        });

        // Add comparison completed trail (for progress)
        this.map.addSource('comparison-trail-completed', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: []
                }
            }
        });

        this.map.addLayer({
            id: 'comparison-trail-completed',
            type: 'line',
            source: 'comparison-trail-completed',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': this.comparisonTrackColor, // Use dynamic color
                'line-width': 4,
                'line-opacity': 1.0
            }
        });

        // Add comparison position marker
        const startPoint = comparisonCoordinates[0] || [0, 0];
        this.map.addSource('comparison-position', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: startPoint
                }
            }
        });

        this.map.addLayer({
            id: 'comparison-position-glow',
            type: 'circle',
            source: 'comparison-position',
            paint: {
                'circle-radius': 15 * this.markerSize,
                'circle-color': this.comparisonTrackColor,
                'circle-opacity': 0.3,
                'circle-blur': 1
            }
        });

        // Add comparison activity icon
        this.map.addSource('comparison-activity-icon', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {
                    icon: '🚴‍♀️', // Different icon for comparison
                    speedComparisonText: ''
                },
                geometry: {
                    type: 'Point',
                    coordinates: startPoint
                }
            }
        });

        try {
            this.map.addLayer({
                id: 'comparison-activity-icon',
                type: 'symbol',
                source: 'comparison-activity-icon',
                layout: {
                    'text-field': '🚴‍♀️',
                    'text-size': 20,
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                    'text-anchor': 'center'
                },
                paint: {
                    'text-color': '#FFFFFF',
                    'text-halo-color': '#000000',
                    'text-halo-width': 1
                }
            });
            console.log('✅ Comparison activity icon layer added');
        } catch (error) {
            console.warn('⚠️ Failed to add comparison activity icon layer:', error.message);
            // Continue without text layer - marker will still work
        }

        // Add speed comparison indicator
        this.map.addSource('comparison-speed-indicator', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {
                    speedComparisonText: ''
                },
                geometry: {
                    type: 'Point',
                    coordinates: startPoint
                }
            }
        });

        try {
            this.map.addLayer({
                id: 'comparison-speed-indicator',
                type: 'symbol',
                source: 'comparison-speed-indicator',
                layout: {
                    'text-field': ['get', 'speedComparisonText'],
                    'text-size': 12,
                    'text-offset': [0, -3.5], // Position below the main icon
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                    'text-anchor': 'center'
                },
                paint: {
                    'text-color': this.comparisonTrackColor,
                    'text-halo-color': '#FFFFFF',
                    'text-halo-width': 2
                }
            });
            console.log('✅ Comparison speed indicator layer added');
        } catch (error) {
            console.warn('⚠️ Failed to add comparison speed indicator layer:', error.message);
            // Continue without text layer
        }

        // Add track label for comparison track
        this.map.addSource('comparison-track-label', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {
                    label: (this.app?.trackCustomizations?.track2Name ?? 'Track 2')
                },
                geometry: {
                    type: 'Point',
                    coordinates: startPoint
                }
            }
        });

        try {
            const initialLabel = (this.app?.trackCustomizations?.track2Name ?? 'Track 2');
            const initialTrimmed = (initialLabel || '').trim();
            this.map.addLayer({
                id: 'comparison-track-label',
                type: 'symbol',
                source: 'comparison-track-label',
                layout: {
                    'text-field': initialTrimmed || 'Track 2',
                    'text-size': 10,
                    'text-offset': [0, 3.5], // Position above the marker
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                    'text-anchor': 'center',
                    'visibility': initialTrimmed ? 'visible' : 'none'
                },
                paint: {
                    'text-color': this.comparisonTrackColor,
                    'text-halo-color': '#FFFFFF',
                    'text-halo-width': 2
                }
            });
            console.log('✅ Comparison track label layer added');
        } catch (error) {
            console.warn('⚠️ Failed to add comparison track label layer:', error.message);
            // Continue without text layer
        }

        console.log('Comparison track layers added to map');
    }

    // --- Multiple overlapping tracks API ---
    addAdditionalComparisonTrack(trackData, { index, name, color, overlap } = {}) {
        console.log('🗺️ addAdditionalComparisonTrack called', { index, name, color, hasOverlap: !!overlap?.hasOverlap });
        try {
            if (!trackData || !trackData.trackPoints || trackData.trackPoints.length === 0) return;
            const idx = typeof index === 'number' ? index : (this.additionalComparisons?.length || 0);
            const idBase = `overlap-${idx}`;

            if (!this.additionalComparisons) this.additionalComparisons = [];
            const gpxParser = new GPXParser();
            gpxParser.trackPoints = trackData.trackPoints;
            gpxParser.stats = trackData.stats;
            const icons = ['🏃', '🚴', '🥾', '🏃‍♀️', '🚴‍♀️', '🚶', '🏇', '⛹️'];
            const entry = { index: idx, name: name || `Team ${idx + 1}`, color: color || '#3B82F6', gpxParser, trackData, overlap, icon: icons[idx % icons.length] };
            this.additionalComparisons[idx] = entry;
            console.log('🗺️ Overlap entry stored', entry);

            const coords = trackData.trackPoints.map(p => [p.lon, p.lat]);
            // Full trail
            this.map.addSource(`${idBase}-trail`, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } } });
            this.map.addLayer({ id: `${idBase}-trail-line`, type: 'line', source: `${idBase}-trail`, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': entry.color, 'line-width': 3, 'line-opacity': 0.8 } });

            // Completed trail
            this.map.addSource(`${idBase}-trail-completed`, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } } });
            this.map.addLayer({ id: `${idBase}-trail-completed`, type: 'line', source: `${idBase}-trail-completed`, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': entry.color, 'line-width': 4, 'line-opacity': 1.0 } });

            // Position + glow
            const start = coords[0] || [0, 0];
            this.map.addSource(`${idBase}-position`, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: start }, properties: {} } });
            this.map.addLayer({ id: `${idBase}-position-glow`, type: 'circle', source: `${idBase}-position`, paint: { 'circle-radius': 15 * this.markerSize, 'circle-color': entry.color, 'circle-opacity': 0.3, 'circle-blur': 1 } });

            // Label
            this.map.addSource(`${idBase}-label`, { type: 'geojson', data: { type: 'Feature', properties: { label: entry.name }, geometry: { type: 'Point', coordinates: start } } });
            this.map.addLayer({ id: `${idBase}-label`, type: 'symbol', source: `${idBase}-label`, layout: { 'text-field': entry.name || '', 'text-size': 10, 'text-offset': [0, 3.5], 'text-allow-overlap': true, 'text-ignore-placement': true, 'text-anchor': 'center', 'visibility': (entry.name || '').trim() ? 'visible' : 'none' }, paint: { 'text-color': entry.color, 'text-halo-color': '#FFFFFF', 'text-halo-width': 2 } });
            console.log('🗺️ Overlap layers added for', idBase);

            // Activity icon for this overlapping track
            this.map.addSource(`${idBase}-activity-icon`, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: { icon: entry.icon },
                    geometry: { type: 'Point', coordinates: start }
                }
            });
            try {
                this.map.addLayer({
                    id: `${idBase}-activity-icon`,
                    type: 'symbol',
                    source: `${idBase}-activity-icon`,
                    layout: {
                        'text-field': entry.icon,
                        'text-size': 18,
                        'text-allow-overlap': true,
                        'text-ignore-placement': true,
                        'text-anchor': 'center'
                    },
                    paint: {
                        'text-color': '#FFFFFF',
                        'text-halo-color': '#000000',
                        'text-halo-width': 1
                    }
                });
            } catch (e) {
                console.warn('Failed to add overlap activity icon layer', e);
            }
        } catch (e) {
            console.warn('Failed to add overlapping track layers:', e);
        }
    }

    updateAdditionalComparisonName(index, name) {
        const entry = this.additionalComparisons?.[index];
        if (!entry) return;
        entry.name = name;
        const base = `overlap-${index}`;
        const trimmed = (name || '').trim();
        if (this.map.getLayer(`${base}-label`)) {
            this.map.setLayoutProperty(`${base}-label`, 'visibility', trimmed ? 'visible' : 'none');
            if (trimmed) this.map.setLayoutProperty(`${base}-label`, 'text-field', trimmed);
        }
        const src = this.map.getSource(`${base}-label`);
        if (src) {
            const data = src._data;
            if (data?.features?.[0]) { data.features[0].properties.label = trimmed; src.setData(data); }
        }
    }

    updateAdditionalComparisonColor(index, color) {
        const entry = this.additionalComparisons?.[index];
        if (!entry) return;
        entry.color = color;
        const base = `overlap-${index}`;
        if (this.map.getLayer(`${base}-trail-line`)) this.map.setPaintProperty(`${base}-trail-line`, 'line-color', color);
        if (this.map.getLayer(`${base}-trail-completed`)) this.map.setPaintProperty(`${base}-trail-completed`, 'line-color', color);
        if (this.map.getLayer(`${base}-position-glow`)) this.map.setPaintProperty(`${base}-position-glow`, 'circle-color', color);
        if (this.map.getLayer(`${base}-label`)) this.map.setPaintProperty(`${base}-label`, 'text-color', color);
    }

    removeAdditionalComparisonTrack(index) {
        const base = `overlap-${index}`;
        const layers = [`${base}-label`, `${base}-activity-icon`, `${base}-position-glow`, `${base}-trail-completed`, `${base}-trail-line`];
        const sources = [`${base}-label`, `${base}-activity-icon`, `${base}-position`, `${base}-trail-completed`, `${base}-trail`];
        layers.forEach(id => { try { if (this.map.getLayer(id)) this.map.removeLayer(id); } catch(e){} });
        sources.forEach(id => { try { if (this.map.getSource(id)) this.map.removeSource(id); } catch(e){} });
        if (this.additionalComparisons) this.additionalComparisons[index] = null;
    }

    removeComparisonTrack() {
        if (!this.map.loaded()) return;

        const layersToRemove = [
            'comparison-activity-icon',
            'comparison-position-glow',
            'comparison-trail-completed',
            'comparison-trail-line',
            'comparison-speed-indicator',
            'comparison-track-label'
        ];

        const sourcesToRemove = [
            'comparison-activity-icon',
            'comparison-position',
            'comparison-trail-completed',
            'comparison-trail',
            'comparison-speed-indicator',
            'comparison-track-label'
        ];

        layersToRemove.forEach(layerId => {
            if (this.map.getLayer(layerId)) {
                this.map.removeLayer(layerId);
            }
        });

        sourcesToRemove.forEach(sourceId => {
            if (this.map.getSource(sourceId)) {
                this.map.removeSource(sourceId);
            }
        });

        this.comparisonTrackData = null;
        this.comparisonGpxParser = null;

        console.log('Comparison track removed from map');
    }

    updateComparisonPosition() {
        // Debug: Check why method might be returning early
        const hasTrackData = !!this.comparisonTrackData;
        const hasParser = !!this.comparisonGpxParser;

        // Allow updates even if map is in loading state, as long as map exists
        // The main marker works during loading, so comparison should too
        if (!hasTrackData || !hasParser) {
            return;
        }

        let comparisonProgress = this.animationProgress;

        // Enhanced time-synchronized animation for overlapping tracks
        if (this.timeOverlap && this.timeOverlap.hasOverlap) {
            comparisonProgress = this.calculateComparisonProgress();
        } else if (this.timeOverlap && this.timeOverlap.spatialOnly) {
            // For spatial-only comparison, use same progress as main track
            comparisonProgress = this.animationProgress;
        }

        const comparisonPoint = this.comparisonGpxParser.getInterpolatedPoint(comparisonProgress);

        if (!comparisonPoint || isNaN(comparisonPoint.lat) || isNaN(comparisonPoint.lon)) {
            return;
        }

        // Update comparison position marker with speed comparison data
        const speedData = this.calculateSpeedComparison(comparisonPoint);

        // Update all comparison layers
        try {
            // Position marker
            if (this.map.getSource('comparison-position')) {
                this.map.getSource('comparison-position').setData({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [comparisonPoint.lon, comparisonPoint.lat]
                    },
                    properties: {
                        elevation: comparisonPoint.elevation,
                        speed: comparisonPoint.speed,
                        distance: comparisonPoint.distance,
                        speedDifference: speedData.speedDifference,
                        isFaster: speedData.isFaster,
                        speedComparisonText: speedData.speedComparisonText
                    }
                });
            }

            // Activity icon
            if (this.map.getSource('comparison-activity-icon')) {
                this.map.getSource('comparison-activity-icon').setData({
                    type: 'Feature',
                    properties: {
                        icon: '🚴‍♀️',
                        speedComparisonText: speedData.speedComparisonText
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [comparisonPoint.lon, comparisonPoint.lat]
                    }
                });
            }

            // Speed indicator
            if (this.map.getSource('comparison-speed-indicator')) {
                this.map.getSource('comparison-speed-indicator').setData({
                    type: 'Feature',
                    properties: {
                        speedComparisonText: speedData.speedComparisonText
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [comparisonPoint.lon, comparisonPoint.lat]
                    }
                });
            }

            // Track label: update position and hide/show based on current name
            const labelText = (this.app?.trackCustomizations?.track2Name ?? '').trim();
            if (this.map.getSource('comparison-track-label')) {
                this.map.getSource('comparison-track-label').setData({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [comparisonPoint.lon, comparisonPoint.lat]
                    },
                    properties: {
                        label: labelText
                    }
                });
            }
            if (this.map.getLayer('comparison-track-label')) {
                if (!labelText) {
                    this.map.setLayoutProperty('comparison-track-label', 'visibility', 'none');
                } else {
                    this.map.setLayoutProperty('comparison-track-label', 'visibility', 'visible');
                    this.map.setLayoutProperty('comparison-track-label', 'text-field', labelText);
                }
            }

            // Completed trail
            if (this.map.getSource('comparison-trail-completed')) {
                const currentIndex = Math.floor(comparisonProgress * (this.comparisonTrackData.trackPoints.length - 1));
                const completedCoordinates = this.comparisonTrackData.trackPoints
                    .slice(0, currentIndex + 1)
                    .map(point => [point.lon, point.lat]);

                if (completedCoordinates.length > 1) {
                    completedCoordinates.push([comparisonPoint.lon, comparisonPoint.lat]);
                }

                this.map.getSource('comparison-trail-completed').setData({
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: completedCoordinates
                    }
                });
            }

        } catch (error) {
            console.error('❌ Error updating comparison layers:', error);
        }
    }

    updateAdditionalComparisons() {
        if (!this.additionalComparisons || this.additionalComparisons.length === 0) return;
        const mainProgress = this.animationProgress;
        const currentTimeMs = this.getTimeAtProgressMs(this.trackData, mainProgress);
        for (let i = 0; i < this.additionalComparisons.length; i++) {
            try {
                const entry = this.additionalComparisons[i];
                if (!entry) continue;
                const base = `overlap-${entry.index}`;
                const parser = entry.gpxParser;
                // Determine per-track progress from its own time window (independent pacing)
                let progress = mainProgress;
                if (typeof currentTimeMs === 'number') {
                    const { start, end } = this.getTrackTimeWindowMs(entry.trackData);
                    if (typeof start === 'number' && typeof end === 'number' && end > start) {
                        progress = Math.max(0, Math.min(1, (currentTimeMs - start) / (end - start)));
                    }
                }
                const pt = parser.getInterpolatedPoint(progress);
                if (!pt || isNaN(pt.lat) || isNaN(pt.lon)) continue;

                // Update position
                const posSrc = this.map.getSource(`${base}-position`);
                if (posSrc) {
                    posSrc.setData({ type: 'Feature', geometry: { type: 'Point', coordinates: [pt.lon, pt.lat] }, properties: {} });
                }

                // Update activity icon position
                const iconSrc = this.map.getSource(`${base}-activity-icon`);
                if (iconSrc) {
                    iconSrc.setData({ type: 'Feature', properties: { icon: entry.icon || '🏃' }, geometry: { type: 'Point', coordinates: [pt.lon, pt.lat] } });
                }

                // Update completed path
                const total = entry.trackData.trackPoints.length;
                const currentIndex = Math.floor(progress * (total - 1));
                const completedCoords = entry.trackData.trackPoints.slice(0, currentIndex + 1).map(p => [p.lon, p.lat]);
                if (completedCoords.length > 1) completedCoords.push([pt.lon, pt.lat]);
                const compSrc = this.map.getSource(`${base}-trail-completed`);
                if (compSrc) {
                    compSrc.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: completedCoords } });
                }

                // Update label
                const lblSrc = this.map.getSource(`${base}-label`);
                if (lblSrc) {
                    const labelText = (entry.name || '').trim();
                    lblSrc.setData({ type: 'Feature', properties: { label: labelText }, geometry: { type: 'Point', coordinates: [pt.lon, pt.lat] } });
                    if (this.map.getLayer(`${base}-label`)) {
                        this.map.setLayoutProperty(`${base}-label`, 'visibility', labelText ? 'visible' : 'none');
                        if (labelText) this.map.setLayoutProperty(`${base}-label`, 'text-field', labelText);
                    }
                }
            } catch (err) {
                console.warn('⚠️ updateAdditionalComparisons error for index', i, err);
            }
        }
    }

    // Calculate comparison track progress based on time synchronization
    calculateComparisonProgress() {
        // Use main track's interpolated timestamp
        const mainTrackData = this.trackData;
        if (!this.timeOverlap || !this.timeOverlap.hasOverlap || !mainTrackData?.trackPoints?.length) {
            return this.animationProgress;
        }

        const currentTime = this.getTimeAtProgressMs(mainTrackData, this.animationProgress);
        if (typeof currentTime !== 'number') {
            return this.animationProgress;
        }

        const compStart = this.timeOverlap.compStart.getTime();
        const compEnd = this.timeOverlap.compEnd.getTime();
        const compDuration = compEnd - compStart;
        if (compDuration <= 0) return 0;

        return Math.max(0, Math.min(1, (currentTime - compStart) / compDuration));
    }

    // Calculate speed comparison between main and comparison tracks
    calculateSpeedComparison(comparisonPoint) {
        // Default return if no comparison mode or spatial-only mode
        if (!this.comparisonMode) {
            return {
                speedDifference: 0,
                isFaster: false,
                speedComparisonText: ''
            };
        }

        // For spatial-only comparison, show basic info
        if (this.timeOverlap && this.timeOverlap.spatialOnly) {
            return {
                speedDifference: 0,
                isFaster: false,
                speedComparisonText: 'Spatial comparison'
            };
        }

        // Default return if no time overlap
        if (!this.timeOverlap || !this.timeOverlap.hasOverlap) {
            return {
                speedDifference: 0,
                isFaster: false,
                speedComparisonText: ''
            };
        }

        // Get current main track point to compare speeds
        const mainPoint = this.gpxParser.getInterpolatedPoint(this.animationProgress);

        if (!mainPoint || !mainPoint.speed || !comparisonPoint.speed) {
            return {
                speedDifference: 0,
                isFaster: false,
                speedComparisonText: ''
            };
        }

        const speedDifference = comparisonPoint.speed - mainPoint.speed;
        const isFaster = speedDifference > 0.5; // 0.5 km/h threshold to avoid minor fluctuations
        const isSlower = speedDifference < -0.5;

        let speedComparisonText = '';
        if (isFaster) {
            speedComparisonText = `+${speedDifference.toFixed(1)} km/h faster`;
        } else if (isSlower) {
            speedComparisonText = `${speedDifference.toFixed(1)} km/h slower`;
        } else {
            speedComparisonText = 'Similar pace';
        }

        return {
            speedDifference,
            isFaster: isFaster,
            isSlower: isSlower,
            speedComparisonText
        };
    }

    // Calculate center point for dual marker centering during comparison mode
    calculateDualMarkerCenter(mainPoint) {
        // If not in comparison mode or no time overlap, return main point
        if (!this.comparisonMode || !this.comparisonTrackData || !this.timeOverlap || !this.timeOverlap.hasOverlap) {
            return mainPoint;
        }

        // Get comparison track point
        const comparisonProgress = this.calculateComparisonProgress();
        const comparisonPoint = this.comparisonGpxParser.getInterpolatedPoint(comparisonProgress);

        if (!comparisonPoint || isNaN(comparisonPoint.lat) || isNaN(comparisonPoint.lon)) {
            return mainPoint;
        }

        // Calculate distance between points using Haversine formula
        const distance = this.calculateDistanceBetweenPoints(
            mainPoint.lat, mainPoint.lon,
            comparisonPoint.lat, comparisonPoint.lon
        );

        // If markers are close together (within 500 meters), center between them
        const centerThreshold = 0.5; // km
        if (distance <= centerThreshold) {
            console.log(`📍 Dual marker centering: ${distance.toFixed(2)}km apart`);

            return {
                lat: (mainPoint.lat + comparisonPoint.lat) / 2,
                lon: (mainPoint.lon + comparisonPoint.lon) / 2,
                elevation: (mainPoint.elevation + comparisonPoint.elevation) / 2,
                speed: (mainPoint.speed + comparisonPoint.speed) / 2,
                distance: (mainPoint.distance + comparisonPoint.distance) / 2,
                index: mainPoint.index
            };
        }

        // If markers are far apart, follow the main track
        return mainPoint;
    }

    // Calculate distance between two points using Haversine formula
    calculateDistanceBetweenPoints(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Convert degrees to radians
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Configure track colors for comparison mode
    setTrackColors(mainColor, comparisonColor) {
        this.mainTrackColor = mainColor || this.pathColor; // Use original path color as default
        this.comparisonTrackColor = comparisonColor || '#DC2626'; // Red

        console.log(`🎨 Track colors configured: Main=${this.mainTrackColor}, Comparison=${this.comparisonTrackColor}`);

        // Update existing layers if they exist
        if (this.map && this.map.getLayer('current-position-glow')) {
            this.map.setPaintProperty('current-position-glow', 'circle-color', this.mainTrackColor);
        }
        if (this.map && this.map.getLayer('comparison-position-glow')) {
            this.map.setPaintProperty('comparison-position-glow', 'circle-color', this.comparisonTrackColor);
        }
        if (this.map && this.map.getLayer('comparison-speed-indicator')) {
            this.map.setPaintProperty('comparison-speed-indicator', 'text-color', this.comparisonTrackColor);
        }
        if (this.map && this.map.getLayer('main-track-label')) {
            this.map.setPaintProperty('main-track-label', 'text-color', mainColor || this.pathColor);
        }
        if (this.map && this.map.getLayer('comparison-track-label')) {
            this.map.setPaintProperty('comparison-track-label', 'text-color', this.comparisonTrackColor);
        }

        // Update comparison track line colors (full trail and completed portion)
        if (this.map && this.map.getLayer('comparison-trail-line')) {
            this.map.setPaintProperty('comparison-trail-line', 'line-color', this.comparisonTrackColor);
        }
        if (this.map && this.map.getLayer('comparison-trail-completed')) {
            this.map.setPaintProperty('comparison-trail-completed', 'line-color', this.comparisonTrackColor);
        }

        // Update the pathColor used by other parts of the system
        if (mainColor) {
            this.pathColor = mainColor;
        }
    }

    // Update track label on the map
    updateTrackLabel(trackNumber, label) {
        const safeLabel = typeof label === 'string' ? label : '';
        console.log(`🏷️ Updating track ${trackNumber} label to: "${safeLabel}"`);

        try {
            if (trackNumber === 1) {
                // Update main track label
                if (this.map.getLayer('main-track-label')) {
                    this.map.setLayoutProperty('main-track-label', 'text-field', safeLabel || 'Track 1');
                }
                if (this.map.getSource('main-track-label')) {
                    const source = this.map.getSource('main-track-label');
                    const currentData = source._data;
                    if (currentData && currentData.features && currentData.features[0]) {
                        currentData.features[0].properties.label = safeLabel || 'Track 1';
                        source.setData(currentData);
                    }
                }
            } else if (trackNumber === 2) {
                const trimmed = safeLabel.trim();
                const layerId = 'comparison-track-label';
                // Hide or show based on label content
                if (this.map.getLayer(layerId)) {
                    if (!trimmed) {
                        this.map.setLayoutProperty(layerId, 'visibility', 'none');
                    } else {
                        this.map.setLayoutProperty(layerId, 'visibility', 'visible');
                        this.map.setLayoutProperty(layerId, 'text-field', trimmed);
                    }
                }
                if (this.map.getSource(layerId)) {
                    const source = this.map.getSource(layerId);
                    const currentData = source._data;
                    if (currentData && currentData.features && currentData.features[0]) {
                        currentData.features[0].properties.label = trimmed;
                        source.setData(currentData);
                    }
                }
            }
            console.log(`✅ Track ${trackNumber} label updated successfully`);
        } catch (error) {
            console.warn(`⚠️ Failed to update track ${trackNumber} label:`, error.message);
        }
    }
} 
