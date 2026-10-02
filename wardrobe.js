/* Wardrobe: the items you can dress your pet in.
 * Each item has a slot (only "hat" for now), a label and SVG drawn in the pet's
 * 160x150 coordinate space, sitting on the top of the head (around x 80, y 38).
 * Add a new item here and it shows up in the dressing room.
 */
(function (root) {
  'use strict';
  root.Wardrobe = [
    {
      id: 'tophat', slot: 'hat', label: 'Top hat',
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
    }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
