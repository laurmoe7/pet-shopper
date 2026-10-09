// How much Fumu may notice about what you are doing on the PC: plain data and rules (no Electron), so they can be tested.
// This is the "awareness" of docs/design/desktop-companion-and-sync.md. There is no level 3: he never reads window titles, tab names,
// page text or the screen, at any level.
'use strict';

var LEVELS = {
  1: {
    title: 'More privacy',
    text: 'Only knows if you are at the keyboard, and the time of day. Cannot see your windows or programs.'
  },
  2: {
    title: 'Normal',
    text: 'Also knows where your windows are and which program is in front (by name, from a short list). Quiet while you play.'
  }
};
/** Said under both levels. */
var ALWAYS = 'He never reads window titles, tabs, page text or your screen.';

/** What each thing needs: the lowest level that allows it. */
var NEEDS = { idle: 1, perch: 2, program: 2, wreck: 2 };

/** How often he remarks on what you are doing (nothing else he says is affected). */
var CHAT_LEVELS = [
  { id: 'off', label: 'Never' },
  { id: 'rare', label: 'Rarely' },
  { id: 'normal', label: 'Normal' },
  { id: 'often', label: 'Often' }
];
/** @returns {string} A saved chatter level, or `fallback` when it is not one of them. */
function cleanChat(v, fallback) { return CHAT_LEVELS.some(function (l) { return l.id === v; }) ? v : fallback; }

/** How much he moves about on his own: a lot, normally, a little (pacing on the spot), only inside his own little room (the small window, when it shows the room), or not at all. */
var MOVE_LEVELS = [
  { id: 'lots', label: 'A lot' },
  { id: 'normal', label: 'Normal' },
  { id: 'low', label: 'A little' },
  { id: 'room', label: 'In his room' },
  { id: 'still', label: 'Still' }
];
/** @returns {string} A saved movement level, or `fallback` when it is not one of them. */
function cleanMove(v, fallback) { return MOVE_LEVELS.some(function (l) { return l.id === v; }) ? v : fallback; }

/** @returns {1|2} A saved value as a level (normal when it is missing or not one). */
function clean(v) { return v === 1 || v === '1' ? 1 : 2; }
/** @returns {boolean} Whether a level allows a thing ('idle', 'perch', 'program', 'wreck'). */
function allows(level, thing) { return clean(level) >= (NEEDS[thing] || 2); }

module.exports = { MOVE_LEVELS: MOVE_LEVELS, cleanMove: cleanMove, CHAT_LEVELS: CHAT_LEVELS, cleanChat: cleanChat, LEVELS: LEVELS, ALWAYS: ALWAYS, NEEDS: NEEDS, clean: clean, allows: allows };
