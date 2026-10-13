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
    return 'https://api.open-meteo.com/v1/forecast?latitude=' + round(lat) + '&longitude=' + round(lon) + '&current=temperature_2m,apparent_temperature,weather_code&timezone=auto';
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
  function searchUrl(name) {
    return 'https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=' + encodeURIComponent(placeQuery(name));
  }
  /**
   * @param {Object} json The answer from forecastUrl.
   * @returns {?{kind: string, temp: number, feels: number}} The weather now, or null when the answer is not usable.
   */
  function parse(json) {
    var c = json && json.current;
    if (!c || !isFinite(+c.temperature_2m) || !isFinite(+c.weather_code)) return null;
    var feels = isFinite(+c.apparent_temperature) ? +c.apparent_temperature : +c.temperature_2m;
    return { kind: classify(c.weather_code, c.temperature_2m, feels), temp: Math.round(+c.temperature_2m), feels: Math.round(feels) };
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

  root.Weather = { KINDS: KINDS, ORDER: ORDER, classify: classify, round: round, forecastUrl: forecastUrl, searchUrl: searchUrl, placeQuery: placeQuery, parse: parse, parsePlace: parsePlace };
})(typeof self !== 'undefined' ? self : globalThis);
