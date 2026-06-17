# Legacy — Cloudflare Worker chat backend

This Cloudflare Worker (`index.js` + `wrangler.toml`) was the original backend for the
"Mon" chat widget, calling Google Gemma via `GEMINI_API_KEY`.

It is **superseded** by the Vercel serverless function `api/chat.js`, which does the same
thing and lives alongside the rest of the site's API on Vercel. The active chat widget
(`public/chat-widget.js`) posts to `/api/chat`, `/api/chat-log`, and `/api/session-close`.

Kept here for reference only — not deployed.
