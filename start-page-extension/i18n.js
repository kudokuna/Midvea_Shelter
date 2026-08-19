(() => {
    const requested = (chrome.i18n?.getUILanguage?.() || navigator.language || 'en').toLowerCase();
    const locale = requested.startsWith('uk') ? 'uk' : requested.startsWith('ru') ? 'ru' : 'en';
    const entries = [
        ['Быстрые сервисы','Quick services','Швидкі сервіси'],['Закрыть','Close','Закрити'],['Открыть','Open','Відкрити'],
        ['Открыть в оверлее','Open in overlay','Відкрити в оверлеї'],['Открыть инкогнито','Open incognito','Відкрити інкогніто'],
        ['Редактировать','Edit','Редагувати'],['Переместить','Move','Перемістити'],['Удалить','Delete','Видалити'],
        ['Переименовать','Rename','Перейменувати'],['Удалить категорию','Delete category','Видалити категорію'],['Удалить папку','Delete folder','Видалити папку'],
        ['Настройки погоды','Weather settings','Налаштування погоди'],['Загрузка...','Loading...','Завантаження...'],
        ['Давление: -- мм.рт.ст.','Pressure: -- mmHg','Тиск: -- мм рт. ст.'],['Влажность: --%','Humidity: --%','Вологість: --%'],
        ['Настройки Pomodoro','Pomodoro settings','Налаштування Pomodoro'],['Завершённые фокус-сессии','Completed focus sessions','Завершені фокус-сесії'],
        ['0 сессий','0 sessions','0 сесій'],['Режим таймера','Timer mode','Режим таймера'],['Фокус','Focus','Фокус'],['Перерыв','Break','Перерва'],
        ['Старт','Start','Старт'],['Пауза','Pause','Пауза'],['Сбросить таймер','Reset timer','Скинути таймер'],
        ['Настроить звуковое пространство','Configure soundscape','Налаштувати звуковий простір'],['ЗВУКОВОЕ ПРОСТРАНСТВО','SOUNDSCAPE','ЗВУКОВИЙ ПРОСТІР'],
        ['Звуковое пространство','Soundscape','Звуковий простір'],['Тишина','Silence','Тиша'],['Шумы','Noises','Шуми'],['Атмосфера','Ambience','Атмосфера'],
        ['Общая громкость','Master volume','Загальна гучність'],['Стоп','Stop','Стоп'],['Заметки','Notes','Нотатки'],['Добавить заметку','Add note','Додати нотатку'],
        ['Автор','Author','Автор'],['Мотивация','Motivation','Мотивація'],['Мудрость','Wisdom','Мудрість'],['Юмор','Humor','Гумор'],['Наука','Science','Наука'],
        ['Следующая →','Next →','Наступна →'],['Настроить цвет пространства','Customize space color','Налаштувати колір простору'],
        ['Локальное пространство','Local space','Локальний простір'],['Спросите или введите URL','Search or enter a URL','Знайдіть або введіть URL'],
        ['Поисковик','Search engine','Пошукова система'],['Категории закладок','Bookmark categories','Категорії закладок'],['Новая категория','New category','Нова категорія'],
        ['Управление закладками','Manage bookmarks','Керування закладками'],['Добавить закладку','Add bookmark','Додати закладку'],['Сайт','Site','Сайт'],
        ['Создать папку','Create folder','Створити папку'],['Папка','Folder','Папка'],['Импорт из HTML','Import from HTML','Імпорт з HTML'],['Импорт','Import','Імпорт'],
        ['Закладки','Bookmarks','Закладки'],['История','History','Історія'],['Загрузки','Downloads','Завантаження'],['Расширения','Extensions','Розширення'],
        ['Управление виджетами','Manage widgets','Керування віджетами'],['Сменить фон','Change background','Змінити фон'],['Галерея фонов','Background gallery','Галерея фонів'],
        ['Открыть галерею фонов','Open background gallery','Відкрити галерею фонів'],['Настройки','Settings','Налаштування'],['О Midvea Shelter','About Midvea Shelter','Про Midvea Shelter'],
        ['Фокус-сессии и короткие перерывы','Focus sessions and short breaks','Фокус-сесії та короткі перерви'],['Короткий перерыв','Short break','Коротка перерва'],
        ['Длинный перерыв','Long break','Довга перерва'],['Сессий в цикле','Sessions per cycle','Сесій у циклі'],['Звуковой сигнал','Sound alert','Звуковий сигнал'],
        ['Системное уведомление','System notification','Системне сповіщення'],['Сохранить','Save','Зберегти'],['Отмена','Cancel','Скасувати'],
        ['Выберите содержимое восьми кнопок. Все звуки можно смешивать одновременно.','Choose the contents of eight buttons. All sounds can play together.','Оберіть вміст восьми кнопок. Усі звуки можна змішувати одночасно.'],
        ['Громкость шумов','Noise volume','Гучність шумів'],['Громкость атмосферы','Ambience volume','Гучність атмосфери'],
        ['Название','Name','Назва'],['Загрузить свою иконку','Upload your icon','Завантажити власну іконку'],['Найти иконку в сети','Find an icon online','Знайти іконку в мережі'],
        ['Для сайтов без собственной иконки','For sites without their own icon','Для сайтів без власної іконки'],['Цвет иконок сайтов','Site icon color','Колір іконок сайтів'],
        ['Удалить закладку?','Delete bookmark?','Видалити закладку?'],['Переместить закладку','Move bookmark','Перемістити закладку'],['Папка назначения','Destination folder','Папка призначення'],
        ['Найти папку…','Find a folder…','Знайти папку…'],['Подходящих папок нет.','No matching folders.','Відповідних папок немає.'],
        ['Импортировать HTML','Import HTML','Імпортувати HTML'],['Импортировать в','Import into','Імпортувати до'],['Предварительный просмотр','Preview','Попередній перегляд'],
        ['Импортировать','Import','Імпортувати'],['Экспортировать HTML','Export HTML','Експортувати HTML'],['Основные','General','Основні'],['Разделы настроек','Settings sections','Розділи налаштувань'],
        ['Формат времени','Time format','Формат часу'],['12 часов','12-hour','12 годин'],['24 часа','24-hour','24 години'],['от: система','from system','із системи'],
        ['Открывать результаты поиска в новой вкладке','Open search results in a new tab','Відкривати результати пошуку в новій вкладці'],
        ['Открывать закладки в новой вкладке','Open bookmarks in a new tab','Відкривати закладки в новій вкладці'],
        ['Поисковую систему можно изменить непосредственно в панели поиска.','You can change the search engine directly in the search bar.','Пошукову систему можна змінити безпосередньо в панелі пошуку.'],
        ['Анимации','Animations','Анімації'],['Панель поиска','Search bar','Панель пошуку'],['Автоматически скрывается на узком экране','Automatically hidden on narrow screens','Автоматично приховується на вузькому екрані'],
        ['Фон под названиями','Label background','Фон під назвами'],['Применяется к папкам в сетке и окнах','Applied to folders in the grid and dialogs','Застосовується до папок у сітці та вікнах'],
        ['Цвет фона названий','Label background color','Колір фону назв'],['Цвет папок','Folder color','Колір папок'],['Активный элемент','Active item','Активний елемент'],
        ['Цвет пространства','Space color','Колір простору'],['Изменить цвет','Change color','Змінити колір'],['Виджеты','Widgets','Віджети'],['Панель виджетов','Widget panel','Панель віджетів'],
        ['Здесь задаётся состав левой панели. Те же параметры доступны через кнопку управления виджетами в Dock.','Choose what appears in the left panel. The same options are available from the widget button in the dock.','Оберіть вміст лівої панелі. Ті самі параметри доступні через кнопку віджетів у доку.'],
        ['Погода','Weather','Погода'],['Город, температура и влажность','City, temperature and humidity','Місто, температура та вологість'],
        ['Таймер','Timer','Таймер'],['Шумы, природа и медитация','Noise, nature and meditation','Шуми, природа та медитація'],
        ['Быстрые записи на новой вкладке','Quick notes on the new tab','Швидкі нотатки на новій вкладці'],['Цитаты','Quotes','Цитати'],
        ['Категории и случайные высказывания','Categories and random quotes','Категорії та випадкові вислови'],
        ['Изменения сразу видны на стартовой странице. Перетаскивайте карточки, чтобы изменить их порядок.','Changes appear immediately. Drag cards to reorder them.','Зміни одразу видно на стартовій сторінці. Перетягуйте картки, щоб змінити порядок.'],
        ['Галерея','Gallery','Галерея'],['Все','All','Усі'],['Избранное','Favorites','Обране'],['Мои обои','My backgrounds','Мої фони'],['Картинка','Image','Зображення'],['Видео','Video','Відео'],
        ['Природа','Nature','Природа'],['Города','Cities','Міста'],['Космос','Space','Космос'],['Минимализм','Minimalism','Мінімалізм'],['Архитектура','Architecture','Архітектура'],
        ['Аниме','Anime','Аніме'],['Автомобили','Cars','Автомобілі'],['Игры','Games','Ігри'],['Животные','Animals','Тварини'],['Путешествия','Travel','Подорожі'],
        ['Список избранных обоев пуст','Your favorites are empty','Список обраних фонів порожній'],['Список собственных обоев пуст','You have no custom backgrounds','Список власних фонів порожній'],
        ['Загрузить изображение','Upload image','Завантажити зображення'],['Живые обои','Live backgrounds','Живі фони'],['Текущие обои','Current background','Поточний фон'],
        ['Чередовать обои','Rotate backgrounds','Чергувати фони'],['Чередовать обои ежедневно','Rotate backgrounds daily','Змінювати фони щодня'],['Без таймера','No timer','Без таймера'],
        ['Назад','Back','Назад'],['Предыдущие категории','Previous categories','Попередні категорії'],['Следующие категории','Next categories','Наступні категорії'],
        ['Готовые цвета','Preset colors','Готові кольори'],['Свой цвет','Custom color','Власний колір'],['Коралловый','Coral','Кораловий'],['Мятный','Mint','М’ятний'],
        ['Небесный','Sky','Небесний'],['Лиловый','Lilac','Бузковий'],['Янтарный','Amber','Бурштиновий'],['Зелёный','Green','Зелений'],['Индиго','Indigo','Індиго'],
        ['Выберите спокойный системный акцент. Он изменит активные элементы, подсветку и индикаторы.','Choose a calm accent color for active controls, highlights, and indicators.','Оберіть спокійний акцент для активних елементів, підсвічування та індикаторів.'],
        ['ВАШЕ ЦИФРОВОЕ ПРОСТРАНСТВО','YOUR DIGITAL SPACE','ВАШ ЦИФРОВИЙ ПРОСТІР'],
        ['Независимая стартовая страница с локальными настройками, закладками Chrome и инструментами для спокойной работы.','An independent start page with local settings, Chrome bookmarks, and tools for focused work.','Незалежна стартова сторінка з локальними налаштуваннями, закладками Chrome та інструментами для спокійної роботи.'],
        ['Настройки и пользовательские данные остаются в браузере.','Settings and user data stay in your browser.','Налаштування та дані користувача залишаються у браузері.'],
        ['Без скрытой аналитики','No hidden analytics','Без прихованої аналітики'],['Расширение не продаёт данные и не создаёт рекламный профиль.','The extension does not sell data or build advertising profiles.','Розширення не продає дані та не створює рекламний профіль.'],
        ['Самостоятельный продукт','Independent product','Самостійний продукт'],['Собственная визуальная система и независимая реализация.','Original visual system and independent implementation.','Власна візуальна система та незалежна реалізація.'],
        ['Политика конфиденциальности','Privacy policy','Політика конфіденційності'],['Источники материалов','Asset sources','Джерела матеріалів'],
        ['Новая заметка','New note','Нова нотатка'],['Текст заметки','Note text','Текст нотатки'],['Удалить заметку','Delete note','Видалити нотатку'],['мин','min','хв'],['сесс.','sessions','сес.'],
        ['+ Папка','+ Folder','+ Папка'],['+ Сайт','+ Site','+ Сайт'],['15 минут','15 minutes','15 хвилин'],['30 минут','30 minutes','30 хвилин'],['45 минут','45 minutes','45 хвилин'],['60 минут','60 minutes','60 хвилин'],
        ['В этой папке пока ничего нет.','This folder is empty.','У цій папці поки нічого немає.'],['Загрузка обоев...','Loading backgrounds...','Завантаження фонів...'],['Закрыть настройки','Close settings','Закрити налаштування'],['Категории обоев','Background categories','Категорії фонів'],['На узком экране скрывается автоматически','Hidden automatically on narrow screens','На вузькому екрані приховується автоматично'],['ОТМЕНА','CANCEL','СКАСУВАТИ'],['СОХРАНИТЬ','SAVE','ЗБЕРЕГТИ'],['Сбросить','Reset','Скинути'],['Управление данными','Data controls','Керування даними'],['— Автор','— Author','— Автор'],
        ['Белый','White','Білий'],['Розовый','Pink','Рожевий'],['Коричневый','Brown','Коричневий'],['Голубой','Blue','Блакитний'],['Фиолетовый','Violet','Фіолетовий'],['Серый','Gray','Сірий'],['Красный','Red','Червоний'],['Глубокий','Deep','Глибокий'],['Мягкий','Soft','М’який'],['Воздушный','Airy','Повітряний'],['Шипение','Hiss','Шипіння'],['Гул','Rumble','Гул'],['Порывы','Gusts','Пориви'],['Шум дождя','Rain noise','Шум дощу'],['Прибой','Surf','Прибій'],['Винил','Vinyl','Вініл'],['Радиопомехи','Static','Радіоперешкоди'],['Пульсация','Pulse','Пульсація'],['Космический','Cosmic','Космічний'],
        ['Источники материалов — Midvea Shelter','Asset sources — Midvea Shelter','Джерела матеріалів — Midvea Shelter'],
        ['Логотип Midvea Shelter','Midvea Shelter logo','Логотип Midvea Shelter'],
        ['Midvea Shelter · обновлено 15 августа 2026 года','Midvea Shelter · updated August 15, 2026','Midvea Shelter · оновлено 15 серпня 2026 року'],
        ['Собственные материалы','Original assets','Власні матеріали'],
        ['— оригинальный знак Midvea Shelter, созданный для проекта.','— the original Midvea Shelter mark created for the project.','— оригінальний знак Midvea Shelter, створений для проєкту.'],
        ['и','and','та'],
        ['— системный набор, экспортированный из оригинального знака.','— the system icon set exported from the original mark.','— системний набір, експортований з оригінального знака.'],
        ['brand-mark.svg — оригинальный знак Midvea Shelter, созданный для проекта.','brand-mark.svg — the original Midvea Shelter mark created for the project.','brand-mark.svg — оригінальний знак Midvea Shelter, створений для проєкту.'],
        ['icons/icon-16.png, icon-32.png, icon-48.png и icon-128.png — системный набор, экспортированный из оригинального знака.','icons/icon-16.png, icon-32.png, icon-48.png, and icon-128.png — the system icon set exported from the original mark.','icons/icon-16.png, icon-32.png, icon-48.png та icon-128.png — системний набір, експортований з оригінального знака.'],
        ['Разметка, стили и JavaScript расширения — самостоятельная реализация проекта.','The extension markup, styles, and JavaScript are an independent implementation of the project.','Розмітка, стилі та JavaScript розширення — самостійна реалізація проєкту.'],
        ['Внешние сервисы и динамический контент','External services and dynamic content','Зовнішні сервіси та динамічний контент'],
        ['Open-Meteo — текущая погода и поиск населённых пунктов. Данные загружаются по запросу и не включены в дистрибутив.','Open-Meteo — current weather and location search. Data is loaded on demand and is not included in the distribution.','Open-Meteo — поточна погода та пошук населених пунктів. Дані завантажуються на запит і не входять до дистрибутива.'],
        ['Reddit — пользователь выбирает фон из внешней выдачи. Контент не является частью расширения; перед публикацией источники должны быть ограничены материалами с подтверждённой лицензией.','Reddit — the user selects a background from external results. The content is not part of the extension; before publication, sources must be limited to assets with a verified license.','Reddit — користувач обирає фон із зовнішньої видачі. Контент не є частиною розширення; перед публікацією джерела мають бути обмежені матеріалами з підтвердженою ліцензією.'],
        ['Google, Bing, DuckDuckGo и другие поисковые сервисы используются только как выбранные пользователем адресаты поиска.','Google, Bing, DuckDuckGo, and other search services are used only as user-selected search destinations.','Google, Bing, DuckDuckGo та інші пошукові сервіси використовуються лише як обрані користувачем адресати пошуку.'],
        ['Иконки сайтов загружаются для пользовательских закладок и принадлежат владельцам соответствующих товарных знаков.','Site icons are loaded for user bookmarks and belong to the owners of the respective trademarks.','Іконки сайтів завантажуються для закладок користувача та належать власникам відповідних товарних знаків.'],
        ['Исключённые материалы','Excluded assets','Виключені матеріали'],
        ['Медиа из референсного расширения не должны включаться в сборку Midvea Shelter.','Media from the reference extension must not be included in the Midvea Shelter build.','Медіа з референсного розширення не мають входити до збірки Midvea Shelter.'],
        ['Звуки виджета «Звуковое пространство»','Soundscape widget sounds','Звуки віджета «Звуковий простір»'],
        ['Проверено 15 августа 2026 года. Файлы распространяются по','Verified August 15, 2026. The files are distributed under the','Перевірено 15 серпня 2026 року. Файли розповсюджуються за'],
        ['и хранятся локально, поэтому воспроизведение не требует сети.','and are stored locally, so playback does not require a network connection.','і зберігаються локально, тому відтворення не потребує мережі.'],
        ['Проверено 15 августа 2026 года. Файлы распространяются по Mixkit Free License и хранятся локально, поэтому воспроизведение не требует сети.','Verified August 15, 2026. The files are distributed under the Mixkit Free License and stored locally, so playback does not require a network connection.','Перевірено 15 серпня 2026 року. Файли розповсюджуються за Mixkit Free License і зберігаються локально, тому відтворення не потребує мережі.'],
        ['20 вариантов цветного шума генерируются локально с помощью Web Audio API и не используют внешние аудиофайлы.','20 types of colored noise are generated locally using the Web Audio API and do not use external audio files.','20 варіантів кольорового шуму генеруються локально за допомогою Web Audio API і не використовують зовнішні аудіофайли.'],
        ['источник','source','джерело'],['Вокзал','Train station','Вокзал'],['Ночной город','Night city','Нічне місто'],
        ['Дождь','Rain','Дощ'],['Океан','Ocean','Океан'],['Лес','Forest','Ліс'],['Огонь','Fire','Вогонь'],['Серверная','Server room','Серверна'],['Вентилятор','Fan','Вентилятор'],['Двигатель','Engine','Двигун'],['Фен','Hair dryer','Фен'],['Нагреватель','Heater','Обігрівач'],['Гроза','Thunder','Гроза'],['Река','River','Річка'],['Птицы','Birds','Птахи'],['Ночной лес','Night forest','Нічний ліс'],['Кафе','Café','Кафе'],['Поезд','Train','Потяг'],['Город','City','Місто'],['Офис','Office','Офіс'],['Часы','Clock','Годинник'],['Самолёт','Airplane','Літак'],['Ветер','Wind','Вітер'],['Слот','Slot','Слот']
    ];
    const index = locale === 'ru' ? 0 : locale === 'uk' ? 2 : 1;
    const map = new Map(entries.map(row => [row[0], row[index]]));
    const clean = value => String(value || '').trim().replace(/^[✕✏️📂🔗🕶️🖼️🗑️]+\s*/u, '');
    function t(source) { return map.get(source) || source; }
    function translateTextNode(node) {
        const raw = node.nodeValue; const trimmed = raw.trim(); if (!trimmed) return;
        const prefix = raw.slice(0, raw.indexOf(trimmed)); const suffix = raw.slice(raw.indexOf(trimmed) + trimmed.length);
        const base = clean(trimmed); const translated = t(base);
        if (translated !== base) node.nodeValue = prefix + trimmed.replace(base, translated) + suffix;
    }
    function localize(root = document) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode); nodes.forEach(translateTextNode);
        (root.querySelectorAll ? root.querySelectorAll('*') : []).forEach(el => ['aria-label','title','placeholder','data-tooltip','alt'].forEach(attr => {
            if (el.hasAttribute(attr)) { const value = el.getAttribute(attr); el.setAttribute(attr, t(value)); }
        }));
    }
    window.MidveaI18n = { locale, t, localize };
    document.documentElement.lang = locale;
    document.addEventListener('DOMContentLoaded', () => {
        localize();
        new MutationObserver(changes => changes.forEach(change => change.addedNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) translateTextNode(node); else if (node.nodeType === Node.ELEMENT_NODE) localize(node);
        }))).observe(document.body, { childList: true, subtree: true });
    }, { once: true });
})();
