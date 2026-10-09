/* Rules for the things you send from the phone to the PC (plain functions, no page code, tested in Node; exposes the global `Send`).
 * What you share is a link or a note. A shared page from Chrome comes as a title, some text and a url, in any mix, so `fromShare`
 * finds the link in them. The server (worker/sync/server.js) keeps the same limits. */
(function (root) {
  'use strict';

  var MAX_TEXT = 4000;
  var URL_RE = /https?:\/\/[^\s<>"']+/i;

  /** @returns {string|null} The first web address in the text (trailing punctuation left off), or null. */
  function findLink(text) {
    var m = URL_RE.exec(String(text || ''));
    return m ? m[0].replace(/[.,;:!?)\]}]+$/, '') : null;
  }
  /**
   * What to send for something typed or pasted: a link if the whole thing is one address, otherwise a note.
   * @param {string} raw
   * @returns {{kind: 'link'|'text', text: string}|null} null when there is nothing to send.
   */
  function classify(raw) {
    var text = String(raw || '').trim();
    if (!text) return null;
    var link = findLink(text);
    if (link && link === text) return { kind: 'link', text: link };
    return { kind: 'text', text: text.slice(0, MAX_TEXT) };
  }
  /**
   * What to send for something shared from another app (the share menu gives a title, text and url).
   * The link is sent if there is one; the note then keeps whatever else was shared with it.
   * @param {{title?: string, text?: string, url?: string}} p
   * @returns {{kind: 'link'|'text', text: string, note: string}|null}
   */
  function fromShare(p) {
    p = p || {};
    var link = findLink(p.url) || findLink(p.text) || findLink(p.title);
    var rest = [p.title, p.text].map(function (s) { return String(s || '').replace(URL_RE, '').replace(/\s+/g, ' ').trim(); }).filter(function (s, i, a) { return s && a.indexOf(s) === i; }).join(' - ');
    if (link) return { kind: 'link', text: link, note: rest };
    var text = rest.slice(0, MAX_TEXT);
    return text ? { kind: 'text', text: text, note: '' } : null;
  }
  /** @returns {string} The site of a link without "www.", like "bbcgoodfood.com"; the text itself if it is not an address. */
  function domain(url) {
    try { return new URL(url).hostname.replace(/^www\./i, ''); } catch (e) { return String(url || ''); }
  }
  /**
   * How a received message is shown: an emoji, a short title and a line of detail.
   * @param {{kind: string, text: string}} msg
   */
  function preview(msg) {
    if (msg.kind === 'link') {
      var path = '';
      try { var u = new URL(msg.text); path = (u.pathname + u.search).replace(/^\/$/, ''); } catch (e) { path = ''; }
      return { icon: '🔗', title: domain(msg.text), detail: path.slice(0, 80) };
    }
    var lines = String(msg.text || '').split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    return { icon: '📝', title: (lines[0] || '').slice(0, 60), detail: (lines.slice(1).join(' ') || '').slice(0, 80) };
  }
  /** @returns {boolean} Whether an address is safe to open from the desktop app (a plain web link). */
  function safeToOpen(url) { return /^https?:\/\/[^\s]+$/i.test(String(url || '')); }

  root.Send = { MAX_TEXT: MAX_TEXT, findLink: findLink, classify: classify, fromShare: fromShare, domain: domain, preview: preview, safeToOpen: safeToOpen };
})(typeof globalThis !== 'undefined' ? globalThis : this);
