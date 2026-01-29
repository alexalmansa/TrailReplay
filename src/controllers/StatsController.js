import { t } from '../translations.js';
import { ACTIVITY_ICONS } from '../utils/constants.js';
import { getUnitLabels, formatDistance as formatDistanceUnits } from '../utils/units.js';

export class StatsController {
    constructor(app) {
        this.app = app;
        this.lastStatsUpdate = 0;

        this._elevationDataChecked = false;
        this.segmentSpeedElements = null;
        this.liveSpeedElement = null;
        this.liveSpeedItem = null;
        this.speedOverlayElements = null;
        this.kilometerSegments = [];
        this.lastOverlayDistance = 0;
        this.lastLiveSpeedValue = 0;
        this.liveSpeedLabel = null;
        this.lastActiveSegmentIndex = null;
        this.mapLayoutUpdateScheduled = false;
    }

    initialize() {
        // Initialize stats display
        this.resetLiveStats();
        this.resetStats();

        this.updateSegmentSpeedVisibility(this.app.state.showSegmentSpeeds);
    }

    // Update the static stats section when a track is loaded
    updateStats(stats) {
        if (!stats) return;

        this.kilometerSegments = [];

        // For journeys, use the aggregated stats directly (they've already been calculated)
        // For single tracks, recalculate from trackPoints if available
        if (!this.app.currentTrackData?.isJourney) {
            this.recalculateStatsFromTrackPoints(stats);
        }

        // Ensure we have valid stats for all fields
        this.ensureCompleteStats(stats);



        // Format and update the display values
        const distanceText = this.app.formatDistance(stats.totalDistance);
        const elevationText = this.app.formatElevation(stats.elevationGain);
        const durationText = this.formatDurationMinutes(stats.totalDuration);
        const speedText = this.formatSpeed(stats.avgSpeed);
        const paceText = this.formatPaceValue(stats.avgPace); // Use avgPace directly (already in min/km)
        const maxElevationText = this.app.formatElevation(stats.maxElevation);
        const minElevationText = this.app.formatElevation(stats.minElevation);



        // Update the DOM elements
        const totalDistanceEl = document.getElementById('totalDistance');
        const elevationGainEl = document.getElementById('elevationGain');
        const durationEl = document.getElementById('duration');
        const averageSpeedEl = document.getElementById('averageSpeed');
        const averagePaceEl = document.getElementById('averagePace');
        const maxElevationEl = document.getElementById('maxElevation');
        const minElevationEl = document.getElementById('minElevation');

        if (totalDistanceEl) totalDistanceEl.textContent = distanceText;
        if (elevationGainEl) elevationGainEl.textContent = elevationText;
        if (durationEl) durationEl.textContent = durationText;
        if (averageSpeedEl) averageSpeedEl.textContent = speedText;
        if (averagePaceEl) averagePaceEl.textContent = paceText;
        if (maxElevationEl) maxElevationEl.textContent = maxElevationText;
        if (minElevationEl) minElevationEl.textContent = minElevationText;

        this.updateSegmentSpeedStats();
    }

    ensureSegmentSpeedElements() {
        this.segmentSpeedElements = {
            container: null,
            list: null,
            empty: null
        };
        return this.segmentSpeedElements;
    }

    ensureSpeedOverlayElements() {
        this.speedOverlayElements = {
            container: document.getElementById('liveSpeedSegments'),
            list: document.getElementById('liveSpeedSegmentsList')
        };
        return this.speedOverlayElements;
    }

    scheduleMapLayoutUpdate() {
        if (this.mapLayoutUpdateScheduled) return;
        this.mapLayoutUpdateScheduled = true;
        requestAnimationFrame(() => {
            this.mapLayoutUpdateScheduled = false;
            this.app.mapRenderer?.detectAndSetMapLayout?.();
            this.app.mapRenderer?.map?.resize?.();
        });
    }

    updateSegmentSpeedVisibility(enabled) {
        const elements = this.ensureSegmentSpeedElements();

        if (elements.container) {
            elements.container.style.display = enabled ? 'block' : 'none';
            if (!enabled && elements.list) {
                elements.list.innerHTML = '';
            }
            if (!enabled && elements.empty) {
                elements.empty.style.display = 'none';
            }
        }

        if (!this.liveSpeedItem) {
            this.liveSpeedItem = document.getElementById('liveSpeedItem');
        }

        if (this.liveSpeedItem) {
            this.liveSpeedItem.style.display = enabled ? 'flex' : 'none';
        }
        if (!this.liveSpeedElement) {
            this.liveSpeedElement = document.getElementById('liveSpeed');
        }
        if (this.liveSpeedElement && !enabled) {
            this.liveSpeedElement.textContent = '–';
        }

        if (!enabled) {
            this.lastLiveSpeedValue = 0;
            this.lastOverlayDistance = 0;
            this.lastActiveSegmentIndex = null;
        }

        const overlay = this.ensureSpeedOverlayElements();
        if (overlay.container) {
            if (enabled && this.kilometerSegments.length > 0) {
                overlay.container.style.display = 'flex';
            } else {
                overlay.container.style.display = 'none';
            }
        }

        if (!this.liveSpeedLabel) {
            this.liveSpeedLabel = document.getElementById('liveSpeedLabel');
        }
        if (this.liveSpeedLabel) {
            this.liveSpeedLabel.textContent = this.app.state.speedDisplayMode === 'pace' ? 'P:' : 'S:';
        }

        if (enabled) {
            this.renderSpeedOverlay();
            this.updateSpeedDisplayMode();
        } else {
            this.scheduleMapLayoutUpdate();
        }
    }

    refreshSegmentSpeedStats() {
        this.updateSegmentSpeedStats();
    }

    updateSegmentSpeedStats() {
        if (!this.app.state.showSegmentSpeeds) {
            this.kilometerSegments = [];
            this.renderSpeedOverlay();

            const elements = this.ensureSegmentSpeedElements();
            if (elements.container) {
                elements.container.style.display = 'none';
                if (elements.list) {
                    elements.list.innerHTML = '';
                }
                if (elements.empty) {
                    elements.empty.style.display = 'none';
                }
            }
            return;
        }

        this.prepareKilometerSegments();
        this.renderSpeedOverlay();
        this.scheduleMapLayoutUpdate();

        const elements = this.ensureSegmentSpeedElements();
        if (elements.container) {
            if (!this.kilometerSegments.length) {
                if (elements.list) {
                    elements.list.innerHTML = '';
                    elements.list.style.display = 'none';
                }
                if (elements.empty) {
                    elements.empty.textContent = t('stats.segmentSpeedsUnavailable');
                    elements.empty.style.display = 'block';
                }
                elements.container.style.display = 'block';
            } else {
                elements.container.style.display = 'none';
            }
        }
    }

    collectSegmentSpeedData() {
        if (!this.app.currentTrackData || !this.app.currentTrackData.trackPoints) {
            return [];
        }

        if (this.app.currentTrackData.isJourney && Array.isArray(this.app.currentTrackData.segments)) {
            return this.collectJourneySegmentSpeeds();
        }

        return this.collectSingleTrackSegmentSpeeds();
    }

    buildOverallSegmentEntry() {
        const stats = this.app.currentTrackData?.stats;
        if (!stats) return null;

        const distance = stats.totalDistance || 0;
        let durationHours = stats.totalDuration || 0;
        let avgSpeed = stats.avgSpeed || 0;

        if ((!avgSpeed || avgSpeed <= 0) && durationHours > 0 && distance > 0) {
            avgSpeed = distance / durationHours;
        }

        if ((!durationHours || durationHours <= 0) && avgSpeed > 0 && distance > 0) {
            durationHours = distance / avgSpeed;
        }

        if (!avgSpeed || avgSpeed <= 0) {
            return null;
        }

        const activityType = (this.app.currentTrackData?.activityType || '').toLowerCase();

        return {
            label: t('stats.overallSegment'),
            icon: this.getActivityIcon(activityType),
            speedText: this.formatSpeed(avgSpeed),
            distanceText: this.formatSegmentDistance(distance),
            durationText: durationHours > 0 ? this.formatSegmentDuration(durationHours) : null,
            rawSpeed: avgSpeed
        };
    }

    collectJourneySegmentSpeeds() {
        const segments = this.app.currentTrackData.segments;
        if (!Array.isArray(segments)) return [];

        const results = [];
        let displayIndex = 1;

        segments.forEach(segment => {
            if (!segment || segment.type !== 'track') return;

            const trackStats = segment.data?.stats || {};
            let distance = trackStats.totalDistance || 0;
            let durationHours = trackStats.totalDuration || 0;
            let avgSpeed = trackStats.avgSpeed || 0;

            const trackPoints = Array.isArray(segment.data?.data?.trackPoints)
                ? segment.data.data.trackPoints
                : null;

            if ((!distance || distance <= 0) && trackPoints?.length) {
                const startDistance = trackPoints[0]?.distance || 0;
                const endDistance = trackPoints[trackPoints.length - 1]?.distance || 0;
                distance = Math.max(0, endDistance - startDistance);
            }

            if ((!durationHours || durationHours <= 0) && Array.isArray(segment.data?.data?.trackPoints)) {
                const firstTime = trackPoints.find(p => p.time)?.time;
                const lastTime = [...trackPoints].reverse().find(p => p.time)?.time;
                if (firstTime && lastTime && lastTime > firstTime) {
                    durationHours = (lastTime - firstTime) / 1000 / 3600;
                }
            }

            if (durationHours && durationHours > 24) {
                durationHours = durationHours / 3600;
            }

            let avgSpeedFromPoints = 0;
            if (trackPoints?.length) {
                const speeds = trackPoints
                    .map(p => p.speed || 0)
                    .filter(speed => speed > 0);
                if (speeds.length > 0) {
                    avgSpeedFromPoints = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
                }
            }

            if ((!avgSpeed || avgSpeed <= 0) && avgSpeedFromPoints > 0) {
                avgSpeed = avgSpeedFromPoints;
            }

            if ((!durationHours || durationHours <= 0) && avgSpeed > 0 && distance > 0) {
                durationHours = distance / avgSpeed;
            }

            if ((!avgSpeed || avgSpeed <= 0) && durationHours > 0 && distance > 0) {
                avgSpeed = distance / durationHours;
            }

            if (!distance || distance <= 0 || !avgSpeed || avgSpeed <= 0) {
                return;
            }

            const activityType = (segment.data?.data?.activityType || '').toLowerCase();
            const segmentLabel = `${t('stats.segmentLabel')} ${displayIndex} • ${this.getSegmentActivityLabel(activityType, segment.data?.name)}`;

            results.push({
                label: segmentLabel,
                icon: this.getActivityIcon(activityType),
                speedText: this.formatSpeed(avgSpeed),
                distanceText: this.formatSegmentDistance(distance),
                durationText: durationHours > 0 ? this.formatSegmentDuration(durationHours) : null,
                rawSpeed: avgSpeed
            });

            displayIndex++;
        });

        return results;
    }

    prepareKilometerSegments() {
        if (!this.app.currentTrackData || !Array.isArray(this.app.currentTrackData.trackPoints)) {
            this.kilometerSegments = [];
            this.lastOverlayDistance = 0;
            this.lastActiveSegmentIndex = null;
            return;
        }
        this.kilometerSegments = this.computeKilometerSegments(this.app.currentTrackData.trackPoints);
        this.lastOverlayDistance = 0;
        this.lastActiveSegmentIndex = null;
    }

    computeKilometerSegments(trackPoints) {
        if (!Array.isArray(trackPoints) || trackPoints.length < 2) {
            return [];
        }

        const segments = [];
        let segmentIndex = 1;
        let segmentDistance = 0;
        let segmentDuration = 0;
        let speedDistanceSum = 0;
        let speedDistanceWeight = 0;
        let segmentGain = 0;
        let segmentLoss = 0;
        let startDistance = trackPoints[0]?.distance || 0;

        const unitDistanceKm = this.app.state.unitSystem === 'imperial' ? 1 / 0.621371 : 1;

        for (let i = 1; i < trackPoints.length; i++) {
            const prev = trackPoints[i - 1];
            const curr = trackPoints[i];

            let deltaDistance = Math.max(0, (curr.distance || 0) - (prev.distance || 0));
            if (deltaDistance === 0) {
                continue;
            }

            let deltaTime = 0;
            if (prev.time && curr.time) {
                deltaTime = Math.max(0, (curr.time - prev.time) / 3600000);
            }

            const representativeSpeed = curr.speed && curr.speed > 0
                ? curr.speed
                : (prev.speed && prev.speed > 0 ? prev.speed : 0);

            let deltaElevation = (curr.elevation || 0) - (prev.elevation || 0);

            while (deltaDistance > 0) {
                const remainingDistanceToKm = Math.max(0, unitDistanceKm - segmentDistance);
                const portionDistance = Math.min(deltaDistance, remainingDistanceToKm);
                const proportion = portionDistance / deltaDistance;
                const portionTime = deltaTime * proportion;
                const portionElevation = deltaElevation * proportion;

                segmentDistance += portionDistance;
                segmentDuration += portionTime;

                if (representativeSpeed && representativeSpeed > 0) {
                    speedDistanceSum += representativeSpeed * portionDistance;
                    speedDistanceWeight += portionDistance;
                }

                if (portionElevation > 0) {
                    segmentGain += portionElevation;
                } else if (portionElevation < 0) {
                    segmentLoss += Math.abs(portionElevation);
                }

                deltaDistance -= portionDistance;
                deltaTime = Math.max(0, deltaTime - portionTime);
                deltaElevation -= portionElevation;

                const isLastPoint = i === trackPoints.length - 1 && deltaDistance <= 1e-6;
                if (segmentDistance >= (unitDistanceKm - 0.001) || (isLastPoint && segmentDistance > 0)) {
                    const avgSpeed = segmentDuration > 0 && segmentDistance > 0
                        ? segmentDistance / segmentDuration
                        : (speedDistanceWeight > 0 ? speedDistanceSum / speedDistanceWeight : 0);

                    const endDistance = startDistance + segmentDistance;

                    segments.push({
                        index: segmentIndex,
                        startDistance,
                        endDistance,
                        distanceKm: segmentDistance,
                        durationHours: segmentDuration,
                        avgSpeed,
                        gain: segmentGain,
                        loss: segmentLoss
                    });

                    segmentIndex++;
                    startDistance = endDistance;
                    segmentDistance = 0;
                    segmentDuration = 0;
                    speedDistanceSum = 0;
                    speedDistanceWeight = 0;
                    segmentGain = 0;
                    segmentLoss = 0;
                }
            }
        }

        return segments;
    }

    renderSpeedOverlay() {
        const overlay = this.ensureSpeedOverlayElements();
        if (!overlay.container || !overlay.list) return;

        if (!this.overlayElement) {
            this.overlayElement = document.getElementById('liveStatsOverlay');
        }

        if (this.overlayElement && this.overlayElement.classList.contains('end-animation')) {
            overlay.container.style.display = 'none';
            if (this.liveSpeedItem) {
                this.liveSpeedItem.style.display = 'none';
            }
            this.scheduleMapLayoutUpdate();
            return;
        }

        if (!this.app.state.showSegmentSpeeds || !Array.isArray(this.kilometerSegments) || this.kilometerSegments.length === 0) {
            overlay.container.style.display = 'none';
            overlay.list.innerHTML = '';
            this.scheduleMapLayoutUpdate();
            return;
        }

        overlay.container.style.display = 'flex';

        let item = overlay.list.querySelector('.speed-segment-item');
        if (!item) {
            item = document.createElement('div');
            item.className = 'speed-segment-item';

            const label = document.createElement('span');
            label.className = 'speed-segment-label';

            const values = document.createElement('div');
            values.className = 'speed-segment-values';

            const speedSpan = document.createElement('span');
            speedSpan.className = 'speed-segment-speed';

            const paceSpan = document.createElement('span');
            paceSpan.className = 'speed-segment-pace';

            values.appendChild(speedSpan);
            values.appendChild(paceSpan);

            item.appendChild(label);
            item.appendChild(values);

            overlay.list.innerHTML = '';
            overlay.list.appendChild(item);
        }

        this.updateSpeedOverlay(this.lastOverlayDistance || 0);
        this.scheduleMapLayoutUpdate();
    }

    updateSpeedOverlay(currentDistanceKm) {
        if (!this.app.state.showSegmentSpeeds) return;
        if (!Array.isArray(this.kilometerSegments) || this.kilometerSegments.length === 0) return;

        this.lastOverlayDistance = currentDistanceKm;

        const overlay = this.ensureSpeedOverlayElements();
        if (!overlay.container || !overlay.list) return;

        if (!this.overlayElement) {
            this.overlayElement = document.getElementById('liveStatsOverlay');
        }

        if (this.overlayElement && this.overlayElement.classList.contains('end-animation')) {
            overlay.container.style.display = 'none';
            if (this.liveSpeedItem) {
                this.liveSpeedItem.style.display = 'none';
            }
            this.scheduleMapLayoutUpdate();
            return;
        }

        const item = overlay.list.querySelector('.speed-segment-item');
        if (!item) {
            this.renderSpeedOverlay();
            return;
        }

        const labelEl = item.querySelector('.speed-segment-label');
        const speedEl = item.querySelector('.speed-segment-speed');
        const paceEl = item.querySelector('.speed-segment-pace');

        const epsilon = 0.0005;
        let segment = this.kilometerSegments.find(seg =>
            currentDistanceKm >= seg.startDistance - epsilon &&
            currentDistanceKm < seg.endDistance + epsilon
        );

        if (!segment && currentDistanceKm >= this.kilometerSegments[this.kilometerSegments.length - 1].endDistance - epsilon) {
            segment = this.kilometerSegments[this.kilometerSegments.length - 1];
        }

        if (!segment) {
            overlay.container.style.display = 'none';
            return;
        }

        overlay.container.style.display = 'flex';

        const hasSpeed = segment.avgSpeed && segment.avgSpeed > 0;
        const speedText = hasSpeed ? this.formatSpeed(segment.avgSpeed) : '–';
        const paceText = hasSpeed ? this.formatPace(segment.avgSpeed) : '–';

        const mode = this.app.state.speedDisplayMode || 'speed';

        if (labelEl) {
            labelEl.textContent = this.formatSegmentElevationChange(segment);
        }
        if (speedEl) {
            speedEl.textContent = mode === 'pace' ? paceText : speedText;
        }
        if (paceEl) {
            const secondary = mode === 'pace' ? speedText : paceText;
            paceEl.textContent = secondary;
        }

        if (this.lastActiveSegmentIndex !== segment.index) {
            item.classList.remove('segment-change');
            // Trigger reflow to restart animation
            void item.offsetWidth;
            item.classList.add('segment-change');
            this.lastActiveSegmentIndex = segment.index;
        }
    }

    updateSpeedDisplayMode() {
        if (!this.liveSpeedLabel) {
            this.liveSpeedLabel = document.getElementById('liveSpeedLabel');
        }
        if (this.liveSpeedLabel) {
            this.liveSpeedLabel.textContent = this.app.state.speedDisplayMode === 'pace' ? 'P:' : 'S:';
        }

        if (this.liveSpeedElement) {
            if (this.app.state.showSegmentSpeeds && this.lastLiveSpeedValue && this.lastLiveSpeedValue > 0.05) {
                this.liveSpeedElement.textContent = this.app.state.speedDisplayMode === 'pace'
                    ? this.formatPace(this.lastLiveSpeedValue)
                    : this.formatSpeed(this.lastLiveSpeedValue);
            } else {
                this.liveSpeedElement.textContent = '–';
            }
        }

        if (this.liveSpeedItem) {
            this.liveSpeedItem.style.display = this.app.state.showSegmentSpeeds ? 'flex' : 'none';
        }

        this.renderSpeedOverlay();
        if (this.app.state.showSegmentSpeeds) {
            this.updateSpeedOverlay(this.lastOverlayDistance || 0);
        }
    }

    collectSingleTrackSegmentSpeeds() {
        const trackData = this.app.currentTrackData || {};
        const cachedSegments = Array.isArray(trackData.activitySegments) ? trackData.activitySegments : null;

        const gpxParser = this.app.mapRenderer?.gpxParser || this.app.gpxParser;
        const fallbackSegments = (!cachedSegments && gpxParser) ? gpxParser.detectActivitySegments() : [];

        const segments = cachedSegments || fallbackSegments;
        if (!Array.isArray(segments) || segments.length === 0) {
            return [];
        }

        const results = [];
        let displayIndex = 1;

        segments.forEach(segment => {
            if (!segment) return;

            const segmentPoints = Array.isArray(trackData.trackPoints)
                ? trackData.trackPoints.slice(segment.startIndex, segment.endIndex + 1)
                : (gpxParser?.trackPoints || []).slice(segment.startIndex, segment.endIndex + 1);

            let distance = segment.distance || 0;
            if ((!distance || distance <= 0) && segmentPoints.length > 1) {
                const startDistance = segmentPoints[0]?.distance || 0;
                const endDistance = segmentPoints[segmentPoints.length - 1]?.distance || 0;
                distance = Math.max(0, endDistance - startDistance);
            }

            let durationHours = segment.durationHours;
            if ((!durationHours || durationHours <= 0) && segmentPoints.length > 1) {
                const firstTime = segmentPoints.find(p => p.time)?.time;
                const lastTime = [...segmentPoints].reverse().find(p => p.time)?.time;
                if (firstTime && lastTime && lastTime > firstTime) {
                    durationHours = (lastTime - firstTime) / 1000 / 3600;
                }
            }

            let avgSpeed = segment.avgSpeed || 0;
            let avgSpeedFromPoints = 0;
            if (segmentPoints.length > 0) {
                const speeds = segmentPoints
                    .map(p => p.speed || 0)
                    .filter(speed => speed > 0);
                if (speeds.length > 0) {
                    avgSpeedFromPoints = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
                }
            }

            if ((!avgSpeed || avgSpeed <= 0) && avgSpeedFromPoints > 0) {
                avgSpeed = avgSpeedFromPoints;
            }

            if ((!durationHours || durationHours <= 0) && avgSpeed > 0 && distance > 0) {
                durationHours = distance / avgSpeed;
            }

            if ((!avgSpeed || avgSpeed <= 0) && durationHours > 0 && distance > 0) {
                avgSpeed = distance / durationHours;
            }

            if (!distance || distance <= 0 || !avgSpeed || avgSpeed <= 0) {
                return;
            }

            const activityType = (segment.activity || '').toLowerCase();
            const segmentLabel = `${t('stats.segmentLabel')} ${displayIndex} • ${this.getSegmentActivityLabel(activityType)}`;

            results.push({
                label: segmentLabel,
                icon: this.getActivityIcon(activityType),
                speedText: this.formatSpeed(avgSpeed),
                distanceText: this.formatSegmentDistance(distance),
                durationText: durationHours > 0 ? this.formatSegmentDuration(durationHours) : null,
                rawSpeed: avgSpeed
            });

            displayIndex++;
        });

        return results;
    }

    getSegmentActivityLabel(activityType, fallbackName) {
        const activities = t('stats.segmentActivities');
        const normalized = activityType ? activityType.toLowerCase() : '';

        if (activities && typeof activities === 'object') {
            if (activities[normalized]) {
                return activities[normalized];
            }
            if (fallbackName) {
                return fallbackName;
            }
            if (activities.default) {
                return activities.default;
            }
        }

        if (fallbackName) return fallbackName;
        if (!normalized) {
            if (activities && typeof activities === 'object' && activities.default) {
                return activities.default;
            }
            return 'Activity';
        }
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    getActivityIcon(activityType) {
        if (!activityType) return '';
        const normalized = activityType.toLowerCase();
        return ACTIVITY_ICONS[normalized] || '';
    }

    formatSegmentDistance(distance) {
        if (!distance || distance <= 0) return null;
        if (this.app?.formatDistance) {
            return this.app.formatDistance(distance);
        }
        return formatDistanceUnits(distance);
    }

    formatSegmentDuration(hours) {
        if (!hours || hours <= 0) return null;
        return this.formatDurationMinutes(hours);
    }

    formatSegmentElevationChange(segment) {
        const gain = Math.max(0, segment.gain || 0);
        const loss = Math.max(0, segment.loss || 0);
        const net = gain - loss;
        const netText = this.app.formatElevation ? this.app.formatElevation(Math.abs(net)) : `${Math.round(Math.abs(net))} m`;

        let sign = '+';
        if (net < -0.5) {
            sign = '−';
        } else if (net <= 0.5) {
            sign = '±';
        }

        const unitLabel = getUnitLabels(this.app.state.unitSystem).distance;
        const unitIndex = Math.max(1, segment.index);
        return `${unitLabel.toUpperCase()} ${unitIndex} · ${sign}${netText}`;
    }

    // Update live stats during animation - this is the main method called during playback
    updateLiveStats() {
        // Cache overlay element
        if (!this.overlayElement) {
            this.overlayElement = document.getElementById('liveStatsOverlay');
        }
        if (!this.overlayElement) return;
        
        // Skip expensive operations during clean recording, but allow updates during overlay recording
        if (this.app.recordingMode && !this.app.overlayRecordingMode) {
            return;
        }
        
        // If no data, show placeholders
        if (!this.app.mapController || !this.app.currentTrackData) {
            this.setErrorState();
            return;
        }
        
        try {
            // Increased throttling for better performance during animation
            const now = performance.now();
            const throttleMs = this.app.state.performanceMode ? 300 : 150;
            if (this.lastStatsUpdate && (now - this.lastStatsUpdate) < throttleMs) {
                return; // Skip if updated too recently
            }
            this.lastStatsUpdate = now;
            
            // Ensure GPX parser is ready
            if (!this.app.mapRenderer.ensureGPXParserReady()) {
                this.setErrorState();
                return;
            }
            
            const progress = this.app.mapRenderer.getAnimationProgress();
            const currentPoint = this.app.mapRenderer.gpxParser.getInterpolatedPoint(progress);
            
            if (!currentPoint) {
                this.setErrorState();
                return;
            }
            
            // Calculate current distance (distance traveled so far)
            let currentDistance = 0;
            
            if (this.app.currentTrackData.isJourney && this.app.currentTrackData.segments) {
                // For journeys, calculate distance based on current segment and progress
                currentDistance = this.calculateJourneyCurrentDistance(progress);
            } else {
                // For single tracks, use simple calculation
                const totalDistance = this.app.currentTrackData.stats.totalDistance;
                currentDistance = progress * totalDistance;
            }
            
            // Calculate actual elevation gain based on current position in track
            const currentElevationGain = this.calculateActualElevationGain(progress);
            
            // Cache DOM elements for better performance
            if (!this.distanceElement) {
                this.distanceElement = document.getElementById('liveDistance');
            }
            if (!this.elevationElement) {
                this.elevationElement = document.getElementById('liveElevation');
            }
            
            // Format and update the display values - simplified without animation during playback
            if (this.distanceElement) {
                const formattedDistance = this.app.formatDistance(currentDistance);
                if (this.distanceElement.textContent !== formattedDistance) {
                    this.distanceElement.textContent = formattedDistance;
                }
            }
            
            if (this.elevationElement) {
                const formattedElevation = this.app.formatElevation
                    ? this.app.formatElevation(currentElevationGain)
                    : this.app.gpxParser.formatElevation(currentElevationGain);
                if (this.elevationElement.textContent !== formattedElevation) {
                    this.elevationElement.textContent = formattedElevation;
                }
            }

            if (!this.liveSpeedElement) {
                this.liveSpeedElement = document.getElementById('liveSpeed');
            }
            if (!this.liveSpeedItem) {
                this.liveSpeedItem = document.getElementById('liveSpeedItem');
            }

            if (!this.liveSpeedLabel) {
                this.liveSpeedLabel = document.getElementById('liveSpeedLabel');
            }
            if (this.liveSpeedLabel) {
                this.liveSpeedLabel.textContent = this.app.state.speedDisplayMode === 'pace' ? 'P:' : 'S:';
            }

            if (this.liveSpeedElement && this.liveSpeedItem) {
                if (this.app.state.showSegmentSpeeds) {
                    const speedValue = currentPoint.speed || 0;
                    this.lastLiveSpeedValue = speedValue;
                    if (speedValue > 0.05) {
                        const formattedSpeed = this.app.state.speedDisplayMode === 'pace'
                            ? this.formatPace(speedValue)
                            : this.formatSpeed(speedValue);
                        if (this.liveSpeedElement.textContent !== formattedSpeed) {
                            this.liveSpeedElement.textContent = formattedSpeed;
                        }
                    } else {
                        this.liveSpeedElement.textContent = '–';
                    }
                    this.liveSpeedItem.style.display = 'flex';
                } else {
                    this.liveSpeedElement.textContent = '–';
                    this.liveSpeedItem.style.display = 'none';
                }
            }

            if (this.app.state.showSegmentSpeeds) {
                const distanceForOverlay = typeof currentPoint.distance === 'number' ? currentPoint.distance : currentDistance;
                this.updateSpeedOverlay(distanceForOverlay);
            }

        } catch (error) {
            this.setErrorState();
            console.warn('Error updating live stats:', error);
        }
    }

    // Helper method to set error state for all stats - reduces code duplication
    setErrorState() {
        if (!this.distanceElement) {
            this.distanceElement = document.getElementById('liveDistance');
        }
        if (!this.elevationElement) {
            this.elevationElement = document.getElementById('liveElevation');
        }
        if (!this.liveSpeedElement) {
            this.liveSpeedElement = document.getElementById('liveSpeed');
        }
        if (!this.liveSpeedItem) {
            this.liveSpeedItem = document.getElementById('liveSpeedItem');
        }
        
        if (this.distanceElement) this.distanceElement.textContent = '–';
        if (this.elevationElement) this.elevationElement.textContent = '–';
        if (this.liveSpeedElement) this.liveSpeedElement.textContent = '–';
        if (this.liveSpeedItem) this.liveSpeedItem.style.display = this.app.state.showSegmentSpeeds ? 'flex' : 'none';

        const overlay = this.ensureSpeedOverlayElements();
        if (overlay.container) {
            overlay.container.style.display = 'none';
        }
    }

    // Calculate actual elevation gain based on current progress through the track
    calculateActualElevationGain(progress) {
        if (!this.app.currentTrackData || !this.app.currentTrackData.trackPoints) {
            return 0;
        }
        
        const trackPoints = this.app.currentTrackData.trackPoints;
        if (trackPoints.length === 0) {
            return 0;
        }
        
        // Debug: Check if we have elevation data (only once)
        if (!this._elevationDataChecked) {
            const hasElevationData = trackPoints.some(point => point.elevation && point.elevation > 0);
            if (!hasElevationData) {
                console.log('Warning: No elevation data found in track points');
                console.log('First 3 track points:', trackPoints.slice(0, 3).map(p => ({
                    lat: p.lat,
                    lon: p.lon,
                    elevation: p.elevation
                })));
            } else {
                console.log('Elevation data found in track points');
            }
            this._elevationDataChecked = true;
        }
        
        // Calculate the current point index based on progress
        const totalPoints = trackPoints.length;
        const currentIndex = Math.min(Math.floor(progress * (totalPoints - 1)), totalPoints - 1);
        
        // Calculate actual elevation gain up to the current point
        let elevationGain = 0;
        let previousElevation = trackPoints[0].elevation || 0;
        
        for (let i = 1; i <= currentIndex; i++) {
            const currentElevation = trackPoints[i].elevation || 0;
            
            // Only count positive elevation changes as gain
            if (currentElevation > previousElevation) {
                elevationGain += currentElevation - previousElevation;
            }
            
            previousElevation = currentElevation;
        }
        
        // If we're between two points, interpolate the elevation gain for the partial segment
        if (currentIndex < totalPoints - 1) {
            const fraction = (progress * (totalPoints - 1)) - currentIndex;
            if (fraction > 0) {
                const currentElevation = trackPoints[currentIndex].elevation || 0;
                const nextElevation = trackPoints[currentIndex + 1].elevation || 0;
                
                // Only add partial gain if the next point is higher
                if (nextElevation > currentElevation) {
                    const partialGain = (nextElevation - currentElevation) * fraction;
                    elevationGain += partialGain;
                }
            }
        }
        
        return elevationGain;
    }

    animateValueChange(element, newValue) {
        // Add updating class for animation
        element.classList.add('updating');
        
        // Update the value
        element.textContent = newValue;
        
        // Remove the animation class after animation
        setTimeout(() => {
            element.classList.remove('updating');
        }, 200);
    }

    calculateGpxOnlyStats(journeyData) {
        if (!journeyData.segments) return { totalDistance: 0, elevationGain: 0 };
        
        let totalDistance = 0;
        let totalElevationGain = 0;
        
        journeyData.segments.forEach(segment => {
            if (segment.type === 'track' && segment.data && segment.data.stats) {
                totalDistance += segment.data.stats.totalDistance || 0;
                totalElevationGain += segment.data.stats.elevationGain || 0;
            }
        });
        
        return {
            totalDistance: totalDistance,
            elevationGain: totalElevationGain
        };
    }

    resetLiveStats() {
        const labels = getUnitLabels(this.app.state.unitSystem);
        document.getElementById('liveDistance').textContent = `0.0 ${labels.distance}`;
        document.getElementById('liveElevation').textContent = `0 ${labels.elevation || (this.app.state.unitSystem === 'imperial' ? 'ft' : 'm')}`;
        const avgSpeedElement = document.getElementById('liveAverageSpeed');
        if (avgSpeedElement) {
            avgSpeedElement.textContent = `0 ${labels.speed}`;
        }
        if (!this.liveSpeedElement) {
            this.liveSpeedElement = document.getElementById('liveSpeed');
        }
        if (this.liveSpeedElement) {
            this.liveSpeedElement.textContent = this.app.state.speedDisplayMode === 'pace'
                ? `0:00 ${labels.pace}`
                : `0.0 ${labels.speed}`;
        }
        if (!this.liveSpeedLabel) {
            this.liveSpeedLabel = document.getElementById('liveSpeedLabel');
        }
        if (this.liveSpeedLabel) {
            this.liveSpeedLabel.textContent = this.app.state.speedDisplayMode === 'pace' ? 'P:' : 'S:';
        }
        const overlay = this.ensureSpeedOverlayElements();
        if (overlay.container) {
            overlay.container.style.display = 'none';
        }
        this.lastLiveSpeedValue = 0;
        this.lastOverlayDistance = 0;
        this.lastActiveSegmentIndex = null;
    }

    // Reset all static stats to default values
    resetStats() {
        const labels = getUnitLabels(this.app.state.unitSystem);
        document.getElementById('totalDistance').textContent = `0 ${labels.distance}`;
        document.getElementById('elevationGain').textContent = this.app.formatElevation ? this.app.formatElevation(0) : '0 m';
        document.getElementById('duration').textContent = '0h 0m';
        document.getElementById('averageSpeed').textContent = `0 ${labels.speed}`;
        document.getElementById('averagePace').textContent = `0:00 ${labels.pace}`;
        document.getElementById('maxElevation').textContent = this.app.formatElevation ? this.app.formatElevation(0) : '0 m';
        document.getElementById('minElevation').textContent = this.app.formatElevation ? this.app.formatElevation(0) : '0 m';
    }

    // Format duration from hours to readable format (1h 30m)
    formatDuration(hours) {
        if (!hours || hours === 0) return '0h 0m';

        const totalMinutes = Math.round(hours * 60);
        const displayHours = Math.floor(totalMinutes / 60);
        const displayMinutes = totalMinutes % 60;

        if (displayHours > 0) {
            return `${displayHours}h ${displayMinutes}m`;
        } else {
            return `${displayMinutes}m`;
        }
    }

    // Format duration from hours to minutes format (same as above for now)
    formatDurationMinutes(hours) {
        return this.formatDuration(hours);
    }

    // Format speed in km/h
    formatSpeed(speedKmh) {
        return this.app.formatSpeed(speedKmh);
    }

    // Format pace from km/h to min/km
    formatPace(avgSpeedKmh) {
        return this.app.formatPaceFromSpeed(avgSpeedKmh);
    }

    // Format pace value directly (when pace is already in min/km)
    formatPaceValue(paceMinPerKm) {
        return this.app.formatPaceValue(paceMinPerKm);
    }

    // Ensure all stats fields are properly calculated
    ensureCompleteStats(stats) {
        if (!stats) return;

        // Calculate average speed if not present or if we have distance and duration
        if ((!stats.avgSpeed || stats.avgSpeed === 0) && stats.totalDistance > 0 && stats.totalDuration > 0) {
            stats.avgSpeed = stats.totalDistance / stats.totalDuration; // km/h (totalDuration should already be in hours)
        }

        // Ensure avgPace is calculated (it might be stored as avgPace or need to be calculated from avgSpeed)
        if ((!stats.avgPace || stats.avgPace === 0) && stats.avgSpeed > 0) {
            stats.avgPace = (1 / stats.avgSpeed) * 60; // min/km
        }



        // Ensure duration is in hours format (not seconds)
        if (stats.totalDuration && stats.totalDuration > 24) {
            // If duration is in seconds, convert to hours
            stats.totalDuration = stats.totalDuration / 3600;
        }
    }

    // Recalculate stats from current trackPoints data (useful after journey transformations)
    recalculateStatsFromTrackPoints(stats) {
        if (!this.app.currentTrackData || !this.app.currentTrackData.trackPoints) {
            return;
        }

        const trackPoints = this.app.currentTrackData.trackPoints;

        // Recalculate elevation stats
        const elevations = trackPoints.map(point => point.elevation || 0).filter(e => e > 0);
        if (elevations.length > 0) {
            const newMinElevation = Math.min(...elevations);
            const newMaxElevation = Math.max(...elevations);

            if (newMinElevation !== stats.minElevation || newMaxElevation !== stats.maxElevation) {
                stats.minElevation = newMinElevation;
                stats.maxElevation = newMaxElevation;
            }
        }

        // Recalculate speed stats
        const speeds = trackPoints.map(point => point.speed || 0).filter(s => s > 0);
        if (speeds.length > 0) {
            const newAvgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;

            if (Math.abs(newAvgSpeed - (stats.avgSpeed || 0)) > 0.1) {
                stats.avgSpeed = newAvgSpeed;
            }
        }

        // Recalculate duration if we have time data
        const pointsWithTime = trackPoints.filter(p => p.time).length;
        if (pointsWithTime > 1) {
            const firstTime = trackPoints.find(p => p.time)?.time;
            const lastTime = trackPoints.slice().reverse().find(p => p.time)?.time;

            if (firstTime && lastTime) {
                const newDuration = (lastTime - firstTime) / 1000 / 3600; // hours

                if (Math.abs(newDuration - (stats.totalDuration || 0)) > 0.01) {
                    stats.totalDuration = newDuration;
                }
            }
        }
    }




    // Calculate current distance for journeys based on segments and progress
    calculateJourneyCurrentDistance(progress) {
        if (!this.app.currentTrackData.segments) return 0;

        const segments = this.app.currentTrackData.segments;
        const totalCoordinates = this.app.currentTrackData.trackPoints.length;
        
        // Convert linear progress to coordinate index
        const currentCoordIndex = Math.floor(progress * (totalCoordinates - 1));
        
        let accumulatedDistance = 0;
        
        for (const segment of segments) {
            const segmentStartIndex = segment.startIndex;
            const segmentEndIndex = segment.endIndex;
            
            if (currentCoordIndex >= segmentStartIndex && currentCoordIndex <= segmentEndIndex) {
                // We're in this segment
                if (segment.type === 'track') {
                    // Calculate partial distance within this track segment
                    const segmentProgress = (currentCoordIndex - segmentStartIndex) / (segmentEndIndex - segmentStartIndex);
                    const segmentDistance = segment.data?.stats?.totalDistance || 0;
                    
                    // Only count track distance if GPX-only stats is disabled, or always count if enabled
                    if (!this.app.state.gpxOnlyStats || segment.type === 'track') {
                        accumulatedDistance += segmentProgress * segmentDistance;
                    }
                }
                // For transportation segments, don't add distance if GPX-only stats is enabled
                else if (segment.type === 'transportation' && !this.app.state.gpxOnlyStats) {
                    // For simplicity, count transport as full distance if we've reached this segment
                    // In a more sophisticated implementation, you might interpolate based on time
                    const transportDistance = this.calculateTransportDistance(segment.startPoint, segment.endPoint);
                    accumulatedDistance += transportDistance;
                }
                
                break;
            } else if (currentCoordIndex > segmentEndIndex) {
                // We've passed this segment completely
                if (segment.type === 'track') {
                    const segmentDistance = segment.data?.stats?.totalDistance || 0;
                    if (!this.app.state.gpxOnlyStats || segment.type === 'track') {
                        accumulatedDistance += segmentDistance;
                    }
                } else if (segment.type === 'transportation' && !this.app.state.gpxOnlyStats) {
                    const transportDistance = this.calculateTransportDistance(segment.startPoint, segment.endPoint);
                    accumulatedDistance += transportDistance;
                }
            }
        }
        
        return accumulatedDistance;
    }

    // Calculate distance between two points for transport segments
    calculateTransportDistance(startPoint, endPoint) {
        if (!startPoint || !endPoint) return 0;
        
        const R = 6371; // Earth's radius in km
        const dLat = (endPoint[1] - startPoint[1]) * Math.PI / 180;
        const dLon = (endPoint[0] - startPoint[0]) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(startPoint[1] * Math.PI / 180) * Math.cos(endPoint[1] * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
} 
