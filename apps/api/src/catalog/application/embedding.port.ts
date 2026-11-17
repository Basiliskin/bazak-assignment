/** Port: turns texts into vectors (one per text, same order). POC adapter: a local model (ADR 0004). */
export abstract class EmbeddingPort {
  abstract embed(texts: readonly string[]): Promise<number[][]>;
}
