const { ipcRenderer } = require('electron');
const GeoapifyService = require('./js/services/GeoapifyService');
const CountryService = require('./js/services/CountryService');
const OpenMeteoService = require('./js/services/OpenMeteoService');
const CurrencyService = require('./js/services/CurrencyService');
const UnsplashService = require('./js/services/UnsplashService');
const TripRepository = require('./js/data/TripRepository');
const HomeApp = require('./js/ui/HomeApp');

async function start() {
  let apiKey = '';
  let unsplashKey = '';

  try {
    apiKey = await ipcRenderer.invoke('get-geoapify-key');
  } catch (error) {
    apiKey = '';
  }

  try {
    unsplashKey = await ipcRenderer.invoke('get-unsplash-key');
  } catch (error) {
    unsplashKey = '';
  }

  const geoapifyService = new GeoapifyService(apiKey);
  const countryService = new CountryService();
  const weatherService = new OpenMeteoService();
  const currencyService = new CurrencyService();
  const unsplashService = new UnsplashService(unsplashKey);
  const tripRepository = new TripRepository();
  const homeApp = new HomeApp(
    geoapifyService,
    countryService,
    weatherService,
    currencyService,
    tripRepository,
    unsplashService
  );

  homeApp.start();
}

start().catch((error) => {
  const message = document.getElementById('destinationMessage');

  if (message) {
    message.textContent = `Unable to start the home page: ${error.message}`;
    message.className = 'message error-text';
  }
});
