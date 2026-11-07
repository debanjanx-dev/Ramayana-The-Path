'use strict';
/* =========================================================
   ACTION 3D — third-person combat in Three.js.
   Characters are modelled in code: jointed limbs, painted
   faces on 3D heads, crowns, jewellery and weapons, with ink
   outlines and toon shading to echo miniature painting.
   ========================================================= */
const Action3D = (() => {
  const T = window.THREE;
  const W = 1280, H = 720, GRAV = 24;
  const SERIF = '"Cormorant Garamond", Georgia, serif', DISPLAY = '"Yatra One", "Cormorant Garamond", serif';
  const DEVA = '"Tiro Devanagari Hindi", "Kohinoor Devanagari", serif';
  const supported = (() => {
    if (!T) return false;
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  })();

  let renderer, scene, camera, glCv, hud, hctx, S = null, raf = 0, last = 0, bound = false, resolveFn = null, padEl;
  let GRAD, OUTLINE, PS_ADD, PS_NORM;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const once = (m, k) => (m[k] ? false : (m[k] = true));
  const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  const hyp = (x, z) => Math.sqrt(x * x + z * z);

  /* =========================================================
     GRAPHICS SETUP
     ========================================================= */
  let failed = false;
  function initGfx() {
    if (renderer) return;
    try { initGfxInner(); } catch (e) { failed = true; renderer = null; throw e; }
  }
  function initGfxInner() {
    glCv = document.getElementById('game3d');
    renderer = new T.WebGLRenderer({ canvas: glCv, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    const d = new Uint8Array([120, 120, 120, 255, 190, 190, 190, 255, 245, 245, 245, 255]);
    GRAD = new T.DataTexture(d, 3, 1, T.RGBAFormat); GRAD.minFilter = GRAD.magFilter = T.NearestFilter; GRAD.needsUpdate = true;
    OUTLINE = new T.ShaderMaterial({
      uniforms: { t: { value: .016 }, c: { value: new T.Color(0x2b1a10) } },
      vertexShader: 'uniform float t; void main(){ vec3 p = position + normal * t; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform vec3 c; void main(){ gl_FragColor = vec4(c, 1.0); }',
      side: T.BackSide,
    });
    camera = new T.PerspectiveCamera(50, W / H, .1, 900);
    hud = document.getElementById('game'); hctx = hud.getContext('2d');
  }

  const matCache = {}, geoCache = {}, texCache = {};
  const geo = (k, f) => geoCache[k] || (geoCache[k] = f());
  function toon(color, o = {}) {
    const key = color + JSON.stringify(o);
    return matCache[key] || (matCache[key] = new T.MeshToonMaterial(Object.assign({ color: new T.Color(color), gradientMap: GRAD }, o)));
  }
  function basic(color, o = {}) {
    const key = 'b' + color + JSON.stringify(o);
    return matCache[key] || (matCache[key] = new T.MeshBasicMaterial(Object.assign({ color: new T.Color(color) }, o)));
  }
  const WHITE = () => basic('#fff6e6');

  function part(g, color, parent, pos, o = {}) {
    const m = new T.Mesh(g, o.mat || toon(color, o.flat ? { flatShading: true } : {}));
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    if (o.scale) m.scale.set(o.scale[0], o.scale[1], o.scale[2]);
    m.castShadow = !o.noShadow; m.receiveShadow = !!o.receive;
    if (!o.noOutline) { const ol = new T.Mesh(g, OUTLINE); ol.userData.outline = true; m.add(ol); }
    parent.add(m);
    return m;
  }
  const SPH = (r, a = 16, b = 12) => geo(`s${r}_${a}`, () => new T.SphereGeometry(r, a, b));
  const CAP = (r, l) => geo(`c${r}_${l}`, () => new T.CapsuleGeometry(r, l, 4, 10));
  const CYL = (a, b, h, n = 12, open = false) => geo(`y${a}_${b}_${h}_${n}_${open}`, () => new T.CylinderGeometry(a, b, h, n, 1, open));
  const CONE = (r, h, n = 8) => geo(`k${r}_${h}_${n}`, () => new T.ConeGeometry(r, h, n));
  const BOX = (x, y, z) => geo(`b${x}_${y}_${z}`, () => new T.BoxGeometry(x, y, z));
  const TOR = (r, t, a = 6, b = 20) => geo(`t${r}_${t}_${a}_${b}`, () => new T.TorusGeometry(r, t, a, b));

  /* =========================================================
     FACES — painted onto a texture wrapped round the head
     ========================================================= */
  function faceSpec(key) {
    if (key.startsWith('ravana')) { const n = +key.slice(6) || 0; return Object.assign({}, RAVANA, RAVANA_MOODS[n % 5]); }
    if (VANARA_LOOKS[key]) return Object.assign({ vanara: true }, VANARA_DEF, VANARA_LOOKS[key]);
    if (key === 'jambavan') return Object.assign({ vanara: true }, VANARA_DEF, { fur: '#3e302a', furD: '#1e1612', muzzle: '#9a8a78', crownT: null, whiteBrow: true, eyes: 'serene', tilak: 'tripundra' });
    return Object.assign({ skin: '#e8b88a', hair: '#1a1110', eyes: 'calm', mouth: 'smile', iris: '#1b0f08', lip: '#a8323a', brow: INK, crown: 'none', earring: 'kundala' }, LOOKS[key]);
  }

  function faceTex(key) {
    if (texCache[key]) return texCache[key];
    const P = faceSpec(key), c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d'), X = 128, Y = 128, ink = INK;
    const skin = P.vanara ? P.fur : P.skin;
    g.fillStyle = skin; g.fillRect(0, 0, 512, 256);
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (P.vanara) {
      g.fillStyle = P.muzzle; g.globalAlpha = .6; g.beginPath(); g.ellipse(X, Y - 10, 64, 26, 0, 0, 7); g.fill(); g.globalAlpha = 1;
      if (P.whiteBrow) { g.fillStyle = '#eee6d6'; g.fillRect(X - 50, Y - 40, 100, 10); }
    } else {
      g.fillStyle = P.hair;
      const back = P.female || P.wild ? 256 : 200;
      g.fillRect(0, 0, 512, 40); g.fillRect(206, 0, 306, back); g.fillRect(0, 0, 50, back);
      g.beginPath(); g.moveTo(50, 122); g.quadraticCurveTo(X, 2, 206, 122); g.lineTo(206, 0); g.lineTo(50, 0); g.closePath(); g.fill();
      if (P.sindoor) { g.strokeStyle = SINDOOR; g.lineWidth = 4; g.beginPath(); g.moveTo(X, 34); g.lineTo(X, 62); g.stroke(); }
      if (P.flowers) { g.fillStyle = '#fffdf5'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(58 + i * 4, 112 - i * 9, 3.5, 0, 7); g.arc(198 - i * 4, 112 - i * 9, 3.5, 0, 7); g.fill(); } }
    }
    // eyes & brows
    const kind = P.eyes, big = kind === 'fierce';
    for (const s of [-1, 1]) {
      const cx = X + s * 28, cy = Y - 10;
      g.beginPath(); g.moveTo(cx - 16, cy); g.quadraticCurveTo(cx, cy - (big ? 13 : 10), cx + 16, cy); g.quadraticCurveTo(cx, cy + (big ? 9 : 7), cx - 16, cy); g.closePath();
      g.fillStyle = '#fff8ea'; g.fill(); g.lineWidth = 2.6; g.strokeStyle = ink; g.stroke();
      g.beginPath(); g.moveTo(cx + s * 16, cy); g.lineTo(cx + s * 25, cy - 4); g.stroke();
      g.fillStyle = P.vanara ? '#3a1a08' : P.iris; g.beginPath(); g.arc(cx, cy, big ? 5.6 : 5, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + 1.6, cy - 1.6, 1.5, 0, 7); g.fill();
      if (kind === 'serene' || kind === 'sad') {
        g.fillStyle = skin; g.beginPath(); g.moveTo(cx - 16, cy); g.quadraticCurveTo(cx, cy - 11, cx + 16, cy); g.quadraticCurveTo(cx, cy - (kind === 'sad' ? 2 : 3.5), cx - 16, cy); g.fill(); g.stroke();
      }
      const inner = cx - s * 15, outer = cx + s * 17, by = cy - 17;
      g.strokeStyle = P.vanara ? P.furD : (P.brow || ink); g.lineWidth = big ? 5.5 : 3.4; g.beginPath();
      if (big) { g.moveTo(outer, by - 6); g.quadraticCurveTo(cx, by - 7, inner, by + 8); }
      else if (kind === 'sad') { g.moveTo(outer, by + 4); g.quadraticCurveTo(cx, by, inner, by - 4); }
      else if (kind === 'stern') { g.moveTo(outer, by + 1); g.quadraticCurveTo(cx, by - 3, inner, by + 4); }
      else { g.moveTo(outer, by + 4); g.quadraticCurveTo(cx, by - 7, inner, by + 2); }
      g.stroke();
      if (P.female) { g.fillStyle = 'rgba(232,106,106,.25)'; g.beginPath(); g.arc(X + s * 34, Y + 16, 10, 0, 7); g.fill(); }
      if (P.old) { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(outer + s * 4, cy + 2); g.lineTo(outer + s * 10, cy + 5); g.stroke(); }
    }
    if (!P.vanara) {
      g.strokeStyle = ink; g.lineWidth = 2.4; g.beginPath(); g.moveTo(X, Y - 4); g.quadraticCurveTo(X - 5, Y + 13, X - 2, Y + 17); g.quadraticCurveTo(X + 2, Y + 20, X + 8, Y + 15); g.stroke();
      const my = Y + 37;
      if (P.mouth === 'fierce' || P.mouth === 'laugh') {
        g.fillStyle = '#5a0f12'; g.beginPath(); g.moveTo(X - 16, my - 2); g.quadraticCurveTo(X, my - 6, X + 16, my - 2); g.quadraticCurveTo(X, my + (P.mouth === 'laugh' ? 18 : 13), X - 16, my - 2); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.fillRect(X - 10, my - 3, 20, 4);
      } else {
        g.fillStyle = P.lip || '#a8323a'; g.beginPath();
        if (P.mouth === 'sad') { g.moveTo(X - 12, my + 3); g.quadraticCurveTo(X, my - 4, X + 12, my + 3); g.quadraticCurveTo(X, my + 6, X - 12, my + 3); }
        else if (P.mouth === 'smile') { g.moveTo(X - 13, my - 1); g.quadraticCurveTo(X, my - 4, X + 13, my - 1); g.quadraticCurveTo(X, my + 10, X - 13, my - 1); }
        else { g.moveTo(X - 12, my); g.quadraticCurveTo(X, my - 3, X + 12, my); g.quadraticCurveTo(X, my + 6, X - 12, my); }
        g.fill(); g.lineWidth = 1.4; g.stroke();
      }
      if (P.fangs) { g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(X - 11, my); g.lineTo(X - 8, my + 11); g.lineTo(X - 5, my); g.moveTo(X + 5, my); g.lineTo(X + 8, my + 11); g.lineTo(X + 11, my); g.fill(); }
      if (P.beard === 'moustache') { g.fillStyle = '#120b08'; g.beginPath(); g.moveTo(X - 22, my - 4); g.quadraticCurveTo(X, my - 18, X + 22, my - 4); g.quadraticCurveTo(X + 34, my - 2, X + 36, my - 16); g.quadraticCurveTo(X + 34, my + 4, X + 18, my - 1); g.quadraticCurveTo(X, my - 8, X - 18, my - 1); g.quadraticCurveTo(X - 34, my + 4, X - 36, my - 16); g.quadraticCurveTo(X - 34, my - 2, X - 22, my - 4); g.fill(); }
      else if (P.beard) { g.fillStyle = P.beard === 'white' ? '#f4f1ea' : '#a8a299'; g.beginPath(); g.moveTo(X - 52, Y + 10); g.quadraticCurveTo(X - 40, Y + 120, X, Y + 128); g.quadraticCurveTo(X + 40, Y + 120, X + 52, Y + 10); g.quadraticCurveTo(X, Y + 54, X - 52, Y + 10); g.fill(); }
      if (P.nath) { g.strokeStyle = GOLD; g.lineWidth = 2; g.beginPath(); g.arc(X + 9, Y + 19, 6, 0, 7); g.stroke(); }
    }
    // tilak
    const tk = P.tilak, ty = Y - 52;
    if (tk === 'vaishnava') { g.strokeStyle = '#fff6dc'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(X - 7, ty - 14); g.quadraticCurveTo(X, ty + 22, X + 7, ty - 14); g.stroke(); g.strokeStyle = SINDOOR; g.beginPath(); g.moveTo(X, ty - 10); g.lineTo(X, ty + 8); g.stroke(); }
    else if (tk === 'tripundra') { g.strokeStyle = '#f2ede2'; g.lineWidth = 3; for (const o of [-8, 0, 8]) { g.beginPath(); g.moveTo(X - 20, ty + o); g.lineTo(X + 20, ty + o); g.stroke(); } g.fillStyle = SINDOOR; g.beginPath(); g.arc(X, ty, 3.5, 0, 7); g.fill(); }
    else if (tk === 'sindoor') { g.fillStyle = '#ec4a1c'; g.beginPath(); g.moveTo(X - 5, ty + 2); g.quadraticCurveTo(X, ty - 16, X + 5, ty + 2); g.lineTo(X + 2, ty + 22); g.lineTo(X - 2, ty + 22); g.closePath(); g.fill(); }
    if (P.bindi) { g.fillStyle = SINDOOR; g.beginPath(); g.arc(X, Y - 34, 4.5, 0, 7); g.fill(); }
    const t = new T.CanvasTexture(c); t.anisotropy = 4;
    return (texCache[key] = t);
  }
  const faceMat = key => matCache['face' + key] || (matCache['face' + key] = new T.MeshToonMaterial({ map: faceTex(key), gradientMap: GRAD }));

  /* =========================================================
     MODELS
     ========================================================= */
  function buildHead(key, parent, y, sc = 1) {
    const P = faceSpec(key), g = new T.Group(); g.position.y = y; g.scale.setScalar(sc); parent.add(g);
    part(SPH(.15, 32, 22), null, g, [0, .15, 0], { mat: faceMat(key), scale: [1, 1.12, 1.04] });
    const skin = P.vanara ? P.fur : P.skin;
    for (const s of [-1, 1]) {
      if (P.vanara) { part(SPH(.06, 12, 10), P.fur, g, [s * .16, .16, -.01], { scale: [.55, 1, 1] }); part(SPH(.035, 10, 8), P.muzzle, g, [s * .185, .16, 0], { scale: [.4, 1, 1], noOutline: true }); }
      else part(SPH(.03, 10, 8), skin, g, [s * .148, .15, 0], { scale: [.6, 1.3, 1] });
      if (P.vanara || P.earring === 'kundala' || P.earring === 'jhumka') part(TOR(.028, .009, 6, 16), GOLD, g, [s * .16, .085, 0], { rot: [0, Math.PI / 2, 0], noOutline: true, noShadow: true });
    }
    if (P.vanara) {
      part(SPH(.085), P.muzzle, g, [0, .085, .115], { scale: [1.15, .85, .85] });
      part(SPH(.022, 8, 6), INK, g, [0, .115, .19], { noOutline: true });
      part(BOX(.08, .01, .01), INK, g, [0, .06, .186], { noOutline: true });
      if (P.jaw) part(SPH(.04, 10, 8), P.muzzle, g, [.06, .06, .12], { noOutline: true });
      if (P.whiteBrow) part(SPH(.06, 10, 8), '#eee6d6', g, [0, .02, .11], { scale: [1.2, .8, .8] });
    } else {
      if (P.female || P.wild) part(CAP(.12, .32), P.hair, g, [0, -.02, -.08], { scale: [1.12, 1, .62] });
      else part(CAP(.11, .1), P.hair, g, [0, .05, -.075], { scale: [1.18, 1, .62] });
      if (P.wild) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part(SPH(.06, 8, 6), P.hair, g, [Math.cos(a) * .15, .22 + Math.sin(a) * .06, Math.sin(a) * .1 - .03]); }
      if (P.sidelocks) for (const s of [-1, 1]) part(SPH(.045, 10, 8), P.hair, g, [s * .15, .2, .02]);
      if (P.ekaveni) part(CAP(.03, .4), P.hair, g, [.08, -.12, -.08], { rot: [.2, 0, .15] });
    }
    const cr = P.vanara ? (P.crownT === null ? 'none' : P.crownT > 20 ? 'kiritaS' : 'kirita') : P.crown;
    if (cr === 'kirita' || cr === 'kiritaS') {
      const h = cr === 'kirita' ? .3 : .17;
      part(CYL(.158, .158, .055, 20, true), GOLD, g, [0, .255, 0], { mat: toon(GOLD, { side: T.DoubleSide }) });
      part(CONE(.13, h, 8), GOLD, g, [0, .28 + h / 2, 0], { flat: true });
      part(SPH(.026, 10, 8), RUBY, g, [0, .27, .158], { noOutline: true });
      part(SPH(.02, 8, 6), EMER, g, [0, .33, .1], { noOutline: true });
      part(SPH(.025, 8, 6), GOLD_L, g, [0, .28 + h + .02, 0], { noOutline: true });
    } else if (cr === 'jata' || cr === 'sage') {
      const r = cr === 'sage' ? .11 : .085;
      part(SPH(r, 14, 10), P.hair, g, [0, .3 + r * .4, -.02]);
      part(TOR(r * .8, .012, 6, 16), '#6b3a1f', g, [0, .3, -.02], { rot: [Math.PI / 2, 0, 0], noOutline: true });
    } else if (cr === 'tiara') {
      part(TOR(.152, .012, 6, 20), GOLD, g, [0, .25, 0], { rot: [Math.PI / 2 - .25, 0, 0], noOutline: true });
      part(SPH(.022, 8, 6), RUBY, g, [0, .245, .15], { noOutline: true });
    } else if (cr === 'queen') {
      part(CONE(.09, .14, 6), GOLD, g, [0, .34, 0], { flat: true });
    }
    if (P.horns) for (const s of [-1, 1]) part(CONE(.03, .15, 8), '#e9dcc0', g, [s * .1, .34, 0], { rot: [0, 0, -s * .5] });
    return g;
  }

  /* rig colours & kit */
  const RIG3 = {
    rama_young: { head: 'rama_young', skin: '#4a78b5', dhoti: '#f2b705', sash: '#c0392b', weapon: 'bow', thread: true, necklace: true },
    rama_exile: { head: 'rama_exile', skin: '#4a78b5', dhoti: '#a8743c', sash: '#6b4422', weapon: 'bow', thread: true, rudra: true },
    hanuman: { head: 'hanuman', vanara: true, skin: '#d4582a', chest: '#f3b98c', dhoti: '#c0392b', sash: '#e8891c', weapon: 'gada', tail: true, thread: true, necklace: true },
    sugriva: { head: 'sugriva', vanara: true, skin: '#b07a3a', chest: '#e9c89a', dhoti: '#2e7d4f', weapon: 'none', tail: true, garland: true },
    vali: { head: 'vali', vanara: true, skin: '#c9962a', chest: '#f0d9a6', dhoti: '#8e1b2a', weapon: 'none', tail: true, chain: true },
    rakA: { head: 'rakA', skin: '#6a5a8a', dhoti: '#3a1a2a', armor: '#2a1a2a', weapon: 'club' },
    rakB: { head: 'rakB', skin: '#5a7a5a', dhoti: '#4a2a1a', armor: '#3a2a1a', weapon: 'sword' },
    rakC: { head: 'rakC', skin: '#8a5a4a', dhoti: '#2a2a3a', weapon: 'bow' },
    brute: { head: 'rakB', skin: '#4a5a3a', dhoti: '#3a1a10', armor: '#5a4a3a', weapon: 'club' },
    demon: { head: 'rakA', skin: '#3a2050', dhoti: '#1e1028', armor: '#1e1028', weapon: 'none', wings: true },
    subahu: { head: 'subahu', skin: '#7a3a4a', dhoti: '#3a0a14', armor: '#5a1630', weapon: 'sword', wings: true },
    maricha: { head: 'rakB', skin: '#2e5a46', dhoti: '#1a3a2a', armor: '#2e5a46', weapon: 'none', wings: true },
    tataka: { head: 'tataka', skin: '#5a4a6a', dhoti: '#2a1a2a', blouse: '#2a1a2a', female: true, weapon: 'none' },
    khara: { head: 'khara', skin: '#7a5a3a', dhoti: '#5b0f17', armor: '#8a6212', weapon: 'mace' },
    akshaya: { head: 'akshaya', skin: '#a06a43', dhoti: '#5b0f17', armor: '#c9a227', weapon: 'sword', necklace: true },
    kumbha: { head: 'kumbha', skin: '#6a4a3a', dhoti: '#3a1a10', armor: '#5a4a3a', weapon: 'club', necklace: true },
    ravana: { head: 'ravana10', skin: '#a06a43', dhoti: '#5b0f17', armor: '#d4a017', weapon: 'sword', extraArms: true, necklace: true },
    sita: { head: 'sita', skin: '#f2cba4', dhoti: '#b3202a', blouse: '#1f7a4a', female: true, weapon: 'none', necklace: true },
    // story cast
    rama: { head: 'rama', skin: '#4a78b5', dhoti: '#f2b705', sash: '#c0392b', weapon: 'bow', thread: true, necklace: true },
    lakshmana: { head: 'lakshmana', skin: '#e9bd8b', dhoti: '#2e7d4f', sash: '#d4a017', weapon: 'bow', thread: true, necklace: true },
    lakshmana_young: { head: 'lakshmana_young', skin: '#e9bd8b', dhoti: '#2e7d4f', sash: '#d4a017', weapon: 'bow', thread: true, necklace: true },
    lakshmana_exile: { head: 'lakshmana_exile', skin: '#e9bd8b', dhoti: '#94683a', sash: '#6b4422', weapon: 'bow', thread: true, rudra: true },
    sita_vatika: { head: 'sita_vatika', skin: '#eec39b', dhoti: '#cfae5a', blouse: '#b89a4e', female: true, weapon: 'none' },
    dasharatha: { head: 'dasharatha', skin: '#eab48a', dhoti: '#8e1b2a', armor: '#8e1b2a', long: true, weapon: 'none', necklace: true },
    kaikeyi: { head: 'kaikeyi', skin: '#efc39a', dhoti: '#5b2a7a', blouse: '#c9a227', female: true, weapon: 'none', necklace: true },
    bharata: { head: 'bharata', skin: '#557fb2', dhoti: '#9a6a38', sash: '#6b4422', weapon: 'none', rudra: true, thread: true, prop: 'padukas' },
    vishwamitra: { head: 'vishwamitra', skin: '#c98c5a', dhoti: '#d9731f', armor: '#d9731f', long: true, weapon: 'none', rudra: true },
    valmiki: { head: 'valmiki', skin: '#b9814f', dhoti: '#f1ead8', armor: '#f1ead8', long: true, weapon: 'none', rudra: true, prop: 'manuscript' },
    janaka: { head: 'janaka', skin: '#e3ae80', dhoti: '#efe6d0', armor: '#efe6d0', long: true, weapon: 'none', necklace: true, rudra: true },
    shabari: { head: 'shabari', skin: '#a8724a', dhoti: '#d8c08a', blouse: '#c4a970', female: true, weapon: 'none', rudra: true, prop: 'basket' },
    vibhishana: { head: 'vibhishana', skin: '#a06a43', dhoti: '#ece3cf', armor: '#ece3cf', sash: '#e8891c', long: true, weapon: 'none', necklace: true },
    jambavan: { head: 'jambavan', vanara: true, skin: '#3e302a', chest: '#9a8a78', dhoti: '#6b4422', weapon: 'none', rudra: true },
    ravana1: { head: 'ravana10', skin: '#a06a43', dhoti: '#5b0f17', armor: '#d4a017', long: true, weapon: 'sword', extraArms: true, necklace: true },
  };

  function buildFigure(rk) {
    const R = RIG3[rk], root = new T.Group(), pivot = new T.Group(); pivot.position.y = .5; root.add(pivot);
    const hips = new T.Group(); hips.position.y = .45; pivot.add(hips);
    const skin = R.skin;
    part(SPH(.17, 16, 12), R.dhoti, hips, [0, 0, 0], { scale: [1.15, .8, .85] });
    const long = R.female || R.long, sk = long ? .9 : .5;
    part(CYL(.2, long ? .34 : .27, sk, 14, true), R.dhoti, hips, [0, -sk / 2 + .03, 0], { mat: toon(R.dhoti, { side: T.DoubleSide }) });
    part(TOR(long ? .335 : .265, .016, 6, 24), GOLD, hips, [0, -sk + .04, 0], { rot: [Math.PI / 2, 0, 0], noOutline: true, noShadow: true });
    const torso = new T.Group(); hips.add(torso);
    const chestCol = R.armor || (R.female ? R.blouse : skin);
    part(CYL(.23, .16, .5, 14), chestCol, torso, [0, .27, 0], { scale: [1, 1, .72] });
    if (R.vanara) part(SPH(.13, 12, 10), R.chest, torso, [0, .25, .07], { scale: [1, 1.3, .5], noOutline: true });
    if (R.armor) { part(TOR(.2, .015, 6, 20), GOLD, torso, [0, .5, 0], { rot: [Math.PI / 2, 0, 0], scale: [1, .72, 1], noOutline: true }); part(SPH(.04, 8, 6), RUBY, torso, [0, .3, .13], { noOutline: true }); }
    for (const s of [-1, 1]) part(SPH(.085, 12, 10), R.armor ? GOLD : chestCol, torso, [s * .23, .47, 0]);
    if (R.sash) part(BOX(.09, .62, .03), R.sash, torso, [0, .28, .125], { rot: [0, 0, .62], noOutline: true });
    if (R.thread) part(TOR(.2, .006, 4, 24), '#fff7e6', torso, [0, .3, 0], { rot: [Math.PI / 2, -.62, 0], scale: [1, .72, 1], noOutline: true, noShadow: true });
    if (R.necklace || R.chain) part(TOR(.11, R.chain ? .022 : .012, 6, 20), GOLD, torso, [0, .5, .03], { rot: [Math.PI / 2 - .4, 0, 0], noOutline: true, noShadow: true });
    if (R.rudra) part(TOR(.115, .016, 6, 14), '#6b3a1f', torso, [0, .5, .03], { rot: [Math.PI / 2 - .4, 0, 0], noOutline: true, noShadow: true });
    if (R.garland) for (let i = 0; i < 14; i++) { const a = Math.PI * (.08 + i * .06); part(SPH(.026, 6, 5), i % 2 ? '#f0a020' : '#fff7d6', torso, [Math.cos(a) * .16, .52 - Math.sin(a) * .2, .12], { noOutline: true, noShadow: true }); }
    part(TOR(.165, .02, 6, 20), GOLD, hips, [0, .04, 0], { rot: [Math.PI / 2, 0, 0], scale: [1.1, .85, 1], noOutline: true, noShadow: true });
    part(CYL(.055, .065, .12, 10), skin, torso, [0, .56, 0]);
    let head = null, heads = null;
    if (R.head === 'ravana10') {
      heads = [];
      const holder = new T.Group(); holder.position.y = .58; torso.add(holder);
      RAVANA_HEADS.forEach(([x, y, sc], i) => {
        const hg = buildHead('ravana' + (i % 5), holder, -(y - 104) * .00375 + 0, sc);
        hg.position.x = (x - 100) * .00375; hg.position.z = -(1 - sc) * .12;
        hg.userData.sc = sc; heads.push(hg);
      });
      head = heads[9];
    } else head = buildHead(R.head, torso, .58);
    const arm = side => {
      const sh = new T.Group(); sh.position.set(side * .25, .47, 0); torso.add(sh);
      part(CAP(.058, .2), skin, sh, [0, -.14, 0]);
      part(TOR(.065, .014, 6, 14), GOLD, sh, [0, -.1, 0], { rot: [Math.PI / 2, 0, 0], noOutline: true, noShadow: true });
      const el = new T.Group(); el.position.y = -.29; sh.add(el);
      part(CAP(.05, .18), skin, el, [0, -.12, 0]);
      const hand = new T.Group(); hand.position.y = -.26; el.add(hand);
      part(SPH(.055, 10, 8), skin, hand, [0, 0, 0]);
      return { sh, el, hand };
    };
    const aL = arm(1), aR = arm(-1);
    const leg = side => {
      const hp = new T.Group(); hp.position.set(side * .1, -.04, 0); hips.add(hp);
      part(CAP(.078, .28), skin, hp, [0, -.21, 0]);
      const kn = new T.Group(); kn.position.y = -.44; hp.add(kn);
      part(CAP(.062, .28), skin, kn, [0, -.2, 0]);
      part(TOR(.065, .014, 6, 14), GOLD, kn, [0, -.37, 0], { rot: [Math.PI / 2, 0, 0], noOutline: true, noShadow: true });
      part(BOX(.1, .06, .22), skin, kn, [0, -.45, .05]);
      return { hp, kn };
    };
    const lL = leg(1), lR = leg(-1);
    const J = { root, pivot, hips, torso, head, heads, aL, aR, lL, lR };
    // weapons
    if (R.weapon === 'bow') J.bow = buildBow(aL.hand);
    if (R.weapon === 'gada') buildGada(aR.hand, false);
    if (R.weapon === 'mace') buildGada(aR.hand, true);
    if (R.weapon === 'sword') buildSword(aR.hand);
    if (R.weapon === 'club') buildClub(aR.hand);
    if (R.tail) J.tail = buildTail(hips, R.skin);
    if (R.wings) J.wings = buildWings(torso, R.armor || '#1e1028');
    if (R.extraArms) buildExtraArms(torso, skin);
    if (R.prop === 'padukas') for (const s of [-1, 1]) { part(BOX(.1, .04, .26), '#8a5a2b', head, [s * .06, .37, 0], { rot: [0, s * .15, 0] }); part(SPH(.022, 6, 5), GOLD, head, [s * .06, .4, .08], { noOutline: true }); }
    if (R.prop === 'manuscript') { part(BOX(.36, .05, .1), '#d9b874', aL.hand, [0, -.05, .05]); part(BOX(.36, .055, .01), '#8a6a32', aL.hand, [0, -.05, .1], { noOutline: true }); }
    if (R.prop === 'basket') { part(CYL(.16, .1, .12, 12), '#9c6b30', aR.hand, [.12, -.08, .12]); for (let i = 0; i < 5; i++) part(SPH(.035, 6, 5), '#b3122e', aR.hand, [.12 + rnd(-.08, .08), -.01, .12 + rnd(-.08, .08)], { noOutline: true }); }
    J.meshes = [];
    root.traverse(o => { if (o.isMesh && !o.userData.outline) J.meshes.push(o); });
    return J;
  }

  function buildBow(hand) {
    const g = new T.Group(); hand.add(g);
    const curve = new T.QuadraticBezierCurve3(new T.Vector3(0, 0, -.6), new T.Vector3(0, -.36, 0), new T.Vector3(0, 0, .6));
    const m = new T.Mesh(geo('bowTube', () => new T.TubeGeometry(curve, 16, .022, 6, false)), toon('#7a4a1e'));
    m.castShadow = true; g.add(m);
    part(CYL(.032, .032, .14, 8), GOLD, g, [0, -.27, 0], { rot: [Math.PI / 2, 0, 0], noOutline: true });
    const string = new T.Line(new T.BufferGeometry().setFromPoints([V(), V(), V()]), new T.LineBasicMaterial({ color: 0xf3ead2 }));
    string.frustumCulled = false;
    g.userData.tips = [new T.Vector3(0, 0, -.6), new T.Vector3(0, 0, .6)];
    return { g, string };
  }
  function buildGada(hand, iron) {
    const g = new T.Group(); hand.add(g);
    part(CYL(.025, .025, .5, 8), iron ? '#4a4a52' : '#6e4416', g, [0, -.2, 0]);
    part(SPH(.12, 14, 12), iron ? '#5a5a62' : GOLD, g, [0, -.52, 0], { scale: [1, 1.15, 1] });
    if (!iron) { part(TOR(.12, .012, 6, 18), GOLD_D, g, [0, -.52, 0], { rot: [Math.PI / 2, 0, 0], noOutline: true }); part(SPH(.03, 8, 6), RUBY, g, [0, -.52, .12], { noOutline: true }); part(SPH(.035, 8, 6), GOLD, g, [0, -.67, 0]); }
    else for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part(CONE(.03, .08, 6), '#d9dde2', g, [Math.cos(a) * .12, -.52, Math.sin(a) * .12], { rot: [0, 0, -Math.PI / 2], noOutline: true }); }
  }
  function buildSword(hand) {
    const g = new T.Group(); hand.add(g);
    part(BOX(.14, .03, .05), GOLD, g, [0, -.05, 0], { noOutline: true });
    part(BOX(.03, .62, .07), '#d9e2ea', g, [0, -.38, .02], { rot: [.12, 0, 0] });
  }
  function buildClub(hand) {
    const g = new T.Group(); hand.add(g);
    part(CYL(.07, .035, .75, 10), '#6a3a1a', g, [0, -.33, 0]);
    for (let i = 0; i < 8; i++) { const a = i * 1.7, y = -.25 - (i % 4) * .12; part(CONE(.022, .07, 5), '#d9dde2', g, [Math.cos(a) * .07, y, Math.sin(a) * .07], { rot: [Math.sin(a) * 1.5, 0, -Math.cos(a) * 1.5], noOutline: true }); }
  }
  function buildTail(hips, col) {
    const segs = []; let parent = hips;
    for (let i = 0; i < 9; i++) {
      const s = new T.Group(); s.position.set(0, i ? .13 : -.02, i ? 0 : -.16); s.rotation.x = i ? -.25 : -1.9; parent.add(s);
      part(CAP(.04 - i * .002, .09), col, s, [0, .06, 0]);
      segs.push(s); parent = s;
    }
    return segs;
  }
  function buildWings(torso, col) {
    const ws = [];
    for (const s of [-1, 1]) {
      const g = new T.Group(); g.position.set(s * .1, .42, -.12); torso.add(g);
      const shape = new T.Shape(); shape.moveTo(0, 0); shape.lineTo(s * .9, .35); shape.lineTo(s * .7, .05); shape.lineTo(s * 1.0, -.1); shape.lineTo(s * .6, -.2); shape.lineTo(s * .7, -.45); shape.lineTo(0, -.15);
      const m = new T.Mesh(new T.ShapeGeometry(shape), toon(col, { side: T.DoubleSide })); m.castShadow = true; g.add(m);
      ws.push(g);
    }
    return ws;
  }
  function buildExtraArms(torso, skin) {
    const kit = ['trident', 'shield', 'disc', 'axe', 'bow', 'trident'];
    [[1, .9], [1, 1.5], [1, 2.1], [-1, .9], [-1, 1.5], [-1, 2.1]].forEach(([s, a], i) => {
      const sh = new T.Group(); sh.position.set(s * .22, .44, -.06); sh.rotation.set(-.3 - i % 3 * .2, 0, s * a); torso.add(sh);
      part(CAP(.05, .42), skin, sh, [0, -.25, 0]);
      const h = new T.Group(); h.position.y = -.5; sh.add(h);
      const w = kit[i];
      if (w === 'trident') { part(CYL(.015, .015, .8, 6), '#cfd6dc', h, [0, 0, .1], { rot: [Math.PI / 2, 0, 0], noOutline: true }); part(CONE(.05, .15, 3), '#cfd6dc', h, [0, 0, .55], { rot: [Math.PI / 2, 0, 0], noOutline: true }); }
      if (w === 'shield') part(CYL(.22, .22, .04, 16), '#5b0f17', h, [0, 0, 0], { rot: [0, 0, Math.PI / 2] });
      if (w === 'disc') part(TOR(.14, .03, 6, 16), GOLD, h, [0, 0, 0], {});
      if (w === 'axe') { part(CYL(.015, .015, .6, 6), '#5e3a12', h, [0, -.2, 0], { noOutline: true }); part(BOX(.02, .18, .16), '#cfd6dc', h, [0, -.45, .08]); }
      if (w === 'bow') part(TOR(.35, .015, 4, 16, Math.PI), '#3e220f', h, [0, 0, 0], { noOutline: true });
    });
  }

  function buildJatayu() {
    const root = new T.Group(), body = new T.Group(); root.add(body);
    part(SPH(.5, 16, 12), '#7d5230', body, [0, 0, 0], { scale: [.85, .7, 1.4] });
    part(SPH(.22, 14, 10), '#efe6d6', body, [0, .15, .55], { scale: [1.3, 1, 1] });
    const hd = new T.Group(); hd.position.set(0, .3, .8); body.add(hd);
    part(SPH(.2, 14, 12), '#c98b6b', hd, [0, 0, 0]);
    part(CONE(.07, .26, 8), '#e2b33a', hd, [0, -.05, .25], { rot: [Math.PI / 2 + .35, 0, 0] });
    for (const s of [-1, 1]) { part(SPH(.04, 8, 6), GOLD_L, hd, [s * .13, .06, .1], { noOutline: true }); part(SPH(.022, 6, 5), INK, hd, [s * .155, .06, .12], { noOutline: true }); }
    part(CONE(.09, .16, 5), GOLD, hd, [0, .22, 0], { flat: true });
    part(SPH(.022, 6, 5), RUBY, hd, [0, .2, .08], { noOutline: true });
    const wings = [];
    for (const s of [-1, 1]) {
      const g = new T.Group(); g.position.set(s * .3, .15, .1); body.add(g);
      const shape = new T.Shape(); shape.moveTo(0, .3); shape.lineTo(s * 1.9, .2); shape.lineTo(s * 1.7, -.05); shape.lineTo(s * 2.0, -.25); shape.lineTo(s * 1.4, -.35); shape.lineTo(s * 1.5, -.6); shape.lineTo(s * .8, -.55); shape.lineTo(0, -.4);
      const m = new T.Mesh(new T.ShapeGeometry(shape), toon(s > 0 ? '#6b4423' : '#5a3a1d', { side: T.DoubleSide })); m.rotation.x = -Math.PI / 2; m.castShadow = true; g.add(m);
      const ol = new T.Mesh(new T.ShapeGeometry(shape), basic('#c9962a', { side: T.DoubleSide })); ol.rotation.x = -Math.PI / 2; ol.position.y = -.01; ol.scale.set(1.02, .2, 1); g.add(ol);
      wings.push(g);
    }
    for (let i = -1; i <= 1; i++) part(BOX(.18, .03, .6), '#4a2e16', body, [i * .14, 0, -.85], { rot: [0, i * .3, 0] });
    for (const s of [-1, 1]) part(CONE(.03, .2, 5), '#e2b33a', body, [s * .15, -.4, .1], { rot: [Math.PI, 0, 0], noOutline: true });
    const J = { root, pivot: body, wings, bird: true, meshes: [] };
    root.traverse(o => { if (o.isMesh && !o.userData.outline) J.meshes.push(o); });
    return J;
  }

  function buildChariot() {
    const root = new T.Group();
    part(BOX(2.8, .9, 1.7), GOLD, root, [0, .45, 0]);
    part(BOX(2.9, .14, 1.8), '#8e1b2a', root, [0, .95, 0]);
    for (let i = -3; i <= 3; i++) part(SPH(.07, 8, 6), i % 2 ? RUBY : EMER, root, [i * .38, .55, .86], { noOutline: true });
    const wheels = [];
    for (const s of [-1, 1]) {
      const w = new T.Group(); w.position.set(s * 1.1, .1, 0); root.add(w);
      part(TOR(.5, .06, 8, 22), '#5a2a1a', w, [0, 0, 0], { rot: [0, Math.PI / 2, 0] });
      for (let k = 0; k < 4; k++) part(BOX(.04, .95, .04), GOLD, w, [0, 0, 0], { rot: [k * Math.PI / 4, 0, 0], noOutline: true });
      wheels.push(w);
    }
    const cloud = new T.Group(); root.add(cloud);
    for (let i = 0; i < 6; i++) part(SPH(.5, 10, 8), '#ffffff', cloud, [rnd(-1.4, 1.4), -.35, rnd(-.6, .6)], { noOutline: true, mat: basic('#fffaf0', { transparent: true, opacity: .8 }) });
    const rv = buildFigure('ravana'); rv.root.position.set(.5, .95, 0); rv.root.scale.setScalar(.95); root.add(rv.root);
    const st = buildFigure('sita'); st.root.position.set(-.8, .95, -.2); st.root.scale.setScalar(.85); root.add(st.root);
    const J = { root, pivot: root, wheels, rv, st, chariot: true, meshes: [] };
    root.traverse(o => { if (o.isMesh && !o.userData.outline) J.meshes.push(o); });
    return J;
  }

  /* =========================================================
     POSES — joint angles: arms [forward, outward, elbow],
     legs [forward, knee], torso [lean, twist]
     ========================================================= */
  const PZ = o => Object.assign({ tor: [0, 0], hd: 0, aR: [.15, .12, .3], aL: [.15, .12, .3], lR: [0, 0], lL: [0, 0], bob: 0 }, o);
  const POSE = {
    idle: t => PZ({ bob: Math.sin(t * 2.4) * .012, tor: [.03, 0], aR: [.15, .14, .35], aL: [.15, .14, .35], lR: [.05, -.05], lL: [-.05, -.05] }),
    run: t => { const c = t * 11; return PZ({ tor: [.2, 0], bob: -Math.abs(Math.sin(c)) * .06, lR: [Math.sin(c) * .85, -(Math.max(0, Math.sin(c + 1.6)) * 1.3 + .15)], lL: [Math.sin(c + Math.PI) * .85, -(Math.max(0, Math.sin(c + Math.PI + 1.6)) * 1.3 + .15)], aR: [-Math.sin(c) * .8, .12, .9], aL: [Math.sin(c) * .8, .12, .9] }); },
    jump: (t, e) => (e.vy > 0 ? PZ({ tor: [.1, 0], lR: [.9, -1.3], lL: [-.2, -.5], aR: [2.4, .3, .3], aL: [1.9, .3, .4] }) : PZ({ tor: [.05, 0], lR: [.35, -.4], lL: [-.25, -.3], aR: [1.2, .4, .6], aL: [1.0, .4, .5] })),
    aim: (t, e) => { const u = e.aimUp || 0, d = e.drawK == null ? 1 : e.drawK; return PZ({ tor: [-.05, 0], lR: [.35, -.12], lL: [-.4, -.1], aL: [1.5 + u, .05, 0], aR: [1.42 + u, -.2, .8 + 1.7 * d] }); },
    windup: () => PZ({ tor: [-.25, 0], aR: [2.8, .2, .3], aL: [1.0, .3, .6], lR: [.4, -.2], lL: [-.4, -.2] }),
    strike: () => PZ({ tor: [.4, 0], aR: [.6, .1, .1], aL: [.3, .3, .5], lR: [.6, -.2], lL: [-.5, -.2] }),
    punch1: () => PZ({ tor: [.25, -.3], aR: [1.6, 0, 0], aL: [.4, .2, 1.6], lR: [.45, -.2], lL: [-.45, -.2] }),
    punch2: () => PZ({ tor: [.3, .3], aL: [1.6, 0, 0], aR: [.4, .2, 1.6], lR: [-.45, -.2], lL: [.45, -.2] }),
    swing: (t, e) => { const p = clamp(e.swingK || 0, 0, 1); return PZ({ tor: [lerp(-.3, .5, p), lerp(.5, -.5, p)], aR: [lerp(3.0, .4, p), .3, .2], aL: [lerp(2.4, .4, p), .2, .5], lR: [.6, -.3], lL: [-.5, -.2] }); },
    slam: () => PZ({ tor: [.3, 0], aR: [3.0, 0, 0], aL: [3.0, 0, 0], lR: [.9, -1.6], lL: [.3, -1.2] }),
    sweep: () => PZ({ tor: [.6, -.5], bob: -.15, aR: [1.2, .6, .1], aL: [.5, .4, .7], lR: [1.0, -1.2], lL: [-.5, -.3] }),
    stomp: () => PZ({ tor: [-.15, 0], lR: [1.5, -1.4], lL: [-.1, -.05], aR: [1.0, .8, .5], aL: [1.0, .8, .5] }),
    hurt: () => PZ({ tor: [-.4, 0], hd: -.3, aR: [-.6, .5, .5], aL: [-.6, .5, .5], lR: [.3, -.3], lL: [-.3, -.2] }),
    roll: () => PZ({ tor: [.9, 0], bob: -.1, lR: [1.9, -2.4], lL: [1.7, -2.3], aR: [1.5, .2, 1.6], aL: [1.5, .2, 1.6] }),
    roar: t => PZ({ tor: [-.3, 0], hd: -.35, bob: Math.sin(t * 30) * .01, aR: [2.2, .9, .6], aL: [2.2, .9, .6], lR: [.4, -.1], lL: [-.4, -.1] }),
    crouch: () => PZ({ tor: [.5, 0], bob: -.25, lR: [1.2, -2], lL: [1.0, -1.9], aR: [.6, .3, .8], aL: [.6, .3, .8] }),
    fly: t => PZ({ tor: [.3, 0], bob: Math.sin(t * 3) * .05, lR: [-.3, -.6], lL: [-.5, -.8], aR: [.4, .5, .6], aL: [.4, .5, .6] }),
    stand: () => PZ({ aR: [.1, .1, .2], aL: [.1, .1, .2] }),
    plead: () => PZ({ tor: [-.15, 0], hd: -.2, aR: [2.4, .4, .4], aL: [2.2, .4, .4] }),
    walk: t => { const c = t * 6.5; return PZ({ tor: [.06, 0], bob: -Math.abs(Math.sin(c)) * .025, lR: [Math.sin(c) * .45, -(Math.max(0, Math.sin(c + 1.6)) * .6 + .05)], lL: [Math.sin(c + Math.PI) * .45, -(Math.max(0, Math.sin(c + Math.PI + 1.6)) * .6 + .05)], aR: [-Math.sin(c) * .35, .1, .35], aL: [Math.sin(c) * .35, .1, .35] }); },
    talk: t => PZ({ bob: Math.sin(t * 2.4) * .01, tor: [.04, Math.sin(t * .9) * .08], hd: Math.sin(t * 5.5) * .05, aR: [.9 + Math.sin(t * 2.6) * .3, .25, 1.3 + Math.sin(t * 3.4) * .35], aL: [.25 + Math.max(0, Math.sin(t * 1.3)) * .5, .15, .7], lR: [.05, -.05], lL: [-.05, -.05] }),
    read: t => PZ({ bob: Math.sin(t * 2) * .01, hd: .25, aL: [1.1, .1, .6], aR: [.9, .15, 1.2], lR: [.04, -.04], lL: [-.04, -.04] }),
    namaste: t => PZ({ bob: Math.sin(t * 2) * .01, hd: .1, aR: [.75, -.05, 1.7], aL: [.75, -.05, 1.7] }),
    grief: t => PZ({ tor: [.18, 0], hd: .35, aR: [2.3, .1, 2.2], aL: [.2, .1, .4], bob: Math.sin(t * 1.5) * .01 }),
    carry: t => PZ({ bob: Math.sin(t * 2) * .01, aR: [2.7, -.1, 1.9], aL: [2.7, -.1, 1.9] }),
    offer: t => PZ({ tor: [.12, 0], hd: .1, aR: [1.2, .05, .4], aL: [1.2, .05, .4], bob: Math.sin(t * 2) * .01 }),
    proud: t => PZ({ tor: [-.08, 0], hd: -.12, aR: [.3, .7, 1.8], aL: [.3, .7, 1.8], bob: Math.sin(t * 2) * .01 }),
    stern: t => PZ({ hd: -.05, aR: [.9, -.2, 1.6], aL: [.9, -.2, 1.6], bob: Math.sin(t * 2) * .01 }),
    hold: t => PZ({ bob: Math.sin(t * 2.4) * .012, aR: [.5, .1, 1.1], aL: [.5, .1, 1.1] }),
  };

  function setRot(o, x, y, z, k) { o.rotation.x += (x - o.rotation.x) * k; o.rotation.y += (y - o.rotation.y) * k; o.rotation.z += (z - o.rotation.z) * k; }
  function applyPose(J, p, k) {
    setRot(J.torso, p.tor[0], p.tor[1], 0, k);
    setRot(J.head, p.hd, 0, 0, k);
    setRot(J.aR.sh, -p.aR[0], 0, -p.aR[1], k); setRot(J.aR.el, -p.aR[2], 0, 0, k);
    setRot(J.aL.sh, -p.aL[0], 0, p.aL[1], k); setRot(J.aL.el, -p.aL[2], 0, 0, k);
    setRot(J.lR.hp, -p.lR[0], 0, 0, k); setRot(J.lR.kn, -p.lR[1], 0, 0, k);
    setRot(J.lL.hp, -p.lL[0], 0, 0, k); setRot(J.lL.kn, -p.lL[1], 0, 0, k);
    J.hips.position.y += (.45 + p.bob - J.hips.position.y) * k;
  }

  function flashOn(e, on) {
    if (!e.J || e.flashing === on) return;
    e.flashing = on;
    for (const m of e.J.meshes) { if (on) { m.userData.mat = m.material; m.material = WHITE(); } else if (m.userData.mat) m.material = m.userData.mat; }
  }

  /* =========================================================
     WORLD
     ========================================================= */
  const THEME3 = {
    ashram: { sky: ['#8ec5e0', '#f4ecd0'], fog: '#e6e8cc', ground: '#8e9450', ground2: '#6e7a3a', tree: ['#2f6b2a', '#4f8a3a'], sun: '#fff3c4' },
    forest: { sky: ['#7fb8d8', '#e9eec8'], fog: '#d6e2be', ground: '#6e8f3e', ground2: '#4e6e2a', tree: ['#24502a', '#3f7a38'], sun: '#fff3c4' },
    kishkindha: { sky: ['#e9a868', '#f7e6c4'], fog: '#f0d6a8', ground: '#b08a5a', ground2: '#93704a', tree: ['#3a6a30', '#5a9a44'], sun: '#ffe2a0' },
    lanka: { sky: ['#0e1240', '#4a2a5a'], fog: '#2a1e40', ground: '#2e3a26', ground2: '#1e2a18', tree: ['#2d5a2c', '#3f7a38'], night: true },
    battle: { sky: ['#5a1010', '#f2a12b'], fog: '#b0602a', ground: '#7a4a2a', ground2: '#5a3218', tree: ['#4a3a1a', '#5a4a2a'], sun: '#f6d77e' },
    sky: { sky: ['#6fb2dc', '#f4ecd0'], fog: '#dfe9e0', ground: '#2f5d2a', ground2: '#24502a', tree: ['#24502a', '#3f7a38'], sun: '#fff3c4' },
  };

  function groundTex(th) {
    const k = 'g' + th.ground; if (texCache[k]) return texCache[k];
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = th.ground; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) { g.fillStyle = th.ground2; g.globalAlpha = rnd(.15, .45); g.beginPath(); g.ellipse(rnd(0, 256), rnd(0, 256), rnd(6, 26), rnd(3, 12), rnd(0, 3), 0, 7); g.fill(); }
    g.globalAlpha = .7; g.strokeStyle = th.ground2; g.lineWidth = 2;
    for (let i = 0; i < 70; i++) { const x = rnd(0, 256), y = rnd(0, 256); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-3, 3), y - rnd(5, 10)); g.stroke(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(40, 40); t.anisotropy = 4;
    return (texCache[k] = t);
  }

  function skyDome(th) {
    const m = new T.Mesh(new T.SphereGeometry(400, 24, 16), new T.ShaderMaterial({
      uniforms: { top: { value: new T.Color(th.sky[0]) }, bot: { value: new T.Color(th.sky[1]) } },
      vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vp; void main(){ float h = clamp(vp.y * 1.6 + .08, 0.0, 1.0); gl_FragColor = vec4(mix(bot, top, h), 1.0); }',
      side: T.BackSide, depthWrite: false,
    }));
    m.renderOrder = -1;
    return m;
  }

  function tree3(p, x, z, s, th, flowers) {
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g);
    part(CYL(.22, .34, 3, 8), '#5a3a1e', g, [0, 1.5, 0], { noOutline: s > 3 });
    [[0, 3.7, 0, 1.5], [-.9, 3.1, .2, 1.1], [.9, 3.2, -.2, 1.1], [.1, 4.5, -.1, 1.0]].forEach(([a, b, c, r], i) => {
      part(geo('ico' + r, () => new T.IcosahedronGeometry(r, 0)), th.tree[i % 2], g, [a, b, c], { flat: true });
    });
    if (flowers) for (let i = 0; i < 10; i++) part(SPH(.16, 6, 5), i % 2 ? '#f05a28' : '#f2a12b', g, [rnd(-1.3, 1.3), rnd(2.8, 4.8), rnd(-1.2, 1.2)], { noOutline: true, noShadow: true });
    return g;
  }
  function hut3(p, x, z, ry) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    part(BOX(4, 2.2, 3), '#c9a26a', g, [0, 1.1, 0]);
    part(BOX(1.2, 1.7, .1), '#3e2612', g, [0, .85, 1.52], { noOutline: true });
    part(CONE(3.4, 2.2, 4), '#a8843a', g, [0, 3.3, 0], { rot: [0, Math.PI / 4, 0], flat: true });
  }
  function rock3(p, x, z, s, col) { part(geo('dod', () => new T.DodecahedronGeometry(1, 0)), col, p, [x, s * .5, z], { scale: [s, s * .8, s], rot: [rnd(0, 3), rnd(0, 3), 0], flat: true }); }
  function tower3(p, x, z, h, noOl) {
    const g = new T.Group(); g.position.set(x, 0, z); p.add(g);
    let y = 0, w = 4;
    for (let i = 0; i < 5; i++) { const hh = h / 6; part(BOX(w, hh, w), i % 2 ? '#d4a017' : '#c9962a', g, [0, y + hh / 2, 0], { noOutline: noOl }); y += hh; w *= .8; }
    part(CONE(w * .6, h / 4, 4), GOLD_L, g, [0, y + h / 8, 0], { rot: [0, Math.PI / 4, 0], noOutline: noOl, flat: true });
  }
  function banner3(p, x, z, col) {
    part(CYL(.06, .06, 5, 6), '#3e2612', p, [x, 2.5, z]);
    part(BOX(1.4, .9, .04), col, p, [x + .72, 4.4, z], { noOutline: true });
  }
  function mountain3(p, x, z, h, r, col) { part(CONE(r, h, 7), col, p, [x, h / 2 - 1, z], { noOutline: true, flat: true, noShadow: true }); }
  function cloud3(p, x, y, z, s) { const g = new T.Group(); g.position.set(x, y, z); g.scale.setScalar(s); p.add(g); for (let i = 0; i < 5; i++) part(SPH(1, 10, 8), '#ffffff', g, [rnd(-1.6, 1.6), rnd(-.3, .4), rnd(-.8, .8)], { noOutline: true, noShadow: true, mat: basic('#fffaf0', { fog: false }) }); return g; }
  function kund3(p, x, z) {
    part(BOX(1.6, .45, 1.6), '#9a4a2a', p, [x, .22, z]);
    part(BOX(1.1, .1, 1.1), '#3a1a0a', p, [x, .46, z], { noOutline: true });
    const l = new T.PointLight(0xffa040, 1.4, 14); l.position.set(x, 1.4, z); p.add(l);
    S.emitters.push({ x, y: .5, z, rate: 40, k: 'fire', spread: .45 });
  }

  function buildWorld(def) {
    scene = new T.Scene();
    const th = THEME3[def.theme];
    S.th = th;
    scene.fog = new T.Fog(th.fog, 40, 170);
    S.sky = skyDome(th); scene.add(S.sky);
    const hemi = new T.HemisphereLight(th.night ? 0x8a8ac8 : 0xfff4dc, th.ground, th.night ? .45 : .32); scene.add(hemi);
    const dir = new T.DirectionalLight(th.night ? 0xb8c4ff : 0xfff0d0, th.night ? .55 : .62);
    dir.position.set(18, 30, 12); dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048); const sc = dir.shadow.camera; sc.left = sc.bottom = -28; sc.right = sc.top = 28; sc.near = 1; sc.far = 90;
    dir.shadow.bias = -.0005;
    scene.add(dir); scene.add(dir.target); S.sun = dir;
    scene.add(new T.AmbientLight(0xffffff, .12));
    // celestial disc
    const disc = new T.Mesh(new T.CircleGeometry(th.night ? 14 : 18, 32), basic(th.night ? '#fff3c4' : (th.sun || '#fff3c4'), { fog: false }));
    disc.position.set(-120, th.night ? 120 : 110, -260); disc.lookAt(0, 0, 0); scene.add(disc);
    if (th.night) {
      const pts = []; for (let i = 0; i < 600; i++) { const a = rnd(0, Math.PI * 2), b = rnd(.1, 1.4); pts.push(Math.cos(a) * Math.cos(b) * 350, Math.sin(b) * 350, Math.sin(a) * Math.cos(b) * 350); }
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      S.stars = new T.Points(sg, new T.PointsMaterial({ color: 0xfff6d8, size: 1.6, sizeAttenuation: false, fog: false })); scene.add(S.stars);
    }
    const R = def.arena;
    if (!def.runner) {
      const gy = def.sky ? -10 : 0;
      const ground = new T.Mesh(new T.PlaneGeometry(600, 600), new T.MeshToonMaterial({ map: groundTex(th), gradientMap: GRAD, color: 0xffffff }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = gy; ground.receiveShadow = true; scene.add(ground);
      // decor ring outside the arena
      const rings = def.sky ? 60 : 34;
      for (let i = 0; i < rings; i++) {
        const a = i / rings * Math.PI * 2 + rnd(-.05, .05), r = R + rnd(4, def.sky ? 40 : 18);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (def.theme === 'kishkindha' && i % 2) rock3(scene, x, z, rnd(1.5, 3.5), i % 4 ? '#9a5a2a' : '#b5713a');
        else if (def.theme === 'battle' && i % 3 === 0) banner3(scene, x, z, i % 2 ? '#e8891c' : '#3a0a0a');
        else if (def.theme === 'lanka' && i % 3 === 0) tower3(scene, x * 1.4, z * 1.4, rnd(10, 18));
        else { const t = tree3(scene, x, z, rnd(.9, 1.5), th, def.theme === 'lanka'); if (def.sky) t.position.y = -10; }
      }
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; mountain3(scene, Math.cos(a) * 170, Math.sin(a) * 170, rnd(40, 80), rnd(30, 55), def.theme === 'kishkindha' ? '#b5713a' : def.theme === 'battle' ? '#4a1a14' : def.theme === 'lanka' ? '#1e2a3a' : '#7fa874'); }
      if (def.theme === 'ashram') { hut3(scene, -9, -8, .6); kund3(scene, 0, -4); }
      if (def.theme === 'forest') { hut3(scene, 10, -10, -.5); }
      if (def.theme === 'kishkindha') { for (let i = 0; i < 4; i++) rock3(scene, rnd(-R, R) * .6, rnd(-R, R) * .6, rnd(.6, 1.1), '#a8693a'); }
      if (def.theme === 'lanka') { tower3(scene, 0, -R - 18, 26); for (let i = 0; i < 4; i++) tree3(scene, rnd(-R, R) * .7, rnd(-R, R) * .7, 1, th, true); }
      if (def.theme === 'battle') { for (let i = 0; i < 5; i++) S.emitters.push({ x: rnd(-R, R), y: 0, z: -R - rnd(2, 10), rate: 6, k: 'smoke', spread: 2 }); }
      if (def.sky) for (let i = 0; i < 14; i++) S.clouds.push(cloud3(scene, rnd(-60, 60), rnd(4, 16), rnd(-60, 60), rnd(1.5, 3)));
      // arena edge marking
      const edge = new T.Mesh(new T.RingGeometry(R - .15, R + .15, 96), basic(def.theme === 'lanka' ? '#c9962a' : '#e9dcc0', { transparent: true, opacity: .35 }));
      edge.rotation.x = -Math.PI / 2; edge.position.y = .02; if (!def.sky) scene.add(edge);
    } else buildRunner(th);
    // particles
    PS_ADD = makePS(1600, true); PS_NORM = makePS(800, false);
    scene.add(PS_ADD.pts); scene.add(PS_NORM.pts);
    S.bowStrings = new T.Group(); scene.add(S.bowStrings);
  }

  function buildRunner(th) {
    S.roofs = [];
    let z = 6, y = 4, x = 0;
    for (let i = 0; i < 18; i++) {
      const len = i === 0 ? 14 : i === 17 ? 16 : rnd(6, 9), w = rnd(5, 7);
      S.roofs.push({ x0: x - w / 2, x1: x + w / 2, z0: z - len, z1: z, y, i });
      z -= len + (i === 16 ? 2.6 : rnd(2.4, 3.8));
      y = clamp(y + rnd(-1, 1.2), 3, 6.5); x = clamp(x + rnd(-1.6, 1.6), -3, 3);
    }
    S.goalZ = S.roofs[17].z0 + 4;
    for (const r of S.roofs) {
      const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, w = r.x1 - r.x0, l = r.z1 - r.z0;
      part(BOX(w, r.y, l), '#4a3a5a', scene, [cx, r.y / 2, cz]);
      r.slab = part(BOX(w + .3, .3, l + .3), GOLD, scene, [cx, r.y - .1, cz], { receive: true });
      for (let k = 0; k < 3; k++) part(BOX(.6, .9, .05), '#2a1e3a', scene, [cx + (k - 1) * 1.4, r.y * .55, r.z1 + .03], { noOutline: true });
      if (r.i > 1 && r.i < 17 && Math.random() < .6) r.foe = Math.random() < .5 ? 'archer' : 'sword';
    }
    const street = new T.Mesh(new T.PlaneGeometry(80, 400), toon('#1e1a28')); street.rotation.x = -Math.PI / 2; street.position.set(0, 0, -120); scene.add(street);
    for (let i = 0; i < 26; i++) tower3(scene, (i % 2 ? 1 : -1) * rnd(14, 30), -i * 9, rnd(10, 22), true);
    const sea = new T.Mesh(new T.PlaneGeometry(300, 120), basic('#1a3a6a')); sea.rotation.x = -Math.PI / 2; sea.position.set(0, .5, S.roofs[17].z0 - 60); scene.add(sea);
    S.burned = 0;
  }

  /* =========================================================
     PARTICLES
     ========================================================= */
  function makePS(max, additive) {
    const g = new T.BufferGeometry();
    const pos = new Float32Array(max * 3), col = new Float32Array(max * 3), size = new Float32Array(max), alpha = new Float32Array(max);
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.setAttribute('size', new T.BufferAttribute(size, 1)); g.setAttribute('alpha', new T.BufferAttribute(alpha, 1));
    const m = new T.ShaderMaterial({
      vertexShader: 'attribute vec3 color; attribute float size; attribute float alpha; varying vec3 vc; varying float va; void main(){ vc = color; va = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * (360.0 / -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vc; varying float va; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vc, va * (1.0 - d * 1.6)); }',
      transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
    });
    const pts = new T.Points(g, m); pts.frustumCulled = false;
    return { pts, g, max, list: [] };
  }
  function emit(ps, o) { if (ps.list.length < ps.max) ps.list.push(Object.assign({ t: 0, vx: 0, vy: 0, vz: 0, grav: 0, drag: 0 }, o)); }
  function spark(x, y, z, col, n = 12, sp = 6) { const c = new T.Color(col); for (let i = 0; i < n; i++) emit(PS_ADD, { x, y, z, vx: rnd(-sp, sp), vy: rnd(-sp * .3, sp), vz: rnd(-sp, sp), life: rnd(.25, .6), size: rnd(.15, .35), c, grav: 10 }); }
  function dust(x, y, z, n = 6, s = 1) { const c = new T.Color('#e9dcc0'); for (let i = 0; i < n; i++) emit(PS_NORM, { x: x + rnd(-.4, .4) * s, y: y + .1, z: z + rnd(-.4, .4) * s, vx: rnd(-1.5, 1.5) * s, vy: rnd(.3, 1.4), vz: rnd(-1.5, 1.5) * s, life: rnd(.4, .8), size: rnd(.5, 1.0) * s, c, a0: .5, grow: 1.4, drag: 2 }); }
  function flame(x, y, z, s = 1) { emit(PS_ADD, { x: x + rnd(-.2, .2) * s, y, z: z + rnd(-.2, .2) * s, vx: rnd(-.4, .4), vy: rnd(1.5, 3.2) * s, vz: rnd(-.4, .4), life: rnd(.35, .7), size: rnd(.35, .7) * s, fire: true }); }
  function psUpdate(ps, dt) {
    const L = ps.list, pos = ps.g.attributes.position.array, col = ps.g.attributes.color.array, sz = ps.g.attributes.size.array, al = ps.g.attributes.alpha.array;
    let n = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i]; p.t += dt;
      if (p.t >= p.life) continue;
      p.vy -= p.grav * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; p.vz *= 1 - p.drag * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const k = 1 - p.t / p.life;
      pos[n * 3] = p.x; pos[n * 3 + 1] = p.y; pos[n * 3 + 2] = p.z;
      let r, g, b;
      if (p.fire) { if (k > .65) { r = 1; g = .95; b = .75; } else if (k > .35) { r = 1; g = .6; b = .15; } else { r = .75; g = .2; b = .08; } }
      else { r = p.c.r; g = p.c.g; b = p.c.b; }
      col[n * 3] = r; col[n * 3 + 1] = g; col[n * 3 + 2] = b;
      sz[n] = p.size * (p.grow ? 1 + (1 - k) * p.grow : 1); al[n] = (p.a0 || 1) * Math.min(1, k * 2);
      L[n++] = p;
    }
    L.length = n; ps.g.setDrawRange(0, n);
    for (const a of ['position', 'color', 'size', 'alpha']) ps.g.attributes[a].needsUpdate = true;
  }

  /* =========================================================
     STAGES, FOES, BOSSES
     ========================================================= */
  const STAGES3 = {
    act_bala: { hero: 'rama_young', style: 'archer', theme: 'ashram', arena: 17, title: 'Siddhashrama', sub: 'Guard Vishwamitra\'s yajna', special: 'Āgneya astra',
      waves: [{ e: ['grunt', 'grunt', 'grunt'] }, { e: ['grunt', 'sword', 'archer', 'grunt'] }, { boss: 'tataka' }, { e: ['flyer', 'flyer', 'grunt', 'flyer'] }, { boss: 'subahu' }] },
    act_khara: { hero: 'rama_exile', style: 'archer', theme: 'forest', arena: 18, title: 'Janasthana', sub: 'Rama alone against fourteen thousand', special: 'Gandharva astra',
      waves: [{ e: ['grunt', 'grunt', 'sword', 'grunt'] }, { e: ['sword', 'sword', 'archer', 'archer', 'grunt', 'grunt'] }, { e: ['brute', 'archer', 'sword', 'grunt', 'sword'] }, { e: ['brute', 'brute', 'archer', 'archer', 'sword'] }, { boss: 'khara' }] },
    act_jatayu: { hero: 'jatayu', style: 'flyer', theme: 'sky', arena: 22, sky: true, title: 'The Sky over Panchavati', sub: 'Jatayu against the King of Lanka', special: 'Feather storm', waves: [{ boss: 'ravanaSky' }] },
    act_vali: { hero: 'sugriva', style: 'brawler', theme: 'kishkindha', arena: 13, title: 'Kishkindha', sub: 'Sugriva challenges Vali', special: 'Earth-shaking pound', timer: 45, waves: [{ boss: 'vali' }] },
    act_vatika: { hero: 'hanuman', style: 'brawler', theme: 'lanka', arena: 17, title: 'Ashoka Vatika', sub: 'Hanuman tests the strength of Lanka', special: 'Mahima — grow mountain-tall',
      waves: [{ e: ['grunt', 'grunt', 'sword', 'grunt'] }, { e: ['sword', 'brute', 'archer', 'grunt', 'sword'] }, { e: ['brute', 'brute', 'archer', 'archer', 'sword', 'grunt'] }, { boss: 'akshaya' }] },
    act_lanka: { hero: 'hanuman', style: 'brawler', theme: 'lanka', arena: 99, runner: true, title: 'Lanka Dahan', sub: 'Set the golden city ablaze', special: 'Mahima — grow mountain-tall', waves: [] },
    act_kumbha: { hero: 'rama_exile', style: 'archer', theme: 'battle', arena: 20, title: 'The Giant Awakes', sub: 'Kumbhakarna enters the battle', special: 'Aindra astra',
      waves: [{ e: ['sword', 'brute', 'archer', 'archer', 'grunt'] }, { boss: 'kumbha' }] },
    act_ravana: { hero: 'rama_exile', style: 'archer', theme: 'battle', arena: 20, title: 'Rama and Ravana', sub: 'The final battle', special: 'Aindra astra', waves: [{ boss: 'ravana' }] },
  };
  const FOES3 = {
    grunt: { rig: 'rakA', hp: 4, speed: 3.2, dmg: 8, reach: 1.6, wind: .5, scale: 1 },
    sword: { rig: 'rakB', hp: 5, speed: 4.2, dmg: 9, reach: 1.7, wind: .38, scale: 1.05 },
    archer: { rig: 'rakC', hp: 3, speed: 3, dmg: 7, ai: 'archer', scale: 1 },
    brute: { rig: 'brute', hp: 14, speed: 2.2, dmg: 16, reach: 2.2, wind: .8, scale: 1.45, armor: true },
    flyer: { rig: 'demon', hp: 3, speed: 5, dmg: 8, ai: 'flyer', scale: .9 },
  };
  const BOSSES3 = {
    tataka: { rig: 'tataka', name: 'Tataka', dev: 'ताटका', sub: 'The yakshi who laid the forest waste', hp: 46, scale: 2, speed: 3.2, dmg: 14, moves: ['dash', 'rocks', 'leap'], moves2: ['dash', 'rocks', 'leap', 'summon'], bark: 'Two little princes? The forest will swallow you!' },
    subahu: { rig: 'subahu', name: 'Subahu', dev: 'सुबाहु', sub: 'Son of Tataka, defiler of yajnas', hp: 34, scale: 1.7, speed: 5, dmg: 12, fly: true, moves: ['fireRain', 'swoop', 'fan'], bark: 'Rain blood upon the sacred fire!' },
    maricha: { rig: 'maricha', name: 'Maricha', hp: 14, scale: 1.3, speed: 5.5, dmg: 9, fly: true, minor: true, moves: ['swoop', 'fan'] },
    khara: { rig: 'khara', name: 'Khara', dev: 'खर', sub: 'Commander of Janasthana', hp: 70, scale: 1.4, speed: 4.2, dmg: 14, moves: ['dash', 'leap', 'combo'], moves2: ['dash', 'leap', 'combo', 'summonArchers'], bark: 'You maimed my sister. Now face her brother!' },
    ravanaSky: { chariot: true, name: 'Ravana', dev: 'रावण', sub: 'King of Lanka, fleeing with Sita', hp: 80, scale: 1, speed: 6, dmg: 12, fly: true, moves: ['arrowFan', 'chariotRam', 'arrowFan', 'summonFlyers'], bark: 'Old bird! Out of my way!' },
    vali: { rig: 'vali', name: 'Vali', dev: 'वाली', sub: 'King of Kishkindha, son of Indra', hp: 120, scale: 1.2, speed: 6.4, dmg: 11, immortal: true, moves: ['rush', 'leap', 'rocks'], moves2: ['rush', 'leap', 'rush'], bark: 'Again, little brother? Then fall again!' },
    akshaya: { rig: 'akshaya', name: 'Akshaya Kumara', dev: 'अक्षयकुमार', sub: 'Youngest son of Ravana', hp: 60, scale: 1.15, speed: 5.5, dmg: 12, moves: ['dash', 'combo', 'spear'], moves2: ['dash', 'combo', 'spear', 'summon'], bark: 'A monkey in my father\'s garden? I will teach you!' },
    kumbha: { rig: 'kumbha', name: 'Kumbhakarna', dev: 'कुम्भकर्ण', sub: 'The giant who sleeps for months', hp: 130, scale: 3.2, speed: 1.8, dmg: 18, moves: ['stomp', 'sweep', 'boulders'], moves2: ['stomp', 'sweep', 'boulders', 'march'], bark: 'Who woke me…? Ah. Breakfast.' },
    ravana: { rig: 'ravana', name: 'Ravana', dev: 'रावण', sub: 'Dashanana — the ten-headed', hp: 999, scale: 2.3, speed: 2.2, dmg: 16, heads: true, moves: ['sweep', 'arrowRain', 'fireWave', 'dash'], moves2: ['sweep', 'arrowRain', 'fireWave', 'summon'], bark: 'I lifted Kailasa. You are nothing, hermit.' },
  };

  /* =========================================================
     ENTITIES
     ========================================================= */
  function V(x = 0, y = 0, z = 0) { return new T.Vector3(x, y, z); }
  function makeEnt(J, o) {
    scene.add(J.root);
    return Object.assign({ J, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, scale: 1, r: .45, h: 1.9, onG: true, flash: 0, at: 0, st: 0, anim: 'idle', tell: 0 }, o);
  }
  function syncEnt(e) {
    const J = e.J; J.root.position.set(e.x, e.y + (e.sink || 0), e.z); J.root.rotation.y = e.yaw; J.root.scale.setScalar(e.scale);
  }

  function makeHero(def) {
    let h;
    if (def.style === 'flyer') { h = makeEnt(buildJatayu(), { bird: true, flying: true, r: 1.1, h: 1.2 }); h.y = 5; }
    else h = makeEnt(buildFigure(def.hero), { scale: def.hero === 'hanuman' ? 1.1 : 1 });
    Object.assign(h, { isHero: true, style: def.style, hp: 100, max: 100, meter: 0, inv: 0, cool: 0, dodgeCD: 0, hurtT: 0, charge: 0, aiming: false, atk: null });
    if (def.runner) { const r = S.roofs[0]; h.x = 0; h.z = r.z1 - 2; h.y = r.y; h.yaw = Math.PI; }
    else { h.z = def.arena * .6; h.yaw = Math.PI; }
    return h;
  }

  function spawnFoe(type, at) {
    const D = FOES3[type], h = S.hero;
    let x, z, y = 0;
    if (at) ({ x, z, y } = at);
    else {
      const R = S.def.arena;
      let a, tries = 0;
      do { a = rnd(0, Math.PI * 2); x = Math.cos(a) * (R - 1); z = Math.sin(a) * (R - 1); } while (hyp(x - h.x, z - h.z) < 9 && tries++ < 20);
    }
    const e = makeEnt(buildFigure(D.rig), { def: D, type, hp: D.hp, max: D.hp, armor: D.armor, scale: D.scale, state: 'move', cd: rnd(.4, 1.4), ph: rnd(0, 6), x, z, y });
    e.r = .45 * e.scale; e.h = 1.9 * e.scale;
    if (D.ai === 'flyer') { e.y = rnd(3, 4.5); e.flying = true; }
    e.yaw = Math.atan2(h.x - x, h.z - z);
    S.foes.push(e); return e;
  }

  function spawnBoss(key) {
    const D = BOSSES3[key], h = S.hero, R = S.def.arena;
    const J = D.chariot ? buildChariot() : buildFigure(D.rig);
    const b = makeEnt(J, { def: D, key, isBoss: true, hp: D.hp, max: D.hp, armor: true, scale: D.scale, move: null, idleT: 1.2, last: '' });
    const a = Math.atan2(-h.z, -h.x);
    b.x = Math.cos(a) * R * .55; b.z = Math.sin(a) * R * .55;
    if (D.chariot) { b.y = 7; b.r = 1.8; b.h = 2.6; b.flying = true; }
    else { b.r = .45 * b.scale; b.h = 1.9 * b.scale; if (D.fly) { b.y = 4; b.flying = true; } }
    b.yaw = Math.atan2(h.x - b.x, h.z - b.z);
    if (D.heads) { b.heads = J.heads.map(() => ({ alive: true, hp: 2, regrow: 0 })); S.rv = { phase: 1, cut: 0, navel: 3, open: false, cyc: 0 }; b.navel = part(SPH(.12, 14, 10), '#6a5a3a', J.hips, [0, .02, .17], { noOutline: true }); }
    S.foes.push(b);
    if (!D.minor) S.boss = b;
    return b;
  }

  /* ---------- helpers ---------- */
  const dirTo = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z, d = hyp(dx, dz) || 1; return { x: dx / d, z: dz / d, d }; };
  const fwdOf = e => ({ x: Math.sin(e.yaw), z: Math.cos(e.yaw) });
  function turnTo(e, yaw, k) { e.yaw += angDiff(e.yaw, yaw) * k; }
  function inFront(a, b, reach, cone = 1.2) {
    const d = dirTo(a, b); if (d.d > reach + b.r) return false;
    const f = fwdOf(a); return f.x * d.x + f.z * d.z > Math.cos(cone) && Math.abs((b.y + b.h * .5) - (a.y + a.h * .5)) < Math.max(a.h, b.h) * .8;
  }
  function chest(e) { return { x: e.x, y: e.y + e.h * (e.bird ? .3 : .62), z: e.z }; }
  function say(e, text, dur = 2.4) { if (text) S.barks.push({ e, text, t: 0, dur }); }
  function float(text, p, col = '#fff3c4', size = 26) { S.texts.push({ text, x: p.x, y: p.y, z: p.z, col, size, t: 0 }); }
  function shake(v) { S.shake = Math.max(S.shake, v); }
  function heal(n, msg) { const h = S.hero; if (h.hp >= h.max) return; h.hp = Math.min(h.max, h.hp + n); Sound.play('lotus'); float(`${msg} +${n}`, chest(h), '#9be3a4', 24); }

  /* =========================================================
     COMBAT
     ========================================================= */
  function hurtFoe(e, dmg, from, knock = 3) {
    if (e.dead || e.flung) return false;
    if (e.isBoss && e.def.heads) return false;
    e.hp -= dmg; e.flash = .08;
    S.hitstop = Math.max(S.hitstop, dmg >= 3 ? .09 : .045);
    const c = chest(e); spark(c.x, c.y, c.z, dmg >= 3 ? '#ffd76a' : '#ff8a5a', dmg >= 3 ? 22 : 10);
    S.texts.push({ text: String(Math.round(dmg * 10)), x: c.x, y: c.y + e.h * .5, z: c.z, col: dmg >= 3 ? '#ffd76a' : '#fff', size: dmg >= 3 ? 30 : 22, t: 0, dmg: true });
    S.hero.meter = Math.min(100, S.hero.meter + dmg * 5);
    if (!e.isBoss) {
      const d = dirTo(from, e);
      if (!e.armor || knock > 6) { e.vx = d.x * knock * (e.armor ? .4 : 1); e.vz = d.z * knock * (e.armor ? .4 : 1); }
      if (!e.armor) { e.state = 'stun'; e.st = 0; if (knock > 6 && !e.flying) { e.vy = 6; e.onG = false; } }
    }
    if (e.isBoss && e.def.immortal && e.hp < 1) { e.hp = 1; if (once(e, 'immTxt')) float('Vali shrugs off every blow!', chest(e), '#ffd0c0'); }
    if (e.hp <= 0) killFoe(e, from);
    return true;
  }
  function killFoe(e, from) {
    if (e.isBoss) return bossDown(e);
    e.dead = true; e.deadT = 0; const d = dirTo(from, e); e.vx = d.x * 4; e.vz = d.z * 4; e.vy = 5; e.onG = false;
    S.hitstop = .08; S.kills++;
    if (Math.random() < .3) spawnLotus(e.x, e.flying ? Math.max(1, e.y) : (e.roof ? e.roof.y : 0) + .6, e.z);
  }
  function hurtHero(dmg, from) {
    const h = S.hero;
    if (h.inv > 0 || S.over || S.cine) return;
    dmg *= .85; if (h.giant) dmg *= .5;
    h.hp -= dmg; h.inv = 1; h.flash = .12; S.hitstop = .07; shake(.35); Sound.play('hit');
    const c = chest(h); spark(c.x, c.y, c.z, '#ff5a3a', 14);
    if (!h.giant) { const d = from ? dirTo(from, h) : { x: 0, z: 0 }; h.vx = d.x * 7; h.vz = d.z * 7; if (!h.flying) { h.vy = 5; h.onG = false; } h.hurtT = .35; h.aiming = false; h.atk = null; }
    if (h.hp <= 0) { h.hp = 0; startCine({ kind: 'death', dur: 1.8, slow: .3, caption: S.def.hero.startsWith('rama') ? 'Rama falls back…' : 'The hero falls…' }); }
  }
  function meleeFrom(a, reach, dmg, knock, set, cone = 1.1) {
    if (a.isHero) {
      for (const e of S.foes) if (!e.dead && !e.flung && !set.has(e) && !(e.def && e.def.heads) && inFront(a, e, reach, cone)) { set.add(e); hurtFoe(e, dmg, a, knock); Sound.play('hit'); }
      if (S.boss && S.boss.heads && !set.has('rv')) headsNear(a, reach).forEach(i => { if (!set.has('rv')) { set.add('rv'); hitHead(i, dmg); } });
    } else { const h = S.hero; if (!set.has(h) && inFront(a, h, reach, cone)) { set.add(h); hurtHero(dmg, a); } }
  }
  function spawnLotus(x, y, z) {
    const g = new T.Group(); g.position.set(x, y, z); scene.add(g);
    for (let i = 0; i < 6; i++) part(CONE(.09, .3, 5), '#f2a3b5', g, [Math.cos(i) * .1, .12, Math.sin(i) * .1], { rot: [Math.sin(i) * .6, 0, -Math.cos(i) * .6], noOutline: true });
    part(CYL(.25, .25, .03, 12), '#2f6b3a', g, [0, 0, 0], { noOutline: true });
    S.lotus.push({ g, x, y, z, t: 0 });
  }

  /* =========================================================
     HERO
     ========================================================= */
  const keys = {}, prev = {};
  const BIND = { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], fwd: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], jump: ['Space'], attack: ['KeyJ', 'KeyZ', 'Mouse0'], special: ['KeyK', 'KeyX'], dodge: ['KeyL', 'ShiftLeft', 'ShiftRight'], camL: ['KeyQ'], camR: ['KeyE'], down: ['KeyC', 'ControlLeft'] };
  const held = a => BIND[a].some(k => keys[k]);
  const hit = a => BIND[a].some(k => keys[k] && !prev[k]);

  function lockTarget(h, maxD = 32) {
    let best = null, bs = -1e9;
    const cf = { x: -Math.sin(S.camYaw), z: -Math.cos(S.camYaw) };
    const consider = (p, ent, extra = 0) => {
      const dx = p.x - h.x, dz = p.z - h.z, d = hyp(dx, dz); if (d > maxD) return;
      const dot = (dx * cf.x + dz * cf.z) / (d || 1);
      const score = dot * 12 - d * .5 + extra;
      if (score > bs) { bs = score; best = { p, ent }; }
    };
    if (S.boss && S.boss.heads && !S.boss.dead) {
      if (S.rv.phase === 2 && S.rv.open) return { p: navelPos(), ent: S.boss, navel: true };
      headPositions().forEach((p, i) => { if (S.boss.heads[i].alive) consider(p, S.boss, 4); });
    }
    for (const e of S.foes) if (!e.dead && !e.flung && !(e.def && e.def.heads)) consider(chest(e), e, e.isBoss ? 2 : 0);
    return best;
  }

  function heroUpdate(dt) {
    const h = S.hero, ctl = !S.cine && !S.over;
    h.inv -= dt; h.cool -= dt; h.dodgeCD -= dt; h.flash -= dt; h.hurtT -= dt; h.at += dt;
    // camera-relative input
    let ix = (ctl && held('right') ? 1 : 0) - (ctl && held('left') ? 1 : 0), iz = (ctl && held('fwd') ? 1 : 0) - (ctl && held('back') ? 1 : 0);
    if (S.cine && S.cine.kind === 'intro') { ix = 0; iz = S.cine.t < 1.6 ? 1 : 0; }
    const cy = S.camYaw, fx = -Math.sin(cy), fz = -Math.cos(cy), rx = Math.cos(cy), rz = -Math.sin(cy);
    let mx = rx * ix + fx * iz, mz = rz * ix + fz * iz; const ml = hyp(mx, mz); if (ml > 0) { mx /= ml; mz /= ml; }
    h.lock = ctl ? lockTarget(h) : null;
    if (h.style === 'flyer') return flyerUpdate(h, dt, ctl, mx, mz, ml);
    if (h.rolling) {
      h.rollT += dt; h.vx = h.rdx * 13; h.vz = h.rdz * 13; h.J.pivot.rotation.x = (h.rollT / .42) * Math.PI * 2;
      if (h.rollT > .42) { h.rolling = false; h.J.pivot.rotation.x = 0; }
    } else if (h.hurtT <= 0) {
      const busy = h.atk && h.atk.lock;
      const spd = (h.aiming ? 3 : h.giant ? 6.5 : 7) * (busy ? .2 : 1);
      h.vx = lerp(h.vx, mx * spd, Math.min(1, dt * 12)); h.vz = lerp(h.vz, mz * spd, Math.min(1, dt * 12));
      if (ml > 0 && !h.aiming && !busy) turnTo(h, Math.atan2(mx, mz), Math.min(1, dt * 12));
      if (ctl && hit('jump') && h.onG && !busy) { h.vy = h.style === 'brawler' && S.def.hero === 'hanuman' ? 10 : 9; h.onG = false; dust(h.x, h.y, h.z, 5); Sound.play('flip'); }
      if (ctl && hit('dodge') && h.onG && h.dodgeCD <= 0) { h.rolling = true; h.rollT = 0; h.inv = Math.max(h.inv, .42); h.dodgeCD = .7; h.aiming = false; h.atk = null; const f = ml > 0 ? { x: mx, z: mz } : fwdOf(h); h.rdx = f.x; h.rdz = f.z; h.yaw = Math.atan2(f.x, f.z); dust(h.x, h.y, h.z, 8); }
      if (ctl && hit('special') && h.meter >= 100) heroSpecial(h);
      if (h.style === 'archer') archerUpdate(h, dt, ctl); else brawlerUpdate(h, dt, ctl);
    } else { h.vx *= .9; h.vz *= .9; }
    h.vy -= GRAV * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.z += h.vz * dt;
    landing(h);
    if (!S.def.runner) { const d = hyp(h.x, h.z), R = S.def.arena; if (d > R) { h.x *= R / d; h.z *= R / d; } }
    else if (h.y < -2) {
      hurtHero(10, null);
      const from = S.lastRoof || S.roofs[0], roof = S.roofs[Math.min(S.roofs.length - 1, from.i + 1)];
      h.x = (roof.x0 + roof.x1) / 2; h.z = roof.z1 - 1.5; h.y = roof.y + 3; h.vx = h.vz = h.vy = 0; h.inv = 1.4; h.slamming = false; h.atk = null;
      if (h.hp > 0) float('Hanuman leaps back up!', chest(h), '#ffd76a');
    }
    if (h.giant) { h.giantT -= dt; if (h.giantT <= 0) { h.giant = false; float('Hanuman returns to his size', chest(h)); } }
    h.scale = lerp(h.scale, h.giant ? 1.9 : S.def.hero === 'hanuman' ? 1.1 : 1, Math.min(1, dt * 5)); h.h = 1.9 * h.scale; h.r = .45 * h.scale;
    h.anim = h.rolling ? 'roll' : h.hurtT > 0 ? 'hurt' : h.atk ? h.atk.anim : h.slamming ? 'slam' : h.aiming ? 'aim' : !h.onG ? 'jump' : hyp(h.vx, h.vz) > 1 ? 'run' : 'idle';
  }

  function groundAt(x, z, y) {
    if (!S.def.runner) return S.def.sky ? -99 : 0;
    for (const r of S.roofs) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1 && y >= r.y - .6) return r.y;
    return -99;
  }
  function landing(e) {
    const g = groundAt(e.x, e.z, e.y), was = e.onG;
    if (e.y <= g && e.vy <= 0) {
      e.y = g; e.vy = 0; e.onG = true;
      if (S.def.runner && e.isHero) {
        const r = S.roofs.find(r => e.x > r.x0 && e.x < r.x1 && e.z > r.z0 && e.z < r.z1);
        if (r) { S.lastRoof = r; if (!r.burning) { r.burning = true; S.burned++; r.slab.material = toon('#e8661c', { emissive: new T.Color('#7a2a08') }); Sound.play('fire'); float('Ablaze!', chest(e), '#ffb04a', 24); for (let k = 0; k < 6; k++) S.emitters.push({ x: rnd(r.x0, r.x1), y: r.y, z: rnd(r.z0, r.z1), rate: 14, k: 'fire', spread: .6 }); } }
      }
    } else e.onG = false;
    if (e.onG && !was && e.isHero) { dust(e.x, e.y, e.z, 5); if (e.slamming) heroSlamLand(e); }
  }

  const CHARGE = .55;
  function archerUpdate(h, dt, ctl) {
    if (ctl && hit('attack')) h.buf = .3;
    h.buf = (h.buf || 0) - dt;
    if (ctl && (h.buf > 0 || held('attack')) && h.cool <= 0 && !h.aiming) { h.aiming = true; h.charge = 0; h.buf = 0; }
    if (!h.aiming) return;
    h.charge += dt;
    const sx = h.x, sy = h.y + 1.45 * h.scale, sz = h.z;
    const tg = h.lock ? h.lock.p : { x: h.x + Math.sin(h.yaw) * 20, y: sy + 1, z: h.z + Math.cos(h.yaw) * 20 };
    turnTo(h, Math.atan2(tg.x - sx, tg.z - sz), Math.min(1, dt * 16));
    const hd = hyp(tg.x - sx, tg.z - sz);
    h.aimUp = clamp(Math.atan2(tg.y - sy, hd), -.6, 1.2);
    h.drawK = Math.min(1, .3 + h.charge / CHARGE * .7);
    if (!held('attack') || !ctl) {
      const big = h.charge >= CHARGE, sp = big ? 46 : 38;
      const dx = Math.sin(h.yaw) * Math.cos(h.aimUp), dy = Math.sin(h.aimUp), dz = Math.cos(h.yaw) * Math.cos(h.aimUp);
      shoot({ k: big ? 'bigArrow' : 'arrow', team: 'hero', x: sx + dx * .7, y: sy + dy * .7, z: sz + dz * .7, vx: dx * sp, vy: dy * sp, vz: dz * sp, dmg: big ? 4 : 1.2, pierce: big, r: big ? .35 : .25, home: h.lock, turn: big ? 3 : 6 });
      Sound.play(big ? 'conch' : 'arrow'); if (big) shake(.1);
      h.aiming = false; h.cool = .14; h.charge = 0;
    }
  }

  const COMBO = [
    { anim: 'punch1', dur: .26, on: [.07, .16], dmg: 1.4, knock: 3, reach: 1.7 },
    { anim: 'punch2', dur: .26, on: [.07, .16], dmg: 1.4, knock: 3, reach: 1.7 },
    { anim: 'swing', dur: .44, on: [.16, .3], dmg: 3.2, knock: 11, reach: 2.4, swing: true },
  ];
  function brawlerUpdate(h, dt, ctl) {
    if (h.atk) {
      const a = h.atk; a.t += dt;
      if (a.swing) h.swingK = a.t / a.dur * 1.4;
      if (ctl && hit('attack') && a.t > .1 && a.i < 2) a.queued = true;
      if (a.t >= a.on[0] && a.t <= a.on[1]) {
        if (once(a, 'face') && h.lock && hyp(h.lock.p.x - h.x, h.lock.p.z - h.z) < 5) h.yaw = Math.atan2(h.lock.p.x - h.x, h.lock.p.z - h.z);
        meleeFrom(h, a.reach * h.scale, a.dmg * (h.giant ? 2 : 1), a.knock, a.set);
        if (a.swing && once(a, 'sfx')) { Sound.play('arrow'); slashFx(h); }
      }
      if (a.t >= a.dur) { h.atk = null; if (a.queued) startCombo(h, a.i + 1); }
      return;
    }
    if (h.slamming) return;
    if (ctl && hit('attack')) {
      if (!h.onG) { h.slamming = true; h.vy = -26; h.vx *= .3; h.vz *= .3; }
      else startCombo(h, 0);
    }
  }
  function startCombo(h, i) {
    h.atk = Object.assign({ i, t: 0, set: new Set(), lock: true }, COMBO[i]);
    if (h.lock && hyp(h.lock.p.x - h.x, h.lock.p.z - h.z) < 6) h.yaw = Math.atan2(h.lock.p.x - h.x, h.lock.p.z - h.z);
    const f = fwdOf(h); h.vx = f.x * 3; h.vz = f.z * 3; Sound.play('flip');
  }
  function heroSlamLand(h) {
    h.slamming = false; shake(.4); Sound.play('thunder'); dust(h.x, h.y, h.z, 20, 2);
    ringFx(h.x, h.y, h.z, 3.6 * h.scale, '#ffe9a0');
    for (const e of S.foes) if (!e.dead && !e.flung && hyp(e.x - h.x, e.z - h.z) < 3.6 * h.scale + e.r && Math.abs(e.y - h.y) < 2) hurtFoe(e, 3 * (h.giant ? 2 : 1), h, 10);
    if (S.boss && S.boss.heads) headsNear(h, 3.6).forEach(i => hitHead(i, 3));
  }
  function heroSpecial(h) {
    h.meter = 0; S.flash = .5; S.slowT = .35; Sound.play('conch');
    if (h.style === 'archer') { say(h, S.def.special + '!'); S.astra = { t: 0, n: 0 }; }
    else if (S.def.hero === 'hanuman') { say(h, 'Jai Shri Ram!'); h.giant = true; h.giantT = 8; shake(.5); }
    else { say(h, 'For Kishkindha!'); h.vy = 12; h.onG = false; h.slamming = true; S.pound = .5; }
  }

  function flyerUpdate(h, dt, ctl, mx, mz, ml) {
    const R = S.def.arena;
    let up = (ctl && held('jump') ? 1 : 0) - (ctl && held('down') ? 1 : 0);
    if (h.lock && !up) up = clamp((h.lock.p.y + .5 - h.y) * .4, -1, 1) * .6;
    if (h.dive > 0) {
      h.dive -= dt; meleeFrom(h, 2.2, 2.5, 6, h.diveSet, 1.3);
      if (h.lock) { const d = dirTo(h, h.lock.p); h.vx = d.x * 24; h.vz = d.z * 24; h.vy = clamp((h.lock.p.y - h.y) * 4, -12, 12); h.yaw = Math.atan2(d.x, d.z); }
    } else if (h.rolling) {
      h.rollT += dt; h.J.pivot.rotation.z = h.rollT / .35 * Math.PI * 2; if (h.rollT > .35) { h.rolling = false; h.J.pivot.rotation.z = 0; }
    } else if (h.hurtT <= 0) {
      h.vx = lerp(h.vx, mx * 11, Math.min(1, dt * 4)); h.vz = lerp(h.vz, mz * 11, Math.min(1, dt * 4)); h.vy = lerp(h.vy, up * 7, Math.min(1, dt * 4));
      if (ml > 0) turnTo(h, Math.atan2(mx, mz), Math.min(1, dt * 6));
      if (ctl && hit('attack') && h.cool <= 0) { h.dive = .34; h.cool = .5; h.diveSet = new Set(); const f = fwdOf(h); h.vx = f.x * 22; h.vz = f.z * 22; Sound.play('arrow'); }
      if (ctl && hit('dodge') && h.dodgeCD <= 0) { h.rolling = true; h.rollT = 0; h.inv = .4; h.dodgeCD = .6; const f = ml > 0 ? { x: mx, z: mz } : { x: Math.cos(h.yaw), z: -Math.sin(h.yaw) }; h.vx = f.x * 16; h.vz = f.z * 16; }
      if (ctl && hit('special') && h.meter >= 100) {
        h.meter = 0; S.flash = .4; Sound.play('conch'); say(h, 'Feather storm!');
        for (let i = 0; i < 14; i++) { const a = h.yaw + (i / 13 - .5) * 1.6; shoot({ k: 'feather', team: 'hero', x: h.x, y: h.y, z: h.z, vx: Math.sin(a) * 24, vy: rnd(-2, 2), vz: Math.cos(a) * 24, dmg: 1.6, r: .4, home: h.lock, turn: 2.5 }); }
      }
    } else { h.vx *= .92; h.vz *= .92; h.vy *= .92; }
    h.x += h.vx * dt; h.y += h.vy * dt; h.z += h.vz * dt;
    const d = hyp(h.x, h.z); if (d > R) { h.x *= R / d; h.z *= R / d; }
    h.y = clamp(h.y, 1.5, 15);
    h.tilt = lerp(h.tilt || 0, clamp(-angDiff(h.yaw, Math.atan2(h.vx, h.vz)) * .5, -.6, .6), dt * 4);
  }

  /* =========================================================
     FOE AI
     ========================================================= */
  function foeUpdate(e, dt) {
    const h = S.hero, D = e.def;
    e.flash -= dt; e.at += dt; e.st += dt; e.cd -= dt; e.tell -= dt;
    if (e.dead) {
      e.deadT += dt;
      if (e.flying) { e.vy -= GRAV * dt; e.y = Math.max(0, e.y + e.vy * dt); e.x += e.vx * dt; e.z += e.vz * dt; }
      else { e.vy -= GRAV * dt; e.y += e.vy * dt; e.x += e.vx * dt; e.z += e.vz * dt; const g = groundAt(e.x, e.z, e.y + 1); if (e.y < g) { e.y = g; e.vy = 0; e.vx *= .8; e.vz *= .8; } }
      e.J.pivot.rotation.x = lerp(e.J.pivot.rotation.x, -Math.PI / 2, Math.min(1, dt * 8)); e.J.pivot.position.y = lerp(e.J.pivot.position.y, .2, dt * 8);
      if (e.deadT > 1.4) e.sink = -(e.deadT - 1.4) * 1.2;
      e.anim = 'hurt';
      if (e.deadT > 2.6) e.gone = true;
      return;
    }
    const d = dirTo(e, h);
    if (e.state === 'stun') { e.vx *= .88; e.vz *= .88; if (e.st > .32) { e.state = 'move'; e.st = 0; } }
    else if (D.ai === 'flyer') return flyerFoe(e, dt, d);
    else if (D.ai === 'archer') {
      if (e.state === 'move') {
        const want = d.d < 8 ? -1 : d.d > 13 ? 1 : 0, side = Math.sin(S.t * .7 + e.ph);
        e.vx = lerp(e.vx, (d.x * want + -d.z * side * .5) * D.speed, Math.min(1, dt * 5)); e.vz = lerp(e.vz, (d.z * want + d.x * side * .5) * D.speed, Math.min(1, dt * 5));
        turnTo(e, Math.atan2(d.x, d.z), Math.min(1, dt * 8));
        if (e.cd <= 0) { e.state = 'wind'; e.st = 0; e.vx = e.vz = 0; e.tell = .5; }
      } else if (e.state === 'wind') {
        turnTo(e, Math.atan2(d.x, d.z), Math.min(1, dt * 10)); e.aiming = true;
        const c = chest(h), sy = e.y + 1.45 * e.scale; e.aimUp = clamp(Math.atan2(c.y - sy, d.d), -.5, 1); e.drawK = Math.min(1, e.st / .7);
        if (e.st > .75) {
          const sp = 18, t = d.d / sp, tx = h.x + h.vx * t * .6, tz = h.z + h.vz * t * .6, dd = dirTo(e, { x: tx, z: tz });
          shoot({ k: 'eArrow', team: 'foe', x: e.x + dd.x * .6, y: sy, z: e.z + dd.z * .6, vx: dd.x * sp, vy: (c.y - sy) / Math.max(.2, t), vz: dd.z * sp, dmg: D.dmg, r: .25 });
          Sound.play('arrow'); e.aiming = false; e.state = 'rec'; e.st = 0;
        }
      } else if (e.st > .5) { e.state = 'move'; e.st = 0; e.cd = rnd(1.4, 2.6); }
    } else {
      if (e.state === 'move') {
        turnTo(e, Math.atan2(d.x, d.z), Math.min(1, dt * 8));
        const reach = D.reach * e.scale;
        if (d.d > reach * .85) { e.vx = lerp(e.vx, d.x * D.speed, Math.min(1, dt * 5)); e.vz = lerp(e.vz, d.z * D.speed, Math.min(1, dt * 5)); }
        else { e.vx *= .8; e.vz *= .8; if (e.cd <= 0 && Math.abs(h.y - e.y) < 1.5) { e.state = 'wind'; e.st = 0; e.tell = .35; } }
      } else if (e.state === 'wind') { e.vx *= .8; e.vz *= .8; if (e.st > D.wind) { e.state = 'strike'; e.st = 0; e.set = new Set(); const f = fwdOf(e); e.vx = f.x * 3; e.vz = f.z * 3; Sound.play('arrow'); } }
      else if (e.state === 'strike') { meleeFrom(e, D.reach * e.scale, D.dmg, 0, e.set); if (e.st > .18) { e.state = 'rec'; e.st = 0; } }
      else if (e.st > .45) { e.state = 'move'; e.st = 0; e.cd = rnd(.8, 1.7); }
    }
    // separation
    for (const o of S.foes) if (o !== e && !o.dead && !o.flying) { const dx = e.x - o.x, dz = e.z - o.z, dd = hyp(dx, dz); const m = e.r + o.r + .2; if (dd < m && dd > 0) { e.x += dx / dd * (m - dd) * .5; e.z += dz / dd * (m - dd) * .5; } }
    e.vy -= GRAV * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
    const g = groundAt(e.x, e.z, e.y + .5); if (e.y <= g) { e.y = g; e.vy = 0; e.onG = true; } else e.onG = false;
    if (S.def.runner && e.roof) { e.x = clamp(e.x, e.roof.x0 + .5, e.roof.x1 - .5); e.z = clamp(e.z, e.roof.z0 + .5, e.roof.z1 - .5); }
    else if (!S.def.runner) { const dd = hyp(e.x, e.z), R = S.def.arena; if (dd > R) { e.x *= R / dd; e.z *= R / dd; } }
    e.anim = e.state === 'stun' ? 'hurt' : e.state === 'wind' ? (D.ai === 'archer' ? 'aim' : 'windup') : e.state === 'strike' ? 'strike' : !e.onG ? 'jump' : hyp(e.vx, e.vz) > .6 ? 'run' : 'idle';
  }

  function flyerFoe(e, dt, d) {
    const h = S.hero;
    if (e.state === 'move') {
      const a = S.t * .6 + e.ph, tx = h.x + Math.cos(a) * 6, tz = h.z + Math.sin(a) * 6, ty = (h.flying ? h.y + 1 : 3.2) + Math.sin(S.t * 2 + e.ph) * .5;
      e.vx = lerp(e.vx, clamp(tx - e.x, -1, 1) * e.def.speed, dt * 3); e.vz = lerp(e.vz, clamp(tz - e.z, -1, 1) * e.def.speed, dt * 3); e.vy = lerp(e.vy, clamp(ty - e.y, -1, 1) * 3, dt * 3);
      turnTo(e, Math.atan2(d.x, d.z), dt * 6);
      if (e.cd <= 0) { e.state = 'wind'; e.st = 0; e.tell = .45; }
    } else if (e.state === 'wind') {
      e.vx *= .9; e.vz *= .9; e.vy = .8;
      if (e.st > .45) { e.state = 'strike'; e.st = 0; e.set = new Set(); const c = chest(h), L = Math.hypot(c.x - e.x, c.y - e.y, c.z - e.z) || 1; e.vx = (c.x - e.x) / L * 15; e.vy = (c.y - e.y) / L * 15; e.vz = (c.z - e.z) / L * 15; }
    } else if (e.state === 'strike') {
      if (!e.set.has(h) && Math.hypot(h.x - e.x, chest(h).y - e.y - .8, h.z - e.z) < 1.4 * e.scale + h.r) { e.set.add(h); hurtHero(e.def.dmg, e); }
      if (e.st > .7 || e.y < .8) { e.state = 'rec'; e.st = 0; }
    } else { e.vy = 4; e.vx *= .95; e.vz *= .95; if (e.st > .6) { e.state = 'move'; e.cd = rnd(1.2, 2.2); } }
    e.x += e.vx * dt; e.y = clamp(e.y + e.vy * dt, .6, 18); e.z += e.vz * dt;
    e.anim = e.state === 'wind' ? 'windup' : e.state === 'strike' ? 'strike' : 'fly';
  }

  /* =========================================================
     BOSSES
     ========================================================= */
  function bossUpdate(b, dt) {
    const D = b.def;
    b.flash -= dt; b.at += dt; b.tell -= dt;
    if (b.flung) { b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vy -= 6 * dt; b.J.pivot.rotation.x += dt * 12; if (b.y > 60) b.gone = true; return; }
    if (b.dead) {
      b.deadT += dt;
      if (b.flying) { b.vy -= 12 * dt; b.y = Math.max(0, b.y + b.vy * dt); b.J.pivot.rotation.z = lerp(b.J.pivot.rotation.z, .6, dt * 2); }
      else { b.J.pivot.rotation.x = lerp(b.J.pivot.rotation.x, -Math.PI / 2, Math.min(1, dt * 3)); b.J.pivot.position.y = lerp(b.J.pivot.position.y, .2, dt * 3); }
      if (b.deadT > 2.4) b.sink = -(b.deadT - 2.4) * b.scale;
      b.anim = 'hurt'; return;
    }
    if (S.cine && S.cine.freeze) return;
    const enraged = b.hp < b.max * .5 && !D.immortal;
    if (enraged && once(b, 'rage') && !D.heads) { say(b, 'Enough!'); shake(.3); }
    if (D.heads) ravanaTick(b, dt);
    if (!b.move) {
      b.idleT -= dt; approach(b, dt);
      if (b.idleT <= 0) {
        const list = (enraged && D.moves2) ? D.moves2 : D.moves;
        let n; do n = list[Math.floor(Math.random() * list.length)]; while (n === b.last && list.length > 1);
        b.last = n; b.move = { name: n, t: 0, set: new Set() };
      }
    } else {
      b.move.t += dt;
      if (MOVES[b.move.name](b, b.move, dt)) { b.move = null; b.idleT = rnd(.5, 1.1) * (enraged ? .6 : 1); b.attacking = false; }
    }
    if (!b.flying) {
      b.vy -= GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if (b.y <= 0) { b.y = 0; b.vy = 0; b.onG = true; } else b.onG = false;
    } else { b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.y = clamp(b.y, D.chariot ? 4 : 1.5, 14); }
    const dd = hyp(b.x, b.z), R = S.def.arena - b.r; if (dd > R) { b.x *= R / dd; b.z *= R / dd; }
  }

  function approach(b, dt) {
    const h = S.hero, D = b.def, d = dirTo(b, h);
    turnTo(b, Math.atan2(d.x, d.z), Math.min(1, dt * 5));
    if (b.flying) {
      const a = S.t * .5, tx = h.x + Math.cos(a) * (D.chariot ? 9 : 6), tz = h.z + Math.sin(a) * (D.chariot ? 9 : 6), ty = (h.flying ? h.y + 1 : 4) + Math.sin(S.t * 1.3) * 1;
      b.vx = lerp(b.vx, clamp((tx - b.x) / 3, -1, 1) * D.speed, dt * 2); b.vz = lerp(b.vz, clamp((tz - b.z) / 3, -1, 1) * D.speed, dt * 2); b.vy = lerp(b.vy, clamp(ty - b.y, -1, 1) * 3, dt * 2);
      b.anim = 'fly';
    } else {
      const keep = D.heads || D.rig === 'kumbha' ? 8 : 3;
      const sp = d.d > keep ? D.speed * .75 : 0;
      b.vx = lerp(b.vx, d.x * sp, Math.min(1, dt * 5)); b.vz = lerp(b.vz, d.z * sp, Math.min(1, dt * 5));
      b.anim = sp > 0 ? 'run' : 'idle';
    }
  }
  const faceHero = b => { const d = dirTo(b, S.hero); b.yaw = Math.atan2(d.x, d.z); return d; };

  const MOVES = {
    dash(b, m) {
      if (m.t < .55) { b.anim = 'windup'; b.vx = b.vz = 0; if (once(m, 'tell')) { b.tell = .5; faceHero(b); } return false; }
      b.anim = 'strike'; b.attacking = true; const f = fwdOf(b), sp = b.def.rig === 'tataka' ? 15 : 17;
      b.vx = f.x * sp; b.vz = f.z * sp;
      meleeFrom(b, b.r + 1, b.def.dmg, 0, m.set, 1.6);
      if (Math.random() < .5) dust(b.x, 0, b.z, 1, b.scale);
      return m.t > 1.15 || hyp(b.x, b.z) > S.def.arena - b.r - .3;
    },
    leap(b, m) {
      const h = S.hero;
      if (m.t < .4) { b.anim = 'crouch'; b.vx = b.vz = 0; if (once(m, 'tell')) { b.tell = .4; faceHero(b); } return false; }
      if (once(m, 'jump')) { b.vy = 13; b.onG = false; b.vx = (h.x - b.x) / 1.08; b.vz = (h.z - b.z) / 1.08; S.markers.push({ x: h.x, z: h.z, r: 2.5, t: 0, life: 1.1 }); }
      b.anim = b.onG ? 'crouch' : 'slam';
      if (b.onG && m.t > .6 && once(m, 'land')) {
        b.vx = b.vz = 0; shake(.45); Sound.play('thunder'); dust(b.x, 0, b.z, 18, 2);
        S.waves.push({ x: b.x, z: b.z, r: .5, sp: 9, dmg: b.def.dmg, hgt: .7, life: 1.6, t: 0, set: new Set(), mesh: ringMesh('#ffd9a0') });
      }
      return m.land && m.t > 1.4;
    },
    rocks(b, m) {
      b.vx = b.vz = 0; faceHero(b); b.anim = m.t < .45 ? 'windup' : Math.floor(m.t * 6) % 2 ? 'strike' : 'windup';
      for (const at of [.45, .8, 1.15]) if (m.t >= at && once(m, 'r' + at)) lob(b, S.hero.x + rnd(-1.5, 1.5), S.hero.z + rnd(-1.5, 1.5), 'rock');
      return m.t > 1.5;
    },
    boulders(b, m) {
      b.vx = b.vz = 0; faceHero(b); b.anim = m.t < .7 ? 'windup' : 'strike';
      if (m.t >= .7 && once(m, 'b')) { for (let i = 0; i < 3; i++) lob(b, S.hero.x + rnd(-3.5, 3.5), S.hero.z + rnd(-3.5, 3.5), 'boulder', 1.1 + i * .12); shake(.2); }
      return m.t > 1.6;
    },
    combo(b, m) {
      const h = S.hero, reach = 2 * b.scale;
      if (!m.close) {
        const d = faceHero(b); b.vx = d.x * b.def.speed * 1.3; b.vz = d.z * b.def.speed * 1.3; b.anim = 'run';
        if (d.d < reach * .8 || m.t > 1.4) { m.close = true; m.t0 = m.t; b.vx = b.vz = 0; }
        return false;
      }
      const k = m.t - m.t0, i = Math.floor(k / .38), ph = k - i * .38;
      if (i >= 3) return true;
      b.anim = ph < .2 ? 'windup' : 'strike';
      if (ph < .2 && once(m, 'tell' + i)) { b.tell = .2; faceHero(b); }
      if (ph >= .2 && ph < .3) { if (once(m, 's' + i)) { m.set = new Set(); Sound.play('arrow'); const f = fwdOf(b); b.vx = f.x * 3; b.vz = f.z * 3; } meleeFrom(b, reach, b.def.dmg * .8, 0, m.set); }
      else { b.vx *= .8; b.vz *= .8; }
      return false;
    },
    rush(b, m, dt) { return MOVES.combo(b, m, dt); },
    spear(b, m) {
      b.vx = b.vz = 0; const d = faceHero(b); b.anim = m.t < .5 ? 'windup' : 'strike';
      if (m.t < .5 && once(m, 'tell')) b.tell = .5;
      if (m.t >= .5 && once(m, 's')) { const c = chest(S.hero), sy = b.y + 1.5 * b.scale; shoot({ k: 'spear', team: 'foe', x: b.x + d.x, y: sy, z: b.z + d.z, vx: d.x * 26, vy: (c.y - sy) / (d.d / 26), vz: d.z * 26, dmg: b.def.dmg, r: .35 }); Sound.play('arrow'); }
      return m.t > .9;
    },
    summon(b, m) { b.vx = b.vz = 0; b.anim = 'roar'; if (m.t > .4 && once(m, 's')) { say(b, 'Rakshasas — to me!', 1.6); spawnFoe('grunt'); spawnFoe(Math.random() < .5 ? 'sword' : 'grunt'); Sound.play('conch'); shake(.2); } return m.t > 1.1; },
    summonArchers(b, m) { b.vx = b.vz = 0; b.anim = 'roar'; if (m.t > .4 && once(m, 's')) { say(b, 'Archers!', 1.4); spawnFoe('archer'); spawnFoe('archer'); } return m.t > 1.1; },
    summonFlyers(b, m) { b.vx *= .9; b.vz *= .9; if (m.t > .3 && once(m, 's')) { spawnFoe('flyer'); spawnFoe('flyer'); } return m.t > .9; },
    stomp(b, m) {
      b.vx = b.vz = 0; b.anim = m.t < .75 ? 'stomp' : 'idle';
      if (m.t < .75 && once(m, 'tell')) b.tell = .7;
      if (m.t >= .75 && once(m, 'hit')) { shake(.7); Sound.play('thunder'); dust(b.x, 0, b.z, 24, 3); S.waves.push({ x: b.x, z: b.z, r: 1, sp: 10, dmg: b.def.dmg, hgt: .9, life: 2.2, t: 0, set: new Set(), mesh: ringMesh('#ffb070') }); }
      return m.t > 1.4;
    },
    sweep(b, m) {
      const reach = Math.min(2.6 * b.scale, 7.5);
      if (m.t < .8) { b.anim = 'windup'; b.vx = b.vz = 0; if (once(m, 'tell')) { b.tell = .8; faceHero(b); m.sector = sectorMesh(b, reach); } return false; }
      b.anim = 'sweep';
      if (m.t < 1.0) { const h = S.hero, d = dirTo(b, h), f = fwdOf(b); if (!m.set.has(h) && d.d < reach && f.x * d.x + f.z * d.z > Math.cos(1.05) && h.y < .7) { m.set.add(h); hurtHero(b.def.dmg, b); } }
      if (once(m, 'sfx')) { Sound.play('arrow'); shake(.25); slashFx(b); }
      if (m.t > 1.15 && m.sector) { scene.remove(m.sector); m.sector = null; }
      return m.t > 1.5;
    },
    march(b, m, dt) {
      const d = faceHero(b); b.vx = d.x * 5; b.vz = d.z * 5; b.anim = 'run';
      meleeFrom(b, b.r + 1, b.def.dmg * .7, 0, m.set, 1.4);
      if (Math.random() < dt * 4) { shake(.15); dust(b.x, 0, b.z, 3, 2); }
      return m.t > 1.8;
    },
    fireRain(b, m) { b.vx *= .9; b.vz *= .9; b.anim = 'roar'; for (let i = 0; i < 6; i++) if (m.t >= .2 + i * .22 && once(m, 'f' + i)) meteor(S.hero.x + rnd(-4, 4), S.hero.z + rnd(-4, 4)); return m.t > 1.8; },
    arrowRain(b, m) { b.vx = b.vz = 0; b.anim = 'roar'; for (let i = 0; i < 8; i++) if (m.t >= .3 + i * .16 && once(m, 'f' + i)) meteor(S.hero.x + rnd(-5, 5), S.hero.z + rnd(-5, 5), 'fireArrow'); return m.t > 1.8; },
    fireWave(b, m) {
      b.vx = b.vz = 0; const d = m.t < .3 ? faceHero(b) : null; b.anim = m.t < .6 ? 'windup' : 'strike';
      if (m.t < .6 && once(m, 'tell')) b.tell = .6;
      for (const at of [.6, 1.0]) if (m.t >= at && once(m, 'w' + at)) { shake(.4); Sound.play('fire'); const f = fwdOf(b); S.walls.push({ x: b.x + f.x * 1.5, z: b.z + f.z * 1.5, dx: f.x, dz: f.z, sp: at === .6 ? 11 : 8.5, w: 7, dmg: b.def.dmg, life: 2.6, t: 0, set: new Set() }); }
      return m.t > 1.5;
    },
    swoop(b, m) {
      const h = S.hero;
      if (m.t < .45) { b.vx *= .9; b.vz *= .9; b.vy = 1; if (once(m, 'tell')) b.tell = .45; return false; }
      if (once(m, 'go')) { const c = chest(h), L = Math.hypot(c.x - b.x, c.y - b.y, c.z - b.z) || 1; b.vx = (c.x - b.x) / L * 16; b.vy = (c.y - b.y - .6) / L * 16; b.vz = (c.z - b.z) / L * 16; }
      if (!m.set.has(h) && Math.hypot(h.x - b.x, chest(h).y - b.y - b.h * .4, h.z - b.z) < b.r + 1.2) { m.set.add(h); hurtHero(b.def.dmg, b); }
      b.anim = 'strike';
      if (m.t > 1.05) { b.vy = 5; return m.t > 1.5; }
      return false;
    },
    fan(b, m) {
      b.vx *= .9; b.vz *= .9; b.vy *= .9; b.anim = m.t < .5 ? 'windup' : 'strike';
      if (m.t < .5 && once(m, 'tell')) b.tell = .5;
      if (m.t > .5 && once(m, 'f')) { const d = faceHero(b), a0 = Math.atan2(d.x, d.z), c = chest(S.hero), sy = b.y + b.h * .6; for (let i = -2; i <= 2; i++) { const a = a0 + i * .2; shoot({ k: 'fireball', team: 'foe', x: b.x, y: sy, z: b.z, vx: Math.sin(a) * 12, vy: (c.y - sy) / (d.d / 12), vz: Math.cos(a) * 12, dmg: b.def.dmg * .8, r: .45 }); } Sound.play('fire'); }
      return m.t > 1;
    },
    arrowFan(b, m) {
      b.vx *= .9; b.vz *= .9; b.vy *= .9; b.attacking = m.t > .5 && m.t < .8;
      if (m.t < .5 && once(m, 'tell')) b.tell = .5;
      if (m.t > .5 && once(m, 'f')) { const c = chest(S.hero), sy = b.y + 2.2, d = dirTo(b, S.hero), a0 = Math.atan2(d.x, d.z); for (let i = -2; i <= 2; i++) { const a = a0 + i * .14; shoot({ k: 'eArrow', team: 'foe', x: b.x, y: sy, z: b.z, vx: Math.sin(a) * 20, vy: (c.y - sy) / (d.d / 20), vz: Math.cos(a) * 20, dmg: b.def.dmg * .8, r: .3 }); } Sound.play('arrow'); }
      return m.t > 1.1;
    },
    chariotRam(b, m) {
      const h = S.hero;
      if (m.t < .6) { b.vx *= .9; b.vz *= .9; b.vy *= .9; if (once(m, 'tell')) { b.tell = .6; say(b, 'Chandrahasa!', 1.2); } return false; }
      if (once(m, 'go')) { const L = Math.hypot(h.x - b.x, h.y - b.y, h.z - b.z) || 1; b.vx = (h.x - b.x) / L * 19; b.vy = (h.y - b.y) / L * 19; b.vz = (h.z - b.z) / L * 19; }
      b.attacking = true;
      if (!m.set.has(h) && Math.hypot(h.x - b.x, h.y - b.y - 1, h.z - b.z) < 2.6) { m.set.add(h); hurtHero(b.def.dmg, b); }
      return m.t > 1.3;
    },
  };

  function lob(b, tx, tz, kind, T0 = 1) {
    const f = fwdOf(b), sx = b.x + f.x * .5 * b.scale, sy = b.y + 2 * b.scale, sz = b.z + f.z * .5 * b.scale, g = 20;
    S.markers.push({ x: tx, z: tz, r: kind === 'boulder' ? 2.2 : 1.4, t: 0, life: T0 });
    shoot({ k: kind, team: 'foe', x: sx, y: sy, z: sz, vx: (tx - sx) / T0, vy: (0 - sy + .5 * g * T0 * T0) / T0, vz: (tz - sz) / T0, grav: g, dmg: b.def.dmg * (kind === 'boulder' ? 1 : .8), r: kind === 'boulder' ? .9 : .5, splash: kind === 'boulder' ? 2.2 : 1.4 });
  }
  function meteor(x, z, k = 'meteor') { S.markers.push({ x, z, r: 1.5, t: 0, life: .75 }); shoot({ k, team: 'foe', x: x - 6, y: 18, z: z - 3, vx: 6 / .75, vy: -18 / .75, vz: 3 / .75, dmg: 12, r: .5, splash: 1.5, grav: 0, delay: 0 }); }

  /* ---------- Ravana ---------- */
  const tmpV = () => new T.Vector3();
  function headPositions() { return S.boss.J.heads.map(hg => { const v = tmpV(); hg.getWorldPosition(v); v.y += .15 * hg.userData.sc * S.boss.scale; return v; }); }
  function headsNear(a, reach) { const out = []; headPositions().forEach((p, i) => { if (S.boss.heads[i].alive && hyp(p.x - a.x, p.z - a.z) < reach + 1 && p.y - a.y < a.h + 2.5) out.push(i); }); return out.slice(0, 1); }
  function navelPos() { const v = tmpV(); S.boss.navel.getWorldPosition(v); return v; }
  function hitHead(i, dmg) {
    const b = S.boss, hd = b.heads[i]; hd.hp -= dmg; S.hitstop = .05;
    const p = headPositions()[i]; spark(p.x, p.y, p.z, '#ff5a3a', 12);
    if (hd.hp <= 0) {
      hd.alive = false; hd.regrow = 5.5; S.rv.cut++; Sound.play('hit');
      const hg = b.J.heads[i]; hg.visible = false;
      const clone = hg.clone(); clone.visible = true; const ws = tmpV(); hg.getWorldScale(ws); clone.scale.copy(ws); clone.position.copy(p); scene.add(clone);
      S.debris.push({ m: clone, vx: rnd(-3, 3), vy: 6, vz: rnd(-3, 3), t: 0, spin: rnd(-8, 8) });
      if (S.rv.phase === 1 && S.rv.cut >= 10) { S.rv.phase = 2; S.rv.cyc = 0; startCine({ kind: 'tip', dur: 3, freeze: true, caption: 'Vibhishana: "The amṛta is in his navel! Charge a full arrow and strike when it glows!"' }); }
      else if (S.rv.cut <= 3) float('The head grows back…', p, '#ffb0a0', 22);
    }
  }
  function ravanaTick(b, dt) {
    b.heads.forEach((hd, i) => { const hg = b.J.heads[i]; if (!hd.alive) { hd.regrow -= dt; if (hd.regrow <= .6) { hg.visible = true; hg.scale.setScalar(hg.userData.sc * Math.max(.05, 1 - hd.regrow / .6)); } if (hd.regrow <= 0) { hd.alive = true; hd.hp = 2; hg.scale.setScalar(hg.userData.sc); } } });
    if (S.rv.phase === 2) { S.rv.cyc += dt; S.rv.open = (S.rv.cyc % 4) > 2.4; b.navel.material = S.rv.open ? basic('#fff3a0') : toon('#6a5a3a'); b.navel.scale.setScalar(S.rv.open ? 1.6 + Math.sin(S.t * 14) * .2 : 1); if (S.rv.open && Math.random() < .5) { const n = navelPos(); emit(PS_ADD, { x: n.x, y: n.y, z: n.z, vx: rnd(-1, 1), vy: rnd(0, 2), vz: rnd(-1, 1), life: .5, size: .5, c: new T.Color('#ffd76a') }); } }
  }

  function bossDown(b) {
    if (b.def.minor) {
      b.flung = true; const d = dirTo(S.hero, b); b.vx = d.x * 30; b.vz = d.z * 30; b.vy = 18; S.hitstop = .12;
      startCine({ kind: 'mini', dur: 1.6, slow: .35, caption: 'The Mānava astra hurls Maricha a hundred yojanas into the sea!' });
      checkBossWave(); return;
    }
    b.dead = true; b.deadT = 0; b.vy = 0;
    S.foes.forEach(e => { if (!e.isBoss && !e.dead) killFoe(e, b); });
    const caps = { tataka: 'Tataka falls, and the forest breathes again.', subahu: 'Subahu falls to the Āgneya astra. The yajna is complete!', khara: 'Khara falls. The army of Janasthana is no more.', akshaya: 'Akshaya Kumara falls. Lanka trembles at a single vanara.', kumbha: 'The giant falls — the earth shakes for miles.', ravana: 'The Brahmastra strikes true. Ravana falls.' };
    Sound.play('thunder'); shake(.8);
    startCine({ kind: 'defeat', dur: 2.8, slow: .25, focus: b, caption: caps[b.key] || '', then: () => checkBossWave() });
  }
  function checkBossWave() {
    const live = S.foes.some(e => e.isBoss && !e.dead && !e.flung);
    if (!live) { S.boss = null; S.waveActive = false; if (S.wi >= S.def.waves.length) S.cleared = true; else { S.breakT = 2.2; heal(20, 'Strength returns'); } }
  }

  /* =========================================================
     PROJECTILES & HAZARDS
     ========================================================= */
  function shotMesh(k) {
    const g = new T.Group();
    if (k === 'arrow' || k === 'bigArrow' || k === 'eArrow' || k === 'astra' || k === 'fireArrow') {
      const big = k === 'bigArrow' || k === 'astra', fire = k === 'astra' || k === 'fireArrow';
      const sh = new T.Mesh(CYL(.018, .018, big ? 1.4 : 1, 5), big ? basic('#fff1a8') : toon(k === 'eArrow' ? '#2a1a10' : '#6e4416')); sh.rotation.x = Math.PI / 2; g.add(sh);
      const tip = new T.Mesh(CONE(.05, .16, 6), big ? basic('#fff7d0') : toon('#d9dde2')); tip.rotation.x = Math.PI / 2; tip.position.z = big ? .75 : .55; g.add(tip);
      const fl = new T.Mesh(BOX(.12, .005, .18), basic(k === 'eArrow' ? '#3a0a0a' : '#b8321f')); fl.position.z = big ? -.65 : -.45; g.add(fl);
      if (big || fire) { const glow = new T.Mesh(SPH(big ? .18 : .14, 8, 6), basic(fire ? '#ff9a3a' : '#ffe9a0', { transparent: true, opacity: .55, blending: T.AdditiveBlending, depthWrite: false })); glow.position.z = .5; glow.scale.set(1, 1, 3); g.add(glow); }
    } else if (k === 'fireball' || k === 'meteor') {
      g.add(new T.Mesh(SPH(.35, 10, 8), basic('#ffd76a'))); g.add(new T.Mesh(SPH(.55, 10, 8), basic('#f2702b', { transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false })));
    } else if (k === 'rock' || k === 'boulder') {
      part(geo('dod', () => new T.DodecahedronGeometry(1, 0)), '#8a8278', g, [0, 0, 0], { scale: k === 'boulder' ? [.9, .9, .9] : [.45, .45, .45], flat: true });
    } else if (k === 'spear') {
      const sh = new T.Mesh(CYL(.03, .03, 2.2, 5), toon('#5e3a12')); sh.rotation.x = Math.PI / 2; g.add(sh);
      const tip = new T.Mesh(CONE(.07, .3, 6), toon('#d9e2ea')); tip.rotation.x = Math.PI / 2; tip.position.z = 1.2; g.add(tip);
    } else if (k === 'feather') {
      const f = new T.Mesh(SPH(.25, 8, 6), toon('#7d5230')); f.scale.set(.3, .08, 1); g.add(f);
    }
    scene.add(g); return g;
  }
  function shoot(o) { o = Object.assign({ t: 0, life: 4, set: new Set(), r: .3 }, o); o.mesh = shotMesh(o.k); S.shots.push(o); }
  const lookTmp = () => new T.Vector3();

  function shotsUpdate(dt) {
    const h = S.hero;
    for (const o of S.shots) {
      o.t += dt;
      if (o.home && o.home.ent && !o.home.ent.dead && o.t > .05) {
        const p = o.home.navel ? navelPos() : o.home.ent.heads ? o.home.p : chest(o.home.ent);
        const sp = Math.hypot(o.vx, o.vy, o.vz), dx = p.x - o.x, dy = p.y - o.y, dz = p.z - o.z, L = Math.hypot(dx, dy, dz) || 1;
        const k = Math.min(1, o.turn * dt);
        o.vx = lerp(o.vx, dx / L * sp, k); o.vy = lerp(o.vy, dy / L * sp, k); o.vz = lerp(o.vz, dz / L * sp, k);
      }
      if (o.grav) o.vy -= o.grav * dt;
      o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
      o.mesh.position.set(o.x, o.y, o.z);
      const lt = lookTmp().set(o.x + o.vx, o.y + o.vy, o.z + o.vz); o.mesh.lookAt(lt);
      if (o.k === 'rock' || o.k === 'boulder') o.mesh.rotation.x += o.t * 6;
      if (o.k === 'fireball' || o.k === 'meteor' || o.k === 'fireArrow' || o.k === 'astra') flame(o.x, o.y, o.z, .7);
      if (o.t > o.life || Math.abs(o.x) > 200 || Math.abs(o.z) > 260) { o.dead = true; continue; }
      const floor = groundAt(o.x, o.z, o.y + 1);
      if (o.splash && o.y <= Math.max(0, floor)) {
        o.dead = true; dust(o.x, 0, o.z, 10, 1.5); spark(o.x, .3, o.z, '#ff9a3a', 10); if (o.k === 'boulder') shake(.25);
        if (hyp(h.x - o.x, h.z - o.z) < o.splash + h.r && h.y < 1.2) hurtHero(o.dmg, o);
        continue;
      }
      if (o.team === 'hero') {
        if (o.y < floor - .2 && !S.def.sky) { o.dead = true; dust(o.x, floor, o.z, 3); continue; }
        if (S.boss && S.boss.heads && !S.boss.dead) {
          const b = S.boss;
          if (S.rv.phase === 2) {
            const n = navelPos();
            if (Math.hypot(o.x - n.x, o.y - n.y, o.z - n.z) < .45 * b.scale) {
              o.dead = true;
              if (S.rv.open && o.k === 'bigArrow') {
                S.rv.navel--; S.hitstop = .15; shake(.5); spark(n.x, n.y, n.z, '#fff3c4', 40); Sound.play('bell');
                if (S.rv.navel > 0) float(`The amṛta drains! (${S.rv.navel} more)`, n, '#ffd76a', 30);
                S.rv.cyc = 0; S.rv.open = false;
                if (S.rv.navel <= 0) bossDown(b);
              } else { spark(n.x, n.y, n.z, '#cfd6dc', 6); float(S.rv.open ? 'Only a fully charged arrow!' : 'Shielded — wait for the glow', n, '#ffd0c0', 22); }
              continue;
            }
          }
          let hitH = false;
          headPositions().forEach((p, i) => { if (hitH || !b.heads[i].alive || o.set.has('h' + i)) return; if (Math.hypot(o.x - p.x, o.y - p.y, o.z - p.z) < .2 * b.scale * b.J.heads[i].userData.sc + o.r) { o.set.add('h' + i); hitHead(i, o.dmg); hitH = true; if (!o.pierce) o.dead = true; } });
          if (o.dead) continue;
        }
        for (const e of S.foes) {
          if (e.dead || e.flung || o.set.has(e) || (e.def && e.def.heads)) continue;
          if (hyp(o.x - e.x, o.z - e.z) < e.r + o.r && o.y > e.y - .2 && o.y < e.y + e.h + .2) {
            o.set.add(e); hurtFoe(e, o.dmg, o, o.k === 'bigArrow' ? 8 : 3); Sound.play('hit');
            if (!o.pierce) { o.dead = true; break; }
          }
        }
        if (!o.dead) for (const p of S.shots) if (p.team === 'foe' && !p.dead && Math.hypot(p.x - o.x, p.y - o.y, p.z - o.z) < p.r + o.r + .2) { p.dead = true; spark(p.x, p.y, p.z, '#ff9a3a', 8); if (!o.pierce) o.dead = true; break; }
      } else if (o.team === 'foe' && !o.splash) {
        if (hyp(o.x - h.x, o.z - h.z) < h.r + o.r && o.y > h.y - .2 && o.y < h.y + h.h) { o.dead = true; hurtHero(o.dmg, o); }
        else if (o.y < floor && !S.def.sky) o.dead = true;
      }
    }
    for (const o of S.shots) if (o.dead) scene.remove(o.mesh);
    S.shots = S.shots.filter(o => !o.dead);
  }

  function ringMesh(col) { const m = new T.Mesh(geo('ring', () => new T.RingGeometry(.86, 1, 64)), basic(col, { transparent: true, opacity: .85, side: T.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .06; scene.add(m); return m; }
  function sectorMesh(b, reach) {
    const m = new T.Mesh(new T.CircleGeometry(reach, 24, Math.PI / 2 - 1.05, 2.1), basic('#ff3020', { transparent: true, opacity: .35, side: T.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = b.yaw - Math.PI / 2 + Math.PI / 2; m.position.set(b.x, .05, b.z); scene.add(m); return m;
  }
  function ringFx(x, y, z, r, col) { const m = ringMesh(col); m.position.set(x, y + .06, z); S.fx3.push({ m, t: 0, life: .4, r }); }
  function slashFx(e) {
    const m = new T.Mesh(geo('slash', () => new T.TorusGeometry(1, .06, 4, 20, 2.2)), basic('#fff6dc', { transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
    m.position.set(e.x, e.y + e.h * .55, e.z); m.rotation.set(Math.PI / 2, 0, -e.yaw + Math.PI / 2 - 1.1); m.scale.setScalar(1.4 * e.scale);
    scene.add(m); S.fx3.push({ m, t: 0, life: .2, fade: true });
  }

  function hazardsUpdate(dt) {
    const h = S.hero;
    for (const w of S.waves) {
      w.t += dt; w.r += w.sp * dt; w.mesh.position.set(w.x, .06, w.z); w.mesh.scale.setScalar(w.r); w.mesh.material.opacity = .85 * (1 - w.t / w.life);
      const d = hyp(h.x - w.x, h.z - w.z);
      if (!w.set.has(h) && Math.abs(d - w.r) < .5 + h.r && h.y < w.hgt && !h.flying) { w.set.add(h); hurtHero(w.dmg, w); }
      if (Math.random() < .5) { const a = rnd(0, Math.PI * 2); dust(w.x + Math.cos(a) * w.r, 0, w.z + Math.sin(a) * w.r, 1); }
      if (w.t > w.life) { w.dead = true; scene.remove(w.mesh); }
    }
    S.waves = S.waves.filter(w => !w.dead);
    for (const w of S.walls) {
      w.t += dt; w.x += w.dx * w.sp * dt; w.z += w.dz * w.sp * dt;
      for (let i = 0; i < 4; i++) { const o = rnd(-w.w / 2, w.w / 2); flame(w.x - w.dz * o, 0, w.z + w.dx * o, 1.6); }
      const rx = h.x - w.x, rz = h.z - w.z, along = rx * w.dx + rz * w.dz, across = -rx * w.dz + rz * w.dx;
      if (!w.set.has(h) && Math.abs(along) < .6 && Math.abs(across) < w.w / 2 && h.y < .8) { w.set.add(h); hurtHero(w.dmg, w); }
      if (w.t > w.life) w.dead = true;
    }
    S.walls = S.walls.filter(w => !w.dead);
    for (const m of S.markers) {
      m.t += dt;
      if (!m.mesh) { m.mesh = ringMesh('#ff3020'); m.mesh.position.set(m.x, groundAt(m.x, m.z, 99) > -50 ? groundAt(m.x, m.z, 99) + .07 : .07, m.z); }
      m.mesh.scale.setScalar(m.r * (1 - m.t / m.life * .5)); m.mesh.material.opacity = .5 + Math.sin(S.t * 20) * .3;
      if (m.t > m.life) { m.dead = true; scene.remove(m.mesh); }
    }
    S.markers = S.markers.filter(m => !m.dead);
    for (const f of S.fx3) {
      f.t += dt; const k = f.t / f.life;
      if (f.r) f.m.scale.setScalar(f.r * k);
      f.m.material.opacity = (1 - k) * .9;
      if (f.t > f.life) { f.dead = true; scene.remove(f.m); }
    }
    S.fx3 = S.fx3.filter(f => !f.dead);
    for (const d of S.debris) { d.t += dt; d.vy -= GRAV * dt; d.m.position.x += d.vx * dt; d.m.position.y = Math.max(.2, d.m.position.y + d.vy * dt); d.m.position.z += d.vz * dt; d.m.rotation.x += d.spin * dt; if (d.t > 1.6) { d.dead = true; scene.remove(d.m); } }
    S.debris = S.debris.filter(d => !d.dead);
    for (const p of S.lotus) {
      p.t += dt; p.g.rotation.y += dt * 1.5; p.g.position.y = p.y + Math.sin(p.t * 3) * .12;
      if (Math.hypot(p.x - h.x, p.y - (h.y + .8), p.z - h.z) < 1.4 * h.scale) { p.got = true; heal(15, 'Lotus'); }
      if (p.t > 14 || p.got) { p.dead = true; scene.remove(p.g); }
    }
    S.lotus = S.lotus.filter(p => !p.dead);
    for (const em of S.emitters) { if (Math.random() < em.rate * dt) { if (em.k === 'fire') flame(em.x + rnd(-em.spread, em.spread), em.y, em.z + rnd(-em.spread, em.spread), 1.2); else emit(PS_NORM, { x: em.x + rnd(-em.spread, em.spread), y: em.y + 1, z: em.z, vx: rnd(-.3, .3), vy: rnd(.8, 1.6), vz: rnd(-.3, .3), life: rnd(2, 3.5), size: rnd(2.5, 4), c: new T.Color('#5a4040'), a0: .35, grow: 1.5 }); } }
  }

  /* =========================================================
     WAVES & CINEMATICS
     ========================================================= */
  function wavesUpdate(dt) {
    const def = S.def;
    if (S.waveActive) {
      if (!S.foes.some(e => !e.dead && !e.flung) && !S.cine) {
        S.waveActive = false;
        if (S.wi < def.waves.length) { S.breakT = 2.2; Sound.play('bell'); heal(20, 'Strength returns'); }
        else S.cleared = true;
      }
      return;
    }
    if (S.breakT > 0) { S.breakT -= dt; return; }
    if (S.wi < def.waves.length) {
      const wv = def.waves[S.wi++]; S.waveActive = true; S.waveNo = S.wi;
      if (wv.boss) {
        const b = spawnBoss(wv.boss);
        if (wv.boss === 'subahu') { const m = spawnBoss('maricha'); m.x = -b.x * .6; m.z = b.z; }
        startCine({ kind: 'boss', dur: 2.6, freeze: true, boss: b });
        say(b, b.def.bark, 2.8); Sound.play('conch');
      } else wv.e.forEach(t => spawnFoe(t));
    }
  }
  function startCine(c) { S.cine = Object.assign({ t: 0 }, c); }
  function cineUpdate(dtReal) {
    const c = S.cine; if (!c) return;
    c.t += dtReal;
    if (c.t >= c.dur) {
      S.cine = null;
      if (c.kind === 'intro') { S.fightT = 1; S.started = true; Sound.play('bell'); }
      if (c.kind === 'death') return finish(false, S.def.hero.startsWith('rama') ? 'Rama is driven back. Steady your aim — and rise again!' : 'Defeated — but a true warrior rises again. Try once more!');
      if (c.then) c.then();
    }
  }

  /* =========================================================
     CAMERA
     ========================================================= */
  function updateCamera(dtReal) {
    const h = S.hero, c = S.cine;
    if (!c || c.kind === 'mini' || c.kind === 'tip') {
      if (held('camL')) { S.camYaw += dtReal * 2.2; S.camManual = 1.5; }
      if (held('camR')) { S.camYaw -= dtReal * 2.2; S.camManual = 1.5; }
      S.camManual -= dtReal;
      if (document.pointerLockElement === hud || S.touchLook) S.camManual = Math.max(S.camManual, 3);
      const moving = hyp(h.vx, h.vz) > 2 && (held('fwd') || S.def.runner);
      if ((moving || h.flying) && S.camManual <= 0 && !h.aiming) S.camYaw += angDiff(S.camYaw, h.yaw + Math.PI) * Math.min(1, dtReal * (h.flying ? 1.2 : .9));
      if (h.aiming && h.lock && S.camManual <= 0) S.camYaw += angDiff(S.camYaw, h.yaw + Math.PI) * Math.min(1, dtReal * 1.5);
    }
    const boss = S.boss && !S.boss.dead ? S.boss : null;
    let tx = h.x, ty = h.y + 1.3 * h.scale, tz = h.z, dist = h.flying ? 9.5 : h.style === 'brawler' ? 7.2 : 7.8, pitch = S.camPitch;
    if (h.giant) dist += 3;
    if (boss && boss.scale > 1.5) { dist += boss.scale * 1.4; ty = lerp(ty, boss.y + boss.h * .45, .35); tx = lerp(tx, boss.x, .25); tz = lerp(tz, boss.z, .25); }
    let px = tx + Math.sin(S.camYaw) * Math.cos(pitch) * dist, py = ty + Math.sin(pitch) * dist, pz = tz + Math.cos(S.camYaw) * Math.cos(pitch) * dist;
    let lx = tx, ly = ty, lz = tz;
    if (c && c.kind === 'intro') {
      const k = Math.min(1, c.t / c.dur), a = S.camYaw + (1 - k) * 2.2, r = lerp(22, dist, k * k);
      px = tx + Math.sin(a) * r; py = ty + lerp(11, Math.sin(pitch) * dist, k); pz = tz + Math.cos(a) * r;
    } else if (c && c.kind === 'boss' && c.boss) {
      const b = c.boss, f = fwdOf(b), hy = b.y + b.h * .82;
      px = b.x + f.x * (2.6 * b.scale + 1.5) + Math.cos(b.yaw) * c.t * .6; py = hy + .2 * b.scale; pz = b.z + f.z * (2.6 * b.scale + 1.5) - Math.sin(b.yaw) * c.t * .6;
      lx = b.x; ly = hy; lz = b.z;
    } else if (c && (c.kind === 'defeat' || c.kind === 'death') && (c.focus || c.kind === 'death')) {
      const e = c.focus || h, a = S.camYaw + c.t * .5, r = 4 + e.scale * 2.4;
      px = e.x + Math.sin(a) * r; py = e.y + e.h * .7 + 1.5; pz = e.z + Math.cos(a) * r; lx = e.x; ly = e.y + e.h * .4; lz = e.z;
    }
    const k = c && (c.kind === 'boss' || c.kind === 'defeat') ? Math.min(1, dtReal * 3) : Math.min(1, dtReal * 7);
    S.cam.x = lerp(S.cam.x, px, k); S.cam.y = lerp(S.cam.y, py, k); S.cam.z = lerp(S.cam.z, pz, k);
    S.look.x = lerp(S.look.x, lx, k); S.look.y = lerp(S.look.y, ly, k); S.look.z = lerp(S.look.z, lz, k);
    if (!S.def.runner && !h.flying) S.cam.y = Math.max(S.cam.y, .6);
    const sh = S.shake * .45;
    camera.position.set(S.cam.x + rnd(-sh, sh), S.cam.y + rnd(-sh, sh), S.cam.z + rnd(-sh, sh));
    camera.lookAt(S.look.x, S.look.y, S.look.z);
    S.sky.position.copy(camera.position);
    if (S.stars) S.stars.position.copy(camera.position);
    S.sun.position.set(h.x + 18, h.y + 30, h.z + 12); S.sun.target.position.set(h.x, h.y, h.z);
  }

  /* =========================================================
     MAIN UPDATE
     ========================================================= */
  function update(dtReal) {
    const def = S.def;
    if (S.paused) return;
    cineUpdate(dtReal); if (!S) return;
    S.slowT -= dtReal;
    S.timeScale = S.cine && S.cine.slow ? S.cine.slow : S.slowT > 0 ? .45 : 1;
    if (S.hitstop > 0) { S.hitstop -= dtReal; return; }
    const dt = dtReal * S.timeScale; S.t += dt;
    const frozen = S.cine && S.cine.freeze;
    if (!frozen || S.cine.kind === 'intro') heroUpdate(dt);
    if (!frozen) {
      for (const e of S.foes) (e.isBoss ? bossUpdate : foeUpdate)(e, dt);
      for (const e of S.foes) if (e.gone) scene.remove(e.J.root);
      S.foes = S.foes.filter(e => !e.gone);
      shotsUpdate(dt); hazardsUpdate(dt);
      if (!def.runner) wavesUpdate(dt);
      else for (const r of S.roofs) if (r.foe && !r.spawned && r.z1 > S.hero.z - 30) { r.spawned = true; const e = spawnFoe(r.foe, { x: (r.x0 + r.x1) / 2, z: rnd(r.z0 + 1, r.z1 - 1), y: r.y }); e.roof = r; }
    }
    if (S.pound > 0) { S.pound -= dt; if (S.pound <= 0) { const h = S.hero; ringFx(h.x, h.y, h.z, 9, '#ffe9a0'); shake(.6); for (const e of S.foes) if (!e.dead && !e.flung && hyp(e.x - h.x, e.z - h.z) < 9) hurtFoe(e, 6, h, 12); } }
    if (S.astra) {
      S.astra.t += dt;
      while (S.astra.n < 26 && S.astra.t > S.astra.n * .05) {
        S.astra.n++;
        const tg = S.foes.filter(e => !e.dead && !e.flung); const e = tg.length ? tg[S.astra.n % tg.length] : null;
        const p = e ? (e.heads ? headPositions()[S.astra.n % 10] : chest(e)) : { x: S.hero.x + rnd(-8, 8), y: 0, z: S.hero.z + rnd(-8, 8) };
        const sx = p.x + rnd(-6, 6), sz = p.z + rnd(-6, 6);
        shoot({ k: 'astra', team: 'hero', x: sx, y: 22, z: sz, vx: (p.x - sx) * 1.6, vy: (p.y - 22) * 1.6, vz: (p.z - sz) * 1.6, dmg: 2.4, r: .5, pierce: true, home: e ? { ent: e, p } : null, turn: 4 });
      }
      if (S.astra.n >= 26) S.astra = null;
    }
    // stage-specific endings
    if (def.timer && !S.cine && S.started && S.boss && !S.over) {
      S.timer -= dt;
      if (S.timer <= 0) {
        S.timer = 0; const b = S.boss, c = chest(b);
        shoot({ k: 'bigArrow', team: 'none', x: c.x - 30, y: c.y + 4, z: c.z + 20, vx: 30 / .5, vy: -4 / .5, vz: -20 / .5, dmg: 0, r: .3, life: .5 });
        b.dead = true; b.deadT = 0; Sound.play('thunder'); shake(.6); S.flash = .6;
        startCine({ kind: 'defeat', dur: 3, slow: .25, focus: b, caption: 'From behind a tree, Rama\'s arrow flies. Vali falls — and Sugriva is king.', then: () => finish(true) });
      }
    }
    if (def.key === 'act_jatayu' && S.boss && !S.boss.dead && S.boss.hp <= S.boss.max * .3 && !S.cine && once(S, 'jatEnd')) {
      S.flash = .5; shake(.6); Sound.play('thunder'); S.boss.attacking = true;
      startCine({ kind: 'defeat', dur: 3.4, slow: .3, focus: S.hero, caption: 'Jatayu shattered Ravana\'s bow and chariot — until Chandrahasa cut his wings. His courage bought Rama the truth.', then: () => finish(true) });
    }
    if (def.runner && S.hero.z < S.goalZ && !S.over && !S.cine) { S.over = true; startCine({ kind: 'defeat', dur: 2.8, slow: .5, focus: S.hero, caption: `Lanka burns! ${S.burned} rooftops ablaze. Hanuman cools his tail in the sea.`, then: () => finish(true) }); }
    if (S.cleared && !S.over && !S.cine) { S.over = true; finish(true); }
    // timers
    S.shake = Math.max(0, S.shake - dtReal); S.flash = Math.max(0, S.flash - dtReal * 1.5);
    if (S.fightT) S.fightT -= dtReal;
    S.letter = lerp(S.letter, S.cine && S.cine.kind !== 'mini' && S.cine.kind !== 'tip' ? 1 : 0, Math.min(1, dtReal * 6));
    S.texts.forEach(t => (t.t += dtReal)); S.texts = S.texts.filter(t => t.t < 1.4);
    S.barks.forEach(b => (b.t += dtReal)); S.barks = S.barks.filter(b => b.t < b.dur);
    psUpdate(PS_ADD, dt); psUpdate(PS_NORM, dt);
    for (const cl of S.clouds) { cl.position.x += dt * 1.5; if (cl.position.x > 70) cl.position.x = -70; }
    // hero fire tail in Lanka
    if (def.runner && S.hero.J.tail) { const v = tmpV(); S.hero.J.tail[8].getWorldPosition(v); flame(v.x, v.y, v.z, 1); flame(v.x, v.y, v.z, .8); }
  }

  /* ---------- animate models ---------- */
  function animate(dtReal) {
    const all = [S.hero, ...S.foes];
    for (const e of all) {
      syncEnt(e);
      if (e.J.bird) {
        const f = Math.sin(S.t * (e.dive > 0 ? 26 : 9)) * .7;
        e.J.wings[0].rotation.z = -f; e.J.wings[1].rotation.z = f;
        e.J.pivot.rotation.x = e.dive > 0 ? .5 : -e.vy * .03; e.J.pivot.rotation.z = e.rolling ? e.J.pivot.rotation.z : (e.tilt || 0);
        continue;
      }
      if (e.J.chariot) {
        e.J.wheels.forEach(w => (w.rotation.x += dtReal * 6));
        applyPose(e.J.rv, e.attacking ? POSE.strike() : POSE.idle(S.t), Math.min(1, dtReal * 10));
        applyPose(e.J.st, POSE.plead(), Math.min(1, dtReal * 10));
        e.J.root.rotation.z = Math.sin(S.t * 1.2) * .05;
        e.J.rv.head.rotation.y = Math.sin(S.t) * .1;
        continue;
      }
      const p = (POSE[e.anim] || POSE.idle)(e.at, e);
      applyPose(e.J, p, Math.min(1, dtReal * (e.anim === 'run' ? 22 : 14)));
      if (e.J.tail) e.J.tail.forEach((s, i) => { if (i) s.rotation.x = -.22 + Math.sin(S.t * 3 + i * .6) * .12; s.rotation.z = Math.sin(S.t * 2 + i * .5) * .1; });
      if (e.J.wings) { const f = Math.sin(S.t * 12 + (e.ph || 0)) * .6; e.J.wings[0].rotation.y = -.4 - f; e.J.wings[1].rotation.y = .4 + f; }
      flashOn(e, e.flash > 0 && !e.isBoss);
      if (e.isHero && e.inv > 0 && !e.rolling && !S.cine) e.J.root.visible = Math.floor(S.t * 20) % 2 === 0; else e.J.root.visible = true;
    }
    updateBowStrings();
  }
  function updateBowStrings() {
    const list = [S.hero, ...S.foes].filter(e => e.J && e.J.bow);
    while (S.bowStrings.children.length) S.bowStrings.remove(S.bowStrings.children[0]);
    for (const e of list) {
      if (e.dead || (e.J.root.visible === false)) continue;
      const b = e.J.bow, t1 = tmpV(), t2 = tmpV(), pull = tmpV();
      b.g.updateWorldMatrix(true, false);
      t1.copy(b.g.userData.tips[0]).applyMatrix4(b.g.matrixWorld); t2.copy(b.g.userData.tips[1]).applyMatrix4(b.g.matrixWorld);
      if (e.aiming) e.J.aR.hand.getWorldPosition(pull); else pull.copy(t1).add(t2).multiplyScalar(.5);
      b.string.geometry.setFromPoints([t1, pull, t2]); S.bowStrings.add(b.string);
      if (e.aiming) {
        if (!b.nock) { b.nock = new T.Mesh(CYL(.012, .012, 1, 4), basic('#5e3a12')); }
        const hand = tmpV(); e.J.aL.hand.getWorldPosition(hand);
        const mid = pull.clone().add(hand).multiplyScalar(.5), len = pull.distanceTo(hand) + .3;
        b.nock.position.copy(mid); b.nock.scale.set(1, len, 1); b.nock.lookAt(hand); b.nock.rotateX(Math.PI / 2);
        b.nock.material = (e.charge || 0) >= CHARGE ? basic('#fff1a8') : basic('#5e3a12');
        S.bowStrings.add(b.nock);
      }
    }
  }

  /* =========================================================
     HUD (2D overlay)
     ========================================================= */
  const proj = p => { const v = new T.Vector3(p.x, p.y, p.z).project(camera); return { x: (v.x + 1) * W / 2, y: (1 - v.y) * H / 2, vis: v.z < 1 && v.z > -1 }; };
  function label(text, x, y, size = 22, color = '#fff3c4', font = SERIF) {
    if (!text) return;
    const g = hctx; g.save(); g.font = `700 ${size}px ${font}`; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(30,10,5,.9)';
    g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y); g.restore();
  }
  function bar(x, y, w, h, k, col) {
    const g = hctx; g.fillStyle = 'rgba(20,8,4,.75)'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    g.fillStyle = col; g.fillRect(x, y, w * clamp(k, 0, 1), h); g.strokeStyle = GOLD; g.lineWidth = 2; g.strokeRect(x - 3, y - 3, w + 6, h + 6);
  }
  function wrap(text, maxW) { const g = hctx, words = text.split(' '), lines = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t; } lines.push(line); return lines; }

  function drawHUD() {
    const g = hctx, h = S.hero, def = S.def, c = S.cine;
    g.clearRect(0, 0, W, H);
    // world-anchored overlays
    for (const t of S.texts) { const p = proj({ x: t.x, y: t.y + t.t * (t.dmg ? 1.2 : .5), z: t.z }); if (!p.vis) continue; g.globalAlpha = Math.min(1, (1.4 - t.t) * 2); label(t.text, p.x, p.y, t.size, t.col); }
    g.globalAlpha = 1;
    for (const e of S.foes) {
      if (e.dead || e.flung) continue;
      const top = proj({ x: e.x, y: e.y + e.h + .35, z: e.z }); if (!top.vis) continue;
      if (e.tell > 0) { g.save(); g.font = `700 40px ${DISPLAY}`; g.textAlign = 'center'; g.fillStyle = '#ff3b2f'; g.strokeStyle = '#fff3c4'; g.lineWidth = 4; g.strokeText('!', top.x, top.y); g.fillText('!', top.x, top.y); g.restore(); }
      if (!e.isBoss && e.hp < e.max) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(top.x - 26, top.y + 6, 52, 6); g.fillStyle = '#e8661c'; g.fillRect(top.x - 26, top.y + 6, 52 * Math.max(0, e.hp / e.max), 6); }
    }
    if (h.lock && !c) { const p = proj(h.lock.p); if (p.vis) { g.save(); g.strokeStyle = h.lock.navel ? '#ffd76a' : 'rgba(255,243,196,.9)'; g.lineWidth = 3; const r = 18 + Math.sin(S.t * 6) * 2; g.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + S.t; g.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); g.lineTo(p.x + Math.cos(a) * (r + 10), p.y + Math.sin(a) * (r + 10)); } g.stroke(); g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.stroke(); g.restore(); } }
    if (h.aiming) { const p = proj(chest(h)); g.save(); g.strokeStyle = h.charge >= CHARGE ? '#ffd76a' : '#fff3c4'; g.lineWidth = 5; g.beginPath(); g.arc(p.x, p.y - 70, 22, -Math.PI / 2, -Math.PI / 2 + Math.min(1, h.charge / CHARGE) * Math.PI * 2); g.stroke(); g.restore(); }
    for (const b of S.barks) {
      const e = b.e, p = proj({ x: e.x, y: e.y + e.h + .9, z: e.z }); if (!p.vis) continue;
      const x = clamp(p.x, 180, W - 180), y = clamp(p.y, 110, H - 140);
      g.save(); g.font = `700 22px ${SERIF}`; const w = Math.min(460, g.measureText(b.text).width + 30);
      g.globalAlpha = Math.min(1, (b.dur - b.t) * 3, b.t * 6); g.fillStyle = '#fff8e6'; g.strokeStyle = INK; g.lineWidth = 2.5;
      g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, y - 46, w, 40, 12) : g.rect(x - w / 2, y - 46, w, 40); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(x - 8, y - 7); g.lineTo(x, y + 6); g.lineTo(x + 8, y - 7); g.fill();
      g.fillStyle = INK; g.textAlign = 'center'; g.fillText(b.text, x, y - 19, w - 20); g.restore();
    }
    // letterbox & cinematic text
    const lb = S.letter * 78; if (lb > 1) { g.fillStyle = '#000'; g.fillRect(0, 0, W, lb); g.fillRect(0, H - lb, W, lb); }
    if (S.flash > 0) { g.fillStyle = `rgba(255,250,230,${Math.min(.9, S.flash)})`; g.fillRect(0, 0, W, H); }
    if (c) {
      if (c.kind === 'intro') { g.globalAlpha = Math.min(1, c.t * 2, (c.dur - c.t) * 2); label(def.title, W / 2, 300, 72, '#ffe9a8', DISPLAY); label(def.sub, W / 2, 352, 30, '#fff3c4'); g.globalAlpha = 1; }
      else if (c.kind === 'boss') {
        const b = c.boss, a = Math.min(1, c.t * 3), sl = Math.min(1, c.t * 4);
        g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(120,20,10,.75)'; g.fillRect(0, 460, W * sl, 150); g.fillStyle = GOLD; g.fillRect(0, 456, W * sl, 4); g.fillRect(0, 606, W * sl, 4);
        label(b.def.dev || '', W / 2, 506, 34, '#f6d77e', DEVA); label(b.def.name.toUpperCase(), W / 2, 566, 70 + Math.max(0, .3 - c.t) * 100, '#fff3c4', DISPLAY); label(b.def.sub, W / 2, 598, 24, '#ffd9b0'); g.restore();
      } else if (c.caption) {
        g.globalAlpha = Math.min(1, c.t * 3); g.font = `600 italic 28px ${SERIF}`;
        wrap(c.caption, 1000).forEach((l, i, arr) => label(l, W / 2, H - (c.kind === 'mini' || c.kind === 'tip' ? 110 : 40) - (arr.length - 1 - i) * 34, 28, '#fff3c4'));
        g.globalAlpha = 1;
      }
      if (c.kind !== 'mini' && c.kind !== 'tip') return;
    }
    // hero panel
    const name = { rama_young: 'Rama', rama_exile: 'Rama', hanuman: 'Hanuman', sugriva: 'Sugriva', jatayu: 'Jatayu' }[def.hero];
    g.fillStyle = 'rgba(17,22,58,.78)'; g.fillRect(16, 14, 340, 78); g.strokeStyle = GOLD; g.lineWidth = 2; g.strokeRect(16, 14, 340, 78);
    label(name, 72, 44, 24, '#ffe9a8', DISPLAY);
    bar(136, 26, 204, 16, h.hp / h.max, h.hp < 30 ? '#e83a2a' : '#4fbf6a');
    bar(136, 56, 204, 10, h.meter / 100, h.meter >= 100 ? `hsl(45,100%,${55 + Math.sin(S.t * 10) * 15}%)` : '#d4a017');
    g.font = `600 15px ${SERIF}`; g.fillStyle = h.meter >= 100 ? '#ffe9a8' : '#c9b98a'; g.textAlign = 'left'; g.fillText((h.meter >= 100 ? 'K — ' : '') + def.special, 136, 86);
    let obj = '';
    if (def.runner) obj = `Rooftops ablaze: ${S.burned} · Run to the sea!`;
    else if (def.timer && S.boss) obj = `Hold Vali off until Rama's arrow: ${Math.ceil(S.timer)}s`;
    else if (S.boss && S.boss.heads) obj = S.rv.phase === 1 ? `Sever the heads: ${Math.min(10, S.rv.cut)}/10` : `Charged arrows into the glowing amṛta: ${S.rv.navel} left`;
    else if (def.key === 'act_jatayu') obj = 'Strike Ravana\'s chariot!';
    else if (S.boss && !S.boss.dead) obj = `Defeat ${S.boss.def.name}`;
    else if (S.waveActive) obj = `Wave ${S.waveNo}/${def.waves.length} — rakshasas left: ${S.foes.filter(e => !e.dead && !e.isBoss && !e.flung).length}`;
    else if (S.breakT > 0) obj = 'More are coming…';
    if (obj) { g.font = `700 22px ${SERIF}`; const w = g.measureText(obj).width + 40; g.fillStyle = 'rgba(246,231,200,.94)'; g.fillRect(W / 2 - w / 2, 16, w, 38); g.strokeStyle = GOLD; g.strokeRect(W / 2 - w / 2, 16, w, 38); g.fillStyle = INK; g.textAlign = 'center'; g.fillText(obj, W / 2, 42); }
    if (S.boss && !S.boss.dead && !(c && c.kind === 'boss')) {
      const b = S.boss, k = b.heads ? (S.rv.phase === 1 ? 1 - Math.min(10, S.rv.cut) / 20 : S.rv.navel / 6) : b.hp / b.max;
      label(b.def.name, W / 2, H - 50, 24, '#ffe9a8', DISPLAY); bar(W / 2 - 330, H - 38, 660, 16, k, '#c0391b');
    }
    if (S.fightT > 0) label(def.runner ? 'RUN!' : 'FIGHT!', W / 2, H / 2, 96 + (1 - S.fightT) * 30, '#ffe9a8', DISPLAY);
    if (S.t < 10 && !c) {
      const tip = { archer: 'WASD move · Space jump · J / click: shoot (hold = charged arrow, auto-aims) · K astra · Shift/L roll · click the screen for 360° mouse camera (Esc frees it)', brawler: 'WASD move · Space jump · J / click: combo (in air = slam) · K special · Shift/L roll · click for 360° mouse camera', flyer: 'WASD fly · Space up / C down · J dive-strike · K feather storm · Shift/L roll' }[h.style];
      g.globalAlpha = Math.min(1, 10 - S.t); label(tip, W / 2, H - 90, 19, '#fff3c4'); g.globalAlpha = 1;
    }
    if (!c && document.pointerLockElement !== hud && S.t > 2 && S.t < 30 && !S.touchLook) { g.font = `600 17px ${SERIF}`; label('🖱  Click the battlefield to look around 360° with your mouse', W - 300, 120, 17, '#fff3c4'); }
    if (S.paused) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, H); label('Paused', W / 2, H / 2, 64, '#ffe9a8', DISPLAY); label('Press Esc or P to continue', W / 2, H / 2 + 50, 24); }
  }

  /* =========================================================
     RUNTIME
     ========================================================= */
  function bindOnce() {
    if (bound) return; bound = true;
    window.addEventListener('keydown', e => {
      if (!S) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.code === 'Escape' || e.code === 'KeyP') { if (!e.repeat && !(e.code === 'Escape' && document.pointerLockElement)) S.paused = !S.paused; return; }
      keys[e.code] = true;
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    hud.addEventListener('contextmenu', e => { if (S) e.preventDefault(); });
    // camera: mouse-look (pointer lock) for a full 360°, right-drag, or one-finger drag on touch screens
    let drag = null, touch = null;
    const look = (dx, dy) => { S.camYaw -= dx * .0042; S.camPitch = clamp(S.camPitch + dy * .0032, -.25, 1.25); S.camManual = 2; };
    hud.addEventListener('pointerdown', e => {
      if (!S) return;
      if (e.pointerType === 'touch') { touch = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t: performance.now() }; return; }
      if (e.button === 2) { drag = { x: e.clientX, y: e.clientY }; return; }
      if (document.pointerLockElement !== hud && hud.requestPointerLock && !S.cine) { try { hud.requestPointerLock(); } catch (err) { /* not allowed */ } S.lockHint = 0; }
      keys.Mouse0 = true;
    });
    hud.addEventListener('pointermove', e => {
      if (!S) return;
      if (document.pointerLockElement === hud) return look(e.movementX || 0, e.movementY || 0);
      if (touch && e.pointerId === touch.id) { const dx = e.clientX - touch.x, dy = e.clientY - touch.y; touch.moved += Math.abs(dx) + Math.abs(dy); touch.x = e.clientX; touch.y = e.clientY; if (touch.moved > 8) { S.touchLook = true; look(dx * 1.6, dy * 1.6); } return; }
      if (drag) { look(e.clientX - drag.x, e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY; }
    });
    window.addEventListener('pointerup', e => {
      if (e.button === 2) drag = null;
      if (touch && e.pointerId === touch.id) { if (touch.moved <= 8 && S) { keys.Mouse0 = true; setTimeout(() => { keys.Mouse0 = false; }, 120); } touch = null; if (S) S.touchLook = false; return; }
      if (e.button === 0) keys.Mouse0 = false;
    });
    padEl = document.createElement('div'); padEl.id = 'pad3'; padEl.className = 'pad';
    padEl.innerHTML = `<div class="pad-l"><button data-k="KeyA">◀</button><div class="pad-col"><button data-k="KeyW">▲</button><button data-k="KeyS">▼</button></div><button data-k="KeyD">▶</button></div>
      <div class="pad-r"><button data-k="ShiftLeft">⤳</button><button data-k="KeyK">✦</button><button data-k="Space">⤒</button><button data-k="KeyJ" class="big">⚔</button></div>`;
    document.getElementById('stage').appendChild(padEl);
    padEl.querySelectorAll('button').forEach(b => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', e => { e.preventDefault(); keys[k] = true; });
      const up = () => { keys[k] = false; };
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    });
  }

  function start(id) {
    // if 3D cannot start on this device, fight the same battle in 2D
    try { initGfx(); } catch (e) { console.warn('3D unavailable, using 2D', e); return Action.start(id); }
    bindOnce();
    const def = Object.assign({ key: id }, STAGES3[id]);
    return new Promise(resolve => {
      resolveFn = resolve;
      for (const k in keys) keys[k] = false;
      S = { def, t: 0, foes: [], shots: [], waves: [], walls: [], markers: [], fx3: [], debris: [], lotus: [], emitters: [], clouds: [], texts: [], barks: [],
        wi: 0, waveActive: false, boss: null, breakT: 1, shake: 0, flash: 0, hitstop: 0, slowT: 0, letter: 1, timeScale: 1, kills: 0, timer: def.timer || 0,
        cleared: false, over: false, paused: false, camYaw: 0, camPitch: def.style === 'flyer' ? .22 : .32, camManual: 0, cam: new T.Vector3(0, 12, 30), look: new T.Vector3() };
      buildWorld(def);
      S.hero = makeHero(def);
      S.camYaw = S.hero.yaw + Math.PI;
      startCine({ kind: 'intro', dur: 2.6, freeze: true });
      Sound.play('conch');
      glCv.classList.add('show'); hud.classList.add('show');
      document.body.classList.add('action3d-on');
      last = performance.now();
      const frame = now => {
        if (!S) return;
        const dt = Math.min(.05, (now - last) / 1000); last = now;
        step(dt);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
  }
  function step(dt, noRender) {
    update(dt); if (!S) return;
    animate(dt); updateCamera(dt);
    if (!noRender) { renderer.render(scene, camera); drawHUD(); }
    if (!(S.hitstop > 0) && !S.paused) for (const k in keys) prev[k] = keys[k];
  }
  function finish(win, msg) {
    if (!S || S.finished) return;
    S.finished = true; S.over = true;
    Sound.play(win ? 'win' : 'lose');
    setTimeout(() => { const r = resolveFn; stop(); r && r({ win, msg }); }, win ? 900 : 500);
  }
  function stop() {
    cancelAnimationFrame(raf); S = null; resolveFn = null;
    if (glCv) glCv.classList.remove('show');
    if (hud) { hud.classList.remove('show'); hctx.clearRect(0, 0, W, H); }
    document.body.classList.remove('action3d-on');
    for (const k in keys) keys[k] = false;
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    scene = null;
  }

  return {
    get supported() { return supported && !failed; }, start, stop, has: id => !!STAGES3[id], get active() { return !!S; },
    _debug: { state: () => S, step, keys, prev },
    kit: { init: initGfx, get renderer() { return renderer; }, get GRAD() { return GRAD; }, buildFigure, buildJatayu, part, toon, basic, POSE, applyPose, THEME3, tree3, hut3, rock3, tower3, banner3, mountain3, cloud3, groundTex, skyDome, SPH, CAP, CYL, CONE, BOX, TOR, geo, RIG3 },
  };
})();
