const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const ICON = path.join(__dirname, 'icon.png');
const COLLAPSED_H = 32;
const COLORS = ['#fff176', '#f8bbd0', '#c5e1a5', '#81d4fa', '#ffcc80', '#ce93d8', '#e0e0e0'];

let notes = [];
const windows = new Map();
let tray = null;
let saveTimer = null;

// ---------- Armazenamento ----------
const dataFile = () => path.join(app.getPath('userData'), 'notes.json');

function loadNotes() {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile(), 'utf8'));
    if (Array.isArray(parsed)) notes = parsed;
  } catch (_) {
    notes = [];
  }
}

function writeNow() {
  try {
    fs.mkdirSync(path.dirname(dataFile()), { recursive: true });
    fs.writeFileSync(dataFile(), JSON.stringify(notes, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro ao salvar notas:', e);
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 300);
}

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------- Notas ----------
function isVisibleOnSomeDisplay(b) {
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return b.x + 60 < a.x + a.width && b.x + b.width - 60 > a.x && b.y + 20 < a.y + a.height && b.y > a.y - 20;
  });
}

function createNote() {
  const wa = screen.getPrimaryDisplay().workArea;
  const offset = (notes.length % 8) * 28;
  const note = {
    id: newId(),
    text: '',
    color: COLORS[notes.length % COLORS.length],
    fontSize: 15,
    pinned: false,
    collapsed: false,
    x: wa.x + wa.width - 300 - offset,
    y: wa.y + 60 + offset,
    w: 260,
    h: 280,
  };
  notes.push(note);
  scheduleSave();
  openNote(note);
  return note;
}

function openNote(note) {
  if (windows.has(note.id)) {
    windows.get(note.id).show();
    return;
  }

  const collapsed = !!note.collapsed;
  const bounds = { x: note.x, y: note.y, width: note.w, height: collapsed ? COLLAPSED_H : note.h };
  const visible = isVisibleOnSomeDisplay(bounds);

  const win = new BrowserWindow({
    ...(visible ? { x: bounds.x, y: bounds.y } : {}),
    width: bounds.width,
    height: bounds.height,
    minWidth: 180,
    minHeight: collapsed ? COLLAPSED_H : 140,
    frame: false,
    resizable: !collapsed,
    maximizable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    transparent: true,
    hasShadow: false,
    alwaysOnTop: !!note.pinned,
    icon: ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (note.pinned) win.setAlwaysOnTop(true, 'floating');

  windows.set(note.id, win);
  win.loadFile('note.html', { query: { id: note.id } });
  win.once('ready-to-show', () => win.show());

  let boundsTimer = null;
  const saveBounds = () => {
    clearTimeout(boundsTimer);
    boundsTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      const n = notes.find((x) => x.id === note.id);
      if (!n) return;
      const b = win.getBounds();
      n.x = b.x; n.y = b.y; n.w = b.width;
      if (!n.collapsed) n.h = b.height;
      scheduleSave();
    }, 250);
  };
  win.on('move', saveBounds);
  win.on('resize', saveBounds);
  win.on('closed', () => windows.delete(note.id));
}

function showAll() {
  if (notes.length === 0) createNote();
  windows.forEach((w) => w.show());
  notes.forEach((n) => { if (!windows.has(n.id)) openNote(n); });
}

function hideAll() {
  windows.forEach((w) => w.hide());
}

// ---------- IPC ----------
ipcMain.handle('note:get', (_e, id) => notes.find((n) => n.id === id) || null);

ipcMain.on('note:update', (_e, id, patch) => {
  const n = notes.find((x) => x.id === id);
  if (!n || !patch) return;
  if (typeof patch.text === 'string') n.text = patch.text;
  if (typeof patch.color === 'string' && COLORS.includes(patch.color)) {
    n.color = patch.color;
    const w = windows.get(id);
    if (w && !w.isDestroyed()) w.setBackgroundColor('#00000000');
  }
  if (typeof patch.fontSize === 'number') n.fontSize = Math.min(32, Math.max(10, patch.fontSize));
  scheduleSave();
});

ipcMain.handle('note:pin', (_e, id) => {
  const n = notes.find((x) => x.id === id);
  const w = windows.get(id);
  if (!n || !w) return false;
  n.pinned = !n.pinned;
  w.setAlwaysOnTop(n.pinned, 'floating');
  scheduleSave();
  return n.pinned;
});

ipcMain.handle('note:collapse', (_e, id) => {
  const n = notes.find((x) => x.id === id);
  const w = windows.get(id);
  if (!n || !w || w.isDestroyed()) return false;
  const width = w.getBounds().width;
  if (n.collapsed) {
    n.collapsed = false;
    w.setResizable(true);
    w.setMinimumSize(180, 140);
    w.setSize(width, n.h);
  } else {
    n.h = w.getBounds().height;
    n.collapsed = true;
    w.setMinimumSize(180, COLLAPSED_H);
    w.setSize(width, COLLAPSED_H);
    w.setResizable(false);
  }
  scheduleSave();
  return n.collapsed;
});

ipcMain.on('note:new', () => createNote());

ipcMain.on('note:delete', (_e, id) => {
  notes = notes.filter((n) => n.id !== id);
  writeNow();
  const w = windows.get(id);
  if (w && !w.isDestroyed()) w.close();
});

ipcMain.handle('app:colors', () => COLORS);

// ---------- Bandeja do sistema ----------
function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Nova nota', click: () => createNote() },
    { label: 'Mostrar todas', click: showAll },
    { label: 'Esconder todas', click: hideAll },
    { type: 'separator' },
    {
      label: 'Iniciar com o sistema',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked });
        tray.setContextMenu(buildTrayMenu());
      },
    },
    { type: 'separator' },
    { label: 'Sair', click: () => app.quit() },
  ]);
}

function createTray() {
  const size = process.platform === 'darwin' ? 18 : 16;
  const img = nativeImage.createFromPath(ICON).resize({ width: size, height: size });
  tray = new Tray(img);
  tray.setToolTip('Post-it');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', showAll);
}

// ---------- Ciclo de vida ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showAll);

  app.whenReady().then(() => {
    if (process.platform === 'darwin' && app.dock) app.dock.hide();
    loadNotes();
    createTray();
    if (notes.length === 0) createNote();
    else notes.forEach(openNote);
  });

  // O app continua vivo na bandeja mesmo sem janelas abertas.
  app.on('window-all-closed', () => {});
  app.on('before-quit', writeNow);
}
