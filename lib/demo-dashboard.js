// Public read-only owner dashboard demo for the landing page. Builds "Sample Pizza Co" from the real template
// into a temp dir with made up orders dated around today, so the dashboard always looks current. Nothing here is real.
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const gen = require('../gen/build-site');
const SLUG = 'demo-dashboard';
const MENU = { categories: [
  { name: 'Pizzas', items: [{ name: 'Sample Pepperoni Pizza', description: 'Mozzarella, pepperoni, red sauce', price: 16 }, { name: 'Sample Margherita', description: 'Fresh mozzarella, basil', price: 15 }, { name: 'Sample Supreme', description: 'Sausage, peppers, onions, olives', price: 19 }] },
  { name: 'Wings & Sides', items: [{ name: 'Sample Wings (10)', description: 'Buffalo or BBQ', price: 13 }, { name: 'Garlic Knots', description: 'Six knots, marinara', price: 6 }, { name: 'Caesar Salad', description: 'Romaine, parmesan, croutons', price: 9 }] },
  { name: 'Drinks', items: [{ name: 'Fountain Soda', description: '', price: 3 }, { name: 'Sweet Tea', description: '', price: 3 }] }] };
const NAMES = ['Sample Customer A', 'Sample Customer B', 'Sample Customer C', 'Sample Customer D', 'Sample Customer E', 'Sample Customer F'];
const r2 = n => Math.round(n * 100) / 100;
function seed(dir) {
  const menu = JSON.parse(fs.readFileSync(path.join(dir, 'menu.json'), 'utf8')), ids = Object.keys(menu.items), now = Date.now(), orders = [], events = [];
  let seq = 1000, rnd = 7; const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  const mk = (ago, status, lines, pay) => { const created = new Date(now - ago).toISOString(); const items = lines.map(([i, q]) => { const it = menu.items[ids[i]]; return { id: it.id, name: it.name, price: it.price, qty: q, mods: [], note: '', lineTotal: r2(it.price * q) }; });
    const subtotal = r2(items.reduce((a, l) => a + l.lineTotal, 0)), tip = r2(Math.round(subtotal * 0.15)), total = r2(subtotal + tip);
    const log = [{ at: created, status: 'new' }]; ['preparing', 'ready', 'completed'].slice(0, ['new', 'preparing', 'ready', 'completed'].indexOf(status)).forEach((s, k) => log.push({ at: new Date(now - ago + (k + 1) * 6e5).toISOString(), status: s }));
    orders.push({ id: String(++seq), token: crypto.randomBytes(12).toString('hex'), created, updated: log[log.length - 1].at, status, mode: 'pickup', when: 'asap', customer: { name: NAMES[seq % NAMES.length], phone: '(555) 010-' + String(1000 + seq).slice(-4), email: '' }, notes: '',
      items, subtotal, tax: 0, tip, deliveryFee: 0, total, payment: pay === 'store' ? { method: 'store', label: 'Pay at pickup', id: 'pay_instore_' + seq, fee: 0, demo: true } : { method: 'card', label: 'Card •••• 4242 (demo)', id: 'pi_demo_' + seq, fee: r2(total * 0.029 + 0.3), demo: true }, refunds: [], refunded: 0, sid: '', log }); };
  for (let d = 6; d >= 1; d--) for (let k = 0; k < 9 + (d % 3) * 3; k++) mk(d * 864e5 + (2 + rand() * 9) * 36e5, 'completed', [[Math.floor(rand() * 3), 1 + Math.floor(rand() * 2)], [3 + Math.floor(rand() * 5), 1]], rand() < 0.25 ? 'store' : 'card');
  const today = [[150, 'completed', [[0, 2], [4, 1]]], [125, 'completed', [[2, 1], [6, 2]]], [100, 'completed', [[1, 1], [3, 1]]], [75, 'completed', [[0, 1], [5, 1], [6, 1]]], [50, 'ready', [[2, 2], [4, 1]]], [32, 'ready', [[3, 2], [7, 2]]], [18, 'preparing', [[0, 1], [1, 1], [6, 2]]], [6, 'new', [[2, 1], [3, 1], [4, 1]]], [2, 'new', [[0, 2], [7, 1]]]];
  today.forEach(([min, st, l]) => mk(min * 6e4, st, l, 'card'));
  for (let d = 0; d < 7; d++) for (let k = 0; k < 140; k++) { const at = new Date(now - d * 864e5 - rand() * 10 * 36e5).toISOString(), sid = 'demo' + d + k; events.push({ at, type: 'pageview', sid, path: '/' }); if (k % 2) events.push({ at, type: 'menuview', sid }); if (k % 4 === 0) events.push({ at, type: 'addtocart', sid }); if (k % 6 === 0) events.push({ at, type: 'checkout', sid }); }
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'data', 'db.json'), JSON.stringify({ orders, kv: { seq, menuEdits: { [ids[5]]: { soldOut: true } } }, events }));
}
function prepare() { const root = path.join(os.tmpdir(), 'menusnap-demo-' + process.pid); fs.rmSync(root, { recursive: true, force: true });
  const r = gen.build({ slug: SLUG, name: 'Sample Pizza Co', email: 'owner@sample-pizza.example', phone: '(555) 010-0100', address: '123 Sample St, Anytown', hoursText: 'Daily 11am-10pm', colors: { primary: '#e8202a' }, menu: MENU, siteUrl: '/r/' + SLUG, poweredBy: { name: 'EatDirect', url: '/' } }, root, { newToken: false });
  seed(r.dir); return r.dir; }
module.exports = { SLUG, prepare, seed };
