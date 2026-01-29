import { byId } from '../utils/dom.js';

/**
 * Centralized DOM → Controller wiring. All callbacks call public methods on
 * the controllers – the UI layer never reaches into internals.
 */
export function setupEventListeners(app) {
    console.log('🚀 Setting up event listeners...');

    // Function to set up comparison event listeners
    const setupComparisonListeners = () => {
        console.log('🔄 Setting up comparison event listeners...');

        // File input change listener - automatically load track when selected
        const comparisonFileInput = byId('comparisonFile');
        if (comparisonFileInput) {
            console.log('✅ Found comparisonFileInput, setting up automatic load listener');
            comparisonFileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                console.log('📁 File input changed:', files);
                console.log('📁 Number of files selected:', files ? files.length : 0);

                if (files && files.length > 0) {
                    const file = files[0];
                    console.log('📄 Selected file:', file.name, 'Size:', file.size, 'Type:', file.type);
                    console.log('🔄 Automatically loading comparison track...');

                    // Automatically load the selected track
                    app.loadComparisonTrack(file).catch(error => {
                        console.error('❌ Error auto-loading comparison track:', error);
                        alert('Error loading comparison track: ' + error.message);
                    });
                }
            });
        } else {
            console.log('❌ Could not find comparisonFileInput element');
        }

        // Comparison mode toggle
        const enableComparisonToggle = byId('enableComparison');
        console.log('🔍 Looking for enableComparisonToggle:', enableComparisonToggle);
        if (enableComparisonToggle) {
            console.log('✅ Found enableComparisonToggle, setting up event listener');
            enableComparisonToggle.addEventListener('change', (e) => {
                console.log('🔄 Comparison toggle changed:', e.target.checked);
                const comparisonFileGroup = byId('comparisonFileGroup');
                console.log('📁 Comparison file group:', comparisonFileGroup);
                if (e.target.checked) {
                    comparisonFileGroup.style.display = 'block';
                    console.log('📂 Showing comparison file group');
                } else {
                    comparisonFileGroup.style.display = 'none';
                    console.log('📂 Hiding comparison file group');
                    // Disable comparison mode if active
                    if (app.comparisonMode) {
                        app.disableComparisonMode();
                    }
                }
            });
        } else {
            console.log('❌ Could not find enableComparisonToggle element');
        }


        // Track customization controls
        const track1NameInput = byId('track1Name');
        const track2NameInput = byId('track2Name');
        const track2ColorPicker = byId('track2Color');
        const track2ColorHex = byId('track2ColorHex');
        const resetTrack2ColorBtn = byId('resetTrack2Color');
        const applyTrackChangesBtn = byId('applyTrackChanges');

        // Track name inputs - real-time updates
        if (track1NameInput) {
            track1NameInput.addEventListener('input', (e) => {
                app.updateTrackName(1, e.target.value);
            });
        }

        if (track2NameInput) {
            track2NameInput.addEventListener('input', (e) => {
                app.updateTrackName(2, e.target.value);
            });
        }

        // Color picker - sync with hex input
        if (track2ColorPicker) {
            track2ColorPicker.addEventListener('input', (e) => {
                const color = e.target.value;
                track2ColorHex.value = color;
                app.updateTrackColor(2, color);
            });
        }

        // Hex input - sync with color picker
        if (track2ColorHex) {
            track2ColorHex.addEventListener('input', (e) => {
                const color = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    track2ColorPicker.value = color;
                    app.updateTrackColor(2, color);
                }
            });
        }

        // Reset color button
        if (resetTrack2ColorBtn) {
            resetTrack2ColorBtn.addEventListener('click', () => {
                const defaultColor = '#DC2626';
                track2ColorPicker.value = defaultColor;
                track2ColorHex.value = defaultColor;
                app.updateTrackColor(2, defaultColor);
            });
        }

        // Apply changes button
        if (applyTrackChangesBtn) {
            applyTrackChangesBtn.addEventListener('click', () => {
                const track1Name = track1NameInput.value || 'Track 1';
                const track2Name = track2NameInput.value; // allow empty to hide
                const track2Color = track2ColorPicker.value;

                app.applyTrackCustomizations({
                    track1Name,
                    track2Name,
                    track2Color
                });
            });
        }

    };

    // Set up comparison listeners immediately
    setupComparisonListeners();

    // Also set them up after a delay in case DOM isn't ready
    setTimeout(() => {
        console.log('🔄 Setting up comparison listeners after delay...');
        setupComparisonListeners();
    }, 1000);

    // File picker / drag-and-drop
    const fileInput = byId('gpxFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            app.file.handleFiles(e.target.files);
        });
    }

    // Playback controls
    const playBtn = byId('playBtn');
    if (playBtn) {
        playBtn.addEventListener('click', () => app.playback.toggle());
    }

    const resetBtn = byId('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => app.playback.reset());
    }



    // Icon controls
    const changeIconBtn = byId('changeIconBtn');
    if (changeIconBtn) {
        changeIconBtn.addEventListener('click', () => app.icon.showIconSelectionModal());
    }

    const addIconChangeBtn = byId('addIconChangeBtn');
    if (addIconChangeBtn) {
        addIconChangeBtn.addEventListener('click', () => app.icon.toggleIconChangeMode());
    }

    const addAnnotationBtn = byId('addAnnotationBtn');
    if (addAnnotationBtn) {
        addAnnotationBtn.addEventListener('click', () => app.notes.toggleAnnotationMode());
    }

    // Map controls
    const terrainStyleSelect = byId('terrainStyle');
    if (terrainStyleSelect) {
        terrainStyleSelect.addEventListener('change', (e) => {
            app.map.changeMapStyle(e.target.value);
        });
    }

    // Path color controls
    const pathColorInput = byId('pathColor');
    if (pathColorInput) {
        pathColorInput.addEventListener('change', (e) => {
            app.map.setPathColor(e.target.value);
        });
    }

    // Main track letters toggle
    const showTrackLettersToggle = byId('showTrackLetters');
    if (showTrackLettersToggle) {
        const track1NameWrapper = byId('track1NameWrapper');

        const syncTrackLettersUI = (enabled) => {
            app.map.setShowTrackLabel(enabled);
            if (track1NameWrapper) {
                track1NameWrapper.style.display = enabled ? 'block' : 'none';
            }
        };

        showTrackLettersToggle.addEventListener('change', (e) => {
            syncTrackLettersUI(e.target.checked);
        });

        // Ensure UI/map state matches toggle at startup
        syncTrackLettersUI(showTrackLettersToggle.checked);
    }

    // Color presets
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', (e) => {
            const color = e.target.getAttribute('data-color');
            if (pathColorInput) pathColorInput.value = color;
            app.map.setPathColor(color);
        });
    });

    // Heart Rate Color Mode Controls
    const colorModeFixed = byId('colorModeFixed');
    const colorModeHeartRate = byId('colorModeHeartRate');
    const fixedColorControls = byId('fixedColorControls');
    const heartRateControls = byId('heartRateControls');
    const heartRateStatus = byId('heartRateStatus');
    const heartRateZones = byId('heartRateZones');

    // Color mode toggle handlers
    if (colorModeFixed && colorModeHeartRate) {
        const handleColorModeChange = () => {
            const isHeartRateMode = colorModeHeartRate.checked;
            
            // Show/hide appropriate controls
            if (fixedColorControls) fixedColorControls.style.display = isHeartRateMode ? 'none' : 'flex';
            if (heartRateControls) heartRateControls.style.display = isHeartRateMode ? 'block' : 'none';
            
            if (isHeartRateMode) {
                // Check for heart rate data and update UI
                app.checkHeartRateData();
            }
            
            // Update map renderer color mode
            if (app.map && app.map.mapRenderer) {
                app.map.mapRenderer.setColorMode(isHeartRateMode ? 'heartRate' : 'fixed');
            }
        };

        colorModeFixed.addEventListener('change', handleColorModeChange);
        colorModeHeartRate.addEventListener('change', handleColorModeChange);
    }

    // Heart rate zone input handlers
    const heartRateZoneInputs = ['zone1Min', 'zone1Max', 'zone2Min', 'zone2Max', 
                                'zone3Min', 'zone3Max', 'zone4Min', 'zone4Max', 
                                'zone5Min', 'zone5Max'];
    
    heartRateZoneInputs.forEach(inputId => {
        const input = byId(inputId);
        if (input) {
            input.addEventListener('input', () => {
                // Update heart rate zones when user changes values
                if (app.map && app.map.mapRenderer) {
                    app.map.mapRenderer.updateHeartRateZones();
                }
            });
        }
    });

    // Marker size slider
    const markerSizeSlider = byId('markerSize');
    if (markerSizeSlider) {
        markerSizeSlider.addEventListener('input', (e) => {
            const size = parseFloat(e.target.value);
            const sizeDisplay = byId('markerSizeValue');
            if (sizeDisplay) {
                sizeDisplay.textContent = `${size}x`;
            }
            app.map.setMarkerSize(size);
        });
    }

    // Auto zoom toggle
    const autoZoomToggle = byId('autoZoom');
    if (autoZoomToggle) {
        autoZoomToggle.addEventListener('change', (e) => {
            app.map.setAutoZoom(e.target.checked);
        });
    }

    // Show circle toggle
    const showCircleToggle = byId('showCircle');
    if (showCircleToggle) {
        showCircleToggle.addEventListener('change', (e) => {
            app.map.setShowCircle(e.target.checked);
        });
    }

    // Show marker toggle
    const showMarkerToggle = byId('showMarker');
    if (showMarkerToggle) {
        showMarkerToggle.addEventListener('change', (e) => {
            app.map.setShowMarker(e.target.checked);
        });
    }

    // Show end stats toggle
    const showEndStatsToggle = byId('showEndStats');
    if (showEndStatsToggle) {
        showEndStatsToggle.addEventListener('change', (e) => {
            app.map.setShowEndStats(e.target.checked);
        });
    }

    const showSegmentSpeedsToggle = byId('showSegmentSpeeds');
    const speedUnitToggleGroup = byId('speedUnitToggleGroup');
    const speedAsPaceToggle = byId('speedAsPace');

    const updateSpeedUnitVisibility = (enabled) => {
        if (speedUnitToggleGroup) {
            speedUnitToggleGroup.style.display = enabled ? 'block' : 'none';
        }
    };

    if (showSegmentSpeedsToggle) {
        showSegmentSpeedsToggle.checked = app.state.showSegmentSpeeds;
        updateSpeedUnitVisibility(showSegmentSpeedsToggle.checked);
        showSegmentSpeedsToggle.addEventListener('change', (e) => {
            if (typeof app.setShowSegmentSpeeds === 'function') {
                app.setShowSegmentSpeeds(e.target.checked);
            } else {
                app.state.showSegmentSpeeds = e.target.checked;
            }
            updateSpeedUnitVisibility(e.target.checked);
        });
    } else {
        updateSpeedUnitVisibility(app.state.showSegmentSpeeds);
    }

    if (speedAsPaceToggle) {
        speedAsPaceToggle.checked = app.state.speedDisplayMode === 'pace';
        speedAsPaceToggle.addEventListener('change', (e) => {
            const mode = e.target.checked ? 'pace' : 'speed';
            if (typeof app.setSpeedDisplayMode === 'function') {
                app.setSpeedDisplayMode(mode);
            } else {
                app.state.speedDisplayMode = mode;
            }
        });
    }

    const showLiveElevationToggle = byId('showLiveElevation');
    if (showLiveElevationToggle) {
        showLiveElevationToggle.checked = app.state.showLiveElevationLabel;
        showLiveElevationToggle.addEventListener('change', (e) => {
            if (typeof app.setShowLiveElevationLabel === 'function') {
                app.setShowLiveElevationLabel(e.target.checked);
            } else {
                app.state.showLiveElevationLabel = e.target.checked;
            }
        });
    }

    const performanceModeToggle = byId('performanceModeToggle');
    if (performanceModeToggle) {
        performanceModeToggle.checked = !!app.state.performanceMode;
        performanceModeToggle.addEventListener('change', (e) => {
            app.setPerformanceMode?.(e.target.checked);
        });
    }

    const unitsSelect = byId('unitsSelect');
    if (unitsSelect) {
        unitsSelect.value = app.state.unitSystem || 'metric';
        unitsSelect.addEventListener('change', (e) => {
            app.setUnitSystem?.(e.target.value);
        });
    }




    // Camera mode dropdown
    const cameraModeSelect = byId('cameraMode');
    if (cameraModeSelect) {

        
        // Function to update UI based on camera mode
        const updateCameraModeUI = (mode) => {
            // Show/hide follow-behind zoom preset dropdown
            const followBehindZoomGroup = byId('followBehindZoomGroup');
            if (followBehindZoomGroup) {
                followBehindZoomGroup.style.display = mode === 'followBehind' ? 'block' : 'none';
            }
            
            // Show/hide camera controls info tooltip (only for standard mode)
            const cameraControlsInfo = byId('cameraControlsInfo');
            if (cameraControlsInfo) {
                cameraControlsInfo.style.display = mode === 'standard' ? 'inline-block' : 'none';
            }
        };
        
        cameraModeSelect.addEventListener('change', (e) => {

            app.map.setCameraMode(e.target.value);
            
            // Update UI elements
            updateCameraModeUI(e.target.value);
        });
        
        // Set initial state based on default selection
        const initialValue = cameraModeSelect.value;
        updateCameraModeUI(initialValue);
        

    } else {
        console.warn('🎬 Camera mode dropdown not found in DOM');
    }

    // Follow-behind zoom preset dropdown
    const followBehindZoomSelect = byId('followBehindZoom');
    if (followBehindZoomSelect) {

        followBehindZoomSelect.addEventListener('change', (e) => {

            app.map.setFollowBehindZoomPreset(e.target.value);
        });

    }

    // 3D terrain toggle
    const terrain3dToggle = byId('terrain3d');
    if (terrain3dToggle) {
        terrain3dToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                app.map.enable3DTerrain();
            } else {
                app.map.disable3DTerrain();
            }
        });
    }

    // Camera controls info tooltip
    const cameraControlsInfo = byId('cameraControlsInfo');
    if (cameraControlsInfo) {
        // Mobile/touch behavior - toggle tooltip on click
        cameraControlsInfo.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            cameraControlsInfo.classList.toggle('active');
        });

        // Close tooltip when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (!cameraControlsInfo.contains(e.target)) {
                cameraControlsInfo.classList.remove('active');
            }
        });
    }

    // Drag and drop functionality
    setupDragAndDrop(app);
}

function setupDragAndDrop(app) {
    const dropZone = document.body;

    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
        app.file.handleDrop(e);
    }, false);
}
