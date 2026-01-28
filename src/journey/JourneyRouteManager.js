import { RoutingService } from '../routingService.js';
import { t } from '../translations.js';

export class JourneyRouteManager {
    constructor(journeyCore) {
        this.journeyCore = journeyCore;
        this.routingService = new RoutingService();
        this.routingServices = {
            car: 'https://api.openrouteservice.org/v2/directions/driving-car',
            walking: 'https://api.openrouteservice.org/v2/directions/foot-walking',
            cycling: 'https://api.openrouteservice.org/v2/directions/cycling-regular'
        };
        this.apiKey = null; // Will need to be set by user or environment
        
        // Route drawing state
        this.isDrawingRoute = false;
        this.currentDrawnRoute = [];
        this.currentSegmentIndex = -1;
        this.currentMode = null;
        this.mapInstance = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for route drawing requests
        document.addEventListener('startRouteDrawing', (e) => {
            const { segmentIndex, mode } = e.detail;
            this.startRouteDrawing(segmentIndex, mode);
        });

        // Listen for transportation segment additions
        document.addEventListener('addTransportationSegment', (e) => {
            const { mode } = e.detail;
            this.addTransportationSegment(mode);
        });

        // Listen for transportation edits
        document.addEventListener('editTransportation', (e) => {
            const { segmentIndex } = e.detail;
            this.editTransportation(segmentIndex);
        });

        // Listen for transportation removal
        document.addEventListener('removeTransportation', (e) => {
            const { segmentIndex } = e.detail;
            this.removeTransportation(segmentIndex);
        });
    }

    // Set the map instance for route drawing
    setMapInstance(mapInstance) {
        this.mapInstance = mapInstance;
        this.setupMapDrawingListeners();
    }

    // Set API key for routing services
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        this.routingService.setApiKey(apiKey);
    }

    // Add transportation segment
    addTransportationSegment(mode) {
        const tracks = this.journeyCore.getTracks();
        if (tracks.length < 2) {
            this.showMessage(t('journeyBuilder.needTwoTracksForTransport'), 'warning');
            return;
        }

        // Check if we have map access for drawing routes
        this.checkMapAccessAndDraw(-1, mode);
    }

    // Check map access and start drawing if available
    checkMapAccessAndDraw(segmentIndex, mode) {
        if (!this.mapInstance) {
            this.showMessage(t('journeyBuilder.mapNotAvailable'), 'warning');
            // Fall back to API route calculation
            this.calculateRoute(segmentIndex, mode);
        } else {
            // Show route drawing options
            this.showTransportationOptions(segmentIndex, mode);
        }
    }

    // Show transportation options modal
    showTransportationOptions(segmentIndex, mode) {
        const segments = this.journeyCore.getSegments();
        let startPoint, endPoint;

        if (segmentIndex >= 0) {
            // Editing existing segment
            const segment = segments[segmentIndex];
            startPoint = segment.startPoint;
            endPoint = segment.endPoint;
        } else {
            // Adding new transportation between tracks
            const tracks = this.journeyCore.getTracks();
            // For simplicity, connect last track to first (or add UI to select)
            startPoint = tracks[tracks.length - 1].endPoint;
            endPoint = tracks[0].startPoint;
        }

        const modal = this.createTransportationModal(segmentIndex, mode, startPoint, endPoint);
        document.body.appendChild(modal);
    }

    // Create transportation options modal
    createTransportationModal(segmentIndex, mode, startPoint, endPoint) {
        const modal = document.createElement('div');
        modal.className = 'modal transportation-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${t('journeyBuilder.transportationOptions')}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="transport-mode-selection">
                        <label>${t('journeyBuilder.transportMode')}:</label>
                        <select id="transportModeSelect">
                            <option value="car" ${mode === 'car' ? 'selected' : ''}>${t('journeyBuilder.transport.car')}</option>
                            <option value="walking" ${mode === 'walking' ? 'selected' : ''}>${t('journeyBuilder.transport.walking')}</option>
                            <option value="cycling" ${mode === 'cycling' ? 'selected' : ''}>${t('journeyBuilder.transport.cycling')}</option>
                            <option value="bus" ${mode === 'bus' ? 'selected' : ''}>${t('journeyBuilder.transport.bus')}</option>
                            <option value="train" ${mode === 'train' ? 'selected' : ''}>${t('journeyBuilder.transport.train')}</option>
                            <option value="plane" ${mode === 'plane' ? 'selected' : ''}>${t('journeyBuilder.transport.plane')}</option>
                        </select>
                    </div>
                    
                    <div class="route-options">
                        <h4>${t('journeyBuilder.routeOptions')}</h4>
                        <div class="route-option">
                            <input type="radio" id="directRoute" name="routeType" value="direct" checked>
                            <label for="directRoute">${t('journeyBuilder.directRoute')}</label>
                            <small>${t('journeyBuilder.directRouteDescription')}</small>
                        </div>
                        <div class="route-option">
                            <input type="radio" id="apiRoute" name="routeType" value="api">
                            <label for="apiRoute">${t('journeyBuilder.calculateRoute')}</label>
                            <small>${t('journeyBuilder.calculateRouteDescription')}</small>
                        </div>
                        <div class="route-option">
                            <input type="radio" id="drawRoute" name="routeType" value="draw">
                            <label for="drawRoute">${t('journeyBuilder.drawRoute')}</label>
                            <small>${t('journeyBuilder.drawRouteDescription')}</small>
                        </div>
                    </div>

                    <div class="timing-options">
                        <h4>${t('journeyBuilder.timing')}</h4>
                        <label>${t('journeyBuilder.customDuration')}:</label>
                        <input type="number" id="customDuration" placeholder="${t('journeyBuilder.durationInMinutes')}" min="1">
                        <small>${t('journeyBuilder.leaveEmptyForDefault')}</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelTransport">${t('common.cancel')}</button>
                    <button class="btn btn-primary" id="confirmTransport">${t('common.confirm')}</button>
                </div>
            </div>
        `;

        // Setup modal event listeners
        this.setupTransportationModalListeners(modal, segmentIndex, startPoint, endPoint);
        
        return modal;
    }

    // Setup transportation modal event listeners
    setupTransportationModalListeners(modal, segmentIndex, startPoint, endPoint) {
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('#cancelTransport');
        const confirmBtn = modal.querySelector('#confirmTransport');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        confirmBtn.addEventListener('click', async () => {
            const mode = modal.querySelector('#transportModeSelect').value;
            const routeType = modal.querySelector('input[name="routeType"]:checked').value;
            const customDuration = modal.querySelector('#customDuration').value;

            closeModal();

            // Process the transportation segment
            await this.processTransportationSegment(segmentIndex, mode, routeType, startPoint, endPoint, customDuration);
        });
    }

    // Process transportation segment based on options
    async processTransportationSegment(segmentIndex, mode, routeType, startPoint, endPoint, customDuration) {
        let route = null;
        let userTime = customDuration ? parseFloat(customDuration) * 60 : null; // Convert minutes to seconds

        switch (routeType) {
            case 'direct':
                // Use direct line connection
                route = {
                    coordinates: [startPoint, endPoint],
                    distance: this.journeyCore.calculateDistance(startPoint, endPoint)
                };
                break;
                
            case 'api':
                // Calculate route using API
                try {
                    route = await this.calculateRoute(startPoint, endPoint, mode);
                } catch (error) {
                    console.error('Route calculation failed:', error);
                    this.showMessage(t('journeyBuilder.routeCalculationFailed'), 'error');
                    return;
                }
                break;
                
            case 'draw':
                // Start route drawing mode
                this.startRouteDrawing(segmentIndex, mode, startPoint, endPoint);
                return;
        }

        // Update or create transportation segment
        this.updateTransportationSegment(segmentIndex, mode, route, userTime);
    }

    // Calculate route using API
    async calculateRoute(startPoint, endPoint, mode) {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        try {
            const result = await this.routingService.calculateRoute(
                [startPoint[0], startPoint[1]], 
                [endPoint[0], endPoint[1]], 
                mode
            );

            return {
                coordinates: result.coordinates,
                distance: result.distance / 1000, // Convert to km
                duration: result.duration
            };
        } catch (error) {
            console.error('Route calculation error:', error);
            throw error;
        }
    }

    // Start route drawing mode
    startRouteDrawing(segmentIndex, mode, startPoint = null, endPoint = null) {
        if (!this.mapInstance) {
            this.showMessage(t('journeyBuilder.mapNotAvailableForDrawing'), 'error');
            return;
        }

        this.isDrawingRoute = true;
        this.currentSegmentIndex = segmentIndex;
        this.currentMode = mode;
        this.currentDrawnRoute = [];

        // If start and end points provided, use them
        if (startPoint && endPoint) {
            this.routeStartPoint = startPoint;
            this.routeEndPoint = endPoint;
        }

        this.showRouteDrawingUI();
        this.setupRouteDrawingListeners();
    }

    // Show route drawing UI
    showRouteDrawingUI() {
        const drawingUI = document.createElement('div');
        drawingUI.id = 'routeDrawingUI';
        drawingUI.className = 'route-drawing-ui';
        drawingUI.innerHTML = `
            <div class="drawing-instructions">
                <h4>${t('journeyBuilder.drawingRoute')}</h4>
                <p>${t('journeyBuilder.clickMapToAddPoints')}</p>
                <div class="drawing-stats">
                    <span id="routePointCount">0 ${t('journeyBuilder.points')}</span>
                    <span id="routeDistance">${this.formatDistance(0)}</span>
                </div>
            </div>
            <div class="drawing-controls">
                <button id="finishDrawing" class="btn btn-primary">${t('journeyBuilder.finishDrawing')}</button>
                <button id="cancelDrawing" class="btn btn-secondary">${t('common.cancel')}</button>
                <button id="undoLastPoint" class="btn btn-outline">${t('journeyBuilder.undoLastPoint')}</button>
            </div>
        `;

        document.body.appendChild(drawingUI);
        this.setupDrawingUIListeners();
    }

    // Setup route drawing UI listeners
    setupDrawingUIListeners() {
        const finishBtn = document.getElementById('finishDrawing');
        const cancelBtn = document.getElementById('cancelDrawing');
        const undoBtn = document.getElementById('undoLastPoint');

        finishBtn.addEventListener('click', () => this.finishRouteDrawing());
        cancelBtn.addEventListener('click', () => this.cancelRouteDrawing());
        undoBtn.addEventListener('click', () => this.undoLastPoint());
    }

    formatDistance(distanceKm) {
        const unitPreference = typeof localStorage !== 'undefined'
            ? localStorage.getItem('trailReplayUnits')
            : 'metric';
        const useImperial = unitPreference === 'imperial';
        if (useImperial) {
            const miles = distanceKm * 0.621371;
            return `${miles.toFixed(2)} mi`;
        }
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)} m`;
        }
        return `${distanceKm.toFixed(2)} km`;
    }

    // Setup route drawing listeners
    setupRouteDrawingListeners() {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.cancelRouteDrawing();
            }
        };

        document.addEventListener('keydown', handleEscape);
        this.escapeHandler = handleEscape;
    }

    // Setup map drawing listeners
    setupMapDrawingListeners() {
        if (!this.mapInstance) return;

        const handleMapClick = (e) => {
            if (!this.isDrawingRoute) return;

            const point = [e.lngLat.lng, e.lngLat.lat];
            this.addRoutePoint(point);
        };

        this.mapInstance.on('click', handleMapClick);
        this.mapClickHandler = handleMapClick;
    }

    // Add point to current route
    addRoutePoint(point) {
        this.currentDrawnRoute.push(point);
        this.updateRouteVisualization();
        this.updateRouteDrawingUI();
    }

    // Update route visualization on map
    updateRouteVisualization() {
        if (!this.mapInstance || this.currentDrawnRoute.length === 0) return;

        // Add or update route source
        if (this.mapInstance.getSource('drawing-route')) {
            this.mapInstance.getSource('drawing-route').setData({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: this.currentDrawnRoute
                }
            });
        } else {
            this.mapInstance.addSource('drawing-route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: this.currentDrawnRoute
                    }
                }
            });

            this.mapInstance.addLayer({
                id: 'drawing-route',
                type: 'line',
                source: 'drawing-route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#ff6b6b',
                    'line-width': 4,
                    'line-dasharray': [2, 2]
                }
            });
        }

        // Add points
        this.currentDrawnRoute.forEach((point, index) => {
            const pointId = `drawing-point-${index}`;
            if (!this.mapInstance.getSource(pointId)) {
                this.mapInstance.addSource(pointId, {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: point
                        }
                    }
                });

                this.mapInstance.addLayer({
                    id: pointId,
                    type: 'circle',
                    source: pointId,
                    paint: {
                        'circle-radius': 4,
                        'circle-color': '#ff6b6b'
                    }
                });
            }
        });
    }

    // Update route drawing UI
    updateRouteDrawingUI() {
        const pointCount = document.getElementById('routePointCount');
        const distanceEl = document.getElementById('routeDistance');

        if (pointCount) {
            pointCount.textContent = `${this.currentDrawnRoute.length} ${t('journeyBuilder.points')}`;
        }

        if (distanceEl && this.currentDrawnRoute.length > 1) {
            const distance = this.calculateRouteDistance(this.currentDrawnRoute);
            distanceEl.textContent = this.formatDistance(distance);
        }
    }

    // Calculate route distance
    calculateRouteDistance(coordinates) {
        let totalDistance = 0;
        for (let i = 1; i < coordinates.length; i++) {
            totalDistance += this.journeyCore.calculateDistance(coordinates[i-1], coordinates[i]);
        }
        return totalDistance;
    }

    // Undo last point
    undoLastPoint() {
        if (this.currentDrawnRoute.length > 0) {
            const removedPoint = this.currentDrawnRoute.pop();
            
            // Remove point from map
            const pointId = `drawing-point-${this.currentDrawnRoute.length}`;
            if (this.mapInstance.getLayer(pointId)) {
                this.mapInstance.removeLayer(pointId);
                this.mapInstance.removeSource(pointId);
            }

            this.updateRouteVisualization();
            this.updateRouteDrawingUI();
        }
    }

    // Finish route drawing
    finishRouteDrawing() {
        if (this.currentDrawnRoute.length < 2) {
            this.showMessage(t('journeyBuilder.needTwoPointsMinimum'), 'warning');
            return;
        }

        const route = {
            coordinates: [...this.currentDrawnRoute],
            distance: this.calculateRouteDistance(this.currentDrawnRoute)
        };

        // Update transportation segment with drawn route
        this.updateTransportationSegment(this.currentSegmentIndex, this.currentMode, route, null);
        
        this.cleanupRouteDrawing();
    }

    // Cancel route drawing
    cancelRouteDrawing() {
        this.cleanupRouteDrawing();
    }

    // Cleanup route drawing
    cleanupRouteDrawing() {
        this.isDrawingRoute = false;
        this.currentDrawnRoute = [];
        this.currentSegmentIndex = -1;
        this.currentMode = null;

        // Remove drawing UI
        const drawingUI = document.getElementById('routeDrawingUI');
        if (drawingUI) {
            document.body.removeChild(drawingUI);
        }

        // Remove escape handler
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }

        // Clean up map visualization
        if (this.mapInstance) {
            // Remove drawing layers and sources
            if (this.mapInstance.getLayer('drawing-route')) {
                this.mapInstance.removeLayer('drawing-route');
                this.mapInstance.removeSource('drawing-route');
            }

            // Remove point layers
            let pointIndex = 0;
            while (this.mapInstance.getLayer(`drawing-point-${pointIndex}`)) {
                this.mapInstance.removeLayer(`drawing-point-${pointIndex}`);
                this.mapInstance.removeSource(`drawing-point-${pointIndex}`);
                pointIndex++;
            }
        }
    }

    // Update transportation segment
    updateTransportationSegment(segmentIndex, mode, route, userTime) {
        const segments = this.journeyCore.getSegments();
        
        if (segmentIndex >= 0 && segmentIndex < segments.length) {
            // Update existing segment
            const segment = segments[segmentIndex];
            segment.mode = mode;
            segment.route = route;
            segment.userTime = userTime;
        } else {
            // This would need to be handled by the core for adding new segments
            // For now, emit an event
            document.dispatchEvent(new CustomEvent('createTransportationSegment', {
                detail: { mode, route, userTime }
            }));
        }

        // Trigger segments update
        this.journeyCore.emitEvent('segmentsChanged', { segments });
        
        // Auto-preview journey
        this.journeyCore.autoPreviewJourney();
    }

    // Edit existing transportation segment
    editTransportation(segmentIndex) {
        const segments = this.journeyCore.getSegments();
        const segment = segments[segmentIndex];
        
        if (segment && segment.type === 'transportation') {
            this.showTransportationOptions(segmentIndex, segment.mode);
        }
    }

    // Remove transportation segment
    removeTransportation(segmentIndex) {
        const segments = this.journeyCore.getSegments();
        
        if (segmentIndex >= 0 && segmentIndex < segments.length) {
            segments.splice(segmentIndex, 1);
            this.journeyCore.emitEvent('segmentsChanged', { segments });
            this.journeyCore.autoPreviewJourney();
        }
    }

    // Show message
    showMessage(message, type = 'info') {
        // Create a simple message display
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            if (document.body.contains(messageEl)) {
                document.body.removeChild(messageEl);
            }
        }, 3000);
    }
} 
