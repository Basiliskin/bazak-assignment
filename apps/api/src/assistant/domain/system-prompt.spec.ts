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
  });

  it('is deterministic', () => expect(buildSystemPrompt(CATEGORY_SLUGS)).toBe(prompt));
});
