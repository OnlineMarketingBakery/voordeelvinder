// Small building blocks of the form island. The island can't render Astro components, so icons
// arrive as URLs resolved at build time (Form.astro) and are drawn as CSS masks in currentColor,
// like the raster icons in ui/Icon.astro.
import type { ReactNode } from 'react';

/** Joins class names, skipping empty ones. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

/** A decorative icon: the SVG or PNG at `src` as a mask filled with the text colour. */
export function MaskIcon({ src, className }: { src: string | undefined; className?: string }) {
  if (!src) return null;
  const mask = `url("${src}")`;
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block shrink-0 bg-current [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat]',
        className,
      )}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    />
  );
}

type ButtonProps = {
  children: ReactNode;
  type: 'button' | 'submit';
  variant: 'primary' | 'secondary';
  icon: string | undefined;
  iconPosition: 'start' | 'end';
  onClick?: () => void;
  /**
   * Locked while sending: stays focusable, ignores clicks (FormIsland checks the lock too), and
   * shows a spinner in place of the icon at once (brief §6.1; it doesn't spin with reduced motion).
   */
  busy?: boolean;
  /**
   * Really disabled (not only aria-disabled): until the island has restored its session. A
   * disabled default button also blocks implicit submission (Enter in a field).
   */
  disabled?: boolean;
};

/**
 * The form buttons "Terug" and "Volgende"/"Verstuur" (Figma 89:7981, 89:7461): the same classes
 * as Button.astro's `form` / `form-secondary` variants in the `form` size.
 */
export function FormButton({
  children,
  type,
  variant,
  icon,
  iconPosition,
  onClick,
  busy = false,
  disabled = false,
}: ButtonProps) {
  const glyph = busy ? (
    <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center">
      <span className="size-[18px] rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
    </span>
  ) : (
    <MaskIcon src={icon} className="size-6" />
  );
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={busy ? 'true' : undefined}
      aria-busy={busy ? 'true' : undefined}
      className={cx(
        'inline-flex h-[52px] shrink-0 items-center justify-center gap-1 rounded-md px-5 text-body-lg font-normal whitespace-nowrap text-ink-900 select-none md:min-w-[148px]',
        'transition-[translate,scale,background-color,box-shadow] duration-(--motion-duration-fast) ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.97]',
        'aria-disabled:cursor-progress aria-disabled:opacity-60',
        variant === 'primary' ? 'bg-lime-400' : 'border border-control-border bg-white',
      )}
    >
      {iconPosition === 'start' && glyph}
      {children}
      {iconPosition === 'end' && glyph}
    </button>
  );
}
