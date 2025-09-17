import * as turf from '@turf/turf';

export class GPXParser {
    constructor() {
        this.trackPoints = [];
        this.stats = {
            totalDistance: 0,
            totalDuration: 0,
            elevationGain: 0,
            avgSpeed: 0,
            minElevation: Infinity,
            maxElevation: -Infinity
        };
    }

    async parseFile(file) {
        try {
            const text = await this.readFile(file);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'text/xml');
            
            // Check for parsing errors
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('Invalid GPX file format');
            }
            
            return this.extractTrackData(xmlDoc);
        } catch (error) {
            console.error('Error parsing GPX file:', error);
            throw new Error('Failed to parse GPX file');
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    extractTrackData(xmlDoc) {
        // Try different GPX structures
        let trkpts = xmlDoc.querySelectorAll('trkpt');
        
        // If no track points found, try route points
        if (trkpts.length === 0) {
            trkpts = xmlDoc.querySelectorAll('rtept');
        }
        
        // If still no points, try waypoints
        if (trkpts.length === 0) {
            trkpts = xmlDoc.querySelectorAll('wpt');
        }
        
        if (trkpts.length === 0) {
            throw new Error('No track points found in GPX file');
        }

        this.trackPoints = [];
        let totalDistance = 0;
        let elevationGain = 0;
        let previousPoint = null;
        let startTime = null;
        let endTime = null;

        Array.from(trkpts).forEach((trkpt, index) => {
            const lat = parseFloat(trkpt.getAttribute('lat'));
            const lon = parseFloat(trkpt.getAttribute('lon'));
            
            if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                console.warn(`Skipping invalid coordinate: lat=${lat}, lon=${lon}`);
                return; // Skip invalid points
            }
            
            const eleElement = trkpt.querySelector('ele');
            const timeElement = trkpt.querySelector('time');
            
            const elevation = eleElement ? parseFloat(eleElement.textContent) : 0;
            const timeStr = timeElement ? timeElement.textContent : null;
            let time = null;
            
            if (timeStr) {
                try {
                    time = new Date(timeStr);
                    if (isNaN(time.getTime())) {
                        console.log(`Invalid time at point ${index}: ${timeStr}`);
                        time = null;
                    }
                } catch (e) {
                    console.log(`Error parsing time at point ${index}: ${timeStr}`, e);
                    time = null;
                }
            }

            if (!startTime && time) startTime = time;
            if (time) endTime = time;

            const point = {
                lat,
                lon,
                elevation: isNaN(elevation) ? 0 : elevation,
                time,
                index,
                distance: totalDistance,
                speed: 0
            };

            // Calculate distance from previous point
            if (previousPoint) {
                const distance = this.calculateDistance(
                    previousPoint.lat, previousPoint.lon,
                    lat, lon
                );
                
                totalDistance += distance;
                point.distance = totalDistance;

                // Calculate speed if we have time data
                if (previousPoint.time && time) {
                    const timeDiff = (time - previousPoint.time) / 1000; // seconds
                    const timeDiffHours = timeDiff / 3600; // hours
                    point.speed = timeDiffHours > 0 ? distance / timeDiffHours : 0;
                } else {
                    // No time data - estimate speed based on average or use 0
                    point.speed = 0;
                }
                


                // Calculate elevation gain
                if (!isNaN(elevation) && !isNaN(previousPoint.elevation) && elevation > previousPoint.elevation) {
                    elevationGain += elevation - previousPoint.elevation;
                }
            }

            this.trackPoints.push(point);
            previousPoint = point;

            // Update min/max elevation
            if (!isNaN(elevation)) {
                this.stats.minElevation = Math.min(this.stats.minElevation, elevation);
                this.stats.maxElevation = Math.max(this.stats.maxElevation, elevation);
            }
        });

        // Check if we have any valid track points
        if (this.trackPoints.length === 0) {
            throw new Error('No valid track points found in GPX file');
        }

        // Calculate final statistics
        let duration = startTime && endTime ? (endTime - startTime) / 1000 / 3600 : 0; // hours
        
        const pointsWithTime = this.trackPoints.filter(p => p.time).length;
        const pointsWithSpeed = this.trackPoints.filter(p => p.speed && p.speed > 0).length;
        const speedValues = this.trackPoints.map(p => p.speed || 0);
        const minSpeed = Math.min(...speedValues.filter(s => s > 0));
        const maxSpeed = Math.max(...speedValues);
        
        console.log('⏱️ Time & Speed Analysis:', {
            startTime,
            endTime,
            duration: duration.toFixed(4),
            totalPoints: this.trackPoints.length,
            pointsWithTime,
            pointsWithSpeed,
            speedRange: `${minSpeed.toFixed(1)} - ${maxSpeed.toFixed(1)} km/h`,
            avgSpeed: pointsWithSpeed > 0 ? (speedValues.filter(s => s > 0).reduce((a, b) => a + b, 0) / pointsWithSpeed).toFixed(1) + ' km/h' : '0 km/h'
        });
        
        // Post-process speed data: fill in missing speeds with estimates
        this.fillMissingSpeedData();
        
        // If no time data available, estimate duration based on distance and average speed
        if (duration === 0 && totalDistance > 0) {
            // Estimate based on activity type - assume reasonable speeds
            const estimatedSpeed = 5; // km/h for walking/hiking as default
            duration = totalDistance / estimatedSpeed; // hours
            console.log(`No time data found. Estimated duration: ${duration} hours based on distance ${totalDistance} km`);
        }
        
        const avgSpeed = duration > 0 ? totalDistance / duration : 0;

        this.stats = {
            totalDistance,
            totalDuration: duration,
            elevationGain,
            avgSpeed,
            minElevation: this.stats.minElevation === Infinity ? 0 : this.stats.minElevation,
            maxElevation: this.stats.maxElevation === -Infinity ? 0 : this.stats.maxElevation,
            startTime,
            endTime,
            hasTimeData: !!(startTime && endTime)
        };



        const activitySegments = this.detectActivitySegments();

        return {
            trackPoints: this.trackPoints,
            stats: this.stats,
            bounds: this.calculateBounds(),
            activitySegments
        };
    }

    // Haversine formula for distance calculation
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    calculateBounds() {
        if (this.trackPoints.length === 0) return null;

        // Filter out any points with NaN coordinates
        const validPoints = this.trackPoints.filter(p => !isNaN(p.lat) && !isNaN(p.lon));
        
        if (validPoints.length === 0) {
            console.error('No valid track points found - all have NaN coordinates');
            return null;
        }

        const lats = validPoints.map(p => p.lat);
        const lons = validPoints.map(p => p.lon);

        const north = Math.max(...lats);
        const south = Math.min(...lats);
        const east = Math.max(...lons);
        const west = Math.min(...lons);

        // Validate the calculated bounds
        if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
            console.error('Calculated bounds contain NaN values:', { north, south, east, west });
            return null;
        }

        return {
            north,
            south,
            east,
            west,
            center: [
                (west + east) / 2,
                (south + north) / 2
            ]
        };
    }

    // Get interpolated point for animation
    getInterpolatedPoint(progress) {
        if (this.trackPoints.length === 0) return null;
        
        const totalPoints = this.trackPoints.length;
        const targetIndex = Math.min(progress * (totalPoints - 1), totalPoints - 1);
        const index = Math.floor(targetIndex);
        const fraction = targetIndex - index;

        if (index >= totalPoints - 1) {
            return this.trackPoints[totalPoints - 1];
        }

        const currentPoint = this.trackPoints[index];
        const nextPoint = this.trackPoints[index + 1];

        // Safety checks for undefined points or properties
        if (!currentPoint || !nextPoint || 
            typeof currentPoint.lat === 'undefined' || typeof nextPoint.lat === 'undefined' ||
            typeof currentPoint.lon === 'undefined' || typeof nextPoint.lon === 'undefined') {
            console.warn('GPXParser: Invalid track points for interpolation at index:', index);
            return currentPoint || null;
        }

        // Linear interpolation with safe defaults
        return {
            lat: currentPoint.lat + (nextPoint.lat - currentPoint.lat) * fraction,
            lon: currentPoint.lon + (nextPoint.lon - currentPoint.lon) * fraction,
            elevation: (currentPoint.elevation || 0) + ((nextPoint.elevation || 0) - (currentPoint.elevation || 0)) * fraction,
            distance: (currentPoint.distance || 0) + ((nextPoint.distance || 0) - (currentPoint.distance || 0)) * fraction,
            speed: (currentPoint.speed || 0) + ((nextPoint.speed || 0) - (currentPoint.speed || 0)) * fraction,
            index: targetIndex
        };
    }

    // Get activity segments for triathlon or multi-sport activities
    detectActivitySegments() {
        if (this.trackPoints.length === 0) return [];

        const segments = [];
        let currentSegment = null;
        const speedThresholds = {
            swimming: 3, // km/h
            running: 15, // km/h
            cycling: 30  // km/h
        };

        this.trackPoints.forEach((point, index) => {
            let activity = 'running'; // default
            
            if (point.speed < speedThresholds.swimming) {
                activity = 'swimming';
            } else if (point.speed > speedThresholds.cycling) {
                activity = 'cycling';
            } else if (point.speed > speedThresholds.running) {
                activity = 'cycling';
            }

            if (!currentSegment || currentSegment.activity !== activity) {
                if (currentSegment) {
                    currentSegment.endIndex = index - 1;
                    const lastPoint = this.trackPoints[currentSegment.endIndex];
                    currentSegment.endDistance = lastPoint?.distance ?? currentSegment.startDistance;
                    currentSegment.endTime = lastPoint?.time ?? null;
                    currentSegment.pointCount = currentSegment.endIndex - currentSegment.startIndex + 1;
                    const segmentDistance = Math.max(0, (currentSegment.endDistance || 0) - (currentSegment.startDistance || 0));
                    currentSegment.distance = segmentDistance;
                    if (currentSegment.startTime && currentSegment.endTime) {
                        const durationMs = currentSegment.endTime - currentSegment.startTime;
                        const durationHours = durationMs > 0 ? durationMs / 1000 / 3600 : 0;
                        currentSegment.durationHours = durationHours;
                        currentSegment.avgSpeed = durationHours > 0 ? segmentDistance / durationHours : null;
                    } else {
                        currentSegment.durationHours = null;
                        currentSegment.avgSpeed = null;
                    }
                    segments.push(currentSegment);
                }
                
                currentSegment = {
                    activity,
                    startIndex: index,
                    startDistance: point.distance,
                    startTime: point.time || null,
                    pointCount: 1
                };
            } else {
                currentSegment.pointCount = (currentSegment.pointCount || 0) + 1;
            }

            if (currentSegment && !currentSegment.startTime && point.time) {
                currentSegment.startTime = point.time;
            }
        });

        if (currentSegment) {
            currentSegment.endIndex = this.trackPoints.length - 1;
            const lastPoint = this.trackPoints[currentSegment.endIndex];
            currentSegment.endDistance = lastPoint?.distance ?? currentSegment.startDistance;
            currentSegment.endTime = lastPoint?.time ?? null;
            currentSegment.pointCount = currentSegment.endIndex - currentSegment.startIndex + 1;
            const segmentDistance = Math.max(0, (currentSegment.endDistance || 0) - (currentSegment.startDistance || 0));
            currentSegment.distance = segmentDistance;
            if (currentSegment.startTime && currentSegment.endTime) {
                const durationMs = currentSegment.endTime - currentSegment.startTime;
                const durationHours = durationMs > 0 ? durationMs / 1000 / 3600 : 0;
                currentSegment.durationHours = durationHours;
                currentSegment.avgSpeed = durationHours > 0 ? segmentDistance / durationHours : null;
            } else {
                currentSegment.durationHours = null;
                currentSegment.avgSpeed = null;
            }
            segments.push(currentSegment);
        }

        return segments;
    }

    formatDuration(hours) {
        if (!hours || hours === 0) return '0:00';
        
        // Handle very small values (less than 1 minute)
        if (hours < 1/60) return '0:01';
        
        const totalMinutes = Math.floor(hours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        
        if (h === 0) {
            return `${m}:00`;
        }
        
        return `${h}:${m.toString().padStart(2, '0')}`;
    }

    formatDistance(km) {
        if (!km || km === 0) return '0.00 km';
        return `${km.toFixed(2)} km`;
    }

    formatSpeed(kmh) {
        if (!kmh || kmh === 0) return '0.0 km/h';
        return `${kmh.toFixed(1)} km/h`;
    }

    formatElevation(meters) {
        if (!meters || meters === 0) return '0 m';
        return `${Math.round(meters)} m`;
    }

    // Fill in missing speed data with estimates
    fillMissingSpeedData() {
        if (this.trackPoints.length === 0) return;

        // Get points with valid speed data
        const pointsWithSpeed = this.trackPoints.filter(p => p.speed && p.speed > 0);
        
        if (pointsWithSpeed.length === 0) {
            // No speed data at all - estimate based on distance and reasonable assumptions
            console.log('📊 No speed data available - using estimated speeds');
            this.estimateAllSpeeds();
            return;
        }

        // Calculate average speed from available data
        const avgSpeed = pointsWithSpeed.reduce((sum, p) => sum + p.speed, 0) / pointsWithSpeed.length;
        
        console.log(`📊 Filling missing speed data. Average speed: ${avgSpeed.toFixed(1)} km/h`);

        // Fill missing speeds with interpolation or average
        for (let i = 0; i < this.trackPoints.length; i++) {
            const point = this.trackPoints[i];
            
            if (!point.speed || point.speed === 0) {
                // Try to interpolate between nearest points with speed data
                const interpolatedSpeed = this.interpolateSpeed(i);
                point.speed = interpolatedSpeed || avgSpeed;
            }
        }

        // Final check
        const finalSpeedCount = this.trackPoints.filter(p => p.speed && p.speed > 0).length;
        console.log(`📊 Speed data filled: ${finalSpeedCount}/${this.trackPoints.length} points now have speed`);
    }

    // Estimate speeds for all points based on distance and reasonable assumptions
    estimateAllSpeeds() {
        // Estimate based on activity type - could be made smarter
        const baseSpeed = 8; // km/h - reasonable walking/hiking speed
        const speedVariation = 0.3; // 30% variation
        
        for (let i = 0; i < this.trackPoints.length; i++) {
            // Add some variation based on elevation changes
            const point = this.trackPoints[i];
            let speedMultiplier = 1.0;
            
            if (i > 0) {
                const prevPoint = this.trackPoints[i - 1];
                const elevationChange = (point.elevation || 0) - (prevPoint.elevation || 0);
                
                // Slower uphill, faster downhill
                if (elevationChange > 5) { // uphill
                    speedMultiplier = 0.7;
                } else if (elevationChange < -5) { // downhill
                    speedMultiplier = 1.3;
                }
            }
            
            // Add some random variation to make it look more realistic
            const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
            point.speed = baseSpeed * speedMultiplier * randomFactor;
        }
        
        console.log(`📊 Estimated speeds for all ${this.trackPoints.length} points`);
    }

    // Interpolate speed between nearest points with speed data
    interpolateSpeed(index) {
        // Find nearest points with speed data
        let prevIndex = -1, nextIndex = -1;
        
        // Look backwards
        for (let i = index - 1; i >= 0; i--) {
            if (this.trackPoints[i].speed && this.trackPoints[i].speed > 0) {
                prevIndex = i;
                break;
            }
        }
        
        // Look forwards
        for (let i = index + 1; i < this.trackPoints.length; i++) {
            if (this.trackPoints[i].speed && this.trackPoints[i].speed > 0) {
                nextIndex = i;
                break;
            }
        }
        
        // Interpolate if we have both neighbors
        if (prevIndex !== -1 && nextIndex !== -1) {
            const prevSpeed = this.trackPoints[prevIndex].speed;
            const nextSpeed = this.trackPoints[nextIndex].speed;
            const factor = (index - prevIndex) / (nextIndex - prevIndex);
            return prevSpeed + (nextSpeed - prevSpeed) * factor;
        }
        
        // Use single neighbor if available
        if (prevIndex !== -1) return this.trackPoints[prevIndex].speed;
        if (nextIndex !== -1) return this.trackPoints[nextIndex].speed;
        
        return null; // No neighbors found
    }
} 
