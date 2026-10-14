import { MODE_DATASETS, getState, setCurrentCountry, setFeedback } from './game_state.js';
import { updateCountryFlag, flagUrl } from './country_flag.js';
import { saveGameMode } from './persistence.js';
import { decodeRatingPayloadFromHash, formatContinentLabel } from './share.js';
import { isRateMode, setViewMode, syncModeToggleButtons } from './view_mode.js';
import {
  playGame, resetGame, syncActionButtons, switchMode, removeActiveClassFromContinentButtons,
} from './flags_game.js';

const RATE_TIERS = ['S', 'A', 'B', 'C', 'D', 'F'];
const TIER_EMOJIS = { S: '🔥', A: '⭐', B: '🥈', C: '😐', D: '🗑️', F: '💥' };

let sharedSummaryView = false;
let gamePageTitle = null;
let rateHistory = [];
let ratingCounts = emptyRatingCounts();

function emptyRatingCounts() {
  return Object.fromEntries(RATE_TIERS.map((tier) => [tier, 0]));
}

export function resetRatings() {
  rateHistory = [];
  ratingCounts = emptyRatingCounts();
}

export function isSharedSummaryView() {
  return sharedSummaryView;
}

export function clearSharedSummaryView() {
  sharedSummaryView = false;
}

export function isRateComplete() {
  return rateHistory.length >= (MODE_DATASETS[getState().currentMode || 'world']?.length ?? 0);
}

export function setRateMode(enabled) {
  setViewMode(enabled ? 'rate' : 'play');
  saveGameMode(enabled ? 'rate' : 'play');
  syncModeToggleButtons();
  document.getElementById('rate-own-flag')?.setAttribute('hidden', 'hidden');

  if (enabled) {
    resetRatings();
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
  document.getElementById('country').hidden = false;
  document.getElementById('progress-value').innerText = String(rateHistory.length);
  document.getElementById('total-countries').innerText = String(countries.length);
  updateCountryFlag(nextCountry);
}

export function recordRateTier(tier) {
  if (!isRateMode()) {
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

  if (isRateComplete()) {
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
  sharedSummaryView = true;
  setViewMode('play');
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
    sharedSummaryView = false;
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
  if (!sharedSummaryView) {
    return false;
  }
  sharedSummaryView = false;
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
