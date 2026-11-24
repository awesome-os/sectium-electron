/**
 * @file src/browser-window.mts
 * @description Electron-compatible BrowserWindow & WebContents backed by
 * Sectium Device Boundary (\\.\pipe\sectium-dev / /tmp/sectium-dev.sock) and
 * B8G_ARENA_V1 zero-copy IPC.
 */

import { EventEmitter } from 'node:events';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { app } from './app.mts';
import { ipcRenderer } from './ipc.mts';
import { sendSectiumDeviceRequest, type SectiumTransportMode } from './sectium-bridge.mts';

export interface WebPreferences {
  preload?: string;
  contextIsolation?: boolean;
  nodeIntegration?: boolean;
  sandbox?: boolean;
}

export interface BrowserWindowConstructorOptions {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  title?: string;
  show?: boolean;
  frame?: boolean;
  transparent?: boolean;
  backgroundColor?: string;
  webPreferences?: WebPreferences;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class WebContents extends EventEmitter {
  readonly id: number;
  #url = 'about:blank';
  #title = '';
  #devToolsOpen = false;
  #transport: SectiumTransportMode = 'virtual-frame';

  constructor(id: number) {
    super();
    this.id = id;
  }

  getURL(): string {
    return this.#url;
  }

  getTitle(): string {
    return this.#title;
  }

  get transportMode(): SectiumTransportMode {
    return this.#transport;
  }

  async loadURL(url: string): Promise<void> {
    this.#url = url;
    const resp = await sendSectiumDeviceRequest({
      op: 'open_window',
      url,
      appMode: true,
    });
    this.#transport = resp.transport;
    this.emit('did-finish-load');
    this.emit('dom-ready');
  }

  async loadFile(filePath: string): Promise<void> {
    const abs = resolve(filePath);
    if (!existsSync(abs)) {
      throw new Error(`BrowserWindow.loadFile: file not found: ${abs}`);
    }
    const html = readFileSync(abs, 'utf8');
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      this.#title = titleMatch[1].trim();
    }
    await this.loadURL(pathToFileURL(abs).href);
  }

  send(channel: string, ...args: unknown[]): void {
    ipcRenderer._dispatchFromMain(channel, ...args);
  }

  async openDevTools(): Promise<void> {
    // Always route DevTools over Sectium command channel (never display channel)
    await sendSectiumDeviceRequest({
      op: 'attach_channel',
      channel: 'command',
      clientId: `sectium-electron-devtools-${this.id}`,
      sink: 'devtools-plane',
    });
    this.#devToolsOpen = true;
    this.emit('devtools-opened');
  }

  closeDevTools(): void {
    this.#devToolsOpen = false;
    this.emit('devtools-closed');
  }

  isDevToolsOpened(): boolean {
    return this.#devToolsOpen;
  }
}

let nextWindowId = 1;
const allWindows = new Map<number, BrowserWindow>();
let focusedWindow: BrowserWindow | null = null;

export class BrowserWindow extends EventEmitter {
  readonly id: number;
  readonly webContents: WebContents;
  readonly webPreferences: WebPreferences;

  #title: string;
  #bounds: Rectangle;
  #visible: boolean;
  #destroyed = false;
  #minimized = false;
  #maximized = false;

  constructor(options: BrowserWindowConstructorOptions = {}) {
    super();
    this.id = nextWindowId++;
    this.webContents = new WebContents(this.id);
    this.webPreferences = {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      ...options.webPreferences,
    };
    this.#title = options.title ?? app.getName();
    this.#bounds = {
      x: options.x ?? 100,
      y: options.y ?? 100,
      width: options.width ?? 800,
      height: options.height ?? 600,
    };
    this.#visible = options.show !== false;
    allWindows.set(this.id, this);
    if (this.#visible) {
      focusedWindow = this;
    }

    // Load preload script if specified
    if (this.webPreferences.preload && existsSync(resolve(this.webPreferences.preload))) {
      void import(pathToFileURL(resolve(this.webPreferences.preload)).href);
    }

    queueMicrotask(() => {
      if (!this.#destroyed) {
        this.emit('ready-to-show');
      }
    });
  }

  static getAllWindows(): BrowserWindow[] {
    return [...allWindows.values()];
  }

  static fromId(id: number): BrowserWindow | null {
    return allWindows.get(id) ?? null;
  }

  static getFocusedWindow(): BrowserWindow | null {
    return focusedWindow;
  }

  async loadURL(url: string): Promise<void> {
    await this.webContents.loadURL(url);
  }

  async loadFile(filePath: string): Promise<void> {
    await this.webContents.loadFile(filePath);
    if (this.webContents.getTitle()) {
      this.#title = this.webContents.getTitle();
    }
  }

  setTitle(title: string): void {
    this.#title = title;
  }

  getTitle(): string {
    return this.#title;
  }

  setSize(width: number, height: number): void {
    this.#bounds.width = width;
    this.#bounds.height = height;
    this.emit('resize');
  }

  getSize(): [number, number] {
    return [this.#bounds.width, this.#bounds.height];
  }

  setBounds(bounds: Partial<Rectangle>): void {
    this.#bounds = { ...this.#bounds, ...bounds };
    this.emit('resize');
  }

  getBounds(): Rectangle {
    return { ...this.#bounds };
  }

  show(): void {
    this.#visible = true;
    focusedWindow = this;
    this.emit('show');
    this.emit('focus');
  }

  hide(): void {
    this.#visible = false;
    if (focusedWindow === this) focusedWindow = null;
    this.emit('hide');
  }

  isVisible(): boolean {
    return this.#visible;
  }

  focus(): void {
    focusedWindow = this;
    this.emit('focus');
  }

  blur(): void {
    if (focusedWindow === this) focusedWindow = null;
    this.emit('blur');
  }

  minimize(): void {
    this.#minimized = true;
    this.emit('minimize');
  }

  isMinimized(): boolean {
    return this.#minimized;
  }

  maximize(): void {
    this.#maximized = true;
    this.emit('maximize');
  }

  unmaximize(): void {
    this.#maximized = false;
    this.emit('unmaximize');
  }

  isMaximized(): boolean {
    return this.#maximized;
  }

  close(): void {
    if (this.#destroyed) return;
    const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    this.emit('close', event);
    if (event.defaultPrevented) return;
    this.destroy();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#visible = false;
    allWindows.delete(this.id);
    if (focusedWindow === this) focusedWindow = null;
    this.emit('closed');
    if (allWindows.size === 0) {
      app.emit('window-all-closed');
    }
  }

  isDestroyed(): boolean {
    return this.#destroyed;
  }
}
