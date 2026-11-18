# Simulates music policies against synthetic players (new, improving, expert, very fast) on the real checkpoint splits of Levels 2 and 3.
# usage: python tools/music-sim.py   (needs numpy, librosa; caches bar intensities in tools/.fleetwood_bars.npy)
# ASSUMPTIONS (no real player data yet): pace multipliers and fall rates below are guesses. Replace them with logged runs when we have them.
import os, sys, numpy as np, warnings
warnings.filterwarnings('ignore')
HERE = os.path.dirname(__file__); BAR = 240 / 140; GRID = 0.138 + 60 / 140; B0, PEAKEND, OUTRO = 88, 135, 136   # Fleetwood: starts bar 88 (2:30), plateau ends bar 135, outro 136-140 (4:00)
cache = os.path.join(HERE, '.fleetwood_bars.npy')
if os.path.exists(cache): E = np.load(cache)
else:
    import librosa
    y, sr = librosa.load(os.path.join(HERE, '..', 'music', '6 Fleetwood Mac_electro.wav'), sr=22050, mono=True)
    rms, cen = [], []
    for b in range(0, 141):
        s = int((GRID + b * BAR) * sr); seg = y[s:s + int(BAR * sr)]
        rms.append(np.sqrt(np.mean(seg ** 2)) if len(seg) > sr else 0); cen.append(librosa.feature.spectral_centroid(y=seg, sr=sr).mean() if len(seg) > sr else 0)
    rms, cen = np.array(rms), np.array(cen); E = 0.5 * rms / rms[87:136].max() + 0.5 * cen / cen[87:136].max(); np.save(cache, E)
def inten(bar): return E[min(bar, 140) - 1]   # bar numbers are 1-based
LEVELS = {'L2': dict(cps=[26.3, 49.7], fin=71.9), 'L3': dict(cps=[19.6, 41.5, 68.5], fin=86.4)}   # expert bot splits (100 ms bot)
GROUPS = {  # pace multiplier range on the expert time, chance of a fall per segment attempt, per-segment noise
    'new':       dict(m=(1.9, 3.2), pf=0.50, sd=0.25),
    'improving': dict(m=(1.35, 1.9), pf=0.25, sd=0.18),
    'expert':    dict(m=(1.0, 1.15), pf=0.04, sd=0.06),
    'very fast': dict(m=(0.78, 0.95), pf=0.06, sd=0.06)}
def player(L, g, rng):
    G = GROUPS[g]; base = rng.uniform(*G['m']); marks = [0] + L['cps'] + [L['fin']]; t = 0; cp = []
    for k in range(1, len(marks)):
        seg = (marks[k] - marks[k - 1]) * base * (1 + rng.normal(0, G['sd']))
        while rng.random() < G['pf']: t += seg * rng.uniform(0.3, 0.9)   # a fall: time lost before respawning at the checkpoint
        t += seg; cp.append(t)
    return cp   # arrival times at each checkpoint, last one is the finish
def progress(cp, L, t):  # course fraction at time t (piecewise linear between checkpoint arrivals, using the expert's split fractions)
    f = [0] + [c / L['fin'] for c in L['cps']] + [1.0]; ts = [0] + cp
    return float(np.interp(t, ts, f))
# --- policies: each returns the list of (bar played) per bar slot, and the count of jump seams and loop wraps ---
def policy_straight(cp, L):
    T = cp[-1]; n = int(T / BAR) + 1; bars = []; b = B0; jumps = loops = 0
    for i in range(n):
        bars.append(b)
        if b == PEAKEND: b = PEAKEND - 7; loops += 1   # loop the last eight bars of the plateau
        else: b += 1
    last = bars[-1]; cut = not (last == PEAKEND)        # the outro continues the song only if the finish lands as the plateau ends
    return bars, jumps + (1 if cut else 0), loops
def sections(B): return B
def policy_adaptive(cp, L):  # the current journey: 4 sections, each loops until the next checkpoint; the change lands at the next phrase line after (checkpoint - 3 s)
    secs = [(88, 8), (96, 8), (104, 16), (120, 16)]; K = len(cp); T = cp[-1]; n = int(T / BAR) + 1
    idx = [round(k * (len(secs) - 1) / K) for k in range(K + 1)]     # segment k uses section idx[k]
    bars = []; cur = 0; pos = 0; jumps = loops = 0
    for i in range(n):
        t = i * BAR; seg = next((k for k in range(K) if t < cp[k] - 3.0), K - 1); want = idx[seg]
        s0, ln = secs[cur]; bars.append(s0 + pos); pos += 1
        if pos >= ln:   # a phrase line: change if wanted, else loop
            pos = 0
            if want != cur:
                if secs[want][0] != s0 + ln: jumps += 1   # not the original's continuation
                cur = want
            else: loops += 1
    last = bars[-1]; cut = not (last == PEAKEND or last == 135); return bars, jumps + (1 if cut else 0), loops
def policy_hybrid(cp, L, skip=True):  # follow the song bar by bar; steer by course progress: hold (loop 4 bars) when ahead of the course, skip forward when far behind
    T = cp[-1]; n = int(T / BAR) + 1; bars = []; b = B0; jumps = loops = 0; hold = 0
    for i in range(n):
        t = i * BAR; target = B0 + progress(cp, L, t) * (PEAKEND - B0)
        bars.append(b)
        if (b - B0 + 1) % 4 == 0:   # a four-bar phrase line
            if b >= PEAKEND: b = PEAKEND - 3; loops += 1; continue
            if b + 1 > target + 3: b = b - 3; loops += 1; continue          # ahead of the course: replay this phrase
            if skip and b + 1 < target - 5: b = int(round(target / 4) * 4) + 1 if int(round(target / 4) * 4) + 1 > b + 1 else b + 1; jumps += 1; continue
        b += 1
    last = bars[-1]; cut = not (last == PEAKEND); return bars, jumps + (1 if cut else 0), loops
POL = {'straight (then loop plateau)': policy_straight, 'adaptive journey (now)': policy_adaptive, 'hybrid (steer, skip+hold)': policy_hybrid, 'hybrid (hold only)': lambda cp, L: policy_hybrid(cp, L, False)}
def metrics(bars, jumps, loops, cp, L):
    T = cp[-1]; n = len(bars); I = np.array([inten(b) for b in bars]); t = np.arange(n) * BAR; pr = np.array([progress(cp, L, x) for x in t])
    fin = I[pr >= 0.8].mean() if (pr >= 0.8).any() else I[-3:].mean(); corr = np.corrcoef(I, pr)[0, 1] if n > 3 and I.std() > 0 else 0
    seen = set(); rep = 0
    for b in bars:
        if b in seen: rep += 1
        seen.add(b)
    return dict(finish_energy=fin, build_corr=corr, jumps_per_min=jumps / (T / 60), loop_wraps=loops, repeat_pct=100 * rep / n, cut_end=0)
rng = np.random.default_rng(7)
print('intensity: start %.2f, build %.2f, plateau %.2f, last-8 %.2f (0..1)' % (inten(90), inten(100), np.mean([inten(b) for b in range(104, 136)]), np.mean([inten(b) for b in range(128, 136)])))
for lv, L in LEVELS.items():
    print('\n==== %s (expert finish %.0f s, %d checkpoints) ====' % (lv, L['fin'], len(L['cps'])))
    print('%-11s %-30s %6s %7s %7s %7s %7s' % ('player', 'policy', 'time', 'fin.en', 'buildR', 'jmp/min', 'repeat%'))
    for g in GROUPS:
        runs = [player(L, g, rng) for _ in range(400)]
        for pn, pf in POL.items():
            ms = []; cuts = 0
            for cp in runs:
                bars, j, lw = pf(cp, L); ms.append(metrics(bars, j, lw, cp, L))
            avg = lambda k: np.mean([m[k] for m in ms])
            print('%-11s %-30s %5.0fs %7.2f %7.2f %7.2f %7.0f' % (g, pn, np.mean([c[-1] for c in runs]), avg('finish_energy'), avg('build_corr'), avg('jumps_per_min'), avg('repeat_pct')))
        print()
