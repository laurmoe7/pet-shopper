/* Weather: what Fumu does about the weather outside (build 633). Plain data and pure functions, like bonuses.js; the page part is app-weather.js.
 * The weather comes from Open-Meteo (free, no key). The player turns it on in Options and gives a place (a typed city, or the device's own position); only a rounded
 * position is ever sent (about 10 km), and nothing is sent while the switch is off.
 */
(function (root) {
  'use strict';

  /** The kinds of weather he reacts to, with what he says (his own line, picked at random) and the Dutch is in app-dutch.js. */
  var KINDS = {
    clear: { label: 'Clear', lines: [] },
    rain: { label: 'Rain', lines: ['it is raining~', 'pitter patter!', 'good thing I have my leaf', 'puddles!'] },
    storm: { label: 'Storm', lines: ['whoa, thunder!', 'stay cozy, okay?', 'the sky is grumpy today'] },
    snow: { label: 'Snow', lines: ['it is snowing!', 'brrr, so pretty', 'snowflakes!'] },
    cold: { label: 'Cold', lines: ['brrr, it is chilly', 'bundle up, okay?', 'so cold today!'] },
    hot: { label: 'Hot', lines: ['so warm~', 'phew, hot today!', 'fan fan fan', 'ice cream weather?'] }
  };
  var ORDER = ['clear', 'rain', 'storm', 'snow', 'cold', 'hot'];

  /**
   * What the weather is, in the few kinds he reacts to.
   * @param {number} code WMO weather code (Open-Meteo `weather_code`).
   * @param {number} temp Air temperature, degrees C.
   * @param {number} [feels] What it feels like, degrees C (the wind makes it colder); the temperature when missing.
   * @returns {'clear'|'rain'|'storm'|'snow'|'cold'|'hot'}
   */
  function classify(code, temp, feels) {
    code = +code; temp = +temp;
    var f = isFinite(+feels) && feels !== null && feels !== undefined && feels !== '' ? +feels : temp;
    if (code >= 95 && code <= 99) return 'storm';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if (isFinite(f) && f <= 3) return 'cold';
    if (isFinite(temp) && (temp >= 27 || f >= 29)) return 'hot';
    return 'clear';
  }
  /** @returns {number} A coordinate rounded to one decimal (about 10 km): all the weather needs, and all that is ever sent. */
  function round(n) { return Math.round(+n * 10) / 10; }
  /** @returns {string} The address that asks for the weather now at a place. */
  function forecastUrl(lat, lon) {
    return 'https://api.open-meteo.com/v1/forecast?latitude=' + round(lat) + '&longitude=' + round(lon) + '&current=temperature_2m,apparent_temperature,weather_code&hourly=temperature_2m,apparent_temperature,weather_code&forecast_days=1&timezone=auto';
  }
  /**
   * @param {string} text What was typed: a city or a postcode.
   * @returns {string} What to look up: a Dutch postcode loses its two letters (1011 AB: 1011) and a UK one its last part (SW1A 1AA: SW1A), since the place list knows the short forms.
   */
  function placeQuery(text) {
    var t = String(text || '').trim().slice(0, 60), m = /^(\d{4})\s?[A-Za-z]{2}$/.exec(t) || /^([A-Za-z]{1,2}\d[A-Za-z\d]?)\s*\d[A-Za-z]{2}$/.exec(t);
    return m ? m[1] : t;
  }
  /** @returns {string} The address that looks a place name or postcode up (a few matches, so a postcode can pick the right one). */
  function searchUrl(name, count) {
    return 'https://geocoding-api.open-meteo.com/v1/search?count=' + (count || 5) + '&language=en&format=json&name=' + encodeURIComponent(placeQuery(name));
  }
  /**
   * @param {Object} json The answer from forecastUrl.
   * @returns {?{kind: string, temp: number, feels: number}} The weather now, or null when the answer is not usable.
   */
  function parse(json) {
    var c = json && json.current;
    if (!c || !isFinite(+c.temperature_2m) || !isFinite(+c.weather_code)) return null;
    var feels = isFinite(+c.apparent_temperature) ? +c.apparent_temperature : +c.temperature_2m;
    var kind = classify(c.weather_code, c.temperature_2m, feels), out = { kind: kind, temp: Math.round(+c.temperature_2m), feels: Math.round(feels) };
    var later = laterToday(json.hourly, c.time, kind);
    if (later) out.later = later;
    return out;
  }
  /** How much a kind is worth mentioning when several come later today (a storm before snow before rain, and so on). */
  var SEVERITY = { storm: 5, snow: 4, rain: 3, hot: 2, cold: 1 };
  /**
   * @param {Object} hourly The `hourly` part of the answer (lists of local times, codes and temperatures for today).
   * @param {string} now The local time of the current weather (2026-10-13T14:15).
   * @param {string} kind The weather now.
   * @returns {?{kind: string, hour: number}} The most notable special weather (rain, storm, snow, hot, cold) later today that is not already happening, with the hour it starts; null when there is none.
   */
  function laterToday(hourly, now, kind) {
    var times = hourly && hourly.time, codes = hourly && hourly.weather_code;
    if (!times || !codes || typeof now !== 'string') return null;
    var from = now.slice(0, 13), best = null;
    for (var i = 0; i < times.length; i++) {
      var t = String(times[i]);
      if (t.slice(0, 10) !== now.slice(0, 10) || t.slice(0, 13) <= from || !isFinite(+codes[i])) continue;
      var temp = hourly.temperature_2m ? hourly.temperature_2m[i] : NaN, feels = hourly.apparent_temperature ? hourly.apparent_temperature[i] : temp;
      var k = classify(codes[i], temp, feels);
      if (k === 'clear' || k === kind || !SEVERITY[k]) continue;
      if (!best || SEVERITY[k] > SEVERITY[best.kind]) best = { kind: k, hour: +t.slice(11, 13) };
    }
    return best;
  }
  /**
   * @param {{kind: string, hour: number}} later What laterToday found.
   * @param {boolean} [nl] In Dutch.
   * @returns {string} What he says about it ("rain this afternoon, take an umbrella~").
   */
  function laterWords(later, nl) {
    var h = later.hour, part = h < 12 ? 0 : h < 17 ? 1 : h < 21 ? 2 : 3;
    var en = ['this morning', 'this afternoon', 'this evening', 'tonight'][part], du = ['vanochtend', 'vanmiddag', 'vanavond', 'vannacht'][part];
    var lines = {
      rain: ['rain ' + en + ', take an umbrella~', 'regen ' + du + ', neem een paraplu mee~'],
      storm: ['a storm ' + en + ', stay cozy~', 'onweer ' + du + ', blijf lekker binnen~'],
      snow: ['snow ' + en + '!', 'sneeuw ' + du + '!'],
      hot: ['it gets hot ' + en + '~', 'het wordt heet ' + du + '~'],
      cold: ['it gets chilly ' + en + ', bundle up~', 'het wordt koud ' + du + ', trek iets warms aan~']
    };
    var l = lines[later.kind];
    return l ? l[nl ? 1 : 0] : '';
  }
  /**
   * @param {Object} json The answer from searchUrl.
   * @param {string} [typed] What was typed: when it is a postcode, the first place that lists it wins.
   * @returns {?{lat: number, lon: number, place: string}} The place found (the position rounded), or null.
   */
  function parsePlace(json, typed) {
    var list = (json && json.results) || [], code = placeQuery(typed).toLowerCase();
    var r = (code && list.filter(function (x) { return (x.postcodes || []).some(function (c) { return String(c).toLowerCase() === code; }); })[0]) || (/^\d+$/.test(code) ? null : list[0]);   // (a number that no place lists is not a place)
    if (!r || !isFinite(+r.latitude) || !isFinite(+r.longitude)) return null;
    return { lat: round(r.latitude), lon: round(r.longitude), place: [r.name, r.country].filter(Boolean).join(', ').slice(0, 60) };
  }

  /**
   * @param {Object} json The answer from searchUrl.
   * @param {string} [typed] What was typed (a postcode puts the places that list it first).
   * @returns {{lat: number, lon: number, place: string}[]} The places found, each named with its region and country (Grove City, Pennsylvania, United States), for a pick list.
   */
  function parsePlaces(json, typed) {
    var list = ((json && json.results) || []).filter(function (r) { return isFinite(+r.latitude) && isFinite(+r.longitude); }), code = placeQuery(typed).toLowerCase();
    function has(r) { return (r.postcodes || []).some(function (c) { return String(c).toLowerCase() === code; }); }
    if (code) list = list.filter(has).concat(list.filter(function (r) { return !has(r); }));
    var seen = {};
    return list.map(function (r) {
      var parts = [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : '', r.country].filter(Boolean);
      return { lat: round(r.latitude), lon: round(r.longitude), place: parts.join(', ').slice(0, 60) };
    }).filter(function (p) { if (seen[p.place]) return false; seen[p.place] = 1; return true; });
  }

  root.Weather = { parsePlaces: parsePlaces, KINDS: KINDS, ORDER: ORDER, classify: classify, round: round, forecastUrl: forecastUrl, searchUrl: searchUrl, placeQuery: placeQuery, parse: parse, laterToday: laterToday, laterWords: laterWords, parsePlace: parsePlace };
})(typeof self !== 'undefined' ? self : globalThis);
