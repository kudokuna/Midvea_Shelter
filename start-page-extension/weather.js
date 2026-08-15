// Weather powered by Open-Meteo. The public endpoints do not require an API key.
const WEATHER_CACHE_TTL = 30 * 60 * 1000;
const WEATHER_CURRENT_FIELDS = [
    'temperature_2m',
    'relative_humidity_2m',
    'pressure_msl',
    'weather_code',
    'is_day'
].join(',');

document.addEventListener('DOMContentLoaded', () => {
    const settingsButton = document.getElementById('weather-settings-btn');
    const settingsModal = document.getElementById('weather-settings-modal');
    const settingsForm = document.getElementById('weather-settings-form');
    const closeButton = document.getElementById('close-weather-modal');
    const locationInput = document.getElementById('weather-location-input');
    const geoButton = document.getElementById('weather-geo-btn');
    const suggestionsList = document.getElementById('weather-city-suggestions');
    let selectedLocation = null;
    let suggestionTimer = null;

    window.fetchWeather = async function fetchWeather(forceUpdate = false) {
        const preferences = await storageGet([
            'cachedWeather',
            'weatherTimestamp',
            'weatherUnit',
            'weatherCityPref',
            'weatherLocationPref'
        ]);
        const unit = preferences.weatherUnit || 'metric';
        setTemperatureUnit(unit);

        const cacheIsFresh = preferences.cachedWeather
            && preferences.weatherTimestamp
            && Date.now() - preferences.weatherTimestamp < WEATHER_CACHE_TTL;

        if (!forceUpdate && cacheIsFresh && preferences.cachedWeather.unit === unit) {
            updateWeatherUI(preferences.cachedWeather, unit);
            return;
        }

        try {
            let location = preferences.weatherLocationPref;
            if (preferences.weatherCityPref) {
                if (!location || location.query !== preferences.weatherCityPref) {
                    location = await findCity(preferences.weatherCityPref);
                }
            } else {
                setWeatherStatus('Определение...', '--');
                location = await getBrowserLocation();
            }

            const weather = await loadWeather(location, unit);
            await storageSet({
                cachedWeather: weather,
                weatherTimestamp: Date.now(),
                weatherLocationPref: preferences.weatherCityPref ? location : null
            });
            updateWeatherUI(weather, unit);
        } catch (error) {
            if (preferences.cachedWeather && preferences.cachedWeather.unit === unit) {
                updateWeatherUI(preferences.cachedWeather, unit);
                const description = document.getElementById('weather-desc');
                if (description) description.textContent = `${preferences.cachedWeather.desc} · сохранено`;
                return;
            }
            handleWeatherError(error);
        }
    };

    settingsButton?.addEventListener('click', async () => {
        const preferences = await storageGet(['weatherUnit', 'weatherCityPref', 'weatherLocationPref']);
        const unit = preferences.weatherUnit || 'metric';
        document.getElementById(unit === 'metric' ? 'unit-c' : 'unit-f').checked = true;
        locationInput.value = preferences.weatherCityPref || '';
        selectedLocation = preferences.weatherLocationPref || null;
        hideSuggestions();
        settingsModal.classList.remove('hidden');
    });

    closeButton?.addEventListener('click', () => {
        hideSuggestions();
        settingsModal.classList.add('hidden');
    });

    settingsModal?.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            hideSuggestions();
            settingsModal.classList.add('hidden');
        }
    });

    settingsForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const unit = document.getElementById('unit-c').checked ? 'metric' : 'imperial';
        const city = locationInput.value.trim();
        const savedLocation = selectedLocation?.query === city ? selectedLocation : null;

        await storageSet({
            weatherUnit: unit,
            weatherCityPref: city,
            weatherLocationPref: savedLocation,
            cachedWeather: null,
            weatherTimestamp: null
        });
        hideSuggestions();
        settingsModal.classList.add('hidden');
        window.fetchWeather(true);
    });

    geoButton?.addEventListener('click', async () => {
        locationInput.value = '';
        selectedLocation = null;
        await storageSet({
            weatherCityPref: '',
            weatherLocationPref: null,
            cachedWeather: null,
            weatherTimestamp: null
        });
        hideSuggestions();
        settingsModal.classList.add('hidden');
        window.fetchWeather(true);
    });

    locationInput?.addEventListener('input', () => {
        selectedLocation = null;
        clearTimeout(suggestionTimer);
        const query = locationInput.value.trim();
        if (query.length < 2) {
            hideSuggestions();
            return;
        }

        suggestionTimer = setTimeout(async () => {
            try {
                const locations = await searchCities(query, 5);
                renderSuggestions(locations);
            } catch (error) {
                console.warn('Не удалось загрузить подсказки городов:', error);
                hideSuggestions();
            }
        }, 250);
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.location-input-wrapper')) hideSuggestions();
    });

    function renderSuggestions(locations) {
        suggestionsList.replaceChildren();
        if (!locations.length) {
            hideSuggestions();
            return;
        }

        locations.forEach((location) => {
            const item = document.createElement('li');
            item.textContent = formatLocation(location);
            item.addEventListener('click', () => {
                selectedLocation = location;
                locationInput.value = location.query;
                hideSuggestions();
            });
            suggestionsList.appendChild(item);
        });
        suggestionsList.classList.remove('hidden');
    }

    function hideSuggestions() {
        suggestionsList?.classList.add('hidden');
        suggestionsList?.replaceChildren();
    }

    window.fetchWeather();
});

async function searchCities(query, count = 5) {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({
        name: query,
        count: String(count),
        language: 'ru',
        format: 'json'
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GEOCODING_${response.status}`);
    const data = await response.json();
    return (data.results || []).map((place) => ({
        latitude: place.latitude,
        longitude: place.longitude,
        name: place.name,
        admin1: place.admin1 || '',
        country: place.country || '',
        query: place.name
    }));
}

async function findCity(query) {
    setWeatherStatus('Поиск...', '--');
    const [location] = await searchCities(query, 1);
    if (!location) throw new Error('CITY_NOT_FOUND');
    location.query = query;
    return location;
}

function getBrowserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('GEO_UNAVAILABLE'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({
                latitude: coords.latitude,
                longitude: coords.longitude,
                name: 'Моё местоположение',
                country: '',
                admin1: '',
                query: ''
            }),
            () => reject(new Error('GEO_DENIED')),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60 * 1000 }
        );
    });
}

async function loadWeather(location, unit) {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current: WEATHER_CURRENT_FIELDS,
        temperature_unit: unit === 'imperial' ? 'fahrenheit' : 'celsius',
        timezone: 'auto',
        forecast_days: '1'
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error(`WEATHER_${response.status}`);
    const data = await response.json();
    const current = data.current;
    if (!current) throw new Error('WEATHER_EMPTY');

    return {
        city: formatLocation(location),
        temp: Math.round(current.temperature_2m),
        desc: describeWeather(current.weather_code),
        code: Number(current.weather_code),
        isDay: Number(current.is_day) === 1,
        pressure: Math.round(current.pressure_msl),
        humidity: Math.round(current.relative_humidity_2m),
        unit
    };
}

function formatLocation(location) {
    return [location.name, location.admin1, location.country]
        .filter((part, index, values) => part && values.indexOf(part) === index)
        .join(', ');
}

function describeWeather(code) {
    if (code === 0) return 'ясно';
    if (code === 1) return 'преимущественно ясно';
    if (code === 2) return 'переменная облачность';
    if (code === 3) return 'пасмурно';
    if ([45, 48].includes(code)) return 'туман';
    if ([51, 53, 55].includes(code)) return 'морось';
    if ([56, 57].includes(code)) return 'ледяная морось';
    if ([61, 63, 65].includes(code)) return 'дождь';
    if ([66, 67].includes(code)) return 'ледяной дождь';
    if ([71, 73, 75, 77].includes(code)) return 'снег';
    if ([80, 81, 82].includes(code)) return 'ливень';
    if ([85, 86].includes(code)) return 'снегопад';
    if ([95, 96, 99].includes(code)) return 'гроза';
    return 'нет данных';
}

function updateWeatherUI(data, unit) {
    document.getElementById('weather-city').textContent = data.city;
    document.getElementById('weather-desc').textContent = data.desc;
    document.getElementById('weather-temp-val').textContent = data.temp;
    setTemperatureUnit(unit);
    document.getElementById('weather-pressure').textContent = `Давление: ${Math.round(data.pressure * 0.750062)} мм.рт.ст.`;
    document.getElementById('weather-humidity').textContent = `Влажность: ${data.humidity}%`;

    const icon = document.getElementById('weather-icon');
    icon.src = createWeatherIcon(data.code, data.isDay);
    icon.alt = data.desc;
    icon.style.display = 'block';
}

function setTemperatureUnit(unit) {
    const element = document.getElementById('weather-temp-unit');
    if (element) element.textContent = unit === 'metric' ? '°C' : '°F';
}

function setWeatherStatus(city, description) {
    document.getElementById('weather-city').textContent = city;
    document.getElementById('weather-desc').textContent = description;
}

function handleWeatherError(error) {
    console.error('Ошибка погоды:', error);
    const knownMessage = {
        CITY_NOT_FOUND: ['Город не найден', 'Проверьте название'],
        GEO_DENIED: ['Нет геолокации', 'Укажите город вручную'],
        GEO_UNAVAILABLE: ['Геолокация недоступна', 'Укажите город вручную']
    }[error.message];
    setWeatherStatus(...(knownMessage || ['Погода недоступна', 'Проверьте соединение']));
    document.getElementById('weather-temp-val').textContent = '--';
    document.getElementById('weather-pressure').textContent = 'Давление: -- мм.рт.ст.';
    document.getElementById('weather-humidity').textContent = 'Влажность: --%';
    const icon = document.getElementById('weather-icon');
    if (icon) icon.style.display = 'none';
}

function createWeatherIcon(code, isDay) {
    let symbol = isDay ? '☀️' : '🌙';
    if ([1, 2].includes(code)) symbol = isDay ? '🌤️' : '☁️';
    else if (code === 3) symbol = '☁️';
    else if ([45, 48].includes(code)) symbol = '🌫️';
    else if ([51, 53, 55, 56, 57].includes(code)) symbol = '🌦️';
    else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) symbol = '🌧️';
    else if ([71, 73, 75, 77, 85, 86].includes(code)) symbol = '🌨️';
    else if ([95, 96, 99].includes(code)) symbol = '⛈️';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><text x="48" y="69" text-anchor="middle" font-size="64" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif">${symbol}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(values) {
    return new Promise((resolve) => chrome.storage.local.set(values, resolve));
}
