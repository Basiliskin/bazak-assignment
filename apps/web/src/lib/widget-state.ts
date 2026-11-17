import { z } from 'zod';

/** What the widget remembers across reloads: a pointer only — Conversations live on the server (ADR 0003). */
export interface WidgetState {
  open: boolean;
  conversationId: string;
}

export const WIDGET_STORAGE_KEY = 'shopping-copilot.widget';

const WidgetStateSchema = z.object({ open: z.boolean(), conversationId: z.uuid() });

/** Pure: stored text → state. Missing or invalid → closed, on a new chat (`newId`). */
export function parseWidgetState(raw: string | null, newId: string): WidgetState {
  try {
    const parsed = WidgetStateSchema.safeParse(JSON.parse(raw ?? 'null'));
    if (parsed.success) return parsed.data;
  } catch {
    // not JSON — fall through
  }
  return { open: false, conversationId: newId };
}

export const serializeWidgetState = (state: WidgetState): string => JSON.stringify(state);
