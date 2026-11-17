import { describe, expect, it } from 'vitest';
import { parseConfig } from './app-config.js';

describe('parseConfig', () => {
  it('applies defaults when only the key is given', () => {
    const r = parseConfig({ OPENAI_KEY: 'test-key' });
    expect(r).toEqual({
      ok: true,
      config: {
        openAiKey: 'test-key',
        model: 'gpt-6-luna',
        port: 3001,
        databasePath: '../../data/app.db',
        dummyJsonUrl: 'https://dummyjson.com',
      },
    });
  });

  it('reports a missing key without crashing', () => {
    const r = parseConfig({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/OPENAI_KEY/);
  });

  it('rejects any model other than gpt-6-luna', () => {
    expect(parseConfig({ OPENAI_KEY: 'k', OPENAI_MODEL: 'gpt-4o' }).ok).toBe(false);
  });

  it('never echoes the key in errors', () => {
    const r = parseConfig({ OPENAI_KEY: 'sk-secret-value', PORT: 'abc' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).not.toContain('sk-secret-value');
  });
});
