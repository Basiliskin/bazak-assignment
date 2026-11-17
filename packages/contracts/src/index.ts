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
export const ProductCardSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  discountPercentage: z.number(),
  rating: z.number(),
  thumbnail: z.string(),
  category: CategorySlugSchema,
});
export type ProductCard = z.infer<typeof ProductCardSchema>;

/** Full Product for the details popup (GET /api/products/:id); also the Catalog's Product shape. */
export const ProductDetailsSchema = ProductCardSchema.extend({
  brand: z.string().optional(), // 92 of 194 Products have none
  stock: z.number().int(),
  images: z.array(z.string()),
  tags: z.array(z.string()),
});
export type ProductDetails = z.infer<typeof ProductDetailsSchema>;

/** Query of GET /api/products (shop page grid): top-rated in-stock Product Cards. */
export const ProductListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(10),
});
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;

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
export const ProductGroupSchema = z.object({
  label: z.string(),
  query: SearchProductsInputSchema,
  products: z.array(ProductCardSchema), // ≤ 4 (R7)
  total: z.number().int().nonnegative(), // total matches; total - offset - products.length = "N more"
});
export type ProductGroup = z.infer<typeof ProductGroupSchema>;

export const ReportOffCatalogInputSchema = z.object({
  request: z.string().min(1).describe('What the Shopper asked for that the shop does not sell'),
});
export type ReportOffCatalogInput = z.infer<typeof ReportOffCatalogInputSchema>;

export const TOOL_NAMES = {
  searchProducts: 'search_products',
  reportOffCatalog: 'report_off_catalog',
} as const;

// ── Conversations ─────────────────────────────────────────────────────────────

export const MessageRoleSchema = z.enum(['user', 'assistant']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

/** Message as stored and returned by the API (validated on read from storage — AC5.2). */
export const MessageSchema = z.object({
  id: z.string().min(1),
  role: MessageRoleSchema,
  text: z.string(),
  productGroups: z.array(ProductGroupSchema), // always [] for user Messages
  offCatalog: z.array(ReportOffCatalogInputSchema),
  createdAt: z.iso.datetime(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ConversationSummarySchema = z.object({
  id: z.string(),
  title: z.string(), // first Shopper message, ≤ 40 chars
  updatedAt: z.iso.datetime(),
});
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

export const ConversationSchema = ConversationSummarySchema.extend({ messages: z.array(MessageSchema) });
export type Conversation = z.infer<typeof ConversationSchema>;

// ── HTTP ─────────────────────────────────────────────────────────────────────

/** POST /api/chat — client sends only the new message; server owns history. */
export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.object({ id: z.string().min(1), text: z.string().trim().min(1).max(2000) }),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
