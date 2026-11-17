import { describe, expect, it } from 'vitest';
import { group } from '../../../test/support/message.fixture.js';
import { toAssistantMessage } from './to-assistant-message.js';

describe('toAssistantMessage', () => {
  it('builds an assistant Message from the turn outcome', () => {
    const m = toAssistantMessage(
      { text: '  Here you go  ', productGroups: [group()], offCatalog: [] },
      { id: 'a1', createdAt: '2026-11-17T10:00:00.000Z' },
    );
    expect(m).toEqual({
      id: 'a1',
      role: 'assistant',
      text: 'Here you go',
      productGroups: [group()],
      offCatalog: [],
      createdAt: '2026-11-17T10:00:00.000Z',
    });
  });
});
