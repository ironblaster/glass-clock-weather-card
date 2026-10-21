# Glass Clock Weather Card

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/docs/faq/custom_repositories)
[![GitHub release](https://img.shields.io/github/v/release/ironblaster/glass-clock-weather-card)](https://github.com/ironblaster/glass-clock-weather-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A big, glanceable clock for Home Assistant dashboards and wall tablets. It shows animated weather icons, the current conditions, the indoor temperature, the next days and today's calendar events (perfect for waste collection), in a liquid glass style.

Everything can be set from the visual editor: weather source, a place on the map for the forecast, colors, fonts, text size and actions.

![Glass Clock Weather Card](https://raw.githubusercontent.com/ironblaster/glass-clock-weather-card/main/images/preview.png)

| Light style (Italian) | Compact |
| --- | --- |
| ![Light style](https://raw.githubusercontent.com/ironblaster/glass-clock-weather-card/main/images/preview-light.png) | ![Compact](https://raw.githubusercontent.com/ironblaster/glass-clock-weather-card/main/images/preview-compact.png) |

🇮🇹 [Leggi in italiano](README.it.md)

## Features

- **A huge clock** that fills the free space, with date, greeting and a seconds bar. 24 or 12 hours, following your profile.
- **Hand-drawn animated weather icons**: sun, clouds, rain, storm, snow, sleet, hail, fog, wind, clear night.
- **Weather from any weather entity**, or **from Met.no for any place you pick on a map**, without installing any integration.
- **Complete missing days** with Met.no: many integrations stop at 5 days, the card can show 7.
- **Your own sensors**: outdoor temperature and humidity sensors can replace the values of the weather entity, and the indoor temperature is shown next to the outdoor one.
- **Up to 7 forecast days** with high, low and a colored temperature bar. Only the days that fit are shown.
- **Calendar chips for today and tomorrow**, with label, icon and color for each type of event. Ready-made waste collection examples are one click away in the editor.
- **Liquid glass look**: dark, light or automatic style, custom colors, glow, corner radius, Space Grotesk or your theme font.
- **Text size** for reading the card from across the room.
- **Standard actions** on tap, hold and double tap.
- **Fits everywhere**: masonry, panel and sections views, from a phone to a wall tablet. It also runs on old Android WebViews often found on wall tablets.
- **Translated** in English, Italian, German, French, Spanish and Dutch. Weather conditions use Home Assistant's own translations, so they follow your language.

## Installation

### HACS

1. In HACS open the menu (⋮) → **Custom repositories**.
2. Add `https://github.com/ironblaster/glass-clock-weather-card` with type **Dashboard**.
3. Install **Glass Clock Weather Card** and reload the browser.

### Manual

1. Download `glass-clock-weather-card.js` from the [latest release](https://github.com/ironblaster/glass-clock-weather-card/releases) and copy it to `config/www/`.
2. In **Settings → Dashboards → ⋮ → Resources** add `/local/glass-clock-weather-card.js?v=1.0.1` as a **JavaScript module**.
3. Reload the browser.

Home Assistant lets browsers cache files in `/local` for a long time: when you update the file by hand, change the `?v=` number too. HACS does this for you.

## Configuration

Add the card from the dashboard editor (**Glass Clock Weather Card**) and set it up with the visual editor. Every option also works in YAML.

### Minimal

```yaml
type: custom:glass-clock-weather-card
weather_entity: weather.home
```

### Met.no for a place of your choice

```yaml
type: custom:glass-clock-weather-card
weather_source: met_no
location:
  latitude: 41.9028
  longitude: 12.4964
location_name: Rome
```

### Wall tablet

```yaml
type: custom:glass-clock-weather-card
weather_entity: weather.home
complete_forecast: true
temperature_entity: sensor.garden_temperature
indoor_temperature_entity: sensor.living_room_temperature
calendar_entity: calendar.waste_collection
calendar_types:
  - pattern: Paper|Cardboard
    label: Paper
    icon: mdi:newspaper-variant-outline
    color: [96, 165, 250]
  - pattern: Plastic
    label: Plastic
    icon: mdi:bottle-soda-classic-outline
    color: [255, 198, 64]
text_scale: 1.2
min_height: 520
tap_action:
  action: navigate
  navigation_path: /dashboard-weather/forecast
```

### Options

| Option | Values | Default | Description |
| --- | --- | --- | --- |
| `weather_source` | `entity`, `met_no`, `none` | `entity` when `weather_entity` is set, otherwise `met_no` | Where the weather comes from. |
| `weather_entity` | entity | | A `weather.*` entity. |
| `location` | `latitude`, `longitude` | your home | Place used by Met.no. In the editor you pick it on a map. |
| `location_name` | text | | Shown before the condition, e.g. `Rome · Rain`. |
| `complete_forecast` | boolean | `false` | With a weather entity: fill the missing days with Met.no. |
| `temperature_entity` | entity | | Outdoor temperature sensor, replaces the temperature of the weather. |
| `humidity_entity` | entity | | Outdoor humidity sensor. |
| `indoor_temperature_entity` | entity | | Indoor temperature, shown next to the outdoor one. |
| `indoor_label` | text | `Indoor`, translated | Caption under the indoor temperature. |
| `show_details` | boolean | `true` | Today's high and low, humidity and wind. |
| `temperature_decimals` | `0`–`2` | `1` | Decimals of the big temperatures. |
| `show_forecast` | boolean | `true` | Show the next days. |
| `forecast_days` | `1`–`7` | `7` | Maximum number of days. Only the days that fit are shown. |
| `time_format` | `auto`, `24`, `12` | `auto` | `auto` follows your Home Assistant profile. |
| `show_greeting` | boolean | `true` | Good morning, good evening… |
| `show_date` | boolean | `true` | |
| `show_seconds_bar` | boolean | `true` | A thin bar that fills up every minute. |
| `clock_max_size` | pixels | `320` | Upper limit for the clock size. |
| `calendar_entity` | entity | | A `calendar.*` entity: its events of today and tomorrow become chips. |
| `calendar_show_tomorrow` | boolean | `true` | |
| `calendar_max_chips` | `1`–`12` | `4` | |
| `calendar_types` | list | | Each item has `pattern`, `label`, `icon` and `color`. |
| `calendar_default_icon` | icon | `mdi:calendar-star` | Icon for events without a type. |
| `calendar_default_color` | color | grey | Color for events without a type. |
| `appearance` | `auto`, `dark`, `light` | `auto` | `auto` follows the dark mode of your theme. |
| `font` | `space_grotesk`, `theme`, `custom` | `space_grotesk` | |
| `font_family` | text | | Font name, used with `font: custom`. |
| `text_scale` | `0.6`–`1.8` | `1` | Makes every text bigger or smaller. |
| `min_height` | pixels | `420` | Minimum height. In a sections view the grid sets the height instead. |
| `glass` | boolean | `true` | Glass background with blur. Off: the normal card background of your theme. |
| `glow` | `0`–`1` | `0.5` | Glow of the clock and of the seconds bar. |
| `border_radius` | pixels | `32` | |
| `accent_color` | color | cyan | Clock gradient, glow and seconds bar. |
| `secondary_color` | color | violet | End of the seconds bar. |
| `time_color` | color | white (dark), ink (light) | Top of the clock gradient. |
| `indoor_color` | color | amber | Indoor icon. |
| `text_color` | color | | |
| `background_color` | color | | A tint over the glass. |
| `background_opacity` | `0`–`1` | `0.18` | Strength of the tint. |
| `tap_action` | action | more info of the weather entity | Any standard Home Assistant action. |
| `hold_action` | action | none | |
| `double_tap_action` | action | none | |

Colors can be written as `[r, g, b]`, `"#rrggbb"` or `"r, g, b"`.

In `calendar_types` the `pattern` is searched in the event title without caring about upper or lower case. Separate alternatives with `|`, for example `Paper|Cardboard`.

## Privacy

- **Met.no**: with `weather_source: met_no` or `complete_forecast: true`, your browser asks `api.met.no` for the forecast of the chosen place, rounded to about 1 km. Nothing else is sent. The answer is kept for 30 minutes. The data comes from MET Norway under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license, so the card shows a small "MET Norway" credit when it uses it.
- **Font**: with `font: space_grotesk` (the default) the font is loaded from Google Fonts. Choose `font: theme` to avoid that.

## Tips

- **Reading from a distance**: raise **Text size** (`text_scale`). The clock always takes all the free space.
- **Wall tablets with an old browser**: the card is written to work on old Android WebViews too.
- **Height**: in masonry and panel views `min_height` is the minimum height and the card grows when needed. In a sections view the card follows the size of the grid.

## Development

The card is a single JavaScript file with no build step and no dependencies. To try it without Home Assistant, serve the repository folder and open the demo:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/demo/index.html`. Useful parameters: `w=860,380` (card widths), `lang=it`, `theme=light`, `time=10:24` (fixed time for screenshots), `config={"weather_source":"met_no"}`.

## License

[MIT](LICENSE) © 2026 ironblaster. Weather icons drawn for this card. Weather data from [MET Norway](https://api.met.no/).
