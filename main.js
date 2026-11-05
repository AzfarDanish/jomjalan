const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

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
  fs.watch(rendererDir, { recursive: true }, () => {
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

app.whenReady().then(createMainWindow);
