// Sound design, synthesized live with the Web Audio API (no audio files).
// Off by default; the SOUND button in the browser chrome turns it on.

const SFX = (() => {
  let ctx = null, master = null, verb = null, ambient = null, chirpTimer = null;
  let on = false;

  // A minor pentatonic, two octaves: every pitch in the exhibition comes from here
  const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];
  const THREAD = {
    identity:   { wave: 'triangle', notes: [523.25, 659.25, 783.99], cutoff: 6000 },
    resistance: { wave: 'square',   notes: [196, 233.08, 293.66],    cutoff: 1400 },
    bodies:     { wave: 'sine',     notes: [293.66, 440, 587.33],    cutoff: 9000 },
  };

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(comp).connect(ctx.destination);

    // A short feedback delay stands in for reverb: the "network" echo
    verb = ctx.createDelay(1);
    verb.delayTime.value = 0.23;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2400;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    verb.connect(tone).connect(fb).connect(verb);
    tone.connect(wet).connect(master);

    document.addEventListener('visibilitychange', () => {
      if (!on) return;
      document.hidden ? ctx.suspend() : ctx.resume();
    });
  }

  const now = () => ctx.currentTime;

  // One enveloped oscillator. Everything else is built from this and noise().
  function blip({ freq = 440, to = null, wave = 'sine', t = 0, dur = 0.12, vol = 0.12, cutoff = 8000, echo = 0.4 }) {
    if (!on) return;
    const s = now() + t;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = wave;
    o.frequency.setValueAtTime(freq, s);
    if (to) o.frequency.exponentialRampToValueAtTime(to, s + dur);
    f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(vol, s + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
    o.connect(f).connect(g).connect(master);
    if (echo) { const e = ctx.createGain(); e.gain.value = echo; g.connect(e).connect(verb); }
    o.start(s); o.stop(s + dur + 0.05);
  }

  let noiseBuf = null;
  function noise({ t = 0, dur = 0.03, vol = 0.08, hp = 3000, bp = null }) {
    if (!on) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = now() + t;
    const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    src.buffer = noiseBuf;
    f.type = bp ? 'bandpass' : 'highpass';
    f.frequency.value = bp || hp;
    if (bp) f.Q.value = 6;
    g.gain.setValueAtTime(vol, s);
    g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
    src.connect(f).connect(g).connect(master);
    src.start(s, Math.random() * 0.5); src.stop(s + dur + 0.02);
  }

  /* ---------- Ambient: a low two-oscillator hum + sparse data chirps ---------- */
  function startAmbient() {
    const g = ctx.createGain(); g.gain.value = 0;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
    const lfo = ctx.createOscillator(), lfoAmt = ctx.createGain();
    lfo.frequency.value = 0.07; lfoAmt.gain.value = 140;
    lfo.connect(lfoAmt).connect(f.frequency);
    const oscs = [55, 55.4, 82.4].map((hz, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'sine' : 'sawtooth';
      o.frequency.value = hz;
      o.connect(f);
      o.start();
      return o;
    });
    f.connect(g).connect(master);
    lfo.start();
    g.gain.linearRampToValueAtTime(0.05, now() + 4);
    ambient = { g, stop: () => { g.gain.linearRampToValueAtTime(0, now() + 0.4); setTimeout(() => { oscs.forEach(o => o.stop()); lfo.stop(); }, 500); } };

    const chirp = () => {
      const n = 2 + Math.floor(Math.random() * 4);
      const base = SCALE[5 + Math.floor(Math.random() * 5)];
      for (let i = 0; i < n; i++) blip({ freq: base * (i % 2 ? 1.5 : 1), t: i * 0.06, dur: 0.05, vol: 0.025, wave: 'square', cutoff: 3000, echo: 0.8 });
      chirpTimer = setTimeout(chirp, 5000 + Math.random() * 7000);
    };
    chirpTimer = setTimeout(chirp, 3500);
  }

  function stopAmbient() {
    clearTimeout(chirpTimer);
    if (ambient) ambient.stop();
    ambient = null;
  }

  /* ---------- Dial-up handshake, ~1.4s, played when sound is switched on ---------- */
  function handshake() {
    // DTMF digits
    [[697, 1209], [770, 1336], [852, 1477], [941, 1336]].forEach(([a, b], i) => {
      blip({ freq: a, t: i * 0.09, dur: 0.07, vol: 0.05, echo: 0 });
      blip({ freq: b, t: i * 0.09, dur: 0.07, vol: 0.05, echo: 0 });
    });
    // carrier tone, then the screech
    blip({ freq: 2100, t: 0.42, dur: 0.32, vol: 0.035, echo: 0 });
    blip({ freq: 1200, to: 2400, t: 0.78, dur: 0.28, vol: 0.03, wave: 'square', cutoff: 3500, echo: 0 });
    noise({ t: 0.8, dur: 0.55, vol: 0.05, bp: 1800 });
    blip({ freq: 980, t: 1.1, dur: 0.25, vol: 0.03, wave: 'sawtooth', cutoff: 2500, echo: 0.5 });
  }

  /* ---------- Public API ---------- */
  return {
    get on() { return on; },

    resume() { if (ctx && ctx.state !== 'running') ctx.resume(); },

    set(next) {
      init();
      on = next;
      if (on) {
        ctx.resume();
        master.gain.cancelScheduledValues(now());
        master.gain.setTargetAtTime(0.9, now(), 0.05);
        handshake();
        setTimeout(() => { if (on && !ambient) startAmbient(); }, 1300);
      } else {
        stopAmbient();
        master.gain.setTargetAtTime(0, now(), 0.08);
      }
    },

    // Hovering a work: a tick plus that work's own note
    hoverWork(index) {
      noise({ dur: 0.02, vol: 0.05, hp: 5000 });
      blip({ freq: SCALE[index % SCALE.length], dur: 0.18, vol: 0.05, wave: 'triangle' });
    },

    hoverThread(key) {
      const th = THREAD[key];
      blip({ freq: th.notes[0], dur: 0.25, vol: 0.04, wave: th.wave, cutoff: th.cutoff });
    },

    // Selecting a thread plays an arpeggio: one note per work on it
    playThread(key, workIndexes) {
      const th = THREAD[key];
      th.notes.forEach(n => blip({ freq: n / 2, dur: 1.1, vol: 0.035, wave: th.wave, cutoff: th.cutoff, echo: 0.5 }));
      workIndexes.forEach((wi, i) => blip({ freq: SCALE[wi % SCALE.length] * 2, t: 0.08 + i * 0.09, dur: 0.22, vol: 0.05, wave: th.wave, cutoff: th.cutoff }));
    },

    clearThread() { blip({ freq: 330, to: 220, dur: 0.15, vol: 0.04, wave: 'triangle' }); },

    open() {
      blip({ freq: 440, dur: 0.07, vol: 0.06, wave: 'square', cutoff: 2600 });
      blip({ freq: 660, t: 0.07, dur: 0.12, vol: 0.06, wave: 'square', cutoff: 2600 });
    },

    close() {
      blip({ freq: 660, dur: 0.06, vol: 0.05, wave: 'square', cutoff: 2600 });
      blip({ freq: 330, t: 0.06, dur: 0.1, vol: 0.05, wave: 'square', cutoff: 2600 });
    },

    grab() { noise({ dur: 0.03, vol: 0.07, hp: 2500 }); },
    drop() { noise({ dur: 0.05, vol: 0.06, hp: 1200 }); },

    // Timeline: earlier years sound lower
    year(y) { blip({ freq: 180 * Math.pow(2, (y - 1990) / 18), dur: 0.16, vol: 0.05, wave: 'triangle' }); },

    // Switching views: a disk-drive seek
    seek() { for (let i = 0; i < 7; i++) noise({ t: i * 0.035 + Math.random() * 0.02, dur: 0.018, vol: 0.06, bp: 900 + Math.random() * 1600 }); },

    press() { noise({ dur: 0.015, vol: 0.05, hp: 4000 }); },

    // Index view: going up a directory is a low tick
    parent() {
      noise({ dur: 0.02, vol: 0.05, hp: 2000 });
      blip({ freq: 110, dur: 0.16, vol: 0.06, wave: 'triangle' });
    },
  };
})();
