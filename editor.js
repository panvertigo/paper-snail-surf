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
  const F_COMMON = [['gap', 'Gap before', -30000, 40000, 1, 'Distance from the previous piece\'s end'], ['drop', 'Drop', -2000, 9000, 50, 'Height below the previous piece (blank = automatic)'], ['lat', 'Sideways', -3000, 3000, 50, 'Shift left / right (negative = left)'], ['hue', 'Colour (0-1)', 0, 1, 0.01, 'Blank = follows previous']];
  const F_RAMP = [['L', 'Length', 500, 40000, 100], ['W', 'Half-width', 250, 1300, 10, 'Carries on to later ramps'], ['C', 'Climb', -12000, 4000, 50, 'Net climb: positive = uphill, negative = a steeper down ramp'], ['s0', 'Start grade', 0, 2.5, 0.02, 'Downhill grade at the start (tan of the angle: 0.08 = 4.6 deg, 0.58 = 30, 0.7 = 35, 0.84 = 40, 1.73 = 60). Blank = normal. Set it with End grade for a ramp that steepens or flattens smoothly (chain pieces so each start equals the previous end).'], ['s1', 'End grade', 0, 2.5, 0.02, 'Downhill grade at the end. Blank = normal 0.08.']];
  const F_TURN = [['turn', 'Turn (deg)', 10, 360, 5], ['R', 'Radius', 1500, 60000, 100, 'Bigger = a wider, faster sweep'], ['W', 'Half-width', 250, 1300, 10], ['s0', 'Start grade', 0, 2.5, 0.02, 'Downhill grade at the start (tan of the angle: 0.08 = 4.6 deg, 0.58 = 30, 0.7 = 35, 0.84 = 40, 1.73 = 60). Blank = normal. Set it with End grade for a ramp that steepens or flattens smoothly (chain pieces so each start equals the previous end).'], ['s1', 'End grade', 0, 2.5, 0.02, 'Downhill grade at the end. Blank = normal 0.08.']];
  const F_LOOP = [['R', 'Radius', 500, 3000, 50, 'Bigger = needs more speed'], ['phi', 'Entry angle', 0, 1.2, 0.05, 'Quarter-pipe you drop onto (rad)'], ['phi2', 'Exit angle', 0, 1, 0.05, 'Launch angle (blank: 0.3, banked: 0)'],
    ['turns', 'Turns', 1, 4, 1, '1 = loop, 2+ = corkscrew / swirl'], ['bank', 'Bank (deg)', 0, 80, 5, '0 = vertical loop, high = flat swirl'], ['W', 'Half-width', 300, 900, 10], ['dir', 'Side (1 / -1)', -1, 1, 2, 'Which way the turns drift'], ['off', 'Lane offset', -600, 600, 10]];
  const F_RING = [['d', 'Ahead', -500, 3000, 50, 'Distance past the previous piece\'s end'], ['y', 'Height', -1500, 3000, 50], ['s', 'Lane', -1500, 1500, 50, 'Blank = where the rider flies'], ['R', 'Radius', 100, 800, 10],
    ['boost', 'Boost (hoop)', 0, 400, 10], ['theme', 'Scene (portal)', 0, 3, 1, '0 moon, 1 atmosphere, 2 sky, 3 Earth'], ['dip', 'Dip (deg)', -30, 60, 5]];

  let stage, sel = 0, multi = new Set([0]), clip = null, hist = [], histI = -1, version = 0, savedJ = null, fresh = false;
  const LEVEL_NAMES = { 1: 'cruise', 2: 'gauntlet', 3: 'descent', 5: 'grand descent' };
  let SONGS = [{ id: 'chicago', name: 'Chicago Meditation' }, { id: 'fleetwood', name: 'Fleetwood Mac' }, { id: 'salt', name: 'Salt for Mushroom Field' }, { id: 'bowl', name: 'Bowl mix' }, { id: 'descent', name: 'Demo (generated)' }];
  let botRes = null, entries = {}, pathLine = null, selObjs = [], busy = false, pendingRun = null;
  const cam = { yaw: 0.6, pitch: 0.55, dist: 60000, tx: 0, ty: 0, tz: 0 };

  // ---------- stage helpers ----------
  const kind = p => p.loop ? (p.loop.bank ? 'swirl' : 'loop') : p.turn ? 'turn' : 'ramp';
  function sane(st) { // drop numbers a draft should never contain (NaN, infinite, absurd sizes) so a bad value cannot hang the course builder
    const lim = { L: [500, 40000], R: [1500, 60000], turn: [10, 360], W: [100, 1500], hr: [0.15, 2.5], C: [-12000, 4000], s0: [0, 3], s1: [0, 3], gap: [0, 40000], lat: [-30000, 30000], drop: [-20000, 40000], rot: [-720, 720] };
    st.pieces = st.pieces.slice(0, 400).filter(p => p && typeof p === 'object');
    for (const p of st.pieces) for (const k in lim) if (p[k] !== undefined) { const v = +p[k]; if (!Number.isFinite(v)) delete p[k]; else p[k] = Math.max(lim[k][0], Math.min(lim[k][1], v)); }
    if (st.start && !['x', 'y', 'z'].every(k => Number.isFinite(+st.start[k] || 0))) delete st.start;
    if (st.spawn && !['x', 'y', 'z'].every(k => Number.isFinite(+st.spawn[k]))) delete st.spawn;
    return st;
  }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.pieces && s.pieces.length) return sane(s); } catch (e) {}
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
    drawSelection(); drawStart(); clearPath(); botRes = null; entries = {};
    if (pendingRun) clearTimeout(pendingRun); pendingRun = setTimeout(() => { pendingRun = null; runBots(false); }, 450);
  }
  function refresh(full) { rebuild(); renderPanel(); if (full) fit(); }
  function change(noSnap) { if (!noSnap) snapshot(); rebuild(); renderList(); renderStatus(); if (testRes && !testRes.stale) { testRes.stale = true; renderTests(); } }

  // ---------- 3D overlays ----------
  function disposeObjs(a) { for (const o of a) { scene.remove(o); if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); } a.length = 0; }
  function lineOf(pts, color) { const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], p[1], p[2]))); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true })); l.renderOrder = 10; l.frustumCulled = false; scene.add(l); return l; }
  function fillOf(r, color, op) { // translucent wash over a ramp's two faces, so the selected / hovered ramp is obvious
    if (r.tube) return null;
    const n = (r.k || r.C || r.m0 !== undefined) ? Math.max(2, Math.ceil(r.L / 150)) : Math.max(1, Math.ceil(r.L / 800)), pos = [];
    const Pt = (u, v, y) => { const q = ridgeAt(r, u), rt = rightOf(r.h0 + r.k * u); return [q[0] + rt[0] * v, r.oy + zOf(r, u) + y, q[1] + rt[2] * v]; };
    for (let j = 0; j < n; j++) for (const sd of (r.half ? [r.half] : [1, -1])) { const ua = r.L * j / n, ub = r.L * (j + 1) / n, A = Pt(ua, 0, r.H), B = Pt(ua, sd * r.W, 0), A2 = Pt(ub, 0, r.H), B2 = Pt(ub, sd * r.W, 0); pos.push(...A, ...B, ...B2, ...A, ...B2, ...A2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    m.renderOrder = 8; m.frustumCulled = false; scene.add(m); return m;
  }
  let hoverObjs = [], hoverI = -2, lastHover = 0;
  function setHover(i) { if (i === hoverI) return; hoverI = i; disposeObjs(hoverObjs); if (i >= 0 && i !== sel && ramps[i]) { const f = fillOf(ramps[i], 0xffffff, 0.28); if (f) hoverObjs.push(f); } }
  function drawSelection() {
    disposeObjs(selObjs); hoverI = -2; disposeObjs(hoverObjs); const r = ramps[sel]; if (!r) return;
    for (const j of ids()) { const rj = ramps[j]; if (!rj) continue; const f = fillOf(rj, 0xffe14a, j === sel ? 0.36 : 0.24); if (f) selObjs.push(f); }
    const pts = [];
    if (r.tube) { const T = r.tube; for (let t = 0; t <= T.sweep; t += 0.08) { const a = T.th0 + t, c = Math.cos(a), s = Math.sin(a), q = T.shift(t); pts.push([T.ox + T.R * (c * T.e1[0] + s * T.e2[0]) + T.ax[0] * q, T.oy + T.R * (c * T.e1[1] + s * T.e2[1]) + T.ax[1] * q, T.oz + T.R * (c * T.e1[2] + s * T.e2[2]) + T.ax[2] * q]); } }
    else { const n = Math.max(4, Math.ceil(r.L / 300)); for (let i = 0; i <= n; i++) { const u = r.L * i / n, c = ridgeAt(r, u); pts.push([c[0], r.oy + zOf(r, u) + r.H + 40, c[1]]); } }
    selObjs.push(lineOf(pts, 0xffe14a));
    const b = r.tube ? [r.tube.ox, r.tube.oy, r.tube.oz] : [r.sx, r.oy + r.H, r.sz];
    E.focusPoint = b; drawHandles();
  }
  // ---------- direct manipulation: click a block, drag it anywhere (hold Alt to lift / lower), drag the white squares to resize it ----------
  // Blocks are stored relative to the block before them, so every move also re-aims the NEXT block: only the blocks you touch change, the rest of the course stays where it is.
  const HNAME = { rot: 'Orange dot: drag around to rotate this block flat on the ground (it spins about its start)', wid: 'Corner: drag sideways to make this block wider or narrower', start: 'Start of this block: drag to change where it begins (Alt: up / down)', end: 'End of this block: drag to bend and tilt it (Alt: up / down)' };
  let hObjs = [], hDrag = null, lastRb = 0, dirty = false;
  const snap = (v, st) => Math.round(v / st) * st, clampv = (v, a, b) => Math.max(a, Math.min(b, v));
  const ids = () => [...multi].filter(i => i < stage.pieces.length).sort((a, b) => a - b);
  function selectOnly(i) { sel = i; multi = new Set([i]); }
  function toggleSel(i) { if (multi.has(i)) { if (multi.size > 1) { multi.delete(i); if (sel === i) { const a = ids(); sel = a[a.length - 1]; } } } else { multi.add(i); sel = i; } }
  function selectRange(a, b) { multi = new Set(); for (let i = Math.min(a, b); i <= Math.max(a, b); i++) multi.add(i); sel = b; }
  const refreshSel = () => { drawSelection(); renderList(); renderInspector(); };
  function handlePoints() { // one dot at each end of the selected block
    const r = ramps[sel], p = stage.pieces[sel]; if (!r || !p || r.tube || multi.size > 1) return [];
    const out = [{ k: 'start', p: [r.sx, r.oy + r.H, r.sz] }, { k: 'end', p: [r.ex, r.ey + r.H, r.ez] }];
    for (const u of [0, r.L]) { const c = ridgeAt(r, u), rt = rightOf(r.h0 + (r.k || 0) * u), y = r.oy + zOf(r, u); for (const sd of (r.half ? [r.half] : [1, -1])) out.push({ k: 'wid', p: [c[0] + rt[0] * r.W * sd, y, c[1] + rt[2] * r.W * sd], c, rt }); }
    if (sel > 0) { const u = Math.min(r.L * 0.8, Math.max(400, Math.min(r.L * 0.3, 1500))), c = ridgeAt(r, u); out.push({ k: 'rot', p: [c[0], r.oy + zOf(r, u) + r.H, c[1]] }); }
    return out;
  }
  function drawHandles() {
    disposeObjs(hObjs);
    for (const h of handlePoints()) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: h.k === 'wid' ? 0x8fd0ff : h.k === 'rot' ? 0xffb347 : 0xffffff, depthTest: false, transparent: true, opacity: 0.95 }));
      m.renderOrder = 12; m.userData = { k: h.k, rec: h, base: h.p }; m.position.set(h.p[0], h.p[1], h.p[2]); scene.add(m); hObjs.push(m);
    }
    placeHandles();
  }
  E.handleScreen = k => { const m = hObjs.find(o => o.userData.k === k); if (!m) return null; const v = m.position.clone().project(camera), rc = renderer.domElement.getBoundingClientRect(); return [(v.x * 0.5 + 0.5) * rc.width + rc.left, (-v.y * 0.5 + 0.5) * rc.height + rc.top]; }; // for tests
  E.select = i => { selectOnly(i); drawSelection(); focusSel(); renderList(); renderInspector(); };
  let startObj = null, startObjs = [];
  function drawStart() {
    disposeObjs(startObjs);
    if (startObj) { scene.remove(startObj); startObj.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); startObj = null; }
    if (!ramps[0]) return; const g = new THREE.Group(), col = 0x2ee6a6;
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 1, 0.07), new THREE.MeshBasicMaterial({ color: col, depthTest: false, transparent: true, opacity: 0.95 })));
    g.children[0].position.y = 0.5;
    const fl = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.03, 1, 0), new THREE.Vector3(0.75, 0.82, 0), new THREE.Vector3(0.03, 0.64, 0)]), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, depthTest: false }));
    g.add(fl); g.traverse(o => { o.renderOrder = 13; }); startObj = g; scene.add(g);
    if (stage.spawn) { const r = ramps[0], sp = stage.spawn, ln = lineOf([[sp.x, sp.y, sp.z], [sp.x, r.oy + r.H, sp.z]], 0x2ee6a6); startObjs.push(ln); }
    placeStart();
  }
  function startPos() { const r = ramps[0], sp = stage.spawn; return sp ? [sp.x, sp.y, sp.z] : [r.sx, r.oy + r.H, r.sz]; }
  function placeStart() { if (!startObj || !ramps[0]) return; const q = startPos(); startObj.position.set(q[0], q[1], q[2]); startObj.scale.setScalar(cam.dist * 0.05); startObj.rotation.y = (stage.spawn && stage.spawn.h !== undefined ? stage.spawn.h : ramps[0].h0) + Math.PI / 2; }
  function placeHandles() { placeStart(); const hs = cam.dist * 0.011; for (const m of hObjs) { m.scale.setScalar(m.userData.k === 'wid' ? hs * 0.75 : m.userData.k === 'rot' ? hs * 0.85 : hs); const b = m.userData.base; m.position.set(b[0], b[1], b[2]); } }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function setRay(e) { const rc = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height * 2 - 1)); camera.aspect = rc.width / rc.height; camera.updateProjectionMatrix(); ray.setFromCamera(ndc, camera); }
  function hitHandle(e) { setRay(e); const hit = ray.intersectObjects(hObjs, false)[0]; return hit ? hit.object.userData.rec : null; }
  const atY = y => { const o = ray.ray.origin, d = ray.ray.direction; if (Math.abs(d.y) < 1e-4) return null; const t = (y - o.y) / d.y; return t > 0 ? [o.x + d.x * t, y, o.z + d.z * t] : null; };
  const atVert = (p0, nx, nz) => { const o = ray.ray.origin, d = ray.ray.direction, den = d.x * nx + d.z * nz; if (Math.abs(den) < 1e-4) return null; const t = ((p0[0] - o.x) * nx + (p0[2] - o.z) * nz) / den; return t > 0 ? [o.x + d.x * t, o.y + d.y * t, o.z + d.z * t] : null; };
  // the two dots on a block. End dot: drag along the ground to lengthen / bend it (the block becomes an arc through the dot, radius and angle worked out for you; it can only bend toward the face
  // you ride), Alt-drag to tilt it (sets the climb). Start dot: changes where the block begins (gap, sideways, height) with its end kept in place.
  function startHandle(h, e) {
    const r = ramps[sel], p = stage.pieces[sel], nxt = stage.pieces[sel + 1], rn = ramps[sel + 1], prev = ramps[sel - 1];
    const D = { k: h.k, c: h.c, rt: h.rt, W0: r.W, p, zig0: !!p.zig, nzig0: !!(nxt && nxt.zig), nextTube: !!(rn && rn.tube), rot0: p.rot || 0, prevEnd: prev ? [prev.ex, prev.ez] : null, Wprev: prev ? prev.W : 0, hp: h.p, oldEnd: [r.ex, r.ey, r.ez], oldStart: [r.sx, r.oy, r.sz], h0: r.h0, h1: r.h1, side: r.side, mode: e.altKey && h.k !== 'wid' ? 'v' : 'h', acc: [0, 0, 0], cur: [0, 0, 0], nx: Math.sin(cam.yaw), nz: Math.cos(cam.yaw), comp: true,
      C0: p.C, L0: p.L, g0: p.gap ?? 480, l0: p.lat || 0, d0: p.drop ?? (prev ? (r.tube ? 20 - 0.42 * prev.H : prev.ey - r.oy) : 0), zero: sel === 0, st0: { ...(stage.start || {}) } };
    if (nxt && rn) { D.next = nxt; D.n0 = { hadW: nxt.W !== undefined, zig: !!nxt.zig, sideBefore: nxt.zig ? -rn.side : rn.side, gap: nxt.gap ?? 480, lat: nxt.lat || 0, rot: nxt.rot || 0, drop: nxt.drop ?? (rn.tube ? 20 - 0.42 * r.H : r.ey - rn.oy) }; }
    setRay(e); D.P0 = D.mode === 'v' ? atVert(h.p, D.nx, D.nz) : atY(h.p[1]); return D.P0 ? D : null;
  }
  function compensate(D) { // keep every later block exactly where it was: re-aim the next block (gap, sideways, height and heading); the ones after it follow
    if (!D.next) return; const i = stage.pieces.indexOf(D.p), r = ramps[i], rn = ramps[i + 1]; if (!r || !rn || r.tube) return;
    if (D.k === 'wid') { // the next block keeps its own width; a zigzag after this block lands 0.75 W across, so re-aim it for the new width
      if (!D.n0.hadW) D.next.W = D.W0;
      if (D.n0.zig) { const l0 = D.n0.lat, l = clampv(snap(l0 - D.n0.sideBefore * 0.75 * (D.p.W - D.W0), 1), -30000, 30000); if (l) D.next.lat = l; else delete D.next.lat; }
      return;
    }
    const rot0 = D.n0.rot || 0, hOld = D.h1 + rot0 * Math.PI / 180, dO = dirOf(hOld), rO = rightOf(hOld);
    const zsOld = D.n0.zig ? D.n0.sideBefore * 0.75 * D.W0 : 0, zsNew = D.next.zig ? r.side * 0.75 * r.W : 0; // a zigzag lands 0.75 W across, toward the face being ridden
    const sx = D.oldEnd[0] + D.n0.gap * dO[0] + (D.n0.lat + zsOld) * rO[0], sz = D.oldEnd[2] + D.n0.gap * dO[2] + (D.n0.lat + zsOld) * rO[2], sy = D.oldEnd[1] - D.n0.drop;
    const rotN = Math.round((hOld - r.h1) * 5729.58) / 100; if (rotN) D.next.rot = rotN; else delete D.next.rot; // the next block's heading is put back to what it was
    const tx = sx - r.ex, tz = sz - r.ez;
    D.next.gap = clampv(snap(tx * dO[0] + tz * dO[2], 1), -30000, 40000); const lat = clampv(snap(tx * rO[0] + tz * rO[2] - zsNew, 1), -30000, 30000); if (lat) D.next.lat = lat; else delete D.next.lat;
    D.next.drop = clampv(snap(r.ey - sy, 1), -30000, 40000);
  }
  // moving blocks: a run of selected blocks translates as one; the block before the run and the block after it are re-aimed so nothing else moves
  function makeRuns() {
    const n = stage.pieces.length, runs = []; let cur = null;
    for (const i of ids()) { if (cur && i === cur.b + 1) cur.b = i; else { cur = { a: i, b: i }; runs.push(cur); } }
    const st = i => { const r = ramps[i], pr = ramps[i - 1], p = stage.pieces[i]; return { p, gap: p.gap ?? 480, lat: p.lat || 0, drop: p.drop ?? (r.tube ? 20 - 0.42 * pr.H : pr.ey - r.oy) }; };
    return runs.map(R => { const o = { a: R.a, b: R.b };
      if (R.a === 0 && ramps[0]) { o.s = { zero: true, st0: { ...(stage.start || {}) } }; o.hs = 0; }
      else if (R.a > 0 && ramps[R.a - 1] && !ramps[R.a - 1].tube && ramps[R.a]) { o.s = st(R.a); o.hs = ramps[R.a - 1].h1; }
      if (R.b + 1 < n && ramps[R.b] && !ramps[R.b].tube && ramps[R.b + 1]) { o.e = st(R.b + 1); o.he = ramps[R.b].h1; }
      return o; });
  }
  function setSt(s, gap, lat, drop) { const p = s.p; p.gap = clampv(snap(gap, 1), -30000, 40000); const l = clampv(snap(lat, 1), -30000, 30000); if (l) p.lat = l; else delete p.lat; p.drop = clampv(snap(drop, 1), -30000, 40000); }
  function applyRuns(runs, d) {
    for (const o of runs) { if (!o.s) continue;
      let dr = dirOf(o.hs), rt = rightOf(o.hs);
      if (o.s.zero) stage.start = { x: snap((o.s.st0.x || 0) + d[0], 10), y: snap((o.s.st0.y || 0) + d[1], 10), z: snap((o.s.st0.z || 0) + d[2], 10) };
      else setSt(o.s, o.s.gap + d[0] * dr[0] + d[2] * dr[2], o.s.lat + d[0] * rt[0] + d[2] * rt[2], o.s.drop - d[1]);
      if (o.e) { dr = dirOf(o.he); rt = rightOf(o.he); setSt(o.e, o.e.gap - (d[0] * dr[0] + d[2] * dr[2]), o.e.lat - (d[0] * rt[0] + d[2] * rt[2]), o.e.drop + d[1]); } }
  }
  // Stickiness: bring a block close to the end of the one before it (or its end close to the start of the next) and it snaps to a seamless join (gap 0, same height, no sideways shift).
  // Joined blocks ride as one continuous ramp (tools/test-join.js). Blocks with a zigzag or a rotation are never snapped, because their faces would not line up.
  function snapDelta(runs, d) {
    for (const o of runs) {
      if (o.s && !o.s.zero && !o.s.p.zig && !o.s.p.rot) {
        const dr = dirOf(o.hs), rt = rightOf(o.hs), g = o.s.gap + d[0] * dr[0] + d[2] * dr[2], l = o.s.lat + d[0] * rt[0] + d[2] * rt[2], dp = o.s.drop - d[1];
        if (g > -250 && g < 200 && Math.abs(l) < 130 && Math.abs(dp) < 110) return { d: [d[0] - g * dr[0] - l * rt[0], d[1] + dp, d[2] - g * dr[2] - l * rt[2]], joined: 'the block before it' };
      }
      if (o.e && !o.e.p.zig && !o.e.p.rot) {
        const dr = dirOf(o.he), rt = rightOf(o.he), g = o.e.gap - (d[0] * dr[0] + d[2] * dr[2]), l = o.e.lat - (d[0] * rt[0] + d[2] * rt[2]), dp = o.e.drop + d[1];
        if (g > -250 && g < 200 && Math.abs(l) < 130 && Math.abs(dp) < 110) return { d: [d[0] + g * dr[0] + l * rt[0], d[1] - dp, d[2] + g * dr[2] + l * rt[2]], joined: 'the block after it' };
      }
    }
    return { d, joined: null };
  }
  function joinToPrev() { // button: snap the selected block's start onto the end of the previous block, pointing the way it points (this clears any rotation); the block after it stays where it was
    const r = ramps[sel], pr = ramps[sel - 1], p = stage.pieces[sel]; if (sel < 1 || !r || !pr || r.tube || pr.tube) { setStatus('Nothing before this block to join to.'); return; }
    if (p.zig) { setStatus('This block has a zigzag (it lands on the other face), so it cannot join end to end. Untick Zigzag first.'); return; }
    const nx = stage.pieces[sel + 1], rn = ramps[sel + 1];
    const D = nx && rn && !rn.tube ? { p, next: nx, oldEnd: [r.ex, r.ey, r.ez], h1: r.h1, W0: r.W, n0: { zig: !!nx.zig, sideBefore: nx.zig ? -rn.side : rn.side, gap: nx.gap ?? 480, lat: nx.lat || 0, rot: nx.rot || 0, drop: nx.drop ?? (r.ey - rn.oy) } } : null;
    p.gap = 0; delete p.lat; p.drop = 0; delete p.rot;
    if (r.W !== pr.W) { if (nx && nx.W === undefined) nx.W = r.W; p.W = pr.W; }
    rebuild(); if (D) { compensate(D); } change(); setStatus('Joined to the block before it: same width, no gap, pointing the same way.');
  }
  function bodyStart(e, hit, wasIn) {
    const D = { body: true, runs: makeRuns(), hit, wasIn, i: hit.i, mode: e.altKey ? 'v' : 'h', acc: [0, 0, 0], cur: [0, 0, 0], nx: Math.sin(cam.yaw), nz: Math.cos(cam.yaw) };
    setRay(e); D.P0 = D.mode === 'v' ? atVert(hit.p, D.nx, D.nz) : atY(hit.p[1]); return D.P0 ? D : null;
  }
  function applyFlip(D, flip) { // drag the end the "wrong" way: swap faces here (zigzag on / off) and swap back on the next block, so everything after keeps its face
    const p = D.p, zigNow = flip ? !D.zig0 : D.zig0, sb0 = D.zig0 ? -D.side : D.side, zs = z => z ? sb0 * 0.75 * D.Wprev : 0;
    if (zigNow) p.zig = true; else delete p.zig;
    const lat = clampv(snap(D.l0 + zs(D.zig0) - zs(zigNow), 1), -30000, 30000); if (lat) p.lat = lat; else delete p.lat;
    if (D.next) { if (flip ? !D.nzig0 : D.nzig0) D.next.zig = true; else delete D.next.zig; }
  }
  function dragHandle(e) {
    const D = hDrag; setRay(e);
    if (D.flag) {
      const mode = e.altKey ? 'v' : 'h', P = mode === 'v' ? atVert(D.hp, D.nx, D.nz) : atY(D.hp[1]); if (!P) return;
      if (mode !== D.mode) { D.acc = [D.acc[0] + D.cur[0], D.acc[1] + D.cur[1], D.acc[2] + D.cur[2]]; D.cur = [0, 0, 0]; D.P0 = P; D.mode = mode; return; }
      D.cur = mode === 'v' ? [0, P[1] - D.P0[1], 0] : [P[0] - D.P0[0], 0, P[2] - D.P0[2]];
      stage.spawn = { x: snap(D.base[0] + D.acc[0] + D.cur[0], 50), y: snap(D.base[1] + D.acc[1] + D.cur[1], 50), z: snap(D.base[2] + D.acc[2] + D.cur[2], 50) }; D.moved = true; dirty = true;
      setStatus('Start flag: the snail starts here and drops onto the course (Alt: up / down)'); return;
    }
    if (D.body) {
      const mode = e.altKey ? 'v' : 'h', P = mode === 'v' ? atVert(D.hit.p, D.nx, D.nz) : atY(D.hit.p[1]); if (!P) return;
      if (mode !== D.mode) { D.acc = [D.acc[0] + D.cur[0], D.acc[1] + D.cur[1], D.acc[2] + D.cur[2]]; D.cur = [0, 0, 0]; D.P0 = P; D.mode = mode; return; }
      D.cur = mode === 'v' ? [0, P[1] - D.P0[1], 0] : [P[0] - D.P0[0], 0, P[2] - D.P0[2]];
      const t = [D.acc[0] + D.cur[0], D.acc[1] + D.cur[1], D.acc[2] + D.cur[2]], sn = snapDelta(D.runs, t); applyRuns(D.runs, sn.d); D.moved = true; dirty = true;
      setStatus(sn.joined ? 'Joined to ' + sn.joined + ': it rides as one continuous ramp. Drag further to pull it apart.' : 'Moving: ' + (mode === 'v' ? 'up / down' : 'along the ground') + ' (hold Alt to lift or lower)'); return;
    }
    if (D.k === 'wid') { const P = atY(D.hp[1]); if (!P) return; D.p.W = clampv(snap(Math.abs((P[0] - D.c[0]) * D.rt[0] + (P[2] - D.c[1]) * D.rt[2]), 10), 250, 1300); setStatus('Half-width ' + D.p.W + ' (the whole block widens evenly)'); D.moved = true; dirty = true; return; }
    const mode = e.altKey ? 'v' : 'h', P = mode === 'v' ? atVert(D.hp, D.nx, D.nz) : atY(D.hp[1]); if (!P) return;
    if (mode !== D.mode) { D.acc = [D.acc[0] + D.cur[0], D.acc[1] + D.cur[1], D.acc[2] + D.cur[2]]; D.cur = [0, 0, 0]; D.P0 = P; D.mode = mode; return; }
    D.cur = mode === 'v' ? [0, P[1] - D.P0[1], 0] : [P[0] - D.P0[0], 0, P[2] - D.P0[2]];
    const d = [D.acc[0] + D.cur[0], D.acc[1] + D.cur[1], D.acc[2] + D.cur[2]], p = D.p, dir0 = dirOf(D.h0), rt0 = rightOf(D.h0);
    if (D.k === 'rot') { // spin about the block's start: its start stays, the heading changes, the next block is re-aimed
      if (!D.prevEnd) return; const a0x = D.P0[0] - D.oldStart[0], a0z = D.P0[2] - D.oldStart[2], P1 = [D.P0[0] + d[0], 0, D.P0[2] + d[2]], a1x = P1[0] - D.oldStart[0], a1z = P1[2] - D.oldStart[2];
      const g0 = Math.atan2(a0x * rt0[0] + a0z * rt0[2], a0x * dir0[0] + a0z * dir0[2]), g1 = Math.atan2(a1x * rt0[0] + a1z * rt0[2], a1x * dir0[0] + a1z * dir0[2]);
      let dh = -(g1 - g0); dh = Math.atan2(Math.sin(dh), Math.cos(dh)); const deg = snap(D.rot0 + dh * 57.2958, 0.5); dh = (deg - D.rot0) * 0.0174533; if (deg) p.rot = deg; else delete p.rot;
      const hN = D.h0 + dh, dN = dirOf(hN), rN = rightOf(hN), tx = D.oldStart[0] - D.prevEnd[0], tz = D.oldStart[2] - D.prevEnd[1], sb = D.zig0 ? -D.side : D.side, zs = D.zig0 ? sb * 0.75 * D.Wprev : 0;
      p.gap = clampv(snap(tx * dN[0] + tz * dN[2], 1), -30000, 40000); const lat = clampv(snap(tx * rN[0] + tz * rN[2] - zs, 1), -30000, 30000); if (lat) p.lat = lat; else delete p.lat;
      setStatus('Rotated ' + deg + ' deg from where the previous block points'); return;
    }
    if (D.k === 'end') {
      const ex = D.oldEnd[0] + d[0] - D.oldStart[0], ez = D.oldEnd[2] + d[2] - D.oldStart[2], A = ex * dir0[0] + ez * dir0[2], Braw = ex * rt0[0] + ez * rt0[2];
      if (A < 300) return;
      const flip = !D.zero && !D.nextTube && !!D.prevEnd && Braw * Math.sign(D.side) < -0.01 * A; applyFlip(D, flip);
      if (!D.guide) { D.guide = lineOf([[D.oldStart[0], D.oldEnd[1] + 60, D.oldStart[2]], [D.oldStart[0] + dir0[0] * 30000, D.oldEnd[1] + 60, D.oldStart[2] + dir0[2] * 30000]], 0xffe14a); selObjs.push(D.guide); } // the straight line out of the block's start: cross it to bend the other way
      const B = Math.max(0, Braw * Math.sign(flip ? -D.side : D.side));
      if (B < 0.05 * A) { delete p.turn; delete p.R; p.L = clampv(snap(A, A > 12000 ? 500 : 100), 500, 40000); }
      else { const th = 2 * Math.atan2(B, A) * 57.2958, R = clampv((A * A + B * B) / (2 * B), 1500, 60000); delete p.L; p.turn = clampv(snap(th, 0.5), 10, 360); p.R = snap(R, R < 10000 ? 10 : 100); }
      const len = p.turn ? p.turn * 0.0174533 * p.R : p.L, c = snap(D.oldEnd[1] + d[1] - D.oldStart[1], 50);
      if (d[1] !== 0) { if (Math.abs(c + SLOPE * len) > 100) p.C = clampv(c, -4000, 4000); else delete p.C; } else if (D.C0 !== undefined) p.C = D.C0; else delete p.C; // only an Alt (vertical) drag changes the slope
      setStatus((flip ? 'Bending the other way (faces swapped). ' : 'Drag across the yellow line to bend the other way. ') + (p.turn ? 'Curve: ' + p.turn + ' deg, radius ' + p.R : 'Straight, length ' + p.L) + (p.C ? ', climb ' + p.C + (p.C < 0 ? ' (steeper down)' : ' (up)') : ''));
    } else {
      const f = d[0] * dir0[0] + d[2] * dir0[2], sd = d[0] * rt0[0] + d[2] * rt0[2];
      if (D.zero) stage.start = { x: snap((D.st0.x || 0) + d[0], 10), y: snap((D.st0.y || 0) + d[1], 10), z: snap((D.st0.z || 0) + d[2], 10) };
      else { p.gap = clampv(snap(D.g0 + f, 1), -30000, 40000); const l = clampv(snap(D.l0 + sd, 1), -30000, 30000); if (l) p.lat = l; else delete p.lat; p.drop = clampv(snap(D.d0 - d[1], 1), -30000, 40000); }
      if (!p.turn && p.L !== undefined) p.L = clampv(snap(D.L0 - f, 100), 500, 40000);
      setStatus('Moving where this block starts');
    }
    dirty = true; D.moved = true; D.comp = true;
  }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _hit = new THREE.Vector3();
  function rayRamp(e) { // click a ramp's surface: ray against the real faces, nearest wins
    setRay(e); let best = null, bd = 1e18;
    ramps.forEach((r, i) => {
      if (r.tube) return;
      const n = (r.k || r.C || r.m0 !== undefined) ? Math.max(2, Math.ceil(r.L / 150)) : Math.max(1, Math.ceil(r.L / 800));
      const Pt = (u, v, y, t) => { const q = ridgeAt(r, u), rt = rightOf(r.h0 + r.k * u); return t.set(q[0] + rt[0] * v, r.oy + zOf(r, u) + y, q[1] + rt[2] * v); };
      for (let j = 0; j < n; j++) for (const sd of (r.half ? [r.half] : [1, -1])) {
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
    if (best >= 0) { if (e.shiftKey) toggleSel(best); else selectOnly(best); drawSelection(); renderList(); renderInspector(); }
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
  // ---------- test runs: 22 simulated riders (1 steady, 1 slow, 20 sloppy) over the whole course ----------
  let testRes = null, testFalls = {};
  function renderTests() {
    const e = $id('edtests'); if (!e) return; const T = testRes; if (!T) { e.innerHTML = '<span style="color:#8fa2d6">Press the button to see how often simulated riders finish.</span>'; return; }
    const pct = Math.round(100 * T.fin / T.n), hard = Object.entries(T.fallsAt).sort((a, b) => b[1] - a[1]).slice(0, 3);
    e.innerHTML = '<b>' + T.fin + ' of ' + T.n + ' finished (' + pct + '%)</b>' + (T.stale ? ' <i style="color:#ffb347">(course changed since)</i>' : '') + '<br>' +
      (T.fin ? 'time: best ' + T.best.toFixed(0) + ' s, average ' + T.avg.toFixed(0) + ' s, slowest ' + T.worst.toFixed(0) + ' s<br>' : '') +
      'falls per finished run: ' + T.fpr.toFixed(1) + ' &nbsp;·&nbsp; top speed ' + Math.round(T.vmax) + ' u/s<br>' +
      (hard.length ? 'hardest: ' + hard.map(([b, n]) => '<a href="#" data-b="' + b + '" style="color:#7be3a8">block ' + (+b + 1) + '</a> (' + n + ' falls)').join(', ') : 'no falls anywhere') +
      '<br><span style="color:#8fa2d6">The steady rider: ' + (T.good.res === 'done' ? T.good.t + ' s, ' + T.good.falls + ' falls' : 'did not finish') + '. The slow rider (reacts 3x slower): ' + (T.slow.res === 'done' ? T.slow.t + ' s, ' + T.slow.falls + ' falls' : 'did not finish') + '.</span>' +
      '<details style="margin-top:4px"><summary style="cursor:pointer;color:#8fa2d6">Is the bot smart?</summary><span style="color:#aab6e0">Not like a person. It is a rule-based rider that knows the whole course, steers to a line along the ridge and holds or lifts a finger on a plan. The steady one reacts every 0.1 s, the slow one every 0.3 s, the 20 sloppy ones lift their finger at random 10 to 30 percent of the time. It does not look for shortcuts or clever lines. So: a high finish rate means the course is fair and forgiving; low means there is a spot a careful player must handle. People can beat it (better lines) or lose to it (nerves), so treat it as a sanity check, not as how hard it feels.</span></details>';
    e.querySelectorAll('a[data-b]').forEach(a => { a.onclick = ev => { ev.preventDefault(); selectOnly(+a.dataset.b); drawSelection(); focusSel(); renderList(); renderInspector(); }; });
  }
  async function runTests() {
    if (busy) { setStatus('Wait a moment: the bots are still checking the last change.'); return; }
    busy = true; const e = $id('edtests'); const say = t => { if (e) e.textContent = t; };
    try {
      await ensureSources(); globalThis.SURF_STAGE = clone(stage); const mod = { exports: {} }; new Function('module', botSrc)(mod); const trial = mod.exports(makeSim);
      const jobs = [{ n: 'good', o: { hold: 10 } }, { n: 'slow', o: { hold: 30 } }]; for (let k = 0; k < 20; k++) jobs.push({ n: 'sloppy', o: { hold: 10 + (k % 3) * 5, lift: 0.1 + (k % 4) * 0.07, seed: k + 3 } });
      const T = { n: jobs.length, fin: 0, times: [], falls: 0, fallsAt: {}, vmax: 0 }; let done = 0;
      for (const j of jobs) {
        say('Running test ' + (++done) + ' of ' + jobs.length + '...'); await tick(); globalThis.__fallLog = [];
        const r = trial(400, { ...j.o, tmax: 400, checkpoints: true }); if (j.n === 'good') T.good = r; if (j.n === 'slow') T.slow = r;
        for (const b of globalThis.__fallLog) T.fallsAt[b] = (T.fallsAt[b] || 0) + 1; T.vmax = Math.max(T.vmax, r.vmax || 0);
        if (r.res === 'done') { T.fin++; T.times.push(r.t); T.falls += r.falls; }
      }
      T.best = Math.min(...T.times, 1e9); T.worst = Math.max(...T.times, 0); T.avg = T.times.length ? T.times.reduce((a, b) => a + b, 0) / T.times.length : 0; T.fpr = T.fin ? T.falls / T.fin : 0; T.sig = JSON.stringify(stage.pieces);
      testRes = T; testFalls = T.fallsAt; renderTests(); renderList();
    } catch (err) { say('Test runs failed: ' + err.message); console.error(err); }
    busy = false;
  }
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
      d.className = 'piece' + (multi.has(i) ? ' sel' : '') + (i === failAt || i === failAt + 1 ? ' bad' : '');
      d.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t"></span><span class="v"></span>';
      d.querySelector('.t').textContent = label(p, i);
      d.querySelector('.v').textContent = (e ? e.speed + ' u/s' : (botRes && i > 0 && !(i in entries) ? 'skipped' : '')) + (testFalls[i] ? '  \u00d7' + testFalls[i] + ' falls' : '');
      d.onclick = ev => { if (ev.shiftKey) selectRange(sel, i); else selectOnly(i); drawSelection(); focusSel(); renderList(); renderInspector(); };
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
    const k = kind(p), ch = () => { change(); }, h = document.createElement('h3');
    h.textContent = multi.size > 1 ? multi.size + ' blocks selected: drag to move them together' : 'Selected block ' + (sel + 1) + ' (' + k + ')'; box.appendChild(h);
    if (multi.size > 1) return;
    if (k === 'ramp') F_RAMP.forEach(s => numField(box, p, s, ch));
    else if (k === 'turn') { F_TURN.forEach(s => numField(box, p, s, ch)); numField(box, p, F_RAMP[2], ch); }
    else F_LOOP.forEach(s => numField(box, p.loop, s, ch));
    if (k !== 'loop' && k !== 'swirl') { // flatten: the face angle (default 51 deg); lower = a flatter, gentler ramp
      const row = document.createElement('div'); row.className = 'row'; const lab = document.createElement('label'); lab.textContent = 'Steepness'; const sl = document.createElement('input'); sl.type = 'range'; sl.min = 8; sl.max = 65; sl.step = 1; sl.style.flex = '1';
      const val = document.createElement('small'), cur = Math.round(Math.atan(p.hr || 1.25) * 57.2958); sl.value = cur; val.textContent = cur + '°'; val.style.flex = '0 0 36px';
      sl.oninput = () => { const dg = +sl.value; if (dg === 51) delete p.hr; else p.hr = Math.round(Math.tan(dg * 0.0174533) * 1000) / 1000; val.textContent = dg + '°'; dirty = true; };
      sl.onchange = () => { snapshot(); rebuild(); renderList(); }; row.append(lab, sl, val); box.appendChild(row);
    }
    if (k !== 'loop' && k !== 'swirl') { checkField(box, p, 'half', 'Single-sided (only the face you ride)', ch); checkField(box, p, 'zig', 'Zigzag', ch); checkField(box, p, 'cp', 'Checkpoint', ch); }
    const d = document.createElement('details'); d.innerHTML = '<summary style="cursor:pointer;color:#8fa2d6;font-size:12px;margin:6px 0">Exact position numbers</summary>';
    F_COMMON.forEach(s => numField(d, p, s, ch)); box.appendChild(d);
  }
  function copyRange() { const a = ids(); clip = clone(a.map(i => stage.pieces[i])); setStatus('Copied ' + clip.length + ' block' + (clip.length > 1 ? 's' : '') + '. Ctrl+V pastes after the selection.'); }
  function pasteRange() { if (!clip) { setStatus('Nothing copied yet (select blocks, Ctrl+C).'); return; } const at = ids().pop() + 1; stage.pieces.splice(at, 0, ...clone(clip)); selectRange(at, at + clip.length - 1); change(); renderInspector(); }
  function dup() { copyRange(); pasteRange(); }
  function del() { const a = ids(); if (stage.pieces.length - a.length < 1) return; for (let k = a.length - 1; k >= 0; k--) stage.pieces.splice(a[k], 1); selectOnly(Math.min(a[0], stage.pieces.length - 1)); change(); renderInspector(); }
  function add(key) {
    const made = PRESETS[key].piece(), list = Array.isArray(made) ? made : [made], at = ids().pop() + 1;
    stage.pieces.splice(at, 0, ...list); selectRange(at, at + list.length - 1); sel = at; change(); focusSel(); renderInspector();
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
  function updateBar() { const pl = $id('edpill'); if (!pl) return; const u = unsaved(); pl.textContent = u ? 'UNSAVED CHANGES: press Save' : (fileHandle ? 'Saved here and to ' + fileHandle.name : 'Saved in My courses'); pl.style.background = u ? '#c2571a' : '#1f7a4a'; }
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
  function adopt(st, note) { fileHandle = null; stage = st; if (!stage.id) stage.id = Courses.uid(); Courses.save(stage); savedJ = Courses.json(stage.id); sel = 0; hist = []; histI = -1; snapshot(); refresh(true); setStatus(note || ''); }
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
  function saveCourse() {
    if (!stage.name || !stage.name.trim()) stage.name = 'Untitled'; Courses.save(stage); savedJ = Courses.json(stage.id); updateBar(); setStatus('Saved "' + stage.name + '" to My courses.');
    if (fileHandle) writeHandle().then(() => setStatus('Saved "' + stage.name + '" to My courses and to ' + fileHandle.name + ' on disk.')).catch(e => setStatus('Saved to My courses, but could not write ' + fileHandle.name + ': ' + e.message));
  }
  // save to / open from a real file on disk (Chrome and Edge). Pick the levels/ folder to ship a course with the game; after the first pick, Save and Ctrl+S write straight to that file.
  let fileHandle = null;
  const JSON_TYPES = [{ description: 'Course (JSON)', accept: { 'application/json': ['.json'] } }];
  async function writeHandle() { const st = clone(stage); delete st.id; const w = await fileHandle.createWritable(); await w.write(JSON.stringify(st, null, 1)); await w.close(); }
  async function saveToDisk(asNew) {
    if (!window.showSaveFilePicker) { exportFile(); return; }
    try {
      if (!fileHandle || asNew === true) { const nm = (stage.name || 'course').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'course'; fileHandle = await showSaveFilePicker({ suggestedName: nm + '.json', types: JSON_TYPES }); }
      saveCourse();
    } catch (e) { if (e.name !== 'AbortError') setStatus('Could not save to disk: ' + e.message); }
  }
  async function openFromDisk() {
    if (!window.showOpenFilePicker) { importFile(); return; }
    try {
      const [h] = await showOpenFilePicker({ types: JSON_TYPES }), st = JSON.parse(await (await h.getFile()).text()); if (!Courses.valid(st)) throw new Error('no pieces in that file');
      guard(() => { delete st.id; adopt(st, 'Opened ' + h.name + '. Save writes your changes back to that file.'); fileHandle = h; updateBar(); });
    } catch (e) { if (e.name !== 'AbortError') setStatus('Could not open that file: ' + e.message); }
  }
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
    cb.appendChild(crow([['New', newCourse], ['Copy...', copyFrom], ['Open...', openCourse]])); cb.appendChild(crow([['Save', saveCourse, 'go'], ['Save as...', saveAs], ['Delete', deleteCourse, 'danger']])); cb.appendChild(crow([['Save to file...', () => saveToDisk(true)], ['Open file...', openFromDisk], ['Share link', shareLink]]));
    ed.appendChild(cb); updateBar();
    const how = document.createElement('div'); how.style.cssText = 'background:#16204a;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:12px;line-height:1.55';
    how.innerHTML = '<b>Click</b> a block to select it, <b>drag</b> to move it (<b>Alt</b>: up / down), <b>shift-click</b> to select several.<br>On the selected block: <b>white</b> dots bend / tilt / re-start it, <b>blue</b> dots set width, <b>orange</b> spins it. Drag the <b>green flag</b> to move the start. Bring two blocks together and they stick into one smooth ramp.';
    ed.appendChild(how);
    const bar = document.createElement('div'); bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px'; const bt = (t, f, cls) => { const b = document.createElement('button'); b.textContent = t; if (cls) b.className = cls; b.onclick = f; b.style.cssText = 'margin:0;padding:7px 9px;font-size:13px;' + (cls === 'go' ? 'background:#1f7a4a;' : cls === 'danger' ? 'background:#5a2330;' : ''); bar.appendChild(b); };
    bt('+ Ramp', () => add('ramp')); bt('+ Turn', () => add('turn')); bt('+ Zigzag', () => add('zig')); bt('Duplicate', dup); bt('Delete', del, 'danger'); bt('Undo', () => undo(-1)); bt('Redo', () => undo(1)); bt('Join to previous', joinToPrev); bt('Top view', toggleTop); bt('Flag back to block 1', () => { delete stage.spawn; change(); });
    bt('▶ Play', () => play(), 'go'); bt('▶ Play from selected', () => play(sel));
    ed.appendChild(bar);
    const det = document.createElement('details'); det.innerHTML = '<summary style="cursor:pointer;color:#8fa2d6;font-size:12px;margin:4px 0">More settings (scenery, music, physics)</summary>'; const top = document.createElement('div'); det.appendChild(top);
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
    const insp = document.createElement('div'); insp.id = 'edinsp'; ed.appendChild(insp);
    const tb = document.createElement('div'); tb.style.cssText = 'margin:8px 0';
    const tbtn = document.createElement('button'); tbtn.textContent = '▶ Test runs (bots)'; tbtn.title = 'Runs 22 simulated riders over the whole course and reports how many finish'; tbtn.style.cssText = 'margin:0 6px 0 0;padding:8px 12px;font-size:13px;font-weight:600;background:#1f4a7a'; tbtn.onclick = () => runTests(); tb.appendChild(tbtn);
    const tres = document.createElement('div'); tres.id = 'edtests'; tres.style.cssText = 'font-size:12px;line-height:1.5;margin-top:6px;color:#cfe0ff'; tb.appendChild(tres); ed.appendChild(tb); renderTests();
    const dl = document.createElement('details'); dl.open = true; dl.innerHTML = '<summary style="cursor:pointer;color:#8fa2d6;font-size:12px;margin:6px 0">All blocks (click to select; speed is where the bot enters it; red = the bot fell here)</summary>';
    const list = document.createElement('div'); list.id = 'edlist'; dl.appendChild(list); ed.appendChild(dl);
    ed.appendChild(det);
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
      const hk = e.button === 0 && !e.shiftKey ? hitHandle(e) : null, D = hk ? startHandle(hk, e) : null;
      if (D) { hDrag = D; drag = null; cv.style.cursor = 'grabbing'; return; }
      if (e.button === 0 && startObj) { setRay(e); if (ray.intersectObject(startObj, true).length) { const q = startPos(), D = { flag: true, hp: q, base: q, mode: e.altKey ? 'v' : 'h', acc: [0, 0, 0], cur: [0, 0, 0], nx: Math.sin(cam.yaw), nz: Math.cos(cam.yaw) }; D.P0 = D.mode === 'v' ? atVert(q, D.nx, D.nz) : atY(q[1]); if (D.P0) { hDrag = D; drag = null; cv.style.cursor = 'grabbing'; return; } } }
      if (e.button === 0) { // press on a block: select it (shift = add / remove from the selection); dragging carries the selection along
        const hit = rayRamp(e);
        if (hit) {
          if (e.shiftKey) { toggleSel(hit.i); refreshSel(); drag = { x: e.clientX, y: e.clientY, pan: false, none: true }; return; }
          const wasIn = multi.has(hit.i); if (!wasIn) { selectOnly(hit.i); refreshSel(); }
          const B = bodyStart(e, hit, wasIn); if (B) { hDrag = B; drag = null; cv.style.cursor = 'grabbing'; return; }
          drag = { x: e.clientX, y: e.clientY, pan: false, none: true }; return;
        }
      }
      drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey || e.button === 1 };
    }, true);
    cv.addEventListener('pointermove', e => {
      stop(e);
      if (hDrag) { dragHandle(e); return; }
      if (!drag) { const hr = hitHandle(e), k = hr && hr.k; let h = null; if (!k && performance.now() - lastHover > 50) { lastHover = performance.now(); h = rayRamp(e); setHover(h ? h.i : -1); }
        cv.style.cursor = k ? 'grab' : (hoverI >= 0 || (h && h.i === sel)) ? 'pointer' : 'default'; setHint(k ? 'drag: ' + HNAME[k] : hoverI >= 0 ? 'click to select this ramp, drag to move it' : ''); return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (drag.pan) { const k = cam.dist * 0.0012, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw); cam.tx += (-dx * cy) * k; cam.tz += (dx * sy) * k; cam.ty += dy * k; }
      else { cam.yaw -= dx * 0.006; cam.pitch = Math.max(-1.45, Math.min(1.45, cam.pitch + dy * 0.006)); }
    }, true);
    const up = e => {
      stop(e);
      if (hDrag) {
        const D = hDrag; hDrag = null; cv.style.cursor = 'default'; if (D.guide) { scene.remove(D.guide); D.guide.geometry.dispose(); D.guide.material.dispose(); }
        if (D.flag && !D.moved) return;
        if (D.body && !D.moved) { if (D.wasIn && multi.size > 1) { selectOnly(D.i); refreshSel(); } return; }
        if (D.comp) { rebuild(); compensate(D); }
        dirty = false; snapshot(); rebuild(); renderList(); renderInspector(); renderStatus(); return;
      }
      if (drag && !drag.none && moved < 6 && e.button === 0) pickPiece(e);
      drag = null;
    }; cv.addEventListener('pointerup', up, true); cv.addEventListener('pointercancel', up, true);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(300, Math.min(900000, cam.dist * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
    addEventListener('keydown', e => {
      e.stopImmediatePropagation(); if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) return;
      if (e.key === 'ArrowUp') { selectOnly(Math.max(0, sel - 1)); drawSelection(); focusSel(); renderList(); renderInspector(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { selectOnly(Math.min(stage.pieces.length - 1, sel + 1)); drawSelection(); focusSel(); renderList(); renderInspector(); e.preventDefault(); }
      else if (e.key === 'Delete') del(); else if (e.key === 'f' || e.key === 'F') focusSel(); else if (e.key === 'd' || e.key === 'D') dup();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (fileHandle) saveCourse(); else saveToDisk(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { copyRange(); e.preventDefault(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') { pasteRange(); e.preventDefault(); } else if (e.key === 't' || e.key === 'T') toggleTop();
      else if (e.key === 'PageUp' || e.key === 'PageDown') { const dy = (e.key === 'PageUp' ? 1 : -1) * (e.shiftKey ? 500 : 100), runs = makeRuns(); applyRuns(runs, [0, dy, 0]); change(); e.preventDefault(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { undo(e.shiftKey ? 1 : -1); e.preventDefault(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { undo(1); e.preventDefault(); }
    }, true);
    addEventListener('keyup', e => e.stopImmediatePropagation(), true);
  }
  function frame(dt, now) {
    const cp = Math.cos(cam.pitch);
    camera.position.set(cam.tx + Math.sin(cam.yaw) * cp * cam.dist, cam.ty + Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * cp * cam.dist);
    if (dirty && now - lastRb > 90) { dirty = false; lastRb = now; rebuild(); if (hDrag && hDrag.comp) { compensate(hDrag); rebuild(); } renderList(); }
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
    const h = document.createElement('div'); h.id = 'edhelp'; h.innerHTML = '<b id="edhint"></b><br>click: select · drag: move · Alt-drag: up / down · shift-click: select several · big white dots on the selected block: bend (either way) / tilt / re-start it · orange dot: rotate · small blue corner dots: width · green flag: where the run starts · empty-space drag: orbit · right-drag: pan · wheel: zoom · T: top view · Ctrl+Z: undo · Del: delete · Ctrl+C / V: copy / paste'; document.body.appendChild(h);
    refresh(true);
  }
  // If startup fails (for example a saved draft the editor cannot read), say so on screen and offer a way out instead of freezing
  function fatal(err) {
    console.error(err); const m = document.createElement('div'); m.style.cssText = 'position:fixed;inset:0;z-index:99;background:#0e1424f2;color:#dfe6ff;font:14px/1.5 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:20px';
    const box = document.createElement('div'); box.style.cssText = 'max-width:640px'; const h = document.createElement('b'); h.textContent = 'The editor hit an error while starting.'; box.appendChild(h);
    const pre = document.createElement('pre'); pre.style.cssText = 'white-space:pre-wrap;background:#18203a;padding:10px;border-radius:6px;font-size:12px;max-height:40vh;overflow:auto'; pre.textContent = String(err && err.stack || err).split('\n').slice(0, 8).join('\n'); box.appendChild(pre);
    const note = document.createElement('p'); note.textContent = 'Your saved courses are kept. "Discard the unsaved draft" removes only the editor\'s autosave of the last course you were editing, then reloads.'; box.appendChild(note);
    const b1 = document.createElement('button'); b1.textContent = 'Discard the unsaved draft and reload'; b1.style.cssText = 'padding:9px 14px;margin-right:8px;border:0;border-radius:6px;background:#1f7a4a;color:#fff;font-size:14px;cursor:pointer'; b1.onclick = () => { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); };
    const b2 = document.createElement('button'); b2.textContent = 'Copy error'; b2.style.cssText = 'padding:9px 14px;border:0;border-radius:6px;background:#27325a;color:#fff;font-size:14px;cursor:pointer'; b2.onclick = () => navigator.clipboard.writeText(pre.textContent).catch(() => {});
    box.append(b1, b2); m.appendChild(box); document.body.appendChild(m);
  }
  try { init(); } catch (err) { fatal(err); }
  addEventListener('error', ev => { if (!document.getElementById('ed')) fatal(ev.error || ev.message); });
})();
