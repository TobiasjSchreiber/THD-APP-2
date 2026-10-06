// Helper Functions (Date, Formatting, iCal Parser)

export function isSameDay(d1, d2) {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

export function formatDateIso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function getRelativeDayString(targetDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Morgen';
    if (diffDays === 2) return 'Übermorgen';
    if (diffDays === -1) return 'Gestern';
    if (diffDays === -2) return 'Vorgestern';
    if (diffDays > 0) return `In ${diffDays} T.`;
    return `Vor ${Math.abs(diffDays)} T.`;
}

export function formatDayTitle(date) {
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    return `${days[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]}`;
}

export function getWeekDays(refDate) {
    const curr = new Date(refDate);
    curr.setHours(0, 0, 0, 0);
    const day = curr.getDay(); // 0 is Sun, 1 is Mon
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(curr);
    monday.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 5; i++) { // Mo - Fr
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
    }
    return days;
}

export function renderDayNav(containerEl, selectedDate, onSelectDate, onPrev, onNext, onToday) {
    if (!containerEl) return;
    
    const weekDays = getWeekDays(selectedDate);
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayMain = formatDayTitle(selectedDate);
    const daySub = getRelativeDayString(selectedDate);
    
    let pillsHtml = '';
    weekDays.forEach(d => {
        const isActive = isSameDay(d, selectedDate);
        const isTod = isSameDay(d, today);
        const iso = formatDateIso(d);
        pillsHtml += `
            <button class="weekday-pill ${isActive ? 'active' : ''} ${isTod ? 'is-today' : ''}" data-date="${iso}">
                <span class="day-name">${dayNames[d.getDay()]}</span>
                <span class="day-num">${d.getDate()}</span>
            </button>
        `;
    });
    
    containerEl.innerHTML = `
        <div class="day-header-row">
            <button class="icon-btn day-nav-btn btn-prev-nav" aria-label="Vorheriger Tag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div class="day-title-box" title="Klicken für Heute">
                <span class="day-label-main">${dayMain}</span>
                <span class="day-label-sub">${daySub}</span>
            </div>
            <button class="icon-btn day-nav-btn btn-next-nav" aria-label="Nächster Tag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
        </div>
        <div class="weekday-pills">
            ${pillsHtml}
        </div>
    `;
    
    containerEl.querySelector('.btn-prev-nav').onclick = () => onPrev();
    containerEl.querySelector('.btn-next-nav').onclick = () => onNext();
    containerEl.querySelector('.day-title-box').onclick = () => onToday();
    
    containerEl.querySelectorAll('.weekday-pill').forEach(btn => {
        btn.onclick = () => {
            const dateStr = btn.dataset.date;
            const parts = dateStr.split('-');
            const newDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            onSelectDate(newDate);
        };
    });
}

export function formatPrice(val) {
    if (val === null || val === undefined || isNaN(val) || val === '') return '–';
    return Number(val).toFixed(2).replace('.', ',') + ' €';
}

export function categorizeNote(note) {
    const n = note.toLowerCase();
    if (n.includes('vegan')) return { label: 'Vegan', type: 'vegan' };
    if (n.includes('vegetarisch')) return { label: 'Vegetarisch', type: 'veggie' };
    if (n.includes('schwein')) return { label: 'Schwein', type: 'meat' };
    if (n.includes('rind')) return { label: 'Rind', type: 'meat' };
    if (n.includes('geflügel') || n.includes('hähnchen') || n.includes('pute')) return { label: 'Geflügel', type: 'meat' };
    if (n.includes('fisch')) return { label: 'Fisch', type: 'meat' };
    if (n.includes('alkohol')) return { label: 'Alkohol', type: 'alcohol' };
    return { label: note, type: 'neutral' };
}

export function parseICal(text) {
    const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const events = [];
    let cur = null;
    
    lines.forEach(line => {
        if (line.startsWith('BEGIN:VEVENT')) cur = {};
        else if (line.startsWith('END:VEVENT')) {
            if (cur && cur.start && cur.summary) {
                events.push(cur);
            }
        }
        else if (cur) {
            if (line.startsWith('SUMMARY')) {
                const idx = line.indexOf(':');
                if (idx > -1) {
                    let sum = line.substring(idx + 1).replace(/\\,/g, ',');
                    // Strip trailing study group tags like (MT-5), (MT-MP5), (AI-B-1), (IF-4 / WI-4)
                    sum = sum.replace(/\s*\([A-Z0-9_\-\s\/\.]*\d+[A-Z0-9_\-\s\/\.]*\)\s*$/i, '');
                    sum = sum.replace(/\s*\([A-Z]{1,8}(?:-[A-Z0-9]+)+\)\s*$/i, '');
                    cur.summary = sum.trim();
                }
            }
            if (line.startsWith('LOCATION')) {
                const idx = line.indexOf(':');
                if (idx > -1) cur.location = line.substring(idx + 1).replace(/\\,/g, ',');
            }
            if (line.startsWith('DTSTART')) {
                const parts = line.split(':');
                if (parts.length > 1) {
                    const val = parts[1];
                    const m = val.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
                    if (m) {
                        const d = new Date(m[1], m[2] - 1, m[3], m[4], m[5], m[6]);
                        if (val.endsWith('Z')) d.setHours(d.getHours() + (d.getTimezoneOffset() / -60));
                        cur.start = d;
                    }
                }
            }
            if (line.startsWith('DTEND')) {
                const parts = line.split(':');
                if (parts.length > 1) {
                    const val = parts[1];
                    const m = val.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
                    if (m) {
                        const d = new Date(m[1], m[2] - 1, m[3], m[4], m[5], m[6]);
                        if (val.endsWith('Z')) d.setHours(d.getHours() + (d.getTimezoneOffset() / -60));
                        cur.end = d;
                    }
                }
            }
            if (line.startsWith('DURATION')) {
                const parts = line.split(':');
                if (parts.length > 1) {
                    const durStr = parts[1];
                    const m = durStr.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
                    if (m) {
                        const days = parseInt(m[1] || 0, 10);
                        const hours = parseInt(m[2] || 0, 10);
                        const mins = parseInt(m[3] || 0, 10);
                        const secs = parseInt(m[4] || 0, 10);
                        cur._durationMs = (((days * 24 + hours) * 60 + mins) * 60 + secs) * 1000;
                    }
                }
            }
        }
    });

    events.forEach(ev => {
        if (!ev.end && ev.start) {
            if (ev._durationMs) {
                ev.end = new Date(ev.start.getTime() + ev._durationMs);
            } else {
                // Default lecture duration: 90 minutes
                ev.end = new Date(ev.start.getTime() + 90 * 60 * 1000);
            }
        }
    });
    
    events.sort((a, b) => a.start - b.start);
    return events;
}

// Shimmer Skeleton HTML Generators
export function getParkingSkeleton(isWidget = true) {
    if (isWidget) {
        return `
            <div class="shimmer-parking">
                <div class="shimmer-box" style="width: 72px; height: 34px; margin-bottom: 6px; border-radius: 8px;"></div>
                <div class="shimmer-box" style="width: 90px; height: 13px; margin-bottom: 12px;"></div>
                <div class="shimmer-box" style="width: 100%; height: 6px; border-radius: 4px;"></div>
            </div>
        `;
    }
    return `
        <div style="padding: 10px 0;">
            <div class="shimmer-box" style="width: 90px; height: 44px; margin-bottom: 6px; border-radius: 8px;"></div>
            <div class="shimmer-box" style="width: 110px; height: 16px; margin-bottom: 16px;"></div>
            <div class="shimmer-box" style="width: 100%; height: 8px; border-radius: 4px;"></div>
            <div style="margin-top: 24px;">
                <div class="card-item" style="display: flex; flex-direction: column; gap: 10px;">
                    <div class="shimmer-box" style="width: 130px; height: 16px;"></div>
                    <div class="shimmer-box" style="width: 170px; height: 14px;"></div>
                    <div class="shimmer-box" style="width: 150px; height: 14px;"></div>
                </div>
            </div>
        </div>
    `;
}

export function getMensaSkeleton(isWidget = true) {
    if (isWidget) {
        return `
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
                <div class="list-item mensa-widget-item">
                    <div class="shimmer-box" style="flex: 1; height: 14px;"></div>
                    <div class="shimmer-box" style="width: 40px; height: 14px; margin-left: 8px;"></div>
                </div>
                <div class="list-item mensa-widget-item">
                    <div class="shimmer-box" style="flex: 1; height: 14px;"></div>
                    <div class="shimmer-box" style="width: 44px; height: 14px; margin-left: 8px;"></div>
                </div>
                <div class="list-item mensa-widget-item">
                    <div class="shimmer-box" style="flex: 1; height: 14px;"></div>
                    <div class="shimmer-box" style="width: 38px; height: 14px; margin-left: 8px;"></div>
                </div>
            </div>
        `;
    }
    return `
        <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <div class="card-item" style="display: flex; flex-direction: row; gap: 14px; align-items: center;">
                <div class="shimmer-box" style="width: 74px; height: 74px; border-radius: 12px; flex-shrink: 0;"></div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="shimmer-box" style="width: 60px; height: 14px; border-radius: 999px;"></div>
                        <div class="shimmer-box" style="width: 48px; height: 16px;"></div>
                    </div>
                    <div class="shimmer-box" style="width: 85%; height: 16px;"></div>
                    <div class="shimmer-box" style="width: 50%; height: 12px;"></div>
                </div>
            </div>
            <div class="card-item" style="display: flex; flex-direction: row; gap: 14px; align-items: center;">
                <div class="shimmer-box" style="width: 74px; height: 74px; border-radius: 12px; flex-shrink: 0;"></div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="shimmer-box" style="width: 75px; height: 14px; border-radius: 999px;"></div>
                        <div class="shimmer-box" style="width: 45px; height: 16px;"></div>
                    </div>
                    <div class="shimmer-box" style="width: 70%; height: 16px;"></div>
                    <div class="shimmer-box" style="width: 40%; height: 12px;"></div>
                </div>
            </div>
            <div class="card-item" style="display: flex; flex-direction: row; gap: 14px; align-items: center;">
                <div class="shimmer-box" style="width: 74px; height: 74px; border-radius: 12px; flex-shrink: 0;"></div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="shimmer-box" style="width: 65px; height: 14px; border-radius: 999px;"></div>
                        <div class="shimmer-box" style="width: 52px; height: 16px;"></div>
                    </div>
                    <div class="shimmer-box" style="width: 90%; height: 16px;"></div>
                    <div class="shimmer-box" style="width: 45%; height: 12px;"></div>
                </div>
            </div>
        </div>
    `;
}

export function getScheduleSkeleton(isWidget = true) {
    if (isWidget) {
        return `
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
                <div class="list-item schedule-widget-item">
                    <div class="shimmer-box" style="flex: 1; height: 14px;"></div>
                    <div class="shimmer-box" style="width: 40px; height: 14px; margin-left: 8px;"></div>
                </div>
                <div class="list-item schedule-widget-item">
                    <div class="shimmer-box" style="flex: 1; height: 14px;"></div>
                    <div class="shimmer-box" style="width: 40px; height: 14px; margin-left: 8px;"></div>
                </div>
            </div>
        `;
    }
    return `
        <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <div class="card-item" style="display: flex; flex-direction: column; gap: 8px;">
                <div class="card-item-header">
                    <div class="shimmer-box" style="width: 100px; height: 13px;"></div>
                    <div class="shimmer-box" style="width: 55px; height: 18px; border-radius: 6px;"></div>
                </div>
                <div class="shimmer-box" style="width: 80%; height: 17px;"></div>
                <div class="shimmer-box" style="width: 40%; height: 13px;"></div>
            </div>
            <div class="card-item" style="display: flex; flex-direction: column; gap: 8px;">
                <div class="card-item-header">
                    <div class="shimmer-box" style="width: 110px; height: 13px;"></div>
                    <div class="shimmer-box" style="width: 50px; height: 18px; border-radius: 6px;"></div>
                </div>
                <div class="shimmer-box" style="width: 70%; height: 17px;"></div>
                <div class="shimmer-box" style="width: 45%; height: 13px;"></div>
            </div>
            <div class="card-item" style="display: flex; flex-direction: column; gap: 8px;">
                <div class="card-item-header">
                    <div class="shimmer-box" style="width: 95px; height: 13px;"></div>
                    <div class="shimmer-box" style="width: 60px; height: 18px; border-radius: 6px;"></div>
                </div>
                <div class="shimmer-box" style="width: 85%; height: 17px;"></div>
                <div class="shimmer-box" style="width: 35%; height: 13px;"></div>
            </div>
        </div>
    `;
}

export function getEventsSkeleton(isWidget = true) {
    if (isWidget) {
        return `
            <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
                <div class="list-item events-widget-item">
                    <div class="shimmer-box" style="flex: 1; height: 14px;"></div>
                    <div class="shimmer-box" style="width: 45px; height: 14px; margin-left: 8px;"></div>
                </div>
                <div class="list-item events-widget-item">
                    <div class="shimmer-box" style="flex: 1; height: 14px;"></div>
                    <div class="shimmer-box" style="width: 45px; height: 14px; margin-left: 8px;"></div>
                </div>
            </div>
        `;
    }
    return `
        <div style="padding: 10px 0; display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <div class="card-item" style="display: flex; flex-direction: column; gap: 8px;">
                <div class="card-item-header">
                    <div class="shimmer-box" style="width: 130px; height: 13px;"></div>
                    <div class="shimmer-box" style="width: 60px; height: 18px; border-radius: 6px;"></div>
                </div>
                <div class="shimmer-box" style="width: 85%; height: 18px;"></div>
            </div>
            <div class="card-item" style="display: flex; flex-direction: column; gap: 8px;">
                <div class="card-item-header">
                    <div class="shimmer-box" style="width: 140px; height: 13px;"></div>
                    <div class="shimmer-box" style="width: 50px; height: 18px; border-radius: 6px;"></div>
                </div>
                <div class="shimmer-box" style="width: 70%; height: 18px;"></div>
            </div>
            <div class="card-item" style="display: flex; flex-direction: column; gap: 8px;">
                <div class="card-item-header">
                    <div class="shimmer-box" style="width: 110px; height: 13px;"></div>
                </div>
                <div class="shimmer-box" style="width: 90%; height: 18px;"></div>
            </div>
        </div>
    `;
}
