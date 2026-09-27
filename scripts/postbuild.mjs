/**
 * Post-build asset copy.
 *
 * `tsc` only emits .js/.d.ts files, so runtime assets under `src/data`
 * (consumed by `readFile` in src/utils/files.ts) never reach `dist/`.
 * That makes any CV-question flow fail with ENOENT in a built deploy.
 *
 * This copies `src/data` -> `dist/data` so the compiled tree mirrors the
 * source tree and `path.join(__dirname, '../data/<file>')` keeps resolving.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const source = path.join(root, 'src', 'data');
const destination = path.join(root, 'dist', 'data');

if (!existsSync(source)) {
  console.error(`[postbuild] Missing source directory: ${source}`);
  process.exit(1);
}

const assets = readdirSync(source);
if (assets.length === 0) {
  console.error(`[postbuild] No assets found in ${source}`);
  process.exit(1);
}

// Wipe first so a renamed/deleted asset does not linger from a previous build.
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });

const copied = readdirSync(destination);
const missing = assets.filter((asset) => !copied.includes(asset));
if (missing.length > 0) {
  console.error(`[postbuild] Assets failed to copy: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`[postbuild] Copied ${copied.length} asset(s) to dist/data: ${copied.join(', ')}`);
