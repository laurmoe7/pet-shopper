// Recipe helper for Pet Shopper: a tiny Cloudflare Worker.
// A web page cannot read another website directly (the browser blocks it), so the app asks this Worker instead:
//   GET https://<your-worker>.workers.dev/?url=https://example.com/some-recipe
// It fetches that page and sends back only the recipe data the page gives to search engines (the JSON-LD scripts),
// which the app reads with recipe.js. It stores nothing and keeps no logs of its own.
// How to put it online: see worker/README.md.

const MAX_BYTES = 3 * 1024 * 1024;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*' };

function reply(body, status, type) {
  return new Response(body, { status, headers: Object.assign({ 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600' }, CORS) });
}

/** Only public web addresses: http(s), no logins, no ports, no local or numeric hosts. */
function allowed(u) {
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  if (u.username || u.password || u.port) return false;
  const h = u.hostname.toLowerCase();
  if (!h.includes('.') || h.endsWith('.local') || h.endsWith('.internal') || h === 'localhost') return false;
  if (/^[\d.]+$/.test(h) || h.includes(':')) return false;
  return true;
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return reply(null, 204);
    if (request.method !== 'GET') return reply('GET only', 405);
    let target;
    try { target = new URL(new URL(request.url).searchParams.get('url') || ''); } catch (e) { return reply('Give a recipe address: ?url=https://…', 400); }
    if (!allowed(target)) return reply('That address is not allowed', 400);
    let res;
    try {
      res = await fetch(target.href, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PetShopperRecipeHelper/1.0)', 'Accept': 'text/html,application/xhtml+xml' }, cf: { cacheTtl: 600 } });
    } catch (e) { return reply('Could not reach that page', 502); }
    if (!res.ok) return reply('That page answered ' + res.status, 502);
    if (!allowed(new URL(res.url))) return reply('That address is not allowed', 400);
    const type = res.headers.get('Content-Type') || '';
    if (!/html|xml|json/i.test(type)) return reply('That is not a web page', 415);
    const html = (await res.text()).slice(0, MAX_BYTES);
    const blocks = html.match(/<script[^>]+type\s*=\s*["']?application\/ld\+json["']?[^>]*>[\s\S]*?<\/script>/gi) || [];
    return reply(blocks.join('\n') || '<!-- no recipe data -->', 200, 'text/plain; charset=utf-8');
  },
};
