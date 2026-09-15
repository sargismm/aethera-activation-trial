import request from 'supertest';
import { createApp } from '../../src/app';
import { resolveEmulatorTarget } from '../../src/config';
import { closeDb, getDb } from '../../src/db';
import { FIXTURE, FixturePractitioner } from '../../fixtures/baseline';
import { seedBaseline } from '../../fixtures/seed';
import { describeWithEmulator } from '../support/emulator';

const practitioners: FixturePractitioner[] = ['cedar', 'harbor'];

describeWithEmulator('activation path against the emulator', () => {
  const app = createApp(getDb);

  beforeAll(async () => {
    await seedBaseline(getDb(), resolveEmulatorTarget());
  });

  afterAll(async () => {
    await closeDb();
  });

  describe.each(practitioners)('%s', (which) => {
    const fixture = FIXTURE[which];
    const personId = `person-${which}-it`;

    it('accepting the invitation binds the person to the practitioner', async () => {
      const res = await request(app)
        .post('/invitations/accept')
        .send({ token: fixture.invitationToken, personId });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('accepted');
      expect(res.body.practitionerId).toBe(fixture.practitionerId);
      expect(res.body.cohortId).toBe(fixture.cohortId);

      const person = await getDb().collection('people').doc(personId).get();
      expect(person.exists).toBe(true);
      expect(person.data()?.practitionerId).toBe(fixture.practitionerId);
    });

    it('resolving the person returns their practitioner', async () => {
      const res = await request(app).get(`/people/${personId}/practitioner`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('resolved');
      expect(res.body.practitioner.id).toBe(fixture.practitionerId);
    });

    it('starting a practice succeeds', async () => {
      const res = await request(app)
        .post('/practices/start')
        .send({ personId, practiceId: fixture.practiceId });

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });
  });
});
