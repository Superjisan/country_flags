import {
  checkAnswer,
  switchMode,
  initGame,
  setStudyMode,
  setRateMode,
  revealStudyCountry,
  moveStudyIndex,
  recordRateTier,
  applySharedRatingSummary,
  exitSharedRatingSummary,
} from './flags_game.js';
import { MODE_DATASETS, getCorrectAnswer } from './game_state.js';
import { registerCountryFlagErrorHandler } from './country_flag.js';
import { registerServiceWorker } from './pwa.js';
import { shareScore, shareRating } from './share.js';
import { bindCountrySuggestions } from './datalist.js';

export * from './flags_game.js';

function trackEvent(name, params) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', name, params);
  }
}

registerCountryFlagErrorHandler();
initGame();
bindCountrySuggestions();

const answerInput = document.getElementById('answer');

answerInput.addEventListener('input', () => {
  const country = document.getElementById('country').innerText;
  const value = answerInput.value.trim();

  if (!country || !value) {
    return;
  }

  if (getCorrectAnswer(country, value)) {
    checkAnswer();
  }
});

answerInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') {
    return;
  }

  const suggestions = document.getElementById('answer-suggestions');
  if (suggestions && !suggestions.hidden) {
    event.preventDefault();
    const active = suggestions.querySelector('.country-suggestion.active');
    const first = suggestions.querySelector('.country-suggestion');
    const selected = active || first;
    if (selected) {
      answerInput.value = selected.textContent;
      suggestions.hidden = true;
      return;
    }
  }

  checkAnswer();
});
document.getElementById('submit').addEventListener('click', () => checkAnswer());
document.getElementById('skip').addEventListener('click', () => {
  trackEvent('skip_flag', {
    country: document.getElementById('country').innerText,
    mode: document.querySelector('.continent-btn.active')?.id || 'world',
  });
  checkAnswer(true);
});
document.getElementById('replay').addEventListener('click', () => {
  const currentMode = document.querySelector('.continent-btn.active')?.id || 'world';
  switchMode(currentMode);
});
document.getElementById('share').addEventListener('click', () => {
  if (document.getElementById('share').dataset.mode === 'rate') {
    shareRating();
    return;
  }
  shareScore();
});
document.getElementById('play-mode').addEventListener('click', () => {
  trackEvent('select_mode', { mode: 'play' });
  setStudyMode(false);
});
document.getElementById('study-mode').addEventListener('click', () => {
  trackEvent('select_mode', { mode: 'study' });
  setStudyMode(true);
});
document.getElementById('rate-mode').addEventListener('click', () => {
  trackEvent('select_mode', { mode: 'rate' });
  setRateMode(true);
});
document.getElementById('study-prev').addEventListener('click', () => moveStudyIndex(-1));
document.getElementById('study-next').addEventListener('click', () => moveStudyIndex(1));
document.getElementById('reveal-answer').addEventListener('click', () => revealStudyCountry());
window.addEventListener('hashchange', () => {
  if (!applySharedRatingSummary()) {
    exitSharedRatingSummary();
  }
});
document.querySelectorAll('.rating-tier').forEach((button) => {
  button.addEventListener('click', () => {
    trackEvent('rate_flag', {
      country: document.getElementById('country').innerText,
      tier: button.dataset.tier,
    });
    recordRateTier(button.dataset.tier);
  });
});

// button listeners for continents
Object.keys(MODE_DATASETS).forEach((mode) => {
  document.getElementById(mode).addEventListener('click', () => {
    trackEvent('select_continent', { continent: mode });
    switchMode(mode);
  });
});

registerServiceWorker();
