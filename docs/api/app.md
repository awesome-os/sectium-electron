# `app`

> **Sectium / Ghost Note:** Adapted from Electron's MIT `docs/api/app.md`. Runs natively in-process without a Chromium browser-process wrapper.

Control your application's event lifecycle.

```ts
import { app } from 'sectium-electron';

app.whenReady().then(() => {
  console.log('App ready:', app.getName(), app.getVersion());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

## Events

- `ready` — Emitted once `sectium-electron` has finished initializing.
- `window-all-closed` — Emitted when all `BrowserWindow` instances have been closed.
- `before-quit` — Emitted before the application starts closing. Calling `event.preventDefault()` cancels shutdown.
- `will-quit` — Emitted when all windows have been closed and the application will quit.
- `quit` — Emitted when the application is quitting.

## Methods

- `app.whenReady(): Promise<void>`
- `app.isReady(): boolean`
- `app.quit(): void`
- `app.exit(exitCode?: number): void`
- `app.getName(): string` / `app.setName(name: string): void`
- `app.getVersion(): string`
- `app.getPath(name): string` — Supports `'home'`, `'appData'`, `'userData'`, `'temp'`, `'desktop'`, `'documents'`, `'downloads'`, `'logs'`, `'exe'`.
- `app.getAppPath(): string`
- `app.requestSingleInstanceLock(): boolean`
- `app.setAppUserModelId(id: string): void`
