chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'schedulePomodoroAlarm') {
        chrome.alarms.clear('midvea-pomodoro').then(() => {
            chrome.alarms.create('midvea-pomodoro', { when: Math.max(Date.now() + 1000, Number(request.when) || Date.now() + 1000) });
            chrome.storage.local.set({ pomodoroAlarmMeta: { mode: request.mode, notifications: request.notifications !== false } });
        });
        sendResponse({ success: true });
        return;
    }

    if (request.action === 'cancelPomodoroAlarm') {
        chrome.alarms.clear('midvea-pomodoro');
        chrome.storage.local.remove('pomodoroAlarmMeta');
        sendResponse({ success: true });
        return;
    }

    if (request.action === 'fetchImageSearch' || request.action === 'fetchDuckDuckGoImages') {
        searchImages(request.query)
            .then(result => sendResponse({ success: true, ...result }))
            .catch(err => sendResponse({ success: false, error: err.message }));

        return true; // Keep message channel open for async response
    }

    if (request.action === 'fetchRedditGallery') {
        fetchRedditGallery(request.subreddit, request.after)
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message || 'Reddit недоступен' }));
        return true;
    }
});

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name !== 'midvea-pomodoro') return;
    chrome.storage.local.get(['pomodoroAlarmMeta'], result => {
        const meta = result.pomodoroAlarmMeta || {};
        if (meta.notifications !== false) {
            const focusFinished = meta.mode === 'focus';
            chrome.notifications.create('midvea-pomodoro-complete', {
                type: 'basic',
                iconUrl: 'icons/icon-128.png',
                title: chrome.i18n.getMessage(focusFinished ? 'pomodoroFocusTitle' : 'pomodoroBreakTitle'),
                message: chrome.i18n.getMessage(focusFinished ? 'pomodoroFocusMessage' : 'pomodoroBreakMessage'),
                priority: 1
            });
        }
        chrome.storage.local.remove('pomodoroAlarmMeta');
    });
});

async function fetchRedditGallery(rawSubreddit, rawAfter) {
    const subreddit = String(rawSubreddit || '').trim();
    if (!/^[A-Za-z0-9_]{1,40}$/.test(subreddit)) throw new Error('Некорректная категория Reddit');
    const params = new URLSearchParams({ limit: '50', raw_json: '1' });
    const after = String(rawAfter || '').trim();
    if (after) params.set('after', after.slice(0, 100));

    const response = await fetch(`https://www.reddit.com/r/${encodeURIComponent(subreddit)}/hot.json?${params}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Reddit: HTTP ${response.status}`);
    const data = await response.json();
    if (!data?.data || !Array.isArray(data.data.children)) throw new Error('Reddit вернул некорректные данные');
    return data;
}

async function searchImages(rawQuery) {
    const query = String(rawQuery || '').trim().slice(0, 200);
    if (!query) throw new Error('Пустой поисковый запрос');

    try {
        const images = await fetchDuckDuckGoImages(query);
        if (images.length > 0) return { images, source: 'duckduckgo' };
    } catch (error) {
        console.warn('DuckDuckGo image search failed, using fallback:', error.message);
    }

    const images = await fetchBingImages(query);
    if (images.length === 0) throw new Error('Изображения не найдены');
    return { images, source: 'bing' };
}

async function fetchDuckDuckGoImages(query) {
    const searchPage = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
        headers: { 'Accept-Language': chrome.i18n.getUILanguage() }
    });
    if (!searchPage.ok) throw new Error(`DuckDuckGo: HTTP ${searchPage.status}`);

    const html = await searchPage.text();
    const tokenMatch = html.match(/vqd=["']?([\d-]+)/) || html.match(/vqd%3D([\d-]+)/);
    if (!tokenMatch) throw new Error('DuckDuckGo не вернул токен поиска');

    const params = new URLSearchParams({
        l: chrome.i18n.getUILanguage().toLowerCase(),
        o: 'json',
        q: query,
        vqd: tokenMatch[1],
        f: ',,,',
        p: '1'
    });
    const imageResponse = await fetch(`https://duckduckgo.com/i.js?${params}`, {
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        referrer: 'https://duckduckgo.com/',
        referrerPolicy: 'strict-origin-when-cross-origin'
    });
    if (!imageResponse.ok) throw new Error(`DuckDuckGo Images: HTTP ${imageResponse.status}`);

    const data = await imageResponse.json();
    return uniqueHttpUrls((data.results || [])
        .map(item => item.thumbnail || item.image)
    );
}

async function fetchBingImages(query) {
    const response = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`, {
        headers: { 'Accept-Language': chrome.i18n.getUILanguage() }
    });
    if (!response.ok) throw new Error(`Bing Images: HTTP ${response.status}`);

    const html = await response.text();
    const images = [];
    const patterns = [
        /murl&quot;:&quot;(.*?)&quot;/g,
        /"murl"\s*:\s*"(https?:\\?\/\\?\/.*?)"/g
    ];
    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(html)) !== null) images.push(decodeSearchUrl(match[1]));
    });
    return uniqueHttpUrls(images);
}

function decodeSearchUrl(value) {
    return String(value || '')
        .replace(/\\u002f/gi, '/')
        .replace(/\\\//g, '/')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"');
}

function uniqueHttpUrls(values) {
    return [...new Set(values
        .filter(value => typeof value === 'string')
        .map(value => value.trim())
        .filter(value => /^https?:\/\//i.test(value))
    )].slice(0, 60);
}
