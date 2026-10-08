// How much Fumu may notice about what you are doing on the PC: plain data and rules (no Electron), so they can be tested.
// This is the "awareness" of docs/design/desktop-companion-and-sync.md. There is no level 3: he never reads window titles, tab names,
// page text or the screen, at any level.
'use strict';

var LEVELS = {
  1: {
    title: 'More privacy',
    text: 'He only knows whether you are at the keyboard (busy or quiet), the time of day and how long you have worked without a break. He cannot tell which programs or windows you have open, and he comments much less on what you are doing. Sitting on your windows is off.'
  },
  2: {
    title: 'Normal',
    text: 'Adds the outline of your desktop: where your windows are (so he can sit on them), which program is in front (its name, matched against a short list of games and common apps; anything else is just "something else") and whether it fills the screen. So he can tell when you are playing a game, and he stays quiet then.'
  }
};
/** Said under both levels. */
var ALWAYS = 'At either level he never reads window titles, tab names, page text or your screen, and nothing about what you do leaves this PC.';

/** What each thing needs: the lowest level that allows it. */
var NEEDS = { idle: 1, perch: 2, program: 2 };

/** @returns {1|2} A saved value as a level (normal when it is missing or not one). */
function clean(v) { return v === 1 || v === '1' ? 1 : 2; }
/** @returns {boolean} Whether a level allows a thing ('idle', 'perch', 'program'). */
function allows(level, thing) { return clean(level) >= (NEEDS[thing] || 2); }

module.exports = { LEVELS: LEVELS, ALWAYS: ALWAYS, NEEDS: NEEDS, clean: clean, allows: allows };
