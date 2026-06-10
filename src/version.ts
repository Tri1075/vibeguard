import fs from 'node:fs';

/** Read the package version at runtime; tolerate any layout. */
function readVersion(): string {
  try {
    const url = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(fs.readFileSync(url, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const TOOL_VERSION: string = readVersion();
