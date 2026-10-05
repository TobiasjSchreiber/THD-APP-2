// THD Campus Webcam Module (Reliable Auto-Refresh, GC-Drop Prevention & Detail View)
import { CONFIG } from '../config.js';
import { state } from '../state.js';

// Strong reference to prevent garbage-collection while loading
let activeLoaderImage = null;
let loaderTimeoutId = null;
let refreshIntervalId = null;
let isFetching = false;
let currentWebcamUrl = '';

export function getFormattedTime(date = new Date()) {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function refreshWebcam(isManual = false) {
    if (isFetching && !isManual) return;

    const timestamp = Date.now();
    const newSrc = `${CONFIG.webcamUrl}?t=${timestamp}`;
    
    // Clear any pending timeout
    if (loaderTimeoutId) {
        clearTimeout(loaderTimeoutId);
        loaderTimeoutId = null;
    }

    isFetching = true;

    // UI elements
    const widgetContent = document.getElementById('widget-content-webcam');
    const detailImg = document.getElementById('webcam-img-detail');
    const detailShimmer = document.getElementById('webcam-detail-shimmer');
    const detailError = document.getElementById('webcam-detail-error');
    const detailTime = document.getElementById('webcam-detail-time');
    const statusText = document.getElementById('webcam-status-text');
    const refreshBtn = document.getElementById('btn-refresh-webcam');

    if (refreshBtn) refreshBtn.classList.add('is-spinning');
    if (statusText) statusText.textContent = 'Aktualisiere Live-Bild...';

    // 12-second safety timeout
    loaderTimeoutId = setTimeout(() => {
        if (isFetching) {
            console.warn('[Webcam] Timeout beim Laden des Bildes.');
            isFetching = false;
            activeLoaderImage = null;
            if (refreshBtn) refreshBtn.classList.remove('is-spinning');
            if (statusText) statusText.textContent = 'Aktualisierung dauerte zu lange';
            
            // If we don't have any image yet, show error box
            if (!currentWebcamUrl && detailError) {
                if (detailShimmer) detailShimmer.style.display = 'none';
                detailError.style.display = 'flex';
            }
        }
    }, 12000);

    // Persistent loader stored in module scope so Garbage Collector won't abort
    activeLoaderImage = new Image();

    activeLoaderImage.onload = () => {
        if (loaderTimeoutId) {
            clearTimeout(loaderTimeoutId);
            loaderTimeoutId = null;
        }
        isFetching = false;
        currentWebcamUrl = newSrc;
        state.lastWebcamUpdate = new Date();

        const timeStr = getFormattedTime(state.lastWebcamUpdate);

        // 1. Update Widget Content (full-bleed image without live badge or time)
        if (widgetContent) {
            widgetContent.innerHTML = `
                <div class="webcam-widget-card" id="webcam-widget-interactive">
                    <img src="${newSrc}" class="webcam-widget-img" alt="THD Campus Webcam">
                </div>
            `;
        }

        // 2. Update Detail Subpage
        if (detailImg) {
            detailImg.src = newSrc;
            detailImg.style.display = 'block';
            if (detailShimmer) detailShimmer.style.display = 'none';
            if (detailError) detailError.style.display = 'none';
        }
        if (statusText) {
            statusText.textContent = `Stand: ${timeStr} Uhr`;
        }
        if (refreshBtn) {
            refreshBtn.classList.remove('is-spinning');
        }

        activeLoaderImage = null;
    };

    let retryAttempted = false;

    activeLoaderImage.onerror = (err) => {
        if (!retryAttempted) {
            retryAttempted = true;
            console.warn('[Webcam] Erster Versuch fehlgeschlagen, lade direkt...');
            activeLoaderImage.src = CONFIG.webcamUrl;
            return;
        }

        if (loaderTimeoutId) {
            clearTimeout(loaderTimeoutId);
            loaderTimeoutId = null;
        }
        isFetching = false;
        console.warn('[Webcam] Fehler beim Laden des Webcam-Bildes:', err);

        if (refreshBtn) refreshBtn.classList.remove('is-spinning');
        if (statusText) statusText.textContent = 'Verbindungsfehler';

        // If we have no image loaded yet in widget
        if (!currentWebcamUrl && widgetContent) {
            widgetContent.innerHTML = `
                <div class="webcam-widget-card webcam-error-card" id="webcam-widget-retry">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px; opacity: 0.6;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    <span style="font-size: 11px; color: var(--text-muted);">Webcam offline</span>
                    <span style="font-size: 10px; color: var(--accent-light);">Tippen zum Neuladen</span>
                </div>
            `;
            const retryBtn = document.getElementById('webcam-widget-retry');
            if (retryBtn) retryBtn.onclick = (e) => {
                e.stopPropagation();
                refreshWebcam(true);
            };
        }

        if (!currentWebcamUrl && detailError) {
            if (detailShimmer) detailShimmer.style.display = 'none';
            detailError.style.display = 'flex';
        }

        activeLoaderImage = null;
    };

    activeLoaderImage.src = newSrc;
}

export function startWebcamAutoRefresh() {
    stopWebcamAutoRefresh();
    // Refresh every 25 seconds when app is active
    refreshIntervalId = setInterval(() => {
        if (!document.hidden) {
            refreshWebcam();
        }
    }, 25000);
}

export function stopWebcamAutoRefresh() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
    }
}

export function loadWebcam() {
    const widgetContent = document.getElementById('widget-content-webcam');
    if (widgetContent && !currentWebcamUrl) {
        widgetContent.innerHTML = `
            <div class="webcam-widget-card loading-card">
                <div class="shimmer-box" style="position: absolute; inset: 0;"></div>
            </div>
        `;
    }

    refreshWebcam();
    startWebcamAutoRefresh();
}

export function setupWebcamListeners() {
    // Visibility change handler: pause on background, refresh on resume
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopWebcamAutoRefresh();
        } else {
            refreshWebcam(true);
            startWebcamAutoRefresh();
        }
    });

    // Manual refresh button on subpage
    const refreshBtn = document.getElementById('btn-refresh-webcam');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => refreshWebcam(true));
    }

    // Retry button on subpage error
    const retryBtn = document.getElementById('btn-webcam-retry');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => refreshWebcam(true));
    }
}
