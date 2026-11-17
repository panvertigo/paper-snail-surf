// Desktop level editor: open index.html#edit. Runs inside the game page, so it uses the exact same physics, course builder and renderer.
// Stage = { name, scenery: 'plain' | 'descent', theme0, pieces: [ ... ] } (see STAGES in index.html for the piece keys).
(function () {
  const E = globalThis.EDIT = { active: true, frame };
  const $id = id => document.getElementById(id);
  const KEY = 'surf_edit_stage';
  const clone = o => JSON.parse(JSON.stringify(o));
  const PRESETS = {
    ramp:    { label: 'Ramp',        piece: () => ({ L: 3500 }), tip: 'Straight ramp.' },
    turn:    { label: 'Turn',        piece: () => ({ turn: 60, R: 6500 }), tip: 'Banked arc. Holds speed below about sqrt(1000 R).' },
    zig:     { label: 'Zigzag',      piece: () => ({ L: 3000, zig: true }), tip: 'Transfer to the other face.' },
    climb:   { label: 'Climb',       piece: () => ({ L: 4200, C: 900 }), tip: 'Uphill ramp: pays speed back. Put one just before a checkpoint.' },
    cp:      { label: 'Checkpoint',  piece: () => ({ L: 3500, cp: true }), tip: 'Checkpoint ramp. Do not put an uphill within 3 ramps after it.' },
    drop:    { label: 'Big drop',    piece: () => ({ L: 6500, W: 900, gap: 1000, drop: 3000 }), tip: 'Huge drop onto a long wide landing ramp (flight is about v*sqrt(2h/g)).' },
    loop:    { label: 'Loop',        piece: () => [{ loop: { R: 1000, phi: 0.45 }, gap: 600 }, { L: 6000, W: 900, gap: 800 }], tip: 'Loop-the-loop + landing ramp. Needs about 2050 u/s entering. Put a long run or a big drop before it.' },
    swirl:   { label: 'Swirl',       piece: () => [{ loop: { R: 1200, phi: 0.45, bank: 65, turns: 2 }, gap: 600 }, { L: 6000, W: 900, gap: 800 }], tip: 'Banked two-turn swirl + landing ramp. About 1500 u/s entering.' },
  };
  const RING_PRESETS = { hoop: { kind: 'hoop', d: 400, y: 380 }, portal: { kind: 'portal', d: 500, y: 380, R: 280, theme: 1 } };
  // field specs: [key, label, min, max, step, tip]
  const F_COMMON = [['gap', 'Gap before', 0, 4000, 50, 'Distance from the previous piece\'s end'], ['drop', 'Drop', -2000, 9000, 50, 'Height below the previous piece (blank = automatic)'], ['lat', 'Sideways', -3000, 3000, 50, 'Shift left / right (negative = left)'], ['hue', 'Colour (0-1)', 0, 1, 0.01, 'Blank = follows previous']];
  const F_RAMP = [['L', 'Length', 500, 12000, 100], ['W', 'Half-width', 250, 1300, 10, 'Carries on to later ramps'], ['C', 'Climb', 0, 2500, 50, 'Net climb (uphill ramp)']];
  const F_TURN = [['turn', 'Turn (deg)', 10, 360, 5], ['R', 'Radius', 2000, 9000, 100], ['W', 'Half-width', 250, 1300, 10]];
  const F_LOOP = [['R', 'Radius', 500, 3000, 50, 'Bigger = needs more speed'], ['phi', 'Entry angle', 0, 1.2, 0.05, 'Quarter-pipe you drop onto (rad)'], ['phi2', 'Exit angle', 0, 1, 0.05, 'Launch angle (blank: 0.3, banked: 0)'],
    ['turns', 'Turns', 1, 4, 1, '1 = loop, 2+ = corkscrew / swirl'], ['bank', 'Bank (deg)', 0, 80, 5, '0 = vertical loop, high = flat swirl'], ['W', 'Half-width', 300, 900, 10], ['dir', 'Side (1 / -1)', -1, 1, 2, 'Which way the turns drift'], ['off', 'Lane offset', -600, 600, 10]];
  const F_RING = [['d', 'Ahead', -500, 3000, 50, 'Distance past the previous piece\'s end'], ['y', 'Height', -1500, 3000, 50], ['s', 'Lane', -1500, 1500, 50, 'Blank = where the rider flies'], ['R', 'Radius', 100, 800, 10],
    ['boost', 'Boost (hoop)', 0, 400, 10], ['theme', 'Scene (portal)', 0, 3, 1, '0 moon, 1 atmosphere, 2 sky, 3 Earth'], ['dip', 'Dip (deg)', -30, 60, 5]];

  let stage, sel = 0, hist = [], histI = -1, version = 0;
  let botRes = null, entries = {}, pathLine = null, selObjs = [], busy = false, pendingRun = null;
  const cam = { yaw: 0.6, pitch: 0.55, dist: 60000, tx: 0, ty: 0, tz: 0 };

  // ---------- stage helpers ----------
  const kind = p => p.loop ? (p.loop.bank ? 'swirl' : 'loop') : p.turn ? 'turn' : 'ramp';
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.pieces && s.pieces.length) return s; } catch (e) {}
    return fromLevel(1);
  }
  function fromLevel(n) { const m = STAGE_META[n] || {}; return { name: 'Level ' + n + ' copy', scenery: m.scenery || 'plain', theme0: 0, pieces: clone(STAGES[n]) }; }
  function snapshot() { const j = JSON.stringify(stage); if (hist[histI] === j) return; hist = hist.slice(0, histI + 1); hist.push(j); histI = hist.length - 1; if (hist.length > 200) { hist.shift(); histI--; } try { localStorage.setItem(KEY, j); } catch (e) {} }
  function undo(d) { const i = histI + d; if (i < 0 || i >= hist.length) return; histI = i; stage = JSON.parse(hist[i]); sel = Math.min(sel, stage.pieces.length - 1); try { localStorage.setItem(KEY, hist[i]); } catch (e) {} refresh(true); }

  // ---------- rebuild ----------
  function rebuild() {
    version++;
    stage.pieces.forEach(p => { if (p.loop && p.loop.phi2 === undefined) delete p.loop.phi2; });
    try { buildCourse(stage); applyScenery(stage.scenery === 'descent'); buildScene(); }
    catch (e) { setStatus('invalid stage: ' + e.message); console.error(e); return; }
    setTheme(stage.scenery === 'descent' ? (stage.theme0 || 0) : 0, true);
    drawSelection(); clearPath(); botRes = null; entries = {};
    if (pendingRun) clearTimeout(pendingRun); pendingRun = setTimeout(() => { pendingRun = null; runBots(false); }, 450);
  }
  function refresh(full) { rebuild(); renderPanel(); if (full) fit(); }
  function change(noSnap) { if (!noSnap) snapshot(); rebuild(); renderList(); renderStatus(); }

  // ---------- 3D overlays ----------
  function disposeObjs(a) { for (const o of a) { scene.remove(o); if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); } a.length = 0; }
  function lineOf(pts, color) { const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], p[1], p[2]))); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true })); l.renderOrder = 10; l.frustumCulled = false; scene.add(l); return l; }
  function drawSelection() {
    disposeObjs(selObjs); const r = ramps[sel]; if (!r) return;
    const pts = [];
    if (r.tube) { const T = r.tube; for (let t = 0; t <= T.sweep; t += 0.08) { const a = T.th0 + t, c = Math.cos(a), s = Math.sin(a), q = T.shift(t); pts.push([T.ox + T.R * (c * T.e1[0] + s * T.e2[0]) + T.ax[0] * q, T.oy + T.R * (c * T.e1[1] + s * T.e2[1]) + T.ax[1] * q, T.oz + T.R * (c * T.e1[2] + s * T.e2[2]) + T.ax[2] * q]); } }
    else { const n = Math.max(4, Math.ceil(r.L / 300)); for (let i = 0; i <= n; i++) { const u = r.L * i / n, c = ridgeAt(r, u); pts.push([c[0], r.oy + zOf(r, u) + r.H + 40, c[1]]); } }
    selObjs.push(lineOf(pts, 0xffe14a));
    const b = r.tube ? [r.tube.ox, r.tube.oy, r.tube.oz] : [r.sx, r.oy + r.H, r.sz];
    E.focusPoint = b; drawHandles();
  }
  // ---------- drag handles: shape and place the selected piece right in the 3D view ----------
  // green ball = move along the ground (gap + sideways), blue diamond = raise / lower (drop), yellow = length (turn angle on a turn), orange = width
  const HCOL = { move: 0x4be07a, rise: 0x4aa8ff, len: 0xffe14a, wid: 0xff9a3c }, HNAME = { move: 'Move (gap and sideways)', rise: 'Raise / lower', len: 'Length', wid: 'Width' };
  let hObjs = [], hDrag = null, lastRb = 0, dirty = false;
  const snap = (v, st) => Math.round(v / st) * st, clampv = (v, a, b) => Math.max(a, Math.min(b, v));
  function handlePoints() {
    const r = ramps[sel], p = stage.pieces[sel]; if (!r || !p) return [];
    const out = [], s = r.tube ? [r.tube.ox, r.tube.oy, r.tube.oz] : [r.sx, r.oy + r.H, r.sz];
    if (sel > 0) { out.push({ k: 'move', p: s }); out.push({ k: 'rise', p: s }); }
    if (!r.tube) {
      out.push({ k: 'len', p: [r.ex, r.ey + r.H, r.ez] });
      const u = r.L / 2, c = ridgeAt(r, u), rt = rightOf(r.h0 + (r.k || 0) * u);
      out.push({ k: 'wid', p: [c[0] + rt[0] * r.W, r.oy + zOf(r, u), c[1] + rt[2] * r.W], c, rt });
    }
    return out;
  }
  function drawHandles() {
    disposeObjs(hObjs);
    for (const h of handlePoints()) {
      const m = new THREE.Mesh(h.k === 'rise' ? new THREE.OctahedronGeometry(1) : new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: HCOL[h.k], depthTest: false, transparent: true, opacity: 0.95 }));
      m.renderOrder = 12; m.userData = { k: h.k, base: h.p }; m.position.set(h.p[0], h.p[1], h.p[2]); scene.add(m); hObjs.push(m);
    }
    placeHandles();
  }
  E.handleScreen = k => { const m = hObjs.find(o => o.userData.k === k); if (!m) return null; const v = m.position.clone().project(camera), rc = renderer.domElement.getBoundingClientRect(); return [(v.x * 0.5 + 0.5) * rc.width + rc.left, (-v.y * 0.5 + 0.5) * rc.height + rc.top]; }; // for tests
  E.select = i => { sel = i; drawSelection(); focusSel(); renderList(); renderInspector(); };
  function placeHandles() { const hs = cam.dist * 0.013; for (const m of hObjs) { m.scale.setScalar(m.userData.k === 'rise' ? hs * 0.9 : hs); const b = m.userData.base; m.position.set(b[0], b[1] + (m.userData.k === 'rise' ? hs * 3 : 0), b[2]); } }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function setRay(e) { const rc = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height * 2 - 1)); camera.aspect = rc.width / rc.height; camera.updateProjectionMatrix(); ray.setFromCamera(ndc, camera); }
  function hitHandle(e) { setRay(e); const hit = ray.intersectObjects(hObjs, false)[0]; return hit ? hit.object.userData.k : null; }
  const atY = y => { const o = ray.ray.origin, d = ray.ray.direction; if (Math.abs(d.y) < 1e-4) return null; const t = (y - o.y) / d.y; return t > 0 ? [o.x + d.x * t, y, o.z + d.z * t] : null; };
  const atVert = (p0, nx, nz) => { const o = ray.ray.origin, d = ray.ray.direction, den = d.x * nx + d.z * nz; if (Math.abs(den) < 1e-4) return null; const t = ((p0[0] - o.x) * nx + (p0[2] - o.z) * nz) / den; return t > 0 ? [o.x + d.x * t, o.y + d.y * t, o.z + d.z * t] : null; };
  function startHandle(k, e) {
    const r = ramps[sel], p = stage.pieces[sel], prev = sel > 0 ? ramps[sel - 1] : null, h = handlePoints().find(q => q.k === k);
    const D = { k, p, gap0: p.gap ?? 480, lat0: p.lat || 0, L0: p.L, turn0: p.turn, nx: Math.sin(cam.yaw), nz: Math.cos(cam.yaw), d1: r.tube ? null : dirOf(r.h1), c: h.c, rt: h.rt, hp: h.p };
    D.drop0 = prev ? (p.drop ?? (r.tube ? 20 - 0.42 * prev.H : prev.ey - r.oy)) : 0;
    if (prev) { D.pd = dirOf(prev.h1); D.pr = rightOf(prev.h1); }
    setRay(e); D.P0 = k === 'rise' ? atVert(h.p, D.nx, D.nz) : atY(h.p[1]); if (!D.P0) return null; return D;
  }
  function dragHandle(e) {
    const D = hDrag; setRay(e); const P = D.k === 'rise' ? atVert(D.hp, D.nx, D.nz) : atY(D.hp[1]); if (!P) return; const p = D.p;
    const dx = P[0] - D.P0[0], dz = P[2] - D.P0[2];
    if (D.k === 'move') { p.gap = clampv(snap(D.gap0 + dx * D.pd[0] + dz * D.pd[2], 50), 0, 4000); const lat = clampv(snap(D.lat0 + dx * D.pr[0] + dz * D.pr[2], 50), -3000, 3000); if (lat) p.lat = lat; else delete p.lat; setStatus('Move: gap ' + p.gap + ', sideways ' + (p.lat || 0)); }
    else if (D.k === 'rise') { p.drop = clampv(snap(D.drop0 - (P[1] - D.P0[1]), 50), -2000, 9000); setStatus('Height: drop ' + p.drop); }
    else if (D.k === 'len') { const a = dx * D.d1[0] + dz * D.d1[2]; if (p.turn) { p.turn = clampv(snap(D.turn0 + a / p.R * 57.2958, 5), 10, 360); setStatus('Turn ' + p.turn + ' deg'); } else { p.L = clampv(snap(D.L0 + a, 100), 500, 12000); setStatus('Length ' + p.L); } }
    else if (D.k === 'wid') { p.W = clampv(snap(Math.abs((P[0] - D.c[0]) * D.rt[0] + (P[2] - D.c[1]) * D.rt[2]), 10), 250, 1300); setStatus('Half-width ' + p.W); }
    dirty = true;
  }
  function pickPiece(e) { // click on a piece in 3D: nearest ridge on screen
    const rc = renderer.domElement.getBoundingClientRect(), v = new THREE.Vector3(); let best = -1, bd = 45;
    ramps.forEach((r, i) => {
      const n = r.tube ? 0 : 8;
      for (let j = 0; j <= n; j++) {
        if (r.tube) v.set(r.tube.ox, r.tube.oy, r.tube.oz); else { const u = r.L * j / n, c = ridgeAt(r, u); v.set(c[0], r.oy + zOf(r, u) + r.H, c[1]); }
        v.project(camera); if (v.z > 1) continue; const d = Math.hypot((v.x * 0.5 + 0.5) * rc.width + rc.left - e.clientX, (-v.y * 0.5 + 0.5) * rc.height + rc.top - e.clientY); if (d < bd) { bd = d; best = i; }
      }
    });
    if (best >= 0) { sel = best; drawSelection(); renderList(); renderInspector(); }
  }
  function clearPath() { if (pathLine) { scene.remove(pathLine); pathLine.geometry.dispose(); pathLine.material.dispose(); pathLine = null; } }
  function drawPath(pts) {
    clearPath(); if (pts.length < 2) return;
    const pos = new Float32Array(pts.length * 3), col = new Float32Array(pts.length * 3), c = new THREE.Color();
    pts.forEach((p, i) => { pos.set([p.x, p.y, p.z], i * 3); c.setHSL(0.62 - 0.62 * Math.min(1, Math.max(0, (p.v - 800) / 2400)), 1, 0.55); col.set([c.r, c.g, c.b], i * 3); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    pathLine = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true })); pathLine.renderOrder = 9; pathLine.frustumCulled = false; scene.add(pathLine);
  }
  function fit() {
    let lo = [1e12, 1e12, 1e12], hi = [-1e12, -1e12, -1e12];
    const add = (x, y, z) => { lo = [Math.min(lo[0], x), Math.min(lo[1], y), Math.min(lo[2], z)]; hi = [Math.max(hi[0], x), Math.max(hi[1], y), Math.max(hi[2], z)]; };
    for (const r of ramps) { add(r.sx, r.oy, r.sz); add(r.ex, r.ey, r.ez); if (r.tube) add(r.tube.ox, r.tube.oy, r.tube.oz); }
    add(fin.x, fin.y, fin.z);
    cam.tx = (lo[0] + hi[0]) / 2; cam.ty = (lo[1] + hi[1]) / 2; cam.tz = (lo[2] + hi[2]) / 2;
    cam.dist = Math.max(8000, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) * 0.85);
  }
  function focusSel() { if (!E.focusPoint) return; [cam.tx, cam.ty, cam.tz] = E.focusPoint; cam.dist = Math.min(cam.dist, 12000); }

  // ---------- bots ----------
  let phys = null, botSrc = null;
  async function ensureSources() {
    if (phys) return;
    const src = await (await fetch(location.pathname + '?src=' + Date.now())).text();
    phys = src.slice(src.indexOf('// ==PHYSICS START=='), src.indexOf('// ==PHYSICS END=='));
    botSrc = await (await fetch('verifier/bot.js?src=' + Date.now())).text();
  }
  function makeSim() {
    class V3 { constructor() { this.x = this.y = this.z = 0; } set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; } }
    return new Function('V', `
let state = 'run', falls = 0, failInfo = null; const ringHits = [];
function onCheckpoint() {} function onRing(g, off) { ringHits.push([g.kind, off]); } function finish() { state = 'done'; } function fail() { falls++; state = 'fail'; }
` + phys + `
return { P, ramps, checkpoints, fin, pos, vel, cmd, step, spawnOn, local, ridgeAt, rightOf, rings, ringHits, inTube,
  g: () => ({ yaw, touchStrafe, state, contactN, lastTouched, cpRamp, nextCp, falls }), setYaw: v => yaw = v, setStrafe: v => cmd.touch = v, setState: v => state = v };`)(V3);
  }
  const tick = () => new Promise(r => setTimeout(r, 0));
  async function runBots(full) {
    const v = version; if (busy) { pendingRun = setTimeout(() => { pendingRun = null; runBots(full); }, 300); return; }
    busy = true; setStatus('running bots...');
    try {
      await ensureSources(); globalThis.SURF_STAGE = clone(stage);
      const mod = { exports: {} }; new Function('module', botSrc)(mod); const trial = mod.exports(makeSim);
      const path = [], ent = {}; let n = 0;
      const good = trial(400, { hold: 10, tmax: 400, onTick: (G, t) => {
        const s = G.g(), lt = s.lastTouched;
        if (!(lt in ent)) ent[lt] = { t: +t.toFixed(1), speed: Math.round(Math.hypot(G.vel.x, G.vel.y, G.vel.z)), x: G.pos.x, y: G.pos.y, z: G.pos.z, vx: G.vel.x, vy: G.vel.y, vz: G.vel.z, yaw: s.yaw, nextCp: s.nextCp, cpRamp: s.cpRamp, i: lt };
        if (n++ % 4 === 0) path.push({ x: G.pos.x, y: G.pos.y, z: G.pos.z, v: Math.hypot(G.vel.x, G.vel.y, G.vel.z) });
      } });
      if (v !== version) { busy = false; return; }
      botRes = { good }; entries = ent; drawPath(path); renderList(); renderStatus();
      if (full) {
        for (const [name, o] of [['300ms', { hold: 30, tmax: 400 }], ['sloppy (30% lifts)', { hold: 20, lift: 0.3, checkpoints: true, seed: 3, tmax: 400 }]]) {
          await tick(); if (v !== version) { busy = false; return; }
          botRes[name] = trial(400, o); renderStatus();
        }
      }
    } catch (e) { setStatus('bot error: ' + e.message); console.error(e); }
    busy = false; if (pendingRun === null) renderStatus();
  }

  // ---------- UI ----------
  function css() {
    const s = document.createElement('style');
    s.textContent = `#ed{position:fixed;left:0;top:0;bottom:0;width:360px;background:#0e1424ee;color:#dfe6ff;font:13px/1.35 system-ui,sans-serif;overflow:auto;padding:10px;box-sizing:border-box;z-index:20;-webkit-user-select:text;user-select:text}
#ed h3{margin:12px 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8fa2d6}
#ed button{background:#27325a;color:#e8eeff;border:0;border-radius:6px;padding:5px 8px;margin:2px 2px 2px 0;font-size:12px;cursor:pointer}
#ed button:hover{background:#34437a}#ed button.on{background:#3fc1c9;color:#001}#ed button.danger{background:#5a2330}
#ed input,#ed select,#ed textarea{background:#18203a;color:#e8eeff;border:1px solid #33406e;border-radius:5px;padding:3px 5px;font-size:12px;box-sizing:border-box}
#ed .row{display:flex;gap:6px;align-items:center;margin:3px 0}#ed .row label{flex:0 0 112px;color:#aab6e0}#ed .row input[type=number]{width:84px}#ed .row small{color:#7d8ab8;flex:1}
#ed .piece{display:flex;gap:6px;padding:4px 6px;border-radius:6px;cursor:pointer;align-items:center}#ed .piece:hover{background:#1c2548}#ed .piece.sel{background:#2b3a73}
#ed .piece .n{flex:0 0 24px;color:#7d8ab8}#ed .piece .t{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#ed .piece .v{color:#7be3a8;font-size:11px}#ed .piece.bad .t{color:#ff8a8a}
#ed .ring{border:1px solid #33406e;border-radius:6px;padding:4px 6px;margin:4px 0}
#ed #edstat{position:sticky;bottom:-10px;background:#0b1020;padding:6px;margin:8px -10px -10px;border-top:1px solid #2a3560;font-size:12px}
#edhelp{position:fixed;right:10px;bottom:10px;color:#9fb0e0;font:12px system-ui;background:#0e1424cc;padding:6px 10px;border-radius:8px;z-index:20;pointer-events:none}
#edmodal{position:fixed;inset:0;background:#000a;z-index:30;display:flex;align-items:center;justify-content:center}#edmodal>div{background:#0e1424;color:#dfe6ff;padding:14px;border-radius:10px;width:min(720px,92vw)}#edmodal textarea{width:100%;height:50vh;font:11px monospace}`;
    document.head.appendChild(s);
  }
  function setHint(t) { const e = $id('edhint'); if (e) e.textContent = t; }
  function setStatus(t) { const e = $id('edstat'); if (e) e.textContent = t; }
  function renderStatus() {
    const e = $id('edstat'); if (!e) return;
    if (!botRes) { e.textContent = 'edit a piece; the good bot runs automatically'; return; }
    const f = (n, r) => n + ': ' + (r.res === 'done' ? r.t + 's, ' + r.falls + ' falls' : 'FAILED at piece ' + (r.lt + 1) + (r.falls ? ' (' + r.falls + ' falls)' : ''));
    e.innerHTML = Object.entries(botRes).map(([n, r]) => (n === 'good' ? '<b>' : '') + f(n === 'good' ? 'good bot' : n, r) + (n === 'good' ? '</b>' : '')).join('<br>') + (Object.keys(botRes).length < 3 ? '<br><i>(Full check runs the other bots)</i>' : '');
  }
  function label(p, i) {
    const k = kind(p); let s = k;
    if (k === 'ramp') s += ' L' + p.L + (p.C ? ' climb ' + p.C : '') + (p.zig ? ' zig' : '');
    else if (k === 'turn') s += ' ' + p.turn + '° R' + p.R + (p.zig ? ' zig' : '');
    else s += ' R' + p.loop.R + (p.loop.turns > 1 ? ' x' + p.loop.turns : '') + (p.loop.bank ? ' bank ' + p.loop.bank : '');
    if (p.cp) s += '  [checkpoint]';
    if (p.W && k !== 'loop' && k !== 'swirl') s += ' W' + p.W;
    if (p.rings) s += '  ' + p.rings.map(r => r.kind === 'portal' ? '◎' : '○').join('');
    return s;
  }
  function renderList() {
    const box = $id('edlist'); if (!box) return;
    const failAt = botRes && botRes.good.res === 'fail' ? botRes.good.lt : -1;
    box.innerHTML = '';
    stage.pieces.forEach((p, i) => {
      const e = entries[i], d = document.createElement('div');
      d.className = 'piece' + (i === sel ? ' sel' : '') + (i === failAt || i === failAt + 1 ? ' bad' : '');
      d.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t"></span><span class="v"></span>';
      d.querySelector('.t').textContent = label(p, i);
      d.querySelector('.v').textContent = e ? e.speed + ' u/s' : (botRes && i > 0 && !(i in entries) ? 'skipped' : '');
      d.onclick = () => { sel = i; drawSelection(); focusSel(); renderList(); renderInspector(); };
      box.appendChild(d);
    });
  }
  function numField(parent, obj, spec, onChange) {
    const [k, lab, mn, mx, st, tip] = spec, row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = lab; const inp = document.createElement('input'); inp.type = 'number'; inp.min = mn; inp.max = mx; inp.step = st;
    inp.value = obj[k] ?? ''; inp.placeholder = 'auto';
    inp.oninput = () => { if (inp.value === '') delete obj[k]; else obj[k] = Math.max(mn, Math.min(mx, +inp.value)); onChange(); };
    row.append(l, inp); if (tip) { const s = document.createElement('small'); s.textContent = tip; row.append(s); } parent.appendChild(row); return inp;
  }
  function checkField(parent, obj, k, lab, onChange) {
    const row = document.createElement('div'); row.className = 'row'; const l = document.createElement('label'); l.textContent = lab; const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!obj[k];
    c.onchange = () => { if (c.checked) obj[k] = true; else delete obj[k]; onChange(); }; row.append(l, c); parent.appendChild(row);
  }
  function renderInspector() {
    const box = $id('edinsp'); if (!box) return; box.innerHTML = ''; const p = stage.pieces[sel]; if (!p) return;
    const k = kind(p), ch = () => { change(); }, h = document.createElement('h3'); h.textContent = 'Piece ' + (sel + 1) + ': ' + k; box.appendChild(h);
    if (sel > 0) F_COMMON.slice(0, 3).forEach(s => numField(box, p, s, ch));
    if (k === 'ramp') { F_RAMP.forEach(s => numField(box, p, s, ch)); checkField(box, p, 'zig', 'Zigzag', ch); checkField(box, p, 'cp', 'Checkpoint', ch); }
    else if (k === 'turn') { F_TURN.forEach(s => numField(box, p, s, ch)); checkField(box, p, 'zig', 'Zigzag', ch); checkField(box, p, 'cp', 'Checkpoint', ch); }
    else { F_LOOP.forEach(s => numField(box, p.loop, s, ch)); }
    numField(box, p, F_COMMON[3], ch);
    const rh = document.createElement('h3'); rh.textContent = 'Rings in the flight before this piece'; box.appendChild(rh);
    (p.rings || []).forEach((rg, ri) => {
      const d = document.createElement('div'); d.className = 'ring';
      const top = document.createElement('div'); top.className = 'row'; const sl = document.createElement('select');
      for (const o of ['hoop', 'portal']) { const op = document.createElement('option'); op.value = op.textContent = o; sl.appendChild(op); } sl.value = rg.kind || 'hoop';
      sl.onchange = () => { rg.kind = sl.value; change(); renderInspector(); };
      const del = document.createElement('button'); del.textContent = 'remove'; del.className = 'danger'; del.onclick = () => { p.rings.splice(ri, 1); if (!p.rings.length) delete p.rings; change(); renderInspector(); };
      top.append(sl, del); d.appendChild(top);
      F_RING.filter(s => !(rg.kind === 'portal' && s[0] === 'boost') && !(rg.kind !== 'portal' && s[0] === 'theme')).forEach(s => numField(d, rg, s, ch)); box.appendChild(d);
    });
    if (sel === 0) { const n = document.createElement('small'); n.textContent = 'Rings need a previous piece to measure from.'; box.appendChild(n); }
    else { const a = document.createElement('button'); a.textContent = '+ Hoop'; a.onclick = () => { (p.rings = p.rings || []).push(clone(RING_PRESETS.hoop)); change(); renderInspector(); };
      const b = document.createElement('button'); b.textContent = '+ Portal'; b.onclick = () => { (p.rings = p.rings || []).push(clone(RING_PRESETS.portal)); change(); renderInspector(); }; box.append(a, b); }
    const ops = document.createElement('div'); ops.style.marginTop = '8px';
    const btn = (t, f, cls) => { const b = document.createElement('button'); b.textContent = t; if (cls) b.className = cls; b.onclick = f; ops.appendChild(b); };
    btn('▲ move up', () => move(-1)); btn('▼ move down', () => move(1)); btn('duplicate', dup); btn('delete', del, 'danger'); btn('focus (F)', () => focusSel()); box.appendChild(ops);
  }
  function move(d) { const j = sel + d; if (j < 0 || j >= stage.pieces.length) return; [stage.pieces[sel], stage.pieces[j]] = [stage.pieces[j], stage.pieces[sel]]; sel = j; change(); renderInspector(); }
  function dup() { stage.pieces.splice(sel + 1, 0, clone(stage.pieces[sel])); sel++; change(); renderInspector(); }
  function del() { if (stage.pieces.length < 2) return; stage.pieces.splice(sel, 1); sel = Math.min(sel, stage.pieces.length - 1); change(); renderInspector(); }
  function add(key) {
    const made = PRESETS[key].piece(), list = Array.isArray(made) ? made : [made];
    stage.pieces.splice(sel + 1, 0, ...list); sel++; change(); focusSel(); renderInspector();
  }
  function modal(title, text, onOk) {
    const m = document.createElement('div'); m.id = 'edmodal'; m.innerHTML = '<div><b></b><textarea spellcheck="false"></textarea><div style="margin-top:8px"></div></div>';
    m.querySelector('b').textContent = title; const ta = m.querySelector('textarea'); ta.value = text; const bar = m.querySelector('div > div');
    const b = (t, f) => { const x = document.createElement('button'); x.textContent = t; x.style.cssText = 'background:#27325a;color:#fff;border:0;border-radius:6px;padding:6px 12px;margin-right:6px'; x.onclick = f; bar.appendChild(x); };
    if (onOk) b('Load', () => { try { onOk(ta.value); m.remove(); } catch (e) { alert('Not valid stage JSON: ' + e.message); } });
    else b('Copy', () => { navigator.clipboard.writeText(ta.value).catch(() => ta.select()); });
    b('Close', () => m.remove()); document.body.appendChild(m); ta.focus();
  }
  function play(from) {
    try {
      localStorage.setItem('surf_custom_stage', JSON.stringify(stage));
      localStorage.setItem('surf_custom_from', from !== undefined && entries[from] ? JSON.stringify({ ...entries[from], cpRamp: entries[from].cpRamp ?? 0 }) : '');
      window.open(location.pathname + '#custom', '_blank');
    } catch (e) { alert('Could not open the game: ' + e.message); }
  }
  function renderPanel() {
    const ed = $id('ed') || Object.assign(document.createElement('div'), { id: 'ed' }); if (!ed.parentNode) document.body.appendChild(ed);
    ed.innerHTML = '';
    const how = document.createElement('div'); how.style.cssText = 'background:#16204a;border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:12px;line-height:1.5';
    how.innerHTML = '<b>How to build</b><br>1. Press <b>+ Ramp</b> below, or click a ramp in the 3D view.<br>2. Drag the balls on the selected ramp:<br><span style="color:#ffe14a">&#9679;</span> yellow: <b>length</b> (turn angle on a turn) &nbsp;<span style="color:#ff9a3c">&#9679;</span> orange: <b>width</b><br><span style="color:#4be07a">&#9679;</span> green: <b>move</b> along the ground and sideways &nbsp;<span style="color:#4aa8ff">&#9670;</span> blue: <b>raise / lower</b><br>3. The coloured line is the bot riding it; red rows are where it falls. Press <b>Play</b> to try it yourself.';
    ed.appendChild(how);
    const top = document.createElement('div'); top.innerHTML = '<h3 style="margin-top:0">Stage</h3>'; ed.appendChild(top);
    const nm = document.createElement('input'); nm.value = stage.name || ''; nm.style.width = '100%'; nm.placeholder = 'stage name'; nm.oninput = () => { stage.name = nm.value; snapshot(); }; top.appendChild(nm);
    const sr = document.createElement('div'); sr.className = 'row'; sr.innerHTML = '<label>Scenery</label>';
    const sc = document.createElement('select'); for (const o of ['plain', 'descent']) { const op = document.createElement('option'); op.value = op.textContent = o; sc.appendChild(op); } sc.value = stage.scenery || 'plain';
    sc.onchange = () => { stage.scenery = sc.value; change(); }; sr.appendChild(sc);
    const t0 = document.createElement('select'); ['moon', 'atmosphere', 'sky', 'Earth'].forEach((o, i) => { const op = document.createElement('option'); op.value = i; op.textContent = 'start: ' + o; t0.appendChild(op); }); t0.value = stage.theme0 || 0;
    t0.onchange = () => { stage.theme0 = +t0.value; change(); }; sr.appendChild(t0); top.appendChild(sr);
    const bar = document.createElement('div'); const bt = (t, f, cls) => { const b = document.createElement('button'); b.textContent = t; if (cls) b.className = cls; b.onclick = f; bar.appendChild(b); };
    bt('▶ Play', () => play()); bt('▶ Play from selected', () => play(sel)); bt('Full check', () => runBots(true)); bt('Undo', () => undo(-1)); bt('Redo', () => undo(1));
    bt('Export', () => modal('Stage JSON (copy it)', JSON.stringify(stage, null, 1))); bt('Import', () => modal('Paste stage JSON', '', t => { const s = JSON.parse(t); if (!s.pieces) throw new Error('no pieces'); stage = s; sel = 0; snapshot(); refresh(true); }));
    top.appendChild(bar);
    const tp = document.createElement('div'); tp.innerHTML = '<small style="color:#7d8ab8">Start from: </small>'; for (const n of [1, 2, 3]) { const b = document.createElement('button'); b.textContent = 'Level ' + n; b.onclick = () => { if (confirm('Replace the current stage with a copy of Level ' + n + '?')) { stage = fromLevel(n); sel = 0; snapshot(); refresh(true); } }; tp.appendChild(b); }
    const nb = document.createElement('button'); nb.textContent = 'New'; nb.onclick = () => { if (confirm('Start an empty stage?')) { stage = { name: 'New stage', scenery: 'plain', theme0: 0, pieces: [{ L: 3000 }, { L: 3500, gap: 700, drop: 1200 }, { turn: 60, R: 6500 }, { L: 3500 }] }; sel = 0; snapshot(); refresh(true); } }; tp.appendChild(nb); top.appendChild(tp);
    const ph = document.createElement('h3'); ph.textContent = 'Add after the selected piece'; ed.appendChild(ph);
    const pal = document.createElement('div'); for (const [k, v] of Object.entries(PRESETS)) { const b = document.createElement('button'); b.textContent = '+ ' + v.label; b.title = v.tip; b.onclick = () => add(k); pal.appendChild(b); } ed.appendChild(pal);
    const lh = document.createElement('h3'); lh.textContent = 'Pieces (entry speed from the good bot)'; ed.appendChild(lh);
    const list = document.createElement('div'); list.id = 'edlist'; ed.appendChild(list);
    const insp = document.createElement('div'); insp.id = 'edinsp'; ed.appendChild(insp);
    const st = document.createElement('div'); st.id = 'edstat'; ed.appendChild(st);
    renderList(); renderInspector(); renderStatus();
  }

  // ---------- camera + input ----------
  function setupInput() {
    const cv = renderer.domElement; let drag = null;
    const stop = e => { e.stopImmediatePropagation(); };
    let moved = 0;
    cv.addEventListener('pointerdown', e => {
      stop(e); e.preventDefault(); moved = 0; cv.setPointerCapture(e.pointerId);
      const k = e.button === 0 && !e.shiftKey ? hitHandle(e) : null, D = k ? startHandle(k, e) : null;
      if (D) { hDrag = D; drag = null; cv.style.cursor = 'grabbing'; return; }
      drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey || e.button === 1 };
    }, true);
    cv.addEventListener('pointermove', e => {
      stop(e);
      if (hDrag) { dragHandle(e); return; }
      if (!drag) { const k = hitHandle(e); cv.style.cursor = k ? 'grab' : 'default'; setHint(k ? 'drag: ' + HNAME[k] : ''); return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (drag.pan) { const k = cam.dist * 0.0012, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw); cam.tx += (-dx * cy) * k; cam.tz += (dx * sy) * k; cam.ty += dy * k; }
      else { cam.yaw -= dx * 0.006; cam.pitch = Math.max(-1.45, Math.min(1.45, cam.pitch + dy * 0.006)); }
    }, true);
    const up = e => {
      stop(e);
      if (hDrag) { hDrag = null; cv.style.cursor = 'default'; dirty = false; snapshot(); rebuild(); renderList(); renderInspector(); renderStatus(); return; }
      if (drag && moved < 6 && e.button === 0) pickPiece(e);
      drag = null;
    }; cv.addEventListener('pointerup', up, true); cv.addEventListener('pointercancel', up, true);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(300, Math.min(900000, cam.dist * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
    addEventListener('keydown', e => {
      e.stopImmediatePropagation(); if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) return;
      if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); drawSelection(); focusSel(); renderList(); renderInspector(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { sel = Math.min(stage.pieces.length - 1, sel + 1); drawSelection(); focusSel(); renderList(); renderInspector(); e.preventDefault(); }
      else if (e.key === 'Delete') del(); else if (e.key === 'f' || e.key === 'F') focusSel(); else if (e.key === 'd' || e.key === 'D') dup();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { undo(e.shiftKey ? 1 : -1); e.preventDefault(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { undo(1); e.preventDefault(); }
    }, true);
    addEventListener('keyup', e => e.stopImmediatePropagation(), true);
  }
  function frame(dt, now) {
    const cp = Math.cos(cam.pitch);
    camera.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, cam.ty + Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist);
    if (dirty && now - lastRb > 90) { dirty = false; lastRb = now; rebuild(); renderList(); }
    placeHandles();
    camera.lookAt(cam.tx, cam.ty, cam.tz); camera.fov = 50; camera.near = Math.max(10, cam.dist / 3000); camera.far = 4e6; camera.updateProjectionMatrix();
    scene.fog.far = FOG_FAR * 3; tickTheme(dt); updateRings(dt, now); stars.position.copy(camera.position);
    renderer.setRenderTarget(null); renderer.render(scene, camera);
    const w = innerWidth - 360; if (w > 100) camera.aspect = innerWidth / innerHeight;
  }

  // ---------- start ----------
  function init() {
    for (const id of ['timer', 'best', 'prog', 'toast', 'speed', 'gear', 'restart', 'settings', 'msg', 'flash']) { const e = $id(id); if (e) e.style.display = 'none'; }
    snail.visible = false; trailMesh.visible = false; shadow.visible = false; wind.mesh.visible = false; clouds.mesh.visible = false; intro.on = false;
    css(); stage = load(); snapshot(); setupInput();
    const h = document.createElement('div'); h.id = 'edhelp'; h.innerHTML = '<b id="edhint"></b><br>drag: orbit · right-drag / shift-drag: pan · wheel: zoom · ↑↓: select · F: focus · D: duplicate · Del: delete · Ctrl+Z: undo · click a ramp: select'; document.body.appendChild(h);
    refresh(true);
  }
  init();
})();
