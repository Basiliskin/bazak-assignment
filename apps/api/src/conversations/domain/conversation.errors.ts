import { DomainError } from '../../shared/domain/domain-error.js';

export class ConversationNotFoundError extends DomainError {
  readonly code = 'CONVERSATION_NOT_FOUND';
  constructor(id: string) {
    super(`Conversation ${id} not found`);
  }
}
