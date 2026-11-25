import type { INestApplication } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductSearchPort } from '../src/catalog/application/product-search.port.js';
import { ApiOnlyProductSearch } from '../src/catalog/infrastructure/api-only.product-search.js';
import { InMemoryProductSearch } from '../src/catalog/infrastructure/in-memory.product-search.js';
import { createTestApp } from './support/create-test-app.js';

describe('CATALOG_MODE wiring (ADR 0005)', () => {
  let app: INestApplication | undefined;
  afterEach(async () => app?.close());

  it('memory (default): searches the downloaded Catalog and embeds it for recommendations', async () => {
    const embed = vi.fn(async (texts: readonly string[]) => texts.map(() => [1]));
    app = await createTestApp({ embedding: { embed } });
    expect(app.get(ProductSearchPort)).toBeInstanceOf(InMemoryProductSearch);
    await vi.waitFor(() => expect(embed).toHaveBeenCalled());
  });

  it('api: searches DummyJSON per request and never loads the embedding model', async () => {
    const embed = vi.fn(async (texts: readonly string[]) => texts.map(() => [1]));
    app = await createTestApp({ embedding: { embed }, config: { catalogMode: 'api' } });
    expect(app.get(ProductSearchPort)).toBeInstanceOf(ApiOnlyProductSearch);
    await new Promise((r) => setTimeout(r, 20));
    expect(embed).not.toHaveBeenCalled();
  });
});
