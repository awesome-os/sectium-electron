# `ipcRenderer`

> **Sectium / Ghost Note:** Adapted from Electron's MIT `docs/api/ipc-renderer.md`.

Communicate asynchronously from a renderer process to the main process.

```ts
import { ipcRenderer } from 'sectium-electron/renderer';

const sum = await ipcRenderer.invoke<number>('math:add', 20, 22);
console.log(sum); // 42
```

## Methods

- `ipcRenderer.invoke<T>(channel, ...args): Promise<T>`
- `ipcRenderer.send(channel, ...args): void`
- `ipcRenderer.sendSync<T>(channel, ...args): T`
- `ipcRenderer.on(channel, listener)` / `ipcRenderer.once(channel, listener)`
