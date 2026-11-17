import type { ProductGroup as ProductGroupData } from '@app/contracts';
import type { ChatItem } from '../chat/chat-types';
import { OffCatalogNotice, RichText, ToolStatus, TypingDots } from './chat-parts';
import { ProductGroup, type GroupLayout } from './ProductGroup';

interface Props {
  item: ChatItem;
  /** This is the reply being streamed right now. */
  live?: boolean;
  onOpenProduct: (id: number) => void;
  onShowMore: (group: ProductGroupData) => void;
  /** A reply is streaming: "Show more" waits. */
  busy?: boolean;
  /** 'grid' on the full page, 'carousel' in the widget window. */
  layout?: GroupLayout;
}

/** One Message. User: right-aligned indigo bubble. Assistant: ✦ avatar, tool status, notices, groups, text. */
export function MessageBubble({
  item,
  live = false,
  onOpenProduct,
  onShowMore,
  busy = false,
  layout = 'grid',
}: Props) {
  if (item.role === 'user') {
    return (
      <div className="animate-rise flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-sm whitespace-pre-line text-white shadow-sm">
          {item.text}
        </p>
      </div>
    );
  }

  const empty = !item.text && item.productGroups.length === 0 && item.offCatalog.length === 0;
  return (
    <div className="animate-rise flex gap-3">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 space-y-3">
        {live && empty && item.searching.length === 0 && <TypingDots />}
        {item.searching.map((label, i) => (
          <ToolStatus key={i} label={label} />
        ))}
        {item.offCatalog.map((o, i) => (
          <OffCatalogNotice key={i} request={o.request} />
        ))}
        {item.productGroups.map((g, i) => (
          <ProductGroup
            key={i}
            group={g}
            layout={layout}
            onOpenProduct={onOpenProduct}
            onShowMore={() => onShowMore(g)}
            showMoreDisabled={busy}
          />
        ))}
        {item.text && <RichText text={item.text} streaming={live} />}
      </div>
    </div>
  );
}

export function AssistantAvatar() {
  return (
    <div
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm text-white shadow-sm"
      aria-hidden="true"
    >
      ✦
    </div>
  );
}
