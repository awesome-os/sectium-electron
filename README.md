# `sectium-electron`

> **Drop-in Electron-compatible desktop runtime powered by Sectium Display, `b8g-ghost` CAS, Shared V8, and `B8G_ARENA_V1` Zero-Copy IPC — `~120 KB` launcher instead of `200+ MB` per app.**

`sectium-electron` lets you write standard Electron applications (`app`, `BrowserWindow`, `ipcMain`, `ipcRenderer`, `contextBridge`, `shell`, `Menu`, `Tray`) while replacing Electron's duplicated Chromium/Node/V8 monolith and `electron-rebuild` toolchain with the **Awesome-OS / Sectium** shared runtime architecture.

---

## Quick Install & Usage

### Install via `pnpm` (or release tarball)

```powershell
pnpm add github:awesome-os/sectium-electron
```

Or download the latest SHA-256 verified archive from [`Releases`](https://github.com/awesome-os/sectium-electron/releases/latest).

### Usage & Verification

```powershell
# Run the included hello-electron example directly on Node.js 22+
node examples/hello-electron/main.mts

# Verify locally (hydrates b8g-ghost-abi + libsectium_display from cas-v1)
node --test
```

---

## Why `sectium-electron`?

| Dimension | Traditional Electron | `sectium-electron` |
| :--- | :--- | :--- |
| **Per-app footprint** | `~200–350 MB` per installed app | **`~120 KB` launcher** (hydrates shared engines once into `~/.b8g/cas/`) |
| **Display / Windowing** | Embedded Chromium bundled per app | **Sectium Device Boundary** (`\\.\pipe\sectium-dev` / `/tmp/sectium-dev.sock`) + **`libsectium_display`** + **`sectium-browser`** |
| **IPC (`ipcMain` / `ipcRenderer`)** | Structured-clone JSON over Chromium Mojo | **Zero-Copy `B8G_ARENA_V1`** (64-byte aligned via `b8g-ghost-abi.node`) + NDJSON command channel |
| **Native Addons** | `node-gyp` + `electron-rebuild` per ABI bump | **Zero-`node-gyp` `ghost.hydrateGhostAsset()`** from [`awesome-os/b8g-ghost @ cas-v1`](https://github.com/awesome-os/b8g-ghost/releases/tag/cas-v1) |
| **Shared V8 Engine** | Duplicated per app | **Shared `cas-v1` V8** (`dup_v8 = 0 B`) |
| **Auto-Updates & Rollback** | Squirrel / NSIS full-app installers | **Rolling-Latest + Keep-Last-5 CAS** rollback |

---

## Quick Start (Zero Build Step)

```ts
import { app, BrowserWindow, ipcMain } from 'sectium-electron';
import { join } from 'node:path';

ipcMain.handle('ping', () => 'pong from B8G_ARENA_V1');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Hello Sectium Electron',
    webPreferences: {
      preload: join(import.meta.dirname, 'preload.mts'),
    },
  });

  await win.loadFile(join(import.meta.dirname, 'index.html'));
});
```

Run directly with Node 22+ (no webpack, no `tsc` emit loop, no `electron-rebuild`):

```bash
node examples/hello-electron/main.mts
# or run the full test suite (hydrates b8g-ghost-abi.node + libsectium_display live from cas-v1):
node --test test/electron-compat.test.mts
```

---

## Documentation (Adapted from Electron MIT Docs)

All Electron API docs in [`docs/`](docs/) are adapted from upstream [`electron/electron`](https://github.com/electron/electron) under the MIT License ([`docs/LICENSE.electron-MIT`](docs/LICENSE.electron-MIT)), annotated with **Sectium / Ghost** implementation notes:

- [Quick Start Guide](docs/quick-start.md)
- [Electron Compatibility Matrix](docs/COMPATIBILITY.md)
- [`app`](docs/api/app.md)
- [`BrowserWindow`](docs/api/browser-window.md)
- [`ipcMain`](docs/api/ipc-main.md)
- [`ipcRenderer`](docs/api/ipc-renderer.md)
- [`contextBridge`](docs/api/context-bridge.md)
- [`shell`](docs/api/shell.md)

---

## Ecosystem Links

- **Canonical $O(1)$ CAS Store:** [`awesome-os/b8g-ghost @ cas-v1`](https://github.com/awesome-os/b8g-ghost/releases/tag/cas-v1)
- **Sectium Browser & Display:** [`awesome-os/sectium-browser`](https://github.com/awesome-os/sectium-browser)
- **100 Native Recipes:** [`awesome-os/ghost-100`](https://github.com/awesome-os/ghost-100)

## Quick Install & Run (Windows / Linux / macOS)

```sh
# Install / hydrate from v11 CAS via holo-pm
holo-pm install repository://github.com/awesome-os/sectium-electron@main

# Or project & run directly via holo-project (0-byte hardlink)
holo-project "project://node/sectium-electron?from=repository://github.com/awesome-os/sectium-electron@main"
```
