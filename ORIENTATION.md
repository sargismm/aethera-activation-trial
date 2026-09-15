# Orientation

## The product in a paragraph

Aethera helps practitioners (coaches, therapists, teachers) support the people they work with between sessions. One mobile app presents a different practitioner identity, set of practices and experience to each person, and which one a person sees is decided by data and configuration, not by a separate app. Publishing another practitioner should become repeatable and provable. This sandbox models only the backend part of that: a person accepts an invitation, is bound to a practitioner, and starts one of that practitioner's practices.

## House rules

These apply to anything you write here: code, docs, commits and pull request text.

- Write "person" in product copy, never "user".
- No em dashes in authored code, docs, commits or copy. Use a period, comma, colon, or restructure the sentence.
- No AI references in person-facing product language. Talking about your own tools in your write-up is fine and expected.
- Keep secrets out of source, logs and commits. This sandbox needs none.
- Prefer an honest failure to an unproven success. A check that has never been seen to fail has not yet shown it can catch anything.
- New behavior defaults off.

Do not apply the prose rules mechanically to third-party API names or lockfile contents you did not write.

## How changes reach people

We use five words for what a change needs in order to reach people. This is context for how we think, not additional work.

| Term | Meaning | Typical reversal |
|---|---|---|
| DATA | Change stored configuration or content | Restore the prior document or content |
| CEREMONY | Build or seal a versioned pack, then switch its pointer in a defined order | Restore the prior pointer |
| SERVER DEPLOY | Release backend code or environment changes | Deploy the previous release |
| WEB DEPLOY | Release the web entry flow | Revert and redeploy the prior web version |
| CLIENT BUILD | Build and distribute a new mobile binary | No immediate rollback for people who already updated |

Publishing a practitioner should need less client release work over time. This sandbox only asks for local data, test and workflow changes. A local success here does not authorize activating anything in production.

## What this sandbox does not model

Authentication, real consent, the web-to-app handoff, the mobile app and its rendering, billing, crisis handling, voice and any model calls. The invitation is what establishes the practitioner relationship here. Do not add any of those.
