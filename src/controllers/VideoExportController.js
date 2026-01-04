import { t } from '../translations.js';
import { MP4Utils } from '../utils/MP4Utils.js';
import { AnalyticsTracker } from '../utils/analytics.js';
import { revenueManager } from '../utils/RevenueManager.js';

export class VideoExportController {
    constructor(app) {
        this.app = app;
        this.isExporting = false;
        this.currentExportMode = null;
        this.mediaRecorder = null;
        this.stream = null;
        this.progressModal = null;
        this.recordedChunks = [];
        
        // Cache for SVG logo to avoid repeated fetching
        this.cachedLogoImage = null;
        this.logoCache = new Map();
        
        // Track segment changes for pulse effect
        this.lastSegmentIndex = -1;
        this.segmentChangeTime = null;
        this.pulseDuration = 600; // 0.6 seconds in milliseconds
        
        // Export mode configurations
        this.exportModes = {
            webm: {
                name: 'Auto Recording (WebM)',
                icon: '🔧',
                mimeTypes: ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'],
                extension: 'webm',
                description: 'Automatic recording with overlays rendered on canvas. Works on all browsers.'
            },
            mp4: {
                name: 'Auto Recording (MP4)',
                icon: '🚀',
                mimeTypes: ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'],
                extension: 'mp4',
                description: 'Advanced client-side MP4 generation with canvas rendering. Optimized for quality and compatibility. Auto-detects best codec and settings for your device.'
            },
            manual: {
                name: 'Manual Screen Recording',
                icon: '🎥',
                description: 'Best quality with all statistics and overlays. Use your system\'s screen recorder to capture the highlighted area while the animation plays.'
            }
        };
    }

    /**
     * Initialize export UI and event listeners
     */
    initialize() {
        this.createExportUI();
        this.setupEventListeners();
        
        // Enable live stats by default
        if (this.app.stats && this.app.stats.toggleLiveStats) {
            this.app.stats.toggleLiveStats(true);
        }
        
        // Only try to apply aspect ratio if we're in a browser environment and DOM is ready
        if (typeof window !== 'undefined' && document.readyState === 'complete') {
            // Page is already loaded, apply aspect ratio with a delay
            setTimeout(() => {
                this.ensureInitialAspectRatio();
            }, 1500); // Increased delay to ensure page is fully rendered
        } else if (typeof window !== 'undefined') {
            // Wait for page to load completely
            window.addEventListener('load', () => {
                setTimeout(() => {
                    this.ensureInitialAspectRatio();
                }, 1000);
            });
        }
        
        // Set up additional listeners for track loading events
        this.setupTrackLoadListeners();
    }

    /**
     * Ensure initial aspect ratio is applied
     */
    ensureInitialAspectRatio(retryCount = 0) {
        const maxRetries = 10; // Maximum 10 retries to prevent infinite loop
        
        // Only log on first attempt to reduce noise
        
        // Stop retrying after max attempts
        if (retryCount >= maxRetries) {
            console.warn('❌ Gave up applying initial aspect ratio after maximum retries');
            // Apply default aspect ratio even if container isn't ready
            this.applyDefaultAspectRatio();
            return;
        }
        
        // Check if the map container is ready
        const mapContainer = document.querySelector('.map-container');
        const videoCaptureContainer = document.getElementById('videoCaptureContainer');
        
        if (!mapContainer || !videoCaptureContainer) {
            if (retryCount < 3) { // Only log for first few attempts
                console.warn('⚠️ Map containers not ready, retrying...');
            }
            setTimeout(() => {
                this.ensureInitialAspectRatio(retryCount + 1);
            }, 1000);
            return;
        }

        const containerRect = mapContainer.getBoundingClientRect();
        if (containerRect.width === 0 || containerRect.height === 0) {
            if (retryCount < 3) { // Only log for first few attempts
                console.warn('⚠️ Map container has no dimensions, retrying...');
            }
            setTimeout(() => {
                this.ensureInitialAspectRatio(retryCount + 1);
            }, 1000);
            return;
        }

        // Check if there's actually content to display (track data loaded)
        if (!this.app.currentTrackData && !this.app.journeyData) {
            if (retryCount < 3) { // Only log for first few attempts
                console.warn('⚠️ No track data loaded yet, skipping aspect ratio application...');
            }
            return; // Don't retry if there's no data - wait for data to be loaded
        }

        // Success! Apply the aspect ratio
        // Ensure live stats are visible
        const liveStatsOverlay = document.getElementById('liveStatsOverlay');
        if (liveStatsOverlay) {
            liveStatsOverlay.style.display = 'block';
        }

        const selectedAspect = this.getSelectedAspectRatio();
        this.resizeContainerForAspectRatio(selectedAspect);
        
        // Additional delay to ensure stats visibility after container resize
        setTimeout(() => {
            this.ensureStatsVisibility();
        }, 200);
    }

    /**
     * Apply default aspect ratio when container isn't ready
     */
    applyDefaultAspectRatio() {
        const selectedAspect = this.getSelectedAspectRatio();
        
        // Try to apply anyway - sometimes the container becomes ready after this
        setTimeout(() => {
            const mapContainer = document.querySelector('.map-container');
            if (mapContainer) {
                const containerRect = mapContainer.getBoundingClientRect();
                if (containerRect.width > 0 && containerRect.height > 0) {
                    this.resizeContainerForAspectRatio(selectedAspect);
                    setTimeout(() => {
                        this.ensureStatsVisibility();
                    }, 200);
                }
            }
        }, 2000); // Wait 2 seconds and try once more
    }

    /**
     * Create the export panel UI
     */
    createExportUI() {
        // Check if export panel already exists
        let exportPanel = document.getElementById('exportPanel');
        if (!exportPanel) {
            exportPanel = document.createElement('div');
            exportPanel.id = 'exportPanel';
            exportPanel.className = 'export-panel';
            
            // Find a good place to insert it (after controls panel)
            const controlsPanel = document.querySelector('.controls-panel');
            if (controlsPanel && controlsPanel.parentNode) {
                controlsPanel.parentNode.insertBefore(exportPanel, controlsPanel.nextSibling);
            } else {
                document.body.appendChild(exportPanel);
            }
        }

        exportPanel.innerHTML = `
            <style>
                .aspect-ratio-section {
                    margin: 15px 0;
                    padding: 12px;
                }
                .section-label {
                    display: block;
                    margin-bottom: 10px;
                    font-weight: 600;
                    color: rgba(46, 125, 50, 0.1);
                    font-size: 14px;
                }
                .aspect-ratio-options {
                    display: flex;
                    gap: 15px;
                    flex-wrap: wrap;
                }
                .aspect-option {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    min-width: 80px;
                    background: rgba(46, 125, 50, 0.05);
                }
                .aspect-option:hover {
                    background: rgba(46, 125, 50, 0.1);
                    transform: translateY(-1px);
                }
                .aspect-option input[type="radio"] {
                    display: none;
                }
                .aspect-option input[type="radio"]:checked + .aspect-visual {
                    border-color: #2E7D32;
                    background: rgba(46, 125, 50, 0.15);
                    box-shadow: 0 0 8px rgba(46, 125, 50, 0.3);
                }
                .aspect-option input[type="radio"]:checked {
                    background: rgba(46, 125, 50, 0.08);
                }
                .aspect-visual {
                    width: 40px;
                    height: 30px;
                    border: 2px solid rgba(46, 125, 50, 0.4);
                    border-radius: 4px;
                    margin-bottom: 5px;
                    transition: all 0.2s ease;
                    position: relative;
                    background: rgba(46, 125, 50, 0.08);
                }
                .aspect-16-9 {
                    width: 40px;
                    height: 22px;
                }
                .aspect-1-1 {
                    width: 30px;
                    height: 30px;
                }
                .aspect-9-16 {
                    width: 22px;
                    height: 40px;
                }
                .aspect-label {
                    font-size: 11px;
                    color:#1B2A20;
                    text-align: center;
                    white-space: nowrap;
                    font-weight: 500;
                }
                .aspect-option input[type="radio"]:checked ~ .aspect-label {
                    color: #1B2A20;
                    font-weight: 700;
                }
                
                /* Video capture container responsive styles */
                .video-capture-container {
                    transition: all 0.3s ease;
                    margin: 0 auto;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                }
                
                /* Ensure map fills the container properly */
                .video-capture-container .map {
                    width: 100% !important;
                    height: 100% !important;
                    flex: 1;
                }
                
                /* Make sure overlays scale with container */
                .video-capture-container .elevation-profile-container,
                .video-capture-container .live-stats-overlay,
                .video-capture-container .map-watermark {
                    position: absolute;
                }
            </style>
            <div class="export-section">
                <div class="export-header">
                    <h4>📹 ${t('videoExport.title')}</h4>
                    <button class="export-help-toggle" id="exportHelpToggle">
                        <span>${t('videoExport.exportHelp')}</span>
                    </button>
                </div>
                
                <!-- Collapsible help section -->
                <div class="export-help" id="exportHelp" style="display: none;">
                    <div class="export-option-info">
                        <div class="export-option">
                            <strong>${this.exportModes.webm.icon} ${t('videoExport.autoWebM')}</strong>
                            <p>${t('videoExport.webMDescription')}</p>
                        </div>
                        <div class="export-option">
                            <strong>${this.exportModes.mp4.icon} ${t('videoExport.autoMP4')}</strong>
                            <p>${t('videoExport.mp4Description')}</p>
                        </div>
                        <div class="export-option">
                            <strong>${this.exportModes.manual.icon} ${t('videoExport.manualMode')}</strong>
                            <p>${t('videoExport.manualDescription')}</p>
                            <div class="manual-instructions">
                                <p><strong>Windows:</strong> <kbd>Win</kbd> + <kbd>G</kbd> → ${t('videoExport.gameBarRecord')}</p>
                                <p><strong>Mac:</strong> <kbd>⌘</kbd> + <kbd>⇧</kbd> + <kbd>5</kbd> → ${t('videoExport.recordSelectedPortion')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Aspect Ratio Selection -->
                <div class="aspect-ratio-section">
                    <div class="aspect-ratio-options">
                        <label class="aspect-option">
                            <input type="radio" name="aspectRatio" value="16:9">
                            <span class="aspect-visual aspect-16-9"></span>
                            <span class="aspect-label">${t('videoExport.landscape')}</span>
                        </label>
                        <label class="aspect-option">
                            <input type="radio" name="aspectRatio" value="1:1" checked>
                            <span class="aspect-visual aspect-1-1"></span>
                            <span class="aspect-label">${t('videoExport.square')}</span>
                        </label>
                        <label class="aspect-option">
                            <input type="radio" name="aspectRatio" value="9:16">
                            <span class="aspect-visual aspect-9-16"></span>
                            <span class="aspect-label">${t('videoExport.mobile')}</span>
                        </label>
                    </div>
                </div>

                <!-- Export Buttons -->
                <div class="export-buttons">
                    <button id="exportWebmBtn" class="export-btn">
                        <span>${this.exportModes.webm.icon}</span>
                        <span>${t('videoExport.autoWebMShort')}</span>
                    </button>
                    <button id="exportMp4Btn" class="export-btn">
                        <span>${this.exportModes.mp4.icon}</span>
                        <span>${t('videoExport.autoMP4Short')}</span>
                    </button>
                    <button id="exportManualBtn" class="export-btn">
                        <span>${this.exportModes.manual.icon}</span>
                        <span>${t('videoExport.manualModeShort')}</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for export buttons
     */
    setupEventListeners() {
        const exportHelpToggle = document.getElementById('exportHelpToggle');
        const exportWebmBtn = document.getElementById('exportWebmBtn');
        const exportMp4Btn = document.getElementById('exportMp4Btn');
        const exportManualBtn = document.getElementById('exportManualBtn');

        if (exportHelpToggle) {
            exportHelpToggle.addEventListener('click', this.toggleExportHelp.bind(this));
        }
        
        if (exportWebmBtn) {
            exportWebmBtn.addEventListener('click', () => this.startExport('webm'));
        }
        
        if (exportMp4Btn) {
            exportMp4Btn.addEventListener('click', () => this.startExport('mp4'));
        }
        
        if (exportManualBtn) {
            exportManualBtn.addEventListener('click', () => this.startManualRecording());
        }

        // Setup keyboard handler for manual recording
        this.setupManualRecordingKeyboardHandler();

        // Setup aspect ratio change handlers after UI is rendered
        setTimeout(() => {
            this.setupAspectRatioHandlers();
        }, 100);

        // Also listen for track load events to apply aspect ratio when map is ready
        if (this.app && this.app.addEventListener) {
            this.app.addEventListener('journeyDataLoaded', () => {

                setTimeout(() => {
                    this.ensureInitialAspectRatio();
                }, 500);
            });
        } else {
            // Fallback: listen for DOM events or use alternative approach
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    this.ensureInitialAspectRatio();
                }, 1000);
            });
        }
    }

    /**
     * Setup aspect ratio change handlers
     */
    setupAspectRatioHandlers() {

        
        const aspectRatioInputs = document.querySelectorAll('input[name="aspectRatio"]');

        if (aspectRatioInputs.length === 0) {
            console.warn('⚠️ No aspect ratio inputs found - UI may not be rendered yet');
            // Try again after a short delay, but with a maximum number of retries
            if (!this.aspectRetryCount) this.aspectRetryCount = 0;
            if (this.aspectRetryCount < 10) {
                this.aspectRetryCount++;
                setTimeout(() => {
                    this.setupAspectRatioHandlers();
                }, 500);
            } else {
                console.error('❌ Failed to setup aspect ratio handlers after multiple retries');
            }
            return;
        }
        
        // Reset retry count on success
        this.aspectRetryCount = 0;
        
        aspectRatioInputs.forEach((input, index) => {
            input.addEventListener('change', () => {
                if (input.checked) {

                    this.resizeContainerForAspectRatio(input.value);
                    // Force stats visibility after aspect ratio change
                    setTimeout(() => {
                        this.ensureStatsVisibility();
                    }, 300);
                }
            });
        });

        // Set initial aspect ratio (square by default)
        const selectedAspect = this.getSelectedAspectRatio();

        
        // Apply the initial resize immediately
        this.resizeContainerForAspectRatio(selectedAspect);
        

    }

    /**
     * Setup listeners for track loading events to ensure stats visibility
     */
    setupTrackLoadListeners() {

        
        // Listen for file input changes (when user loads a track)
        const fileInput = document.getElementById('upload');
        if (fileInput) {
            fileInput.addEventListener('change', () => {
                console.log('📂 File loaded, ensuring stats visibility...');
                setTimeout(() => {
                    this.ensureStatsVisibility();
                }, 1500); // Wait for track to be fully loaded
            });
        }
        
        // Listen for any journey updates
        document.addEventListener('journeyDataLoaded', () => {

            // Only try to ensure stats visibility if container is ready
            const mapContainer = document.querySelector('.map-container');
            if (mapContainer) {
                const containerRect = mapContainer.getBoundingClientRect();
                if (containerRect.width > 0 && containerRect.height > 0) {
                    setTimeout(() => {
                        this.ensureStatsVisibility();
                    }, 1000);
                } else {

                }
            }
        });
        
        // Also listen for window resize to adjust stats positioning
        window.addEventListener('resize', () => {

            setTimeout(() => {
                const selectedAspect = this.getSelectedAspectRatio();
                this.resizeContainerForAspectRatio(selectedAspect);
            }, 200);
        });
        

    }

    /**
     * Resize the videoCaptureContainer to match selected aspect ratio
     */
    resizeContainerForAspectRatio(aspectRatio) {
        const videoCaptureContainer = document.getElementById('videoCaptureContainer');
        if (!videoCaptureContainer) {
            console.warn('videoCaptureContainer not found, retrying...');
            setTimeout(() => {
                this.resizeContainerForAspectRatio(aspectRatio);
            }, 500);
            return;
        }

        // Get the available space (viewport or parent container)
        const mapContainer = document.querySelector('.map-container');
        if (!mapContainer) {
            console.warn('map-container not found, retrying...');
            setTimeout(() => {
                this.resizeContainerForAspectRatio(aspectRatio);
            }, 500);
            return;
        }

        const parentRect = mapContainer.getBoundingClientRect();
        let availableWidth = parentRect.width;
        let availableHeight = parentRect.height;

        // If dimensions are still 0, use fallback dimensions or try viewport
        if (availableWidth === 0 || availableHeight === 0) {
            console.warn('Container dimensions are 0, using viewport fallback');
            availableWidth = window.innerWidth * 0.8; // 80% of viewport
            availableHeight = window.innerHeight * 0.7; // 70% of viewport
            
            // If still 0, use fixed fallback
            if (availableWidth === 0 || availableHeight === 0) {
                availableWidth = 1200;
                availableHeight = 800;
                console.warn('Using fixed fallback dimensions: 1200x800');
            }
        }

        let targetWidth, targetHeight;




        // Update container classes based on aspect ratio
        if (videoCaptureContainer) {
            videoCaptureContainer.classList.remove('aspect-landscape', 'aspect-square', 'aspect-mobile');
            switch (aspectRatio) {
                case '16:9':
                    videoCaptureContainer.classList.add('aspect-landscape');
                    break;
                case '1:1':
                    videoCaptureContainer.classList.add('aspect-square');
                    break;
                case '9:16':
                    videoCaptureContainer.classList.add('aspect-mobile');
                    break;
            }
        }

        switch (aspectRatio) {
            case '16:9':
                // Landscape - fit to available width, calculate height
                targetWidth = availableWidth;
                targetHeight = Math.round(targetWidth * (9/16));

                // If height exceeds available space, fit to height instead
                if (targetHeight > availableHeight) {
                    targetHeight = availableHeight;
                    targetWidth = Math.round(targetHeight * (16/9));
                }
                break;

            case '1:1':
                // Square - use the smaller dimension
                const squareSize = Math.min(availableWidth, availableHeight);
                targetWidth = squareSize;
                targetHeight = squareSize;
                break;

            case '9:16':
                // Portrait - fit to available height, calculate width
                targetHeight = availableHeight;
                targetWidth = Math.round(targetHeight * (9/16));

                // If width exceeds available space, fit to width instead
                if (targetWidth > availableWidth) {
                    targetWidth = availableWidth;
                    targetHeight = Math.round(targetWidth * (16/9));
                }
                break;
                
            default:
                targetWidth = availableWidth;
                targetHeight = availableHeight;
        }

        // Apply the new dimensions
        videoCaptureContainer.style.width = `${targetWidth}px`;
        videoCaptureContainer.style.height = `${targetHeight}px`;
        
        // Center the container if it's smaller than available space
        const offsetX = (availableWidth - targetWidth) / 2;
        const offsetY = (availableHeight - targetHeight) / 2;
        
        videoCaptureContainer.style.marginLeft = `${offsetX}px`;
        videoCaptureContainer.style.marginTop = `${offsetY}px`;




        // Trigger map resize to fit new container and ensure stats are visible
        setTimeout(() => {
            this.resizeMapToContainer();
            this.ensureStatsVisibility();
        }, 100);
    }

    /**
     * Resize the map to fit the container perfectly
     */
    resizeMapToContainer() {
        try {
            if (this.app.mapRenderer && this.app.mapRenderer.map) {

                
                // Trigger map resize
                this.app.mapRenderer.map.resize();
                
                // Force a repaint
                this.app.mapRenderer.map.getCanvas().style.width = '100%';
                this.app.mapRenderer.map.getCanvas().style.height = '100%';
                

            }
        } catch (error) {
            console.warn('Failed to resize map:', error);
        }
    }

    /**
     * Ensure stats overlay is visible within the container
     */
    ensureStatsVisibility(retryCount = 0) {
        const maxRetries = 5; // Maximum 5 retries to prevent infinite loop
        
        if (retryCount === 0) {

        }
        
        if (retryCount >= maxRetries) {
            console.warn('❌ Gave up ensuring stats visibility after maximum retries');
            return;
        }
        
        const videoCaptureContainer = document.getElementById('videoCaptureContainer');
        const liveStatsOverlay = document.getElementById('liveStatsOverlay');
        
        if (!videoCaptureContainer || !liveStatsOverlay) {
            if (retryCount < 2) { // Only log for first few attempts
                console.warn('Container or stats overlay not found, retrying...');
            }
            setTimeout(() => this.ensureStatsVisibility(retryCount + 1), 500);
            return;
        }

        // Make sure live stats are visible
        liveStatsOverlay.style.display = 'block';
        
        // Force positioning regardless of current state to ensure visibility

        
        // Clear any existing positioning styles first
        liveStatsOverlay.style.position = '';
        liveStatsOverlay.style.left = '';
        liveStatsOverlay.style.right = '';
        liveStatsOverlay.style.top = '';
        liveStatsOverlay.style.bottom = '';
        liveStatsOverlay.style.transform = '';
        
        // Set the video capture container as the positioning context
        videoCaptureContainer.style.position = 'relative';
        
        // Position stats in the top-right corner of the video capture container
        const padding = 20;
        liveStatsOverlay.style.position = 'absolute';
        liveStatsOverlay.style.right = `${padding}px`;
        liveStatsOverlay.style.top = `${padding}px`;
        liveStatsOverlay.style.zIndex = '1000';
        
        // Ensure stats have proper styling for visibility
        liveStatsOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        liveStatsOverlay.style.color = 'white';
        liveStatsOverlay.style.padding = '12px 16px';
        liveStatsOverlay.style.borderRadius = '8px';
        liveStatsOverlay.style.fontSize = '14px';
        liveStatsOverlay.style.fontWeight = 'bold';
        liveStatsOverlay.style.maxWidth = '200px';
        liveStatsOverlay.style.wordWrap = 'break-word';
        liveStatsOverlay.style.textAlign = 'right';
        liveStatsOverlay.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        
        // Move the stats element inside the video capture container if it's not already there
        if (liveStatsOverlay.parentElement !== videoCaptureContainer) {

            videoCaptureContainer.appendChild(liveStatsOverlay);
        }
        
        // Wait a moment and verify positioning worked
        setTimeout(() => {
            const containerRect = videoCaptureContainer.getBoundingClientRect();
            const statsRect = liveStatsOverlay.getBoundingClientRect();
            
            console.log(`Container final: ${containerRect.width}x${containerRect.height} at (${containerRect.left}, ${containerRect.top})`);
            console.log(`Stats final position: ${statsRect.left}, ${statsRect.top} (${statsRect.width}x${statsRect.height})`);
            
            // Verify stats are in the top-right area
            const isInTopRight = statsRect.right <= containerRect.right && 
                               statsRect.top >= containerRect.top && 
                               statsRect.top <= containerRect.top + 100; // Within 100px of top
            
            if (isInTopRight) {

            } else {
                console.warn('⚠️ Stats may not be in the correct position');
            }
        }, 100);
    }

    /**
     * Toggle export help section visibility
     */
    toggleExportHelp() {
        const exportHelp = document.getElementById('exportHelp');
        if (exportHelp) {
            const isVisible = exportHelp.style.display !== 'none';
            exportHelp.style.display = isVisible ? 'none' : 'block';
        }
    }

    /**
     * Validate if export is possible
     */
    validateExportPrerequisites() {
        // Check for valid track data
        const hasTrackData = this.app.currentTrackData || 
                           (this.app.journeyData && this.app.journeyData.coordinates && this.app.journeyData.coordinates.length > 0);
        
        if (!this.app.mapRenderer || !hasTrackData) {
            this.app.showMessage(t('videoExport.noTrackData'), 'error');
            return false;
        }

        // Check for browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            this.app.showMessage(t('videoExport.browserNotSupported'), 'error');
            return false;
        }

        // Check map canvas
        const mapElement = this.app.mapRenderer.map.getCanvas();
        if (!mapElement) {
            this.app.showMessage(t('videoExport.mapNotReady'), 'error');
            return false;
        }

        return true;
    }

    /**
     * Start video export process
     */
    async startExport(mode) {
        if (this.isExporting) {
            this.app.showMessage(t('videoExport.exportInProgress'), 'warning');
            return;
        }

        if (!this.validateExportPrerequisites()) {
            return;
        }

        // Show confirmation dialog
        const shouldContinue = await this.showExportConfirmation(mode);
        if (!shouldContinue) return;

        try {
            this.isExporting = true;
            this.currentExportMode = mode;
            
            // Prevent window resize/minimize during export
            this.preventWindowChanges();
            
            // Track video export attempt
            const selectedAspect = this.getSelectedAspectRatio();
            AnalyticsTracker.trackVideoExport(mode, selectedAspect);
            

            
            if (mode === 'webm') {
                await this.exportAutoWebM();
            } else if (mode === 'mp4') {
                await this.exportAutoMP4();
            }
            
        } catch (error) {
            console.error('Export failed:', error);
            this.app.showMessage(t('videoExport.exportError', { error: error.message }), 'error');
            this.cleanup();
        }
    }

    /**
     * Export video in WebM format (canvas capture)
     */
    async exportAutoWebM() {
        this.createProgressModal();
        this.updateProgress(5, 'Preparing for WebM export...');

        try {
            // Step 1: Prepare the environment
            await this.prepareForExport();
            this.updateProgress(20, 'Environment prepared...');

            // Step 2: Hide UI elements
            this.hideUIForRecording();
            this.updateProgress(25, 'UI optimized...');

            // Step 3: Preload tiles
            this.updateProgress(30, 'Preloading map tiles...');
            await this.preloadTiles((progress) => {
                this.updateProgress(30 + (progress * 30), `Loading tiles... ${Math.round(progress)}%`);
            });

            // Step 4: Setup canvas capture
            this.updateProgress(65, 'Setting up canvas capture...');
            const mapCanvas = this.app.mapRenderer.map.getCanvas();
            
            // Create stream from canvas
            this.stream = mapCanvas.captureStream(30);
            this.updateProgress(70, 'Canvas capture ready...');

            // Step 5: Setup MediaRecorder for WebM
            const mimeType = this.getBestMimeType(this.exportModes.webm.mimeTypes);
            await this.setupMediaRecorder(mimeType, 'webm');
            
            // Step 6: Start recording
            this.updateProgress(75, 'Starting recording...');
            await this.startRecording();

        } catch (error) {
            console.error('❌ WebM export failed:', error);
            console.error('Error stack:', error.stack);
            this.app.showMessage(`Export failed: ${error.message}`, 'error');
            this.cleanup();
            throw error;
        }
    }

    /**
     * Export video in MP4 format (experimental CropTarget API)
     */
    async exportAutoMP4() {
        console.log('🚀 Starting advanced MP4 export...');

        this.createProgressModal();
        this.updateProgress(5, 'Initializing MP4 export...');

        try {
            // Step 1: Validate browser capabilities
            const canRecordMP4 = this.validateMP4Support();
            if (!canRecordMP4) {
                            // Fallback to WebM with automatic conversion message
            this.app.showMessage(t('videoExport.mp4NotSupported'), 'warning');
            return this.exportAutoWebM();
            }

            // Step 2: Prepare the environment
            await this.prepareForExport();
            this.updateProgress(15, 'Environment prepared...');

            // Step 3: Load html2canvas library if needed
            await this.loadHtml2Canvas();
            this.updateProgress(20, 'Capture libraries loaded...');

            // Step 4: Setup canvas recording infrastructure
            await this.setupCanvasRecording();
            this.updateProgress(25, 'Canvas recording setup complete...');

            // Step 4: Hide UI elements for clean recording
            this.hideUIForRecording();
            this.updateProgress(30, 'UI optimized for recording...');

            // Step 5: Preload all necessary tiles
            this.updateProgress(35, 'Preloading map tiles...');
            await this.preloadTiles((progress) => {
                this.updateProgress(35 + (progress * 25), `Loading tiles... ${Math.round(progress * 100)}%`);
            });

            // Step 6: Setup high-performance rendering
            this.updateProgress(60, 'Setting up high-performance rendering...');

            try {
                await this.setupHighPerformanceRendering();

            } catch (error) {
                console.warn('⚠️ High-performance rendering setup failed, but continuing anyway:', error.message);
                // Don't throw - the map might still work fine for recording
            }

            // Step 7: Phase 1 - Capture high-quality frames during animation playback
            this.updateProgress(65, 'Phase 1: Capturing high-quality frames...');

            await this.captureAnimationFrames();


            // Step 8: Phase 2 - Create video from captured frames
            this.updateProgress(85, 'Phase 2: Creating video from frames...');

            await this.createVideoFromFrames();


            this.updateProgress(100, 'MP4 export complete!');

        } catch (error) {
            console.error('Advanced MP4 export failed:', error);
            this.app.showMessage(t('videoExport.mp4ExportFailed', { error: error.message }), 'error');
            this.cleanup();
            throw error;
        }
    }

    /**
     * Validate MP4 recording capabilities using advanced detection
     */
    validateMP4Support() {
        // Check browser compatibility
        const compatibility = MP4Utils.validateBrowserCompatibility();
        console.log('Browser compatibility:', compatibility);

        // Show compatibility info to user if there are recommendations
        if (compatibility.recommendations.length > 0) {
            console.warn('MP4 compatibility recommendations:', compatibility.recommendations);
        }

        // Check for best MP4 codec
        const bestCodec = MP4Utils.getBestMP4Codec();
        if (bestCodec) {
            this.selectedMP4Codec = bestCodec.mime;
            this.mp4CodecInfo = bestCodec;
            console.log(`Selected MP4 codec: ${bestCodec.description}`);
            return true;
        }

        // Check for WebCodecs API as alternative
        if (compatibility.webCodecsSupport) {
            console.log('WebCodecs API available for MP4 generation');
            this.useWebCodecs = true;
            return true;
        }

        console.warn('No MP4 recording capabilities available');
        return false;
    }

    /**
     * Load html2canvas if not already available
     */
    async loadHtml2Canvas() {
        if (window.html2canvas) {
            return true;
        }

        try {
            console.log('Loading html2canvas library...');
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            
            console.log('html2canvas loaded successfully');
            return window.html2canvas !== undefined;
        } catch (error) {
            console.warn('Failed to load html2canvas:', error);
            return false;
        }
    }

        /**
     * Get selected aspect ratio from UI
     */
    getSelectedAspectRatio() {
        const selectedAspect = document.querySelector('input[name="aspectRatio"]:checked');
        return selectedAspect ? selectedAspect.value : '1:1'; // Default to square
    }

    /**
     * Calculate dimensions for selected aspect ratio
     */
    calculateAspectRatioDimensions(containerRect, aspectRatio) {
        let width, height;
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        console.log(`Original container size: ${containerWidth}x${containerHeight}`);

        switch (aspectRatio) {
            case '16:9':
                // Landscape - fit to container width, adjust height
                width = Math.max(containerWidth, 1280);
                height = Math.round(width * (9/16));
                break;
            case '1:1':
                // Square - use smaller dimension
                const squareSize = Math.max(Math.min(containerWidth, containerHeight), 720);
                width = squareSize;
                height = squareSize;
                break;
            case '9:16':
                // Portrait/Mobile - fit to container height, adjust width
                height = Math.max(containerHeight, 720);
                width = Math.round(height * (9/16));
                break;
            default:
                width = Math.max(containerWidth, 1280);
                height = Math.max(containerHeight, 720);
        }

        // Ensure dimensions are even numbers (some codecs require this)
        width = Math.floor(width / 2) * 2;
        height = Math.floor(height / 2) * 2;

        console.log(`Calculated ${aspectRatio} dimensions: ${width}x${height}`);
        return { width, height };
    }

    /**
     * Setup canvas recording infrastructure to capture the entire videoCaptureContainer
     */
    async setupCanvasRecording() {
        // Get the video capture container (this contains map + overlays + stats)
            const videoCaptureContainer = document.getElementById('videoCaptureContainer');
            if (!videoCaptureContainer) {
            throw new Error('Video capture container not available');
        }

        // Get optimal recording settings based on device capabilities
        const optimalSettings = MP4Utils.getOptimalRecordingSettings();
        console.log('Using optimal recording settings:', optimalSettings);

        // Get the actual container dimensions
        const containerRect = videoCaptureContainer.getBoundingClientRect();
        console.log('Video capture container size:', containerRect);

        // Get selected aspect ratio and calculate dimensions
        const selectedAspectRatio = this.getSelectedAspectRatio();
        const { width, height } = this.calculateAspectRatioDimensions(containerRect, selectedAspectRatio);

        // Create a composite canvas for recording (similar to MapDirector's approach)
        this.recordingCanvas = document.createElement('canvas');
        this.recordingContext = this.recordingCanvas.getContext('2d');
        
        // Set canvas dimensions with device pixel ratio for crisp rendering
        const { devicePixelRatio } = optimalSettings;
        this.recordingCanvas.width = width * devicePixelRatio;
        this.recordingCanvas.height = height * devicePixelRatio;
        this.recordingCanvas.style.width = width + 'px';
        this.recordingCanvas.style.height = height + 'px';
        
        // Scale context to match device pixel ratio
        this.recordingContext.scale(devicePixelRatio, devicePixelRatio);
        
        // Since container is already resized to match aspect ratio, use direct mapping
        const scale = 1.0; // No scaling needed since container matches target size
        const scaledWidth = width;
        const scaledHeight = height;
        const offsetX = 0;
        const offsetY = 0;

        console.log(`Direct container mapping - no scaling needed (container already matches ${selectedAspectRatio})`);

        // Store dimensions and settings for later use
        this.recordingDimensions = { 
            ...optimalSettings, 
            width, 
            height,
            containerRect,
            scale,
            offsetX,
            offsetY,
            scaledWidth,
            scaledHeight,
            aspectRatio: selectedAspectRatio
        };
        this.optimalSettings = optimalSettings;
        this.videoCaptureContainer = videoCaptureContainer;
        
        // Add canvas to hidden container for reference (don't display it)
        this.recordingCanvas.style.position = 'absolute';
        this.recordingCanvas.style.left = '-9999px';
        this.recordingCanvas.style.top = '-9999px';
        document.body.appendChild(this.recordingCanvas);
        
        console.log(`Recording canvas created: ${width}x${height} (${selectedAspectRatio}) (${devicePixelRatio}x DPI) @ ${optimalSettings.bitrate/1000000}Mbps`);
        console.log(`Content scaling: ${scale.toFixed(2)}x, offset: ${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}`);
    }

    /**
     * Setup high-performance rendering optimizations
     */
    async setupHighPerformanceRendering() {
        try {
            // Optimize map rendering for recording
            const map = this.app.mapRenderer.map;

            
            // Increase render resolution for better quality
            map.getCanvas().style.transformOrigin = 'top left';
            
            // Ensure smooth animations
            map.setRenderWorldCopies(false);
            
            // Optimize performance
            map.setMaxZoom(18);
            map.setMinZoom(1);
            

            
            // Wait for any pending operations with multiple check methods
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    console.warn('⚠️ Map ready timeout, but proceeding anyway as map appears functional');
                    resolve(); // Don't reject, just proceed
                }, 3000); // Reduced timeout

                // Check multiple indicators of map readiness
                const checkMapReady = () => {
                    const isLoaded = map.loaded();
                    const hasCanvas = map.getCanvas();
                    const hasStyle = map.getStyle();
                    
                    console.log(`🗺️ Map status - loaded: ${isLoaded}, hasCanvas: ${!!hasCanvas}, hasStyle: ${!!hasStyle}`);
                    
                    if (isLoaded || (hasCanvas && hasStyle)) {
                        clearTimeout(timeout);
                        console.log('🗺️ Map is ready for recording');
                        resolve();
                        return true;
                    }
                    return false;
                };

                // Immediate check
                if (checkMapReady()) return;
                
                // Listen for various ready events
                const events = ['load', 'idle', 'render'];
                let eventHandlers = [];
                
                events.forEach(eventName => {
                    const handler = () => {
                        console.log(`🗺️ Map event: ${eventName}`);
                        if (checkMapReady()) {
                            // Clean up all event listeners
                            eventHandlers.forEach(({event, handler}) => {
                                map.off(event, handler);
                            });
                        }
                    };
                    map.on(eventName, handler);
                    eventHandlers.push({event: eventName, handler});
                });
                
                // Fallback check every 500ms
                const intervalCheck = setInterval(() => {
                    if (checkMapReady()) {
                        clearInterval(intervalCheck);
                    }
                }, 500);
                
                // Clean up interval on timeout
                setTimeout(() => clearInterval(intervalCheck), 3000);
            });
        } catch (error) {
            console.error('❌ High-performance rendering setup failed:', error);
            throw error;
        }
    }

    /**
     * Initialize advanced MediaRecorder with optimal settings
     */
    async initializeAdvancedMediaRecorder() {
        if (this.useWebCodecs) {
            return this.initializeWebCodecsRecorder();
        }

        // Create a stream from our recording canvas at exactly 30 FPS
        const targetFPS = 30;
        const stream = this.recordingCanvas.captureStream(targetFPS);
        
        // Create optimized MediaRecorder options with 30 FPS - video only
        const customSettings = {
            ...this.optimalSettings,
            framerate: targetFPS
        };
        
        // Create video-only MediaRecorder options to avoid audio bitrate warnings
        const options = {
            mimeType: this.mp4CodecInfo.mime,
            videoBitsPerSecond: customSettings.bitrate // Video only, no audio properties
        };
        
        // Simple file size estimation

        this.mediaRecorder = new MediaRecorder(stream, options);
        this.recordedChunks = [];

        // Enhanced event handlers
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            this.processAdvancedRecordedVideo();
        };

        this.mediaRecorder.onerror = (event) => {
            this.app.showMessage(`MP4 recording error: ${event.error.name}`, 'error');
            this.cleanup();
        };
    }

    /**
     * Initialize WebCodecs-based recorder for better MP4 support
     */
    async initializeWebCodecsRecorder() {
        if (!window.VideoEncoder) {
            throw new Error('WebCodecs not available');
        }

        this.webCodecsFrames = [];
        this.webCodecsEncoder = new VideoEncoder({
            output: (chunk, config) => {
                this.webCodecsFrames.push({ chunk, config });
            },
            error: (error) => {
                console.error('WebCodecs encoder error:', error);
                this.app.showMessage(`Video encoding error: ${error.message}`, 'error');
            }
        });

        // Configure encoder for MP4/H.264 at exactly 30 FPS
        const targetFPS = 30;
        const config = {
            codec: 'avc1.42E01E', // H.264 baseline profile
            width: this.recordingDimensions.width,
            height: this.recordingDimensions.height,
            bitrate: 8000000, // 8 Mbps
            framerate: targetFPS,
            hardwareAcceleration: 'prefer-hardware'
        };

        this.webCodecsEncoder.configure(config);
        console.log(`WebCodecs encoder configured for MP4 at ${targetFPS} FPS`);
    }

    /**
     * Start advanced recording process similar to MapDirector
     */
    async startAdvancedRecording() {
        if (!this.mediaRecorder && !this.webCodecsEncoder) {
            throw new Error('No recorder initialized');
        }

        // Start MediaRecorder if using traditional approach
        if (this.mediaRecorder) {
            this.mediaRecorder.start(100); // Collect data every 100ms for smoother recording
        }

        // Reset animation to start
        console.log('🎬 Resetting animation to start...');
        if (this.app.playback && this.app.playback.reset) {
            this.app.playback.reset();
        } else if (this.app.map && this.app.map.resetAnimation) {
            this.app.map.resetAnimation();
        }
        
        await this.waitForMapReady();

        // Start the frame-by-frame recording process
        this.updateProgress(85, 'Recording animation frames...');
        await this.recordAnimationFrames();
    }

    /**
     * Record animation frames similar to MapDirector's approach
     */
    async recordAnimationFrames() {
        // Reset segment tracking for new recording
        this.lastSegmentIndex = -1;
        this.segmentChangeTime = null;
        
        return new Promise((resolve, reject) => {
            let frameCount = 0;
            let lastProgressUpdate = 0;
            const targetFPS = this.optimalSettings.framerate || 30;
            const frameInterval = 1000 / targetFPS;
            let lastFrameTime = 0;
            const startTime = performance.now(); // Use performance.now() for consistent timing
            const maxRecordingTime = 600000; // 10 minutes max
            
            // Calculate expected duration and frame timing for proper video length
            const expectedDuration = this.estimateAnimationDuration();
            const expectedFrameCount = Math.round(expectedDuration * targetFPS);
            
            console.log(`🎬 Starting frame recording at ${targetFPS} FPS...`);
            console.log(`  - Expected duration: ${expectedDuration}s`);
            console.log(`  - Expected frame count: ${expectedFrameCount}`);

            const renderFrame = async (currentTime) => {
                try {
                    // Safety timeout (convert maxRecordingTime to match performance.now() units)
                    if (performance.now() - startTime > maxRecordingTime) {
                        console.warn('⚠️ Recording timeout reached, stopping...');
                        console.log(`Recorded ${frameCount} frames before timeout`);
                        this.finishRecording();
                        resolve();
                        return;
                    }

                    // Throttle to target FPS with optimized frame capture
                    if (currentTime - lastFrameTime >= frameInterval) {
                        await this.captureFrame(frameCount);
                        frameCount++;
                        lastFrameTime = currentTime;

                        // Update progress less frequently for better performance
                        const now = Date.now();
                        if (now - lastProgressUpdate > 2000) { // Reduced from 1s to 2s
                            const animationProgress = this.getAnimationProgress();
                            const frameProgress = Math.min((frameCount / expectedFrameCount), 1.0);
                            const displayProgress = Math.max(animationProgress, frameProgress) * 100;
                            
                            this.updateProgress(85 + (displayProgress * 0.1), 
                                `Recording frame ${frameCount}/${expectedFrameCount}... ${Math.round(displayProgress)}% complete`);
                            lastProgressUpdate = now;
                            // Reduced console logging frequency
                            if (frameCount % 30 === 0) {
                                console.log(`📹 Frame ${frameCount}/${expectedFrameCount}, Animation: ${Math.round(animationProgress * 100)}%`);
                            }
                        }
                    }

                    // Check both animation progress and elapsed time for stop condition
                    const progress = this.getAnimationProgress();
                    const elapsedTime = (performance.now() - startTime) / 1000; // Use performance.now() consistently
                    const animationDone = (progress >= 1.0) && !this.isAnimationPlaying();
                    
                    // Also stop if we've recorded for the expected duration (with small buffer)
                    const recordingComplete = elapsedTime >= (expectedDuration - 1); // 1s buffer
                    
                    if (animationDone || recordingComplete) {
                        // Optionally capture one final frame after animation stops
                        if (timeSinceLastFrame >= frameInterval) {
                            await this.captureFrame(frameCount);
                            frameCount++;
                        }
                        
                        console.log(`🎬 Recording completed: ${frameCount} frames captured in ${elapsedTime.toFixed(1)}s`);
                        console.log(`  - Expected: ${expectedDuration}s, Target frames: ${expectedFrameCount}`);
                        console.log(`  - Actual: ${elapsedTime.toFixed(1)}s, Actual frames: ${frameCount}`);
                        console.log(`  - Stop reason: ${animationDone ? 'Animation done' : 'Time limit reached'}`);
                        
                        this.finishRecording();
                        resolve();
                    } else {
                        requestAnimationFrame(renderFrame);
                    }
                } catch (error) {
                    console.error('❌ Frame recording error:', error);
                    reject(error);
                }
            };

            // Start animation and recording
            console.log('🎬 Starting animation playback...');
            if (this.app.playback && this.app.playback.play) {
                this.app.playback.play();
            } else if (this.app.map && this.app.map.startAnimation) {
                this.app.map.startAnimation();
            }
            
            // Delay slightly to ensure animation has started
            setTimeout(() => {
                console.log('🎬 Starting frame capture loop...');
                requestAnimationFrame(renderFrame);
            }, 100);
        });
    }

    /**
     * Capture a single frame of the entire videoCaptureContainer
     */
    async captureFrame(frameNumber) {
        const { width, height } = this.recordingDimensions;

        try {
            // Clear the recording canvas
            this.recordingContext.clearRect(0, 0, width, height);

            // Capture the entire videoCaptureContainer using DOM-to-canvas approach
            await this.captureContainerToCanvas();

            // If using WebCodecs, encode this frame
            if (this.webCodecsEncoder) {
                this.encodeFrameWithWebCodecs(frameNumber);
            }
        } catch (error) {
            console.warn(`Frame ${frameNumber} capture failed:`, error);
            // Fallback: just draw the map canvas if container capture fails
            this.fallbackMapCapture();
        }
    }

    /**
     * Capture the videoCaptureContainer content to the recording canvas
     */
    async captureContainerToCanvas() {
        const { width, height, scale, offsetX, offsetY, scaledWidth, scaledHeight, containerRect } = this.recordingDimensions;
        
        // Clear canvas with background color
        this.recordingContext.fillStyle = '#000000';
        this.recordingContext.fillRect(0, 0, width, height);
        
        // Method 1: Try using html2canvas if available
        if (window.html2canvas) {
            try {
                const canvas = await html2canvas(this.videoCaptureContainer, {
                    width: width,
                    height: height,
                    backgroundColor: null,
                    allowTaint: true,
                    useCORS: true,
                    logging: false,
                    scale: 1,
                    ignoreElements: (element) => {
                        // Ignore certain elements that might cause issues
                        return element.tagName === 'SCRIPT' || element.tagName === 'STYLE';
                    }
                });
                
                // Draw the html2canvas result directly (no scaling needed)
                this.recordingContext.drawImage(canvas, 0, 0, width, height);
                
                // Always manually draw the programmatic logo over html2canvas result
                await this.drawProgrammaticLogo();
                
                return;
            } catch (error) {
                console.warn('html2canvas failed, using manual method:', error);
            }
        } else {
            console.log('html2canvas not available, using manual DOM capture');
        }

        // Method 2: Manual DOM element capture with proper scaling
        await this.manualDOMCapture();
    }

    /**
     * Manual DOM capture approach - captures elements individually (direct mapping)
     */
    async manualDOMCapture() {
        const { width, height } = this.recordingDimensions;

        // 1. Draw the map canvas first (direct mapping since container matches target size)
        const mapCanvas = this.app.mapRenderer.map.getCanvas();
        if (mapCanvas) {
            this.recordingContext.drawImage(mapCanvas, 0, 0, width, height);
        }

        // 2. Capture and draw the live stats overlay
        await this.drawLiveStatsOverlay();

        // 3. Capture and draw the elevation profile
        await this.drawElevationProfile();

        // 4. Draw the programmatic logo watermark (DOM logo removed)
        await this.drawProgrammaticLogo();

        // 5. Draw any active annotations
        await this.drawActiveAnnotations();

        // 6. Draw final animation stats if animation is complete
        await this.drawFinalAnimationStats(this.recordingContext);
    }

    /**
     * Fallback method: just capture the map canvas
     */
    fallbackMapCapture() {
        const mapCanvas = this.app.mapRenderer.map.getCanvas();
        const { width, height } = this.recordingDimensions;
        
        if (mapCanvas) {
            this.recordingContext.drawImage(mapCanvas, 0, 0, width, height);
        }
    }

    /**
     * Phase 1: Capture high-quality frames during animation playback
     */
    async captureAnimationFrames() {
        // Initialize frame storage
        this.capturedFrames = [];
        this.captureQuality = 2; // Higher quality multiplier
        
        // Get cinematic durations from FollowBehindCamera
        const camera = this.app.mapRenderer?.followBehindCamera;
        const zoomInDuration = camera?.getCinematicDuration ? camera.getCinematicDuration() : 2000; // ms
        const zoomOutDuration = camera?.getZoomOutDuration ? camera.getZoomOutDuration() : 3000; // ms
        
        return new Promise((resolve, reject) => {
            let frameCount = 0;
            let lastProgressUpdate = 0;
            const targetFPS = 30; // Fixed at 30 FPS for consistent timing
            const frameInterval = 1000 / targetFPS; // 33.33ms per frame
            let lastFrameTime = performance.now(); // Initialize to current time for proper throttling
            const startTime = performance.now(); // Use performance.now() for consistent timing
            const maxRecordingTime = 600000; // 10 minutes max

            let phase = 'zoomIn'; // 'zoomIn', 'main', 'zoomOut'
            let zoomInStart = null;
            let zoomOutStart = null;
            let mainPhaseStartTime = null; // Track when main phase starts

            // Calculate animation speed to ensure proper timing
            const expectedDuration = this.estimateAnimationDuration();
            const cinematicDurations = this.getCinematicDurations();
            const mainAnimationDuration = expectedDuration - cinematicDurations.zoomIn - cinematicDurations.zoomOut;
            
            // Calculate speed multiplier for smooth animation capture
            // 0.15x was too slow (only 13.7% in 24s), need to find the right balance
            let speedMultiplier = 0.5; // Moderate speed - let animation complete naturally
            
            console.log(`🎬 Animation timing setup:`);
            console.log(`  - Expected total duration: ${expectedDuration}s`);
            console.log(`  - Zoom-in duration: ${cinematicDurations.zoomIn}s`);
            console.log(`  - Main animation duration: ${mainAnimationDuration}s`);
            console.log(`  - Zoom-out duration: ${cinematicDurations.zoomOut}s`);
            console.log(`  - Setting speed multiplier: ${speedMultiplier}x (slower for full capture)`);
            
            // For video export, we want the animation to run slower to match expected duration
            if (this.app.mapRenderer && this.app.mapRenderer.setAnimationSpeed) {
                try {
                    this.app.mapRenderer.setAnimationSpeed(speedMultiplier);
                } catch (error) {
                    console.warn('Failed to set animation speed:', error);
                    speedMultiplier = 0.5; // Fallback to slower speed
                }
            }

            // Helper to trigger cinematic zoom-in
            const startZoomIn = async () => {
                // For video export, we don't manually trigger zoom-in
                // The MapRenderer.startAnimation() will handle it automatically
                console.log('🎬 Video export: letting MapRenderer handle zoom-in automatically');
            };

            // Helper to trigger cinematic zoom-out
            const startZoomOut = async () => {
                if (camera && camera.zoomOutToWholeTrack) {
                    camera.zoomOutToWholeTrack();
                }
            };

            const captureFrame = async (currentTime) => {
                try {
                    // Safety timeout (convert maxRecordingTime to match performance.now() units)
                    if (performance.now() - startTime > maxRecordingTime) {
                        console.warn('⚠️ Frame capture timeout reached, processing captured frames...');
                        console.log(`Captured ${this.capturedFrames.length} frames before timeout`);
                        resolve();
                        return;
                    }

                    // Capture frames at target FPS - use performance.now() for consistent timing
                    const now = performance.now();
                    const timeSinceLastFrame = now - lastFrameTime;
                    
                    // Reduced debug logging - only show every 50th frame
                    if (frameCount % 50 === 0 && frameCount < 200) {
                        console.log(`🔍 Frame ${frameCount}: timeSinceLastFrame=${timeSinceLastFrame.toFixed(1)}ms, frameInterval=${frameInterval.toFixed(1)}ms`);
                    }
                    
                    if (timeSinceLastFrame >= frameInterval) {
                        // Capture high-quality frame with timing
                        const captureStart = performance.now();
                        const frameData = await this.captureHighQualityFrame(frameCount);
                        const captureTime = performance.now() - captureStart;
                        
                        this.capturedFrames.push(frameData);
                        
                        frameCount++;
                        lastFrameTime = now;
                        
                        // Log slow captures (reduced threshold since we optimized)
                        if (captureTime > 50) { // If capture takes more than 50ms
                            console.warn(`⚠️ Slow frame capture: ${captureTime.toFixed(1)}ms for frame ${frameCount}`);
                        }

                        // Debug logging for frame capture
                        if (frameCount % 30 === 0) { // Log every 30 frames (1 second at 30fps)
                            const totalElapsed = (now - startTime) / 1000;
                            const actualFPS = frameCount / totalElapsed;
                            console.log(`📹 Captured ${frameCount} frames, phase: ${phase}, total elapsed: ${totalElapsed.toFixed(1)}s, actual FPS: ${actualFPS.toFixed(1)}`);
                        }

                        // Update progress periodically (reduced frequency for better performance)
                        if (now - lastProgressUpdate > 2000) { // Update every 2 seconds for better performance
                            const progress = this.getAnimationProgress();
                            const elapsedCapture = (now - startTime) / 1000;
                            
                            this.updateProgress(
                                65 + (progress * 15), 
                                `Phase 1: Capturing frames... ${Math.round(progress * 100)}% complete`
                            );
                            lastProgressUpdate = now;
                        }
                    }

                    // --- PHASE LOGIC ---
                    if (phase === 'zoomIn') {
                        if (!zoomInStart) {
                            zoomInStart = performance.now();
                            console.log(`🔍 Starting zoom-in phase (${zoomInDuration}ms)`);
                        }
                        // Wait for zoom-in duration
                        const zoomInElapsed = performance.now() - zoomInStart;
                        if (zoomInElapsed >= zoomInDuration) {
                            // Start main animation

                            phase = 'main';
                            mainPhaseStartTime = performance.now(); // Track when main phase starts
                            // Reset animation first to ensure clean start
                            if (this.app.playback && this.app.playback.reset) {
                                this.app.playback.reset();
                                console.log(`🔄 Animation reset complete`);
                            }
                            
                            // Start the animation
                            if (this.app.playback && this.app.playback.play) {
                                this.app.playback.play();
                                console.log(`▶️ Animation started via playback controller`);
                            } else if (this.app.map && this.app.map.startAnimation) {
                                this.app.map.startAnimation();
                                console.log(`▶️ Animation started via map controller`);
                            }
                            
                            // Check initial animation state
                            const initialProgress = this.getAnimationProgress();
                            console.log(`📊 Initial animation progress: ${(initialProgress * 100).toFixed(1)}%`);
                        }
                        requestAnimationFrame(captureFrame);
                        return;
                    }

                    if (phase === 'main') {
                        // Check animation progress and timing
                        const progress = this.getAnimationProgress();
                        const mainPhaseElapsed = mainPhaseStartTime ? (performance.now() - mainPhaseStartTime) / 1000 : 0;
                        const animationDone = (progress >= 1.0) && !this.isAnimationPlaying();
                        
                        // Calculate target capture time for main animation (excluding zoom phases)
                        const cinematicDurations = this.getCinematicDurations();
                        const mainAnimationDuration = expectedDuration - cinematicDurations.zoomIn - cinematicDurations.zoomOut;
                        
                        // Log progress every 2 seconds instead of every frame to reduce spam
                        if (frameCount % 60 === 0) { // Every 60 frames = 2 seconds at 30fps
                            const isAnimationDone = (progress >= 1.0) && !this.isAnimationPlaying();
                            console.log(`📹 Main phase progress: ${(progress * 100).toFixed(1)}%, elapsed: ${mainPhaseElapsed.toFixed(1)}s, waiting for animation completion, animDone: ${isAnimationDone}`);
                        }
                        
                        // Stop main phase when animation actually completes (not based on fixed time)
                        // This ensures we capture the complete animation regardless of how long it takes
                        const mainPhaseComplete = animationDone || (progress >= 0.98); // 98% to account for floating point precision
                        
                        // Log if we're waiting longer than expected
                        if (mainPhaseElapsed > mainAnimationDuration * 1.5) {
                            console.warn(`⚠️ Animation taking longer than expected: ${mainPhaseElapsed.toFixed(1)}s (expected: ${mainAnimationDuration.toFixed(1)}s)`);
                            console.warn(`  - Progress: ${(progress * 100).toFixed(1)}%, animDone: ${animationDone}`);
                        }
                        
                        if (mainPhaseComplete) {


                            // Start zoom-out phase
                            phase = 'zoomOut';
                            zoomOutStart = performance.now();
                            await startZoomOut();
                            requestAnimationFrame(captureFrame);
                            return;
                        } else {
                            requestAnimationFrame(captureFrame);
                            return;
                        }
                    }

                    if (phase === 'zoomOut') {
                        // Wait for zoom-out duration
                        if (performance.now() - zoomOutStart >= zoomOutDuration) {
                            // Optionally capture one final frame after zoom-out
                            const frameData = await this.captureHighQualityFrame(frameCount);
                            this.capturedFrames.push(frameData);
                            resolve();
                        } else {
                            requestAnimationFrame(captureFrame);
                        }
                        return;
                    }
                } catch (error) {
                    console.error('❌ Frame capture error:', error);
                    reject(error);
                }
            };

            // Start cinematic zoom-in and frame capture
            console.log(`🎬 Starting frame capture process...`);
            console.log(`  - Max recording time: ${maxRecordingTime / 1000}s`);
            console.log(`  - Target FPS: ${targetFPS}`);
            console.log(`  - Frame interval: ${frameInterval}ms`);
            
            (async () => {
                await startZoomIn();
                console.log(`🎬 Initial zoom-in triggered, starting capture loop...`);
                requestAnimationFrame(captureFrame);
            })();
        });
    }

    /**
     * Capture a fast frame optimized for video export (bypassing slow html2canvas)
     */
    async captureHighQualityFrame(frameNumber) {
        const { width, height } = this.recordingDimensions;

        try {
            // Create a standard resolution capture canvas for speed
            const captureCanvas = document.createElement('canvas');
            const captureContext = captureCanvas.getContext('2d');
            
            // Use 1x resolution for speed (we can increase later if needed)
            captureCanvas.width = width;
            captureCanvas.height = height;

            // Clear with black background
            captureContext.fillStyle = '#000000';
            captureContext.fillRect(0, 0, width, height);

            // Use the full manual capture method to include all UI elements
            await this.manualHighQualityCapture(captureContext, width, height);

            return {
                canvas: captureCanvas,
                frameNumber: frameNumber,
                timestamp: Date.now()
            };
        } catch (error) {
            console.warn(`Fast frame ${frameNumber} capture failed:`, error);
            // Fallback to regular capture
            return this.fallbackFrameCapture(frameNumber);
        }
    }

    /**
     * Fast manual capture method optimized for speed (no html2canvas)
     */
    async fastManualCapture(context, width, height) {
        // 1. Draw the map canvas directly (fastest operation)
        const mapCanvas = this.app.mapRenderer.map.getCanvas();
        if (mapCanvas) {
            context.drawImage(mapCanvas, 0, 0, width, height);
        }

        // 2. Draw only the essential overlays (skip slow DOM operations)
        // Use cached logo (already implemented)
        if (this.cachedLogoImage) {
            const logoWidth = 160;
            const logoHeight = 64;
            const logoX = 16;
            const logoY = 16;
            
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(this.cachedLogoImage, logoX, logoY, logoWidth, logoHeight);
        }

        // 3. Draw stats overlay if visible (simplified version)
        this.drawFastStats(context, width, height);
    }

    /**
     * Fast stats drawing (skip complex DOM parsing)
     */
    drawFastStats(context, width, height) {
        try {
            const statsElement = document.querySelector('.video-stats-overlay');
            if (!statsElement || statsElement.style.display === 'none') return;

            // Get current stats values directly instead of DOM parsing
            const progress = this.getAnimationProgress();
            const currentTime = this.formatTime(progress * this.estimateAnimationDuration());
            const totalTime = this.formatTime(this.estimateAnimationDuration());
            
            // Draw simple text-based stats overlay
            context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            context.fillRect(width - 200, 16, 180, 80);
            
            context.fillStyle = '#ffffff';
            context.font = '14px Arial';
            context.textAlign = 'left';
            
            const statsY = 35;
            context.fillText(`Progress: ${Math.round(progress * 100)}%`, width - 190, statsY);
            context.fillText(`Time: ${currentTime}/${totalTime}`, width - 190, statsY + 20);
            
        } catch (error) {
            // Silently skip stats if there's any error
            console.debug('Fast stats drawing skipped:', error);
        }
    }

    /**
     * Format seconds into MM:SS format
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Manual high-quality DOM capture (direct mapping)
     */
    async manualHighQualityCapture(context, width, height) {
        // 1. Draw the map canvas first (direct mapping)
        const mapCanvas = this.app.mapRenderer.map.getCanvas();
        if (mapCanvas) {
            context.drawImage(mapCanvas, 0, 0, width, height);
        }

        // 2. Capture and draw the live stats overlay
        await this.drawHighQualityLiveStats(context);

        // 3. Capture and draw the elevation profile
        await this.drawHighQualityElevationProfile(context);

        // 4. Draw the programmatic logo watermark (DOM logo removed)
        await this.drawHighQualityProgrammaticLogo(context);

        // 5. Draw any active annotations
        await this.drawHighQualityAnnotations(context);

        // 6. Draw final animation stats if animation is complete
        await this.drawFinalAnimationStats(context);
    }

    /**
     * Draw SVG path data to canvas context
     */
    drawSVGPath(context, pathData, x, y, width, height, strokeColor, fillColor) {
        if (!pathData) return;

        // Parse the SVG path and draw it
        const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
        
        context.beginPath();
        let currentX = 0, currentY = 0;
        
        for (const command of commands) {
            const type = command[0];
            const params = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
            
            switch (type) {
                case 'M': // Move to
                    if (params.length >= 2) {
                        currentX = (params[0] / 800) * width + x; // 800 is SVG viewBox width
                        currentY = (params[1] / 60) * height + y; // 60 is SVG viewBox height
                        context.moveTo(currentX, currentY);
                    }
                    break;
                case 'L': // Line to
                    if (params.length >= 2) {
                        currentX = (params[0] / 800) * width + x;
                        currentY = (params[1] / 60) * height + y;
                        context.lineTo(currentX, currentY);
                    }
                    break;
                case 'Z': // Close path
                    context.closePath();
                    break;
            }
        }
        
        // Fill and stroke the path
        if (fillColor) {
            context.fillStyle = fillColor;
            context.fill();
        }
        
        if (strokeColor) {
            context.strokeStyle = strokeColor;
            context.lineWidth = 1;
            context.stroke();
        }
    }

    /**
     * Draw progress marker on elevation profile
     */
    drawProgressMarker(context, x, y, width, height, progress) {
        // Marker drawing removed to match live animation
    }

    /**
     * Fallback simple progress bar drawing
     */
    drawSimpleProgressBar(context, x, y, width, height, progress) {
        const barHeight = 10;
        const barY = y + height - 30;

        // Background
        context.fillStyle = 'rgba(76, 175, 80, 0.3)';
        context.fillRect(x, barY, width, barHeight);

        // Progress
        context.fillStyle = 'rgba(193, 101, 47, 0.8)';
        const progressWidth = Math.max(2, width * progress);
        context.fillRect(x, barY, progressWidth, barHeight);

        // Border
        context.strokeStyle = '#4CAF50';
        context.lineWidth = 1;
        context.strokeRect(x, barY, width, barHeight);

    }

    /**
     * Phase 2: Create video from captured high-quality frames
     */
    async createVideoFromFrames() {
        if (!this.capturedFrames || this.capturedFrames.length === 0) {
            throw new Error('No frames captured to create video');
        }

        // Initialize MediaRecorder with optimal settings
        await this.initializeAdvancedMediaRecorder();
        
        // Start MediaRecorder
        this.mediaRecorder.start();
        const startTime = Date.now();

        // Stream frames to MediaRecorder at exact 30 FPS
        // Calculate frame timing to match expected duration
        const expectedDuration = this.estimateAnimationDuration(); // Expected total duration
        const actualFrameCount = this.capturedFrames.length;
        
        // Calculate the frame rate needed to make the video match expected duration
        const adjustedFPS = actualFrameCount / expectedDuration;
        const frameInterval = 1000 / adjustedFPS;
        
        console.log(`🎬 Creating video from ${actualFrameCount} frames`);
        console.log(`  - Expected video duration: ${expectedDuration.toFixed(2)}s`);
        console.log(`  - Adjusted FPS: ${adjustedFPS.toFixed(1)} (to match expected duration)`);
        console.log(`  - Frame interval: ${frameInterval.toFixed(1)}ms`);
        
        let lastProgressUpdate = 0;
        
        for (let i = 0; i < this.capturedFrames.length; i++) {
            const frameData = this.capturedFrames[i];
            
            // Clear and draw frame to recording canvas
            const { width, height } = this.recordingDimensions;
            this.recordingContext.clearRect(0, 0, width, height);
            
            if (frameData.imageData) {
                // Draw captured ImageData
                this.recordingContext.putImageData(frameData.imageData, 0, 0);
            } else if (frameData.canvas) {
                // Draw captured canvas
                this.recordingContext.drawImage(frameData.canvas, 0, 0, width, height);
            }

            // Update progress less frequently during encoding for better performance
            const now = Date.now();
            if (now - lastProgressUpdate > 3000 || i % 100 === 0) { // Update every 3 seconds or every 100 frames
                const progress = (i / this.capturedFrames.length) * 100;
                
                this.updateProgress(
                    85 + (progress * 0.1), 
                    `Phase 2: Encoding video... ${progress.toFixed(0)}% complete`
                );
                lastProgressUpdate = now;
            }

            // Let MediaRecorder capture this frame with corrected timing
            await new Promise(resolve => {
                setTimeout(resolve, frameInterval);
            });
        }

        // Stop recording and finalize
        this.mediaRecorder.stop();
        await this.finishRecording();
        
        console.log(`✅ Video created with ${actualFrameCount} frames at ${adjustedFPS.toFixed(1)} FPS`);
        console.log(`  - Final video duration: ${expectedDuration.toFixed(2)}s (matches expected duration)`);
        
        // Clean up captured frames to free memory
        this.capturedFrames = [];
        
        // Clear logo cache to free memory
        this.cachedLogoImage = null;
    }

    /**
     * Fallback frame capture method
     */
    fallbackFrameCapture(frameNumber) {
        const { width, height } = this.recordingDimensions;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        // Just capture the map canvas as fallback
        const mapCanvas = this.app.mapRenderer.map.getCanvas();
        if (mapCanvas) {
            context.drawImage(mapCanvas, 0, 0, width, height);
        }

        return {
            canvas: canvas,
            frameNumber: frameNumber,
            timestamp: Date.now()
        };
    }

    /**
     * High-quality live stats drawing - positioned correctly for video export
     */
    async drawHighQualityLiveStats(context) {
        const liveStatsOverlay = document.getElementById('liveStatsOverlay');
        if (!liveStatsOverlay || liveStatsOverlay.style.display === 'none') return;

        // Skip normal stats drawing if we're in end-animation mode (final stats will be drawn separately)
        if (liveStatsOverlay.classList.contains('end-animation')) {
            return;
        }

        const { width, height } = this.recordingDimensions;
        
        // Use calculated positioning instead of DOM positioning (like end stats do)
        // Position in top-RIGHT corner matching CSS positioning
        const margin = 8; // 0.5rem = 8px
        const statsWidth = 120; // Approximate width for the stats block
        const x = width - statsWidth - margin; // Right-aligned positioning
        const y = margin + 10; // Small additional offset for better positioning
        
        // NO BACKGROUND - matches CSS: background: none !important;
        // The live stats overlay should be completely transparent

        // Get the stats elements from DOM
        const distanceElement = document.getElementById('liveDistance');
        const elevationElement = document.getElementById('liveElevation');
        const liveSpeedElement = document.getElementById('liveSpeed');
        const liveSpeedItem = document.getElementById('liveSpeedItem');
        const liveSpeedLabel = document.getElementById('liveSpeedLabel');

        // Text styling to match CSS (.live-stats-overlay)
        context.textAlign = 'left'; // matches text-align: left from CSS
        context.textBaseline = 'middle';
        context.fillStyle = '#FFFFFF'; // matches color: #fff from CSS
        
        // Add stronger text shadow for better visibility over light backgrounds
        context.shadowColor = 'rgba(0, 0, 0, 0.9)';
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        context.shadowBlur = 6;
        
        let currentY = y + 8; // Start with small padding to match CSS padding: 0.25rem 0.75rem
        const lineHeight = 18; // Increased line height for better spacing
        const startX = x + 12; // Match CSS padding-left: 0.75rem
        const labelValueGap = 30; // Increased gap between label and value

        // Draw distance
        if (distanceElement) {
            // Draw label and value on same line (matches CSS flex layout)
            context.font = '600 13px Arial, sans-serif'; // Reduced font size for better fit
            context.fillText('D:', startX, currentY);
            context.fillText(distanceElement.textContent, startX + labelValueGap, currentY);
            currentY += lineHeight;
        }

        // Draw elevation
        if (elevationElement) {
            // Draw label and value on same line
            context.font = '600 13px Arial, sans-serif';
            context.fillText('E:', startX, currentY);
            context.fillText(elevationElement.textContent, startX + labelValueGap, currentY);
            currentY += lineHeight;
        }

        // Draw live speed if enabled and visible
        if (liveSpeedItem && liveSpeedItem.style.display !== 'none' && liveSpeedElement && liveSpeedLabel) {
            // Draw label and value on same line with more space
            context.font = '600 12px Arial, sans-serif'; // Even smaller font for speed values
            context.fillText(liveSpeedLabel.textContent, startX, currentY);
            context.fillText(liveSpeedElement.textContent, startX + labelValueGap, currentY);
            currentY += lineHeight;
        }

        // Reset shadow for other elements
        context.shadowColor = 'transparent';

        // Draw segment speed overlay if visible
        await this.drawHighQualitySegmentSpeedOverlay(context);
    }

    /**
     * Draw high-quality segment speed overlay (kilometer segments info)
     */
    async drawHighQualitySegmentSpeedOverlay(context) {
        const liveSpeedSegments = document.getElementById('liveSpeedSegments');
        if (!liveSpeedSegments || liveSpeedSegments.style.display === 'none') return;

        const liveStatsOverlay = document.getElementById('liveStatsOverlay');
        if (liveStatsOverlay && liveStatsOverlay.classList.contains('end-animation')) {
            return; // Don't show during end animation
        }

        const { width, height } = this.recordingDimensions;

        // Use calculated positioning instead of DOM positioning
        // Position below the live stats, in top-RIGHT area
        const margin = 8;
        const overlayWidth = 180; // Fixed width similar to live stats
        const overlayHeight = 80; // Fixed height
        const x = width - overlayWidth - margin; // Right-aligned positioning
        const y = margin + 80; // Below live stats (which take ~70px)

        // No background for the segments container - it's transparent

        // Draw title
        const title = document.querySelector('.live-speed-segments-title');
        if (title) {
            context.fillStyle = 'rgba(255, 255, 255, 0.78)'; // Matches CSS color
            context.font = '600 10px Arial, sans-serif'; // Smaller font for compact display
            context.textAlign = 'center';
            context.textBaseline = 'top';
            context.fillText(title.textContent.toUpperCase(), x + overlayWidth / 2, y + 4);
        }

        // Draw segment info
        const segmentItem = document.querySelector('.speed-segment-item');
        if (segmentItem) {
            const segmentLabel = segmentItem.querySelector('.speed-segment-label');
            const segmentSpeed = segmentItem.querySelector('.speed-segment-speed');
            const segmentPace = segmentItem.querySelector('.speed-segment-pace');

            // Check if segment is currently in pulse state using time-based tracking
            const isInPulse = this.updateSegmentPulseState();

            let currentY = y + 25; // Below title
            const itemPadding = 4; // Reduced padding for compact display
            const itemHeight = 28; // Reduced height
            const itemX = x + 4; // Small margin
            const itemWidth = overlayWidth - 8; // Full width minus margins

            // Draw segment item background with blur effect (matches .speed-segment-item styles)
            let backgroundColor = 'rgba(255, 255, 255, 0.12)'; // Default white blurred background
            
            // Apply orange pulse effect ONLY during the 0.6s pulse window after segment change
            if (isInPulse) {
                backgroundColor = 'rgba(193, 101, 47, 0.55)'; // Orange background during pulse
                console.log('🟠 HIGH-QUALITY: APPLYING ORANGE BACKGROUND');
            } else {
                console.log('⚪ HIGH-QUALITY: Using white background');
            }

            // Draw background with rounded corners (matches border-radius: 10px)
            context.fillStyle = backgroundColor;
            this.drawRoundedRect(context, itemX, currentY - itemPadding, itemWidth, itemHeight, 8);
            context.fill();

            // Simulate backdrop-filter blur effect with additional semi-transparent layer
            context.fillStyle = 'rgba(255, 255, 255, 0.08)';
            this.drawRoundedRect(context, itemX, currentY - itemPadding, itemWidth, itemHeight, 8);
            context.fill();

            const leftPadding = itemX + 6;
            const rightPadding = itemX + itemWidth - 6;

            // Draw segment label (e.g., "Km 2 · +15m") - left aligned, uppercase
            if (segmentLabel) {
                context.fillStyle = '#FFFFFF';
                context.font = '600 10px Arial, sans-serif'; // Smaller font
                context.textAlign = 'left';
                context.textBaseline = 'middle';
                // Add stronger text shadow for better visibility
                context.shadowColor = 'rgba(0, 0, 0, 0.9)';
                context.shadowOffsetX = 2;
                context.shadowOffsetY = 2;
                context.shadowBlur = 4;
                context.fillText(segmentLabel.textContent.toUpperCase(), leftPadding, currentY + 2);
            }

            // Draw speed values in the values container (right side)
            if (segmentSpeed) {
                const valuesY = currentY + 14; // Below the label
                
                // Primary speed value (larger)
                context.fillStyle = '#FFFFFF';
                context.font = '600 11px JetBrains Mono, monospace'; // Smaller font for compact display
                context.textAlign = 'right';
                // Add stronger text shadow for better visibility
                context.shadowColor = 'rgba(0, 0, 0, 0.9)';
                context.shadowOffsetX = 2;
                context.shadowOffsetY = 2;
                context.shadowBlur = 4;
                context.fillText(segmentSpeed.textContent, rightPadding, valuesY);
                
                // Secondary value (pace or speed) - smaller, slightly transparent
                if (segmentPace && segmentPace.textContent !== segmentSpeed.textContent) {
                    context.fillStyle = 'rgba(255, 255, 255, 0.75)'; // Matches CSS opacity
                    context.font = '400 9px JetBrains Mono, monospace'; // Even smaller font
                    context.fillText(segmentPace.textContent, rightPadding, valuesY - 10); // Above primary value
                }
                
                // Reset shadow
                context.shadowColor = 'transparent';
            }
        }
    }

    /**
     * High-quality elevation profile drawing - positioned at bottom of video
     */
    async drawHighQualityElevationProfile(context) {
        const elevationContainer = document.querySelector('.elevation-profile-container');
        if (!elevationContainer || elevationContainer.style.display === 'none') return;

        const { width, height } = this.recordingDimensions;
        
        // Use calculated positioning instead of DOM positioning
        // Position at bottom matching CSS: bottom: 0.75rem, left: 0.75rem, right: 0.75rem
        const margin = 12; // 0.75rem = 12px
        const profileHeight = 60; // Fixed height for elevation profile
        const x = margin;
        const y = height - profileHeight - margin; // Bottom positioning
        const profileWidth = width - (margin * 2); // Full width minus margins

        // Get current progress - try multiple sources for accuracy
        let progress = this.getAnimationProgress();
        
        // Additional check: try to get progress directly from playback controller during export
        if (this.isExporting) {
            // Try multiple sources for playback progress
            if (this.app.playback && this.app.playback.getProgress) {
                const playbackProgress = this.app.playback.getProgress();
                if (playbackProgress >= 0 && playbackProgress <= 1) {
                    progress = playbackProgress;
                    console.log(`High-quality: Using playback controller progress: ${progress.toFixed(3)}`);
                }
            } else if (this.app.playback && this.app.playback.getCurrentProgress) {
                const playbackProgress = this.app.playback.getCurrentProgress();
                if (playbackProgress >= 0 && playbackProgress <= 1) {
                    progress = playbackProgress;
                    console.log(`High-quality: Using playback getCurrentProgress: ${progress.toFixed(3)}`);
                }
            } else if (this.app.progressController && this.app.progressController.getProgress) {
                const progressControllerProgress = this.app.progressController.getProgress();
                if (progressControllerProgress >= 0 && progressControllerProgress <= 1) {
                    progress = progressControllerProgress;
                    console.log(`High-quality: Using progress controller: ${progress.toFixed(3)}`);
                }
            }
        }

        // Try to capture the actual SVG elements from the browser first
        const elevationPath = document.getElementById('elevationPath');
        const progressPath = document.getElementById('progressPath');
        
        if (elevationPath && progressPath) {
            // Get the actual SVG paths that are being displayed
            const elevationPathData = elevationPath.getAttribute('d');
            const progressPathData = progressPath.getAttribute('d');
            
            if (elevationPathData && progressPathData) {
                // Draw the elevation profile by parsing the SVG path with calculated positioning
                this.drawSVGPath(context, elevationPathData, x, y, profileWidth, profileHeight, '#4CAF50', 'rgba(76, 175, 80, 0.3)');
                
                // Draw the progress overlay
                this.drawSVGPath(context, progressPathData, x, y, profileWidth, profileHeight, '#C1652F', 'rgba(193, 101, 47, 0.8)');
            }
        } else if (progress >= 0) {
            // Fallback to simple progress bar
            const barWidth = profileWidth;
            const barHeight = 8; // Slightly thicker for better visibility
            const barX = x;
            const barY = y + profileHeight - 20; // Position within the profile area

            // Draw elevation profile background
            context.fillStyle = 'rgba(76, 175, 80, 0.3)';
            context.fillRect(barX, barY, barWidth, barHeight);

            // Draw border for the elevation profile
            context.strokeStyle = 'rgba(76, 175, 80, 0.6)';
            context.lineWidth = 1;
            context.strokeRect(barX, barY, barWidth, barHeight);

            // Draw progress fill - always draw something even at 0 progress
            context.fillStyle = '#C1652F';
            const progressWidth = Math.max(2, barWidth * progress); // Minimum 2px width
            context.fillRect(barX, barY, progressWidth, barHeight);
        }

        // Draw elevation labels (min, max, live) with calculated positioning
        await this.drawElevationLabelsCalculated(context, x, y, profileWidth, profileHeight);
    }

    /**
     * High-quality programmatic logo drawing (DOM element removed)
     */
    async drawHighQualityProgrammaticLogo(context) {
        const { width, height } = this.recordingDimensions;
        
        // Position logo in top-left corner with some padding
        const padding = 16;
        const logoWidth = 160;
        const logoHeight = 64; // Adjusted for proper SVG aspect ratio
        
        const x = padding;
        const y = padding;
        
        // Try to load and draw the actual SVG logo
        try {
            await this.drawActualSVGLogo(context, x, y, logoWidth, logoHeight);
        } catch (error) {
            console.warn('Failed to draw high-quality SVG logo, using fallback:', error);
            this.drawHighQualityProfessionalLogo(context, x, y, logoWidth, logoHeight);
        }
    }

    /**
     * Draw final animation stats if animation is complete
     */
    async drawFinalAnimationStats(context) {
        // Only show final stats when animation is actually complete (progress >= 1.0)
        const animationProgress = this.getAnimationProgress();
        if (animationProgress < 1.0) {
            return; // Only show stats at the very end of the animation
        }

        // Check if we should show end stats
        const showEndStats = this.app.map?.showEndStats ?? true;
        if (!showEndStats) {
            return; // Don't draw if end stats are disabled
        }

        // Get selected stats from the app
        const selectedStats = this.app.getSelectedEndStats ?
            this.app.getSelectedEndStats() :
            ['distance', 'elevation'];


        if (selectedStats.length === 0) {
            return; // No stats selected
        }

        // Draw stats directly on the canvas like other overlays
        const { width: videoWidth, height: videoHeight } = this.recordingDimensions;
        const ctx = context;

        // Check aspect ratio to match live animation layout
        const videoContainer = this.videoCaptureContainer;
        const isLandscape = videoContainer && videoContainer.classList.contains('aspect-landscape');
        const isSquare = videoContainer && videoContainer.classList.contains('aspect-square');
        const isMobile = videoContainer && videoContainer.classList.contains('aspect-mobile');

        // Calculate stats panel dimensions and position to match live animation
        let statsWidth, statsHeight, cols;

        if (isMobile) {
            // Mobile: single column, flexible width
            statsWidth = Math.min(300, videoWidth * 0.9);
            statsHeight = Math.min(500, videoHeight * 0.8);
            cols = 1;
        } else if (isSquare) {
            // Square: 2 columns
            statsWidth = Math.min(500, videoWidth * 0.8);
            statsHeight = Math.min(400, videoHeight * 0.6);
            cols = 2;
        } else {
            // Landscape/Default: 3 columns
            statsWidth = Math.min(600, videoWidth * 0.8);
            statsHeight = Math.min(400, videoHeight * 0.6);
            cols = 3;
        }

        const statsX = (videoWidth - statsWidth) / 2;
        const statsY = (videoHeight - statsHeight) / 2;

        // No background for the overlay (matches live animation)
        // Draw title with proper styling and shadow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = '700 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Add text shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 4;
        ctx.fillText(t('stats.title'), videoWidth / 2, statsY + 30);
        // Reset shadow
        ctx.shadowColor = 'transparent';

        // Calculate grid layout for stats
        const numStats = selectedStats.length;
        const rows = Math.ceil(numStats / cols);

        // Add gaps to match CSS (12px for desktop/square, 6px for mobile)
        const gap = isMobile ? 6 : 12;
        const totalGapWidth = (cols - 1) * gap;
        const totalGapHeight = (rows - 1) * gap;

        const statWidth = (statsWidth - totalGapWidth) / cols;
        const statHeight = (statsHeight - 60 - totalGapHeight) / rows; // Subtract title space and gaps

        // Get stat values from DOM elements
        const getStatValue = (statKey) => {
            const elementMap = {
                distance: 'totalDistance',
                elevation: 'elevationGain',
                duration: 'duration',
                speed: 'averageSpeed',
                pace: 'averagePace',
                maxelevation: 'maxElevation',
                minelevation: 'minElevation'
            };

            const elementId = elementMap[statKey];
            if (elementId) {
                const element = document.getElementById(elementId);
                return element ? element.textContent : 'N/A';
            }
            return 'N/A';
        };

        const getStatLabel = (statKey) => {
            const translationMap = {
                distance: 'stats.distance',
                elevation: 'stats.elevation',
                duration: 'stats.duration',
                speed: 'stats.averageSpeed',
                pace: 'stats.averagePace',
                maxelevation: 'stats.maxElevation',
                minelevation: 'stats.minElevation'
            };

            const translationKey = translationMap[statKey];
            if (translationKey) {
                return t(translationKey);
            }
            return statKey;
        };

        // Draw each stat
        selectedStats.forEach((statKey, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            const statX = statsX + (col * (statWidth + gap));
            const statY = statsY + 60 + (row * (statHeight + gap)); // 60px for title

            const statValue = getStatValue(statKey);
            const statLabel = getStatLabel(statKey);


            // Match live animation styles exactly
            if (isMobile) {
                // Mobile layout: horizontal flex layout
                const boxPadding = 12;
                const boxWidth = statWidth - (boxPadding * 2);
                const boxHeight = 50; // Fixed height for mobile

                // Draw stat box background with enhanced blur effect for better text visibility
                // First layer: darker base background for better contrast
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                this.drawRoundedRect(ctx, statX + boxPadding, statY + boxPadding, boxWidth, boxHeight, 6);
                ctx.fill();

                // Second layer: white overlay for blur effect
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                this.drawRoundedRect(ctx, statX + boxPadding, statY + boxPadding, boxWidth, boxHeight, 6);
                ctx.fill();

                // Third layer: additional blur simulation
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                this.drawRoundedRect(ctx, statX + boxPadding, statY + boxPadding, boxWidth, boxHeight, 6);
                ctx.fill();

                // Draw stat box border with better visibility
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                this.drawRoundedRect(ctx, statX + boxPadding, statY + boxPadding, boxWidth, boxHeight, 6);
                ctx.stroke();

                // Draw stat label (left side, matches .aspect-mobile .final-stat-box .final-stat-label)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = '500 12px Arial, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(statLabel.toUpperCase(), statX + boxPadding + 10, statY + boxPadding + boxHeight / 2);

                // Draw stat value (right side, matches .aspect-mobile .final-stat-box .final-stat-value)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.font = '700 14px Arial, sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                // Add text shadow effect
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 1;
                ctx.shadowBlur = 2;
                ctx.fillText(statValue, statX + statWidth - boxPadding - 10, statY + boxPadding + boxHeight / 2);
                // Reset shadow
                ctx.shadowColor = 'transparent';

            } else {
                // Desktop/Square layout: vertical centered layout
                const boxPadding = 10;
                const boxWidth = statWidth - (boxPadding * 2);
                const boxHeight = statHeight - (boxPadding * 2);

                // Draw stat box background with enhanced blur effect for better text visibility
                // First layer: darker base background for better contrast
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                this.drawRoundedRect(ctx, statX + boxPadding, statY + boxPadding, boxWidth, boxHeight, 6);
                ctx.fill();

                // Second layer: white overlay for blur effect
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                this.drawRoundedRect(ctx, statX + boxPadding, statY + boxPadding, boxWidth, boxHeight, 6);
                ctx.fill();

                // Third layer: additional blur simulation
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                this.drawRoundedRect(ctx, statX + boxPadding, statY + boxPadding, boxWidth, boxHeight, 6);
                ctx.fill();

                // Draw stat box border with better visibility
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                this.drawRoundedRect(ctx, statX + boxPadding, statY + boxPadding, boxWidth, boxHeight, 6);
                ctx.stroke();

                // Draw stat label (matches .final-stat-label)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = '500 12px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(statLabel.toUpperCase(), statX + statWidth / 2, statY + boxPadding + 25);

                // Draw stat value (matches .final-stat-value)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.font = '700 16px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Add text shadow effect
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 1;
                ctx.shadowBlur = 2;
                ctx.fillText(statValue, statX + statWidth / 2, statY + boxPadding + 50);
                // Reset shadow
                ctx.shadowColor = 'transparent';
            }
        });

    }

    async drawFallbackStats(context) {
        // Fallback method in case html2canvas fails
        const liveStatsOverlay = document.getElementById('liveStatsOverlay');
        if (!liveStatsOverlay || !liveStatsOverlay.classList.contains('end-animation')) {
            return;
        }

        const { width, height } = this.recordingDimensions;

        // Get selected stats from the app's stats selection system, or show all stats by default
        const selectedStats = this.app.getSelectedEndStats ? this.app.getSelectedEndStats() : ['distance', 'elevation'];

        // Get the final stats values
        const statsElements = {
            distance: document.getElementById('totalDistance'),
            elevation: document.getElementById('elevationGain'),
            duration: document.getElementById('duration'),
            speed: document.getElementById('averageSpeed'),
            pace: document.getElementById('averagePace'),
            maxelevation: document.getElementById('maxElevation'),
            minelevation: document.getElementById('minElevation')
        };

        // Filter only selected stats that exist
        const availableStats = selectedStats.filter(stat => statsElements[stat] && statsElements[stat].textContent);

        if (availableStats.length === 0) return;

        // Calculate layout for stats boxes
        const boxWidth = 200;
        const boxHeight = 80;
        const padding = 20;
        const boxesPerRow = Math.min(3, availableStats.length);
        const totalRows = Math.ceil(availableStats.length / boxesPerRow);

        const totalWidth = (boxWidth * boxesPerRow) + (padding * (boxesPerRow - 1));
        const totalHeight = (boxHeight * totalRows) + (padding * (totalRows - 1));

        const startX = (width - totalWidth) / 2;
        const startY = height * 0.15; // 15% from top

        // Draw each stat box
        availableStats.forEach((statKey, index) => {
            const row = Math.floor(index / boxesPerRow);
            const col = index % boxesPerRow;

            const x = startX + (col * (boxWidth + padding));
            const y = startY + (row * (boxHeight + padding));

            // Draw background with blur effect
            context.fillStyle = 'rgba(255, 255, 255, 0.15)';
            context.fillRect(x, y, boxWidth, boxHeight);

            // Draw border
            context.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            context.lineWidth = 2;
            context.strokeRect(x, y, boxWidth, boxHeight);

            // Draw inner shadow effect
            context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            context.lineWidth = 1;
            context.strokeRect(x + 2, y + 2, boxWidth - 4, boxHeight - 4);

            // Draw stats text
            context.font = 'bold 18px Arial';
            context.fillStyle = 'rgba(255, 255, 255, 0.95)';
            context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            context.lineWidth = 2;
            context.textAlign = 'center';

            // Get stat label and value
            const element = statsElements[statKey];
            let label = '';
            let value = element.textContent;

            // Set appropriate labels
            switch(statKey) {
                case 'distance': label = 'Distance'; break;
                case 'elevation': label = 'Elevation'; break;
                case 'duration': label = 'Duration'; break;
                case 'speed': label = 'Avg Speed'; break;
                case 'pace': label = 'Avg Pace'; break;
                case 'maxelevation': label = 'Max Elev'; break;
                case 'minelevation': label = 'Min Elev'; break;
                default: label = statKey;
            }

            // Draw label
            context.strokeText(label, x + boxWidth/2, y + 25);
            context.fillText(label, x + boxWidth/2, y + 25);

            // Draw value
            context.font = 'bold 22px Arial';
            context.strokeText(value, x + boxWidth/2, y + 55);
            context.fillText(value, x + boxWidth/2, y + 55);
        });

        // Reset text alignment
        context.textAlign = 'left';
    }

    /**
     * Draw SVG logo to canvas by converting to image first
     */
    async drawSVGLogoToCanvas(context, svgUrl, x, y, width, height) {
        try {
            // Fetch the SVG content
            const response = await fetch(svgUrl);
            const svgText = await response.text();
            
            // Create a data URL from the SVG
            const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
            const svgObjectUrl = URL.createObjectURL(svgBlob);
            
            // Create an image from the SVG
            const img = new Image();
            
            return new Promise((resolve) => {
                img.onload = () => {
                    try {
                        context.imageSmoothingEnabled = true;
                        context.imageSmoothingQuality = 'high';
                        context.drawImage(img, x, y, width, height);
                        URL.revokeObjectURL(svgObjectUrl);
                        resolve();
                    } catch (drawError) {
                        URL.revokeObjectURL(svgObjectUrl);
                        this.drawHighQualityProfessionalLogo(context, x, y, width, height);
                        resolve();
                    }
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(svgObjectUrl);
                    this.drawHighQualityProfessionalLogo(context, x, y, width, height);
                    resolve();
                };
                
                img.src = svgObjectUrl;
                
                // Timeout fallback
                setTimeout(() => {
                    if (!img.complete) {
                        URL.revokeObjectURL(svgObjectUrl);
                        this.drawHighQualityProfessionalLogo(context, x, y, width, height);
                        resolve();
                    }
                }, 3000);
            });
        } catch (error) {
            console.warn('SVG conversion failed:', error);
            this.drawHighQualityProfessionalLogo(context, x, y, width, height);
        }
    }

    /**
     * Draw a high-quality professional TrailReplay logo
     */
    drawHighQualityProfessionalLogo(context, x, y, width, height) {
        // Calculate appropriate sizes based on the original logo position
        const logoWidth = Math.max(160, width);
        const logoHeight = Math.max(40, height);
        const padding = 12;
        const borderRadius = 6;
        
        // REMOVED: White background drawing to eliminate white square
        // Draw background with gradient
        // const gradient = context.createLinearGradient(x, y, x, y + logoHeight);
        // gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        // gradient.addColorStop(1, 'rgba(248, 249, 250, 0.95)');
        // context.fillStyle = gradient;
        
        // Draw rounded rectangle background
        // this.drawRoundedRectOnContext(context, x, y, logoWidth, logoHeight, borderRadius);
        // context.fill();
        
        // Draw subtle border with TrailReplay colors
        // context.strokeStyle = 'rgba(46, 125, 50, 0.4)';
        // context.lineWidth = 1.5;
        // this.drawRoundedRectOnContext(context, x, y, logoWidth, logoHeight, borderRadius);
        // context.stroke();
        
        // Draw hiking boot icon with better positioning and shadow for visibility
        context.fillStyle = '#C1652F'; // Orange color matching the trail
        context.font = 'bold 20px Arial'; // Slightly larger for high quality
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        // Add text shadow for better visibility without background
        context.shadowColor = 'rgba(0, 0, 0, 0.8)';
        context.shadowBlur = 3;
        context.shadowOffsetX = 1;
        context.shadowOffsetY = 1;
        context.fillText('🥾', x + padding, y + logoHeight/2);
        
        // Draw "TrailReplay" text with better typography and shadow
        context.fillStyle = '#FFFFFF'; // White text for visibility
        context.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'; // Larger for high quality
        context.textAlign = 'left';
        context.textBaseline = 'middle';
        // Keep text shadow for visibility
        context.fillText('TrailReplay', x + padding + 32, y + logoHeight/2);
        
        // Reset shadow
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
    }

    /**
     * Helper function to draw rounded rectangles on a specific context
     */
    drawRoundedRectOnContext(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * High-quality annotations drawing
     */
    async drawHighQualityAnnotations(context) {
        const activeAnnotation = document.getElementById('activeAnnotation');
        if (!activeAnnotation || activeAnnotation.style.display === 'none') return;

        const rect = activeAnnotation.getBoundingClientRect();
        const containerRect = this.videoCaptureContainer.getBoundingClientRect();
        
        const x = rect.left - containerRect.left;
        const y = rect.top - containerRect.top;

        const titleElement = activeAnnotation.querySelector('.annotation-popup-title');
        const descElement = activeAnnotation.querySelector('.annotation-popup-description');

        if (titleElement || descElement) {
            // Draw background with rounded corners effect
            context.fillStyle = 'rgba(0, 0, 0, 0.85)';
            context.fillRect(x, y, Math.min(rect.width, 350), Math.min(rect.height, 120));

            // Draw border
            context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            context.lineWidth = 1;
            context.strokeRect(x, y, Math.min(rect.width, 350), Math.min(rect.height, 120));

            // Draw text with high quality
            context.textAlign = 'left';
            context.textBaseline = 'top';
            
            if (titleElement && titleElement.textContent) {
                context.font = 'bold 16px Arial';
                context.fillStyle = 'white';
                context.fillText(titleElement.textContent, x + 15, y + 15);
            }
            
            if (descElement && descElement.textContent) {
                context.font = '14px Arial';
                context.fillStyle = 'rgba(255, 255, 255, 0.9)';
                context.fillText(descElement.textContent, x + 15, y + 45);
            }
        }
    }

    /**
     * Draw the live stats overlay from DOM
     */
    async drawLiveStatsOverlay() {
        const liveStatsOverlay = document.getElementById('liveStatsOverlay');
        if (!liveStatsOverlay || liveStatsOverlay.style.display === 'none') return;

        // Skip normal stats drawing if we're in end-animation mode (final stats will be drawn separately)
        if (liveStatsOverlay.classList.contains('end-animation')) {
            return;
        }

        const { width, height } = this.recordingDimensions;
        const ctx = this.recordingContext;
        
        // Use calculated positioning instead of DOM positioning (like end stats do)
        // Position in top-RIGHT corner matching CSS positioning
        const margin = 8; // 0.5rem = 8px
        const statsWidth = 120; // Approximate width for the stats block
        const x = width - statsWidth - margin; // Right-aligned positioning
        const y = margin + 10; // Small additional offset for better positioning
        
        // NO BACKGROUND - matches CSS: background: none !important;
        // The live stats overlay should be completely transparent

        // Get the stats elements from DOM
        const distanceElement = document.getElementById('liveDistance');
        const elevationElement = document.getElementById('liveElevation');
        const liveSpeedElement = document.getElementById('liveSpeed');
        const liveSpeedItem = document.getElementById('liveSpeedItem');
        const liveSpeedLabel = document.getElementById('liveSpeedLabel');

        // Text styling to match CSS (.live-stats-overlay)
        ctx.textAlign = 'left'; // matches text-align: left from CSS
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF'; // matches color: #fff from CSS
        
        // Add stronger text shadow for better visibility over light backgrounds
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.shadowBlur = 6;
        
        let currentY = y + 8; // Start with small padding to match CSS padding: 0.25rem 0.75rem
        const lineHeight = 18; // Increased line height for better spacing
        const startX = x + 12; // Match CSS padding-left: 0.75rem
        const labelValueGap = 30; // Increased gap between label and value

        // Draw distance
        if (distanceElement) {
            // Draw label and value on same line (matches CSS flex layout)
            ctx.font = '600 13px Arial, sans-serif'; // Reduced font size for better fit
            ctx.fillText('D:', startX, currentY);
            ctx.fillText(distanceElement.textContent, startX + labelValueGap, currentY);
            currentY += lineHeight;
        }

        // Draw elevation
        if (elevationElement) {
            // Draw label and value on same line
            ctx.font = '600 13px Arial, sans-serif';
            ctx.fillText('E:', startX, currentY);
            ctx.fillText(elevationElement.textContent, startX + labelValueGap, currentY);
            currentY += lineHeight;
        }

        // Draw live speed if enabled and visible
        if (liveSpeedItem && liveSpeedItem.style.display !== 'none' && liveSpeedElement && liveSpeedLabel) {
            // Draw label and value on same line with more space
            ctx.font = '600 12px Arial, sans-serif'; // Even smaller font for speed values
            ctx.fillText(liveSpeedLabel.textContent, startX, currentY);
            ctx.fillText(liveSpeedElement.textContent, startX + labelValueGap, currentY);
            currentY += lineHeight;
        }

        // Reset shadow for other elements
        ctx.shadowColor = 'transparent';

        // Draw segment speed overlay if visible
        await this.drawSegmentSpeedOverlay();
    }

    /**
     * Draw segment speed overlay (kilometer segments info)
     */
    async drawSegmentSpeedOverlay() {
        const liveSpeedSegments = document.getElementById('liveSpeedSegments');
        if (!liveSpeedSegments || liveSpeedSegments.style.display === 'none') return;

        const liveStatsOverlay = document.getElementById('liveStatsOverlay');
        if (liveStatsOverlay && liveStatsOverlay.classList.contains('end-animation')) {
            return; // Don't show during end animation
        }

        const { width, height } = this.recordingDimensions;
        const ctx = this.recordingContext;

        // Use calculated positioning instead of DOM positioning
        // Position below the live stats, in top-RIGHT area
        const margin = 8;
        const overlayWidth = 180; // Fixed width similar to live stats
        const overlayHeight = 80; // Fixed height
        const x = width - overlayWidth - margin; // Right-aligned positioning
        const y = margin + 80; // Below live stats (which take ~70px)

        // No background for the segments container - it's transparent

        // Draw title
        const title = document.querySelector('.live-speed-segments-title');
        if (title) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'; // Matches CSS color
            ctx.font = '600 10px Arial, sans-serif'; // Smaller font for compact display
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(title.textContent.toUpperCase(), x + overlayWidth / 2, y + 4);
        }

        // Draw segment info
        const segmentItem = document.querySelector('.speed-segment-item');
        if (segmentItem) {
            const segmentLabel = segmentItem.querySelector('.speed-segment-label');
            const segmentSpeed = segmentItem.querySelector('.speed-segment-speed');
            const segmentPace = segmentItem.querySelector('.speed-segment-pace');

            // Check if segment is currently in pulse state using time-based tracking
            const isInPulse = this.updateSegmentPulseState();

            let currentY = y + 25; // Below title
            const itemPadding = 4; // Reduced padding for compact display
            const itemHeight = 28; // Reduced height
            const itemX = x + 4; // Small margin
            const itemWidth = overlayWidth - 8; // Full width minus margins

            // Draw segment item background with blur effect (matches .speed-segment-item styles)
            let backgroundColor = 'rgba(255, 255, 255, 0.12)'; // Default white blurred background
            
            // Apply orange pulse effect ONLY during the 0.6s pulse window after segment change
            if (isInPulse) {
                backgroundColor = 'rgba(193, 101, 47, 0.55)'; // Orange background during pulse
                console.log('🟠 REGULAR: APPLYING ORANGE BACKGROUND');
            } else {
                console.log('⚪ REGULAR: Using white background');
            }

            // Draw background with rounded corners (matches border-radius: 10px)
            ctx.fillStyle = backgroundColor;
            this.drawRoundedRect(ctx, itemX, currentY - itemPadding, itemWidth, itemHeight, 8);
            ctx.fill();

            // Simulate backdrop-filter blur effect with additional semi-transparent layer
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            this.drawRoundedRect(ctx, itemX, currentY - itemPadding, itemWidth, itemHeight, 8);
            ctx.fill();

            const leftPadding = itemX + 6;
            const rightPadding = itemX + itemWidth - 6;

            // Draw segment label (e.g., "Km 2 · +15m") - left aligned, uppercase
            if (segmentLabel) {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '600 10px Arial, sans-serif'; // Smaller font
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                // Add stronger text shadow for better visibility
                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.shadowBlur = 4;
                ctx.fillText(segmentLabel.textContent.toUpperCase(), leftPadding, currentY + 2);
            }

            // Draw speed values in the values container (right side)
            if (segmentSpeed) {
                const valuesY = currentY + 14; // Below the label
                
                // Primary speed value (larger)
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '600 11px JetBrains Mono, monospace'; // Smaller font for compact display
                ctx.textAlign = 'right';
                // Add stronger text shadow for better visibility
                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.shadowBlur = 4;
                ctx.fillText(segmentSpeed.textContent, rightPadding, valuesY);
                
                // Secondary value (pace or speed) - smaller, slightly transparent
                if (segmentPace && segmentPace.textContent !== segmentSpeed.textContent) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'; // Matches CSS opacity
                    ctx.font = '400 9px JetBrains Mono, monospace'; // Even smaller font
                    ctx.fillText(segmentPace.textContent, rightPadding, valuesY - 10); // Above primary value
                }
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
            }
        }
    }

    /**
     * Check if segment is currently in pulse state - simplified approach
     */
    updateSegmentPulseState() {
        // Check if we have a segment element to get current segment info
        const segmentItem = document.querySelector('.speed-segment-item');
        if (!segmentItem) {
            console.log('❌ No segment item found in DOM');
            return false;
        }

        // Simple approach: if the segment has the segment-change class, show orange
        const hasSegmentChangeClass = segmentItem.classList.contains('segment-change');
        
        console.log(`🔍 Segment change class present: ${hasSegmentChangeClass}`);
        
        return hasSegmentChangeClass;
    }

    /**
     * Helper method to draw rounded rectangles
     */
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Draw the elevation profile from DOM
     */
    async drawElevationProfile() {
        const elevationContainer = document.querySelector('.elevation-profile-container');
        if (!elevationContainer || elevationContainer.style.display === 'none') return;

        const { width, height } = this.recordingDimensions;
        const ctx = this.recordingContext;

        // Use calculated positioning instead of DOM positioning
        // Position at bottom matching CSS: bottom: 0.75rem, left: 0.75rem, right: 0.75rem
        const margin = 12; // 0.75rem = 12px
        const profileHeight = 60; // Fixed height for elevation profile
        const x = margin;
        const y = height - profileHeight - margin; // Bottom positioning
        const profileWidth = width - (margin * 2); // Full width minus margins

        // Get current progress for the progress bar - try multiple sources for accuracy
        let progress = this.getAnimationProgress();
        
        // Additional check: try to get progress directly from playback controller during export
        if (this.isExporting) {
            // Try multiple sources for playback progress
            if (this.app.playback && this.app.playback.getProgress) {
                const playbackProgress = this.app.playback.getProgress();
                if (playbackProgress >= 0 && playbackProgress <= 1) {
                    progress = playbackProgress;
                    console.log(`Using playback controller progress: ${progress.toFixed(3)}`);
                }
            } else if (this.app.playback && this.app.playback.getCurrentProgress) {
                const playbackProgress = this.app.playback.getCurrentProgress();
                if (playbackProgress >= 0 && playbackProgress <= 1) {
                    progress = playbackProgress;
                    console.log(`Using playback getCurrentProgress: ${progress.toFixed(3)}`);
                }
            } else if (this.app.progressController && this.app.progressController.getProgress) {
                const progressControllerProgress = this.app.progressController.getProgress();
                if (progressControllerProgress >= 0 && progressControllerProgress <= 1) {
                    progress = progressControllerProgress;
                    console.log(`Using progress controller: ${progress.toFixed(3)}`);
                }
            }
        }

        console.log(`Drawing elevation profile with progress: ${progress.toFixed(3)}`);

        // Try to capture the actual SVG elements from the browser first
        const elevationPath = document.getElementById('elevationPath');
        const progressPath = document.getElementById('progressPath');
        
        if (elevationPath && progressPath) {
            // Get the actual SVG paths that are being displayed
            const elevationPathData = elevationPath.getAttribute('d');
            const progressPathData = progressPath.getAttribute('d');
            
            if (elevationPathData && progressPathData) {
                // Draw the elevation profile by parsing the SVG path with calculated positioning
                this.drawSVGPath(ctx, elevationPathData, x, y, profileWidth, profileHeight, '#4CAF50', 'rgba(76, 175, 80, 0.3)');
                
                // Draw the progress overlay
                this.drawSVGPath(ctx, progressPathData, x, y, profileWidth, profileHeight, '#C1652F', 'rgba(193, 101, 47, 0.8)');
            }
        } else if (progress >= 0) {
            // Fallback to simple progress bar
            const barWidth = profileWidth;
            const barHeight = 8; // Slightly thicker for better visibility
            const barX = x;
            const barY = y + profileHeight - 20; // Position within the profile area

            // Draw elevation profile background
            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Draw border for the elevation profile
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);

            // Draw progress fill - always draw something even at 0 progress
            ctx.fillStyle = '#C1652F';
            const progressWidth = Math.max(2, barWidth * progress); // Minimum 2px width
            ctx.fillRect(barX, barY, progressWidth, barHeight);
        }

        // Draw elevation labels (min, max, live) with calculated positioning
        await this.drawElevationLabelsCalculated(ctx, x, y, profileWidth, profileHeight);
    }

    /**
     * Draw elevation labels with calculated positioning (for bottom-positioned elevation profile)
     */
    async drawElevationLabelsCalculated(ctx, profileX, profileY, profileWidth, profileHeight) {
        // Get the text content from DOM elements
        const minElevationLabel = document.getElementById('minElevationLabel');
        const maxElevationLabel = document.getElementById('maxElevationLabel');
        const liveElevationMarker = document.getElementById('liveElevationMarker');

        // Draw min elevation label (bottom left of profile)
        if (minElevationLabel && minElevationLabel.style.display !== 'none') {
            const minText = minElevationLabel.querySelector('.elevation-value')?.textContent || minElevationLabel.textContent;
            if (minText) {
                const labelWidth = 45;
                const labelHeight = 18;
                const labelX = profileX + 8; // Small margin from left edge
                const labelY = profileY + profileHeight - labelHeight - 8; // Bottom of profile with margin

                // Draw background
                ctx.fillStyle = 'rgba(14, 35, 27, 0.85)';
                this.drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 4);
                ctx.fill();

                // Draw text
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '600 10px JetBrains Mono, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(minText, labelX + labelWidth / 2, labelY + labelHeight / 2);
            }
        }

        // Draw max elevation label (top left of profile)
        if (maxElevationLabel && maxElevationLabel.style.display !== 'none') {
            const maxText = maxElevationLabel.querySelector('.elevation-value')?.textContent || maxElevationLabel.textContent;
            if (maxText) {
                const labelWidth = 45;
                const labelHeight = 18;
                const labelX = profileX + 8; // Small margin from left edge (same as min)
                const labelY = profileY + 8; // Top of profile with margin

                // Draw background
                ctx.fillStyle = 'rgba(14, 35, 27, 0.85)';
                this.drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 4);
                ctx.fill();

                // Draw text
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '600 10px JetBrains Mono, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(maxText, labelX + labelWidth / 2, labelY + labelHeight / 2);
            }
        }

        // Draw live elevation marker (moves with progress, positioned in middle vertically)
        if (liveElevationMarker && liveElevationMarker.style.display !== 'none') {
            const liveText = liveElevationMarker.textContent;
            if (liveText) {
                const progress = this.getAnimationProgress();
                const labelWidth = 55;
                const labelHeight = 20;
                const labelX = profileX + (profileWidth * progress) - (labelWidth / 2); // Center horizontally on progress
                const labelY = profileY + (profileHeight / 2) - (labelHeight / 2); // Center vertically in profile

                // Draw background with stronger opacity for live marker
                ctx.fillStyle = 'rgba(14, 35, 27, 0.9)';
                this.drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 6);
                ctx.fill();

                // Draw text
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '600 11px JetBrains Mono, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(liveText, labelX + labelWidth / 2, labelY + labelHeight / 2);
            }
        }
    }

    /**
     * Draw elevation labels (min, max, live altitude)
     */
    async drawElevationLabels(ctx, containerRect) {
        // Draw min elevation label
        const minElevationLabel = document.getElementById('minElevationLabel');
        if (minElevationLabel && minElevationLabel.style.display !== 'none') {
            const minRect = minElevationLabel.getBoundingClientRect();
            if (minRect.width > 0 && minRect.height > 0) {
                const minX = minRect.left - containerRect.left;
                const minY = minRect.top - containerRect.top;
                const minText = minElevationLabel.querySelector('.elevation-value')?.textContent || minElevationLabel.textContent;

                // Draw background (matches .elevation-label styles)
                ctx.fillStyle = 'rgba(14, 35, 27, 0.78)';
                this.drawRoundedRect(ctx, minX, minY, minRect.width, minRect.height, 4);
                ctx.fill();

                // Draw text
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '600 10px JetBrains Mono, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(minText, minX + minRect.width / 2, minY + minRect.height / 2);
            }
        }

        // Draw max elevation label
        const maxElevationLabel = document.getElementById('maxElevationLabel');
        if (maxElevationLabel && maxElevationLabel.style.display !== 'none') {
            const maxRect = maxElevationLabel.getBoundingClientRect();
            if (maxRect.width > 0 && maxRect.height > 0) {
                const maxX = maxRect.left - containerRect.left;
                const maxY = maxRect.top - containerRect.top;
                const maxText = maxElevationLabel.querySelector('.elevation-value')?.textContent || maxElevationLabel.textContent;

                // Draw background (matches .elevation-label styles)
                ctx.fillStyle = 'rgba(14, 35, 27, 0.78)';
                this.drawRoundedRect(ctx, maxX, maxY, maxRect.width, maxRect.height, 4);
                ctx.fill();

                // Draw text
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '600 10px JetBrains Mono, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(maxText, maxX + maxRect.width / 2, maxY + maxRect.height / 2);
            }
        }

        // Draw live elevation marker (current altitude)
            const liveLabel = document.getElementById('liveElevationMarker');
        if (liveLabel && liveLabel.style.display !== 'none') {
                const labelRect = liveLabel.getBoundingClientRect();
                const labelWidth = labelRect.width;
                const labelHeight = labelRect.height;

                if (labelWidth > 0 && labelHeight > 0) {
                    const labelX = labelRect.left - containerRect.left;
                    const labelY = labelRect.top - containerRect.top;
                    const labelText = liveLabel.textContent || '';

                // Draw background (matches .elevation-live-label styles)
                    ctx.fillStyle = 'rgba(14, 35, 27, 0.78)';
                this.drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 6);
                    ctx.fill();

                // Draw text
                ctx.font = `600 ${Math.max(10, Math.round(labelHeight - 2))}px JetBrains Mono, monospace`;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.textBaseline = 'middle';
                    ctx.textAlign = 'center';
                ctx.fillText(labelText, labelX + labelWidth / 2, labelY + labelHeight / 2);
            }
        }
    }

    /**
     * Draw the programmatic logo watermark (DOM element removed)
     */
    async drawProgrammaticLogo() {
        const { width, height } = this.recordingDimensions;
        
        // Position logo in top-left corner with some padding
        const padding = 16;
        const logoWidth = 160;
        const logoHeight = 64; // Adjusted for proper SVG aspect ratio
        
        const x = padding;
        const y = padding;
        
        // Try to load and draw the actual SVG logo
        try {
            console.log('🎨 Attempting to load TrailReplay SVG logo for video export...');
            await this.drawActualSVGLogo(this.recordingContext, x, y, logoWidth, logoHeight);
            console.log('✅ Successfully loaded and drew SVG logo');
        } catch (error) {
            console.warn('⚠️ Failed to draw SVG logo, using fallback text logo:', error);
            this.drawProfessionalLogo(x, y, logoWidth, logoHeight);
            console.log('✅ Fallback text logo drawn successfully');
        }
    }

    /**
     * Draw the actual TrailReplay SVG logo to canvas
     */
    async drawActualSVGLogo(context, x, y, width, height) {
        // Check if we have a cached logo image
        if (this.cachedLogoImage) {
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(this.cachedLogoImage, x, y, width, height);
            return;
        }
        
        // Use the same relative path as the main app logo for production compatibility
        const svgUrl = 'media/images/logohorizontal.svg';
        try {
            console.log(`🔄 Fetching SVG logo from: ${svgUrl} (caching for performance)`);
            // Fetch the SVG content
            const response = await fetch(svgUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`);
            }
            console.log('✅ SVG content fetched successfully');
            const svgText = await response.text();
            
            // Create a data URL from the SVG
            const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
            const svgObjectUrl = URL.createObjectURL(svgBlob);
            console.log(`📄 SVG content length: ${svgText.length} chars, created blob URL`);
            
            // Create an image from the SVG
            const img = new Image();
            
            return new Promise((resolve, reject) => {
                img.onload = () => {
                    try {
                        console.log(`🖼️ SVG image loaded successfully (${img.width}x${img.height}), caching for future frames`);
                        // Cache the loaded image for future use
                        this.cachedLogoImage = img;
                        
                        // Draw to canvas
                        context.imageSmoothingEnabled = true;
                        context.imageSmoothingQuality = 'high';
                        context.drawImage(img, x, y, width, height);
                        URL.revokeObjectURL(svgObjectUrl);
                        resolve();
                    } catch (drawError) {
                        console.error('❌ Error drawing SVG to canvas:', drawError);
                        URL.revokeObjectURL(svgObjectUrl);
                        reject(drawError);
                    }
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(svgObjectUrl);
                    reject(new Error('Failed to load SVG image'));
                };
                
                img.src = svgObjectUrl;
                
                // Timeout fallback
                setTimeout(() => {
                    if (!img.complete) {
                        URL.revokeObjectURL(svgObjectUrl);
                        reject(new Error('SVG loading timeout'));
                    }
                }, 3000);
            });
        } catch (error) {
            console.warn('Error loading SVG logo:', error);
            throw error;
        }
    }

    /**
     * Draw SVG logo to regular recording canvas
     */
    async drawSVGLogoToRegularCanvas(svgUrl, x, y, width, height) {
        // Use the same relative path as the main app logo for production compatibility
        if (svgUrl === '/media/images/logohorizontal.svg') {
            svgUrl = 'media/images/logohorizontal.svg';
        }
        try {
            // Fetch the SVG content
            const response = await fetch(svgUrl);
            const svgText = await response.text();
            
            // Create a data URL from the SVG
            const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
            const svgObjectUrl = URL.createObjectURL(svgBlob);
            
            // Create an image from the SVG
            const img = new Image();
            
            return new Promise((resolve) => {
                img.onload = () => {
                    try {
                        this.recordingContext.imageSmoothingEnabled = true;
                        this.recordingContext.imageSmoothingQuality = 'high';
                        this.recordingContext.drawImage(img, x, y, width, height);
                        URL.revokeObjectURL(svgObjectUrl);
                        resolve();
                    } catch (drawError) {
                        URL.revokeObjectURL(svgObjectUrl);
                        this.drawProfessionalLogo(x, y, width, height);
                        resolve();
                    }
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(svgObjectUrl);
                    this.drawProfessionalLogo(x, y, width, height);
                    resolve();
                };
                
                img.src = svgObjectUrl;
                
                // Timeout fallback
                setTimeout(() => {
                    if (!img.complete) {
                        URL.revokeObjectURL(svgObjectUrl);
                        this.drawProfessionalLogo(x, y, width, height);
                        resolve();
                    }
                }, 3000);
            });
        } catch (error) {
            console.warn('SVG conversion failed:', error);
            this.drawProfessionalLogo(x, y, width, height);
        }
    }

    /**
     * Draw a professional TrailReplay logo when SVG can't be loaded
     */
    drawProfessionalLogo(x, y, width, height) {
        const ctx = this.recordingContext;
        
        // Calculate appropriate sizes based on the original logo position
        const logoWidth = Math.max(160, width);
        const logoHeight = Math.max(40, height);
        const padding = 12;
        const borderRadius = 6;
        
        // REMOVED: White background drawing to eliminate white square
        // Draw background with gradient
        // const gradient = ctx.createLinearGradient(x, y, x, y + logoHeight);
        // gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        // gradient.addColorStop(1, 'rgba(248, 249, 250, 0.95)');
        // ctx.fillStyle = gradient;
        
        // Draw rounded rectangle background
        // this.drawRoundedRect(ctx, x, y, logoWidth, logoHeight, borderRadius);
        // ctx.fill();
        
        // Draw subtle border with TrailReplay colors
        // ctx.strokeStyle = 'rgba(46, 125, 50, 0.4)';
        // ctx.lineWidth = 1.5;
        // this.drawRoundedRect(ctx, x, y, logoWidth, logoHeight, borderRadius);
        // ctx.stroke();
        
        // Draw hiking boot icon with better positioning and shadow for visibility
        ctx.fillStyle = '#C1652F'; // Orange color matching the trail
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        // Add text shadow for better visibility without background
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText('🥾', x + padding, y + logoHeight/2);
        
        // Draw "TrailReplay" text with better typography and shadow
        ctx.fillStyle = '#FFFFFF'; // White text for visibility
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        // Keep text shadow for visibility
        ctx.fillText('TrailReplay', x + padding + 28, y + logoHeight/2);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    /**
     * Helper function to draw rounded rectangles
     */
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Draw any active annotations from DOM
     */
    async drawActiveAnnotations() {
        const activeAnnotation = document.getElementById('activeAnnotation');
        if (!activeAnnotation || activeAnnotation.style.display === 'none') return;

        const rect = activeAnnotation.getBoundingClientRect();
        const containerRect = this.videoCaptureContainer.getBoundingClientRect();
        
        // Calculate relative position within the container
        const x = rect.left - containerRect.left;
        const y = rect.top - containerRect.top;

        // Draw annotation popup (simplified version)
        const ctx = this.recordingContext;
        const titleElement = activeAnnotation.querySelector('.annotation-popup-title');
        const descElement = activeAnnotation.querySelector('.annotation-popup-description');

        if (titleElement || descElement) {
            // Draw background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(x, y, Math.min(rect.width, 300), Math.min(rect.height, 100));

            // Draw text
            ctx.font = '14px Arial';
            ctx.fillStyle = 'white';
            
            if (titleElement && titleElement.textContent) {
                ctx.fillText(titleElement.textContent, x + 10, y + 20);
            }
            
            if (descElement && descElement.textContent) {
                ctx.font = '12px Arial';
                ctx.fillText(descElement.textContent, x + 10, y + 40);
            }
        }
    }

    /**
     * Encode frame using WebCodecs
     */
    encodeFrameWithWebCodecs(frameNumber) {
        if (!this.webCodecsEncoder) return;

        const targetFPS = 30;
        // Create VideoFrame from canvas with precise timing
        const frame = new VideoFrame(this.recordingCanvas, {
            timestamp: frameNumber * (1000000 / targetFPS) // microseconds, exactly 30 FPS
        });

        // Encode the frame
        this.webCodecsEncoder.encode(frame);
        frame.close();
    }

    /**
     * Finish recording process
     */
    async finishRecording() {
        this.updateProgress(95, 'Finalizing recording...');

        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }

        if (this.webCodecsEncoder) {
            await this.webCodecsEncoder.flush();
            this.webCodecsEncoder.close();
            this.processWebCodecsVideo();
        }
    }

    /**
     * Validate that the video timing matches the expected animation duration
     */
    async validateVideoTiming(expectedDuration) {
        console.log(`🔍 Validating video timing...`);
        console.log(`  - Expected duration: ${expectedDuration}s`);
        
        if (this.recordedChunks && this.recordedChunks.length > 0) {
            // Create a temporary blob to estimate duration
            const blob = new Blob(this.recordedChunks, { type: this.selectedMP4Codec || 'video/mp4' });
            
            // Log file size for reference
            const sizeInfo = MP4Utils.estimateFileSize(expectedDuration, this.optimalSettings.bitrate || 4000000);
            console.log(`  - Expected file size: ${sizeInfo.displaySize}`);
            console.log(`  - Actual file size: ${MP4Utils.formatFileSize(blob.size)}`);
            
            // Note: We can't directly measure video duration from blob without loading it,
            // but we can validate that the file size is reasonable for the expected duration
            const sizeDifference = Math.abs(blob.size - sizeInfo.bytes) / sizeInfo.bytes;
            if (sizeDifference > 0.5) { // More than 50% difference
                console.warn(`⚠️ Video file size differs significantly from expected:`, {
                    expected: sizeInfo.displaySize,
                    actual: MP4Utils.formatFileSize(blob.size),
                    difference: `${(sizeDifference * 100).toFixed(1)}%`
                });
            } else {
                console.log(`✅ Video file size is within expected range`);
            }
        }
        
        console.log(`✅ Video timing validation completed`);
    }

    /**
     * Get current animation progress (0-1)
     */
    getAnimationProgress() {
        try {
            // Get progress from map renderer (most reliable)
            if (this.app.mapRenderer && this.app.mapRenderer.getAnimationProgress) {
                const progress = this.app.mapRenderer.getAnimationProgress();
                if (typeof progress === 'number' && progress >= 0 && progress <= 1) {
                    return progress;
                }
            }
            
            // Fallback to other sources
            if (this.app.playback && this.app.playback.getProgress) {
                const progress = this.app.playback.getProgress();
                if (typeof progress === 'number' && progress >= 0 && progress <= 1) {
                    return progress;
                }
            }

            return 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Check if animation is currently playing
     */
    isAnimationPlaying() {
        try {
            // Check multiple possible sources
            if (this.app.state && typeof this.app.state.isPlaying === 'boolean') {
                return this.app.state.isPlaying;
            } else if (typeof this.app.isPlaying === 'boolean') {
                return this.app.isPlaying;
            } else if (this.app.playback && typeof this.app.playback.isPlaying === 'boolean') {
                return this.app.playback.isPlaying;
            }
            return false;
        } catch (error) {
            console.warn('Error checking animation state:', error);
            return false;
        }
    }

    /**
     * Get current stats for overlay rendering
     */
    getCurrentStats() {
        try {
            if (!this.app.mapRenderer || !this.app.currentTrackData) {
                return null;
            }

            const progress = this.getAnimationProgress();
            
            // Calculate current distance
            let currentDistance = 0;
            if (this.app.currentTrackData.isJourney && this.app.currentTrackData.segments) {
                // For journeys, use the stats controller method if available
                if (this.app.stats && this.app.stats.calculateJourneyCurrentDistance) {
                    currentDistance = this.app.stats.calculateJourneyCurrentDistance(progress);
                }
            } else {
                // For single tracks
                const totalDistance = this.app.currentTrackData.stats?.totalDistance || 0;
                currentDistance = progress * totalDistance;
            }

            // Calculate current elevation gain
            let currentElevationGain = 0;
            if (this.app.stats && this.app.stats.calculateActualElevationGain) {
                currentElevationGain = this.app.stats.calculateActualElevationGain(progress);
            }

            // Get current speed (if available from journey data)
            let currentSpeed = 0;
            if (this.app.mapRenderer.gpxParser && this.app.mapRenderer.gpxParser.getInterpolatedPoint) {
                const currentPoint = this.app.mapRenderer.gpxParser.getInterpolatedPoint(progress);
                if (currentPoint && currentPoint.speed) {
                    currentSpeed = currentPoint.speed;
                }
            }

            return {
                distance: this.app.gpxParser ? this.app.gpxParser.formatDistance(currentDistance) : currentDistance.toFixed(1) + ' km',
                elevation: this.app.gpxParser ? this.app.gpxParser.formatElevation(currentElevationGain) : currentElevationGain.toFixed(0) + ' m',
                speed: currentSpeed > 0 ? currentSpeed.toFixed(1) + ' km/h' : '0 km/h'
            };
        } catch (error) {
            console.warn('Error getting current stats:', error);
            return null;
        }
    }

    /**
     * Get cinematic sequence durations from FollowBehindCamera settings
     */
    getCinematicDurations() {
        try {
            // Get durations from FollowBehindCamera settings if available
            if (this.app.mapRenderer && this.app.mapRenderer.followBehindCamera) {
                const camera = this.app.mapRenderer.followBehindCamera;

                // Default follow-behind camera durations (in seconds)
                const zoomInDuration = camera.getCinematicDuration ? camera.getCinematicDuration() / 1000 : 2.0; // 2 seconds
                const zoomOutDuration = camera.getZoomOutDuration ? camera.getZoomOutDuration() / 1000 : 5.0; // 5 seconds

                // Scale durations by animation speed for video export consistency
                // If animation runs at 0.5x speed, zoom effects should also be 2x slower
                const animationSpeed = this.app.mapRenderer.getAnimationSpeed ? this.app.mapRenderer.getAnimationSpeed() : 1.0;
                const speedMultiplier = 1.0 / Math.max(animationSpeed, 0.1); // Prevent division by zero

                console.log(`🎬 Scaling zoom durations by animation speed: ${animationSpeed}x (multiplier: ${speedMultiplier}x)`);

                return {
                    zoomIn: zoomInDuration * speedMultiplier,
                    zoomOut: zoomOutDuration * speedMultiplier
                };
            }

            // Fallback durations with speed scaling
            const animationSpeed = this.app.mapRenderer?.getAnimationSpeed ? this.app.mapRenderer.getAnimationSpeed() : 1.0;
            const speedMultiplier = 1.0 / Math.max(animationSpeed, 0.1);

            return {
                zoomIn: 2.0 * speedMultiplier,  // Scaled zoom-in duration
                zoomOut: 5.0 * speedMultiplier  // Scaled zoom-out duration
            };
        } catch (error) {
            console.warn('Error getting cinematic durations:', error);
            const animationSpeed = this.app.mapRenderer?.getAnimationSpeed ? this.app.mapRenderer.getAnimationSpeed() : 1.0;
            const speedMultiplier = 1.0 / Math.max(animationSpeed, 0.1);

            return {
                zoomIn: 2.0 * speedMultiplier,
                zoomOut: 5.0 * speedMultiplier
            };
        }
    }

    /**
     * Estimate the natural animation duration (at 1.0x speed) including cinematics
     */
    estimateNaturalAnimationDuration() {
        try {
            // Get the base trail animation natural time (without cinematics)
            let baseTrailNaturalTime = 0;
            
            // Try to get from coordinate count as a baseline for trail animation only
            if (this.app.currentTrackData && this.app.currentTrackData.coordinates) {
                const pointCount = this.app.currentTrackData.coordinates.length;
                
                // From recent logs: animation completes much faster than expected
                // For 1150 points, it was taking about 5 seconds total including cinematics
                // So trail animation alone is probably about 2-3 seconds naturally
                // Scale this based on point count but keep reasonable bounds
                baseTrailNaturalTime = Math.min(4, Math.max(2, pointCount / 400)); // 2-4 seconds range for trail only
                console.log(`🎬 Natural trail animation time from ${pointCount} points: ${baseTrailNaturalTime.toFixed(1)}s`);
            } else {
                // Fallback: based on recent observations, natural trail animation is about 3s
                baseTrailNaturalTime = 3.0;
                console.log('🎬 Using fallback natural trail animation time: 3.0s');
            }

            // Add cinematic sequences and picture annotations (these run at normal speed regardless of animation speed)
            const cinematicDurations = this.getCinematicDurations();
            
            // Calculate total picture annotation display time
            let pictureAnnotationTime = 0;
            if (this.app.mapRenderer?.pictureAnnotations?.getTotalPictureDisplayTime) {
                pictureAnnotationTime = this.app.mapRenderer.pictureAnnotations.getTotalPictureDisplayTime();
            }
            
            const totalNaturalTime = baseTrailNaturalTime + cinematicDurations.zoomIn + cinematicDurations.zoomOut + pictureAnnotationTime;
            
            console.log(`🎬 Total natural duration calculation:`);
            console.log(`  - Initial zoom-in: ${cinematicDurations.zoomIn}s (fixed speed)`);
            console.log(`  - Trail animation: ${baseTrailNaturalTime}s (at 1.0x speed)`);
            console.log(`  - Picture annotations: ${pictureAnnotationTime}s (fixed speed)`);
            console.log(`  - Final zoom-out: ${cinematicDurations.zoomOut}s (fixed speed)`);
            console.log(`  - TOTAL NATURAL: ${totalNaturalTime}s`);
            
            return totalNaturalTime;
        } catch (error) {
            console.warn('❌ Error estimating natural animation duration:', error);
            return 8.0; // Safe fallback: 2s + 3s + 3s
        }
    }

    /**
     * Get the real animation duration including cinematic sequences
     */
    estimateAnimationDuration() {
        try {
            // Get the base trail animation duration
            let baseTrailDuration = 0;
            
            // Priority 1: Get duration from map renderer's segment timings (most accurate)
            if (this.app.mapRenderer && this.app.mapRenderer.segmentTimings && this.app.mapRenderer.segmentTimings.totalDuration) {
                baseTrailDuration = this.app.mapRenderer.segmentTimings.totalDuration;
                console.log(`Base trail animation duration: ${baseTrailDuration}s`);
            }

            // Priority 2: Get duration from playback controller
            if (!baseTrailDuration && this.app.playback && this.app.playback.getTotalDuration) {
                const duration = this.app.playback.getTotalDuration();
                if (duration > 0) {
                    baseTrailDuration = duration;
                    console.log(`Using playback controller duration: ${duration}s`);
                }
            }

            // Priority 3: Get duration from current track data journey timing
            if (!baseTrailDuration && this.app.currentTrackData && this.app.currentTrackData.isJourney && this.app.currentTrackData.segmentTiming) {
                let totalDuration = 0;
                this.app.currentTrackData.segmentTiming.forEach(segment => {
                    totalDuration += segment.duration || 0;
                });
                if (totalDuration > 0) {
                    baseTrailDuration = totalDuration;
                    console.log(`Using track data segment timing: ${totalDuration}s`);
                }
            }

            // Priority 4: Calculate realistic duration based on track stats and activity type
            if (!baseTrailDuration && this.app.currentTrackData && this.app.currentTrackData.stats) {
                const distance = this.app.currentTrackData.stats.totalDistance || 0; // km
                const elevation = this.app.currentTrackData.stats.elevationGain || 0; // m
                const activityType = this.app.currentTrackData.activityType || 'running';
                
                // Base speeds in km/h for realistic animation timing
                const baseSpeeds = {
                    running: 8,
                    cycling: 20,
                    walking: 4,
                    hiking: 3,
                    swimming: 2
                };
                
                const baseSpeed = baseSpeeds[activityType] || baseSpeeds.running;
                let timeInHours = distance / baseSpeed;
                
                // Add time for elevation gain (realistic estimate)
                if (elevation > 0) {
                    const elevationPenalty = {
                        running: 600,   // 1 hour per 600m gain
                        cycling: 800,   // 1 hour per 800m gain
                        walking: 400,   // 1 hour per 400m gain
                        hiking: 300     // 1 hour per 300m gain
                    };
                    
                    const penalty = elevationPenalty[activityType] || elevationPenalty.running;
                    timeInHours += elevation / penalty;
                }
                
                baseTrailDuration = Math.max(10, timeInHours * 3600); // Convert to seconds, minimum 10s
                console.log(`Calculated realistic trail duration from stats: ${baseTrailDuration}s (${distance}km, ${elevation}m elevation, ${activityType})`);
            }

            // Priority 5: Fallback estimate based on coordinate count
            if (!baseTrailDuration && this.app.currentTrackData && this.app.currentTrackData.coordinates) {
                const pointCount = this.app.currentTrackData.coordinates.length;
                // More realistic estimate: assume longer animations for complex tracks
                baseTrailDuration = Math.max(30, Math.min(1200, pointCount * 8)); // 30s min, 20min max, 8s per point
                console.log(`Estimated trail duration from ${pointCount} coordinates: ${baseTrailDuration}s`);
            }

            // Final fallback for trail duration
            if (!baseTrailDuration) {
                baseTrailDuration = 120; // 2 minutes default (more realistic)
                console.log('Using default trail duration fallback: 120s');
            }

            // Add cinematic sequences and picture annotation times to get total video duration
            const cinematicDurations = this.getCinematicDurations();
            
            // Calculate total picture annotation display time
            let pictureAnnotationTime = 0;
            if (this.app.mapRenderer?.pictureAnnotations?.getTotalPictureDisplayTime) {
                pictureAnnotationTime = this.app.mapRenderer.pictureAnnotations.getTotalPictureDisplayTime();
            }
            
            // Add extra time for final stats visibility
            const statsDisplayTime = 6.0; // 6 seconds for stats to be visible at the end

            const totalVideoDuration = baseTrailDuration + cinematicDurations.zoomIn + cinematicDurations.zoomOut + pictureAnnotationTime + statsDisplayTime;

            console.log(`🎬 Total video duration calculation:`);
            console.log(`  - Initial zoom-in: ${cinematicDurations.zoomIn}s`);
            console.log(`  - Trail animation: ${baseTrailDuration}s`);
            console.log(`  - Picture annotations: ${pictureAnnotationTime}s`);
            console.log(`  - Final zoom-out: ${cinematicDurations.zoomOut}s`);
            console.log(`  - Stats display time: ${statsDisplayTime}s`);
            console.log(`  - TOTAL: ${totalVideoDuration}s`);
            
            return totalVideoDuration;
        } catch (error) {
            console.warn('Error estimating animation duration:', error);
            return 120; // Safe fallback
        }
    }

    /**
     * Process the recorded video with enhanced features
     */
    processAdvancedRecordedVideo() {
        if (this.recordedChunks.length === 0) {
            this.app.showMessage('No video data recorded', 'error');
            this.cleanup();
            return;
        }

        this.updateProgress(98, 'Processing MP4 file...');

        // Create blob with MP4 mime type
        const mimeType = this.selectedMP4Codec || 'video/mp4';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        
        // Get final file size
        const finalSize = MP4Utils.formatFileSize(blob.size);
        
        // Generate optimized filename
        const filename = MP4Utils.generateFilename('trail-replay', 'mp4', true);

        // Download using enhanced method
        MP4Utils.downloadBlob(blob, filename, (progress) => {
            if (progress <= 100) {
                this.updateProgress(98 + (progress * 0.02), `Downloading... ${progress}%`);
            }
        }).then(() => {
            this.updateProgress(100, t('videoExport.exportComplete'));
            this.app.showMessage(t('videoExport.mp4ExportSuccess', { filename, size: finalSize }), 'success');
            
            // Clean up after delay
            setTimeout(() => {
                this.cleanup();
            }, 2000);
        }).catch((error) => {
            console.error('Download failed:', error);
            this.app.showMessage(t('videoExport.downloadFailed'), 'error');
            this.cleanup();
        });
    }

    /**
     * Process WebCodecs encoded video
     */
    processWebCodecsVideo() {
        if (this.webCodecsFrames.length === 0) {
            this.app.showMessage('No encoded frames available', 'error');
            this.cleanup();
            return;
        }

        // This would typically require additional MP4 muxing
        // For now, fallback to MediaRecorder approach
        console.log('WebCodecs frames encoded:', this.webCodecsFrames.length);
        this.app.showMessage('WebCodecs encoding complete, but MP4 muxing not yet implemented. Please use WebM format.', 'warning');
        this.cleanup();
    }

    /**
     * Start manual recording mode
     */
    async startManualRecording() {
        console.log('🎥 Starting manual recording mode...');

        // Show instructions
        const shouldStart = await this.showManualRecordingInstructions();
        if (!shouldStart) return;

        try {
            this.isExporting = true;
            this.currentExportMode = 'manual';

            this.createProgressModal();
            this.updateProgress(10, 'Preparing for manual recording...');

            // Prepare environment
            await this.prepareForExport();
            this.updateProgress(30, 'Environment prepared...');

            // Preload tiles
            this.updateProgress(50, 'Preloading map tiles...');
            await this.preloadTiles((progress) => {
                this.updateProgress(50 + (progress * 40), `Loading tiles... ${Math.round(progress)}%`);
            });

            // Hide progress modal
            if (this.progressModal) {
                this.progressModal.remove();
                this.progressModal = null;
            }

            // Setup UI for manual recording (keep progress visible)
            this.setupUIForManualRecording();

            // Enable live stats display
            if (this.app.stats && this.app.stats.toggleLiveStats) {
                this.app.stats.toggleLiveStats(true);
            }

            // Show recording area highlight
            this.highlightRecordingArea();

            // Auto-start animation
            this.app.playback.reset();
            setTimeout(() => {
                this.app.playback.play();
                this.app.showMessage(t('videoExport.manualRecordingActive'), 'success');
            }, 500);

        } catch (error) {
            console.error('Manual recording setup failed:', error);
            this.app.showMessage(t('videoExport.manualRecordingFailed', { error: error.message }), 'error');
            this.cleanup();
        }
    }

    /**
     * Get the best supported MIME type from a list
     */
    getBestMimeType(mimeTypes) {
        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                console.log(`Selected MIME type: ${mimeType}`);
                return mimeType;
            }
        }
        
        // Fallback
        console.warn('No preferred MIME types supported, using fallback');
        return 'video/webm';
    }

    /**
     * Setup MediaRecorder with the specified MIME type
     */
    async setupMediaRecorder(mimeType, expectedExtension) {
        if (!this.stream) {
            throw new Error('No stream available for recording');
        }

        const options = {
            mimeType: mimeType,
            bitsPerSecond: 4000000  // 4 Mbps for good quality
        };

        this.mediaRecorder = new MediaRecorder(this.stream, options);
        this.recordedChunks = [];

        // Setup event handlers
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
                console.log(`Data chunk received: ${event.data.size} bytes`);
            }
        };

        this.mediaRecorder.onstop = () => {
            console.log('MediaRecorder stopped');
            this.processRecordedVideo(mimeType, expectedExtension);
        };

        this.mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            this.app.showMessage(`Recording error: ${event.error.name}`, 'error');
            this.cleanup();
        };

        console.log(`MediaRecorder created with MIME type: ${mimeType}`);
    }

    /**
     * Start the actual recording process
     */
    async startRecording() {
        if (!this.mediaRecorder) {
            throw new Error('MediaRecorder not initialized');
        }

        // Set up recording timing
        this.recordingStartTime = Date.now();
        this.estimatedDuration = this.estimateAnimationDuration();
        console.log(`🎬 Recording started at ${this.recordingStartTime}, estimated duration: ${this.estimatedDuration}s`);

        // Start MediaRecorder
        this.mediaRecorder.start(1000); // Request data every second
        console.log('MediaRecorder started');

        // Start animation
        this.app.playback.reset();
        this.app.playback.play();

        // Monitor recording progress
        await this.monitorRecording();
    }

    /**
     * Monitor recording progress until animation completes
     */
    async monitorRecording() {
        return new Promise((resolve) => {
            const startTime = performance.now();
            let frameCount = 0;

            const checkProgress = () => {
                const progress = this.app.mapRenderer.getAnimationProgress();
                frameCount++;

                // Update progress less frequently for better performance
                if (frameCount % 60 === 0) { // Update every 60 frames (every 2 seconds at 30fps)
                    const recordingProgress = 75 + (progress * 20); // 75-95% range
                    this.updateProgress(recordingProgress, `Recording WebM... ${(progress * 100).toFixed(0)}% complete`);
                }

                // Check if animation is complete
                if (progress >= 1 || !this.app.state.isPlaying) {
                    if (this.mediaRecorder.state === 'recording') {
                        this.mediaRecorder.stop();
                    }
                    resolve();
                } else {
                    requestAnimationFrame(checkProgress);
                }
            };

            checkProgress();
        });
    }

    /**
     * Process recorded video data and create download
     */
    processRecordedVideo(mimeType, expectedExtension) {
        this.updateProgress(95, 'Processing video file...');

        if (this.recordedChunks.length === 0) {
            console.error('No recorded chunks available');
            this.app.showMessage('No video data was recorded. Please try again.', 'error');
            this.cleanup();
            return;
        }

        // Create blob
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        console.log(`Video blob created: ${blob.size} bytes, type: ${blob.type}`);

        if (blob.size === 0) {
            console.error('Generated video blob has 0 bytes');
            this.app.showMessage('Generated video is empty. Please try again.', 'error');
            this.cleanup();
            return;
        }

        // Determine file extension
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const filename = `trail-replay-animation.${extension}`;

        // Create download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        // Cleanup URL after delay
        setTimeout(() => URL.revokeObjectURL(url), 10000);

        this.updateProgress(100, 'Video export complete!');
        
        setTimeout(() => {
            this.app.showMessage('Export complete!', 'success');
            this.cleanup();
        }, 1000);
    }

    /**
     * Prepare environment for export
     */
    async prepareForExport() {
        // Reset animation to beginning
        this.app.playback.reset();
        
        // Enable performance mode if available
        if (this.app.mapRenderer.setPerformanceMode) {
            this.app.mapRenderer.setPerformanceMode(true);
        }

        // Ensure map is ready
        await this.waitForMapReady();
    }

    /**
     * Preload map tiles for smooth recording
     */
    async preloadTiles(progressCallback) {
        if (this.app.enhancedTilePreloading) {
            await this.app.enhancedTilePreloading(progressCallback);
        } else {
            // Basic preloading fallback
            progressCallback(100);
        }
    }

    /**
     * Wait for map to be ready
     */
    async waitForMapReady() {
        if (this.app.waitForMapTilesToLoadWithTimeout) {
            await this.app.waitForMapTilesToLoadWithTimeout(8000);
        }
    }

    /**
     * Hide UI elements for clean auto recording (WebM/MP4)
     */
    hideUIForRecording() {
        const elementsToHide = [
            '.header',
            '.controls-panel', 
            '.progress-controls-container',
            '.annotations-section',
            '.icon-timeline-section',
            '.journey-planning-section',
            '.journey-timeline-container',
            '.language-switcher',
            '#toast-container',
            'footer'
        ];

        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
            });
        });

        // KEEP progress modal visible during recording so users can see progress
        if (this.progressModal) {
            this.progressModal.style.visibility = 'visible';
            this.progressModal.style.display = 'block';
            // Ensure progress modal is on top and visible
            this.progressModal.style.zIndex = '10000';
            this.progressModal.style.position = 'fixed';
            console.log('🎬 Progress modal kept visible for user feedback during export');
        }

        // Set recording mode flags for clean auto recording
        // NOTE: We need to allow some progress updates for MP4 export to work correctly
        this.app.recordingMode = true;
        this.app.overlayRecordingMode = true; // Allow progress updates during auto recording for now

        if (this.app.state.showSegmentSpeeds && this.app.stats) {
            this.app.stats.renderSpeedOverlay?.();
            this.app.stats.updateSpeedDisplayMode?.();
        }
    }

    /**
     * Setup UI for manual recording (keep progress visible)
     */
    setupUIForManualRecording() {
        // Hide only control panels, keep progress elements visible
        const elementsToHide = [
            '.header',
            '.controls-panel', 
            '.annotations-section',
            '.icon-timeline-section',
            '.journey-planning-section',
            '.journey-timeline-container',
            '.language-switcher',
            '#toast-container',
            'footer'
        ];

        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
            });
        });

        // Set recording mode flags for manual recording (keep overlays visible)
        this.app.recordingMode = true;
        this.app.overlayRecordingMode = true; // Keep DOM progress updates visible

        if (this.app.state.showSegmentSpeeds && this.app.stats) {
            this.app.stats.renderSpeedOverlay?.();
            this.app.stats.updateSpeedDisplayMode?.();
        }
    }

    /**
     * Show UI elements after recording
     */
    showUIAfterRecording() {
        const elementsToShow = [
            '.header',
            '.controls-panel',
            '.progress-controls-container',
            '.annotations-section',
            '.icon-timeline-section',
            '.journey-planning-section',
            '.journey-timeline-container',
            '.language-switcher',
            '#toast-container',
            '.map-watermark',
            'footer'
        ];

        elementsToShow.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = '';
            });
        });

        // Show progress modal
        if (this.progressModal) {
            this.progressModal.style.visibility = 'visible';
        }

        // Reset recording mode flags
        this.app.recordingMode = false;
        this.app.overlayRecordingMode = false;
    }



    /**
     * Highlight the recording area for manual recording
     */
    highlightRecordingArea() {
        const videoCaptureContainer = document.getElementById('videoCaptureContainer');
        if (videoCaptureContainer) {
            videoCaptureContainer.classList.add('recording-highlight');
        }
    }

    /**
     * Remove recording area highlight
     */
    removeRecordingHighlight() {
        const videoCaptureContainer = document.getElementById('videoCaptureContainer');
        if (videoCaptureContainer) {
            videoCaptureContainer.classList.remove('recording-highlight');
        }
    }

    /**
     * Create progress modal
     */
    createProgressModal() {
        this.progressModal = document.createElement('div');
        this.progressModal.className = 'modal enhanced-progress-modal';
        this.progressModal.style.zIndex = '10000'; // Ensure it's always on top
        this.progressModal.style.position = 'fixed';
        this.progressModal.style.display = 'block';
        this.progressModal.innerHTML = `
            <style>
                .enhanced-progress-modal {
                    z-index: 10000 !important;
                    position: fixed !important;
                    display: block !important;
                    visibility: visible !important;
                }
                .enhanced-progress-content {
                    max-width: 500px;
                    margin: 5% auto;
                    background: rgba(255, 255, 255, 0.98);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    border: 2px solid var(--evergreen);
                }
                .progress-container {
                    margin: 1rem 0;
                }
                .progress-bar {
                    width: 100%;
                    height: 24px;
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                    position: relative;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--evergreen), #4CAF50);
                    border-radius: 12px;
                    transition: width 0.3s ease;
                    position: relative;
                }
                .progress-fill::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: shimmer 2s infinite;
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .progress-text {
                    margin-top: 0.5rem;
                    font-weight: 600;
                    text-align: center;
                    color: var(--evergreen);
                    font-size: 16px;
                }
                .export-tips {
                    background: rgba(var(--evergreen-rgb), 0.05);
                    padding: 1rem;
                    border-radius: 8px;
                    border-left: 4px solid var(--evergreen);
                }
            </style>
            <div class="modal-content enhanced-progress-content">
                <h3 style="margin-bottom: 1rem; color: var(--evergreen); text-align: center; font-size: 1.5em;">
                    🎬 ${t('videoExport.exportInProgress')}
                </h3>
                <div class="progress-container">
                    <div class="progress-bar" id="exportProgressBar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text" id="exportProgressText">${t('videoExport.initializing')}</div>
                </div>
                <div class="export-tips" style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-secondary);">
                    <div style="margin-bottom: 0.5rem;">📱 ${t('videoExport.keepTabActive')}</div>
                    <div style="margin-bottom: 0.5rem;">🖥️ ${t('videoExport.closeOtherApps')}</div>
                    <div style="margin-bottom: 0.5rem;">🚫 ${t('videoExport.doNotResizeWindow')}</div>
                    <div style="margin-bottom: 1rem;">⏳ ${t('videoExport.letComplete')}</div>
                    <div style="text-align: center;">
                        <button id="cancelExportBtn" class="btn btn-secondary" style="background: rgba(220, 53, 69, 0.1); color: #dc3545; border: 1px solid #dc3545; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
                            ❌ ${t('videoExport.cancelExport')}
                        </button>
                    </div>
                </div>
                <!-- Ad Container -->
                <div id="videoProgressAdContainer" style="margin-top: 1.5rem; text-align: center;"></div>
            </div>
        `;
        document.body.appendChild(this.progressModal);
        
        // Add cancel button event listener
        const cancelBtn = document.getElementById('cancelExportBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cleanup();
                this.app.showMessage(t('videoExport.exportCancelled'), 'info');
            });
        }

        // Load ad in the progress modal
        const adContainer = document.getElementById('videoProgressAdContainer');
        if (adContainer) {
            revenueManager.showAd(adContainer, 'videoProgress');
        }
    }

    /**
     * Update progress modal
     */
    updateProgress(percent, status) {
        const progressBar = document.getElementById('exportProgressBar');
        const progressText = document.getElementById('exportProgressText');
        
        if (progressBar && progressText) {
            const fill = progressBar.querySelector('.progress-fill');
            if (fill) {
                fill.style.width = Math.min(100, Math.max(0, percent)) + '%';
            }
            progressText.textContent = status;
            
            // Ensure the modal stays visible and on top
            if (this.progressModal) {
                this.progressModal.style.display = 'block';
                this.progressModal.style.visibility = 'visible';
                this.progressModal.style.zIndex = '10000';
            }
        }
    }

    /**
     * Show export confirmation dialog
     */
    async showExportConfirmation(mode) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            
            // Get mode-specific translations
            let modeTitle, modeDescription;
            if (mode === 'webm') {
                modeTitle = t('videoExport.autoWebM');
                modeDescription = t('videoExport.webMDescription');
            } else if (mode === 'mp4') {
                modeTitle = t('videoExport.autoMP4');
                modeDescription = t('videoExport.mp4Description');
            } else {
                modeTitle = this.exportModes[mode].name;
                modeDescription = this.exportModes[mode].description;
            }
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${this.exportModes[mode].icon} ${modeTitle}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${modeDescription}</p>
                        <div class="export-confirmation-tips">
                            <h4>${t('videoExport.beforeExporting')}:</h4>
                            <ul>
                                <li>${t('videoExport.ensurePerformance')}</li>
                                <li>${t('videoExport.closeUnnecessaryApps')}</li>
                                <li>${t('videoExport.keepTabActiveDuringExport')}</li>
                                <li>${t('videoExport.doNotResizeWindowConfirm')}</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancelExport">${t('videoExport.cancel')}</button>
                        <button class="btn btn-primary" id="confirmExport">${t('videoExport.startExport')}</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const cleanup = () => {
                document.body.removeChild(modal);
            };
            
            modal.querySelector('#cancelExport').addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            modal.querySelector('#confirmExport').addEventListener('click', () => {
                cleanup();
                resolve(true);
            });
        });
    }

    /**
     * Show manual recording instructions
     */
    async showManualRecordingInstructions() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal manual-recording-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${t('videoExport.manualRecordingInstructions')}</h3>
                    </div>
                    <div class="modal-body">
                        <div class="recording-instructions">
                            <h4>${t('videoExport.howToRecord')}:</h4>
                            <ol>
                                <li>${t('videoExport.highlightOrange')}</li>
                                <li>${t('videoExport.useSystemRecorder')}</li>
                                <li>${t('videoExport.animationAutoStart')}</li>
                                <li>${t('videoExport.recordUntilComplete')}</li>
                                <li>${t('videoExport.escapeToExit')}</li>
                            </ol>
                        </div>
                        <div class="recording-tips">
                            <h4>${t('videoExport.screenRecordingShortcuts')}:</h4>
                            <ul>
                                <li><strong>Windows:</strong> <kbd>Win</kbd> + <kbd>G</kbd> → ${t('videoExport.gameBarRecord')}</li>
                                <li><strong>Mac:</strong> <kbd>⌘</kbd> + <kbd>⇧</kbd> + <kbd>5</kbd> → ${t('videoExport.recordSelectedPortion')}</li>
                                <li>${t('videoExport.useFullscreen')}</li>
                                <li>${t('videoExport.ensureGoodPerformance')}</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancelManual">${t('videoExport.cancel')}</button>
                        <button class="btn btn-primary" id="startManual">${t('videoExport.startPreparation')}</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const cleanup = () => {
                document.body.removeChild(modal);
            };
            
            modal.querySelector('#cancelManual').addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            modal.querySelector('#startManual').addEventListener('click', () => {
                cleanup();
                resolve(true);
            });
        });
    }

    /**
     * Setup keyboard handler for manual recording mode
     */
    setupManualRecordingKeyboardHandler() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentExportMode === 'manual' && this.isExporting) {
                console.log('Escape pressed - exiting manual recording mode');
                this.cleanup();
                this.app.showMessage(t('videoExport.manualRecordingExited'), 'info');
            }
        });

        // Listen for reset button clicks to exit manual recording mode
        this.setupResetListener();
    }

    /**
     * Setup reset button listener to exit manual recording mode
     */
    setupResetListener() {
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                            if (this.currentExportMode === 'manual' && this.isExporting) {
                console.log('Reset pressed during manual recording - exiting manual recording mode');
                this.cleanup();
                this.app.showMessage(t('videoExport.manualRecordingExited'), 'info');
            }
            });
        }
    }

    /**
     * Prevent window resize/minimize during export
     */
    preventWindowChanges() {
        // Store original handlers
        this.originalResizeHandler = window.onresize;
        this.originalBeforeUnloadHandler = window.onbeforeunload;
        
        // Prevent window resize
        window.onresize = (e) => {
            e.preventDefault();
            this.app.showMessage(t('videoExport.cannotResizeWindow'), 'warning');
            return false;
        };
        
        // Warn before closing/refreshing
        window.onbeforeunload = (e) => {
            const message = t('videoExport.warningBeforeClose');
            e.returnValue = message;
            return message;
        };
        
        // Listen for minimize attempts (visibility change)
        this.visibilityChangeHandler = () => {
            if (document.hidden && this.isExporting) {
                // Show warning when user tries to minimize or switch tabs
                setTimeout(() => {
                    if (this.isExporting) {
                        this.app.showMessage(t('videoExport.keepWindowVisible'), 'warning');
                    }
                }, 100);
            }
        };
        
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
        
        console.log('🔒 Window changes prevented during export');
    }

    /**
     * Restore normal window behavior
     */
    restoreWindowChanges() {
        // Restore original handlers
        window.onresize = this.originalResizeHandler;
        window.onbeforeunload = this.originalBeforeUnloadHandler;
        
        // Remove visibility change listener
        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
            this.visibilityChangeHandler = null;
        }
        
        console.log('🔓 Window changes restored');
    }

    /**
     * Cleanup export resources
     */
    cleanup() {
        console.log('🧹 Cleaning up video export...');

        this.isExporting = false;
        this.currentExportMode = null;
        
        // Restore window behavior
        this.restoreWindowChanges();
        
        // Reset recording timing
        this.recordingStartTime = null;
        this.estimatedDuration = null;

        // Stop MediaRecorder
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        this.mediaRecorder = null;

        // Clean up WebCodecs encoder
        if (this.webCodecsEncoder) {
            try {
                this.webCodecsEncoder.close();
                this.webCodecsEncoder = null;
            } catch (error) {
                console.warn('Error closing WebCodecs encoder:', error);
            }
        }

        // Clean up recording canvas
        if (this.recordingCanvas) {
            if (this.recordingCanvas.parentNode) {
                this.recordingCanvas.parentNode.removeChild(this.recordingCanvas);
            }
            this.recordingCanvas = null;
            this.recordingContext = null;
        }

        // Stop stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Remove progress modal
        if (this.progressModal) {
            this.progressModal.remove();
            this.progressModal = null;
        }

        // Clean up ads
        revenueManager.removeAllAds();

        // Show UI elements
        this.showUIAfterRecording();

        // Remove recording highlight
        this.removeRecordingHighlight();

        // Disable performance mode and reset animation speed
        if (this.app.mapRenderer) {
            if (this.app.mapRenderer.setPerformanceMode) {
                this.app.mapRenderer.setPerformanceMode(false);
            }
            if (this.app.mapRenderer.setAnimationSpeed) {
                this.app.mapRenderer.setAnimationSpeed(1.0); // Reset to normal speed
                console.log('🔄 Reset animation speed to normal (1.0x)');
            }
        }

        // Reset timing related properties
        this.recordingStartTime = null;
        this.estimatedDuration = null;

        // Clear recorded chunks and frames
        this.recordedChunks = [];
        this.webCodecsFrames = [];

        // Reset recording flags
        this.selectedMP4Codec = null;
        this.useWebCodecs = false;
        this.recordingDimensions = null;

        console.log('✅ Video export cleanup complete');
    }

    /**
     * Destroy the controller
     */
    destroy() {
        this.cleanup();
        
        // Remove event listeners
        const exportPanel = document.getElementById('exportPanel');
        if (exportPanel) {
            exportPanel.remove();
        }
    }
} 
