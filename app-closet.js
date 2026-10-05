// The closet: outfits saved by name, opened from the dressing room (the button in the corner of its stage).
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var closetSheet = $('closetSheet'), closetGrid = $('closetGrid'), closetName = $('closetName'), closetNote = $('closetNote');
var closetDeleteArm = null;   // the outfit whose delete button was tapped once and now asks "Sure?"

/** Opens the closet over the dressing room (not through openDialog, which would close the dressing room). */
function openCloset() {
  if (closetSheet.open) { closetSheet.close(); return; }
  closetNote.textContent = '';
  closetName.value = '';
  sound('open');
  closetSheet.show();
  renderCloset();
}
/** @returns {HTMLElement} A small picture of the pet wearing a saved outfit. */
function closetMini(outfit) {
  var mini = document.createElement('div');
  mini.className = 'pet mini x-cheeks' + (L.isBird(state.pet.species) ? ' beaked' : '');
  mini.dataset.species = state.pet.species;
  mini.dataset.skin = state.pet.skin || '';
  mini.dataset.eyes = 'open';
  mini.dataset.mouth = 'smile';
  mini.dataset.arms = 'rest';
  mini.appendChild(petCopy());
  dressUp(mini, outfit);
  return mini;
}
/** Draws every saved outfit as a tile: tap to wear it, with a pen to rename and a cross to remove. */
function renderCloset() {
  var closet = state.pet.closet;
  closetGrid.replaceChildren.apply(closetGrid, closet.length ? closet.map(function (o) {
    var tile = document.createElement('div'), wear = document.createElement('button'), label = document.createElement('span');
    tile.className = 'closet-item';
    tile.dataset.id = o.id;
    wear.type = 'button'; wear.className = 'closet-wear';
    label.className = 'closet-label'; label.textContent = o.name;
    wear.append(closetMini(o.outfit), label);
    var pen = document.createElement('button'), del = document.createElement('button');
    pen.type = 'button'; pen.className = 'closet-mini-btn closet-pen'; pen.textContent = '✎'; pen.setAttribute('aria-label', 'Rename ' + o.name);
    del.type = 'button'; del.className = 'closet-mini-btn closet-del'; del.textContent = '✕'; del.setAttribute('aria-label', 'Remove ' + o.name);
    tile.append(wear, pen, del);
    return tile;
  }) : [Object.assign(document.createElement('p'), { className: 'decor-hint closet-empty', textContent: 'Nothing saved yet. Dress up, name the outfit and save it here.' })]);
  markCloset();
}
/** Shows which saved outfit (if any) is being worn now. */
function markCloset() {
  closetGrid.querySelectorAll('.closet-item').forEach(function (tile) {
    var o = state.pet.closet.filter(function (x) { return x.id === tile.dataset.id; })[0];
    tile.querySelector('.closet-wear').setAttribute('aria-pressed', String(!!o && L.sameOutfit(o.outfit, state.pet.outfit)));
  });
}
function closetSay(text) { closetNote.textContent = text; }
/** Saves what the pet is wearing under the typed name. */
function closetSaveCurrent() {
  var r = L.saveOutfit(state.pet.closet, closetName.value, state.pet.outfit, 'o' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36));
  if (r.why === 'empty') { closetSay('Put something on first!'); return; }
  if (r.why === 'same') { closetSay('Already in the closet as "' + r.entry.name + '".'); return; }
  if (r.why === 'full') { closetSay('The closet is full (' + L.CLOSET_MAX + '). Remove one to make room.'); return; }
  save();
  closetName.value = '';
  closetSay('Saved "' + r.entry.name + '"!');
  sound('pick');
  renderCloset();
}
/** Puts a saved outfit on (whatever is not available any more is left off). */
function closetWear(id) {
  var o = state.pet.closet.filter(function (x) { return x.id === id; })[0];
  if (!o) return;
  var outfit = JSON.parse(JSON.stringify(o.outfit));
  L.OUTFIT_SLOTS.forEach(function (slot) {
    var ids = L.wornIds(outfit, slot).filter(function (w) { return wardrobeItem(w) && unlocked('hat', w); });
    outfit[slot] = ids.length ? ids.join(',') : 'none';
  });
  state.pet.outfit = outfit;
  save();
  refreshDressRoom();
  dressUp(pet, state.pet.outfit);
  sound('excited');
  dressSay(line('look', ['my ' + o.name + ' look!', 'I love it!', 'ta-da!']), 1600, true);
  dressCheer(true);
  if (Math.random() < 0.3) setTimeout(dressFlash, 650);
  closetSay('Wearing "' + o.name + '".');
}
/** Swaps an outfit's name for a text box; Enter or tapping away keeps the new name. */
function closetRename(tile) {
  var o = state.pet.closet.filter(function (x) { return x.id === tile.dataset.id; })[0], label = tile.querySelector('.closet-label');
  if (!o || !label || tile.querySelector('.closet-rename')) return;
  var input = document.createElement('input');
  input.type = 'text'; input.className = 'closet-rename'; input.maxLength = 16; input.value = o.name; input.setAttribute('aria-label', 'New name');
  label.replaceWith(input);
  input.focus(); input.select();
  var done = false;
  function finish(keep) {
    if (done) return;
    done = true;
    if (keep) { o.name = L.cleanOutfitName(input.value) || o.name; save(); }
    renderCloset();
  }
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
  });
  input.addEventListener('blur', function () { finish(true); });
}
/** The cross asks once ("Sure?") and removes the outfit on the second tap. */
function closetRemove(tile, btn) {
  var id = tile.dataset.id;
  if (closetDeleteArm !== id) {
    closetDeleteArm = id;
    btn.textContent = 'Sure?'; btn.classList.add('armed');
    setTimeout(function () { if (closetDeleteArm === id) { closetDeleteArm = null; btn.textContent = '✕'; btn.classList.remove('armed'); } }, 2500);
    return;
  }
  closetDeleteArm = null;
  state.pet.closet = state.pet.closet.filter(function (x) { return x.id !== id; });
  save();
  sound('tap');
  renderCloset();
}

$('closetBtn').addEventListener('click', openCloset);
$('closetSave').addEventListener('click', closetSaveCurrent);
closetName.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); closetSaveCurrent(); } });
closetSheet.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); });
closetGrid.addEventListener('click', function (e) {
  var tile = e.target.closest('.closet-item');
  if (!tile) return;
  if (e.target.closest('.closet-pen')) closetRename(tile);
  else if (e.target.closest('.closet-del')) closetRemove(tile, e.target.closest('.closet-del'));
  else if (e.target.closest('.closet-wear')) closetWear(tile.dataset.id);
});
// the closet goes when the dressing room does
dressSheet.addEventListener('close', function () { closetSheet.close(); });
