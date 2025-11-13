
export class StatsController {
    constructor(mapRenderer) {
        this.mapRenderer = mapRenderer;
        this.map = mapRenderer.map;
        this.showEndStats = true;
    }

    triggerStatsEndAnimation() {
        const overlay = document.getElementById('liveStatsOverlay');
        if (!overlay || !this.showEndStats) {
            return;
        }

        // Populate final stats with selected values
        this.populateFinalStats();

        // Use the new layout detection function
        this.mapRenderer.detectAndSetMapLayout();

        const liveSpeedSegments = document.getElementById('liveSpeedSegments');
        if (liveSpeedSegments) {
            liveSpeedSegments.style.display = 'none';
        }

        const liveSpeedItem = document.getElementById('liveSpeedItem');
        if (liveSpeedItem) {
            liveSpeedItem.style.display = 'none';
        }

        // Add the end animation class to trigger the CSS transition
        overlay.classList.add('end-animation');

        // Remove the animation after 10 seconds to return to normal state
        setTimeout(() => {
            overlay.classList.remove('end-animation', 'mobile-layout', 'square-layout', 'horizontal-layout', 'with-speed');
        }, 10000);
    }

    populateFinalStats() {
        // Get selected stats from the app
        const selectedStats = this.mapRenderer.app.getSelectedEndStats ? this.mapRenderer.app.getSelectedEndStats() : ['distance', 'elevation'];
        console.log('populateFinalStats - selectedStats:', selectedStats);

        // Get the final stat elements
        const finalStatsElements = {
            distance: document.getElementById('finalDistance'),
            elevation: document.getElementById('finalElevation'),
            duration: document.getElementById('finalDuration'),
            speed: document.getElementById('finalSpeed'),
            pace: document.getElementById('finalPace'),
            maxelevation: document.getElementById('finalMaxElevation'),
            minelevation: document.getElementById('finalMinElevation')
        };

        // Get source elements
        const sourceElements = {
            distance: document.getElementById('totalDistance'),
            elevation: document.getElementById('elevationGain'),
            duration: document.getElementById('duration'),
            speed: document.getElementById('averageSpeed'),
            pace: document.getElementById('averagePace'),
            maxelevation: document.getElementById('maxElevation'),
            minelevation: document.getElementById('minElevation')
        };

        // Hide all final stat boxes first
        const allBoxes = document.querySelectorAll('.final-stat-box');
        allBoxes.forEach(box => {
            box.style.display = 'none';
        });

        // Show and populate only selected stats
        selectedStats.forEach(statKey => {
            const finalElement = finalStatsElements[statKey];
            const sourceElement = sourceElements[statKey];
            const box = document.querySelector(`.final-stat-box[data-stat="${statKey}"]`);

            if (finalElement && sourceElement && box) {
                finalElement.textContent = sourceElement.textContent;
                box.style.display = 'block';
            }
        });
    }

    resetStatsEndAnimation() {
        const overlay = document.getElementById('liveStatsOverlay');
        if (!overlay) return;

        // Remove the end animation class and layout classes to return to normal state
        overlay.classList.remove('end-animation', 'mobile-layout', 'square-layout', 'horizontal-layout', 'with-speed');

        // Hide final stats content when animation ends
        const finalStatsContent = overlay.querySelector('.final-stats-content');
        if (finalStatsContent) {
            finalStatsContent.style.display = 'none';
        }
    }

    getCurrentDistance() {
        if (!this.mapRenderer.gpxParser || !this.mapRenderer.trackData) return 0;
        
        const currentPoint = this.mapRenderer.gpxParser.getInterpolatedPoint(this.mapRenderer.animationProgress);
        return currentPoint ? currentPoint.distance : 0;
    }

    getCurrentElevation() {
        if (!this.mapRenderer.gpxParser || !this.mapRenderer.trackData) return 0;
        
        const currentPoint = this.mapRenderer.gpxParser.getInterpolatedPoint(this.mapRenderer.animationProgress);
        return currentPoint ? currentPoint.elevation : 0;
    }

    getCurrentSpeed() {
        if (!this.mapRenderer.gpxParser || !this.mapRenderer.trackData) return 0;
        
        const currentPoint = this.mapRenderer.gpxParser.getInterpolatedPoint(this.mapRenderer.animationProgress);
        return currentPoint ? currentPoint.speed : 0;
    }

    getElevationData() {
        if (!this.mapRenderer.trackData || !this.mapRenderer.trackData.trackPoints) return [];
        
        return this.mapRenderer.trackData.trackPoints.map(point => point.elevation || 0);
    }
}
