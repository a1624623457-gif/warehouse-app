import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "warehouse.db");

declare global {
  var _db: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (!globalThis._db) {
    globalThis._db = new Database(DB_PATH);
    globalThis._db.pragma("journal_mode = WAL");
    globalThis._db.pragma("foreign_keys = ON");
  }
  return globalThis._db;
}

export { getDb };
