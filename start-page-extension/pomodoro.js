// pomodoro.js — persistent local focus timer
document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'pomodoroState';
    const SETTING_KEYS = ['pomodoroFocusMinutes', 'pomodoroShortBreakMinutes', 'pomodoroLongBreakMinutes', 'pomodoroCycles', 'pomodoroSound', 'pomodoroNotifications'];
    const DEFAULTS = { pomodoroFocusMinutes: 25, pomodoroShortBreakMinutes: 5, pomodoroLongBreakMinutes: 15, pomodoroCycles: 4, pomodoroSound: true, pomodoroNotifications: true };
    const timeElement = document.getElementById('pomodoro-time');
    const progressElement = document.getElementById('pomodoro-progress');
    const toggleButton = document.getElementById('pomodoro-toggle');
    const resetButton = document.getElementById('pomodoro-reset');
    const roundsElement = document.getElementById('pomodoro-rounds');
    const modeButtons = [...document.querySelectorAll('[data-pomodoro-mode]')];
    const settingsButton = document.getElementById('pomodoro-settings-btn');
    const settingsModal = document.getElementById('pomodoro-settings-modal');
    const settingsForm = document.getElementById('pomodoro-settings-form');
    const closeSettingsButton = document.getElementById('close-pomodoro-modal');
    const settingsFields = {
        pomodoroFocusMinutes: document.getElementById('settings-pomodoro-focus'),
        pomodoroShortBreakMinutes: document.getElementById('settings-pomodoro-short-break'),
        pomodoroLongBreakMinutes: document.getElementById('settings-pomodoro-long-break'),
        pomodoroCycles: document.getElementById('settings-pomodoro-cycles'),
        pomodoroSound: document.getElementById('settings-pomodoro-sound'),
        pomodoroNotifications: document.getElementById('settings-pomodoro-notifications')
    };
    if (!timeElement || !progressElement || !toggleButton || !resetButton) return;

    let settings = { ...DEFAULTS };
    let state = { mode: 'focus', remaining: 25 * 60, running: false, endAt: null, completed: 0 };
    let intervalId = null;
    let audioContext = null;

    chrome.storage.local.get([STORAGE_KEY, ...SETTING_KEYS], result => {
        settings = normalizeSettings(result);
        state = normalizeState(result[STORAGE_KEY]);
        reconcileElapsedTime();
        render();
        startTicker();
    });

    toggleButton.addEventListener('click', () => { unlockAudio(); state.running ? pause() : start(); });
    resetButton.addEventListener('click', resetCurrentSession);
    settingsButton?.addEventListener('click', openSettingsModal);
    closeSettingsButton?.addEventListener('click', closeSettingsModal);
    settingsModal?.addEventListener('click', event => {
        if (event.target === settingsModal) closeSettingsModal();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !settingsModal?.classList.contains('hidden')) closeSettingsModal();
    });
    settingsForm?.addEventListener('submit', event => {
        event.preventDefault();
        const nextSettings = normalizeSettings({
            pomodoroFocusMinutes: settingsFields.pomodoroFocusMinutes.value,
            pomodoroShortBreakMinutes: settingsFields.pomodoroShortBreakMinutes.value,
            pomodoroLongBreakMinutes: settingsFields.pomodoroLongBreakMinutes.value,
            pomodoroCycles: settingsFields.pomodoroCycles.value,
            pomodoroSound: settingsFields.pomodoroSound.checked,
            pomodoroNotifications: settingsFields.pomodoroNotifications.checked
        });
        chrome.storage.local.set(nextSettings, closeSettingsModal);
    });
    modeButtons.forEach(button => button.addEventListener('click', () => {
        const mode = button.dataset.pomodoroMode === 'break' ? 'shortBreak' : 'focus';
        if (mode === state.mode || (button.dataset.pomodoroMode === 'break' && state.mode === 'longBreak')) return;
        state.mode = mode;
        resetCurrentSession();
    }));
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) { reconcileElapsedTime(); render(); startTicker(); }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !SETTING_KEYS.some(key => changes[key])) return;
        chrome.storage.local.get(SETTING_KEYS, result => {
            const durationChanged = SETTING_KEYS.slice(0, 4).some(key => changes[key]);
            settings = normalizeSettings(result);
            if (durationChanged) {
                state.running = false;
                state.endAt = null;
                state.remaining = durationFor(state.mode);
                cancelAlarm();
                persist();
            }
            render(); startTicker();
        });
    });

    function openSettingsModal() {
        Object.entries(settingsFields).forEach(([key, field]) => {
            if (!field) return;
            if (field.type === 'checkbox') field.checked = settings[key];
            else field.value = settings[key];
        });
        settingsModal?.classList.remove('hidden');
        requestAnimationFrame(() => settingsFields.pomodoroFocusMinutes?.focus());
    }

    function closeSettingsModal() { settingsModal?.classList.add('hidden'); }

    function normalizeSettings(value) {
        return {
            pomodoroFocusMinutes: clamp(value.pomodoroFocusMinutes, 1, 180, 25),
            pomodoroShortBreakMinutes: clamp(value.pomodoroShortBreakMinutes, 1, 60, 5),
            pomodoroLongBreakMinutes: clamp(value.pomodoroLongBreakMinutes, 1, 120, 15),
            pomodoroCycles: clamp(value.pomodoroCycles, 1, 12, 4),
            pomodoroSound: value.pomodoroSound !== false,
            pomodoroNotifications: value.pomodoroNotifications !== false
        };
    }

    function normalizeState(value) {
        const validModes = ['focus', 'shortBreak', 'longBreak'];
        const mode = validModes.includes(value?.mode) ? value.mode : (value?.mode === 'break' ? 'shortBreak' : 'focus');
        const duration = durationFor(mode);
        return {
            mode,
            remaining: Number.isFinite(value?.remaining) ? Math.min(duration, Math.max(0, Math.round(value.remaining))) : duration,
            running: Boolean(value?.running && value?.endAt),
            endAt: Number.isFinite(value?.endAt) ? value.endAt : null,
            completed: Number.isFinite(value?.completed) ? Math.max(0, Math.floor(value.completed)) : 0
        };
    }

    function clamp(value, min, max, fallback) {
        const number = Number.parseInt(value, 10);
        return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
    }

    function durationFor(mode) {
        const minutes = mode === 'focus' ? settings.pomodoroFocusMinutes : mode === 'longBreak' ? settings.pomodoroLongBreakMinutes : settings.pomodoroShortBreakMinutes;
        return minutes * 60;
    }

    function start() {
        if (state.remaining <= 0) state.remaining = durationFor(state.mode);
        state.running = true;
        state.endAt = Date.now() + state.remaining * 1000;
        scheduleAlarm(); persist(); render(); startTicker();
    }

    function pause() {
        updateRemaining(); state.running = false; state.endAt = null;
        cancelAlarm(); persist(); render(); startTicker();
    }

    function resetCurrentSession() {
        state.running = false; state.endAt = null; state.remaining = durationFor(state.mode);
        cancelAlarm(); persist(); render(); startTicker();
    }

    function startTicker() {
        clearInterval(intervalId); intervalId = null;
        if (!state.running) return;
        intervalId = setInterval(() => {
            updateRemaining();
            if (state.remaining <= 0) finishSession();
            render();
        }, 500);
    }

    function updateRemaining() {
        if (state.running && state.endAt) state.remaining = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
    }

    function reconcileElapsedTime() {
        if (!state.running) return;
        updateRemaining();
        if (state.remaining <= 0) finishSession(false);
    }

    function finishSession(playFeedback = true) {
        if (state.mode === 'focus') {
            state.completed += 1;
            state.mode = state.completed % settings.pomodoroCycles === 0 ? 'longBreak' : 'shortBreak';
        } else {
            state.mode = 'focus';
        }
        state.remaining = durationFor(state.mode);
        state.running = false; state.endAt = null;
        if (playFeedback && settings.pomodoroSound) playChime();
        persist(); startTicker();
    }

    function scheduleAlarm() {
        chrome.runtime.sendMessage({ action: 'schedulePomodoroAlarm', when: state.endAt, mode: state.mode, notifications: settings.pomodoroNotifications }).catch(() => {});
    }

    function cancelAlarm() { chrome.runtime.sendMessage({ action: 'cancelPomodoroAlarm' }).catch(() => {}); }

    function unlockAudio() {
        if (!settings.pomodoroSound) return;
        audioContext ||= new AudioContext();
        if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    }

    function playChime() {
        unlockAudio();
        if (!audioContext || audioContext.state !== 'running') return;
        [0, .16, .34].forEach((delay, index) => {
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.type = 'sine'; oscillator.frequency.value = [660, 880, 1040][index];
            gain.gain.setValueAtTime(.0001, audioContext.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(.16, audioContext.currentTime + delay + .02);
            gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + delay + .28);
            oscillator.connect(gain).connect(audioContext.destination);
            oscillator.start(audioContext.currentTime + delay);
            oscillator.stop(audioContext.currentTime + delay + .3);
        });
    }

    function persist() { chrome.storage.local.set({ [STORAGE_KEY]: state }); }

    function render() {
        const minutes = Math.floor(state.remaining / 60);
        const seconds = state.remaining % 60;
        timeElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        const duration = durationFor(state.mode);
        const progress = duration ? (duration - state.remaining) / duration : 0;
        progressElement.style.setProperty('--pomodoro-progress', `${Math.min(1, Math.max(0, progress)) * 360}deg`);
        toggleButton.textContent = state.running ? 'Пауза' : 'Старт';
        roundsElement.textContent = `${state.completed} ${pluralizeSessions(state.completed)}`;
        modeButtons.forEach(button => {
            const isBreakButton = button.dataset.pomodoroMode === 'break';
            button.classList.toggle('active', isBreakButton ? state.mode !== 'focus' : state.mode === 'focus');
            if (isBreakButton) button.textContent = state.mode === 'longBreak' ? 'Длинный перерыв' : 'Перерыв';
        });
        document.title = state.running ? `${timeElement.textContent} · Midvea Shelter` : 'Midvea Shelter';
    }

    function pluralizeSessions(value) {
        const mod10 = value % 10, mod100 = value % 100;
        if (mod10 === 1 && mod100 !== 11) return 'сессия';
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'сессии';
        return 'сессий';
    }
});
