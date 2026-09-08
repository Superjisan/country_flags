import { assertEquals } from 'jsr:@std/assert@1';
import { setupDom, importGame } from './support/env.js';

// Captures every window.gtag('event', name, params) call made during a test.
function stubGtag() {
  const calls = [];
  window.gtag = (...args) => calls.push(args);
  return calls;
}

Deno.test('choosing a continent tracks select_continent with the continent id', async () => {
  setupDom();
  await importGame();
  const calls = stubGtag();

  document.getElementById('oceania').click();

  assertEquals(calls, [['event', 'select_continent', { continent: 'oceania' }]]);
});

Deno.test('switching to study, rate, then play mode tracks select_mode for each', async () => {
  setupDom();
  await importGame();
  const calls = stubGtag();

  document.getElementById('study-mode').click();
  document.getElementById('rate-mode').click();
  document.getElementById('play-mode').click();

  assertEquals(calls, [
    ['event', 'select_mode', { mode: 'study' }],
    ['event', 'select_mode', { mode: 'rate' }],
    ['event', 'select_mode', { mode: 'play' }],
  ]);
});

Deno.test('skipping tracks skip_flag with the current country and continent', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');
  const calls = stubGtag();

  const country = document.getElementById('country').innerText;
  document.getElementById('skip').click();

  assertEquals(calls, [['event', 'skip_flag', { country, mode: 'oceania' }]]);
});

Deno.test('rating a flag tracks rate_flag with the country and chosen tier', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');
  document.getElementById('rate-mode').click();
  const calls = stubGtag();

  const country = document.getElementById('country').innerText;
  document.querySelector('[data-tier="A"]').click();

  assertEquals(calls, [['event', 'rate_flag', { country, tier: 'A' }]]);
});

Deno.test('clicks still work when gtag is not defined (analytics blocked or not loaded)', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');
  // window.gtag is intentionally left undefined -- jsdom never runs the
  // inline <script> in index.html that defines it in production, and a real
  // visitor may have it blocked. Tracking calls must be a silent no-op, not a
  // thrown error that breaks the underlying action.
  assertEquals(typeof window.gtag, 'undefined');

  document.getElementById('skip').click();
  assertEquals(document.getElementById('score').innerText, 'Score: 0');
  assertEquals(String(document.getElementById('progress-value').innerText), '1');

  document.getElementById('rate-mode').click();
  assertEquals(document.getElementById('rating-buttons').hidden, false);

  document.querySelector('[data-tier="S"]').click();
  assertEquals(String(document.getElementById('progress-value').innerText), '1');

  document.getElementById('study-mode').click();
  assertEquals(document.getElementById('study-mode').classList.contains('active'), true);

  document.getElementById('africa').click();
  assertEquals(document.getElementById('africa').classList.contains('active'), true);
});
