# Quickstartと検証guide

[English](quickstart.md)

このguideは、このfeatureで説明した実装のend-to-end acceptance pathである。対応する実装taskがnamed
script/fixtureを追加するとcommandが実行可能になる。Current scaffoldが既にそれらを持つとは主張しない。

## 前提条件

- 正確な`package.json` compatibility contract `^24.11.0 || ^26.0.0`
  （`>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`）を満たすNode.js。Development/build基準は
  Node.js 24.18.0
- Repositoryの`packageManager` declarationを満たすpnpm
- 追加compilerやplatform固有build workspaceは不要。Inspected-source accessはpackaged Node.js moduleで実装する
- Project setup commandでPlaywright 1.61.1がinstallする正確なChromium、Firefox、WebKit revision。これらのpin済み
  revisionは再現可能な自動browser-certification基準であり、userが実行できるbrowserの網羅的な一覧ではない
- `127.0.0.1`へ到達できるbrowser。Release evidenceでは、OS default handlerが別browserを選ぶ場合も含め、上記certified
  revisionの1つを使う

Toolchain確認:

```bash
node --version
pnpm --version
```

期待結果: 両commandがchecked-in package declarationを満たす。Performance evidenceにはchecked-in SC-002 profile IDと
fixture digest、および実際に使用したprofile valueを記載し、個人識別子と絶対user pathだけを省略する。
[research.ja.md](research.ja.md)に記録したNuxt/Vue互換性が変わるまでtoolchainのmajor versionを変更しない。

## Installと準備

Dependency revalidationをplanning gateとする。承認済みpackageまたはversionが1つでも変わった場合、packageまたは
configuration fileを編集する前に停止し、dependency baselineを含む`research`、`plan`、`quickstart`、`tasks`の
全英日pairを同期して、
`/speckit-plan`と`/speckit-tasks`を再実行する。2つ目のlocal dependency baselineで作業を継続しない。

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium firefox webkit
pnpm run build
```

期待結果:

- Committed lockfileを変更せずinstallする。
- Buildは最初にroot-resolvedなpackage所有の`.output/`、`.build/`、`dist/` treeだけを除去する。
  `nuxt build`は標準`.output/public` staging treeへroot-absolute same-origin static assetを作り、strict
  assemblerがredundantな`200.html`/`404.html`を要求するが除外し、`index.html`以外の全HTML fileを拒否する。
  Accepted treeを新規`dist/public`へcopyし、全copied asset size/hashと正確な全executable inline-script CSP hashを
  持つ`dist/manifests/static-assets.json`を書く。
- tsdownがcleanな`.build/server`へfixed ESM extensionのnamed `cli.mjs`/`parser-worker.mjs` entry、中央集約した
  Node.js filesystem service、任意のcode-split chunkを書き、assemblerが`dist/manifests/server-assets.json`を
  作ってlisted regular `.mjs` fileだけを`dist/`へcopyする。
- `bin.mjs`はexecutableで、BOMなし、LF終端の正確な先頭行`#!/usr/bin/env node`で始まる。そのbootstrapは
  `dist/cli.mjs`をstatic importせず、先にpacked `engines.node` stringが正確に`^24.11.0 || ^26.0.0`であること、
  実行中Node.js versionがその展開range内にあること、installed package version、static/server両manifest、全listed
  assetのexact path、regular-file type、size、digestを検証する。全check成功後だけ`dist/cli.mjs`をdynamic importし、
  serverをbindできるのはそのimport済みCLIだけとする。
- `package.json.bin`は正確に`{ "agent-customization-inspector": "bin.mjs" }`、`main`、`module`、`exports`は不在。
- Malformed/inconsistent manifest、package-version mismatch、missing/unexpected asset、symlink/non-regular asset、
  size/digest mismatchは、CLI module evaluation前かつlocal server bind前にfailureとする。
- Pack前のrecursive verificationで`dist/`に2 manifestとそのlisted static/server fileだけがあり、
  stale、link、non-regular、unexpected pathがないことを確認する。
- Project-authored application codeと全project/dependency tarball payload内のexecutable codeはすべてJavaScriptとする。
  生成HTML shell、CSS、JSON manifest、必須documentation/license fileはdeclarativeかつnon-executableなartifactとし、
  manifest-authorized HTML bootstrapはJavaScriptのまま上記CSP check対象とする。Package manager生成の`.bin` symlinkと
  `.cmd`/`.ps1` launch shimはpayload外の唯一の限定interop例外とし、それぞれexactな宣言済み`package.json.bin` targetを
  audit済みNode JavaScriptへ対応させ、argvだけをforwardして追加input/application logicを持たせない。Package-owned shell
  helperとunexpected shimは拒否する。Exact production dependencyはleaf packageの`gunshi`、`yaml`、`jsonc-parser`、
  `smol-toml`だけで、`open`は不在とする。
- Build outputにfixture、raw customization text、Global content、cache、inspected machineを公開する
  source-map pathが含まれない。

## Local Inspectorをmanual実行

先にbuildし、implementation repositoryではなくfixture directoryがprocess `cwd`になるようconformance
fixtureから起動する。

```bash
cd tests/fixtures/repositories/all-supported
node ../../../../bin.mjs --no-open
```

期待結果:

- CLIがbrowser attempt前にclosed-grammar capability URLを正確に1回表示し、non-loopback addressへbindしない。
  `--no-open`ではchild processを作らない。
- Browser表示のRepository source rootは`all-supported` fixture自身。
- 1秒以内に現在のscan requestについて、queued、active phase名、complete、partial、またはfailedを明示するstatusを画面に
  表示しassistive technologyにも公開する。Failureは実行可能な次の手順も示す。一般的なspinner/loading label、変化しない
  control、scan stateを示さないacknowledgement、以前のscanのstatusは数えない。
- 最初のcomplete inventoryが文書化limit内で表示され、凍結path contract外のfileを含まない。
- Process停止でserver sessionを破棄する。Visibleなauthorized pageでは1秒のliveness heartbeat failureまたは2秒の
  monotonic leaseにより、session-ended view前に全DTO、DOM source value、editor model/worker、comparison、warning
  acknowledgementをpurgeする。Portを再利用して再起動しても`sessionId`とcapabilityが変わり、late responseや以前の
  表示stateは戻らない。
- Fragment削除後のreloadはAPI requestを送らず、このterminalに表示したprocess-lifetime URLを開き直すよう
  正確に案内する。Capabilityをbrowser storage/cookieへ保存しない。

通常利用の同等launch contract:

```bash
cd /path/to/intended/repository-root
npx agent-customization-inspector
```

Project-owned launcherは`shell: false`の`spawn`、sole argv itemとしてのURL、固定helper 1つだけを使う。HelperはmacOSの
`/usr/bin/open`またはLinuxの`/usr/bin/xdg-open`とする。完全なenvironmentはmacOSの`HOME`、`TMPDIR`、`LANG`、`LC_ALL`、
またはLinuxの`HOME`、`DISPLAY`、
`WAYLAND_DISPLAY`、`XDG_CURRENT_DESKTOP`、`DESKTOP_SESSION`、`DBUS_SESSION_BUS_ADDRESS`、
`XDG_RUNTIME_DIR`、`LANG`、`LC_ALL`だけとする。
`BROWSER`、`NODE_OPTIONS`、`NODE_PATH`、調査対象contentまたはpath、authored value、user-supplied command、
environment-selected handler、その他environment value、environment由来の追加argvは渡さない。この固定startup helperを、
initial releaseで許可する唯一のproduct起動child processとする。
Portable Nodeから独立したtrusted system-helper boundaryを得られないため、このreleaseではWindowsとその他platformの
automatic openを意図的にskipする。Missing/nonzero helperとunsupported platformでも固定manual-URL warning付きでserverを継続する。Automatic browser
openが失敗しても既に表示したlocal URLを利用できる。
初期リリースにはrepository argument、ancestor-root discovery、remote-host flag、static-export command、MCP commandはない。

固定helperはURLをOS default browserへ委譲するだけで、browser versionを選択も検証もしない。Helper成功はcompatibility
evidenceではない。Deterministicなcertificationでは`--no-open`を使い、表示URLを3つのpin済みPlaywright revisionの1つへ
貼り付ける。Participant-study evidenceにはdefault handlerを記録し、そのhandlerがcertified revisionの場合だけrunを数える。
それ以外ではenrollment前に同じmanual certified-browser fallbackを使う。

## 自動品質gate

実装変更をcompleteとみなす前に全gateを実行する。

```bash
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run test:contract
pnpm run test:integration
pnpm run test:security
pnpm run test:package
pnpm run test:performance
pnpm run test:e2e
pnpm run test:docs
```

期待結果:

- Lint/type checkがignored failureなしで完了する。
- Unit testがpath classification、order、parser bound、記述された値の完全表示、環境変数参照の非解決、
  diagnostic、state transition、deterministic projectionを扱う。
- Contract testが全API status/security ruleと全stable behavior、inspection-rule、composition-strategy、
  official-source IDを扱い、positive、1-rule near-miss、derived、relationship-only、excluded、
  multi-provenance、multi-tool、Global caseを含む。返却する全metadata fieldとrelationship kindが、そのsupported typeの
  維持管理するclosed presentation allowlistに含まれ、unknownなauthored key/referenceは完全なsource textからだけ利用可能で
  あることも証明する。
- Integration/security testがsource containmentとcustomization由来のexecution、child process、MCP
  connection、outbound request、dynamic evaluation、source mutationが0であることを証明する。別test対象のstartup
  launcherへ調査対象content、調査対象path、authored value、user-supplied command、environment-selected handlerを渡さない。
- Package testがtarballをbuild/inspectionし、isolated fixtureへinstallし、packaged Node.js filesystem serviceと
  固定のpackaged parser Worker URLをloadして、working tree/runtime downloadへ依存せず正確な`npx` entryを
  launchする。Production closure全体のscripts-disabled installとnetwork-disabled normal installもauditし、closedな
  payload-JavaScript/no-lifecycle/no-native policy、package-manager生成shimの別audit、全CI OSで同じpackage graph digestを
  確認する。Negative bootstrap fixtureは、両manifestと全listed assetの検証成功前に`bin.mjs`がCLIをevaluateまたはbind
  しないことを証明する。
- 内容を変更しない100,000 entry/500 in-limit customization fileのdeterministic performance fixtureを、同じversion付き
  checked-in profile上の正確に10個のfresh Inspector processで測定し、9 run以上が後述timer/cache protocolのもと1秒以内に
  現在のrequestに対するqualifying statusを表示し10秒以内に完了する。各complete inventoryが操作可能になった後、
  標準化されたfilter actionとitem-selection actionを1回ずつ実施し、同じ10回のrunのうち9回以上で、両方の
  input dispatchからvisibleかつoperableな結果までの測定を100ミリ秒未満にする。
- Browser testが4 user storyすべてを扱い、axeがcriticalな適用可能WCAG 2.2 AA violationを報告しない。
- Documentation testがlink、command、allowlist version、diagnostic code、registry間の相互参照、
  各英語・日本語pairのsemantic parityを検証し、official source snapshot変更時に
  behavior/rule/strategy reviewを要求する。

## Contract registry検証

```bash
pnpm exec vitest run tests/contract/vendor-behaviors
pnpm exec vitest run tests/contract/inspection-rules
pnpm exec vitest run tests/contract/runtime-composition
pnpm exec vitest run tests/contract/official-sources
```

上記testはofflineである。Maintainerはupstream drift review時だけ`pnpm run check:official-sources`を明示実行し、
source checkでnetworkを使えるのはこのcommandだけとする。

確認項目:

1. 全shipped `behaviorId`、`ruleId`、`strategyId`、`sourceId`が厳密に1つの所有bilingual contractと対応する
   immutable registryに存在する。全cross-referenceが解決し、全`sourceRefs` entryがboundedな
   `OfficialSourceRecord`と相互一致し、offline testがsemantic fingerprintを再計算する。明示drift checkは
   official HTTPS host、redirect/content/size/time limit、exact section selection/normalizationを強制し、
   behavior/rule/strategy/check-in済みdigestを自動更新せずfail closedする。
2. Vendor lookup base、relative selector、traversal modeをInspector matcherから独立して検証する。全Repository
   matcherは正確な`./` Baseと、`./` relative selectorに1対1で対応してcanonical round-tripするtyped segment
   programを持つ。Bare `**/`、unknown/misplaced token、隣接または3つ目のrecursive token、selector/program件数不一致を
   拒否する。Fixtureはdescendant-plus-direct-childとdescendant-plus-recursive-subtreeのcompositeを扱う。`./**/`は
   明示的なInspector descendant inventoryとしてだけ受理し、vendorの下向きwalkの証明とは解釈しない。Build validationは
   accepted programをimmutableかつversionedな`TraversalPlan` dataへcompileし、runtime testはfilesystem serviceがselector
   textを再parseしたりgeneric walkerへ置換したりせず、そのdataだけをinterpretすることを証明する。Global exact-file planは
   tool-home rootをopenせずfixed ancestor/target chainだけにtouchし、fixed-instruction-subtree planはそのnamed subtreeと
   permitted descendantだけをopenする。隣接する全Global setting、credential、state、plugin、その他neighbor pathへの
   `opendir`、`lstat`、`realpath`、open、read callは0件とする。ClosedなCodex Global planは最初に
   `AGENTS.override.md`をprobeし、安全にreadしたnon-empty override後は`AGENTS.md`へoperationを0件とし、absentまたは安全に
   emptyと確定した場合だけ次へ進む。Unsafe、unreadable、oversized、decode不能なpresent candidateではfallbackせず
   fail closedし、non-empty fileを最大1件だけpublishする。Absent、empty、BOM-only、whitespace-only、non-empty、
   unreadable、oversized、decode不能、non-regular fixtureを両ordered targetへ独立に適用する。Root verification後の
   exact-target `lstat`による明示的not-foundだけをabsentとし、その他の全errorと最初の観測後の消失はfail closedする。
   これらのfixtureでcontent rule、short-circuit、および非選択targetへのoperation 0件を固定する。
3. Static ruleはtyped literal/one-segment/recursive-directory programとshared scan boundだけを許可し、runtimeで
   text globを評価しない。Staticとderivedの両ruleが
   受理したfileは1回だけ読み、両provenanceを保持する。各provenanceは自身のmatched path、
   behavior/strategy/source evidence、scope/order、applicabilityを持つ。Public provenance DTOはSource-relative pathとstable
   comparison keyを持つclosed `ScopeDescriptor`/`OrderDescriptor` unionを使い、unknown orderはlossyなrecognition-level
   aggregateにせずnullとcondition factで表す。
4. Surface fixtureはGitHub Copilot VS Code、CLI、cloud lookup behaviorを分離する。VS Codeのworkspace-root
   instructionがexactである一方、CLIのstandard-location/target-path traversalはInspector globではなくvendor
   behaviorとして表現されることを証明する。Root-only/nested near missが差を示す。
5. Repository、文書化済みUser、consent済みGlobalの表を独立して検証する。FR-015からFR-018が明示しない限り、
   文書化済みUser locationはGlobal read authorityにならず、runtime compositionはInspectorのRepository/Global
   source graphをmergeしない。
6. Closed `DerivationProgram`のinitial mappingは正確に5件でruntime extension pointを持たない。
   `copilot.derived.local-plugin-manifest`、`claude.derived.local-plugin-manifest`、
   `codex.derived.local-plugin-manifest`、`codex.derived.fallback-basename`、`codex.derived.skill-metadata`とする。
   各mappingはexact static seed rule/kind、closed declaration syntax、fixed base/placement/suffix、bounded fan-outを持つtyped
   edge 1本で、callback、arbitrary join、expression、glob、recursive derivationを表現不能にする。FixtureはCopilot
   marketplace、Claude marketplace、Codex marketplace、Codex skill metadataの各mappingについて、mapping-local
   `maxTargetsPerDeclaration`値4/1/1/1を順にenforceする。Codex fallbackの`maxTargetsPerDeclaration`は64とし、1 declaration
   あたりbounded ancestor positionを最大64件許可する。1 configはname最大16個とし、その全declarationにはexact static seed
   共有の128-target capも適用する。Bounded-derived
   provenance、generic relationship、sibling Codex subtree、remote source、任意config/component pathを別readのseedにしない。
   同じphysical fileの独立static provenanceは自身のtyped ruleをseedにできる。全derived provenanceはexact
   `seedProvenanceId`を指定し、1 physical seed fileのhard-link aliasを含む2 seed provenanceからのdeclarationは、同じtargetへ
   resolveしてもcollapseしない。Codex fixtureは
   plain-stringとobject `source.path`の両local marketplace formを扱う。Seed-state fixtureはknown-satisfied
   output、unresolved conditional output、known unsatisfied/shadowedまたはbounded-derived seedからの出力なし、
   stable deduplication/先頭128件保持、129件目targetへaccessしないことを証明する。Pure path fixtureは全OSで
   ADS colon、Windows-special character/device name、trailing dot/space、ambiguousなcase/Unicode-normalization alias collision、
   8.3 aliasを検証し、どれもread authorizationや中央集約したNode.js filesystem read operationへ渡さない。
7. Applicabilityはdocumentation status、product surface、root/runtime `cwd`、target match、trust/approval、
   enablement、selection、agent context、tool availability、installation、managed policy、external runtimeを
   別factとして保持する。
   Codex instruction byte budgetも別factとし、runtime chainとeffective capが判明した場合だけ`omitted`を
   生成できる。Missing/excluded inputはunknownのままとする。Projection fixtureは全summaryとcollision
   priorityを扱う。Disabledはshadowedより、shadowedはomittedより、omittedはselectedより優先し、
   documentation-unknownはruntime-conditionalより優先する。Selected、available、authored、conditional-only
   caseも扱う。
8. Fixtureは既知order/override rule、documented conflict、settings disablement、Claude
   skills-directory plugin matrixを検証する。Matrixはlaunch-`cwd`対ancestor placement、workspace trust、
   implicit root skill、明示`skills: ["./"]`、`skills/`、別declared skills pathを含む。
9. Copilot agent fixtureはprofile body/name/description/metadata、`target`の`vscode`/`github-copilot`/省略時
   both、tool/invocation field、outer-model inheritance、IDE handoff/legacy agent/body link/hook、VS Code
   conditional instruction edge、unknownなCloud/CLI instruction composition/skill preload、Cloud対CLI MCP
   source order、独立受理済みRepository declaration、excluded source layerを扱う。
10. Claude agent fixtureはsettings選択main agentとexcluded CLI override、通常fresh対forked conversation
   context、継承instruction/rule context、custom-agentのparent MCP inheritance/tool filter、inline対named
   server、strict/bare/managed restriction、built-inのpositive/negative context fact、full-preload eligibility、
   任意Skill-tool discovery、3つの固定memory scope targetを扱う。
11. Codex agent fixtureは`nickname_candidates`、model/reasoning、sandbox、MCP、skill config欠落時のparent
   inheritance対explicit child value、live sandbox/approval再適用、local対hosted surface、unknownなAGENTS.md
   inheritanceを扱う。その他Codex fixtureは
   default `hooks/hooks.json`対manifest overrideでdocumented-default/null-authored-targetとexact authored occurrenceを
   区別し、default 32-KiBとproject-declared cumulative UTF-8 capの
   1 byte手前・exact・1 byte超を扱い、broad-to-narrowでomittedになるprovenanceをassertする。
12. Source-level incompletenessと製品・インスペクター間symlink差異のfixtureで、全source-level factがtool、
   説明するnon-candidate rule、影響を受けるcandidate/relationship rule、固定reason codeを識別し、matching
   provenance/edge conditionへcanonical source factを失わず投影することを検証する。Origin-file-less Source Condition Factは
   正しいSource、tool、product surface、conditionまたはunavailable state、scope、不確実性、evidenceも保持し、physical/
   synthetic file、file ID、Source-relative Path、authored text、comparison target、relationship origin、local/hosted read、
   network requestを作成しない。

## User story検証

### 1. Repository customizationの発見

```bash
pnpm exec playwright test tests/e2e/discovery.spec.ts
```

確認項目:

1. Repository sourceがchild-process `cwd`と等しく、picker/ancestor rootがない。
2. Source、tool、kind、Source-relative Path filterをkeyboard/pointerで操作できる。全pathはowning Sourceの1 root
   からの相対値であり、Sourceをまたぐpath namespaceを意味しない。
3. 1 physical `AGENTS.md`、`CLAUDE.md`、skill、`.mcp.json`、marketplaceをcontent重複のない1 fileとして保ち、
   `(fileId, tool, kind)`ごとに正確に1 recognitionを持つ。Compatible admissionはそのrecordのprovenanceとしてmergeする。
   各recognitionが公開するのは`not-attempted | parsed | failed`だけで、file-level `parseSummary`が公開するのはcompleteな
   recognition setから導出した`not-applicable | all-parsed | mixed | all-failed`だけとし、`not-attempted`は中立に扱う。全件
   `not-attempted`なら`not-applicable`、`parsed`が1件以上かつ`failed`が0件なら`all-parsed`、`failed`が1件以上かつ
   `parsed`が0件なら`all-failed`、`parsed`と`failed`が共存するなら`mixed`とする。Recognition orderはclosed tool order、
   次にclosed kind orderとし、opaque IDをtie-breakにしない。
4. Near-miss pathがなく、empty repositoryに成功したsupport scope説明を表示する。
5. 最初のsnapshotはlegalなempty bootstrap generation 0を持つ。自動Repository scan成功時はgeneration 1をcommitし、
   forced fatal first attemptではpartial resultをpublishせず、generation 0をactiveかつcurrentのまま保ち、
   failed progressをnullにしてboundedかつactionableなlifecycle diagnosticだけを報告する。

### 2. Activationなしのinspection

```bash
pnpm exec playwright test tests/e2e/inspection-safety.spec.ts
pnpm exec playwright test tests/e2e/session-liveness.spec.ts
pnpm run test:security
```

確認項目:

1. Hook command、script、plugin component、URI、markup、MCP declarationをinert text/dataとして表示し、
   execute/connect/load/navigateしない。
2. Source/comparisonを開く前に、記述された完全なcontentには機密値が含まれ得ることをUIが示す。警告後は、
   maintained fixtureの全literal credentialと表示metadata値をsource/comparison viewへ記述されたまま表示し、
   mask/reveal controlを設けない。JSONC escaped string、YAML quoted/block scalar、TOML quoted string/datetime、
   collection punctuation、受理したduplicate fieldは、API transport後もexact source slice、source order、occurrenceを
   保持する。Structural metadata comparisonは`(tool, kind, fieldId, occurrence)`で対応付け、typed semantic valueが同値でも
   lexical differenceを表示する。Boundary-sizeのTOML integer、float、date/time valueはJavaScript precision lossなく
   typed canonical semantic payloadを保ち、authored spellingも変更しない。
3. Sentinel process valueを設定しても環境変数参照をリテラルtextのまま保ち、参照先process environment値を
   表示contentへ混入させない。
4. Operational diagnosticとlogにcustomization source valueを複製しない。
5. Malformed、unreadable、stale、binary、oversized、cycle、traversal、boundary-crossing fixtureがactionable
   safe diagnosticを作り、unaffected fileは利用可能。
6. Parser timeout、worker-memory、depth、node、scalar、metadata-entry overflowは対象recognitionのextraction
   result全体だけを破棄し、記述された完全なsourceを保持してderived read authorityを残さない。全half-open
   `SourceTextRange`はECMAScript UTF-16 code unitで測り、`sourceText.slice(start, end)`で正確にround-tripしなければ
   ならない。Astral character、unpaired surrogate、combining sequence、通常BMP textにより、UTF-8 byte countをoffsetへ
   再利用しないことを検証する。同じlogical origin occurrenceのmetadata/relationship/derivation outputはexactly identicalな
   span 1つをreuseできる。Distinct origin occurrence間のidentical/partial/nested/crossing overlap、missing/ambiguous/
   non-round-tripping spanは、そのrecognitionをall-or-nothingでfailureにする。Authored relationshipはexact target token
   sliceを使い、`normalizedTarget`とderivationには別のtyped semantic valueだけを使ってnormalized valueをauthored表示へ
   置換しない。Conditional Codex default `hooks/hooks.json` relationは`targetOrigin: documented-default`かつnull
   `authoredTarget`とし、explicit hook fieldは`authored`としてdefaultを置換する。
7. Documentation statusとapplicability factを分離し、conditional、conflicting、experimental、deprecated、
   disabled、omitted、shadowed、unknown provenance/edgeを発明した“effective”結果にしない。

### 3. 2 fileの比較

```bash
pnpm exec playwright test tests/e2e/comparison.spec.ts
```

確認項目:

1. 任意source/toolからactive-generationのreadable fileを正確に2つ選べる。
2. Read-only Monaco source modelがmasking/環境置換なしで記述された完全なtextを保持し、link/editingを無効にし、
   filesystem pathではなくopaqueなin-memory URIを使う。
3. Monacoがsemantic ranking、merge、lint、validation、format、convert、fix suggestionなしでliteral
   source差を表示する。Recognition metadataは区別可能なまま、JSONへserializeせずVueでtyped fieldを
   比較し、provenance path/status/scope/order/applicabilityとrelationship-edge applicabilityを別rowに保つ。
4. 1 file 20,000行capまたは5,000 ms Monaco computation timeoutが記述された完全なread-only side-by-side
   sourceを削除せず、actionable diagnosticを示す。
5. Rescan、removal、Global disable、route closeがstale selectionと表示済みdetail stateをclearし、関連する
   全editor/model instanceをdisposeする。
6. Keyboard/screen-reader userがlabel付きcontrolとaccessible diff viewerを使い、focus trapなしでsource
   diffへ入り、navigateし、抜けられる。
7. Packed appがeditor workerをsame-origin static assetからloadし、CSP violation、external request、
   `blob:` workerを発生させない。
8. `/`、`/compare`、`/global-consent`、`/files/<fileId>`のdirect loadが同じroot-absolute assetからbootする。
   CSPの正確なNuxt bootstrap hashは成功し、modified/unrecorded inline scriptとexecutable attributeはblockする。
9. Liveness testはvisible pageでのprocess終了、heartbeat timeout、lease expiry、hidden/page lifecycle purge、port再利用後の
   session-ID mismatch、client epoch変更後のlate in-flight responseを扱い、pre-purge inventory/detail/comparison/editor/
   authored-content DTO/DOM stateまたはacknowledgementが残留・自動復活しないことを証明する。Deterministic delivery pauseは
   linearize済みSessionSnapshot/FileDetailを保持したままscanまたはGlobal-disable commitでgenerationを進め、envelope
   generationとpayloadが混在しないことを証明する。SPAのmonotonic `clientDataEpoch`、`currentGeneration`、
   latest request tokenを検証し、old-generationまたはsuperseded token/epochのresponseがstateを再作成できないことを証明する。Newer
   snapshotをadoptする場合は先にepochを進め、old requestとgeneration-owned stateをabort/disposeする。File detailは
   capture済み`(clientDataEpoch, currentGeneration, fileId)`がlive 3値と全て一致する場合だけadoptする。
10. Active Global consentがあるhidden-to-visible recoveryでは、最初に旧DOM/DTO/editor/acknowledgement stateのpurgeを証明し、
    retained memory capabilityだけでfresh sessionを認証する。Purge済みIDを保持・比較せず返された`sessionId`を採用し、fresh
    `globalControl` projectionだけを構築する。Disableは直ちに利用でき、同じfrozen preview ID/digestを取得・検証した後は
    retry controlだけを再構築する。明示Resume inspection actionはmatching sessionを再取得してdefault filterのfresh
    inventory summaryを構築するが、old detail、comparison、editor、authored source、selection、filter、acknowledgementを
    復元しない。後のdetail/comparison requestにはnew acknowledgementを要求する。

### 4. Global inspectionへのopt-in

```bash
pnpm exec playwright test tests/e2e/global-consent.spec.ts
```

Test harnessはisolated fake tool homeを渡し、developerのreal homeを絶対にinspectしない。確認項目:

1. Consent前にGlobal pathへ一切touchせず、previewを`stat`、`realpath`、enumeration、file readなしでlexicalに
   派生する。
2. Consent viewが正確なCopilot/Claude/Codex lexical root、relative path pattern、input state、除外、
   contract version `2026-07-17`を表示する。Frozen internal previewは各exact bounded raw `lexicalRoot` stringを別に保持し、
   oversized entryの場合だけnullとする。`displayRoot`はone-way escaped presentationで、decodeしてread authorityにしない。
3. Opt-in後は文書化instruction candidateだけが0から3つの別識別tool-specific Global Sourceに表示される。
   Copilot、Claude、Codexごとに最大1つで、各Sourceは正確に1つのrootを持つ。
4. Present-empty、relative、invalid、oversizedなenv overrideは固定preview state/messageを使い、retained Diagnosticを
   作らずdefaultへ黙ってfallbackしない。Entryがabsentの場合だけdefaultを使う。Lexically eligibleだがmissing、
   unreadable、その他unusableなrootはconsent後にそのtoolの予約済みfailure diagnostic付きで拒否する。Eligible tool rootが1つもないpreviewは
   `no-eligible-global-root`を返し、consent/control recordをactivateしない。
5. 32 KiB rootと192 KiB escaped displayは正確に保持する。次の1 byteで`inputState: oversized`、
   `displayRoot: null`、`global.previewTooLarge`となり、prefix表示、normalization、canonicalization、root creation、
   authorizationを行わない。
6. Stale/changed/cross-session replayed preview ID/digestを拒否する。Digestは各entryについて、stored raw `lexicalRoot`
   string/nullとescaped `displayRoot` string/nullを、2つの別々のtype tag付きlength-prefixed fieldとしてbindする。Typed
   `TraversalPlan` version、closed selection policy、canonical programもbindする。Display fieldをraw fieldの代用にしない。Enableはfrozen raw
   valueとstored planだけを使い、environmentを再読込せず、`displayRoot`をreverse-convertせず、表示`pathPatterns`を
   authorityにしない。Digestが別fieldを保持し、admissionが
   stored raw valueを使うことをescape-collision、control-character、backslash fixtureで証明する。
   Previewで2 entryがeligible、1 entryがineligibleの場合もrequest側tool selectorは持たない。Initial enableは
   `confirmedTools`をclosed orderのeligible 2 toolだけで構成するexact setとして導出し、両方をreserve/validateする。
   Responseのdisjointな`acceptedTools`と`rejectedTools`のunionは、そのcomplete work setと一致する。`tools` keyなど
   selector-shaped extra inputはrejectされ、subset化または並べ替えできない。Retryもconfirmed toolのうちSourceがまだない
   全toolから同様にwork setを導出する。同じexact
   active consentの再利用は、confirmed toolのうちSourceがまだないtoolのretryだけに許可し、既存Sourceを変更せず、別preview/rootには
   先にdisableを要求する。Symlink、junction、case、normalization、short-name aliasによりcanonical rootがpreviewに示した
   stored raw lexical absolute rootと異なる場合はenumeration前に拒否し、暗黙に置換しない。
   Initial enable/retryいずれのcapacity exhaustionもstate mutation前に`503`を返す。Exact-capacity、all-rejected、
   partial、fatal-scan、cancellation、repeated-retry fixtureで各reservation shareを正確に1回release/transferし、terminal
   `GlobalEnableOperation` recordをunregisterすることを証明する。最後のlock済みdisposition pointでoperationが先なら、
   disable受理後にdeliveryしても`202`をcommit済みとし、barrierが先なら`409`、late side effect/reservation leakなしとし、
   次のenableを許可する。Validation中、admission後かつmutation前、job enqueue/disposition直前でpauseして両順序を扱う。
7. Disableはpriority barrierとしてactive uncommitted workをdiscardし、queued Global workをcancelしてN+1で
   全Global Sourceのremovalをcommitし、中断したRepository commandを1回requeueして最大N+2をcommitする。
   Global file、exact-content DTO、generation diagnostic、`GlobalToolControl`所有lifecycle diagnostic、comparison、
   removed Global Sourceのstale-failure entry/diagnostic pair、consent、全control、全retained root context、frozen previewを
   削除する。Repository contentとRepository
   stale-failure pairはcarryするがgeneration所有IDはrekeyする。
   Validation/admissionをpauseするfixtureでdisableを受理し、command epochをincrementしてenable operationをdrain/
   unregisterした後にlate completionを解放する。そのcompletionは最後のcancellation sweep後にcontrol mutation、diagnostic、
   context、ID、scan jobを一切作らない。Barrier-first caseでは全untransferred capacity shareを正確に1回releaseし、後の
   enableで再reserveできる。
8. 明示Global rescanはenabled時だけ受理し、Repository rescanと同じFIFO/dequeue時generation ruleに従い、commitで
   全source graphをrekeyする。Unknown/removed Sourceは`404 stale-resource`、disable pending/activeは
   `409 global-disable-pending`、duplicateは`409 scan-in-progress`を返す。Fatal attemptは
   uncommitted partial resultを0件publishし、exact consent/boundaryとtool別prior graphを保ち、そのSourceだけの
   stale-failure entryと予約済みdiagnosticを作成または置換してfailed/null progressを報告し、明示rescan/disableを
   可能にする。別Sourceの正常commitは両方をclearせず、affected Sourceのcomplete/bounded-partial正常rescanだけが両方をclearする。
9. Fatalな初回tool enableはprovisional Source/file resultをpublishせず、missing tool用の`StaleSourceFailure` entryを
   追加せず、既存entryとそこから派生するsnapshot stateをすべて保持してそのtoolのkey別予約済みfailure diagnosticを
   作成/置換する。Exact-consent retry/disableに必要なconsent/`GlobalToolControl` stateだけを残す。Mixed outcomeでは
   validation/admission中またはinitial-scan中のtoolを`pendingTools`へ残し、`unvalidated` toolをretryableにしない。
   Rejected/non-pending admitted toolをretryableとして表示してよいが、全pending work完了まではretryをdisabledとして
   `409 global-enable-in-progress`を返す。その後は該当toolだけをqueueし、成功済みSourceを保持する。Disableは直ちに利用できる。
10. Initial activationでlexically eligibleな全toolがconsent後root validationでrejectされた場合、enableはempty
    `acceptedTools`、全affected `rejectedTools`、Global Source/job/stale-failure entryなし、affected toolの予約済みfailure slotにbounded diagnosticを持つ
    `202 active-no-job`を返す。
    `globalControl`はそれらtoolをretryableとしてactiveのまま、preview routeは同じfrozen previewを返し、disableも利用できる。
    All-rejected retryはnew Source/jobを作らず既存Sourceを保持し、partial acceptanceは`queued`を返してtoolをpartitionする。
    Fatal初回scan後のretryでは、retained rootが変更済みまたは検証不能ならcontextをclose/unregisterして未公開IDを破棄し、
    後の完全な再admission前にrejected controlへauthorityを残さない。
11. Barrier queued/active中の2回目のdisableは同じcompletionへjoinしてgenerationを追加しない。Tool固有Global Source/graph、
   active consent record、retained admitted Global root context、open Global inspection `FileHandle`、running/queued Global
   scan/enable commandがない場合、無関係なRepository workが
   activeでもdisableはno-opになる。Barrier中は`globalControl.state: disabling`、pending/retry arrayはempty、UIはretryを
   提示せずenableは`409 global-disable-pending`を返す。

## 測定可能なoutcome protocol

### SC-001とSC-006のparticipant study

Product guidance、標準化したSC-001/SC-006 task prompt、対象fixture repository、SC-006の指定customization file、
4項目response form、事前定義したground truthを含む英日study kitを1つ用意する。通常の開発作業でGitと
command-line interfaceを使用するが、Inspectorの利用・開発経験がない人を正確に20人登録する。同じcohortを
1つのsessionでSC-001、SC-006の順に使用する。

Enrollment前にmaintainer teamは、accountable study owner、recruitment/compensation-funding owner、moderator/reviewer、
schedule/support contact、consent/privacyと匿名化retention procedure、提供repositoryとequipment/session support、accessibility
accommodationを示すbilingual planを公開する。Participantにpersonal repository、paid product、personal expenditureを要求しない。
通常のcontributorはparticipantをrecruit、fund、moderate、reviewしない。Resource不足はinitial-release claimをblockするが、
それ以外は適合するcontributionのreviewをblockしない。Primary workflow、提供guidance、fixture、scoring rubricのいずれかに
material changeがある場合だけstudyを再実施する。

- Moderatorは該当promptを同じ文面で読み直すことだけでき、command、navigation、interface操作のhintを提供しない。
- 登録後の機材、環境、product failureはtimer開始前も含め該当基準の不成功として数え、参加者を除外・差し替えない。
- SC-001は標準化したprompt提示時にtimerを開始し、発見されたcustomization file 1つのsource/details viewが
  画面に開かれて操作可能になった時点で終了する。意図するrepository rootへの移動とInspector起動を計測に含め、
  20人中19人以上が2分以内に成功しなければならない。
- SC-006はSC-001結果にかかわらず、全参加者を同じ指定fileが開いた同一の準備済みInspector stateへ置く。そのstateの
  準備完了後に標準化したpromptを提示した時点で開始する。Source、認識tool、file type、実効動作がcertainか
  conditionalかを2分以内に提出し、4項目すべてが事前定義したground truthと一致しなければならない。未回答・誤答が
  1項目でもあれば不成功とし、20人中18人以上の成功を必要とする。
- Primary workflow全体でcritical usability issueを0件とする。禁止された支援なしでworkflow完了を妨げる問題、または
  意図しない実行、調査対象sourceの変更、MCP/network接続、別machineへの調査content露出をcriticalとする。
  Safety eventは自動的にcriticalとする。Safety event以外のproduct起因と疑われるworkflow blockerだけを2人がfixed rubricに
  対して独立分類し、不一致は第3の裁定者を設けずcriticalとして数える。SC-006後に20人全員が標準化したcomparisonとGlobal
  consent taskを実施し、記録した観察で4つのprimary workflowすべてを扱う。

### SC-002 performance測定

文書化limit内で正確に100,000 filesystem entryと500 matching customization fileを持つdeterministic fixtureを
測定前に1つ構築し、全runで変更せず使用する。Fixtureの構築/setupと`npx` download、installation、process起動は
両timerに含めない。

`tests/performance/sc002-reference-profile.json`で公開する同じversion付きprofile上で正確に10回測定する。Profileは正確な
OS image/version、processor architecture/modelとlogical count、memory、storage medium/filesystem、正確なruntime、benchmark
command/configuration、deterministic fixture manifest/digestを特定する。RunごとにInspectorを終了し、次のrunではfresh
processを起動してapplication-memory stateと以前のsnapshotを再利用しない。Operating systemのfilesystem cacheは
意図的にclear/resetせず、自然に変化する状態で測定する。Browserがscan requestを送信した時点で両timerを開始し、
1秒timerは上記で定義した現在のrequestに対するqualifying statusが画面に表示されassistive technologyにも公開された場合だけ、
10秒timerはcomplete inventoryが表示され主要list controlが
操作可能になった時点で終了する。続いて標準化されたfilter actionとitem-selection actionを1回ずつ実施する。各interactionは、
browserのinput dispatchから対応するfiltered resultまたはselected-state feedbackが表示され操作可能になるまでを測定する。
9 run以上が両scan thresholdをrunごとに満たし、かつ両interactionを100ミリ秒未満に保たなければならない。各runとaggregate結果を
profile ID、fixture digest、実際のenvironment valueとともに記録し、個人識別子と絶対user pathだけを省略する。Profile fieldを
変更すると新しい直接比較不能なmeasurement setを開始し、結果はportable performance guaranteeではなくprofile固有とする。

## Boundary/resource-limit検証

```bash
pnpm exec vitest run tests/integration/boundaries
pnpm exec vitest run tests/integration/limits
pnpm exec vitest run tests/performance
```

Enforceする期待limit:

| Limit | 値 | Limit時の期待結果 |
|---|---:|---|
| 1 file | 1 MiB | Inventory itemを保持し、上限を越えてreadせずdiagnostic追加 |
| Retained file byte合計 | 32 MiB | Bounded partial generationをpublish |
| Visited entry | 200,000 | 決定的にenumeration停止、partial generationをpublish |
| Customization file | 2,000 | 新candidate acceptance停止、accepted item維持 |
| Path depth | 64 segment | より深いentryをsafe diagnostic付きskip |
| Hard-link alias | 1 file 1,024件 | Primary identityを保持し、新aliasを停止してdiagnostic付きpartialをpublish |
| 1 generationのhard-link alias（`maxAliasPathsPerGeneration`） | 50,000件 | 次のalias前にdeterministicなfile/path順で停止し、diagnostic付きpartialをpublish |
| Recognition（`maxRecognitionsPerFile` / `maxRecognitionsPerGeneration`） | 1 file 36件、1 generation 8,000件 | `(fileId, tool, kind)` recordを最大1件とし、deterministicなfile/tool/kind順で後続complete recognitionを停止してpartialをpublish |
| Relationship | 1 file 1,000件、direct depth 1 | Provenance/recognition/rule/kind/closed-origin/source-occurrence順の先頭1,000件を保持し、次のdistinct edgeでdiagnostic付きpartialをpublish。追跡しない |
| 1 generationのrelationship（`maxRelationshipsPerGeneration`） | 100,000件 | Stable global順の次のcomplete relationship record前に停止し、partialをpublish |
| Candidate provenance | 1 recognition 2,000件 | 追加admissionを停止し、lossy aggregateにせずpartialと明示diagnosticを作る |
| 1 generationのcandidate provenance（`maxCandidateProvenancesPerGeneration`） | 100,000件 | Stable global順の次のcomplete provenance record前に停止し、partialをpublish |
| Derived target | exact static `seedProvenanceId`ごとに128 distinct件、provenance depth 1 | Derivation-rule/closed-field/source-occurrence順の先頭128件を保持し、129件目はtarget stat/read前に停止、partialをpublishしてcap対象diagnostic candidateを渡す |
| Codex fallback name/placement | 1 config 16個、各128 UTF-8 byte、1 declaration最大64 ancestor position | Extra/oversized valueとbound超過positionをpath許可なしで拒否 |
| Parser structure | depth 64、50,000 node、1 scalar 64 KiB、1 recognition 512 metadata entry | 対象recognitionのextraction result全体を破棄し、記述された完全なsourceと無関係な成功recognitionを保持 |
| 1 generationのmetadata entry（`maxMetadataEntriesPerGeneration`） | 100,000件 | 次のrecognitionのextraction result全体を拒否してpartialをpublishし、そのprefixを保持しない |
| Parser time/isolation | 1 recognition 2,000 ms、old/young/stack 64/16/4 MiBのworkerを最大2つ | Workerをterminate/replaceし、失敗result由来のrelationship/derivationなしでpartialをpublish |
| Parser message（`maxParserMessageBytesPerRecognition` / `maxParserMessageBytesPerGeneration`） | 1 recognition 2 MiB、1 generation 32 MiB | Oversized recognitionをatomicに拒否し、generation capではdeterministic順の後続parse dispatchを停止してpartialをpublish |
| Retained graph（`maxRetainedGraphBytes`） | 64 MiB | 次のcomplete graph record保持前に停止し、partialをpublishしてpartial recordを保持しない |
| Source condition fact | 1 source 256件 | 無効な同梱registryをscan前に拒否し、既知limitationをtruncateしない |
| Assessment condition fact | 1 provenance/relationship 64件 | 無効なregistry emitterを拒否し、同じkeyの別reason/basis factを保持 |
| Scan diagnostic | 1 file 128件、1 source 5,000件、1 generation 10,000件 | 各最終slotをfixed sentinel用に予約し、後続distinct detailを決定的に抑止してoverflow時partialをpublish |
| Session lifecycle diagnostic | Committed generation外で1,024件 | RepositoryとGlobal toolごとに1つの固定failure 4 slotとfixed session sentinel用1 slotを予約し、通常detailは最大1,019件とする。Client request errorを蓄積せずcommit済みgeneration contentを変更しない |
| Lifecycle diagnostic insertion | Complete Diagnostic、重複ID、separator込みで1件2 KiB canonical UTF-8 JSON delta | Oversized keyed failureはcompact per-key recordへ変換し、oversized ordinary detailはsentinelへ抑止 |
| Lifecycle-diagnostic sub-budget | 2 MiB canonical UTF-8 JSON delta、うちfixed diagnostic用16 KiBを予約 | 通常detailはreservation外だけを使い、keyed record置換はold chargeをatomicにcredit |
| Session-control sub-budget | 1 MiB canonical UTF-8 JSON delta | Stale state、Global control、Source lifecycle/progress projectionのworst-caseをbuild testし、diagnostic/base byteを借用しない |
| Complete session overlay | 3 MiB canonical UTF-8 JSON delta | 分離した2 MiB diagnosticと1 MiB control sub-budgetの正確な合計 |
| Global preview root input | 32 KiB UTF-8 | 次の1 byteでnormalization/escape前に`oversized`/nullを返す |
| Global preview escaped display | 192 KiB UTF-8 | Output expansion前に停止し、prefixを公開せず`oversized`/nullを返す |
| Request body | 64 KiB | JSON parse前に`413` |
| Session snapshot | Neutral-overlay base 5 MiBとoverlay 3 MiB、complete UTF-8 JSON 8 MiB | Generation構築中にbase、後続session mutationごとにoverlayをenforceし、API responseをtruncateしない |
| File detail（`maxFileDetailBytes`） | 4 MiB UTF-8 JSON | Complete file record受理中にenforceし、source textまたはgraph recordをtruncateしない |
| Scan wall time | 30秒 | Abortしてbounded partial resultをpublish |
| Comparison line | 1 file 20,000行 | Monaco diff highlightをskipし、両方の記述された完全なsource viewを保持 |
| Comparison computation | 5,000 ms | Monaco diffをcancelし、両方の記述された完全なsource viewを保持 |

10秒success criterionはperformance targetでありhard timeoutではない。全limit testがdeterministic order、
停止条件後の追加readがないこと、comparison fallback/teardown後にstale Monaco modelがないことをassertする。

Aggregate/response-budget fixtureは、completeなfile summary、alias、recognition、metadata set、provenance、relationship、
diagnostic、その他graph recordを保持する前にdeterministicなcanonical encoded byteとrecord countを計算する。Cap到達時は次のwhole
recordを拒否し、該当するcontract済みbounded-partial diagnosticをpublishする。String、array item、object、source text、
graph recordを途中で切らない。APIはresponse時にtruncateせず、意図的に不整合にしたcommitted-state fixtureはpartial
`data`なしの固定safe `500 response-size-invariant` errorを返す。
Boundary fixtureはneutral-overlay baseを正確に5 MiBまで満たし、lifecycle recordをdeterministic順で追加、置換、clear、
overflowしながら、全session-control projectionの最大legal transitionを扱う。Paired 2 KiB charge、16 KiB fixed-diagnostic
reservation、keyed compact fallback、ordinary-detail suppression、shared session sentinel、atomicなold-charge credit、
2 MiB diagnostic/1 MiB controlの分離、3 MiB total overlay cap、常に8 MiB以下のcomplete final envelopeを検証する。
Build fixtureは正確なworst-case legal control projectionをserializeして1 MiB内に収め、worst-case encodingが正確に
1 MiB + 1 byteとなるsynthetic schema variantをrejectする。意図的に壊したover-limit committed control stateはlegal runtime
overflowとして扱わず、dataなしの固定`500` pathを通る。Escape/key-order fixtureはcanonical accounting bufferとHTTP
entity bodyがbyte-for-byteで一致し、存在する場合の
`Content-Length`がその正確なlengthであることをassertする。

Traversal-plan call traceはさらに、Repository traversalがcompile済みimmutable planを実行し、Global exact targetがtool-home
rootをopenせず、fixed instruction-subtree walkがそのsubtreeだけをopenし、隣接Global pathへのI/Oが0であることを証明する。
Path-spelling fixtureはexact raw `Dirent.name` segmentとNFC classification/display segmentを分離する。Collisionのない
NFD-only nameはraw segmentでreadしてNFC表示し、1 classification keyになるNFD/NFC sibling spellingは
`safe-fs-path-normalization-collision`をemitし、collision group全体へのdescend/open/read operationを0件とする。

Parser-limit testは全format、kill/replace behavior、worker crash後の成功file、all-or-nothing recognition outputを
扱う。Exact-display testはsource/metadataに異なるliteral credentialと環境変数参照を置き、別のsentinel process valueを
設定する。Source/comparison viewが記述されたtextを正確に保持し、sentinel valueを混入させず、masking/reveal controlを
表示せず、diagnostic/logにcustomization source valueを複製しないことを証明する。

Node.js filesystem boundary testは、同じplatform-neutral packageに対してsupported macOS、Windows、Linux CI
matrixで実行する。各resultはplatform、Node.js version、`node:fs.constants.O_NOFOLLOW`が存在して有効かを記録する。
Enumeration、open直前、open後かつbyteを読む前、bounded read後の各candidate verification phaseで、call traceは次の
正確な順序を示さなければならない。(1) candidate pathを`lstat`し、symbolic link、non-regular type、unexpected
identityを拒否する。(2) これが成功した後だけcandidate `realpath`と`path.relative` canonical containmentを実行する。
(3) candidate pathを2回目に`lstat`し、identity、type、size、関連timestampが最初の`lstat`と一致することを要求する。
Stable symlink fixtureは、最初の`lstat`がcandidate `realpath` callより前に拒否することを証明しなければならない。

Enumeration時とopen直前にはroot identityと全ancestor `lstat`もsnapshotまたは再検証する。その後、利用可能な場合は
有効な`O_NOFOLLOW`を必須として`FileHandle`をopenする。Open後かつread前にはordered candidate sequenceを実行し、
handleのpre-read `stat()`をそのphaseの両`lstat`結果および以前のsnapshotと比較する。Bounded read後かつparse、
publish、commitより前にはrootとancestorのcheck、ordered candidate sequence、同じopen handleの`stat()`を反復する。
Detectable changeがあればbyte buffer全体をdropし、outside sentinelをpublishしない。

Public Node.js APIにはportableなdirectory-handle-relative openがない。同じlstat/realpath/open/fstat/post-check sequenceを
全platformで必須とする。Check間にsource rootまたはancestorを置換するactive adversarial processは全platformで初期リリースの
threat model外とし、final componentの置換も有効な`O_NOFOLLOW`が利用不能な場合だけscope外とする。通常の同時editと全detectable raceはscope内で
fail closedにする。Pack済みtarballでも同じsuiteを反復し、test専用barrierをproduction exportへ含めない。

| OS observation | 必須outcome | Security proofでの扱い |
|---|---|---|
| Symlink、non-regular candidate、canonical escape、metadata mismatchを含むobservableなstable unsafe stateまたはdetectableなroot/parent/final replacement | 該当するbounded diagnosticでcandidateまたはaffected sourceを拒否し、全byteをdiscardする。Stable symlinkはcandidate `realpath`より前に拒否する | 必須passing evidence |
| Node.jsが必要identity metadataまたはcanonicalizationをerrored、ambiguous、unusableとして報告 | `safe-fs-boundary-unverifiable`を返しcandidateを拒否する。Root/shared-ancestor failureではsourceを拒否 | 必須passing evidence |
| Same-device bind mountや報告されないreparse behaviorなど、optionalなOS semanticをNode.jsから観測不能 | Platform、Node.js version、fixtureを含む明示的な`platform-unobservable` test recordをemitし、absoluteなcontainmentを主張しない | Security proofとして決して数えない |

Static-package testは2 MiB/4,096 asset/512-byte path/32 inline-hash manifest limit、exact schema/order/MIME/
size/hash validation、symlink/unexpected-file rejection、全client route上のNuxt root-absolute asset referenceを扱う。
正確なrecord済みinline scriptがCSP下でbootし、1 byte change、unrecorded script、executable attribute、nonce、
`<base>`、relative/external executable URL、blob/external workerはbind前にfail closedまたはCSPでblockする。
固定generated `200.html`/`404.html`だけを除去し、他のHTMLを受理せず、どちらのaliasもpack/serveしないことも
assertする。
Server/package caseはclosed server manifest、required CLI/Worker entry、全tsdown chunk、clean staging/output setup、
各output subtreeへ1つ注入したstale file/non-regular pathを拒否するrecursive exact-set comparisonを検証する。別bootstrap
faultでstatic/server各manifest fieldと各listed-asset propertyを壊し、package version、両complete manifest、全listed assetの
検証成功まで`bin.mjs`が`dist/cli.mjs`をdynamic import/evaluateせずbindもしないことをinstrumentationで証明する。

Diagnostic limit testはcode/source/file/argument deduplication、固定phase/source/path/rule/code/occurrence順、
overflowなしでは未使用のreserved slot、4つ全ての`diagnostic-limit-*` sentinel、saturating suppressed count、
outer scope capでdropしたdetailへのreference除去、active generationを変更しないsession overflowを扱う。
Multi-Source caseではA/Bのentry-diagnostic pairが共存し、B successがAを保持し、A successだけがAのpairをclearし、
A再failureがAのpairだけを置換し、Global disableがGlobal pairだけを除去することを証明する。Client起因API errorを反復してもretained
diagnostic countを増やさない。

## Manual accessibility review

Automated E2E合格後、built packageで確認する。

1. Keyboardだけでlaunch/URL follow、filter、機密content警告のacknowledge、file open/close、2 file select/compare、
   Global consent open、Global enable/disable、rescan、inventory returnを行う。
2. Visible focus、logical focus order、skip/navigation landmark、unique label、status announcement、
   error/next-step association、generation replacement時にfocusを失わないことを確認する。
3. Light/dark/forced-colors、200% zoom、narrow viewport reflow、reduced motion、tool、file kind、documentation
   status、applicability fact、機密content警告、diagnosticのscreen-reader name、Monaco accessible diff viewerと
   narrow-screen inline layoutを確認する。
4. Tool、state、severity、selection、diffを色だけで示していないことを確認する。
5. Browser/OS/assistive-technology versionとresidual issueを記録する。CriticalなWCAG 2.2 AA defectは
   completionをblockする。

## Release package検証

```bash
pnpm outdated
pnpm run test:package
pnpm run test:docs
git diff --check
```

`pnpm outdated`を見てblind upgradeしない。新しいprereleaseや非互換TypeScript/Vite majorは
[research.ja.md](research.ja.md)で文書化した最新互換versionを置換しない。Tarballがnpmの`package.json`と
exact `package.json.files` entryの`bin.mjs`、`dist`、`README.md`、`README.ja.md`、`LICENSE`だけを含むことを
assertし、展開した`dist/**` contentが2 manifestとlisted fileに一致することを確認する。Exact `bin` mappingと
`main`/`module`/`exports`不在、license notice、exact shebang/executable mode、strict static/server manifest、
公開README pairを確認する。Exact production dependencyは`gunshi`、`yaml`、`jsonc-parser`、`smol-toml`とし、
`open`は全dependency sectionとproduction lock closureに存在してはならない。

展開したroot tarballとisolated install済みproduction closureをauditする。最初のscript-disabledかつdevelopment
dependency省略installはexact lockfile/manifest graphと一致し、全project/dependency tarball payloadにlifecycle/build
requirement、platform selector、bundled/optional native package、native/binary/Wasm extensionまたはmagic、native build
source/metadata、non-Node shebang、executable non-JavaScript file、package-owned shell helperがないことを検証する。同じ
verified cacheからnetwork accessを無効にしたnormal lifecycle install後にauditを反復する。`package-payload` digestをpackage
ごとに別計算し、package name、version、integrity、そのpayload digestをproduction-graph digestへbindする。Package manager
生成launch shimはpayload/graph digestから除外し、全CI OSで同じgraph digestを要求してshimはOS別にauditする。Exactな宣言済み
`package.json.bin` targetをaudit済みNode JavaScriptへargvだけforwardする生成`.bin` symlinkと`.cmd`/`.ps1` shimだけを許可し、
追加input/logicまたはunexpected shimはfailureとする。生成HTML shell、CSS、JSON manifest、documentation、license fileは
declarativeかつnon-executableなpayload artifactとして受理し、manifest-authorized bootstrapはJavaScript executable codeの
ままとする。FR-038はproject-authored executable application codeと公開/install済みproductを対象とし、third-party
development/test toolingはその公開boundary外で別にauditする。

Launcher testはexact macOS/Linux helper、URL validation、`shell: false`、sole argv itemとしてのURL、attempt前の1回のURL line、
`--no-open`でchild processが0件であること、missing/nonzero/unsupported helperでのfixed-warning/manual-URL fallbackを扱う。
Gunshiのbindしないhelp/version、strict unknown-option拒否、明示的なpositional/rest拒否、固定された上限付きnonzero
validation failure、await済みcompletion、root-only import boundaryも扱う。上記exact minimal OS別environment
allowlistをassertし、`BROWSER`、`NODE_OPTIONS`、`NODE_PATH`、inspected value、その他
environment value、extra argvがcommandを選択・変更できないことを証明する。Windowsとその他unsupported-platform fixtureは
child processが0件で固定manual-URL warningが出ることをassertする。TestはOS helperがdefault handlerへ委譲するだけでversionを
certifyできないことも証明する。Release recordはpin済みPlaywright revisionを使用し、`--no-open`と表示URLをmanual certified-browser
fallbackとする。`pnpm run test:docs`はplanning setを公開せず、repository内の全英日document
pairを別に検証する。同じtarballを宣言したNode.js 24/26 engine range全体にわたりCI matrixの全supported OSでinstall/launchし、
Node.js filesystem security suiteに合格させる。正確な6つのlower-bound OS/architecture jobはcertification sampleであり、Node.js
24.18.0はdevelopment/build baselineである。どちらも宣言済みcompatibility rangeを狭めない。最後にcomplete diffをreviewし、untested branch、secret exposure、古いofficial-path assumption、
accidental source mutation、unrelated changeがないことを確認してからreleaseする。

`pnpm run test:package`は新規pack済みtarballをisolated fixtureへinstallし、
`npx --no-install agent-customization-inspector --no-open`をspawnし、valid loopback launch URLを観測してprocessを
終了し、起動したCLIがbrowser-helper childをspawnしなかったことをassertしなければならない。Tarball/mapping
inspectionだけではlaunch testにならない。
