# Cuts song sections out of full tracks at bar lines (140 BPM) and writes MP3 loops + a manifest for music.js.
# usage: python tools/cut-music.py     (needs: pip install librosa soundfile lameenc)
import json, os, sys, numpy as np, librosa, lameenc, warnings
warnings.filterwarnings('ignore')
MUS = os.path.join(os.path.dirname(__file__), '..', 'music'); SR = 44100; BPM = 140.0; BAR = 240 / BPM
SONGS = {
  # name: source, time of the beat grid, bar number that starts on a downbeat, sections {id: (first bar, bars, extra)}
  'chicago': dict(fallback='descent', src='5 Chicago Meditation (radio edit).mp3', grid=0.085 + 60 / BPM, sections={
      'intro': (1, 4, {'once': True, 'next': 'moon'}), 'moon':  (5, 16, {}), 'atmos': (21, 16, {}), 'sky': (69, 16, {}), 'earth': (85, 16, {}), 'outro': (101, 12, {'once': True})},
      triggers=[{'on': 'start', 'section': 'intro', 'respawn': 'moon'}, {'on': 'checkpoint', 'n': 1, 'section': 'atmos'}, {'on': 'checkpoint', 'n': 2, 'section': 'sky'}, {'on': 'checkpoint', 'n': 3, 'section': 'earth'}, {'on': 'portal', 'theme': 1, 'section': 'atmos'}, {'on': 'portal', 'theme': 2, 'section': 'sky'},
                {'on': 'portal', 'theme': 3, 'section': 'earth'}, {'on': 'finish', 'section': 'outro'}]),
  'bowl': dict(src='6 Fleetwood Mac_electro.wav', grid=0.138 + 60 / BPM, sections={
      'calm': (49, 16, {}), 'groove': (25, 16, {}), 'peak': (105, 16, {})},
      triggers=[{'on': 'start', 'section': 'calm'}]),
}
def enc(x):  # x: (2, n) float
    e = lameenc.Encoder(); e.set_bit_rate(192); e.set_in_sample_rate(SR); e.set_channels(2); e.set_quality(2)
    pcm = (np.clip(x.T, -1, 1) * 32767).astype('<i2').tobytes(); return e.encode(pcm) + e.flush()
for name, S in SONGS.items():
    y, _ = librosa.load(os.path.join(MUS, S['src']), sr=SR, mono=False)
    if y.ndim == 1: y = np.vstack([y, y])
    man = {'bpm': BPM, 'beatsPerBar': 4, 'quantize': 'bar', 'startOffset': 0.0251, 'sections': {}, 'triggers': S['triggers'], **({'fallback': S['fallback']} if S.get('fallback') else {})}
    for sid, (b0, n, extra) in S['sections'].items():
        t0 = S['grid'] + (b0 - 1) * BAR; i0 = int(round(t0 * SR)); i1 = int(round((t0 + n * BAR) * SR))
        fn = '%s_%s.mp3' % (name, sid); open(os.path.join(MUS, fn), 'wb').write(enc(y[:, i0:i1]))
        man['sections'][sid] = dict(file=fn, bars=n, **extra); print(fn, '%.2fs from %.3fs' % (n * BAR, t0), os.path.getsize(os.path.join(MUS, fn)) // 1024, 'KB')
    json.dump(man, open(os.path.join(MUS, name + '.json'), 'w'), indent=1)
