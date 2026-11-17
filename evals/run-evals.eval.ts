// Live eval (AC7.2–7.3): the real app, real model and real DummyJSON Catalog; only storage is in memory.
// Imperative shell — the rule checks (checks.ts) and the report (report.ts) are pure and unit-tested.
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { ConversationSchema, type Message } from '@app/contracts';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../apps/api/src/app.module.js';
import { CatalogPort } from '../apps/api/src/catalog/application/catalog.port.js';
import { RecommendationService } from '../apps/api/src/catalog/application/recommendation.service.js';
import type { Product } from '../apps/api/src/catalog/domain/product.js';
import { APP_CONFIG, loadConfig } from '../apps/api/src/shared/config/config.module.js';
import type { AppConfig } from '../apps/api/src/shared/config/app-config.js';
import { configureApp } from '../apps/api/src/shared/configure-app.js';
import { EVAL_CASES, type EvalCase } from './cases.js';
import { checkReply } from './checks.js';
import { renderEvalSection, replaceEvalSection, type CaseResult } from './report.js';

const REPORT = new URL('../docs/qa-report.md', import.meta.url);

let app: INestApplication;
let baseUrl: string;
let config: AppConfig;
let catalog: readonly Product[];
const results: CaseResult[] = [];

/** Sends one Shopper message and reads the whole stream; returns the stream's error text, if any. */
async function sendTurn(conversationId: string, text: string): Promise<string | undefined> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ conversationId, message: { id: randomUUID(), text } }),
  });
  const body = await res.text();
  if (!res.ok) return `HTTP ${res.status}: ${body.slice(0, 200)}`;
  const errorPart = body
    .split('\n')
    .filter((line) => line.startsWith('data: {'))
    .map((line) => JSON.parse(line.slice(6)) as { type: string; errorText?: string })
    .find((part) => part.type === 'error');
  return errorPart ? (errorPart.errorText ?? 'error part in stream') : undefined;
}

async function savedAssistantReplies(conversationId: string): Promise<Message[]> {
  const res = await fetch(`${baseUrl}/api/conversations/${conversationId}`);
  const conversation = ConversationSchema.parse(await res.json());
  return conversation.messages.filter((m) => m.role === 'assistant');
}

async function runCase(c: EvalCase): Promise<CaseResult> {
  const conversationId = randomUUID();
  const started = Date.now();
  const base = { id: c.id, turns: c.turns, groups: [], checks: [] };
  for (const turn of c.turns) {
    const error = await sendTurn(conversationId, turn);
    if (error) return { ...base, ms: Date.now() - started, error };
  }
  const ms = Date.now() - started;
  const replies = await savedAssistantReplies(conversationId);
  const reply = replies.at(-1);
  if (replies.length !== c.turns.length || !reply) {
    return { ...base, ms, error: `${replies.length} replies saved for ${c.turns.length} turns` };
  }
  return {
    ...base,
    ms,
    groups: reply.productGroups.map((g) => ({ label: g.label, shown: g.products.length, total: g.total })),
    checks: checkReply({ expect: c.expect, reply, previous: replies.at(-2), catalog }),
  };
}

const localTime = (d: Date) =>
  `${d.toLocaleDateString('sv-SE')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

describe(`live eval (${EVAL_CASES.length} cases)`, () => {
  beforeAll(async () => {
    const loaded = loadConfig();
    if (!loaded.ok) throw new Error(`Live eval needs a valid .env:\n  ${loaded.errors.join('\n  ')}`);
    config = { ...loaded.config, databasePath: ':memory:' };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(config)
      .compile();
    app = configureApp(moduleRef.createNestApplication({ logger: ['error', 'warn'] }));
    await app.listen(0);
    baseUrl = (await app.getUrl()).replace('[::1]', 'localhost');
    catalog = await app.get(CatalogPort).getAll(); // the same cached Catalog the tools search
    await app.get(RecommendationService).warmUp(); // embeddings ready before the first case (ADR 0004)
  });

  afterAll(async () => {
    await app?.close();
    if (!results.length) return;
    const section = renderEvalSection({ model: config.model, ranAt: localTime(new Date()), results });
    const existing = await readFile(REPORT, 'utf8').catch(() => null);
    await writeFile(REPORT, replaceEvalSection(existing, section));
    console.log(`\n${section}\n\nWritten to docs/qa-report.md`);
  });

  for (const c of EVAL_CASES) {
    it(`${c.id}: ${c.turns.join(' → ')}`, async () => {
      const result = await runCase(c);
      results.push(result);
      const failed = result.error
        ? [`error: ${result.error}`]
        : result.checks.filter((x) => !x.pass).map((x) => `${x.rule}: ${x.detail}`);
      expect(failed, `${c.id} failed`).toEqual([]);
    });
  }
});
