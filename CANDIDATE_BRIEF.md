# Paid trial: make our activation checks trustworthy

Aethera helps practitioners support people between sessions. Each practitioner has their own identity and practices inside the same app. We are hiring someone to own testing, infrastructure and delivery, and help make publishing another practitioner reliable.

**The situation:** Our checks passed, but a person joining a new practitioner could not start a practice. The original practitioner still works. You will receive an isolated TypeScript repository with fictional records, a local Firestore emulator, existing tests and GitHub Actions. It models the backend activation path. No mobile build or live service access is required.

**Your goal:** Make a passing pull-request check mean that the required activation scenarios actually ran and proved their outcomes for both supplied practitioners: invitation acceptance, the intended practitioner and a started practice. The activation contract explains those outcomes.

Please:

1. Run the existing checks, reproduce the failed activation and explain how it gets past the checks.
2. Strengthen the verification. Show a relevant check failing on the broken state, make the smallest appropriate repair and show that same check passing. Preserve the working practitioner and keep missing practice configuration off by default.
3. Provide one repeatable local verification command and run it in GitHub Actions. Missing dependencies or required scenarios that did not execute must fail, even when other tests pass. Also make it possible to run the checks against an emulator that is already running, so a missing dependency can be shown failing without a wrapper restarting it.

**Submit:** One pull request, commands to reproduce your result, a link to the Actions run for your submitted code, and concise evidence of the original false green, meaningful failure and repaired success. Also show the gate refusing to pass with an unavailable emulator and with a required scenario skipped or omitted.

Add a short write-up, about half a page: what was wrong and what a person joining would have experienced, what you changed, how you verified it, what remains unproven and roughly how long you spent. AI tools are welcome. Include one suggestion or generated change you independently checked, changed or rejected, and what informed your decision. If no such example arose, say so. Private tool conversations are not required.

**Time and payment:** Plan for approximately four hours at your agreed hourly rate, paid regardless of the hiring decision. We trust your approximate effort report; no timer or commit cutoff is required. A polished large submission is not the goal. If you see worthwhile further work, use your judgment and explain your choice. Additional time is not expected; flag a substantial overrun before continuing so we can agree scope and payment.

We care about trustworthy evidence, the person's outcome, dependable execution, clear communication and where you choose to spend effort. An honest limitation is useful information. Ask questions when an uncertainty matters, and state reasonable assumptions when you can proceed.

Use only the supplied sandbox and fictional records. Do not connect to live application services, add credentials or deploy anything. Follow the short orientation and setup guide. Report setup problems promptly so we can help. We will share clarifications that affect the task with both candidates.

Start with [README.md](README.md), then [ORIENTATION.md](ORIENTATION.md) and [ACTIVATION_CONTRACT.md](ACTIVATION_CONTRACT.md).
