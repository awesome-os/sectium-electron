import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  app,
  BrowserWindow,
  clipboard,
  contextBridge,
  ghost,
  ipcMain,
  ipcRenderer,
  Menu,
  nativeTheme,
  screen,
  shell,
  Tray,
} from '../src/index.mts';

test('app lifecycle, paths, and single-instance lock', async () => {
  await app.whenReady();
  assert.equal(app.isReady(), true);
  app.setName('sectium-electron-test');
  assert.equal(app.getName(), 'sectium-electron-test');
  assert.ok(app.getPath('userData').includes('sectium-electron-test'));
  assert.equal(app.requestSingleInstanceLock(), true);
  assert.equal(app.requestSingleInstanceLock(), false);
  app.releaseSingleInstanceLock();
});

test('BrowserWindow loads HTML file, tracks bounds, and routes DevTools over command channel', async () => {
  const htmlPath = join(import.meta.dirname, '..', 'examples', 'hello-electron', 'index.html');
  const win = new BrowserWindow({ width: 1024, height: 768, title: 'Initial' });
  assert.equal(BrowserWindow.fromId(win.id), win);
  assert.deepEqual(win.getSize(), [1024, 768]);

  await win.loadFile(htmlPath);
  assert.equal(win.getTitle(), 'Hello Sectium Electron');
  assert.ok(win.webContents.getURL().startsWith('file://'));

  await win.webContents.openDevTools();
  assert.equal(win.webContents.isDevToolsOpened(), true);

  let closedAll = false;
  app.once('window-all-closed', () => {
    closedAll = true;
  });
  win.close();
  assert.equal(win.isDestroyed(), true);
  assert.equal(closedAll, true);
});

test('contextBridge, shell, clipboard, nativeTheme, screen, Menu, and Tray', async () => {
  contextBridge._resetForTests();
  contextBridge.exposeInMainWorld('myApi', { answer: 42 });
  assert.equal(contextBridge.getExposedApi<{ answer: number }>('myApi')?.answer, 42);

  clipboard.writeText('sectium-zero-copy');
  assert.equal(clipboard.readText(), 'sectium-zero-copy');
  assert.equal(nativeTheme.shouldUseDarkColors, true);
  assert.ok(screen.getPrimaryDisplay().bounds.width >= 800);

  const menu = Menu.buildFromTemplate([{ label: 'File', submenu: [{ label: 'Quit', role: 'quit' }] }]);
  Menu.setApplicationMenu(menu);
  assert.equal(Menu.getApplicationMenu(), menu);

  const tray = new Tray('lumi.ico');
  tray.setToolTip('Sectium Electron');
  assert.equal(tray.getToolTip(), 'Sectium Electron');
  tray.destroy();
  assert.equal(tray.isDestroyed(), true);

  await assert.rejects(() => shell.openExternal('javascript:alert(1)'));
});

test('live cas-v1 hydration of b8g-ghost-abi.node + B8G_ARENA_V1 zero-copy IPC + libsectium_display', async () => {
  // 1. Live hydrate native b8g-ghost-abi.node from awesome-os/b8g-ghost @ cas-v1
  const { addon, localPath } = await ghost.loadGhostAbiAddon();
  assert.equal(existsSync(localPath), true);
  const info = addon.abiInfo();
  assert.equal(info.abiMagic, 0x33564742); // B8G_ABI_MAGIC_V3
  assert.equal(info.name, 'b8g-ghost-abi.node');

  // 2. Attach 64-byte-aligned B8G_ARENA_V1 shared memory to ipcMain
  const arena = ipcMain.attachGhostArena(addon, 65536);
  assert.equal(arena.magic, 0x33564742);
  assert.equal(arena.aligned64, true);
  assert.equal(arena.capacity, 65536);
  assert.equal(ipcMain.zeroCopyEnabled, true);

  // 3. Round-trip ipcRenderer.invoke -> ipcMain.handle over B8G_ARENA_V1
  ipcMain.handle('test:echo', (event, payload: { msg: string }) => ({
    echoed: payload.msg,
    zeroCopy: event.zeroCopy,
    arenaBytes: event.arenaBytes,
  }));

  const res = await ipcRenderer.invoke<{ echoed: string; zeroCopy: boolean; arenaBytes: number }>(
    'test:echo',
    { msg: 'hello-b8g-arena' },
  );
  assert.equal(res.echoed, 'hello-b8g-arena');
  assert.equal(res.zeroCopy, true);
  assert.ok(res.arenaBytes > 0);
  ipcMain.removeHandler('test:echo');

  // 4. Live hydrate libsectium_display from cas-v1
  const display = await ghost.hydrateSectiumDisplay();
  assert.equal(existsSync(display.localPath), true);
  assert.ok(display.entry.bytes > 0);
});
