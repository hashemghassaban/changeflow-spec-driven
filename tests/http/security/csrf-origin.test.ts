import assert from 'node:assert/strict'; import { test } from 'node:test'; import express from 'express'; import request from 'supertest';
import { createOriginGuard } from '../../../src/http/middleware/origin.js'; import { csrfGuard } from '../../../src/http/middleware/csrf.js';
const app=express(); app.use(createOriginGuard(['http://localhost:3000'])); app.use((req,_res,next)=>{req.changeflowSession={csrfToken:Buffer.alloc(32,1)};next();}); app.use(csrfGuard); app.post('/mutate',(_req,res)=>res.status(204).end());
test('CSRF and exact Origin reject missing, wrong and absent values without mutation', async()=>{
  assert.equal((await request(app).post('/mutate').set('Origin','http://localhost:3000').send({})).status,403);
  assert.equal((await request(app).post('/mutate').set('Origin','http://evil.test').set('X-CSRF-Token',Buffer.alloc(32,1).toString('base64url'))).status,403);
  assert.equal((await request(app).post('/mutate').set('X-CSRF-Token',Buffer.alloc(32,1).toString('base64url'))).status,403);
  assert.equal((await request(app).post('/mutate').set('Origin','http://localhost:3000').set('X-CSRF-Token',Buffer.alloc(32,1).toString('base64url'))).status,204);
});