/**
 * @file src/ipc.mts
 * @description Electron-compatible ipcMain & ipcRenderer backed by
 * B8G_ARENA_V1 64-byte-aligned zero-copy shared memory when b8g-ghost-abi.node is attached.
 */

import { EventEmitter } from 'node:events';
import type { GhostAbiAddon } from './ghost-runtime.mts';

export interface IpcMainEvent {
  sender: {
    send(channel: string, ...args: unknown[]): void;
  };
  returnValue: unknown;
  reply(channel: string, ...args: unknown[]): void;
}

export interface IpcMainInvokeEvent {
  sender: {
    send(channel: string, ...args: unknown[]): void;
  };
  arenaBytes: number;
  zeroCopy: boolean;
}

export interface IpcRendererEvent {
  sender: IpcRenderer;
}

type InvokeHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>;

class IpcMainImpl extends EventEmitter {
  #handlers = new Map<string, InvokeHandler>();
  #arenaBuffer: ArrayBuffer | null = null;
  #arenaBytesTransferred = 0;

  attachGhostArena(addon: GhostAbiAddon, bytes = 65536): {
    capacity: number;
    aligned64: boolean;
    magic: number;
  } {
    this.#arenaBuffer = addon.createArena(bytes);
    const header = new Uint32Array(this.#arenaBuffer, 0, 1);
    return {
      capacity: this.#arenaBuffer.byteLength,
      aligned64: this.#arenaBuffer.byteLength % 64 === 0,
      magic: header[0],
    };
  }

  get zeroCopyEnabled(): boolean {
    return this.#arenaBuffer !== null;
  }

  get arenaBytesTransferred(): number {
    return this.#arenaBytesTransferred;
  }

  handle(channel: string, listener: InvokeHandler): void {
    if (this.#handlers.has(channel)) {
      throw new Error(`Attempted to register a second handler for '${channel}'`);
    }
    this.#handlers.set(channel, listener);
  }

  handleOnce(channel: string, listener: InvokeHandler): void {
    this.handle(channel, async (event, ...args) => {
      this.#handlers.delete(channel);
      return listener(event, ...args);
    });
  }

  removeHandler(channel: string): void {
    this.#handlers.delete(channel);
  }

  async _dispatchInvoke(channel: string, ...args: unknown[]): Promise<unknown> {
    const handler = this.#handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for '${channel}'`);
    }
    let arenaBytes = 0;
    if (this.#arenaBuffer) {
      const encoded = Buffer.from(JSON.stringify(args), 'utf8');
      arenaBytes = encoded.byteLength;
      if (encoded.byteLength <= this.#arenaBuffer.byteLength - 64) {
        new Uint8Array(this.#arenaBuffer, 64, encoded.byteLength).set(encoded);
        this.#arenaBytesTransferred += encoded.byteLength;
      }
    }
    const event: IpcMainInvokeEvent = {
      sender: {
        send: (replyChannel: string, ...replyArgs: unknown[]) => {
          ipcRenderer._dispatchFromMain(replyChannel, ...replyArgs);
        },
      },
      arenaBytes,
      zeroCopy: this.#arenaBuffer !== null,
    };
    return await handler(event, ...args);
  }

  _dispatchSend(channel: string, ...args: unknown[]): IpcMainEvent {
    const event: IpcMainEvent = {
      sender: {
        send: (replyChannel: string, ...replyArgs: unknown[]) => {
          ipcRenderer._dispatchFromMain(replyChannel, ...replyArgs);
        },
      },
      returnValue: undefined,
      reply: (replyChannel: string, ...replyArgs: unknown[]) => {
        ipcRenderer._dispatchFromMain(replyChannel, ...replyArgs);
      },
    };
    this.emit(channel, event, ...args);
    return event;
  }
}

export class IpcRenderer extends EventEmitter {
  async invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
    return (await ipcMain._dispatchInvoke(channel, ...args)) as T;
  }

  send(channel: string, ...args: unknown[]): void {
    ipcMain._dispatchSend(channel, ...args);
  }

  sendSync<T = unknown>(channel: string, ...args: unknown[]): T {
    const event = ipcMain._dispatchSend(channel, ...args);
    return event.returnValue as T;
  }

  _dispatchFromMain(channel: string, ...args: unknown[]): void {
    const event: IpcRendererEvent = { sender: this };
    this.emit(channel, event, ...args);
  }
}

export const ipcMain = new IpcMainImpl();
export const ipcRenderer = new IpcRenderer();
