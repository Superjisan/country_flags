import { assertEquals, assertMatch } from 'jsr:@std/assert@1';
import { setupDom, importGame } from './support/env.js';

Deno.test('a hashchange into a rating url shows the shared summary, and clearing the hash restores the game view', async () => {
  setupDom();
  await importGame();

  assertEquals(document.getElementById('mode-toggle').hidden, false);

  window.location.hash = '#ct=wo&r=eyJTIjpbMCw2XX0=';
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));

  assertEquals(document.getElementById('mode-toggle').hidden, true);
  assertEquals(document.getElementById('answers-table').hidden, true);
  assertEquals(document.getElementById('study-controls').hidden, true);
  assertEquals(document.getElementById('rate-own-flag').hidden, false);
  assertEquals(document.getElementById('page-title').textContent, 'Country Ratings');
  assertEquals(document.getElementById('intro').hidden, true);
  assertMatch(document.getElementById('feedback').innerHTML, /<img[^>]+src=/);

  window.location.hash = '';
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));

  assertEquals(document.getElementById('mode-toggle').hidden, false);
  assertEquals(document.getElementById('continent-buttons').hidden, false);
  assertEquals(document.getElementById('rate-own-flag').hidden, true);
  assertEquals(document.getElementById('page-title').textContent, 'Country Flags Game');
  assertEquals(document.getElementById('intro').hidden, false);
  assertEquals(document.getElementById('answers-table').hidden, false);
  assertEquals(document.getElementById('feedback').innerHTML, '');
});
