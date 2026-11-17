import type { Message, ProductGroup } from '@app/contracts';

export const group = (over: Partial<ProductGroup> = {}): ProductGroup => ({
  label: 'Phones under $500',
  query: {
    label: 'Phones under $500',
    category: 'smartphones',
    keywords: [],
    minPrice: null,
    maxPrice: 500,
    sortBy: 'relevance',
    offset: 0,
    confidence: 'clear',
    assumption: null,
  },
  products: [
    {
      id: 1,
      title: 'iPhone 9',
      description: 'A phone',
      price: 499,
      discountPercentage: 10,
      rating: 4.5,
      thumbnail: 'https://img/1.png',
      category: 'smartphones',
    },
  ],
  total: 7,
  ...over,
});

export const message = (over: Partial<Message> & Pick<Message, 'id'>): Message => ({
  role: 'user',
  text: 'hello',
  productGroups: [],
  offCatalog: [],
  createdAt: '2026-11-17T10:00:00.000Z',
  ...over,
});
