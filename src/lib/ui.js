import { drawChart } from './chart.js';
import { rankFor, tipsFor } from './progress.js';
import { store } from './store.js';

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function toast(html, kind = '') {
  let tray = document.querySelector('.toast-tray');
  if (!tray) {
    tray = document.createElement('div');
    tray.className = 'toast-tray';
    tray.setAttribute('role', 'status');
    document.body.append(tray);
  }
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.innerHTML = html;
  tray.append(t);
  setTimeout(() => t.classList.add('out'), 3800);
  setTimeout(() => t.remove(), 4400);
}

export function announceStamps(stamps) {
  stamps.forEach((s, i) =>
    setTimeout(() => toast(`<b>Stamp earned: ${esc(s.name)}</b><span>${esc(s.desc)}</span>`, 'stamp'), i * 600),
  );
}

/** The typewriter: a paper sheet, the platen and the keyboard body. */
export function createTypewriter(host, { badge = 'Café Nº 5' } = {}) {
  host.innerHTML = `
    <div class="typewriter">
      <div class="paper-wrap">
        <div class="paper" tabindex="-1">
          <div class="viewport"></div>
          <div class="paper-source"></div>
          <input class="ghost-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off"
            spellcheck="false" aria-label="Type the text on the paper" />
          <div class="focus-hint"><span>Click here or press any key to feed the paper</span></div>
        </div>
      </div>
      <div class="platen" aria-hidden="true"><span class="knob l"></span><span class="roll"></span><span class="knob r"></span></div>
      <div class="tw-body">
        <div class="tw-badge">${esc(badge)}</div>
        <div class="kb-host"></div>
      </div>
    </div>`;
  const paper = host.querySelector('.paper');
  const input = host.querySelector('.ghost-input');
  const focus = () => input.focus({ preventScroll: true });
  paper.addEventListener('mousedown', (e) => {
    e.preventDefault();
    focus();
  });
  input.addEventListener('focus', () => paper.classList.remove('blurred'));
  input.addEventListener('blur', () => paper.classList.add('blurred'));
  return {
    root: host.querySelector('.typewriter'),
    paper,
    viewport: host.querySelector('.viewport'),
    source: host.querySelector('.paper-source'),
    input,
    kbHost: host.querySelector('.kb-host'),
    focus,
  };
}

const fmtTime = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);

/** Render the café receipt for a finished test. */
export function renderReceipt(host, result, { title, info, actions = [], note = '' }) {
  const rank = rankFor(result.wpm);
  const orderNo = String(store.state.history.length).padStart(4, '0');
  const now = new Date();
  const when = now.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const c = result.chars;
  const line = (label, value, hint = '') =>
    `<div class="rline"><dt>${label}</dt><span class="dots"></span><dd>${value}${hint ? `<small>${hint}</small>` : ''}</dd></div>`;

  host.innerHTML = `
    <article class="receipt">
      <header class="receipt-head">
        <div class="receipt-logo">The Typewriter Café</div>
        <div class="receipt-sub">order nº ${orderNo} · ${esc(when)} · ${esc(time)}</div>
        <div class="receipt-title">${esc(title)}</div>
      </header>
      <section class="receipt-hero">
        <div class="big-wpm"><span class="num">${result.wpm}</span><span class="unit">wpm</span></div>
        <p class="brewed">You brewed <b>${esc(rank.drink)}</b>.</p>
        <span class="rank-chip">${esc(rank.title)}</span>
        ${info.pb ? `<div class="pb-stamp">Personal<br/>Best!</div>` : ''}
      </section>
      <div class="chart-box">
        <canvas class="receipt-chart" aria-label="Words per minute over time"></canvas>
        <div class="chart-legend"><span class="lg wpm">wpm</span><span class="lg raw">raw</span><span class="lg err">errors</span></div>
      </div>
      <dl class="receipt-lines">
        ${line('Accuracy', `${result.acc}%`)}
        ${line('Raw speed', `${result.raw} wpm`, 'including mistakes')}
        ${line('Consistency', `${result.consistency}%`)}
        ${line('Characters', `<span title="correct / incorrect / extra / missed">${c.correct}/<i class="red">${c.incorrect}</i>/${c.extra}/${c.missed}</span>`, 'ok / wrong / extra / missed')}
        ${line('Brewing time', fmtTime(result.elapsed))}
        ${info.prevBest ? line('Previous best', `${info.prevBest} wpm`) : ''}
      </dl>
      ${note ? `<p class="receipt-note">${note}</p>` : ''}
      <section class="tips">
        <h4>Barista’s notes</h4>
        <ul>${tipsFor(result).map((t) => `<li>${t}</li>`).join('')}</ul>
      </section>
      <div class="receipt-actions">
        ${actions.map((a, i) => `<button class="btn ${a.primary ? 'btn-primary' : ''}" data-action="${i}">${a.label}</button>`).join('')}
      </div>
      <footer class="receipt-foot">thank you · come again<br/><kbd>enter</kbd> next brew &nbsp; <kbd>tab</kbd> start over</footer>
    </article>`;

  host.querySelectorAll('[data-action]').forEach((b) =>
    b.addEventListener('click', () => actions[+b.dataset.action].onClick()),
  );

  const canvas = host.querySelector('.receipt-chart');
  const draw = () =>
    drawChart(canvas, {
      series: [
        {
          data: result.samples.map((s) => ({ x: s.t, y: s.raw })),
          color: getComputedStyle(canvas).getPropertyValue('--chart-raw').trim(),
          dash: [4, 5],
          width: 1.5,
        },
        { data: result.samples.map((s) => ({ x: s.t, y: s.wpm })), width: 2.5, fill: true },
      ],
      markers: result.samples.filter((s) => s.errors).map((s) => ({ x: s.t, y: s.wpm, size: s.errors })),
      xLabel: (x) => `${x}s`,
      yTitle: 'wpm',
    });
  requestAnimationFrame(draw);
  const ro = new ResizeObserver(() => draw());
  ro.observe(canvas);
  window.addEventListener('themechange', draw);
  return () => {
    ro.disconnect();
    window.removeEventListener('themechange', draw);
  };
}
