# `shell`

> **Sectium / Ghost Note:** Adapted from Electron's MIT `docs/api/shell.md`. Routes external URLs and paths through the Sectium Host Device Boundary.

Manage files and URLs using their default applications.

## Methods

- `shell.openExternal(url: string): Promise<void>` — Opens `http://`, `https://`, or `mailto:` URLs via Sectium.
- `shell.openPath(fullPath: string): Promise<string>` — Opens a file or folder path.
- `shell.beep(): void` — Plays the terminal/system beep sound.
