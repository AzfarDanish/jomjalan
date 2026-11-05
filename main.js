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
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'discover.html'));

  // Watch renderer directory and automatically reload window on file changes
  const rendererDir = path.join(__dirname, 'renderer');
  let reloadTimeout = null;
  fs.watch(rendererDir, { recursive: true }, (eventType, filename) => {
    if (reloadTimeout) {
      clearTimeout(reloadTimeout);
    }
    // Debounce reloads to prevent multiple quick triggers on file save
    reloadTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.reloadIgnoringCache();
      }
    }, 150);
  });
}

ipcMain.handle('get-geoapify-key', () => {
  return readEnvValue('geoapifyKey') || readEnvValue('GEOAPIFY_API_KEY');
});

ipcMain.handle('get-unsplash-key', () => {
  return (
    readEnvValue('unsplashKey') ||
    readEnvValue('UNSPLASH_ACCESS_KEY') ||
    readEnvValue('Access Key')
  );
});

app.whenReady().then(createMainWindow);
