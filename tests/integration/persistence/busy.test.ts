import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { openDatabase } from '../../../src/persistence/database.js';
import { startWorker, stopWorker, waitForMessage, withDeadline } from '../../helpers/sqlite-process-barrier.js';

test('independent process contention reports SQLITE_BUSY and leaves no partial row', { timeout: 65_000 }, async () => {
  await withDeadline('SQLite contention scenario', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'changeflow-busy-'));
    const file = path.join(dir, 'busy.sqlite');
    const db = openDatabase(file);
    let holder: import('node:child_process').ChildProcess | undefined;
    let second: import('node:child_process').ChildProcess | undefined;
    try {
      db.exec('CREATE TABLE probe (value TEXT NOT NULL)');
      holder = await startWorker(file);
      second = await startWorker(file);
      holder.send({ type: 'hold' });
      await waitForMessage(holder, 'locked');
      const contender = new Database(file, { timeout: 5000 });
      contender.pragma('foreign_keys = ON'); contender.pragma('busy_timeout = 5000');
      try {
        assert.equal(contender.pragma('foreign_keys', { simple: true }), 1);
        assert.equal(contender.pragma('busy_timeout', { simple: true }), 5000);
        assert.throws(() => contender.prepare('INSERT INTO probe VALUES (?)').run('must-not-commit'), (error: any) => error.code === 'SQLITE_BUSY');
      } finally { contender.close(); }
      holder.send({ type: 'release' });
      const released = await waitForMessage(holder, 'released');
      assert.equal(released.inTransaction, false);
      assert.deepEqual(released.rows, []);
      assert.deepEqual(db.prepare('SELECT value FROM probe').all(), []);
      assert.equal(db.inTransaction, false);
    } finally {
      if (holder) await stopWorker(holder);
      if (second) await stopWorker(second);
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});