import Database from "better-sqlite3";
import { APP_CONFIG } from "./config";
import { SCHEMA_SQL } from "./persistence/schema";

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const database = new Database(APP_CONFIG.databaseFilePath);
  database.pragma("foreign_keys = ON");
  database.exec(SCHEMA_SQL);
  dbInstance = database;
  return database;
}
