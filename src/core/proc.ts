/** Small process helpers: detect a binary on PATH, best-effort. */
import { execa } from 'execa';

/** True when `<name> --version` runs and exits 0 within a short timeout. */
export async function hasBinary(name: string): Promise<boolean> {
  try {
    const res = await execa(name, ['--version'], { reject: false, timeout: 5000 });
    return res.exitCode === 0;
  } catch {
    return false;
  }
}
