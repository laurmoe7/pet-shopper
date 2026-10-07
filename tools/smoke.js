// Opens the app in a phone-sized Chrome and fails on any page error, so a broken page never gets deployed.
// Run: node tools/smoke.js   (needs playwright; CI installs it, it is not a project dependency)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const root = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

async function run() {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const problems = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push('page error: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') problems.push('console error: ' + m.text()); });
    page.on('requestfailed', (r) => problems.push('failed to load: ' + r.url()));

    await page.goto(base, { waitUntil: 'load' });
    await page.waitForTimeout(4500);   // past the start-up chatter (dueNag runs at 3.8 s)

    if (!(await page.locator('#pet').isVisible())) problems.push('Nibble is not visible');

    await page.fill('#addInput', 'smoke test apple');
    await page.press('#addInput', 'Enter');
    await page.waitForTimeout(500);
    if ((await page.locator('#todo .item').count()) < 1) problems.push('an added item did not appear in the list');

    await page.locator('#todo .item').first().locator('input[type=checkbox], .check, button').first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(2500);   // let the eating animation play out
  } finally {
    await browser.close();
    server.close();
  }
  if (problems.length) {
    console.error('Smoke test failed:\n- ' + [...new Set(problems)].join('\n- '));
    process.exit(1);
  }
  console.log('Smoke test passed.');
}

run().catch((e) => { console.error(e); process.exit(1); });
