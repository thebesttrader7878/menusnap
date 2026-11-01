// Create one Render web service for one restaurant site (only used when DEPLOY_MODE=render-service).
// Needs: RENDER_API_KEY, RENDER_OWNER_ID (workspace id), RENDER_REPO (git repo holding template/ + sites/<slug>/), optional RENDER_BRANCH, RENDER_PLAN (free|starter).
// Dry run by default: prints the exact API request. Pass --yes to really create it.
// The generated site folder must be committed to RENDER_REPO under sites/<slug>/ first (this script does not push).
const env = process.env;
function payload(slug, ownerTokenHash) {
  return { type: 'web_service', name: 'menusnap-' + slug, ownerId: env.RENDER_OWNER_ID || 'tea-REPLACE_ME', repo: env.RENDER_REPO || 'https://github.com/OWNER/menusnap', branch: env.RENDER_BRANCH || 'main', autoDeploy: 'yes',
    serviceDetails: { runtime: 'node', plan: env.RENDER_PLAN || 'free', region: 'ohio', healthCheckPath: '/healthz', envSpecificDetails: { buildCommand: 'cd template && npm install', startCommand: 'node template/server.js' } },
    envVars: [{ key: 'SITE_DIR', value: 'sites/' + slug }, { key: 'OWNER_TOKEN_HASH', value: ownerTokenHash }, { key: 'SITE_URL', value: `https://menusnap-${slug}.onrender.com` }, { key: 'NODE_ENV', value: 'production' }, { key: 'PLATFORM_FEE_CENTS', value: '150' }] };
}
async function create(slug, ownerTokenHash, { yes = false, log = console.log } = {}) {
  const body = payload(slug, ownerTokenHash), url = `https://menusnap-${slug}.onrender.com`;
  if (!yes || !env.RENDER_API_KEY) { log('[deploy] DRY RUN (no --yes or no RENDER_API_KEY). Would POST https://api.render.com/v1/services:\n' + JSON.stringify(Object.assign({}, body, { envVars: body.envVars.map(v => v.key === 'OWNER_TOKEN_HASH' ? { key: v.key, value: '<sha256>' } : v) }), null, 1)); return { dryRun: true, url }; }
  const r = await fetch('https://api.render.com/v1/services', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RENDER_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error('Render API ' + r.status + ': ' + (j.message || JSON.stringify(j)));
  const svc = j.service || j; return { id: svc.id, url: (svc.serviceDetails && svc.serviceDetails.url) || url };
}
module.exports = { create, payload };
if (require.main === module) { const [slug, hash] = process.argv.slice(2); if (!slug) { console.error('usage: node deploy/render-create-service.js <slug> <ownerTokenHash> [--yes]'); process.exit(1); }
  create(slug, hash || '<hash>', { yes: process.argv.includes('--yes') }).then(r => console.log(r)).catch(e => { console.error(e.message); process.exit(1); }); }
