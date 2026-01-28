import { t } from '../translations.js';

export class JourneyTiming {
    constructor(journeyCore) {
        this.journeyCore = journeyCore;
        this.segmentTiming = [];
        this.totalDuration = 0;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for segment timing updates
        document.addEventListener('updateSegmentTiming', (e) => {
            const { segmentIndex, newDuration } = e.detail;
            this.updateSegmentTiming(segmentIndex, newDuration);
        });

        // Listen for timing edits
        document.addEventListener('editSegmentTiming', (e) => {
            const { segmentIndex } = e.detail;
            this.showTimingEditor(segmentIndex);
        });
    }

    // Calculate comprehensive journey timing
    calculateJourneyTiming() {
        const segments = this.journeyCore.getSegments();
        this.segmentTiming = [];
        this.totalDuration = 0;

        segments.forEach((segment, index) => {
            const duration = this.calculateSegmentDuration(segment);
            
            const timingInfo = {
                id: segment.id,
                type: segment.type,
                index: index,
                duration: duration,
                startTime: this.totalDuration,
                endTime: this.totalDuration + duration,
                data: segment
            };

            this.segmentTiming.push(timingInfo);
            this.totalDuration += duration;
        });

        return {
            totalDuration: this.totalDuration,
            segmentTiming: this.segmentTiming
        };
    }

    // Calculate individual segment duration
    calculateSegmentDuration(segment) {
        if (segment.type === 'track') {
            return this.calculateTrackTime(segment.data.data);
        } else if (segment.type === 'transportation') {
            return segment.userTime || this.getDefaultTransportTime(segment.mode, this.calculateTransportDistance(segment));
        }
        return 0;
    }

    // Calculate track time based on activity and stats
    calculateTrackTime(trackData) {
        const distance = trackData.stats?.totalDistance || 0;
        const elevation = trackData.stats?.elevationGain || 0;
        const activityType = trackData.activityType || 'running';
        
        // Base speeds in km/h
        const baseSpeeds = {
            running: 8,
            cycling: 20,
            walking: 4,
            hiking: 3,
            swimming: 2
        };
        
        const baseSpeed = baseSpeeds[activityType] || baseSpeeds.running;
        let timeInHours = distance / baseSpeed;
        
        // Add time for elevation gain (rough estimate)
        if (elevation > 0) {
            const elevationPenalty = {
                running: 600,   // 1 hour per 600m gain
                cycling: 800,   // 1 hour per 800m gain
                walking: 400,   // 1 hour per 400m gain
                hiking: 300     // 1 hour per 300m gain
            };
            
            const penalty = elevationPenalty[activityType] || elevationPenalty.running;
            timeInHours += elevation / penalty;
        }
        
        return timeInHours * 3600; // Convert to seconds
    }

    // Calculate transport distance
    calculateTransportDistance(segment) {
        if (segment.route && segment.route.distance) {
            return segment.route.distance;
        }
        // Calculate direct distance
        return this.journeyCore.calculateDistance(segment.startPoint, segment.endPoint);
    }

    // Get default transport time
    getDefaultTransportTime(mode, distanceKm) {
        const speeds = {
            car: 50,
            walking: 4,
            cycling: 15,
            bus: 30,
            train: 80,
            plane: 500
        };
        
        const speed = speeds[mode] || speeds.car;
        return (distanceKm / speed) * 3600; // Convert to seconds
    }

    // Update segment timing
    updateSegmentTiming(segmentIndex, newDuration) {
        const segments = this.journeyCore.getSegments();
        
        if (segmentIndex >= 0 && segmentIndex < segments.length) {
            const segment = segments[segmentIndex];
            
            if (segment.type === 'transportation') {
                segment.userTime = newDuration;
            }
            // For tracks, we don't override calculated time but could add user override
            
            // Recalculate journey timing
            this.calculateJourneyTiming();
            
            // Emit timing update event
            document.dispatchEvent(new CustomEvent('journeyTimingUpdated', {
                detail: {
                    totalDuration: this.totalDuration,
                    segmentTiming: this.segmentTiming
                }
            }));
        }
    }

    // Show timing editor modal
    showTimingEditor(segmentIndex) {
        const segments = this.journeyCore.getSegments();
        const segment = segments[segmentIndex];
        
        if (!segment) return;

        const currentDuration = this.calculateSegmentDuration(segment);
        const modal = this.createTimingEditorModal(segmentIndex, segment, currentDuration);
        document.body.appendChild(modal);
    }

    // Create timing editor modal
    createTimingEditorModal(segmentIndex, segment, currentDuration) {
        const modal = document.createElement('div');
        modal.className = 'modal timing-editor-modal';
        
        const isTrack = segment.type === 'track';
        const segmentName = isTrack ? segment.data.name : t(`journeyBuilder.transport.${segment.mode}`);
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${t('journeyBuilder.editTiming')}: ${segmentName}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="current-timing">
                        <label>${t('journeyBuilder.currentDuration')}:</label>
                        <span class="current-duration">${this.formatTime(currentDuration)}</span>
                    </div>
                    
                    ${isTrack ? this.createTrackTimingContent(segment) : this.createTransportTimingContent(segment, currentDuration)}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelTiming">${t('common.cancel')}</button>
                    <button class="btn btn-primary" id="saveTiming">${t('common.save')}</button>
                    ${!isTrack ? `<button class="btn btn-outline" id="resetTiming">${t('journeyBuilder.resetToDefault')}</button>` : ''}
                </div>
            </div>
        `;

        this.setupTimingEditorListeners(modal, segmentIndex, segment);
        return modal;
    }

    // Create track timing content
    createTrackTimingContent(segment) {
        const stats = segment.data.data.stats;
        const activityType = segment.data.data.activityType || 'running';
        
        return `
            <div class="timing-info">
                <p>${t('journeyBuilder.trackTimingInfo')}</p>
                <div class="timing-breakdown">
                    <div class="timing-item">
                        <label>${t('journeyBuilder.distance')}:</label>
                        <span>${this.formatDistance(stats.totalDistance)}</span>
                    </div>
                    <div class="timing-item">
                        <label>${t('journeyBuilder.elevation')}:</label>
                        <span>${this.formatElevation(stats.elevationGain)}</span>
                    </div>
                    <div class="timing-item">
                        <label>${t('journeyBuilder.activityType')}:</label>
                        <span>${t(`activities.${activityType}`)}</span>
                    </div>
                </div>
                <p class="timing-note">${t('journeyBuilder.trackTimingNote')}</p>
            </div>
        `;
    }

    // Create transport timing content
    createTransportTimingContent(segment, currentDuration) {
        const distance = this.calculateTransportDistance(segment);
        const defaultTime = this.getDefaultTransportTime(segment.mode, distance);
        const hasCustomTime = segment.userTime !== null && segment.userTime !== undefined;
        
        return `
            <div class="timing-controls">
                <div class="timing-item">
                    <label>${t('journeyBuilder.distance')}:</label>
                    <span>${this.formatDistance(distance)}</span>
                </div>
                <div class="timing-item">
                    <label>${t('journeyBuilder.transportMode')}:</label>
                    <span>${t(`journeyBuilder.transport.${segment.mode}`)}</span>
                </div>
                <div class="timing-item">
                    <label>${t('journeyBuilder.defaultDuration')}:</label>
                    <span>${this.formatTime(defaultTime)}</span>
                </div>
                
                <div class="custom-timing">
                    <label>
                        <input type="checkbox" id="useCustomTiming" ${hasCustomTime ? 'checked' : ''}>
                        ${t('journeyBuilder.useCustomTiming')}
                    </label>
                    
                    <div class="custom-duration ${hasCustomTime ? '' : 'disabled'}">
                        <div class="duration-inputs">
                            <input type="number" id="customHours" placeholder="0" min="0" max="23" value="${hasCustomTime ? Math.floor(currentDuration / 3600) : ''}">
                            <span>h</span>
                            <input type="number" id="customMinutes" placeholder="0" min="0" max="59" value="${hasCustomTime ? Math.floor((currentDuration % 3600) / 60) : ''}">
                            <span>m</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Setup timing editor listeners
    setupTimingEditorListeners(modal, segmentIndex, segment) {
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('#cancelTiming');
        const saveBtn = modal.querySelector('#saveTiming');
        const resetBtn = modal.querySelector('#resetTiming');
        const customTimingCheckbox = modal.querySelector('#useCustomTiming');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // Handle custom timing toggle
        if (customTimingCheckbox) {
            const customDurationDiv = modal.querySelector('.custom-duration');
            
            customTimingCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    customDurationDiv.classList.remove('disabled');
                } else {
                    customDurationDiv.classList.add('disabled');
                }
            });
        }

        // Save timing
        saveBtn.addEventListener('click', () => {
            if (segment.type === 'transportation') {
                const useCustom = modal.querySelector('#useCustomTiming')?.checked;
                
                if (useCustom) {
                    const hours = parseInt(modal.querySelector('#customHours').value) || 0;
                    const minutes = parseInt(modal.querySelector('#customMinutes').value) || 0;
                    const newDuration = (hours * 3600) + (minutes * 60);
                    
                    this.updateSegmentTiming(segmentIndex, newDuration);
                } else {
                    // Remove custom timing
                    const segments = this.journeyCore.getSegments();
                    segments[segmentIndex].userTime = null;
                    this.calculateJourneyTiming();
                    
                    document.dispatchEvent(new CustomEvent('journeyTimingUpdated', {
                        detail: {
                            totalDuration: this.totalDuration,
                            segmentTiming: this.segmentTiming
                        }
                    }));
                }
            }
            
            closeModal();
        });

        // Reset to default
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                const segments = this.journeyCore.getSegments();
                segments[segmentIndex].userTime = null;
                this.calculateJourneyTiming();
                
                document.dispatchEvent(new CustomEvent('journeyTimingUpdated', {
                    detail: {
                        totalDuration: this.totalDuration,
                        segmentTiming: this.segmentTiming
                    }
                }));
                
                closeModal();
            });
        }
    }

    // Get journey timing breakdown for display
    getJourneyTimingBreakdown() {
        const breakdown = {
            totalDuration: this.totalDuration,
            segments: this.segmentTiming,
            trackTime: 0,
            transportTime: 0
        };

        this.segmentTiming.forEach(timing => {
            if (timing.type === 'track') {
                breakdown.trackTime += timing.duration;
            } else {
                breakdown.transportTime += timing.duration;
            }
        });

        return breakdown;
    }

    // Convert journey time to progress (0-1)
    timeToProgress(journeyTime) {
        if (this.totalDuration === 0) return 0;
        return Math.max(0, Math.min(1, journeyTime / this.totalDuration));
    }

    // Convert progress (0-1) to journey time
    progressToTime(progress) {
        return progress * this.totalDuration;
    }

    // Get current segment at given journey time
    getSegmentAtTime(journeyTime) {
        for (let i = 0; i < this.segmentTiming.length; i++) {
            const timing = this.segmentTiming[i];
            if (journeyTime >= timing.startTime && journeyTime <= timing.endTime) {
                return {
                    segment: timing,
                    segmentProgress: (journeyTime - timing.startTime) / timing.duration
                };
            }
        }
        return null;
    }

    // Utility formatting methods
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    formatDistance(distanceKm) {
        const unitPreference = typeof localStorage !== 'undefined'
            ? localStorage.getItem('trailReplayUnits')
            : 'metric';
        const useImperial = unitPreference === 'imperial';
        if (useImperial) {
            const miles = distanceKm * 0.621371;
            return `${miles.toFixed(1)} mi`;
        }
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)}m`;
        }
        return `${distanceKm.toFixed(1)}km`;
    }

    formatElevation(elevationM) {
        const unitPreference = typeof localStorage !== 'undefined'
            ? localStorage.getItem('trailReplayUnits')
            : 'metric';
        const useImperial = unitPreference === 'imperial';
        const value = useImperial ? elevationM * 3.28084 : elevationM;
        return `${Math.round(value)}${useImperial ? 'ft' : 'm'}`;
    }

    // Get current timing data
    getCurrentTiming() {
        return {
            totalDuration: this.totalDuration,
            segmentTiming: this.segmentTiming
        };
    }
} 
