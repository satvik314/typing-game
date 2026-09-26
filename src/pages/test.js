import { TypingTest } from '../lib/engine.js';
import { createKeyboard } from '../lib/keyboard.js';
import { recordResult } from '../lib/progress.js';
import { store } from '../lib/store.js';
import { randomQuote, randomWords } from '../lib/text.js';
import { announceStamps, createTypewriter, esc, renderReceipt } from '../lib/ui.js';

const OPTIONS = {
  mode: [
    ['time', 'timed'],
    ['words', 'words'],
    ['quote', 'quote'],
  ],
  time: [15, 30, 60, 120],
  words: [10, 25, 50, 100],
};

export function mountTest(root, { sound }) {
  const s = store.state.settings;
  root.innerHTML = `
    <section class="page page-test">
      <div class="config" role="toolbar" aria-label="Test settings">
        <div class="cfg-group" data-group="mode">
          ${OPTIONS.mode.map(([v, l]) => `<button class="chip" data-set="mode" data-value="${v}">${l}</button>`).join('')}
        </div>
        <span class="cfg-sep" data-hide="quote"></span>
        <div class="cfg-group" data-show="time">
          ${OPTIONS.time.map((v) => `<button class="chip" data-set="time" data-value="${v}">${v}s</button>`).join('')}
        </div>
        <div class="cfg-group" data-show="words">
          ${OPTIONS.words.map((v) => `<button class="chip" data-set="words" data-value="${v}">${v}</button>`).join('')}
        </div>
        <span class="cfg-sep"></span>
        <div class="cfg-group">
          <button class="chip toggle" data-toggle="punctuation" data-hide="quote">punctuation</button>
          <button class="chip toggle" data-toggle="numbers" data-hide="quote">numbers</button>
          <button class="chip toggle" data-toggle="guide" title="Highlight the next key on the keyboard">guide keys</button>
        </div>
      </div>

      <div class="live" aria-live="off">
        <div class="live-stat"><span class="v" data-live="clock">0</span><span class="k" data-live="clock-label">seconds</span></div>
        <div class="brew-meter" aria-hidden="true"><div class="brew-fill"></div></div>
        <div class="live-stat"><span class="v" data-live="wpm">0</span><span class="k">wpm</span></div>
        <div class="live-stat"><span class="v" data-live="acc">100</span><span class="k">% acc</span></div>
      </div>

      <div class="stage">
        <div class="tw-host"></div>
        <div class="results-host" hidden></div>
      </div>

      <p class="shortcut-hint"><kbd>tab</kbd> new sheet · <kbd>backspace</kbd> on an empty word revisits a mistake · <kbd>enter</kbd> next brew</p>
    </section>`;

  const $ = (sel) => root.querySelector(sel);
  const twHost = $('.tw-host');
  const resultsHost = $('.results-host');
  const tw = createTypewriter(twHost);
  const keyboard = createKeyboard(tw.kbHost);
  let lastCfg = null;
  let lastQuote = null;
  let stopChart = null;
  let shownAt = 0;

  const live = {
    clock: $('[data-live="clock"]'),
    clockLabel: $('[data-live="clock-label"]'),
    wpm: $('[data-live="wpm"]'),
    acc: $('[data-live="acc"]'),
    fill: $('.brew-fill'),
  };

  const test = new TypingTest({
    viewport: tw.viewport,
    input: tw.input,
    sound,
    keyboard,
    onRestart: () => restart(),
    onTick: (t) => {
      if (t.remaining != null) {
        live.clock.textContent = Math.ceil(t.remaining);
        live.clockLabel.textContent = 'seconds';
        live.fill.style.width = `${(t.elapsed / lastCfg.limit) * 100}%`;
      } else {
        live.clock.textContent = `${t.done}/${t.total}`;
        live.clockLabel.textContent = 'words';
        live.fill.style.width = `${(t.done / t.total) * 100}%`;
      }
      live.wpm.textContent = t.wpm;
      live.acc.textContent = t.acc;
    },
    onFinish: (result) => showResults(result),
  });

  function label(cfg) {
    if (cfg.mode === 'time') return `Timed · ${cfg.limit}s`;
    if (cfg.mode === 'words') return `Words · ${cfg.limit}`;
    return 'Quote';
  }

  function syncConfig() {
    root.querySelectorAll('[data-set]').forEach((b) =>
      b.classList.toggle('active', String(s[b.dataset.set]) === b.dataset.value),
    );
    root.querySelectorAll('[data-toggle]').forEach((b) => {
      b.classList.toggle('active', !!s[b.dataset.toggle]);
      b.setAttribute('aria-pressed', String(!!s[b.dataset.toggle]));
    });
    root.querySelectorAll('[data-hide]').forEach((el) => (el.hidden = el.dataset.hide === s.mode));
    root.querySelectorAll('[data-show]').forEach((g) => (g.hidden = g.dataset.show !== s.mode));
    tw.root.classList.toggle('no-guide', !s.guide);
  }

  function restart(same = false) {
    stopChart?.();
    stopChart = null;
    resultsHost.hidden = true;
    resultsHost.replaceChildren();
    twHost.hidden = false;

    const opts = { punctuation: s.punctuation, numbers: s.numbers };
    let cfg;
    if (same && lastCfg) {
      cfg = lastCfg;
    } else if (s.mode === 'time') {
      cfg = { mode: 'time', limit: s.time, words: randomWords(80, opts), more: () => randomWords(40, opts) };
    } else if (s.mode === 'words') {
      cfg = { mode: 'words', limit: s.words, words: randomWords(s.words, opts) };
    } else {
      lastQuote = randomQuote(lastQuote);
      cfg = { mode: 'quote', limit: 0, words: lastQuote.text.split(' '), quote: lastQuote };
    }
    lastCfg = cfg;
    tw.source.innerHTML = cfg.quote ? `&mdash; ${esc(cfg.quote.source)}` : '';
    test.setup(cfg);
    tw.focus();
  }

  function showResults(result) {
    const info = recordResult(result, 'test', label(lastCfg));
    twHost.hidden = true;
    resultsHost.hidden = false;
    stopChart = renderReceipt(resultsHost, result, {
      title: label(lastCfg),
      info,
      actions: [
        { label: 'Next brew ↵', primary: true, onClick: () => restart() },
        { label: 'Same text again', onClick: () => restart(true) },
      ],
    });
    tw.input.blur();
    shownAt = performance.now();
    announceStamps(info.stamps);
  }

  root.querySelector('.config').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.set) {
      const v = b.dataset.value;
      store.setting(b.dataset.set, b.dataset.set === 'mode' ? v : Number(v));
    } else if (b.dataset.toggle) {
      store.setting(b.dataset.toggle, !s[b.dataset.toggle]);
      if (b.dataset.toggle === 'guide') {
        syncConfig();
        tw.focus();
        return;
      }
    }
    syncConfig();
    restart();
  });

  const onKey = (e) => {
    if (e.target.closest?.('input, textarea') && e.target !== tw.input) return;
    if (!resultsHost.hidden) {
      // Ignore keys still in flight from the last burst of typing.
      if (performance.now() - shownAt < 500) return;
      if (e.key === 'Enter' && !e.target.closest?.('button')) {
        e.preventDefault();
        restart();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        restart();
      }
      return;
    }
    if (document.activeElement !== tw.input) {
      if (e.key === 'Tab') {
        e.preventDefault();
        restart();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest?.('button')) {
        tw.focus();
      }
    }
  };
  document.addEventListener('keydown', onKey);

  syncConfig();
  restart();

  return () => {
    document.removeEventListener('keydown', onKey);
    stopChart?.();
    test.destroy();
  };
}
