/**
 * @file src/shell.mts
 * @description Electron-compatible shell, clipboard, nativeTheme, screen, Menu, and Tray modules.
 */

import { EventEmitter } from 'node:events';
import { sendSectiumDeviceRequest } from './sectium-bridge.mts';

export const shell = {
  async openExternal(url: string): Promise<void> {
    if (!/^https?:\/\/|^mailto:/i.test(url)) {
      throw new Error(`shell.openExternal: unsupported URL scheme: ${url}`);
    }
    await sendSectiumDeviceRequest({ op: 'open_window', url, appMode: false });
  },

  async openPath(fullPath: string): Promise<string> {
    await sendSectiumDeviceRequest({ op: 'open_window', url: fullPath, appMode: false });
    return '';
  },

  beep(): void {
    process.stdout.write('\x07');
  },
};

let clipboardText = '';
export const clipboard = {
  readText(): string {
    return clipboardText;
  },
  writeText(text: string): void {
    clipboardText = text;
  },
  clear(): void {
    clipboardText = '';
  },
};

class NativeThemeImpl extends EventEmitter {
  themeSource: 'system' | 'light' | 'dark' = 'dark';
  get shouldUseDarkColors(): boolean {
    return this.themeSource !== 'light';
  }
}
export const nativeTheme = new NativeThemeImpl();

export const screen = {
  getPrimaryDisplay() {
    return {
      id: 1,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1040 },
      scaleFactor: 1,
      rotation: 0,
    };
  },
  getAllDisplays() {
    return [this.getPrimaryDisplay()];
  },
};

export interface MenuItemConstructorOptions {
  label?: string;
  role?: string;
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  accelerator?: string;
  click?: () => void;
  submenu?: MenuItemConstructorOptions[];
}

let appMenu: Menu | null = null;

export class Menu {
  readonly items: MenuItemConstructorOptions[];
  constructor(items: MenuItemConstructorOptions[] = []) {
    this.items = items;
  }
  static buildFromTemplate(template: MenuItemConstructorOptions[]): Menu {
    return new Menu(template);
  }
  static setApplicationMenu(menu: Menu | null): void {
    appMenu = menu;
  }
  static getApplicationMenu(): Menu | null {
    return appMenu;
  }
}

export class Tray extends EventEmitter {
  #icon: string;
  #tooltip = '';
  #menu: Menu | null = null;
  #destroyed = false;

  constructor(image: string) {
    super();
    this.#icon = image;
  }
  setToolTip(toolTip: string): void {
    this.#tooltip = toolTip;
  }
  getToolTip(): string {
    return this.#tooltip;
  }
  setImage(image: string): void {
    this.#icon = image;
  }
  getImage(): string {
    return this.#icon;
  }
  setContextMenu(menu: Menu | null): void {
    this.#menu = menu;
  }
  getContextMenu(): Menu | null {
    return this.#menu;
  }
  destroy(): void {
    this.#destroyed = true;
  }
  isDestroyed(): boolean {
    return this.#destroyed;
  }
}
