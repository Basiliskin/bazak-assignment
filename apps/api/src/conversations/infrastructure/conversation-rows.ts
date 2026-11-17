import { MessageSchema, type Conversation, type Message } from '@app/contracts';

export interface ConversationRow {
  id: string;
  title: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  payload_json: string;
}

const parseMessage = (row: MessageRow): Message | null => {
  try {
    const r = MessageSchema.safeParse(JSON.parse(row.payload_json));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
};

/** Pure: DB rows → Conversation. Rows that aren't valid Messages are skipped and counted (AC5.2). */
export function rowsToConversation(
  conversation: ConversationRow,
  messageRows: readonly MessageRow[],
): { conversation: Conversation; skipped: number } {
  const messages = messageRows.map(parseMessage).filter((m): m is Message => m !== null);
  return {
    conversation: {
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updated_at,
      messages,
    },
    skipped: messageRows.length - messages.length,
  };
}
