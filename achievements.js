/* Achievements: goals that unlock species and hats.
 * Each one counts eaten items that match `foods` (food categories and/or specific
 * emojis), or finished shopping trips when `trips` is true. Only `perDay` count
 * per calendar day, so nothing can be unlocked in a single day.
 * `unlocks` names the species or wardrobe item it opens up.
 * Add a new goal here and it shows up on the achievements screen.
 */
(function (root) {
  'use strict';

  root.Achievements = [
    {
      id: 'fish-fan', title: 'Fish fan', icon: '🐟',
      text: 'Feed your pet 20 fish or seafood',
      foods: { emojis: '🐟🍣🍤🦐🦀🦑🦪🦞' }, goal: 20, perDay: 2,
      unlocks: { kind: 'species', id: 'penguin', label: 'Penguin' }
    },
    {
      id: 'veggie-hero', title: 'Veggie hero', icon: '🥕',
      text: 'Feed your pet 15 vegetables',
      foods: { cats: ['veg'] }, goal: 15, perDay: 3,
      unlocks: { kind: 'species', id: 'bunny', label: 'Bunny' }
    },
    {
      id: 'bakery-buddy', title: 'Bakery buddy', icon: '🍞',
      text: 'Feed your pet 10 breads or pastries',
      foods: { cats: ['baked'] }, goal: 10, perDay: 2,
      unlocks: { kind: 'species', id: 'chick', label: 'Chick' }
    },
    {
      id: 'dairy-day', title: 'Milk & cheese', icon: '🧀',
      text: 'Feed your pet 15 dairy foods',
      foods: { cats: ['dairy'] }, goal: 15, perDay: 3,
      unlocks: { kind: 'species', id: 'cow', label: 'Cow' }
    },
    {
      id: 'nut-stash', title: 'Snack stash', icon: '🥜',
      text: 'Feed your pet 12 nuts, grains or cereals',
      foods: { emojis: '🥜🌰🍚🥣🍿' }, goal: 12, perDay: 2,
      unlocks: { kind: 'species', id: 'hamster', label: 'Hamster' }
    },
    {
      id: 'fruit-basket', title: 'Fruit basket', icon: '🍓',
      text: 'Feed your pet 20 pieces of fruit',
      foods: { cats: ['fruit'] }, goal: 20, perDay: 4,
      unlocks: { kind: 'hat', id: 'sunhat', label: 'Sun hat' }
    },
    {
      id: 'tidy-shopper', title: 'Tidy shopper', icon: '🧺',
      text: 'Finish a list of 3 or more items on 5 different days',
      trips: true, goal: 5, perDay: 1,
      unlocks: { kind: 'hat', id: 'maid', label: "Maid's hairband" }
    }
  ];

  // Available from the start, no achievement needed.
  root.FreeUnlocks = { species: ['mochi', 'pig', 'kitty', 'puppy'], hat: ['none', 'tophat', 'cap', 'hoodie', 'hardhat', 'bandana', 'headphones', 'shades'] };
})(typeof self !== 'undefined' ? self : globalThis);
