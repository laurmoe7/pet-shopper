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

/** How much bigger or smaller Fumu is drawn: the tray menu's size choice. */
var SIZES = { small: 0.8, normal: 1, large: 1.3 };
/** @returns {number} The zoom for a size name (normal for anything unknown). */
function sizeFactor(name) { return Object.prototype.hasOwnProperty.call(SIZES, name) ? SIZES[name] : 1; }

/** The pet window at another size, keeping its bottom middle where it was (he stays sitting in the same place). */
function resizeKeepingBottom(b, size) {
  return { x: Math.round(b.x + (b.width - size.width) / 2), y: Math.round(b.y + b.height - size.height), width: size.width, height: size.height };
}

/** A rectangle pushed back inside the area (never bigger than it). */
function within(b, area) {
  var w = Math.min(b.width, area.width), h = Math.min(b.height, area.height);
  return { x: Math.max(area.x, Math.min(Math.round(b.x), area.x + area.width - w)), y: Math.max(area.y, Math.min(Math.round(b.y), area.y + area.height - h)), width: w, height: h };
}

/** Moves the window by a small step (the tray menu's nudge) and keeps it on the screen. */
function nudge(b, dx, dy, area) { return within({ x: b.x + dx, y: b.y + dy, width: b.width, height: b.height }, area); }

/** The corner of the area a window sits in: 'br' (bottom right), 'bl', 'tr' or 'tl'. */
function corner(b, area, which) {
  var left = which.charAt(1) === 'l', top = which.charAt(0) === 't';
  return {
    x: left ? area.x + MARGIN : area.x + area.width - b.width - MARGIN,
    y: top ? area.y + MARGIN / 2 : area.y + area.height - b.height - MARGIN / 2,
    width: b.width, height: b.height
  };
}

/** Where a walk along the floor ends: dx further along, stopping at the edges of the area (same height). */
function walkEnd(b, area, dx) {
  return within({ x: b.x + dx, y: b.y, width: b.width, height: b.height }, area);
}

/**
 * Where Fumu hides to peek round the edge of the screen: the nearest side with no other screen next to it, so he
 * never shows up on the wrong monitor. Half of his window goes past the edge.
 * @param {Object} b  The window.
 * @param {Object[]} screens  The full rectangles of all screens (not work areas).
 * @returns {{edge: 'left'|'right', bounds: Object}|null} Null when no side is free.
 */
function peekSpot(b, screens) {
  var cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  var home = screens.filter(function (a) { return cx >= a.x && cx < a.x + a.width && cy >= a.y && cy < a.y + a.height; })[0];
  if (!home) return null;
  function touches(x) { return screens.some(function (o) { return o !== home && x >= o.x && x < o.x + o.width && cy >= o.y && cy < o.y + o.height; }); }
  var options = [];
  if (!touches(home.x - 4)) options.push({ edge: 'left', bounds: { x: Math.round(home.x - b.width / 2), y: b.y, width: b.width, height: b.height }, away: cx - home.x });
  if (!touches(home.x + home.width + 4)) options.push({ edge: 'right', bounds: { x: Math.round(home.x + home.width - b.width / 2), y: b.y, width: b.width, height: b.height }, away: home.x + home.width - cx });
  options.sort(function (p, q) { return p.away - q.away; });
  return options.length ? { edge: options[0].edge, bounds: options[0].bounds } : null;
}

/** Where a tween is after `t` (0 to 1) of its time: from a to b, easing in and out. */
function tweenAt(a, b, t) {
  var e = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  return { x: Math.round(a.x + (b.x - a.x) * e), y: Math.round(a.y + (b.y - a.y) * e), width: b.width, height: b.height };
}

module.exports = {
  SIZES: SIZES, sizeFactor: sizeFactor, resizeKeepingBottom: resizeKeepingBottom, within: within, nudge: nudge, corner: corner, walkEnd: walkEnd, peekSpot: peekSpot, tweenAt: tweenAt, MARGIN: MARGIN, visibleFraction: visibleFraction, defaultBounds: defaultBounds, startBounds: startBounds, listBounds: listBounds, dragBounds: dragBounds };
