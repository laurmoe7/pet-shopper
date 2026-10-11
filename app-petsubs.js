// Pet tab sub-tabs (build 584): the Pet tab's panel shows one of Species (with the name), Skin or Persona at a time instead of one long scroll.
// To go back to the single scroll, set PET_SUBTABS to false (nothing is added then), or delete this file, its script tag in index.html, its entry in
// SHELL in sw.js and the "Pet tab sub-tabs" block at the end of styles.css.
'use strict';

var PET_SUBTABS = true;
(function () {
  if (!PET_SUBTABS) return;
  var panel = dressPanels.querySelector('.dress-panel[data-tab="pet"]');
  var speciesBox = $('speciesGrid').closest('fieldset'), personaBox = $('personalityStrip').closest('fieldset');
  panel.querySelector('.field').classList.add('sub-species');
  speciesBox.classList.add('sub-species');
  skinField.classList.add('sub-skin');
  personaBox.classList.add('sub-persona');
  var none = document.createElement('p');   // shown on the Skin sub-tab when this species has no skins
  none.className = 'decor-hint pet-subs-none';
  none.textContent = 'No skins for this one yet.';
  skinField.after(none);

  var SUBS = [['species', 'Species', '1F43E'], ['skin', 'Skin', '1F3A8'], ['persona', 'Persona', '1F9F8']];
  var row = document.createElement('div');
  row.className = 'pet-subs';
  row.setAttribute('role', 'tablist');
  row.setAttribute('aria-label', 'Species, skin and persona');
  SUBS.forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.dataset.sub = s[0];
    var img = document.createElement('img');
    img.src = 'emoji/' + s[2] + '.svg';
    img.alt = '';
    img.width = img.height = 20;
    var label = document.createElement('span');
    label.textContent = s[1];
    b.append(img, label);
    row.append(b);
  });
  dressTabs.after(row);   // outside the scrolling panel, right under the tab row, so it stays put while the tiles scroll
  panel.classList.add('pet-subbed');

  /** Shows one sub-tab. @param {string} sub 'species', 'skin' or 'persona'. */
  function showSub(sub) {
    panel.dataset.sub = sub;
    row.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.sub === sub)); });
    dressPanels.scrollTop = 0;
  }
  row.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    sound('tap');
    showSub(b.dataset.sub);
  });
  showSub('species');
})();
