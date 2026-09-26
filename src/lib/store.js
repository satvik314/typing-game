// Tiny persistent store backed by localStorage (falls back to memory if storage is blocked).

const KEY = 'typewriter-cafe/v1';

const defaults = () => ({
  settings: {
    sound: true,
    theme: 'latte',
    mode: 'time', // time | words | quote
    time: 30,
    words: 25,
    punctuation: false,
    numbers: false,
    guide: true,
  },
  history: [], // finished tests & drills
  keys: {}, // char -> { hits, misses, time, timed }
  rush: { best: 0, bestLevel: 0, bestServed: 0, games: 0 },
  stamps: {}, // stamp id -> ISO date earned
  days: [], // YYYY-MM-DD strings with at least one finished test
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const saved = JSON.parse(raw);
    const base = defaults();
    return {
      ...base,
      ...saved,
      settings: { ...base.settings, ...saved.settings },
      rush: { ...base.rush, ...saved.rush },
    };
  } catch {
    return defaults();
  }
}

let state = load();

export const store = {
  get state() {
    return state;
  },
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — keep playing in memory */
    }
  },
  setting(key, value) {
    state.settings[key] = value;
    this.save();
  },
  reset() {
    const settings = state.settings;
    state = defaults();
    state.settings = settings;
    this.save();
  },
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Consecutive days practised, ending today or yesterday. */
export function streak(days) {
  if (!days.length) return 0;
  const set = new Set(days);
  const d = new Date();
  const key = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!set.has(key(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(key(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
