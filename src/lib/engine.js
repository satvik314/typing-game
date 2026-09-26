// The typing engine: renders words onto the paper, tracks keystrokes and computes results.

const JITTER = [-0.6, 0.3, -0.2, 0.5, 0, -0.4, 0.2];

export class TypingTest {
  /**
   * @param {object} o
   * @param {HTMLElement} o.viewport  element the words are rendered in
   * @param {HTMLInputElement} o.input hidden input that receives keystrokes
   */
  constructor(o) {
    this.o = o;
    this.viewport = o.viewport;
    this.input = o.input;
    this.inner = document.createElement('div');
    this.inner.className = 'words';
    this.caret = document.createElement('div');
    this.caret.className = 'caret';
    this.viewport.replaceChildren(this.inner);

    this.onInput = this.onInput.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onPaste = (e) => e.preventDefault();
    this.onResize = () => this.placeCaret(false);
    this.input.addEventListener('input', this.onInput);
    this.input.addEventListener('keydown', this.onKeyDown);
    this.input.addEventListener('paste', this.onPaste);
    window.addEventListener('resize', this.onResize);
  }

  destroy() {
    clearInterval(this.timer);
    this.input.removeEventListener('input', this.onInput);
    this.input.removeEventListener('keydown', this.onKeyDown);
    this.input.removeEventListener('paste', this.onPaste);
    window.removeEventListener('resize', this.onResize);
  }

  /** @param {{mode:'time'|'words'|'quote', limit:number, words:string[], more?:()=>string[]}} cfg */
  setup(cfg) {
    clearInterval(this.timer);
    this.cfg = cfg;
    this.words = [...cfg.words];
    this.typed = [];
    this.idx = 0;
    this.cur = '';
    this.started = false;
    this.finished = false;
    this.keystrokes = 0;
    this.correctKeys = 0;
    this.rawChars = 0;
    this.secChars = 0;
    this.secErrors = 0;
    this.samples = [];
    this.keyLog = {};
    this.lastKeyAt = 0;
    this.input.value = '';

    this.inner.replaceChildren();
    this.inner.style.transform = '';
    this.wordEls = [];
    this.appendWords(this.words);
    this.inner.append(this.caret);
    this.wordEls[0]?.classList.add('active');
    this.caret.classList.remove('typing');
    requestAnimationFrame(() => this.placeCaret(false));
    this.guide();
    this.emitTick(0);
  }

  appendWords(list) {
    const frag = document.createDocumentFragment();
    for (const w of list) {
      const i = this.wordEls.length;
      const el = document.createElement('span');
      el.className = 'word';
      for (let j = 0; j < w.length; j++) {
        const l = document.createElement('span');
        l.className = 'l';
        l.textContent = w[j];
        l.style.setProperty('--j', `${JITTER[(i * 3 + j * 5) % JITTER.length]}px`);
        el.append(l);
      }
      this.wordEls.push(el);
      frag.append(el);
    }
    if (this.caret.parentNode === this.inner) this.inner.insertBefore(frag, this.caret);
    else this.inner.append(frag);
  }

  start() {
    this.started = true;
    this.startAt = performance.now();
    this.lastSecond = 0;
    this.o.onStart?.();
    this.timer = setInterval(() => this.tick(), 100);
  }

  elapsed() {
    return this.started ? (performance.now() - this.startAt) / 1000 : 0;
  }

  tick() {
    const t = this.elapsed();
    while (t >= this.lastSecond + 1) {
      this.lastSecond++;
      this.pushSample(this.lastSecond, 1);
    }
    if (this.cfg.mode === 'time' && t >= this.cfg.limit) {
      this.finish();
      return;
    }
    this.emitTick(t);
  }

  pushSample(t, span) {
    this.samples.push({
      t,
      wpm: Math.round(this.correctWordChars(true) / 5 / (t / 60)),
      raw: Math.round((this.secChars / 5) * (60 / span)),
      errors: this.secErrors,
    });
    this.secChars = 0;
    this.secErrors = 0;
  }

  emitTick(t) {
    const minutes = t / 60;
    this.o.onTick?.({
      elapsed: t,
      remaining: this.cfg.mode === 'time' ? Math.max(0, this.cfg.limit - t) : null,
      wpm: minutes > 0.02 ? Math.round(this.correctWordChars(true) / 5 / minutes) : 0,
      acc: this.keystrokes ? Math.round((this.correctKeys / this.keystrokes) * 100) : 100,
      done: this.idx,
      total: this.words.length,
    });
  }

  /** Characters that count toward WPM: fully-correct words plus their spaces. */
  correctWordChars(includePartial) {
    let n = 0;
    for (let i = 0; i < this.idx; i++) {
      if (this.typed[i] === this.words[i]) n += this.words[i].length + 1;
    }
    if (includePartial && this.cur) {
      const target = this.words[this.idx];
      if (target.startsWith(this.cur)) n += this.cur.length;
    }
    return n;
  }

  onKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      this.o.onRestart?.();
      return;
    }
    // Backspace on an empty word steps back into a mistyped previous word.
    if (e.key === 'Backspace' && this.input.value === '' && !this.finished && this.idx > 0) {
      const prev = this.idx - 1;
      const el = this.wordEls[prev];
      if (this.typed[prev] !== this.words[prev] && el.isConnected) {
        e.preventDefault();
        this.wordEls[this.idx].classList.remove('active');
        this.idx = prev;
        this.cur = this.typed[prev];
        this.typed.length = prev;
        this.input.value = this.cur;
        el.classList.remove('typed', 'error');
        el.classList.add('active');
        this.renderWord(prev);
        this.placeCaret();
        this.guide();
        this.o.sound?.backspace();
      }
    }
  }

  onInput() {
    if (this.finished) {
      this.input.value = '';
      return;
    }
    let val = this.input.value;
    if (!val && !this.cur) return;
    if (!this.started && val.trim()) this.start();

    const spaceAt = val.search(/[ \n]/);
    if (spaceAt !== -1) {
      this.applyTyped(val.slice(0, spaceAt));
      this.input.value = '';
      if (this.cur.length) this.commitWord(true);
      else this.cur = '';
      return;
    }

    const target = this.words[this.idx];
    if (val.length > target.length + 10) {
      val = val.slice(0, target.length + 10);
      this.input.value = val;
    }
    this.applyTyped(val);

    // Finish words/quote tests the moment the last word is typed correctly.
    if (this.cfg.mode !== 'time' && this.idx === this.words.length - 1 && this.cur === target) {
      this.commitWord(false);
      this.finish();
    }
  }

  applyTyped(val) {
    const prev = this.cur;
    if (val === prev) return;
    const target = this.words[this.idx];
    if (val.length > prev.length && val.startsWith(prev)) {
      for (let i = prev.length; i < val.length; i++) this.registerKey(val[i], target[i]);
    } else if (val.length < prev.length && prev.startsWith(val)) {
      this.o.sound?.backspace();
    } else {
      // Autocorrect or IME replaced the text; score only the last character.
      this.registerKey(val[val.length - 1], target[val.length - 1]);
    }
    this.cur = val;
    this.renderWord(this.idx);
    this.placeCaret();
    this.guide();
  }

  registerKey(ch, expected) {
    const now = performance.now();
    const ok = ch === expected;
    this.keystrokes++;
    this.rawChars++;
    this.secChars++;
    if (ok) this.correctKeys++;
    else this.secErrors++;

    if (expected !== undefined) {
      const k = expected.toLowerCase();
      const s = (this.keyLog[k] ||= { hits: 0, misses: 0, time: 0, timed: 0 });
      if (ok) {
        s.hits++;
        const dt = now - this.lastKeyAt;
        if (this.lastKeyAt && dt < 1500) {
          s.time += dt;
          s.timed++;
        }
      } else s.misses++;
    }
    this.lastKeyAt = now;
    if (ok) this.o.sound?.key();
    else this.o.sound?.error();
    this.o.keyboard?.press(ch, ok);
    this.caret.classList.add('typing');
    clearTimeout(this.caretIdle);
    this.caretIdle = setTimeout(() => this.caret.classList.remove('typing'), 600);
  }

  commitWord(withSpace) {
    const i = this.idx;
    this.typed[i] = this.cur;
    const el = this.wordEls[i];
    const correct = this.cur === this.words[i];
    el.classList.remove('active');
    el.classList.add('typed');
    el.classList.toggle('error', !correct);
    this.renderWord(i, true);

    if (withSpace) {
      this.keystrokes++;
      this.correctKeys++;
      this.rawChars++;
      this.secChars++;
      this.lastKeyAt = performance.now();
      this.o.sound?.space();
      this.o.keyboard?.press(' ', true);
    }

    this.cur = '';
    this.idx++;

    if (this.idx >= this.words.length) {
      if (this.cfg.mode === 'time' && this.cfg.more) {
        const extra = this.cfg.more();
        this.words.push(...extra);
        this.appendWords(extra);
      } else {
        this.finish();
        return;
      }
    }
    if (this.cfg.mode === 'time' && this.cfg.more && this.words.length - this.idx < 30) {
      const extra = this.cfg.more();
      this.words.push(...extra);
      this.appendWords(extra);
    }

    const next = this.wordEls[this.idx];
    next.classList.add('active');
    if (next.offsetTop > el.offsetTop + 2) this.newLine();
    this.placeCaret();
    this.guide();
    this.o.onProgress?.(this.idx, this.words.length);
  }

  /** Carriage return: ding, feed the paper up a line once the typing line is the third one. */
  newLine() {
    this.o.sound?.carriage();
    const active = this.wordEls[this.idx];
    const lineH = active.offsetHeight + parseFloat(getComputedStyle(active).marginBottom || 0);
    const firstTop = this.inner.firstElementChild.offsetTop;
    if (active.offsetTop - firstTop < lineH * 1.5) return;
    // Drop the oldest line from the page so the typing line stays in view.
    // Measure everything first: removing a word reflows the rest of the page.
    const oldLine = [];
    for (const w of this.wordEls) {
      if (!w.isConnected) continue;
      if (w.offsetTop < firstTop + lineH / 2) oldLine.push(w);
      else break;
    }
    oldLine.forEach((w) => w.remove());
    const inner = this.inner;
    inner.style.transition = 'none';
    inner.style.transform = `translateY(${lineH}px)`;
    void inner.offsetHeight;
    inner.style.transition = '';
    inner.style.transform = '';
  }

  renderWord(i, committed = false) {
    const el = this.wordEls[i];
    const target = this.words[i];
    const typed = i === this.idx && !committed ? this.cur : this.typed[i] ?? '';
    const letters = el.children;
    for (let j = 0; j < target.length; j++) {
      let s = '';
      if (j < typed.length) s = typed[j] === target[j] ? 'ok' : 'bad';
      else if (committed) s = 'missed';
      const span = letters[j];
      if (span.dataset.s !== s) {
        span.className = `l ${s}${s === 'ok' || s === 'bad' ? ' stamp' : ''}`;
        span.dataset.s = s;
      }
    }
    // Extra letters beyond the word's length.
    const extra = Math.max(0, typed.length - target.length);
    while (letters.length > target.length + extra) el.lastChild.remove();
    for (let j = target.length; j < target.length + extra; j++) {
      if (!letters[j]) {
        const l = document.createElement('span');
        l.className = 'l extra stamp';
        el.append(l);
      }
      letters[j].textContent = typed[j];
    }
  }

  placeCaret(animate = true) {
    const el = this.wordEls?.[this.idx];
    if (!el || this.finished) return;
    const letters = el.children;
    const n = this.cur.length;
    let x;
    let y;
    if (n < letters.length) {
      x = letters[n].offsetLeft;
      y = letters[n].offsetTop;
    } else {
      const last = letters[letters.length - 1];
      x = last.offsetLeft + last.offsetWidth;
      y = last.offsetTop;
    }
    this.caret.style.transition = animate ? '' : 'none';
    this.caret.style.transform = `translate(${x}px, ${y}px)`;
  }

  guide() {
    const target = this.words[this.idx];
    if (!target) return this.o.keyboard?.guide(null);
    this.o.keyboard?.guide(this.cur.length >= target.length ? ' ' : target[this.cur.length]);
  }

  finish() {
    if (this.finished) return;
    clearInterval(this.timer);
    this.finished = true;
    this.o.keyboard?.guide(null);
    const isTime = this.cfg.mode === 'time';
    const elapsed = isTime ? this.cfg.limit : Math.max(this.elapsed(), 0.5);
    if (elapsed - this.lastSecond > 0.3 || !this.samples.length) {
      this.pushSample(+elapsed.toFixed(1), Math.max(elapsed - this.lastSecond, 0.3));
    }

    const chars = { correct: 0, incorrect: 0, extra: 0, missed: 0 };
    const tally = (target, typed, committed) => {
      for (let j = 0; j < Math.max(target.length, typed.length); j++) {
        if (j >= target.length) chars.extra++;
        else if (j >= typed.length) {
          if (committed) chars.missed++;
        } else if (typed[j] === target[j]) chars.correct++;
        else chars.incorrect++;
      }
    };
    for (let i = 0; i < this.idx; i++) tally(this.words[i], this.typed[i], true);
    if (this.cur && this.idx < this.words.length) tally(this.words[this.idx], this.cur, false);

    const minutes = elapsed / 60;
    const raws = this.samples.map((s) => s.raw);
    const mean = raws.reduce((a, b) => a + b, 0) / (raws.length || 1);
    const sd = Math.sqrt(raws.reduce((a, b) => a + (b - mean) ** 2, 0) / (raws.length || 1));

    const result = {
      mode: this.cfg.mode,
      limit: this.cfg.limit,
      wpm: Math.round(this.correctWordChars(isTime) / 5 / minutes),
      raw: Math.round(this.rawChars / 5 / minutes),
      acc: this.keystrokes ? Math.round((this.correctKeys / this.keystrokes) * 1000) / 10 : 0,
      consistency: mean ? Math.max(0, Math.round(100 * (1 - sd / mean))) : 0,
      elapsed,
      chars,
      samples: this.samples,
      keyLog: this.keyLog,
      wordsTyped: this.typed.filter((t, i) => t === this.words[i]).length,
      keystrokes: this.keystrokes,
    };
    this.emitTick(elapsed);
    this.o.onFinish?.(result);
  }
}
