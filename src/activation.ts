import { Firestore } from 'firebase-admin/firestore';
import {
  COLLECTIONS,
  Cohort,
  GLOBAL_CONFIG_ID,
  Invitation,
  Person,
  Practice,
  PracticeConfig,
  PracticeSession,
  Practitioner,
  Refusal,
} from './model';
import { resolvePracticeAccess } from './practiceAccess';

export type AcceptResult =
  | { status: 'accepted'; personId: string; practitionerId: string; cohortId: string }
  | Refusal;

export type ResolveResult =
  | {
      status: 'resolved';
      personId: string;
      practitioner: { id: string; displayName: string; configVersion: string };
    }
  | Refusal;

export type StartResult =
  | {
      status: 'started';
      sessionId: string;
      personId: string;
      practitionerId: string;
      practiceId: string;
    }
  | Refusal;

const refuse = (reason: string): Refusal => ({ status: 'refused', reason });

/**
 * Accept an invitation: token to cohort, cohort to practitioner, then bind the person
 * to that practitioner. Accepting the same invitation again is harmless.
 */
export async function acceptInvitation(
  db: Firestore,
  token: string,
  personId: string,
): Promise<AcceptResult> {
  const invitationSnap = await db.collection(COLLECTIONS.invitations).doc(token).get();
  if (!invitationSnap.exists) return refuse('invitation_not_found');
  const invitation = invitationSnap.data() as Invitation;

  const cohortSnap = await db.collection(COLLECTIONS.cohorts).doc(invitation.cohortId).get();
  if (!cohortSnap.exists) return refuse('cohort_not_found');
  const cohort = cohortSnap.data() as Cohort;

  const practitionerSnap = await db
    .collection(COLLECTIONS.practitioners)
    .doc(cohort.practitionerId)
    .get();
  if (!practitionerSnap.exists) return refuse('practitioner_not_found');
  const practitioner = practitionerSnap.data() as Practitioner;
  if (practitioner.active !== true) return refuse('practitioner_inactive');

  const personRef = db.collection(COLLECTIONS.people).doc(personId);
  const existing = await personRef.get();
  if (existing.exists) {
    const person = existing.data() as Person;
    if (person.practitionerId !== cohort.practitionerId) {
      return refuse('person_bound_to_other_practitioner');
    }
  } else {
    const person: Person = {
      practitionerId: cohort.practitionerId,
      cohortId: invitation.cohortId,
      invitationToken: token,
      acceptedAt: new Date().toISOString(),
    };
    await personRef.set(person);
  }

  return {
    status: 'accepted',
    personId,
    practitionerId: cohort.practitionerId,
    cohortId: invitation.cohortId,
  };
}

/**
 * Which practitioner does this person belong to? This is what decides the identity,
 * practices and experience the person sees.
 */
export async function resolvePractitioner(db: Firestore, personId: string): Promise<ResolveResult> {
  const personSnap = await db.collection(COLLECTIONS.people).doc(personId).get();
  if (!personSnap.exists) return refuse('person_not_found');
  const person = personSnap.data() as Person;

  const practitionerSnap = await db
    .collection(COLLECTIONS.practitioners)
    .doc(person.practitionerId)
    .get();
  if (!practitionerSnap.exists) return refuse('practitioner_not_found');
  const practitioner = practitionerSnap.data() as Practitioner;

  return {
    status: 'resolved',
    personId,
    practitioner: {
      id: practitionerSnap.id,
      displayName: practitioner.displayName,
      configVersion: practitioner.configVersion,
    },
  };
}

/**
 * Start one of the practitioner's practices for this person. A start is only real
 * when a practiceSessions document exists for it.
 */
export async function startPractice(
  db: Firestore,
  personId: string,
  practiceId: string,
): Promise<StartResult> {
  const personSnap = await db.collection(COLLECTIONS.people).doc(personId).get();
  if (!personSnap.exists) return refuse('person_not_found');
  const person = personSnap.data() as Person;

  const practitionerSnap = await db
    .collection(COLLECTIONS.practitioners)
    .doc(person.practitionerId)
    .get();
  if (!practitionerSnap.exists) return refuse('practitioner_not_found');
  const practitioner = practitionerSnap.data() as Practitioner;
  if (practitioner.active !== true) return refuse('practitioner_inactive');

  const practiceSnap = await db.collection(COLLECTIONS.practices).doc(practiceId).get();
  if (!practiceSnap.exists) return refuse('practice_not_found');
  const practice = practiceSnap.data() as Practice;
  if (practice.practitionerId !== person.practitionerId) return refuse('practice_not_found');

  const configs = db.collection(COLLECTIONS.practiceConfigs);
  const [scopedSnap, globalSnap] = await Promise.all([
    configs.doc(person.practitionerId).collection('versions').doc(practitioner.configVersion).get(),
    configs.doc(GLOBAL_CONFIG_ID).get(),
  ]);
  const access = resolvePracticeAccess(
    scopedSnap.exists ? (scopedSnap.data() as PracticeConfig) : undefined,
    globalSnap.exists ? (globalSnap.data() as PracticeConfig) : undefined,
  );
  if (!access.enabled) return refuse('practice_unavailable');

  const session: PracticeSession = {
    personId,
    practitionerId: person.practitionerId,
    practiceId,
    configVersion: practitioner.configVersion,
    startedAt: new Date().toISOString(),
  };
  const sessionRef = await db.collection(COLLECTIONS.practiceSessions).add(session);

  return {
    status: 'started',
    sessionId: sessionRef.id,
    personId,
    practitionerId: person.practitionerId,
    practiceId,
  };
}
