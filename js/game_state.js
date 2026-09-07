import countries from '../data/countries.json' with { type: 'json' };
import { saveGameState, loadGameState } from './persistence.js';

const CONTINENTS = ['africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania'];

// Countries can belong to zero continents (e.g. England, only playable in World
// mode) or more than one (e.g. Russia, playable in both Asia and Europe).
export const MODE_DATASETS = {
  world: Object.keys(countries),
  ...Object.fromEntries(
    CONTINENTS.map((continent) => [
      continent,
      Object.keys(countries).filter((country) => countries[country].continents.includes(continent)),
    ])
  ),
};

let score = 0;
let countriesPlayed = [];
let countriesLeft = [];
let numCountries = MODE_DATASETS.world.length;
let resultsGrid = [];
let answersGiven = [];
let currentMode = 'world';
let currentCountry = null;
let feedback = '';

// Folds away the differences a player shouldn't be punished for: case,
// diacritics ("Türkiye" vs "Turkiye"), punctuation and spacing ("Cote d'Ivoire"
// vs "Cote dIvoire", "St. Lucia" vs "St Lucia"). Genuinely different names --
// "Turkey" for "Türkiye", "Holland" for "Netherlands" -- still need an entry in
// the country's own "aliases" list in countries.json.
export function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isValidMode(mode) {
  return Array.isArray(MODE_DATASETS[mode]);
}

export function getCountryNames() {
  return MODE_DATASETS.world;
}

export function getAliases(country) {
  return countries[country]?.aliases ?? [];
}

// Comparison key: normalizeName with the word gaps closed up too, so a missing
// or extra space ("Cote dIvoire", "Guinea Bissau") still matches. Kept separate
// from normalizeName, which stays readable for display and for tests.
export function matchKey(name) {
  return normalizeName(name).replace(/ /g, '');
}

export function getCorrectAnswer(country, answer) {
  if (!countries[country]) {
    return false;
  }
  const answerKey = matchKey(answer);
  if (answerKey === '') {
    return false;
  }
  return [country, ...getAliases(country)].some((name) => matchKey(name) === answerKey);
}

export function getCountryIso(country) {
  return countries[country]?.iso ?? null;
}

export function getFallbackFlagSlug(country) {
  return countries[country]?.flagSlug ?? null;
}

// Countries whose flag no flag host serves correctly -- flagcdn and
// worldflags.net both still publish the pre-2021 Afghanistan flag -- carry a
// path to a copy committed under flags/ instead.
export function getLocalFlagFile(country) {
  return countries[country]?.flagFile ?? null;
}

export function getRandomCountry() {
  const randomIndex = Math.floor(Math.random() * countriesLeft.length);
  return countriesLeft[randomIndex];
}

export function setCurrentCountry(country) {
  currentCountry = country;
}

export function setFeedback(text) {
  feedback = text;
}

export function hasPlayed(country) {
  return countriesPlayed.includes(country);
}

export function isGameOver() {
  return countriesPlayed.length >= numCountries;
}

export function recordAnswer(country, answer, correct) {
  if (correct) {
    score++;
  }
  resultsGrid.push(correct);
  answersGiven.push(answer);
  countriesPlayed.push(country);
  countriesLeft = countriesLeft.filter((remaining) => remaining !== country);
}

export function resetState(mode) {
  const countriesToUse = MODE_DATASETS[mode];
  score = 0;
  countriesPlayed = [];
  countriesLeft = [...countriesToUse];
  numCountries = countriesToUse.length;
  resultsGrid = [];
  answersGiven = [];
  currentMode = mode;
  currentCountry = null;
  feedback = '';
}

export function applySavedState(state) {
  currentMode = state.mode;
  countriesPlayed = state.countriesPlayed;
  resultsGrid = state.resultsGrid;
  answersGiven = state.answersGiven;
  currentCountry = state.currentCountry;
  feedback = state.feedback || '';
  score = resultsGrid.filter(Boolean).length;
  const countriesToUse = MODE_DATASETS[currentMode];
  numCountries = countriesToUse.length;
  countriesLeft = countriesToUse.filter((country) => !countriesPlayed.includes(country));
}

export function serializeState() {
  return { mode: currentMode, currentCountry, feedback, countriesPlayed, resultsGrid, answersGiven };
}

export function getState() {
  return { score, numCountries, currentMode, currentCountry, feedback, countriesPlayed, answersGiven, resultsGrid };
}

export function saveState() {
  saveGameState(serializeState());
}

export function loadState() {
  return loadGameState(isValidMode);
}
