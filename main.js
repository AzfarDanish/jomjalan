require('electron-reload')(__dirname);
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

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
  mainWindow.loadFile('renderer/index.html');
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

  itineraryWindow.loadFile('renderer/itinerary.html');

  itineraryWindow.webContents.on('did-finish-load', () => {
    itineraryWindow.webContents.send('country-selected', country);
  });
}

ipcMain.on('open-itinerary-window', (event, country) => {
  createItineraryWindow(country);
});

ipcMain.on('save-itinerary', (event, data) => {
  const filePath = path.join(__dirname, 'data', 'itineraries.json');
  let itineraries = [];

  if (fs.existsSync(filePath)) {
    itineraries = JSON.parse(fs.readFileSync(filePath));
  }

  itineraries.push(data);
  fs.writeFileSync(filePath, JSON.stringify(itineraries, null, 2));
});

app.whenReady().then(createMainWindow);
