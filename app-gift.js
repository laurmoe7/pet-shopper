// Daily gifts: a mystery box every day, and extra boxes on special days (holidays, the birthday). What counts as a special day
// and what is in the boxes is all in bonuses.js (plain lists, easy to add to); this file is only the page part.
// The prizes are placeholders for now: they are counted in pet.prizes and shown in the sheet's collection.
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
/** Shows or hides the gift on the stage: it waits there while any box for today is still shut. */
function refreshGift() {
  var left = B.unopened(state.pet, giftDate(), state.player.birthday).length;
  var st = giftEl.parentNode, quiet = st.classList.contains('bedtime') || st.classList.contains('night-lamp');   // (the stage; app-idle.js comes later)
  giftEl.hidden = !left || quiet;
  giftEl.querySelector('.gift-count').textContent = left > 1 ? String(left) : '';
  giftEl.setAttribute('aria-label', 'Gift: ' + left + (left === 1 ? ' box' : ' boxes') + ' to open');
}
/** Draws the sheet: today's boxes (shut ones to tap, open ones greyed), what is coming up, the collection and the birthday. */
function renderGifts() {
  var date = giftDate(), all = B.boxesFor(date, state.player.birthday), shut = B.unopened(state.pet, date, state.player.birthday).map(function (b) { return b.key; });
  var specials = B.specialDays(date, state.player.birthday);
  $('giftDay').textContent = specials.length ? '✦ ' + specials.map(function (d) { return d.label; }).join(' & ') + ' ✦' : 'Come back every day for a new box.';
  giftBoxes.replaceChildren.apply(giftBoxes, all.map(function (b) {
    var btn = document.createElement('button'), kind = B.BOXES[b.box];
    btn.type = 'button';
    btn.className = 'gift-box' + (shut.indexOf(b.key) === -1 ? ' opened' : '');
    btn.dataset.key = b.key;
    btn.disabled = shut.indexOf(b.key) === -1;
    btn.innerHTML = giftSvg(kind.colour, kind.ribbon) + '<span></span>';
    btn.lastChild.textContent = b.day ? b.label : kind.label;
    return btn;
  }));
  var next = B.nextSpecial(date, state.player.birthday);
  $('giftNext').textContent = next ? 'Coming up: ' + next.day.label + ' ' + (next.inDays === 1 ? 'tomorrow' : 'in ' + next.inDays + ' days') : '';
  var prizes = state.pet.prizes || {}, known = {};
  Object.keys(B.PRIZES).forEach(function (t) { B.PRIZES[t].forEach(function (p) { known[p.id] = p; }); });
  var got = Object.keys(prizes).filter(function (id) { return known[id]; });
  $('giftPrizes').replaceChildren.apply($('giftPrizes'), got.map(function (id) {
    var chip = document.createElement('span'), p = known[id];
    chip.className = 'gift-chip';
    chip.title = p.label;
    chip.append(emojiImg(p.emoji, p.label), document.createTextNode('×' + prizes[id]));
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
    btn.replaceChildren();
    btn.append(emojiImg(got.prize.emoji, got.prize.label), Object.assign(document.createElement('span'), { textContent: got.prize.label }));
    if (!got.prize.real) btn.append(Object.assign(document.createElement('b'), { className: 'gift-placeholder', textContent: 'placeholder' }));   // until a prize has `real: true` (bonuses.js)
    sound('party');
    var day = got.box.day && B.DAYS.filter(function (d) { return d.id === got.box.day; })[0];
    if (!busy && baseState() !== 'sleepy') {
      pulse(isTired() ? 'hopsmall' : 'hop', 500);
      say((day && day.line) || pick(['ooh, what is it?', 'a present!', 'thank you! ♡', 'so exciting!']), 1600);
    }
    setTimeout(function () { renderGifts(); refreshGift(); }, 1800);   // the sheet settles back, with the collection updated
  }, 600);
});
giftEl.addEventListener('click', function (e) { e.stopPropagation(); renderGifts(); openDialog(giftSheet); });
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
  delete state.pet.gifts[B.dayKey(giftDate())];
  refreshGift();
  return 'Today\'s boxes are shut again.';
}

refreshGift();
setInterval(refreshGift, 60000);   // a new day brings a new box, even with the app left open
