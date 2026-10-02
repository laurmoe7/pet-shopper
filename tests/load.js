// Loads the app's plain browser scripts into Node so their globals can be tested.
require('../foods.js');
require('../logic.js');
require('../achievements.js');
require('../sounds.js');
require('../wardrobe.js');
require('../decor.js');
require('../personalities.js');

module.exports = { Foods: globalThis.Foods, PetLogic: globalThis.PetLogic, Sounds: globalThis.Sounds, Wardrobe: globalThis.Wardrobe,
  Achievements: globalThis.Achievements, FreeUnlocks: globalThis.FreeUnlocks, Decor: globalThis.Decor,
  Personalities: globalThis.Personalities };
