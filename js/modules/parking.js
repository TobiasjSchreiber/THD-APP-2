// Parking Garage Module (Parkhaus Donau Deggendorf)
import { CONFIG } from '../config.js';
import { getParkingSkeleton } from '../helpers.js';

export async function loadParking() {
    const content = document.getElementById('widget-content-parking');
    const detail = document.getElementById('content-parking');
    if (content) content.innerHTML = getParkingSkeleton(true);
    if (detail) detail.innerHTML = getParkingSkeleton(false);
    
    try {
        const url = CONFIG.parkingApiUrl;
        const res = await fetch(CONFIG.proxyUrlBase + encodeURIComponent(url));
        
        const data = await res.json();
        const donau = data.result.find(p => p.id === 11 || p.name.includes('Donau'));
        
        if (donau) {
            const used = donau.used;
            const max = 435;
            const percent = Math.min(100, Math.round((used / max) * 100));
            
            const html = `
                <div class="big-number">${max - used}</div>
                <div class="sub-text">Freie Plätze</div>
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
                                <span class="list-desc">Aktuell belegt: ${used} (${percent}%)</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error('loadParking error:', e);
        if (content) content.innerHTML = '<div class="loading">Fehler beim Laden</div>';
    }
}
