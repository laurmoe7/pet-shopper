// The celebration overlay's runner (celebrate.html): plays one celebration's effects over the whole screen, then clears them. The page in Mini Fumu's window plays the dance, the
// hat, the cake and the music; this only draws what the app draws around him: confetti, fireworks, snow, lights, bats, ghosts, bunting and so on. The effect functions are the
// app's own (app-birthday.js, app-xmas.js...), so a change to one shows up here too.
'use strict';

/** Plays the effects for one celebration. @param {string} kind birthday, christmas, halloween, newyear, easter or kingsday */
function runCelebration(kind) {
  var ms = CELEB.ms, total = CELEB.total, name = CELEB.name, layer;
  function cleanup(l, at) { setTimeout(function () { l.remove(); }, at); }
  if (kind === 'birthday') {
    bdayApp(name);   // (confetti, in a layer of its own; its card is taken off again)
    var bl = document.body.lastElementChild; if (bl && bl.firstElementChild) bl.firstElementChild.remove();
    bdayDesk();      // (balloons)
    var fw = bdayLayer(9500), fwMs = ms + 5500;
    bdayFireworks(fw, fwMs);
    cleanup(fw, fwMs + 3500);
  } else if (kind === 'christmas') {
    layer = bdayLayer(9000);
    xmasLights(layer, total); xmasSnow(layer, total);
    cleanup(layer, total + 800);
  } else if (kind === 'halloween') {
    layer = bdayLayer(9000);
    halloweenDark(layer, total);
    halloweenDecor(layer, total); halloweenLights(layer, total); halloweenGhosts(layer, total); halloweenBats(layer, total);
    cleanup(layer, total + 800);
  } else if (kind === 'newyear') {
    layer = bdayLayer(9000);
    halloweenDark(layer, total, 'rgba(22,18,84,.5)');
    newyearDiscoBall(layer, total, true);
    cleanup(layer, total + 800);
    setTimeout(function () { newyearFireworks(5500); }, ms + 300);
    // the party blower's confetti, from the tip of the blower (his mouth is about the middle of his window, a little below the centre; the tube reaches to the right)
    var k = CELEB.w / 320, tipX = CELEB.x + CELEB.w * 0.5 + 64 * k, tipY = CELEB.y + CELEB.h * 0.66 - 5 * k;
    [[800, 125, 16], [1700, 125, 16], [2800, 234, 46]].forEach(function (t) { setTimeout(function () { newyearPuff({ x: tipX, y: tipY }, t[2] * 2, 2.6); }, ms + 300 + t[0] + t[1]); });
  } else if (kind === 'easter') {
    layer = bdayLayer(9000);
    easterBunting(layer, total); easterPetals(layer, total); easterButterflies(layer, total); easterEggs(layer, total);
    cleanup(layer, total + 800);
  } else if (kind === 'kingsday') {
    layer = bdayLayer(9000);
    kingsBunting(layer, total); kingsBalloons(layer, total); kingsConfetti(layer, total);
    cleanup(layer, total + 800);
  }
}
runCelebration(CELEB.kind);
