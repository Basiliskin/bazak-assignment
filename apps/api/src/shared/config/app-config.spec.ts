import { describe, expect, it } from 'vitest';
import { parseConfig } from './app-config.js';

const ROOT = '/repo';

describe('parseConfig', () => {
  it('applies defaults when only the key is given', () => {
    const r = parseConfig({ OPENAI_KEY: 'test-key' }, ROOT);
    expect(r).toEqual({
      ok: true,
      config: {
        openAiKey: 'test-key',
        model: 'gpt-6-luna',
        port: 3001,
        databasePath: '/repo/data/app.db',
        dummyJsonUrl: 'https://dummyjson.com',
        modelCacheDir: '/repo/data/models',
      },
    });
  });

  it('keeps absolute and in-memory database paths as given', () => {
    const db = (p: string) => {
      const r = parseConfig({ OPENAI_KEY: 'k', DATABASE_PATH: p }, ROOT);
      return r.ok ? r.config.databasePath : null;
    };
    expect(db('/var/app.db')).toBe('/var/app.db');
    expect(db(':memory:')).toBe(':memory:');
  });

  it('reports a missing key without crashing', () => {
    const r = parseConfig({}, ROOT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/OPENAI_KEY/);
  });

  it('rejects any model other than gpt-6-luna', () => {
    expect(parseConfig({ OPENAI_KEY: 'k', OPENAI_MODEL: 'gpt-4o' }, ROOT).ok).toBe(false);
  });

  it('never echoes the key in errors', () => {
    const r = parseConfig({ OPENAI_KEY: 'sk-secret-value', PORT: 'abc' }, ROOT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).not.toContain('sk-secret-value');
  });
});
