// Screenshots the phone preview in a given state, to check a look without a real device (needs `npm run preview` first).
//   node tools/shot.js out.png [--size 320x250] [--html desktop-pet,al-quest] [--pet species=hamster,skin=hamster] [--eval "say('hi', 5000, true)"] [--wait 600] [--scale 2] [--clip x,y,w,h]
// --html adds classes to <html>; --pet sets data-* on #pet; --eval runs page code (the app's globals are there). Playwright is found in the global modules too.
const path = require('path');
const { execSync } = require('child_process');
function playwright() { try { return require('playwright'); } catch (e) { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const args = process.argv.slice(2);
const out = args[0];
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
if (!out) { console.error('Usage: node tools/shot.js out.png [--size WxH] [--html a,b] [--pet k=v,k=v] [--eval code] [--wait ms] [--scale n] [--clip x,y,w,h]'); process.exit(1); }
const [w, h] = opt('size', '420x800').split('x').map(Number);
(async () => {
  const browser = await playwright().chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: Number(opt('scale', 2)) });
  await page.goto('file://' + path.join(__dirname, '..', 'preview', 'index.html'));
  await page.waitForTimeout(1200);
  await page.evaluate(([html, pet, code]) => {
    if (html) document.documentElement.classList.add(...html.split(','));
    const el = document.getElementById('pet');
    if (pet) pet.split(',').forEach((kv) => { const [k, v] = kv.split('='); el.dataset[k] = v; });
    if (code) (0, eval)(code);
  }, [opt('html', ''), opt('pet', ''), opt('eval', '')]);
  await page.waitForTimeout(Number(opt('wait', 600)));
  const clip = opt('clip', '');
  await page.screenshot(clip ? { path: out, clip: (([x, y, cw, ch]) => ({ x, y, width: cw, height: ch }))(clip.split(',').map(Number)) } : { path: out });
  await browser.close();
  console.log('Saved ' + out);
})();
