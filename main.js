const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Read one value from .env.local so secrets do not have to live in the
// renderer source. Process environment variables are used as a fallback.
function readEnvValue(name) {
  const envPath = path.join(__dirname, '.env.local');

  if (fs.existsSync(envPath)) {
    try {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const separator = trimmed.indexOf('=');

        if (separator === -1) {
          continue;
        }

        const key = trimmed.slice(0, separator).trim();

        if (key === name) {
          return trimmed.slice(separator + 1).trim();
        }
      }
    } catch (error) {
      // Fall through to the process environment.
    }
  }

  return process.env[name] || '';
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'home.html'));
}

ipcMain.handle('get-geoapify-key', () => {
  return (
    readEnvValue('geoapifyKey') ||
    readEnvValue('GEOAPIFY_API_KEY') ||
    process.env.GEOAPIFY_API_KEY ||
    ''
  );
});

app.whenReady().then(createMainWindow);
