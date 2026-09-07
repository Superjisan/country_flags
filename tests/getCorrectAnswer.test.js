import { assertEquals } from 'jsr:@std/assert@1';
import { populateCountriesDatalist } from '../js/datalist.js';
import { setupDom, importGame } from './support/env.js';

Deno.test('getCorrectAnswer matches the country name case-insensitively', async () => {
  setupDom();
  const game = await importGame();
  assertEquals(game.getCorrectAnswer('France', 'France'), true);
  assertEquals(game.getCorrectAnswer('France', 'france'), true);
  assertEquals(game.getCorrectAnswer('France', 'FRANCE'), true);
});

Deno.test('getCorrectAnswer rejects a different country and an empty answer', async () => {
  setupDom();
  const game = await importGame();
  assertEquals(game.getCorrectAnswer('France', 'Italy'), false);
  assertEquals(game.getCorrectAnswer('France', ''), false);
  assertEquals(game.getCorrectAnswer('France', '   '), false);
  assertEquals(game.getCorrectAnswer('France', 'Skipped'), false);
});

Deno.test('getCorrectAnswer accepts a country\'s listed alternate names', async () => {
  setupDom();
  const game = await importGame();
  assertEquals(game.getCorrectAnswer('Türkiye', 'Turkey'), true);
  assertEquals(game.getCorrectAnswer('Liechtenstein', 'Lichtenstein'), true);
  assertEquals(game.getCorrectAnswer('Netherlands', 'Holland'), true);
  assertEquals(game.getCorrectAnswer('United States', 'USA'), true);
  assertEquals(game.getCorrectAnswer('United Kingdom', 'Great Britain'), true);
  assertEquals(game.getCorrectAnswer('Eswatini', 'Swaziland'), true);
  assertEquals(game.getCorrectAnswer('Czechia', 'Czech Republic'), true);
  // an alias belonging to a different country is still wrong
  assertEquals(game.getCorrectAnswer('Türkiye', 'Holland'), false);
});

Deno.test('populateCountriesDatalist includes both the country name and accepted aliases', () => {
  setupDom();
  populateCountriesDatalist(['Türkiye']);

  const values = [...document.querySelectorAll('#countries-list option')].map((option) => option.value);
  assertEquals(values.includes('Türkiye'), true);
  assertEquals(values.includes('Turkey'), true);
});

Deno.test('normalizeName folds away case, diacritics, punctuation and spacing', async () => {
  setupDom();
  const game = await importGame();
  assertEquals(game.normalizeName("Côte d'Ivoire"), 'cote d ivoire');
  assertEquals(game.normalizeName('Türkiye'), 'turkiye');
  assertEquals(game.normalizeName('  Saint  Lucia  '), 'saint lucia');
});

Deno.test('getCorrectAnswer accepts diacritic and punctuation variants without needing an alias', async () => {
  setupDom();
  const game = await importGame();
  assertEquals(game.getCorrectAnswer('Türkiye', 'Turkiye'), true);
  assertEquals(game.getCorrectAnswer('Türkiye', 'türkiye'), true);
  for (const variant of ['St Lucia', 'St. Lucia', 'saint lucia', 'SAINT-LUCIA']) {
    assertEquals(game.getCorrectAnswer('Saint Lucia', variant), true, `expected "${variant}" to be accepted`);
  }
  for (const variant of ["Cote d'Ivoire", 'Cote dIvoire', 'CotedIvoire', "côte d'ivoire", 'Ivory Coast', 'ivory coast']) {
    assertEquals(game.getCorrectAnswer("Côte d'Ivoire (Ivory Coast)", variant), true, `expected "${variant}" to be accepted`);
  }
});

Deno.test('getCorrectAnswer keeps the two Congos distinct', async () => {
  setupDom();
  const game = await importGame();
  assertEquals(game.getCorrectAnswer('Congo, Democratic Republic of the', 'DR Congo'), true);
  assertEquals(game.getCorrectAnswer('Congo, Democratic Republic of the', 'DRC'), true);
  assertEquals(game.getCorrectAnswer('Congo, Democratic Republic of the', 'Republic of the Congo'), false);
  assertEquals(game.getCorrectAnswer('Congo, Republic of the', 'Congo'), true);
  assertEquals(game.getCorrectAnswer('Congo, Republic of the', 'DR Congo'), false);
});

Deno.test('getCorrectAnswer returns false for a country that is not in the dataset', async () => {
  setupDom();
  const game = await importGame();
  assertEquals(game.getCorrectAnswer('Atlantis', 'Atlantis'), false);
});
