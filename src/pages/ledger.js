import { drawChart } from '../lib/chart.js';
import { bestWpm, rankFor, RANKS, STAMPS } from '../lib/progress.js';
import { store, streak } from '../lib/store.js';
import { esc } from '../lib/ui.js';

const CUP_ICON = `<svg viewBox="0 0 48 40" aria-hidden="true"><path d="M8 12h26v10a11 11 0 0 1-11 11h-4A11 11 0 0 1 8 22z" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M34 15h3a5 5 0 0 1 0 10h-3" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M15 8c-2-2 2-3 0-6M21 8c-2-2 2-3 0-6M27 8c-2-2 2-3 0-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

export function mountLedger(root) {
  const s = store.state;
  const tests = s.history.filter((h) => h.kind === 'test');
  const best = bestWpm(s, (h) => h.kind === 'test');
  const rank = rankFor(best);
  const recent = tests.slice(-10);
  const avg = (arr, k) => (arr.length ? arr.reduce((a, h) => a + h[k], 0) / arr.length : 0);
  const totalSeconds = s.history.reduce((a, h) => a + (h.seconds || 0), 0);
  const totalWords = s.history.reduce((a, h) => a + (h.words || 0), 0);
  const nextPct = rank.next ? Math.min(100, ((best - rank.min) / (rank.next.min - rank.min)) * 100) : 100;
  const earned = STAMPS.filter((st) => s.stamps[st.id]).length;

  const tile = (v, k) => `<div class="tile"><span class="v">${v}</span><span class="k">${k}</span></div>`;
  const fmtDur = (sec) => (sec >= 3600 ? `${(sec / 3600).toFixed(1)}h` : `${Math.round(sec / 60)}m`);
  const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  root.innerHTML = `
    <section class="page page-ledger">
      <header class="page-head">
        <h1>The Ledger</h1>
        <p>Your tab at the Typewriter Café: every brew, every best, every stamp.</p>
      </header>

      <div class="card rank-card">
        <div class="rank-badge" aria-hidden="true">${CUP_ICON}</div>
        <div class="rank-body">
          <span class="eyebrow">Current title</span>
          <h2>${esc(rank.title)}</h2>
          <p>Best speed <b>${best}</b> wpm${rank.next ? ` · <b>${rank.next.min - best}</b> wpm to <i>${esc(rank.next.title)}</i>` : ' · the top of the menu!'}</p>
          <div class="rank-progress"><span style="width:${nextPct}%"></span></div>
          <ol class="rank-ladder">${rankLadder(rank.index)}</ol>
        </div>
      </div>

      <div class="tiles">
        ${tile(tests.length, 'tests brewed')}
        ${tile(Math.round(avg(recent, 'wpm')), 'avg wpm (last 10)')}
        ${tile(`${Math.round(avg(recent, 'acc'))}%`, 'avg accuracy')}
        ${tile(streak(s.days), 'day streak')}
        ${tile(fmtDur(totalSeconds), 'time at the keys')}
        ${tile(totalWords.toLocaleString(), 'words typed')}
        ${tile(s.rush.best, 'rush record')}
      </div>

      <div class="card">
        <h3>Speed over time</h3>
        ${
          s.history.length
            ? `<canvas class="ledger-chart" aria-label="WPM history"></canvas>
               <div class="chart-legend"><span class="lg wpm">wpm per test</span><span class="lg raw">5-test average</span></div>`
            : '<p class="empty">No brews yet. Take a typing test and your progress will be charted here.</p>'
        }
      </div>

      <div class="card loyalty">
        <div class="loyalty-head">
          <h3>Loyalty card</h3>
          <span class="muted">${earned} / ${STAMPS.length} stamps</span>
        </div>
        <div class="stamps">
          ${STAMPS.map((st) => {
            const got = s.stamps[st.id];
            return `<div class="stamp-slot ${got ? 'earned' : ''}" title="${esc(st.desc)}">
              <div class="stamp-ink">${CUP_ICON}<span>${esc(st.name)}</span></div>
              <div class="stamp-desc">${esc(st.desc)}${got ? `<br/><small>${fmtDate(got)}</small>` : ''}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card">
        <h3>Recent orders</h3>
        ${
          s.history.length
            ? `<div class="table-wrap"><table class="orders">
                <thead><tr><th>date</th><th>order</th><th>wpm</th><th>raw</th><th>acc</th><th>time</th></tr></thead>
                <tbody>${s.history
                  .slice(-12)
                  .reverse()
                  .map(
                    (h) => `<tr>
                      <td>${fmtDate(h.date)}</td>
                      <td>${esc(h.label || h.mode)}</td>
                      <td><b>${h.wpm}</b></td>
                      <td>${h.raw}</td>
                      <td>${h.acc}%</td>
                      <td>${h.seconds}s</td>
                    </tr>`,
                  )
                  .join('')}</tbody></table></div>`
            : '<p class="empty">The order book is empty.</p>'
        }
      </div>

      <div class="danger-zone">
        <button class="btn btn-ghost" data-reset>Tear up the ledger (reset all progress)</button>
      </div>
    </section>`;

  root.querySelector('[data-reset]').addEventListener('click', () => {
    if (confirm('Reset all tests, key statistics, rush records and stamps? This cannot be undone.')) {
      store.reset();
      mountLedger(root);
    }
  });

  const canvas = root.querySelector('.ledger-chart');
  if (!canvas) return () => {};
  const data = s.history.slice(-60).map((h, i) => ({ x: i + 1, y: h.wpm }));
  const avg5 = data.map((p, i) => {
    const w = data.slice(Math.max(0, i - 4), i + 1);
    return { x: p.x, y: w.reduce((a, b) => a + b.y, 0) / w.length };
  });
  const draw = () =>
    drawChart(canvas, {
      series: [
        { data, width: 1.5, dots: true },
        { data: avg5, width: 2.5, color: getComputedStyle(canvas).getPropertyValue('--chart-raw').trim(), fill: true },
      ],
      xLabel: (x) => `#${x}`,
      yTitle: 'wpm',
    });
  const ro = new ResizeObserver(draw);
  ro.observe(canvas);
  window.addEventListener('themechange', draw);
  return () => {
    ro.disconnect();
    window.removeEventListener('themechange', draw);
  };
}

function rankLadder(current) {
  return RANKS.map(
    (r, i) =>
      `<li class="${i < current ? 'past' : i === current ? 'now' : ''}" title="${esc(r.title)} · ${r.min}+ wpm"><span>${r.min}</span></li>`,
  ).join('');
}
