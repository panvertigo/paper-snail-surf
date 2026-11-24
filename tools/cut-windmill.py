# Cuts "The Old Windmill in My Palm" (5:01, loose piano tempo: no bar grid, so cuts are by time) into two gapless pieces and writes music/windmill.json.
#   expo  2:35.0 - 3:14.5 (39.5 s): the exposition. Fades in over 2 s (full volume by 2:37 when the piano arrives), the quiet piano passage, the 3:00-3:13 riser, ends on the drop.
#   track 3:14.5 - 4:59.0 (104.5 s): track 1. Piano in again at the drop, medium from 3:30, the big climax 4:06-4:39, outro, silence at 4:57.
# The manifest uses a 1-second "bar" (bpm 60, 1 beat per bar) so section lengths are plain seconds. Event 'start' plays the track (what a run does today); event 'campaign' plays expo, then the track follows.
# usage: python tools/cut-windmill.py   (needs: pip install librosa soundfile lameenc)
import json, os, numpy as np, librosa, lameenc, warnings
warnings.filterwarnings('ignore')
MUS = os.path.join(os.path.dirname(__file__), '..', 'music'); SR = 44100
SRC = 'The Old Windmill in My Palm.mp3'
# The riser stops at 3:14.0 but its reverb tail rings out (-17 dB falling to -28 dB) until the first clean piano note at 194.52, so the split is at 194.5: the stamp lands inside expo, track starts on clean piano (cutting at 194.0 put a loud blast in the first 100 ms of the track).
CUTS = {'expo': (155.0, 194.5, {'once': True, 'fadeIn': 2.0}), 'track': (194.5, 299.0, {'once': True})}
GAIN = 10 ** (-4 / 20)   # the source mp3 decodes to peaks of +2.6 dBFS (it is clipped) and re-encoding that added more distortion: take 4 dB off so nothing clips
def enc(x):
    e = lameenc.Encoder(); e.set_bit_rate(256); e.set_in_sample_rate(SR); e.set_channels(2); e.set_quality(2)
    return e.encode((np.clip(x.T, -1, 1) * 32767).astype('<i2').tobytes()) + e.flush()
y, _ = librosa.load(os.path.join(MUS, SRC), sr=SR, mono=False)
if y.ndim == 1: y = np.vstack([y, y])
y = y * GAIN
man = {'bpm': 60, 'beatsPerBar': 1, 'quantize': 'bar', 'startOffset': 0.0251, 'linear': list(CUTS), 'sections': {}, 'triggers': [{'on': 'start', 'section': 'track'}, {'on': 'campaign', 'section': 'expo'}]}
for sid, (t0, t1, extra) in CUTS.items():
    i0, i1 = int(round(t0 * SR)), min(y.shape[1], int(round(t1 * SR))); fn = 'windmill_%s.mp3' % sid
    seg = y[:, i0:i1].copy()
    if sid == 'track': seg[:, :132] *= np.linspace(0, 1, 132)   # 3 ms fade-in so a restart straight into the track cannot click
    open(os.path.join(MUS, fn), 'wb').write(enc(seg)); dur = (i1 - i0) / SR
    man['sections'][sid] = dict(file=fn, bars=round(dur, 3), **extra); print(fn, '%.2fs from %.2fs' % (dur, t0), os.path.getsize(os.path.join(MUS, fn)) // 1024, 'KB')
json.dump(man, open(os.path.join(MUS, 'windmill.json'), 'w'), indent=1)
