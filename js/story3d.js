'use strict';
/* =========================================================
   STORY 3D — every story scene is staged in 3D.
   Characters walk in, gesture while they speak and turn to
   whoever is talking; the camera cuts between close-ups,
   two-shots and slow wide shots like a film.
   ========================================================= */
const Story3D = (() => {
  const T = window.THREE;
  const W = 1280, H = 720;
  let K = null, scene = null, camera = null, raf = 0, last = 0, running = false, setName = '', t = 0;
  let cast = {}, speaker = null, shot = { kind: 'wide', t: 0 }, lineNo = 0, diorama = false, mapView = false;
  const cam = { x: 0, y: 3, z: 10 }, look = { x: 0, y: 1.3, z: 0 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, k) => a + (b - a) * k;

  function wanted() {
    if (typeof Action3D === 'undefined' || !Action3D.supported) return false;
    let pref = null; try { pref = localStorage.getItem('ramayana-3d'); } catch (e) { /* ignore */ }
    return pref !== 'off';
  }

  /* ---------- who stands where ---------- */
  const IDLE = { valmiki: 'read', vibhishana: 'namaste', dasharatha: 'grief', bharata: 'carry', shabari: 'offer', ravana: 'proud', kaikeyi: 'stern', sita_vatika: 'hold', sita: 'hold', janaka: 'hold' };
  const base = k => (CHARS[k] ? k : k.split('_')[0]);
  const rigFor = k => (k === 'ravana' ? 'ravana1' : k);

  function slotPos(side, i) { const s = side === 'left' ? -1 : 1; return { x: s * (1.8 + i * 1.7), z: -i * 1.1 }; }

  function makeActor(key, side) {
    let J, special = null;
    if (key === 'jatayu') { J = K.buildJatayu(); special = 'bird'; }
    else if (key === 'deer') { J = buildDeer(); special = 'deer'; }
    else if (K.RIG3[rigFor(key)]) J = K.buildFigure(rigFor(key));
    else J = K.buildFigure('rama');
    scene.add(J.root);
    if (J.bow) { const [a, b] = J.bow.g.userData.tips; J.bow.g.add(new T.Line(new T.BufferGeometry().setFromPoints([a, b]), new T.LineBasicMaterial({ color: 0xf3ead2 }))); }
    const s = side === 'left' ? -1 : 1;
    return { key, J, special, side, x: s * 7, z: 0, tx: 0, tz: 0, yaw: -s * Math.PI / 2, at: rnd(0, 5), scale: key === 'ravana' ? 1.15 : key === 'hanuman' ? 1.05 : 1, born: t, slot: 0 };
  }

  function buildDeer() {
    const root = new T.Group(), body = new T.Group(); body.position.y = .95; root.add(body);
    const gold = '#e8b923';
    K.part(K.CAP(.24, .7), gold, body, [0, 0, 0], { rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 12; i++) K.part(K.SPH(.05, 6, 5), '#eef3f8', body, [rnd(-.2, .2), rnd(.05, .22), rnd(-.4, .4)], { noOutline: true });
    const neck = new T.Group(); neck.position.set(0, .1, .45); body.add(neck);
    K.part(K.CAP(.09, .35), gold, neck, [0, .22, .05], { rot: [.5, 0, 0] });
    const hd = new T.Group(); hd.position.set(0, .48, .2); neck.add(hd);
    K.part(K.SPH(.13, 12, 10), gold, hd, [0, 0, .05], { scale: [.85, .85, 1.3] });
    for (const s of [-1, 1]) {
      K.part(K.SPH(.025, 6, 5), '#2b1a10', hd, [s * .08, .04, .12], { noOutline: true });
      K.part(K.CONE(.04, .14, 6), gold, hd, [s * .1, .12, -.02], { rot: [0, 0, -s * .8] });
      const a = new T.Group(); a.position.set(s * .05, .12, 0); a.rotation.z = -s * .35; hd.add(a);
      K.part(K.CYL(.012, .016, .35, 5), GOLD, a, [0, .17, 0], { noOutline: true });
      K.part(K.CYL(.01, .012, .18, 5), GOLD, a, [s * .06, .24, 0], { rot: [0, 0, -s * .9], noOutline: true });
      K.part(K.SPH(.03, 6, 5), s > 0 ? SAPPH : RUBY, a, [0, .36, 0], { noOutline: true });
      K.part(K.SPH(.025, 6, 5), EMER, a, [s * .13, .3, 0], { noOutline: true });
    }
    for (const [x, z] of [[-.15, .38], [.15, .38], [-.15, -.38], [.15, -.38]]) K.part(K.CYL(.035, .025, .9, 6), '#c08f12', body, [x, -.5, z]);
    K.part(K.SPH(.06, 6, 5), '#fff', body, [0, .12, -.55], { noOutline: true });
    const J = { root, pivot: body, deer: true, head: hd, meshes: [] };
    return J;
  }

  /* =========================================================
     SETS
     ========================================================= */
  function palace(p, x, z, s, night) {
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g);
    const wall = night ? '#5a4a6a' : '#f3e2c0', hole = night ? '#f2b84a' : '#7a2a1a', dome = night ? '#8a6a3a' : '#f0c24a';
    K.part(K.BOX(16, 4, 5), wall, g, [0, 2, 0]);
    K.part(K.BOX(16.6, .5, 5.6), '#d9b77a', g, [0, 4.2, 0]);
    K.part(K.BOX(9, 3.4, 4), wall, g, [0, 6.1, 0]);
    K.part(K.BOX(9.6, .45, 4.6), '#d9b77a', g, [0, 7.95, 0]);
    for (let i = 0; i < 9; i++) K.part(K.BOX(.9, 2.2, .1), hole, g, [-6.8 + i * 1.7, 1.4, 2.52], { noOutline: true, mat: night ? K.basic(hole) : null });
    for (let i = 0; i < 5; i++) K.part(K.BOX(.8, 1.8, .1), hole, g, [-3.4 + i * 1.7, 5.7, 2.02], { noOutline: true, mat: night ? K.basic(hole) : null });
    const domeAt = (dx, dy, r) => { K.part(K.SPH(r, 18, 12), dome, g, [dx, dy, 0], { scale: [1, 1.25, 1] }); K.part(K.CONE(r * .18, r * .9, 6), GOLD, g, [dx, dy + r * 1.55, 0]); };
    domeAt(0, 8.2, 2.1); domeAt(-3.6, 8.2, 1); domeAt(3.6, 8.2, 1); domeAt(-7.4, 4.4, .9); domeAt(7.4, 4.4, .9);
    for (const fx of [-3.6, 3.6, 0]) { K.part(K.CYL(.04, .04, 1.6, 5), '#3e2612', g, [fx, fx ? 10.4 : 12, 0], { noOutline: true }); K.part(K.BOX(.9, .5, .03), fx ? '#c0392b' : '#e8891c', g, [fx + .45, fx ? 10.9 : 12.5, 0], { noOutline: true }); }
    return g;
  }
  function water(p, x, z, w, d, col, y = .05) { const m = new T.Mesh(new T.PlaneGeometry(w, d), K.toon(col)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; p.add(m); return m; }
  function lotusPads(p, x, z, n) { for (let i = 0; i < n; i++) { const lx = x + rnd(-6, 6), lz = z + rnd(-2, 2); K.part(K.CYL(.35, .35, .02, 10), '#2f6b3a', p, [lx, .08, lz], { noOutline: true }); K.part(K.CONE(.12, .3, 5), '#f2a3b5', p, [lx, .22, lz], { noOutline: true }); } }
  function diya(p, x, y, z) {
    K.part(K.SPH(.12, 8, 6), '#b8642d', p, [x, y, z], { scale: [1, .45, 1], noOutline: true });
    const f = new T.Mesh(K.CONE(.05, .16, 6), K.basic('#ffd76a')); f.position.set(x, y + .12, z); p.add(f); flames.push(f);
  }
  let flames = [];

  const SETS = {
    title: { theme: { sky: ['#1d2457', '#f2a12b'], fog: '#c0603a', ground: '#5a3a3a', ground2: '#3a2626', tree: ['#2f4a2a', '#3f5a32'], sun: '#ffd76a' }, sunLow: true,
      build(p) {
        K.part(K.CYL(4.4, 4.8, .6, 32), '#c9a26a', p, [0, .3, 0]); K.part(K.TOR(4.5, .08, 6, 48), GOLD, p, [0, .6, 0], { rot: [Math.PI / 2, 0, 0], noOutline: true });
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; K.tree3(p, Math.cos(a) * 18, Math.sin(a) * 18 - 4, 1.3, this.theme); }
        palace(p, 0, -26, .9, false);
        water(p, 0, 14, 80, 12, '#1d2457');
      } },
    ayodhya: { theme: { sky: ['#f2b878', '#fbe7c0'], fog: '#f4d8a8', ground: '#c9a26a', ground2: '#b08850', tree: ['#3a6a30', '#5a9a44'], sun: '#fff3c4' },
      build(p) { palace(p, 0, -12, 1, false); water(p, 0, 9, 80, 6, '#3f7fa6'); lotusPads(p, 0, 9, 8); for (const x of [-13, -9, 9, 13]) K.tree3(p, x, -5, 1.1, this.theme); } },
    ashram: { themeKey: 'ashram',
      build(p, th) { K.hut3(p, -7, -6, .5); K.hut3(p, 7, -7, -.4); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; K.tree3(p, Math.cos(a) * 15, Math.sin(a) * 12 - 6, rnd(.9, 1.4), th); } kund(p, 0, -3.5); } },
    mithila: { indoor: true, theme: { sky: ['#5a1d1a', '#8e1b2a'], fog: '#3a1210', ground: '#c9a26a', ground2: '#a8843a', tree: ['#3a6a30', '#5a9a44'] },
      build(p) {
        for (let i = 0; i < 8; i++) { const x = -10.5 + i * 3; for (const z of [-7, 4]) { K.part(K.CYL(.35, .4, 7, 10), '#e8d2a4', p, [x, 3.5, z]); K.part(K.BOX(1, .4, 1), GOLD, p, [x, 7.1, z]); } }
        K.part(K.BOX(26, .5, 14), '#8e1b2a', p, [0, 7.5, -1.5]);
        K.part(K.BOX(26, 7, .4), '#6a1a1a', p, [0, 3.5, -9]);
        // Shiva's bow in its iron chest on the eight-wheeled cart
        K.part(K.BOX(6, .9, 1.4), '#4a4a52', p, [0, 1.1, -5.2]);
        for (let i = 0; i < 4; i++) for (const s of [-1, 1]) K.part(K.CYL(.4, .4, .15, 14), '#3a2a1a', p, [-2.2 + i * 1.47, .4, -5.2 + s * .75], { rot: [Math.PI / 2, 0, 0] });
        const curve = new T.QuadraticBezierCurve3(new T.Vector3(-3.6, 1.7, -5.2), new T.Vector3(0, 2.4, -5.2), new T.Vector3(3.6, 1.7, -5.2));
        const bow = new T.Mesh(new T.TubeGeometry(curve, 24, .09, 8, false), K.toon('#4a2a14')); bow.castShadow = true; p.add(bow);
        for (const x of [-2.4, -1.2, 0, 1.2, 2.4]) K.part(K.TOR(.11, .03, 6, 12), GOLD, p, [x, 1.7 + (1 - (x / 3.6) ** 2) * .35, -5.2], { rot: [0, Math.PI / 2, 0], noOutline: true });
        const l = new T.PointLight(0xffc070, .8, 20); l.position.set(0, 5, 0); p.add(l);
      } },
    forest: { themeKey: 'forest',
      build(p, th) { K.hut3(p, 6, -6, -.5); water(p, 0, 9, 80, 7, '#4f8fa8'); lotusPads(p, 0, 9, 6); for (let i = 0; i < 5; i++) K.tree3(p, -12 + i * 2.5, -9 - (i % 2) * 2, 1.6, th); for (let i = 0; i < 10; i++) K.tree3(p, rnd(-20, 20), rnd(-22, -12), rnd(1, 1.6), th); } },
    kishkindha: { themeKey: 'kishkindha',
      build(p, th) { for (let i = 0; i < 16; i++) K.rock3(p, rnd(-18, 18), rnd(-16, -5), rnd(1.2, 3.5), i % 2 ? '#9a5a2a' : '#b5713a'); water(p, 0, 9, 80, 7, '#3a8aa0'); lotusPads(p, 0, 9, 8); for (let i = 0; i < 6; i++) K.tree3(p, rnd(-16, 16), rnd(-14, -8), 1, th); } },
    ocean: { theme: { sky: ['#7fc0e0', '#e9f4f0'], fog: '#cfe6ec', ground: '#e6cf98', ground2: '#d4bb80', tree: ['#3a6a30', '#5a9a44'], sun: '#fff3c4' },
      build(p) { water(p, 0, -40, 200, 70, '#2a6e9a', .02); const isl = new T.Group(); isl.position.set(14, 0, -60); p.add(isl); K.part(K.CONE(14, 5, 10), '#4a6a3a', isl, [0, 1, 0], { noOutline: true }); for (let i = 0; i < 5; i++) K.tower3(isl, -6 + i * 3, 0, 9 + (i % 2) * 5, true); for (let i = 0; i < 4; i++) K.tree3(p, -16 + i * 3, 6, 1, this.theme); } },
    lanka: { themeKey: 'lanka',
      build(p, th) { for (let i = 0; i < 9; i++) K.tower3(p, -24 + i * 6, -18 - (i % 2) * 4, 12 + (i % 3) * 5, true); for (let i = 0; i < 7; i++) K.tree3(p, rnd(-14, 14), rnd(-10, -4), rnd(1, 1.4), th, true); K.tree3(p, -6, -2.5, 1.2, th, true); } },
    battle: { themeKey: 'battle',
      build(p) { for (let i = 0; i < 10; i++) K.banner3(p, -18 + i * 4, -8 - (i % 2) * 3, i < 5 ? '#e8891c' : '#3a0a0a'); for (let i = 0; i < 6; i++) K.rock3(p, rnd(-16, 16), rnd(-14, -6), rnd(.6, 1.4), '#6a3a1e'); } },
    ayodhyaNight: { theme: { sky: ['#0b0f33', '#4a2a3a'], fog: '#2a1e3a', ground: '#4a3a3a', ground2: '#3a2a2a', tree: ['#1a2a1a', '#24402a'], night: true },
      build(p) {
        palace(p, 0, -12, 1, true);
        for (let i = 0; i < 40; i++) diya(p, -14 + (i % 20) * 1.45, .08, i < 20 ? 3 : -4.5);
        for (let i = 0; i < 9; i++) diya(p, -6.8 + i * 1.7, 4.5, -9.2);
        for (const x of [-8, 0, 8]) { const l = new T.PointLight(0xffa040, 1, 14); l.position.set(x, 1.5, 0); p.add(l); }
      } },
  };
  function kund(p, x, z) {
    K.part(K.BOX(1.6, .45, 1.6), '#9a4a2a', p, [x, .22, z]);
    for (let i = 0; i < 5; i++) { const f = new T.Mesh(K.CONE(.25 - i * .03, .9 - i * .1, 6), K.basic(i % 2 ? '#f2a12b' : '#ffd76a', { transparent: true, opacity: .85 })); f.position.set(x + rnd(-.3, .3), .8, z + rnd(-.3, .3)); p.add(f); flames.push(f); }
    const l = new T.PointLight(0xffa040, 1.4, 12); l.position.set(x, 1.6, z); p.add(l);
  }

  function buildSet(name) {
    const def = SETS[name] || SETS.ashram;
    const th = def.theme || K.THEME3[def.themeKey] || K.THEME3.ashram;
    scene = new T.Scene(); flames = [];
    scene.fog = new T.Fog(th.fog, def.indoor ? 18 : 35, def.indoor ? 60 : 160);
    const sky = K.skyDome(th); scene.add(sky); scene.userData.sky = sky;
    scene.add(new T.HemisphereLight(th.night ? 0x8a8ac8 : 0xfff4dc, th.ground, th.night ? .45 : .34));
    const dir = new T.DirectionalLight(th.night ? 0xb8c4ff : 0xfff0d0, th.night ? .5 : (def.indoor ? .35 : .62));
    dir.position.set(def.sunLow ? -14 : 12, def.sunLow ? 10 : 22, 14); dir.castShadow = true; dir.shadow.mapSize.set(2048, 2048);
    const sc = dir.shadow.camera; sc.left = sc.bottom = -16; sc.right = sc.top = 16; sc.near = 1; sc.far = 70; dir.shadow.bias = -.0005;
    scene.add(dir); scene.add(new T.AmbientLight(0xffffff, def.indoor ? .3 : .12));
    if (!def.indoor) {
      const disc = new T.Mesh(new T.CircleGeometry(th.night ? 12 : 16, 32), K.basic(th.sun || '#fff3c4', { fog: false }));
      disc.position.set(def.sunLow ? -40 : -120, def.sunLow ? 18 : 110, -260); disc.lookAt(0, 0, 0); scene.add(disc);
    }
    if (th.night) {
      const pts = []; for (let i = 0; i < 500; i++) { const a = rnd(0, Math.PI * 2), b = rnd(.1, 1.4); pts.push(Math.cos(a) * Math.cos(b) * 350, Math.sin(b) * 350, Math.sin(a) * Math.cos(b) * 350); }
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xfff6d8, size: 1.6, sizeAttenuation: false, fog: false })));
    }
    const ground = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshToonMaterial({ map: K.groundTex(th), gradientMap: K.GRAD, color: 0xffffff }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    if (!def.indoor) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .3; K.mountain3(scene, Math.cos(a) * 150, Math.sin(a) * 150 - 40, rnd(40, 80), rnd(30, 55), name === 'kishkindha' ? '#b5713a' : name === 'battle' ? '#4a1a14' : th.night ? '#1e2a3a' : '#7fa874'); }
    def.build.call(def, scene, th);
  }

  /* =========================================================
     DIRECTING
     ========================================================= */
  function setScene(name) {
    if (!wanted()) return;
    K = Action3D.kit;
    try { K.init(); } catch (e) { console.warn('3D story unavailable', e); hide(); return; }
    if (!camera) camera = new T.PerspectiveCamera(42, W / H, .1, 900);
    for (const k in cast) delete cast[k];
    setName = name; diorama = name === 'title'; mapView = false; speaker = null; lineNo = 0;
    buildSet(name);
    if (diorama) ['rama', 'sita', 'lakshmana', 'hanuman'].forEach((k, i) => { const a = actorFor(k, i < 2 ? 'left' : 'right'); a.x = a.tx = -2.4 + i * 1.6; a.z = a.tz = .3; a.yaw = 0; a.diorama = true; a.J.root.position.y = .6; });
    shot = { kind: diorama ? 'orbit' : 'wide', t: 0 };
    snapCamera();
    show();
  }

  function actorFor(key, side) {
    const b = base(key);
    let a = cast[b];
    if (a && a.key !== key) { scene.remove(a.J.root); delete cast[b]; a = null; }
    if (!a) {
      const same = Object.values(cast).filter(c => c.side === side && !c.diorama);
      if (same.length >= 3) { const old = same.filter(c => c !== speaker).sort((p, q) => p.born - q.born)[0]; if (old) { scene.remove(old.J.root); delete cast[base(old.key)]; } }
      a = cast[b] = makeActor(key, side);
      const used = Object.values(cast).filter(c => c.side === side && c !== a).map(c => c.slot);
      let i = 0; while (used.includes(i)) i++;
      a.slot = i; const sp = slotPos(side, i); a.tx = sp.x; a.tz = sp.z;
      if (key === 'jatayu') a.ty = 2.4;
    }
    return a;
  }

  function present(key, side) { if (!scene) return; actorFor(key, side); }
  function speak(key, side) {
    if (!scene) return;
    const a = actorFor(key, side);
    speaker = a; lineNo++;
    const others = Object.values(cast).filter(c => c !== a && !c.diorama);
    shot = { kind: others.length && lineNo % 3 === 0 ? 'two' : 'close', t: 0, a, b: others.sort((p, q) => Math.abs(p.tx - a.tx) - Math.abs(q.tx - a.tx)).find(c => c.side !== a.side) || others[0] };
    snapCamera();
  }
  function narrate() { if (!scene) return; speaker = null; shot = { kind: 'wide', t: 0, a0: rnd(-.4, .4) }; }
  function clear() { if (!scene) return; for (const k in cast) { if (!cast[k].diorama) { scene.remove(cast[k].J.root); delete cast[k]; } } speaker = null; }
  function setMapView(on) { mapView = on; }

  function shotTarget() {
    const s = shot;
    if (s.kind === 'orbit') {
      const a = Math.sin(t * .1) * .9, r = mapView ? 13 : 7.2;
      return { p: { x: Math.sin(a) * r, y: mapView ? 7 : 2.3, z: Math.cos(a) * r }, l: { x: 0, y: mapView ? 1 : 1.95, z: 0 } };
    }
    if (s.kind === 'close' && s.a) {
      const a = s.a, f = { x: Math.sin(a.yaw), z: Math.cos(a.yaw) }, hy = (a.ty || 0) + 1.62 * a.scale, d = 3.4 - Math.min(.5, s.t * .05);
      const toCenter = -Math.sign(a.tx || 1);
      return { p: { x: a.x + f.x * d + toCenter * .5, y: hy + .15, z: a.z + f.z * d + 1.4 }, l: { x: a.x + toCenter * .2, y: hy - .3, z: a.z } };
    }
    if (s.kind === 'two' && s.a && s.b) {
      const mx = (s.a.x + s.b.x) / 2, span = Math.abs(s.a.x - s.b.x);
      return { p: { x: mx + Math.sin(s.t * .1) * .5, y: 1.9, z: 3.2 + span * .9 }, l: { x: mx, y: 1.35, z: 0 } };
    }
    const a = (s.a0 || 0) + Math.sin(t * .07) * .35;
    return { p: { x: Math.sin(a) * 10.5, y: 3.6, z: Math.cos(a) * 10.5 + 1 }, l: { x: 0, y: 1.4, z: -1 } };
  }
  function snapCamera() { const tg = shotTarget(); Object.assign(cam, tg.p); Object.assign(look, tg.l); }

  /* =========================================================
     LOOP
     ========================================================= */
  function show() {
    document.getElementById('game3d').classList.add('story');
    document.body.classList.add('story3d');
    if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function hide() {
    running = false; cancelAnimationFrame(raf);
    const c = document.getElementById('game3d'); if (c) c.classList.remove('story');
    document.body.classList.remove('story3d');
    scene = null; for (const k in cast) delete cast[k];
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const busy = Action3D.active || (typeof Action !== 'undefined' && Action.active) || (typeof Games !== 'undefined' && Games.active);
    if (busy || !scene) { last = now; return; }
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; shot.t += dt;
    for (const a of Object.values(cast)) updateActor(a, dt);
    for (const f of flames) { f.scale.y = .8 + Math.sin(t * 14 + f.position.x * 3) * .25; f.scale.x = f.scale.z = .9 + Math.sin(t * 11 + f.position.z) * .1; }
    const tg = shotTarget(), k = Math.min(1, dt * (shot.kind === 'close' ? 4 : 1.8));
    cam.x = lerp(cam.x, tg.p.x, k); cam.y = lerp(cam.y, tg.p.y, k); cam.z = lerp(cam.z, tg.p.z, k);
    look.x = lerp(look.x, tg.l.x, k); look.y = lerp(look.y, tg.l.y, k); look.z = lerp(look.z, tg.l.z, k);
    camera.position.set(cam.x, cam.y, cam.z); camera.lookAt(look.x, look.y, look.z);
    if (scene.userData.sky) scene.userData.sky.position.copy(camera.position);
    K.renderer.render(scene, camera);
  }

  function updateActor(a, dt) {
    a.at += dt;
    const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
    let anim;
    if (d > .05 && !a.diorama) {
      const sp = Math.min(d, dt * 2.6); a.x += dx / d * sp; a.z += dz / d * sp;
      a.yaw += ((Math.atan2(dx, dz) - a.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 8);
      anim = 'walk';
    } else {
      // face whoever is speaking, or the opposite side
      let fy;
      if (a.diorama) fy = Math.sin(t * .3 + a.x) * .2;
      else if (speaker && speaker !== a) fy = Math.atan2(speaker.x - a.x, (speaker.z - a.z) + 2);
      else fy = a.side === 'left' ? Math.PI / 2 - .55 : -Math.PI / 2 + .55;
      a.yaw += ((fy - a.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 4);
      anim = speaker === a ? 'talk' : (IDLE[a.key] || IDLE[base(a.key)] || 'idle');
    }
    const J = a.J;
    J.root.position.set(a.x, a.diorama ? .6 : (a.ty || 0) + (a.special === 'bird' ? Math.sin(t * 2) * .2 : 0), a.z);
    J.root.rotation.y = a.yaw; J.root.scale.setScalar(a.scale);
    if (a.special === 'bird') { const f = Math.sin(t * 6) * .5; J.wings[0].rotation.z = -f; J.wings[1].rotation.z = f; return; }
    if (a.special === 'deer') { J.head.rotation.x = Math.sin(t * 1.5) * .15; J.pivot.position.y = .95 + Math.abs(Math.sin(t * 3)) * .03; return; }
    if (a.key === 'sita_vatika' && anim !== 'walk' && speaker !== a) anim = 'grief';
    K.applyPose(J, (K.POSE[anim] || K.POSE.idle)(a.at, a), Math.min(1, dt * 10));
    if (speaker && speaker !== a && J.head) J.head.rotation.y = Math.sin(t * .7 + a.x) * .05;
    if (J.tail) J.tail.forEach((s, i) => { if (i) s.rotation.x = -.22 + Math.sin(t * 2.5 + i * .6) * .12; });
  }

  return {
    get enabled() { return wanted(); }, setScene, present, speak, narrate, clear, hide, setMapView,
    get active() { return running; },
  };
})();
