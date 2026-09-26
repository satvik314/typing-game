import { store, today, streak } from './store.js';

export const RANKS = [
  { min: 0, title: 'Decaf Dabbler', drink: 'a gentle decaf' },
  { min: 20, title: 'Instant Brewer', drink: 'an instant coffee' },
  { min: 30, title: 'Drip Apprentice', drink: 'a drip coffee' },
  { min: 40, title: 'Pour-Over Pupil', drink: 'a careful pour-over' },
  { min: 55, title: 'French Press Adept', drink: 'a bold French press' },
  { min: 70, title: 'Espresso Artisan', drink: 'a double espresso' },
  { min: 85, title: 'Master Roaster', drink: 'a velvet ristretto' },
  { min: 100, title: 'Legendary Barista', drink: 'rocket-fuel cold brew' },
];

export function rankFor(wpm) {
  let i = 0;
  while (i < RANKS.length - 1 && wpm >= RANKS[i + 1].min) i++;
  return { ...RANKS[i], index: i, next: RANKS[i + 1] ?? null };
}

export const STAMPS = [
  { id: 'first-cup', name: 'First Cup', desc: 'Finish your first typing test' },
  { id: 'double-shot', name: 'Double Shot', desc: 'Reach 40 WPM' },
  { id: 'espresso', name: 'Espresso', desc: 'Reach 60 WPM' },
  { id: 'ristretto', name: 'Ristretto', desc: 'Reach 80 WPM' },
  { id: 'rocket', name: 'Rocket Roast', desc: 'Reach 100 WPM' },
  { id: 'clean-press', name: 'Clean Press', desc: '100% accuracy on a test of 25+ words' },
  { id: 'regular', name: 'The Regular', desc: 'Finish 10 tests' },
  { id: 'daily-grind', name: 'Daily Grind', desc: 'Practise 3 days in a row' },
  { id: 'bottomless', name: 'Bottomless Cup', desc: 'Finish a 120-second test' },
  { id: 'rush-hour', name: 'Rush Hour Hero', desc: 'Serve 40 orders in one Coffee Rush' },
  { id: 'tinkerer', name: 'Tinkerer', desc: 'Finish 3 Workshop drills' },
  { id: 'bean-counter', name: 'Bean Counter', desc: 'Type 2,000 words in total' },
];

const RULES = {
  'first-cup': (s) => s.history.some((h) => h.kind === 'test'),
  'double-shot': (s) => bestWpm(s) >= 40,
  espresso: (s) => bestWpm(s) >= 60,
  ristretto: (s) => bestWpm(s) >= 80,
  rocket: (s) => bestWpm(s) >= 100,
  'clean-press': (s) => s.history.some((h) => h.acc >= 100 && h.words >= 25),
  regular: (s) => s.history.filter((h) => h.kind === 'test').length >= 10,
  'daily-grind': (s) => streak(s.days) >= 3,
  bottomless: (s) => s.history.some((h) => h.mode === 'time' && h.limit >= 120),
  'rush-hour': (s) => s.rush.bestServed >= 40,
  tinkerer: (s) => s.history.filter((h) => h.kind === 'drill').length >= 3,
  'bean-counter': (s) => s.history.reduce((a, h) => a + (h.words || 0), 0) >= 2000,
};

export const bestWpm = (s, filter = () => true) =>
  s.history.filter(filter).reduce((m, h) => Math.max(m, h.wpm), 0);

/** Award any newly earned stamps; returns the stamp definitions that were just earned. */
export function checkStamps() {
  const s = store.state;
  const earned = [];
  for (const stamp of STAMPS) {
    if (!s.stamps[stamp.id] && RULES[stamp.id](s)) {
      s.stamps[stamp.id] = new Date().toISOString();
      earned.push(stamp);
    }
  }
  if (earned.length) store.save();
  return earned;
}

/** Persist a finished test or drill. Returns personal-best info and new stamps. */
export function recordResult(result, kind, label) {
  const s = store.state;
  const sameKind = (h) => h.kind === kind && h.mode === result.mode && h.limit === result.limit;
  const prevBest = bestWpm(s, sameKind);
  const hadPrevious = s.history.some(sameKind);

  s.history.push({
    date: new Date().toISOString(),
    kind,
    label,
    mode: result.mode,
    limit: result.limit,
    wpm: result.wpm,
    raw: result.raw,
    acc: result.acc,
    consistency: result.consistency,
    seconds: Math.round(result.elapsed),
    words: result.wordsTyped,
  });
  if (s.history.length > 1000) s.history.splice(0, s.history.length - 1000);

  for (const [k, v] of Object.entries(result.keyLog)) {
    const t = (s.keys[k] ||= { hits: 0, misses: 0, time: 0, timed: 0 });
    t.hits += v.hits;
    t.misses += v.misses;
    t.time += v.time;
    t.timed += v.timed;
  }

  const d = today();
  if (!s.days.includes(d)) s.days.push(d);
  store.save();

  return {
    pb: hadPrevious && result.wpm > prevBest,
    prevBest,
    stamps: checkStamps(),
  };
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** Rank letters by how much trouble they cause: error rate plus slowness vs. your median key. */
export function weakKeys(keys = store.state.keys, minSamples = 8) {
  const rows = LETTERS.map((k) => {
    const v = keys[k] || { hits: 0, misses: 0, time: 0, timed: 0 };
    const total = v.hits + v.misses;
    return {
      key: k,
      total,
      acc: total ? (v.hits / total) * 100 : null,
      ms: v.timed ? v.time / v.timed : null,
    };
  }).filter((r) => r.total >= minSamples);

  const speeds = rows.map((r) => r.ms).filter(Boolean).sort((a, b) => a - b);
  const median = speeds.length ? speeds[Math.floor(speeds.length / 2)] : 0;
  for (const r of rows) {
    const errRate = 1 - r.acc / 100;
    const slowness = median && r.ms ? Math.max(0, r.ms / median - 1) : 0;
    r.score = errRate * 4 + slowness;
  }
  return rows.sort((a, b) => b.score - a.score);
}

/** Friendly, specific advice for the receipt. */
export function tipsFor(result) {
  const tips = [];
  if (result.acc < 90) {
    tips.push('Your ribbon is running red. Ease off the pace: accuracy comes first and the speed follows.');
  } else if (result.acc < 96) {
    tips.push('Aim for 96%+ accuracy. Each correction costs about as much time as three clean keystrokes.');
  }
  if (result.consistency < 55) {
    tips.push('Your rhythm is uneven. Try a steady, metronome-like tempo, like a slow pour over the grounds.');
  }
  const trouble = Object.entries(result.keyLog)
    .filter(([, v]) => v.misses >= 2)
    .sort((a, b) => b[1].misses - a[1].misses)
    .slice(0, 4)
    .map(([k]) => k);
  if (trouble.length) {
    tips.push(`Trouble keys this round: ${trouble.map((k) => `<kbd>${k}</kbd>`).join(' ')}. Try a Workshop drill to tune them.`);
  }
  if (!tips.length) {
    tips.push(
      result.wpm >= 70
        ? 'A beautifully smooth brew. Try a longer test or switch on punctuation for a stronger roast.'
        : 'Clean and steady. Keep your eyes on the paper, not your hands, and push the tempo a little.',
    );
  }
  return tips.slice(0, 3);
}
