// Level 4 draft: a ring that comes back next to its start.
const Q=(cp,plunge)=>[
  { L: 4000 },
  plunge ? { L: 5000, W: 800, gap: 1300, drop: 1500 } : { L: 4200, gap: 600, drop: 220 },
  { L: 4200, C: 500 },
  { turn: 90, R: 6000 },
  { L: 4200 },
  { L: 4000, C: 600 },
  { L: 3800, cp },
];
module.exports=[{L:3500,W:700}, ...Q(false,false), ...Q(true,true), ...Q(true,false),
  { L: 4000 }, { L: 4200, gap: 600, drop: 220 }, { L: 4200, C: 500 }, { turn: 90, R: 6000 }, { L: 3200, W: 700 }];
