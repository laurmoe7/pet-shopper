// Which version of Fumufumu this installed program follows: "dev" (every push to main, for Lauren) or "stable" (only what has been
// promoted to the `stable` branch, for everybody else). The installer for each is built by its own workflow, which sets `fumuChannel`
// in package.json; a program built without it (npm start, the old installers) is dev.
'use strict';

var SITE = 'https://laurmoe7.github.io/pet-shopper/';

/**
 * @param {{fumuChannel?: string}} pkg  The program's package.json.
 * @returns {{name: 'dev'|'stable', url: string}} The channel and the address of the page it loads (the stable page lives under /stable/).
 */
function pick(pkg) {
  var stable = !!pkg && pkg.fumuChannel === 'stable';
  return { name: stable ? 'stable' : 'dev', url: stable ? SITE + 'stable/' : SITE };
}

module.exports = { pick: pick, SITE: SITE };
