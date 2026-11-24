/**
 * @file src/linked-bindings.mts
 * @description Electron internal `process._linkedBinding(name)` registry so
 * unmodified upstream Electron JS modules (`lib/browser/`, `lib/renderer/`,
 * `lib/common/`) can execute directly on the Sectium + Shared V8 + B8G_ARENA_V1 stack.
 */

import { app } from './app.mts';
import { BrowserWindow } from './browser-window.mts';
import { contextBridge } from './context-bridge.mts';
import { ipcMain, ipcRenderer } from './ipc.mts';
import { clipboard, Menu, nativeTheme, screen, shell, Tray } from './shell.mts';

export interface V8UtilBinding {
  getHiddenValue: (object: object, key: string) => unknown;
  setHiddenValue: (object: object, key: string, value: unknown) => void;
  deleteHiddenValue: (object: object, key: string) => boolean;
  readonly casRuntime: 'b8g-ghost-cas-v1';
}

const hiddenValues = new WeakMap<object, Map<string, unknown>>();

const v8Util: V8UtilBinding = {
  getHiddenValue(object: object, key: string): unknown {
    return hiddenValues.get(object)?.get(key);
  },
  setHiddenValue(object: object, key: string, value: unknown): void {
    let map = hiddenValues.get(object);
    if (!map) {
      map = new Map<string, unknown>();
      hiddenValues.set(object, map);
    }
    map.set(key, value);
  },
  deleteHiddenValue(object: object, key: string): boolean {
    return hiddenValues.get(object)?.delete(key) ?? false;
  },
  casRuntime: 'b8g-ghost-cas-v1',
};

const LINKED_BINDINGS = {
  electron_browser_app: app,
  electron_browser_window: { BrowserWindow },
  electron_browser_ipc: ipcMain,
  electron_renderer_ipc: ipcRenderer,
  electron_renderer_context_bridge: contextBridge,
  electron_common_shell: shell,
  electron_common_clipboard: clipboard,
  electron_common_native_theme: nativeTheme,
  electron_browser_screen: screen,
  electron_browser_menu: { Menu },
  electron_browser_tray: { Tray },
  electron_common_v8_util: v8Util,
} as const;

export type LinkedBindingName = keyof typeof LINKED_BINDINGS;

export const LINKED_BINDING_NAMES: readonly LinkedBindingName[] = Object.keys(
  LINKED_BINDINGS,
) as LinkedBindingName[];

export function getLinkedBinding<K extends LinkedBindingName>(name: K): (typeof LINKED_BINDINGS)[K];
export function getLinkedBinding<T = unknown>(name: string): T;
export function getLinkedBinding(name: string): unknown {
  if (Object.prototype.hasOwnProperty.call(LINKED_BINDINGS, name)) {
    return LINKED_BINDINGS[name as LinkedBindingName];
  }
  throw new Error(`No such linked binding: ${name}`);
}

const INSTALLED_MARKER = Symbol.for('sectium-electron.linked-bindings.installed');

type LinkedBindingFn = ((name: string) => unknown) & {
  [INSTALLED_MARKER]?: boolean;
};

type ProcessWithLinkedBinding = NodeJS.Process & {
  _linkedBinding?: LinkedBindingFn;
};

export function installLinkedBindings(targetProcess: NodeJS.Process = process): void {
  const proc = targetProcess as ProcessWithLinkedBinding;
  if (proc._linkedBinding?.[INSTALLED_MARKER]) {
    return;
  }

  const previous =
    typeof proc._linkedBinding === 'function' ? proc._linkedBinding.bind(proc) : undefined;

  const linkedBinding: LinkedBindingFn = (name: string): unknown => {
    if (Object.prototype.hasOwnProperty.call(LINKED_BINDINGS, name)) {
      return LINKED_BINDINGS[name as LinkedBindingName];
    }
    if (previous) {
      return previous(name);
    }
    throw new Error(`No such linked binding: ${name}`);
  };
  linkedBinding[INSTALLED_MARKER] = true;

  Object.defineProperty(proc, '_linkedBinding', {
    value: linkedBinding,
    writable: true,
    configurable: true,
    enumerable: false,
  });
}
