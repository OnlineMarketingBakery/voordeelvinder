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
  /**
   * In a button row narrower than 312 px (the `actions` container: phones below 390 px), only
   * the icon shows; the text stays the button's name ("Terug" beside the reset button).
   */
  compact?: boolean;
  /** "Verstuur" on the last step: one ring grows out of the button when it gets this. */
  attention?: boolean;
};

/**
 * The form buttons "Terug" and "Volgende"/"Verstuur" (Figma 89:7981, 89:7461): the same classes
 * as Button.astro's `form` / `form-secondary` variants in the `form` size.
 *
 * Motion (docs/MOTION.md "Form buttons"): the button lifts on hover and gives on press; its
 * arrow points the way: it nudges that way on hover (half of distance[1]) and shoots on press
 * (distance[1]). Reduced motion: none of it.
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
  attention = false,
  compact = false,
}: ButtonProps) {
  const glyph = busy ? (
    <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center">
      <span className="size-[18px] rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
    </span>
  ) : (
    <span
      aria-hidden="true"
      className={cx(
        'grid shrink-0 place-items-center transition-[translate] duration-(--motion-duration-fast) ease-out',
        iconPosition === 'end'
          ? 'motion-safe:group-hover/button:translate-x-1 motion-safe:group-active/button:translate-x-2'
          : 'motion-safe:group-hover/button:-translate-x-1 motion-safe:group-active/button:-translate-x-2',
      )}
    >
      <MaskIcon src={icon} className="size-6" />
    </span>
  );
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={busy ? 'true' : undefined}
      aria-busy={busy ? 'true' : undefined}
      className={cx(
        'group/button relative isolate inline-flex h-[52px] shrink-0 items-center justify-center gap-1 rounded-md px-4 text-body-lg font-normal whitespace-nowrap text-ink-900 select-none md:min-w-[148px] md:px-5',
        compact && '@max-[312px]/actions:px-3.5',
        'transition-[translate,scale,background-color,box-shadow] duration-(--motion-duration-fast) ease-out motion-safe:hover:-translate-y-px motion-safe:active:scale-[0.97]',
        'aria-disabled:cursor-progress aria-disabled:opacity-60',
        variant === 'primary' ? 'bg-lime-400' : 'border border-control-border bg-white',
      )}
    >
      {attention && (
        // Mounted when the last step shows, so the ring plays once per arrival.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-md bg-lime-400 opacity-0 motion-safe:animate-[form-ping_var(--motion-duration-slow)_var(--ease-out)_var(--motion-duration-base)_both]"
        />
      )}
      {iconPosition === 'start' && glyph}
      {compact ? <span className="@max-[312px]/actions:sr-only">{children}</span> : children}
      {iconPosition === 'end' && glyph}
    </button>
  );
}
