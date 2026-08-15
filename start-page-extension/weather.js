// Weather powered by Open-Meteo. The public endpoints do not require an API key.
const WEATHER_CACHE_TTL = 30 * 60 * 1000;
const WEATHER_LOCALE = window.MidveaI18n?.locale || 'en';
const WEATHER_TEXT = {
    en: { locating: 'Locating...', saved: 'saved', searching: 'Searching...', myLocation: 'My location', clear: 'clear', mainlyClear: 'mainly clear', partlyCloudy: 'partly cloudy', overcast: 'overcast', fog: 'fog', drizzle: 'drizzle', freezingDrizzle: 'freezing drizzle', rain: 'rain', freezingRain: 'freezing rain', snow: 'snow', showers: 'showers', snowfall: 'snowfall', thunderstorm: 'thunderstorm', unavailable: 'not available', pressure: 'Pressure', humidity: 'Humidity', cityNotFound: 'City not found', checkName: 'Check the name', noLocation: 'Location unavailable', enterCity: 'Enter a city manually', weatherUnavailable: 'Weather unavailable', checkConnection: 'Check your connection' },
    ru: { locating: 'Определение...', saved: 'сохранено', searching: 'Поиск...', myLocation: 'Моё местоположение', clear: 'ясно', mainlyClear: 'преимущественно ясно', partlyCloudy: 'переменная облачность', overcast: 'пасмурно', fog: 'туман', drizzle: 'морось', freezingDrizzle: 'ледяная морось', rain: 'дождь', freezingRain: 'ледяной дождь', snow: 'снег', showers: 'ливень', snowfall: 'снегопад', thunderstorm: 'гроза', unavailable: 'нет данных', pressure: 'Давление', humidity: 'Влажность', cityNotFound: 'Город не найден', checkName: 'Проверьте название', noLocation: 'Геолокация недоступна', enterCity: 'Укажите город вручную', weatherUnavailable: 'Погода недоступна', checkConnection: 'Проверьте соединение' },
    uk: { locating: 'Визначення...', saved: 'збережено', searching: 'Пошук...', myLocation: 'Моє місцезнаходження', clear: 'ясно', mainlyClear: 'переважно ясно', partlyCloudy: 'мінлива хмарність', overcast: 'хмарно', fog: 'туман', drizzle: 'мряка', freezingDrizzle: 'крижана мряка', rain: 'дощ', freezingRain: 'крижаний дощ', snow: 'сніг', showers: 'злива', snowfall: 'снігопад', thunderstorm: 'гроза', unavailable: 'немає даних', pressure: 'Тиск', humidity: 'Вологість', cityNotFound: 'Місто не знайдено', checkName: 'Перевірте назву', noLocation: 'Геолокація недоступна', enterCity: 'Вкажіть місто вручну', weatherUnavailable: 'Погода недоступна', checkConnection: 'Перевірте з’єднання' }
}[WEATHER_LOCALE];
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
                setWeatherStatus(WEATHER_TEXT.locating, '--');
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
                if (description) description.textContent = `${preferences.cachedWeather.desc} · ${WEATHER_TEXT.saved}`;
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
        language: WEATHER_LOCALE,
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
    setWeatherStatus(WEATHER_TEXT.searching, '--');
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
                name: WEATHER_TEXT.myLocation,
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
    if (code === 0) return WEATHER_TEXT.clear;
    if (code === 1) return WEATHER_TEXT.mainlyClear;
    if (code === 2) return WEATHER_TEXT.partlyCloudy;
    if (code === 3) return WEATHER_TEXT.overcast;
    if ([45, 48].includes(code)) return WEATHER_TEXT.fog;
    if ([51, 53, 55].includes(code)) return WEATHER_TEXT.drizzle;
    if ([56, 57].includes(code)) return WEATHER_TEXT.freezingDrizzle;
    if ([61, 63, 65].includes(code)) return WEATHER_TEXT.rain;
    if ([66, 67].includes(code)) return WEATHER_TEXT.freezingRain;
    if ([71, 73, 75, 77].includes(code)) return WEATHER_TEXT.snow;
    if ([80, 81, 82].includes(code)) return WEATHER_TEXT.showers;
    if ([85, 86].includes(code)) return WEATHER_TEXT.snowfall;
    if ([95, 96, 99].includes(code)) return WEATHER_TEXT.thunderstorm;
    return WEATHER_TEXT.unavailable;
}

function updateWeatherUI(data, unit) {
    document.getElementById('weather-city').textContent = data.city;
    document.getElementById('weather-desc').textContent = data.desc;
    document.getElementById('weather-temp-val').textContent = data.temp;
    setTemperatureUnit(unit);
    document.getElementById('weather-pressure').textContent = `${WEATHER_TEXT.pressure}: ${Math.round(data.pressure * 0.750062)} ${WEATHER_LOCALE === 'en' ? 'mmHg' : WEATHER_LOCALE === 'uk' ? 'мм рт. ст.' : 'мм.рт.ст.'}`;
    document.getElementById('weather-humidity').textContent = `${WEATHER_TEXT.humidity}: ${data.humidity}%`;

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
        CITY_NOT_FOUND: [WEATHER_TEXT.cityNotFound, WEATHER_TEXT.checkName],
        GEO_DENIED: [WEATHER_TEXT.noLocation, WEATHER_TEXT.enterCity],
        GEO_UNAVAILABLE: [WEATHER_TEXT.noLocation, WEATHER_TEXT.enterCity]
    }[error.message];
    setWeatherStatus(...(knownMessage || [WEATHER_TEXT.weatherUnavailable, WEATHER_TEXT.checkConnection]));
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
