#!/usr/bin/env node
// MenuSnap bot CLI. Reads .env.bot (gitignored) or env: MENUSNAP_URL (default http://localhost:3000), BOT_API_TOKEN.
//   node bot.js pending | fetch <id> | submit <id> menu.json | build <id>
const fs = require('fs'), path = require('path');
try { for (const l of require('fs').readFileSync(require('path').join(__dirname, '.env.bot'), 'utf8').split('\n')) { const m = /^([A-Z_]+)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
const URL_ = (process.env.MENUSNAP_URL || 'http://localhost:3000').replace(/\/$/, ''), TOKEN = process.env.BOT_API_TOKEN || '';
const INBOX = process.env.MENUSNAP_INBOX || '/workspace/menusnap-inbox';
const [cmd, id, file] = process.argv.slice(2);
const call = async (p, opt = {}) => { const r = await fetch(URL_ + p, Object.assign({}, opt, { headers: Object.assign({ Authorization: 'Bearer ' + TOKEN }, opt.body ? { 'Content-Type': 'application/json' } : {}) }));
  if (opt.raw) { if (!r.ok) throw new Error(p + ' -> ' + r.status); return Buffer.from(await r.arrayBuffer()); }
  const j = await r.json().catch(() => ({ ok: false, error: 'HTTP ' + r.status })); if (!r.ok || j.ok === false) { const e = new Error((j.error || r.status) + (j.details ? '\n  - ' + j.details.join('\n  - ') : '')); throw e; } return j; };
(async () => {
  if (!TOKEN) throw new Error('Set BOT_API_TOKEN');
  if (cmd === 'pending') { const { pending } = await call('/api/bot/pending'); if (!pending.length) return console.log('No pending submissions.'); for (const s of pending) console.log(`${s.id}  ${s.status}  ${s.photos} photo(s)  ${s.name}  (${s.created})`); return; }
  if (!id) throw new Error('usage: node bot.js pending | fetch <id> | submit <id> menu.json | build <id>');
  if (cmd === 'fetch') { const { submission: s } = await call('/api/bot/submissions/' + id); const dir = path.join(INBOX, id); fs.mkdirSync(dir, { recursive: true });
    const files = []; for (const [i, ph] of s.photos.entries()) { const f = path.join(dir, `menu-${i + 1}${path.extname(ph.file)}`); fs.writeFileSync(f, await call(ph.url, { raw: true })); files.push(f); }
    if (s.logo) { const f = path.join(dir, 'logo' + path.extname(s.logo.file)); fs.writeFileSync(f, await call(s.logo.url, { raw: true })); files.push(f); }
    const { photos, logo, ...info } = s; fs.writeFileSync(path.join(dir, 'info.json'), JSON.stringify(info, null, 1));
    console.log(`Saved to ${dir}:\n` + files.concat(path.join(dir, 'info.json')).map(f => '  ' + f).join('\n') + `\nNext: look at the menu photos, write ${path.join(dir, 'menu.json')}, then: node bot.js submit ${id} ${path.join(dir, 'menu.json')}`); return; }
  if (cmd === 'submit') { if (!file) throw new Error('usage: node bot.js submit <id> menu.json'); const menu = JSON.parse(fs.readFileSync(file, 'utf8')); const r = await call(`/api/bot/submissions/${id}/menu`, { method: 'POST', body: JSON.stringify({ menu }) });
    console.log(`Menu accepted: ${r.categories} categories, ${r.items} items. Next: node bot.js build ${id}`); return; }
  if (cmd === 'build') { const r = await call(`/api/bot/submissions/${id}/build`, { method: 'POST', body: '{}' }); const s = r.submission;
    console.log(`Status: ${s.status}\nSite: ${s.siteUrl}\nEmail: ${s.emailStatus || 'not sent'}${s.error ? '\nError: ' + s.error : ''}`); return; }
  throw new Error('unknown command ' + cmd);
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
