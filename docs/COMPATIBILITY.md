# Electron API Compatibility Matrix

`sectium-electron` provides an honest, zero-bloat compatibility layer for Electron's core desktop APIs over the **Sectium Device Boundary** and **`b8g-ghost` CAS**.

| Electron Module / API | Status | Sectium / Ghost Backing |
| :--- | :--- | :--- |
| `app` (`whenReady`, `quit`, `getPath`, `getName`, `getVersion`, `requestSingleInstanceLock`, events) | **Tier 1 (Native)** | Direct erasable-TS lifecycle singleton |
| `BrowserWindow` (`loadFile`, `loadURL`, `setTitle`, `setSize`, `setBounds`, `show`/`hide`/`close`, `getAllWindows`) | **Tier 1 (Native)** | Sectium Host Device Pipe (`\\.\pipe\sectium-dev` / `/tmp/sectium-dev.sock`) + virtual-frame headless fallback |
| `webContents.send` / `webContents.openDevTools` | **Tier 1 (Native)** | `ipcRenderer` dispatch + Sectium `channel: 'command'` (`devtools-plane`) |
| `ipcMain` (`handle`, `handleOnce`, `on`, `once`, `removeHandler`) | **Tier 1 (Native)** | Zero-copy `B8G_ARENA_V1` (64-byte aligned via `b8g-ghost-abi.node`) |
| `ipcRenderer` (`invoke`, `send`, `sendSync`, `on`, `once`) | **Tier 1 (Native)** | Zero-copy `B8G_ARENA_V1` + EventEmitter |
| `contextBridge.exposeInMainWorld` | **Tier 1 (Native)** | Frozen world binding |
| `shell`, `clipboard`, `nativeTheme`, `screen`, `Menu`, `Tray` | **Tier 1 (Native)** | Cross-platform Sectium wrappers |
| `ghost` (`hydrateGhostAsset`, `loadGhostAbiAddon`, `hydrateSectiumDisplay`) | **Sectium Bonus** | Replaces `electron-rebuild` / `node-gyp` with $O(1)$ `cas-v1` hydration |
| Full HTML5/CSS/WebGL DOM rendering | **Tier 2 (On-Demand)** | Hydrates `sectium-browser` + `libsectium_display` from `cas-v1` |
| `autoUpdater` (Squirrel / NSIS) | **Replaced** | Replaced by `b8g-ghost` Rolling-Latest + Keep-Last-5 CAS rollback |
| `session.webRequest`, `webContents.printToPDF`, `BrowserView` | **Planned** | Requires full Sectium Chromium host session bridge |
