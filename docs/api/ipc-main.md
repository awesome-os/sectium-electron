# `ipcMain`

> **Sectium / Ghost Note:** Adapted from Electron's MIT `docs/api/ipc-main.md`. When `b8g-ghost-abi.node` is hydrated from `cas-v1`, `ipcMain.attachGhostArena(addon)` backs IPC payloads with a 64-byte-aligned `B8G_ARENA_V1` shared memory arena (`zeroCopy: true`).

Communicate asynchronously from the main process to renderer processes.

```ts
import { ipcMain } from 'sectium-electron';

ipcMain.handle('math:add', (_event, a: number, b: number) => a + b);
```

## Methods

- `ipcMain.handle(channel, listener)` — Registers a handler for `ipcRenderer.invoke(channel, ...)`.
- `ipcMain.handleOnce(channel, listener)` — Handles a single `invoke` call, then removes the handler.
- `ipcMain.removeHandler(channel)` — Removes any handler for `channel`.
- `ipcMain.on(channel, listener)` / `ipcMain.once(channel, listener)` — Listens for `ipcRenderer.send` / `sendSync`.
- `ipcMain.attachGhostArena(addon, bytes?)` — *(Sectium extension)* Binds a 64-byte-aligned `B8G_ARENA_V1` zero-copy arena.
