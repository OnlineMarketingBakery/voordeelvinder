// Asset keys for the content schemas: every image or icon a content file may reference.
// Read from disk (synchronously) when the content config loads, so an unknown key fails the
// build. Components resolve the same keys with import.meta.glob (src/lib/assets.ts).
import { readdirSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const assetsDir = fileURLToPath(new URL('../assets/', import.meta.url));

function listFiles(dir: string, recursive: boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (!entry.isDirectory()) return [path];
    return recursive ? listFiles(path, true) : [];
  });
}

/** Keys (paths without extension, relative to src/assets/<subdir>) of the given file types. */
function keys(subdir: string, extensions: string[], { recursive = true } = {}): string[] {
  const root = join(assetsDir, subdir);
  return listFiles(root, recursive)
    .filter((file) => extensions.includes(extname(file)))
    .map((file) => {
      const rel = relative(root, file).split(sep).join('/');
      return rel.slice(0, -extname(rel).length);
    });
}

function nonEmpty(found: string[], where: string): [string, ...string[]] {
  if (found.length === 0) throw new Error(`No assets found in ${where}`);
  const duplicate = found.find((key, index) => found.indexOf(key) !== index);
  if (duplicate) throw new Error(`Asset key "${duplicate}" exists twice in ${where}`);
  return found.sort() as [string, ...string[]];
}

/** e.g. "mascot/fox-waving" for src/assets/images/mascot/fox-waving.svg */
export const imageKeys = nonEmpty(
  keys('images', ['.png', '.svg', '.jpg', '.webp']),
  'src/assets/images',
);

/**
 * e.g. "money" (icons/money.svg, inlined) or "contract" (icons/raster/contract.png, a mask
 * icon). Mirrors the globs in src/lib/assets.ts: top-level SVGs plus raster/*.png.
 */
export const iconKeys = nonEmpty(
  [...keys('icons', ['.svg'], { recursive: false }), ...keys('icons/raster', ['.png'])],
  'src/assets/icons',
);
