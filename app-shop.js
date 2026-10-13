// The Shop: a made-up test page to see how it looks. Nothing here can be bought; there is no payment code and the prices are
// placeholders. Only money purchases will ever be sold here (cosmetic packs and a premium sub), never a coin.
// These files are plain scripts that share one scope, loaded in the order listed in index.html.
'use strict';

var shopSheet = $('shopSheet'), shopNote = $('shopNote');

/** The premium sub (a yearly and a monthly plan) and the cosmetic packs (placeholder names, art and prices). */
var SHOP_PREMIUM = {
  name: 'Fumufumu Plus', emoji: '🌙', tag: 'Little extras for you and Fumu',
  perks: ['Mini Fumu on your desktop', 'Syncing between your phone and computer', 'Household syncing', 'Extra goals and rewards'],
  plans: [
    { id: 'year', label: 'Yearly', price: '€14.99', per: '/ year', sub: '€1.25 a month', ribbon: 'Best value · save 58%' },
    { id: 'month', label: 'Monthly', price: '€2.99', per: '/ month', sub: 'Pay as you go', ribbon: '' }
  ]
};
var SHOP_PACKS = [
  { name: 'Cosy Night pack', emoji: '🧸', price: '€1.99', text: 'Pyjamas, a night cap and a teddy' },
  { name: 'Tea Time pack', emoji: '☕', price: '€1.99', text: 'Cup, apron and a little hat' },
  { name: 'Dress-up pack', emoji: '🎩', price: '€2.49', text: 'Fancy hats and bows' }
];
var shopPlan = 'year';   // the plan picked on the Plus card (yearly to start with)

/** @returns {HTMLElement} A new element with a class and some text. */
function shopEl(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
/** @returns {HTMLElement} The Fumufumu Plus card: a sparkly header, the perks with ticks, a yearly and a monthly plan to pick from, and the button. */
function plusCard(o) {
  var card = shopEl('div', 'plus-card'), head = shopEl('div', 'plus-head'), titles = shopEl('div', 'plus-titles');
  titles.append(shopEl('b', 'plus-name', o.name), shopEl('span', 'plus-tag', o.tag));
  head.append(emojiImg(o.emoji, ''), titles);
  var perks = shopEl('ul', 'plus-perks');
  o.perks.forEach(function (t) { var li = shopEl('li', '', t); perks.appendChild(li); });
  var plans = shopEl('div', 'plus-plans');
  plans.setAttribute('role', 'radiogroup'); plans.setAttribute('aria-label', 'Plan');
  o.plans.forEach(function (pl) {
    var b = shopEl('button', 'plus-plan' + (pl.id === shopPlan ? ' on' : '')); b.type = 'button';
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(pl.id === shopPlan)); b.dataset.plan = pl.id;
    if (pl.ribbon) b.appendChild(shopEl('i', 'plus-ribbon', pl.ribbon));
    var price = shopEl('span', 'plus-price'); price.append(shopEl('b', '', pl.price), shopEl('small', '', pl.per));
    b.append(shopEl('span', 'plus-plan-name', pl.label), price, shopEl('small', 'plus-sub', pl.sub));
    plans.appendChild(b);
  });
  var cta = shopEl('button', 'pill-btn shop-buy plus-cta', 'Get Fumufumu Plus'); cta.type = 'button'; cta.dataset.name = o.name;
  card.append(head, perks, plans, cta);
  return card;
}
/** @returns {HTMLElement} A tile for a cosmetic pack: a sticker on a soft round, a name, a line of text and a price button. */
function shopCard(o) {
  var card = shopEl('div', 'shop-card'), body = shopEl('div', 'shop-body'), buy = shopEl('button', 'pill-btn shop-buy', o.price), pic = shopEl('span', 'shop-pic');
  buy.type = 'button'; buy.dataset.name = o.name;
  body.append(shopEl('b', '', o.name), shopEl('span', '', o.text));
  pic.appendChild(emojiImg(o.emoji, ''));
  card.append(pic, body, buy);
  return card;
}
/** Draws the page. */
function renderShop() {
  var head = function (text) { return shopEl('h3', 'shop-head', text); };
  $('shopList').replaceChildren.apply($('shopList'), [plusCard(SHOP_PREMIUM), head('Cosmetic packs')].concat(SHOP_PACKS.map(shopCard)));
  shopNote.textContent = '';
}
$('shopBtn').addEventListener('click', function () {
  renderShop(); sheetUnderMouth(shopSheet); openDialog(shopSheet);
});
$('shopList').addEventListener('click', function (e) {
  var pl = e.target.closest('.plus-plan');
  if (pl) {   // picking a plan
    sound('tap'); shopPlan = pl.dataset.plan;
    [].forEach.call($('shopList').querySelectorAll('.plus-plan'), function (x) { var on = x === pl; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
    return;
  }
  var b = e.target.closest('.shop-buy');
  if (!b) return;
  sound('tap');
  shopNote.textContent = b.dataset.name + (b.classList.contains('plus-cta') ? ' (' + (shopPlan === 'year' ? 'yearly' : 'monthly') + ')' : '') + ': not for sale yet. This page is only a preview.';
});
