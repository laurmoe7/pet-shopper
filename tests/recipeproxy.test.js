'use strict';
// The recipe helper (worker/recipe-proxy.js): only the app may use it, each connection gets a few requests a minute, and only public web pages are fetched.
const test = require('node:test');
const assert = require('node:assert/strict');

const PAGE = '<html><head><script type="application/ld+json">{"@type":"Recipe","name":"Pancakes"}</script></head><body>hi</body></html>';
async function helper() { return (await import('../worker/recipe-proxy.js')).default; }
function req(url, origin) { return new Request('https://helper.test/?url=' + encodeURIComponent(url), { headers: origin ? { Origin: origin } : {} }); }
function fakeFetch(fn) {
  const real = globalThis.fetch;
  globalThis.fetch = async (href) => fn(href);
  return () => { globalThis.fetch = real; };
}
const okPage = (href) => { const r = new Response(PAGE, { status: 200, headers: { 'Content-Type': 'text/html' } }); Object.defineProperty(r, 'url', { value: href }); return r; };

test('only the app may use the helper: no origin or another website gets 403, the app and a configured origin get the recipe', async () => {
  const H = await helper(), restore = fakeFetch(okPage);
  try {
    assert.equal((await H.fetch(req('https://example.com/recipe'), {})).status, 403);
    assert.equal((await H.fetch(req('https://example.com/recipe', 'https://evil.example'), {})).status, 403);
    const res = await H.fetch(req('https://example.com/recipe', 'https://laurmoe7.github.io'), {});
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Pancakes/);
    assert.equal((await H.fetch(req('https://example.com/recipe', 'https://preview.example'), { ALLOWED_ORIGINS: 'https://other.example, https://preview.example' })).status, 200);
    assert.equal((await H.fetch(req('https://example.com/recipe', 'http://localhost:8123'), {})).status, 200, 'a local test page may');
    assert.equal((await H.fetch(new Request('https://helper.test/', { method: 'OPTIONS' }), {})).status, 204, 'the browser\'s preflight needs no origin check');
  } finally { restore(); }
});

test('a connection that asks too often gets 429, and a local or numeric address is refused', async () => {
  const H = await helper(), restore = fakeFetch(okPage);
  try {
    const env = { LIMIT: { limit: async ({ key }) => ({ success: key !== '1.2.3.4' }) } };
    const busy = new Request('https://helper.test/?url=' + encodeURIComponent('https://example.com/r'), { headers: { Origin: 'https://laurmoe7.github.io', 'CF-Connecting-IP': '1.2.3.4' } });
    assert.equal((await H.fetch(busy, env)).status, 429);
    const fine = new Request('https://helper.test/?url=' + encodeURIComponent('https://example.com/r'), { headers: { Origin: 'https://laurmoe7.github.io', 'CF-Connecting-IP': '5.6.7.8' } });
    assert.equal((await H.fetch(fine, env)).status, 200);
    for (const bad of ['http://localhost/x', 'http://127.0.0.1/x', 'https://[::1]/x', 'ftp://example.com/x', 'https://user:pw@example.com/x', 'https://example.com:8080/x', 'https://box.internal/x']) {
      assert.equal((await H.fetch(req(bad, 'https://laurmoe7.github.io'), {})).status, 400, bad);
    }
  } finally { restore(); }
});
