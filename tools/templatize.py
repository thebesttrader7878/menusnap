# One-time: turn a copy of Christy's site (christys-v2) into the reusable template.
# Every Christy-specific string becomes a value read from site.json (server) or window.SITE (browser).
import re, sys, pathlib
T = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'template')
N = "Kimmie’s-Christy's Tasty Queen"
def patch(f, pairs):
    p = T / f; s = p.read_text()
    for a, b in pairs:
        if isinstance(a, re.Pattern):
            s2 = a.sub(lambda m: b, s, count=1)
        else:
            s2 = s.replace(a, b, 1)
        if s2 == s: sys.exit(f'PATCH MISS in {f}: {a!r:.120}')
        s = s2
    p.write_text(s)

# ---------- storefront ----------
patch('public/app.js', [
  (f'// {N} storefront.', '// Restaurant storefront (EatDirect template, from the restaurant shell).'),
  ("  const DAYS = ['Sun',", "  const SITE = window.SITE || {};\n  const DAYS = ['Sun',"),
  (re.compile(r"    name: \"Kimmie’s-Christy's Tasty Queen\", phone: '\(913\) 300-0130', address: '1405 S 55th St, Kansas City, KS 66106',\n    doordashUrl: '[^']*',"),
   "    name: SITE.name, phone: SITE.phone || '', address: SITE.address || '',\n    doordashUrl: SITE.doordashUrl || '',"),
  ("    taxRate: 9.125, // example rate, confirm with owner / accountant", "    taxRate: SITE.taxRate || 0,"),
  ("    pickupMins: 15,", "    pickupMins: SITE.pickupMins || 15,"),
  (re.compile(r"    hours: DAYS\.map\(\(\) => \(\{ open: '10:00', close: '18:00', closed: false \}\)\)[^\n]*"), "    hours: SITE.hours || DAYS.map(() => ({ open: '10:00', close: '18:00', closed: false }))"),
  (f'aria-label="{N} home"', 'aria-label="${esc(SITE.name)} home"'),
  (f'alt="{N} logo"', 'alt="${esc(SITE.name)} logo"'),
  ("Kimmie’s-Christy's<b>Tasty Queen</b>", '<b>${esc(SITE.name)}</b>'),
  ("const PAL = [['#d7263d', '#8f1424'], ['#ff8a3d', '#d7263d'], ['#1d1b1a', '#4a2a22'], ['#ffc93c', '#ff8a3d']];",
   "const C = SITE.colors || {}; const PAL = [[C.primary || '#d7263d', C.primaryDark || '#8f1424'], [C.accent || '#ffc93c', C.primary || '#d7263d'], ['#1d1b1a', C.deep || '#4a2a22'], [C.primaryDark || '#8f1424', C.deep || '#5e0f1b']];"),
  ('<span class="swirl">🍦</span>', '<span class="swirl">${esc(SITE.emoji || "🍽️")}</span>'),
  ('<span class="fbt">Christy\'s</span>', '<span class="fbt">${esc(SITE.shortName || SITE.name)}</span>'),
  ('Your order goes straight to a Turner neighborhood favorite, not a big app.', 'Your order goes straight to ${esc(SITE.shortName || SITE.name)}, not a big app.'),
  ("Your order hits Christy's kitchen right away", "Your order hits our kitchen right away"),
  ("<b>Straight from Christy's.</b>", "<b>Straight from ${esc(SITE.shortName || SITE.name)}.</b>"),
  (re.compile(r"  const DDR = \{[^\n]*\n  const HERO = \[[^\n]*"), "  const DDR = SITE.ratings || {}; // only real ratings, never invented\n  const HERO = SITE.heroItems || [];"),
  ("${it.id === 'flavor-option' ? 'Shakes &amp; malts' : esc(it.name) + ' · ' + m(it.price)}", "${esc(it.name) + ' · ' + m(it.price)}"),
  ('const CATICON = {', 'const CATICON = SITE.catIcons || {'),
  ('encodeURIComponent("Kimmie’s-Christy\'s Tasty Queen " + s.address)', 'encodeURIComponent(SITE.name + " " + s.address)'),
  (f'<img class="hlogo" src="/img/logo.jpg" alt="{N}" data-testid="hero-logo">', '<img class="hlogo" src="/img/logo.jpg" alt="${esc(SITE.name)}" data-testid="hero-logo">'),
  (f'<p class="hname" data-testid="hero-name">{N}</p>', '<p class="hname" data-testid="hero-name">${esc(SITE.name)}</p>'),
  ('<span class="chip">📍 Turner, KCK</span>', '${SITE.area ? `<span class="chip">📍 ${esc(SITE.area)}</span>` : ""}'),
  ('<h1>Crispy tenderloins.<br>Real burgers.<br><em>Cold soft serve.</em></h1>', '<h1>${(SITE.headline || ["Made fresh.", "Order ahead."]).slice(0, -1).map(esc).join("<br>")}<br><em>${esc((SITE.headline || ["Skip the wait."]).slice(-1)[0])}</em></h1>'),
  ("<p>Turner's neighborhood drive-in at ${esc(s.address.split(',')[0])}. Order ahead and it's hot when you pull up.</p>", "<p>${esc(SITE.subline || ('Order ahead from ' + SITE.name + ' and it\\'s hot when you pull up.'))}</p>"),
  ('href="#c-sandwiches" data-act="tomenu"', 'href="#menu" data-act="tomenu"'),
  ("${ddBtn(s, 'hero')}</div></div></section>", "${s.doordashUrl ? ddBtn(s, 'hero') : ''}</div></div></section>"),
  (re.compile(r'      <section class="proof wrap reveal" data-testid="proof">.*?</section>\n'), '      ${(SITE.proof || []).length ? `<section class="proof wrap reveal" data-testid="proof">${SITE.proof.map(p => `<div><b>${esc(p.big)}</b><span>${esc(p.text)}</span></div>`).join("")}</section>` : ""}\n'),
  ('placeholder="Search tenderloin, shakes, onion rings..."', 'placeholder="${esc(SITE.searchHint || "Search the menu...")}"'),
  ("const note = /Sandwiches|Other Favorites/.test(c.name) ? 'Make it a basket: french fries and 3 onion rings.' : '';", "const note = (SITE.catNotes || {})[c.id] || '';"),
  (f'<footer class="foot"><b>{N}</b>', '<footer class="foot"><b>${esc(SITE.name)}</b>'),
  ('placeholder="No onions, extra pickles..."', 'placeholder="Any special requests?"'),
])
s = (T / 'public/app.js').read_text()
assert 'Christy' not in s and 'Turner' not in s, [l for l in s.splitlines() if 'Christy' in l or 'Turner' in l]
# popular list may be empty for AI menus
s = s.replace("${q ? '' : `<section class=\"sec reveal\"><div class=\"sech\"><span class=\"kicker\">Fan favorites</span>", "${q || !(S.menu.popular || []).length ? '' : `<section class=\"sec reveal\"><div class=\"sech\"><span class=\"kicker\">Fan favorites</span>", 1)
(T / 'public/app.js').write_text(s)

# index.html: rendered by server with escaped values
idx = (T / 'public/index.html').read_text()
idx = re.sub(r'<title>.*?</title>', '<title>{{TITLE}}</title>', idx)
idx = re.sub(r'(<meta property="og:site_name" content=")[^"]*', r'\1{{NAME}}', idx)
idx = re.sub(r'(<meta property="og:title" content=")[^"]*', r'\1{{NAME}} | Order Pickup Online', idx)
idx = re.sub(r'(<meta property="og:description" content=")[^"]*', r'\1{{DESC}}', idx)
idx = re.sub(r'(<meta name="description" content=")[^"]*', r'\1{{DESC}}', idx)
idx = re.sub(r'(<meta property="og:url" content=")[^"]*', r'\1{{URL}}/', idx)
idx = re.sub(r'(<meta property="og:image" content=")[^"]*', r'\1{{URL}}/img/logo.jpg', idx)
idx = re.sub(r'(<meta name="(application-name|apple-mobile-web-app-title)" content=")[^"]*', r'\1{{NAME}}', idx)
idx = re.sub(r'(<meta name="theme-color" content=")[^"]*', r'\1{{COLOR}}', idx)
idx = idx.replace('<link rel="stylesheet" href="/styles.css">', '<link rel="stylesheet" href="/styles.css">\n<link rel="stylesheet" href="/theme.css">')
idx = idx.replace('<script src="/pay.js"></script>', '<script src="/site-config.js"></script>\n<script src="/pay.js"></script>')
assert 'Christy' not in idx; (T / 'public/index.html').write_text(idx)

# ---------- owner dashboard: magic link instead of email/password ----------
o = (T / 'owner/index.html').read_text().replace(f'<title>Owner · {N}</title>', '<title>Owner dashboard</title>').replace('<script src="/owner/owner.js">', '<script src="/site-config.js"></script>\n<link rel="stylesheet" href="/theme.css">\n<script src="/owner/owner.js">')
(T / 'owner/index.html').write_text(o)
patch('owner/owner.js', [
  (f'// Owner dashboard for {N}.', '// Owner dashboard (EatDirect template). Opened with a secret magic link, no password.'),
  (re.compile(r"  const login = \(\) => `<main class=\"login\">.*?</main>`;", re.S),
   "  const login = () => `<main class=\"login\"><img src=\"/img/logo-180.jpg\" alt=\"\" class=\"logo\"><h1>Owner dashboard</h1><p class=\"mut\">${esc((window.SITE || {}).name || '')}</p>\n    <div class=\"card\"><p data-testid=\"login-err\">${esc(S.err || 'Open the private dashboard link we emailed you. Lost it? Ask us for a new one.')}</p></div>\n    <p class=\"fine\">Customers can’t see this page. <a href=\"/\">Back to the store</a></p></main>`;"),
  ('<span class="fine">Kimmie’s-Christy\'s Tasty Queen</span>', '<span class="fine">${esc((window.SITE || {}).name || \'\')}</span>'),
  ("  fromHash();\n  api('/api/admin/me')", "  // Magic link: /owner#key=<token>. The token never hits server logs (fragment) and is wiped from the address bar.\n  const mk = (location.hash.match(/key=([A-Za-z0-9_-]{32,128})/) || [])[1];\n  if (mk) history.replaceState(null, '', location.pathname);\n  fromHash();\n  (mk ? api('/api/owner/magic', { method: 'POST', body: { token: mk } }).catch(e => { S.err = e.message; }) : Promise.resolve())\n  .then(() => api('/api/admin/me'))"),
])

# ---------- server ----------
patch('server.js', [
  (f'// {N}: storefront, server-side orders, owner dashboard API.', "// Restaurant ordering site (EatDirect template, built from the restaurant shell). Everything restaurant-specific comes from SITE_DIR/site.json."),
  ("const env = process.env;", "const env = process.env;\nconst SITE_DIR = path.resolve(env.SITE_DIR || path.join(__dirname, 'site'));\nconst SITE = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'site.json'), 'utf8'));"),
  (f'const NAME = "{N}";', 'const NAME = SITE.name;'),
  ("const SITE_URL = env.SITE_URL || 'https://kimmies-christys-tasty-queen.onrender.com';", "const SITE_URL = (env.SITE_URL || SITE.siteUrl || 'http://localhost:' + PORT).replace(/\\/$/, '');"),
  ("const DEFAULT_TO = 'keys4cash.io@gmail.com';", "const DEFAULT_TO = SITE.ownerEmail || '';"),
  ("const DEFAULT_WEBHOOK = 'https://formspree.io/f/xnppbzpy';", "const DEFAULT_WEBHOOK = SITE.orderWebhook || '';"),
  ("const PLATFORM_FEE_CENTS = Math.max(0, parseInt(env.PLATFORM_FEE_CENTS || '0', 10) || 0);", "const PLATFORM_FEE_CENTS = Math.max(0, parseInt(env.PLATFORM_FEE_CENTS || '150', 10) || 0);"),
  ("const OWNER_EMAIL = (env.OWNER_EMAIL || '').trim().toLowerCase();\nconst OWNER_HASH = env.OWNER_PASSWORD ? bcrypt.hashSync(env.OWNER_PASSWORD, 12) : null;",
   "// Magic-link owner auth: only sha256(token) is stored (env OWNER_TOKEN_HASH, or the store after a regenerate).\nconst OWNER_EMAIL = (SITE.ownerEmail || 'owner').trim().toLowerCase();\nconst OWNER_HASH = null; // passwords are not used in this template\nconst ownerTokenHash = async () => (await store.getKV('ownerTokenHash', '')) || (env.OWNER_TOKEN_HASH || '').trim().toLowerCase();\nconst tokenEpoch = { at: 0 };"),
  ("update('ctq-owner-session-v1|' + (env.SESSION_SECRET || (OWNER_EMAIL + '|' + (env.OWNER_PASSWORD || ''))))", "update('ms-owner-session-v1|' + (env.SESSION_SECRET || env.OWNER_TOKEN_HASH || crypto.randomBytes(32).toString('hex')))"),
  ("const menu = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'menu.json'), 'utf8'));", "const menu = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'menu.json'), 'utf8'));\nstore.init().then(async () => { tokenEpoch.at = +(await store.getKV('tokenEpoch', 0)) || 0; }).catch(() => {});"),
  (re.compile(r"const DEF_SETTINGS = \{ taxRate: 9\.125, pickupMins: 15, acceptOrders: true, pos: 'none', doordashUrl: '[^']*', hours: [^\n]*"),
   "const DEF_SETTINGS = { taxRate: SITE.taxRate || 0, pickupMins: SITE.pickupMins || 15, acceptOrders: true, pos: 'none', doordashUrl: SITE.doordashUrl || '', hours: SITE.hours || Array.from({ length: DAYS }, () => ({ open: '10:00', close: '18:00', closed: false })) };"),
  ("from: SMTP_USER || 'orders@christys-demo.local'", "from: SMTP_USER || 'orders@eatdirect.local'"),
  ("const exp = +m[2]; if (exp < Date.now() || revoked.has(m[3])) return null;", "const exp = +m[2]; if (exp < Date.now() || revoked.has(m[3]) || exp - KEEP_MS < tokenEpoch.at) return null;"),
  (re.compile(r"app\.post\('/api/owner/login', async \(req, res\) => \{.*?\n\}\);\n", re.S),
   """app.post('/api/owner/magic', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const ip = ipOf(req), now = Date.now(); const f = (fails.get(ip) || []).filter(t => now - t < LIMIT.windowMs); fails.set(ip, f);
  if (f.length >= LIMIT.max) return res.status(429).json({ ok: false, error: 'Too many tries. Wait 15 min and try again.' });
  const want = await ownerTokenHash(); const tok = String((req.body || {}).token || '');
  if (!/^[a-f0-9]{64}$/.test(want)) return res.status(503).json({ ok: false, error: 'Dashboard link is not set up yet.' });
  const got = crypto.createHash('sha256').update(tok).digest('hex');
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(tok) || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want))) { f.push(now); return res.status(401).json({ ok: false, error: 'That dashboard link is old or wrong. Ask for a new one.' }); }
  fails.delete(ip); setCookie(req, res, makeToken(now + KEEP_MS), KEEP_MS / 1000); res.json({ ok: true });
});
"""),
  ("app.get('/api/admin/me', (req, res) =>", """// Owner can regenerate their own link: old link and every signed-in device stop working.
app.post('/api/admin/magic/regenerate', async (req, res) => { const tok = crypto.randomBytes(32).toString('base64url');
  await store.setKV('ownerTokenHash', crypto.createHash('sha256').update(tok).digest('hex')); tokenEpoch.at = Date.now(); await store.setKV('tokenEpoch', tokenEpoch.at);
  setCookie(req, res, makeToken(Date.now() + KEEP_MS), KEEP_MS / 1000); res.json({ ok: true, link: SITE_URL + '/owner#key=' + tok }); });
app.get('/api/admin/me', (req, res) =>"""),
  ('filename="christys-${req.params.kind}', 'filename="orders-${req.params.kind}'),
  ("app.get('/robots.txt',", """// Site config + brand theme come from SITE_DIR
const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const PUBLIC_SITE = (({ ownerEmail, orderWebhook, ...pub }) => pub)(SITE);
app.get('/site-config.js', (req, res) => res.type('application/javascript').set('Cache-Control', 'no-cache').send('window.SITE=' + JSON.stringify(PUBLIC_SITE).replace(/</g, '\\\\u003c') + ';'));
app.get('/theme.css', (req, res) => { const c = SITE.colors || {}, ok = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v : null; const p = ok(c.primary) || '#d7263d', p2 = ok(c.primaryDark) || '#a91a2e', d = ok(c.deep) || '#5e0f1b', a = ok(c.accent) || '#ffc93c';
  res.type('text/css').set('Cache-Control', 'no-cache').send(`:root{--red:${p};--red2:${p2};--deep:${d};--yel:${a}}.hero{background:radial-gradient(900px 500px at 85% 0%,${p}55,transparent 60%),radial-gradient(700px 400px at 0% 100%,${a}22,transparent 60%),linear-gradient(160deg,${p},${d})}`); });
const INDEX = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
const sendIndex = (req, res) => res.type('html').send(INDEX.replace(/\\{\\{TITLE\\}\\}/g, escH(NAME + ' | Order Pickup Online')).replace(/\\{\\{NAME\\}\\}/g, escH(NAME)).replace(/\\{\\{DESC\\}\\}/g, escH(SITE.description || ('Order pickup online from ' + NAME + (SITE.address ? ', ' + SITE.address : '') + '.'))).replace(/\\{\\{URL\\}\\}/g, escH(SITE_URL)).replace(/\\{\\{COLOR\\}\\}/g, escH((SITE.colors || {}).primary || '#d7263d')));
app.get(['/', '/index.html'], sendIndex);
app.get('/menu.json', (req, res) => res.set('Cache-Control', 'no-cache').sendFile(path.join(SITE_DIR, 'menu.json')));
app.use('/img', express.static(path.join(SITE_DIR, 'img'), { maxAge: '1d' }));
app.get('/robots.txt',"""),
  ("ownerLogin: !!(OWNER_EMAIL && OWNER_HASH)", "ownerLink: !!(env.OWNER_TOKEN_HASH), site: SITE.slug"),
  ("app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));", "app.get('*', sendIndex);"),
  ("owner login ${OWNER_HASH ? 'on' : 'OFF'}", "owner link ${env.OWNER_TOKEN_HASH ? 'on' : 'OFF'}"),
])
s = (T / 'server.js').read_text(); assert 'Christy' not in s and 'christys' not in s, [l[:120] for l in s.splitlines() if 'hrist' in l]
print('templatized OK')

# ================= part 2: subscription gate ($99/mo), preview mode, powered-by =================
patch('server.js', [
  ("const getStripe = async () =>", """// Preview mode: no orders of any kind until Seven turns the site on (ORDERING_LIVE=1 after he sets up billing + Stripe by hand).
const isLive = async () => env.ORDERING_LIVE === '1';
const getStripe = async () =>"""),
  ("  res.json({ settings: { taxRate: s.taxRate, pickupMins: s.pickupMins, acceptOrders: s.acceptOrders,", "  const live = await isLive();\n  res.json({ preview: !live, settings: { taxRate: s.taxRate, pickupMins: s.pickupMins, acceptOrders: s.acceptOrders && live,"),
  ("    const s = await getSettings(); if (!s.acceptOrders) return res.status(409).json({ ok: false, error: 'We are not taking online orders right now.' });",
   "    const s = await getSettings(); if (!(await isLive())) return res.status(409).json({ ok: false, error: 'Online ordering opens soon. Please call to order.' }); if (!s.acceptOrders) return res.status(409).json({ ok: false, error: 'We are not taking online orders right now.' });"),
  ("    const s = await getSettings(); if (!s.acceptOrders) return res.status(409).json({ ok: false, error: 'We are not taking online orders right now.' });",
   "    const s = await getSettings(); if (!(await isLive())) return res.status(409).json({ ok: false, error: 'Online ordering opens soon. Please call to order.' }); if (!s.acceptOrders) return res.status(409).json({ ok: false, error: 'We are not taking online orders right now.' });"),
  ("app.get('/api/admin/me', (req, res) =>", "app.get('/api/admin/plan', async (req, res) => res.json({ ok: true, live: await isLive() }));\napp.get('/api/admin/me', (req, res) =>"),
])
patch('public/app.js', [
  ('  const header = () => `<header class="top">', '  const header = () => (S.cfg.preview ? `<div class="pvbar" data-testid="preview-bar">👀 Preview · online ordering opens soon. Call ${esc(settings().phone)} to order today.</div>` : \'\') + `<header class="top">'),
  ('<span class="fine">Demo ordering site. Payments are simulated test mode, no real money.</span></footer>', '${SITE.poweredBy ? `<a class="fine pw" href="${esc(SITE.poweredBy.url)}" target="_blank" rel="noopener" data-testid="powered-by">Powered by ${esc(SITE.poweredBy.name)} · Get a site like this</a>` : \'\'}</footer>'),
])
with open(T / 'public/styles.css', 'a') as f: f.write('\n.pvbar{background:#1a1412;color:#fff;text-align:center;font-weight:700;font-size:13px;padding:9px 12px}.foot .pw{display:block;margin-top:6px;color:var(--mut)}\n')
patch('owner/owner.js', [
  ("app.innerHTML = `<header class=\"top\"><b>Owner dashboard</b><span class=\"fine\">${esc((window.SITE || {}).name || '')}</span></header>",
   "app.innerHTML = `<header class=\"top\"><b>Owner dashboard</b><span class=\"fine\">${esc((window.SITE || {}).name || '')}</span></header>${planBox()}"),
  ("  // ---------- login ----------", """  // ---------- plan: preview -> Keep my site ($99/mo) -> Stripe Connect ----------
  const planBox = () => { const p = S.plan; if (!p || p.live) return '';
    return `<div class="card plan" data-testid="plan-box"><b>Your site is in free preview.</b><p class="mut">Customers can see your menu, but online ordering is off. Like it? It's $99/month plus $1.50 per order. Just reply to the email we sent and we'll turn ordering on.</p></div>`; };
  const loadPlan = () => api('/api/admin/plan').then(p => { S.plan = p; render(); }).catch(() => {});

  // ---------- login ----------"""),
  ("  .then(() => api('/api/admin/me'))", "  .then(() => api('/api/admin/me')).then(me => { loadPlan(); return me; })"),
])
with open(T / 'owner/owner.css', 'a') as f: f.write('\n.plan{margin:12px;border:2px solid var(--red,#d7263d)}.plan .btn{margin-top:8px}\n')
for f in ['README.md', 'render.yaml']: (T / f).unlink(missing_ok=True)
import json
pj = json.loads((T / 'package.json').read_text()); pj['name'] = 'menusnap-restaurant-site'; pj['description'] = 'EatDirect restaurant ordering site template'; (T / 'package.json').write_text(json.dumps(pj, indent=2) + '\n')
(T / 'package-lock.json').write_text((T / 'package-lock.json').read_text().replace('"christys-tasty-queen"', '"menusnap-restaurant-site"'))
patch('server.js', [("const ownerTokenHash = async () => (await store.getKV('ownerTokenHash', '')) || (env.OWNER_TOKEN_HASH || '').trim().toLowerCase();",
  "const tokenFile = () => { try { return fs.readFileSync(path.join(SITE_DIR, 'owner-token.hash'), 'utf8').trim(); } catch (e) { return ''; } };\nconst ownerTokenHash = async () => (await store.getKV('ownerTokenHash', '')) || tokenFile() || (env.OWNER_TOKEN_HASH || '').trim().toLowerCase();")])
patch('server.js', [("app.post('/api/owner/magic',", """// CSRF: owner writes must be same-origin JSON (cross-site forms cannot send application/json without a CORS preflight, which we never allow).
app.use(['/api/admin', '/api/owner'], (req, res, next) => { if (req.method === 'GET' || req.method === 'HEAD') return next();
  const o = req.get('origin'); let okO = true; try { okO = !o || new URL(o).host === req.get('host'); } catch (e) { okO = false; }
  if (!okO || !/^application\\/json/.test(req.get('content-type') || '')) return res.status(403).json({ ok: false, error: 'Blocked (cross-site request).' }); next(); });
app.post('/api/owner/magic',""")])
print('part 2 OK')
