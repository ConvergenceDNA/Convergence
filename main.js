const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Convergence',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true }
  });
  /* Links to websites (such as FamilyTreeDNA Discover) open in the user's own web browser. */
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());