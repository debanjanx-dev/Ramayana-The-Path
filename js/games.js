'use strict';
/* =========================================================
   MINI-GAMES — one canvas, many small games.
   Each game: imgs(), init(G), update(G,dt), draw(G,ctx),
   and optional down/move/up/key handlers.
   ========================================================= */
const Games = (() => {
  const W = 1280, H = 720;
  let cv, ctx, hudEl, cur = null, raf = 0, last = 0;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const irnd = n => Math.floor(Math.random() * n);
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ready = img => img && img.complete && img.naturalWidth > 0;
  const drawImg = (img, x, y, w, h) => { if (ready(img)) ctx.drawImage(img, x, y, w, h); };
  const DEVA = '"Tiro Devanagari Hindi", "Kohinoor Devanagari", "Devanagari Sangam MN", serif';
  const SERIF = '"Cormorant Garamond", Georgia, serif';

  /* ---------- shared drawing ---------- */
  function drawArrow(x, y, ang, len = 90, glow = false) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (glow) { ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 28; }
    ctx.strokeStyle = glow ? '#ffe9a0' : '#5e3a12'; ctx.lineWidth = glow ? 6 : 3;
    ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = glow ? '#fff7d0' : '#d9dde2';
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -7); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b8321f';
    ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(-len - 12, -8); ctx.lineTo(-len + 12, 0); ctx.lineTo(-len - 12, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawBow(x, y, ang, loaded, pull = 1, glow = false) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.lineCap = 'round';
    const path = () => { ctx.beginPath(); ctx.moveTo(-4, -80); ctx.quadraticCurveTo(62, 0, -4, 80); };
    ctx.strokeStyle = '#3e220f'; ctx.lineWidth = 11; path(); ctx.stroke();
    ctx.strokeStyle = '#9a5d27'; ctx.lineWidth = 5; path(); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.fillRect(22, -13, 11, 26);
    const sx = -4 - pull * 36;
    ctx.strokeStyle = '#f3ead2'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-4, -80); ctx.lineTo(sx, 0); ctx.lineTo(-4, 80); ctx.stroke();
    if (loaded) drawArrow(sx + 122, 0, 0, 122, glow);
    ctx.restore();
  }

  function crosshair(x, y, c = '#fff3c4') {
    ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.globalAlpha = .8;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.moveTo(x - 24, y); ctx.lineTo(x - 8, y); ctx.moveTo(x + 8, y); ctx.lineTo(x + 24, y);
    ctx.moveTo(x, y - 24); ctx.lineTo(x, y - 8); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 24); ctx.stroke(); ctx.restore();
  }

  function drawDemon(x, y, s, t, kind, hurt) {
    const body = kind === 'subahu' ? '#5a1630' : kind === 'maricha' ? '#2e5a46' : '#3a2050';
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    const flap = Math.sin(t * 10) * 10;
    for (const m of [1, -1]) {
      ctx.save(); ctx.scale(m, 1);
      ctx.fillStyle = '#1e1028';
      ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(-62, -32 - flap); ctx.lineTo(-50, -8); ctx.lineTo(-68, 6 - flap / 2);
      ctx.lineTo(-42, 12); ctx.lineTo(-52, 30); ctx.lineTo(-12, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = hurt ? '#fff' : body;
    ctx.beginPath(); ctx.moveTo(-22, -6); ctx.quadraticCurveTo(0, -30, 22, -6); ctx.lineTo(18, 30); ctx.lineTo(8, 24);
    ctx.lineTo(0, 38); ctx.lineTo(-8, 24); ctx.lineTo(-18, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-19, 12); ctx.lineTo(19, 12); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.fillStyle = '#e9dcc0';
    for (const m of [1, -1]) {
      ctx.beginPath(); ctx.moveTo(-10 * m, -38); ctx.quadraticCurveTo(-26 * m, -52, -20 * m, -66); ctx.quadraticCurveTo(-12 * m, -50, -3 * m, -42);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = hurt ? '#fff' : body;
    ctx.beginPath(); ctx.arc(0, -26, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#120b08';
    ctx.beginPath(); ctx.moveTo(-17, -30); ctx.quadraticCurveTo(-20, -48, 0, -45); ctx.quadraticCurveTo(20, -48, 17, -30); ctx.quadraticCurveTo(0, -38, -17, -30); ctx.fill();
    ctx.fillStyle = '#ff3b2f';
    ctx.beginPath(); ctx.ellipse(-6, -27, 4.2, 2.6, .35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -27, 4.2, 2.6, -.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(-7, -17); ctx.lineTo(-4, -10); ctx.lineTo(-2, -17); ctx.moveTo(2, -17); ctx.lineTo(4, -10); ctx.lineTo(7, -17); ctx.fill();
    if (kind === 'subahu') {
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(-14, -42); ctx.lineTo(-10, -56); ctx.lineTo(-4, -46); ctx.lineTo(0, -60); ctx.lineTo(4, -46);
      ctx.lineTo(10, -56); ctx.lineTo(14, -42); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function drawFire(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.fillStyle = '#9a4a2a';
    ctx.beginPath(); ctx.moveTo(-74, 0); ctx.lineTo(-58, -40); ctx.lineTo(58, -40); ctx.lineTo(74, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#6a2a14';
    ctx.beginPath(); ctx.moveTo(-66, -14); ctx.lineTo(66, -14); ctx.moveTo(-62, -27); ctx.lineTo(62, -27); ctx.stroke();
    const cols = ['#e8661c', '#f2a12b', '#f6d77e', '#fff6d8'];
    cols.forEach((c, i) => {
      const sc = 1 - i * .22, h = (120 + Math.sin(t * 9 + i) * 16) * sc, w = 52 * sc, sw = Math.sin(t * 7 + i) * 9;
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-w, -38);
      ctx.quadraticCurveTo(-w * 1.15, -38 - h * .6, sw, -38 - h); ctx.quadraticCurveTo(w * 1.15, -38 - h * .6, w, -38);
      ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }

  function drawBush(x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    [[-48, 6, 34, '#2f5d2a'], [48, 6, 34, '#2f5d2a'], [-22, -16, 38, '#3a6e30'], [24, -14, 36, '#3a6e30'], [0, 8, 40, '#2f5d2a']].forEach(([a, b, r, c]) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(a, b, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = '#5a9a44';
    for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(-50 + (i * 37) % 100, -20 + (i * 23) % 36, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function rockPts(r) {
    const pts = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; pts.push([Math.cos(a) * r * rnd(.8, 1.08), Math.sin(a) * r * .72 * rnd(.82, 1.08)]); }
    return pts;
  }
  function drawRock(x, y, pts, named, glow, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha;
    if (named && glow) { ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 18 + Math.sin(glow * 5) * 6; }
    ctx.fillStyle = named ? '#9a9488' : '#76726c'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(-8, -8, 14, 6, -.3, 0, Math.PI * 2); ctx.fill();
    if (named) {
      ctx.fillStyle = '#f6d77e'; ctx.strokeStyle = '#6a2a14'; ctx.lineWidth = 3;
      ctx.font = `bold 22px ${DEVA}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText('राम', 0, 2); ctx.fillText('राम', 0, 2);
    }
    ctx.restore();
  }

  function drawSquirrel(x, y, blessed, t) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-34, -6, -30, -30); ctx.quadraticCurveTo(-18, -40, -14, -22); ctx.quadraticCurveTo(-16, -10, -6, -4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -2, 15, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(15, -8, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(18, -10, 1.6, 0, Math.PI * 2); ctx.fill();
    const k = Math.sin(t * 20) * 3;
    ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(-8 + k, 11); ctx.moveTo(8, 6); ctx.lineTo(10 - k, 11); ctx.stroke();
    if (blessed) { ctx.strokeStyle = '#fff6dc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(12, -6); ctx.moveTo(-12, -2); ctx.lineTo(13, -2); ctx.moveTo(-11, 2); ctx.lineTo(11, 2); ctx.stroke(); }
    ctx.restore();
  }

  function drawDiya(x, y, lit, t, k) {
    ctx.save(); ctx.translate(x, y);
    if (lit) {
      const g = ctx.createRadialGradient(0, -14, 2, 0, -14, 46);
      g.addColorStop(0, 'rgba(255,214,120,.55)'); g.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -14, 46, 0, Math.PI * 2); ctx.fill();
      const f = Math.sin(t * 14 + k) * 1.8;
      ctx.fillStyle = '#f2a12b'; ctx.beginPath(); ctx.moveTo(-5, -6); ctx.quadraticCurveTo(-6 + f, -20, 0 + f, -28); ctx.quadraticCurveTo(6 + f, -20, 5, -6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.ellipse(f * .5, -12, 2.4, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = lit ? '#b8642d' : '#7a4a2a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-18, -6); ctx.quadraticCurveTo(0, 14, 18, -6); ctx.lineTo(24, -9); ctx.lineTo(16, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = lit ? '#f2c14e' : '#5a3a1e'; ctx.beginPath(); ctx.moveTo(-14, -3); ctx.quadraticCurveTo(0, 8, 14, -3); ctx.stroke();
    ctx.restore();
  }

  function drawOrnament(k) {
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = GOLD; ctx.fillStyle = GOLD;
    const ruby = '#b3122e', em = '#1f7a4a';
    const dot = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    switch (k) {
      case 'nupura':
        ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(0, 0, 48, 22, 0, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 11; i++) { const a = Math.PI * (.05 + i * .09); const x = Math.cos(a) * 48, y = Math.sin(a) * 22 + 8; dot(x, y, 6, GOLD); dot(x, y + 2, 2, INK); }
        break;
      case 'haar':
        ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -40, 50, Math.PI * .12, Math.PI * .88); ctx.stroke();
        for (let i = 0; i <= 14; i++) { const a = Math.PI * (.1 + i * .057); dot(Math.cos(a) * 60, -40 + Math.sin(a) * 60, 4.4, '#f8f2e4'); }
        ctx.fillStyle = ruby; ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(12, 32); ctx.lineTo(0, 50); ctx.lineTo(-12, 32); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case 'kundala':
        ctx.lineWidth = 6;
        for (const x of [-28, 28]) { ctx.beginPath(); ctx.arc(x, -6, 20, 0, Math.PI * 2); ctx.stroke(); dot(x, 24, 7, ruby); dot(x, 36, 4, '#f8f2e4'); }
        break;
      case 'kankana':
        [[-18, GOLD], [0, ruby], [18, em]].forEach(([y, c]) => { ctx.strokeStyle = c; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(0, y, 46, 13, 0, 0, Math.PI * 2); ctx.stroke(); });
        break;
      case 'keyura':
        ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-50, -4, 100, 24, 10) : ctx.rect(-50, -4, 100, 24); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(0, -44); ctx.lineTo(22, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
        dot(0, -18, 7, em); dot(-34, 8, 4, ruby); dot(34, 8, 4, ruby);
        break;
      case 'mekhala':
        ctx.lineWidth = 5; ctx.beginPath();
        for (let x = -56; x <= 56; x += 4) { const y = -16 + Math.sin(x / 18) * 6 + (x * x) / 260; x === -56 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
        for (let x = -50; x <= 50; x += 14) { const y = -16 + Math.sin(x / 18) * 6 + (x * x) / 260; ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 14); ctx.stroke(); dot(x, y + 18, 5, GOLD); }
        break;
    }
    ctx.restore();
  }

  function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }

  /* =====================================================
     GAME DEFINITIONS
     ===================================================== */
  const DEFS = {};

  /* ---- 1. Guard the yajna ---- */
  const FX = 760, FY = 650;
  DEFS.yagna = {
    imgs: () => ({ bg: ['bg_ashram', BG.get('ashram')], rama: ['p_rama_young', Portrait.svg('rama_young')], vish: ['p_vishwamitra', Portrait.svg('vishwamitra')] }),
    init(G) { G.s = { demons: [], arrows: [], hp: 5, kills: 0, goal: 10, spawn: 1, boss: false, subDead: false, marGone: false, cool: 0 }; },
    spawn(s, kind) {
      const big = kind === 'subahu', mar = kind === 'maricha';
      s.demons.push({ kind, x: rnd(480, 1220), y: -70, sp: big ? 52 : mar ? 66 : rnd(70, 105), s: big ? 1.5 : mar ? 1.3 : 1, r: big ? 54 : mar ? 46 : 36, hp: big ? 4 : 1, t: 0, ph: rnd(0, 6), rot: 0, hurt: 0 });
    },
    update(G, dt) {
      const s = G.s; s.cool -= dt;
      if (!s.boss) {
        s.spawn -= dt;
        if (s.spawn <= 0 && s.demons.length < 5) { s.spawn = Math.max(.8, 1.6 - s.kills * .07); this.spawn(s, 'minor'); }
        if (s.kills >= s.goal) { s.boss = true; this.spawn(s, 'subahu'); this.spawn(s, 'maricha'); G.float('Subahu and Maricha descend!', W / 2, 190, '#ffd76a', 36); Sound.play('conch'); }
      }
      for (const d of s.demons) {
        d.t += dt; d.hurt -= dt;
        if (d.flung) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 260 * dt; d.rot += 11 * dt; if (d.x > W + 200) { d.dead = true; s.marGone = true; } continue; }
        const dx = FX - d.x, dy = FY - 90 - d.y, L = Math.hypot(dx, dy) || 1;
        d.x += dx / L * d.sp * dt + Math.sin(d.t * 2.2 + d.ph) * 40 * dt;
        d.y += dy / L * d.sp * dt;
        if (L < 46) {
          d.dead = true; s.hp--; G.shake(.4); Sound.play('hit');
          G.float('The fire is defiled!', FX, FY - 190, '#ffb0a0');
          if (d.kind !== 'minor') this.spawn(s, d.kind);
        }
      }
      for (const a of s.arrows) {
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < -50 || a.x > W + 50 || a.y < -50 || a.y > H + 50) a.dead = true;
        for (const d of s.demons) {
          if (a.dead || d.dead || d.flung) continue;
          if (dist(a.x, a.y, d.x, d.y - 8 * d.s) < d.r) {
            a.dead = true; Sound.play('hit');
            if (d.kind === 'minor') { d.dead = true; s.kills++; G.burst(d.x, d.y, '#9a6ad0', 16); }
            else if (d.kind === 'subahu') {
              d.hp--; d.hurt = .12; G.burst(d.x, d.y, '#ff8a4a', 10);
              if (d.hp <= 0) { d.dead = true; s.subDead = true; G.burst(d.x, d.y, '#ff8a4a', 40); G.float('Subahu falls to the Āgneya astra!', d.x, d.y - 80, '#ffd76a', 28); }
            } else {
              d.flung = true; d.vx = 1500; d.vy = -520; G.float('The Mānava astra hurls Maricha into the sea!', W / 2, 160, '#bfe8ff', 30);
            }
          }
        }
      }
      s.demons = s.demons.filter(d => !d.dead); s.arrows = s.arrows.filter(a => !a.dead);
      if (s.hp <= 0) G.end(false, 'The sacred fire was defiled. The sage believes in you — try again.');
      if (s.boss && s.subDead && s.marGone) G.end(true);
      G.hud(`<span>Sacred fire <b>${'◆'.repeat(Math.max(0, s.hp))}${'◇'.repeat(5 - Math.max(0, s.hp))}</b></span><span>Rakshasas <b>${Math.min(s.kills, s.goal)}/${s.goal}</b></span>${s.boss ? `<span>Subahu <b>${s.subDead ? '✓' : '…'}</b></span><span>Maricha <b>${s.marGone ? '✓' : '…'}</b></span>` : ''}`);
    },
    draw(G) {
      const s = G.s; drawImg(G.img.bg, 0, 0, W, H);
      drawImg(G.img.vish, FX + 100, FY - 230, 170, 216);
      drawFire(FX, FY, 1, G.t);
      for (const d of s.demons) {
        ctx.save(); ctx.translate(d.x, d.y); if (d.flung) ctx.rotate(d.rot); ctx.translate(-d.x, -d.y);
        drawDemon(d.x, d.y, d.s, d.t, d.kind, d.hurt > 0); ctx.restore();
        if (d.kind !== 'minor' && !d.flung) label(d.kind === 'subahu' ? 'Subahu' : 'Maricha', d.x, d.y - 90 * d.s);
      }
      for (const a of s.arrows) drawArrow(a.x, a.y, a.ang, 80);
      drawImg(G.img.rama, 20, 400, 250, 318);
      const PX = 300, PY = 560, ang = clamp(Math.atan2(G.mouse.y - PY, G.mouse.x - PX), -Math.PI * .95, .35);
      drawBow(PX, PY, ang, s.cool <= 0, s.cool <= 0 ? 1 : 0);
      crosshair(G.mouse.x, G.mouse.y);
    },
    down(G, p) {
      const s = G.s; if (s.cool > 0) return;
      const PX = 300, PY = 560, ang = clamp(Math.atan2(p.y - PY, p.x - PX), -Math.PI * .95, .35);
      s.arrows.push({ x: PX + Math.cos(ang) * 120, y: PY + Math.sin(ang) * 120, vx: Math.cos(ang) * 1300, vy: Math.sin(ang) * 1300, ang });
      s.cool = .26; Sound.play('arrow');
    },
  };

  function label(text, x, y, size = 22, color = '#fff3c4') {
    ctx.save(); ctx.font = `700 ${size}px ${SERIF}`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,10,5,.85)';
    ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
  }

  /* ---- 2. Shiva's bow ---- */
  DEFS.bow = {
    imgs: () => ({ bg: ['bg_mithila', BG.get('mithila')], rama: ['p_rama_young', Portrait.svg('rama_young')], sita: ['p_sita', Portrait.svg('sita')], janaka: ['p_janaka', Portrait.svg('janaka')] }),
    init(G) { G.s = { stage: 0, x: 0, dir: 1, zones: [[.5, .22], [.66, .15], [.36, .1]], lift: 0, bend: 0, broken: false, bt: 0, cool: 0 }; },
    update(G, dt) {
      const s = G.s; s.cool -= dt;
      if (!s.broken) {
        s.x += s.dir * (.7 + s.stage * .38) * dt;
        if (s.x > 1) { s.x = 1; s.dir = -1; } if (s.x < 0) { s.x = 0; s.dir = 1; }
      } else { s.bt += dt; if (s.bt > 2.6) G.end(true); }
      s.lift += ((s.stage >= 1 ? 1 : 0) - s.lift) * Math.min(1, dt * 3);
      s.bend += ((s.stage >= 2 ? 1 : 0) + (s.stage >= 3 ? .5 : 0) - s.bend) * Math.min(1, dt * 3);
      G.hud(`<span>${['Lift', 'Bend', 'String'].map((n, i) => `<b class="${i < s.stage ? 'ok' : ''}">${i < s.stage ? '✓' : (i + 1)} ${n}</b>`).join(' &nbsp; ')}</span>`);
    },
    press(G) {
      const s = G.s; if (s.broken || s.cool > 0) return;
      const z = s.zones[s.stage];
      if (Math.abs(s.x - z[0]) <= z[1] / 2) {
        s.stage++; Sound.play('bell'); G.burst(640, 360, '#ffd76a', 24);
        if (s.stage === 3) { s.broken = true; Sound.play('thunder'); G.flash(1); G.shake(1.1); G.burst(640, 330, '#fff3c4', 60); }
        else G.float(['The bow rises — the court gasps!', 'It bends like a reed in his hands!'][s.stage - 1], 640, 200, '#ffd76a', 30);
      } else { G.shake(.25); Sound.play('miss'); s.cool = .5; G.float('The bow will not yield… breathe, and try again', 640, 230, '#ffd0c0', 26); }
    },
    down(G) { this.press(G); },
    key(G, code, isDown) { if (isDown && (code === 'Space' || code === 'Enter')) this.press(G); },
    draw(G) {
      const s = G.s; drawImg(G.img.bg, 0, 0, W, H);
      drawImg(G.img.janaka, 1060, 120, 190, 242);
      // the iron chest on its eight-wheeled cart
      ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.fillStyle = '#4a4a52'; rr(380, 500, 520, 90, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8a8a92'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(400 + i * 60, 515, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#3a2a1a'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(430 + i * 140, 600, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.restore();
      const y0 = 470 - s.lift * 140, len = 440, sag = 30 + s.bend * 90;
      const bowPath = (sx, sy, cx, cy, ex, ey) => {
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
        ctx.strokeStyle = '#6a3a1a'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
        ctx.strokeStyle = GOLD; ctx.lineWidth = 12; ctx.setLineDash([6, 40]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke(); ctx.setLineDash([]);
      };
      ctx.save(); ctx.translate(640, y0);
      if (!s.broken) {
        bowPath(-len, 0, 0, -2 * sag, len, 0);
        ctx.fillStyle = GOLD; ctx.fillRect(-16, -sag - 14, 32, 28);
        if (s.stage >= 2) { ctx.strokeStyle = '#f3ead2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len, 0); ctx.stroke(); }
      } else {
        const b = s.bt;
        ctx.save(); ctx.translate(-b * 300, b * b * 140); ctx.rotate(-b * 1.1); bowPath(-len, 0, -len / 2, -sag, 0, -sag); ctx.restore();
        ctx.save(); ctx.translate(b * 300, b * b * 140); ctx.rotate(b * 1.1); bowPath(0, -sag, len / 2, -sag, len, 0); ctx.restore();
        if (b < 1.2) label('CRACK!', 0, -sag - 60, 64, '#fff3c4');
      }
      ctx.restore();
      drawImg(G.img.rama, 20, 410, 240, 305);
      drawImg(G.img.sita, 1040, 420, 230, 293);
      if (!s.broken) {
        const x0 = 340, w = 600, y = 640;
        ctx.save(); ctx.fillStyle = 'rgba(20,8,4,.75)'; rr(x0 - 14, y - 16, w + 28, 58, 12); ctx.fill();
        const z = s.zones[s.stage];
        ctx.fillStyle = '#5a2a1a'; rr(x0, y, w, 26, 8); ctx.fill();
        ctx.fillStyle = GOLD; rr(x0 + (z[0] - z[1] / 2) * w, y, z[1] * w, 26, 6); ctx.fill();
        const mx = x0 + s.x * w;
        ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.moveTo(mx, y - 6); ctx.lineTo(mx - 10, y - 18); ctx.lineTo(mx + 10, y - 18); ctx.closePath(); ctx.fill();
        ctx.fillRect(mx - 2, y - 6, 4, 38);
        ctx.restore();
        label(['LIFT the bow', 'BEND the bow', 'STRING the bow!'][s.stage] + ' — press Space / tap', 640, y - 30, 26);
      }
    },
  };

  /* ---- 3. Golden deer ---- */
  DEFS.deer = {
    imgs: () => ({ bg: ['bg_forest', BG.get('forest')], gold: ['spr_deer_g', Sprites.deer(false)], real: ['spr_deer_r', Sprites.deer(true)] }),
    init(G) {
      G.s = { spots: [[170, 560], [400, 495], [640, 575], [880, 505], [1110, 560], [290, 665], [770, 670], [1170, 670]], cur: null, next: .8, hits: 0, goal: 5, time: 45, shots: [], last: -1 };
    },
    update(G, dt) {
      const s = G.s;
      if (!G.ended) { s.time -= dt; if (s.time <= 0) { s.time = 0; G.end(false, 'The deer slipped away into the forest. Try again!'); } }
      if (s.cur) { s.cur.t += dt; if (s.cur.t > s.cur.life) { s.cur = null; s.next = rnd(.35, .8); } }
      else if (!G.ended) {
        s.next -= dt;
        if (s.next <= 0) {
          let i; do i = irnd(s.spots.length); while (i === s.last); s.last = i;
          const [x, y] = s.spots[i];
          s.cur = { i, x, y, t: 0, life: Math.max(.78, 1.35 - s.hits * .12), real: s.hits > 0 && Math.random() < .26, flip: x < 640 };
        }
      }
      s.shots.forEach(h => h.t += dt); s.shots = s.shots.filter(h => h.t < .2);
      G.hud(`<span>Strikes <b>${s.hits}/${s.goal}</b></span><span>Time <b>${Math.ceil(s.time)}s</b></span>`);
    },
    down(G, p) {
      const s = G.s; if (G.ended) return;
      s.shots.push({ x: p.x, y: p.y, t: 0 }); Sound.play('arrow');
      const c = s.cur;
      if (c && c.t > .08 && dist(p.x, p.y, c.x, c.y - 75) < 85) {
        if (c.real) { s.time = Math.max(0, s.time - 3); Sound.play('miss'); G.float('An innocent deer — Rama lowers his bow (−3s)', c.x, c.y - 170, '#ffd0c0', 24); }
        else {
          s.hits++; Sound.play('hit'); G.burst(c.x, c.y - 70, '#ffd76a', 26);
          G.float(['Swift as thought!', 'It vanishes again…', 'It leads Rama deeper…', 'So close!', 'Struck!'][s.hits - 1], c.x, c.y - 170, '#ffd76a', 28);
          if (s.hits >= s.goal) G.end(true);
        }
        s.cur = null; s.next = .5;
      }
    },
    draw(G) {
      const s = G.s; drawImg(G.img.bg, 0, 0, W, H);
      ctx.fillStyle = 'rgba(20,40,20,.18)'; ctx.fillRect(0, 0, W, H);
      const order = s.spots.map((p, i) => i).sort((a, b) => s.spots[a][1] - s.spots[b][1]);
      for (const i of order) {
        const [x, y] = s.spots[i], c = s.cur;
        if (c && c.i === i) {
          const vis = Math.min(1, c.t / .14, (c.life - c.t) / .14), rise = (1 - Math.max(0, vis)) * 80;
          ctx.save(); ctx.translate(x, y - 160 + rise);
          if (c.flip) { ctx.scale(-1, 1); }
          drawImg(c.real ? G.img.real : G.img.gold, -95, 0, 190, 166);
          ctx.restore();
          if (!c.real) for (let k = 0; k < 6; k++) {
            const a = G.t * 3 + k; ctx.fillStyle = `rgba(255,230,140,${.5 + Math.sin(a * 2) * .4})`;
            ctx.beginPath(); ctx.arc(x + Math.cos(a) * 80, y - 90 + Math.sin(a * 1.3) * 50, 3, 0, Math.PI * 2); ctx.fill();
          }
        }
        drawBush(x, y, 1.05);
      }
      for (const h of s.shots) {
        ctx.save(); ctx.globalAlpha = 1 - h.t / .2; ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(640, H); ctx.lineTo(h.x, h.y); ctx.stroke(); ctx.restore();
      }
      crosshair(G.mouse.x, G.mouse.y);
    },
  };

  /* ---- 4. Ornament memory ---- */
  const ORN = [
    { k: 'nupura', n: 'Nūpura', e: 'Anklets' }, { k: 'haar', n: 'Hāra', e: 'Necklace' }, { k: 'kundala', n: 'Kuṇḍala', e: 'Earrings' },
    { k: 'kankana', n: 'Kaṅkaṇa', e: 'Bangles' }, { k: 'keyura', n: 'Keyūra', e: 'Armlets' }, { k: 'mekhala', n: 'Mekhalā', e: 'Waist-girdle' },
  ];
  const CW = 168, CH = 188, GAP = 24, CX0 = (W - (4 * CW + 3 * GAP)) / 2, CY0 = 96;
  DEFS.memory = {
    imgs: () => ({ bg: ['bg_kishkindha', BG.get('kishkindha')] }),
    init(G) {
      const deck = [...ORN, ...ORN].sort(() => Math.random() - .5);
      G.s = { cards: deck.map((o, i) => ({ ...o, x: CX0 + (i % 4) * (CW + GAP), y: CY0 + Math.floor(i / 4) * (CH + GAP), f: 0, tgt: 0, done: false })), open: [], lock: 0, moves: 0, pairs: 0 };
    },
    update(G, dt) {
      const s = G.s;
      for (const c of s.cards) c.f += clamp(c.tgt - c.f, -dt * 5, dt * 5);
      if (s.lock > 0) { s.lock -= dt; if (s.lock <= 0) { s.open.forEach(c => c.tgt = 0); s.open = []; } }
      G.hud(`<span>Pairs <b>${s.pairs}/6</b></span><span>Moves <b>${s.moves}</b></span>`);
    },
    down(G, p) {
      const s = G.s; if (s.lock > 0 || G.ended) return;
      const c = s.cards.find(c => p.x > c.x && p.x < c.x + CW && p.y > c.y && p.y < c.y + CH);
      if (!c || c.done || c.tgt === 1) return;
      c.tgt = 1; s.open.push(c); Sound.play('flip');
      if (s.open.length === 2) {
        s.moves++;
        const [a, b] = s.open;
        if (a.k === b.k) {
          a.done = b.done = true; s.open = []; s.pairs++; Sound.play('bell');
          G.burst(b.x + CW / 2, b.y + CH / 2, '#ffd76a', 20);
          G.float(`${a.n} — ${a.e}`, b.x + CW / 2, b.y - 6, '#ffd76a', 26);
          if (s.pairs === 6) G.end(true);
        } else s.lock = .9;
      }
    },
    draw(G) {
      const s = G.s; drawImg(G.img.bg, 0, 0, W, H);
      ctx.fillStyle = 'rgba(30,12,4,.45)'; ctx.fillRect(0, 0, W, H);
      for (const c of s.cards) {
        const sx = Math.abs(Math.cos(c.f * Math.PI));
        ctx.save(); ctx.translate(c.x + CW / 2, c.y + CH / 2); ctx.scale(Math.max(sx, .02), 1);
        if (c.f < .5) {
          ctx.fillStyle = '#8a2414'; rr(-CW / 2, -CH / 2, CW, CH, 14); ctx.fill();
          ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.stroke();
          ctx.lineWidth = 2; rr(-CW / 2 + 10, -CH / 2 + 10, CW - 20, CH - 20, 10); ctx.stroke();
          for (let i = 0; i < 8; i++) {
            ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.beginPath(); ctx.ellipse(0, -30, 10, 24, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
          }
          ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill();
        } else {
          ctx.fillStyle = '#f6e7c8'; rr(-CW / 2, -CH / 2, CW, CH, 14); ctx.fill();
          ctx.strokeStyle = c.done ? '#2e7d4f' : GOLD; ctx.lineWidth = c.done ? 6 : 4; ctx.stroke();
          ctx.save(); ctx.translate(0, -18); ctx.scale(.95, .95); drawOrnament(c.k); ctx.restore();
          ctx.fillStyle = INK; ctx.textAlign = 'center';
          ctx.font = `700 22px ${SERIF}`; ctx.fillText(c.n, 0, CH / 2 - 38);
          ctx.font = `italic 18px ${SERIF}`; ctx.fillText(c.e, 0, CH / 2 - 16);
        }
        ctx.restore();
      }
    },
  };

  /* ---- 5. Hanuman's leap ---- */
  const SEA = 640, HX = 270;
  DEFS.leap = {
    imgs: () => ({ han: ['spr_hfly', Sprites.hanumanFly()] }),
    init(G) {
      G.s = { y: 300, vy: 0, d: 0, speed: 330, lives: 3, inv: 0, score: 0, ents: [], si: 0, seen: {}, goal: 13000, key: false,
        sched: [[600, 'orbs'], [1200, 'simhika'], [1900, 'orbs'], [2500, 'surasa'], [3200, 'orbs'], [3900, 'mainaka'], [4900, 'simhika'], [5500, 'orbs'], [6100, 'surasa'], [6900, 'simhika'], [7500, 'orbs'], [8200, 'surasa'], [9000, 'simhika'], [9600, 'orbs'], [10300, 'surasa'], [11000, 'simhika'], [11600, 'orbs'], [12100, 'surasa']] };
    },
    spawn(G, k) {
      const s = G.s;
      const intro = { surasa: 'Surasa, mother of serpents, opens her jaws — fly through!', simhika: 'Simhika seizes shadows from below — stay high!', mainaka: 'Mount Mainaka rises to honour Hanuman — touch its golden peak!' };
      if (intro[k] && !s.seen[k]) { s.seen[k] = true; G.note(intro[k], 3.2); }
      if (k === 'orbs') { const b = rnd(170, 440); for (let i = 0; i < 5; i++) s.ents.push({ k: 'orb', x: W + 60 + i * 70, y: b + Math.sin(i) * 40 }); }
      if (k === 'simhika') s.ents.push({ k, x: W + 140, w: 210, top: rnd(360, 440), t: 0 });
      if (k === 'surasa') s.ents.push({ k, x: W + 120, w: 150, gy: rnd(240, 420), gap: 215 });
      if (k === 'mainaka') s.ents.push({ k, x: W + 260, peak: 410 });
    },
    hit(G, msg) {
      const s = G.s; if (s.inv > 0 || G.ended) return;
      s.lives--; s.inv = 1.6; G.shake(.4); Sound.play('hit'); G.float(msg, HX + 120, s.y - 50, '#ffb0a0', 26);
      if (s.lives <= 0) G.end(false, 'Hanuman fell into the sea. Remember Jambavan\'s words — rise and try again!');
    },
    update(G, dt) {
      const s = G.s; s.inv -= dt;
      if (G.ended) return;
      const hold = G.down || s.key;
      s.vy = clamp(s.vy + (hold ? -1500 : 900) * dt, -480, 520);
      s.y += s.vy * dt;
      if (s.y < 50) { s.y = 50; s.vy = 0; }
      s.d += s.speed * dt;
      while (s.si < s.sched.length && s.d >= s.sched[s.si][0]) this.spawn(G, s.sched[s.si++][1]);
      const r = 26;
      for (const e of s.ents) {
        e.x -= s.speed * dt; e.t = (e.t || 0) + dt;
        if (e.k === 'orb' && !e.got && dist(HX, s.y, e.x, e.y) < 44) { e.got = true; s.score++; Sound.play('tick'); }
        if (e.k === 'surasa' && Math.abs(HX - e.x) < e.w / 2 + r * .6) {
          if (s.y - r < e.gy - e.gap / 2 || s.y + r > e.gy + e.gap / 2) this.hit(G, 'Surasa\'s jaws!');
        }
        if (e.k === 'surasa' && !e.passed && e.x + e.w / 2 < HX - r) { e.passed = true; G.float('Through Surasa\'s mouth — and out again!', HX + 140, 120, '#bfffc8', 24); }
        if (e.k === 'simhika' && Math.abs(HX - e.x) < e.w / 2 && s.y + r > e.top) this.hit(G, 'Simhika seized your shadow!');
        if (e.k === 'mainaka' && !e.used && dist(HX, s.y, e.x, e.peak) < 80) {
          e.used = true; s.lives = Math.min(4, s.lives + 1); Sound.play('good');
          G.float('Mainaka\'s blessing — Hanuman bows and flies on! +1', HX + 160, s.y - 60, '#ffd76a', 26);
        }
      }
      s.ents = s.ents.filter(e => e.x > -320 && !e.got);
      if (s.y > SEA - 22) { this.hit(G, 'The waves pull at Hanuman!'); s.vy = -560; s.y = SEA - 22; }
      if (s.d >= s.goal) G.end(true);
      G.hud(`<span>Life <b>${'❤'.repeat(Math.max(0, s.lives))}</b></span><span><b>${Math.min(100, Math.floor(s.d / s.goal * 100))}</b> / 100 yojanas</span><span><b style="font-family:var(--deva)">राम</b> × ${s.score}</span>`);
    },
    key(G, code, isDown) { if (code === 'Space' || code === 'ArrowUp') G.s.key = isDown; },
    draw(G) {
      const s = G.s, t = G.t;
      const g = ctx.createLinearGradient(0, 0, 0, SEA);
      g.addColorStop(0, '#f39a5a'); g.addColorStop(.5, '#fde2b0'); g.addColorStop(1, '#a8daea');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, SEA);
      ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(1050 - s.d * .012, 150, 60, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 6; i++) {
        const x = ((i * 300 - s.d * .25) % 1600 + 1600) % 1600 - 160, y = 80 + (i * 67) % 220;
        ctx.beginPath(); ctx.ellipse(x, y, 90, 22, 0, 0, Math.PI * 2); ctx.ellipse(x + 50, y - 14, 50, 18, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Lanka on the horizon
      const lx = HX + (s.goal - s.d) * .9 + 260;
      if (lx < W + 400) {
        ctx.fillStyle = '#4a6a3a'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lx - 260, SEA); ctx.quadraticCurveTo(lx, SEA - 220, lx + 400, SEA - 120); ctx.lineTo(lx + 400, SEA); ctx.closePath(); ctx.fill(); ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const tx = lx - 80 + i * 70, th = 120 + (i % 2) * 60, ty = SEA - 150 - (i < 3 ? i * 15 : (4 - i) * 15);
          ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(tx - 22, ty + 40); ctx.lineTo(tx - 12, ty - th * .5); ctx.lineTo(tx, ty - th); ctx.lineTo(tx + 12, ty - th * .5); ctx.lineTo(tx + 22, ty + 40); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      for (const e of s.ents) {
        if (e.k === 'mainaka') {
          ctx.fillStyle = '#d9a52a'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(e.x - 230, SEA + 10); ctx.lineTo(e.x - 60, e.peak + 60); ctx.lineTo(e.x, e.peak); ctx.lineTo(e.x + 70, e.peak + 70); ctx.lineTo(e.x + 230, SEA + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#b8862a'; ctx.beginPath(); ctx.moveTo(e.x, e.peak); ctx.lineTo(e.x + 70, e.peak + 70); ctx.lineTo(e.x + 230, SEA + 10); ctx.lineTo(e.x + 40, SEA + 10); ctx.closePath(); ctx.fill();
          if (!e.used) { ctx.fillStyle = `rgba(255,240,170,${.5 + Math.sin(t * 6) * .3})`; ctx.beginPath(); ctx.arc(e.x, e.peak, 30, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      // sea
      ctx.fillStyle = '#2a6e9a'; ctx.fillRect(0, SEA, W, H - SEA);
      ctx.strokeStyle = '#8fc7e0'; ctx.lineWidth = 3;
      for (let r = 0; r < 4; r++) {
        ctx.beginPath(); const yy = SEA + 14 + r * 22, off = (s.d * (.6 + r * .2)) % 80;
        for (let x = -80; x < W + 80; x += 80) { ctx.moveTo(x - off, yy); ctx.quadraticCurveTo(x - off + 20, yy - 10, x - off + 40, yy); ctx.quadraticCurveTo(x - off + 60, yy + 10, x - off + 80, yy); }
        ctx.stroke();
      }
      for (const e of s.ents) {
        if (e.k === 'orb') {
          ctx.save(); ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 18; ctx.fillStyle = 'rgba(255,230,140,.9)';
          ctx.beginPath(); ctx.arc(e.x, e.y, 22, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          ctx.fillStyle = '#8a2414'; ctx.font = `bold 18px ${DEVA}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('राम', e.x, e.y + 1);
        }
        if (e.k === 'simhika') {
          ctx.fillStyle = 'rgba(40,10,60,.86)'; ctx.beginPath(); ctx.moveTo(e.x - e.w / 2, SEA + 10);
          for (let i = 0; i <= 10; i++) { const x = e.x - e.w / 2 + i * e.w / 10, y = e.top + Math.sin(i * 1.7 + e.t * 5) * 14 + (i % 2 ? 34 : 0); ctx.lineTo(x, y); }
          ctx.lineTo(e.x + e.w / 2, SEA + 10); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ff4a3a'; ctx.beginPath(); ctx.arc(e.x - 22, e.top + 70, 6, 0, Math.PI * 2); ctx.arc(e.x + 22, e.top + 70, 6, 0, Math.PI * 2); ctx.fill();
        }
        if (e.k === 'surasa') drawSurasa(e, t);
      }
      ctx.save(); ctx.translate(HX, s.y); ctx.rotate(clamp(s.vy / 1200, -.35, .35));
      if (s.inv > 0 && Math.floor(t * 12) % 2) ctx.globalAlpha = .4;
      drawImg(G.img.han, -105, -58, 210, 117); ctx.restore();
    },
  };

  function drawSurasa(e, t) {
    const x = e.x, top = e.gy - e.gap / 2, bot = e.gy + e.gap / 2, w = e.w;
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.fillStyle = '#2f6b3a';
    ctx.beginPath(); ctx.moveTo(x - w * .38, SEA + 10); ctx.quadraticCurveTo(x - w * .52, (bot + SEA) / 2, x - w * .5, bot + 18);
    ctx.lineTo(x + w * .5, bot + 18); ctx.quadraticCurveTo(x + w * .52, (bot + SEA) / 2, x + w * .38, SEA + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#4f9a5a'; ctx.lineWidth = 2;
    for (let yy = bot + 40; yy < SEA; yy += 20) { ctx.beginPath(); for (let k = -2; k <= 2; k++) ctx.arc(x + k * 22, yy, 10, 0, Math.PI); ctx.stroke(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.fillStyle = '#c0475a'; ctx.beginPath(); ctx.ellipse(x, bot + 6, w * .5, 14, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#3d8a4a'; ctx.beginPath(); ctx.moveTo(x - w * .58, bot + 22); ctx.quadraticCurveTo(x, bot - 4, x + w * .6, bot + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; for (const k of [-.3, .3]) { ctx.beginPath(); ctx.moveTo(x + k * w - 7, bot + 8); ctx.lineTo(x + k * w, bot - 18); ctx.lineTo(x + k * w + 7, bot + 8); ctx.fill(); }
    ctx.fillStyle = '#2f6b3a';
    ctx.beginPath(); ctx.moveTo(x - w * .32, -10); ctx.quadraticCurveTo(x - w * .95, top - 120, x - w * .6, top - 8);
    ctx.lineTo(x + w * .6, top - 8); ctx.quadraticCurveTo(x + w * .95, top - 120, x + w * .32, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c0475a'; ctx.beginPath(); ctx.ellipse(x, top - 6, w * .5, 12, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#fff'; for (const k of [-.3, .3]) { ctx.beginPath(); ctx.moveTo(x + k * w - 7, top - 10); ctx.lineTo(x + k * w, top + 18); ctx.lineTo(x + k * w + 7, top - 10); ctx.fill(); }
    // the cobra hood's spectacle mark
    ctx.strokeStyle = GOLD; ctx.lineWidth = 4;
    for (const k of [-22, 22]) { ctx.beginPath(); ctx.arc(x + k, top - 90, 14, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.ellipse(x - 24, top - 44, 8, 5, .3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 24, top - 44, 8, 5, -.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = INK; ctx.fillRect(x - 25, top - 49, 2.5, 10); ctx.fillRect(x + 23, top - 49, 2.5, 10);
    ctx.restore();
  }

  /* ---- 6. Ram Setu ---- */
  const BX0 = 40, BX1 = 990, BY = 372;
  DEFS.setu = {
    imgs: () => ({ bg: ['bg_ocean', BG.get('ocean')] }),
    init(G) { G.s = { stones: [], placed: 0, flying: 0, goal: 20, miss: 0, maxMiss: 5, time: 75, total: 75, spawn: 0, sq: null, sqT: [12, 38], sqI: 0 }; },
    slot(s, i) { return { x: BX0 + (i + .5) * (BX1 - BX0) / s.goal, y: BY }; },
    update(G, dt) {
      const s = G.s;
      if (!G.ended) { s.time -= dt; if (s.time <= 0) { s.time = 0; G.end(false, 'The tide turned before the bridge was done. Try again!'); } }
      s.spawn -= dt;
      if (s.spawn <= 0 && !G.ended) {
        s.spawn = rnd(.45, .75);
        const lane = irnd(4), dir = lane % 2 ? -1 : 1;
        s.stones.push({ x: dir > 0 ? -60 : W + 60, by: 420 + lane * 52, y: 0, dir, sp: rnd(85, 140) + lane * 10, named: Math.random() < .58, r: 36, ph: rnd(0, 6), pts: rockPts(36), st: 'float', t: 0 });
      }
      for (const o of s.stones) {
        if (o.st === 'float') { o.x += o.dir * o.sp * dt; o.y = o.by + Math.sin(G.t * 2 + o.ph) * 5; if (o.x < -100 || o.x > W + 100) o.gone = true; }
        else if (o.st === 'sink') { o.t += dt; o.y += 40 * dt; if (o.t > 1.2) o.gone = true; }
        else if (o.st === 'fly') {
          o.t += dt / .6;
          const k = Math.min(1, o.t);
          o.x = o.sx + (o.tx - o.sx) * k; o.y = o.sy + (o.ty - o.sy) * k - Math.sin(k * Math.PI) * 120;
          if (k >= 1) { o.gone = true; s.placed++; s.flying--; G.burst(o.tx, o.ty, '#ffd76a', 8); if (s.placed >= s.goal) G.end(true); }
        }
      }
      s.stones = s.stones.filter(o => !o.gone);
      const elapsed = s.total - s.time;
      if (s.sqI < s.sqT.length && elapsed > s.sqT[s.sqI]) { s.sq = { x: BX0 + 10, t: 0, blessed: false }; s.sqI++; G.note('A little squirrel is helping too! Tap it.', 2.6); }
      if (s.sq) { s.sq.t += dt; s.sq.x += 120 * dt; if (s.sq.x > BX0 + (BX1 - BX0) * Math.max(.15, s.placed / s.goal) + 40) s.sq = null; }
      G.hud(`<span>Bridge <b>${s.placed}/${s.goal}</b></span><span>Sunk <b>${s.miss}/${s.maxMiss}</b></span><span>Time <b>${Math.ceil(s.time)}s</b></span>`);
    },
    down(G, p) {
      const s = G.s; if (G.ended) return;
      if (s.sq && !s.sq.blessed && dist(p.x, p.y, s.sq.x, BY - 30) < 44) {
        s.sq.blessed = true; s.placed = Math.min(s.goal, s.placed + 2); Sound.play('good');
        G.float('Rama strokes the squirrel — three stripes appear! +2', s.sq.x + 100, BY - 80, '#ffd76a', 26);
        if (s.placed >= s.goal) G.end(true);
        return;
      }
      for (let i = s.stones.length - 1; i >= 0; i--) {
        const o = s.stones[i];
        if (o.st !== 'float' || dist(p.x, p.y, o.x, o.y) > o.r + 6) continue;
        if (o.named) {
          const sl = this.slot(s, Math.min(s.goal - 1, s.placed + s.flying));
          Object.assign(o, { st: 'fly', t: 0, sx: o.x, sy: o.y, tx: sl.x, ty: sl.y }); s.flying++; Sound.play('tick');
        } else {
          o.st = 'sink'; o.t = 0; s.miss++; Sound.play('miss');
          G.float('No name, no float — it sinks!', o.x, o.y - 50, '#ffd0c0', 22);
          if (s.miss >= s.maxMiss) G.end(false, 'Too many stones sank. Look for the golden "राम" — try again!');
        }
        return;
      }
    },
    draw(G) {
      const s = G.s; drawImg(G.img.bg, 0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; rr(BX0 - 10, BY - 26, BX1 - BX0 + 20, 52, 10); ctx.fill();
      for (let i = 0; i < s.goal; i++) {
        const sl = this.slot(s, i);
        if (i < s.placed) drawRock(sl.x, sl.y, [[-24, -10], [-6, -18], [20, -14], [26, 4], [8, 16], [-20, 14]], false, 0);
        else { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sl.x, sl.y, 14, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      }
      if (s.placed) { ctx.fillStyle = '#f6d77e'; ctx.font = `bold 15px ${DEVA}`; ctx.textAlign = 'center'; for (let i = 0; i < s.placed; i++) { const sl = this.slot(s, i); ctx.fillText('राम', sl.x, sl.y + 5); } }
      for (const o of s.stones) drawRock(o.x, o.y, o.pts, o.named, o.named ? G.t + o.ph : 0, o.st === 'sink' ? Math.max(0, 1 - o.t / 1.2) : 1);
      if (s.sq) drawSquirrel(s.sq.x, BY - 22, s.sq.blessed, s.sq.t);
    },
  };

  /* ---- 7. Rama vs Ravana ---- */
  const RHEADS = [[692, 222, .66], [1228, 222, .66], [748, 228, .76], [1172, 228, .76], [810, 236, .86], [1110, 236, .86], [880, 244, .98], [1040, 244, .98], [960, 104, .6], [960, 252, 1.2]];
  const NAV = { x: 960, y: 590 }, RX = 330, RY = 470, BPX = 380, BPY = 480;
  DEFS.battle = {
    imgs() {
      const o = { bg: ['bg_battle', BG.get('battle')], rama: ['p_rama_exile', Portrait.svg('rama_exile')] };
      for (let i = 0; i < 5; i++) o['h' + i] = ['spr_rh' + i, Sprites.ravanaHead(i)];
      return o;
    },
    init(G) {
      G.s = { heads: RHEADS.map(([x, y, k], i) => ({ x, y, k, i, alive: true, regrow: 0, down: 0 })), arrows: [], fires: [], hp: 6, hits: 0, phase: 1, fireT: 2, cool: 0, charge: 0, charging: false, nav: 0, dead: false, deadT: 0 };
    },
    navOpen(s) { return s.phase === 2 && (s.nav % 3.4) < 1.3; },
    shoot(G, brahma) {
      const s = G.s, ang = Math.atan2(G.mouse.y - BPY, G.mouse.x - BPX), sp = brahma ? 1500 : 1300;
      s.arrows.push({ x: BPX + Math.cos(ang) * 120, y: BPY + Math.sin(ang) * 120, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, ang, brahma });
      Sound.play(brahma ? 'conch' : 'arrow'); s.cool = .22;
    },
    update(G, dt) {
      const s = G.s; s.cool -= dt;
      if (s.dead) { s.deadT += dt; if (s.deadT > 2.6) G.end(true); return; }
      if (G.ended) return;
      if (s.phase === 2) s.nav += dt;
      if (s.charging) s.charge = Math.min(1, s.charge + dt / 1.1);
      for (const h of s.heads) if (!h.alive) {
        h.down += dt; h.regrow -= dt;
        if (h.regrow <= 0) { h.alive = true; h.down = 0; G.float('It grows back!', h.x, h.y - 70 * h.k, '#ffb0a0', 20); }
      }
      s.fireT -= dt;
      if (s.fireT <= 0) {
        s.fireT = s.phase === 1 ? rnd(1.2, 1.8) : rnd(1.0, 1.5);
        const x = rnd(760, 1160), y = rnd(340, 430), L = dist(x, y, RX, RY), sp = 300 + s.hits * 6;
        s.fires.push({ x, y, vx: (RX - x) / L * sp, vy: (RY - y) / L * sp, t: 0 });
      }
      for (const f of s.fires) {
        f.x += f.vx * dt; f.y += f.vy * dt; f.t += dt;
        if (dist(f.x, f.y, RX, RY) < 60) {
          f.dead = true; s.hp--; G.shake(.45); Sound.play('hit'); G.float('Rama is struck!', RX, RY - 150, '#ffb0a0');
          if (s.hp <= 0) G.end(false, 'Rama is driven back. Steady your aim — try again!');
        }
      }
      for (const a of s.arrows) {
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < -60 || a.x > W + 60 || a.y < -60 || a.y > H + 60) a.dead = true;
        if (a.dead) continue;
        if (a.brahma) {
          if (dist(a.x, a.y, NAV.x, NAV.y) < 55) {
            a.dead = true;
            if (this.navOpen(s)) { s.dead = true; G.flash(1); G.shake(1.2); Sound.play('thunder'); G.burst(NAV.x, NAV.y, '#fff3c4', 80); G.float('The Brahmastra strikes true!', 960, 440, '#ffd76a', 40); }
            else { G.float('The nectar is shielded — wait for it to glow!', NAV.x, NAV.y - 60, '#ffd0c0', 24); Sound.play('miss'); }
          }
          continue;
        }
        for (const f of s.fires) if (!f.dead && dist(a.x, a.y, f.x, f.y) < 30) { f.dead = true; a.dead = true; G.burst(f.x, f.y, '#ff9a3a', 14); Sound.play('fire'); break; }
        if (a.dead) continue;
        for (const h of s.heads) {
          if (h.alive && dist(a.x, a.y, h.x, h.y) < 44 * h.k) {
            a.dead = true; h.alive = false; h.down = 0; h.regrow = s.phase === 1 ? 2.8 : 2.2; s.hits++;
            G.burst(h.x, h.y, '#ff5a3a', 18); Sound.play('hit');
            if (s.phase === 1 && s.hits >= 10) {
              s.phase = 2; Sound.play('bell');
              G.note('Vibhishana: "The nectar of immortality is in his navel! HOLD to charge the Brahmastra, release when it glows!"', 6);
            }
            break;
          }
        }
      }
      s.arrows = s.arrows.filter(a => !a.dead); s.fires = s.fires.filter(f => !f.dead);
      G.hud(`<span>Rama <b>${'❤'.repeat(Math.max(0, s.hp))}</b></span>` + (s.phase === 1 ? `<span>Heads struck <b>${Math.min(s.hits, 10)}/10</b></span>` : `<span><b>Brahmastra</b> — hold, then release at the glowing navel</span>`));
    },
    down(G) { const s = G.s; if (G.ended || s.dead) return; if (s.phase === 2) { s.charging = true; s.charge = 0; } else if (s.cool <= 0) this.shoot(G, false); },
    up(G) { const s = G.s; if (!s.charging) return; s.charging = false; if (!G.ended && !s.dead) this.shoot(G, s.charge >= 1); s.charge = 0; },
    draw(G) {
      const s = G.s, t = G.t; drawImg(G.img.bg, 0, 0, W, H);
      const fade = s.dead ? Math.max(0, 1 - s.deadT / 2) : 1;
      ctx.save(); ctx.globalAlpha = fade;
      if (s.dead) ctx.translate(0, s.deadT * 60);
      drawRavanaBody(t, this.navOpen(s), s.phase);
      for (const h of s.heads) {
        const w = 100 * h.k, hh = 162 * h.k;
        if (h.alive) {
          drawImg(G.img['h' + (h.i % 5)], h.x - w / 2, h.y - 108 * h.k, w, hh);
        } else if (h.down < .7) {
          ctx.save(); ctx.globalAlpha = fade * (1 - h.down / .7); ctx.translate(h.x, h.y + h.down * h.down * 500); ctx.rotate(h.down * 3);
          drawImg(G.img['h' + (h.i % 5)], -w / 2, -108 * h.k, w, hh); ctx.restore();
        } else if (h.regrow < .5) {
          const k = 1 - h.regrow / .5;
          ctx.save(); ctx.globalAlpha = fade * k; drawImg(G.img['h' + (h.i % 5)], h.x - w / 2 * k, h.y - 108 * h.k * k, w * k, hh * k); ctx.restore();
        }
      }
      ctx.restore();
      for (const f of s.fires) {
        ctx.save(); const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, 26);
        g.addColorStop(0, '#fff3c4'); g.addColorStop(.5, '#f2a12b'); g.addColorStop(1, 'rgba(200,50,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 26, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(240,120,40,.5)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * .12, f.y - f.vy * .12); ctx.stroke(); ctx.restore();
      }
      for (const a of s.arrows) drawArrow(a.x, a.y, a.ang, a.brahma ? 130 : 80, a.brahma);
      // Rama in Indra's chariot
      drawImg(G.img.rama, 40, 250, 300, 382);
      ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.fillStyle = GOLD; rr(20, 600, 420, 46, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#b8321f'; ctx.fillRect(30, 612, 400, 8);
      ctx.fillStyle = '#8a5a1a'; ctx.beginPath(); ctx.arc(230, 670, 62, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = GOLD; ctx.lineWidth = 5; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + t; ctx.beginPath(); ctx.moveTo(230, 670); ctx.lineTo(230 + Math.cos(a) * 56, 670 + Math.sin(a) * 56); ctx.stroke(); }
      ctx.restore();
      const ang = Math.atan2(G.mouse.y - BPY, G.mouse.x - BPX);
      drawBow(BPX, BPY, ang, s.cool <= 0 || s.charging, s.charging ? .4 + s.charge * .6 : 1, s.charging && s.charge >= 1);
      if (s.charging) {
        ctx.save(); ctx.strokeStyle = s.charge >= 1 ? '#ffd76a' : '#fff3c4'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(G.mouse.x, G.mouse.y, 30, -Math.PI / 2, -Math.PI / 2 + s.charge * Math.PI * 2); ctx.stroke(); ctx.restore();
        if (s.charge >= 1) label('Brahmastra ready — release!', G.mouse.x, G.mouse.y - 44, 20, '#ffd76a');
      }
      crosshair(G.mouse.x, G.mouse.y);
    },
  };

  function drawRavanaBody(t, open, phase) {
    const cx = 960, sy = 380;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const arms = [[-1, -.95, 'sword'], [-1, -.5, 'mace'], [-1, -.05, 'shield'], [-1, .35, 'bow'], [1, -.95, 'trident'], [1, -.5, 'axe'], [1, -.05, 'disc'], [1, .35, 'sword']];
    arms.forEach(([side, a0, wpn], i) => {
      const a = a0 + Math.sin(t * 1.6 + i) * .06, sx = cx + side * 150, hx = sx + side * Math.cos(a) * 190, hy = sy + Math.sin(a) * 190;
      ctx.strokeStyle = INK; ctx.lineWidth = 28; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = '#a06a43'; ctx.lineWidth = 23; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = GOLD; ctx.lineWidth = 26; ctx.beginPath(); const mx = (sx + hx) / 2, my = (sy + hy) / 2; ctx.moveTo(mx - side * 4, my); ctx.lineTo(mx + side * 4, my); ctx.stroke();
      ctx.save(); ctx.translate(hx, hy); ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.fillStyle = '#cfd6dc';
      if (wpn === 'sword') { ctx.rotate(-Math.PI / 2 + side * .3); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-12, 50, 4, 92); ctx.quadraticCurveTo(10, 50, 6, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = GOLD; ctx.fillRect(-14, -6, 28, 8); }
      if (wpn === 'trident') { ctx.strokeStyle = '#cfd6dc'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(0, -70); ctx.moveTo(-18, -50); ctx.quadraticCurveTo(-18, -70, -12, -86); ctx.moveTo(18, -50); ctx.quadraticCurveTo(18, -70, 12, -86); ctx.moveTo(-18, -50); ctx.lineTo(18, -50); ctx.stroke(); }
      if (wpn === 'mace') { ctx.fillStyle = GOLD; ctx.strokeStyle = '#5e3a12'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, -40); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -58, 20, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); }
      if (wpn === 'shield') { ctx.fillStyle = '#5b0f17'; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke(); }
      if (wpn === 'bow') { ctx.strokeStyle = '#3e220f'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(-20, 0, 60, -1, 1); ctx.stroke(); }
      if (wpn === 'axe') { ctx.strokeStyle = '#5e3a12'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, -60); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -60); ctx.quadraticCurveTo(34, -66, 30, -30); ctx.lineTo(0, -36); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); }
      if (wpn === 'disc') { ctx.save(); ctx.rotate(t * 4); ctx.fillStyle = GOLD; ctx.beginPath(); for (let k = 0; k < 12; k++) { const r = k % 2 ? 22 : 34, aa = k * Math.PI / 6; ctx.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.restore();
      ctx.fillStyle = '#a06a43'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = '#a06a43'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.fillRect(cx - 34, 290, 68, 100); ctx.strokeRect(cx - 34, 290, 68, 100);
    ctx.fillStyle = '#5b0f17';
    ctx.beginPath(); ctx.moveTo(cx - 175, sy); ctx.quadraticCurveTo(cx, sy - 50, cx + 175, sy); ctx.lineTo(cx + 215, H + 10); ctx.lineTo(cx - 215, H + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.moveTo(cx - 120, sy - 20); ctx.quadraticCurveTo(cx, sy + 90, cx + 120, sy - 20); ctx.quadraticCurveTo(cx, sy + 30, cx - 120, sy - 20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b3122e'; ctx.beginPath(); ctx.arc(cx, sy + 52, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.fillRect(cx - 200, 640, 400, 26); ctx.strokeRect(cx - 200, 640, 400, 26);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#1f7a4a' : '#b3122e'; ctx.beginPath(); ctx.arc(cx - 176 + i * 44, 653, 6, 0, Math.PI * 2); ctx.fill(); }
    if (phase === 2) {
      if (open) {
        const g = ctx.createRadialGradient(NAV.x, NAV.y, 4, NAV.x, NAV.y, 60);
        g.addColorStop(0, '#fffbe0'); g.addColorStop(.4, 'rgba(255,215,106,.9)'); g.addColorStop(1, 'rgba(255,215,106,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(NAV.x, NAV.y, 60 + Math.sin(t * 10) * 6, 0, Math.PI * 2); ctx.fill();
        ctx.font = `italic 700 18px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillStyle = '#5a2a00'; ctx.fillText('amṛta', NAV.x, NAV.y + 6);
      } else {
        ctx.fillStyle = '#6a5a3a'; ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(NAV.x, NAV.y, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---- 8. Lamps of Ayodhya ---- */
  DEFS.diyas = {
    imgs: () => ({ bg: ['bg_ayodhyaNight', BG.get('ayodhyaNight')], pk: ['spr_pushpaka', Sprites.pushpaka()] }),
    init(G) {
      const lamps = [];
      for (let x = 330; x <= 950; x += 62) lamps.push({ x, y: 384 });
      for (let x = 50; x <= 1230; x += 92) lamps.push({ x: x + rnd(-8, 8), y: 548 });
      for (let x = 95; x <= 1200; x += 92) lamps.push({ x: x + rnd(-8, 8), y: 618 });
      for (let x = 50; x <= 1230; x += 92) lamps.push({ x: x + rnd(-8, 8), y: 690 });
      lamps.forEach((l, k) => { l.lit = false; l.k = k; });
      G.s = { lamps, lit: 0, goal: 32, time: 40, total: 40, drag: false, petals: [], winT: -1 };
    },
    light(G, p) {
      const s = G.s;
      for (const l of s.lamps) if (!l.lit && dist(p.x, p.y, l.x, l.y - 8) < 36) {
        l.lit = true; s.lit++; Sound.play('tick');
        if (s.lit === s.goal) { s.winT = 2.4; Sound.play('good'); G.note('Ayodhya blazes with light! The people shower flowers — puṣpa-vṛṣṭi!', 2.4); }
      }
    },
    update(G, dt) {
      const s = G.s;
      if (s.winT > 0) {
        s.winT -= dt;
        for (let i = 0; i < 4; i++) s.petals.push({ x: rnd(0, W), y: -20, vy: rnd(60, 140), vx: rnd(-30, 30), r: rnd(0, 6), c: ['#f2a12b', '#e8661c', '#f6d77e', '#f2a3b5'][irnd(4)] });
        if (s.winT <= 0) G.end(true);
      } else if (!G.ended) { s.time -= dt; if (s.time <= 0) { s.time = 0; G.end(false, 'The Vimana arrived to a dark city. Try again!'); } }
      s.petals.forEach(p => { p.y += p.vy * dt; p.x += p.vx * dt; p.r += dt * 3; }); s.petals = s.petals.filter(p => p.y < H + 20);
      G.hud(`<span>Lamps lit <b>${s.lit}/${s.goal}</b></span><span>Vimana arrives in <b>${Math.ceil(s.time)}s</b></span>`);
    },
    down(G, p) { if (G.s.winT > 0 || G.ended) return; G.s.drag = true; this.light(G, p); },
    move(G, p) { if (G.s.drag && G.s.winT <= 0 && !G.ended) this.light(G, p); },
    up(G) { G.s.drag = false; },
    draw(G) {
      const s = G.s, t = G.t; drawImg(G.img.bg, 0, 0, W, H);
      const k = s.lit / s.goal;
      ctx.fillStyle = `rgba(255,170,70,${Math.min(.28, k * .28)})`; ctx.fillRect(0, 0, W, H);
      for (const l of s.lamps) drawDiya(l.x, l.y, l.lit, t, l.k);
      const px = -300 + (1 - s.time / s.total) * 770;
      drawImg(G.img.pk, px, 40 + Math.sin(t * 1.5) * 8, 300, 168);
      for (const p of s.petals) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    },
  };

  /* =====================================================
     RUNTIME
     ===================================================== */
  function pos(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }

  function setup() {
    cv = document.getElementById('game'); ctx = cv.getContext('2d'); hudEl = document.getElementById('ghud');
    cv.addEventListener('pointerdown', e => {
      if (!cur) return; e.preventDefault(); const p = pos(e); cur.G.mouse = p; cur.G.down = true;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      cur.def.down && cur.def.down(cur.G, p);
    });
    cv.addEventListener('pointermove', e => { if (!cur) return; const p = pos(e); cur.G.mouse = p; cur.def.move && cur.def.move(cur.G, p); });
    const up = e => { if (!cur) return; cur.G.down = false; cur.def.up && cur.def.up(cur.G, pos(e)); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    window.addEventListener('keydown', e => {
      if (!cur) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') e.preventDefault();
      if (!e.repeat && cur.def.key) cur.def.key(cur.G, e.code, true);
    });
    window.addEventListener('keyup', e => { if (cur && cur.def.key) cur.def.key(cur.G, e.code, false); });
  }

  function loadImgs(G, def) {
    const list = def.imgs ? def.imgs() : {};
    return Promise.all(Object.entries(list).map(([k, [key, src]]) => new Promise(res => {
      const im = svgImage(key, src); G.img[k] = im;
      if (ready(im)) return res();
      im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true });
      setTimeout(res, 4000);
    })));
  }

  function start(id) {
    if (!cv) setup();
    return new Promise(resolve => {
      const def = DEFS[id];
      let shakeT = 0, flashT = 0, shakeMag = 0;
      let lastHud = '';
      const G = {
        t: 0, s: {}, img: {}, ended: false, mouse: { x: W / 2, y: H / 2 }, down: false, floats: [], parts: [], noteT: 0, noteText: '',
        end(win, msg) {
          if (this.ended) return; this.ended = true; Sound.play(win ? 'win' : 'lose');
          setTimeout(() => { stop(); resolve({ win, msg }); }, win ? 1100 : 800);
        },
        float(text, x, y, color = '#fff3c4', size = 26) { this.floats.push({ text, x: clamp(x, 200, W - 200), y, color, size, t: 0 }); },
        burst(x, y, color, n = 14) { for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(80, 340); this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(.4, .9), t: 0, color, r: rnd(2, 5) }); } },
        shake(v) { shakeT = Math.max(shakeT, v); shakeMag = 10; },
        flash(v) { flashT = v; },
        note(text, secs = 3) { this.noteText = text; this.noteT = secs; },
        hud(html) { if (html !== lastHud) { hudEl.innerHTML = html; lastHud = html; } },
      };
      loadImgs(G, def).then(() => {
        def.init(G);
        cur = { G, def };
        cv.classList.add('show'); hudEl.classList.add('show');
        last = performance.now();
        const frame = now => {
          if (!cur || cur.G !== G) return;
          const dt = Math.min(.05, (now - last) / 1000); last = now; G.t += dt;
          def.update(G, dt);
          G.floats.forEach(f => f.t += dt); G.floats = G.floats.filter(f => f.t < 1.8);
          G.parts.forEach(p => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }); G.parts = G.parts.filter(p => p.t < p.life);
          G.noteT -= dt; shakeT -= dt; flashT -= dt * 1.4;
          ctx.save(); ctx.clearRect(0, 0, W, H);
          if (shakeT > 0) ctx.translate(rnd(-1, 1) * shakeMag * shakeT * 2, rnd(-1, 1) * shakeMag * shakeT * 2);
          def.draw(G, ctx);
          for (const p of G.parts) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
          ctx.globalAlpha = 1;
          for (const f of G.floats) { ctx.globalAlpha = Math.min(1, (1.8 - f.t) * 2); label(f.text, f.x, f.y - f.t * 40, f.size, f.color); }
          ctx.globalAlpha = 1;
          if (G.noteT > 0) drawNote(G.noteText, Math.min(1, G.noteT * 2));
          if (flashT > 0) { ctx.fillStyle = `rgba(255,250,230,${Math.min(1, flashT)})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
          ctx.restore();
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      });
    });
  }

  function drawNote(text, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.font = `600 24px ${SERIF}`;
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > 820) { lines.push(line); line = w; } else line = test; }
    lines.push(line);
    const h = 26 + lines.length * 30, y = H - h - 24;
    ctx.fillStyle = 'rgba(246,231,200,.96)'; rr(W / 2 - 450, y, 900, h, 10); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = INK; ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 36 + i * 30));
    ctx.restore();
  }

  function stop() {
    cancelAnimationFrame(raf); cur = null;
    if (cv) { cv.classList.remove('show'); ctx.clearRect(0, 0, W, H); }
    if (hudEl) { hudEl.classList.remove('show'); hudEl.innerHTML = ''; }
  }

  return { start, stop, get active() { return !!cur; } };
})();
