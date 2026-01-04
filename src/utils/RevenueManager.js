/**
 * AdManager - Handles Google AdSense integration for TrailReplay
 *
 * This class manages ad display during video generation to monetize
 * the waiting time while providing a good user experience.
 *
 * Features:
 * - Delayed ad loading (only after video generation starts)
 * - Auto-refresh for long video generation sessions
 * - Clean ad removal when video completes
 * - Development mode with placeholder ads
 * - Responsive ad sizing
 */

import { ADS_CONFIG } from '../config/revenueConfig.js';

export class RevenueManager {
    constructor() {
        this.config = ADS_CONFIG;
        this.activeAds = new Map(); // Track active ad instances
        this.refreshIntervals = new Map(); // Track refresh timers
        this.adLoadDelay = null; // Timer for delayed ad loading
    }

    /**
     * Check if ads are enabled and properly configured
     */
    isEnabled() {
        return this.config.enabled && !this.isInvalidPublisherId();
    }

    /**
     * Check if publisher ID is still the placeholder
     */
    isInvalidPublisherId() {
        return this.config.publisherId === 'ca-pub-XXXXXXXXXXXXXXXX' ||
               !this.config.publisherId.startsWith('ca-pub-');
    }

    /**
     * Show ad during video generation progress
     * @param {HTMLElement} container - Container element to insert ad into
     * @param {string} adUnitKey - Key from ADS_CONFIG.adUnits (e.g., 'videoProgress')
     */
    showAd(container, adUnitKey = 'videoProgress') {
        if (!this.isEnabled()) {
            console.log('[AdManager] Ads disabled or not configured');
            return;
        }

        const adUnit = this.config.adUnits[adUnitKey];
        if (!adUnit) {
            console.error(`[AdManager] Ad unit "${adUnitKey}" not found in config`);
            return;
        }

        // Delay ad loading to avoid showing ads immediately
        const delay = (adUnit.delaySeconds || 3) * 1000;

        this.adLoadDelay = setTimeout(() => {
            this._loadAd(container, adUnitKey, adUnit);
        }, delay);
    }

    /**
     * Internal method to load and display an ad
     */
    _loadAd(container, adUnitKey, adUnit) {
        // Create ad container
        const adContainer = document.createElement('div');
        adContainer.className = 'ad-container';
        adContainer.id = `ad-${adUnitKey}`;

        if (this.config.devMode) {
            // Development mode: Show placeholder
            this._createPlaceholderAd(adContainer, adUnitKey);
        } else {
            // Production mode: Load real AdSense ad
            this._createRealAd(adContainer, adUnit);
        }

        // Insert ad into container
        container.appendChild(adContainer);

        // Track this ad instance
        this.activeAds.set(adUnitKey, adContainer);

        // Set up auto-refresh if enabled
        if (this.config.refresh.enabled) {
            this._setupAdRefresh(adUnitKey, adUnit);
        }

        console.log(`[AdManager] Ad loaded: ${adUnitKey}`);
    }

    /**
     * Create a placeholder ad for development/testing
     */
    _createPlaceholderAd(container, adUnitKey) {
        container.innerHTML = `
            <div class="ad-placeholder">
                <div class="ad-placeholder-content">
                    <p class="ad-placeholder-title">Advertisement</p>
                    <p class="ad-placeholder-subtitle">Development Mode</p>
                    <p class="ad-placeholder-info">
                        Ad unit: ${adUnitKey}<br>
                        Configure AdSense in:<br>
                        <code>src/config/adsConfig.js</code>
                    </p>
                    <p class="ad-placeholder-tips">
                        💡 Real ads will appear here when:<br>
                        1. You add your AdSense publisher ID<br>
                        2. You set devMode: false
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Create a real Google AdSense ad
     */
    _createRealAd(container, adUnit) {
        // Create AdSense ins element
        const adElement = document.createElement('ins');
        adElement.className = 'adsbygoogle';
        adElement.style.display = 'block';
        adElement.setAttribute('data-ad-client', this.config.publisherId);
        adElement.setAttribute('data-ad-slot', adUnit.slot);
        adElement.setAttribute('data-ad-format', adUnit.format);

        if (adUnit.fullWidthResponsive) {
            adElement.setAttribute('data-full-width-responsive', 'true');
        }

        // Add label
        const label = document.createElement('div');
        label.className = 'ad-label';
        label.textContent = 'Advertisement';

        container.appendChild(label);
        container.appendChild(adElement);

        // Push ad to AdSense
        try {
            if (window.adsbygoogle) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (error) {
            console.error('[AdManager] Error loading ad:', error);
        }
    }

    /**
     * Set up automatic ad refresh for long video generation
     */
    _setupAdRefresh(adUnitKey, adUnit) {
        const refreshInterval = this.config.refresh.interval * 1000;

        const intervalId = setInterval(() => {
            console.log(`[AdManager] Refreshing ad: ${adUnitKey}`);
            this._refreshAd(adUnitKey, adUnit);
        }, refreshInterval);

        this.refreshIntervals.set(adUnitKey, intervalId);
    }

    /**
     * Refresh an existing ad
     */
    _refreshAd(adUnitKey, adUnit) {
        const container = this.activeAds.get(adUnitKey);
        if (!container) return;

        // Clear existing ad content
        container.innerHTML = '';

        // Reload ad
        if (this.config.devMode) {
            this._createPlaceholderAd(container, adUnitKey);
        } else {
            this._createRealAd(container, adUnit);
        }
    }

    /**
     * Remove a specific ad
     * @param {string} adUnitKey - Key of the ad unit to remove
     */
    removeAd(adUnitKey) {
        // Clear refresh interval
        const intervalId = this.refreshIntervals.get(adUnitKey);
        if (intervalId) {
            clearInterval(intervalId);
            this.refreshIntervals.delete(adUnitKey);
        }

        // Remove ad element
        const adContainer = this.activeAds.get(adUnitKey);
        if (adContainer && adContainer.parentNode) {
            adContainer.parentNode.removeChild(adContainer);
        }

        this.activeAds.delete(adUnitKey);
        console.log(`[AdManager] Ad removed: ${adUnitKey}`);
    }

    /**
     * Remove all active ads and clear timers
     */
    removeAllAds() {
        // Clear delayed ad loading
        if (this.adLoadDelay) {
            clearTimeout(this.adLoadDelay);
            this.adLoadDelay = null;
        }

        // Remove all active ads
        for (const adUnitKey of this.activeAds.keys()) {
            this.removeAd(adUnitKey);
        }

        console.log('[AdManager] All ads removed');
    }

    /**
     * Get revenue estimate based on impressions
     * @param {number} impressions - Number of ad impressions
     * @param {number} cpm - Cost per 1000 impressions (default: $5 for fitness niche)
     * @returns {number} Estimated revenue
     */
    static estimateRevenue(impressions, cpm = 5) {
        return (impressions / 1000) * cpm;
    }

    /**
     * Log ad performance metrics (for debugging)
     */
    logMetrics() {
        console.log('[AdManager] Metrics:', {
            enabled: this.isEnabled(),
            devMode: this.config.devMode,
            activeAds: this.activeAds.size,
            activeRefreshIntervals: this.refreshIntervals.size
        });
    }
}

// Create singleton instance
export const revenueManager = new RevenueManager();
