// Synthesized sound for Solmar Bay: no audio files, everything is built with
// the Web Audio API — engine hum, sirens, gunfire, impacts and a small
// sunset music loop. Starts on the first user gesture (browser policy).

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // Engine: a low sawtooth whose pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Siren: a sine that wails between two notes.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      started = true;
      startMusic();
      return true;
    } catch (err) {
      return false;
    }
  }

  // A lazy sunset loop: warm bass notes and a sparse plucked melody.
  function startMusic() {
    const bassNotes = [55, 55, 65.41, 49];
    const melody = [220, 261.63, 329.63, 392, 329.63, 261.63, 220, 196];
    let step = 0;
    const beatMs = 300;
    musicTimer = window.setInterval(() => {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const bass = bassNotes[Math.floor(step / 2) % bassNotes.length];
      blip(bass, t, beatMs * 2 / 1000, 'triangle', 0.10);
      if (step % 2 === 0) {
        const note = melody[(step / 2) % melody.length];
        blip(note, t, 0.22, 'sine', 0.06);
      }
      step++;
    }, beatMs);
  }

  function blip(freq, when, dur, type, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g);
    g.connect(master);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start();
  }

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    // speed 0..1 while driving; 0 when on foot.
    setEngine(speed01, on) {
      if (!ctx) return;
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.06 : 0, t, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, t, 0.1);
    },
    setSiren(on, wanted) {
      if (!ctx) return;
      const t = ctx.currentTime;
      if (on) {
        sirenGain.gain.setTargetAtTime(0.035 + wanted * 0.006, t, 0.2);
        const phase = (t % 1.2) < 0.6 ? 700 : 950;
        sirenOsc.frequency.setTargetAtTime(phase, t, 0.05);
      } else {
        sirenGain.gain.setTargetAtTime(0, t, 0.2);
      }
    },
    gunshot() { if (ctx && !muted) noiseBurst(0.12, 0.5, 1800); },
    punch() { if (ctx && !muted) noiseBurst(0.08, 0.35, 900); },
    crash() { if (ctx && !muted) noiseBurst(0.25, 0.5, 500); },
    pickup() {
      if (!ctx || muted) return;
      blip(660, ctx.currentTime, 0.12, 'sine', 0.12);
      blip(880, ctx.currentTime + 0.1, 0.18, 'sine', 0.12);
    },
    missionDone() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      [523, 659, 784, 1046].forEach((f, i) => blip(f, t + i * 0.12, 0.25, 'triangle', 0.12));
    },
    busted() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      [392, 311, 233].forEach((f, i) => blip(f, t + i * 0.18, 0.3, 'triangle', 0.12));
    },
    honk() {
      if (!ctx || muted) return;
      blip(370, ctx.currentTime, 0.18, 'square', 0.08);
      blip(466, ctx.currentTime, 0.18, 'square', 0.06);
    },
  };
}
