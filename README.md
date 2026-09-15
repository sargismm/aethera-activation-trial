# Aethera activation trial

This repository is an isolated, fictional model of how a person is activated with one of our practitioners: accept an invitation, get bound to the right practitioner, start one of that practitioner's practices. It is a small TypeScript HTTP service over a local Firestore emulator, with existing checks and a GitHub Actions workflow. Your assignment is in [CANDIDATE_BRIEF.md](CANDIDATE_BRIEF.md). Product context and house rules are in [ORIENTATION.md](ORIENTATION.md). The required behavior is in [ACTIVATION_CONTRACT.md](ACTIVATION_CONTRACT.md).

Nothing here talks to a cloud service. The code refuses to run against anything other than a local emulator and a `demo-` project, and it needs no credentials or logins.

## 1. Versions and prerequisites

| Tool | Required | Tested |
|---|---|---|
| Node.js | 22 or newer (24 LTS recommended, see `.nvmrc`) | 26.7.0 on macOS; 24 on the GitHub-hosted Ubuntu runner |
| npm | comes with Node | 11.19.0 |
| Java (JDK) | 21 or newer, for the Firestore emulator | OpenJDK 26.0.2 on macOS; Temurin 21 on the Ubuntu runner |
| Firebase CLI | installed locally by `npm ci` (15.30.0); no global install needed | 15.30.0 |

Install references: Node from [nodejs.org](https://nodejs.org/) or a version manager such as `nvm`; a JDK from [adoptium.net](https://adoptium.net/) (Temurin 21) or `brew install openjdk@21` on macOS.

Tested platforms: macOS (Apple silicon) and the GitHub-hosted `ubuntu-latest` runner. Other Linux distributions should behave like the runner but were not tried. Windows was not tested; the npm scripts are cross-platform, but the `export` lines below are for macOS and Linux shells.

The first setup needs network access: `npm ci` downloads packages, and the first emulator start downloads the Firestore emulator jar (about 130 MB) into `~/.cache/firebase/emulators`. The service, seed, inspection and tests only ever talk to the emulator on your machine. The Firebase CLI itself may contact Firebase for its own notices when it starts. Working fully offline after setup was not tested.

## 2. Setup and the existing checks

**Terminal one**, from a fresh clone:

```sh
git clone <your repository url> aethera-activation-trial
cd aethera-activation-trial
npm ci
npm run doctor
npm run emulators
```

Leave the emulator running. It is ready when it prints `All emulators ready`. It listens on `127.0.0.1:8085` and keeps data in memory only, so stopping it (Ctrl+C) discards everything.

**Terminal two**, in the same directory:

```sh
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8085
npm run seed
npm run typecheck
npm test
npm run inspect:activation -- --practitioner cedar
npm run inspect:activation -- --practitioner harbor
```

What each command does:

| Command | What it does |
|---|---|
| `npm ci` | Installs the exact dependency set in `package-lock.json` |
| `npm run doctor` | Checks Node, Java and the local Firebase CLI, and whether the emulator is up. Prints a next step for anything wrong |
| `npm run emulators` | Starts only the Firestore emulator on `127.0.0.1:8085` for project `demo-aethera-trial` |
| `npm run seed` | Clears the emulator and writes the baseline fixture. Safe to repeat |
| `npm run typecheck` | Compiles the TypeScript without running anything. Says nothing about whether activation works |
| `npm test` | Runs the existing unit and integration tests |
| `npm run inspect:activation -- --practitioner <id>` | Walks one practitioner's activation against the emulator and prints each request, response and the resulting session records. It shows what happened; it does not judge readiness |

**These are the existing checks, not the verification your assignment asks for.** A pass from `npm test` or from the current workflow does not establish that activation works. Part of the assignment is deciding what a pass should mean and building the command that proves it.

You can rerun any of these as often as you like without a fresh clone. `npm run seed` returns the data to the baseline.

## 3. File map

| Path | What is there |
|---|---|
| `src/app.ts` | The HTTP routes |
| `src/activation.ts` | The activation logic: accept, resolve, start |
| `src/practiceAccess.ts` | How practice access is resolved from configuration |
| `src/config.ts`, `src/db.ts`, `src/emulator.ts` | The local-only connection guard, the Firestore client, emulator helpers |
| `src/model.ts`, `src/validate.ts` | Collection names, document shapes, request validation |
| `fixtures/baseline.ts`, `fixtures/seed.ts` | The baseline data and the reset that writes it |
| `scripts/` | `doctor`, `seed` and `inspect:activation` |
| `tests/unit/` | Tests that need no emulator |
| `tests/integration/` | Tests that run against the emulator |
| `tests/support/` | Jest setup shared by the tests |
| `.github/workflows/checks.yml` | The current pull-request workflow |
| `.github/pull_request_template.md` | The template your pull request should follow |

## 4. Interface, schema and reset

The endpoints, example requests and responses, the schema, the practice-access resolution order and the six required cases are in [ACTIVATION_CONTRACT.md](ACTIVATION_CONTRACT.md). In short:

- `POST /invitations/accept` with `{"token", "personId"}` binds a person to the invitation's practitioner.
- `GET /people/:personId/practitioner` returns that person's practitioner.
- `POST /practices/start` with `{"personId", "practiceId"}` starts a practice and writes a `practiceSessions` document.
- A domain refusal is HTTP 200 with `{"status": "refused", "reason": "..."}`. Read the `status` field.

State: after `npm run seed` there are no people and no practice sessions. The integration tests seed before they run. `inspect:activation` leaves a `people/inspect-<practitioner>` document and, when a start succeeds, one session per run; seed again to clear them.

## 5. Troubleshooting

| Symptom | Likely cause | Next step |
|---|---|---|
| `doctor` reports Java missing or older than 21 | No JDK, or an old one first on `PATH` | Install JDK 21 or newer and check `java -version` in a new terminal |
| `doctor` reports Node older than 22 | Old Node | Install Node 24 (`nvm install` reads `.nvmrc`) |
| `npm run emulators` pauses on first run | It is downloading the emulator jar | Wait; it is cached for next time. If you are offline, connect once |
| `Could not start Firestore Emulator, port taken` | Another emulator or program is on 8085 | `lsof -i :8085` to find it, then stop it. `doctor` tells you whether the port holds an emulator |
| `seed` or `inspect` says `FIRESTORE_EMULATOR_HOST is not set` | Terminal two has no emulator variable | `export FIRESTORE_EMULATOR_HOST=127.0.0.1:8085` in that terminal |
| `seed` or `inspect` says `Nothing is listening on 127.0.0.1:8085` | The emulator is not running | Start it in terminal one and wait for `All emulators ready` |
| `npm test` says integration tests will be skipped | Same as the two rows above | Set the variable and start the emulator |
| Results look left over from an earlier run | Data persists while the emulator runs | `npm run seed`, or restart the emulator |
| `npm ci` fails | Node too old, or a partial install | Check `doctor`, delete `node_modules`, run `npm ci` again. npm 11 may print a note that some install scripts were not run; that is expected and harmless here |
| Actions does not start on your pull request | Actions disabled, or the workflow file has a syntax error | Check the repository's Actions tab. Tell us if Actions is disabled; you should not need to change repository settings |

## 6. Submitting

1. Create a branch from `main`, commit your work there, and push it.
2. Open one pull request into `main`. The template asks for the problem and change, how to reproduce your result, evidence, what remains unproven, one tool-verification example, and your approximate effort.
3. Put evidence in the pull request description, or in a short file in the repository that the description links to. Command output pasted as text is ideal. No screenshots or recordings are needed.
4. Link the GitHub Actions run for your final commit. A green run shows that the workflow, as written in that commit, passed on a clean runner. It does not by itself show which checks ran or that branch rules require it, which is why the run should be tied to the commit you submit. Each run's page shows the commit it tested; include that short commit id next to the link.

Please do not change repository settings or branch rules. We are looking for a working pull-request check, not repository administration.
