// Mensa Module (OpenMensa API, STWNO Live Photos, Dietary Filters & Opening Hours)
import { CONFIG } from '../config.js';
import { state, defaultMensaFilters } from '../state.js';
import { isSameDay, formatDateIso, formatPrice, categorizeNote, getMensaSkeleton } from '../helpers.js';
import { updateSubpageHeader, closeBottomSheet } from '../navigation.js';

export function getMensaLiveStatus(targetDate = new Date()) {
    const now = new Date();
    const isToday = isSameDay(targetDate, now);
    const dayOfWeek = targetDate.getDay();
    const month = targetDate.getMonth(); // 11 is Dec, 0 is Jan
    const dayOfMonth = targetDate.getDate();

    // 1. Schließzeiten: 24. Dezember 2026 bis 6. Januar 2027
    const isHolidayClosure = (month === 11 && dayOfMonth >= 24) || (month === 0 && dayOfMonth <= 6);
    if (isHolidayClosure) {
        return {
            status: 'closed',
            title: 'Geschlossen (Schließzeiten)',
            desc: '24. Dezember 2026 – 6. Januar 2027',
            pillText: 'Geschlossen • Schließzeit (bis 6. Jan)'
        };
    }

    // 2. Wochenende: Samstag & Sonntag
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return {
            status: 'closed',
            title: 'Wochenende – Geschlossen',
            desc: 'Öffnet wieder am Montag um 11:00 Uhr',
            pillText: 'Geschlossen • Wochenende'
        };
    }

    // 3. 23. Dezember 2026 (verkürzte Öffnungszeit 11:00 - 13:00 Uhr)
    const isDec23 = (month === 11 && dayOfMonth === 23);
    const openHour = 11;
    const openMinute = 0;
    const closeHour = isDec23 ? 13 : 14;
    const closeMinute = isDec23 ? 0 : 15;
    const closeStr = `${closeHour}:${closeMinute === 0 ? '00' : closeMinute}`;
    const hoursDesc = `11:00 – ${closeStr} Uhr`;

    if (!isToday) {
        return {
            status: 'neutral',
            title: isDec23 ? 'Verkürzte Öffnungszeit' : 'Reguläre Öffnungszeit',
            desc: `${hoursDesc} ${isDec23 ? '(23. Dez)' : '(Mo–Fr)'}`,
            pillText: `Öffnungszeit: ${hoursDesc}`
        };
    }

    const currentMins = now.getHours() * 60 + now.getMinutes();
    const openMins = openHour * 60 + openMinute; // 660 (11:00)
    const closeMins = closeHour * 60 + closeMinute; // 855 (14:15)

    if (currentMins >= openMins && currentMins < closeMins - 20) {
        return {
            status: 'open',
            title: 'Jetzt geöffnet',
            desc: `Mo–Fr von 11:00 bis ${closeStr} Uhr`,
            pillText: `Geöffnet • bis ${closeStr} Uhr`
        };
    } else if (currentMins >= closeMins - 20 && currentMins < closeMins) {
        const remaining = closeMins - currentMins;
        return {
            status: 'closing-soon',
            title: 'Schließt bald',
            desc: `Schließt in ${remaining} Minuten um ${closeStr} Uhr`,
            pillText: `Schließt bald • bis ${closeStr} Uhr`
        };
    } else if (currentMins < openMins) {
        return {
            status: 'closed',
            title: 'Aktuell geschlossen',
            desc: `Öffnet heute um 11:00 Uhr`,
            pillText: `Geschlossen • Öffnet um 11:00`
        };
    } else {
        return {
            status: 'closed',
            title: 'Für heute geschlossen',
            desc: `Mensa schloss um ${closeStr} Uhr • Öffnet morgen um 11:00`,
            pillText: `Geschlossen • schloss um ${closeStr}`
        };
    }
}

export function isMealAllowed(meal) {
    if (!meal) return false;
    const notes = (meal.notes || []).map(n => n.toLowerCase());
    const name = (meal.name || '').toLowerCase();
    
    // Diets
    if (state.mensaFilters.onlyVegan) {
        const isVegan = notes.some(n => n.includes('vegan')) || name.includes('vegan');
        if (!isVegan) return false;
    }
    
    if (state.mensaFilters.onlyVeggie) {
        const isVeggie = notes.some(n => n.includes('vegetarisch') || n.includes('vegan')) || name.includes('vegetarisch') || name.includes('vegan');
        if (!isVeggie) return false;
    }
    
    // Ingredients
    if (state.mensaFilters.noAlcohol) {
        const hasAlcohol = notes.some(n => n.includes('alkohol')) ||
                           name.includes('alkohol') || name.includes('bier') || name.includes('wein') ||
                           name.includes('likör') || name.includes('rum') || name.includes('cognac') ||
                           name.includes('schnaps');
        if (hasAlcohol) return false;
    }

    if (state.mensaFilters.noPork) {
        const hasPork = notes.some(n => n.includes('schwein') || n.includes('speck') || n.includes('schinken')) ||
                        name.includes('schwein') || name.includes('speck') || name.includes('schinken');
        if (hasPork) return false;
    }
    
    if (state.mensaFilters.noBeef) {
        const hasBeef = notes.some(n => n.includes('rind')) || name.includes('rind') || name.includes('kalb');
        if (hasBeef) return false;
    }

    if (state.mensaFilters.noPoultry) {
        const hasPoultry = notes.some(n => n.includes('geflügel') || n.includes('hähnchen') || n.includes('pute') || n.includes('huhn') || n.includes('ente')) ||
                           name.includes('geflügel') || name.includes('hähnchen') || name.includes('pute') || name.includes('huhn') || name.includes('ente') || name.includes('hendl');
        if (hasPoultry) return false;
    }

    // Allergens
    if (state.mensaFilters.noGluten) {
        const hasGluten = notes.some(n => n.includes('gluten') || n.includes('weizen') || n.includes('gerste') || n.includes('roggen') || n.includes('dinkel') || n.includes('hafer'));
        if (hasGluten) return false;
    }

    if (state.mensaFilters.noLactose) {
        const hasLactose = notes.some(n => n.includes('milch') || n.includes('laktose') || n.includes('sahne') || n.includes('käse') || n.includes('joghurt') || n.includes('quark'));
        if (hasLactose) return false;
    }

    if (state.mensaFilters.noEggs) {
        const hasEggs = notes.some(n => n.includes('eier') || n.includes('hühnerei') || n === 'ei' || n.includes(' eier') || n.includes('eierzeugnisse'));
        if (hasEggs) return false;
    }

    if (state.mensaFilters.noNuts) {
        const hasNuts = notes.some(n => n.includes('nüss') || n.includes('nuss') || n.includes('schalenfrüchte') || n.includes('mandel') || n.includes('erdnüss') || n.includes('cashew') || n.includes('pistaz'));
        if (hasNuts) return false;
    }

    if (state.mensaFilters.noSoy) {
        const hasSoy = notes.some(n => n.includes('soja') || n.includes('tofu'));
        if (hasSoy) return false;
    }

    if (state.mensaFilters.noFish) {
        const hasFish = notes.some(n => n.includes('fisch') || n.includes('krebstier') || n.includes('weichtier') || n.includes('garnele')) ||
                        name.includes('fisch') || name.includes('lachs') || name.includes('seelachs') || name.includes('hoki') || name.includes('forelle');
        if (hasFish) return false;
    }

    if (state.mensaFilters.noCelery) {
        const hasCelery = notes.some(n => n.includes('sellerie')) || name.includes('sellerie');
        if (hasCelery) return false;
    }

    if (state.mensaFilters.noMustard) {
        const hasMustard = notes.some(n => n.includes('senf')) || name.includes('senf');
        if (hasMustard) return false;
    }

    if (state.mensaFilters.noSulfite) {
        const hasSulfite = notes.some(n => n.includes('sulfit') || n.includes('schwefeldioxid') || n.includes('geschwefelt'));
        if (hasSulfite) return false;
    }
    
    return true;
}

export function getMealGroup(meal) {
    if (!meal) return { id: 'other', label: 'Sonstiges', order: 5 };
    const cat = (meal.category || '').toLowerCase().trim();
    const name = (meal.name || '').toLowerCase().trim();

    // 1. Explicit Category Match
    if (cat.includes('suppe') || cat.includes('vorspeise') || cat.includes('starter')) {
        return { id: 'starter', label: 'Vorspeise / Suppe', order: 1 };
    }
    if (cat.includes('dessert') || cat.includes('nachspeise') || cat.includes('nachtisch') || cat.includes('süß')) {
        return { id: 'dessert', label: 'Nachspeise', order: 4 };
    }
    if (cat.includes('beilage') || cat.includes('side') || (cat.includes('salat') && !name.includes('mit'))) {
        return { id: 'side', label: 'Beilage', order: 3 };
    }
    if (cat.includes('haupt') || cat.includes('main') || cat.includes('teller') || cat.includes('gericht')) {
        return { id: 'main', label: 'Hauptgericht', order: 2 };
    }

    // 2. Name-based Match (for generic category tags like "Vegetarisch", "Aktion", "Mensa", etc.)
    if (
        name.includes('suppe') || name.includes('brühe') || name.includes('bouillon') ||
        name.includes('eintopf') || name.includes('cremesuppe')
    ) {
        return { id: 'starter', label: 'Vorspeise / Suppe', order: 1 };
    }
    if (
        name.includes('creme mit') || name.includes('pudding') || name.includes('mousse') ||
        name.includes('kompott') || name.includes('quarkdessert') || name.includes('joghurt') ||
        name.includes('küchel') || name.includes('blätterteig')
    ) {
        return { id: 'dessert', label: 'Nachspeise', order: 4 };
    }
    if (
        name.startsWith('beilage') || name.includes('salat buffet') || name.includes('beilagensalat')
    ) {
        return { id: 'side', label: 'Beilage', order: 3 };
    }

    // 3. Default to Hauptgericht
    return { id: 'main', label: 'Hauptgericht', order: 2 };
}

export function openMealDetailSheet(meal) {
    if (!meal) return;
    const sheet = document.getElementById('meal-detail-sheet');
    if (!sheet) return;
    
    const group = getMealGroup(meal);
    document.getElementById('meal-sheet-category').textContent = group.label;
    document.getElementById('meal-sheet-title').textContent = meal.name;
    
    // Diet badges
    const dietBadgesEl = document.getElementById('meal-sheet-diet-badges');
    const notesEl = document.getElementById('meal-sheet-notes');
    
    const notes = meal.notes || [];
    const dietBadges = [];
    
    notes.forEach(note => {
        const cat = categorizeNote(note);
        if (cat.type !== 'neutral' && !dietBadges.some(b => b.label === cat.label)) {
            dietBadges.push(cat);
        }
    });
    
    dietBadgesEl.innerHTML = dietBadges.map(b => `<span class="diet-badge ${b.type}">${b.label}</span>`).join('');
    
    // Prices
    const p = meal.prices || {};
    document.getElementById('meal-sheet-price-students').textContent = formatPrice(p.students);
    document.getElementById('meal-sheet-price-employees').textContent = formatPrice(p.employees);
    document.getElementById('meal-sheet-price-others').textContent = formatPrice(p.others);
    
    // Notes / Allergens chips
    if (notes.length === 0) {
        notesEl.innerHTML = '<span class="note-chip">Keine Inhaltsstoffe hinterlegt</span>';
    } else {
        notesEl.innerHTML = notes.map(n => {
            const cat = categorizeNote(n);
            return `<span class="note-chip ${cat.type !== 'neutral' ? cat.type : ''}">${n}</span>`;
        }).join('');
    }
    
    // Image
    const imgBox = document.getElementById('meal-sheet-image-box');
    const imgEl = document.getElementById('meal-sheet-image');
    const imgShimmer = document.getElementById('meal-sheet-image-shimmer');
    if (imgBox && imgEl) {
        imgEl.onload = null;
        imgEl.onerror = null;
        if (meal.imageUrl) {
            imgBox.style.display = 'flex';
            imgEl.src = meal.imageUrl;
            if (imgEl.complete && imgEl.naturalWidth > 0) {
                imgEl.style.display = 'block';
                if (imgShimmer) imgShimmer.style.display = 'none';
            } else {
                imgEl.style.display = 'none';
                if (imgShimmer) imgShimmer.style.display = 'block';
                imgEl.onload = () => {
                    imgEl.style.display = 'block';
                    if (imgShimmer) imgShimmer.style.display = 'none';
                };
                imgEl.onerror = () => {
                    imgBox.style.display = 'none';
                    if (imgShimmer) imgShimmer.style.display = 'none';
                };
            }
        } else if (meal.imageUrl === undefined) {
            imgBox.style.display = 'flex';
            imgEl.src = '';
            imgEl.style.display = 'none';
            if (imgShimmer) imgShimmer.style.display = 'block';
        } else {
            imgBox.style.display = 'none';
            imgEl.src = '';
            if (imgShimmer) imgShimmer.style.display = 'none';
        }
    }
    
    sheet.classList.add('open');
}

export function closeMealDetailSheet() {
    closeBottomSheet('meal-detail-sheet');
}

export const MENSA_FILTER_KEYS = [
    { id: 'filter-only-veggie', key: 'onlyVeggie' },
    { id: 'filter-only-vegan', key: 'onlyVegan' },
    { id: 'filter-no-alcohol', key: 'noAlcohol' },
    { id: 'filter-no-pork', key: 'noPork' },
    { id: 'filter-no-beef', key: 'noBeef' },
    { id: 'filter-no-poultry', key: 'noPoultry' },
    { id: 'filter-no-gluten', key: 'noGluten' },
    { id: 'filter-no-lactose', key: 'noLactose' },
    { id: 'filter-no-eggs', key: 'noEggs' },
    { id: 'filter-no-nuts', key: 'noNuts' },
    { id: 'filter-no-soy', key: 'noSoy' },
    { id: 'filter-no-fish', key: 'noFish' },
    { id: 'filter-no-celery', key: 'noCelery' },
    { id: 'filter-no-mustard', key: 'noMustard' },
    { id: 'filter-no-sulfite', key: 'noSulfite' }
];

export function updateMensaFilterDot() {
    const dot = document.getElementById('mensa-filter-status-dot');
    if (!dot) return;
    const hasActive = Object.values(state.mensaFilters).some(v => !!v);
    dot.style.display = hasActive ? 'block' : 'none';
}

export function openMensaFilterSheet() {
    const sheet = document.getElementById('mensa-filter-sheet');
    if (!sheet) return;
    
    MENSA_FILTER_KEYS.forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!state.mensaFilters[key];
    });
    
    sheet.classList.add('open');
}

export function closeMensaFilterSheet() {
    closeBottomSheet('mensa-filter-sheet');
}

export function setupMensaFilterEvents() {
    MENSA_FILTER_KEYS.forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                state.mensaFilters[key] = el.checked;
                localStorage.setItem('thd_mensa_filters', JSON.stringify(state.mensaFilters));
                updateMensaFilterDot();
                loadMensaForDate(state.currentMensaDate);
            });
        }
    });

    const resetBtn = document.getElementById('btn-reset-mensa-filter');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            state.mensaFilters = { ...defaultMensaFilters };
            localStorage.setItem('thd_mensa_filters', JSON.stringify(state.mensaFilters));
            MENSA_FILTER_KEYS.forEach(({ id }) => {
                const el = document.getElementById(id);
                if (el) el.checked = false;
            });
            updateMensaFilterDot();
            loadMensaForDate(state.currentMensaDate);
        });
    }

    updateMensaFilterDot();
}

export function openMensaHoursSheet() {
    const sheet = document.getElementById('mensa-hours-sheet');
    if (!sheet) return;

    const live = getMensaLiveStatus(state.currentMensaDate);
    const liveCard = document.getElementById('mensa-live-status-card');
    if (liveCard) {
        liveCard.innerHTML = `
            <div class="status-indicator-dot ${live.status}"></div>
            <div class="hours-live-text">
                <span class="hours-live-title">${live.title}</span>
                <span class="hours-live-desc">${live.desc}</span>
            </div>
        `;
    }
    sheet.classList.add('open');
}

export function closeMensaHoursSheet() {
    closeBottomSheet('mensa-hours-sheet');
}

export function updateMensaHeaderStatus() {
    const dot = document.getElementById('mensa-header-status-dot');
    const live = getMensaLiveStatus(state.currentMensaDate || new Date());
    if (dot) {
        dot.className = `btn-header-status-dot ${live.status}`;
    }
    const btn = document.getElementById('btn-mensa-hours');
    if (btn) {
        btn.setAttribute('title', `Öffnungszeiten • ${live.title}`);
        btn.setAttribute('aria-label', `Öffnungszeiten: ${live.title}`);
    }
}

export async function loadMensaForDate(date) {
    const content = document.getElementById('widget-content-mensa');
    const detail = document.getElementById('content-mensa');
    
    // Subpage Header & Weekday Strip
    updateSubpageHeader('mensa');
    updateMensaHeaderStatus();
    
    const dayOfWeek = state.currentMensaDate.getDay();
    const live = getMensaLiveStatus(state.currentMensaDate);
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        state.currentLoadedMeals = [];
        const closedHtml = '<div class="loading" style="padding: 20px 0;">Wochenende – Mensa geschlossen</div>';
        if (content) content.innerHTML = closedHtml;
        if (detail) detail.innerHTML = closedHtml;
        return;
    }
    
    const dateIso = formatDateIso(state.currentMensaDate);
    
    if (content && !state.mensaCache[dateIso]) content.innerHTML = getMensaSkeleton(true);
    if (detail && !state.mensaCache[dateIso]) detail.innerHTML = getMensaSkeleton(false);
    
    let meals = state.mensaCache[dateIso];
    if (meals === undefined) {
        try {
            const res = await fetch(`https://openmensa.org/api/v2/canteens/${CONFIG.openMensaCanteenId}/days/${dateIso}/meals`);
            if (res.ok) {
                meals = await res.json();
                
                // Fallbacks from STWNO image library
                const fallbackImages = {
                    'tiroler gröstl': 'https://stwno.de/infomax/Bilder/1996.JPG',
                    'gemüse paella': 'https://stwno.de/infomax/Bilder/1378.JPG',
                    'gemischter salat': 'https://stwno.de/infomax/Bilder/3516.JPG'
                };
                
                const cachedImgMap = state.mensaImageCache ? state.mensaImageCache[dateIso] : null;
                
                meals.forEach(m => {
                    const norm = (m.name || '').toLowerCase().trim();
                    if (cachedImgMap && typeof cachedImgMap === 'object') {
                        let found = null;
                        for (const [stwnoName, url] of Object.entries(cachedImgMap)) {
                            const clean = stwnoName.toLowerCase().trim();
                            if (norm === clean || norm.includes(clean) || clean.includes(norm)) {
                                found = url;
                                break;
                            }
                        }
                        m.imageUrl = found || null;
                    } else {
                        let fb = null;
                        for (const [key, url] of Object.entries(fallbackImages)) {
                            if (norm === key || norm.includes(key) || key.includes(norm)) {
                                fb = url;
                                break;
                            }
                        }
                        m.imageUrl = fb !== null ? fb : undefined;
                    }
                });
                
                state.mensaCache[dateIso] = meals;
            } else {
                meals = [];
                state.mensaCache[dateIso] = [];
            }
        } catch(e) {
            meals = null;
        }
    }
    
    if (!meals || meals.length === 0) {
        state.currentLoadedMeals = [];
        const emptyMsg = '<div class="loading" style="padding: 20px 0;">Keine Gerichte eingetragen oder Mensa geschlossen</div>';
        if (content) content.innerHTML = emptyMsg;
        if (detail) detail.innerHTML = emptyMsg;
        return;
    }
    
    state.currentLoadedMeals = meals;
    // Assign stable dish IDs so image loading and filtering never mismatch
    meals.forEach((m, i) => {
        if (!m._dishId) {
            m._dishId = m.id ? String(m.id) : `dish_${i}_${(m.name || '').substring(0, 12).replace(/\W+/g, '')}`;
        }
    });
    const allowedMeals = meals.filter(isMealAllowed);
    allowedMeals.sort((a, b) => getMealGroup(a).order - getMealGroup(b).order);
    const hiddenMealsCount = meals.length - allowedMeals.length;
    
    // Widget content: allowed meals for the day (scrollable)
    if (content) {
        if (allowedMeals.length === 0) {
            content.innerHTML = `<div class="loading" style="padding: 16px 0;">Keine Gerichte (${hiddenMealsCount} durch Filter ausgeblendet)</div>`;
        } else {
            let wHtml = '';
            allowedMeals.forEach(m => {
                const studentP = formatPrice(m.prices ? m.prices.students : null);
                const grp = getMealGroup(m);
                wHtml += `
                    <div class="list-item mensa-widget-item">
                        <div class="mensa-widget-text">
                            <span class="list-title">${m.name.split(' (')[0].substring(0, 30)}</span>
                            <span class="list-desc">${grp.label}</span>
                        </div>
                        <span class="mensa-widget-price">${studentP}</span>
                    </div>
                `;
            });
            content.innerHTML = wHtml;
        }

        // Ensure no hours badge on the mensa widget header
        const mensaWidgetEl = document.querySelector('.widget[data-id="mensa"]');
        if (mensaWidgetEl) {
            const badge = mensaWidgetEl.querySelector('.widget-badge');
            if (badge) badge.remove();
        }
    }
    
    // Detail subpage
    if (detail) {
        let dHtml = '';

        if (allowedMeals.length === 0) {
            dHtml += `
                <div class="loading" style="padding: 30px 0; display: flex; flex-direction: column; align-items: center; gap: 12px;">
                    <span>Keine passenden Gerichte für die aktuellen Filtereinstellungen (${hiddenMealsCount} ausgeblendet).</span>
                    <button class="filter-reset-btn" id="btn-empty-mensa-filter" style="max-width: 220px;">Filter anpassen</button>
                </div>
            `;
        } else {
            const groupDefs = [
                { id: 'starter', label: 'Vorspeise / Suppe', order: 1 },
                { id: 'main', label: 'Hauptgericht', order: 2 },
                { id: 'side', label: 'Beilage', order: 3 },
                { id: 'dessert', label: 'Nachspeise', order: 4 },
                { id: 'other', label: 'Sonstiges', order: 5 }
            ];

            const groupedMeals = new Map();
            groupDefs.forEach(g => groupedMeals.set(g.id, { def: g, items: [] }));

            allowedMeals.forEach(m => {
                const g = getMealGroup(m);
                if (!groupedMeals.has(g.id)) {
                    groupedMeals.set(g.id, { def: g, items: [] });
                }
                groupedMeals.get(g.id).items.push(m);
            });

            groupedMeals.forEach(({ def, items }) => {
                if (items.length === 0) return;

                dHtml += `
                    <section class="meal-category-group">
                        <div class="meal-category-header">
                            <h3 class="meal-category-title">${def.label}</h3>
                        </div>
                        <div class="meal-category-list">
                `;

                items.forEach(m => {
                    const studentP = formatPrice(m.prices ? m.prices.students : null);
                    
                    const dietBadges = [];
                    const notes = m.notes || [];
                    notes.forEach(note => {
                        const cat = categorizeNote(note);
                        if (cat.type !== 'neutral' && !dietBadges.some(b => b.label === cat.label)) {
                            dietBadges.push(cat);
                        }
                    });
                    const mName = (m.name || '').toLowerCase();
                    if (!dietBadges.some(b => b.label === 'Alkohol') &&
                        (mName.includes('weißbier') || mName.includes('bier') || mName.includes('rotwein') || mName.includes('weißwein') || mName.includes('wein ') || mName.includes('weinsauce') || mName.includes('likör') || mName.includes('rum') || mName.includes('cognac'))
                    ) {
                        dietBadges.push({ label: 'Alkohol', type: 'alcohol' });
                    }
                    
                    const badgesHtml = dietBadges.map(b => `<span class="diet-badge ${b.type}">${b.label}</span>`).join('');
                    
                    let thumbHtml = '';
                    if (m.imageUrl) {
                        thumbHtml = `<div class="meal-card-thumb-wrap" id="meal-thumb-wrap-${m._dishId}"><img src="${m.imageUrl}" class="meal-card-thumb loaded" alt="${m.name}" onerror="this.parentElement.remove()"></div>`;
                    } else if (m.imageUrl === undefined) {
                        thumbHtml = `<div class="meal-card-thumb-wrap" id="meal-thumb-wrap-${m._dishId}"><div class="shimmer-box meal-card-thumb-shimmer"></div></div>`;
                    }
                    
                    dHtml += `
                        <div class="card-item meal-card-interactive" data-meal-id="${m._dishId}">
                            <div class="meal-card-body">
                                ${thumbHtml}
                                <div class="meal-card-info">
                                    <h3 class="meal-dish-name">${m.name}</h3>
                                    <div class="meal-header-left">
                                        ${badgesHtml}
                                    </div>
                                </div>
                                <div class="meal-price-column">
                                    <span class="meal-price-right">${studentP}</span>
                                    <span class="meal-price-sub">Studierende</span>
                                </div>
                            </div>
                        </div>
                    `;
                });

                dHtml += `
                        </div>
                    </section>
                `;
            });
        }
        
        if (hiddenMealsCount > 0) {
            dHtml += `
                <div class="hidden-items-banner">
                    <span>${hiddenMealsCount} Gericht(e) durch Filter ausgeblendet</span>
                    <button id="btn-banner-mensa-filter">Filter anpassen</button>
                </div>
            `;
        }
        
        detail.innerHTML = dHtml;
        updateMensaFilterDot();
        
        // Trigger background image loading if any meal still needs images
        if (meals && meals.some(m => m.imageUrl === undefined)) {
            fetchMensaImagesInBackground(dateIso, meals);
        }
        
        detail.querySelectorAll('.meal-card-interactive').forEach(card => {
            card.addEventListener('click', () => {
                const dishId = card.dataset.mealId;
                const meal = allowedMeals.find(m => m._dishId === dishId);
                if (meal) {
                    openMealDetailSheet(meal);
                }
            });
        });
        
        const bannerBtn = document.getElementById('btn-banner-mensa-filter');
        if (bannerBtn) bannerBtn.addEventListener('click', openMensaFilterSheet);

        const emptyBtn = document.getElementById('btn-empty-mensa-filter');
        if (emptyBtn) emptyBtn.addEventListener('click', openMensaFilterSheet);
    }
}

async function fetchMensaImagesInBackground(dateIso, meals) {
    let imageMap = {};
    try {
        const imgRes = await fetch(`${CONFIG.mensaImagesApiBase}${dateIso}`);
        if (imgRes.ok) {
            imageMap = await imgRes.json();
            if (!state.mensaImageCache) state.mensaImageCache = {};
            state.mensaImageCache[dateIso] = imageMap;
        }
    } catch(e) {
        // Silently ignore if offline
    }

    const fallbackImages = {
        'tiroler gröstl': 'https://stwno.de/infomax/Bilder/1996.JPG',
        'gemüse paella': 'https://stwno.de/infomax/Bilder/1378.JPG',
        'gemischter salat': 'https://stwno.de/infomax/Bilder/3516.JPG'
    };

    meals.forEach(m => {
        if (m.imageUrl !== undefined) return;
        const norm = (m.name || '').toLowerCase().trim();
        let img = null;
        if (imageMap && typeof imageMap === 'object') {
            for (const [stwnoName, url] of Object.entries(imageMap)) {
                const cleanStwno = stwnoName.toLowerCase().trim();
                if (norm === cleanStwno || norm.includes(cleanStwno) || cleanStwno.includes(norm)) {
                    img = url;
                    break;
                }
            }
        }
        if (!img) {
            for (const [key, url] of Object.entries(fallbackImages)) {
                if (norm === key || norm.includes(key) || key.includes(norm)) {
                    img = url;
                    break;
                }
            }
        }
        m.imageUrl = img || null;
    });

    if (formatDateIso(state.currentMensaDate) === dateIso) {
        updateMensaImagesInDom(meals);
    }
}

function updateMensaImagesInDom(meals) {
    meals.forEach((m) => {
        const wrap = document.getElementById(`meal-thumb-wrap-${m._dishId}`);
        if (!wrap) return;
        if (m.imageUrl) {
            const existingImg = wrap.querySelector('img');
            if (existingImg) {
                if (existingImg.src !== m.imageUrl) existingImg.src = m.imageUrl;
                return;
            }
            const img = document.createElement('img');
            img.className = 'meal-card-thumb loading-fade';
            img.alt = m.name;
            const finishLoad = () => {
                img.classList.remove('loading-fade');
                img.classList.add('loaded');
                const shimmer = wrap.querySelector('.shimmer-box');
                if (shimmer) shimmer.remove();
            };
            img.onload = finishLoad;
            img.onerror = () => {
                wrap.remove();
            };
            img.src = m.imageUrl;
            wrap.appendChild(img);
            if (img.complete && img.naturalWidth > 0) {
                finishLoad();
            }
        } else {
            wrap.remove();
        }
    });

    const sheet = document.getElementById('meal-detail-sheet');
    if (sheet && sheet.classList.contains('open')) {
        const sheetTitle = document.getElementById('meal-sheet-title');
        if (sheetTitle) {
            const currentMeal = meals.find(m => m.name === sheetTitle.textContent);
            if (currentMeal) {
                const imgBox = document.getElementById('meal-sheet-image-box');
                const imgEl = document.getElementById('meal-sheet-image');
                const imgShimmer = document.getElementById('meal-sheet-image-shimmer');
                if (imgBox && imgEl) {
                    if (currentMeal.imageUrl) {
                        imgBox.style.display = 'flex';
                        imgEl.src = currentMeal.imageUrl;
                        if (imgEl.complete && imgEl.naturalWidth > 0) {
                            imgEl.style.display = 'block';
                            if (imgShimmer) imgShimmer.style.display = 'none';
                        } else {
                            imgEl.style.display = 'none';
                            if (imgShimmer) imgShimmer.style.display = 'block';
                            imgEl.onload = () => {
                                imgEl.style.display = 'block';
                                if (imgShimmer) imgShimmer.style.display = 'none';
                            };
                            imgEl.onerror = () => {
                                imgBox.style.display = 'none';
                                if (imgShimmer) imgShimmer.style.display = 'none';
                            };
                        }
                    } else if (currentMeal.imageUrl === null) {
                        imgBox.style.display = 'none';
                        if (imgShimmer) imgShimmer.style.display = 'none';
                    }
                }
            }
        }
    }
}

export function setupMensaListeners() {
    // Meal detail sheet close
    const mealSheetBackdrop = document.getElementById('meal-sheet-backdrop');
    if (mealSheetBackdrop) mealSheetBackdrop.addEventListener('click', closeMealDetailSheet);

    const btnCloseMealSheet = document.getElementById('btn-close-meal-sheet');
    if (btnCloseMealSheet) btnCloseMealSheet.addEventListener('click', closeMealDetailSheet);

    // Mensa filter listeners
    const btnMensaFilter = document.getElementById('btn-mensa-filter');
    if (btnMensaFilter) btnMensaFilter.addEventListener('click', openMensaFilterSheet);

    const btnCloseMensaFilter = document.getElementById('btn-close-mensa-filter');
    if (btnCloseMensaFilter) btnCloseMensaFilter.addEventListener('click', closeMensaFilterSheet);

    const mensaFilterBackdrop = document.getElementById('mensa-filter-backdrop');
    if (mensaFilterBackdrop) mensaFilterBackdrop.addEventListener('click', closeMensaFilterSheet);

    setupMensaFilterEvents();

    // Mensa hours listeners
    const btnMensaHours = document.getElementById('btn-mensa-hours');
    if (btnMensaHours) btnMensaHours.addEventListener('click', openMensaHoursSheet);

    const btnCloseMensaHours = document.getElementById('btn-close-mensa-hours');
    if (btnCloseMensaHours) btnCloseMensaHours.addEventListener('click', closeMensaHoursSheet);

    const mensaHoursBackdrop = document.getElementById('mensa-hours-backdrop');
    if (mensaHoursBackdrop) mensaHoursBackdrop.addEventListener('click', closeMensaHoursSheet);

    updateMensaHeaderStatus();
}
