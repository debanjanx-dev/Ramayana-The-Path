'use strict';
/* =========================================================
   SOUND — tiny WebAudio synth: tanpura drone, Bhupali
   pentatonic chimes, a conch, arrows and thunder.
   ========================================================= */
const Sound = (() => {
  let ctx = null, master = null, droneTimer = null;
  let on = true;
  try { on = localStorage.getItem('ramayana-sound') !== 'off'; } catch (e) { /* storage blocked */ }
  const SA = 220;                         // Sa
  const R = { S: 1, R: 9 / 8, G: 5 / 4, P: 3 / 2, D: 5 / 3, S2: 2 };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = on ? .55 : 0;
    master.connect(ctx.destination);
    if (on) startDrone();
  }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function tone(freq, dur = .6, type = 'triangle', vol = .25, delay = 0, cutoff = 4000) {
    if (!ctx || !on) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    f.type = 'lowpass'; f.frequency.value = cutoff;
    env(g, t, .008, vol, dur);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + .05);
  }

  function noise(dur = .3, cutoff = 1200, vol = .3, delay = 0, type = 'lowpass') {
    if (!ctx || !on) return;
    const t = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = type; f.frequency.value = cutoff;
    env(g, t, .005, vol, dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  function sweep(f0, f1, dur, type = 'sine', vol = .15, delay = 0, vib = 0, cutoff = 5000) {
    if (!ctx || !on) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vib; lg.gain.value = f0 * .03; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .1); }
    f.type = 'lowpass'; f.frequency.value = cutoff;
    env(g, t, .05, vol, dur);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .1);
  }

  function noiseSweep(f0, f1, dur, vol, type = 'bandpass', delay = 0) {
    if (!ctx || !on) return;
    const t = ctx.currentTime + delay, len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = type; f.Q.value = 2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, .08, vol, dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }

  function startDrone() {
    if (!ctx || droneTimer) return;
    const seq = [R.P / 2, R.S, R.S, R.S / 2];
    let i = 0;
    droneTimer = setInterval(() => {
      if (!on) return;
      tone(SA * seq[i % 4], 2.4, 'sawtooth', .035, 0, 900);
      i++;
    }, 650);
  }

  const play = (name) => {
    if (!ctx || !on) return;
    switch (name) {
      case 'tick': tone(SA * 4 * R.P, .08, 'sine', .05); break;
      case 'advance': tone(SA * 2 * R.G, .25, 'triangle', .08); break;
      case 'arrow': noise(.18, 3000, .18, 0, 'bandpass'); tone(900, .12, 'sine', .05); break;
      case 'hit': noise(.12, 900, .3); tone(140, .15, 'square', .08); break;
      case 'miss': tone(180, .25, 'sawtooth', .07, 0, 600); break;
      case 'bell': [R.S2, R.G * 2].forEach((r, k) => tone(SA * 2 * r, 1.2, 'sine', .12, k * .02)); break;
      case 'good': [R.S, R.R, R.G, R.P, R.D].forEach((r, k) => tone(SA * 2 * r, .5, 'triangle', .12, k * .09)); break;
      case 'win': [R.S, R.G, R.P, R.D, R.S2, R.D, R.S2 * R.G / 1].forEach((r, k) => tone(SA * 2 * r, .7, 'triangle', .13, k * .12)); break;
      case 'lose': [R.P, R.G, R.R, R.S].forEach((r, k) => tone(SA * r, .6, 'sine', .12, k * .18)); break;
      case 'conch': {
        const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(SA * .98, t); o.frequency.linearRampToValueAtTime(SA, t + .4);
        o.frequency.linearRampToValueAtTime(SA * 1.02, t + 1.8);
        f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 3;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .35); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 2.3);
        break;
      }
      case 'thunder': noise(1.6, 300, .6); noise(.4, 2000, .3); break;
      case 'fire': noise(.3, 600, .12); break;
      case 'flip': tone(SA * 3, .1, 'sine', .06); break;
      // ---- super modes: a signature sound for every hero ----
      case 'brahmastra': {   // conch, rising light and a choir chord
        play('conch'); sweep(260, 1400, 1.2, 'sine', .12, 0, 7);
        [R.S, R.G, R.P, R.S2].forEach((r, k) => tone(SA * r, 2.2, 'sawtooth', .05, .25 + k * .05, 1800));
        [R.S2, R.G * 2, R.P * 2].forEach((r, k) => tone(SA * 2 * r, .9, 'sine', .08, .9 + k * .08)); break;
      }
      case 'serpent': noiseSweep(600, 4200, 1.1, .22, 'bandpass'); tone(SA * R.D, 1.4, 'sine', .1, .5); tone(SA * 2 * R.D, 1.2, 'sine', .06, .62); break;
      case 'mahima': {       // a mountain-sized roar and "Jai Shri Ram" drums
        sweep(90, 48, 1.4, 'sawtooth', .22, 0, 0, 500); noise(1.2, 220, .5, .1);
        [0, .22, .44, .66].forEach(d => { tone(70, .25, 'sine', .4, .9 + d); noise(.12, 300, .3, .9 + d); });
        [R.S, R.G, R.P].forEach((r, k) => tone(SA * r, 1.6, 'triangle', .1, 1.0 + k * .03)); break;
      }
      case 'quake': noise(2.2, 140, .7); [0, .35, .7].forEach(d => { tone(55, .4, 'sine', .45, d + .3); noise(.25, 500, .35, d + .3); }); break;
      case 'vajra': noise(.08, 6000, .5, 0, 'highpass'); sweep(2400, 90, .5, 'square', .12); noise(1.4, 400, .55, .05); break;
      case 'ravana': {       // ten heads laughing, then fire
        [0, .16, .32, .48, .64].forEach((d, k) => { const f = 200 - k * 18; tone(f, .14, 'square', .1, d, 900); tone(f * 1.5, .14, 'sawtooth', .05, d, 1200); });
        noiseSweep(300, 2500, 1.4, .3, 'lowpass', .7); break;
      }
      case 'feathers': noiseSweep(400, 2600, 1.3, .3, 'bandpass'); noiseSweep(2600, 500, 1, .2, 'bandpass', .5); break;
      case 'ko': [1, 2.76, 5.4].forEach((m, k) => tone(98 * m, 3 - k * .7, 'sine', .25 / (k + 1))); noise(.4, 800, .2); break;
      case 'round': [R.S2, R.P].forEach((r, k) => tone(SA * 2 * r, 1.4, 'sine', .14, k * .25)); break;
      case 'lotus': [R.P, R.S2].forEach((r, k) => tone(SA * 2 * r, .6, 'sine', .1, k * .1)); break;
    }
  };

  function toggle() {
    on = !on;
    try { localStorage.setItem('ramayana-sound', on ? 'on' : 'off'); } catch (e) { /* ignore */ }
    if (master) master.gain.value = on ? .55 : 0;
    if (on) { init(); startDrone(); }
    return on;
  }

  return { init, play, toggle, get on() { return on; } };
})();
