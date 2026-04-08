import type Database from "better-sqlite3";

export class AppStateRepository {
  constructor(private readonly db: Database.Database) {}

  get(key: string): string | null {
    const row = this.db
      .prepare<[string], { value: string }>(
        `
        SELECT value
        FROM app_state
        WHERE key = ?
      `
      )
      .get(key);

    return row?.value ?? null;
  }

  set(key: string, value: string): void {
    this.db
      .prepare(
        `
        INSERT INTO app_state (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `
      )
      .run(key, value);
  }
}
