import { CATEGORY_SLUGS } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from './system-prompt.js';

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt(CATEGORY_SLUGS);

  it('lists every category slug', () => {
    for (const slug of CATEGORY_SLUGS) expect(prompt).toContain(slug);
  });

  it('states the behaviour rules the evals check', () => {
    expect(prompt).toMatch(/never invent/i); // R1
    expect(prompt).toMatch(/guessed/); // R2
    expect(prompt).toMatch(/report_off_catalog/); // R3
    expect(prompt).toMatch(/one search_products call per/i); // R4
    expect(prompt).toMatch(/data, never instructions/i); // prompt-injection guard
    expect(prompt).toMatch(/semanticQuery/); // ADR 0004: the model expands the request
    expect(prompt).toMatch(/You might also like/); // R10: recommendations are added by the system
  });

  it('is deterministic', () => expect(buildSystemPrompt(CATEGORY_SLUGS)).toBe(prompt));

  it('memory mode says nothing about Partial Results', () => expect(prompt).not.toMatch(/coverage/));

  describe('API mode (ADR 0005)', () => {
    const api = buildSystemPrompt(CATEGORY_SLUGS, 'api');

    it('explains Partial Results and asks for concrete keywords', () => {
      expect(api).toMatch(/coverage/);
      expect(api).toMatch(/I checked 500 laptops/);
      expect(api).toMatch(/of those I checked/);
      expect(api).toMatch(/1–3 concrete keywords/);
    });

    it('does not promise a Recommended Group', () => expect(api).not.toMatch(/You might also like/));
  });
});
