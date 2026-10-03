/* Skins: a base species can wear a skin that changes how it looks.
 * `base` is the species id it belongs to. A species with no skin chosen has its plain "original" look.
 * Skins are mostly colours and markings drawn on the same body (see the data-skin and data-sk
 * rules in styles.css and index.html). A skin is unlocked by an achievement with
 * `unlocks: { kind: 'skin', id, base }`, or is free when listed in FreeUnlocks.skin.
 * Add a new skin here and draw its look in styles.css.
 */
(function (root) {
  'use strict';
  root.Skins = [
    { id: 'penguin', base: 'birdie', label: 'Penguin' },
    { id: 'parrot', base: 'birdie', label: 'Parrot' }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
