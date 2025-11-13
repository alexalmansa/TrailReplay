import { heartRateColorMapper } from '../utils/heartRateColors.js';

export class UIMapController {
    constructor(renderer) {
        this.renderer = renderer;
    }

    setPathColor(color) {
        this.renderer.pathColor = color;
        
        if (this.renderer.map.loaded()) {
            this.renderer.map.setPaintProperty('trail-line', 'line-color', color);
            this.renderer.map.setPaintProperty('trail-completed', 'line-color', color);
            this.renderer.map.setPaintProperty('current-position-glow', 'circle-color', color);
            if (this.renderer.map.getLayer('main-track-label')) {
                this.renderer.map.setPaintProperty('main-track-label', 'text-color', color);
            }
        }
        
        const progressPath = document.getElementById('progressPath');
        if (progressPath) {
            progressPath.setAttribute('stroke', color);
        }
        
        this.renderer.updateElevationGradient(color);
    }

    setMarkerSize(size) {
        this.renderer.markerSize = size;
        
        if (this.renderer.map.loaded()) {
            this.renderer.map.setPaintProperty('current-position-glow', 'circle-radius', 15 * size);
            if (this.renderer.map.getLayer('activity-icon') && this.renderer.showMarker) {
                this.renderer.map.setLayoutProperty('activity-icon', 'icon-size', size);
            }
            this.renderer.updateActivityIcon();
        }
    }

    setAutoZoom(enabled) {
        this.renderer.autoZoom = enabled;
    }

    setShowCircle(enabled) {
        this.renderer.showCircle = enabled;
        
        if (this.renderer.map && this.renderer.map.loaded()) {
            this.renderer.updateActivityIcon();
        }
    }

    setShowMarker(enabled) {
        this.renderer.showMarker = enabled;
        
        if (this.renderer.map && this.renderer.map.loaded()) {
            this.renderer.updateMarkerVisibility();
        }
        
        this.renderer.updateMarkerDependentControls(enabled);
    }

    setShowEndStats(enabled) {
        this.renderer.showEndStats = enabled;
    }

    setAnimationSpeed(speed) {
        this.renderer.animationSpeed = speed;
    }

    setActivityType(activityType) {
        this.renderer.currentActivityType = activityType;
        this.renderer.currentIcon = this.renderer.getBaseIcon();
        
        if (this.renderer.map && this.renderer.map.loaded()) {
            this.renderer.updateActivityIcon();
        }
    }

    setCurrentIcon(icon) {
        this.renderer.currentIcon = icon;
        
        if (!this.renderer.isAnimating) {
            this.renderer.userSelectedBaseIcon = icon;
        }
        
        if (this.renderer.map && this.renderer.map.loaded()) {
            this.renderer.updateActivityIcon();
        }
        
        const iconUpdateEvent = new CustomEvent('currentIconUpdated', {
            detail: { icon }
        });
        document.dispatchEvent(iconUpdateEvent);
    }

    clearUserBaseIcon() {
        this.renderer.userSelectedBaseIcon = null;
        const activityIcon = this.renderer.getBaseIcon();
        this.renderer.setCurrentIcon(activityIcon);
    }

    setColorMode(mode) {
        this.renderer.colorMode = mode;

        if (mode === 'heartRate') {
            this.renderer.generateHeartRateColors();
            if (this.renderer.heartRateColors && this.renderer.heartRateColors.length > 0) {
                this.renderer.updateTrailWithHeartRateColors();
            }
            
            // If animating, update trail-line opacity to show heart rate colors
            if (this.renderer.isAnimating && this.renderer.map.getLayer('trail-line')) {
                this.renderer.map.setPaintProperty('trail-line', 'line-opacity', 0.3);
            }
        } else {
            this.renderer.updateMapColors();
            
            // If animating, hide trail-line in fixed color mode
            if (this.renderer.isAnimating && this.renderer.map.getLayer('trail-line')) {
                this.renderer.map.setPaintProperty('trail-line', 'line-opacity', 0);
            }
        }
    }

    updateHeartRateZones() {
        const zones = heartRateColorMapper.getZonesFromUI();
        if (zones.length > 0) {
            heartRateColorMapper.setZones(zones);
            
            if (this.renderer.colorMode === 'heartRate') {
                this.renderer.generateHeartRateColors();
                if (this.renderer.heartRateColors && this.renderer.heartRateColors.length > 0) {
                    this.renderer.updateTrailWithHeartRateColors();
                }
            }
        }
    }
}
