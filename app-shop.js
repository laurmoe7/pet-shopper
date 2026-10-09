// The Shop: a made-up test page to see how it looks. Nothing here can be bought; there is no payment code and the prices are
// placeholders. Only money purchases will ever be sold here (cosmetic packs and a premium sub), never a coin. It stays off
// (the dock button greyed out) until Developer tools > "Test Shop" switches it on, on this device only.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var SHOP_KEY = 'nibble-test-shop';
var shopSheet = $('shopSheet'), shopNote = $('shopNote');

/** The premium sub and the cosmetic packs (placeholder names, art and prices). */
var SHOP_PREMIUM = { name: 'Fumufumu Plus', emoji: '🌙', price: '€2.99 / month', perks: ['Mini Fumu on your desktop', 'Extra goals and rewards', 'Cancel any time'] };
var SHOP_PACKS = [
  { name: 'Cosy Night pack', emoji: '🧸', price: '€1.99', text: 'Pyjamas, a night cap and a teddy' },
  { name: 'Tea Time pack', emoji: '☕', price: '€1.99', text: 'Cup, apron and a little hat' },
  { name: 'Dress-up pack', emoji: '🎩', price: '€2.49', text: 'Fancy hats and bows' }
];

/** @returns {boolean} Whether the test Shop is switched on (this device only). */
function shopOn() {
  try { return localStorage.getItem(SHOP_KEY) === '1'; } catch (e) { return false; }
}
/** Greys the dock's Shop button out, or lights it up when the test Shop is on. */
function applyShop() {
  var on = shopOn();
  $('shopBtn').disabled = !on;
  $('shopBtn').setAttribute('aria-label', on ? 'Shop' : 'Shop: coming soon');
  if (!on && shopSheet.open) shopSheet.close();
}
/** Developer tools: switches the test Shop on or off. @returns {string} What happened. */
function devToggleShop() {
  var on = !shopOn();
  try { localStorage.setItem(SHOP_KEY, on ? '1' : '0'); } catch (e) { return 'Could not save that on this device.'; }
  applyShop();
  return on ? 'Test Shop on: the Shop button in the bottom bar opens it.' : 'Test Shop off: the Shop button is greyed out again.';
}
/** @returns {HTMLElement} A tile: a sticker, a name, a line of text and a price button. */
function shopCard(o, premium) {
  var card = document.createElement('div'), body = document.createElement('div'), name = document.createElement('b'), buy = document.createElement('button');
  card.className = 'shop-card' + (premium ? ' shop-premium' : '');
  body.className = 'shop-body';
  name.textContent = o.name;
  body.appendChild(name);
  if (premium) {
    var list = document.createElement('ul');
    list.className = 'shop-perks';
    o.perks.forEach(function (p) { var li = document.createElement('li'); li.textContent = p; list.appendChild(li); });
    body.appendChild(list);
  } else {
    var t = document.createElement('span');
    t.textContent = o.text;
    body.appendChild(t);
  }
  buy.type = 'button'; buy.className = 'pill-btn shop-buy'; buy.textContent = o.price; buy.dataset.name = o.name;
  card.append(emojiImg(o.emoji, ''), body, buy);
  return card;
}
/** Draws the page. */
function renderShop() {
  var head = function (text) { var h = document.createElement('h3'); h.className = 'shop-head'; h.textContent = text; return h; };
  $('shopList').replaceChildren.apply($('shopList'), [head('Premium'), shopCard(SHOP_PREMIUM, true), head('Cosmetic packs')].concat(SHOP_PACKS.map(function (p) { return shopCard(p, false); })));
  shopNote.textContent = '';
}
$('shopBtn').addEventListener('click', function () { renderShop(); sheetUnderMouth(shopSheet); openDialog(shopSheet); });
$('shopList').addEventListener('click', function (e) {
  var b = e.target.closest('.shop-buy');
  if (!b) return;
  sound('tap');
  shopNote.textContent = b.dataset.name + ': not for sale yet. This page is only a preview.';
});
applyShop();
