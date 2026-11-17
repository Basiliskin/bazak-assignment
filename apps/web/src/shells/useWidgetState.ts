import { useEffect, useState } from 'react';
import {
  parseWidgetState,
  serializeWidgetState,
  WIDGET_STORAGE_KEY,
  type WidgetState,
} from '../lib/widget-state';

// Storage can throw (private mode, blocked site data) — the widget then just forgets on reload.
function readStored(): string | null {
  try {
    return localStorage.getItem(WIDGET_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Widget open flag + active Conversation id, remembered in localStorage (AC6b.3, D38). */
export function useWidgetState() {
  const [state, setState] = useState<WidgetState>(() => parseWidgetState(readStored(), crypto.randomUUID()));

  useEffect(() => {
    try {
      localStorage.setItem(WIDGET_STORAGE_KEY, serializeWidgetState(state));
    } catch {
      // see readStored
    }
  }, [state]);

  return [state, setState] as const;
}
