# Quick Start

> **Sectium / Ghost Note:** Adapted from Electron's official MIT Quick Start. With `sectium-electron`, you do not need to download a 200 MB Electron binary or run `electron-rebuild` — shared native libraries hydrate once into `~/.b8g/cas/` on first use.

## 1. Create Your App Files

An Electron app has three classic files:

- **`main.mts`** — Controls your app's lifecycle (`app`), creates windows (`BrowserWindow`), and handles `ipcMain`.
- **`preload.mts`** — Safely bridges `ipcRenderer` to your UI via `contextBridge.exposeInMainWorld`.
- **`index.html`** — Your app's user interface.

See [`examples/hello-electron/`](../examples/hello-electron/) for a complete working example.

## 2. Run Your App

```bash
node examples/hello-electron/main.mts
# or via the CLI wrapper (automatically attaches B8G_ARENA_V1 zero-copy IPC):
node src/cli.mts examples/hello-electron/main.mts
```

## 3. Attach a Live Sectium Display

When a Sectium Power-Button daemon is active on `\\.\pipe\sectium-dev` (Windows) or `/tmp/sectium-dev.sock` (Linux/macOS), `BrowserWindow.loadFile()` and `loadURL()` automatically render into the live Sectium window over NDJSON. Without a daemon (e.g. in CI or headless servers), `sectium-electron` seamlessly uses its deterministic `virtual-frame` sink.
