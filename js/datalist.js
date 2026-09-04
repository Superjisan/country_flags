export function populateCountriesDatalist(countryNames) {
  const datalistElem = document.getElementById('countries-list');
  countryNames.forEach((country) => {
    const optionElem = document.createElement('option');
    optionElem.value = country;
    datalistElem.appendChild(optionElem);
  });
}
