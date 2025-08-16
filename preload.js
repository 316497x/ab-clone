const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openChallenge: () => ipcRenderer.send('open-challenge'),
  openTrain: () => ipcRenderer.send('open-train'),

  onStartChallenge: (callback) => ipcRenderer.on('start-challenge', callback)
});