// Asset keys for the content schemas: every image or icon a content file may reference.
// Read from disk (synchronously) when the content config loads, so an unknown key fails the
// build. Components resolve the same keys with import.meta.glob (src/lib/assets.ts).
import { readdirSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const assetsDir = fileURLToPath(new URL('../assets/', import.meta.url));

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function keys(
  subdir: string,
  extensions: string[],
  { flatten = false } = {},
): [string, ...string[]] {
  const root = join(assetsDir, subdir);
  const found = listFiles(root)
    .filter((file) => extensions.includes(extname(file)))
    .map((file) => {
      const rel = relative(root, file).split(sep).join('/');
      const key = rel.slice(0, -extname(rel).length);
      return flatten ? key.split('/').at(-1)! : key;
    })
    .sort();
  if (found.length === 0) throw new Error(`No assets found in src/assets/${subdir}`);
  return found as [string, ...string[]];
}

/** e.g. "mascot/fox-waving" for src/assets/images/mascot/fox-waving.svg */
export const imageKeys = keys('images', ['.png', '.svg', '.jpg', '.webp']);

/** e.g. "money" (icons/money.svg) or "contract" (icons/raster/contract.png, a mask icon) */
export const iconKeys = keys('icons', ['.svg', '.png'], { flatten: true });
