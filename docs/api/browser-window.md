# `BrowserWindow`

> **Sectium / Ghost Note:** Adapted from Electron's MIT `docs/api/browser-window.md`. Routes window creation over the Sectium Power-Button Host Device Boundary (`\\.\pipe\sectium-dev` / `/tmp/sectium-dev.sock`) rather than spawning a per-app Chromium copy.

Create and control browser windows.

```ts
import { BrowserWindow } from 'sectium-electron';

const win = new BrowserWindow({
  width: 1024,
  height: 768,
  title: 'Sectium Window',
});
await win.loadURL('https://awesome-os.com');
```

## Static Methods

- `BrowserWindow.getAllWindows(): BrowserWindow[]`
- `BrowserWindow.fromId(id: number): BrowserWindow | null`
- `BrowserWindow.getFocusedWindow(): BrowserWindow | null`

## Instance Methods

- `win.loadURL(url: string): Promise<void>`
- `win.loadFile(filePath: string): Promise<void>`
- `win.setTitle(title: string)` / `win.getTitle(): string`
- `win.setSize(width: number, height: number)` / `win.getSize(): [number, number]`
- `win.setBounds(bounds)` / `win.getBounds(): Rectangle`
- `win.show()` / `win.hide()` / `win.focus()` / `win.blur()`
- `win.minimize()` / `win.maximize()` / `win.unmaximize()`
- `win.close()` / `win.destroy()` / `win.isDestroyed()`
- `win.webContents.send(channel, ...args)`
- `win.webContents.openDevTools()` — Attached over Sectium `channel: 'command'` (`devtools-plane`).
