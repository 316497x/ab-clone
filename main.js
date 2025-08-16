const { app, BrowserWindow } = require('electron');
const path = require('path');
const { ipcMain } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 640,
    height: 500,
    resizable: false,
    webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true
    }
  });

  //win.webContents.openDevTools();
  win.setMenu(null);
  win.loadFile('index.html').catch(err => {
    console.error('Failed to load index.html:', err);
  });

  ipcMain.on('open-challenge', () => {
    console.log('Challenge mode clicked!');
    win.webContents.send('start-challenge');
  });

  ipcMain.on('open-train', () => {
    console.log('Train mode clicked!');
    // win.webContents.send('start-train');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});