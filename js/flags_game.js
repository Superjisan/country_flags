import {
  MODE_DATASETS, getCountryNames, getAliases, getCorrectAnswer, getRandomCountry, setCurrentCountry,
  setFeedback, hasPlayed, isGameOver, recordAnswer, resetState, applySavedState, getState, saveState,
  loadState, normalizeName, matchKey,
} from './game_state.js';
import { updateCountryFlag, flagUrl } from './country_flag.js';
import { buildAnswerRow, clearAnswersTable } from './answers_table.js';
import { populateCountriesDatalist } from './datalist.js';

export { getCorrectAnswer, getAliases, getRandomCountry, getState, normalizeName, matchKey, updateCountryFlag, flagUrl };
export { buildResultsEmojiGrid, buildShareText, shareScore } from './share.js';

populateCountriesDatalist(getCountryNames());

export function addCountryAnswerToHTML(country, answer) {
  buildAnswerRow(country, answer, getCorrectAnswer(country, answer));
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
  setFeedback(feedbackText);
  document.getElementById('feedback').innerText = feedbackText;
  document.getElementById('score').innerText = `Score: ${getState().score}`;

  addCountryAnswerToHTML(country, answer);

  const input = document.getElementById('answer');
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return playGame();
}

export function gameOverFeedback() {
  const { score, numCountries } = getState();
  const feedbackText = `Game over! You have played all countries for this setting. Your final score is ${score} out of ${numCountries}.`;
  setFeedback(feedbackText);
  document.getElementById('feedback').innerText = feedbackText;
  document.getElementById('share').hidden = false;
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

export function resetGame(mode = 'world') {
  resetState(mode);
  const { score, countriesPlayed, numCountries } = getState();
  document.getElementById('score').innerText = `Score: ${score}`;
  document.getElementById('progress-value').innerText = countriesPlayed.length;
  document.getElementById('total-countries').innerText = numCountries;
  document.getElementById('share').hidden = true;
  document.getElementById('feedback').innerText = '';
  clearAnswersTable();
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
}

export function switchMode(mode) {
  resetGame(mode);
  removeActiveClassFromContinentButtons();
  document.getElementById(mode).classList.add('active');
  playGame();
}

export function initGame() {
  const savedState = loadState();
  if (savedState) {
    restoreState(savedState);
  } else {
    switchMode('world');
  }
}

export { MODE_DATASETS };
