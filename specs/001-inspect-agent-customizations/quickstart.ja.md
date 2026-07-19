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
  `dist/cli.mjs`をstatic importせず、packed `package.json`がwell-formedであること、その`engines.node` stringが正確に
  `^24.11.0 || ^26.0.0`であること、実行中Node.js versionがその展開range内にあること、
  installed package version、static/server両manifest、全listed assetのexact path、regular-file type、size、digestを
  検証する。各manifestのdeclared byte lengthはregular fileのactual byte lengthと一致し、closed file set、MIME type、
  digestも一致しなければならない。利用可能なcapacityはNode.js、filesystem、実行環境が決め、bootstrapはfile-size、
  record-count、buffering、open-handleの上限を定義しない。全check成功後だけ`dist/cli.mjs`をdynamic
  importし、serverをbindできるのはそのimport済みCLIだけとする。
- `package.json.bin`は正確に`{ "agent-customization-inspector": "bin.mjs" }`、`main`、`module`、`exports`は不在。
- Malformed/inconsistent manifest、package-version mismatch、missing/unexpected asset、symlink/non-regular asset、
  size/digest mismatchは、CLI module evaluation前かつlocal server bind前にfailureとする。Build、packed tarball、
  runtime verificationは、利用可能なcapacityを実行環境に委ねつつ同じintegrity contractをenforceする。これらのcheckは
  customization-file contentをvalidateしない。
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
  表示しassistive technologyにも公開する。Failureは実行可能な次の手順も示し、Source/progressはそのrequestのopaqueな
  `scanRequestId`を識別する。一般的なspinner/loading label、変化しない
  control、scan stateを示さないacknowledgement、以前のscanのstatusは数えない。
- 最初のcomplete inventoryが表示され、凍結path contract外のfileを含まない。
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
`BROWSER`、`NODE_OPTIONS`、`NODE_PATH`、allowlist外の全environment key、inspection由来のcontent、path、authored value、
user-supplied command、environment-selected handler、追加argvは渡さない。Allowlist済みkeyはlaunch environmentから
ambient platform contextとしてだけ直接copyし、Source/preview/candidate/file pathまたはauthored valueをinspection stateから
argv/environmentへcopyしない。そのtextがambient valueとlexicalに一致してもprovenanceを変えず、authorityを与えず、
handlerを選択しない。この固定startup helperを、
initial releaseで許可する唯一のproduct起動child processとする。
Portable Nodeから独立したtrusted system-helper boundaryを得られないため、このreleaseではWindowsとその他platformの
automatic openを意図的にskipする。Missing/nonzero helperとunsupported platformでも固定manual-URL warning付きでserverを継続する。Automatic browser
openが失敗しても既に表示したlocal URLを利用できる。
初期リリースにはrepository argument、ancestor-root discovery、remote-host flag、static-export command、MCP commandはない。

Operational eventが使うのはstableなfixed codeと、任意のopaque session/source/file/scan/operation IDだけである。
Source-relative/absolute/canonical path、root、filename、調査対象content/metadata、authored value、capability、request/
response body、raw parser/system error、exception string、Diagnostic argumentを含めない。Fixed help/version、1行だけの
launch URL、fixed actionable startup warningはpresentation outputであり、operational logではない。Authenticated file
Diagnosticはsession UIへcontainment検証済みのSource-relative Pathを表示してよいが、そのpathをoperational outputへcopyしない。

固定helperはURLをOS default browserへ委譲するだけで、browser versionを選択も検証もしない。Helper成功はcompatibility
evidenceではない。Deterministicなcertificationでは`--no-open`を使い、表示URLを3つのpin済みPlaywright revisionの1つへ
貼り付ける。Enrollment済みのparticipant-study sessionごとに、実際のOS default handlerまたはそのunavailabilityと、解決可能な
場合は実際のbrowser family/revisionを記録する。Default handler自体がcertifiedである必要はなく、fallbackはenrollmentの前提では
ない。Automatic openingがdisabled、unsupported、または失敗した場合、handler/browserがunavailableまたはunidentifiableな場合、
もしくは解決したbrowserがcertification baseline外の場合は、同じenrollment済みsession内で表示URLをpin済みcertified browserに
入力し、そのfallbackを記録する。そのsessionのoutcomeは固定denominatorに残し、participantを置き換えない。

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
- Unit testがpath classification、order、parser failure isolation、記述された値の完全表示、環境変数参照の非解決、
  diagnostic、state transition、deterministic projectionを扱う。
- Contract testが全API status/security ruleと全stable behavior、inspection-rule、composition-strategy、
  official-source IDを扱い、positive、1-rule near-miss、derived、relationship-only、excluded、
  multi-provenance、multi-tool、Global caseを含む。返却する全metadata field/relationship kindがsupportedな
  `(tool, kind)`の維持管理するclosed presentation allowlistに含まれ、そのadmissionのsource-form extractorが認識する
  exact occurrenceであること、tuple membershipだけで1つのsource formのfieldを別formへeligibleにしないことも証明する。
  Unknownなauthored key/referenceは完全なsource textからだけ利用可能とする。これらのtestまたはimplementationを開始する
  前に、3つすべてのvendor-contract language pairのPresentation Allowlist sectionがsupportedな全`(tool, kind)`とadmit済み
  source formを列挙済みでなければならない。
- Integration/security testがsource containmentとcustomization由来のexecution、child process、MCP
  connection、outbound request、dynamic evaluation、source mutationが0であることを証明する。別test対象のstartup
  launcherへinspection由来のcontent/path、authored value、user-supplied command、environment-selected handlerを渡さない。
  Closedなambient platform keyだけをlaunch environmentから直接copyし、Source rootとのlexical一致はprovenanceもauthorityも変えない。
- Package testがtarballをbuild/inspectionし、isolated fixtureへinstallし、packaged Node.js filesystem serviceと
  固定のpackaged parser Worker URLをloadして、working tree/runtime downloadへ依存せず正確な`npx` entryを
  launchする。Production closure全体のscripts-disabled installとnetwork-disabled normal installもauditし、closedな
  payload-JavaScript/no-lifecycle/no-native policy、package-manager生成shimの別audit、全CI OSで同じpackage graph digestを
  確認する。Negative bootstrap fixtureは、両manifestと全listed assetの検証成功前に`bin.mjs`がCLIをevaluateまたはbind
  しないことを証明する。
- 内容を変更しない100,000 entry/500 customization fileのdeterministic performance fixtureを、同じversion付き
  checked-in profile上の正確に10個のfresh Inspector processで測定する。同じ9件以上の各runが、後述timer/cache protocolの
  もと1秒以内に現在のrequestに対するqualifying statusを表示し、10秒以内に完了し、標準化されたfilterとitem-selectionの
  両方についてinput dispatchからvisibleかつoperableな結果までの測定を100ミリ秒未満にしなければならない。
- Browser、contract、manual evidenceが4 user storyすべてを扱い、
  [SC-008の55行matrix](contracts/accessibility-acceptance.ja.md)のApplicableな全行とNot-applicable再確認を満たす。
  Axeのseverity結果だけではpassにならない。
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
   immutable registryに存在する。全cross-referenceが解決し、全`sourceRefs` entryが対応する
   `OfficialSourceRecord`と相互一致し、offline testがsemantic fingerprintを再計算する。明示drift checkは
   official HTTPS hostとexact section selection/normalizationを強制する。Recoverableなnetworkまたは実行環境failureは
   behavior/rule/strategy/check-in済みdigestを自動更新せずfail closedし、製品固有の数値fetch capはcontractに含めない。
2. Vendor lookup base、relative selector、traversal modeをInspector matcherから独立して検証する。全Repository
   matcherは正確な`./` Baseと、`./` relative selectorに1対1で対応してcanonical round-tripするtyped segment
   programを持つ。Bare `**/`、unknown/misplaced token、隣接するrecursive token、selector/program件数不一致を
   拒否する。Fixtureはdescendant-plus-direct-childとdescendant-plus-recursive-subtreeのcompositeを扱う。`./**/`は
   明示的なInspector descendant inventoryとしてだけ受理し、vendorの下向きwalkの証明とは解釈しない。Build validationは
   accepted programをimmutableかつversionedな`TraversalPlan` dataへcompileし、runtime testはfilesystem serviceがselector
   textを再parseしたりgeneric walkerへ置換したりせず、そのdataだけをinterpretすることを証明する。Global exact-file planは
   tool-home rootをopenせずfixed ancestor/target chainだけにtouchし、fixed-instruction-subtree planはそのnamed subtreeと
   permitted descendantだけをopenする。隣接する全Global setting、credential、state、plugin、その他neighbor pathへの
   `opendir`、`lstat`、`realpath`、open、read callは0件とする。ClosedなCodex Global planは最初に
   `AGENTS.override.md`をprobeし、安全にreadしたnon-empty override後は`AGENTS.md`へoperationを0件とし、absentまたは安全に
   emptyと確定した場合だけ次へ進む。Unsafe、unreadable、environment failure、decode不能なpresent candidateではfallbackせず
   fail closedし、non-empty fileを最大1件だけpublishする。Absent、empty、BOM-only、whitespace-only、non-empty、
   unreadable、environment failure、decode不能、non-regular fixtureを両ordered targetへ独立に適用する。Root verification後の
   exact-target `lstat`による明示的not-foundだけをabsentとし、その他の全errorと最初の観測後の消失はfail closedする。
   これらのfixtureでcontent rule、short-circuit、および非選択targetへのoperation 0件を固定する。
3. Static ruleはtyped literal/one-segment/recursive-directory programとtraversal boundaryだけを許可し、runtimeで
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
   各mappingはexact static seed rule/kind、closed declaration syntax、fixed base/placement/suffixを持つtyped
   edge 1本で、callback、arbitrary join、expression、glob、recursive derivationを表現不能にする。Programはtarget、
   declaration、name、ancestryの数値上限を定義せず、利用可能なcapacityはNode.jsと実行環境から継承する。Bounded-derived
   provenance、generic relationship、sibling Codex subtree、remote source、任意config/component pathを別readのseedにしない。
   同じphysical fileの独立static provenanceは自身のtyped ruleをseedにできる。全derived provenanceはexact
   `seedProvenanceId`を指定し、1 physical seed fileのhard-link aliasを含む2 seed provenanceからのdeclarationは、同じtargetへ
   resolveしてもcollapseしない。Codex fixtureは
   plain-stringとobject `source.path`の両local marketplace formを扱う。Seed-state fixtureはknown-satisfied
   output、unresolved conditional output、known unsatisfied/shadowedまたはbounded-derived seedからの出力なし、
   製品定義の保持件数なしのstable deduplicationを証明する。Pure path fixtureは全OSで
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
   区別する。Upstream設定のinstruction-budget behaviorはvendor applicability factのままとし、Inspector validation capとして
   再定義しない。
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
   failed progressをnullにしてactionableなlifecycle diagnosticだけを報告する。
6. 自動または明示的な各scanはopaqueな`scanRequestId`を1つ持つ。明示的Repository rescanのadmission response、
   waiting/active/complete/`partial`（contracted-partialのみ）/failedを通じたSource/progress、commitしたgenerationはそのIDを保持し、以前のstatusや
   inventoryではnew commandを満たせない。

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
   typed canonical semantic payloadを保ち、authored spellingも変更しない。Acknowledgementはpresentation gateとして
   browser memoryだけに存在し、hostへ送信も永続化もしない。Acknowledgement API/fieldは存在せず、bearer capabilityが
   host側の完全なauthorization boundaryである。
3. Sentinel process valueを設定しても環境変数参照をリテラルtextのまま保ち、参照先process environment値を
   表示contentへ混入させない。
4. Authenticated Diagnosticは文書化済みのclosed fieldだけを含む。Captureしたoperational eventはclosedな
   fixed-code/opaque-ID schemaだけを受理し、Source-relative/absolute/canonical path、root、filename、customization
   content/metadata、authored value、capability、body、raw error、exception string、Diagnostic argumentを含めない。
5. Malformed、unreadable、stale、binary、cycle、traversal、boundary-crossing fixtureはactionable safe diagnosticを作る。
   決定的かつentry-localでcapacityに起因しないfailureは、完全なtraversal後のcontracted-partial commitでだけ非影響fileを
   維持してよい。注入したenvironment-resource failureはattemptをabortし、item、scan-result record/response、generationを一切公開せず、
   以前のcommit済みsnapshotだけを維持する。File sizeとcollection件数からvalid/invalid、correctness、compliance、lintのverdictを一切作らない。
6. Read後の全check後、NUL byteが1つでもあればbinary diagnostic-only itemとする。それ以外はstrict UTF-8としてdecodeし、
   先頭BOM 1つを記録して除去し、不正なUTF-8をreplacement/別decodeなしのunsupportedとして拒否し、binary/unsupported itemへ
   source/comparison eligibilityを与えない。決定的かつcapacityに起因しないparser、Worker、extraction failureは対象recognitionの
   extraction result全体だけを破棄し、完全なauthored sourceとcomparison eligibilityを保持してderived read authorityを残さない。
   Parser/Worker/Node.js/実行環境のresource failureはparser、recognition、relationship、derived outputを一切返さず`fatal-resource`を
   propagateし、scan-result record/responseもgenerationも公開せず、以前のcommit済みsnapshotだけを維持する。全half-open
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
8. Inventory、Detail、Comparison、Global control、Diagnostic、Source Condition Fact、API response、CLI text、
   documentationは、syntactic parsing、exact authored-literal extraction、mechanical typed decoding、
   frozen-catalog classification、documented structural scope/order/condition/selection/reference projectionの範囲に
   留まる。Natural-languageの意味やintentをinterpret/rankせず、correctness、validity、compliance、effectiveness、
   qualityを判定せず、policy/remediation advice、validation、lint、synchronization、conversion、formatting、fixingを
   提供しない。

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
4. Monacoとbrowserのcapacityはbrowser engineと実行環境から継承する。Recoverableなeditor computation failureは
   記述された完全なread-only side-by-side sourceを削除せず、actionable diagnosticを示す。
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
   contract version `2026-07-17`を表示する。Frozen internal previewは各exact raw `lexicalRoot` stringまたは固定null
   lexical stateを別に保持する。`displayRoot`はone-way escaped presentationで、decodeしてread authorityにしない。
   Preview capacityはNode.jsと実行環境から継承する。
3. Opt-in後は文書化instruction candidateだけが0から3つの別識別tool-specific Global Sourceに表示される。
   Copilot、Claude、Codexごとに最大1つで、各Sourceは正確に1つのrootを持つ。
4. Present-empty、relative、invalid、environment failureのenv overrideは固定preview state/messageを使い、retained Diagnosticを
   作らずdefaultへ黙ってfallbackしない。Entryがabsentの場合だけdefaultを使う。Lexically eligibleだがmissing、
   unreadable、その他unusableなrootはconsent後にそのtoolのfailure diagnostic付きで拒否する。表現可能なabsolute rootは通常の
   home外でもeligibleであり、その場所だけを理由にrejectしたりconsent前I/O authorityを与えたりしない。Eligible tool rootが1つもないpreviewは
   `no-eligible-global-root`を返し、consent/control recordをactivateしない。
5. 注入したrecoverableなNode.jsまたはenvironment-capacity failureは、prefix表示、normalization、canonicalization、
   root creation、authorizationなしの固定non-authorizing preview stateを返す。Rootまたはescaped displayの数値上限は定義しない。
6. Stale/changed/cross-session replayed preview ID/digestを拒否する。Digestは各entryについて、stored raw `lexicalRoot`
   string/nullとescaped `displayRoot` string/nullを、2つの別々のtype tag付きlength-prefixed fieldとしてbindする。Typed
   `TraversalPlan` version、closed selection policy、canonical programもbindする。Display fieldをraw fieldの代用にしない。Enableはfrozen raw
   valueとstored planだけを使い、environmentを再読込せず、`displayRoot`をreverse-convertせず、表示`pathPatterns`を
   authorityにしない。Digestが別fieldを保持し、admissionが
   stored raw valueを使うことをescape-collision、control-character、backslash fixtureで証明する。
   Previewで2 entryがeligible、1 entryがineligibleの場合もrequest側tool selectorは持たない。Initial enableは
   `confirmedTools`をclosed orderのeligible 2 toolだけで構成するexact setとして導出し、両方をvalidateする。
   Responseのdisjointな`acceptedTools`と`rejectedTools`のunionは、そのcomplete work setと一致する。`tools` keyなど
   selector-shaped extra inputはrejectされ、subset化または並べ替えできない。Retryもconfirmed toolのうちSourceがまだない
   全toolから同様にwork setを導出する。同じexact
   active consentの再利用は、confirmed toolのうちSourceがまだないtoolのretryだけに許可し、既存Sourceはsemantic contentだけを
   変更せず、別preview/rootには先にdisableを要求する。Initial/retryのGlobal commitが成功するたびにgenerationを進め、carryした
   Repositoryおよび他Sourceのgraphと全generation所有IDをrekeyし、旧file/detail/comparison/selection/editor stateをinvalidateする。
   Symlink、junction、case、normalization、short-name aliasによりcanonical rootがpreviewに示した
   stored raw lexical absolute rootと異なる場合はenumeration前に拒否し、暗黙に置換しない。
   Coordinatorはcorrectness-sensitiveなadmissionとscan workをserializeし、製品定義のslotまたはqueue-capacity上限を持たない。
   注入したrecoverableなadmission failureはstate mutation前に発生する。All-rejected、contracted-partial、fatal-scan、cancellation、
   repeated-retry fixtureでterminal `GlobalEnableOperation` recordをunregisterすることを証明する。最後のlock済み
   disposition pointでoperationが先なら、disable受理後にdeliveryしても`202`をcommit済みとし、barrierが先なら`409`、
   late side effect/operation-history leakなしとし、
   次のenableを許可する。Validation中、admission後かつmutation前、job enqueue/disposition直前でpauseして両順序を扱う。
7. Disableはpriority barrierとしてactive uncommitted workをdiscardし、queued Global workをcancelしてN+1で
   全Global Sourceのremovalをcommitし、中断したRepository commandを1回requeueして最大N+2をcommitする。
   Global file、exact-content DTO、generation diagnostic、`GlobalToolControl`所有lifecycle diagnostic、comparison、
   removed Global Sourceのstale-failure entry/diagnostic pair、consent、全control、全retained root context、frozen previewを
   削除する。Repository contentとRepository
   stale-failure pairはcarryするがgeneration所有IDはrekeyする。
   Validation/admissionをpauseするfixtureでdisableを受理し、command epochをincrementしてenable operationをdrain/
   unregisterした後にlate completionを解放する。そのcompletionは最後のcancellation sweep後にcontrol mutation、diagnostic、
   context、ID、scan jobを一切作らない。Cancelled operationがunregisterされた後は、後のenableを実行できる。
8. 明示Global rescanはenabled時だけ受理し、Repository rescanと同じFIFO/dequeue時generation ruleに従い、commitで
   全source graphをrekeyする。そのadmission response、Source/progress、successful generationは同じopaqueな
   `scanRequestId`を保持する。Unknown/removed Sourceは`404 stale-resource`、disable pending/activeは
   `409 global-disable-pending`、duplicateは`409 scan-in-progress`を返す。Fatal attemptは
   uncommitted partial resultを0件publishし、exact consent/boundaryとtool別prior graphを保ち、そのSourceだけの
   stale-failure entryとlifecycle diagnosticを作成または置換してfailed/null progressを報告し、明示rescan/disableを
   可能にする。別Sourceの正常commitは両方をclearせず、affected Sourceのcomplete/contracted-partial正常rescanだけが両方をclearする。
9. Fatalな初回tool enableはprovisional Source/file resultをpublishせず、missing tool用の`StaleSourceFailure` entryを
   追加せず、既存entryとそこから派生するsnapshot stateをすべて保持してそのtoolのkey別failure diagnosticを
   作成/置換する。Exact-consent retry/disableに必要なconsent/`GlobalToolControl` stateだけを残す。Mixed outcomeでは
   validation/admission中またはinitial-scan中のtoolを`pendingTools`へ残し、`unvalidated` toolをretryableにしない。
   Rejected/non-pending admitted toolをretryableとして表示してよいが、全pending work完了まではretryをdisabledとして
   `409 global-enable-in-progress`を返す。その後は該当toolだけをqueueし、成功済みSourceを保持する。Disableは直ちに利用できる。
10. Initial activationでlexically eligibleな全toolがconsent後root validationでrejectされた場合、enableはempty
    `acceptedTools`、全affected `rejectedTools`、Global Source/job/stale-failure entryなし、affected tool所有のactionable
    diagnosticを持つ`202 active-no-job`を返す。
    `globalControl`はそれらtoolをretryableとしてactiveのまま、preview routeは同じfrozen previewを返し、disableも利用できる。
    All-rejected retryはnew Source/jobを作らずgenerationをcommitせず、既存SourceとそのIDを正確に保持する。
    Partial acceptanceは`queued`を返してtoolをpartitionする。
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

正確に100,000 filesystem entryと500 matching customization fileを持つdeterministic fixtureを
測定前に1つ構築し、全runで変更せず使用する。Fixtureの構築/setupと`npx` download、installation、process起動は
両timerに含めない。

`tests/performance/sc002-reference-profile.json`で公開する同じversion付きprofile上で正確に10回測定する。Profileは正確な
OS image/version、processor architecture/modelとlogical count、memory、storage medium/filesystem、正確なruntime、benchmark
command/configuration、deterministic fixture manifest/digestを特定する。RunごとにInspectorを終了し、次のrunではfresh
processを起動してapplication-memory stateと以前のsnapshotを再利用しない。Operating systemのfilesystem cacheは
意図的にclear/resetせず、自然に変化する状態で測定する。各fresh processでは、まず自動初回Repository scanがterminal
stateへ達するまで待つ。そのscanとinventoryは両timerの対象外とする。次にbrowserから明示的Repository rescanを正確に
1件dispatchし、その時点で両timerを開始してadmission responseのopaqueな`scanRequestId`をcaptureする。1秒timerは、
上記qualifying statusが画面に表示されassistive technologyにも公開され、同じrequest IDを識別した場合だけ停止する。
10秒timerは、その同じrequest IDがcommitしたgeneration由来のcomplete inventoryが表示され、主要list controlが
操作可能になった時点だけで停止する。以前のstatus、snapshot、自動scan generationではどちらのtimerも停止できない。
続いて標準化されたfilter actionとitem-selection actionを1回ずつ実施する。各interactionは、
browserのinput dispatchから対応するfiltered resultまたはselected-state feedbackが表示され操作可能になるまでを測定する。
9 run以上が両scan thresholdをrunごとに満たし、かつ両interactionを100ミリ秒未満に保たなければならない。各runとaggregate結果を
profile ID、fixture digest、scan request ID、committed generation、実際のenvironment valueとともに記録し、個人識別子と
絶対user pathだけを省略する。Profile fieldを
変更すると新しい直接比較不能なmeasurement setを開始し、結果はportable performance guaranteeではなくprofile固有とする。

## Boundaryと実行環境capacityの検証

```bash
pnpm exec vitest run tests/integration/boundaries
pnpm exec vitest run tests/performance
```

Inspectorはfile単体または合計byte、file/record数、path/parser structure、worker、message、
retained graph、request/response body、package asset、preview、editor computation、coordinator work、
scan経過時間について製品定義の数値上限を持たない。利用可能なcapacityはNode.js、選択したparser、OS、
filesystem、browser engine、実行環境により決まる。それに相当する製品レベルのcapacity-validation
contractは公開しない。

Boundary fixtureは関連する各実行環境boundaryでrecoverableなcapacity/resource failureを注入し、対象operationがabortすることを
検証する。Capacity/resource failureとなったread、parse、Worker exchange、serialization、package verification、preview construction、editor
computationの失敗はitem、recognition、derived result、scan-result record/response、generationを一切publishせず、read authorityを与えず、customizationの
validity、correctness、compliance、lint verdictを作らない。以前のcommit済みsnapshotだけを、その中の無関係なfileを含めて
利用可能なままとし、API responseとauthored sourceをtruncateしない。

別fixtureは、完全なtraversal後の決定的かつentry-localでcapacityに起因しないfailureだけが`committable-partial`へ到達し、
完全な非影響entryを持つ1つのatomic contracted-partial generationを公開できることを証明する。

Coordinator testはslot、queue capacity、scheduling deadlineを定義せず、deterministic serialization、generation
atomicity、cancellation、disable/shutdown/supersession時のauthority revoke、late-result discardを保つ。Liveness
protocolとSC-002のtime thresholdはcapacity上限ではなくacceptance criterionである。Testはrecoverableな実行環境
failureをsimulateできるが、processを終了させるout-of-memoryからのrecoveryや、uncancellableなNode.js/kernel I/Oの
physical cancellationは保証しない。

Traversal-plan call traceはさらに、Repository traversalがcompile済みimmutable planを実行し、Global exact targetがtool-home
rootをopenせず、fixed instruction-subtree walkがそのsubtreeだけをopenし、隣接Global pathへのI/Oが0であることを証明する。
Path-spelling fixtureはexact raw `Dirent.name` segmentとNFC classification/display segmentを分離する。Collisionのない
NFD-only nameはraw segmentでreadしてNFC表示し、1 classification keyになるNFD/NFC sibling spellingは
`safe-fs-path-normalization-collision`をemitし、collision group全体へのdescend/open/read operationを0件とする。

Parser-failure testは全format、kill/replace behavior、parser、extraction、recognition、relationship、derived result、item、Sourceを
一切返さず`fatal-resource`をpropagateし、scan-result record/responseもgenerationも作らずattemptをabortして以前のcommit済みsnapshotだけを
維持するWorker crash、新たにadmit済みretry内でのみ後続する成功file、all-or-nothing recognition outputを扱う。
Exact-display testはsource/metadataに異なるliteral credentialと環境変数参照を置き、別のsentinel process valueを
設定する。Source/comparison viewが記述されたtextを正確に保持し、sentinel valueを混入させず、masking/reveal controlを
表示せず、Diagnosticにcustomization source valueを複製しないことを証明する。別のoperational-event captureはfixed event
codeとopaque IDだけを受理し、path、root、filename、調査対象/authored value、capability、body、raw error、exception、
Diagnostic argumentを一切emitしないことを証明する。

Node.js filesystem boundary testは、同じplatform-neutral packageに対してsupported macOS、Windows、Linux CI
matrixで実行する。各resultはplatform、Node.js version、`node:fs.constants.O_NOFOLLOW`が存在して有効かを記録する。
Enumeration、open直前、open後かつbyteを読む前、complete read後の各candidate verification phaseで、call traceは次の
正確な順序を示さなければならない。(1) candidate pathを`lstat`し、symbolic link、non-regular type、unexpected
identityを拒否する。(2) これが成功した後だけcandidate `realpath`と`path.relative` canonical containmentを実行する。
(3) candidate pathを2回目に`lstat`し、identity、type、size、関連timestampが最初の`lstat`と一致することを要求する。
Stable symlink fixtureは、最初の`lstat`がcandidate `realpath` callより前に拒否することを証明しなければならない。

Filesystem call recorderはさらに、調査対象sourceへのopenが全てread-only、non-create、non-truncateであり、write、
append、create、truncate、rename、delete、link、chmod/chown、timestamp、extended-attribute、ACL、または同等の
mutation-capable callが一切ないことを証明する。Fixtureのbefore/after measurementはcontent、length、identity/link
state、mode、modification/change time、観測可能なextended attribute/ACLを比較する。OS readだけが原因のaccess-time
movementは別に記録し、no-product-mutation assertionをfailさせずproofにも数えず、product callから要求もしない。

Enumeration時とopen直前にはroot identityと全ancestor `lstat`もsnapshotまたは再検証する。その後、利用可能な場合は
有効な`O_NOFOLLOW`を必須として`FileHandle`をopenする。Open後かつread前にはordered candidate sequenceを実行し、
handleのpre-read `stat()`をそのphaseの両`lstat`結果および以前のsnapshotと比較する。Complete read後かつparse、
publish、commitより前にはrootとancestorのcheck、ordered candidate sequence、同じopen handleの`stat()`を反復する。
Detectable changeがあればbyte buffer全体をdropし、outside sentinelをpublishしない。

Public Node.js APIにはportableなdirectory-handle-relative openがない。同じlstat/realpath/open/fstat/post-check sequenceを
全platformで必須とする。Check間にsource rootまたはancestorを置換するactive adversarial processは全platformで初期リリースの
threat model外とし、final componentの置換も有効な`O_NOFOLLOW`が利用不能な場合だけscope外とする。通常の同時editと全detectable raceはscope内で
fail closedにする。Pack済みtarballでも同じsuiteを反復し、test専用barrierをproduction exportへ含めない。

| OS observation | 必須outcome | Security proofでの扱い |
|---|---|---|
| Symlink、non-regular candidate、canonical escape、metadata mismatchを含むobservableなstable unsafe stateまたはdetectableなroot/parent/final replacement | 該当するdiagnosticでcandidateまたはaffected sourceを拒否し、全byteをdiscardする。Stable symlinkはcandidate `realpath`より前に拒否する | 必須passing evidence |
| Node.jsが必要identity metadataまたはcanonicalizationをerrored、ambiguous、unusableとして報告 | `safe-fs-boundary-unverifiable`を返しcandidateを拒否する。Root/shared-ancestor failureではsourceを拒否 | 必須passing evidence |
| Same-device bind mountや報告されないreparse behaviorなど、optionalなOS semanticをNode.jsから観測不能 | Platform、Node.js version、fixtureを含む明示的な`platform-unobservable` test recordをemitし、absoluteなcontainmentを主張しない | Security proofとして決して数えない |

Static-package testはpacked `package.json`、closedなstatic-manifest schema、exact record order、MIME/
declared-length/digest validation、symlink/unexpected-file rejection、全client route上のNuxt root-absolute asset
referenceを製品定義のsize/record-count上限なしで扱う。
正確なrecord済みinline scriptがCSP下でbootし、1 byte change、unrecorded script、executable attribute、nonce、
`<base>`、relative/external executable URL、blob/external workerはbind前にfail closedまたはCSPでblockする。
固定generated `200.html`/`404.html`だけを除去し、他のHTMLを受理せず、どちらのaliasもpack/serveしないことも
assertする。
Server/package caseはrequired CLI/Worker entry、ordered `.mjs` record、全tsdown chunk、clean staging/output setup、各output subtreeへ
1つ注入したstale file/non-regular pathを拒否するrecursive exact-set comparisonを検証する。別bootstrap
faultでstatic/server各manifest fieldと各listed-asset propertyを壊し、package version、両complete manifest、全listed assetの
検証成功まで`bin.mjs`が`dist/cli.mjs`をdynamic import/evaluateせずbindもしないことをinstrumentationで証明する。
Build、packed tarball、runtime caseはrecoverableなNode.js、filesystem、hashing failureを注入し、bufferingと
handle capacityを実行環境に委ねる。これらpackage所有checkはいずれもcustomization validity/lint resultを報告しない。

Diagnostic-behavior testはcode/source/file/argument deduplicationと固定phase/source/path/rule/code/occurrence順を扱う。
Recoverableなdiagnostic serialization/retention failureは`fatal-resource`をpropagateしてpublication attempt全体をabortし、item、
Source、recognition、derived result、scan-result record/response、diagnostic result、generationを一切公開せず、prior committed
snapshotだけを維持し、customizationを分類しない。
Multi-Source caseではA/Bのentry-diagnostic pairが共存し、B successがAを保持し、A successだけがAのpairをclearし、
A再failureがAのpairだけを置換し、Global disableがGlobal pairだけを除去することを証明する。Client起因API errorを反復してもretained
diagnostic countを増やさない。
同じfixtureでclosedな`file | source | session` scope unionも検証する。File scopeは`sourceId`、`fileId`、
`sourceRelativePath`を必須とし、source scopeは`sourceId`を必須にして`fileId`/`sourceRelativePath`を禁止し、session scopeは
3 fieldすべてを禁止する。Source/session scopeのdiagnosticが表示、deduplication、orderingのためにpathを捏造してはならない。

## Manual accessibility review

[SC-008 accessibility受入contract](contracts/accessibility-acceptance.ja.md)を規範とする。Automated E2E合格後、packed
release candidateに対してcriterion固有の全`AUTO-*` checkを合格させてから全`MANUAL-*` checkを実行し、完全なdiff、
packed-file manifest、render済みpacked interfaceに対して全`REVIEW-*` rationaleを再確認する。Axeのseverity resultだけでは
SC-008を立証できない。Contractはsamplingしない完全なexecution matrixを固定する。

1. Keyboardだけでlaunch/URL follow、filter、機密content警告のacknowledge、file open/close、2 file select/compare、
   Global consent open、Global enable/disable、rescan、inventory returnを行う。
2. Visible focus、logical focus order、skip/navigation landmark、unique label、status announcement、
   error/next-step association、generation replacement時にfocusを失わないことを確認する。
3. 両locale、3つのpin済みOS/engine/AT profile、5つの正確なviewport/orientation/zoom/text-spacing profile、
   3つのUI mode、8つのworkflow/state scenario、3つのinput profileの全contract cellを実行する。Native
   forced-colorsに関する2つの明示的N/A platform cellと、row固有の各cell N/Aを個別に記録する。
4. Tool、state、severity、selection、diffを色だけで示していないことを確認する。
5. `validation.md`と`validation.ja.md`へ、Level A/AA全55行の確定state、完全な必須check ID、IDごとのevidence/result、
   reviewer、各Not-applicable revalidation note、および全manual matrix cellのkey付きresultを記録する。0件ではないApplicable
   row数をdenominatorとして記録し、Applicable rowのfailureが0件であること、4つのkeyboard workflow outcomeも記録する。
   Applicableな1行のfailure、根拠のないrationale、check ID/cellの欠落、未完了keyboard workflow、未検査matrix cellの
   いずれかがあれば、severityにかかわらずSC-008は失敗する。

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
Gunshiのbindしないhelp/version、strict unknown-option拒否、明示的なpositional/rest拒否、固定されnonzero
validation failure、await済みcompletion、root-only import boundaryも扱う。上記exact minimal OS別environment
allowlistをassertし、allowlist済みkeyだけをlaunch environmentからambient provenanceとして直接copyすることを証明する。
Source/preview/candidate/file pathまたはauthored valueをinspection stateからcopyせず、そのtextがambient valueとlexicalに
一致してもprovenanceを変えず、authorityを与えず、commandを選択・変更しないことも証明する。`BROWSER`、
`NODE_OPTIONS`、`NODE_PATH`、allowlist外の全environment key、extra argvは除外する。Windowsとその他unsupported-platform fixtureは
child processが0件で固定manual-URL warningが出ることをassertする。TestはOS helperがdefault handlerへ委譲するだけでversionを
certifyできないことも証明する。Release recordはpin済みPlaywright revisionを使用し、`--no-open`と表示URLをmanual certified-browser
fallbackとする。`pnpm run test:docs`はplanning setを公開せず、repository内の全英日document
pairを別に検証する。同じtarballを[research.ja.md](research.ja.md)で定義した正確な6つのlower-bound OS/architecture
certification jobでinstall/launchし、Node.js filesystem security suiteに合格させる。Node.js 24.18.0はdevelopment/build
baselineである。これら有限sampleは、宣言済みNode.js 24/26 compatibility range内の全patch releaseをCIで網羅的に
実行したとは主張せず、そのruntime contractも狭めない。最後にcomplete diffをreviewし、untested branch、secret exposure、古いofficial-path assumption、
accidental source mutation、unrelated changeがないことを確認してからreleaseする。

`pnpm run test:package`は新規pack済みtarballをisolated fixtureへinstallし、
`npx --no-install agent-customization-inspector --no-open`をspawnし、valid loopback launch URLを観測してprocessを
終了し、起動したCLIがbrowser-helper childをspawnしなかったことをassertしなければならない。Tarball/mapping
inspectionだけではlaunch testにならない。
