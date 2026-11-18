// Run the bots on a course file: node tools/check-stage.js levels/first-steps.json
const fs = require('fs'), path = require('path');
globalThis.SURF_STAGE = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); globalThis.SURF_LEVEL = 'custom';
const H = require('../verifier/harness.js').load(path.join(__dirname, '..', 'index.html')), trial = require('../verifier/bot.js')(() => H());
for (const [name, o] of [['100 ms bot', { hold: 10, checkpoints: true }], ['300 ms bot', { hold: 30, checkpoints: true }]]) { const r = trial(400, o); console.log(name, JSON.stringify({ res: r.res, t: r.t, falls: r.falls, vmax: r.vmax })); }
