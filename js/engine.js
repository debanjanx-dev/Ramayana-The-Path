'use strict';
/* =========================================================
   ENGINE — screens, dialogue, choices, learnings, saving.
   ========================================================= */
const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const baseKey = k => (CHARS[k] ? k : k.split('_')[0]);
const charOf = k => CHARS[baseKey(k)];

/* ---------- save ---------- */
const Save = {
  key: 'ramayana-dharma-v1',
  data: { done: [], learn: [], met: [], lotus: [] },
  load() {
    try { const d = JSON.parse(localStorage.getItem(this.key)); if (d) Object.assign(this.data, d); } catch (e) { /* storage unavailable */ }
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ } },
  add(list, v) { if (!this.data[list].includes(v)) { this.data[list].push(v); this.save(); return true; } return false; },
  reset() { this.data = { done: [], learn: [], met: [], lotus: [] }; this.save(); },
  unlocked(i) { return i === 0 || this.data.done.includes(CHAPTERS[i - 1].id); },
};
const TOTAL_LOTUS = CHAPTERS.reduce((n, c) => n + c.steps.filter(s => s.choice).length, 0);

/* ---------- abortable chapter run ---------- */
class Abort extends Error {}
let run = null;
const guard = p => (run ? Promise.race([p, run.abortP]) : p);

/* ---------- icons for the map ---------- */
const ICONS = {
  bow: `<path d="M18 6 Q-2 32 18 58" stroke="#3e220f" stroke-width="5" fill="none"/><path d="M18 6 L18 58" stroke="#f3ead2" stroke-width="1.4"/><path d="M14 32 H54 M54 32 l-8 -5 M54 32 l-8 5" stroke="#2b1a10" stroke-width="2.4" fill="none"/>`,
  paduka: `<rect x="12" y="10" width="16" height="44" rx="8" fill="#8a5a2b" stroke="#2b1a10" stroke-width="2"/><rect x="36" y="10" width="16" height="44" rx="8" fill="#8a5a2b" stroke="#2b1a10" stroke-width="2"/><circle cx="20" cy="18" r="3.4" fill="#d4a017"/><circle cx="44" cy="18" r="3.4" fill="#d4a017"/>`,
  deer: `<g transform="translate(2 6) scale(.25)">${deerArt(false)}</g>`,
  anklet: `<ellipse cx="32" cy="30" rx="22" ry="11" fill="none" stroke="#d4a017" stroke-width="5"/>${[0, 1, 2, 3, 4, 5, 6].map(i => { const a = Math.PI * (.08 + i * .14); return `<circle cx="${32 + Math.cos(a) * 22}" cy="${34 + Math.sin(a) * 11}" r="3.4" fill="#d4a017" stroke="#2b1a10" stroke-width="1"/>`; }).join('')}`,
  gada: `<path d="M16 56 L38 22" stroke="#5e3a12" stroke-width="6" stroke-linecap="round"/><ellipse cx="42" cy="16" rx="12" ry="14" fill="#d4a017" stroke="#2b1a10" stroke-width="2"/><path d="M30 14 Q42 18 54 14" stroke="#9a6f10" stroke-width="1.6" fill="none"/>`,
  arrow: `<path d="M8 56 L54 10" stroke="#5e3a12" stroke-width="3.4"/><path d="M54 10 l-14 3 l11 11Z" fill="#cfd6dc" stroke="#2b1a10" stroke-width="1.4"/><path d="M8 56 l2 -12 M8 56 l12 -2" stroke="#b8321f" stroke-width="3"/><circle cx="32" cy="32" r="26" fill="none" stroke="#f6d77e" stroke-width="2" stroke-dasharray="3 4"/>`,
  diya: `<path d="M26 40 Q24 26 32 16 Q40 26 38 40Z" fill="#f2a12b"/><path d="M30 38 Q30 30 32 26 Q34 30 34 38Z" fill="#fff3c4"/><path d="M10 40 Q32 60 54 40 L58 38 L50 44Z" fill="#b8642d" stroke="#2b1a10" stroke-width="2"/>`,
};
const icon = k => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${ICONS[k]}</svg>`;

/* =========================================================
   UI
   ========================================================= */
const UI = {
  slots: { left: null, right: null },
  advance: null,

  setBg(name) {
    if (Story3D.enabled) Story3D.setScene(name);
    const b = $('#bg');
    b.classList.add('fading');
    return wait(260).then(() => { b.innerHTML = BG.get(name); b.classList.remove('fading'); return wait(260); });
  },

  clearPortraits() {
    for (const side of ['left', 'right']) { const e = $(side === 'left' ? '#pl' : '#pr'); e.classList.remove('on', 'dim'); this.slots[side] = null; }
    Story3D.clear();
  },

  portrait(key, side) {
    const slot = $(side === 'left' ? '#pl' : '#pr'), other = side === 'left' ? 'right' : 'left';
    if (this.slots[side] !== key) {
      slot.innerHTML = `<div class="frame">${Portrait.svg(key)}</div>`;
      slot.classList.toggle('wide', !!Portrait.wide[key]);
      slot.classList.remove('enter'); void slot.offsetWidth; slot.classList.add('enter');
      this.slots[side] = key;
    }
    slot.classList.add('on'); slot.classList.remove('dim');
    if (this.slots[other]) $(other === 'left' ? '#pl' : '#pr').classList.add('dim');
  },

  type(text) {
    const d = $('#dialog'), box = $('#dtext');
    d.classList.remove('ready'); box.textContent = '';
    return new Promise(res => {
      let i = 0, done = false;
      const finish = () => { clearInterval(timer); box.textContent = text; done = true; d.classList.add('ready'); };
      const timer = setInterval(() => { i += 2; box.textContent = text.slice(0, i); if (i >= text.length) finish(); }, 22);
      this.advance = () => {
        if (!done) return finish();
        this.advance = null; Sound.play('advance'); res();
      };
    });
  },

  say(key, text) {
    const c = charOf(key);
    this.portrait(key, c.side);
    Story3D.speak(key, c.side);
    const d = $('#dialog');
    d.className = 'show ' + c.side;
    $('#dname').innerHTML = `${c.name}<span class="dev">${c.dev}</span>`;
    $('#dname').style.background = c.color;
    return this.type(text);
  },

  narrate(text) {
    for (const side of ['left', 'right']) if (this.slots[side]) $(side === 'left' ? '#pl' : '#pr').classList.add('dim');
    Story3D.narrate();
    $('#dialog').className = 'show narr';
    $('#dname').innerHTML = `Valmiki narrates<span class="dev">वाल्मीकि</span>`;
    $('#dname').style.background = '';
    return this.type(text);
  },

  hideDialog() { $('#dialog').className = ''; this.advance = null; },

  choice(step, id) {
    const d = $('#dialog');
    d.className = 'show narr ready ask';
    $('#dname').innerHTML = `What would they do?<span class="dev">धर्म</span>`;
    $('#dname').style.background = '';
    $('#dtext').textContent = step.choice;
    const box = $('#choices');
    box.innerHTML = ''; box.classList.add('show');
    const fb = document.createElement('div'); fb.className = 'feedback';
    let tries = 0;
    return new Promise(res => {
      step.opts.forEach(o => {
        const b = document.createElement('button');
        b.className = 'opt'; b.textContent = o.t;
        b.onclick = () => {
          if (b.disabled) return;
          if (o.ok) {
            b.classList.add('right');
            box.querySelectorAll('button').forEach(x => x.disabled = true);
            if (tries === 0 && Save.add('lotus', id)) { Sound.play('lotus'); this.toast('✿ A dharma lotus blooms — first-try wisdom!'); }
            else Sound.play('good');
            fb.textContent = tries === 0 ? 'Yes — that is the path of dharma.' : 'Yes. That is what happened.';
            fb.className = 'feedback good';
            setTimeout(() => { box.classList.remove('show'); box.innerHTML = ''; d.className = ''; res(); }, 1300);
          } else {
            tries++; b.disabled = true; b.classList.add('wrong'); Sound.play('miss');
            fb.textContent = o.r; fb.className = 'feedback';
          }
        };
        box.appendChild(b);
      });
      box.appendChild(fb);
    });
  },

  modal(html, cls = '') {
    const m = $('#modal');
    m.innerHTML = `<div class="panel ${cls}">${html}</div>`;
    m.classList.add('show');
    return m.firstElementChild;
  },
  closeModal() { const m = $('#modal'); m.classList.remove('show'); m.innerHTML = ''; },

  chapterCard(ch) {
    Sound.play('conch');
    const p = this.modal(`
      <div class="cc-num">Book ${ch.num}</div>
      <div class="cc-icon">${icon(ch.icon)}</div>
      <div class="cc-dev">${ch.dev}</div>
      <h2>${ch.kanda}</h2>
      <div class="cc-name">${ch.name}</div>
      <div class="cc-place">${ch.place}</div>
      <button class="btn">Begin</button>`, 'chapter-card');
    return new Promise(res => { p.querySelector('.btn').onclick = () => { this.closeModal(); res(); }; });
  },

  learning(id, fromScroll = false) {
    const L = LEARN[id];
    const fresh = !fromScroll && Save.add('learn', id);
    if (!fromScroll) Sound.play('bell');
    const p = this.modal(`
      <div class="rod top"></div>
      <div class="scroll-body">
        <div class="l-kicker">✦ ${fresh ? 'Checkpoint · Learning unlocked' : 'Learning'} ✦</div>
        <div class="l-kanda">${L.kanda}</div>
        <h2>${L.title}</h2>
        <blockquote>${L.quote}<cite>— ${L.src}</cite></blockquote>
        <p>${L.body}</p>
        <div class="reflect"><b>Reflect</b>${L.reflect}</div>
        <button class="btn">${fromScroll ? 'Close' : 'Continue the journey'}</button>
      </div>
      <div class="rod bottom"></div>`, 'scroll');
    return new Promise(res => { p.querySelector('.btn').onclick = () => { this.closeModal(); res(); }; });
  },

  gameIntro(id, fails, msg) {
    const g = GAME_INFO[id];
    const p = this.modal(`
      <div class="gi-port">${Portrait.svg(g.who)}</div>
      <div class="gi-body">
        ${msg ? `<div class="gi-fail">${msg}</div>` : '<div class="l-kicker">✦ Trial ✦</div>'}
        <h2>${g.title}</h2>
        <p>${g.how}</p>
        <p class="gi-tip"><b>Tip:</b> ${g.tip}</p>
        <div class="gi-btns"><button class="btn go">${msg ? 'Try again' : 'Begin'}</button>${fails >= 2 ? '<button class="btn ghost skip">Skip this trial</button>' : ''}</div>
      </div>`, 'game-intro');
    return new Promise(res => {
      p.querySelector('.go').onclick = () => { this.closeModal(); res('play'); };
      const s = p.querySelector('.skip'); if (s) s.onclick = () => { this.closeModal(); res('skip'); };
    });
  },

  toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  },

  meet(key) {
    const b = baseKey(key);
    if (Save.add('met', b)) this.toast(`New in the Character Gallery: ${CHARS[b].name}`);
  },

  /* ---------- screens ---------- */
  screen(html, cls) {
    const s = $('#screen');
    s.className = 'show ' + cls; s.innerHTML = html;
    return s;
  },
  hideScreen() { $('#screen').className = ''; $('#screen').innerHTML = ''; },

  title() {
    document.body.classList.remove('in-chapter');
    this.clearPortraits(); this.hideDialog();
    $('#bg').innerHTML = BG.get('title');
    if (Story3D.enabled) Story3D.setScene('title'); else Story3D.hide();
    const started = Save.data.done.length > 0 || Save.data.met.length > 0;
    const s = this.screen(`
      <div class="t-dev">रामायण</div>
      <h1>Ramayana</h1>
      <div class="t-sub">The Path of Dharma</div>
      <div class="t-row">${['rama', 'sita', 'lakshmana', 'hanuman'].map(k => `<div class="t-port">${Portrait.svg(k)}</div>`).join('')}</div>
      <div class="t-modes">
        <button class="mode-card go"><b>Story Mode</b><span>${started ? 'Continue the journey' : 'Walk the path of Rama'}</span></button>
        <button class="mode-card duel"><b>Multiplayer</b><span>Duel online, side by side, or vs computer</span></button>
      </div>
      <div class="t-btns"><button class="btn ghost chars">Characters</button><button class="btn ghost wis">Wisdom Scroll</button></div>
      <div class="t-foot">Based on Valmiki's Ramayana, with details from Tulsidas and the living tradition · Click, tap or press Space to advance</div>`, 'title');
    s.querySelector('.go').onclick = () => { Sound.init(); this.map(); };
    s.querySelector('.duel').onclick = () => { Sound.init(); DuelUI.menu(); };
    s.querySelector('.chars').onclick = () => this.gallery();
    s.querySelector('.wis').onclick = () => this.wisdom();
  },

  map() {
    document.body.classList.remove('in-chapter');
    this.clearPortraits(); this.hideDialog();
    $('#bg').innerHTML = BG.get('title');
    if (Story3D.enabled) { Story3D.setScene('title'); Story3D.setMapView(true); } else Story3D.hide();
    const THUMB = { bala: 'mithila', ayodhya: 'ayodhya', aranya: 'forest', kishkindha: 'kishkindha', sundara: 'ocean', yuddha: 'battle', home: 'ayodhyaNight' };
    const next = CHAPTERS.findIndex((c, i) => Save.unlocked(i) && !Save.data.done.includes(c.id));
    const cards = CHAPTERS.map((c, i) => {
      const un = Save.unlocked(i), done = Save.data.done.includes(c.id);
      const lot = c.steps.filter(st => st.choice).length, got = Save.data.lotus.filter(id => id.startsWith(c.id + '-')).length;
      return `<button class="ch-card ${done ? 'done' : un ? 'open' : 'locked'} ${i === next ? 'next' : ''}" data-i="${i}" ${un ? '' : 'disabled'}>
        <span class="ch-thumb">${BG.get(THUMB[c.id])}<span class="ch-num">${c.num}</span></span>
        <span class="ch-medal">${icon(c.icon)}</span>
        <span class="ch-dev">${c.dev}</span>
        <span class="ch-name">${c.name}</span>
        <span class="ch-place">${c.place}</span>
        <span class="ch-lotus">${'✿'.repeat(got)}<i>${'✿'.repeat(Math.max(0, lot - got))}</i></span>
        <span class="ch-cta">${done ? 'Replay' : un ? (i === next ? '▶ Play' : 'Play') : '🔒 Locked'}</span>
      </button>`;
    }).join('');
    const s = this.screen(`
      <div class="map-top">
        <div><div class="map-kicker">Story Mode</div><h2>The Journey</h2></div>
        <div class="stats"><span>✿ ${Save.data.lotus.length}/${TOTAL_LOTUS}</span><span>📜 ${Save.data.learn.length}/${Object.keys(LEARN).length}</span><span>👥 ${Save.data.met.length}/${Object.keys(CHARS).length}</span></div>
      </div>
      <div class="ch-row">${cards}</div>
      <div class="map-foot"><button class="btn ghost home">⟵ Menu</button><button class="btn ghost chars">Characters</button><button class="btn ghost wis">Wisdom Scroll</button><button class="btn ghost gfx">${Action3D.supported ? (use3D() ? '3D: on' : '3D: off') : '3D unavailable'}</button><button class="btn ghost reset">Reset</button></div>`, 'map');
    s.querySelectorAll('.ch-card').forEach(n => n.onclick = () => { Sound.init(); playChapter(+n.dataset.i); });
    s.querySelector('.home').onclick = () => this.title();
    s.querySelector('.chars').onclick = () => this.gallery();
    s.querySelector('.wis').onclick = () => this.wisdom();
    s.querySelector('.gfx').onclick = () => { if (!Action3D.supported) return; try { localStorage.setItem('ramayana-3d', use3D() ? 'off' : 'on'); } catch (e) { /* ignore */ } if (!use3D()) Story3D.hide(); this.map(); };
    s.querySelector('.reset').onclick = () => { if (confirm('Erase all progress, learnings and lotuses?')) { Save.reset(); this.map(); } };
  },

  gallery() {
    const keys = Object.keys(CHARS);
    const cards = keys.map(k => {
      const met = Save.data.met.includes(k);
      return `<button class="g-card ${met ? '' : 'locked'}" data-k="${k}" ${met ? '' : 'disabled'}>
        <span class="g-port ${Portrait.wide[k] ? 'wide' : ''}">${met ? Portrait.svg(k) : '<span class="q">?</span>'}</span>
        <span class="g-name">${met ? CHARS[k].name : 'Not yet met'}</span>
        <span class="g-dev">${met ? CHARS[k].dev : ''}</span></button>`;
    }).join('');
    const p = this.modal(`<div class="m-head"><h2>Characters</h2><button class="x">✕</button></div>
      <p class="m-sub">Meet characters in the story to add them here. Tap a portrait for details of their look and legend.</p>
      <div class="g-grid">${cards}</div>`, 'gallery');
    p.querySelector('.x').onclick = () => this.closeModal();
    p.querySelectorAll('.g-card:not(.locked)').forEach(c => c.onclick = () => this.charDetail(c.dataset.k));
  },

  charDetail(k) {
    const c = CHARS[k];
    const p = this.modal(`<div class="m-head"><h2>${c.name} <span class="dev">${c.dev}</span></h2><button class="x">✕</button></div>
      <div class="cd">
        <div class="cd-port ${Portrait.wide[k] ? 'wide' : ''}" style="border-color:${c.color}">${Portrait.svg(k)}</div>
        <div class="cd-info">
          <div class="cd-title">${c.title}</div>
          <p>${c.role}</p>
          <h4>Look for</h4><ul>${c.look.map(l => `<li>${l}</li>`).join('')}</ul>
          <h4>Virtue</h4><p>${c.virtue}</p>
          <h4>Did you know?</h4><p>${c.fact}</p>
          <button class="btn ghost back">⟵ All characters</button>
        </div>
      </div>`, 'gallery detail');
    p.querySelector('.x').onclick = () => this.closeModal();
    p.querySelector('.back').onclick = () => this.gallery();
  },

  wisdom() {
    const items = CHAPTERS.flatMap(ch => ch.steps.filter(s => s.learn).map(s => s.learn));
    const rows = items.map((id, i) => {
      const got = Save.data.learn.includes(id), L = LEARN[id];
      return `<button class="w-row ${got ? '' : 'locked'}" data-id="${id}" ${got ? '' : 'disabled'}>
        <span class="w-n">${i + 1}</span><span class="w-t">${got ? L.title : 'Locked — keep journeying'}</span><span class="w-k">${L.kanda}</span></button>`;
    }).join('');
    const p = this.modal(`<div class="m-head"><h2>Wisdom Scroll</h2><button class="x">✕</button></div>
      <p class="m-sub">${Save.data.learn.length} of ${items.length} learnings gathered.</p>
      <div class="w-list">${rows}</div>`, 'wisdom');
    p.querySelector('.x').onclick = () => this.closeModal();
    p.querySelectorAll('.w-row:not(.locked)').forEach(r => r.onclick = () => this.learning(r.dataset.id, true).then(() => this.wisdom()));
  },

  finale() {
    const lot = Save.data.lotus.length;
    const p = this.modal(`
      <div class="cc-dev">राम राज्य</div>
      <h2>Rama Rajya</h2>
      <div class="cc-name">The journey is complete</div>
      <p class="fin">You walked from the banks of the Sarayu to the shores of Lanka and home again. You gathered <b>${Save.data.learn.length}</b> learnings and <b>${lot}</b> of ${TOTAL_LOTUS} dharma lotuses.</p>
      <p class="fin">${lot === TOTAL_LOTUS ? 'Every choice you made was the choice of dharma — as steady as Rama himself.' : 'Replay any chapter from the Journey Map to bloom the lotuses you missed.'}</p>
      <div class="gi-btns"><button class="btn wis">Read the Wisdom Scroll</button><button class="btn ghost map">Journey Map</button></div>`, 'chapter-card finale');
    return new Promise(res => {
      p.querySelector('.wis').onclick = () => { this.closeModal(); this.wisdom(); res(); };
      p.querySelector('.map').onclick = () => { this.closeModal(); res(); };
    });
  },
};

/* =========================================================
   CONTROLS — a short note of the keys for whatever is being
   played; shown at the start, toggled any time with H
   ========================================================= */
const Controls = (() => {
  const rows = r => r.map(([a, b]) => `<div class="ctl-row"><span>${a}</span><b>${b}</b></div>`).join('');
  const CAM = ['Camera', '<kbd>Click</kbd> the field for 360° mouse look · <kbd>Esc</kbd> frees it · <kbd>Q</kbd>/<kbd>E</kbd> turn'];
  const SETS = {
    archer: { title: 'Controls — Rama', body: rows([['Move', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>'], ['Jump', '<kbd>Space</kbd>'], ['Shoot', '<kbd>J</kbd> or <kbd>Click</kbd> · hold to charge a piercing arrow (aims itself)'], ['Super', '<kbd>K</kbd> when the gold bar is full — Brahmastra'], ['Roll', '<kbd>Shift</kbd> or <kbd>L</kbd> · dodge through attacks'], CAM, ['Pause', '<kbd>P</kbd>']]) },
    brawler: { title: 'Controls', body: rows([['Move', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>'], ['Jump', '<kbd>Space</kbd>'], ['Attack', '<kbd>J</kbd> or <kbd>Click</kbd> · tap 3× for a combo, attack in the air to slam'], ['Super', '<kbd>K</kbd> when the gold bar is full'], ['Roll', '<kbd>Shift</kbd> or <kbd>L</kbd>'], CAM, ['Pause', '<kbd>P</kbd>']]) },
    flyer: { title: 'Controls — Jatayu', body: rows([['Fly', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>'], ['Up / down', '<kbd>Space</kbd> / <kbd>C</kbd>'], ['Dive-strike', '<kbd>J</kbd> or <kbd>Click</kbd>'], ['Super', '<kbd>K</kbd> — Feather Storm'], ['Barrel roll', '<kbd>Shift</kbd> or <kbd>L</kbd>'], CAM]) },
    '2d-archer': { title: 'Controls', body: rows([['Move', '<kbd>A</kbd>/<kbd>D</kbd> or arrows'], ['Jump', '<kbd>W</kbd> or <kbd>Space</kbd>'], ['Shoot', '<kbd>J</kbd> or <kbd>Click</kbd> · hold to charge · aim with the mouse'], ['Astra', '<kbd>K</kbd> when the gold bar is full'], ['Roll', '<kbd>L</kbd> or <kbd>Shift</kbd>'], ['Pause', '<kbd>P</kbd>']]) },
    '2d-brawler': { title: 'Controls', body: rows([['Move', '<kbd>A</kbd>/<kbd>D</kbd> or arrows'], ['Jump', '<kbd>W</kbd> or <kbd>Space</kbd>'], ['Attack', '<kbd>J</kbd> or <kbd>Click</kbd> · combo, in the air to slam'], ['Special', '<kbd>K</kbd>'], ['Roll', '<kbd>L</kbd> or <kbd>Shift</kbd>'], ['Pause', '<kbd>P</kbd>']]) },
    '2d-flyer': { title: 'Controls', body: rows([['Fly', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>'], ['Dive', '<kbd>J</kbd>'], ['Feathers', '<kbd>K</kbd>'], ['Roll', '<kbd>L</kbd>']]) },
    duel: { title: 'Duel controls', body: rows([['Move', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>'], ['Jump', '<kbd>Space</kbd> · leap over shockwave rings'], ['Attack', '<kbd>J</kbd> or <kbd>Click</kbd> · archers hold to charge, warriors tap for combos'], ['Super', '<kbd>K</kbd> when the gold bar is full'], ['Roll', '<kbd>Shift</kbd> or <kbd>L</kbd>'], CAM]) + '<p class="ctl-note">Best of three rounds · a draw doesn\'t count</p>' },
    'duel-local': { title: 'Two-player controls', body: `<div class="ctl-two"><div><h4>Player 1</h4>${rows([['Move', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>'], ['Jump', '<kbd>Space</kbd>'], ['Attack', '<kbd>F</kbd>'], ['Super', '<kbd>G</kbd>'], ['Roll', '<kbd>L-Shift</kbd>']])}</div><div><h4>Player 2</h4>${rows([['Move', '<kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd>'], ['Jump', '<kbd>Enter</kbd>'], ['Attack', '<kbd>L</kbd>'], ['Super', '<kbd>;</kbd>'], ['Roll', '<kbd>R-Shift</kbd>']])}</div></div><p class="ctl-note">Archers hold Attack to charge · warriors tap for combos · <kbd>P</kbd> pauses</p>` },
  };
  let el = null, pill = null, kind = null, timer = 0;
  function ensure() {
    if (el) return;
    el = document.createElement('div'); el.id = 'controls';
    pill = document.createElement('button'); pill.id = 'ctlpill'; pill.innerHTML = '<kbd>H</kbd> Controls';
    pill.onclick = e => { e.stopPropagation(); toggle(); };
    const st = document.getElementById('stage'); st.appendChild(el); st.appendChild(pill);
  }
  function show(k) {
    ensure(); const c = SETS[k] || SETS.duel; kind = k;
    el.innerHTML = `<div class="ctl-head"><b>${c.title}</b><button class="ctl-x" title="Hide (H)">✕</button></div>${c.body}<div class="ctl-foot">Press <kbd>H</kbd> to show or hide</div>`;
    el.querySelector('.ctl-x').onclick = e => { e.stopPropagation(); el.classList.remove('show'); };
    el.classList.toggle('wide2', k === 'duel-local');
    el.classList.add('show'); pill.classList.add('show');
    clearTimeout(timer); timer = setTimeout(() => el.classList.remove('show'), 10000);
  }
  function toggle() { if (!kind) return; clearTimeout(timer); el.classList.toggle('show'); }
  function hide() { kind = null; clearTimeout(timer); if (el) { el.classList.remove('show'); pill.classList.remove('show'); } }
  return { show, hide, toggle, get active() { return !!kind; } };
})();

/* =========================================================
   CHAPTER RUNNER
   ========================================================= */
// 3D fights when WebGL is available, unless the player switched to 2D on the map
function use3D() { let pref = null; try { pref = localStorage.getItem('ramayana-3d'); } catch (e) { /* ignore */ } return Action3D.supported && pref !== 'off'; }

const STAGE_FOES = { act_bala: ['tataka'], act_khara: ['khara'], act_vali: ['vali'], act_vatika: ['akshaya'], act_kumbha: ['kumbha'] };

async function playGame(id) {
  UI.hideDialog(); UI.clearPortraits();
  document.body.classList.add('in-game');
  let fails = 0, msg = null;
  try {
    for (;;) {
      const go = await guard(UI.gameIntro(id, fails, msg));
      if (go === 'skip') break;
      const eng = Action3D.has(id) && use3D() ? Action3D : Action.has(id) ? Action : Games;
      const res = await guard(eng.start(id));
      if (res.win) break;
      fails++; msg = res.msg;
    }
  } finally { document.body.classList.remove('in-game'); }
}

async function doStep(s, ch, idx) {
  if (s.title) return UI.chapterCard(CHAPTERS[s.title - 1]);
  if (s.bg) { if (s.clear) { UI.clearPortraits(); UI.hideDialog(); } await UI.setBg(s.bg); }
  if (s.meet) { UI.meet(s.meet); if (Story3D.enabled && CHARS[baseKey(s.meet)]) Story3D.present(s.meet, charOf(s.meet).side); }
  if (s.n) await UI.narrate(s.n);
  if (s.say) { UI.meet(s.say); await UI.say(s.say, s.t); }
  if (s.choice) await UI.choice(s, `${ch.id}-${idx}`);
  if (s.game) { await playGame(s.game); (STAGE_FOES[s.game] || []).forEach(k => UI.meet(k)); }
  if (s.learn) { UI.hideDialog(); await UI.learning(s.learn); }
  if (s.finale) { UI.hideDialog(); await UI.finale(); }
}

async function playChapter(i) {
  const ch = CHAPTERS[i];
  UI.hideScreen(); UI.closeModal();
  document.body.classList.add('in-chapter');
  $('#hud-title').textContent = `${ch.num} · ${ch.kanda} — ${ch.name}`;
  run = { aborted: false };
  run.abortP = new Promise((_, rej) => { run.reject = rej; });
  run.abortP.catch(() => {});
  try {
    for (let k = 0; k < ch.steps.length; k++) await guard(doStep(ch.steps[k], ch, k));
    const first = Save.add('done', ch.id);
    run = null;
    UI.map();
    if (first && CHAPTERS[i + 1]) UI.toast(`Chapter complete! ${CHAPTERS[i + 1].kanda} is now open.`);
    else if (first) UI.toast('The Ramayana is complete. Jai Siya Ram!');
  } catch (e) {
    if (!(e instanceof Abort)) throw e;
  }
}

function leaveChapter() {
  if (!run) return UI.map();
  if (!confirm('Leave this chapter? You will restart it next time (learnings and lotuses are kept).')) return;
  run.reject(new Abort()); run = null;
  Games.stop(); Action.stop(); Action3D.stop(); UI.closeModal(); UI.hideDialog();
  $('#choices').classList.remove('show'); $('#choices').innerHTML = '';
  document.body.classList.remove('in-game');
  UI.map();
}

/* =========================================================
   BOOT
   ========================================================= */
function fit() {
  const s = Math.min(innerWidth / 1280, innerHeight / 720);
  $('#stage').style.transform = `scale(${s})`;
}

window.addEventListener('DOMContentLoaded', () => {
  Save.load();
  fit(); window.addEventListener('resize', fit);
  const adv = () => { if (UI.advance && !$('#modal').classList.contains('show')) UI.advance(); };
  $('#dialog').addEventListener('click', adv);
  $('#scene').addEventListener('click', adv);
  $('#game3d').addEventListener('click', () => { if (!Action3D.active) adv(); });
  window.addEventListener('keydown', e => {
    if (Games.active || Action.active || Action3D.active || Duel.active) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      if (UI.advance && !$('#modal').classList.contains('show')) { e.preventDefault(); adv(); }
    }
  });
  // start audio on the first click, tap or key press
  document.addEventListener('pointerdown', () => Sound.init(), { once: true });
  document.addEventListener('keydown', () => Sound.init(), { once: true });
  window.addEventListener('keydown', e => { if (e.code === 'KeyH' && Controls.active) { e.preventDefault(); Controls.toggle(); } });
  $('#b-map').onclick = leaveChapter;
  $('#b-chars').onclick = () => UI.gallery();
  $('#b-wis').onclick = () => UI.wisdom();
  const snd = $('#b-snd');
  const paint = () => { snd.textContent = Sound.on ? '♪ Sound on' : '♪ Sound off'; };
  paint(); snd.onclick = () => { Sound.toggle(); paint(); };
  UI.title();
  // invite links: ?room=CODE drops the guest straight into the room
  const room = new URLSearchParams(location.search).get('room');
  if (room && Action3D.supported) setTimeout(() => DuelUI.joinRoom(room.toUpperCase().slice(0, 5)), 400);
});
