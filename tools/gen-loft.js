// Generates levels/loft.json: a long night descent through a loft (Country Roads). L5 vocabulary (wide W900 landings, 2500-3200 drops, hoops, a loop and a swirl) in five scenes.
// Scene 3 is a fork: route A winds through the lamps (an S of two arcs), route B leaps straight over the gap (pieces FORK_A..FORK_B are skipped by the leap; see tools/test-fork.js).
// usage: node tools/gen-loft.js
const fs = require('fs');
const R = (L, o) => Object.assign({ L }, o), T = (turn, r, o) => Object.assign({ turn, R: r }, o), H = (d, o) => Object.assign({ d, y: 380, kind: 'hoop' }, o || {});
const P = [
  // 1 RAFTERS: calm and wide, big gentle drops
  R(2600, { W: 700, hue: 0.62, label: '1 Rafters' }), R(3500, { gap: 700, drop: 1700, rings: [H(350)] }), T(60, 6500), R(5200, { gap: 900, drop: 2600, rings: [H(400)] }), R(4500), T(45, 7000, { zig: true }), R(4200, { C: 900 }), R(3500, { cp: true }),
  // 2 LAMP FOREST: the loop
  R(6500, { W: 900, gap: 1000, drop: 3000, hue: 0.7, label: '2 Lamp forest' }), R(4500, { W: 700 }), R(6000, { W: 900, gap: 900, drop: 2300 }), R(3000, { W: 700 }),
  { loop: { R: 1000, phi: 0.45 }, gap: 600, rings: [H(300, { kind: 'boost', min: 2500, R: 700 })] }, R(6000, { W: 900, gap: 800 }), T(80, 6500, { zig: true, W: 700 }), R(4200, { C: 1100 }), R(3500, { cp: true }),
  // 3 THE WINDOW: the fork
  R(6500, { W: 900, gap: 1000, drop: 3000, hue: 0.55, label: '3 The window' }), R(4500, { W: 700, label: 'fork' }),
  /* route A: the lamp road. A switchback with two climbs that bleed speed: long and safe. Route B skips it with a leap from the fork to 'rejoin' (needs about 2400+ u/s and a straight aim) */ T(40, 4500, { gap: 900, drop: 1200 }), R(3000, { zig: true, gap: 800, drop: 900, C: 700 }), T(80, 4500, { gap: 800, drop: 900 }), R(3000, { zig: true, gap: 800, drop: 900, C: 700 }), T(40, 4500, { gap: 800, drop: 900 }), R(4500, { W: 900, gap: 900, drop: 900, label: 'rejoin' }),
  R(3500, { C: 700 }), R(3500, { cp: true }),
  // 4 THE FLOOR: the swirl
  R(6500, { W: 900, gap: 1000, drop: 3200, hue: 0.33, label: '4 The floor' }), R(4500, { W: 700 }), T(45, 6500), R(4000, { gap: 900, drop: 2500, rings: [H(400)] }), R(3000, { W: 700 }),
  { loop: { R: 1200, phi: 0.45, bank: 65, turns: 2 }, gap: 600, rings: [H(300, { kind: 'boost', min: 2000, R: 700 })] }, R(6000, { W: 900, gap: 800 }), T(70, 7000, { zig: true, W: 700 }), R(4500, { C: 1000 }), R(3500, { cp: true }),
  // 5 HOME: run to the pool of light
  R(6500, { W: 900, gap: 1000, drop: 3200, label: '5 Home' }), R(4500, { W: 700 }), T(45, 6500), R(4000, { gap: 900, drop: 2500, rings: [H(400)] }), R(3500), T(120, 7000, { zig: true }), R(3000),
];
fs.writeFileSync('levels/loft.json', JSON.stringify({ name: 'Loft', author: 'Paper Snail Surf', scenery: 'plain', night: true, theme0: 0, pull: 0.3, fall: 0.1, music: 'countryroads', pieces: P }, null, 1));
console.log('wrote levels/loft.json,', P.length, 'pieces');
