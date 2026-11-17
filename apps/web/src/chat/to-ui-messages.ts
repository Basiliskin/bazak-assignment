import type { Message } from '@app/contracts';
import type { ShopUIMessage } from './chat-types';

type Part = ShopUIMessage['parts'][number];

/**
 * Stored Messages → `useChat` messages (pure). Product Groups and off-catalog notes become
 * completed tool parts, so stored and live replies go through the same `toChatItems` path (D26).
 */
export function toUIMessages(messages: readonly Message[]): ShopUIMessage[] {
  return messages.map((m) => {
    const tools: Part[] = [
      ...m.offCatalog.map((input, i): Part => ({
        type: 'tool-report_off_catalog',
        toolCallId: `${m.id}-off-${i}`,
        state: 'output-available',
        input,
        output: { acknowledged: true },
      })),
      ...m.productGroups.map((group, i): Part => ({
        type: 'tool-search_products',
        toolCallId: `${m.id}-search-${i}`,
        state: 'output-available',
        input: group.query,
        output: group,
      })),
    ];
    const text: Part[] = m.text ? [{ type: 'text', text: m.text, state: 'done' }] : [];
    return { id: m.id, role: m.role, parts: [...tools, ...text] };
  });
}
