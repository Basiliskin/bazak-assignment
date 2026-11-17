import { CategorySlugSchema } from '@app/contracts';
import { z } from 'zod';
import type { Product } from '../domain/product.js';

/** DummyJSON's product shape — only the fields we use (extra fields are stripped). */
const DummyJsonProductSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string(),
  category: CategorySlugSchema,
  price: z.number().nonnegative(),
  discountPercentage: z.number(),
  rating: z.number(),
  stock: z.number().int(),
  tags: z.array(z.string()),
  brand: z.string().optional(),
  images: z.array(z.string()),
  thumbnail: z.string(),
});

const DummyJsonListSchema = z.object({ products: z.array(z.unknown()) });

/** Pure: DummyJSON `/products` body → valid Products. Bad items are skipped, not fatal; a bad body throws. */
export function parseCatalogResponse(body: unknown): { products: Product[]; skipped: number } {
  const items = DummyJsonListSchema.parse(body).products;
  const products = items.flatMap((item) => {
    const r = DummyJsonProductSchema.safeParse(item);
    return r.success ? [r.data] : [];
  });
  return { products, skipped: items.length - products.length };
}
