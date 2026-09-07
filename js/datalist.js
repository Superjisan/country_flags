import { getAliases } from './game_state.js';

export function populateCountriesDatalist(countryNames) {
  const datalistElem = document.getElementById('countries-list');
  const seen = new Set();

  countryNames.forEach((country) => {
    for (const entry of [country, ...getAliases(country)]) {
      if (seen.has(entry)) {
        continue;
      }
      seen.add(entry);
      const optionElem = document.createElement('option');
      optionElem.value = entry;
      datalistElem.appendChild(optionElem);
    }
  });
}
