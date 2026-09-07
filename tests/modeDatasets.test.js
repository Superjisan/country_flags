import { assertEquals } from 'jsr:@std/assert@1';
import { MODE_DATASETS } from '../js/game_state.js';

Deno.test('countries.json is readable and valid JSON', async () => {
  const countriesText = await Deno.readTextFile(new URL('../data/countries.json', import.meta.url));
  const countries = JSON.parse(countriesText);

  assertEquals(typeof countries, 'object');
  assertEquals(countries !== null, true);
  assertEquals(Object.keys(countries).length > 0, true);
  assertEquals(countries['Northern Ireland']?.flagSlug, 'northern-ireland');
});

Deno.test('Russia is playable in both Asia and Europe modes', () => {
  assertEquals(MODE_DATASETS.asia.includes('Russia'), true);
  assertEquals(MODE_DATASETS.europe.includes('Russia'), true);
});

Deno.test('Türkiye is only playable in Asia mode, not Europe', () => {
  assertEquals(MODE_DATASETS.asia.includes('Türkiye'), true);
  assertEquals(MODE_DATASETS.europe.includes('Türkiye'), false);
});

Deno.test('the UK constituent countries are included in Europe mode', () => {
  for (const country of ['England', 'Northern Ireland', 'Scotland', 'Wales']) {
    assertEquals(MODE_DATASETS.world.includes(country), true, `${country} should be in World`);
    assertEquals(MODE_DATASETS.europe.includes(country), true, `${country} should be in Europe`);
    for (const [mode, dataset] of Object.entries(MODE_DATASETS)) {
      if (mode === 'world' || mode === 'europe') {
        continue;
      }
      assertEquals(dataset.includes(country), false, `${country} should not be in ${mode}`);
    }
  }
});

Deno.test('every continent mode is a non-empty subset of World', () => {
  const worldCountries = new Set(MODE_DATASETS.world);
  for (const [mode, dataset] of Object.entries(MODE_DATASETS)) {
    if (mode === 'world') {
      continue;
    }
    assertEquals(dataset.length > 0, true, `${mode} should not be empty`);
    for (const country of dataset) {
      assertEquals(worldCountries.has(country), true, `${country} in ${mode} should also be in World`);
    }
  }
});

Deno.test('World has no duplicate country names', () => {
  assertEquals(new Set(MODE_DATASETS.world).size, MODE_DATASETS.world.length);
});

Deno.test('no country name or alias is claimed by two different countries', async () => {
  const { matchKey, getAliases } = await import('../js/game_state.js');
  const seen = new Map();
  for (const country of MODE_DATASETS.world) {
    for (const name of [country, ...getAliases(country)]) {
      const key = matchKey(name);
      const owner = seen.get(key);
      assertEquals(owner === undefined || owner === country, true, `"${name}" is claimed by both ${owner} and ${country}`);
      seen.set(key, country);
    }
  }
});

Deno.test('no alias is redundant with the country name or another of its aliases', async () => {
  const { matchKey, getAliases } = await import('../js/game_state.js');
  for (const country of MODE_DATASETS.world) {
    const names = [country, ...getAliases(country)];
    const keys = names.map(matchKey);
    assertEquals(new Set(keys).size, keys.length, `${country} has aliases that reduce to the same answer: ${names.join(', ')}`);
  }
});
