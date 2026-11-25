import type { CheckResult } from './checks.js';

export const EVAL_START = '<!-- eval:start -->';
export const EVAL_END = '<!-- eval:end -->';

/** Which Catalog mode the eval ran against (ADR 0005). Each mode keeps its own section of the report. */
export type EvalMode = 'memory' | 'api';

const SECTIONS: Record<EvalMode, { start: string; end: string; heading: string; command: string }> = {
  memory: { start: EVAL_START, end: EVAL_END, heading: '## Live eval', command: 'npm run eval' },
  api: {
    start: '<!-- eval:api:start -->',
    end: '<!-- eval:api:end -->',
    heading: '## Live eval — API-only Catalog (ADR 0005)',
    command: 'CATALOG_MODE=api npm run eval',
  },
};

export interface CaseResult {
  id: string;
  turns: readonly string[];
  /** Product Groups of the last reply. */
  groups: readonly { label: string; shown: number; total: number }[];
  checks: readonly CheckResult[];
  ms: number;
  /** Set when the turn itself failed (stream error part, no reply saved, …). */
  error?: string;
}

export const casePassed = (r: CaseResult): boolean => !r.error && r.checks.every((c) => c.pass);

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

function row(r: CaseResult): string {
  const groups = r.groups.length
    ? r.groups.map((g) => `${g.label} (${g.shown} of ${g.total})`).join('; ')
    : '—';
  const checks = r.error ? '❌ error' : r.checks.map((c) => `${c.pass ? '✅' : '❌'} ${c.rule}`).join(' · ');
  return `| ${cell(r.id)} | ${cell(r.turns.join(' → '))} | ${cell(groups)} | ${checks} | ${(r.ms / 1000).toFixed(1)} s |`;
}

function failures(results: readonly CaseResult[]): string[] {
  return results.flatMap((r) =>
    r.error
      ? [`- **${r.id}** error: ${r.error}`]
      : r.checks.filter((c) => !c.pass).map((c) => `- **${r.id}** ${c.rule}: ${c.detail}`),
  );
}

/** Pure: the eval results as a Markdown section wrapped in markers (so /qa can write around it). */
export function renderEvalSection(run: {
  model: string;
  ranAt: string;
  results: readonly CaseResult[];
  mode?: EvalMode;
}): string {
  const passed = run.results.filter(casePassed).length;
  const failed = failures(run.results);
  const s = SECTIONS[run.mode ?? 'memory'];
  return [
    s.start,
    s.heading,
    '',
    `\`${s.command}\` · model \`${run.model}\` · real DummyJSON Catalog · ${run.ranAt} · **${passed}/${run.results.length} cases passed**`,
    '',
    'Rules: R1 real Products · R2 Assumption + question · R3 off-catalog reported · R4 one group per intent · R5 follow-up cheaper · R6 price limit · R7 ≤ 4 cards · R9 in stock · R10 Recommended Group repeats no match, keeps price + stock · similar = "You might also like" shown · relevant = match cards on topic (beach) · reply has text.',
    '',
    '| Case | Request | Groups | Checks | Time |',
    '|---|---|---|---|---|',
    ...run.results.map(row),
    '',
    ...(failed.length ? ['**Failures**', '', ...failed] : ['No failures.']),
    s.end,
  ].join('\n');
}

/** Pure: puts the section into the report — replaces the marked part, appends it, or starts a new report. */
export function replaceEvalSection(doc: string | null, section: string, mode: EvalMode = 'memory'): string {
  if (doc === null) return `# QA report\n\n${section}\n`;
  const markers = SECTIONS[mode];
  const start = doc.indexOf(markers.start);
  const end = doc.indexOf(markers.end);
  if (start === -1 || end < start) return `${doc.trimEnd()}\n\n${section}\n`;
  return doc.slice(0, start) + section + doc.slice(end + markers.end.length);
}
