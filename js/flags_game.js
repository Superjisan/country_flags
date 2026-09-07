import {
  MODE_DATASETS, getCountryNames, getAliases, getCorrectAnswer, getRandomCountry, setCurrentCountry,
  setFeedback, hasPlayed, isGameOver, recordAnswer, resetState, applySavedState, getState, saveState,
  loadState, normalizeName, matchKey,
} from './game_state.js';
import { updateCountryFlag, flagUrl } from './country_flag.js';
import { buildAnswerRow, clearAnswersTable } from './answers_table.js';
import { populateCountriesDatalist } from './datalist.js';
import { saveGameMode, loadGameMode } from './persistence.js';
import { buildRatingSummaryText, decodeRatingPayloadFromHash, encodeRatingPayload, formatContinentLabel } from './share.js';

export { getCorrectAnswer, getAliases, getRandomCountry, getState, normalizeName, matchKey, updateCountryFlag, flagUrl };
export { buildResultsEmojiGrid, buildShareText, shareScore, encodeRatingPayload, decodeRatingPayload, decodeRatingPayloadFromHash, buildRatingSummaryText, formatContinentLabel } from './share.js';

const RATE_TIERS = ['S', 'A', 'B', 'C', 'D', 'F'];
const TIER_EMOJIS = { S: '🔥', A: '⭐', B: '🥈', C: '😐', D: '🗑️', F: '💥' };
const RATE_EMOJIS = {
  S: '🔥',
  A: '⭐',
  B: '🥈',
  C: '😐',
  D: '🗑️',
  F: '💥',
};

let isStudyMode = false;
let isRateMode = false;
let isSharedSummaryView = false;
let gamePageTitle = null;
let studyIndex = 0;
let rateHistory = [];
let ratingCounts = Object.fromEntries(RATE_TIERS.map((tier) => [tier, 0]));

populateCountriesDatalist(getCountryNames());

export function addCountryAnswerToHTML(country, answer) {
  buildAnswerRow(country, answer, getCorrectAnswer(country, answer));
}

export function setStudyMode(enabled) {
  isStudyMode = enabled;
  isRateMode = false;
  saveGameMode(enabled ? 'study' : 'play');
  const playButton = document.getElementById('play-mode');
  const studyButton = document.getElementById('study-mode');
  const rateButton = document.getElementById('rate-mode');
  playButton?.classList.toggle('active', !enabled);
  studyButton?.classList.toggle('active', enabled);
  rateButton?.classList.toggle('active', false);
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

export function setRateMode(enabled) {
  isRateMode = enabled;
  isStudyMode = false;
  saveGameMode(enabled ? 'rate' : 'play');
  const playButton = document.getElementById('play-mode');
  const studyButton = document.getElementById('study-mode');
  const rateButton = document.getElementById('rate-mode');
  playButton?.classList.toggle('active', !enabled);
  studyButton?.classList.toggle('active', false);
  rateButton?.classList.toggle('active', enabled);
  document.getElementById('rate-own-flag')?.setAttribute('hidden', 'hidden');

  if (enabled) {
    rateHistory = [];
    ratingCounts = Object.fromEntries(RATE_TIERS.map((tier) => [tier, 0]));
    resetGame(getState().currentMode || 'world');
    showRateCountry();
  } else {
    document.getElementById('country').hidden = true;
    resetGame(getState().currentMode || 'world');
    document.getElementById('score').hidden = false;
    playGame();
  }
  syncActionButtons();
}

export function showRateCountry() {
  const mode = getState().currentMode || 'world';
  const countries = MODE_DATASETS[mode] ?? MODE_DATASETS.world;
  if (!countries.length) {
    return;
  }
  const nextCountry = countries.find((country) => !rateHistory.some((entry) => entry.country === country));
  if (!nextCountry) {
    showRateSummary();
    return;
  }
  setCurrentCountry(nextCountry);
  document.getElementById('country').innerText = nextCountry;
  document.getElementById('country').hidden = true;
  document.getElementById('progress-value').innerText = String(rateHistory.length);
  document.getElementById('total-countries').innerText = String(countries.length);
  updateCountryFlag(nextCountry);
}

export function recordRateTier(tier) {
  if (!isRateMode) {
    return;
  }
  const country = document.getElementById('country').innerText;
  if (!country || rateHistory.some((entry) => entry.country === country)) {
    return;
  }

  rateHistory.push({ country, tier });
  ratingCounts[tier] = (ratingCounts[tier] ?? 0) + 1;
  document.getElementById('progress-value').innerText = String(rateHistory.length);

  const summary = buildRatingSummary();
  setFeedback(summary);
  document.getElementById('feedback').innerHTML = summary;

  const mode = getState().currentMode || 'world';
  if (rateHistory.length >= (MODE_DATASETS[mode]?.length ?? 0)) {
    showRateSummary();
    return;
  }

  showRateCountry();
}

function buildRatingsTable(cellForTier) {
  const rows = RATE_TIERS.map((tier) => `<tr><th scope="row">${tier}</th><td>${cellForTier(tier)}</td></tr>`);
  return `<table class="ratings-table"><tbody>${rows.join('')}</tbody></table>`;
}

function buildFlagCell(ratedCountries) {
  if (!ratedCountries.length) {
    return '<div class="rated-flags rated-flags-empty">&mdash;</div>';
  }
  const flags = ratedCountries
    .map((country) => `<img src="${flagUrl(country)}" alt="${country}" title="${country}" class="rated-flag" />`)
    .join('');
  return `<div class="rated-flags">${flags}</div>`;
}

export function buildRatingSummary() {
  const table = buildRatingsTable((tier) => buildFlagCell(
    rateHistory.filter((entry) => entry.tier === tier).map((entry) => entry.country)
  ));
  return `Your ratings${table}`;
}

export function getRatingCounts() {
  return { ...ratingCounts };
}

export function getRateHistory() {
  return [...rateHistory];
}

export function applySharedRatingSummary() {
  const shared = decodeRatingPayloadFromHash();
  if (!shared) {
    return false;
  }
  isSharedSummaryView = true;
  isStudyMode = false;
  isRateMode = false;
  showRatingsPageHeader();
  lockContinentButtonsTo(shared.continent || 'world');
  const table = buildRatingsTable((tier) => {
    // Ratings shared before countries were encoded carry a count per tier.
    if (typeof shared[tier] === 'number') {
      const count = shared[tier];
      return count > 0 ? `${count} ${TIER_EMOJIS[tier].repeat(count)}` : '&mdash;';
    }
    return buildFlagCell(Array.isArray(shared[tier]) ? shared[tier] : []);
  });
  const summaryHTML = `${formatContinentLabel(shared.continent || 'world')} flag ratings${table}`;
  
  ratingCounts = { S: shared.S?.length || 0, A: shared.A?.length || 0, B: shared.B?.length || 0, C: shared.C?.length || 0, D: shared.D?.length || 0, F: shared.F?.length || 0 };
  setFeedback(summaryHTML);
  document.getElementById('feedback').innerHTML = summaryHTML;
  document.getElementById('share').hidden = true;
  document.getElementById('share').dataset.mode = 'rate';
  document.getElementById('rate-own-flag').hidden = false;
  document.getElementById('rate-own-flag').textContent = `Create your own ${formatContinentLabel(shared.continent || 'world')} flag rating`;
  document.getElementById('rate-own-flag').onclick = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    isSharedSummaryView = false;
    showGamePageHeader();
    unlockContinentButtons();
    document.getElementById('mode-toggle').hidden = false;
    document.getElementById('continent-buttons').hidden = false;
    document.getElementById('flag-container').hidden = false;
    document.getElementById('input-div').hidden = false;
    document.getElementById('buttons-div').hidden = false;
    document.getElementById('score').hidden = false;
    document.getElementById('progress').hidden = false;
    document.getElementById('rate-own-flag').hidden = true;
    const continent = shared.continent || 'world';
    removeActiveClassFromContinentButtons();
    const continentButton = document.getElementById(continent);
    if (continentButton) {
      continentButton.classList.add('active');
    }
    switchMode(continent);
    setRateMode(true);
  };

  document.getElementById('mode-toggle').hidden = true;
  document.getElementById('flag-container').hidden = true;
  document.getElementById('input-div').hidden = true;
  document.getElementById('buttons-div').hidden = true;
  document.getElementById('score').hidden = true;
  document.getElementById('progress').hidden = true;
  document.getElementById('rating-buttons').hidden = true;
  document.getElementById('answers-table').hidden = true;
  document.getElementById('study-controls').hidden = true;
  document.getElementById('study-prev').hidden = true;
  document.getElementById('study-next').hidden = true;
  return true;
}

// The shared view keeps the continent buttons on screen so the reader can see
// which set of flags they are looking at, but only that continent stays live.
function lockContinentButtonsTo(continent) {
  removeActiveClassFromContinentButtons();
  document.getElementById(continent)?.classList.add('active');
  document.querySelectorAll('.continent-btn').forEach((button) => {
    button.disabled = button.id !== continent;
  });
}

function unlockContinentButtons() {
  document.querySelectorAll('.continent-btn').forEach((button) => {
    button.disabled = false;
  });
}

function showRatingsPageHeader() {
  const pageTitle = document.getElementById('page-title');
  if (gamePageTitle === null) {
    gamePageTitle = pageTitle.textContent;
  }
  pageTitle.textContent = 'Country Flag Ratings';
  document.getElementById('intro').hidden = true;
}

function showGamePageHeader() {
  if (gamePageTitle !== null) {
    document.getElementById('page-title').textContent = gamePageTitle;
  }
  document.getElementById('intro').hidden = false;
}

export function exitSharedRatingSummary() {
  if (!isSharedSummaryView) {
    return false;
  }
  isSharedSummaryView = false;
  showGamePageHeader();
  unlockContinentButtons();
  document.getElementById('mode-toggle').hidden = false;
  document.getElementById('continent-buttons').hidden = false;
  document.getElementById('flag-container').hidden = false;
  document.getElementById('progress').hidden = false;
  document.getElementById('rate-own-flag').hidden = true;
  setFeedback('');
  document.getElementById('feedback').innerHTML = '';
  syncActionButtons();
  return true;
}

export function showRateSummary() {
  const summary = buildRatingSummary();
  setFeedback(summary);
  document.getElementById('feedback').innerHTML = summary;
  const shareButton = document.getElementById('share');
  shareButton.hidden = false;
  shareButton.dataset.mode = 'rate';
  shareButton.innerText = '📤 Share Your Rating';
  syncActionButtons();
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
  const rateComplete = isRateMode && rateHistory.length >= (MODE_DATASETS[getState().currentMode || 'world']?.length ?? 0);
  const playView = !isStudyMode && !isRateMode;
  const replayButton = document.getElementById('replay');

  document.getElementById('buttons-div').hidden = isStudyMode || isRateMode;
  document.getElementById('submit').hidden = gameOver || !playView;
  document.getElementById('skip').hidden = gameOver || !playView;
  replayButton.hidden = !gameOver || isStudyMode || isRateMode;
  replayButton.setAttribute('aria-hidden', String(replayButton.hidden));
  const answerWrapper = document.getElementById('answer-wrapper');
  const inputDiv = document.getElementById('input-div');
  document.getElementById('answer').disabled = gameOver || !playView;
  document.getElementById('answer').hidden = isStudyMode || isRateMode;
  answerWrapper.hidden = isStudyMode || isRateMode;
  answerWrapper.style.display = isStudyMode || isRateMode ? 'none' : '';
  answerWrapper.style.width = isStudyMode || isRateMode ? 'auto' : '20rem';
  answerWrapper.style.maxWidth = isStudyMode || isRateMode ? 'none' : 'calc(100vw - 9rem)';
  inputDiv.dataset.mode = isStudyMode ? 'study' : isRateMode ? 'rate' : 'play';
  inputDiv.hidden = false;
  document.getElementById('reveal-answer').hidden = !isStudyMode;
  document.getElementById('score').hidden = isStudyMode || isRateMode;
  document.getElementById('answers-table').hidden = isStudyMode || isRateMode;
  document.getElementById('study-controls').hidden = !isStudyMode;
  document.getElementById('study-prev').hidden = !isStudyMode;
  document.getElementById('study-next').hidden = !isStudyMode;
  document.getElementById('rating-buttons').hidden = !isRateMode;
  document.getElementById('share').hidden = !(gameOver || rateComplete) || isStudyMode;
  document.getElementById('share').dataset.mode = isRateMode ? 'rate' : 'play';
  if (isRateMode && !rateComplete) {
    document.getElementById('share').innerText = '📤 Share Your Rating';
  }
  document.getElementById('rate-own-flag').hidden = !decodeRatingPayloadFromHash();
}

export function resetGame(mode = 'world') {
  resetState(mode);
  rateHistory = [];
  ratingCounts = Object.fromEntries(RATE_TIERS.map((tier) => [tier, 0]));
  const { score, countriesPlayed, numCountries } = getState();
  document.getElementById('score').innerText = `Score: ${score}`;
  document.getElementById('progress-value').innerText = countriesPlayed.length;
  document.getElementById('total-countries').innerText = numCountries;
  document.getElementById('share').hidden = true;
  document.getElementById('share').dataset.mode = 'play';
  document.getElementById('share').innerText = '📤 Share Score';
  document.getElementById('replay').hidden = true;
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
  if (isSharedSummaryView) {
    return;
  }
  resetGame(mode);
  removeActiveClassFromContinentButtons();
  document.getElementById(mode).classList.add('active');
  if (isStudyMode) {
    studyIndex = 0;
    showStudyCountry();
  } else if (isRateMode) {
    showRateCountry();
  } else {
    playGame();
  }
}

export function initGame() {
  isSharedSummaryView = false;
  const savedState = loadState();
  const savedMode = loadGameMode();
  const initialMode = savedMode === 'study' ? 'study' : savedMode === 'rate' ? 'rate' : 'play';
  const uiMode = initialMode === 'study';
  const rateMode = initialMode === 'rate';

  isStudyMode = uiMode;
  isRateMode = rateMode;
  if (savedState) {
    restoreState(savedState);
  } else {
    switchMode('world');
  }

  const playButton = document.getElementById('play-mode');
  const studyButton = document.getElementById('study-mode');
  const rateButton = document.getElementById('rate-mode');
  if (playButton && studyButton && rateButton) {
    playButton.classList.toggle('active', !uiMode && !rateMode);
    studyButton.classList.toggle('active', uiMode);
    rateButton.classList.toggle('active', rateMode);
  }
  if (rateMode) {
    rateHistory = [];
    ratingCounts = Object.fromEntries(RATE_TIERS.map((tier) => [tier, 0]));
    showRateCountry();
  }
  if (applySharedRatingSummary()) {
    isRateMode = false;
    isStudyMode = false;
    return;
  }
  syncActionButtons();
}

export { MODE_DATASETS };
