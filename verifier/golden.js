// Golden replays: node verifier/golden.js record|check [index.html]
// record: runs the good bot on each level, stores its per-tick cmd stream plus a state digest every 100 ticks.
// check:  replays each stored cmd stream on a fresh sim and fails on any digest mismatch (physics regression, or a different JS engine).
const fs = require('fs'), path = require('path');
const mode = process.argv[2], file = process.argv[3] || 'index.html';
const H = require('./harness.js').load(file), mk = () => H();
const trial = require('./bot.js')(mk);
const DIR = path.join(__dirname, 'golden'), LEVELS = [1, 2, 3, 4], AA = 400, EVERY = 100;
function fnv(h, s) { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
function digest(G) { const { pos, vel } = G, y = G.g().yaw; return [pos.x, pos.y, pos.z, vel.x, vel.y, vel.z, y].join(','); }
function replay(level, cmds) { // returns digests every EVERY ticks and the final state
  globalThis.SURF_LEVEL = level;
  const G = mk(); G.P.airaccel = AA; G.spawnOn(0);
  const trace = []; let h = 2166136261;
  for (let i = 0; i < cmds.length; i += 3) {
    G.cmd.turn = cmds[i]; G.cmd.touch = cmds[i + 1]; G.cmd.key = cmds[i + 2]; G.step();
    const t = i / 3 + 1;
    if (t % EVERY === 0) { const d = digest(G); h = fnv(h, d); trace.push(h); }
  }
  return { trace, final: digest(G), state: G.g().state };
}
if (mode === 'record') {
  fs.mkdirSync(DIR, { recursive: true });
  for (const L of LEVELS) {
    globalThis.SURF_LEVEL = L; const rec = [];
    const r = trial(AA, { hold: 10, rec });
    if (r.res !== 'done') throw new Error('level ' + L + ' bot did not finish');
    const out = replay(L, rec);
    fs.writeFileSync(path.join(DIR, 'L' + L + '.json'), JSON.stringify({ level: L, aa: AA, ticks: rec.length / 3, cmds: rec, trace: out.trace, final: out.final, state: out.state }));
    console.log('recorded L' + L, rec.length / 3, 'ticks, final', out.state, 'bot time', r.t);
  }
} else if (mode === 'check') {
  let bad = 0;
  for (const L of LEVELS) {
    const g = JSON.parse(fs.readFileSync(path.join(DIR, 'L' + L + '.json'), 'utf8')), out = replay(L, g.cmds);
    const first = out.trace.findIndex((v, i) => v !== g.trace[i]);
    const ok = first < 0 && out.final === g.final && out.state === g.state;
    if (!ok) bad++;
    console.log('L' + L, ok ? 'OK' : 'MISMATCH' + (first >= 0 ? ' first at tick ' + (first + 1) * EVERY : ''), g.ticks, 'ticks');
  }
  process.exit(bad ? 1 : 0);
} else { console.log('usage: node verifier/golden.js record|check [index.html]'); process.exit(2); }
