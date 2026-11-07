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
