import type { Conversation, Message } from '@app/contracts';

export const TITLE_MAX = 40;
const ELLIPSIS = '…';

/** Pure: Conversation Title = first Shopper message, single-spaced, ≤ 40 chars cut at a word boundary. */
export function deriveTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return 'New chat';
  if (clean.length <= TITLE_MAX) return clean;
  const cut = clean.slice(0, TITLE_MAX - ELLIPSIS.length);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}${ELLIPSIS}`;
}

/** Pure: a new, empty Conversation. Id and time come from the caller (no clock/randomness here). */
export const createConversation = (id: string, firstText: string, now: string): Conversation => ({
  id,
  title: deriveTitle(firstText),
  updatedAt: now,
  messages: [],
});

/** Pure: a new Conversation with the Message added. A Message id already present is a no-op (safe retries). */
export function appendMessage(conversation: Conversation, message: Message): Conversation {
  if (conversation.messages.some((m) => m.id === message.id)) return conversation;
  return { ...conversation, messages: [...conversation.messages, message], updatedAt: message.createdAt };
}
