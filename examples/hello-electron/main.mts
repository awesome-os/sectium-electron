import { join } from 'node:path';
import { app, BrowserWindow, ipcMain, ipcRenderer, ghost } from '../../src/index.mts';

app.setName('hello-sectium-electron');

ipcMain.handle('ping', (event) => ({
  reply: 'pong',
  zeroCopy: event.zeroCopy,
  arenaBytes: event.arenaBytes,
  runtime: 'sectium-electron',
}));

app.whenReady().then(async () => {
  // Hydrate b8g-ghost-abi.node once from cas-v1 and enable B8G_ARENA_V1 zero-copy IPC
  const { addon, cacheHit } = await ghost.loadGhostAbiAddon();
  const arena = ipcMain.attachGhostArena(addon, 65536);

  const win = new BrowserWindow({
    width: 1024,
    height: 700,
    title: 'Hello Sectium Electron',
    webPreferences: {
      preload: join(import.meta.dirname, 'preload.mts'),
    },
  });

  await win.loadFile(join(import.meta.dirname, 'index.html'));
  const pong = await ipcRenderer.invoke('ping');

  console.log('[sectium-electron] Window ready:', {
    id: win.id,
    title: win.getTitle(),
    url: win.webContents.getURL(),
    transport: win.webContents.transportMode,
    ghostAbiCacheHit: cacheHit,
    arenaAligned64: arena.aligned64,
    pong,
  });

  win.close();
});
