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
    { id: 'parrot', base: 'birdie', label: 'Parrot' },
    { id: 'kiwi', base: 'birdie', label: 'Kiwi' },
    { id: 'pigeon', base: 'birdie', label: 'Pigeon' },
    { id: 'chicken', base: 'birdie', label: 'Chicken' },
    { id: 'strawberry', base: 'mochi', label: 'Strawberry' },
    { id: 'chocolate', base: 'mochi', label: 'Chocolate' },
    { id: 'taro', base: 'mochi', label: 'Taro' },
    { id: 'blackcat', base: 'kitty', label: 'Black cat' },
    { id: 'calico', base: 'kitty', label: 'Calico' },
    { id: 'orangecat', base: 'kitty', label: 'Orange cat' },
    { id: 'munchkin', base: 'kitty', label: 'Munchkin' },
    { id: 'ragdoll', base: 'kitty', label: 'Ragdoll' },
    { id: 'scottishfold', base: 'kitty', label: 'Scottish fold' },
    { id: 'siamese', base: 'kitty', label: 'Siamese' },
    { id: 'chihuahua', base: 'puppy', label: 'Chihuahua' },
    { id: 'pomeranian', base: 'puppy', label: 'Pomeranian' },
    { id: 'golden', base: 'puppy', label: 'Golden retriever' },
    { id: 'shiba', base: 'puppy', label: 'Pink shiba' },
    { id: 'frenchie', base: 'puppy', label: 'French bulldog' },
    { id: 'shepherd', base: 'puppy', label: 'German shepherd' },
    { id: 'cairn', base: 'puppy', label: 'Cairn terrier' },
    { id: 'chocolatemilk', base: 'cow', label: 'Chocolate milk' },
    { id: 'highland', base: 'cow', label: 'Highland cattle' },
    { id: 'strawberrycow', base: 'cow', label: 'Strawberry milk' },
    { id: 'dirty', base: 'pig', label: 'Dirty piggy' },
    { id: 'boar', base: 'pig', label: 'Boar' },
    { id: 'potbelly', base: 'pig', label: 'Potbelly pig' },
    { id: 'floppybunny', base: 'bunny', label: 'Floppy ears' },
    { id: 'dutch', base: 'bunny', label: 'Dutch' },
    { id: 'himalayan', base: 'bunny', label: 'Himalayan' },
    { id: 'dartfrog', base: 'frog', label: 'Poison dart frog' },
    { id: 'toad', base: 'frog', label: 'Toad' },
    { id: 'fasthedgehog', base: 'hedgehog', label: 'Fast hedgehog' },
    { id: 'brandt', base: 'hedgehog', label: "Brandt's hedgehog" },
    { id: 'rainbowaxo', base: 'axolotl', label: 'Rainbow' },
    { id: 'whitehamster', base: 'hamster', label: 'White hamster' },
    { id: 'longhair', base: 'hamster', label: 'Long-haired' }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
