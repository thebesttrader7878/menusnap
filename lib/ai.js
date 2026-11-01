// Pluggable vision provider. Picks xAI if XAI_API_KEY, else OpenAI if OPENAI_API_KEY, else none.
// MENU_AI_PROVIDER=xai|openai|mock forces one. AI_BASE_URL overrides the endpoint (testing).
const fs = require('fs'), path = require('path');
const env = process.env;
const PROMPT = `You read restaurant menu photos. Return ONLY JSON shaped like:
{"categories":[{"name":"string","items":[{"name":"string","description":"string","price":number}]}]}
Rules: keep the menu's own category names and order; price is a number in dollars (no $), use the lowest price if several sizes and put sizes in the description; description "" if none; do not invent items.`;
function provider() {
  const f = (env.MENU_AI_PROVIDER || '').toLowerCase();
  if (f) return f;
  if (env.XAI_API_KEY) return 'xai';
  if (env.OPENAI_API_KEY) return 'openai';
  return 'none';
}
function cfg(p) {
  if (p === 'xai') return { url: (env.AI_BASE_URL || 'https://api.x.ai/v1') + '/chat/completions', key: env.XAI_API_KEY, model: env.AI_MODEL || 'grok-4' };
  if (p === 'openai') return { url: (env.AI_BASE_URL || 'https://api.openai.com/v1') + '/chat/completions', key: env.OPENAI_API_KEY, model: env.AI_MODEL || 'gpt-4o' };
}
function clean(j) {
  const cats = Array.isArray(j && j.categories) ? j.categories : [];
  return { categories: cats.slice(0, 40).map(c => ({ name: String(c.name || 'Menu').slice(0, 80),
    items: (Array.isArray(c.items) ? c.items : []).slice(0, 200).map(i => ({ name: String(i.name || '').slice(0, 120), description: String(i.description || '').slice(0, 400),
      price: Math.max(0, Math.round((parseFloat(String(i.price).replace(/[^0-9.]/g, '')) || 0) * 100) / 100) })).filter(i => i.name) })).filter(c => c.items.length) };
}
function parseJSON(txt) { const m = String(txt).match(/\{[\s\S]*\}/); if (!m) throw new Error('AI did not return JSON'); return JSON.parse(m[0]); }
async function extract(buf, mime) {
  const p = provider();
  if (p === 'none') { const e = new Error('No AI key set. Add XAI_API_KEY or OPENAI_API_KEY.'); e.code = 'NO_AI'; throw e; }
  if (p === 'mock') return clean(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'test', 'mock-extraction.json'), 'utf8')));
  const c = cfg(p); if (!c || !c.key) throw new Error('AI provider ' + p + ' has no key');
  const r = await fetch(c.url, { method: 'POST', signal: AbortSignal.timeout(90000), headers: { Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: c.model, temperature: 0, messages: [{ role: 'system', content: PROMPT }, { role: 'user', content: [
      { type: 'image_url', image_url: { url: `data:${mime};base64,${buf.toString('base64')}`, detail: 'high' } }, { type: 'text', text: 'Extract this menu as JSON.' }] }] }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('AI error: ' + ((j.error && (j.error.message || j.error)) || r.status));
  return clean(parseJSON(j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content));
}
module.exports = { extract, provider, clean };
