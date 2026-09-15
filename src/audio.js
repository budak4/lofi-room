// Generative lo-fi engine — no audio files, all synthesized with Web Audio API.

const SEMI = 2 ** (1 / 12);
const toFreq = (note) => 440 * SEMI ** (note - 69);

const NOTES = {
  C: -9, Cs: -8, Db: -8, D: -7, Ds: -6, Eb: -6, E: -5, F: -4, Fs: -3, Gb: -3,
  G: -2, Gs: -1, Ab: -1, A: 0, As: 1, Bb: 1, B: 2,
};

function chord(root, kind) {
  const r = NOTES[root];
  const m = { 'maj7': [0, 4, 7, 11], 'min7': [0, 3, 7, 10], 'maj': [0, 4, 7], 'min': [0, 3, 7], 'dom7': [0, 4, 7, 10] };
  return (m[kind] || m.maj7).map((s) => r + s);
}

const TRACKS = [
  {
    id: 'midnight-drive', title: 'midnight drive', artist: 'lofi room',
    bpm: 70, shuffle: 0,
    progressions: [
      [{ c: 'F', k: 'maj7' }, { c: 'A', k: 'min7' }, { c: 'G', k: 'min7' }, { c: 'C', k: 'dom7' }],
    ],
    eq: [0.9, 0.4, 0.2],
  },
  {
    id: 'rainy-lantern', title: 'rainy lantern', artist: 'tea on the desk',
    bpm: 76, shuffle: 0.3,
    progressions: [
      [{ c: 'G', k: 'maj7' }, { c: 'E', k: 'min7' }, { c: 'C', k: 'maj7' }, { c: 'D', k: 'dom7' }],
      [{ c: 'Am', k: 'min7' }, { c: 'F', k: 'maj7' }, { c: 'C', k: 'maj7' }, { c: 'G', k: 'dom7' }],
    ],
    eq: [0.7, 0.7, 0.3],
  },
  {
    id: 'soft-static', title: 'soft static', artist: 'vhs dreams',
    bpm: 82, shuffle: 0.5,
    progressions: [
      [{ c: 'D', k: 'min7' }, { c: 'Bb', k: 'maj7' }, { c: 'F', k: 'maj7' }, { c: 'C', k: 'dom7' }],
    ],
    eq: [0.5, 0.9, 0.5],
  },
  {
    id: 'desk-lamp', title: 'desk lamp', artist: 'amber nights',
    bpm: 88, shuffle: 0.6,
    progressions: [
      [{ c: 'E', k: 'min7' }, { c: 'C', k: 'maj7' }, { c: 'G', k: 'maj7' }, { c: 'D', k: 'min7' }],
      [{ c: 'C', k: 'maj7' }, { c: 'G', k: 'maj7' }, { c: 'Am', k: 'min7' }, { c: 'E', k: 'min7' }],
    ],
    eq: [0.4, 0.8, 0.8],
  },
  {
    id: 'city-glow', title: 'city glow', artist: 'window seat',
    bpm: 66, shuffle: 0.2,
    progressions: [
      [{ c: 'Cmaj7', k: 'maj7' }, { c: 'F', k: 'maj7' }, { c: 'Am', k: 'min7' }, { c: 'G', k: 'maj7' }],
    ],
    eq: [0.8, 0.5, 0.6],
  },
];

export class LofiAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.mix = { kick: null, hat: null, bass: null, piano: null, vinyl: null };
    this.trackIndex = 0;
    this.playing = false;
    this.step = 0;
    this.nextTime = 0;
    this.seconds = 0;
    this.timer = null;
    this._trackDur = 0;
    this.onProgress = null;
    this._noiseBuffer = null;
  }

  get track() { return TRACKS[this.trackIndex]; }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -22; comp.knee.value = 24; comp.ratio.value = 8;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);

    const vinyl = this.ctx.createGain();
    vinyl.gain.value = 0.015;
    const vinylFilter = this.ctx.createBiquadFilter();
    vinylFilter.type = 'lowpass'; vinylFilter.frequency.value = 1200;
    vinyl.connect(vinylFilter); vinylFilter.connect(this.master);
    const vSrc = this.ctx.createBufferSource();
    vSrc.buffer = this._makeVinyl();
    vSrc.loop = true;
    vSrc.connect(vinyl);
    vSrc.start();
    this.mix.vinyl = vinyl;

    this._trackDur = ((this.track.progressions[0].length * 4) * 60) / this.track.bpm;
  }

  _makeVinyl() {
    const sr = this.ctx.sampleRate;
    const len = sr * 2;
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * (Math.random() * 0.7 + 0.3);
      if (Math.random() < 0.002) d[i] *= 8;
    }
    return buf;
  }

  play() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.playing) {
      this.playing = true;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.step = 0;
      this.seconds = 0;
      this.timer = setInterval(() => this._schedule(), 30);
      this._schedule();
    }
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
  }

  toggle() { if (this.playing) this.pause(); else this.play(); }

  setTrack(i) {
    this.trackIndex = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
    if (this.playing) {
      this.pause();
      this.play();
    }
    this._trackDur = ((this.track.progressions[0].length * 4) * 60) / this.track.bpm;
    this.onProgress?.();
  }
  next() { this.setTrack(this.trackIndex + 1); }
  prev() { this.setTrack(this.trackIndex - 1); }

  setVolume(v) { if (this.master) this.master.gain.value = v * v; }

  _schedule() {
    if (!this.playing) return;
    const stepDur = 60 / this.track.bpm / 2;
    while (this.nextTime < this.ctx.currentTime + 0.16) {
      this._playStep(this.step, this.nextTime);
      this.nextTime += stepDur;
      this.step++;
      this.seconds += stepDur;
      if (this.onProgress) {
        const tt = this._trackDur || 1;
        if (this.seconds >= tt) { this.onProgress(1); break; }
        this.onProgress(this.seconds / tt);
      }
    }
  }

  _playStep(step, t) {
    const bar = Math.floor(step / 8);
    const beat = step % 8;
    const prog = this.track.progressions;
    const chordProg = prog[bar % prog.length];
    const chordPos = Math.floor(step / 8) % chordProg.length;
    const ch = chordProg[chordPos];

    // kick on beats 0 and 4 (and sparse ghost)
    if (beat === 0 || beat === 4 || (beat === 7 && Math.random() < this.track.shuffle * 0.4)) {
      this._kick(t);
    }
    // hats on offbeats
    if (beat === 2 || beat === 6 || (beat % 2 === 1 && Math.random() < this.track.shuffle)) {
      this._hat(t, beat % 2 === 1 ? 0.025 : 0.05);
    }
    // bass: root of chord on every beat except slight variation
    if (beat % 2 === 0) this._bass(ch[0] - 12, t, beat === 0 ? 0.5 : 0.2);
    // soft keys: chord on bar start, arpeggio on odd beats
    if (beat === 0) this._arp(ch, t, 'chord');
    else if (beat % 2 === 1) this._arp(ch, t, 'single');
  }

  _env(gain, t, a, peak, d) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + a);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  _kick(t) {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    const g = this.ctx.createGain();
    this._env(g, t, 0.006, 0.7, 0.16);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.2);
  }

  _hat(t, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise();
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 7000;
    const g = this.ctx.createGain();
    this._env(g, t, 0.002, 0.09, dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  _bass(note, t, dur) {
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = toFreq(note);
    o.detune.value = -4;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420;
    const g = this.ctx.createGain();
    this._env(g, t, 0.004, 0.32, dur + 0.15);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.3);
  }

  _arp(ch, t, mode) {
    const tones = mode === 'chord' ? ch : [ch[Math.floor(Math.random() * ch.length)] + (Math.random() > 0.6 ? 12 : 0)];
    tones.slice(0, 3).forEach((n, i) => {
      const delay = i * 0.02;
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = toFreq(n + 24);
      o.detune.value = (Math.random() - 0.5) * 14;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 2600;
      const g = this.ctx.createGain();
      this._env(g, t + delay, 0.02, 0.1, mode === 'chord' ? 1.4 : 0.6);
      o.connect(f); f.connect(g); g.connect(this.master);
      o.start(t + delay); o.stop(t + delay + 1.8);
    });
  }

  _noise() {
    if (!this._noiseBuffer) {
      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr * 0.3, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this._noiseBuffer = buf;
    }
    return this._noiseBuffer;
  }
}

export { TRACKS };