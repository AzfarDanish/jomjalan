require('electron-reload')(__dirname);
const { app, BrowserWindow, ipcMain } = require('electron');

const { loadKeys } = require('./backend/keys');
const { searchLocation } = require('./backend/location');
const { getWeather } = require('./backend/weather');
const { saveItinerary } = require('./backend/itinerary');

const apiKeys = loadKeys();

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile('renderer/index.html');
}

function createItineraryWindow(country) {
  const itineraryWindow = new BrowserWindow({
    width: 600,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  itineraryWindow.loadFile('renderer/itinerary.html');

  itineraryWindow.webContents.on('did-finish-load', () => {
    itineraryWindow.webContents.send('country-selected', country);
  });
}

// Wire up IPC handlers.
ipcMain.on('open-itinerary-window', (event, country) => createItineraryWindow(country));
ipcMain.on('save-itinerary', (event, data) => saveItinerary(data));
ipcMain.handle('search-location', async (event, text) => searchLocation(apiKeys, text));
ipcMain.handle('get-weather', async (event, lat, lon) => getWeather(lat, lon));

app.whenReady().then(createMainWindow);
