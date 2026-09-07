import {
  MODE_DATASETS, getCountryNames, getAliases, getCorrectAnswer, getRandomCountry, setCurrentCountry,
  setFeedback, hasPlayed, isGameOver, recordAnswer, resetState, applySavedState, getState, saveState,
  loadState, normalizeName, matchKey,
} from './game_state.js';
import { updateCountryFlag, flagUrl } from './country_flag.js';
import { buildAnswerRow, clearAnswersTable } from './answers_table.js';
import { populateCountriesDatalist } from './datalist.js';
import { saveGameMode, loadGameMode } from './persistence.js';

export { getCorrectAnswer, getAliases, getRandomCountry, getState, normalizeName, matchKey, updateCountryFlag, flagUrl };
export { buildResultsEmojiGrid, buildShareText, shareScore } from './share.js';

let isStudyMode = false;
let studyIndex = 0;

populateCountriesDatalist(getCountryNames());

export function addCountryAnswerToHTML(country, answer) {
  buildAnswerRow(country, answer, getCorrectAnswer(country, answer));
}

export function setStudyMode(enabled) {
  isStudyMode = enabled;
  saveGameMode(enabled ? 'study' : 'play');
  const playButton = document.getElementById('play-mode');
  const studyButton = document.getElementById('study-mode');
  playButton?.classList.toggle('active', !enabled);
  studyButton?.classList.toggle('active', enabled);
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

  if (!isStudyMode) {
    return;
  }

  const shouldReveal = countryEl.hidden;
  countryEl.hidden = !shouldReveal;
  revealButton.classList.toggle('revealed', shouldReveal);
  revealButton.textContent = shouldReveal ? '🙈 Hide' : '👁️ Reveal';
}

export function moveStudyIndex(delta) {
  if (!isStudyMode) {
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

export function checkAnswer(skipped = false) {
  if (isGameOver()) {
    gameOverFeedback();
    return;
  }
  let answer = document.getElementById('answer').value.trim();
  if (skipped === true) {
    answer = 'Skipped'; // Set answer to 'Skipped' so it will be marked as wrong and not increment score
  }
  const country = document.getElementById('country').innerText;
  const correctAnswer = getCorrectAnswer(country, answer);
  recordAnswer(country, answer, correctAnswer);

  document.getElementById('progress-value').innerText = getState().countriesPlayed.length;
  const correctAnswerText = `That flag belongs to ${country}`;
  const yourAnswerText = `Your answer: ${answer}`;
  const feedbackText = correctAnswer ? `Correct! ${correctAnswerText}.` : `Wrong! ${correctAnswerText}. ${yourAnswerText}`;
  document.getElementById('score').innerText = `Score: ${getState().score}`;

  addCountryAnswerToHTML(country, answer);

  if (isGameOver()) {
    gameOverFeedback();
    const input = document.getElementById('answer');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  setFeedback(feedbackText);
  document.getElementById('feedback').innerText = feedbackText;

  const input = document.getElementById('answer');
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return playGame();
}

export function gameOverFeedback() {
  const { score, numCountries, currentMode } = getState();
  const percent = numCountries ? Math.round((score / numCountries) * 100) : 0;
  const activeContinentButton = document.querySelector('.continent-btn.active');
  const modeName = activeContinentButton ? activeContinentButton.textContent.trim() : 'World';

  let headline = '📚 A bit of studying and you’ll be back on track.';
  let judgment = 'Keep practicing and you’ll improve fast.';
  let scoreLine = `Score: ${score} / ${numCountries} (${percent}%)`;

  if (percent === 100) {
    headline = currentMode === 'world'
      ? '🏆 PERFECT. You are a true GOAT of Country Flags!'
      : `🏆 PERFECT. You know all the flags of ${modeName}!`;
    judgment = '💪 Absolute domination.';
  } else if (percent >= 90) {
    headline = '🎉 Excellent work — you’re basically a flag expert!';
    judgment = 'You’re playing at a top-tier level.';
  } else if (percent >= 75) {
    headline = '🌟 Very strong performance — you’ve got serious flag instincts!';
    judgment = 'You’re clearly ahead of the pack.';
  } else if (percent >= 50) {
    headline = '👍 Solid effort — you’re getting there.';
    judgment = 'You’re already showing real progress.';
  } else if (percent >= 25) {
    headline = '💪 You’ve got room to grow, but the foundation is there.';
    judgment = 'A little more study and you’ll be flying.';
  } else if (percent > 0) {
    headline = '📖 A rough round, but a little study goes a long way.';
    judgment = 'Keep grinding — your next run will be better.';
  } else {
    headline = '😅 This one was a tough one.';
    judgment = 'Study a bit more and you’ll improve quickly.';
  }

  const feedbackText = [headline, scoreLine, judgment].join('\n');
  setFeedback(feedbackText);
  document.getElementById('feedback').innerText = feedbackText;
  document.getElementById('share').hidden = false;
  syncActionButtons();
  saveState();
}

export function playGame() {
  const country = getRandomCountry();
  if (hasPlayed(country) && !isGameOver()) {
    return playGame(); // Skip if the country has already been played
  } else if (isGameOver()) {
    gameOverFeedback();
    return;
  }
  setCurrentCountry(country);
  document.getElementById('country').innerText = country;
  updateCountryFlag(country);
  saveState();
  return country;
}

export function syncActionButtons() {
  const gameOver = isGameOver();
  const playView = !isStudyMode;

  document.getElementById('buttons-div').hidden = isStudyMode;
  document.getElementById('submit').hidden = gameOver || !playView;
  document.getElementById('skip').hidden = gameOver || !playView;
  document.getElementById('replay').hidden = !gameOver || isStudyMode;
  document.getElementById('answer').disabled = gameOver || !playView;
  document.getElementById('answer').hidden = isStudyMode;
  document.getElementById('input-div').hidden = false;
  document.getElementById('reveal-answer').hidden = !isStudyMode;
  document.getElementById('score').hidden = isStudyMode;
  document.getElementById('study-controls').hidden = !isStudyMode;
  document.getElementById('study-prev').hidden = !isStudyMode;
  document.getElementById('study-next').hidden = !isStudyMode;
  document.getElementById('share').hidden = !gameOver || isStudyMode;
}

export function resetGame(mode = 'world') {
  resetState(mode);
  const { score, countriesPlayed, numCountries } = getState();
  document.getElementById('score').innerText = `Score: ${score}`;
  document.getElementById('progress-value').innerText = countriesPlayed.length;
  document.getElementById('total-countries').innerText = numCountries;
  document.getElementById('share').hidden = true;
  document.getElementById('feedback').innerText = '';
  document.getElementById('country').hidden = true;
  clearAnswersTable();
  syncActionButtons();
  saveState();
}

export function removeActiveClassFromContinentButtons() {
  const buttons = document.getElementsByClassName('continent-btn');
  for (const button of buttons) {
    button.classList.remove('active');
  }
}

export function restoreState(state) {
  applySavedState(state);
  const { score, countriesPlayed, numCountries, currentMode, currentCountry, answersGiven, feedback } = getState();

  removeActiveClassFromContinentButtons();
  document.getElementById(currentMode).classList.add('active');
  document.getElementById('score').innerText = `Score: ${score}`;
  document.getElementById('progress-value').innerText = countriesPlayed.length;
  document.getElementById('total-countries').innerText = numCountries;
  document.getElementById('feedback').innerText = feedback;

  clearAnswersTable();
  countriesPlayed.forEach((country, i) => addCountryAnswerToHTML(country, answersGiven[i]));

  if (currentCountry) {
    document.getElementById('country').innerText = currentCountry;
    updateCountryFlag(currentCountry);
  }
  if (isGameOver()) {
    gameOverFeedback();
  } else if (!currentCountry) {
    playGame();
  }
  syncActionButtons();
}

export function switchMode(mode) {
  resetGame(mode);
  removeActiveClassFromContinentButtons();
  document.getElementById(mode).classList.add('active');
  if (isStudyMode) {
    studyIndex = 0;
    showStudyCountry();
  } else {
    playGame();
  }
}

export function initGame() {
  const savedState = loadState();
  const savedMode = loadGameMode();
  const initialMode = savedMode === 'study' ? 'study' : 'play';
  const uiMode = initialMode === 'study';

  isStudyMode = uiMode;
  if (savedState) {
    restoreState(savedState);
  } else {
    switchMode('world');
  }

  const playButton = document.getElementById('play-mode');
  const studyButton = document.getElementById('study-mode');
  if (playButton && studyButton) {
    playButton.classList.toggle('active', !uiMode);
    studyButton.classList.toggle('active', uiMode);
  }
  syncActionButtons();
}

export { MODE_DATASETS };
