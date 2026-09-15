/**
 * The activation gate. A pass here means the six required cases in
 * ACTIVATION_CONTRACT.md actually ran against a live emulator and proved their
 * outcomes. Anything less is a failure, including a case that never executed.
 *
 * The gate refuses to report success when:
 *   1. the required-case list no longer describes the contract table,
 *   2. the Firestore emulator is not reachable,
 *   3. the test run fails,
 *   4. a required case failed, was skipped, or did not run at all.
 *
 * This command attaches to an emulator that is already running and never starts
 * one. That keeps a missing dependency visible: stop the emulator and the gate
 * fails, with nothing restarting it underneath. Run the managed variant instead
 * when you want one command that supplies its own emulator.
 *
 * Arguments after the script are handed to Jest, so a reviewer can narrow the run
 * and watch the gate refuse the result. For example:
 *   npm run verify:activation -- -t cedar
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { requireEmulator } from '../src/emulator';
import {
  caseKey,
  parseScenarioTag,
  REQUIRED_CASES,
  REQUIRED_CASE_COUNT,
  REQUIRED_PRACTITIONERS,
  RequiredCase,
  SCENARIO_IDS,
} from '../verification/requiredScenarios';

const REPO_ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(REPO_ROOT, 'reports');
const RESULTS_FILE = path.join(REPORT_DIR, 'activation-results.json');
const COVERAGE_FILE = path.join(REPORT_DIR, 'activation-coverage.json');

type Outcome = 'passed' | 'failed' | 'skipped' | 'did not run';

interface Observed {
  outcome: Outcome;
  testName?: string;
}

/** Only the parts of the Jest report this gate reads. */
interface JestAssertion {
  status: string;
  fullName: string;
}

interface JestSuite {
  assertionResults?: JestAssertion[];
}

interface JestReport {
  success?: boolean;
  testResults?: JestSuite[];
}

function fail(heading: string, detail: string): never {
  console.error(`\nGATE FAILED: ${heading}`);
  console.error(detail.replace(/^/gm, '  '));
  process.exit(1);
}

/**
 * The required-case list must still describe the contract table. Without this a
 * dropped scenario or practitioner would quietly shrink what the gate asks for,
 * and the run would go green by requiring less.
 */
function checkManifestShape(): void {
  const expected = SCENARIO_IDS.length * REQUIRED_PRACTITIONERS.length;
  const keys = REQUIRED_CASES.map((c) => caseKey(c.scenarioId, c.practitionerId));
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);

  if (REQUIRED_CASES.length !== REQUIRED_CASE_COUNT || expected !== REQUIRED_CASE_COUNT) {
    fail(
      'the required-case list no longer matches the contract table',
      `ACTIVATION_CONTRACT.md lists ${REQUIRED_CASE_COUNT} cases: ` +
        `${SCENARIO_IDS.length} scenarios across ${REQUIRED_PRACTITIONERS.length} practitioners.\n` +
        `verification/requiredScenarios.ts currently describes ${REQUIRED_CASES.length}.\n` +
        'Restore the list, or update the contract and the expected count together.',
    );
  }
  if (duplicates.length) {
    fail('the required-case list repeats a case', duplicates.join('\n'));
  }
}

/** Confirm the emulator is answering. A missing dependency fails, it never skips. */
async function checkEmulator(): Promise<string> {
  try {
    const target = await requireEmulator();
    return `${target.host}:${target.port} (${target.projectId})`;
  } catch (error) {
    fail(
      'the Firestore emulator is not available',
      `${error instanceof Error ? error.message : String(error)}\n\n` +
        'The gate attaches to a running emulator on purpose and will not start one.\n' +
        'Start it with "npm run emulators" and export FIRESTORE_EMULATOR_HOST, or run\n' +
        '"npm run verify:activation:managed" to have one supplied for the run.',
    );
  }
}

/** Run the suite, asking Jest for machine readable results. */
function runTests(passThrough: string[]): JestReport {
  mkdirSync(REPORT_DIR, { recursive: true });
  rmSync(RESULTS_FILE, { force: true });

  const jestBin = require.resolve('jest/bin/jest');
  const args = [jestBin, '--json', `--outputFile=${RESULTS_FILE}`, ...passThrough];

  console.log(`\nRunning the suite: jest ${passThrough.join(' ')}`.trimEnd());
  const run = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    // Skipping the integration suite is not an option under the gate. The setup
    // step fails the run outright when the emulator is not reachable.
    env: { ...process.env, ACTIVATION_REQUIRE_EMULATOR: '1' },
  });

  if (!existsSync(RESULTS_FILE)) {
    fail(
      'the test run produced no results',
      `Jest exited with code ${run.status ?? 'unknown'} and wrote no report.\n` +
        'Nothing was proved, so the gate cannot pass.',
    );
  }
  return JSON.parse(readFileSync(RESULTS_FILE, 'utf8')) as JestReport;
}

/** Jest calls anything it did not run pending, todo or disabled. All of those are a skip here. */
function readOutcome(status: string): Outcome {
  if (status === 'passed') return 'passed';
  if (status === 'failed') return 'failed';
  return 'skipped';
}

/** Map each test that carries a scenario tag onto the case it claims to prove. */
function collectObserved(jestReport: JestReport): Map<string, Observed> {
  const observed = new Map<string, Observed>();
  for (const suite of jestReport.testResults ?? []) {
    for (const assertion of suite.assertionResults ?? []) {
      const tagged = parseScenarioTag(assertion.fullName);
      if (!tagged) continue;
      const key = caseKey(tagged.scenarioId, tagged.practitionerId);
      const outcome = readOutcome(assertion.status);
      const existing = observed.get(key);
      // A case counts as proved only if every test claiming it passed.
      if (!existing || existing.outcome === 'passed') {
        observed.set(key, { outcome, testName: assertion.fullName });
      }
    }
  }
  return observed;
}

interface CaseResult extends RequiredCase {
  outcome: Outcome;
  proved: boolean;
  testName?: string;
  row: string;
}

/** The outcome of every required case, in contract order. */
function summarise(observed: Map<string, Observed>): CaseResult[] {
  return REQUIRED_CASES.map((required) => {
    const seen = observed.get(caseKey(required.scenarioId, required.practitionerId));
    const outcome: Outcome = seen ? seen.outcome : 'did not run';
    const proved = outcome === 'passed';
    return {
      ...required,
      outcome,
      proved,
      testName: seen?.testName,
      row:
        `  ${proved ? 'PROVED  ' : 'NOT OK  '}` +
        `${required.scenarioId.padEnd(26)} ${required.practitionerId.padEnd(8)} ${outcome}`,
    };
  });
}

async function main(): Promise<void> {
  console.log('Activation gate: the six required cases from ACTIVATION_CONTRACT.md');

  checkManifestShape();
  const where = await checkEmulator();
  console.log(`Emulator: ${where}`);

  const results = runTests(process.argv.slice(2));
  const observed = collectObserved(results);
  const summary = summarise(observed);
  const notProved = summary.filter((entry) => !entry.proved).length;

  console.log('\nRequired cases');
  summary.forEach((entry) => console.log(entry.row));

  writeFileSync(
    COVERAGE_FILE,
    `${JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        emulator: where,
        requiredCases: summary.map(({ row, proved, ...entry }) => entry),
        suiteSuccess: results.success === true,
        passed: notProved === 0 && results.success === true,
      },
      null,
      2,
    )}\n`,
  );

  if (notProved > 0) {
    fail(
      `${notProved} of ${REQUIRED_CASE_COUNT} required cases were not proved`,
      'A case that failed, was skipped or never ran has proved nothing.\n' +
        `Coverage report: ${path.relative(REPO_ROOT, COVERAGE_FILE)}`,
    );
  }
  if (results.success !== true) {
    fail(
      'the test run reported a failure',
      'Every required case was proved, but something else in the suite failed.\n' +
        'The gate does not pass a run with failing tests.',
    );
  }

  console.log(
    `\nGATE PASSED: all ${REQUIRED_CASE_COUNT} required cases ran and proved their outcomes.`,
  );
  console.log(`Coverage report: ${path.relative(REPO_ROOT, COVERAGE_FILE)}`);
}

main().catch((error) => {
  const detail = error instanceof Error ? error.stack ?? error.message : String(error);
  fail('the gate could not complete', detail);
});
