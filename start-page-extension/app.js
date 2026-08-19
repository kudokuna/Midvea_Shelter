// app.js — Midvea Shelter

const DEFAULT_APP_SETTINGS = {
    timeFormat: '24',
    accentColor: '#65E6CF',
    openBookmarksInNewTab: false,
    openSearchResultsInNewTab: false,
    isShowWidgetsPanel: true,
    siteColor: '#64B5F6',
    folderColor: '#5C6BC0',
    bookmarksLabelBackground: false,
    bookmarksLabelBackgroundColor: '#000000',
    showWeatherWidget: true,
    showNotesWidget: true,
    showQuotesWidget: true,
    showPomodoroWidget: true,
    showSoundscapeWidget: true,
    widgetOrder: ['weather', 'pomodoro', 'soundscape', 'notes', 'quotes']
};
let appSettings = { ...DEFAULT_APP_SETTINGS };

window.extractRedditMedia = function(post) {
    if (!post || !post.data) return null;
    const d = post.data;
    let url = null;
    let thumb = null;
    let duration = 0;

    if (d.is_video && d.media && d.media.reddit_video) {
        url = d.media.reddit_video.fallback_url;
        duration = d.media.reddit_video.duration || 0;
    } else if (d.preview && d.preview.reddit_video_preview) {
        url = d.preview.reddit_video_preview.fallback_url;
        duration = d.preview.reddit_video_preview.duration || 0;
    } else if (d.url && (d.url.endsWith('.mp4') || d.url.endsWith('.webm'))) {
        url = d.url;
    } else if (d.url && d.url.endsWith('.gifv')) {
        url = d.url.replace('.gifv', '.mp4');
    } else if (d.preview && d.preview.images && d.preview.images.length > 0) {
        url = d.preview.images[0].source.url.replace(/&amp;/g, '&');
    }

    if (!url) return null;
    
    // Ignore videos longer than 35 seconds to save resources
    if (duration > 35) return null;

    if (d.preview && d.preview.images && d.preview.images.length > 0) {
        const imgData = d.preview.images[0];
        thumb = imgData.resolutions && imgData.resolutions.length > 0
            ? imgData.resolutions[Math.min(3, imgData.resolutions.length - 1)].url.replace(/&amp;/g, '&')
            : imgData.source.url.replace(/&amp;/g, '&');
    } else {
        thumb = url;
    }

    return { url, thumb, isVideo: url.includes('.mp4') || url.includes('.webm') };
};

window.applyWallpaper = function(url) {
    const bgImg = document.getElementById('background-image');
    const bgVid = document.getElementById('background-video');
    if (!url) {
        applyWallpaperShade();
        if (bgImg) bgImg.style.backgroundImage = 'none';
        if (bgVid) {
            bgVid.pause();
            bgVid.removeAttribute('src');
            bgVid.load();
            bgVid.classList.add('hidden');
        }
        return;
    }
    if (url.startsWith('data:video/') || url.includes('.mp4') || url.includes('.webm')) {
        if (bgImg) bgImg.style.backgroundImage = 'none';
        if (bgVid) {
            bgVid.src = url;
            bgVid.classList.remove('hidden');
            bgVid.addEventListener('loadeddata', () => sampleWallpaperBrightness(bgVid), { once: true });
            if (!document.hidden && !document.querySelector('.modal-overlay:not(.hidden), .popup-overlay:not(.hidden), .page-viewer:not(.hidden)')) {
                bgVid.play().catch(() => {});
            }
        }
    } else {
        if (bgVid) {
            bgVid.src = '';
            bgVid.classList.add('hidden');
        }
        if (bgImg) bgImg.style.backgroundImage = `url('${url}')`;
        sampleWallpaperImage(url);
    }
};

function applyWallpaperShade(brightness = null) {
    const root = document.documentElement;
    // Conservative fallback keeps remote/CORS-protected wallpapers readable.
    const value = Number.isFinite(brightness) ? brightness : 0.54;
    const start = Math.min(0.46, Math.max(0.14, 0.12 + value * 0.38));
    const end = Math.min(0.58, Math.max(0.25, 0.21 + value * 0.43));
    root.style.setProperty('--wallpaper-shade-start', start.toFixed(3));
    root.style.setProperty('--wallpaper-shade-end', end.toFixed(3));
}

function sampleWallpaperImage(url) {
    // Reddit/CDN preview URLs usually do not allow extension origins. Creating a
    // second Image request for them only produces CORS errors and the canvas is
    // tainted anyway, so keep the safe fallback shade for remote wallpapers.
    const isLocalSource = url.startsWith('data:')
        || url.startsWith('blob:')
        || url.startsWith('chrome-extension:');
    if (!isLocalSource) {
        applyWallpaperShade();
        return;
    }
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => sampleWallpaperBrightness(image);
    image.onerror = () => applyWallpaperShade();
    image.src = url;
}

function sampleWallpaperBrightness(source) {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 20;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return applyWallpaperShade();
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let luminance = 0;
        let samples = 0;
        for (let index = 0; index < pixels.length; index += 16) {
            if (pixels[index + 3] < 32) continue;
            luminance += (0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2]) / 255;
            samples += 1;
        }
        applyWallpaperShade(samples ? luminance / samples : null);
    } catch (error) {
        applyWallpaperShade();
    }
}


// Global error handler for missing favicons (replaces inline onerror which violates MV3 CSP)
document.addEventListener('error', function(e) {
    if (e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
        const parent = e.target.closest('.site-box__icon-image');
        if (parent) {
            const letter = parent.dataset.letter || '?';
            const color = parent.dataset.color || '#64B5F6';
            parent.className = 'site-box__icon-letter';
            parent.style.background = color;
            parent.innerText = letter;
        } else {
            // Hide broken images in dropdowns (search engines, apps)
            e.target.style.display = 'none';
        }
    }
}, true);

document.addEventListener('DOMContentLoaded', () => {
    initPreferences();
    initClock();
    initBackground();
    initQuotes();
    initSearch();
    initSidebar();
    initAIButtons();
    initShortcuts();
    initModals();
    initGoogleApps();
    initPageViewer();
    initGallery();
    initBookmarkImport();
    initWidgetsManager();
    initSpaceAccent();
});

// ================================================================
// CLOCK
// ================================================================
function initClock() {
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');
    function updateTime() {
        const now = new Date();
        if (appSettings.timeFormat === '12') {
            const parts = new Intl.DateTimeFormat('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).formatToParts(now);
            const time = parts
                .filter(part => part.type !== 'dayPeriod')
                .map(part => part.value)
                .join('')
                .trim();
            const period = parts.find(part => part.type === 'dayPeriod')?.value || '';
            clockEl.replaceChildren(document.createTextNode(time));
            const periodElement = document.createElement('span');
            periodElement.className = 'sidebar__period';
            periodElement.textContent = period;
            clockEl.appendChild(periodElement);
        } else {
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            clockEl.textContent = `${h}:${m}`;
        }
        const opts = { weekday: 'long', month: 'long', day: 'numeric' };
        const locale = window.MidveaI18n?.locale || 'en';
        let d = now.toLocaleDateString(locale === 'uk' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US', opts);
        d = d.charAt(0).toUpperCase() + d.slice(1);
        dateEl.textContent = d;
    }
    updateTime();
    window.refreshClock = updateTime;
    setInterval(updateTime, 1000);
}

function initPreferences() {
    chrome.storage.local.get(Object.keys(DEFAULT_APP_SETTINGS), result => {
        const storedSettings = Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
        appSettings = { ...DEFAULT_APP_SETTINGS, ...storedSettings };
        appSettings.accentColor = normalizeColor(appSettings.accentColor, DEFAULT_APP_SETTINGS.accentColor);
        appSettings.siteColor = normalizeColor(appSettings.siteColor, DEFAULT_APP_SETTINGS.siteColor);
        appSettings.folderColor = normalizeColor(appSettings.folderColor, DEFAULT_APP_SETTINGS.folderColor);
        appSettings.bookmarksLabelBackgroundColor = normalizeColor(appSettings.bookmarksLabelBackgroundColor, DEFAULT_APP_SETTINGS.bookmarksLabelBackgroundColor);
        appSettings.widgetOrder = normalizeWidgetOrder(appSettings.widgetOrder);
        applyPreferences(true);
    });
}

function applyPreferences(refreshBookmarks = false) {
    const container = document.querySelector('.container');
    const hasVisibleWidgets = appSettings.showWeatherWidget
        || appSettings.showNotesWidget
        || appSettings.showQuotesWidget
            || appSettings.showPomodoroWidget
            || appSettings.showSoundscapeWidget;
    container?.classList.toggle('sidebar-hidden', !appSettings.isShowWidgetsPanel || !hasVisibleWidgets);
    container?.classList.toggle('labels-background-enabled', appSettings.bookmarksLabelBackground);
    document.documentElement.style.setProperty('--site-color', appSettings.siteColor);
    document.documentElement.style.setProperty('--folder-color', appSettings.folderColor);
    document.documentElement.style.setProperty('--bookmark-label-bg', `${appSettings.bookmarksLabelBackgroundColor}cc`);
    applyAccentColor(appSettings.accentColor);

    document.getElementById('weather-widget')?.classList.toggle('preference-hidden', !appSettings.showWeatherWidget);
    document.getElementById('notes-widget')?.classList.toggle('preference-hidden', !appSettings.showNotesWidget);
    document.getElementById('quotes-widget')?.classList.toggle('preference-hidden', !appSettings.showQuotesWidget);
    document.getElementById('pomodoro-widget')?.classList.toggle('preference-hidden', !appSettings.showPomodoroWidget);
    document.getElementById('soundscape-widget')?.classList.toggle('preference-hidden', !appSettings.showSoundscapeWidget);
    normalizeWidgetOrder(appSettings.widgetOrder).forEach((widget, index) => {
        const element = document.getElementById(`${widget}-widget`);
        if (element) element.style.order = String(index + 1);
    });

    if (window.refreshClock) window.refreshClock();
    if (refreshBookmarks && currentFolderId) loadFolder(currentFolderId);
}

function applyAccentColor(value) {
    const color = normalizeColor(value, DEFAULT_APP_SETTINGS.accentColor);
    const rgb = hexToRgb(color);
    const hover = shiftHexColor(color, -24);
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    const root = document.documentElement.style;
    root.setProperty('--accent', color);
    root.setProperty('--accent-hover', hover);
    root.setProperty('--accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    root.setProperty('--accent-soft', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .16)`);
    root.setProperty('--accent-contrast', luminance > .58 ? '#07111C' : '#FFFFFF');
}

function hexToRgb(value) {
    const hex = normalizeColor(value, DEFAULT_APP_SETTINGS.accentColor).slice(1);
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
}

function shiftHexColor(value, amount) {
    const { r, g, b } = hexToRgb(value);
    const part = channel => Math.min(255, Math.max(0, channel + amount)).toString(16).padStart(2, '0');
    return `#${part(r)}${part(g)}${part(b)}`;
}

function initSpaceAccent() {
    const modal = document.getElementById('space-accent-modal');
    const trigger = document.getElementById('space-accent-btn');
    const colorInput = document.getElementById('space-accent-input');
    const swatches = [...document.querySelectorAll('[data-accent]')];
    if (!modal || !trigger || !colorInput) return;
    let originalColor = appSettings.accentColor;
    let draftColor = originalColor;

    const selectColor = value => {
        draftColor = normalizeColor(value, DEFAULT_APP_SETTINGS.accentColor);
        colorInput.value = draftColor;
        swatches.forEach(button => button.classList.toggle('active', button.dataset.accent.toLowerCase() === draftColor.toLowerCase()));
        applyAccentColor(draftColor);
    };
    const close = restore => {
        if (restore) applyAccentColor(originalColor);
        modal.classList.add('hidden');
    };
    const open = () => {
        originalColor = appSettings.accentColor;
        selectColor(originalColor);
        modal.classList.remove('hidden');
    };

    trigger.addEventListener('click', open);
    swatches.forEach(button => button.addEventListener('click', () => selectColor(button.dataset.accent)));
    colorInput.addEventListener('input', () => selectColor(colorInput.value));
    document.getElementById('close-space-accent-modal')?.addEventListener('click', () => close(true));
    document.getElementById('cancel-space-accent-btn')?.addEventListener('click', () => close(true));
    document.getElementById('reset-space-accent-btn')?.addEventListener('click', () => selectColor(DEFAULT_APP_SETTINGS.accentColor));
    document.getElementById('save-space-accent-btn')?.addEventListener('click', () => {
        appSettings.accentColor = draftColor;
        chrome.storage.local.set({ accentColor: draftColor }, () => close(false));
    });
    modal.addEventListener('click', event => { if (event.target === modal) close(true); });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) close(true);
    });
}

function populateSettingsForm() {
    document.getElementById('settings-time-format').value = appSettings.timeFormat;
    document.getElementById('settings-bookmarks-new-tab').checked = appSettings.openBookmarksInNewTab;
    document.getElementById('settings-search-new-tab').checked = appSettings.openSearchResultsInNewTab;
    document.getElementById('settings-show-sidebar').checked = appSettings.isShowWidgetsPanel;
    document.getElementById('settings-site-color').value = appSettings.siteColor;
    document.getElementById('settings-folder-color').value = appSettings.folderColor;
    document.getElementById('settings-label-background').checked = appSettings.bookmarksLabelBackground;
    document.getElementById('settings-label-background-color').value = appSettings.bookmarksLabelBackgroundColor;
    document.getElementById('settings-widget-weather').checked = appSettings.showWeatherWidget;
    document.getElementById('settings-widget-notes').checked = appSettings.showNotesWidget;
    document.getElementById('settings-widget-quotes').checked = appSettings.showQuotesWidget;
    document.getElementById('settings-widget-pomodoro').checked = appSettings.showPomodoroWidget;
    document.getElementById('settings-widget-soundscape').checked = appSettings.showSoundscapeWidget;
    syncSettingsFormState();
}

function syncSettingsFormState() {
    const labelBackgroundToggle = document.getElementById('settings-label-background');
    const labelBackgroundColor = document.getElementById('settings-label-background-color');
    if (labelBackgroundToggle && labelBackgroundColor) {
        labelBackgroundColor.disabled = !labelBackgroundToggle.checked;
    }
}

function normalizeWidgetOrder(value) {
    const allowed = DEFAULT_APP_SETTINGS.widgetOrder;
    const supplied = Array.isArray(value) ? value.filter(item => allowed.includes(item)) : [];
    return [...new Set([...supplied, ...allowed])];
}

function readSettingsForm() {
    return {
        timeFormat: document.getElementById('settings-time-format').value === '12' ? '12' : '24',
        openBookmarksInNewTab: document.getElementById('settings-bookmarks-new-tab').checked,
        openSearchResultsInNewTab: document.getElementById('settings-search-new-tab').checked,
        isShowWidgetsPanel: document.getElementById('settings-show-sidebar').checked,
        siteColor: normalizeColor(document.getElementById('settings-site-color').value, DEFAULT_APP_SETTINGS.siteColor),
        folderColor: normalizeColor(document.getElementById('settings-folder-color').value, DEFAULT_APP_SETTINGS.folderColor),
        bookmarksLabelBackground: document.getElementById('settings-label-background').checked,
        bookmarksLabelBackgroundColor: normalizeColor(document.getElementById('settings-label-background-color').value, DEFAULT_APP_SETTINGS.bookmarksLabelBackgroundColor),
        showWeatherWidget: document.getElementById('settings-widget-weather').checked,
        showNotesWidget: document.getElementById('settings-widget-notes').checked,
        showQuotesWidget: document.getElementById('settings-widget-quotes').checked,
        showPomodoroWidget: document.getElementById('settings-widget-pomodoro').checked,
        showSoundscapeWidget: document.getElementById('settings-widget-soundscape').checked
    };
}

function initWidgetsManager() {
    const modal = document.getElementById('widgets-modal');
    const controls = {
        isShowWidgetsPanel: document.getElementById('widgets-manager-panel'),
        showWeatherWidget: document.getElementById('widgets-manager-weather'),
        showNotesWidget: document.getElementById('widgets-manager-notes'),
        showQuotesWidget: document.getElementById('widgets-manager-quotes'),
        showPomodoroWidget: document.getElementById('widgets-manager-pomodoro'),
        showSoundscapeWidget: document.getElementById('widgets-manager-soundscape')
    };
    let originalValues = null;
    let draggedWidget = null;

    const managerList = modal.querySelector('.widgets-manager-list');
    const getWidgetItems = () => [...managerList.querySelectorAll('.widgets-manager-item[data-widget-key]')];
    const getManagerOrder = () => getWidgetItems().map(item => item.dataset.widgetKey);
    const applyManagerOrder = () => {
        appSettings.widgetOrder = normalizeWidgetOrder(getManagerOrder());
        applyPreferences(false);
    };
    const renderManagerOrder = () => {
        normalizeWidgetOrder(appSettings.widgetOrder).forEach(key => {
            const item = managerList.querySelector(`[data-widget-key="${key}"]`);
            if (item) managerList.appendChild(item);
        });
    };

    const syncControls = () => {
        Object.entries(controls).forEach(([key, input]) => { input.checked = appSettings[key]; });
    };
    const applyLiveValues = () => {
        Object.entries(controls).forEach(([key, input]) => { appSettings[key] = input.checked; });
        applyPreferences(false);
    };
    const closeWithRestore = () => {
        if (originalValues) appSettings = { ...appSettings, ...originalValues };
        originalValues = null;
        applyPreferences(false);
        modal.classList.add('hidden');
    };

    document.getElementById('widgets-btn')?.addEventListener('click', () => {
        originalValues = Object.fromEntries(Object.keys(controls).map(key => [key, appSettings[key]]));
        originalValues.widgetOrder = [...normalizeWidgetOrder(appSettings.widgetOrder)];
        syncControls();
        renderManagerOrder();
        modal.classList.remove('hidden');
    });
    Object.values(controls).forEach(input => input.addEventListener('change', applyLiveValues));
    document.getElementById('close-widgets-btn')?.addEventListener('click', closeWithRestore);
    document.getElementById('cancel-widgets-btn')?.addEventListener('click', closeWithRestore);
    document.getElementById('save-widgets-btn')?.addEventListener('click', () => {
        applyLiveValues();
        applyManagerOrder();
        const values = {
            ...Object.fromEntries(Object.keys(controls).map(key => [key, appSettings[key]])),
            widgetOrder: [...appSettings.widgetOrder]
        };
        chrome.storage.local.set(values, () => {
            originalValues = null;
            modal.classList.add('hidden');
        });
    });
    modal.addEventListener('click', event => {
        if (event.target === modal) closeWithRestore();
    });

    getWidgetItems().forEach(item => {
        item.draggable = true;
        item.addEventListener('dragstart', event => {
            draggedWidget = item;
            item.classList.add('is-dragging');
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', item.dataset.widgetKey);
        });
        item.addEventListener('dragover', event => {
            event.preventDefault();
            if (!draggedWidget || draggedWidget === item) return;
            const rect = item.getBoundingClientRect();
            const insertAfter = event.clientY > rect.top + rect.height / 2;
            managerList.insertBefore(draggedWidget, insertAfter ? item.nextSibling : item);
            applyManagerOrder();
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('is-dragging');
            draggedWidget = null;
            applyManagerOrder();
        });
    });
}

// ================================================================
// BACKGROUND
// ================================================================
function initBackground() {
    const bgEl = document.getElementById('background-image');
    const btnChange = document.getElementById('change-wallpaper-btn');

    async function loadRedditWallpaper(subreddit = 'wallpapers') {
        try {
            const r = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=50`);
            const data = await r.json();
            const posts = data.data.children.map(window.extractRedditMedia).filter(p => p !== null && (subreddit !== 'LivingBackgrounds' || p.isVideo));
            
            if (posts.length > 0) {
                const randomPost = posts[Math.floor(Math.random() * posts.length)];
                setWallpaper(randomPost.url);
            } else {
                // Fallback if no images found in this subreddit
                bgEl.style.backgroundColor = '#1a1a2e';
                bgEl.style.backgroundImage = '';
            }
        } catch (e) {
            bgEl.style.backgroundColor = '#1a1a2e';
            bgEl.style.backgroundImage = '';
        }
    }

    function setWallpaper(url) {
        window.applyWallpaper(url);
        chrome.storage.local.set({ cachedWallpaper: url, wallpaperTimestamp: Date.now() });
    }

    window.loadWallpaperBySource = function (source) {
        const sources = {
            reddit: () => loadRedditWallpaper('wallpapers'),
            nature: () => loadRedditWallpaper('EarthPorn'),
            EarthPorn: () => loadRedditWallpaper('EarthPorn'),
            city: () => loadRedditWallpaper('CityPorn'),
            CityPorn: () => loadRedditWallpaper('CityPorn'),
            space: () => loadRedditWallpaper('spaceporn'),
            spaceporn: () => loadRedditWallpaper('spaceporn'),
            abstract: () => loadRedditWallpaper('wallpapers'),
            wallpapers: () => loadRedditWallpaper('wallpapers'),
            AnimalPorn: () => loadRedditWallpaper('AnimalPorn'),
            CarPorn: () => loadRedditWallpaper('CarPorn'),
            Animewallpaper: () => loadRedditWallpaper('Animewallpaper'),
            Art: () => loadRedditWallpaper('Art'),
            LivingBackgrounds: () => loadRedditWallpaper('LivingBackgrounds')
        };
        (sources[source] || sources.reddit)();
    };

    // Load from cache or fetch
    chrome.storage.local.get(['cachedWallpaper', 'wallpaperTimestamp', 'wallpaperSource', 'rotateDaily'], (result) => {
        const rotationTime = 24 * 60 * 60 * 1000;
        const isRotateEnabled = result.rotateDaily !== false; // true by default

        // Migrate installations that previously selected a bundled reference catalog.
        // Its cached media is intentionally discarded so it cannot remain in the product.
        if (result.wallpaperSource && result.wallpaperSource.startsWith('flixel_')) {
            chrome.storage.local.set({
                wallpaperSource: 'reddit',
                cachedWallpaper: null,
                wallpaperTimestamp: 0
            }, () => window.loadWallpaperBySource('reddit'));
            return;
        }

        if (result.wallpaperSource === 'custom' || !isRotateEnabled) {
            if (result.cachedWallpaper) {
                window.applyWallpaper(result.cachedWallpaper);
            }
        } else if (result.cachedWallpaper && result.wallpaperTimestamp && (Date.now() - result.wallpaperTimestamp < rotationTime)) {
            window.applyWallpaper(result.cachedWallpaper);
        } else {
            window.loadWallpaperBySource(result.wallpaperSource || 'reddit');
        }
    });

    btnChange.addEventListener('click', () => {
        chrome.storage.local.get(['wallpaperSource'], (r) => {
            window.loadWallpaperBySource(r.wallpaperSource || 'reddit');
        });
    });
}

// ================================================================
// QUOTES WITH CATEGORIES
// ================================================================
const QUOTES_EN = {
    motivation: [
        { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
        { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    ],
    wisdom: [
        { text: "Everything you can imagine is real.", author: "Pablo Picasso" },
        { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
        { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
        { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
        { text: "The unexamined life is not worth living.", author: "Socrates" },
    ],
    humor: [
        { text: "A day without laughter is a day wasted.", author: "Charlie Chaplin" },
        { text: "The brain is a wonderful organ. It starts working the moment you get up in the morning.", author: "Robert Frost" },
        { text: "I'm not lazy, I'm just on my energy saving mode.", author: "Unknown" },
        { text: "Age is of no importance unless you're a cheese.", author: "Billie Burke" },
        { text: "Behind every great man is a woman rolling her eyes.", author: "Jim Carrey" },
    ],
    science: [
        { text: "Science is not only compatible with spirituality; it is a profound source of spirituality.", author: "Carl Sagan" },
        { text: "The good thing about science is that it's true whether or not you believe in it.", author: "Neil deGrasse Tyson" },
        { text: "If you can't explain it simply, you don't understand it well enough.", author: "Albert Einstein" },
        { text: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.", author: "Albert Einstein" },
        { text: "Research is what I'm doing when I don't know what I'm doing.", author: "Wernher von Braun" },
    ]
};
const QUOTES_RU = {
    motivation: [
        { text: 'Успех не окончателен, неудача не фатальна: важна смелость продолжать.', author: 'Уинстон Черчилль' },
        { text: 'Единственный способ делать великую работу — любить то, что вы делаете.', author: 'Стив Джобс' },
        { text: 'Поверьте, что можете, — и вы уже на полпути.', author: 'Теодор Рузвельт' },
        { text: 'Трудности часто готовят обычных людей к необыкновенной судьбе.', author: 'К. С. Льюис' },
        { text: 'Неважно, как медленно вы идёте, пока вы не останавливаетесь.', author: 'Конфуций' }
    ],
    wisdom: [
        { text: 'Всё, что вы можете вообразить, реально.', author: 'Пабло Пикассо' },
        { text: 'В центре каждой трудности скрывается возможность.', author: 'Альберт Эйнштейн' },
        { text: 'Единственная истинная мудрость — знать, что ты ничего не знаешь.', author: 'Сократ' },
        { text: 'Жизнь — это то, что происходит, пока вы строите другие планы.', author: 'Джон Леннон' },
        { text: 'Неисследованная жизнь не стоит того, чтобы её проживать.', author: 'Сократ' }
    ],
    humor: [
        { text: 'День без смеха — потерянный день.', author: 'Чарли Чаплин' },
        { text: 'Мозг — удивительный орган: он начинает работать, как только вы просыпаетесь.', author: 'Роберт Фрост' },
        { text: 'Я не ленивый, я просто в режиме энергосбережения.', author: 'Неизвестно' },
        { text: 'Возраст не имеет значения, если только вы не сыр.', author: 'Билли Бёрк' },
        { text: 'За каждым великим мужчиной стоит женщина, закатывающая глаза.', author: 'Джим Керри' }
    ],
    science: [
        { text: 'Наука не только совместима с духовностью — она является её глубоким источником.', author: 'Карл Саган' },
        { text: 'Наука хороша тем, что она истинна независимо от того, верите вы в неё или нет.', author: 'Нил Деграсс Тайсон' },
        { text: 'Если вы не можете объяснить это просто, вы сами понимаете недостаточно хорошо.', author: 'Альберт Эйнштейн' },
        { text: 'Бесконечны две вещи: Вселенная и человеческая глупость; насчёт Вселенной я не уверен.', author: 'Альберт Эйнштейн' },
        { text: 'Исследование — это то, чем я занимаюсь, когда не знаю, что делаю.', author: 'Вернер фон Браун' }
    ]
};
const QUOTES_UK = {
    motivation: [
        { text: 'Успіх не остаточний, невдача не фатальна: важлива сміливість продовжувати.', author: 'Вінстон Черчилль' },
        { text: 'Єдиний спосіб робити велику справу — любити те, що ви робите.', author: 'Стів Джобс' },
        { text: 'Повірте, що можете, — і ви вже на півдорозі.', author: 'Теодор Рузвельт' },
        { text: 'Труднощі часто готують звичайних людей до надзвичайної долі.', author: 'К. С. Льюїс' },
        { text: 'Неважливо, як повільно ви йдете, доки не зупиняєтеся.', author: 'Конфуцій' }
    ],
    wisdom: [
        { text: 'Усе, що ви можете уявити, реальне.', author: 'Пабло Пікассо' },
        { text: 'У центрі кожної складності прихована можливість.', author: 'Альберт Ейнштейн' },
        { text: 'Єдина справжня мудрість — знати, що ти нічого не знаєш.', author: 'Сократ' },
        { text: 'Життя — це те, що відбувається, поки ви будуєте інші плани.', author: 'Джон Леннон' },
        { text: 'Недосліджене життя не варте того, щоб його проживати.', author: 'Сократ' }
    ],
    humor: [
        { text: 'День без сміху — втрачений день.', author: 'Чарлі Чаплін' },
        { text: 'Мозок — дивовижний орган: він починає працювати, щойно ви прокидаєтеся.', author: 'Роберт Фрост' },
        { text: 'Я не ледачий, я просто в режимі енергозбереження.', author: 'Невідомий автор' },
        { text: 'Вік не має значення, якщо тільки ви не сир.', author: 'Біллі Берк' },
        { text: 'За кожним великим чоловіком стоїть жінка, яка закочує очі.', author: 'Джим Керрі' }
    ],
    science: [
        { text: 'Наука не лише сумісна з духовністю — вона є її глибоким джерелом.', author: 'Карл Саган' },
        { text: 'Наука добра тим, що вона істинна незалежно від того, вірите ви в неї чи ні.', author: 'Ніл Деграсс Тайсон' },
        { text: 'Якщо ви не можете пояснити це просто, ви самі розумієте недостатньо добре.', author: 'Альберт Ейнштейн' },
        { text: 'Нескінченні дві речі: Всесвіт і людська дурість; щодо Всесвіту я не впевнений.', author: 'Альберт Ейнштейн' },
        { text: 'Дослідження — це те, чим я займаюся, коли не знаю, що роблю.', author: 'Вернер фон Браун' }
    ]
};
const QUOTES = window.MidveaI18n?.locale === 'uk' ? QUOTES_UK : window.MidveaI18n?.locale === 'ru' ? QUOTES_RU : QUOTES_EN;

let currentCategory = 'motivation';
let currentQuoteIdx = 0;

function initQuotes() {
    chrome.storage.local.get(['quoteCategory'], (r) => {
        currentCategory = Object.hasOwn(QUOTES, r.quoteCategory) ? r.quoteCategory : 'motivation';
        currentQuoteIdx = Math.floor(Math.random() * QUOTES[currentCategory].length);
        showQuote();
        updateQuoteCatUI();
    });

    document.getElementById('quote-next-btn')?.addEventListener('click', () => {
        const qs = QUOTES[currentCategory];
        currentQuoteIdx = (currentQuoteIdx + 1) % qs.length;
        showQuote();
    });

    document.querySelectorAll('.quotes-widget__category').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.cat;
            currentQuoteIdx = 0;
            showQuote();
            updateQuoteCatUI();
            chrome.storage.local.set({ quoteCategory: currentCategory });
        });
    });
}

function showQuote() {
    const qs = QUOTES[currentCategory];
    const q = qs[currentQuoteIdx % qs.length];
    document.getElementById('quote-text').textContent = `"${q.text}"`;
    document.getElementById('quote-author').textContent = `— ${q.author}`;
}

function updateQuoteCatUI() {
    document.querySelectorAll('.quotes-widget__category').forEach(btn => {
        btn.classList.toggle('quotes-widget__category_active', btn.dataset.cat === currentCategory);
    });
}

// ================================================================
// SEARCH — MULTI-ENGINE + LIVE SUGGESTIONS
// ================================================================
const ENGINES = [
    { id: 'google',     name: 'Google',     url: 'https://www.google.com/search?q=',       icon: 'https://www.google.com/favicon.ico',     suggest: 'https://suggestqueries.google.com/complete/search?client=firefox&q=' },
    { id: 'bing',       name: 'Bing',       url: 'https://www.bing.com/search?q=',         icon: 'https://www.bing.com/favicon.ico',        suggest: null },
    { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=',             icon: 'https://duckduckgo.com/favicon.ico',      suggest: null },
    { id: 'yahoo',      name: 'Yahoo',      url: 'https://search.yahoo.com/search?p=',     icon: 'https://www.yahoo.com/favicon.ico',       suggest: null },
    { id: 'ecosia',     name: 'Ecosia',     url: 'https://www.ecosia.org/search?q=',       icon: 'https://www.ecosia.org/favicon.ico',      suggest: null },
];

let currentEngine = ENGINES[0];

function initSearch() {
    const engineBtn = document.getElementById('engine-btn');
    const engineIcon = document.getElementById('engine-icon');
    const engineMenu = document.getElementById('engine-menu');
    const engineList = document.getElementById('engine-list');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const suggestions = document.getElementById('search-suggestions');

    // Restore saved engine
    chrome.storage.local.get(['searchEngine'], (r) => {
        const saved = ENGINES.find(e => e.id === r.searchEngine);
        if (saved) currentEngine = saved;
        updateEngineUI();
    });

    // Build engine list
    ENGINES.forEach(engine => {
        const item = document.createElement('button');
        item.className = 'engine-item';
        item.type = 'button';
        item.innerHTML = `<img src="${engine.icon}" alt=""> ${engine.name}`;
        item.addEventListener('click', () => {
            currentEngine = engine;
            updateEngineUI();
            chrome.storage.local.set({ searchEngine: engine.id });
            engineMenu.classList.add('hidden');
        });
        engineList.appendChild(item);
    });

    engineBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        engineMenu.classList.toggle('hidden');
        suggestions.classList.add('hidden');
    });

    function updateEngineUI() {
        engineIcon.src = currentEngine.icon;
        document.querySelectorAll('.engine-item').forEach((el, i) => {
            el.classList.toggle('active', ENGINES[i].id === currentEngine.id);
        });
    }

    // Suggestions
    let suggestTimeout;
    searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim();
        clearTimeout(suggestTimeout);
        engineMenu.classList.add('hidden');
        if (!q) { suggestions.classList.add('hidden'); return; }
        suggestTimeout = setTimeout(() => fetchSuggestions(q), 260);
    });

    async function fetchSuggestions(q) {
        if (!currentEngine.suggest) { suggestions.classList.add('hidden'); return; }
        try {
            const r = await fetch(`${currentEngine.suggest}${encodeURIComponent(q)}`);
            const data = await r.json();
            const items = Array.isArray(data[1]) ? data[1] : [];
            if (!items.length) { suggestions.classList.add('hidden'); return; }
            suggestions.innerHTML = '';
            items.slice(0, 8).forEach(s => {
                const li = document.createElement('li');
                li.className = 'google-search-panel__suggestion';
                li.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
                li.appendChild(document.createTextNode(String(s)));
                li.addEventListener('click', () => {
                    searchInput.value = s;
                    suggestions.classList.add('hidden');
                    doSearch(s);
                });
                suggestions.appendChild(li);
            });
            suggestions.classList.remove('hidden');
        } catch (e) {
            suggestions.classList.add('hidden');
        }
    }

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { suggestions.classList.add('hidden'); engineMenu.classList.add('hidden'); }
    });
    document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target)) suggestions.classList.add('hidden');
        if (!engineBtn.contains(e.target) && !engineMenu.contains(e.target)) engineMenu.classList.add('hidden');
    });

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (q) doSearch(q);
    });

    function doSearch(q) {
        const isUrl = /^https?:\/\//i.test(q) || (!/\s/.test(q) && /^[^/]+\.[^/]+/.test(q));
        const targetUrl = isUrl
            ? (/^https?:\/\//i.test(q) ? q : `https://${q}`)
            : currentEngine.url + encodeURIComponent(q);
        if (appSettings.openSearchResultsInNewTab) {
            chrome.tabs.create({ url: targetUrl });
            searchInput.value = '';
            suggestions.classList.add('hidden');
            return;
        }
        if (isUrl) {
            window.location.href = targetUrl;
        } else {
            window.location.href = targetUrl;
        }
    }
}

// ================================================================
// SIDEBAR / DOCK BUTTONS
// ================================================================
function initSidebar() {
    const actions = {
        bookmarks: 'chrome://bookmarks/',
        history: 'chrome://history/',
        downloads: 'chrome://downloads/',
        extensions: 'chrome://extensions/',
        webstore: 'https://chrome.google.com/webstore',
    };
    document.querySelectorAll('.dock-btn[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = actions[btn.dataset.action];
            if (url) chrome.tabs.create({ url });
        });
    });
}

// ================================================================
// AI BUTTONS (ChatGPT + Gemini)
// ================================================================
function initAIButtons() {
    const chatgptBtn = document.getElementById('chatgpt-btn');
    const geminiBtn = document.getElementById('gemini-btn');
    if (chatgptBtn) chatgptBtn.addEventListener('click', () => chrome.tabs.create({ url: 'https://chatgpt.com' }));
    if (geminiBtn) geminiBtn.addEventListener('click', () => chrome.tabs.create({ url: 'https://gemini.google.com' }));
}

// ================================================================
// ICON CUSTOMIZATION
// ================================================================
let editingIconData = { color: null, imageData: null, letter: '', bookmarkId: null };

function loadCustomIcons(cb) {
    chrome.storage.local.get(['customIcons'], (r) => cb(r.customIcons || {}));
}

function saveCustomIcon(id, data) {
    loadCustomIcons((icons) => {
        icons[id] = data;
        chrome.storage.local.set({ customIcons: icons });
    });
}

editingIconData = { color: appSettings.siteColor, imageData: null, letter: '?', forceLetter: false, bookmarkId: null };

function bindIconActions(prefix) {
    const preview = document.getElementById(prefix === 'add' ? 'add-bm-icon-preview' : 'icon-edit-preview');
    const uploadBtn = document.getElementById(`${prefix}-upload-icon-btn`);
    const colorInput = document.getElementById(prefix === 'add' ? 'add-color-icon-input' : 'custom-color-picker');
    const searchBtn = document.getElementById(`${prefix}-search-icon-btn`);
    const fileInput = document.getElementById(prefix === 'add' ? 'add-icon-file-input' : 'icon-file-input');
    
    function updatePreview() {
        if (!preview) return;
        if (editingIconData.imageData) {
            preview.innerHTML = `<img src="${escapeHtml(editingIconData.imageData)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
            preview.style.background = 'transparent';
        } else {
                preview.textContent = editingIconData.letter || '?';
            preview.style.background = editingIconData.color || appSettings.siteColor;
        }
    }

    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                editingIconData.imageData = e.target.result;
                editingIconData.forceLetter = false;
                updatePreview();
            };
            reader.readAsDataURL(file);
            fileInput.value = '';
        });
    }

    if (colorInput) {
        colorInput.addEventListener('input', (e) => {
            editingIconData.color = e.target.value;
            editingIconData.imageData = null;
            editingIconData.forceLetter = true;
            updatePreview();
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const titleInput = document.getElementById(prefix === 'add' ? 'bm-title' : 'edit-bm-title');
            let query = titleInput ? titleInput.value.trim() : '';
            if (!query) return alert('\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0434\u043b\u044f \u043f\u043e\u0438\u0441\u043a\u0430 \u0438\u043a\u043e\u043d\u043a\u0438');
            
            openImageSearchModal(query + ' icon', () => {
                updatePreview();
            });
        });
    }
}

function initIconEdit() {
    bindIconActions('add');
    bindIconActions('edit');
}

function openEditModalWithIcon(item) {
    document.getElementById('edit-bm-id').value = item.id;
    document.getElementById('edit-bm-title').value = item.title;
    document.getElementById('edit-bm-url').value = item.url || '';

    const letter = item.title.charAt(0).toUpperCase();
    editingIconData = { color: appSettings.siteColor, imageData: null, letter, forceLetter: false, bookmarkId: item.id };

    loadCustomIcons((icons) => {
        if (icons[item.id]) {
            editingIconData.color = icons[item.id].color || editingIconData.color;
            editingIconData.imageData = icons[item.id].imageData || null;
            editingIconData.forceLetter = icons[item.id].forceLetter || false;
        }
        const colorPicker = document.getElementById('custom-color-picker');
        if (colorPicker) colorPicker.value = normalizeColor(editingIconData.color);
        const preview = document.getElementById('icon-edit-preview');
        if (preview) {
            if (editingIconData.imageData) {
                preview.innerHTML = `<img src="${escapeHtml(editingIconData.imageData)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
                preview.style.background = 'transparent';
            } else if (editingIconData.forceLetter) {
                preview.textContent = letter;
                preview.style.background = editingIconData.color;
            } else {
                const faviconUrl = getFaviconUrl(item.url);
                preview.innerHTML = `<img src="${faviconUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`;
                preview.style.background = 'transparent';
            }
        }
    });

    document.getElementById('edit-bookmark-modal').classList.remove('hidden');
}

// ================================================================
// BOOKMARKS — FOLDERS + DRAG-DROP + CONTEXT MENU
// ================================================================
let bookmarksFolderId = null;
const FOLDER_NAME = 'Midvea Shelter';
let currentFolderId = null;
let folderStack = [];
let contextTarget = null;
let pendingDeleteItem = null;
let pendingMoveItem = null;
let selectedMoveFolderId = null;
let blockedMoveFolderIds = new Set();
let activeBookmarkTabId = null;
let bookmarkTabMenuTarget = null;
let draggedBookmarkTabId = null;
let folderPopupStack = [];
let folderPopupDrag = null;
let addBookmarkTargetFolderId = null;
let folderMenuTarget = null;
let bookmarkRefreshTimer = null;
let bookmarkEventsBound = false;
let folderPopupRenderId = 0;
let folderPopupSuppressClickUntil = 0;

function initShortcuts() {
    initContextMenu();
    initBookmarkTabControls();
    initFolderPopup();
    bindChromeBookmarkEvents();
    resolveBookmarksRoot();
}

function resolveBookmarksRoot() {
    chrome.storage.local.get(['bookmarksFolderId'], stored => {
        const savedId = stored.bookmarksFolderId;
        if (!savedId) {
            findOrCreateBookmarksRoot();
            return;
        }
        chrome.bookmarks.get(savedId, result => {
            if (!chrome.runtime.lastError && result?.[0] && !result[0].url) {
                activateBookmarksRoot(result[0].id);
                return;
            }
            findOrCreateBookmarksRoot();
        });
    });
}

function findOrCreateBookmarksRoot() {
    chrome.bookmarks.search({ title: FOLDER_NAME }, results => {
        const folder = (results || []).find(item => !item.url && item.title === FOLDER_NAME);
        if (folder) {
            activateBookmarksRoot(folder.id);
            return;
        }
        chrome.bookmarks.create({ title: FOLDER_NAME }, newFolder => {
            if (chrome.runtime.lastError || !newFolder) {
                console.warn('Не удалось создать папку Midvea Shelter:', chrome.runtime.lastError?.message);
                return;
            }
            activateBookmarksRoot(newFolder.id);
            chrome.bookmarks.create({ parentId: newFolder.id, title: 'YouTube', url: 'https://youtube.com' });
            chrome.bookmarks.create({ parentId: newFolder.id, title: 'GitHub', url: 'https://github.com' });
        });
    });
}

function activateBookmarksRoot(folderId) {
    bookmarksFolderId = folderId;
    chrome.storage.local.set({ bookmarksFolderId: folderId });
    initializeBookmarkTabs();
}

function bindChromeBookmarkEvents() {
    if (bookmarkEventsBound) return;
    bookmarkEventsBound = true;
    const schedule = () => {
        clearTimeout(bookmarkRefreshTimer);
        bookmarkRefreshTimer = setTimeout(refreshBookmarksFromChrome, 140);
    };
    chrome.bookmarks.onCreated.addListener(schedule);
    chrome.bookmarks.onChanged.addListener(schedule);
    chrome.bookmarks.onMoved.addListener(schedule);
    chrome.bookmarks.onRemoved.addListener(schedule);
    if (chrome.bookmarks.onChildrenReordered) chrome.bookmarks.onChildrenReordered.addListener(schedule);
}

function refreshBookmarksFromChrome() {
    if (!bookmarksFolderId) return;
    chrome.bookmarks.get(bookmarksFolderId, root => {
        if (chrome.runtime.lastError || !root?.[0]) {
            bookmarksFolderId = null;
            currentFolderId = null;
            activeBookmarkTabId = null;
            resolveBookmarksRoot();
            return;
        }
        refreshBookmarkTabs();
        const targetFolderId = currentFolderId || bookmarksFolderId;
        chrome.bookmarks.get(targetFolderId, result => {
            if (chrome.runtime.lastError || !result?.[0]) {
                selectBookmarkTab(bookmarksFolderId);
                return;
            }
            loadFolder(targetFolderId);
            if (folderPopupStack.length) renderFolderPopup();
        });
    });
}

function initializeBookmarkTabs() {
    chrome.bookmarks.getChildren(bookmarksFolderId, children => {
        if (chrome.runtime.lastError) {
            resolveBookmarksRoot();
            return;
        }
        const categoryIds = new Set(children.filter(item => !item.url).map(item => item.id));
        chrome.storage.local.get(['activeBookmarkTabId'], result => {
            const savedId = result.activeBookmarkTabId;
            activeBookmarkTabId = categoryIds.has(savedId) ? savedId : bookmarksFolderId;
            currentFolderId = activeBookmarkTabId;
            folderStack = [];
            renderBookmarkTabs(children);
            loadFolder(currentFolderId);
        });
    });
}

function refreshBookmarkTabs() {
    if (!bookmarksFolderId) return;
    chrome.bookmarks.getChildren(bookmarksFolderId, renderBookmarkTabs);
}

function renderBookmarkTabs(rootChildren) {
    const tabs = document.getElementById('bookmark-tabs');
    if (!tabs) return;
    tabs.innerHTML = '';
    const categories = [
        { id: bookmarksFolderId, title: 'Главная', isMain: true },
        ...rootChildren.filter(item => !item.url).map(item => ({ id: item.id, title: item.title }))
    ];
    categories.forEach(category => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'bookmark-tab';
        button.textContent = category.title;
        button.title = category.isMain ? 'Основные закладки' : `${category.title} · правый клик для управления`;
        button.classList.toggle('active', category.id === activeBookmarkTabId);
        button.addEventListener('click', () => selectBookmarkTab(category.id));
        // Category tabs are folders too: allow a shortcut/folder from the grid
        // to be dropped directly onto them without opening the category first.
        button.addEventListener('dragover', event => {
            if (!dragSrcId || dragSrcId === category.id) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'move';
            tabs.querySelectorAll('.bookmark-tab').forEach(tab => tab.classList.remove('item-drop-target'));
            button.classList.add('item-drop-target');
        });
        button.addEventListener('dragleave', () => button.classList.remove('item-drop-target'));
        button.addEventListener('drop', event => {
            if (!dragSrcId || dragSrcId === category.id) return;
            event.preventDefault();
            event.stopPropagation();
            button.classList.remove('item-drop-target');
            dragDidDrop = true;
            const source = { id: dragSrcId, isFolder: dragSrcIsFolder };
            canMoveBookmarkToFolder(source, category.id, error => {
                if (error) {
                    alert(error);
                    return;
                }
                chrome.bookmarks.move(source.id, { parentId: category.id }, () => {
                    if (chrome.runtime.lastError) {
                        alert(`Не удалось переместить: ${chrome.runtime.lastError.message}`);
                        return;
                    }
                    loadFolder(currentFolderId);
                    refreshBookmarkTabs();
                });
            });
        });
        if (!category.isMain) {
            button.draggable = true;
            button.addEventListener('dragstart', event => {
                draggedBookmarkTabId = category.id;
                button.classList.add('dragging');
                event.dataTransfer.effectAllowed = 'move';
            });
            button.addEventListener('dragover', event => {
                if (dragSrcId || !draggedBookmarkTabId || draggedBookmarkTabId === category.id) return;
                event.preventDefault();
                button.classList.add('drag-over');
            });
            button.addEventListener('dragleave', () => button.classList.remove('drag-over'));
            button.addEventListener('drop', event => {
                if (dragSrcId) return;
                event.preventDefault();
                button.classList.remove('drag-over');
                reorderBookmarkCategory(draggedBookmarkTabId, category.id);
            });
            button.addEventListener('dragend', () => {
                draggedBookmarkTabId = null;
                tabs.querySelectorAll('.bookmark-tab').forEach(tab => tab.classList.remove('dragging', 'drag-over', 'item-drop-target'));
            });
            button.addEventListener('dblclick', event => {
                event.preventDefault();
                renameBookmarkCategory(category);
            });
            button.addEventListener('contextmenu', event => {
                event.preventDefault();
                showBookmarkTabMenu(event.clientX, event.clientY, category);
            });
        }
        tabs.appendChild(button);
    });
}

function reorderBookmarkCategory(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    chrome.bookmarks.getChildren(bookmarksFolderId, children => {
        const target = children.find(item => item.id === targetId);
        if (!target) return;
        chrome.bookmarks.move(sourceId, { parentId: bookmarksFolderId, index: target.index }, () => {
            if (chrome.runtime.lastError) {
                alert(`Не удалось изменить порядок: ${chrome.runtime.lastError.message}`);
                return;
            }
            refreshBookmarkTabs();
        });
    });
}

function selectBookmarkTab(folderId) {
    activeBookmarkTabId = folderId;
    currentFolderId = folderId;
    folderStack = [];
    chrome.storage.local.set({ activeBookmarkTabId: folderId });
    refreshBookmarkTabs();
    loadFolder(folderId);
}

function initBookmarkTabControls() {
    document.getElementById('bookmark-tab-add')?.addEventListener('click', () => {
        const title = prompt('Название новой категории:')?.trim();
        if (!title || !bookmarksFolderId) return;
        chrome.bookmarks.create({ parentId: bookmarksFolderId, title }, folder => {
            if (chrome.runtime.lastError) {
                alert(`Не удалось создать категорию: ${chrome.runtime.lastError.message}`);
                return;
            }
            selectBookmarkTab(folder.id);
        });
    });

    document.getElementById('bookmark-tab-rename')?.addEventListener('click', () => {
        if (bookmarkTabMenuTarget) renameBookmarkCategory(bookmarkTabMenuTarget);
        closeBookmarkTabMenu();
    });
    document.getElementById('bookmark-tab-delete')?.addEventListener('click', () => {
        const category = bookmarkTabMenuTarget;
        closeBookmarkTabMenu();
        if (!category) return;
        const approved = confirm(`Удалить категорию «${category.title}» и все закладки внутри неё?`);
        if (!approved) return;
        removeBookmarkTreeWithCleanup(category.id, error => {
            if (error) {
                alert(`Не удалось удалить категорию: ${error.message}`);
                return;
            }
            if (activeBookmarkTabId === category.id) selectBookmarkTab(bookmarksFolderId);
            else refreshBookmarkTabs();
        });
    });
    document.getElementById('bookmark-toolbar-add')?.addEventListener('click', openAddBookmarkModal);
    document.getElementById('bookmark-toolbar-folder')?.addEventListener('click', () => {
        const title = prompt('Название новой папки:')?.trim();
        if (!title || !currentFolderId) return;
        chrome.bookmarks.create({ parentId: currentFolderId, title }, () => {
            if (chrome.runtime.lastError) {
                alert(`Не удалось создать папку: ${chrome.runtime.lastError.message}`);
                return;
            }
            loadFolder(currentFolderId);
        });
    });
    document.getElementById('bookmark-toolbar-import')?.addEventListener('click', () => {
        document.getElementById('bookmark-import-input')?.click();
    });
    document.addEventListener('click', event => {
        if (!event.target.closest('#bookmark-tab-menu')) closeBookmarkTabMenu();
    });
}

function renameBookmarkCategory(category) {
    const title = prompt('Новое название категории:', category.title)?.trim();
    if (!title || title === category.title) return;
    chrome.bookmarks.update(category.id, { title }, () => {
        if (chrome.runtime.lastError) alert(`Не удалось переименовать категорию: ${chrome.runtime.lastError.message}`);
        else refreshBookmarkTabs();
    });
}

function showBookmarkTabMenu(x, y, category) {
    bookmarkTabMenuTarget = category;
    document.getElementById('context-menu')?.classList.add('hidden');
    const menu = document.getElementById('bookmark-tab-menu');
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - 220))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - 100))}px`;
    menu.classList.remove('hidden');
}

function closeBookmarkTabMenu() {
    bookmarkTabMenuTarget = null;
    document.getElementById('bookmark-tab-menu')?.classList.add('hidden');
}

function loadFolder(folderId) {
    chrome.bookmarks.getChildren(folderId, (children) => {
        if (chrome.runtime.lastError) {
            if (folderId !== bookmarksFolderId) selectBookmarkTab(bookmarksFolderId);
            return;
        }
        const visible = folderId === bookmarksFolderId ? children.filter(item => item.url) : children;
        renderShortcuts(visible);
    });
}

function getFaviconUrl(url) {
    try { 
        const hostname = new URL(url).hostname;
        // icon.horse is not blocked by adblockers and natively generates a letter image if the icon is missing!
        return `https://icon.horse/icon/${hostname}?fallback_bg=${appSettings.siteColor.slice(1)}&fallback_text_color=ffffff`;
    }
    catch (e) { return ''; }
}

function renderShortcuts(items) {
    const grid = document.getElementById('shortcuts-grid');
    grid.innerHTML = '';

    // Back button
    if (folderStack.length > 0) {
        const back = createSiteBox('←', 'Назад', '#546E7A', () => {
            currentFolderId = folderStack.pop() || bookmarksFolderId;
            loadFolder(currentFolderId);
        });
        grid.appendChild(back);
    }

    loadCustomIcons((customIcons) => {
        items.forEach(item => {
            let box;
            if (!item.url) {
                // Folder
                box = document.createElement('div');
                box.className = 'site-box site-box--folder';
                box.dataset.id = item.id;
                box.dataset.type = 'folder';
                box.innerHTML = `
                    <div class="site-box__icon-folder" aria-hidden="true">
                        <svg viewBox="0 0 64 52" fill="none"><path d="M4 9a5 5 0 0 1 5-5h17l7 7h22a5 5 0 0 1 5 5v27a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" fill="currentColor"/><path d="M4 17h56" stroke="rgba(0,0,0,.12)" stroke-width="2"/></svg>
                    </div>
                    <span class="site-box__label">${escapeHtml(item.title)}</span>
                `;
                box.addEventListener('click', () => {
                    if (Date.now() < dragSuppressClickUntil) return;
                    openFolderPopup(item);
                });
                box.addEventListener('contextmenu', event => {
                    event.preventDefault();
                    showFolderItemMenu(event.clientX, event.clientY, item);
                });
                box.draggable = true;
                box.addEventListener('dragstart', onDragStart);
                box.addEventListener('dragover', onFolderDragOver);
                box.addEventListener('dragleave', () => box.classList.remove('drag-over', 'folder-drop-target'));
                box.addEventListener('drop', event => onFolderDrop(event, item.id));
                box.addEventListener('dragend', onDragEnd);
            } else {
                // Bookmark
                box = document.createElement('div');
                box.className = 'site-box';
                box.dataset.id = item.id;
                box.dataset.url = item.url;
                box.dataset.title = item.title;
                box.dataset.type = 'bookmark';

                const letter = item.title.charAt(0).toUpperCase();
                const custom = customIcons[item.id];
                const color = (custom && custom.color) ? custom.color : appSettings.siteColor;
                const customImg = custom && custom.imageData;
                const forceLetter = custom && custom.forceLetter;
                const faviconUrl = getFaviconUrl(item.url);

                let iconHtml;
                if (customImg) {
                    iconHtml = `<div class="site-box__icon-image">
                        <img src="${escapeHtml(customImg)}" alt="">
                    </div>`;
                } else if (forceLetter) {
                    iconHtml = `<div class="site-box__icon-letter" style="background:${normalizeColor(color)}">${escapeHtml(letter)}</div>`;
                } else {
                    iconHtml = `<div class="site-box__icon-image" style="background:transparent" data-letter="${letter}" data-color="${color}">
                        <img src="${faviconUrl}" alt="" loading="lazy">
                    </div>`;
                }

                box.innerHTML = `
                    ${iconHtml}
                    <span class="site-box__label">${escapeHtml(item.title)}</span>
                `;

                box.addEventListener('click', () => {
                    openBookmarkUrl(item.url);
                });
                box.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    showContextMenu(e.clientX, e.clientY, item);
                });

                // Native drag remains the most reliable option inside a Chrome
                // new-tab override; neighbours are animated with FLIP below.
                box.draggable = true;
                box.addEventListener('dragstart', onDragStart);
                box.addEventListener('dragover', onDragOver);
                box.addEventListener('drop', onDrop);
                box.addEventListener('dragend', onDragEnd);
            }
            grid.appendChild(box);
        });

        // Add button
        const addBox = document.createElement('div');
        addBox.className = 'site-box site-box--add';
        addBox.innerHTML = `
            <div class="site-box__icon-letter">+</div>
            <span class="site-box__label">Добавить</span>
        `;
        addBox.addEventListener('click', openAddBookmarkModal);
        grid.appendChild(addBox);
    });
}

function createSiteBox(icon, label, color, onClick) {
    const box = document.createElement('div');
    box.className = 'site-box';
    box.innerHTML = `<div class="site-box__icon-letter" style="background:${normalizeColor(color)}">${escapeHtml(icon)}</div><span class="site-box__label">${escapeHtml(label)}</span>`;
    box.addEventListener('click', onClick);
    return box;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
}

function normalizeColor(value, fallback = appSettings.siteColor) {
    return /^#[0-9a-f]{6}$/i.test(value || '') ? value.toUpperCase() : fallback;
}

function openBookmarkUrl(url) {
    if (appSettings.openBookmarksInNewTab) chrome.tabs.create({ url });
    else window.location.href = url;
}

function normalizeBookmarkUrl(value) {
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
        const parsed = new URL(candidate);
        if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return null;
        return parsed.href;
    } catch (error) {
        return null;
    }
}

// Native Drag & Drop with live FLIP reordering.
let dragSrcId = null;
let dragDidDrop = false;
let dragSrcIsFolder = false;
let dragSuppressClickUntil = 0;

function onDragStart(event) {
    dragSrcId = this.dataset.id;
    dragSrcIsFolder = this.dataset.type === 'folder';
    dragDidDrop = false;
    this.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dragSrcId);
}

function onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const grid = this.parentElement;
    const dragged = [...grid.querySelectorAll('.site-box[data-id]')]
        .find(box => box.dataset.id === dragSrcId);
    if (!dragged || dragged === this) return;
    document.querySelectorAll('.site-box').forEach(box => box.classList.remove('drag-over'));
    this.classList.add('drag-over');
    const targetRect = this.getBoundingClientRect();
    const before = event.clientX < targetRect.left + targetRect.width / 2;
    const referenceNode = before ? this : this.nextSibling;
    if (referenceNode === dragged || dragged.nextSibling === referenceNode) return;
    animateGridReorder(grid, () => grid.insertBefore(dragged, referenceNode));
}

function animateGridReorder(grid, mutate) {
    const movable = [...grid.querySelectorAll('.site-box[data-id]')];
    const previousPositions = new Map(movable.map(element => [element, element.getBoundingClientRect()]));
    mutate();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    movable.forEach(element => {
        const previous = previousPositions.get(element);
        const next = element.getBoundingClientRect();
        const deltaX = previous.left - next.left;
        const deltaY = previous.top - next.top;
        if (!deltaX && !deltaY) return;
        element.animate([
            { transform: `translate(${deltaX}px, ${deltaY}px)` },
            { transform: 'translate(0, 0)' }
        ], {
            duration: 300,
            easing: 'cubic-bezier(0.18, 0.84, 0.32, 1.18)'
        });
    });
}

function onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!dragSrcId) return;
    dragDidDrop = true;
    persistChromeBookmarkOrder(this.parentElement, currentFolderId);
}

function persistChromeBookmarkOrder(grid, folderId) {
    const visibleIds = [...grid.querySelectorAll('[data-id]')].map(box => box.dataset.id);
    chrome.bookmarks.getChildren(folderId, children => {
        if (chrome.runtime.lastError) return;
        const visibleSet = new Set(visibleIds);
        const hiddenIds = children.filter(item => !visibleSet.has(item.id)).map(item => item.id);
        const desiredIds = [...hiddenIds, ...visibleIds];
        let index = 0;
        const moveNext = () => {
            if (index >= desiredIds.length) {
                refreshBookmarkTabs();
                return;
            }
            const id = desiredIds[index];
            chrome.bookmarks.move(id, { parentId: folderId, index }, () => {
                index += 1;
                moveNext();
            });
        };
        moveNext();
    });
}

function onFolderDragOver(event) {
    if (!dragSrcId || dragSrcId === this.dataset.id) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    // A folder is an explicit destination. Using its whole tile as the drop
    // target makes the interaction predictable on both mouse and touchpads.
    document.querySelectorAll('.site-box').forEach(box => box.classList.remove('drag-over', 'folder-drop-target'));
    this.classList.add('folder-drop-target');
}

function onFolderDrop(event, destinationId) {
    event.preventDefault();
    event.stopPropagation();
    if (!dragSrcId || dragSrcId === destinationId) return;
    dragDidDrop = true;
    const moveInside = event.currentTarget.classList.contains('folder-drop-target');
    event.currentTarget.classList.remove('drag-over', 'folder-drop-target');
    if (!moveInside) {
        persistChromeBookmarkOrder(event.currentTarget.parentElement, currentFolderId);
        return;
    }
    const sourceId = dragSrcId;
    const draggedItem = { id: sourceId, isFolder: dragSrcIsFolder };
    canMoveBookmarkToFolder(draggedItem, destinationId, error => {
        if (error) {
            alert(error);
            return;
        }
        chrome.bookmarks.move(sourceId, { parentId: destinationId }, () => {
            if (chrome.runtime.lastError) {
                alert(`Не удалось переместить: ${chrome.runtime.lastError.message}`);
            }
            loadFolder(currentFolderId);
            refreshBookmarkTabs();
        });
    });
}

function initFolderPopup() {
    document.getElementById('folder-grid-close')?.addEventListener('click', closeFolderPopup);
    document.getElementById('folder-grid-back')?.addEventListener('click', () => {
        if (folderPopupStack.length <= 1) return;
        folderPopupStack.pop();
        renderFolderPopup();
    });
    const heading = document.querySelector('.folder-grid-heading');
    heading?.addEventListener('dragover', onFolderGridParentOver);
    heading?.addEventListener('dragleave', () => heading.classList.remove('parent-drop-target'));
    heading?.addEventListener('drop', onFolderGridParentDrop);
    document.getElementById('folder-grid-modal')?.addEventListener('click', event => {
        if (event.target.id === 'folder-grid-modal') closeFolderPopup();
    });
    document.getElementById('folder-grid-add-site')?.addEventListener('click', () => {
        const current = folderPopupStack[folderPopupStack.length - 1];
        if (current) openAddBookmarkModal(current.id);
    });
    document.getElementById('folder-grid-add-folder')?.addEventListener('click', () => {
        const current = folderPopupStack[folderPopupStack.length - 1];
        const title = prompt('Название новой папки:')?.trim();
        if (!current || !title) return;
        chrome.bookmarks.create({ parentId: current.id, title }, () => {
            if (chrome.runtime.lastError) {
                showFolderGridStatus(`Не удалось создать папку: ${chrome.runtime.lastError.message}`);
                return;
            }
            renderFolderPopup();
        });
    });
    document.getElementById('folder-item-rename')?.addEventListener('click', () => {
        const folder = folderMenuTarget;
        closeFolderItemMenu();
        if (!folder) return;
        const title = prompt('Новое название папки:', folder.title)?.trim();
        if (!title || title === folder.title) return;
        chrome.bookmarks.update(folder.id, { title }, () => {
            if (chrome.runtime.lastError) alert(`Не удалось переименовать папку: ${chrome.runtime.lastError.message}`);
            else refreshBookmarksFromChrome();
        });
    });
    document.getElementById('folder-item-delete')?.addEventListener('click', () => {
        const folder = folderMenuTarget;
        closeFolderItemMenu();
        if (!folder || !confirm(`Удалить папку «${folder.title}» и всё её содержимое?`)) return;
        removeBookmarkTreeWithCleanup(folder.id, error => {
            if (error) {
                alert(`Не удалось удалить папку: ${error.message}`);
                return;
            }
            const deletedIndex = folderPopupStack.findIndex(item => item.id === folder.id);
            if (deletedIndex >= 0) folderPopupStack = folderPopupStack.slice(0, deletedIndex);
            if (folderPopupStack.length) renderFolderPopup();
            else closeFolderPopup();
            refreshBookmarksFromChrome();
        });
    });
    document.addEventListener('click', event => {
        if (!event.target.closest('#folder-item-menu')) closeFolderItemMenu();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !document.getElementById('folder-grid-modal')?.classList.contains('hidden')) {
            closeFolderPopup();
        }
    });
}

function openFolderPopup(folder) {
    folderPopupStack = [{ id: folder.id, parentId: folder.parentId, title: folder.title || 'Папка' }];
    document.getElementById('folder-grid-modal')?.classList.remove('hidden');
    renderFolderPopup();
}

function closeFolderPopup() {
    folderPopupRenderId += 1;
    folderPopupStack = [];
    folderPopupDrag = null;
    document.getElementById('folder-grid-modal')?.classList.add('hidden');
}

function renderFolderPopup() {
    const current = folderPopupStack[folderPopupStack.length - 1];
    if (!current) return;
    const renderId = ++folderPopupRenderId;
    const content = document.getElementById('folder-grid-content');
    const empty = document.getElementById('folder-grid-empty');
    const back = document.getElementById('folder-grid-back');
    document.getElementById('folder-grid-title').textContent = current.title;
    document.getElementById('folder-grid-path').textContent = folderPopupStack.map(item => item.title).join(' / ');
    back.disabled = folderPopupStack.length <= 1;
    content.innerHTML = '<div class="folder-grid-loading">Загрузка…</div>';
    empty.classList.add('hidden');

    chrome.bookmarks.getChildren(current.id, children => {
        if (renderId !== folderPopupRenderId) return;
        if (chrome.runtime.lastError) {
            folderPopupStack.pop();
            if (folderPopupStack.length) renderFolderPopup();
            else closeFolderPopup();
            return;
        }
        loadCustomIcons(customIcons => {
            if (renderId !== folderPopupRenderId) return;
            content.innerHTML = '';
            empty.classList.toggle('hidden', children.length !== 0);
            children.forEach(item => {
                const tile = document.createElement('button');
                tile.type = 'button';
                tile.className = `folder-grid-tile${item.url ? '' : ' folder-grid-tile--folder'}`;
                tile.dataset.id = item.id;
                tile.dataset.parentId = current.id;
                tile.draggable = true;
                tile.addEventListener('dragstart', event => onFolderGridDragStart(event, item));
                tile.addEventListener('dragend', onFolderGridDragEnd);
                if (item.url) {
                    const custom = customIcons[item.id];
                    const image = custom?.imageData || getFaviconUrl(item.url);
                    tile.innerHTML = `<span class="folder-grid-tile__icon"><img src="${escapeHtml(image)}" alt=""></span><span>${escapeHtml(item.title)}</span>`;
                    tile.addEventListener('click', () => openBookmarkUrl(item.url));
                    tile.addEventListener('dragover', onFolderGridReorderOver);
                    tile.addEventListener('drop', onFolderGridReorderDrop);
                } else {
                    tile.innerHTML = `<span class="folder-grid-tile__folder" aria-hidden="true"><svg viewBox="0 0 64 52"><path d="M4 9a5 5 0 0 1 5-5h17l7 7h22a5 5 0 0 1 5 5v27a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" fill="currentColor"/></svg></span><span>${escapeHtml(item.title)}</span>`;
                    tile.addEventListener('click', () => {
                        if (Date.now() < folderPopupSuppressClickUntil) return;
                        folderPopupStack.push({ id: item.id, parentId: item.parentId, title: item.title || 'Папка' });
                        renderFolderPopup();
                    });
                    tile.addEventListener('contextmenu', event => {
                        event.preventDefault();
                        showFolderItemMenu(event.clientX, event.clientY, item);
                    });
                    tile.addEventListener('dragover', onFolderGridFolderOver);
                    tile.addEventListener('dragleave', () => tile.classList.remove('folder-drop-target'));
                    tile.addEventListener('drop', event => onFolderGridFolderDrop(event, item.id));
                }
                content.appendChild(tile);
            });
        });
    });
}

function removeBookmarkTreeWithCleanup(folderId, callback) {
    chrome.bookmarks.getSubTree(folderId, results => {
        const ids = chrome.runtime.lastError || !results?.[0]
            ? [folderId]
            : collectBookmarkTreeIds(results[0]);
        chrome.bookmarks.removeTree(folderId, () => {
            const error = chrome.runtime.lastError
                ? new Error(chrome.runtime.lastError.message)
                : null;
            if (!error) cleanupCustomIconsForBookmarkIds(ids);
            callback?.(error);
        });
    });
}

function collectBookmarkTreeIds(node) {
    return [node.id, ...(node.children || []).flatMap(collectBookmarkTreeIds)];
}

function cleanupCustomIconsForBookmarkIds(ids) {
    const idSet = new Set(ids);
    loadCustomIcons(icons => {
        let changed = false;
        idSet.forEach(id => {
            if (!(id in icons)) return;
            delete icons[id];
            changed = true;
        });
        if (changed) chrome.storage.local.set({ customIcons: icons });
    });
}

function showFolderItemMenu(x, y, folder) {
    folderMenuTarget = folder;
    const menu = document.getElementById('folder-item-menu');
    if (!menu) return;
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - 220))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - 100))}px`;
    menu.classList.remove('hidden');
}

function closeFolderItemMenu() {
    folderMenuTarget = null;
    document.getElementById('folder-item-menu')?.classList.add('hidden');
}

function onFolderGridDragStart(event, item) {
    folderPopupDrag = {
        id: item.id,
        parentId: item.parentId,
        isFolder: !item.url
    };
    event.currentTarget.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
}

function onFolderGridReorderOver(event) {
    if (!folderPopupDrag || folderPopupDrag.id === this.dataset.id) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    const grid = this.parentElement;
    const dragged = [...grid.querySelectorAll('.folder-grid-tile[data-id]')]
        .find(tile => tile.dataset.id === folderPopupDrag.id);
    if (!dragged || dragged === this) return;
    const targetRect = this.getBoundingClientRect();
    const before = event.clientX < targetRect.left + targetRect.width / 2;
    const reference = before ? this : this.nextSibling;
    if (reference === dragged || dragged.nextSibling === reference) return;
    animateFolderGridReorder(grid, () => grid.insertBefore(dragged, reference));
}

function onFolderGridReorderDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const current = folderPopupStack[folderPopupStack.length - 1];
    if (!folderPopupDrag || !current) return;
    persistChromeBookmarkOrder(this.parentElement, current.id);
}

function animateFolderGridReorder(grid, mutate) {
    const tiles = [...grid.querySelectorAll('.folder-grid-tile[data-id]')];
    const previous = new Map(tiles.map(tile => [tile, tile.getBoundingClientRect()]));
    mutate();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    tiles.forEach(tile => {
        const from = previous.get(tile);
        const to = tile.getBoundingClientRect();
        const x = from.left - to.left;
        const y = from.top - to.top;
        if (!x && !y) return;
        tile.animate([
            { transform: `translate(${x}px, ${y}px)` },
            { transform: 'translate(0, 0)' }
        ], { duration: 280, easing: 'cubic-bezier(.2,.8,.25,1)' });
    });
}

function onFolderGridFolderOver(event) {
    if (!folderPopupDrag || folderPopupDrag.id === this.dataset.id) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.folder-grid-tile').forEach(tile => tile.classList.remove('folder-drop-target'));
    this.classList.add('folder-drop-target');
}

function onFolderGridFolderDrop(event, destinationId) {
    event.preventDefault();
    event.stopPropagation();
    const moveInside = event.currentTarget.classList.contains('folder-drop-target');
    event.currentTarget.classList.remove('folder-drop-target');
    if (!folderPopupDrag || folderPopupDrag.id === destinationId) return;
    if (!moveInside) {
        const current = folderPopupStack[folderPopupStack.length - 1];
        if (current) persistChromeBookmarkOrder(event.currentTarget.parentElement, current.id);
        return;
    }
    const sourceId = folderPopupDrag.id;
    canMoveBookmarkToFolder(folderPopupDrag, destinationId, error => {
        if (error) {
            showFolderGridStatus(error);
            return;
        }
        chrome.bookmarks.move(sourceId, { parentId: destinationId }, () => {
            if (chrome.runtime.lastError) {
                showFolderGridStatus(`Нельзя переместить: ${chrome.runtime.lastError.message}`);
                return;
            }
            renderFolderPopup();
            refreshBookmarkTabs();
        });
    });
}

function onFolderGridParentOver(event) {
    const current = folderPopupStack[folderPopupStack.length - 1];
    if (!folderPopupDrag || !current?.parentId || folderPopupDrag.id === current.parentId) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('parent-drop-target');
}

function onFolderGridParentDrop(event) {
    const current = folderPopupStack[folderPopupStack.length - 1];
    event.currentTarget.classList.remove('parent-drop-target');
    if (!folderPopupDrag || !current?.parentId || folderPopupDrag.id === current.parentId) return;
    event.preventDefault();
    event.stopPropagation();
    const source = { ...folderPopupDrag };
    canMoveBookmarkToFolder(source, current.parentId, error => {
        if (error) {
            showFolderGridStatus(error);
            return;
        }
        chrome.bookmarks.move(source.id, { parentId: current.parentId }, () => {
            if (chrome.runtime.lastError) {
                showFolderGridStatus(`Нельзя переместить: ${chrome.runtime.lastError.message}`);
                return;
            }
            folderPopupSuppressClickUntil = Date.now() + 220;
            renderFolderPopup();
            refreshBookmarkTabs();
            loadFolder(currentFolderId);
        });
    });
}

function canMoveBookmarkToFolder(draggedItem, destinationId, callback) {
    if (!draggedItem?.isFolder) {
        callback(null);
        return;
    }
    chrome.bookmarks.getSubTree(draggedItem.id, results => {
        if (chrome.runtime.lastError || !results?.[0]) {
            callback('Не удалось проверить структуру папки.');
            return;
        }
        const descendants = new Set(collectBookmarkTreeIds(results[0]));
        callback(descendants.has(destinationId)
            ? 'Папку нельзя переместить внутрь самой себя.'
            : null);
    });
}

function onFolderGridDragEnd(event) {
    event.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.folder-grid-tile').forEach(tile => tile.classList.remove('folder-drop-target'));
    document.querySelector('.folder-grid-heading')?.classList.remove('parent-drop-target');
    folderPopupSuppressClickUntil = Date.now() + 220;
    folderPopupDrag = null;
}

function showFolderGridStatus(message) {
    const content = document.getElementById('folder-grid-content');
    if (!content) return;
    let status = content.querySelector('.folder-grid-status');
    if (!status) {
        status = document.createElement('div');
        status.className = 'folder-grid-status';
        content.prepend(status);
    }
    status.textContent = message;
    setTimeout(() => status.remove(), 3200);
}

function onDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.site-box').forEach(box => box.classList.remove('drag-over', 'folder-drop-target'));
    document.querySelectorAll('.bookmark-tab').forEach(tab => tab.classList.remove('item-drop-target'));
    if (!dragDidDrop && currentFolderId) loadFolder(currentFolderId);
    dragSrcId = null;
    dragSrcIsFolder = false;
    dragSuppressClickUntil = Date.now() + 220;
    dragDidDrop = false;
}

// Context Menu
function initContextMenu() {
    const menu = document.getElementById('context-menu');
    document.getElementById('ctx-open')?.addEventListener('click', () => { if (contextTarget) openBookmarkUrl(contextTarget.url); menu.classList.add('hidden'); });
    document.getElementById('ctx-overlay')?.addEventListener('click', () => { if (contextTarget) openPageViewer(contextTarget.url, contextTarget.title); menu.classList.add('hidden'); });
    document.getElementById('ctx-incognito')?.addEventListener('click', () => {
        const item = contextTarget;
        menu.classList.add('hidden');
        if (!item) return;
        chrome.windows.create({ url: item.url, incognito: true }, () => {
            if (chrome.runtime.lastError) alert('Не удалось открыть окно инкогнито. Разрешите расширению работу в режиме инкогнито.');
        });
    });
    document.getElementById('ctx-edit')?.addEventListener('click', () => { if (contextTarget) openEditModalWithIcon(contextTarget); menu.classList.add('hidden'); });
    document.getElementById('ctx-move')?.addEventListener('click', () => {
        const item = contextTarget;
        menu.classList.add('hidden');
        if (item) openMoveBookmarkDialog(item);
    });
    document.getElementById('ctx-delete')?.addEventListener('click', () => {
        const item = contextTarget;
        menu.classList.add('hidden');
        if (item) openRemoveBookmarkDialog(item);
    });
    document.addEventListener('click', () => menu.classList.add('hidden'));
}

function showContextMenu(x, y, item) {
    contextTarget = item;
    closeBookmarkTabMenu();
    const menu = document.getElementById('context-menu');
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - 190))}px`;
    menu.classList.remove('hidden');
    const menuHeight = menu.getBoundingClientRect().height;
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8))}px`;
}

function openRemoveBookmarkDialog(item) {
    pendingDeleteItem = item;
    const modal = document.getElementById('remove-bookmark-modal');
    const preview = document.getElementById('remove-bookmark-preview');
    document.getElementById('remove-bookmark-message').textContent = `«${item.title}» будет удалена из Chrome.`;
    preview.textContent = item.title.charAt(0).toUpperCase() || '?';
    preview.style.background = appSettings.siteColor;
    loadCustomIcons(icons => {
        const custom = icons[item.id];
        if (custom?.imageData) {
            preview.innerHTML = `<img src="${escapeHtml(custom.imageData)}" alt="">`;
        } else if (!custom?.forceLetter) {
            const img = document.createElement('img');
            img.src = getFaviconUrl(item.url);
            img.alt = '';
            img.addEventListener('error', () => {
                img.remove();
                preview.textContent = item.title.charAt(0).toUpperCase() || '?';
            });
            preview.appendChild(img);
        }
        if (custom?.color) preview.style.background = normalizeColor(custom.color);
    });
    modal.classList.remove('hidden');
}

function closeRemoveBookmarkDialog() {
    pendingDeleteItem = null;
    document.getElementById('remove-bookmark-modal').classList.add('hidden');
}

function removeBookmark(item) {
    chrome.bookmarks.remove(item.id, () => {
        if (chrome.runtime.lastError) {
            alert(`Не удалось удалить закладку: ${chrome.runtime.lastError.message}`);
            return;
        }
        loadCustomIcons(icons => {
            if (icons[item.id]) {
                delete icons[item.id];
                chrome.storage.local.set({ customIcons: icons });
            }
        });
        closeRemoveBookmarkDialog();
        document.getElementById('edit-bookmark-modal').classList.add('hidden');
        loadFolder(currentFolderId);
    });
}

function openMoveBookmarkDialog(item) {
    pendingMoveItem = item;
    selectedMoveFolderId = null;
    const modal = document.getElementById('move-bookmark-modal');
    const tree = document.getElementById('move-bookmark-tree');
    const status = document.getElementById('move-bookmark-status');
    const confirmButton = document.getElementById('confirm-move-bm-btn');
    const searchInput = document.getElementById('move-bookmark-search-input');
    document.getElementById('move-bookmark-message').textContent = `Выберите новую папку для «${item.title}».`;
    tree.innerHTML = '<div class="move-bookmark-folder current">Загрузка папок…</div>';
    status.textContent = '';
    confirmButton.disabled = true;
    searchInput.value = '';
    blockedMoveFolderIds = new Set();
    modal.classList.remove('hidden');

    chrome.bookmarks.getSubTree(bookmarksFolderId, results => {
        if (chrome.runtime.lastError || !results?.[0]) {
            tree.innerHTML = '';
            status.textContent = 'Не удалось загрузить дерево папок.';
            return;
        }
        tree.innerHTML = '';
        if (item.isFolder) {
            const movingNode = findBookmarkTreeNode(results[0], item.id);
            if (movingNode) blockedMoveFolderIds = new Set(collectBookmarkTreeIds(movingNode));
        }
        renderMoveFolderNode(results[0], tree, 0, item.parentId, '');
        filterMoveFolderTree();
        searchInput.focus();
    });
}

function findBookmarkTreeNode(node, id) {
    if (node.id === id) return node;
    for (const child of node.children || []) {
        const match = findBookmarkTreeNode(child, id);
        if (match) return match;
    }
    return null;
}

function renderMoveFolderNode(node, container, depth, currentParentId, parentPath) {
    if (node.url) return;
    const title = node.id === bookmarksFolderId ? 'Главная' : (node.title || 'Без названия');
    const fullPath = parentPath ? `${parentPath} / ${title}` : title;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'move-bookmark-folder';
    button.style.paddingLeft = `${10 + depth * 20}px`;
    button.dataset.folderId = node.id;
    button.dataset.searchText = fullPath.toLocaleLowerCase('ru-RU');
    button.title = fullPath;
    button.innerHTML = `
        <span class="move-bookmark-folder-icon" aria-hidden="true"></span>
        <span class="move-bookmark-folder-copy">
            <strong>${escapeHtml(title)}</strong>
            <small>${escapeHtml(parentPath || 'Корень пространства')}</small>
        </span>`;
    const isCurrent = node.id === currentParentId;
    const isBlocked = blockedMoveFolderIds.has(node.id);
    button.classList.toggle('current', isCurrent);
    button.classList.toggle('blocked', isBlocked);
    button.disabled = isCurrent || isBlocked;
    if (isBlocked) button.title = 'Папку нельзя переместить внутрь самой себя.';
    if (!button.disabled) {
        button.addEventListener('click', () => {
            selectedMoveFolderId = node.id;
            container.querySelectorAll('.move-bookmark-folder').forEach(folder => folder.classList.remove('selected'));
            button.classList.add('selected');
            document.getElementById('confirm-move-bm-btn').disabled = false;
            document.getElementById('move-bookmark-status').textContent = '';
        });
    }
    container.appendChild(button);
    (node.children || []).filter(child => !child.url).forEach(child => {
        renderMoveFolderNode(child, container, depth + 1, currentParentId, fullPath);
    });
}

function filterMoveFolderTree() {
    const tree = document.getElementById('move-bookmark-tree');
    const input = document.getElementById('move-bookmark-search-input');
    const empty = document.getElementById('move-bookmark-empty');
    if (!tree || !input || !empty) return;
    const query = input.value.trim().toLocaleLowerCase('ru-RU');
    let visibleCount = 0;
    tree.querySelectorAll('.move-bookmark-folder[data-folder-id]').forEach(folder => {
        const visible = !query || folder.dataset.searchText.includes(query);
        folder.classList.toggle('hidden', !visible);
        if (visible) visibleCount += 1;
    });
    empty.classList.toggle('hidden', visibleCount > 0);
}

function closeMoveBookmarkDialog() {
    pendingMoveItem = null;
    selectedMoveFolderId = null;
    blockedMoveFolderIds = new Set();
    const searchInput = document.getElementById('move-bookmark-search-input');
    if (searchInput) searchInput.value = '';
    document.getElementById('move-bookmark-modal').classList.add('hidden');
}

function confirmMoveBookmark() {
    if (!pendingMoveItem || !selectedMoveFolderId) return;
    const item = pendingMoveItem;
    const destinationId = selectedMoveFolderId;
    const confirmButton = document.getElementById('confirm-move-bm-btn');
    confirmButton.disabled = true;
    canMoveBookmarkToFolder(item, destinationId, error => {
        if (error) {
            document.getElementById('move-bookmark-status').textContent = error;
            confirmButton.disabled = false;
            return;
        }
        chrome.bookmarks.move(item.id, { parentId: destinationId }, () => {
            if (chrome.runtime.lastError) {
                document.getElementById('move-bookmark-status').textContent = `Не удалось переместить: ${chrome.runtime.lastError.message}`;
                confirmButton.disabled = false;
                return;
            }
            closeMoveBookmarkDialog();
            refreshBookmarkTabs();
            loadFolder(currentFolderId);
        });
    });
}

// Edit Modal — now uses icon customization
function openEditModal(item) {
    openEditModalWithIcon(item);
}

// ================================================================
// MODALS
// ================================================================
function initModals() {
    // Init icon edit controls
    initIconEdit();
    document.getElementById('move-bookmark-search-input')?.addEventListener('input', filterMoveFolderTree);

    // Close helpers
    const closeMap = {
        'close-add-bm-btn': 'add-bookmark-modal',
        'btn-cancel-bm': 'add-bookmark-modal',
        'close-edit-bm-btn': 'edit-bookmark-modal',
        'btn-cancel-edit-bm': 'edit-bookmark-modal',
        'close-weather-modal': 'weather-settings-modal',
        'close-settings-btn': 'settings-modal',
        'close-settings-cancel': 'settings-modal',
        'close-gallery-btn': 'gallery-modal',
        'close-remove-bm-btn': 'remove-bookmark-modal',
        'cancel-remove-bm-btn': 'remove-bookmark-modal',
        'close-move-bm-btn': 'move-bookmark-modal',
        'cancel-move-bm-btn': 'move-bookmark-modal',
    };
    Object.entries(closeMap).forEach(([btnId, modalId]) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', () => document.getElementById(modalId).classList.add('hidden'));
    });

    // Overlay click to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });
    });

    // Settings open
    document.getElementById('settings-btn')?.addEventListener('click', () => {
        populateSettingsForm();
        selectSettingsPanel('general');
        document.getElementById('settings-modal').classList.remove('hidden');
    });
    document.querySelectorAll('[data-settings-target]').forEach(button => {
        button.addEventListener('click', () => selectSettingsPanel(button.dataset.settingsTarget));
    });
    document.getElementById('settings-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        appSettings = { ...appSettings, ...readSettingsForm() };
        chrome.storage.local.set(appSettings, () => {
            applyPreferences(true);
            document.getElementById('settings-modal').classList.add('hidden');
        });
    });
    document.getElementById('settings-label-background')?.addEventListener('change', syncSettingsFormState);

    // Gallery open
    document.getElementById('gallery-btn')?.addEventListener('click', () => document.getElementById('gallery-modal')?.classList.remove('hidden'));
    document.getElementById('confirm-remove-bm-btn')?.addEventListener('click', () => {
        if (pendingDeleteItem) removeBookmark(pendingDeleteItem);
    });
    document.getElementById('close-move-bm-btn')?.addEventListener('click', closeMoveBookmarkDialog);
    document.getElementById('cancel-move-bm-btn')?.addEventListener('click', closeMoveBookmarkDialog);
    document.getElementById('confirm-move-bm-btn')?.addEventListener('click', confirmMoveBookmark);

    // Add Bookmark
    document.getElementById('add-bookmark-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        let name = document.getElementById('bm-title').value.trim();
        const urlInput = document.getElementById('bm-url');
        const url = normalizeBookmarkUrl(urlInput.value.trim());
        if (!url) {
            urlInput.setCustomValidity('Введите корректный адрес сайта');
            urlInput.reportValidity();
            return;
        }
        urlInput.setCustomValidity('');
        const targetFolderId = addBookmarkTargetFolderId || currentFolderId;
        if (name && url && targetFolderId) {
            chrome.bookmarks.create({ parentId: targetFolderId, title: name, url }, (newBm) => {
                if (editingIconData && (editingIconData.imageData || editingIconData.color !== appSettings.siteColor || editingIconData.forceLetter)) {
                    saveCustomIcon(newBm.id, {
                        color: editingIconData.color,
                        imageData: editingIconData.imageData || null,
                        forceLetter: editingIconData.forceLetter || false
                    });
                }
                loadFolder(currentFolderId);
                if (folderPopupStack.some(folder => folder.id === targetFolderId)) renderFolderPopup();
                addBookmarkTargetFolderId = null;
                document.getElementById('add-bookmark-modal').classList.add('hidden');
                document.getElementById('add-bookmark-form').reset();
            });
        }
    });

// Edit Bookmark — save icon data
    document.getElementById('edit-bookmark-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-bm-id').value;
        let title = document.getElementById('edit-bm-title').value.trim();
        const urlInput = document.getElementById('edit-bm-url');
        const url = normalizeBookmarkUrl(urlInput.value.trim());
        if (!url) {
            urlInput.setCustomValidity('Введите корректный адрес сайта');
            urlInput.reportValidity();
            return;
        }
        urlInput.setCustomValidity('');
        // Save icon customization
        if (editingIconData.bookmarkId === id) {
            saveCustomIcon(id, { 
                color: editingIconData.color, 
                imageData: editingIconData.imageData || null,
                forceLetter: editingIconData.forceLetter || false
            });
        }
        chrome.bookmarks.update(id, { title, url }, () => {
            loadFolder(currentFolderId);
            document.getElementById('edit-bookmark-modal').classList.add('hidden');
        });
    });

    document.getElementById('btn-delete-bm')?.addEventListener('click', () => {
        const id = document.getElementById('edit-bm-id').value;
        const title = document.getElementById('edit-bm-title').value.trim();
        if (id) openRemoveBookmarkDialog({ id, title, url: document.getElementById('edit-bm-url').value.trim() });
    });
}

function selectSettingsPanel(target) {
    document.querySelectorAll('[data-settings-target]').forEach(button => {
        button.classList.toggle('active', button.dataset.settingsTarget === target);
    });
    document.querySelectorAll('[data-settings-panel]').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.settingsPanel === target);
    });
}

function openAddBookmarkModal(targetFolderId = currentFolderId) {
    addBookmarkTargetFolderId = typeof targetFolderId === 'string' ? targetFolderId : currentFolderId;
    document.getElementById('add-bookmark-form').reset();
    editingIconData = { color: appSettings.siteColor, imageData: null, letter: '?', forceLetter: false, bookmarkId: null };
    const preview = document.getElementById('add-bm-icon-preview');
    preview.textContent = '?';
    preview.style.background = appSettings.siteColor;
    document.getElementById('add-bookmark-modal').classList.remove('hidden');
    document.getElementById('bm-title').focus();
}

// ================================================================
// GOOGLE APPS LAUNCHER
// ================================================================
const GOOGLE_APPS = [
    { name: 'Аккаунт',     url: 'https://myaccount.google.com',     domain: 'myaccount.google.com' },
    { name: 'Поиск',       url: 'https://www.google.com',           domain: 'google.com' },
    { name: 'Карты',       url: 'https://maps.google.com',          domain: 'maps.google.com' },
    { name: 'YouTube',     url: 'https://youtube.com',              domain: 'youtube.com' },
    { name: 'Play',        url: 'https://play.google.com',          domain: 'play.google.com' },
    { name: 'Новости',     url: 'https://news.google.com',          domain: 'news.google.com' },
    { name: 'Почта',       url: 'https://mail.google.com',          domain: 'mail.google.com' },
    { name: 'Контакты',    url: 'https://contacts.google.com',      domain: 'contacts.google.com' },
    { name: 'Диск',        url: 'https://drive.google.com',         domain: 'drive.google.com' },
    { name: 'Календарь',   url: 'https://calendar.google.com',      domain: 'calendar.google.com' },
    { name: 'Переводчик',  url: 'https://translate.google.com',     domain: 'translate.google.com' },
    { name: 'Фото',        url: 'https://photos.google.com',        domain: 'photos.google.com' },
];

function initGoogleApps() {
    const btn = document.getElementById('google-apps-btn');
    const modal = document.getElementById('google-apps-modal');
    const grid = document.getElementById('google-apps-grid');

    GOOGLE_APPS.forEach(app => {
        const item = document.createElement('button');
        item.className = 'google-app-item';
        item.type = 'button';
        const icon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(app.domain)}&sz=128`;
        item.innerHTML = `<img src="${icon}" alt=""><span>${app.name}</span>`;
        item.addEventListener('click', () => {
            chrome.tabs.create({ url: app.url });
            modal.classList.add('hidden');
        });
        grid.appendChild(item);
    });

    const positionPopup = () => {
        if (modal.classList.contains('hidden')) return;
        const buttonRect = btn.getBoundingClientRect();
        const popup = grid.getBoundingClientRect();
        const top = Math.min(buttonRect.bottom + 12, window.innerHeight - popup.height - 12);
        const left = Math.min(
            Math.max(12, buttonRect.right - popup.width),
            window.innerWidth - popup.width - 12
        );
        grid.style.top = `${Math.max(12, top)}px`;
        grid.style.left = `${Math.max(12, left)}px`;
    };
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) requestAnimationFrame(positionPopup);
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !modal.querySelector('.google-apps-grid').contains(e.target)) {
            modal.classList.add('hidden');
        }
    });
    window.addEventListener('resize', positionPopup);
}

// ================================================================
// PAGE VIEWER (Embedded Overlay)
// ================================================================
function initPageViewer() {
    document.getElementById('page-viewer-close')?.addEventListener('click', () => {
        document.getElementById('page-viewer-overlay').classList.add('hidden');
        document.getElementById('page-viewer-iframe').src = '';
    });
    document.querySelectorAll('.page-viewer__services [data-service-url]').forEach(button => {
        button.addEventListener('click', () => openPageViewer(button.dataset.serviceUrl, button.dataset.serviceName));
    });
}

function openPageViewer(url, title) {
    if (!/^https?:\/\//i.test(url || '')) return;
    document.getElementById('page-viewer-title').textContent = title || url;
    document.getElementById('page-viewer-iframe').src = url;
    document.getElementById('page-viewer-overlay').classList.remove('hidden');
}

let pendingImportNodes = null;

function initBookmarkImport() {
    const input = document.getElementById('bookmark-import-input');
    const status = document.getElementById('bookmark-import-status');
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        status.textContent = 'Чтение файла…';
        const reader = new FileReader();
        reader.onerror = () => {
            status.textContent = 'Не удалось прочитать файл.';
            input.value = '';
        };
        reader.onload = async event => {
            try {
                const nodes = parseBookmarkHtml(String(event.target.result || ''));
                const total = countImportedBookmarks(nodes);
                if (total === 0) throw new Error('В файле не найдены закладки');
                if (total > 5000) throw new Error('В файле больше 5000 закладок');
                pendingImportNodes = nodes;
                status.textContent = `Файл «${file.name}» готов к проверке.`;
                openBookmarkImportPreview(file.name, nodes);
            } catch (error) {
                status.textContent = `Ошибка импорта: ${error.message}`;
                input.value = '';
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('close-import-preview-btn')?.addEventListener('click', closeBookmarkImportPreview);
    document.getElementById('cancel-import-preview-btn')?.addEventListener('click', closeBookmarkImportPreview);
    document.getElementById('confirm-import-preview-btn')?.addEventListener('click', confirmBookmarkImport);
    document.getElementById('bookmark-export-button')?.addEventListener('click', exportBookmarksHtml);
}

function openBookmarkImportPreview(fileName, nodes) {
    const total = countImportedBookmarks(nodes);
    const folders = countImportedFolders(nodes);
    document.getElementById('bookmark-import-summary').innerHTML = `
        <span>📄 ${escapeHtml(fileName)}</span>
        <span>🔖 ${total} закладок</span>
        <span>📁 ${folders} папок</span>`;
    document.getElementById('bookmark-import-preview-status').textContent = '';
    document.getElementById('confirm-import-preview-btn').disabled = false;
    renderBookmarkImportPreview(nodes);
    populateImportDestinations();
    document.getElementById('bookmark-import-preview-modal').classList.remove('hidden');
}

function closeBookmarkImportPreview() {
    pendingImportNodes = null;
    document.getElementById('bookmark-import-input').value = '';
    document.getElementById('bookmark-import-preview-modal').classList.add('hidden');
}

function populateImportDestinations() {
    const select = document.getElementById('bookmark-import-destination');
    select.innerHTML = '<option value="">Загрузка…</option>';
    chrome.bookmarks.getSubTree(bookmarksFolderId, results => {
        select.innerHTML = '';
        if (chrome.runtime.lastError || !results?.[0]) return;
        appendImportDestinationOption(results[0], select, 0);
        select.value = activeBookmarkTabId || bookmarksFolderId;
    });
}

function appendImportDestinationOption(node, select, depth) {
    if (node.url) return;
    const option = document.createElement('option');
    option.value = node.id;
    option.textContent = `${'— '.repeat(depth)}${node.id === bookmarksFolderId ? 'Главная' : node.title}`;
    select.appendChild(option);
    (node.children || []).filter(child => !child.url).forEach(child => appendImportDestinationOption(child, select, depth + 1));
}

function renderBookmarkImportPreview(nodes) {
    const tree = document.getElementById('bookmark-import-preview-tree');
    tree.innerHTML = '';
    const state = { rendered: 0, limit: 300 };
    const renderNodes = (items, depth) => {
        for (const node of items) {
            if (state.rendered >= state.limit) return;
            const row = document.createElement('div');
            row.className = `bookmark-import-preview-node ${node.type}`;
            row.style.paddingLeft = `${7 + depth * 18}px`;
            row.textContent = `${node.type === 'folder' ? '📁' : '🔖'} ${node.title}`;
            row.title = node.type === 'bookmark' ? node.url : node.title;
            tree.appendChild(row);
            state.rendered += 1;
            if (node.type === 'folder') renderNodes(node.children, depth + 1);
        }
    };
    renderNodes(nodes, 0);
    const totalNodes = countImportedBookmarks(nodes) + countImportedFolders(nodes);
    if (totalNodes > state.limit) {
        const omitted = document.createElement('div');
        omitted.className = 'bookmark-import-preview-node';
        omitted.textContent = `…ещё ${totalNodes - state.limit} элементов`;
        tree.appendChild(omitted);
    }
}

async function confirmBookmarkImport() {
    if (!pendingImportNodes) return;
    const destinationId = document.getElementById('bookmark-import-destination').value;
    if (!destinationId) return;
    const status = document.getElementById('bookmark-import-preview-status');
    const button = document.getElementById('confirm-import-preview-btn');
    const total = countImportedBookmarks(pendingImportNodes);
    button.disabled = true;
    status.textContent = `Импорт: 0 из ${total}…`;
    try {
        const progress = { completed: 0, total };
        await createImportedNodes(pendingImportNodes, destinationId, progress, status);
        document.getElementById('bookmark-import-status').textContent = `Импортировано закладок: ${progress.completed}.`;
        pendingImportNodes = null;
        document.getElementById('bookmark-import-input').value = '';
        document.getElementById('bookmark-import-preview-modal').classList.add('hidden');
        refreshBookmarkTabs();
        loadFolder(currentFolderId);
    } catch (error) {
        status.textContent = `Ошибка импорта: ${error.message}`;
        button.disabled = false;
    }
}

function parseBookmarkHtml(html) {
    const documentNode = new DOMParser().parseFromString(html, 'text/html');
    const rootList = documentNode.querySelector('dl');
    if (!rootList) return [];

    function parseList(list) {
        const result = [];
        const children = Array.from(list.children);
        for (let index = 0; index < children.length; index += 1) {
            const element = children[index];
            if (element.tagName !== 'DT') continue;
            const folderTitle = element.querySelector(':scope > h3');
            const bookmark = element.querySelector(':scope > a');
            if (folderTitle) {
                let nestedList = element.querySelector(':scope > dl');
                if (!nestedList && children[index + 1]?.tagName === 'DL') nestedList = children[++index];
                result.push({ type: 'folder', title: folderTitle.textContent.trim() || 'Импортированная папка', children: nestedList ? parseList(nestedList) : [] });
            } else if (bookmark) {
                try {
                    const url = new URL(bookmark.getAttribute('href'));
                    if (['http:', 'https:'].includes(url.protocol)) {
                        result.push({ type: 'bookmark', title: bookmark.textContent.trim() || url.hostname, url: url.href });
                    }
                } catch (error) {}
            }
        }
        return result;
    }

    return parseList(rootList);
}

function countImportedBookmarks(nodes) {
    return nodes.reduce((count, node) => count + (node.type === 'bookmark' ? 1 : countImportedBookmarks(node.children)), 0);
}

function countImportedFolders(nodes) {
    return nodes.reduce((count, node) => count + (node.type === 'folder' ? 1 + countImportedFolders(node.children) : 0), 0);
}

async function createImportedNodes(nodes, parentId, progress, status) {
    for (const node of nodes) {
        if (node.type === 'folder') {
            const folder = await createChromeBookmark({ parentId, title: node.title });
            await createImportedNodes(node.children, folder.id, progress, status);
        } else {
            await createChromeBookmark({ parentId, title: node.title, url: node.url });
            progress.completed += 1;
            if (progress.completed % 25 === 0 || progress.completed === progress.total) {
                status.textContent = `Импорт: ${progress.completed} из ${progress.total}…`;
            }
        }
    }
}

function createChromeBookmark(data) {
    return new Promise((resolve, reject) => {
        chrome.bookmarks.create(data, result => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(result);
        });
    });
}

function exportBookmarksHtml() {
    const status = document.getElementById('bookmark-import-status');
    status.textContent = 'Подготовка экспорта…';
    chrome.bookmarks.getSubTree(bookmarksFolderId, results => {
        if (chrome.runtime.lastError || !results?.[0]) {
            status.textContent = 'Не удалось прочитать закладки для экспорта.';
            return;
        }
        try {
            const html = serializeBookmarksHtml(results[0]);
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `midvea-bookmarks-${new Date().toISOString().slice(0, 10)}.html`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            status.textContent = 'Экспорт подготовлен.';
        } catch (error) {
            status.textContent = `Ошибка экспорта: ${error.message}`;
        }
    });
}

function serializeBookmarksHtml(root) {
    const now = Math.floor(Date.now() / 1000);
    const serializeNodes = (nodes, depth) => {
        const indent = '    '.repeat(depth);
        return (nodes || []).map(node => {
            if (node.url) {
                return `${indent}<DT><A HREF="${escapeHtml(node.url)}" ADD_DATE="${now}">${escapeHtml(node.title || node.url)}</A>`;
            }
            return `${indent}<DT><H3 ADD_DATE="${now}">${escapeHtml(node.title || 'Папка')}</H3>\n${indent}<DL><p>\n${serializeNodes(node.children, depth + 1)}\n${indent}</DL><p>`;
        }).join('\n');
    };
    return `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Midvea Shelter Bookmarks</TITLE>\n<H1>Midvea Shelter Bookmarks</H1>\n<DL><p>\n${serializeNodes(root.children, 1)}\n</DL><p>\n`;
}

// ================================================================
// BACKGROUND GALLERY
// ================================================================
function initGallery() {
    let selectedCategory = 'reddit';
    let isRotateEnabled = true;
    let currentAfter = null;
    let isLoading = false;
    let observer = null;
    let galleryRequestId = 0;
    const renderedWallpaperUrls = new Set();
    let refreshCategoryNavigation = () => {};

    // Tabs logic
    const tabBtns = document.querySelectorAll('.gallery-tab-btn');
    const tabPanes = document.querySelectorAll('.gallery-tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.dataset.tab;
            const target = document.getElementById(targetId);
            if(target) target.classList.add('active');
            
            if (targetId === 'settings-tab-content') {
                updateSettingsPreview();
            } else if (targetId === 'favorites-tab-content') {
                loadFavorites();
            } else if (targetId === 'my-wallpapers-tab-content') {
                loadMyWallpapers();
            }
        });
    });

    // Gallery Categories Logic
    chrome.storage.local.get(['wallpaperSource', 'rotateDaily'], (r) => {
        if (r.wallpaperSource && r.wallpaperSource !== 'custom') {
            selectedCategory = r.wallpaperSource;
        }
        isRotateEnabled = r.rotateDaily !== false;
        
        const rotateCheckbox = document.getElementById('gallery-rotate-checkbox');
        const rotateLabel = document.querySelector('.gallery-rotate-label');
        if(rotateCheckbox) rotateCheckbox.checked = isRotateEnabled;
        if(rotateLabel) rotateLabel.classList.toggle('active', isRotateEnabled);
        const settingsRotate = document.getElementById('settings-rotate-daily');
        if(settingsRotate) settingsRotate.checked = isRotateEnabled;
        
        updateCategoryUI();
        loadCategoryPreviews(selectedCategory);
    });

    document.querySelectorAll('.gallery-cat-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedCategory = btn.dataset.source;
            updateCategoryUI();
            loadCategoryPreviews(selectedCategory);
        });
    });

    const categoryScroller = document.querySelector('.gallery-categories-scroll');
    const categoryPrev = document.querySelector('.gallery-categories-nav--prev');
    const categoryNext = document.querySelector('.gallery-categories-nav--next');
    if (categoryScroller && categoryPrev && categoryNext) {
        const updateCategoryNav = () => {
            const maxScroll = Math.max(0, categoryScroller.scrollWidth - categoryScroller.clientWidth);
            categoryPrev.disabled = categoryScroller.scrollLeft <= 1;
            categoryNext.disabled = categoryScroller.scrollLeft >= maxScroll - 1;
        };
        refreshCategoryNavigation = updateCategoryNav;
        const scrollCategories = direction => {
            categoryScroller.scrollBy({ left: direction * Math.max(220, categoryScroller.clientWidth * 0.7), behavior: 'smooth' });
        };
        categoryPrev.addEventListener('click', () => scrollCategories(-1));
        categoryNext.addEventListener('click', () => scrollCategories(1));
        categoryScroller.addEventListener('scroll', updateCategoryNav, { passive: true });
        categoryScroller.addEventListener('wheel', event => {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                event.preventDefault();
                categoryScroller.scrollLeft += event.deltaY;
            }
        }, { passive: false });
        window.addEventListener('resize', updateCategoryNav);
        requestAnimationFrame(updateCategoryNav);
    }
    document.getElementById('gallery-btn')?.addEventListener('click', () => requestAnimationFrame(refreshCategoryNavigation));

    function updateCategoryUI() {
        document.querySelectorAll('.gallery-cat-pill').forEach(b => {
            b.classList.toggle('active', b.dataset.source === selectedCategory);
        });
        const activeBtn = document.querySelector('.gallery-cat-pill.active');
        if (activeBtn) {
            const titleEl = document.getElementById('gallery-current-cat-title');
            if (titleEl) titleEl.textContent = activeBtn.textContent;
        }
    }

    function renderGalleryItem(post, source, gridElement) {
        const item = document.createElement('div');
        item.className = 'gallery-grid-item gallery-item';
        const wallpaperSource = post.source || source;
        item.innerHTML = `<img src="${escapeHtml(post.thumb || post.url)}" loading="lazy" alt="">` +
            (post.isVideo ? '<div class="gallery-item-video-badge">▶</div>' : '') +
            `<div class="gallery-item-overlay">
                <button class="gallery-btn-apply" title="Применить">✓</button>
                <button class="gallery-btn-fav" title="В избранное">❤️</button>
            </div>`;

        item.addEventListener('click', (e) => {
            if (e.target.closest('.gallery-btn-fav')) {
                e.stopPropagation();
                toggleFavorite({ ...post, source: wallpaperSource }, e.target.closest('.gallery-btn-fav'));
            } else {
                applySpecificWallpaper(post.url, wallpaperSource);
            }
        });
        gridElement.appendChild(item);

        chrome.storage.local.get(['favWallpapers'], (res) => {
            const isFav = (res.favWallpapers || []).some(f => f.url === post.url);
            item.querySelector('.gallery-btn-fav')?.classList.toggle('active', isFav);
        });
    }
    function toggleFavorite(post, btn) {
        chrome.storage.local.get(['favWallpapers'], (res) => {
            let favs = res.favWallpapers || [];
            const idx = favs.findIndex(f => f.url === post.url);
            if (idx >= 0) {
                favs.splice(idx, 1);
                if (btn) btn.classList.remove('active');
            } else {
                favs.push(post);
                if (btn) btn.classList.add('active');
            }
            chrome.storage.local.set({ favWallpapers: favs });
            
            if (idx >= 0 && btn && btn.closest('#favorites-grid')) {
                loadFavorites();
            }
        });
    }

    function loadFavorites() {
        const grid = document.getElementById('favorites-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="gallery-grid-placeholder">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div>';
        
        chrome.storage.local.get(['favWallpapers'], (res) => {
            const favs = res.favWallpapers || [];
            if (favs.length === 0) {
                grid.innerHTML = '<div class="gallery-grid-placeholder">\u041d\u0435\u0442 \u0438\u0437\u0431\u0440\u0430\u043d\u043d\u044b\u0445 \u043e\u0431\u043e\u0435\u0432</div>';
                return;
            }
            grid.innerHTML = '';
            favs.forEach(post => {
                renderGalleryItem(post, post.source || 'reddit', grid);
            });
        });
    }

    function loadMyWallpapers() {
        const grid = document.getElementById('my-wallpapers-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="gallery-grid-placeholder">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div>';
        
        chrome.storage.local.get(['myWallpapers'], (res) => {
            const myWallpapers = res.myWallpapers || [];
            if (myWallpapers.length === 0) {
                grid.innerHTML = '<div class="gallery-grid-placeholder">\u041d\u0435\u0442 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u043d\u044b\u0445 \u043e\u0431\u043e\u0435\u0432</div>';
                return;
            }
            grid.innerHTML = '';
            myWallpapers.forEach(post => {
                const item = document.createElement('div');
                item.className = 'gallery-grid-item gallery-item';
                
                const preview = post.isVideo
                    ? `<video src="${escapeHtml(post.url)}" muted preload="metadata"></video>`
                    : `<img src="${escapeHtml(post.thumb || post.url)}" loading="lazy" alt="">`;
                item.innerHTML = preview +
                    (post.isVideo ? '<div class="gallery-item-video-badge">▶</div>' : '') +
                    `<div class="gallery-item-overlay">
                        <button class="gallery-btn-apply" title="\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c">✓</button>
                        <button class="gallery-btn-fav" title="\u0423\u0434\u0430\u043b\u0438\u0442\u044c">🗑️</button>
                    </div>`;
                    
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.gallery-btn-fav')) {
                        e.stopPropagation();
                        const updated = myWallpapers.filter(w => w.url !== post.url);
                        chrome.storage.local.set({ myWallpapers: updated }, () => {
                            loadMyWallpapers();
                        });
                    } else {
                        applySpecificWallpaper(post.url, 'custom');
                    }
                });
                grid.appendChild(item);
            });
        });
    }

    async function loadCategoryPreviews(source, isLoadMore = false) {
        const grid = document.getElementById('gallery-grid');
        if (!grid) return;
        
        if (!isLoadMore) {
            grid.innerHTML = '<div class="gallery-grid-placeholder">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div>';
            currentAfter = null;
            renderedWallpaperUrls.clear();
            if (observer) observer.disconnect();
        } else {
            const previousSentinel = document.getElementById('gallery-sentinel');
            if (previousSentinel) {
                if (observer) observer.unobserve(previousSentinel);
                previousSentinel.remove();
            }
        }
        
        if (isLoading && isLoadMore) return;
        const requestId = isLoadMore ? galleryRequestId : ++galleryRequestId;
        const requestedAfter = isLoadMore ? currentAfter : null;
        isLoading = true;

        try {
                let subreddit = source === 'reddit' ? 'wallpapers' : source;
                const data = await requestRedditGallery(subreddit, requestedAfter);
                if (!data || !data.data || !Array.isArray(data.data.children)) throw new Error('Reddit вернул некорректные данные');
                if (requestId !== galleryRequestId) return;
                
                currentAfter = data.data.after; 

                const posts = data.data.children.map(window.extractRedditMedia).filter(p => p !== null && (subreddit !== 'LivingBackgrounds' || p.isVideo));
                
                if (!isLoadMore) {
                    grid.innerHTML = '';
                }
                
                if (posts.length === 0 && !isLoadMore) {
                    grid.innerHTML = '<div class="gallery-grid-placeholder">\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e</div>';
                }
                
                posts.filter(post => !renderedWallpaperUrls.has(post.url)).forEach(post => {
                    renderedWallpaperUrls.add(post.url);
                    renderGalleryItem(post, source, grid);
                });
                
                if (currentAfter) {
                    const sentinel = document.createElement('div');
                    sentinel.id = 'gallery-sentinel';
                    sentinel.className = 'gallery-pagination-sentinel';
                    grid.appendChild(sentinel);
                    
                    if (!observer) {
                        observer = new IntersectionObserver((entries) => {
                            if (entries[0].isIntersecting && !isLoading && currentAfter) {
                                loadCategoryPreviews(selectedCategory, true);
                            }
                        }, { root: document.getElementById('gallery-tab-content'), rootMargin: '200px' });
                    }
                    observer.observe(sentinel);
                }
        } catch (e) {
            if (!isLoadMore) {
                grid.innerHTML = `<div class="gallery-grid-placeholder">Галерея временно недоступна<br><small>${escapeHtml(e.message || 'Ошибка сети')}</small></div>`;
            } else if (requestId === galleryRequestId) {
                const retry = document.createElement('button');
                retry.type = 'button';
                retry.className = 'gallery-pagination-retry';
                retry.textContent = 'Не удалось загрузить ещё. Повторить';
                retry.addEventListener('click', () => {
                    retry.remove();
                    loadCategoryPreviews(selectedCategory, true);
                });
                grid.appendChild(retry);
            }
        }
        if (requestId === galleryRequestId) isLoading = false;
    }

    function requestRedditGallery(subreddit, after) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'fetchRedditGallery', subreddit, after }, response => {
                if (chrome.runtime.lastError) {
                    reject(new Error('Не удалось связаться с фоновым процессом'));
                    return;
                }
                if (!response?.success) {
                    reject(new Error(response?.error || 'Reddit недоступен'));
                    return;
                }
                resolve(response.data);
            });
        });
    }
    function applySpecificWallpaper(url, source) {
        chrome.storage.local.set({ 
            wallpaperSource: source, 
            cachedWallpaper: url, 
            wallpaperTimestamp: Date.now() 
        }, () => {
            window.applyWallpaper(url);
            document.getElementById('gallery-modal').classList.add('hidden');
        });
    }

    // Toggle Rotation
    const rotateCheckbox = document.getElementById('gallery-rotate-checkbox');
    const rotateLabel = document.querySelector('.gallery-rotate-label');
    const settingsRotate = document.getElementById('settings-rotate-daily');
    
    if (rotateCheckbox && rotateLabel && settingsRotate) {
        rotateCheckbox.addEventListener('change', (e) => {
            isRotateEnabled = e.target.checked;
            settingsRotate.checked = isRotateEnabled;
            rotateLabel.classList.toggle('active', isRotateEnabled);
            chrome.storage.local.set({ rotateDaily: isRotateEnabled, wallpaperSource: selectedCategory, cachedWallpaper: null, wallpaperTimestamp: 0 });
            
            if (isRotateEnabled) {
                window.loadWallpaperBySource(selectedCategory);
            }
        });
        
        settingsRotate.addEventListener('change', (e) => {
            isRotateEnabled = e.target.checked;
            rotateCheckbox.checked = isRotateEnabled;
            rotateLabel.classList.toggle('active', isRotateEnabled);
            chrome.storage.local.set({ rotateDaily: isRotateEnabled });
        });
    }

    // Custom Wallpaper Upload
    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onerror = function() {
            alert('Не удалось прочитать выбранный файл.');
            e.target.value = '';
        };
        reader.onload = function(event) {
            const base64Str = event.target.result;
            try {
                chrome.storage.local.get(['myWallpapers'], (res) => {
                    const myWallpapers = res.myWallpapers || [];
                    const newPost = {
                        url: base64Str,
                        thumb: base64Str,
                        isVideo: file.type.startsWith('video/')
                    };
                    myWallpapers.unshift(newPost);
                    
                    chrome.storage.local.set({ 
                        myWallpapers: myWallpapers,
                        wallpaperSource: 'custom', 
                        cachedWallpaper: base64Str, 
                        wallpaperTimestamp: Date.now(),
                        rotateDaily: false
                    }, () => {
                        if (chrome.runtime.lastError) {
                            alert(`Не удалось сохранить обои: ${chrome.runtime.lastError.message}`);
                            return;
                        }
                        window.applyWallpaper(base64Str);
                        document.getElementById('gallery-modal').classList.add('hidden');
                        isRotateEnabled = false;
                        if(rotateCheckbox) rotateCheckbox.checked = false;
                        if(settingsRotate) settingsRotate.checked = false;
                        loadMyWallpapers();
                        e.target.value = '';
                    });
                });
            } catch (err) {
                alert('\u0424\u0430\u0439\u043b \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0431\u043e\u043b\u044c\u0448\u043e\u0439 \u0438\u043b\u0438 \u043f\u0440\u043e\u0438\u0437\u043e\u0448\u043b\u0430 \u043e\u0448\u0438\u0431\u043a\u0430.');
            }
        };
        reader.readAsDataURL(file);
    }
    const uploadInput = document.getElementById('upload-wallpaper-input');
    if (uploadInput) uploadInput.addEventListener('change', handleFileUpload);
    
    const uploadVideoInput = document.getElementById('upload-video-input');
    if (uploadVideoInput) uploadVideoInput.addEventListener('change', handleFileUpload);

    function updateSettingsPreview() {
        chrome.storage.local.get(['cachedWallpaper', 'wallpaperSource'], (r) => {
            const img = document.getElementById('settings-current-wallpaper');
            const vid = document.getElementById('settings-current-video');
            const title = document.getElementById('settings-wp-title');
            if (img && vid && title) {
                const url = r.cachedWallpaper || '';
                if (url.startsWith('data:video/') || url.includes('.mp4') || url.includes('.webm')) {
                    img.classList.add('hidden');
                    vid.src = url;
                    vid.classList.remove('hidden');
                } else {
                    vid.classList.add('hidden');
                    vid.src = '';
                    img.src = url;
                    img.classList.remove('hidden');
                }
                title.textContent = r.wallpaperSource === 'custom' ? 'Ваши обои' : 'Обои из интернета';
            }
        });
    }
}


let imageSearchCallback = null;

function openImageSearchModal(defaultQuery, callback) {
    const modal = document.getElementById('image-search-modal');
    const input = document.getElementById('image-search-input');
    
    imageSearchCallback = callback;
    input.value = defaultQuery;
    modal.classList.remove('hidden');
    
    performImageSearch(defaultQuery);
}

document.getElementById('close-image-search-btn')?.addEventListener('click', () => {
    document.getElementById('image-search-modal').classList.add('hidden');
});

document.getElementById('image-search-submit-btn')?.addEventListener('click', () => {
    const q = document.getElementById('image-search-input').value.trim();
    if (q) performImageSearch(q);
});

document.getElementById('image-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (q) performImageSearch(q);
    }
});

async function performImageSearch(query) {
    const grid = document.getElementById('image-search-grid');
    const loading = document.getElementById('image-search-loading');
    const error = document.getElementById('image-search-error');
    
    grid.innerHTML = '';
    error.classList.add('hidden');
    loading.classList.remove('hidden');
    
    try {
        let response;
        try {
            response = await sendImageSearchMessage('fetchImageSearch', query);
        } catch (error) {
            if (!isClosedMessagePortError(error)) throw error;
            response = await sendImageSearchMessage('fetchDuckDuckGoImages', query);
        }

        if (!response || !response.success || !response.images || response.images.length === 0) {
            throw new Error(response && response.error ? response.error : 'Изображения не найдены');
        }

        const images = response.images;
        
        loading.classList.add('hidden');
        
        if (images.length === 0) {
            error.textContent = '\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438';;
            error.classList.remove('hidden');
            return;
        }
        
        const uniqueImages = [...new Set(images)].slice(0, 30);
        
        uniqueImages.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.className = 'image-search-item';
            img.loading = 'lazy';
            img.alt = query;
            img.addEventListener('error', () => img.remove());
            img.addEventListener('dblclick', () => {
                if (imageSearchCallback) {
                    editingIconData.imageData = src;
                    editingIconData.forceLetter = false;
                    imageSearchCallback();
                }
                document.getElementById('image-search-modal').classList.add('hidden');
            });
            grid.appendChild(img);
        });
        
    } catch (err) {
        loading.classList.add('hidden');
        error.textContent = isClosedMessagePortError(err)
            ? 'Фоновый модуль не обновлён. Перезагрузите расширение на странице chrome://extensions.'
            : `Ошибка загрузки: ${err.message}`;
        error.classList.remove('hidden');
        console.error(err);
    }
}

function sendImageSearchMessage(action, query) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Поиск не ответил вовремя')), 20000);
        chrome.runtime.sendMessage({ action, query }, result => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else if (!result) reject(new Error('Фоновый модуль не вернул ответ'));
            else resolve(result);
        });
    });
}

function isClosedMessagePortError(error) {
    return /message port closed|receiving end does not exist|could not establish connection/i.test(error && error.message || '');
}


// ================================================================
// VIDEO PAUSE/PLAY LOGIC (Performance Optimization)
// ================================================================
(function() {
    function updateVideoPlayback() {
        const bgVid = document.getElementById('background-video');
        if (!bgVid || bgVid.classList.contains('hidden') || !bgVid.src) return;
        
        const modals = document.querySelectorAll('.modal-overlay, .popup-overlay, .page-viewer');
        const isHidden = document.hidden;
        const isModalOpen = Array.from(modals).some(m => !m.classList.contains('hidden'));
        
        if (isHidden || isModalOpen) {
            if (!bgVid.paused) bgVid.pause();
        } else {
            if (bgVid.paused) bgVid.play().catch(e => console.warn('Video play interrupted', e));
        }
    }

    document.addEventListener('visibilitychange', updateVideoPlayback);

    // Watch for class changes on modals to pause video
    const observer = new MutationObserver((mutations) => {
        for (const mut of mutations) {
            if (mut.type === 'attributes' && mut.attributeName === 'class') {
                updateVideoPlayback();
            }
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.modal-overlay, .popup-overlay, .page-viewer').forEach(el => {
            observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        });
        updateVideoPlayback();
    });
})();


    

