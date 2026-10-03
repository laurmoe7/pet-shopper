// Treats: three free snacks a day that you pick for Nibble. They count for goals and
// personalities like shopping does (same daily limits), but never for the Top 10.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var treatSheet = $('treatSheet'), treatGrid = $('treatGrid'), treatLeft = $('treatLeft');

/** Fills the treat sheet: one button per treat, greyed out once fed today. */
function renderTreats() {
  var used = L.treatsToday(state.pet, new Date());
  var left = L.TREATS_PER_DAY - used.length;
  treatLeft.textContent = left > 0 ? left + ' of ' + L.TREATS_PER_DAY + ' left today' : 'All done for today. Come back tomorrow!';
  treatGrid.replaceChildren.apply(treatGrid, L.TREAT_WORDS.map(function (word) {
    var found = L.createItem(word, {}, 'treat');
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.word = word;
    b.disabled = left <= 0 || used.indexOf(word) !== -1;
    var label = document.createElement('span');
    label.textContent = word.charAt(0).toUpperCase() + word.slice(1);
    b.append(emojiImg(found.emoji, ''), label);
    return b;
  }));
}

treatGrid.addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b || b.disabled) return;
  var now = new Date();
  var given = L.giveTreat(state.pet, b.dataset.word, now);
  if (!given.ok) return;
  var from = b.getBoundingClientRect();
  var item = L.createItem(b.dataset.word, {}, 'treat');   // no added time: a free treat counts straight away
  item.treat = true;
  var goals = creditEaten(item, now);
  save();
  treatSheet.close();
  eat(item, from, goals);
});

$('treatBtn').addEventListener('click', function () {
  renderTreats();
  openDialog(treatSheet);
});
treatSheet.addEventListener('click', function (e) { if (e.target === treatSheet) treatSheet.close(); });
