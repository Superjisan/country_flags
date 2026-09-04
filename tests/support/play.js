// Answers whatever flag is currently displayed, reading the country from the
// hidden #country element so tests don't depend on random play order.
export function answerCurrentCountry(game, { skip = false, answer = null } = {}) {
  const country = document.getElementById('country').innerText;
  if (!skip) {
    document.getElementById('answer').value = answer ?? country;
  }
  game.checkAnswer(skip);
  return country;
}
