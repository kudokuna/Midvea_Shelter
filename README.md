# Midvea Shelter

<p align="center">
  <img src="brand-mark.svg" alt="Midvea Shelter logo" width="112">
</p>

<p align="center">
  A calm, local-first new tab for bookmarks, focus, notes, weather, and ambient sound.
</p>

<img width="3840" height="1822" alt="chrome_w7LSc5kts8" src="https://github.com/user-attachments/assets/9ff45cbb-d03f-4dcf-830f-8d7f2970dc45" />

Midvea Shelter is a customizable Chrome extension that turns every new tab into a personal workspace. It keeps your everyday tools in one place while storing settings and user-created content locally in Chrome.

## Features

- **Chrome bookmark workspace** — organize bookmarks into categories and folders, reorder them with drag and drop, and add custom tile images.
- **Flexible search** — switch between search engines, use search suggestions, or enter a URL directly.
- **Focus tools** — run configurable Pomodoro focus and break sessions with optional system notifications.
- **Weather** — view local conditions using a searched city or optional geolocation, powered by Open-Meteo.
- **Notes and quotes** — keep quick editable notes and browse quotes by category.
- **Ambient soundscape** — mix locally generated noise with bundled nature, room, city, and travel sounds.
- **Custom backgrounds** — choose online wallpapers, save favorites, rotate them daily, or upload your own images and videos.
- **Personalized layout** — show, hide, and reorder widgets; adjust the accent color; and choose bookmark tile sizes.
- **Backup and restore** — export settings, user data, and the Midvea bookmark tree to JSON, then restore them when needed.
- **Localization** — available in English, Ukrainian, and Russian.

## Install from source

Midvea Shelter currently requires no build step or third-party dependencies.

1. Clone the repository:

   ```bash
   git clone https://github.com/kudokuna/Midvea_Shelter.git
   ```

2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the cloned project directory.
6. Open a new tab.

To update a local installation, pull the latest changes and click **Reload** on the extension card.

## Development

The extension uses plain HTML, CSS, and JavaScript with Chrome Manifest V3. There is no package manager, transpilation step, or development server: edit the source files and reload the extension from `chrome://extensions`.

Key files:

| Path | Purpose |
| --- | --- |
| `manifest.json` | Extension metadata, permissions, and new-tab registration |
| `index.html` | Main interface and modal markup |
| `styles.css` | Layout, responsive behavior, and visual system |
| `app.js` | Core settings, search, bookmarks, and wallpaper behavior |
| `background.js` | Pomodoro alarms, notifications, and remote background requests |
| `weather.js` | Weather lookup and display |
| `pomodoro.js` | Focus timer UI and state |
| `notes.js` | Local notes widget |
| `soundscape.js` | Generated noise and ambient audio mixer |
| `backup.js` | JSON backup and restore |
| `_locales/` | English, Ukrainian, and Russian translations |

### Create a store package

On Windows PowerShell, run:

```powershell
./build-store-package.ps1
```

The script validates the distributable files and creates `dist/midvea-shelter-<version>.zip`.

## Permissions

Midvea requests only the browser capabilities needed by its features:

| Permission | Why it is needed |
| --- | --- |
| `storage` | Saves preferences, notes, widget state, and cached data locally |
| `unlimitedStorage` | Supports user-uploaded background images, videos, and custom icons |
| `geolocation` | Finds local weather after the user grants permission |
| `bookmarks` | Displays and manages the bookmark tree selected for Midvea |
| `alarms` | Keeps Pomodoro completion timing reliable when the new tab is closed |
| `notifications` | Optionally announces completed focus and break sessions |

Host permissions are used for explicit requests to Open-Meteo, Reddit, DuckDuckGo, Bing, and Google Suggestions.

## Privacy

Midvea Shelter is local-first and contains no hidden analytics. Settings and notes remain in Chrome storage on the user's device. External services receive only the information required for a feature the user chooses to use, such as a city search, search suggestion, or wallpaper request.

See the full [privacy policy](privacy.html) for details.

## Credits

Weather data is provided by [Open-Meteo](https://open-meteo.com/). Bundled ambient recordings are distributed under the Mixkit Free License; individual sources are listed in [ASSET_SOURCES.md](ASSET_SOURCES.md).

## Contributing

Issues and pull requests are welcome. When changing user-facing text, keep all three locale files in `_locales/` in sync. Before submitting a change, load the extension unpacked and verify the affected flows in a fresh new tab.

