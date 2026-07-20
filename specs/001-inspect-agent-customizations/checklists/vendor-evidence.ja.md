# Vendor根拠とsurface semanticsのチェックリスト: Agentカスタマイズの調査

[English](vendor-evidence.md)

**目的**: 実装前に、vendor lookup、surface固有の探索とcomposition、および公式sourceのtraceabilityに関する要件が完全、明確、かつ保守可能であることを検証する
**作成日**: 2026-07-16
**機能**: [Agentカスタマイズの調査に関する仕様](../spec.ja.md)
**深さ**: Standard
**利用者 / タイミング**: PR reviewer、task生成および実装の前

**注記**: このチェックリストは、記述された要件の品質を評価する。製品の動作または実装適合性をtestするものではない。

## 要件の完全性

- [ ] CHK001 すべての保守対象の根拠recordについて、canonical URL、公式host、確認した正確なsection、確認日、および影響を受けるrecordとの相互参照が要求されているか？ [Completeness, Spec §QR-005]
- [ ] CHK002 すべてのvendor behaviorに、product surface、RepositoryまたはUser/Global scope、lookup base、pathまたはselector、traversal semantics、適用version、およびactivation conditionが記載されているか？ [Completeness, Data Model §VendorBehaviorStatement]
- [ ] CHK003 Repository behaviorとUser/Global behaviorが別々の表に記載され、GitHub CopilotのVS Code、CLI、およびCloudが独立したsurfaceとして記載されているか？ [Completeness, Spec §QR-005]
- [ ] CHK004 サポートするすべてのcustomization typeに、文書化されたvendor behavior、Inspector matcherまたは明示的な除外、およびruntime-composition strategyまたはcompositionが適用されない旨の明示的な記述があるか？ [Completeness, Spec §FR-003–FR-005; Contract: Inspection Path Allowlist §Contract map and identifier ownership]
- [x] CHK005 VS Codeのworkspace root `.mcp.json`、`.vscode/mcp.json`、Copilot CLIの`.mcp.json`、`.github/mcp.json`、および適用されるUser locationを含め、文書化されたすべてのCopilot MCP locationが個別に網羅されているか？ [Gap, Spec §FR-004; Contract: GitHub Copilot §Surface boundary]

## 要件の明確性

- [ ] CHK006 取得済みinvocation working directory、Inspectorのselected Repository root（defaultの`process.cwd()`またはlexicalにresolveした`--cwd`値）、vendor repository root、VS Code workspace folder、およびruntime `cwd`が、相違し得るすべての箇所で別概念として定義されているか？ [Clarity, Spec §FR-001–FR-002; Contract: Runtime Composition §Required condition facts]
- [ ] CHK007 再帰的に見えるすべてのpathについて、vendorのlookup traversalとInspectorの下方向`./**/` inventory selectorの違いが明示されているか？ [Clarity, Spec §QR-005; Contract: Inspection Path Allowlist §Vendor locators are not Inspector matchers]
- [ ] CHK008 fileの存在をruntime activationと誤認できないように、「present」「recognized」「supported」「available」「applicable」「selected」「enabled」「effective」が定義されているか？ [Clarity, Spec §FR-008–FR-009; Contract: Inspection Path Allowlist §Read authorization and applicability]
- [ ] CHK009 各根拠sectionは、広い親sectionを示すだけではなく、behavior、rule、またはstrategyの行が述べる正確なclaimを裏付けられる粒度になっているか？ [Clarity, Spec §QR-005; Contract: Official Sources §Record notation and ownership]
- [ ] CHK010 pathまたはprecedence ruleがサポートする全versionで有効ではない場合に、minimum version、rollout state、`preview`または`experimental` lifecycle qualifier、およびeffective dateが記載されているか？ [Clarity, Gap]

## 要件の一貫性

- [ ] CHK011 `behaviorId`、`ruleId`、`strategyId`、`sourceId`のownershipと相互参照が、vendor、matcher、composition、およびsource registry間で一貫しているか？ [Consistency, Contract: Inspection Path Allowlist §Contract map and identifier ownership]
- [ ] CHK012 一つのphysical fileを複製したりprovenance semanticsを統合したりせず、複数のtool/kind recognitionとsurface固有のcandidate provenanceを持つものとして要件全体で一貫して保持しているか？ [Consistency, Spec §FR-005; Data Model §ToolRecognition and §CandidateProvenance]
- [x] CHK013 共通filenameが同一のconfiguration semanticsを意味すると仮定せず、`.mcp.json`のpath、schema、およびapplicability要件がCopilot VS CodeとCopilot CLIの間で一貫しているか？ [Consistency, Ambiguity, Contract: GitHub Copilot §VS Code Repository behavior and §Copilot CLI Repository behavior]
- [ ] CHK014 vendor runtime compositionが、InspectorのRepository/Global source分離およびread authorizationと一貫して分離されているか？ [Consistency, Spec §FR-014; Contract: Runtime Composition §Runtime composition is not Inspector source merging]

## Acceptance criteriaの品質

- [ ] CHK015 未解決のidentifier referenceが0件、orphan sourceが0件、すべての保守対象behavior、rule、およびstrategyに根拠があることを含む、evidence coverageの客観的な完全性基準があるか？ [Measurability, Spec §QR-005]
- [ ] CHK016 Repository selectorのacceptance criteriaは、Base `./`、`./`で始まるrelative selector、expansion class、およびbare `**/` prefixの拒否を明示しているか？ [Measurability, Spec §QR-005]
- [ ] CHK017 Closedな`documentationStatus`である`documented`、`partially-documented`、`unknown`、`conflict`を客観的な根拠基準で割り当て、`documentation-conflict`をaliasとして受理せず`ConditionFact.status`専用にできるか？ [Acceptance Criteria, Spec §QR-005]
- [ ] CHK018 変更なしのcontent、変更されたassertion、欠落または重複したanchor、redirect、および人によるsemantic updateについて、drift reviewの結果を測定できるか？ [Acceptance Criteria, Contract: Official Sources §Offline validation and explicit drift review]

## Scenario coverage

- [ ] CHK019 現行のfirst-party guideがサポート対象pathとそのsemanticsを直接記載するprimary caseの要件が定義されているか？ [Coverage, Spec §QR-005]
- [x] CHK020 新しい公式release noteが、現行のgeneral guideに記載のないsupportを追加するalternate caseの要件が定義されているか？ [Coverage, Alternate Flow, Gap]
- [ ] CHK021 後続product versionがcustomization pathを追加、改名、移動、または削除する場合の要件が定義されているか？ [Coverage, Change Scenario, Spec §Assumptions]
- [ ] CHK022 evidence drift後のrecovery processとして、semantic review、影響を受ける行の更新、日英同期、review dateの変更、およびcontract versionの判断が定義されているか？ [Coverage, Recovery, Contract: Official Sources §Offline validation and explicit drift review]
- [ ] CHK023 surface version、workspace root、runtime `cwd`、trust、enablement、およびorganization policyなど未解決のruntime factについて、架空のwinnerではなくconditional outcomeを示す完全な要件があるか？ [Coverage, Exception Flow, Spec §FR-009]

## 境界事例のcoverage

- [x] CHK024 workspace root `.mcp.json`、`.vscode/mcp.json`、User configuration、plugin、またはagent profileで宣言された同名MCP serverについて、文書化されていないprecedenceを仮定せずに扱う要件があるか？ [Edge Case, Gap]
- [x] CHK025 一つの`.mcp.json` fileが、一方の認識surfaceではvalidだが、別のsurfaceではmalformedまたはunsupportedである場合に、成功したrecognitionを失わない要件が定義されているか？ [Edge Case, Spec §FR-005 and §FR-028; Gap]
- [ ] CHK026 single-folder workspace、multi-root workspace、nested selected Repository root、およびInspectorのselected root外のruntime `cwd`がvendor applicabilityを変える場合に、それぞれ区別されているか？ [Edge Case, Gap]
- [ ] CHK027 利用不能なpage、cross-host redirect、重複heading、取得したmarkupに存在しないsection、および削除されたanchorが、traceabilityを暗黙に弱めることなくevidence failureとして扱われているか？ [Edge Case, Contract: Official Sources §Offline validation and explicit drift review]
- [ ] CHK028 rollingまたは日付のない公式pageと、preview後にrollbackまたはsupersedeされたfeatureが、明示的なversion、closed documentation-status、独立したlifecycle-qualifier要件で扱われているか？ [Edge Case, Assumption]

## 非機能要件

- [ ] CHK029 英語版と日本語版の要件で、同一のID、path、URL、確認したsection、version、subject-keyed documentation status、lifecycle qualifier、およびsemantic caveatを保持することが要求されているか？ [Completeness, Spec §QR-004–QR-005]
- [ ] CHK030 registry validationとdrift validationは、source integrityを確立できない場合にdeterministic、complete-or-explicitly-failed、かつactionableであり、product固有のnumerical resource ceilingを定義しないことを要求されているか？ [Non-Functional, Contract: Inspection Path Allowlist §Common conformance requirements]
- [ ] CHK031 credential、cookie、repository data、response body、および保持されるremote contentについて、official-source reviewのprivacy要件が明示されているか？ [Security, Data Model §OfficialSourceRecord]
- [ ] CHK032 一つのvendor surfaceを更新するときに、無関係なvendor、surface、Inspector policy、またはcomposition strategyを変更せずに済むownership modelになっているか？ [Maintainability, Spec §QR-001]
- [ ] CHK033 各behavior、rule、strategyがsubject-keyedな`EvidenceAssessment`を正確に1件所有し、provenanceとrelationship DTOがsort/deduplicate済みrecord単位の`EvidenceAssessment[]`をscalar、best/worst value、qualifier unionへ縮約せず保持するか？ [Acceptance Criteria, Spec §QR-005]
- [ ] CHK034 Lifecycle qualifierを重複なしの固定順`preview`、`experimental`、`deprecated`に限定し、empty arrayを`stable`でなくlifecycle claimなしと明示しているか？ [Acceptance Criteria, Spec §QR-005]

## Dependencyと前提

- [ ] CHK035 general guide、reference page、release note、official source repository、および公式issue statementについて、採用するfirst-party source hierarchyが定義されているか？ [Dependency, Gap]
- [ ] CHK036 公式documentationが不完全または内部矛盾し得るという前提と、残る不確実性の必須表現が記載されているか？ [Assumption, Spec §FR-009 and §Assumptions]
- [ ] CHK037 実装前および定期的なvendor specification再調査について、owner、timing、trigger、およびcompletion criteriaが記載されているか？ [Dependency, Spec §Supported Initial Release Customization Files; §QR-005]

## 曖昧さと矛盾

- [x] CHK038 VS Code 1.118以降のworkspace root `.mcp.json` supportが、`.vscode/mcp.json` guideから推測されるのではなく、公式release noteの正確なsectionへのlinkとともに明示されているか？ [Conflict, Gap]
- [x] CHK039 Direct evidenceがVS Code workspace root `.mcp.json` schemaを確立しない場合、そのschemaを明示的に保留し、`.vscode/mcp.json`またはCopilot CLI semanticsを継承しないか？ [Ambiguity, Gap]
- [x] CHK040 「most-specific」なMCP server selectionがworkspace folderおよびconfiguration location間の正確な順序で定義されているか、根拠が不完全な場合はunknownとして明示的に保持されているか？ [Ambiguity, Gap]
- [x] CHK041 現行のVS Code MCP guideのlocation一覧と、より新しいVS Code 1.118のworkspace root `.mcp.json` release noteとの矛盾について、文書化されたdecision ruleがあるか？ [Conflict, Gap]

## 注記

- 要件をreviewしたら項目を`[x]`にする。
- findingと影響を受ける正確なrequirementまたはcontract rowをinlineで記録する。
- 項目がcheckedであることは要件記述が十分であることを意味し、実装が適合していることを意味しない。
