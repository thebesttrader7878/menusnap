// Template generator: restaurant config (+ AI menu + logo) -> sites/<slug>/ {site.json, menu.json, img/, owner-token.hash}
// The template (template/) never changes per restaurant; it reads everything from SITE_DIR.
// CLI: node gen/build-site.js path/to/restaurant.json [outRoot]
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'restaurant';
const hex = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v.toLowerCase() : null;
const shade = (h, f) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f))).toString(16).padStart(2, '0')).join('');
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
function colorsFrom(c = {}) { let p = hex(c.primary) || '#d7263d'; if (lum(p) > 0.75) p = shade(p, 0.55); // keep white text readable
  const a = hex(c.accent) && hex(c.accent) !== p ? hex(c.accent) : '#ffc93c'; return { primary: p, primaryDark: shade(p, 0.78), deep: shade(p, 0.42), accent: a }; }
function toShellMenu(ai) { const items = {}, categories = [], used = new Set();
  const uid = s => { let b = slugify(s), id = b, n = 1; while (used.has(id)) id = b + '-' + (++n); used.add(id); return id; };
  for (const c of (ai.categories || [])) { const cid = uid('c-' + c.name).replace(/^c-/, ''); const ids = [];
    for (const it of c.items || []) { if (!it.name) continue; const id = uid(it.name); ids.push(id);
      items[id] = { id, name: String(it.name).slice(0, 120), description: String(it.description || '').slice(0, 400), price: Math.round((+it.price || 0) * 100) / 100, image: '', modifiers: [] }; }
    if (ids.length) categories.push({ id: cid, name: String(c.name).slice(0, 80), items: ids }); }
  return { source: 'MenuSnap menu extraction', popular: [], categories, items }; }
const DAYN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
function hoursFrom(h) { if (Array.isArray(h) && h.length === 7) return h.map(d => ({ open: /^\d\d:\d\d$/.test(d.open) ? d.open : '11:00', close: /^\d\d:\d\d$/.test(d.close) ? d.close : '21:00', closed: !!d.closed }));
  return DAYN.map(() => ({ open: '11:00', close: '21:00', closed: false })); }
function build(cfg, outRoot, opts = {}) {
  const slug = slugify(cfg.slug || cfg.name), dir = path.join(outRoot, slug); fs.mkdirSync(path.join(dir, 'img'), { recursive: true });
  const site = { slug, name: String(cfg.name).slice(0, 80), shortName: String(cfg.shortName || cfg.name).slice(0, 40), phone: String(cfg.phone || '').slice(0, 30), address: String(cfg.address || '').slice(0, 200),
    area: String(cfg.area || '').slice(0, 40), ownerEmail: String(cfg.email || '').toLowerCase(), siteUrl: cfg.siteUrl || '', taxRate: +cfg.taxRate || 0, pickupMins: +cfg.pickupMins || 15, hours: hoursFrom(cfg.hours), hoursText: String(cfg.hoursText || '').slice(0, 300),
    colors: colorsFrom(cfg.colors), emoji: '🍽️', headline: cfg.headline || ['Made fresh.', 'Ready when you are.', 'Order pickup online.'], subline: cfg.subline || `Order ahead from ${cfg.name} and skip the line.`,
    searchHint: 'Search the menu...', doordashUrl: '', heroItems: [], ratings: {}, proof: [], catIcons: {}, catNotes: {}, planPrice: cfg.planPrice || '$99/month', poweredBy: cfg.poweredBy || { name: 'MenuSnap', url: 'https://menusnap.onrender.com/?ref=' + slug } };
  fs.writeFileSync(path.join(dir, 'site.json'), JSON.stringify(site, null, 1));
  fs.writeFileSync(path.join(dir, 'menu.json'), JSON.stringify(toShellMenu(cfg.menu || {}), null, 1));
  if (opts.logo) for (const f of ['logo.jpg', 'logo-180.jpg', 'favicon.png']) fs.writeFileSync(path.join(dir, 'img', f), opts.logo); // browsers sniff the real format
  let token = null; if (opts.newToken !== false) { token = crypto.randomBytes(32).toString('base64url'); fs.writeFileSync(path.join(dir, 'owner-token.hash'), crypto.createHash('sha256').update(token).digest('hex')); }
  return { slug, dir, site, token, tokenHash: token && crypto.createHash('sha256').update(token).digest('hex') };
}
module.exports = { build, toShellMenu, colorsFrom, slugify };
if (require.main === module) { const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const r = build(cfg, process.argv[3] || path.join(__dirname, '..', 'sites'));
  console.log(JSON.stringify({ slug: r.slug, dir: r.dir, dashboardKey: r.token }, null, 1)); }
