import { assistantMessage, phoneGroup, userMessage } from '../test/fixtures';
import type { ShopUIMessage } from './chat-types';
import { toChatItems } from './to-chat-items';
import { describeChatError } from './describe-chat-error';
import { toChatRequest } from './to-chat-request';
import { toUIMessages } from './to-ui-messages';

describe('toUIMessages → toChatItems (stored Messages round-trip)', () => {
  it('keeps text, Product Groups and off-catalog notes', () => {
    const stored = [
      userMessage('u1', 'a flight to Tokyo and a phone'),
      assistantMessage('a1', 'We do not sell flights. Here are phones.', {
        productGroups: [phoneGroup],
        offCatalog: [{ request: 'flights' }],
      }),
    ];

    expect(toChatItems(toUIMessages(stored))).toEqual([
      {
        id: 'u1',
        role: 'user',
        text: 'a flight to Tokyo and a phone',
        productGroups: [],
        offCatalog: [],
        searching: [],
      },
      {
        id: 'a1',
        role: 'assistant',
        text: 'We do not sell flights. Here are phones.',
        productGroups: [phoneGroup],
        offCatalog: [{ request: 'flights' }],
        searching: [],
      },
    ]);
  });

  it('does not mutate its input', () => {
    const stored = [assistantMessage('a1', 'hi', { productGroups: [phoneGroup] })];
    const copy = structuredClone(stored);
    toChatItems(toUIMessages(stored));
    expect(stored).toEqual(copy);
  });
});

describe('toChatItems (live stream parts)', () => {
  it('lists searches still running by label and joins text parts', () => {
    const live: ShopUIMessage = {
      id: 'a2',
      role: 'assistant',
      parts: [
        { type: 'step-start' },
        {
          type: 'tool-search_products',
          toolCallId: 't1',
          state: 'input-available',
          input: phoneGroup.query,
        },
        { type: 'tool-search_products', toolCallId: 't0', state: 'input-streaming', input: { label: 'Lip' } },
        { type: 'text', text: 'Looking', state: 'streaming' },
        { type: 'text', text: 'now', state: 'streaming' },
      ],
    };

    const item = toChatItems([live])[0]!;
    expect(item.searching).toEqual(['Phones under $500', 'Lip']);
    expect(item.productGroups).toEqual([]);
    expect(item.text).toBe('Looking\n\nnow');
  });

  it('skips a tool output that is not a valid Product Group', () => {
    const live: ShopUIMessage = {
      id: 'a3',
      role: 'assistant',
      parts: [
        {
          type: 'tool-search_products',
          toolCallId: 't1',
          state: 'output-available',
          input: phoneGroup.query,
          output: { nope: true } as never,
        },
      ],
    };
    expect(toChatItems([live])[0]!.productGroups).toEqual([]);
  });
});

describe('toChatRequest', () => {
  const ui = toUIMessages([
    userMessage('u1', 'first'),
    assistantMessage('a1', 'ok'),
    userMessage('u2', 'second'),
  ]);

  it('sends only the last user Message', () => {
    expect(toChatRequest('conv-1', ui)).toEqual({
      conversationId: 'conv-1',
      message: { id: 'u2', text: 'second' },
    });
  });

  it('still finds the user Message when a partial assistant reply follows it (Retry)', () => {
    const withPartial = [
      ...ui,
      { id: 'a2', role: 'assistant' as const, parts: [{ type: 'text' as const, text: 'par' }] },
    ];
    expect(toChatRequest('conv-1', withPartial).message.id).toBe('u2');
  });

  it('throws when there is no user Message', () => {
    expect(() => toChatRequest('conv-1', [])).toThrow(/no user message/i);
  });
});

describe('describeChatError', () => {
  it('uses the text of a stream error part as is', () => {
    expect(describeChatError(new Error('The assistant could not finish this reply. Please try again.'))).toBe(
      'The assistant could not finish this reply. Please try again.',
    );
  });

  it('reads the message from an API error body', () => {
    const body = JSON.stringify({ error: { code: 'VALIDATION_FAILED', message: 'message.text: Too big' } });
    expect(describeChatError(new Error(body))).toBe('message.text: Too big');
  });

  it('falls back to a generic sentence for anything else', () => {
    expect(describeChatError(new Error(''))).toMatch(/something went wrong/i);
    expect(describeChatError(undefined)).toMatch(/something went wrong/i);
  });
});
