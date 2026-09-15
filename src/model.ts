/**
 * Collection names and document shapes. ACTIVATION_CONTRACT.md is the readable
 * version of this file.
 */
export const COLLECTIONS = {
  practitioners: 'practitioners',
  cohorts: 'cohorts',
  invitations: 'invitations',
  people: 'people',
  practiceConfigs: 'practiceConfigs',
  practices: 'practices',
  practiceSessions: 'practiceSessions',
} as const;

/** The document under practiceConfigs that holds settings shared by every practitioner. */
export const GLOBAL_CONFIG_ID = '_global';

export interface Practitioner {
  displayName: string;
  active: boolean;
  configVersion: string;
}

export interface Cohort {
  practitionerId: string;
  name: string;
}

export interface Invitation {
  cohortId: string;
}

export interface Person {
  practitionerId: string;
  cohortId: string;
  invitationToken: string;
  acceptedAt: string;
}

export interface Practice {
  practitionerId: string;
  title: string;
}

export interface PracticeConfig {
  practiceAccess?: {
    enabled?: boolean;
  };
}

export interface PracticeSession {
  personId: string;
  practitionerId: string;
  practiceId: string;
  configVersion: string;
  startedAt: string;
}

export type Refusal = { status: 'refused'; reason: string };
