import type { ProductCard as ProductCardData } from '@app/contracts';
import { discountBadge, formatPrice } from '../lib/product-view';
import { ProductImage } from './ProductImage';

export type CardVariant = 'grid' | 'compact';

interface Props {
  product: ProductCardData;
  /** 'grid' fills its cell; 'compact' has a fixed width for carousels. */
  variant?: CardVariant;
  onOpen: (id: number) => void;
}

/** One Product (AC4.1): image, discount badge, title, 2-line description, price, rating. */
export function ProductCard({ product: p, variant = 'grid', onOpen }: Props) {
  const badge = discountBadge(p.discountPercentage);
  return (
    <button
      type="button"
      onClick={() => onOpen(p.id)}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
        variant === 'compact' ? 'w-44 shrink-0 snap-start sm:w-48' : 'w-full'
      }`}
    >
      <ProductImage key={p.thumbnail} src={p.thumbnail} alt={p.title} className="aspect-square">
        {badge && (
          <span className="absolute top-2 left-2 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
            {badge}
          </span>
        )}
      </ProductImage>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h4 className="line-clamp-1 text-sm font-medium text-zinc-900">{p.title}</h4>
        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">{p.description}</p>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="text-sm font-semibold text-zinc-900">{formatPrice(p.price)}</span>
          <Rating value={p.rating} />
        </div>
      </div>
    </button>
  );
}

export function Rating({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600"
      aria-label={`Rated ${value.toFixed(1)} out of 5`}
    >
      <span aria-hidden="true">★ {value.toFixed(1)}</span>
    </span>
  );
}
