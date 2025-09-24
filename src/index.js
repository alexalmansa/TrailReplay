import { TrailReplayApp } from './core/TrailReplayApp.js';
import { AnalyticsTracker } from './utils/analytics.js';
import { GA4_MEASUREMENT_ID, shouldEnableAnalytics, ANALYTICS_CONFIG } from './config/analytics.js';
import { CookieConsentManager } from './ui/cookieConsent.js';
import { setupFeedbackForm } from './ui/feedback.js';
import { initializeTranslations, setLanguage } from './translations.js';

// Global language initialization function
function initializeLanguageSwitcher() {
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    // Set current language as selected
    const lang = localStorage.getItem('trailReplayLang') || navigator.language.slice(0,2) || 'en';
    languageSelect.value = lang.startsWith('es') ? 'es' : lang.startsWith('ca') ? 'ca' : 'en';

    // Add event listener for language changes
    languageSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }
}

// Make language functions globally accessible
window.initializeLanguageSwitcher = initializeLanguageSwitcher;
window.setLanguage = setLanguage;
window.initializeTranslations = initializeTranslations;

window.addEventListener('DOMContentLoaded', async () => {
  // Initialize translations first
  initializeTranslations();
  
  // Initialize Google Analytics 4 if enabled
  if (shouldEnableAnalytics()) {
    AnalyticsTracker.init(GA4_MEASUREMENT_ID);
    
    // Always enable analytics (no consent check)
    AnalyticsTracker.setEnabled(true);
    
    // Track page view for all users
    AnalyticsTracker.track('page_view', {
      page_title: document.title,
      page_location: window.location.href
    });
  } else {
    console.log('📊 Analytics disabled (check config/analytics.js)');
  }
  
  const app = new TrailReplayApp();
  window.app = app; // Make app globally accessible
  await app.init();
  
  // Wire feedback form after header/footer load
  setupFeedbackForm();
  
  // Initialize language switcher after a small delay to ensure footer is loaded
  setTimeout(initializeLanguageSwitcher, 100);
}); 