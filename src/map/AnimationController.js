export class AnimationController {
    constructor(renderer) {
        this.renderer = renderer;
    }

    async startAnimation() {
        if (!this.renderer.trackData || this.renderer.isAnimating || !this.renderer.segmentTimings) {
            return;
        }

        if (this.renderer.map && typeof this.renderer.map.loaded === 'function' && !this.renderer.map.loaded()) {
            try {
                await new Promise((resolve) => {
                    const onIdle = () => resolve();
                    this.renderer.map.once('idle', onIdle);
                });
            } catch (_) {}
        }
        
        if (this.renderer.segmentTimings && this.renderer.segmentTimings.totalDuration && this.renderer.journeyElapsedTime === 0) {
            this.renderer.journeyElapsedTime = this.renderer.animationProgress * this.renderer.segmentTimings.totalDuration;
        }
        
        if (this.renderer.pictureAnnotations && this.renderer.pictureAnnotations.resetTriggeredStates) {
            this.renderer.pictureAnnotations.resetTriggeredStates();
        }
        
        if (this.renderer.cameraMode === 'followBehind' && this.renderer.followBehindCamera.shouldTriggerCinematic() && this.renderer.animationProgress <= 0.05) {
            this.renderer.followBehindCamera.setCinematicStart(false);

            if (this.renderer.followBehindCamera.isVideoExport) {
                await this.renderer.followBehindCamera.startCinematicSequenceForVideoExport();
            } else {
                await this.renderer.followBehindCamera.startCinematicSequence();
            }
        }
        
        this.renderer.isAnimating = true;
        
        // In heart rate mode, keep trail-line visible with reduced opacity to show heart rate colors
        // In fixed color mode, hide trail-line and show only trail-completed
        if (this.renderer.map.getLayer('trail-line')) {
            if (this.renderer.colorMode === 'heartRate') {
                // Keep trail-line visible in heart rate mode so users can see the full colored trail
                this.renderer.map.setPaintProperty('trail-line', 'line-opacity', 0.3);
            } else {
                // Hide trail-line in fixed color mode
                this.renderer.map.setPaintProperty('trail-line', 'line-opacity', 0);
            }
        }
        if (this.renderer.map.getLayer('comparison-trail-line')) {
            this.renderer.map.setPaintProperty('comparison-trail-line', 'line-opacity', 0);
        }
        
        // Ensure trail-completed layer is visible to show traversed path
        if (this.renderer.map.getLayer('trail-completed')) {
            this.renderer.map.setPaintProperty('trail-completed', 'line-opacity', 1.0);
        }
        
        this.renderer.applyOverlapLineVisibilityDuringAnimation(true);
        
        if (this.renderer.cameraMode === 'followBehind') {
            this.renderer.disableMapInteractions();
        }
        this.renderer.lastAnimationTime = 0;
        this.renderer.updateCurrentPosition();
        this.animate();
    }

    animate() {
        if (!this.renderer.isAnimating || !this.renderer.segmentTimings) return;

        const currentTime = performance.now();
        if (this.renderer.lastAnimationTime === 0) {
            this.renderer.lastAnimationTime = currentTime;
        }
        
        const deltaTime = (currentTime - this.renderer.lastAnimationTime) / 1000;
        this.renderer.lastAnimationTime = currentTime;

        const timeIncrement = deltaTime * this.renderer.animationSpeed;
        this.renderer.journeyElapsedTime += timeIncrement;

        let globalProgress = 0;
        if (this.renderer.segmentTimings.segments && this.renderer.segmentTimings.segments.length > 0) {
            const { segmentIndex, segmentProgress } = this.renderer.getSegmentAndLocalProgress(this.renderer.journeyElapsedTime);
            const seg = this.renderer.segmentTimings.segments[segmentIndex];
            if (this.renderer.trackData && this.renderer.trackData.trackPoints && typeof seg.startIndex === 'number' && typeof seg.endIndex === 'number') {
                const segStart = seg.startIndex;
                const segEnd = seg.endIndex;
                const segLength = segEnd - segStart;
                globalProgress = (segStart + segmentProgress * segLength) / (this.renderer.trackData.trackPoints.length - 1);
            } else {
                globalProgress = Math.min(this.renderer.journeyElapsedTime / this.renderer.segmentTimings.totalDuration, 1);
            }
        } else if (this.renderer.segmentTimings.totalDuration > 0) {
            globalProgress = Math.min(this.renderer.journeyElapsedTime / this.renderer.segmentTimings.totalDuration, 1);
        }
        this.renderer.animationProgress = globalProgress;

        if (this.renderer.journeyElapsedTime >= this.renderer.segmentTimings.totalDuration) {
            this.renderer.animationProgress = 1;
            this.renderer.journeyElapsedTime = this.renderer.segmentTimings.totalDuration;
            this.renderer.isAnimating = false;
            
            if (this.renderer.map.getLayer('trail-line')) {
                // Restore trail-line opacity based on color mode
                if (this.renderer.colorMode === 'heartRate') {
                    // In heart rate mode, keep it visible with full opacity
                    this.renderer.map.setPaintProperty('trail-line', 'line-opacity', 0.8);
                } else {
                    // In fixed color mode, restore normal opacity
                    this.renderer.map.setPaintProperty('trail-line', 'line-opacity', [
                        'case',
                        ['==', ['get', 'isTransportation'], true], 0.9,
                        0.8
                    ]);
                }
            }
            if (this.renderer.map.getLayer('comparison-trail-line')) {
                this.renderer.map.setPaintProperty('comparison-trail-line', 'line-opacity', 0.8);
            }
            this.renderer.applyOverlapLineVisibilityDuringAnimation(false);
            
            this.renderer.triggerStatsEndAnimation();
            
            if (this.renderer.cameraMode === 'followBehind') {
                setTimeout(() => {
                    this.renderer.followBehindCamera.zoomOutToWholeTrack();
                }, this.renderer.followBehindCamera.getZoomOutDelay());
            }
        }

        this.renderer.updateCurrentPosition();

        if (this.renderer.cameraMode === 'followBehind' && this.renderer.autoZoom && this.renderer.trackData && this.renderer.gpxParser) {
            const lookAheadSeconds = 2;
            const totalDuration = this.renderer.segmentTimings.totalDuration || 1;
            const lookAheadTime = Math.min(this.renderer.journeyElapsedTime + lookAheadSeconds, totalDuration);
            let lookAheadProgress = 0;
            if (this.renderer.segmentTimings.segments && this.renderer.segmentTimings.segments.length > 0) {
                const { segmentIndex, segmentProgress } = this.renderer.getSegmentAndLocalProgress(lookAheadTime);
                const seg = this.renderer.segmentTimings.segments[segmentIndex];
                if (this.renderer.trackData && this.renderer.trackData.trackPoints && typeof seg.startIndex === 'number' && typeof seg.endIndex === 'number') {
                    const segStart = seg.startIndex;
                    const segEnd = seg.endIndex;
                    const segLength = segEnd - segStart;
                    lookAheadProgress = (segStart + segmentProgress * segLength) / (this.renderer.trackData.trackPoints.length - 1);
                } else {
                    lookAheadProgress = lookAheadTime / totalDuration;
                }
            } else {
                lookAheadProgress = lookAheadTime / totalDuration;
            }
            const lookAheadPoint = this.renderer.gpxParser.getInterpolatedPoint(lookAheadProgress);
            let lookAheadZoom = 14; // Default
            if (typeof this.renderer.followBehindCamera?.getCurrentPresetSettings === 'function') {
                lookAheadZoom = this.renderer.followBehindCamera.getCurrentPresetSettings().ZOOM || 14;
            }
            if (lookAheadPoint && lookAheadPoint.lat && lookAheadPoint.lon) {
                const pitch = this.renderer.map.getPitch ? this.renderer.map.getPitch() : 0;
                const bufferScale = 1.25 + Math.min(pitch, 60) / 120; // widen with pitch
                this.renderer.preloadTilesAtPosition(lookAheadPoint.lat, lookAheadPoint.lon, Math.round(lookAheadZoom), this.renderer.currentMapStyle, { bufferScale });
            }
        }

        if (this.renderer.isAnimating) {
            requestAnimationFrame(() => this.animate());
        }
    }

    stopAnimation() {
        this.renderer.isAnimating = false;
        
        if (this.renderer.map.getLayer('trail-line')) {
            // Restore trail-line opacity based on color mode
            if (this.renderer.colorMode === 'heartRate') {
                // In heart rate mode, keep it visible with full opacity
                this.renderer.map.setPaintProperty('trail-line', 'line-opacity', 0.8);
            } else {
                // In fixed color mode, restore normal opacity
                this.renderer.map.setPaintProperty('trail-line', 'line-opacity', [
                    'case',
                    ['==', ['get', 'isTransportation'], true], 0.9,
                    0.8
                ]);
            }
        }
        if (this.renderer.map.getLayer('comparison-trail-line')) {
            this.renderer.map.setPaintProperty('comparison-trail-line', 'line-opacity', 0.8);
        }
        this.renderer.applyOverlapLineVisibilityDuringAnimation(false);
        
        if (this.renderer.cameraMode === 'followBehind') {
            this.renderer.enableZoomOnlyInteractions();
        }
    }

    resetAnimation() {
        this.renderer.isAnimating = false;
        this.renderer.animationProgress = 0;
        this.renderer.currentSegmentIndex = 0;
        this.renderer.segmentProgress = 0;
        this.renderer.lastAnimationTime = 0;
        this.renderer.journeyElapsedTime = 0;
        this.renderer.annotations.hideActiveAnnotation();
        
        if (this.renderer.pictureAnnotations && this.renderer.pictureAnnotations.resetTriggeredStates) {
            this.renderer.pictureAnnotations.resetTriggeredStates();
        }
        
        this.renderer.resetStatsEndAnimation();
        
        this.renderer.followBehindCamera.setCinematicStart(true);
        
        if (this.renderer.map.getLayer('trail-line')) {
            // Restore trail-line opacity based on color mode
            if (this.renderer.colorMode === 'heartRate') {
                // In heart rate mode, keep it visible with full opacity
                this.renderer.map.setPaintProperty('trail-line', 'line-opacity', 0.8);
            } else {
                // In fixed color mode, restore normal opacity
                this.renderer.map.setPaintProperty('trail-line', 'line-opacity', [
                    'case',
                    ['==', ['get', 'isTransportation'], true], 0.9,
                    0.8
                ]);
            }
        }
        if (this.renderer.map.getLayer('comparison-trail-line')) {
            this.renderer.map.setPaintProperty('comparison-trail-line', 'line-opacity', 0.8);
        }
        this.renderer.applyOverlapLineVisibilityDuringAnimation(false);
        
        this.updateCurrentPosition();
        
        if (this.renderer.cameraMode === 'followBehind') {
            setTimeout(() => {
                this.renderer.followBehindCamera.setStartingPosition(true);
            }, 100);
        }
    }

    updateCurrentPosition() {
        if (!this.renderer.trackData) return;

        const currentPoint = this.renderer.gpxParser.getInterpolatedPoint(this.renderer.animationProgress);
        if (!currentPoint) return;

        const { lat, lon, elevation, speed, distance } = currentPoint;

        if (this.renderer.map.getSource('current-position')) {
            this.renderer.map.getSource('current-position').setData({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lon, lat]
                },
                properties: {
                    elevation,
                    speed,
                    distance
                }
            });
        }

        console.log('AnimationController gpxParser:', this.renderer.gpxParser);
        const completedCoordinates = this.renderer.gpxParser.getTrackPointsToProgress(this.renderer.animationProgress, currentPoint);
        if (this.renderer.map.getSource('trail-completed')) {
            this.renderer.map.getSource('trail-completed').setData({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: completedCoordinates
                }
            });
        }

        if (this.renderer.colorMode === 'heartRate') {
            this.renderer.updateCompletedTrailWithHeartRateAnimation(currentPoint);
        }

        if (this.renderer.autoZoom) {
            if (this.renderer.cameraMode === 'followBehind') {
                this.renderer.followBehindCamera.updateCameraPosition();
            } else {
                let centerPoint = currentPoint;
                if (this.renderer.comparisonMode) {
                    centerPoint = this.renderer.calculateDualMarkerCenter(currentPoint);
                }
                this.renderer.map.panTo([centerPoint.lon, centerPoint.lat]);
            }
        }

        if (this.renderer.comparisonMode) {
            this.renderer.updateComparisonPosition();
        }

        if (this.renderer.additionalComparisons) {
            this.renderer.updateAdditionalComparisons();
        }

        this.renderer.iconChanges.checkIconChanges(this.renderer.animationProgress);
        this.renderer.annotations.checkAnnotations(this.renderer.animationProgress);
        this.renderer.pictureAnnotations.checkAnnotations(this.renderer.animationProgress);
    }
}
