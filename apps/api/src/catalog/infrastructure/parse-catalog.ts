import { ProductDetailsSchema } from '@app/contracts';
import { z } from 'zod';
import type { Product } from '../domain/product.js';

/** DummyJSON's product shape = our ProductDetails (extra fields are stripped); prices can't be negative. */
const DummyJsonProductSchema = ProductDetailsSchema.extend({ price: z.number().nonnegative() });

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

const PageMetaSchema = z.object({ total: z.number().int().nonnegative() });

/** Pure: one page of a paged DummyJSON list → valid Products plus the list's `total` (how many exist in all). */
export function parseCatalogPage(body: unknown): { products: Product[]; skipped: number; total: number } {
  return { ...parseCatalogResponse(body), total: PageMetaSchema.parse(body).total };
}

/** Pure: DummyJSON `/products/{id}` body → a Product. Throws when it isn't a valid Product. */
export const parseProduct = (body: unknown): Product => DummyJsonProductSchema.parse(body);
