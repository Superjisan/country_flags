import { MODE_DATASETS, getState, setCurrentCountry, saveState } from './game_state.js';
import { updateCountryFlag } from './country_flag.js';
import { saveGameMode } from './persistence.js';
import { isStudyMode, setViewMode, syncModeToggleButtons } from './view_mode.js';
import { playGame, resetGame, syncActionButtons } from './flags_game.js';

let studyIndex = 0;

export function resetStudyIndex() {
  studyIndex = 0;
}

export function setStudyMode(enabled) {
  setViewMode(enabled ? 'study' : 'play');
  saveGameMode(enabled ? 'study' : 'play');
  syncModeToggleButtons();
  if (enabled) {
    resetGame(getState().currentMode || 'world');
    document.getElementById('score').hidden = true;
    document.getElementById('score').innerText = 'Score: 0';
    showStudyCountry();
  } else {
    document.getElementById('country').hidden = true;
    resetGame(getState().currentMode || 'world');
    document.getElementById('score').hidden = false;
    playGame();
  }
  syncActionButtons();
}

export function revealStudyCountry() {
  const countryEl = document.getElementById('country');
  const revealButton = document.getElementById('reveal-answer');

  if (!isStudyMode()) {
    return;
  }

  const shouldReveal = countryEl.hidden;
  countryEl.hidden = !shouldReveal;
  revealButton.classList.toggle('revealed', shouldReveal);
  revealButton.textContent = shouldReveal ? '🙈 Hide' : '👁️ Reveal';
}

export function moveStudyIndex(delta) {
  if (!isStudyMode()) {
    return;
  }
  const mode = getState().currentMode || 'world';
  const total = MODE_DATASETS[mode]?.length ?? 0;
  if (!total) {
    return;
  }
  studyIndex = (studyIndex + delta + total) % total;
  showStudyCountry();
}

export function showStudyCountry() {
  const mode = getState().currentMode || 'world';
  const countries = MODE_DATASETS[mode] ?? MODE_DATASETS.world;
  if (!countries.length) {
    return;
  }
  studyIndex = Math.max(0, Math.min(studyIndex, countries.length - 1));
  const country = countries[studyIndex];
  setCurrentCountry(country);
  document.getElementById('country').innerText = country;
  document.getElementById('country').hidden = true;
  const revealButton = document.getElementById('reveal-answer');
  revealButton.textContent = '👁️ Reveal';
  revealButton.classList.remove('revealed');
  document.getElementById('progress-value').innerText = String(studyIndex + 1);
  document.getElementById('total-countries').innerText = String(countries.length);
  updateCountryFlag(country);
  saveState();
}
