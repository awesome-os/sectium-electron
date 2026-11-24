/**
 * @file src/renderer.mts
 * @description Renderer-process entrypoint (ipcRenderer + contextBridge).
 */

export { ipcRenderer, IpcRenderer, type IpcRendererEvent } from './ipc.mts';
export { contextBridge } from './context-bridge.mts';
