// Generates levels/intro.json: the first course new players meet. A glacier valley by day, huge forgiving ramps (half-width 1300, far wider than the 460-700 of the other levels).
// Few, LONG pieces: ramps of 8000-20000 and sweeping banked curves of 60-80 degrees at radius 26000-30000, so you ride one shape for many seconds.
// ALL DOWNHILL and steep: every piece is given a START ANGLE (A(L, deg)); the piece starts at that angle and eases out into the normal gentle slope (the Hermite profile behind C),
// so each piece is a drop-in followed by a run-out. 12 deg for the first slide, 25-35 deg for the big runs, 60 deg for one short drop where you barely stay on.
// usage: node tools/gen-intro.js   (then: node tools/check-stage.js levels/intro.json, node tools/map-report.js levels/intro.json)
const fs = require('fs');
const W = 1300;
// G(L, s0, s1): a ramp with its own grades (downhill, tan of the angle: 0.08 = 4.6 deg normal, 0.58 = 30, 0.7 = 35, 0.84 = 40, 1.73 = 60). The grade changes smoothly from s0 at the start to s1 at the end,
// so a piece can steepen gradually into a drop (a kink at speed is a ski jump: the surface falls away faster than you do). Chain pieces so each s0 equals the previous s1.
const G = (L, s0, s1, o) => Object.assign({ L, s0, s1 }, o);
const GT = (turn, r, s0, s1, o) => Object.assign({ turn, R: r, s0, s1 }, o);                       // the same on a banked curve
const Z = (L, s, o) => G(L, s, s, Object.assign({ zig: true, gap: 700, drop: 450 }, o));            // a wide transfer: the next ramp is shifted sideways by 0.75 W, so the landing is generous
const CLIFF = { gap: +process.env.CG || 13700, drop: +process.env.CD || 7100 };                    // the dive: fly off the edge, land tangentially on a steep ramp
const P = [
  // 1 FIRST SLIDE: a gentle start and two huge sweeping bends in opposite directions. Nothing to do but swipe and feel the carve.
  G(9000, 0.08, 0.2, { W, hue: 0.5, label: '1 First slide' }), GT(45, 26000, 0.2, 0.05, { hue: 0.47 }), GT(40, 30000, 0.05, 0.05, { zig: true, gap: 700, drop: 450 }), G(8000, 0.05, 0.05, { cp: true }),
  // 2 THE DIVE: off the edge, a huge drop (you fall at about 50 degrees), and a landing ramp that starts at 40 degrees: you barely stay on it. It eases through 35 and 30 degrees and runs out: the speed build.
  G(9000, 0.84, 0.3, Object.assign({ hue: 0.58, label: '2 The dive' }, CLIFF)), G(6000, 0.3, 0.05), G(8000, 0.05, 0.05, { cp: true }),
  // 3 SWITCHBACKS: at full speed, five long ramps in a row, each one a wide transfer onto the next (the transfer practice), then a long curve.
  Z(18000, 0.04, { hue: 0.42, label: '3 Switchbacks' }), Z(18000, 0.04), Z(18000, 0.04), Z(18000, 0.04), Z(18000, 0.04), GT(40, 57000, 0.04, 0.04, { zig: true, gap: 700, drop: 450 }), G(10000, 0.04, 0.04, { cp: true }),
  // 4 HOMEWARD: two big sweeping turns down the valley (huge radius, they hold the speed) and a long run into the light.
  GT(40, 57000, 0.04, 0.03, { hue: 0.52, label: '4 Homeward' }), G(20000, 0.03, 0.03), GT(40, 57000, 0.03, 0.03), G(30000, 0.03, 0.03),
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
