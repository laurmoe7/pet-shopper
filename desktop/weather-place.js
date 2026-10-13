// Looking a place up for the weather (the settings window's Weather section): plain functions with no Electron in them, so they can be tested in Node.
// The same lookup as weather.js does in the page (Open-Meteo's place list); only the typed name is sent, and only a position rounded to 0.1 degree is kept.
'use strict';

/** @returns {number} A coordinate rounded to one decimal (about 10 km). */
function round(n) { return Math.round(+n * 10) / 10; }
/** @returns {string} The address that looks a place name or postcode up. */
function searchUrl(name, count) {
  const t = String(name || '').trim().slice(0, 60);
  const m = /^(\d{4})\s?[A-Za-z]{2}$/.exec(t) || /^([A-Za-z]{1,2}\d[A-Za-z\d]?)\s*\d[A-Za-z]{2}$/.exec(t);   // (a postcode: the short form is the one the place list knows)
  return 'https://geocoding-api.open-meteo.com/v1/search?count=' + (count || 5) + '&language=en&format=json&name=' + encodeURIComponent(m ? m[1] : t);
}
/** @returns {{lat: number, lon: number, place: string}[]} The places found, each named with its region and country, for a pick list. */
function parse(json) {
  const list = ((json && json.results) || []).filter((r) => isFinite(+r.latitude) && isFinite(+r.longitude)), seen = {};
  return list.map((r) => ({ lat: round(r.latitude), lon: round(r.longitude), place: [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : '', r.country].filter(Boolean).join(', ').slice(0, 60) }))
    .filter((p) => (seen[p.place] ? false : (seen[p.place] = true)));
}
/** @returns {?{on: boolean, lat: number, lon: number, place: string}} What the weather setting should be, or null when it is not usable (a made-up value never gets stored). */
function clean(w) {
  if (!w || typeof w !== 'object') return null;
  const lat = +w.lat, lon = +w.lon, has = w.lat !== null && w.lon !== null && w.lat !== undefined && w.lon !== undefined && isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  return { on: !!w.on, lat: has ? round(lat) : null, lon: has ? round(lon) : null, place: String(w.place || '').slice(0, 60) };
}
module.exports = { searchUrl, parse, clean, round };
