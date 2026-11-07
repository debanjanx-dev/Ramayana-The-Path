'use strict';
/* =========================================================
   ART — every character & scene is hand-built SVG in the
   spirit of Indian miniature painting: flat colour, ink
   outlines, gold leaf and almond "lotus" eyes.
   ========================================================= */
const INK = '#2b1a10', GOLD = '#d4a017', GOLD_D = '#9a6f10', GOLD_L = '#f6d77e',
  RUBY = '#b3122e', EMER = '#1f7a4a', SAPPH = '#2a4fb8', PEARL = '#f8f2e4', SINDOOR = '#d8261b';

const st = (w = 1.8) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const svgWrap = (vb, body, par = 'xMidYMax meet') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="${par}">${body}</svg>`;

/* ---------- shared parts ---------- */
function halo(cx = 100, cy = 104, r = 84) {
  return `<circle cx="${cx}" cy="${cy}" r="${r + 9}" fill="none" stroke="${GOLD_L}" stroke-width="10" stroke-dasharray="2 9"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffe7a1" fill-opacity=".65" stroke="${GOLD}" stroke-width="3"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 9}" fill="none" stroke="${GOLD}" stroke-width="1.2" stroke-dasharray="4 4"/>`;
}

function bowBack() {
  return `<path d="M34 16 Q-14 140 34 254" fill="none" stroke="#3e220f" stroke-width="11"/>
  <path d="M34 16 Q-14 140 34 254" fill="none" stroke="#8a5424" stroke-width="6"/>
  <path d="M34 16 L34 254" stroke="#efe3c2" stroke-width="1.4"/>
  <path d="M10 122 L10 156" stroke="${GOLD}" stroke-width="13"/>
  <path d="M10 128 L10 150" stroke="${RUBY}" stroke-width="4" stroke-dasharray="3 3"/>
  <path d="M33 16 q-8 -8 0 -13" stroke="${GOLD}" stroke-width="4" fill="none"/>`;
}

function quiver() {
  return `<g transform="rotate(18 160 140)">
    <path d="M154 34 V64 M168 30 V64 M182 34 V64" stroke="#6b4a1f" stroke-width="2.5"/>
    <path d="M150 36 l4 -18 l4 18 Z M164 32 l4 -20 l4 20 Z M178 36 l4 -16 l4 16 Z" fill="${PEARL}" stroke="${RUBY}" stroke-width="2"/>
    <rect x="146" y="56" width="44" height="150" rx="10" fill="#8b2f17" ${st(1.8)}/>
    <path d="M146 74 H190 M146 184 H190" stroke="${GOLD}" stroke-width="5"/>
    <circle cx="168" cy="128" r="8" fill="${GOLD}" ${st(1.2)}/></g>`;
}

function gada(x = 168, y = 92) {
  return `<path d="M128 252 L${x - 2} ${y + 26}" stroke="#5e3a12" stroke-width="10" stroke-linecap="round"/>
  <path d="M128 252 L${x - 2} ${y + 26}" stroke="#a87423" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="${x}" cy="${y}" rx="23" ry="29" fill="${GOLD}" ${st(2)}/>
  <path d="M${x - 22} ${y - 6} Q${x} ${y + 2} ${x + 22} ${y - 6} M${x - 21} ${y + 10} Q${x} ${y + 18} ${x + 21} ${y + 10} M${x} ${y - 29} V${y + 29}" stroke="${GOLD_D}" stroke-width="2" fill="none"/>
  <circle cx="${x}" cy="${y}" r="5" fill="${RUBY}"/>
  <circle cx="${x}" cy="${y - 33}" r="6" fill="${GOLD}" ${st(1.4)}/>`;
}

/* ---------- face ---------- */
function eyes(P) {
  const k = P.eyes, big = k === 'fierce';
  const L = big ? 'M68 100 Q84 88 99 100 Q84 109 68 100Z' : 'M70 101 Q84 91 98 101 Q84 108 70 101Z';
  const R = big ? 'M101 100 Q116 88 132 100 Q116 109 101 100Z' : 'M102 101 Q116 91 130 101 Q116 108 102 101Z';
  let s = `<path d="${L}" fill="${PEARL}" ${st(1.6)}/><path d="${R}" fill="${PEARL}" ${st(1.6)}/>`;
  s += `<path d="M70 101 L62 97 M130 101 L138 97" stroke="${INK}" stroke-width="2"/>`;
  const ir = big ? 5.4 : 4.7;
  s += `<circle cx="85" cy="100.5" r="${ir}" fill="${P.iris}"/><circle cx="115" cy="100.5" r="${ir}" fill="${P.iris}"/>`;
  s += `<circle cx="86.7" cy="98.8" r="1.4" fill="#fff"/><circle cx="116.7" cy="98.8" r="1.4" fill="#fff"/>`;
  if (k === 'serene' || k === 'sad')
    s += `<path d="M70 101 Q84 91 98 101 Q84 ${k === 'sad' ? 98.5 : 97.4} 70 101Z" fill="${P.skin}" ${st(1.4)}/><path d="M102 101 Q116 91 130 101 Q116 ${k === 'sad' ? 98.5 : 97.4} 102 101Z" fill="${P.skin}" ${st(1.4)}/>`;
  const brows = {
    calm: ['M67 92 Q83 82 98 90', 'M133 92 Q117 82 102 90'],
    stern: ['M66 90 Q84 85 98 92', 'M134 90 Q116 85 102 92'],
    sad: ['M68 92 Q84 89 97 84', 'M132 92 Q116 89 103 84'],
    fierce: ['M63 84 Q82 83 98 97', 'M137 84 Q118 83 102 97'],
  };
  const b = brows[k] || brows.calm;
  const bw = big ? 5.5 : 3;
  s += `<path d="${b[0]}" stroke="${P.brow}" stroke-width="${bw}" fill="none" stroke-linecap="round"/><path d="${b[1]}" stroke="${P.brow}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`;
  if (P.old) s += `<path d="M138 104 l7 2 M138 99 l7 -2 M62 104 l-7 2 M62 99 l-7 -2 M74 110 Q84 114 95 110 M105 110 Q116 114 126 110" stroke="${P.shade}" stroke-width="1.4" fill="none"/>`;
  return s;
}

function mouth(P) {
  const lip = P.lip;
  switch (P.mouth) {
    case 'smile': return `<path d="M88 132 Q94 129 100 131 Q106 129 112 132 Q100 141 88 132Z" fill="${lip}" ${st(1)}/><path d="M85 131 Q100 139 115 131" stroke="${INK}" stroke-width="1.2" fill="none"/>`;
    case 'sad': return `<path d="M89 137 Q100 131 111 137 Q100 140 89 137Z" fill="${lip}" ${st(1)}/>`;
    case 'fierce': return `<path d="M84 131 Q100 127 116 131 Q100 147 84 131Z" fill="#5a0f12" ${st(1.3)}/><path d="M89 132 L92 138 L95 132 Z M105 132 L108 138 L111 132 Z" fill="#fff"/>`;
    case 'laugh': return `<path d="M84 129 Q100 133 116 129 Q100 150 84 129Z" fill="#5a0f12" ${st(1.3)}/><path d="M87 130 Q100 134 113 130 L112 134 Q100 137 88 134Z" fill="#fff"/>`;
    default: return `<path d="M89 134 Q100 131 111 134 Q100 139 89 134Z" fill="${lip}" ${st(1)}/>`;
  }
}

function tilak(P) {
  switch (P.tilak) {
    case 'vaishnava': return `<path d="M94.5 76 Q100 93 105.5 76" stroke="#fff6dc" stroke-width="2.6" fill="none"/><path d="M100 78 V90" stroke="${SINDOOR}" stroke-width="2.6"/>`;
    case 'tripundra': return `<path d="M84 79 Q100 76 116 79 M84 83.5 Q100 80.5 116 83.5 M85 88 Q100 85 115 88" stroke="#f2ede2" stroke-width="2.2" fill="none"/><circle cx="100" cy="83.5" r="2.4" fill="${SINDOOR}"/>`;
    case 'sindoor': return `<path d="M97 79 Q100 72 103 79 L101.4 92 L98.6 92Z" fill="#ec4a1c" ${st(.8)}/>`;
    case 'bindi': return `<circle cx="100" cy="87" r="3.4" fill="${SINDOOR}" ${st(.6)}/>`;
    default: return '';
  }
}

function crown(P) {
  const c = P.crown;
  if (c === 'kirita' || c === 'kiritaS') {
    const t = c === 'kirita' ? 6 : 28;
    const gy = (t + 64) / 2 + 8;
    return `<path d="M66 64 L72 ${t + 22} L86 ${t + 30} L100 ${t} L114 ${t + 30} L128 ${t + 22} L134 64Z" fill="${GOLD}" ${st(1.8)}/>
    <path d="M78 64 L84 ${t + 40} L100 ${t + 18} L116 ${t + 40} L122 64" fill="none" stroke="${GOLD_D}" stroke-width="1.6"/>
    <circle cx="100" cy="${t + 34}" r="${c === 'kirita' ? 6 : 4.5}" fill="${RUBY}" stroke="${GOLD_L}" stroke-width="1.5"/>
    <circle cx="80" cy="${gy}" r="3" fill="${EMER}"/><circle cx="120" cy="${gy}" r="3" fill="${EMER}"/>
    <rect x="61" y="62" width="78" height="13" rx="3" fill="${GOLD}" ${st(1.6)}/>
    <path d="M64 68.5 H136" stroke="${PEARL}" stroke-width="3" stroke-dasharray="0.1 5" stroke-linecap="round"/>
    <circle cx="100" cy="68.5" r="4" fill="${RUBY}"/>
    <circle cx="100" cy="${t}" r="3.4" fill="${GOLD_L}" ${st(1)}/>
    <path d="M61 70 q-9 6 -6 18 M139 70 q9 6 6 18" stroke="${GOLD}" stroke-width="3" fill="none"/>`;
  }
  if (c === 'queen') return `<path d="M70 70 L74 46 L86 56 L100 36 L114 56 L126 46 L130 70Z" fill="${GOLD}" ${st(1.6)}/>
    <circle cx="100" cy="54" r="4" fill="${RUBY}"/><circle cx="86" cy="62" r="2.4" fill="${EMER}"/><circle cx="114" cy="62" r="2.4" fill="${EMER}"/>
    <path d="M68 71 Q100 64 132 71" stroke="${PEARL}" stroke-width="3.4" stroke-dasharray="0.1 5" stroke-linecap="round" fill="none"/>`;
  if (c === 'tiara') return `<path d="M68 74 Q100 54 132 74" stroke="${GOLD}" stroke-width="5" fill="none"/>
    <path d="M82 64 l3 -8 l3 8 M97 60 l3 -10 l3 10 M112 64 l3 -8 l3 8" fill="${GOLD}" ${st(1)}/>
    <path d="M100 58 V76" stroke="${GOLD}" stroke-width="1.6"/><circle cx="100" cy="79" r="3.8" fill="${RUBY}" stroke="${GOLD}" stroke-width="1.5"/>`;
  if (c === 'jata' || c === 'sage') {
    const big = c === 'sage';
    return `<ellipse cx="100" cy="${big ? 38 : 44}" rx="${big ? 26 : 21}" ry="${big ? 24 : 19}" fill="${P.hair}" ${st(1.6)}/>
    <path d="M${big ? 76 : 80} ${big ? 40 : 46} Q100 ${big ? 50 : 54} ${big ? 124 : 120} ${big ? 40 : 46} M${big ? 78 : 82} ${big ? 30 : 37} Q100 ${big ? 40 : 45} ${big ? 122 : 118} ${big ? 30 : 37} M88 ${big ? 18 : 28} Q100 ${big ? 26 : 34} 112 ${big ? 18 : 28}" stroke="${P.hairLine}" stroke-width="2" fill="none"/>
    ${P.rudraBand ? `<path d="M78 52 Q100 62 122 52" stroke="#6b3a1f" stroke-width="4" stroke-dasharray="0.1 6" stroke-linecap="round" fill="none"/>` : ''}`;
  }
  return '';
}

function hairBack(P) {
  if (P.wild) return `<path d="M60 90 Q20 120 30 200 Q50 170 54 210 Q66 180 80 214 L120 214 Q134 180 146 210 Q150 170 170 200 Q180 120 140 90Z" fill="${P.hair}" ${st(1.4)}/>`;
  if (P.female) return `<path d="M62 92 Q42 172 58 236 L142 236 Q158 172 138 92Z" fill="${P.hair}" ${st(1.4)}/>`;
  if (P.sageHair) return `<path d="M60 96 Q46 160 62 196 L80 190 Q68 140 70 104Z M140 96 Q154 160 138 196 L120 190 Q132 140 130 104Z" fill="${P.hair}" ${st(1.4)}/>`;
  return `<path d="M60 96 Q50 150 58 182 L78 180 Q66 140 70 104Z M140 96 Q150 150 142 182 L122 180 Q134 140 130 104Z" fill="${P.hair}" ${st(1.4)}/>`;
}

function hairFront(P) {
  if (P.female) {
    let s = `<path d="M63 108 Q55 60 100 54 Q145 60 137 108 Q132 80 112 70 Q104 67 100 72 Q96 67 88 70 Q68 80 63 108Z" fill="${P.hair}" ${st(1.4)}/>`;
    if (P.sindoor) s += `<path d="M100 56 V71" stroke="${SINDOOR}" stroke-width="2.6"/>`;
    if (P.flowers) s += `<path d="M58 80 Q60 56 76 46 M142 80 Q140 56 124 46" stroke="#fffdf5" stroke-width="5" stroke-dasharray="0.1 7" stroke-linecap="round" fill="none"/>`;
    return s;
  }
  let s = `<path d="M64 102 Q57 62 100 55 Q143 62 136 102 Q133 82 120 75 Q100 69 80 75 Q67 82 64 102Z" fill="${P.hair}" ${st(1.4)}/>`;
  if (P.sidelocks) s += `<path d="M62 84 q-12 10 -8 26 q4 10 10 4 M138 84 q12 10 8 26 q-4 10 -10 4" fill="${P.hair}" ${st(1.4)}/>`;
  else s += `<path d="M64 94 Q57 116 63 136 M136 94 Q143 116 137 136" stroke="${P.hair}" stroke-width="7" stroke-linecap="round" fill="none"/>`;
  return s;
}

function beard(P) {
  if (!P.beard) return '';
  if (P.beard === 'moustache') return `<path d="M80 128 Q92 120 100 126 Q108 120 120 128 Q130 130 136 118 Q134 137 118 133 Q108 129 100 130 Q92 129 82 133 Q66 137 64 118 Q70 130 80 128Z" fill="#120b08" ${st(1)}/>`;
  const c = P.beard === 'white' ? '#f4f1ea' : '#a8a299', e = P.beard === 'white' ? '#bdb6a8' : '#7a746b';
  return `<path d="M66 114 Q64 176 100 ${P.longBeard ? 214 : 196} Q136 176 134 114 Q128 142 113 140 Q100 147 87 140 Q72 142 66 114Z" fill="${c}" stroke="${e}" stroke-width="1.4"/>
  <path d="M82 154 Q86 176 94 192 M100 150 V200 M118 154 Q114 176 106 192" stroke="${e}" stroke-width="1.2" fill="none"/>
  <path d="M82 130 Q92 123 100 128 Q108 123 118 130 Q108 135 100 132 Q92 135 82 130Z" fill="${c}" stroke="${e}" stroke-width="1.2"/>`;
}

function earrings(P) {
  if (P.earring === 'kundala') return `<circle cx="62" cy="128" r="7.5" fill="none" stroke="${GOLD}" stroke-width="3.4"/><circle cx="138" cy="128" r="7.5" fill="none" stroke="${GOLD}" stroke-width="3.4"/><circle cx="62" cy="136" r="2.6" fill="${RUBY}"/><circle cx="138" cy="136" r="2.6" fill="${RUBY}"/>`;
  if (P.earring === 'jhumka') return `<path d="M58 120 H68 L72 134 H54Z M132 120 H142 L146 134 H128Z" fill="${GOLD}" ${st(1)}/><path d="M55 137 H71 M129 137 H145" stroke="${PEARL}" stroke-width="3" stroke-dasharray="0.1 4" stroke-linecap="round"/>`;
  if (P.earring === 'rudraksha') return `<circle cx="62" cy="124" r="4" fill="#6b3a1f"/><circle cx="138" cy="124" r="4" fill="#6b3a1f"/>`;
  return '';
}

function head(P) {
  let h = `<ellipse cx="64" cy="108" rx="7" ry="12" fill="${P.skin}" ${st(1.5)}/><ellipse cx="136" cy="108" rx="7" ry="12" fill="${P.skin}" ${st(1.5)}/>`;
  h += `<path d="M64 98 Q63 146 100 154 Q137 146 136 98 Q135 58 100 57 Q65 58 64 98Z" fill="${P.skin}" ${st(1.8)}/>`;
  h += `<path d="M69 118 Q74 144 100 151 Q126 144 131 118" stroke="${P.shade}" stroke-width="3" fill="none" opacity=".45"/>`;
  if (P.female) h += `<circle cx="78" cy="121" r="7" fill="#e86a6a" opacity=".22"/><circle cx="122" cy="121" r="7" fill="#e86a6a" opacity=".22"/>`;
  h += hairFront(P);
  h += eyes(P);
  h += `<path d="M100 101 Q96.5 116 98 121 Q101.5 123.5 106 120.5" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  h += mouth(P);
  if (P.old) h += `<path d="M78 80 Q100 76 122 80 M80 85 Q100 82 120 85" stroke="${P.shade}" stroke-width="1.3" fill="none"/>`;
  h += beard(P);
  h += tilak(P);
  if (P.bindi) h += tilak({ tilak: 'bindi' });
  if (P.fangs) h += `<path d="M90 134 L93 144 L96 135 Z M104 135 L107 144 L110 134 Z" fill="#fffaf0" ${st(1)}/>`;
  if (P.horns) h += `<path d="M74 66 Q60 40 66 18 Q76 42 86 60Z M126 66 Q140 40 134 18 Q124 42 114 60Z" fill="#e9dcc0" ${st(1.6)}/>`;
  h += crown(P);
  h += earrings(P);
  if (P.nath) h += `<circle cx="107" cy="124" r="5" fill="none" stroke="${GOLD}" stroke-width="1.6"/><path d="M111 122 Q126 114 136 116" stroke="${GOLD}" stroke-width=".9" fill="none"/>`;
  return h;
}

/* ---------- bodies ---------- */
function torso(P) {
  const t = P.torso;
  if (P.female) {
    let s = `<path d="M24 254 Q28 198 66 181 Q100 172 134 181 Q172 198 176 254Z" fill="${P.blouse}" ${st(1.8)}/>`;
    s += `<path d="M60 182 Q80 176 94 184 L158 254 L104 254 Q80 216 60 182Z" fill="${P.garment}" ${st(1.6)}/>`;
    if (P.garment2) s += `<path d="M94 184 L158 254" stroke="${P.garment2}" stroke-width="6"/><path d="M60 182 Q80 216 104 254" stroke="${P.garment2}" stroke-width="3"/>
      <path d="M90 204 l3 3 l-3 3 l-3 -3Z M108 222 l3 3 l-3 3 l-3 -3Z M96 232 l3 3 l-3 3 l-3 -3Z" fill="${P.garment2}"/>`;
    return s;
  }
  let s = `<path d="M12 254 Q16 194 62 177 Q100 168 138 177 Q184 194 188 254Z" fill="${t === 'robe' ? P.garment : P.skin}" ${st(1.8)}/>`;
  if (t === 'robe') {
    s += `<path d="M62 177 Q100 226 138 177 L128 175 Q100 208 72 175Z" fill="${P.garment2}" ${st(1.2)}/>
      <path d="M22 206 Q40 186 62 182 L66 200 Q42 204 30 222Z M178 206 Q160 186 138 182 L134 200 Q158 204 170 222Z" fill="${P.garment2}" ${st(1.2)}/>
      <path d="M40 236 l4 4 l-4 4 l-4 -4Z M70 226 l4 4 l-4 4 l-4 -4Z M130 226 l4 4 l-4 4 l-4 -4Z M160 236 l4 4 l-4 4 l-4 -4Z M100 240 l4 4 l-4 4 l-4 -4Z" fill="${P.garment2}"/>`;
    if (P.sash) s += `<path d="M46 184 Q60 176 72 179 Q110 226 158 254 L118 254 Q84 214 46 184Z" fill="${P.sash}" ${st(1.4)}/>`;
    return s;
  }
  s += `<path d="M100 200 Q96 222 100 242" stroke="${P.shade}" stroke-width="2" fill="none"/>
    <path d="M70 205 Q84 213 96 206 M104 206 Q116 213 130 205" stroke="${P.shade}" stroke-width="2" fill="none"/>`;
  if (P.thread) s += `<path d="M60 180 Q96 222 146 254" stroke="#fff7e6" stroke-width="2.4" fill="none"/>`;
  if (t === 'sage') {
    s += `<path d="M24 210 Q44 182 72 178 Q118 232 168 254 L16 254Z" fill="${P.garment}" ${st(1.6)}/>
      <path d="M72 178 Q118 232 168 254" stroke="${P.garment2}" stroke-width="3" fill="none"/>`;
  } else {
    s += `<path d="M46 184 Q60 176 72 179 Q110 226 158 254 L118 254 Q84 214 46 184Z" fill="${P.garment}" ${st(1.5)}/>`;
    if (t === 'bark') s += `<path d="M62 190 l10 6 M74 202 l12 6 M88 216 l12 7 M102 230 l14 8 M118 244 l10 6" stroke="#6b4422" stroke-width="2"/>`;
    else s += `<path d="M72 179 Q110 226 158 254" stroke="${P.garment2}" stroke-width="4" fill="none"/>`;
    s += `<path d="M24 214 Q38 203 54 210 M176 214 Q162 203 146 210" stroke="${t === 'bark' ? '#6b3a1f' : GOLD}" stroke-width="${t === 'bark' ? 4 : 6}" fill="none" stroke-linecap="round" ${t === 'bark' ? 'stroke-dasharray="0.1 6"' : ''}/>`;
  }
  return s;
}

function neck(P) {
  return `<path d="M85 138 L84 176 Q100 184 116 176 L115 138Z" fill="${P.skin}" ${st(1.5)}/><path d="M86 160 Q100 168 114 160" stroke="${P.shade}" stroke-width="1.6" fill="none"/>`;
}

function necklace(P) {
  const n = P.neck;
  if (n === 'gem' || n === 'gold') return `<path d="M76 176 Q100 200 124 176" stroke="${GOLD}" stroke-width="4" fill="none"/>
    <path d="M68 179 Q100 220 132 179" stroke="${PEARL}" stroke-width="3.6" stroke-dasharray="0.1 5.5" stroke-linecap="round" fill="none"/>
    <path d="M94 210 L100 202 L106 210 L100 220Z" fill="${n === 'gem' ? SAPPH : RUBY}" stroke="${GOLD}" stroke-width="2"/>
    ${P.vanamala ? `<path d="M56 182 Q100 268 144 182" stroke="#f2c14e" stroke-width="5" stroke-dasharray="0.1 8" stroke-linecap="round" fill="none"/><path d="M58 184 Q100 264 142 184" stroke="${EMER}" stroke-width="2" fill="none" stroke-dasharray="6 6"/>` : ''}`;
  if (n === 'rudraksha') return `<path d="M72 177 Q100 222 128 177" stroke="#6b3a1f" stroke-width="5.5" stroke-dasharray="0.1 6.5" stroke-linecap="round" fill="none"/>`;
  if (n === 'garland') return `<path d="M64 180 Q100 250 136 180" stroke="#fff7d6" stroke-width="8" stroke-dasharray="0.1 9" stroke-linecap="round" fill="none"/><path d="M64 180 Q100 250 136 180" stroke="#f0a020" stroke-width="5" stroke-dasharray="0.1 9" stroke-dashoffset="4.5" stroke-linecap="round" fill="none"/>`;
  return '';
}

/* front props */
const PROPS = {
  padukas: `<g transform="rotate(-8 100 220)"><rect x="66" y="190" width="28" height="62" rx="14" fill="#8a5a2b" ${st(1.6)}/><rect x="106" y="190" width="28" height="62" rx="14" fill="#8a5a2b" ${st(1.6)}/>
    <circle cx="80" cy="204" r="5" fill="${GOLD}" ${st(1)}/><circle cx="120" cy="204" r="5" fill="${GOLD}" ${st(1)}/>
    <path d="M70 230 H90 M110 230 H130" stroke="${GOLD}" stroke-width="2"/></g>`,
  manuscript: `<rect x="54" y="214" width="92" height="22" rx="5" fill="#d9b874" ${st(1.6)}/><path d="M60 221 H140 M60 228 H140" stroke="#8a6a32" stroke-width="1.2"/><circle cx="72" cy="225" r="2.4" fill="${INK}"/><circle cx="128" cy="225" r="2.4" fill="${INK}"/><path d="M72 225 Q100 246 128 225" stroke="${RUBY}" stroke-width="1.4" fill="none"/>`,
  basket: `<circle cx="84" cy="222" r="6" fill="#a3182a"/><circle cx="98" cy="218" r="6" fill="#c42a2a"/><circle cx="112" cy="222" r="6" fill="#a3182a"/><circle cx="92" cy="226" r="6" fill="#7a1020"/><circle cx="106" cy="227" r="6" fill="#c42a2a"/>
    <path d="M56 226 H144 Q138 254 100 254 Q62 254 56 226Z" fill="#9c6b30" ${st(1.6)}/><path d="M62 236 H138 M66 245 H134 M80 228 V252 M100 228 V254 M120 228 V252" stroke="#6b4a1f" stroke-width="1.4"/>`,
  namaste: `<path d="M88 254 L93 204 Q100 190 107 204 L112 254Z" fill="#a06a43" ${st(1.6)}/><path d="M100 196 V250" stroke="${INK}" stroke-width="1.2"/>`,
};

function person(o) {
  const P = Object.assign({
    skin: '#e8b88a', shade: '#c99668', hair: '#1a1110', hairLine: '#4a3020', brow: INK, iris: '#1b0f08', lip: '#a8323a',
    eyes: 'calm', mouth: 'smile', crown: 'none', tilak: 'none', torso: 'bare', garment: '#c0392b', garment2: GOLD,
    neck: 'gold', earring: 'kundala',
  }, o);
  let b = '';
  if (P.halo) b += halo();
  if (P.weapon === 'bow') b += bowBack();
  if (P.quiver) b += quiver();
  b += hairBack(P);
  b += torso(P);
  b += neck(P);
  b += necklace(P);
  b += head(P);
  if (P.ekaveni) b += `<path d="M137 112 Q150 168 140 238" stroke="${P.hair}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M137 112 Q150 168 140 238" stroke="${P.hairLine}" stroke-width="11" stroke-dasharray="2 7" fill="none"/>`;
  if (P.prop) b += PROPS[P.prop];
  return b;
}

/* ---------- vanaras & bears ---------- */
const VANARA_DEF = { fur: '#d4582a', furD: '#9c3a18', muzzle: '#f3b98c', crownT: 18, tail: true, gada: false, neck: 'gold', tilak: 'sindoor', kind: 'monkey' };
function vanaraHead(o) {
  const P = Object.assign({}, VANARA_DEF, o), bear = P.kind === 'bear';
  let b = '';
  if (bear) b += `<circle cx="70" cy="64" r="13" fill="${P.fur}" ${st(1.6)}/><circle cx="130" cy="64" r="13" fill="${P.fur}" ${st(1.6)}/><circle cx="70" cy="64" r="6" fill="${P.muzzle}"/><circle cx="130" cy="64" r="6" fill="${P.muzzle}"/>`;
  else b += `<circle cx="58" cy="104" r="13" fill="${P.fur}" ${st(1.6)}/><circle cx="142" cy="104" r="13" fill="${P.fur}" ${st(1.6)}/><circle cx="58" cy="104" r="6.5" fill="${P.muzzle}"/><circle cx="142" cy="104" r="6.5" fill="${P.muzzle}"/>`;
  b += `<path d="M62 100 Q60 150 100 158 Q140 150 138 100 Q136 56 100 56 Q64 56 62 100Z" fill="${P.fur}" ${st(1.8)}/>`;
  b += `<path d="M62 118 L50 128 L63 132 M138 118 L150 128 L137 132" fill="${P.fur}" ${st(1.4)}/>`;
  b += `<path d="M70 94 Q72 78 100 80 Q128 78 130 94 Q130 108 118 110 Q100 104 82 110 Q70 108 70 94Z" fill="${P.muzzle}" opacity=".55"/>`;
  // muzzle — Hanuman's slightly swollen left jaw recalls Indra's vajra (hanu = jaw)
  const jaw = P.jaw ? 'M72 114 Q64 156 100 160 Q130 154 126 114 Q114 104 100 110 Q86 104 72 114Z' : 'M74 114 Q70 154 100 158 Q130 154 126 114 Q114 104 100 110 Q86 104 74 114Z';
  b += `<path d="${jaw}" fill="${P.muzzle}" ${st(1.6)}/>`;
  b += `<path d="M93 118 Q100 113 107 118 Q100 125 93 118Z" fill="${INK}"/>`;
  b += P.eyes === 'fierce' ? `<path d="M84 140 Q100 132 116 140" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M88 139 l3 6 l3 -6 M106 139 l3 6 l3 -6" fill="#fff"/>`
    : `<path d="M84 136 Q100 146 116 136" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  b += eyes({ eyes: P.eyes || 'calm', iris: '#3a1a08', brow: P.furD, skin: P.fur, old: P.old, shade: P.furD });
  b += `<path d="M66 90 Q83 81 98 88 M134 90 Q117 81 102 88" stroke="${P.furD}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  if (P.whiteBrow) b += `<path d="M64 88 Q82 76 98 85 M136 88 Q118 76 102 85" stroke="#eee6d6" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M80 150 Q100 182 120 150 Q100 162 80 150Z" fill="#eee6d6"/>`;
  b += tilak({ tilak: P.tilak });
  if (P.crownT !== null) b += crown({ crown: P.crownT > 20 ? 'kiritaS' : 'kirita' });
  if (!bear) b += earrings({ earring: 'kundala' });
  return b;
}
function vanara(o) {
  const P = Object.assign({}, VANARA_DEF, o);
  const bear = P.kind === 'bear';
  let b = '';
  if (P.halo) b += halo(100, 104, 80);
  if (P.tail) b += `<path d="M46 254 Q2 214 26 162 Q44 124 28 94 Q22 78 36 70" stroke="${P.furD}" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M46 254 Q2 214 26 162 Q44 124 28 94 Q22 78 36 70" stroke="${P.fur}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  b += `<path d="M12 254 Q16 192 62 176 Q100 166 138 176 Q184 192 188 254Z" fill="${P.fur}" ${st(1.8)}/>`;
  b += `<path d="M66 192 Q100 270 134 192 Q100 206 66 192Z" fill="${P.muzzle}" opacity=".8"/>`;
  if (!bear) b += `<path d="M60 180 Q96 222 146 254" stroke="#fff7e6" stroke-width="2.4" fill="none"/>`;
  if (P.sash) b += `<path d="M46 184 Q60 176 72 179 Q110 226 158 254 L118 254 Q84 214 46 184Z" fill="${P.sash}" ${st(1.4)}/>`;
  if (P.gada) b += gada();
  b += `<path d="M82 136 L80 178 Q100 188 120 178 L118 136Z" fill="${P.fur}" ${st(1.5)}/>`;
  b += necklace({ neck: P.neck, vanamala: false });
  b += vanaraHead(P);
  return b;
}

/* ---------- Jatayu ---------- */
function jatayuArt() {
  let b = '';
  const wing = (m) => `<g ${m ? 'transform="translate(200 0) scale(-1 1)"' : ''}>
    <path d="M96 150 Q40 84 2 112 Q20 124 8 146 Q30 146 20 168 Q44 164 36 190 Q62 176 66 204 Q84 186 98 196Z" fill="#6b4423" ${st(1.8)}/>
    <path d="M90 156 Q50 120 14 120 M88 166 Q54 146 22 156 M88 176 Q62 166 34 178 M88 186 Q72 182 58 196" stroke="#3e2612" stroke-width="2" fill="none"/>
    <path d="M94 150 Q60 112 30 110" stroke="${GOLD}" stroke-width="2" fill="none" stroke-dasharray="4 4"/></g>`;
  b += wing(false) + wing(true);
  b += `<ellipse cx="100" cy="198" rx="38" ry="56" fill="#7d5230" ${st(1.8)}/>`;
  b += `<path d="M72 190 q8 8 16 0 q8 8 16 0 q8 8 16 0 M76 210 q8 8 16 0 q8 8 16 0 q8 8 16 0" stroke="#4a2e16" stroke-width="1.6" fill="none"/>`;
  b += `<ellipse cx="100" cy="142" rx="30" ry="18" fill="#efe6d6" ${st(1.6)}/>`;
  b += `<path d="M84 142 Q80 104 98 84 Q120 70 134 92 Q140 116 116 140Z" fill="#c98b6b" ${st(1.8)}/>`;
  b += `<path d="M102 86 Q74 80 68 104 Q74 112 80 104 Q88 98 98 100Z" fill="#e2b33a" ${st(1.6)}/>`;
  b += `<circle cx="112" cy="94" r="5.5" fill="${GOLD_L}" ${st(1.2)}/><circle cx="111" cy="94" r="2.6" fill="${INK}"/>`;
  b += `<path d="M104 86 Q110 82 120 86" stroke="${INK}" stroke-width="2.2" fill="none"/>`;
  b += `<g transform="translate(-6 10) rotate(-8 120 76)"><path d="M106 74 L108 52 L116 60 L122 46 L126 60 L134 54 L132 78Z" fill="${GOLD}" ${st(1.4)}/><circle cx="121" cy="66" r="3" fill="${RUBY}"/></g>`;
  b += `<path d="M86 160 Q100 172 114 160" stroke="${PEARL}" stroke-width="3" stroke-dasharray="0.1 5" stroke-linecap="round" fill="none"/>`;
  return b;
}

/* ---------- Golden deer ---------- */
function deerArt(real) {
  const body = real ? '#a0703c' : '#e8b923', light = real ? '#d9b48a' : '#fbe58a', leg = real ? '#7a522a' : '#c08f12';
  let b = '';
  b += `<path d="M84 140 L76 190 M98 142 L102 190 M158 140 L152 190 M174 138 L184 188" stroke="${leg}" stroke-width="7" stroke-linecap="round"/>`;
  b += `<path d="M72 186 h8 M98 186 h8 M148 186 h8 M180 184 h8" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  b += `<ellipse cx="128" cy="118" rx="62" ry="31" fill="${body}" ${st(1.8)}/>`;
  b += `<path d="M78 124 Q128 158 184 124 Q128 140 78 124Z" fill="${light}"/>`;
  b += `<path d="M188 104 q14 -8 10 6" fill="${body}" ${st(1.4)}/>`;
  b += `<path d="M86 104 L58 56 L80 48 L104 98Z" fill="${body}" ${st(1.6)}/>`;
  b += `<ellipse cx="54" cy="52" rx="22" ry="13" transform="rotate(-18 54 52)" fill="${body}" ${st(1.6)}/>`;
  b += `<ellipse cx="34" cy="60" rx="6" ry="5" fill="${INK}"/>`;
  b += `<path d="M66 40 l14 -12 l-4 16Z" fill="${body}" ${st(1.4)}/>`;
  b += `<circle cx="52" cy="47" r="3.4" fill="${INK}"/><circle cx="53" cy="46" r="1" fill="#fff"/>`;
  if (!real) {
    [[108, 108], [128, 100], [150, 108], [170, 116], [118, 124], [140, 120], [160, 128], [96, 118], [82, 82], [74, 66]].forEach(([x, y]) => {
      b += `<circle cx="${x}" cy="${y}" r="5" fill="#eef3f8" stroke="#9aa7b5" stroke-width="1.2"/>`;
    });
    b += `<path d="M58 38 L50 10 M53 22 L40 14 M51 12 L56 0 M64 36 L72 8 M69 20 L84 12 M72 8 L68 -2" stroke="${GOLD}" stroke-width="3.4" stroke-linecap="round"/>`;
    b += `<circle cx="40" cy="14" r="3.4" fill="${SAPPH}"/><circle cx="56" cy="0" r="3.4" fill="${RUBY}"/><circle cx="84" cy="12" r="3.4" fill="${SAPPH}"/><circle cx="68" cy="-2" r="3.4" fill="${EMER}"/><circle cx="50" cy="10" r="3" fill="${RUBY}"/><circle cx="72" cy="8" r="3" fill="${RUBY}"/>`;
  } else {
    b += `<path d="M58 38 L52 18 M54 26 L46 22 M64 36 L70 16 M68 24 L76 20" stroke="#5a3b1d" stroke-width="3" stroke-linecap="round"/>`;
  }
  return b;
}

/* ---------- Ravana: ten heads ---------- */
const RAVANA = {
  skin: '#a06a43', shade: '#7a4c2c', hair: '#120b08', brow: '#120b08', iris: '#7a0d0d', lip: '#6e1f1f',
  eyes: 'fierce', mouth: 'fierce', crown: 'kirita', tilak: 'tripundra', beard: 'moustache', earring: 'kundala',
  torso: 'robe', garment: '#5b0f17', garment2: GOLD, neck: 'gold',
};
const RAVANA_MOODS = [
  { eyes: 'fierce', mouth: 'fierce' }, { eyes: 'fierce', mouth: 'laugh' }, { eyes: 'stern', mouth: 'stern' },
  { eyes: 'fierce', mouth: 'laugh' }, { eyes: 'stern', mouth: 'fierce' },
];
// [x, y, scale] in portrait space (base head centre is 100,104)
const RAVANA_HEADS = [
  [-68, 74, .42], [268, 74, .42], [-36, 78, .5], [236, 78, .5], [2, 84, .58], [198, 84, .58], [44, 92, .66], [156, 92, .66], [100, -8, .42], [100, 104, 1],
];
function ravanaHead(i = 0) {
  return head(Object.assign({}, RAVANA, RAVANA_MOODS[i % RAVANA_MOODS.length]));
}
function ravanaArt() {
  let b = hairBack(RAVANA) + torso(RAVANA) + neck(RAVANA) + necklace(RAVANA);
  // the hilt of Chandrahasa over the shoulder
  b += `<path d="M150 254 L196 150" stroke="#cfd6dc" stroke-width="7"/><path d="M188 160 L208 170 M196 150 l8 -12" stroke="${GOLD}" stroke-width="6" stroke-linecap="round"/>`;
  RAVANA_HEADS.forEach(([x, y, s], i) => {
    b += i === 9 ? head(RAVANA) : `<g transform="translate(${x - 100 * s} ${y - 104 * s}) scale(${s})">${ravanaHead(i)}</g>`;
  });
  return b;
}

/* ---------- Character looks ---------- */
const RAMA_BASE = { skin: '#4a78b5', shade: '#2f5790', eyes: 'serene', mouth: 'smile', crown: 'kirita', tilak: 'vaishnava', thread: true, garment: '#f2b705', garment2: '#c0392b', neck: 'gem', vanamala: true, halo: true, weapon: 'bow', quiver: true };
const LAKSH_BASE = { skin: '#e9bd8b', shade: '#c9955f', eyes: 'stern', mouth: 'stern', crown: 'kiritaS', tilak: 'vaishnava', thread: true, garment: '#2e7d4f', garment2: GOLD, weapon: 'bow', quiver: true };
const LOOKS = {
  rama: RAMA_BASE,
  rama_young: { ...RAMA_BASE, crown: 'none', sidelocks: true, quiver: true },
  rama_exile: { ...RAMA_BASE, crown: 'jata', torso: 'bark', garment: '#a8743c', neck: 'rudraksha', vanamala: false, earring: 'rudraksha' },
  lakshmana: LAKSH_BASE,
  lakshmana_young: { ...LAKSH_BASE, crown: 'none', sidelocks: true },
  lakshmana_exile: { ...LAKSH_BASE, crown: 'jata', torso: 'bark', garment: '#94683a', neck: 'rudraksha', earring: 'rudraksha' },
  sita: { female: true, skin: '#f2cba4', shade: '#d9a67a', hair: '#1a1110', eyes: 'calm', crown: 'tiara', garment: '#b3202a', garment2: GOLD, blouse: '#1f7a4a', earring: 'jhumka', neck: 'gold', halo: true, bindi: true, sindoor: true, nath: true, flowers: true },
  sita_vatika: { female: true, skin: '#eec39b', shade: '#d09d72', hair: '#1a1110', eyes: 'sad', mouth: 'sad', garment: '#cfae5a', garment2: null, blouse: '#b89a4e', earring: 'none', neck: 'none', halo: true, sindoor: true, ekaveni: true },
  dasharatha: { skin: '#eab48a', shade: '#c48a5e', hair: '#d8d2c8', old: true, beard: 'white', crown: 'kirita', torso: 'robe', garment: '#8e1b2a', eyes: 'sad', mouth: 'sad', tilak: 'vaishnava' },
  kaikeyi: { female: true, skin: '#efc39a', shade: '#cf9a6c', eyes: 'stern', mouth: 'stern', crown: 'queen', garment: '#5b2a7a', garment2: GOLD, blouse: '#c9a227', earring: 'jhumka', neck: 'gold', bindi: true, sindoor: true, nath: true },
  bharata: { skin: '#557fb2', shade: '#3a6294', eyes: 'sad', mouth: 'stern', crown: 'jata', torso: 'bark', garment: '#9a6a38', neck: 'rudraksha', earring: 'rudraksha', tilak: 'vaishnava', thread: true, prop: 'padukas' },
  vishwamitra: { skin: '#c98c5a', shade: '#a06a3c', hair: '#e8e2d6', hairLine: '#a8a092', old: true, beard: 'white', crown: 'sage', sageHair: true, rudraBand: true, eyes: 'stern', mouth: 'stern', tilak: 'tripundra', torso: 'sage', garment: '#d9731f', garment2: '#9c3d10', neck: 'rudraksha', earring: 'rudraksha', thread: true },
  valmiki: { skin: '#b9814f', shade: '#94643a', hair: '#f1ede4', hairLine: '#b8b0a2', old: true, beard: 'white', longBeard: true, crown: 'sage', sageHair: true, eyes: 'serene', mouth: 'smile', tilak: 'vaishnava', torso: 'sage', garment: '#f1ead8', garment2: '#c9a227', neck: 'rudraksha', earring: 'rudraksha', thread: true, prop: 'manuscript' },
  janaka: { skin: '#e3ae80', shade: '#bf8a5a', hair: '#8f8a82', old: true, beard: 'grey', crown: 'kirita', torso: 'robe', garment: '#efe6d0', garment2: GOLD, eyes: 'calm', tilak: 'tripundra', neck: 'rudraksha' },
  shabari: { female: true, skin: '#a8724a', shade: '#86552f', hair: '#cfc8bb', hairLine: '#8f877a', old: true, crown: 'sage', eyes: 'serene', mouth: 'smile', garment: '#d8c08a', garment2: null, blouse: '#c4a970', earring: 'rudraksha', neck: 'rudraksha', tilak: 'vaishnava', prop: 'basket' },
  vibhishana: { skin: '#a06a43', shade: '#7a4c2c', iris: '#3a1a08', eyes: 'calm', mouth: 'smile', crown: 'kiritaS', tilak: 'vaishnava', beard: null, torso: 'robe', garment: '#ece3cf', garment2: GOLD, sash: '#e8891c', neck: 'gold', prop: 'namaste' },
};

/* villains & warriors for the action stages */
Object.assign(LOOKS, {
  rakA: { skin: '#6a5a8a', shade: '#4a3a6a', hair: '#120b08', iris: '#8a0d0d', eyes: 'fierce', mouth: 'fierce', fangs: true, horns: true, earring: 'kundala' },
  rakB: { skin: '#5a7a5a', shade: '#3a5a3a', hair: '#2a1208', iris: '#8a0d0d', eyes: 'fierce', mouth: 'laugh', fangs: true, horns: true, beard: 'moustache', earring: 'kundala' },
  rakC: { skin: '#8a5a4a', shade: '#6a3a2a', hair: '#120b08', iris: '#8a0d0d', eyes: 'stern', mouth: 'fierce', fangs: true, earring: 'kundala', crown: 'jata' },
  tataka: { female: true, wild: true, blouse: '#2a1a2a', garment: '#3a1a2a', garment2: '#8a6212', neck: 'none', skin: '#5a4a6a', shade: '#3a2a4a', hair: '#1a1018', iris: '#c01818', eyes: 'fierce', mouth: 'laugh', fangs: true, earring: 'kundala' },
  subahu: { skin: '#7a3a4a', shade: '#5a1a2a', iris: '#c01818', eyes: 'fierce', mouth: 'fierce', fangs: true, horns: true, crown: 'kiritaS', beard: 'moustache' },
  khara: { torso: 'robe', garment: '#5b0f17', skin: '#7a5a3a', shade: '#5a3a1a', iris: '#8a0d0d', eyes: 'fierce', mouth: 'stern', crown: 'kiritaS', beard: 'moustache', tilak: 'tripundra', fangs: true },
  akshaya: { torso: 'robe', garment: '#5b0f17', skin: '#a06a43', shade: '#7a4c2c', iris: '#5a0d0d', eyes: 'stern', mouth: 'stern', crown: 'kiritaS', tilak: 'tripundra' },
  kumbha: { torso: 'robe', garment: '#3a1a10', skin: '#6a4a3a', shade: '#4a2a1a', iris: '#5a0d0d', eyes: 'sad', mouth: 'laugh', crown: 'kirita', beard: 'moustache', fangs: true, tilak: 'tripundra' },
});
const VANARA_LOOKS = {
  hanuman: { jaw: true },
  sugriva: { fur: '#b07a3a', furD: '#7a5222', muzzle: '#e9c89a', crownT: 30, eyes: 'stern' },
  // Vali wore the golden chain given by his father Indra
  vali: { fur: '#c9962a', furD: '#8a6212', muzzle: '#f0d9a6', crownT: 6, eyes: 'fierce' },
};

/* head-only sprites for the animated figures (neck point ≈ 100,150) */
const HeadArt = {
  svg(key) {
    if (key === 'ravana') return svgWrap('-95 -60 390 236', RAVANA_HEADS.map(([x, y, s], i) => i === 9 ? head(RAVANA) : `<g transform="translate(${x - 100 * s} ${y - 104 * s}) scale(${s})">${ravanaHead(i)}</g>`).join(''), 'xMidYMid meet');
    if (VANARA_LOOKS[key]) return svgWrap('36 -6 128 196', vanaraHead(VANARA_LOOKS[key]), 'xMidYMid meet');
    const P = Object.assign({
      skin: '#e8b88a', shade: '#c99668', hair: '#1a1110', hairLine: '#4a3020', brow: INK, iris: '#1b0f08', lip: '#a8323a',
      eyes: 'calm', mouth: 'smile', crown: 'none', tilak: 'none', earring: 'kundala',
    }, LOOKS[key]);
    return svgWrap('36 -6 128 196', hairBack(P) + head(P), 'xMidYMid meet');
  },
};

const Portrait = {
  cache: {},
  wide: { ravana: true },
  svg(key) {
    if (this.cache[key]) return this.cache[key];
    let body, vb = '0 0 200 254';
    if (key === 'ravana') { body = ravanaArt(); vb = '-95 -55 390 309'; }
    else if (key === 'hanuman') body = vanara({ gada: true, jaw: true, halo: false, sash: '#e8891c' });
    else if (key === 'sugriva') body = vanara({ fur: '#b07a3a', furD: '#7a5222', muzzle: '#e9c89a', neck: 'garland', crownT: 30, eyes: 'stern' });
    else if (key === 'vali') body = vanara(Object.assign({ neck: 'gold' }, VANARA_LOOKS.vali));
    else if (key === 'jambavan') body = vanara({ kind: 'bear', fur: '#3e302a', furD: '#1e1612', muzzle: '#9a8a78', tail: false, crownT: null, neck: 'rudraksha', whiteBrow: true, old: true, tilak: 'tripundra', eyes: 'serene' });
    else if (key === 'jatayu') body = jatayuArt();
    else if (key === 'deer') { body = deerArt(false); vb = '0 -10 240 210'; }
    else body = person(LOOKS[key] || LOOKS.rama);
    return (this.cache[key] = svgWrap(vb, body));
  },
};

/* small helpers for sprites used on canvas */
const Sprites = {
  ravanaHead: i => svgWrap('50 -4 100 162', ravanaHead(i), 'xMidYMid meet'),
  deer: real => svgWrap('0 -10 240 210', deerArt(real), 'xMidYMid meet'),
  hanumanFly() {
    const fur = '#d4582a', furD = '#9c3a18', muz = '#f3b98c';
    return svgWrap('0 0 270 150', `
      <path d="M96 76 Q48 40 34 14 Q30 2 44 6" stroke="${furD}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M96 76 Q48 40 34 14 Q30 2 44 6" stroke="${fur}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M118 64 L82 40" stroke="${furD}" stroke-width="11" stroke-linecap="round"/>
      <path d="M84 40 L40 26" stroke="#a87423" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="30" cy="22" rx="16" ry="20" transform="rotate(-70 30 22)" fill="${GOLD}" ${st(1.6)}/>
      <path d="M106 82 L44 96 M110 88 L52 118" stroke="${furD}" stroke-width="13" stroke-linecap="round"/>
      <path d="M106 82 L44 96 M110 88 L52 118" stroke="${fur}" stroke-width="9" stroke-linecap="round"/>
      <ellipse cx="146" cy="74" rx="54" ry="22" transform="rotate(-8 146 74)" fill="${fur}" ${st(1.8)}/>
      <path d="M128 86 Q90 104 30 128 Q70 110 86 128 Q110 104 140 92Z" fill="#e8891c" ${st(1.4)}/>
      <path d="M118 82 Q140 92 170 84" stroke="#c0392b" stroke-width="5" fill="none"/>
      <ellipse cx="160" cy="80" rx="22" ry="10" fill="${muz}" opacity=".7"/>
      <path d="M180 64 L240 70" stroke="${furD}" stroke-width="12" stroke-linecap="round"/>
      <path d="M180 64 L240 70" stroke="${fur}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="244" cy="70" r="9" fill="${fur}" ${st(1.6)}/>
      <path d="M176 60 Q196 64 206 52" stroke="${GOLD}" stroke-width="3" fill="none"/>
      <circle cx="190" cy="54" r="7" fill="${fur}" ${st(1.4)}/><circle cx="190" cy="54" r="3.4" fill="${muz}"/>
      <circle cx="206" cy="46" r="21" fill="${fur}" ${st(1.8)}/>
      <ellipse cx="220" cy="54" rx="13" ry="11" fill="${muz}" ${st(1.4)}/>
      <circle cx="228" cy="50" r="2.2" fill="${INK}"/>
      <path d="M216 60 Q224 64 230 60" stroke="${INK}" stroke-width="1.6" fill="none"/>
      <path d="M204 38 Q210 34 216 39 Q210 44 204 38Z" fill="${PEARL}" ${st(1.2)}/><circle cx="211" cy="39" r="2.4" fill="${INK}"/>
      <path d="M200 30 Q210 24 220 30" stroke="${furD}" stroke-width="3" fill="none"/>
      <path d="M210 26 L212 36" stroke="#ec4a1c" stroke-width="3"/>
      <path d="M188 32 L192 8 L200 18 L206 2 L212 18 L220 10 L222 30Z" fill="${GOLD}" ${st(1.4)}/>
      <circle cx="206" cy="20" r="3" fill="${RUBY}"/>
      <circle cx="196" cy="62" r="5" fill="none" stroke="${GOLD}" stroke-width="2.6"/>`, 'xMidYMid meet');
  },
  pushpaka() {
    return svgWrap('0 0 340 190', `
      <ellipse cx="170" cy="170" rx="150" ry="14" fill="#fff" opacity=".35"/>
      <path d="M30 120 Q170 186 310 120 L296 140 Q170 196 44 140Z" fill="${GOLD}" ${st(2)}/>
      <path d="M40 128 Q170 180 300 128" stroke="${RUBY}" stroke-width="4" fill="none"/>
      <path d="M300 122 Q326 92 316 66 Q330 60 334 72 Q338 100 312 132Z" fill="#fffaf0" ${st(1.8)}/>
      <path d="M330 68 l10 4 l-10 4Z" fill="#e2b33a" ${st(1)}/><circle cx="326" cy="70" r="1.8" fill="${INK}"/>
      <path d="M40 122 Q14 92 24 66 Q10 60 6 72 Q2 100 28 132Z" fill="#fffaf0" ${st(1.8)}/>
      <path d="M10 68 l-10 4 l10 4Z" fill="#e2b33a" ${st(1)}/><circle cx="14" cy="70" r="1.8" fill="${INK}"/>
      <rect x="86" y="70" width="168" height="56" fill="#f3e2c0" ${st(1.8)}/>
      <path d="M96 126 V84 Q108 70 120 84 V126 M134 126 V84 Q146 70 158 84 V126 M182 126 V84 Q194 70 206 84 V126 M220 126 V84 Q232 70 244 84 V126" fill="#6a2a1a" ${st(1.2)}/>
      <path d="M78 70 H262 L250 58 H90Z" fill="${RUBY}" ${st(1.6)}/>
      <path d="M118 58 Q120 18 170 6 Q220 18 222 58Z" fill="${GOLD}" ${st(1.8)}/>
      <path d="M140 58 Q142 30 170 18 Q198 30 200 58" stroke="${GOLD_D}" stroke-width="2" fill="none"/>
      <path d="M170 6 V-2" stroke="${GOLD}" stroke-width="3"/>
      <path d="M90 58 Q92 38 106 32 Q120 38 122 58Z M218 58 Q220 38 234 32 Q248 38 250 58Z" fill="${GOLD}" ${st(1.4)}/>
      <path d="M106 32 V12 L126 18 L106 24 M234 32 V12 L254 18 L234 24" fill="#e8891c" stroke="${INK}" stroke-width="1.4"/>
      <path d="M60 130 l4 -6 M100 140 l4 -6 M140 146 l4 -6 M200 146 l4 -6 M240 140 l4 -6 M280 130 l4 -6" stroke="${PEARL}" stroke-width="3" stroke-linecap="round"/>`, 'xMidYMid meet');
  },
};

/* =========================================================
   SCENES — 1600×900 backdrops
   ========================================================= */
function tree(x, y, s = 1, c1 = '#2f5d2a', c2 = '#4f8a3a') {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-10 0 Q-8 -60 -4 -112 L6 -112 Q10 -60 12 0Z" fill="#5a3a1e" ${st(2)}/>
    <circle cx="-56" cy="-118" r="46" fill="${c1}" ${st(2)}/><circle cx="56" cy="-118" r="46" fill="${c1}" ${st(2)}/>
    <circle cx="0" cy="-160" r="72" fill="${c1}" ${st(2)}/>
    <circle cx="-26" cy="-188" r="40" fill="${c2}"/><circle cx="32" cy="-150" r="34" fill="${c2}"/>
    <circle cx="0" cy="-160" r="52" fill="none" stroke="${c2}" stroke-width="7" stroke-dasharray="1 12" stroke-linecap="round"/>
    <circle cx="-56" cy="-118" r="30" fill="none" stroke="${c2}" stroke-width="6" stroke-dasharray="1 10" stroke-linecap="round"/>
    <circle cx="56" cy="-118" r="30" fill="none" stroke="${c2}" stroke-width="6" stroke-dasharray="1 10" stroke-linecap="round"/></g>`;
}
function ashokaTree(x, y, s = 1) {
  return tree(x, y, s, '#2d5a2c', '#3f7a38') + `<g transform="translate(${x} ${y}) scale(${s})">
    ${[[-40, -150], [20, -190], [50, -120], [-70, -110], [0, -130], [30, -160], [-20, -200], [70, -140]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="7" fill="#f05a28"/><circle cx="${a + 6}" cy="${b + 5}" r="5" fill="#f2a12b"/>`).join('')}</g>`;
}
function banana(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 0 L-4 -120 L6 -120 L8 0Z" fill="#6b8a3a" ${st(1.6)}/>
  <path d="M0 -118 Q-80 -150 -110 -100 Q-60 -110 0 -110Z M0 -118 Q80 -160 110 -96 Q60 -110 0 -110Z M0 -120 Q-30 -200 -70 -210 Q-20 -160 0 -116Z M0 -120 Q40 -200 76 -200 Q30 -160 0 -116Z" fill="#5e9a3a" ${st(1.6)}/></g>`;
}
function mountains(y, c, pts, op = 1) {
  return `<path d="M0 ${y} ${pts} L1600 ${y} L1600 900 L0 900Z" fill="${c}" opacity="${op}" ${st(1.5)}/>`;
}
function water(y, c1, c2, h = 900) {
  let w = `<rect x="0" y="${y}" width="1600" height="${h - y}" fill="${c1}"/>`;
  for (let r = 0; r < 7; r++) {
    const yy = y + 18 + r * ((h - y) / 7);
    let d = `M${(r % 2) * -40} ${yy}`;
    for (let x = 0; x < 1700; x += 80) d += ` q20 -12 40 0 t40 0`;
    w += `<path d="${d}" stroke="${c2}" stroke-width="3" fill="none" opacity=".7"/>`;
  }
  return w;
}
function lotus(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="6" rx="30" ry="7" fill="#2f6b3a"/>
  <path d="M0 0 Q-10 -20 0 -34 Q10 -20 0 0Z M0 0 Q-24 -12 -26 -26 Q-8 -20 0 0Z M0 0 Q24 -12 26 -26 Q8 -20 0 0Z" fill="#f2a3b5" ${st(1.2)}/></g>`;
}
function dome(x, y, w, h, c = '#f0c24a') {
  return `<path d="M${x - w / 2} ${y} Q${x - w / 2 - w * .1} ${y - h * .5} ${x} ${y - h} Q${x + w / 2 + w * .1} ${y - h * .5} ${x + w / 2} ${y}Z" fill="${c}" ${st(2)}/>
  <path d="M${x} ${y - h} V${y - h - 22}" stroke="${GOLD}" stroke-width="4"/><circle cx="${x}" cy="${y - h - 24}" r="5" fill="${GOLD}" ${st(1)}/>`;
}
function arches(x, y, w, h, n, wall = '#f3e2c0', hole = '#7a2a1a') {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${wall}" ${st(2)}/>`;
  const aw = w / n;
  for (let i = 0; i < n; i++) {
    const ax = x + i * aw + aw * .18, ww = aw * .64;
    s += `<path d="M${ax} ${y + h} V${y + h * .42} Q${ax + ww / 2} ${y + h * .08} ${ax + ww} ${y + h * .42} V${y + h}Z" fill="${hole}" ${st(1.4)}/>`;
  }
  return s;
}
function flag(x, y, c = '#e8891c') {
  return `<path d="M${x} ${y} V${y - 70}" stroke="${INK}" stroke-width="3"/><path d="M${x} ${y - 70} L${x + 46} ${y - 58} L${x} ${y - 44}Z" fill="${c}" ${st(1.4)}/>`;
}
function palace(cx, base, s = 1, lit = false) {
  const wall = lit ? '#4a3a5a' : '#f3e2c0', hole = lit ? '#f2b84a' : '#7a2a1a', d = lit ? '#8a6a3a' : '#f0c24a';
  return `<g transform="translate(${cx} ${base}) scale(${s})">
    ${arches(-420, -150, 840, 150, 9, wall, hole)}
    <rect x="-440" y="-170" width="880" height="22" fill="${lit ? '#3a2a4a' : '#d9b77a'}" ${st(2)}/>
    ${arches(-260, -320, 520, 150, 5, wall, hole)}
    <rect x="-280" y="-338" width="560" height="20" fill="${lit ? '#3a2a4a' : '#d9b77a'}" ${st(2)}/>
    ${dome(0, -338, 220, 170, d)} ${dome(-200, -338, 90, 80, d)} ${dome(200, -338, 90, 80, d)}
    ${dome(-380, -170, 80, 70, d)} ${dome(380, -170, 80, 70, d)}
    ${flag(0, -530, '#e8891c')} ${flag(-200, -440, '#c0392b')} ${flag(200, -440, '#c0392b')}
    <circle cx="0" cy="-420" r="22" fill="${lit ? '#f2b84a' : '#e8891c'}" ${st(1.6)}/>
    <path d="M0 -436 V-404 M-16 -420 H16 M-11 -431 L11 -409 M11 -431 L-11 -409" stroke="${GOLD_L}" stroke-width="2"/></g>`;
}
function hut(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-90" y="-90" width="180" height="90" fill="#c9a26a" ${st(2)}/>
    <path d="M-90 -80 v80 M-60 -86 v86 M-30 -88 v88 M30 -88 v88 M60 -86 v86 M90 -80 v80" stroke="#8a6a3a" stroke-width="2"/>
    <path d="M-34 0 V-60 Q0 -84 34 -60 V0Z" fill="#3e2612" ${st(1.6)}/>
    <path d="M-130 -80 L0 -190 L130 -80Z" fill="#a8843a" ${st(2)}/>
    <path d="M-110 -96 L0 -180 M-70 -96 L0 -170 M110 -96 L0 -180 M70 -96 L0 -170 M-120 -86 H120" stroke="#6b5222" stroke-width="2"/></g>`;
}
function fire(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-70 0 L-54 -40 H54 L70 0Z" fill="#9a4a2a" ${st(2)}/><path d="M-62 -14 H62 M-58 -27 H58" stroke="#6a2a14" stroke-width="2"/>
    <path d="M-40 -40 Q-50 -100 -10 -150 Q-14 -100 10 -90 Q6 -130 30 -160 Q60 -100 40 -40Z" fill="#e8891c" ${st(1.6)}/>
    <path d="M-20 -40 Q-26 -80 0 -110 Q4 -80 20 -70 Q24 -60 20 -40Z" fill="#f6d77e"/></g>`;
}
function sunMandala(x, y, r, c = '#f2a12b') {
  let rays = '';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, a2 = a + Math.PI / 24;
    rays += `M${x + Math.cos(a) * r} ${y + Math.sin(a) * r} L${x + Math.cos(a2) * r * 1.35} ${y + Math.sin(a2) * r * 1.35} L${x + Math.cos(a + Math.PI / 12) * r} ${y + Math.sin(a + Math.PI / 12) * r}Z `;
  }
  return `<path d="${rays}" fill="${c}" opacity=".85"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>
  <circle cx="${x}" cy="${y}" r="${r * .82}" fill="none" stroke="${GOLD_L}" stroke-width="3" stroke-dasharray="6 6"/>
  <circle cx="${x}" cy="${y}" r="${r * .6}" fill="#f6c34a"/>`;
}
function grad(id, c1, c2, c3) {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/>${c3 ? `<stop offset=".6" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/>` : `<stop offset="1" stop-color="${c2}"/>`}</linearGradient></defs>`;
}
function stars(n, seed = 1) {
  let s = '', r = seed;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) s += `<circle cx="${rnd() * 1600}" cy="${rnd() * 420}" r="${rnd() * 2 + .6}" fill="#fff6d8" opacity="${.4 + rnd() * .6}"/>`;
  return s;
}
function border() {
  return `<rect x="8" y="8" width="1584" height="884" fill="none" stroke="${GOLD}" stroke-width="6"/><rect x="20" y="20" width="1560" height="860" fill="none" stroke="#b8321f" stroke-width="3"/>`;
}

const SCENES = {
  title: () => grad('gT', '#1d2457', '#7a2a4a', '#e8891c') + `<rect width="1600" height="900" fill="url(#gT)"/>${stars(80, 3)}
    ${sunMandala(800, 330, 150, '#f2a12b')}
    ${mountains(700, '#3a1f3a', 'L200 560 L380 640 L560 520 L760 640 L980 500 L1180 620 L1400 540 L1600 610', .95)}
    ${mountains(780, '#24142a', 'L160 700 L420 740 L700 680 L1000 750 L1300 690 L1600 740')}
    ${water(800, '#1d2457', '#3a4a8a')}${border()}`,
  ayodhya: () => grad('gA', '#f7c98a', '#fbe7c0') + `<rect width="1600" height="900" fill="url(#gA)"/>
    ${sunMandala(1300, 170, 70, '#f2a12b')}
    ${mountains(560, '#d9a86a', 'L180 470 L400 520 L640 440 L900 520 L1200 450 L1600 520', .6)}
    ${palace(800, 640, 1)}
    ${tree(110, 660, .9)}${tree(1490, 660, .9)}${banana(280, 660, .9)}${banana(1330, 660, .9)}
    <rect x="0" y="640" width="1600" height="40" fill="#c9a26a" ${st(2)}/>
    ${water(680, '#3f7fa6', '#9fd0e0')}${lotus(240, 790)}${lotus(1360, 820)}${lotus(700, 860, .8)}${border()}`,
  ashram: () => grad('gS', '#cfe6c2', '#f4ecd0') + `<rect width="1600" height="900" fill="url(#gS)"/>
    ${mountains(520, '#9cbf8a', 'L200 420 L460 480 L760 380 L1060 470 L1360 400 L1600 470', .7)}
    ${tree(140, 680, 1.2)}${tree(420, 650, .9, '#3a6a30', '#5a9a44')}${tree(1460, 690, 1.3)}${tree(1180, 640, .85, '#3a6a30', '#5a9a44')}
    ${hut(300, 700, .9)}
    <rect x="0" y="690" width="1600" height="210" fill="#b49a5e" ${st(2)}/>
    <path d="M0 720 Q400 700 800 730 T1600 715" stroke="#8a7240" stroke-width="3" fill="none"/>
    ${border()}`,
  mithila: () => `<rect width="1600" height="900" fill="#5a1d1a"/>
    <path d="M0 0 H1600 V90 Q800 160 0 90Z" fill="#8e1b2a" ${st(2)}/>
    ${[160, 480, 800, 1120, 1440].map(x => `<rect x="${x - 40}" y="100" width="80" height="600" fill="#e8d2a4" ${st(2)}/><rect x="${x - 56}" y="90" width="112" height="30" fill="${GOLD}" ${st(2)}/><rect x="${x - 56}" y="680" width="112" height="30" fill="${GOLD}" ${st(2)}/><path d="M${x} 130 V670" stroke="#c9a26a" stroke-width="6" stroke-dasharray="20 14"/>`).join('')}
    ${[320, 640, 960, 1280].map(x => `<path d="M${x - 120} 120 Q${x} 10 ${x + 120} 120" fill="none" stroke="${GOLD}" stroke-width="8"/>`).join('')}
    <rect x="0" y="700" width="1600" height="200" fill="#c9a26a" ${st(2)}/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${i * 200} 700 L${i * 200 + 100} 900" stroke="#a8843a" stroke-width="3"/>`).join('')}
    <rect x="460" y="620" width="680" height="80" fill="#6a6a72" ${st(2)}/><path d="M480 640 H1120" stroke="#9a9aa2" stroke-width="4"/>
    ${border()}`,
  forest: () => grad('gF', '#a7cf9a', '#e9eec8') + `<rect width="1600" height="900" fill="url(#gF)"/>
    ${mountains(500, '#7fa874', 'L240 400 L520 470 L820 360 L1120 450 L1400 380 L1600 440', .7)}
    ${tree(120, 690, 1.3)}${tree(380, 640, 1.0, '#264d24', '#3f7a38')}${tree(640, 600, .8)}${tree(1000, 610, .85, '#264d24', '#3f7a38')}${tree(1460, 700, 1.35)}
    ${hut(1180, 700, .95)}
    <rect x="0" y="690" width="1600" height="110" fill="#8aa258" ${st(2)}/>
    ${water(790, '#4f8fa8', '#a6d6e0')}${lotus(300, 860, .8)}${lotus(1200, 850, .8)}
    ${banana(860, 700, .8)}${border()}`,
  kishkindha: () => grad('gK', '#f3c58a', '#f7e6c4') + `<rect width="1600" height="900" fill="url(#gK)"/>
    ${mountains(620, '#b5713a', 'L120 360 L260 300 L420 420 L560 330 L700 470 L900 380 L1060 300 L1220 440 L1400 340 L1600 420')}
    ${[[260, 470, 50], [1060, 440, 44], [620, 540, 36]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .7}" fill="#3e2014" ${st(2)}/>`).join('')}
    ${[[160, 600, 70], [380, 580, 50], [1300, 600, 80], [980, 610, 56]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .6}" fill="#9a5a2a" ${st(2)}/>`).join('')}
    ${tree(80, 700, .8, '#3a6a30', '#5a9a44')}${tree(1500, 700, .9, '#3a6a30', '#5a9a44')}
    <rect x="0" y="640" width="1600" height="120" fill="#a8885a" ${st(2)}/>
    ${water(740, '#3a8aa0', '#9ad2dc')}${lotus(300, 830)}${lotus(560, 800, .8)}${lotus(1100, 840)}${lotus(1400, 800, .7)}${border()}`,
  ocean: () => grad('gO', '#9ad2e8', '#e9f4f0') + `<rect width="1600" height="900" fill="url(#gO)"/>
    ${sunMandala(260, 180, 60, '#f2c14e')}
    <path d="M1180 440 Q1300 330 1440 400 Q1520 380 1600 420 V460 H1180Z" fill="#5a7a4a" opacity=".8" ${st(1.5)}/>
    ${[1290, 1340, 1400, 1460].map((x, i) => `<path d="M${x - 14} 410 L${x - 10} ${370 - i * 8} L${x} ${350 - i * 8} L${x + 10} ${370 - i * 8} L${x + 14} 410Z" fill="${GOLD}" opacity=".85"/>`).join('')}
    ${water(440, '#2a6e9a', '#8fc7e0')}
    <path d="M0 760 Q300 720 600 780 T1600 760 V900 H0Z" fill="#e6cf98" ${st(2)}/>
    ${border()}`,
  lanka: () => grad('gL', '#0e1240', '#3a1e5a', '#6a2a4a') + `<rect width="1600" height="900" fill="url(#gL)"/>${stars(120, 7)}
    <path d="M1320 120 a60 60 0 1 0 50 90 a48 48 0 1 1 -50 -90Z" fill="#fff3c4"/>
    ${[180, 380, 600, 820, 1040, 1260, 1460].map((x, i) => { const h = 260 + (i % 3) * 90; return `<path d="M${x - 70} 600 L${x - 50} ${600 - h * .5} L${x - 30} ${600 - h * .5} L${x - 20} ${600 - h * .8} L${x + 20} ${600 - h * .8} L${x + 30} ${600 - h * .5} L${x + 50} ${600 - h * .5} L${x + 70} 600Z" fill="#c9962a" ${st(2)}/><path d="M${x - 20} ${600 - h * .8} L${x} ${600 - h} L${x + 20} ${600 - h * .8}Z" fill="${GOLD_L}" ${st(1.6)}/><path d="M${x - 40} ${600 - h * .3} H${x + 40} M${x - 30} ${600 - h * .6} H${x + 30}" stroke="#8a6212" stroke-width="3"/>`; }).join('')}
    <rect x="0" y="600" width="1600" height="300" fill="#1e2a1e"/>
    ${ashokaTree(220, 780, 1.1)}${ashokaTree(1380, 800, 1.2)}${ashokaTree(800, 720, .7)}
    <rect x="0" y="790" width="1600" height="110" fill="#2a3a24" ${st(2)}/>${border()}`,
  battle: () => grad('gB', '#5a1010', '#c0392b', '#f2a12b') + `<rect width="1600" height="900" fill="url(#gB)"/>
    ${sunMandala(800, 260, 80, '#f6d77e')}
    ${[[200, 300], [520, 220], [1100, 240], [1400, 320]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="160" ry="40" fill="#3a1010" opacity=".5"/>`).join('')}
    ${mountains(640, '#4a1a14', 'L200 560 L420 610 L700 540 L1000 600 L1300 540 L1600 600')}
    ${[120, 330, 1280, 1500].map((x, i) => flag(x, 640, i < 2 ? '#e8891c' : '#3a0a0a')).join('')}
    <rect x="0" y="640" width="1600" height="260" fill="#6a3a1e" ${st(2)}/>
    <path d="M0 700 Q400 680 800 720 T1600 700" stroke="#4a2612" stroke-width="4" fill="none"/>${border()}`,
  ayodhyaNight: () => grad('gN', '#0b0f33', '#2a1a4a', '#4a2a3a') + `<rect width="1600" height="900" fill="url(#gN)"/>${stars(140, 11)}
    <circle cx="1350" cy="140" r="0" fill="none"/>
    ${palace(800, 640, 1, true)}
    ${tree(110, 660, .9, '#1a2a1a', '#24402a')}${tree(1490, 660, .9, '#1a2a1a', '#24402a')}
    <rect x="0" y="640" width="1600" height="260" fill="#2a1e2a" ${st(2)}/>
    <path d="M0 740 H1600 M0 830 H1600" stroke="#3e2e3e" stroke-width="3"/>${border()}`,
};

const BG = {
  cache: {},
  get(name) {
    if (!this.cache[name]) this.cache[name] = svgWrap('0 0 1600 900', SCENES[name](), 'xMidYMid slice');
    return this.cache[name];
  },
};

/* helper: SVG string → Image for canvas use */
const ImgCache = {};
function svgImage(key, svgStr) {
  if (ImgCache[key]) return ImgCache[key];
  // canvas needs an intrinsic size; render at 2× the viewBox for crisp scaling
  const vb = (svgStr.match(/viewBox="([^"]+)"/) || [])[1];
  if (vb) {
    const [, , w, h] = vb.split(/\s+/).map(Number), k = w < 800 ? 2 : 1;
    svgStr = svgStr.replace('<svg ', `<svg width="${w * k}" height="${h * k}" `);
  }
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  ImgCache[key] = img;
  return img;
}
