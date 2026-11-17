import type { ProductDetails } from '@app/contracts';
import { discountBadge, formatPrice, originalPrice, stockLabel, type StockTone } from '../lib/product-view';
import { Modal } from './Modal';
import { Rating } from './ProductCard';
import { ProductImage } from './ProductImage';

export type DetailsState =
  | { status: 'loading' }
  | { status: 'error'; onRetry: () => void }
  | { status: 'ready'; product: ProductDetails };

interface Props {
  state: DetailsState;
  imageIndex: number;
  onSelectImage: (index: number) => void;
  onClose: () => void;
}

const TITLE_ID = 'product-details-title';
const STOCK_TONE: Record<StockTone, string> = {
  in: 'text-emerald-600',
  low: 'text-amber-600',
  out: 'text-rose-600',
};

/** Details popup (AC4.3): gallery, brand, title, price, rating, stock, description, tags. Closes on ✕ / Esc / backdrop. */
export function ProductDetailsDialog({ state, imageIndex, onSelectImage, onClose }: Props) {
  return (
    <Modal labelledBy={TITLE_ID} onClose={onClose}>
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 px-3 pt-2 backdrop-blur">
        <span className="w-9" />
        <span className="h-1.5 w-10 rounded-full bg-zinc-300 sm:invisible" aria-hidden="true" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          autoFocus
          className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          ✕
        </button>
      </div>
      {state.status === 'ready' ? (
        <Details product={state.product} imageIndex={imageIndex} onSelectImage={onSelectImage} />
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-12 text-sm text-zinc-500">
          <h2 id={TITLE_ID} className="sr-only">
            Product details
          </h2>
          {state.status === 'loading' ? (
            <p role="status">Loading product…</p>
          ) : (
            <>
              <p role="alert">Could not load this product.</p>
              <button
                type="button"
                onClick={state.onRetry}
                className="rounded-xl border border-zinc-200 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Try again
              </button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

function Details({
  product: p,
  imageIndex,
  onSelectImage,
}: {
  product: ProductDetails;
  imageIndex: number;
  onSelectImage: (index: number) => void;
}) {
  const image = p.images[imageIndex] ?? p.thumbnail;
  const badge = discountBadge(p.discountPercentage);
  const stock = stockLabel(p.stock);
  return (
    <div className="grid gap-6 px-5 pt-1 pb-6 sm:grid-cols-2 sm:px-6">
      <div>
        <ProductImage
          key={image}
          src={image}
          alt={p.title}
          className="aspect-square overflow-hidden rounded-2xl"
        />
        {p.images.length > 1 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {p.images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => onSelectImage(i)}
                aria-label={`Image ${i + 1}`}
                aria-pressed={i === imageIndex}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-zinc-100 ${
                  i === imageIndex ? 'border-indigo-500' : 'border-transparent'
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-contain mix-blend-multiply" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">{p.brand ?? p.category}</p>
          <h2 id={TITLE_ID} className="text-lg leading-snug font-semibold text-zinc-900">
            {p.title}
          </h2>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-zinc-900">{formatPrice(p.price)}</span>
          {badge && (
            <>
              <span className="text-sm text-zinc-400 line-through">
                {formatPrice(originalPrice(p.price, p.discountPercentage))}
              </span>
              <span className="text-sm font-semibold text-rose-600">{badge}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Rating value={p.rating} />
          <span className="text-zinc-300" aria-hidden="true">
            •
          </span>
          <span className={STOCK_TONE[stock.tone]}>{stock.text}</span>
        </div>
        <p className="text-sm leading-relaxed text-zinc-600">{p.description}</p>
        {p.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {p.tags.map((t) => (
              <li key={t} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600">
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
