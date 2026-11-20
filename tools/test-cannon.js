// Cannon test: fire from the finish pad in the real game (no steering) and report how close the flight gets to the start. usage: node tools/test-cannon.js [levels/x.json | 5] [guard 0|1]
const fs = require('fs'), path = require('path');
const a = process.argv[2] || '5', guard = process.argv[3] !== '0';
globalThis.SURF_LEVEL = /json$/.test(a) ? 'custom' : a; if (/json$/.test(a)) globalThis.SURF_STAGE = JSON.parse(fs.readFileSync(a, 'utf8'));
const H = require('../verifier/harness.js').load(path.join(__dirname, '..', 'index.html')), G = H(), P = G.P, G0 = 800, LG = 0.4;
G.setState('run'); G.spawnOn(0); const Hm = { x: G.pos.x, y: G.pos.y, z: G.pos.z, yaw: G.g().yaw };
const f = G.fin; G.pos.set(f.x + f.right[0] * f.half * 0.6, f.y + 60, f.z + f.right[2] * f.half * 0.6); G.vel.set(0, 0, 0);
const P0 = { x: G.pos.x, y: G.pos.y, z: G.pos.z }, tx = Hm.x - Math.sin(Hm.yaw) * 500, ty = Hm.y + 700, tz = Hm.z - Math.cos(Hm.yaw) * 500, hx = tx - P0.x, hz = tz - P0.z, D = Math.hypot(hx, hz), dy = ty - P0.y, tan0 = Math.max(0.9, dy / D + 0.5); let lg = 0.4; { const s0 = Math.hypot(1, tan0) * D / Math.sqrt(2 * (D * tan0 - dy) / (G0 * lg)); if (s0 > 7000) lg = Math.max(0.2, 0.4 * (7000 / s0) ** 2); } const g = G0 * lg;
const tan = tan0, tf = Math.sqrt(2 * (D * tan - dy) / g), vh = D / tf;
P.g = g; P.maxvel = 30000; G.pos.set(P0.x, P0.y + 30, P0.z); G.vel.set(hx / D * vh, tan * vh, hz / D * vh); G.setYaw(Math.atan2(-hx, -hz));
console.log('distance', Math.round(D), 'rise', Math.round(dy), 'launch speed', Math.round(Math.hypot(vh, tan * vh)), 'flight s', tf.toFixed(1));
let best = 1e9, t = 0, st; globalThis.LOGT = (i) => { if (i < 0) console.log(i, "hd", Math.round(Math.hypot(G.pos.x - tx, G.pos.z - tz)), "y", Math.round(G.pos.y), "v", Math.round(G.vel.x), Math.round(G.vel.y), Math.round(G.vel.z)); };
for (; t < 6000; t++) {
  if (guard && !G.g().contactN) { const hx = tx - G.pos.x, hz = tz - G.pos.z, hd = Math.hypot(hx, hz), hs = Math.hypot(G.vel.x, G.vel.z), tgo = Math.max(1.5, hd / Math.max(hs, 1500)), k = 1 - Math.exp(-3 * P.dt); G.vel.x += (hx / tgo - G.vel.x) * k; G.vel.z += (hz / tgo - G.vel.z) * k; if (hd <= 600) P.g = G0; else G.vel.y += ((ty - G.pos.y) / tgo + P.g * tgo / 2 - G.vel.y) * k; }
  LOGT(t); G.step(); st = G.g(); best = Math.min(best, Math.hypot(G.pos.x - tx, G.pos.z - tz)); if (st.contactN) { console.log('contact at tick', t, 'ramp', st.lastTouched, 'dist to start', Math.round(Math.hypot(G.pos.x - tx, G.pos.z - tz))); break; } if (G.pos.y < P0.y - 4000) break;
}
console.log('closest', Math.round(best), 'end dist', Math.round(Math.hypot(G.pos.x - tx, G.pos.z - tz)), 'y', Math.round(G.pos.y), 'startY', Math.round(Hm.y), 'ticks', t);
if (process.env.DBG) { G.spawnOn(0); G.pos.set(0, 0, 0); G.vel.set(0, 1000, 0); P.g = 320; const y0 = G.vel.y; for (let i = 0; i < 100; i++) G.step(); console.log('dvy per s', (G.vel.y - y0), 'expected', -320); }
