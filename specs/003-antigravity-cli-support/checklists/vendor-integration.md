# Vendor Integration Requirements Checklist: Support Antigravity CLI

[日本語](vendor-integration.ja.md)

**Purpose**: Validate that the requirements for making Antigravity CLI the fourth supported tool — its read allowlist and evidence, the removal of the tool it replaces, the parent specification's amendments, the Global member, and the documentation and release-evidence obligations — are complete, precise, consistent, and measurable before task generation
**Created**: 2026-09-10
**Feature**: [Support Antigravity CLI specification](../spec.md)
**Depth**: Standard
**Audience / Timing**: The author, before `/speckit-tasks`

**Note**: This checklist evaluates the quality of the written requirements. It does not test product behavior or implementation conformance.

## Requirement Completeness

- [x] CHK001 Does every location FR-002 and FR-009 admit have a documented vendor behavior row, an Inspector rule row, and a cited official heading in the vendor contract, with no admitted path resting on analogy alone? [Completeness, Spec §FR-002, §FR-009; Contract §Inspector Repository rules, §Inspector Global rule]
- [x] CHK002 Does every exclusion FR-003 and FR-010 names carry its stated reason and a behavior record in the contract's excluded groups, so a reader can tell an omission from a decision? [Completeness, Spec §FR-003, §FR-010; Contract §Relationship-only and excluded groups]
- [x] CHK003 Are the kinds this tool publishes named together with their row unit — the file, the declared name, the declared server name — and are the kinds it publishes none of enumerated rather than left unmentioned? [Completeness, Spec §FR-004–FR-006, §FR-011, §FR-012; Data Model §Compiled units]
- [x] CHK004 Does FR-014's removal requirement name every artifact class that must go — vendor module, contract, registry record, fixture, documentation section, label, mark, evidence record — and does it reach the frozen counts and the feature directory and changeset of the replaced work? [Completeness, Spec §FR-014; Plan §Implementation Boundaries]
- [x] CHK005 Is the re-pointing of every parent artifact that cites the replaced feature directory stated as a requirement rather than left to the implementer to notice? — satisfied 2026-09-10 by adding the re-pointing of every citing artifact to FR-014, so the obligation is a requirement rather than a plan-only boundary [Completeness, Gap; Plan §Implementation Boundaries]
- [x] CHK006 Does FR-001 enumerate the parent-specification clauses that change, and does research § 11 list the same set with no artifact named in only one place? [Completeness, Spec §FR-001; Research §11]
- [x] CHK007 Are the requirements for a file-shaped skill's detail stated — no file panel, no tab strip, heading unchanged — rather than left as a presentation decision with no requirement behind it? [Completeness, Spec §FR-004, §Clarifications; Data Model §Skill row and detail]
- [x] CHK008 Does each strategy the contract names carry operations and a cited basis, including those whose resolution the pages leave unstated? [Completeness, Contract §Canonical evidence-assessment index, §Documented Repository behavior]

## Requirement Clarity

- [x] CHK009 Is "no surface names a product this release does not support" written so it can be checked — does SC-006 define the search set (identifier, label, mark, contract, frozen count) rather than leaving "no trace" to judgment? [Clarity, Spec §FR-001, §FR-014, §SC-006]
- [x] CHK010 Is the member's label fixed as one spelling, and is it stated separately from the root path shown beside it, so the two are not read as one field? [Clarity, Spec §FR-008, §Clarifications]
- [x] CHK011 Is the absence of an environment property for the member written as a requirement with its reason, rather than as an omission a reader must infer? [Clarity, Spec §FR-008; Research §4]
- [x] CHK012 Is the skill naming rule exact for the file shape — the frontmatter `name`, the file's own name otherwise — including whether the extension is part of the name? — satisfied 2026-09-10 by stating in FR-004 that the fallback name is the file's own name without its extension [Clarity, Spec §FR-004]
- [x] CHK013 Is "one carrier recognized three times" stated for the home settings file, so a reader knows it appears once as a file and reaches three kinds without a duplicate row? [Clarity, Spec §FR-011]
- [x] CHK014 Is `Antigravity CLI` fixed as the one display spelling on every surface, with no alternative appearing in any user-facing text requirement? [Clarity, Spec §FR-001]
- [x] CHK015 Is the root-only context rule written so it cannot be read as admitting a nested `GEMINI.md` or `AGENTS.md`, and is the depth recorded as a known uncertainty rather than as a settled vendor fact? [Clarity, Spec §FR-007; Contract §Known uncertainties item 1]
- [x] CHK016 Is the treatment of a legacy MCP key stated as showing what is written without classifying it, rather than as validation the product does not perform? [Clarity, Spec §FR-005]

## Requirement Consistency

- [x] CHK017 Do FR-002's repository locations and the contract's Inspector Repository rules list the same set, with no path in one and not the other? [Consistency, Spec §FR-002; Contract §Inspector Repository rules]
- [x] CHK018 Do FR-009's home locations and the contract's Inspector Global rule list the same set? [Consistency, Spec §FR-009; Contract §Inspector Global rule]
- [x] CHK019 Does FR-012's list of kinds this tool publishes none of agree with the kinds the contract's presentation allowlist carries? [Consistency, Spec §FR-012; Contract §Normative initial-release presentation allowlist]
- [x] CHK020 Do the member statements agree at five across FR-008, the data model's tuple, and the quickstart's consent walkthrough? [Consistency, Spec §FR-008; Data Model §GlobalMemberId and the member tuple; Quickstart §See the fifth member]
- [x] CHK021 Does FR-013 describe Copilot's root recognition as unchanged, without implying that this feature edits a Copilot record? [Consistency, Spec §FR-013]
- [x] CHK022 Do the skill row decisions agree across FR-004, User Story 3, and the data model — one row per name, both definitions, no precedence? [Consistency, Spec §FR-004, §US3; Data Model §Skill row and detail]
- [x] CHK023 Does the plan's claim that no DTO shape changes agree with the data model, given that a member id and a label move? [Consistency, Plan §Constitution Check; Data Model §GlobalMemberId and the member tuple]

## Acceptance Criteria Quality

- [x] CHK024 Is each success criterion measurable without naming an implementation, and does each name what is counted rather than asserting a quality? [Measurability, Spec §SC-001–§SC-007]
- [x] CHK025 Is the first-use evaluation requirement measurable — what makes the run complete, and what does the record have to say? [Measurability, Spec §QR-003; Quickstart §Release evidence]
- [x] CHK026 Is the outcome-manifest obligation stated as a denominator change with its version and digest consequences, rather than as "update the manifest"? [Measurability, Spec §QR-003, §QR-004; Quickstart §Release evidence]

## Scenario and Edge Case Coverage

- [x] CHK027 Are edge cases stated for each failure a reader can meet — a skill file whose frontmatter fails to parse, an MCP file the format cannot parse, an empty skills directory, a home with no terminal directory, and a repository still holding the replaced tool's directories? [Coverage, Spec §Edge Cases]
- [x] CHK028 Where the vendor's pages leave a composition unstated — a workspace and a global skill of one name, a workspace and a global MCP server of one name — is the product's silence written as a decision rather than left as a gap? [Coverage, Gap; Contract §Known uncertainties items 2–3]
- [x] CHK029 Are requirements stated for a custom-agent directory that holds files beside `agent.md`, so a reader knows whether they are listed? — satisfied 2026-09-10 by adding the edge case that such a directory lists its `agent.md` alone [Coverage, Gap, Spec §FR-006]

## Non-Functional Requirements, Dependencies, and Assumptions

- [x] CHK030 Is the dependency consequence of the vendor mark stated — no package added unless a collection is taken, and the icon policy's three edits arriving together when one is? [Dependency, Plan §Technical Context; Research §8]
- [x] CHK031 Are the security requirements for the home stated as categories rather than as a path list, so a state file the vendor adds later is already excluded? [Non-Functional, Spec §QR-005, §FR-010]
- [x] CHK032 Is the strict-JSON assumption stated together with what happens if the product's reading diverges from the vendor's? [Assumption, Spec §Assumptions; Data Model §Parser format table]

## Ambiguities and Conflicts

- [x] CHK033 Does any admitted path, row unit, or naming rule rest on an inference the cited pages do not make, and is each such place recorded as a known uncertainty rather than stated as documented? [Ambiguity, Spec §FR-015; Contract §Known uncertainties]
- [x] CHK034 Is the tension between FR-001's "no other product named" and the `~/.gemini` path appearing in labels, paths, and documentation resolved explicitly, so a reader does not have to decide whether a directory name counts as naming a product? [Conflict, Spec §FR-001, §FR-008, §Clarifications]

## Notes

- Items are questions about the written requirements. An item passes when the requirement it asks about is present, precise, and consistent with the artifacts it names; it fails when a reader would have to infer the answer.
