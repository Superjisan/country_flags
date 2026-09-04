const STORAGE_KEY = 'countryFlagsGameState';

export function saveGameState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadGameState(isValidMode) {
  let state;
  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (err) {
    return null;
  }
  if (!state || !isValidMode(state.mode) || !Array.isArray(state.countriesPlayed)) {
    return null;
  }
  return state;
}
