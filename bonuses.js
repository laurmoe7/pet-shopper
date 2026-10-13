/* Bonuses: the holiday gift boxes and the special-day calendar.
 * A day of the year that Fumu celebrates (a `party`) also has a `hat`: the hat he wears in that celebration. Using the app (or Mini Fumu) on that day puts a gift box in Profile
 * with the hat in it; opening it unlocks the hat for the dressing room (it is kept in pet.prizes, which syncs). There are no daily boxes and no other prizes for now.
 * Everything you would want to tweak is a plain list in this file:
 *   BOXES   the kinds of box: how they look
 *   DAYS    the special days: holidays, the pet owner's birthday and anything else. A day with a `party` and a `hat` (a wardrobe id with `gift: true`) brings that hat in a box.
 * A day says when it happens in one of these ways:
 *   { month: 12, day: 25 }                       the same date every year (add `days: 3` to last several days)
 *   { easter: 0 }                                days from Easter Sunday (Good Friday is -2, Easter Monday 1)
 *   { nth: [11, 4, 4] }                          the 4th Thursday of November: [month, weekday 0=Sunday..6, which one; -1 is the last]
 *   { birthday: true }                           the player's birthday (state.player.birthday, "MM-DD")
 * and may set: party (the name of the celebration Fumu plays that day, shown in the Shop's calendar), hat + hatLabel + box (a key of BOXES) + line (what Fumu says when the box is opened).
 */
(function (root) {
  'use strict';

  /** The kinds of box. `colour` and `ribbon` are used to draw it. */
  var BOXES = {
    newyear: { label: "New Year's box", colour: '#ffd36e', ribbon: '#3fa7ff' },
    birthday: { label: 'Birthday box', colour: '#b69cff', ribbon: '#ffe6b8' },
    christmas: { label: 'Christmas box', colour: '#e8445a', ribbon: '#ffe08a' },
    halloween: { label: 'Halloween box', colour: '#ff9a3c', ribbon: '#8e5bff' },
    easter: { label: 'Easter box', colour: '#ffb3d9', ribbon: '#9be3c3' },
    kingsday: { label: "King's Day box", colour: '#ff8a1f', ribbon: '#fffaf0' }
  };

  /** The special days. Add a line to add a day. */
  var DAYS = [
    { id: 'newyear', label: "New Year's Day", month: 1, day: 1, party: "New Year's Day celebration", short: 'New Year', hat: 'newyearhat', hatLabel: 'New Year hat', box: 'newyear', line: 'happy new year! ♡' },
    { id: 'valentine', label: "Valentine's Day", month: 2, day: 14 },
    { id: 'goodfriday', label: 'Good Friday', easter: -2 },
    { id: 'easter', label: 'Easter', easter: 0, party: 'Easter celebration', short: 'Easter', hat: 'bunnyears', hatLabel: 'Easter ears', box: 'easter', line: 'happy easter! ♡' },
    { id: 'easter2', label: 'Easter Monday', easter: 1 },
    { id: 'kingsday', label: "King's Day", month: 4, day: 27, notSunday: true, party: "King's Day celebration", short: 'King\'s Day', hat: 'kingscrown', hatLabel: 'Golden crown', box: 'kingsday', line: "happy king's day! ♡" },   // (27 April, or the 26th when the 27th is a Sunday)
    { id: 'halloween', label: 'Halloween', month: 10, day: 31, party: 'Halloween celebration', short: 'Halloween', hat: 'witchhat', hatLabel: 'Witch hat', box: 'halloween', line: 'happy halloween! ♡' },
    { id: 'sinterklaas', label: 'Sinterklaas', month: 12, day: 5 },
    { id: 'xmas', label: 'Christmas', month: 12, day: 24, days: 3 },
    { id: 'xmasday', label: 'Christmas Day', month: 12, day: 25, party: 'Christmas celebration', short: 'Christmas', hat: 'santahat', hatLabel: 'Santa hat', box: 'christmas', line: 'merry christmas! ♡' },
    { id: 'nye', label: "New Year's Eve", month: 12, day: 31 },
    { id: 'birthday', label: 'Birthday!', birthday: true, party: 'Birthday celebration', short: 'Birthday', hat: 'partyhat', hatLabel: 'Party hat', box: 'birthday', line: 'happy birthday!! ♡' }
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
    } else { start = new Date(y, day.month - 1, day.day); if (day.notSunday && start.getDay() === 0) start.setDate(start.getDate() - 1); }
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
  /** @returns {{key: string, box: string, label: string, day: string, hat: string, hatLabel: string}[]} The gift boxes of a date: one for each celebration that day (the hat Fumu wears in it). */
  function boxesFor(date, birthday) {
    return specialDays(date, birthday).filter(function (d) { return d.hat; }).map(function (d) {
      return { key: d.id, box: d.box, label: d.label, day: d.id, hat: d.hat, hatLabel: d.hatLabel || d.hat };
    });
  }
  /** @returns {boolean} Whether a gift hat has been unlocked (its box opened). @param {Object} profile The pet's profile. @param {string} hat */
  function owns(profile, hat) { return !!(profile.prizes && profile.prizes[hat] > 0); }
  /** @returns {Object[]} The boxes for this date that have not been opened yet (a hat you already have needs no box). @param {Object} profile The pet's profile. */
  function unopened(profile, date, birthday) {
    return boxesFor(date, birthday).filter(function (b) { return !owns(profile, b.hat); });
  }
  /** @returns {?{day: Object, label: string}} The special day whose box holds a gift hat, if any. @param {string} hat */
  function dayOfHat(hat) {
    var d = DAYS.filter(function (x) { return x.hat === hat; })[0];
    return d ? { day: d, label: d.label, short: d.short || d.label } : null;
  }
  /**
   * Opens a box: the hat is unlocked (counted in profile.prizes) and the box is remembered as opened today.
   * @returns {?{prize: {id: string, label: string, hat: boolean}, box: Object}} Null if there is no such box today or it is already open.
   */
  function open(profile, key, date, birthday) {
    var box = unopened(profile, date, birthday).filter(function (b) { return b.key === key; })[0];
    if (!box) return null;
    var today = dayKey(date);
    if (!profile.gifts) profile.gifts = {};
    (profile.gifts[today] = profile.gifts[today] || []).push(key);
    Object.keys(profile.gifts).sort().slice(0, -14).forEach(function (k) { delete profile.gifts[k]; });   // only the last two weeks are kept
    if (!profile.prizes) profile.prizes = {};
    profile.prizes[box.hat] = (profile.prizes[box.hat] || 0) + 1;
    return { prize: { id: box.hat, label: box.hatLabel, hat: true }, box: box };
  }
  /** @returns {?{day: Object, date: Date, inDays: number}} The next special day after today (for "coming up"). */
  function nextSpecial(date, birthday) {
    for (var i = 1; i <= 366; i++) {
      var d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + i), hit = specialDays(d, birthday)[0];
      if (hit) return { day: hit, date: d, inDays: i };
    }
    return null;
  }

  root.Bonuses = { BOXES: BOXES, DAYS: DAYS, dayKey: dayKey, easterOf: easterOf, specialDays: specialDays, boxesFor: boxesFor, unopened: unopened, owns: owns, dayOfHat: dayOfHat, open: open, nextSpecial: nextSpecial };
})(typeof self !== 'undefined' ? self : globalThis);
