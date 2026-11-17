import type { EmbeddingPort } from '../../src/catalog/application/embedding.port.js';

/** Default vocabulary: one dimension per word, 1 when the text contains it. */
const VOCAB = ['beach', 'sun', 'summer', 'phone', 'lipstick', 'watch', 'bag', 'travel'];

/** Test fake for EmbeddingPort: deterministic word-presence vectors, no model, no network. */
export const keywordEmbedding = (vocab: readonly string[] = VOCAB): EmbeddingPort => ({
  embed: async (texts) => texts.map((t) => vocab.map((w) => (t.toLowerCase().includes(w) ? 1 : 0))),
});
