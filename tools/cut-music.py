# Cuts song sections out of full tracks at bar lines (140 BPM) and writes MP3 loops + a manifest for music.js.
# usage: python tools/cut-music.py     (needs: pip install librosa soundfile lameenc)
import json, os, sys, numpy as np, librosa, lameenc, warnings
warnings.filterwarnings('ignore')
MUS = os.path.join(os.path.dirname(__file__), '..', 'music'); SR = 44100; BPM = 140.0; BAR = 240 / BPM
SONGS = {
  # name: source, time of the beat grid, bar number that starts on a downbeat, sections {id: (first bar, bars, extra)}
  'chicago': dict(fallback='descent', journey=['moon', 'atmos', 'sky', 'earth'], journeyLong=['moon', 'atmos', 'drive1', 'drive2', 'sky', 'earth'],
      # bridges: entering `to` from `from` goes through `via`, a stretch of the song that plays once and runs straight into `to` (the riser of the original track), so builds are never cut off mid-rise
      bridges=[{'from': 'moon', 'to': 'atmos', 'via': 'moon_b', 'short': 'moon_c'}, {'from': 'sky', 'to': 'earth', 'via': 'sky_b', 'short': 'sky_c'}], # short: only the last four bars of the riser, used when the checkpoint is too close for the full one (fast runs)
      src='5 Chicago Meditation (radio edit).mp3', grid=0.085 + 60 / BPM, sections={
      'intro': (1, 4, {'once': True, 'next': 'moon'}),
      'moon': (5, 8, {}), 'moon_b': (13, 8, {'once': True, 'next': 'atmos'}), 'moon_c': (17, 4, {'once': True, 'next': 'atmos'}),
      'atmos': (21, 16, {}), 'drive1': (37, 16, {}), 'drive2': (53, 16, {}),
      'sky': (69, 8, {}), 'sky_b': (77, 12, {'once': True, 'next': 'earth'}), 'sky_c': (85, 4, {'once': True, 'next': 'earth'}), # the riser and the arrival run through bar 88
      'earth': (89, 12, {})}, # the closing arpeggio, 2:31 to 2:51 of the track; it is the last section and just loops
      triggers=[{'on': 'start', 'section': 'intro', 'respawn': 'moon'}]), # no outro: the track's own ending was discordant, so the last section just keeps playing
  # Fleetwood Mac (track 6) as a journey: bar 88 (2:29.7, "2:30") is the start and 4:00 is the end; every section follows the original in order, so each step into the next one is the track's own continuation (both journeys only ever move to the next bar range)
  'fleetwood': dict(journey=['start', 'build', 'lift', 'peak'], journeyLong=['start', 'build', 'liftA', 'liftB', 'peakA', 'peakB'],
      src='6 Fleetwood Mac_electro.wav', grid=0.138 + 60 / BPM, sections={
      'start': (88, 8, {}), 'build': (96, 8, {}), 'lift': (104, 16, {}), 'peak': (120, 16, {}),
      'liftA': (104, 8, {}), 'liftB': (112, 8, {}), 'peakA': (120, 8, {}), 'peakB': (128, 8, {}), # the long journey uses the eight-bar halves; its last section (peakB) just loops
      'outro': (136, 5, {'once': True})}, # bars 136-140 end at 4:00; plays once when the finish is near
      triggers=[{'on': 'start', 'section': 'start'}, {'on': 'finish', 'section': 'outro', 'quantize': 'bar'}]),
  'bowl': dict(src='6 Fleetwood Mac_electro.wav', grid=0.138 + 60 / BPM, sections={
      'calm': (49, 16, {}), 'groove': (25, 16, {}), 'peak': (105, 16, {})},
      triggers=[{'on': 'start', 'section': 'calm'}]),
}
def enc(x):  # x: (2, n) float
    e = lameenc.Encoder(); e.set_bit_rate(192); e.set_in_sample_rate(SR); e.set_channels(2); e.set_quality(2)
    pcm = (np.clip(x.T, -1, 1) * 32767).astype('<i2').tobytes(); return e.encode(pcm) + e.flush()
for name, S in SONGS.items():
    if len(sys.argv) > 1 and name not in sys.argv[1:]: continue
    y, _ = librosa.load(os.path.join(MUS, S['src']), sr=SR, mono=False)
    if y.ndim == 1: y = np.vstack([y, y])
    man = {'bpm': BPM, 'beatsPerBar': 4, 'quantize': 'phrase', **({'journey': S['journey']} if S.get('journey') else {}), **({'journeyLong': S['journeyLong']} if S.get('journeyLong') else {}), **({'bridges': S['bridges']} if S.get('bridges') else {}), 'startOffset': 0.0251, 'sections': {}, 'triggers': S['triggers'], **({'fallback': S['fallback']} if S.get('fallback') else {})}
    for sid, (b0, n, extra) in S['sections'].items():
        t0 = S['grid'] + (b0 - 1) * BAR; i0 = int(round(t0 * SR)); i1 = int(round((t0 + n * BAR) * SR))
        fn = '%s_%s.mp3' % (name, sid); open(os.path.join(MUS, fn), 'wb').write(enc(y[:, i0:i1]))
        man['sections'][sid] = dict(file=fn, bars=n, **extra); print(fn, '%.2fs from %.3fs' % (n * BAR, t0), os.path.getsize(os.path.join(MUS, fn)) // 1024, 'KB')
    json.dump(man, open(os.path.join(MUS, name + '.json'), 'w'), indent=1)
