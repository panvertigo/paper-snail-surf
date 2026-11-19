// Rebuilds levels/index.json from the .json files in levels/ (name and author come from each file). Existing entries keep their order and any custom name; new files are appended.
// Run it after adding a file to levels/ (a local server also lists new files on its own, see courses.js). usage: node tools/build-levels-index.js
const fs = require('fs'), path = require('path'), dir = path.join(__dirname, '..', 'levels'), idx = path.join(dir, 'index.json');
let list = []; try { list = JSON.parse(fs.readFileSync(idx, 'utf8')); } catch (e) {}
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json').map(f => f.slice(0, -5)).sort();
list = list.filter(c => files.includes(c.file));
for (const f of files) {
  if (list.some(c => c.file === f)) continue;
  try { const s = JSON.parse(fs.readFileSync(path.join(dir, f + '.json'), 'utf8')); if (Array.isArray(s.pieces) && s.pieces.length) list.push({ file: f, name: s.name || f, author: s.author || '' }); } catch (e) { console.warn('skipped ' + f + ': ' + e.message); }
}
fs.writeFileSync(idx, JSON.stringify(list, null, 1) + '\n'); console.log('levels/index.json: ' + list.length + ' courses');
