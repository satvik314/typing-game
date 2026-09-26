import { TypingTest } from '../lib/engine.js';
import { createKeyboard } from '../lib/keyboard.js';
import { recordResult, weakKeys } from '../lib/progress.js';
import { store } from '../lib/store.js';
import { focusWords, numberWords, randomWords, rowWords } from '../lib/text.js';
import { announceStamps, createTypewriter, esc, renderReceipt } from '../lib/ui.js';

const HOME = 'asdfghjkl';
const TOP = 'qwertyuiop';
const BOTTOM = 'zxcvbnm';

const DRILLS = [
  {
    id: 'weak',
    name: 'Sticky-Key Blend',
    desc: 'A custom roast built around your slowest and most-missed keys.',
    words: (focus) => focusWords(focus, 30),
  },
  { id: 'home', name: 'Home Row Roast', desc: 'Where your fingers rest: a s d f · j k l.', words: () => rowWords(HOME, HOME, 25) },
  { id: 'top', name: 'Top Row Blend', desc: 'Reach up for q w e r t y u i o p.', words: () => rowWords(TOP, TOP + HOME, 25) },
  { id: 'bottom', name: 'Bottom Row Brew', desc: 'Curl down to z x c v b n m.', words: () => rowWords(BOTTOM, BOTTOM + HOME, 25) },
  { id: 'numbers', name: 'Number Grind', desc: 'Prices, receipts and order numbers.', words: () => numberWords(20) },
  {
    id: 'punct',
    name: 'Punctuation Pour',
    desc: 'Capitals, commas and full stops for the finishing touches.',
    words: () => randomWords(30, { punctuation: true }),
  },
];

export function mountWorkshop(root, { sound }) {
  root.innerHTML = `
    <section class="page page-workshop">
      <div class="ws-dash">
        <header class="page-head">
          <h1>The Workshop</h1>
          <p>Every keystroke is logged key by key. Here is where your machine needs a little oil.</p>
        </header>
        <div class="ws-grid">
          <div class="card ws-heat">
            <h3>Key heatmap</h3>
            <div class="kb-host"></div>
            <div class="heat-legend"><span>smooth</span><span class="heat-bar"></span><span>sticky</span></div>
          </div>
          <div class="card ws-weak">
            <h3>Stickiest keys</h3>
            <div class="weak-list"></div>
          </div>
        </div>
        <h3 class="section-title">Choose a drill</h3>
        <div class="drills"></div>
      </div>
      <div class="ws-session" hidden>
        <div class="ws-session-head">
          <button class="btn btn-ghost" data-back>← Workshop</button>
          <span class="ws-session-title"></span>
          <span class="ws-live"><b data-live="progress">0/0</b> words · <b data-live="wpm">0</b> wpm · <b data-live="acc">100</b>%</span>
        </div>
        <div class="tw-host"></div>
        <div class="results-host" hidden></div>
      </div>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  const dash = $('.ws-dash');
  const session = $('.ws-session');
  const twHost = $('.tw-host');
  const resultsHost = $('.results-host');
  const heatKb = createKeyboard($('.ws-heat .kb-host'));
  let current = null;
  let stopChart = null;
  let shownAt = 0;
  let test = null;
  let tw = null;

  function renderDash() {
    const rows = weakKeys();
    const top = rows.slice(0, 6);
    const max = rows[0]?.score || 1;
    heatKb.heat(Object.fromEntries(rows.map((r) => [r.key, Math.min(1, r.score / max)])));

    $('.weak-list').innerHTML = top.length
      ? `<ol>${top
          .map(
            (r) => `<li>
              <kbd>${esc(r.key)}</kbd>
              <span class="meter ${r.acc < 90 ? 'low' : r.acc < 96 ? 'mid' : ''}"><span style="width:${r.acc.toFixed(1)}%"></span></span>
              <span class="num">${Math.round(r.acc)}%</span>
              <span class="num muted">${r.ms ? `${Math.round(r.ms)} ms` : '—'}</span>
            </li>`,
          )
          .join('')}</ol><p class="muted small">Accuracy and average time to reach each key.</p>`
      : `<p class="empty">No readings yet. Finish a typing test or two and the workshop will spot your sticky keys.</p>`;

    const focus = top.slice(0, 4).map((r) => r.key);
    $('.drills').innerHTML = DRILLS.map((d) => {
      const locked = d.id === 'weak' && !focus.length;
      const extra = d.id === 'weak' && focus.length ? `<span class="drill-keys">${focus.map((k) => `<kbd>${k}</kbd>`).join('')}</span>` : '';
      return `<button class="drill-card" data-drill="${d.id}" ${locked ? 'disabled' : ''}>
          <span class="drill-name">${d.name}</span>
          <span class="drill-desc">${locked ? 'Unlocks after your first typing test.' : d.desc}</span>
          ${extra}
        </button>`;
    }).join('');
  }

  function ensureTypewriter() {
    if (tw) return;
    tw = createTypewriter(twHost, { badge: 'Workshop' });
    const keyboard = createKeyboard(tw.kbHost);
    test = new TypingTest({
      viewport: tw.viewport,
      input: tw.input,
      sound,
      keyboard,
      onRestart: () => start(current.drill, true),
      onTick: (t) => {
        $('[data-live="progress"]').textContent = `${t.done}/${t.total}`;
        $('[data-live="wpm"]').textContent = t.wpm;
        $('[data-live="acc"]').textContent = t.acc;
      },
      onFinish: finish,
    });
    tw.root.classList.toggle('no-guide', !store.state.settings.guide);
  }

  function start(drill, same = false) {
    ensureTypewriter();
    stopChart?.();
    const focus = weakKeys().slice(0, 4).map((r) => r.key);
    const words = same && current?.drill === drill ? current.words : drill.words(focus);
    current = { drill, words, focus };
    dash.hidden = true;
    session.hidden = false;
    resultsHost.hidden = true;
    twHost.hidden = false;
    $('.ws-session-title').textContent = drill.name;
    test.setup({ mode: 'words', limit: words.length, words });
    tw.focus();
    window.scrollTo({ top: 0 });
  }

  function finish(result) {
    const { drill, focus } = current;
    const before = Object.fromEntries(
      focus.map((k) => {
        const v = store.state.keys[k];
        return [k, v && v.hits + v.misses ? (v.hits / (v.hits + v.misses)) * 100 : null];
      }),
    );
    result.mode = `drill:${drill.id}`;
    const info = recordResult(result, 'drill', drill.name);

    let note = '';
    if (drill.id === 'weak') {
      const parts = focus
        .filter((k) => result.keyLog[k])
        .map((k) => {
          const v = result.keyLog[k];
          const now = (v.hits / (v.hits + v.misses)) * 100;
          const was = before[k];
          const arrow = was == null ? '' : now > was + 0.5 ? ' ▲' : now < was - 0.5 ? ' ▼' : '';
          return `<kbd>${k}</kbd> ${Math.round(now)}%${was == null ? '' : ` <small>(was ${Math.round(was)}%${arrow})</small>`}`;
        });
      if (parts.length) note = `Focus keys this drill: ${parts.join(' · ')}`;
    }

    twHost.hidden = true;
    resultsHost.hidden = false;
    stopChart = renderReceipt(resultsHost, result, {
      title: `Workshop · ${drill.name}`,
      info,
      note,
      actions: [
        { label: 'Another round ↵', primary: true, onClick: () => start(drill) },
        { label: 'Back to the workshop', onClick: back },
      ],
    });
    tw.input.blur();
    shownAt = performance.now();
    announceStamps(info.stamps);
  }

  function back() {
    stopChart?.();
    stopChart = null;
    session.hidden = true;
    dash.hidden = false;
    current = null;
    renderDash();
  }

  root.addEventListener('click', (e) => {
    const card = e.target.closest('[data-drill]');
    if (card) start(DRILLS.find((d) => d.id === card.dataset.drill));
    if (e.target.closest('[data-back]')) back();
  });

  const onKey = (e) => {
    if (session.hidden) return;
    if (!resultsHost.hidden) {
      if (performance.now() - shownAt < 500) return;
      if ((e.key === 'Enter' && !e.target.closest?.('button')) || e.key === 'Tab') {
        e.preventDefault();
        start(current.drill, e.key === 'Tab');
      } else if (e.key === 'Escape') back();
      return;
    }
    if (e.key === 'Escape') back();
    else if (document.activeElement !== tw.input && e.key.length === 1 && !e.ctrlKey && !e.metaKey) tw.focus();
  };
  document.addEventListener('keydown', onKey);

  renderDash();

  return () => {
    document.removeEventListener('keydown', onKey);
    stopChart?.();
    test?.destroy();
  };
}
