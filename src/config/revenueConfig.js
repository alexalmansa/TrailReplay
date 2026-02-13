/**
 * Google AdSense Configuration
 *
 * To use this configuration:
 * 1. Sign up for Google AdSense at https://www.google.com/adsense
 * 2. Get your publisher ID (ca-pub-XXXXXXXXXXXXXXXX)
 * 3. Create ad units in your AdSense dashboard
 * 4. Replace the placeholder values below with your actual AdSense data
 */

export const ADS_CONFIG = {
    // Your Google AdSense Publisher ID
    // Get this from: https://www.google.com/adsense -> Account -> Account information
    publisherId: 'ca-pub-1913702280528809', // Your actual publisher ID

    // Enable or disable ads globally
    enabled: true,

    // Ad units configuration
    adUnits: {
        // Ad shown during video generation progress
        videoProgress: {
            // Ad slot ID from your AdSense dashboard
            slot: '4179772714', // Your actual ad unit ID
            format: 'auto',
            fullWidthResponsive: true,
            // Ad will be shown after this many seconds of video generation
            delaySeconds: 3
        },

        // Optional: Sidebar ad (for future use)
        sidebar: {
            slot: 'XXXXXXXXXX', // Replace with your ad unit ID
            format: 'vertical',
            fullWidthResponsive: false
        }
    },

    // Ad refresh settings
    refresh: {
        // Refresh ads during long video generation (in seconds)
        // Note: Disabled to prevent AdSense duplicate element errors
        enabled: false,
        interval: 45 // Refresh every 45 seconds during video generation
    },

    // Targeting settings for better ad relevance
    targeting: {
        interests: ['fitness', 'running', 'cycling', 'outdoor', 'sports', 'technology'],
        contentCategory: 'sports_fitness'
    },

    // Development mode (shows placeholder instead of real ads)
    devMode: false // Set to false when you have real AdSense approval - NOW LIVE!
};

/**
 * Instructions for setup:
 *
 * 1. Create a Google AdSense account:
 *    - Go to https://www.google.com/adsense
 *    - Sign up with your Google account
 *    - Add your website URL (trailreplay.com or your domain)
 *
 * 2. Get approved (usually takes 1-2 weeks):
 *    - AdSense will review your site
 *    - Make sure you have privacy policy, about page, contact info
 *    - Need consistent traffic (your 4.8k users is good!)
 *
 * 3. Create ad units:
 *    - In AdSense dashboard: Ads → By ad unit → Display ads
 *    - Create a "Responsive" display ad
 *    - Name it "Video Progress Ad"
 *    - Copy the "data-ad-slot" value (it's a 10-digit number)
 *
 * 4. Update this config:
 *    - Replace publisherId with your ca-pub-XXXXXXXXXXXXXXXX
 *    - Replace adUnits.videoProgress.slot with your ad slot ID
 *    - Set devMode to false
 *
 * 5. Add AdSense code to your site:
 *    - Copy the AdSense script tag
 *    - Add it to app-v1.html (we'll do this in next step)
 */
