/**
 * @file src/ghost-runtime.mts
 * @description Zero-config b8g-ghost CAS hydrator & native N-API bridge for sectium-electron.
 * Hydrates shared binaries (b8g-ghost-abi.node, libsectium_display, V8, C/Wasm shards)
 * once into ~/.b8g/cas/ with SHA-256 verification from awesome-os/b8g-ghost @ cas-v1.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const GHOST_INDEX_URL =
  process.env.B8G_GHOST_INDEX_URL ??
  'https://raw.githubusercontent.com/awesome-os/b8g-ghost/main/manifests/index.json';

export const GHOST_CAS_BASE_URL =
  process.env.B8G_GHOST_CAS_URL ??
  'https://github.com/awesome-os/b8g-ghost/releases/download/cas-v1';

export interface GhostIndexEntry {
  filename: string;
  sha256: string;
  bytes: number;
  category?: string;
  download_url: string;
}

export interface GhostIndex {
  schema: string;
  cas_base_url: string;
  baseline_tag: string;
  updated_at: string;
  total_entries: number;
  entries: Record<string, GhostIndexEntry>;
}

export interface GhostAbiAddon {
  abiInfo(): { abiMagic: number; ghostMagic: number; name: string };
  createArena(bytes: number): ArrayBuffer;
  resolve(filename: string, sha256Hex: string, downloadUrl: string): { path: string; casHit: boolean };
  dlopen(path: string): bigint;
  callU32_0(handle: bigint, symbol: string): number;
  callI32_1(handle: bigint, symbol: string, arg0: number): number;
}

let cachedIndex: GhostIndex | null = null;
let cachedAddon: GhostAbiAddon | null = null;

export function getGhostCacheDir(): string {
  const dir = process.env.B8G_GHOST_CACHE_DIR ?? join(homedir(), '.b8g', 'cas');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getPlatformTriple(): { osKey: string; libExt: string; nodeSuffix: string } {
  const p = process.platform;
  const a = process.arch;
  if (p === 'win32') {
    return { osKey: 'win64', libExt: '.dll', nodeSuffix: 'win64.node' };
  }
  if (p === 'darwin') {
    return { osKey: a === 'arm64' ? 'macos-arm64' : 'macos-x64', libExt: '.dylib', nodeSuffix: 'macos-arm64.node' };
  }
  return {
    osKey: a === 'arm64' ? 'linux-arm64' : 'linux-x64',
    libExt: '.so',
    nodeSuffix: a === 'arm64' ? 'linux-arm64.node' : 'linux-x64.node',
  };
}

export async function fetchGhostIndex(forceRefresh = false): Promise<GhostIndex> {
  if (cachedIndex && !forceRefresh) {
    return cachedIndex;
  }
  const cacheFile = join(getGhostCacheDir(), 'index.json');
  try {
    const res = await fetch(GHOST_INDEX_URL, {
      headers: { 'User-Agent': 'sectium-electron/0.1.0' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${GHOST_INDEX_URL}`);
    }
    const json = (await res.json()) as GhostIndex;
    writeFileSync(cacheFile, JSON.stringify(json, null, 2), 'utf8');
    cachedIndex = json;
    return json;
  } catch (err) {
    if (existsSync(cacheFile)) {
      cachedIndex = JSON.parse(readFileSync(cacheFile, 'utf8')) as GhostIndex;
      return cachedIndex;
    }
    throw err;
  }
}

export function resolveGhostEntry(index: GhostIndex, logicalName: string): GhostIndexEntry | undefined {
  if (index.entries[logicalName]) {
    return index.entries[logicalName];
  }
  const { osKey, libExt } = getPlatformTriple();
  const candidates = [
    `${logicalName}-${osKey}${libExt}`,
    `lib${logicalName}-${osKey}${libExt}`,
    `${logicalName}${libExt}`,
    `lib${logicalName}${libExt}`,
    `${logicalName}-${osKey}.node`,
    `${logicalName}-${osKey}`,
  ];
  for (const key of candidates) {
    if (index.entries[key]) {
      return index.entries[key];
    }
  }
  const lower = logicalName.toLowerCase();
  const foundKey = Object.keys(index.entries).find(
    (k) => k.toLowerCase().includes(lower) && k.toLowerCase().includes(osKey),
  );
  return foundKey ? index.entries[foundKey] : undefined;
}

export async function hydrateGhostAsset(logicalName: string): Promise<{
  entry: GhostIndexEntry;
  localPath: string;
  cacheHit: boolean;
}> {
  const index = await fetchGhostIndex();
  const entry = resolveGhostEntry(index, logicalName);
  if (!entry) {
    throw new Error(`Asset "${logicalName}" not found in b8g-ghost cas-v1 index (${index.total_entries} entries)`);
  }

  const cacheDir = getGhostCacheDir();
  const extMatch = entry.filename.match(/(\.[a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1] : '';
  const localPath = join(cacheDir, `${entry.sha256}${ext}`);

  if (existsSync(localPath)) {
    const actual = createHash('sha256').update(readFileSync(localPath)).digest('hex');
    if (actual === entry.sha256) {
      return { entry, localPath, cacheHit: true };
    }
  }

  const url = entry.download_url || `${GHOST_CAS_BASE_URL}/${entry.sha256}`;
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'sectium-electron/0.1.0' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} hydrating ${entry.filename} from ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const actual = createHash('sha256').update(buf).digest('hex');
  if (actual !== entry.sha256) {
    throw new Error(`SHA-256 mismatch for ${entry.filename}: expected ${entry.sha256}, got ${actual}`);
  }

  const tmpPath = `${localPath}.${process.pid}.tmp`;
  writeFileSync(tmpPath, buf);
  renameSync(tmpPath, localPath);
  return { entry, localPath, cacheHit: false };
}

export async function loadGhostAbiAddon(): Promise<{
  addon: GhostAbiAddon;
  localPath: string;
  cacheHit: boolean;
}> {
  const { nodeSuffix } = getPlatformTriple();
  const assetName = `b8g-ghost-abi-${nodeSuffix}`;
  const hydrated = await hydrateGhostAsset(assetName);
  if (!cachedAddon) {
    const req = createRequire(import.meta.url);
    cachedAddon = req(hydrated.localPath) as GhostAbiAddon;
  }
  return {
    addon: cachedAddon,
    localPath: hydrated.localPath,
    cacheHit: hydrated.cacheHit,
  };
}

export async function hydrateSectiumDisplay(): Promise<{
  entry: GhostIndexEntry;
  localPath: string;
  cacheHit: boolean;
}> {
  return hydrateGhostAsset('libsectium_display');
}

export const ghost = {
  GHOST_INDEX_URL,
  GHOST_CAS_BASE_URL,
  getGhostCacheDir,
  getPlatformTriple,
  fetchGhostIndex,
  resolveGhostEntry,
  hydrateGhostAsset,
  loadGhostAbiAddon,
  hydrateSectiumDisplay,
};
