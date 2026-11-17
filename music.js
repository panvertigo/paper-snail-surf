// Adaptive music + sound effects. Classic script: globals `Music` and `Sfx`. See music/README.md for how to add your own songs.
// Music: a song is a set of SECTIONS (each a whole number of bars, loops seamlessly) plus TRIGGERS (checkpoint n / portal theme -> section).
// A trigger switches section on the next bar line (or beat / phrase / loop end), sample-accurate (Web Audio clock, lookahead scheduler).
// Optional LAYERS per section (same length) fade in with speed. Sfx: tiny synthesised sounds, quantised to the beat while music plays.
(function () {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  let ctx = null, master = null, sfxBus = null, cfg = null, bufs = {}, ready = false, loading = null;
  let cur = null, pending = null, wanted = null, groups = [], timer = null, speed = 0, events = [], deferredAt = null;
  let musicVol = 0.7, sfxVol = 0.8;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function ensureCtx() {
    if (!AC) return null;
    if (!ctx) { ctx = new AC(); master = ctx.createGain(); master.gain.value = musicVol; master.connect(ctx.destination); sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function unlock() { if (!ensureCtx()) return; if (!timer) timer = setInterval(tick, 50); }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, unlock, { capture: true, passive: true }));

  // ---------- loading ----------
  async function decode(url) {
    const data = await (await fetch(url)).arrayBuffer();
    return await new Promise((res, rej) => { const p = ctx.decodeAudioData(data, res, rej); if (p && p.then) p.then(res, rej); });
  }
  function slice(buf, startSec, len) { // exact loop body (len samples from startSec) + whatever tail follows
    const off = Math.round(startSec * buf.sampleRate), ch = buf.numberOfChannels;
    const body = ctx.createBuffer(ch, len, buf.sampleRate); let tail = null;
    const extra = Math.max(0, buf.length - off - len);
    if (extra > 256) tail = ctx.createBuffer(ch, Math.min(extra, len), buf.sampleRate);
    for (let c = 0; c < ch; c++) {
      const d = buf.getChannelData(c), b = body.getChannelData(c);
      for (let i = 0; i < len; i++) b[i] = d[off + i] || 0;
      if (tail) { const t = tail.getChannelData(c); for (let i = 0; i < tail.length; i++) t[i] = d[off + len + i] || 0; }
    }
    return { body, tail };
  }
  async function prepare(c) {
    const beat = 60 / c.bpm, bar = beat * (c.beatsPerBar || 4); c.beat = beat; c.bar = bar;
    if (c.synth === 'demo') { const d = globalThis.MusicDemo(ctx, c); bufs = d; }
    else {
      for (const [id, s] of Object.entries(c.sections)) {
        const files = [s.file, ...((s.layers || []).map(l => l.file))], layers = [], tails = [];
        for (const f of files) {
          const b = await decode((c.base || '') + f), sr = b.sampleRate, len = Math.round(s.bars * bar * sr), r = slice(b, s.startOffset ?? c.startOffset ?? 0, len);
          layers.push(r.body); tails.push(r.tail);
        }
        bufs[id] = { layers, tails };
      }
    }
    for (const [id, s] of Object.entries(c.sections)) s.loopLen = s.bars * bar;
    ready = true;
  }
  function load(name) {
    if (!AC) return Promise.resolve(false);
    if (loading) return loading;
    loading = (async () => {
      let fb = null;
      try {
        const r = await fetch('music/' + name + '.json'); if (!r.ok) return false;
        cfg = await r.json(); cfg.base = cfg.base ?? 'music/'; fb = cfg.fallback; ensureCtx(); bufs = {};
        await prepare(cfg); if (deferredAt !== null) { const p = deferredAt; deferredAt = null; Music.at(p); }
        return true;
      } catch (e) { console.warn('music: could not load', name, e); if (fb) { loading = null; cfg = null; return load(fb); } return false; } // fallback: a manifest whose audio is missing (e.g. songs kept out of the public repo) hands over to another one
    })();
    return loading;
  }

  // ---------- scheduler ----------
  function layerTarget(sec, i) { if (i === 0) return 1; const l = sec.layers && sec.layers[i - 1]; if (!l) return 0; return clamp((speed - (l.from ?? 0)) / Math.max(1, (l.to ?? 1) - (l.from ?? 0)), 0, 1); }
  function scheduleIter(id, t) {
    const sec = cfg.sections[id], B = bufs[id], g = { id, start: t, end: t + sec.loopLen, srcs: [], gains: [], sec };
    B.layers.forEach((buf, i) => {
      const src = ctx.createBufferSource(); src.buffer = buf; const gn = ctx.createGain(); gn.gain.value = layerTarget(sec, i);
      src.connect(gn); gn.connect(master); src.start(t); g.srcs.push(src); g.gains.push(gn);
      if (B.tails && B.tails[i]) { const ts = ctx.createBufferSource(); ts.buffer = B.tails[i]; ts.connect(gn); ts.start(t + sec.loopLen); g.srcs.push(ts); }
    });
    groups.push(g);
  }
  function startSection(id, t) { const s = cfg.sections[id]; cur = { id, origin: t, nextStart: t, loopLen: s.loopLen, once: !!s.once, next: s.next || null, iters: 0 }; }
  function boundary(q, tmin) {
    const o = cur.origin, unit = q === 'beat' ? cfg.beat : q === 'phrase' ? 4 * cfg.bar : q === 'section' ? cur.loopLen : cfg.bar;
    return o + Math.max(0, Math.ceil((tmin - o) / unit - 1e-9)) * unit;
  }
  function cancel(g) { for (const s of g.srcs) { try { s.stop(0); } catch (e) {} } for (const n of g.gains) { try { n.disconnect(); } catch (e) {} } g.dead = true; }
  function fadeStop(g, tb) {
    for (const n of g.gains) { const p = n.gain; p.cancelScheduledValues(Math.max(0, tb - 0.06)); p.setValueAtTime(p.value, Math.max(ctx.currentTime, tb - 0.06)); p.linearRampToValueAtTime(0, tb); }
    for (const s of g.srcs) { try { s.stop(tb + 0.03); } catch (e) {} }
  }
  function commit(tb) {
    for (const g of groups) { if (g.dead) continue; if (g.start >= tb - 1e-6) cancel(g); else if (g.end > tb - 1e-6) fadeStop(g, tb); }
    startSection(pending.id, tb); pending = null;
  }
  function tick() {
    if (!ctx || !cfg || !ready) return;
    const now = ctx.currentTime; groups = groups.filter(g => !g.dead && g.end + 6 > now);
    if (!cur) { if (wanted && cfg.sections[wanted]) startSection(wanted, now + 0.1); else return; }
    if (pending) { const tb = boundary(pending.quant, now + 0.12); if (tb < now + 0.5) commit(tb); }
    if (cur && cur.once && cur.iters >= 1 && cur.next && cfg.sections[cur.next] && cur.nextStart < now + 0.5) startSection(cur.next, cur.nextStart); // an intro hands over to its loop with no gap
    while (cur && cur.nextStart < now + 0.5 && !(cur.once && cur.iters >= 1)) { scheduleIter(cur.id, cur.nextStart); cur.nextStart += cur.loopLen; cur.iters++; } // once: play the section a single time (an outro), then silence
    for (const g of groups) if (!g.dead && g.start < now + 0.5 && g.end > now) g.gains.forEach((n, i) => n.gain.setTargetAtTime(layerTarget(g.sec, i), now, 0.35)); // speed layers
  }

  // journey: the song's sections in order. Checkpoint n of C picks entry round(n * (L - 1) / C), so the last checkpoint always reaches the last entry and a longer level just stretches the song.
  function journeySection(n) { const C = Math.max(1, events.filter(e => e.ev === 'checkpoint').length), L = cfg.journey.length; return cfg.journey[Math.min(L - 1, Math.round(n * (L - 1) / C))]; }

  // ---------- public music API ----------
  const Music = globalThis.Music = {
    load, unlock,
    setEvents(list) { events = list; },
    goto(id, o = {}) {
      wanted = id; if (!cfg || !ready) return; if (!cfg.sections[id]) return;
      if (!cur) return; // tick() starts it
      if (cur.id === id && !pending && !o.restart) return;
      if (cur.id === id && pending && pending.id !== id) { pending = null; return; }
      pending = { id, quant: o.quantize || cfg.quantize || 'bar' };
    },
    trigger(ev, arg) {
      if (!cfg) return;
      if (ev === 'checkpoint' && cfg.journey) { Music.goto(journeySection(arg), { quantize: cfg.transition || 'phrase' }); return; } // song order spread over however many checkpoints the level has const t = (cfg.triggers || []).find(x => x.on === ev && (ev === 'checkpoint' ? x.n === arg : ev === 'portal' ? x.theme === arg : true));
      if (t) Music.goto(t.section, { quantize: t.quantize });
    },
    at(piece, o) { // the section in force when you are at piece i (used on start and after a respawn)
      if (!cfg || !ready) { deferredAt = piece; return; }
      if (cfg.journey) { let n = 0; for (const e of events) if (e.ev === 'checkpoint' && e.at <= piece) n++; if (n > 0) { Music.goto(journeySection(n), o || { quantize: 'beat' }); return; } }
      const match = e => (cfg.triggers || []).find(x => x.on === e.ev && (e.ev === 'checkpoint' ? x.n === e.n : x.theme === e.theme));
      let ev = null; for (const e of events) if (e.at <= piece && match(e)) ev = e; // only events this song reacts to (a manifest may ignore portals)
      const t = ev ? match(ev) : (cfg.triggers || []).find(x => x.on === 'start');
      if (t) Music.goto((t.on === 'start' && o && o.respawn && t.respawn) || t.section, o || { quantize: 'beat' }); // respawn: don't replay the intro after a splat
    },
    setSpeed(v) { speed = v; },
    setVolume(v) { musicVol = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
    setSfxVolume(v) { sfxVol = v; if (sfxBus) sfxBus.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
    stop(fade = 0.6) { wanted = null; pending = null; if (!ctx) return; const t = ctx.currentTime + fade; for (const g of groups) fadeStop(g, t); cur = null; },
    get debug() { return ctx && cur ? { now: ctx.currentTime, origin: cur.origin, id: cur.id, bar: cfg.bar, pending: pending && pending.id, groups: groups.length } : null; },
    get playing() { return !!cur; }, get section() { return cur && cur.id; }, get ready() { return ready; },
    nextBeat(res = 0.5) { if (!cur || !ctx) return 0; const u = cfg.beat * res, now = ctx.currentTime + 0.01; return cur.origin + Math.ceil((now - cur.origin) / u) * u; },
  };

  // ---------- sound effects (synthesised) ----------
  const noiseBuf = () => { if (noiseBuf.b) return noiseBuf.b; const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return noiseBuf.b = b; };
  function at(t) { return t || ctx.currentTime; }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(f0, f1, t, dur, peak, type = 'sine') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur); env(g, t, 0.005, peak, dur); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05); }
  function noise(t, dur, peak, f0, f1, q = 0.7) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf(); f.type = 'lowpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); env(g, t, 0.004, peak, dur); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur + 0.05); }
  const ok = () => ctx && ctx.state === 'running' && sfxVol > 0;
  const q = res => { const t = Music.nextBeat(res); return t ? Math.max(t, ctx.currentTime) : ctx.currentTime; };
  globalThis.Sfx = {
    landing(s) { if (!ok()) return; const t = at(), k = clamp(s, 0.1, 1); tone(120, 48, t, 0.16, 0.55 * k); noise(t, 0.12, 0.25 * k, 900, 120); },
    launch(v) { if (!ok()) return; const t = at(), k = clamp(v / 3000, 0.15, 1); noise(t, 0.28, 0.1 * k, 300, 2600, 1.2); },
    hoop(c) { if (!ok()) return; const t = q(0.25), f = 660 + clamp(c, 0, 1) * 440; tone(f, f, t, 0.35, 0.22, 'triangle'); tone(f * 1.5, f * 1.5, t + 0.04, 0.3, 0.14, 'sine'); },
    portal() { if (!ok()) return; const t = at(); tone(180, 1800, t, 0.6, 0.18, 'sine'); tone(270, 2700, t + 0.05, 0.6, 0.1, 'triangle'); noise(t, 0.7, 0.12, 400, 5000, 1.5); },
    checkpoint() { if (!ok()) return; const t = q(0.5); [523, 659, 784].forEach((f, i) => tone(f, f, t + i * 0.11, 0.4, 0.2, 'triangle')); },
    splat() { if (!ok()) return; const t = at(); noise(t, 0.3, 0.4, 1200, 90); tone(150, 55, t, 0.25, 0.4); },
    finish() { if (!ok()) return; const t = q(0.5); [523, 659, 784, 1047].forEach((f, i) => tone(f, f, t + i * 0.12, 0.7, 0.22, 'triangle')); },
  };
})();

// ---------- demo song (no files needed): 4 sections x 8 bars at 120 BPM, 3 speed layers each ----------
globalThis.MusicDemo = function (ctx, cfg) {
  const SR = 22050, beat = 60 / cfg.bpm, bar = beat * 4, bars = 8, len = Math.round(bars * bar * SR);
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const prog = { moon: [57, 53, 48, 55], atmos: [57, 53, 48, 55], sky: [48, 55, 57, 53], earth: [48, 55, 57, 53] }; // chord roots (midi), 2 bars each
  const out = {};
  const mk = () => { const b = ctx.createBuffer(2, len, SR); return { b, L: b.getChannelData(0), R: b.getChannelData(1) }; };
  const add = (o, t, v, pan = 0) => { const i = Math.round(t * SR); if (i < 0 || i >= len) return; o.L[i] += v * (1 - pan * 0.4); o.R[i] += v * (1 + pan * 0.4); };
  function voice(o, t0, dur, f, amp, shape, atk, rel, pan) { // one note, envelope fully inside [t0, t0+dur]
    const n = Math.min(len - Math.round(t0 * SR), Math.round(dur * SR)); const i0 = Math.round(t0 * SR); let ph = 0;
    for (let k = 0; k < n; k++) { const t = k / SR, e = Math.min(1, t / atk) * Math.min(1, (dur - t) / rel); ph += f / SR; const x = ph % 1;
      const s = shape === 'tri' ? 4 * Math.abs(x - 0.5) - 1 : shape === 'saw' ? 2 * x - 1 : Math.sin(6.2832 * x);
      const v = s * e * amp; o.L[i0 + k] += v * (1 - pan * 0.4); o.R[i0 + k] += v * (1 + pan * 0.4); }
  }
  for (const id of Object.keys(cfg.sections)) {
    const base = mk(), drive = mk(), lead = mk(), roots = prog[id] || prog.moon, bright = id === 'sky' || id === 'earth', busy = id !== 'moon';
    roots.forEach((r, ci) => { const t0 = ci * 2 * bar; // pad: minor/major triad over 2 bars
      const third = (id === 'earth' || id === 'sky') && (ci === 0 || ci === 1) ? 4 : (ci === 2 || (ci === 3 && !bright)) ? 4 : 3;
      [0, third, 7, 12].forEach((iv, k) => voice(base, t0, 2 * bar, hz(r + 12 + iv), 0.05, 'tri', 0.5, 0.8, (k - 1.5) * 0.3)); });
    for (let b = 0; b < bars * 4; b++) { const t = b * beat, root = roots[Math.floor(b / 8)];
      if (!busy ? b % 2 === 0 : true) { for (let k = 0, n = Math.round(0.22 * SR); k < n; k++) { const tt = k / SR, f = 48 + 90 * Math.exp(-tt * 28); add(base, t + tt, Math.sin(6.2832 * f * tt) * Math.exp(-tt * 14) * 0.5); } }
      if (busy) voice(base, t + beat / 2, beat * 0.45, hz(root - 12), 0.14, 'saw', 0.01, 0.2, 0); // off-beat bass
      for (const off of [0, 0.5]) { const th = t + off * beat; for (let k = 0, n = Math.round(0.05 * SR); k < n; k++) { const tt = k / SR; add(drive, th + tt, (Math.random() * 2 - 1) * Math.exp(-tt * 70) * 0.11, off ? 0.3 : -0.3); } }
      if (b % 2 === 1) for (let k = 0, n = Math.round(0.12 * SR); k < n; k++) { const tt = k / SR; add(drive, t + tt, (Math.random() * 2 - 1) * Math.exp(-tt * 25) * 0.16); } // clap
      for (let s = 0; s < 4; s++) { const iv = [0, 7, 12, 16, 12, 7, 4, 7][(b * 4 + s) % 8] - (bright ? 0 : 0); voice(lead, t + s * beat / 4, beat * 0.22, hz(root + 24 + iv), 0.07, 'saw', 0.004, 0.12, (s % 2 ? 0.4 : -0.4)); }
    }
    out[id] = { layers: [base.b, drive.b, lead.b], tails: [null, null, null] };
  }
  return out;
};
