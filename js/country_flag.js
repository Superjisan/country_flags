import { getCountryIso, getFallbackFlagSlug } from './game_state.js';

function showFlag(src) {
  document.getElementById('country-flag').src = src;
  document.getElementById('country-flag').hidden = false;
  document.getElementById('flag-missing').hidden = true;
}

function hideFlag() {
  document.getElementById('country-flag').hidden = true;
  document.getElementById('flag-missing').hidden = false;
}

export function flagUrl(country) {
  const isoCode = getCountryIso(country);
  if (isoCode) {
    return `https://flagcdn.com/${isoCode}.svg`;
  }
  const fallbackSlug = getFallbackFlagSlug(country);
  return fallbackSlug ? `https://worldflags.net/assets/img/flags/${fallbackSlug}-flag.png` : null;
}

export function updateCountryFlag(country) {
  const url = flagUrl(country);
  if (url) {
    showFlag(url);
    return;
  }
  hideFlag();
}

export function registerCountryFlagErrorHandler() {
  document.getElementById('country-flag').addEventListener('error', hideFlag);
}
