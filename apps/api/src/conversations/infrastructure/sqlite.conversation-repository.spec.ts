import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { group, message } from '../../../test/support/message.fixture.js';
import { appendMessage, createConversation } from '../domain/conversation.js';
import { SqliteConversationRepository } from './sqlite.conversation-repository.js';

describe('SqliteConversationRepository', () => {
  let db: DatabaseSync;
  let repo: SqliteConversationRepository;
  const warn = vi.fn();
  const sql = (q: string) => db.prepare(q).all();

  beforeEach(() => {
    warn.mockReset();
    db = new DatabaseSync(':memory:');
    repo = new SqliteConversationRepository(db, warn);
  });
  afterEach(() => db.close());

  const conversation = (id: string, at: string) =>
    appendMessage(
      appendMessage(createConversation(id, `chat ${id}`, at), message({ id: `${id}-u`, createdAt: at })),
      message({
        id: `${id}-a`,
        role: 'assistant',
        text: 'Here you go',
        productGroups: [group()],
        createdAt: at,
      }),
    );

  it('round-trips a Conversation with Product Groups (AC5.1)', async () => {
    const c = conversation('c1', '2026-11-17T10:00:00.000Z');
    await repo.save(c);
    expect(await repo.get('c1')).toEqual(c);
  });

  it('returns null for an unknown id', async () => expect(await repo.get('nope')).toBeNull());

  it('saving again appends only new Messages and updates the summary', async () => {
    const c = conversation('c1', '2026-11-17T10:00:00.000Z');
    await repo.save(c);
    const next = appendMessage(c, message({ id: 'm3', createdAt: '2026-11-17T12:00:00.000Z' }));
    await repo.save(next);
    const loaded = await repo.get('c1');
    expect(loaded?.messages.map((m) => m.id)).toEqual(['c1-u', 'c1-a', 'm3']);
    expect(loaded?.updatedAt).toBe('2026-11-17T12:00:00.000Z');
  });

  it('lists summaries, newest activity first (AC6.2)', async () => {
    await repo.save(conversation('old', '2026-11-17T09:00:00.000Z'));
    await repo.save(conversation('new', '2026-11-17T11:00:00.000Z'));
    expect(await repo.list()).toEqual([
      { id: 'new', title: 'chat new', updatedAt: '2026-11-17T11:00:00.000Z' },
      { id: 'old', title: 'chat old', updatedAt: '2026-11-17T09:00:00.000Z' },
    ]);
  });

  it('skips a corrupted Message row and loads the rest (AC5.2)', async () => {
    await repo.save(conversation('c1', '2026-11-17T10:00:00.000Z'));
    sql(`UPDATE messages SET payload_json = '{not json' WHERE id = 'c1-u'`);
    sql(`UPDATE messages SET payload_json = '{"id":"c1-a","role":"robot"}' WHERE id = 'c1-a'`);
    await repo.save(
      appendMessage((await repo.get('c1'))!, message({ id: 'ok', createdAt: '2026-11-17T12:00:00.000Z' })),
    );
    expect((await repo.get('c1'))?.messages.map((m) => m.id)).toEqual(['ok']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('skipped 2'));
  });

  it('still loads Messages saved before S8, without kind or semanticQuery (D46)', async () => {
    await repo.save(conversation('c1', '2026-11-17T10:00:00.000Z'));
    const { kind: _kind, query, ...oldGroup } = group();
    const { semanticQuery: _sq, ...oldQuery } = query;
    const old = message({ id: 'c1-a', role: 'assistant', productGroups: [] });
    const payload = JSON.stringify({ ...old, productGroups: [{ ...oldGroup, query: oldQuery }] });
    db.prepare(`UPDATE messages SET payload_json = ? WHERE id = 'c1-a'`).run(payload);

    const loaded = (await repo.get('c1'))?.messages.find((m) => m.id === 'c1-a');
    expect(loaded?.productGroups[0]?.kind).toBe('match');
    expect(loaded?.productGroups[0]?.query.semanticQuery).toBe('');
    expect(warn).not.toHaveBeenCalled();
  });

  it('deletes a Conversation with its Messages (AC6.4)', async () => {
    await repo.save(conversation('c1', '2026-11-17T10:00:00.000Z'));
    expect(await repo.delete('c1')).toBe(true);
    expect(await repo.get('c1')).toBeNull();
    expect(await repo.delete('c1')).toBe(false);
    expect(sql(`SELECT count(*) AS n FROM messages`)).toEqual([{ n: 0 }]);
  });

  it('rolls back a failed save so no half-written Conversation remains', async () => {
    const bad = { ...conversation('c1', '2026-11-17T10:00:00.000Z'), title: null as unknown as string };
    await expect(repo.save(bad)).rejects.toThrow();
    expect(await repo.get('c1')).toBeNull();
    expect(sql(`SELECT count(*) AS n FROM messages`)).toEqual([{ n: 0 }]);
  });
});
