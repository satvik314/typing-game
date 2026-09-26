// A small canvas line chart, inked in the page's coffee palette.

const css = (el, name, fallback) => getComputedStyle(el).getPropertyValue(name).trim() || fallback;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ series: {data:{x:number,y:number}[], color?:string, dash?:number[], width?:number, fill?:boolean}[],
 *           markers?: {x:number,y:number,size:number}[], xLabel?:(x:number)=>string, yTitle?:string }} opts
 */
export function drawChart(canvas, { series, markers = [], xLabel = (x) => x, yTitle = '' }) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const ink = css(canvas, '--chart-ink', '#2b1b12');
  const faint = css(canvas, '--chart-grid', 'rgba(60,40,25,.15)');
  const red = css(canvas, '--ribbon-red', '#a3261c');
  const font = '12px "Courier Prime", "Courier New", monospace';

  const all = series.flatMap((s) => s.data);
  if (!all.length) return;
  const xMin = Math.min(...all.map((p) => p.x));
  const xMax = Math.max(...all.map((p) => p.x), xMin + 1);
  const yMaxRaw = Math.max(...all.map((p) => p.y), 10);
  const step = [10, 20, 25, 50, 100, 200, 250, 500].find((n) => yMaxRaw / n <= 6) ?? 1000;
  const yMax = Math.ceil(yMaxRaw / step) * step;

  const pad = { l: yTitle ? 54 : 40, r: 12, t: 14, b: 26 };
  const X = (x) => pad.l + ((x - xMin) / (xMax - xMin)) * (w - pad.l - pad.r);
  const Y = (y) => pad.t + (1 - y / yMax) * (h - pad.t - pad.b);

  // Grid
  ctx.font = font;
  ctx.fillStyle = ink;
  ctx.strokeStyle = faint;
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = 0; y <= yMax; y += step) {
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(y));
    ctx.lineTo(w - pad.r, Y(y));
    ctx.stroke();
    ctx.globalAlpha = 0.7;
    ctx.fillText(String(y), pad.l - 8, Y(y));
    ctx.globalAlpha = 1;
  }
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const span = xMax - xMin;
  const ticks = Math.min(8, Math.max(1, Math.floor((w - pad.l) / 70)), Math.max(1, Math.ceil(span)));
  for (let i = 0; i <= ticks; i++) {
    const x = xMin + (span * i) / ticks;
    ctx.globalAlpha = 0.7;
    ctx.fillText(xLabel(span < 8 ? Math.round(x * 10) / 10 : Math.round(x)), X(x), h - pad.b + 8);
    ctx.globalAlpha = 1;
  }
  if (yTitle) {
    ctx.save();
    ctx.translate(11, pad.t + (h - pad.t - pad.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.6;
    ctx.fillText(yTitle, 0, 0);
    ctx.restore();
  }

  // Series
  for (const s of series) {
    if (!s.data.length) continue;
    const color = s.color || ink;
    if (s.fill) {
      ctx.beginPath();
      ctx.moveTo(X(s.data[0].x), Y(0));
      s.data.forEach((p) => ctx.lineTo(X(p.x), Y(p.y)));
      ctx.lineTo(X(s.data[s.data.length - 1].x), Y(0));
      ctx.closePath();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.setLineDash(s.dash || []);
    ctx.strokeStyle = color;
    ctx.lineWidth = s.width || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    s.data.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
    ctx.stroke();
    ctx.setLineDash([]);
    if (s.data.length === 1 || s.dots) {
      ctx.fillStyle = color;
      s.data.forEach((p) => {
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  // Error markers: little red crosses, like strikes of the red ribbon.
  ctx.strokeStyle = red;
  ctx.lineWidth = 2;
  for (const m of markers) {
    const r = 3 + Math.min(m.size, 4);
    const cx = X(m.x);
    const cy = Y(m.y);
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r);
    ctx.lineTo(cx + r, cy + r);
    ctx.moveTo(cx + r, cy - r);
    ctx.lineTo(cx - r, cy + r);
    ctx.stroke();
  }
}
