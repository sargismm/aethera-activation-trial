import request from 'supertest';
import { Firestore } from 'firebase-admin/firestore';
import { createApp } from '../../src/app';

/**
 * These requests are rejected before any database access, so no emulator is needed.
 */
const neverCalled = (): Firestore => {
  throw new Error('database should not be reached for a malformed request');
};

describe('HTTP request handling', () => {
  const app = createApp(neverCalled);

  it('answers health checks', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 400 for a malformed invitation request', async () => {
    const res = await request(app).post('/invitations/accept').send({ token: 'INV-1' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ status: 'invalid_request', fields: ['personId'] });
  });

  it('returns 400 for a malformed practice start', async () => {
    const res = await request(app).post('/practices/start').send({ personId: 'p/1' });
    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual(['personId', 'practiceId']);
  });
});
