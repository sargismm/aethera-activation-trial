/**
 * The six required cases from ACTIVATION_CONTRACT.md, in a form a program can read.
 * That document stays the authority. This file exists so the verification gate can
 * compare the cases that actually ran against the cases the contract requires.
 *
 * A required case that is filtered out, skipped or deleted has not proved anything,
 * so the gate treats it the same way it treats a failure.
 */

/** Scenario ids exactly as the contract names them. */
export const SCENARIO_IDS = [
  'activation.invitation',
  'activation.practitioner',
  'activation.practice-start',
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

/** Every scenario applies to both supplied practitioners. */
export const REQUIRED_PRACTITIONERS = ['cedar', 'harbor'] as const;

export type RequiredPractitioner = (typeof REQUIRED_PRACTITIONERS)[number];

export interface RequiredCase {
  scenarioId: ScenarioId;
  practitionerId: RequiredPractitioner;
}

/** Three scenarios across two practitioners: the six rows of the contract table. */
export const REQUIRED_CASES: readonly RequiredCase[] = REQUIRED_PRACTITIONERS.flatMap(
  (practitionerId) => SCENARIO_IDS.map((scenarioId) => ({ scenarioId, practitionerId })),
);

/**
 * How many rows that table has. Written out separately on purpose. If someone drops
 * a scenario id or a practitioner above, the gate notices that this list no longer
 * describes the contract instead of quietly asking for less.
 */
export const REQUIRED_CASE_COUNT = 6;

/** A stable key for one case, used in test names and in the coverage report. */
export function caseKey(scenarioId: string, practitionerId: string): string {
  return `${scenarioId}|${practitionerId}`;
}

/**
 * The tag a required test carries in its name, so that test output, the coverage
 * report and the contract all use the same words for the same case.
 */
export function scenarioTag(scenarioId: ScenarioId, practitionerId: RequiredPractitioner): string {
  return `[${scenarioId} ${practitionerId}]`;
}

const TAG_PATTERN = /\[(activation\.[a-z-]+) ([a-z-]+)\]/;

/** Read a case back out of a test name, when that name carries a tag. */
export function parseScenarioTag(testName: string): RequiredCase | undefined {
  const match = TAG_PATTERN.exec(testName);
  if (!match) return undefined;
  return {
    scenarioId: match[1] as ScenarioId,
    practitionerId: match[2] as RequiredPractitioner,
  };
}
