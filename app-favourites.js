// The Top 10 (shown in the Profile sheet): what you buy most, with a quick way to put it back on the list.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var favList = $('favList'), favEmpty = $('favEmpty');

/** @returns {boolean} Whether an unticked item with this favourite's word is already on the list. */
function onList(fav) {
  return state.items.some(function (i) { return !i.done && Foods.normalize(i.text || '') === fav.key; });
}

/**
 * A little medal on a ribbon: gold for 1, silver for 2, bronze for 3.
 * @param {number} rank
 * @returns {SVGElement}
 */
function medal(rank) {
  var svg = svgIcon('0 0 32 40',
    '<path class="medal-ribbon" d="M8 1 H15 L20 18 H13 Z"/><path class="medal-ribbon" d="M24 1 H17 L12 18 H19 Z"/>' +
    '<circle class="medal-disc" cx="16" cy="26" r="11.5"/><circle class="medal-ring" cx="16" cy="26" r="8"/>' +
    '<path class="medal-star" d="M16 20.4 L17.7 24.2 L21.8 24.6 L18.7 27.3 L19.7 31.4 L16 29.2 L12.3 31.4 L13.3 27.3 L10.2 24.6 L14.3 24.2 Z"/>');
  svg.setAttribute('class', 'medal medal-' + ['gold', 'silver', 'bronze'][rank - 1]);
  return svg;
}

/** The "+" button that puts a favourite back on the list, or a tick if it is already there. */
function favAddButton(fav) {
  var add = document.createElement('button');
  add.type = 'button';
  add.className = 'fav-add';
  if (onList(fav)) {
    add.textContent = '✓';
    add.disabled = true;
    add.setAttribute('aria-label', fav.label + ' is on your list');
  } else {
    add.textContent = '+';
    add.setAttribute('aria-label', 'Add ' + fav.label + ' to your list');
    add.addEventListener('click', function () { addItem(fav.label); sound('tap'); renderFavourites(); });
  }
  return add;
}

/** The #1 favourite: a crown, sparkles and a gold pedestal, with the name beside it. */
function podium(fav) {
  var li = document.createElement('li');
  li.className = 'fav-podium';
  // two spotlights sweep over the stand (behind everything else)
  ['beam-l', 'beam-r'].forEach(function (c) {
    var beam = document.createElement('span');
    beam.className = 'pod-beam ' + c;
    beam.setAttribute('aria-hidden', 'true');
    li.appendChild(beam);
  });
  ['s1', 's2', 's3', 's4', 's5', 's6', 's7'].forEach(function (c) {
    var sp = document.createElement('span');
    sp.className = 'pod-sparkle ' + c;
    sp.textContent = c === 's4' || c === 's6' ? '✧' : '✦';
    sp.setAttribute('aria-hidden', 'true');
    li.appendChild(sp);
  });
  var crown = svgIcon('0 0 40 26', '<path class="crown" d="M3 22 L6 6 L14 13 L20 3 L26 13 L34 6 L37 22 Z"/><path class="crown-band" d="M3.6 19 H36.4 V23 H3.6 Z"/><circle class="crown-gem" cx="6" cy="5" r="2.2"/><circle class="crown-gem" cx="20" cy="2.4" r="2.2"/><circle class="crown-gem" cx="34" cy="5" r="2.2"/>');
  crown.setAttribute('class', 'pod-crown');
  var emoji = emojiImg(fav.emoji, '');
  emoji.className = 'pod-emoji';
  var pedestal = document.createElement('div');
  pedestal.className = 'pedestal';
  var top = document.createElement('div');
  top.className = 'pedestal-top';
  var body = document.createElement('div');
  body.className = 'pedestal-body';
  var one = document.createElement('span');
  one.textContent = '1';
  body.append(medal(1), one);
  var pool = document.createElement('span');
  pool.className = 'pod-pool'; // the spotlight's pool of light on the pedestal
  pool.setAttribute('aria-hidden', 'true');
  pedestal.append(pool, top, body);
  var stand = document.createElement('div');
  stand.className = 'pod-stand';
  stand.append(crown, emoji, pedestal);
  var name = document.createElement('div');
  name.className = 'pod-name';
  name.textContent = fav.label;
  var count = document.createElement('div');
  count.className = 'pod-count';
  count.textContent = 'bought ' + fav.count + (fav.count === 1 ? ' time' : ' times');
  var add = favAddButton(fav);
  add.classList.add('pod-add');
  var info = document.createElement('div');
  info.className = 'pod-info';
  info.append(name, count, add);
  li.append(stand, info);
  return li;
}

/** Fills the Top 10 sheet from the pet's favourites. */
function renderFavourites() {
  var top = L.topFavourites(state.pet, 10);
  favEmpty.hidden = top.length > 0;
  favList.hidden = top.length === 0;
  favList.replaceChildren.apply(favList, top.map(function (fav, i) {
    if (i === 0) return podium(fav);
    var li = document.createElement('li');
    li.className = 'fav';
    var rank = document.createElement('span');
    rank.className = 'fav-rank';
    if (i < 3) rank.appendChild(medal(i + 1)); else rank.textContent = String(i + 1);
    rank.setAttribute('aria-label', 'Number ' + (i + 1));
    var name = document.createElement('span');
    name.className = 'fav-name';
    name.textContent = fav.label;
    var count = document.createElement('span');
    count.className = 'fav-count';
    count.textContent = '×' + fav.count;
    li.append(rank, emojiImg(fav.emoji, ''), name, count, favAddButton(fav));
    return li;
  }));
}

// the Top 10 lives in the Profile sheet (app-profile.js draws it when the sheet opens)

