# Vendor Integration Requirements Checklist: Support Gemini CLI

[日本語](vendor-integration.ja.md)

**Purpose**: Validate that the requirements for adding Gemini CLI — its read allowlist and evidence, the parent specification's amendments, the fifth Global member, and the documentation and release-evidence obligations — are complete, precise, consistent, and measurable before task generation
**Created**: 2026-09-10
**Feature**: [Support Gemini CLI specification](../spec.md)
**Depth**: Standard
**Audience / Timing**: The author, before `/speckit-tasks`

**Note**: This checklist evaluates the quality of the written requirements. It does not test product behavior or implementation conformance.

## Requirement Completeness

- [x] CHK001 Does every location FR-002 and FR-010 admit have a documented vendor behavior row, an Inspector rule row, and a cited official heading in the vendor contract, with no admitted path resting on analogy alone? [Completeness, Spec §FR-002, §FR-010; Contract §Inspector Repository rules, §Inspector Global rule]
- [x] CHK002 Does every exclusion FR-003 and FR-010 name carry its stated reason and a behavior record in the contract's excluded groups, so a reader can tell an omission from a decision? — the credential, session, and temporary-file categories follow the Codex precedent: named in the excluded group and in the parent's FR-018, with behavior records only for the documented trust record and environment files [Completeness, Spec §FR-003, §FR-010; Contract §Relationship-only and excluded groups]
- [x] CHK003 Are all eight kinds Gemini CLI publishes named together with their row unit — the file, the declared name, the `:`-joined path, the declared server name? [Completeness, Spec §FR-006–FR-009; Data Model §Compiled units]
- [x] CHK004 Does FR-001 enumerate every parent-specification clause that changes from three tools or four members, and does research § 10 list the same set — including data-model, http-api, readme, study inputs, and `validation.md` — with no artifact named in one place only? — satisfied 2026-09-10 by adding the parent data model's root-capture and consent-preview entities and the session API contract's consent preview to FR-001 [Completeness, Spec §FR-001; Research §10]
- [x] CHK005 Are Gemini CLI's managed and runtime-state exclusions for the parent's FR-018 spelled in the same categories the other vendors use — installed copies, trust record, environment files, credentials, session and history state, temporary files? [Completeness, Spec §FR-010]
- [x] CHK006 Is the third recognition on `.agents/skills/` stated for both the repository and the shared agent home, and is `docs/which-files-are-listed` named as the owner of the "Read by" statement? [Completeness, Spec §FR-002, §FR-012, §QR-004]
- [x] CHK007 Does each of the eight strategy records carry operations and a cited basis, including the one whose resolution is `unknown`? [Completeness, Data Model §Vendor registry records; Contract §Canonical evidence-assessment index]

## Requirement Clarity

- [x] CHK008 Is "in any directory" for the context file bounded explicitly — the selected root and below, the parent walk above the root excluded, and the walk's own exclusions (`node_modules`, VCS internals) inherited rather than restated? [Clarity, Spec §FR-002, §FR-005, Edge Cases]
- [x] CHK009 Is the `GEMINI_CLI_HOME` derivation stated for each lexical state — absent, eligible, present-empty, relative, invalid — with classification preceding the join, so no state is left to inference? [Clarity, Spec §FR-011, Edge Cases; Data Model §GlobalRootInputCapture]
- [x] CHK010 Is the accepted `context.fileName` grammar exact — a non-empty string, or a non-empty array of non-empty strings — and is every other shape (empty string, empty array, mixed array, another type) assigned exactly one outcome? [Clarity, Spec §FR-004, Edge Cases]
- [x] CHK011 Is the command-name derivation stated for a direct child and for a nested path, including which separator is joined with `:` given that the product stores entry names joined with `/`? [Clarity, Spec §FR-006]
- [x] CHK012 Is "one carrier recognized three times" stated so a reader knows the settings file appears once as a file and reaches three kinds without a duplicate row? [Clarity, Spec §FR-009]
- [x] CHK013 Is the skill row naming rule — declared `name`, directory as fallback — stated as the parent's is, and is it clear that the vendor's guidance that the name should match the directory is not something the product enforces? — satisfied 2026-09-10 by stating in FR-007 that the inspector does not check the vendor's name-matches-directory guidance [Clarity, Spec §FR-007]
- [x] CHK014 Is `Gemini CLI` fixed as the one display spelling on every surface, with no alternative (`Google Gemini CLI`, `gemini`) appearing in any user-facing text requirement? [Clarity, Spec §FR-001, §Clarifications]

## Requirement Consistency

- [x] CHK015 Is FR-002's instructions clause phrased so it does not imply a static `GEMINI.md` rule beside the derivation, given that the plan builds one derived rule that owns the default? [Consistency, Spec §FR-002; Research §2; Contract §Derived Repository rules]
- [x] CHK016 Do FR-004 ("configures nothing, `GEMINI.md` stays") and User Story 3 scenario 3 (parse failure, `GEMINI.md` as if absent) state the same outcome, including which recognition carries the diagnostic? [Consistency, Spec §FR-004, US3]
- [x] CHK017 Does FR-009's hook recognition by matcher, whatever the `hooks` object declares, agree with User Story 1 scenario 3 and with the Claude and Codex precedent it cites? [Consistency, Spec §FR-009, US1]
- [x] CHK018 Do the member order in FR-011, the Assumptions, and the data-model's five-member tuple agree? [Consistency, Spec §FR-011, Assumptions; Data Model §GlobalMemberId and the member tuple]
- [x] CHK019 Is Copilot's root `GEMINI.md` recognition described identically — kept, root only — in FR-013, User Story 1 scenarios 1–2, and User Story 3 scenario 1? [Consistency, Spec §FR-013]
- [x] CHK020 Do the kinds in the contract's presentation allowlist match the kinds the requirements publish — no `plugin`, no `rule`, `permissions` for the Global member alone? [Consistency, Contract §Normative initial-release presentation allowlist; Spec §FR-002, §FR-010]
- [x] CHK021 Are the parser-format decision and its trailing-comma caveat stated the same way in research § 6 and the contract, and kept out of the user-facing documentation requirements where they would be noise? [Consistency, Research §6; Contract §Inspector Repository rules; Spec §QR-004]

## Acceptance Criteria Quality

- [x] CHK022 Can SC-001 be measured from a named fixture set alone — does it fix the expected recognition count per file (two on the root `GEMINI.md`, three on `.agents/skills/`)? [Measurability, Spec §SC-001]
- [x] CHK023 Does SC-002 define "a near-miss for every selector family" concretely enough to enumerate the fixtures — which families, which near misses? [Measurability, Spec §SC-002]
- [x] CHK024 Does SC-003 state the four `GEMINI_CLI_HOME` states and the expected root and classification per state in a form a test can be read off from? — satisfied 2026-09-10 by pointing SC-003 at the parent's Closed Global Root Admission Outcomes table, FR-011, and data-model.md § GlobalRootInputCapture [Measurability, Spec §SC-003; Data Model §GlobalRootInputCapture]
- [x] CHK025 Does SC-005 name the containment gate as its measurement and also cover the derived rule's `GEMINI.md` and `context.fileName` mentions that gate must gain? — satisfied 2026-09-10 by stating in SC-005 that the containment gate is extended to require the `GEMINI.md` and `context.fileName` mentions [Measurability, Spec §SC-005; Research §9]
- [x] CHK026 Is the evaluation re-run condition decidable from a named artifact — which designated file, which ground-truth fields — rather than from judgment? [Measurability, Spec §Clarifications, §QR-002]

## Scenario and Edge Case Coverage

- [x] CHK027 Are requirements stated for a `GEMINI.md` inside `.gemini/` — the range it derives and the absence of directory stripping? [Coverage, Spec §FR-005, Edge Cases]
- [x] CHK028 Are requirements stated for a configured context filename that is another tool's instruction file — `AGENTS.md` read root-only by Codex, anywhere by Copilot, anywhere by Gemini CLI — as one file with several recognitions on range-keyed rows? [Coverage, Spec US3 scenario 1; Data Model §Customization File and Tool Recognition]
- [x] CHK029 Are requirements stated for an `mcpServers` value that is empty, absent, or not an object — no MCP row, settings row unchanged? [Coverage, Gap, Spec §FR-009]
- [x] CHK030 Are requirements stated for a sub-agent or command file that cannot be parsed or lacks its naming field — unknown name versus path-derived name, and where the diagnostic lands — consistent with the declared-name and path-named families? [Coverage, Gap, Spec §FR-006, §FR-008]
- [x] CHK031 Are requirements stated for a Gemini CLI home that is a symbolic link, or a `GEMINI_CLI_HOME` naming a file rather than a directory? — satisfied 2026-09-10 by adding the symbolic-link and file-not-directory home to the Edge Cases, citing the parent's FR-024 and FR-014 [Coverage, Spec §FR-011; parent FR-014, FR-024]
- [x] CHK032 Is the fifth member's disable and retry behavior stated as identical to the others — no per-member selector — rather than left to inheritance? [Coverage, Spec §FR-011, US2]

## Non-Functional Requirements, Dependencies, and Assumptions

- [x] CHK033 Are the official pages, their fetch date, and the two paths that are not cited (redirect, 404) recorded so `reviewedOn` values and hosts can be entered without re-deriving them? [Dependency, Research §8; Contract header]
- [x] CHK034 Is the settings-loader measurement (comments stripped) marked as a measurement rather than documentation wherever it appears, per the official-source verification policy? [Assumption, Research §6; Contract §Known uncertainties]
- [x] CHK035 Are the freeze and gate updates — counts, digest table, version literals, manifest version, containment-gate arrays, task-count freeze for this feature — enumerated exhaustively, so none is discovered only when a test fails? [Dependency, Research §9; Spec §QR-002]
- [x] CHK036 Is the accessibility requirement for the new mark stated as for the others — accessible name is the product name, the legend is a key, colour carries no information alone? — satisfied 2026-09-10 by adding "nothing resting on the colour alone (WCAG 1.4.1)" to FR-001 [Non-Functional, Spec §FR-001, §QR-004]
- [x] CHK037 Is the changeset level (`minor`) and its rationale recorded as a requirement rather than left to pull-request time? [Dependency, Spec §QR-004; Research §Migration impact]

## Ambiguities and Conflicts

- [x] CHK038 After the derived-rule rework, does any wording in the contract still imply a static `GEMINI.md` rule — the assessment index, the uncertainties, the allowlist row? [Ambiguity, Contract §Canonical evidence-assessment index, §Known uncertainties]
- [x] CHK039 Is the vendor's word "workspace" kept distinct from "Repository Source" and "selected root" wherever both appear, so `context.includeDirectories` cannot be read as widening the root? [Ambiguity, Spec §FR-005; Contract §Documented Repository behavior]

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline
- Items are numbered sequentially for easy reference
- Evaluated 2026-09-10 against spec.md, plan.md, research.md, data-model.md, and contracts/vendors/gemini-cli.md: 33 items held as written and 6 were satisfied by the one-sentence additions recorded on them.
