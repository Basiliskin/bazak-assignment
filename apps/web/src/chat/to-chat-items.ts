import {
  ProductGroupSchema,
  ReportOffCatalogInputSchema,
  type ProductGroup,
  type ReportOffCatalogInput,
} from '@app/contracts';
import type { ChatItem, ShopUIMessage } from './chat-types';

/**
 * `useChat` messages → view model (pure). Tool outputs are validated against the contracts —
 * only a real `search_products` result can put a Product on screen (R1).
 */
export function toChatItems(messages: readonly ShopUIMessage[]): ChatItem[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      const productGroups: ProductGroup[] = [];
      const offCatalog: ReportOffCatalogInput[] = [];
      const searching: string[] = [];
      const texts: string[] = [];

      for (const part of m.parts) {
        if (part.type === 'text') {
          if (part.text.trim()) texts.push(part.text.trim());
        } else if (part.type === 'tool-search_products') {
          if (part.state === 'output-available') {
            const group = ProductGroupSchema.safeParse(part.output);
            if (group.success) productGroups.push(group.data);
          } else if (part.state === 'input-streaming' || part.state === 'input-available') {
            searching.push(part.input?.label || 'products');
          }
        } else if (part.type === 'tool-report_off_catalog' && part.state === 'output-available') {
          const input = ReportOffCatalogInputSchema.safeParse(part.input);
          if (input.success) offCatalog.push(input.data);
        }
      }

      return {
        id: m.id,
        role: m.role as ChatItem['role'],
        text: texts.join('\n\n'),
        productGroups,
        offCatalog,
        searching,
      };
    });
}
