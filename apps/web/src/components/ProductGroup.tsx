import type { ProductCard as ProductCardData, ProductGroup as ProductGroupData } from '@app/contracts';
import { groupHeader } from '../lib/product-view';
import { ProductCard } from './ProductCard';

export type GroupLayout = 'grid' | 'carousel';

interface Props {
  group: ProductGroupData;
  /** 'grid' on the full page (A), 'carousel' in the narrow widget window (D). */
  layout?: GroupLayout;
  onOpenProduct: (id: number) => void;
  /** Omit to hide the button; `showMoreDisabled` greys it out while a reply streams. */
  onShowMore?: () => void;
  showMoreDisabled?: boolean;
}

/** Card containers per layout — a new layout is one more entry. */
const LAYOUTS: Record<
  GroupLayout,
  (cards: readonly ProductCardData[], onOpen: (id: number) => void) => React.ReactNode
> = {
  grid: (cards, onOpen) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((p) => (
        <ProductCard key={p.id} product={p} onOpen={onOpen} />
      ))}
    </div>
  ),
  carousel: (cards, onOpen) => (
    <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
      {cards.map((p) => (
        <ProductCard key={p.id} product={p} variant="compact" onOpen={onOpen} />
      ))}
    </div>
  ),
};

/**
 * One Search Intent's results (AC4.2): label, "1–4 of N", Assumption chip, cards, "N more match · Show more".
 * A Recommended Group (ADR 0004) gets a ✨ "You might also like" header and no paging.
 */
export function ProductGroup({
  group,
  layout = 'grid',
  onOpenProduct,
  onShowMore,
  showMoreDisabled = false,
}: Props) {
  const header = groupHeader(group);
  return (
    <section aria-label={group.label} className="animate-rise">
      <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <h3 className={`text-sm font-semibold ${header.recommended ? 'text-violet-700' : 'text-zinc-900'}`}>
          {header.recommended && <span aria-hidden="true">✨ </span>}
          {header.title}
        </h3>
        <span className="text-xs text-zinc-500">{header.subtitle}</span>
        {header.assumption && <AssumptionChip text={header.assumption} />}
      </div>
      {group.products.length > 0 ? (
        LAYOUTS[layout](group.products, onOpenProduct)
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
          Nothing matched — try a broader search.
        </p>
      )}
      {header.remaining > 0 && (
        <div className="mt-2.5 flex items-center gap-3 text-xs text-zinc-500">
          <span>{header.remaining} more match</span>
          {onShowMore && (
            <button
              type="button"
              onClick={onShowMore}
              disabled={showMoreDisabled}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 font-medium text-zinc-700 transition hover:border-indigo-300 hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              Show more
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function AssumptionChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 ring-inset">
      <span aria-hidden="true">💡</span> Assumed: {text}
    </span>
  );
}
