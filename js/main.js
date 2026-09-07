import {
  checkAnswer,
  switchMode,
  initGame,
  setStudyMode,
  showStudyCountry,
  revealStudyCountry,
  moveStudyIndex,
} from './flags_game.js';
import { MODE_DATASETS } from './game_state.js';
import { registerCountryFlagErrorHandler } from './country_flag.js';
import { registerServiceWorker } from './pwa.js';
import { shareScore } from './share.js';

export * from './flags_game.js';

registerCountryFlagErrorHandler();
initGame();

document.getElementById('answer').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    checkAnswer();
  }
});
document.getElementById('submit').addEventListener('click', () => checkAnswer());
document.getElementById('skip').addEventListener('click', () => checkAnswer(true));
document.getElementById('replay').addEventListener('click', () => {
  const currentMode = document.querySelector('.continent-btn.active')?.id || 'world';
  switchMode(currentMode);
});
document.getElementById('share').addEventListener('click', shareScore);
document.getElementById('play-mode').addEventListener('click', () => setStudyMode(false));
document.getElementById('study-mode').addEventListener('click', () => setStudyMode(true));
document.getElementById('study-prev').addEventListener('click', () => moveStudyIndex(-1));
document.getElementById('study-next').addEventListener('click', () => moveStudyIndex(1));
document.getElementById('reveal-answer').addEventListener('click', () => revealStudyCountry());

// button listeners for continents
Object.keys(MODE_DATASETS).forEach((mode) => {
  document.getElementById(mode).addEventListener('click', () => switchMode(mode));
});

registerServiceWorker();
