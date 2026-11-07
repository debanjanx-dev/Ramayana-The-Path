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
    warm();
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

  let duckUntil = 0;
  function startDrone() {
    if (!ctx || droneTimer) return;
    const seq = [R.P / 2, R.S, R.S, R.S / 2];
    let i = 0;
    droneTimer = setInterval(() => {
      if (!on || ctx.currentTime < duckUntil) { i++; return; }
      tone(SA * seq[i % 4], 2.4, 'sawtooth', .035, 0, 900);
      i++;
    }, 650);
  }

  const SUPER = { brahmastra: 1, serpent: 1, mahima: 1, quake: 1, vajra: 1, ravana: 1, feathers: 1 };
  const play = (name) => {
    if (!ctx || !on) return;
    if (SUPER[name]) {
      duckUntil = ctx.currentTime + 3.2;
      noiseSweep(200, 5000, .95, .5, 'bandpass');            // rising swell while time slows
      sweep(110, 440, .9, 'sawtooth', .16, 0, 0, 1400);
      tone(55, 1.4, 'sine', .7, .9); noise(.5, 700, .55, .9); // the impact when the power is released
      heroVoice(name);
    }
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
      case 'conch': sample('conch', { dur: 3.2, vol: .8 }); break;
      case 'synthConch': {
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
      // ---- super modes: a swell, an impact, the hero's signature sound and battle cry ----
      case 'brahmastra': {   // conch, rising light and a choir chord
        sweep(260, 1400, 1.2, 'sine', .12, 0, 7);
        [R.S, R.G, R.P, R.S2].forEach((r, k) => tone(SA * r, 2.6, 'sawtooth', .12, .25 + k * .05, 1800));
        [R.S2, R.G * 2, R.P * 2].forEach((r, k) => [0, .16, .32].forEach(d => tone(SA * 2 * r, .9, 'sine', .16, .9 + d + k * .03))); break;
      }
      case 'serpent': noiseSweep(600, 4200, 1.3, .45, 'bandpass'); noiseSweep(4200, 900, 1, .3, 'bandpass', 1); [R.D, R.S2, R.D * 2].forEach((r, k) => tone(SA * 2 * r, 1.4, 'sine', .2, .9 + k * .12)); break;
      case 'mahima': {       // a mountain-sized roar and "Jai Shri Ram" drums
        sweep(90, 48, 1.4, 'sawtooth', .22, 0, 0, 500); noise(1.2, 220, .5, .1);
        [0, .22, .44, .66].forEach(d => { tone(70, .25, 'sine', .4, .9 + d); noise(.12, 300, .3, .9 + d); });
        [R.S, R.G, R.P].forEach((r, k) => tone(SA * r, 1.8, 'triangle', .2, 1.0 + k * .03)); break;
      }
      case 'quake': noise(2.6, 140, .9); [0, .35, .7].forEach(d => { tone(48, .6, 'sine', .8, d + .9); noise(.35, 500, .6, d + .9); }); break;
      case 'vajra': [.9, 1.4, 1.9].forEach(d => { noise(.1, 6000, .8, d, 'highpass'); sweep(2600, 80, .6, 'square', .22, d); noise(1.4, 380, .8, d + .05); }); break;
      case 'ravana': {       // ten heads laughing, then fire
        [0, .16, .32, .48, .64].forEach((d, k) => { const f = 200 - k * 18; tone(f, .16, 'square', .22, d, 900); tone(f * 1.5, .16, 'sawtooth', .12, d, 1200); });
        noiseSweep(300, 2500, 1.4, .3, 'lowpass', .7); break;
      }
      case 'feathers': noiseSweep(400, 2600, 1.4, .55, 'bandpass'); noiseSweep(2600, 500, 1.2, .45, 'bandpass', .9); [R.P, R.S2].forEach((r, k) => tone(SA * 2 * r, .8, 'triangle', .18, .9 + k * .15)); break;
      case 'ko': sample('gong', { dur: 3.5, vol: .9 }); [1, 2.76, 5.4].forEach((m, k) => tone(98 * m, 3 - k * .7, 'sine', .25 / (k + 1))); noise(.4, 800, .2); break;
      case 'round': [R.S2, R.P].forEach((r, k) => tone(SA * 2 * r, 1.4, 'sine', .14, k * .25)); break;
      case 'lotus': [R.P, R.S2].forEach((r, k) => tone(SA * 2 * r, .6, 'sine', .1, k * .1)); break;
    }
  };

  /* real recordings (openly licensed, see CREDITS.md): voices, conch, drums, roar, thunder */
  const SAMPLES = {
    conch: 'audio/conch.mp3', gong: 'audio/gong.mp3', dhol: 'audio/dhol.mp3', roar: 'audio/roar.mp3', thunder: 'audio/thunder.mp3',
    explosion: 'audio/explosion.mp3', laugh: 'audio/laugh-deep.mp3',
    rama: 'audio/voice-rama.mp3', brahma: 'audio/voice-brahma.mp3', ramaLakshmana: 'audio/voice-rama-lakshmana.mp3',
    bajrang: 'audio/voice-jai-bajrang-bali.mp3', vajra: 'audio/voice-vajra.mp3', ravana: 'audio/voice-ravana.mp3',
  };
  let warmed = false;
  function warm() {
    if (warmed) return; warmed = true;
    for (const k in SAMPLES) { const a = new Audio(); a.preload = 'auto'; a.src = SAMPLES[k]; }
  }
  // HTMLAudio works from a local file as well as from the web
  function sample(name, o = {}) {
    if (!on || !SAMPLES[name]) return;
    const go = () => {
      const a = new Audio(SAMPLES[name]); a.volume = Math.min(1, o.vol == null ? 1 : o.vol);
      const start = () => { if (o.offset) { try { a.currentTime = o.offset; } catch (e) { /* not seekable yet */ } } const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); };
      if (o.offset) a.addEventListener('loadedmetadata', start, { once: true }); else start();
      if (o.dur) setTimeout(() => { let v = a.volume; const id = setInterval(() => { v -= .08; if (v <= 0) { a.pause(); clearInterval(id); } else a.volume = v; }, 30); }, o.dur * 1000);
    };
    if (o.delay) setTimeout(go, o.delay * 1000); else go();
  }
  /* the recorded layer of every hero's super: their name or battle cry, then the power */
  function heroVoice(name) {
    switch (name) {
      case 'brahmastra': sample('conch', { dur: 3, vol: .85 }); sample('brahma', { delay: .15 }); sample('rama', { delay: .95 }); sample('explosion', { delay: 1, vol: .5 }); break;
      case 'serpent': sample('ramaLakshmana', { delay: .1 }); sample('conch', { dur: 1.6, vol: .55, delay: .2 }); break;
      case 'mahima': sample('bajrang', { delay: .05 }); sample('dhol', { offset: 8, dur: 3.2, vol: .9 }); sample('roar', { delay: .85, dur: 2.6 }); break;
      case 'quake': sample('dhol', { offset: 20, dur: 3, vol: .9 }); sample('explosion', { delay: .9 }); sample('thunder', { delay: .95, dur: 2.5, vol: .7 }); break;
      case 'vajra': sample('vajra', { delay: .05 }); sample('thunder', { delay: .85, dur: 3.2 }); sample('explosion', { delay: .9, vol: .6 }); break;
      case 'ravana': sample('ravana', { delay: 0 }); sample('laugh', { delay: .45, dur: 3, vol: .9 }); sample('explosion', { delay: 1, vol: .7 }); break;
      case 'feathers': sample('gong', { dur: 2, vol: .5, delay: .9 }); break;
    }
  }

  function toggle() {
    on = !on;
    try { localStorage.setItem('ramayana-sound', on ? 'on' : 'off'); } catch (e) { /* ignore */ }
    if (master) master.gain.value = on ? .55 : 0;
    if (on) { init(); startDrone(); }
    return on;
  }

  return { init, play, toggle, sample, get on() { return on; } };
})();
