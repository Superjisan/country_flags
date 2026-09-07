import { assert, assertEquals, assertMatch } from 'jsr:@std/assert@1';
import { setupDom, importGame } from './support/env.js';

const HIDDEN_IN_SHARED_VIEW = [
  'flag-container',
  'input-div',
  'buttons-div',
  'mode-toggle',
  'rating-buttons',
  'study-controls',
  'answers-table',
  'score',
  'progress',
];

const WORLD_RATING_HASH = '#ct=wo&r=eyJTIjpbMCw2XX0=';

Deno.test('a shared rating url leaves only the summary and the create-your-own button on screen', async () => {
  setupDom();
  window.location.hash = WORLD_RATING_HASH;
  await importGame();

  HIDDEN_IN_SHARED_VIEW.forEach((id) => {
    assertEquals(document.getElementById(id).hidden, true, `#${id} should be hidden in the shared view`);
  });
  assertEquals(document.getElementById('share').hidden, true);
  assertEquals(document.getElementById('rate-own-flag').hidden, false);
  assertEquals(document.getElementById('page-title').textContent, 'Country Ratings');
  assertEquals(document.getElementById('intro').hidden, true);

  assertEquals(document.getElementById('continent-buttons').hidden, false);
  assertEquals(document.getElementById('world').disabled, false);
  assertEquals(document.getElementById('world').classList.contains('active'), true);
  const lockedOut = [...document.querySelectorAll('.continent-btn')]
    .filter((button) => !button.disabled)
    .map((button) => button.id);
  assertEquals(lockedOut, ['world']);

  document.getElementById('world').click();
  assertEquals(document.getElementById('flag-container').hidden, true, 'the shared view survives a click on its own continent');
  assertMatch(document.getElementById('feedback').innerHTML, /World flag ratings/);
});

Deno.test('create your own rating switches to rate mode and drops the shared hash from the url', async () => {
  setupDom();
  window.location.hash = WORLD_RATING_HASH;
  await importGame();

  document.getElementById('rate-own-flag').click();

  assertEquals(window.location.hash, '');
  assertEquals(document.getElementById('rate-mode').classList.contains('active'), true);
  assertEquals(document.getElementById('play-mode').classList.contains('active'), false);
  assertEquals(document.getElementById('study-mode').classList.contains('active'), false);

  assertEquals(document.getElementById('rate-own-flag').hidden, true);
  assertEquals(document.getElementById('page-title').textContent, 'Country Flags Game');
  assertEquals(document.getElementById('intro').hidden, false);
  assertEquals(document.getElementById('mode-toggle').hidden, false);
  assertEquals(document.getElementById('continent-buttons').hidden, false);
  assertEquals(document.getElementById('flag-container').hidden, false);
  assertEquals(document.getElementById('rating-buttons').hidden, false);
  assertEquals([...document.querySelectorAll('.continent-btn')].every((button) => !button.disabled), true);
  assertEquals(document.getElementById('buttons-div').hidden, true);
  assertEquals(document.getElementById('answers-table').hidden, true);
  assert(document.getElementById('country-flag').src.length > 0);
});
