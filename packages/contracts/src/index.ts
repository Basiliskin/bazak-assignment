// Shared contracts between apps/api and apps/web — the single source of truth (DRY).
// Zod schemas give runtime validation (API body, LLM tool input) and the static types via z.infer.
import { z } from 'zod';

// ── Catalog ──────────────────────────────────────────────────────────────────

/** The 24 DummyJSON category slugs (verified live 2026-11-17 via /products/category-list). */
export const CATEGORY_SLUGS = [
  'beauty',
  'fragrances',
  'furniture',
  'groceries',
  'home-decoration',
  'kitchen-accessories',
  'laptops',
  'mens-shirts',
  'mens-shoes',
  'mens-watches',
  'mobile-accessories',
  'motorcycle',
  'skin-care',
  'smartphones',
  'sports-accessories',
  'sunglasses',
  'tablets',
  'tops',
  'vehicle',
  'womens-bags',
  'womens-dresses',
  'womens-jewellery',
  'womens-shoes',
  'womens-watches',
] as const;
export const CategorySlugSchema = z.enum(CATEGORY_SLUGS);
export type CategorySlug = z.infer<typeof CategorySlugSchema>;

export const SORT_OPTIONS = ['relevance', 'price-asc', 'price-desc', 'rating-desc', 'discount-desc'] as const;

/** Product Card: what one Product looks like inside an Assistant Message. */
export interface ProductCard {
  id: number;
  title: string;
  description: string;
  price: number;
  discountPercentage: number;
  rating: number;
  thumbnail: string;
  category: CategorySlug;
}

/** Full Product for the details popup (GET /api/products/:id). */
export interface ProductDetails extends ProductCard {
  brand?: string;
  stock: number;
  images: string[];
  tags: string[];
}

// ── Assistant tools (the LLM's structured query) ───────────────────────────────

export const SearchProductsInputSchema = z
  .object({
    label: z.string().min(1).describe('Short heading for this Product Group, e.g. "Phones under $500"'),
    category: CategorySlugSchema.nullable().describe('Exact category slug, or null to search all'),
    keywords: z
      .array(z.string().min(1))
      .max(5)
      .describe('Single words matched against title, description, brand, tags'),
    minPrice: z.number().nonnegative().nullable(),
    maxPrice: z.number().positive().nullable(),
    sortBy: z.enum(SORT_OPTIONS),
    offset: z.number().int().nonnegative().describe('For "show more": number of Products already shown'),
    confidence: z.enum(['clear', 'guessed']),
    assumption: z
      .string()
      .nullable()
      .describe('Required when confidence is "guessed": what the vague request was taken to mean'),
  })
  .refine((q) => q.confidence === 'clear' || !!q.assumption, {
    message: 'assumption is required when confidence is "guessed"',
    path: ['assumption'],
  });
export type SearchProductsInput = z.infer<typeof SearchProductsInputSchema>;

/** Product Group: the result of one search_products call = one Search Intent. */
export interface ProductGroup {
  label: string;
  query: SearchProductsInput;
  products: ProductCard[]; // ≤ 4 (R7)
  total: number; // total matches; total - offset - products.length = "N more"
}

export const ReportOffCatalogInputSchema = z.object({
  request: z.string().min(1).describe('What the Shopper asked for that the shop does not sell'),
});
export type ReportOffCatalogInput = z.infer<typeof ReportOffCatalogInputSchema>;

export const TOOL_NAMES = {
  searchProducts: 'search_products',
  reportOffCatalog: 'report_off_catalog',
} as const;

// ── Conversations ─────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  productGroups: ProductGroup[]; // always [] for user Messages
  offCatalog: ReportOffCatalogInput[];
  createdAt: string; // ISO
}

export interface ConversationSummary {
  id: string;
  title: string; // first Shopper message, ~40 chars
  updatedAt: string;
}

export interface Conversation extends ConversationSummary {
  messages: Message[];
}

// ── HTTP ─────────────────────────────────────────────────────────────────────

/** POST /api/chat — client sends only the new message; server owns history. */
export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.object({ id: z.string().min(1), text: z.string().trim().min(1).max(2000) }),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
