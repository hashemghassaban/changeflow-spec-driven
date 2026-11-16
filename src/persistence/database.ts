import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { schemaSql } from './schema.js';

export type SqliteDatabase = Database.Database;

export function openDatabase(databasePath: string): SqliteDatabase {
  const fullPath = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const db = new Database(fullPath, { timeout: 5000 });
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    const mode = db.pragma('journal_mode', { simple: true });
    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    const busyTimeout = db.pragma('busy_timeout', { simple: true });
    if (String(mode).toLowerCase() !== 'wal' || foreignKeys !== 1 || busyTimeout !== 5000) {
      throw new Error(`SQLite settings mismatch: journal_mode=${mode}, foreign_keys=${foreignKeys}, busy_timeout=${busyTimeout}`);
    }
    db.exec(schemaSql);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}