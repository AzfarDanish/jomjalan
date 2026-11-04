const { ipcRenderer } = require('electron');

let selectedCountry = '';

ipcRenderer.on('country-selected', (event, country) => {
  selectedCountry = country;
  document.getElementById('title').textContent = `Create Itinerary for ${country}`;
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const date = document.getElementById('dateInput').value;
  const plan = document.getElementById('planInput').value.trim();

  if (!date || !plan) {
    alert('Please fill all fields.');
    return;
  }

  ipcRenderer.send('save-itinerary', { country: selectedCountry, date, plan });
  alert('Itinerary saved!');
});
