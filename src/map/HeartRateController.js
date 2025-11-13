import { heartRateColorMapper } from '../utils/heartRateColors.js';

export class HeartRateController {
    constructor(renderer) {
        this.renderer = renderer;
    }

    generateHeartRateColors() {
        if (!this.renderer.trackData) {
            console.warn('No track data available for heart rate colors');
            return;
        }

        const trackPoints = this.renderer.trackData.originalTrackData?.trackPoints || this.renderer.trackData.trackPoints;

        if (!trackPoints || trackPoints.length === 0) {
            console.warn('No track points available for heart rate colors');
            return;
        }

        this.renderer.heartRateColors = heartRateColorMapper.generateColorsForTrack(trackPoints);

        const analysis = heartRateColorMapper.analyzeHeartRateData(trackPoints);

        if (this.renderer.trackData?.stats) {
            this.renderer.trackData.stats.hasHeartRateData = analysis.hasData;
            this.renderer.trackData.stats.heartRateDataPoints = analysis.pointsWithData;
            this.renderer.trackData.stats.avgHeartRate = analysis.avgHeartRate;
            this.renderer.trackData.stats.minHeartRate = analysis.minHeartRate;
            this.renderer.trackData.stats.maxHeartRate = analysis.maxHeartRate;
        }

        if (this.renderer.heartRateColors && this.renderer.heartRateColors.length > 0) {
            this.prepareHeartRateSegments(trackPoints);
            // If in heart rate mode and map is loaded, update the trail immediately
            if (this.renderer.colorMode === 'heartRate' && this.renderer.map && this.renderer.map.loaded()) {
                this.updateTrailWithHeartRateColors();
            }
        } else {
            this.renderer.heartRateSegments = [];
            this.renderer.heartRateSegmentCollection = { type: 'FeatureCollection', features: [] };
        }
    }

    prepareHeartRateSegments(trackPoints) {
        if (!Array.isArray(trackPoints) || trackPoints.length < 2 || !this.renderer.heartRateColors) {
            this.renderer.heartRateSegments = [];
            this.renderer.heartRateSegmentCollection = { type: 'FeatureCollection', features: [] };
            return;
        }

        const segments = [];
        const segmentSize = 10;

        for (let start = 0; start < trackPoints.length - 1; start += segmentSize) {
            const end = Math.min(start + segmentSize, trackPoints.length - 1);
            const coordinates = trackPoints.slice(start, end + 1).map(pt => [pt.lon, pt.lat]);
            if (coordinates.length < 2) continue;

            const colorIndex = Math.min(Math.floor((start + end) / 2), this.renderer.heartRateColors.length - 1);
            const color = this.renderer.heartRateColors[colorIndex] || this.renderer.pathColor;

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

        this.renderer.heartRateSegments = segments;
        this.renderer.heartRateSegmentCollection = { type: 'FeatureCollection', features: segments };
    }

    updateCompletedTrailWithHeartRateAnimation(currentPoint) {
        if (!this.renderer.trackData || !this.renderer.heartRateColors || !this.renderer.map.loaded()) {
            return;
        }

        try {
            const trackPoints = this.renderer.trackData.originalTrackData?.trackPoints || this.renderer.trackData.trackPoints;

            if (!trackPoints || trackPoints.length === 0) {
                return;
            }

            const completedIndex = Math.floor(currentPoint.index);

            if (completedIndex < 1) {
                this.renderer.map.getSource('trail-completed').setData({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                });
                return;
            }

            const completedCoordinates = trackPoints
                .slice(0, completedIndex + 1)
                .map(point => [point.lon, point.lat]);

            const completedSegments = [];
            const SEGMENT_SIZE = 10;

            for (let segmentStart = 0; segmentStart < completedIndex; segmentStart += SEGMENT_SIZE) {
                const segmentEnd = Math.min(segmentStart + SEGMENT_SIZE, completedIndex);
                const segmentPoints = trackPoints.slice(segmentStart, segmentEnd);

                if (segmentPoints.length >= 2) {
                    const heartRates = segmentPoints
                        .map(p => p.heartRate || 0)
                        .filter(hr => hr > 0);

                    const avgHeartRate = heartRates.length > 0 ?
                        heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length : 0;

                    const middleIndex = Math.floor((segmentStart + segmentEnd) / 2);
                    const color = middleIndex < this.renderer.heartRateColors.length ?
                        (this.renderer.heartRateColors[middleIndex] || this.renderer.pathColor) : this.renderer.pathColor;

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

            if (this.renderer.map.getSource('trail-completed')) {
                if (completedSegments.length > 0) {
                    this.renderer.map.getSource('trail-completed').setData({
                        type: 'FeatureCollection',
                        features: completedSegments
                    });

                    this.renderer.map.setPaintProperty('trail-completed', 'line-color', ['get', 'color']);
                    this.renderer.map.setPaintProperty('trail-completed', 'line-width', 6);
                    this.renderer.map.setPaintProperty('trail-completed', 'line-opacity', 1.0);
                } else {
                    this.renderer.map.getSource('trail-completed').setData({
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
            const completedIndex = Math.floor(currentPoint.index);
            const completedCoordinates = this.renderer.trackData.trackPoints
                .slice(0, completedIndex + 1)
                .map(point => [point.lon, point.lat]);

            this.renderer.map.getSource('trail-completed').setData({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: completedCoordinates
                }
            });
        }
    }

    updateTrailWithHeartRateColors() {
        if (!this.renderer.trackData || !this.renderer.heartRateColors || !this.renderer.map.loaded()) {
            return;
        }

        const trackPoints = this.renderer.trackData.originalTrackData?.trackPoints || this.renderer.trackData.trackPoints;

        if (!trackPoints || trackPoints.length === 0) {
            return;
        }

        if (this.renderer.map.getSource('trail-line')) {
            if (this.renderer.heartRateSegmentCollection.features.length > 0) {
                this.renderer.map.getSource('trail-line').setData(this.renderer.heartRateSegmentCollection);
                this.renderer.map.setPaintProperty('trail-line', 'line-color', ['get', 'color']);
                this.renderer.map.setPaintProperty('trail-line', 'line-opacity', 0.8);
            } else {
                const coordinates = trackPoints.map(point => [point.lon, point.lat]);
                this.renderer.map.getSource('trail-line').setData({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: coordinates
                    }
                });
            }
        }
    }
}
