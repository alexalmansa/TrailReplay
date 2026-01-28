import { t } from '../translations.js';

export class JourneySegmentsUI {
    constructor(journeyCore, routeManager, journeyTiming) {
        this.journeyCore = journeyCore;
        this.routeManager = routeManager;
        this.journeyTiming = journeyTiming;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for segments changes
        document.addEventListener('segmentsChanged', (e) => {
            this.renderSegmentsList();
        });

        // Transportation mode buttons
        document.querySelectorAll('.transport-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.getAttribute('data-mode');
                this.addTransportationSegment(mode);
            });
        });
    }

    // Render the segments list UI (with timing summary and configuration)
    renderSegmentsList() {
        const segmentsList = document.getElementById('segmentsList');
        if (!segmentsList) return;

        segmentsList.innerHTML = '';

        // Add timing summary first
        const timingSummary = this.calculateJourneyTiming();
        const summaryElement = document.createElement('div');
        summaryElement.className = 'journey-timing-summary';
        summaryElement.innerHTML = `
            <div class="timing-summary-header">
                <span>${t('journeyBuilder.journeyTiming')}</span>
                <span class="total-time">${this.formatTime(timingSummary.totalDuration)}</span>
            </div>
            <div class="timing-summary-breakdown">
                <span>${t('journeyBuilder.tracks')}: ${this.formatTime(timingSummary.trackTime || 0)}</span>
                <span>${t('journeyBuilder.transportation')}: ${this.formatTime(timingSummary.transportTime || 0)}</span>
            </div>
        `;
        segmentsList.appendChild(summaryElement);

        // Group segments and add transportation options between tracks
        const trackSegments = this.journeyCore.getSegments().filter(s => s.type === 'track');
        
        trackSegments.forEach((trackSegment, trackIndex) => {
            // Add track segment - use userTime if available, otherwise calculate default
            let trackTime = trackSegment.userTime;
            if (trackTime === null || trackTime === undefined) {
                trackTime = this.calculateTrackTime(trackSegment.data.data);
                // Store the calculated time back to the segment
                trackSegment.userTime = trackTime;
            }
            const trackElement = document.createElement('div');
            trackElement.className = 'segment-item track';
            trackElement.innerHTML = `
                <div class="segment-icon">${this.getTrackIcon(trackSegment.data.data.activityType || 'running')}</div>
                <div class="segment-content">
                    <div class="segment-title">${trackSegment.data.name}</div>
                    <div class="segment-description">
                        ${this.formatDistance(trackSegment.stats?.totalDistance || 0)} • 
                        ${this.formatElevation(trackSegment.stats?.elevationGain || 0)} elevation
                    </div>
                    <div class="segment-timing">
                        <label>${t('journeyBuilder.animationTime')}:</label>
                        <input type="number" class="segment-time-input" 
                               value="${trackTime}" 
                               min="5" max="600" step="5" 
                               onchange="window.journeyBuilder?.segmentsUI?.updateSegmentTime(${this.journeyCore.getSegments().indexOf(trackSegment)}, this.value, 'track')">
                        <span>${t('journeyBuilder.seconds')}</span>
                    </div>
                </div>
            `;
            segmentsList.appendChild(trackElement);
            
            // Add transportation between this track and the next (if not last track)
            if (trackIndex < trackSegments.length - 1) {
                const nextTrackSegment = trackSegments[trackIndex + 1];
                const allSegments = this.journeyCore.getSegments();
                const existingTransport = allSegments.find(s => 
                    s.type === 'transportation' && 
                    s.startPoint && s.endPoint &&
                    s.startPoint[0] === trackSegment.endPoint[0] && 
                    s.startPoint[1] === trackSegment.endPoint[1]
                );
                
                if (existingTransport) {
                    // Show existing transport segment - ensure it has proper timing
                    const distance = this.calculateTransportDistance(existingTransport);
                    let transportTime = existingTransport.userTime;
                    if (transportTime === null || transportTime === undefined) {
                        transportTime = this.getDefaultTransportTime(existingTransport.mode, distance);
                        // Store the calculated time back to the segment
                        existingTransport.userTime = transportTime;
                        if (existingTransport.route) {
                            existingTransport.route.userTime = transportTime;
                            existingTransport.route.duration = transportTime;
                        }
                    }
                    
                    const transportElement = document.createElement('div');
                    transportElement.className = 'segment-item transport';
                    transportElement.innerHTML = `
                        <div class="segment-icon">${this.getTransportIcon(existingTransport.mode)}</div>
                        <div class="segment-content">
                            <div class="segment-title">${t('journeyBuilder.transportation')}: ${t(`journeyBuilder.transport.${existingTransport.mode}`)}</div>
                            <div class="segment-description">
                                ${existingTransport.route ? 'Route via ' + (existingTransport.route.provider || 'roads') : `Distance: ~${this.formatDistance(distance)}`}
                            </div>
                            <div class="segment-timing">
                                <label>${t('journeyBuilder.animationTime')}:</label>
                                <input type="number" class="segment-time-input" 
                                       value="${transportTime}" 
                                       min="5" max="600" step="5" 
                                       onchange="window.journeyBuilder?.segmentsUI?.updateSegmentTime(${allSegments.indexOf(existingTransport)}, this.value, 'transport')">
                                <span>${t('journeyBuilder.seconds')}</span>
                            </div>
                        </div>
                        <div class="segment-actions">
                            <button class="track-action-btn" onclick="window.journeyBuilder?.segmentsUI?.editTransportation(${allSegments.indexOf(existingTransport)})" title="${t('journeyBuilder.edit')}">✏️</button>
                            <button class="track-action-btn" onclick="window.journeyBuilder?.segmentsUI?.removeTransportation(${allSegments.indexOf(existingTransport)})" title="${t('journeyBuilder.remove')}">🗑️</button>
                        </div>
                    `;
                    segmentsList.appendChild(transportElement);
                } else {
                    // Show "Add Transportation" button
                    const distance = this.journeyCore.calculateDistance(trackSegment.endPoint, nextTrackSegment.startPoint);
                    const addTransportElement = document.createElement('div');
                    addTransportElement.className = 'segment-item transport-add';
                    addTransportElement.innerHTML = `
                        <div class="segment-icon">❓</div>
                        <div class="segment-content">
                            <div class="segment-title">${t('journey.addTransportation')}</div>
                            <div class="segment-description">
                                ${t('journeyBuilder.chooseHowToTravelBetweenTracks')} (~${this.formatDistance(distance)})
                            </div>
                        </div>
                        <div class="segment-actions">
                            <button class="track-action-btn" onclick="window.journeyBuilder?.segmentsUI?.showTransportationOptions(${trackIndex})" title="${t('journeyBuilder.addTransport')}">➕</button>
                        </div>
                    `;
                    segmentsList.appendChild(addTransportElement);
                }
            }
        });
    }

    // Simple public methods called by onclick handlers
    editSegmentTiming(segmentIndex) {
        const segments = this.journeyCore.getSegments();
        const segment = segments[segmentIndex];
        
        if (this.journeyTiming) {
            const currentDuration = this.getSegmentDuration(segment);
            const modal = this.journeyTiming.createTimingEditorModal(segmentIndex, segment, currentDuration);
            document.body.appendChild(modal);
        }
    }

    editTransportation(segmentIndex) {
        this.routeManager.editTransportation(segmentIndex);
    }

    drawRoute(segmentIndex) {
        const segments = this.journeyCore.getSegments();
        const segment = segments[segmentIndex];
        this.routeManager.startRouteDrawing(segmentIndex, segment.mode);
    }

    removeTransportation(segmentIndex) {
        this.routeManager.removeTransportation(segmentIndex);
    }

    // Update segment timing (called by inline inputs)
    updateSegmentTime(segmentIndex, newTime, segmentType) {
        console.log(`=== Updating ${segmentType} segment ${segmentIndex} time to: ${newTime}s ===`);
        
        const timeValue = parseInt(newTime);
        const segments = this.journeyCore.getSegments();
        const segment = segments[segmentIndex];
        
        if (!segment) {
            console.error('Segment not found at index:', segmentIndex);
            return;
        }
        
        console.log(`Updating segment ${segmentIndex} (${segmentType}) time to exactly ${timeValue} seconds`);
        
        // Store the user time
        if (segmentType === 'track') {
            segment.userTime = timeValue;
            console.log(`✅ Track segment ${segmentIndex}: userTime set to ${timeValue}s`);
        } else if (segmentType === 'transport') {
            if (segment.route) {
                segment.route.userTime = timeValue;
                segment.route.duration = timeValue;
                console.log(`✅ Transport segment ${segmentIndex}: route.userTime set to ${timeValue}s`);
            }
            segment.userTime = timeValue;
            console.log(`✅ Transport segment ${segmentIndex}: segment.userTime set to ${timeValue}s`);
        }
        
        // Calculate new total timing
        const newJourneyTiming = this.calculateJourneyTiming();
        console.log(`Total journey time is now: ${newJourneyTiming.totalDuration}s (sum of all segments)`);
        
        // Update timing display immediately
        this.updateTimingDisplay();
        
        // Show feedback
        if (window.journeyBuilder?.showMessage) {
            window.journeyBuilder.showMessage(`Segment: ${timeValue}s | Total: ${newJourneyTiming.totalDuration}s`, 'success');
        }
        
        // Notify main app with timing update
        console.log('Notifying main app with exact timing values...');
        
        const timingUpdateEvent = new CustomEvent('segmentTimingUpdate', {
            detail: { 
                segments: segments,
                segmentIndex: segmentIndex,
                newTime: timeValue,
                segmentType: segmentType,
                totalDuration: newJourneyTiming.totalDuration,
                newSegmentTiming: newJourneyTiming
            }
        });
        
        const dispatched = document.dispatchEvent(timingUpdateEvent);
        console.log('Event dispatched:', dispatched ? '✅ Success' : '❌ Failed');
        
        // Direct backup call to main app
        if (window.app && typeof window.app.handleSegmentTimingUpdate === 'function') {
            try {
                window.app.handleSegmentTimingUpdate({
                    segments: segments,
                    segmentIndex: segmentIndex,
                    newTime: timeValue,
                    segmentType: segmentType,
                    totalDuration: newJourneyTiming.totalDuration,
                    newSegmentTiming: newJourneyTiming
                });
                console.log('✅ Direct call successful');
            } catch (error) {
                console.error('❌ Direct call failed:', error);
            }
        }
        
        // Force update main app's total time
        if (window.app) {
            window.app.totalAnimationTime = newJourneyTiming.totalDuration;
            console.log('✅ Force updated main app totalAnimationTime to exact total:', newJourneyTiming.totalDuration);
        }
        
        // Auto-preview with new timing
        if (window.journeyBuilder?.previewJourney) {
            window.journeyBuilder.previewJourney();
        }
        
        console.log('=== Segment timing update completed with exact values ===');
    }

    // Show transportation options for a specific track gap
    showTransportationOptions(trackIndex) {
        const transportOptions = document.getElementById('transportationOptions');
        if (!transportOptions) return;
        
        // Hide it first, then show it (to ensure it's properly visible)
        transportOptions.style.display = 'none';
        
        // Set the data attribute to track which gap we're adding transport for
        transportOptions.setAttribute('data-segment-index', trackIndex);
        
        // Show it and scroll to it
        transportOptions.style.display = 'block';
        transportOptions.scrollIntoView({ behavior: 'smooth' });
        
        console.log(`Showing transportation options for track gap ${trackIndex}`);
    }

    // Hide transportation options
    hideTransportationOptions() {
        const transportOptions = document.getElementById('transportationOptions');
        if (transportOptions) {
            transportOptions.style.display = 'none';
            transportOptions.removeAttribute('data-segment-index');
        }
    }

    // Update timing displays throughout the app
    updateTimingDisplay() {
        // Calculate new total timing
        const timingSummary = this.calculateJourneyTiming();
        
        // Update the timing summary in segments list
        const totalTimeElement = document.querySelector('.total-time');
        if (totalTimeElement) {
            totalTimeElement.textContent = this.formatTime(timingSummary.totalDuration);
        }
        
        // Update breakdown
        const breakdown = document.querySelector('.timing-summary-breakdown');
        if (breakdown) {
            breakdown.innerHTML = `
                <span>${t('journeyBuilder.tracks')}: ${this.formatTime(timingSummary.trackTime || 0)}</span>
                <span>${t('journeyBuilder.transportation')}: ${this.formatTime(timingSummary.transportTime || 0)}</span>
            `;
        }
        
        // Emit timing update for main app
        document.dispatchEvent(new CustomEvent('journeyTimingUpdated', {
            detail: {
                totalDuration: timingSummary.totalDuration,
                segmentTiming: timingSummary.segmentTiming || []
            }
        }));
        
        // Auto-preview the journey with new timing
        this.journeyCore.autoPreviewJourney();
    }

    // Calculate segment duration
    getSegmentDuration(segment) {
        if (segment.type === 'track') {
            return this.calculateTrackTime(segment.data.data);
        } else {
            return segment.userTime || this.getDefaultTransportTime(segment.mode, this.calculateTransportDistance(segment));
        }
    }

    // Calculate journey timing (like original)
    calculateJourneyTiming() {
        const segments = this.journeyCore.getSegments();
        let trackTime = 0;
        let transportTime = 0;
        const segmentTiming = [];
        let currentTime = 0;

        segments.forEach(segment => {
            let duration = 0;
            
            if (segment.type === 'track') {
                // Use exact user-defined time, or calculate default if not set
                if (segment.userTime !== undefined && segment.userTime !== null) {
                    duration = segment.userTime;
                } else {
                    duration = this.calculateTrackTime(segment.data.data);
                    // Store the calculated time back to the segment for consistency
                    segment.userTime = duration;
                }
                trackTime += duration;
            } else if (segment.type === 'transportation') {
                // Use exact user-defined time
                if (segment.route && segment.route.userTime !== undefined && segment.route.userTime !== null) {
                    duration = segment.route.userTime;
                } else if (segment.userTime !== undefined && segment.userTime !== null) {
                    duration = segment.userTime;
                } else if (segment.mode && segment.startPoint && segment.endPoint) {
                    const distance = this.calculateTransportDistance(segment);
                    duration = this.getDefaultTransportTime(segment.mode, distance);
                    // Store the calculated time back to the segment for consistency
                    segment.userTime = duration;
                    if (segment.route) {
                        segment.route.userTime = duration;
                        segment.route.duration = duration;
                    }
                } else {
                    duration = 30; // Default fallback
                    segment.userTime = duration;
                }
                transportTime += duration;
            }

            segmentTiming.push({
                id: segment.id,
                type: segment.type,
                duration: duration,
                startTime: currentTime,
                endTime: currentTime + duration
            });
            currentTime += duration;
        });

        const totalDuration = trackTime + transportTime;

        return {
            trackTime,
            transportTime,
            totalDuration,
            segmentTiming
        };
    }

    // Get track icon
    getTrackIcon(activityType) {
        const icons = {
            running: '🏃‍♂️',
            cycling: '🚴‍♂️',
            swimming: '🏊‍♂️',
            hiking: '🥾',
            walking: '🚶‍♂️'
        };
        return icons[activityType] || '🏃‍♂️';
    }

    // Get transport icon
    getTransportIcon(mode) {
        const icons = {
            car: '🚗',
            walk: '🚶‍♂️',
            cycling: '🚲',
            bus: '🚌',
            train: '🚂',
            boat: '⛵',
            plane: '✈️'
        };
        return icons[mode] || '🚗';
    }

    // Add transportation segment (like original)
    addTransportationSegment(mode) {
        const transportOptions = document.getElementById('transportationOptions');
        const segmentIndex = parseInt(transportOptions.getAttribute('data-segment-index'));
        
        // Find the track segments
        const allSegments = this.journeyCore.getSegments();
        const trackSegments = allSegments.filter(s => s.type === 'track');
        
        // Find which tracks this transportation connects based on the segment index
        const trackIndex = segmentIndex;
        
        if (trackIndex >= 0 && trackIndex < trackSegments.length - 1) {
            const startPoint = trackSegments[trackIndex].endPoint;
            const endPoint = trackSegments[trackIndex + 1].startPoint;
            
            // Calculate default time for this mode and distance
            const distance = this.journeyCore.calculateDistance(startPoint, endPoint);
            const defaultTime = this.getDefaultTransportTime(mode, distance);
            
            // Create a new transportation segment with proper route initialization
            const transportSegment = {
                id: `transport_${Date.now()}`,
                type: 'transportation',
                mode: mode,
                startPoint: startPoint,
                endPoint: endPoint,
                route: {
                    coordinates: [startPoint, endPoint],
                    distance: distance * 1000, // Convert to meters
                    duration: defaultTime,
                    userTime: defaultTime,
                    provider: 'default',
                    type: mode
                },
                userTime: defaultTime
            };
            
            // Find the insertion position in the segments array
            const currentTrackIndex = allSegments.findIndex(s => s === trackSegments[trackIndex]);
            const nextTrackIndex = allSegments.findIndex(s => s === trackSegments[trackIndex + 1]);
            
            // Remove any existing transportation segment between these tracks
            if (nextTrackIndex - currentTrackIndex > 1) {
                allSegments.splice(currentTrackIndex + 1, nextTrackIndex - currentTrackIndex - 1);
            }
            
            // Insert the new transport segment
            allSegments.splice(currentTrackIndex + 1, 0, transportSegment);
            
            console.log(`Added ${mode} transport between track ${trackIndex} and ${trackIndex + 1}`);
            
                    // Handle different transportation modes
            if (['car', 'walk', 'cycling'].includes(mode)) {
                // Automatically calculate route for car/walking/cycling
                this.calculateRoute(currentTrackIndex + 1, mode);
            } else if (['boat', 'plane', 'train'].includes(mode)) {
                // For boat, plane, and train, check map access for route drawing
                this.checkMapAccessAndDraw(currentTrackIndex + 1, mode);
            }
        }

        // Hide transportation options after selection
        this.hideTransportationOptions();
        
        // Re-render segments list to show the new transport
        this.renderSegmentsList();
        
        // Auto-preview the updated journey
        this.journeyCore.autoPreviewJourney();
    }

    // Check if map is available for route drawing, auto-preview if needed
    checkMapAccessAndDraw(segmentIndex, mode) {
        // Add route-drawing-active class to body
        document.body.classList.add('route-drawing-active');
        
        // Try to access map for route drawing
        const requestMapEvent = new CustomEvent('requestMapForDrawing', {
            detail: { 
                callback: (map) => {
                    if (map) {
                        // Map is available, start route drawing
                        this.startRouteDrawing(segmentIndex, mode, map);
                    } else {
                        // Map not available, trigger auto-preview first
                        this.autoPreviewForRouteDrawing(segmentIndex, mode);
                    }
                }
            }
        });
        document.dispatchEvent(requestMapEvent);
        
        // If no response within 100ms, assume map not available
        setTimeout(() => {
            if (!this.isDrawingRoute) {
                this.autoPreviewForRouteDrawing(segmentIndex, mode);
            }
        }, 100);
    }

    // Auto-preview journey and then start route drawing
    autoPreviewForRouteDrawing(segmentIndex, mode) {
        // First trigger auto-preview to ensure map is loaded
        this.journeyCore.autoPreviewJourney();
        
        // Wait a bit for the map to load, then try route drawing again
        setTimeout(() => {
            const requestMapEvent = new CustomEvent('requestMapForDrawing', {
                detail: { 
                    callback: (map) => {
                        if (map) {
                            this.startRouteDrawing(segmentIndex, mode, map);
                        } else {
                            // Still no map, fallback to realistic route
                            console.warn('Map still not available, using realistic route');
                            this.createRealisticRoute(segmentIndex, mode);
                            document.body.classList.remove('route-drawing-active');
                        }
                    }
                }
            });
            document.dispatchEvent(requestMapEvent);
        }, 500); // Give map time to load
    }

    // Start route drawing mode for manual routes (boats, planes, and trains)
    startRouteDrawing(segmentIndex, mode, mapInstance = null) {
        const segments = this.journeyCore.getSegments();
        const segment = segments[segmentIndex];
        if (!segment) return;

        // Use provided map or try to get it
        if (!mapInstance) {
            mapInstance = window.mapRenderer?.map;
        }

        if (!mapInstance) {
            console.error('Map not available for route drawing');
            // Fallback to realistic route
            this.createRealisticRoute(segmentIndex, mode);
            return;
        }

        this.isDrawingRoute = true;
        this.currentDrawnRoute = [];
        this.currentSegmentIndex = segmentIndex;
        this.currentDrawingMode = mode;
        this.drawingMap = mapInstance;
        
        // Enable drawing mode
        document.body.classList.add('route-drawing-active');
        
        // Show route drawing UI
        this.showRouteDrawingUI(segment);
        
        // Setup drawing event listeners  
        this.setupRouteDrawingListeners();
        
        // Show start and end points on map
        this.showRouteEndpoints();
        
        // Center map on the route area
        this.centerMapOnRoute();
        
        // Show instructions message
        const modeText = mode === 'boat' ? 'Boat' : mode === 'plane' ? 'Plane' : 'Train';
        console.log(`Starting ${modeText} route drawing - click on map to add waypoints`);
    }

    // Show route drawing UI
    showRouteDrawingUI(segment) {
        const startCoord = segment.startPoint;
        const endCoord = segment.endPoint;
        const distance = this.journeyCore.calculateDistance(startCoord, endCoord).toFixed(1);
        
        // Create overlay UI for route drawing
        const overlay = document.createElement('div');
        overlay.id = 'routeDrawingOverlay';
        overlay.className = 'route-drawing-overlay';
        
        const modeInfo = {
            boat: { icon: '⛵', name: 'Boat Route' },
            plane: { icon: '✈️', name: 'Flight Path' },
            train: { icon: '🚂', name: 'Train Route' }
        };
        
        const currentMode = modeInfo[this.currentDrawingMode] || { icon: '🚗', name: 'Route' };
        
        overlay.innerHTML = `
            <div class="route-drawing-controls">
                <div class="route-drawing-info">
                    <span class="route-drawing-mode">${currentMode.icon} Drawing ${currentMode.name}</span>
                    <div class="route-drawing-details">
                        <span class="route-distance">Distance: ~${this.formatDistance(distance)}</span>
                        <div class="route-timing">
                            <label>Animation Time:</label>
                            <input type="number" id="routeTravelTime" min="5" max="600" value="${this.getDefaultTimeInSeconds(distance)}" step="5">
                            <span>seconds</span>
                        </div>
                    </div>
                    <span class="route-drawing-points">Points: <span id="routePointCount">0</span></span>
                </div>
                <div class="route-drawing-instructions">
                    <p>🎯 Start at <strong>GREEN</strong> marker, end at <strong>RED</strong> marker</p>
                    <p>Click on the map to add waypoints for your route</p>
                </div>
                <div class="route-drawing-buttons">
                    <button id="finishRouteBtn" class="btn-primary" disabled>Finish Route</button>
                    <button id="cancelRouteBtn" class="btn-secondary">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Setup button listeners
        document.getElementById('finishRouteBtn').addEventListener('click', () => this.finishRouteDrawing());
        document.getElementById('cancelRouteBtn').addEventListener('click', () => this.cancelRouteDrawing());
        
        // Add start and end markers to map
        this.addRouteMarkers(startCoord, endCoord);
    }

    // Get default time in seconds based on distance
    getDefaultTimeInSeconds(distanceKm) {
        // Simple calculation: 3 seconds per km + base time
        const baseTime = 10; // 10 second minimum
        const scaledTime = Math.round(distanceKm * 3); // 3 seconds per km
        return Math.max(baseTime, scaledTime);
    }

    // Setup route drawing event listeners
    setupRouteDrawingListeners() {
        if (!this.drawingMap) return;
        
        // Store bound function for cleanup
        this.mapClickHandler = (e) => {
            if (this.isDrawingRoute) {
                const point = [e.lngLat.lng, e.lngLat.lat];
                this.currentDrawnRoute.push(point);
                
                console.log('Route point added:', point);
                
                // Update visual feedback
                this.addRoutePoint(point);
                this.updateRouteVisualization();
                this.updateRouteDrawingUI();
            }
        };
        
        this.keydownHandler = (e) => {
            if (e.key === 'Escape' && this.isDrawingRoute) {
                this.cancelRouteDrawing();
            }
        };
        
        this.drawingMap.on('click', this.mapClickHandler);
        document.addEventListener('keydown', this.keydownHandler);
    }

    // Show route endpoints on map
    showRouteEndpoints() {
        if (!this.drawingMap) return;
        
        const segments = this.journeyCore.getSegments();
        const segment = segments[this.currentSegmentIndex];
        if (!segment) return;
        
        this.addRouteMarkers(segment.startPoint, segment.endPoint);
    }

    // Center map on the route area
    centerMapOnRoute() {
        if (!this.drawingMap) return;
        
        const segments = this.journeyCore.getSegments();
        const segment = segments[this.currentSegmentIndex];
        if (!segment) return;
        
        const startPoint = segment.startPoint;
        const endPoint = segment.endPoint;
        
        // Calculate bounds that include both points with padding
        const lngs = [startPoint[0], endPoint[0]];
        const lats = [startPoint[1], endPoint[1]];
        
        const bounds = [
            [Math.min(...lngs), Math.min(...lats)], // Southwest
            [Math.max(...lngs), Math.max(...lats)]  // Northeast
        ];
        
        this.drawingMap.fitBounds(bounds, {
            padding: 100,
            duration: 1000
        });
    }

    // Add route markers to map
    addRouteMarkers(startPoint, endPoint) {
        if (!this.drawingMap) return;
        
        // Add start marker (green)
        if (!this.drawingMap.getSource('route-start-marker')) {
            this.drawingMap.addSource('route-start-marker', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: startPoint }
                }
            });
            
            this.drawingMap.addLayer({
                id: 'route-start-marker',
                type: 'circle',
                source: 'route-start-marker',
                paint: {
                    'circle-radius': 12,
                    'circle-color': '#10b981',
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-width': 3
                }
            });
        }
        
        // Add end marker (red)
        if (!this.drawingMap.getSource('route-end-marker')) {
            this.drawingMap.addSource('route-end-marker', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: endPoint }
                }
            });
            
            this.drawingMap.addLayer({
                id: 'route-end-marker',
                type: 'circle',
                source: 'route-end-marker',
                paint: {
                    'circle-radius': 12,
                    'circle-color': '#ef4444',
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-width': 3
                }
            });
        }
    }

    // Add visual point on map
    addRoutePoint(point) {
        if (!this.drawingMap) return;
        
        // Add source for route points if it doesn't exist
        if (!this.drawingMap.getSource('route-drawing-points')) {
            this.drawingMap.addSource('route-drawing-points', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });
            
            this.drawingMap.addLayer({
                id: 'route-drawing-points',
                type: 'circle',
                source: 'route-drawing-points',
                paint: {
                    'circle-radius': 6,
                    'circle-color': this.getRouteColor(),
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-width': 2
                }
            });
        }
        
        // Get current data
        const source = this.drawingMap.getSource('route-drawing-points');
        const data = source._data || { type: 'FeatureCollection', features: [] };
        
        // Add new point
        data.features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: point
            },
            properties: {
                index: this.currentDrawnRoute.length - 1
            }
        });
        
        source.setData(data);
    }

    // Get route color based on mode
    getRouteColor() {
        const colors = {
            boat: '#4ecdc4',
            plane: '#ffe66d',
            train: '#a8e6cf'
        };
        return colors[this.currentDrawingMode] || '#4ecdc4';
    }

    // Update route line visualization
    updateRouteVisualization() {
        if (!this.drawingMap || this.currentDrawnRoute.length < 2) return;
        
        // Add source for route line if it doesn't exist
        if (!this.drawingMap.getSource('route-drawing-line')) {
            this.drawingMap.addSource('route-drawing-line', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                }
            });
            
            this.drawingMap.addLayer({
                id: 'route-drawing-line',
                type: 'line',
                source: 'route-drawing-line',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': this.getRouteColor(),
                    'line-width': 4,
                    'line-opacity': 0.8,
                    'line-dasharray': this.currentDrawingMode === 'plane' ? [2, 2] : null
                }
            });
        }
        
        // Update line data
        const source = this.drawingMap.getSource('route-drawing-line');
        source.setData({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: this.currentDrawnRoute
            }
        });
    }

    // Update point count display
    updatePointCount() {
        const countElement = document.getElementById('routePointCount');
        if (countElement) {
            countElement.textContent = this.currentDrawnRoute.length;
        }
    }

    // Update route drawing UI
    updateRouteDrawingUI() {
        this.updatePointCount();
        
        // Enable/disable finish button based on point count
        const finishBtn = document.getElementById('finishRouteBtn');
        if (finishBtn) {
            finishBtn.disabled = this.currentDrawnRoute.length < 2;
        }
    }

    // Finish route drawing
    finishRouteDrawing() {
        if (this.currentDrawnRoute.length < 2) {
            console.warn('Route must have at least 2 points');
            return;
        }

        // Get user-specified time
        const travelTimeInput = document.getElementById('routeTravelTime');
        const travelTimeSeconds = parseInt(travelTimeInput?.value) || this.getDefaultTimeInSeconds(
            this.calculateRouteDistance(this.currentDrawnRoute)
        );

        // Save the drawn route
        const segments = this.journeyCore.getSegments();
        const segment = segments[this.currentSegmentIndex];
        if (segment) {
            const distance = this.calculateRouteDistance(this.currentDrawnRoute) * 1000; // convert to meters
            
            segment.route = {
                coordinates: [...this.currentDrawnRoute],
                distance: distance,
                duration: travelTimeSeconds,
                userTime: travelTimeSeconds,
                provider: 'manual',
                type: this.currentDrawingMode
            };
            segment.userTime = travelTimeSeconds;
        }

        // Cleanup and finish
        this.cleanupRouteDrawing();
        this.renderSegmentsList();
        
        console.log(`${this.currentDrawingMode} route completed in ${travelTimeSeconds} seconds`);
        
        // Auto-preview with new route
        this.journeyCore.autoPreviewJourney();
    }

    // Cancel route drawing
    cancelRouteDrawing() {
        // Fallback to realistic route
        this.createRealisticRoute(this.currentSegmentIndex, this.currentDrawingMode);
        this.cleanupRouteDrawing();
    }

    // Cleanup route drawing
    cleanupRouteDrawing() {
        this.isDrawingRoute = false;
        this.currentDrawnRoute = [];
        this.currentSegmentIndex = null;
        this.currentDrawingMode = null;
        
        // Remove drawing class
        document.body.classList.remove('route-drawing-active');
        
        // Remove overlay
        const overlay = document.getElementById('routeDrawingOverlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
        
        // Remove event listeners
        if (this.drawingMap && this.mapClickHandler) {
            this.drawingMap.off('click', this.mapClickHandler);
        }
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        
        // Remove map layers
        if (this.drawingMap) {
            const layersToRemove = ['route-drawing-points', 'route-drawing-line', 'route-start-marker', 'route-end-marker'];
            layersToRemove.forEach(layerId => {
                if (this.drawingMap.getLayer(layerId)) {
                    this.drawingMap.removeLayer(layerId);
                }
                if (this.drawingMap.getSource(layerId)) {
                    this.drawingMap.removeSource(layerId);
                }
            });
        }
        
        this.drawingMap = null;
        this.mapClickHandler = null;
        this.keydownHandler = null;
    }

    // Calculate route distance
    calculateRouteDistance(coordinates) {
        if (coordinates.length < 2) return 0;
        
        let totalDistance = 0;
        for (let i = 1; i < coordinates.length; i++) {
            totalDistance += this.journeyCore.calculateDistance(coordinates[i-1], coordinates[i]);
        }
        return totalDistance;
    }

    // Utility methods
    formatDistance(distanceKm) {
        const unitPreference = typeof localStorage !== 'undefined'
            ? localStorage.getItem('trailReplayUnits')
            : 'metric';
        const useImperial = unitPreference === 'imperial';
        if (useImperial) {
            const miles = distanceKm * 0.621371;
            return `${miles.toFixed(1)} mi`;
        }
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)}m`;
        }
        return `${distanceKm.toFixed(1)}km`;
    }

    formatElevation(elevationM) {
        return `${Math.round(elevationM)}m`;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    calculateTrackTime(trackData) {
        // Simple calculation: 3 seconds per km
        const distance = trackData.stats?.totalDistance || 0;
        const animationTime = Math.max(10, Math.round(distance * 3)); // Minimum 10 seconds
        return animationTime;
    }

    calculateTransportDistance(segment) {
        if (segment.route && segment.route.distance) {
            return segment.route.distance;
        }
        // Calculate direct distance
        return this.journeyCore.calculateDistance(segment.startPoint, segment.endPoint);
    }

    getDefaultTransportTime(mode, distanceKm) {
        // Simple calculation: 3 seconds per km for all transportation modes
        const animationTime = Math.max(10, Math.round(distanceKm * 3)); // Minimum 10 seconds
        return animationTime;
    }

    // Calculate route using routing service (like original)
    async calculateRoute(segmentIndex, mode) {
        const segments = this.journeyCore.getSegments();
        const segment = segments[segmentIndex];
        if (!segment) return;

        try {
            // Import and use the routing service
            const { RoutingService } = await import('../routingService.js');
            const routingService = new RoutingService();
            
            // Map 'car' to 'driving' for routing service
            const routingMode = mode === 'car' ? 'driving' : mode;
            const route = await routingService.calculateRoute(
                segment.startPoint,
                segment.endPoint,
                routingMode
            );
            
            // Ensure userTime is set in seconds for consistency
            if (route && !route.userTime) {
                const distance = this.journeyCore.calculateDistance(segment.startPoint, segment.endPoint);
                route.userTime = this.getDefaultTransportTime(mode, distance);
            }
            
            segment.route = route;
            console.log(`Route calculated for ${mode}:`, route);
            
            // Re-render to show the updated route
            this.renderSegmentsList();
            
            // Auto-preview with new route
            this.journeyCore.autoPreviewJourney();
            
        } catch (error) {
            console.error('Error calculating route:', error);
            // Fallback to realistic route
            this.createRealisticRoute(segmentIndex, mode);
        }
    }

    // Create realistic route with curves (like original fallback)
    createRealisticRoute(segmentIndex, mode) {
        const segments = this.journeyCore.getSegments();
        const segment = segments[segmentIndex];
        if (!segment) return;

        const distance = this.journeyCore.calculateDistance(segment.startPoint, segment.endPoint);
        const distanceMeters = distance * 1000;
        
        // Generate curved route for more realistic appearance
        const coordinates = this.generateCurvedRoute(segment.startPoint, segment.endPoint, mode);
        
        // Calculate realistic duration based on mode
        const duration = this.getDefaultTransportTime(mode, distance);
        
        const fallbackRoute = {
            coordinates: coordinates,
            distance: distanceMeters,
            duration: duration,
            userTime: duration,
            mode: mode,
            provider: 'realistic-route'
        };
        
        segment.route = fallbackRoute;
        console.log(`Created realistic ${mode} route:`, fallbackRoute);
        
        // Re-render to show the updated route
        this.renderSegmentsList();
        
        // Auto-preview with fallback route
        this.journeyCore.autoPreviewJourney();
    }

    // Generate a curved route between two points (like original)
    generateCurvedRoute(startPoint, endPoint, mode) {
        const waypoints = [];
        const distance = this.journeyCore.calculateDistance(startPoint, endPoint);
        const numSegments = Math.min(8, Math.max(3, Math.floor(distance / 5))); // More segments for longer distances
        
        waypoints.push(startPoint);
        
        for (let i = 1; i < numSegments; i++) {
            const t = i / numSegments;
            
            // Linear interpolation
            const lat = startPoint[1] + (endPoint[1] - startPoint[1]) * t;
            const lng = startPoint[0] + (endPoint[0] - startPoint[0]) * t;
            
            // Add some curvature based on mode
            let curvature = 0;
            if (mode === 'driving' || mode === 'car') {
                curvature = 0.01; // Roads curve around obstacles
            } else if (mode === 'boat') {
                curvature = 0.005; // Boats can take more direct routes but still curve slightly
            } else if (mode === 'walk' || mode === 'cycling') {
                curvature = 0.008; // Paths might wind a bit
            } else if (mode === 'train') {
                curvature = 0.003; // Trains follow rail lines with gentle curves
            } else if (mode === 'plane') {
                curvature = 0; // Planes fly straight
            }
            
            // Apply gentle S-curve
            const curveOffset = Math.sin(t * Math.PI) * curvature;
            const perpLat = -(endPoint[0] - startPoint[0]);
            const perpLng = endPoint[1] - startPoint[1];
            const perpLength = Math.sqrt(perpLat * perpLat + perpLng * perpLng);
            
            if (perpLength > 0 && curvature > 0) {
                waypoints.push([
                    lng + (perpLng / perpLength) * curveOffset,
                    lat + (perpLat / perpLength) * curveOffset
                ]);
            } else {
                waypoints.push([lng, lat]);
            }
        }
        
        waypoints.push(endPoint);
        return waypoints;
    }
} 
