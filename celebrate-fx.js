// The celebration overlay's runner (celebrate.html): plays one celebration's effects over the whole screen, then clears them. The page in Mini Fumu's window plays the dance, the
// hat, the cake and the music; this only draws what the app draws around him: confetti, fireworks, snow, lights, bats, ghosts, bunting and so on. The effect functions are the
// app's own (app-birthday.js, app-xmas.js...), so a change to one shows up here too.
'use strict';

/** Moves a banner card (made for the bottom of the app) to just above Fumu, where the whole screen is free. @param {HTMLElement} card */
function overlayCard(card) {
  if (!card) return;
  var w = Math.min(360, window.innerWidth * 0.9), cx = CELEB.x + CELEB.w / 2;
  card.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, cx - w / 2)) + 'px';
  card.style.right = 'auto'; card.style.margin = '0'; card.style.width = w + 'px'; card.style.bottom = 'auto';
  card.style.top = Math.max(10, CELEB.y - 72) + 'px';
}
/** The card of the last layer that was made (the banner functions add it first). @param {Element} layer */
function layerCard(layer) { return layer && layer.firstElementChild; }

/** Plays the effects for one celebration. @param {string} kind birthday, christmas, halloween, newyear, easter or kingsday */
function runCelebration(kind) {
  var ms = CELEB.ms, total = CELEB.total, name = CELEB.name, layer;
  function cleanup(l, at) { setTimeout(function () { l.remove(); }, at); }
  if (kind === 'birthday') {
    bdayApp(name);   // (confetti and the banner, in a layer of its own)
    overlayCard(layerCard(document.body.lastElementChild));
    bdayDesk();      // (balloons)
    var fw = bdayLayer(9500), fwMs = ms + 5500;
    bdayFireworks(fw, fwMs);
    cleanup(fw, fwMs + 3500);
  } else if (kind === 'christmas') {
    layer = bdayLayer(9000);
    xmasBanner(layer, name); overlayCard(layerCard(layer));
    xmasLights(layer, total); xmasSnow(layer, total);
    cleanup(layer, total + 800);
  } else if (kind === 'halloween') {
    layer = bdayLayer(9000);
    halloweenDark(layer, total);
    halloweenBanner(layer, name); overlayCard(layer.lastElementChild);
    halloweenDecor(layer, total); halloweenLights(layer, total); halloweenGhosts(layer, total); halloweenBats(layer, total);
    cleanup(layer, total + 800);
  } else if (kind === 'newyear') {
    layer = bdayLayer(9000);
    halloweenDark(layer, total, 'rgba(22,18,84,.5)');
    newyearBanner(layer, name); overlayCard(layer.lastElementChild);
    newyearDiscoBall(layer, total);
    cleanup(layer, total + 800);
    setTimeout(function () { newyearFireworks(5500); }, ms + 300);
  } else if (kind === 'easter') {
    layer = bdayLayer(9000);
    easterBanner(layer, name); overlayCard(layerCard(layer));
    easterBunting(layer, total); easterPetals(layer, total); easterButterflies(layer, total); easterEggs(layer, total);
    cleanup(layer, total + 800);
  } else if (kind === 'kingsday') {
    layer = bdayLayer(9000);
    kingsBanner(layer, name); overlayCard(layerCard(layer));
    kingsBunting(layer, total); kingsBalloons(layer, total); kingsConfetti(layer, total);
    cleanup(layer, total + 800);
  }
}
runCelebration(CELEB.kind);
