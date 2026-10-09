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
  let inbox = [];
  return {
    rows,
    get inbox() { return inbox; },
    async inboxList(acct, to, now, device) {
      inbox = inbox.filter((m) => now - m.at <= S.INBOX_TTL_MS);
      return inbox.filter((m) => m.acct === acct && (device ? m.from !== device : m.to === to)).sort((a, b) => a.at - b.at).map((m) => ({ id: m.id, at: m.at, kind: m.kind, text: m.text, from: m.from }));
    },
    async inboxAdd(acct, m) {
      inbox.push({ ...m, acct });
      const drop = new Set(inbox.filter((x) => x.acct === acct).sort((a, b) => b.at - a.at).slice(S.INBOX_MAX).map((x) => x.id));
      inbox = inbox.filter((x) => !drop.has(x.id));
    },
    async inboxRemove(acct, ids) { const n = inbox.length; inbox = inbox.filter((m) => !(m.acct === acct && ids.includes(m.id))); return n - inbox.length; },
    async get(id) { const r = rows.get(id); return r ? { body: r.body, rev: r.rev } : null; },
    async create(id) { if (rows.has(id)) return false; rows.set(id, { body: null, rev: 0 }); return true; },
    async put(id, body, rev) { const r = rows.get(id); if (!r || r.rev !== rev) return false; r.body = body; r.rev++; return true; },
    async remove(id) { rows.delete(id); inbox = inbox.filter((m) => m.acct !== id); },
    hits: new Map(),
    async hit(key, hour) { const k = key + hour; this.hits.set(k, (this.hits.get(k) || 0) + 1); return this.hits.get(k); }
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
    async all() { return { results: st.all(...a) }; },
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

test('sign-ups are limited per connection per hour, and the next hour starts again', async () => {
  const store = memoryStore();
  for (let i = 0; i < S.SIGNUPS_PER_HOUR; i++) assert.equal((await call(store, 'POST', '/v1/account')).status, 201);
  const refused = await call(store, 'POST', '/v1/account');
  assert.equal(refused.status, 429);
  assert.match(refused.json.error, /Try again/);
  assert.equal(store.rows.size, S.SIGNUPS_PER_HOUR);
  assert.equal((await call(store, 'POST', '/v1/account', null, undefined, T + 3600000)).status, 201);
  // syncing an existing account is never limited
  const code = await signUp(memoryStore());
  assert.ok(code);
});

test('the limit counts in the real SQL table too, and a missing table does not break sign-up', { skip: !sqlite }, async () => {
  const db = new sqlite.DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, '../worker/sync/schema.sql'), 'utf8'));
  const wrap = (db) => ({ prepare(sql) { const st = db.prepare(sql); return { bind(...a) { return {
    async first() { return st.get(...a) || null; },
    async all() { return { results: st.all(...a) }; },
    async run() { return { meta: { changes: Number(st.run(...a).changes) } }; } }; } }; } });
  const store = S.d1Store(wrap(db));
  assert.deepEqual([await store.hit('k', 5), await store.hit('k', 5), await store.hit('other', 5)], [1, 2, 1]);
  assert.equal(await store.hit('k', 6), 1);                         // a new hour starts again
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM limits').get().c, 1);   // the old hour was forgotten
  const old = new sqlite.DatabaseSync(':memory:');                  // a database from before the limit existed
  old.exec('CREATE TABLE docs (id TEXT PRIMARY KEY, body TEXT, rev INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, updated INTEGER NOT NULL)');
  const oldStore = S.d1Store(wrap(old));
  assert.equal(await oldStore.hit('k', 5), 0);
  assert.equal((await call(oldStore, 'POST', '/v1/account')).status, 201);
});

// ---------- the inbox: a link or a note from the phone to the PC ----------
const send = (store, code, body, now) => call(store, 'POST', '/v1/inbox', code, body, now);
const waitingFor = async (store, code, device, now) => (await call(store, 'GET', '/v1/inbox?device=' + device, code, undefined, now)).json.messages;
const waiting = async (store, code, to, now) => (await call(store, 'GET', '/v1/inbox?to=' + (to || 'pc'), code, undefined, now)).json.messages;

test('a link sent from the phone waits for the PC until it is read', async () => {
  const store = memoryStore(), code = await signUp(store);
  assert.deepEqual(await waiting(store, code), []);
  const r = await send(store, code, { to: 'pc', kind: 'link', text: 'https://example.com/a?b=1', from: 'phone1' });
  assert.equal(r.status, 201);
  assert.match(r.json.id, /^[0-9a-f]{16}$/);
  const list = await waiting(store, code);
  assert.equal(list.length, 1);
  assert.deepEqual([list[0].kind, list[0].text, list[0].from, list[0].id], ['link', 'https://example.com/a?b=1', 'phone1', r.json.id]);
  assert.equal((await call(store, 'POST', '/v1/inbox/ack', code, { ids: [r.json.id] })).json.deleted, 1);
  assert.deepEqual(await waiting(store, code), []);
  assert.equal((await call(store, 'POST', '/v1/inbox/ack', code, { ids: [r.json.id, 5, null] })).json.deleted, 0);   // nothing left, junk ignored
});

test('messages for the PC and for the phone stay apart, and so do two accounts', async () => {
  const store = memoryStore(), mine = await signUp(store), other = await signUp(store);
  await send(store, mine, { to: 'pc', kind: 'text', text: 'for the PC' });
  await send(store, mine, { to: 'phone', kind: 'text', text: 'for the phone' });
  assert.deepEqual((await waiting(store, mine, 'pc')).map((m) => m.text), ['for the PC']);
  assert.deepEqual((await waiting(store, mine, 'phone')).map((m) => m.text), ['for the phone']);
  assert.deepEqual(await waiting(store, other, 'pc'), []);
  assert.equal((await call(store, 'GET', '/v1/inbox?to=tablet', mine)).status, 400);
});

test('messages come out oldest first and the oldest are dropped past 50', async () => {
  const store = memoryStore(), code = await signUp(store);
  for (let i = 0; i < S.INBOX_MAX + 5; i++) await send(store, code, { to: 'pc', kind: 'text', text: 'm' + i }, T + i * 1000);
  const list = await waiting(store, code, 'pc', T + 100000);
  assert.equal(list.length, S.INBOX_MAX);
  assert.equal(list[0].text, 'm5');
  assert.equal(list[list.length - 1].text, 'm' + (S.INBOX_MAX + 4));
});

test('an unread message is deleted after a day', async () => {
  const store = memoryStore(), code = await signUp(store);
  await send(store, code, { to: 'pc', kind: 'text', text: 'old news' }, T);
  assert.equal((await waiting(store, code, 'pc', T + S.INBOX_TTL_MS - 1000)).length, 1);
  assert.equal((await waiting(store, code, 'pc', T + S.INBOX_TTL_MS + 1000)).length, 0);
});

test('bad messages are refused', async () => {
  const store = memoryStore(), code = await signUp(store);
  const bad = async (body, status) => assert.equal((await send(store, code, body)).status, status, JSON.stringify(body).slice(0, 60));
  await bad({ to: 'tablet', kind: 'text', text: 'x' }, 400);
  await bad({ to: 'pc', kind: 'image', text: 'x' }, 400);
  await bad({ to: 'pc', kind: 'text', text: '   ' }, 400);
  await bad({ to: 'pc', kind: 'text' }, 400);
  await bad({ to: 'pc', kind: 'link', text: 'javascript:alert(1)' }, 400);
  await bad({ to: 'pc', kind: 'link', text: 'https://a.com/two words' }, 400);
  await bad({ to: 'pc', kind: 'text', text: 'x'.repeat(S.INBOX_TEXT_MAX + 1) }, 413);
  const res = await S.handle(new Request('https://x.test/v1/inbox', { method: 'POST', headers: { Authorization: 'Bearer ' + code }, body: '{nope' }), store, T);
  assert.equal(res.status, 400);
  assert.equal((await send(store, null, { to: 'pc', kind: 'text', text: 'x' })).status, 401);
  assert.equal((await call(store, 'GET', '/v1/inbox', 'WRONG')).status, 401);
  assert.equal((await send(store, code, { to: 'pc', kind: 'link', text: 'http://localhost:8080/x' })).status, 201);
});

test('deleting the account deletes its messages', async () => {
  const store = memoryStore(), code = await signUp(store);
  await send(store, code, { to: 'pc', kind: 'text', text: 'bye' });
  await call(store, 'DELETE', '/v1/account', code);
  assert.equal(store.inbox.length, 0);
});

test('the inbox works in the real SQL tables, and a database without them answers 503 instead of breaking', { skip: !sqlite }, async () => {
  const wrap = (db) => ({ prepare(sql) { const st = db.prepare(sql); return { bind(...a) { return {
    async first() { return st.get(...a) || null; },
    async all() { return { results: st.all(...a) }; },
    async run() { return { meta: { changes: Number(st.run(...a).changes) } }; } }; } };
  }, async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; } });   // like D1's batch: several statements, one trip
  const db = new sqlite.DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, '../worker/sync/schema.sql'), 'utf8'));
  const store = S.d1Store(wrap(db)), code = await signUp(store);
  const r = await send(store, code, { to: 'pc', kind: 'link', text: 'https://example.com/x' }, T);
  assert.equal(r.status, 201);
  for (let i = 0; i < S.INBOX_MAX + 3; i++) await send(store, code, { to: 'pc', kind: 'text', text: 'n' + i }, T + 1000 + i);
  const list = await waiting(store, code, 'pc', T + 5000);
  assert.equal(list.length, S.INBOX_MAX);
  assert.equal(list[list.length - 1].text, 'n' + (S.INBOX_MAX + 2));
  assert.equal((await call(store, 'POST', '/v1/inbox/ack', code, { ids: [list[0].id, list[1].id] }, T + 5000)).json.deleted, 2);
  assert.equal((await waiting(store, code, 'pc', T + 5000)).length, S.INBOX_MAX - 2);
  assert.equal((await waiting(store, code, 'pc', T + S.INBOX_TTL_MS + 100000)).length, 0);   // a day later they are gone
  // by device: another device sees them, the one that left them does not
  await send(store, code, { kind: 'text', text: 'by device', from: 'abc123' }, T + 6000);
  assert.ok((await waitingFor(store, code, 'zzz', T + 7000)).some((m) => m.text === 'by device'));
  assert.ok(!(await waitingFor(store, code, 'abc123', T + 7000)).some((m) => m.text === 'by device'));
  assert.equal((await call(store, 'POST', '/v1/inbox/ack', code, { ids: [] }, T + 7000)).json.deleted, 0);
  await call(store, 'DELETE', '/v1/account', code);
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM inbox').get().c, 0);
  // an older database without the inbox table
  const old = new sqlite.DatabaseSync(':memory:');
  old.exec('CREATE TABLE docs (id TEXT PRIMARY KEY, body TEXT, rev INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, updated INTEGER NOT NULL)');
  const oldStore = S.d1Store(wrap(old)), oldCode = await signUp(oldStore);
  assert.equal((await send(oldStore, oldCode, { to: 'pc', kind: 'text', text: 'x' })).status, 503);
  assert.equal((await call(oldStore, 'POST', '/v1/sync', oldCode, { doc: { v: 1, items: {}, fields: {}, counters: {} } })).status, 200);   // everything else still works
});

test('a device gets what its other devices left, never its own, and no destination is needed', async () => {
  const store = memoryStore(), code = await signUp(store);
  assert.equal((await send(store, code, { kind: 'link', text: 'https://example.com/a', from: 'phone1' }, T)).status, 201);   // no "to"
  await send(store, code, { to: 'any', kind: 'text', text: 'from the pc', from: 'pc01' }, T + 1000);
  const pc = await waitingFor(store, code, 'pc01', T + 2000), phone = await waitingFor(store, code, 'phone1', T + 2000);
  assert.deepEqual(pc.map((m) => m.text), ['https://example.com/a']);
  assert.deepEqual(phone.map((m) => m.text), ['from the pc']);
  assert.equal((await waitingFor(store, code, 'other9', T + 2000)).length, 2);   // a third device sees both
  // a message from an earlier build (to: pc) still reaches the PC, and the device filter still keeps it from the phone that sent it
  await send(store, code, { to: 'pc', kind: 'text', text: 'old style', from: 'phone1' }, T + 3000);
  assert.ok((await waitingFor(store, code, 'pc01', T + 4000)).some((m) => m.text === 'old style'));
  assert.ok(!(await waitingFor(store, code, 'phone1', T + 4000)).some((m) => m.text === 'old style'));
  assert.equal((await waiting(store, code, 'pc', T + 4000)).length, 1);   // the earlier way of asking still works
  assert.equal((await send(store, code, { to: 'tablet', kind: 'text', text: 'x' }, T)).status, 400);
});
