/**
 * @file src/context-bridge.mts
 * @description Electron-compatible contextBridge for safe preload -> renderer exposure.
 */

const exposedWorlds = new Map<string, Readonly<Record<string, unknown>>>();

export const contextBridge = {
  exposeInMainWorld(apiKey: string, api: Record<string, unknown>): void {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new TypeError('apiKey must be a non-empty string');
    }
    if (exposedWorlds.has(apiKey)) {
      throw new Error(`Cannot bind an API on top of an existing property '${apiKey}'`);
    }
    const frozen = Object.freeze({ ...api });
    exposedWorlds.set(apiKey, frozen);
    const g = globalThis as Record<string, unknown>;
    if (!(apiKey in g)) {
      Object.defineProperty(g, apiKey, {
        value: frozen,
        enumerable: true,
        configurable: true,
        writable: false,
      });
    }
  },

  getExposedApi<T = Record<string, unknown>>(apiKey: string): T | undefined {
    return exposedWorlds.get(apiKey) as T | undefined;
  },

  _resetForTests(): void {
    const g = globalThis as Record<string, unknown>;
    for (const key of exposedWorlds.keys()) {
      delete g[key];
    }
    exposedWorlds.clear();
  },
};
