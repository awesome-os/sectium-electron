/**
 * @file src/app.mts
 * @description Electron-compatible app lifecycle singleton.
 */

import { EventEmitter } from 'node:events';
import { mkdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export type AppPathName =
  | 'home'
  | 'appData'
  | 'userData'
  | 'temp'
  | 'desktop'
  | 'documents'
  | 'downloads'
  | 'logs'
  | 'exe';

class AppImpl extends EventEmitter {
  #ready = false;
  #readyPromise: Promise<void>;
  #name = 'sectium-electron-app';
  #version = '0.1.0';
  #appPath = process.cwd();
  #singleInstanceLocked = false;
  #appUserModelId = '';

  constructor() {
    super();
    this.#readyPromise = new Promise<void>((resolveReady) => {
      queueMicrotask(() => {
        this.#ready = true;
        this.emit('ready');
        resolveReady();
      });
    });
  }

  isReady(): boolean {
    return this.#ready;
  }

  whenReady(): Promise<void> {
    return this.#readyPromise;
  }

  getName(): string {
    return this.#name;
  }

  setName(name: string): void {
    this.#name = name;
  }

  getVersion(): string {
    return this.#version;
  }

  getAppPath(): string {
    return this.#appPath;
  }

  setAppPath(p: string): void {
    this.#appPath = resolve(p);
  }

  get isPackaged(): boolean {
    return process.env.SECTIUM_ELECTRON_PACKAGED === '1';
  }

  getPath(name: AppPathName): string {
    const home = homedir();
    switch (name) {
      case 'home':
        return home;
      case 'temp':
        return tmpdir();
      case 'desktop':
        return join(home, 'Desktop');
      case 'documents':
        return join(home, 'Documents');
      case 'downloads':
        return join(home, 'Downloads');
      case 'appData':
        return process.platform === 'win32'
          ? process.env.APPDATA ?? join(home, 'AppData', 'Roaming')
          : process.platform === 'darwin'
            ? join(home, 'Library', 'Application Support')
            : process.env.XDG_CONFIG_HOME ?? join(home, '.config');
      case 'userData': {
        const dir = join(this.getPath('appData'), this.#name);
        mkdirSync(dir, { recursive: true });
        return dir;
      }
      case 'logs': {
        const dir = join(this.getPath('userData'), 'logs');
        mkdirSync(dir, { recursive: true });
        return dir;
      }
      case 'exe':
        return process.execPath;
    }
  }

  requestSingleInstanceLock(): boolean {
    if (this.#singleInstanceLocked) return false;
    this.#singleInstanceLocked = true;
    return true;
  }

  releaseSingleInstanceLock(): void {
    this.#singleInstanceLocked = false;
  }

  setAppUserModelId(id: string): void {
    this.#appUserModelId = id;
  }

  getAppUserModelId(): string {
    return this.#appUserModelId;
  }

  quit(): void {
    const beforeEvent = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    this.emit('before-quit', beforeEvent);
    if (beforeEvent.defaultPrevented) return;
    this.emit('will-quit', beforeEvent);
    if (beforeEvent.defaultPrevented) return;
    this.emit('quit', {}, 0);
  }

  exit(exitCode = 0): void {
    process.exit(exitCode);
  }
}

export const app = new AppImpl();
