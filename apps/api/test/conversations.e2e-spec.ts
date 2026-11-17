import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConversationRepository } from '../src/conversations/application/conversation.repository.js';
import { appendMessage, createConversation } from '../src/conversations/domain/conversation.js';
import { group, message } from './support/message.fixture.js';
import { createTestApp } from './support/create-test-app.js';

const ID_A = '0b6f8c1e-1d2a-4c3b-9e8f-111111111111';
const ID_B = '0b6f8c1e-1d2a-4c3b-9e8f-222222222222';
const MISSING = '0b6f8c1e-1d2a-4c3b-9e8f-999999999999';

describe('/api/conversations', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    app = await createTestApp();
    const repo = app.get(ConversationRepository);
    await repo.save(
      appendMessage(
        appendMessage(
          createConversation(ID_A, 'a phone under $500', '2026-11-17T10:00:00.000Z'),
          message({ id: 'a-u', text: 'a phone under $500', createdAt: '2026-11-17T10:00:00.000Z' }),
        ),
        message({
          id: 'a-a',
          role: 'assistant',
          text: 'Here are phones',
          productGroups: [group()],
          createdAt: '2026-11-17T10:00:05.000Z',
        }),
      ),
    );
    await repo.save(createConversation(ID_B, 'lipstick', '2026-11-17T09:00:00.000Z'));
  });
  afterEach(() => app.close());

  it('GET lists summaries, newest first', async () => {
    const res = await http().get('/api/conversations').expect(200);
    expect(res.body).toEqual([
      { id: ID_A, title: 'a phone under $500', updatedAt: '2026-11-17T10:00:05.000Z' },
      { id: ID_B, title: 'lipstick', updatedAt: '2026-11-17T09:00:00.000Z' },
    ]);
  });

  it('GET :id returns the full history with Product Groups (AC5.1)', async () => {
    const res = await http().get(`/api/conversations/${ID_A}`).expect(200);
    expect(res.body.messages.map((m: { id: string }) => m.id)).toEqual(['a-u', 'a-a']);
    expect(res.body.messages[1].productGroups[0]).toEqual(group());
  });

  it('GET :id 404s with the error shape for an unknown id', () =>
    http()
      .get(`/api/conversations/${MISSING}`)
      .expect(404, {
        error: { code: 'CONVERSATION_NOT_FOUND', message: `Conversation ${MISSING} not found` },
      }));

  it('GET :id 400s for an id that is not a UUID', async () => {
    const res = await http().get('/api/conversations/not-a-uuid').expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('DELETE :id removes it (204), then 404s', async () => {
    await http().delete(`/api/conversations/${ID_B}`).expect(204);
    await http().get(`/api/conversations/${ID_B}`).expect(404);
    await http().delete(`/api/conversations/${ID_B}`).expect(404);
  });
});
