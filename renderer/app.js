// Feature: wire everything together
const { ipcRenderer } = require('electron');

// Initialize the sidebar using OOP
const sidebar = new Sidebar('sidebar', 'Home');

const input = document.getElementById('location-input');
const suggestionsBox = document.getElementById('suggestions');
const clearBtn = document.getElementById('clear-btn');
const selectedBox = document.getElementById('selected-location');
const weatherCardElement = document.getElementById('weather-card');

const weatherCard = new WeatherCard(weatherCardElement);

// Hide selected-location and weather while typing.
input.addEventListener('input', () => {
  selectedBox.classList.add('hidden');
  weatherCard.hide();
});

const locationSearch = new LocationSearch(input, suggestionsBox, clearBtn, (item) => {
  // Show the selected location.
  selectedBox.innerHTML = '';

  const heading = document.createElement('div');
  heading.className = 'selected-name';
  heading.textContent = `📍 ${item.name}${item.detail ? ` · ${item.detail}` : ''}`;
  selectedBox.appendChild(heading);

  const coords = document.createElement('div');
  coords.className = 'selected-coords';
  coords.textContent = `${item.lat}, ${item.lon}`;
  selectedBox.appendChild(coords);

  selectedBox.classList.remove('hidden');

  // Fetch and show weather.
  weatherCard.hide();
  ipcRenderer.invoke('get-weather', item.lat, item.lon).then((weather) => {
    if (weather) weatherCard.show(weather);
  });
});

// Clear button also hides the weather card.
const originalClear = locationSearch.clear.bind(locationSearch);
locationSearch.clear = function () {
  originalClear();
  selectedBox.classList.add('hidden');
  weatherCard.hide();
};
