import type { Message, ProductGroup } from '@app/contracts';

export const phoneGroup: ProductGroup = {
  kind: 'match',
  label: 'Phones under $500',
  query: {
    label: 'Phones under $500',
    category: 'smartphones',
    keywords: [],
    semanticQuery: 'smartphones and mobile phones',
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

/** A Recommended Group for phoneGroup's Search Intent (ADR 0004). */
export const similarGroup: ProductGroup = {
  kind: 'recommended',
  label: 'You might also like · Phones under $500',
  query: phoneGroup.query,
  products: [
    {
      id: 9,
      title: 'Phone Case',
      description: 'Protective case',
      price: 15,
      discountPercentage: 0,
      rating: 4.2,
      thumbnail: 'https://cdn.example/9.png',
      category: 'mobile-accessories',
    },
  ],
  total: 1,
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
