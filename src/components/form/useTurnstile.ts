// The Turnstile widget of the form's last step (src/lib/turnstile.ts, shared with the footer
// newsletter): the script loads the
// first time that step shows, never on page load, and the widget renders into the returned
// container. React never renders children into that container: Turnstile owns it.
import { useCallback, useEffect, useRef } from 'react';

import { createTurnstileWidget, loadTurnstile, type TurnstileWidget } from '../../lib/turnstile';

export function useTurnstile(active: boolean, siteKey: string | null) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<TurnstileWidget | null>(null);

  useEffect(() => {
    const element = container.current;
    if (!active || !siteKey || !element) return;
    const current = createTurnstileWidget({
      container: element,
      siteKey,
      action: 'lead',
      api: loadTurnstile(),
    });
    widget.current = current;
    return () => {
      current.remove();
      if (widget.current === current) widget.current = null;
    };
  }, [active, siteKey]);

  /** A token for one send; undefined when there is no widget (no key, script not loaded). */
  const token = useCallback(async () => widget.current?.take(), []);

  return { container, token };
}
