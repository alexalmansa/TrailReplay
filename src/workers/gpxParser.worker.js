import * as turf from '@turf/turf';

// Worker message handler
self.onmessage = async (e) => {
    const { type, payload } = e.data;

    if (type === 'PARSE_FILE') {
        try {
            const { content } = payload;
            const result = parseGPXContent(content);
            self.postMessage({ type: 'PARSE_SUCCESS', payload: result });
        } catch (error) {
            self.postMessage({ type: 'PARSE_ERROR', payload: error.message });
        }
    }
};

function parseGPXContent(content) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid GPX file format');
    }

    return extractTrackData(xmlDoc);
}

function extractTrackData(xmlDoc) {
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

    const trackPoints = [];
    let totalDistance = 0;
    let elevationGain = 0;
    let previousPoint = null;
    let startTime = null;
    let endTime = null;
    let minElevation = Infinity;
    let maxElevation = -Infinity;

    Array.from(trkpts).forEach((trkpt, index) => {
        const lat = parseFloat(trkpt.getAttribute('lat'));
        const lon = parseFloat(trkpt.getAttribute('lon'));

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return; // Skip invalid points
        }

        const eleElement = trkpt.querySelector('ele');
        const timeElement = trkpt.querySelector('time');

        // Extract heart rate data
        let heartRate = null;
        const hrElement = trkpt.querySelector('hr') || trkpt.querySelector('heartrate');
        const extensions = trkpt.querySelector('extensions');
        const hrElementExtensions = extensions ? (
            extensions.querySelector('hr') ||
            extensions.querySelector('heartrate') ||
            extensions.querySelector('gpxtpx\\:hr') ||
            extensions.querySelector('TrackPointExtension hr') ||
            extensions.querySelector('ns3\\:TrackPointExtension hr')
        ) : null;

        const finalHrElement = hrElement || hrElementExtensions;

        if (finalHrElement) {
            const hrValue = parseFloat(finalHrElement.textContent);
            if (!isNaN(hrValue) && hrValue > 0 && hrValue < 300) {
                heartRate = hrValue;
            }
        }

        const elevation = eleElement ? parseFloat(eleElement.textContent) : 0;
        const timeStr = timeElement ? timeElement.textContent : null;
        let time = null;

        if (timeStr) {
            try {
                time = new Date(timeStr);
                if (isNaN(time.getTime())) time = null;
            } catch (e) {
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
            speed: 0,
            heartRate
        };

        // Calculate distance from previous point
        if (previousPoint) {
            const distance = calculateDistance(
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
                point.speed = 0;
            }

            // Calculate elevation gain
            if (!isNaN(elevation) && !isNaN(previousPoint.elevation) && elevation > previousPoint.elevation) {
                elevationGain += elevation - previousPoint.elevation;
            }
        }

        trackPoints.push(point);
        previousPoint = point;

        // Update min/max elevation
        if (!isNaN(elevation)) {
            minElevation = Math.min(minElevation, elevation);
            maxElevation = Math.max(maxElevation, elevation);
        }
    });

    if (trackPoints.length === 0) {
        throw new Error('No valid track points found in GPX file');
    }

    // Process stats and missing data
    const pointsWithHeartRate = trackPoints.filter(p => p.heartRate && p.heartRate > 0);
    const hasHeartRateData = pointsWithHeartRate.length > 0;
    let avgHeartRate = 0;
    let minHeartRate = null;
    let maxHeartRate = null;

    if (hasHeartRateData) {
        const heartRates = pointsWithHeartRate.map(p => p.heartRate);
        avgHeartRate = heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length;
        minHeartRate = Math.min(...heartRates);
        maxHeartRate = Math.max(...heartRates);
    }

    let duration = startTime && endTime ? (endTime - startTime) / 1000 / 3600 : 0; // hours

    // Fill missing speed data
    fillMissingSpeedData(trackPoints);

    if (duration === 0 && totalDistance > 0) {
        const estimatedSpeed = 5; // km/h
        duration = totalDistance / estimatedSpeed;
    }

    const avgSpeed = duration > 0 ? totalDistance / duration : 0;

    const stats = {
        totalDistance,
        totalDuration: duration,
        elevationGain,
        avgSpeed,
        minElevation: minElevation === Infinity ? 0 : minElevation,
        maxElevation: maxElevation === -Infinity ? 0 : maxElevation,
        startTime,
        endTime,
        hasTimeData: !!(startTime && endTime),
        hasHeartRateData,
        avgHeartRate: Math.round(avgHeartRate),
        minHeartRate,
        maxHeartRate,
        heartRateDataPoints: pointsWithHeartRate.length
    };

    const activitySegments = detectActivitySegments(trackPoints);

    return {
        trackPoints,
        stats,
        bounds: calculateBounds(trackPoints),
        activitySegments
    };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function calculateBounds(trackPoints) {
    if (trackPoints.length === 0) return null;

    const validPoints = trackPoints.filter(p => !isNaN(p.lat) && !isNaN(p.lon));

    if (validPoints.length === 0) return null;

    const lats = validPoints.map(p => p.lat);
    const lons = validPoints.map(p => p.lon);

    const north = Math.max(...lats);
    const south = Math.min(...lats);
    const east = Math.max(...lons);
    const west = Math.min(...lons);

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

function fillMissingSpeedData(trackPoints) {
    if (trackPoints.length === 0) return;

    const pointsWithSpeed = trackPoints.filter(p => p.speed && p.speed > 0);

    if (pointsWithSpeed.length === 0) {
        estimateAllSpeeds(trackPoints);
        return;
    }

    const avgSpeed = pointsWithSpeed.reduce((sum, p) => sum + p.speed, 0) / pointsWithSpeed.length;

    for (let i = 0; i < trackPoints.length; i++) {
        const point = trackPoints[i];

        if (!point.speed || point.speed === 0) {
            const interpolatedSpeed = interpolateSpeed(trackPoints, i);
            point.speed = interpolatedSpeed || avgSpeed;
        }
    }
}

function estimateAllSpeeds(trackPoints) {
    const baseSpeed = 8;

    for (let i = 0; i < trackPoints.length; i++) {
        const point = trackPoints[i];
        let speedMultiplier = 1.0;

        if (i > 0) {
            const prevPoint = trackPoints[i - 1];
            const elevationChange = (point.elevation || 0) - (prevPoint.elevation || 0);

            if (elevationChange > 5) {
                speedMultiplier = 0.7;
            } else if (elevationChange < -5) {
                speedMultiplier = 1.3;
            }
        }

        const randomFactor = 0.8 + (Math.random() * 0.4);
        point.speed = baseSpeed * speedMultiplier * randomFactor;
    }
}

function interpolateSpeed(trackPoints, index) {
    let prevIndex = -1, nextIndex = -1;

    for (let i = index - 1; i >= 0; i--) {
        if (trackPoints[i].speed && trackPoints[i].speed > 0) {
            prevIndex = i;
            break;
        }
    }

    for (let i = index + 1; i < trackPoints.length; i++) {
        if (trackPoints[i].speed && trackPoints[i].speed > 0) {
            nextIndex = i;
            break;
        }
    }

    if (prevIndex !== -1 && nextIndex !== -1) {
        const prevSpeed = trackPoints[prevIndex].speed;
        const nextSpeed = trackPoints[nextIndex].speed;
        const factor = (index - prevIndex) / (nextIndex - prevIndex);
        return prevSpeed + (nextSpeed - prevSpeed) * factor;
    }

    if (prevIndex !== -1) return trackPoints[prevIndex].speed;
    if (nextIndex !== -1) return trackPoints[nextIndex].speed;

    return null;
}

function detectActivitySegments(trackPoints) {
    if (trackPoints.length === 0) return [];

    const segments = [];
    let currentSegment = null;
    const speedThresholds = {
        swimming: 3,
        running: 15,
        cycling: 30
    };

    trackPoints.forEach((point, index) => {
        let activity = 'running';

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
                const lastPoint = trackPoints[currentSegment.endIndex];
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
        currentSegment.endIndex = trackPoints.length - 1;
        const lastPoint = trackPoints[currentSegment.endIndex];
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
