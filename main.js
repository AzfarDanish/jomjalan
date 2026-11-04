const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ItineraryStore = require('./main/ItineraryStore');

const itineraryStore = new ItineraryStore(
  path.join(__dirname, 'data', 'itineraries.json')
);

let mainWindow;
let itineraryWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function createItineraryWindow(country) {
  itineraryWindow = new BrowserWindow({
    width: 600,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  itineraryWindow.loadFile(path.join(__dirname, 'renderer', 'itinerary.html'));

  itineraryWindow.webContents.on('did-finish-load', () => {
    itineraryWindow.webContents.send('country-selected', country);
  });
}

ipcMain.on('open-itinerary-window', (event, country) => {
  createItineraryWindow(country);
});

ipcMain.handle('save-itinerary', (event, data) => {
  try {
    itineraryStore.add(data);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

app.whenReady().then(createMainWindow);
