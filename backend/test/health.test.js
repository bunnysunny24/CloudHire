import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

test('health endpoint reports API status', async () => {
  process.env.NODE_ENV = 'test';
  const { app } = await import('../src/server.js');
  const response = await request(app).get('/health').expect(200);

  assert.deepEqual(response.body, {
    status: 'ok',
    service: 'cloudhire-api'
  });
});
