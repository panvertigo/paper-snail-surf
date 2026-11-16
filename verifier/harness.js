// Loads the shared physics block from index.html and returns a fresh sim. Used by sim.js, extra.js and tools/*.
// Input goes through G.cmd (turn radians since last tick, touch/key strafe signs), exactly as in the game.
const fs = require('fs');
class V { constructor() { this.x = this.y = this.z = 0; } set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; } }
function load(file) {
  const src = fs.readFileSync(file || process.argv[2] || 'index.html', 'utf8');
  const phys = src.slice(src.indexOf('// ==PHYSICS START=='), src.indexOf('// ==PHYSICS END=='));
  return (hooks = {}) => new Function('V', 'hooks', `
let state = 'run', falls = 0, failInfo = null;
function onCheckpoint() {} function finish() { state = 'done'; } function fail() { falls++; state = 'fail'; failInfo = { x: pos.x, y: pos.y, z: pos.z, lt: lastTouched }; }
` + phys + `
return { P, ramps, checkpoints, fin, pos, vel, cmd, step, spawnOn, SLOPE, local, ridgeAt, rightOf,
  g: () => ({ yaw, touchStrafe, state, contactN, lastTouched, cpRamp, falls, failInfo }),
  setYaw: v => yaw = v, setStrafe: v => cmd.touch = v, setState: v => state = v };`)(V, hooks);
}
module.exports = { load, V };
