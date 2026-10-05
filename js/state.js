// Global State Management

export const defaultWidgets = [
    { id: 'schedule', title: 'Stundenplan', enabled: true, spanX: 2 },
    { id: 'parking', title: 'Parkhaus', enabled: true, spanX: 1 },
    { id: 'mensa', title: 'Speiseplan', enabled: true, spanX: 1 },
    { id: 'events', title: 'Events', enabled: true, spanX: 1 },
    { id: 'webcam', title: 'Campus Webcam', enabled: true, spanX: 1 }
];

export const defaultMensaFilters = {
    onlyVeggie: false,
    onlyVegan: false,
    noAlcohol: false,
    noPork: false,
    noBeef: false,
    noPoultry: false,
    noGluten: false,
    noLactose: false,
    noEggs: false,
    noNuts: false,
    noSoy: false,
    noFish: false,
    noCelery: false,
    noMustard: false,
    noSulfite: false
};

export const state = {
    widgets: JSON.parse(JSON.stringify(defaultWidgets)),
    gridRowWeights: [1.25, 1.0, 1.1],
    gridColWeights: [1.0, 1.0],
    studyGroup: 'MT-MP5',
    
    // Subpage & Navigation Dates
    currentScheduleDate: new Date(),
    currentMensaDate: new Date(),
    sheetRefDate: new Date(),
    activeDateTarget: 'schedule', // 'schedule' | 'mensa'
    
    // Cached Data
    allScheduleEvents: [],
    mensaCache: {},
    mensaImageCache: {},
    currentLoadedMeals: [],
    lastWebcamUpdate: null,
    
    // User Filters
    mensaFilters: { ...defaultMensaFilters },
    hiddenLectures: []
};

export function loadSavedState() {
    try {
        const savedWidgets = localStorage.getItem('thd2_widgets_v3');
        if (savedWidgets) {
            const parsed = JSON.parse(savedWidgets);
            const hasWebcam = parsed.some(pw => pw.id === 'webcam');
            state.widgets = defaultWidgets.map(def => {
                const p = parsed.find(pw => pw.id === def.id);
                if (p) {
                    if (!hasWebcam && def.id === 'events' && p.spanX === 2) {
                        return { ...def, ...p, spanX: 1 };
                    }
                    return { ...def, ...p };
                }
                return { ...def };
            });
        }
        
        const savedRows = localStorage.getItem('thd2_row_weights');
        if (savedRows) state.gridRowWeights = JSON.parse(savedRows);
        
        const savedCols = localStorage.getItem('thd2_col_weights');
        if (savedCols) state.gridColWeights = JSON.parse(savedCols);
        
        const savedGroup = localStorage.getItem('thd_studygroup');
        if (savedGroup) state.studyGroup = savedGroup;
        
        const savedMensaFilters = localStorage.getItem('thd_mensa_filters');
        if (savedMensaFilters) {
            state.mensaFilters = { ...defaultMensaFilters, ...JSON.parse(savedMensaFilters) };
        }
        
        const savedHiddenLectures = localStorage.getItem('thd_hidden_lectures');
        if (savedHiddenLectures) state.hiddenLectures = JSON.parse(savedHiddenLectures);
    } catch (e) {
        console.warn('Fehler beim Laden von localStorage:', e);
    }
}

export function saveState() {
    try {
        localStorage.setItem('thd2_widgets_v3', JSON.stringify(state.widgets));
        localStorage.setItem('thd2_row_weights', JSON.stringify(state.gridRowWeights));
        localStorage.setItem('thd2_col_weights', JSON.stringify(state.gridColWeights));
        localStorage.setItem('thd_studygroup', state.studyGroup);
        localStorage.setItem('thd_mensa_filters', JSON.stringify(state.mensaFilters));
        localStorage.setItem('thd_hidden_lectures', JSON.stringify(state.hiddenLectures));
    } catch (e) {
        console.warn('Fehler beim Speichern in localStorage:', e);
    }
}
