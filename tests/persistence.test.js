import { assertEquals, assertNotEquals } from 'jsr:@std/assert@1';
import { MODE_DATASETS } from '../js/game_state.js';
import { setupDom, importGame } from './support/env.js';
import { answerCurrentCountry } from './support/play.js';

const OCEANIA_COUNT = MODE_DATASETS.oceania.length;

Deno.test('a fresh visit with no saved state starts a new World game', async () => {
  setupDom();
  await importGame();
  assertEquals(document.getElementById('world').classList.contains('active'), true);
  assertNotEquals(document.getElementById('country').innerText, '');
});

Deno.test('corrupted localStorage is ignored, falling back to a fresh game', async () => {
  setupDom();
  localStorage.setItem('countryFlagsGameState', '{ not valid json');
  await importGame();
  assertEquals(document.getElementById('world').classList.contains('active'), true);
});

Deno.test('a saved state naming an unknown mode is ignored', async () => {
  setupDom();
  localStorage.setItem('countryFlagsGameState', JSON.stringify({ mode: 'atlantis', countriesPlayed: [] }));
  await importGame();
  assertEquals(document.getElementById('world').classList.contains('active'), true);
});

Deno.test('progress survives leaving and reopening the tab', async () => {
  setupDom();
  let game = await importGame();
  game.switchMode('oceania');
  answerCurrentCountry(game);
  answerCurrentCountry(game, { skip: true });

  const countryBeforeReload = document.getElementById('country').innerText;
  const scoreBeforeReload = document.getElementById('score').innerText;

  // simulate closing the tab and reopening it later: fresh document and fresh
  // module instance, but the same underlying localStorage.
  setupDom({ resetStorage: false });
  game = await importGame();

  assertEquals(document.getElementById('oceania').classList.contains('active'), true);
  // jsdom's innerText doesn't stringify numeric assignments the way real browsers do
  assertEquals(String(document.getElementById('progress-value').innerText), '2');
  assertEquals(String(document.getElementById('total-countries').innerText), String(OCEANIA_COUNT));
  assertEquals(document.getElementById('score').innerText, scoreBeforeReload);
  assertEquals(document.getElementById('country').innerText, countryBeforeReload);
  assertEquals(document.getElementById('country-flag').src, game.flagUrl(countryBeforeReload));
  assertEquals(document.querySelectorAll('#answers-body tr').length, 2);
  assertEquals(document.getElementById('share').hidden, true);
});

Deno.test('a restored game never re-asks an already answered country', async () => {
  setupDom();
  let game = await importGame();
  game.switchMode('oceania');
  const played = [];
  for (let i = 0; i < 3; i++) {
    played.push(answerCurrentCountry(game));
  }

  setupDom({ resetStorage: false });
  game = await importGame();

  for (let i = 3; i < OCEANIA_COUNT; i++) {
    const country = answerCurrentCountry(game);
    assertEquals(played.includes(country), false, `${country} was asked twice`);
    played.push(country);
  }
  assertEquals(new Set(played).size, OCEANIA_COUNT);
});

Deno.test('a finished game is restored with the share button already visible', async () => {
  setupDom();
  let game = await importGame();
  game.switchMode('oceania');
  for (let i = 0; i < OCEANIA_COUNT; i++) {
    answerCurrentCountry(game);
  }
  assertEquals(document.getElementById('share').hidden, false);

  setupDom({ resetStorage: false });
  await importGame();

  assertEquals(document.getElementById('share').hidden, false);
  assertEquals(String(document.getElementById('progress-value').innerText), String(OCEANIA_COUNT));
  assertEquals(document.querySelectorAll('#answers-body tr').length, OCEANIA_COUNT);
});
