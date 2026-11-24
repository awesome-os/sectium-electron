# `contextBridge`

> **Sectium / Ghost Note:** Adapted from Electron's MIT `docs/api/context-bridge.md`.

Create a safe, bi-directional, synchronous bridge across isolated contexts.

```ts
import { contextBridge, ipcRenderer } from 'sectium-electron/renderer';

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  ping: () => ipcRenderer.invoke('ping'),
});
```

## Methods

- `contextBridge.exposeInMainWorld(apiKey: string, api: Record<string, unknown>): void`
- `contextBridge.getExposedApi<T>(apiKey: string): T | undefined`
