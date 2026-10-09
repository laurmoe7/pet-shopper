// Loads the app's plain browser scripts into Node so their globals can be tested.
require('../foods.js');
require('../tasks.js');
require('../logic.js');
require('../sync.js');
require('../achievements.js');
require('../sounds.js');
require('../wardrobe.js');
require('../decor.js');
require('../bonuses.js');
require('../recipe.js');
require('../personalities.js');
require('../skins.js');
require('../send.js');

module.exports = { Foods: globalThis.Foods, Tasks: globalThis.Tasks, PetLogic: globalThis.PetLogic, Sounds: globalThis.Sounds, Wardrobe: globalThis.Wardrobe,
  Achievements: globalThis.Achievements, FreeUnlocks: globalThis.FreeUnlocks, Decor: globalThis.Decor, Bonuses: globalThis.Bonuses,
  Personalities: globalThis.Personalities, Skins: globalThis.Skins, Sync: globalThis.Sync, Send: globalThis.Send };
