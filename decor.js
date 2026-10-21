/* Decor: furniture and things for the room behind the pet.
 * Each item has a label, a default spot in the room (x and y from 0 to 1, the
 * item's centre across and down the stage), a size in pixels and an SVG drawing.
 * Placed items can be dragged around the room. All free for now.
 * Add a new item here and it shows up in the dressing room.
 */
(function (root) {
  'use strict';

  var INK = 'stroke="#5b4239" stroke-width="2" stroke-linejoin="round"';

  /**
   * The little plant (build 633, app-plant.js): a pot with a face and a plant that grows through seven stages as it is watered, one for each day something is ticked off.
   * 0 a seed, 1 a sprout, 2 and 3 more leaves, 4 a bud, 5 the bud opening, 6 the flower. `flower` picks the flower's colours, `thirsty` makes it droop.
   */
  var FLOWERS = [   // the flowers it grows, one after the other (each flower the plant finishes is the next in this list)
    { kind: 'daisy', name: 'Pink daisy', petal: '#ff9fb8', centre: '#ffd84a' },
    { kind: 'tulip', name: 'Red tulip', petal: '#ff6f7f', inner: '#ff9aa6' },
    { kind: 'sunflower', name: 'Sunflower', petal: '#ffd23f', centre: '#8a5a3c' },
    { kind: 'bluebell', name: 'Bluebell', petal: '#9db7ff', inner: '#c9d8ff' },
    { kind: 'daisy', name: 'Lavender daisy', petal: '#b8a1ff', centre: '#ffe27a' },
    { kind: 'tulip', name: 'Yellow tulip', petal: '#ffd75e', inner: '#ffe9a0' },
    { kind: 'daisy', name: 'White daisy', petal: '#fffaf4', centre: '#ffd84a' },
    { kind: 'tulip', name: 'Pink tulip', petal: '#ffa6c4', inner: '#ffc9dc' },
    { kind: 'bluebell', name: 'Pink bluebell', petal: '#f2a1d6', inner: '#f9c9e8' },
    { kind: 'daisy', name: 'Orange daisy', petal: '#ffb066', centre: '#6b4a38' }
  ];
  /** @param {number} stage 0 to 6 @param {number} flower Which flower it is growing (a count of the ones finished) @param {boolean} thirsty @param {number} [progress] 0 to 2: waterings towards the next stage (it gets a little bigger with each) */
  function plantSvg(stage, flower, thirsty, progress) {
    var fl = FLOWERS[((flower | 0) % FLOWERS.length + FLOWERS.length) % FLOWERS.length], G = '#8fd18a', GD = '#6fb56d';
    function leaf(x, y, ang, sz) { return '<path d="M0 0 Q' + (sz * 0.55) + ' ' + (-sz * 0.5) + ' ' + sz + ' 0 Q' + (sz * 0.55) + ' ' + (sz * 0.5) + ' 0 0Z" transform="translate(' + x + ' ' + y + ') rotate(' + ang + ')" fill="' + G + '" ' + INK.replace('stroke-width="2"', 'stroke-width="1.6"') + '/>'; }
    var top = '', sk = 'stroke="#5b4239" stroke-width="1.6" stroke-linejoin="round"';
    if (stage === 0) top = '<ellipse cx="30" cy="38.4" rx="3.4" ry="2.3" fill="#d7b48a" ' + sk + '/><path d="M28.6 37.8 q1.4 -1 2.8 0" fill="none" stroke="#fff6ec" stroke-width="1" stroke-linecap="round"/>';
    else {
      var h = [0, 8, 14, 20, 25, 27, 28][stage];   // how far the stem reaches up
      top = '<path d="M30 40 V' + (40 - h) + '" stroke="#5b4239" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M30 40 V' + (40 - h) + '" stroke="' + GD + '" stroke-width="2.6" stroke-linecap="round" fill="none"/>';
      if (stage === 1) top += leaf(30, 33, -150, 7) + leaf(30, 33, -30, 7);
      if (stage >= 2) top += leaf(30, 36, thirsty ? -175 : -160, 9) + leaf(30, 36, thirsty ? -5 : -20, 9);
      if (stage >= 3) top += leaf(30, 28, thirsty ? -165 : -135, 10) + leaf(30, 28, thirsty ? -15 : -45, 10);
      var ty = 40 - h, cy = ty - 7;
      if (stage === 4) top += '<path d="M30 ' + (ty + 1) + ' C23 ' + (ty - 3) + ' 25 ' + (ty - 12) + ' 30 ' + (ty - 15) + ' C35 ' + (ty - 12) + ' 37 ' + (ty - 3) + ' 30 ' + (ty + 1) + 'Z" fill="' + G + '" ' + sk + '/><path d="M30 ' + (ty - 15) + ' C28 ' + (ty - 11) + ' 28.4 ' + (ty - 9) + ' 30 ' + (ty - 7) + '" fill="none" stroke="' + fl.petal + '" stroke-width="2.4" stroke-linecap="round"/>';
      if (stage === 5) top += '<path d="M30 ' + (ty + 1) + ' C24 ' + (ty - 1) + ' 23 ' + (ty - 8) + ' 25 ' + (ty - 13) + ' L30 ' + (ty - 8) + ' L35 ' + (ty - 13) + ' C37 ' + (ty - 8) + ' 36 ' + (ty - 1) + ' 30 ' + (ty + 1) + 'Z" fill="' + fl.petal + '" ' + sk + '/><path d="M30 ' + (ty + 1) + ' C27 ' + (ty - 3) + ' 27 ' + (ty - 7) + ' 30 ' + (ty - 8) + ' C33 ' + (ty - 7) + ' 33 ' + (ty - 3) + ' 30 ' + (ty + 1) + 'Z" fill="' + G + '" ' + sk + '/>';
      if (stage === 6) {
        var k, petals = '';
        if (fl.kind === 'daisy') {
          for (k = 0; k < 6; k++) petals += '<ellipse cx="30" cy="' + (cy - 8) + '" rx="4.6" ry="6.4" transform="rotate(' + (k * 60) + ' 30 ' + cy + ')" fill="' + fl.petal + '" ' + sk + '/>';
          top += petals + '<circle cx="30" cy="' + cy + '" r="4.6" fill="' + fl.centre + '" ' + sk + '/><circle cx="28.4" cy="' + (cy - 1.4) + '" r="1.1" fill="#fff" opacity=".8"/>';
        } else if (fl.kind === 'sunflower') {
          for (k = 0; k < 12; k++) petals += '<ellipse cx="30" cy="' + (cy - 9.5) + '" rx="2.7" ry="6" transform="rotate(' + (k * 30) + ' 30 ' + cy + ')" fill="' + fl.petal + '" ' + sk.replace('1.6', '1.3') + '/>';
          top += petals + '<circle cx="30" cy="' + cy + '" r="6.4" fill="' + fl.centre + '" ' + sk + '/><circle cx="27.6" cy="' + (cy - 1.8) + '" r=".9" fill="#c99663"/><circle cx="31.8" cy="' + (cy - 2.4) + '" r=".9" fill="#c99663"/><circle cx="30" cy="' + (cy + 1.8) + '" r=".9" fill="#c99663"/><circle cx="33" cy="' + (cy + 1) + '" r=".9" fill="#c99663"/><circle cx="27" cy="' + (cy + 1.6) + '" r=".9" fill="#c99663"/>';
        } else if (fl.kind === 'tulip') {
          var b = cy + 6;   // the cup: two side petals behind and a middle one in front, with a lighter inside
          top += '<path d="M30 ' + b + ' C20 ' + (b - 1) + ' 19 ' + (b - 11) + ' 21 ' + (cy - 11) + ' L26 ' + (cy - 5) + ' L30 ' + (cy - 13) + ' Z" fill="' + fl.petal + '" ' + sk + '/>' +
            '<path d="M30 ' + b + ' C40 ' + (b - 1) + ' 41 ' + (b - 11) + ' 39 ' + (cy - 11) + ' L34 ' + (cy - 5) + ' L30 ' + (cy - 13) + ' Z" fill="' + fl.petal + '" ' + sk + '/>' +
            '<path d="M30 ' + b + ' C23.5 ' + (b - 1) + ' 23 ' + (cy - 3) + ' 26 ' + (cy - 9) + ' L30 ' + (cy - 4) + ' L34 ' + (cy - 9) + ' C37 ' + (cy - 3) + ' 36.5 ' + (b - 1) + ' 30 ' + b + 'Z" fill="' + fl.inner + '" ' + sk + '/>' +
            '<path d="M25.5 ' + (cy - 1) + ' q-1 -4 1 -6" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>';
        } else {   // bluebell: the stem bends over and little bells hang from it
          var bell = function (x, y, sz) { return '<path d="M' + x + ' ' + y + ' q' + (-sz) + ' ' + (sz * 0.6) + ' ' + (-sz * 0.9) + ' ' + (sz * 1.5) + ' q' + (sz * 0.9) + ' ' + (sz * 0.5) + ' ' + (sz * 1.8) + ' 0 q' + (-sz * 0.1) + ' ' + (-sz * 0.9) + ' ' + (-sz * 0.9) + ' ' + (-sz * 1.5) + 'Z" fill="' + fl.petal + '" ' + sk.replace('1.6', '1.4') + '/><path d="M' + (x - sz * 0.7) + ' ' + (y + sz * 1.7) + ' h' + (sz * 1.4) + '" stroke="' + fl.inner + '" stroke-width="1.6" stroke-linecap="round"/>'; };
          top += '<path d="M30 ' + ty + ' Q30 ' + (cy - 11) + ' 37 ' + (cy - 11) + '" stroke="#5b4239" stroke-width="4.4" stroke-linecap="round" fill="none"/><path d="M30 ' + ty + ' Q30 ' + (cy - 11) + ' 37 ' + (cy - 11) + '" stroke="' + GD + '" stroke-width="2.2" stroke-linecap="round" fill="none"/>' +
            bell(38, cy - 9, 6.4) + bell(31.5, cy - 3, 5.8) + bell(24, ty - 1, 5.2);
        }
      }
    }
    var pot = '<path d="M14 44 H46 L42.6 65 Q30 68.4 17.4 65 Z" fill="#e8a98a" ' + INK + '/>' +
      '<rect x="11" y="39.6" width="38" height="7.4" rx="3.2" fill="#f2bea3" ' + INK + '/>' +
      '<circle cx="24" cy="55" r="1.7" fill="#5b4239"/><circle cx="36" cy="55" r="1.7" fill="#5b4239"/>' +
      (thirsty ? '<path d="M27.4 60.4 Q30 58.6 32.6 60.4" fill="none" stroke="#5b4239" stroke-width="1.5" stroke-linecap="round"/>' : '<path d="M27.4 58.6 Q30 61.8 32.6 58.6" fill="none" stroke="#5b4239" stroke-width="1.5" stroke-linecap="round"/>') +
      '<ellipse cx="20" cy="58.6" rx="3" ry="1.8" fill="#ff9fb8" opacity=".7"/><ellipse cx="40" cy="58.6" rx="3" ry="1.8" fill="#ff9fb8" opacity=".7"/>';
    var soil = '<ellipse cx="30" cy="40.4" rx="16" ry="3" fill="#8a6a52" ' + sk + '/>';
    var grow = stage < 6 && progress ? 1 + 0.045 * Math.min(2, progress | 0) : 1;   // each watering makes it a little bigger, until the next stage
    var tf = (grow !== 1 ? 'translate(30 40) scale(' + grow + ') translate(-30 -40)' : '') + (thirsty ? ' rotate(7 30 40)' : '');
    return soil + '<g class="plant-top"' + (tf ? ' transform="' + tf.trim() + '"' : '') + '>' + top + '</g>' + pot;
  }
  root.PlantArt = { svg: plantSvg, FLOWERS: FLOWERS, VIEW: '0 0 60 70' };

  root.Decor = [
    {
      // listed first so it lies under everything else, right below the cushion
      id: 'rug', label: 'Rug', x: 0.5, y: 0.93, w: 220, h: 36, view: '0 0 200 34',
      svg: '<ellipse cx="100" cy="19.5" rx="97" ry="14.5" fill="#5b4239" opacity=".12"/>' +
        '<ellipse cx="100" cy="17" rx="97" ry="14.5" fill="#ffd9e2" ' + INK + '/>' +
        '<ellipse cx="100" cy="17" rx="84" ry="10.5" fill="none" stroke="#ff9fb5" stroke-width="2.4" stroke-dasharray="5 4"/>' +
        '<ellipse cx="100" cy="17" rx="66" ry="7" fill="#fff0f4"/>' +
        '<path d="M44 17 l5 -3 5 3 -5 3z M151 17 l5 -3 5 3 -5 3z" fill="#ffb3c6"/>' +
        '<g fill="#ffb3c6"><ellipse cx="100" cy="19" rx="4.2" ry="3.2"/><circle cx="94.6" cy="14.6" r="1.7"/><circle cx="98.4" cy="12.4" r="1.7"/><circle cx="102.6" cy="12.4" r="1.7"/><circle cx="106.4" cy="14.6" r="1.7"/></g>' +
        '<path d="M22 11 Q60 3.6 100 3.2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M70 17 l3 -2 3 2 -3 2z M124 17 l3 -2 3 2 -3 2z" fill="#ffd0dc"/>' +
        '<path d="M3 13 l-3 -1 M2 17 h-3 M3 21 l-3 1 M197 13 l3 -1 M198 17 h3 M197 21 l3 1" stroke="#5b4239" stroke-width="1.6" stroke-linecap="round"/>'
    },
    {
      id: 'window', label: 'Window', x: 0.84, y: 0.32, w: 70, h: 64, view: '0 0 60 56',
      // the curtains hang from the rod outside the frame, gathered by tiebacks; their folds stay inside the cloth, off the glass
      svg: '<rect x="9" y="6" width="42" height="40" rx="5" fill="#fffaf4" ' + INK + '/>' +
        '<rect x="13" y="10" width="34" height="32" rx="3" fill="#cfe9fb"/>' +
        '<path d="M13 34 Q30 30 47 33 V39 a3 3 0 0 1 -3 3 H16 a3 3 0 0 1 -3 -3 Z" fill="#e3f3fc"/>' +
        '<circle cx="40" cy="17" r="6" fill="#fff3b8" opacity=".6"/><circle cx="40" cy="17" r="3.2" fill="#ffe27a"/>' +
        '<path d="M17 24 a3.4 3.4 0 0 1 5 -2.6 a4.4 4.4 0 0 1 8 1 a3 3 0 0 1 1.4 5 h-13 a2.6 2.6 0 0 1 -1.4 -3.4z" fill="#fff"/>' +
        '<path d="M17 39 L22.4 13 M22 39 L25.6 22" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>' +
        '<path d="M30 10 V42 M13 26 H47" stroke="#fffaf4" stroke-width="3"/>' +
        '<rect x="13" y="10" width="34" height="32" rx="3" fill="none" stroke="#5b4239" stroke-width="1.6"/>' +
        '<path d="M30 10 V42 M13 26 H47" stroke="#5b4239" stroke-width="1" opacity=".35"/>' +
        '<rect x="5" y="44.5" width="50" height="6.5" rx="3.2" fill="#f6dcc8" ' + INK + '/>' +
        '<path d="M8 46.8 H52" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>' +
        [1, -1].map(function (d) {
          var X = function (x) { return d === 1 ? x : 60 - x; };
          return '<path d="M' + X(2) + ' 4 H' + X(16.5) + ' Q' + X(15.5) + ' 17 ' + X(10.5) + ' 28 Q' + X(13.6) + ' 38 ' + X(14) + ' 52 Q' + X(10.4) + ' 53.6 ' + X(8) + ' 52 Q' + X(5) + ' 53.6 ' + X(2) + ' 52 Z" fill="#ffc1cf" ' + INK + '/>' +
            '<path d="M' + X(6) + ' 6 Q' + X(6.6) + ' 17 ' + X(5.4) + ' 26 M' + X(10.5) + ' 6 Q' + X(11) + ' 16 ' + X(8.4) + ' 26 M' + X(5) + ' 31 Q' + X(5.8) + ' 40 ' + X(5) + ' 50 M' + X(8.6) + ' 31 Q' + X(10.2) + ' 40 ' + X(10) + ' 50" fill="none" stroke="#f39bb0" stroke-width="1.2" stroke-linecap="round"/>' +
            '<path d="M' + X(2.6) + ' 28.2 Q' + X(6.6) + ' 30.6 ' + X(10.6) + ' 28" fill="none" stroke="#5b4239" stroke-width="4" stroke-linecap="round"/>' +
            '<path d="M' + X(2.6) + ' 28.2 Q' + X(6.6) + ' 30.6 ' + X(10.6) + ' 28" fill="none" stroke="#ffe27a" stroke-width="2" stroke-linecap="round"/>';
        }).join('') +
        '<rect x="1" y="2" width="58" height="3.4" rx="1.7" fill="#d9a77c" stroke="#5b4239" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<circle cx="2.4" cy="3.7" r="2.3" fill="#e9bf96" stroke="#5b4239" stroke-width="1.4"/><circle cx="57.6" cy="3.7" r="2.3" fill="#e9bf96" stroke="#5b4239" stroke-width="1.4"/>'
    },
    {
      id: 'beanbag', label: 'Beanbag', x: 0.84, y: 0.78, w: 82, h: 58, view: '0 0 72 50',
      svg: '<path d="M7 44 C1 31 9 13 29 10 C47 8 64 18 66 34 C67 44 57 47 37 47 C21 47 10 47 7 44 Z" fill="#b9d9f2" ' + INK + '/>' +
        '<path d="M37 11 Q22 26 12 43 M37 11 Q52 26 62 43" fill="none" stroke="#8fbde3" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="3 3"/>' +
        '<path d="M9 40 C16 44 30 45 40 45 C53 45 61 42 65 36 C65.6 42 60 46.2 37 46.2 C22 46.2 11 46 9 40 Z" fill="#9cc8ea"/>' +
        '<path d="M8 41 C14 45.4 30 46 40 46 C54 46 62 44 66 38" fill="none" stroke="#8fbde3" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>' +
        '<circle cx="37" cy="11.5" r="2.6" fill="#ffc1cf" stroke="#5b4239" stroke-width="1.4"/>' +
        '<path d="M14 22 C18 17 23 14 28 13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
        '<ellipse cx="36" cy="47.5" rx="26" ry="2.5" fill="#5b4239" opacity=".12"/>'
    },
    {
      id: 'clock', label: 'Cuckoo clock', x: 0.63, y: 0.22, w: 46, h: 68, view: '0 0 44 66',
      // the hands show the real time
      svg: '<path d="M3 20 L22 3 L41 20 Z" fill="#c98f6a" ' + INK + '/>' +
        '<path d="M10 15.2 H34 M15 10.2 H29" stroke="#a9704c" stroke-width="1.3" stroke-linecap="round"/>' +
        '<path d="M22 3 C20 -1 25 -2 26 1" fill="#9ed99a" stroke="#5b4239" stroke-width="1.4"/>' +
        '<rect x="7" y="18" width="30" height="29" rx="3" fill="#e9bf96" ' + INK + '/>' +
        '<path d="M9.6 21 V44" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>' +
        '<path d="M10 25 q-2 2 0 4 M34 25 q2 2 0 4 M10 38 q-2 2 0 4 M34 38 q2 2 0 4" fill="none" stroke="#a9704c" stroke-width="1.2" stroke-linecap="round"/>' +
        '<rect x="18" y="8" width="8" height="8" rx="2" fill="#7a5442" stroke="#5b4239" stroke-width="1.4"/>' +
        '<circle cx="22" cy="12.5" r="2.6" fill="#ffd65c"/><path d="M24.4 12.5 l2 -.6 -2 -.6" fill="#f39b5a"/>' +
        '<circle cx="22" cy="32" r="9.5" fill="#fffaf4" ' + INK + '/>' +
        '<g class="clock-hands"><path class="clock-hour" d="M22 32 V26.5" stroke="#5b4239" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path class="clock-minute" d="M22 32 V24" stroke="#5b4239" stroke-width="1.5" stroke-linecap="round"/></g>' +
        '<circle cx="22" cy="32" r="1.4" fill="#5b4239"/>' +
        '<rect x="9" y="46" width="26" height="3" rx="1.5" fill="#c98f6a" stroke="#5b4239" stroke-width="1.4"/>' +
        // chains and two pine-cone weights, one hanging lower than the other
        '<path d="M16 49 V55 M28 49 V51" stroke="#5b4239" stroke-width="1.6" stroke-dasharray="1.4 1"/>' +
        '<path d="M13 55 h6 l-.4 2.4 q-.4 5.6 -2.6 7.6 q-2.2 -2 -2.6 -7.6 Z" fill="#c98f6a" stroke="#5b4239" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<path d="M13.8 58.4 q2.2 1.4 4.4 0 M14.4 61.2 q1.6 1.2 3.2 0" fill="none" stroke="#a9704c" stroke-width="1" stroke-linecap="round"/>' +
        '<path d="M25 51 h6 l-.4 2.4 q-.4 5.6 -2.6 7.6 q-2.2 -2 -2.6 -7.6 Z" fill="#c98f6a" stroke="#5b4239" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<path d="M25.8 54.4 q2.2 1.4 4.4 0 M26.4 57.2 q1.6 1.2 3.2 0" fill="none" stroke="#a9704c" stroke-width="1" stroke-linecap="round"/>'
    },
    {
      id: 'desk', label: 'Gaming desk', x: 0.16, y: 0.78, w: 96, h: 76, view: '0 0 90 72',
      // a pastel desk with a glowing PC, a little game on screen and a kitty-ear headset
      svg: '<ellipse cx="45" cy="71" rx="43" ry="2.4" fill="#5b4239" opacity=".12"/>' +
        '<rect x="6" y="46" width="5" height="24" rx="2" fill="#b79ad6" ' + INK + '/>' +
        '<rect x="79" y="46" width="5" height="24" rx="2" fill="#b79ad6" ' + INK + '/>' +
        '<rect x="2" y="40" width="86" height="7" rx="3" fill="#d9c4f2" ' + INK + '/>' +
        '<path d="M6 42.2 H84" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>' +
        '<rect x="62" y="47" width="16" height="9" rx="2" fill="#cbb2ec" stroke="#5b4239" stroke-width="1.6"/><circle cx="70" cy="51.5" r="1.5" fill="#fffaf4" stroke="#5b4239" stroke-width="1"/>' +
        '<rect x="13" y="9" width="42" height="27" rx="4" fill="#4d3c43" ' + INK + '/>' +
        '<rect x="43" y="3.5" width="9" height="8.5" rx="1" fill="#ffe9a3" stroke="#5b4239" stroke-width="1.2" transform="rotate(-8 47 8)"/><path d="M45 7 h5 M45 9.4 h3.4" stroke="#e0a865" stroke-width="1" stroke-linecap="round" transform="rotate(-8 47 8)"/>' +
        '<rect x="16.5" y="12.5" width="35" height="20" rx="2" fill="#a9dcff"/>' +
        '<path d="M16.5 27 H51.5 V32.5 H16.5 Z" fill="#9ed99a"/>' +
        '<rect x="24" y="21" width="5" height="6" rx="1" fill="#ff9fb5"/><rect x="25" y="22.5" width="1" height="1" fill="#5b4239"/><rect x="27" y="22.5" width="1" height="1" fill="#5b4239"/>' +
        '<path d="M41 18 c-1 -1.6 -3.4 -.6 -2.4 1 l2.4 2.4 2.4 -2.4 c1 -1.6 -1.4 -2.6 -2.4 -1z" fill="#ff7a99"/>' +
        '<rect x="31" y="36" width="6" height="4" fill="#4d3c43"/>' +
        '<rect x="15" y="37.5" width="28" height="3.5" rx="1.5" fill="#fffaf4" stroke="#5b4239" stroke-width="1.4"/>' +
        '<path d="M18 39.2 h4 M24 39.2 h4 M30 39.2 h4 M36 39.2 h4" stroke="#ff9fb5" stroke-width="1.4" stroke-linecap="round"/>' +
        '<ellipse cx="49" cy="39" rx="3" ry="2" fill="#fffaf4" stroke="#5b4239" stroke-width="1.4"/>' +
        '<rect x="61" y="10" width="20" height="30" rx="3" fill="#fffaf4" ' + INK + '/>' +
        '<circle cx="71" cy="19" r="4.5" fill="#ffc1cf" stroke="#5b4239" stroke-width="1.4"/>' +
        '<circle cx="71" cy="31" r="4.5" fill="#bfe8d4" stroke="#5b4239" stroke-width="1.4"/>' +
        '<path d="M71 16 v6 M68 19 h6 M71 28 v6 M68 31 h6" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M64 13 V37" stroke="#c7a6ff" stroke-width="1.6" stroke-linecap="round"/>' +
        // the kitty-ear headset resting on top of the tower
        '<path d="M64.6 6 C64.6 0.6 77.4 0.6 77.4 6" fill="none" stroke="#5b4239" stroke-width="3.6" stroke-linecap="round"/><path d="M64.6 6 C64.6 0.6 77.4 0.6 77.4 6" fill="none" stroke="#ff9fb5" stroke-width="1.8" stroke-linecap="round"/>' +
        '<path d="M66.4 3.4 l.6 -3 2.4 1.8 Z M75.6 3.4 l-.6 -3 -2.4 1.8 Z" fill="#ff9fb5" stroke="#5b4239" stroke-width="1" stroke-linejoin="round"/>' +
        '<rect x="62" y="5" width="5" height="5.4" rx="2" fill="#ffc1cf" stroke="#5b4239" stroke-width="1.3"/><rect x="75" y="5" width="5" height="5.4" rx="2" fill="#ffc1cf" stroke="#5b4239" stroke-width="1.3"/>'
    },
    {
      // grows as things are ticked off (app-plant.js): the drawing here is only its picture in the Room list, the room shows the real stage
      id: 'plant', label: 'Little plant', x: 0.2, y: 0.84, w: 54, h: 63, view: '0 0 60 70', svg: plantSvg(5, 0, false, 0)
    },
    {
      id: 'bookshelf', label: 'Bookshelf', x: 0.08, y: 0.54, w: 62, h: 80, view: '0 0 56 72',
      // three shelves: books standing and leaning, a little succulent, a stack of books and a basket
      svg: '<ellipse cx="28" cy="70.5" rx="24" ry="2.4" fill="#5b4239" opacity=".12"/>' +
        '<rect x="4" y="4" width="48" height="64" rx="3" fill="#e9bf96" ' + INK + '/>' +
        '<rect x="8.5" y="8.5" width="39" height="55" rx="1.5" fill="#d9a77c"/>' +
        '<rect x="8" y="28" width="40" height="4" fill="#e9bf96" stroke="#5b4239" stroke-width="1.6"/>' +
        '<rect x="8" y="48" width="40" height="4" fill="#e9bf96" stroke="#5b4239" stroke-width="1.6"/>' +
        '<g stroke="#5b4239" stroke-width="1.3" stroke-linejoin="round">' +
        '<rect x="10.5" y="13" width="5.5" height="15" rx="1" fill="#ff9fb5"/><rect x="16.5" y="10.5" width="4.5" height="17.5" rx="1" fill="#9ed99a"/>' +
        '<rect x="21.5" y="15" width="6" height="13" rx="1" fill="#ffd65c"/><rect x="28.5" y="11.5" width="4.5" height="16.5" rx="1" fill="#a9dcff"/>' +
        '<path d="M34 28 L35.5 13 L41 14 L40.5 28 Z" fill="#c7a6ff"/></g>' +
        '<path d="M12 16.5 h2.4 M12 23 h2.4 M23 19 h3 M30 15.5 h1.4 M30 22 h1.4" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".75"/>' +
        '<rect x="12.8" y="35.4" width="5.8" height="7.6" rx="2.9" fill="#8fd18a" stroke="#5b4239" stroke-width="1.3"/><path d="M12.8 40 q-2.6 0 -2.6 -2.6 M18.6 39.4 q2.6 0 2.6 -2.6" fill="none" stroke="#5b4239" stroke-width="3.4" stroke-linecap="round"/><path d="M12.8 40 q-2.6 0 -2.6 -2.6 M18.6 39.4 q2.6 0 2.6 -2.6" fill="none" stroke="#8fd18a" stroke-width="1.6" stroke-linecap="round"/><circle cx="15.7" cy="35.6" r="1.5" fill="#ff9fb8" stroke="#5b4239" stroke-width="1"/>' +
        '<path d="M10.5 48 H21 L19.8 40.4 H11.7 Z" fill="#ffc1cf" stroke="#5b4239" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<rect x="27" y="43.5" width="18" height="4.5" rx="1" fill="#9ed99a" stroke="#5b4239" stroke-width="1.3"/><rect x="29" y="39" width="15" height="4.5" rx="1" fill="#ffb3c6" stroke="#5b4239" stroke-width="1.3"/><path d="M31 41.2 h11" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".75"/>' +
        '<path d="M10 63.5 H21 L20.2 54.5 H10.8 Z" fill="#f6dcc8" stroke="#5b4239" stroke-width="1.4" stroke-linejoin="round"/><path d="M10.6 57.7 H20.4" stroke="#e0a865" stroke-width="1.2"/>' +
        '<rect x="26" y="54.5" width="7" height="9" rx="1" fill="#bfe8d4" stroke="#5b4239" stroke-width="1.3"/><rect x="34" y="56" width="6" height="7.5" rx="1" fill="#ffe9a3" stroke="#5b4239" stroke-width="1.3"/>' +
        '<path d="M26 1.5 c-1.4 -2.2 -4.6 -.4 -3 1.8 l3 3 3 -3 c1.6 -2.2 -1.6 -4 -3 -1.8z" fill="#ff7a99" stroke="#5b4239" stroke-width="1.2" stroke-linejoin="round"/>' +
        '<path d="M6.5 8 V60" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>' +
        '<rect x="8" y="66" width="6" height="3" rx="1" fill="#c98f6a" stroke="#5b4239" stroke-width="1.2"/><rect x="42" y="66" width="6" height="3" rx="1" fill="#c98f6a" stroke="#5b4239" stroke-width="1.2"/>'
    },
    {
      id: 'lamp', label: 'Floor lamp', x: 0.72, y: 0.62, w: 40, h: 84, view: '0 0 36 76',
      // a warm glow round a pink shade
      svg: '<defs><radialGradient id="decorLampGlow"><stop offset="0" stop-color="#ffe9a3" stop-opacity=".8"/><stop offset="1" stop-color="#ffe9a3" stop-opacity="0"/></radialGradient></defs>' +
        '<circle cx="18" cy="22" r="26" fill="url(#decorLampGlow)"/>' +
        '<ellipse cx="18" cy="72" rx="13" ry="3.4" fill="#5b4239" opacity=".12"/>' +
        '<path d="M18 36 V68" stroke="#5b4239" stroke-width="4" stroke-linecap="round"/><path d="M18 36 V68" stroke="#f6dcc8" stroke-width="1.6" stroke-linecap="round"/>' +
        '<ellipse cx="18" cy="68.5" rx="11" ry="3.8" fill="#c7a6ff" ' + INK + '/><path d="M11.5 67.4 q6.5 -1.6 13 0" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M6.5 34 L11.5 10 Q18 6.5 24.5 10 L29.5 34 Q18 38.5 6.5 34 Z" fill="#ffc1cf" ' + INK + '/>' +
        '<ellipse cx="18" cy="9.6" rx="6.6" ry="2.2" fill="#ffe9a3" stroke="#5b4239" stroke-width="1.6"/>' +
        '<path d="M10 31 L13.4 14 M15.4 34 L17 14 M21 34 L21 14" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>' +
        '<path d="M8.4 32 Q18 36 27.6 32" fill="none" stroke="#f39bb0" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M26 36 v5 M26 41 q-2 1.6 0 3.4 q2 -1.8 0 -3.4z" stroke="#5b4239" stroke-width="1.3" stroke-linecap="round" fill="#ff9fb8"/>'
    },
    {
      id: 'fishbowl', label: 'Fish bowl', x: 0.3, y: 0.8, w: 54, h: 66, view: '0 0 48 60',
      // a goldfish in a glass bowl on a little purple stool
      svg: '<ellipse cx="24" cy="58" rx="19" ry="2.2" fill="#5b4239" opacity=".12"/>' +
        '<path d="M12 41 L9.5 57 M36 41 L38.5 57" stroke="#5b4239" stroke-width="3.4" stroke-linecap="round"/><path d="M12 41 L9.5 57 M36 41 L38.5 57" stroke="#b79ad6" stroke-width="1.6" stroke-linecap="round"/>' +
        '<rect x="7" y="37" width="34" height="6.5" rx="3.2" fill="#d9c4f2" ' + INK + '/><path d="M11 39.6 H37" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M9 19 Q9 6 24 6 Q39 6 39 19 Q39 36 24 37 Q9 36 9 19 Z" fill="#e6f4fc" fill-opacity=".85" ' + INK + '/>' +
        '<path d="M10.6 18 Q24 21.4 37.4 18 Q38 32.6 24 35.4 Q10 32.6 10.6 18 Z" fill="#8fd0f2" opacity=".85"/>' +
        '<path d="M10.6 18 Q24 21.4 37.4 18" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>' +
        '<ellipse cx="24" cy="6.6" rx="8.4" ry="1.9" fill="none" stroke="#5b4239" stroke-width="1.4"/>' +
        // the weed and pebbles are clipped to the water, so nothing pokes through the glass
        '<defs><clipPath id="decorBowlWater"><path d="M10.6 18 Q24 21.4 37.4 18 Q38 32.6 24 35.4 Q10 32.6 10.6 18 Z"/></clipPath></defs>' +
        '<g clip-path="url(#decorBowlWater)"><path d="M14.6 34 q-1.8 -4 .4 -7 q2 -3 0 -6.6 M33.4 34 q1.6 -3.4 -.4 -6 q-1.6 -2.6 .6 -5.6" fill="none" stroke="#6fb56d" stroke-width="2" stroke-linecap="round"/>' +
        '<g stroke="#5b4239" stroke-width="1"><ellipse cx="19.6" cy="33.8" rx="2.2" ry="1.4" fill="#ffc1cf"/><ellipse cx="24.4" cy="34.4" rx="2.2" ry="1.3" fill="#fffaf4"/><ellipse cx="29" cy="33.8" rx="2" ry="1.3" fill="#bfe8d4"/></g></g>' +
        '<path d="M28 26 l6 -4.2 v8.4 z" fill="#ffa24d" stroke="#5b4239" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<ellipse cx="22.4" cy="26" rx="6.2" ry="4.2" fill="#ffa24d" stroke="#5b4239" stroke-width="1.4"/>' +
        '<path d="M22 22.4 q2.6 -2.4 5 .2" fill="#ff8a3d" stroke="#5b4239" stroke-width="1.1" stroke-linejoin="round"/>' +
        '<circle cx="19.6" cy="25" r="1.5" fill="#fff" stroke="#5b4239" stroke-width="1"/><circle cx="19.4" cy="25.1" r=".7" fill="#5b4239"/><path d="M17.6 27.8 q1 .8 2 .1" fill="none" stroke="#5b4239" stroke-width=".9" stroke-linecap="round"/>' +
        '<circle cx="31" cy="15.4" r="1.7" fill="#fff" fill-opacity=".7" stroke="#5b4239" stroke-width=".9"/><circle cx="33.4" cy="11.4" r="1.1" fill="#fff" fill-opacity=".7" stroke="#5b4239" stroke-width=".8"/>' +
        '<path d="M12.2 15 Q13.2 9.6 18 8.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".85"/>'
    }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
