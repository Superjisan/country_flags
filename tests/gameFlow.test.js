import { assertEquals, assertMatch } from 'jsr:@std/assert@1';
import { MODE_DATASETS } from '../js/game_state.js';
import { setupDom, importGame } from './support/env.js';
import { answerCurrentCountry } from './support/play.js';

const OCEANIA = MODE_DATASETS.oceania;
const OCEANIA_COUNT = OCEANIA.length;

Deno.test('switching to a continent resets progress and scopes the country pool', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');

  assertEquals(document.getElementById('oceania').classList.contains('active'), true);
  // jsdom's innerText doesn't stringify numeric assignments the way real browsers do
  assertEquals(String(document.getElementById('total-countries').innerText), String(OCEANIA_COUNT));
  assertEquals(String(document.getElementById('progress-value').innerText), '0');
  assertEquals(document.getElementById('share').hidden, true);
  assertEquals(OCEANIA.includes(document.getElementById('country').innerText), true);
});

Deno.test('the flag is shown while the country name stays hidden', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');

  const country = document.getElementById('country').innerText;
  assertEquals(document.getElementById('country').hidden, true);
  assertEquals(document.getElementById('country-flag').hidden, false);
  assertEquals(document.getElementById('country-flag').src, game.flagUrl(country));
});

Deno.test('a correct answer scores, clears the input and advances to a new country', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');

  const answered = answerCurrentCountry(game);

  assertEquals(document.getElementById('score').innerText, 'Score: 1');
  assertEquals(String(document.getElementById('progress-value').innerText), '1');
  assertEquals(document.getElementById('answer').value, '');
  assertMatch(document.getElementById('feedback').innerText, /^Correct!/);
  assertEquals(document.getElementById('country').innerText === answered, false);
});

Deno.test('a wrong answer does not score and the feedback names the country', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');

  const answered = answerCurrentCountry(game, { answer: 'Narnia' });

  assertEquals(document.getElementById('score').innerText, 'Score: 0');
  assertMatch(document.getElementById('feedback').innerText, /^Wrong!/);
  assertMatch(document.getElementById('feedback').innerText, new RegExp(`belongs to ${answered.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assertMatch(document.getElementById('feedback').innerText, /Your answer: Narnia/);
});

Deno.test('an alias is accepted as a correct answer during play', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('europe');

  // drive the game until the Netherlands comes up, skipping everything else
  let guard = MODE_DATASETS.europe.length + 1;
  while (document.getElementById('country').innerText !== 'Netherlands' && guard-- > 0) {
    answerCurrentCountry(game, { skip: true });
  }
  assertEquals(document.getElementById('country').innerText, 'Netherlands');

  answerCurrentCountry(game, { answer: 'Holland' });

  // asserted on the score and the table rather than the feedback text: when the
  // Netherlands happens to be drawn last, the game-over message overwrites the
  // per-answer feedback, but the recorded result is the same either way.
  assertEquals(document.getElementById('score').innerText, 'Score: 1');
  const rows = document.querySelectorAll('#answers-body tr');
  const netherlandsRow = [...rows].find((row) => row.children[1].innerText === 'Netherlands');
  assertEquals(netherlandsRow.children[2].innerText, 'Correct');
  assertEquals(netherlandsRow.children[3].innerText, 'Holland');
});

Deno.test('every answered country is added to the answers table with its flag', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');

  const first = answerCurrentCountry(game);
  answerCurrentCountry(game, { skip: true });

  const rows = document.querySelectorAll('#answers-body tr');
  assertEquals(rows.length, 2);
  assertEquals(rows[0].querySelector('img.answer-flag').src, game.flagUrl(first));
  assertEquals(rows[0].children[1].innerText, first);
  assertEquals(rows[0].children[2].innerText, 'Correct');
  assertEquals(rows[1].children[2].innerText, 'Wrong');
  assertEquals(rows[1].children[3].innerText, 'Skipped');
});

Deno.test('playing a full continent tracks score/progress and reveals share only at the end', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');

  answerCurrentCountry(game); // correct
  answerCurrentCountry(game, { skip: true }); // wrong
  // answer every country but the last one, checking share stays hidden throughout
  for (let answered = 2; answered < OCEANIA_COUNT - 1; answered++) {
    answerCurrentCountry(game);
    assertEquals(document.getElementById('share').hidden, true);
  }
  answerCurrentCountry(game); // the final country

  assertEquals(String(document.getElementById('progress-value').innerText), String(OCEANIA_COUNT));
  assertEquals(document.getElementById('score').innerText, `Score: ${OCEANIA_COUNT - 1}`);
  assertEquals(document.getElementById('share').hidden, false);
  assertEquals(document.querySelectorAll('#answers-body tr').length, OCEANIA_COUNT);
  assertMatch(document.getElementById('feedback').innerText, /You got|PERFECT|Excellent work|Very strong|Solid effort|A rough round/);
});

Deno.test('game over hides the answer buttons and shows a replay button', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');

  for (let i = 0; i < OCEANIA_COUNT; i++) {
    answerCurrentCountry(game);
  }

  assertEquals(document.getElementById('submit').hidden, true);
  assertEquals(document.getElementById('skip').hidden, true);
  assertEquals(document.getElementById('replay').hidden, false);
});

Deno.test('answering past the end of a finished game changes nothing', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');
  for (let i = 0; i < OCEANIA_COUNT; i++) {
    answerCurrentCountry(game);
  }

  game.checkAnswer();

  assertEquals(document.getElementById('score').innerText, `Score: ${OCEANIA_COUNT}`);
  assertEquals(document.querySelectorAll('#answers-body tr').length, OCEANIA_COUNT);
});

Deno.test('buildResultsEmojiGrid mirrors the correct/wrong answer sequence', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');

  answerCurrentCountry(game, { skip: true });
  for (let i = 0; i < OCEANIA_COUNT - 1; i++) {
    answerCurrentCountry(game);
  }

  // spread to iterate by codepoint -- emoji are surrogate pairs, so .length/[i]
  // on the raw string would count UTF-16 code units instead of squares
  const squares = [...game.buildResultsEmojiGrid().replace(/\n/g, '')];
  assertEquals(squares.length, OCEANIA_COUNT);
  assertEquals(squares[0], '🟥');
  assertEquals(squares.slice(1).join(''), '🟩'.repeat(OCEANIA_COUNT - 1));
});

Deno.test('buildShareText includes the game name, mode and current score', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');
  answerCurrentCountry(game);

  const text = game.buildShareText();
  assertMatch(text, /Country Flags Game/);
  assertMatch(text, /Oceania/);
  assertMatch(text, new RegExp(`Score: 1/${OCEANIA_COUNT}`));
});

Deno.test('shareScore falls back gracefully when the Web Share and Clipboard APIs are unavailable', async () => {
  setupDom();
  const game = await importGame();
  game.switchMode('oceania');
  answerCurrentCountry(game);

  // jsdom implements neither API, matching real-world browsers that lack them.
  await game.shareScore();
  assertEquals(document.getElementById('share').innerText, 'Could not copy score');
});
