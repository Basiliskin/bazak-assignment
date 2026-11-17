import type { Conversation, ConversationSummary } from '@app/contracts';
import { ConversationNotFoundError } from '../domain/conversation.errors.js';
import type { ConversationRepository } from './conversation.repository.js';

/** Conversation management use cases (US6). */
export class ConversationsService {
  constructor(private readonly repository: ConversationRepository) {}

  list(): Promise<ConversationSummary[]> {
    return this.repository.list();
  }

  async get(id: string): Promise<Conversation> {
    const conversation = await this.repository.get(id);
    if (!conversation) throw new ConversationNotFoundError(id);
    return conversation;
  }

  async delete(id: string): Promise<void> {
    if (!(await this.repository.delete(id))) throw new ConversationNotFoundError(id);
  }
}
