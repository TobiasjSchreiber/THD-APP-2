// THD Wetter Module
// Datenquelle: Open-Meteo (https://open-meteo.com) – kostenlos, ohne API-Key,
// Wetterdaten lizenziert unter CC BY 4.0 (Quellenangabe erforderlich).
import { CONFIG } from '../config.js';

let cache = { data: null, ts: 0 };

// ---------- Flat SVG Icons (no gradients, no gloss) ----------
const C = {
    sun: '#FFC94D',
    moon: '#E8E4D8',
    cloud: '#FFFFFF',
    cloudDark: '#C9D2DC',
    rain: '#7FC4FF',
    snow: '#FFFFFF',
    bolt: '#FFD43B',
    fog: 'rgba(255,255,255,0.85)'
};

const sunShape = (cx = 32, cy = 32, r = 11) => {
    let rays = '';
    for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const x1 = cx + Math.cos(a) * (r + 5), y1 = cy + Math.sin(a) * (r + 5);
        const x2 = cx + Math.cos(a) * (r + 10), y2 = cy + Math.sin(a) * (r + 10);
        rays += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${C.sun}" stroke-width="3.5" stroke-linecap="round"/>`;
    }
    return `${rays}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.sun}"/>`;
};
const moonShape = (cx = 32, cy = 32, r = 16) => {
    const s = r / 16;
    return `<path transform="translate(${(cx - 32 * s).toFixed(1)} ${(cy - 32 * s).toFixed(1)}) scale(${s.toFixed(3)})" d="M36 15a17 17 0 1 0 13 27 13.5 13.5 0 0 1-13-27z" fill="${C.moon}"/>`;
};
const cloudShape = (fill = C.cloud, dx = 0, dy = 0) =>
    `<path transform="translate(${dx} ${dy})" d="M20 50h26a10 10 0 0 0 0-20 14 14 0 0 0-27-3 11.5 11.5 0 0 0 1 23z" fill="${fill}"/>`;
const drops = () =>
    [22, 32, 42].map(x => `<line x1="${x}" y1="54" x2="${x - 3}" y2="61" stroke="${C.rain}" stroke-width="3.5" stroke-linecap="round"/>`).join('');
const flakes = () =>
    [22, 32, 42].map(x => `<circle cx="${x}" cy="57" r="2.8" fill="${C.snow}"/>`).join('');
const bolt = () => `<path d="M34 44l-8 11h6l-3 8 10-12h-6l3-7z" fill="${C.bolt}"/>`;

function svg(inner) {
    return `<svg class="wx-icon" viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
}

function iconFor(type, isDay = true) {
    const celestial = isDay ? sunShape(24, 24, 9) : moonShape(26, 22, 11);
    switch (type) {
        case 'clear': return svg(isDay ? sunShape() : moonShape());
        case 'partly': return svg(celestial + cloudShape(C.cloud, 4, 6));
        case 'cloudy': return svg(cloudShape(C.cloudDark, -6, -6) + cloudShape(C.cloud, 2, 4));
        case 'fog': return svg(cloudShape(C.cloud, 0, -6) +
            `<line x1="14" y1="52" x2="50" y2="52" stroke="${C.fog}" stroke-width="3.5" stroke-linecap="round"/>` +
            `<line x1="20" y1="59" x2="44" y2="59" stroke="${C.fog}" stroke-width="3.5" stroke-linecap="round"/>`);
        case 'drizzle':
        case 'rain': return svg(cloudShape(C.cloud, 0, -6) + drops());
        case 'showers': return svg(celestial + cloudShape(C.cloud, 2, -2) + drops());
        case 'snow': return svg(cloudShape(C.cloud, 0, -6) + flakes());
        case 'thunder': return svg(cloudShape(C.cloudDark, 0, -8) + bolt());
        default: return svg(cloudShape());
    }
}

// WMO Weather interpretation codes
function describe(code) {
    if (code === 0) return { type: 'clear', text: 'Klar' };
    if (code === 1) return { type: 'partly', text: 'Überwiegend klar' };
    if (code === 2) return { type: 'partly', text: 'Teils bewölkt' };
    if (code === 3) return { type: 'cloudy', text: 'Bedeckt' };
    if (code === 45 || code === 48) return { type: 'fog', text: 'Nebel' };
    if (code >= 51 && code <= 57) return { type: 'drizzle', text: 'Nieselregen' };
    if (code >= 61 && code <= 67) return { type: 'rain', text: code >= 65 ? 'Starker Regen' : 'Regen' };
    if (code >= 71 && code <= 77) return { type: 'snow', text: 'Schnee' };
    if (code >= 80 && code <= 82) return { type: 'showers', text: 'Regenschauer' };
    if (code === 85 || code === 86) return { type: 'snow', text: 'Schneeschauer' };
    if (code >= 95) return { type: 'thunder', text: 'Gewitter' };
    return { type: 'cloudy', text: '–' };
}

const r = v => Math.round(v);

// ---------- Data ----------
async function fetchWeather() {
    const { lat, lon } = CONFIG.weatherLocation;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m' +
        '&hourly=temperature_2m,weather_code,precipitation_probability,is_day' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
        '&timezone=Europe%2FBerlin&forecast_days=7';
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    cache = { data, ts: Date.now() };
    localStorage.setItem('thd_cache_weather', JSON.stringify(cache));
    return data;
}

// ---------- Render ----------
function renderWidget(content, d) {
    const cur = d.current;
    const info = describe(cur.weather_code);
    
    const now = Date.now();
    const startIdx = Math.max(0, d.hourly.time.findIndex(t => new Date(t).getTime() + 3600000 > now));
    let nextRainHours = -1;
    let nextRainText = '';
    
    for (let i = startIdx; i < Math.min(startIdx + 12, d.hourly.time.length); i++) {
        const hi = describe(d.hourly.weather_code[i]);
        if (hi.type === 'rain' || hi.type === 'showers' || hi.type === 'drizzle' || hi.type === 'snow' || hi.type === 'thunder') {
            nextRainHours = i - startIdx;
            nextRainText = hi.text;
            break;
        }
    }
    
    let line4Text = '';
    let line4Muted = '';
    let line5 = '';

    if (info.type === 'rain' || info.type === 'showers' || info.type === 'drizzle' || info.type === 'snow' || info.type === 'thunder') {
        line4Text = info.text;
        line4Muted = 'jetzt';
    } else if (nextRainHours > 0) {
        line4Text = nextRainText;
        line4Muted = 'in';
        line5 = `<div class="wt-line"><span class="wt-bold">${nextRainHours} Std.</span></div>`;
    } else {
        line4Text = info.text;
        line4Muted = 'heute';
    }

    content.innerHTML = `
        <div class="weather-text-widget">
            <div class="wt-line"><span class="wt-bold">${r(cur.temperature_2m)}°</span><span class="wt-space"></span><span class="wt-muted">jetzt</span></div>
            <div class="wt-line"><span class="wt-muted">in</span><span class="wt-space"></span><span class="wt-bold">Deggendorf</span></div>
            <div class="wt-line"><span class="wt-muted">gefühlt</span><span class="wt-space"></span><span class="wt-bold">${r(cur.apparent_temperature)}°</span></div>
            <div class="wt-line wt-icon-line">
                <div class="wt-icon-wrap">${iconFor(info.type, cur.is_day === 1)}</div>
                <span class="wt-bold">${line4Text}</span><span class="wt-space"></span><span class="wt-muted">${line4Muted}</span>
            </div>
            ${line5}
        </div>
    `;
}

function renderDetail(detail, d) {
    const cur = d.current;
    const info = describe(cur.weather_code);
    const now = Date.now();

    // Next 24 hours
    const startIdx = Math.max(0, d.hourly.time.findIndex(t => new Date(t).getTime() + 3600000 > now));
    let hours = '';
    for (let i = startIdx; i < Math.min(startIdx + 24, d.hourly.time.length); i++) {
        const t = new Date(d.hourly.time[i]);
        const hi = describe(d.hourly.weather_code[i]);
        const p = d.hourly.precipitation_probability[i];
        hours += `
            <div class="weather-hour">
                <span class="weather-hour-time">${i === startIdx ? 'Jetzt' : t.getHours() + ' Uhr'}</span>
                ${iconFor(hi.type, d.hourly.is_day[i] === 1)}
                <span class="weather-hour-temp">${r(d.hourly.temperature_2m[i])}°</span>
                <span class="weather-hour-rain">${p >= 10 ? p + '%' : '&nbsp;'}</span>
            </div>`;
    }

    // 7 days
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    let days = '';
    d.daily.time.forEach((t, i) => {
        const di = describe(d.daily.weather_code[i]);
        const p = d.daily.precipitation_probability_max[i];
        days += `
            <div class="weather-day-row">
                <span class="weather-day-name">${i === 0 ? 'Heute' : dayNames[new Date(t).getDay()]}</span>
                ${iconFor(di.type, true)}
                <span class="weather-day-rain">${p >= 10 ? p + '%' : ''}</span>
                <span class="weather-day-temps">${r(d.daily.temperature_2m_max[i])}°<span>${r(d.daily.temperature_2m_min[i])}°</span></span>
            </div>`;
    });

    detail.innerHTML = `
        <div class="weather-detail">
            <div class="weather-hero">
                ${iconFor(info.type, cur.is_day === 1)}
                <div>
                    <div class="weather-hero-temp">${r(cur.temperature_2m)}°</div>
                    <div class="weather-hero-desc">${info.text} · Gefühlt ${r(cur.apparent_temperature)}°</div>
                </div>
            </div>
            <div class="weather-stats">
                <div class="card-item"><span class="sub-text">Wind</span><span class="list-title">${r(cur.wind_speed_10m)} km/h</span></div>
                <div class="card-item"><span class="sub-text">Luftfeuchte</span><span class="list-title">${r(cur.relative_humidity_2m)} %</span></div>
            </div>
            <div class="weather-section-title">Stündlich</div>
            <div class="weather-hourly">${hours}</div>
            <div class="weather-section-title">7 Tage</div>
            <div class="card-item weather-daily">${days}</div>
            <p class="weather-source">Wetterdaten: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a> (CC BY 4.0)</p>
        </div>
    `;
}

export async function loadWeather() {
    const content = document.getElementById('widget-content-weather');
    const detail = document.getElementById('content-weather');
    
    let hasValidCache = false;
    const cachedStr = localStorage.getItem('thd_cache_weather');
    if (cachedStr) {
        try {
            const parsed = JSON.parse(cachedStr);
            if (Date.now() - parsed.ts < 24 * 60 * 60 * 1000) {
                cache = parsed;
                hasValidCache = true;
            }
        } catch(e) {}
    }

    if (content && !hasValidCache) content.innerHTML = '<div class="loading">Lädt...</div>';
    if (detail && !hasValidCache) detail.innerHTML = '<div class="loading">Lädt...</div>';

    if (hasValidCache && cache.data) {
        if (content) renderWidget(content, cache.data);
        if (detail) renderDetail(detail, cache.data);
        const status = document.getElementById('weather-status-text');
        if (status) {
            const t = new Date(cache.ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            status.textContent = `Campus · Aktualisiert ${t}`;
        }
    }

    // Background update
    fetchWeather().then(d => {
        if (content) renderWidget(content, d);
        if (detail) renderDetail(detail, d);
        const status = document.getElementById('weather-status-text');
        if (status) {
            const t = new Date(cache.ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            status.textContent = `Campus · Aktualisiert ${t}`;
        }
    }).catch(e => {
        console.error('loadWeather error:', e);
        if (!hasValidCache) {
            if (content) content.innerHTML = '<div class="loading">Fehler beim Laden</div>';
            if (detail) detail.innerHTML = '<div class="loading">Fehler beim Laden</div>';
        }
    });
}
