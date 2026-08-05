import { createBackend } from './index.js';
import { createSchedulePage } from './scheduling.js';

let authService = null;
let currentUser = null;

const ROUTES = {
  login: {
    label: 'Login',
    icon: '🔐',
    render: renderLoginPage,
  },
  calendar: {
    label: 'Calendar',
    icon: '📅',
    render: () => createSchedulePage(),
  },
  day: {
    label: 'Day',
    icon: '☀️',
    render: () => renderEmptyState('Day', 'A focused daily view will appear here once planning logic is added.'),
  },
  ideas: {
    label: 'Ideas',
    icon: '💡',
    render: () => renderEmptyState('Ideas', 'Collect your creative sparks and notes in this dedicated space.'),
  },
  projects: {
    label: 'Projects',
    icon: '🚀',
    render: () => renderEmptyState('Projects', 'Track high level goals and project dashboards from here.'),
  },
  homework: {
    label: 'Homework',
    icon: '📚',
    render: () => renderEmptyState('Homework', 'Manage tasks, assignments, and studies once the workflow is wired in.'),
  },
  settings: {
    label: 'Settings',
    icon: '⚙️',
    render: () => renderEmptyState('Settings', 'Switch themes, fine-tune the interface, and customize your planner experience.'),
  },
};

const appRoot = document.querySelector('#app');
const STORAGE_KEY = 'workhelper-theme-mode';

function getCurrentRoute() {
  const hash = window.location.hash.replace('#', '').trim().toLowerCase();
  if (hash && ROUTES[hash]) {
    return hash;
  }
  return 'calendar';
}

function shouldRequireAuth(routeKey) {
  if (routeKey === 'login') return false;
  return true;
}

function getEffectiveRoute() {
  const routeKey = getCurrentRoute();
  if (!currentUser && shouldRequireAuth(routeKey)) {
    return 'login';
  }
  return routeKey;
}

function createNavLink(routeKey) {
  const route = ROUTES[routeKey];
  const link = document.createElement('a');
  link.href = `#${routeKey}`;
  link.className = 'nav-item';
  link.dataset.route = routeKey;
  link.innerHTML = `
    <span class="nav-icon" aria-hidden="true">${route.icon}</span>
    <span>${route.label}</span>
  `;
  return link;
}

function createBottomNavLink(routeKey) {
  const route = ROUTES[routeKey];
  const link = document.createElement('a');
  link.href = `#${routeKey}`;
  link.className = 'bottom-nav__item';
  link.dataset.route = routeKey;
  link.innerHTML = `
    <span aria-hidden="true">${route.icon}</span>
    <span>${route.label}</span>
  `;
  return link;
}

function buildShell() {
  const sidebar = document.createElement('aside');
  sidebar.className = 'app-shell__sidebar';
  sidebar.innerHTML = `
    <div class="brand">
      <div class="brand__mark" aria-hidden="true"></div>
      <div class="brand__text">
        <div class="brand__title">WorkHelper</div>
        <div class="brand__subtitle">Phase 2 shell</div>
      </div>
    </div>
  `;

  const navList = document.createElement('nav');
  navList.setAttribute('aria-label', 'Primary navigation');
  const list = document.createElement('div');
  list.className = 'nav-list';

  Object.keys(ROUTES).forEach((routeKey) => {
    const link = createNavLink(routeKey);
    list.appendChild(link);
  });
  navList.appendChild(list);

  const themeToggle = document.createElement('button');
  themeToggle.type = 'button';
  themeToggle.className = 'theme-toggle';
  themeToggle.title = 'Toggle theme';
  themeToggle.setAttribute('aria-label', 'Toggle dark mode');
  themeToggle.textContent = '🌙';
  themeToggle.addEventListener('click', toggleTheme);

  sidebar.appendChild(navList);
  sidebar.appendChild(themeToggle);

  const main = document.createElement('main');
  main.className = 'app-shell__main';
  main.id = 'content';
  main.setAttribute('tabindex', '-1');

  const bottomNav = document.createElement('nav');
  bottomNav.className = 'app-shell__bottom-nav';
  bottomNav.setAttribute('aria-label', 'Mobile navigation');
  const bottomList = document.createElement('div');
  bottomList.className = 'bottom-nav__list';

  Object.keys(ROUTES).forEach((routeKey) => {
    const link = createBottomNavLink(routeKey);
    bottomList.appendChild(link);
  });

  bottomNav.appendChild(bottomList);

  appRoot.appendChild(sidebar);
  appRoot.appendChild(main);
  appRoot.appendChild(bottomNav);
}

function renderLoginPage() {
  const card = document.createElement('section');
  card.className = 'page-card';
  card.innerHTML = `
    <div class="app-shell__header">
      <div>
        <h1 class="page-card__title">Sign in to WorkHelper</h1>
        <p class="page-card__subtitle">Use your Google account to unlock scheduling and Firebase-backed persistence.</p>
      </div>
    </div>
    <div class="empty-state">
      <p class="empty-state__note">You must be authenticated before you can access the scheduler.</p>
      <button class="empty-state__button" type="button">Sign in with Google</button>
    </div>
  `;

  const signInButton = card.querySelector('.empty-state__button');
  signInButton.addEventListener('click', async () => {
    if (!authService || typeof authService.signInWithGoogle !== 'function') {
      alert('Authentication service is not initialized yet. Reload the page.');
      return;
    }

    try {
      await authService.signInWithGoogle();
      window.location.hash = '#calendar';
    } catch (error) {
      alert(error.message || 'Google sign-in failed.');
    }
  });

  return card;
}

function renderEmptyState(title, message) {
  const card = document.createElement('section');
  card.className = 'page-card';
  card.innerHTML = `
    <div class="app-shell__header">
      <div>
        <h1 class="page-card__title">${title}</h1>
        <p class="page-card__subtitle">${message}</p>
      </div>
    </div>
    <div class="empty-state">
      <span class="empty-state__tag">Empty state</span>
      <p class="empty-state__note">This area is intentionally left as a clean placeholder for Phase 2 visual layout. Scheduling data will be added after the shell is complete.</p>
      <button class="empty-state__button" type="button">Explore ${title}</button>
    </div>
  `;
  return card;
}

function updateActiveLinks(routeKey) {
  document.querySelectorAll('.nav-item, .bottom-nav__item').forEach((item) => {
    if (item.dataset.route === routeKey) {
      item.classList.add('nav-item--active', 'bottom-nav__item--active');
    } else {
      item.classList.remove('nav-item--active', 'bottom-nav__item--active');
    }
  });
}

function renderRoute(routeKey) {
  const main = document.querySelector('#content');
  const effectiveRoute = getEffectiveRoute();
  const route = ROUTES[effectiveRoute] || ROUTES.calendar;
  main.innerHTML = '';
  main.appendChild(route.render());
  updateActiveLinks(effectiveRoute);
  main.focus({ preventScroll: true });
}

function setInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const mode = saved || (prefersDark ? 'dark' : 'light');
  document.body.className = `theme-${mode}`;
  const toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.textContent = mode === 'dark' ? '🌙' : '☀️';
    toggle.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

function toggleTheme() {
  const current = document.body.className.includes('light') ? 'light' : 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.className = `theme-${next}`;
  localStorage.setItem(STORAGE_KEY, next);
  setInitialTheme();
}

function initRouting() {
  window.addEventListener('hashchange', () => renderRoute(getCurrentRoute()));
  renderRoute(getCurrentRoute());
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((error) => console.warn('Service worker registration failed:', error));
  }
}

async function hydrateApp() {
  try {
    const backend = await createBackend();
    authService = backend.authService;
    authService.onAuthStateChanged((user) => {
      currentUser = user;
      if (user) {
        window.__workHelperUserId = user.uid;
        localStorage.setItem('workhelper-user-uid', user.uid);
      } else {
        window.__workHelperUserId = null;
        localStorage.removeItem('workhelper-user-uid');
      }
      renderRoute(getCurrentRoute());
    });
  } catch (error) {
    console.error('Failed to initialize backend:', error);
  }

  buildShell();
  setInitialTheme();
  initRouting();
  registerServiceWorker();
}

hydrateApp();
