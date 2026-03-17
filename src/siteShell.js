import { GA4_MEASUREMENT_ID, shouldEnableAnalytics } from './config/analytics.js';
import { initializeLanguageSwitcher, initializeTranslations, setLanguage } from './translations.js';
import { AnalyticsTracker } from './utils/analytics.js';

async function injectPartial(targetId, fileName) {
    const container = document.getElementById(targetId);
    if (!container) return;

    const response = await fetch(`/${fileName}`);
    container.innerHTML = await response.text();
}

function initializeAnalytics() {
    if (!shouldEnableAnalytics()) {
        return;
    }

    AnalyticsTracker.init(GA4_MEASUREMENT_ID);
    AnalyticsTracker.setEnabled(true);
    AnalyticsTracker.track('page_view', {
        page_title: document.title,
        page_location: window.location.href,
    });
}

export async function initStaticPage({
    loadHeader = true,
    loadFooter = true,
} = {}) {
    window.initializeTranslations = initializeTranslations;
    window.initializeLanguageSwitcher = initializeLanguageSwitcher;
    window.setLanguage = setLanguage;
    window.trackDonationClick = (location = 'shell') => {
        AnalyticsTracker.trackDonationClick('ko-fi', location);
    };

    initializeAnalytics();

    const tasks = [];
    if (loadHeader) tasks.push(injectPartial('header', 'header.html'));
    if (loadFooter) tasks.push(injectPartial('footer', 'footer.html'));
    await Promise.all(tasks);

    initializeTranslations();
    initializeLanguageSwitcher();
}
