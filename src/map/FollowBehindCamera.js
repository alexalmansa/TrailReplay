
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

    // Exponential smoothing speeds (higher = faster response)
    BEARING_SMOOTH_SPEED: 8,      // Fast bearing response
    ZOOM_SMOOTH_SPEED: 3,         // Gradual zoom transitions
    PITCH_SMOOTH_SPEED: 2,        // Very slow pitch changes (rapid pitch is disorienting)

    // Bearing calculation
    BEARING_SAMPLE_POINTS: [0.01, 0.03, 0.05],  // Multi-point averaging distances
    BEARING_SAMPLE_WEIGHTS: [0.5, 0.3, 0.2],    // Closer = more weight

    // Terrain-aware settings
    BASE_ZOOM: 14,
    BASE_PITCH: 35,
    MIN_ZOOM: 10,
    MAX_ZOOM: 18,
    LOOK_AHEAD_SEGMENT: 0.08,        // % of track to sample ahead/behind for gradients (was 0.02)
    MIN_PITCH: 25,
    MAX_PITCH: 65,
    MAX_DYNAMIC_ZOOM_OUT: 3.0,       // was 1.2 - much more dynamic range
    MAX_DYNAMIC_PITCH_ADJUST: 12,    // was 8
    MAX_ZOOM_DROP_FROM_PRESET: 2.5,  // was 0.8 - allow zooming out much more on steep terrain
    MAX_ZOOM_GAIN_FROM_PRESET: 1.0,  // was 0.3 - allow zooming in on flat sections
    MAX_PITCH_DROP_FROM_PRESET: 10,  // was 6
    MAX_PITCH_GAIN_FROM_PRESET: 8,   // was 4
    ELEVATION_RISK_METERS: 800,      // was 1200 - start adjusting earlier
    STEEPNESS_RISK_FACTOR: 12        // was 18 - more responsive to slopes
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
        this.lastFrameTime = null; // For frame-rate independent smoothing
        const preset = this.getCurrentPresetSettings();
        this.followZoom = preset.ZOOM;
        this.followPitch = preset.PITCH;
    }

    /**
     * Frame-rate independent exponential smoothing.
     * speed: higher = faster response (~8 for bearing, ~3 for zoom, ~2 for pitch)
     * dt: delta time in seconds
     */
    smoothExp(current, target, speed, dt) {
        return current + (target - current) * (1 - Math.exp(-speed * dt));
    }

    /**
     * Angle-aware exponential smoothing for bearing (handles 359->1 wraparound)
     */
    smoothBearingExp(current, target, speed, dt) {
        let diff = target - current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        return ((current + diff * (1 - Math.exp(-speed * dt))) % 360 + 360) % 360;
    }
    
    /**
     * Get gpxParser from mapRenderer (always current)
     */
    get gpxParser() {
        return this.mapRenderer.gpxParser;
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
     * Update camera position during animation (called every frame)
     */
    updateCameraPosition() {
        if (!this.mapRenderer.trackData || !this.map) {
            return;
        }

        const currentPoint = this.gpxParser.getInterpolatedPoint(this.mapRenderer.animationProgress);
        if (!currentPoint || typeof currentPoint.lat === 'undefined' || typeof currentPoint.lon === 'undefined') {
            return;
        }

        // Compute delta time for frame-rate independent smoothing
        const now = performance.now();
        const dt = this.lastFrameTime ? Math.min((now - this.lastFrameTime) / 1000, 0.1) : 0.016; // Cap at 100ms, default ~60fps
        this.lastFrameTime = now;

        const preset = this.getCurrentPresetSettings();
        const progress = this.mapRenderer.animationProgress;

        // --- Bearing: multi-point weighted average with exponential smoothing ---
        this.targetBearing = this.calculateBearing(progress);
        const smoothedBearing = this.smoothBearingExp(
            this.lastBearing, this.targetBearing,
            FOLLOW_BEHIND_SETTINGS.BEARING_SMOOTH_SPEED, dt
        );

        // --- Terrain-aware zoom/pitch: calculated every frame, smoothed ---
        const terrainView = this.calculateTerrainAwareView(progress);
        let targetZoom = preset.ZOOM;
        let targetPitch = preset.PITCH;
        if (terrainView) {
            targetZoom = this.clampZoomToPreset(terrainView.zoom, preset.ZOOM);
            targetPitch = this.clampPitchToPreset(terrainView.pitch, preset.PITCH);
        }

        // Exponentially smooth zoom and pitch toward targets
        this.followZoom = this.smoothExp(this.followZoom, targetZoom, FOLLOW_BEHIND_SETTINGS.ZOOM_SMOOTH_SPEED, dt);
        this.followPitch = this.smoothExp(this.followPitch, targetPitch, FOLLOW_BEHIND_SETTINGS.PITCH_SMOOTH_SPEED, dt);

        // Preload upcoming tiles before moving the camera
        try {
            const pitch = this.followPitch;
            const bufferScale = 1.25 + Math.min(pitch, 60) / 120;
            this.mapRenderer.preloadTilesAtPosition(currentPoint.lat, currentPoint.lon, this.followZoom, this.mapRenderer.currentMapStyle, { bufferScale });
        } catch (_) {}

        // Use jumpTo for instant application - we handle all smoothing ourselves
        this.map.jumpTo({
            center: [currentPoint.lon, currentPoint.lat],
            zoom: this.followZoom,
            pitch: this.followPitch,
            bearing: smoothedBearing
        });

        this.updateMarkerScaleForZoom(this.calculateMarkerScale(this.followZoom));
        this.lastCameraZoom = this.followZoom;
        this.lastCameraPitch = this.followPitch;
        this.lastBearing = smoothedBearing;
    }
    
    /**
     * Calculate bearing using multi-point weighted average for smoother results.
     * Samples at multiple look-ahead distances and computes weighted average bearing.
     * Uses great-circle bearing for accuracy.
     */
    calculateBearing(progress) {
        if (!this.mapRenderer.trackData || !this.mapRenderer.trackData.trackPoints || this.mapRenderer.trackData.trackPoints.length < 2) {
            return 0;
        }

        const currentPoint = this.gpxParser.getInterpolatedPoint(progress);
        if (!currentPoint || typeof currentPoint.lat === 'undefined') {
            return this.lastBearing || 0;
        }

        const samplePoints = FOLLOW_BEHIND_SETTINGS.BEARING_SAMPLE_POINTS;
        const weights = FOLLOW_BEHIND_SETTINGS.BEARING_SAMPLE_WEIGHTS;

        // Accumulate weighted bearing using sin/cos to handle wraparound
        let sinSum = 0;
        let cosSum = 0;
        let totalWeight = 0;

        for (let i = 0; i < samplePoints.length; i++) {
            const aheadProgress = Math.min(progress + samplePoints[i], 1);
            const futurePoint = this.gpxParser.getInterpolatedPoint(aheadProgress);

            if (!futurePoint || typeof futurePoint.lat === 'undefined') continue;

            // Use great-circle bearing for accuracy
            const bearing = this.calculateBearingBetweenPoints(
                currentPoint.lat, currentPoint.lon,
                futurePoint.lat, futurePoint.lon
            );

            const rad = bearing * (Math.PI / 180);
            sinSum += Math.sin(rad) * weights[i];
            cosSum += Math.cos(rad) * weights[i];
            totalWeight += weights[i];
        }

        if (totalWeight === 0) {
            return this.lastBearing || 0;
        }

        const avgBearing = Math.atan2(sinSum / totalWeight, cosSum / totalWeight) * (180 / Math.PI);
        return (avgBearing + 360) % 360;
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
     * Update follow zoom/pitch targets based on terrain (used for initialization/preset changes)
     */
    updateFollowViewIfNeeded(progress, { force = false } = {}) {
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
        this.lastBearing = 0;
        this.lastElevation = 0;
        this.lastCameraZoom = FOLLOW_BEHIND_SETTINGS.BASE_ZOOM;
        this.lastCameraPitch = FOLLOW_BEHIND_SETTINGS.BASE_PITCH;
        this.lastFrameTime = null;
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
