import {
  ConversationSchema,
  ConversationSummarySchema,
  type Conversation,
  type ConversationSummary,
} from '@app/contracts';

/** HTTP error with the API's `{ error: { code, message } }` body (DomainExceptionFilter). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const isNotFound = (error: unknown): boolean => error instanceof ApiError && error.status === 404;

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`/api${path}`, init);
  if (res.ok) return res;
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  throw new ApiError(res.status, body?.error?.code ?? 'HTTP_ERROR', body?.error?.message ?? res.statusText);
}

/** One fetch wrapper for the app. Responses are parsed with the shared contracts schemas. */
export const api = {
  async listConversations(): Promise<ConversationSummary[]> {
    const res = await request('/conversations');
    return ConversationSummarySchema.array().parse(await res.json());
  },
  async getConversation(id: string): Promise<Conversation> {
    const res = await request(`/conversations/${encodeURIComponent(id)}`);
    return ConversationSchema.parse(await res.json());
  },
  async deleteConversation(id: string): Promise<void> {
    await request(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  chatUrl: '/api/chat',
};
