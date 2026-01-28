export class RoutingService {
    constructor() {
        // API keys - can be set manually or through configuration
        this.openRouteServiceApiKey = null; // Set this manually: routingService.openRouteServiceApiKey = 'your-key'
        this.mapboxApiKey = null; // Set this manually: routingService.mapboxApiKey = 'your-key'
        
        // Base URLs for different routing services
        this.endpoints = {
            openroute: {
                driving: 'https://api.openrouteservice.org/v2/directions/driving-car',
                walking: 'https://api.openrouteservice.org/v2/directions/foot-walking',
                cycling: 'https://api.openrouteservice.org/v2/directions/cycling-regular'
            },
            mapbox: {
                driving: 'https://api.mapbox.com/directions/v5/mapbox/driving',
                walking: 'https://api.mapbox.com/directions/v5/mapbox/walking',
                cycling: 'https://api.mapbox.com/directions/v5/mapbox/cycling'
            }
        };
    }

    // Main method to calculate route between two points
    async calculateRoute(startPoint, endPoint, mode = 'driving', options = {}) {
        console.log(`Calculating route from ${startPoint} to ${endPoint} using ${mode}`);
        
        try {
            // Try OpenRouteService public API first (free with rate limits)
            if (mode === 'driving' || mode === 'walking' || mode === 'cycling') {
                return await this.calculateOpenStreetMapRoute(startPoint, endPoint, mode, options);
            } else {
                // For other modes (boat, plane, train), use straight line with realistic timing
                return this.createRealisticRoute(startPoint, endPoint, mode);
            }
            
        } catch (error) {
            console.error('Error calculating route, using fallback:', error);
            // Fallback to realistic straight line route
            return this.createRealisticRoute(startPoint, endPoint, mode);
        }
    }

    // Free OpenStreetMap routing using OSRM (Open Source Routing Machine)
    async calculateOpenStreetMapRoute(startPoint, endPoint, mode, options) {
        // OSRM public instance (free but rate limited)
        const profile = mode === 'driving' ? 'car' : mode === 'cycling' ? 'bike' : 'foot';
        const coords = `${startPoint[0]},${startPoint[1]};${endPoint[0]},${endPoint[1]}`;
        
        // Use public OSRM instance
        const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;
        
        console.log('Fetching route from OSRM:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`OSRM API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.routes || data.routes.length === 0) {
            throw new Error('No route found');
        }

        const route = data.routes[0];
        
        return {
            coordinates: route.geometry.coordinates,
            distance: route.distance, // in meters
            duration: route.duration, // in seconds
            mode: mode,
            provider: 'osrm',
            legs: route.legs
        };
    }

    // OpenRouteService integration (requires API key)
    async calculateOpenRouteServiceRoute(startPoint, endPoint, mode, options) {
        if (!this.openRouteServiceApiKey) {
            throw new Error('OpenRouteService API key not configured');
        }

        const endpoint = this.endpoints.openroute[mode] || this.endpoints.openroute.driving;
        
        const requestBody = {
            coordinates: [startPoint, endPoint],
            format: 'geojson',
            instructions: false,
            geometry_simplify: true
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.openRouteServiceApiKey
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`OpenRouteService API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.features || data.features.length === 0) {
            throw new Error('No route found');
        }

        const route = data.features[0];
        
        return {
            coordinates: route.geometry.coordinates,
            distance: route.properties.segments[0].distance, // in meters
            duration: route.properties.segments[0].duration, // in seconds
            mode: mode,
            provider: 'openroute'
        };
    }

    // Mapbox Directions API integration (requires API key)
    async calculateMapboxRoute(startPoint, endPoint, mode, options) {
        if (!this.mapboxApiKey) {
            throw new Error('Mapbox API key not configured');
        }

        const profile = mode === 'driving' ? 'driving' : mode === 'cycling' ? 'cycling' : 'walking';
        const coordinates = `${startPoint[0]},${startPoint[1]};${endPoint[0]},${endPoint[1]}`;
        
        const url = `${this.endpoints.mapbox[mode]}/${coordinates}` +
                   `?access_token=${this.mapboxApiKey}&geometries=geojson&overview=full`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Mapbox API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.routes || data.routes.length === 0) {
            throw new Error('No route found');
        }

        const route = data.routes[0];
        
        return {
            coordinates: route.geometry.coordinates,
            distance: route.distance, // in meters
            duration: route.duration, // in seconds
            mode: mode,
            provider: 'mapbox'
        };
    }

    // Create realistic route with curves and proper timing
    createRealisticRoute(startPoint, endPoint, mode) {
        const distance = this.calculateDistance(startPoint, endPoint) * 1000; // convert to meters
        
        // More realistic speeds
        const speeds = {
            driving: 60,  // km/h (highway speed)
            walking: 5,   // km/h
            cycling: 20,  // km/h
            boat: 25,     // km/h
            plane: 450,   // km/h (commercial flight)
            train: 120,   // km/h (high-speed rail)
            car: 60       // alias for driving
        };
        
        const speed = speeds[mode] || speeds.driving;
        const duration = (distance / 1000) / speed * 3600; // in seconds
        
        // Generate curved route for more realistic appearance
        let coordinates;
        if (mode === 'plane') {
            // Planes can fly straight
            coordinates = [startPoint, endPoint];
        } else {
            // Generate curved route with waypoints for more realistic paths
            coordinates = this.generateCurvedRoute(startPoint, endPoint, mode);
        }
        
        return {
            coordinates: coordinates,
            distance: distance,
            duration: duration,
            mode: mode,
            provider: 'realistic-route'
        };
    }

    // Generate a curved route between two points
    generateCurvedRoute(startPoint, endPoint, mode) {
        const waypoints = [];
        const numSegments = Math.min(8, Math.max(3, Math.floor(this.calculateDistance(startPoint, endPoint) / 5))); // More segments for longer distances
        
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
            } else if (mode === 'walking' || mode === 'cycling') {
                curvature = 0.008; // Paths might wind a bit
            } else if (mode === 'train') {
                curvature = 0.003; // Trains follow rail lines with gentle curves
            }
            
            // Apply gentle S-curve
            const curveOffset = Math.sin(t * Math.PI) * curvature;
            const perpLat = -(endPoint[0] - startPoint[0]);
            const perpLng = endPoint[1] - startPoint[1];
            const perpLength = Math.sqrt(perpLat * perpLat + perpLng * perpLng);
            
            if (perpLength > 0) {
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

    // Calculate distance between two points using Haversine formula
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

    // Generate waypoints for smoother routes (useful for manual boat routes)
    generateWaypoints(startPoint, endPoint, numPoints = 5) {
        const waypoints = [startPoint];
        
        for (let i = 1; i < numPoints; i++) {
            const ratio = i / numPoints;
            const lat = startPoint[1] + (endPoint[1] - startPoint[1]) * ratio;
            const lng = startPoint[0] + (endPoint[0] - startPoint[0]) * ratio;
            waypoints.push([lng, lat]);
        }
        
        waypoints.push(endPoint);
        return waypoints;
    }

    // Validate if a route is possible (e.g., boat routes should avoid land)
    async validateRoute(coordinates, mode) {
        // This would integrate with terrain/water body data
        // For now, just return true
        return true;
    }

    // Get estimated travel time based on mode and distance
    getEstimatedTime(distance, mode) {
        const speeds = {
            driving: 50,
            walking: 5,
            cycling: 20,
            boat: 30,
            plane: 500,
            train: 80
        };
        
        const speed = speeds[mode] || speeds.driving;
        return (distance / 1000) / speed; // hours
    }

    // Format route for display
    formatRoute(route) {
        const distanceKm = route.distance / 1000;
        const durationHours = route.duration / 3600;
        const unitPreference = typeof localStorage !== 'undefined'
            ? localStorage.getItem('trailReplayUnits')
            : 'metric';
        const useImperial = unitPreference === 'imperial';
        const distanceDisplay = useImperial
            ? `${(distanceKm * 0.621371).toFixed(1)}mi`
            : (distanceKm < 1 ? `${route.distance.toFixed(0)}m` : `${distanceKm.toFixed(1)}km`);
        
        return {
            ...route,
            formattedDistance: distanceDisplay,
            formattedDuration: durationHours < 1 ?
                `${Math.round(route.duration / 60)}min` :
                `${durationHours.toFixed(1)}h`
        };
    }
}
