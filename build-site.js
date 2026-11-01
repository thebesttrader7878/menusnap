#!/usr/bin/env node
// One command for the bot:  node build-site.js <submissionId|slug> [--deploy] [--no-email] [--menu file.json]
// Does: AI extraction (if needed) -> generate site -> deploy (DEPLOY_MODE) -> email the owner. Logs every step.
const fs = require('fs'); const pipeline = require('./lib/pipeline');
const args = process.argv.slice(2), key = args.find(a => !a.startsWith('--'));
const { DBF } = pipeline.paths(); const db = JSON.parse(fs.readFileSync(DBF, 'utf8'));
if (!key) { console.log('Submissions:\n' + db.subs.map(s => `  ${s.id}  ${s.slug}  ${s.status}  ${s.email}`).join('\n') + '\nusage: node build-site.js <id|slug> [--deploy] [--no-email] [--menu menu.json]'); process.exit(0); }
const s = db.subs.find(x => x.id === key || x.slug === key); if (!s) { console.error('No submission ' + key); process.exit(1); }
const mi = args.indexOf('--menu'); if (mi >= 0) s.menu = JSON.parse(fs.readFileSync(args[mi + 1], 'utf8'));
const save = () => { fs.writeFileSync(DBF + '.tmp', JSON.stringify(db)); fs.renameSync(DBF + '.tmp', DBF); };
pipeline.run(db, s, { save, deployYes: args.includes('--deploy'), send: !args.includes('--no-email') && process.env.AUTO_SEND !== '0' })
  .then(r => { console.log(JSON.stringify({ id: r.id, slug: r.slug, status: r.status, siteUrl: r.siteUrl, deploy: r.deploy, email: r.emailStatus, error: r.error || undefined }, null, 1)); process.exit(r.status === 'needs_review' ? 2 : 0); });
