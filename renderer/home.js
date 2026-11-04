const { ipcRenderer } = require('electron');
const GeoapifyService = require('./js/services/GeoapifyService');
const CountryService = require('./js/services/CountryService');
const HomeApp = require('./js/ui/HomeApp');

async function start() {
  let apiKey = '';

  try {
    apiKey = await ipcRenderer.invoke('get-geoapify-key');
  } catch (error) {
    apiKey = '';
  }

  const geoapifyService = new GeoapifyService(apiKey);
  const countryService = new CountryService();
  const homeApp = new HomeApp(geoapifyService, countryService);

  homeApp.start();
}

start().catch((error) => {
  const message = document.getElementById('destinationMessage');

  if (message) {
    message.textContent = `Unable to start the home page: ${error.message}`;
    message.className = 'message error-text';
  }
});
