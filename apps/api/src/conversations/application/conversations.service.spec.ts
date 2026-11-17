import { describe, expect, it } from 'vitest';
import { ConversationNotFoundError } from '../domain/conversation.errors.js';
import { createConversation } from '../domain/conversation.js';
import { ConversationsService } from './conversations.service.js';
import type { ConversationRepository } from './conversation.repository.js';

const repoWith = (
  convs = [createConversation('c1', 'hi', '2026-11-17T10:00:00.000Z')],
): ConversationRepository => ({
  get: async (id) => convs.find((c) => c.id === id) ?? null,
  list: async () => convs.map(({ messages: _m, ...s }) => s),
  save: async () => undefined,
  delete: async (id) => convs.some((c) => c.id === id),
});

describe('ConversationsService', () => {
  it('get returns the Conversation', async () => {
    expect((await new ConversationsService(repoWith()).get('c1')).id).toBe('c1');
  });

  it('get throws ConversationNotFound for an unknown id', async () => {
    await expect(new ConversationsService(repoWith()).get('x')).rejects.toBeInstanceOf(
      ConversationNotFoundError,
    );
  });

  it('delete throws ConversationNotFound for an unknown id', async () => {
    await expect(new ConversationsService(repoWith()).delete('x')).rejects.toBeInstanceOf(
      ConversationNotFoundError,
    );
  });
});
