import './styles/base.css';
import './styles/typewriter.css';
import './styles/pages.css';

import { Sound } from './lib/sound.js';
import { store } from './lib/store.js';
import { mountLedger } from './pages/ledger.js';
import { mountRush } from './pages/rush.js';
import { mountTest } from './pages/test.js';
import { mountWorkshop } from './pages/workshop.js';

const ROUTES = {
  test: { label: 'Typing Test', mount: mountTest },
  rush: { label: 'Coffee Rush', mount: mountRush },
  workshop: { label: 'Workshop', mount: mountWorkshop },
  ledger: { label: 'Ledger', mount: mountLedger },
};

const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="29" fill="var(--key)" stroke="var(--brass)" stroke-width="4"/>
  <path d="M19 27h22v7a10 10 0 0 1-10 10h-2a10 10 0 0 1-10-10z" fill="var(--key-text)"/>
  <path d="M41 29.5h2.5a4.5 4.5 0 0 1 0 9H41" fill="none" stroke="var(--key-text)" stroke-width="2.6"/>
  <path d="M25 22c-1.6-1.6 1.6-2.4 0-4.8M30 22c-1.6-1.6 1.6-2.4 0-4.8M35 22c-1.6-1.6 1.6-2.4 0-4.8" fill="none" stroke="var(--key-text)" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

const settings = store.state.settings;
const sound = new Sound(settings.sound);

document.documentElement.dataset.theme = settings.theme;

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <a class="brand" href="#test">
      ${LOGO}
      <span class="brand-text"><span class="brand-name">The Typewriter Café</span><span class="brand-tag">speed typing, freshly brewed</span></span>
    </a>
    <nav class="nav" aria-label="Main">
      ${Object.entries(ROUTES).map(([id, r]) => `<a href="#${id}" data-route="${id}">${r.label}</a>`).join('')}
    </nav>
    <div class="header-tools">
      <button class="icon-btn" data-sound aria-label="Toggle typewriter sounds"></button>
      <button class="icon-btn" data-theme-toggle aria-label="Toggle latte or espresso theme"></button>
    </div>
  </header>
  <main id="view" tabindex="-1"></main>
  <footer class="site-footer">
    <span>Brewed with Vite · progress is kept in this browser only</span>
  </footer>`;

const view = document.querySelector('#view');
const soundBtn = document.querySelector('[data-sound]');
const themeBtn = document.querySelector('[data-theme-toggle]');

function syncTools() {
  soundBtn.textContent = settings.sound ? 'sound: on' : 'sound: off';
  soundBtn.setAttribute('aria-pressed', String(settings.sound));
  themeBtn.textContent = settings.theme === 'latte' ? 'latte' : 'espresso';
}

soundBtn.addEventListener('click', () => {
  store.setting('sound', !settings.sound);
  sound.enabled = settings.sound;
  if (sound.enabled) sound.bell();
  syncTools();
});

themeBtn.addEventListener('click', () => {
  store.setting('theme', settings.theme === 'latte' ? 'espresso' : 'latte');
  document.documentElement.dataset.theme = settings.theme;
  syncTools();
  window.dispatchEvent(new Event('themechange')); // charts redraw in the new palette
});

let unmount = null;
function route() {
  const id = location.hash.replace('#', '') in ROUTES ? location.hash.replace('#', '') : 'test';
  unmount?.();
  view.replaceChildren();
  document.querySelectorAll('[data-route]').forEach((a) => {
    const on = a.dataset.route === id;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `${ROUTES[id].label} · The Typewriter Café`;
  unmount = ROUTES[id].mount(view, { sound }) || null;
}

window.addEventListener('hashchange', route);
syncTools();
route();
