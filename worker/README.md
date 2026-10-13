# Recipe helper (Cloudflare Worker)

The app can turn a recipe link into shopping list items. Browsers don't let a web page read another website, so this tiny
Worker does the fetching. It is free (Cloudflare's free plan allows 100,000 requests a day) and stores nothing.

## Put it online (about 5 minutes, no installs)

1. Make a free account at https://dash.cloudflare.com (no card needed).
2. **Workers & Pages** → **Create** → **Create Worker**. Name it `pet-shopper-recipes` → **Deploy**.
3. **Edit code**, delete what is there, paste in all of `recipe-proxy.js`, then **Deploy**.
4. Copy the address it shows (like `https://pet-shopper-recipes.yourname.workers.dev`).
5. In the app: Shopping list → the recipe button → **Recipe helper address** → paste it. Done.

Only the app may use it: a request without the app's origin gets 403, so test it from the app's Recipe sheet, not from the browser's address bar (the origins are `ORIGINS` in `recipe-proxy.js` plus `ALLOWED_ORIGINS` in `wrangler.toml`). Each connection gets 20 requests a minute (the `LIMIT` rate-limit binding in `wrangler.toml`; when the code is pasted in the dashboard, add the same binding under Settings > Bindings, or there is no limit). A blank answer means that site has no recipe data: try another recipe.

## With the command line instead

`cd worker && npx wrangler deploy`

## Notes

- It only passes on the recipe data a page gives to search engines, not the whole page.
- It refuses local and numeric addresses.
- Some sites block automated visits. The app then says it couldn't read the page, and you can paste the ingredients instead.
