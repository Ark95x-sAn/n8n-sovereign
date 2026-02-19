/**
 * ARK95X Sovereign Coordinator - preload.js
 * Secure IPC bridge between main and renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sovereign', {
  // Agent management
  getAgents: () => ipcRenderer.invoke('get-agents'),
  getShift:  () => ipcRenderer.invoke('get-shift'),

  // Open platforms in browser
  openAgent:  (url) => ipcRenderer.invoke('open-agent', url),
  openN8n:    () => ipcRenderer.invoke('open-n8n'),
  openAlpaca: () => ipcRenderer.invoke('open-alpaca'),
  openGithub: () => ipcRenderer.invoke('open-github'),
  openSquare: () => ipcRenderer.invoke('open-square'),

  // Listen for main process events
  onHeartbeat:    (cb) => ipcRenderer.on('heartbeat',    (e, d) => cb(d)),
  onShiftUpdate:  (cb) => ipcRenderer.on('shift-update', (e, d) => cb(d)),
  onAgentsUpdate: (cb) => ipcRenderer.on('agents-update',(e, d) => cb(d)),

  // App info
  appInfo: {
    name:      'ARK95X Sovereign Coordinator',
    version:   '1.0.0',
    commander: 'Ben Nordskog',
    handle:    'Ark95x',
    location:  'Leland, Iowa',
    n8n:       'ark95x.app.n8n.cloud',
    repo:      'github.com/Ark95x-sAn/n8n-sovereign'
  }
});
