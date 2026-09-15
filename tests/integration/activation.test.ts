import request from 'supertest';
import { createApp } from '../../src/app';
import { resolveEmulatorTarget } from '../../src/config';
import { closeDb, getDb } from '../../src/db';
import { BASELINE, FIXTURE } from '../../fixtures/baseline';
import { seedBaseline } from '../../fixtures/seed';
import { describeWithEmulator } from '../support/emulator';
import {
  REQUIRED_PRACTITIONERS,
  RequiredPractitioner,
  scenarioTag,
} from '../../verification/requiredScenarios';

/**
 * The required cases from ACTIVATION_CONTRACT.md, one test each. Every required test
 * carries its scenario id and practitioner in its name, so a reviewer reading the
 * output can see which check proves which row of the contract table.
 *
 * The three scenarios for one practitioner run in order, as one person's journey:
 * accept the invitation, resolve the practitioner, start a practice.
 *
 * Refusals are HTTP 200 with a "refused" status, so every check below reads the
 * status field. A start counts only when the practiceSessions document is there.
 */

interface SeededPractitioner {
  displayName: string;
  configVersion: string;
}

describeWithEmulator('required activation scenarios', () => {
  const app = createApp(getDb);

  beforeAll(async () => {
    await seedBaseline(getDb(), resolveEmulatorTarget());
  });

  afterAll(async () => {
    await closeDb();
  });

  describe.each(REQUIRED_PRACTITIONERS)('%s', (which: RequiredPractitioner) => {
    const fixture = FIXTURE[which];
    const intended = BASELINE[`practitioners/${which}`] as unknown as SeededPractitioner;
    const otherPractitionerId = REQUIRED_PRACTITIONERS.filter((id) => id !== which)[0];
    const personId = `person-${which}-it`;

    it(`${scenarioTag('activation.invitation', which)} accepting the invitation binds the person to the intended practitioner`, async () => {
      const res = await request(app)
        .post('/invitations/accept')
        .send({ token: fixture.invitationToken, personId });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'accepted',
        personId,
        practitionerId: fixture.practitionerId,
        cohortId: fixture.cohortId,
      });

      const person = await getDb().collection('people').doc(personId).get();
      expect(person.exists).toBe(true);
      expect(person.data()).toMatchObject({
        practitionerId: fixture.practitionerId,
        cohortId: fixture.cohortId,
        invitationToken: fixture.invitationToken,
      });
    });

    it(`${scenarioTag('activation.practitioner', which)} resolving the person returns the intended practitioner identity`, async () => {
      const res = await request(app).get(`/people/${personId}/practitioner`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('resolved');
      expect(res.body.personId).toBe(personId);
      expect(res.body.practitioner).toMatchObject({
        id: fixture.practitionerId,
        displayName: intended.displayName,
        configVersion: intended.configVersion,
      });
      expect(res.body.practitioner.id).not.toBe(otherPractitionerId);
    });

    it(`${scenarioTag('activation.practice-start', which)} starting the practice returns started and writes a matching session`, async () => {
      const res = await request(app)
        .post('/practices/start')
        .send({ personId, practiceId: fixture.practiceId });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('started');
      expect(typeof res.body.sessionId).toBe('string');
      expect(res.body.sessionId.length).toBeGreaterThan(0);
      expect(res.body).toMatchObject({
        personId,
        practitionerId: fixture.practitionerId,
        practiceId: fixture.practiceId,
      });

      const session = await getDb()
        .collection('practiceSessions')
        .doc(res.body.sessionId)
        .get();
      expect(session.exists).toBe(true);
      expect(session.data()).toMatchObject({
        personId,
        practitionerId: fixture.practitionerId,
        practiceId: fixture.practiceId,
        configVersion: intended.configVersion,
      });
    });
  });

  /**
   * Not one of the six required cases. This guards the repair: practice access must
   * stay off for a practitioner nobody has given it, so fixing one practitioner by
   * turning access on globally or by changing the code default would fail here.
   */
  describe('practice access default', () => {
    const practitionerId = 'guard-unconfigured';
    const practiceId = 'guard-quiet-minute';
    const personId = 'person-guard-unconfigured';

    it('refuses a practitioner that has no practice configuration', async () => {
      const db = getDb();
      await db.collection('practitioners').doc(practitionerId).set({
        displayName: 'Unconfigured Studio',
        active: true,
        configVersion: 'guard-v1',
      });
      await db.collection('practices').doc(practiceId).set({
        practitionerId,
        title: 'Quiet minute',
      });
      await db.collection('people').doc(personId).set({
        practitionerId,
        cohortId: 'guard-cohort',
        invitationToken: 'INV-GUARD',
        acceptedAt: new Date().toISOString(),
      });

      const res = await request(app).post('/practices/start').send({ personId, practiceId });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'refused', reason: 'practice_unavailable' });

      const sessions = await db
        .collection('practiceSessions')
        .where('personId', '==', personId)
        .get();
      expect(sessions.empty).toBe(true);
    });
  });
});
