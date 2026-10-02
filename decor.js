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
      // listed first so it lies under everything else, right below the cushion
      id: 'rug', label: 'Rug', x: 0.5, y: 0.93, w: 220, h: 36, view: '0 0 200 34',
      svg: '<ellipse cx="100" cy="17" rx="97" ry="14.5" fill="#ffd9e2" ' + INK + '/>' +
        '<ellipse cx="100" cy="17" rx="84" ry="10.5" fill="none" stroke="#ff9fb5" stroke-width="2.4" stroke-dasharray="5 4"/>' +
        '<ellipse cx="100" cy="17" rx="66" ry="7" fill="#fff0f4"/>' +
        '<path d="M44 17 l5 -3 5 3 -5 3z M151 17 l5 -3 5 3 -5 3z M97 12.5 l3 -2 3 2 -3 2z" fill="#ffb3c6"/>' +
        '<path d="M3 13 l-3 -1 M2 17 h-3 M3 21 l-3 1 M197 13 l3 -1 M198 17 h3 M197 21 l3 1" stroke="#5b4239" stroke-width="1.6" stroke-linecap="round"/>'
    },
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
    },
    {
      id: 'desk', label: 'Gaming desk', x: 0.16, y: 0.78, w: 96, h: 76, view: '0 0 90 72',
      // a pastel desk with a glowing PC, a little game on screen and a kitty-ear headset
      svg: '<rect x="6" y="46" width="5" height="24" rx="2" fill="#b79ad6" ' + INK + '/>' +
        '<rect x="79" y="46" width="5" height="24" rx="2" fill="#b79ad6" ' + INK + '/>' +
        '<rect x="2" y="40" width="86" height="7" rx="3" fill="#d9c4f2" ' + INK + '/>' +
        '<rect x="13" y="9" width="42" height="27" rx="4" fill="#4d3c43" ' + INK + '/>' +
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
        '<path d="M58 9 C58 2 72 0 74 7" fill="none" stroke="#ff9fb5" stroke-width="2.4" stroke-linecap="round"/>' +
        '<path d="M58 4 l1 -4 3 3 M71 1.5 l3 -2 .5 4" fill="#ff9fb5" stroke="#5b4239" stroke-width="1" stroke-linejoin="round"/>'
    },
    {
      id: 'burgerphone', label: 'Burger phone', x: 0.9, y: 0.6, w: 54, h: 50, view: '0 0 50 46',
      // the top bun is the handset; the cord curls off to the side and the buttons sit on the bottom bun
      svg: '<path d="M44.5 32 q5 1 4 5 q-1 4 -4 4 q-3 1 -1 4" fill="none" stroke="#5b4239" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M5 34 Q5 44 25 44 Q45 44 45 34 Z" fill="#f1c48d" ' + INK + '/>' +
        '<rect x="15.5" y="38.3" width="5" height="3" rx="1.5" fill="#fffaf4" stroke="#5b4239" stroke-width="1"/>' +
        '<rect x="22.5" y="38.3" width="5" height="3" rx="1.5" fill="#fffaf4" stroke="#5b4239" stroke-width="1"/>' +
        '<rect x="29.5" y="38.3" width="5" height="3" rx="1.5" fill="#ff9fb5" stroke="#5b4239" stroke-width="1"/>' +
        '<rect x="5" y="25" width="40" height="8.5" rx="4.25" fill="#9b6448" ' + INK + '/>' +
        '<path d="M13 28 l3 2.4 M21 28 l3 2.4 M29 28 l3 2.4 M37 28 l2.4 1.9" fill="none" stroke="#7a4a35" stroke-width="1.3" stroke-linecap="round"/>' +
        '<path d="M3 33.4 q2.75 -2.4 5.5 0 q2.75 -2.4 5.5 0 q2.75 -2.4 5.5 0 q2.75 -2.4 5.5 0 q2.75 -2.4 5.5 0 q2.75 -2.4 5.5 0 q2.75 -2.4 5.5 0 q2.75 -2.4 5.5 0 L47 35.2 q-2.75 2.2 -5.5 0 q-2.75 2.2 -5.5 0 q-2.75 2.2 -5.5 0 q-2.75 2.2 -5.5 0 q-2.75 2.2 -5.5 0 q-2.75 2.2 -5.5 0 q-2.75 2.2 -5.5 0 q-2.75 2.2 -5.5 0 Z" fill="#9ed99a" stroke="#5b4239" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<path d="M6 24.5 H44 Q44.5 26.5 42 26.5 Q39.5 26.5 39 28.5 Q38.5 31 36 31 Q33.5 31 33.5 28 Q33 26.5 30 26.5 H19 Q16.5 26.5 16.2 29 Q15.8 31.5 13.5 31.5 Q11 31.5 11 28.5 Q11 26.5 8 26.5 Q5.5 26.5 6 24.5 Z" fill="#ffd65c" stroke="#5b4239" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<path d="M5 21 Q5 5 25 5 Q45 5 45 21 Q25 24 5 21 Z" fill="#f6c27e" ' + INK + '/>' +
        '<path d="M11.5 12 Q15.5 8.6 20 8.2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
        '<ellipse cx="18" cy="14" rx="1.7" ry=".95" transform="rotate(-20 18 14)" fill="#fffaf4" stroke="#e0a865" stroke-width=".5"/>' +
        '<ellipse cx="26" cy="10.5" rx="1.7" ry=".95" transform="rotate(15 26 10.5)" fill="#fffaf4" stroke="#e0a865" stroke-width=".5"/>' +
        '<ellipse cx="33.5" cy="14.5" rx="1.7" ry=".95" transform="rotate(-10 33.5 14.5)" fill="#fffaf4" stroke="#e0a865" stroke-width=".5"/>' +
        '<ellipse cx="25" cy="17.5" rx="1.7" ry=".95" transform="rotate(25 25 17.5)" fill="#fffaf4" stroke="#e0a865" stroke-width=".5"/>'
    }
  ];
})(typeof self !== 'undefined' ? self : globalThis);
