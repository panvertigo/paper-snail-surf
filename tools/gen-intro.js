// Generates levels/intro.json: the first course new players meet. A glacier valley by day, huge forgiving ramps (half-width 1300, far wider than the 460-700 of the other levels), mostly downhill.
// Few, LONG pieces: ramps of 14000-24000 and sweeping banked curves of 70-110 degrees at radius 20000+, so you ride one shape for many seconds instead of hopping between many similar short ramps.
// usage: node tools/gen-intro.js   (then: node tools/check-stage.js levels/intro.json, node tools/map-report.js levels/intro.json)
// Speed is altitude: a long ramp loses height fast, so C (net climb over the piece) is tuned on each long piece to keep speed around 1800-3300 u/s (easy to read) instead of 4500+.
const fs = require('fs');
const R = (L, o) => Object.assign({ L }, o), T = (turn, r, o) => Object.assign({ turn, R: r }, o);
const W = 1300;
const Z = (L, o) => Object.assign({ L, zig: true, gap: 700, drop: 450 }, o);   // a wide transfer: the next ramp is shifted sideways by 0.75 W, so the landing is generous
const P = [
  // 1 ICE SHELF: one long straight run, one huge sweeping bend, a long gentle climb into the checkpoint.
  R(16000, { W, hue: 0.5, label: '1 Ice shelf' }), T(100, 22000, { hue: 0.47 }), R(14000, { C: +process.env.C1 || 1100 }), R(9000, { cp: true }),
  // 2 SWITCHBACKS: four long ramps in a row, each one a wide transfer onto the next (the transfer practice), then a long curve and a climb.
  Z(9500, { hue: 0.42, label: '2 Switchbacks', C: +process.env.C2 || 450 }), Z(9500, { C: +process.env.C2 || 450 }), Z(9500, { C: +process.env.C2 || 450 }), Z(9500, { C: +process.env.C2 || 450 }), T(60, 22000, { zig: true, gap: 700, drop: 450, C: +process.env.C2 || 450 }), R(14000, { C: +process.env.C1 || 1100 }), R(9000, { cp: true }),
  // 3 THE DROP: a long run to build speed, one huge leap onto a long landing ramp, a wide curve, then a long climb back to the checkpoint.
  R(14000, { hue: 0.58, label: '3 The drop', C: +process.env.C3 || 800 }), R(9000, { gap: 1000, drop: +process.env.DROP || 1400 }), T(60, 24000), R(16000, { C: +process.env.C1 || 1100 }), R(9000, { cp: true }),
  // 4 HOMEWARD: two big sweeping turns down the valley and a long straight run into the light.
  T(90, 20000, { hue: 0.52, label: '4 Homeward', C: +process.env.C4 || 500 }), R(11000, { C: 500 }), T(80, 24000), R(18000, { C: 700 }),
];
const stage = {
  name: 'Glacier (intro)', author: 'Paper Snail Surf', scenery: 'plain', theme0: 0, music: 'salt', pull: 0.3, fall: 0,
  // a bright cold morning, nothing like the pink and violet evening of the night levels: the sky deepens a little and warms toward the end
  palette: [
    { top: 0x4a90dc, mid: 0xa8d9f3, bot: 0xe6f6fb, gnd: 0xcfe9f1 },
    { top: 0x2f80d8, mid: 0x9fd6f4, bot: 0xeefaff, gnd: 0xd6ecf2 },
    { top: 0x5e8ed8, mid: 0xbfe2f0, bot: 0xfff0da, gnd: 0xe0eee8 },
  ],
  pieces: P,
};
fs.writeFileSync(__dirname + '/../levels/intro.json', JSON.stringify(stage, null, 1) + '\n');
console.log('wrote levels/intro.json,', P.length, 'pieces');
