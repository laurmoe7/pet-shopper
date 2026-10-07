// The sync server: accounts by recovery code, joining documents, storage (in memory and in a real SQL database).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { Sync, PetLogic: L } = require('./load.js');
require('../worker/sync/server.js');
const S = globalThis.SyncServer;
const T = Date.UTC(2026, 9, 12, 12);

/** A store that lives in memory, with the same rules as the D1 one. */
function memoryStore() {
  const rows = new Map();
  return {
    rows,
    async get(id) { const r = rows.get(id); return r ? { body: r.body, rev: r.rev } : null; },
    async create(id) { if (rows.has(id)) return false; rows.set(id, { body: null, rev: 0 }); return true; },
    async put(id, body, rev) { const r = rows.get(id); if (!r || r.rev !== rev) return false; r.body = body; r.rev++; return true; },
    async remove(id) { rows.delete(id); }
  };
}
async function call(store, method, p, code, body, now) {
  const headers = {};
  if (code) headers.Authorization = 'Bearer ' + code;
  const res = await S.handle(new Request('https://x.test' + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), store, now || T);
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}
async function signUp(store) { return (await call(store, 'POST', '/v1/account')).json.code; }
function phone(device, items) {
  const s = L.parseState(null, (() => { let n = 1; return () => String(n++); })());
  s.sync.device = device;
  s.items = items.map((t, i) => L.createItem(t, {}, 'i' + i + '-' + device, T));
  s.sync.items = {};   // the sample list that comes with a fresh state is not part of these tests
  return s;
}

test('codes are 25 symbols in five groups, and cleaning forgives dashes, spaces and small letters', () => {
  const code = S.newCode();
  assert.match(code, /^([A-HJKMNP-Z2-9]{5}-){4}[A-HJKMNP-Z2-9]{5}$/);
  assert.equal(S.cleanCode(code.toLowerCase().replace(/-/g, ' ')), code.replace(/-/g, ''));
  assert.equal(S.cleanCode('too short'), null);
  assert.equal(S.cleanCode('0'.repeat(25)), null);
  assert.notEqual(S.newCode(), S.newCode());
});

test('making an account gives a code, and only its hash is stored', async () => {
  const store = memoryStore();
  const code = await signUp(store);
  assert.equal(store.rows.size, 1);
  const [id] = [...store.rows.keys()];
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.ok(!id.includes(S.cleanCode(code)));
  assert.equal(id, await S.accountId(S.cleanCode(code)));
});

test('a wrong, missing or unknown code is refused the same way', async () => {
  const store = memoryStore();
  await signUp(store);
  for (const c of [null, 'nonsense', S.newCode()]) {
    const r = await call(store, 'GET', '/v1/doc', c);
    assert.equal(r.status, 401);
  }
  assert.equal((await call(store, 'POST', '/v1/sync', null, { doc: {} })).status, 401);
});

test('a new account has no document, and a synced one comes back the same', async () => {
  const store = memoryStore(), code = await signUp(store);
  assert.deepEqual((await call(store, 'GET', '/v1/doc', code)).json, { doc: null, rev: 0 });
  const a = phone('devicea', ['Milk', 'Eggs']);
  const r = await call(store, 'POST', '/v1/sync', code, { doc: Sync.snapshot(a, T) });
  assert.equal(r.status, 200);
  assert.equal(r.json.rev, 1);
  assert.equal(Object.keys(r.json.doc.items).length, 2);
  const again = await call(store, 'GET', '/v1/doc', code);
  assert.deepEqual(again.json.doc, r.json.doc);
});

test('two phones end up with the same list, whoever syncs first', async () => {
  const store = memoryStore(), code = await signUp(store);
  const a = phone('devicea', ['Milk']), b = phone('deviceb', ['Bread']);
  const ra = await call(store, 'POST', '/v1/sync', code, { doc: Sync.snapshot(a, T) });
  const rb = await call(store, 'POST', '/v1/sync', code, { doc: Sync.snapshot(b, T + 1000) });
  Sync.apply(b, rb.json.doc);
  Sync.apply(a, (await call(store, 'POST', '/v1/sync', code, { doc: Sync.snapshot(a, T + 2000) })).json.doc);
  const names = (s) => s.items.map((i) => i.text).sort();
  assert.deepEqual(names(a), names(b));
  assert.ok(names(a).includes('Milk') && names(a).includes('Bread'));
  assert.equal(ra.json.rev + 1, rb.json.rev);
});

test('syncing something the server already has changes nothing and does not count as a write', async () => {
  const store = memoryStore(), code = await signUp(store);
  const doc = Sync.snapshot(phone('devicea', ['Milk']), T);
  const first = await call(store, 'POST', '/v1/sync', code, { doc });
  const second = await call(store, 'POST', '/v1/sync', code, { doc });
  assert.equal(second.json.rev, first.json.rev);
  assert.deepEqual(second.json.doc, first.json.doc);
});

test('a removed item is passed on as a removed marker', async () => {
  const store = memoryStore(), code = await signUp(store);
  const a = phone('devicea', ['Milk']);
  await call(store, 'POST', '/v1/sync', code, { doc: Sync.snapshot(a, T) });
  a.items = [];
  const r = await call(store, 'POST', '/v1/sync', code, { doc: Sync.snapshot(a, T + 1000) });
  assert.ok(Object.values(r.json.doc.items).every((x) => x.del));
});

test('markers older than 30 days are dropped when the server stores the result', async () => {
  const store = memoryStore(), code = await signUp(store);
  const a = phone('devicea', ['Milk']);
  await call(store, 'POST', '/v1/sync', code, { doc: Sync.snapshot(a, T) });
  a.items = [];
  await call(store, 'POST', '/v1/sync', code, { doc: Sync.snapshot(a, T + 1000) });
  const later = await call(store, 'POST', '/v1/sync', code, { doc: { v: 1, items: {}, fields: {}, counters: {} } }, T + 31 * 86400000);
  assert.equal(Object.keys(later.json.doc.items).length, 0);
});

test('changes dated far in the future are pulled back', async () => {
  const store = memoryStore(), code = await signUp(store);
  const a = phone('devicea', ['Milk']);
  const doc = Sync.snapshot(a, T + 400 * 86400000);
  const r = await call(store, 'POST', '/v1/sync', code, { doc });
  for (const rec of Object.values(r.json.doc.items).concat(Object.values(r.json.doc.fields))) assert.ok(rec.at <= T + S.FUTURE_MS);
});

test('bad requests are refused', async () => {
  const store = memoryStore(), code = await signUp(store);
  assert.equal((await call(store, 'POST', '/v1/sync', code, { nope: 1 })).status, 400);
  assert.equal((await call(store, 'POST', '/v1/sync', code, { doc: [] })).status, 400);
  const res = await S.handle(new Request('https://x.test/v1/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + code }, body: '{broken' }), store, T);
  assert.equal(res.status, 400);
  const items = {};
  for (let i = 0; i <= S.MAX_ITEMS; i++) items['x' + i] = { at: 1, by: 'a', list: 'shop', del: 1 };
  assert.equal((await call(store, 'POST', '/v1/sync', code, { doc: { items } })).status, 413);
  assert.equal((await call(store, 'GET', '/v1/nothing', code)).status, 404);
  assert.equal((await call(store, 'GET', '/v1/sync', code)).status, 405);
});

test('a damaged document from a device cannot spoil what is stored', async () => {
  const store = memoryStore(), code = await signUp(store);
  const a = phone('devicea', ['Milk']);
  await call(store, 'POST', '/v1/sync', code, { doc: Sync.snapshot(a, T) });
  const r = await call(store, 'POST', '/v1/sync', code, { doc: { items: { z: 5, y: { at: 'soon' }, w: { at: 1, by: 'q', list: 'todo', item: { id: 'w' } } }, fields: 7, counters: { stamps: 'lots' } } });
  assert.equal(r.status, 200);
  assert.equal(Object.keys(r.json.doc.items).length, 1);
});

test('deleting the account removes everything', async () => {
  const store = memoryStore(), code = await signUp(store);
  await call(store, 'POST', '/v1/sync', code, { doc: Sync.snapshot(phone('devicea', ['Milk']), T) });
  assert.deepEqual((await call(store, 'DELETE', '/v1/account', code)).json, { deleted: true });
  assert.equal(store.rows.size, 0);
  assert.equal((await call(store, 'GET', '/v1/doc', code)).status, 401);
});

test('two writes at the same moment are both kept', async () => {
  const store = memoryStore(), code = await signUp(store);
  const slow = { ...store };
  let raced = false;
  slow.put = async function (id, body, rev, now) {   // another device sneaks in just before the first write
    if (!raced) {
      raced = true;
      const other = Sync.snapshot(phone('deviceb', ['Bread']), T + 5);
      await store.put(id, JSON.stringify(Sync.merge(null, other)), rev, now);
    }
    return store.put(id, body, rev, now);
  };
  const r = await call(slow, 'POST', '/v1/sync', code, { doc: Sync.snapshot(phone('devicea', ['Milk']), T) });
  assert.equal(r.status, 200);
  const texts = Object.values(r.json.doc.items).map((x) => x.item.text).sort();
  assert.deepEqual(texts, ['Bread', 'Milk']);
});

test('answers cross-origin requests and never caches', async () => {
  const store = memoryStore();
  const pre = await S.handle(new Request('https://x.test/v1/sync', { method: 'OPTIONS' }), store, T);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), '*');
  const res = await S.handle(new Request('https://x.test/v1/health'), store, T);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('the bundled worker file is up to date', () => {
  const { build } = require('../tools/build-worker.js');
  const file = fs.readFileSync(path.join(__dirname, '../worker/sync/dist/worker.js'), 'utf8');
  assert.equal(file, build(), 'run: npm run build:worker');
});

// the D1 code against a real SQL database (Node 22's built-in SQLite), skipped where that is missing
let sqlite = null;
try { sqlite = require('node:sqlite'); } catch (e) { /* older Node */ }
test('the D1 store works against real SQL', { skip: !sqlite }, async () => {
  const db = new sqlite.DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, '../worker/sync/schema.sql'), 'utf8'));
  const d1 = { prepare(sql) { const st = db.prepare(sql); return { bind(...a) { return {
    async first() { return st.get(...a) || null; },
    async run() { return { meta: { changes: Number(st.run(...a).changes) } }; } }; } }; } };
  const store = S.d1Store(d1);
  const code = await signUp(store);
  const a = phone('devicea', ['Milk']);
  const r = await call(store, 'POST', '/v1/sync', code, { doc: Sync.snapshot(a, T) });
  assert.equal(r.json.rev, 1);
  assert.equal((await call(store, 'GET', '/v1/doc', code)).json.doc.items['i0-devicea'].item.text, 'Milk');
  const id = await S.accountId(S.cleanCode(code));
  assert.equal(await store.create(id, T), false);              // taken
  assert.equal(await store.put(id, '{}', 0, T), false);        // stale revision
  assert.equal(await store.put(id, '{}', 1, T), true);
  await call(store, 'DELETE', '/v1/account', code);
  assert.equal(await store.get(id), null);
});
