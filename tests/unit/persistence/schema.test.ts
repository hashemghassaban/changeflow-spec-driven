import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { openDatabase } from '../../../src/persistence/database.js';

test('schema enforces account, role, session hash, version and status invariants', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'changeflow-schema-'));
  const db = openDatabase(path.join(dir, 'test.sqlite'));
  try {
    db.prepare('INSERT INTO IndividualAccount VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run('u1', 'user1', Buffer.alloc(64), Buffer.alloc(16), 131072, 8, 1, 64, 1);
    db.prepare('INSERT INTO CurrentRoleGrant VALUES (?, ?, ?)').run('u1', 'Requester', 1);
    db.prepare('INSERT INTO CurrentRoleGrant VALUES (?, ?, ?)').run('u1', 'Reviewer', 1);
    assert.throws(() => db.prepare('INSERT INTO CurrentRoleGrant VALUES (?, ?, ?)').run('u1', 'Owner', 1));
    assert.throws(() => db.prepare('INSERT INTO ServerSession VALUES (?, ?, ?, ?, ?, ?)').run(Buffer.alloc(16), 'u1', Buffer.alloc(32), 1, 1, 2));
    assert.throws(() => db.prepare('INSERT INTO ChangeRequest VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('r1', 'a', 'b', 'c', 'u1', 'Deleted', 1, null, 1, 1));
    assert.throws(() => db.prepare('INSERT INTO ChangeRequest VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('r1', 'a', 'b', 'c', 'u1', 'Draft', 0, null, 1, 1));
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});