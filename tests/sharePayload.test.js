import { assert, assertEquals } from 'jsr:@std/assert@1';
import { setupDom } from './support/env.js';

Deno.test('world mode ratings share payload is under 1900 characters', async () => {
  setupDom();
  
  const { MODE_DATASETS } = await import('../js/game_state.js');
  const { encodeRatingPayload, decodeRatingPayload } = await import('../js/share.js');

  const worldCountries = MODE_DATASETS.world;
  const tiers = ['S', 'A', 'B', 'C', 'D', 'F'];
  const ratings = { S: [], A: [], B: [], C: [], D: [], F: [] };
  
  // Distribute all world countries among the tiers
  worldCountries.forEach((country, index) => {
    const tier = tiers[index % tiers.length];
    ratings[tier].push(country);
  });

  const encodedRatings = encodeRatingPayload(ratings);
  const paramString = `#ct=wo&r=${encodedRatings}`;
  
  console.log(`World payload length: ${paramString.length} characters`);
  assert(
    paramString.length <= 1900, 
    `Share URL payload should be under 1900 chars, but was ${paramString.length}`
  );
  
  // Also assert that decode works properly for the large payload
  const decodedRatings = decodeRatingPayload(encodedRatings);
  assertEquals(decodedRatings.S.length, ratings.S.length);
  assertEquals(decodedRatings.F.length, ratings.F.length);
});

Deno.test('rating URLs shared before countries were encoded still decode as tier counts', async () => {
  setupDom();

  const { decodeRatingPayload, decodeRatingPayloadFromHash } = await import('../js/share.js');
  const legacyToken = btoa(JSON.stringify({ S: 2, A: 3, B: 1, C: 0, D: 0, F: 0 }));

  const decoded = decodeRatingPayload(legacyToken);
  assertEquals(decoded, { S: 2, A: 3, B: 1, C: 0, D: 0, F: 0 });

  window.location.hash = `#continent=europe&ratings=${legacyToken}`;
  const summary = decodeRatingPayloadFromHash();
  assertEquals(summary.S, 2);
  assertEquals(summary.continent, 'europe');
});
