'use strict';
/* =========================================================
   DUEL — 1v1 battles in 3D.
   Vs computer, two players on one keyboard, or online rooms
   (PeerJS / WebRTC). Best of three rounds; drawn rounds
   don't count, so play continues until someone wins.
   ========================================================= */
const Duel = (() => {
  const T = window.THREE;
  const W = 1280, H = 720, GRAV = 24, R = 14, ROUND_TIME = 75;
  const SERIF = '"Cormorant Garamond", Georgia, serif', DISPLAY = '"Yatra One", "Cormorant Garamond", serif';
  const DEVA = '"Tiro Devanagari Hindi", "Kohinoor Devanagari", serif';
  let K = null, scene = null, camera = null, glCv, hud, hctx, D = null, raf = 0, last = 0, bound = false, PSA, PSN;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const hyp = (x, z) => Math.sqrt(x * x + z * z);
  const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

  /* ---------- the roster ---------- */
  const FIGHTERS = {
    rama: { name: 'Rama', dev: 'राम', rig: 'rama', style: 'archer', scale: 1, speed: 7, blurb: 'Archer · three arrows of divine light',
      sup: { key: 'brahmastra', name: 'Brahmastra', dev: 'ब्रह्मास्त्र', sfx: 'brahmastra', col: '#ffe9a0' } },
    lakshmana: { name: 'Lakshmana', dev: 'लक्ष्मण', rig: 'lakshmana', style: 'archer', scale: 1, speed: 7.4, blurb: 'Archer · five serpent arrows',
      sup: { key: 'shesha', name: 'Shesha Astra', dev: 'शेषास्त्र', sfx: 'serpent', col: '#9be3a4' } },
    hanuman: { name: 'Hanuman', dev: 'हनुमान्', rig: 'hanuman', style: 'brawler', scale: 1.1, speed: 7.2, blurb: 'Mace · grows mountain-tall',
      sup: { key: 'mahima', name: 'Mahima', dev: 'महिमा', sfx: 'mahima', col: '#ffb04a' } },
    sugriva: { name: 'Sugriva', dev: 'सुग्रीव', rig: 'sugriva', style: 'brawler', scale: 1.05, speed: 7.6, blurb: 'Fists · the triple earthquake',
      sup: { key: 'quake', name: 'Kishkindha Quake', dev: 'भूकम्प', sfx: 'quake', col: '#e9c89a' } },
    vali: { name: 'Vali', dev: 'वाली', rig: 'vali', style: 'brawler', scale: 1.12, speed: 7.4, blurb: 'Fists · lightning, and half his foe\'s strength',
      sup: { key: 'vajra', name: 'Indra\'s Vajra', dev: 'वज्र', sfx: 'vajra', col: '#bfe0ff' } },
    ravana: { name: 'Ravana', dev: 'रावण', rig: 'ravana1', style: 'brawler', scale: 1.12, speed: 6.6, blurb: 'Sword · a ring of hellfire',
      sup: { key: 'inferno', name: 'Chandrahasa Inferno', dev: 'चन्द्रहास', sfx: 'ravana', col: '#ff7a3a' } },
  };
  const ARENAS = {
    kishkindha: { name: 'Kishkindha', theme: 'kishkindha' },
    lanka: { name: 'Golden Lanka', theme: 'lanka' },
    battle: { name: 'Battlefield of Lanka', theme: 'battle' },
    ashram: { name: 'Siddhashrama', theme: 'ashram' },
  };
  const ANIMS = ['idle', 'run', 'jump', 'aim', 'punch1', 'punch2', 'swing', 'slam', 'hurt', 'roll', 'roar', 'crouch', 'stand'];

  /* =========================================================
     INPUT
     ========================================================= */
  const keys = {}, prev = {};
  const MAPS = {
    solo: { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], jump: ['Space'], atk: ['KeyJ', 'KeyZ', 'Mouse0'], sup: ['KeyK', 'KeyX'], dodge: ['KeyL', 'ShiftLeft', 'ShiftRight'] },
    p1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], jump: ['Space'], atk: ['KeyF'], sup: ['KeyG'], dodge: ['ShiftLeft'] },
    p2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['Enter', 'Numpad0'], atk: ['KeyL', 'Numpad1'], sup: ['Semicolon', 'Numpad2'], dodge: ['ShiftRight', 'Numpad3'] },
  };
  function readInput(map, ctr) {
    const hd = a => map[a].some(k => keys[k]), ed = a => map[a].some(k => keys[k] && !prev[k]);
    const ix = (hd('right') ? 1 : 0) - (hd('left') ? 1 : 0), iz = (hd('up') ? 1 : 0) - (hd('down') ? 1 : 0);
    const cy = D.camYaw, fx = -Math.sin(cy), fz = -Math.cos(cy), rx = Math.cos(cy), rz = -Math.sin(cy);
    let mx = rx * ix + fx * iz, mz = rz * ix + fz * iz; const l = hyp(mx, mz); if (l > 0) { mx /= l; mz /= l; }
    if (ed('jump')) ctr.jumpN++; if (ed('atk')) ctr.atkN++; if (ed('sup')) ctr.supN++; if (ed('dodge')) ctr.dodgeN++;
    return { mx, mz, atk: hd('atk'), jumpN: ctr.jumpN, atkN: ctr.atkN, supN: ctr.supN, dodgeN: ctr.dodgeN };
  }
  const newCtr = () => ({ jumpN: 0, atkN: 0, supN: 0, dodgeN: 0 });
  const NONE = { mx: 0, mz: 0, atk: false, jumpN: 0, atkN: 0, supN: 0, dodgeN: 0 };

  /* ---------- computer opponent ---------- */
  function aiInput(f, o, dt) {
    const a = f.ai || (f.ai = Object.assign(newCtr(), { t: 0, holdT: 0, strafe: Math.random() < .5 ? 1 : -1, react: 0 }));
    a.t += dt; a.react -= dt;
    const dx = o.x - f.x, dz = o.z - f.z, d = hyp(dx, dz) || 1, ux = dx / d, uz = dz / d;
    const want = f.def.style === 'archer' ? 8 : 1.5;
    let mx = 0, mz = 0;
    if (d > want + 1.2) { mx = ux; mz = uz; } else if (d < want - 2) { mx = -ux; mz = -uz; }
    if (Math.sin(a.t * .7) > .3) { mx += -uz * a.strafe * .7; mz += ux * a.strafe * .7; }
    const l = hyp(mx, mz); if (l > 0) { mx /= l; mz /= l; }
    // dodge incoming danger now and then
    const danger = D.shots.some(s => s.owner !== f.id && hyp(s.x - f.x, s.z - f.z) < 3.2) || (o.atkWind && d < 2.6) || D.hz.some(h => h.type === 'ring' && h.owner !== f.id && Math.abs(hyp(f.x - h.x, f.z - h.z) - h.r) < 1.6);
    if (danger && a.react <= 0) { a.react = .9; if (Math.random() < .55) { if (D.hz.some(h => h.type === 'ring' && h.owner !== f.id)) a.jumpN++; else a.dodgeN++; } }
    if (f.meter >= 100 && Math.random() < dt * 1.2 && d < 12) a.supN++;
    let atk = false;
    if (f.def.style === 'archer') { a.holdT += dt; atk = a.holdT < .62; if (a.holdT > .9) a.holdT = rnd(-.2, .1); }
    else if (d < 2.4 && Math.random() < dt * 6) a.atkN++;
    return { mx, mz, atk, jumpN: a.jumpN, atkN: a.atkN, supN: a.supN, dodgeN: a.dodgeN };
  }

  /* =========================================================
     ARENA
     ========================================================= */
  function buildArena(key) {
    const th = K.THEME3[ARENAS[key].theme];
    scene = new T.Scene();
    scene.fog = new T.Fog(th.fog, 40, 170);
    const sky = K.skyDome(th); scene.add(sky); scene.userData.sky = sky;
    scene.add(new T.HemisphereLight(th.night ? 0x8a8ac8 : 0xfff4dc, th.ground, th.night ? .45 : .32));
    const dir = new T.DirectionalLight(th.night ? 0xb8c4ff : 0xfff0d0, th.night ? .55 : .62);
    dir.position.set(14, 26, 10); dir.castShadow = true; dir.shadow.mapSize.set(2048, 2048);
    const sc = dir.shadow.camera; sc.left = sc.bottom = -20; sc.right = sc.top = 20; sc.near = 1; sc.far = 70; dir.shadow.bias = -.0005;
    scene.add(dir); scene.add(new T.AmbientLight(0xffffff, .12));
    const disc = new T.Mesh(new T.CircleGeometry(th.night ? 12 : 16, 32), K.basic(th.night ? '#fff3c4' : (th.sun || '#fff3c4'), { fog: false }));
    disc.position.set(-120, 110, -260); disc.lookAt(0, 0, 0); scene.add(disc);
    if (th.night) {
      const pts = []; for (let i = 0; i < 500; i++) { const a = rnd(0, Math.PI * 2), b = rnd(.1, 1.4); pts.push(Math.cos(a) * Math.cos(b) * 350, Math.sin(b) * 350, Math.sin(a) * Math.cos(b) * 350); }
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xfff6d8, size: 1.6, sizeAttenuation: false, fog: false })));
    }
    const ground = new T.Mesh(new T.PlaneGeometry(500, 500), new T.MeshToonMaterial({ map: K.groundTex(th), gradientMap: K.GRAD, color: 0xffffff }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    // the duelling circle
    const ring = new T.Mesh(new T.RingGeometry(R - .2, R + .2, 96), K.basic('#f6d77e', { transparent: true, opacity: .55 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .02; scene.add(ring);
    const inner = new T.Mesh(new T.CircleGeometry(R, 64), K.basic(th.night ? '#2a2a40' : '#000000', { transparent: true, opacity: .08 })); inner.rotation.x = -Math.PI / 2; inner.position.y = .015; scene.add(inner);
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2, r = R + rnd(4, 14), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (key === 'kishkindha' && i % 2) K.rock3(scene, x, z, rnd(1.5, 3.5), i % 4 ? '#9a5a2a' : '#b5713a');
      else if (key === 'battle' && i % 3 === 0) K.banner3(scene, x, z, i % 2 ? '#e8891c' : '#3a0a0a');
      else if (key === 'lanka' && i % 3 === 0) K.tower3(scene, x * 1.5, z * 1.5, rnd(10, 18), true);
      else K.tree3(scene, x, z, rnd(.9, 1.5), th, key === 'lanka');
    }
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.mountain3(scene, Math.cos(a) * 160, Math.sin(a) * 160, rnd(40, 80), rnd(30, 55), key === 'kishkindha' ? '#b5713a' : key === 'battle' ? '#4a1a14' : th.night ? '#1e2a3a' : '#7fa874'); }
    PSA = K.makePS(1600, true); PSN = K.makePS(700, false); scene.add(PSA.pts); scene.add(PSN.pts);
  }

  /* ---------- effects (local, never networked directly) ---------- */
  function spark(x, y, z, col, n = 14, sp = 6) { const c = new T.Color(col); for (let i = 0; i < n; i++) K.emit(PSA, { x, y, z, vx: rnd(-sp, sp), vy: rnd(-sp * .3, sp), vz: rnd(-sp, sp), life: rnd(.25, .6), size: rnd(.15, .4), c, grav: 10 }); }
  function dust(x, z, n = 6, s = 1) { const c = new T.Color('#e9dcc0'); for (let i = 0; i < n; i++) K.emit(PSN, { x: x + rnd(-.4, .4) * s, y: .1, z: z + rnd(-.4, .4) * s, vx: rnd(-1.5, 1.5) * s, vy: rnd(.3, 1.4), vz: rnd(-1.5, 1.5) * s, life: rnd(.4, .8), size: rnd(.5, 1) * s, c, a0: .5, grow: 1.4, drag: 2 }); }
  function glow(x, y, z, col, n = 4, spread = .8) { const c = new T.Color(col); for (let i = 0; i < n; i++) { const a = Math.random() * 7; K.emit(PSA, { x: x + Math.cos(a) * spread * Math.random(), y: y + rnd(0, .3), z: z + Math.sin(a) * spread * Math.random(), vy: rnd(1.5, 4), life: rnd(.35, .7), size: rnd(.2, .45), c }); } }
  const fxList = [];
  function ringFlash(x, z, r, col) { const m = new T.Mesh(K.geo('dring', () => new T.RingGeometry(.86, 1, 64)), K.basic(col, { transparent: true, opacity: .9, side: T.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, .08, z); scene.add(m); fxList.push({ m, t: 0, life: .45, r }); }

  /* events: applied locally and (as host) forwarded to the guest */
  function ev(e) { applyEvent(e); if (D.mode === 'host') D.evq.push(e); }
  function applyEvent(e) {
    switch (e.k) {
      case 'sfx': Sound.play(e.n); break;
      case 'spark': spark(e.x, e.y, e.z, e.c, e.n || 14); break;
      case 'dust': dust(e.x, e.z, e.n || 6, e.s || 1); break;
      case 'ring': ringFlash(e.x, e.z, e.r, e.c); break;
      case 'text': D.texts.push({ text: e.text, x: e.x, y: e.y, z: e.z, col: e.c || '#fff', size: e.size || 24, t: 0 }); break;
      case 'shake': D.shake = Math.max(D.shake, e.v); break;
      case 'super': D.superCast = { t: 0, f: e.f }; D.flash = .35; Sound.play(FIGHTERS[D.f[e.f].char].sup.sfx); break;
      case 'banner': D.banner = { text: e.text, sub: e.sub, t: 0, dur: e.dur || 2 }; if (e.sfx) Sound.play(e.sfx); break;
      case 'flash': D.flash = e.v; break;
    }
  }

  /* =========================================================
     FIGHTERS
     ========================================================= */
  function makeFighter(id, char) {
    const def = FIGHTERS[char], J = K.buildFigure(def.rig);
    if (J.bow) { const [a, b] = J.bow.g.userData.tips; J.bow.g.add(new T.Line(new T.BufferGeometry().setFromPoints([a, b]), new T.LineBasicMaterial({ color: 0xf3ead2 }))); }
    scene.add(J.root);
    return { id, char, def, J, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, scale: def.scale, base: def.scale, hp: 100, meter: 0, inv: 0, cool: 0, dodgeCD: 0, hurtT: 0,
      charge: 0, aiming: false, atk: null, rolling: false, rollT: 0, onG: true, giant: 0, buff: 0, anim: 'idle', at: 0, flash: 0, seen: newCtr(), r: .45, h: 1.9 };
  }
  function placeFighters() {
    const [a, b] = D.f;
    a.x = -6; a.z = 0; a.yaw = Math.PI / 2; b.x = 6; b.z = 0; b.yaw = -Math.PI / 2;
    for (const f of D.f) Object.assign(f, { y: 0, vx: 0, vy: 0, vz: 0, hp: 100, inv: 0, cool: 0, hurtT: 0, aiming: false, atk: null, rolling: false, giant: 0, buff: 0, scale: f.base, slamming: false, J: f.J });
    for (const f of D.f) f.J.pivot.rotation.set(0, 0, 0);
    D.camYaw = 0; D.camPitch = .36;
  }
  const chest = f => ({ x: f.x, y: f.y + 1.2 * f.scale, z: f.z });
  const fwd = f => ({ x: Math.sin(f.yaw), z: Math.cos(f.yaw) });

  function damage(t, dmg, from, knock = 3, opts = {}) {
    if (D.phase !== 'fight' || t.inv > 0 || t.hp <= 0) return false;
    const att = D.f[1 - t.id];
    if (att.buff > 0) dmg *= 1.5;
    if (att.giant > 0) dmg *= 1.6;
    if (t.giant > 0) dmg *= .5;
    t.hp = Math.max(0, t.hp - dmg); t.flash = .1; t.inv = opts.inv != null ? opts.inv : .35;
    att.meter = Math.min(100, att.meter + dmg * 1.4); t.meter = Math.min(100, t.meter + dmg * .7);
    const c = chest(t);
    ev({ k: 'spark', x: c.x, y: c.y, z: c.z, c: dmg >= 10 ? '#ffd76a' : '#ff8a5a', n: dmg >= 10 ? 26 : 12 });
    ev({ k: 'text', text: String(Math.round(dmg)), x: c.x, y: c.y + 1, z: c.z, c: dmg >= 10 ? '#ffd76a' : '#ffffff', size: dmg >= 10 ? 32 : 24 });
    ev({ k: 'sfx', n: 'hit' }); if (dmg >= 10) ev({ k: 'shake', v: .35 });
    D.hitstop = Math.max(D.hitstop, dmg >= 10 ? .1 : .05);
    if (t.giant <= 0) {
      const dx = t.x - from.x, dz = t.z - from.z, d = hyp(dx, dz) || 1;
      t.vx = dx / d * knock; t.vz = dz / d * knock; t.hurtT = knock > 6 ? .5 : .28; t.aiming = false; t.atk = null;
      if (knock > 6) { t.vy = 6; t.onG = false; }
    }
    return true;
  }

  function fighterUpdate(f, o, inp, dt) {
    const edge = n => { const v = inp[n] - f.seen[n]; f.seen[n] = inp[n]; return v > 0; };
    const jumpP = edge('jumpN'), atkP = edge('atkN'), supP = edge('supN'), dodgeP = edge('dodgeN');
    f.inv -= dt; f.cool -= dt; f.dodgeCD -= dt; f.hurtT -= dt; f.flash -= dt; f.at += dt; f.giant -= dt; f.buff -= dt;
    const live = D.phase === 'fight' && f.hp > 0 && !(D.superCast && D.superCast.f !== f.id && D.superCast.t < .9);
    const ml = hyp(inp.mx, inp.mz);
    if (f.rolling) {
      f.rollT += dt; f.vx = f.rdx * 13; f.vz = f.rdz * 13; f.J.pivot.rotation.x = f.rollT / .42 * Math.PI * 2;
      if (f.rollT > .42) { f.rolling = false; f.J.pivot.rotation.x = 0; }
    } else if (f.hurtT <= 0 && live) {
      const busy = f.atk && f.atk.lock;
      const spd = (f.aiming ? 3.2 : f.def.speed) * (busy ? .2 : 1);
      f.vx = lerp(f.vx, inp.mx * spd, Math.min(1, dt * 12)); f.vz = lerp(f.vz, inp.mz * spd, Math.min(1, dt * 12));
      if (ml > 0 && !f.aiming && !busy) f.yaw += angDiff(f.yaw, Math.atan2(inp.mx, inp.mz)) * Math.min(1, dt * 12);
      if (jumpP && f.onG && !busy) { f.vy = 9.5; f.onG = false; ev({ k: 'dust', x: f.x, z: f.z, n: 5 }); }
      if (dodgeP && f.onG && f.dodgeCD <= 0) { const d = ml > 0 ? { x: inp.mx, z: inp.mz } : fwd(f); f.rolling = true; f.rollT = 0; f.rdx = d.x; f.rdz = d.z; f.inv = Math.max(f.inv, .42); f.dodgeCD = .8; f.aiming = false; f.atk = null; f.yaw = Math.atan2(d.x, d.z); ev({ k: 'dust', x: f.x, z: f.z, n: 8 }); }
      if (supP && f.meter >= 100 && !D.superCast) startSuper(f, o);
      if (f.def.style === 'archer') archer(f, o, inp, atkP, dt); else brawler(f, o, atkP, dt);
    } else { f.vx *= .9; f.vz *= .9; if (!live) { f.aiming = false; } }
    f.vy -= GRAV * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
    if (f.y <= 0) { const was = f.onG; f.y = 0; f.vy = 0; f.onG = true; if (!was && f.slamming) slamLand(f, o); if (!was) ev({ k: 'dust', x: f.x, z: f.z, n: 4 }); } else f.onG = false;
    const d = hyp(f.x, f.z); if (d > R - .5) { f.x *= (R - .5) / d; f.z *= (R - .5) / d; }
    // don't stand inside each other
    const dx = f.x - o.x, dz = f.z - o.z, dd = hyp(dx, dz), m = (f.r + o.r) * Math.max(f.scale, 1);
    if (dd < m && dd > 0) { f.x += dx / dd * (m - dd) * .5; f.z += dz / dd * (m - dd) * .5; }
    f.scale = lerp(f.scale, f.giant > 0 ? 1.9 : f.base, Math.min(1, dt * 5)); f.h = 1.9 * f.scale; f.r = .45 * f.scale;
    if (f.hp <= 0) f.anim = 'hurt';
    else f.anim = f.rolling ? 'roll' : f.hurtT > 0 ? 'hurt' : f.atk ? f.atk.anim : f.slamming ? 'slam' : f.aiming ? 'aim' : !f.onG ? 'jump' : hyp(f.vx, f.vz) > 1 ? 'run' : 'idle';
    f.atkWind = !!(f.atk && f.atk.t < f.atk.on[0]);
  }

  function archer(f, o, inp, atkP, dt) {
    if (atkP) f.buf = .3;
    f.buf = (f.buf || 0) - dt;
    if ((f.buf > 0 || inp.atk) && f.cool <= 0 && !f.aiming) { f.aiming = true; f.charge = 0; f.buf = 0; }
    if (!f.aiming) return;
    f.charge += dt;
    const c = chest(o), sy = f.y + 1.45 * f.scale, hd = hyp(c.x - f.x, c.z - f.z);
    f.yaw += angDiff(f.yaw, Math.atan2(c.x - f.x, c.z - f.z)) * Math.min(1, dt * 16);
    f.aimUp = clamp(Math.atan2(c.y - sy, hd), -.6, 1.2); f.drawK = Math.min(1, .3 + f.charge / .55 * .7);
    if (!inp.atk) {
      const big = f.charge >= .55, sp = big ? 44 : 36;
      const dx = Math.sin(f.yaw) * Math.cos(f.aimUp), dy = Math.sin(f.aimUp), dz = Math.cos(f.yaw) * Math.cos(f.aimUp);
      shoot({ k: big ? 'bigArrow' : 'arrow', owner: f.id, x: f.x + dx * .7, y: sy, z: f.z + dz * .7, vx: dx * sp, vy: dy * sp, vz: dz * sp, dmg: big ? 11 : 5, r: big ? .35 : .25, pierce: big, turn: big ? 1.4 : 2.4, knock: big ? 7 : 3 });
      ev({ k: 'sfx', n: big ? 'conch' : 'arrow' });
      f.aiming = false; f.cool = .26; f.charge = 0;
    }
  }

  const COMBO = [
    { anim: 'punch1', dur: .26, on: [.07, .16], dmg: 6, knock: 3, reach: 1.8 },
    { anim: 'punch2', dur: .26, on: [.07, .16], dmg: 6, knock: 3, reach: 1.8 },
    { anim: 'swing', dur: .46, on: [.16, .3], dmg: 12, knock: 11, reach: 2.5, swing: true },
  ];
  function brawler(f, o, atkP, dt) {
    if (f.atk) {
      const a = f.atk; a.t += dt;
      if (a.swing) f.swingK = a.t / a.dur * 1.4;
      if (atkP && a.t > .1 && a.i < 2) a.queued = true;
      if (a.t >= a.on[0] && a.t <= a.on[1] && !a.hit) {
        const dx = o.x - f.x, dz = o.z - f.z, d = hyp(dx, dz), fw = fwd(f);
        if (d < a.reach * f.scale + o.r && (fw.x * dx + fw.z * dz) / (d || 1) > .3 && Math.abs(o.y - f.y) < 1.6 * Math.max(f.scale, o.scale)) { a.hit = true; damage(o, a.dmg, f, a.knock); }
        if (a.swing && !a.sfx) { a.sfx = true; ev({ k: 'sfx', n: 'arrow' }); }
      }
      if (a.t >= a.dur) { f.atk = null; if (a.queued) combo(f, o, a.i + 1); }
      return;
    }
    if (f.slamming) return;
    if (atkP) { if (!f.onG) { f.slamming = true; f.vy = -26; f.vx *= .3; f.vz *= .3; } else combo(f, o, 0); }
  }
  function combo(f, o, i) {
    f.atk = Object.assign({ i, t: 0, lock: true }, COMBO[i]);
    const d = hyp(o.x - f.x, o.z - f.z); if (d < 5) f.yaw = Math.atan2(o.x - f.x, o.z - f.z);
    const fw = fwd(f); f.vx = fw.x * 3; f.vz = fw.z * 3; ev({ k: 'sfx', n: 'flip' });
  }
  function slamLand(f, o) {
    f.slamming = false; ev({ k: 'shake', v: .4 }); ev({ k: 'sfx', n: 'thunder' }); ev({ k: 'dust', x: f.x, z: f.z, n: 18, s: 2 }); ev({ k: 'ring', x: f.x, z: f.z, r: 3.4 * f.scale, c: '#ffe9a0' });
    if (hyp(o.x - f.x, o.z - f.z) < 3.4 * f.scale + o.r && o.y < 1.5) damage(o, 10, f, 9);
  }

  /* ---------- super modes ---------- */
  function startSuper(f, o) {
    f.meter = 0; f.aiming = false; f.atk = null;
    ev({ k: 'super', f: f.id }); ev({ k: 'ring', x: f.x, z: f.z, r: 4, c: f.def.sup.col });
    const key = f.def.sup.key;
    const at = (dt, fn) => D.timers.push({ at: D.t + dt, fn });
    if (key === 'brahmastra') at(.9, () => [-1, 0, 1].forEach((s, i) => at(i * .16, () => {
      const a = f.yaw + s * .55;
      shoot({ k: 'light', owner: f.id, x: f.x + Math.cos(f.yaw) * s * .8, y: f.y + 1.5 + (s ? 0 : .6), z: f.z - Math.sin(f.yaw) * s * .8, vx: Math.sin(a) * 24, vy: 3, vz: Math.cos(a) * 24, dmg: 12, r: .5, turn: 3.2, knock: 8, life: 3 });
      ev({ k: 'sfx', n: 'bell' });
    })));
    if (key === 'shesha') at(.9, () => { for (let i = -2; i <= 2; i++) { const a = f.yaw + i * .32; shoot({ k: 'serpent', owner: f.id, x: f.x, y: f.y + 1.4, z: f.z, vx: Math.sin(a) * 21, vy: 0, vz: Math.cos(a) * 21, dmg: 7, r: .45, turn: 1.7, knock: 4, weave: i, life: 3 }); } ev({ k: 'sfx', n: 'arrow' }); });
    if (key === 'mahima') at(.9, () => { f.giant = 7; hazard({ type: 'ring', owner: f.id, x: f.x, z: f.z, r: .5, sp: 9, dmg: 12, hgt: .8, life: 1.6, col: '#ffb04a' }); ev({ k: 'shake', v: .6 }); });
    if (key === 'quake') { at(.6, () => { f.vy = 13; f.onG = false; }); [1.4, 1.75, 2.1].forEach(t => at(t, () => { hazard({ type: 'ring', owner: f.id, x: f.x, z: f.z, r: .5, sp: 9.5, dmg: 10, hgt: .8, life: 1.7, col: '#e9c89a' }); ev({ k: 'shake', v: .5 }); ev({ k: 'sfx', n: 'thunder' }); ev({ k: 'dust', x: f.x, z: f.z, n: 20, s: 2.5 }); })); }
    if (key === 'vajra') { at(.9, () => { f.buff = 6; ev({ k: 'text', text: 'Half his foe\'s strength is now his!', x: f.x, y: f.y + 2.6, z: f.z, c: '#bfe0ff', size: 24 }); }); [.9, 1.4, 1.9].forEach(t => at(t, () => hazard({ type: 'bolt', owner: f.id, x: o.x + o.vx * .3, z: o.z + o.vz * .3, r: 1.7, delay: .55, dmg: 13, life: .9, col: '#bfe0ff' }))); }
    if (key === 'inferno') at(.9, () => { hazard({ type: 'ring', owner: f.id, x: f.x, z: f.z, r: .5, sp: 8.5, dmg: 14, hgt: .9, life: 1.8, col: '#ff7a3a', fire: true }); for (let i = -1; i <= 1; i++) { const a = f.yaw + i * .6; shoot({ k: 'fireball', owner: f.id, x: f.x, y: f.y + 1.6, z: f.z, vx: Math.sin(a) * 15, vy: 1, vz: Math.cos(a) * 15, dmg: 6, r: .5, turn: 2.2, knock: 4, life: 3 }); } ev({ k: 'shake', v: .5 }); });
  }

  /* =========================================================
     PROJECTILES & HAZARDS (simulated by host / local)
     ========================================================= */
  let nextId = 1;
  function shoot(o) { o = Object.assign({ id: nextId++, t: 0, life: 2.5, hit: false }, o); D.shots.push(o); }
  function hazard(h) { h = Object.assign({ id: nextId++, t: 0, hit: false }, h); D.hz.push(h); }

  function simShots(dt) {
    for (const s of D.shots) {
      s.t += dt;
      const tgt = D.f[1 - s.owner];
      if (s.turn && tgt.hp > 0 && s.t > .06) {
        const c = chest(tgt), sp = Math.hypot(s.vx, s.vy, s.vz), dx = c.x - s.x, dy = c.y - s.y, dz = c.z - s.z, L = Math.hypot(dx, dy, dz) || 1, k = Math.min(1, s.turn * dt);
        s.vx = lerp(s.vx, dx / L * sp, k); s.vy = lerp(s.vy, dy / L * sp, k); s.vz = lerp(s.vz, dz / L * sp, k);
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      if (s.weave) { const px = -s.vz, pz = s.vx, pl = hyp(px, pz) || 1, w = Math.cos(s.t * 12 + s.weave) * 4 * dt; s.x += px / pl * w; s.z += pz / pl * w; }
      if (s.t > s.life || s.y < -.2 || hyp(s.x, s.z) > R + 12) { s.dead = true; continue; }
      if (hyp(s.x - tgt.x, s.z - tgt.z) < tgt.r + s.r && s.y > tgt.y - .2 && s.y < tgt.y + tgt.h + .2 && !s.hit) {
        if (damage(tgt, s.dmg, s, s.knock || 3) || !s.pierce) {
          if (!s.pierce) s.dead = true; s.hit = true;
          if (s.k === 'light' || s.k === 'serpent') { ev({ k: 'ring', x: tgt.x, z: tgt.z, r: 3, c: s.k === 'light' ? '#ffe9a0' : '#9be3a4' }); ev({ k: 'spark', x: s.x, y: s.y, z: s.z, c: '#fff3c4', n: 30 }); }
        }
      }
      // arrows can shoot each other down
      for (const p of D.shots) if (p !== s && p.owner !== s.owner && !p.dead && !s.dead && Math.hypot(p.x - s.x, p.y - s.y, p.z - s.z) < p.r + s.r + .15 && s.k !== 'light' && p.k !== 'light') { p.dead = s.dead = true; ev({ k: 'spark', x: s.x, y: s.y, z: s.z, c: '#ff9a3a', n: 8 }); }
    }
    D.shots = D.shots.filter(s => !s.dead);
    for (const h of D.hz) {
      h.t += dt;
      const tgt = D.f[1 - h.owner];
      if (h.type === 'ring') {
        h.r += h.sp * dt;
        if (!h.hit && Math.abs(hyp(tgt.x - h.x, tgt.z - h.z) - h.r) < .55 + tgt.r && tgt.y < h.hgt) { h.hit = true; damage(tgt, h.dmg, h, 7); }
      } else if (h.type === 'bolt' && !h.hit && h.t >= h.delay) {
        h.hit = true; ev({ k: 'flash', v: .4 }); ev({ k: 'sfx', n: 'vajra' }); ev({ k: 'spark', x: h.x, y: .3, z: h.z, c: '#e6f2ff', n: 34 }); ev({ k: 'shake', v: .45 });
        if (hyp(tgt.x - h.x, tgt.z - h.z) < h.r + tgt.r) damage(tgt, h.dmg, h, 6);
      }
      if (h.t > h.life) h.dead = true;
    }
    D.hz = D.hz.filter(h => !h.dead);
  }

  /* ---------- meshes for shots & hazards (host and guest alike) ---------- */
  const meshes = new Map();
  function shotMesh(k) {
    const g = new T.Group();
    if (k === 'light' || k === 'serpent') {
      const col = k === 'light' ? '#ffe9a0' : '#9be3a4';
      g.add(new T.Mesh(K.SPH(.15, 10, 8), K.basic('#ffffff'))).scale.set(1, 1, 5);
      const gl = new T.Mesh(K.SPH(.42, 10, 8), K.basic(col, { transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false })); gl.scale.set(1, 1, 3.2); g.add(gl);
      g.add(new T.PointLight(new T.Color(col).getHex(), 1.4, 6));
    } else if (k === 'fireball') {
      g.add(new T.Mesh(K.SPH(.35, 10, 8), K.basic('#ffd76a'))); g.add(new T.Mesh(K.SPH(.6, 10, 8), K.basic('#f2702b', { transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false })));
    } else {
      const big = k === 'bigArrow';
      const sh = new T.Mesh(K.CYL(.018, .018, big ? 1.4 : 1, 5), big ? K.basic('#fff1a8') : K.toon('#6e4416')); sh.rotation.x = Math.PI / 2; g.add(sh);
      const tip = new T.Mesh(K.CONE(.05, .16, 6), big ? K.basic('#fff7d0') : K.toon('#d9dde2')); tip.rotation.x = Math.PI / 2; tip.position.z = big ? .75 : .55; g.add(tip);
      const fl = new T.Mesh(K.BOX(.12, .005, .18), K.basic('#b8321f')); fl.position.z = big ? -.65 : -.45; g.add(fl);
      if (big) { const gl = new T.Mesh(K.SPH(.18, 8, 6), K.basic('#ffe9a0', { transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false })); gl.position.z = .5; gl.scale.set(1, 1, 3); g.add(gl); }
    }
    scene.add(g); return g;
  }
  function hazardMesh(h) {
    const m = new T.Mesh(K.geo('dring', () => new T.RingGeometry(.86, 1, 64)), K.basic(h.col || '#ffd9a0', { transparent: true, opacity: .85, side: T.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(h.x, .07, h.z); scene.add(m); return m;
  }
  function syncMeshes(shots, hz, dt) {
    const alive = new Set();
    for (const s of shots) {
      alive.add(s.id);
      let m = meshes.get(s.id); if (!m) { m = shotMesh(s.k); meshes.set(s.id, m); }
      m.position.set(s.x, s.y, s.z); m.lookAt(s.x + s.vx, s.y + s.vy, s.z + s.vz);
      if (s.k === 'light' || s.k === 'serpent') for (let i = 0; i < 3; i++) K.emit(PSA, { x: s.x + rnd(-.1, .1), y: s.y + rnd(-.1, .1), z: s.z + rnd(-.1, .1), life: rnd(.25, .5), size: rnd(.25, .5), c: new T.Color(i ? (s.k === 'light' ? '#ffe9a0' : '#9be3a4') : '#ffffff') });
      if (s.k === 'fireball') K.emit(PSA, { x: s.x, y: s.y, z: s.z, vy: 1.5, life: .5, size: .6, fire: true });
    }
    for (const h of hz) {
      alive.add(h.id);
      let m = meshes.get(h.id); if (!m) { m = hazardMesh(h); meshes.set(h.id, m); }
      if (h.type === 'ring') { m.scale.setScalar(Math.max(.1, h.r)); m.material.opacity = .85 * (1 - h.t / h.life); if (h.fire) for (let i = 0; i < 6; i++) { const a = Math.random() * 7; K.emit(PSA, { x: h.x + Math.cos(a) * h.r, y: .1, z: h.z + Math.sin(a) * h.r, vy: rnd(2, 4), life: .5, size: .7, fire: true }); } }
      else { m.scale.setScalar(h.r); m.material.opacity = h.t < h.delay ? .4 + Math.sin(h.t * 30) * .3 : .1; }
    }
    for (const [id, m] of meshes) if (!alive.has(id)) { scene.remove(m); meshes.delete(id); }
    for (const fx of fxList) { fx.t += dt; const k = fx.t / fx.life; fx.m.scale.setScalar(fx.r * k); fx.m.material.opacity = (1 - k) * .9; if (fx.t > fx.life) { fx.dead = true; scene.remove(fx.m); } }
    for (let i = fxList.length - 1; i >= 0; i--) if (fxList[i].dead) fxList.splice(i, 1);
    // lightning bolts as glowing columns
    for (const h of hz) if (h.type === 'bolt' && h.t >= h.delay && h.t < h.delay + .25) for (let i = 0; i < 8; i++) K.emit(PSA, { x: h.x + rnd(-.25, .25), y: rnd(0, 14), z: h.z + rnd(-.25, .25), life: .2, size: rnd(.4, .8), c: new T.Color('#e6f2ff') });
  }

  /* =========================================================
     ROUNDS
     ========================================================= */
  function roundStart() {
    placeFighters(); D.shots = []; D.hz = []; D.timers = []; D.superCast = null;
    D.timer = ROUND_TIME; D.phase = 'intro'; D.phaseT = 0;
    const sd = D.round > 3;
    ev({ k: 'banner', text: sd ? `Round ${D.round} · Sudden Death` : `Round ${D.round}`, sub: sd ? 'The next victory takes the duel' : 'Best of three', dur: 2.2, sfx: 'round' });
  }
  function roundEnd(winner) {
    D.phase = 'ko'; D.phaseT = 0; D.lastWinner = winner;
    if (winner >= 0) { D.wins[winner]++; ev({ k: 'banner', text: winner === -1 ? 'Draw' : `${D.f[winner].def.name} wins the round!`, sub: D.timer <= 0 ? 'Time!' : 'K.O.', dur: 2.6, sfx: 'ko' }); }
    else ev({ k: 'banner', text: 'Draw!', sub: 'This round does not count', dur: 2.6, sfx: 'ko' });
    ev({ k: 'flash', v: .5 });
  }
  function phaseUpdate(dt) {
    D.phaseT += dt;
    if (D.phase === 'intro' && D.phaseT > 2.2) { D.phase = 'fight'; D.phaseT = 0; ev({ k: 'banner', text: 'FIGHT!', dur: 1, sfx: 'bell' }); }
    else if (D.phase === 'fight') {
      D.timer -= dt;
      const [a, b] = D.f;
      if (a.hp <= 0 || b.hp <= 0) roundEnd(a.hp <= 0 && b.hp <= 0 ? -1 : a.hp <= 0 ? 1 : 0);
      else if (D.timer <= 0) { D.timer = 0; roundEnd(Math.abs(a.hp - b.hp) < .5 ? -1 : a.hp > b.hp ? 0 : 1); }
    } else if (D.phase === 'ko' && D.phaseT > 3) {
      if (D.wins[0] >= 2 || D.wins[1] >= 2) { D.phase = 'end'; D.phaseT = 0; const w = D.wins[0] >= 2 ? 0 : 1; D.winner = w; ev({ k: 'banner', text: `${D.f[w].def.name} wins the duel!`, sub: `${D.wins[0]} – ${D.wins[1]}`, dur: 99, sfx: 'win' }); }
      else { D.round++; roundStart(); }
    } else if (D.phase === 'end' && D.phaseT > 3.2 && !D.reported) { D.reported = true; if (D.onEnd) D.onEnd({ winner: D.winner, wins: D.wins.slice() }); }
  }

  /* =========================================================
     MAIN LOOP
     ========================================================= */
  function simulate(dtReal) {
    if (D.hitstop > 0) { D.hitstop -= dtReal; return; }
    if (D.superCast) D.superCast.t += dtReal;
    const slow = D.superCast && D.superCast.t < .9 ? .3 : D.phase === 'ko' && D.phaseT < 1.2 ? .3 : 1;
    const dt = dtReal * slow; D.t += dt;
    if (D.superCast && D.superCast.t > 2) D.superCast = null;
    for (let i = D.timers.length - 1; i >= 0; i--) if (D.t >= D.timers[i].at) { const tm = D.timers.splice(i, 1)[0]; tm.fn(); }
    const [a, b] = D.f;
    const inA = inputFor(0, dt), inB = inputFor(1, dt);
    fighterUpdate(a, b, inA, dt); fighterUpdate(b, a, inB, dt);
    simShots(dt);
    phaseUpdate(dtReal);
    if (D.superCast) { const f = D.f[D.superCast.f]; if (D.superCast.t < 1.1) { glow(f.x, f.y, f.z, f.def.sup.col, 6, 1.1 * f.scale); if (f.def.style === 'archer' && f.onG) f.y = Math.min(.7, f.y + dtReal * 2); } }
    for (const f of D.f) if (f.buff > 0) glow(f.x, f.y + .5, f.z, '#bfe0ff', 1, .6);
  }
  function inputFor(i, dt) {
    const m = D.mode;
    if (m === 'ai') return i === 0 ? readInput(MAPS.solo, D.ctr[0]) : aiInput(D.f[1], D.f[0], dt);
    if (m === 'local') return readInput(i === 0 ? MAPS.p1 : MAPS.p2, D.ctr[i]);
    if (m === 'host') return i === 0 ? readInput(MAPS.solo, D.ctr[0]) : (D.remoteIn || NONE);
    return NONE;
  }

  function frame(now) {
    if (!D) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    step(dt);
  }
  function step(dt) {
    if (D.mode === 'client') clientStep(dt);
    else if (!D.paused) {
      simulate(dt);
      if (D.mode === 'host') { D.sendT -= dt; if (D.sendT <= 0) { D.sendT = 1 / 30; sendSnapshot(); } }
    }
    animate(dt); camUpdate(dt);
    K.psUpdate(PSA, dt); K.psUpdate(PSN, dt);
    syncMeshes(D.shots, D.hz, dt);
    K.renderer.render(scene, camera);
    drawHUD(dt);
    for (const k in keys) prev[k] = keys[k];
  }

  function animate(dt) {
    for (const f of D.f) {
      const J = f.J;
      J.root.position.set(f.x, f.y, f.z); J.root.rotation.y = f.yaw; J.root.scale.setScalar(f.scale);
      if (f.hp <= 0 && D.phase !== 'intro') { J.pivot.rotation.x = lerp(J.pivot.rotation.x, -Math.PI / 2, Math.min(1, dt * 6)); J.pivot.position.y = lerp(J.pivot.position.y, .2, dt * 6); }
      else if (!f.rolling) { J.pivot.rotation.x = lerp(J.pivot.rotation.x, 0, Math.min(1, dt * 10)); J.pivot.position.y = lerp(J.pivot.position.y, .5, dt * 10); }
      f.at += 0;
      K.applyPose(J, (K.POSE[f.anim] || K.POSE.idle)(f.at, f), Math.min(1, dt * (f.anim === 'run' ? 22 : 14)));
      if (J.tail) J.tail.forEach((s, i) => { if (i) s.rotation.x = -.22 + Math.sin(D.t * 3 + i * .6) * .12; });
      // flash white when struck
      const on = f.flash > 0;
      if (f.flashing !== on) { f.flashing = on; for (const m of J.meshes) { if (on) { m.userData.mat = m.material; m.material = K.basic('#fff6e6'); } else if (m.userData.mat) m.material = m.userData.mat; } }
      if (f.giant > 0) glow(f.x, f.y, f.z, '#ffb04a', 2, 1.2 * f.scale);
    }
  }

  /* ---------- camera: frames both fighters; full 360° orbit by mouse or touch ---------- */
  function camUpdate(dt) {
    const [a, b] = D.f, c = D.superCast;
    D.camManual -= dt;
    if (keys.KeyQ) { D.camYaw += dt * 2.2; D.camManual = 2; } if (keys.KeyE) { D.camYaw -= dt * 2.2; D.camManual = 2; }
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, dx = b.x - a.x, dz = b.z - a.z, sep = hyp(dx, dz);
    // keep both fighters side-on to the camera unless the player is steering it
    if (D.camManual <= 0 && D.mode !== 'local') { const ideal = Math.atan2(dx, dz) + Math.PI / 2; const alt = ideal + Math.PI; D.camYaw += angDiff(D.camYaw, Math.abs(angDiff(D.camYaw, ideal)) < Math.abs(angDiff(D.camYaw, alt)) ? ideal : alt) * Math.min(1, dt * .8); }
    if (D.mode === 'local' && D.camManual <= 0) { const ideal = Math.atan2(dx, dz) + Math.PI / 2; const alt = ideal + Math.PI; D.camYaw += angDiff(D.camYaw, Math.abs(angDiff(D.camYaw, ideal)) < Math.abs(angDiff(D.camYaw, alt)) ? ideal : alt) * Math.min(1, dt * .8); }
    const big = Math.max(a.scale, b.scale);
    let dist = clamp(sep * .78 + 6, 7.5, 17) + (big - 1) * 3, p = D.camPitch, tx = mx, ty = 1.2 + (big - 1) * .8, tz = mz;
    let px = tx + Math.sin(D.camYaw) * Math.cos(p) * dist, py = ty + Math.sin(p) * dist, pz = tz + Math.cos(D.camYaw) * Math.cos(p) * dist, lx = tx, ly = ty, lz = tz;
    if (c && c.t < 1.1) { const f = D.f[c.f], ang = f.yaw + Math.PI * .75 + c.t * .5, r = 3.4 * f.scale; px = f.x + Math.sin(ang) * r; py = f.y + 1.3 * f.scale; pz = f.z + Math.cos(ang) * r; lx = f.x; ly = f.y + 1.4 * f.scale; lz = f.z; }
    const k = Math.min(1, dt * (c && c.t < 1.1 ? 5 : 6));
    D.cam.x = lerp(D.cam.x, px, k); D.cam.y = lerp(D.cam.y, Math.max(.6, py), k); D.cam.z = lerp(D.cam.z, pz, k);
    D.look.x = lerp(D.look.x, lx, k); D.look.y = lerp(D.look.y, ly, k); D.look.z = lerp(D.look.z, lz, k);
    const sh = D.shake * .45; D.shake = Math.max(0, D.shake - dt);
    camera.position.set(D.cam.x + rnd(-sh, sh), D.cam.y + rnd(-sh, sh), D.cam.z + rnd(-sh, sh)); camera.lookAt(D.look.x, D.look.y, D.look.z);
    scene.userData.sky.position.copy(camera.position);
  }

  /* =========================================================
     HUD
     ========================================================= */
  const proj = p => { const v = new T.Vector3(p.x, p.y, p.z).project(camera); return { x: (v.x + 1) * W / 2, y: (1 - v.y) * H / 2, vis: v.z < 1 }; };
  function label(text, x, y, size = 22, color = '#fff3c4', font = SERIF, align = 'center') {
    const g = hctx; g.save(); g.font = `700 ${size}px ${font}`; g.textAlign = align; g.lineWidth = 5; g.strokeStyle = 'rgba(30,10,5,.9)';
    g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y); g.restore();
  }
  function drawHUD(dt) {
    const g = hctx; g.clearRect(0, 0, W, H);
    for (const t of D.texts) { t.t += dt; const p = proj({ x: t.x, y: t.y + t.t, z: t.z }); if (p.vis) { g.globalAlpha = Math.min(1, (1.4 - t.t) * 2); label(t.text, p.x, p.y, t.size, t.col); } }
    g.globalAlpha = 1; D.texts = D.texts.filter(t => t.t < 1.4);
    // fighter panels
    D.f.forEach((f, i) => {
      const left = i === 0, x0 = left ? 24 : W - 24 - 470;
      g.fillStyle = 'rgba(17,22,58,.72)'; g.fillRect(x0, 14, 470, 92); g.strokeStyle = GOLD; g.lineWidth = 2; g.strokeRect(x0, 14, 470, 92);
      const tag = D.mode === 'ai' ? (i === 0 ? 'You' : 'Computer') : D.mode === 'local' ? `Player ${i + 1}` : (i === D.me ? 'You' : 'Opponent');
      label(f.def.name, left ? x0 + 14 : x0 + 456, 44, 26, '#ffe9a8', DISPLAY, left ? 'left' : 'right');
      label(`${f.def.dev} · ${tag}`, left ? x0 + 14 + 150 : x0 + 456 - 150, 42, 17, '#c9b98a', SERIF, left ? 'left' : 'right');
      const bw = 442, bx = x0 + 14, hpK = clamp(f.hp / 100, 0, 1);
      g.fillStyle = 'rgba(20,8,4,.8)'; g.fillRect(bx, 54, bw, 18);
      g.fillStyle = f.hp < 30 ? '#e83a2a' : '#4fbf6a'; if (left) g.fillRect(bx, 54, bw * hpK, 18); else g.fillRect(bx + bw * (1 - hpK), 54, bw * hpK, 18);
      g.fillStyle = 'rgba(20,8,4,.8)'; g.fillRect(bx, 78, bw, 10);
      const mk = f.meter / 100; g.fillStyle = f.meter >= 100 ? `hsl(45,100%,${55 + Math.sin(D.t * 10) * 15}%)` : '#d4a017';
      if (left) g.fillRect(bx, 78, bw * mk, 10); else g.fillRect(bx + bw * (1 - mk), 78, bw * mk, 10);
      if (f.meter >= 100) { const kk = D.mode === 'local' ? (i === 0 ? 'G' : ';') : 'K'; label(`${kk} — ${f.def.sup.name}!`, left ? bx : bx + bw, 102, 15, f.def.sup.col, SERIF, left ? 'left' : 'right'); }
      for (let w = 0; w < 2; w++) { const wx = left ? x0 + 470 - 30 - w * 26 : x0 + 30 + w * 26; g.font = `26px ${SERIF}`; g.textAlign = 'center'; g.fillStyle = w < D.wins[i] ? '#f2a3b5' : 'rgba(246,234,208,.25)'; g.fillText('✿', wx, 42); }
    });
    // round & clock
    g.fillStyle = 'rgba(17,22,58,.8)'; g.beginPath(); g.arc(W / 2, 56, 40, 0, Math.PI * 2); g.fill(); g.strokeStyle = GOLD; g.lineWidth = 2; g.stroke();
    label(String(Math.ceil(D.timer)), W / 2, 66, 32, D.timer < 10 ? '#ff8a6a' : '#ffe9a8', DISPLAY);
    label(D.round > 3 ? `Round ${D.round} · Sudden death` : `Round ${D.round} of 3`, W / 2, 120, 18, '#fff3c4');
    // super card
    const c = D.superCast;
    if (c) {
      const sup = D.f[c.f].def.sup, a = Math.min(1, c.t * 4, (2 - c.t) * 3);
      if (a > 0) {
        g.save(); g.globalAlpha = a;
        const grd = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 640); grd.addColorStop(0, 'rgba(255,240,200,0)'); grd.addColorStop(1, 'rgba(255,200,90,.3)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
        g.translate(W / 2, 250); for (let i = 0; i < 18; i++) { g.rotate(Math.PI / 9); g.fillStyle = 'rgba(255,230,150,.14)'; g.fillRect(0, -3, 440, 6); }
        g.restore(); g.save(); g.globalAlpha = a;
        label(`${D.f[c.f].def.name}'s`, W / 2, 190, 26, '#fff3c4');
        label(sup.dev, W / 2, 232, 40, sup.col, DEVA); label(sup.name.toUpperCase(), W / 2, 296, 72, '#fff8e0', DISPLAY); g.restore();
      }
    }
    if (D.banner) {
      const bn = D.banner; bn.t += dt; const a = Math.min(1, bn.t * 4, (bn.dur - bn.t) * 3);
      if (a > 0) { g.globalAlpha = a; label(bn.text, W / 2, H / 2 + 10, bn.text === 'FIGHT!' ? 110 : 64, '#ffe9a8', DISPLAY); if (bn.sub) label(bn.sub, W / 2, H / 2 + 56, 26, '#fff3c4'); g.globalAlpha = 1; }
      if (bn.t > bn.dur) D.banner = null;
    }
    if (D.flash > 0) { g.fillStyle = `rgba(255,250,230,${Math.min(.9, D.flash)})`; g.fillRect(0, 0, W, H); D.flash -= dt * 1.5; }
    if (D.round === 1 && D.t < 14 && D.phase !== 'end') {
      const tip = D.mode === 'local' ? 'P1: WASD · Space jump · F attack · G super · L-Shift roll      P2: Arrows · Enter jump · L attack · ; super · R-Shift roll'
        : 'WASD move · Space jump · J / click attack (archers: hold to charge) · K super · Shift roll · click for 360° mouse camera';
      label(tip, W / 2, H - 28, 17, '#fff3c4');
    }
    if (D.mode === 'client' || D.mode === 'host') label(D.netOk === false ? 'Connection lost…' : `Online · room ${Net.code || ''}`, W - 20, H - 14, 15, D.netOk === false ? '#ff8a6a' : '#9be3a4', SERIF, 'right');
    if (D.paused) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, H); label('Paused', W / 2, H / 2, 64, '#ffe9a8', DISPLAY); label('Esc or P to continue', W / 2, H / 2 + 46, 22); }
  }

  /* =========================================================
     NETWORK SYNC — the host simulates, the guest renders
     ========================================================= */
  const r2 = v => Math.round(v * 100) / 100;
  function sendSnapshot() {
    const snap = {
      t: 's', f: D.f.map(f => [r2(f.x), r2(f.y), r2(f.z), r2(f.yaw), ANIMS.indexOf(f.anim), r2(f.at), r2(f.hp), Math.round(f.meter), r2(f.scale), r2(f.aimUp || 0), r2(f.drawK || 0), f.rolling ? r2(f.rollT) : -1, f.flash > 0 ? 1 : 0, f.giant > 0 ? 1 : 0, f.buff > 0 ? 1 : 0, r2(f.swingK || 0)]),
      s: D.shots.map(s => [s.id, s.k, r2(s.x), r2(s.y), r2(s.z), r2(s.vx), r2(s.vy), r2(s.vz)]),
      h: D.hz.map(h => [h.id, h.type, r2(h.x), r2(h.z), r2(h.r), r2(h.t), h.life, h.delay || 0, h.col, h.fire ? 1 : 0]),
      e: D.evq.splice(0), m: [D.round, D.wins[0], D.wins[1], r2(D.timer), D.phase, D.superCast ? D.superCast.f : -1, D.superCast ? r2(D.superCast.t) : 0],
    };
    Net.send(snap);
  }
  function applySnapshot(s) {
    s.f.forEach((a, i) => {
      const f = D.f[i];
      f.tx = a[0]; f.ty = a[1]; f.tz = a[2]; f.tyaw = a[3]; f.anim = ANIMS[a[4]] || 'idle'; f.at = a[5]; f.hp = a[6]; f.meter = a[7]; f.scale = a[8]; f.aimUp = a[9]; f.drawK = a[10];
      f.rolling = a[11] >= 0; if (f.rolling) f.J.pivot.rotation.x = a[11] / .42 * Math.PI * 2;
      f.flash = a[12] ? .05 : 0; f.giant = a[13] ? 1 : 0; f.buff = a[14] ? 1 : 0; f.swingK = a[15]; f.h = 1.9 * f.scale;
      if (f.x === undefined || D.firstSnap) { f.x = f.tx; f.y = f.ty; f.z = f.tz; f.yaw = f.tyaw; }
    });
    D.firstSnap = false;
    D.shots = s.s.map(a => ({ id: a[0], k: a[1], x: a[2], y: a[3], z: a[4], vx: a[5], vy: a[6], vz: a[7] }));
    D.hz = s.h.map(a => ({ id: a[0], type: a[1], x: a[2], z: a[3], r: a[4], t: a[5], life: a[6], delay: a[7], col: a[8], fire: !!a[9] }));
    for (const e of s.e) applyEvent(e);
    const m = s.m; D.round = m[0]; D.wins = [m[1], m[2]]; D.timer = m[3];
    if (m[4] === 'end' && D.phase !== 'end') { D.phase = 'end'; D.phaseT = 0; D.winner = m[1] >= 2 ? 0 : 1; }
    D.phase = m[4];
    if (m[5] >= 0) { if (!D.superCast) D.superCast = { f: m[5], t: m[6] }; else D.superCast.t = m[6]; } else D.superCast = null;
    D.lastSnap = performance.now();
  }
  function clientStep(dt) {
    D.t += dt;
    for (const f of D.f) if (f.tx !== undefined) { const k = Math.min(1, dt * 15); f.x = lerp(f.x, f.tx, k); f.y = lerp(f.y, f.ty, k); f.z = lerp(f.z, f.tz, k); f.yaw += angDiff(f.yaw, f.tyaw) * k; f.at += 0; }
    for (const s of D.shots) { s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; }
    for (const h of D.hz) { h.t += dt; }
    if (D.phase === 'end') { D.phaseT += dt; if (D.phaseT > 3.2 && !D.reported) { D.reported = true; D.onEnd && D.onEnd({ winner: D.winner, wins: D.wins.slice() }); } }
    D.sendT -= dt;
    if (D.sendT <= 0) { D.sendT = 1 / 30; const inp = readInput(MAPS.solo, D.ctr[1]); Net.send(Object.assign({ t: 'i' }, inp)); }
    D.netOk = performance.now() - (D.lastSnap || performance.now()) < 3000;
  }

  /* =========================================================
     RUNTIME
     ========================================================= */
  function bindOnce() {
    if (bound) return; bound = true;
    window.addEventListener('keydown', e => {
      if (!D) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) e.preventDefault();
      if ((e.code === 'Escape' || e.code === 'KeyP') && (D.mode === 'ai' || D.mode === 'local')) { if (!e.repeat && !(e.code === 'Escape' && document.pointerLockElement)) D.paused = !D.paused; return; }
      keys[e.code] = true;
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    let drag = null, touch = null;
    const look = (dx, dy) => { D.camYaw -= dx * .0042; D.camPitch = clamp(D.camPitch + dy * .0032, -.2, 1.25); D.camManual = 3; };
    hud.addEventListener('pointerdown', e => {
      if (!D) return;
      if (e.pointerType === 'touch') { touch = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 }; return; }
      if (e.button === 2) { drag = { x: e.clientX, y: e.clientY }; return; }
      if (D.mode !== 'local' && document.pointerLockElement !== hud && hud.requestPointerLock) { try { hud.requestPointerLock(); } catch (err) { /* not allowed */ } }
      keys.Mouse0 = true;
    });
    hud.addEventListener('pointermove', e => {
      if (!D) return;
      if (document.pointerLockElement === hud) return look(e.movementX || 0, e.movementY || 0);
      if (touch && e.pointerId === touch.id) { const dx = e.clientX - touch.x, dy = e.clientY - touch.y; touch.moved += Math.abs(dx) + Math.abs(dy); touch.x = e.clientX; touch.y = e.clientY; if (touch.moved > 8) look(dx * 1.6, dy * 1.6); return; }
      if (drag) { look(e.clientX - drag.x, e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY; }
    });
    window.addEventListener('pointerup', e => {
      if (e.button === 2) drag = null;
      if (touch && e.pointerId === touch.id) { if (touch.moved <= 8 && D) { keys.Mouse0 = true; setTimeout(() => { keys.Mouse0 = false; }, 120); } touch = null; return; }
      if (e.button === 0) keys.Mouse0 = false;
    });
    hud.addEventListener('contextmenu', e => { if (D) e.preventDefault(); });
    // on-screen controls for phones and tablets
    const pad = document.createElement('div'); pad.id = 'pad4'; pad.className = 'pad';
    pad.innerHTML = `<div class="pad-l"><button data-k="KeyA">◀</button><div class="pad-col"><button data-k="KeyW">▲</button><button data-k="KeyS">▼</button></div><button data-k="KeyD">▶</button></div>
      <div class="pad-r"><button data-k="ShiftLeft">⤳</button><button data-k="KeyK">✦</button><button data-k="Space">⤒</button><button data-k="KeyJ" class="big">⚔</button></div>`;
    document.getElementById('stage').appendChild(pad);
    pad.querySelectorAll('button').forEach(b => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', e => { e.preventDefault(); keys[k] = true; });
      const up = () => { keys[k] = false; };
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    });
  }

  /* opts: { mode: 'ai' | 'local' | 'host' | 'client', chars: [a, b], arena, onEnd } */
  function start(opts) {
    K = Action3D.kit; K.init();
    glCv = document.getElementById('game3d'); hud = document.getElementById('game'); hctx = hud.getContext('2d');
    bindOnce();
    if (!camera) camera = new T.PerspectiveCamera(50, W / H, .1, 900);
    buildArena(opts.arena);
    for (const [, m] of meshes) scene.remove(m); meshes.clear(); fxList.length = 0;
    D = { mode: opts.mode, me: opts.mode === 'client' ? 1 : 0, f: [], round: 1, wins: [0, 0], t: 0, timer: ROUND_TIME, phase: 'intro', phaseT: 0, shots: [], hz: [], timers: [], texts: [], evq: [],
      ctr: [newCtr(), newCtr()], camYaw: 0, camPitch: .36, camManual: 0, cam: new T.Vector3(0, 6, 16), look: new T.Vector3(0, 1, 0), shake: 0, flash: 0, hitstop: 0, sendT: 0, onEnd: opts.onEnd, firstSnap: true };
    D.f = [makeFighter(0, opts.chars[0]), makeFighter(1, opts.chars[1])];
    for (const k in keys) keys[k] = false;
    if (opts.mode === 'client') { placeFighters(); Net.onMsg = m => { if (m.t === 's' && D) applySnapshot(m); else DuelUI.netMsg(m); }; }
    else roundStart();
    if (opts.mode === 'host') Net.onMsg = m => { if (m.t === 'i' && D) D.remoteIn = m; else DuelUI.netMsg(m); };
    glCv.classList.add('show'); hud.classList.add('show'); document.body.classList.add('duel-on');
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf); D = null;
    if (glCv) glCv.classList.remove('show'); if (hud) { hud.classList.remove('show'); hctx.clearRect(0, 0, W, H); }
    document.body.classList.remove('duel-on');
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    for (const k in keys) keys[k] = false;
  }

  return { FIGHTERS, ARENAS, start, stop, get active() { return !!D; }, _debug: { state: () => D, step, keys } };
})();

/* =========================================================
   NET — PeerJS rooms. The host's peer id is derived from a
   short room code that the guest types in (or opens as a link).
   ========================================================= */
const Net = {
  peer: null, conn: null, code: null, onMsg: null, onClose: null,
  prefix: 'ramayana-path-duel-',
  available() { return typeof Peer !== 'undefined'; },
  makeCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; },
  host(onReady, onGuest, onError) {
    this.close(); this.code = this.makeCode();
    const p = this.peer = new Peer(this.prefix + this.code);
    p.on('open', () => onReady(this.code));
    p.on('connection', c => {
      if (this.conn && this.conn.open) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); }); return; }
      this.wire(c); c.on('open', () => onGuest());
    });
    p.on('error', e => { if (e.type === 'unavailable-id') { this.host(onReady, onGuest, onError); return; } onError(e); });
  },
  join(code, onOpen, onError) {
    this.close(); this.code = code.toUpperCase().trim();
    const p = this.peer = new Peer();
    p.on('open', () => { const c = p.connect(this.prefix + this.code, { reliable: true }); this.wire(c); c.on('open', () => onOpen()); });
    p.on('error', e => onError(e));
  },
  wire(c) {
    this.conn = c;
    c.on('data', d => { if (this.onMsg) this.onMsg(d); });
    c.on('close', () => { if (this.conn === c) { this.conn = null; if (this.onClose) this.onClose(); } });
  },
  send(m) { if (this.conn && this.conn.open) { try { this.conn.send(m); } catch (e) { /* dropped */ } } },
  close() {
    const c = this.conn, p = this.peer; this.conn = null; this.peer = null;
    try { if (c) c.close(); } catch (e) { /* ignore */ }
    try { if (p) p.destroy(); } catch (e) { /* ignore */ }
  },
};

/* =========================================================
   DUEL UI — menus, character select, rooms, results
   ========================================================= */
const DuelUI = (() => {
  let pick = { a: null, b: null }, arena = 'kishkindha', mode = 'ai', remotePick = null, myPick = null, remoteReady = false;
  const F = () => Duel.FIGHTERS;
  const card = (k, cls = '') => { const f = F()[k]; return `<button class="f-card ${cls}" data-k="${k}"><span class="f-port ${k === 'ravana' ? 'wide' : ''}">${Portrait.svg(k)}</span><b>${f.name}</b><i>${f.dev}</i><small>${f.blurb}</small><em style="color:${f.sup.col}">✦ ${f.sup.name}</em></button>`; };
  const arenaRow = () => `<div class="a-row">${Object.entries(Duel.ARENAS).map(([k, a]) => `<button class="a-card ${k === arena ? 'on' : ''}" data-a="${k}"><span>${BG.get(a.theme === 'battle' ? 'battle' : a.theme === 'ashram' ? 'ashram' : a.theme)}</span><b>${a.name}</b></button>`).join('')}</div>`;
  function bindArena(p) { p.querySelectorAll('.a-card').forEach(b => b.onclick = () => { arena = b.dataset.a; p.querySelectorAll('.a-card').forEach(x => x.classList.toggle('on', x === b)); Sound.play('tick'); }); }

  function needs3D() {
    if (Action3D.supported) return true;
    UI.modal(`<div class="m-head"><h2>Multiplayer needs 3D</h2><button class="x">✕</button></div><p class="m-sub">This device or browser can't run WebGL, which the duel arenas need.</p>`, 'duel-panel').querySelector('.x').onclick = () => UI.closeModal();
    return false;
  }

  function menu() {
    if (!needs3D()) return;
    const p = UI.modal(`<div class="m-head"><h2>Multiplayer Duel</h2><button class="x">✕</button></div>
      <p class="m-sub">Best of three rounds. A drawn round doesn't count — the duel goes on until someone wins.</p>
      <div class="mp-grid">
        <button class="mp-opt" data-m="host"><b>Create a room</b><span>Get a code, share it with a friend, fight online</span></button>
        <button class="mp-opt" data-m="join"><b>Join a room</b><span>Enter your friend's room code</span></button>
        <button class="mp-opt" data-m="local"><b>Two players, one keyboard</b><span>Side by side on this computer</span></button>
        <button class="mp-opt" data-m="ai"><b>Vs computer</b><span>Practise against the AI</span></button>
      </div>`, 'duel-panel');
    p.querySelector('.x').onclick = () => UI.closeModal();
    p.querySelectorAll('.mp-opt').forEach(b => b.onclick = () => {
      Sound.init(); mode = b.dataset.m;
      if (mode === 'ai' || mode === 'local') { pick = { a: null, b: null }; select('a'); }
      else if (mode === 'host') createRoom(); else joinRoom();
    });
  }

  /* ---- offline: pick for player 1, then player 2 / computer, then arena ---- */
  function select(slot) {
    const who = slot === 'a' ? (mode === 'ai' ? 'Choose your warrior' : 'Player 1 — choose') : (mode === 'ai' ? 'Choose your opponent' : 'Player 2 — choose');
    const p = UI.modal(`<div class="m-head"><h2>${who}</h2><button class="x">✕</button></div>
      <div class="f-grid">${Object.keys(F()).map(k => card(k, pick.a === k && slot === 'b' ? 'taken' : '')).join('')}</div>
      ${slot === 'b' && mode === 'ai' ? '<div class="duel-actions"><button class="btn ghost rnd">Random opponent</button></div>' : ''}`, 'duel-panel wide');
    p.querySelector('.x').onclick = () => menu();
    p.querySelectorAll('.f-card').forEach(b => b.onclick = () => { pick[slot] = b.dataset.k; Sound.play('bell'); slot === 'a' ? select('b') : arenaPick(); });
    const r = p.querySelector('.rnd'); if (r) r.onclick = () => { const ks = Object.keys(F()).filter(k => k !== pick.a); pick.b = ks[Math.floor(Math.random() * ks.length)]; arenaPick(); };
  }
  function arenaPick() {
    const p = UI.modal(`<div class="m-head"><h2>Choose the battleground</h2><button class="x">✕</button></div>
      <div class="vs-line">${card(pick.a, 'mini')}<span class="vs">VS</span>${card(pick.b, 'mini')}</div>${arenaRow()}
      <div class="duel-actions"><button class="btn big go">Fight!</button></div>`, 'duel-panel wide');
    p.querySelector('.x').onclick = () => menu(); bindArena(p);
    p.querySelector('.go').onclick = () => { UI.closeModal(); launch(mode, [pick.a, pick.b]); };
  }

  /* ---- online rooms ---- */
  function lobbyPanel(title, body) {
    const p = UI.modal(`<div class="m-head"><h2>${title}</h2><button class="x">✕</button></div>${body}`, 'duel-panel wide');
    p.querySelector('.x').onclick = () => { Net.close(); menu(); };
    return p;
  }
  function netError(e) {
    const msg = e && e.type === 'peer-unavailable' ? 'No room with that code is open. Check the code and try again.'
      : e && e.type === 'network' ? 'Couldn\'t reach the matchmaking server. Check your internet connection.'
        : `Connection problem (${e && (e.type || e.message) || 'unknown'}).`;
    const p = lobbyPanel('Online duel', `<p class="m-sub">${msg}</p><div class="duel-actions"><button class="btn back">Back</button></div>`);
    p.querySelector('.back').onclick = () => { Net.close(); menu(); };
  }
  function createRoom() {
    if (!Net.available()) return netError({ message: 'online play unavailable' });
    lobbyPanel('Creating a room…', '<p class="m-sub">Contacting the matchmaking server…</p>');
    Net.onClose = () => { if (Duel.active) { Duel.stop(); } if (mode === 'host') netError({ message: 'your opponent left' }); };
    Net.host(code => {
      const link = location.href.split('#')[0].split('?')[0] + '?room=' + code;
      const p = lobbyPanel('Your room is open', `<div class="room-code">${code}</div>
        <p class="m-sub">Share this code — or the link — with your friend. Waiting for a challenger…</p>
        <div class="share"><input readonly value="${link}"><button class="btn ghost copy">Copy link</button></div>`);
      p.querySelector('.copy').onclick = () => { const i = p.querySelector('input'); i.select(); try { navigator.clipboard.writeText(link); } catch (err) { document.execCommand('copy'); } p.querySelector('.copy').textContent = 'Copied!'; };
    }, () => { Sound.play('bell'); remotePick = null; myPick = null; remoteReady = false; onlineSelect(); }, netError);
    Net.onMsg = netMsg;
  }
  function joinRoom(prefill = '') {
    if (!Net.available()) return netError({ message: 'online play unavailable' });
    const p = lobbyPanel('Join a room', `<p class="m-sub">Enter the 5-letter room code your friend gave you.</p>
      <div class="share"><input class="code-in" maxlength="5" placeholder="CODE" value="${prefill}"><button class="btn go">Join</button></div>`);
    const inp = p.querySelector('.code-in'); inp.focus();
    const go = () => {
      const code = inp.value.toUpperCase().trim(); if (code.length < 4) return;
      lobbyPanel('Joining…', `<p class="m-sub">Connecting to room <b>${code}</b>…</p>`);
      mode = 'join';
      Net.onMsg = netMsg;
      Net.onClose = () => { if (Duel.active) Duel.stop(); netError({ message: 'the host left' }); };
      Net.join(code, () => { Net.send({ t: 'hello' }); Sound.play('bell'); remotePick = null; myPick = null; remoteReady = false; onlineSelect(); }, netError);
    };
    p.querySelector('.go').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  function onlineSelect() {
    const host = mode === 'host';
    const p = UI.modal(`<div class="m-head"><h2>Choose your warrior</h2><button class="x">✕</button></div>
      <div class="f-grid">${Object.keys(F()).map(k => card(k, k === myPick ? 'on' : '')).join('')}</div>
      <div class="opp-status">${remotePick ? `Opponent chose <b>${F()[remotePick].name}</b> ✓` : 'Opponent is choosing…'}</div>
      ${host ? `<h3 class="sub-h">Battleground</h3>${arenaRow()}<div class="duel-actions"><button class="btn big go" ${myPick && remotePick ? '' : 'disabled'}>Begin the duel</button></div>` : '<div class="opp-status">The host will start the duel.</div>'}`, 'duel-panel wide');
    p.querySelector('.x').onclick = () => { Net.close(); menu(); };
    p.querySelectorAll('.f-card').forEach(b => b.onclick = () => { myPick = b.dataset.k; Net.send({ t: 'pick', k: myPick }); Sound.play('bell'); onlineSelect(); });
    if (host) { bindArena(p); p.querySelector('.go').onclick = () => { const chars = [myPick, remotePick]; Net.send({ t: 'start', chars, arena }); UI.closeModal(); launch('host', chars); }; }
  }
  function netMsg(m) {
    if (!m || !m.t) return;
    if (m.t === 'pick') { remotePick = m.k; if (!Duel.active) onlineSelect(); }
    if (m.t === 'hello' && !Duel.active) onlineSelect();
    if (m.t === 'full') netError({ message: 'that room is already full' });
    if (m.t === 'start' && mode === 'join') { arena = m.arena; UI.closeModal(); launch('client', m.chars); }
    if (m.t === 'again' && mode === 'join') { if (Duel.active) Duel.stop(); remotePick = null; myPick = null; onlineSelect(); }
  }

  function launch(m, chars) {
    document.body.classList.add('in-duel');
    UI.hideScreen();
    Duel.start({ mode: m, chars, arena, onEnd: r => results(m, chars, r) });
  }
  function results(m, chars, r) {
    const w = Duel.FIGHTERS[chars[r.winner]];
    const youWon = m === 'ai' ? r.winner === 0 : m === 'host' ? r.winner === 0 : m === 'client' ? r.winner === 1 : null;
    const p = UI.modal(`<div class="res-port">${Portrait.svg(chars[r.winner])}</div>
      <div class="cc-dev">${w.dev}</div><h2>${w.name} wins!</h2>
      <div class="cc-name">${r.wins[0]} – ${r.wins[1]}${youWon === true ? ' · Victory is yours' : youWon === false ? ' · Rise and fight again' : ''}</div>
      <div class="duel-actions">${m === 'client' ? '<span class="opp-status">Waiting for the host…</span>' : '<button class="btn again">Rematch</button><button class="btn ghost change">Change warriors</button>'}<button class="btn ghost leave">Leave</button></div>`, 'chapter-card duel-res');
    const again = p.querySelector('.again'); if (again) again.onclick = () => { UI.closeModal(); Duel.stop(); if (m === 'host') { Net.send({ t: 'start', chars, arena }); } launch(m, chars); };
    const change = p.querySelector('.change'); if (change) change.onclick = () => { Duel.stop(); if (m === 'host') { Net.send({ t: 'again' }); remotePick = null; myPick = null; onlineSelect(); } else { pick = { a: null, b: null }; select('a'); } };
    p.querySelector('.leave').onclick = () => { leave(); };
  }
  function leave() { Duel.stop(); Net.close(); UI.closeModal(); document.body.classList.remove('in-duel'); UI.title(); }

  return { menu, joinRoom, netMsg, leave };
})();
