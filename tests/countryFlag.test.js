import { assertEquals } from 'jsr:@std/assert@1';
import { setupDom, importGame } from './support/env.js';

Deno.test('updateCountryFlag points at the ISO-coded flagcdn URL for a normal country', async () => {
  setupDom();
  const game = await importGame();
  game.updateCountryFlag('France');

  assertEquals(document.getElementById('country-flag').src, 'https://flagcdn.com/fr.svg');
  assertEquals(document.getElementById('country-flag').hidden, false);
  assertEquals(document.getElementById('flag-missing').hidden, true);
});

Deno.test('updateCountryFlag falls back to worldflags.net when there is no flagcdn ISO code', async () => {
  setupDom();
  const game = await importGame();
  game.updateCountryFlag('Palestine');

  assertEquals(document.getElementById('country-flag').src, 'https://worldflags.net/assets/img/flags/palestine-flag.png');
  assertEquals(document.getElementById('country-flag').hidden, false);
});

Deno.test('updateCountryFlag serves the committed copy for a country no flag host gets right', async () => {
  setupDom();
  const game = await importGame();
  game.updateCountryFlag('Afghanistan');

  assertEquals(document.getElementById('country-flag').src, 'http://localhost/flags/afghanistan.svg');
  assertEquals(game.flagUrl('Afghanistan'), 'flags/afghanistan.svg');
  assertEquals(document.getElementById('country-flag').hidden, false);
  assertEquals(document.getElementById('flag-missing').hidden, true);
});

Deno.test('updateCountryFlag shows the unavailable notice when there is no ISO code or fallback slug', async () => {
  setupDom();
  const game = await importGame();
  game.updateCountryFlag('Atlantis');

  assertEquals(document.getElementById('country-flag').hidden, true);
  assertEquals(document.getElementById('flag-missing').hidden, false);
});

Deno.test('a broken image load hides the flag and shows the unavailable notice', async () => {
  setupDom();
  const game = await importGame();
  game.updateCountryFlag('France');
  document.getElementById('country-flag').dispatchEvent(new Event('error'));

  assertEquals(document.getElementById('country-flag').hidden, true);
  assertEquals(document.getElementById('flag-missing').hidden, false);
});

Deno.test('every playable country resolves to a flag URL', async () => {
  setupDom();
  const game = await importGame();
  const missing = game.MODE_DATASETS.world.filter((country) => game.flagUrl(country) === null);
  assertEquals(missing, []);
});
