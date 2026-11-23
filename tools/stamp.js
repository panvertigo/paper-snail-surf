// Writes the current local time into the on-screen build label in index.html (bottom right). Run before each commit: node tools/stamp.js
const fs = require('fs'), f = process.argv[2] || 'index.html', d = new Date(), p = n => String(n).padStart(2, '0');
const t = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
let n = ''; try { n = '#' + (+require('child_process').execSync('git rev-list --count HEAD').toString().trim() + 1) + ' '; } catch (e) {}
const s = fs.readFileSync(f, 'utf8'), o = s.replace(/(<div id="build">build )[^<]*(<\/div>)/, `$1${n}${t}$2`);
if (o !== s) fs.writeFileSync(f, o);
console.log('build stamp', n + t);
