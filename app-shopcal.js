// The Shop's special-days calendar (build 628): a month grid showing the special days, the celebrations Fumu plays and the extra gift boxes (bonuses.js), a note for the tapped day and a list of
// what is coming up. It lives in a tab of the Shop sheet, which is a temporary home: it is meant to carry the login bonuses and such later. Nothing here changes any data.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var scYear = 0, scMonth = 0, scPicked = null;   // (the month on show and the day tapped)
/** @returns {boolean} Whether the app is showing in Dutch. */
function scNl() { return typeof Lang === 'object' && Lang.get() === 'nl'; }
/** @returns {string} The English or the Dutch wording. @param {string} en @param {string} nl */
function scText(en, nl) { return scNl() ? nl : en; }
/** @returns {string} The language code for dates. */
function scLocale() {
  var loc = scNl() ? 'nl-NL' : (navigator.language || 'en-US');
  try { new Intl.DateTimeFormat(loc); return loc; } catch (e) { return scNl() ? 'nl-NL' : 'en-US'; }   // (a made-up or broken language tag must not break the page)
}
/** @returns {{names: string[], parties: string[], extra: number, gifts: string[]}} What a date brings: the special days, the celebrations and the gift hats (`extra` of them, in a box each). @param {Date} d */
function scDay(d) {
  var days = B.specialDays(d, state.player.birthday), boxes = B.boxesFor(d, state.player.birthday);
  return {
    names: days.map(function (x) { return x.label; }),
    parties: days.filter(function (x) { return x.party; }).map(function (x) { return x.party; }),
    extra: boxes.length,
    gifts: boxes.map(function (b) { return b.hatLabel; })
  };
}
/** Draws the month grid (weeks start on Monday). */
function scRenderGrid() {
  var first = new Date(scYear, scMonth, 1), lead = (first.getDay() + 6) % 7, daysIn = new Date(scYear, scMonth + 1, 0).getDate(), today = giftDate(), grid = $('scGrid'), cells = [];
  var wk = new Date(2024, 0, 1);   // (a Monday)
  for (var i = 0; i < 7; i++) { var h = document.createElement('span'); h.className = 'sc-wd'; h.textContent = new Date(2024, 0, 1 + i).toLocaleDateString(scLocale(), { weekday: 'narrow' }); cells.push(h); }
  for (var l = 0; l < lead; l++) { var e = document.createElement('span'); e.className = 'sc-empty'; cells.push(e); }
  for (var n = 1; n <= daysIn; n++) {
    var d = new Date(scYear, scMonth, n), info = scDay(d), b = document.createElement('button'), num = document.createElement('span'), dots = document.createElement('span');
    b.type = 'button'; b.className = 'sc-day'; b.dataset.d = n;
    if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()) b.classList.add('today');
    if (info.names.length) b.classList.add('special');
    if (scPicked && scPicked.getTime() === d.getTime()) b.classList.add('picked');
    num.className = 'sc-num'; num.textContent = n;
    dots.className = 'sc-dots';
    if (info.parties.length) dots.appendChild(Object.assign(document.createElement('i'), { className: 'sc-dot sc-party' }));
    if (info.extra > 0) dots.appendChild(Object.assign(document.createElement('i'), { className: 'sc-dot sc-gift' }));
    b.append(num, dots);
    b.setAttribute('aria-label', d.toLocaleDateString(scLocale(), { day: 'numeric', month: 'long' }) + (info.names.length ? ': ' + info.names.join(', ') : ''));
    cells.push(b);
  }
  grid.replaceChildren.apply(grid, cells);
  $('scMonth').textContent = first.toLocaleDateString(scLocale(), { month: 'long', year: 'numeric' });
}
/** Writes what the tapped (or today's) date brings. */
function scRenderDetail() {
  var d = scPicked || giftDate(), info = scDay(d), box = $('scDetail'), head = document.createElement('b'), lines = [];
  head.textContent = d.toLocaleDateString(scLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  if (info.names.length) lines.push(info.names.join(' · '));
  if (info.parties.length) lines.push('🎉 ' + info.parties.map(function (p) { return T(p); }).join(', '));
  if (info.gifts.length) lines.push('🎁 ' + info.gifts.map(function (g) { return T(g); }).join(', ') + ' ' + scText('(in a gift box)', '(in een cadeaudoos)'));
  var els = [head].concat(lines.map(function (t) { var p = document.createElement('span'); p.textContent = t; return p; }));
  box.replaceChildren.apply(box, els);
}
/** Lists the next special dates from today on, one row each, with what they bring (a day that goes on for several dates, like Christmas, shows its first date and the date of its celebration). */
function scRenderUp() {
  var rows = [], prev = {}, base = giftDate(), up = $('scUp');
  for (var i = 0; i <= 400 && rows.length < 6; i++) {
    var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i), days = B.specialDays(d, state.player.birthday), ids = {};
    days.forEach(function (x) { ids[x.id] = 1; });
    var mains = days.filter(function (x) { return true; }), info = scDay(d);
    var fresh = mains.some(function (x) { return !prev[x.id]; });   // (not just the next date of a day that began yesterday)
    prev = ids;
    if (!days.length || (!fresh && !info.parties.length)) continue;
    var name = document.createElement('b'), when = document.createElement('span'), tags = document.createElement('span'), row = document.createElement('div');
    row.className = 'sc-row';
    name.textContent = (info.parties.length ? '🎉 ' : '🎁 ') + (mains.length ? mains : days).map(function (x) { return T(x.label); }).filter(function (v, k, a) { return a.indexOf(v) === k; }).join(' · ');
    when.textContent = d.toLocaleDateString(scLocale(), { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + (i === 0 ? scText('today', 'vandaag') : i === 1 ? scText('tomorrow', 'morgen') : scText('in ' + i + ' days', 'over ' + i + ' dagen'));
    tags.className = 'sc-tags';
    tags.textContent = info.parties.map(function (p) { return T(p); }).join(', ') + (info.parties.length && info.gifts.length ? ' · ' : '') + (info.gifts.length ? '🎁 ' + info.gifts.map(function (g) { return T(g); }).join(', ') : '');
    row.append(name, when);
    if (tags.textContent) row.append(tags);
    rows.push(row);
  }
  up.replaceChildren.apply(up, rows);
}
/** Draws the whole calendar tab. */
function renderShopCal() {
  if (!scYear) { var t = giftDate(); scYear = t.getFullYear(); scMonth = t.getMonth(); }
  scRenderGrid(); scRenderDetail(); scRenderUp();
  $('scLegParty').textContent = scText('celebration', 'viering'); $('scLegGift').textContent = scText('gift hat', 'cadeauhoed');
}
/** Shows one of the Shop's two tabs. @param {'cal'|'store'} tab */
function showShopTab(tab) {
  [].forEach.call($('shopTabs').children, function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
  $('shopCal').hidden = tab !== 'cal';
  $('shopStore').hidden = tab !== 'store';
  if (tab === 'cal') renderShopCal();
}
$('shopTabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; sound('tap'); showShopTab(b.dataset.tab); });
$('scPrev').addEventListener('click', function () { sound('tap'); scMonth--; if (scMonth < 0) { scMonth = 11; scYear--; } scPicked = null; renderShopCal(); });
$('scNext').addEventListener('click', function () { sound('tap'); scMonth++; if (scMonth > 11) { scMonth = 0; scYear++; } scPicked = null; renderShopCal(); });
$('scGrid').addEventListener('click', function (e) {
  var b = e.target.closest('.sc-day');
  if (!b) return;
  sound('tap');
  scPicked = new Date(scYear, scMonth, +b.dataset.d);
  renderShopCal();
});
// the Shop opens on its shop tab, with the calendar one tap away (its own button handler, in app-shop.js, draws the shop tab and opens the sheet)
$('shopBtn').addEventListener('click', function () { var t = giftDate(); scYear = t.getFullYear(); scMonth = t.getMonth(); scPicked = null; showShopTab('store'); $('shopPanels').scrollTop = 0; });
