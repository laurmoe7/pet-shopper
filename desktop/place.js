// Where the desktop window goes: plain functions with no Electron in them, so they can be tested in Node.
// A rectangle is {x, y, width, height} in screen units; a work area is the same for a screen without the taskbar.
'use strict';

var MARGIN = 24;

/** @returns {number} How much of `b` (0 to 1) lies inside the work area `a`. */
function visibleFraction(b, a) {
  var w = Math.min(b.x + b.width, a.x + a.width) - Math.max(b.x, a.x);
  var h = Math.min(b.y + b.height, a.y + a.height) - Math.max(b.y, a.y);
  return w > 0 && h > 0 ? (w * h) / (b.width * b.height) : 0;
}

/** Bottom right of a screen, like a pet sitting by the clock. */
function defaultBounds(area, size) {
  return { x: area.x + area.width - size.width - MARGIN, y: area.y + area.height - size.height - MARGIN / 2, width: size.width, height: size.height };
}

/**
 * Keeps a saved window position usable: if the screen it was on is gone (or it is mostly off screen), it comes
 * back to the bottom right of the main screen.
 * @param {Object|null} saved  {x, y} or a full rectangle, or nothing the first time.
 * @param {{width: number, height: number}} size
 * @param {Object[]} areas  The work areas of all screens.
 * @param {Object} primary  The work area of the main screen.
 */
function startBounds(saved, size, areas, primary) {
  if (!saved || typeof saved.x !== 'number' || typeof saved.y !== 'number' || !isFinite(saved.x) || !isFinite(saved.y)) return defaultBounds(primary, size);
  var b = { x: Math.round(saved.x), y: Math.round(saved.y), width: size.width, height: size.height };
  var seen = areas.reduce(function (m, a) { return Math.max(m, visibleFraction(b, a)); }, 0);
  return seen >= 0.5 ? b : defaultBounds(primary, size);
}

/** The window for the list: as big as wanted but never bigger than the screen, near where the pet is. */
function listBounds(pet, area, size) {
  var width = Math.min(size.width, area.width), height = Math.min(size.height, area.height);
  var cx = pet.x + pet.width / 2, cy = pet.y + pet.height / 2;
  var x = Math.round(cx - width / 2), y = Math.round(cy - height / 2);
  x = Math.max(area.x, Math.min(x, area.x + area.width - width));
  y = Math.max(area.y, Math.min(y, area.y + area.height - height));
  return { x: x, y: y, width: width, height: height };
}

/** The window while it is carried: the start rectangle moved by the distance the pointer went (the size never changes). */
function dragBounds(start, dx, dy) {
  return { x: Math.round(start.x + dx), y: Math.round(start.y + dy), width: start.width, height: start.height };
}

module.exports = { MARGIN: MARGIN, visibleFraction: visibleFraction, defaultBounds: defaultBounds, startBounds: startBounds, listBounds: listBounds, dragBounds: dragBounds };
