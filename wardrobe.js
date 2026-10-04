/* Wardrobe: the items you can dress your pet in.
 * Each item has a slot: "hat" (one thing on the head at a time) or "face"
 * (glasses, worn alongside a hat), a label, `lines` the pet says when you point at it in the dressing room, and SVG
 * drawn in the pet's 160x150 coordinate space.
 * Hats sit on the top of the head (around x 80, y 38) and are drawn a little
 * bigger. Items with `layer: 'body'` (like the hoodie) are drawn at full size
 * over the whole pet instead; `hood: true` tucks the pet's own ears away.
 * `snug: true` sits close on the head, so the mochi twist and chick tuft tuck under it.
 * Face items are drawn at normal size over the eyes (around y 92); neck items across
 * the bottom of the body under the face (around y 118); feet items over the feet (y 137).
 * `icon` is the viewBox for the dressing-room button.
 * Add a new item here and it shows up in the dressing room.
 */
(function (root) {
  'use strict';
  /**
   * Over-ear headphones: padded band hugging the head, hinge brackets, round cups
   * with silver rims and cushions, and a cable from the left cup. `tone` adds a colour class.
   * @param {string} tone
   */
  function phones(tone) {
    return '<g class="hat-phones' + (tone ? ' ' + tone : '') + '">' +
      '<path class="phones-cable" d="M23 80 C20 88 27 92 24 100 C22.5 104 21 106 21.5 108.5"/>' +
      '<rect class="phones-plug" x="19.6" y="107.5" width="4" height="6" rx="1.4"/>' +
      '<path class="phones-band" d="M26.9 65.1 C34.1 46.1 52.1 30.9 80 30.9 C107.9 30.9 125.9 46.1 133.1 65.1"/>' +
      '<path class="phones-band-in" d="M26.9 65.1 C34.1 46.1 52.1 30.9 80 30.9 C107.9 30.9 125.9 46.1 133.1 65.1"/>' +
      '<path class="phones-band-shine" d="M47 39.5 C55 34.5 63 32.6 70 32"/>' +
      '<rect class="phones-hinge" x="26" y="48.5" width="8" height="10" rx="2.6" transform="rotate(-22 30 53.5)"/>' +
      '<rect class="phones-hinge" x="126" y="48.5" width="8" height="10" rx="2.6" transform="rotate(22 130 53.5)"/>' +
      '<ellipse class="phones-cushion" cx="32.5" cy="69" rx="6" ry="12.5"/>' +
      '<ellipse class="phones-cushion" cx="127.5" cy="69" rx="6" ry="12.5"/>' +
      '<ellipse class="phones-cup" cx="27" cy="69" rx="9.6" ry="12.8"/>' +
      '<ellipse class="phones-cup" cx="133" cy="69" rx="9.6" ry="12.8"/>' +
      '<ellipse class="phones-rim" cx="27" cy="69" rx="6.4" ry="9"/>' +
      '<ellipse class="phones-rim" cx="133" cy="69" rx="6.4" ry="9"/>' +
      '<path class="phones-shine" d="M22.5 63 Q23.5 60 26.5 59.2 M128.5 63 Q129.5 60 132.5 59.2"/>' +
      '</g>';
  }

  /**
   * A fluffy feather boa: lots of overlapping puffs draped along the bottom of the body,
   * with one end hanging down. The puffs are drawn twice, outlined underneath and filled
   * on top, so they merge into one soft, bumpy shape.
   * @returns {string} SVG markup.
   */
  /**
 * A cowboy boot spur: a short arm out of the side of the boot at the ankle and a star-shaped wheel.
 * @param {number} x Outer side of the boot shaft.
 * @param {number} dir -1 for the left boot (spur points left), 1 for the right boot.
 */
function spur(x, dir) {
  var cx = x + dir * 5.6, cy = 135, star = '';
  for (var i = 0; i < 10; i++) {
    var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.5 : 3.6;
    star += (i ? ' L' : 'M') + (cx + Math.cos(a) * r).toFixed(2) + ' ' + (cy + Math.sin(a) * r).toFixed(2);
  }
  return '<path class="spur-arm" d="M' + (x - dir * .4) + ' 136 L' + (cx - dir * 1.4) + ' ' + cy + '"/>' +
    '<path class="spur-star" d="' + star + ' Z"/><circle class="spur-pin" cx="' + cx + '" cy="' + cy + '" r=".7"/>';
}
function boa() {
    var puffs = [];
    // a fixed wobble (not random) so the boa looks the same every time
    function wob(i, k) { return Math.sin(i * 12.9898 + k * 78.233) * 0.5; }
    // across the body, sagging in the middle
    for (var i = 0; i <= 26; i++) {
      var t = i / 26, x = 17 + 126 * t, y = 115 + 22 * t * (1 - t);
      puffs.push([x + wob(i, 1) * 2, y + wob(i, 2) * 4, 6.4 + wob(i, 3) * 2]);
      // a second, offset row of puffs for volume
      if (i % 2) puffs.push([x + 2, y + 3.5 + wob(i, 6) * 2, 5 + wob(i, 7) * 1.4]);
    }
    // the end that drapes down the right side, getting thinner
    for (var j = 1; j <= 8; j++) {
      puffs.push([137 + Math.sin(j * 0.9) * 2.6 + wob(j, 4), 117 + j * 3.6, 6.2 - j * 0.4 + wob(j, 5) * 0.8]);
    }
    function circles(cls) {
      return puffs.map(function (p) {
        return '<circle class="' + cls + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + p[2].toFixed(1) + '"/>';
      }).join('');
    }
    // feathery wisps fanning out of every puff, up, down and outwards
    var wisps = '';
    puffs.forEach(function (q, k) {
      [-1, 1].forEach(function (side) {
        var ang = (side < 0 ? -Math.PI / 2 : Math.PI / 2) + wob(k, side + 8) * 1.6;
        var x0 = q[0] + Math.cos(ang) * (q[2] - 1), y0 = q[1] + Math.sin(ang) * (q[2] - 1);
        var x1 = q[0] + Math.cos(ang) * (q[2] + 3.4), y1 = q[1] + Math.sin(ang) * (q[2] + 3.4);
        wisps += 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' Q' + (x0 + 2).toFixed(1) + ' ' + ((y0 + y1) / 2).toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' ';
      });
    });
    var shine = puffs.filter(function (_, n) { return n % 4 === 1; }).map(function (p) {
      return 'M' + (p[0] - 2).toFixed(1) + ' ' + (p[1] - 1).toFixed(1) + ' q1.4 -1.8 3.2 -1.6';
    }).join(' ');
    return '<path class="boa-wisp" d="' + wisps + '"/>' + circles('boa-edge') + circles('boa-puff') +
      '<path class="boa-wisp-in" d="' + wisps + '"/>' +
      '<path class="boa-shine" d="' + shine + '"/>';
  }

  root.Wardrobe = [
    {
      id: 'tophat', slot: 'hat', label: 'Top hat',
      lines: ['ooh, so fancy!', 'very distinguished', 'a hat for tea time?'],
      svg: '<g transform="translate(-2 0) rotate(-3 84 34)" class="hat-tophat">' +
        '<ellipse class="hat-dark" cx="84" cy="38" rx="25" ry="6"/>' +
        '<path class="hat-dark" d="M71 37 V13 Q71 8 76 8 H92 Q97 8 97 13 V37 Z"/>' +
        '<path class="hat-band" d="M71 29 H97 V35 H71 Z"/>' +
        '<path class="hat-shine" d="M76 13 V24"/>' +
        '<path class="hat-edge" d="M59 38 Q84 47 109 38"/>' +
        '<path class="hat-heart" d="M90 31.2 c-1 -1.6 -3.4 -.6 -2.4 1 l2.4 2.4 l2.4 -2.4 c1 -1.6 -1.4 -2.6 -2.4 -1z"/>' +
        '</g>'
    },
    {
      id: 'butterflyclip', slot: 'hat', label: 'Butterfly clip', icon: '92 30 40 36',
      lines: ['so sparkly!', 'flutter flutter', 'y2k cutie'],
      // a little blue butterfly clipped to the side of the head
      svg: '<g class="hat-butterfly" transform="translate(110 47) rotate(18)">' +
        '<path class="bfly-wing" d="M0 0 C-4 -10 -14 -12 -14 -5 C-14 0 -7 2 0 0 Z M0 0 C4 -10 14 -12 14 -5 C14 0 7 2 0 0 Z"/>' +
        '<path class="bfly-wing bfly-low" d="M0 0 C-3 6 -10 9 -11 4 C-11 1 -6 0 0 0 Z M0 0 C3 6 10 9 11 4 C11 1 6 0 0 0 Z"/>' +
        '<path class="bfly-spot" d="M-8 -6 h.1 M8 -6 h.1"/>' +
        '<path class="bfly-body" d="M0 -6 V5"/>' +
        '<path class="bfly-antenna" d="M0 -6 Q-2 -10 -4 -11 M0 -6 Q2 -10 4 -11"/>' +
        '</g>'
    },
    {
      id: 'maid', slot: 'hat', label: "Maid's hairband",
      lines: ['at your service!', 'so frilly!', 'I\'ll tidy the snacks'],
      svg: '<g class="hat-maid">' +
        '<circle cx="40.7" cy="53.6" r="5.4"/>' +
        '<circle cx="46.2" cy="48.2" r="5.4"/>' +
        '<circle cx="53.3" cy="43.9" r="5.4"/>' +
        '<circle cx="61.5" cy="40.9" r="5.4"/>' +
        '<circle cx="70.6" cy="39.1" r="5.4"/>' +
        '<circle cx="80.0" cy="38.5" r="5.4"/>' +
        '<circle cx="89.4" cy="39.1" r="5.4"/>' +
        '<circle cx="98.5" cy="40.9" r="5.4"/>' +
        '<circle cx="106.7" cy="43.9" r="5.4"/>' +
        '<circle cx="113.8" cy="48.2" r="5.4"/>' +
        '<circle cx="119.3" cy="53.6" r="5.4"/>' +
        '<path class="maid-band" d="M38 62 C50 36 110 36 122 62"/>' +
        '<g transform="translate(110 46) rotate(25)"><path class="maid-bow" d="M0 0 L-8 -5 L-8 5 Z M0 0 L8 -5 L8 5 Z"/><circle class="maid-bow" r="2.4"/></g>' +
        '</g>'
    },
    {
      id: 'sunhat', slot: 'hat', label: 'Sun hat',
      lines: ['beach day?!', 'picnic time!', 'so summery!'],
      svg: '<g transform="rotate(-6 80 40)" class="hat-sun">' +
        '<ellipse class="straw" cx="80" cy="42" rx="44" ry="10"/>' +
        // a stitched line that follows the curve of the brim
        '<path class="straw-weave" d="M42 42 A38 7 0 0 0 118 42"/>' +
        '<path class="straw-top" d="M57 42 C57 20 103 20 103 42 Q80 48 57 42 Z"/>' +
        // the band wraps around the base of the dome, so both edges curve the way the brim does
        '<path class="sun-ribbon" d="M60.2 33.1 Q80 39 99.8 33.1 C101.5 35 103 38 103 42 Q80 48 57 42 C57 38 58.5 35 60.2 33.1 Z"/>' +
        '<g transform="translate(95 38.5)" class="sun-flower">' +
        '<circle cx="0" cy="-3.6" r="2.8"/><circle cx="3.4" cy="-1.1" r="2.8"/><circle cx="2.1" cy="2.9" r="2.8"/><circle cx="-2.1" cy="2.9" r="2.8"/><circle cx="-3.4" cy="-1.1" r="2.8"/>' +
        '<circle class="sun-flower-mid" r="1.9"/></g>' +
        '</g>'
    },
    {
      id: 'cap', slot: 'hat', label: 'Lad\'s cap',
      lines: ['very proper!', 'off to the market!', 'class is in session!'],
      // a peaked student cap: flat top, gold cord and buttons, short dark visor
      svg: '<g transform="rotate(-7 80 36)" class="hat-cap">' +
        '<path class="cap-crown" d="M60 41 C55 37 49 31 50 27.5 Q80 19 110 27.5 C111 31 105 37 100 41 Q80 45 60 41 Z"/>' +
        '<ellipse class="cap-top" cx="80" cy="26.5" rx="30" ry="7"/>' +
        '<path class="cap-shine" d="M58 25.5 Q66 22.5 76 22"/>' +
        '<path class="cap-band" d="M59.5 37.5 Q80 42 100.5 37.5 L100 42.5 Q80 47 60 42.5 Z"/>' +
        '<path class="cap-cord" d="M61 40 Q80 44.5 99 40"/>' +
        '<path class="cap-visor" d="M60 42 Q80 47.5 100 42 Q103 49 95 53 Q80 57.5 65 53 Q57 49 60 42 Z"/>' +
        '<path class="cap-visor-shine" d="M66 51 Q74 54 83 53.6"/>' +
        '<circle class="cap-button" cx="61.5" cy="40.5" r="2.4"/><circle class="cap-button" cx="98.5" cy="40.5" r="2.4"/>' +
        '</g>'
    },
    {
      id: 'hoodie', slot: 'body', label: 'Cow hoodie', layer: 'body', hood: true, sleeves: true, icon: '4 14 152 130',
      lines: ['moo! so cozy!', 'a cow? me?!', 'so soft and fluffy!'],
      // a white hoodie whose hood is a little cow: horns, floppy ears and spots,
      // with an opening for the face so every species shows through
      svg: '<g class="hoodie">' +
        '<path class="hood-horn" d="M58 46 C51 34 54 24 61 26 C61 32 64 38 68 42 Z"/>' +
        '<path class="hood-horn" d="M102 46 C109 34 106 24 99 26 C99 32 96 38 92 42 Z"/>' +
        '<g transform="rotate(-28 24 60)"><ellipse class="hood-ear" cx="24" cy="60" rx="15" ry="7.5"/><ellipse class="hood-ear-in" cx="22" cy="60" rx="8" ry="3.6"/></g>' +
        '<g transform="rotate(28 136 60)"><ellipse class="hood-ear" cx="136" cy="60" rx="15" ry="7.5"/><ellipse class="hood-ear-in" cx="138" cy="60" rx="8" ry="3.6"/></g>' +
        '<path class="hood" fill-rule="evenodd" d="M80 34 C126 34 149 69 149 102 C149 130 120 140 80 140 C40 140 11 130 11 102 C11 69 34 34 80 34 Z M80 69 C51 69 27 82 27 99 C27 117 51 130 80 130 C109 130 133 117 133 99 C133 82 109 69 80 69 Z"/>' +
        '<path class="hood-spot" d="M48 44 C56 40 66 44 64 52 C62 59 50 60 45 55 C41 51 43 47 48 44 Z"/>' +
        '<path class="hood-spot" d="M104 46 C112 43 124 49 126 58 C127 65 118 67 113 63 C108 60 103 54 104 46 Z"/>' +
        '<path class="hood-spot" d="M137 104 C142 102 146 108 145 115 C144 121 138 124 136 118 C134 112 134 106 137 104 Z"/>' +
        '<path class="hood-spot" d="M20 86 C24 83 27 90 26 98 C25 104 19 104 17 99 C15 93 17 88 20 86 Z"/>' +
        // the hood's own cow face, above the opening
        '<g class="hood-face" transform="translate(0 -4.5)"><ellipse class="hood-eye" cx="66.5" cy="49.5" rx="4" ry="4.8"/><ellipse class="hood-eye" cx="93.5" cy="49.5" rx="4" ry="4.8"/>' +
        '<circle class="hood-glint" cx="65.3" cy="47.8" r="1.4"/><circle class="hood-glint" cx="92.3" cy="47.8" r="1.4"/>' +
        '<ellipse class="hood-muzzle" cx="80" cy="59" rx="12.5" ry="6"/>' +
        '<ellipse class="hood-nostril" cx="75.5" cy="58.6" rx="1.5" ry="2"/><ellipse class="hood-nostril" cx="84.5" cy="58.6" rx="1.5" ry="2"/></g>' +
        '<ellipse class="hood-rim" cx="80" cy="99.5" rx="56.5" ry="33.5"/>' +
        '<path class="hood-string" d="M68 131 C67 134 66 136 66 139 M92 131 C93 134 94 136 94 139"/>' +
        '<circle class="hood-toggle" cx="66" cy="140" r="2.4"/><circle class="hood-toggle" cx="94" cy="140" r="2.4"/>' +
        '</g>'
    },
    {
      id: 'pighoodie', slot: 'body', label: 'Pig hoodie', layer: 'body', hood: true, sleeves: true, icon: '4 14 152 130',
      lines: ['oink oink!', 'in the pink!', 'snout cute!'],
      // the cow hoodie's shape in pink, with pig ears folding forward and a snout above the face opening
      svg: '<g class="hoodie hoodie-pig">' +
        '<path class="pig-hood-ear" d="M40 52 C30 40 30 26 38 20 C46 26 56 36 60 44 Z"/>' +
        '<path class="pig-hood-ear-in" d="M42 46 C37 38 37 30 40 26 C45 31 50 37 53 42 Z"/>' +
        '<path class="pig-hood-ear" d="M120 52 C130 40 130 26 122 20 C114 26 104 36 100 44 Z"/>' +
        '<path class="pig-hood-ear-in" d="M118 46 C123 38 123 30 120 26 C115 31 110 37 107 42 Z"/>' +
        '<path class="hood" fill-rule="evenodd" d="M80 34 C126 34 149 69 149 102 C149 130 120 140 80 140 C40 140 11 130 11 102 C11 69 34 34 80 34 Z M80 69 C51 69 27 82 27 99 C27 117 51 130 80 130 C109 130 133 117 133 99 C133 82 109 69 80 69 Z"/>' +
        '<g class="hood-face" transform="translate(0 -4.5)"><ellipse class="hood-eye" cx="64" cy="49" rx="3.6" ry="4.4"/><ellipse class="hood-eye" cx="96" cy="49" rx="3.6" ry="4.4"/>' +
        '<circle class="hood-glint" cx="62.9" cy="47.4" r="1.3"/><circle class="hood-glint" cx="94.9" cy="47.4" r="1.3"/>' +
        '<ellipse class="pig-hood-snout" cx="80" cy="57.6" rx="10.5" ry="7"/>' +
        '<ellipse class="pig-hood-nostril" cx="76" cy="57.6" rx="1.8" ry="2.6"/><ellipse class="pig-hood-nostril" cx="84" cy="57.6" rx="1.8" ry="2.6"/></g>' +
        '<ellipse class="hood-rim" cx="80" cy="99.5" rx="56.5" ry="33.5"/>' +
        '<path class="hood-string" d="M68 131 C67 134 66 136 66 139 M92 131 C93 134 94 136 94 139"/>' +
        '<circle class="hood-toggle" cx="66" cy="140" r="2.4"/><circle class="hood-toggle" cx="94" cy="140" r="2.4"/>' +
        '</g>'
    },    {
      id: 'berrydress', slot: 'body', label: 'Strawberry dress', layer: 'body', icon: '8 100 144 46',
      lines: ['berry pretty!', 'twirl twirl!', 'sweet as can be', 'tulle-y fabulous!'],
      // after a pink tulle dress: V neckline with a ruffle trim, little strawberries all over, a ribbon bow
      // with long ties, a big ruffled hem and puff sleeves (sleeves: the arms are drawn pink with the hand peeking out)
      sleeves: true,
      svg: '<g class="dress-berry">' +
        '<path class="dress-tulle" d="M15 106 Q46 107.6 66 111.4 L80 121 L94 111.4 Q114 107.6 145 106 L148.6 113.8 L143.0 120.6 L134.7 126.1 L124.0 130.3 L111.1 133.3 L96.4 135 L80.0 135.6 L63.6 135 L48.9 133.3 L36.0 130.3 L25.3 126.1 L17.0 120.6 L11.4 113.8 Z"/>' +
        '<g transform="rotate(-12 26 113)"><path class="sb-berry" d="M26 110.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M23.4 111 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(10 42 116)"><path class="sb-berry" d="M42 113.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M39.4 114 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(-6 58 119)"><path class="sb-berry" d="M58 116.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M55.4 117 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(8 102 119)"><path class="sb-berry" d="M102 116.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M99.4 117 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(-10 118 116)"><path class="sb-berry" d="M118 113.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M115.4 114 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(12 134 113)"><path class="sb-berry" d="M134 110.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M131.4 111 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(6 32 124)"><path class="sb-berry" d="M32 121.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M29.4 122 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(-14 50 127)"><path class="sb-berry" d="M50 124.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M47.4 125 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(10 68 128)"><path class="sb-berry" d="M68 125.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M65.4 126 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(-8 92 128)"><path class="sb-berry" d="M92 125.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M89.4 126 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(6 110 127)"><path class="sb-berry" d="M110 124.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M107.4 125 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(-6 128 124)"><path class="sb-berry" d="M128 121.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M125.4 122 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(4 42 134.6)"><path class="sb-berry" d="M42 132.2 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M39.4 132.6 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(-10 80 132)"><path class="sb-berry" d="M80 129.6 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M77.4 130 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(8 118 134.6)"><path class="sb-berry" d="M118 132.2 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M115.4 132.6 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(-4 60 136.4)"><path class="sb-berry" d="M60 134.0 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M57.4 134.4 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g><g transform="rotate(10 100 136.4)"><path class="sb-berry" d="M100 134.0 c2.2 0 3.2 1.2 3.2 2.6 c0 2.2 -1.9 3.8 -3.2 4.6 c-1.3 -.8 -3.2 -2.4 -3.2 -4.6 c0 -1.4 1 -2.6 3.2 -2.6 Z"/><path class="sb-top" d="M97.4 134.4 l1.4 -.9 l1.2 .7 l1.2 -.7 l1.4 .9 l-1.2 .9 h-2.8 Z"/></g>' +
        // the skirt flares out a little at the sides (same length as before): the hem ruffle is a bit wider than the
        // body, and the bodice runs straight into it, so the outline is one piece with no edges
        '<g transform="translate(80 0) scale(1.1 1) translate(-80 0)">' +
        '<path class="dress-ruffle" d="M17.6 113.8 L22.7 120.6 L30.3 126.1 L40.0 130.3 L51.7 133.3 L65.1 135.0 L80.0 135.6 L94.9 135.0 L108.3 133.3 L120.0 130.3 L129.7 126.1 L137.3 120.6 L142.4 113.8 L142.4 119.8 Q139.8 126.0 137.3 126.6 Q133.5 132.2 129.7 132.1 Q124.9 137.0 120.0 136.3 Q114.2 140.6 108.3 139.3 Q101.6 143.0 94.9 141.0 Q87.5 144.1 80.0 141.6 Q72.5 144.1 65.1 141.0 Q58.4 143.0 51.7 139.3 Q45.8 140.6 40.0 136.3 Q35.1 137.0 30.3 132.1 Q26.5 132.2 22.7 126.6 Q20.2 126.0 17.6 119.8 Z"/>' +
        '<path class="dress-fold" d="M22.7 120.9 q.3 2.2 0 4.4 M40.0 130.6 q.3 2.2 0 4.4 M65.1 135.3 q.3 2.2 0 4.4 M94.9 135.3 q.3 2.2 0 4.4 M120.0 130.6 q.3 2.2 0 4.4 M137.3 120.9 q.3 2.2 0 4.4"/>' +
        '</g>' +
        '<path class="dress-trim" d="M16.6 107.2 Q46 108.8 66.4 112.6 L80 122.2 L93.6 112.6 Q114 108.8 143.4 107.2"/>' +
        '<path class="dress-bow" d="M80 121.4 c-3 -3.6 -8 -3.6 -7.4 -.6 c.4 2.2 4.4 2.2 7.4 .6 Z M80 121.4 c3 -3.6 8 -3.6 7.4 -.6 c-.4 2.2 -4.4 2.2 -7.4 .6 Z"/><path class="dress-tie" d="M79.2 122.4 C77.4 126 76 129.4 74.6 133 M80.8 122.4 C82.6 126 84 129.4 85.4 133"/><circle class="dress-bow" cx="80" cy="121.4" r="1.5"/>' +
        '</g>'
    },

    {
      id: 'hardhat', slot: 'hat', label: 'Hard hat',
      lines: ['safety first!', 'let\'s build a snack fort!', 'construction crew!'],
      svg: '<g transform="rotate(-5 80 40)" class="hat-hard">' +
        '<path class="hard-dome" d="M55 41 C55 15 105 15 105 41 Z"/>' +
        '<path class="hard-ridge" d="M74 41 V21 Q80 17 86 21 V41"/>' +
        '<path class="hard-shine" d="M63.5 34 Q65 28.5 69.5 25.5"/>' +
        '<path class="hard-brim" d="M48 41 Q80 34 112 41 Q113 46 108 46 Q80 41 52 46 Q47 46 48 41 Z"/>' +
        '<circle class="hard-sticker" cx="95" cy="31" r="4.2"/>' +
        '<path class="hard-sticker-face" d="M93.3 30.2 v.1 M96.7 30.2 v.1 M93.4 32.6 Q95 34 96.6 32.6"/>' +
        '</g>'
    },
    {
      id: 'bandana', slot: 'hat', snug: true, label: 'Bandana',
      lines: ['ready for adventure!', 'so cool, so comfy!', 'tied it myself!'],
      svg: '<g class="hat-bandana">' +
        // hugs the top of the head down to the forehead, with a knot on the side
        '<path class="bandana-cloth" d="M124 57 C123.2 55.8 121.2 51.7 119.5 49.6 C117.8 47.5 115.7 45.8 113.6 44.2 C111.5 42.6 109.3 41.1 106.8 39.8 C104.3 38.5 101.6 37.4 98.8 36.5 C96.0 35.6 93.0 34.9 89.9 34.4 C86.8 33.9 83.3 33.6 80 33.6 C76.7 33.6 73.2 33.9 70.1 34.4 C67.0 34.9 64.0 35.6 61.2 36.5 C58.4 37.4 55.7 38.5 53.2 39.8 C50.7 41.1 48.5 42.6 46.4 44.2 C44.3 45.8 42.2 47.5 40.5 49.6 C38.8 51.7 36.8 55.8 36 57 C60 60 100 60 124 57 Z"/>' +
        '<path class="bandana-edge" d="M38 56 C60 58.6 100 58.6 122 56"/>' +
        '<circle class="bandana-dot" cx="64" cy="41" r="2"/><circle class="bandana-dot" cx="80" cy="37.5" r="2"/>' +
        '<circle class="bandana-dot" cx="96" cy="41" r="2"/><circle class="bandana-dot" cx="72" cy="49" r="1.6"/>' +
        '<circle class="bandana-dot" cx="88" cy="49" r="1.6"/><circle class="bandana-dot" cx="54" cy="50" r="1.6"/><circle class="bandana-dot" cx="106" cy="50" r="1.6"/>' +
        '<path class="bandana-cloth" d="M123 55 L134 50 L131 59 Z"/>' +
        '<path class="bandana-cloth" d="M123 56 L132 65 L124.5 66 Z"/>' +
        '<circle class="bandana-cloth" cx="123" cy="56" r="3.6"/>' +
        '</g>'
    },
    {
      id: 'headphones', slot: 'hat', snug: true, label: 'Head\u00ADphones', icon: '14 24 132 60',
      lines: ['my jam!', 'turn it up!', '♪ shopping beats ♪'],
      svg: phones('')
    },
    {
      id: 'chefhat', slot: 'hat', snug: true, label: 'Chef hat', icon: '40 -4 80 56',
      lines: ['oui, chef!', 'what are we cooking?', 'taste test time!'],
      svg: '<g transform="rotate(-5 80 36)" class="hat-chef">' +
        '<path class="chef-puff" d="M60 31 C47 31 45 13 58 12 C58 1 73 -3 80 5 C87 -3 102 1 102 12 C115 13 113 31 100 31 Z"/>' +
        '<path class="chef-fold" d="M70 14 C70 20 71 25 72 30 M90 14 C90 20 89 25 88 30"/>' +
        '<path class="chef-shine" d="M55 18 Q56 13.5 60 12.5"/>' +
        '<path class="chef-band" d="M57 44 Q80 36 103 44 L101 29 Q80 25.5 59 29 Z"/>' +
        '<path class="chef-pleat" d="M66 30.5 V40 M73 29.5 V38.6 M80 29 V38 M87 29.5 V38.6 M94 30.5 V40"/>' +
        '</g>'
    },
    {
      id: 'knight', slot: 'hat', snug: true, label: 'Knight helmet', icon: '24 -2 112 70',
      lines: ['for the snacks!', 'I shall guard the fridge', 'brave and shiny!'],
      svg: '<g class="hat-knight">' +
        '<path class="knight-plume" d="M80 30 C77 15 89 3 104 5 C98 9 95 15 95 22 C93 26 88 29 80 30 Z"/>' +
        '<path class="knight-plume-line" d="M84 24 C87 17 92 12 99 8.5 M88 26 C91 21 95 16 99 13"/>' +
        '<path class="knight-dome" d="M30 62 C30 40 52 29 80 29 C108 29 130 40 130 62 Z"/>' +
        '<path class="knight-ridge" d="M80 29.5 V58"/>' +
        '<path class="knight-shine" d="M42 47 C46 40 53 35.5 61 33.5"/>' +
        '<path class="knight-visor" d="M58 40 C64 33.5 96 33.5 102 40 L100 47 C94 42.5 66 42.5 60 47 Z"/>' +
        '<path class="knight-slit" d="M66 41.5 H74 M86 41.5 H94"/>' +
        '<path class="knight-band" d="M31 58 Q80 49 129 58 Q132.5 61.6 129.5 65.6 Q80 56.6 30.5 65.6 Q27.5 61.6 31 58 Z"/>' +
        '<circle class="knight-rivet" cx="39" cy="60" r="1.6"/><circle class="knight-rivet" cx="59" cy="56.6" r="1.6"/>' +
        '<circle class="knight-rivet" cx="80" cy="55.5" r="1.6"/><circle class="knight-rivet" cx="101" cy="56.6" r="1.6"/>' +
        '<circle class="knight-rivet" cx="121" cy="60" r="1.6"/>' +
        '</g>'
    },
    {
      id: 'beret', slot: 'hat', snug: true, label: 'Strawberry beret', icon: '24 8 112 58',
      lines: ['berry chic!', 'très sweet!', 'ooh la la!'],
      svg: '<g class="hat-beret"><g transform="rotate(-4 80 44)">' +
        // the band is drawn first and its top edge tucks under the beret, so the two are joined
        '<path class="beret-band" d="M39 46.5 Q80 52 121 46.5 Q123.4 52 124.3 57.7 Q80 67 35.7 57.7 Q36.6 52 39 46.5 Z"/>' +
        '<path class="beret-top" d="M32 48 C30 30 54 25 80 26 C108 27 130 34 128 49 C112 55 50 56 32 48 Z"/>' +
        '<path class="beret-shine" d="M44 38 C50 32 60 29.6 70 29"/>' +
        '<path class="beret-seed" d="M52 40 l1.6 3.6 l-1.6 .6 l-1.6 -.6 Z M70 46 l1.6 3.6 l-1.6 .6 l-1.6 -.6 Z M92 41 l1.6 3.6 l-1.6 .6 l-1.6 -.6 Z M110 45 l1.6 3.6 l-1.6 .6 l-1.6 -.6 Z M80 38 l1.6 3.6 l-1.6 .6 l-1.6 -.6 Z M100 34 l1.6 3.4 l-1.6 .6 l-1.6 -.6 Z M62 34 l1.6 3.4 l-1.6 .6 l-1.6 -.6 Z"/>' +
        '<path class="beret-leaf" d="M82 27 C76 24 70 25 69 29 C74 30 78 29.6 82 27.8 C80 22 85 19 89 22 C88 25 86 27 84 28 C90 26 95 28 95 32 C91 33 86 31 83.4 29 Z"/>' +
        '<path class="beret-stem" d="M83 28 C83.4 24 84 22 85.4 20"/>' +
        '</g></g>'
    },
    {
      id: 'bananapeel', slot: 'hat', snug: true, label: 'Banana peel', icon: '62 -2 84 58',
      lines: ['slippery when worn!', 'a-peeling, right?', 'going bananas!'],
      svg: '<g class="hat-banana" transform="translate(24 4) translate(80 40) rotate(34) scale(.6) translate(-80 -40)">' +
        // the strips share one outline (drawn wide underneath, then the fills on top), so the peel is one piece
        '<g class="peel-out"><path d="M76 42 C62 28 40 32 32 54 C44 56 60 51 72 47 Z"/><path d="M84 42 C98 28 120 32 128 54 C116 56 100 51 88 47 Z"/><path d="M71 44 C67 26 74 14 80 8 C86 14 93 26 89 44 C85 47 75 47 71 44 Z"/><ellipse cx="80" cy="45" rx="11" ry="4.6"/></g>' +
        '<g class="peel-fill"><path d="M76 42 C62 28 40 32 32 54 C44 56 60 51 72 47 Z"/><path d="M84 42 C98 28 120 32 128 54 C116 56 100 51 88 47 Z"/><path d="M71 44 C67 26 74 14 80 8 C86 14 93 26 89 44 C85 47 75 47 71 44 Z"/><ellipse cx="80" cy="45" rx="11" ry="4.6"/></g>' +
        '<path class="peel-line" d="M80 14 V40 M66 36 C58 36 48 41 40 50 M94 36 C102 36 112 41 120 50"/>' +
        '<path class="peel-tip" d="M77.4 12 C77.6 8 78.6 6 80 5 C81.4 6 82.4 8 82.6 12 Z"/>' +
        '<circle class="peel-spot" cx="45" cy="47" r="1.2"/><circle class="peel-spot" cx="115" cy="47" r="1.2"/><circle class="peel-spot" cx="76" cy="28" r="1.1"/>' +
        '</g>'
    },
    {
      id: 'trashlid', slot: 'hat', snug: true, label: 'Trash can lid', icon: '20 14 120 52',
      lines: ['one man\'s trash!', 'clang clang!', 'raccoon approved'],
      svg: '<g class="hat-lid" transform="rotate(-5 80 44)">' +
        '<ellipse class="lid-rim" cx="80" cy="47" rx="47" ry="6.4"/>' +
        '<path class="lid-top" d="M36 46 C37 36 56 30 80 30 C104 30 123 36 124 46 C110 50 50 50 36 46 Z"/>' +
        // a galvanised lid like a real metal bin: stepped rings round the dome (a dark groove with a bright edge under it)
        // and a flat strap handle riveted on with two tabs
        '<path class="lid-ring" d="M39.6 44.2 C54 48.6 106 48.6 120.4 44.2 M49 39.6 C61 43.6 99 43.6 111 39.6 M60 35.4 C68 38.2 92 38.2 100 35.4"/>' +
        '<path class="lid-ring-hi" d="M40.6 45.8 C55 50 105 50 119.4 45.8 M50 41.2 C62 45 98 45 110 41.2 M61 37 C69 39.6 91 39.6 99 37"/>' +
        '<path class="lid-shine" d="M44 39.4 C48 35 55 32.6 63 31.8"/>' +
        '<path class="lid-handle" d="M68 35 C68 28 69.6 25.6 74.6 25.6 H85.4 C90.4 25.6 92 28 92 35"/><path class="lid-handle-in" d="M68 35 C68 28 69.6 25.6 74.6 25.6 H85.4 C90.4 25.6 92 28 92 35"/>' +
        '<rect class="lid-tab" x="63.4" y="33.4" width="8.4" height="3.6" rx="1.2"/><rect class="lid-tab" x="88.2" y="33.4" width="8.4" height="3.6" rx="1.2"/>' +
        '<circle class="lid-rivet" cx="65.6" cy="35.2" r=".8"/><circle class="lid-rivet" cx="94.4" cy="35.2" r=".8"/>' +
        '</g>'
    },
    {
      id: 'clownwig', slot: 'hat', snug: true, label: 'Clown wig', icon: '8 8 144 80',
      lines: ['honk honk!', 'send in the clowns!', 'big top energy!'],
      svg: '<g class="hat-wig">' +
        '<g class="wig-out"><circle cx="27.1" cy="83.6" r="13"/><circle cx="25.1" cy="69.6" r="13"/><circle cx="29.2" cy="55.9" r="13"/><circle cx="39" cy="44" r="13"/><circle cx="53.4" cy="35.2" r="13"/><circle cx="70.8" cy="30.6" r="13"/><circle cx="89.2" cy="30.6" r="13"/><circle cx="106.6" cy="35.2" r="13"/><circle cx="121" cy="44" r="13"/><circle cx="130.8" cy="55.9" r="13"/><circle cx="134.9" cy="69.6" r="13"/><circle cx="132.9" cy="83.6" r="13"/><circle cx="34.3" cy="75.7" r="9.5"/><circle cx="35.2" cy="64.6" r="9.5"/><circle cx="41.1" cy="54.4" r="9.5"/><circle cx="51.3" cy="46.2" r="9.5"/><circle cx="64.8" cy="40.8" r="9.5"/><circle cx="80" cy="39" r="9.5"/><circle cx="95.2" cy="40.8" r="9.5"/><circle cx="108.7" cy="46.2" r="9.5"/><circle cx="118.9" cy="54.4" r="9.5"/><circle cx="124.8" cy="64.6" r="9.5"/><circle cx="125.7" cy="75.7" r="9.5"/></g>' +
        '<circle class="wig-r" cx="27.1" cy="83.6" r="13"/><circle class="wig-r" cx="25.1" cy="69.6" r="13"/><circle class="wig-o" cx="29.2" cy="55.9" r="13"/><circle class="wig-o" cx="39" cy="44" r="13"/><circle class="wig-y" cx="53.4" cy="35.2" r="13"/><circle class="wig-y" cx="70.8" cy="30.6" r="13"/><circle class="wig-g" cx="89.2" cy="30.6" r="13"/><circle class="wig-g" cx="106.6" cy="35.2" r="13"/><circle class="wig-b" cx="121" cy="44" r="13"/><circle class="wig-b" cx="130.8" cy="55.9" r="13"/><circle class="wig-p" cx="134.9" cy="69.6" r="13"/><circle class="wig-p" cx="132.9" cy="83.6" r="13"/><circle class="wig-r" cx="34.3" cy="75.7" r="9.5"/><circle class="wig-r" cx="35.2" cy="64.6" r="9.5"/><circle class="wig-o" cx="41.1" cy="54.4" r="9.5"/><circle class="wig-o" cx="51.3" cy="46.2" r="9.5"/><circle class="wig-y" cx="64.8" cy="40.8" r="9.5"/><circle class="wig-y" cx="80" cy="39" r="9.5"/><circle class="wig-g" cx="95.2" cy="40.8" r="9.5"/><circle class="wig-g" cx="108.7" cy="46.2" r="9.5"/><circle class="wig-b" cx="118.9" cy="54.4" r="9.5"/><circle class="wig-b" cx="124.8" cy="64.6" r="9.5"/><circle class="wig-p" cx="125.7" cy="75.7" r="9.5"/>' +
        '</g>'
    },
    {
      id: 'jestercap', slot: 'hat', snug: true, label: 'Jester cap', icon: '18 2 124 58',
      lines: ['jingle jingle!', 'the royal fool!', 'jest for you!'],
      svg: '<g class="hat-jester">' +
        '<path class="jester-purple" d="M80 45 C80 30 90 20 102 20 C112 20 120 32 125.4 46 C120.6 43 116.4 43 113 46 Z"/>' +
        '<path class="jester-red" d="M66 45 C66 34 66 22 58 21 C50 20 44 28 40 33 C36 37 31 41 27 44 C34 44.4 42 45 48 46 Z"/>' +
        '<path class="jester-gold" d="M63 45 C61 30 66 12 78 9 C88 7 96 9 100.6 14 C94.6 13 90.4 14.4 88.4 18.4 C86.4 24 86.4 34 86.6 45 Z"/>' +
        '<path class="jester-brim" d="M45 44 Q80 37.6 115 44 L114 52.6 Q80 46.4 46 52.6 Z"/>' +
        '<path class="jester-brim-hi" d="M48 45.6 Q80 40.4 112 45.6"/>' +
        '<circle class="jester-pom" cx="26.4" cy="44.4" r="4"/><circle class="jester-pom" cx="101.6" cy="14.6" r="4"/><circle class="jester-pom" cx="126.2" cy="47.4" r="4"/>' +
        '</g>'
    },
    {
      id: 'cowboyhat', slot: 'hat', snug: true, label: 'Cowboy hat', icon: '14 10 132 50',
      lines: ['yeehaw!', 'howdy, partner!', 'giddy up!'],
      svg: '<g class="hat-cowboy">' +
        '<path class="cowboy-crown" d="M52 46 C50 31 54 18 64 18 C70 18 74 22.4 80 22.4 C86 22.4 90 18 96 18 C106 18 110 31 108 46 C96 48 64 48 52 46 Z"/>' +
        '<path class="cowboy-band" d="M51.6 38 C64 40.6 96 40.6 108.4 38 L108.2 45 C96 47.6 64 47.6 51.8 45 Z"/>' +
        '<path class="cowboy-crease" d="M80 23.4 V33 M66 21 C64 26 63.6 31 64 35"/>' +
        '<path class="cowboy-brim" d="M21 44 C30 54 130 54 139 44 C143 39.6 141 35.6 135.6 37.6 C122 46 38 46 24.4 37.6 C19 35.6 17 39.6 21 44 Z"/>' +
        '<path class="cowboy-stitch" d="M30 46.4 C50 51.4 110 51.4 130 46.4"/>' +
        '</g>'
    },
    {
      id: 'sidecap', slot: 'hat', snug: true, label: 'Orange cap', icon: '40 12 106 42',
      lines: ['hup Holland hup!', 'oranje boven!', 'lekker bezig!', 'gezellig!'],
      svg: '<g class="hat-sidecap">' +
        '<path class="side-bill" d="M106 40 C118 37 134 38.6 142 45 C135 50 118 50.4 104 47.6 Z"/>' +
        '<path class="side-bill-line" d="M110 42 C121 41 132 42 138 45"/>' +
        '<path class="side-dome" d="M48 47 C47 28 62 17 80 17 C98 17 113 28 112 47 C96 50 64 50 48 47 Z"/>' +
        '<path class="side-seam" d="M80 17.6 C72 26 68 36 67 48.6 M80 17.6 C88 26 92 36 93 48.6"/>' +
        '<path class="side-band" d="M48.4 43 C64 46.4 96 46.4 111.6 43 L112 47 C96 50 64 50 48 47 Z"/>' +
        '<circle class="side-button" cx="80" cy="17.6" r="2.6"/>' +
        // a little Dutch flag patch on the side
        '<g transform="rotate(-14 59 34)"><path class="flag-red" d="M52 29.6 H66 V33.4 H52 Z"/><path class="flag-white" d="M52 33.4 H66 V37.2 H52 Z"/>' +
        '<path class="flag-blue" d="M52 37.2 H66 V41 H52 Z"/><rect class="flag-edge" x="52" y="29.6" width="14" height="11.4" rx="1.6"/></g>' +
        '</g>'
    },
    {
      id: 'scarf', slot: 'neck', label: 'Winter scarf', icon: '10 104 140 56',
      lines: ['so toasty!', 'snow day?', 'cozy cozy cozy'],
      svg: '<g class="neck-scarf">' +
        // the hanging end, drawn first so the band and the knot sit over its top
        '<path class="scarf-band" d="M95 116 Q105 113 115 116 L119 146 Q105 151 92 146 Z"/>' +
        '<path class="scarf-orange" d="M93.4 130 L117.6 130.4 L118.3 139 L92.6 138.8 Z M94.4 146 L118.8 146 L119 146 Q105 151 92 146 Z"/>' +
        '<path class="scarf-outline" d="M95 116 Q105 113 115 116 L119 146 Q105 151 92 146 Z"/>' +
        '<path class="scarf-fringe-o" d="M95 147.0 v5.4 M100 148.1 v5.4 M105 148.5 v5.4 M110 148.1 v5.4 M115 147.0 v5.4 "/><path class="scarf-fringe" d="M95 147.0 v5.4 M100 148.1 v5.4 M105 148.5 v5.4 M110 148.1 v5.4 M115 147.0 v5.4 "/>' +
        '<path class="scarf-band" d="M17 108 Q80 124 143 108 Q147 114 145 121 Q80 140 15 121 Q13 114 17 108 Z"/>' +
        '<path class="scarf-orange" d="M32.8 111.5 L38 112.4 L43.2 113.3 L48.5 114 L47.5 128.1 L42.1 127.3 L36.7 126.3 L31.2 125.2 Z M64.2 115.5 L69.5 115.8 L74.8 115.9 L80 116 L80 130.5 L74.6 130.4 L69.2 130.2 L63.8 129.9 Z M95.8 115.5 L101 115.1 L106.3 114.6 L111.5 114 L112.5 128.1 L107.1 128.9 L101.7 129.4 L96.2 129.9 Z M127.2 111.5 L132.5 110.4 L137.8 109.3 L143 108 L145 121 L139.6 122.5 L134.2 123.9 L128.8 125.2 Z "/>' +
        '<path class="scarf-outline" d="M17 108 Q80 124 143 108 Q147 114 145 121 Q80 140 15 121 Q13 114 17 108 Z"/>' +
        '<path class="scarf-knit" d="M25 117 l2 1.6 l2 -1.6 M60 122 l2 1.6 l2 -1.6 M130 117 l2 1.6 l2 -1.6"/>' +
        // the knot where the end hangs from the band
        '<path class="scarf-band scarf-knot" d="M95.5 115.2 Q105 112.4 115 115 Q118.2 121.4 115.4 127.6 Q105 130.6 95.6 127.8 Q92.6 121.4 95.5 115.2 Z"/>' +
        '<path class="scarf-knit" d="M101 120.6 l2 1.6 l2 -1.6 M106 120.6 l2 1.6 l2 -1.6"/>' +
        '</g>'
    },
    {
      id: 'boa', slot: 'neck', label: 'Feather boa', icon: '8 104 144 46',
      lines: ['dahling!', 'fabulous, simply fabulous', 'strike a pose!'],
      svg: '<g class="neck-boa">' + boa() + '</g>'
    },
    {
      id: 'toast', slot: 'mouth', label: 'Toast in mouth', icon: '60 88 56 34',
      lines: ['mmf mmf!', 'late for the shop!', 'buttery!'],
      svg: '<g class="neck-toast" transform="translate(78 109) rotate(86) translate(-10 -17) scale(1.12)">' +
        '<path class="toast-crust" d="M2 20 V10 C-1.5 9 -1.5 3 2.5 2 C4 -2 9 -3 10.5 0 C12 -2.5 17 -2 18 2 a2.6 2.6 0 0 0 -.5 4 a2.6 2.6 0 0 0 1 4 L20 10 V20 Z"/>' +
        '<path class="toast-crumb" transform="translate(10 10.5) scale(.76) translate(-10 -10.5)" d="M2 20 V10 C-1.5 9 -1.5 3 2.5 2 C4 -2 9 -3 10.5 0 C12 -2.5 17 -2 18 2 a2.6 2.6 0 0 0 -.5 4 a2.6 2.6 0 0 0 1 4 L20 10 V20 Z"/>' +
        '<rect class="toast-butter" x="6.2" y="7.4" width="6.4" height="5" rx="1.3" transform="rotate(-8 9.4 10)"/>' +
        '<path class="toast-dots" d="M6 15.6 h.1 M12.4 15 h.1 M14.6 11.6 h.1"/>' +
        '</g>'
    },
    {
      id: 'leaf', slot: 'mouth', label: 'Leaf in mouth', icon: '66 86 50 32',
      lines: ['nom… leafy', 'very natural', 'crunchy greens!'],
      // a leaf held by its stem at the side of the mouth, flopping down
      svg: '<g class="mouth-leaf">' +
        '<path class="leaf-stem" d="M78.6 106.6 Q84.6 105.4 88 108.4"/>' +
        '<path class="leaf-blade" d="M87.4 107.6 C95.4 105.8 101.4 112.6 100.2 121.6 C99.6 126.2 97.4 129.4 94.2 133.4 C92.6 130.4 89.6 127.4 88 122.4 C86.4 117.6 85.8 112.4 87.4 107.6 Z"/>' +
        '<path class="leaf-vein" d="M88.6 109.6 C93.4 115 95.4 122 94.4 131.4 M93.2 116.6 l3.6 -2 M94.6 122.2 l3.8 -1.4 M92.4 120.2 l-3 -1.6 M93.6 126.4 l-2.8 -1.4"/>' +
        '</g>'
    },
    {
      id: 'hay', slot: 'mouth', label: 'Hay in mouth', icon: '66 82 56 32',
      lines: ['yeehaw…', 'just chillin', 'farm life'],
      // a stalk of straw chewed like a farmer, bending down under its little seed head
      svg: '<g class="mouth-hay">' +
        '<path class="hay-line" d="M77 106.6 Q91 102.4 99 109.4 Q104.4 114.6 105.6 124 M95 106 Q100.6 104.6 104 107.4"/>' +
        '<path class="hay-stalk" d="M77 106.6 Q91 102.4 99 109.4 Q104.4 114.6 105.6 124"/>' +
        '<path class="hay-stalk hay-thin" d="M95 106 Q100.6 104.6 104 107.4"/>' +
        '<g class="hay-seeds"><ellipse cx="105.8" cy="127.4" rx="1.7" ry="3.4" transform="rotate(-6 105.8 127.4)"/>' +
        '<ellipse cx="103.2" cy="130" rx="1.5" ry="3" transform="rotate(24 103.2 130)"/>' +
        '<ellipse cx="108.4" cy="130.2" rx="1.5" ry="3" transform="rotate(-30 108.4 130.2)"/></g>' +
        '</g>'
    },
    {
      id: 'necktie', slot: 'neck', label: 'Necktie', icon: '40 108 80 42',
      lines: ['dressed for success!', 'meeting at nine!', 'very businesslike'],
      svg: '<g class="neck-tie">' +
        '<path class="tie-collar" d="M44 110 Q80 128 116 110 L112 118 Q80 134 48 118 Z"/>' +
        '<path class="tie-cloth" d="M73 124 L87 124 L90 143 Q80 148 70 143 Z"/>' +
        '<path class="tie-stripe" d="M72.4 133 L87.6 130 M71.6 139 L88.4 136"/>' +
        '<path class="tie-cloth" d="M72 117 H88 L86 125 H74 Z"/>' +
        '<path class="tie-fold" d="M76 118.6 Q80 121 84 118.6"/>' +
        '</g>'
    },
    {
      id: 'uglytie', slot: 'neck', label: 'Hideous tie', icon: '40 108 80 42',
      lines: ['it was a gift', 'bold choice, right?', 'my lucky tie!'],
      // the same shape as the necktie, with a clashing patchwork of greens, mustard, red and navy and some white doodles
      svg: '<g class="neck-tie neck-ugly">' +
        '<path class="ugly-collar" d="M44 110 Q80 128 116 110 L112 118 Q80 134 48 118 Z"/>' +
        '<path class="ugly-collar-dark" d="M46 113.6 Q80 130 114 113.6 L112 118 Q80 134 48 118 Z"/>' +
        '<path class="ugly-base" d="M73 124 L87 124 L90 143 Q80 148 70 143 Z"/>' +
        '<path class="ugly-olive" d="M73.6 125.4 L83 125 L81.6 130.4 L72.9 131 Z"/>' +
        '<path class="ugly-navy" d="M72.2 133.6 L77.4 131.8 L78.2 137.8 L71.4 139 Z"/>' +
        '<path class="ugly-mustard" d="M80.4 134.6 L85 133.4 L87.4 136.6 L84.6 140 L80.2 139 Z"/>' +
        '<path class="ugly-teal" d="M74.8 141.4 L84.6 140.6 L87.2 143 Q80 145.6 72.8 143.2 Z"/>' +
        '<path class="ugly-red" d="M83.6 126.2 L86.6 126 L87.2 131.4 L84.2 131.8 Z"/>' +
        '<path class="ugly-doodle" d="M85 128 l1.4 1.4 M86.4 128 l-1.4 1.4 M76 140.2 h2.4 M77.2 139 v2.4 M82.4 136.6 l1.6 -1"/>' +
        '<circle class="ugly-dot" cx="75.4" cy="128" r=".9"/><circle class="ugly-dot" cx="81.6" cy="142.6" r=".8"/>' +
        '<path class="ugly-outline" d="M73 124 L87 124 L90 143 Q80 148 70 143 Z"/>' +
        '<path class="ugly-knot" d="M72 117 H88 L86 125 H74 Z"/>' +
        '<path class="ugly-diamond" d="M80 118.6 l2.6 2.6 l-2.6 2.6 l-2.6 -2.6 Z M80 120.4 l.8 .8 l-.8 .8 l-.8 -.8 Z"/>' +
        '</g>'
    },
    {
      id: 'mustache', slot: 'mouth', label: 'Fake mustache', icon: '44 90 72 26',
      lines: ['ahem, good day!', 'very distinguished', 'is it on straight?'],
      svg: '<g class="neck-mustache">' +
        '<path class="stache" d="M80 102.4 C86 100.4 95 100 101 102 C106 103.6 109.6 101 112.4 96.8 C113.6 102.4 111.6 108.6 104.6 110 C97.4 111.4 88.6 109.6 80 109.6 C71.4 109.6 62.6 111.4 55.4 110 C48.4 108.6 46.4 102.4 47.6 96.8 C50.4 101 54 103.6 59 102 C65 100 74 100.4 80 102.4 Z"/>' +
        '<path class="stache-line" d="M80 103.4 V108.4 M72 104 Q66 106 60 107.4 M88 104 Q94 106 100 107.4 M64 102.4 Q57 104.6 52 104.2 M96 102.4 Q103 104.6 108 104.2"/>' +
        '</g>'
    },
    {
      id: 'boots', slot: 'feet', label: 'Boots', icon: '40 126 80 24',
      lines: ['puddle time!', 'stomp stomp!', 'ready for a walk!'],
      svg: '<g class="feet-boots">' + [58, 102].map(function (x) {
        // a round little booty with a fluffy cloud cuff
        var l = x - 10, cuff = 'M' + l + ' 133.6';
        for (var i = 0; i < 5; i++) cuff += ' a2.2 2.2 0 0 1 4 0';
        cuff += ' a2.2 2.2 0 0 1 0 4.2';
        for (var j = 0; j < 5; j++) cuff += ' a2.2 2.2 0 0 1 -4 0';
        cuff += ' a2.2 2.2 0 0 1 0 -4.2 Z';
        return '<path class="boot" d="M' + (x - 9) + ' 135 H' + (x + 9) + ' V140.6 C' + (x + 9.4) + ' 145.6 ' + (x + 5) + ' 146.6 ' + x + ' 146.6 C' + (x - 5) + ' 146.6 ' + (x - 9.4) + ' 145.6 ' + (x - 9) + ' 140.6 Z"/>' +
          '<path class="boot-sole" d="M' + (x - 8.6) + ' 143.4 Q' + x + ' 146.2 ' + (x + 8.6) + ' 143.4"/>' +
          '<path class="boot-shine" d="M' + (x - 5.4) + ' 139.6 V141.6"/>' +
          '<path class="boot-cuff" d="' + cuff + '"/>';
      }).join('') + '</g>'
    },
    {
      id: 'featherslides', slot: 'feet', label: 'Feather slides', icon: '40 126 80 26',
      lines: ['dahling, I have arrived', 'fabulous toes!', 'only the fluffiest'],
      svg: '<g class="feet-slides">' + [58, 102].map(function (x) {
        // a gold sole with a big pink feather puff across the toes and a little gem in the middle
        var puff = '';
        [[-7, 0, 3.4], [-3.6, -2.6, 3.6], [0, -3.4, 3.8], [3.6, -2.6, 3.6], [7, 0, 3.4], [-4, 1.4, 3.2], [0, 1, 3.4], [4, 1.4, 3.2]].forEach(function (c) {
          puff += '<circle cx="' + (x + c[0]) + '" cy="' + (139.6 + c[1]) + '" r="' + c[2] + '"/>';
        });
        return '<ellipse class="slide-sole" cx="' + x + '" cy="144" rx="12.6" ry="3.2"/>' +
          '<g class="boa-edge">' + puff + '</g><g class="boa-puff">' + puff + '</g>' +
          '<path class="boa-wisp-in" d="M' + (x - 5) + ' 137.6 q1.6 -1.4 3 0 M' + (x + 2) + ' 136.8 q1.6 -1.4 3 0"/>' +
          '<path class="slide-gem" d="M' + x + ' 137.4 l2.4 2.4 l-2.4 2.6 l-2.4 -2.6 Z"/>';
      }).join('') + '</g>'
    },
    {
      id: 'bunnyslippers', slot: 'feet', label: 'Bunny slippers', icon: '40 124 80 26',
      lines: ['so fuzzy!', 'cozy toes!', 'hop hop hop!'],
      svg: '<g class="feet-bunny">' + [58, 102].map(function (x) {
        // a fluffy slipper with two floppy ears and a tiny face
        var fluff = '';
        for (var i = 0; i < 9; i++) {
          var a = Math.PI + i * Math.PI / 8;
          fluff += '<circle cx="' + (x + Math.cos(a) * 8.6).toFixed(1) + '" cy="' + (140.6 + Math.sin(a) * 4.4).toFixed(1) + '" r="2.5"/>';
        }
        for (var j = 0; j < 7; j++) {
          var b = j * Math.PI / 6;
          fluff += '<circle cx="' + (x + Math.cos(b) * 8.6).toFixed(1) + '" cy="' + (140.6 + Math.sin(b) * 4.2).toFixed(1) + '" r="2.5"/>';
        }
        return '<path class="bunny-ear" d="M' + (x - 6.4) + ' 137 C' + (x - 9.4) + ' 130 ' + (x - 5.4) + ' 127.5 ' + (x - 3.6) + ' 130 C' + (x - 2.6) + ' 132 ' + (x - 2.4) + ' 135 ' + (x - 2.4) + ' 137 Z"/>' +
          '<path class="bunny-ear" d="M' + (x + 6.4) + ' 137 C' + (x + 9.4) + ' 130 ' + (x + 5.4) + ' 127.5 ' + (x + 3.6) + ' 130 C' + (x + 2.6) + ' 132 ' + (x + 2.4) + ' 135 ' + (x + 2.4) + ' 137 Z"/>' +
          '<g class="bunny-fluff-edge">' + fluff + '</g>' +
          '<ellipse class="bunny-fluff" cx="' + x + '" cy="140.6" rx="8.6" ry="4.4"/>' +
          '<g class="bunny-fluff">' + fluff + '</g>' +
          '<circle class="bunny-eye" cx="' + (x - 3) + '" cy="140" r="0.9"/><circle class="bunny-eye" cx="' + (x + 3) + '" cy="140" r="0.9"/>' +
          '<ellipse class="bunny-nose" cx="' + x + '" cy="141.6" rx="1.3" ry="0.9"/>';
      }).join('') + '</g>'
    },
    {
      id: 'cowboyboots', slot: 'feet', label: 'Cowboy boots', icon: '38 120 84 28',
      lines: ['boot scootin!', 'yeehaw!', 'line dance time!'],
      svg: '<g class="feet-cowboy"><path class="cb-heel" d="M66.6 141.4 L66.2 144 H62 L61.6 142.4 Z"/><path class="cb-shaft" d="M50.4 133.4 Q58 135.4 65.6 133.4 L65 137.4 H51 Z"/><path class="cb-foot" d="M67 139.6 C67 135.6 53 135.2 46 140.2 C53 143.2 67 143.4 67 139.6 Z"/><path class="cb-stitch" d="M56.4 134.8 q1.6 1.6 3.2 0"/><path class="cb-heel" d="M93.4 141.4 L93.8 144 H98 L98.4 142.4 Z"/><path class="cb-shaft" d="M94.4 133.4 Q102 135.4 109.6 133.4 L109 137.4 H95 Z"/><path class="cb-foot" d="M93 139.6 C93 135.6 107 135.2 114 140.2 C107 143.2 93 143.4 93 139.6 Z"/><path class="cb-stitch" d="M100.4 134.8 q1.6 1.6 3.2 0"/>' +
        // spurs on the outer side of each boot, at the ankle
        spur(50.6, -1) + spur(109.4, 1) + '</g>'
    },
    {
      id: 'clogs', slot: 'feet', label: 'Wooden clogs', icon: '40 124 80 26',
      lines: ['clip clop!', 'very dutch!', 'tulip time!'],
      svg: '<g class="feet-clogs"><path class="clog-sole" d="M48 140.4 C51 143.4 65 143.4 68 140.4 L67.6 142.6 C64.4 145.4 51.6 145.4 48.4 142.6 Z"/><path class="clog" d="M48 140.4 C47.4 134.6 52.6 132 58 132 C63.4 132 68.6 134.6 68 140.4 C65 143.4 51 143.4 48 140.4 Z"/><path class="clog-grain" d="M51.4 135.2 q2.6 -1.2 5.2 0 M59.4 139 q2.4 -1.1 4.8 0"/><path class="clog-heart" d="M58 137.4 c-.6 -1 -2.2 -.4 -1.5 .7 l1.5 1.5 l1.5 -1.5 c.7 -1.1 -.9 -1.7 -1.5 -.7z"/><path class="clog-sole" d="M92 140.4 C95 143.4 109 143.4 112 140.4 L111.6 142.6 C108.4 145.4 95.6 145.4 92.4 142.6 Z"/><path class="clog" d="M92 140.4 C91.4 134.6 96.6 132 102 132 C107.4 132 112.6 134.6 112 140.4 C109 143.4 95 143.4 92 140.4 Z"/><path class="clog-grain" d="M95.4 135.2 q2.6 -1.2 5.2 0 M103.4 139 q2.4 -1.1 4.8 0"/><path class="clog-heart" d="M102 137.4 c-.6 -1 -2.2 -.4 -1.5 .7 l1.5 1.5 l1.5 -1.5 c.7 -1.1 -.9 -1.7 -1.5 -.7z"/></g>'
    },
    {
      id: 'clownshoes', slot: 'feet', label: 'Clown shoes', icon: '36 126 88 24',
      lines: ['flap flap flap!', 'honk honk!', 'tripping on purpose!'],
      svg: '<g class="feet-clown">' + [58, 102].map(function (x) {
        // a long round shoe with the toe pointing out, a pale sole, big dots and a pom on top
        var c = x + (x < 80 ? -4 : 4), out = x < 80 ? -1 : 1;
        return '<ellipse class="clown-sole" cx="' + c + '" cy="140.4" rx="15" ry="6"/>' +
          '<ellipse class="clown-shoe" cx="' + c + '" cy="138.6" rx="15" ry="6.2"/>' +
          '<circle class="clown-dot" cx="' + (c + out * 7) + '" cy="138.4" r="1.9"/>' +
          '<circle class="clown-dot" cx="' + c + '" cy="140.4" r="1.6"/>' +
          '<circle class="clown-dot" cx="' + (c - out * 8) + '" cy="137.6" r="1.5"/>' +
          '<path class="clown-shine" d="M' + (c - 9) + ' 135.8 Q' + (c - 4) + ' 133.8 ' + (c + 2) + ' 134.4"/>' +
          '<circle class="clown-pom" cx="' + (c - out * 2) + '" cy="133" r="2.5"/>';
      }).join('') + '</g>'
    },
    {
      id: 'shades', slot: 'face', label: 'Heart shades', icon: '28 74 104 36',
      lines: ['too cool for school!', 'the future is bright!', 'no paparazzi, please!'],
      svg: '<g class="face-shades">' +
        '<path class="shades-arm" d="M45.5 87 L31 84 M114.5 87 L129 84"/>' +
        '<path class="shades-bridge" d="M70 87 Q80 82 90 87"/>' +
        '<path class="shades-lens" d="M58 104 C44 95 42 86 49 81.5 C53.5 79 57 81 58 84.5 C59 81 62.5 79 67 81.5 C74 86 72 95 58 104 Z"/>' +
        '<path class="shades-lens" d="M102 104 C88 95 86 86 93 81.5 C97.5 79 101 81 102 84.5 C103 81 106.5 79 111 81.5 C118 86 116 95 102 104 Z"/>' +
        '<path class="shades-shine" d="M50 86 Q51 83.5 53.5 83.5 M94 86 Q95 83.5 97.5 83.5"/>' +
        '</g>'
    },
    {
      id: 'redspecs', slot: 'face', label: 'Red specs', icon: '28 74 104 36',
      lines: ['very studious!', 'peering over my glasses…', 'sharp eyes, sharp mind.'],
      svg: '<g class="face-redspecs">' +
        // half-rim reading glasses: a thin red frame under clear lenses, worn a little low
        '<path class="specs-lens" d="M45 93 H71 C71 101 66 104 58 104 C50 104 45 101 45 93 Z"/>' +
        '<path class="specs-lens" d="M89 93 H115 C115 101 110 104 102 104 C94 104 89 101 89 93 Z"/>' +
        '<path class="specs-top" d="M45 93 H71 M89 93 H115"/>' +
        '<path class="specs-rim" d="M45 93 C45 101 50 104 58 104 C66 104 71 101 71 93 M89 93 C89 101 94 104 102 104 C110 104 115 101 115 93"/>' +
        '<path class="specs-rim" d="M71 94 Q80 89 89 94 M45 93.5 L31 89 M115 93.5 L129 89"/>' +
        '<path class="specs-shine" d="M49 96 Q50 99.5 53 101"/>' +
        '</g>'
    },
    {
      id: 'eyepatch', slot: 'face', label: 'Eye patch', icon: '18 66 132 40',
      lines: ['arr, matey!', 'yo ho, snacks ho!', 'I see half the treats!'],
      svg: '<g class="face-patch">' +
        '<path class="patch-strap" d="M93 85 C78 74 50 67 19 73 M112.5 90.5 L146 92"/>' +
        '<path class="patch" d="M91.5 89 C91.5 82 97 80 103 80.5 C110 81 114 85 113.5 91.5 C113 98.5 108 102 101.5 101.5 C95 101 91.5 96 91.5 89 Z"/>' +
        '<path class="patch-heart" d="M102.5 89 c-1.1 -1.8 -3.8 -.7 -2.7 1.1 l2.7 2.7 l2.7 -2.7 c1.1 -1.8 -1.6 -2.9 -2.7 -1.1z"/>' +
        '<path class="patch-shine" d="M95.5 86 Q96.5 83.6 99 83"/>' +
        '</g>'
    },
    {
      id: 'nerdspecs', slot: 'face', label: 'Taped specs', icon: '26 74 108 34',
      lines: ['well, actually…', 'I read the label!', 'these have seen things.'],
      svg: '<g class="face-nerd">' +
        '<path class="nerd-arm" d="M44 88 L30 85 M116 88 L130 85"/>' +
        '<rect class="nerd-lens" x="44" y="80.5" width="28" height="23" rx="7"/>' +
        '<rect class="nerd-lens" x="88" y="80.5" width="28" height="23" rx="7"/>' +
        '<path class="nerd-bridge" d="M72 88.5 Q80 85 88 88.5"/>' +
        '<rect class="nerd-tape" x="76.2" y="83" width="7.6" height="8.6" rx="1.6" transform="rotate(-8 80 87.3)"/>' +
        '<path class="nerd-tape-line" d="M78.4 84 L78.9 90.6 M81.4 83.6 L81.9 90.2" transform="rotate(-8 80 87.3)"/>' +
        '<path class="nerd-shine" d="M48.5 86 Q49 83.6 51.5 83 M92.5 86 Q93 83.6 95.5 83"/>' +
        '</g>'
    },
    {
      id: 'roundshades', slot: 'face', label: 'Round tints', icon: '28 74 104 36',
      lines: ['rose-tinted world!', 'very mysterious', 'groovy, baby!'],
      svg: '<g class="face-round">' +
        '<path class="round-arm" d="M46.5 88 L31 85 M113.5 88 L129 85"/>' +
        '<circle class="round-lens" cx="58" cy="92" r="12.6"/>' +
        '<circle class="round-lens" cx="102" cy="92" r="12.6"/>' +
        '<path class="round-bridge" d="M70.4 90 Q80 85.6 89.6 90"/>' +
        '<path class="round-shine" d="M49.6 87.4 Q51.4 83.6 55.4 82.6 M93.6 87.4 Q95.4 83.6 99.4 82.6"/>' +
        '<path class="round-shine" d="M52.4 99 Q55 101.6 58.8 101.8 M96.4 99 Q99 101.6 102.8 101.8" style="opacity:.35"/>' +
        '</g>'
    },
    {
      id: 'bandage', slot: 'face', label: 'Face bandage', icon: '92 88 40 32',
      lines: ['tough cookie!', "it doesn't even hurt", 'battle scar!'],
      // a little sticking plaster across one cheek
      svg: '<g class="face-bandage" transform="translate(116 101) rotate(-32)">' +
        '<rect class="band-strip" x="-12.5" y="-4.6" width="25" height="9.2" rx="4.6"/>' +
        '<rect class="band-pad" x="-4.6" y="-3.4" width="9.2" height="6.8" rx="1.4"/>' +
        '<path class="band-holes" d="M-9 -1.4 h.1 M-9 1.4 h.1 M9 -1.4 h.1 M9 1.4 h.1 M-2 -1 h.1 M2 1 h.1"/>' +
        '</g>'
    },
    {
      id: 'clownnose', slot: 'face', label: 'Clown nose', icon: '66 86 28 26',
      lines: ['honk honk!', 'squeeze my nose!', 'send in the clown!'],
      svg: '<g class="face-clownnose">' +
        '<circle class="cnose" cx="80" cy="98.4" r="5.4"/>' +
        '<ellipse class="cnose-shine" cx="78" cy="96.2" rx="1.7" ry="1.2"/>' +
        '</g>'
    }
  ];

  /**
   * Splits a pair of shoes into a left and a right group (by where each part sits), so each foot can step and tap
   * on its own (styles.css moves .shoe-l and .shoe-r with the pet's .foot-l and .foot-r).
   * @param {string} svg A feet item: one wrapper group whose children are the parts of both shoes.
   * @returns {string}
   */
  function splitShoes(svg) {
    var m = svg.match(/^(<g [^>]*>)([\s\S]*)<\/g>$/);
    if (!m) return svg;
    var sides = { l: '', r: '' }, depth = 0, start = 0, tag = /<(\/?)(\w+)[^>]*?(\/?)>/g, t;
    while ((t = tag.exec(m[2]))) {
      if (t[1]) depth--;
      if (depth === 0 && !t[1]) start = t.index;
      if (!t[1] && !t[3]) depth++;
      if (depth === 0) {
        var part = m[2].slice(start, tag.lastIndex);
        var x = part.match(/(?:cx="|d="M\s*)([\d.]+)/);
        sides[x && parseFloat(x[1]) < 80 ? 'l' : 'r'] += part;
      }
    }
    return m[1] + '<g class="shoe-l">' + sides.l + '</g><g class="shoe-r">' + sides.r + '</g></g>';
  }
  root.Wardrobe.forEach(function (w) { if (w.slot === 'feet') w.svg = splitShoes(w.svg); });
})(typeof self !== 'undefined' ? self : globalThis);
