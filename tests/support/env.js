import { JSDOM } from 'npm:jsdom@25';

const indexHtml = await Deno.readTextFile(new URL('../../index.html', import.meta.url));

// Rebuilds a fresh jsdom document from the real index.html so DOM lookups in
// flags_game.js match production markup, and points the globals it expects
// (document, window, navigator, Event) at it. Pass resetStorage: false to keep
// the existing localStorage across the swap, simulating a page reload rather
// than a brand new visit.
export function setupDom({ resetStorage = true } = {}) {
  const dom = new JSDOM(indexHtml, { url: 'http://localhost/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.navigator = dom.window.navigator;
  globalThis.Event = dom.window.Event;
  // Deno provides its own real, disk-persisted `localStorage` global, and it
  // can't be swapped out for jsdom's -- persistence.js reads/writes this one
  // directly. Clear it explicitly unless the test wants to keep it, to
  // simulate a page reload rather than a brand new visit.
  if (resetStorage) {
    localStorage.clear();
  }
}

let importCount = 0;

// Dynamically (re)imports the app's entry point (main.js -- it wires the DOM
// event listeners and calls initGame(), then re-exports everything from
// flags_game.js) with a cache-busting query string so each call re-runs that
// top-level setup against whatever DOM/localStorage globals are currently
// installed -- the module cache would otherwise return the same
// already-initialized instance.
export function importGame() {
  importCount += 1;
  return import(`../../js/main.js?t=${importCount}`);
}
