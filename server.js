// EatDirect platform: public intake -> AI menu extraction -> generated site (Christy's shell template) -> auto email with site + dashboard magic link.
// Also hosts every generated site (multi-tenant): <slug>.<SITES_DOMAIN> is proxied to a lazily started template process.
const express = require('express'), bcrypt = require('bcryptjs'), crypto = require('crypto'), fs = require('fs'), path = require('path'), http = require('http'), { spawn } = require('child_process');
const ai = require('./lib/ai'), mail = require('./lib/mail'), gen = require('./gen/build-site');
const env = process.env, PORT = +(env.PORT || 3000), PROD = env.NODE_ENV === 'production';
const BASE_URL = (env.BASE_URL || 'http://localhost:' + PORT).replace(/\/$/, '');
const SITES_DOMAIN = env.SITES_DOMAIN || 'localhost'; // e.g. menusnap.app -> rosas-taqueria.menusnap.app
const siteUrl_ = slug => (env.SITE_URL_PATTERN || (BASE_URL.startsWith('https') ? 'https://{slug}.' + SITES_DOMAIN : `http://{slug}.localhost:${PORT}`)).replace('{slug}', slug);
const DATA = env.DATA_DIR || path.join(__dirname, 'data'), SITES = env.SITES_DIR || path.join(DATA, 'sites');
for (const d of ['uploads', 'outbox']) fs.mkdirSync(path.join(DATA, d), { recursive: true }); fs.mkdirSync(SITES, { recursive: true });
const AUTO_SEND = env.AUTO_SEND !== '0';
const pipeline = require('./lib/pipeline');

// ---------- store ----------
const DBF = path.join(DATA, 'platform.json'); let db = { subs: [], unsubscribed: [], sessions: [] };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DBF, 'utf8'))); } catch (e) {}
let saveT; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { fs.writeFileSync(DBF + '.tmp', JSON.stringify(db)); fs.renameSync(DBF + '.tmp', DBF); }, 30); };
const rid = (n = 12) => crypto.randomBytes(n).toString('hex'), sha = s => crypto.createHash('sha256').update(s).digest('hex');
const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const hex = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v : null;

// ---------- multi-tenant site host (proxy by subdomain) ----------
const demoDash = require('./lib/demo-dashboard'); const procs = new Map(); let nextPort = +(env.SITE_PORT_BASE || 4100);
function ensureSite(slug) { let p = procs.get(slug); if (p) { p.last = Date.now(); return p.ready; }
  const isDemo = slug === demoDash.SLUG; const dir = isDemo ? demoDash.prepare() : path.join(SITES, slug); if (!fs.existsSync(path.join(dir, 'site.json'))) return Promise.reject(new Error('no site'));
  const port = nextPort++; const child = spawn(process.execPath, [path.join(__dirname, 'template', 'server.js')], { stdio: ['ignore', 'inherit', 'inherit'],
    env: Object.assign(Object.fromEntries(Object.entries(env).filter(([k]) => !/^(BOT_API_TOKEN|ADMIN_PASSWORD|ADMIN_PASSWORD_HASH|UNSUB_SECRET|GMAIL_APP_PASSWORD|SMTP_PASS|RESEND_API_KEY|XAI_API_KEY|OPENAI_API_KEY|BOT_INBOX_EMAIL)$/.test(k))), { SESSION_SECRET: crypto.createHash('sha256').update('site|' + slug + '|' + (env.UNSUB_SECRET || 'dev')).digest('hex'), PORT: String(port), SITE_DIR: dir, DATA_FILE: path.join(dir, 'data', 'db.json'), SITE_URL: pipeline.siteUrl(slug), WEBHOOK_OFF: env.WEBHOOK_OFF || '1' }, isDemo ? { DEMO_DASHBOARD: '1', ORDERING_LIVE: '1', DATABASE_URL: '', SITE_URL: pipeline.siteUrl(slug) } : {}) });
  p = { port, child, last: Date.now() }; procs.set(slug, p); child.on('exit', () => procs.delete(slug));
  p.ready = new Promise((res, rej) => { let n = 0; const t = setInterval(() => { http.get({ port, path: '/healthz' }, r => { r.resume(); clearInterval(t); res(port); }).on('error', () => { if (++n > 100) { clearInterval(t); rej(new Error('site failed to start')); } }); }, 100); });
  return p.ready; }
setInterval(() => { for (const [s, p] of procs) if (Date.now() - p.last > 15 * 60e3) p.child.kill(); }, 60e3).unref(); // idle sites sleep, saves memory
const tenantOf = host => { const h = String(host || '').split(':')[0].toLowerCase(); const suf = '.' + (h.endsWith('.localhost') ? 'localhost' : SITES_DOMAIN); return h.endsWith(suf) ? h.slice(0, -suf.length) : null; };

const app = express(); app.disable('x-powered-by'); app.set('trust proxy', 1);
// Tenant routing: <slug>.SITES_DOMAIN (custom domain later) or path-based /r/<slug>/ (works on plain onrender.com).
const ASSET_RE = /(["'`(])\/(?=api\/|img\/|owner|menu\.json|styles\.css|theme\.css|site-config\.js|pay\.js|app\.js|robots\.txt|\$\{)/g;
function proxyTo(req, res, slug, fwdPath, base) {
  ensureSite(slug).then(port => { const headers = Object.assign({}, req.headers, { 'x-forwarded-proto': req.protocol, 'x-forwarded-host': req.headers.host }); if (base) headers['accept-encoding'] = 'identity';
    const pr = http.request({ port, path: fwdPath, method: req.method, headers }, r => { const h = Object.assign({}, r.headers);
      if (base) { if (h.location && h.location.startsWith('/')) h.location = base + h.location;
        if (h['set-cookie']) h['set-cookie'] = [].concat(h['set-cookie']).map(c => c.replace(/;\s*Path=\/(?=;|$)/i, '; Path=' + base));
        if (/text\/html|javascript|text\/css/.test(h['content-type'] || '')) { const chunks = []; r.on('data', c => chunks.push(c)); r.on('end', () => {
          let t = Buffer.concat(chunks).toString('utf8').replace(ASSET_RE, '$1' + base + '/'); if (/javascript/.test(h['content-type'])) t = t.replace(/(['"])ctq_/g, '$1ctq_' + slug.replace(/-/g, '_') + '_');
          delete h['content-length']; delete h.etag; res.writeHead(r.statusCode, h); res.end(t); }); return; } }
      res.writeHead(r.statusCode, h); r.pipe(res); });
    pr.on('error', () => res.status(502).end('Site is waking up, refresh in a moment.')); req.pipe(pr); }).catch(() => res.status(404).send('No site here.')); }
app.use((req, res, next) => { const slug = tenantOf(req.headers.host); if (slug && /^[a-z0-9-]{1,40}$/.test(slug)) return proxyTo(req, res, slug, req.originalUrl, '');
  const m = /^\/r\/([a-z0-9-]{1,40})(\/.*)?$/.exec(req.path); if (!m) return next();
  if (!m[2]) return res.redirect(301, '/r/' + m[1] + '/' + (req.originalUrl.split('?')[1] ? '?' + req.originalUrl.split('?')[1] : ''));
  proxyTo(req, res, m[1], req.originalUrl.slice(('/r/' + m[1]).length), '/r/' + m[1]); });

app.use((req, res, next) => { res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; script-src 'self' https://*.googletagmanager.com; media-src 'self'; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'" }); next(); });
app.use(express.json({ limit: '30mb' }));
const buckets = new Map(); const limit = (name, max, ms) => (req, res, next) => { const k = name + req.ip, now = Date.now(); let b = buckets.get(k); if (!b || b.reset < now) buckets.set(k, b = { n: 0, reset: now + ms }); if (++b.n > max) return res.status(429).json({ ok: false, error: 'Too many tries. Please wait a bit.' }); next(); };

function decodeImage(dataUrl, max) { const m = /^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || '')); if (!m) return null; const buf = Buffer.from(m[3], 'base64'); if (buf.length > max) return null;
  const sig = buf.slice(0, 4).toString('hex'); const ok = m[2] === 'png' ? sig === '89504e47' : m[2] === 'jpeg' ? sig.startsWith('ffd8ff') : buf.slice(8, 12).toString() === 'WEBP'; return ok ? { mime: m[1], buf, ext: m[2] === 'jpeg' ? 'jpg' : m[2] } : null; }
const unsubToken = e => pipeline.unsubToken(e);

// ---------- pipeline (same code the CLI uses) ----------
const process_ = (s, o = {}) => pipeline.run(db, s, { save, onBuilt: r => { const p = procs.get(r.slug); if (p) p.child.kill(); if (o.onToken) o.onToken(r.token); } });
// ---------- public intake (no login) ----------
const emailOk = e => /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(e);
app.post('/api/intake', limit('intake', 5, 36e5), (req, res) => { const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot: bots fill hidden fields
  const s = { id: rid(8), created: new Date().toISOString(), name: str(b.name, 80), email: str(b.email, 200).toLowerCase(), phone: str(b.phone, 30), address: str(b.address, 200), hoursText: str(b.hours, 300), colors: { primary: hex(b.colors && b.colors.primary), accent: hex(b.colors && b.colors.accent) }, menuFiles: [], links: {} };
  for (const k of ['doordash', 'ubereats', 'grubhub', 'website']) { const v = str((b.links || {})[k], 500); if (!v) continue; let u; try { u = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v); } catch { u = null; } if (!u || !/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return res.status(400).json({ ok: false, error: `That ${({ doordash: 'DoorDash', ubereats: 'Uber Eats', grubhub: 'Grubhub', website: 'website' })[k]} link doesn't look like a URL.` }); s.links[k] = u.href; }
  if (!s.name || !emailOk(s.email)) return res.status(400).json({ ok: false, error: 'Add your restaurant name and a valid email.' });
  const imgs = (Array.isArray(b.menuImages) ? b.menuImages : []).slice(0, 6).map(x => decodeImage(x, 8e6)); if (imgs.some(x => !x)) return res.status(400).json({ ok: false, error: 'Menu photos must be JPG, PNG or WEBP, under 8 MB each (up to 6).' }); if (!imgs.length && !Object.keys(s.links).length) return res.status(400).json({ ok: false, error: 'Add menu photos or at least one link (DoorDash, Uber Eats, Grubhub or your website).' });
  let logo = null; if (b.logo) { logo = decodeImage(b.logo, 3e6); if (!logo) return res.status(400).json({ ok: false, error: 'Logo must be a JPG, PNG or WEBP under 3 MB.' }); }
  for (const im of imgs) { const f = s.id + '-menu-' + rid(3) + '.' + im.ext; fs.writeFileSync(path.join(DATA, 'uploads', f), im.buf); s.menuFiles.push(f); }
  if (logo) { s.logoFile = s.id + '-logo.' + logo.ext; fs.writeFileSync(path.join(DATA, 'uploads', s.logoFile), logo.buf); }
  let slug = gen.slugify(s.name), n = 1, c = slug; while (db.subs.some(x => x.slug === c)) c = slug + '-' + (++n); s.slug = c;
  db.subs.push(s); save(); res.json({ ok: true, id: s.id });
  notifyBot(s).finally(() => process_(s)); });
app.post('/api/contact', limit('contact', 5, 36e5), async (req, res) => { const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot
  const c = { created: new Date().toISOString(), topic: str(b.topic, 60), name: str(b.name, 80), restaurant: str(b.restaurant, 120), email: str(b.email, 200).toLowerCase(), phone: str(b.phone, 30), message: String(b.message || '').trim().slice(0, 4000) };
  if (!c.name) return res.status(400).json({ ok: false, error: 'Add your name.' });
  if (!emailOk(c.email)) return res.status(400).json({ ok: false, error: 'Add a valid email so we can reply.' });
  if (c.message.length < 5) return res.status(400).json({ ok: false, error: 'Add a short message.' });
  const to = env.BOT_INBOX_EMAIL; if (!to) { console.error('contact: no BOT_INBOX_EMAIL'); return res.status(503).json({ ok: false, error: 'Contact is down right now. Please try again later.' }); }
  try { const r = await mail.send(mail.contactEmail({ to, c }), path.join(DATA, 'outbox-contact')); console.log(`contact from ${c.email} via ${r.via}`); res.json({ ok: true }); }
  catch (e) { console.error('contact email failed: ' + e.message); res.status(502).json({ ok: false, error: "Couldn't send right now. Please try again in a minute." }); } });
async function notifyBot(s) { const to = env.BOT_INBOX_EMAIL; if (!to) { s.botEmail = 'no BOT_INBOX_EMAIL'; return; }
  const files = s.menuFiles.map((f, i) => ({ filename: `menu-${i + 1}${path.extname(f)}`, content: fs.readFileSync(path.join(DATA, 'uploads', f)) })).concat(s.logoFile ? [{ filename: 'logo' + path.extname(s.logoFile), content: fs.readFileSync(path.join(DATA, 'uploads', s.logoFile)) }] : []);
  try { const r = await mail.send(mail.botSubmissionEmail({ to, s, files, base: pipeline.baseUrl ? pipeline.baseUrl() : (env.BASE_URL || '') }), path.join(DATA, 'outbox')); s.botEmail = r.via === 'outbox' ? 'queued (no email sender set)' : 'sent via ' + r.via; console.log(`[${s.id}] bot notified at ${to} via ${r.via}${r.eml ? ' (' + r.eml + ')' : ''}`); }
  catch (e) { s.botEmail = 'failed: ' + e.message; console.error(`[${s.id}] bot email failed: ${e.message}`); } save(); }
app.get('/unsubscribe', (req, res) => { const e = String(req.query.e || '').toLowerCase(), t = String(req.query.t || ''); const ok = t.length === 32 && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(unsubToken(e)));
  if (ok && !db.unsubscribed.includes(e)) { db.unsubscribed.push(e); save(); } res.type('html').send(`<!doctype html><meta name=viewport content="width=device-width"><body style="font-family:sans-serif;padding:30px"><h2>${ok ? "You're unsubscribed." : 'That link is not valid.'}</h2><p>${ok ? "We won't email you again." : ''}</p>`); });
app.post('/unsubscribe', express.urlencoded({ extended: false }), (req, res) => { const e = String(req.query.e || '').toLowerCase(), t = String(req.query.t || ''); if (t.length === 32 && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(unsubToken(e))) && !db.unsubscribed.includes(e)) { db.unsubscribed.push(e); save(); } res.end('ok'); });

// ---------- Seven's admin (password, httpOnly cookie, CSRF header, rate limit) ----------
const ADMIN_HASH = env.ADMIN_PASSWORD_HASH || (env.ADMIN_PASSWORD ? bcrypt.hashSync(env.ADMIN_PASSWORD, 12) : null);
const COOKIE = PROD ? '__Host-msa' : 'msa';
const cookies = req => Object.fromEntries(String(req.headers.cookie || '').split(';').map(x => x.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
app.post('/api/admin/login', limit('alogin', 6, 15 * 60e3), async (req, res) => { if (!ADMIN_HASH) return res.status(503).json({ ok: false, error: 'Set ADMIN_PASSWORD on the server first.' });
  if (!(await bcrypt.compare(String((req.body || {}).password || '').slice(0, 200), ADMIN_HASH))) return res.status(401).json({ ok: false, error: 'Wrong password.' });
  const tok = rid(32), csrf = rid(16); db.sessions = db.sessions.filter(s => s.exp > Date.now()).concat({ h: sha(tok), csrf, exp: Date.now() + 7 * 864e5 }); save();
  res.set('Set-Cookie', `${COOKIE}=${tok}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${7 * 86400}${PROD ? '; Secure' : ''}`); res.json({ ok: true, csrf }); });
const admin = (req, res, next) => { const t = cookies(req)[COOKIE]; const s = t && db.sessions.find(s => s.h === sha(t) && s.exp > Date.now()); if (!s) return res.status(401).json({ ok: false, error: 'Log in' });
  if (req.method !== 'GET') { const h = String(req.get('x-csrf-token') || ''); if (h.length !== s.csrf.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(s.csrf))) return res.status(403).json({ ok: false, error: 'CSRF check failed' }); }
  req.sess = s; next(); };
app.post('/api/admin/subs/:id/notify-bot', admin, async (req, res) => { const s = db.subs.find(s => s.id === req.params.id); if (!s) return res.status(404).json({ ok: false }); await notifyBot(s); res.json({ ok: true, botEmail: s.botEmail }); });
app.get('/api/admin/me', admin, (req, res) => res.json({ ok: true, csrf: req.sess.csrf, ai: ai.provider(), mail: mail.kind(), autoSend: AUTO_SEND }));
app.get('/api/admin/subs', admin, (req, res) => res.json({ ok: true, subs: db.subs.slice().reverse().map(({ tokenHash, ...s }) => Object.assign(s, { unsubscribed: db.unsubscribed.includes(s.email) })) }));
app.get('/api/admin/upload/:f', admin, (req, res) => { const f = path.basename(req.params.f); if (!db.subs.some(s => s.menuFiles.includes(f) || s.logoFile === f)) return res.status(404).end(); res.sendFile(path.join(DATA, 'uploads', f)); });
app.put('/api/admin/subs/:id/menu', admin, (req, res) => { const s = db.subs.find(s => s.id === req.params.id); if (!s) return res.status(404).json({ ok: false }); s.menu = ai.clean(req.body.menu); save(); res.json({ ok: true, menu: s.menu }); });
// Rebuild + resend: new magic link each time (old one stops working).
app.post('/api/admin/subs/:id/resend', admin, async (req, res) => { const s = db.subs.find(s => s.id === req.params.id); if (!s) return res.status(404).json({ ok: false }); await process_(s); res.json({ ok: true, status: s.status, emailStatus: s.emailStatus, error: s.error }); });

// ---------- bot API (Bearer BOT_API_TOKEN): the EatDirect bot reads photos itself, no AI key needed ----------
const BOT = env.BOT_API_TOKEN || '';
const bot = (req, res, next) => { const h = String(req.get('authorization') || '').replace(/^Bearer /, ''); if (BOT.length < 24 || h.length !== BOT.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(BOT))) return res.status(401).json({ ok: false, error: 'Bad or missing bot token' }); next(); };
const botView = s => ({ id: s.id, created: s.created, status: s.status, links: s.links || {}, name: s.name, email: s.email, phone: s.phone, address: s.address, hours: s.hoursText, colors: s.colors, slug: s.slug, siteUrl: s.siteUrl, emailStatus: s.emailStatus, error: s.error, menu: s.menu || null,
  photos: s.menuFiles.map(f => ({ file: f, url: `/api/bot/files/${f}` })), logo: s.logoFile ? { file: s.logoFile, url: `/api/bot/files/${s.logoFile}` } : null });
app.get('/api/bot/pending', bot, (req, res) => res.json({ ok: true, pending: db.subs.filter(s => ['pending_bot', 'needs_review'].includes(s.status)).map(s => ({ id: s.id, name: s.name, status: s.status, created: s.created, photos: s.menuFiles.length })) }));
// Outbox: queued emails (no sender configured). The bot sends them from its own inbox, then marks them sent.
const OUT = path.join(DATA, 'outbox'); const outId = f => path.basename(f, '.json');
app.get('/api/bot/outbox', bot, (req, res) => { const list = (fs.existsSync(OUT) ? fs.readdirSync(OUT) : []).filter(f => f.endsWith('.json')).sort().map(f => { const m = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')); return { id: outId(f), to: m.to, subject: m.subject, text: m.text, html: m.html, headers: m.headers, attachments: m.attachments, botNotice: /^New EatDirect submission/.test(m.subject || '') }; }); res.json({ ok: true, outbox: list }); });
app.post('/api/bot/outbox/:id/sent', bot, (req, res) => { const id = path.basename(req.params.id), f = path.join(OUT, id + '.json'); if (!fs.existsSync(f)) return res.status(404).json({ ok: false, error: 'Not found' }); fs.renameSync(f, path.join(OUT, id + '.sent')); res.json({ ok: true, id }); });
app.get('/api/bot/submissions/:id', bot, (req, res) => { const s = db.subs.find(s => s.id === req.params.id); s ? res.json({ ok: true, submission: botView(s) }) : res.status(404).json({ ok: false, error: 'Not found' }); });
app.get('/api/bot/files/:f', bot, (req, res) => { const f = path.basename(req.params.f); if (!db.subs.some(s => s.menuFiles.includes(f) || s.logoFile === f)) return res.status(404).end(); res.sendFile(path.join(DATA, 'uploads', f)); });
// Item photos: bot posts item.image as a data: URL; stored in uploads and referenced as upload:<file>.
function storeItemImages(s, menu) { let n = 0; for (const c of menu.categories) for (const it of c.items) { if (!it.image) { delete it.image; continue; }
  if (/^upload:[\w.-]+$/.test(it.image) && fs.existsSync(path.join(DATA, 'uploads', it.image.slice(7)))) continue;
  const im = decodeImage(it.image, 3e6); if (!im) throw new Error(`item "${it.name}": image must be a JPG/PNG/WEBP data URL under 3 MB (bot.js converts URLs/files for you)`);
  if (++n > 60) throw new Error('max 60 item photos'); const f = s.id + '-item-' + rid(4) + '.' + im.ext; fs.writeFileSync(path.join(DATA, 'uploads', f), im.buf); it.image = 'upload:' + f; } return n; }
const validMenu = m => { const e = []; if (!m || !Array.isArray(m.categories) || !m.categories.length) e.push('categories must be a non-empty array');
  (m && Array.isArray(m.categories) ? m.categories : []).forEach((c, i) => { if (!c || typeof c.name !== 'string' || !c.name.trim()) e.push(`categories[${i}].name missing`); if (!Array.isArray(c && c.items) || !c.items.length) e.push(`categories[${i}].items must be a non-empty array`);
    ((c && c.items) || []).forEach((it, j) => { if (!it || typeof it.name !== 'string' || !it.name.trim()) e.push(`categories[${i}].items[${j}].name missing`); if (typeof it.price !== 'number' || !(it.price >= 0) || it.price > 1000) e.push(`categories[${i}].items[${j}].price must be a number in dollars (0-1000)`); if (it.description != null && typeof it.description !== 'string') e.push(`categories[${i}].items[${j}].description must be a string`); }); });
  return e.slice(0, 20); };
app.post('/api/bot/submissions/:id/menu', bot, (req, res) => { const s = db.subs.find(s => s.id === req.params.id); if (!s) return res.status(404).json({ ok: false, error: 'Not found' });
  const errs = validMenu(req.body && req.body.menu); if (errs.length) return res.status(400).json({ ok: false, error: 'Menu JSON is invalid', details: errs });
  let photos = 0; try { photos = storeItemImages(s, req.body.menu); } catch (e) { return res.status(400).json({ ok: false, error: 'Menu JSON is invalid', details: [e.message] }); }
  s.menu = ai.clean(req.body.menu); s.status = 'menu_ready'; s.error = ''; save(); res.json({ ok: true, categories: s.menu.categories.length, items: s.menu.categories.reduce((a, c) => a + c.items.length, 0), photos }); });
app.post('/api/bot/submissions/:id/build', bot, async (req, res) => { const s = db.subs.find(s => s.id === req.params.id); if (!s) return res.status(404).json({ ok: false, error: 'Not found' });
  if (!s.menu) return res.status(400).json({ ok: false, error: 'Submit the menu first' });
  if (s.status === 'live' && !(req.body && req.body.force)) return res.status(409).json({ ok: false, error: 'Already live at ' + s.siteUrl + '. Pass force to rebuild (this makes a NEW dashboard link; the old one stops working).', siteUrl: s.siteUrl });
  let token = ''; await process_(s, { onToken: t => { token = t; } });
  const live = s.status === 'live'; res.json({ ok: live, id: s.id, status: s.status, siteUrl: s.siteUrl, dashboardUrl: live && token ? s.siteUrl + '/owner#key=' + token : null, owner: { name: s.name, email: s.email, phone: s.phone }, error: s.error || undefined }); });

app.get('/sw.js', (req, res) => { res.set({ 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' }); res.sendFile(path.join(__dirname, 'public', 'sw.js')); });
app.get('/offline.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'offline.html')));
app.use('/static', express.static(path.join(__dirname, 'public')));
const page = f => (req, res) => res.sendFile(path.join(__dirname, 'public', f));
app.get('/', page('index.html')); app.get('/start', page('start.html')); app.get('/admin', (req, res, n) => { res.set('X-Robots-Tag', 'noindex'); n(); }, page('admin.html'));
app.get('/demo-dashboard', (req, res) => res.redirect(302, '/r/' + demoDash.SLUG + '/owner'));
app.get('/healthz', (req, res) => res.json({ ok: true, ai: ai.provider(), mail: mail.kind(), sites: procs.size }));
if (require.main === module) app.listen(PORT, () => console.log(`EatDirect platform :${PORT} ai=${ai.provider()} mail=${mail.kind()} autoSend=${AUTO_SEND}`));
module.exports = { app, db, procs };
