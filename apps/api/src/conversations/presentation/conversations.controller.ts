import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe } from '@nestjs/common';
import type { Conversation, ConversationSummary } from '@app/contracts';
import { ConversationsService } from '../application/conversations.service.js';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  /** Sidebar list, newest activity first (AC6.2). */
  @Get()
  list(): Promise<ConversationSummary[]> {
    return this.conversations.list();
  }

  /** Full history with Product Groups — refresh and switching (AC5.1, AC6.3). */
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<Conversation> {
    return this.conversations.get(id);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.conversations.delete(id);
  }
}
