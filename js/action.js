'use strict';
/* =========================================================
   ACTION — side-scrolling combat engine.
   Skeleton-animated heroes and rakshasas (heads come from the
   portrait art), arena waves, bosses with telegraphed moves,
   hit-stop, knockback, slow-motion and letterboxed cinematics.
   ========================================================= */
const Action = (() => {
  const W = 1280, H = 720, GY = 600, GRAV = 2300;
  const SERIF = '"Cormorant Garamond", Georgia, serif', DISPLAY = '"Yatra One", "Cormorant Garamond", serif';
  const DEVA = '"Tiro Devanagari Hindi", "Kohinoor Devanagari", serif';
  let cv, ctx, padEl, S = null, raf = 0, last = 0, bound = false, resolveFn = null;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sgn = v => (v < 0 ? -1 : 1);
  const ready = img => img && img.complete && img.naturalWidth > 0;
  const once = (m, k) => (m[k] ? false : (m[k] = true));

  /* ---------- input ---------- */
  const keys = {}, prevKeys = {};
  const mouse = { x: 640, y: 360, used: false, down: false, prevDown: false };
  const BIND = {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    jump: ['Space', 'KeyW', 'ArrowUp'], attack: ['KeyJ', 'KeyZ', 'Mouse'], special: ['KeyK', 'KeyX'], dodge: ['KeyL', 'KeyC', 'ShiftLeft', 'ShiftRight'],
  };
  const held = a => BIND[a].some(k => keys[k]);
  const hit = a => BIND[a].some(k => keys[k] && !prevKeys[k]);
  const released = a => BIND[a].some(k => !keys[k] && prevKeys[k]) && !held(a);

  /* ---------- images ---------- */
  const headImg = k => svgImage('hd_' + k, HeadArt.svg(k));
  const rhImg = i => svgImage('spr_rh' + i, Sprites.ravanaHead(i));
  const bgImg = n => svgImage('bg_' + n, BG.get(n));

  /* =========================================================
     RIGS — colours & kit for every animated figure
     ========================================================= */
  const RIG = {
    rama_young: { head: 'rama_young', skin: '#4a78b5', dhoti: '#f2b705', sash: '#c0392b', weapon: 'bow', thread: true, necklace: true },
    rama_exile: { head: 'rama_exile', skin: '#4a78b5', dhoti: '#a8743c', sash: '#6b4422', weapon: 'bow', thread: true, rudra: true },
    hanuman: { head: 'hanuman', body: 'vanara', skin: '#d4582a', chest: '#f3b98c', dhoti: '#c0392b', sash: '#e8891c', weapon: 'gada', tail: true, thread: true, necklace: true },
    sugriva: { head: 'sugriva', body: 'vanara', skin: '#b07a3a', chest: '#e9c89a', dhoti: '#2e7d4f', weapon: 'none', tail: true, garland: true },
    vali: { head: 'vali', body: 'vanara', skin: '#c9962a', chest: '#f0d9a6', dhoti: '#8e1b2a', weapon: 'none', tail: true, chain: true },
    rakA: { head: 'rakA', skin: '#6a5a8a', dhoti: '#3a1a2a', armor: '#2a1a2a', weapon: 'club' },
    rakB: { head: 'rakB', skin: '#5a7a5a', dhoti: '#4a2a1a', armor: '#3a2a1a', weapon: 'sword' },
    rakC: { head: 'rakC', skin: '#8a5a4a', dhoti: '#2a2a3a', weapon: 'bow' },
    brute: { head: 'rakB', skin: '#4a5a3a', dhoti: '#3a1a10', armor: '#5a4a3a', weapon: 'club' },
    tataka: { head: 'tataka', skin: '#5a4a6a', dhoti: '#2a1a2a', female: true, weapon: 'none', claws: true },
    khara: { head: 'khara', skin: '#7a5a3a', dhoti: '#5b0f17', armor: '#8a6212', weapon: 'mace' },
    akshaya: { head: 'akshaya', skin: '#a06a43', dhoti: '#5b0f17', armor: '#c9a227', weapon: 'sword', necklace: true },
    kumbha: { head: 'kumbha', skin: '#6a4a3a', dhoti: '#3a1a10', armor: '#5a4a3a', weapon: 'club', necklace: true },
    ravana: { head: 'ravana', skin: '#a06a43', dhoti: '#5b0f17', armor: '#d4a017', weapon: 'sword', extraArms: true, necklace: true },
    ravana10: { head: 'ravana10', skin: '#a06a43', dhoti: '#5b0f17', armor: '#d4a017', weapon: 'sword', extraArms: true, necklace: true },
    sita: { head: 'sita', skin: '#f2cba4', dhoti: '#b3202a', blouse: '#1f7a4a', female: true, weapon: 'none', necklace: true },
  };
  function darken(hex, k = .72) {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * k));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  Object.values(RIG).forEach(r => { r.dark = darken(r.skin); });

  /* =========================================================
     POSES — joint angles (0 = hanging down, + = forward)
     ========================================================= */
  const P = o => Object.assign({ tor: 0, hd: 0, lf: [0, 0], lb: [0, 0], af: [0, 0], ab: [0, 0], bob: 0, wpn: 0 }, o);
  const POSE = {
    idle: t => P({ bob: Math.sin(t * 2.4) * 1.6, af: [.2, .4], ab: [-.14, .3], lf: [.12, -.06], lb: [-.12, -.06], tor: .02 }),
    run: t => {
      const c = t * 12;
      return P({ tor: .2, bob: -Math.abs(Math.sin(c)) * 5, lf: [Math.sin(c) * .8, -Math.max(0, Math.sin(c + 1.6)) * 1.2 - .15],
        lb: [Math.sin(c + Math.PI) * .8, -Math.max(0, Math.sin(c + Math.PI + 1.6)) * 1.2 - .15], af: [-Math.sin(c) * .9, .9], ab: [Math.sin(c) * .9, .9] });
    },
    jump: (t, e) => (e.vy < 0 ? P({ tor: .1, lf: [.9, -1.4], lb: [-.2, -.5], af: [2.5, .3], ab: [1.9, .4] })
      : P({ tor: .05, lf: [.35, -.4], lb: [-.25, -.3], af: [1.3, .6], ab: [1.0, .5] })),
    aim: (t, e) => {
      const a = Math.PI / 2 - (e.aimA || 0), d = e.drawK == null ? 1 : e.drawK;
      return P({ tor: -.05, lf: [.35, -.12], lb: [-.4, -.1], af: [a, 0], ab: [a - .2, -2.5 * d] });
    },
    windup: () => P({ tor: -.25, af: [2.9, .3], ab: [2.3, .4], lf: [.45, -.2], lb: [-.45, -.2] }),
    strike: () => P({ tor: .38, af: [1.1, .1], ab: [.2, .6], lf: [.65, -.2], lb: [-.55, -.2] }),
    punch1: () => P({ tor: .25, af: [1.55, 0], ab: [.3, 1.5], lf: [.45, -.2], lb: [-.45, -.2] }),
    punch2: () => P({ tor: .3, ab: [1.55, 0], af: [.4, 1.4], lf: [.5, -.2], lb: [-.45, -.2] }),
    swing: (t, e) => { const p = clamp(e.swingK || 0, 0, 1); return P({ tor: lerp(-.3, .45, p), af: [lerp(3.0, .7, p), .1], ab: [lerp(2.4, .4, p), .5], lf: [.6, -.3], lb: [-.5, -.2] }); },
    slam: () => P({ tor: .3, af: [2.9, 0], ab: [2.6, .2], lf: [.9, -1.6], lb: [.3, -1.2] }),
    sweep: () => P({ tor: .55, bob: 10, af: [1.3, .1], ab: [.5, .7], lf: [1.0, -1.2], lb: [-.6, -.3] }),
    stomp: () => P({ tor: -.15, lf: [1.4, -1.3], lb: [-.1, -.05], af: [1.9, .6], ab: [1.6, .6] }),
    hurt: () => P({ tor: -.4, hd: -.3, af: [-.8, .6], ab: [-1.1, .4], lf: [.3, -.3], lb: [-.3, -.2] }),
    roll: () => P({ tor: .9, bob: 28, lf: [1.9, -2.5], lb: [1.6, -2.4], af: [1.6, 1.6], ab: [1.3, 1.6] }),
    roar: t => P({ tor: -.3, hd: -.35, bob: Math.sin(t * 30) * 1.5, af: [2.4, .8], ab: [2.6, .8], lf: [.4, -.1], lb: [-.4, -.1] }),
    crouch: () => P({ tor: .45, bob: 14, lf: [1.1, -1.9], lb: [.2, -1.5], af: [.6, .8], ab: [.3, .8] }),
    stand: () => P({ af: [.1, .2], ab: [-.1, .2] }),
  };

  /* =========================================================
     DRAWING — figures
     ========================================================= */
  function limb(a, b, c, w, col) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = w + 3.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();
  }
  function dot(p, r, col, stroke) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    if (stroke) { ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function poly(pts, fill, lw = 2) {
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
  }

  function drawWeapon(e, hand, ang, s, f, J) {
    const r = e.rig, dx = Math.sin(ang) * f, dy = Math.cos(ang);
    const at = k => ({ x: hand.x + dx * k * s, y: hand.y + dy * k * s });
    ctx.lineCap = 'round';
    switch (r.weapon) {
      case 'bow': {
        // the bow stands perpendicular to the aim direction
        const px = -dy, py = dx, bend = e.aiming ? 1 : .6;
        const t1 = { x: hand.x + px * 46 * s, y: hand.y + py * 46 * s }, t2 = { x: hand.x - px * 46 * s, y: hand.y - py * 46 * s };
        const ctrl = { x: hand.x + dx * 26 * s * bend, y: hand.y + dy * 26 * s * bend };
        ctx.strokeStyle = '#3e220f'; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.quadraticCurveTo(ctrl.x, ctrl.y, t2.x, t2.y); ctx.stroke();
        ctx.strokeStyle = '#9a5d27'; ctx.lineWidth = 3.4 * s; ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.quadraticCurveTo(ctrl.x, ctrl.y, t2.x, t2.y); ctx.stroke();
        dot(hand, 4 * s, GOLD);
        const pull = e.aiming ? J.hB : hand;
        ctx.strokeStyle = '#f3ead2'; ctx.lineWidth = 1.3 * s;
        ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(pull.x, pull.y); ctx.lineTo(t2.x, t2.y); ctx.stroke();
        if (e.aiming) {
          const tip = at(40), glow = (e.charge || 0) >= CHARGE;
          ctx.save(); if (glow) { ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 20; }
          ctx.strokeStyle = glow ? '#fff3b0' : '#5e3a12'; ctx.lineWidth = (glow ? 4 : 2.4) * s;
          ctx.beginPath(); ctx.moveTo(pull.x, pull.y); ctx.lineTo(tip.x, tip.y); ctx.stroke(); ctx.restore();
          dot(tip, 3 * s, glow ? '#fff7d0' : '#d9dde2');
        }
        break;
      }
      case 'gada': {
        const a = at(-8), b = at(44), hd = at(58);
        ctx.strokeStyle = '#5e3a12'; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.save(); ctx.translate(hd.x, hd.y); ctx.rotate(Math.atan2(dy, dx));
        ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, 0, 19 * s, 15 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = GOLD_D; ctx.beginPath(); ctx.moveTo(-6 * s, -14 * s); ctx.lineTo(-6 * s, 14 * s); ctx.moveTo(6 * s, -14 * s); ctx.lineTo(6 * s, 14 * s); ctx.stroke();
        dot({ x: 0, y: 0 }, 3.4 * s, RUBY); dot({ x: 21 * s, y: 0 }, 4 * s, GOLD, true);
        ctx.restore(); break;
      }
      case 'mace': case 'club': {
        const iron = r.weapon === 'mace', a = at(-6), b = at(62);
        ctx.strokeStyle = INK; ctx.lineWidth = (iron ? 7 : 12) * s + 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = iron ? '#4a4a52' : '#6a3a1a'; ctx.lineWidth = (iron ? 7 : 12) * s; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        if (iron) dot(at(66), 13 * s, '#5a5a62', true);
        ctx.fillStyle = '#d9dde2';
        for (let k = 20; k <= 62; k += 14) { const p = at(k); dot({ x: p.x + dy * f * 7 * s, y: p.y - dx * 7 * s }, 2.6 * s, '#d9dde2'); dot({ x: p.x - dy * f * 7 * s, y: p.y + dx * 7 * s }, 2.6 * s, '#d9dde2'); }
        break;
      }
      case 'sword': {
        const a = at(4), b = at(60), m = at(32);
        ctx.strokeStyle = INK; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(m.x + dy * f * 8 * s, m.y - dx * 8 * s, b.x, b.y); ctx.stroke();
        ctx.strokeStyle = '#d9e2ea'; ctx.lineWidth = 4.5 * s; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(m.x + dy * f * 8 * s, m.y - dx * 8 * s, b.x, b.y); ctx.stroke();
        ctx.strokeStyle = GOLD; ctx.lineWidth = 4 * s; const g1 = at(2);
        ctx.beginPath(); ctx.moveTo(g1.x + dy * f * 8 * s, g1.y - dx * 8 * s); ctx.lineTo(g1.x - dy * f * 8 * s, g1.y + dx * 8 * s); ctx.stroke();
        break;
      }
    }
  }

  function drawFigure(e) {
    const r = e.rig, s = e.scale, f = e.face, p = e.pose || POSE.idle(0);
    const white = e.flash > 0 && !e.isBoss, C = c => (white ? '#fff6e6' : c);
    const skin = C(r.skin), dark = C(r.dark);
    ctx.save();
    if (e.alpha != null) ctx.globalAlpha = e.alpha;
    if (e.rot) { const px = e.x, py = e.y - (e.rotPivot || 0) * s; ctx.translate(px, py - (e.dead ? Math.abs(Math.sin(e.rot)) * 16 * s : 0)); ctx.rotate(e.rot * f); ctx.translate(-px, -py); }
    const hip = { x: e.x, y: e.y - 74 * s + p.bob * s };
    const neck = { x: hip.x + Math.sin(p.tor) * 48 * s * f, y: hip.y - Math.cos(p.tor) * 48 * s };
    const seg = (o, a, len) => ({ x: o.x + Math.sin(a) * len * s * f, y: o.y + Math.cos(a) * len * s });
    const shF = { x: neck.x + 6 * s * f, y: neck.y + 8 * s }, shB = { x: neck.x - 6 * s * f, y: neck.y + 8 * s };
    const kF = seg(hip, p.lf[0], 38), ftF = seg(kF, p.lf[0] + p.lf[1], 38);
    const kB = seg(hip, p.lb[0], 38), ftB = seg(kB, p.lb[0] + p.lb[1], 38);
    const eF = seg(shF, p.af[0], 28), hF = seg(eF, p.af[0] + p.af[1], 27);
    const eB = seg(shB, p.ab[0], 28), hB = seg(eB, p.ab[0] + p.ab[1], 27);
    const J = { hip, neck, hF, hB, shF };
    e.J = J;
    const lw = (r.body === 'vanara' ? 13 : 12) * s;

    // vanara tail
    if (r.tail) {
      const sw = Math.sin(S.t * 3 + e.x * .01) * 10 * s;
      const a = { x: hip.x - 8 * s * f, y: hip.y }, c1 = { x: hip.x - 64 * s * f, y: hip.y + 14 * s }, c2 = { x: hip.x - 82 * s * f, y: hip.y - 86 * s + sw }, end = { x: hip.x - 44 * s * f, y: hip.y - 104 * s + sw };
      ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 10 * s + 3;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y); ctx.stroke();
      ctx.strokeStyle = dark; ctx.lineWidth = 10 * s; ctx.stroke();
      if (e.fireTail) { for (let i = 0; i < 2; i++) S.fx.push({ k: 'fire', x: end.x + rnd(-6, 6), y: end.y + rnd(-6, 6), vx: rnd(-40, 40) - e.vx * .3, vy: rnd(-120, -40), t: 0, life: rnd(.3, .6), r: rnd(6, 12) * s }); }
    }
    // extra arms of Ravana, fanned behind
    if (r.extraArms) {
      [[-2.2, .5, 'trident'], [-1.5, .3, 'shield'], [-.8, .4, 'disc'], [2.3, .4, 'axe'], [1.9, .2, 'bow2']].forEach(([a0, el, w], i) => {
        const a = a0 + Math.sin(S.t * 1.5 + i) * .08, sh = a0 < 0 ? shB : shF;
        const el1 = seg(sh, a, 30), hd = seg(el1, a + el, 28);
        limb(sh, el1, hd, lw * .85, dark); dot(el1, lw * .4, C(GOLD));
        drawExtraWeapon(hd, w, s, f);
        dot(hd, lw * .5, dark, true);
      });
    }
    limb(shB, eB, hB, lw * .92, dark); dot(hB, lw * .5, dark, true);
    limb(hip, kB, ftB, lw, dark); foot(ftB, s, f, dark);
    limb(hip, kF, ftF, lw, skin); foot(ftF, s, f, skin);
    // dhoti / skirt
    const wB = { x: hip.x - 14 * s * f, y: hip.y - 6 * s }, wF = { x: hip.x + 14 * s * f, y: hip.y - 6 * s };
    if (r.female) {
      poly([wB, wF, { x: ftF.x + 12 * s * f, y: ftF.y - 6 * s }, { x: ftB.x - 12 * s * f, y: ftB.y - 6 * s }], C(r.dhoti));
      ctx.strokeStyle = C(GOLD); ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(ftF.x + 11 * s * f, ftF.y - 8 * s); ctx.lineTo(ftB.x - 11 * s * f, ftB.y - 8 * s); ctx.stroke();
    } else {
      const mid = { x: (kF.x + kB.x) / 2, y: Math.max(kF.y, kB.y) + 4 * s };
      poly([wB, wF, { x: kF.x + 8 * s * f, y: kF.y + 2 * s }, mid, { x: kB.x - 8 * s * f, y: kB.y + 2 * s }], C(r.dhoti));
      ctx.strokeStyle = C(GOLD); ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(kF.x + 7 * s * f, kF.y); ctx.lineTo(mid.x, mid.y - 2 * s); ctx.lineTo(kB.x - 7 * s * f, kB.y); ctx.stroke();
    }
    // torso
    const tw = (r.body === 'vanara' ? 19 : 17) * s;
    const torsoPts = [{ x: neck.x - tw, y: neck.y + 4 * s }, { x: neck.x + tw, y: neck.y + 4 * s }, { x: hip.x + 14 * s, y: hip.y - 2 * s }, { x: hip.x - 14 * s, y: hip.y - 2 * s }];
    poly(torsoPts, r.female ? C(r.blouse || r.dhoti) : r.armor ? C(r.armor) : skin);
    if (r.body === 'vanara') { ctx.fillStyle = C(r.chest); ctx.beginPath(); ctx.ellipse((neck.x + hip.x) / 2, (neck.y + hip.y) / 2 + 4 * s, 10 * s, 16 * s, p.tor * f, 0, Math.PI * 2); ctx.fill(); }
    if (r.armor) { ctx.strokeStyle = C(GOLD); ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(torsoPts[0].x, torsoPts[0].y); ctx.lineTo(torsoPts[3].x, torsoPts[3].y); ctx.moveTo(torsoPts[1].x, torsoPts[1].y); ctx.lineTo(torsoPts[2].x, torsoPts[2].y); ctx.stroke(); dot({ x: (neck.x + hip.x) / 2, y: (neck.y + hip.y) / 2 }, 5 * s, C(RUBY), true); }
    if (r.sash) poly([{ x: neck.x + tw * f * .9, y: neck.y + 4 * s }, { x: neck.x + tw * f * .4, y: neck.y + 4 * s }, { x: hip.x - 14 * s * f, y: hip.y - 4 * s }, { x: hip.x - 4 * s * f, y: hip.y - 2 * s }], C(r.sash), 1.4);
    if (r.thread) { ctx.strokeStyle = C('#fff7e6'); ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(neck.x - tw * f * .8, neck.y + 6 * s); ctx.lineTo(hip.x + 12 * s * f, hip.y - 4 * s); ctx.stroke(); }
    if (r.necklace || r.chain) { ctx.strokeStyle = C(GOLD); ctx.lineWidth = (r.chain ? 5 : 2.6) * s; ctx.beginPath(); ctx.arc(neck.x, neck.y + 2 * s, 11 * s, .15 * Math.PI, .85 * Math.PI); ctx.stroke(); }
    if (r.rudra) { ctx.strokeStyle = C('#6b3a1f'); ctx.lineWidth = 3.4 * s; ctx.setLineDash([.1, 4.5 * s]); ctx.beginPath(); ctx.arc(neck.x, neck.y + 2 * s, 12 * s, .15 * Math.PI, .85 * Math.PI); ctx.stroke(); ctx.setLineDash([]); }
    if (r.garland) { ctx.lineCap = 'round'; ctx.setLineDash([.1, 7 * s]); ctx.strokeStyle = C('#fff7d6'); ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.arc(neck.x, neck.y + 4 * s, 15 * s, .1 * Math.PI, .9 * Math.PI); ctx.stroke(); ctx.strokeStyle = C('#f0a020'); ctx.lineDashOffset = 3.5 * s; ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0; }
    ctx.strokeStyle = C(GOLD); ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(hip.x - 14 * s, hip.y - 4 * s); ctx.lineTo(hip.x + 14 * s, hip.y - 4 * s); ctx.stroke();
    // head
    drawHead(e, neck, s, f, p);
    if (e.flash > 0) { ctx.fillStyle = 'rgba(255,246,230,.55)'; ctx.beginPath(); ctx.arc(neck.x, neck.y - 26 * s, 26 * s, 0, Math.PI * 2); ctx.fill(); }
    // front arm, weapon, hand
    limb(shF, eF, hF, lw * .92, skin); dot({ x: (shF.x + eF.x) / 2, y: (shF.y + eF.y) / 2 }, lw * .38, C(GOLD));
    if (r.weapon !== 'none') drawWeapon(e, hF, p.af[0] + p.af[1] + p.wpn, s, f, J);
    dot(hF, lw * .5, skin, true);
    if (r.claws) { ctx.strokeStyle = '#f2ede2'; ctx.lineWidth = 2 * s; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(hF.x, hF.y); ctx.lineTo(hF.x + (8 * f + k * 2) * s, hF.y + (6 + k * 4) * s); ctx.stroke(); } }
    ctx.restore();
  }

  function foot(p, s, f, col) {
    ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(p.x + 5 * s * f, p.y + 1 * s, 9 * s, 4.5 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(p.x - 5 * s, p.y - 4 * s); ctx.lineTo(p.x + 5 * s, p.y - 4 * s); ctx.stroke();
  }

  function drawExtraWeapon(h, w, s, f) {
    ctx.save(); ctx.translate(h.x, h.y); ctx.scale(s * f, s); ctx.strokeStyle = INK; ctx.lineWidth = 2 / s;
    if (w === 'trident') { ctx.strokeStyle = '#cfd6dc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, -46); ctx.moveTo(-10, -32); ctx.quadraticCurveTo(-10, -44, -6, -54); ctx.moveTo(10, -32); ctx.quadraticCurveTo(10, -44, 6, -54); ctx.moveTo(-10, -32); ctx.lineTo(10, -32); ctx.stroke(); }
    if (w === 'shield') { ctx.fillStyle = '#5b0f17'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke(); }
    if (w === 'disc') { ctx.rotate(S.t * 5); ctx.fillStyle = GOLD; ctx.beginPath(); for (let k = 0; k < 12; k++) { const r = k % 2 ? 11 : 17, a = k * Math.PI / 6; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (w === 'axe') { ctx.strokeStyle = '#5e3a12'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, -36); ctx.stroke(); ctx.fillStyle = '#cfd6dc'; ctx.beginPath(); ctx.moveTo(0, -36); ctx.quadraticCurveTo(20, -40, 18, -18); ctx.lineTo(0, -22); ctx.closePath(); ctx.fill(); }
    if (w === 'bow2') { ctx.strokeStyle = '#3e220f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-10, 0, 30, -1, 1); ctx.stroke(); }
    ctx.restore();
  }

  function drawHead(e, neck, s, f, p) {
    const k = e.rig.head, hs = .42 * s;
    ctx.save(); ctx.translate(neck.x, neck.y); ctx.rotate((p.tor * .5 + p.hd) * f); if (f < 0) ctx.scale(-1, 1);
    if (k === 'ravana10') {
      // ten separately-severable heads
      RAVANA_HEADS.forEach(([x, y, sc], i) => {
        const hd = e.heads ? e.heads[i] : null;
        const cx = (x - 100) * hs, cy = (y - 150) * hs;
        let g = 1;
        if (hd && !hd.alive) { if (hd.regrow > .6) return; g = 1 - hd.regrow / .6; }
        const img = rhImg(i % 5), w = 100 * sc * hs * g, h = 162 * sc * hs * g;
        if (ready(img)) ctx.drawImage(img, cx - w / 2, cy - 108 * sc * hs * g, w, h);
        if (hd && hd.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(cx, cy, 40 * sc * hs, 0, Math.PI * 2); ctx.fill(); }
      });
    } else {
      const img = headImg(k);
      if (ready(img)) {
        if (k === 'ravana') ctx.drawImage(img, -195 * hs, -210 * hs, 390 * hs, 236 * hs);
        else ctx.drawImage(img, -64 * hs, -156 * hs, 128 * hs, 196 * hs);
      }
    }
    ctx.restore();
  }

  /* world positions of Ravana's heads (for hit tests) */
  function ravanaHeadPos(e) {
    const J = e.J; if (!J) return [];
    const hs = .42 * e.scale, f = e.face;
    return RAVANA_HEADS.map(([x, y, sc]) => ({ x: J.neck.x + (x - 100) * hs * f, y: J.neck.y + (y - 150) * hs, r: 40 * sc * hs }));
  }

  /* demons & birds drawn directly */
  function drawDemon(e) {
    const s = e.scale, t = S.t, white = e.flash > 0;
    const body = white ? '#fff' : e.col || '#3a2050';
    ctx.save(); ctx.translate(e.x, e.y - 40 * s); ctx.scale(s * e.face, s); if (e.rot) ctx.rotate(e.rot);
    if (e.alpha != null) ctx.globalAlpha = e.alpha;
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    const flap = Math.sin(t * 12 + e.x) * 12;
    for (const m of [1, -1]) {
      ctx.save(); ctx.scale(m, 1); ctx.fillStyle = white ? '#fff' : '#1e1028';
      ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(-64, -34 - flap); ctx.lineTo(-50, -8); ctx.lineTo(-70, 6 - flap / 2); ctx.lineTo(-42, 12); ctx.lineTo(-52, 30); ctx.lineTo(-12, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(-22, -6); ctx.quadraticCurveTo(0, -30, 22, -6); ctx.lineTo(18, 30); ctx.lineTo(8, 24); ctx.lineTo(0, 38); ctx.lineTo(-8, 24); ctx.lineTo(-18, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-19, 12); ctx.lineTo(19, 12); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillStyle = '#e9dcc0';
    for (const m of [1, -1]) { ctx.beginPath(); ctx.moveTo(-10 * m, -38); ctx.quadraticCurveTo(-26 * m, -52, -20 * m, -66); ctx.quadraticCurveTo(-12 * m, -50, -3 * m, -42); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, -26, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#120b08'; ctx.beginPath(); ctx.moveTo(-17, -30); ctx.quadraticCurveTo(-20, -48, 0, -45); ctx.quadraticCurveTo(20, -48, 17, -30); ctx.quadraticCurveTo(0, -38, -17, -30); ctx.fill();
    ctx.fillStyle = '#ff3b2f'; ctx.beginPath(); ctx.ellipse(-6, -27, 4.2, 2.6, .35, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(6, -27, 4.2, 2.6, -.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-7, -17); ctx.lineTo(-4, -10); ctx.lineTo(-2, -17); ctx.moveTo(2, -17); ctx.lineTo(4, -10); ctx.lineTo(7, -17); ctx.fill();
    if (e.crown) { ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(-14, -42); ctx.lineTo(-10, -56); ctx.lineTo(-4, -46); ctx.lineTo(0, -60); ctx.lineTo(4, -46); ctx.lineTo(10, -56); ctx.lineTo(14, -42); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }

  function drawJatayu(e) {
    const s = e.scale, t = S.t, white = e.flash > 0, C = c => (white ? '#fff6e6' : c);
    const flap = Math.sin(t * (e.dive ? 30 : 10)) * .7;
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.face * s, s); ctx.rotate(e.tilt || 0);
    if (e.rot) ctx.rotate(e.rot);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    const wing = (sgnY, col) => {
      ctx.save(); ctx.rotate(sgnY * flap * .6); ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-30, -70 * sgnY, -96, -54 * sgnY); ctx.lineTo(-80, -40 * sgnY); ctx.lineTo(-98, -30 * sgnY); ctx.lineTo(-74, -20 * sgnY); ctx.lineTo(-86, -8 * sgnY); ctx.lineTo(-40, 4 * sgnY); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C(GOLD); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(-10, -4 * sgnY); ctx.quadraticCurveTo(-34, -52 * sgnY, -88, -46 * sgnY); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    };
    wing(1, C('#5a3a1d'));
    ctx.fillStyle = C('#7d5230'); ctx.beginPath(); ctx.ellipse(-10, 0, 46, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('#4a2e16'); ctx.beginPath(); ctx.moveTo(-52, -6); ctx.lineTo(-84, -14); ctx.lineTo(-80, 0); ctx.lineTo(-86, 12); ctx.lineTo(-52, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    // talons
    ctx.strokeStyle = C('#e2b33a'); ctx.lineWidth = 3;
    const tx = e.dive ? 26 : 4, ty = e.dive ? 26 : 20;
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(tx, ty); ctx.lineTo(tx + 8, ty - 2); ctx.moveTo(tx, ty); ctx.lineTo(tx + 6, ty + 6); ctx.stroke();
    ctx.fillStyle = C('#efe6d6'); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(28, -6, 16, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('#c98b6b'); ctx.beginPath(); ctx.ellipse(46, -16, 14, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('#e2b33a'); ctx.beginPath(); ctx.moveTo(56, -20); ctx.quadraticCurveTo(76, -18, 72, -4); ctx.quadraticCurveTo(66, -10, 56, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    dot({ x: 48, y: -20 }, 3.4, GOLD_L, true); dot({ x: 48.5, y: -20 }, 1.6, INK);
    ctx.fillStyle = C(GOLD); ctx.beginPath(); ctx.moveTo(36, -26); ctx.lineTo(38, -40); ctx.lineTo(43, -33); ctx.lineTo(47, -44); ctx.lineTo(51, -33); ctx.lineTo(56, -40); ctx.lineTo(56, -25); ctx.closePath(); ctx.fill(); ctx.stroke();
    dot({ x: 46, y: -31 }, 2, RUBY);
    wing(-1, C('#6b4423'));
    ctx.restore();
  }

  function drawChariot(e) {
    const s = e.scale, x = e.x, y = e.y, white = e.flash > 0, C = c => (white ? '#fff6e6' : c);
    // Ravana and Sita stand in the flying chariot
    ravanaFig.x = x + 30 * s; ravanaFig.y = y - 40 * s; ravanaFig.face = e.face; ravanaFig.flash = e.flash;
    ravanaFig.pose = e.attacking ? POSE.strike() : POSE.idle(S.t);
    sitaFig.x = x - 60 * s * e.face; sitaFig.y = y - 40 * s; sitaFig.face = e.face; sitaFig.pose = P({ tor: -.15, hd: -.2, af: [2.6, .3], ab: [2.2, .2] });
    drawFigure(sitaFig); drawFigure(ravanaFig);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.fillStyle = C(GOLD); ctx.beginPath(); ctx.moveTo(-120, -70); ctx.lineTo(120, -70); ctx.lineTo(100, 0); ctx.lineTo(-100, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('#8e1b2a'); ctx.fillRect(-108, -58, 216, 12);
    for (let i = -3; i <= 3; i++) dot({ x: i * 28, y: -30 }, 5, i % 2 ? C(RUBY) : C(EMER), true);
    ctx.fillStyle = C('#5a2a1a'); for (const wx of [-70, 70]) { ctx.beginPath(); ctx.arc(wx, 4, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.strokeStyle = GOLD; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + S.t * 4; ctx.beginPath(); ctx.moveTo(wx, 4); ctx.lineTo(wx + Math.cos(a) * 22, 4 + Math.sin(a) * 22); ctx.stroke(); } ctx.strokeStyle = INK; }
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(0, 30, 140, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  let ravanaFig = null, sitaFig = null;

  /* =========================================================
     STAGES
     ========================================================= */
  const CHARGE = .55;
  const STAGES = {
    act_bala: { hero: 'rama_young', style: 'archer', bg: 'ashram', len: 4300, title: 'Siddhashrama', sub: 'Guard Vishwamitra\'s yajna', special: 'Āgneya astra',
      waves: [{ at: 650, e: ['grunt', 'grunt', 'grunt'] }, { at: 1450, e: ['grunt', 'sword', 'archer', 'grunt'] }, { at: 2250, boss: 'tataka' }, { at: 3050, e: ['flyer', 'flyer', 'grunt', 'flyer'] }, { at: 3850, boss: 'subahu' }] },
    act_khara: { hero: 'rama_exile', style: 'archer', bg: 'forest', len: 4300, title: 'Janasthana', sub: 'Rama alone against fourteen thousand', special: 'Gandharva astra',
      waves: [{ at: 600, e: ['grunt', 'grunt', 'sword', 'grunt'] }, { at: 1350, e: ['sword', 'sword', 'archer', 'archer', 'grunt', 'grunt'] }, { at: 2100, e: ['brute', 'archer', 'sword', 'grunt', 'sword'] }, { at: 2900, e: ['brute', 'brute', 'archer', 'archer', 'sword'] }, { at: 3700, boss: 'khara' }] },
    act_jatayu: { hero: 'jatayu', style: 'flyer', bg: 'forest', len: W, title: 'The Sky over Panchavati', sub: 'Jatayu against the King of Lanka', special: 'Feather storm', sky: true,
      waves: [{ at: 0, boss: 'ravanaSky' }] },
    act_vali: { hero: 'sugriva', style: 'brawler', bg: 'kishkindha', len: W, title: 'Kishkindha', sub: 'Sugriva challenges Vali', special: 'Earth-shaking pound', timer: 45,
      waves: [{ at: 0, boss: 'vali' }] },
    act_vatika: { hero: 'hanuman', style: 'brawler', bg: 'lanka', len: 4200, title: 'Ashoka Vatika', sub: 'Hanuman tests the strength of Lanka', special: 'Mahima — grow mountain-tall',
      waves: [{ at: 600, e: ['grunt', 'grunt', 'sword', 'grunt'] }, { at: 1400, e: ['sword', 'brute', 'archer', 'grunt', 'sword'] }, { at: 2200, e: ['brute', 'brute', 'archer', 'archer', 'sword', 'grunt'] }, { at: 3200, boss: 'akshaya' }] },
    act_lanka: { hero: 'hanuman', style: 'brawler', bg: 'lanka', len: 6200, title: 'Lanka Dahan', sub: 'Set the golden city ablaze', special: 'Mahima — grow mountain-tall', runner: true, waves: [] },
    act_kumbha: { hero: 'rama_exile', style: 'archer', bg: 'battle', len: 2700, title: 'The Giant Awakes', sub: 'Kumbhakarna enters the battle', special: 'Aindra astra',
      waves: [{ at: 500, e: ['sword', 'brute', 'archer', 'archer', 'grunt'] }, { at: 1450, boss: 'kumbha' }] },
    act_ravana: { hero: 'rama_exile', style: 'archer', bg: 'battle', len: W, title: 'Rama and Ravana', sub: 'The final battle', special: 'Aindra astra',
      waves: [{ at: 0, boss: 'ravana' }] },
  };

  /* ---------- foes ---------- */
  const FOES = {
    grunt: { rig: 'rakA', hp: 4, speed: 140, dmg: 8, range: 80, wind: .5, scale: 1 },
    sword: { rig: 'rakB', hp: 5, speed: 185, dmg: 9, range: 88, wind: .38, scale: 1.05 },
    archer: { rig: 'rakC', hp: 3, speed: 130, dmg: 7, ai: 'archer', scale: 1 },
    brute: { rig: 'brute', hp: 14, speed: 90, dmg: 16, range: 125, wind: .8, scale: 1.45, armor: true },
    flyer: { hp: 3, speed: 210, dmg: 8, ai: 'flyer', scale: 1, demon: true, col: '#3a2050' },
  };

  const BOSSES = {
    tataka: { rig: 'tataka', name: 'Tataka', dev: 'ताटका', sub: 'The yakshi who laid the forest waste', hp: 46, scale: 2, speed: 130, dmg: 14,
      moves: ['dash', 'rocks', 'leap'], moves2: ['dash', 'rocks', 'leap', 'summon'], bark: 'Two little princes? The forest will swallow you!' },
    subahu: { demon: true, name: 'Subahu', dev: 'सुबाहु', sub: 'Son of Tataka, defiler of yajnas', hp: 34, scale: 2, speed: 200, dmg: 12, fly: true, col: '#5a1630', crown: true,
      moves: ['fireRain', 'swoop', 'fan'], moves2: ['fireRain', 'swoop', 'fan'], bark: 'Rain blood upon the sacred fire!' },
    maricha: { demon: true, name: 'Maricha', hp: 14, scale: 1.4, speed: 220, dmg: 9, fly: true, col: '#2e5a46', moves: ['swoop', 'fan'], moves2: ['swoop'], minor: true },
    khara: { rig: 'khara', name: 'Khara', dev: 'खर', sub: 'Commander of Janasthana', hp: 70, scale: 1.4, speed: 170, dmg: 14, armor: true,
      moves: ['dash', 'leap', 'combo'], moves2: ['dash', 'leap', 'combo', 'summonArchers'], bark: 'You maimed my sister. Now face her brother!' },
    ravanaSky: { chariot: true, name: 'Ravana', dev: 'रावण', sub: 'King of Lanka, fleeing with Sita', hp: 80, scale: 1, speed: 240, dmg: 12, fly: true,
      moves: ['arrowFan', 'chariotRam', 'arrowFan', 'summonFlyers'], moves2: ['arrowFan', 'chariotRam', 'summonFlyers'], bark: 'Old bird! Out of my way!' },
    vali: { rig: 'vali', name: 'Vali', dev: 'वाली', sub: 'King of Kishkindha, son of Indra', hp: 120, scale: 1.18, speed: 270, dmg: 11, immortal: true,
      moves: ['rush', 'leap', 'rocks'], moves2: ['rush', 'leap', 'rush'], bark: 'Again, little brother? Then fall again!' },
    akshaya: { rig: 'akshaya', name: 'Akshaya Kumara', dev: 'अक्षयकुमार', sub: 'Youngest son of Ravana', hp: 60, scale: 1.15, speed: 230, dmg: 12,
      moves: ['dash', 'combo', 'spear'], moves2: ['dash', 'combo', 'spear', 'summon'], bark: 'A monkey in my father\'s garden? I will teach you!' },
    kumbha: { rig: 'kumbha', name: 'Kumbhakarna', dev: 'कुम्भकर्ण', sub: 'The giant who sleeps for months', hp: 130, scale: 3.1, speed: 70, dmg: 18, armor: true,
      moves: ['stomp', 'sweep', 'boulders'], moves2: ['stomp', 'sweep', 'boulders', 'march'], bark: 'Who woke me…? Ah. Breakfast.' },
    ravana: { rig: 'ravana10', name: 'Ravana', dev: 'रावण', sub: 'Dashanana — the ten-headed', hp: 999, scale: 2.3, speed: 80, dmg: 16, armor: true,
      moves: ['sweep', 'arrowRain', 'fireWave', 'dash'], moves2: ['sweep', 'arrowRain', 'fireWave', 'summon'], bark: 'I lifted Kailasa. You are nothing, hermit.' },
  };

  /* =========================================================
     STATE HELPERS
     ========================================================= */
  function makeFigure(rigKey, x, y, scale = 1) {
    return { rig: RIG[rigKey], x, y, vx: 0, vy: 0, face: 1, scale, onG: true, flash: 0, at: 0, anim: 'idle', st: 0 };
  }

  function bodyRect(e) {
    if (e.demon) return { x: e.x - 30 * e.scale, y: e.y - 80 * e.scale, w: 60 * e.scale, h: 80 * e.scale };
    if (e.isChariot) return { x: e.x - 120, y: e.y - 180, w: 240, h: 200 };
    if (e.isBird) return { x: e.x - 40 * e.scale, y: e.y - 30 * e.scale, w: 90 * e.scale, h: 55 * e.scale };
    const w = 22 * e.scale, h = (e.rolling ? 70 : 150) * e.scale;
    return { x: e.x - w, y: e.y - h, w: w * 2, h };
  }
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const ptIn = (px, py, r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

  function say(e, text, dur = 2.2) { S.barks.push({ e, text, t: 0, dur }); }
  function float(text, x, y, col = '#fff3c4', size = 26) { S.texts.push({ text, x, y, col, size, t: 0 }); }
  function burst(x, y, col, n = 12, sp = 320) { for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(60, sp); S.fx.push({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, t: 0, life: rnd(.3, .7), r: rnd(2, 5), col }); } }
  function dust(x, y, n = 6) { for (let i = 0; i < n; i++) S.fx.push({ k: 'dust', x: x + rnd(-20, 20), y, vx: rnd(-90, 90), vy: rnd(-60, -10), t: 0, life: rnd(.4, .7), r: rnd(8, 16) }); }
  function shake(v) { S.shake = Math.max(S.shake, v); }
  function heal(n, msg) { const h = S.hero; if (h.hp >= h.max) return; h.hp = Math.min(h.max, h.hp + n); Sound.play('lotus'); float(`${msg} +${n}`, h.x, h.y - 170 * (h.scale || 1), '#9be3a4', 24); }

  function arena() { return S.lock || { l: 0, r: S.def.len }; }

  /* =========================================================
     COMBAT
     ========================================================= */
  function hurtFoe(e, dmg, dir, knock = 160, src) {
    if (e.dead || e.flung) return false;
    if (e.isBoss && S.bossVuln && !S.bossVuln(e, dmg, src)) return false;
    e.hp -= dmg; e.flash = .1;
    S.hitstop = Math.max(S.hitstop, dmg >= 3 ? .09 : .045);
    const r = bodyRect(e);
    burst(e.x, r.y + r.h * .4, dmg >= 3 ? '#ffd76a' : '#ff8a5a', dmg >= 3 ? 18 : 9);
    S.texts.push({ text: String(Math.round(dmg * 10)), x: e.x + rnd(-14, 14), y: r.y - 6, col: dmg >= 3 ? '#ffd76a' : '#fff', size: dmg >= 3 ? 30 : 22, t: 0, dmg: true });
    S.hero.meter = Math.min(100, S.hero.meter + dmg * 5);
    if (!e.armor && !e.isBoss) { e.vx = dir * knock; e.state = 'stun'; e.st = 0; if (knock > 300) { e.vy = -380; e.onG = false; } }
    else if (!e.isBoss && knock > 400) e.vx = dir * knock * .4;
    if (e.isBoss && e.def.immortal && e.hp < 1) { e.hp = 1; if (once(e, 'immTxt')) float('Vali shrugs off every blow!', e.x, r.y - 40, '#ffd0c0'); }
    if (e.hp <= 0) killFoe(e, dir);
    return true;
  }

  function killFoe(e, dir) {
    if (e.isBoss) return bossDown(e);
    e.dead = true; e.deadT = 0; e.vx = dir * 260; e.vy = -360; e.onG = false;
    S.hitstop = .08; S.kills++;
    // a lotus of healing sometimes blooms where a foe falls
    if (Math.random() < .3) S.pickups.push({ x: e.x, y: e.demon || S.def.sky ? clamp(e.y - 40, 120, GY - 30) : (e.roof ? e.roof.y : GY) - 26, t: 0 });
  }

  function hurtHero(dmg, dir) {
    const h = S.hero;
    if (h.inv > 0 || S.over || S.cine) return;
    dmg *= .85;
    if (h.giant) dmg *= .5;
    h.hp -= dmg; h.inv = 1; h.flash = .14; S.hitstop = .07; shake(.35); Sound.play('hit');
    burst(h.x, h.y - 80, '#ff5a3a', 12);
    if (!h.giant) { h.vx = dir * 380; if (!h.flying) { h.vy = -300; h.onG = false; } h.hurtT = .35; h.aiming = false; h.atk = null; }
    if (h.hp <= 0) { h.hp = 0; startCine({ kind: 'death', dur: 1.8, slow: .3, caption: S.def.hero.startsWith('rama') ? 'Rama falls back…' : 'The hero falls…' }); }
  }

  function meleeHit(owner, rect, dmg, knock, set, team) {
    if (team === 'hero') {
      for (const e of S.foes) {
        if (e.dead || e.flung || set.has(e)) continue;
        if (e.isBoss && e.def.rig === 'ravana10') continue;
        if (overlap(rect, bodyRect(e))) { set.add(e); hurtFoe(e, dmg, sgn(e.x - owner.x), knock); Sound.play('hit'); }
      }
      if (S.boss && S.boss.def.rig === 'ravana10' && !set.has('rv')) {
        ravanaHeadPos(S.boss).forEach((hp, i) => { if (!set.has('rv') && S.boss.heads[i].alive && ptIn(hp.x, hp.y, rect)) { set.add('rv'); hitRavanaHead(i, dmg); } });
      }
    } else {
      const h = S.hero;
      if (!set.has(h) && overlap(rect, bodyRect(h))) { set.add(h); hurtHero(dmg, sgn(h.x - owner.x)); }
    }
  }

  function shoot(o) { S.shots.push(Object.assign({ t: 0, life: 3, set: new Set(), r: 8 }, o)); }

  /* =========================================================
     HERO
     ========================================================= */
  function makeHero(def) {
    const style = def.style;
    let h;
    if (style === 'flyer') h = { isBird: true, x: 200, y: 340, vx: 0, vy: 0, face: 1, scale: 1, flying: true, flash: 0 };
    else h = makeFigure(def.hero, 40, GY, def.hero === 'hanuman' ? 1.12 : 1);
    Object.assign(h, { isHero: true, style, hp: 100, max: 100, meter: 0, inv: 0, cool: 0, dodgeCD: 0, hurtT: 0, charge: 0, aiming: false, atk: null, at: 0 });
    return h;
  }

  function nearestTarget(h, maxD = 1000) {
    let best = null, bd = maxD;
    const sx = h.x, sy = h.y - 110 * h.scale;
    if (S.boss && S.boss.def.rig === 'ravana10' && !S.boss.dead) {
      if (S.rv.phase === 2 && S.rv.open) { const n = navelPos(); return { x: n.x, y: n.y }; }
      ravanaHeadPos(S.boss).forEach((p, i) => { if (S.boss.heads[i].alive) { const d = Math.hypot(p.x - sx, p.y - sy); if (d < bd) { bd = d; best = p; } } });
    }
    // prefer foes in front; fall back to the nearest one behind
    let back = null, bb = maxD;
    for (const e of S.foes) {
      if (e.dead || e.flung || (e.isBoss && e.def.rig === 'ravana10')) continue;
      const r = bodyRect(e), cy = r.y + r.h * .45, d = Math.hypot(e.x - sx, cy - sy);
      if (sgn(e.x - h.x) !== h.face && Math.abs(e.x - h.x) > 40) { if (d < bb) { bb = d; back = { x: e.x, y: cy }; } continue; }
      if (d < bd) { bd = d; best = { x: e.x, y: cy }; }
    }
    return best || back;
  }

  function heroUpdate(dt) {
    const h = S.hero, ctl = !S.cine && !S.over;
    h.inv -= dt; h.cool -= dt; h.dodgeCD -= dt; h.flash -= dt; h.hurtT -= dt; h.at += dt;
    if (h.style === 'flyer') return flyerUpdate(h, dt, ctl);
    const L = ctl && held('left'), R = ctl && held('right');
    const ar = arena();
    // rolling
    if (h.rolling) {
      h.rollT += dt; h.vx = h.face * 720; h.rot = (h.rollT / .42) * Math.PI * 2; h.rotPivot = 50;
      if (h.rollT > .42) { h.rolling = false; h.rot = 0; }
    } else if (h.hurtT <= 0) {
      const busy = h.atk && h.atk.lock;
      const spd = (h.aiming ? 140 : h.giant ? 300 : 340) * (busy ? .15 : 1);
      const dir = S.cine && S.cine.kind === 'intro' ? (h.x < 260 ? 1 : 0) : (R ? 1 : 0) - (L ? 1 : 0);
      h.vx = lerp(h.vx, dir * spd, Math.min(1, dt * 14));
      if (dir && !h.aiming && !busy) h.face = dir;
      if (ctl && hit('jump') && h.onG && !busy) { h.vy = S.def.hero === 'hanuman' ? -1000 : -900; h.onG = false; dust(h.x, h.y); Sound.play('flip'); }
      if (ctl && hit('dodge') && h.onG && h.dodgeCD <= 0) { h.rolling = true; h.rollT = 0; h.inv = Math.max(h.inv, .42); h.dodgeCD = .7; h.aiming = false; h.atk = null; if (dir) h.face = dir; dust(h.x, h.y, 8); }
      if (ctl && hit('special') && h.meter >= 100) heroSpecial(h);
      if (h.style === 'archer') archerUpdate(h, dt, ctl);
      else brawlerUpdate(h, dt, ctl);
    } else h.vx *= .9;
    // physics
    h.vy += GRAV * dt; h.x += h.vx * dt; h.y += h.vy * dt;
    land(h, dt);
    h.x = clamp(h.x, ar.l + 30, ar.r - 30);
    if (S.def.runner && h.y > H + 120) {
      hurtHero(10, 1);
      // land him past the gap he fell into — it costs health, but never blocks progress
      const from = S.lastRoof || S.roofs[0], roof = S.roofs.find(r => r.x > from.x) || from;
      h.x = roof.x + 60; h.y = roof.y - 200; h.vy = 0; h.vx = 0; h.inv = 1.4; h.slamming = false; h.atk = null;
      if (h.hp > 0) float('Hanuman leaps back up!', h.x, h.y - 120, '#ffd76a');
    }
    // giant form
    if (h.giant) { h.giantT -= dt; if (h.giantT <= 0) { h.giant = false; float('Hanuman returns to his size', h.x, h.y - 200); } }
    h.scale = lerp(h.scale, h.giant ? 1.75 : S.def.hero === 'hanuman' ? 1.12 : 1, Math.min(1, dt * 6));
    // animation choice
    if (h.rolling) h.anim = 'roll';
    else if (h.hurtT > 0) h.anim = 'hurt';
    else if (h.atk) h.anim = h.atk.anim;
    else if (h.slamming) h.anim = 'slam';
    else if (h.aiming) h.anim = 'aim';
    else if (!h.onG) h.anim = 'jump';
    else if (Math.abs(h.vx) > 40) h.anim = 'run';
    else h.anim = 'idle';
  }

  function land(e) {
    const wasG = e.onG;
    e.onG = false;
    if (S.def.runner) {
      for (const r of S.roofs) {
        if (e.x > r.x && e.x < r.x + r.w && e.vy >= 0 && e.y >= r.y && e.y - e.vy * .02 <= r.y + 18) {
          e.y = r.y; e.vy = 0; e.onG = true;
          if (e.isHero) { S.lastRoof = r; if (!r.burning) { r.burning = true; S.burned++; Sound.play('fire'); float('Ablaze!', e.x, r.y - 160, '#ffb04a', 24); } }
          break;
        }
      }
    } else if (e.y >= GY) { e.y = GY; e.vy = 0; e.onG = true; }
    if (e.onG && !wasG && e.isHero) { dust(e.x, e.y, 5); if (e.slamming) heroSlamLand(e); }
  }

  function archerUpdate(h, dt, ctl) {
    if (h.recoil > 0) { h.recoil -= dt; }
    const aimTarget = () => {
      if (mouse.used) return { x: mouse.x + S.cam, y: mouse.y };
      return nearestTarget(h) || { x: h.x + h.face * 400, y: h.y - 110 };
    };
    // buffer presses made during the short cooldown so shooting never feels dropped
    if (ctl && hit('attack')) h.buf = .3;
    h.buf = (h.buf || 0) - dt;
    if (ctl && (h.buf > 0 || held('attack')) && h.cool <= 0 && !h.aiming) { h.aiming = true; h.charge = 0; h.buf = 0; }
    if (h.aiming) {
      h.charge += dt;
      const tg = aimTarget(), sx = h.x, sy = h.y - 112 * h.scale;
      if (Math.abs(tg.x - sx) > 6) h.face = sgn(tg.x - sx);
      let a = Math.atan2(sy - tg.y, Math.abs(tg.x - sx));
      a = clamp(a, -.5, 1.25); h.aimA = a; h.drawK = Math.min(1, .4 + h.charge / CHARGE * .6);
      if (!held('attack') || !ctl) {
        const big = h.charge >= CHARGE, dx = Math.cos(a) * h.face, dy = -Math.sin(a), sp = big ? 1900 : 1500;
        shoot({ k: big ? 'bigArrow' : 'arrow', team: 'hero', x: sx + dx * 40, y: sy + dy * 40, vx: dx * sp, vy: dy * sp, dmg: big ? 4 : 1.2, pierce: big, r: big ? 14 : 8 });
        Sound.play(big ? 'conch' : 'arrow');
        if (big) shake(.12);
        h.aiming = false; h.cool = .14; h.charge = 0;
      }
    }
  }

  function brawlerUpdate(h, dt, ctl) {
    const COMBO = [
      { anim: 'punch1', dur: .26, on: [.07, .16], dmg: 1.4, knock: 140, reach: 70 },
      { anim: 'punch2', dur: .26, on: [.07, .16], dmg: 1.4, knock: 140, reach: 70 },
      { anim: 'swing', dur: .44, on: [.16, .3], dmg: 3.2, knock: 560, reach: 118, swing: true },
    ];
    if (h.atk) {
      const a = h.atk; a.t += dt;
      if (a.swing) h.swingK = a.t / a.dur * 1.4;
      if (ctl && hit('attack') && a.t > .1 && a.i < 2) a.queued = true;
      if (a.t >= a.on[0] && a.t <= a.on[1]) {
        const s = h.scale, reach = a.reach * s;
        meleeHit(h, { x: h.face > 0 ? h.x : h.x - reach, y: h.y - 140 * s, w: reach, h: 120 * s }, a.dmg * (h.giant ? 2 : 1), a.knock, a.set, 'hero');
        if (a.swing && once(a, 'sfx')) { Sound.play('arrow'); S.fx.push({ k: 'slash', x: h.x + h.face * 50 * s, y: h.y - 90 * s, f: h.face, t: 0, life: .2, s }); }
      }
      if (a.t >= a.dur) {
        h.atk = null;
        if (a.queued) startCombo(h, COMBO, a.i + 1);
      }
      return;
    }
    if (h.slamming) return;
    if (ctl && hit('attack')) {
      if (!h.onG) { h.slamming = true; h.vy = 1500; h.vx *= .3; h.atk = null; h.anim = 'slam'; }
      else startCombo(h, COMBO, 0);
    }
  }
  function startCombo(h, C, i) { h.atk = Object.assign({ i, t: 0, set: new Set(), lock: true }, C[i]); h.vx = h.face * 160; Sound.play('flip'); }

  function heroSlamLand(h) {
    h.slamming = false; shake(.4); Sound.play('thunder'); dust(h.x, h.y, 16);
    S.fx.push({ k: 'ring', x: h.x, y: h.y, t: 0, life: .4, r: 190 * h.scale });
    const set = new Set();
    meleeHit(h, { x: h.x - 190 * h.scale, y: h.y - 120, w: 380 * h.scale, h: 140 }, 3 * (h.giant ? 2 : 1), 520, set, 'hero');
  }

  function heroSpecial(h) {
    h.meter = 0; S.flash = .5; S.slowT = .35; Sound.play('conch');
    const name = S.def.special;
    if (h.style === 'archer') {
      say(h, name + '!'); S.astra = { t: 0, n: 0 };
    } else if (S.def.hero === 'hanuman') {
      say(h, 'Jai Shri Ram!'); h.giant = true; h.giantT = 8; shake(.5);
    } else {
      say(h, 'For Kishkindha!'); h.vy = -1000; h.onG = false; h.slamming = true;
      S.fx.push({ k: 'ring', x: h.x, y: h.y, t: 0, life: .5, r: 500 });
      setTimeout(() => { if (S) { const set = new Set(); meleeHit(h, { x: h.x - 500, y: h.y - 160, w: 1000, h: 200 }, 6, 600, set, 'hero'); } }, 500);
    }
  }

  function flyerUpdate(h, dt, ctl) {
    const ar = arena();
    if (h.dive > 0) {
      h.dive -= dt;
      meleeHit(h, { x: h.face > 0 ? h.x : h.x - 110, y: h.y - 40, w: 110, h: 80 }, 2.5, 300, h.diveSet, 'hero');
      h.tilt = .25;
    } else if (h.rolling) {
      h.rollT += dt; h.rot = h.rollT / .35 * Math.PI * 2; if (h.rollT > .35) { h.rolling = false; h.rot = 0; }
    } else if (h.hurtT <= 0) {
      const ix = S.cine && S.cine.kind === 'intro' ? 1 : (ctl && held('right') ? 1 : 0) - (ctl && held('left') ? 1 : 0), iy = (ctl && (held('down')) ? 1 : 0) - (ctl && (held('up')) ? 1 : 0);
      h.vx = lerp(h.vx, ix * 460, Math.min(1, dt * 6)); h.vy = lerp(h.vy, iy * 400, Math.min(1, dt * 6));
      if (ix) h.face = ix;
      h.tilt = h.vy / 1800;
      if (ctl && hit('attack') && h.cool <= 0) { h.dive = .3; h.cool = .45; h.diveSet = new Set(); h.vx = h.face * 980; h.vy = iy * 300; Sound.play('arrow'); }
      if (ctl && hit('dodge') && h.dodgeCD <= 0) { h.rolling = true; h.rollT = 0; h.inv = .4; h.dodgeCD = .6; h.vx = (ix || h.face) * 700; }
      if (ctl && hit('special') && h.meter >= 100) {
        h.meter = 0; S.flash = .4; Sound.play('conch'); say(h, 'Feather storm!');
        for (let i = 0; i < 14; i++) { const a = (i / 13 - .5) * 1.4; shoot({ k: 'feather', team: 'hero', x: h.x, y: h.y, vx: Math.cos(a) * 900 * h.face, vy: Math.sin(a) * 900, dmg: 1.6, r: 12, a: Math.atan2(Math.sin(a), Math.cos(a) * h.face) }); }
      }
    } else { h.vx *= .92; h.vy *= .92; }
    h.x = clamp(h.x + h.vx * dt, ar.l + 50, ar.r - 50); h.y = clamp(h.y + h.vy * dt, 70, 600);
  }

  /* =========================================================
     FOES
     ========================================================= */
  function spawnFoe(type, side = 1, x = null, y = null) {
    const D = FOES[type], ar = arena();
    const sx = x != null ? x : side > 0 ? ar.r + rnd(40, 180) : ar.l - rnd(40, 180);
    let e;
    if (D.demon) e = { demon: true, x: sx, y: y != null ? y : rnd(220, 380), vx: 0, vy: 0, face: -side, scale: D.scale, col: D.col, flash: 0 };
    else e = makeFigure(D.rig, sx, y != null ? y : GY, D.scale);
    Object.assign(e, { def: D, type, hp: D.hp, max: D.hp, armor: D.armor, state: 'move', st: 0, cd: rnd(.3, 1.2), face: -side, ph: rnd(0, 6), hover: rnd(200, 360), entered: false });
    S.foes.push(e);
    return e;
  }

  function foeUpdate(e, dt) {
    const h = S.hero, D = e.def;
    e.flash -= dt; e.at += dt; e.st += dt; e.cd -= dt;
    if (e.dead) {
      e.deadT += dt; e.vy += GRAV * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= .96;
      if (!e.demon) { land(e); e.rot = -Math.min(1, e.deadT * 3) * Math.PI / 2; e.rotPivot = 0; if (e.onG) e.vx *= .8; }
      else e.rot = (e.rot || 0) + dt * 6;
      e.alpha = clamp(1.6 - e.deadT, 0, 1); e.anim = 'hurt';
      return;
    }
    const ar = arena();
    if (e.x > ar.l + 20 && e.x < ar.r - 20) e.entered = true;
    const dx = h.x - e.x, adx = Math.abs(dx);
    if (e.state === 'stun') {
      e.vx *= .9; if (e.st > .32) { e.state = 'move'; e.st = 0; }
    } else if (D.ai === 'flyer') {
      flyerAI(e, dt);
    } else if (D.ai === 'archer') {
      if (e.state === 'move') {
        e.face = sgn(dx);
        const want = adx < 360 ? -1 : adx > 560 ? 1 : 0;
        e.vx = lerp(e.vx, want * sgn(dx) * D.speed, Math.min(1, dt * 6));
        if (!e.entered) e.vx = -sgn(e.x - (ar.l + ar.r) / 2) * D.speed;
        if (e.cd <= 0 && e.entered) { e.state = 'wind'; e.st = 0; e.vx = 0; }
      } else if (e.state === 'wind') {
        e.face = sgn(dx); e.aiming = true; e.vx = 0;
        const sx = e.x, sy = e.y - 112 * e.scale;
        e.aimA = clamp(Math.atan2(sy - (h.y - 80 * (h.scale || 1)), adx), -.5, 1);
        e.drawK = Math.min(1, e.st / .7);
        if (e.st > .75) {
          const a = e.aimA;
          shoot({ k: 'eArrow', team: 'foe', x: sx + Math.cos(a) * 40 * e.face, y: sy - Math.sin(a) * 40, vx: Math.cos(a) * 760 * e.face, vy: -Math.sin(a) * 760, dmg: D.dmg, r: 8 });
          Sound.play('arrow'); e.aiming = false; e.state = 'rec'; e.st = 0;
        }
      } else if (e.st > .5) { e.state = 'move'; e.st = 0; e.cd = rnd(1.2, 2.2); }
    } else {
      // melee
      if (e.state === 'move') {
        e.face = sgn(dx);
        const range = D.range * e.scale;
        if (adx > range * .85) e.vx = lerp(e.vx, sgn(dx) * D.speed, Math.min(1, dt * 6));
        else { e.vx *= .8; if (e.cd <= 0 && Math.abs(h.y - e.y) < 120) { e.state = 'wind'; e.st = 0; e.tell = .3; } }
      } else if (e.state === 'wind') {
        e.vx *= .8;
        if (e.st > D.wind) { e.state = 'strike'; e.st = 0; e.set = new Set(); e.vx = e.face * 120; Sound.play('arrow'); }
      } else if (e.state === 'strike') {
        const reach = D.range * e.scale;
        meleeHit(e, { x: e.face > 0 ? e.x : e.x - reach, y: e.y - 130 * e.scale, w: reach, h: 120 * e.scale }, D.dmg, 0, e.set, 'foe');
        if (e.st > .18) { e.state = 'rec'; e.st = 0; }
      } else if (e.st > .45) { e.state = 'move'; e.st = 0; e.cd = rnd(.7, 1.6); }
    }
    if (!D.ai || D.ai === 'archer') {
      e.vy += GRAV * dt; e.x += e.vx * dt; e.y += e.vy * dt; land(e);
      if (S.def.runner && e.roof) e.x = clamp(e.x, e.roof.x + 20, e.roof.x + e.roof.w - 20);
      if (e.entered) e.x = clamp(e.x, ar.l + 20, ar.r - 20);
    }
    // separation
    for (const o of S.foes) if (o !== e && !o.dead && !o.isBoss && !o.demon && !e.demon && Math.abs(o.x - e.x) < 34) e.x += sgn(e.x - o.x || 1) * 40 * dt;
    e.tell -= dt;
    e.anim = e.state === 'stun' ? 'hurt' : e.state === 'wind' ? (D.ai === 'archer' ? 'aim' : 'windup') : e.state === 'strike' ? 'strike' : !e.onG ? 'jump' : Math.abs(e.vx) > 30 ? 'run' : 'idle';
    if (D.ai === 'archer' && e.state === 'wind') e.anim = 'aim';
  }

  function flyerAI(e, dt) {
    const h = S.hero, ar = arena();
    if (e.state === 'move') {
      const tx = clamp(h.x + Math.sin(S.t * .8 + e.ph) * 260, ar.l + 60, ar.r - 60), ty = (h.flying ? h.y - 160 : e.hover) + Math.sin(S.t * 2 + e.ph) * 30;
      e.vx = lerp(e.vx, clamp(tx - e.x, -1, 1) * e.def.speed, Math.min(1, dt * 3)); e.vy = lerp(e.vy, clamp(ty - e.y, -1, 1) * 180, Math.min(1, dt * 3));
      e.face = sgn(h.x - e.x);
      if (e.cd <= 0 && e.entered) { e.state = 'wind'; e.st = 0; e.tell = .4; }
    } else if (e.state === 'wind') {
      e.vx *= .9; e.vy = -60;
      if (e.st > .45) { e.state = 'strike'; e.st = 0; e.set = new Set(); const tx = h.x, ty = h.y - 60 * (h.scale || 1), L = Math.hypot(tx - e.x, ty - e.y) || 1; e.vx = (tx - e.x) / L * 700; e.vy = (ty - e.y) / L * 700; }
    } else if (e.state === 'strike') {
      meleeHit(e, bodyRect(e), e.def.dmg, 0, e.set, 'foe');
      if (e.st > .6 || e.y > GY - 20) { e.state = 'rec'; e.st = 0; }
    } else { e.vy = -220; e.vx *= .95; if (e.st > .6) { e.state = 'move'; e.cd = rnd(1, 2); } }
    e.x += e.vx * dt; e.y += e.vy * dt; e.y = Math.min(e.y, GY - 10);
  }

  /* =========================================================
     BOSSES
     ========================================================= */
  function spawnBoss(key) {
    const D = BOSSES[key], ar = arena();
    let b;
    if (D.demon) b = { demon: true, x: ar.r - 260, y: 260, vx: 0, vy: 0, scale: D.scale, col: D.col, crown: D.crown, flash: 0 };
    else if (D.chariot) b = { isChariot: true, x: ar.r - 250, y: 330, vx: 0, vy: 0, scale: 1, flash: 0 };
    else b = makeFigure(D.rig, ar.r - 220, GY, D.scale);
    Object.assign(b, { isBoss: true, def: D, key, hp: D.hp, max: D.hp, armor: true, face: -1, move: null, idleT: 1, st: 0, at: 0, last: '' });
    if (D.rig === 'ravana10') {
      b.heads = RAVANA_HEADS.map(() => ({ alive: true, hp: 2, regrow: 0, flash: 0 }));
      S.rv = { phase: 1, cut: 0, navel: 3, open: false, cyc: 0 };
    }
    S.foes.push(b);
    if (!D.minor) S.boss = b;
    return b;
  }

  function bossUpdate(b, dt) {
    const h = S.hero, D = b.def;
    b.flash -= dt; b.at += dt; b.tell -= dt;
    if (b.flung) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 300 * dt; b.rot = (b.rot || 0) + dt * 12; return; }
    if (b.dead) { b.deadT += dt; b.alpha = clamp(2 - b.deadT, 0, 1); if (!b.demon && !b.isChariot) { b.rot = -Math.min(1, b.deadT * 2) * Math.PI / 2; b.rotPivot = 0; } else { b.vy += 400 * dt; b.y += b.vy * dt; b.rot = (b.rot || 0) + dt * 2; } b.anim = 'hurt'; return; }
    if (S.cine && S.cine.freeze) return;
    const enraged = b.hp < b.max * .5 && !D.immortal;
    if (enraged && once(b, 'rage')) { say(b, b.key === 'ravana' ? '' : 'Enough!'); shake(.3); }
    if (D.rig === 'ravana10') ravanaTick(b, dt);
    if (!b.move) {
      b.idleT -= dt;
      approach(b, dt, D.fly ? 0 : 1);
      if (b.idleT <= 0) {
        const list = (enraged && D.moves2) ? D.moves2 : D.moves;
        let name; do name = list[Math.floor(Math.random() * list.length)]; while (name === b.last && list.length > 1);
        b.last = name; b.move = { name, t: 0, set: new Set() };
      }
    } else {
      b.move.t += dt;
      if (MOVES[b.move.name](b, b.move, dt)) { b.move = null; b.idleT = rnd(.5, 1.1) * (enraged ? .6 : 1); b.attacking = false; }
    }
    // physics
    if (!D.fly) {
      b.vy += GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt; land(b);
      const ar = arena(); b.x = clamp(b.x, ar.l + 40 * b.scale, ar.r - 40 * b.scale);
    } else {
      b.x += b.vx * dt; b.y += b.vy * dt;
      const ar = arena(); b.x = clamp(b.x, ar.l + (b.isChariot ? 160 : 80), ar.r - (b.isChariot ? 160 : 80)); b.y = clamp(b.y, b.isChariot ? 300 : 120, GY - 30);
    }
  }

  function approach(b, dt, ground) {
    const h = S.hero, D = b.def, dx = h.x - b.x;
    b.face = sgn(dx);
    if (ground) {
      const keep = D.rig === 'ravana10' || D.rig === 'kumbha' ? 380 : 160;
      b.vx = lerp(b.vx, Math.abs(dx) > keep ? sgn(dx) * D.speed * .7 : 0, Math.min(1, dt * 5));
      b.anim = Math.abs(b.vx) > 25 ? 'run' : 'idle';
    } else {
      const tx = h.x - sgn(dx) * 320 + Math.sin(S.t) * 120, ty = (h.flying ? h.y - 40 : 240) + Math.sin(S.t * 1.7) * 60;
      b.vx = lerp(b.vx, clamp((tx - b.x) / 120, -1, 1) * D.speed, Math.min(1, dt * 3));
      b.vy = lerp(b.vy, clamp((ty - b.y) / 80, -1, 1) * 200, Math.min(1, dt * 3));
    }
  }

  const MOVES = {
    dash(b, m, dt) {
      const D = b.def;
      if (m.t < .55) { b.anim = 'windup'; b.vx = 0; if (once(m, 'tell')) { b.tell = .5; b.face = sgn(S.hero.x - b.x); } return false; }
      b.anim = 'strike'; b.vx = b.face * (D.rig === 'tataka' ? 760 : 900); b.attacking = true;
      meleeHit(b, bodyRect(b), D.dmg, 0, m.set, 'foe');
      if (m.t % .08 < dt) dust(b.x, b.y, 2);
      const ar = arena();
      return m.t > 1.2 || b.x <= ar.l + 45 * b.scale || b.x >= ar.r - 45 * b.scale;
    },
    leap(b, m) {
      const h = S.hero;
      if (m.t < .4) { b.anim = 'crouch'; b.vx = 0; if (once(m, 'tell')) b.tell = .4; return false; }
      if (once(m, 'jump')) { b.vy = -1250; b.onG = false; b.vx = (h.x - b.x) / 1.05; b.face = sgn(h.x - b.x); }
      b.anim = b.onG ? 'crouch' : 'slam';
      if (b.onG && m.t > .6 && once(m, 'land')) {
        b.vx = 0; shake(.45); Sound.play('thunder'); dust(b.x, b.y, 14);
        for (const d of [-1, 1]) shoot({ k: 'wave', team: 'foe', x: b.x + d * 40, y: GY, vx: d * 560, vy: 0, dmg: b.def.dmg, hgt: 46 * Math.min(2, b.scale * .8 + .4), life: 1.8 });
      }
      return m.land && m.t > 1.4;
    },
    rocks(b, m) {
      b.vx = 0; b.face = sgn(S.hero.x - b.x);
      b.anim = m.t < .45 ? 'windup' : 'strike';
      for (const at of [.45, .8, 1.15]) if (m.t >= at && once(m, 'r' + at)) lob(b, S.hero.x + rnd(-60, 60), 'rock');
      if (m.t > .45 && m.t < 1.3) b.anim = Math.floor(m.t * 6) % 2 ? 'strike' : 'windup';
      return m.t > 1.5;
    },
    boulders(b, m) {
      b.vx = 0; b.face = sgn(S.hero.x - b.x);
      b.anim = m.t < .7 ? 'windup' : 'strike';
      if (m.t >= .7 && once(m, 'b')) { [-150, 0, 150].forEach((o, i) => lob(b, S.hero.x + o, 'boulder', 1.1 + i * .12)); shake(.2); }
      return m.t > 1.6;
    },
    combo(b, m, dt) {
      const h = S.hero, D = b.def, reach = 110 * b.scale;
      if (!m.close) {
        b.face = sgn(h.x - b.x); b.vx = b.face * D.speed * 1.3; b.anim = 'run';
        if (Math.abs(h.x - b.x) < reach * .8 || m.t > 1.4) { m.close = true; m.t0 = m.t; b.vx = 0; }
        return false;
      }
      const k = m.t - m.t0, i = Math.floor(k / .38), ph = k - i * .38;
      if (i >= 3) return true;
      b.anim = ph < .2 ? 'windup' : 'strike';
      if (ph < .2 && once(m, 'tell' + i)) { b.tell = .2; b.face = sgn(h.x - b.x); }
      if (ph >= .2 && ph < .3) { if (once(m, 's' + i)) { m.set = new Set(); Sound.play('arrow'); b.vx = b.face * 140; } meleeHit(b, { x: b.face > 0 ? b.x : b.x - reach, y: b.y - 140 * b.scale, w: reach, h: 130 * b.scale }, D.dmg * .8, 0, m.set, 'foe'); }
      else b.vx *= .8;
      return false;
    },
    rush(b, m, dt) { return MOVES.combo(b, m, dt); },
    spear(b, m) {
      b.vx = 0; b.face = sgn(S.hero.x - b.x); b.anim = m.t < .5 ? 'windup' : 'strike';
      if (m.t < .5 && once(m, 'tell')) b.tell = .5;
      if (m.t >= .5 && once(m, 's')) { const y = b.y - 100 * b.scale; shoot({ k: 'spear', team: 'foe', x: b.x + b.face * 40, y, vx: b.face * 1050, vy: 0, dmg: b.def.dmg, r: 12 }); Sound.play('arrow'); }
      return m.t > .9;
    },
    summon(b, m) {
      b.vx = 0; b.anim = 'roar';
      if (m.t > .4 && once(m, 's')) { say(b, 'Rakshasas — to me!', 1.6); spawnFoe('grunt', 1); spawnFoe(Math.random() < .5 ? 'sword' : 'grunt', -1); Sound.play('conch'); shake(.2); }
      return m.t > 1.1;
    },
    summonArchers(b, m) {
      b.vx = 0; b.anim = 'roar';
      if (m.t > .4 && once(m, 's')) { say(b, 'Archers!', 1.4); spawnFoe('archer', 1); spawnFoe('archer', -1); }
      return m.t > 1.1;
    },
    summonFlyers(b, m) {
      b.vx *= .9; b.vy *= .9;
      if (m.t > .3 && once(m, 's')) { spawnFoe('flyer', 1, null, rnd(150, 300)); spawnFoe('flyer', -1, null, rnd(300, 500)); }
      return m.t > .9;
    },
    stomp(b, m) {
      b.vx = 0; b.anim = m.t < .75 ? 'stomp' : 'idle';
      if (m.t < .75 && once(m, 'tell')) b.tell = .7;
      if (m.t >= .75 && once(m, 'hit')) {
        shake(.7); Sound.play('thunder'); dust(b.x, b.y, 20);
        for (const d of [-1, 1]) shoot({ k: 'wave', team: 'foe', x: b.x + d * 60, y: GY, vx: d * 620, vy: 0, dmg: b.def.dmg, hgt: 70, life: 2.2 });
      }
      return m.t > 1.4;
    },
    sweep(b, m) {
      const reach = Math.min(150 * b.scale, 400);
      b.vx = 0; b.face = sgn(S.hero.x - b.x);
      if (m.t < .8) { b.anim = 'windup'; if (once(m, 'tell')) { b.tell = .8; S.warn = { x: b.face > 0 ? b.x : b.x - reach, w: reach, t: .8 }; } return false; }
      b.anim = 'sweep';
      if (m.t < 1.0) meleeHit(b, { x: b.face > 0 ? b.x : b.x - reach, y: GY - 62, w: reach, h: 62 }, b.def.dmg, 0, m.set, 'foe');
      if (once(m, 'sfx')) { Sound.play('arrow'); S.fx.push({ k: 'slash', x: b.x + b.face * reach * .6, y: GY - 40, f: b.face, t: 0, life: .25, s: b.scale * .9 }); shake(.25); }
      return m.t > 1.5;
    },
    march(b, m, dt) {
      b.face = sgn(S.hero.x - b.x); b.vx = b.face * 240; b.anim = 'run';
      meleeHit(b, bodyRect(b), b.def.dmg * .7, 0, m.set, 'foe');
      if (m.t % .25 < dt) { shake(.15); dust(b.x, b.y, 3); }
      return m.t > 1.8;
    },
    fireRain(b, m) {
      b.vx *= .9; b.vy *= .9; b.anim = 'roar';
      for (let i = 0; i < 6; i++) { const at = .2 + i * .22; if (m.t >= at && once(m, 'f' + i)) meteor(S.hero.x + rnd(-260, 260)); }
      return m.t > 1.8;
    },
    arrowRain(b, m) {
      b.vx = 0; b.anim = 'roar';
      for (let i = 0; i < 8; i++) { const at = .3 + i * .16; if (m.t >= at && once(m, 'f' + i)) meteor(S.hero.x + rnd(-300, 300), 'fireArrow'); }
      return m.t > 1.8;
    },
    fireWave(b, m) {
      b.vx = 0; b.anim = m.t < .6 ? 'windup' : 'strike';
      if (m.t < .6 && once(m, 'tell')) b.tell = .6;
      if (m.t >= .6 && once(m, 'w')) { shake(.4); Sound.play('fire'); shoot({ k: 'wave', team: 'foe', x: b.x + b.face * 80, y: GY, vx: b.face * 600, vy: 0, dmg: b.def.dmg, hgt: 56, life: 2.2, fire: true }); }
      if (m.t >= 1.0 && once(m, 'w2')) shoot({ k: 'wave', team: 'foe', x: b.x + b.face * 80, y: GY, vx: b.face * 480, vy: 0, dmg: b.def.dmg, hgt: 56, life: 2.6, fire: true });
      return m.t > 1.5;
    },
    swoop(b, m) {
      const h = S.hero;
      if (m.t < .45) { b.vx *= .9; b.vy = -80; if (once(m, 'tell')) b.tell = .45; return false; }
      if (once(m, 'go')) { const L = Math.hypot(h.x - b.x, h.y - 60 - b.y) || 1; b.vx = (h.x - b.x) / L * 760; b.vy = (h.y - 60 - b.y) / L * 760; }
      meleeHit(b, bodyRect(b), b.def.dmg, 0, m.set, 'foe');
      if (m.t > 1.1) { b.vy = -260; return m.t > 1.5; }
      return false;
    },
    fan(b, m) {
      b.vx *= .9; b.vy *= .9;
      if (m.t > .5 && once(m, 'f')) {
        const h = S.hero, a0 = Math.atan2(h.y - 70 - b.y, h.x - b.x);
        for (let i = -2; i <= 2; i++) { const a = a0 + i * .2; shoot({ k: 'fireball', team: 'foe', x: b.x, y: b.y - 40, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, dmg: b.def.dmg * .8, r: 16 }); }
        Sound.play('fire');
      }
      if (m.t < .5 && once(m, 'tell')) b.tell = .5;
      return m.t > 1;
    },
    arrowFan(b, m) {
      b.vx *= .9; b.vy *= .9; b.attacking = m.t > .5 && m.t < .8;
      if (m.t < .5 && once(m, 'tell')) b.tell = .5;
      if (m.t > .5 && once(m, 'f')) {
        const h = S.hero, a0 = Math.atan2(h.y - (b.y - 120), h.x - b.x);
        for (let i = -2; i <= 2; i++) { const a = a0 + i * .14; shoot({ k: 'eArrow', team: 'foe', x: b.x, y: b.y - 120, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, dmg: b.def.dmg * .8, r: 8 }); }
        Sound.play('arrow');
      }
      return m.t > 1.1;
    },
    chariotRam(b, m) {
      const h = S.hero;
      if (m.t < .6) { b.vx *= .9; b.vy *= .9; if (once(m, 'tell')) { b.tell = .6; say(b, 'Chandrahasa!', 1.2); } return false; }
      if (once(m, 'go')) { const L = Math.hypot(h.x - b.x, h.y + 60 - b.y) || 1; b.vx = (h.x - b.x) / L * 820; b.vy = (h.y + 60 - b.y) / L * 820; }
      b.attacking = true;
      meleeHit(b, { x: b.x - 140, y: b.y - 200, w: 280, h: 200 }, b.def.dmg, 0, m.set, 'foe');
      return m.t > 1.3;
    },
  };

  function lob(b, tx, kind, T = 1) {
    const sy = b.y - 150 * b.scale, sx = b.x + b.face * 30 * b.scale, g = 1400;
    shoot({ k: kind, team: 'foe', x: sx, y: sy, vx: (tx - sx) / T, vy: (GY - 20 - sy - .5 * g * T * T) / T, grav: g, dmg: b.def.dmg * (kind === 'boulder' ? 1 : .8), r: kind === 'boulder' ? 32 : 18, spin: rnd(-6, 6) });
  }
  function meteor(x, k = 'meteor') { S.warns.push({ x, t: 0, life: .7 }); setTimeout(() => { if (S) shoot({ k, team: 'foe', x: x - 120, y: -40, vx: 180, vy: 900, dmg: 12, r: 18, grav: 0 }); }, 700 / (S ? S.timeScale : 1)); }

  /* ---------- Ravana's heads & navel ---------- */
  function navelPos() { const b = S.boss, J = b.J; return J ? { x: J.hip.x, y: J.hip.y - 20 * b.scale } : { x: b.x, y: b.y - 150 }; }
  function hitRavanaHead(i, dmg) {
    const hd = S.boss.heads[i]; hd.hp -= dmg; hd.flash = .1; S.hitstop = .05;
    const p = ravanaHeadPos(S.boss)[i]; burst(p.x, p.y, '#ff5a3a', 10);
    if (hd.hp <= 0) {
      hd.alive = false; hd.regrow = 5.5; S.rv.cut++; Sound.play('hit');
      S.fx.push({ k: 'head', x: p.x, y: p.y, vx: rnd(-200, 200), vy: -300, t: 0, life: 1.2, i, s: RAVANA_HEADS[i][2] * .42 * S.boss.scale });
      if (S.rv.phase === 1 && S.rv.cut >= 10) {
        S.rv.phase = 2; S.rv.cyc = 0;
        startCine({ kind: 'tip', dur: 2.8, freeze: true, caption: 'Vibhishana: "The amṛta is in his navel! Charge a full arrow and strike when it glows!"', who: 'vibhishana' });
      } else if (S.rv.cut <= 3) float('The head grows back…', p.x, p.y - 50, '#ffb0a0', 22);
    }
  }
  function ravanaTick(b, dt) {
    for (const hd of b.heads) { hd.flash -= dt; if (!hd.alive) { hd.regrow -= dt; if (hd.regrow <= 0) { hd.alive = true; hd.hp = 2; } } }
    if (S.rv.phase === 2) { S.rv.cyc += dt; S.rv.open = (S.rv.cyc % 4) > 2.4; }
  }

  function bossDown(b) {
    if (b.def.minor && b.key === 'maricha') {
      b.flung = true; b.vx = 1600 * (b.x > S.hero.x ? 1 : -1); b.vy = -600; S.hitstop = .12;
      startCine({ kind: 'mini', dur: 1.6, slow: .35, caption: 'The Mānava astra hurls Maricha a hundred yojanas into the sea!' });
      checkBossWave(); return;
    }
    b.dead = true; b.deadT = 0; b.vy = -200;
    S.foes.forEach(e => { if (!e.isBoss && !e.dead) killFoe(e, sgn(e.x - b.x)); });
    const caps = {
      tataka: 'Tataka falls, and the forest breathes again.', subahu: 'Subahu falls to the Āgneya astra. The yajna is complete!',
      khara: 'Khara falls. The army of Janasthana is no more.', akshaya: 'Akshaya Kumara falls. Lanka trembles at a single vanara.',
      kumbha: 'The giant falls — the earth shakes for miles.', ravana: 'The Brahmastra strikes true. Ravana falls.',
    };
    Sound.play('thunder');
    startCine({ kind: 'defeat', dur: 2.6, slow: .25, caption: caps[b.key] || '', then: () => checkBossWave() });
  }

  function checkBossWave() {
    const live = S.foes.some(e => e.isBoss && !e.dead && !e.flung);
    if (!live) { S.boss = null; S.waveActive = false; S.lock = null; if (S.wi >= S.def.waves.length) S.cleared = true; }
  }

  /* =========================================================
     PROJECTILES
     ========================================================= */
  function shotsUpdate(dt) {
    const h = S.hero;
    for (const o of S.shots) {
      o.t += dt;
      if (o.grav) o.vy += o.grav * dt;
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (o.t > o.life || o.x < S.cam - 300 || o.x > S.cam + W + 300 || o.y > H + 60) o.dead = true;
      if (o.dead) continue;
      if (o.k === 'wave') {
        if (o.team === 'foe' && Math.abs(h.x - o.x) < 34 && h.y > GY - o.hgt && !h.flying) { if (!o.set.has(h)) { o.set.add(h); hurtHero(o.dmg, sgn(o.vx)); } }
        if (o.t % .05 < dt) dust(o.x, GY, 1);
        continue;
      }
      if ((o.k === 'rock' || o.k === 'boulder' || o.k === 'meteor' || o.k === 'fireArrow') && o.y >= GY - 6 && !S.def.sky) {
        o.dead = true; dust(o.x, GY, o.k === 'boulder' ? 12 : 6); if (o.k === 'boulder') shake(.2);
        if (Math.abs(h.x - o.x) < o.r + 30 && h.y > GY - 60) hurtHero(o.dmg, sgn(h.x - o.x));
        continue;
      }
      if (o.team === 'hero') {
        // Ravana's heads and navel
        if (S.boss && S.boss.heads && !S.boss.dead) {
          const b = S.boss;
          if (S.rv.phase === 2) {
            const n = navelPos();
            if (Math.hypot(o.x - n.x, o.y - n.y) < 46) {
              o.dead = true;
              if (S.rv.open && o.k === 'bigArrow') {
                S.rv.navel--; S.hitstop = .15; shake(.5); burst(n.x, n.y, '#fff3c4', 40); Sound.play('bell');
                float(S.rv.navel > 0 ? `The amṛta drains! (${S.rv.navel} more)` : '', n.x, n.y - 60, '#ffd76a', 30);
                S.rv.cyc = 0; S.rv.open = false;
                if (S.rv.navel <= 0) bossDown(b);
              } else { burst(n.x, n.y, '#cfd6dc', 6); float(S.rv.open ? 'Only a fully charged arrow!' : 'Shielded — wait for the glow', n.x, n.y - 50, '#ffd0c0', 22); }
              continue;
            }
          }
          let hitHead = false;
          ravanaHeadPos(b).forEach((p, i) => {
            if (hitHead || !b.heads[i].alive || o.set.has('h' + i)) return;
            if (Math.hypot(o.x - p.x, o.y - p.y) < p.r + o.r) { o.set.add('h' + i); hitRavanaHead(i, o.dmg); hitHead = true; if (!o.pierce) o.dead = true; }
          });
          if (o.dead) continue;
          if (ptIn(o.x, o.y, bodyRect(b)) && !o.set.has(b)) { o.set.add(b); burst(o.x, o.y, '#cfd6dc', 5); if (!o.pierce) { o.dead = true; continue; } }
        }
        for (const e of S.foes) {
          if (e.dead || e.flung || o.set.has(e) || (e.heads)) continue;
          const r = bodyRect(e);
          if (o.x + o.r > r.x && o.x - o.r < r.x + r.w && o.y + o.r > r.y && o.y - o.r < r.y + r.h) {
            o.set.add(e); hurtFoe(e, o.dmg, sgn(o.vx), o.k === 'bigArrow' ? 420 : 140, o);
            Sound.play('hit');
            if (!o.pierce) { o.dead = true; break; }
          }
        }
        // shoot down projectiles
        if (!o.dead) for (const p of S.shots) if (p.team === 'foe' && !p.dead && p.k !== 'wave' && Math.hypot(p.x - o.x, p.y - o.y) < p.r + o.r) { p.dead = true; burst(p.x, p.y, '#ff9a3a', 8); if (!o.pierce) o.dead = true; break; }
      } else if (o.team === 'foe') {
        if (ptIn(o.x, o.y, inflate(bodyRect(h), o.r * .6))) { o.dead = true; hurtHero(o.dmg, sgn(o.vx)); }
      }
    }
    S.shots = S.shots.filter(o => !o.dead);
  }
  const inflate = (r, k) => ({ x: r.x - k, y: r.y - k, w: r.w + 2 * k, h: r.h + 2 * k });

  function drawShot(o) {
    ctx.save(); ctx.translate(o.x, o.y);
    const a = Math.atan2(o.vy, o.vx);
    switch (o.k) {
      case 'arrow': case 'bigArrow': case 'eArrow': case 'astra': case 'fireArrow': {
        ctx.rotate(a);
        const big = o.k === 'bigArrow' || o.k === 'astra', fire = o.k === 'astra' || o.k === 'fireArrow', len = big ? 110 : 70;
        if (big || fire) { ctx.shadowColor = fire ? '#ff8a2a' : '#ffd76a'; ctx.shadowBlur = 22; }
        ctx.strokeStyle = o.k === 'eArrow' ? '#2a1a10' : big ? '#fff1a8' : '#5e3a12'; ctx.lineWidth = big ? 5 : 3;
        ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
        ctx.fillStyle = big ? '#fff7d0' : '#d9dde2'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -7); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = o.k === 'eArrow' ? '#3a0a0a' : '#b8321f'; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(-len - 12, -8); ctx.lineTo(-len + 12, 0); ctx.lineTo(-len - 12, 8); ctx.closePath(); ctx.fill();
        if (fire) { ctx.fillStyle = 'rgba(255,150,40,.8)'; ctx.beginPath(); ctx.ellipse(4, 0, 16, 7, 0, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'feather': ctx.rotate(a); ctx.fillStyle = '#7d5230'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.stroke(); break;
      case 'spear': ctx.rotate(a); ctx.strokeStyle = '#5e3a12'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(0, 0); ctx.stroke(); ctx.fillStyle = '#d9e2ea'; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill(); break;
      case 'fireball': case 'meteor': {
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, o.r * 1.6);
        g.addColorStop(0, '#fff3c4'); g.addColorStop(.45, '#f2a12b'); g.addColorStop(1, 'rgba(200,50,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, o.r * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(240,120,40,.5)'; ctx.lineWidth = o.r; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-o.vx * .05, -o.vy * .05); ctx.stroke();
        break;
      }
      case 'rock': case 'boulder':
        ctx.rotate(o.t * (o.spin || 4)); ctx.fillStyle = o.k === 'boulder' ? '#6a625a' : '#8a8278'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
        ctx.beginPath(); for (let i = 0; i < 8; i++) { const aa = i / 8 * Math.PI * 2, rr = o.r * (i % 2 ? .85 : 1.05); ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); break;
      case 'wave': {
        const hgt = o.hgt, d = sgn(o.vx), col = o.fire ? 'rgba(255,120,30,' : 'rgba(255,220,140,';
        ctx.fillStyle = col + '.75)'; ctx.beginPath(); ctx.moveTo(-d * 30, 0); ctx.quadraticCurveTo(d * 10, -hgt * 1.3, d * 30, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = col + '.35)'; ctx.beginPath(); ctx.moveTo(-d * 70, 0); ctx.quadraticCurveTo(-d * 10, -hgt * .9, d * 10, 0); ctx.closePath(); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }

  /* =========================================================
     WAVES, RUNNER LEVEL, CINEMATICS
     ========================================================= */
  function wavesUpdate() {
    const def = S.def, h = S.hero;
    if (S.waveActive) {
      const alive = S.foes.some(e => !e.dead && !e.flung);
      if (!alive && !S.cine) {
        S.waveActive = false; S.lock = null; S.foes = S.foes.filter(e => !e.dead || e.deadT < 2);
        if (S.wi < def.waves.length) { S.go = 2.5; Sound.play('bell'); heal(20, 'Strength returns'); }
        else S.cleared = true;
      }
      return;
    }
    if (S.wi < def.waves.length && h.x >= def.waves[S.wi].at - (def.len === W ? 9999 : 0)) {
      const wv = def.waves[S.wi++];
      const l = clamp(Math.min(h.x - 300, wv.at - 300), 0, def.len - W);
      S.lock = { l, r: l + W }; S.waveActive = true; S.go = 0;
      if (wv.boss) {
        const b = spawnBoss(wv.boss);
        if (wv.boss === 'subahu') spawnBoss('maricha').x = S.lock.l + 300;
        startCine({ kind: 'boss', dur: 2.4, freeze: true, boss: b });
        if (b.def.bark) say(b, b.def.bark, 2.6);
        Sound.play('conch');
      } else wv.e.forEach((t, i) => { const e = spawnFoe(t, i % 3 === 2 ? -1 : 1); if (FOES[t].demon) e.x = S.lock.l + rnd(200, 1100), e.y = -60 - i * 50; });
    }
  }

  function buildRunner() {
    S.roofs = []; let x = -100;
    S.roofs.push({ x, y: 540, w: 700 }); x += 700;
    while (x < S.def.len - 600) {
      const gap = rnd(100, 175), w = rnd(280, 460), y = clamp(S.roofs[S.roofs.length - 1].y + rnd(-70, 70), 400, 580);
      x += gap; S.roofs.push({ x, y, w }); x += w;
    }
    S.roofs.push({ x: x + 150, y: 520, w: 900 });
    S.roofs.forEach((r, i) => {
      if (i < 2 || i > S.roofs.length - 2) return;
      if (Math.random() < .55) { const e = spawnFoe(Math.random() < .5 ? 'archer' : 'sword', 1, r.x + r.w * rnd(.4, .8), r.y); e.roof = r; e.entered = true; }
    });
    S.burned = 0; S.totalRoofs = S.roofs.length;
  }

  function startCine(c) { S.cine = Object.assign({ t: 0 }, c); }
  function cineUpdate(dtReal) {
    const c = S.cine; if (!c) return;
    c.t += dtReal;
    if (c.kind === 'intro') { const h = S.hero; if (!h.flying) { h.vx = 260; h.face = 1; } else { h.vx = 300; h.face = 1; } }
    if (c.t >= c.dur) {
      S.cine = null;
      if (c.kind === 'intro') { S.hero.vx = 0; S.fightT = 1; S.started = true; Sound.play('bell'); }
      if (c.kind === 'death') return finish(false, S.def.hero.startsWith('rama') ? 'Rama is driven back. Steady your aim — and rise again!' : 'Defeated — but a true warrior rises again. Try once more!');
      if (c.then) c.then();
    }
  }

  /* =========================================================
     MAIN UPDATE
     ========================================================= */
  function update(dtReal) {
    const def = S.def;
    if (S.paused) return;
    cineUpdate(dtReal);
    if (!S) return;
    S.slowT -= dtReal;
    let ts = S.cine && S.cine.slow ? S.cine.slow : S.slowT > 0 ? .45 : 1;
    S.timeScale = ts;
    if (S.hitstop > 0) { S.hitstop -= dtReal; return; }
    const dt = dtReal * ts;
    S.t += dt;
    const frozen = S.cine && S.cine.freeze;
    if (!frozen || S.cine.kind === 'intro') heroUpdate(dt);
    if (!frozen) {
      for (const e of S.foes) (e.isBoss ? bossUpdate : foeUpdate)(e, dt);
      shotsUpdate(dt);
      wavesUpdate();
    }
    // astra rain
    if (S.astra) {
      S.astra.t += dt;
      while (S.astra.n < 26 && S.astra.t > S.astra.n * .05) {
        S.astra.n++;
        const x = S.cam + rnd(80, W - 80);
        shoot({ k: 'astra', team: 'hero', x: x - 200, y: -60, vx: 360, vy: 1500, dmg: 2.4, r: 14, pierce: true });
      }
      if (S.astra.n >= 26) S.astra = null;
    }
    // timers & win conditions
    if (def.timer && !S.cine && S.started && S.boss && !S.over) {
      S.timer -= dt;
      if (S.timer <= 0) {
        S.timer = 0; const b = S.boss;
        S.fx.push({ k: 'bolt', x0: S.cam - 50, y0: b.y - 200, x1: b.x, y1: b.y - 110 * b.scale, t: 0, life: .6 });
        b.dead = true; b.deadT = 0; Sound.play('thunder'); shake(.6); S.flash = .6;
        startCine({ kind: 'defeat', dur: 3, slow: .25, caption: 'From behind a tree, Rama\'s arrow flies. Vali falls — and Sugriva is king.', then: () => finish(true) });
      }
    }
    if (def.key === 'act_jatayu' && S.boss && !S.boss.dead && S.boss.hp <= S.boss.max * .3 && !S.cine && once(S, 'jatEnd')) {
      S.boss.attacking = true; S.flash = .5; shake(.6); Sound.play('thunder');
      startCine({ kind: 'defeat', dur: 3.4, slow: .3, caption: 'Jatayu shattered Ravana\'s bow and chariot — until Chandrahasa cut his wings. His courage bought Rama the truth.', then: () => finish(true) });
    }
    if (def.runner && S.hero.x > def.len - 380 && !S.over && !S.cine) {
      startCine({ kind: 'defeat', dur: 2.6, slow: .5, caption: `Lanka burns! ${S.burned} rooftops ablaze. Hanuman cools his tail in the sea.`, then: () => finish(true) });
      S.over = true;
    }
    if (S.cleared && !S.over && !S.cine && !def.runner) { S.over = true; finish(true); }
    // camera
    const h = S.hero, ar = S.lock;
    let target = ar ? ar.l : clamp(h.x - W * .38, 0, def.len - W);
    if (!ar && S.wi < def.waves.length) target = Math.min(target, Math.max(0, def.waves[S.wi].at - 300));
    S.cam = lerp(S.cam, target, Math.min(1, dtReal * 5));
    S.shake = Math.max(0, S.shake - dtReal); S.flash = Math.max(0, S.flash - dtReal * 1.5); S.go -= dtReal;
    if (S.fightT) S.fightT -= dtReal;
    S.letter = lerp(S.letter, S.cine && S.cine.kind !== 'mini' ? 1 : 0, Math.min(1, dtReal * 6));
    // effects
    for (const p of S.fx) { p.t += dt; if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'p' || p.k === 'head') p.vy += 700 * dt; } }
    S.fx = S.fx.filter(p => p.t < p.life);
    S.texts.forEach(t => (t.t += dtReal)); S.texts = S.texts.filter(t => t.t < 1.4);
    S.barks.forEach(b => (b.t += dtReal)); S.barks = S.barks.filter(b => b.t < b.dur);
    if (S.warn) { S.warn.t -= dt; if (S.warn.t <= 0) S.warn = null; }
    for (const p of S.pickups) {
      p.t += dt;
      const hy = h.flying ? h.y : h.y - 60 * h.scale;
      if (Math.hypot(p.x - h.x, p.y - hy) < 70) { p.got = true; heal(15, 'Lotus'); }
    }
    S.pickups = S.pickups.filter(p => !p.got && p.t < 12);
    S.warns.forEach(w => (w.t += dt)); S.warns = S.warns.filter(w => w.t < w.life);
  }

  /* =========================================================
     RENDER
     ========================================================= */
  const THEME = {
    ashram: { ground: '#9a8a54', edge: '#6a5a2a', mid: '#4f7a3f', tuft: '#4a7a3a' },
    forest: { ground: '#7a9a4a', edge: '#4a6a2a', mid: '#2f5d2a', tuft: '#3a6a2a' },
    kishkindha: { ground: '#b08a5a', edge: '#7a5a2a', mid: '#9a5a2a', tuft: '#6a8a3a' },
    lanka: { ground: '#3a3a2a', edge: '#1a1a10', mid: '#8a6a2a', tuft: '#2a4a2a' },
    battle: { ground: '#7a4a2a', edge: '#4a2612', mid: '#4a1a14', tuft: '#5a3a1a' },
  };

  function drawWorld() {
    const def = S.def, th = THEME[def.bg], cam = S.cam;
    // far layer: the painted scene, mirrored tiles for a seamless pan
    const img = bgImg(def.bg);
    if (ready(img)) {
      const travel = Math.max(0, def.len - W) * .1, k = Math.max(1, (W + travel) / (H * 1540 / 848));
      const dw = H * k * 1540 / 848, dh = H * k;
      ctx.drawImage(img, 30, 26, 1540, 848, -cam * .1, H - dh, dw, dh);
    }
    if (def.sky) {
      ctx.fillStyle = 'rgba(255,240,210,.25)'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) { const x = ((i * 280 - S.t * 60) % 1680 + 1680) % 1680 - 200; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(x, 120 + (i * 83) % 260, 110, 26, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#2f5d2a'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      for (let i = -1; i < 12; i++) { const x = ((i * 130 - S.t * 120) % 1560 + 1560) % 1560 - 140; ctx.beginPath(); ctx.arc(x, 690, 90, Math.PI, 0); ctx.fill(); ctx.stroke(); }
      return;
    }
    // mid silhouettes
    ctx.save(); ctx.fillStyle = th.mid; ctx.globalAlpha = .55;
    const m = cam * .55;
    for (let i = Math.floor(m / 240) - 1; i < Math.floor(m / 240) + 8; i++) {
      const x = i * 240 - m, hgt = 120 + ((i * 7919) % 5) * 30;
      if (def.bg === 'lanka') { ctx.fillRect(x + 40, GY - hgt - 60, 90, hgt + 60); ctx.beginPath(); ctx.moveTo(x + 30, GY - hgt - 60); ctx.lineTo(x + 85, GY - hgt - 130); ctx.lineTo(x + 140, GY - hgt - 60); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(x + 120, GY - hgt * .6, hgt * .7, Math.PI, 0); ctx.fill(); ctx.fillRect(x + 112, GY - hgt * .6, 16, hgt * .6); }
    }
    ctx.restore();
    if (def.runner) return drawRoofs();
    // ground
    ctx.fillStyle = th.ground; ctx.fillRect(0, GY, W, H - GY);
    ctx.fillStyle = th.edge; ctx.fillRect(0, GY, W, 6);
    ctx.strokeStyle = th.edge; ctx.lineWidth = 2;
    for (let i = Math.floor(cam / 90) - 1; i < Math.floor(cam / 90) + 16; i++) {
      const x = i * 90 - cam; ctx.beginPath(); ctx.moveTo(x, GY + 24 + (i % 3) * 22); ctx.lineTo(x + 40, GY + 24 + (i % 3) * 22); ctx.stroke();
      ctx.fillStyle = th.tuft; ctx.beginPath(); ctx.moveTo(x + 10, GY + 2); ctx.lineTo(x + 16, GY - 12); ctx.lineTo(x + 20, GY + 2); ctx.lineTo(x + 26, GY - 9); ctx.lineTo(x + 30, GY + 2); ctx.fill();
    }
  }

  function drawRoofs() {
    const cam = S.cam;
    for (const r of S.roofs) {
      const x = r.x - cam; if (x > W + 50 || x + r.w < -50) continue;
      ctx.fillStyle = '#4a3a5a'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.fillRect(x, r.y, r.w, H - r.y); ctx.strokeRect(x, r.y, r.w, H - r.y);
      ctx.fillStyle = r.burning ? '#f2a12b' : '#2a1e3a';
      for (let wx = x + 30; wx < x + r.w - 40; wx += 70) { ctx.beginPath(); ctx.moveTo(wx, H); ctx.lineTo(wx, r.y + 60); ctx.quadraticCurveTo(wx + 18, r.y + 36, wx + 36, r.y + 60); ctx.lineTo(wx + 36, H); ctx.fill(); }
      ctx.fillStyle = GOLD; ctx.fillRect(x - 8, r.y - 12, r.w + 16, 16); ctx.strokeRect(x - 8, r.y - 12, r.w + 16, 16);
      if (r.burning) for (let k = 0; k < r.w / 60; k++) if (Math.random() < .5) S.fx.push({ k: 'fire', x: r.x + rnd(0, r.w), y: r.y - 10, vx: rnd(-20, 20), vy: rnd(-180, -80), t: 0, life: rnd(.4, .8), r: rnd(10, 20) });
    }
  }

  function drawEntity(e) {
    if (e.isHero && e.inv > 0 && !e.rolling && Math.floor(S.t * 20) % 2 && !S.cine) return;
    // ground shadow
    if (!e.flying && !e.demon && !e.isChariot && !S.def.runner) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(e.x, GY + 4, 30 * e.scale, 7 * e.scale, 0, 0, Math.PI * 2); ctx.fill(); }
    if (e.isBird) drawJatayu(e);
    else if (e.demon) drawDemon(e);
    else if (e.isChariot) drawChariot(e);
    else { e.pose = (POSE[e.anim] || POSE.idle)(e.at, e); drawFigure(e); }
    if (e.tell > 0 && !e.dead) { const r = bodyRect(e); ctx.save(); ctx.font = `700 ${34}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ff3b2f'; ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 4; ctx.strokeText('!', e.x, r.y - 14); ctx.fillText('!', e.x, r.y - 14); ctx.restore(); }
    if (!e.isBoss && !e.isHero && !e.dead && e.hp < e.max) { const r = bodyRect(e); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - 24, r.y - 12, 48, 5); ctx.fillStyle = '#e8661c'; ctx.fillRect(e.x - 24, r.y - 12, 48 * Math.max(0, e.hp / e.max), 5); }
  }

  function render() {
    ctx.save(); ctx.clearRect(0, 0, W, H);
    if (S.shake > 0) ctx.translate(rnd(-1, 1) * S.shake * 22, rnd(-1, 1) * S.shake * 22);
    drawWorld();
    ctx.save(); ctx.translate(-S.cam, 0);
    // warnings
    for (const w of S.warns) { ctx.strokeStyle = `rgba(255,60,40,${.8 - w.t})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(w.x, GY + 2, 40 + w.t * 30, 10, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (S.warn) { ctx.fillStyle = `rgba(255,60,40,${.25 + Math.sin(S.t * 30) * .1})`; ctx.fillRect(S.warn.x, GY - 62, S.warn.w, 62); }
    const list = S.foes.slice().sort((a, b) => (b.isBoss ? 1 : 0) - (a.isBoss ? 1 : 0));
    for (const p of S.pickups) drawLotus(p.x, p.y + Math.sin(p.t * 3) * 4, p.t > 9 ? (Math.floor(p.t * 8) % 2 ? .3 : 1) : 1);
    for (const e of list) drawEntity(e);
    drawEntity(S.hero);
    for (const o of S.shots) drawShot(o);
    for (const p of S.fx) drawFx(p);
    for (const t of S.texts) { ctx.globalAlpha = Math.min(1, (1.4 - t.t) * 2); label(t.text, t.x, t.y - t.t * (t.dmg ? 60 : 30), t.size, t.col); }
    ctx.globalAlpha = 1;
    for (const b of S.barks) drawBark(b);
    ctx.restore();
    if (S.flash > 0) { ctx.fillStyle = `rgba(255,250,230,${Math.min(.9, S.flash)})`; ctx.fillRect(-30, -30, W + 60, H + 60); }
    ctx.restore();
    drawHUD();
  }

  function drawFx(p) {
    const k = 1 - p.t / p.life;
    if (p.k === 'p') { ctx.globalAlpha = k; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    else if (p.k === 'dust') { ctx.globalAlpha = k * .5; ctx.fillStyle = '#e9dcc0'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.5 - k * .5), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    else if (p.k === 'fire') { ctx.globalAlpha = k; ctx.fillStyle = k > .6 ? '#fff3c4' : k > .3 ? '#f2a12b' : '#c0391b'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * k, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    else if (p.k === 'ring') { ctx.strokeStyle = `rgba(255,230,150,${k})`; ctx.lineWidth = 8 * k; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * (1 - k * .7), p.r * .22 * (1 - k * .7), 0, 0, Math.PI * 2); ctx.stroke(); }
    else if (p.k === 'slash') { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.f * p.s, p.s); ctx.strokeStyle = `rgba(255,246,220,${k})`; ctx.lineWidth = 10 * k; ctx.beginPath(); ctx.arc(-20, 0, 70, -1.2, 1.1); ctx.stroke(); ctx.restore(); }
    else if (p.k === 'head') { const img = rhImg(p.i % 5); if (ready(img)) { ctx.save(); ctx.globalAlpha = k; ctx.translate(p.x, p.y); ctx.rotate(p.t * 6); ctx.drawImage(img, -50 * p.s, -80 * p.s, 100 * p.s, 162 * p.s); ctx.restore(); } }
    else if (p.k === 'bolt') { ctx.save(); ctx.strokeStyle = '#fff3b0'; ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 30; ctx.lineWidth = 6; const q = Math.min(1, p.t / .25); ctx.beginPath(); ctx.moveTo(p.x0, p.y0); ctx.lineTo(lerp(p.x0, p.x1, q), lerp(p.y0, p.y1, q)); ctx.stroke(); ctx.restore(); }
  }

  function drawLotus(x, y, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34); g.addColorStop(0, 'rgba(255,240,200,.7)'); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.fillStyle = '#f2a3b5';
    for (const r of [-.9, -.45, 0, .45, .9]) { ctx.save(); ctx.rotate(r); ctx.beginPath(); ctx.moveTo(0, 8); ctx.quadraticCurveTo(-9, -6, 0, -18); ctx.quadraticCurveTo(9, -6, 0, 8); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = '#2f6b3a'; ctx.beginPath(); ctx.ellipse(0, 10, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBark(b) {
    const e = b.e; if (!b.text) return;
    const r = bodyRect(e), x = clamp(e.x, S.cam + 160, S.cam + W - 160), y = Math.max(90, r.y - 40);
    ctx.save(); ctx.font = `700 22px ${SERIF}`;
    const w = Math.min(420, ctx.measureText(b.text).width + 30);
    ctx.globalAlpha = Math.min(1, (b.dur - b.t) * 3, b.t * 6);
    ctx.fillStyle = '#fff8e6'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - 46, w, 40, 12) : ctx.rect(x - w / 2, y - 46, w, 40); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 8, y - 7); ctx.lineTo(x, y + 6); ctx.lineTo(x + 8, y - 7); ctx.fill();
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(b.text, x, y - 19, w - 20);
    ctx.restore();
  }

  function label(text, x, y, size = 22, color = '#fff3c4', font = SERIF) {
    if (!text) return;
    ctx.save(); ctx.font = `700 ${size}px ${font}`; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(30,10,5,.9)';
    ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
  }

  function bar(x, y, w, h, k, col, back = 'rgba(20,8,4,.75)') {
    ctx.fillStyle = back; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(k, 0, 1), h);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
  }

  function drawHUD() {
    const h = S.hero, def = S.def;
    // letterbox
    const lb = S.letter * 78;
    if (lb > 1) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, lb); ctx.fillRect(0, H - lb, W, lb); }
    const c = S.cine;
    if (c) {
      if (c.kind === 'intro') {
        const a = Math.min(1, c.t * 2, (c.dur - c.t) * 2);
        ctx.globalAlpha = a;
        label(def.title, W / 2, 300, 72, '#ffe9a8', DISPLAY);
        label(def.sub, W / 2, 352, 30, '#fff3c4');
        ctx.globalAlpha = 1;
      } else if (c.kind === 'boss') {
        const b = c.boss, a = Math.min(1, c.t * 3), sl = Math.min(1, c.t * 4);
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(120,20,10,.75)'; ctx.fillRect(0, 250 - 4, W * sl, 150);
        ctx.fillStyle = GOLD; ctx.fillRect(0, 246, W * sl, 4); ctx.fillRect(0, 396, W * sl, 4);
        label(b.def.dev || '', W / 2, 296, 34, '#f6d77e', DEVA);
        label(b.def.name.toUpperCase(), W / 2, 356, 70 + Math.max(0, .3 - c.t) * 100, '#fff3c4', DISPLAY);
        label(b.def.sub, W / 2, 388, 24, '#ffd9b0');
        ctx.restore();
        if (c.t < .1) shake(.4);
      } else if (c.caption) {
        const a = Math.min(1, c.t * 3);
        ctx.globalAlpha = a; ctx.save(); ctx.font = `600 italic 28px ${SERIF}`; ctx.textAlign = 'center';
        wrap(c.caption, 1000).forEach((l, i, arr) => label(l, W / 2, H - (c.kind === 'mini' ? 70 : 40) - (arr.length - 1 - i) * 34, 28, '#fff3c4'));
        ctx.restore(); ctx.globalAlpha = 1;
      }
      if (c.kind !== 'mini' && c.kind !== 'tip') return;
    }
    // hero panel
    const name = { rama_young: 'Rama', rama_exile: 'Rama', hanuman: 'Hanuman', sugriva: 'Sugriva', jatayu: 'Jatayu' }[def.hero];
    ctx.fillStyle = 'rgba(17,22,58,.78)'; ctx.fillRect(16, 14, 330, 78); ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.strokeRect(16, 14, 330, 78);
    label(name, 70, 44, 24, '#ffe9a8', DISPLAY);
    bar(126, 26, 204, 16, h.hp / h.max, h.hp < 30 ? '#e83a2a' : '#4fbf6a');
    bar(126, 56, 204, 10, h.meter / 100, h.meter >= 100 ? `hsl(45,100%,${55 + Math.sin(S.t * 10) * 15}%)` : '#d4a017');
    ctx.font = `600 15px ${SERIF}`; ctx.fillStyle = h.meter >= 100 ? '#ffe9a8' : '#c9b98a'; ctx.textAlign = 'left';
    ctx.fillText((h.meter >= 100 ? 'K — ' : '') + def.special, 126, 86);
    // objective
    let obj = '';
    if (def.runner) obj = `Rooftops ablaze: ${S.burned} · Run east to the sea!`;
    else if (def.timer && S.boss) obj = `Hold Vali off until Rama's arrow: ${Math.ceil(S.timer)}s`;
    else if (S.boss && S.boss.heads) obj = S.rv.phase === 1 ? `Sever the heads: ${Math.min(10, S.rv.cut)}/10` : `Strike the amṛta with charged arrows: ${S.rv.navel} left`;
    else if (def.key === 'act_jatayu') obj = 'Strike Ravana\'s chariot!';
    else if (S.boss && !S.boss.dead) obj = `Defeat ${S.boss.def.name}`;
    else if (S.waveActive) obj = `Defeat the rakshasas: ${S.foes.filter(e => !e.dead && !e.isBoss && !e.flung).length} left`;
    else if (S.wi < def.waves.length) obj = 'Press on →';
    if (obj) { ctx.font = `700 22px ${SERIF}`; const w = ctx.measureText(obj).width + 40; ctx.fillStyle = 'rgba(246,231,200,.94)'; ctx.fillRect(W / 2 - w / 2, 16, w, 38); ctx.strokeStyle = GOLD; ctx.strokeRect(W / 2 - w / 2, 16, w, 38); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(obj, W / 2, 42); }
    // boss bar
    if (S.boss && !S.boss.dead && !(c && c.kind === 'boss')) {
      const b = S.boss, k = b.heads ? (S.rv.phase === 1 ? 1 - Math.min(10, S.rv.cut) / 10 * .5 : S.rv.navel / 3 * .5) : b.hp / b.max;
      label(b.def.name, W / 2, H - 50, 24, '#ffe9a8', DISPLAY);
      bar(W / 2 - 330, H - 38, 660, 16, k, '#c0391b');
    }
    if (S.go > 0 && Math.floor(S.go * 4) % 2) label('GO ➜', W - 120, H / 2, 54, '#ffe9a8', DISPLAY);
    if (S.fightT > 0) label(def.runner ? 'RUN!' : 'FIGHT!', W / 2, H / 2, 96 + (1 - S.fightT) * 30, '#ffe9a8', DISPLAY);
    // controls hint
    if (S.t < 9 && !S.cine) {
      const tip = { archer: 'A/D move · W/Space jump · J or click: shoot (hold = charged arrow) · K astra · L roll · aim with mouse', brawler: 'A/D move · W/Space jump · J or click: combo (in air = slam) · K special · L roll', flyer: 'WASD / arrows fly · J dive-strike · K feather storm · L barrel roll' }[h.style];
      ctx.globalAlpha = Math.min(1, (9 - S.t)); label(tip, W / 2, H - 90, 20, '#fff3c4'); ctx.globalAlpha = 1;
    }
    if (S.paused) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); label('Paused', W / 2, H / 2, 64, '#ffe9a8', DISPLAY); label('Press Esc or P to continue', W / 2, H / 2 + 50, 24); }
  }

  function wrap(text, maxW) {
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t; }
    lines.push(line); return lines;
  }

  /* =========================================================
     RUNTIME
     ========================================================= */
  function bindOnce() {
    if (bound) return; bound = true;
    cv = document.getElementById('game'); ctx = cv.getContext('2d');
    window.addEventListener('keydown', e => {
      if (!S) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'Escape' || e.code === 'KeyP') { if (!e.repeat) S.paused = !S.paused; return; }
      keys[e.code] = true;
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    cv.addEventListener('pointermove', e => { if (!S) return; const p = pos(e); mouse.x = p.x; mouse.y = p.y; if (e.pointerType === 'mouse') mouse.used = true; });
    cv.addEventListener('pointerdown', e => { if (!S) return; const p = pos(e); mouse.x = p.x; mouse.y = p.y; if (e.pointerType === 'mouse') { mouse.used = true; keys.Mouse = true; } else keys.Mouse = true; });
    window.addEventListener('pointerup', () => { keys.Mouse = false; });
    // touch pad
    padEl = document.createElement('div'); padEl.id = 'pad';
    padEl.innerHTML = `<div class="pad-l"><button data-k="ArrowLeft">◀</button><button data-k="ArrowRight">▶</button><button data-k="ArrowDown" class="fly">▼</button></div>
      <div class="pad-r"><button data-k="ShiftLeft">⤳</button><button data-k="KeyK">✦</button><button data-k="Space">▲</button><button data-k="KeyJ" class="big">⚔</button></div>`;
    document.getElementById('stage').appendChild(padEl);
    padEl.querySelectorAll('button').forEach(b => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', e => { e.preventDefault(); keys[k] = true; if (k === 'Space') keys.ArrowUp = true; });
      const up = () => { keys[k] = false; if (k === 'Space') keys.ArrowUp = false; };
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    });
  }

  function preload(def) {
    const keysNeeded = new Set();
    const addRig = k => { if (RIG[k]) keysNeeded.add(RIG[k].head); };
    addRig(def.hero); ['rakA', 'rakB', 'rakC', 'brute'].forEach(addRig);
    def.waves.forEach(w => { if (w.boss) { const D = BOSSES[w.boss]; if (D.rig) addRig(D.rig); if (D.chariot) { addRig('ravana'); addRig('sita'); } } });
    const imgs = [bgImg(def.bg)];
    keysNeeded.forEach(k => { if (k === 'ravana10') for (let i = 0; i < 5; i++) imgs.push(rhImg(i)); else imgs.push(headImg(k)); });
    return Promise.all(imgs.map(im => new Promise(res => { if (ready(im)) return res(); im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); setTimeout(res, 4000); })));
  }

  function start(id) {
    bindOnce();
    const def = Object.assign({ key: id }, STAGES[id]);
    return new Promise(resolve => {
      resolveFn = resolve;
      preload(def).then(() => {
        for (const k in keys) keys[k] = false;
        mouse.used = false;
        S = { def, t: 0, cam: 0, foes: [], shots: [], fx: [], pickups: [], texts: [], barks: [], warns: [], warn: null, wi: 0, lock: null, waveActive: false, boss: null,
          shake: 0, flash: 0, hitstop: 0, slowT: 0, letter: 1, timeScale: 1, go: 0, kills: 0, timer: def.timer || 0, cleared: false, over: false, paused: false };
        S.hero = makeHero(def);
        if (def.style === 'flyer') S.hero.x = -100;
        ravanaFig = makeFigure('ravana', 0, 0, 1); sitaFig = makeFigure('sita', 0, 0, .9);
        if (def.runner) { buildRunner(); S.hero.y = 540; S.hero.fireTail = true; }
        startCine({ kind: 'intro', dur: 2.4, freeze: true });
        Sound.play('conch');
        Controls.show('2d-' + def.style);
        cv.classList.add('show');
        document.body.classList.add('action-on');
        padEl.classList.toggle('flyer', def.style === 'flyer');
        last = performance.now();
        const frame = now => {
          if (!S) return;
          const dt = Math.min(.05, (now - last) / 1000); last = now;
          update(dt);
          if (!S) return;
          render();
          if (!(S.hitstop > 0) && !S.paused) for (const k in keys) prevKeys[k] = keys[k];
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      });
    });
  }

  function finish(win, msg) {
    if (!S || S.finished) return;
    S.finished = true; S.over = true;
    Sound.play(win ? 'win' : 'lose');
    setTimeout(() => { const r = resolveFn; stop(); r && r({ win, msg }); }, win ? 900 : 500);
  }

  function stop() {
    cancelAnimationFrame(raf); S = null; resolveFn = null;
    if (cv) { cv.classList.remove('show'); ctx.clearRect(0, 0, W, H); }
    document.body.classList.remove('action-on');
    Controls.hide();
    for (const k in keys) keys[k] = false;
  }

  return { start, stop, has: id => !!STAGES[id], get active() { return !!S; }, _state: () => S };
})();
