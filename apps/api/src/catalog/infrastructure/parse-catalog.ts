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
