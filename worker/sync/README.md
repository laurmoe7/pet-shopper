# Sync server (Cloudflare Worker + D1 database)

Keeps your shopping list and your pet in step between your devices, and safe if you lose one. It is the second Worker
next to the recipe helper; the two are separate and don't affect each other. Free plan is plenty (Workers 100,000
requests a day, D1 5 GB).

How it works: an account is a long random **recovery code** (like `K7M2P-9XQ4R-…`). The server keeps only a hash of it,
no email, no name. Each device sends its whole saved list/pet, the server joins it with the stored copy using the same
merge rules as the app (`sync.js`), stores the result and sends it back. **To-do lists never reach the server.**
Anyone with the code can read the data, so it is shown once and the app will ask you to save it. A lost code cannot be
recovered.

## Put it online (about 10 minutes, no installs)

1. https://dash.cloudflare.com → **Storage & Databases** → **D1 SQL database** → **Create database**.
   Name `pet-shopper-sync`, location **Western Europe**.
2. Open the database → **Console**, paste the one line from `schema.sql`, **Execute**. (It is one line with no comments on purpose: the console joins lines together.)
   The table is `docs`: one row per account, `id` is a hash of the recovery code, `body` the merged document, `rev` counts writes.
3. **Workers & Pages** → **Create** → **Create Worker**, name `pet-shopper-sync` → **Deploy**.
4. **Edit code**, delete what is there, paste in all of `dist/worker.js`, **Deploy**.
5. The Worker's **Settings** → **Bindings** → **Add** → **D1 database**: variable name `DB`, pick `pet-shopper-sync`. **Deploy**.
6. Copy the Worker's address (like `https://pet-shopper-sync.yourname.workers.dev`).
7. Check it: open `<address>/v1/health` in a browser. It should show `{"ok":true}`.
8. Sign-up is limited inside the Worker (10 new accounts an hour per connection, answered with "429"). It needs the
   second line of `schema.sql` (the `limits` table). Without it everything still works, just unlimited. You can
   also add a Cloudflare rate-limiting rule on `POST /v1/account` if you like.

Then send the address to Claude (or paste it into the app once sign-in exists).

## With the command line instead

`npm run build:worker`, then `cd worker/sync && npx wrangler d1 create pet-shopper-sync --location weur`, put the id
into `wrangler.toml`, `npx wrangler d1 execute pet-shopper-sync --remote --file schema.sql`, `npx wrangler deploy`.

## After changing `sync.js` or `server.js`

Run `npm run build:worker` (a test fails if `dist/worker.js` is out of date). Pushing to `main` then deploys by itself:
`.github/workflows/worker.yml` runs the tests, creates any missing tables from `schema.sql` and deploys the Worker with
wrangler. It needs two repository secrets (GitHub > Settings > Secrets and variables > Actions): `CLOUDFLARE_API_TOKEN`
(a custom token with Account > Workers Scripts > Edit and Account > D1 > Edit, limited to her account) and
`CLOUDFLARE_ACCOUNT_ID`. Pasting `dist/worker.js` into the dashboard still works as a fallback.

## The inbox (Send to another device)

A link or a note from one device waits here for the others (phone to PC or PC to phone; the sender never gets its own back: `GET /v1/inbox?device=<id>`). It needs two more lines of `schema.sql` (the `inbox`
table and its index): in D1 → Console paste each line and Execute, then paste the new `dist/worker.js` over the Worker's code. Without the
table everything else works and sending says "the inbox is not set up". Messages are deleted when read, after a day, or past 50 waiting.

## Addresses (all JSON, `Authorization: Bearer <code>` except the first)

- `POST /v1/account` makes an account and returns `{code}` (shown to the person once).
- `POST /v1/sync` with `{doc}` joins the document with the stored one and returns `{doc, rev}`.
- `GET /v1/doc` returns `{doc, rev}`: what is stored (`doc` is null before the first sync).
- `DELETE /v1/account` deletes the account and its data.
- `GET /v1/inbox?to=pc` lists what waits for a device: `{messages: [{id, at, kind, text, from}]}` (oldest first).
- `POST /v1/inbox` with `{to: 'pc'|'phone', kind: 'link'|'text', text, from}` leaves a message (a link must start with http:// or https://; 4000 characters at most).
- `POST /v1/inbox/ack` with `{ids: [...]}` removes read messages.
- `GET /v1/health` returns `{ok:true}`.

## Notes

- One document per account, up to 1 MB and 5000 records. Changes dated more than a day ahead are pulled back, so a
  device with a wrong clock can't make every other change lose.
- Two devices writing at the same moment: the server writes only if nothing changed since it read, otherwise joins
  again and retries.
- Nothing is logged by the code. Cloudflare keeps its usual request metadata.
- Privacy policy, export and delete are needed before a store release: `GET /v1/doc` is the export, `DELETE /v1/account`
  the delete (the app needs buttons for both).
