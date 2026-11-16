import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { openDatabase } from '../../../src/persistence/database.js';
import { inImmediateTransaction } from '../../../src/persistence/transaction.js';

test('SQLite connection settings, transaction commit and rollback are effective', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'changeflow-tx-'));
  const db = openDatabase(path.join(dir, 'test.sqlite'));
  try {
    assert.equal(db.pragma('journal_mode', { simple: true }), 'wal');
    assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
    assert.equal(db.pragma('busy_timeout', { simple: true }), 5000);
    db.exec('CREATE TABLE probe (value TEXT NOT NULL)');
    inImmediateTransaction(db, () => { db.prepare('INSERT INTO probe VALUES (?)').run('committed'); });
    assert.deepEqual(db.prepare('SELECT value FROM probe').all(), [{ value: 'committed' }]);
    assert.throws(() => inImmediateTransaction(db, () => { db.prepare('INSERT INTO probe VALUES (?)').run('rolled-back'); throw new Error('forced rollback'); }), /forced rollback/);
    assert.deepEqual(db.prepare('SELECT value FROM probe').all(), [{ value: 'committed' }]);
    assert.equal(db.inTransaction, false);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});