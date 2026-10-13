// Holiday gifts: on a day Fumu celebrates (a holiday, the birthday) a gift box waits in Profile with the hat he wears in that celebration; opening it unlocks the hat. There are
// no daily boxes. What counts as a special day and which hat it brings is all in bonuses.js (plain lists, easy to add to); this file is only the page part.
// The unlocked hats are kept in pet.prizes (so they sync) and the dressing room reads them (`unlocked` in app-goals.js).
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var giftEl = $('gift'), giftSheet = $('giftSheet'), giftBoxes = $('giftBoxes'), devGiftDay = null;
var B = Bonuses;
/** @returns {Date} Today for the gifts: the real day, or the special day the developer tool is pretending. */
function giftDate() { return devGiftDay || petNow(); }
/** @returns {string} A small drawing of a gift box. @param {string} colour @param {string} ribbon */
function giftSvg(colour, ribbon) {
  return '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="20" width="36" height="24" rx="5" fill="' + colour + '" stroke="#5b4239" stroke-width="2.4"/>' +
    '<rect x="3" y="13" width="42" height="11" rx="4.5" fill="' + colour + '" stroke="#5b4239" stroke-width="2.4"/>' +
    '<path d="M24 13 V44" stroke="' + ribbon + '" stroke-width="6"/><path d="M24 13 C16 3 8 8 15 13 M24 13 C32 3 40 8 33 13" fill="none" stroke="#5b4239" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="19" cy="31" r="1.6" fill="#5b4239"/><circle cx="29" cy="31" r="1.6" fill="#5b4239"/><path d="M21.5 34 Q24 36.6 26.5 34" fill="none" stroke="#5b4239" stroke-width="1.6" stroke-linecap="round"/></svg>';
}
/** The gift is not on the stage (so it never has to fit around him): it waits in the Profile sheet, with a count on the Profile button. Set to true to bring it back. */
var GIFT_ON_STAGE = false;
/** Shows how many boxes for today are still shut: on the Profile button and in the Profile sheet (and on the stage when GIFT_ON_STAGE). */
function refreshGift() {
  var left = B.unopened(state.pet, giftDate(), state.player.birthday).length;
  var st = giftEl.parentNode, quiet = st.classList.contains('bedtime') || st.classList.contains('night-lamp');   // (the stage; app-idle.js comes later)
  var label = 'Gift: ' + left + (left === 1 ? ' box' : ' boxes') + ' to open';
  giftEl.hidden = !GIFT_ON_STAGE || !left || quiet;
  giftEl.querySelector('.gift-count').textContent = left > 1 ? String(left) : '';
  giftEl.setAttribute('aria-label', label);
  var badge = $('profileBadge'), mine = $('profileGift');
  badge.hidden = !left; badge.textContent = String(left);
  mine.hidden = !left; $('profileGiftCount').textContent = left > 1 ? String(left) : '';
  mine.setAttribute('aria-label', label);
  if (!mine.firstChild.firstChild) mine.firstChild.innerHTML = giftSvg('#ffb3c7', '#fff4d6');
  $('profileBtn').setAttribute('aria-label', 'Profile: your name and birthday' + (left ? ' (' + label + ')' : ''));
}
/** @returns {string} A small picture of a wardrobe hat (the one the dressing room button shows). @param {string} id */
function giftHatSvg(id) {
  var w = typeof wardrobeItem === 'function' ? wardrobeItem(id) : null;
  return w ? '<svg viewBox="' + (w.icon || '40 0 80 60') + '" aria-hidden="true">' + w.svg + '</svg>' : '';
}
/** @returns {?{day: Object, date: Date, inDays: number}} The next day, after today, that brings a gift hat. */
function nextGiftDay(date) {
  for (var i = 1; i <= 366; i++) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + i), hit = B.boxesFor(d, state.player.birthday)[0];
    if (hit) return { label: hit.label, inDays: i };
  }
  return null;
}
/** Draws the sheet: today's gift box (shut to tap, or open), when the next one comes, and the hats collected from gifts. */
function renderGifts() {
  var date = giftDate(), all = B.boxesFor(date, state.player.birthday), shut = B.unopened(state.pet, date, state.player.birthday).map(function (b) { return b.key; });
  $('giftDay').textContent = all.length ? '✦ ' + all.map(function (b) { return T(b.label); }).join(' & ') + ' ✦' : T('A gift box comes on every holiday Fumu celebrates.');
  giftBoxes.replaceChildren.apply(giftBoxes, all.map(function (b) {
    var btn = document.createElement('button'), kind = B.BOXES[b.box], isShut = shut.indexOf(b.key) !== -1;
    btn.type = 'button';
    btn.className = 'gift-box' + (isShut ? '' : ' opened');
    btn.dataset.key = b.key;
    btn.disabled = !isShut;
    btn.innerHTML = (isShut ? giftSvg(kind.colour, kind.ribbon) : giftHatSvg(b.hat)) + '<span></span>';
    btn.lastChild.textContent = isShut ? T(kind.label) : T(b.hatLabel);
    return btn;
  }));
  var next = nextGiftDay(date);
  $('giftNext').textContent = next ? T('Next gift') + ': ' + T(next.label) + ' ' + (next.inDays === 1 ? T('tomorrow') : T('in') + ' ' + next.inDays + ' ' + T('days')) : '';
  var got = B.DAYS.filter(function (d) { return d.hat && B.owns(state.pet, d.hat); });
  $('giftPrizes').replaceChildren.apply($('giftPrizes'), got.map(function (d) {
    var chip = document.createElement('span');
    chip.className = 'gift-chip gift-hat';
    chip.title = T(d.hatLabel);
    chip.innerHTML = giftHatSvg(d.hat);
    chip.appendChild(document.createTextNode(T(d.hatLabel)));
    return chip;
  }));
  $('giftPrizesLabel').hidden = !got.length;
  $('giftBdayHint').hidden = !!state.player.birthday;
}
giftBoxes.addEventListener('click', function (e) {
  var btn = e.target.closest('.gift-box');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.classList.add('shaking');
  sound('ooh');
  setTimeout(function () {
    var got = B.open(state.pet, btn.dataset.key, giftDate(), state.player.birthday);
    if (!got) { renderGifts(); return; }
    save();
    btn.classList.remove('shaking');
    btn.classList.add('opened');
    btn.innerHTML = giftHatSvg(got.prize.id) + '<span></span>';
    btn.lastChild.textContent = T(got.prize.label);
    sound('party');
    if (typeof refreshDressRoom === 'function') refreshDressRoom();
    if (typeof refreshLocks === 'function') refreshLocks();
    showToast('🎁', T('New hat') + ': ' + T(got.prize.label) + '!', true, 3200);
    var day = got.box.day && B.DAYS.filter(function (d) { return d.id === got.box.day; })[0];
    if (!busy && baseState() !== 'sleepy') {
      pulse(isTired() ? 'hopsmall' : 'hop', 500);
      say((day && day.line) || pick(['ooh, what is it?', 'a present!', 'thank you! ♡', 'so exciting!']), 1600);
    }
    setTimeout(function () { renderGifts(); refreshGift(); }, 1800);   // the sheet settles back, with the collection updated
  }, 600);
});
giftEl.addEventListener('click', function (e) { e.stopPropagation(); renderGifts(); openDialog(giftSheet); });
$('profileGift').addEventListener('click', function (e) { e.stopPropagation(); renderGifts(); openDialog(giftSheet); });
/** Developer tool: pretends it is the next special day in the calendar (and back to the real day after the last). @returns {string} What happened. */
function devGiftCalendar() {
  var days = B.DAYS.filter(function (d) { return !d.birthday; }), cur = devGiftDay ? devGiftDay.getFullYear() * 10000 + devGiftDay.getMonth() * 100 + devGiftDay.getDate() : 0;
  var found = null, from = devGiftDay || new Date();
  for (var i = 1; i <= 366 && !found; i++) {
    var d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    if (B.specialDays(d, '')[0] && !(devGiftDay && B.dayKey(d) === B.dayKey(devGiftDay))) found = d;
  }
  devGiftDay = found && days.length ? found : null;
  refreshGift();
  return devGiftDay ? 'Pretending it is ' + B.dayKey(devGiftDay) + ': ' + B.specialDays(devGiftDay, '').map(function (d) { return d.label; }).join(' & ') + '. Tap again for the next special day.' : 'Back to the real day.';
}
/** Developer tool: shuts today's boxes again. @returns {string} */
function devGiftReset() {
  B.boxesFor(giftDate(), state.player.birthday).forEach(function (b) { if (state.pet.prizes) delete state.pet.prizes[b.hat]; });   // (the hat is locked again too)
  delete state.pet.gifts[B.dayKey(giftDate())];
  if (typeof refreshLocks === 'function') refreshLocks();
  refreshGift();
  return 'Today\'s gift box is shut again (and its hat locked).';
}

/** A toast that today's gift box is waiting in Profile (when there is one). @param {string} [icon] */
function giftToast(icon) {
  refreshGift();
  if (!B.unopened(state.pet, giftDate(), state.player.birthday).length) return;
  showToast(icon || '🎁', T('A gift box is waiting in Profile!'), true, 4200);
}
/** What he says about it at the end of a celebration (nothing when there is no box to open). */
function giftSay() {
  if (!B.unopened(state.pet, giftDate(), state.player.birthday).length || busy > 1) return;
  say(T('there is a hat for you in your Profile~'), 2000);
}
/** Once a day, when the app (or Mini Fumu) is opened on a day with a gift box: a toast says so. */
function giftOpenToast() {
  var left = B.unopened(state.pet, giftDate(), state.player.birthday);
  if (!left.length) return;
  var key = B.dayKey(giftDate()) + left.map(function (b) { return b.key; }).join();
  try { if (localStorage.getItem('nibble-gift-toast') === key) return; localStorage.setItem('nibble-gift-toast', key); } catch (e) { /* storage blocked */ }
  setTimeout(function () { giftToast(); }, 3500);
}

refreshGift();
giftOpenToast();
setInterval(refreshGift, 60000);   // a new day can bring a box, even with the app left open
