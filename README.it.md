# Glass Clock Weather Card

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/docs/faq/custom_repositories)
[![GitHub release](https://img.shields.io/github/v/release/ironblaster/glass-clock-weather-card)](https://github.com/ironblaster/glass-clock-weather-card/releases)
[![Licenza: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Un orologio grande, da leggere al volo, per le dashboard di Home Assistant e i tablet a muro. Mostra il meteo con icone animate, la temperatura in casa, i prossimi giorni e gli eventi del calendario di oggi (perfetto per la raccolta differenziata), in stile vetro.

Si configura tutto dall'editor visuale: fonte del meteo, posto sulla mappa per le previsioni, colori, carattere, grandezza dei testi e azioni.

![Glass Clock Weather Card](https://raw.githubusercontent.com/ironblaster/glass-clock-weather-card/main/images/preview-light.png)

🇬🇧 [Read in English](README.md)

## Cosa fa

- **Orologio enorme** che occupa tutto lo spazio libero, con data, saluto e barra dei secondi. 24 o 12 ore, come nel tuo profilo.
- **Icone meteo animate disegnate a mano**: sole, nuvole, pioggia, temporale, neve, nevischio, grandine, nebbia, vento, notte serena.
- **Meteo da qualunque entità meteo**, oppure **da Met.no per qualsiasi posto scelto sulla mappa**, senza installare integrazioni.
- **Giorni mancanti completati** con Met.no: molte integrazioni si fermano a 5 giorni, la card ne mostra 7.
- **I tuoi sensori**: temperatura e umidità esterne possono sostituire quelle dell'entità meteo, e la temperatura in casa compare accanto a quella esterna.
- **Fino a 7 giorni di previsioni** con massima, minima e barra colorata. Si vedono solo i giorni che ci stanno.
- **Eventi del calendario di oggi e domani**, con nome, icona e colore per ogni tipo. Gli esempi della raccolta differenziata si aggiungono con un clic dall'editor.
- **Stile vetro**: scuro, chiaro o automatico, colori a scelta, bagliore, angoli, carattere Space Grotesk o quello del tema.
- **Grandezza dei testi** regolabile, per leggerla anche dall'altra parte della stanza.
- **Azioni standard** al tocco, tenendo premuto e al doppio tocco.
- **Va bene ovunque**: viste masonry, a pannello e a sezioni, dal telefono al tablet a muro. Funziona anche sui browser vecchi dei tablet Android.
- **Tradotta** in italiano, inglese, tedesco, francese, spagnolo e olandese. Le condizioni meteo usano le traduzioni di Home Assistant.

## Installazione

### HACS

1. In HACS apri il menu (⋮) → **Repository personalizzati**.
2. Aggiungi `https://github.com/ironblaster/glass-clock-weather-card` con tipo **Dashboard**.
3. Installa **Glass Clock Weather Card** e ricarica il browser.

### A mano

1. Scarica `glass-clock-weather-card.js` dall'[ultima versione](https://github.com/ironblaster/glass-clock-weather-card/releases) e copialo in `config/www/`.
2. In **Impostazioni → Plance → ⋮ → Risorse** aggiungi `/local/glass-clock-weather-card.js` come **modulo JavaScript**.
3. Ricarica il browser.

## Configurazione

Aggiungi la card dall'editor della dashboard (**Glass Clock Weather Card**) e impostala dall'editor visuale. Tutte le opzioni funzionano anche in YAML.

### Minima

```yaml
type: custom:glass-clock-weather-card
weather_entity: weather.casa
```

### Met.no per un posto a scelta

```yaml
type: custom:glass-clock-weather-card
weather_source: met_no
location:
  latitude: 41.9028
  longitude: 12.4964
location_name: Roma
```

### Tablet a muro

```yaml
type: custom:glass-clock-weather-card
weather_entity: weather.casa
complete_forecast: true
temperature_entity: sensor.temperatura_giardino
indoor_temperature_entity: sensor.temperatura_soggiorno
calendar_entity: calendar.raccolta_differenziata
calendar_types:
  - pattern: Carta|Cartone
    label: Carta
    icon: mdi:newspaper-variant-outline
    color: [96, 165, 250]
  - pattern: Plastica
    label: Plastica
    icon: mdi:bottle-soda-classic-outline
    color: [255, 198, 64]
text_scale: 1.2
min_height: 520
```

Tutte le opzioni, con valori e predefiniti, sono nella [tabella del README in inglese](README.md#options): i nomi delle opzioni sono gli stessi.

I colori si scrivono come `[r, g, b]`, `"#rrggbb"` oppure `"r, g, b"`. Nei `calendar_types` il `pattern` si cerca nel titolo dell'evento senza badare a maiuscole e minuscole; più alternative si separano con `|`, per esempio `Carta|Cartone`.

## Privacy

- **Met.no**: con `weather_source: met_no` o `complete_forecast: true` il browser chiede le previsioni ad `api.met.no` per il posto scelto, arrotondato a circa 1 km. Non viene inviato altro, e la risposta resta in memoria 30 minuti. I dati sono di MET Norway con licenza [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), per questo quando li usa la card mostra una piccola dicitura "MET Norway".
- **Carattere**: con `font: space_grotesk` (predefinito) il carattere arriva da Google Fonts. Con `font: theme` non viene scaricato niente.

## Consigli

- **Leggerla da lontano**: alza **Grandezza dei testi** (`text_scale`). L'orologio prende sempre tutto lo spazio libero.
- **Altezza**: nelle viste masonry e a pannello `min_height` è l'altezza minima e la card cresce se serve. Nella vista a sezioni segue la griglia.

## Licenza

[MIT](LICENSE) © 2026 ironblaster. Icone meteo disegnate per questa card. Dati meteo di [MET Norway](https://api.met.no/).
