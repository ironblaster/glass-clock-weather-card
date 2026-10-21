/*!
 * Glass Clock Weather Card for Home Assistant
 * A big, glanceable clock with animated weather icons, daily forecast,
 * indoor temperature and calendar chips, in a liquid glass style.
 *
 * https://github.com/ironblaster/glass-clock-weather-card
 * Released under the MIT License.
 */
(function () {
  'use strict';

  var CARD = 'glass-clock-weather-card';
  var EDITOR = CARD + '-editor';
  var VERSION = '1.0.1';
  var REPO = 'https://github.com/ironblaster/glass-clock-weather-card';
  if (customElements.get(CARD)) return;

  /* ================================================================ helpers */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function st(hass, id) { return hass && hass.states && id ? hass.states[id] : undefined; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dayKey(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function fire(node, type, detail) {
    node.dispatchEvent(new CustomEvent(type, { detail: detail, bubbles: true, composed: true }));
  }
  function langOf(hass) {
    return String((hass && ((hass.locale && hass.locale.language) || hass.language)) || navigator.language || 'en');
  }
  function baseLang(l) { return String(l || 'en').toLowerCase().split(/[-_]/)[0]; }
  function fmt(v, d, l) {
    if (v == null || isNaN(v)) return '—';
    try { return Number(v).toLocaleString(l, { minimumFractionDigits: d, maximumFractionDigits: d }); } catch (e) { return Number(v).toFixed(d); }
  }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // colors can be [r,g,b], "#rrggbb", "#rgb", "r,g,b" or "rgb(r,g,b)"; returns "r,g,b"
  function rgb(v, fb) {
    if (Array.isArray(v) && v.length >= 3) {
      return v.slice(0, 3).map(function (x) { return clamp(Math.round(+x || 0), 0, 255); }).join(',');
    }
    if (typeof v === 'string') {
      var s = v.trim(), m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
      if (m) {
        var h = m[1].length === 3 ? m[1].replace(/(.)/g, '$1$1') : m[1];
        return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }).join(',');
      }
      m = /^(?:rgba?\()?\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i.exec(s);
      if (m) return [m[1], m[2], m[3]].map(function (x) { return clamp(+x, 0, 255); }).join(',');
    }
    return fb;
  }
  function rgbArr(s) { return String(s).split(',').map(Number); }
  function mix(a, b, t) {
    var x = rgbArr(a), y = rgbArr(b);
    return [0, 1, 2].map(function (i) { return Math.round(x[i] * t + y[i] * (1 - t)); }).join(',');
  }
  function toC(t, unit) { return t == null ? null : /F/i.test(unit || '') ? (t - 32) * 5 / 9 : t; }

  /* ================================================================ translations */

  var T = {
    en: {
      night: 'Good night', morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', noon: 12,
      indoor: 'Indoor', today: 'Today', tomorrow: 'Tomorrow', loading: 'Loading forecast…', nofc: 'Forecast not available',
      cond: {
        'clear-night': 'Clear night', cloudy: 'Cloudy', exceptional: 'Exceptional', fog: 'Fog', hail: 'Hail', lightning: 'Lightning',
        'lightning-rainy': 'Thunderstorm', partlycloudy: 'Partly cloudy', pouring: 'Heavy rain', rainy: 'Rain', snowy: 'Snow',
        'snowy-rainy': 'Sleet', sunny: 'Sunny', windy: 'Windy', 'windy-variant': 'Windy and cloudy'
      }
    },
    it: {
      night: 'Buonanotte', morning: 'Buongiorno', afternoon: 'Buon pomeriggio', evening: 'Buonasera', noon: 13,
      indoor: 'In casa', today: 'Oggi', tomorrow: 'Domani', loading: 'Carico le previsioni…', nofc: 'Previsioni non disponibili',
      cond: {
        'clear-night': 'Sereno', cloudy: 'Nuvoloso', exceptional: 'Eccezionale', fog: 'Nebbia', hail: 'Grandine', lightning: 'Fulmini',
        'lightning-rainy': 'Temporale', partlycloudy: 'Parzialmente nuvoloso', pouring: 'Pioggia intensa', rainy: 'Pioggia', snowy: 'Neve',
        'snowy-rainy': 'Pioggia e neve', sunny: 'Soleggiato', windy: 'Ventoso', 'windy-variant': 'Ventoso e nuvoloso'
      }
    },
    de: { night: 'Gute Nacht', morning: 'Guten Morgen', afternoon: 'Guten Tag', evening: 'Guten Abend', indoor: 'Innen', today: 'Heute', tomorrow: 'Morgen', loading: 'Vorhersage wird geladen…', nofc: 'Keine Vorhersage verfügbar' },
    fr: { night: 'Bonne nuit', morning: 'Bonjour', afternoon: 'Bon après-midi', evening: 'Bonsoir', indoor: 'Intérieur', today: "Aujourd'hui", tomorrow: 'Demain', loading: 'Chargement des prévisions…', nofc: 'Prévisions indisponibles' },
    es: { night: 'Buenas noches', morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas tardes', indoor: 'Interior', today: 'Hoy', tomorrow: 'Mañana', loading: 'Cargando la previsión…', nofc: 'Previsión no disponible' },
    nl: { night: 'Goedenacht', morning: 'Goedemorgen', afternoon: 'Goedemiddag', evening: 'Goedenavond', indoor: 'Binnen', today: 'Vandaag', tomorrow: 'Morgen', loading: 'Verwachting laden…', nofc: 'Geen verwachting beschikbaar' }
  };
  function tr(l, k) { var t = T[baseLang(l)] || T.en; return t[k] != null ? t[k] : T.en[k]; }
  function condLabel(hass, cond) {
    var key = 'component.weather.entity_component._.state.' + cond;
    var s = hass && hass.localize ? hass.localize(key) : '';
    if (s && s !== key) return s;
    var t = T[baseLang(langOf(hass))];
    return (t && t.cond && t.cond[cond]) || T.en.cond[cond] || String(cond || '').replace(/-/g, ' ');
  }

  /* ================================================================ animated weather icons (hand drawn SVG) */

  var WDEFS = '<defs>' +
    '<radialGradient id="gcwSun" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#fff7c9"/><stop offset=".55" stop-color="#ffc94d"/><stop offset="1" stop-color="#ff9431"/></radialGradient>' +
    '<linearGradient id="gcwCloud" gradientUnits="userSpaceOnUse" x1="0" y1="17" x2="0" y2="50"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#bfcde6"/></linearGradient>' +
    '<linearGradient id="gcwCloudD" gradientUnits="userSpaceOnUse" x1="0" y1="17" x2="0" y2="50"><stop offset="0" stop-color="#d9e0ec"/><stop offset="1" stop-color="#7b88a3"/></linearGradient>' +
    '<linearGradient id="gcwMoon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b3c3ff"/></linearGradient>' +
    '<mask id="gcwMoonMask"><rect width="64" height="64" fill="#fff"/><circle cx="41" cy="22" r="13" fill="#000"/></mask>' +
    '<filter id="gcwSh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="2.5" stdDeviation="2" flood-color="#000" flood-opacity=".35"/></filter>' +
    '<filter id="gcwGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '</defs>';

  var WCSS = '.wi{display:block;width:100%;height:100%;overflow:visible}' +
    '.wi .rays{transform-box:fill-box;transform-origin:center;animation:wspin 24s linear infinite}' +
    '.wi .cl{animation:wdrift 6s ease-in-out infinite alternate}' +
    '.wi .cl2{animation:wdrift 8s ease-in-out infinite alternate-reverse}' +
    '.wi .drop{animation:wrain 1.15s linear infinite}' +
    '.wi .flake{animation:wsnow 3.2s linear infinite}' +
    '.wi .bolt{animation:wflash 3.4s ease-in-out infinite}' +
    '.wi .fog{animation:wfog 5s ease-in-out infinite alternate}' +
    '.wi .wind{stroke-dasharray:44 18;animation:wwind 2.4s linear infinite}' +
    '.wi .star{transform-box:fill-box;transform-origin:center;animation:wtwinkle 2.6s ease-in-out infinite}' +
    '.wi .moon{animation:wfloat 6s ease-in-out infinite alternate}' +
    '@keyframes wspin{to{transform:rotate(360deg)}}' +
    '@keyframes wdrift{from{transform:translateX(-2.5px)}to{transform:translateX(2.5px)}}' +
    '@keyframes wrain{0%{transform:translateY(-5px);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateY(9px);opacity:0}}' +
    '@keyframes wsnow{0%{transform:translate(0,-5px);opacity:0}20%{opacity:1}50%{transform:translate(2px,3px)}100%{transform:translate(-1px,11px);opacity:0}}' +
    '@keyframes wflash{0%,60%,100%{opacity:.45}64%,72%{opacity:1}68%{opacity:.55}}' +
    '@keyframes wfog{from{transform:translateX(-4px)}to{transform:translateX(4px)}}' +
    '@keyframes wwind{to{stroke-dashoffset:-62}}' +
    '@keyframes wtwinkle{0%,100%{opacity:.25;transform:scale(.6)}50%{opacity:1;transform:scale(1)}}' +
    '@keyframes wfloat{from{transform:translateY(-1.5px)}to{transform:translateY(1.5px)}}' +
    '@media (prefers-reduced-motion:reduce){.wi *{animation:none!important}}';

  function wSun(cx, cy, r) {
    var s = '<g filter="url(#gcwGlow)"><g class="rays" stroke="#ffc65c" stroke-width="' + (r / 4.2).toFixed(1) + '" stroke-linecap="round">';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4, r1 = r * 1.45, r2 = r * 1.85;
      s += '<line x1="' + (cx + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (cy + r1 * Math.sin(a)).toFixed(1) +
        '" x2="' + (cx + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (cy + r2 * Math.sin(a)).toFixed(1) + '"/>';
    }
    return s + '</g><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#gcwSun)"/></g>';
  }
  function wMoon(stars) {
    var s = '<g class="moon"><circle cx="30" cy="32" r="16" fill="url(#gcwMoon)" mask="url(#gcwMoonMask)" filter="url(#gcwGlow)"/></g>';
    if (stars) {
      [[50, 14, 0], [55, 32, -0.9], [44, 50, -1.7]].forEach(function (p) {
        s += '<path class="star" style="animation-delay:' + p[2] + 's" fill="#ffffff" d="M' + p[0] + ' ' + (p[1] - 3.5) +
          ' l1.1 2.4 2.4 1.1 -2.4 1.1 -1.1 2.4 -1.1 -2.4 -2.4 -1.1 2.4 -1.1z"/>';
      });
    }
    return s;
  }
  function wCloud(dark, tx, ty, sc, cls) {
    return '<g class="' + (cls || 'cl') + '"><g transform="translate(' + tx + ' ' + ty + ') scale(' + sc + ')" filter="url(#gcwSh)">' +
      '<g fill="url(#' + (dark ? 'gcwCloudD' : 'gcwCloud') + ')"><circle cx="23" cy="36" r="10"/><circle cx="35" cy="29.5" r="13"/>' +
      '<circle cx="46" cy="38" r="8"/><rect x="13" y="36" width="41" height="12" rx="6"/></g></g></g>';
  }
  function wDrops(n, color, fast) {
    var xs = [24, 33, 42, 28.5, 37.5], s = '';
    for (var i = 0; i < n; i++) {
      s += '<line class="drop" x1="' + xs[i] + '" y1="49" x2="' + (xs[i] - 2) + '" y2="55" stroke="' + (color || '#6cc4ff') +
        '" stroke-width="2.6" stroke-linecap="round" style="animation-delay:' + (-i * (fast ? 0.17 : 0.33)).toFixed(2) + 's;animation-duration:' + (fast ? 0.7 : 1.15) + 's"/>';
    }
    return s;
  }
  function wFlakes(n) {
    var xs = [24, 33, 42, 29, 38], s = '';
    for (var i = 0; i < n; i++) s += '<circle class="flake" cx="' + xs[i] + '" cy="51" r="2.1" fill="#eef6ff" style="animation-delay:' + (-i * 0.8).toFixed(1) + 's"/>';
    return s;
  }
  function wHail(n) {
    var xs = [24, 33, 42, 28.5, 37.5], s = '';
    for (var i = 0; i < n; i++) s += '<circle class="drop" cx="' + xs[i] + '" cy="51" r="1.9" fill="#dce8ff" style="animation-delay:' + (-i * 0.2).toFixed(1) + 's;animation-duration:.8s"/>';
    return s;
  }
  function wBolt() { return '<polygon class="bolt" points="35,39 27,52 33,52 29,62 42,47 36,47 40,39" fill="#ffd34d" filter="url(#gcwGlow)"/>'; }
  function wFog() {
    var s = '';
    [[44, 0], [50.5, -1.6], [57, -3.1]].forEach(function (p, i) {
      s += '<line class="fog" x1="' + (14 + i * 3) + '" y1="' + p[0] + '" x2="' + (50 - i * 2) + '" y2="' + p[0] +
        '" stroke="#cfd9ea" stroke-width="3.4" stroke-linecap="round" opacity=".85" style="animation-delay:' + p[1] + 's"/>';
    });
    return s;
  }
  function wWind(low) {
    var y = low ? 14 : 0;
    return '<g fill="none" stroke="#cfe6ff" stroke-width="3" stroke-linecap="round">' +
      '<path class="wind" d="M8 ' + (24 + y) + ' H38 a6 6 0 1 0 -6 -6"/>' +
      '<path class="wind" style="animation-delay:-.8s" d="M8 ' + (34 + y) + ' H48 a6 6 0 1 1 -6 6"/>' +
      '<path class="wind" style="animation-delay:-1.6s" d="M8 ' + (44 + y) + ' H30"/></g>';
  }
  function weatherSvg(cond, night) {
    var b;
    switch (cond) {
      case 'sunny': b = night ? wMoon(true) : wSun(32, 32, 12); break;
      case 'clear-night': b = wMoon(true); break;
      case 'partlycloudy':
        b = (night ? '<g transform="translate(-7 -8) scale(.82)">' + wMoon(false) + '</g>' : wSun(23, 23, 9)) + wCloud(false, 9, 7, 0.82); break;
      case 'cloudy': b = wCloud(false, -7, -3, 0.78, 'cl2') + wCloud(false, 6, 7, 0.88); break;
      case 'rainy': b = wCloud(true, 0, -4, 1) + wDrops(3); break;
      case 'pouring': b = wCloud(true, 0, -5, 1) + wDrops(5, '#4aa8ff', true); break;
      case 'lightning': b = wCloud(true, 0, -6, 1) + wBolt(); break;
      case 'lightning-rainy': b = wCloud(true, 0, -6, 1) + wDrops(2) + wBolt(); break;
      case 'snowy': b = wCloud(false, 0, -5, 1) + wFlakes(4); break;
      case 'snowy-rainy': b = wCloud(false, 0, -5, 1) + wDrops(2) + wFlakes(2); break;
      case 'hail': b = wCloud(true, 0, -5, 1) + wHail(5); break;
      case 'fog': b = wCloud(false, 2, -10, 0.85) + wFog(); break;
      case 'windy': b = wWind(false); break;
      case 'windy-variant': b = wCloud(false, 5, -9, 0.8) + wWind(true); break;
      case 'exceptional':
        b = '<path d="M32 9 L57 53 H7 Z" fill="none" stroke="#ffc65c" stroke-width="4" stroke-linejoin="round" filter="url(#gcwGlow)"/>' +
          '<line x1="32" y1="25" x2="32" y2="38" stroke="#ffc65c" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="46" r="2.8" fill="#ffc65c"/>'; break;
      default: b = wCloud(false, 0, 0, 1);
    }
    return '<svg class="wi" viewBox="0 0 64 64" aria-hidden="true">' + WDEFS + b + '</svg>';
  }
  // temperature color, cold -> hot (input in °C)
  function tColor(t) {
    var s = [[-5, [106, 168, 255]], [5, [95, 205, 255]], [12, [95, 243, 255]], [18, [92, 242, 166]], [24, [255, 198, 92]], [30, [255, 154, 82]], [36, [255, 107, 125]]];
    if (t == null || t <= s[0][0]) return s[0][1].join(',');
    for (var i = 1; i < s.length; i++) {
      if (t <= s[i][0]) {
        var a = s[i - 1], b = s[i], f = (t - a[0]) / (b[0] - a[0]);
        return [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * f); }).join(',');
      }
    }
    return s[s.length - 1][1].join(',');
  }

  /* ================================================================ data sources */

  // Home Assistant forecast: daily if supported, otherwise twice daily or hourly grouped by day
  function forecastType(s) {
    var f = (s && s.attributes && s.attributes.supported_features) || 0;
    if (f & 1) return 'daily';
    if (f & 4) return 'twice_daily';
    if (f & 2) return 'hourly';
    return 'daily';
  }
  function groupDaily(list, type) {
    if (type === 'daily') return list || [];
    var days = {}, order = [];
    (list || []).forEach(function (f) {
      var d = new Date(f.datetime), k = dayKey(d);
      if (!days[k]) { days[k] = { datetime: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).toISOString(), hi: null, lo: null, cond: null, dist: 99 }; order.push(k); }
      var o = days[k], t = num(f.temperature), tl = num(f.templow);
      if (t != null) { o.hi = o.hi == null ? t : Math.max(o.hi, t); o.lo = o.lo == null ? t : Math.min(o.lo, t); }
      if (tl != null) o.lo = o.lo == null ? tl : Math.min(o.lo, tl);
      var dist = Math.abs(d.getHours() - 13) + (f.is_daytime === false ? 12 : 0);
      if (f.condition && dist < o.dist) { o.cond = f.condition; o.dist = dist; }
    });
    return order.map(function (k) {
      var o = days[k];
      return o.hi == null ? null : { datetime: o.datetime, condition: o.cond || 'cloudy', temperature: o.hi, templow: o.lo };
    }).filter(Boolean);
  }
  function subscribeForecast(hass, entity, type, cb) {
    if (!hass || !hass.connection || !hass.connection.subscribeMessage || !entity) return null;
    try {
      var p = hass.connection.subscribeMessage(function (ev) { cb((ev && ev.forecast) || []); },
        { type: 'weather/subscribe_forecast', entity_id: entity, forecast_type: type });
      if (p && p.catch) p.catch(function (e) { console.warn(CARD + ': forecast subscription failed', e); });
      return p;
    } catch (e) { return null; }
  }
  function unsubscribe(p) {
    if (p && p.then) p.then(function (u) { try { if (u) u(); } catch (e) { /* ignore */ } }).catch(function () { /* ignore */ });
  }

  // Met.no Locationforecast 2.0 (CC BY 4.0, MET Norway), cached 30 minutes per rounded location
  var MET = {};
  function metCond(s) {
    if (!s) return 'cloudy';
    var b = s.replace(/_(day|night|polartwilight)$/, '');
    if (/thunder/.test(b)) return 'lightning-rainy';
    if (b === 'clearsky') return /night/.test(s) ? 'clear-night' : 'sunny';
    if (b === 'fair' || b === 'partlycloudy') return 'partlycloudy';
    if (b === 'cloudy') return 'cloudy';
    if (b === 'fog') return 'fog';
    if (/sleet/.test(b)) return 'snowy-rainy';
    if (/snow/.test(b)) return 'snowy';
    if (/heavyrain/.test(b)) return 'pouring';
    if (/rain/.test(b)) return 'rainy';
    return 'cloudy';
  }
  function metParse(j) {
    var ts = (j && j.properties && j.properties.timeseries) || [];
    if (!ts.length) return null;
    var now = Date.now(), cur = ts[0], days = {}, order = [];
    for (var i = 0; i < ts.length; i++) { if (new Date(ts[i].time).getTime() <= now) cur = ts[i]; else break; }
    ts.forEach(function (e) {
      var d = new Date(e.time), k = dayKey(d), det = (e.data && e.data.instant && e.data.instant.details) || {};
      if (!days[k]) { days[k] = { date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12), t: [], sym: null, dist: 99 }; order.push(k); }
      var o = days[k], n1 = e.data.next_1_hours, n6 = e.data.next_6_hours, n12 = e.data.next_12_hours;
      if (det.air_temperature != null) o.t.push(det.air_temperature);
      var sym = (n6 && n6.summary && n6.summary.symbol_code) || (n1 && n1.summary && n1.summary.symbol_code) || (n12 && n12.summary && n12.summary.symbol_code);
      var dist = Math.abs(d.getHours() - 12);
      if (sym && dist < o.dist) { o.sym = sym; o.dist = dist; }
    });
    var det = (cur.data && cur.data.instant && cur.data.instant.details) || {};
    var c1 = cur.data.next_1_hours, c6 = cur.data.next_6_hours;
    var sym = (c1 && c1.summary && c1.summary.symbol_code) || (c6 && c6.summary && c6.summary.symbol_code) || '';
    return {
      now: { condition: metCond(sym), night: /_night$/.test(sym), temperature: num(det.air_temperature), humidity: num(det.relative_humidity), wind: num(det.wind_speed) },
      daily: order.map(function (k) {
        var o = days[k]; if (!o.t.length) return null;
        return { datetime: o.date.toISOString(), condition: metCond(o.sym), temperature: Math.max.apply(null, o.t), templow: Math.min.apply(null, o.t) };
      }).filter(Boolean)
    };
  }
  function metFetch(lat, lon) {
    if (lat == null || lon == null || !window.fetch) return Promise.resolve(null);
    // about 1 km precision: enough for a forecast, kinder to privacy and to the Met.no cache
    lat = Math.round(lat * 100) / 100; lon = Math.round(lon * 100) / 100;
    var k = lat + ',' + lon, c = MET[k] || (MET[k] = { t: 0, p: null, data: null });
    if (c.data && Date.now() - c.t < 30 * 60 * 1000) return Promise.resolve(c.data);
    if (c.p) return c.p;
    c.p = fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + lat + '&lon=' + lon)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { c.p = null; var d = metParse(j); if (d) { c.data = d; c.t = Date.now(); } return c.data; })
      .catch(function () { c.p = null; return c.data; });
    return c.p;
  }
  function mergeDaily(primary, extra) {
    var seen = {}, out = (primary || []).slice();
    out.forEach(function (f) { seen[dayKey(new Date(f.datetime))] = 1; });
    (extra || []).forEach(function (f) { var k = dayKey(new Date(f.datetime)); if (!seen[k]) { seen[k] = 1; out.push(f); } });
    out.sort(function (a, b) { return new Date(a.datetime) - new Date(b.datetime); });
    return out;
  }
  function futureDays(list) {
    var now = new Date(), tk = dayKey(now);
    return (list || []).filter(function (f) { var d = new Date(f.datetime); return dayKey(d) !== tk && d > now; });
  }
  function todayOf(list) {
    var k = dayKey(new Date());
    return (list || []).filter(function (f) { return dayKey(new Date(f.datetime)) === k; })[0];
  }

  // calendar events of today and tomorrow, cached 15 minutes per calendar
  var CAL = {};
  function calFetch(hass, id) {
    var c = CAL[id], today = dayKey(new Date());
    if (c && c.ev && c.day === today && Date.now() - c.t < 15 * 60 * 1000) return Promise.resolve(c.ev);
    if (c && c.p) return c.p;
    if (!hass || !hass.callApi) return Promise.resolve([]);
    var s = new Date(); s.setHours(0, 0, 0, 0);
    var e = new Date(s.getTime() + 2 * 86400000);
    var p = hass.callApi('GET', 'calendars/' + id + '?start=' + encodeURIComponent(s.toISOString()) + '&end=' + encodeURIComponent(e.toISOString()))
      .then(function (ev) { CAL[id] = { t: Date.now(), day: today, ev: ev || [] }; return ev || []; })
      .catch(function () { CAL[id] = { t: Date.now(), day: today, ev: [] }; return []; });
    CAL[id] = { t: c ? c.t : 0, day: c ? c.day : null, ev: c ? c.ev : null, p: p };
    return p;
  }
  function evDate(x) {
    if (!x) return null;
    var d = typeof x === 'string' ? new Date(/^\d{4}-\d\d-\d\d$/.test(x) ? x + 'T00:00:00' : x)
      : x.date ? new Date(x.date + 'T00:00:00') : new Date(x.dateTime || x);
    return isNaN(d) ? null : d;
  }
  function calItems(events, c, l) {
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var t1 = new Date(t0.getTime() + 86400000), t2 = new Date(t0.getTime() + 2 * 86400000), out = [];
    var types = Array.isArray(c.calendar_types) ? c.calendar_types : [];
    (events || []).forEach(function (ev) {
      var s = evDate(ev.start), e = evDate(ev.end) || (s && new Date(s.getTime() + 1));
      if (!s) return;
      var when = s < t1 && e > t0 ? 'today' : s < t2 && e > t1 ? 'tomorrow' : null;
      if (!when || (when === 'tomorrow' && c.calendar_show_tomorrow === false)) return;
      var sum = String(ev.summary || ''), low = sum.toLowerCase(), hit = null;
      types.forEach(function (t) {
        if (hit || !t) return;
        String(t.pattern || t.label || '').split('|').forEach(function (p) {
          p = p.trim().toLowerCase();
          if (!hit && p && low.indexOf(p) >= 0) hit = t;
        });
      });
      var timed = ev.start && (ev.start.dateTime || (typeof ev.start === 'string' && ev.start.length > 10));
      var time = timed && when === 'today' && s >= t0 ? s.toLocaleTimeString(l, { hour: '2-digit', minute: '2-digit' }) + ' ' : '';
      out.push({
        when: when, label: time + ((hit && hit.label) || sum), icon: (hit && hit.icon) || c.calendar_default_icon || 'mdi:calendar-star',
        color: rgb(hit && hit.color, rgb(c.calendar_default_color, '170,182,200')), sort: (when === 'today' ? 0 : 1e13) + s.getTime()
      });
    });
    return out.sort(function (a, b) { return a.sort - b.sort; }).slice(0, clamp(parseInt(c.calendar_max_chips, 10) || 4, 1, 12));
  }

  /* ================================================================ card */

  var DEF = {
    weather_source: null, weather_entity: null, location: null, location_name: '',
    temperature_entity: null, humidity_entity: null, indoor_temperature_entity: null, indoor_label: '',
    show_details: true, temperature_decimals: 1, show_forecast: true, forecast_days: 7, complete_forecast: false,
    time_format: 'auto', show_greeting: true, show_date: true, show_seconds_bar: true, clock_max_size: 320,
    calendar_entity: null, calendar_show_tomorrow: true, calendar_max_chips: 4, calendar_default_icon: 'mdi:calendar-star',
    calendar_default_color: null, calendar_types: [],
    appearance: 'auto', font: 'space_grotesk', font_family: '', text_scale: 1, min_height: 420,
    accent_color: null, secondary_color: null, time_color: null, indoor_color: null, text_color: null,
    glass: true, background_color: null, background_opacity: 0.18, glow: 0.5, border_radius: 32,
    tap_action: null, hold_action: null, double_tap_action: null
  };
  var PALETTE = {
    dark: { accent_color: [95, 243, 255], secondary_color: [185, 139, 255], time_color: [255, 255, 255], indoor_color: [255, 198, 92], text_color: [238, 244, 255] },
    light: { accent_color: [0, 150, 190], secondary_color: [124, 82, 224], time_color: [22, 32, 48], indoor_color: [214, 138, 18], text_color: [28, 36, 51] }
  };
  var FONT_URL = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap';
  function loadFont() {
    if (document.querySelector('link[data-gcw-font]') || document.querySelector('link[href*="family=Space+Grotesk"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = FONT_URL; l.setAttribute('data-gcw-font', '');
    document.head.appendChild(l);
  }
  function homeLocation(hass) {
    var c = hass && hass.config;
    return c && c.latitude != null ? { latitude: c.latitude, longitude: c.longitude } : null;
  }

  var CSS =
    ':host{display:block;height:100%}' +
    '*{box-sizing:border-box}' +
    'ha-card.gc{position:relative;height:100%;min-height:var(--gcw-minh);display:flex;flex-direction:column;overflow:hidden;isolation:isolate;' +
    '  padding:calc(22px * var(--s)) calc(28px * var(--s)) calc(16px * var(--s));border-radius:var(--gcw-radius);color:rgb(var(--gcw-text));' +
    '  font-family:var(--gcw-font);-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;transition:transform .15s;outline:none}' +
    'ha-card.gc.act{cursor:pointer}' +
    'ha-card.gc.pressed{transform:scale(.99)}' +
    'ha-card.gc.glass{background:linear-gradient(155deg,rgba(255,255,255,.13) 0%,rgba(255,255,255,.05) 34%,rgba(255,255,255,.02) 60%,rgba(255,255,255,.085) 100%);' +
    '  -webkit-backdrop-filter:blur(34px) saturate(185%);backdrop-filter:blur(34px) saturate(185%);border:1px solid rgba(255,255,255,.15);' +
    '  box-shadow:inset 0 1px 0 rgba(255,255,255,.34),inset 1px 0 0 rgba(255,255,255,.08),inset 0 -1px 0 rgba(255,255,255,.05),0 28px 80px rgba(0,0,0,.5)}' +
    'ha-card.gc.glass::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;border-radius:inherit;pointer-events:none;z-index:-1;' +
    '  background:radial-gradient(130% 75% at 0% -15%,rgba(255,255,255,.20),transparent 42%),radial-gradient(90% 60% at 105% 115%,rgba(110,190,255,.13),transparent 55%)}' +
    'ha-card.gc.light.glass{background:linear-gradient(155deg,rgba(255,255,255,.78),rgba(255,255,255,.5) 60%,rgba(255,255,255,.66));border:1px solid rgba(255,255,255,.7);' +
    '  box-shadow:inset 0 1px 0 #fff,0 18px 50px rgba(20,30,60,.14)}' +
    'ha-card.gc.light.glass::before{background:radial-gradient(120% 70% at 0% -15%,rgba(255,255,255,.7),transparent 45%)}' +
    'ha-card.gc.light .wi{filter:drop-shadow(0 2px 3px rgba(20,30,60,.28))}' +
    '.tint{position:absolute;top:0;left:0;right:0;bottom:0;border-radius:inherit;pointer-events:none;z-index:-1;background:rgba(var(--gcw-bg),var(--gcw-bga))}' +
    '.top{display:flex;justify-content:space-between;align-items:flex-start;gap:calc(16px * var(--s));flex:none}' +
    '.tl{flex:1 1 auto;display:flex;flex-direction:column;align-items:flex-start;gap:calc(12px * var(--s));min-width:0}' +
    '.greet{font-size:calc(15px * var(--s));letter-spacing:.3em;text-transform:uppercase;opacity:.58;margin-top:calc(10px * var(--s))}' +
    '.chips{display:flex;flex-wrap:wrap;gap:calc(10px * var(--s))}' +
    '.chip{--c:var(--gcw-text);display:inline-flex;align-items:center;gap:calc(8px * var(--s));min-height:calc(30px * var(--s));padding:0 calc(11px * var(--s));' +
    '  border-radius:999px;font-size:calc(13px * var(--s));white-space:nowrap;background:rgba(var(--gcw-text),.07);border:1px solid rgba(var(--gcw-text),.12);color:rgba(var(--gcw-text),.88)}' +
    '.chip ha-icon{--mdc-icon-size:calc(15px * var(--s));width:calc(15px * var(--s));height:calc(15px * var(--s));display:inline-flex}' +
    '.chip.ev{min-height:calc(46px * var(--s));font-size:calc(18px * var(--s));padding:0 calc(18px * var(--s)) 0 calc(13px * var(--s));' +
    '  background:rgba(var(--c),.16);border-color:rgba(var(--c),.5)}' +
    '.chip.ev ha-icon{--mdc-icon-size:calc(24px * var(--s));width:calc(24px * var(--s));height:calc(24px * var(--s));color:rgb(var(--c));filter:drop-shadow(0 0 5px rgba(var(--c),.7))}' +
    '.chip.ev .w{opacity:.6}' +
    '.chip.ev.today{background:linear-gradient(160deg,rgba(var(--c),.45),rgba(var(--c),.16));border-color:rgba(var(--c),.9);color:rgb(var(--gcw-text));' +
    '  box-shadow:0 0 24px rgba(var(--c),.42),inset 0 1px 0 rgba(255,255,255,.3)}' +
    '.chip.ev.today .w{opacity:.85}' +
    '.wnow{flex:none;display:flex;flex-direction:column;align-items:flex-end;min-width:0;margin-left:auto}' +
    '.wrow{display:flex;align-items:center;gap:calc(18px * var(--s));flex-wrap:wrap;justify-content:flex-end}' +
    '.rd{display:flex;align-items:center;gap:calc(10px * var(--s))}.rv{display:flex;flex-direction:column;align-items:flex-start}' +
    '.sep{width:1px;align-self:stretch;margin:calc(6px * var(--s)) 0;background:linear-gradient(180deg,transparent,rgba(var(--gcw-text),.22),transparent)}' +
    '.wic{width:calc(78px * var(--s));height:calc(78px * var(--s));flex:none}' +
    '.hic{--mdc-icon-size:calc(46px * var(--s));width:calc(46px * var(--s));height:calc(46px * var(--s));display:inline-flex;color:rgb(var(--gcw-indoor));' +
    '  filter:drop-shadow(0 0 10px rgba(var(--gcw-indoor),.55))}' +
    '.wt{font-size:calc(72px * var(--s));font-weight:300;line-height:1;letter-spacing:-.02em;white-space:nowrap}' +
    '.wt small{font-size:.4em;opacity:.6;vertical-align:top;margin-left:3px}' +
    '.cap{font-size:calc(16px * var(--s));opacity:.75;margin-top:3px;white-space:nowrap;max-width:calc(260px * var(--s));overflow:hidden;text-overflow:ellipsis}' +
    '.wd{display:flex;gap:calc(6px * var(--s));justify-content:flex-end;flex-wrap:wrap;margin-top:calc(8px * var(--s))}' +
    '.mid{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0}' +
    '.time{display:flex;align-items:baseline;justify-content:center;line-height:.84;font-weight:var(--gcw-tw);letter-spacing:-.055em;' +
    '  font-variant-numeric:tabular-nums;font-size:120px;white-space:nowrap;margin-right:.04em}' +
    '.time .g{background:linear-gradient(180deg,rgb(var(--gcw-time)) 12%,rgb(var(--gcw-time2)) 58%,rgb(var(--gcw-time3)) 100%);' +
    '  -webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 34px rgba(var(--gcw-accent),var(--gcw-ga)))}' +
    '.time .col{margin:0 .01em;animation:gcwpulse 2s steps(1) infinite}' +
    '.time .ap{font-size:.24em;letter-spacing:.04em;margin-left:.18em;opacity:.7;-webkit-text-fill-color:currentColor;filter:none}' +
    '@keyframes gcwpulse{0%,100%{opacity:1}50%{opacity:.45}}' +
    '.date{font-size:calc(28px * var(--s));font-weight:400;opacity:.9;text-transform:capitalize;margin-top:calc(10px * var(--s));text-align:center}' +
    '.sec{position:relative;height:3px;border-radius:3px;background:rgba(var(--gcw-text),.08);overflow:hidden;margin:calc(14px * var(--s)) 0 calc(12px * var(--s));flex:none}' +
    '.sec i{display:block;height:100%;width:0;border-radius:3px;background:linear-gradient(90deg,rgb(var(--gcw-accent)),rgb(var(--gcw-accent2)));' +
    '  box-shadow:0 0 14px rgba(var(--gcw-accent),var(--gcw-ga2));transition:width .95s linear}' +
    '.fc{display:grid;flex:none}' +
    '.fd{display:flex;flex-direction:column;align-items:center;gap:calc(4px * var(--s));padding:0 3px;border-left:1px solid rgba(var(--gcw-text),.07);min-width:0;overflow:hidden}' +
    '.fd:first-child{border-left:0}' +
    '.fd .d{font-size:calc(17px * var(--s));font-weight:600;opacity:.88;white-space:nowrap}' +
    '.fd .i{width:calc(48px * var(--s));height:calc(48px * var(--s))}' +
    '.fd .t{display:flex;align-items:center;gap:calc(6px * var(--s));font-size:calc(18px * var(--s));font-variant-numeric:tabular-nums;max-width:100%}' +
    '.fd .lo{opacity:.5}.fd .hi{font-weight:600}' +
    '.fd .b{position:relative;width:calc(26px * var(--s));flex:0 1 auto;min-width:8px;height:5px;border-radius:4px;background:rgba(var(--gcw-text),.08);overflow:hidden}' +
    '.fd .b i{position:absolute;top:0;bottom:0;border-radius:4px}' +
    '.msg{grid-column:1 / -1;text-align:center;opacity:.55;font-size:calc(15px * var(--s));padding:calc(8px * var(--s)) 0}' +
    '.attr{position:absolute;right:calc(16px * var(--s));bottom:calc(5px * var(--s));font-size:calc(10px * var(--s));letter-spacing:.04em;opacity:.35;pointer-events:none}' +
    '.gc.narrow .top{flex-direction:column;align-items:stretch}' +
    '.gc.narrow .wnow{align-items:flex-start;margin-left:0}.gc.narrow .wrow,.gc.narrow .wd{justify-content:flex-start}' +
    '.gc.noweather .wnow{display:none}' +
    '[hidden]{display:none!important}' +
    '@media (prefers-reduced-motion:reduce){.time .col{animation:none}}' +
    WCSS;

  class GlassClockWeatherCard extends HTMLElement {
    static getConfigElement() { return document.createElement(EDITOR); }
    static getStubConfig(hass) {
      var w = Object.keys((hass && hass.states) || {}).filter(function (e) { return e.indexOf('weather.') === 0; })[0];
      return w ? { weather_source: 'entity', weather_entity: w } : { weather_source: 'met_no' };
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._tick = this._tick.bind(this);
    }

    setConfig(config) {
      if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
      var c = Object.assign({}, DEF, config);
      if (!c.weather_source) c.weather_source = c.weather_entity ? 'entity' : 'met_no';
      if (['entity', 'met_no', 'none'].indexOf(c.weather_source) < 0) throw new Error('weather_source must be entity, met_no or none');
      if (c.weather_source === 'entity' && !c.weather_entity) c.weather_source = 'met_no';
      c.forecast_days = clamp(parseInt(c.forecast_days, 10) || 7, 1, 7);
      this._config = c;
      this._stopData();
      this._daily = null; this._met = null; this._cal = null; this._fkey = null; this._ckey = null;
      this._built = false;
      if (this._hass) this._build();
    }

    set hass(h) {
      var old = this._hass;
      this._hass = h;
      if (!this._config) return;
      if (!this._built) { this._build(); return; }
      if (!old || this._changed(old)) this._update();
      if (old && old.themes !== h.themes) this._applyVars();
      if (!this._dataStarted && this.isConnected) this._startData();
    }
    get hass() { return this._hass; }

    // in a sections view the grid sets the height
    set layout(v) { this._layout = v; if (this._built) this._applyVars(); }

    connectedCallback() {
      if (this._built) { this._startTimers(); this._startData(); this._observe(); }
    }
    disconnectedCallback() {
      this._stopTimers(); this._stopData();
      if (this._ro) { this._ro.disconnect(); this._ro = null; }
    }

    getCardSize() { return 7; }
    getGridOptions() { return { columns: 12, rows: 8, min_columns: 6, min_rows: 5 }; }

    _$(id) { return this.shadowRoot.getElementById(id); }

    _changed(old) {
      var c = this._config;
      var ids = [c.weather_entity, c.temperature_entity, c.humidity_entity, c.indoor_temperature_entity, 'sun.sun'];
      for (var i = 0; i < ids.length; i++) if (ids[i] && old.states[ids[i]] !== this._hass.states[ids[i]]) return true;
      return langOf(old) !== langOf(this._hass);
    }

    _build() {
      var c = this._config;
      if (c.font === 'space_grotesk') loadFont();
      var wx = c.weather_source !== 'none', fc = wx && c.show_forecast !== false;
      this.shadowRoot.innerHTML = '<style>' + CSS + '</style>' +
        '<ha-card class="gc" id="card"><div class="tint" id="tint"></div>' +
        '<div class="top" id="top"><div class="tl"><div class="greet" id="greet"></div><div class="chips" id="chips"></div></div>' +
        '<div class="wnow" id="wnow"><div class="wrow">' +
        '<div class="rd" id="rdo"><div class="wic" id="wic"></div><div class="rv"><div class="wt" id="wt">—</div><div class="cap" id="wc"></div></div></div>' +
        '<div class="sep" id="sep"></div>' +
        '<div class="rd" id="rdi"><ha-icon class="hic" icon="mdi:home-thermometer-outline"></ha-icon>' +
        '<div class="rv"><div class="wt" id="wti">—</div><div class="cap" id="wil"></div></div></div>' +
        '</div><div class="wd" id="wd"></div></div></div>' +
        '<div class="mid" id="mid"><div class="time" id="time"><span class="g" id="hh">--</span><span class="g col">:</span><span class="g" id="mm">--</span>' +
        '<span class="ap" id="ap"></span></div><div class="date" id="date"></div></div>' +
        '<div class="sec" id="secw"><i id="bar"></i></div>' +
        (fc ? '<div class="fc" id="fc"><div class="msg">' + esc(tr(langOf(this._hass), 'loading')) + '</div></div>' : '') +
        '<div class="attr" id="attr" hidden>MET Norway</div>' +
        '</ha-card>';
      this._built = true;
      this._bindActions();
      this._applyVars();
      this._update();
      this._tick();
      if (this.isConnected) { this._startTimers(); this._startData(); this._observe(); }
    }

    _palette() {
      var c = this._config, mode = c.appearance;
      if (mode !== 'light' && mode !== 'dark') mode = this._hass && this._hass.themes && this._hass.themes.darkMode === false ? 'light' : 'dark';
      return mode;
    }

    _applyVars() {
      var c = this._config, card = this._$('card'); if (!card) return;
      var mode = this._palette(), P = PALETTE[mode];
      var acc = rgb(c.accent_color, P.accent_color.join(',')), acc2 = rgb(c.secondary_color, P.secondary_color.join(','));
      var time = rgb(c.time_color, P.time_color.join(','));
      var glow = clamp(num(c.glow) == null ? 0.5 : num(c.glow), 0, 1);
      var font = c.font === 'theme' ? 'var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, sans-serif))'
        : c.font === 'custom' && c.font_family ? c.font_family + ', system-ui, sans-serif'
          : "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
      var grid = this._layout === 'grid';
      var vars = {
        '--gcw-accent': acc, '--gcw-accent2': acc2, '--gcw-time': time,
        '--gcw-time2': mix(time, acc, 0.55), '--gcw-time3': mix(time, acc, mode === 'light' ? 0.35 : 0.12),
        '--gcw-indoor': rgb(c.indoor_color, P.indoor_color.join(',')), '--gcw-text': rgb(c.text_color, P.text_color.join(',')),
        '--gcw-ga': (glow * 0.72).toFixed(3), '--gcw-ga2': Math.min(1, glow * 1.7).toFixed(3), '--gcw-font': font, '--gcw-tw': c.font === 'space_grotesk' ? '300' : '200',
        '--gcw-radius': clamp(num(c.border_radius) == null ? 32 : num(c.border_radius), 0, 64) + 'px',
        '--gcw-minh': grid ? '0px' : clamp(num(c.min_height) || 0, 0, 2000) + 'px',
        '--gcw-bg': rgb(c.background_color, '0,0,0'), '--gcw-bga': c.background_color ? clamp(num(c.background_opacity) == null ? 0.18 : num(c.background_opacity), 0, 1) : 0
      };
      for (var k in vars) card.style.setProperty(k, vars[k]);
      card.classList.toggle('glass', c.glass !== false);
      card.classList.toggle('light', mode === 'light');
      card.classList.toggle('noweather', c.weather_source === 'none' && !c.indoor_temperature_entity);
      var act = this._actionOf('tap') || this._actionOf('hold') || this._actionOf('double_tap');
      card.classList.toggle('act', !!act);
      card.setAttribute('tabindex', act ? '0' : '-1');
      this._layoutNow();
    }

    /* ---------- size: everything scales with the card width, the time fills the free space */
    _observe() {
      var self = this, card = this._$('card');
      if (this._ro || !card || !window.ResizeObserver) return;
      this._ro = new ResizeObserver(function () {
        if (self._raf) return;
        self._raf = requestAnimationFrame(function () { self._raf = null; self._layoutNow(); });
      });
      this._ro.observe(card);
    }
    _layoutNow() {
      var c = this._config, card = this._$('card'); if (!card) return;
      var w = card.clientWidth; if (!w) return;
      var scale = clamp(num(c.text_scale) || 1, 0.5, 2);
      var s = clamp(0.35 + 0.65 * w / 800, 0.6, 1.3) * scale;
      if (Math.abs((this._s || 0) - s) > 0.005) { this._s = s; card.style.setProperty('--s', s.toFixed(3)); }
      // side by side when the greeting, the chips and the weather fit on one row, otherwise stacked
      card.classList.remove('narrow');
      var top = this._$('top'), tl = top.firstElementChild;
      var stack = w < 420 * Math.max(1, scale) || tl.scrollWidth > tl.clientWidth + 1 || top.scrollWidth > top.clientWidth + 1;
      card.classList.toggle('narrow', stack);
      // a day needs room for "13° ▬ 23°": show only the days that fit
      var n = Math.max(1, Math.min(c.forecast_days, Math.floor((w - 56 * s) / (98 * s))));
      if (n !== this._fn) { this._fn = n; this._fkey = null; this._renderForecast(); }
      this._fit();
    }
    _fit() {
      var mid = this._$('mid'), t = this._$('time'), date = this._$('date'); if (!mid || !t) return;
      var w = mid.clientWidth; if (!w) return;
      // measure the free space with a tiny time, so a big time never feeds back into the card height
      t.style.fontSize = '10px';
      var dh = date.hidden ? 0 : date.offsetHeight + parseFloat(getComputedStyle(date).marginTop || 0);
      var avail = mid.clientHeight - dh - 4;
      var ratio = this._h12 ? 3.2 : 2.35;
      var max = clamp(num(this._config.clock_max_size) || 320, 40, 1000);
      // never tiny next to the card width: in a masonry view the card simply grows,
      // in a sections grid (fixed height) the free space wins
      var floor = Math.min(max, w / (ratio * 1.75));
      var fs = Math.min(max, w / (ratio * 1.1), avail / 0.86);
      fs = Math.max(36, this._layout === 'grid' ? fs : Math.max(fs, floor));
      t.style.fontSize = Math.round(fs) + 'px';
    }

    /* ---------- interactions: standard Home Assistant actions */
    _actionOf(kind) {
      var c = this._config, a = c[kind + '_action'];
      if (!a && kind === 'tap') a = c.weather_source === 'entity' && c.weather_entity ? { action: 'more-info' } : null;
      return a && a.action && a.action !== 'none' ? a : null;
    }
    _fireAction(kind) {
      var c = this._config;
      var cfg = {
        entity: c.weather_source === 'entity' ? c.weather_entity : c.indoor_temperature_entity || c.temperature_entity,
        tap_action: this._actionOf('tap') || { action: 'none' }, hold_action: this._actionOf('hold') || { action: 'none' },
        double_tap_action: this._actionOf('double_tap') || { action: 'none' }
      };
      fire(this, 'hass-action', { config: cfg, action: kind });
    }
    _bindActions() {
      var self = this, card = this._$('card'), timer = null, held = false, down = false, sx = 0, sy = 0, lastTap = 0, tapT = null;
      function clear() { clearTimeout(timer); card.classList.remove('pressed'); }
      card.addEventListener('pointerdown', function (e) {
        if (e.button) return;
        down = true; held = false; sx = e.clientX; sy = e.clientY;
        if (self._actionOf('tap') || self._actionOf('hold')) card.classList.add('pressed');
        if (self._actionOf('hold')) timer = setTimeout(function () { if (!down) return; held = true; clear(); self._fireAction('hold'); }, 500);
      });
      card.addEventListener('pointermove', function (e) {
        if (down && (Math.abs(e.clientX - sx) > 12 || Math.abs(e.clientY - sy) > 12)) { down = false; clear(); }
      });
      card.addEventListener('pointerup', function () {
        if (!down) return;
        down = false; clear();
        if (held) return;
        if (self._actionOf('double_tap')) {
          var now = Date.now();
          if (now - lastTap < 280) { clearTimeout(tapT); lastTap = 0; self._fireAction('double_tap'); return; }
          lastTap = now;
          tapT = setTimeout(function () { if (self._actionOf('tap')) self._fireAction('tap'); }, 280);
        } else if (self._actionOf('tap')) self._fireAction('tap');
      });
      card.addEventListener('pointercancel', function () { down = false; clear(); });
      card.addEventListener('pointerleave', function () { if (down) { down = false; clear(); } });
      card.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && self._actionOf('tap')) { e.preventDefault(); self._fireAction('tap'); } });
    }

    /* ---------- timers and data */
    _startTimers() {
      var self = this;
      if (!this._t1) this._t1 = setInterval(this._tick, 1000);
      if (!this._t2) this._t2 = setInterval(function () { self._slow(); }, 60000);
    }
    _stopTimers() {
      clearInterval(this._t1); clearInterval(this._t2); this._t1 = this._t2 = null;
    }
    _stopData() {
      unsubscribe(this._sub); this._sub = null; this._dataStarted = false;
    }
    _location() {
      var l = this._config.location;
      if (l && l.latitude != null && l.longitude != null) return { latitude: +l.latitude, longitude: +l.longitude };
      return homeLocation(this._hass);
    }
    _startData() {
      var c = this._config, h = this._hass, self = this;
      if (!h || !this._built || this._dataStarted) return;
      this._dataStarted = true;
      if (c.weather_source === 'entity' && c.weather_entity) {
        var type = forecastType(st(h, c.weather_entity));
        this._sub = subscribeForecast(h, c.weather_entity, type, function (list) {
          self._daily = groupDaily(list, type);
          self._fkey = null; self._renderForecast(); self._weather(); self._complete();
        });
      }
      if (c.weather_source === 'met_no') this._loadMet();
      if (c.calendar_entity) this._loadCal();
    }
    _slow() {
      var c = this._config, k = dayKey(new Date());
      if (c.weather_source === 'met_no') this._loadMet();
      else if (this._usedMet) this._complete();
      if (c.calendar_entity) this._loadCal();
      if (this._day && this._day !== k) { this._fkey = null; this._ckey = null; this._renderForecast(); this._update(); }
      this._day = k;
    }
    _loadMet() {
      var self = this, loc = this._location(); if (!loc) return;
      metFetch(loc.latitude, loc.longitude).then(function (d) {
        if (!d || !self._built) return;
        self._met = d; self._daily = d.daily; self._usedMet = true;
        self._fkey = null; self._renderForecast(); self._weather();
      });
    }
    // fill the days the weather entity does not provide (e.g. the Met.no integration stops at today + 5)
    _complete() {
      var c = this._config, self = this;
      if (c.weather_source !== 'entity' || !c.complete_forecast || futureDays(this._daily).length >= c.forecast_days) return;
      var loc = this._location(); if (!loc) return;
      metFetch(loc.latitude, loc.longitude).then(function (d) {
        if (!d || !self._built) return;
        self._usedMet = true;
        var u = (st(self._hass, c.weather_entity) || { attributes: {} }).attributes.temperature_unit || '';
        self._extra = /F/.test(u) ? d.daily.map(function (f) {
          return Object.assign({}, f, { temperature: f.temperature * 9 / 5 + 32, templow: f.templow == null ? null : f.templow * 9 / 5 + 32 });
        }) : d.daily;
        self._fkey = null; self._renderForecast();
      });
    }
    _loadCal() {
      var self = this, c = this._config;
      calFetch(this._hass, c.calendar_entity).then(function (ev) {
        var items = calItems(ev, c, langOf(self._hass)), key = JSON.stringify(items);
        if (key === self._ckey) return;
        self._ckey = key; self._cal = items; self._renderChips();
      });
    }

    /* ---------- rendering */
    _tick() {
      var hh = this._$('hh'); if (!hh) return;
      var c = this._config, l = langOf(this._hass), d = new Date(), h = d.getHours(), s = d.getSeconds();
      var tf = c.time_format, h12;
      if (tf === '12') h12 = true;
      else if (tf === '24') h12 = false;
      else {
        var pref = this._hass && this._hass.locale && this._hass.locale.time_format;
        if (pref === '12') h12 = true;
        else if (pref === '24') h12 = false;
        else { try { h12 = !!new Intl.DateTimeFormat(l, { hour: 'numeric' }).resolvedOptions().hour12; } catch (e) { h12 = false; } }
      }
      if (h12 !== this._h12) { this._h12 = h12; this._fit(); }
      var set = function (el, v) { if (el.textContent !== v) el.textContent = v; };
      set(hh, h12 ? String(h % 12 || 12) : ('0' + h).slice(-2));
      set(this._$('mm'), ('0' + d.getMinutes()).slice(-2));
      set(this._$('ap'), h12 ? (h < 12 ? 'AM' : 'PM') : '');
      var date = this._$('date'), noDate = c.show_date === false;
      if (date.hidden !== noDate) date.hidden = noDate;
      if (!noDate) set(date, d.toLocaleDateString(l, { weekday: 'long', day: 'numeric', month: 'long' }));
      var g = this._$('greet'), noGreet = c.show_greeting === false;
      if (g.hidden !== noGreet) g.hidden = noGreet;
      if (!noGreet) {
        var noon = tr(l, 'noon') || 12;
        set(g, tr(l, h < 5 ? 'night' : h < noon ? 'morning' : h < 18 ? 'afternoon' : h < 22 ? 'evening' : 'night'));
      }
      var secw = this._$('secw'), bar = this._$('bar'), noBar = c.show_seconds_bar === false;
      if (secw.hidden !== noBar) secw.hidden = noBar;
      if (!noBar) { bar.style.transition = s === 0 ? 'none' : ''; bar.style.width = (s / 59 * 100) + '%'; }
    }

    _update() {
      if (!this._built) return;
      this._weather();
      this._renderChips();
      this._renderForecast();
    }

    _renderChips() {
      var el = this._$('chips'); if (!el) return;
      var l = langOf(this._hass);
      el.innerHTML = (this._cal || []).map(function (t) {
        return '<span class="chip ev' + (t.when === 'today' ? ' today' : '') + '" style="--c:' + t.color + '"><ha-icon icon="' + esc(t.icon) + '"></ha-icon>' +
          '<span class="w">' + esc(tr(l, t.when)) + '</span>' + esc(t.label) + '</span>';
      }).join('');
    }

    _current() {
      var c = this._config, h = this._hass, out = { condition: null, night: false, temp: null, unit: '°C', hum: null, wind: null, windUnit: '', today: null };
      var sys = (h && h.config && h.config.unit_system && h.config.unit_system.temperature) || '°C';
      var night = function () { var s = st(h, 'sun.sun'); return s ? s.state === 'below_horizon' : (new Date().getHours() < 7 || new Date().getHours() >= 20); };
      if (c.weather_source === 'entity') {
        var w = st(h, c.weather_entity);
        if (w) {
          var a = w.attributes;
          out.condition = w.state; out.night = night();
          out.temp = num(a.temperature); out.unit = a.temperature_unit || sys;
          out.hum = num(a.humidity); out.wind = num(a.wind_speed); out.windUnit = a.wind_speed_unit || '';
        }
      } else if (c.weather_source === 'met_no' && this._met) {
        var m = this._met.now, f = /F/.test(sys);
        out.condition = m.condition; out.night = m.night;
        out.temp = m.temperature == null ? null : f ? m.temperature * 9 / 5 + 32 : m.temperature; out.unit = f ? '°F' : '°C';
        out.hum = m.humidity;
        out.wind = m.wind == null ? null : f ? m.wind * 2.23694 : m.wind * 3.6; out.windUnit = f ? 'mph' : 'km/h';
      }
      var ts = st(h, c.temperature_entity);
      if (ts && num(ts.state) != null) { out.temp = num(ts.state); out.unit = ts.attributes.unit_of_measurement || out.unit; }
      var hs = st(h, c.humidity_entity);
      if (hs && num(hs.state) != null) out.hum = num(hs.state);
      out.today = todayOf(this._daily);
      return out;
    }

    _weather() {
      var c = this._config, h = this._hass, l = langOf(h), dec = parseInt(c.temperature_decimals, 10);
      dec = isNaN(dec) ? 1 : clamp(dec, 0, 2);
      var wx = c.weather_source !== 'none', cur = this._current();
      var rdo = this._$('rdo'); if (!rdo) return;
      rdo.hidden = !wx;
      if (wx) {
        var key = (cur.condition || 'cloudy') + (cur.night ? 'n' : 'd');
        if (this._wkey !== key) { this._wkey = key; this._$('wic').innerHTML = weatherSvg(cur.condition || 'cloudy', cur.night); }
        this._$('wt').innerHTML = esc(fmt(cur.temp, dec, l)) + '<small>' + esc(cur.unit) + '</small>';
        var cap = cur.condition ? condLabel(h, cur.condition) : '';
        if (c.location_name) cap = c.location_name + (cap ? ' · ' + cap : '');
        this._$('wc').textContent = cap;
      }
      var ins = st(h, c.indoor_temperature_entity), rdi = this._$('rdi');
      rdi.hidden = !c.indoor_temperature_entity;
      this._$('sep').hidden = !wx || !c.indoor_temperature_entity;
      if (c.indoor_temperature_entity) {
        var it = ins ? num(ins.state) : null, iu = (ins && ins.attributes.unit_of_measurement) || cur.unit;
        this._$('wti').innerHTML = esc(fmt(it, dec, l)) + '<small>' + esc(iu) + '</small>';
        this._$('wil').textContent = c.indoor_label || tr(l, 'indoor');
      }
      var det = [];
      if (wx && c.show_details !== false) {
        if (cur.today && cur.today.temperature != null) {
          det.push(['mdi:thermometer', fmt(cur.today.temperature, 0, l) + '° / ' + fmt(cur.today.templow != null ? cur.today.templow : cur.today.temperature, 0, l) + '°']);
        }
        if (cur.hum != null) det.push(['mdi:water-percent', fmt(cur.hum, 0, l) + '%']);
        if (cur.wind != null) det.push(['mdi:weather-windy', fmt(cur.wind, 0, l) + (cur.windUnit ? ' ' + cur.windUnit : '')]);
      }
      this._$('wd').innerHTML = det.map(function (d) { return '<span class="chip"><ha-icon icon="' + d[0] + '"></ha-icon>' + esc(d[1]) + '</span>'; }).join('');
      this._$('attr').hidden = !this._usedMet;
    }

    _renderForecast() {
      var c = this._config, el = this._$('fc'); if (!el) return;
      var l = langOf(this._hass), list = this._extra ? mergeDaily(this._daily, this._extra) : this._daily;
      var n = this._fn || c.forecast_days, days = futureDays(list).slice(0, n);
      if (!days.length) {
        if (list) el.innerHTML = '<div class="msg">' + esc(tr(l, 'nofc')) + '</div>';
        return;
      }
      var unit = c.weather_source === 'met_no' ? this._current().unit : ((st(this._hass, c.weather_entity) || { attributes: {} }).attributes.temperature_unit || '°C');
      var key = JSON.stringify([n, unit, days.map(function (d) { return [d.datetime, d.condition, d.temperature, d.templow]; })]);
      if (key === this._fkey) return;
      this._fkey = key;
      var conv = c.weather_source === 'met_no' && /F/.test(unit) ? function (t) { return t * 9 / 5 + 32; } : function (t) { return t; };
      var lows = days.map(function (d) { return conv(d.templow != null ? d.templow : d.temperature); });
      var highs = days.map(function (d) { return conv(d.temperature); });
      var lo = Math.min.apply(null, lows), hi = Math.max.apply(null, highs), span = Math.max(1, hi - lo);
      el.style.gridTemplateColumns = 'repeat(' + days.length + ',minmax(0,1fr))';
      el.innerHTML = days.map(function (d, i) {
        var dt = new Date(d.datetime), lw = lows[i], hg = highs[i];
        var left = (lw - lo) / span * 100, width = Math.max(14, (hg - lw) / span * 100);
        var name = dt.toLocaleDateString(l, { weekday: 'short' }).replace('.', '');
        name = name.charAt(0).toUpperCase() + name.slice(1);
        return '<div class="fd"><span class="d">' + esc(name) + '</span><span class="i">' + weatherSvg(d.condition, false) + '</span>' +
          '<span class="t"><span class="lo">' + esc(fmt(lw, 0, l)) + '°</span><span class="b"><i style="left:' + left.toFixed(1) + '%;width:' + width.toFixed(1) +
          '%;background:linear-gradient(90deg,rgb(' + tColor(toC(lw, unit)) + '),rgb(' + tColor(toC(hg, unit)) + '))"></i></span><span class="hi">' + esc(fmt(hg, 0, l)) + '°</span></span></div>';
      }).join('');
      this._fit();
    }
  }

  /* ================================================================ visual editor */

  var ET = {
    en: {
      s_weather: 'Weather', s_forecast: 'Forecast', s_clock: 'Clock', s_calendar: 'Calendar events', s_look: 'Appearance', s_colors: 'Colors', s_actions: 'Interactions',
      s_weather_h: 'Where the weather comes from: a weather entity of Home Assistant, or Met.no for any place on the map.',
      weather_source: 'Weather source', src_entity: 'Home Assistant weather entity', src_met: 'Met.no — choose a place on the map', src_none: 'No weather',
      weather_entity: 'Weather entity', location: 'Place for the forecast', location_h: 'Drag the marker. If you do not set it, your home location is used.',
      location_name: 'Place name (optional)', location_name_h: 'Shown before the weather condition, e.g. “Milan”.',
      complete_forecast: 'Complete missing days with Met.no', complete_forecast_h: 'Some integrations give only 5 days. Your browser asks api.met.no for the place above, rounded to about 1 km.',
      temperature_entity: 'Outdoor temperature sensor (optional)', humidity_entity: 'Outdoor humidity sensor (optional)',
      indoor_temperature_entity: 'Indoor temperature sensor (optional)', indoor_label: 'Indoor caption', indoor_label_h: 'Default: “Indoor”, in your language.',
      show_details: 'Show high / low, humidity and wind', temperature_decimals: 'Temperature decimals',
      show_forecast: 'Show the next days', forecast_days: 'Number of days',
      time_format: 'Time format', tf_auto: 'Automatic (from your profile)', tf_24: '24 hours', tf_12: '12 hours (AM / PM)',
      show_greeting: 'Show greeting', show_date: 'Show date', show_seconds_bar: 'Show seconds bar', clock_max_size: 'Maximum clock size',
      calendar_entity: 'Calendar (e.g. waste collection)', calendar_show_tomorrow: 'Also show tomorrow', calendar_max_chips: 'Maximum events shown',
      calendar_default_icon: 'Icon for other events', calendar_default_color: 'Color for other events',
      s_types: 'Event types', types_h: 'Events whose title contains the text get their own label, icon and color.',
      pattern: 'Text to look for', label: 'Label', icon: 'Icon', color: 'Color',
      add_type: 'Add event type', add_examples: 'Add waste collection examples', remove: 'Remove',
      appearance: 'Style', ap_auto: 'Automatic (follows the theme)', ap_dark: 'Dark', ap_light: 'Light',
      font: 'Font', f_space: 'Space Grotesk (from Google Fonts)', f_theme: 'Theme font', f_custom: 'Custom font', font_family: 'Custom font family',
      text_scale: 'Text size', text_scale_h: 'Larger values make the card easier to read from a distance.', min_height: 'Minimum height',
      glass: 'Glass effect', glow: 'Glow intensity', border_radius: 'Corner radius',
      accent_color: 'Accent color', secondary_color: 'Secondary color', time_color: 'Clock color', indoor_color: 'Indoor icon color', text_color: 'Text color',
      background_color: 'Background tint', background_opacity: 'Tint strength', reset_colors: 'Reset colors',
      tap_action: 'Tap action', hold_action: 'Hold action', double_tap_action: 'Double tap action'
    },
    it: {
      s_weather: 'Meteo', s_forecast: 'Previsioni', s_clock: 'Orologio', s_calendar: 'Eventi del calendario', s_look: 'Aspetto', s_colors: 'Colori', s_actions: 'Interazioni',
      s_weather_h: 'Da dove arriva il meteo: da un’entità meteo di Home Assistant, oppure da Met.no per qualunque posto sulla mappa.',
      weather_source: 'Fonte del meteo', src_entity: 'Entità meteo di Home Assistant', src_met: 'Met.no — scegli un posto sulla mappa', src_none: 'Nessun meteo',
      weather_entity: 'Entità meteo', location: 'Posto per le previsioni', location_h: 'Sposta il segnaposto. Se non lo imposti si usa la posizione di casa.',
      location_name: 'Nome del posto (facoltativo)', location_name_h: 'Compare prima della condizione meteo, per esempio “Milano”.',
      complete_forecast: 'Completa i giorni mancanti con Met.no', complete_forecast_h: 'Alcune integrazioni danno solo 5 giorni. Il browser chiede ad api.met.no le previsioni del posto qui sopra, arrotondato a circa 1 km.',
      temperature_entity: 'Sensore temperatura esterna (facoltativo)', humidity_entity: 'Sensore umidità esterna (facoltativo)',
      indoor_temperature_entity: 'Sensore temperatura in casa (facoltativo)', indoor_label: 'Didascalia della temperatura in casa', indoor_label_h: 'Se vuota: “In casa”.',
      show_details: 'Mostra massima / minima, umidità e vento', temperature_decimals: 'Decimali della temperatura',
      show_forecast: 'Mostra i prossimi giorni', forecast_days: 'Numero di giorni',
      time_format: 'Formato dell’ora', tf_auto: 'Automatico (dal tuo profilo)', tf_24: '24 ore', tf_12: '12 ore (AM / PM)',
      show_greeting: 'Mostra il saluto', show_date: 'Mostra la data', show_seconds_bar: 'Mostra la barra dei secondi', clock_max_size: 'Grandezza massima dell’ora',
      calendar_entity: 'Calendario (es. raccolta differenziata)', calendar_show_tomorrow: 'Mostra anche domani', calendar_max_chips: 'Numero massimo di eventi',
      calendar_default_icon: 'Icona per gli altri eventi', calendar_default_color: 'Colore per gli altri eventi',
      s_types: 'Tipi di evento', types_h: 'Gli eventi il cui titolo contiene il testo indicato prendono nome, icona e colore propri.',
      pattern: 'Testo da cercare', label: 'Nome mostrato', icon: 'Icona', color: 'Colore',
      add_type: 'Aggiungi un tipo di evento', add_examples: 'Aggiungi gli esempi della raccolta differenziata', remove: 'Rimuovi',
      appearance: 'Stile', ap_auto: 'Automatico (segue il tema)', ap_dark: 'Scuro', ap_light: 'Chiaro',
      font: 'Carattere', f_space: 'Space Grotesk (da Google Fonts)', f_theme: 'Carattere del tema', f_custom: 'Carattere personalizzato', font_family: 'Nome del carattere',
      text_scale: 'Grandezza dei testi', text_scale_h: 'Valori più alti rendono la card leggibile anche da lontano.', min_height: 'Altezza minima',
      glass: 'Effetto vetro', glow: 'Intensità del bagliore', border_radius: 'Raggio degli angoli',
      accent_color: 'Colore principale', secondary_color: 'Colore secondario', time_color: 'Colore dell’ora', indoor_color: 'Colore dell’icona casa', text_color: 'Colore dei testi',
      background_color: 'Tinta dello sfondo', background_opacity: 'Intensità della tinta', reset_colors: 'Ripristina i colori',
      tap_action: 'Azione al tocco', hold_action: 'Azione tenendo premuto', double_tap_action: 'Azione al doppio tocco'
    }
  };
  var EXAMPLES = {
    it: [
      { pattern: 'Umido|Organico', label: 'Umido', icon: 'mdi:food-apple-outline', color: [186, 134, 102] },
      { pattern: 'Carta|Cartone', label: 'Carta', icon: 'mdi:newspaper-variant-outline', color: [96, 165, 250] },
      { pattern: 'Plastica|Metalli', label: 'Plastica', icon: 'mdi:bottle-soda-classic-outline', color: [255, 198, 64] },
      { pattern: 'Vetro', label: 'Vetro', icon: 'mdi:glass-fragile', color: [92, 210, 120] },
      { pattern: 'Indifferenziat|Secco', label: 'Indifferenziato', icon: 'mdi:trash-can-outline', color: [170, 182, 200] }
    ],
    en: [
      { pattern: 'Organic|Food|Compost', label: 'Organic', icon: 'mdi:food-apple-outline', color: [186, 134, 102] },
      { pattern: 'Paper|Cardboard', label: 'Paper', icon: 'mdi:newspaper-variant-outline', color: [96, 165, 250] },
      { pattern: 'Plastic|Packaging', label: 'Plastic', icon: 'mdi:bottle-soda-classic-outline', color: [255, 198, 64] },
      { pattern: 'Glass', label: 'Glass', icon: 'mdi:glass-fragile', color: [92, 210, 120] },
      { pattern: 'General|Residual|Landfill', label: 'General waste', icon: 'mdi:trash-can-outline', color: [170, 182, 200] }
    ]
  };
  var COLOR_KEYS = ['accent_color', 'secondary_color', 'time_color', 'indoor_color', 'text_color'];

  // the Home Assistant form elements are loaded on demand: make sure they exist before drawing the editor
  var FORM = null;
  function ensureForm() {
    if (customElements.get('ha-form') && customElements.get('ha-expansion-panel')) return Promise.resolve();
    if (FORM) return FORM;
    FORM = new Promise(function (resolve) {
      var done = function () { resolve(); };
      try {
        var h = window.loadCardHelpers ? window.loadCardHelpers() : null;
        if (h) {
          h.then(function (helpers) { return helpers.createCardElement({ type: 'entities', entities: [] }); })
            .then(function (c) { return c && c.constructor && c.constructor.getConfigElement ? c.constructor.getConfigElement() : null; })
            .catch(function () { /* ignore */ });
        }
      } catch (e) { /* ignore */ }
      customElements.whenDefined('ha-form').then(done);
      setTimeout(done, 5000);
    });
    return FORM;
  }

  class GlassClockWeatherCardEditor extends HTMLElement {
    setConfig(config) {
      this._config = Object.assign({}, config || {});
      this._draw();
    }
    set hass(h) {
      this._hass = h;
      if (this._form) this._form.hass = h;
      (this._rows || []).forEach(function (r) { r.hass = h; });
      if (!this._form) this._draw();
    }
    connectedCallback() { this._draw(); }

    _L(k) { var t = ET[baseLang(langOf(this._hass))] || ET.en; return t[k] != null ? t[k] : (ET.en[k] != null ? ET.en[k] : k); }
    _mode() {
      var a = this._config.appearance;
      if (a === 'light' || a === 'dark') return a;
      return this._hass && this._hass.themes && this._hass.themes.darkMode === false ? 'light' : 'dark';
    }
    _source() {
      var c = this._config;
      return c.weather_source || (c.weather_entity ? 'entity' : 'met_no');
    }

    _schema() {
      var c = this._config, L = this._L.bind(this), src = this._source(), sel = function (o) { return { select: { mode: 'dropdown', options: o } }; };
      var weather = [{ name: 'weather_source', selector: sel([{ value: 'entity', label: L('src_entity') }, { value: 'met_no', label: L('src_met') }, { value: 'none', label: L('src_none') }]) }];
      if (src === 'entity') weather.push({ name: 'weather_entity', selector: { entity: { filter: { domain: 'weather' } } } });
      if (src === 'entity') weather.push({ name: 'complete_forecast', selector: { boolean: {} } });
      if (src === 'met_no' || (src === 'entity' && c.complete_forecast)) {
        weather.push({ name: 'location', selector: { location: { radius: false, icon: 'mdi:weather-partly-cloudy' } } });
      }
      if (src !== 'none') {
        weather.push({ name: 'location_name', selector: { text: {} } });
        weather.push({ name: 'temperature_entity', selector: { entity: { filter: { domain: 'sensor', device_class: 'temperature' } } } });
        weather.push({ name: 'humidity_entity', selector: { entity: { filter: { domain: 'sensor', device_class: 'humidity' } } } });
      }
      weather.push({ name: 'indoor_temperature_entity', selector: { entity: { filter: { domain: 'sensor', device_class: 'temperature' } } } });
      if (c.indoor_temperature_entity) weather.push({ name: 'indoor_label', selector: { text: {} } });
      weather.push({ type: 'grid', name: '', schema: [
        { name: 'show_details', selector: { boolean: {} } },
        { name: 'temperature_decimals', selector: { number: { min: 0, max: 2, step: 1, mode: 'box' } } }
      ] });

      var forecast = [{ name: 'show_forecast', selector: { boolean: {} } }];
      if (c.show_forecast !== false) forecast.push({ name: 'forecast_days', selector: { number: { min: 1, max: 7, step: 1, mode: 'slider' } } });

      var clock = [
        { name: 'time_format', selector: sel([{ value: 'auto', label: L('tf_auto') }, { value: '24', label: L('tf_24') }, { value: '12', label: L('tf_12') }]) },
        { type: 'grid', name: '', schema: [
          { name: 'show_greeting', selector: { boolean: {} } },
          { name: 'show_date', selector: { boolean: {} } },
          { name: 'show_seconds_bar', selector: { boolean: {} } }
        ] },
        { name: 'clock_max_size', selector: { number: { min: 60, max: 600, step: 10, mode: 'slider', unit_of_measurement: 'px' } } }
      ];

      var calendar = [{ name: 'calendar_entity', selector: { entity: { filter: { domain: 'calendar' } } } }];
      if (c.calendar_entity) {
        calendar.push({ type: 'grid', name: '', schema: [
          { name: 'calendar_show_tomorrow', selector: { boolean: {} } },
          { name: 'calendar_max_chips', selector: { number: { min: 1, max: 12, step: 1, mode: 'box' } } }
        ] });
        calendar.push({ type: 'grid', name: '', schema: [
          { name: 'calendar_default_icon', selector: { icon: {} } },
          { name: 'calendar_default_color', selector: { color_rgb: {} } }
        ] });
      }

      var look = [
        { name: 'appearance', selector: sel([{ value: 'auto', label: L('ap_auto') }, { value: 'dark', label: L('ap_dark') }, { value: 'light', label: L('ap_light') }]) },
        { name: 'font', selector: sel([{ value: 'space_grotesk', label: L('f_space') }, { value: 'theme', label: L('f_theme') }, { value: 'custom', label: L('f_custom') }]) }
      ];
      if (c.font === 'custom') look.push({ name: 'font_family', selector: { text: {} } });
      look.push({ name: 'text_scale', selector: { number: { min: 0.6, max: 1.8, step: 0.05, mode: 'slider' } } });
      look.push({ name: 'min_height', selector: { number: { min: 200, max: 1200, step: 10, mode: 'slider', unit_of_measurement: 'px' } } });
      look.push({ type: 'grid', name: '', schema: [
        { name: 'glass', selector: { boolean: {} } },
        { name: 'glow', selector: { number: { min: 0, max: 1, step: 0.05, mode: 'slider' } } }
      ] });
      look.push({ name: 'border_radius', selector: { number: { min: 0, max: 64, step: 1, mode: 'slider', unit_of_measurement: 'px' } } });

      var colors = [{ type: 'grid', name: '', schema: [
        { name: 'accent_color', selector: { color_rgb: {} } },
        { name: 'secondary_color', selector: { color_rgb: {} } },
        { name: 'time_color', selector: { color_rgb: {} } },
        { name: 'indoor_color', selector: { color_rgb: {} } },
        { name: 'text_color', selector: { color_rgb: {} } },
        { name: 'background_color', selector: { color_rgb: {} } }
      ] }];
      if (c.background_color) colors.push({ name: 'background_opacity', selector: { number: { min: 0, max: 1, step: 0.05, mode: 'slider' } } });

      var actions = [
        { name: 'tap_action', selector: { ui_action: { default_action: src === 'entity' ? 'more-info' : 'none' } } },
        { name: 'hold_action', selector: { ui_action: { default_action: 'none' } } },
        { name: 'double_tap_action', selector: { ui_action: { default_action: 'none' } } }
      ];

      var X = function (title, icon, schema, expanded, helper) {
        return { type: 'expandable', name: '', title: L(title), icon: icon, flatten: true, expanded: !!expanded, schema: schema, _help: helper };
      };
      return [
        X('s_weather', 'mdi:weather-partly-cloudy', weather, true),
        X('s_forecast', 'mdi:calendar-week', forecast),
        X('s_clock', 'mdi:clock-outline', clock),
        X('s_calendar', 'mdi:calendar-check-outline', calendar),
        X('s_look', 'mdi:palette-outline', look),
        X('s_colors', 'mdi:format-color-fill', colors),
        X('s_actions', 'mdi:gesture-tap', actions)
      ];
    }

    _data() {
      var c = this._config, P = PALETTE[this._mode()], d = {};
      Object.keys(DEF).forEach(function (k) { if (DEF[k] != null) d[k] = DEF[k]; });
      COLOR_KEYS.forEach(function (k) { d[k] = P[k]; });
      d.weather_source = this._source();
      d = Object.assign(d, c);
      COLOR_KEYS.concat(['background_color', 'calendar_default_color']).forEach(function (k) {
        if (c[k] != null) d[k] = rgbArr(rgb(c[k], (P[k] || [0, 0, 0]).join(',')));
      });
      if (!c.location) { var h = homeLocation(this._hass); if (h) d.location = h; }
      return d;
    }

    // keep the YAML tidy: only what differs from the defaults is saved
    _clean(v) {
      var P = PALETTE[this._mode()], home = homeLocation(this._hass), out = {};
      Object.keys(v).forEach(function (k) {
        var x = v[k];
        if (x === undefined || x === null || x === '') return;
        if (k === 'type' || k === 'calendar_types') { out[k] = x; return; }
        if (k === 'location') {
          if (home && Math.abs(x.latitude - home.latitude) < 1e-4 && Math.abs(x.longitude - home.longitude) < 1e-4) return;
          out[k] = { latitude: Math.round(x.latitude * 1e5) / 1e5, longitude: Math.round(x.longitude * 1e5) / 1e5 };
          return;
        }
        if (COLOR_KEYS.indexOf(k) >= 0 && P[k] && same(rgbArr(rgb(x, '')), P[k])) return;
        if (k in DEF && same(x, DEF[k])) return;
        out[k] = x;
      });
      if (out.weather_source !== 'entity') delete out.complete_forecast;
      if (Array.isArray(out.calendar_types) && !out.calendar_types.length) delete out.calendar_types;
      return out;
    }

    _emit(cfg) {
      this._config = cfg;
      fire(this, 'config-changed', { config: cfg });
      this._draw();
    }

    _draw() {
      var self = this;
      if (!this._hass || !this._config || !this.isConnected) return;
      ensureForm().then(function () { self._drawNow(); });
    }

    _drawNow() {
      var self = this, L = this._L.bind(this);
      if (!this._root) {
        this._root = this.attachShadow({ mode: 'open' });
        this._root.innerHTML = '<style>' +
          ':host{display:block}.box{display:flex;flex-direction:column;gap:12px}' +
          '.types{display:flex;flex-direction:column;gap:12px;padding:4px 0 8px}' +
          '.help{color:var(--secondary-text-color);font-size:13px;line-height:1.4;margin:0 0 4px}' +
          '.row{border:1px solid var(--divider-color);border-radius:12px;padding:10px 10px 4px;position:relative}' +
          '.row .del{position:absolute;top:6px;right:6px}' +
          '.btns{display:flex;flex-wrap:wrap;gap:8px}' +
          'button.b{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:14px;cursor:pointer;border-radius:18px;padding:7px 14px;' +
          '  border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}' +
          'button.b:hover{background:var(--secondary-background-color)}' +
          'button.b ha-icon{--mdc-icon-size:18px}' +
          'button.icon{border:0;background:none;cursor:pointer;color:var(--secondary-text-color);padding:6px;border-radius:50%}' +
          'button.icon:hover{color:var(--error-color, #db4437);background:var(--secondary-background-color)}' +
          '.foot{font-size:12px;color:var(--secondary-text-color);text-align:right}.foot a{color:inherit}' +
          '</style><div class="box"><div id="form"></div><div id="types"></div>' +
          '<div class="foot">Glass Clock Weather Card ' + VERSION + ' · <a href="' + REPO + '" target="_blank" rel="noreferrer">GitHub</a></div></div>';
        this._form = document.createElement('ha-form');
        this._form.computeLabel = function (s) { return s.title || L(s.name); };
        this._form.computeHelper = function (s) {
          var k = s.name + '_h';
          if (s.type === 'expandable') return s.title === L('s_weather') ? L('s_weather_h') : '';
          var v = L(k); return v === k ? '' : v;
        };
        this._form.addEventListener('value-changed', function (ev) {
          ev.stopPropagation();
          var v = Object.assign({}, self._config, ev.detail.value);
          self._emit(self._clean(v));
        });
        this._root.getElementById('form').appendChild(this._form);
      }
      this._form.hass = this._hass;
      this._form.schema = this._schema();
      this._form.data = this._data();
      this._drawTypes();
    }

    _drawTypes() {
      var self = this, L = this._L.bind(this), host = this._root.getElementById('types'), c = this._config;
      if (!c.calendar_entity) { host.innerHTML = ''; this._rows = []; this._typesPanel = null; return; }
      var types = Array.isArray(c.calendar_types) ? c.calendar_types : [];
      if (!this._typesPanel || !host.contains(this._typesPanel)) {
        host.innerHTML = '';
        var p = document.createElement('ha-expansion-panel');
        p.outlined = true; p.header = L('s_types');
        p.setAttribute('outlined', '');
        p.innerHTML = '<div class="types"><p class="help">' + esc(L('types_h')) + '</p><div id="rows"></div>' +
          '<div class="btns"><button class="b" id="add"><ha-icon icon="mdi:plus"></ha-icon>' + esc(L('add_type')) + '</button>' +
          '<button class="b" id="ex"><ha-icon icon="mdi:recycle"></ha-icon>' + esc(L('add_examples')) + '</button></div></div>';
        host.appendChild(p);
        this._typesPanel = p; this._rowsKey = null;
        p.querySelector('#add').addEventListener('click', function () {
          var t = (self._config.calendar_types || []).slice();
          t.push({ pattern: '', label: '', icon: 'mdi:calendar-star', color: [95, 243, 255] });
          if (self._typesPanel) self._typesPanel.expanded = true;
          self._emit(self._clean(Object.assign({}, self._config, { calendar_types: t })));
        });
        p.querySelector('#ex').addEventListener('click', function () {
          var ex = EXAMPLES[baseLang(langOf(self._hass))] || EXAMPLES.en;
          var t = (self._config.calendar_types || []).concat(JSON.parse(JSON.stringify(ex)));
          self._emit(self._clean(Object.assign({}, self._config, { calendar_types: t })));
        });
      }
      var rowsEl = this._typesPanel.querySelector('#rows');
      if (this._rowsKey !== types.length) {
        this._rowsKey = types.length;
        rowsEl.innerHTML = ''; this._rows = [];
        types.forEach(function (t, i) {
          var row = document.createElement('div'); row.className = 'row';
          var f = document.createElement('ha-form');
          f.hass = self._hass;
          f.computeLabel = function (s) { return L(s.name); };
          f.schema = [{ type: 'grid', name: '', schema: [
            { name: 'pattern', selector: { text: {} } }, { name: 'label', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } }, { name: 'color', selector: { color_rgb: {} } }
          ] }];
          f.addEventListener('value-changed', function (ev) {
            ev.stopPropagation();
            var list = (self._config.calendar_types || []).slice();
            list[i] = Object.assign({}, list[i], ev.detail.value);
            self._emit(self._clean(Object.assign({}, self._config, { calendar_types: list })));
          });
          var del = document.createElement('button');
          del.className = 'icon del'; del.title = L('remove'); del.innerHTML = '<ha-icon icon="mdi:delete-outline"></ha-icon>';
          del.addEventListener('click', function () {
            var list = (self._config.calendar_types || []).slice(); list.splice(i, 1);
            self._emit(self._clean(Object.assign({}, self._config, { calendar_types: list })));
          });
          row.appendChild(f); row.appendChild(del); rowsEl.appendChild(row);
          self._rows.push(f);
        });
      }
      types.forEach(function (t, i) {
        var f = self._rows[i]; if (!f) return;
        f.hass = self._hass;
        f.data = Object.assign({ pattern: '', label: '', icon: 'mdi:calendar-star' }, t, { color: rgbArr(rgb(t.color, '95,243,255')) });
      });
    }
  }

  /* ================================================================ registration */

  customElements.define(CARD, GlassClockWeatherCard);
  customElements.define(EDITOR, GlassClockWeatherCardEditor);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: CARD, name: 'Glass Clock Weather Card', preview: true, documentationURL: REPO,
    description: 'A big, glanceable clock with animated weather, daily forecast, indoor temperature and calendar chips.'
  });
  console.info('%c GLASS-CLOCK-WEATHER-CARD %c ' + VERSION + ' ', 'color:#0b0f1a;background:#5ff3ff;font-weight:700;border-radius:4px 0 0 4px', 'color:#5ff3ff;background:#0b0f1a;border-radius:0 4px 4px 0');
})();
