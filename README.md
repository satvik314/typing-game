# The Typewriter Café ☕

A typing game with an antique typewriter look and a coffee-house palette. It measures your typing speed and helps you improve it. Built with plain JavaScript and [Vite](https://vite.dev). It has no runtime dependencies, and every sound is synthesised in the browser.

## Features

### Typing Test
- **Timed** (15 / 30 / 60 / 120 s), **Words** (10 / 25 / 50 / 100) and **Quote** modes. Quotes are public-domain lines from classic literature.
- Optional **punctuation** and **numbers**, plus a **guide keys** mode that lights up the next key on the keyboard.
- Text is typed onto a sheet of paper. Correct letters strike in black ink and mistakes in red ribbon ink, each with a slight typewriter wobble. At the end of each line you hear a carriage return and the paper feeds up.
- A round-key typewriter keyboard that presses down as you type.
- Results come on a **café receipt**: WPM, raw speed, accuracy, consistency, a character breakdown, a speed-over-time chart with error marks, a "Personal Best" stamp, and specific tips from the barista.

### Coffee Rush (arcade)
Order tickets slide down the rail. Type each one before it hits the counter. Every missed ticket knocks over a cup, and after five spills the café closes. Chaining orders without mistakes builds a tip multiplier up to ×5. Every 10 orders the rush speeds up and the words get longer.

### Workshop (improve)
Every keystroke is logged per key. The Workshop shows a **heatmap** of your stickiest keys, ranked by error rate and by how slow each key is compared with your median. It then offers drills:
- **Sticky-Key Blend**: custom words built around your weakest keys, with before/after accuracy for each one.
- **Home Row Roast**, **Top Row Blend**, **Bottom Row Brew**, **Number Grind** and **Punctuation Pour**.

### Ledger (progress)
- Rank titles from *Decaf Dabbler* up to *Legendary Barista*, with a progress bar to the next one.
- Totals, averages, day streak, a speed-over-time chart and recent tests.
- A kraft-paper **loyalty card** with 12 stamps to collect.

### Extras
- **Latte** (light) and **Espresso** (dark) themes.
- Web Audio typewriter sounds: key clacks, the space bar, error thunks, the carriage return and the bell. They can be switched off.
- Progress is saved in `localStorage`, so no account is needed.
- Responsive layout, keyboard-first controls, and support for reduced motion.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Tab` | New sheet (restart) |
| `Enter` | Next test from the results receipt |
| `Backspace` on an empty word | Go back and fix a mistyped previous word |
| `Esc` | Coffee Rush: drop the current order · Workshop: back to the drill list |

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build in dist/
npm run preview  # serve the production build
```

## Project structure

```
index.html
public/favicon.svg
src/
  main.js            app shell, router, theme & sound toggles
  lib/
    engine.js        typing engine: rendering, keystrokes, WPM/accuracy/consistency
    keyboard.js      typewriter keyboard (press, guide, heatmap)
    sound.js         synthesised typewriter sounds (Web Audio)
    chart.js         canvas line chart
    progress.js      ranks, stamps, weak-key analysis, tips
    store.js         localStorage persistence
    text.js          word, quote and drill generators
    words.js         word list and quotes
    ui.js            typewriter shell, receipt, toasts
  pages/             test, rush, workshop, ledger
  styles/            base, typewriter and page styles
```

## How scores are calculated

- **WPM**: characters in correctly typed words, plus the spaces after them, divided by 5, per minute.
- **Raw**: every character you typed, including mistakes, divided by 5, per minute.
- **Accuracy**: correct keystrokes ÷ all keystrokes.
- **Consistency**: `100 × (1 − σ/μ)` of your per-second raw speed.
