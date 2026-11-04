(function () {
  const $ = s => document.querySelector(s), st = { menus: [], logo: '' };
  // shrink big phone photos so uploads stay fast (max 2000px, JPEG)
  const load = f => new Promise((ok, no) => { const u = URL.createObjectURL(f), im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = u; });
  const toData = (im, max, type) => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL(type, 0.85); };
  const hx = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  // brand colors from the logo: most common saturated colors, skipping near-white/near-black/grey
  function palette(im) { const c = document.createElement('canvas'), n = 64; c.width = c.height = n; const x = c.getContext('2d'); x.drawImage(im, 0, 0, n, n); const d = x.getImageData(0, 0, n, n).data, bins = {};
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 40 || mx < 40 || mn > 225) continue;
      const k = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5); (bins[k] = bins[k] || { n: 0, r: 0, g: 0, b: 0 }); bins[k].n++; bins[k].r += r; bins[k].g += g; bins[k].b += b; }
    const top = Object.values(bins).sort((a, b) => b.n - a.n).map(v => hx(Math.round(v.r / v.n), Math.round(v.g / v.n), Math.round(v.b / v.n)));
    return [top[0] || '#d62828', top.find(t => t !== top[0]) || '#ffc93c']; }
  $('#menu').addEventListener('change', async e => { for (const f of [...e.target.files].slice(0, 6 - st.menus.length)) { const im = await load(f); const u = toData(im, 2000, 'image/jpeg'); st.menus.push(u); const t = new Image(); t.src = u; $('#thumbs').appendChild(t); }
    $('#menulbl').textContent = st.menus.length + ' photo' + (st.menus.length === 1 ? '' : 's') + ' added. Tap to add more.'; });
  $('#logo').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; const im = await load(f); st.logo = toData(im, 600, 'image/png'); $('#logoprev').src = st.logo; const [a, b] = palette(im); $('#c1').value = a; $('#c2').value = b; $('#colors').classList.remove('hide'); $('#logolbl').textContent = 'Logo added. Tap to change.'; });
  $('#f').addEventListener('submit', async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); $('#err').textContent = '';
    const links = {}, bad = []; for (const k of ['doordash', 'ubereats', 'grubhub', 'website']) { let v = (d['l_' + k] || '').trim(); delete d['l_' + k]; if (!v) continue; if (!/^https?:\/\//i.test(v)) v = 'https://' + v; try { const u = new URL(v); if (!u.hostname.includes('.')) throw 0; links[k] = u.href; } catch { bad.push(k); } }
    if (bad.length) return $('#err').textContent = 'Check this link: ' + bad.map(k => ({ doordash: 'DoorDash', ubereats: 'Uber Eats', grubhub: 'Grubhub', website: 'website' })[k]).join(', ') + '.';
    if (!st.menus.length && !Object.keys(links).length) return $('#err').textContent = 'Add a menu photo or at least one link.'; d.links = links;
    if (!d.name || !/^\S+@\S+\.\S+$/.test(d.email)) return $('#err').textContent = 'Add your restaurant name and email.';
    const b = $('#go'); b.disabled = true; b.textContent = 'Uploading…';
    try { const r = await fetch('/api/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign(d, { menuImages: st.menus, logo: st.logo || undefined, colors: st.logo ? { primary: $('#c1').value, accent: $('#c2').value } : undefined })) });
      const j = await r.json(); if (!j.ok) throw new Error(j.error || 'Something went wrong'); window.gtag&&gtag('event','generate_lead',{form:'demo_request'}); $('#formview').classList.add('hide'); $('#done').classList.remove('hide'); scrollTo(0, 0); }
    catch (er) { $('#err').textContent = er.message; b.disabled = false; b.textContent = 'Build my site'; } });
})();
// two-step form: step 1 = link or menu photo + email, step 2 = the rest (same form, same fields)
(function () {
  const $ = s => document.querySelector(s), s2 = $('#step2');
  function next() { $('#err1').textContent = ''; const dd = $('[name=l_doordash]').value.trim(), photos = $('#thumbs').children.length, em = $('[name=email]').value.trim();
    if (!dd && !photos) return $('#err1').textContent = 'Paste a delivery-app link or add a menu photo.';
    if (!/^\S+@\S+\.\S+$/.test(em)) return $('#err1').textContent = 'Add your email so we can send your demo.';
    s2.classList.remove('hide'); $('#next').classList.add('hide'); window.gtag && gtag('event', 'form_step', { step: 2 }); $('[name=name]').focus(); }
  $('#next').addEventListener('click', next);
  $('#f').addEventListener('keydown', e => { if (e.key === 'Enter' && s2.classList.contains('hide') && e.target.tagName === 'INPUT') { e.preventDefault(); next(); } });
})();
