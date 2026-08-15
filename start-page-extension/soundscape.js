(() => {
    const storage = globalThis.chrome?.storage?.local;
    const DEFAULTS = {
        noiseSlots: ['white', 'pink', 'brown', 'blue'],
        ambientSlots: ['rain', 'ocean', 'forest', 'fire'],
        masterVolume: 65,
        noiseVolume: 55,
        ambientVolume: 70,
        timerMinutes: 0
    };
    const noises = {
        white: { label: 'Белый', icon: '◌' }, pink: { label: 'Розовый', icon: '◍' },
        brown: { label: 'Коричневый', icon: '≈' }, blue: { label: 'Голубой', icon: '≋' },
        violet: { label: 'Фиолетовый', icon: '◇' }, grey: { label: 'Серый', icon: '●' },
        green: { label: 'Зелёный', icon: '⌁' }, red: { label: 'Красный', icon: '∿' },
        deep: { label: 'Глубокий', icon: '◉' }, soft: { label: 'Мягкий', icon: '○' },
        air: { label: 'Воздушный', icon: '≀' }, hiss: { label: 'Шипение', icon: '╌' },
        rumble: { label: 'Гул', icon: '▰' }, windNoise: { label: 'Порывы', icon: '〰' },
        rainNoise: { label: 'Шум дождя', icon: '⋮' }, wavesNoise: { label: 'Прибой', icon: '≋' },
        vinyl: { label: 'Винил', icon: '◉' }, staticNoise: { label: 'Радиопомехи', icon: '⌁' },
        pulse: { label: 'Пульсация', icon: '◫' }, space: { label: 'Космический', icon: '✦' }
    };
    const ambients = {
        rain: { label: 'Дождь', icon: '☂', src: 'assets/audio/rain.mp3' },
        ocean: { label: 'Океан', icon: '≋', src: 'assets/audio/ocean.mp3' },
        forest: { label: 'Лес', icon: '♧', src: 'assets/audio/forest.mp3' },
        fire: { label: 'Огонь', icon: '♨', src: 'assets/audio/fire.mp3' },
        serverRoom: { label: 'Серверная', icon: '▦', src: 'assets/audio/server-room.mp3' },
        fan: { label: 'Вентилятор', icon: '✣', src: 'assets/audio/fan.mp3' },
        engine: { label: 'Двигатель', icon: '⚙', src: 'assets/audio/engine.mp3' },
        hairDryer: { label: 'Фен', icon: '⌁', src: 'assets/audio/hair-dryer.mp3' },
        heater: { label: 'Нагреватель', icon: '♨', src: 'assets/audio/heater.mp3' },
        thunder: { label: 'Гроза', icon: 'ϟ', src: 'assets/audio/thunder.mp3' },
        river: { label: 'Река', icon: '≈', src: 'assets/audio/river.mp3' },
        birds: { label: 'Птицы', icon: '⌁', src: 'assets/audio/birds.mp3' },
        night: { label: 'Ночной лес', icon: '☾', src: 'assets/audio/night.mp3' },
        cafe: { label: 'Кафе', icon: '☕', src: 'assets/audio/cafe.mp3' },
        train: { label: 'Поезд', icon: '▣', src: 'assets/audio/train.mp3' },
        city: { label: 'Город', icon: '▥', src: 'assets/audio/city.mp3' },
        office: { label: 'Офис', icon: '▤', src: 'assets/audio/office.mp3' },
        clock: { label: 'Часы', icon: '◷', src: 'assets/audio/clock.mp3' },
        airplane: { label: 'Самолёт', icon: '✈', src: 'assets/audio/airplane.mp3' },
        wind: { label: 'Ветер', icon: '〰', src: 'assets/audio/wind.mp3' }
    };
    const widget = document.getElementById('soundscape-widget');
    if (!widget) return;

    let settings = { ...DEFAULTS };
    let context;
    let masterGain;
    let timerId;
    let timerEndsAt = 0;
    const active = new Map();
    const noiseGrid = document.getElementById('soundscape-noise-slots');
    const ambientGrid = document.getElementById('soundscape-ambient-slots');
    const status = document.getElementById('soundscape-status');
    const volume = document.getElementById('soundscape-master-volume');
    const modal = document.getElementById('soundscape-settings-modal');

    const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));
    const normalizeSlots = (value, fallback, collection) => Array.from({ length: 4 }, (_, index) =>
        collection[value?.[index]] ? value[index] : fallback[index]);
    const applyStoredSettings = stored => {
        settings = { ...DEFAULTS, ...(stored || {}) };
        settings.noiseSlots = normalizeSlots(settings.noiseSlots, DEFAULTS.noiseSlots, noises);
        settings.ambientSlots = normalizeSlots(settings.ambientSlots, DEFAULTS.ambientSlots, ambients);
    };
    const load = () => new Promise(resolve => {
        if (!storage) { applyStoredSettings(); resolve(); return; }
        storage.get({ soundscapeSettings: DEFAULTS }, data => {
        applyStoredSettings(data.soundscapeSettings);
        resolve();
        });
    });
    const save = () => storage?.set({ soundscapeSettings: settings });

    function ensureContext() {
        if (!context) {
            context = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = context.createGain();
            masterGain.connect(context.destination);
        }
        if (context.state === 'suspended') context.resume();
        updateVolumes();
    }

    function noiseBuffer(kind) {
        const length = context.sampleRate * 3;
        const buffer = context.createBuffer(1, length, context.sampleRate);
        const data = buffer.getChannelData(0);
        let last = 0, previous = 0, previous2 = 0, slow = 0;
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < length; i++) {
            const white = Math.random() * 2 - 1;
            b0 = .99886*b0 + white*.0555179; b1 = .99332*b1 + white*.0750759;
            b2 = .969*b2 + white*.153852; b3 = .8665*b3 + white*.3104856;
            b4 = .55*b4 + white*.5329522; b5 = -.7616*b5 - white*.016898;
            const pink = (b0+b1+b2+b3+b4+b5+b6+white*.5362)*.11; b6 = white*.115926;
            const phase = i / length * Math.PI * 2;
            if (kind === 'pink') {
                data[i] = pink;
            } else if (kind === 'brown') {
                last = (last + .02 * white) / 1.02; data[i] = last * 3.5;
            } else if (kind === 'blue') {
                data[i] = (white - previous) * .36; previous = white;
            } else if (kind === 'violet') {
                data[i] = (white - 2 * previous + previous2) * .2; previous2 = previous; previous = white;
            } else if (kind === 'grey') {
                data[i] = pink * .55 + (white - previous) * .16; previous = white;
            } else if (kind === 'green') {
                slow += .035 * (white - slow); data[i] = (pink * .55 + slow * 1.1) * .65;
            } else if (kind === 'red') {
                last = (last + .009 * white) / 1.009; data[i] = last * 5.2;
            } else if (kind === 'deep') {
                last = (last + .008 * white) / 1.008; data[i] = last * 3 + Math.sin(phase * 9) * .09;
            } else if (kind === 'soft') {
                data[i] = pink * .52;
            } else if (kind === 'air') {
                data[i] = (white - previous) * .16 + pink * .12; previous = white;
            } else if (kind === 'hiss') {
                data[i] = white * .2;
            } else if (kind === 'rumble') {
                slow += .006 * (white - slow); data[i] = slow * 2.4 + Math.sin(phase * 4) * .07;
            } else if (kind === 'windNoise') {
                data[i] = pink * (.28 + .38 * (1 + Math.sin(phase * 2)) / 2);
            } else if (kind === 'rainNoise') {
                data[i] = pink * .28 + (Math.random() > .994 ? white * .58 : white * .05);
            } else if (kind === 'wavesNoise') {
                data[i] = pink * (.2 + .52 * (1 + Math.sin(phase)) / 2);
            } else if (kind === 'vinyl') {
                data[i] = pink * .09 + white * .025 + (Math.random() > .9985 ? white * .72 : 0);
            } else if (kind === 'staticNoise') {
                data[i] = white * .13 + (Math.random() > .992 ? white * .48 : 0);
            } else if (kind === 'pulse') {
                data[i] = pink * (.12 + .48 * Math.pow((1 + Math.sin(phase * 6)) / 2, 5));
            } else if (kind === 'space') {
                slow += .004 * (white - slow); data[i] = slow * 1.8 + Math.sin(phase * 5) * .07 + (Math.random() > .999 ? white * .35 : 0);
            } else data[i] = white * .42;
            data[i] = Math.max(-.95, Math.min(.95, data[i]));
        }
        return buffer;
    }

    function toggleNoise(index, kind) {
        const key = `noise-${index}`;
        if (active.has(key)) return stopSound(key);
        ensureContext();
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = noiseBuffer(kind); source.loop = true;
        source.connect(gain).connect(masterGain); source.start();
        active.set(key, { type: 'noise', source, gain });
        updateVolumes(); updateUI(); startTimerIfNeeded();
    }

    function toggleAmbient(index, kind) {
        const key = `ambient-${index}`;
        if (active.has(key)) return stopSound(key);
        const audio = new Audio(ambients[kind].src);
        audio.loop = true; audio.preload = 'auto';
        active.set(key, { type: 'ambient', audio });
        updateVolumes();
        audio.play().catch(() => stopSound(key));
        updateUI(); startTimerIfNeeded();
    }

    function stopSound(key) {
        const item = active.get(key);
        if (!item) return;
        if (item.source) { try { item.source.stop(); } catch (_) {} }
        if (item.audio) { item.audio.pause(); item.audio.currentTime = 0; }
        active.delete(key); updateUI();
        if (!active.size) clearTimer();
    }
    function stopAll() { [...active.keys()].forEach(stopSound); clearTimer(); }
    function updateVolumes() {
        const master = clamp(settings.masterVolume) / 100;
        if (masterGain) masterGain.gain.value = master;
        active.forEach(item => {
            const group = clamp(item.type === 'noise' ? settings.noiseVolume : settings.ambientVolume) / 100;
            if (item.gain) item.gain.gain.value = group;
            if (item.audio) item.audio.volume = master * group;
        });
    }
    function updateUI() {
        widget.querySelectorAll('[data-sound-key]').forEach(button => button.classList.toggle('active', active.has(button.dataset.soundKey)));
        status.textContent = active.size ? `${active.size} ${active.size === 1 ? 'звук' : active.size < 5 ? 'звука' : 'звуков'}` : 'Тишина';
    }
    function clearTimer() { clearTimeout(timerId); timerId = null; timerEndsAt = 0; }
    function startTimerIfNeeded() {
        if (!settings.timerMinutes || timerId) return;
        timerEndsAt = Date.now() + settings.timerMinutes * 60000;
        timerId = setTimeout(stopAll, settings.timerMinutes * 60000);
    }

    function soundButton(type, index, kind, descriptor) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'soundscape-slot';
        button.dataset.soundKey = `${type}-${index}`;
        button.innerHTML = `<span class="soundscape-slot__icon">${descriptor.icon}</span><small class="soundscape-slot__label">${descriptor.label}</small>`;
        button.addEventListener('click', () => type === 'noise' ? toggleNoise(index, kind) : toggleAmbient(index, kind));
        return button;
    }
    function render() {
        noiseGrid.replaceChildren(...settings.noiseSlots.map((kind, index) => soundButton('noise', index, kind, noises[kind] || noises.white)));
        ambientGrid.replaceChildren(...settings.ambientSlots.map((kind, index) => soundButton('ambient', index, kind, ambients[kind] || ambients.rain)));
        volume.value = settings.masterVolume; updateUI();
    }
    function settingSelect(type, index, value, collection) {
        const label = document.createElement('label'); label.className = 'soundscape-setting-row';
        const caption = document.createElement('span'); caption.textContent = `Слот ${index + 1}`;
        const select = document.createElement('select'); select.dataset[type] = index;
        Object.entries(collection).forEach(([key, item]) => select.add(new Option(item.label, key, false, key === value)));
        label.append(caption, select); return label;
    }
    function openSettings() {
        document.getElementById('soundscape-noise-settings').replaceChildren(...settings.noiseSlots.map((v,i) => settingSelect('noiseSlot',i,v,noises)));
        document.getElementById('soundscape-ambient-settings').replaceChildren(...settings.ambientSlots.map((v,i) => settingSelect('ambientSlot',i,v,ambients)));
        document.getElementById('settings-soundscape-master').value = settings.masterVolume;
        document.getElementById('settings-soundscape-noise-volume').value = settings.noiseVolume;
        document.getElementById('settings-soundscape-ambient-volume').value = settings.ambientVolume;
        document.getElementById('settings-soundscape-timer').value = settings.timerMinutes;
        modal.classList.remove('hidden');
    }
    function closeSettings() { modal.classList.add('hidden'); }

    volume.addEventListener('input', event => { settings.masterVolume = clamp(event.target.value); updateVolumes(); save(); });
    document.getElementById('soundscape-stop-all').addEventListener('click', stopAll);
    document.getElementById('soundscape-settings-btn').addEventListener('click', openSettings);
    document.getElementById('close-soundscape-modal').addEventListener('click', closeSettings);
    document.getElementById('cancel-soundscape-settings').addEventListener('click', closeSettings);
    modal.addEventListener('click', event => { if (event.target === modal) closeSettings(); });
    document.getElementById('soundscape-settings-form').addEventListener('submit', event => {
        event.preventDefault();
        const noiseSlots = [...document.querySelectorAll('[data-noise-slot]')].map(el => el.value);
        const ambientSlots = [...document.querySelectorAll('[data-ambient-slot]')].map(el => el.value);
        settings = { ...settings, noiseSlots, ambientSlots,
            masterVolume: clamp(document.getElementById('settings-soundscape-master').value),
            noiseVolume: clamp(document.getElementById('settings-soundscape-noise-volume').value),
            ambientVolume: clamp(document.getElementById('settings-soundscape-ambient-volume').value),
            timerMinutes: Number(document.getElementById('settings-soundscape-timer').value) || 0 };
        stopAll(); save(); render(); closeSettings();
    });
    window.addEventListener('pagehide', stopAll);
    load().then(render);
})();
