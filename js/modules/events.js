// THD Events / Veranstaltungskalender Module
import { CONFIG } from '../config.js';
import { parseICal, getEventsSkeleton } from '../helpers.js';

export async function loadEvents() {
    const content = document.getElementById('widget-content-events');
    const detail = document.getElementById('content-events');
    if (content) content.innerHTML = getEventsSkeleton(true);
    if (detail) detail.innerHTML = getEventsSkeleton(false);
    
    try {
        const targetUrl = CONFIG.thdEventsUrl;
        const res = await fetch(CONFIG.proxyUrlBase + encodeURIComponent(targetUrl));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        
        const html = await res.text();
        const ids = [];
        const regex = /(?:oldEvent_|eventid=|id="event)(\d+)/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            if (!ids.includes(match[1])) ids.push(match[1]);
        }
        
        const limitIds = ids.slice(0, 8);
        const fetchPromises = limitIds.map(async (id) => {
            try {
                const iCalUrl = `${CONFIG.thdICalExportBase}${id}`;
                const r = await fetch(CONFIG.proxyUrlBase + encodeURIComponent(iCalUrl));
                if (r.ok) {
                    const iCalText = await r.text();
                    return parseICal(iCalText);
                }
            } catch (err) {
                console.warn('Fehler beim Abrufen von Event', id, err);
            }
            return [];
        });

        const results = await Promise.all(fetchPromises);
        const events = [];
        results.forEach(parsed => events.push(...parsed));
        
        renderEventsToUi(events, content, detail, 'Events');
    } catch (e) {
        console.error('loadEvents error:', e);
        if (content) content.innerHTML = '<div class="loading">Fehler beim Laden</div>';
        if (detail) detail.innerHTML = '<div class="loading">Fehler beim Laden</div>';
    }
}

export function renderEventsToUi(events, content, detail, emptyMsg) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let validEvents = events.filter(e => e.start >= now);
    if (validEvents.length === 0 && events.length > 0) {
        validEvents = events;
    }
    
    if (validEvents.length === 0) {
        const msg = `<div class="loading">Keine ${emptyMsg} gefunden</div>`;
        if (content) content.innerHTML = msg;
        if (detail) detail.innerHTML = msg;
        return;
    }
    
    let html = '';
    validEvents.forEach(e => {
        const time = e.start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const date = e.start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        html += `
            <div class="list-item">
                <span class="list-title">${e.summary.substring(0, 30)}${e.summary.length > 30 ? '...' : ''}</span>
                <span class="list-desc">${date} ${time} ${e.location ? '| ' + e.location : ''}</span>
            </div>
        `;
    });
    if (content) content.innerHTML = html;
    
    let detailHtml = '<div style="padding: 10px 0;">';
    validEvents.forEach(e => {
        const time = e.start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const date = e.start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        detailHtml += `
            <div class="card-item">
                <div class="card-item-header">
                    <span class="time-tag">${date} um ${time} Uhr</span>
                    ${e.location ? `<span class="badge-tag">${e.location}</span>` : ''}
                </div>
                <span class="list-title" style="font-size: 17px; margin-top: 2px;">${e.summary}</span>
            </div>
        `;
    });
    detailHtml += '</div>';
    if (detail) detail.innerHTML = detailHtml;
}
