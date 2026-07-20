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
`/speckit.plan`と`/speckit.tasks`を再実行する。2つ目のlocal dependency baselineで作業を継続しない。
Package/configuration作業前に、initial baselineについて記録済みのno-migration-impact判断、すなわち以前の公開済み
Inspector package、public contract、永続profile、user dataがないことを確認する。この前提が誤りなら停止して
replanningする。Acceptするdependency追加・変更または破壊的なpublic-contract変更はすべて、理由、影響を受ける
consumer/contract/data/workflow、移行・compatibility/support手順、rollback/support path、または理由付きの明示的な
no-impact判断を英日両方へ記録する。
Researchの`**Migration impact**`/`**移行影響**` sectionとplanの対応する
`**Dependency and breaking-change migration gate**`/`**Dependencyおよび破壊的変更の移行gate**` sectionを
T001の正確なdesign-evidence記録先とし、欠落、stale、
不一致のいずれかがある間はT002を開始しない。Release validationはpublication前に対応する英日evidenceを記録する。

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

別directoryから明示rootを指定する同等のlaunchは次のとおり。

```bash
cd /path/to/agent-customization-inspector
node bin.mjs --no-open --cwd tests/fixtures/repositories/all-supported
```

CLIは呼び出し時の`process.cwd()`を1回だけcaptureする。省略時はそのexact stringを使う。`--cwd`は最大1回だけ
受理する。WindowsではUNC/server-share/device、current-drive/root-relative、`C:`/`C:foo` drive-relative formを
`resolve`前にrejectし、absolute drive optionを保持してplain relative optionだけをanchored captureに対してresolveする。
POSIXはabsolute optionを保持するかrelative optionをcaptureに対してresolveする。全selected absolute resultはshared pure
`LexicalAbsoluteRootParts` parserに合格しなければならない。Missing、empty、duplicate、pre-resolution-invalid、
parser-rejected valueは、filesystem/network I/O 0件でsessionまたはbrowser attemptより前に固定されたactionable outputを
出して終了し、selectionは`process.chdir()`もper-drive working-directory semanticsも使わない。

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
任意の単一`--cwd`を除き、初期リリースにはrepository picker/ancestor-root discovery、remote-host flag、
static-export command、MCP commandはない。

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
  source formを列挙済みでなければならない。このgateは承認済みrowとbilingual digestを検証するだけで、rowを作成したり
  semanticに編集したりしてはならない。Membership/source-form/extractor/relationshipに変更が必要なら作業を停止し、
  design artifactを同期してplan/task generationを再実行する。
- Integration/security testは記録済みlocal fixture rootを使い、productの全network/URL/MCP surfaceをinstrumentする。発行済みのexactな
  `127.0.0.1` authorityにおける2つのexactなFR-022 authorized internal loopback class、すなわちclosedなunauthenticated static/SPA
  `GET`/`HEAD`とcapability-authenticated declared API requestを別々に分類・検証する。Source containmentとcustomization由来のexecution、child process、MCP
  connection、FR-022で定義した禁止対象のdirect product-issued outbound request、dynamic evaluation、source mutationが0であることを証明する。Explicit
  UNC/server-share/device vectorではfilesystem/DNS/SMB call 0件を証明する。Lexicalに識別不能なpre-mounted/mapped network sourceはOS-mediated
  trafficを発生させ得るためFR-022のplatform/environment limitationとして別に記録する。別test対象のstartup
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
   emptyと確定した場合だけ次へ進む。Deterministicにunsafeまたはbinaryなpresent candidateではfallbackせず終了し、
   non-empty fileを最大1件だけpublishする。Emptyはpost-BOMの`decodedText.trim().length === 0`と正確に定義し、
   `utf-8-replaced`はordinary textで、全`U+FFFD`をnon-whitespaceとして扱う。Absent、empty、BOM-only、
   whitespace-only、non-empty、replacement-decoded、binary、non-regular fixtureを両ordered targetへ独立に適用する。
   Declared targetの`lstat`からのexact `ENOENT`だけをabsenceとしてcatchし、prior observation後なら
   `entry-disappeared`とする。その他のthrow/rejectionはfallbackせずpropagateする。
   これらのfixtureでcontent rule、short-circuit、および非選択targetへのoperation 0件を固定する。
3. Static ruleはtyped literal/one-segment/recursive-directory programとtraversal boundaryだけを許可し、runtimeで
   text globを評価しない。Staticとderivedの両ruleが
   受理したfileは1回だけ読み、両provenanceを保持する。各provenanceは自身のmatched path、
   behavior/strategy/source evidence、scope/order、applicabilityを持つ。Public provenance DTOはSource-relative pathとstable
   comparison keyを持つclosed `ScopeDescriptor`/`OrderDescriptor` unionを使い、unknown orderはlossyなrecognition-level
   aggregateにせずnullとcondition factで表す。
4. Surface fixtureはGitHub Copilot VS Code、CLI、cloud lookup behaviorを分離する。VS Codeのworkspace-root
   instructionがexactである一方、CLIのstandard-location/target-path traversalはInspector globではなくvendor
   behaviorとして表現されることを証明する。Root-only/nested near missが差を示す。MCPではさらに、`.vscode/mcp.json`
   と並ぶexactなVS Code 1.118以降root `.mcp.json` provenance、CLI ruleもroot fileへmatchするときの1 physical readと
   1 Copilot/MCP recognition、release note/current guideへのreciprocal evidence、`documentationStatus: conflict`、
   VS Code所有root-schema field 0件、root、`.vscode`、User、agent、plugin input間のunknown same-name orderingを
   要求する。Nested `.mcp.json`はCLI-onlyのままとし、VS Code schemaまたはwinnerを推測しない。
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
7. Applicabilityはevidence assessment、product surface、root/runtime `cwd`、target match、trust/approval、
   enablement、selection、agent context、tool availability、installation、managed policy、external runtimeを
   別factとして保持する。直接参照するbehavior、rule、strategyはそれぞれrecord-keyedな`EvidenceAssessment`を1件
   提供する。`documentationStatus`は`documented`、`partially-documented`、`unknown`、`conflict`だけを受理し、
   重複のない`lifecycleQualifiers`は固定順`preview`、`experimental`、`deprecated`を使う。Empty qualifierは
   lifecycle claimを行わず、`stable`を意味しない。Fixtureはこのenum内の`documentation-conflict`、重複または
   順序違反のqualifier、subjectの欠落/重複、provenanceまたはrelationshipのsort済みsubject単位
   `EvidenceAssessment[]`をlossyな単一scalar/unionへ置換する実装をrejectする。Codex instruction byte
   budgetも別factとし、runtime chainとeffective capが判明した場合だけ`omitted`を
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

1. OptionなしではRepository Sourceがcapture済みchild-process `process.cwd()`のexact valueと等しい。Relative/absolute
   `--cwd`ではlexicalに選択したrootと等しく、process working directoryは変化せず、picker/ancestor searchもない。
2. Source、tool、kind、Source-relative Path filterをkeyboard/pointerで操作できる。全inventory-file pathまたは安全に
   normalize済みのtarget pathはowning Sourceの1 rootからの相対値であり、Sourceをまたぐpath namespaceを意味しない。
   Escape済みのenabled-Source root labelとconsent-preview root labelはpresentation-onlyのままで、Source-relative Pathではなく、
   read authorityを与えない。
3. 1 physical `AGENTS.md`、`CLAUDE.md`、skill、`.mcp.json`、marketplaceをcontent重複のない1 fileとして保ち、
   `(fileId, tool, kind)`ごとに正確に1 recognitionを持つ。Compatible admissionはそのrecordのprovenanceとしてmergeする。
   各recognitionが公開するのは`not-attempted | parsed | failed`だけで、file-level `parseSummary`が公開するのはcompleteな
   recognition setから導出した`not-applicable | all-parsed | mixed | all-failed`だけとし、`not-attempted`は中立に扱う。全件
   `not-attempted`なら`not-applicable`、`parsed`が1件以上かつ`failed`が0件なら`all-parsed`、`failed`が1件以上かつ
   `parsed`が0件なら`all-failed`、`parsed`と`failed`が共存するなら`mixed`とする。Recognition orderはclosed tool order、
   次にclosed kind orderとし、opaque IDをtie-breakにしない。
4. Near-miss pathがなく、empty repositoryに成功したsupport scope説明を表示する。
5. 最初のsnapshotはlegalなbootstrap generation 0を持ち、stable IDのidleなRepository Sourceを正確に1つ、
   non-authorizingなescaped selected-root labelを持ち、調査対象Source I/O、file、Diagnosticは0件とする。中央admissionは
   別に保持したraw selected rootを使う。自動scan成功時はgeneration 1をcommitする。Deterministic fatal resultは
   generation 0を維持する一方、注入したstartup read rejectionはprocess top levelへ到達し、process/session survivalを保証しない。
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
2. 任意の`FileDetail` requestまたはcomparison構築前に、記述された完全なcontentには機密値が含まれ得ることをUIが
   示す。Acknowledgementは完全なsource text、declared authored metadata、authored relationship target、comparisonの両sideを
   gateする。警告後は、
   maintained fixtureの全literal credentialと表示metadata値をsource/comparison viewへ記述されたまま表示し、
   mask/reveal controlを設けない。JSONC escaped string、YAML quoted/block scalar、TOML quoted string/datetime、
   collection punctuation、受理したduplicate fieldは、API transport後もexact source slice、source order、occurrenceを
   保持する。Structural metadata comparisonは`(tool, kind, fieldId, occurrence)`で対応付け、typed semantic valueが同値でも
   lexical differenceを表示する。Boundary-sizeのTOML integer、float、date/time valueはJavaScript precision lossなく
   typed canonical semantic payloadを保ち、authored spellingも変更しない。Acknowledgementはpresentation gateとして
   browser memoryだけに存在し、hostへ送信も永続化もしない。Acknowledgement API/fieldは存在せず、bearer capabilityが
   host側の完全なauthorization boundaryである。Document reloadと中央full-session client-data purgeでresetし、scope限定の
   route、selection、file/Source、Global、generation cleanupでは読み込み済みdocumentについて維持してよい。
3. Sentinel process valueを設定しても環境変数参照をリテラルtextのまま保ち、参照先process environment値を
   表示contentへ混入させない。
4. Authenticated Diagnosticは文書化済みのclosed fieldだけを含む。Captureしたoperational eventはclosedな
   fixed-code/opaque-ID schemaだけを受理し、Source-relative/absolute/canonical path、root、filename、customization
   content/metadata、authored value、capability、body、raw error、exception string、Diagnostic argumentを含めない。
   Operation Errorは、固定code/message/next step、opaque operation ID、pre-acceptanceではnull、accepted jobでは一致する
   non-nullの`scanRequestId`を持つ別のexact objectである。Diagnostic location/argumentもraw runtime error fieldも含めない。
5. Malformed、stale、binary、cycle、traversal、boundary-crossingのdeterministic fixtureはactionable safe Diagnosticを作る。
   FR-028対象のdeterministic non-throwing outcomeだけが、完全なtraversal後のcontracted-partialで非影響fileを維持してよい。
   注入したread/parser/Worker/assembly/serialization rejectionはdomain catch、classification、retry、recovery、Diagnostic作成を
   bypassする。REST ownerはacceptance前後にgeneric Operation Errorだけを公開し、startup workはprocess top levelへ到達する。
   Attemptはresult/generationをpublishせず、prior snapshotがあれば維持する。File sizeとcollection件数からvalid/invalid、
   correctness、compliance、lintのverdictを一切作らない。
6. Read後の全check後、NUL byteが1つでもあればbinary diagnostic-only itemとし、他の条件でpublish可能なattemptは
   contracted-partial generationにする。NUL byteがなければUTF-8 replacement semanticsで正確に1回decodeし、先頭BOM 1つを記録して
   除去し、replacement resultを`utf-8-replaced`とlabelし、全`U+FFFD`をparser、source、comparisonまで保持する。その
   garbled readable textはそれ自体でcompleteであり、alternate decoderは実行しない。FR-028対象のdeterministicな
   parser/extraction outcomeは対象recognitionのextraction result全体だけを破棄し、完全なauthored sourceとcomparison
   eligibilityを保持してderived read authorityを残さない。Parser/Workerのthrow/rejectionには上記propagation ruleを適用する。全half-open
   `SourceTextRange`はECMAScript UTF-16 code unitで測り、`sourceText.slice(start, end)`で正確にround-tripしなければ
   ならない。Astral character、unpaired surrogate、combining sequence、通常BMP textにより、UTF-8 byte countをoffsetへ
   再利用しないことを検証する。同じlogical origin occurrenceのmetadata/relationship/derivation outputはexactly identicalな
   span 1つをreuseできる。Distinct origin occurrence間のidentical/partial/nested/crossing overlap、missing/ambiguous/
   non-round-tripping spanは、そのrecognitionをall-or-nothingでfailureにする。Authored relationshipはexact target token
   sliceを使い、`normalizedTarget`とderivationには別のtyped semantic valueだけを使ってnormalized valueをauthored表示へ
   置換しない。Conditional Codex default `hooks/hooks.json` relationは`targetOrigin: documented-default`かつnull
   `authoredTarget`とし、explicit hook fieldは`authored`としてdefaultを置換する。
7. Evidence assessmentとapplicability factを分離する。Provenanceとedgeはsort済みrecord単位の
   `EvidenceAssessment[]`を保持する。Documentation completenessは`documented`、`partially-documented`、
   `unknown`、`conflict`だけを使い、upstream lifecycleは別のordered qualifier array
   `preview`、`experimental`、`deprecated`を使う。Empty qualifier arrayは`stable`でなくlifecycle claimなしと
   表示する。Runtimeの`ConditionFact.status: documentation-conflict`、conditionality、disablement、omission、
   shadowing、unknown inputはassessmentを変更せず、発明した“effective”結果にもならない。
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

1. Repository comparison checkpointでは、同じRepository Sourceからactive-generationのreadable fileを正確に2つ選べ、
   binaryその他のdiagnostic-only itemは選べない。Cross-Source comparisonは次のworkflowでGlobal enable後にだけ検証する。
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
   authored-content DTO/DOM stateまたはacknowledgementが残留・自動復活しないことを証明する。Successful liveness bodyは正確に
   `{ sessionId, globalContentEpoch, globalDisableInProgress }`とする。Lease renewまたはrender前にgreater epochまたは
   non-null disable projectionをfull client-data purge triggerとして扱いcontrol-only recoveryへ入る。Older epochはrejectし、
   equal epochかつnull projectionだけをordinary renewalとする。Deterministic delivery pauseはlinearize済み
   SessionSnapshot/FileDetailを保持したままscanまたはGlobal-disable acceptanceでgenerationまたはepochを変更し、envelopeと
   payloadが混在せず、全inspection-data successが最終publish時にepoch不変かつfence nullを再checkすることを証明する。Liveness successは代わりに
   1つのcurrent coordinator-lock snapshotからexactな`{ sessionId, globalContentEpoch, globalDisableInProgress }`値へbindし、
   current fenceがnon-nullでも返すことを証明する。SPAのmonotonic
   `clientDataEpoch`、`currentGeneration`、latest request tokenを検証し、old-generationまたはsuperseded token/epochの
   responseがstateを再作成できないことを証明する。Newer snapshotをadoptする場合は先にclient epochを進め、old requestと
   generation-owned stateをabort/disposeする。File detailはcapture済み
   `(clientDataEpoch, currentGeneration, fileId)`がlive 3値と全て一致する場合だけadoptする。
10. Global-disable activationまたはlivenessで観測したepoch/fenceを含む任意のcentral purge後、recoveryはretained memory
    capabilityだけでfresh sessionを認証する。Purge済みIDを保持・比較せず返された`sessionId`を採用し、client-side
    `RecoveryViewState`だけを構築する。Disable fenceがnon-nullならsession routeはexactでcontrol-onlyな
    `GlobalFenceRecoverySnapshot`を返す。Fenceがnullならnormal full `InspectionSession`を返すが、recoveryは`globalContentEpoch`、Global controlと
    enable/disable projection、それらが参照するpathless session Diagnosticとgeneric Operation Error、任意のnewly verified
    frozen previewだけを採用し、inspection graphを破棄する。Inventory、Source、file、generation、detail、comparison、editor、authored source、selection、
    filter、acknowledgementは復元しない。状態に応じてdisable/join/wait、retry-disable、またはeligibleなGlobal retryを利用できる。
    明示Resume inspection actionは`globalDisableInProgress`がnullの場合だけ表示し、matching sessionを再取得してdefault
    filterのfresh inventory summaryをatomicに構築する。後のdetail/comparison requestにはnew acknowledgementを要求する。

### 4. Global inspectionへのopt-in

```bash
pnpm exec playwright test tests/e2e/global-consent.spec.ts
```

Test harnessはisolated fake tool homeを渡し、developerのreal homeを絶対にinspectしない。確認項目:

1. Consent前にGlobal pathへ一切touchせず、previewを`stat`、`realpath`、enumeration、file readなしでlexicalに
   派生する。Instrumented captureは`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`をこの順で1回ずつreadし、
   `undefined`だけをabsentとし、いずれかがabsentの場合だけ`node:os.homedir()`を正確に1回callし、active-platform
   `node:path.join`が対応する固定suffixだけを適用することを証明する。`HOME`/`USERPROFILE`の直接選択もexistence checkも行わない。
2. Consent viewが正確なCopilot/Claude/Codex lexical root、relative path pattern、input state、除外、
   contract version `2026-07-20`を表示する。Frozen internal previewは各exact raw `lexicalRoot` stringを別に保持する。
   `displayRoot`はone-way escaped stringで、decodeしてread authorityにしない。
   Preview constructionのthrow/rejectionは`scanRequestId`もauthorityも持たないgeneric pre-acceptance Operation Errorだけを返す。
3. Opt-in後は文書化instruction candidateだけが0から3つの別識別tool-specific Global Sourceに表示される。
   Copilot、Claude、Codexごとに最大1つで、各Sourceは正確に1つのrootを持つ。Initial/retry transactionでadmitされた
   全Sourceは、観測可能なper-tool commitなしに1つのatomic generationへ一緒に現れる。ReadableなRepository file 1つとGlobal file
   1つを比較し、rootを統合せずsemanticな判定を行わず、それぞれが独立して識別されたowning SourceとSource-relative Pathの
   下に残ることを検証する。
4. Present-empty、relative、invalidのenv overrideは固定preview state/messageを使い、retained Diagnosticを
   作らずdefaultへ黙ってfallbackしない。設定がabsentの場合だけdefaultを使う。Declared rootの`lstat`からのexact
   `ENOENT`だけをcatchするabsenceとし、正常に検出したlink/type/boundary mismatchはdeterministic rejectionとする。
   Shared `LexicalAbsoluteRootParts` parserにacceptされたabsolute rootは通常のhome外でもeligibleであり、その場所だけを理由にrejectしたりconsent前I/O authorityを
   与えたりしない。All-invalid preview、またはconsent後に3 rootすべてがabsentと判明するeligible previewも
   all-tools confirmationを1回受けてよく、deterministicallyに
   `active-no-job`になる。
5. その他の注入したadmission throw/rejectionはdomain classificationなしにpropagateする。Initial enableはgeneric
   pre-acceptance Operation Errorを返し、consent/control/jobをactivateしない。Retryでは既存stateを維持する。
   Rootまたはescaped displayの数値上限は定義しない。
6. Stale/changed/cross-session replayed preview ID/digestを拒否する。Digestは各entryについて、stored raw `lexicalRoot`と
   escaped `displayRoot`を、2つの別々のtype tag付きlength-prefixed stringとしてbindする。Typed
   `TraversalPlan` version、closed selection policy、canonical programもbindする。Display fieldをraw fieldの代用にしない。Enableはfrozen raw
   valueとstored planだけを使い、environmentを再読込せず、`displayRoot`をreverse-convertせず、表示`pathPatterns`を
   authorityにしない。Digestが別fieldを保持し、admissionが
   stored raw valueを使うことをescape-collision、control-character、backslash fixtureで証明する。
   Previewで2 entryがeligible、1 entryがinvalidの場合もrequest側tool selectorは持たない。Initial enableは固定の
   `confirmedTools: [copilot, claude, codex]`を導出して3つすべてをevaluateする。Responseのdisjointな
   `acceptedTools`/`rejectedTools`のunionは3つすべてと一致する。`tools` keyなどselector-shaped inputはrejectする。
   RetryはSourceがまだないfixed-set toolをすべて導出し、clientはsubset化も並べ替えもできない。同じexact
   active consentの再利用は、少なくとも1 toolにSourceがまだない場合だけ許可し、既存Sourceはsemantic contentだけを
   変更せず、別preview/rootには先にdisableを要求する。Initial/retryで成功したadmitted-subset batch commitは
   generationを正確に1回だけ進め、carryした
   Repositoryおよび他Sourceのgraphと全generation所有IDをrekeyし、旧file/detail/comparison/selection/editor stateをinvalidateする。
   Symlink、junction、case、normalization、short-name aliasによりcanonical rootがpreviewに示した
   stored raw lexical absolute rootと異なる場合はenumeration前に拒否し、暗黙に置換しない。
   Coordinatorはcorrectness-sensitiveなadmissionとscan workをserializeし、製品定義のslotまたはqueue-capacity上限を持たない。
   Non-`ENOENT` admission rejectionはstate mutation前にpropagateする。All-rejected、contracted-partial、accepted-batch error、cancellation、
   repeated-retry fixtureでterminal `GlobalEnableOperation` recordをunregisterすることを証明する。最後のlock済み
   disposition pointでoperationが先なら、disable受理後にdeliveryしても`202`をcommit済みとし、barrierが先なら`409`、
   late side effect/operation-history leakなしとし、
   次のenableを許可する。Validation中、admission後かつmutation前、単一batch enqueue/disposition直前でpauseして両順序を扱う。
7. Disableは全inspection dataに対するpriority security barrierである。Request送信前にSPAはliveness failureと同じfull
   client-data purgeを実行する。Non-no-op barrierのfirst acceptanceは`globalContentEpoch`をatomicにincrementし、non-null
   `globalDisableInProgress`をinstallし、publication authorityをrevokeする。Session routeは
   `GlobalFenceRecoverySnapshot`だけを返し、その他すべてのinspection-data routeは`409 global-disable-pending`を返す。
   その後active uncommitted workをdiscardし、queued Global workをcancelし、影響するprocess-wide closable-resource recordを
   すべてdrainする。PublicなGlobal consent、control、Source stateのいずれかが存在する場合、`remove-active-state`は全
   Global Sourceをremoveしてcarried Repository stateだけのN+1を正確にcommitし、中断したRepository commandを1回requeueして
   最大N+2をcommitする。Global file、exact-content DTO、generation diagnostic、`GlobalToolControl`所有lifecycle failure、
   comparison、removed Global Sourceのstale-failure entry/failure-reference pair、consent、全control、全retained root context、
   frozen previewを削除する。Repository contentとRepository stale-failure pairはcarryするがgeneration所有IDはrekeyする。
   未公開のoperation-local initial enableだけが`cleanup-only`を選べ、そのsuccessはfenceをremoveしつつNと全generation所有IDを
   維持する。
   Validation/admissionをpauseするfixtureでdisableを受理し、command/content両epochをincrementしてenable operationをdrain/unregisterした後に
   late completionを解放する。そのcompletionは最後のcancellation sweep後にcontrol mutation、diagnostic、context、ID、scan
   jobを一切作らない。Accept後のdrain、close確認、assembly、serialization failureではprocessをaliveに保ち、fenceを閉じ、
   generic disable Operation Errorをretainし、contentを復元せずretry/joinを利用可能にする。Closeを無期限に確認できない場合は
   process restartを必要とする。Accept前failureまたはtrue no-opではfenceをnullのままにし、既にpurge済みのclientがfreshな
   authenticated full snapshotを直ちに取得できるようにする。
8. 明示Global rescanはenabled時だけ受理し、Repository rescanと同じFIFO/dequeue時generation ruleに従い、commitで
   全source graphをrekeyする。そのadmission response、Source/progress、successful generationは同じopaqueな
   `scanRequestId`を保持する。Unknown/removed Sourceは`404 stale-resource`、disable pending/activeは
   `409 global-disable-pending`、duplicateは`409 scan-in-progress`を返す。Fatal attemptは
   uncommitted partial resultを0件publishし、exact consent/boundaryとtool別prior graphを保ち、そのSourceだけの
   stale-failure entryを作成または置換し、deterministic returned failureではDiagnosticをreferenceし、throw/rejectionでは
   Operation Errorだけを返してfailed/null progressを報告し、明示rescan/disableを
   可能にする。別Sourceの正常commitは両方をclearせず、affected Sourceのcomplete/contracted-partial正常rescanだけが両方をclearする。
9. Throw/rejectされたaccepted initial/retry batchはprovisional Source/file/generationをpublishせず、
   `StaleSourceFailure`を追加せず、prior snapshotを維持し、batchの`scanRequestId`に対するterminal Operation Errorだけを
   `globalControl.lastOperationErrorId`から正確に1回参照して公開する。Deterministicにrejectされたtoolはexact-consent
   retry/disable用のclosed control stateを保持してよい。Mixed deterministic outcomeではactive-consent retryのtoolを
   validation/admissionからsubset scanまで`pendingTools`へ残す。Initial enableはatomic activationまでprojectionを持たず、
   その後はaccept済みbatchのtoolだけを表示する。Active controlの`unvalidated` toolをretryableにしない。
   Rejected/non-pending admitted toolをretryableとして表示してよいが、全pending work完了まではretryをdisabledとして
   `409 global-enable-in-progress`を返す。その後はmissing toolをすべて導出し、成功済みSourceを保持する。Disableは直ちに利用できる。
10. Initial activationで3 toolすべてがlexicalまたはconsent後root validationでdeterministicallyにrejectされた場合、enableはempty
    `acceptedTools`、3つすべての`rejectedTools`、Source/job/generation/stale entryなしの`202 active-no-job`を返す。
    `globalControl`はそれらtoolをretryableとしてactiveのまま、preview routeは同じfrozen previewを返し、disableも利用できる。
    All-rejected retryはnew Source/jobを作らずgenerationをcommitせず、既存SourceとそのIDを正確に保持する。
    Partial acceptanceは`queued`を返してevaluateした全toolをpartitionし、subsetをatomicにpublishする。
    Deterministic fatal初回scan後のretryでは、retained rootが変更済みまたは検証不能ならcontextをclose/unregisterして未公開IDを破棄し、
    後の完全な再admission前にrejected controlへauthorityを残さない。
11. Barrierがdraining/committing中の2回目のdisableは同じoperationへjoinしgenerationを追加しない。Retained failure後のdisableは
   同じcleanup lineage、commit kind、base generation、resource record、既にincrement済みcontent epochで再開する。Tool固有
   Global Source/graph、active consent record、retained admitted Global root context、対象`opening`/`open`/`closing`/
   `close-unknown` registry record、running/queued Global scan/enable command、retained disable failure、registry poisonが一切
   ない場合だけ、無関係なRepository workがactiveでもtrue no-opとなる。Barrier中にactive consent/controlが存在する場合は
   `globalControl.state: disabling`かつpending/retry arrayをemptyとする。Operation-local initial enableだけならnullのままとする。
   どちらでもenableは`409 global-disable-pending`を返し、barrierがnon-terminalの間visible controlはGlobal retryを提示しない。

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
- SC-004のproduct network/URL/MCP instrumentation、exact-authorityのInspector-server request ledger、study-browser request
  captureを、SC-001前のInspector launchから4つのworkflow観察完了まで継続して実行する。Process identity、発行済みのexact
  authority、request initiator/target、server ledgerを相関し、Inspector/bundled-SPAの全requestをexactな2つのauthorized internal
  loopback classのいずれか、または禁止対象へ分類する。帰属できるが分類できないtrafficは両class外とする。無関係な
  extension/host-process trafficはproductへ帰属させず記録し、観測できるOS-mediated mounted/mapped-source trafficはFR-022
  limitationとして別に記録する。
- Primary workflow全体でcritical usability issueを0件とする。禁止された支援なしでworkflow完了を妨げる問題、または
  意図しない実行、調査対象sourceの変更、FR-022で定義した禁止対象のdirect product-issued outbound requestまたはMCP connection、
  exactな2つのauthorized internal loopback class外のrequest、別machineへの調査content露出をcriticalとする。この2つのclosed classは
  outboundでもMCPでもなく、このeventには含めない。
  記録済みpre-mounted/mapped sourceのOS-mediated trafficはFR-022 limitationであり、このautomatic connection eventにはしない。
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
同じ9 run以上からなる1つの共通subsetが、両scan thresholdと両interaction 100ミリ秒未満という4 thresholdすべてを
満たさなければならない。各runとaggregate結果を
profile ID、fixture digest、scan request ID、committed generation、実際のenvironment valueとともに記録し、個人識別子と
絶対user pathだけを省略する。Profile fieldを
変更すると新しい直接比較不能なmeasurement setを開始し、結果はportable performance guaranteeではなくprofile固有とする。

### SC-003/004/005/007/009 release-evidence fixture

Release candidateの測定前に`tests/fixtures/outcomes/manifest.json`とcanonicalな
`tests/fixtures/outcomes/manifest.sha256`をfreezeする。Manifest schema/version、一意でstableなcase ID、criterionと
required-classのmembership、fixtureまたは決定的builderへのreference、客観的expected outcome、参照する全fixture digest、
required classごとにdeclaredした非ゼロminimumをvalidateする。Manifest記載caseをすべて実行し、manifest version、canonical
digest、正確なcase ID、class count、resultを`validation.md`と`validation.ja.md`へ記録する。Missing、duplicate、undeclared、
unexecuted、digest-mismatched case、required classの空集合、fixture欠落、declared minimum未満のdenominatorは、影響する全criterionを
failureにする。Caseのremove/reclassify、required-class定義の変更、expected outcomeの変更ではmanifest versionのincrementと明示的なreviewを必須とする。参照fixture byteだけを変更する場合は、影響する全fixture digestとcanonical manifest digestを更新する。どちらの変更も新しい直接比較不能なmeasurement setを開始し、digestの変更だけでdenominator semanticsの変更を認可せず、release denominatorを黙って弱めない。Automated contractはtable-drivenなprevious/current manifest revision pairでtransition ruleをtestし、human reviewを調査も立証もしない。実際のrelease diffについては、初回作成またはprior/current version、変更したcase ID、required-class定義またはexpected outcome、明示的なreviewer decisionまたはreview referenceを`validation.md`と`validation.ja.md`へ記録する。

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

Boundary fixtureは調査対象Sourceのread、parser/Worker、coordination、assembly、serialization boundaryからthrow/rejectionを
注入する。Filesystem/parser/recognition/scan domain catch、cause classification、retry、recovered item、Diagnosticがないこと、
owning REST boundaryだけがgenericなpre-acceptanceまたはaccepted-job Operation Errorを返し、startup所有workはprocess top levelへ
到達することを証明する。Attempt result/generationはcommitせず、prior snapshotがあれば維持し、API responseとauthored sourceを
truncateしない。Error pathはcustomizationのvalidity、correctness、compliance、lint verdictを作らない。

別fixtureは、完全なtraversal後のFR-028対象でdeterministicなnon-throwing outcomeだけが`committable-partial`へ到達し、
完全な非影響entryを持つ1つのatomic contracted-partial generationを公開できることを証明する。

Coordinator testはslot、queue capacity、scheduling deadlineを定義せず、deterministic serialization、generation
atomicity、cancellation、disable/shutdown/supersession時のauthority revoke、late-result discardを保つ。Liveness
protocolとSC-002のtime thresholdはcapacity上限ではなくacceptance criterionである。Testは、processを終了させる
out-of-memoryからのrecoveryや、uncancellableなNode.js/kernel I/Oの
physical cancellationは保証しない。

Traversal-plan call traceはさらに、Repository traversalがcompile済みimmutable planを実行し、Global exact targetがtool-home
rootをopenせず、fixed instruction-subtree walkがそのsubtreeだけをopenし、隣接Global pathへのI/Oが0であることを証明する。
Path-spelling fixtureはexact raw `Dirent.name` segmentとNFC classification/display segmentを分離し、parent enumerationなしの
targeted fixed pathがimmutable registry target spellingだけをI/O operandにすることを証明する。Collisionのない
NFD-only nameはraw segmentでreadしてNFC表示し、1 classification keyになるNFD/NFC sibling spellingは
`safe-fs-path-normalization-collision`をemitし、collision group全体へのdescend/open/read operationを0件とする。
Unambiguousなpublic pathがないためcollision Diagnosticはpathless session-scopedとし、Source attemptはgenerationをpublishしない。
Content-dependentなCodex ordered fallbackを除き、各Source attemptはgroupをreadする前にstatic discovery、admission、collision
rejection、physical groupingを完了する。全path/handleがexact bigintの`dev`、`ino`、`nlink`を返し、`ino !== 0n`、`nlink`が
positiveかつstableでadmitted path count以上の場合だけhard-link identityをusableとする。Fixtureはcollision-free NFC pathのうち
unsigned UTF-8-bytewiseで最小のものをprimaryに選び、残りをaliasとしてsortし、各raw provenanceを保持する。全pathから
filter/detail/selectionを一致させ、file Diagnosticにはprimaryだけを使い、そのSource scan attempt内のgroupを正確に1 physical
readだけ行うことを証明する。異なるSource、attempt、generationは独立してverify/readする。Consume後に発見した別derived aliasは
追加read 0で`safe-fs-late-derived-alias-rejected`を受ける。Consume済みempty Codex overrideとfallbackが同じusable identityを
共有する場合、fallbackはfallback read 0で`safe-fs-ordered-fallback-alias-rejected`を受け、overrideをpublishせずattemptを
contracted-partialとする。

Parser-failure testは全formatを扱い、deterministicなreturned extraction outcomeとWorker/parser throwを区別する。
Throwはparser、extraction、recognition、relationship、derived result、item、Sourceを一切返さずowning boundaryへそのまま
propagateし、REST所有ならgeneric Operation Errorだけを作り、result/generationをcommitしない。後続の成功fileは新たに
admit済みretry内でだけ生じる。All-or-nothing recognition outputも扱う。
Exact-display testはsource/metadataに異なるliteral credentialと環境変数参照を置き、別のsentinel process valueを
設定する。Source/comparison viewが記述されたtextを正確に保持し、sentinel valueを混入させず、masking/reveal controlを
表示せず、Diagnosticにcustomization source valueを複製しないことを証明する。別のoperational-event captureはfixed event
codeとopaque IDだけを受理し、path、root、filename、調査対象/authored value、capability、body、raw error、exception、
Diagnostic argumentを一切emitしないことを証明する。

Node.js filesystem boundary testは、同じplatform-neutral packageに対してsupported macOS、Windows、Linux CI
matrixで実行する。各resultはplatform、Node.js version、`node:fs.constants.O_NOFOLLOW`が存在して有効かを記録する。
Call traceは完全なordered checkpoint catalog rows 1–28を実行する。Root admissionはrow 1、各Global selectorはrow 2の
fixed-prefixまたはrow 3のexact-target checkより前にrow 20をfreshに実行し、observed component/candidateはrows 4–7、各ticketは
pre-open、post-open/pre-read、post-readを通じてrows 8–19を実行する。各candidate phaseでcall traceは次の正確な順序を
示さなければならない。(1) candidate pathを`lstat`し、symbolic link、non-regular type、unexpected
identityを拒否する。(2) これが成功した後だけcandidate `realpath`と`path.relative` canonical containmentを実行する。
(3) candidate pathを2回目に`lstat`し、identity、type、size、関連timestampが最初の`lstat`と一致することを要求する。
Stable symlink fixtureは、最初の`lstat`がcandidate `realpath` callより前に拒否することを証明しなければならない。

Filesystem call recorderはさらに、調査対象sourceへのopenが全てread-only、non-create、non-truncateであり、write、
append、create、truncate、rename、delete、link、chmod/chown、timestamp、extended-attribute、ACL、または同等の
mutation-capable callが一切ないことを証明する。Fixtureのbefore/after measurementはcontent、length、identity/link
state、mode、modification/change time、観測可能なextended attribute/ACLを比較する。OS readだけが原因のaccess-time
movementは別に記録し、no-product-mutation assertionをfailさせずproofにも数えず、product callから要求もしない。

各directory enumerationは`opendir`直前にrows 21–24を実行し、root/ancestor/targetのexact bigint `dev`、`ino`、`mode`、
`mtimeNs`、`ctimeNs`をsnapshotしてreturned `fs.Dir`をregistryへ登録する。Complete sibling setはexplicit `Dir.read()`がnullを
返すまでのcallだけで収集する。Directoryをopenしたままrows 25–28で対応するidentity、type、canonical containment、
modification/change timeを再checkし、その後registryが`close-confirmed`を報告するまでsibling bufferをclassify、descend、read
ticket発行へ使わない。Enumeration中のdetectable create/remove/renameではcomplete bufferをdropしgenerationをpublishしない。
Candidate enumeration時とopen直前にはroot identityと全ancestor `lstat`もsnapshot/recheckする。その後、利用可能な場合は有効な
`O_NOFOLLOW`を必須として`FileHandle`をopenする。Open後かつread前にはordered candidate sequenceを実行し、handleのpre-read
`stat()`を`nlink`を含む全path snapshotと比較する。Sole complete physical read後かつparse/publish/commit前にはroot/ancestor
check、全hard-link ticketのordered sequence、同じopen handleの`stat()`を反復する。Detectable changeがあればbyte buffer全体を
dropし、outside sentinelをpublishしない。

Resource-race fixtureはprocess-wideで唯一の`ClosableResourceRegistry`を実行する。各`open()`/`opendir()`前に`opening`
reservationを作り、fulfillmentは別awaitより前にexact strong resource referenceをattachし、rejectionはempty reservationをremoveする。
Normal、fatal、cancellation、disable、shutdown pathはすべて1つのshared close operationをinvoke/joinする。Fulfillmentまたは観測した
FileHandle `close` eventだけが`close-confirmed`を確立する。そのevent後のpromise rejectionは観測するがsuccessとして扱いregistryを
poisonしない。確認なしのclose throw/rejectionは`close-unknown`となり、所有runtime/REST boundaryへpropagateし、recordをstrongly
retainしてattempt resultをpublishせず、後続inspection filesystem workをrestart-required controlでblockする。Late FileHandle eventは
poisonをclearできるが、確認不能なdirectory closeはprocess restartを必要とする。Concurrent cleanup、disable join/retryはexact
record、promise、observerを共有し、closureを推測せず`close()`を二重にcallしない。

Public Node.js APIにはportableなdirectory-handle-relative openがない。同じlstat/realpath/open/fstat/post-check sequenceを
全platformで必須とする。Check間にsource rootまたはancestorを置換するactive adversarial processは全platformで初期リリースの
threat model外とし、final componentの置換も有効な`O_NOFOLLOW`が利用不能な場合だけscope外とする。通常の同時editと全detectable raceはscope内で
fail closedにする。Pack済みtarballでも同じsuiteを反復し、test専用barrierをproduction exportへ含めない。

| OS observation | 必須outcome | Security proofでの扱い |
|---|---|---|
| Symlink、non-regular candidate、canonical escape、metadata mismatchを含むobservableなstable unsafe stateまたはdetectableなroot/parent/final replacement | 該当するdiagnosticでcandidateまたはaffected sourceを拒否し、全byteをdiscardする。Stable symlinkはcandidate `realpath`より前に拒否する | 必須passing evidence |
| 正常に返されたidentity metadataまたはcanonicalizationがstructurally ambiguousまたはunusable | `safe-fs-boundary-unverifiable`を返しcandidateを拒否する。Root/shared-ancestor failureではsourceを拒否 | 必須passing evidence |
| Contractで宣言したstructural `lstat`がexact `ENOENT`を返す | Observation前は`absent`だけを返し、後なら`entry-disappeared`だけを返す。このconversionを`open`/`read`へ適用しない | 必須passing evidence |
| その他の調査対象Source operationがthrow/rejectする | Owning outer boundaryへ変更せずpropagateし、file Diagnosticもattempt resultもpublishしない | 必須passing evidence |
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
Diagnostic serialization/retentionのthrowはdomain recoveryなしでpropagateし、attempt result/generationをpublishせず、
REST所有ならOperation Errorだけで表す。
Multi-Source caseではA/Bのentry-failure pairが共存し、B successがAを保持し、A successだけがAのpairをclearし、
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

Release recordでは、acceptしたdependencyまたは破壊的なpublic-contract判断ごとにmigration impactを記録する。
以前の公開package、public contract、永続profile、user data、影響を受けるconsumerがないことを確認した場合だけ、
initial baselineをno impactとして記録する。それ以外では必要なconsumer action、compatibility/support window、
rollback/support pathを記録する。Evidenceが欠落するか一方の言語だけならrelease gateをfailureとする。

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
validation failure、await済みcompletion、root-only import boundaryに加え、defaultでcaptureしたexact `process.cwd()`と、
単一`--cwd`のexact platform ordering、すなわちWindows UNC/device/current-drive/root-relativeと`C:`/`C:foo`
drive-relativeを`resolve`前にrejectすること、plain relativeだけのresolution、shared-parser admission、filesystem/network
I/O 0件、`chdir`/per-drive semanticsなし、およびmissing/empty/duplicate/pre-resolution-invalid/parser-rejectedな`--cwd`を
session/browser作成前にrejectすることも扱う。上記exact minimal OS別environment
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
