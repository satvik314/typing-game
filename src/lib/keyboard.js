// A round-key typewriter keyboard that reacts to typing, guides the next key and shows heatmaps.

const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

const SHIFTED = {
  '!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
  _: '-', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/',
};

export const normalizeKey = (ch) => (ch === ' ' ? ' ' : SHIFTED[ch] ?? ch.toLowerCase());

export function createKeyboard(host) {
  const el = document.createElement('div');
  el.className = 'keyboard';
  el.setAttribute('aria-hidden', 'true');
  const keys = new Map();

  ROWS.forEach((row, r) => {
    const rowEl = document.createElement('div');
    rowEl.className = `kb-row kb-row-${r}`;
    for (const k of row) {
      const key = document.createElement('span');
      key.className = 'key';
      key.innerHTML = `<span class="key-cap">${k}</span>`;
      if (k === 'f' || k === 'j') key.classList.add('homing');
      rowEl.append(key);
      keys.set(k, key);
    }
    el.append(rowEl);
  });

  const spaceRow = document.createElement('div');
  spaceRow.className = 'kb-row';
  const space = document.createElement('span');
  space.className = 'key space';
  space.innerHTML = '<span class="key-cap"></span>';
  spaceRow.append(space);
  el.append(spaceRow);
  keys.set(' ', space);

  host.append(el);
  let guided = null;

  return {
    el,
    press(ch, ok = true) {
      const key = keys.get(normalizeKey(ch));
      if (!key) return;
      key.classList.remove('down', 'miss');
      void key.offsetWidth; // restart the animation
      key.classList.add('down');
      if (!ok) key.classList.add('miss');
      clearTimeout(key._t);
      key._t = setTimeout(() => key.classList.remove('down', 'miss'), 160);
    },
    guide(ch) {
      guided?.classList.remove('guide');
      guided = ch == null ? null : keys.get(normalizeKey(ch)) ?? null;
      guided?.classList.add('guide');
    },
    /** values: { key: 0..1 } — 0 is comfortable, 1 is your worst key. */
    heat(values) {
      el.classList.add('heatmap');
      for (const [k, key] of keys) {
        const v = values[k];
        key.style.setProperty('--heat', v == null ? '0' : v.toFixed(3));
        key.classList.toggle('no-data', v == null && k !== ' ');
      }
    },
  };
}
