/**
 * The supplied baseline: two fictional practitioners, each with a cohort, an
 * invitation and practices. Every record here is invented. `npm run seed` clears the
 * emulator and writes exactly this.
 *
 * Paths are "collection/documentId". practiceConfigs versions live in a
 * subcollection: practiceConfigs/<practitionerId>/versions/<configVersion>.
 */
export const BASELINE: Record<string, Record<string, unknown>> = {
  // Practitioners
  'practitioners/cedar': {
    displayName: 'Cedar Grove Coaching',
    active: true,
    configVersion: 'cedar-v3',
  },
  'practitioners/harbor': {
    displayName: 'Harbor Light Studio',
    active: true,
    configVersion: 'harbor-v1',
  },

  // Cohorts
  'cohorts/cedar-autumn': { practitionerId: 'cedar', name: 'Autumn circle' },
  'cohorts/harbor-first': { practitionerId: 'harbor', name: 'First cohort' },

  // Invitations
  'invitations/INV-CEDAR-AUTUMN': { cohortId: 'cedar-autumn' },
  'invitations/INV-HARBOR-FIRST': { cohortId: 'harbor-first' },

  // Practices
  'practices/cedar-evening-reflection': { practitionerId: 'cedar', title: 'Evening reflection' },
  'practices/cedar-breath-count': { practitionerId: 'cedar', title: 'Breath count' },
  'practices/harbor-body-scan': { practitionerId: 'harbor', title: 'Body scan' },
  'practices/harbor-gratitude-note': { practitionerId: 'harbor', title: 'Gratitude note' },

  // Practice configuration
  'practiceConfigs/_global': { description: 'Settings shared by every practitioner.' },
  'practiceConfigs/cedar/versions/cedar-v2': { practiceAccess: { enabled: false } },
  'practiceConfigs/cedar/versions/cedar-v3': { practiceAccess: { enabled: true } },
  'practiceConfigs/harbor/versions/harbor-v1': { practiceAccess: { enabled: true } },
};

/** Handy ids for tests and tools. */
export const FIXTURE = {
  cedar: {
    practitionerId: 'cedar',
    invitationToken: 'INV-CEDAR-AUTUMN',
    cohortId: 'cedar-autumn',
    practiceId: 'cedar-evening-reflection',
  },
  harbor: {
    practitionerId: 'harbor',
    invitationToken: 'INV-HARBOR-FIRST',
    cohortId: 'harbor-first',
    practiceId: 'harbor-body-scan',
  },
} as const;

export type FixturePractitioner = keyof typeof FIXTURE;
