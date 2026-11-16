import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os'; import path from 'node:path'; import { test } from 'node:test';
import { openDatabase } from '../../../src/persistence/database.js';
import { SessionStore, hashSessionToken, IDLE_TTL_MS } from '../../../src/persistence/session-store.js';
import { SessionService } from '../../../src/application/auth/session-service.js';

test('session token is opaque in storage, rotates, expires, prunes and logs out', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'changeflow-session-')); const db = openDatabase(path.join(dir,'db.sqlite'));
  let now=1_000_000;
  try {
    db.prepare('INSERT INTO IndividualAccount VALUES (?,?,?,?,?,?,?,?,?)').run('u1','user',Buffer.alloc(64),Buffer.alloc(16),131072,8,1,64,now);
    const service=new SessionService(new SessionStore(db,()=>now));
    const issued=service.rotateAfterLogin('u1');
    assert.equal(issued.token.length > 0,true); assert.equal(issued.csrfToken.length > 0,true);
    const stored=db.prepare('SELECT sessionIdHash,csrfToken FROM ServerSession').get() as {sessionIdHash:Buffer;csrfToken:Buffer};
    assert.deepEqual(stored.sessionIdHash,hashSessionToken(issued.token)); assert.notEqual(stored.sessionIdHash.toString(),issued.token);
    assert.equal(service.authenticate(issued.token)?.userId,'u1');
    now += IDLE_TTL_MS + 1; assert.equal(service.authenticate(issued.token),null);
    assert.equal((db.prepare('SELECT count(*) n FROM ServerSession').get() as {n:number}).n,0);
    const next=service.rotateAfterLogin('u1'); service.logout(next.token); assert.equal(service.authenticate(next.token),null);
    const expiring=service.rotateAfterLogin('u1'); now += 13*60*60_000; assert.equal(service.prune(),1); assert.equal(service.authenticate(expiring.token),null);
  } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});