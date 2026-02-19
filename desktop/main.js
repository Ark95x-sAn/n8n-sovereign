/**
 * ARK95X SOVEREIGN AI DESKTOP COORDINATOR
 * main.js - Electron Main Process
 * Commander: Ben Nordskog | Ark95x | bnordskog45@gmail.com
 * Version: 1.0.0 | Leland, Iowa
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const cron = require('node-cron');

let mainWindow;
let tray;

// ==========================================
// SOVEREIGN AGENT REGISTRY
// ==========================================
const AGENTS = [
  { id: 'chatgpt',    name: 'ChatGPT',    plan: 'Pro',    tokens: 1000, url: 'https://chatgpt.com',     color: '#10a37f' },
  { id: 'claude',     name: 'Claude',     plan: 'Free',   tokens: 1200, url: 'https://claude.ai',      color: '#cc785c' },
  { id: 'grok',       name: 'Grok',       plan: 'Pro',    tokens: 900,  url: 'https://grok.com',       color: '#1da1f2' },
  { id: 'gemini',     name: 'Gemini',     plan: 'Free',   tokens: 800,  url: 'https://gemini.google.com', color: '#4285f4' },
  { id: 'perplexity', name: 'Perplexity', plan: 'Active', tokens: 950,  url: 'https://perplexity.ai',  color: '#20b8cd' },
  { id: 'manus',      name: 'Manus',      plan: 'Free',   tokens: 500,  url: 'https://manus.im',       color: '#7c3aed' }
];

// ==========================================
// SHIFT SYSTEM
// ==========================================
function getCurrentShift() {
  const hour = new Date().getUTCHours();
  if (hour < 8)  return { name: 'ALPHA', label: 'Predictive Analysis', agents: ['Perplexity', 'Grok'] };
  if (hour < 16) return { name: 'BETA',  label: 'Active Execution',    agents: ['ChatGPT', 'Claude', 'Grok'] };
  return             { name: 'GAMMA', label: 'Review & Optimize',   agents: ['Claude', 'Gemini', 'Manus'] };
}

// ==========================================
// MAIN WINDOW
// ==========================================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'ARK95X Sovereign Coordinator',
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0f',
      symbolColor: '#ffffff',
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.send('shift-update', getCurrentShift());
    mainWindow.webContents.send('agents-update', AGENTS);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ==========================================
// SYSTEM TRAY
// ==========================================
function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('ARK95X Sovereign Coordinator');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Commander', click: () => mainWindow ? mainWindow.show() : createWindow() },
    { label: 'Current Shift: ' + getCurrentShift().name, enabled: false },
    { type: 'separator' },
    { label: 'n8n Cloud',    click: () => shell.openExternal('https://ark95x.app.n8n.cloud') },
    { label: 'GitHub Repo',  click: () => shell.openExternal('https://github.com/Ark95x-sAn/n8n-sovereign') },
    { label: 'Alpaca',       click: () => shell.openExternal('https://app.alpaca.markets') },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' }
  ]));
  tray.on('double-click', () => mainWindow ? mainWindow.show() : createWindow());
}

// ==========================================
// IPC HANDLERS
// ==========================================
ipcMain.handle('get-shift', () => getCurrentShift());
ipcMain.handle('get-agents', () => AGENTS);
ipcMain.handle('open-agent', (event, url) => shell.openExternal(url));
ipcMain.handle('open-n8n', () => shell.openExternal('https://ark95x.app.n8n.cloud'));
ipcMain.handle('open-alpaca', () => shell.openExternal('https://app.alpaca.markets'));
ipcMain.handle('open-github', () => shell.openExternal('https://github.com/Ark95x-sAn/n8n-sovereign'));
ipcMain.handle('open-square', () => shell.openExternal('https://squareup.com/dashboard'));

// ==========================================
// CRON - 15-MIN HEARTBEAT
// ==========================================
cron.schedule('*/15 * * * *', () => {
  const shift = getCurrentShift();
  if (mainWindow) {
    mainWindow.webContents.send('heartbeat', {
      timestamp: new Date().toISOString(),
      shift,
      status: 'OPERATIONAL'
    });
  }
});

// ==========================================
// APP LIFECYCLE
// ==========================================
app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', () => { if (!mainWindow) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

console.log('[ARK95X] Sovereign Coordinator initialized | Commander: Ben Nordskog');
