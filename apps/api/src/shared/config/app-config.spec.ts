import { describe, expect, it } from 'vitest';
import { parseConfig } from './app-config.js';

const ROOT = '/repo';

describe('parseConfig', () => {
  it('applies defaults when only the key is given', () => {
    const r = parseConfig({ OPENAI_KEY: 'test-key' }, ROOT);
    expect(r).toEqual({
      ok: true,
      config: {
        llmProvider: 'openai',
        openAiKey: 'test-key',
        openAiBaseUrl: null,
        anthropicBaseUrl: null,
        model: 'gpt-6-luna',
        port: 3001,
        databasePath: '/repo/data/app.db',
        dummyJsonUrl: 'https://dummyjson.com',
        modelCacheDir: '/repo/data/models',
        catalogMode: 'memory',
      },
    });
  });

  it('reads CATALOG_MODE and rejects unknown modes (ADR 0005)', () => {
    const api = parseConfig({ OPENAI_KEY: 'k', CATALOG_MODE: 'api' }, ROOT);
    expect(api.ok && api.config.catalogMode).toBe('api');
    expect(parseConfig({ OPENAI_KEY: 'k', CATALOG_MODE: 'db' }, ROOT).ok).toBe(false);
  });

  it('anthropic provider: no OpenAI key needed, runs ANTHROPIC_MODEL (default claude-opus-5-5)', () => {
    const r = parseConfig({ LLM_PROVIDER: 'anthropic' }, ROOT);
    expect(r.ok && [r.config.llmProvider, r.config.model, r.config.openAiKey]).toEqual([
      'anthropic',
      'claude-opus-5-5',
      null,
    ]);
    const custom = parseConfig({ LLM_PROVIDER: 'anthropic', ANTHROPIC_MODEL: 'claude-sonnet-5-5' }, ROOT);
    expect(custom.ok && custom.config.model).toBe('claude-sonnet-5-5');
  });

  it('openai provider still needs the key and still allows only gpt-6-luna', () => {
    expect(parseConfig({}, ROOT)).toMatchObject({
      ok: false,
      errors: [expect.stringContaining('OPENAI_KEY')],
    });
    expect(parseConfig({ OPENAI_KEY: 'k', OPENAI_MODEL: 'gpt-5' }, ROOT).ok).toBe(false);
    expect(parseConfig({ LLM_PROVIDER: 'gemini', OPENAI_KEY: 'k' }, ROOT).ok).toBe(false);
  });

  it('reads a base URL per provider; empty means the default, a non-URL is rejected', () => {
    const r = parseConfig(
      {
        OPENAI_KEY: 'k',
        OPENAI_BASE_URL: 'https://gw.example.com/v1',
        ANTHROPIC_BASE_URL: 'http://localhost:8080',
      },
      ROOT,
    );
    expect(r.ok && [r.config.openAiBaseUrl, r.config.anthropicBaseUrl]).toEqual([
      'https://gw.example.com/v1',
      'http://localhost:8080',
    ]);
    const empty = parseConfig({ OPENAI_KEY: 'k', OPENAI_BASE_URL: '', ANTHROPIC_BASE_URL: '' }, ROOT);
    expect(empty.ok && [empty.config.openAiBaseUrl, empty.config.anthropicBaseUrl]).toEqual([null, null]);
    expect(parseConfig({ OPENAI_KEY: 'k', ANTHROPIC_BASE_URL: 'not a url' }, ROOT)).toMatchObject({
      ok: false,
      errors: [expect.stringContaining('ANTHROPIC_BASE_URL')],
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
