import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, '..');
const repoRoot = path.join(pkgRoot, '../..');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[kiosk-playback] skip missing: ${src}`);
    return;
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

/** Sync shared static assets from the monorepo root before build/dev. */
copyDirSync(path.join(repoRoot, 'public'), path.join(pkgRoot, 'public'));

console.log('[kiosk-playback] prepared public/ assets');
