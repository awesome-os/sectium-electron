import { contextBridge, ipcRenderer } from '../../src/renderer.mts';

if (!contextBridge.getExposedApi('sectiumApp')) {
  contextBridge.exposeInMainWorld('sectiumApp', {
    ping: () => ipcRenderer.invoke('ping'),
    platform: process.platform,
  });
}
