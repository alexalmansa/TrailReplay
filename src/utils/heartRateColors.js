/**
 * Heart Rate Color Mapping Utility
 * Maps heart rate values to colors based on user-defined zones
 */

export class HeartRateColorMapper {
    constructor() {
        // Default heart rate zones (can be overridden by user)
        this.zones = [
            { min: 50, max: 120, color: '#4CAF50', name: 'Zone 1 (Recovery)' },      // Green
            { min: 121, max: 140, color: '#8BC34A', name: 'Zone 2 (Base)' },        // Light Green  
            { min: 141, max: 160, color: '#FFC107', name: 'Zone 3 (Aerobic)' },     // Yellow
            { min: 161, max: 180, color: '#FF9800', name: 'Zone 4 (Threshold)' },   // Orange
            { min: 181, max: 220, color: '#F44336', name: 'Zone 5 (Anaerobic)' }    // Red
        ];
        
        this.fallbackColor = '#808080'; // Gray for no data or out of range
    }

    /**
     * Set custom heart rate zones
     * @param {Array} zones - Array of zone objects with min, max, color properties
     */
    setZones(zones) {
        if (!Array.isArray(zones) || zones.length === 0) {
            console.warn('Invalid zones provided, using defaults');
            return;
        }

        // Validate zones
        const validZones = zones.filter(zone => 
            zone.min && zone.max && zone.color && 
            zone.min < zone.max && 
            zone.min >= 40 && zone.max <= 300
        );

        if (validZones.length === 0) {
            console.warn('No valid zones provided, using defaults');
            return;
        }

        this.zones = validZones.sort((a, b) => a.min - b.min);
        console.log('💓 Heart rate zones updated:', this.zones);
    }

    /**
     * Get zones from UI inputs
     */
    getZonesFromUI() {
        const zones = [];
        
        for (let i = 1; i <= 5; i++) {
            const minInput = document.getElementById(`zone${i}Min`);
            const maxInput = document.getElementById(`zone${i}Max`);
            
            if (minInput && maxInput && minInput.value && maxInput.value) {
                const min = parseInt(minInput.value);
                const max = parseInt(maxInput.value);
                
                if (!isNaN(min) && !isNaN(max) && min < max) {
                    const colors = ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336'];
                    zones.push({
                        min: min,
                        max: max,
                        color: colors[i - 1],
                        name: `Zone ${i}`
                    });
                }
            }
        }
        
        return zones;
    }

    /**
     * Get color for a specific heart rate value
     * @param {number} heartRate - Heart rate in BPM
     * @returns {string} - Hex color code
     */
    getColorForHeartRate(heartRate) {
        if (!heartRate || heartRate <= 0) {
            return this.fallbackColor;
        }

        // Find the zone that contains this heart rate
        const zone = this.zones.find(z => heartRate >= z.min && heartRate <= z.max);
        
        if (zone) {
            return zone.color;
        }

        // If heart rate is below all zones, use first zone color with reduced opacity
        if (heartRate < this.zones[0].min) {
            return this.zones[0].color;
        }

        // If heart rate is above all zones, use last zone color
        if (heartRate > this.zones[this.zones.length - 1].max) {
            return this.zones[this.zones.length - 1].color;
        }

        return this.fallbackColor;
    }

    /**
     * Get zone information for a specific heart rate
     * @param {number} heartRate - Heart rate in BPM
     * @returns {object} - Zone object with name, color, min, max
     */
    getZoneForHeartRate(heartRate) {
        if (!heartRate || heartRate <= 0) {
            return { name: 'No Data', color: this.fallbackColor, min: 0, max: 0 };
        }

        const zone = this.zones.find(z => heartRate >= z.min && heartRate <= z.max);
        
        if (zone) {
            return zone;
        }

        // Handle out of range values
        if (heartRate < this.zones[0].min) {
            return { ...this.zones[0], name: 'Below Zone 1' };
        }

        if (heartRate > this.zones[this.zones.length - 1].max) {
            return { ...this.zones[this.zones.length - 1], name: 'Above Zone 5' };
        }

        return { name: 'Unknown', color: this.fallbackColor, min: 0, max: 0 };
    }

    /**
     * Generate colors for an array of track points
     * @param {Array} trackPoints - Array of track points with heartRate property
     * @returns {Array} - Array of color strings matching track points
     */
    generateColorsForTrack(trackPoints) {
        if (!Array.isArray(trackPoints)) {
            return [];
        }

        console.log('💓 Generating colors for', trackPoints.length, 'track points');

        const colors = trackPoints.map(point => this.getColorForHeartRate(point.heartRate));

        console.log('💓 Generated', colors.length, 'colors');
        console.log('💓 Sample colors:', colors.slice(0, 10));
        console.log('💓 Color distribution:', this.analyzeColorDistribution(colors));

        return colors;
    }

    /**
     * Analyze color distribution in the generated colors
     */
    analyzeColorDistribution(colors) {
        const distribution = {};
        colors.forEach(color => {
            distribution[color] = (distribution[color] || 0) + 1;
        });
        return distribution;
    }

    /**
     * Check if heart rate data is available in track points
     * @param {Array} trackPoints - Array of track points
     * @returns {object} - Statistics about heart rate data availability
     */
    analyzeHeartRateData(trackPoints) {
        if (!Array.isArray(trackPoints) || trackPoints.length === 0) {
            return { hasData: false, pointsWithData: 0, totalPoints: 0, coverage: 0 };
        }

        const pointsWithHeartRate = trackPoints.filter(p => p.heartRate && p.heartRate > 0);
        const coverage = (pointsWithHeartRate.length / trackPoints.length) * 100;

        return {
            hasData: pointsWithHeartRate.length > 0,
            pointsWithData: pointsWithHeartRate.length,
            totalPoints: trackPoints.length,
            coverage: Math.round(coverage),
            minHeartRate: pointsWithHeartRate.length > 0 ? Math.min(...pointsWithHeartRate.map(p => p.heartRate)) : 0,
            maxHeartRate: pointsWithHeartRate.length > 0 ? Math.max(...pointsWithHeartRate.map(p => p.heartRate)) : 0,
            avgHeartRate: pointsWithHeartRate.length > 0 ? 
                         Math.round(pointsWithHeartRate.reduce((sum, p) => sum + p.heartRate, 0) / pointsWithHeartRate.length) : 0
        };
    }

    /**
     * Generate a gradient for visualization
     * @returns {string} - CSS linear gradient string
     */
    generateZoneGradient() {
        const colors = this.zones.map(zone => zone.color);
        return `linear-gradient(90deg, ${colors.join(', ')})`;
    }

    /**
     * Get default zone values for UI initialization
     */
    getDefaultZoneValues() {
        return {
            zone1Min: 50, zone1Max: 120,
            zone2Min: 121, zone2Max: 140,
            zone3Min: 141, zone3Max: 160,
            zone4Min: 161, zone4Max: 180,
            zone5Min: 181, zone5Max: 220
        };
    }
}

// Export singleton instance
export const heartRateColorMapper = new HeartRateColorMapper();
