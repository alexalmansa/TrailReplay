/**
 * MapRenderer - Main map rendering class (refactored for modularity)
 */
import { MapManager } from './MapManager.js';
import { TrackManager } from './TrackManager.js';
import { AnimationController } from './AnimationController.js';
import { UIMapController } from './UIMapController.js';
import { HeartRateController } from './HeartRateController.js';
import maplibregl from 'maplibre-gl';
import { GPXParser } from '../gpxParser.js';
import { MapUtils } from './MapUtils.js';
import { MapAnnotations } from './MapAnnotations.js';
import { MapIconChanges } from './MapIconChanges.js';
import { MapPictureAnnotations } from './MapPictureAnnotations.js';
import { CameraController } from './CameraController.js';
import { DEFAULT_SETTINGS } from '../utils/constants.js';
import { heartRateColorMapper } from '../utils/heartRateColors.js';
import { TerrainController } from './TerrainController.js';
import { ComparisonController } from './ComparisonController.js';
import { StatsController } from './StatsController.js';
import { FollowBehindCamera } from './FollowBehindCamera.js';
// TODO: Import other modules as they are created

export class MapRenderer {
    constructor(container, app = null) {
        this.container = container;
        this.app = app;

        this.mapManager = new MapManager(container, this);
        this.map = this.mapManager.map;

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
        this.showTrackLabel = false; // Hide "Track 1" letters by default

        this.comparisonController = new ComparisonController(this);
        this.statsController = new StatsController(this);
        this.currentIcon = '🏃‍♂️';
        this.userSelectedBaseIcon = null; // Stores user's custom base icon choice
        this.trackManager = new TrackManager(this);
        this.gpxParser = this.trackManager.gpxParser;

        // Segment-aware animation properties
        this.segmentTimings = null;
        this.currentSegmentIndex = 0;
        this.segmentProgress = 0;
        this.lastAnimationTime = 0;
        this.journeyElapsedTime = 0;

        // Camera mode properties
        this.cameraMode = 'followBehind'; // 'standard' or 'followBehind' - followBehind is default

        // Performance mode for video recording
        this.performanceMode = false;

        // Initialize modular components AFTER other properties are set
        this.annotations = new MapAnnotations(this);
        this.iconChanges = new MapIconChanges(this);
        this.pictureAnnotations = new MapPictureAnnotations(this);
        this.cameraController = new CameraController(this);
        this.animationController = new AnimationController(this);
        this.uiMapController = new UIMapController(this);
        this.heartRateController = new HeartRateController(this);
        this.terrainController = new TerrainController(this);
        this.followBehindCamera = new FollowBehindCamera(this);

        // Ensure proper method binding for icon changes
        if (this.iconChanges && typeof this.iconChanges.checkIconChanges === 'function') {
            // Explicitly bind the method to ensure it's available
            this.iconChanges.checkIconChanges = this.iconChanges.checkIconChanges.bind(this.iconChanges);
        }

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

    // Delegated Terrain Methods
    enable3DTerrain() {
        this.terrainController.enable3DTerrain();
    }

    disable3DTerrain() {
        this.terrainController.disable3DTerrain();
    }

    setTerrainSource(provider) {
        this.terrainController.setTerrainSource(provider);
    }

    setTerrainExaggeration(exaggeration) {
        this.terrainController.setTerrainExaggeration(exaggeration);
    }

    isTerrainSupported() {
        return this.terrainController.isTerrainSupported();
    }



    // Delegated Comparison Methods
    updateComparisonPosition() {
        this.comparisonController.updateComparisonPosition();
    }

    updateAdditionalComparisons() {
        this.comparisonController.updateAdditionalComparisons();
    }

    calculateDualMarkerCenter(currentPoint) {
        return this.comparisonController.calculateDualMarkerCenter(currentPoint);
    }

    applyOverlapLineVisibilityDuringAnimation(hide) {
        this.comparisonController.applyOverlapLineVisibilityDuringAnimation(hide);
    }

    // Delegated Stats Methods
    triggerStatsEndAnimation() {
        this.statsController.triggerStatsEndAnimation();
    }

    populateFinalStats() {
        this.statsController.populateFinalStats();
    }

    resetStatsEndAnimation() {
        this.statsController.resetStatsEndAnimation();
    }

    getCurrentDistance() {
        return this.statsController.getCurrentDistance();
    }

    getCurrentElevation() {
        return this.statsController.getCurrentElevation();
    }

    getCurrentSpeed() {
        return this.statsController.getCurrentSpeed();
    }

    getElevationData() {
        return this.statsController.getElevationData();
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
        } catch (e) { }
        return { start: null, end: null };
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

    updateCurrentPosition() {
        this.animationController.updateCurrentPosition();
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
                ctx.arc(size / 2, size / 2, circleRadius, 0, 2 * Math.PI);
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

            ctx.fillText(this.currentIcon, size / 2, size / 2);

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
        } else if (mode === 'overview') {
            console.log('📹 Entering overview camera mode');

            // Reset follow-behind camera to allow re-initialization
            this.followBehindCamera.reset();

            // Disable map interactions during animation
            this.disableMapInteractions();

            // Disable auto-follow in overview
            const autoFollowToggle = document.getElementById('autoZoom');
            if (autoFollowToggle) {
                autoFollowToggle.checked = false;
                autoFollowToggle.disabled = true;
            }
            this.autoZoom = false;

            // Fit the full track in view with a neutral pitch/bearing
            if (this.trackData && this.trackData.bounds) {
                const bounds = [
                    [this.trackData.bounds.west, this.trackData.bounds.south],
                    [this.trackData.bounds.east, this.trackData.bounds.north]
                ];
                this.map.fitBounds(bounds, {
                    padding: 80,
                    duration: 800,
                    bearing: 0,
                    pitch: 0,
                    maxZoom: 12
                });
            }

            if (!this.isAnimating) {
                this.enableZoomOnlyInteractions();
            }

            // Restore original marker size when switching to overview
            if (this.followBehindCamera.originalMarkerSize) {
                this.markerSize = this.followBehindCamera.originalMarkerSize;
                this.createAndAddActivityIcon();
                if (this.map.getLayer('activity-icon-layer')) {
                    this.forceIconUpdate();
                }
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
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
            // For follow-behind mode, don't override the fitBounds overview
            // The fitBounds in TrackManager.loadTrack already shows the route overview
            // The cinematic sequence will zoom in when animation starts
            // Just initialize terrain-aware settings without changing camera position
            this.followBehindCamera.initializeTerrainAwareSettings();

            // Don't call setStartingPosition here - let fitBounds show the route overview
            // The cinematic sequence will handle the zoom-in when play is clicked
        
        } else if (this.cameraMode === 'overview') {
            if (trackData.bounds) {
                this.map.fitBounds([
                    [trackData.bounds.west, trackData.bounds.south],
                    [trackData.bounds.east, trackData.bounds.north]
                ], {
                    padding: 80,
                    duration: 800,
                    bearing: 0,
                    pitch: 0,
                    maxZoom: 12
                });
            }
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
        } else if (this.cameraMode === 'overview') {
            this.disableMapInteractions();

            const autoFollowToggle = document.getElementById('autoZoom');
            if (autoFollowToggle) {
                autoFollowToggle.checked = false;
                autoFollowToggle.disabled = true;
            }
            this.autoZoom = false;

            console.log('🎬 Overview camera mode initialized as default');
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
        layers.forEach(id => { try { if (this.map.getLayer(id)) this.map.removeLayer(id); } catch (e) { } });
        sources.forEach(id => { try { if (this.map.getSource(id)) this.map.removeSource(id); } catch (e) { } });
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
            const diffText = this.app?.formatSpeed ? this.app.formatSpeed(Math.abs(speedDifference)) : `${Math.abs(speedDifference).toFixed(1)} km/h`;
            speedComparisonText = `+${diffText} faster`;
        } else if (isSlower) {
            const diffText = this.app?.formatSpeed ? this.app.formatSpeed(Math.abs(speedDifference)) : `${Math.abs(speedDifference).toFixed(1)} km/h`;
            speedComparisonText = `${diffText} slower`;
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
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

    generateHeartRateColors() {
        this.heartRateController.generateHeartRateColors();
    }

    prepareHeartRateSegments(trackPoints) {
        this.heartRateController.prepareHeartRateSegments(trackPoints);
    }

    updateCompletedTrailWithHeartRateAnimation(currentPoint) {
        this.heartRateController.updateCompletedTrailWithHeartRateAnimation(currentPoint);
    }

    updateTrailWithHeartRateColors() {
        this.heartRateController.updateTrailWithHeartRateColors();
    }

    updateMapColors() {
        // Update trail colors to use the standard path color when not in heart rate mode
        // Only update if not in heart rate mode (heart rate mode uses its own color system)
        if (this.colorMode === 'heartRate') {
            // Don't override heart rate colors
            return;
        }

        if (this.map && this.map.loaded()) {
            const color = this.pathColor || '#C1652F';

            if (this.map.getLayer('trail-line')) {
                this.map.setPaintProperty('trail-line', 'line-color', color);
                // Reset opacity if not animating (during animation it's handled by AnimationController)
                if (!this.isAnimating) {
                    this.map.setPaintProperty('trail-line', 'line-opacity', [
                        'case',
                        ['==', ['get', 'isTransportation'], true], 0.9,
                        0.8
                    ]);
                }
            }
            if (this.map.getLayer('trail-completed')) {
                this.map.setPaintProperty('trail-completed', 'line-color', color);
            }
            if (this.map.getLayer('current-position-glow')) {
                this.map.setPaintProperty('current-position-glow', 'circle-color', color);
            }
            if (this.map.getLayer('main-track-label')) {
                this.map.setPaintProperty('main-track-label', 'text-color', color);
            }
        }
    }

    setPathColor(color) {
        this.uiMapController.setPathColor(color);
    }

    setMarkerSize(size) {
        this.uiMapController.setMarkerSize(size);
    }

    setAutoZoom(enabled) {
        this.uiMapController.setAutoZoom(enabled);
    }

    setShowCircle(enabled) {
        this.uiMapController.setShowCircle(enabled);
    }

    setShowMarker(enabled) {
        this.uiMapController.setShowMarker(enabled);
    }

    setShowEndStats(enabled) {
        this.uiMapController.setShowEndStats(enabled);
    }

    setAnimationSpeed(speed) {
        this.uiMapController.setAnimationSpeed(speed);
    }

    setActivityType(activityType) {
        this.uiMapController.setActivityType(activityType);
    }

    setCurrentIcon(icon) {
        this.uiMapController.setCurrentIcon(icon);
    }

    clearUserBaseIcon() {
        this.uiMapController.clearUserBaseIcon();
    }

    setColorMode(mode) {
        this.uiMapController.setColorMode(mode);
    }

    updateHeartRateZones() {
        this.uiMapController.updateHeartRateZones();
    }

    startAnimation() {
        this.animationController.startAnimation();
    }

    stopAnimation() {
        this.animationController.stopAnimation();
    }

    resetAnimation() {
        this.animationController.resetAnimation();
    }

    loadTrack(trackData) {
        this.trackManager.loadTrack(trackData);
    }
}
