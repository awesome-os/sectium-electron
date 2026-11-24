/**
 * @file src/index.mts
 * @description Public drop-in Electron API surface powered by Sectium Display,
 * b8g-ghost CAS, Shared V8, and B8G_ARENA_V1 zero-copy IPC.
 */

export { app, type AppPathName } from './app.mts';
export {
  BrowserWindow,
  WebContents,
  type BrowserWindowConstructorOptions,
  type Rectangle,
  type WebPreferences,
} from './browser-window.mts';
export {
  ipcMain,
  ipcRenderer,
  IpcRenderer,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  type IpcRendererEvent,
} from './ipc.mts';
export { contextBridge } from './context-bridge.mts';
export {
  shell,
  clipboard,
  nativeTheme,
  screen,
  Menu,
  Tray,
  type MenuItemConstructorOptions,
} from './shell.mts';
export {
  ghost,
  fetchGhostIndex,
  hydrateGhostAsset,
  loadGhostAbiAddon,
  hydrateSectiumDisplay,
  type GhostIndex,
  type GhostIndexEntry,
  type GhostAbiAddon,
} from './ghost-runtime.mts';
export {
  getSectiumDevicePipePath,
  sendSectiumDeviceRequest,
  type SectiumTransportMode,
} from './sectium-bridge.mts';
