import { assertEquals } from 'jsr:@std/assert@1';

const ORIGIN = 'https://example.test';
const root = new URL('../', import.meta.url);

const keyOf = (request) => new URL(typeof request === 'string' ? request : request.url, ORIGIN).href;

function createStore() {
  const stores = new Map();
  const open = (name) => {
    if (!stores.has(name)) {
      stores.set(name, new Map());
    }
    const entries = stores.get(name);
    return Promise.resolve({
      match: (request) => Promise.resolve(entries.get(keyOf(request))),
      put: (request, response) => {
        entries.set(keyOf(request), response);
        return Promise.resolve();
      },
      add: async (url) => {
        const response = await globalThis.fetch(url);
        if (!response.ok) {
          throw new TypeError('bad response');
        }
        entries.set(keyOf(url), response);
      },
      addAll: async (urls) => {
        for (const url of urls) {
          const response = await globalThis.fetch(url);
          if (!response.ok) {
            throw new TypeError('bad response');
          }
          entries.set(keyOf(url), response);
        }
      },
    });
  };
  return {
    stores,
    caches: {
      open,
      keys: () => Promise.resolve([...stores.keys()]),
      delete: (name) => Promise.resolve(stores.delete(name)),
      match: async (request) => {
        const key = keyOf(request);
        for (const entries of stores.values()) {
          if (entries.has(key)) {
            return entries.get(key);
          }
        }
        return undefined;
      },
    },
  };
}

let loadCount = 0;

async function loadWorker({ offline = false, failingUrls = [] } = {}) {
  const countriesText = await Deno.readTextFile(new URL('data/countries.json', root));
  const { stores, caches } = createStore();
  const listeners = {};
  const fetched = [];

  const fakeSelf = {
    location: new URL(`${ORIGIN}/country_flags/js/sw.js`),
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };
  Object.defineProperty(globalThis, 'self', { value: fakeSelf, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'caches', { value: caches, configurable: true, writable: true });
  globalThis.fetch = (input) => {
    const url = typeof input === 'string' ? input : input.url;
    fetched.push(url);
    if (offline || failingUrls.includes(url)) {
      return Promise.reject(new TypeError('offline'));
    }
    if (url.endsWith('/data/countries.json')) {
      return Promise.resolve(new Response(countriesText));
    }
    return Promise.resolve(new Response(`body:${url}`));
  };

  loadCount += 1;
  await import(`../js/sw.js?t=${loadCount}`);

  const dispatch = async (type, event = {}) => {
    let pending = Promise.resolve();
    await listeners[type]({ ...event, waitUntil: (p) => (pending = p), respondWith: (p) => (pending = p) });
    return pending;
  };

  return { stores, listeners, fetched, dispatch, setOffline: (value) => (offline = value) };
}

function getRequest(url, mode = 'cors') {
  return { url, method: 'GET', mode };
}

Deno.test('install precaches every script and every shell file exists on disk', async () => {
  const worker = await loadWorker();
  await worker.dispatch('install');

  const cached = [...worker.stores.get('app-v1').keys()].map((key) => new URL(key).pathname);
  const scripts = [];
  for await (const entry of Deno.readDir(new URL('js/', root))) {
    if (entry.name.endsWith('.js') && entry.name !== 'sw.js') {
      scripts.push(`/country_flags/js/${entry.name}`);
    }
  }

  for (const script of scripts) {
    assertEquals(cached.includes(script), true, `${script} is not precached`);
  }
  for (const path of cached) {
    const relative = path.replace('/country_flags/', '');
    if (relative) {
      await Deno.stat(new URL(relative, root));
    }
  }
});

Deno.test('activate drops stale caches and precaches every flag', async () => {
  const worker = await loadWorker();
  const staleCache = await caches.open('app-v0');
  await staleCache.put('/old', new Response('old'));

  await worker.dispatch('activate');

  assertEquals(worker.stores.has('app-v0'), false);
  const flags = [...worker.stores.get('flags-v1').keys()].map((key) => key.replace(ORIGIN, ''));
  assertEquals(flags.includes('https://flagcdn.com/al.svg'), true);
  assertEquals(flags.includes('/country_flags/flags/afghanistan.svg'), true);
  assertEquals(flags.includes('https://worldflags.net/assets/img/flags/northern-ireland-flag.png'), true);
});

Deno.test('one flag failing to cache does not stop the rest', async () => {
  const worker = await loadWorker({ failingUrls: ['https://flagcdn.com/al.svg'] });
  await worker.dispatch('activate');

  const flags = [...worker.stores.get('flags-v1').keys()].map((key) => key.replace(ORIGIN, ''));
  assertEquals(flags.includes('https://flagcdn.com/al.svg'), false);
  assertEquals(flags.includes('https://flagcdn.com/dz.svg'), true);
});

Deno.test('a cached flag is served without touching the network', async () => {
  const worker = await loadWorker();
  await worker.dispatch('activate');
  worker.setOffline(true);
  worker.fetched.length = 0;

  const response = await worker.dispatch('fetch', { request: getRequest('https://flagcdn.com/dz.svg') });

  assertEquals(await response.text(), 'body:https://flagcdn.com/dz.svg');
  assertEquals(worker.fetched, []);
});

Deno.test('the app loads offline after install, including navigation', async () => {
  const worker = await loadWorker();
  await worker.dispatch('install');
  worker.setOffline(true);

  const page = await worker.dispatch('fetch', { request: getRequest(`${ORIGIN}/country_flags/`, 'navigate') });
  const script = await worker.dispatch('fetch', { request: getRequest(`${ORIGIN}/country_flags/js/main.js`) });

  assertEquals(await page.text(), `body:/country_flags/index.html`);
  assertEquals(await script.text(), 'body:/country_flags/js/main.js');
});

Deno.test('non-GET and unrelated cross-origin requests are not intercepted', async () => {
  const worker = await loadWorker();
  let responded = false;
  const event = (request) => ({ request, respondWith: () => (responded = true) });

  await worker.listeners.fetch(event({ url: `${ORIGIN}/country_flags/`, method: 'POST', mode: 'cors' }));
  await worker.listeners.fetch(event(getRequest('https://www.googletagmanager.com/gtag/js')));

  assertEquals(responded, false);
});
