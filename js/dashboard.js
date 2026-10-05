import { state, saveState } from './state.js';
import { openPage, closeBottomSheet } from './navigation.js';

let fetchDataCallback = null;
export function setFetchDataCallback(cb) {
    fetchDataCallback = cb;
}

export function packWidgetsIntoRows() {
    const active = state.widgets.filter(w => w.enabled);
    const rows = [];
    let cur = [];
    active.forEach(w => {
        if (w.spanX === 2) {
            if (cur.length > 0) { rows.push(cur); cur = []; }
            rows.push([w]);
        } else {
            cur.push(w);
            if (cur.length === 2) { rows.push(cur); cur = []; }
        }
    });
    if (cur.length > 0) rows.push(cur);
    return rows;
}

export function renderDashboard() {
    const dashboardGrid = document.getElementById('dashboard-grid');
    const tplWidget = document.getElementById('tpl-widget');
    if (!dashboardGrid || !tplWidget) return;

    dashboardGrid.innerHTML = '';
    const rows = packWidgetsIntoRows();
    
    // Ensure row weights match number of rows
    if (!state.gridRowWeights || state.gridRowWeights.length !== rows.length) {
        state.gridRowWeights = rows.map(() => 1.0);
    } else if (rows.length > 1) {
        const sumWeights = state.gridRowWeights.reduce((a, b) => a + b, 0);
        const minW = Math.max(0.65, (sumWeights / rows.length) * 0.55);
        state.gridRowWeights = state.gridRowWeights.map(w => Math.max(minW, w));
    }
    
    dashboardGrid.style.gridTemplateRows = state.gridRowWeights.map(w => `${w.toFixed(2)}fr`).join(' ');
    dashboardGrid.style.gridTemplateColumns = '1fr';
    
    rows.forEach((row, rowIdx) => {
        const isBottomRow = rowIdx === rows.length - 1;
        const rowEl = document.createElement('div');
        rowEl.className = 'dashboard-row';
        rowEl.dataset.rowIdx = rowIdx;
        
        // Initialize independent column weights for this row
        if (row.length === 2) {
            if (typeof row[0].colWeight !== 'number') row[0].colWeight = 1.0;
            if (typeof row[1].colWeight !== 'number') row[1].colWeight = 1.0;
            const sumCol = row[0].colWeight + row[1].colWeight;
            const minColW = sumCol * 0.38;
            const maxColW = sumCol * 0.62;
            row[0].colWeight = Math.max(minColW, Math.min(maxColW, row[0].colWeight));
            row[1].colWeight = sumCol - row[0].colWeight;
            rowEl.style.gridTemplateColumns = `${row[0].colWeight.toFixed(2)}fr ${row[1].colWeight.toFixed(2)}fr`;
        } else {
            rowEl.style.gridTemplateColumns = '1fr';
        }
        
        row.forEach((w, colIdx) => {
            const clone = tplWidget.content.cloneNode(true);
            const widgetEl = clone.querySelector('.widget');
            widgetEl.dataset.id = w.id;
            
            clone.querySelector('.widget-title').textContent = w.title;
            clone.querySelector('.widget-content').id = `widget-content-${w.id}`;
            
            // Open details
            clone.querySelector('.widget-more').addEventListener('click', (e) => {
                e.stopPropagation();
                openPage(`page-${w.id}`);
            });
            
            let pStartY = 0;
            let pStartX = 0;
            let hasMoved = false;
            
            widgetEl.addEventListener('pointerdown', (e) => {
                pStartY = e.clientY;
                pStartX = e.clientX;
                hasMoved = false;
            });
            
            widgetEl.addEventListener('pointermove', (e) => {
                if (Math.abs(e.clientY - pStartY) > 8 || Math.abs(e.clientX - pStartX) > 8) {
                    hasMoved = true;
                }
            });
            
            widgetEl.addEventListener('click', (e) => {
                if (hasMoved) return; // User was scrolling
                if (e.target.closest('.resize-handle') || e.target.closest('.widget-more')) return;
                openPage(`page-${w.id}`);
            });
            
            // Adaptive proportional resize logic
            const handle = clone.querySelector('.resize-handle');
            
            // Handle placement:
            // For the bottom row: handles are in the top corners (meeting in the middle if 2 widgets!)
            // For other rows: handles are in the bottom corners (meeting in the middle if 2 widgets!)
            if (isBottomRow) {
                if (row.length === 2) {
                    if (colIdx === 0) {
                        handle.classList.add('handle-top-right');
                        widgetEl.classList.add('has-top-handle', 'has-top-right-handle');
                    } else {
                        handle.classList.add('handle-top-left');
                        widgetEl.classList.add('has-top-left-handle');
                    }
                } else {
                    handle.classList.add('handle-top-right');
                    widgetEl.classList.add('has-top-handle', 'has-top-right-handle');
                }
            } else {
                if (row.length === 2) {
                    if (colIdx === 0) {
                        handle.classList.add('handle-bottom-right');
                    } else {
                        handle.classList.add('handle-bottom-left');
                    }
                } else {
                    handle.classList.add('handle-bottom-right');
                }
            }
            
            handle.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const isLeftHandle = handle.classList.contains('handle-bottom-left') || handle.classList.contains('handle-top-left');
                const isTopHandle = handle.classList.contains('handle-top-right') || handle.classList.contains('handle-top-left');
                const startX = e.clientX;
                const startY = e.clientY;
                const initialRowWeights = [...state.gridRowWeights];
                const totalH = dashboardGrid.clientHeight || 1;
                const totalW = rowEl.clientWidth || 1;
                
                const initialRowColWeights = row.length === 2 
                    ? [row[0].colWeight || 1.0, row[1].colWeight || 1.0] 
                    : [1.0];
                
                let targetSpan = w.spanX;
                
                widgetEl.classList.add('is-resizing');
                
                // Create grey outline ghost frame
                const ghostFrame = document.createElement('div');
                ghostFrame.className = 'resize-ghost-frame';
                rowEl.appendChild(ghostFrame);
                
                const onMove = (me) => {
                    const rawDy = me.clientY - startY;
                    const dy = isTopHandle ? -rawDy : rawDy;
                    const dx = me.clientX - startX;
                    
                    // 1. Vertical Resize: this row scales, other rows adapt inversely
                    if (rows.length > 1) {
                        const sumWeights = initialRowWeights.reduce((a, b) => a + b, 0);
                        const weightDelta = (dy / totalH) * sumWeights;
                        
                        const minW = Math.max(0.65, (sumWeights / rows.length) * 0.55);
                        const maxW = sumWeights - (minW * (rows.length - 1));
                        const targetW = Math.max(minW, Math.min(maxW, initialRowWeights[rowIdx] + weightDelta));
                        const actualDelta = targetW - initialRowWeights[rowIdx];
                        
                        state.gridRowWeights[rowIdx] = targetW;
                        
                        // Distribute negative delta across all other rows
                        const otherSum = sumWeights - initialRowWeights[rowIdx];
                        rows.forEach((_, idx) => {
                            if (idx !== rowIdx) {
                                const share = initialRowWeights[idx] / (otherSum || 1);
                                state.gridRowWeights[idx] = Math.max(minW, initialRowWeights[idx] - (actualDelta * share));
                            }
                        });
                        
                        dashboardGrid.style.gridTemplateRows = state.gridRowWeights.map(rw => `${rw.toFixed(2)}fr`).join(' ');
                    }
                    
                    // 2. Horizontal Resize: strictly for this row only!
                    if (row.length === 2) {
                        const sumCol = initialRowColWeights[0] + initialRowColWeights[1];
                        const minColW = sumCol * 0.38;
                        const maxColW = sumCol * 0.62;
                        
                        if (colIdx === 0) {
                            // Left widget, handle bottom-right: pulling right expands col 0
                            const dxRatio = (dx / totalW) * sumCol;
                            const targetColW = Math.max(minColW, Math.min(maxColW, initialRowColWeights[0] + dxRatio));
                            
                            if (dx > 80 || (targetColW / sumCol) >= 0.70) {
                                targetSpan = 2;
                                ghostFrame.className = 'resize-ghost-frame full-width visible';
                            } else {
                                targetSpan = 1;
                                ghostFrame.className = 'resize-ghost-frame';
                                
                                row[0].colWeight = targetColW;
                                row[1].colWeight = sumCol - targetColW;
                                rowEl.style.gridTemplateColumns = `${row[0].colWeight.toFixed(2)}fr ${row[1].colWeight.toFixed(2)}fr`;
                            }
                        } else {
                            // Right widget, handle bottom-left: pulling left (dx < 0) expands col 1
                            const dxRatio = (-dx / totalW) * sumCol;
                            const targetColW = Math.max(minColW, Math.min(maxColW, initialRowColWeights[1] + dxRatio));
                            
                            if (dx < -80 || (targetColW / sumCol) >= 0.70) {
                                targetSpan = 2;
                                ghostFrame.className = 'resize-ghost-frame full-width visible';
                            } else {
                                targetSpan = 1;
                                ghostFrame.className = 'resize-ghost-frame';
                                
                                row[1].colWeight = targetColW;
                                row[0].colWeight = sumCol - targetColW;
                                rowEl.style.gridTemplateColumns = `${row[0].colWeight.toFixed(2)}fr ${row[1].colWeight.toFixed(2)}fr`;
                            }
                        }
                    } else if (w.spanX === 2) {
                        // Full width widget: pulling inward/left to make half-width
                        if (dx < -80) {
                            targetSpan = 1;
                            ghostFrame.className = 'resize-ghost-frame half-left visible';
                        } else {
                            targetSpan = 2;
                            ghostFrame.className = 'resize-ghost-frame';
                        }
                    }
                };
                
                const onUp = () => {
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                    widgetEl.classList.remove('is-resizing');
                    if (ghostFrame.parentNode) ghostFrame.remove();
                    
                    const spanChanged = (targetSpan !== w.spanX);
                    w.spanX = targetSpan;
                    saveState();
                    if (spanChanged) {
                        renderDashboard();
                    }
                };
                
                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
            });
            
            rowEl.appendChild(clone);
        });
        
        dashboardGrid.appendChild(rowEl);
    });
    
    if (fetchDataCallback) fetchDataCallback();
}

export function renderSettings() {
    const settingsWidgets = document.getElementById('settings-widgets');
    if (!settingsWidgets) return;

    settingsWidgets.innerHTML = '';
    state.widgets.forEach(w => {
        const div = document.createElement('div');
        div.className = 'setting-item';
        div.innerHTML = `
            <span>${w.title}</span>
            <label class="switch">
                <input type="checkbox" ${w.enabled ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        `;
        div.querySelector('input').addEventListener('change', (e) => {
            w.enabled = e.target.checked;
            saveState();
            renderDashboard();
        });
        settingsWidgets.appendChild(div);
    });
    
    const studyInput = document.getElementById('input-studygroup');
    if (studyInput) studyInput.value = state.studyGroup;
}

export function setupSettingsListeners() {
    const btnSave = document.getElementById('btn-save-group');
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const input = document.getElementById('input-studygroup');
            if (input) {
                state.studyGroup = input.value;
                localStorage.setItem('thd_studygroup', state.studyGroup);
                openPage('page-dashboard');
                if (fetchDataCallback) fetchDataCallback();
            }
        });
    }

    const btnOpenAbout = document.getElementById('btn-open-about-app');
    const aboutSheet = document.getElementById('about-app-sheet');
    const btnCloseAbout = document.getElementById('btn-close-about-app');
    const aboutBackdrop = document.getElementById('about-app-backdrop');

    if (btnOpenAbout && aboutSheet) {
        btnOpenAbout.addEventListener('click', () => aboutSheet.classList.add('open'));
    }
    if (btnCloseAbout && aboutSheet) {
        btnCloseAbout.addEventListener('click', () => closeBottomSheet('about-app-sheet'));
    }
    if (aboutBackdrop && aboutSheet) {
        aboutBackdrop.addEventListener('click', () => closeBottomSheet('about-app-sheet'));
    }
}
