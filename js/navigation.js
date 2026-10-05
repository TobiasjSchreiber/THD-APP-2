// Navigation, Subpage Headers, Date Picker Sheet & Bounce Control
import { state } from './state.js';
import { isSameDay, formatDateIso, getRelativeDayString, getWeekDays } from './helpers.js';
import { renderScheduleView } from './modules/schedule.js';
import { loadMensaForDate, updateMensaHeaderStatus } from './modules/mensa.js';

let isInternalHistoryChange = false;

export function getCurrentActivePageId() {
    const active = document.querySelector('.page.active');
    return active ? active.id : 'page-dashboard';
}

export function openPage(id, pushHistory = true) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
    if (id === 'page-mensa') {
        updateMensaHeaderStatus();
    }

    if (pushHistory && id !== 'page-dashboard') {
        if (history.state?.page !== id) {
            history.pushState({ page: id }, '');
        }
    } else if (pushHistory && id === 'page-dashboard') {
        if (history.state?.page && history.state.page !== 'page-dashboard') {
            history.pushState({ page: 'page-dashboard' }, '');
        }
    }
}

export function setSubpageDate(type, newDate) {
    if (type === 'schedule') {
        state.currentScheduleDate = new Date(newDate);
        updateSubpageHeader('schedule');
        renderScheduleView();
    } else if (type === 'mensa') {
        state.currentMensaDate = new Date(newDate);
        updateSubpageHeader('mensa');
        loadMensaForDate(state.currentMensaDate);
    }
}

export function updateSubpageHeader(type) {
    const date = type === 'schedule' ? state.currentScheduleDate : state.currentMensaDate;
    const dayNameEl = document.getElementById(`${type}-day-name`);
    const dateSubEl = document.getElementById(`${type}-date-sub`);
    const dayChipEl = document.getElementById(`${type}-day-chip`);
    
    if (dayNameEl) {
        const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        dayNameEl.textContent = days[date.getDay()];
    }
    if (dateSubEl) {
        const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        dateSubEl.textContent = `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    if (dayChipEl) {
        dayChipEl.textContent = getRelativeDayString(date);
    }
    
    renderSubpageWeekdayStrip(type);
}

export function renderSubpageWeekdayStrip(type) {
    const stripEl = document.getElementById(`${type}-weekday-strip`);
    if (!stripEl) return;
    
    const currentDate = type === 'schedule' ? state.currentScheduleDate : state.currentMensaDate;
    const weekDays = getWeekDays(currentDate);
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let html = '';
    weekDays.forEach(d => {
        const isActive = isSameDay(d, currentDate);
        const isTod = isSameDay(d, today);
        const iso = formatDateIso(d);
        html += `
            <button class="weekday-pill ${isActive ? 'active' : ''} ${isTod ? 'is-today' : ''}" data-date="${iso}">
                <span class="day-name">${dayNames[d.getDay()]}</span>
                <span class="day-num">${d.getDate()}</span>
            </button>
        `;
    });
    stripEl.innerHTML = html;
    
    stripEl.querySelectorAll('.weekday-pill').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const parts = btn.dataset.date.split('-');
            const newDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            setSubpageDate(type, newDate);
        };
    });
}

export function openDateSheet(target) {
    if (target) state.activeDateTarget = target;
    const targetDate = state.activeDateTarget === 'schedule' ? state.currentScheduleDate : state.currentMensaDate;
    state.sheetRefDate = new Date(targetDate);
    updateSheetContent();
    const sheet = document.getElementById('date-picker-sheet');
    if (sheet) sheet.classList.add('open');
}

export function closeBottomSheet(sheet) {
    if (typeof sheet === 'string') {
        sheet = document.getElementById(sheet);
    }
    if (!sheet || !sheet.classList.contains('open') || sheet.classList.contains('closing')) return;

    sheet.classList.add('closing');

    setTimeout(() => {
        sheet.classList.remove('open');
        sheet.classList.remove('closing');
        const container = sheet.querySelector('.sheet-container');
        if (container) {
            container.style.transform = '';
            container.style.transition = '';
        }
        const backdrop = sheet.querySelector('.sheet-backdrop');
        if (backdrop) {
            backdrop.style.opacity = '';
            backdrop.style.transition = '';
        }
    }, 220);
}

export function closeDateSheet() {
    closeBottomSheet('date-picker-sheet');
}

export function updateSheetContent() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = state.activeDateTarget === 'schedule' ? state.currentScheduleDate : state.currentMensaDate;
    const curr = new Date(targetDate);
    curr.setHours(0, 0, 0, 0);
    const diff = Math.round((curr - today) / (1000 * 60 * 60 * 24));
    
    document.querySelectorAll('.sheet-quick-btn').forEach(btn => {
        const offset = parseInt(btn.dataset.offset, 10);
        btn.classList.toggle('active', offset === diff);
    });
    
    const sheetWeekLabel = document.getElementById('sheet-week-label');
    const weekDays = getWeekDays(state.sheetRefDate);
    if (sheetWeekLabel) {
        const startDay = weekDays[0];
        const endDay = weekDays[weekDays.length - 1];
        const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        sheetWeekLabel.textContent = `${startDay.getDate()}. - ${endDay.getDate()}. ${months[endDay.getMonth()]}`;
    }
    
    const sheetPills = document.getElementById('sheet-weekday-pills');
    if (sheetPills) {
        const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        let html = '';
        weekDays.forEach(d => {
            const isActive = isSameDay(d, targetDate);
            const isTod = isSameDay(d, today);
            const iso = formatDateIso(d);
            html += `
                <button class="weekday-pill ${isActive ? 'active' : ''} ${isTod ? 'is-today' : ''}" data-date="${iso}">
                    <span class="day-name">${dayNames[d.getDay()]}</span>
                    <span class="day-num">${d.getDate()}</span>
                </button>
            `;
        });
        sheetPills.innerHTML = html;
        sheetPills.querySelectorAll('.weekday-pill').forEach(btn => {
            btn.onclick = () => {
                const parts = btn.dataset.date.split('-');
                const newDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                setSubpageDate(state.activeDateTarget, newDate);
                closeDateSheet();
            };
        });
    }
}

export function setupNavigationListeners() {
    // Initialize base history state on load
    if (!history.state) {
        history.replaceState({ page: 'page-dashboard' }, '');
    }

    // Back buttons
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', () => {
            if (history.state?.page && history.state.page !== 'page-dashboard') {
                history.back();
            } else {
                openPage('page-dashboard', false);
            }
        });
    });

    // Universal button close handlers for all bottom sheets
    document.querySelectorAll('.bottom-sheet .btn-close-sheet').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sheet = btn.closest('.bottom-sheet');
            if (sheet) closeBottomSheet(sheet);
        });
    });

    // Universal backdrop click handlers for all bottom sheets
    document.querySelectorAll('.bottom-sheet .sheet-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            e.stopPropagation();
            const sheet = backdrop.closest('.bottom-sheet');
            if (sheet) closeBottomSheet(sheet);
        });
    });

    // Observe all bottom sheets for open/close to synchronize with Android back button
    const sheetObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                const isOpen = target.classList.contains('open');
                if (isOpen) {
                    // Modal opened -> push modal state
                    if (!isInternalHistoryChange) {
                        history.pushState({ modal: target.id, page: getCurrentActivePageId() }, '');
                    }
                } else {
                    // Modal closed via UI -> revert modal history state
                    if (!isInternalHistoryChange && history.state?.modal === target.id) {
                        isInternalHistoryChange = true;
                        history.back();
                        setTimeout(() => { isInternalHistoryChange = false; }, 100);
                    }
                }
            }
        });
    });

    document.querySelectorAll('.bottom-sheet').forEach(sheet => {
        sheetObserver.observe(sheet, { attributes: true, attributeFilter: ['class'] });
    });

    // Universal popstate handler for Android system back button & browser back
    window.addEventListener('popstate', (e) => {
        if (isInternalHistoryChange) return;

        // 1. Close any open bottom sheet first with slide-down animation
        const openSheets = Array.from(document.querySelectorAll('.bottom-sheet.open'));
        if (openSheets.length > 0) {
            const topSheet = openSheets[openSheets.length - 1];
            isInternalHistoryChange = true;
            closeBottomSheet(topSheet);
            setTimeout(() => { isInternalHistoryChange = false; }, 230);
            return;
        }

        // 2. If returning to page-dashboard or another page
        const targetPage = e.state?.page || 'page-dashboard';
        openPage(targetPage, false);
    });

    // Settings button
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
        btnSettings.addEventListener('click', () => openPage('page-settings'));
    }

    // Subpage day picker buttons
    const schedDateBtn = document.getElementById('schedule-day-btn');
    if (schedDateBtn) {
        schedDateBtn.addEventListener('click', () => openDateSheet('schedule'));
    }

    const mensaDateBtn = document.getElementById('mensa-day-btn');
    if (mensaDateBtn) {
        mensaDateBtn.addEventListener('click', () => openDateSheet('mensa'));
    }

    // Date picker sheet controls
    const sheetBackdrop = document.getElementById('sheet-backdrop');
    if (sheetBackdrop) sheetBackdrop.addEventListener('click', closeDateSheet);

    const btnCloseSheet = document.getElementById('btn-close-sheet');
    if (btnCloseSheet) btnCloseSheet.addEventListener('click', closeDateSheet);

    document.querySelectorAll('.sheet-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const offset = parseInt(btn.dataset.offset, 10);
            const d = new Date();
            d.setDate(d.getDate() + offset);
            setSubpageDate(state.activeDateTarget, d);
            closeDateSheet();
        });
    });

    const btnSheetPrev = document.getElementById('btn-sheet-prev-week');
    if (btnSheetPrev) {
        btnSheetPrev.addEventListener('click', () => {
            state.sheetRefDate.setDate(state.sheetRefDate.getDate() - 7);
            updateSheetContent();
        });
    }

    const btnSheetNext = document.getElementById('btn-sheet-next-week');
    if (btnSheetNext) {
        btnSheetNext.addEventListener('click', () => {
            state.sheetRefDate.setDate(state.sheetRefDate.getDate() + 7);
            updateSheetContent();
        });
    }

    const nativeInput = document.getElementById('native-date-input');
    const btnOpenNative = document.getElementById('btn-open-native-calendar');

    if (btnOpenNative && nativeInput) {
        btnOpenNative.addEventListener('click', () => {
            const targetDate = state.activeDateTarget === 'schedule' ? state.currentScheduleDate : state.currentMensaDate;
            nativeInput.value = formatDateIso(targetDate);
            if (nativeInput.showPicker) {
                try {
                    nativeInput.showPicker();
                } catch(e) {
                    nativeInput.focus();
                }
            } else {
                nativeInput.focus();
            }
        });
        
        nativeInput.addEventListener('change', () => {
            if (nativeInput.value) {
                const parts = nativeInput.value.split('-');
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                setSubpageDate(state.activeDateTarget, d);
                closeDateSheet();
            }
        });
    }

    // Universal gesture to swipe/drag any bottom sheet down to dismiss
    setupBottomSheetDragToClose();

    // Strictly prevent ANY browser bounce / whole-page scrolling on dashboard,
    // but ALLOW scrolling inside widget content and resizing handles
    const dashPage = document.getElementById('page-dashboard');
    if (dashPage) {
        dashPage.addEventListener('touchmove', (e) => {
            if (e.target.closest('.widget-content')) {
                return; // Allow native smooth scrolling inside the widget!
            }
            if (!e.target.closest('.resize-handle')) {
                e.preventDefault();
            }
        }, { passive: false });
    }
}

export function setupBottomSheetDragToClose() {
    const bottomSheets = document.querySelectorAll('.bottom-sheet');
    
    bottomSheets.forEach(sheet => {
        const container = sheet.querySelector('.sheet-container');
        const backdrop = sheet.querySelector('.sheet-backdrop');
        if (!container) return;

        let startY = 0;
        let startX = 0;
        let isDragging = false;
        let isEligibleDrag = false;
        let activePointerId = null;

        const getScrollableChild = (target) => {
            return target.closest('.sheet-scroll-body, .meal-detail-container, .filter-sheet-container') || container;
        };

        const onPointerDown = (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            // Ignore interactive form controls and buttons
            if (e.target.closest('button, input, label, a, .switch, .slider, .weekday-pill, .sheet-quick-btn, .primary-btn, .filter-reset-btn')) {
                return;
            }

            const scrollEl = getScrollableChild(e.target);
            const startScrollTop = scrollEl ? scrollEl.scrollTop : 0;
            startY = e.clientY;
            startX = e.clientX;
            isDragging = false;
            isEligibleDrag = false;
            activePointerId = e.pointerId;

            // Direct drag handle or header is always an eligible drag
            if (e.target.closest('.sheet-drag-handle, .sheet-header')) {
                isEligibleDrag = true;
            } else if (startScrollTop <= 0) {
                // At top of scroll content, downward pull is eligible
                isEligibleDrag = true;
            }

            container.setPointerCapture(e.pointerId);
            container.addEventListener('pointermove', onPointerMove);
            container.addEventListener('pointerup', onPointerUp);
            container.addEventListener('pointercancel', onPointerUp);
        };

        const onPointerMove = (e) => {
            if (e.pointerId !== activePointerId) return;

            const deltaY = e.clientY - startY;
            const deltaX = e.clientX - startX;
            const scrollEl = getScrollableChild(e.target);
            const curScroll = scrollEl ? scrollEl.scrollTop : 0;

            if (!isDragging) {
                // If moved downwards by more than 6px and vertically dominant
                if (isEligibleDrag && deltaY > 6 && Math.abs(deltaY) > Math.abs(deltaX) && curScroll <= 0) {
                    isDragging = true;
                    container.style.transition = 'none';
                    if (backdrop) backdrop.style.transition = 'none';
                }
            }

            if (isDragging) {
                if (e.cancelable) e.preventDefault();
                if (deltaY > 0) {
                    container.style.transform = `translateY(${deltaY}px)`;
                    if (backdrop) {
                        const opacity = Math.max(0, 1 - (deltaY / 360));
                        backdrop.style.opacity = opacity.toFixed(2);
                    }
                } else {
                    container.style.transform = `translateY(${deltaY * 0.15}px)`;
                }
            }
        };

        const onPointerUp = (e) => {
            if (e.pointerId !== activePointerId) return;
            try {
                container.releasePointerCapture(e.pointerId);
            } catch (err) {}

            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerup', onPointerUp);
            container.removeEventListener('pointercancel', onPointerUp);

            if (!isDragging) return;
            isDragging = false;

            const deltaY = e.clientY - startY;

            container.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)';
            if (backdrop) backdrop.style.transition = 'opacity 0.22s ease';

            // Threshold: 80px downwards to close
            if (deltaY > 80) {
                container.style.transform = 'translateY(100%)';
                if (backdrop) backdrop.style.opacity = '0';

                setTimeout(() => {
                    sheet.classList.remove('open');
                    container.style.transform = '';
                    container.style.transition = '';
                    if (backdrop) {
                        backdrop.style.opacity = '';
                        backdrop.style.transition = '';
                    }
                }, 220);
            } else {
                // Snap back
                container.style.transform = 'translateY(0)';
                if (backdrop) backdrop.style.opacity = '1';

                setTimeout(() => {
                    container.style.transform = '';
                    container.style.transition = '';
                    if (backdrop) {
                        backdrop.style.opacity = '';
                        backdrop.style.transition = '';
                    }
                }, 240);
            }
        };

        container.addEventListener('pointerdown', onPointerDown);
    });
}
