import { WORDS, QUOTES } from './words.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const capitalize = (w) => w.charAt(0).toUpperCase() + w.slice(1);

/** Draw `n` words from `pool`, never repeating the same word twice in a row. */
function draw(pool, n, weights) {
  const out = [];
  const total = weights ? weights.reduce((a, b) => a + b, 0) : 0;
  while (out.length < n) {
    let word;
    if (weights) {
      let r = Math.random() * total;
      let i = 0;
      while (r > weights[i] && i < pool.length - 1) r -= weights[i++];
      word = pool[i];
    } else {
      word = pick(pool);
    }
    if (pool.length > 1 && word === out[out.length - 1]) continue;
    out.push(word);
  }
  return out;
}

/** Random words for the main test, optionally sprinkled with punctuation and numbers. */
export function randomWords(n, { punctuation = false, numbers = false } = {}) {
  const words = draw(WORDS, n);
  if (!punctuation && !numbers) return words;

  let capNext = punctuation;
  return words.map((word, i) => {
    let w = word;
    if (numbers && Math.random() < 0.1) {
      w = String(Math.floor(Math.random() * (Math.random() < 0.5 ? 100 : 10000)));
    }
    if (!punctuation) return w;
    if (capNext) {
      w = capitalize(w);
      capNext = false;
    }
    const isLast = i === n - 1;
    const r = Math.random();
    if (isLast || r < 0.07) {
      w += '.';
      capNext = true;
    } else if (r < 0.17) w += ',';
    else if (r < 0.2) {
      w += '?';
      capNext = true;
    } else if (r < 0.22) {
      w += '!';
      capNext = true;
    } else if (r < 0.24) w += ';';
    else if (r < 0.26) w = `"${w}"`;
    else if (r < 0.28) w = `(${w})`;
    return w;
  });
}

export function randomQuote(exclude) {
  let q;
  do q = pick(QUOTES);
  while (QUOTES.length > 1 && q === exclude);
  return q;
}

/** Nonsense syllables built only from `letters` — used when real words run short. */
function pseudoWords(letters, n) {
  const chars = [...letters];
  return Array.from({ length: n }, () => {
    const len = 2 + Math.floor(Math.random() * 4);
    return Array.from({ length: len }, () => pick(chars)).join('');
  });
}

/** Words that lean heavily on the given focus keys (weak-key drill). */
export function focusWords(focusKeys, n) {
  const keys = [...focusKeys];
  const pool = [];
  const weights = [];
  for (const w of WORDS) {
    const hits = keys.reduce((acc, k) => acc + (w.split(k).length - 1), 0);
    if (hits > 0) {
      pool.push(w);
      weights.push(hits * hits + 0.5);
    }
  }
  if (pool.length < 12) return [...pool, ...pseudoWords(keys.join('') + 'aeiou', n)].slice(0, n);
  return draw(pool, n, weights);
}

/** Words typed only with `allowed` letters that use at least one `focus` letter (row drills). */
export function rowWords(focus, allowed, n) {
  const allowSet = new Set(allowed);
  const pool = WORDS.filter(
    (w) => [...w].every((c) => allowSet.has(c)) && [...focus].some((c) => w.includes(c)),
  );
  if (pool.length >= 10) return draw(pool, n);
  return draw([...pool, ...pseudoWords(focus, 20)], n);
}

export function numberWords(n) {
  return Array.from({ length: n }, () => {
    const r = Math.random();
    if (r < 0.2) return String(Math.floor(Math.random() * 10));
    if (r < 0.6) return String(Math.floor(Math.random() * 1000));
    return String(Math.floor(Math.random() * 100000));
  });
}

/** Words for Coffee Rush, getting longer as the level rises. */
export function rushWord(level, avoidFirstLetters) {
  const min = Math.min(3 + Math.floor(level / 3), 7);
  const max = Math.min(4 + level, 13);
  const pool = WORDS.filter(
    (w) => w.length >= min && w.length <= max && !avoidFirstLetters.has(w[0]),
  );
  return pick(pool.length ? pool : WORDS);
}
