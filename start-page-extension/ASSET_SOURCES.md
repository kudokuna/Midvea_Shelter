# Midvea Shelter — реестр материалов

Обновлено: 15 августа 2026 года.

## Собственные материалы

- `brand-mark.svg` — оригинальный знак Midvea Shelter, создан для этого проекта.
- `icons/icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png` — системный набор, экспортированный из оригинального знака.
- Разметка, стили и JavaScript расширения — самостоятельная реализация проекта.

## Внешние сервисы и динамический контент

- Open-Meteo — текущая погода и поиск населённых пунктов. Данные загружаются по запросу и не включены в дистрибутив.
- Reddit — пользователь выбирает фон из внешней выдачи. Контент не является частью расширения; перед публичным релизом источники должны быть ограничены материалами с подтверждённой лицензией.
- Google, Bing, DuckDuckGo и другие поисковые сервисы — используются только как выбранные пользователем адресаты поиска.
- Иконки сайтов загружаются для пользовательских закладок и принадлежат владельцам соответствующих товарных знаков.

## Исключённые материалы

- Каталог и CDN Homey не используются и не входят в продукт.
- Медиа из референсного расширения не должны включаться в сборку Midvea Shelter.

## Звуки виджета «Звуковое пространство»

Проверено 15 августа 2026 года. Файлы распространяются по Mixkit Free License и хранятся локально, поэтому воспроизведение не требует сети.

- `assets/audio/rain.mp3` — Mixkit, Rain; исходный файл `2393-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/rain/
- `assets/audio/ocean.mp3` — Mixkit, Sea; исходный файл `1185-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/sea/
- `assets/audio/forest.mp3` — Mixkit, Forest; исходный файл `1210-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/forest/
- `assets/audio/fire.mp3` — Mixkit, Fire; исходный файл `1736-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/fire/
- `assets/audio/server-room.mp3` — Mixkit, Futuristic Sci Fi computer ambience; `2507-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/technology/
- `assets/audio/fan.mp3` — Mixkit, Stove extractor fan; `1813-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/appliances/
- `assets/audio/engine.mp3` — Mixkit, Low drone engine hum; `2745-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/engine/
- `assets/audio/hair-dryer.mp3` — Mixkit, Hairdryer hum; `1894-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/appliances/
- `assets/audio/heater.mp3` — Mixkit, Gas stove hum; `1831-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/appliances/
- `assets/audio/thunder.mp3` — Mixkit, Thunderstorm and rain loop; `2402-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/thunder/
- `assets/audio/river.mp3` — Mixkit, Water flowing ambience loop; `3126-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/nature/
- `assets/audio/birds.mp3` — Mixkit, Morning birds; `2472-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/birds/
- `assets/audio/night.mp3` — Mixkit, Night forest with insects; `2414-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/nature/
- `assets/audio/cafe.mp3` — Mixkit, Restaurant crowd talking ambience; `444-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/restaurant/
- `assets/audio/train.mp3` — Mixkit, Train waiting at station; `1634-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/train/
- `assets/audio/city.mp3` — Mixkit, Urban city ambience at night; `2678-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/city/
- `assets/audio/office.mp3` — Mixkit, Office ambience; `447-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/public-places/
- `assets/audio/clock.mp3` — Mixkit, Wall clock tick tock; `1060-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/clock/
- `assets/audio/airplane.mp3` — Mixkit, Airplane flying by rumble; `1588-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/airplane/
- `assets/audio/wind.mp3` — Mixkit, Wind blowing ambience; `2658-preview.mp3`, каталог: https://mixkit.co/free-sound-effects/nature/
- Условия использования: https://mixkit.co/license/

20 вариантов шума (включая белый, розовый, коричневый, голубой, фиолетовый и текстурные варианты) создаются локально Web Audio API и не используют внешние аудиофайлы.

## Требование перед публикацией

Каждый предустановленный фон, логотип или иллюстрация должен иметь автора, исходную ссылку, тип лицензии и дату проверки. Материал без подтверждённого права использования в релиз не включается.
