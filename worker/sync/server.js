// Sync server for Pet Shopper: a Cloudflare Worker with a D1 database. Loaded after sync.js, which holds the
// merge rules (`Sync`); this file only adds accounts, storage and the web address layer.
// It keeps one document per account (the shopping list, the pet and the counters). Phones send their whole
// document, the server joins it with the stored one using the same `Sync.merge` the app uses, stores the
// result and sends it back. An account is a long random recovery code; the server keeps only its hash.
// To-do lists never reach it (sync.js leaves them out). How to put it online: worker/sync/README.md.
(function (root) {
  'use strict';

  var MAX_BODY = 1024 * 1024;       // bytes of one request
  var MAX_ITEMS = 5000;             // records in one document
  var FUTURE_MS = 24 * 3600 * 1000; // changes dated further ahead than this are pulled back (a clock set wrong)
  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I/L, which look alike
  var CODE_LENGTH = 25;             // 25 of 31 symbols: about 124 bits, shown as five groups of five
  var SIGNUPS_PER_HOUR = 10;        // new accounts from one connection per hour (a household can share one address)
  var INBOX_MAX = 50;               // messages waiting for a device (the oldest go first)
  var INBOX_TEXT_MAX = 4000;        // characters in one message
  var INBOX_TTL_MS = 24 * 3600 * 1000;   // an unread message is deleted after a day
  var INBOX_TO = ['pc', 'phone'];
  var INBOX_KINDS = ['link', 'text'];
  var TRIES = 4;                    // compare-and-swap retries when two devices write at the same moment

  var CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400' };

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  /** @returns {string} A new recovery code like ABCDE-FGHJK-MNPQR-STUVW-XYZ23. */
  function newCode() {
    var out = '', limit = 256 - (256 % ALPHABET.length);
    while (out.length < CODE_LENGTH) {
      var bytes = root.crypto.getRandomValues(new Uint8Array(32));
      for (var i = 0; i < bytes.length && out.length < CODE_LENGTH; i++) if (bytes[i] < limit) out += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return out.replace(/(.{5})(?=.)/g, '$1-');
  }
  /** @returns {string|null} The code in plain form (capitals, no dashes or spaces), or null if it can't be a code. */
  function cleanCode(text) {
    var code = String(text || '').toUpperCase().replace(/[\s-]/g, '');
    if (code.length !== CODE_LENGTH) return null;
    for (var i = 0; i < code.length; i++) if (ALPHABET.indexOf(code[i]) < 0) return null;
    return code;
  }
  /** The account name on the server: a hash of the code, so the code itself is never stored. */
  async function accountId(code) {
    var data = new TextEncoder().encode('pet-shopper-v1:' + code);
    var hash = new Uint8Array(await root.crypto.subtle.digest('SHA-256', data));
    return Array.prototype.map.call(hash, function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
  }

  /** Pulls changes dated far in the future back to `limit`, so one wrong clock can't make everything else lose. */
  function clamp(doc, limit) {
    ['items', 'fields'].forEach(function (part) {
      if (!isObj(doc[part])) return;
      Object.keys(doc[part]).forEach(function (k) {
        var r = doc[part][k];
        if (isObj(r) && typeof r.at === 'number' && r.at > limit) r.at = limit;
      });
    });
    return doc;
  }

  function reply(data, status) {
    return new Response(data === null ? null : JSON.stringify(data), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CORS) });
  }
  function fail(status, text) { return reply({ error: text }, status); }

  /**
   * Answers one request.
   * @param {Request} request
   * @param {{get, create, put, remove}} store  Where documents live (see d1Store).
   * @param {number} now  ms since 1970.
   */
  async function handle(request, store, now) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    var path = new URL(request.url).pathname.replace(/\/+$/, '');
    var method = request.method;
    if (path === '/v1/health' && method === 'GET') return reply({ ok: true });

    if (path === '/v1/account' && method === 'POST') {
      if (store.hit) {   // a simple limit: a few new accounts an hour per connection (only a hash of the address is kept, for that hour)
        var who = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
        var count = await store.hit(await accountId('ip:' + who), Math.floor(now / 3600000));
        if (count > SIGNUPS_PER_HOUR) return fail(429, 'Too many new backups from this connection. Try again in an hour.');
      }
      var code = newCode(), id = await accountId(cleanCode(code));
      if (!(await store.create(id, now))) return fail(500, 'Could not make an account, try again');
      return reply({ code: code }, 201);
    }

    var routes = { '/v1/doc': ['GET'], '/v1/sync': ['POST'], '/v1/account': ['DELETE'], '/v1/inbox': ['GET', 'POST'], '/v1/inbox/ack': ['POST'] };
    var allowed = routes[path];
    if (!allowed || allowed.indexOf(method) < 0) return fail(allowed ? 405 : 404, 'Not found');

    var auth = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
    var plain = auth ? cleanCode(auth[1]) : null;
    if (!plain) return fail(401, 'Missing or wrong recovery code');
    var acct = await accountId(plain), row = await store.get(acct);
    if (!row) return fail(401, 'Missing or wrong recovery code');

    if (path === '/v1/account') { await store.remove(acct); return reply({ deleted: true }); }
    if (path === '/v1/doc') return reply({ doc: row.body ? JSON.parse(row.body) : null, rev: row.rev });

    if (path === '/v1/inbox' || path === '/v1/inbox/ack') {
      try { return await inbox(request, store, acct, path, method, now); }
      catch (e) { return fail(503, 'The inbox is not set up on the server yet'); }
    }

    // sync: join what the device sent with what is stored
    var text = await request.text();
    if (text.length > MAX_BODY) return fail(413, 'Too much data');
    var sent;
    try { sent = JSON.parse(text); } catch (e) { return fail(400, 'Not JSON'); }
    if (!isObj(sent) || !isObj(sent.doc)) return fail(400, 'Send {"doc": …}');
    if (Object.keys(sent.doc.items || {}).length > MAX_ITEMS) return fail(413, 'Too many items');
    var incoming = clamp(sent.doc, now + FUTURE_MS);
    for (var n = 0; n < TRIES; n++) {
      var stored = row.body ? JSON.parse(row.body) : null;
      var merged = root.Sync.trim(root.Sync.merge(stored, incoming), now);
      var body = JSON.stringify(merged);
      if (row.body === body) return reply({ doc: merged, rev: row.rev });   // nothing new
      if (await store.put(acct, body, row.rev, now)) return reply({ doc: merged, rev: row.rev + 1 });
      row = await store.get(acct);   // someone wrote in between: join with theirs and try again
      if (!row) return fail(401, 'Missing or wrong recovery code');
    }
    return fail(409, 'Busy, try again');
  }

  function randomId() {
    var b = root.crypto.getRandomValues(new Uint8Array(8));
    return Array.prototype.map.call(b, function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
  }

  /**
   * The inbox: small things sent from one device to another (a link or a note from the phone to the PC).
   * GET /v1/inbox?to=pc lists what waits; POST /v1/inbox {to, kind, text} leaves a message; POST /v1/inbox/ack {ids} removes read ones.
   */
  async function inbox(request, store, acct, path, method, now) {
    if (path === '/v1/inbox' && method === 'GET') {
      var to = new URL(request.url).searchParams.get('to') || 'pc';
      if (INBOX_TO.indexOf(to) < 0) return fail(400, 'to must be pc or phone');
      return reply({ messages: await store.inboxList(acct, to, now) });
    }
    var raw = await request.text();
    if (raw.length > MAX_BODY) return fail(413, 'Too much data');
    var sent;
    try { sent = JSON.parse(raw); } catch (e) { return fail(400, 'Not JSON'); }
    if (!isObj(sent)) return fail(400, 'Send an object');
    if (path === '/v1/inbox/ack') {
      var ids = Array.isArray(sent.ids) ? sent.ids.filter(function (i) { return typeof i === 'string' && i.length <= 40; }).slice(0, INBOX_MAX) : [];
      return reply({ deleted: ids.length ? await store.inboxRemove(acct, ids) : 0 });
    }
    var text = typeof sent.text === 'string' ? sent.text.trim() : '';
    if (INBOX_TO.indexOf(sent.to) < 0) return fail(400, 'to must be pc or phone');
    if (INBOX_KINDS.indexOf(sent.kind) < 0) return fail(400, 'kind must be link or text');
    if (!text) return fail(400, 'Nothing to send');
    if (text.length > INBOX_TEXT_MAX) return fail(413, 'That is too long to send (' + INBOX_TEXT_MAX + ' characters at most)');
    if (sent.kind === 'link' && !/^https?:\/\/[^\s]+$/i.test(text)) return fail(400, 'A link must start with http:// or https://');
    var msg = { id: randomId(), to: sent.to, kind: sent.kind, text: text, at: now, from: typeof sent.from === 'string' ? sent.from.replace(/[^a-z0-9]/gi, '').slice(0, 12) : '' };
    await store.inboxAdd(acct, msg, now);
    return reply({ id: msg.id }, 201);
  }

  /** Storage in a Cloudflare D1 database (the tables are in schema.sql). */
  function d1Store(db) {
    return {
      /** @returns {Promise<{body: string|null, rev: number}|null>} */
      async get(id) {
        var r = await db.prepare('SELECT body, rev FROM docs WHERE id = ?').bind(id).first();
        return r ? { body: r.body, rev: r.rev } : null;
      },
      /** Makes an empty account. @returns {Promise<boolean>} false if the name is taken. */
      async create(id, now) {
        var r = await db.prepare('INSERT OR IGNORE INTO docs (id, body, rev, created, updated) VALUES (?, NULL, 0, ?, ?)').bind(id, now, now).run();
        return r.meta.changes === 1;
      },
      /** Writes the document only if nobody else did since `rev`. @returns {Promise<boolean>} */
      async put(id, body, rev, now) {
        var r = await db.prepare('UPDATE docs SET body = ?, rev = rev + 1, updated = ? WHERE id = ? AND rev = ?').bind(body, now, id, rev).run();
        return r.meta.changes === 1;
      },
      async remove(id) {
        await db.prepare('DELETE FROM docs WHERE id = ?').bind(id).run();
        try { await db.prepare('DELETE FROM inbox WHERE acct = ?').bind(id).run(); } catch (e) { /* no inbox table on an older database */ }
      },
      /** What waits for a device (older than a day is deleted first), oldest first. */
      async inboxList(acct, to, now) {
        await db.prepare('DELETE FROM inbox WHERE acct = ? AND at < ?').bind(acct, now - INBOX_TTL_MS).run();
        var r = await db.prepare('SELECT id, at, kind, body, src FROM inbox WHERE acct = ? AND dest = ? ORDER BY at ASC LIMIT ?').bind(acct, to, INBOX_MAX).all();
        return (r.results || []).map(function (m) { return { id: m.id, at: m.at, kind: m.kind, text: m.body, from: m.src }; });
      },
      /** Leaves a message and keeps the newest INBOX_MAX. */
      async inboxAdd(acct, m, now) {
        await db.prepare('INSERT INTO inbox (id, acct, dest, at, kind, body, src) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(m.id, acct, m.to, m.at, m.kind, m.text, m.from).run();
        await db.prepare('DELETE FROM inbox WHERE acct = ? AND (at < ? OR id NOT IN (SELECT id FROM inbox WHERE acct = ? ORDER BY at DESC LIMIT ?))').bind(acct, now - INBOX_TTL_MS, acct, INBOX_MAX).run();
      },
      /** @returns {Promise<number>} How many were removed. */
      async inboxRemove(acct, ids) {
        var n = 0;
        for (var i = 0; i < ids.length; i++) n += (await db.prepare('DELETE FROM inbox WHERE acct = ? AND id = ?').bind(acct, ids[i]).run()).meta.changes;
        return n;
      },
      /**
       * Counts one sign-up for this connection in this hour (and forgets older hours). Returns how many so far.
       * If the `limits` table is missing (an older database) it returns 0, so sign-up still works unlimited.
       */
      async hit(key, hour) {
        try {
          await db.prepare('DELETE FROM limits WHERE hour < ?').bind(hour).run();
          var r = await db.prepare('INSERT INTO limits (key, hour, n) VALUES (?, ?, 1) ON CONFLICT (key, hour) DO UPDATE SET n = n + 1 RETURNING n').bind(key, hour).first();
          return r ? r.n : 0;
        } catch (e) { return 0; }
      }
    };
  }

  root.SyncServer = {
    MAX_BODY: MAX_BODY, MAX_ITEMS: MAX_ITEMS, INBOX_MAX: INBOX_MAX, INBOX_TEXT_MAX: INBOX_TEXT_MAX, INBOX_TTL_MS: INBOX_TTL_MS, SIGNUPS_PER_HOUR: SIGNUPS_PER_HOUR, FUTURE_MS: FUTURE_MS,
    newCode: newCode, cleanCode: cleanCode, accountId: accountId, clamp: clamp, handle: handle, d1Store: d1Store,
    /** The Worker entry: the D1 database is bound as `DB`. */
    worker: { fetch: function (request, env) { return handle(request, d1Store(env.DB), Date.now()); } }
  };
})(globalThis);
