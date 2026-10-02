/* Decor: furniture and things for the room behind the pet.
 * Each item has a label, a default spot in the room (x and y from 0 to 1, the
 * item's centre across and down the stage), a size in pixels and an SVG drawing.
 * Placed items can be dragged around the room. All free for now.
 * Add a new item here and it shows up in the dressing room.
 */
(function (root) {
  'use strict';

  var INK = 'stroke="#5b4239" stroke-width="2" stroke-linejoin="round"';

  root.Decor = [
    {
      id: 'window', label: 'Window', x: 0.84, y: 0.32, w: 70, h: 64, view: '0 0 60 56',
      svg: '<path d="M8 6 Q30 0 52 6" fill="none" ' + INK + '/>' +
        '<rect x="7" y="5" width="46" height="42" rx="6" fill="#fffaf4" ' + INK + '/>' +
        '<rect x="11.5" y="9.5" width="37" height="33" rx="3" fill="#cfe9fb"/>' +
        '<path d="M15 23 a4 4 0 0 1 6 -3 a5 5 0 0 1 9 1 a3.5 3.5 0 0 1 2 6 h-15 a3 3 0 0 1 -2 -4z" fill="#fff"/>' +
        '<circle cx="42" cy="15" r="3.2" fill="#ffe27a"/>' +
        '<path d="M30 9.5 V42.5 M11.5 26 H48.5" stroke="#5b4239" stroke-width="2"/>' +
        '<path d="M3 4 Q13 5 15 15 Q12 31 9 47 H3 Z" fill="#ffc1cf" ' + INK + '/>' +
        '<path d="M57 4 Q47 5 45 15 Q48 31 51 47 H57 Z" fill="#ffc1cf" ' + INK + '/>' +
        '<path d="M8 26 Q12 28 15 26 M52 26 Q48 28 45 26" fill="none" stroke="#f39bb0" stroke-width="2" stroke-linecap="round"/>' +
        '<rect x="1" y="46" width="58" height="7" rx="3.5" fill="#f6dcc8" ' + INK + '/>'
    },
    {
      id: 'beanbag', label: 'Beanbag', x: 0.84, y: 0.78, w: 82, h: 58, view: '0 0 72 50',
      svg: '<path d="M7 44 C1 31 9 13 29 10 C47 8 64 18 66 34 C67 44 57 47 37 47 C21 47 10 47 7 44 Z" fill="#b9d9f2" ' + INK + '/>' +
        '<path d="M22 30 C30 24 44 24 52 31" fill="none" stroke="#8fbde3" stroke-width="2.4" stroke-linecap="round"/>' +
        '<path d="M14 22 C18 17 23 14 28 13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
        '<path d="M37 10.5 V18" stroke="#5b4239" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>' +
        '<ellipse cx="36" cy="47.5" rx="26" ry="2.5" fill="#5b4239" opacity=".12"/>'
    },
    {
      id: 'clock', label: 'Cuckoo clock', x: 0.63, y: 0.22, w: 46, h: 68, view: '0 0 44 66',
      // the hands show the real time
      svg: '<path d="M3 20 L22 3 L41 20 Z" fill="#c98f6a" ' + INK + '/>' +
        '<path d="M22 3 C20 -1 25 -2 26 1" fill="#9ed99a" stroke="#5b4239" stroke-width="1.4"/>' +
        '<rect x="7" y="18" width="30" height="29" rx="3" fill="#e9bf96" ' + INK + '/>' +
        '<rect x="18" y="8" width="8" height="8" rx="2" fill="#7a5442" stroke="#5b4239" stroke-width="1.4"/>' +
        '<circle cx="22" cy="12.5" r="2.6" fill="#ffd65c"/><path d="M24.4 12.5 l2 -.6 -2 -.6" fill="#f39b5a"/>' +
        '<circle cx="22" cy="32" r="9.5" fill="#fffaf4" ' + INK + '/>' +
        '<g class="clock-hands"><path class="clock-hour" d="M22 32 V26.5" stroke="#5b4239" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path class="clock-minute" d="M22 32 V24" stroke="#5b4239" stroke-width="1.5" stroke-linecap="round"/></g>' +
        '<circle cx="22" cy="32" r="1.4" fill="#5b4239"/>' +
        '<path d="M16 47 V56 M28 47 V52" stroke="#5b4239" stroke-width="1.2"/>' +
        '<ellipse cx="16" cy="59.5" rx="3" ry="5" fill="#c98f6a" stroke="#5b4239" stroke-width="1.6"/>' +
        '<ellipse cx="28" cy="55.5" rx="3" ry="5" fill="#c98f6a" stroke="#5b4239" stroke-width="1.6"/>'
    }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
