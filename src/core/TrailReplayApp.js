import { initializeTranslations, t, updatePageTranslations } from '../translations.js';
import { FileController } from '../controllers/FileController.js';
import { MapController } from '../controllers/MapController.js';
import { PlaybackController } from '../controllers/PlaybackController.js';
import { StatsController } from '../controllers/StatsController.js';
import { ExportController } from '../controllers/ExportController.js';
import { VideoExportController } from '../controllers/VideoExportController.js';
import { AnnotationController } from '../controllers/AnnotationController.js';
import { ProgressController } from '../controllers/ProgressController.js';
import { JourneyController } from '../controllers/JourneyController.js';
import { IconController } from '../controllers/IconController.js';
import { TimelineController } from '../controllers/TimelineController.js';
import { URLController } from '../controllers/URLController.js';

import { setupEventListeners } from '../ui/eventListeners.js';
import { setupModals } from '../ui/modalController.js';
import { DEFAULT_SETTINGS, ICON_CATEGORIES, AVAILABLE_ICONS } from '../utils/constants.js';
import { heartRateColorMapper } from '../utils/heartRateColors.js';

export class TrailReplayApp {
    constructor() {
        /** Global, app-wide state */
        this.state = {
            isPlaying: false,
            gpxOnlyStats: DEFAULT_SETTINGS.GPX_ONLY_STATS,
            showSegmentSpeeds: DEFAULT_SETTINGS.SHOW_SEGMENT_SPEEDS,
            showLiveElevationLabel: DEFAULT_SETTINGS.SHOW_LIVE_ELEVATION_LABEL,
            speedDisplayMode: DEFAULT_SETTINGS.SPEED_DISPLAY_MODE,
            totalAnimationTime: DEFAULT_SETTINGS.TOTAL_ANIMATION_TIME,
            currentIcon: DEFAULT_SETTINGS.DEFAULT_ICON,
            currentAnnotation: { icon: DEFAULT_SETTINGS.DEFAULT_ANNOTATION_ICON },
            currentIconChange: { icon: DEFAULT_SETTINGS.DEFAULT_ICON_CHANGE },
            isSelectingForChange: false,
            isDrawingMode: false,
            isAnnotationMode: false
        };

        // Legacy properties for compatibility during refactoring
        this.isPlaying = false;
        this.gpxOnlyStats = DEFAULT_SETTINGS.GPX_ONLY_STATS;
        this.recordingMode = false;
        this.overlayRecordingMode = false;

        // Comparison mode properties
        this.comparisonMode = false;
        this.comparisonTrackData = null;
        this.comparisonGpxParser = null;
        this.timeOverlap = null;

        // Stats selection properties
        this.selectedEndStats = ['distance', 'elevation', 'duration', 'speed', 'pace', 'maxelevation', 'minelevation'];

        // Bind methods
        this.getSelectedEndStats = this.getSelectedEndStats.bind(this);
        this.updateSelectedStats = this.updateSelectedStats.bind(this);



        // Data properties
        this.currentTrackData = null;
        this.journeyData = null;

        // Elevation profile properties
        this.elevationProfile = null;
        this.cachedElevationProfiles = {};
        this.frameCount = 0;

        this.liveElevationLabelElement = null;
        this.elevationProfileSvgElement = null;
        this.lastLiveElevationValue = null;
        this.lastLiveElevationLeft = null;
        this.lastLiveElevationProgress = null;
        this.liveElevationUpdateThreshold = 0.0025;

        // Keep references to icon data for compatibility
        this.iconCategories = ICON_CATEGORIES;
        this.availableIcons = AVAILABLE_ICONS;

        /* Controllers - they will be initialized with dependencies */
        this.file = null;
        this.map = null;
        this.playback = null;
        this.stats = null;
        this.progress = null;
        this.journey = null;
        this.icon = null;
        this.exporter = null;
        this.videoExporter = null;
        this.notes = null;
        this.strava = null; // Initialize StravaController
        this.url = null; // URL Controller for Wikiloc URLs

        // Legacy property names for compatibility
        this.mapController = null; // Will point to this.map
        this.gpxParser = null; // Will be set when data is loaded
    }

    async init() {
        // Initialize translations
        initializeTranslations();

        // Update page translations
        updatePageTranslations();

        // Update placeholders with translations after a brief delay
        setTimeout(() => this.updatePlaceholders(), 100);

        // Initialize controllers with dependencies
        this.map = new MapController(this);
        await this.map.init();

        this.file = new FileController(this);
        this.playback = new PlaybackController(this);
        this.stats = new StatsController(this);
        this.progress = new ProgressController(this);
        this.journey = new JourneyController(this);
        this.icon = new IconController(this);
        this.timeline = new TimelineController(this);
        this.exporter = new ExportController(this);
        this.videoExporter = new VideoExportController(this);
        this.notes = new AnnotationController(this);
        this.url = new URLController(this);
        this.url.initialize();

        // Set legacy compatibility references
        this.mapController = this.map;
        this.gpxParser = this.file.gpxParser;

        // Add direct mapRenderer reference for consistent access
        this.mapRenderer = this.map.mapRenderer;

        // Set up UI wiring
        setupEventListeners(this);
        setupModals(this);

        // Initialize stats selection
        this.initializeStatsSelection();

        // Initialize progress bar interactions after DOM is ready
        this.progress.initialize();

        // Initialize journey functionality
        this.journey.initialize();

        // Initialize icon functionality
        this.icon.initialize();

        // Initialize video export functionality
        this.videoExporter.initialize();

        // Set up timing synchronization for journeys
        this.setupTimingSynchronization();

        // Initialize other features
        this.addLanguageSwitcher();

        // Setup annotation click event listener
        document.addEventListener('annotationClick', (e) => {
            const progress = e.detail.progress;


            // Initialize currentAnnotation if not exists
            if (!this.currentAnnotation) {
                this.currentAnnotation = {};
            }

            // Set progress and default icon
            this.currentAnnotation.progress = progress;
            this.currentAnnotation.icon = this.currentAnnotation.icon || '📍';

            // Show annotation modal
            this.notes.showAnnotationModal();
        });

        // Setup timeline migration after track loads
        document.addEventListener('trackLoaded', () => {
            // Migrate existing annotations and icon changes to unified timeline
            setTimeout(() => {
                this.timeline.migrateExistingEvents();
            }, 100);
        });

        // Expose configuration functions to window for easy access
        window.forceSyntheticTimeData = () => this.forceSyntheticTimeData();
        window.setTrackColors = (mainColor, comparisonColor) => {
            if (this.mapRenderer) {
                this.mapRenderer.setTrackColors(mainColor, comparisonColor);
            } else {
                console.error('MapRenderer not available for color configuration');
            }
        };
        window.debugComparisonTrack = () => this.debugComparisonTrack();
        window.testTranslations = () => this.testTranslations();
    }

    // Temporary methods to maintain compatibility during refactoring
    updatePlaceholders() {
        // This will be moved to a UI controller later

        // Handle old format
        const oldElements = document.querySelectorAll('[data-translate-placeholder]');
        oldElements.forEach(element => {
            const key = element.dataset.translatePlaceholder;
            element.placeholder = t(key);
        });

        // Handle new format (data-i18n-placeholder)
        const newElements = document.querySelectorAll('[data-i18n-placeholder]');
        newElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = t(key);
            if (translation) {
                element.placeholder = translation;
            }
        });
    }

    addLanguageSwitcher() {
        // This will be moved to a UI controller later
        const languageSelector = document.getElementById('languageSelector');
        if (languageSelector) {
            languageSelector.addEventListener('change', (e) => {
                const language = e.target.value;
                localStorage.setItem('selectedLanguage', language);
                location.reload(); // Simple reload for language change
            });

            // Set current language
            const currentLanguage = localStorage.getItem('selectedLanguage') || 'en';
            languageSelector.value = currentLanguage;
        }
    }

    // Temporary methods to maintain compatibility during refactoring
    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    }

    showMessage(message, type = 'info') {
        // Create or get message container
        let messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'messageContainer';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 400px;
            `;
            document.body.appendChild(messageContainer);
        }

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 4px;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
            background-color: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#4caf50'};
        `;

        // Add animation styles if not already present
        if (!document.getElementById('messageStyles')) {
            const style = document.createElement('style');
            style.id = 'messageStyles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        messageElement.textContent = message;
        messageContainer.appendChild(messageElement);

        const getDismissDelay = (messageType) => {
            if (messageType === 'error') return 12000;
            if (messageType === 'warning') return 8000;
            return 5000;
        };

        // Auto-remove after a delay
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.parentNode.removeChild(messageElement);
                    }
                }, 300);
            }
        }, getDismissDelay(type));
    }

    clearElevationProfileCache(trackId = null) {
        if (!this.cachedElevationProfiles) return;

        if (trackId) {
            delete this.cachedElevationProfiles[trackId];

        } else {
            this.cachedElevationProfiles = {};

        }
    }

    startProgressUpdate() {
        let lastUpdateTime = 0;
        const targetFPS = 30; // Limit to 30fps for better performance
        const frameInterval = 1000 / targetFPS;

        const updateProgress = (currentTime) => {
            if (!this.state.isPlaying || !this.mapRenderer) return;

            // Throttle updates to target FPS for better performance
            if (currentTime - lastUpdateTime >= frameInterval) {
                this.updateProgressDisplay();
                lastUpdateTime = currentTime;
            }

            const progress = this.mapRenderer.getAnimationProgress();
            if (progress < 1 && this.state.isPlaying) {
                requestAnimationFrame(updateProgress);
            } else if (progress >= 1) {
                this.state.isPlaying = false;
                this.isPlaying = false; // Legacy compatibility
                const playBtn = document.getElementById('playBtn');
                if (playBtn) {
                    const playBtnSpan = playBtn.querySelector('span');
                    if (playBtnSpan) {
                        playBtnSpan.textContent = 'Play'; // Will be translated by eventListeners
                    }
                }
            }
        };

        requestAnimationFrame(updateProgress);
    }

    updateProgressDisplay() {
        // Skip expensive operations during clean recording, but allow updates during overlay recording (manual mode)
        if (this.recordingMode && !this.overlayRecordingMode) {
            return;
        }

        const progress = this.mapRenderer.getAnimationProgress();

        // Update the elevation profile progress (throttled)
        this.updateElevationProgress(progress);

        // Update live stats with throttling
        this.stats.updateLiveStats();



        // For journeys, ensure timing is synchronized
        if (this.currentTrackData && this.currentTrackData.isJourney && this.mapRenderer.getJourneyElapsedTime() !== undefined) {
            const currentTimeSeconds = Math.floor(this.mapRenderer.getJourneyElapsedTime());

            // Update current time display
            const currentTimeElement = document.getElementById('currentTime');
            if (currentTimeElement) {
                currentTimeElement.textContent = this.formatTimeInSeconds(currentTimeSeconds);
            }

            // Update total time display with journey timing
            if (this.currentTrackData.segmentTiming && this.currentTrackData.segmentTiming.totalDuration) {
                const totalTimeElement = document.getElementById('totalTime');
                if (totalTimeElement) {
                    totalTimeElement.textContent = this.formatTimeInSeconds(this.currentTrackData.segmentTiming.totalDuration);
                }
            }

            // Check for timing mismatches during animation
            const journeyTime = this.mapRenderer.getJourneyElapsedTime();
            const expectedProgress = this.convertSegmentTimeToLinearProgress(journeyTime);
            const actualProgress = progress;

            if (expectedProgress !== null && Math.abs(expectedProgress - actualProgress) > 0.05) {

            }
        }
    }

    updateElevationProgress(progress, options = {}) {
        const { force = false } = options;

        // Skip expensive operations during clean recording, but allow updates during overlay recording (manual mode)
        if (!force && this.recordingMode && !this.overlayRecordingMode) {
            return;
        }

        // Throttle elevation updates during animation for better performance
        const now = performance.now();
        if (!force && this.state.isPlaying && this.lastElevationUpdate && (now - this.lastElevationUpdate) < 50) {
            return; // Skip if updated less than 50ms ago during animation
        }
        this.lastElevationUpdate = now;

        if (!this.elevationProfile) {
            this.hideLiveElevationLabel();
            // Fallback to flat progress bar behavior - cache DOM element
            if (!this.progressFillElement) {
                this.progressFillElement = document.getElementById('progressFill');
            }
            if (this.progressFillElement) {
                this.progressFillElement.style.width = `${progress * 100}%`;
            }
            return;
        }

        const { points, svgWidth, svgHeight, timeAtPoint } = this.elevationProfile;
        let currentX = 0;
        let currentY = svgHeight / 2; // Default middle
        let currentPointIndex = 0;

        // --- Time-based progress for journeys ---
        if (this.currentTrackData && this.currentTrackData.isJourney && timeAtPoint && timeAtPoint.length === points.length) {
            // Get current journey time
            const journeyTime = this.mapRenderer?.getJourneyElapsedTime?.() ?? (progress * (this.currentTrackData.segmentTiming?.totalDuration || 1));
            // Use binary search for better performance instead of linear search
            let low = 0;
            let high = timeAtPoint.length - 1;
            while (low < high) {
                const mid = Math.floor((low + high) / 2);
                if (timeAtPoint[mid] < journeyTime) {
                    low = mid + 1;
                } else {
                    high = mid;
                }
            }
            currentPointIndex = low;

            // Use the x/y from the SVG points
            if (points.length > 0 && currentPointIndex < points.length) {
                const [x, y] = points[currentPointIndex].split(',').map(Number);
                currentX = x;
                currentY = y;
            }
        } else {
            // Fallback: linear progress (optimized)
            const exactIndex = progress * (points.length - 1);
            currentPointIndex = Math.min(Math.floor(exactIndex), points.length - 1);

            if (points.length > 0 && currentPointIndex < points.length) {
                const [x, y] = points[currentPointIndex].split(',').map(Number);
                currentX = x;
                currentY = y;

                // Interpolate between points if we're between indices
                const fraction = exactIndex - currentPointIndex;
                if (fraction > 0 && currentPointIndex < points.length - 1) {
                    const [nextX, nextY] = points[currentPointIndex + 1].split(',').map(Number);
                    currentX = x + (nextX - x) * fraction;
                    currentY = y + (nextY - y) * fraction;
                }
            }
        }

        // Cache DOM elements for better performance
        if (!this.progressPathElement) {
            this.progressPathElement = document.getElementById('progressPath');
        }

        // Update progress path with reduced frequency during animation
        if (this.progressPathElement && points.length > 0) {
            const progressPoints = points.slice(0, currentPointIndex + 1);
            if (progressPoints.length > 0) {
                // Add current interpolated position with reduced precision
                progressPoints.push(`${currentX.toFixed(1)},${currentY.toFixed(1)}`);

                // Create filled area from bottom to elevation profile
                const progressPathData = `M0,${svgHeight} L${progressPoints.join(' L')} L${currentX.toFixed(1)},${svgHeight} Z`;
                this.progressPathElement.setAttribute('d', progressPathData);

            }
        }

        this.updateLiveElevationMarker({ progress, currentX, svgWidth, force });
    }


    ensureLiveElevationLabelElement() {
        if (!this.liveElevationLabelElement) {
            this.liveElevationLabelElement = document.getElementById('liveElevationMarker');
        }
        return this.liveElevationLabelElement;
    }

    hideLiveElevationLabel() {
        const labelEl = this.ensureLiveElevationLabelElement();
        if (labelEl) {
            labelEl.style.display = 'none';
        }
        this.lastLiveElevationValue = null;
        this.lastLiveElevationLeft = null;
        this.lastLiveElevationProgress = null;
    }

    updateLiveElevationMarker({ progress, currentX, svgWidth, force = false }) {
        if (!this.state.showLiveElevationLabel) {
            this.hideLiveElevationLabel();
            return;
        }

        const labelEl = this.ensureLiveElevationLabelElement();
        if (!labelEl) return;

        const svgElement = this.elevationProfileSvgElement || (this.elevationProfileSvgElement = document.getElementById('elevationProfileSvg'));
        const containerWidth = svgElement?.clientWidth || svgWidth || 0;
        if (!containerWidth) {
            this.hideLiveElevationLabel();
            return;
        }

        if (labelEl.style.display !== 'block') {
            labelEl.style.display = 'block';
        }

        const percent = svgWidth ? currentX / svgWidth : progress;
        let left = percent * containerWidth;
        const labelWidth = labelEl.offsetWidth || 0;
        const halfWidth = labelWidth / 2;
        if (containerWidth > 0) {
            left = Math.max(halfWidth, Math.min(containerWidth - halfWidth, left));
        }

        const leftValue = `${left}px`;
        const progressDelta = Math.abs((this.lastLiveElevationProgress ?? progress) - progress);
        const shouldUpdatePosition = force || this.lastLiveElevationLeft !== leftValue;
        const shouldUpdateProgress = force || this.lastLiveElevationProgress === null || progressDelta >= this.liveElevationUpdateThreshold;

        if (!shouldUpdatePosition && !shouldUpdateProgress) {
            return;
        }

        if (shouldUpdatePosition) {
            labelEl.style.left = leftValue;
            this.lastLiveElevationLeft = leftValue;
        }

        if (shouldUpdateProgress) {
            const parser = this.mapRenderer?.gpxParser || this.gpxParser;
            if (!parser?.getInterpolatedPoint || !parser?.trackPoints || parser.trackPoints.length === 0) {
                this.hideLiveElevationLabel();
                return;
            }

            const clampedProgress = Math.max(0, Math.min(1, progress));
            const point = parser.getInterpolatedPoint(clampedProgress);
            const elevationValue = point?.elevation;

            let formatted = '–';
            if (typeof elevationValue === 'number' && !Number.isNaN(elevationValue)) {
                formatted = parser.formatElevation ? parser.formatElevation(elevationValue) : `${Math.round(elevationValue)} m`;
            }

            if (force || this.lastLiveElevationValue !== formatted) {
                labelEl.textContent = formatted;
                this.lastLiveElevationValue = formatted;
            }

            this.lastLiveElevationProgress = clampedProgress;
        }
    }

    // Generate elevation profile SVG path
    generateElevationProfile() {
        if (!this.currentTrackData || !this.currentTrackData.trackPoints) {

            return;
        }




        // Create a unique cache key - for journeys, include segment composition
        let trackId;
        if (this.currentTrackData.isJourney && this.currentTrackData.segments) {
            // For journeys, create a cache key based on segment composition and order
            const segmentIds = this.currentTrackData.segments.map(segment => {
                if (segment.type === 'track') {
                    return `track_${segment.data.filename || segment.data.name}`;
                } else {
                    return `${segment.type}_${segment.mode || 'unknown'}`;
                }
            }).join('|');
            const trackPointsCount = this.currentTrackData.trackPoints.length;
            trackId = `journey_${segmentIds}_${trackPointsCount}pts`;
        } else {
            trackId = this.currentTrackData.filename || 'unknown';
        }

        // Check if we already have a cached profile for this exact journey composition
        if (this.cachedElevationProfiles && this.cachedElevationProfiles[trackId]) {
            this.elevationProfile = this.cachedElevationProfiles[trackId];
            const elevationPathEl = document.getElementById('elevationPath');
            if (elevationPathEl && this.elevationProfile?.pathData) {
                elevationPathEl.setAttribute('d', this.elevationProfile.pathData);
            }

            this.elevationProfileSvgElement = document.getElementById('elevationProfileSvg');
            this.lastLiveElevationLeft = null;
            this.lastLiveElevationValue = null;
            this.lastLiveElevationProgress = null;

            this.updateElevationLabels();

            if (this.state.showLiveElevationLabel) {
                const currentProgress = this.mapRenderer?.getAnimationProgress?.() ?? 0;
                this.updateElevationProgress(currentProgress, { force: true });
            } else {
                this.hideLiveElevationLabel();
            }

            return;
        }

        const trackPoints = this.currentTrackData.trackPoints;
        const svgWidth = 800; // SVG viewBox width
        const svgHeight = 60; // SVG viewBox height
        const padding = 5; // Padding from edges

        // Extract elevation data
        const elevations = trackPoints.map(point => point.elevation || 0);
        const minElevation = Math.min(...elevations);
        const maxElevation = Math.max(...elevations);
        const elevationRange = maxElevation - minElevation;

        // Update stats with current elevation data (may have been modified after GPX parsing)
        if (this.currentTrackData && this.currentTrackData.stats) {
            this.currentTrackData.stats.minElevation = minElevation;
            this.currentTrackData.stats.maxElevation = maxElevation;
        }

        // If no elevation variation, create a flat line
        if (elevationRange === 0) {
            const flatY = svgHeight / 2;
            const pathData = `M0,${flatY} L${svgWidth},${flatY} L${svgWidth},${svgHeight} L0,${svgHeight} Z`;

            const elevationPath = document.getElementById('elevationPath');
            if (elevationPath) {
                elevationPath.setAttribute('d', pathData);

            } else {
                console.error('❌ Could not find elevationPath element for flat profile');
            }

            // Cache the flat profile
            this.elevationProfile = {
                points: [`0,${flatY}`, `${svgWidth},${flatY}`],
                minElevation,
                maxElevation,
                elevationRange,
                svgWidth,
                svgHeight,
                padding,
                pathData
            };

            // Ensure elevation profile container is visible
            const elevationContainer = document.querySelector('.elevation-profile-container');
            if (elevationContainer) {
                elevationContainer.style.display = 'block';

            } else {
                console.error('❌ Could not find elevation profile container for flat profile');
            }


            this.updateElevationLabels();
            return;
        }

        // --- Time-based elevation profile for journeys ---
        let timeAtPoint = [];
        if (this.currentTrackData.isJourney && this.currentTrackData.segmentTiming && this.currentTrackData.segmentTiming.segments) {
            // Build a lookup: for each track point, what is its cumulative time?
            const segments = this.currentTrackData.segmentTiming.segments;
            timeAtPoint = new Array(trackPoints.length).fill(0);
            segments.forEach(seg => {
                const segStart = seg.startIndex ?? seg.startCoordIndex;
                const segEnd = seg.endIndex ?? seg.endCoordIndex;
                const segLen = segEnd - segStart;
                for (let i = segStart; i <= segEnd; i++) {
                    // Progress within this segment
                    const segProgress = segLen > 0 ? (i - segStart) / segLen : 0;
                    timeAtPoint[i] = seg.startTime + segProgress * seg.duration;
                }
            });
        } else {
            // Single GPX fallback: time is proportional to index
            timeAtPoint = trackPoints.map((_, i) => (i / (trackPoints.length - 1)) * (this.currentTrackData.segmentTiming?.totalDuration || 1));
        }

        // Generate path points with optimization for large datasets
        const pathPoints = [];
        const pointCount = trackPoints.length;

        // More aggressive optimization for large tracks to improve performance
        // BUT preserve heart rate data by checking if it exists first
        const hasHeartRateData = trackPoints.some(p => p.heartRate && p.heartRate > 0);
        let step = 1;

        if (hasHeartRateData) {
            // If heart rate data exists, be more conservative with optimization
            // to preserve heart rate information
            if (pointCount > 3000) {
                step = Math.ceil(pointCount / 1000); // Reduce to max 1000 points for very large tracks with HR
            } else if (pointCount > 1500) {
                step = Math.ceil(pointCount / 1200); // Reduce to max 1200 points for large tracks with HR
            }
        } else {
            // No heart rate data - can be more aggressive with optimization
            if (pointCount > 2000) {
                step = Math.ceil(pointCount / 600); // Reduce to max 600 points for very large tracks
            } else if (pointCount > 1000) {
                step = Math.ceil(pointCount / 800); // Reduce to max 800 points for large tracks
            }
        }

        for (let i = 0; i < pointCount; i += step) {
            const actualIndex = Math.min(i, pointCount - 1);
            // --- Use time-based x for journeys ---
            let x = 0;
            if (timeAtPoint.length === pointCount && this.currentTrackData.segmentTiming?.totalDuration) {
                x = (timeAtPoint[actualIndex] / this.currentTrackData.segmentTiming.totalDuration) * svgWidth;
            } else {
                x = (actualIndex / (pointCount - 1)) * svgWidth;
            }
            const normalizedElevation = (elevations[actualIndex] - minElevation) / elevationRange;
            const y = svgHeight - (normalizedElevation * (svgHeight - padding * 2)) - padding;
            pathPoints.push(`${x.toFixed(2)},${y.toFixed(2)}`);
        }

        // Create SVG path - filled area under the curve
        const pathData = `M0,${svgHeight} L${pathPoints.join(' L')} L${svgWidth},${svgHeight} Z`;

        // Update the elevation path
        const elevationPath = document.getElementById('elevationPath');
        if (elevationPath) {
            elevationPath.setAttribute('d', pathData);

        } else {
            console.error('❌ Could not find elevationPath element');
        }

        // Store elevation data for progress updates with caching
        this.elevationProfile = {
            points: pathPoints,
            minElevation,
            maxElevation,
            elevationRange,
            svgWidth,
            svgHeight,
            padding,
            pathData,
            // --- Store time mapping for use in progress/seek logic ---
            timeAtPoint: timeAtPoint,
        };

        this.elevationProfileSvgElement = document.getElementById('elevationProfileSvg');
        this.lastLiveElevationLeft = null;
        this.lastLiveElevationValue = null;
        this.lastLiveElevationProgress = null;

        // Cache the profile for future use
        if (!this.cachedElevationProfiles) {
            this.cachedElevationProfiles = {};
        }
        this.cachedElevationProfiles[trackId] = this.elevationProfile;



        // Ensure elevation profile container is visible
        const elevationContainer = document.querySelector('.elevation-profile-container');
        if (elevationContainer) {
            elevationContainer.style.display = 'block';

        } else {
            console.error('❌ Could not find elevation profile container');
        }

        // Update elevation labels
        this.updateElevationLabels();

        if (this.state.showLiveElevationLabel) {
            const currentProgress = this.mapRenderer?.getAnimationProgress?.() ?? 0;
            this.updateElevationProgress(currentProgress, { force: true });
        } else {
            this.hideLiveElevationLabel();
        }
    }

    // Update elevation labels with start and peak elevation values
    updateElevationLabels() {
        if (!this.elevationProfile || !this.currentTrackData) {
            // Hide labels if no elevation data
            const minLabel = document.getElementById('minElevationLabel');
            const maxLabel = document.getElementById('maxElevationLabel');
            if (minLabel) minLabel.style.display = 'none';
            if (maxLabel) maxLabel.style.display = 'none';
            return;
        }

        const { minElevation, maxElevation } = this.elevationProfile;
        const trackPoints = this.currentTrackData.trackPoints;

        // Find the starting elevation (first point)
        const startElevation = trackPoints.length > 0 ? (trackPoints[0].elevation || 0) : minElevation;

        // Find the position of the maximum elevation point
        let maxElevationIndex = 0;
        let currentMaxElevation = startElevation;

        trackPoints.forEach((point, index) => {
            if (point.elevation && point.elevation > currentMaxElevation) {
                currentMaxElevation = point.elevation;
                maxElevationIndex = index;
            }
        });

        // Update min elevation label (bottom of profile)
        const minLabel = document.getElementById('minElevationLabel');
        if (minLabel) {
            minLabel.style.display = 'flex';
            minLabel.style.visibility = 'visible';
            const valueSpan = minLabel.querySelector('.elevation-value');
            if (valueSpan) {
                valueSpan.textContent = `${Math.round(minElevation)} m`;
            }
        }

        // Update peak elevation label  
        const maxLabel = document.getElementById('maxElevationLabel');
        if (maxLabel) {
            maxLabel.style.display = 'flex';
            maxLabel.style.visibility = 'visible';
            const valueSpan = maxLabel.querySelector('.elevation-value');
            if (valueSpan) {
                valueSpan.textContent = `${Math.round(maxElevation)} m`;
            }
        }


    }

    // Convert linear progress (0-1) to segment timing for journeys
    convertLinearProgressToSegmentTime(linearProgress) {
        if (!this.currentTrackData || !this.currentTrackData.isJourney || !this.currentTrackData.segmentTiming) {
            return null;
        }

        // Ensure progress is within bounds
        linearProgress = Math.max(0, Math.min(1, linearProgress));

        const segments = this.currentTrackData.segmentTiming.segments;
        if (!segments || segments.length === 0) {
            return linearProgress * (this.currentTrackData.segmentTiming.totalDuration || this.state.totalAnimationTime);
        }

        // Find which segment this linear progress falls into
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            // Validate segment data
            if (typeof segment.progressStartRatio !== 'number' || typeof segment.progressEndRatio !== 'number' ||
                typeof segment.startTime !== 'number' || typeof segment.duration !== 'number') {
                console.warn(`Invalid segment data at index ${i}:`, segment);
                continue;
            }

            // Check if the linear progress falls within this segment's coordinate range
            if (linearProgress >= segment.progressStartRatio && linearProgress <= segment.progressEndRatio) {
                // Calculate the relative position within this segment
                const segmentProgressRange = segment.progressEndRatio - segment.progressStartRatio;
                let relativeProgressInSegment = 0;

                if (segmentProgressRange > 0) {
                    relativeProgressInSegment = (linearProgress - segment.progressStartRatio) / segmentProgressRange;
                }

                // Convert to time within this segment
                const timeInSegment = relativeProgressInSegment * segment.duration;
                const totalTime = segment.startTime + timeInSegment;

                if (isNaN(totalTime)) {
                    console.warn(`Invalid time calculation for segment ${i}:`, { timeInSegment, totalTime, segment });
                    break; // Fall through to fallback
                }

                return totalTime;
            }
        }

        // Fallback: if not found in any segment, use proportional mapping
        const fallbackTime = linearProgress * (this.currentTrackData.segmentTiming.totalDuration || this.state.totalAnimationTime);
        return isNaN(fallbackTime) ? linearProgress * this.state.totalAnimationTime : fallbackTime;
    }

    // Convert segment time to linear progress for journeys (reverse mapping)
    convertSegmentTimeToLinearProgress(segmentTime) {
        if (!this.currentTrackData || !this.currentTrackData.isJourney || !this.currentTrackData.segmentTiming) {
            return null;
        }

        // Ensure time is valid
        if (typeof segmentTime !== 'number' || isNaN(segmentTime)) {
            return null;
        }

        const segments = this.currentTrackData.segmentTiming.segments;
        if (!segments || segments.length === 0) {
            const totalDuration = this.currentTrackData.segmentTiming.totalDuration || this.state.totalAnimationTime;
            return totalDuration > 0 ? Math.max(0, Math.min(1, segmentTime / totalDuration)) : 0;
        }

        // Find which segment this time falls into
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            // Validate segment data
            if (typeof segment.startTime !== 'number' || typeof segment.endTime !== 'number' ||
                typeof segment.duration !== 'number' || typeof segment.progressStartRatio !== 'number' ||
                typeof segment.progressEndRatio !== 'number') {
                console.warn(`Invalid segment data for time conversion at index ${i}:`, segment);
                continue;
            }

            if (segmentTime >= segment.startTime && segmentTime <= segment.endTime) {
                // Calculate relative position within this segment's time
                const relativeTimeInSegment = segmentTime - segment.startTime;
                const relativeProgressInSegment = segment.duration > 0 ? relativeTimeInSegment / segment.duration : 0;

                // Convert to linear progress
                const segmentProgressRange = segment.progressEndRatio - segment.progressStartRatio;
                const linearProgress = segment.progressStartRatio + (relativeProgressInSegment * segmentProgressRange);

                if (isNaN(linearProgress)) {
                    console.warn(`Invalid progress calculation for segment ${i}:`, { relativeProgressInSegment, linearProgress, segment });
                    break; // Fall through to fallback
                }

                return Math.max(0, Math.min(1, linearProgress));
            }
        }

        // Fallback: if not found in any segment, use proportional mapping
        const totalDuration = this.currentTrackData.segmentTiming.totalDuration || this.state.totalAnimationTime;
        const fallbackProgress = totalDuration > 0 ? segmentTime / totalDuration : 0;
        return Math.max(0, Math.min(1, fallbackProgress));
    }

    updateTimelineProgressIndicator(progress) {
        // Placeholder for timeline progress indicator update
        // Implementation will be added when timeline features are needed

    }

    // Calculate detailed segment timing for journeys
    calculateSegmentTiming(segments) {
        // segments argument is the array from JourneyBuilder.buildCompleteJourney().segments
        let totalDuration = 0;
        let trackDuration = 0;
        let transportDuration = 0;
        const detailedSegmentTimings = []; // This will be MapRenderer's segmentTimings.segments



        // First pass: calculate total coordinates to determine progress ratios
        let totalCoordinates = 0;
        segments.forEach(segment => {
            // Ensure segment.startIndex and segment.endIndex are valid numbers
            const len = (segment.endIndex - segment.startIndex + 1);
            totalCoordinates += (isNaN(len) || len < 0) ? 0 : len;
        });
        if (totalCoordinates === 0 && segments.length > 0) totalCoordinates = segments.length; // Basic fallback
        if (totalCoordinates === 0) totalCoordinates = 1; // Avoid division by zero

        let currentCoordIndex = 0;

        segments.forEach((segment, index) => {
            let segmentTime = 0;

            if (segment.type === 'track') {
                if (segment.userTime !== undefined && segment.userTime !== null) {
                    segmentTime = segment.userTime;
                } else {
                    // Use journey controller's method for default track time
                    segmentTime = this.journeyController ? this.journeyController.calculateTrackTime(segment.data) : 60; // Fallback if no controller
                }
                trackDuration += segmentTime;
            } else if (segment.type === 'transportation') {
                if (segment.route && segment.route.userTime !== undefined && segment.route.userTime !== null) {
                    segmentTime = segment.route.userTime;
                } else if (segment.userTime !== undefined && segment.userTime !== null) {
                    segmentTime = segment.userTime;
                } else {
                    // Use journey controller's method for default transport time
                    let distance = 0;
                    if (segment.startPoint && segment.endPoint && this.journeyController) {
                        distance = this.journeyController.calculateDistance(segment.startPoint, segment.endPoint);
                    }
                    segmentTime = this.journeyController ? this.journeyController.getDefaultTransportTime(segment.mode, distance) : 30;
                }
                transportDuration += segmentTime;
            }

            const segmentLength = (segment.endIndex - segment.startIndex + 1);
            const currentSegmentLength = (isNaN(segmentLength) || segmentLength < 0) ? 0 : segmentLength;

            // Ensure progress ratios are always valid numbers between 0 and 1
            const progressStartRatio = totalCoordinates > 1 ? currentCoordIndex / (totalCoordinates - 1) : 0;
            const progressEndRatio = totalCoordinates > 1 ? (currentCoordIndex + Math.max(0, currentSegmentLength - 1)) / (totalCoordinates - 1) : 1;

            detailedSegmentTimings.push({
                ...segment, // Pass through original segment data (type, data, mode, route, etc.)
                duration: segmentTime,
                startTime: totalDuration,
                endTime: totalDuration + segmentTime,
                coordinateLength: currentSegmentLength,
                progressStartRatio: Math.max(0, Math.min(1, progressStartRatio)),
                progressEndRatio: Math.max(0, Math.min(1, progressEndRatio)),
                startCoordIndex: currentCoordIndex,
                endCoordIndex: currentCoordIndex + Math.max(0, currentSegmentLength - 1)
            });

            totalDuration += segmentTime;
            currentCoordIndex += currentSegmentLength;
        });



        return {
            totalDuration,
            trackDuration,
            transportDuration,
            segments: detailedSegmentTimings // This is the crucial part for MapRenderer
        };
    }

    // Handle segment timing updates from journey controller
    handleSegmentTimingUpdate(updateData) {


        if (!updateData || !updateData.segments) {
            console.warn('Invalid segment timing update data');
            return;
        }

        // Calculate detailed timing for MapRenderer
        const detailedSegmentTimingForMapRenderer = this.calculateSegmentTiming(updateData.segments);



        // Update all timing-related state
        this.state.totalAnimationTime = detailedSegmentTimingForMapRenderer.totalDuration;

        // Update current track data
        if (this.currentTrackData) {
            this.currentTrackData.segmentTiming = detailedSegmentTimingForMapRenderer;
        }

        // Update MapRenderer with new timing
        if (this.mapRenderer) {

            this.mapRenderer.setupSegmentAnimation(updateData.segments, detailedSegmentTimingForMapRenderer);
        }

        // Update all UI displays
        this.synchronizeAllTimingDisplays(detailedSegmentTimingForMapRenderer);

        // Update any journey-related UI
        if (this.journeyController) {
            this.journeyController.updateTimingDisplay(detailedSegmentTimingForMapRenderer);
        }


    }

    // Synchronize all timing displays
    synchronizeAllTimingDisplays(segmentTiming) {


        const formattedTime = this.formatTimeInSeconds(segmentTiming.totalDuration);

        // Update total time displays
        const totalTimeElements = document.querySelectorAll('#totalTime, .total-time-display');
        totalTimeElements.forEach(element => {
            element.textContent = formattedTime;
        });

        // Update timing breakdown if visible
        if (this.journeyController) {
            this.journeyController.showTimingBreakdown(segmentTiming);
        }

        // Validate all displays are synchronized
        this.validateAllTimingDisplaysSync(segmentTiming);


    }

    // Validate timing synchronization across all components
    validateAllTimingDisplaysSync(expectedTiming) {
        const issues = [];

        // Check TrackData timing
        if (this.currentTrackData?.segmentTiming?.totalDuration !== expectedTiming.totalDuration) {
            issues.push(`TrackData timing: ${this.currentTrackData?.segmentTiming?.totalDuration} ≠ ${expectedTiming.totalDuration}`);
        }

        // Check MapRenderer timing  
        if (this.mapRenderer?.segmentTimings?.totalDuration !== expectedTiming.totalDuration) {
            issues.push(`MapRenderer timing: ${this.mapRenderer?.segmentTimings?.totalDuration} ≠ ${expectedTiming.totalDuration}`);
        }

        // Check app state timing
        if (this.state.totalAnimationTime !== expectedTiming.totalDuration) {
            issues.push(`App state timing: ${this.state.totalAnimationTime} ≠ ${expectedTiming.totalDuration}`);
        }

        if (issues.length > 0) {
            console.warn('⚠️  Timing synchronization issues detected:', issues);
            return false;
        } else {

            return true;
        }
    }

    // Debug method to validate journey synchronization
    validateJourneySynchronization() {
        if (!this.currentTrackData || !this.currentTrackData.isJourney || !this.mapRenderer) {
            console.log('❌ Not a journey or no map renderer - synchronization validation skipped');
            return false;
        }

        const progress = this.mapRenderer.getCurrentProgress();
        const journeyTime = this.mapRenderer.getJourneyElapsedTime();

        // Convert progress to expected time
        const expectedTime = this.convertLinearProgressToSegmentTime(progress);

        // Convert time to expected progress  
        const expectedProgress = this.convertSegmentTimeToLinearProgress(journeyTime);

        const timeDiff = Math.abs(expectedTime - journeyTime);
        const progressDiff = Math.abs(expectedProgress - progress);

        console.log('🔍 Journey Synchronization Status:');
        console.log(`   Current Progress: ${progress.toFixed(3)}`);
        console.log(`   Current Journey Time: ${journeyTime?.toFixed(1)}s`);
        console.log(`   Expected Time from Progress: ${expectedTime?.toFixed(1)}s (diff: ${timeDiff?.toFixed(1)}s)`);
        console.log(`   Expected Progress from Time: ${expectedProgress?.toFixed(3)} (diff: ${progressDiff?.toFixed(3)})`);

        const isTimeSynced = timeDiff < 2; // 2 second tolerance
        const isProgressSynced = progressDiff < 0.02; // 2% tolerance
        const isFullySynced = isTimeSynced && isProgressSynced;

        console.log(`   Time Sync: ${isTimeSynced ? '✅' : '❌'}, Progress Sync: ${isProgressSynced ? '✅' : '❌'}, Overall: ${isFullySynced ? '✅' : '❌'}`);

        if (!isFullySynced) {
            console.log('⚠️  Synchronization issues detected - this may cause position/time mismatches');

            // Suggest fixes
            if (!isTimeSynced) {
                console.log(`   💡 Consider calling: app.mapRenderer.setJourneyElapsedTime(${expectedTime?.toFixed(1)})`);
            }
            if (!isProgressSynced) {
                console.log(`   💡 Consider calling: app.mapRenderer.setAnimationProgress(${expectedProgress?.toFixed(3)})`);
            }
        }

        return isFullySynced;
    }

    // Force synchronization between position and time for journeys
    forceSynchronization() {
        if (!this.currentTrackData || !this.currentTrackData.isJourney || !this.mapRenderer) {
            console.log('❌ Cannot force synchronization - not a journey or no map renderer');
            return false;
        }

        const progress = this.mapRenderer.getCurrentProgress();
        const expectedTime = this.convertLinearProgressToSegmentTime(progress);

        console.log(`🔧 Forcing synchronization: progress=${progress.toFixed(3)} → time=${expectedTime?.toFixed(1)}s`);

        if (expectedTime !== null) {
            this.mapRenderer.setJourneyElapsedTime(expectedTime);
            this.updateProgressDisplay();
            // Update timeline progress if journey controller exists
            if (this.journeyController) {
                this.journeyController.updateTimelineProgressIndicator(progress);
            }
            console.log('✅ Synchronization forced successfully');
            return true;
        } else {
            console.log('❌ Failed to force synchronization');
            return false;
        }
    }

    async showVisualizationSection() {
        const uploadSection = document.getElementById('uploadSection');
        const visualizationSection = document.getElementById('visualizationSection');
        const statsSection = document.getElementById('statsSection');

        if (uploadSection) uploadSection.style.display = 'none';

        if (visualizationSection) {
            visualizationSection.style.display = 'block';
            // Force visibility in case it was hidden by other means
            visualizationSection.style.visibility = 'visible';
            visualizationSection.style.opacity = '1';
            visualizationSection.classList.add('fade-in');

            // Scroll to top to ensure user sees the map
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            console.error('Visualization section element not found!');
        }

        if (statsSection) {
            statsSection.style.display = 'block';
            statsSection.classList.add('fade-in');
        }

        // Initialize live stats and generate elevation profile
        if (this.stats) {
            this.stats.resetLiveStats();
        }
        this.generateElevationProfile();

        // Preserve heart rate data and check availability
        this.preserveHeartRateData();
        this.checkHeartRateData();
    }

    /**
     * Check for heart rate data availability and update UI accordingly
     */
    checkHeartRateData() {
        const heartRateStatus = document.getElementById('heartRateStatus');
        const heartRateZones = document.getElementById('heartRateZones');
        const colorModeHeartRate = document.getElementById('colorModeHeartRate');

        if (!this.currentTrackData || !this.currentTrackData.stats) {
            return;
        }

        // Check both stats and actual track points for heart rate data
        const stats = this.currentTrackData.stats;
        const trackPoints = this.currentTrackData.trackPoints || [];
        const originalTrackData = this.currentTrackData.originalTrackData;

        // Check multiple sources for heart rate data
        const hasHeartRateData = stats.hasHeartRateData ||
            trackPoints.some(p => p.heartRate && p.heartRate > 0) ||
            (originalTrackData && originalTrackData.trackPoints && originalTrackData.trackPoints.some(p => p.heartRate && p.heartRate > 0));

        // Count actual heart rate points from current track data
        let actualHeartRatePoints = trackPoints.filter(p => p.heartRate && p.heartRate > 0).length;
        let actualAvgHeartRate = actualHeartRatePoints > 0 ?
            Math.round(trackPoints.filter(p => p.heartRate && p.heartRate > 0).reduce((sum, p) => sum + p.heartRate, 0) / actualHeartRatePoints) : 0;

        // If no heart rate data in current track points, check original data
        if (actualHeartRatePoints === 0 && originalTrackData && originalTrackData.trackPoints) {
            actualHeartRatePoints = originalTrackData.trackPoints.filter(p => p.heartRate && p.heartRate > 0).length;
            actualAvgHeartRate = actualHeartRatePoints > 0 ?
                Math.round(originalTrackData.trackPoints.filter(p => p.heartRate && p.heartRate > 0).reduce((sum, p) => sum + p.heartRate, 0) / actualHeartRatePoints) : 0;
        }

        console.log('💓 Heart rate data check:', {
            hasData: hasHeartRateData,
            pointsWithData: actualHeartRatePoints,
            totalPoints: trackPoints.length,
            avgHeartRate: actualAvgHeartRate,
            statsHasData: stats.hasHeartRateData,
            statsPointsWithData: stats.heartRateDataPoints || 0,
            source: originalTrackData ? 'originalTrackData' : 'currentTrackData'
        });

        if (heartRateStatus) {
            const statusText = heartRateStatus.querySelector('.hr-status-text');
            if (hasHeartRateData) {
                heartRateStatus.className = 'heart-rate-status has-data';
                if (statusText) {
                    statusText.textContent = `Heart rate data found: ${actualHeartRatePoints} points (${actualAvgHeartRate} avg BPM)`;
                }

                // Show heart rate zones for user input
                if (heartRateZones) {
                    heartRateZones.style.display = 'block';
                    this.initializeHeartRateZones();
                    // Update translations for the newly visible elements
                    setTimeout(() => {
                        if (typeof updatePageTranslations === 'function') {
                            updatePageTranslations();
                        }
                    }, 10);
                }

                // Enable heart rate color mode option
                if (colorModeHeartRate) {
                    colorModeHeartRate.disabled = false;
                }

                // Show the heart rate option when data is available
                const colorModeHeartRateContainer = document.querySelector('input[name="colorMode"][value="heartRate"]').closest('.color-mode-toggle');
                if (colorModeHeartRateContainer) {
                    colorModeHeartRateContainer.style.display = 'flex';
                    // Update translations for the newly visible elements
                    setTimeout(() => {
                        if (typeof updatePageTranslations === 'function') {
                            updatePageTranslations();
                        }
                    }, 10);
                }
            } else {
                heartRateStatus.className = 'heart-rate-status';
                if (statusText) {
                    statusText.textContent = 'No heart rate data detected in this GPX file';
                }

                // Hide heart rate zones
                if (heartRateZones) {
                    heartRateZones.style.display = 'none';
                }

                // Disable heart rate color mode and switch to fixed
                if (colorModeHeartRate) {
                    colorModeHeartRate.disabled = true;
                    const colorModeFixed = document.getElementById('colorModeFixed');
                    if (colorModeFixed) {
                        colorModeFixed.checked = true;
                        // Trigger change event to update UI
                        colorModeFixed.dispatchEvent(new Event('change'));
                    }
                }

                // Hide the heart rate option entirely if no data
                const colorModeHeartRateContainer = document.querySelector('input[name="colorMode"][value="heartRate"]').closest('.color-mode-toggle');
                if (colorModeHeartRateContainer) {
                    colorModeHeartRateContainer.style.display = 'none';
                }
            }
        }
    }

    /**
     * Initialize heart rate zones with default values
     */
    initializeHeartRateZones() {
        const defaults = heartRateColorMapper.getDefaultZoneValues();

        Object.keys(defaults).forEach(key => {
            const input = document.getElementById(key);
            if (input && !input.value) {
                input.value = defaults[key];
            }
        });

        // Initialize color pickers after zones are set up
        heartRateColorMapper.initializeColorPickers();
    }

    /**
     * Ensure heart rate data is preserved in track data
     * This method should be called after any data transformations
     */
    preserveHeartRateData() {
        if (!this.currentTrackData || !this.currentTrackData.trackPoints) {
            return;
        }

        // Check if we have heart rate data in the current track
        const hasHeartRateData = this.currentTrackData.trackPoints.some(p => p.heartRate && p.heartRate > 0);

        if (hasHeartRateData) {
            console.log('💓 Heart rate data preserved in track data');
            // Update stats to reflect heart rate data availability
            if (this.currentTrackData.stats) {
                this.currentTrackData.stats.hasHeartRateData = true;
            }
        }
    }

    updateStats(stats) {
        // Delegate to StatsController for comprehensive stats handling
        if (this.stats && typeof this.stats.updateStats === 'function') {
            this.stats.updateStats(stats);
        } else {
            // Fallback to basic implementation
            const elements = {
                'totalDistance': stats.totalDistance ? `${stats.totalDistance.toFixed(2)} km` : '0 km',
                'elevationGain': stats.elevationGain ? `${Math.round(stats.elevationGain)} m` : '0 m',
                'totalTime': this.formatTimeInSeconds(this.state.totalAnimationTime)
            };

            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
        }
    }

    formatTimeInSeconds(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    updateStatsDisplay() {
        if (!this.currentTrackData) return;

        let stats = this.currentTrackData.stats;

        // If GPX-only stats is enabled and this is a journey, recalculate stats
        if (this.state.gpxOnlyStats && this.currentTrackData.isJourney && this.currentTrackData.segments) {
            stats = this.calculateGpxOnlyStats(this.currentTrackData);
        }

        this.updateStats(stats);
    }

    // Calculate stats including only GPX track segments (excluding transportation)
    calculateGpxOnlyStats(journeyData) {
        let totalDistance = 0;
        let totalElevationGain = 0;

        if (journeyData.segments) {
            journeyData.segments.forEach(segment => {
                // Only include track segments, skip transportation segments
                if (segment.type === 'track' && segment.data && segment.data.stats) {
                    totalDistance += segment.data.stats.totalDistance || 0;
                    totalElevationGain += segment.data.stats.elevationGain || 0;
                }
            });
        }

        return {
            totalDistance,
            elevationGain: totalElevationGain
        };
    }

    updateProgressBarMarkers() {
        // Icon change markers (already fixed)
        if (this.icon) this.icon.updateProgressBarMarkers();

        // --- Annotation markers ---
        const annotationMarkers = document.getElementById('annotationMarkers');
        if (!annotationMarkers || !this.mapRenderer) return;
        annotationMarkers.innerHTML = '';
        // Combine normal and picture annotations
        const annotations = [
            ...(this.mapRenderer.getAnnotations() || []),
            ...(this.mapRenderer.getPictureAnnotations ? this.mapRenderer.getPictureAnnotations() : [])
        ];
        if (!annotations) return;

        const elevationProfile = this.elevationProfile;
        const points = elevationProfile?.points;
        const pointsLength = points?.length;
        const svgWidth = elevationProfile?.svgWidth || 800;
        const renderedWidth = annotationMarkers.offsetWidth || svgWidth;

        annotations.forEach(annotation => {
            const marker = document.createElement('div');
            marker.className = 'progress-marker annotation-marker';
            let leftPx = 0;
            if (points && pointsLength > 0) {
                // Place marker by track point index (distance-based), scaled to rendered width
                const index = Math.round(annotation.progress * (pointsLength - 1));
                const [x] = points[index].split(',').map(Number);
                leftPx = (x / svgWidth) * renderedWidth;
                marker.style.left = `${leftPx}px`;
            } else {
                marker.style.left = `${annotation.progress * 100}%`;
            }
            marker.title = annotation.title || '';
            marker.textContent = annotation.icon || (annotation.type === 'picture' ? '📸' : '📍');
            annotationMarkers.appendChild(marker);
        });
    }

    setupTimingSynchronization() {
        // Listen for segment timing updates from journey controller
        document.addEventListener('segmentTimingUpdate', (e) => {
            console.log('🎯 MAIN APP: Received segmentTimingUpdate event:', e.detail);
            this.handleSegmentTimingUpdate(e.detail);
        });

        // Listen for journey data load events
        document.addEventListener('journeyDataLoaded', (e) => {
            console.log('🎯 MAIN APP: Received journeyDataLoaded event:', e.detail);
            if (e.detail && e.detail.segments) {
                // Calculate timing for the loaded journey
                const segmentTiming = this.calculateSegmentTiming(e.detail.segments);
                this.handleSegmentTimingUpdate({ segments: e.detail.segments, newSegmentTiming: segmentTiming });
            }
        });

        // Set up progress bar to synchronize timing during seeking
        document.addEventListener('progressSeek', (e) => {
            if (this.currentTrackData && this.currentTrackData.isJourney && this.currentTrackData.segmentTiming) {
                const progress = e.detail.progress;
                const segmentTime = this.convertLinearProgressToSegmentTime(progress);

                if (segmentTime !== null) {
                    this.mapRenderer.setJourneyElapsedTime(segmentTime);
                    console.log(`🔄 Progress seek: Updated journey time to ${segmentTime.toFixed(1)}s for progress ${progress.toFixed(3)}`);
                }
            }
        });

        // Set up playback synchronization during animation
        document.addEventListener('animationFrame', (e) => {
            if (this.currentTrackData && this.currentTrackData.isJourney && this.currentTrackData.segmentTiming && this.state.isPlaying) {
                const progress = this.mapRenderer.getCurrentProgress();
                const journeyTime = this.mapRenderer.getJourneyElapsedTime();

                if (journeyTime !== undefined) {
                    const expectedTime = this.convertLinearProgressToSegmentTime(progress);

                    if (expectedTime !== null && !isNaN(expectedTime)) {
                        const timeDiff = Math.abs(journeyTime - expectedTime);

                        // If timing drift is significant (>1 second), correct it
                        if (timeDiff > 1) {
                            console.log(`🔄 Auto-correction: journey time ${journeyTime.toFixed(1)}s → ${expectedTime.toFixed(1)}s`);
                            this.mapRenderer.setJourneyElapsedTime(expectedTime);
                        }
                    }
                }
            }
        });


    }

    // Video export support methods
    async enhancedTilePreloading(progressCallback) {
        if (!this.mapRenderer || !this.currentTrackData) return;

        const trackPoints = this.currentTrackData.trackPoints;
        if (!trackPoints || trackPoints.length === 0) return;

        console.log('Starting enhanced tile preloading for video export');

        // Use basic tile preloading for now - can be enhanced later
        if (progressCallback) {
            for (let i = 0; i <= 100; i += 10) {
                await new Promise(resolve => setTimeout(resolve, 50));
                progressCallback(i);
            }
        }

        console.log('Enhanced tile preloading completed');
    }

    async waitForMapTilesToLoadWithTimeout(timeoutMs = 8000) {
        if (!this.mapRenderer || !this.mapRenderer.map) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                console.warn('Map tiles loading timeout reached');
                resolve();
            }, timeoutMs);

            // Wait for map to be idle (all tiles loaded)
            const onIdle = () => {
                clearTimeout(timeoutId);
                console.log('Map tiles loaded successfully');
                resolve();
            };

            this.mapRenderer.map.once('idle', onIdle);
        });
    }

    // Comparison Mode Methods
    async loadComparisonTrack(file) {
        try {
            console.log('🔍 Starting comparison track load process...');

            // Check if we have a main track loaded
            if (!this.currentTrackData) {
                const errorMsg = 'Please load a main GPX track first before loading a comparison track.';
                console.error('❌', errorMsg);
                alert(errorMsg);
                return;
            }

            console.log('✅ Main track found:', this.currentTrackData.filename || 'unnamed track');
            console.log('📁 Loading comparison track:', file.name);

            // Create a new GPX parser for the comparison track
            this.comparisonGpxParser = new (await import('../gpxParser.js')).GPXParser();

            // Parse the comparison track
            this.comparisonTrackData = await this.comparisonGpxParser.parseFile(file);

            console.log('✅ Comparison track loaded successfully:', this.comparisonTrackData.stats);

            // Check if comparison track has time data
            const compPointsWithTime = this.comparisonTrackData.trackPoints.filter(p => p.time).length;
            console.log(`⏱️ Comparison track time analysis: ${compPointsWithTime}/${this.comparisonTrackData.trackPoints.length} points have time data`);

            if (compPointsWithTime === 0) {
                console.log('⚠️ Comparison track has no time data - prompting user for synthetic generation');
                this.comparisonTrackData.stats.hasTimeData = false;
                this.comparisonTrackData.stats.startTime = null;
                this.comparisonTrackData.stats.endTime = null;

                // Show user-friendly message with option to generate time data
                console.log('🔄 About to show confirm dialog...');
                let generateTimeData;

                try {
                    generateTimeData = confirm(
                        'The comparison track has no time data. Would you like to generate estimated time data based on distance and speed?\n\n' +
                        'This will allow synchronized animation. If you choose "Cancel", tracks will play at the same pace for route comparison only.'
                    );
                    console.log('🔄 User choice for synthetic time generation:', generateTimeData);
                } catch (error) {
                    console.error('❌ Error showing confirm dialog:', error);
                    // Fallback: assume user wants synthetic time data if dialog fails
                    generateTimeData = true;
                    console.log('🔄 Dialog failed, defaulting to synthetic time generation');
                }

                // If dialog was blocked or user didn't see it, show a message and default to generating time data
                if (generateTimeData === undefined) {
                    console.log('⚠️ Confirm dialog may have been blocked, defaulting to time generation');
                    this.showMessage?.('Generating synthetic time data for synchronized animation...', 'info');
                    generateTimeData = true;
                }

                if (generateTimeData) {
                    console.log('🔧 Generating synthetic time data for comparison track...');
                    this.generateSyntheticTimeData(this.comparisonTrackData);
                    console.log('✅ Synthetic time data generation completed');
                    console.log('🔍 Comparison track stats after synthetic generation:', this.comparisonTrackData.stats);
                    this.showMessage?.('Time data generated successfully! Tracks will now play in sync.', 'success');
                } else {
                    console.log('🔄 Using spatial comparison mode');
                    this.showMessage?.('Using spatial comparison mode. Both tracks will play at the same pace.', 'info');
                }
            }

            // Check for time overlap with main track
            console.log('🔍 Checking for time overlap...');
            const overlapResult = this.checkTimeOverlap();
            console.log('🔍 checkTimeOverlap() returned:', overlapResult);
            console.log('🔍 this.timeOverlap after checkTimeOverlap():', this.timeOverlap);

            if (overlapResult) {
                console.log('✅ Time overlap found:', overlapResult);
            } else {
                console.log('⚠️ No time overlap detected');
                console.log('🔍 overlapResult type:', typeof overlapResult);
                console.log('🔍 overlapResult value:', overlapResult);
            }

            // Enable comparison mode
            console.log('🔧 Enabling comparison mode...');
            this.enableComparisonMode();

            console.log('🎉 Comparison mode setup complete!');

        } catch (error) {
            console.error('❌ Error loading comparison track:', error);
            alert('Error loading comparison track: ' + error.message);
        }
    }

    enableComparisonMode() {
        console.log('🔄 Enabling comparison mode...');
        console.log('📊 Current state:', {
            hasCurrentTrack: !!this.currentTrackData,
            hasComparisonTrack: !!this.comparisonTrackData,
            hasJourney: !!this.journey,
            comparisonMode: this.comparisonMode,
            hasMapRenderer: !!this.mapRenderer
        });

        // If we have a journey loaded but no main track, try to extract the track from journey
        if (!this.currentTrackData && this.journey && this.journey.journeyData && this.journey.journeyData.segments) {
            console.log('📋 Attempting to extract track from journey for comparison mode...');
            const extracted = this.extractTrackFromJourney();

            if (extracted && this.currentTrackData) {
                // Load the extracted track to the map
                console.log('🗺️ Loading extracted track to map...');
                this.map.loadTrackData(this.currentTrackData);
                this.showVisualizationSection();
                this.updateStats(this.currentTrackData.stats);
                this.generateElevationProfile();
                this.updateStats(this.currentTrackData.stats);
            }
        }

        if (!this.currentTrackData) {
            console.warn('Cannot enable comparison mode: no main track data available');
            alert('Please load a GPX track first before enabling comparison mode.');
            return;
        }

        if (!this.mapRenderer) {
            console.error('Cannot enable comparison mode: MapRenderer not available');
            alert('Map is not ready yet. Please wait for the map to load completely.');
            return;
        }

        this.comparisonMode = true;
        console.log('✅ Comparison mode flag set to true');

        // Initialize track customizations if not already done
        this.initializeTrackCustomizations();

        // Update translations for the newly visible comparison elements
        setTimeout(() => {
            if (typeof updatePageTranslations === 'function') {
                updatePageTranslations();
            }
            // Also update placeholders
            this.updatePlaceholders();
        }, 50);

        // If we have a comparison track, enable it
        if (this.comparisonTrackData) {
            console.log('🔧 Setting up comparison track with data:', {
                trackPoints: this.comparisonTrackData.trackPoints?.length,
                hasTimeData: this.comparisonTrackData.trackPoints?.some(p => p.time),
                timeOverlap: !!this.timeOverlap
            });

            console.log('🔧 Passing data to map renderer:', {
                comparisonTrackData: !!this.comparisonTrackData,
                timeOverlap: this.timeOverlap,
                timeOverlapType: typeof this.timeOverlap,
                hasOverlap: this.timeOverlap?.hasOverlap,
                spatialOnly: this.timeOverlap?.spatialOnly
            });

            try {
                // Add comparison track to map with time overlap data
                this.mapRenderer.addComparisonTrack(this.comparisonTrackData, this.timeOverlap);
                console.log('✅ Comparison mode enabled successfully');
            } catch (error) {
                console.error('❌ Error enabling comparison mode:', error);
                alert('Error enabling comparison mode: ' + error.message);
                this.comparisonMode = false;
            }
        } else {
            console.log('ℹ️ Comparison mode enabled - ready to load comparison track');
        }

        // Verify the setup
        console.log('🔍 Verification after setup:', {
            comparisonMode: this.comparisonMode,
            mapRendererComparisonData: !!this.mapRenderer?.comparisonTrackData,
            mapRendererComparisonParser: !!this.mapRenderer?.comparisonGpxParser
        });
    }

    // Generate synthetic time data for tracks without time stamps
    generateSyntheticTimeData(trackData) {
        if (!trackData || !trackData.trackPoints || trackData.trackPoints.length === 0) {
            console.error('Cannot generate synthetic time data: invalid track data');
            return;
        }

        console.log('🔧 Generating synthetic time data for track...');

        const points = trackData.trackPoints;

        // Use main track's time range if available for synchronization
        let startTime;
        if (this.currentTrackData && this.currentTrackData.stats.startTime) {
            // Synchronize with main track by using the same time range
            const mainDuration = this.currentTrackData.stats.totalDuration || 1; // hours
            const trackDuration = trackData.stats.totalDuration || (trackData.stats.totalDistance / 8); // estimate
            const timeRatio = trackDuration / mainDuration;

            startTime = new Date(this.currentTrackData.stats.startTime);
            console.log('🔄 Synchronizing with main track time range');
        } else {
            // Fallback to current time
            startTime = new Date();
        }

        let cumulativeTime = 0; // seconds

        // Estimate average speed based on activity type (could be made configurable)
        const estimatedSpeed = 8; // km/h - reasonable for walking/hiking

        for (let i = 0; i < points.length; i++) {
            const point = points[i];

            if (i === 0) {
                // First point starts at startTime
                point.time = new Date(startTime);
            } else {
                // Calculate time based on distance from previous point
                const prevPoint = points[i - 1];
                const distanceKm = Math.max(0, point.distance - prevPoint.distance);

                if (distanceKm > 0) {
                    const timeForSegment = distanceKm / estimatedSpeed; // hours
                    cumulativeTime += timeForSegment * 3600; // convert to seconds
                }

                point.time = new Date(startTime.getTime() + (cumulativeTime * 1000));
            }

            // Also update speed if not present
            if (!point.speed || point.speed === 0) {
                point.speed = estimatedSpeed;
            }
        }

        // Update track statistics
        const endTime = points[points.length - 1].time;
        const durationHours = (endTime - startTime) / (1000 * 60 * 60);

        trackData.stats.startTime = startTime;
        trackData.stats.endTime = endTime;
        trackData.stats.totalDuration = durationHours;
        trackData.stats.hasTimeData = true;

        console.log('✅ Synthetic time data generated:', {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: durationHours.toFixed(2) + ' hours',
            avgSpeed: estimatedSpeed + ' km/h',
            synchronized: this.currentTrackData?.stats.startTime ? 'with main track' : 'standalone'
        });

        // Verify the time data was applied correctly
        const pointsWithTimeAfter = points.filter(p => p.time).length;
        console.log(`🔍 Verification: ${pointsWithTimeAfter}/${points.length} points now have time data`);

        if (pointsWithTimeAfter === 0) {
            console.error('❌ ERROR: No time data was applied to track points!');
        }
    }

    // Debug function to force synthetic time data generation
    forceSyntheticTimeData() {
        console.log('🔧 Force generating synthetic time data...');

        if (!this.comparisonTrackData) {
            console.error('❌ No comparison track data available');
            alert('Please load a comparison track first');
            return;
        }

        // Generate synthetic time data
        this.generateSyntheticTimeData(this.comparisonTrackData);

        // Re-check time overlap
        console.log('🔍 Re-checking time overlap after forced generation...');
        const overlapResult = this.checkTimeOverlap();

        if (overlapResult) {
            console.log('✅ Time overlap detected after forced generation:', overlapResult);

            // Re-enable comparison mode with new time data
            this.enableComparisonMode();

            this.showMessage?.('Synthetic time data generated and comparison mode updated!', 'success');
        } else {
            console.log('⚠️ Still no time overlap after forced generation');
            this.showMessage?.('Time data generated but no overlap detected', 'warning');
        }
    }

    // Debug function to inspect comparison track data
    debugComparisonTrack() {
        console.log('🔍 Comparison Track Debug Info:');
        console.log('================================');

        if (!this.comparisonTrackData) {
            console.log('❌ No comparison track data loaded');
            return;
        }

        const points = this.comparisonTrackData.trackPoints || [];
        const pointsWithTime = points.filter(p => p.time);
        const stats = this.comparisonTrackData.stats || {};

        console.log('📊 Basic Info:');
        console.log('  Total points:', points.length);
        console.log('  Points with time:', pointsWithTime.length);
        console.log('  Has time data:', !!(stats.startTime && stats.endTime));

        console.log('⏱️ Time Range:');
        console.log('  Start time:', stats.startTime ? stats.startTime.toLocaleString() : 'null');
        console.log('  End time:', stats.endTime ? stats.endTime.toLocaleString() : 'null');
        console.log('  Duration:', stats.totalDuration ? stats.totalDuration.toFixed(2) + ' hours' : 'null');

        if (pointsWithTime.length > 0) {
            console.log('🔍 Time Data Samples:');
            console.log('  First point time:', pointsWithTime[0].time?.toLocaleString());
            console.log('  Last point time:', pointsWithTime[pointsWithTime.length - 1].time?.toLocaleString());
            console.log('  Middle point time:', pointsWithTime[Math.floor(pointsWithTime.length / 2)].time?.toLocaleString());
        }

        console.log('🎯 Overlap Info:');
        console.log('  Time overlap object:', this.timeOverlap);
        console.log('  Has overlap:', this.timeOverlap?.hasOverlap);
        console.log('  Spatial only:', this.timeOverlap?.spatialOnly);

        console.log('================================');
    }

    // Track customization methods
    updateTrackName(trackNumber, name) {
        const trimmed = (name ?? '').trim();
        // Track 1 keeps a default; Track 2 allows empty to hide label
        if (trackNumber === 1) {
            name = trimmed || 'Track 1';
        } else if (trackNumber === 2) {
            name = trimmed; // may be empty string to indicate hidden
        }

        console.log(`📝 Updating track ${trackNumber} name to: "${name}"`);

        // Update the map renderer
        if (this.mapRenderer) {
            this.mapRenderer.updateTrackLabel(trackNumber, name);
        }

        // Store the customization
        if (!this.trackCustomizations) {
            this.trackCustomizations = {};
        }
        this.trackCustomizations[`track${trackNumber}Name`] = name;
    }

    updateTrackColor(trackNumber, color) {
        console.log(`🎨 Updating track ${trackNumber} color to: ${color}`);

        // For now, only track 2 color is customizable
        if (trackNumber === 2) {
            if (this.mapRenderer) {
                this.mapRenderer.setTrackColors(null, color);
            }

            // Store the customization
            if (!this.trackCustomizations) {
                this.trackCustomizations = {};
            }
            this.trackCustomizations.track2Color = color;
        }
    }

    applyTrackCustomizations(options) {
        console.log('🎯 Applying track customizations:', options);

        const { track1Name, track2Name, track2Color } = options;

        // Apply name changes
        if (track1Name) {
            this.updateTrackName(1, track1Name);
        }
        if (track2Name) {
            this.updateTrackName(2, track2Name);
        }

        // Apply color changes
        if (track2Color) {
            this.updateTrackColor(2, track2Color);
        }

        // Update UI inputs to reflect applied changes
        this.updateCustomizationInputs();

        this.showMessage?.('Track customizations applied successfully!', 'success');
    }

    initializeTrackCustomizations() {
        // Initialize track customizations with defaults if not already set
        if (!this.trackCustomizations) {
            this.trackCustomizations = {
                track1Name: 'Track 1',
                track2Name: 'Track 2',
                track2Color: '#DC2626' // Default red color
            };
        }

        // Update the UI inputs with current customizations
        this.updateCustomizationInputs();

        console.log('🎨 Track customizations initialized:', this.trackCustomizations);
    }

    updateCustomizationInputs() {
        // Update input fields to reflect current customizations
        const track1NameInput = document.getElementById('track1Name');
        const track2NameInput = document.getElementById('track2Name');
        const track2ColorPicker = document.getElementById('track2Color');
        const track2ColorHex = document.getElementById('track2ColorHex');

        if (this.trackCustomizations) {
            if (track1NameInput) {
                track1NameInput.value = (this.trackCustomizations.track1Name ?? 'Track 1') || 'Track 1';
            }
            if (track2NameInput) {
                // Preserve empty string if user cleared it
                track2NameInput.value = (this.trackCustomizations.track2Name ?? '');
            }
            if (track2ColorPicker) {
                track2ColorPicker.value = this.trackCustomizations.track2Color || '#DC2626';
            }
            if (track2ColorHex) {
                track2ColorHex.value = this.trackCustomizations.track2Color || '#DC2626';
            }
        }
    }

    // Debug function to test translation system
    testTranslations() {
        console.log('🔍 Translation System Test:');
        console.log('================================');

        // Test some known working translations
        const testKeys = [
            'controls.comparisonSettings',
            'controls.enableComparison',
            'controls.secondTrack',
            'controls.selectTrack'
        ];

        testKeys.forEach(key => {
            const translation = t(key);
            console.log(`${key}: "${translation}"`);
        });

        console.log('================================');
        console.log('New comparison keys:');

        // Test the new comparison keys
        const newKeys = [
            'controls.comparisonInstructionsTitle',
            'controls.comparisonInstructionsStep1',
            'controls.comparisonNamesTitle',
            'controls.comparisonColorTitle',
            'controls.comparisonColorReset'
        ];

        newKeys.forEach(key => {
            const translation = t(key);
            console.log(`${key}: "${translation}"`);
        });

        console.log('================================');
    }

    // Extract track data from journey for comparison mode
    extractTrackFromJourney() {
        if (!this.journey || !this.journey.journeyData || !this.journey.journeyData.segments) {
            console.log('❌ No journey data available to extract');
            return false;
        }

        console.log('📋 Extracting track from journey:', this.journey.journeyData.segments);

        // Look for the first track segment
        const trackSegment = this.journey.journeyData.segments.find(seg => seg.type === 'track');

        if (trackSegment && trackSegment.data && trackSegment.data.data && trackSegment.data.data.trackPoints) {
            console.log('✅ Found track segment with original data');

            // Extract the original track data
            this.currentTrackData = {
                trackPoints: trackSegment.data.data.trackPoints,
                stats: trackSegment.data.stats || trackSegment.stats,
                filename: trackSegment.data.filename || trackSegment.name,
                bounds: this.calculateBounds(trackSegment.data.data.trackPoints)
            };

            console.log('📊 Extracted track data:', {
                points: this.currentTrackData.trackPoints.length,
                hasTimeData: this.currentTrackData.trackPoints.some(p => p.time),
                filename: this.currentTrackData.filename
            });

            return true;
        }

        console.log('⚠️ Could not find suitable track segment in journey');
        return false;
    }

    // Calculate bounds from track points
    calculateBounds(trackPoints) {
        if (!trackPoints || trackPoints.length === 0) return null;

        const validPoints = trackPoints.filter(p => !isNaN(p.lat) && !isNaN(p.lon));

        if (validPoints.length === 0) return null;

        const lats = validPoints.map(p => p.lat);
        const lons = validPoints.map(p => p.lon);

        return {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lons),
            west: Math.min(...lons),
            center: [
                (Math.min(...lons) + Math.max(...lons)) / 2,
                (Math.min(...lats) + Math.max(...lats)) / 2
            ]
        };
    }

    // Stats selection methods
    getSelectedEndStats() {
        return this.selectedEndStats;
    }

    updateSelectedStats() {
        const checkboxes = document.querySelectorAll('#statsSelectionContainer input[type="checkbox"]');
        this.selectedEndStats = Array.from(checkboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.id.replace('stat', '').toLowerCase());

        console.log('Updated selected stats:', this.selectedEndStats);
        console.log('Checkboxes found:', checkboxes.length);
        checkboxes.forEach(cb => {
            console.log(`${cb.id}: ${cb.checked}`);
        });
    }

    initializeStatsSelection() {
        const showEndStatsToggle = document.getElementById('showEndStats');
        const statsContainer = document.getElementById('statsSelectionContainer');

        if (showEndStatsToggle && statsContainer) {
            // Show/hide stats selection based on toggle
            const updateStatsVisibility = () => {
                if (showEndStatsToggle.checked) {
                    statsContainer.style.display = 'block';
                } else {
                    statsContainer.style.display = 'none';
                }
            };

            showEndStatsToggle.addEventListener('change', updateStatsVisibility);
            updateStatsVisibility(); // Initial state
        }

        // Add event listeners to stat checkboxes
        const statCheckboxes = document.querySelectorAll('#statsSelectionContainer input[type="checkbox"]');
        statCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSelectedStats());
        });

        // Initialize selected stats from current checkboxes
        this.updateSelectedStats();
    }

    setShowSegmentSpeeds(enabled) {
        this.state.showSegmentSpeeds = enabled;

        if (this.stats) {
            this.stats.updateSegmentSpeedVisibility?.(enabled);
            if (enabled) {
                this.stats.refreshSegmentSpeedStats?.();
                this.stats.updateSpeedDisplayMode?.();
            }
        }
    }

    setShowLiveElevationLabel(enabled) {
        const normalized = Boolean(enabled);
        this.state.showLiveElevationLabel = normalized;

        if (!normalized) {
            this.hideLiveElevationLabel();
            return;
        }

        this.lastLiveElevationLeft = null;
        this.lastLiveElevationValue = null;
        this.lastLiveElevationProgress = null;

        const currentProgress = this.mapRenderer?.getAnimationProgress?.() ?? 0;
        this.updateElevationProgress(currentProgress, { force: true });
    }

    setSpeedDisplayMode(mode) {
        const normalized = mode === 'pace' ? 'pace' : 'speed';
        if (this.state.speedDisplayMode === normalized) return;
        this.state.speedDisplayMode = normalized;

        if (this.stats) {
            this.stats.updateSpeedDisplayMode?.();
        }
    }

    disableComparisonMode() {
        console.log('🔄 Disabling comparison mode...');
        this.comparisonMode = false;

        // Remove comparison track from map
        if (this.mapRenderer) {
            this.mapRenderer.removeComparisonTrack();
        }

        // Clear comparison data
        this.comparisonTrackData = null;
        this.comparisonGpxParser = null;

        // If we have journey data, we might need to reload it
        if (this.journey && this.journey.journeyData) {
            console.log('📋 Journey data exists - comparison mode disabled, journey mode active');
            // The journey should still be available for normal playback
        }

        console.log('✅ Comparison mode disabled');
    }

    // Debug method to check current app state
    debugAppState() {
        console.log('🔍 App State Debug:');
        console.log('  - Current Track Data:', this.currentTrackData ? '✅ Loaded' : '❌ Not loaded');
        console.log('  - Comparison Mode:', this.comparisonMode ? '✅ Enabled' : '❌ Disabled');
        console.log('  - Comparison Track Data:', this.comparisonTrackData ? '✅ Loaded' : '❌ Not loaded');
        console.log('  - Map Renderer:', this.mapRenderer ? '✅ Available' : '❌ Not available');
        console.log('  - Time Overlap:', this.timeOverlap ? '✅ Detected' : '❌ Not detected');

        if (this.currentTrackData) {
            console.log('  - Main track stats:', this.currentTrackData.stats);
        }
        if (this.comparisonTrackData) {
            console.log('  - Comparison track stats:', this.comparisonTrackData.stats);
        }
        if (this.timeOverlap) {
            console.log('  - Time overlap info:', this.timeOverlap);
        }
    }

    // Test comparison mode elements
    testComparisonMode() {
        console.log('🧪 Testing comparison mode setup...');
        const enableToggle = document.getElementById('enableComparison');
        const fileInput = document.getElementById('comparisonFile');
        const loadBtn = document.getElementById('loadComparisonBtn');
        const fileGroup = document.getElementById('comparisonFileGroup');
        const selectBtn = document.querySelector('#comparisonFileGroup .upload-btn');

        console.log('🔍 Elements found:');
        console.log('  - Enable toggle:', enableToggle ? '✅' : '❌');
        console.log('  - File input:', fileInput ? '✅' : '❌');
        console.log('  - Select button:', selectBtn ? '✅' : '❌');
        console.log('  - Load button:', loadBtn ? '✅' : '❌');
        console.log('  - File group:', fileGroup ? '✅' : '❌');
        console.log('  - File group display:', fileGroup ? fileGroup.style.display : 'N/A');

        if (fileInput) {
            console.log('  - File input visibility:', window.getComputedStyle(fileInput).display);
            console.log('  - File input files:', fileInput.files);
            console.log('  - File input files length:', fileInput.files ? fileInput.files.length : 'N/A');
        }

        return {
            enableToggle: !!enableToggle,
            fileInput: !!fileInput,
            selectBtn: !!selectBtn,
            loadBtn: !!loadBtn,
            fileGroup: !!fileGroup,
            fileGroupVisible: fileGroup && fileGroup.style.display !== 'none',
            fileInputVisible: fileInput && window.getComputedStyle(fileInput).display !== 'none'
        };
    }

    // Check for time overlap between main and comparison tracks
    checkTimeOverlap() {
        if (!this.currentTrackData || !this.comparisonTrackData) {
            console.log('Cannot check time overlap: missing track data');
            return null;
        }

        const mainStart = this.currentTrackData.stats.startTime;
        const mainEnd = this.currentTrackData.stats.endTime;
        const compStart = this.comparisonTrackData.stats.startTime;
        const compEnd = this.comparisonTrackData.stats.endTime;

        // Debug: Log time data for both tracks
        console.log('🔍 Time data check:');
        console.log('  Main track startTime:', mainStart, 'endTime:', mainEnd);
        console.log('  Comparison track startTime:', compStart, 'endTime:', compEnd);
        console.log('  Main track points with time:', this.currentTrackData.trackPoints.filter(p => p.time).length);
        console.log('  Comparison track points with time:', this.comparisonTrackData.trackPoints.filter(p => p.time).length);

        // Additional debugging for main track
        console.log('  Main track stats object:', this.currentTrackData.stats);
        console.log('  Main track stats keys:', Object.keys(this.currentTrackData.stats || {}));

        // If main track has time data in points but not in stats, recalculate
        if (!mainStart && this.currentTrackData.trackPoints.some(p => p.time)) {
            console.log('🔧 Main track has time data in points but not in stats - recalculating...');
            const mainTimes = this.currentTrackData.trackPoints.filter(p => p.time).map(p => p.time.getTime());
            if (mainTimes.length > 0) {
                this.currentTrackData.stats.startTime = new Date(Math.min(...mainTimes));
                this.currentTrackData.stats.endTime = new Date(Math.max(...mainTimes));
                console.log('✅ Recalculated main track stats:', {
                    startTime: this.currentTrackData.stats.startTime,
                    endTime: this.currentTrackData.stats.endTime
                });
            }
        }

        // Update local variables with recalculated times
        const finalMainStart = this.currentTrackData.stats.startTime || mainStart;
        const finalMainEnd = this.currentTrackData.stats.endTime || mainEnd;

        // Check if both tracks have SOME time data - be more lenient
        const mainHasTime = (finalMainStart && finalMainEnd) || this.currentTrackData.trackPoints.some(p => p.time);
        const compHasTime = (compStart && compEnd) || this.comparisonTrackData.trackPoints.some(p => p.time);

        if (!mainHasTime || !compHasTime) {
            console.log('⚠️ Time overlap check: One or both tracks missing time data');
            console.log('  Main track has time:', mainHasTime, 'Comp track has time:', compHasTime);

            if (!mainHasTime && !compHasTime) {
                console.log('🔄 Both tracks missing time data - enabling spatial comparison mode');
                this.showMessage('Both tracks are missing time data. Enabling spatial comparison mode (no time synchronization).', 'info');

                // Enable comparison mode without time overlap for spatial comparison
                return {
                    hasOverlap: false,
                    spatialOnly: true,
                    mainStart: null,
                    mainEnd: null,
                    compStart: null,
                    compEnd: null,
                    overlapDuration: 0
                };
            } else if (!compHasTime) {
                console.log('🔄 Comparison track missing time data - enabling spatial comparison mode');
                this.showMessage('Comparison track missing time data. Enabling spatial comparison mode.', 'info');

                // Enable comparison mode without time overlap for spatial comparison
                return {
                    hasOverlap: false,
                    spatialOnly: true,
                    mainStart: finalMainStart,
                    mainEnd: finalMainEnd,
                    compStart: null,
                    compEnd: null,
                    overlapDuration: 0
                };
            } else {
                this.showMessage('Main track is missing time data. Try loading a different GPX file with time information.', 'warning');
            }
            return null;
        }

        // For tracks without proper stats, try to estimate time ranges
        let finalCompStart = compStart;
        let finalCompEnd = compEnd;

        if (!compStart && this.comparisonTrackData.trackPoints.some(p => p.time)) {
            console.log('🔧 Comparison track has time data in points but not in stats - estimating...');
            const compTimes = this.comparisonTrackData.trackPoints.filter(p => p.time).map(p => p.time.getTime());
            if (compTimes.length > 0) {
                finalCompStart = new Date(Math.min(...compTimes));
                finalCompEnd = new Date(Math.max(...compTimes));
                console.log('✅ Estimated comparison track time range:', finalCompStart, 'to', finalCompEnd);
            }
        }

        // Calculate overlap using final times
        const mainStartTime = finalMainStart;
        const mainEndTime = finalMainEnd;
        const compStartTime = finalCompStart;
        const compEndTime = finalCompEnd;

        if (!mainStartTime || !mainEndTime || !compStartTime || !compEndTime) {
            console.log('⚠️ Still missing time data after calculation attempts');
            return null;
        }

        const overlapStart = Math.max(mainStartTime.getTime(), compStartTime.getTime());
        const overlapEnd = Math.min(mainEndTime.getTime(), compEndTime.getTime());

        const hasOverlap = overlapStart < overlapEnd;
        const overlapDuration = hasOverlap ? (overlapEnd - overlapStart) / 1000 / 60 : 0;

        const overlap = {
            hasOverlap: hasOverlap,
            overlapStart: new Date(overlapStart),
            overlapEnd: new Date(overlapEnd),
            overlapDuration: overlapDuration, // minutes
            mainStart: mainStartTime,
            mainEnd: mainEndTime,
            compStart: compStartTime,
            compEnd: compEndTime
        };

        console.log('🔍 Raw overlap calculation:', {
            overlapStart: overlapStart,
            overlapEnd: overlapEnd,
            hasOverlap: hasOverlap,
            overlapDuration: overlapDuration
        });

        console.log('🎯 Final overlap calculation:');
        console.log('  Main track:', mainStartTime.toLocaleTimeString(), 'to', mainEndTime.toLocaleTimeString());
        console.log('  Comparison track:', compStartTime.toLocaleTimeString(), 'to', compEndTime.toLocaleTimeString());
        console.log('  Overlap duration:', overlap.overlapDuration.toFixed(1), 'minutes');

        if (overlap.hasOverlap) {
            console.log('✅ Time overlap detected:', {
                overlapMinutes: overlap.overlapDuration.toFixed(1),
                mainTrack: `${mainStartTime.toLocaleTimeString()} - ${mainEndTime.toLocaleTimeString()}`,
                comparisonTrack: `${compStartTime.toLocaleTimeString()} - ${compEndTime.toLocaleTimeString()}`
            });

            console.log('🔍 Overlap object details:', {
                hasOverlap: overlap.hasOverlap,
                overlapDuration: overlap.overlapDuration,
                isTruthy: !!overlap,
                objectKeys: Object.keys(overlap)
            });

            this.showMessage(`Time overlap detected: ${overlap.overlapDuration.toFixed(1)} minutes - simultaneous playback enabled!`, 'success');

            // Store overlap data for the map renderer
            this.timeOverlap = overlap;
            console.log('🔄 Stored timeOverlap data:', this.timeOverlap);

            // Verify time data is preserved in track points
            const mainTimePoints = this.currentTrackData.trackPoints.filter(p => p.time).length;
            const compTimePoints = this.comparisonTrackData.trackPoints.filter(p => p.time).length;
            console.log(`📊 Time data verification: Main track has ${mainTimePoints}/${this.currentTrackData.trackPoints.length} points with time`);
            console.log(`📊 Time data verification: Comparison track has ${compTimePoints}/${this.comparisonTrackData.trackPoints.length} points with time`);

            console.log('✅ Returning overlap object:', overlap);
            console.log('🔍 About to return from checkTimeOverlap method');
            return overlap;
        } else if (overlap.spatialOnly) {
            console.log('✅ Spatial comparison enabled (no time overlap)');
            this.showMessage('Spatial comparison enabled - tracks will play at the same pace for route comparison', 'success');

            // Store overlap data for the map renderer
            this.timeOverlap = overlap;
            console.log('🔄 Stored timeOverlap data:', this.timeOverlap);

            // Verify time data is preserved in track points
            const mainTimePoints = this.currentTrackData.trackPoints.filter(p => p.time).length;
            const compTimePoints = this.comparisonTrackData.trackPoints.filter(p => p.time).length;
            console.log(`📊 Time data verification: Main track has ${mainTimePoints}/${this.currentTrackData.trackPoints.length} points with time`);
            console.log(`📊 Time data verification: Comparison track has ${compTimePoints}/${this.comparisonTrackData.trackPoints.length} points with time`);

            console.log('✅ Returning overlap object:', overlap);
            console.log('🔍 About to return from checkTimeOverlap method');
            return overlap;
        } else {
            console.log('❌ No time overlap between tracks');
            if (mainStartTime && mainEndTime && compStartTime && compEndTime) {
                console.log('  Main track range:', mainStartTime.toLocaleTimeString(), 'to', mainEndTime.toLocaleTimeString());
                console.log('  Comparison track range:', compStartTime.toLocaleTimeString(), 'to', compEndTime.toLocaleTimeString());
            }
            this.showMessage('No time overlap between tracks - tracks will play sequentially', 'info');
            return null;
        }
    }
} 
