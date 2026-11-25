import {
  CATEGORY_SLUGS,
  type ChatRequest,
  type Message,
  type ProductGroup,
  type ReportOffCatalogInput,
} from '@app/contracts';
import type { CatalogService } from '../../catalog/application/catalog.service.js';
import type { ConversationRepository } from '../../conversations/application/conversation.repository.js';
import { appendMessage, createConversation } from '../../conversations/domain/conversation.js';
import { compactHistory } from '../domain/compact-history.js';
import { resolvePagedQuery } from '../domain/resolve-paged-query.js';
import { buildSystemPrompt, type SearchScope } from '../domain/system-prompt.js';
import { toAssistantMessage } from '../domain/to-assistant-message.js';
import { shouldRecommend, toProductGroup, toRecommendedGroup } from '../domain/to-product-group.js';
import type { ChatStream, LlmPort, TurnTools } from './llm.port.js';

/** Time and ids are injected so every step stays deterministic in tests. */
export interface TurnEnvironment {
  now(): string;
  newId(): string;
}

/**
 * Collects tool results of one turn. Groups keep tool-call order even when parallel calls finish out of order;
 * a Recommended Group follows its match group (ADR 0004). A "Show more" page reuses the earlier group's
 * search (D31), so paging doesn't depend on the model.
 */
function createTurnTools(catalog: CatalogService, earlier: readonly Message[]) {
  const slots: ProductGroup[][] = [];
  const offCatalog: ReportOffCatalogInput[] = [];
  const tools: TurnTools = {
    async searchProducts(query) {
      const slot = slots.push([]) - 1;
      const resolved = resolvePagedQuery(query, earlier);
      const result = await catalog.search(resolved, {
        semanticQuery: resolved.semanticQuery,
        recommend: shouldRecommend(resolved),
      });
      const output = {
        match: toProductGroup(resolved, result),
        recommended: toRecommendedGroup(resolved, result.recommended),
        coverage: result.coverage, // how much was checked: the model words a Partial Result from it (ADR 0005)
      };
      slots[slot] = output.recommended ? [output.match, output.recommended] : [output.match];
      return output;
    },
    async reportOffCatalog(input) {
      offCatalog.push(input);
      return { acknowledged: true };
    },
  };
  const results = () => ({ productGroups: slots.flat(), offCatalog: [...offCatalog] });
  return { tools, results };
}

/** One chat turn: load → append user Message → stream the LLM reply → append assistant Message. */
export class ChatTurnService {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly catalog: CatalogService,
    private readonly llm: LlmPort,
    private readonly env: TurnEnvironment,
    scope: SearchScope = 'memory',
  ) {
    this.system = buildSystemPrompt(CATEGORY_SLUGS, scope);
  }

  private readonly system: string;

  async run({ conversationId, message }: ChatRequest): Promise<ChatStream> {
    const now = this.env.now();
    const userMessage: Message = {
      id: message.id,
      role: 'user',
      text: message.text,
      productGroups: [],
      offCatalog: [],
      createdAt: now,
    };
    const existing = await this.conversations.get(conversationId);
    const conversation = appendMessage(
      existing ?? createConversation(conversationId, message.text, now),
      userMessage,
    );
    await this.conversations.save(conversation);

    const turn = createTurnTools(this.catalog, conversation.messages);
    return this.llm.streamTurn({
      system: this.system,
      history: compactHistory(conversation.messages),
      tools: turn.tools,
      onFinish: async ({ text }) => {
        const reply = toAssistantMessage(
          { text, ...turn.results() },
          { id: this.env.newId(), createdAt: this.env.now() },
        );
        const latest = (await this.conversations.get(conversationId)) ?? conversation;
        await this.conversations.save(appendMessage(latest, reply));
      },
    });
  }
}
