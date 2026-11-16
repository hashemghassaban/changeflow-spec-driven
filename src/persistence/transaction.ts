import type { SqliteDatabase } from './database.js';

export function inImmediateTransaction<T>(db: SqliteDatabase, operation: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = operation();
    db.exec('COMMIT');
    return value;
  } catch (error) {
    if (db.inTransaction) db.exec('ROLLBACK');
    throw error;
  }
}