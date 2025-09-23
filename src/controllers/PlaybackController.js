import { AnalyticsTracker } from '../utils/analytics.js';
import { FeedbackSolicitation } from '../ui/feedbackSolicitation.js';

export class PlaybackController {
    constructor(app) {
        this.app = app;
        // Prevent double-starts while waiting for tiles
        this.isPreparingPlayback = false;
    }

    toggle() {
        if (this.app.state.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    async play() {
        if (!this.app.currentTrackData && !this.app.journeyData) {
            console.warn('No track data loaded');
            return;
        }

        // Avoid duplicate play requests while preparing
        if (this.isPreparingPlayback || this.app.state.isPlaying) {
            return;
        }

        this.isPreparingPlayback = true;

        // Track playback action
        const duration = this.getTrackDuration();
        AnalyticsTracker.trackPlayback('play', duration);

        // Track activity for feedback solicitation
        FeedbackSolicitation.trackActivity('play');

        // Immediately mark as playing and update UI (no tile loading wait)
        this.app.state.isPlaying = true;
        this.app.isPlaying = true; // Legacy compatibility

        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.innerHTML = '<i class="fa fa-pause"></i> Pause';
        }

        // Start the animation through map controller right away
        if (this.app.map && this.app.map.mapRenderer) {
            this.app.map.mapRenderer.startAnimation();
            this.app.startProgressUpdate();
        }

        this.isPreparingPlayback = false;
    }

    pause() {
        // Track playback action
        AnalyticsTracker.trackPlayback('pause');

        // Track activity for feedback solicitation
        FeedbackSolicitation.trackActivity('pause');

        this.app.state.isPlaying = false;
        this.app.isPlaying = false; // Legacy compatibility
        
        // Update UI
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.innerHTML = '<i class="fa fa-play"></i> Play';
        }

        // Stop the animation through map controller
        if (this.app.map && this.app.map.mapRenderer) {
            this.app.map.mapRenderer.stopAnimation();
        }
    }

    reset() {
        // Track playback action
        AnalyticsTracker.trackPlayback('reset');

        // Track activity for feedback solicitation
        FeedbackSolicitation.trackActivity('reset');

        this.pause();
        
        // Exit manual recording mode if active
        if (this.app.videoExporter && this.app.videoExporter.currentExportMode === 'manual' && this.app.videoExporter.isExporting) {
            console.log('Reset: Automatically exiting manual recording mode');
            this.app.videoExporter.cleanup();
            this.app.showMessage('Manual recording mode exited', 'info');
        }
        
        // Reset animation through map controller
        if (this.app.map && this.app.map.mapRenderer) {
            this.app.map.mapRenderer.resetAnimation();
        }

        // Reset stats
        this.app.stats.resetLiveStats();
        
        // Update progress display
        this.app.updateProgressDisplay();
        
        // Update elevation progress
        this.app.updateElevationProgress(0, { force: true });
    }

    /**
     * Get track duration for analytics
     * @returns {number} Duration in seconds
     */
    getTrackDuration() {
        try {
            if (this.app.currentTrackData && this.app.currentTrackData.stats) {
                return this.app.currentTrackData.stats.totalTime || 0;
            }
            if (this.app.journeyData && this.app.journeyData.stats) {
                return this.app.journeyData.stats.totalTime || 0;
            }
            return 0;
        } catch (error) {
            console.warn('Error getting track duration for analytics:', error);
            return 0;
        }
    }
} 
