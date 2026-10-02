/* Wardrobe: the items you can dress your pet in.
 * Each item has a slot: "hat" (one thing on the head at a time) or "face"
 * (glasses, worn alongside a hat), a label, `lines` the pet says when you point at it in the dressing room, and SVG
 * drawn in the pet's 160x150 coordinate space.
 * Hats sit on the top of the head (around x 80, y 38) and are drawn a little
 * bigger. Items with `layer: 'body'` (like the hoodie) are drawn at full size
 * over the whole pet instead; `hood: true` tucks the pet's own ears away.
 * `snug: true` sits close on the head, so the mochi twist and chick tuft tuck under it.
 * Face items are drawn at normal size over the eyes (around y 92).
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

  root.Wardrobe = [
    {
      id: 'tophat', slot: 'hat', label: 'Top hat',
      lines: ['ooh, so fancy!', 'very distinguished', 'a hat for tea time?'],
      svg: '<g transform="rotate(-9 84 34)" class="hat-tophat">' +
        '<ellipse class="hat-dark" cx="84" cy="38" rx="25" ry="6"/>' +
        '<path class="hat-dark" d="M71 37 V13 Q71 8 76 8 H92 Q97 8 97 13 V37 Z"/>' +
        '<path class="hat-band" d="M71 29 H97 V35 H71 Z"/>' +
        '<path class="hat-shine" d="M76 13 V24"/>' +
        '<path class="hat-edge" d="M59 38 Q84 47 109 38"/>' +
        '<path class="hat-heart" d="M90 31.2 c-1 -1.6 -3.4 -.6 -2.4 1 l2.4 2.4 l2.4 -2.4 c1 -1.6 -1.4 -2.6 -2.4 -1z"/>' +
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
      id: 'cap', slot: 'hat', label: 'Boy cap',
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
      id: 'hoodie', slot: 'hat', label: 'Cow hoodie', layer: 'body', hood: true, icon: '4 14 152 130',
      lines: ['moo! so cosy!', 'a cow? me?!', 'so soft and fluffy!'],
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
        '<g class="hood-face"><ellipse class="hood-eye" cx="66.5" cy="49.5" rx="4" ry="4.8"/><ellipse class="hood-eye" cx="93.5" cy="49.5" rx="4" ry="4.8"/>' +
        '<circle class="hood-glint" cx="65.3" cy="47.8" r="1.4"/><circle class="hood-glint" cx="92.3" cy="47.8" r="1.4"/>' +
        '<ellipse class="hood-muzzle" cx="80" cy="59" rx="12.5" ry="6"/>' +
        '<ellipse class="hood-nostril" cx="75.5" cy="58.6" rx="1.5" ry="2"/><ellipse class="hood-nostril" cx="84.5" cy="58.6" rx="1.5" ry="2"/></g>' +
        '<ellipse class="hood-rim" cx="80" cy="99.5" rx="56.5" ry="33.5"/>' +
        '<path class="hood-string" d="M68 131 C67 134 66 136 66 139 M92 131 C93 134 94 136 94 139"/>' +
        '<circle class="hood-toggle" cx="66" cy="140" r="2.4"/><circle class="hood-toggle" cx="94" cy="140" r="2.4"/>' +
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
      id: 'mintphones', slot: 'hat', snug: true, label: 'Mint phones', icon: '14 24 132 60',
      lines: ['minty fresh beats!', 'la la la ♪', 'one more song!'],
      svg: phones('phones-mint')
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
    }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
