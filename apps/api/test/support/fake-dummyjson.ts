import type { Product } from '../../src/catalog/domain/product.js';

/** Test fixture (used only by specs): `count` valid Products spread over a few categories, prices 1…500. */
export const generateCatalog = (
  count: number,
  categories: Product['category'][] = ['smartphones', 'laptops', 'tops'],
): Product[] =>
  Array.from({ length: count }, (_, i) => {
    const id = i + 1;
    const category = categories[i % categories.length]!;
    return {
      id,
      title: `${category === 'smartphones' ? 'Phone' : category === 'laptops' ? 'Laptop' : 'Shirt'} ${id}`,
      description: id % 10 === 0 ? 'waterproof' : '',
      category,
      price: ((id * 37) % 500) + 1,
      discountPercentage: id % 30,
      rating: ((id * 13) % 50) / 10,
      stock: id % 17 === 0 ? 0 : 5,
      thumbnail: `https://img/${id}.png`,
      images: [],
      tags: [],
    };
  });

const page = (items: readonly Product[], url: URL) => {
  const limit = Number(url.searchParams.get('limit') ?? 30);
  const skip = Number(url.searchParams.get('skip') ?? 0);
  return {
    products: limit === 0 ? items : items.slice(skip, skip + limit),
    total: items.length,
    skip,
    limit,
  };
};

/**
 * A fake DummyJSON over `catalog` (the endpoints ADR 0005 reads): paged category lists, substring search on
 * title/description, `/products` with sortBy/order, `/products/{id}`. Every request is recorded.
 */
export const fakeDummyJson = (catalog: readonly Product[]) => {
  const requests: string[] = [];
  const fetchFn: typeof fetch = async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requests.push(url.pathname + url.search);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    const [, , kind, arg] = url.pathname.split('/'); // "", "products", kind, arg
    if (kind === 'category' && arg)
      return json(
        page(
          catalog.filter((p) => p.category === arg),
          url,
        ),
      );
    if (kind === 'search') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const hits = catalog.filter((p) => `${p.title} ${p.description}`.toLowerCase().includes(q));
      return json(page(hits, url));
    }
    if (kind && /^\d+$/.test(kind)) {
      const found = catalog.find((p) => p.id === Number(kind));
      return found ? json(found) : json({ message: 'not found' }, 404);
    }
    const sortBy = url.searchParams.get('sortBy') as keyof Product | null;
    const sign = url.searchParams.get('order') === 'desc' ? -1 : 1;
    const sorted = sortBy
      ? catalog.toSorted((a, b) => sign * ((a[sortBy] as number) - (b[sortBy] as number)) || a.id - b.id)
      : catalog;
    return json(page(sorted, url));
  };
  return { fetchFn, requests };
};
