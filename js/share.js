import { getState } from './game_state.js';

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
