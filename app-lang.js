// Language (build 591): English or Dutch, switched with the two flags in Options (kept on the device in nibble-lang).
// How it works: the page's English stays in the code and in the HTML; when Dutch is picked, every piece of text that has an entry in the Dutch word list
// (app-dutch.js: `Dutch`, English text -> Dutch text, with {name} style holes for the changing parts) is swapped as it appears on the page, and swapped back
// when English is picked again. A text with no entry stays English, so nothing breaks while the list grows. What is typed or chosen by the player (items,
// names, plans) is never touched: those places are marked `.item-text`, `.pet-name` or `data-notr` (see SKIP). In English nothing runs at all.
// Plain script, shares one scope, loaded after app-options.js and app-voice.js and before app-start.js.
'use strict';

var LANG_KEY = 'nibble-lang';
var Lang = (function () {
  var LANGS = [['en', '🇺🇸', 'English'], ['nl', '🇳🇱', 'Nederlands']];
  var cur = 'en';
  try { cur = localStorage.getItem(LANG_KEY) === 'nl' ? 'nl' : 'en'; } catch (e) { /* storage not available */ }
  var words = null, holes = [], observer = null;
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var SKIP = 'script, style, textarea, input, .item-text, .pet-name, .qty-tag, [data-notr]';
  var textOf = new WeakMap(), attrOf = new WeakMap();   // what each node said in English, and what it says now

  /** Gets the word list ready (once): plain entries by text, entries with {holes} as patterns. */
  function load() {
    if (words) return;
    words = Object.create(null); holes = [];
    var nl = typeof Dutch === 'object' ? Dutch : {};
    Object.keys(nl).forEach(function (en) {
      if (en.indexOf('{') < 0) { words[en] = nl[en]; return; }
      var names = [];
      var src = en.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\w+)\}/g, function (m, n) { names.push(n); return '(.+?)'; });
      holes.push({ re: new RegExp('^' + src + '$'), names: names, out: nl[en] });
    });
  }
  /** @param {string} s English text (trimmed). @returns {string} The Dutch text, or the same text when there is none (or the language is English). */
  function tr(s) {
    if (cur !== 'nl' || !s) return s;
    load();
    var v = words[s];
    if (v !== undefined) return v;
    for (var i = 0; i < holes.length; i++) {
      var m = holes[i].re.exec(s);
      if (m) return holes[i].out.replace(/\{(\w+)\}/g, function (x, n) { var k = holes[i].names.indexOf(n); return k < 0 ? x : tr(m[k + 1]); });
    }
    return s;
  }
  function inSkip(el) { return !!(el && el.closest && el.closest(SKIP)); }
  function doText(n) {
    var mark = textOf.get(n), now = n.nodeValue;
    if (mark && now === mark.nl) return;   // (our own change coming back round)
    var lead = now.match(/^\s*/)[0], trail = now.match(/\s*$/)[0], core = now.trim();
    if (!core || inSkip(n.parentNode)) { textOf.delete(n); return; }
    var out = tr(core);
    if (out === core) { textOf.delete(n); return; }
    var next = lead + out + trail;
    textOf.set(n, { en: now, nl: next });
    n.nodeValue = next;
  }
  function doAttr(el, a) {
    var now = el.getAttribute(a);
    if (now === null) return;
    var m = attrOf.get(el) || {}, mark = m[a];
    if (mark && now === mark.nl) return;
    if (inSkip(el) && el.tagName !== 'INPUT') return;
    var out = tr(now.trim());
    if (out === now.trim()) { if (mark) { delete m[a]; } return; }
    m[a] = { en: now, nl: out };
    attrOf.set(el, m);
    el.setAttribute(a, out);
  }
  function doTree(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 || inSkip(root)) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) doText(n);
    var els = root.querySelectorAll('[placeholder], [aria-label], [title], [alt]');
    ATTRS.forEach(function (a) { if (root.hasAttribute(a)) doAttr(root, a); });
    for (var i = 0; i < els.length; i++) ATTRS.forEach(function (a) { if (els[i].hasAttribute(a)) doAttr(els[i], a); });
  }
  /** Puts every swapped text back to English. */
  function undoTree(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (t) { var m = textOf.get(t); if (m && t.nodeValue === m.nl) t.nodeValue = m.en; textOf.delete(t); });
    root.querySelectorAll('[placeholder], [aria-label], [title], [alt]').forEach(function (el) {
      var m = attrOf.get(el);
      if (m) Object.keys(m).forEach(function (a) { if (el.getAttribute(a) === m[a].nl) el.setAttribute(a, m[a].en); });
      attrOf.delete(el);
    });
  }
  function watch() {
    if (observer || !window.MutationObserver) return;
    observer = new MutationObserver(function (list) {
      list.forEach(function (r) {
        if (r.type === 'characterData') doText(r.target);
        else if (r.type === 'attributes') doAttr(r.target, r.attributeName);
        else r.addedNodes.forEach(doTree);
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  /** Wears the picked language now: the whole page, the title, and from here on whatever appears. */
  function wear() {
    document.documentElement.lang = cur;
    if (cur === 'nl') { watch(); doTree(document.body); document.title = tr(document.title) || document.title; }
    else {
      if (observer) { observer.disconnect(); observer = null; }
      undoTree(document.body);
      document.title = 'Fumufumu';
    }
  }
  function set(lang) {
    lang = lang === 'nl' ? 'nl' : 'en';
    if (lang === cur) return;
    cur = lang;
    try { localStorage.setItem(LANG_KEY, cur); } catch (e) { /* storage not available */ }
    wear();
    syncButtons();
  }

  // the two flags, at the top of Options
  var row = document.createElement('div');
  row.className = 'option option-theme option-lang';
  row.innerHTML = '<span class="option-title">Language</span>';
  var btns = document.createElement('span');
  btns.className = 'theme-btns lang-btns';
  LANGS.forEach(function (l) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'pill-btn lang-flag'; b.dataset.lang = l[0];
    b.setAttribute('aria-label', l[2]); b.title = l[2];
    b.setAttribute('data-notr', '');
    b.appendChild(emojiImg(l[1], ''));
    b.addEventListener('click', function () { sound('pick'); set(l[0]); });
    btns.appendChild(b);
  });
  row.appendChild(btns);
  optionsList.prepend(row);
  function syncButtons() { btns.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === cur)); }); }
  syncButtons();
  if (cur === 'nl') wear();

  return {
    /** @returns {string} 'en' or 'nl'. */ get: function () { return cur; },
    set: set, tr: tr,
    /** Looks at the page again (after something built a lot of text at once). */ refresh: function () { if (cur === 'nl') doTree(document.body); }
  };
})();
/** @param {string} en English text. @returns {string} It in the language that is picked (the same text when there is no Dutch for it). */
function T(en) { return Lang.tr(en); }
