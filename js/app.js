// Main Application Bootstrapper
import { state, loadSavedState } from './state.js';
import { setupNavigationListeners, updateSubpageHeader, syncDatesAndRefresh } from './navigation.js';
import { renderDashboard, renderSettings, setupSettingsListeners, setFetchDataCallback } from './dashboard.js';
import { loadParking } from './modules/parking.js';
import { loadMensaForDate, setupMensaListeners } from './modules/mensa.js';
import { loadSchedule, setupScheduleListeners } from './modules/schedule.js';
import { loadEvents } from './modules/events.js';
import { loadWebcam, setupWebcamListeners } from './modules/webcam.js';
import { loadWeather } from './modules/weather.js';

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
}

// Global Data Fetcher (Stale-While-Revalidate: fetch in background without wiping UI)
export async function fetchData() {
    if (state.widgets.find(w => w.id === 'parking' && w.enabled)) loadParking();
    if (state.widgets.find(w => w.id === 'weather' && w.enabled)) loadWeather();
    if (state.widgets.find(w => w.id === 'mensa' && w.enabled)) loadMensaForDate(state.currentMensaDate);
    if (state.widgets.find(w => w.id === 'events' && w.enabled)) loadEvents();
    if (state.widgets.find(w => w.id === 'webcam' && w.enabled)) loadWebcam();
    if (state.widgets.find(w => w.id === 'schedule' && w.enabled)) loadSchedule();
}

let lastCheckedDay = new Date().toDateString();

function handleAppResumeOrDayChange() {
    const todayStr = new Date().toDateString();
    lastCheckedDay = todayStr;
    syncDatesAndRefresh(fetchData);
}

// 1. App resume handler when tab or PWA comes back from background (un-suspending)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        handleAppResumeOrDayChange();
    }
});

// 2. Window focus & pageshow handlers (e.g. bfcache resume)
window.addEventListener('pageshow', handleAppResumeOrDayChange);
window.addEventListener('focus', handleAppResumeOrDayChange);

// 3. Periodic midnight rollover check (every 30 seconds) to catch the date rolling over
setInterval(() => {
    const currentTodayStr = new Date().toDateString();
    if (currentTodayStr !== lastCheckedDay) {
        handleAppResumeOrDayChange();
    }
}, 30000);

// App Initialization
function initApp() {
    loadSavedState();

    // Always start on today's current date
    state.currentScheduleDate = new Date();
    state.currentMensaDate = new Date();

    setFetchDataCallback(fetchData);

    setupNavigationListeners();
    setupMensaListeners();
    setupScheduleListeners();
    setupWebcamListeners();
    setupSettingsListeners();

    renderSettings();
    renderDashboard();

    // Initialize headers for subpages right away
    updateSubpageHeader('schedule');
    updateSubpageHeader('mensa');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
