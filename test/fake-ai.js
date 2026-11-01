const http = require('http'), fs = require('fs');
http.createServer((q, s) => { let b = ''; q.on('data', d => b += d); q.on('end', () => { const j = JSON.parse(b); const img = j.messages[1].content.find(c => c.type === 'image_url');
  console.log('[fake-ai] model=' + j.model + ' auth=' + (q.headers.authorization ? 'yes' : 'no') + ' image=' + (img && img.image_url.url.slice(0, 23)) + ' bytes=' + (img ? img.image_url.url.length : 0));
  s.end(JSON.stringify({ choices: [{ message: { content: '```json\n' + fs.readFileSync(__dirname + '/mock-extraction.json', 'utf8') + '\n```' } }] })); }); }).listen(4999, () => console.log('fake-ai on 4999'));
