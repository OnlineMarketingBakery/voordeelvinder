// Astro emits every image module it loads, and src/lib/assets.ts loads the whole asset folder,
// so art no page uses (placeholders, unlicensed stock) would still be published under _astro/.
// After the build, delete the image files that no page, stylesheet or script references.
//
// Only the prerendered client output counts. On-demand routes (the API) render no images; if
// one ever does, its images would be pruned here and this needs to account for dist/server.
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
