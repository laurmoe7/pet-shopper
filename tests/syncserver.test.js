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
  const rows = new Map(), houses = new Map(), members = new Map();
  let inbox = [];
  const people = (house) => [...members].filter(([, m]) => m.house === house).map(([acct, m]) => ({ ...m, acct })).sort((a, b) => a.joined - b.joined || (a.id < b.id ? -1 : 1));
  return {
    rows, houses, members,
    async memberOf(acct) { const m = members.get(acct); return m ? { ...m } : null; },
    async houseGet(id) { const h = houses.get(id); return h ? { ...h } : null; },
    async houseMembers(house) { return people(house).map(({ id, acct, name, joined, seen }) => ({ id, acct, name, joined, seen })); },
    async houseByInvite(invite) { const f = [...houses].find(([, h]) => h.invite === invite); return f ? f[0] : null; },
    async houseCreate(house, invite, acct, id, name, now) {
      if (houses.has(house) || members.has(acct)) return false;
      houses.set(house, { body: null, rev: 0, created: now, updated: now, owner: acct, invite });
      members.set(acct, { house, id, name, joined: now, seen: now });
      return true;
    },
    async houseJoin(house, acct, id, name, now, max) {
      if (members.has(acct)) return 'taken';
      if (!houses.has(house)) return 'gone';
      if (people(house).length >= max) return 'full';
      members.set(acct, { house, id, name, joined: now, seen: now });
      return 'ok';
    },
    async housePut(house, body, rev, now) { const h = houses.get(house); if (!h || h.rev !== rev) return false; h.body = body; h.rev++; h.updated = now; return true; },
    async houseTouch(house, now) { const h = houses.get(house); if (h) h.updated = now; },
    async houseOwner(house, acct) { const m = members.get(acct); if (!m || m.house !== house) return false; houses.get(house).owner = acct; return true; },
    async houseInvite(house, invite) { if ([...houses.values()].some((h) => h.invite === invite)) return false; houses.get(house).invite = invite; return true; },
    async houseDelete(house) { people(house).forEach((m) => members.delete(m.acct)); houses.delete(house); },
    async memberSeen(acct, name, now) { const m = members.get(acct); if (m) { m.name = name; m.seen = now; } },
    async memberRemove(acct) { members.delete(acct); },
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
    async get(id) { const r = rows.get(id); return r ? { body: r.body, rev: r.rev, updated: r.updated } : null; },
    async create(id, now) { if (rows.has(id)) return false; rows.set(id, { body: null, rev: 0, created: now, updated: now }); return true; },
    async put(id, body, rev, now) { const r = rows.get(id); if (!r || r.rev !== rev) return false; r.body = body; r.rev++; r.updated = now; return true; },
    async touch(id, now) { const r = rows.get(id); if (r) r.updated = now; },
    async purge(staleBefore, emptyBefore) {
      const gone = [...rows].filter(([, r]) => r.updated < staleBefore || (r.body === null && r.created < emptyBefore)).map(([id]) => id);
      gone.forEach((id) => rows.delete(id));
      inbox = inbox.filter((m) => !gone.includes(m.acct));
      [...houses].forEach(([id, h]) => { if (h.updated < staleBefore) houses.delete(id); });
      [...members].forEach(([acct, m]) => { if (!rows.has(acct) || !houses.has(m.house)) members.delete(acct); });
      [...houses].forEach(([id, h]) => {
        const left = people(id);
        if (!left.length) houses.delete(id); else if (!left.some((m) => m.acct === h.owner)) h.owner = left[0].acct;
      });
      return gone.length;
    },
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
  const r = await call(store, 'POST', '/v1/sync', code, { doc: { items: { z: 5, y: { at: 'soon' }, w: { at: 1, by: 'q', list: 'pantry', item: { id: 'w' } } }, fields: 7, counters: { stamps: 'lots' } } });
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

test('the stored document must fit too: a sync that would grow it past the limit is refused, and long item words are cut', async () => {
  const store = memoryStore();
  const code = await signUp(store);
  const big = { items: {}, fields: {}, counters: {} };
  for (let i = 0; i < 1500; i++) big.items['b' + i] = { at: T, by: 'dev', list: 'shop', item: { id: 'b' + i, text: 'x'.repeat(150), emoji: '\u{1F34E}', cat: 'fruit', done: false, qty: 'y'.repeat(150) } };
  let res = await call(store, 'POST', '/v1/sync', code, { doc: big });
  assert.equal(res.status, 200);
  const acct = [...store.rows.keys()][0], stored = JSON.parse((await store.get(acct)).body);
  assert.equal(stored.items.b0.item.text.length, 150);
  // the same again from another device, with other ids: the two together would not fit
  const more = { items: {}, fields: {}, counters: {} };
  for (let i = 0; i < 1500; i++) more.items['c' + i] = { at: T + 1, by: 'two', list: 'shop', item: { id: 'c' + i, text: 'x'.repeat(150), emoji: '\u{1F34E}', cat: 'fruit', done: false, qty: 'y'.repeat(150) } };
  res = await call(store, 'POST', '/v1/sync', code, { doc: more });
  assert.equal(res.status, 413);
  assert.equal(Object.keys(JSON.parse((await store.get(acct)).body).items).length, 1500, 'the stored document is unchanged');
  // a very long name is cut to 200 characters
  const long = { items: { l1: { at: T + 2, by: 'dev', list: 'shop', item: { id: 'l1', text: 'z'.repeat(5000), emoji: '\u{1F34E}', cat: 'fruit', done: false } } }, fields: {}, counters: {} };
  res = await call(store, 'POST', '/v1/sync', code, { doc: long });
  assert.equal(res.status, 200);
  assert.equal(res.json.doc.items.l1.item.text.length, 200);
});

test('the nightly purge deletes backups not changed for a year and sign-ups never used, and a sync with nothing new still counts as use', async () => {
  const store = memoryStore();
  const live = await signUp(store), idle = await signUp(store), empty = await signUp(store);
  const doc = Sync.snapshot(phone('p1', ['Milk']), T);
  assert.equal((await call(store, 'POST', '/v1/sync', live, { doc }, T)).status, 200);
  assert.equal((await call(store, 'POST', '/v1/sync', idle, { doc }, T)).status, 200);
  // ten months later the live one syncs with nothing new: that marks it as in use (once a day)
  const later = T + 300 * 24 * 3600 * 1000;
  assert.equal((await call(store, 'POST', '/v1/sync', live, { doc }, later)).status, 200);
  assert.equal([...store.rows.values()].filter((r) => r.updated === later).length, 1);
  const again = later + 3600 * 1000;
  await call(store, 'POST', '/v1/sync', live, { doc }, again);
  assert.equal([...store.rows.values()].filter((r) => r.updated === again).length, 0, 'within a day it is not written again');
  // a year and a day after the first sync: the idle backup and the unused sign-up go, the live one stays
  const purgeAt = T + S.RETENTION_MS + 24 * 3600 * 1000;
  assert.equal(await S.purge(store, purgeAt), 2);
  assert.equal((await call(store, 'GET', '/v1/doc', live, undefined, purgeAt)).status, 200);
  assert.equal((await call(store, 'GET', '/v1/doc', idle, undefined, purgeAt)).status, 401);
  assert.equal((await call(store, 'GET', '/v1/doc', empty, undefined, purgeAt)).status, 401);
  // a fresh sign-up is not purged within its first day
  const fresh = (await call(store, 'POST', '/v1/account', undefined, undefined, purgeAt)).json.code;
  assert.equal(await S.purge(store, purgeAt + 1000), 0);
  assert.equal((await call(store, 'GET', '/v1/doc', fresh, undefined, purgeAt)).status, 200);
});

test('a connection that asks too often gets 429 from the Worker entry; without the binding there is no limit', async () => {
  const env = { DB: null, LIMIT: { limit: async ({ key }) => ({ success: key !== '1.2.3.4' }) } };
  const busy = new Request('https://x.test/v1/health', { headers: { 'CF-Connecting-IP': '1.2.3.4' } });
  assert.equal((await S.worker.fetch(busy, env)).status, 429);
  assert.equal(await S.tooOften(new Request('https://x.test/v1/health', { headers: { 'CF-Connecting-IP': '5.6.7.8' } }), env), false);
  assert.equal(await S.tooOften(busy, {}), false);
});

// ---------- households: a shared shopping list, each member with their own code ----------
const sqlStore = () => {
  const db = new sqlite.DatabaseSync(':memory:');
  db.exec(fs.readFileSync(path.join(__dirname, '../worker/sync/schema.sql'), 'utf8'));
  return S.d1Store({ prepare(sql) { const st = db.prepare(sql); return { bind(...a) { return {
    async first() { return st.get(...a) || null; },
    async all() { return { results: st.all(...a) }; },
    async run() { return { meta: { changes: Number(st.run(...a).changes) } }; } }; } }; } });
};
const STORES = [['in memory', memoryStore]].concat(sqlite ? [['in real SQL', sqlStore]] : []);
/** A household request; a sync says which membership it is from, as the app does (unless the test sends its own `me`). */
const house = async (store, code, p, body, now) => {
  if (p === '/sync' && body && !('me' in body) && S.cleanCode(code || '')) { const m = await store.memberOf(await S.accountId(S.cleanCode(code))); if (m) body = { ...body, me: m.id }; }
  return call(store, body === undefined && p === '' ? 'GET' : 'POST', '/v1/household' + p, code, body, now);
};
const shared = (id, text, at, by, extra) => ({ at, by, list: 'shared', item: { id, text, emoji: '\u{1F34E}', cat: 'fruit', done: false, ...extra } });
const names = (r) => r.json.members.map((m) => m.name);

for (const [where, make] of STORES) {
  test('a household is made by its owner and joined with the invite code, ' + where, async () => {
    const store = make(), sam = await signUp(store), kim = await signUp(store);
    assert.deepEqual((await house(store, sam, '')).json, { household: null });
    const made = await house(store, sam, '', { name: '  Sam\n ' });
    assert.equal(made.status, 201);
    assert.equal(made.json.owner, true);
    assert.match(made.json.invite, /^([A-HJKMNP-Z2-9]{5}-){4}[A-HJKMNP-Z2-9]{5}$/);
    assert.deepEqual(names(made), ['Sam']);
    assert.equal(made.json.members[0].me, true);
    assert.equal(made.json.doc, null);
    assert.equal((await house(store, kim, '/join', { invite: S.newCode(), name: 'Kim' })).status, 404);
    const joined = await house(store, kim, '/join', { invite: made.json.invite.toLowerCase().replace(/-/g, ' '), name: 'Kim' }, T + 1000);
    assert.equal(joined.status, 200);
    assert.equal(joined.json.owner, false);
    assert.equal(joined.json.invite, undefined, 'only the owner sees the invite code');
    assert.deepEqual(names(joined), ['Sam', 'Kim']);
    assert.deepEqual(joined.json.members.map((m) => [m.owner, m.me]), [[true, false], [false, true]]);
    // one household per account
    assert.equal((await house(store, kim, '', { name: 'Kim' })).status, 409);
    assert.equal((await house(store, kim, '/join', { invite: made.json.invite })).status, 409);
    // a member's own code is never shown to the others, and the household needs a real account
    assert.ok(!JSON.stringify(joined.json).includes(await S.accountId(S.cleanCode(sam))));
    assert.equal((await house(store, S.newCode(), '')).status, 401);
  });

  test('the shared list syncs between members and carries nothing personal, ' + where, async () => {
    const store = make(), sam = await signUp(store), kim = await signUp(store), alone = await signUp(store);
    const invite = (await house(store, sam, '', { name: 'Sam' })).json.invite;
    await house(store, kim, '/join', { invite, name: 'Kim' });
    const sent = { items: { a: shared('a', 'Milk', T, 'sam1'), own: { at: T, by: 'sam1', list: 'shop', item: { id: 'own', text: 'Secret', emoji: '\u{1F34E}', cat: 'fruit', done: false } }, t: { at: T, by: 'sam1', list: 'todo', item: { id: 't', text: 'Dentist', emoji: '\u{1F9B7}', cat: 'task', done: false } } },
      fields: { 'pet.name': { at: T, by: 'sam1', value: 'Fumu' } }, counters: { tastes: { milk: 3 } } };
    const r = await house(store, sam, '/sync', { doc: sent });
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.json.doc), ['v', 'items']);
    assert.deepEqual(Object.keys(r.json.doc.items), ['a']);
    assert.equal(r.json.rev, 1);
    const k = await house(store, kim, '/sync', { doc: { items: { b: shared('b', 'Bread', T + 1, 'kim1') } } }, T + 2000);
    assert.deepEqual(Object.keys(k.json.doc.items).sort(), ['a', 'b']);
    // a tick from Kim wins over Sam's older copy, and Sam sees it
    await house(store, kim, '/sync', { doc: { items: { a: shared('a', 'Milk', T + 5, 'kim1', { done: true, doneBy: 'Kim' }) } } }, T + 3000);
    const back = await house(store, sam, '/sync', { doc: sent }, T + 4000);
    assert.equal(back.json.doc.items.a.item.done, true);
    assert.equal(back.json.doc.items.a.item.doneBy, 'Kim');
    // the personal backups never saw the shared list, and someone outside the household gets nothing
    assert.equal((await call(store, 'GET', '/v1/doc', kim)).json.doc, null);
    assert.equal((await house(store, alone, '/sync', { doc: sent })).status, 404);
    assert.equal((await house(store, sam, '/sync', { nope: 1 })).status, 400);
  });

  test('syncing notes who was there, and a name sent changes the member name, ' + where, async () => {
    const store = make(), sam = await signUp(store);
    await house(store, sam, '', { name: '' }, T);
    let r = await house(store, sam, '/sync', { doc: {}, name: 'Samantha' }, T + 10);
    assert.deepEqual(names(r), ['Samantha']);
    r = await house(store, sam, '/sync', { doc: {} }, T + 120000);
    assert.equal((await store.memberOf(await S.accountId(S.cleanCode(sam)))).seen, T + 120000);
    assert.deepEqual(names(r), ['Samantha'], 'no name sent keeps the old one');
    assert.deepEqual(Object.keys(r.json.members[0]).sort(), ['id', 'me', 'name', 'owner'], 'nobody is told when the others joined or last synced');
    assert.equal(S.cleanName('x'.repeat(100)).length, S.NAME_MAX);
    assert.equal(S.cleanName('a\u0000b c'), 'a b c');
    assert.equal(S.cleanName(42), '');
  });

  test('the owner removes members, hands over and makes a new invite code; nobody else can, ' + where, async () => {
    const store = make(), sam = await signUp(store), kim = await signUp(store), lou = await signUp(store), late = await signUp(store);
    const invite = (await house(store, sam, '', { name: 'Sam' })).json.invite;
    await house(store, kim, '/join', { invite, name: 'Kim' }, T + 1);
    const all = await house(store, lou, '/join', { invite, name: 'Lou' }, T + 2);
    const [, kimId, louId] = all.json.members.map((m) => m.id);
    assert.equal((await house(store, kim, '/remove', { member: louId })).status, 403);
    assert.equal((await house(store, kim, '/invite', {})).status, 403);
    assert.equal((await house(store, sam, '/remove', { member: 'nobody' })).status, 404);
    assert.equal((await house(store, sam, '/remove', { member: all.json.members[0].id })).status, 400);
    // removing works at once: Lou can no longer sync
    const after = await house(store, sam, '/remove', { member: louId });
    assert.deepEqual(names(after), ['Sam', 'Kim']);
    assert.equal((await house(store, lou, '/sync', { doc: {} })).status, 404);
    assert.deepEqual((await house(store, lou, '')).json, { household: null });
    // a new invite code: the old one stops working
    const fresh = (await house(store, sam, '/invite', {})).json.invite;
    assert.notEqual(fresh, invite);
    assert.equal((await house(store, late, '/join', { invite })).status, 404);
    assert.equal((await house(store, late, '/join', { invite: fresh, name: 'Late' })).status, 200);
    // handing over: Kim becomes the owner and sees the invite, Sam does not any more
    const handed = await house(store, sam, '/owner', { member: kimId });
    assert.equal(handed.json.owner, false);
    assert.equal(handed.json.invite, undefined);
    const kimView = await house(store, kim, '');
    assert.equal(kimView.json.owner, true);
    assert.equal(kimView.json.invite, fresh);
  });

  test('leaving: the first to join takes over from the owner, and the last one out deletes the household, ' + where, async () => {
    const store = make(), sam = await signUp(store), kim = await signUp(store), lou = await signUp(store);
    const invite = (await house(store, sam, '', { name: 'Sam' })).json.invite;
    await house(store, kim, '/join', { invite, name: 'Kim' }, T + 1);
    await house(store, lou, '/join', { invite, name: 'Lou' }, T + 2);
    await house(store, sam, '/sync', { doc: { items: { a: shared('a', 'Milk', T, 's') } } });
    assert.deepEqual((await house(store, sam, '/leave', {})).json, { household: null });
    const kimView = await house(store, kim, '');
    assert.equal(kimView.json.owner, true);
    assert.deepEqual(names(kimView), ['Kim', 'Lou']);
    assert.ok(kimView.json.doc.items.a, 'the list stays for the others');
    assert.equal((await house(store, sam, '/leave', {})).status, 404);
    await house(store, lou, '/leave', {});
    await house(store, kim, '/leave', {});
    assert.equal((await house(store, kim, '/join', { invite: kimView.json.invite })).status, 404, 'an empty household is gone');
  });

  test('a household holds at most 8 people, and deleting your backup takes you out, ' + where, async () => {
    const store = make(), owner = await signUp(store);
    const invite = (await house(store, owner, '', { name: 'O' })).json.invite;
    const codes = [];
    for (let i = 1; i < S.HOUSE_MAX; i++) { const c = await signUp(store); codes.push(c); assert.equal((await house(store, c, '/join', { invite, name: 'P' + i }, T + i)).status, 200); }
    const extra = await signUp(store);
    const full = await house(store, extra, '/join', { invite });
    assert.equal(full.status, 403);
    assert.match(full.json.error, /full/);
    // the owner deletes their backup: they leave, the first to join owns it, and there is room again
    assert.equal((await call(store, 'DELETE', '/v1/account', owner)).status, 200);
    const view = await house(store, codes[0], '');
    assert.equal(view.json.owner, true);
    assert.equal(view.json.members.length, S.HOUSE_MAX - 1);
    assert.equal((await house(store, extra, '/join', { invite: view.json.invite })).status, 200);
  });

  test('the household document has the same size limits, and two members writing at once are both kept, ' + where, async () => {
    const store = make(), sam = await signUp(store), kim = await signUp(store);
    const invite = (await house(store, sam, '', { name: 'Sam' })).json.invite;
    await house(store, kim, '/join', { invite, name: 'Kim' });
    const big = { items: {} };
    for (let i = 0; i < S.MAX_ITEMS + 1; i++) big.items['x' + i] = shared('x' + i, 'x', T, 's');
    assert.equal((await house(store, sam, '/sync', { doc: big })).status, 413);
    const long = await house(store, sam, '/sync', { doc: { items: { l: shared('l', 'z'.repeat(5000), T + 1e12, 's') } } });
    assert.equal(long.json.doc.items.l.item.text.length, 200);
    assert.equal(long.json.doc.items.l.at, T + S.FUTURE_MS, 'a change dated far ahead is pulled back');
    // a write lands between reading and writing: the server joins again
    const put = store.housePut.bind(store);
    let once = true;
    store.housePut = async (...a) => {
      if (once) { once = false; await house(store, kim, '/sync', { doc: { items: { k: shared('k', 'Kiwi', T, 'k') } } }); }
      return put(...a);
    };
    const r = await house(store, sam, '/sync', { doc: { items: { s: shared('s', 'Soup', T, 's') } } });
    assert.ok(r.json.doc.items.k && r.json.doc.items.s);
  });

  test('the purge deletes households not used for a year and members whose backup went, ' + where, async () => {
    const store = make(), sam = await signUp(store), kim = await signUp(store), idle = await signUp(store);
    const doc = Sync.snapshot(phone('p1', ['Milk']), T);
    for (const c of [sam, kim]) await call(store, 'POST', '/v1/sync', c, { doc }, T);
    const invite = (await house(store, sam, '', { name: 'Sam' })).json.invite;
    await house(store, kim, '/join', { invite, name: 'Kim' }, T + 1);
    await house(store, kim, '/sync', { doc: { items: { a: shared('a', 'Milk', T, 'k') } } }, T + 2);
    await call(store, 'POST', '/v1/sync', idle, { doc }, T);
    const quiet = (await house(store, idle, '', { name: 'Idle' }, T)).json.invite;
    // Sam's backup is not used for a year, Kim's is: Sam goes, Kim owns the household, the idle one's household goes
    const later = T + S.RETENTION_MS - 24 * 3600 * 1000;
    await call(store, 'POST', '/v1/sync', kim, { doc }, later);
    await house(store, kim, '/sync', { doc: { items: { b: shared('b', 'Bread', later, 'k') } } }, later);
    await S.purge(store, T + S.RETENTION_MS + 1000);
    const view = await house(store, kim, '', undefined, later);
    assert.equal(view.json.owner, true);
    assert.deepEqual(names(view), ['Kim']);
    const fresh = await signUp(store);
    assert.equal((await house(store, fresh, '/join', { invite: quiet })).status, 404);
  });

  test('a device that missed leaving one household cannot pour its list into the next one, ' + where, async () => {
    const store = make(), lauren = await signUp(store), sam = await signUp(store), kim = await signUp(store);
    const h1 = (await house(store, sam, '', { name: 'Sam' })).json.invite, h2 = (await house(store, kim, '', { name: 'Kim' })).json.invite;
    const first = await house(store, lauren, '/join', { invite: h1, name: 'Lauren' });
    const oldMe = first.json.members.find((m) => m.me).id;
    await house(store, sam, '/sync', { doc: { items: { s1: shared('s1', 'Sam secret', T, 'sam') } } });
    // on her phone she leaves Sam's household and joins Kim's; her PC still thinks it is in Sam's
    await house(store, lauren, '/leave', {});
    const second = await house(store, lauren, '/join', { invite: h2, name: 'Lauren' });
    assert.notEqual(second.json.members.find((m) => m.me).id, oldMe, 'each join is a new membership');
    const stale = await house(store, lauren, '/sync', { doc: { items: { s1: shared('s1', 'Sam secret', T, 'sam') } }, me: oldMe });
    assert.equal(stale.status, 409);
    assert.deepEqual(Object.keys((await house(store, kim, '')).json.doc ? (await house(store, kim, '')).json.doc.items : {}), [], 'nothing of Sam\'s reached Kim\'s household');
    assert.equal((await house(store, lauren, '/sync', { doc: {}, me: undefined })).status, 409, 'a sync must say its membership');
    assert.equal((await house(store, lauren, '/sync', { doc: {} })).status, 200);
  });

  test('a join that crosses the last member leaving, and a hand-over that crosses that member leaving, do not leave anything stuck, ' + where, async () => {
    const store = make(), sam = await signUp(store), kim = await signUp(store), lou = await signUp(store);
    const invite = (await house(store, sam, '', { name: 'Sam' })).json.invite;
    const id = await store.houseByInvite(S.cleanCode(invite));
    await house(store, sam, '/leave', {});   // the household is gone…
    assert.equal(await store.houseJoin(id, await S.accountId(S.cleanCode(kim)), 'm1', 'Kim', T, S.HOUSE_MAX), 'gone');   // …so a join found just before cannot land in it
    assert.deepEqual((await house(store, kim, '')).json, { household: null });
    assert.equal((await house(store, kim, '', { name: 'Kim' })).status, 201, 'Kim is free to make one');
    const inv2 = (await house(store, kim, '')).json.invite;
    const louId = (await house(store, lou, '/join', { invite: inv2, name: 'Lou' })).json.members.find((m) => m.me).id;
    const louAcct = await S.accountId(S.cleanCode(lou));
    await store.memberRemove(louAcct);   // Lou leaves just as Kim hands over
    assert.equal(await store.houseOwner((await store.memberOf(await S.accountId(S.cleanCode(kim)))).house, louAcct), false);
    assert.equal((await house(store, kim, '/owner', { member: louId })).status, 404);
    assert.equal((await house(store, kim, '')).json.owner, true, 'Kim still owns it');
  });

  test('the purge copes with a household whose every member went while it was still in use, ' + where, async () => {
    const store = make(), sam = await signUp(store), kim = await signUp(store), lou = await signUp(store);
    const doc = Sync.snapshot(phone('p1', ['Milk']), T);
    for (const c of [sam, kim, lou]) await call(store, 'POST', '/v1/sync', c, { doc }, T);
    const gone = (await house(store, sam, '', { name: 'Sam' }, T)).json.invite;
    const kept = (await house(store, kim, '', { name: 'Kim' }, T)).json.invite;
    await house(store, lou, '/join', { invite: kept, name: 'Lou' }, T + 1);
    // the households are used recently, but Sam's and Kim's backups are not: Sam's household empties, Kim's passes to Lou
    const later = T + S.RETENTION_MS - 1000;
    await call(store, 'POST', '/v1/sync', lou, { doc }, later);
    for (const c of [sam, lou]) await house(store, c, '/sync', { doc: { items: { ['x' + c.slice(0, 3)]: shared('x' + c.slice(0, 3), 'Tea', later, 'z') } } }, later);
    await S.purge(store, T + S.RETENTION_MS + 1000);
    const view = await house(store, lou, '', undefined, later);
    assert.equal(view.json.owner, true);
    assert.deepEqual(names(view), ['Lou']);
    const fresh = await signUp(store);
    assert.equal((await house(store, fresh, '/join', { invite: gone })).status, 404, 'the empty household is gone');
  });
}

test('without the household tables (an older database) the household addresses answer 503 and the rest works', { skip: !sqlite }, async () => {
  const old = new sqlite.DatabaseSync(':memory:');
  old.exec('CREATE TABLE docs (id TEXT PRIMARY KEY, body TEXT, rev INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, updated INTEGER NOT NULL)');
  const store = S.d1Store({ prepare(sql) { const st = old.prepare(sql); return { bind(...a) { return {
    async first() { return st.get(...a) || null; },
    async all() { return { results: st.all(...a) }; },
    async run() { return { meta: { changes: Number(st.run(...a).changes) } }; } }; } }; } });
  const code = await signUp(store);
  assert.equal((await house(store, code, '')).status, 503);
  assert.equal((await house(store, code, '', { name: 'x' })).status, 503);
  assert.equal(await S.purge(store, T), 0);
  assert.equal((await call(store, 'DELETE', '/v1/account', code)).status, 200);
});

test('the personal backup keeps a shared record as it is, and applying it never puts it in a list', async () => {
  const store = memoryStore(), code = await signUp(store);
  const doc = { items: { t: { at: T, by: 'x', list: 'shared', item: { id: 't', text: 'Dentist', emoji: '\u{1F9B7}', cat: 'task', done: false } } }, fields: {}, counters: {} };
  const r = await call(store, 'POST', '/v1/sync', code, { doc });
  assert.ok(r.json.doc.items.t);
  const a = phone('devicea', ['Milk']);
  const before = a.items.length;
  Sync.apply(a, r.json.doc);
  assert.equal(a.items.length, before);
  assert.ok(!a.sync.items.t);
});
