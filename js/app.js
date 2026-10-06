// Main Application Bootstrapper
import { state, loadSavedState } from './state.js';
import { setupNavigationListeners } from './navigation.js';
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

// Global Data Fetcher
export async function fetchData() {
    if (state.widgets.find(w => w.id === 'parking' && w.enabled)) loadParking();
    if (state.widgets.find(w => w.id === 'weather' && w.enabled)) loadWeather();
    if (state.widgets.find(w => w.id === 'mensa' && w.enabled)) loadMensaForDate(state.currentMensaDate);
    if (state.widgets.find(w => w.id === 'events' && w.enabled)) loadEvents();
    if (state.widgets.find(w => w.id === 'webcam' && w.enabled)) loadWebcam();
    if (state.widgets.find(w => w.id === 'schedule' && w.enabled)) loadSchedule();
}

// App Initialization
function initApp() {
    loadSavedState();
    setFetchDataCallback(fetchData);

    setupNavigationListeners();
    setupMensaListeners();
    setupScheduleListeners();
    setupWebcamListeners();
    setupSettingsListeners();

    renderSettings();
    renderDashboard();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
