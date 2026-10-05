// Schedule Module (Thabella iCal Loader, Building/Floor Parser & Campus Map Modal)
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { isSameDay, parseICal, getScheduleSkeleton } from '../helpers.js';
import { updateSubpageHeader, openPage, closeBottomSheet } from '../navigation.js';

export function isLectureAllowed(summary) {
    if (!summary) return true;
    return !state.hiddenLectures.includes(summary.trim());
}

export function toggleHideLecture(summary) {
    if (!summary) return;
    const clean = summary.trim();
    const idx = state.hiddenLectures.indexOf(clean);
    if (idx === -1) {
        state.hiddenLectures.push(clean);
    } else {
        state.hiddenLectures.splice(idx, 1);
    }
    localStorage.setItem('thd_hidden_lectures', JSON.stringify(state.hiddenLectures));
    renderScheduleView();
}

export function openScheduleFilterSheet() {
    const sheet = document.getElementById('schedule-filter-sheet');
    if (!sheet) return;
    
    const listEl = document.getElementById('schedule-filter-list');
    
    // Get unique subjects from allScheduleEvents
    const uniqueSubjects = [];
    state.allScheduleEvents.forEach(e => {
        const clean = (e.summary || '').trim();
        if (clean && !uniqueSubjects.includes(clean)) {
            uniqueSubjects.push(clean);
        }
    });
    uniqueSubjects.sort((a, b) => a.localeCompare(b, 'de'));
    
    if (uniqueSubjects.length === 0) {
        listEl.innerHTML = '<div style="padding: 16px; color: var(--text-muted); text-align: center;">Keine Vorlesungen im Plan gefunden</div>';
    } else {
        let html = '';
        uniqueSubjects.forEach(s => {
            const isHidden = state.hiddenLectures.includes(s);
            const isChecked = !isHidden;
            html += `
                <div class="filter-lecture-item">
                    <span class="filter-lecture-name">${s}</span>
                    <label class="switch">
                        <input type="checkbox" class="schedule-filter-toggle" data-summary="${encodeURIComponent(s)}" ${isChecked ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            `;
        });
        listEl.innerHTML = html;
        
        listEl.querySelectorAll('.schedule-filter-toggle').forEach(input => {
            input.addEventListener('change', () => {
                const summary = decodeURIComponent(input.dataset.summary);
                if (input.checked) {
                    state.hiddenLectures = state.hiddenLectures.filter(x => x !== summary);
                } else {
                    if (!state.hiddenLectures.includes(summary)) state.hiddenLectures.push(summary);
                }
                localStorage.setItem('thd_hidden_lectures', JSON.stringify(state.hiddenLectures));
                renderScheduleView();
            });
        });
    }
    
    sheet.classList.add('open');
}

export function closeScheduleFilterSheet() {
    closeBottomSheet('schedule-filter-sheet');
}

export function parseBuildingAndFloor(location, summary) {
    const loc = (location || '').trim();
    const sum = (summary || '').trim();
    let building = null;
    let buildingName = 'Campus Deggendorf';
    let floorName = 'Keine Angabe';
    
    if (loc.toLowerCase().includes('bibliothek') || loc.toLowerCase().includes('library') || sum.toLowerCase().includes('bibliothek')) {
        building = 'G';
        buildingName = 'Gebäude G (Bibliothek)';
        floorName = 'EG / 1. OG';
    } else if (loc.toUpperCase().includes('ITC') || sum.toUpperCase().includes('ITC')) {
        building = 'ITC';
        buildingName = 'ITC (Innovationszentrum)';
        const itcMatch = loc.match(/ITC\s*([0-9]+)/i);
        if (itcMatch) {
            const num = itcMatch[1];
            if (num.startsWith('0')) floorName = 'Erdgeschoss (EG)';
            else if (num.startsWith('1')) floorName = '1. Obergeschoss (1. OG)';
            else if (num.startsWith('2')) floorName = '2. Obergeschoss (2. OG)';
            else floorName = 'ITC Campus';
        } else {
            floorName = 'ITC Campus';
        }
    } else if (loc.toLowerCase().includes('online') || loc.toLowerCase().includes('zoom') || loc.toLowerCase().includes('teams')) {
        building = null;
        buildingName = 'Online / Virtuell';
        floorName = 'Virtueller Raum';
    } else {
        // Match building letter A-L, U with room number
        const match = loc.match(/(?:Raum\s*)?([A-La-lUu])\s*[-.]?\s*([0-9]{2,4})/);
        if (match) {
            building = match[1].toUpperCase();
            const roomNum = match[2];
            buildingName = `Gebäude ${building}`;
            
            const firstDigit = roomNum.charAt(0);
            if (firstDigit === '0') floorName = 'Erdgeschoss (EG)';
            else if (firstDigit === '1') floorName = '1. Obergeschoss (1. OG)';
            else if (firstDigit === '2') floorName = '2. Obergeschoss (2. OG)';
            else if (firstDigit === '3') floorName = '3. Obergeschoss (3. OG)';
            else if (firstDigit === '4') floorName = '4. Obergeschoss (4. OG)';
            else floorName = `${firstDigit}. Stock`;
        } else {
            const letterMatch = loc.match(/\b([A-La-lUu])\b/);
            if (letterMatch) {
                building = letterMatch[1].toUpperCase();
                buildingName = `Gebäude ${building}`;
                floorName = 'Campus Deggendorf';
            } else if (loc) {
                buildingName = loc;
                floorName = 'Campus Deggendorf';
            }
        }
    }
    
    return {
        building,
        buildingName,
        floorName,
        room: loc || 'Keine Raumangabe'
    };
}

export function openLectureDetailSheet(event) {
    const sheet = document.getElementById('lecture-modal');
    if (!sheet) return;
    
    const info = parseBuildingAndFloor(event.location, event.summary);
    
    // Title
    const titleEl = document.getElementById('lecture-sheet-title');
    if (titleEl) titleEl.textContent = event.summary || 'Vorlesung';
    
    // Time
    const timeEl = document.getElementById('lecture-sheet-time');
    if (timeEl && event.start) {
        const startT = event.start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const endT = event.end ? event.end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
        const dayName = event.start.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
        timeEl.textContent = `${dayName} • ${endT ? `${startT} - ${endT} Uhr` : `${startT} Uhr`}`;
    }
    
    // Room, Building, Floor
    const roomEl = document.getElementById('lecture-sheet-room');
    if (roomEl) roomEl.textContent = info.room;
    
    const bldgEl = document.getElementById('lecture-sheet-building');
    if (bldgEl) bldgEl.textContent = info.buildingName;
    
    const floorEl = document.getElementById('lecture-sheet-floor');
    if (floorEl) floorEl.textContent = info.floorName;
    
    const targetBadge = document.getElementById('campus-map-target-badge');
    
    // Reset all buildings
    const buildings = sheet.querySelectorAll('.building');
    buildings.forEach(b => b.classList.remove('active'));
    
    if (info.building === 'U') {
        const uParts = sheet.querySelectorAll('#bldg-U-top, #bldg-U-right, #bldg-U-bottom');
        uParts.forEach(p => p.classList.add('active'));
        if (targetBadge) {
            targetBadge.textContent = info.buildingName;
            targetBadge.style.display = 'inline-block';
        }
    } else if (info.building) {
        const targetBldg = sheet.querySelector(`#bldg-${info.building}`);
        if (targetBldg) {
            targetBldg.classList.add('active');
        }
        if (targetBadge) {
            targetBadge.textContent = info.buildingName;
            targetBadge.style.display = 'inline-block';
        }
    } else {
        if (targetBadge) {
            targetBadge.textContent = 'Keine Campus-Zuordnung';
            targetBadge.style.display = 'inline-block';
        }
    }
    
    // Setup iLearn button
    const ilearnBtn = document.getElementById('btn-lecture-ilearn');
    if (ilearnBtn) {
        ilearnBtn.onclick = () => {
            window.open('https://elearning.th-deg.de', '_blank');
        };
    }
    
    sheet.classList.add('open');
}

export function closeLectureDetailSheet() {
    closeBottomSheet('lecture-modal');
}

export function renderScheduleView() {
    const content = document.getElementById('widget-content-schedule');
    const detail = document.getElementById('content-schedule');
    
    // Subpage Header & Weekday Strip
    updateSubpageHeader('schedule');
    
    // Filter events for currentScheduleDate
    const allDayEvents = state.allScheduleEvents.filter(ev => isSameDay(ev.start, state.currentScheduleDate));
    allDayEvents.sort((a, b) => a.start - b.start);
    
    const dayEvents = allDayEvents.filter(ev => isLectureAllowed(ev.summary));
    
    if (dayEvents.length === 0) {
        const emptyMsg = '<div class="loading" style="padding: 20px 0;">Keine Vorlesungen an diesem Tag</div>';
        if (content) content.innerHTML = emptyMsg;
        if (detail) {
            detail.innerHTML = emptyMsg;
        }
        return;
    }
    
    // Widget content: chronological events, past greyed out above, current highlighted lighter & auto-scrolled
    if (content) {
        const now = new Date();
        const isToday = isSameDay(state.currentScheduleDate, now);
        
        let currentTargetIdx = -1;
        let allPast = false;
        
        if (isToday) {
            currentTargetIdx = dayEvents.findIndex(e => now >= e.start && now < e.end);
            if (currentTargetIdx === -1) {
                // Between classes or before class starts: point to next upcoming lecture
                currentTargetIdx = dayEvents.findIndex(e => e.start > now);
            }
            if (currentTargetIdx === -1 && dayEvents.length > 0) {
                // All events for today are finished
                allPast = true;
            }
        }
        
        let wHtml = '';
        if (allPast) {
            wHtml += '<div class="schedule-status-banner">Alle Vorlesungen für heute beendet</div>';
        }
        
        const renderWidgetLecture = (e, idx) => {
            const startT = e.start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const endT = e.end ? e.end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
            const timeStr = endT ? `${startT} - ${endT}` : startT;
            
            let itemClass = 'list-item schedule-item-interactive';
            if (isToday) {
                if (allPast || (currentTargetIdx !== -1 && idx < currentTargetIdx)) {
                    itemClass += ' is-past';
                } else if (idx === currentTargetIdx) {
                    itemClass += ' is-current';
                }
            }
            
            return `
                <div class="${itemClass}" data-schedule-index="${idx}">
                    <span class="list-title">${e.summary.substring(0, 32)}${e.summary.length > 32 ? '...' : ''}</span>
                    <span class="list-desc">${timeStr} ${e.location ? '• Raum ' + e.location : ''}</span>
                </div>
            `;
        };
        
        dayEvents.forEach((e, idx) => {
            wHtml += renderWidgetLecture(e, idx);
        });
        
        content.innerHTML = wHtml;
        
        // Widget lecture item click to open campus map modal
        content.querySelectorAll('.schedule-item-interactive').forEach(item => {
            item.addEventListener('click', (ev) => {
                const idx = parseInt(item.dataset.scheduleIndex, 10);
                if (!isNaN(idx) && dayEvents && dayEvents[idx]) {
                    ev.stopPropagation();
                    openLectureDetailSheet(dayEvents[idx]);
                }
            });
        });
        
        // Auto-scroll within widget container to current lecture
        requestAnimationFrame(() => {
            setTimeout(() => {
                const target = content.querySelector('.list-item.is-current');
                if (target && content) {
                    const cRect = content.getBoundingClientRect();
                    const tRect = target.getBoundingClientRect();
                    const offset = tRect.top - cRect.top;
                    content.scrollTo({
                        top: content.scrollTop + offset - 4,
                        behavior: 'smooth'
                    });
                }
            }, 60);
        });
    }
    
    // Detail subpage content: full cards
    if (detail) {
        const now = new Date();
        const isToday = isSameDay(state.currentScheduleDate, now);
        let dHtml = '';
        dayEvents.forEach((e, idx) => {
            const startT = e.start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const endT = e.end ? e.end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
            const timeStr = endT ? `${startT} - ${endT}` : startT;
            const isCurrent = isToday && (now >= e.start && now < e.end);
            
            dHtml += `
                <div class="card-item ${isCurrent ? 'is-current' : ''} schedule-card-interactive" data-schedule-index="${idx}">
                    <div class="card-item-header">
                        <span class="time-tag">${isCurrent ? '<span class="now-pill">JETZT</span>' : ''}${timeStr}</span>
                        ${e.location ? `<span class="room-tag">Raum ${e.location}</span>` : ''}
                    </div>
                    <span class="list-title" style="font-size: 17px; margin-top: 2px;">${e.summary}</span>
                </div>
            `;
        });
        
        detail.innerHTML = dHtml;
        
        // Detail lecture card click to open campus map modal
        detail.querySelectorAll('.schedule-card-interactive').forEach(item => {
            item.addEventListener('click', () => {
                const idx = parseInt(item.dataset.scheduleIndex, 10);
                if (!isNaN(idx) && dayEvents && dayEvents[idx]) {
                    openLectureDetailSheet(dayEvents[idx]);
                }
            });
        });
    }
}

export async function loadSchedule() {
    const content = document.getElementById('widget-content-schedule');
    const detail = document.getElementById('content-schedule');
    if (!state.studyGroup) {
        if (content) content.innerHTML = '<div class="loading">Keine Gruppe (Einstellungen)</div>';
        return;
    }
    if (content) content.innerHTML = getScheduleSkeleton(true);
    if (detail && state.allScheduleEvents.length === 0) detail.innerHTML = getScheduleSkeleton(false);
    
    try {
        const url = CONFIG.thabellaUrlBase + state.studyGroup;
        const res = await fetch(CONFIG.proxyUrlBase + encodeURIComponent(url));
        if (!res.ok) throw new Error();
        
        const text = await res.text();
        state.allScheduleEvents = parseICal(text);
        renderScheduleView();
    } catch (e) {
        console.error('loadSchedule error:', e);
        if (content) content.innerHTML = '<div class="loading">Fehler beim Laden</div>';
        if (detail) detail.innerHTML = '<div class="loading">Fehler beim Laden</div>';
    }
}

export function setupScheduleListeners() {
    // Schedule filter modal
    const btnScheduleFilter = document.getElementById('btn-schedule-filter');
    if (btnScheduleFilter) btnScheduleFilter.addEventListener('click', openScheduleFilterSheet);

    const btnCloseScheduleFilter = document.getElementById('btn-close-schedule-filter');
    if (btnCloseScheduleFilter) btnCloseScheduleFilter.addEventListener('click', closeScheduleFilterSheet);

    const scheduleFilterBackdrop = document.getElementById('schedule-filter-backdrop');
    if (scheduleFilterBackdrop) scheduleFilterBackdrop.addEventListener('click', closeScheduleFilterSheet);

    const btnResetScheduleFilter = document.getElementById('btn-reset-schedule-filter');
    if (btnResetScheduleFilter) {
        btnResetScheduleFilter.addEventListener('click', () => {
            state.hiddenLectures = [];
            localStorage.setItem('thd_hidden_lectures', JSON.stringify(state.hiddenLectures));
            openScheduleFilterSheet();
            renderScheduleView();
        });
    }

    // Lecture detail modal
    const btnCloseLectureModal = document.getElementById('btn-close-lecture-modal');
    if (btnCloseLectureModal) btnCloseLectureModal.addEventListener('click', closeLectureDetailSheet);

    const lectureModalBackdrop = document.getElementById('lecture-modal-backdrop');
    if (lectureModalBackdrop) lectureModalBackdrop.addEventListener('click', closeLectureDetailSheet);
}
