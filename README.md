# EatDirect (placeholder name)
Menu photo -> AI menu -> Christy's-shell ordering site (preview, ordering OFF) -> email with site + no-login dashboard link.

Pieces
- `server.js` platform: `/` landing, `/start` intake (no login), `/admin` Seven's list (ADMIN_PASSWORD), `/unsubscribe`, and it hosts every site at `<slug>.SITES_DOMAIN`.
- `template/` = Christy's site, made generic by `tools/rebuild-template.sh` (runs `tools/templatize.py` on ../christys-v2). Reads everything from `SITE_DIR/site.json`, `menu.json`, `img/`.
- `gen/build-site.js` config -> `sites/<slug>/`. `lib/ai.js` vision (XAI_API_KEY or OPENAI_API_KEY). `lib/mail.js` Gmail SMTP (GMAIL_APP_PASSWORD) / Resend / outbox. `deploy/render-create-service.js` one Render service per site (dry run unless `--yes` + RENDER_API_KEY).

Bot command: `node build-site.js <submissionId|slug> [--deploy] [--no-email] [--menu menu.json]`  (no args = list). Steps logged 1/4..4/4.
Turning a paying restaurant on (manual): set ORDERING_LIVE=1 for that site + connect Stripe from its dashboard (Christy's Stripe Connect flow, PLATFORM_FEE_CENTS=150).
Test locally: `node test/fake-ai.js` then `XAI_API_KEY=x AI_BASE_URL=http://localhost:4999 MAIL_DRY_RUN=1 ADMIN_PASSWORD=... node server.js`, `python3 test/shots.py`.

## Live hosting (no custom domain yet)
Restaurant sites are served at `BASE_URL/r/<slug>/` (the platform proxies and rewrites the template's absolute paths, scopes cookies and cart storage per restaurant). Set `SITES_DOMAIN` once a wildcard domain points at the service to switch to `<slug>.SITES_DOMAIN`.
The platform sends one email only: new submission -> BOT_INBOX_EMAIL via Resend (`RESEND_API_KEY`). Without the key it is queued in `DATA_DIR/outbox`; use "Resend to bot" in /admin once set. Owners are emailed by the EatDirect bot (see BOT.md); set `OWNER_EMAILS=1` only to make the platform do it.
