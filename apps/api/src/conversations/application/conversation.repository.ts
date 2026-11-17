import type { Conversation, ConversationSummary } from '@app/contracts';

/** Port: Conversation storage. `save` persists the whole aggregate (D22). */
export abstract class ConversationRepository {
  abstract get(id: string): Promise<Conversation | null>;
  abstract list(): Promise<ConversationSummary[]>;
  abstract save(conversation: Conversation): Promise<void>;
  /** @returns false when there was nothing to delete. */
  abstract delete(id: string): Promise<boolean>;
}
