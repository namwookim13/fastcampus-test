import type Database from "better-sqlite3";
import { createId, nowUtcIso } from "../utils";
import type { ChatMessage, MessageRole } from "../../shared/types";

type MessageRow = {
  id: string;
  thread_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
};

export class MessageRepository {
  constructor(private readonly db: Database.Database) {}

  addMessage(input: {
    threadId: string;
    role: MessageRole;
    content: string;
  }): ChatMessage {
    const row: MessageRow = {
      id: createId(),
      thread_id: input.threadId,
      role: input.role,
      content: input.content,
      created_at: nowUtcIso()
    };

    this.db
      .prepare(
        `
        INSERT INTO messages (id, thread_id, role, content, created_at)
        VALUES (@id, @thread_id, @role, @content, @created_at)
      `
      )
      .run(row);

    return mapMessageRow(row);
  }

  getMessagesByThread(threadId: string): ChatMessage[] {
    const rows = this.db
      .prepare<[string], MessageRow>(
        `
        SELECT id, thread_id, role, content, created_at
        FROM messages
        WHERE thread_id = ?
        ORDER BY created_at ASC, id ASC
      `
      )
      .all(threadId);

    return rows.map(mapMessageRow);
  }

  getRecentMessages(threadId: string, limit: number): ChatMessage[] {
    const rows = this.db
      .prepare<[string, number], MessageRow>(
        `
        SELECT id, thread_id, role, content, created_at
        FROM (
          SELECT id, thread_id, role, content, created_at
          FROM messages
          WHERE thread_id = ?
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        )
        ORDER BY created_at ASC, id ASC
      `
      )
      .all(threadId, limit);

    return rows.map(mapMessageRow);
  }
}

function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at
  };
}
