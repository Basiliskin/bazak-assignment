// Pure display rules for Products and Product Groups — the components only render what these return.

/** Smallest discount worth a badge; DummyJSON has many 0.5–4% "discounts" that are just noise. */
const MIN_BADGE_DISCOUNT = 5;
const LOW_STOCK = 10;

interface GroupPage {
  query: { offset: number };
  products: readonly unknown[];
  total: number;
}

/** "1–4 of 16" and how many matches are not shown yet ("N more match", R7). */
export function groupRange(group: GroupPage): { label: string; remaining: number } {
  const { offset } = group.query;
  const shown = group.products.length;
  if (group.total === 0) return { label: 'no matches', remaining: 0 };
  if (shown === 0) return { label: 'no more matches', remaining: 0 };
  return {
    label: `${offset + 1}–${offset + shown} of ${group.total}`,
    remaining: Math.max(0, group.total - offset - shown),
  };
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const formatPrice = (price: number): string => usd.format(price);

/** "−13%" when the discount is worth showing, else null. */
export const discountBadge = (discountPercentage: number): string | null =>
  discountPercentage >= MIN_BADGE_DISCOUNT ? `−${Math.round(discountPercentage)}%` : null;

/** Price before the discount (DummyJSON `price` is the price after it). */
export const originalPrice = (price: number, discountPercentage: number): number =>
  discountPercentage > 0 ? price / (1 - discountPercentage / 100) : price;

export type StockTone = 'in' | 'low' | 'out';

export function stockLabel(stock: number): { text: string; tone: StockTone } {
  if (stock <= 0) return { text: 'Out of stock', tone: 'out' };
  if (stock <= LOW_STOCK) return { text: `Only ${stock} left`, tone: 'low' };
  return { text: 'In stock', tone: 'in' };
}
