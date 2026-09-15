# Activation contract

This is the behavior a practitioner's activation must have. The required scenarios below are what a passing check is supposed to mean.

## Required scenarios

Each scenario applies to both supplied practitioners, `cedar` and `harbor`, so there are six required cases. You may organize files and tests however you like, as long as a reviewer can see which check proves which of the six.

| Scenario id | Required outcome |
|---|---|
| `activation.invitation` | Accepting the practitioner's supplied invitation resolves the documented cohort and creates or binds the intended synthetic person to that cohort's practitioner. |
| `activation.practitioner` | Resolving that person returns the intended practitioner identity, not a generic success and not the other practitioner. |
| `activation.practice-start` | Starting one of the intended practitioner's practices returns `status: "started"`, identifies the same person, practitioner and practice, and a matching `practiceSessions` document exists. |

The six required cases are:

| # | Scenario id | Practitioner |
|---|---|---|
| 1 | `activation.invitation` | `cedar` |
| 2 | `activation.practitioner` | `cedar` |
| 3 | `activation.practice-start` | `cedar` |
| 4 | `activation.invitation` | `harbor` |
| 5 | `activation.practitioner` | `harbor` |
| 6 | `activation.practice-start` | `harbor` |

The supplied records for each practitioner:

| Practitioner | Invitation token | Cohort | Practice to start |
|---|---|---|---|
| `cedar` | `INV-CEDAR-AUTUMN` | `cedar-autumn` | `cedar-evening-reflection` |
| `harbor` | `INV-HARBOR-FIRST` | `harbor-first` | `harbor-body-scan` |

Seeded records have fixed ids. Generated values (session ids, timestamps) are not fixed; capture them from the response rather than expecting a particular value.

## HTTP interface

All requests and responses are JSON. The service runs in process (tests use Supertest; `npm run inspect:activation` listens on a random local port).

**Read the `status` field, not the HTTP code.** A domain refusal is deliberately HTTP 200 with `{"status": "refused", "reason": "..."}`. HTTP 200 on its own does not mean something succeeded. HTTP 400 means a malformed request. HTTP 500 means an unexpected failure.

### `POST /invitations/accept`

Request: `{"token": "INV-CEDAR-AUTUMN", "personId": "person-1"}`

Success: `{"status": "accepted", "personId": "person-1", "practitionerId": "cedar", "cohortId": "cedar-autumn"}`

Writes `people/person-1` the first time. Accepting again for the same practitioner changes nothing and succeeds.

Refusal reasons: `invitation_not_found`, `cohort_not_found`, `practitioner_not_found`, `practitioner_inactive`, `person_bound_to_other_practitioner`.

### `GET /people/:personId/practitioner`

Success: `{"status": "resolved", "personId": "person-1", "practitioner": {"id": "cedar", "displayName": "Cedar Grove Coaching", "configVersion": "cedar-v3"}}`

Refusal reasons: `person_not_found`, `practitioner_not_found`.

### `POST /practices/start`

Request: `{"personId": "person-1", "practiceId": "cedar-evening-reflection"}`

Success: `{"status": "started", "sessionId": "<generated>", "personId": "person-1", "practitionerId": "cedar", "practiceId": "cedar-evening-reflection"}`, and a document `practiceSessions/<sessionId>` with the same person, practitioner and practice.

Refusal reasons: `person_not_found`, `practitioner_not_found`, `practitioner_inactive`, `practice_not_found` (also returned when the practice belongs to another practitioner), `practice_unavailable` (practice access is not enabled for this practitioner). A refusal creates no session.

### `GET /health`

`{"status": "ok"}`. Does not touch the database.

## Data schema

| Collection | Document id | Fields | Meaning |
|---|---|---|---|
| `practitioners` | practitioner id | `displayName`, `active` (boolean), `configVersion` | Identity, whether it is live, which config version it uses |
| `cohorts` | cohort id | `practitionerId`, `name` | A group of people working with one practitioner |
| `invitations` | invitation token | `cohortId` | A synthetic invitation that resolves to a cohort |
| `people` | person id | `practitionerId`, `cohortId`, `invitationToken`, `acceptedAt` | A synthetic person bound to a practitioner by accepting an invitation |
| `practiceConfigs` | `_global` | `practiceAccess.enabled` (optional) | Settings shared by every practitioner |
| `practiceConfigs/{practitionerId}/versions` | config version | `practiceAccess.enabled` (optional) | Practitioner-specific settings for one config version |
| `practices` | practice id | `practitionerId`, `title` | A practice belongs to one practitioner |
| `practiceSessions` | generated | `personId`, `practitionerId`, `practiceId`, `configVersion`, `startedAt` | A successful start |

## Resolution order for practice access

When a person starts a practice, practice access is decided in this order. The first layer that sets `practiceAccess.enabled` to a boolean wins.

1. `practiceConfigs/{practitionerId}/versions/{configVersion}`, where `configVersion` comes from the practitioner record.
2. `practiceConfigs/_global`.
3. The code default, which is **off**.

Access must stay off for any practitioner that has not been given it. Turning it on for everyone is not an acceptable repair.

## Baseline and reset

`npm run seed` clears every document in the emulator and writes the baseline in `fixtures/baseline.ts`. It is safe to repeat. After a seed there are no `people` and no `practiceSessions`. Tests and inspection add people and sessions; seed again to return to the baseline.
