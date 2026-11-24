// Free-air test: nose set at an angle to the path, finger down (strafe +/-1) for 1 s with the nose held. Prints how many degrees the PATH turns and the speed change.
// usage: node tools/air-swerve.js [index.html]
const H = require('../verifier/harness.js').load(process.argv[2] || 'index.html');
for (const v0 of [600, 1500]) for (const deg of [-150, -90, -45, -20, -8, -2, 0, 2, 8, 20, 45, 90, 150]) for (const st of [1, -1]) {
  const G = H(); G.pos.set(0, 1e6, 0); G.vel.set(0, 0, -v0); G.setYaw(deg * Math.PI / 180); G.setStrafe(st);
  for (let t = 0; t < 100; t++) { G.step(); G.vel.y = 0; }
  const turn = (Math.atan2(-G.vel.x, -G.vel.z)) * 180 / Math.PI;
  console.log(`v0 ${v0} nose ${String(deg).padStart(4)} deg strafe ${st > 0 ? '+' : '-'}: path turned ${turn.toFixed(1).padStart(6)} deg, speed ${(Math.hypot(G.vel.x, G.vel.z) - v0).toFixed(0).padStart(5)}`);
}
