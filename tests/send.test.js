// What you send from the phone to the PC: links and notes (send.js).
const test = require('node:test');
const assert = require('node:assert/strict');
require('./load.js');
require('../send.js');
const S = globalThis.Send;

test('one web address on its own is a link; anything else is a note', () => {
  assert.deepEqual(S.classify('  https://www.bbcgoodfood.com/recipes/easy-pancakes  '), { kind: 'link', text: 'https://www.bbcgoodfood.com/recipes/easy-pancakes' });
  assert.deepEqual(S.classify('see https://example.com later'), { kind: 'text', text: 'see https://example.com later' });
  assert.deepEqual(S.classify('buy oat milk'), { kind: 'text', text: 'buy oat milk' });
  assert.equal(S.classify('   '), null);
  assert.equal(S.classify(undefined), null);
  assert.equal(S.classify('x'.repeat(S.MAX_TEXT + 50)).text.length, S.MAX_TEXT);
});

test('a shared page: the link is found whichever field holds it, and the title stays as a note', () => {
  assert.deepEqual(S.fromShare({ title: 'Easy pancakes', text: 'https://example.com/p', url: '' }), { kind: 'link', text: 'https://example.com/p', note: 'Easy pancakes' });
  assert.deepEqual(S.fromShare({ title: 'Easy pancakes', url: 'https://example.com/p' }), { kind: 'link', text: 'https://example.com/p', note: 'Easy pancakes' });
  assert.deepEqual(S.fromShare({ text: 'Look at this https://example.com/p, so good!' }), { kind: 'link', text: 'https://example.com/p', note: 'Look at this so good!' });
  assert.deepEqual(S.fromShare({ title: 'Same', text: 'Same' }), { kind: 'text', text: 'Same', note: '' });
  assert.equal(S.fromShare({}), null);
  assert.equal(S.fromShare({ url: 'not a link' }), null);
});

test('trailing punctuation is not part of a link', () => {
  assert.equal(S.findLink('go to https://example.com/a.'), 'https://example.com/a');
  assert.equal(S.findLink('(https://example.com/a)'), 'https://example.com/a');
  assert.equal(S.findLink('no link here'), null);
});

test('a received message is shown with a picture, a title and a line of detail', () => {
  assert.deepEqual(S.preview({ kind: 'link', text: 'https://www.bbcgoodfood.com/recipes/easy-pancakes?x=1' }), { icon: '🔗', title: 'bbcgoodfood.com', detail: '/recipes/easy-pancakes?x=1' });
  assert.deepEqual(S.preview({ kind: 'text', text: 'Call the plumber\n0612345678\nbefore 5' }), { icon: '📝', title: 'Call the plumber', detail: '0612345678 before 5' });
  assert.equal(S.preview({ kind: 'link', text: 'https://example.com/' }).detail, '');
});

test('only plain web links are opened', () => {
  assert.ok(S.safeToOpen('https://example.com/x'));
  assert.ok(S.safeToOpen('http://localhost:8080/'));
  for (const bad of ['javascript:alert(1)', 'file:///c:/secret', 'ftp://x.com', 'https://a.com/two words', '', null]) assert.ok(!S.safeToOpen(bad), String(bad));
});

test('the emoji used for sent things exist in the emoji folder', () => {
  const fs = require('fs'), path = require('path');
  for (const e of ['🔗', '📝', '💌']) assert.ok(fs.existsSync(path.join(__dirname, '..', globalThis.Foods.emojiFile(e))), e);
});
