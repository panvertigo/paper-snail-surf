// Adaptive music + sound effects. Classic script: globals `Music` and `Sfx`. See music/README.md for how to add your own songs.
// Music: a song is a set of SECTIONS (each a whole number of bars, loops seamlessly) plus TRIGGERS (checkpoint n / portal theme -> section).
// A trigger switches section on the next bar line (or beat / phrase / loop end), sample-accurate (Web Audio clock, lookahead scheduler).
// Optional LAYERS per section (same length) fade in with speed. Sfx: tiny synthesised sounds, quantised to the beat while music plays.
(function () {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  let ctx = null, master = null, sfxBus = null, cfg = null, bufs = {}, ready = false, loading = null;
  let cur = null, pending = null, wanted = null, groups = [], timer = null, speed = 0, events = [], deferredAt = null, progress = 0, ending = false;
  let musicVol = 0.7, sfxVol = 0.8;
  const MUS_MAX = 0.4, musGain = v => MUS_MAX * Math.pow(Math.max(0, Math.min(1, v)), 1.5); // the slider 0..1 maps to a gain that tops out around -8 dB and rises gently: 100 percent used to be far too loud
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function ensureCtx() {
    if (!AC) return null;
    if (!ctx) { ctx = new AC(); master = ctx.createGain(); master.gain.value = musGain(musicVol); master.connect(ctx.destination); sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(ctx.destination); }
    if (ctx.state !== 'running') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } // 'suspended' at first; iOS can also report 'interrupted'
    return ctx;
  }
  // iPhone Safari needs more than a first touch: audio only unlocks on touchend / click (not touchstart), the ring/silent switch mutes Web Audio unless the page plays
  // media-session audio, and the context can fall back asleep. So: keep trying on every gesture until the context really runs, play a silent buffer inside the gesture,
  // switch the audio session to 'playback', and loop a silent <audio> element (which makes iOS treat the page as media, so the silent switch no longer mutes it).
  let silentEl = null, unlocked = false, lastErr = '';
  function unlock() {
    if (!ensureCtx()) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
    if (!silentEl) { try { silentEl = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='); silentEl.loop = true; silentEl.volume = 0.01; silentEl.setAttribute('playsinline', ''); } catch (e) {} }
    if (silentEl) { const p = silentEl.play(); if (p && p.catch) p.catch(() => {}); }
    if (!timer) timer = setInterval(tick, 50);
    if (ctx.state === 'running') unlocked = true;
  }
  ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown'].forEach(ev => addEventListener(ev, () => { if (!unlocked || (ctx && ctx.state !== 'running')) unlock(); }, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state !== 'running') unlocked = false; });

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
          const b = await decode((c.base || '') + f + '?v=' + (c.ver || 73)), sr = b.sampleRate, len = Math.round(s.bars * bar * sr), r = slice(b, s.startOffset ?? c.startOffset ?? 0, len);
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
        const r = await fetch('music/' + name + '.json?v=' + (name === 'windmill' ? 74 : 73)); if (!r.ok) return false;
        cfg = await r.json(); cfg.base = cfg.base ?? 'music/'; fb = cfg.fallback; ensureCtx(); bufs = {};
        await prepare(cfg); if (deferredAt !== null) { const p = deferredAt; deferredAt = null; Music.at(p); }
        return true;
      } catch (e) { lastErr = String(e && e.message || e); console.warn('music: could not load', name, e); if (fb) { loading = null; cfg = null; return load(fb); } return false; } // fallback: a manifest whose audio is missing (e.g. songs kept out of the public repo) hands over to another one
    })();
    return loading;
  }

  // ---------- scheduler ----------
  function layerTarget(sec, i) { if (i === 0) return 1; const l = sec.layers && sec.layers[i - 1]; if (!l) return 0; return clamp((speed - (l.from ?? 0)) / Math.max(1, (l.to ?? 1) - (l.from ?? 0)), 0, 1); }
  function scheduleIter(id, t) {
    const sec = cfg.sections[id], B = bufs[id], g = { id, start: t, end: t + sec.loopLen, srcs: [], gains: [], sec };
    B.layers.forEach((buf, i) => {
      const src = ctx.createBufferSource(); src.buffer = buf; const gn = ctx.createGain(); gn.gain.value = layerTarget(sec, i);
      if (sec.fadeIn && i === 0) { const tg = gn.gain.value; gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(tg, t + sec.fadeIn); g.fadeEnd = t + sec.fadeIn; } // fadeIn (seconds): the section starts silent and reaches full volume by then
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
  function fadeStop(g, tb, xf) { // xf: crossfade seconds; the old section keeps playing under the new one's first beat and fades out across it
    const t0 = xf ? tb : tb - 0.06, t1 = xf ? tb + xf : tb;
    for (const n of g.gains) { const p = n.gain; p.cancelScheduledValues(Math.max(0, t0)); p.setValueAtTime(p.value, Math.max(ctx.currentTime, t0)); p.linearRampToValueAtTime(0, t1); }
    for (const s of g.srcs) { try { s.stop(t1 + 0.03); } catch (e) {} }
  }
  function commit(tb) {
    for (const g of groups) { if (g.dead) continue; if (g.start >= tb - 1e-6) cancel(g); else if (g.end > tb - 1e-6) fadeStop(g, tb, 0.6); }
    startSection(pending.id, tb); pending = null;
  }
  function tick() {
    if (!ctx || !cfg || !ready) return;
    const now = ctx.currentTime; groups = groups.filter(g => !g.dead && g.end + 6 > now);
    if (!cur) { if (wanted && cfg.sections[wanted]) startSection(wanted, now + 0.1); else return; }
    if (pending) { const tb = boundary(pending.quant, Math.max(now + 0.12, pending.tmin || 0)); if (tb < now + 0.5) commit(tb); }
    if (!ending && cur && cur.once && cur.iters >= 1 && cur.nextStart < now + 0.5) { const nx = cfg.linear ? linearNext() : cur.next; if (nx && cfg.sections[nx]) startSection(nx, cur.nextStart); } // an intro hands over to its loop with no gap; a linear song picks its next phrase here
    while (cur && cur.nextStart < now + 0.5 && !(cur.once && cur.iters >= 1)) { scheduleIter(cur.id, cur.nextStart); cur.nextStart += cur.loopLen; cur.iters++; } // once: play the section a single time (an outro), then silence
    for (const g of groups) if (!g.dead && g.start < now + 0.5 && g.end > now && !(g.fadeEnd && now < g.fadeEnd)) g.gains.forEach((n, i) => n.gain.setTargetAtTime(layerTarget(g.sec, i), now, 0.35)); // speed layers
  }

  // linear (hybrid) policy: the song plays in order, phrase by phrase, steered by course progress (0..1). Ahead of the course: replay the phrase. Far behind: jump to where the course is. The last entry loops.
  const STRAIGHT = true; // songs play straight through in manifest order (set false for the progress-steered hybrid: replay when ahead of the course, jump when far behind)
  function order() { return (cfg.linearLong && events.filter(e => e.ev === 'checkpoint').length >= 5 && cfg.linearLong) || cfg.linear; } // a long level (5+ checkpoints) plays the full song order
  function linearNext() {
    const o = order(), i = o.indexOf(cur.id), nh = cfg.noHold || []; if (i < 0) return cur.next || null; if (i >= o.length - 1) return null;
    const nx = i + 1; if (STRAIGHT) return o[nx]; // straight through: no replays, no jumps, whatever the rider does
    let target = clamp(Math.round(progress * (o.length - 1)), 0, o.length - 1);
    if (i >= 1 && nx > target + (cfg.hold ?? 1) && !nh.includes(o[i])) return o[i]; // ahead of the course: replay this phrase (never a riser: it only makes sense played once)
    if (nx < target - (cfg.skip ?? 2)) { while (target > 1 && nh.includes(o[target]) && nh.includes(o[target - 1])) target--; return o[Math.max(1, target)]; } // far behind: jump to where the course is (to the start of a riser, never into its middle)
    return o[nx];
  }
  // journey: the song's sections in order. Checkpoint n of C picks entry round(n * (L - 1) / C), so the last checkpoint always reaches the last entry and a longer level just stretches the song.
  function journeySection(n) { const C = Math.max(1, events.filter(e => e.ev === 'checkpoint').length), J = (C >= 5 && cfg.journeyLong) || cfg.journey, L = J.length; return J[Math.min(L - 1, Math.round(n * (L - 1) / C))]; } // a long level gets the long version of the song
  function bridgeFor(target, eta) { const b = (cfg.bridges || []).find(x => x.to === target && cur && (cur.id === x.from || (cur.once && cur.next === x.from))); if (!b) return null; const long = cfg.sections[b.via]; return b.short && eta !== undefined && long && eta < long.loopLen + 4 ? b.short : b.via; } // the stretch of the song that leads into `target` from where we are

  // ---------- public music API ----------
  const Music = globalThis.Music = {
    load, unlock,
    setEvents(list) { events = list; },
    goto(id, o = {}) {
      wanted = id; if (!cfg || !ready) return; if (!cfg.sections[id]) return;
      if (!cur) return; // tick() starts it
      if (cur.id === id && !pending && !o.restart) return;
      if (cur.once && cur.next === id) return; // a bridge is already on its way there; let the riser finish
      if (pending && pending.id === id) return;
      if (cur.id === id && pending && pending.id !== id) { pending = null; return; }
      pending = { id, quant: o.quantize || cfg.quantize || 'bar', tmin: ctx.currentTime + (o.lead || 0) * cfg.bar }; // lead: bars the old section keeps playing before the swap can happen
    },
    waitFor(q) { return cur && ctx ? boundary(q || cfg.quantize || 'phrase', ctx.currentTime + 0.12) - ctx.currentTime : 0; }, // seconds until a change requested now would take effect
    phrase() { return cfg ? 4 * cfg.bar : 0; },
    bridgeLen(n, eta) { if (!cfg || !cfg.journey) return 0; const via = bridgeFor(journeySection(n), eta); return via && cfg.sections[via] ? cfg.sections[via].loopLen : 0; }, // length of the riser that must play before checkpoint n's section (0 if none)
    leadFor(n) { // seconds before checkpoint n that its music change should start: longer when a riser has to play first
      if (!cfg || !cfg.journey) return 3.5; const via = bridgeFor(journeySection(n)); return via && cfg.sections[via] ? cfg.sections[via].loopLen + 3.4 : 3.5; },
    lenFor(ev) { const t = cfg && (cfg.triggers || []).find(x => x.on === ev); const sec = t && cfg.sections[t.section]; return sec && sec.loopLen ? sec.loopLen : 0; }, // seconds the section for an event lasts (0 if none)
    trigger(ev0, arg, eta) {
      if (!cfg) return;
      try {
        if (cfg.linear && ev0 !== 'finish' && ev0 !== 'finishNear' && ev0 !== 'campaign') return; // a linear song ignores checkpoints and portals: it follows progress
        const early = ev0 === 'approach' || ev0 === 'finishNear', ev = ev0 === 'approach' ? 'checkpoint' : ev0 === 'finishNear' ? 'finish' : ev0; // 'approach' / 'finishNear' fire just before the real event, when the snail is on pace for it
        const lead = early || ev === 'finish' || ev === 'campaign' ? 0 : (cfg.lead ?? 2); // a real checkpoint or portal: let the old section play on a couple of bars first; anticipated ones are already early; finish: the outro lands right away
        if (ev === 'checkpoint' && cfg.journey) { const to = journeySection(arg); Music.goto(bridgeFor(to, eta) || to, { quantize: cfg.transition || 'phrase', lead }); return; } // song order spread over however many checkpoints the level has
        const t = (cfg.triggers || []).find(x => x.on === ev && (ev === 'checkpoint' ? x.n === arg : ev === 'portal' ? x.theme === arg : true));
        if (t) Music.goto(t.section, { quantize: t.quantize, lead });
      } catch (e) { console.warn('music trigger failed', ev0, e); } // music must never take the game down
    },
    at(piece, o) { ending = false; // the section in force when you are at piece i (used on start and after a respawn)
      if (!cfg || !ready) { deferredAt = piece; return; }
      if (cfg.linear) { const playing = cur && (cfg.linear.includes(cur.id) || (cfg.linearLong || []).includes(cur.id)); if (o && o.respawn && playing) return; { const st = (cfg.triggers || []).find(x => x.on === 'start'); Music.goto(st ? st.section : order()[0], { quantize: 'beat', restart: true }); } return; } // a splat does not restart the song; a new run does (at the 'start' trigger's section: for a song with an exposition ahead of the track, a restart must not replay the exposition)
      if (cfg.journey) { let n = 0; for (const e of events) if (e.ev === 'checkpoint' && e.at <= piece) n++; if (n > 0) { Music.goto(journeySection(n), o || { quantize: 'beat' }); return; } }
      const match = e => (cfg.triggers || []).find(x => x.on === e.ev && (e.ev === 'checkpoint' ? x.n === e.n : x.theme === e.theme));
      let ev = null; for (const e of events) if (e.at <= piece && match(e)) ev = e; // only events this song reacts to (a manifest may ignore portals)
      const t = ev ? match(ev) : (cfg.triggers || []).find(x => x.on === 'start');
      if (t) Music.goto((t.on === 'start' && o && o.respawn && t.respawn) || t.section, o || { quantize: 'beat' }); // respawn: don't replay the intro after a splat
    },
    end() { if (!cur || pending || Music.lenFor('finish')) return; ending = true; cur.once = true; }, // at the finish line with no outro: let the phrase in progress end, then silence (no looping the last clip)
    setSpeed(v) { speed = v; },
    setProgress(p) { progress = p; },
    finishQ() { return cfg && cfg.linear ? 'phrase' : 'bar'; },
    setVolume(v) { musicVol = v; if (master) master.gain.setTargetAtTime(musGain(v), ctx.currentTime, 0.05); },
    setSfxVolume(v) { sfxVol = v; if (sfxBus) sfxBus.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
    stop(fade = 0.6) { ending = false; wanted = null; pending = null; if (!ctx) return; const t = ctx.currentTime + fade; for (const g of groups) fadeStop(g, t); cur = null; },
    get debug() { return ctx && cur ? { now: ctx.currentTime, origin: cur.origin, id: cur.id, bar: cfg.bar, pending: pending && pending.id, groups: groups.length } : null; },
    get status() { return 'ctx:' + (ctx ? ctx.state : 'none') + ' cfg:' + (cfg ? 'y' : 'n') + ' ready:' + (ready ? 'y' : 'n') + ' sec:' + (cur ? cur.id : '-') + (lastErr ? ' err:' + lastErr : ''); },
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
    boost() { if (!ok()) return; const t = at(); tone(70, 520, t, 1.8, 0.2, 'sawtooth'); noise(t, 3.2, 0.14, 300, 3500, 1.2); },
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
