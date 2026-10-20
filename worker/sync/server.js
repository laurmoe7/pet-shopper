// Sync server for Pet Shopper: a Cloudflare Worker with a D1 database. Loaded after sync.js, which holds the
// merge rules (`Sync`); this file only adds accounts, storage and the web address layer.
// It keeps one document per account (the shopping list, the to-dos, the pet and the counters). Phones send their whole
// document, the server joins it with the stored one using the same `Sync.merge` the app uses, stores the
// result and sends it back. An account is a long random recovery code; the server keeps only its hash.
// It holds your to-dos too (only your own devices have your code). How to put it online: worker/sync/README.md.
// A household (a shopping list shared by several people, each with their own pet and code) is a second kind of
// document: only the `shared` list's items. Members open it with their own personal code; the server keeps who is
// in which household, the owner (who made it) manages the members, and an invite code is only for joining.
(function (root) {
  'use strict';

  var MAX_BODY = 1024 * 1024;       // bytes of one request
  var MAX_ITEMS = 5000;             // records in one document (the stored one too)
  var MAX_TEXT = 200;               // characters of one item's name or amount
  var FUTURE_MS = 24 * 3600 * 1000; // changes dated further ahead than this are pulled back (a clock set wrong)
  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I/L, which look alike
  var CODE_LENGTH = 25;             // 25 of 31 symbols: about 124 bits, shown as five groups of five
  var SIGNUPS_PER_HOUR = 10;        // new accounts from one connection per hour (a household can share one address)
  var INBOX_MAX = 50;               // messages waiting for a device (the oldest go first)
  var INBOX_TEXT_MAX = 4000;        // characters in one message
  var INBOX_TTL_MS = 24 * 3600 * 1000;   // an unread message is deleted after a day
  var INBOX_TO = ['any', 'pc', 'phone'];   // 'any' = whichever other device picks it up; 'pc' and 'phone' are from earlier builds
  var INBOX_KINDS = ['link', 'text'];
  var TRIES = 4;                    // compare-and-swap retries when two devices write at the same moment
  var DAY_MS = 24 * 3600 * 1000;
  var RETENTION_MS = 365 * DAY_MS;  // a backup not changed for this long is deleted (the nightly purge; privacy.html says so)
  var TOUCH_MS = DAY_MS;            // a sync with nothing new still marks the backup as in use, once a day
  var HOUSE_MAX = 8;                // people in one household
  var HOUSE_LIST = 'shared';        // the only list a household document carries
  var NAME_MAX = 30;                // characters of a member's display name

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
  /** Changes dated in the future are pulled back to `limit`, and an item's words are cut to MAX_TEXT, so no device can grow the document past what fits. */
  function clamp(doc, limit) {
    ['items', 'fields'].forEach(function (part) {
      if (!isObj(doc[part])) return;
      Object.keys(doc[part]).forEach(function (k) {
        var r = doc[part][k];
        if (!isObj(r)) return;
        if (typeof r.at === 'number' && r.at > limit) r.at = limit;
        if (part === 'items' && isObj(r.item)) ['text', 'qty'].forEach(function (f) { if (typeof r.item[f] === 'string' && r.item[f].length > MAX_TEXT) r.item[f] = r.item[f].slice(0, MAX_TEXT); });
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

    var routes = { '/v1/doc': ['GET'], '/v1/sync': ['POST'], '/v1/account': ['DELETE'], '/v1/inbox': ['GET', 'POST'], '/v1/inbox/ack': ['POST'],
      '/v1/household': ['GET', 'POST'], '/v1/household/join': ['POST'], '/v1/household/sync': ['POST'], '/v1/household/leave': ['POST'],
      '/v1/household/remove': ['POST'], '/v1/household/owner': ['POST'], '/v1/household/invite': ['POST'] };
    var allowed = routes[path];
    if (!allowed || allowed.indexOf(method) < 0) return fail(allowed ? 405 : 404, 'Not found');

    var auth = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
    var plain = auth ? cleanCode(auth[1]) : null;
    if (!plain) return fail(401, 'Missing or wrong recovery code');
    var acct = await accountId(plain), row = await store.get(acct);
    if (!row) return fail(401, 'Missing or wrong recovery code');

    if (path === '/v1/account') {
      try { if (store.memberOf) await leave(store, acct); } catch (e) { /* no household tables on an older database */ }
      await store.remove(acct);
      return reply({ deleted: true });
    }
    if (path === '/v1/doc') return reply({ doc: row.body ? JSON.parse(row.body) : null, rev: row.rev });

    if (path === '/v1/inbox' || path === '/v1/inbox/ack') {
      try { return await inbox(request, store, acct, path, method, now); }
      catch (e) { return fail(503, 'The inbox is not set up on the server yet'); }
    }

    if (path.indexOf('/v1/household') === 0) {
      var asked;
      try { asked = await readJson(request, method); } catch (e) { return e instanceof Response ? e : fail(400, 'Not JSON'); }
      try { return await household(request, store, acct, path, method, asked, now); }
      catch (e) { if (e instanceof Response) return e; return fail(503, 'Households are not set up on the server yet'); }
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
      if (row.body === body) {   // nothing new: the backup is still in use, though (the purge keeps what was touched within a year)
        if (store.touch && !(row.updated > now - TOUCH_MS)) await store.touch(acct, now);
        return reply({ doc: merged, rev: row.rev });
      }
      // what is stored must fit too (D1 keeps a row under 2 MB): otherwise every later sync would fail and the account would be stuck
      if (body.length > MAX_BODY || Object.keys(merged.items || {}).length > MAX_ITEMS) return fail(413, 'The list is too big to store');
      if (await store.put(acct, body, row.rev, now)) return reply({ doc: merged, rev: row.rev + 1 });
      row = await store.get(acct);   // someone wrote in between: join with theirs and try again
      if (!row) return fail(401, 'Missing or wrong recovery code');
    }
    return fail(409, 'Busy, try again');
  }

  /** The request's JSON object ({} for a GET or an empty body); throws a ready answer when it is too big or not an object. */
  async function readJson(request, method) {
    if (method === 'GET') return {};
    var text = await request.text();
    if (text.length > MAX_BODY) throw fail(413, 'Too much data');
    if (!text) return {};
    var v = JSON.parse(text);
    if (!isObj(v)) throw fail(400, 'Send an object');
    return v;
  }

  /** A display name from Profile: no control characters, spaces joined, at most NAME_MAX characters ('' if none). */
  function cleanName(v) {
    if (typeof v !== 'string') return '';
    return Array.from(v.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, NAME_MAX).join('').trim();
  }

  /** Only what a household keeps: the shared list's item records (no pet, counters, to-dos or emoji overrides). */
  function houseDoc(doc) {
    var out = { v: root.Sync.VERSION, items: {} };
    var items = isObj(doc) && isObj(doc.items) ? doc.items : {};
    Object.keys(items).forEach(function (id) { if (isObj(items[id]) && items[id].list === HOUSE_LIST) out.items[id] = items[id]; });
    return out;
  }

  /** What a member is told about their household: the document, the members (names only) and, for the owner, the invite code. */
  async function houseAnswer(store, acct, house, status) {
    var row = await store.houseGet(house), people = await store.houseMembers(house);
    if (!row) return reply({ household: null });
    var out = {
      doc: row.body ? JSON.parse(row.body) : null, rev: row.rev, owner: row.owner === acct,
      members: people.map(function (m) { return { id: m.id, name: m.name, owner: m.acct === row.owner, me: m.acct === acct, joined: m.joined, seen: m.seen }; })
    };
    if (out.owner) out.invite = row.invite.replace(/(.{5})(?=.)/g, '$1-');
    return reply(out, status);
  }

  /** Takes `acct` out of its household: the first to join takes over from a leaving owner, and the last one out deletes it. */
  async function leave(store, acct) {
    var mine = await store.memberOf(acct);
    if (!mine) return false;
    await store.memberRemove(acct);
    var row = await store.houseGet(mine.house), left = await store.houseMembers(mine.house);
    if (!left.length) await store.houseDelete(mine.house);
    else if (row && row.owner === acct) await store.houseOwner(mine.house, left[0].acct);
    return true;
  }

  /**
   * The household addresses (all with the person's own code): GET / POST /v1/household (see or make one), /join, /sync,
   * /leave, and for the owner /remove, /owner (hand over) and /invite (a new invite code; the old one stops working).
   */
  async function household(request, store, acct, path, method, asked, now) {
    var mine = await store.memberOf(acct);
    if (path === '/v1/household' && method === 'GET') return mine ? houseAnswer(store, acct, mine.house) : reply({ household: null });

    if (path === '/v1/household' || path === '/v1/household/join') {
      if (mine) return fail(409, 'You are already in a household. Leave it first.');
      var name = cleanName(asked.name);
      if (path === '/v1/household') {
        if (store.hit) {   // the same limit as new accounts, counted apart
          var who = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
          if (await store.hit(await accountId('house:' + who), Math.floor(now / 3600000)) > SIGNUPS_PER_HOUR) return fail(429, 'Too many new households from this connection. Try again in an hour.');
        }
        var house = randomId();
        if (!(await store.houseCreate(house, cleanCode(newCode()), acct, randomId(), name, now))) return fail(500, 'Could not make a household, try again');
        return houseAnswer(store, acct, house, 201);
      }
      var invite = cleanCode(asked.invite), found = invite ? await store.houseByInvite(invite) : null;
      if (!found) return fail(404, 'No household has that invite code');
      var joined = await store.houseJoin(found, acct, randomId(), name, now, HOUSE_MAX);
      if (joined === 'full') return fail(403, 'That household is full (' + HOUSE_MAX + ' people)');
      if (joined !== 'ok') return fail(409, 'You are already in a household. Leave it first.');
      return houseAnswer(store, acct, found);
    }

    if (!mine) return fail(404, 'You are not in a household');
    if (path === '/v1/household/leave') { await leave(store, acct); return reply({ household: null }); }

    if (path === '/v1/household/sync') {
      if (!isObj(asked.doc)) return fail(400, 'Send {"doc": …}');
      if (Object.keys(asked.doc.items || {}).length > MAX_ITEMS) return fail(413, 'Too many items');
      var incoming = houseDoc(clamp(asked.doc, now + FUTURE_MS));
      var row = await store.houseGet(mine.house);
      for (var n = 0; n < TRIES && row; n++) {
        var merged = houseDoc(root.Sync.trim(root.Sync.merge(row.body ? JSON.parse(row.body) : null, incoming), now));
        var body = JSON.stringify(merged), wrote = row.body === body;
        if (!wrote) {
          if (body.length > MAX_BODY || Object.keys(merged.items).length > MAX_ITEMS) return fail(413, 'The list is too big to store');
          wrote = await store.housePut(mine.house, body, row.rev, now);
        } else if (!(row.updated > now - TOUCH_MS)) await store.houseTouch(mine.house, now);
        if (wrote) {
          var name2 = cleanName(asked.name);
          if (!(mine.seen > now - 60000) || (name2 && name2 !== mine.name)) await store.memberSeen(acct, name2 || mine.name, now);   // at most once a minute
          return houseAnswer(store, acct, mine.house);
        }
        row = await store.houseGet(mine.house);   // someone wrote in between: join with theirs and try again
      }
      return row ? fail(409, 'Busy, try again') : fail(404, 'You are not in a household');
    }

    // the owner's tools
    var house2 = await store.houseGet(mine.house);
    if (!house2 || house2.owner !== acct) return fail(403, 'Only the owner can do that');
    if (path === '/v1/household/invite') {
      if (!(await store.houseInvite(mine.house, cleanCode(newCode())))) return fail(500, 'Could not make a code, try again');
      return houseAnswer(store, acct, mine.house);
    }
    var people = await store.houseMembers(mine.house);
    var them = people.filter(function (m) { return m.id === asked.member; })[0];
    if (!them) return fail(404, 'No such member');
    if (them.acct === acct) return fail(400, path === '/v1/household/remove' ? 'Use leave to take yourself out' : 'You are the owner already');
    if (path === '/v1/household/remove') await store.memberRemove(them.acct);
    else await store.houseOwner(mine.house, them.acct);
    return houseAnswer(store, acct, mine.house);
  }

  function randomId() {
    var b = root.crypto.getRandomValues(new Uint8Array(8));
    return Array.prototype.map.call(b, function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
  }

  /**
   * The inbox: small things sent from one device to another (a link or a note, phone to PC or the other way).
   * GET /v1/inbox?device=<id> lists what other devices left (never what this one sent); POST /v1/inbox {kind, text, from} leaves a
   * message; POST /v1/inbox/ack {ids} removes read ones. (?to=pc|phone is the earlier way, kept for old copies of the app.)
   */
  async function inbox(request, store, acct, path, method, now) {
    if (path === '/v1/inbox' && method === 'GET') {
      var q = new URL(request.url).searchParams, device = cleanDevice(q.get('device')), to = q.get('to') || 'pc';
      if (!device && INBOX_TO.indexOf(to) < 0) return fail(400, 'to must be pc or phone');
      return reply({ messages: await store.inboxList(acct, to, now, device) });
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
    if (sent.to === undefined) sent.to = 'any';
    if (INBOX_TO.indexOf(sent.to) < 0) return fail(400, 'to must be any, pc or phone');
    if (INBOX_KINDS.indexOf(sent.kind) < 0) return fail(400, 'kind must be link or text');
    if (!text) return fail(400, 'Nothing to send');
    if (text.length > INBOX_TEXT_MAX) return fail(413, 'That is too long to send (' + INBOX_TEXT_MAX + ' characters at most)');
    if (sent.kind === 'link' && !/^https?:\/\/[^\s]+$/i.test(text)) return fail(400, 'A link must start with http:// or https://');
    var msg = { id: randomId(), to: sent.to, kind: sent.kind, text: text, at: now, from: cleanDevice(sent.from) };
    await store.inboxAdd(acct, msg, now);
    return reply({ id: msg.id }, 201);
  }

  /** @returns {string} A device id with only letters and digits, at most 12 long ('' if it is not one). */
  function cleanDevice(v) { return typeof v === 'string' ? v.replace(/[^a-z0-9]/gi, '').slice(0, 12) : ''; }

  /** Storage in a Cloudflare D1 database (the tables are in schema.sql). */
  function d1Store(db) {
    return {
      /** @returns {Promise<{body: string|null, rev: number}|null>} */
      async get(id) {
        var r = await db.prepare('SELECT body, rev, updated FROM docs WHERE id = ?').bind(id).first();
        return r ? { body: r.body, rev: r.rev, updated: r.updated } : null;
      },
      /** Marks the backup as in use today (a sync with nothing new). */
      async touch(id, now) {
        await db.prepare('UPDATE docs SET updated = ? WHERE id = ?').bind(now, id).run();
      },
      /**
       * Deletes backups not changed since `staleBefore` and sign-ups never used (no document) made before `emptyBefore`, with their inbox.
       * @returns {Promise<number>} How many backups went.
       */
      async purge(staleBefore, emptyBefore) {
        try { await db.prepare('DELETE FROM inbox WHERE acct IN (SELECT id FROM docs WHERE updated < ? OR (body IS NULL AND created < ?))').bind(staleBefore, emptyBefore).run(); } catch (e) { /* no inbox table on an older database */ }
        var r = await db.prepare('DELETE FROM docs WHERE updated < ? OR (body IS NULL AND created < ?)').bind(staleBefore, emptyBefore).run();
        try {   // households: not changed for a year, then members whose backup went; an owner who went hands over to the first to join; empty ones go
          await db.prepare('DELETE FROM households WHERE updated < ?').bind(staleBefore).run();
          await db.prepare('DELETE FROM members WHERE acct NOT IN (SELECT id FROM docs) OR house NOT IN (SELECT id FROM households)').bind().run();
          await db.prepare('UPDATE households SET owner = (SELECT acct FROM members WHERE members.house = households.id ORDER BY joined, id LIMIT 1) WHERE owner NOT IN (SELECT acct FROM members WHERE members.house = households.id)').bind().run();
          await db.prepare('DELETE FROM households WHERE owner IS NULL OR id NOT IN (SELECT house FROM members)').bind().run();
        } catch (e) { /* no household tables on an older database */ }
        return r.meta.changes;
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
      /** @returns {Promise<{house, id, name, joined, seen}|null>} The household this account is in. */
      async memberOf(acct) {
        var r = await db.prepare('SELECT house, id, name, joined, seen FROM members WHERE acct = ?').bind(acct).first();
        return r ? { house: r.house, id: r.id, name: r.name, joined: r.joined, seen: r.seen } : null;
      },
      /** @returns {Promise<{body, rev, updated, owner, invite}|null>} */
      async houseGet(house) {
        var r = await db.prepare('SELECT body, rev, updated, owner, invite FROM households WHERE id = ?').bind(house).first();
        return r ? { body: r.body, rev: r.rev, updated: r.updated, owner: r.owner, invite: r.invite } : null;
      },
      /** The members, the first to join first. */
      async houseMembers(house) {
        var r = await db.prepare('SELECT id, acct, name, joined, seen FROM members WHERE house = ? ORDER BY joined, id').bind(house).all();
        return (r.results || []).map(function (m) { return { id: m.id, acct: m.acct, name: m.name, joined: m.joined, seen: m.seen }; });
      },
      async houseByInvite(invite) {
        var r = await db.prepare('SELECT id FROM households WHERE invite = ?').bind(invite).first();
        return r ? r.id : null;
      },
      /** Makes a household with its owner as the first member. @returns {Promise<boolean>} */
      async houseCreate(house, invite, acct, member, name, now) {
        var r = await db.prepare('INSERT OR IGNORE INTO households (id, body, rev, created, updated, owner, invite) VALUES (?, NULL, 0, ?, ?, ?, ?)').bind(house, now, now, acct, invite).run();
        if (r.meta.changes !== 1) return false;
        var m = await db.prepare('INSERT OR IGNORE INTO members (acct, house, id, name, joined, seen) VALUES (?, ?, ?, ?, ?, ?)').bind(acct, house, member, name, now, now).run();
        if (m.meta.changes === 1) return true;
        await db.prepare('DELETE FROM households WHERE id = ?').bind(house).run();   // joined another one meanwhile
        return false;
      },
      /** @returns {Promise<string>} 'ok', 'full' or 'taken' (already in a household). One statement, so two joining at once can't pass the limit. */
      async houseJoin(house, acct, member, name, now, max) {
        if (await this.memberOf(acct)) return 'taken';
        var r = await db.prepare('INSERT OR IGNORE INTO members (acct, house, id, name, joined, seen) SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM members WHERE house = ?) < ?').bind(acct, house, member, name, now, now, house, max).run();
        if (r.meta.changes === 1) return 'ok';
        return (await this.memberOf(acct)) ? 'taken' : 'full';
      },
      /** Writes the household's document only if nobody else did since `rev`. */
      async housePut(house, body, rev, now) {
        var r = await db.prepare('UPDATE households SET body = ?, rev = rev + 1, updated = ? WHERE id = ? AND rev = ?').bind(body, now, house, rev).run();
        return r.meta.changes === 1;
      },
      async houseTouch(house, now) { await db.prepare('UPDATE households SET updated = ? WHERE id = ?').bind(now, house).run(); },
      async houseOwner(house, acct) { await db.prepare('UPDATE households SET owner = ? WHERE id = ?').bind(acct, house).run(); },
      /** @returns {Promise<boolean>} false if the code is taken by another household. */
      async houseInvite(house, invite) {
        var r = await db.prepare('UPDATE OR IGNORE households SET invite = ? WHERE id = ?').bind(invite, house).run();
        return r.meta.changes === 1;
      },
      async houseDelete(house) {
        await db.prepare('DELETE FROM members WHERE house = ?').bind(house).run();
        await db.prepare('DELETE FROM households WHERE id = ?').bind(house).run();
      },
      async memberSeen(acct, name, now) { await db.prepare('UPDATE members SET name = ?, seen = ? WHERE acct = ?').bind(name, now, acct).run(); },
      async memberRemove(acct) { await db.prepare('DELETE FROM members WHERE acct = ?').bind(acct).run(); },
      /**
       * What waits for a device, oldest first (a day old and older is not shown; the next message left clears it away).
       * With a device id: everything another device left. Without: what was addressed to `to` (the earlier way).
       * Only reads, since a device asks every few seconds.
       */
      async inboxList(acct, to, now, device) {
        var since = now - INBOX_TTL_MS, r;
        if (device) r = await db.prepare('SELECT id, at, kind, body, src FROM inbox WHERE acct = ? AND at >= ? AND src != ? ORDER BY at ASC LIMIT ?').bind(acct, since, device, INBOX_MAX).all();
        else r = await db.prepare('SELECT id, at, kind, body, src FROM inbox WHERE acct = ? AND at >= ? AND dest = ? ORDER BY at ASC LIMIT ?').bind(acct, since, to, INBOX_MAX).all();
        return (r.results || []).map(function (m) { return { id: m.id, at: m.at, kind: m.kind, text: m.body, from: m.src }; });
      },
      /** Leaves a message and keeps the newest INBOX_MAX. */
      async inboxAdd(acct, m, now) {
        var add = db.prepare('INSERT INTO inbox (id, acct, dest, at, kind, body, src) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(m.id, acct, m.to, m.at, m.kind, m.text, m.from);
        var tidy = db.prepare('DELETE FROM inbox WHERE acct = ? AND (at < ? OR id NOT IN (SELECT id FROM inbox WHERE acct = ? ORDER BY at DESC LIMIT ?))').bind(acct, now - INBOX_TTL_MS, acct, INBOX_MAX);
        if (typeof db.batch === 'function') await db.batch([add, tidy]);   // one round trip to the database instead of two
        else { await add.run(); await tidy.run(); }
      },
      /** @returns {Promise<number>} How many were removed. */
      async inboxRemove(acct, ids) {
        if (!ids.length) return 0;
        var st = db.prepare('DELETE FROM inbox WHERE acct = ? AND id IN (' + ids.map(function () { return '?'; }).join(',') + ')');
        return (await st.bind.apply(st, [acct].concat(ids)).run()).meta.changes;
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

  /** The nightly clean-up: backups not changed for a year and sign-ups never used go, with their inbox. @returns {Promise<number>} */
  function purge(store, now) { return store.purge(now - RETENTION_MS, now - DAY_MS); }

  /** The rate-limit binding LIMIT (wrangler.toml): a connection gets so many requests a minute. Without the binding there is no limit. */
  async function tooOften(request, env) {
    if (!env || !env.LIMIT) return false;
    try { return !(await env.LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' })).success; } catch (e) { return false; }
  }

  root.SyncServer = {
    MAX_BODY: MAX_BODY, MAX_ITEMS: MAX_ITEMS, INBOX_MAX: INBOX_MAX, INBOX_TEXT_MAX: INBOX_TEXT_MAX, INBOX_TTL_MS: INBOX_TTL_MS, SIGNUPS_PER_HOUR: SIGNUPS_PER_HOUR, FUTURE_MS: FUTURE_MS,
    RETENTION_MS: RETENTION_MS, TOUCH_MS: TOUCH_MS, HOUSE_MAX: HOUSE_MAX, NAME_MAX: NAME_MAX,
    newCode: newCode, cleanName: cleanName, houseDoc: houseDoc, cleanCode: cleanCode, accountId: accountId, clamp: clamp, handle: handle, d1Store: d1Store, purge: purge, tooOften: tooOften,
    /** The Worker entry: the D1 database is bound as `DB`, the rate limit as `LIMIT`; `scheduled` runs on the cron in wrangler.toml. */
    worker: {
      fetch: async function (request, env) {
        if (await tooOften(request, env)) return fail(429, 'Too many requests, try again in a minute');
        return handle(request, d1Store(env.DB), Date.now());
      },
      scheduled: function (event, env, ctx) { ctx.waitUntil(purge(d1Store(env.DB), Date.now())); }
    }
  };
})(globalThis);
