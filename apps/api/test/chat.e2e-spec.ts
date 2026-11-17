import type { INestApplication } from '@nestjs/common';
import type { LanguageModel } from 'ai';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { ConversationRepository } from '../src/conversations/application/conversation.repository.js';
import { CatalogUnavailableError } from '../src/catalog/domain/catalog.errors.js';
import type { CatalogPort } from '../src/catalog/application/catalog.port.js';
import { createTestApp } from './support/create-test-app.js';
import { failingModel, parseSse, scriptedModel, textStep, toolCallStep } from './support/mock-model.js';
import { product } from './support/product.fixture.js';

const CONV = '0b6f8c1e-1d2a-4c3b-9e8f-111111111111';
const catalog: CatalogPort = {
  getAll: async () => [
    product({ id: 1, title: 'iPhone 9', price: 549 }),
    product({ id: 2, title: 'Oppo F19', price: 399 }),
    product({ id: 3, title: 'Realme C35', price: 149 }),
    product({ id: 4, title: 'Galaxy S8', price: 499, stock: 0 }),
  ],
};
const phonesQuery = {
  label: 'Phones under $500',
  category: 'smartphones',
  keywords: [],
  minPrice: null,
  maxPrice: 500,
  sortBy: 'price-desc',
  offset: 0,
  confidence: 'clear',
  assumption: null,
};

describe('POST /api/chat', () => {
  let app: INestApplication;
  afterEach(() => app?.close());

  const send = async (model: LanguageModel, text = 'a phone under $500', cat = catalog) => {
    app = await createTestApp({ catalog: cat, model });
    const res = await request(app.getHttpServer())
      .post('/api/chat')
      .send({ conversationId: CONV, message: { id: 'u1', text } })
      .buffer(true)
      .parse((r, cb) => {
        let data = '';
        r.on('data', (c: Buffer) => (data += c.toString()));
        r.on('end', () => cb(null, data));
      });
    return { res, events: parseSse(res.body as string) };
  };

  it('streams tool output then text, and persists both Messages (AC2.1, AC3.2, AC5.1, AC7.1)', async () => {
    const model = scriptedModel(
      toolCallStep([{ id: 'c1', name: 'search_products', input: phonesQuery }]),
      textStep('Here are ', 'phones under $500.'),
    );
    const { res, events } = await send(model);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    const types = events.map((e) => e.type);
    expect(types.indexOf('tool-output-available')).toBeLessThan(types.indexOf('text-delta'));
    expect(types.filter((t) => t === 'text-delta')).toHaveLength(2);
    expect(types.at(-1)).toBe('finish');

    const output = events.find((e) => e.type === 'tool-output-available')?.output as {
      products: { id: number; price: number }[];
      total: number;
    };
    expect(output.products.map((p) => p.id)).toEqual([2, 3]); // ≤ $500, in stock (R6, R9)
    expect(output.total).toBe(2);

    const saved = await app.get(ConversationRepository).get(CONV);
    expect(saved?.title).toBe('a phone under $500');
    expect(saved?.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(saved?.messages[1]?.text).toBe('Here are phones under $500.');
    expect(saved?.messages[1]?.productGroups[0]?.products.map((p) => p.id)).toEqual([2, 3]);

    const reloaded = await request(app.getHttpServer()).get(`/api/conversations/${CONV}`).expect(200);
    expect(reloaded.body.messages[1].productGroups[0].label).toBe('Phones under $500');
  });

  it('runs two searches for a multi-intent request (AC3.5)', async () => {
    const lipstick = {
      ...phonesQuery,
      label: 'Lipsticks',
      category: null,
      keywords: ['iphone'],
      maxPrice: null,
    };
    const model = scriptedModel(
      toolCallStep([
        { id: 'c1', name: 'search_products', input: phonesQuery },
        { id: 'c2', name: 'search_products', input: lipstick },
      ]),
      textStep('Both found.'),
    );
    await send(model, 'a phone under $500 and an iphone');
    const saved = await app.get(ConversationRepository).get(CONV);
    expect(saved?.messages[1]?.productGroups.map((g) => g.label)).toEqual(['Phones under $500', 'Lipsticks']);
  });

  it('rejects a guessed search without an assumption and lets the model retry (R2)', async () => {
    const bad = { ...phonesQuery, confidence: 'guessed', assumption: null };
    const good = { ...phonesQuery, confidence: 'guessed', assumption: 'cheap = under $500' };
    const model = scriptedModel(
      toolCallStep([{ id: 'c1', name: 'search_products', input: bad }]),
      toolCallStep([{ id: 'c2', name: 'search_products', input: good }]),
      textStep('I assumed cheap means under $500. Any brand in mind?'),
    );
    const { events } = await send(model, 'something cheap');
    expect(events.some((e) => e.type === 'tool-input-error' || e.type === 'tool-output-error')).toBe(true);
    const saved = await app.get(ConversationRepository).get(CONV);
    expect(saved?.messages[1]?.productGroups).toHaveLength(1);
    expect(saved?.messages[1]?.productGroups[0]?.query.assumption).toBe('cheap = under $500');
  });

  it('sends an error part (not a dropped connection) when the LLM fails mid-reply; user Message stays saved (AC2.3)', async () => {
    const { res, events } = await send(failingModel());
    expect(res.status).toBe(200);
    expect(events.find((e) => e.type === 'error')?.errorText).toMatch(/could not finish/);
    const saved = await app.get(ConversationRepository).get(CONV);
    expect(saved?.messages.map((m) => m.role)).toEqual(['user']);
  });

  it('turns a Catalog outage into a tool error the model can explain (AC3.8)', async () => {
    const down: CatalogPort = { getAll: () => Promise.reject(new CatalogUnavailableError()) };
    const model = scriptedModel(
      toolCallStep([{ id: 'c1', name: 'search_products', input: phonesQuery }]),
      textStep("Sorry, I can't search the catalog right now."),
    );
    const { events } = await send(model, 'a phone', down);
    expect(events.some((e) => e.type === 'tool-output-error')).toBe(true);
    const prompt = JSON.stringify(model.doStreamCalls[1]?.prompt);
    expect(prompt).toContain('unavailable');
    const saved = await app.get(ConversationRepository).get(CONV);
    expect(saved?.messages[1]?.productGroups).toEqual([]);
  });

  it('tells the Shopper when the reply could not be saved (AC5.4)', async () => {
    app = await createTestApp({ catalog, model: scriptedModel(textStep('Hello')) });
    const repo = app.get(ConversationRepository);
    const save = repo.save.bind(repo);
    let calls = 0;
    repo.save = async (c) => {
      if (++calls === 2) throw new Error('disk full');
      return save(c);
    };
    const res = await request(app.getHttpServer())
      .post('/api/chat')
      .send({ conversationId: CONV, message: { id: 'u1', text: 'hi' } })
      .buffer(true)
      .parse((r, cb) => {
        let d = '';
        r.on('data', (c: Buffer) => (d += c.toString()));
        r.on('end', () => cb(null, d));
      });
    const events = parseSse(res.body as string);
    expect(events.some((e) => e.type === 'text-delta')).toBe(true);
    expect(events.find((e) => e.type === 'error')?.errorText).toMatch(/could not be saved/);
  });

  it('forces the last step to be a text reply, so the Shopper never gets an empty answer', async () => {
    const search = (id: string) => toolCallStep([{ id, name: 'search_products', input: phonesQuery }]);
    const model = scriptedModel(search('c1'), search('c2'), textStep('Here is what I found.'));
    await send(model, 'a flight to Tokyo');
    expect(model.doStreamCalls.map((c) => c.toolChoice?.type ?? 'auto')).toEqual(['auto', 'auto', 'none']);
  });

  it('sends earlier Product Groups to the model as system notes, not inside assistant text (R5)', async () => {
    const model = scriptedModel(
      toolCallStep([{ id: 'c1', name: 'search_products', input: phonesQuery }]),
      textStep('Phones.'),
      textStep('Cheaper ones.'),
    );
    await send(model);
    await request(app.getHttpServer())
      .post('/api/chat')
      .send({ conversationId: CONV, message: { id: 'u2', text: 'cheaper ones' } })
      .expect(200);
    const prompt = model.doStreamCalls[2]?.prompt ?? [];
    expect(prompt.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'system', 'user']);
    expect(JSON.stringify(prompt[3])).toContain('#2 \\"Oppo F19\\" $399');
    expect(JSON.stringify(prompt[2])).not.toContain('#2');
  });

  it('400s with the error shape for an invalid body', async () => {
    app = await createTestApp();
    const res = await request(app.getHttpServer())
      .post('/api/chat')
      .send({ conversationId: 'nope', message: { id: 'u1', text: '   ' } })
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toMatch(/conversationId/);
  });
});
