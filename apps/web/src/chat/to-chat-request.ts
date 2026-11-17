import type { ChatRequest } from '@app/contracts';
import type { UIMessage } from 'ai';

/**
 * Body of POST /api/chat (pure): only the newest user Message — the server owns history (ADR 0003).
 * Works for send and Retry (`regenerate` leaves the user Message last, or before a partial reply).
 */
export function toChatRequest(conversationId: string, messages: readonly UIMessage[]): ChatRequest {
  const last = messages.findLast((m) => m.role === 'user');
  if (!last) throw new Error('No user message to send');
  const text = last.parts
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('')
    .trim();
  return { conversationId, message: { id: last.id, text } };
}
