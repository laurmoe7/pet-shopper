/* Bonuses: the daily gift boxes and the special-day calendar.
 * Everything you would want to tweak is a plain list in this file:
 *   PRIZES  the prize tables (a box picks one prize by weight; `weight` is how common it is)
 *   BOXES   the kinds of box: how they look and which prize table they use
 *   DAYS    the special days: holidays, the pet owner's birthday and anything else. Each gives extra boxes that day.
 * A day says when it happens in one of these ways:
 *   { month: 12, day: 25 }                       the same date every year (add `days: 3` to last several days)
 *   { easter: 0 }                                days from Easter Sunday (Good Friday is -2, Easter Monday 1)
 *   { nth: [11, 4, 4] }                          the 4th Thursday of November: [month, weekday 0=Sunday..6, which one; -1 is the last]
 *   { birthday: true }                           the birthday saved on the pet (pet.birthday, "MM-DD")
 * and may set: boxes (how many extra boxes, default 1), box (a key of BOXES, default 'special'), line (what Nibble says).
 * The prizes are placeholders for now: they are only counted in pet.prizes. Replace them (and give `kind` and more fields) when real ones exist.
 */
(function (root) {
  'use strict';

  /** Placeholder prizes. `emoji` is a character that has a file in emoji/. */
  var PRIZES = {
    daily: [
      { id: 'star', label: 'Star sticker', emoji: '⭐', weight: 10 },
      { id: 'candy', label: 'Candy', emoji: '🍬', weight: 10 },
      { id: 'cookie', label: 'Cookie', emoji: '🍪', weight: 8 },
      { id: 'berry', label: 'Strawberry', emoji: '🍓', weight: 8 },
      { id: 'ribbon', label: 'Ribbon', emoji: '🎀', weight: 4 },
      { id: 'cupcake', label: 'Cupcake (rare)', emoji: '🧁', weight: 1 }
    ],
    party: [
      { id: 'popper', label: 'Party popper', emoji: '🎉', weight: 8 },
      { id: 'balloon', label: 'Balloon', emoji: '🎈', weight: 8 },
      { id: 'cake', label: 'Cake', emoji: '🎂', weight: 5 },
      { id: 'ribbon', label: 'Ribbon', emoji: '🎀', weight: 5 },
      { id: 'cupcake', label: 'Cupcake (rare)', emoji: '🧁', weight: 3 },
      { id: 'star', label: 'Star sticker', emoji: '⭐', weight: 3 }
    ]
  };

  /** The kinds of box. `colour` and `ribbon` are used to draw it. */
  var BOXES = {
    daily: { label: 'Daily box', colour: '#ffb3c7', ribbon: '#fff6ec', table: 'daily' },
    special: { label: 'Special box', colour: '#ffd36e', ribbon: '#ff8fb1', table: 'party' },
    birthday: { label: 'Birthday box', colour: '#b69cff', ribbon: '#ffe6b8', table: 'party' }
  };

  /** The special days. Add a line to add a day. */
  var DAYS = [
    { id: 'newyear', label: "New Year's Day", month: 1, day: 1 },
    { id: 'valentine', label: "Valentine's Day", month: 2, day: 14 },
    { id: 'goodfriday', label: 'Good Friday', easter: -2, boxes: 1 },
    { id: 'easter', label: 'Easter', easter: 0, boxes: 2 },
    { id: 'easter2', label: 'Easter Monday', easter: 1 },
    { id: 'kingsday', label: "King's Day", month: 4, day: 27 },
    { id: 'halloween', label: 'Halloween', month: 10, day: 31 },
    { id: 'sinterklaas', label: 'Sinterklaas', month: 12, day: 5 },
    { id: 'xmas', label: 'Christmas', month: 12, day: 24, days: 3, boxes: 2 },
    { id: 'nye', label: "New Year's Eve", month: 12, day: 31 },
    { id: 'birthday', label: 'Birthday!', birthday: true, box: 'birthday', boxes: 3, line: 'happy birthday!! ♡' }
  ];

  /** @returns {string} The day as YYYY-MM-DD, by the local clock. */
  function dayKey(d) { return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate(); }
  /** @returns {Date} Easter Sunday of a year (the Gregorian calendar). */
  function easterOf(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  /** @returns {boolean} Whether a day of the calendar falls on this date. @param {Object} day @param {Date} date @param {string} [birthday] "MM-DD" */
  function falls(day, date, birthday) {
    var y = date.getFullYear(), start;
    if (day.birthday) return !!birthday && birthday === dayKey(date).slice(5);
    if (typeof day.easter === 'number') start = easterOf(y), start.setDate(start.getDate() + day.easter);
    else if (day.nth) {
      var m = day.nth[0] - 1, wd = day.nth[1], n = day.nth[2];
      if (n > 0) start = new Date(y, m, 1 + ((wd - new Date(y, m, 1).getDay() + 7) % 7) + (n - 1) * 7);
      else { var last = new Date(y, m + 1, 0); start = new Date(y, m, last.getDate() - ((last.getDay() - wd + 7) % 7)); }
    } else start = new Date(y, day.month - 1, day.day);
    var span = day.days || 1;
    for (var i = 0; i < span; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (dayKey(d) === dayKey(date)) return true;
    }
    return false;
  }
  /** @returns {Object[]} The special days that fall on this date. */
  function specialDays(date, birthday) {
    return DAYS.filter(function (d) { return falls(d, date, birthday); });
  }
  /** @returns {{key: string, box: string, label: string, day: ?string}[]} The boxes for a date: the daily one, then the special-day ones. */
  function boxesFor(date, birthday) {
    var out = [{ key: 'daily', box: 'daily', label: BOXES.daily.label, day: null }];
    specialDays(date, birthday).forEach(function (d) {
      for (var i = 0; i < (d.boxes || 1); i++) out.push({ key: d.id + '#' + (i + 1), box: d.box || 'special', label: d.label, day: d.id });
    });
    return out;
  }
  /** @returns {Object[]} The boxes for this date that have not been opened yet. @param {Object} profile The pet's profile. */
  function unopened(profile, date, birthday) {
    var done = (profile.gifts && profile.gifts[dayKey(date)]) || [];
    return boxesFor(date, birthday).filter(function (b) { return done.indexOf(b.key) === -1; });
  }
  /** @returns {Object} One prize from a table, by weight. @param {string} table @param {function(): number} [rng] */
  function rollPrize(table, rng) {
    var list = PRIZES[table] || PRIZES.daily, total = list.reduce(function (n, p) { return n + p.weight; }, 0), r = (rng || Math.random)() * total;
    for (var i = 0; i < list.length; i++) { r -= list[i].weight; if (r < 0) return list[i]; }
    return list[list.length - 1];
  }
  /**
   * Opens a box: picks the prize, counts it in profile.prizes and remembers the box as opened today.
   * @returns {?{prize: Object, box: Object}} Null if there is no such box today or it is already open.
   */
  function open(profile, key, date, birthday, rng) {
    var box = unopened(profile, date, birthday).filter(function (b) { return b.key === key; })[0];
    if (!box) return null;
    var prize = rollPrize(BOXES[box.box].table, rng), today = dayKey(date);
    if (!profile.gifts) profile.gifts = {};
    (profile.gifts[today] = profile.gifts[today] || []).push(key);
    Object.keys(profile.gifts).sort().slice(0, -14).forEach(function (k) { delete profile.gifts[k]; });   // only the last two weeks are kept
    if (!profile.prizes) profile.prizes = {};
    profile.prizes[prize.id] = (profile.prizes[prize.id] || 0) + 1;
    return { prize: prize, box: box };
  }
  /** @returns {?{day: Object, date: Date, inDays: number}} The next special day after today (for "coming up"). */
  function nextSpecial(date, birthday) {
    for (var i = 1; i <= 366; i++) {
      var d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + i), hit = specialDays(d, birthday)[0];
      if (hit) return { day: hit, date: d, inDays: i };
    }
    return null;
  }

  root.Bonuses = { PRIZES: PRIZES, BOXES: BOXES, DAYS: DAYS, dayKey: dayKey, easterOf: easterOf, specialDays: specialDays, boxesFor: boxesFor, unopened: unopened, rollPrize: rollPrize, open: open, nextSpecial: nextSpecial };
})(typeof self !== 'undefined' ? self : globalThis);
