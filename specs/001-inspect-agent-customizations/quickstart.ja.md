# Quickstartと検証guide

[English](quickstart.md)

このguideは、このfeatureで説明した実装のend-to-end acceptance pathである。対応する実装taskがnamed
script/fixtureを追加するとcommandが実行可能になる。Current scaffoldが既にそれらを持つとは主張しない。

## 前提条件

- Node.js 24.18.0 Active LTS（packageは宣言済み互換Node 26+ rangeもsupport）
- pnpm 11.13.0
- Current native targetのcontributor build用Rust 1.97.0。End userはrelease-test済みprebuildだけをinstallし、
  Rust compilerは不要
- Full `pnpm run build` acceptance pathでは、8 target CI jobすべてがartifactを配置したrelease-assembly
  workspaceが必要。単一workstationはcurrent addonをbuild/testできるが、残り7つの検証済みinputなしに
  publishable tarballを作成・主張できない
- Project setup commandで作成したPlaywright-support Chromium
- `127.0.0.1`へ到達できるlocal browser

Toolchain確認:

```bash
node --version
pnpm --version
rustc --version
```

期待結果: 基準環境ではNodeが`v24.18.0`、pnpmが`11.13.0`、Rustが`rustc 1.97.0`を表示する。[research.ja.md](research.ja.md)
に記録したNuxt/Vue互換性が変わるまでTypeScript 7/Vite 8へ置換しない。

## Installと準備

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm run build
```

期待結果:

- Committed lockfileを変更せずinstallする。
- Buildは最初にroot-resolvedなpackage所有の`.output/`、`.build/`、`dist/` treeだけを除去する。
  `nuxt build`は標準`.output/public` staging treeへroot-absolute same-origin static assetを作り、strict
  assemblerがredundantな`200.html`/`404.html`を要求するが除外し、`index.html`以外の全HTML fileを拒否する。
  Accepted treeを新規`dist/public`へcopyし、全copied asset size/hashと正確な全executable inline-script CSP hashを
  持つ`dist/manifests/static-assets.json`を書く。
- Release assemblyがlocked Rust 8-target matrixでbuild/self-test済みのartifactをconsumeし、検証済みartifactを
  `dist/native/<targetId>/safe-fs.node`へcopyしてclosedな`dist/native/manifest.json`を書く。Install scriptや
  runtime downloadを生成しない。
- tsdownがcleanな`.build/server`へfixed ESM extensionのnamed `cli.mjs`/`parser-worker.mjs` entryと任意の
  code-split chunkを書き、assemblerが`dist/manifests/server-assets.json`を作ってlisted regular `.mjs` fileだけを
  `dist/`へcopyする。
- `bin.mjs`はexecutableで、BOMなし、LF終端の正確な先頭行`#!/usr/bin/env node`で始まり、
  `dist/cli.mjs`をimportする。
- `package.json.bin`は正確に`{ "agent-customization-inspector": "bin.mjs" }`、`main`、`module`、`exports`は不在。
- Local server bind前にstatic/native manifest、package version、asset、target ABI、current-target self-testを
  全て検証する。
- Pack前のrecursive verificationで`dist/`に3 manifestとそのlisted static/server/native fileだけがあり、
  stale、link、non-regular、unexpected pathがないことを確認する。
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

- CLIが`http://127.0.0.1:<port>/#cap=<random>`形式のURLを表示し、non-loopback addressへbindしない。
- Browser表示のRepository source rootは`all-supported` fixture自身。
- 1秒以内にscan progressまたはmeaningful statusを表示する。
- 最初のcomplete inventoryが文書化limit内で表示され、凍結path contract外のfileを含まない。
- Process停止でsessionを破棄し、再起動時はcapabilityが変わりreveal stateが戻らない。
- Fragment削除後のreloadはAPI requestを送らず、このterminalに表示したprocess-lifetime URLを開き直すよう
  正確に案内する。Capabilityをbrowser storage/cookieへ保存しない。

通常利用の同等launch contract:

```bash
cd /path/to/intended/repository-root
npx agent-customization-inspector
```

Automatic browser openが失敗しても表示local URLを利用できる。初期リリースにはrepository argument、
ancestor-root discovery、remote-host flag、static-export command、MCP commandはない。

## 自動品質gate

実装変更をcompleteとみなす前に全gateを実行する。

```bash
pnpm run lint
pnpm run typecheck
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
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
- Rust format、clippy、unit test、native backend self-testがlocked toolchain/dependencyで完了する。
- Unit testがpath classification、order、parser bound、mask、diagnostic、state transition、deterministic
  projectionを扱う。
- Contract testが全API status/security ruleと全stable behavior、inspection-rule、composition-strategy、
  official-source IDを扱い、positive、1-rule near-miss、derived、relationship-only、excluded、
  multi-provenance、multi-tool、Global caseを含む。
- Integration/security testがsource containmentとcustomization由来のexecution、child process、MCP
  connection、outbound request、dynamic evaluation、source mutationが0であることを証明する。
- Package testがtarballをbuild/inspectionし、isolated fixtureへinstallし、exact native target artifactと
  固定のpackaged parser Worker URLをloadして、working tree/compiler/downloadへ依存せず正確な`npx` entryを
  launchする。
- 100,000 entry/500 in-limit customization fileのperformance fixtureが1秒以内にstatus、記録済み
  reference hostで10秒以内に完了する。
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
   matcherは正確な`./` Baseと`./` relative selectorを持ち、bare `**/`を拒否する。`./**/`は明示的な
   Inspector descendant inventoryとしてだけ受理し、vendorの下向きwalkの証明とは解釈しない。
3. Static ruleは正確なroot/recursive/direct-child grammarだけを許可する。Staticとderivedの両ruleが
   受理したfileは1回だけ読み、両provenanceを保持する。各provenanceは自身のmatched path、
   behavior/strategy/source evidence、scope/order、applicabilityを持つ。
4. Surface fixtureはGitHub Copilot VS Code、CLI、cloud lookup behaviorを分離する。VS Codeのworkspace-root
   instructionがexactである一方、CLIのstandard-location/target-path traversalはInspector globではなくvendor
   behaviorとして表現されることを証明する。Root-only/nested near missが差を示す。
5. Repository、文書化済みUser、consent済みGlobalの表を独立して検証する。FR-015からFR-018が明示しない限り、
   文書化済みUser locationはGlobal read authorityにならず、runtime compositionはInspectorのRepository/Global
   source graphをmergeしない。
6. Derived ruleはtyped edge 1本だけとする。Vendor-specificなlocal marketplace syntax/catalog-root解決、
   Codexのancestry-comparable fallback name、skill-local `agents/openai.yaml`だけを扱う。Bounded-derived
   provenance、generic relationship、sibling Codex subtree、remote source、任意config/component pathを
   別readのseedにしない。同じphysical fileの独立static provenanceは自身のtyped ruleをseedにでき、
   2つのseed fileが同じtargetを宣言した場合は2つのprovenance entryを保持する。Codex fixtureは
   plain-stringとobject `source.path`の両local marketplace formを扱う。Seed-state fixtureはknown-satisfied
   output、unresolved conditional output、known unsatisfied/shadowedまたはbounded-derived seedからの出力なし、
   stable deduplication/先頭128件保持、129件目targetへaccessしないことを証明する。Pure path fixtureは全OSで
   ADS colon、Windows-special character/device name、trailing dot/space、case/Unicode-normalization mismatch、
   8.3 aliasを検証し、どれもnative ticket lookup/I/Oへ渡さない。
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
   default `hooks/hooks.json`対manifest override、default 32-KiBとproject-declared cumulative UTF-8 capの
   1 byte手前・exact・1 byte超を扱い、broad-to-narrowでomittedになるprovenanceをassertする。
12. Source-level incompletenessと製品・インスペクター間symlink差異のfixtureで、全source-level factがtool、
   説明するnon-candidate rule、影響を受けるcandidate/relationship rule、固定reason codeを識別し、matching
   provenance/edge conditionへcanonical source factを失わず投影することを検証する。

## User story検証

### 1. Repository customizationの発見

```bash
pnpm exec playwright test tests/e2e/discovery.spec.ts
```

確認項目:

1. Repository sourceがchild-process `cwd`と等しく、picker/ancestor rootがない。
2. Source、tool、kind、path filterをkeyboard/pointerで操作できる。
3. 1 physical `AGENTS.md`、`CLAUDE.md`、skill、`.mcp.json`、marketplaceがfile contentを重複せず
   複数recognitionを表示できる。
4. Near-miss pathがなく、empty repositoryに成功したsupport scope説明を表示する。
5. 最初のsnapshotはlegalなempty bootstrap generation 0を持つ。自動Repository scan成功時はgeneration 1をcommitし、
   forced fatal first attemptでは0をactiveのまま保ち、failed progressをnullにしてbounded lifecycle diagnosticだけを報告する。

### 2. Activationなしのinspection

```bash
pnpm exec playwright test tests/e2e/inspection-safety.spec.ts
pnpm run test:security
```

確認項目:

1. Hook command、script、plugin component、URI、markup、MCP declarationをinert text/dataとして表示し、
   execute/connect/load/navigateしない。
2. Maintained secret valueすべてをsource、metadata、comparison、diagnostic、log、normal API responseでmaskする。
3. 1 maskのrevealがその値だけを返し、file close/rescanで直ちにclearする。
4. Malformed、unreadable、stale、binary、oversized、cycle、traversal、boundary-crossing fixtureがactionable
   safe diagnosticを作り、unaffected fileは利用可能。
5. 4,097個目のmask matchまたは2 MiB超のmasked outputはsource/metadata全体を非公開にし、raw contentを
   破棄してcomparison/revealを許可しない。Parser timeout、worker-memory、depth、node、scalar、metadata-entry
   overflowは対象recognitionのextraction result全体だけを破棄し、derived read authorityを残さない。
6. Documentation statusとapplicability factを分離し、conditional、conflicting、experimental、deprecated、
   disabled、omitted、shadowed、unknown provenance/edgeを発明した“effective”結果にしない。

### 3. 2 fileの比較

```bash
pnpm exec playwright test tests/e2e/comparison.spec.ts
```

確認項目:

1. 任意source/toolからactive-generationのreadable fileを正確に2つ選べる。
2. Read-only Monaco source modelがmask済みtextだけを保持し、link/editingを無効にし、filesystem pathでは
   なくopaqueなin-memory URIを使う。
3. Monacoがsemantic ranking、merge、lint、validation、format、convert、fix suggestionなしでliteral
   source差を表示する。Recognition metadataは区別可能なまま、JSONへserializeせずVueでtyped fieldを
   比較し、provenance path/status/scope/order/applicabilityとrelationship-edge applicabilityを別rowに保つ。
4. 1 file 20,000行capまたは5,000 ms Monaco computation timeoutがcomplete read-only side-by-side
   masked sourceを削除せず、actionable diagnosticを示す。
5. Rescan、removal、Global disable、route closeがstale selection/revealをclearし、関連する全editor/model
   instanceをdisposeする。
6. Keyboard/screen-reader userがlabel付きcontrolとaccessible diff viewerを使い、focus trapなしでsource
   diffへ入り、navigateし、抜けられる。
7. Packed appがeditor workerをsame-origin static assetからloadし、CSP violation、external request、
   `blob:` workerを発生させない。
8. `/`、`/compare`、`/global-consent`、`/files/<fileId>`のdirect loadが同じroot-absolute assetからbootする。
   CSPの正確なNuxt bootstrap hashは成功し、modified/unrecorded inline scriptとexecutable attributeはblockする。

### 4. Global inspectionへのopt-in

```bash
pnpm exec playwright test tests/e2e/global-consent.spec.ts
```

Test harnessはisolated fake tool homeを渡し、developerのreal homeを絶対にinspectしない。確認項目:

1. Consent前にGlobal pathへ一切touchせず、previewを`stat`、`realpath`、enumeration、file readなしでlexicalに
   派生する。
2. Consent viewが正確なCopilot/Claude/Codex lexical root、relative path pattern、input state、除外、
   contract version `2026-07-15`を表示する。
3. Opt-in後は文書化instruction candidateだけがtool別boundaryを持つ別識別Global sourceに表示される。
4. Present-empty、relative、missing、unreadable、その他invalid env overrideはdefaultへ黙ってfallbackせず
   diagnosticを作り、entryがabsentの場合だけdefaultを使う。
5. 32 KiB rootと192 KiB escaped displayは正確に保持する。次の1 byteで`inputState: oversized`、
   `displayRoot: null`、`global.previewTooLarge`となり、prefix表示、normalization、canonicalization、root creation、
   authorizationを行わない。
6. Stale/changed/replayed preview ID/digestを拒否する。Symlink、junction、case、normalization、short-name aliasに
   よりcanonical rootが表示lexical pathと異なる場合はenumeration前に拒否し、暗黙に置換しない。
7. Disableはpriority barrierとしてactive uncommitted workをdiscardし、queued Global workをcancelしてN+1で
   removalをcommitし、中断したRepository commandを1回requeueして最大N+2をcommitする。Global file、raw
   byte、diagnostic、comparison、mask、revealed valueを削除する。Repository contentはそのままcarryするがIDは
   rekeyする。
8. 明示Global rescanはenabled時だけ受理し、Repository rescanと同じFIFO/dequeue時generation ruleに従い、commitで
   両source graphをrekeyする。Disabled/disabling/duplicate caseはcontract済みconflictを返す。Fatal attemptは
   exact consent/boundaryと任意のprior graphを保ち、failed/null progressを報告して明示rescan/disableを可能にする。
9. Barrier queued/active中の2回目のdisableは同じcompletionへjoinしてgenerationを追加しない。Global enabled
   flag、consent、nonempty graph、open capability、scan/enable commandがない場合、無関係なRepository workが
   activeでもdisableはno-opになる。

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
| Relationship | 1 file 1,000件、direct depth 1 | Provenance/recognition/rule/kind/closed-origin/source-occurrence順の先頭1,000件を保持し、次のdistinct edgeでdiagnostic付きpartialをpublish。追跡しない |
| Candidate provenance | 1 recognition 2,000件 | 追加admissionを停止し、lossy aggregateにせずpartialと明示diagnosticを作る |
| Derived target | 1 static seed 128 distinct件、provenance depth 1 | Derivation-rule/closed-field/source-occurrence順の先頭128件を保持し、129件目はtarget stat/read前に停止、partialをpublishしてcap対象diagnostic candidateを渡す |
| Codex fallback name | 1 config 16個、各128 UTF-8 byte | Extra/oversized valueをpath許可なしで拒否 |
| Mask match | 1 file 4,096個 | 4,097個目で`masking-overflow`をpublishし、全source/metadataを非公開、raw contentを破棄し、fixed diagnostic付きpartialにする |
| Masked output | 1 file 2 MiB UTF-8 | Allocation/output増幅前にabortし、同じfail-closedな`masking-overflow`を使う |
| Parser structure | depth 64、50,000 node、1 scalar 64 KiB、1 recognition 512 metadata entry | 対象recognitionのextraction result全体を破棄し、mask済みsourceと無関係な成功recognitionを保持 |
| Parser time/isolation | 1 recognition 2,000 ms、old/young/stack 64/16/4 MiBのworkerを最大2つ | Workerをterminate/replaceし、失敗result由来のrelationship/derivationなしでpartialをpublish |
| Source condition fact | 1 source 256件 | 無効な同梱registryをscan前に拒否し、既知limitationをtruncateしない |
| Assessment condition fact | 1 provenance/relationship 64件 | 無効なregistry emitterを拒否し、同じkeyの別reason/basis factを保持 |
| Scan diagnostic | 1 file 128件、1 source 5,000件、1 generation 10,000件 | 各最終slotをfixed sentinel用に予約し、後続distinct detailを決定的に抑止してoverflow時partialをpublish |
| Session lifecycle diagnostic | Committed generation外で1,024件 | Fatal uncommitted attemptを含むdetail最大1,023件とfixed session sentinelを保持し、client request errorを蓄積せずactive generationを変更しない |
| Global preview root input | 32 KiB UTF-8 | 次の1 byteでnormalization/escape前に`oversized`/nullを返す |
| Global preview escaped display | 192 KiB UTF-8 | Output expansion前に停止し、prefixを公開せず`oversized`/nullを返す |
| Request body | 64 KiB | JSON parse前に`413` |
| Scan wall time | 30秒 | Abortしてbounded partial resultをpublish |
| Comparison line | 1 file 20,000行 | Monaco diff highlightをskipし、両方のcomplete masked source viewを保持 |
| Comparison computation | 5,000 ms | Monaco diffをcancelし、両方のcomplete masked source viewを保持 |

10秒success criterionはperformance targetでありhard timeoutではない。全limit testがdeterministic order、
停止条件後の追加readがないこと、comparison fallback/teardown後にstale Monaco modelがないことをassertする。

Parser-limit testは全format、kill/replace behavior、worker crash後の成功file、all-or-nothing recognition outputを
扱う。Mask-limit testは停止点より後へmaintained secretを置き、prefix、suffix、metadata、raw value、comparison
model、reveal ID、diagnostic argument、log entryのどこにも露出しないことを証明する。

Native boundary testは`darwin-x64`、`darwin-arm64`、`win32-x64`、`win32-arm64`、
`linux-x64-gnu`、`linux-arm64-gnu`、`linux-x64-musl`、`linux-arm64-musl`で実行する。Test専用barrierで
enumeration/read間のparent directory/final fileを置換し、Repository pathをrename/replaceし、mount/bind
mount、junction、arbitrary reparse tag、ADS、8.3 caseを扱う。保持root capabilityはoutside sentinelを決して
readせず、identity mismatchで全byteをdropする。Exact schema/order/target mapping、Linux libc report、package/
custom-ABI/Node-API、byte length、hash、missing/corrupt artifact、self-test caseで、別targetをprobeせず
native manifest/選択`.node` fileを置換するsymlink、directory、platform-safe non-regular fixtureも含め、別targetを
probeせず`node:fs` inspected-source fallbackなしにbind前にfailすることを証明する。Packaged artifactでもload/race testを
反復し、test専用barrierをproduction exportへ含めない。

Static-package testは2 MiB/4,096 asset/512-byte path/32 inline-hash manifest limit、exact schema/order/MIME/
size/hash validation、symlink/unexpected-file rejection、全client route上のNuxt root-absolute asset referenceを扱う。
正確なrecord済みinline scriptがCSP下でbootし、1 byte change、unrecorded script、executable attribute、nonce、
`<base>`、relative/external executable URL、blob/external workerはbind前にfail closedまたはCSPでblockする。
固定generated `200.html`/`404.html`だけを除去し、他のHTMLを受理せず、どちらのaliasもpack/serveしないことも
assertする。
Server/package caseはclosed server manifest、required CLI/Worker entry、全tsdown chunk、clean staging/output setup、
各output subtreeへ1つ注入したstale file/non-regular pathを拒否するrecursive exact-set comparisonを検証する。

Diagnostic limit testはcode/source/file/argument deduplication、固定phase/source/path/rule/code/occurrence順、
overflowなしでは未使用のreserved slot、4つ全ての`diagnostic-limit-*` sentinel、saturating suppressed count、
outer scope capでdropしたdetailへのreference除去、active generationを変更しないsession overflowを扱う。
Client起因API errorを反復してもretained diagnostic countを増やさない。

## Manual accessibility review

Automated E2E合格後、built packageで確認する。

1. Keyboardだけでlaunch/URL follow、filter、file open、1 value reveal/close、2 file select/compare、Global
   consent open、Global enable/disable、rescan、inventory returnを行う。
2. Visible focus、logical focus order、skip/navigation landmark、unique label、status announcement、
   error/next-step association、generation replacement時にfocusを失わないことを確認する。
3. Light/dark/forced-colors、200% zoom、narrow viewport reflow、reduced motion、tool、file kind、documentation
   status、applicability fact、mask、diagnosticのscreen-reader name、Monaco accessible diff viewerと
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
assertし、展開した`dist/**` contentが3 manifestとlisted fileに一致することを確認する。Exact `bin` mappingと
`main`/`module`/`exports`不在、dependency manifest、license notice、exact shebang/executable mode、strict static/server/native manifest、全advertised
prebuild、install/download script不在、公開README pairを確認する。`pnpm run test:docs`はplanning setを公開せず、
repository内の全英日document pairを別に検証する。各targetはcross-compileだけで済ませず、そのtarget上でload/native
race suiteに合格させる。最後にcomplete diffをreviewし、
untested branch、secret exposure、古いofficial-path assumption、accidental source mutation、unrelated changeが
ないことを確認してからreleaseする。

`pnpm run test:package`は新規pack済みtarballをisolated fixtureへinstallし、
`npx --no-install agent-customization-inspector --no-open`をspawnし、valid loopback launch URLを観測してprocessを
終了しなければならない。Tarball/mapping inspectionだけではlaunch testにならない。
