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
 * Where a window may stand on a screen: it may be partly off the sides (he peeks in), but at most 60% off the left and 40% off the right.
 * @param {number} x The wanted left edge. @param {number} width The window's width. @param {{x:number,width:number}} disp The screen's full rectangle.
 * @returns {number} The left edge, held to that.
 */
function keepPartlyOn(x, width, disp) {
  return Math.max(Math.round(disp.x - width * 0.6), Math.min(Math.round(x), Math.round(disp.x + disp.width - width * 0.4)));
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

/**
 * What to do when screens are plugged in, removed or change size while Fumu runs. If his window is mostly off every screen he
 * goes to the main screen but remembers his own spot (`displaced`); when that spot is on a screen again he goes back to it.
 * @param {Object} cur  The window now.
 * @param {Object|null} saved  {x, y} where he last rested, or null.
 * @param {{width: number, height: number}} size
 * @param {Object[]} areas  The work areas of all screens.
 * @param {Object} primary  The work area of the main screen.
 * @param {boolean} displaced  Whether he was moved only because his screen went away.
 * @returns {{bounds: Object, displaced: boolean}}
 */
function afterScreensChange(cur, saved, size, areas, primary, displaced) {
  function seen(b) { return areas.reduce(function (m, a) { return Math.max(m, visibleFraction(b, a)); }, 0); }
  if (displaced && saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
    var home = { x: Math.round(saved.x), y: Math.round(saved.y), width: size.width, height: size.height };
    if (seen(home) >= 0.5) return { bounds: home, displaced: false };
  }
  if (seen(cur) > 0) {   // still partly on a screen: just pulled in
    var area = areas.filter(function (a) { return visibleFraction(cur, a) > 0; }).sort(function (p, q) { return visibleFraction(cur, q) - visibleFraction(cur, p); })[0];
    return { bounds: within(cur, area), displaced: displaced };
  }
  return { bounds: defaultBounds(primary, size), displaced: true };
}

/**
 * Where his resting place goes when screens change size: the spot he was put on, moved with the nearest edges of
 * its screen (by the clock he stays by the clock), and back on the floor if he sat on it. The same screen at its old
 * size gives back exactly the old spot.
 * @param {{x: number, y: number, screen?: {id: number, x: number, y: number, width: number, height: number}, floor?: boolean}} home
 * @param {{width: number, height: number}} size
 * @param {{id: number, bounds: Object, area: Object, floor: number}[]} screens  `floor` is the lowest top edge the window may have there.
 * @returns {Object|null} The window rectangle, or null when his screen is gone (or the spot has no screen saved).
 */
function homeOnScreens(home, size, screens) {
  if (!home || !home.screen || typeof home.x !== 'number' || typeof home.y !== 'number') return null;
  var old = home.screen, s = screens.filter(function (d) { return d.id === old.id; })[0];
  // (Windows can give a screen a new id when it changes mode: then the one that starts at the same corner, or the only one)
  if (!s) s = screens.filter(function (d) { return d.bounds.x === old.x && d.bounds.y === old.y; })[0] || (screens.length === 1 ? screens[0] : null);
  if (!s) return null;
  var n = s.bounds, w = size.width, h = size.height;
  var x = home.x + w / 2 > old.x + old.width / 2 ? n.x + n.width - (old.x + old.width - home.x) : n.x + (home.x - old.x);
  var y = home.floor ? s.floor : (home.y + h / 2 > old.y + old.height / 2 ? n.y + n.height - (old.y + old.height - home.y) : n.y + (home.y - old.y));
  x = Math.max(n.x - Math.round(w / 4), Math.min(x, n.x + n.width - Math.round(w * 3 / 4)));
  y = Math.max(s.area.y - Math.round(h / 4), Math.min(y, s.floor));
  return { x: Math.round(x), y: Math.round(y), width: w, height: h };
}

/** Whether the computer counts as idle: after `after` seconds without input, and back as soon as there is any (polled every 2 s). */
function idleStep(wasIdle, seconds, after) { return wasIdle ? seconds >= 3 : seconds >= after; }

var PERCH_BODY = 160;   // how wide Fumu himself is inside his window: a perch must be at least this wide
/**
 * The top edges of other windows where Fumu can sit. Windows come front to back; the part of an edge that another window
 * covers is cut away, and an edge with too little room above it (a maximized window) is left out.
 * @param {{id: string, x: number, y: number, width: number, height: number}[]} rects  Other windows' frames, front first.
 * @param {Object[]} areas  The work areas of all screens.
 * @param {number} headroom  Free space needed above the edge.
 * @returns {{id: string, x1: number, x2: number, y: number}[]}
 */
function perches(rects, areas, headroom) {
  var out = [];
  rects.forEach(function (r, i) {
    var segs = [[r.x, r.x + r.width]];
    for (var j = 0; j < i; j++) {
      var o = rects[j];
      if (r.y >= o.y && r.y < o.y + o.height) {
        segs = segs.reduce(function (acc, s) {
          if (o.x + o.width <= s[0] || o.x >= s[1]) return acc.concat([s]);
          if (o.x > s[0]) acc.push([s[0], o.x]);
          if (o.x + o.width < s[1]) acc.push([o.x + o.width, s[1]]);
          return acc;
        }, []);
      }
    }
    areas.forEach(function (a) {
      if (r.y - headroom < a.y || r.y >= a.y + a.height) return;
      segs.forEach(function (s) {
        var x1 = Math.max(s[0], a.x), x2 = Math.min(s[1], a.x + a.width);
        if (x2 - x1 >= PERCH_BODY) out.push({ id: r.id, x1: x1, x2: x2, y: r.y });
      });
    });
  });
  return out;
}

/** The pet window sitting on a perch: standing on its edge (as on the taskbar), his middle kept over the edge. */
function perchBounds(b, seg) {
  var half = PERCH_BODY / 2, cx = Math.max(seg.x1 + half, Math.min(b.x + b.width / 2, seg.x2 - half));
  return { x: Math.round(cx - b.width / 2), y: Math.round(seg.y - b.height + perchSink(b)), width: b.width, height: b.height };
}
/** How far the bottom of his window reaches below the top of the window he sits on, so his soles just clip into it (49 px in a 250 px window: 21 for the soles, 28 for the room under him that the page keeps, see `.stage` in styles.css). */
function perchSink(b) { return Math.round(49 * b.height / 250); }

/** The perch Fumu's window is standing on or just above or below (within `tol` px), if any. */
function perchUnder(b, segs, tol) {
  var cx = b.x + b.width / 2, feet = b.y + b.height - perchSink(b);
  return segs.filter(function (s) { return cx >= s.x1 && cx <= s.x2 && Math.abs(feet - s.y) <= tol; })
    .sort(function (p, q) { return Math.abs(feet - p.y) - Math.abs(feet - q.y); })[0] || null;
}

/** Perches that are on the same screen as the window and within `reach` px sideways, other than the one he is on. */
function perchesNear(b, segs, areas, reach, exceptId) {
  var cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  var area = areas.filter(function (a) { return cx >= a.x && cx < a.x + a.width && cy >= a.y && cy < a.y + a.height; })[0];
  if (!area) return [];
  return segs.filter(function (s) {
    if (s.id === exceptId || s.y < area.y || s.y > area.y + area.height) return false;
    var gap = cx < s.x1 ? s.x1 - cx : cx > s.x2 ? cx - s.x2 : 0;
    return gap <= reach;
  });
}

/** Down to the floor (the bottom of the screen's work area, above the taskbar) at the same place across. */
function floorBounds(b, area) { return within({ x: b.x, y: area.y + area.height - b.height - MARGIN / 2, width: b.width, height: b.height }, area); }

/** A tween that also lifts (a hop) in the middle of its time. */
function arcAt(a, b, t, lift) { var r = tweenAt(a, b, t); r.y -= Math.round(Math.sin(Math.PI * Math.max(0, Math.min(1, t))) * (lift || 0)); return r; }

/** Whether a point (page pixels) is on one of the solid rectangles [left, top, right, bottom], with `pad` pixels of slack. */
function hitTest(rects, x, y, pad) {
  return rects.some(function (r) { return x >= r[0] - pad && x <= r[2] + pad && y >= r[1] - pad && y <= r[3] + pad; });
}

/**
 * One step of him flying after the laser dot (app-laser.js): a spring towards `to` (where his window should be) with a top speed, so he
 * overshoots a little like a pet that cannot stop in time. The page's laserStep is the same rule.
 * @param {{x:number,y:number,vx:number,vy:number}} p His window's corner and speed (px, px/s); changed in place and returned.
 * @param {{x:number,y:number}} to @param {number} dt Seconds. @param {number} max Top speed, px/s. @param {number} [K=40] How stiff (a pounce is quicker).
 */
function chaseStep(p, to, dt, max, K) {
  K = K || 40;
  var DAMP = 2 * Math.sqrt(K) * 0.87;
  p.vx += ((to.x - p.x) * K - p.vx * DAMP) * dt;
  p.vy += ((to.y - p.y) * K - p.vy * DAMP) * dt;
  var sp = Math.hypot(p.vx, p.vy);
  if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
  p.x += p.vx * dt; p.y += p.vy * dt;
  return p;
}

/**
 * The laser dot's chase rules, one step: he chases while the dot moves; once it has sat still near him he stalks it (backs off, wiggles),
 * then pounces on it and holds it, following it while it is dragged slowly, until it darts away. The same rules as laserRule in app-laser.js: keep them in step.
 * @param {Object} st {phase, at, stillAt, holdX, holdY}, changed in place. @param {{now:number,x:number,y:number,speed:number,gap:number}} inp
 *   The time (ms), the dot (px), how fast it moves (px/s) and how far he is from his chasing spot (px).
 * @returns {string} chase, stalk, pounce or caught.
 */
function laserPhase(st, inp) {
  var t = inp.now;
  if (!st.phase) { st.phase = 'chase'; st.at = t; st.stillAt = t; }
  if (inp.speed > 60) st.stillAt = t;
  function to(ph) { st.phase = ph; st.at = t; if (ph === 'pounce' || ph === 'stalk') { st.holdX = inp.x; st.holdY = inp.y; } }
  if (st.phase === 'chase') { if (t - st.stillAt > 450 && inp.gap < 46) to('stalk'); }
  else if (st.phase === 'stalk') { if (inp.speed > 260 || Math.hypot(inp.x - st.holdX, inp.y - st.holdY) > 30) to('chase'); else if (t - st.at > 900) to('pounce'); }
  else if (st.phase === 'pounce') { if (t - st.at > 300) to('caught'); }
  // holding it: a slow drag takes him along with it (so he never falls behind a dot that creeps away); a quick move frees it
  else if (st.phase === 'caught') { if (inp.speed > 450 || Math.hypot(inp.x - st.holdX, inp.y - st.holdY) > 90) to('chase'); else { st.holdX = inp.x; st.holdY = inp.y; } }
  return st.phase;
}

module.exports = {
  chaseStep: chaseStep, laserPhase: laserPhase,
  hitTest: hitTest,  afterScreensChange: afterScreensChange, homeOnScreens: homeOnScreens, idleStep: idleStep, perches: perches, perchBounds: perchBounds, perchUnder: perchUnder, perchesNear: perchesNear, floorBounds: floorBounds, arcAt: arcAt, PERCH_BODY: PERCH_BODY,
  SIZES: SIZES, sizeFactor: sizeFactor, resizeKeepingBottom: resizeKeepingBottom, within: within, nudge: nudge, corner: corner, walkEnd: walkEnd, keepPartlyOn: keepPartlyOn, peekSpot: peekSpot, tweenAt: tweenAt, MARGIN: MARGIN, visibleFraction: visibleFraction, defaultBounds: defaultBounds, startBounds: startBounds, listBounds: listBounds, dragBounds: dragBounds };
