
// Simplified Follow-Behind Camera Presets
const FOLLOW_BEHIND_PRESETS = {
    VERY_CLOSE: {
        ZOOM: 16,
        PITCH: 55,
        name: 'Very Close'
    },
    MEDIUM: {
        ZOOM: 14,
        PITCH: 35,
        name: 'Medium'
    },
    FAR: {
        ZOOM: 11,
        PITCH: 30,
        name: 'Far'
    }
};

// Simplified Follow-Behind Camera Settings
const FOLLOW_BEHIND_SETTINGS = {
    // Animation timing
    CINEMATIC_DURATION: 2000,   // Duration of cinematic zoom-in BEFORE animation starts (ms)
    ZOOM_OUT_DURATION: 5000,    // Duration of end-of-animation zoom-out (ms) - increased for stats visibility
    ZOOM_OUT_DELAY: 2000,       // Delay before zoom-out starts (ms) - increased for stats visibility
    
    // Camera movement smoothing
    CAMERA_UPDATE_DURATION: 100,  // Base duration for updates; increased in 3D for stability
    BEARING_SMOOTHING: 0.01,      // Bearing smoothing factor (0-1, lower = smoother)
    BEARING_LOOK_AHEAD: 0.05,     // How far ahead to look for bearing calculation
    
    // Terrain-aware settings
    BASE_ZOOM: 14,
    BASE_PITCH: 35,
    MIN_ZOOM: 10,
    MAX_ZOOM: 18,
    LOOK_AHEAD_SEGMENT: 0.02,        // % of track to sample ahead/behind for gradients
    MIN_PITCH: 25,
    MAX_PITCH: 65,
    MAX_DYNAMIC_ZOOM_OUT: 1.2,
    MAX_DYNAMIC_PITCH_ADJUST: 8,
    MAX_ZOOM_DROP_FROM_PRESET: 0.8,
    MAX_ZOOM_GAIN_FROM_PRESET: 0.3,
    MAX_PITCH_DROP_FROM_PRESET: 6,
    MAX_PITCH_GAIN_FROM_PRESET: 4,
    ELEVATION_RISK_METERS: 1200,
    STEEPNESS_RISK_FACTOR: 18
};

// Terrain constants for calculations
const TERRAIN_CONSTANTS = {
    ELEVATION_FACTOR_MAX: 2.0,
    EARTH_RADIUS_METERS: 6371000
};

const MARKER_SCALING = {
    BASE: 1.0,
    MIN: 0.4,
    MAX: 1.3,
    SENSITIVITY: 0.15,
    UPDATE_THRESHOLD: 0.05
};

export class FollowBehindCamera {
    constructor(mapRenderer) {
        this.mapRenderer = mapRenderer;
        // Don't store gpxParser - always get it from mapRenderer to ensure it's current
        
        // Simple state variables
        this.isInitialized = false;
        this.shouldTriggerCinematicStart = true;
        this.currentPreset = 'MEDIUM';
        this.lastBearing = 0;
        this.targetBearing = 0;
        const preset = this.getCurrentPresetSettings();
        this.followZoom = preset.ZOOM;
        this.followPitch = preset.PITCH;
    }
    
    /**
     * Get gpxParser from mapRenderer (always current)
     */
    get gpxParser() {
        return this.mapRenderer.gpxParser;
    }

    /**
     * Camera update duration, scaled for 3D to reduce tile churn
     */
    getCameraUpdateDuration() {
        const base = FOLLOW_BEHIND_SETTINGS.CAMERA_UPDATE_DURATION;
        return this.mapRenderer.is3DMode ? Math.round(base * 1.6) : base;
    }
    
    /**
     * Get the map instance (dynamic access since map is initialized after constructor)
     */
    get map() {
        return this.mapRenderer.map;
    }
    
    /**
     * Initialize the follow-behind camera mode
     */
    initialize() {
        console.log('🎬 FollowBehindCamera.initialize called');
        console.log('🎬 Checking prerequisites:', {
            hasTrackData: !!this.mapRenderer.trackData,
            hasMap: !!this.map,
            is3DMode: this.mapRenderer.is3DMode,
            alreadyInitialized: this.isInitialized
        });
        
        if (!this.mapRenderer.trackData || !this.map) {
            console.warn('🎬 Cannot initialize follow-behind camera: missing prerequisites');
            return;
        }
        
        // Prevent multiple initializations
        if (this.isInitialized) {
            console.log('🎬 Follow-behind camera already initialized, skipping');
            return;
        }
        
        console.log('🎬 Initializing follow-behind camera mode');
        this.isInitialized = true;
        
        // Enable 3D if not already enabled for better cinematic effect
        if (!this.mapRenderer.is3DMode) {
            console.log('🎬 Enabling 3D terrain for cinematic effect');
            this.mapRenderer.enable3DTerrain();
            
            // Wait longer for terrain to actually load
            this.waitForTerrainToLoad().then(() => {
                console.log('🎬 Terrain loaded, initializing terrain-aware settings');
                this.initializeTerrainAwareSettings();
                this.setStartingPosition();
            });
        } else {
            // 3D already enabled, set position immediately
            setTimeout(() => {
                this.initializeTerrainAwareSettings();
                this.setStartingPosition();
            }, 500);
        }
        
        console.log('🎬 Follow-behind camera mode initialized');
    }
    
    /**
     * Start the cinematic zoom-in sequence BEFORE trail animation
     */
    async startCinematicSequence() {
        if (!this.mapRenderer.trackData || !this.map) {
            console.warn('🎬 Cannot start cinematic sequence: missing trackData or map');
            return Promise.resolve();
        }

        console.log('🎬 Starting pre-animation zoom-in sequence');

        // Ensure gpxParser is available
        if (!this.gpxParser) {
            console.warn('🎬 Cannot start cinematic sequence: gpxParser not available');
            return Promise.resolve();
        }

        // Get start point (marker should be at position 0 before animation starts)
        const startPoint = this.gpxParser.getInterpolatedPoint(0);
        if (!startPoint || typeof startPoint.lat === 'undefined' || typeof startPoint.lon === 'undefined') {
            console.warn('🎬 No valid start point available');
            return Promise.resolve();
        }
        

        this.updateFollowViewIfNeeded(0, { force: true });
        const preset = this.getCurrentPresetSettings();
        const targetZoom = this.followZoom || preset.ZOOM;
        const targetPitch = this.followPitch || preset.PITCH;
        const startElevation = typeof startPoint.elevation === 'number' ? startPoint.elevation : 0;
        console.log(`🎬 Terrain-aware cinematic target: zoom=${targetZoom.toFixed(1)}, pitch=${targetPitch.toFixed(1)}, elevation=${startElevation.toFixed(0)}m`);
        this.lastCameraZoom = targetZoom;
        this.lastCameraPitch = targetPitch;
        this.lastElevation = startElevation;

        // Get current map state (zoom, pitch, bearing)
        const currentZoom = this.map.getZoom();
        const currentPitch = this.map.getPitch();
        const currentBearing = this.map.getBearing();
        const currentCenter = this.map.getCenter();

        // Calculate bearing for start position
        const bearing = this.calculateBearing(0);
        this.lastBearing = bearing;

        console.log(`🎬 Starting smooth zoom from current zoom ${currentZoom.toFixed(1)} to ${preset.name}: zoom=${targetZoom.toFixed(1)}, pitch=${targetPitch.toFixed(1)}° (${FOLLOW_BEHIND_SETTINGS.CINEMATIC_DURATION/1000}s)`);

        // Proactively preload tiles for the target view to avoid white flashes
        try {
            const pitch = this.map.getPitch();
            const bufferScale = 1.3 + Math.min(pitch, 60) / 120; // ~1.3..1.8
            this.mapRenderer.preloadTilesAtPosition(startPoint.lat, startPoint.lon, targetZoom, this.mapRenderer.currentMapStyle, { bufferScale });
        } catch (_) {}

        // Return promise that resolves when zoom-in completes
        return new Promise((resolve) => {
            // Give the preloading a short head start
            setTimeout(() => {
            // Smooth transition from current position to animation position with elevation-adjusted zoom
            this.map.easeTo({
                center: [startPoint.lon, startPoint.lat],
                zoom: targetZoom,
                pitch: targetPitch,
                bearing: bearing,
                duration: FOLLOW_BEHIND_SETTINGS.CINEMATIC_DURATION,
                easing: (t) => 1 - Math.pow(1 - t, 3) // Smooth ease-out cubic
            });
            }, 120);

            // Resolve when zoom-in completes
            setTimeout(() => {
                console.log('🎬 Pre-animation zoom-in completed, ready to start trail animation');
                // After cinematic zoom, stay near the safe zoom but allow user preset bias
                this.followZoom = targetZoom;
                this.followPitch = targetPitch;
                this.forceZoomRefresh([startPoint.lon, startPoint.lat], targetZoom, targetPitch, bearing);
                resolve();
            }, FOLLOW_BEHIND_SETTINGS.CINEMATIC_DURATION);
        });
    }
    
    /**
     * Update camera position during animation
     */
    updateCameraPosition() {
        if (!this.mapRenderer.trackData || !this.map) {
            return;
        }
        
        const currentPoint = this.gpxParser.getInterpolatedPoint(this.mapRenderer.animationProgress);
        if (!currentPoint || typeof currentPoint.lat === 'undefined' || typeof currentPoint.lon === 'undefined') {
            return;
        }
        
        const preset = this.getCurrentPresetSettings();

        // Calculate target bearing
        this.targetBearing = this.calculateBearing(this.mapRenderer.animationProgress);
        
        // Smooth the bearing transition
        const bearingDiff = this.targetBearing - this.lastBearing;
        let smoothedBearing;
        
        // Handle bearing wraparound (0/360 degrees)
        if (Math.abs(bearingDiff) > 180) {
            if (bearingDiff > 0) {
                smoothedBearing = this.lastBearing + (bearingDiff - 360) * FOLLOW_BEHIND_SETTINGS.BEARING_SMOOTHING;
            } else {
                smoothedBearing = this.lastBearing + (bearingDiff + 360) * FOLLOW_BEHIND_SETTINGS.BEARING_SMOOTHING;
            }
        } else {
            smoothedBearing = this.lastBearing + bearingDiff * FOLLOW_BEHIND_SETTINGS.BEARING_SMOOTHING;
        }
        
        // Normalize bearing to 0-360 range
        smoothedBearing = ((smoothedBearing % 360) + 360) % 360;
        
        // Preload upcoming tiles before moving the camera
        try {
            const pitch = this.map.getPitch();
            const bufferScale = 1.25 + Math.min(pitch, 60) / 120; // scale with pitch for horizon coverage
            this.mapRenderer.preloadTilesAtPosition(currentPoint.lat, currentPoint.lon, this.followZoom || preset.ZOOM, this.mapRenderer.currentMapStyle, { bufferScale });
        } catch (_) {}

        // Use smooth easeTo instead of instant jumpTo for smoother movement
        this.map.easeTo({
            center: [currentPoint.lon, currentPoint.lat],
            zoom: this.followZoom || preset.ZOOM,
            pitch: this.followPitch || preset.PITCH,
            bearing: smoothedBearing,
            duration: this.getCameraUpdateDuration(),
            easing: (t) => t * (2 - t) // Smooth easing function (ease-out)
        });
        
        this.updateMarkerScaleForZoom(this.calculateMarkerScale(this.followZoom || preset.ZOOM));
        this.lastCameraZoom = this.followZoom || preset.ZOOM;
        this.lastCameraPitch = this.followPitch || preset.PITCH;
        this.lastBearing = smoothedBearing;
    }
    
    /**
     * Calculate simple bearing based on movement direction
     */
    calculateBearing(progress) {
        if (!this.mapRenderer.trackData || !this.mapRenderer.trackData.trackPoints || this.mapRenderer.trackData.trackPoints.length < 2) {
            return 0;
        }
        
        // Look ahead for direction
        const lookAheadProgress = Math.min(progress + FOLLOW_BEHIND_SETTINGS.BEARING_LOOK_AHEAD, 1);
        const currentPoint = this.gpxParser.getInterpolatedPoint(progress);
        const futurePoint = this.gpxParser.getInterpolatedPoint(lookAheadProgress);
        
        if (!currentPoint || !futurePoint || 
            typeof currentPoint.lat === 'undefined' || typeof futurePoint.lat === 'undefined') {
            return this.lastBearing || 0;
        }
        
        // Simple bearing calculation
        const deltaLon = futurePoint.lon - currentPoint.lon;
        const deltaLat = futurePoint.lat - currentPoint.lat;
        
        const bearing = Math.atan2(deltaLon, deltaLat) * (180 / Math.PI);
        return bearing;
    }
    
    /**
     * Set the starting overview position
     */
    setStartingPosition(instant = false) {
        if (!this.mapRenderer.trackData || !this.map) {
            console.warn('🎬 Cannot set starting position: missing data');
            return;
        }
        
        const startPoint = this.gpxParser.getInterpolatedPoint(0);
        if (!startPoint || typeof startPoint.lat === 'undefined' || typeof startPoint.lon === 'undefined') {
            console.warn('🎬 No valid start point available');
            return;
        }
        
        // Simple overview position
        const overviewZoom = 6; // Simple wide overview
        
        if (instant) {
            this.map.jumpTo({
                center: [startPoint.lon, startPoint.lat],
                zoom: overviewZoom,
                pitch: 0,
                bearing: 0
            });
        } else {
            this.map.easeTo({
                center: [startPoint.lon, startPoint.lat],
                zoom: overviewZoom,
                pitch: 0,
                bearing: 0,
                duration: 1000,
                easing: (t) => 1 - Math.pow(1 - t, 2) // Smooth ease-out quadratic
            });
        }
        
        console.log('🎬 Starting position set');
    }
    

    
    /**
     * Zoom out to show the whole track at the end of animation
     */
    zoomOutToWholeTrack() {
        if (!this.mapRenderer.trackData || !this.map) {
            console.warn('🎬 Cannot zoom out to whole track: missing data');
            return;
        }
        
        console.log('🎬 Zooming out to show whole track');
        
        if (this.mapRenderer.trackData.bounds) {
            const fitOptions = {
                padding: 150,  // Increased padding to ensure complete track visibility
                duration: FOLLOW_BEHIND_SETTINGS.ZOOM_OUT_DURATION,
                pitch: 45, // Maintain 3D perspective
                bearing: 0, // Reset bearing to north-up
                maxZoom: 12, // Limit max zoom to ensure entire track is visible
                easing: (t) => 1 - Math.pow(1 - t, 2) // Smooth ease-out quadratic
            };
            
            this.map.fitBounds([
                [this.mapRenderer.trackData.bounds.west, this.mapRenderer.trackData.bounds.south],
                [this.mapRenderer.trackData.bounds.east, this.mapRenderer.trackData.bounds.north]
            ], fitOptions);
            
            console.log('🎬 Zoom-out to whole track completed');
        } else {
            console.warn('🎬 No track bounds available for zoom-out');
        }
    }
    
    /**
     * Initialize terrain-aware settings
     */
    initializeTerrainAwareSettings() {
        console.log('🎬 Initializing terrain-aware camera settings');
        
        if (!this.mapRenderer.ensureGPXParserReady()) {
            console.warn('🎬 Cannot initialize terrain-aware settings: GPX parser not ready');
            return;
        }
        
        const startPoint = this.gpxParser.getInterpolatedPoint(0);
        if (!startPoint || typeof startPoint.lat === 'undefined') {
            console.warn('🎬 No valid start point available for terrain initialization');
            return;
        }
        
        this.updateFollowViewIfNeeded(0, { force: true });
        
        // Initialize the tracking variables with consistent values
        this.lastCameraZoom = this.followZoom;
        this.lastCameraPitch = this.followPitch;
        this.lastElevation = typeof startPoint.elevation === 'number' ? startPoint.elevation : 0;
        
        console.log(`🎬 Initialized terrain-aware settings: zoom=${this.followZoom.toFixed(1)}, pitch=${this.followPitch.toFixed(1)}, elevation=${this.lastElevation.toFixed(0)}m`);
        
        // Don't update camera position here - let fitBounds show the route overview
        // The cinematic sequence will apply these settings when animation starts
    }

    /**
     * Update follow zoom/pitch targets based on terrain while keeping motion smooth
     */
    updateFollowViewIfNeeded(progress, { force = false } = {}) {
        if (!force) {
            return;
        }
        
        const safeProgress = typeof progress === 'number' ? Math.min(Math.max(progress, 0), 1) : 0;
        const preset = this.getCurrentPresetSettings();
        const view = this.calculateTerrainAwareView(safeProgress) || { zoom: preset.ZOOM, pitch: preset.PITCH };
        
        this.followZoom = this.clampZoomToPreset(view.zoom, preset.ZOOM);
        this.followPitch = this.clampPitchToPreset(view.pitch, preset.PITCH);
    }

    /**
     * Calculate a terrain-aware camera suggestion for a given progress
     */
    calculateTerrainAwareView(progress) {
        if (!this.mapRenderer.trackData || !this.gpxParser) {
            return null;
        }

        const currentPoint = this.gpxParser.getInterpolatedPoint(progress);
        if (!currentPoint || typeof currentPoint.lat === 'undefined' || typeof currentPoint.lon === 'undefined') {
            return null;
        }

        const preset = this.getCurrentPresetSettings();
        const baseZoom = preset?.ZOOM ?? FOLLOW_BEHIND_PRESETS.MEDIUM.ZOOM;
        const basePitch = preset?.PITCH ?? FOLLOW_BEHIND_PRESETS.MEDIUM.PITCH;
        const currentElevation = Math.max(0, typeof currentPoint.elevation === 'number' ? currentPoint.elevation : 0);
        
        const lookAheadProgress = Math.min(progress + FOLLOW_BEHIND_SETTINGS.LOOK_AHEAD_SEGMENT, 1);
        const lookBehindProgress = Math.max(progress - FOLLOW_BEHIND_SETTINGS.LOOK_AHEAD_SEGMENT, 0);
        const futurePoint = this.gpxParser.getInterpolatedPoint(lookAheadProgress);
        const pastPoint = this.gpxParser.getInterpolatedPoint(lookBehindProgress);
        
        let elevationChange = 0;
        let slope = 0;
        
        if (futurePoint && pastPoint && typeof futurePoint.elevation === 'number' && typeof pastPoint.elevation === 'number') {
            elevationChange = futurePoint.elevation - pastPoint.elevation;
            const distance = this.calculateDistanceBetweenPoints(
                pastPoint.lat, pastPoint.lon,
                futurePoint.lat, futurePoint.lon
            );
            slope = distance > 0 ? Math.abs(elevationChange) / distance : 0;
        }
        
        const elevationRisk = Math.min(currentElevation / FOLLOW_BEHIND_SETTINGS.ELEVATION_RISK_METERS, 1);
        const steepnessRisk = Math.min(slope * FOLLOW_BEHIND_SETTINGS.STEEPNESS_RISK_FACTOR, 1);
        const combinedRisk = Math.max(elevationRisk, steepnessRisk);
        
        const zoomOffset = combinedRisk * FOLLOW_BEHIND_SETTINGS.MAX_DYNAMIC_ZOOM_OUT;
        let adjustedZoom = baseZoom - zoomOffset;
        adjustedZoom = Math.max(FOLLOW_BEHIND_SETTINGS.MIN_ZOOM, Math.min(FOLLOW_BEHIND_SETTINGS.MAX_ZOOM, adjustedZoom));
        
        let adjustedPitch = basePitch - (combinedRisk * FOLLOW_BEHIND_SETTINGS.MAX_DYNAMIC_PITCH_ADJUST);
        if (elevationChange < -25) {
            adjustedPitch = Math.min(adjustedPitch + 6, FOLLOW_BEHIND_SETTINGS.MAX_PITCH);
        } else if (elevationChange > 35) {
            adjustedPitch = Math.max(FOLLOW_BEHIND_SETTINGS.MIN_PITCH, adjustedPitch - 4);
        }
        adjustedPitch = Math.max(FOLLOW_BEHIND_SETTINGS.MIN_PITCH, Math.min(FOLLOW_BEHIND_SETTINGS.MAX_PITCH, adjustedPitch));
        
        return {
            zoom: adjustedZoom,
            pitch: adjustedPitch,
            elevation: currentElevation
        };
    }

    lerp(start, end, alpha) {
        if (typeof start !== 'number') {
            return end;
        }
        return start + (end - start) * alpha;
    }

    clampZoomToPreset(value, presetZoom) {
        const minZoom = Math.max(FOLLOW_BEHIND_SETTINGS.MIN_ZOOM, presetZoom - FOLLOW_BEHIND_SETTINGS.MAX_ZOOM_DROP_FROM_PRESET);
        const maxZoom = Math.min(FOLLOW_BEHIND_SETTINGS.MAX_ZOOM, presetZoom + FOLLOW_BEHIND_SETTINGS.MAX_ZOOM_GAIN_FROM_PRESET);
        return Math.max(minZoom, Math.min(maxZoom, value));
    }

    clampPitchToPreset(value, presetPitch) {
        const minPitch = Math.max(FOLLOW_BEHIND_SETTINGS.MIN_PITCH, presetPitch - FOLLOW_BEHIND_SETTINGS.MAX_PITCH_DROP_FROM_PRESET);
        const maxPitch = Math.min(FOLLOW_BEHIND_SETTINGS.MAX_PITCH, presetPitch + FOLLOW_BEHIND_SETTINGS.MAX_PITCH_GAIN_FROM_PRESET);
        return Math.max(minPitch, Math.min(maxPitch, value));
    }

    /**
     * Work around a MapLibre quirk where the first zoom after enabling terrain sometimes ignores elevation
     * until the user nudges the zoom manually. We emulate that tiny nudge programmatically right after
     * the cinematic completes so the camera always stabilizes at the correct altitude.
     */
    forceZoomRefresh(center, zoom, pitch, bearing) {
        if (!this.map || !center) {
            return;
        }
        
        const delta = 0.001;
        try {
            this.map.jumpTo({
                center,
                zoom: zoom + delta,
                pitch,
                bearing
            });
            this.map.jumpTo({
                center,
                zoom,
                pitch,
                bearing
            });
        } catch (error) {
            console.warn('🎬 FollowBehindCamera: forceZoomRefresh failed', error);
        }
    }

    /**
     * Determine marker scale for the current zoom
     */
    calculateMarkerScale(currentZoom) {
        const baseZoom = FOLLOW_BEHIND_SETTINGS.BASE_ZOOM;
        const zoomDifference = currentZoom - baseZoom;
        let markerScale = MARKER_SCALING.BASE - (zoomDifference * MARKER_SCALING.SENSITIVITY);
        markerScale = Math.max(MARKER_SCALING.MIN, Math.min(MARKER_SCALING.MAX, markerScale));
        return markerScale;
    }
    
    /**
     * Calculate bearing between two points
     */
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
    
    /**
     * Calculate distance between two points
     */
    calculateDistanceBetweenPoints(lat1, lon1, lat2, lon2) {
        const R = TERRAIN_CONSTANTS.EARTH_RADIUS_METERS / 1000; // Convert to kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c * 1000; // Return distance in meters
    }
    
    /**
     * Smooth bearing transitions to avoid jerky movement
     */
    smoothBearing(currentBearing, targetBearing) {
        // Handle bearing wrapping (e.g., 350° -> 10°)
        let diff = targetBearing - currentBearing;
        
        if (diff > 180) {
            diff -= 360;
        } else if (diff < -180) {
            diff += 360;
        }
        
        // Apply smoothing
        const smoothedBearing = currentBearing + (diff * FOLLOW_BEHIND_SETTINGS.SMOOTHING);
        return (smoothedBearing + 360) % 360; // Normalize to 0-360
    }
    
    /**
     * Update marker scale based on zoom level
     */
    updateMarkerScaleForZoom(targetScale) {
        // Store the original marker size if not already stored
        if (!this.originalMarkerSize) {
            this.originalMarkerSize = this.mapRenderer.markerSize;
        }
        
        // Calculate the adjusted marker size
        const adjustedSize = this.originalMarkerSize * targetScale;
        
        // Only update if the change is significant to avoid constant updates
        if (Math.abs(this.mapRenderer.markerSize - adjustedSize) > MARKER_SCALING.UPDATE_THRESHOLD) {
            this.mapRenderer.markerSize = adjustedSize;
            
            // Force marker icon regeneration with new size
            this.mapRenderer.createAndAddActivityIcon();
            
            // Update activity icon layer if it exists
            if (this.map.getLayer('activity-icon-layer')) {
                this.mapRenderer.forceIconUpdate();
            }
        }
    }
    
    /**
     * Wait for terrain to load
     */
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
    
    /**
     * Reset the camera state for new track or mode switch
     */
    reset() {
        this.isInitialized = false;
        this.shouldTriggerCinematicStart = true;
        this.lastCameraBearing = 0;
        this.lastElevation = 0;
        this.lastCameraZoom = FOLLOW_BEHIND_SETTINGS.BASE_ZOOM;
        this.lastCameraPitch = FOLLOW_BEHIND_SETTINGS.BASE_PITCH;
        this.originalMarkerSize = null;
        const preset = this.getCurrentPresetSettings();
        this.followZoom = preset.ZOOM;
        this.followPitch = preset.PITCH;
        console.log('🎬 FollowBehindCamera reset completed');
    }
    
    /**
     * Get the delay before zoom-out starts
     */
    getZoomOutDelay() {
        return FOLLOW_BEHIND_SETTINGS.ZOOM_OUT_DELAY;
    }
    
    /**
     * Check if cinematic start should be triggered
     */
    shouldTriggerCinematic() {
        return this.shouldTriggerCinematicStart;
    }
    
    /**
     * Set the cinematic start flag
     */
    setCinematicStart(value) {
        this.shouldTriggerCinematicStart = value;
    }
    
    /**
     * Get current preset settings
     */
    getCurrentPresetSettings() {
        return FOLLOW_BEHIND_PRESETS[this.currentPreset] || FOLLOW_BEHIND_PRESETS.MEDIUM;
    }
    
    /**
     * Set follow-behind zoom preset
     */
    setZoomPreset(presetName) {
        if (FOLLOW_BEHIND_PRESETS[presetName]) {
            this.currentPreset = presetName;
            console.log(`🎬 Follow-behind zoom preset changed to: ${FOLLOW_BEHIND_PRESETS[presetName].name}`);
            this.followZoom = FOLLOW_BEHIND_PRESETS[presetName].ZOOM;
            this.followPitch = FOLLOW_BEHIND_PRESETS[presetName].PITCH;
            const progress = this.mapRenderer?.animationProgress ?? 0;
            this.updateFollowViewIfNeeded(progress, { force: true });
        }
    }
    
    /**
     * Get all available presets
     */
    getAvailablePresets() {
        return Object.keys(FOLLOW_BEHIND_PRESETS).map(key => ({
            key: key,
            name: FOLLOW_BEHIND_PRESETS[key].name
        }));
    }
    
    /**
     * Get cinematic duration for video export timing
     */
    getCinematicDuration() {
        const baseDuration = FOLLOW_BEHIND_SETTINGS.CINEMATIC_DURATION;
        const animationSpeed = this.mapRenderer.getAnimationSpeed ? this.mapRenderer.getAnimationSpeed() : 1.0;

        // Scale duration by animation speed for video export consistency
        // If animation runs at 0.5x speed, zoom effects should also be 2x slower
        const speedMultiplier = 1.0 / Math.max(animationSpeed, 0.1);

        console.log(`🎬 FollowBehindCamera: Scaling cinematic duration by ${speedMultiplier}x (${baseDuration}ms → ${baseDuration * speedMultiplier}ms)`);

        return baseDuration * speedMultiplier;
    }

    /**
     * Get zoom-out duration for video export timing
     */
    getZoomOutDuration() {
        const baseDuration = FOLLOW_BEHIND_SETTINGS.ZOOM_OUT_DURATION;
        const animationSpeed = this.mapRenderer.getAnimationSpeed ? this.mapRenderer.getAnimationSpeed() : 1.0;

        // Scale duration by animation speed for video export consistency
        const speedMultiplier = 1.0 / Math.max(animationSpeed, 0.1);

        console.log(`🎬 FollowBehindCamera: Scaling zoom-out duration by ${speedMultiplier}x (${baseDuration}ms → ${baseDuration * speedMultiplier}ms)`);

        return baseDuration * speedMultiplier;
    }
    
    /**
     * Start cinematic sequence for video export (uses fixed overview starting position)
     * This method is specifically for video export to ensure consistent timing
     */
    async startCinematicSequenceForVideoExport() {
        if (!this.mapRenderer.trackData || !this.map) {
            console.warn('🎬 Cannot start cinematic sequence for video export: missing trackData or map');
            return Promise.resolve();
        }

        console.log('🎬 Starting pre-animation zoom-in sequence for video export');

        // Ensure gpxParser is available
        if (!this.gpxParser) {
            console.warn('🎬 Cannot start cinematic sequence for video export: gpxParser not available');
            return Promise.resolve();
        }

        // Get start point (marker should be at position 0 before animation starts)
        const startPoint = this.gpxParser.getInterpolatedPoint(0);
        if (!startPoint || typeof startPoint.lat === 'undefined' || typeof startPoint.lon === 'undefined') {
            console.warn('🎬 No valid start point available for video export');
            return Promise.resolve();
        }
        

        // For video export, always start from a fixed overview position for consistent timing
        console.log('🎬 Setting fixed overview starting position for video export');
        this.map.jumpTo({
            center: [startPoint.lon, startPoint.lat],
            zoom: 5,  // Fixed overview for consistent video export timing
            pitch: 0,
            bearing: 0
        });

        const preset = this.getCurrentPresetSettings();
        this.updateFollowViewIfNeeded(0, { force: true });

        const targetZoom = this.followZoom || preset.ZOOM;
        const targetPitch = this.followPitch || preset.PITCH;
        const startElevation = typeof startPoint.elevation === 'number' ? startPoint.elevation : 0;
        console.log(`🎬 Video export terrain-aware target: zoom=${targetZoom.toFixed(1)}, pitch=${targetPitch.toFixed(1)}, elevation=${startElevation.toFixed(0)}m`);
        this.lastCameraZoom = targetZoom;
        this.lastCameraPitch = targetPitch;
        this.lastElevation = startElevation;

        // Calculate bearing for start position
        const bearing = this.calculateBearing(0);
        this.lastBearing = bearing;

        console.log(`🎬 Video export: zooming from overview (zoom 5) to ${preset.name}: zoom=${targetZoom.toFixed(1)}, pitch=${targetPitch.toFixed(1)}° (${FOLLOW_BEHIND_SETTINGS.CINEMATIC_DURATION/1000}s)`);

        // Preload tiles for target zoom and DEM if needed
        try {
            const pitch = this.map.getPitch();
            const bufferScale = 1.3 + Math.min(pitch, 60) / 120;
            this.mapRenderer.preloadTilesAtPosition(startPoint.lat, startPoint.lon, targetZoom, this.mapRenderer.currentMapStyle, { bufferScale });
        } catch (_) {}

        // Return promise that resolves when zoom-in completes
        return new Promise((resolve) => {
            // Small delay to ensure the overview position is set, then zoom-in with elevation-adjusted zoom
            setTimeout(() => {
                this.map.easeTo({
                    center: [startPoint.lon, startPoint.lat],
                    zoom: targetZoom,
                    pitch: targetPitch,
                    bearing: bearing,
                    duration: FOLLOW_BEHIND_SETTINGS.CINEMATIC_DURATION,
                    easing: (t) => 1 - Math.pow(1 - t, 3) // Smooth ease-out cubic
                });

                // Resolve when zoom-in completes
                setTimeout(() => {
                    console.log('🎬 Video export: pre-animation zoom-in completed, ready to start trail animation');
                    this.followZoom = targetZoom;
                    this.followPitch = targetPitch;
                    this.forceZoomRefresh([startPoint.lon, startPoint.lat], targetZoom, targetPitch, bearing);
                    resolve();
                }, FOLLOW_BEHIND_SETTINGS.CINEMATIC_DURATION);
            }, 100); // Short delay to ensure overview position is applied
        });
    }
}
