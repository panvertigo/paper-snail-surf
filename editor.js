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
  const F_RAMP = [['L', 'Length', 500, 40000, 100], ['W', 'Half-width', 250, 1300, 10, 'Carries on to later ramps'], ['C', 'Climb', -4000, 4000, 50, 'Net climb: positive = uphill, negative = a steeper down ramp']];
  const F_TURN = [['turn', 'Turn (deg)', 10, 360, 5], ['R', 'Radius', 1500, 60000, 100, 'Bigger = a wider, faster sweep'], ['W', 'Half-width', 250, 1300, 10]];
  const F_LOOP = [['R', 'Radius', 500, 3000, 50, 'Bigger = needs more speed'], ['phi', 'Entry angle', 0, 1.2, 0.05, 'Quarter-pipe you drop onto (rad)'], ['phi2', 'Exit angle', 0, 1, 0.05, 'Launch angle (blank: 0.3, banked: 0)'],
    ['turns', 'Turns', 1, 4, 1, '1 = loop, 2+ = corkscrew / swirl'], ['bank', 'Bank (deg)', 0, 80, 5, '0 = vertical loop, high = flat swirl'], ['W', 'Half-width', 300, 900, 10], ['dir', 'Side (1 / -1)', -1, 1, 2, 'Which way the turns drift'], ['off', 'Lane offset', -600, 600, 10]];
  const F_RING = [['d', 'Ahead', -500, 3000, 50, 'Distance past the previous piece\'s end'], ['y', 'Height', -1500, 3000, 50], ['s', 'Lane', -1500, 1500, 50, 'Blank = where the rider flies'], ['R', 'Radius', 100, 800, 10],
    ['boost', 'Boost (hoop)', 0, 400, 10], ['theme', 'Scene (portal)', 0, 3, 1, '0 moon, 1 atmosphere, 2 sky, 3 Earth'], ['dip', 'Dip (deg)', -30, 60, 5]];

  let stage, sel = 0, selEnd = null, clip = null, hist = [], histI = -1, version = 0, savedJ = null, fresh = false;
  const LEVEL_NAMES = { 1: 'cruise', 2: 'gauntlet', 3: 'descent', 5: 'grand descent' };
  let SONGS = [{ id: 'chicago', name: 'Chicago Meditation' }, { id: 'fleetwood', name: 'Fleetwood Mac' }, { id: 'salt', name: 'Salt for Mushroom Field' }, { id: 'bowl', name: 'Bowl mix' }, { id: 'descent', name: 'Demo (generated)' }];
  let botRes = null, entries = {}, pathLine = null, selObjs = [], busy = false, pendingRun = null;
  const cam = { yaw: 0.6, pitch: 0.55, dist: 60000, tx: 0, ty: 0, tz: 0 };

  // ---------- stage helpers ----------
  const kind = p => p.loop ? (p.loop.bank ? 'swirl' : 'loop') : p.turn ? 'turn' : 'ramp';
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.pieces && s.pieces.length) return s; } catch (e) {}
    fresh = true; return { name: 'My first course', scenery: 'plain', theme0: 0, pieces: [{ L: 3000 }, { L: 3500, gap: 700, drop: 1200 }, { turn: 60, R: 6500 }, { L: 3500, cp: true }] };
  }
  function fromLevel(n) { const m = STAGE_META[n] || {}; const o = { name: 'Level ' + n + ' copy', scenery: m.scenery || 'plain', theme0: 0, pieces: clone(STAGES[n]) }; for (const k of ['music', 'pull', 'fall']) if (m[k] !== undefined) o[k] = m[k]; if (m.riskRings) o.riskRings = clone(m.riskRings); return o; /* feel settings come along too */ }
  function snapshot() { const j = JSON.stringify(stage); if (hist[histI] === j) return; hist = hist.slice(0, histI + 1); hist.push(j); histI = hist.length - 1; if (hist.length > 200) { hist.shift(); histI--; } try { localStorage.setItem(KEY, j); } catch (e) {} updateBar(); }
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
  function fillOf(r, color, op) { // translucent wash over a ramp's two faces, so the selected / hovered ramp is obvious
    if (r.tube) return null;
    const n = (r.k || r.C) ? Math.max(2, Math.ceil(r.L / 150)) : Math.max(1, Math.ceil(r.L / 800)), pos = [];
    const Pt = (u, v, y) => { const q = ridgeAt(r, u), rt = rightOf(r.h0 + r.k * u); return [q[0] + rt[0] * v, r.oy + zOf(r, u) + y, q[1] + rt[2] * v]; };
    for (let j = 0; j < n; j++) for (const sd of [1, -1]) { const ua = r.L * j / n, ub = r.L * (j + 1) / n, A = Pt(ua, 0, r.H), B = Pt(ua, sd * r.W, 0), A2 = Pt(ub, 0, r.H), B2 = Pt(ub, sd * r.W, 0); pos.push(...A, ...B, ...B2, ...A, ...B2, ...A2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    m.renderOrder = 8; m.frustumCulled = false; scene.add(m); return m;
  }
  let hoverObjs = [], hoverI = -2, lastHover = 0;
  function setHover(i) { if (i === hoverI) return; hoverI = i; disposeObjs(hoverObjs); if (i >= 0 && i !== sel && ramps[i]) { const f = fillOf(ramps[i], 0xffffff, 0.28); if (f) hoverObjs.push(f); } }
  function drawSelection() {
    disposeObjs(selObjs); hoverI = -2; disposeObjs(hoverObjs); const r = ramps[sel]; if (!r) return;
    { const f = fillOf(r, 0xffe14a, 0.32); if (f) selObjs.push(f); }
    const pts = [];
    if (r.tube) { const T = r.tube; for (let t = 0; t <= T.sweep; t += 0.08) { const a = T.th0 + t, c = Math.cos(a), s = Math.sin(a), q = T.shift(t); pts.push([T.ox + T.R * (c * T.e1[0] + s * T.e2[0]) + T.ax[0] * q, T.oy + T.R * (c * T.e1[1] + s * T.e2[1]) + T.ax[1] * q, T.oz + T.R * (c * T.e1[2] + s * T.e2[2]) + T.ax[2] * q]); } }
    else { const n = Math.max(4, Math.ceil(r.L / 300)); for (let i = 0; i <= n; i++) { const u = r.L * i / n, c = ridgeAt(r, u); pts.push([c[0], r.oy + zOf(r, u) + r.H + 40, c[1]]); } }
    selObjs.push(lineOf(pts, 0xffe14a));
    const b = r.tube ? [r.tube.ox, r.tube.oy, r.tube.oz] : [r.sx, r.oy + r.H, r.sz];
    E.focusPoint = b; drawHandles();
  }
  // ---------- drag handles: shape and place the selected piece right in the 3D view ----------
  // purple diamond = slope (auto net climb), pink ball on a turn = radius. green ball = move along the ground (gap + sideways), blue diamond = raise / lower (drop), yellow = length (turn angle on a turn), orange = width
  const HCOL = { move: 0x4be07a, rise: 0x4aa8ff, len: 0xffe14a, wid: 0xff9a3c, slope: 0xc77dff, rad: 0xff5fa2, ext: 0x2de2e6 }, HNAME = { move: 'Move (gap and sideways)', rise: 'Raise / lower', len: 'Length', wid: 'Width', slope: 'Slope (auto climb)', rad: 'Sweep radius', ext: 'Extend: drag out a new ramp (it bends toward where you drag)' };
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
      out.push({ k: 'ext', p: [r.ex, r.ey + r.H, r.ez] });
      { const us = r.L * 0.7, cs = ridgeAt(r, us); out.push({ k: 'slope', p: [cs[0], r.oy + zOf(r, us) + r.H, cs[1]] }); }
      if (r.k) { const um = r.L * 0.5, cm = ridgeAt(r, um), ox = (cm[0] - r.cx) / r.Rc, oz = (cm[1] - r.cz) / r.Rc; out.push({ k: 'rad', p: [cm[0], r.oy + zOf(r, um) + r.H, cm[1]], out: [ox, oz] }); }
    }
    return out;
  }
  function drawHandles() {
    disposeObjs(hObjs);
    for (const h of handlePoints()) {
      const m = new THREE.Mesh(h.k === 'rise' || h.k === 'slope' || h.k === 'ext' ? new THREE.OctahedronGeometry(1) : new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: HCOL[h.k], depthTest: false, transparent: true, opacity: 0.95 }));
      m.renderOrder = 12; m.userData = { k: h.k, base: h.p }; m.position.set(h.p[0], h.p[1], h.p[2]); scene.add(m); hObjs.push(m);
    }
    placeHandles();
  }
  E.handleScreen = k => { const m = hObjs.find(o => o.userData.k === k); if (!m) return null; const v = m.position.clone().project(camera), rc = renderer.domElement.getBoundingClientRect(); return [(v.x * 0.5 + 0.5) * rc.width + rc.left, (-v.y * 0.5 + 0.5) * rc.height + rc.top]; }; // for tests
  E.select = i => { sel = i; drawSelection(); focusSel(); renderList(); renderInspector(); };
  function placeHandles() { const hs = cam.dist * 0.013; for (const m of hObjs) { m.scale.setScalar(m.userData.k === 'rise' || m.userData.k === 'slope' || m.userData.k === 'ext' ? hs * 0.9 : hs); const b = m.userData.base; m.position.set(b[0], b[1] + (m.userData.k === 'rise' || m.userData.k === 'slope' ? hs * 3 : m.userData.k === 'ext' ? hs * 6 : 0), b[2]); } }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function setRay(e) { const rc = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height * 2 - 1)); camera.aspect = rc.width / rc.height; camera.updateProjectionMatrix(); ray.setFromCamera(ndc, camera); }
  function hitHandle(e) { setRay(e); const hit = ray.intersectObjects(hObjs, false)[0]; return hit ? hit.object.userData.k : null; }
  const atY = y => { const o = ray.ray.origin, d = ray.ray.direction; if (Math.abs(d.y) < 1e-4) return null; const t = (y - o.y) / d.y; return t > 0 ? [o.x + d.x * t, y, o.z + d.z * t] : null; };
  const atVert = (p0, nx, nz) => { const o = ray.ray.origin, d = ray.ray.direction, den = d.x * nx + d.z * nz; if (Math.abs(den) < 1e-4) return null; const t = ((p0[0] - o.x) * nx + (p0[2] - o.z) * nz) / den; return t > 0 ? [o.x + d.x * t, o.y + d.y * t, o.z + d.z * t] : null; };
  function startHandle(k, e) {
    const r = ramps[sel], p = stage.pieces[sel], prev = sel > 0 ? ramps[sel - 1] : null, h = handlePoints().find(q => q.k === k);
    const D = { k, p, gap0: p.gap ?? 480, lat0: p.lat || 0, L0: p.L, turn0: p.turn, nx: Math.sin(cam.yaw), nz: Math.cos(cam.yaw), d1: r.tube ? null : dirOf(r.h1), c: h.c, rt: h.rt, hp: h.p, C0: p.C || 0, R0: p.R, out: h.out, rt1: r.tube ? null : rightOf(r.h1), at: sel };
    D.drop0 = prev ? (p.drop ?? (r.tube ? 20 - 0.42 * prev.H : prev.ey - r.oy)) : 0;
    if (prev) { D.pd = dirOf(prev.h1); D.pr = rightOf(prev.h1); }
    setRay(e); D.P0 = k === 'rise' || k === 'slope' ? atVert(h.p, D.nx, D.nz) : atY(h.p[1]); if (!D.P0) return null; return D;
  }
  function dragHandle(e) {
    const D = hDrag; setRay(e); const P = D.k === 'rise' || D.k === 'slope' ? atVert(D.hp, D.nx, D.nz) : atY(D.hp[1]); if (!P) return; const p = D.p;
    const dx = P[0] - D.P0[0], dz = P[2] - D.P0[2];
    if (D.k === 'ext') { extDrag(D, dx, dz); return; }
    if (D.k === 'move') { p.gap = clampv(snap(D.gap0 + dx * D.pd[0] + dz * D.pd[2], 50), 0, 4000); const lat = clampv(snap(D.lat0 + dx * D.pr[0] + dz * D.pr[2], 50), -3000, 3000); if (lat) p.lat = lat; else delete p.lat; setStatus('Move: gap ' + p.gap + ', sideways ' + (p.lat || 0)); }
    else if (D.k === 'rise') { p.drop = clampv(snap(D.drop0 - (P[1] - D.P0[1]), 50), -2000, 9000); setStatus('Height: drop ' + p.drop); }
    else if (D.k === 'len') { const a = dx * D.d1[0] + dz * D.d1[2]; if (p.turn) { p.turn = clampv(snap(D.turn0 + a / p.R * 57.2958, 5), 10, 360); setStatus('Turn ' + p.turn + ' deg'); } else { p.L = clampv(snap(D.L0 + a, D.L0 > 12000 ? 500 : 100), 500, 40000); setStatus('Length ' + p.L); } }
    else if (D.k === 'slope') { const c = clampv(snap(D.C0 + (P[1] - D.P0[1]) * 1.4, 50), -4000, 4000); if (c) p.C = c; else delete p.C; setStatus('Slope: net climb ' + c + (c < 0 ? ' (steeper down ramp)' : c > 0 ? ' (uphill)' : ' (normal)')); }
    else if (D.k === 'rad') { const d = dx * D.out[0] + dz * D.out[1], arc = D.R0 * p.turn * 0.0174533, R = clampv(D.R0 * Math.exp(d / (0.35 * arc)), 1500, 60000); p.R = snap(R, R < 10000 ? 100 : 500); setStatus('Sweep radius ' + p.R + ' (turn limit about ' + Math.round(Math.sqrt(1000 * p.R)) + ' u/s)'); }
    else if (D.k === 'wid') { p.W = clampv(snap(Math.abs((P[0] - D.c[0]) * D.rt[0] + (P[2] - D.c[1]) * D.rt[2]), 10), 250, 1300); setStatus('Half-width ' + p.W); }
    dirty = true; D.moved = true;
  }
  // Extend: the new piece is an arc through the dragged point (tangent to where the last ramp ends), or a straight ramp when the point is straight ahead.
  function extDrag(D, dx, dz) {
    const a = dx * D.d1[0] + dz * D.d1[2], b = dx * D.rt1[0] + dz * D.rt1[2]; if (a < 500) return;
    let np; if (Math.abs(b) < 0.1 * a) np = { L: clampv(snap(a, a > 12000 ? 500 : 100), 500, 40000) };
    else { const R0 = (a * a + b * b) / (2 * Math.abs(b)), th = 2 * Math.atan2(Math.abs(b), a) * 57.2958, R = clampv(R0, 1500, 60000); np = { turn: clampv(snap(th, 5), 10, 360), R: snap(R, R < 10000 ? 100 : 500) }; }
    const key = JSON.stringify(np) + Math.sign(b); if (key === D.lastKey) return; D.lastKey = key;
    if (D.idx == null) { stage.pieces.splice(D.at + 1, 0, np); D.idx = D.at + 1; } else stage.pieces[D.idx] = np;
    if (np.turn) { rebuild(); const r2 = ramps[D.idx]; if (r2 && Math.sign(r2.k) !== -Math.sign(b)) np.zig = true; }
    setStatus(np.turn ? 'New arc ' + np.turn + ' deg, radius ' + np.R + (np.zig ? ' (zig)' : '') : 'New ramp L ' + np.L); dirty = true;
  }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _hit = new THREE.Vector3();
  function rayRamp(e) { // click a ramp's surface: ray against the real faces, nearest wins
    setRay(e); let best = null, bd = 1e18;
    ramps.forEach((r, i) => {
      if (r.tube) return;
      const n = (r.k || r.C) ? Math.max(2, Math.ceil(r.L / 150)) : Math.max(1, Math.ceil(r.L / 800));
      const Pt = (u, v, y, t) => { const q = ridgeAt(r, u), rt = rightOf(r.h0 + r.k * u); return t.set(q[0] + rt[0] * v, r.oy + zOf(r, u) + y, q[1] + rt[2] * v); };
      for (let j = 0; j < n; j++) for (const sd of [1, -1]) {
        const ua = r.L * j / n, ub = r.L * (j + 1) / n;
        Pt(ua, 0, r.H, _a); Pt(ua, sd * r.W, 0, _b); Pt(ub, sd * r.W, 0, _c); Pt(ub, 0, r.H, _d);
        for (const h of [ray.ray.intersectTriangle(_a, _b, _c, false, _hit), ray.ray.intersectTriangle(_a, _c, _d, false, _hit)]) { if (h) { const dd = h.distanceTo(ray.ray.origin); if (dd < bd) { bd = dd; best = { i, p: [h.x, h.y, h.z] }; } } }
      }
    });
    return best;
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
    if (best >= 0) { sel = best; selEnd = null; drawSelection(); renderList(); renderInspector(); }
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
  let topPrev = null;
  function toggleTop() { if (topPrev) { cam.pitch = topPrev; topPrev = null; setStatus('Perspective view'); } else { topPrev = cam.pitch; cam.pitch = 1.45; setStatus('Top view: shows the whole route as a map. Press T to go back.'); } }
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
    else if (k === 'turn') s += ' ' + p.turn + '° R' + p.R + (p.C ? ' climb ' + p.C : '') + (p.zig ? ' zig' : '');
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
      d.className = 'piece' + (i === sel || (selEnd != null && i >= range()[0] && i <= range()[1]) ? ' sel' : '') + (i === failAt || i === failAt + 1 ? ' bad' : '');
      d.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t"></span><span class="v"></span>';
      d.querySelector('.t').textContent = label(p, i);
      d.querySelector('.v').textContent = e ? e.speed + ' u/s' : (botRes && i > 0 && !(i in entries) ? 'skipped' : '');
      d.onclick = ev => { if (ev.shiftKey) selEnd = i; else { sel = i; selEnd = null; } drawSelection(); focusSel(); renderList(); renderInspector(); };
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
  const range = () => selEnd == null ? [sel, sel] : [Math.min(sel, selEnd), Math.max(sel, selEnd)];
  function copyRange() { const [a, b] = range(); clip = clone(stage.pieces.slice(a, b + 1)); setStatus('Copied ' + clip.length + ' piece' + (clip.length > 1 ? 's' : '') + '. Ctrl+V pastes after the selection.'); }
  function pasteRange() { if (!clip) { setStatus('Nothing copied yet (select pieces, Ctrl+C).'); return; } const at = range()[1] + 1; stage.pieces.splice(at, 0, ...clone(clip)); sel = at; selEnd = at + clip.length - 1; change(); renderInspector(); }
  function move(d) { const j = sel + d; if (j < 0 || j >= stage.pieces.length) return; [stage.pieces[sel], stage.pieces[j]] = [stage.pieces[j], stage.pieces[sel]]; sel = j; change(); renderInspector(); }
  function dup() { stage.pieces.splice(sel + 1, 0, clone(stage.pieces[sel])); sel++; change(); renderInspector(); }
  function del() { const [a, b] = range(); if (stage.pieces.length - (b - a + 1) < 1) return; stage.pieces.splice(a, b - a + 1); sel = Math.min(a, stage.pieces.length - 1); selEnd = null; change(); renderInspector(); }
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
      localStorage.setItem('surf_custom_stage', JSON.stringify(stage)); localStorage.setItem('surf_custom_id', stage.id || '');
      localStorage.setItem('surf_custom_from', from !== undefined && entries[from] ? JSON.stringify({ ...entries[from], cpRamp: entries[from].cpRamp ?? 0 }) : '');
      window.open(location.pathname + '#custom', '_blank');
    } catch (e) { alert('Could not open the game: ' + e.message); }
  }
  // ---------- course library: new / copy / open / save (built-in levels are never edited, only copied) ----------
  const unsaved = () => savedJ === null || JSON.stringify(stage) !== savedJ;
  function updateBar() { const pl = $id('edpill'); if (!pl) return; const u = unsaved(); pl.textContent = u ? 'UNSAVED CHANGES: press Save' : 'Saved in My courses'; pl.style.background = u ? '#c2571a' : '#1f7a4a'; }
  function popup(title, body, buttons) {
    const m = document.createElement('div'); m.id = 'edmodal'; const box = document.createElement('div'), h = document.createElement('b'); h.textContent = title; box.appendChild(h);
    if (typeof body === 'string') { const q = document.createElement('p'); q.textContent = body; q.style.margin = '8px 0'; box.appendChild(q); } else if (body) box.appendChild(body);
    const bar = document.createElement('div'); bar.style.marginTop = '10px';
    for (const [t, f, cls] of buttons) { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'color:#fff;border:0;border-radius:6px;padding:8px 14px;margin-right:8px;cursor:pointer;font-size:13px;background:' + (cls === 'primary' ? '#1f7a4a' : cls === 'danger' ? '#8a2c3c' : '#27325a'); b.onclick = () => { m.remove(); if (f) f(); }; bar.appendChild(b); }
    box.appendChild(bar); m.appendChild(box); m.onclick = e => { if (e.target === m) m.remove(); }; document.body.appendChild(m); return m;
  }
  function chooser(title, groups, onPick) {
    const wrap = document.createElement('div'); wrap.style.cssText = 'max-height:55vh;overflow:auto;margin-top:8px'; let m;
    for (const [label, items] of groups) { if (!items.length) continue; const gh = document.createElement('div'); gh.textContent = label; gh.style.cssText = 'margin:10px 0 4px;color:#8fa2d6;font-size:12px;text-transform:uppercase'; wrap.appendChild(gh);
      for (const it of items) { const b = document.createElement('button'); b.style.cssText = 'display:block;width:100%;text-align:left;background:#1c2548;color:#fff;border:0;border-radius:6px;padding:9px 10px;margin:3px 0;cursor:pointer;font-size:13px'; const t = document.createElement('b'); t.textContent = it.t; b.appendChild(t); if (it.s) { const q = document.createElement('span'); q.textContent = '   ' + it.s; q.style.color = '#8fa2d6'; b.appendChild(q); } b.onclick = () => { m.remove(); onPick(it); }; wrap.appendChild(b); } }
    m = popup(title, wrap, [['Cancel']]);
  }
  function adopt(st, note) { stage = st; if (!stage.id) stage.id = Courses.uid(); Courses.save(stage); savedJ = Courses.json(stage.id); sel = 0; hist = []; histI = -1; snapshot(); refresh(true); setStatus(note || ''); }
  function guard(next) { if (!unsaved()) { next(); return; } popup('Unsaved changes', 'Your current course has changes that are not saved. What now?', [['Save, then continue', () => { saveCourse(); next(); }, 'primary'], ['Discard the changes', next, 'danger'], ['Cancel']]); }
  function newCourse() { guard(() => adopt({ name: 'New course', scenery: 'plain', theme0: 0, pieces: [{ L: 3000 }, { L: 3500, gap: 700, drop: 1200 }, { turn: 60, R: 6500 }, { L: 3500, cp: true }] }, 'New course created and saved.')); }
  function copyFrom() {
    guard(() => { const mine = Courses.list().map(c => ({ t: c.name, s: c.pieces + ' pieces', my: c.id }));
      chooser('Copy which course?  The original is never touched.', [['Built-in levels', [1, 2, 3, 5].map(n => ({ t: 'Level ' + n + '  ' + LEVEL_NAMES[n], s: 'built in', lvl: n }))], ['My courses', mine]], it => {
        let st; if (it.lvl) { st = fromLevel(it.lvl); st.name = 'Level ' + it.lvl + ' copy'; } else { st = Courses.get(it.my); st.name = (st.name || 'Course') + ' copy'; }
        delete st.id; adopt(st, 'Copy made and saved: ' + st.name + '. Edit freely, the original is untouched.'); }); });
  }
  function openCourse() {
    guard(() => { const mine = Courses.list().map(c => ({ t: c.name, s: c.pieces + ' pieces, ' + new Date(c.updated).toLocaleDateString(), my: c.id })); if (!mine.length) { setStatus('No saved courses yet. Use New or Copy.'); return; }
      chooser('Open which of your courses?', [['My courses', mine]], it => { const st = Courses.get(it.my); adopt(st, 'Opened ' + (st.name || 'course') + '.'); }); });
  }
  function saveCourse() { if (!stage.name || !stage.name.trim()) stage.name = 'Untitled'; Courses.save(stage); savedJ = Courses.json(stage.id); updateBar(); setStatus('Saved "' + stage.name + '" to My courses.'); }
  function saveAs() {
    const inp = document.createElement('input'); inp.value = (stage.name || 'Course') + ' (2)'; inp.style.cssText = 'width:100%;margin-top:8px;padding:8px;background:#18203a;color:#fff;border:1px solid #33406e;border-radius:6px;box-sizing:border-box';
    popup('Save a copy as...', inp, [['Save copy', () => { const st = clone(stage); st.name = inp.value.trim() || 'Untitled'; delete st.id; adopt(st, 'Saved as "' + st.name + '". You are now editing the copy; the earlier saved version is unchanged.'); }, 'primary'], ['Cancel']]); inp.select();
  }
  function deleteCourse() {
    popup('Delete this course?', '"' + (stage.name || 'Untitled') + '" will be removed from My courses. This cannot be undone. Built-in levels are not affected.', [['Delete it', () => { Courses.remove(stage.id); adopt({ name: 'New course', scenery: 'plain', theme0: 0, pieces: [{ L: 3000 }, { L: 3500, gap: 700, drop: 1200 }, { turn: 60, R: 6500 }, { L: 3500, cp: true }] }, 'Deleted. A fresh course was created.'); }, 'danger'], ['Cancel']]);
  }
  function shareLink() {
    const url = location.origin + location.pathname + '#share-' + Courses.encode(stage), ta = document.createElement('textarea'); ta.value = url; ta.readOnly = true; ta.style.cssText = 'width:100%;height:110px;margin-top:8px;background:#18203a;color:#fff;border:1px solid #33406e;border-radius:6px;box-sizing:border-box;font:11px monospace';
    const w = document.createElement('div'); w.appendChild(ta); const n = document.createElement('div'); n.style.cssText = 'font-size:12px;color:#8fa2d6;margin-top:6px'; n.textContent = 'Anyone who opens this link plays your course as it is right now (' + url.length + ' characters). ' + (url.length > 8000 ? 'It is long: some chat apps may cut it, use Export file instead.' : ''); w.appendChild(n);
    popup('Share link', w, [['Copy link', () => { navigator.clipboard.writeText(url).catch(() => {}); setStatus('Link copied.'); }, 'primary'], ['Close']]); ta.select();
  }
  function exportFile() {
    const nm = (stage.name || 'course').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'course', st = clone(stage); delete st.id;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(st, null, 1)], { type: 'application/json' })); a.download = nm + '.json'; document.body.appendChild(a); a.click(); a.remove();
    setStatus('Exported ' + nm + '.json. Send it to a friend to Import, or put it in the levels/ folder to ship it with the game.');
  }
  function importFile() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then(t => { const st = JSON.parse(t); if (!Courses.valid(st)) throw new Error('no pieces in that file'); guard(() => { delete st.id; if (!st.name) st.name = f.name.replace(/\.json$/i, ''); adopt(st, 'Imported "' + st.name + '" and saved it to My courses.'); }); }).catch(e => alert('Could not import: ' + e.message)); };
    inp.click();
  }

  function renderPanel() {
    const ed = $id('ed') || Object.assign(document.createElement('div'), { id: 'ed' }); if (!ed.parentNode) document.body.appendChild(ed);
    ed.innerHTML = '';
    const cb = document.createElement('div'); cb.id = 'edcbar'; cb.style.cssText = 'background:#101b3d;border:2px solid #3b5bdb;border-radius:10px;padding:8px 8px 6px;margin-bottom:8px';
    const cl = document.createElement('div'); cl.textContent = 'YOUR COURSE'; cl.style.cssText = 'font-size:11px;letter-spacing:.08em;color:#8fa2d6'; cb.appendChild(cl);
    const cn = document.createElement('input'); cn.id = 'edcname'; cn.value = stage.name || ''; cn.placeholder = 'course name'; cn.style.cssText = 'width:100%;font-size:15px;font-weight:600;padding:6px;margin:4px 0'; cn.oninput = () => { stage.name = cn.value; snapshot(); }; cb.appendChild(cn);
    const pill = document.createElement('div'); pill.id = 'edpill'; pill.style.cssText = 'display:inline-block;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:700;margin-bottom:4px'; cb.appendChild(pill);
    const cnote = document.createElement('div'); cnote.style.cssText = 'font-size:11px;color:#8fa2d6;margin:2px 0 6px'; cnote.textContent = 'Built-in levels are read only. To change one, press Copy and edit the copy.'; cb.appendChild(cnote);
    const crow = list => { const r = document.createElement('div'); r.style.cssText = 'display:flex;gap:6px;margin:4px 0'; for (const [t, f, cls] of list) { const b = document.createElement('button'); b.textContent = t; b.onclick = f; b.style.cssText = 'flex:1;padding:9px 4px;font-size:13px;font-weight:600;margin:0;' + (cls === 'go' ? 'background:#1f7a4a;' : cls === 'danger' ? 'background:#5a2330;' : ''); r.appendChild(b); } return r; };
    cb.appendChild(crow([['New', newCourse], ['Copy...', copyFrom], ['Open...', openCourse]])); cb.appendChild(crow([['Save', saveCourse, 'go'], ['Save as...', saveAs], ['Delete', deleteCourse, 'danger']])); cb.appendChild(crow([['Share link', shareLink], ['Export file', exportFile], ['Import file', importFile]]));
    ed.appendChild(cb); updateBar();
    const how = document.createElement('div'); how.style.cssText = 'background:#16204a;border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:12px;line-height:1.5';
    how.innerHTML = '<b>How to build</b><br>1. Press <b>+ Ramp</b> below, then <b>click any ramp</b> in the 3D view to select it; <b>drag the ramp itself</b> to place it.<br>2. Drag the balls on the selected ramp:<br><span style="color:#ffe14a">&#9679;</span> yellow: <b>length</b> (turn angle on a turn) &nbsp;<span style="color:#ff9a3c">&#9679;</span> orange: <b>width</b><br><span style="color:#4be07a">&#9679;</span> green: <b>move</b> along the ground and sideways &nbsp;<span style="color:#4aa8ff">&#9670;</span> blue: <b>raise / lower</b><br><span style="color:#c77dff">&#9670;</span> purple: <b>slope</b> (drag up = uphill, down = steeper down ramp; sets the climb for you) &nbsp;<span style="color:#ff5fa2">&#9679;</span> pink on a turn: <b>sweep radius</b> (drag outward = bigger, wider sweep)<br>3. The coloured line is the bot riding it; red rows are where it falls. Press <b>Play</b> to try it yourself.';
    ed.appendChild(how);
    const top = document.createElement('div'); top.innerHTML = '<h3 style="margin-top:0">Course settings</h3>'; ed.appendChild(top);
    const sr = document.createElement('div'); sr.className = 'row'; sr.innerHTML = '<label>Scenery</label>';
    const sc = document.createElement('select'); for (const o of ['plain', 'descent']) { const op = document.createElement('option'); op.value = op.textContent = o; sc.appendChild(op); } sc.value = stage.scenery || 'plain';
    sc.onchange = () => { stage.scenery = sc.value; change(); }; sr.appendChild(sc);
    const t0 = document.createElement('select'); ['moon', 'atmosphere', 'sky', 'Earth'].forEach((o, i) => { const op = document.createElement('option'); op.value = i; op.textContent = 'start: ' + o; t0.appendChild(op); }); t0.value = stage.theme0 || 0;
    t0.onchange = () => { stage.theme0 = +t0.value; change(); }; sr.appendChild(t0); top.appendChild(sr);
    const fr = document.createElement('div'); fr.className = 'row'; fr.innerHTML = '<label>Music</label>';
    const ms = document.createElement('select'), fillSongs = list => { ms.innerHTML = ''; const ids = ['', ...list.map(x => x.id)]; if (stage.music && !ids.includes(stage.music)) ids.push(stage.music); for (const o of ids) { const op = document.createElement('option'); const f = list.find(x => x.id === o); op.value = o; op.textContent = o ? (f ? f.name + ' (' + o + ')' : o + ' (your song id)') : 'none'; ms.appendChild(op); } ms.value = stage.music || ''; };
    fillSongs(SONGS); Courses.songs().then(l => { if (l.length) { SONGS = l; fillSongs(l); } });
    ms.onchange = () => { if (ms.value) stage.music = ms.value; else delete stage.music; snapshot(); }; fr.appendChild(ms); top.appendChild(fr);
    const fm = document.createElement('div'); fm.className = 'row'; fm.innerHTML = '<label>Your song id</label>'; const mi = document.createElement('input'); mi.placeholder = 'a song you added to music/'; mi.style.flex = '1'; mi.value = SONGS.some(x => x.id === stage.music) ? '' : (stage.music || ''); mi.onchange = () => { const v = mi.value.trim(); if (v) stage.music = v; else delete stage.music; snapshot(); fillSongs(SONGS); }; fm.appendChild(mi); top.appendChild(fm);
    const fr2 = document.createElement('div'); fr2.className = 'row'; fr2.innerHTML = '<label>Downhill pull</label><small>0 to 1, adds speed on ramps</small>';
    const pn = document.createElement('input'); pn.type = 'number'; pn.step = '0.05'; pn.min = '0'; pn.max = '1'; pn.value = stage.pull ?? 0; pn.onchange = () => { stage.pull = +pn.value || 0; if (!stage.pull) delete stage.pull; change(); }; fr2.prepend(pn); top.appendChild(fr2);
    const fr3 = document.createElement('div'); fr3.className = 'row'; fr3.innerHTML = '<label>Air gravity</label><small>0 to 1, extra fall in the air</small>';
    const fl = document.createElement('input'); fl.type = 'number'; fl.step = '0.05'; fl.min = '0'; fl.max = '1'; fl.value = stage.fall ?? 0; fl.onchange = () => { stage.fall = +fl.value || 0; if (!stage.fall) delete stage.fall; change(); }; fr3.prepend(fl); top.appendChild(fr3);
    const bar = document.createElement('div'); const bt = (t, f, cls) => { const b = document.createElement('button'); b.textContent = t; if (cls) b.className = cls; b.onclick = f; bar.appendChild(b); };
    bt('▶ Play', () => play()); bt('▶ Play from selected', () => play(sel)); bt('Full check', () => runBots(true)); bt('Top view (T)', toggleTop); bt('Copy', copyRange); bt('Paste', pasteRange); bt('Undo', () => undo(-1)); bt('Redo', () => undo(1));
    top.appendChild(bar);
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
      if (e.button === 0 && !e.shiftKey) { // press on a ramp: select it, and dragging carries it along the ground (same as the green handle)
        const hit = rayRamp(e);
        if (hit) {
          if (hit.i !== sel) { sel = hit.i; drawSelection(); renderList(); renderInspector(); }
          const B = handlePoints().find(q => q.k === 'move') && startHandle('move', e);
          if (B) { B.hp = hit.p; B.P0 = atY(hit.p[1]); B.body = true; if (B.P0) { hDrag = B; drag = null; cv.style.cursor = 'grabbing'; return; } }
          drag = { x: e.clientX, y: e.clientY, pan: false }; return;
        }
      }
      drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey || e.button === 1 };
    }, true);
    cv.addEventListener('pointermove', e => {
      stop(e);
      if (hDrag) { dragHandle(e); return; }
      if (!drag) { const k = hitHandle(e); let h = null; if (!k && performance.now() - lastHover > 50) { lastHover = performance.now(); h = rayRamp(e); setHover(h ? h.i : -1); }
        cv.style.cursor = k ? 'grab' : (hoverI >= 0 || (h && h.i === sel)) ? 'pointer' : 'default'; setHint(k ? 'drag: ' + HNAME[k] : hoverI >= 0 ? 'click to select this ramp, drag to move it' : ''); return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (drag.pan) { const k = cam.dist * 0.0012, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw); cam.tx += (-dx * cy) * k; cam.tz += (dx * sy) * k; cam.ty += dy * k; }
      else { cam.yaw -= dx * 0.006; cam.pitch = Math.max(-1.45, Math.min(1.45, cam.pitch + dy * 0.006)); }
    }, true);
    const up = e => {
      stop(e);
      if (hDrag) { const nomove = hDrag.body && !hDrag.moved; if (hDrag.k === 'ext' && hDrag.idx != null) { sel = hDrag.idx; selEnd = null; } hDrag = null; cv.style.cursor = 'default'; if (nomove) return; dirty = false; snapshot(); rebuild(); renderList(); renderInspector(); renderStatus(); return; }
      if (drag && moved < 6 && e.button === 0) pickPiece(e);
      drag = null;
    }; cv.addEventListener('pointerup', up, true); cv.addEventListener('pointercancel', up, true);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(300, Math.min(900000, cam.dist * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
    addEventListener('keydown', e => {
      e.stopImmediatePropagation(); if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) return;
      if (e.key === 'ArrowUp') { selEnd = null; sel = Math.max(0, sel - 1); drawSelection(); focusSel(); renderList(); renderInspector(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { selEnd = null; sel = Math.min(stage.pieces.length - 1, sel + 1); drawSelection(); focusSel(); renderList(); renderInspector(); e.preventDefault(); }
      else if (e.key === 'Delete') del(); else if (e.key === 'f' || e.key === 'F') focusSel(); else if (e.key === 'd' || e.key === 'D') dup();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { copyRange(); e.preventDefault(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') { pasteRange(); e.preventDefault(); } else if (e.key === 't' || e.key === 'T') toggleTop();
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
    scene.fog.far = FOG_FAR * 3; tickTheme(dt); updateSky(dt, now); updateRings(dt, now); stars.position.copy(camera.position);
    renderer.setRenderTarget(null); renderer.render(scene, camera);
    const w = innerWidth - 360; if (w > 100) camera.aspect = innerWidth / innerHeight;
  }

  // ---------- start ----------
  function init() {
    for (const id of ['timer', 'best', 'prog', 'toast', 'speed', 'gear', 'restart', 'settings', 'msg', 'flash']) { const e = $id(id); if (e) e.style.display = 'none'; }
    snail.visible = false; trailMesh.visible = false; shadow.visible = false; wind.mesh.visible = false; clouds.mesh.visible = false; intro.on = false;
    css(); stage = load(); if (!stage.id) stage.id = Courses.uid();
    if (Courses.has(stage.id)) savedJ = Courses.json(stage.id); else if (fresh) { Courses.save(stage); savedJ = Courses.json(stage.id); } else { stage.name = stage.name || 'Recovered draft'; Courses.save(stage); savedJ = Courses.json(stage.id); setTimeout(() => setStatus('Your earlier editor work was saved as "' + stage.name + '" in My courses.'), 600); }
    snapshot(); setupInput(); addEventListener('beforeunload', e => { if (unsaved()) { e.preventDefault(); e.returnValue = ''; } });
    const h = document.createElement('div'); h.id = 'edhelp'; h.innerHTML = '<b id="edhint"></b><br>drag: orbit · right-drag / shift-drag: pan · wheel: zoom · ↑↓: select · F: focus · D: duplicate · T: top view · shift-click list: select a range · Ctrl+C / Ctrl+V: copy and paste · cyan diamond: drag out a new ramp or arc · Del: delete · Ctrl+Z: undo · click a ramp: select · drag a ramp: move it'; document.body.appendChild(h);
    refresh(true);
  }
  init();
})();
