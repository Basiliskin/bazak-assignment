import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Conversation, ConversationSummary } from '@app/contracts';
import { ConversationRepository } from '../application/conversation.repository.js';
import { rowsToConversation, type ConversationRow, type MessageRow } from './conversation-rows.js';

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS conversations (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    seq             INTEGER PRIMARY KEY AUTOINCREMENT,
    id              TEXT NOT NULL UNIQUE,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    payload_json    TEXT NOT NULL,
    created_at      TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS messages_by_conversation ON messages(conversation_id, seq);
`;

/** ConversationRepository on built-in `node:sqlite` (ADR 0003). One row per Message so a bad row can't break a chat. */
export class SqliteConversationRepository extends ConversationRepository {
  /** Opens (creating the folder and schema if needed) the database file. Fails fast with a clear message. */
  static open(path: string, onWarn?: (message: string) => void): SqliteConversationRepository {
    try {
      if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
      const db = new DatabaseSync(path);
      db.exec('PRAGMA journal_mode = WAL;');
      return new SqliteConversationRepository(db, onWarn);
    } catch (e) {
      throw new Error(`Cannot open the conversations database at ${path}: ${(e as Error).message}`, {
        cause: e,
      });
    }
  }

  constructor(
    private readonly db: DatabaseSync,
    private readonly warn: (message: string) => void = () => undefined,
  ) {
    super();
    db.exec(SCHEMA);
  }

  async get(id: string): Promise<Conversation | null> {
    const row = this.db.prepare('SELECT id, title, updated_at FROM conversations WHERE id = ?').get(id) as
      ConversationRow | undefined;
    if (!row) return null;
    const messageRows = this.db
      .prepare('SELECT id, payload_json FROM messages WHERE conversation_id = ? ORDER BY seq')
      .all(id) as unknown as MessageRow[];
    const { conversation, skipped } = rowsToConversation(row, messageRows);
    if (skipped > 0) this.warn(`Conversation ${id}: skipped ${skipped} unreadable message(s)`);
    return conversation;
  }

  async list(): Promise<ConversationSummary[]> {
    const rows = this.db
      .prepare('SELECT id, title, updated_at FROM conversations ORDER BY updated_at DESC, id')
      .all() as unknown as ConversationRow[];
    return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updated_at }));
  }

  async save(c: Conversation): Promise<void> {
    const upsert = this.db.prepare(
      `INSERT INTO conversations (id, title, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at`,
    );
    const insertMessage = this.db.prepare(
      `INSERT OR IGNORE INTO messages (id, conversation_id, role, payload_json, created_at) VALUES (?, ?, ?, ?, ?)`,
    );
    this.db.exec('BEGIN');
    try {
      upsert.run(c.id, c.title, c.updatedAt);
      for (const m of c.messages) insertMessage.run(m.id, c.id, m.role, JSON.stringify(m), m.createdAt);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  async delete(id: string): Promise<boolean> {
    return Number(this.db.prepare('DELETE FROM conversations WHERE id = ?').run(id).changes) > 0;
  }

  close(): void {
    if (this.db.isOpen) this.db.close();
  }
}
