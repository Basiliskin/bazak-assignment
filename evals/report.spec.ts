import { describe, expect, it } from 'vitest';
import {
  EVAL_END,
  EVAL_START,
  casePassed,
  renderEvalSection,
  replaceEvalSection,
  type CaseResult,
} from './report.js';

const passing: CaseResult = {
  id: 'price',
  turns: ['a phone under $500'],
  groups: [{ label: 'Phones under $500', shown: 4, total: 9 }],
  checks: [
    { rule: 'R1', pass: true, detail: 'ok' },
    { rule: 'R6', pass: true, detail: 'smartphones ≤ $500: 4 cards' },
  ],
  ms: 4210,
};
const failing: CaseResult = {
  id: 'off-catalog',
  turns: ['a flight | to Tokyo'],
  groups: [],
  checks: [{ rule: 'R3', pass: false, detail: 'report_off_catalog not called' }],
  ms: 3000,
};
const errored: CaseResult = {
  id: 'plain',
  turns: ['show me smartphones'],
  groups: [],
  checks: [],
  ms: 100,
  error: 'LLM down',
};

describe('casePassed', () => {
  it('needs every check to pass and no error', () => {
    expect(casePassed(passing)).toBe(true);
    expect(casePassed(failing)).toBe(false);
    expect(casePassed(errored)).toBe(false);
  });
});

describe('renderEvalSection', () => {
  const section = renderEvalSection({
    model: 'gpt-6-luna',
    ranAt: '2026-11-17 18:20',
    results: [passing, failing, errored],
  });

  it('is wrapped in markers and states model, time and the pass count', () => {
    expect(section.startsWith(EVAL_START)).toBe(true);
    expect(section.endsWith(EVAL_END)).toBe(true);
    expect(section).toContain('`gpt-6-luna`');
    expect(section).toContain('2026-11-17 18:20');
    expect(section).toContain('**1/3 cases passed**');
  });

  it('renders one table row per case with groups, checks and time; pipes escaped', () => {
    expect(section).toContain(
      '| price | a phone under $500 | Phones under $500 (4 of 9) | ✅ R1 · ✅ R6 | 4.2 s |',
    );
    expect(section).toContain('| off-catalog | a flight \\| to Tokyo | — | ❌ R3 | 3.0 s |');
    expect(section).toContain('| plain | show me smartphones | — | ❌ error | 0.1 s |');
  });

  it('lists the details of every failure below the table', () => {
    expect(section).toContain('- **off-catalog** R3: report_off_catalog not called');
    expect(section).toContain('- **plain** error: LLM down');
    expect(section).not.toContain('**price**');
  });

  it('joins multi-turn requests with an arrow', () => {
    const s = renderEvalSection({ model: 'm', ranAt: 't', results: [{ ...passing, turns: ['a', 'b'] }] });
    expect(s).toContain('| price | a → b |');
  });
});

describe('replaceEvalSection', () => {
  const section = `${EVAL_START}\nnew\n${EVAL_END}`;

  it('creates a report when there is none', () => {
    expect(replaceEvalSection(null, section)).toBe(`# QA report\n\n${section}\n`);
  });

  it('replaces only the marked section and keeps the rest', () => {
    const doc = `# QA report\n\nintro\n\n${EVAL_START}\nold\n${EVAL_END}\n\n## Smoke test\nkept\n`;
    expect(replaceEvalSection(doc, section)).toBe(
      `# QA report\n\nintro\n\n${section}\n\n## Smoke test\nkept\n`,
    );
  });

  it('appends the section when the report has no markers yet', () => {
    expect(replaceEvalSection('# QA report\n\nnotes\n', section)).toBe(
      `# QA report\n\nnotes\n\n${section}\n`,
    );
  });
});

describe('API-only mode section (ADR 0005)', () => {
  const memory = renderEvalSection({ model: 'm', ranAt: 't1', results: [passing] });
  const api = renderEvalSection({ model: 'm', ranAt: 't2', results: [passing], mode: 'api' });

  it('has its own markers, heading and command', () => {
    expect(api).toMatch(/^<!-- eval:api:start -->/);
    expect(api).toContain('API-only Catalog');
    expect(api).toContain('CATALOG_MODE=api npm run eval');
  });

  it('an API run never overwrites the memory results, and vice versa', () => {
    const both = replaceEvalSection(replaceEvalSection('# QA report\n', memory), api, 'api');
    expect(both).toContain(memory);
    expect(both).toContain(api);
    const rerun = replaceEvalSection(both, api.replace('t2', 't3'), 'api');
    expect(rerun).toContain(memory);
    expect(rerun).toContain('t3');
    expect(rerun).not.toContain('t2');
  });
});
