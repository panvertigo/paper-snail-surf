# Cuts song sections out of full tracks at bar lines (140 BPM) and writes MP3 loops + a manifest for music.js.
# usage: python tools/cut-music.py     (needs: pip install librosa soundfile lameenc)
import json, os, sys, numpy as np, librosa, lameenc, warnings
from scipy.signal import butter, sosfilt
warnings.filterwarnings('ignore')
MUS = os.path.join(os.path.dirname(__file__), '..', 'music'); SR = 44100; BPM = 140.0; BAR = 240 / BPM
SONGS = {
  # name: source, time of the beat grid, bar number that starts on a downbeat, sections {id: (first bar, bars, extra)}
  # Chicago, hybrid (linear) policy. The song is cut into consecutive 4-bar phrases k01..k22 (bars 1-88) plus the closing arpeggio `earth` (89-100, loops). Short order (Level 3, about 86 s): the build (bars 1-36), then straight to the sky riser (69-88), then earth; the drive sections (37-68) are skipped.
  # Long order (5+ checkpoints, Level 5): the whole song in order. Riser phrases (13-20 and 77-88) are never replayed. No outro (the track's own ending was discordant): the last section just keeps playing.
  'chicago': dict(fallback='descent', linear=['k%02d' % i for i in list(range(1, 10)) + list(range(18, 23))] + ['earth'], linearLong=['k%02d' % i for i in range(1, 23)] + ['earth'], noHold=['k04', 'k05', 'k20', 'k21', 'k22'],
      src='5 Chicago Meditation (radio edit).mp3', grid=0.085 + 60 / BPM, sections={
      **{'k%02d' % i: ((i - 1) * 4 + 1, 4, {'once': True}) for i in range(1, 23)}, 'earth': (89, 12, {})}, # earth is the 2:31-2:51 arpeggio of the track
      triggers=[{'on': 'start', 'section': 'k01'}]),
  # Fleetwood Mac (track 6), hybrid policy: the song plays in order from bar 89 (2:31.4; the vocal sample just before it is cut out) to 4:00, one 4-bar phrase at a time, steered by course progress (see music.js linearNext).
  # Seven lead-in bars (89-95) finish the original's phrase, then every phrase starts on the original's 8-bar grid (96, 100, ...). The plateau (128-135) loops; the outro (136-140) ends at 4:00 and plays once on finish.
  'fleetwood': dict(tame=dict(), linear=['start', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'peak'],
      src='6 Fleetwood Mac_electro.wav', grid=0.138 + 60 / BPM, sections={
      'start': (89, 7, {'once': True}), **{'c%d' % i: (96 + 4 * i, 4, {'once': True}) for i in range(8)},
      'peak': (128, 8, {}), 'outro': (136, 5, {'once': True})},
      triggers=[{'on': 'start', 'section': 'start'}, {'on': 'finish', 'section': 'outro', 'quantize': 'phrase'}]),
  # Salt for Mushroom Field (track 7): exactly 90 BPM; grid anchored on the drop at 45.35 s (bar 18) which lands 17 bars after the start and 32.004 bars before the second climax, so the whole song sits on one grid. Linear (hybrid) policy for Level 1 (about 63 s for an expert):
  # the 17-bar build, the drop on time, then the main groove. The last entry loops; the outro is the song's own fade (bars 62-64, ends 2:50.7).
  'salt': dict(bpm=90.0, linear=['start', 'i0', 'i1', 'i2', 'm0', 'm1', 'peak'],
      src='7 Salt for Mushroom Field.mp3', grid=0.017, sections={
      'start': (1, 5, {'once': True}), 'i0': (6, 4, {'once': True}), 'i1': (10, 4, {'once': True}), 'i2': (14, 4, {'once': True}), 'm0': (18, 4, {'once': True}), 'm1': (22, 4, {'once': True}),
      'peak': (26, 8, {}), 'outro': (62, 3, {'once': True})},
      triggers=[{'on': 'start', 'section': 'start'}, {'on': 'finish', 'section': 'outro', 'quantize': 'phrase'}]),
  'bowl': dict(src='6 Fleetwood Mac_electro.wav', grid=0.138 + 60 / BPM, sections={
      'calm': (49, 16, {}), 'groove': (25, 16, {}), 'peak': (105, 16, {})},
      triggers=[{'on': 'start', 'section': 'calm'}]),
}
def tame(y, lo=2500, hi=7000, ratio=4.0, static_db=-3.0, gain_db=-1.5, ceil=0.89):
    # tames harsh/distorted upper mids without touching the rest: the 2.5-7 kHz band is turned down a little all the time and compressed when it is loud; then a trim and a soft ceiling
    sos = butter(2, [lo, hi], 'band', fs=SR, output='sos'); out = []
    for ch in y:
        band = sosfilt(sos, ch); w = int(0.04 * SR); env = np.sqrt(np.convolve(band ** 2, np.ones(w) / w, 'same')) + 1e-9
        thr = np.median(env) * 1.1; over = np.maximum(env / thr, 1.0); g = over ** (1.0 / ratio - 1.0) * 10 ** (static_db / 20)
        x = ch - band * (1 - g) ; x = x * 10 ** (gain_db / 20); out.append(np.tanh(x / ceil) * ceil if np.abs(x).max() > ceil else x)
    return np.vstack(out)
def band_share(y, lo=2500, hi=7000):
    S = np.abs(librosa.stft(y.mean(0), n_fft=2048, hop_length=1024)) ** 2; f = librosa.fft_frequencies(sr=SR, n_fft=2048); return 100 * S[(f > lo) & (f < hi)].sum() / S.sum()
def enc(x):  # x: (2, n) float
    e = lameenc.Encoder(); e.set_bit_rate(192); e.set_in_sample_rate(SR); e.set_channels(2); e.set_quality(2)
    pcm = (np.clip(x.T, -1, 1) * 32767).astype('<i2').tobytes(); return e.encode(pcm) + e.flush()
for name, S in SONGS.items():
    if len(sys.argv) > 1 and name not in sys.argv[1:]: continue
    y, _ = librosa.load(os.path.join(MUS, S['src']), sr=SR, mono=False)
    if y.ndim == 1: y = np.vstack([y, y])
    BPM_S = S.get('bpm', BPM); BAR_S = 240 / BPM_S
    if 'tame' in S: before = band_share(y); y = tame(y, **S['tame']); print(name, 'harsh-band share %.1f%% -> %.1f%%, peak %.2f' % (before, band_share(y), np.abs(y).max()))
    man = {'bpm': BPM_S, 'beatsPerBar': 4, 'quantize': 'phrase', **({'journey': S['journey']} if S.get('journey') else {}), **({'journeyLong': S['journeyLong']} if S.get('journeyLong') else {}), **({'linear': S['linear']} if S.get('linear') else {}), **({'linearLong': S['linearLong']} if S.get('linearLong') else {}), **({'noHold': S['noHold']} if S.get('noHold') else {}), **({'bridges': S['bridges']} if S.get('bridges') else {}), 'startOffset': 0.0251, 'sections': {}, 'triggers': S['triggers'], **({'fallback': S['fallback']} if S.get('fallback') else {})}
    for sid, (b0, n, extra) in S['sections'].items():
        t0 = S['grid'] + (b0 - 1) * BAR_S; i0 = int(round(t0 * SR)); i1 = int(round((t0 + n * BAR_S) * SR))
        fn = '%s_%s.mp3' % (name, sid); open(os.path.join(MUS, fn), 'wb').write(enc(y[:, i0:i1]))
        man['sections'][sid] = dict(file=fn, bars=n, **extra); print(fn, '%.2fs from %.3fs' % (n * BAR_S, t0), os.path.getsize(os.path.join(MUS, fn)) // 1024, 'KB')
    json.dump(man, open(os.path.join(MUS, name + '.json'), 'w'), indent=1)
