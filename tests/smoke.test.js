'use strict';
// Boots the real page in Chromium and uses it like a player: adds an item, ticks it off, opens every dock sheet, Options and Developer tools, swaps to the to-do
// list, and checks that no script threw. The other tests only parse the page scripts, so a helper renamed in one file and still called from another only
// showed on the phone; here it fails. Needs Playwright (the Pages workflow installs it; locally `npm i --no-save playwright`); without it the test is skipped.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = path.join(__dirname, '..');
function playwright() {
  try { return require('playwright'); } catch (e) { /* not installed here */ }
  try { return require(path.join(execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright')); } catch (e) { return null; }
}
const pw = playwright();

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
/** Serves the repository's files, like Pages does (a file:// page has no localStorage in Chromium). */
function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, base: 'http://127.0.0.1:' + server.address().port })));
}

test('the page boots and works in Chromium', { skip: !pw && 'Playwright is not installed', timeout: 90000 }, async () => {
  const { server, base } = await serve();
  const browser = await pw.chromium.launch();
  const errors = [];   // uncaught errors and console errors from the page's own files
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => errors.push('uncaught: ' + e.message));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const url = m.location().url || '';
      if (/Failed to load resource/.test(m.text()) && !url.startsWith(base)) return;   // fonts from Google do not load in a sandbox
      errors.push('console: ' + m.text() + (url ? ' (' + url.replace(base, '') + ')' : ''));
    });
    await page.goto(base + '/index.html');
    // the loading card goes once the scripts have built the page (over http there is no service worker to wait for)
    await page.waitForSelector('#boot', { state: 'detached', timeout: 20000 });
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('booting')), false);
    assert.equal(await page.evaluate(() => Errors.fresh.length), 0, 'errors while starting: ' + await page.evaluate(() => Errors.text()));
    assert.equal(await page.evaluate(() => typeof BUILD), 'string');

    // the core loop: add an item, then tick it off and he eats it
    const before = await page.locator('#todo .item').count();
    await page.fill('#addInput', 'smoke apples');
    await page.press('#addInput', 'Enter');
    const row = page.locator('#todo .item', { hasText: 'smoke apples' });
    await row.waitFor({ timeout: 5000 });
    assert.equal(await page.locator('#todo .item').count(), before + 1);
    await row.locator('.check').click();
    await page.locator('#done .item', { hasText: 'smoke apples' }).waitFor({ timeout: 8000 });

    // every dock button opens its sheet; Options opens Developer tools
    for (const [btn, sheet] of [['dressBtn', 'dressSheet'], ['roomBtn', 'roomSheet'], ['calBtn', 'calSheet'], ['profileBtn', 'profileSheet'], ['optionsBtn', 'optionsSheet']]) {
      await page.click('#' + btn);
      await page.waitForSelector('#' + sheet + '[open]', { timeout: 5000 });
      if (sheet === 'optionsSheet') {
        assert.match(await page.textContent('#buildLabel'), /^Build \d+$/);
        await page.click('#devBtn');
        await page.waitForSelector('#devSheet[open]', { timeout: 5000 });
        assert.equal((await page.textContent('#devErrorList')).trim(), 'None.');
      }
      await page.evaluate(() => closeSheets());
    }
    // the dressing room drew its species tiles when it opened
    assert.ok(await page.evaluate(() => document.querySelectorAll('#speciesGrid .pet.mini').length) > 10);

    // the to-do list and back (once he has finished eating: switchList waits for that)
    await page.waitForFunction(() => pending === 0, null, { timeout: 15000 });
    await page.evaluate(() => switchList());
    await page.waitForFunction(() => isTodo(), null, { timeout: 5000 });
    await page.evaluate(() => switchList());
    await page.waitForFunction(() => !isTodo(), null, { timeout: 5000 });

    // the error catcher (index.html) keeps an uncaught error for Developer tools, and Clear empties it
    await page.evaluate(() => setTimeout(() => { smokeTestMissingFunction(); }, 0));
    await page.waitForFunction(() => Errors.fresh.length === 1, null, { timeout: 5000 });
    const kept = await page.evaluate(() => Errors.list());
    assert.equal(kept.length, 1);
    assert.match(kept[0].m, /smokeTestMissingFunction/);
    assert.equal(kept[0].b, await page.evaluate(() => BUILD));
    await page.click('#optionsBtn');
    assert.match(await page.textContent('#buildLabel'), /^Build \d+ · 1 error$/);
    await page.click('#devBtn');
    assert.match(await page.textContent('#devErrorList'), /smokeTestMissingFunction/);
    await page.click('#devErrClear');
    assert.equal((await page.textContent('#devErrorList')).trim(), 'None.');
    assert.equal(await page.evaluate(() => Errors.list().length), 0);
    errors.splice(errors.findIndex((e) => /smokeTestMissingFunction/.test(e)), 1);   // (that one was meant)

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});
