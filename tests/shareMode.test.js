import { assert, assertEquals } from 'jsr:@std/assert@1';
import { setupDom } from './support/env.js';

Deno.test('loading a shared url sets the continent mode properly when creating own', async () => {
  setupDom();
  // Simulate URL hash for shared world
  window.location.hash = '#ct=wo&r=eyJTIjpbMCw2XX0=';

  const game = await import('../js/main.js');
  
  // The rate-own-flag button should be visible
  const rateOwnBtn = document.getElementById('rate-own-flag');
  assertEquals(rateOwnBtn.hidden, false, "rate-own-flag should be visible");
  assertEquals(rateOwnBtn.textContent, "Create your own World flag rating");
  
  // Click the button
  rateOwnBtn.click();
  
  // Assert the mode is now world
  const { getState } = await import('../js/game_state.js');
  const state = getState();
  assertEquals(state.currentMode, 'world');
  assertEquals(document.getElementById('world').classList.contains('active'), true);
});
