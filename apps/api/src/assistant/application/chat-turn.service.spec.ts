import type { Conversation } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { product } from '../../../test/support/product.fixture.js';
import { group, message } from '../../../test/support/message.fixture.js';
import { CatalogService } from '../../catalog/application/catalog.service.js';
import type { RecommendationService } from '../../catalog/application/recommendation.service.js';
import { toProductCard } from '../../catalog/domain/to-product-card.js';
import type { ConversationRepository } from '../../conversations/application/conversation.repository.js';
import { appendMessage, createConversation } from '../../conversations/domain/conversation.js';
import { ChatTurnService } from './chat-turn.service.js';
import type { ChatStream, LlmPort, LlmTurnRequest } from './llm.port.js';

const CONV = '0b6f8c1e-1d2a-4c3b-9e8f-111111111111';

class MemoryRepo implements ConversationRepository {
  readonly saves: Conversation[] = [];
  constructor(private store = new Map<string, Conversation>()) {}
  async get(id: string) {
    return this.store.get(id) ?? null;
  }
  async list() {
    return [];
  }
  async save(c: Conversation) {
    this.saves.push(c);
    this.store.set(c.id, c);
  }
  async delete() {
    return false;
  }
}

/** Fake LLM: runs a scripted set of tool calls, then finishes with text. */
const fakeLlm = (script: (tools: LlmTurnRequest['tools']) => Promise<string>) => {
  const requests: LlmTurnRequest[] = [];
  const llm: LlmPort = {
    streamTurn(req): ChatStream {
      requests.push(req);
      const done = script(req.tools).then((text) => req.onFinish({ text }));
      return { headers: {}, body: new ReadableStream({ start: (c) => void done.then(() => c.close()) }) };
    },
  };
  return { llm, requests };
};

const drain = (s: ChatStream) => new Response(s.body).text();

const CATALOG = [
  product({ id: 1, title: 'iPhone 9', price: 499 }),
  product({ id: 2, title: 'Red Lipstick', price: 12, category: 'beauty' }),
];

/** Recommends Red Lipstick for anything — enough to see where Recommended Groups go. */
const alwaysLipstick = {
  recommend: async () => [toProductCard(CATALOG[1]!)],
} as unknown as RecommendationService;

const setup = (
  script: (tools: LlmTurnRequest['tools']) => Promise<string>,
  repo = new MemoryRepo(),
  recommendations: RecommendationService | null = null,
) => {
  const catalog = new CatalogService({ getAll: async () => CATALOG }, recommendations);
  const { llm, requests } = fakeLlm(script);
  let tick = 0;
  const service = new ChatTurnService(repo, catalog, llm, {
    now: () => `2026-11-17T10:00:0${tick++}.000Z`,
    newId: () => `id-${tick}`,
  });
  return { service, repo, requests };
};

const query = (over: Partial<ReturnType<typeof group>['query']> = {}) => ({ ...group().query, ...over });

describe('ChatTurnService', () => {
  it('creates the Conversation and saves the user Message before calling the LLM', async () => {
    const { service, repo, requests } = setup(async () => 'Hi!');
    await drain(
      await service.run({ conversationId: CONV, message: { id: 'u1', text: 'show me smartphones' } }),
    );
    expect(repo.saves[0]?.title).toBe('show me smartphones');
    expect(repo.saves[0]?.messages.map((m) => m.role)).toEqual(['user']);
    expect(requests[0]?.history).toEqual([{ role: 'user', text: 'show me smartphones' }]);
    expect(requests[0]?.system).toContain('smartphones');
  });

  it('persists the assistant Message with Product Groups in tool-call order (R4)', async () => {
    const { service, repo } = setup(async (tools) => {
      await Promise.all([
        tools.searchProducts(query({ label: 'Phones', category: 'smartphones' })),
        tools.searchProducts(query({ label: 'Lipsticks', category: 'beauty', maxPrice: null })),
      ]);
      return 'Here are phones and lipsticks.';
    });
    await drain(
      await service.run({ conversationId: CONV, message: { id: 'u1', text: 'phone and lipstick' } }),
    );
    const saved = await repo.get(CONV);
    const reply = saved?.messages[1];
    expect(reply?.role).toBe('assistant');
    expect(reply?.text).toBe('Here are phones and lipsticks.');
    expect(reply?.productGroups.map((g) => [g.label, g.products.map((p) => p.id)])).toEqual([
      ['Phones', [1]],
      ['Lipsticks', [2]],
    ]);
  });

  it('search_products returns a real Product Group from the Catalog, with price limits enforced (R1, R6)', async () => {
    let result: Awaited<ReturnType<LlmTurnRequest['tools']['searchProducts']>> | undefined;
    const { service } = setup(async (tools) => {
      result = await tools.searchProducts(query({ category: null, maxPrice: 100 }));
      return '';
    });
    await drain(await service.run({ conversationId: CONV, message: { id: 'u1', text: 'cheap stuff' } }));
    expect(result?.match.products.map((p) => p.id)).toEqual([2]);
    expect(result?.match.total).toBe(1);
    expect(result?.recommended).toBeNull();
  });

  it('returns and saves a Recommended Group right after its match group (ADR 0004)', async () => {
    let result: Awaited<ReturnType<LlmTurnRequest['tools']['searchProducts']>> | undefined;
    const { service, repo } = setup(
      async (tools) => {
        result = await tools.searchProducts(query({ label: 'Phones', semanticQuery: 'phones' }));
        return 'Phones.';
      },
      undefined,
      alwaysLipstick,
    );
    await drain(await service.run({ conversationId: CONV, message: { id: 'u1', text: 'a phone' } }));
    expect(result?.recommended?.products.map((p) => p.id)).toEqual([2]);
    const groups = (await repo.get(CONV))?.messages[1]?.productGroups;
    expect(groups?.map((g) => [g.kind, g.label])).toEqual([
      ['match', 'Phones'],
      ['recommended', 'You might also like · Phones'],
    ]);
  });

  it('recommends for the related "Instead: …" search (D49) but never on a "Show more" page', async () => {
    const { service, repo } = setup(
      async (tools) => {
        await tools.reportOffCatalog({ request: 'flights' });
        await tools.searchProducts(query({ label: 'Instead: travel bags' }));
        await tools.searchProducts(query({ label: 'Page 2', offset: 4 }));
        return 'We don’t sell flights.';
      },
      undefined,
      alwaysLipstick,
    );
    await drain(await service.run({ conversationId: CONV, message: { id: 'u1', text: 'a flight' } }));
    const groups = (await repo.get(CONV))?.messages[1]?.productGroups;
    expect(groups?.map((g) => [g.kind, g.label])).toEqual([
      ['match', 'Instead: travel bags'],
      ['recommended', 'You might also like · Instead: travel bags'],
      ['match', 'Page 2'],
    ]);
  });

  it('records off-catalog reports on the assistant Message', async () => {
    const { service, repo } = setup(async (tools) => {
      await tools.reportOffCatalog({ request: 'flights' });
      return 'We don’t sell flights.';
    });
    await drain(
      await service.run({ conversationId: CONV, message: { id: 'u1', text: 'a flight to Tokyo' } }),
    );
    expect((await repo.get(CONV))?.messages[1]?.offCatalog).toEqual([{ request: 'flights' }]);
  });

  it('continues an existing Conversation with its compacted history (R5)', async () => {
    const existing = appendMessage(
      appendMessage(
        createConversation(CONV, 'a phone', '2026-11-17T09:00:00.000Z'),
        message({ id: 'u0', text: 'a phone' }),
      ),
      message({ id: 'a0', role: 'assistant', text: 'Phones:', productGroups: [group()] }),
    );
    const repo = new MemoryRepo(new Map([[CONV, existing]]));
    const { service, requests } = setup(async () => 'Cheaper ones:', repo);
    await drain(
      await service.run({ conversationId: CONV, message: { id: 'u1', text: 'show me cheaper ones' } }),
    );
    expect(requests[0]?.history.map((h) => h.role)).toEqual(['user', 'assistant', 'note', 'user']);
    expect(requests[0]?.history[2]?.text).toContain('#1 "iPhone 9" $499');
    expect((await repo.get(CONV))?.title).toBe('a phone');
  });

  it('"Show more" pages the stored search even if the model changes other arguments (D31)', async () => {
    const shown = group({ query: query({ sortBy: 'price-asc', maxPrice: 600 }) });
    const existing = appendMessage(
      createConversation(CONV, 'a phone', '2026-11-17T09:00:00.000Z'),
      message({ id: 'a0', role: 'assistant', text: 'Phones:', productGroups: [shown] }),
    );
    const { service, repo } = setup(
      async (tools) => {
        await tools.searchProducts(query({ sortBy: 'relevance', maxPrice: null, offset: 4 }));
        return 'More phones.';
      },
      new MemoryRepo(new Map([[CONV, existing]])),
    );
    await drain(
      await service.run({
        conversationId: CONV,
        message: { id: 'u1', text: 'Show more: Phones under $500' },
      }),
    );
    const reply = (await repo.get(CONV))?.messages.at(-1);
    expect(reply?.productGroups[0]?.query).toEqual({ ...shown.query, offset: 4 });
  });

  it('a retried user Message (same id) is not stored twice', async () => {
    const { service, repo } = setup(async () => 'ok');
    await drain(await service.run({ conversationId: CONV, message: { id: 'u1', text: 'hi' } }));
    await drain(await service.run({ conversationId: CONV, message: { id: 'u1', text: 'hi' } }));
    expect((await repo.get(CONV))?.messages.filter((m) => m.role === 'user')).toHaveLength(1);
  });
});
