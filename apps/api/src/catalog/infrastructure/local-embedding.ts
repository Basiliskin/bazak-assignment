import { EmbeddingPort } from '../application/embedding.port.js';

/** Sentence-embedding model run in-process (ADR 0004, D40): 24 MB, 384 dimensions, CPU. */
export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

/** The slice of a transformers.js feature-extraction pipeline this adapter uses. */
type Extractor = (
  texts: string[],
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

/**
 * EmbeddingPort on `@huggingface/transformers`. The library is imported on first use, so tests and code
 * paths that never embed don't load onnxruntime. The model is downloaded once into `cacheDir`.
 * A failed load is not cached: the next call tries again.
 */
export class LocalEmbedding extends EmbeddingPort {
  private extractor: Promise<Extractor> | null = null;

  constructor(private readonly cacheDir: string) {
    super();
  }

  async embed(texts: readonly string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    this.extractor ??= this.load().catch((e: unknown) => {
      this.extractor = null;
      throw e;
    });
    const output = await (await this.extractor)([...texts], { pooling: 'mean', normalize: true });
    return output.tolist();
  }

  private async load(): Promise<Extractor> {
    const { pipeline } = await import('@huggingface/transformers');
    const extractor = await pipeline('feature-extraction', EMBEDDING_MODEL, {
      dtype: 'q8',
      cache_dir: this.cacheDir,
    });
    return extractor as unknown as Extractor;
  }
}
