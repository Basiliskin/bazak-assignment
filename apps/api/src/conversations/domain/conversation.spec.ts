import { describe, expect, it } from 'vitest';
import { message } from '../../../test/support/message.fixture.js';
import { appendMessage, createConversation, deriveTitle, toSummary } from './conversation.js';

describe('deriveTitle', () => {
  it('keeps short messages as they are (trimmed, single-spaced)', () => {
    expect(deriveTitle('  a phone   under $500 ')).toBe('a phone under $500');
  });

  it('cuts long messages at a word boundary to ≤ 40 chars with an ellipsis', () => {
    const t = deriveTitle('I am looking for a lightweight laptop for travelling with long battery life');
    expect(t).toBe('I am looking for a lightweight laptop…');
    expect(t.length).toBeLessThanOrEqual(40);
  });

  it('hard-cuts a single very long word', () => {
    expect(deriveTitle('x'.repeat(60))).toBe(`${'x'.repeat(39)}…`);
  });

  it('falls back for empty text', () => expect(deriveTitle('   ')).toBe('New chat'));
});

describe('createConversation', () => {
  it('starts empty, titled from the first message', () => {
    expect(createConversation('c1', 'show me smartphones', '2026-11-17T10:00:00.000Z')).toEqual({
      id: 'c1',
      title: 'show me smartphones',
      updatedAt: '2026-11-17T10:00:00.000Z',
      messages: [],
    });
  });
});

describe('appendMessage', () => {
  const conv = createConversation('c1', 'hi', '2026-11-17T10:00:00.000Z');

  it('returns a new Conversation with the Message and bumps updatedAt', () => {
    const m = message({ id: 'm1', createdAt: '2026-11-17T11:00:00.000Z' });
    const next = appendMessage(conv, m);
    expect(next.messages).toEqual([m]);
    expect(next.updatedAt).toBe('2026-11-17T11:00:00.000Z');
    expect(conv.messages).toEqual([]);
  });

  it('is idempotent for a Message id it already has (client retry)', () => {
    const once = appendMessage(conv, message({ id: 'm1' }));
    expect(appendMessage(once, message({ id: 'm1', text: 'changed' }))).toBe(once);
  });
});

describe('toSummary', () => {
  it('drops the messages', () => {
    const conv = appendMessage(
      createConversation('c1', 'hi', '2026-11-17T10:00:00.000Z'),
      message({ id: 'm1' }),
    );
    expect(toSummary(conv)).toEqual({ id: 'c1', title: 'hi', updatedAt: conv.updatedAt });
  });
});
