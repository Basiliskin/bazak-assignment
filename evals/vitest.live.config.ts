import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Live eval: real model + real catalog. SWC so the Nest app's decorator metadata works (same as apps/api).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['run-evals.eval.ts'],
    environment: 'node',
    testTimeout: 120_000,
    hookTimeout: 60_000,
    reporters: ['verbose'],
  },
});
