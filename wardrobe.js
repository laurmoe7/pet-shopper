/* Wardrobe: the items you can dress your pet in.
 * Each item has a slot (only "hat" for now: one thing on the head at a time), a
 * label, `lines` the pet says when you point at it in the dressing room, and SVG
 * drawn in the pet's 160x150 coordinate space.
 * Hats sit on the top of the head (around x 80, y 38) and are drawn a little
 * bigger. Items with `layer: 'body'` (like the hoodie) are drawn at full size
 * over the whole pet instead; `hood: true` tucks the pet's own ears away.
 * `icon` is the viewBox for the dressing-room button.
 * Add a new item here and it shows up in the dressing room.
 */
(function (root) {
  'use strict';
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
        '<path class="straw-weave" d="M44 45 l5 2 M56 49 l5 1.5 M100 49 l5 -1.5 M112 46 l5 -2 M70 50 l5 .5 M88 50 l5 -.5"/>' +
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
    }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
