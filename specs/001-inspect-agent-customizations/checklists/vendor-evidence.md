# Vendor Evidence and Surface Semantics Checklist: Inspect Agent Customizations

[日本語](vendor-evidence.ja.md)

**Purpose**: Validate that vendor lookup, surface-specific discovery and composition, and official-source traceability requirements are complete, precise, and maintainable before implementation
**Created**: 2026-07-16
**Feature**: [Inspect Agent Customizations specification](../spec.md)
**Depth**: Standard
**Audience / Timing**: PR reviewers, before task generation and implementation

**Note**: This checklist evaluates the quality of the written requirements. It does not test product behavior or implementation conformance.

## Requirement Completeness

- [x] CHK001 Are canonical URL, official host, exact reviewed sections, review date, and reciprocal affected-record references required for every maintained evidence record? [Completeness, Spec §QR-005]
- [x] CHK002 Does every vendor behavior state its product surface, Repository or User/Global scope, lookup base, path or selector, traversal semantics, version applicability, and activation conditions? [Completeness, Data Model §VendorBehaviorStatement]
- [x] CHK003 Are Repository and User/Global behavior documented in separate tables, with GitHub Copilot VS Code, CLI, and Cloud documented as independent surfaces? [Completeness, Spec §QR-005]
- [x] CHK004 Does every supported customization type have a documented vendor behavior, an Inspector matcher or explicit exclusion, and a runtime-composition strategy or an explicit statement that no composition applies? [Completeness, Spec §FR-003–FR-005; Contract: Inspection Path Allowlist §Contract map and identifier ownership]
- [x] CHK005 Are all documented Copilot MCP locations covered separately, including VS Code workspace-root `.mcp.json`, `.vscode/mcp.json`, Copilot CLI `.mcp.json`, `.github/mcp.json`, and their applicable User locations? [Gap, Spec §FR-004; Contract: GitHub Copilot §Surface boundary]

## Requirement Clarity

- [x] CHK006 Are the captured invocation working directory, the Inspector's selected Repository root (`process.cwd()` by default or the lexically resolved `--cwd` value), vendor repository root, VS Code workspace folder, and runtime `cwd` defined as distinct concepts wherever they can differ? [Clarity, Spec §FR-001–FR-002; Contract: Runtime Composition §Required condition facts]
- [x] CHK007 Is the distinction between a vendor's lookup traversal and the Inspector's downward `./**/` inventory selector explicit for every recursive-looking path? [Clarity, Spec §QR-005; Contract: Inspection Path Allowlist §Vendor locators are not Inspector matchers]
- [x] CHK008 Are “present,” “recognized,” “supported,” “available,” “applicable,” “selected,” “enabled,” and “effective” defined so that file existence cannot be mistaken for runtime activation? [Clarity, Spec §FR-008–FR-009; Contract: Inspection Path Allowlist §Read authorization and applicability] — Fixed 2026-07-21: added the existence-versus-activation vocabulary defining all eight terms to Inspection Path Allowlist §Read authorization and applicability.
- [x] CHK009 Is each evidence section narrow enough to support the exact claim made by its behavior, rule, or strategy row rather than only naming a broad parent section? [Clarity, Spec §QR-005; Contract: Official Sources §Record notation and ownership]
- [x] CHK010 Are minimum versions, rollout state, `preview` or `experimental` lifecycle qualifiers, and effective dates specified whenever a path or precedence rule is not valid across all supported versions? [Clarity, Gap] — Fixed 2026-07-21: Spec §QR-005 now requires an explicit version gate (exact upstream token such as `VS Code 1.118+`, or the `engine-version` condition fact), a version-anchored release-note/changelog citation, and forbids undated or rolling pages from establishing a gate or effective date.

## Requirement Consistency

- [x] CHK011 Are `behaviorId`, `ruleId`, `strategyId`, and `sourceId` ownership and reciprocal references consistent across the vendor, matcher, composition, and source registries? [Consistency, Contract: Inspection Path Allowlist §Contract map and identifier ownership]
- [x] CHK012 Do the requirements consistently preserve one physical file with multiple tool/kind recognitions and surface-specific candidate provenances instead of duplicating the file or collapsing provenance semantics? [Consistency, Spec §FR-005; Data Model §ToolRecognition and §CandidateProvenance]
- [x] CHK013 Are the path, schema, and applicability requirements for `.mcp.json` consistent between Copilot VS Code and Copilot CLI without assuming that a shared filename implies identical configuration semantics? [Consistency, Ambiguity, Contract: GitHub Copilot §VS Code Repository behavior and §Copilot CLI Repository behavior]
- [x] CHK014 Is vendor runtime composition consistently separated from Inspector Repository/Global source separation and read authorization? [Consistency, Spec §FR-014; Contract: Runtime Composition §Runtime composition is not Inspector source merging]

## Acceptance Criteria Quality

- [x] CHK015 Are there objective completeness criteria for evidence coverage, including zero unresolved identifier references, zero orphan sources, and evidence for every maintained behavior, rule, and strategy? [Measurability, Spec §QR-005]
- [x] CHK016 Are Repository selector acceptance criteria explicit about Base `./`, `./`-prefixed relative selectors, expansion class, and rejection of a bare `**/` prefix? [Measurability, Spec §QR-005]
- [x] CHK017 Can each closed `documentationStatus`—`documented`, `partially-documented`, `unknown`, and `conflict`—be assigned using objective evidence criteria, with `documentation-conflict` reserved for `ConditionFact.status` rather than accepted as an alias? [Acceptance Criteria, Spec §QR-005]
- [x] CHK018 Are drift-review outcomes measurable for unchanged content, changed assertions, missing or duplicate anchors, redirects, and human-reviewed semantic updates? [Acceptance Criteria, Contract: Official Sources §Offline validation and explicit drift review]

## Scenario Coverage

- [x] CHK019 Are requirements defined for the primary case where a current first-party guide directly documents a supported path and its semantics? [Coverage, Spec §QR-005]
- [x] CHK020 Are requirements defined for an alternate case where a newer official release note adds support that the current general guide omits? [Coverage, Alternate Flow, Gap]
- [x] CHK021 Are requirements defined for a later product version that adds, renames, relocates, or removes a customization path? [Coverage, Change Scenario, Spec §Assumptions]
- [x] CHK022 Is the recovery process specified after evidence drift, including semantic review, affected-row updates, bilingual synchronization, review-date changes, and contract-version decisions? [Coverage, Recovery, Contract: Official Sources §Offline validation and explicit drift review]
- [x] CHK023 Are requirements complete for unresolved runtime facts such as surface version, workspace root, runtime `cwd`, trust, enablement, and organization policy, with a conditional outcome instead of a fabricated winner? [Coverage, Exception Flow, Spec §FR-009]

## Edge Case Coverage

- [x] CHK024 Are same-name MCP servers declared in workspace-root `.mcp.json`, `.vscode/mcp.json`, User configuration, plugins, or agent profiles addressed without assuming undocumented precedence? [Edge Case, Gap]
- [x] CHK025 Are requirements defined for a `.mcp.json` file that is valid for one recognizing surface but malformed or unsupported for another, without losing the successful recognition? [Edge Case, Spec §FR-005 and §FR-028; Gap]
- [x] CHK026 Are single-folder workspaces, multi-root workspaces, nested selected Repository roots, and runtime `cwd` values outside the Inspector's selected root distinguished where they change vendor applicability? [Edge Case, Gap] — Fixed 2026-07-21: multi-root `.code-workspace` workspaces are now distinguished in GitHub Copilot §Terminology, the surface-boundary note below it, and the Runtime Composition `workspace-root` condition fact; the other three cases were already explicit.
- [x] CHK027 Are unavailable pages, cross-host redirects, duplicate headings, sections absent from fetched markup, and removed anchors covered as evidence failures without silently weakening traceability? [Edge Case, Contract: Official Sources §Offline validation and explicit drift review]
- [x] CHK028 Are rolling or undated official pages and features that are previewed, rolled back, or superseded covered by explicit version, closed documentation-status, and separate lifecycle-qualifier requirements? [Edge Case, Assumption] — Fixed 2026-07-21: a new Spec §Assumptions bullet covers undated/rolling pages and previewed/rolled-back/superseded features via `reviewedOn`, section fingerprints, lifecycle qualifiers, and `conflict`, with no `stable` presentation or inferred resolution.

## Non-Functional Requirements

- [x] CHK029 Are English and Japanese requirements required to preserve identical IDs, paths, URLs, reviewed sections, versions, subject-keyed documentation statuses, lifecycle qualifiers, and semantic caveats? [Completeness, Spec §QR-004–QR-005]
- [x] CHK030 Are registry and drift validations required to be deterministic, complete-or-explicitly-failed, and actionable when they cannot establish source integrity, without defining a product-specific numeric resource ceiling? [Non-Functional, Contract: Inspection Path Allowlist §Common conformance requirements]
- [x] CHK031 Are privacy requirements for official-source review explicit about credentials, cookies, repository data, response bodies, and retained remote content? [Security, Data Model §OfficialSourceRecord]
- [x] CHK032 Does the ownership model allow one vendor surface to be updated without changing unrelated vendors, surfaces, Inspector policies, or composition strategies? [Maintainability, Spec §QR-001]
- [x] CHK033 Does every behavior, rule, and strategy own exactly one subject-keyed `EvidenceAssessment`, and do provenance and relationship DTOs retain the sorted/deduplicated record-by-record `EvidenceAssessment[]` without reducing it to a scalar, best/worst value, or qualifier union? [Acceptance Criteria, Spec §QR-005]
- [x] CHK034 Are lifecycle qualifiers limited to duplicate-free `preview`, `experimental`, `deprecated` order, with an empty array explicitly meaning no lifecycle claim rather than `stable`? [Acceptance Criteria, Spec §QR-005]

## Dependencies and Assumptions

- [x] CHK035 Is the accepted first-party source hierarchy defined for general guides, reference pages, release notes, official source repositories, and official issue statements? [Dependency, Gap] — Fixed 2026-07-21: Official Sources §Record notation and ownership now defines the vendor-wide hierarchy (guides and reference pages rank equally; version-qualified release notes/changelogs outrank omission; incompatible assertions stay `conflict`; source repositories and issue statements are never substitute evidence).
- [x] CHK036 Is the assumption that official documentation can be incomplete or internally inconsistent stated, together with the required representation of residual uncertainty? [Assumption, Spec §FR-009 and §Assumptions]
- [x] CHK037 Are the owner, timing, trigger, and completion criteria for pre-implementation and recurring vendor-specification revalidation documented? [Dependency, Spec §Supported Initial Release Customization Files; §QR-005] — Fixed 2026-07-21: Spec §Supported Initial Release Customization Files and the Official Sources drift review now name the maintainer as owner, the triggers (before every frozen release candidate; on known material upstream change), and the completion criteria (affected records and both languages reviewed, assertions/fingerprints updated, `reviewedOn` advanced).

## Ambiguities and Conflicts

- [x] CHK038 Is VS Code 1.118-or-later workspace-root `.mcp.json` support explicitly represented and linked to the exact official release-note section, rather than inferred from the `.vscode/mcp.json` guide? [Conflict, Gap]
- [x] CHK039 Where direct evidence does not establish the VS Code workspace-root `.mcp.json` schema, is that schema explicitly withheld without inheriting `.vscode/mcp.json` or Copilot CLI semantics? [Ambiguity, Gap]
- [x] CHK040 Is “most-specific” MCP server selection defined with an exact ordering across workspace folders and configuration locations, or explicitly retained as unknown where the evidence is incomplete? [Ambiguity, Gap]
- [x] CHK041 Is there a documented decision rule for the conflict between the current VS Code MCP guide's location list and the newer VS Code 1.118 workspace-root `.mcp.json` release note? [Conflict, Gap]

## Notes

- Check items off as the requirements are reviewed: `[x]`.
- Record findings and the exact affected requirement or contract row inline.
- A checked item means the requirement writing is adequate; it does not mean the implementation conforms.
