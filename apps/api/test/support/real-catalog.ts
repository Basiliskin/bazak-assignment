import { readFileSync } from 'node:fs';
import type { Product } from '../../src/catalog/domain/product.js';
import { parseCatalogResponse } from '../../src/catalog/infrastructure/parse-catalog.js';

/** Test fixture (used only by specs): the real DummyJSON Catalog, recorded 2026-11-25 (194 Products). */
export const REAL_CATALOG: readonly Product[] = parseCatalogResponse(
  JSON.parse(readFileSync(new URL('./dummyjson-catalog.json', import.meta.url), 'utf8')),
).products;
