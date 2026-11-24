/**
 * @file src/sectium-bridge.mts
 * @description Sectium Power-Button Host Device Boundary bridge.
 * Speaks NDJSON over \\.\pipe\sectium-dev (Win32) or /tmp/sectium-dev.sock (POSIX).
 * Never spawns ad-hoc sectium.exe / chromium processes; falls back cleanly to a
 * deterministic virtual-frame sink when no Power-Button daemon is running.
 */

import { connect } from 'node:net';

export const DEFAULT_WIN32_PIPE_PATH = '\\\\.\\pipe\\sectium-dev';
export const DEFAULT_POSIX_SOCKET_PATH = '/tmp/sectium-dev.sock';

export type SectiumTransportMode = 'sectium-pipe' | 'virtual-frame';

export interface SectiumRequest {
  id: string;
  op: 'ping' | 'status' | 'open_window' | 'attach_channel' | 'detach_channel' | 'list_channels';
  url?: string;
  appMode?: boolean;
  channel?: 'command' | 'display';
  clientId?: string;
  sink?: string;
  replaceExisting?: boolean;
}

export interface SectiumResponse {
  id?: string;
  ok: boolean;
  windowId?: string;
  pong?: boolean;
  uptimeMs?: number;
  error?: string;
  transport: SectiumTransportMode;
}

export function getSectiumDevicePipePath(override?: string): string {
  const envPath = override ?? process.env.SECTIUM_DEVICE_PIPE;
  if (envPath && envPath.trim().length > 0) {
    return envPath.trim();
  }
  return process.platform === 'win32' ? DEFAULT_WIN32_PIPE_PATH : DEFAULT_POSIX_SOCKET_PATH;
}

let reqSeq = 0;

export async function sendSectiumDeviceRequest(
  req: Omit<SectiumRequest, 'id'>,
  timeoutMs = 750,
  pipeOverride?: string,
): Promise<SectiumResponse> {
  const id = `se-${++reqSeq}`;
  const pipePath = getSectiumDevicePipePath(pipeOverride);

  return new Promise<SectiumResponse>((resolve) => {
    let settled = false;
    let buffer = '';

    const finish = (resp: SectiumResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(resp);
    };

    const timer = setTimeout(() => {
      finish({
        id,
        ok: true,
        windowId: req.op === 'open_window' ? `vf-${id}` : undefined,
        transport: 'virtual-frame',
      });
    }, timeoutMs);

    const socket = connect(pipePath, () => {
      const payload: SectiumRequest = { id, ...req };
      socket.write(`${JSON.stringify(payload)}\n`);
    });

    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      const nl = buffer.indexOf('\n');
      if (nl !== -1) {
        const line = buffer.slice(0, nl).trim();
        try {
          const parsed = JSON.parse(line) as Record<string, unknown>;
          finish({
            id: typeof parsed.id === 'string' ? parsed.id : id,
            ok: parsed.ok === true,
            windowId: typeof parsed.windowId === 'string' ? parsed.windowId : undefined,
            pong: parsed.pong === true,
            uptimeMs: typeof parsed.uptimeMs === 'number' ? parsed.uptimeMs : undefined,
            error: typeof parsed.error === 'string' ? parsed.error : undefined,
            transport: 'sectium-pipe',
          });
        } catch {
          finish({
            id,
            ok: false,
            error: 'Invalid NDJSON response from Sectium device pipe',
            transport: 'sectium-pipe',
          });
        }
      }
    });

    socket.on('error', () => {
      // Power-Button daemon not attached -> deterministic virtual-frame mode
      finish({
        id,
        ok: true,
        windowId: req.op === 'open_window' ? `vf-${id}` : undefined,
        transport: 'virtual-frame',
      });
    });
  });
}
