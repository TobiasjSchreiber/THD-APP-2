// Parking Garage Module (Parkhaus Donau Deggendorf)
import { CONFIG } from '../config.js';
import { getParkingSkeleton } from '../helpers.js';

export async function loadParking() {
    const content = document.getElementById('widget-content-parking');
    const detail = document.getElementById('content-parking');
    
    let hasValidCache = false;
    const cachedStr = localStorage.getItem('thd_cache_parking');
    if (cachedStr) {
        try {
            const parsed = JSON.parse(cachedStr);
            if (Date.now() - parsed.ts < 24 * 60 * 60 * 1000) {
                hasValidCache = true;
                renderParking(content, detail, parsed.data);
            }
        } catch(e) {}
    }

    if (content && !hasValidCache) content.innerHTML = getParkingSkeleton(true);
    if (detail && !hasValidCache) detail.innerHTML = getParkingSkeleton(false);
    
    // Background update
    const url = CONFIG.parkingApiUrl;
    fetch(CONFIG.proxyUrlBase + encodeURIComponent(url))
        .then(res => res.json())
        .then(data => {
            const donau = data.result.find(p => p.id === 11 || p.name.includes('Donau'));
            if (donau) {
                localStorage.setItem('thd_cache_parking', JSON.stringify({ ts: Date.now(), data: donau }));
                renderParking(content, detail, donau);
            }
        })
        .catch(e => {
            console.error('loadParking error:', e);
            if (!hasValidCache && content) content.innerHTML = '<div class="loading">Fehler beim Laden</div>';
        });
}

function renderParking(content, detail, donau) {
    if (!donau) return;
    const used = donau.used;
    const max = 435;
    const percent = Math.min(100, Math.round((used / max) * 100));
    
    const html = `
        <div class="big-number">${used}</div>
        <div class="sub-text">Belegte Plätze</div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%"></div></div>
    `;
    if (content) content.innerHTML = html;
    if (detail) {
        detail.innerHTML = `
            <div style="padding: 10px 0;">
                ${html}
                <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 8px;">
                    <div class="card-item">
                        <span class="list-title">Parkhaus Donau</span>
                        <span class="list-desc">Gesamtplätze: ${max}</span>
                        <span class="list-desc">Aktuell frei: ${max - used} (${100 - percent}%)</span>
                    </div>
                </div>
            </div>
        `;
    }
}
