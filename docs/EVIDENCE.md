# Evidence

Every block below is output from a real run on the repaired branch, with files
temporarily reverted where a broken state was needed. The emulator is the local
Firestore emulator on `127.0.0.1:8085`; nothing here touches a live service.

To reproduce all of it:

```sh
npm ci
npm run emulators                              # terminal one, wait for "All emulators ready"

export FIRESTORE_EMULATOR_HOST=127.0.0.1:8085  # terminal two
npm run verify:activation                      # the gate, green on this branch
npm run verify:activation -- -t cedar          # the gate refusing an incomplete run
```

From a fresh clone with no emulator running, one command does the whole thing:

```sh
npm ci && npm run verify:activation:managed
```

## 1. How the failed activation got past the checks

Three separate things had to be true for a broken activation to reach a green check.
They are independent, and each one on its own is enough to let a defect through, so
all three are closed rather than just the one that happened to fire here.

### The starter check, passing on the broken state

The starter test file and the starter baseline, both restored from `main`.

```
$ npm test
Test Suites: 5 passed, 5 total
Tests:       23 passed, 23 total
exit code: 0

Per test, from the same run:
  passed  activation path against the emulator cedar accepting the invitation binds the person to the practitioner
  passed  activation path against the emulator cedar resolving the person returns their practitioner
  passed  activation path against the emulator cedar starting a practice succeeds
  passed  activation path against the emulator harbor accepting the invitation binds the person to the practitioner
  passed  activation path against the emulator harbor resolving the person returns their practitioner
  passed  activation path against the emulator harbor starting a practice succeeds
```

The last line is the false green. `harbor starting a practice succeeds` passed while
the start was refused and no session was written. What was actually happening on the
same data:

```
$ npm run inspect:activation -- --practitioner harbor
3. Start practice
  POST /practices/start {"personId":"inspect-harbor","practiceId":"harbor-body-scan"}
  HTTP 200  {"status":"refused","reason":"practice_unavailable"}

practiceSessions for inspect-harbor: 0
```

A person joining harbor could accept the invitation and see the right practitioner,
then nothing happened when they started a practice.

### Layer 1: the check read the HTTP code, not the outcome

`tests/integration/activation.test.ts` on `main`:

```ts
    it('starting a practice succeeds', async () => {
      const res = await request(app)
        .post('/practices/start')
        .send({ personId, practiceId: fixture.practiceId });

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });
```

`ACTIVATION_CONTRACT.md` is explicit that a domain refusal is deliberately HTTP 200
carrying `{"status": "refused"}`, and says to read the `status` field rather than the
HTTP code. This check reads only the HTTP code. The refused response is a 200 and its
body is defined, so both assertions hold and the test named "succeeds" passes on a
refusal. It also never asserts the returned practitioner or practice, and never looks
for the `practiceSessions` document that the contract says makes a start real.

Worth noting what is not wrong here. The invitation and practitioner checks for both
practitioners were soundly written and genuinely passed. Only the third assertion was
hollow, so reading the file quickly gives no sense that anything is missing.

### Layer 2: the pull request check never ran the tests

`.github/workflows/checks.yml` on `main`, in full:

```yaml
jobs:
  typecheck:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run typecheck
```

One job, and it compiles. `npm run typecheck` passes on this repository whatever the
data says, because the defect is a missing document rather than a type error. So the
weak check in layer 1 never ran on a pull request at all. Even a perfectly written
test suite would have proved nothing here.

### Layer 3: a missing emulator was a skip, not a failure

`tests/support/globalSetup.ts` probed the emulator port and recorded the answer, and
`tests/support/emulator.ts` swapped `describe` for `describe.skip` when it was absent.
Measured on the starter files:

```
$ env -u FIRESTORE_EMULATOR_HOST npx jest
[setup] Firestore emulator not available, integration tests will be skipped: FIRESTORE_EMULATOR_HOST is not set. This sandbox only runs against the local Firestore emulator. Start it with "npm run emulators", then run: export FIRESTORE_EMULATOR_HOST=127.0.0.1:8085
Test Suites: 1 skipped, 4 passed, 4 of 5 total
Tests:       6 skipped, 17 passed, 23 total
exit code: 0
```

The entire integration suite disappeared and the run still exited 0. The skip is
announced in a `[setup]` line that nothing enforces. So even after fixing layer 1 and
wiring the tests into CI, a runner without Java, a changed port, or an emulator that
failed to start would have produced a green check with nothing verified.

### Why all three had to be closed

Fixing only the assertion leaves a gate that passes when no emulator is present.
Fixing only the workflow leaves a gate that passes on a refusal. Fixing only the skip
leaves both of the others. The sections below show the repaired check failing and
passing, and then the gate refusing each of the remaining two ways.

## 2. A meaningful failure on the broken state

The strengthened checks against the unrepaired baseline.

```
$ npm run verify:activation
Activation gate: the six required cases from ACTIVATION_CONTRACT.md
Emulator: 127.0.0.1:8085 (demo-aethera-trial)
Running the suite: jest
 FAIL  tests/integration/activation.test.ts
  ● required activation scenarios › harbor › [activation.practice-start harbor] starting the practice returns started and writes a matching session
    expect(received).toBe(expected) // Object.is equality
    Expected: "started"
    Received: "refused"
    > 90 |       expect(res.body.status).toBe('started');
         |                               ^
Test Suites: 1 failed, 4 passed, 5 total
Tests:       1 failed, 23 passed, 24 total
Snapshots:   0 total
Time:        0.506 s, estimated 1 s
Ran all test suites.
Test results written to: reports/activation-results.json
Required cases
  PROVED  activation.invitation      cedar    passed
  PROVED  activation.practitioner    cedar    passed
  PROVED  activation.practice-start  cedar    passed
  PROVED  activation.invitation      harbor   passed
  PROVED  activation.practitioner    harbor   passed
  NOT OK  activation.practice-start  harbor   failed
GATE FAILED: 1 of 6 required cases were not proved
  A case that failed, was skipped or never ran has proved nothing.
  Coverage report: reports/activation-coverage.json
exit code: 1
```

The failure names the contract row it belongs to rather than only a file and a line.

## 3. The same check after the repair

The repair is one document, `practiceConfigs/harbor/versions/harbor-v1`, in
`fixtures/baseline.ts`. The global config and the code default are untouched.

```
$ npm run verify:activation
Activation gate: the six required cases from ACTIVATION_CONTRACT.md
Emulator: 127.0.0.1:8085 (demo-aethera-trial)
Running the suite: jest
Test Suites: 5 passed, 5 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        0.497 s, estimated 1 s
Ran all test suites.
Test results written to: reports/activation-results.json
Required cases
  PROVED  activation.invitation      cedar    passed
  PROVED  activation.practitioner    cedar    passed
  PROVED  activation.practice-start  cedar    passed
  PROVED  activation.invitation      harbor   passed
  PROVED  activation.practitioner    harbor   passed
  PROVED  activation.practice-start  harbor   passed
GATE PASSED: all 6 required cases ran and proved their outcomes.
Coverage report: reports/activation-coverage.json
exit code: 0
```

`practice access default refuses a practitioner that has no practice configuration`
is part of the 24 that passed. It creates an unconfigured practitioner during the run
and asserts the start is still refused, so a repair that turned access on for everyone
would have failed here.

## 4. The gate refusing an unavailable emulator

```
$ unset FIRESTORE_EMULATOR_HOST
$ npm run verify:activation
Activation gate: the six required cases from ACTIVATION_CONTRACT.md
GATE FAILED: the Firestore emulator is not available
  FIRESTORE_EMULATOR_HOST is not set. This sandbox only runs against the local Firestore emulator. Start it with "npm run emulators", then run: export FIRESTORE_EMULATOR_HOST=127.0.0.1:8085
  
  The gate attaches to a running emulator on purpose and will not start one.
  Start it with "npm run emulators" and export FIRESTORE_EMULATOR_HOST, or run
  "npm run verify:activation:managed" to have one supplied for the run.
exit code: 1
```

`npm run verify:activation` attaches to a running emulator and never starts one, so
this failure is reachable without a wrapper restarting the dependency underneath.
Pointing it at a closed port fails the same way:

```sh
$ FIRESTORE_EMULATOR_HOST=127.0.0.1:9999 npm run verify:activation
GATE FAILED: the Firestore emulator is not available
  Nothing is listening on 127.0.0.1:9999. ...
exit code: 1
```

The suite refuses to skip as well as the gate refusing to run. `ACTIVATION_REQUIRE_EMULATOR=1`,
which the gate always sets, turns the skip in `tests/support/globalSetup.ts` into a
failure, so calling Jest directly cannot skip its way to a pass:

```sh
$ env -u FIRESTORE_EMULATOR_HOST npx jest                               # exit 0, skipped
$ env -u FIRESTORE_EMULATOR_HOST ACTIVATION_REQUIRE_EMULATOR=1 npx jest # exit 1
Error: Jest: Got error running globalSetup ... This run requires the Firestore
emulator and cannot skip the integration tests
```

## 5. The gate refusing a required scenario that did not run

```
$ npx jest -t cedar
exit code: 0          Jest reports this run as a pass

$ npm run verify:activation -- -t cedar
Activation gate: the six required cases from ACTIVATION_CONTRACT.md
Emulator: 127.0.0.1:8085 (demo-aethera-trial)
Running the suite: jest -t cedar
Test Suites: 4 skipped, 1 passed, 1 of 5 total
Tests:       21 skipped, 3 passed, 24 total
Snapshots:   0 total
Time:        0.315 s, estimated 1 s
Ran all test suites with tests matching "cedar".
Test results written to: reports/activation-results.json
Required cases
  PROVED  activation.invitation      cedar    passed
  PROVED  activation.practitioner    cedar    passed
  PROVED  activation.practice-start  cedar    passed
  NOT OK  activation.invitation      harbor   skipped
  NOT OK  activation.practitioner    harbor   skipped
  NOT OK  activation.practice-start  harbor   skipped
GATE FAILED: 3 of 6 required cases were not proved
  A case that failed, was skipped or never ran has proved nothing.
  Coverage report: reports/activation-coverage.json
exit code: 1

$ npm run verify:activation -- --testPathPatterns tests/unit
Required cases
  NOT OK  activation.invitation      cedar    did not run
  NOT OK  activation.practitioner    cedar    did not run
  NOT OK  activation.practice-start  cedar    did not run
  NOT OK  activation.invitation      harbor   did not run
  NOT OK  activation.practitioner    harbor   did not run
  NOT OK  activation.practice-start  harbor   did not run

GATE FAILED: 6 of 6 required cases were not proved
  A case that failed, was skipped or never ran has proved nothing.
exit code: 1
```

The first two lines are the point. Jest reports a filtered run as a pass because
everything that ran passed. The gate refuses it, because three required cases proved
nothing. The second command shows the same refusal when the integration suite never
loads at all.
