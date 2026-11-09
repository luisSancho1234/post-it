const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('postit', {
  getNote: (id) => ipcRenderer.invoke('note:get', id),
  getColors: () => ipcRenderer.invoke('app:colors'),
  update: (id, patch) => ipcRenderer.send('note:update', id, patch),
  togglePin: (id) => ipcRenderer.invoke('note:pin', id),
  toggleCollapse: (id) => ipcRenderer.invoke('note:collapse', id),
  newNote: () => ipcRenderer.send('note:new'),
  deleteNote: (id) => ipcRenderer.send('note:delete', id),
});
