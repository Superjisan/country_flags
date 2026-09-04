import { flagUrl } from './country_flag.js';

export function buildAnswerRow(country, answer, correct) {
  const tbodyElem = document.getElementById('answers-body');
  const trElem = document.createElement('tr');

  const flagTd = document.createElement('td');
  const url = flagUrl(country);
  if (url) {
    const flagImg = document.createElement('img');
    flagImg.src = url;
    flagImg.alt = `Flag of ${country}`;
    flagImg.className = 'answer-flag';
    flagImg.addEventListener('error', function () {
      this.hidden = true;
    });
    flagTd.appendChild(flagImg);
  }
  trElem.appendChild(flagTd);

  const countryTd = document.createElement('td');
  countryTd.innerText = country;
  trElem.appendChild(countryTd);

  trElem.style.backgroundColor = correct ? 'lightgreen' : 'lightcoral';
  const resultTd = document.createElement('td');
  resultTd.innerText = correct ? 'Correct' : 'Wrong';
  trElem.appendChild(resultTd);

  const yourAnswerTd = document.createElement('td');
  yourAnswerTd.innerText = answer;
  trElem.appendChild(yourAnswerTd);

  tbodyElem.appendChild(trElem);
}

export function clearAnswersTable() {
  const tbodyElem = document.getElementById('answers-body');
  while (tbodyElem.firstChild) {
    tbodyElem.removeChild(tbodyElem.firstChild);
  }
}
