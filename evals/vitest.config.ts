import { defineConfig } from 'vitest/config';

// Offline: only the pure checks and report rendering. The live run has its own config.
export default defineConfig({
  test: { include: ['*.spec.ts'], environment: 'node' },
});
