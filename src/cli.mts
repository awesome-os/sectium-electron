#!/usr/bin/env node
/**
 * @file src/cli.mts
 * @description CLI launcher: `sectium-electron <entry.mts|entry.js>`
 * Hydrates b8g-ghost-abi.node once from cas-v1, attaches B8G_ARENA_V1 zero-copy IPC,
 * and executes the target Electron application entrypoint.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadGhostAbiAddon } from './ghost-runtime.mts';
import { ipcMain } from './ipc.mts';

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('sectium-electron v0.1.0 — Drop-in Electron runtime over Sectium + b8g-ghost CAS');
  console.log('Usage: sectium-electron <entry.mts|entry.js>');
  process.exit(0);
}

if (args[0] === '--version' || args[0] === '-v') {
  console.log('v0.1.0 (sectium-electron / b8g-ghost cas-v1)');
  process.exit(0);
}

const target = resolve(args[0]);
if (!existsSync(target)) {
  console.error(`sectium-electron: entry file not found: ${target}`);
  process.exit(1);
}

try {
  const { addon } = await loadGhostAbiAddon();
  ipcMain.attachGhostArena(addon, 65536);
} catch {
  // Offline or unsupported arch: run seamlessly in pure JS IPC mode
}

await import(pathToFileURL(target).href);
