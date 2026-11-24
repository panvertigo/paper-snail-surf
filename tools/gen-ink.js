// Generates levels/ink.json: stage 3 prototype, inky black water. Same piece helpers as tools/gen-intro.js (G(L, s0, s1) ramps, GT turns, Z zig transfers; chain pieces so each s0 equals the previous s1).
// Narrower ramps than the Transit (W 1000), no cliff, a steep-ish middle. The look is all in the renderer (scenery 'ink': pearl ramp, short light range, reflections).
// usage: node tools/gen-ink.js   (then: node tools/check-stage.js levels/ink.json)
const fs = require('fs');
const W = 1000;
const G = (L, s0, s1, o) => Object.assign({ L, s0, s1 }, o);
const GT = (turn, r, s0, s1, o) => Object.assign({ turn, R: r, s0, s1 }, o);
const Z = (L, s, o) => G(L, s, s, Object.assign({ zig: true, gap: 700, drop: 450 }, o));
const P = [
  // 1 STILL WATER: a gentle start and one wide bend; the light only reaches a little way ahead
  G(9000, 0.08, 0.2, { W, hue: 0.6, label: '1 Still water' }), GT(50, 26000, 0.2, 0.05, { hue: 0.62 }), G(9000, 0.05, 0.05, { cp: true }),
  // 2 GLASS: a long bend, then the grade steepens smoothly into a fast run and eases out
  GT(55, 22000, 0.05, 0.15, { zig: true, gap: 700, drop: 450, hue: 0.66, label: '2 Glass' }), G(12000, 0.15, 0.5), G(9000, 0.5, 0.18), G(7000, 0.18, 0.05, { cp: true }),
  // 3 DEEP: three wide transfers and a long curve
  Z(15000, 0.05, { hue: 0.7, label: '3 Deep' }), Z(15000, 0.05), Z(15000, 0.05), GT(45, 40000, 0.05, 0.05, { zig: true, gap: 700, drop: 450 }), G(10000, 0.05, 0.05, { cp: true }),
  // 4 SURFACE: two big sweeps and a long run to the light
  GT(40, 45000, 0.05, 0.03, { hue: 0.74, label: '4 Surface' }), G(25000, 0.03, 0.03), GT(40, 45000, 0.03, 0.03), G(25000, 0.03, 0.03),
];
const stage = {
  name: 'The Ink', author: 'Paper Snail Surf', scenery: 'ink', theme0: 0, music: 'bowl', pull: 0.3, fall: 0,
  palette: [
    { top: 0x010208, mid: 0x02040b, bot: 0x03050e, gnd: 0x010208 },
    { top: 0x020309, mid: 0x04060f, bot: 0x050813, gnd: 0x020309 },
  ],
  pieces: P,
};
fs.writeFileSync(__dirname + '/../levels/ink.json', JSON.stringify(stage, null, 1) + '\n');
console.log('wrote levels/ink.json,', P.length, 'pieces');
