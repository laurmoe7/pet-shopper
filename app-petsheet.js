// Edit pet: name and species.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

// ---------- your pet: name and species ----------
var SPECIES = [
  { id: 'mochi', label: 'Mochi' },
  { id: 'pig', label: 'Pig' },
  { id: 'kitty', label: 'Cat' },
  { id: 'puppy', label: 'Dog' },
  { id: 'bunny', label: 'Bunny' },
  { id: 'birdie', label: 'Birdie' },
  { id: 'cow', label: 'Cow' },
  { id: 'hamster', label: 'Hamster' },
  { id: 'frog', label: 'Frog' },
  { id: 'hedgehog', label: 'Hedgehog' },
  { id: 'axolotl', label: 'Axolotl' }
];
var petSheet = $('petSheet'), petNameInput = $('petNameInput'), speciesGrid = $('speciesGrid');

/** @returns {string} The pet's name, or "Nibble" if it is blank. */
function petName() { return (state.pet.name || '').trim() || 'Nibble'; }
/** Shows the pet's name, species and outfit everywhere on the page. */
function applyPet() {
  var name = petName();
  pet.dataset.species = state.pet.species;
  pet.dataset.skin = state.pet.skin || '';
  pet.classList.toggle('beaked', L.isBird(state.pet.species));
  pet.setAttribute('aria-label', name + ', your pet');
  document.querySelectorAll('.pet-name').forEach(function (el) { el.textContent = name; });
  document.title = name + "'s List";
  dressUp(pet, state.pet.outfit);
  speciesGrid.querySelectorAll('button').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.species === state.pet.species ? 'true' : 'false');
  });
  renderSkins();
}

/** @returns {SVGSVGElement} A copy of the pet drawing for a button or the dressing room. */
function petCopy() {
  var copy = petSvg.cloneNode(true);
  copy.querySelectorAll('defs').forEach(function (d) { d.remove(); });
  return copy;
}
// species buttons show a small static copy of the pet
SPECIES.forEach(function (sp) {
  var b = document.createElement('button');
  b.type = 'button';
  b.dataset.species = sp.id;
  var mini = document.createElement('div');
  mini.className = 'pet mini x-cheeks' + (L.isBird(sp.id) ? ' beaked' : '');
  mini.dataset.species = sp.id;
  mini.dataset.eyes = 'open';
  mini.dataset.mouth = 'smile';
  mini.dataset.arms = 'rest';
  mini.appendChild(petCopy());
  var label = document.createElement('span');
  label.textContent = sp.label;
  b.append(mini, label);
  speciesGrid.appendChild(b);
});

// ---------- skins: a species can wear a skin that changes how it looks ----------
var skinGrid = $('skinGrid'), skinField = $('skinField');
/** Shows the skin choices for the current species (an "original" look plus its skins), or hides them if it has none. */
function renderSkins() {
  var mine = Skins.filter(function (s) { return s.base === state.pet.species; });
  skinField.hidden = mine.length === 0;
  var options = [{ id: '', label: 'Original' }].concat(mine);
  skinGrid.replaceChildren.apply(skinGrid, options.map(function (sk) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.skin = sk.id;
    b.setAttribute('aria-pressed', sk.id === (state.pet.skin || '') ? 'true' : 'false');
    var mini = document.createElement('div');
    mini.className = 'pet mini x-cheeks' + (L.isBird(state.pet.species) ? ' beaked' : '');
    mini.dataset.species = state.pet.species;
    mini.dataset.skin = sk.id;
    mini.dataset.eyes = 'open';
    mini.dataset.mouth = 'smile';
    mini.dataset.arms = 'rest';
    mini.appendChild(petCopy());
    var label = document.createElement('span');
    label.textContent = sk.label;
    b.append(mini, label);
    return b;
  }));
  refreshLocks();
}
skinGrid.addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  if (!unlocked('skin', b.dataset.skin)) { lockHint(speciesHint, 'skin', b.dataset.skin); return; }
  speciesHint.hidden = true;
  sound('pick');
  state.pet.skin = b.dataset.skin;
  save();
  applyPet();
  if (!busy) { setFace(FACES.tada); pulse('hop', 500); setTimeout(function () { if (!busy) settle(); }, 900); }
});

speciesGrid.addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (!b) return;
  if (!unlocked('species', b.dataset.species)) { lockHint(speciesHint, 'species', b.dataset.species); return; }
  speciesHint.hidden = true;
  sound('pick');
  if (state.pet.species !== b.dataset.species) state.pet.skin = '';   // skins belong to one species
  state.pet.species = b.dataset.species;
  save();
  applyPet();
  if (!busy) { setFace(FACES.tada); pulse('hop', 500); setTimeout(function () { if (!busy) settle(); }, 900); }
});
// The name shows as text; a double-tap (or Enter) turns it into a box to type in,
// so opening the sheet doesn't pop up the phone keyboard.
var petNameShow = $('petNameShow'), lastNameTap = 0;
function showName() {
  $('petNameText').textContent = petName();
  petNameInput.hidden = true;
  petNameShow.hidden = false;
}
function startRename() {
  petNameInput.value = state.pet.name || '';
  petNameShow.hidden = true;
  petNameInput.hidden = false;
  petNameInput.focus();
  petNameInput.select();
}
function finishRename(keep) {
  if (petNameInput.hidden) return;
  if (keep) {
    state.pet.name = L.cleanName(petNameInput.value, petName());
    save();
    applyPet();
  }
  showName();
  petNameShow.focus();
}
petNameShow.addEventListener('click', function (e) {
  var now = Date.now();
  // detail is 0 for keyboard clicks (Enter or Space): rename straight away
  if (e.detail === 0 || L.isDoubleTap(lastNameTap, now)) { lastNameTap = 0; startRename(); return; }
  lastNameTap = now;
  petNameShow.classList.remove('nudge'); void petNameShow.offsetWidth; petNameShow.classList.add('nudge');
});
petNameShow.addEventListener('dblclick', function (e) { e.preventDefault(); if (petNameInput.hidden) startRename(); });
petNameInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); finishRename(true); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finishRename(false); }
});
petNameInput.addEventListener('blur', function () { finishRename(true); });
$('editPetBtn').addEventListener('click', function () {
  showName();
  lastNameTap = 0;
  refreshLocks();
  applyPet();
  openDialog(petSheet);
});
petSheet.addEventListener('close', function () {
  finishRename(true);
  state.pet.name = petName();
  save();
  applyPet();
  if (!busy) { pulse('hop', 500); talk('name', ["I'm {name}!"], 1500, { name: petName() }); }
});
petSheet.addEventListener('click', function (e) { if (e.target === petSheet) petSheet.close(); });
