import { getAliases } from './game_state.js';

let suggestionIndex = -1;

export function populateCountriesDatalist(countryNames) {
  const datalistElem = document.getElementById('countries-list');
  const seen = new Set();

  while (datalistElem.firstChild) {
    datalistElem.removeChild(datalistElem.firstChild);
  }

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

  renderCountrySuggestions();
}

function setActiveSuggestion(suggestions, index) {
  const buttons = [...suggestions.querySelectorAll('.country-suggestion')];
  if (!buttons.length) {
    suggestionIndex = -1;
    return;
  }

  suggestionIndex = Math.max(0, Math.min(index, buttons.length - 1));

  buttons.forEach((button, buttonIndex) => {
    button.classList.toggle('active', buttonIndex === suggestionIndex);
  });
}

export function renderCountrySuggestions() {
  const input = document.getElementById('answer');
  const suggestions = document.getElementById('answer-suggestions');
  if (!input || !suggestions) {
    return;
  }

  const query = input.value.trim().toLowerCase();
  const values = [...document.querySelectorAll('#countries-list option')].map((option) => option.value);
  const matches = query
    ? values.filter((value) => value.toLowerCase().includes(query)).slice(0, 12)
    : [];

  suggestions.innerHTML = '';
  if (!matches.length) {
    suggestions.hidden = true;
    suggestionIndex = -1;
    return;
  }

  matches.forEach((value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'country-suggestion';
    button.textContent = value;
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      input.value = value;
      suggestions.hidden = true;
      suggestionIndex = -1;
      input.focus();
    });
    suggestions.appendChild(button);
  });

  suggestionIndex = -1;
  suggestions.hidden = false;
}

export function bindCountrySuggestions() {
  const input = document.getElementById('answer');
  const suggestions = document.getElementById('answer-suggestions');
  if (!input || !suggestions) {
    return;
  }

  input.addEventListener('input', renderCountrySuggestions);
  input.addEventListener('focus', renderCountrySuggestions);
  input.addEventListener('keydown', (event) => {
    if (suggestions.hidden) {
      return;
    }

    const buttons = [...suggestions.querySelectorAll('.country-suggestion')];
    if (!buttons.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopImmediatePropagation();
      const nextIndex = suggestionIndex >= 0 ? (suggestionIndex + 1) % buttons.length : 0;
      setActiveSuggestion(suggestions, nextIndex);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopImmediatePropagation();
      const nextIndex = suggestionIndex >= 0 ? (suggestionIndex - 1 + buttons.length) % buttons.length : buttons.length - 1;
      setActiveSuggestion(suggestions, nextIndex);
      return;
    }

    if (event.key === 'Enter') {
      return;
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      suggestions.hidden = true;
      suggestionIndex = -1;
    }, 150);
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target !== input && !suggestions.contains(target)) {
      suggestions.hidden = true;
      suggestionIndex = -1;
    }
  });
}
