export class JourneyCore {
    constructor() {
        this.tracks = []; // Array of uploaded GPX tracks
        this.segments = []; // Array of journey segments (tracks + transportation)
        this.currentJourney = null;
        
        // Auto-preview functionality
        this.autoPreviewEnabled = true;
        this.previewTimeout = null;
        this.previewDelay = 1000; // 1 second delay for debouncing
    }

    // Add a GPX track to the journey
    addTrack(trackData, filename) {
        console.log('JourneyCore.addTrack called with:', { trackData, filename });
        
        // Check if trackData has the expected structure
        if (!trackData || !trackData.trackPoints) {
            console.error('Invalid track data - missing trackPoints:', trackData);
            this.emitEvent('showMessage', { message: 'Invalid track data', type: 'error' });
            return;
        }
        
        // Convert trackPoints to coordinates format expected by the system INCLUDING elevation
        const coordinates = trackData.trackPoints.map(point => [point.lon, point.lat, point.elevation || 0]);
        console.log(`Converted ${trackData.trackPoints.length} track points to coordinates with elevation`);
        
        const track = {
            id: Date.now() + Math.random(),
            name: filename.replace('.gpx', ''),
            filename,
            data: {
                ...trackData,
                coordinates: coordinates,
                // Preserve original trackPoints with heart rate data
                trackPoints: trackData.trackPoints
            },
            type: 'gpx',
            startPoint: coordinates[0],
            endPoint: coordinates[coordinates.length - 1],
            stats: trackData.stats
        };

        console.log('Created track object:', track);
        
        this.tracks.push(track);
        console.log(`Total tracks now: ${this.tracks.length}`);
        
        this.updateSegments();
        this.emitEvent('tracksChanged', { tracks: this.tracks });
        this.emitEvent('showJourneyPlanningSection');
        
        // Auto-preview the journey
        this.autoPreviewJourney();
        
        return track;
    }

    // Remove a track
    removeTrack(trackId) {
        this.tracks = this.tracks.filter(track => track.id !== trackId);
        this.updateSegments();
        this.emitEvent('tracksChanged', { tracks: this.tracks });
        
        if (this.tracks.length === 0) {
            this.emitEvent('hideJourneyPlanningSection');
        } else {
            // Auto-preview if there are still tracks
            this.autoPreviewJourney();
        }
    }

    // Clear all tracks
    clearAllTracks() {
        this.tracks = [];
        this.segments = [];
        this.emitEvent('tracksChanged', { tracks: this.tracks });
        this.emitEvent('segmentsChanged', { segments: this.segments });
        this.emitEvent('hideJourneyPlanningSection');
    }

    // Move track up or down in order
    moveTrack(trackId, direction) {
        const index = this.tracks.findIndex(track => track.id === trackId);
        if (index === -1) return;

        if (direction === 'up' && index > 0) {
            [this.tracks[index], this.tracks[index - 1]] = [this.tracks[index - 1], this.tracks[index]];
        } else if (direction === 'down' && index < this.tracks.length - 1) {
            [this.tracks[index], this.tracks[index + 1]] = [this.tracks[index + 1], this.tracks[index]];
        }

        this.updateSegments();
        this.emitEvent('tracksChanged', { tracks: this.tracks });
        
        // Auto-preview with new track order
        this.autoPreviewJourney();
    }

    // Reorder tracks based on drag and drop
    reorderTracks(draggedId, dropTargetId) {
        const draggedIndex = this.tracks.findIndex(track => track.id === parseInt(draggedId));
        const targetIndex = this.tracks.findIndex(track => track.id === parseInt(dropTargetId));
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        const draggedTrack = this.tracks.splice(draggedIndex, 1)[0];
        this.tracks.splice(targetIndex, 0, draggedTrack);
        
        this.updateSegments();
        this.emitEvent('tracksChanged', { tracks: this.tracks });
        
        // Auto-preview with new track order
        this.autoPreviewJourney();
    }

    // Update segments based on current tracks (like original - only tracks, no auto-transport)
    updateSegments() {
        this.segments = [];

        for (let i = 0; i < this.tracks.length; i++) {
            const track = this.tracks[i];
            const coordinates = track.data.coordinates;
            
            // Ensure track has start and end points
            if (coordinates && coordinates.length > 0) {
                track.startPoint = coordinates[0];
                track.endPoint = coordinates[coordinates.length - 1];
            }
            
            // Calculate initial timing for the track
            const initialTime = this.calculateTrackTime(track.data);
            
            // Add track segment
            this.segments.push({
                type: 'track',
                id: `track-${track.id}`,
                data: track,
                startPoint: track.startPoint,
                endPoint: track.endPoint,
                coordinates: coordinates,
                stats: track.stats,
                userTime: initialTime // Initialize with calculated time
            });
        }

        this.emitEvent('segmentsChanged', { segments: this.segments });
        console.log('Updated segments:', this.segments);
    }

    // Build complete journey from segments (like original)
    buildCompleteJourney() {
        if (this.tracks.length === 0) {
            console.warn('No tracks available to build journey');
            return null;
        }

        const journey = {
            coordinates: [],
            segments: [], // This is what MainApp will receive
            stats: {
                totalDistance: 0,
                totalDuration: 0, // This will be recalculated by MainApp based on userTimes
                elevationGain: 0
            }
        };

        // Iterate over JourneyCore's internal segments
        // which contain the most up-to-date userTime values.
        this.segments.forEach(jbSegment => {
            if (jbSegment.type === 'track') {
                // Track coordinates already include elevation from addTrack method
                const trackCoordinates = jbSegment.data.data.coordinates;
                journey.coordinates.push(...trackCoordinates);
                
                // Create the segment for the journey object
                const journeySegment = {
                    type: 'track',
                    startIndex: journey.coordinates.length - trackCoordinates.length,
                    endIndex: journey.coordinates.length - 1,
                    data: jbSegment.data, // Original track data
                    userTime: jbSegment.userTime // CRITICAL: Copy userTime
                };
                journey.segments.push(journeySegment);
                
                journey.stats.totalDistance += jbSegment.data.stats.totalDistance || 0;
                journey.stats.elevationGain += jbSegment.data.stats.elevationGain || 0;

                // Also aggregate duration from individual track stats
                if (jbSegment.data.stats.totalDuration) {
                    journey.stats.totalDuration += jbSegment.data.stats.totalDuration;
                }
                
            } else if (jbSegment.type === 'transportation') {
                let routeCoordinates = [];
                let route = jbSegment.route;
                
                if (jbSegment.route && jbSegment.route.coordinates) {
                    // Ensure transportation coordinates include elevation (interpolate if needed)
                    routeCoordinates = jbSegment.route.coordinates.map(coord => {
                        // If coordinate doesn't have elevation (length < 3), estimate it
                        if (coord.length < 3) {
                            // Use 0 elevation for transportation routes by default
                            // In the future, we could interpolate elevation from nearby track points
                            return [coord[0], coord[1], 0];
                        }
                        return coord;
                    });
                } else if (jbSegment.mode && jbSegment.startPoint && jbSegment.endPoint) {
                    // Create simple line between start and end points with elevation
                    const startElevation = jbSegment.startPoint[2] || 0;
                    const endElevation = jbSegment.endPoint[2] || 0;
                    routeCoordinates = [
                        [jbSegment.startPoint[0], jbSegment.startPoint[1], startElevation],
                        [jbSegment.endPoint[0], jbSegment.endPoint[1], endElevation]
                    ];
                    const distance = this.calculateDistance(jbSegment.startPoint, jbSegment.endPoint) * 1000;
                    // Use jbSegment.userTime if set by user, otherwise default.
                    const transportTime = (jbSegment.userTime !== undefined && jbSegment.userTime !== null) 
                                          ? jbSegment.userTime 
                                          : this.getDefaultTransportTime(jbSegment.mode, distance / 1000);
                    
                    route = {
                        coordinates: routeCoordinates,
                        distance: distance,
                        duration: transportTime, // This duration should reflect userTime or default
                        userTime: transportTime, // Explicitly set userTime here too for consistency
                        provider: 'fallback',
                        type: jbSegment.mode
                    };
                    jbSegment.route = route; // Update the internal segment's route
                }
                
                if (routeCoordinates.length > 0) {
                    journey.coordinates.push(...routeCoordinates);
                    
                    // Create the segment for the journey object
                    const journeySegment = {
                        type: 'transportation',
                        mode: jbSegment.mode,
                        startIndex: journey.coordinates.length - routeCoordinates.length,
                        endIndex: journey.coordinates.length - 1,
                        route: route, // route object now includes correct userTime or default
                        userTime: jbSegment.userTime // CRITICAL: Copy userTime if set for transport overall
                    };
                    journey.segments.push(journeySegment);
                    
                    if (route) {
                        journey.stats.totalDistance += route.distance / 1000;
                        // Note: totalDuration for journey.stats will be calculated by MainApp using these segments
                    }
                } else {
                    console.warn('Transportation segment has no coordinates:', jbSegment);
                }
            }
        });

        // Calculate aggregate stats for the combined journey
        this.calculateAggregateStats(journey);

        // MainApp's calculateSegmentTiming will now determine the true totalDuration
        // based on the userTime values it receives in journey.segments.
        console.log('JourneyCore: Built complete journey with segments containing userTime:', journey.segments.map(s => ({type: s.type, userTime: s.userTime})));

        this.currentJourney = journey;
        return journey;
    }

    // Calculate track time based on distance (simplified: 3s per km)
    calculateTrackTime(trackData) {
        const distance = trackData.stats?.totalDistance || 0; // in km
        
        // Simple calculation: 3 seconds per km
        const animationTime = Math.max(10, Math.round(distance * 3)); // Minimum 10 seconds
        return animationTime;
    }

    // Get default transport time for fallback routes
    getDefaultTransportTime(mode, distanceKm) {
        // Simple calculation: 3 seconds per km for all transportation modes
        const animationTime = Math.max(10, Math.round(distanceKm * 3)); // Minimum 10 seconds
        return animationTime;
    }

    // Calculate aggregate stats for a complete journey (distance, duration, speed, pace)
    calculateAggregateStats(journey) {
        if (!journey || !journey.segments || journey.segments.length === 0) {
            console.warn('Cannot calculate aggregate stats: invalid journey');
            return;
        }

        let totalDistance = 0;
        let totalDuration = 0;
        let totalElevationGain = 0;
        let minElevation = Infinity;
        let maxElevation = -Infinity;

        // Aggregate stats from all segments
        journey.segments.forEach(segment => {
            if (segment.type === 'track' && segment.data && segment.data.stats) {
                const stats = segment.data.stats;
                totalDistance += stats.totalDistance || 0;
                totalElevationGain += stats.elevationGain || 0;

                // Track duration if available
                if (stats.totalDuration) {
                    totalDuration += stats.totalDuration;
                }

                // Track elevation range
                if (stats.minElevation !== undefined) {
                    minElevation = Math.min(minElevation, stats.minElevation);
                }
                if (stats.maxElevation !== undefined) {
                    maxElevation = Math.max(maxElevation, stats.maxElevation);
                }
            }
        });

        // Calculate derived stats
        let avgSpeed = 0;
        let avgPace = 0;

        if (totalDuration > 0 && totalDistance > 0) {
            // Speed in km/h (totalDuration is already in hours from aggregation)
            avgSpeed = totalDistance / totalDuration;

            // Pace in min/km (time per distance)
            avgPace = (totalDuration / totalDistance) * 60;


        }

        // Update journey stats
        journey.stats = {
            ...journey.stats,
            totalDistance: totalDistance,
            totalDuration: totalDuration,
            elevationGain: totalElevationGain,
            avgSpeed: avgSpeed,
            avgPace: avgPace,
            minElevation: minElevation !== Infinity ? minElevation : undefined,
            maxElevation: maxElevation !== -Infinity ? maxElevation : undefined
        };

        console.log('JourneyCore: Calculated aggregate stats:', {
            totalDistance: totalDistance.toFixed(2) + ' km',
            totalDuration: totalDuration.toFixed(2) + ' hours',
            avgSpeed: avgSpeed.toFixed(2) + ' km/h',
            avgPace: avgPace.toFixed(2) + ' min/km',
            elevationGain: totalElevationGain.toFixed(0) + ' m'
        });
    }

    // Calculate overall journey statistics
    calculateJourneyStats() {
        let totalDistance = 0;
        let totalElevationGain = 0;

        this.segments.forEach(segment => {
            if (segment.type === 'track' && segment.stats) {
                totalDistance += segment.stats.totalDistance || 0;
                totalElevationGain += segment.stats.elevationGain || 0;
            } else if (segment.type === 'transportation') {
                if (segment.route && segment.route.distance) {
                    totalDistance += segment.route.distance;
                } else {
                    // Calculate direct distance
                    totalDistance += this.calculateDistance(segment.startPoint, segment.endPoint);
                }
            }
        });

        return {
            totalDistance,
            elevationGain: totalElevationGain
        };
    }

    // Calculate distance between two points
    calculateDistance(point1, point2) {
        const R = 6371; // Earth's radius in km
        const dLat = (point2[1] - point1[1]) * Math.PI / 180;
        const dLon = (point2[0] - point1[0]) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(point1[1] * Math.PI / 180) * Math.cos(point2[1] * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Auto-preview journey with debouncing
    autoPreviewJourney() {
        if (!this.autoPreviewEnabled) return;
        
        // Clear existing timeout
        if (this.previewTimeout) {
            clearTimeout(this.previewTimeout);
        }
        
        // Set new timeout for debounced preview
        this.previewTimeout = setTimeout(() => {
            this.previewJourney();
        }, this.previewDelay);
    }

    // Preview the current journey
    previewJourney() {
        if (this.tracks.length === 0) return;
        
        const journey = this.buildCompleteJourney();
        if (journey) {
            this.emitEvent('journeyPreview', { journey });
        }
    }

    // Enable/disable auto-preview
    setAutoPreview(enabled) {
        this.autoPreviewEnabled = enabled;
        console.log('Auto-preview', enabled ? 'enabled' : 'disabled');
    }

    // Get tracks
    getTracks() {
        return this.tracks;
    }

    // Get segments
    getSegments() {
        return this.segments;
    }

    // Get current journey
    getCurrentJourney() {
        return this.currentJourney;
    }

    // Emit custom events
    emitEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }
} 