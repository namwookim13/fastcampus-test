import type Database from "better-sqlite3";
import { APP_CONFIG } from "../config";
import { createId, nowUtcIso } from "../utils";
import type { ChatThread } from "../../shared/types";

type ThreadRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export class ThreadRepository {
  constructor(private readonly db: Database.Database) {}

  createThread(title = APP_CONFIG.defaultThreadTitle): ChatThread {
    const timestamp = nowUtcIso();
    const thread: ThreadRow = {
      id: createId(),
      title,
      created_at: timestamp,
      updated_at: timestamp
    };

    this.db
      .prepare(
        `
        INSERT INTO threads (id, title, created_at, updated_at)
        VALUES (@id, @title, @created_at, @updated_at)
      `
      )
      .run(thread);

    return mapThreadRow(thread);
  }

  listThreads(): ChatThread[] {
    const rows = this.db
      .prepare<[], ThreadRow>(
        `
        SELECT id, title, created_at, updated_at
        FROM threads
        ORDER BY updated_at DESC, id DESC
      `
      )
      .all();

    return rows.map(mapThreadRow);
  }

  getThreadById(threadId: string): ChatThread | null {
    const row = this.db
      .prepare<[string], ThreadRow>(
        `
        SELECT id, title, created_at, updated_at
        FROM threads
        WHERE id = ?
      `
      )
      .get(threadId);

    return row ? mapThreadRow(row) : null;
  }

  touchThread(threadId: string, updatedAt = nowUtcIso()): void {
    this.db
      .prepare(
        `
        UPDATE threads
        SET updated_at = ?
        WHERE id = ?
      `
      )
      .run(updatedAt, threadId);
  }
}

function mapThreadRow(row: ThreadRow): ChatThread {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
