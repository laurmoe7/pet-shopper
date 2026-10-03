// The Top 10 sheet: what you buy most, with a quick way to put it back on the list.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var favSheet = $('favSheet'), favList = $('favList'), favEmpty = $('favEmpty');

/** @returns {boolean} Whether an unticked item with this favourite's word is already on the list. */
function onList(fav) {
  return state.items.some(function (i) { return !i.done && Foods.normalize(i.text || '') === fav.key; });
}

/** Fills the Top 10 sheet from the pet's favourites. */
function renderFavourites() {
  var top = L.topFavourites(state.pet, 10);
  favEmpty.hidden = top.length > 0;
  favList.hidden = top.length === 0;
  favList.replaceChildren.apply(favList, top.map(function (fav, i) {
    var li = document.createElement('li');
    li.className = 'fav' + (i === 0 ? ' first' : '');
    var rank = document.createElement('span');
    rank.className = 'fav-rank';
    rank.textContent = String(i + 1);
    var name = document.createElement('span');
    name.className = 'fav-name';
    name.textContent = fav.label;
    var count = document.createElement('span');
    count.className = 'fav-count';
    count.textContent = '×' + fav.count;
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
    li.append(rank, emojiImg(fav.emoji, ''), name, count, add);
    return li;
  }));
}

$('favBtn').addEventListener('click', function () {
  renderFavourites();
  openDialog(favSheet);
});
favSheet.addEventListener('click', function (e) { if (e.target === favSheet) favSheet.close(); });
