// generate -> deploy -> email, shared by the platform (auto after intake) and the CLI (node build-site.js <id>).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ai = require('./ai'), mail = require('./mail'), gen = require('../gen/build-site'), render = require('../deploy/render-create-service');
const env = process.env;
const paths = () => { const DATA = env.DATA_DIR || path.join(__dirname, '..', 'data'); return { DATA, SITES: env.SITES_DIR || path.join(DATA, 'sites'), DBF: path.join(DATA, 'platform.json') }; };
const BASE_URL = () => (env.BASE_URL || 'http://localhost:' + (env.PORT || 3000)).replace(/\/$/, '');
const MODE = () => env.DEPLOY_MODE || 'multi'; // multi = platform hosts <slug>.SITES_DOMAIN (cheapest); render-service = one Render service per restaurant
function siteUrl(slug) { if (MODE() === 'render-service') return `https://menusnap-${slug}.onrender.com`; const b = BASE_URL();
  return (env.SITE_URL_PATTERN || (env.SITES_DOMAIN ? 'https://{slug}.' + env.SITES_DOMAIN : b + '/r/{slug}')).replace('{slug}', slug); }
const unsubKey = () => env.UNSUB_SECRET || 'dev-only-unsub-secret';
const unsubToken = e => crypto.createHmac('sha256', unsubKey()).update(e).digest('base64url').slice(0, 32);
const unsubUrl = e => `${BASE_URL()}/unsubscribe?e=${encodeURIComponent(e)}&t=${unsubToken(e)}`;

async function run(db, s, { save = () => {}, log = console.log, send = env.OWNER_EMAILS === '1', deployYes = false, onBuilt } = {}) {
  const { DATA, SITES } = paths(); const step = (m) => log(`[${s.id} ${s.slug}] ${m}`);
  try {
    if (!s.menu && ai.provider() === 'none') { s.status = 'pending_bot'; save(); step('waiting for the EatDirect bot to read the menu (no AI key)'); return s; }
    if (!s.menu) { s.status = 'extracting'; save(); step('1/4 AI menu extraction with provider=' + ai.provider() + ', ' + s.menuFiles.length + ' photo(s)');
      const parts = []; for (const f of s.menuFiles) parts.push(await ai.extract(fs.readFileSync(path.join(DATA, 'uploads', f)), /\.png$/.test(f) ? 'image/png' : /\.webp$/.test(f) ? 'image/webp' : 'image/jpeg'));
      s.menu = { categories: parts.flatMap(p => p.categories) }; }
    const nItems = s.menu.categories.reduce((a, c) => a + c.items.length, 0); if (!nItems) throw new Error('No menu items found in the photo(s)');
    step(`1/4 menu ready: ${s.menu.categories.length} categories, ${nItems} items`);
    const logo = s.logoFile ? fs.readFileSync(path.join(DATA, 'uploads', s.logoFile)) : null;
    const r = gen.build({ slug: s.slug, name: s.name, email: s.email, phone: s.phone, address: s.address, hoursText: s.hoursText, colors: s.colors, menu: s.menu, siteUrl: siteUrl(s.slug), poweredBy: { name: 'EatDirect', url: BASE_URL() + '/?ref=' + s.slug } }, SITES, { logo, uploadsDir: path.join(DATA, 'uploads') });
    s.slug = r.slug; s.tokenHash = r.tokenHash; s.status = 'generated'; save(); step('2/4 generated site at ' + r.dir + ' (ordering OFF, preview mode)'); if (onBuilt) onBuilt(r);
    if (MODE() === 'render-service') { const d = await render.create(r.slug, r.tokenHash, { yes: deployYes, log: m => step('3/4 ' + m) }); s.siteUrl = d.url; s.renderServiceId = d.id || ''; s.deploy = d.dryRun ? 'dry-run' : 'created'; }
    else { s.siteUrl = siteUrl(r.slug); s.deploy = 'multi-tenant'; step('3/4 hosted by the platform (multi-tenant) at ' + s.siteUrl); }
    s.status = s.deploy === 'dry-run' ? 'generated (not deployed)' : 'live'; s.liveAt = new Date().toISOString(); s.error = ''; save();
    if (!send) { s.emailStatus = 'not sent by platform (EatDirect bot emails the owner)'; save(); step('4/4 owner email is sent by the EatDirect bot, not the platform'); return s; }
    if (s.deploy === 'dry-run') { step('4/4 email held: site is not deployed yet, the link would be dead'); s.emailStatus = 'held (not deployed)'; save(); return s; }
    if ((db.unsubscribed || []).includes(s.email)) { s.emailStatus = 'skipped (unsubscribed)'; step('4/4 ' + s.emailStatus); save(); return s; }
    const m = mail.siteReadyEmail({ to: s.email, name: s.name, siteUrl: s.siteUrl, dashUrl: s.siteUrl + '/owner#key=' + r.token, unsubUrl: unsubUrl(s.email) });
    try { const x = await mail.send(m, path.join(DATA, 'outbox')); s.emails = (s.emails || []).concat({ at: new Date().toISOString(), via: x.via, file: x.file ? path.basename(x.file) : undefined }); s.emailStatus = x.via === 'outbox' ? 'queued (no email sender set, resend from admin)' : 'sent via ' + x.via; }
    catch (e) { s.emailStatus = 'failed: ' + e.message; } step('4/4 email to ' + s.email + ': ' + s.emailStatus); save(); return s;
  } catch (e) { s.status = 'needs_review'; s.error = String(e.message || e).slice(0, 300); step('FAILED: ' + s.error); save(); return s; }
}
module.exports = { run, paths, siteUrl, unsubToken };
