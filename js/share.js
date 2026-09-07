import { getState, getCountryIso, MODE_DATASETS } from './game_state.js';

const RATING_TIERS = ['S', 'A', 'B', 'C', 'D', 'F'];
const RATING_EMOJIS = { S: '🔥', A: '⭐', B: '🥈', C: '😐', D: '🗑️', F: '💥' };

function getFlagEmoji(country) {
  const iso = getCountryIso(country);
  if (!iso || iso.length !== 2) return '';
  return String.fromCodePoint(
    iso.toLowerCase().charCodeAt(0) - 97 + 127462,
    iso.toLowerCase().charCodeAt(1) - 97 + 127462
  );
}

export function encodeRatingPayload(ratings = {}) {
  const normalized = Object.fromEntries(
    RATING_TIERS.map((tier) => {
      const countryNames = Array.isArray(ratings[tier]) ? ratings[tier] : [];
      const indices = countryNames.map(c => MODE_DATASETS.world.indexOf(c)).filter(i => i !== -1);
      return [tier, indices];
    })
  );
  const json = JSON.stringify(normalized);
  return btoa(
    encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
  );
}

export function decodeRatingPayload(token) {
  if (!token) {
    return null;
  }
  try {
    const bytes = atob(token);
    const json = decodeURIComponent(
      Array.from(bytes, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
    );
    const parsed = JSON.parse(json);
    return Object.fromEntries(RATING_TIERS.map((tier) => {
      const indices = parsed[tier] ?? [];
      // Handle legacy count format if the array isn't populated
      if (typeof indices === 'number') return [tier, indices];
      const countries = indices.map(i => MODE_DATASETS.world[i]).filter(Boolean);
      return [tier, countries];
    }));
  } catch {
    return null;
  }
}

const CONTINENT_CODES = {
  'north-america': 'na',
  'south-america': 'sa',
  'europe': 'eu',
  'asia': 'as',
  'oceania': 'oc',
  'africa': 'af',
  'world': 'wo'
};
const CONTINENT_FROM_CODES = Object.fromEntries(
  Object.entries(CONTINENT_CODES).map(([k, v]) => [v, k])
);

export function decodeRatingPayloadFromHash(hash = window.location.hash) {
  if (!hash || !hash.startsWith('#')) {
    return null;
  }
  const payloadMatch = hash.match(/[?&]r=([^&]+)/i) || hash.match(/#r=([^&]+)/i) || hash.match(/[?&]ratings=([^&]+)/i) || hash.match(/#ratings=([^&]+)/i);
  if (!payloadMatch) {
    return null;
  }
  const continentMatch = hash.match(/[?&]ct=([^&]+)/i) || hash.match(/#ct=([^&]+)/i) || hash.match(/[?&]continent=([^&]+)/i) || hash.match(/#continent=([^&]+)/i);
  const data = decodeRatingPayload(payloadMatch[1]);
  if (!data) {
    return null;
  }
  let parsedContinent = continentMatch ? decodeURIComponent(continentMatch[1]).toLowerCase() : 'world';
  parsedContinent = CONTINENT_FROM_CODES[parsedContinent] || parsedContinent;
  
  return {
    ...data,
    continent: parsedContinent,
  };
}

export function buildResultsEmojiGrid(rowSize = 10) {
  const squares = getState().resultsGrid.map((correct) => correct ? '🟩' : '🟥');
  const rows = [];
  for (let i = 0; i < squares.length; i += rowSize) {
    rows.push(squares.slice(i, i + rowSize).join(''));
  }
  return rows.join('\n');
}

export function buildShareText() {
  const activeContinentButton = document.querySelector('.continent-btn.active');
  const modeName = activeContinentButton ? activeContinentButton.textContent.trim() : 'World';
  const { score, numCountries } = getState();
  return `Country Flags Game - ${modeName}\nScore: ${score}/${numCountries}\n${buildResultsEmojiGrid()}`;
}

export function buildRatingSummaryText(ratings = {}) {
  const continent = ratings.continent ? String(ratings.continent).toLowerCase() : 'world';
  const lines = RATING_TIERS.map((tier) => {
    const data = ratings[tier];
    if (Array.isArray(data) && data.length > 0) {
      const count = data.length;
      const icons = data.map(c => getFlagEmoji(c) || RATING_EMOJIS[tier]).join(' ');
      return `${tier}: ${count} ${icons}`;
    }
    const count = Number(data ?? 0);
    const icon = count > 0 ? RATING_EMOJIS[tier].repeat(count) : '—';
    return `${tier}: ${count} ${icon}`;
  });
  return `${formatContinentLabel(continent)} flag ratings\n${lines.join('\n')}`;
}

export function formatContinentLabel(continent) {
  const normalized = String(continent || 'world').toLowerCase();
  const labels = {
    africa: 'Africa',
    asia: 'Asia',
    europe: 'Europe',
    'north-america': 'North America',
    'south-america': 'South America',
    oceania: 'Oceania',
    world: 'World',
  };
  return labels[normalized] || normalized.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function buildRatingShareText() {
  return `${window.location.href}`;
}

export async function shareScore() {
  const shareData = { text: buildShareText(), url: window.location.href };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      console.error(err);
    }
    return;
  }
  const shareButton = document.getElementById('share');
  const originalLabel = shareButton.innerText;
  try {
    await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
    shareButton.innerText = 'Copied to clipboard!';
  } catch (err) {
    shareButton.innerText = 'Could not copy score';
  }
  setTimeout(() => {
    shareButton.innerText = originalLabel;
  }, 2000);
}

import { getRateHistory } from './flags_game.js';

export async function shareRating() {
  const shareButton = document.getElementById('share');
  
  // Extract history and map to arrays of countries by tier
  const rateHistory = getRateHistory();
  const ratingsByTier = {};
  RATING_TIERS.forEach(tier => {
    ratingsByTier[tier] = rateHistory.filter(entry => entry.tier === tier).map(entry => entry.country);
  });

  const continent = document.querySelector('.continent-btn.active')?.id || 'world';
  const shortContinent = CONTINENT_CODES[continent] || continent;
  const url = new URL(window.location.href);
  url.hash = `ct=${encodeURIComponent(shortContinent)}&r=${encodeRatingPayload(ratingsByTier)}`;
  
  const textSummary = buildRatingSummaryText({ ...ratingsByTier, continent });
  const shareData = { text: `${textSummary}\n${url.toString()}`, url: url.toString() };
  
  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      console.error(err);
    }
    return;
  }
  const originalLabel = shareButton.innerText;
  try {
    await navigator.clipboard.writeText(shareData.text);
    shareButton.innerText = 'Copied to clipboard!';
  } catch (err) {
    shareButton.innerText = 'Could not share ratings';
  }
  setTimeout(() => {
    shareButton.innerText = originalLabel;
  }, 2000);
}
