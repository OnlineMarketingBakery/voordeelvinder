// Astro emits every image module it loads, and src/lib/assets.ts loads the whole asset folder,
// so art no page uses (placeholders, unlicensed stock) would still be published under _astro/.
// After the build, delete the image files that no page, stylesheet or script references.
//
// Only the prerendered client output counts. The on-demand form pages (/vergelijken/<product>)
// get their images from the image endpoint at request time (/_image?href=/_astro/<original>),
// so the original of every image a prerendered page uses is kept too: a transform of it
// (`<name>.<hash>_<transform>.<ext>`) is referenced. The form pages use the same images as the
// prerendered /vergelijken (header, footer, every panel); an image used only on an on-demand
// page would be pruned (tests/e2e/form.spec.ts checks that every image there loads).
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg']);
const TEXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.webmanifest', '.xml', '.txt']);

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

/** Deletes unreferenced images in `<clientDir>/_astro`; returns their file names. */
export function pruneUnusedImages(clientDir: string): string[] {
  const files = listFiles(clientDir);
  const text = files
    .filter((file) => TEXT.has(extname(file)))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  const assetsDir = join(clientDir, '_astro');
  const pruned: string[] = [];
  for (const file of files) {
    if (!file.startsWith(assetsDir) || !IMAGE.has(extname(file).toLowerCase())) continue;
    const name = file.slice(assetsDir.length + 1);
    if (text.includes(name)) continue;
    // The original of a transformed image that is used: the image endpoint reads it.
    if (text.includes(`${name.slice(0, -extname(name).length)}_`)) continue;
    rmSync(file);
    pruned.push(name);
  }
  return pruned;
}

export function pruneUnusedImagesIntegration(): AstroIntegration {
  return {
    name: 'voordeelvinder:prune-unused-images',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const pruned = pruneUnusedImages(fileURLToPath(dir));
        logger.info(`Removed ${pruned.length} unreferenced image(s) from _astro/`);
      },
    },
  };
}
