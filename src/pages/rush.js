import { checkStamps } from '../lib/progress.js';
import { store } from '../lib/store.js';
import { rushWord } from '../lib/text.js';
import { announceStamps, esc } from '../lib/ui.js';

const LIVES = 5;
const CUP = `<svg viewBox="0 0 48 40" aria-hidden="true"><path d="M6 10h28v12a12 12 0 0 1-12 12h-4A12 12 0 0 1 6 22z" fill="currentColor"/><path d="M34 13h3a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" stroke-width="3.5"/><path d="M2 36h40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path class="steam" d="M14 7c-2-2 2-3 0-6M21 7c-2-2 2-3 0-6M28 7c-2-2 2-3 0-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

export function mountRush(root, { sound }) {
  root.innerHTML = `
    <section class="page page-rush">
      <div class="rush-hud">
        <div class="live-stat"><span class="v" data-hud="score">0</span><span class="k">tips</span></div>
        <div class="live-stat"><span class="v" data-hud="level">1</span><span class="k">level</span></div>
        <div class="live-stat"><span class="v" data-hud="served">0</span><span class="k">served</span></div>
        <div class="live-stat"><span class="v" data-hud="combo">×1</span><span class="k">combo</span></div>
        <div class="live-stat"><span class="v" data-hud="wpm">0</span><span class="k">wpm</span></div>
      </div>
      <div class="rush-arena" tabindex="-1">
        <div class="rush-rail" aria-hidden="true"></div>
        <div class="rush-tickets"></div>
        <div class="rush-typed" aria-live="off"></div>
        <div class="rush-counter"><div class="cups">${Array.from({ length: LIVES }, () => `<span class="cup">${CUP}</span>`).join('')}</div></div>
        <input class="ghost-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Type the orders" />
        <div class="rush-overlay"></div>
      </div>
      <p class="shortcut-hint">Type an order to serve it · <kbd>backspace</kbd> fix · <kbd>esc</kbd> drop the current order · five spills and the café closes</p>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  const arena = $('.rush-arena');
  const layer = $('.rush-tickets');
  const input = $('.ghost-input');
  const overlay = $('.rush-overlay');
  const typedEl = $('.rush-typed');
  const cups = [...root.querySelectorAll('.cup')];
  const hud = Object.fromEntries([...root.querySelectorAll('[data-hud]')].map((e) => [e.dataset.hud, e]));

  let g = null;
  let raf = 0;
  let last = 0;

  const params = (level) => ({
    speed: 26 + level * 6.5, // px per second
    every: Math.max(750, 2500 - level * 180), // ms between orders
  });

  function newGame() {
    layer.replaceChildren();
    cups.forEach((c) => c.classList.remove('spilled'));
    g = {
      state: 'playing',
      tickets: [],
      score: 0,
      level: 1,
      served: 0,
      combo: 0,
      spills: 0,
      typedChars: 0,
      errors: 0,
      active: 0, // seconds of active play
      sinceSpawn: 1e9,
      target: null,
      buffer: '',
      orderNo: 1,
    };
    hideOverlay();
    updateHud();
    renderTyped();
    input.focus({ preventScroll: true });
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function spawn() {
    const onScreen = new Set(g.tickets.map((t) => t.text[0]));
    const text = rushWord(g.level, onScreen);
    const el = document.createElement('div');
    el.className = 'ticket';
    el.innerHTML = `<span class="ticket-no">nº ${g.orderNo++}</span><span class="ticket-word">${[...text]
      .map((c) => `<span>${esc(c)}</span>`)
      .join('')}</span>`;
    layer.append(el);
    const maxX = Math.max(0, arena.clientWidth - el.offsetWidth - 16);
    const { speed } = params(g.level);
    const t = {
      text,
      el,
      x: 8 + Math.random() * maxX,
      y: 12,
      speed: speed * (0.85 + Math.random() * 0.3),
      tilt: (Math.random() - 0.5) * 6,
      h: el.offsetHeight,
    };
    el.style.setProperty('--tilt', `${t.tilt}deg`);
    g.tickets.push(t);
    place(t);
  }

  const place = (t) => (t.el.style.transform = `translate(${t.x}px, ${t.y}px) rotate(var(--tilt))`);

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (g.state !== 'playing') return;
    g.active += dt;
    g.sinceSpawn += dt * 1000;
    if (g.sinceSpawn >= params(g.level).every || g.tickets.length === 0) {
      spawn();
      g.sinceSpawn = 0;
    }
    const floor = arena.clientHeight - $('.rush-counter').offsetHeight;
    for (const t of [...g.tickets]) {
      t.y += t.speed * dt;
      place(t);
      if (t.y + t.h >= floor) spill(t);
      if (g.state !== 'playing') return;
    }
    if (Math.floor(g.active * 4) !== Math.floor((g.active - dt) * 4)) updateHud();
    raf = requestAnimationFrame(loop);
  }

  function removeTicket(t) {
    g.tickets = g.tickets.filter((x) => x !== t);
    if (g.target === t) {
      g.target = null;
      g.buffer = '';
      renderTyped();
    }
  }

  function spill(t) {
    removeTicket(t);
    t.el.classList.add('spilled');
    setTimeout(() => t.el.remove(), 600);
    cups[g.spills]?.classList.add('spilled');
    g.spills++;
    g.combo = 0;
    sound.error();
    arena.classList.remove('shake');
    void arena.offsetWidth;
    arena.classList.add('shake');
    updateHud();
    if (g.spills >= LIVES) gameOver();
  }

  function mark(t) {
    const spans = t.el.querySelectorAll('.ticket-word span');
    spans.forEach((s, i) => s.classList.toggle('inked', t === g.target && i < g.buffer.length));
    t.el.classList.toggle('target', t === g.target);
  }

  function miss() {
    g.errors++;
    g.combo = 0;
    sound.error();
    const el = g.target?.el;
    if (el) {
      el.classList.remove('wobble');
      void el.offsetWidth;
      el.classList.add('wobble');
    }
    typedEl.classList.remove('bad');
    void typedEl.offsetWidth;
    typedEl.classList.add('bad');
    updateHud();
  }

  function typeChar(c) {
    if (g?.state !== 'playing') return;
    if (!g.target) {
      const options = g.tickets.filter((t) => t.text[0] === c);
      if (!options.length) return miss();
      g.target = options.reduce((a, b) => (b.y > a.y ? b : a));
      g.buffer = c;
    } else if (g.target.text[g.buffer.length] === c) {
      g.buffer += c;
    } else {
      return miss();
    }
    sound.key();
    mark(g.target);
    renderTyped();
    if (g.buffer === g.target.text) serve(g.target);
  }

  function serve(t) {
    const mult = Math.min(5, 1 + Math.floor(g.combo / 5));
    const gained = t.text.length * 10 * mult;
    g.score += gained;
    g.served++;
    g.combo++;
    g.typedChars += t.text.length + 1;
    removeTicket(t);
    t.el.classList.remove('target');
    t.el.classList.add('served');
    t.el.insertAdjacentHTML('beforeend', `<span class="served-stamp">served</span><span class="tip">+${gained}</span>`);
    setTimeout(() => t.el.remove(), 700);
    sound.served();
    if (g.served % 10 === 0) {
      g.level++;
      sound.levelUp();
      flash(`Level ${g.level}`, 'The morning rush picks up…');
    }
    updateHud();
  }

  function flash(title, sub) {
    const f = document.createElement('div');
    f.className = 'rush-flash';
    f.innerHTML = `<b>${esc(title)}</b><span>${esc(sub)}</span>`;
    arena.append(f);
    setTimeout(() => f.remove(), 1600);
  }

  function renderTyped() {
    typedEl.innerHTML = g?.buffer ? esc(g.buffer) : '<span class="placeholder">start typing an order…</span>';
  }

  function updateHud() {
    if (!g) return;
    hud.score.textContent = g.score;
    hud.level.textContent = g.level;
    hud.served.textContent = g.served;
    hud.combo.textContent = `×${Math.min(5, 1 + Math.floor(g.combo / 5))}`;
    hud.wpm.textContent = g.active > 3 ? Math.round(g.typedChars / 5 / (g.active / 60)) : 0;
  }

  function showOverlay(html) {
    overlay.innerHTML = html;
    overlay.hidden = false;
    overlay.querySelector('[data-go]')?.addEventListener('click', () => {
      if (g?.state === 'paused') resume();
      else newGame();
    });
  }
  const hideOverlay = () => (overlay.hidden = true);

  function pause() {
    if (g?.state !== 'playing') return;
    g.state = 'paused';
    cancelAnimationFrame(raf);
    showOverlay(`<div class="card"><h2>Kettle’s on hold</h2><p>The café is paused.</p><button class="btn btn-primary" data-go>Resume ↵</button></div>`);
  }

  function resume() {
    g.state = 'playing';
    hideOverlay();
    input.focus({ preventScroll: true });
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function gameOver() {
    g.state = 'over';
    cancelAnimationFrame(raf);
    sound.gameOver();
    const r = store.state.rush;
    const isBest = g.score > r.best;
    r.games++;
    r.best = Math.max(r.best, g.score);
    r.bestLevel = Math.max(r.bestLevel, g.level);
    r.bestServed = Math.max(r.bestServed, g.served);
    store.save();
    const wpm = g.active > 3 ? Math.round(g.typedChars / 5 / (g.active / 60)) : 0;
    const acc = g.typedChars ? Math.round((g.typedChars / (g.typedChars + g.errors)) * 100) : 0;
    showOverlay(`
      <div class="card">
        <h2>The café is closed</h2>
        ${isBest && g.score > 0 ? '<div class="pb-stamp small">New<br/>record!</div>' : ''}
        <p class="big-score">${g.score} <small>tips</small></p>
        <dl class="mini-stats">
          <div><dt>orders served</dt><dd>${g.served}</dd></div>
          <div><dt>level</dt><dd>${g.level}</dd></div>
          <div><dt>speed</dt><dd>${wpm} wpm</dd></div>
          <div><dt>accuracy</dt><dd>${acc}%</dd></div>
        </dl>
        <p class="muted">Best: ${r.best} tips · level ${r.bestLevel}</p>
        <button class="btn btn-primary" data-go>Open again ↵</button>
      </div>`);
    announceStamps(checkStamps());
  }

  function intro() {
    const r = store.state.rush;
    showOverlay(`
      <div class="card">
        <h2>Coffee Rush</h2>
        <p>Order tickets are sliding down the rail. <b>Type each order</b> before it hits the counter.
        Every missed ticket knocks over a cup — lose five and the café closes.</p>
        <p class="muted">Chain orders without mistakes for a tip multiplier up to ×5. Every 10 orders, the rush speeds up.</p>
        ${r.best ? `<p class="muted">Your record: <b>${r.best}</b> tips · level ${r.bestLevel}</p>` : ''}
        <button class="btn btn-primary" data-go>Open the café ↵</button>
      </div>`);
  }

  input.addEventListener('input', () => {
    const v = input.value;
    input.value = '';
    for (const c of v) if (c !== ' ') typeChar(c);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!g || g.state === 'over') newGame();
      else if (g.state === 'paused') resume();
    } else if (e.key === 'Escape' && g?.state === 'playing') {
      const t = g.target;
      g.target = null;
      g.buffer = '';
      if (t) mark(t);
      renderTyped();
    } else if (e.key === 'Backspace' && g?.state === 'playing' && g.target) {
      e.preventDefault();
      g.buffer = g.buffer.slice(0, -1);
      const t = g.target;
      if (!g.buffer) g.target = null;
      mark(t);
      renderTyped();
      sound.backspace();
    } else if (e.key === 'Tab') {
      e.preventDefault();
    }
  });
  input.addEventListener('blur', () => setTimeout(() => document.activeElement !== input && pause(), 50));
  arena.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    input.focus({ preventScroll: true });
  });
  const onVisibility = () => document.hidden && pause();
  document.addEventListener('visibilitychange', onVisibility);

  renderTyped();
  intro();
  input.focus({ preventScroll: true });

  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
