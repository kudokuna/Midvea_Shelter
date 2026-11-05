(() => {
    const language = (globalThis.chrome?.i18n?.getUILanguage?.() || navigator.language || 'en').toLowerCase();
    const locale = language.startsWith('uk') ? 'uk' : language.startsWith('ru') ? 'ru' : 'en';
    document.documentElement.lang = locale;
    document.title = locale === 'uk' ? 'Конфіденційність — Midvea Shelter' : locale === 'ru' ? 'Конфиденциальность — Midvea Shelter' : 'Privacy — Midvea Shelter';

    const content = {
        en: `<h1>Privacy Policy</h1><p class="date">Updated November 6, 2026</p>
<p>Midvea Shelter replaces the Chrome new tab page with a personal workspace. It has no developer-operated account or server, does not send your notes or bookmarks to the developer, and does not use advertising analytics or sell user data.</p>
<h2>Data on your device</h2><p>The extension reads and manages Chrome bookmarks when you use its bookmark tools. It stores settings, notes, timer state, favorite and hidden backgrounds, uploaded images or videos, and weather information in Chrome local storage. A backup is saved to a file on your device only when you choose to export it.</p>
<h2>Requests to other services</h2><ul><li>Weather: a city search or, after you grant permission, coordinates are sent over HTTPS to Open-Meteo.</li><li>Search: your query goes to your selected search provider. When Google is selected, typed text also goes to Google Suggestions for suggestions.</li><li>Backgrounds: gallery requests go to Wallhaven for images and Wikimedia Commons for videos. Media is loaded from its source hosts.</li><li>Icons and image search: bookmark domains may be requested from icon.horse or Google to display site icons. Image searches you start use DuckDuckGo or Bing.</li></ul>
<p>These services may receive your IP address and request details under their own privacy policies. Midvea Shelter does not control their data practices.</p>
<h2>Your choices</h2><p>You can edit or delete notes, bookmarks, backgrounds, and settings in the extension. You can deny location permission, use a searched city instead, or remove the extension and its local data through Chrome.</p>
<h2>Contact</h2><p>For support, visit <a href="https://github.com/kudokuna/Midvea_Shelter/issues" target="_blank" rel="noopener noreferrer">the Midvea Shelter support page</a>.</p>`,
        ru: `<h1>Политика конфиденциальности</h1><p class="date">Обновлена 6 ноября 2026 года</p>
<p>Midvea Shelter заменяет новую вкладку Chrome персональным рабочим пространством. У расширения нет учётной записи или сервера разработчика. Оно не отправляет разработчику ваши заметки и закладки, не использует рекламную аналитику и не продаёт пользовательские данные.</p>
<h2>Данные на вашем устройстве</h2><p>Расширение читает закладки Chrome и управляет ими, когда вы пользуетесь инструментами закладок. Настройки, заметки, состояние таймера, избранные и скрытые фоны, загруженные изображения и видео, а также сведения о погоде сохраняются в локальном хранилище Chrome. Резервная копия сохраняется в файл на вашем устройстве только по вашему действию.</p>
<h2>Запросы к другим сервисам</h2><ul><li>Погода: запрос города или, после вашего разрешения, координаты передаются по HTTPS сервису Open-Meteo.</li><li>Поиск: запрос передаётся выбранной поисковой системе. Если выбран Google, вводимый текст также передаётся Google Suggestions для подсказок.</li><li>Фоны: запросы галереи идут в Wallhaven для изображений и Wikimedia Commons для видео. Медиа загружаются с серверов источников.</li><li>Значки и поиск изображений: домены закладок могут запрашиваться у icon.horse или Google для показа значков сайтов. Поиск изображений использует DuckDuckGo или Bing.</li></ul>
<p>Эти сервисы могут получать ваш IP-адрес и сведения о запросе согласно собственным политикам конфиденциальности. Midvea Shelter не управляет их обработкой данных.</p>
<h2>Ваш выбор</h2><p>Вы можете изменять и удалять заметки, закладки, фоны и настройки в расширении, запретить доступ к местоположению, выбрать город вручную или удалить расширение и его локальные данные средствами Chrome.</p>
<h2>Контакты</h2><p>Для поддержки откройте <a href="https://github.com/kudokuna/Midvea_Shelter/issues" target="_blank" rel="noopener noreferrer">страницу поддержки Midvea Shelter</a>.</p>`,
        uk: `<h1>Політика конфіденційності</h1><p class="date">Оновлено 6 листопада 2026 року</p>
<p>Midvea Shelter замінює нову вкладку Chrome персональним робочим простором. Розширення не має облікового запису чи сервера розробника. Воно не надсилає розробнику ваші нотатки й закладки, не використовує рекламну аналітику та не продає дані користувачів.</p>
<h2>Дані на вашому пристрої</h2><p>Розширення читає закладки Chrome і керує ними, коли ви користуєтеся інструментами закладок. Налаштування, нотатки, стан таймера, обрані й приховані фони, завантажені зображення та відео, а також відомості про погоду зберігаються в локальному сховищі Chrome. Резервна копія зберігається у файл на вашому пристрої лише за вашою дією.</p>
<h2>Запити до інших сервісів</h2><ul><li>Погода: запит міста або, після вашого дозволу, координати передаються через HTTPS до Open-Meteo.</li><li>Пошук: запит передається вибраній пошуковій системі. Якщо вибрано Google, текст, який ви вводите, також передається Google Suggestions для підказок.</li><li>Фони: запити галереї надходять до Wallhaven для зображень і до Wikimedia Commons для відео. Медіа завантажуються із серверів джерел.</li><li>Значки й пошук зображень: домени закладок можуть запитуватися в icon.horse або Google для показу значків сайтів. Пошук зображень використовує DuckDuckGo або Bing.</li></ul>
<p>Ці сервіси можуть отримувати вашу IP-адресу та відомості про запит згідно з власними політиками конфіденційності. Midvea Shelter не керує їхньою обробкою даних.</p>
<h2>Ваш вибір</h2><p>Ви можете змінювати й видаляти нотатки, закладки, фони та налаштування в розширенні, заборонити доступ до місцеперебування, вибрати місто вручну або видалити розширення та його локальні дані засобами Chrome.</p>
<h2>Контакти</h2><p>Для підтримки відкрийте <a href="https://github.com/kudokuna/Midvea_Shelter/issues" target="_blank" rel="noopener noreferrer">сторінку підтримки Midvea Shelter</a>.</p>`
    };

    document.getElementById('privacy-content').innerHTML = content[locale];
})();
