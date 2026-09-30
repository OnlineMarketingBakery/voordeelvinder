// The Turnstile widget of the form's last step (src/lib/turnstile.ts, shared with the footer
// newsletter): the script loads the
// first time that step shows, never on page load, and the widget renders into the returned
// container. React never renders children into that container: Turnstile owns it. A widget that
// broke (the script failed to load or took too long) renders again on the next send.
import { useCallback, useEffect, useRef } from 'react';

import { createRecoveringTurnstileWidget, type TurnstileWidget } from '../../lib/turnstile';

export function useTurnstile(active: boolean, siteKey: string | null) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<TurnstileWidget | null>(null);

  useEffect(() => {
    const element = container.current;
    if (!active || !siteKey || !element) return;
    widget.current = createRecoveringTurnstileWidget({
      container: element,
      siteKey,
      action: 'lead',
    });
    return () => {
      // Whichever widget is current, and in it whichever one it rendered last (after a failed
      // load too): none outlives the step.
      widget.current?.remove();
      widget.current = null;
    };
  }, [active, siteKey]);

  /**
   * A token for one send; undefined when there is no widget (no key) or no token in time. The
   * first one may wait for the script too (FIRST_TOKEN_WAIT_MS).
   */
  const token = useCallback(async () => widget.current?.take(), []);

  return { container, token };
}
