// Resolves the image and icon keys used in content files (validated in src/lib/asset-keys.ts).
import type { ImageMetadata } from 'astro';

type SvgComponent = ((props: Record<string, unknown>) => unknown) & ImageMetadata;

const images = import.meta.glob<ImageMetadata>('../assets/images/**/*.{png,svg,jpg,webp}', {
  eager: true,
  import: 'default',
});
const svgIcons = import.meta.glob<SvgComponent>('../assets/icons/*.svg', {
  eager: true,
  import: 'default',
});
const maskIcons = import.meta.glob<ImageMetadata>('../assets/icons/raster/*.png', {
  eager: true,
  import: 'default',
});

const byKey = <T>(modules: Record<string, T>, prefix: string) =>
  new Map(
    Object.entries(modules).map(([path, value]) => [
      path.slice(prefix.length).replace(/\.[a-z]+$/, ''),
      value,
    ]),
  );

const imageMap = byKey(images, '../assets/images/');
const svgIconMap = byKey(svgIcons, '../assets/icons/');
const maskIconMap = byKey(maskIcons, '../assets/icons/raster/');

export function image(key: string): ImageMetadata {
  const found = imageMap.get(key);
  if (!found) throw new Error(`Unknown image "${key}" (src/assets/images)`);
  return found;
}

export function isSvg(meta: ImageMetadata): boolean {
  return meta.format === 'svg';
}

export type ResolvedIcon = { kind: 'svg'; Component: SvgComponent } | { kind: 'mask'; src: string };

export function icon(key: string): ResolvedIcon {
  const svg = svgIconMap.get(key);
  if (svg) return { kind: 'svg', Component: svg };
  const mask = maskIconMap.get(key);
  if (mask) return { kind: 'mask', src: mask.src };
  throw new Error(`Unknown icon "${key}" (src/assets/icons)`);
}

/** The URL of an icon's file, for code that draws it as a mask (the form island). */
export function iconUrl(key: string): string {
  const resolved = icon(key);
  return resolved.kind === 'svg' ? resolved.Component.src : resolved.src;
}

export const allImageKeys = [...imageMap.keys()].sort();
export const allIconKeys = [...svgIconMap.keys(), ...maskIconMap.keys()].sort();
