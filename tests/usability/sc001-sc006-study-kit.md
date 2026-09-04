# SC-001 / SC-006 Evaluation Kit

[日本語](sc001-sc006-study-kit.ja.md)

How one evaluation run is performed. The measured criteria are `SC-001` and `SC-006` in
[`spec.md`](../../specs/001-inspect-agent-customizations/spec.md), and what the run must
record is in
[`validation.md`](../../specs/001-inspect-agent-customizations/validation.md). This file is
the operator's side: who takes part, what they are told, and what is written down.

## Who takes part

Twenty independent autonomous agents, in one run, each attempting SC-001 first, then SC-006,
then the two remaining workflow tasks. The same twenty serve both criteria.

They are agents rather than people because twenty first-use participants are not available
to this project. That is a limit on what the run establishes, not a detail of how it is
staged: it measures whether the product's own guidance is sufficient to reach a file and to
state what the product says about it, and it establishes nothing about how a person
experiences the same interface. Every record of it says so.

Once a session is enrolled it stays in the results. There is no replacement and no exclusion
— not for an environment fault, not for a product fault. Each of those counts as an
unsuccessful result for the criterion it interrupted.

## What each session is given

A folder of its own and the guide. The folder holds the all-kind fixture as `repository/`,
built in place by `tests/fixtures/repositories/build-fixtures.ts` — the tree
[`ground-truth.json`](sc001-sc006-study-inputs/ground-truth.json) is written against — with
the release candidate's package installed where `npx --no-install` finds it from that
directory. The guide is [`guidance.md`](sc001-sc006-study-inputs/guidance.md), verbatim. No
selector, no route, no description of the interface, and no access to this repository — a
session that reads the source is measured on having read the answer rather than on having
found it.

Nothing of this repository may be in a session's runtime either. SC-001 admits no hint beyond
what the product prints or renders, and a session started inside this working tree carries
the repository's own instructions and memory before it begins, which name the product's
surfaces. A session is therefore started outside this working tree, with no project
instructions and no memory of it in view; only the browser automation it drives may be
loaded from here.

Each session launches its own Inspector from its own `repository/`, so twenty sessions are
twenty launches and twenty consent states, and no session meets another's. The moderator's
equipment may append `--port 0` to the guide's command, because the default port is this
machine's owner's, and may set `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, and `HOME`
for the launch command alone, pointing the personal-setup consent at fixture homes built by
`tests/fixtures/global-homes/build-fixtures.ts`; both are stated to the session as equipment
conditions rather than as guidance.

## What may be said

The four standardized prompts — `task-prompt-sc001.md`, `task-prompt-sc006.md`,
`task-prompt-comparison.md`, and `task-prompt-consent.md` — may be repeated verbatim as often
as a session asks.

Nothing else. No command, no selector, no route, no confirmation that a step was right, no
correction of a wrong turn. This holds for every task in the run, timed or not.

## SC-001 — discovery

The session launches the Inspector and opens one customization file it discovered.

The timer starts when the prompt is presented and stops when the source or details view for
one discovered file is visibly open and operable. Reaching the Inspector through the URL the
command printed is inside the timed interval and is part of the guidance the session was
given.

Two minutes. At least 19 of the 20 must succeed.

## SC-006 — inspection

Every session begins from the same designated file, whatever happened in SC-001. The timer
starts when that state is ready and the prompt is presented.

The session records three fields: the file's source, the tools that recognize it, and its
file type. All three must be submitted within two minutes and all three must match
[`ground-truth.json`](sc001-sc006-study-inputs/ground-truth.json). A missing or wrong field is
an unsuccessful result, with no partial credit.

Two minutes. At least 18 of the 20 must succeed.

## Remaining workflows

After the timed SC-006 response, all 20 sessions attempt the comparison task and the
personal-setup task, read from `task-prompt-comparison.md` and `task-prompt-consent.md` under
the same no-hints policy. These are not timed; what a completed attempt looks like is in
`ground-truth.json` under `workflows`.

With SC-001's discovery observation and SC-006's timed inspection, the four primary workflows
are then covered for every session.

## What is recorded

For every session, in every case:

- the four objective workflow-completion outcomes;
- the timed intervals for SC-001 and SC-006;
- the predefined safety-event fields.

Scoring uses [`scoring-rubric.json`](sc001-sc006-study-inputs/scoring-rubric.json), read
against the response and the ground truth. The result goes into `validation.md` and
`validation.ja.md`, per session, without exclusion or replacement.

Safety is observed from what each session can see for itself: the requests its own browser
issued, and the state of the inspected tree. The same property is asserted under its own
gates by the automated FR-022 and User Story suites, which is why no separate instrumentation
exists here.

## Reading the result

SC-001 passes at 19 successes, SC-006 at 18. A run that misses a threshold is still a valid
run — it is not repeated to obtain a better number, and the release decision is made
separately from it.
