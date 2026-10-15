const VERSION = 'v1';
const APP_CACHE = `app-${VERSION}`;
const FLAG_CACHE = `flags-${VERSION}`;
const BASE = '/country_flags/';
const FLAG_HOSTS = ['flagcdn.com', 'worldflags.net'];

const APP_SHELL = [
  BASE,
  `${BASE}index.html`,
  `${BASE}styles.css`,
  `${BASE}manifest.json`,
  `${BASE}data/countries.json`,
  `${BASE}icons/favicon.ico`,
  `${BASE}icons/favicon-16x16.png`,
  `${BASE}icons/favicon-32x32.png`,
  `${BASE}icons/apple-touch-icon.png`,
  `${BASE}icons/android-chrome-192x192.png`,
  `${BASE}icons/android-chrome-512x512.png`,
  `${BASE}js/answers_table.js`,
  `${BASE}js/country_flag.js`,
  `${BASE}js/datalist.js`,
  `${BASE}js/flags_game.js`,
  `${BASE}js/game_state.js`,
  `${BASE}js/main.js`,
  `${BASE}js/persistence.js`,
  `${BASE}js/pwa.js`,
  `${BASE}js/rating.js`,
  `${BASE}js/share.js`,
  `${BASE}js/study.js`,
  `${BASE}js/view_mode.js`,
];

function flagUrls(countries) {
  return Object.values(countries).flatMap((country) => {
    if (country.flagFile) {
      return [`${BASE}${country.flagFile}`];
    }
    if (country.iso) {
      return [`https://flagcdn.com/${country.iso}.svg`];
    }
    if (country.flagSlug) {
      return [`https://worldflags.net/assets/img/flags/${country.flagSlug}-flag.png`];
    }
    return [];
  });
}

async function cacheFlag(cache, url) {
  if (await cache.match(url)) {
    return;
  }
  try {
    await cache.add(url);
  } catch {
    const response = await fetch(url, { mode: 'no-cors' });
    await cache.put(url, response);
  }
}

async function precacheFlags() {
  const cache = await caches.open(FLAG_CACHE);
  const countries = await (await fetch(`${BASE}data/countries.json`)).json();
  await Promise.allSettled(flagUrls(countries).map((url) => cacheFlag(cache, url)));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await cache.addAll([...new Set(APP_SHELL)]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [APP_CACHE, FLAG_CACHE];
    const names = await caches.keys();
    await Promise.all(names.filter((name) => !keep.includes(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
    await precacheFlags();
  })());
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const refresh = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  if (cached) {
    refresh.catch(() => {});
    return cached;
  }
  return refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }
  const url = new URL(request.url);

  if (FLAG_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request, FLAG_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith(`${BASE}flags/`)) {
    event.respondWith(cacheFirst(request, FLAG_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      staleWhileRevalidate(`${BASE}index.html`).catch(() => caches.match(`${BASE}index.html`)),
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
