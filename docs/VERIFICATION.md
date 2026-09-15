# The activation gate

## What a pass means

`GATE PASSED` means all six required cases in [ACTIVATION_CONTRACT.md](../ACTIVATION_CONTRACT.md)
ran against a live Firestore emulator and proved their outcomes. Nothing weaker counts.
A case that failed, was skipped, or never executed has proved nothing, so the gate
treats all three the same way it treats a failure.

This is deliberately stronger than "the tests passed". A suite can report success
while a required case never ran, which is how the original defect reached a green
check. The gate closes that gap by comparing the cases that actually ran against
the contract's list.

## The two commands

| Command | Emulator | Use it for |
|---|---|---|
| `npm run verify:activation:managed` | Supplies its own, then stops it | One repeatable command from a fresh clone. This is what GitHub Actions runs |
| `npm run verify:activation` | Attaches to one that is already running | The two terminal flow in the README, and for showing a missing dependency fail |

`npm run verify:activation` never starts an emulator. That is the point: a wrapper
that always starts one can never show what happens when the dependency is missing.
Stop the emulator, run the command, and the gate fails with nothing restarting it
underneath.

```sh
# Terminal one
npm run emulators

# Terminal two
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8085
npm run verify:activation
```

Arguments after the script reach Jest, so you can narrow a run and watch the gate
refuse the result:

```sh
npm run verify:activation -- -t cedar
```

## What makes the gate fail

| Condition | How it is caught |
|---|---|
| The emulator is not reachable | Checked before any test runs, with the next step printed. The suite also refuses to skip: `ACTIVATION_REQUIRE_EMULATOR=1` turns the skip in `tests/support/globalSetup.ts` into a failure |
| A required case failed | The case is reported as `failed` |
| A required case was skipped or filtered out | The case is reported as `skipped` |
| A required case never ran | The case is reported as `did not run` |
| Another test in the suite failed | The run is refused even when all six cases passed |
| The required-case list stopped describing the contract | `REQUIRED_CASE_COUNT` is written out separately from the derived list, so dropping a scenario or a practitioner fails instead of quietly asking for less |

## How a case is tied to a check

Every required test carries its scenario id and practitioner in its name, for example
`[activation.practice-start harbor]`. `scripts/verify-activation.ts` reads those tags
back out of the Jest report and matches them against
[`verification/requiredScenarios.ts`](../verification/requiredScenarios.ts), which is
the contract table in a form a program can read.

Each run writes `reports/activation-coverage.json`, naming the test that proved each
of the six cases. GitHub Actions keeps that file as a build artifact, so a reviewer
can see which check proved which row without rerunning anything.

## Known limits

The required-case list is the specification the gate enforces. An edit that removes a
case from both that list and the tests would lower the bar rather than fail, which is
why the expected count is stated separately and belongs in review. The gate proves the
six supplied cases, not that a third practitioner would be caught.
