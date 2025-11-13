import { GPXParser } from '../gpxParser.js';

export class TrackManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.gpxParser = new GPXParser();
        this.renderer.gpxParser = this.gpxParser; // Make it accessible from renderer
    }

    loadTrack(trackData) {
        this.gpxParser = new GPXParser();
        this.renderer.gpxParser = this.gpxParser;
        this.renderer.trackData = trackData;
        this.gpxParser.trackPoints = trackData.trackPoints;
        this.gpxParser.stats = trackData.stats;

        this.renderer.heartRateSegments = [];
        this.renderer.heartRateSegmentCollection = { type: 'FeatureCollection', features: [] };

        const trackPoints = trackData.trackPoints || [];
        if (trackPoints.length === 0) {
            return;
        }

        const shouldGenerateHeartRateColors = this.renderer.colorMode === 'heartRate' || trackData.stats?.hasHeartRateData;
        if (shouldGenerateHeartRateColors) {
            this.renderer.generateHeartRateColors();
            // If already in heart rate mode, update the trail with heart rate colors
            if (this.renderer.colorMode === 'heartRate' && this.renderer.heartRateColors && this.renderer.heartRateColors.length > 0) {
                this.renderer.updateTrailWithHeartRateColors();
            }
        }

        const coordinates = trackPoints.map(point => {
            const elevation = point.elevation || 0;
            return [point.lon, point.lat, elevation];
        });
        
        if (trackData.isJourney && trackData.segments) {
            this.renderer.loadJourneySegments(trackData, coordinates);
        } else {
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

            this.renderer.map.getSource('trail-line').setData(trailLineData);
        }

        if (trackData.bounds && 
            !isNaN(trackData.bounds.west) && !isNaN(trackData.bounds.south) && 
            !isNaN(trackData.bounds.east) && !isNaN(trackData.bounds.north)) {
            
            const bounds = [
                [trackData.bounds.west, trackData.bounds.south],
                [trackData.bounds.east, trackData.bounds.north]
            ];
            
            const latDiff = trackData.bounds.north - trackData.bounds.south;
            const lonDiff = trackData.bounds.east - trackData.bounds.west;
            const maxDiff = Math.max(latDiff, lonDiff);
            
            let padding = 50;
            if (maxDiff < 0.01) padding = 100;
            else if (maxDiff < 0.05) padding = 80;
            else if (maxDiff < 0.1) padding = 60;
            
            const fitOptions = {
                padding: padding,
                duration: 1000,
                maxZoom: 16
            };
            
            setTimeout(() => {
                if (this.renderer.map && this.renderer.map.isStyleLoaded()) {
                    this.renderer.map.fitBounds(bounds, fitOptions);
                } else {
                    this.renderer.map.once('load', () => {
                        this.renderer.map.fitBounds(bounds, fitOptions);
                    });
                }
            }, 100);
        }

        this.renderer.animationProgress = 0;
        if (!trackData.isJourney) {
            this.renderer.iconChanges.iconChanges = [];
        }
        this.renderer.annotations.annotations = [];
        
        setTimeout(() => {
            this.renderer.initializeTrackCameraPosition(trackData);
        }, 200);
        
        if (typeof this.renderer.scheduleZoomNudge === 'function') {
            this.renderer.scheduleZoomNudge(1800);
        }
        
        this.renderer.followBehindCamera.reset();
        
        if (trackData.activityIcon) {
            this.renderer.setCurrentIcon(trackData.activityIcon);
        } else {
            this.renderer.currentIcon = this.renderer.getBaseIcon();
        }
        
        if (this.renderer.map.loaded()) {
            this.renderer.updateActivityIcon();
        } else {
            this.renderer.map.once('load', () => {
                this.renderer.updateActivityIcon();
            });
        }
        
        this.renderer.updateCurrentPosition();
        
        if (this.renderer.is3DMode) {
            this.renderer.update3DTrailRendering();
        }
        
        if (this.renderer.cameraMode === 'followBehind') {
            setTimeout(() => {
                this.renderer.followBehindCamera.initialize();
            }, 1500);
        }

        setTimeout(() => {
            this.renderer.detectAndSetMapLayout();
        }, 200);
    }
}
