import type { Message, ProductGroup } from '@app/contracts';

export const phoneGroup: ProductGroup = {
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
      description: 'An apple mobile',
      price: 499,
      discountPercentage: 10,
      rating: 4.5,
      thumbnail: 'https://cdn.example/1.png',
      category: 'smartphones',
    },
  ],
  total: 7,
};

export const userMessage = (id: string, text: string): Message => ({
  id,
  role: 'user',
  text,
  productGroups: [],
  offCatalog: [],
  createdAt: '2026-11-17T10:00:00.000Z',
});

export const assistantMessage = (id: string, text: string, extra: Partial<Message> = {}): Message => ({
  id,
  role: 'assistant',
  text,
  productGroups: [],
  offCatalog: [],
  createdAt: '2026-11-17T10:00:05.000Z',
  ...extra,
});
