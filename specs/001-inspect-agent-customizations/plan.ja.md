# 実装計画: エージェントカスタマイズの調査

[English](plan.md)

**ブランチ**: `dev` | **日付**: 2026-07-16 | **仕様**: [spec.ja.md](spec.ja.md)

**入力**: `specs/001-inspect-agent-customizations/spec.ja.md` の機能仕様

## 概要

`npx`で起動し、GitHub Copilot、Claude Code、OpenAI Codexのallowlist対象
カスタマイズファイルを、有効化せずに一覧表示・比較する読み取り専用ローカルInspectorを構築する。
1つの凝集したpackageとして、Nuxt client SPAを`app/`、Node CLIとローカルinspection hostを`src/`、
serializable contractを`shared/`、最小のshimを`bin.mjs`に置き、1つの公開`dist/`にまとめる。
固定clean stepはpackage所有の以前の`.output/`、`.build/`、`dist/` treeだけを除去する。`nuxt build`は
標準`.output/public` staging treeへ静的browser appを作り、固定assembly stepがroot-absolute assetを検証して
`dist/public`へcopyし、正確なinline-script CSP hashを記録し、tsdownのCLI/parser-Worker bundleをmanifestで
閉じた`.build/server`からcopyする。Pure Node.jsの`src/inspection/safe-fs.ts` layerを、調査対象sourceを
enumerate/readできる唯一の経路とする。上限付き`node:fs/promises` traversal、canonical path check、opaqueな
scan ticket、同じ`FileHandle`でのread前後のidentity/metadata checkを使用する。Browserはmask済みsourceをread-only Monaco editorで表示し、source比較には
Monaco diff editorを使う。Typed recognition metadataは通常のVue componentで別に比較・表示する。

Security boundaryを厳密にする。Browserはfilesystemを読まず、Node hostは
カスタマイズファイルをdynamic importせず、初期リリースにはstatic export、MCP、remote host、
自動watch modeを設けない。Loopback限定hostはprocessごとのrandom capabilityで保護したversioned
HTTP APIを通じ、mask済みDTOだけを送る。明示的scanは凍結したinspection path allowlistを使用し、
symlink traversalを拒否し、readとbest-effort parserに上限を適用し、in-memory generationを
atomicに置換するため、reveal stateはrescanを越えて残らない。

Customization discoveryは、文書化済みvendor lookup behavior（`behaviorId`）、Inspector matcher/read policy
（`ruleId`）、runtime composition strategy（`strategyId`）、official source record（`sourceId`）という4つの
contract-versioned registryとして保守する。
共通allowlist contractはmatcher grammarとsafety invariant、Copilot・Claude・Codexの個別contractはvendor
behaviorとtool固有rule、composition contractはorderとrelationship-only rule、source registryは正確な公式
URL/section evidenceとreview metadataを所有する。RepositoryとUser/Global behaviorは別表とし、Copilotの
VS Code、CLI、Cloud surfaceを1つのlookup modelへcollapseしない。

全Inspector Repository matcherはlaunch rootを明示baseとし、`./`から始めて表記する。Bareな`**/`はinvalidで、
`./**/`が意味するのは下向きInspector descendant inventoryだけであり、vendor traversalではない。Static
candidate、vendor-specific one-edge derivation、relationship-only reference、exclusionを分離する。File存在と
product surface、runtime root/`cwd`、target match、trust、enablement、selection、installation、managed policy、
external runtime factを別に保ち、inventoryをeffective agent configurationに見せない。Closed context
relationshipは、agentが参照し得る独立inventory済みinstruction、rule、skill、MCP declaration、memory scopeを
path追跡なしで示す。Codex instruction-byte limitとexcluded non-file inputは明示condition factのままとする。

## 技術コンテキスト

**言語・バージョン**: 開発基準はNode.js 24.18.0 Active LTS、package enginesは
`^24.11.0 || >=26.0.0`、TypeScript 6.0.3、Vue 3.5.39

**主要依存関係**: Nuxt 4.4.8、Vue Router 5.2.0、tsdown 0.22.8、Vite 7.3.6
（Nuxtと互換性のある最新release）、`cac` 7.0.0、`open` 11.0.0、`yaml` 2.9.0、
`jsonc-parser` 3.3.1、`smol-toml` 1.7.0、`monaco-editor` 0.55.1。最初のlockfile作成時に
これらの正確なstable versionを再確認しなければならない（MUST）。Prereleaseや互換性のない
新しいmajorは「最新」の対象にしない。

**ストレージ**: 永続的application storageは使用しない。Session、raw file byte、mask済み値、
diagnostic、comparison selection、reveal stateはprocess/browser memoryだけに存在する。

**テスト**: Vitest 4.1.10と`@vitest/coverage-v8` 4.1.10、Nuxt Test Utils 4.0.3、
Vue Test Utils 2.4.11、happy-dom 20.10.6、Playwright 1.61.1、
`@axe-core/playwright` 4.12.1。Fixture駆動のunit、contract、integration、packaging、
performance、security、browser testとmanual accessibility checkを使用する。

**対象platform**: Node.jsがsupportするmacOS、Windows、Linux環境とmodern browser。Packageはplatform非依存の
JavaScriptとstatic assetだけを含み、install script、runtime download、end-user compilerを必要としない。
Serverは`127.0.0.1`だけへbindし、remote deployment modeを持たない。

**Project type**: 静的Nuxt web client、Node CLI/local HTTP service、shared serializable
contractを含む単一の公開可能なESM npm package。Runtime、build、testの全executable codeは
JavaScript/TypeScriptとし、generated HTML/CSS、JSON manifest、documentation、licenseはdeclarative package
artifactとして許可する。

**性能目標**: 1秒以内にscan statusを公開し、基準環境で100,000 filesystem entryと500件の
matching fileを10秒以内にscanし、500 itemでのfilterとselection feedbackを100 ms未満にする。

**制約**: カスタマイズ由来の実行、child process、dynamic import、network request、MCP connection、
source mutationを行わず、boundary外byteを受理・公開しない。公開済みsymlinkを意図的に追わず、検出したpath changeの
byteをcommitしない。文書化したactive path-component mutatorはcurrent threat modelのscope外とする。
Global read前に明示的opt-inを要求する。
個別値を明示的に表示するまでraw secretをserver側に保持する。Inert textだけをrenderする。WCAG 2.2
AAを満たし、英語・日本語文書を同等に保つ。Hard limitは1 fileあたり1 MiB、file byte合計32 MiB、
訪問entry 200,000件、customization file 2,000件、path segment 64、1 fileあたりalias 1,024件、direct relationship
1,000件、1 recognitionあたりcandidate provenance 2,000件、1 sourceあたりsource-level condition fact 256件、
1 assessmentあたりcondition fact 64件、diagnosticは1 file 128件、1 source 5,000件、1 generation 10,000件、
1 sessionあたりout-of-generation lifecycle diagnostic 1,024件、proposed Global-root input 1件32 KiBと
escaped Global-root display 1件192 KiB、1 fileあたりmask match 4,096件とmasked UTF-8 output 2 MiB、
parser depth 64、parser node 50,000、scalarごと64 KiB、1 recognitionあたりmetadata entry 512件と2,000 ms、
parser worker最大2つとold/young/stack 64/16/4 MiB、request body 64 KiB、
scan deadline 30秒とする。
Monaco diff highlightは各side最大20,000行
の場合だけ試み、明示的な5,000 ms computation timeoutを使い、1 MiBのread limitを超えるfileは渡さない。
Contractがpartial publicationを指定するscan accumulation limitに到達した場合だけ、bounded partial resultと
diagnosticを返す。Request、registry validation、per-item、editorの各limitは`ResourceLimits`とcontractに
定めた個別の動作に従う。Typed derivationは1 edge、1 seed 128 targetまで、
各static seedのdeterministicなrule/field/source順で先頭128 distinct targetだけを扱い、129件目はtarget
access前に停止してcontract済みpartial resultをpublishする。1 Codex configのfallback basenameは16個かつ各128 UTF-8 byteまでとする。Generic relationshipはreadを
許可しない。Depthはprovenance単位で、bounded-derived provenanceはedgeをseedにできないが、同じfileの
独立static provenanceはeligibleなままとする。

Trusted package manifestはscan DTO limitとは別のfail-closed build/runtime limitを使う。Static manifestは
2 MiB、asset 4,096件、request pathごと512 UTF-8 byte、inline hash 32件、server manifestは1 MiB、`.mjs`
record 256件、1 file 16 MiB、listed合計64 MiBとする。両方ともunknown keyを拒否し、published packageでは
recursiveにexactなdeclared setを検証する。

**規模・scope**: ローカルuser 1人、起動時`cwd`をrootとするRepository source 1つ、3つの
文書化されたinstruction集合だけを含むopt-in Global source 0または1つ、一時session内最大2,000
item、comparison内file数は正確に2つ

## 憲章適合確認

*GATE: Phase 0調査前に合格し、Phase 1設計後に再確認済み。*

- [x] **根本原因を解く設計**: 1 packageとimmutableなsource-root parameterでlaunchとinspectionを
      解決し、workspace分割、repository picker、root discovery、static export、file watcher、
      speculativeなextension systemを追加しない。
- [x] **読みやすい実装**: `host`、`inspection/rules`、`recognizers`、`parsers`、`masking`、`session`が
      別々のinvariantを所有する。Vendor behavior、Inspector matcher、runtime composition、official evidenceは
      4つのclosed registryに分け、vendor固有policyを分離し、shared behaviorは小さく明示的に保つ。
- [x] **完全な検証**: Unit、contract、integration、package、performance、end-to-end、error、
      boundary、accessibility、adversarial safety scenarioと4つのuser storyすべてをtest layoutで扱う。
- [x] **文書の言語同等性**: Phase 0/1 artifactにはcanonical英語版と意味的に同等な`*.ja.md`を用意する。
      実装では両言語のuser/Contributor guide、全vendor/Repository/User/Global/surface表、official evidence、
      security limit、diagnosticを更新する。
- [x] **安全なboundary**: Read candidateを凍結し、raw値をNode側に保持し、local APIを認証し、
      Node.jsが公開するすべてのlinkまたは検証不能boundaryを拒否し、検出済みrace後のbyteを破棄し、
      すべてのscan次元を制限して、非原子的・platform-unobservableな残存制約を記録する。
- [x] **参加しやすさ**: 単一package setup、再現可能なpinned tooling、客観的期待結果、keyboard-first
      workflow、actionable error、自動・manual accessibility gateで参加の障壁を抑える。

### 設計後の再確認

Data modelはphysical file、candidate provenance、documentation status、runtime applicability factを分離する。
HTTP contractは既定でunmasked sourceを返さず、matcher contractは明示的staticまたはvendor-specific one-edge
derived candidateだけを許可し、relationship、component、vendor locator、excluded inputはread boundaryを
拡張できない。Quickstartは全stable behavior/rule/strategy/source ID、official-source drift review、Repositoryの
`./` grammarとbare `**/` rejection、必須品質gate、4つのend-to-end storyを扱う。Monacoはclient-only、
same-origin、bounded、model lifetime scopeとし、固有diff engineでdependency重複を避け、typed metadata比較を
明示的に保つ。Node.js-onlyの検証制約は、active mutator/platformの残存riskと、憲章が求める将来の
将来のpublic Node.js filesystem APIまたはOS強制snapshot/sandboxという具体的解消pathとともに記録する。Passing testによるproofや
暗黙のwaiverとして扱わない。未解決clarificationまたは既知の憲章違反は残っていない。

## Project構成

### このfeatureの文書

```text
specs/001-inspect-agent-customizations/
├── plan.md
├── plan.ja.md
├── research.md
├── research.ja.md
├── data-model.md
├── data-model.ja.md
├── quickstart.md
├── quickstart.ja.md
├── contracts/
│   ├── http-api.md
│   ├── http-api.ja.md
│   ├── inspection-path-allowlist.md
│   ├── inspection-path-allowlist.ja.md
│   ├── official-sources.md
│   ├── official-sources.ja.md
│   ├── runtime-composition.md
│   ├── runtime-composition.ja.md
│   └── vendors/
│       ├── github-copilot.md
│       ├── github-copilot.ja.md
│       ├── claude-code.md
│       ├── claude-code.ja.md
│       ├── openai-codex.md
│       └── openai-codex.ja.md
└── tasks.md                         # 後で /speckit-tasks が作成
```

### Source code（repository root）

```text
app/
├── app.vue
├── components/
│   ├── inventory/
│   ├── inspection/
│   ├── comparison/
│   ├── consent/
│   └── diagnostics/
├── composables/
│   ├── api.ts
│   ├── comparison.ts
│   ├── filters.ts
│   ├── monaco.ts
│   └── session.ts
├── pages/
│   ├── index.vue
│   ├── compare.vue
│   ├── global-consent.vue
│   └── files/[id].vue
└── styles/

src/
├── cli.ts
├── host/
│   ├── api-router.ts
│   ├── capability.ts
│   ├── global-consent.ts
│   ├── server.ts
│   └── static-files.ts
├── inspection/
│   ├── limits.ts
│   ├── safe-fs.ts
│   ├── scan.ts
│   ├── rules/
│   │   ├── registry.ts
│   │   ├── types.ts
│   │   ├── copilot.ts
│   │   ├── claude.ts
│   │   └── codex.ts
│   ├── applicability/
│   │   ├── conditions.ts
│   │   ├── context.ts
│   │   └── precedence.ts
│   ├── recognizers/
│   │   ├── claude.ts
│   │   ├── codex.ts
│   │   └── copilot.ts
│   ├── parsers/
│   │   ├── json.ts
│   │   ├── markdown.ts
│   │   ├── pool.ts
│   │   ├── toml.ts
│   │   ├── worker.ts
│   │   └── yaml.ts
│   └── masking/
│       ├── detectors.ts
│       └── mask.ts
└── session/
    ├── scan-generation.ts
    └── session.ts

shared/
├── api.ts
├── diagnostics.ts
├── entities.ts
├── limits.ts
└── registries/
    ├── vendor-behaviors.ts
    ├── inspection-rules.ts
    ├── runtime-composition.ts
    └── official-sources.ts

tests/
├── unit/
├── contract/
├── integration/
├── package/
├── performance/
├── e2e/
└── fixtures/
    ├── conformance/
    │   ├── vendor-behaviors.json
    │   ├── inspection-rules.json
    │   ├── runtime-composition.json
    │   └── official-sources.json
    ├── repositories/
    ├── global-homes/
    ├── secrets/
    └── adversarial/

scripts/
├── clean-build-output.mjs
├── assemble-server-manifest.mjs
├── build-static-manifest.mjs
├── verify-package-files.mjs
└── check-official-sources.ts

bin.mjs
nuxt.config.ts
tsdown.config.ts
playwright.config.ts
vitest.config.ts
```

**構成判断**: UIとCLIを同時にrelease/version管理するため、単一packageの`app`/`src`/`shared`分離を
使用する。NuxtはSPA（`ssr: false`）とし、static Nitro preset、`app.baseURL: '/'`、
`app.buildAssetsDir: '/_nuxt/'`、CDN URLなし、明示的importを使い、component auto-discoveryを無効にする。
これにより全nested client routeが同じroot-absolute same-origin asset URLをresolveする。Executableな
`bin.mjs`はBOMなし、LF終端の正確な先頭行`#!/usr/bin/env node`で始まり、`dist/cli.mjs`をimportする。

4つのregistry moduleは、1つのvalidatorがclosed graphとしてloadする場合もownershipを分離する。
`vendor-behaviors.ts`は文書化済みvendor lookup statement、`inspection-rules.ts`だけがstatic/derived matcherの
read authority、`runtime-composition.ts`はstrategyとrelationship-only policy、`official-sources.ts`はdevelopment/
test専用offline evidence mapのimplementation counterpartを所有し、startupまたはscan entry graphからimport
しない。4つのconformance JSON fixtureはこれらmoduleをmirrorし、相互IDを要求し、duplicate、orphan reference、
anchorなしevidence、`./`で
始まらないInspector Repository matcher、bare `**/` matcherがあればbuildをfailさせる。

Buildは最初にroot-resolvedなpackage所有の`.output/`、`.build/`、`dist/` treeだけを除去する。Nuxt標準
`.output/public` staging treeへ`nuxt build`し、strict normalizerがそのtreeを検証して新規`dist/public`へ
accepted fileだけをcopyするため、Nuxtが`dist`へ直接出力するとは仮定しない。Normalizerは
external/relative asset URL、executable attribute、malformed inline script、symlink、unexpected outputを拒否し、
closedな`dist/manifests/static-assets.json` inventoryと正確なCSP hashを書く。Node hostがstatus routingを
所有するため、Nuxtのredundantなstatic-host fallback `200.html`/`404.html`を要求するがcopyせず、保持する
`index.html`以外の全HTML fileを拒否する。

Cross-platform CIはmacOS、Linux、Windowsで同じpure Node.js safe-filesystem integration/race-detection suiteを
実行する。tsdownはnamed `cli`（`src/cli.ts`）/`parser-worker`（`src/inspection/parsers/worker.ts`）entry、
`fixedExtension: true`、cleanな専用`.build/server` output directory、source map/declaration無効、Node ESM
target、project moduleのbundle、`deps.skipNodeModulesBundle: true`による宣言済みruntime dependencyのexternal
維持を行う。Server assemblerはstaging tree内の安全なrelative nameを持つregular `.mjs` fileだけを受理し、
`cli.mjs`と`parser-worker.mjs`を要求し、全emitted code-split chunkをclosedな
`dist/manifests/server-assets.json`へ記録して、正確にそれらだけを`dist/`へcopyする。Hostはpackage所有の固定
`new URL('./parser-worker.mjs', import.meta.url)`からだけparser Workerを開始する。

Final recursive verifierはstatic/server manifestからcompleteな`dist/` file set、すなわち両manifest、全listed
public asset、全listed server `.mjs`を導出し、`npm pack`前にsymlink、non-regular file、missing record、
stale/unexpected pathを拒否する。Install時build/downloadは行わない。
`package.json.files`は正確に
`["bin.mjs", "dist", "README.md", "README.ja.md", "LICENSE"]`とする。npmは`package.json`も含めるため、
tarball allowlistはそのmanifestと上記5 entryおよびその内容だけで、source、fixture、planning artifactを
含めない。PackageはCLI-onlyとし、`package.json.bin`は正確に
`{ "agent-customization-inspector": "bin.mjs" }`、`main`、`module`、`exports`は不在とし、存在しないlibrary
entry pointをadvertiseしない。Package testはshimの正確なshebang/executable modeを検証し、tarballをisolated
fixtureへinstallし、local commandを実際に`npx --no-install`で起動し、loopback URLを観測して終了する。これにより
Nuxt asset、CLI、parser Worker、safe-filesystem layer、runtime dependencyがpackaged locationから`npx`で
利用できることを証明する。

## 実装boundary

- `src/inspection/safe-fs.ts`だけがenabled inspection sourceをenumerate/readできる。公開されたlexical rootの
  全componentを`lstat`で検査してlinkを拒否し、accepted rootを`realpath`でresolveし、directoryであることを
  要求して上限付きbigint identity/metadataを記録し、
  internal `InspectionRootContext`を作る。Deterministicなbounded walkerは`node:fs/promises.opendir`を使い、
  残entry budget内でdirectoryごとにentryを収集・sortし、全relative segmentをvalidateし、全entryをcountし、
  link、非directory traversal object、検出可能なdevice
  changeを拒否してからgeneration-boundな`ScanEntryTicket`を発行する。Ticketはprivate JS stateでbrandし、
  serialize、DTO/HTTP requestからの再構築を許さず、最大1回だけconsumeできる。Client指定pathはI/Oを認可しない。
- Candidate readは、その所有root contextとticketだけからpathを再構築する。Rootと全ancestorをbigint `lstat`で
  再検査し、ticket snapshotと`dev`、`ino`、`mode`を比較する。まずcandidate pathを`lstat`し、linkまたは
  non-regular objectを拒否して、`dev`、`ino`、`mode`、`size`、`mtimeNs`、`ctimeNs`をenumeration metadataと
  比較する。次にcandidate `realpath`と`path.relative`でcanonical containmentを確認し、直後にcandidate pathの
  `lstat`比較を繰り返す。両方のpath-stat snapshotが相互に一致し、enumeration metadataとも一致した場合だけ
  `open`する。`O_NOFOLLOW`が存在しplatformで有効な場合は、必須の
  final-component多層防御としてopenに使用する。不在または無効なsupportをcross-platform保証とはみなさない。
  Byteを読む前に、同じ順序のroot/ancestor/candidate-`lstat`/canonical/candidate-`lstat` sequenceを繰り返し、
  同じfieldを`FileHandle.stat({ bigint: true })`と比較する。Readerは同じ`FileHandle`から残byte budgetまでだけを読む。
  Handleを開いたままbyte受理前に、post-read validationとしてこの完全な順序付きsequenceと、同じ
  `FileHandle.stat`について同じfieldの比較を繰り返し、
  `finally`でhandleをcloseする。検出したlink、boundary、identity、type、size、metadataの変化はcandidateを
  拒否する。収集済みbyteを破棄し、readable content/receiptをcommitせず、安全にinventory済みのpathには上限付き
  diagnostic-only recordだけを残してよい。固定のsecret-safe diagnosticをemitする。
  Root変化はそのsource attemptをabortし、以前にcommitしたgraphを維持する。
- Nodeが必要なidentity/metadataまたはcanonicalizationをunavailable、ambiguous、malformed、その他unusableと
  報告した場合、layerは`safe-fs-boundary-unverifiable`でboundaryまたはcandidateを拒否し、推測しない。
  Root-level failureはsource attemptをabortし、candidate-level failureには上限付きdiagnostic recordだけを残してよい。
- Pure Node.jsはdirectory-handle-relative openや`RESOLVE_BENEATH`相当のatomic operationを公開しないため、上記
  checkはpath check間にroot、ancestor、final entryを差し替えられるactive adversarial processに対するkernel-enforced
  containmentを証明できない。またNodeだけでは全Windows reparse tagや全mount transitionをportableに識別できず、
  same-device bind mountとNodeが報告しないreparse metadataはtest proof外の明示的なplatform limitationとして残る。
  このreleaseのrace threat modelはimplementationが検出した通常の同時編集とその他raceを対象とし、検出した
  全caseをfail closedにする。Active adversarial filesystem mutatorは明示的にscope外とし、test resultをより強いcontainmentの証明と
  記述してはならない。具体的解消pathは、将来のNode handle-relative APIが利用可能になった時点で採用するか、
  threat model拡張前にscanをOS強制のread-only snapshot/sandbox内へ置くことである。
- 4つのregistryは1つのreference graphとしてvalidateするが、与えるauthorityは異なる。Vendor behavior recordは
  upstream lookupを記述するだけでI/Oを認可せず、static/bounded-derived Inspector ruleだけがreadを認可し、
  runtime strategyはorder、condition、relationship-only edgeをprojectし、official source recordはevidenceを
  提供するだけでruleを自動変更しない。全Repository matcherはBase、Relative selector、Expansionを分離し、
  正確なlaunch rootから`./`で表記し、bare `**/`を拒否する。明示的な`./**/`は下向きInspector inventoryだけを
  意味する。CopilotのVS Code、CLI、Cloud behaviorと、各vendorのRepository対User/Global behaviorは、推測した
  traversalを共有せず独立してaddress可能に保つ。
- Static matcherと3つのvendor-specific one-edge derivation familyだけをread authorityとする。Derived segmentは
  host-independent NFC/Windows-special grammarを通し、exact enumerated `ScanEntryTicket`へresolveできた場合だけ読み、
  ADS、device、trailing-dot/space、case/normalization、8.3 aliasはcandidate open前に拒否する。Vendor behavior registryがその他の
  supported User customizationを記録する場合も、FR-015からFR-018によりGlobal readは3 instruction setだけに
  制限し続ける。
- Tool recognizerは全accepted `CustomizationFile`へ1個以上の`ToolRecognition`を付ける。Semantic recognitionは
  1 physical fileを1回だけ読み、受理済みかつ上限内の独立candidate provenanceをすべて保持し、overflow時は
  contract済みpartial resultとdiagnosticをpublishする。Declarationをinert dataとして
  parseしてよいが、import、evaluate、remote content解決、relationship targetのreadは禁止する。Context
  extractionが合成できるのは独立受理済みfile間または固定relationship-only defaultへのclosedな
  vendor-documented edgeだけで、non-file/excluded contextはsource-level condition factにする。
- `src/inspection/applicability`はavailable factに対してclosed composition strategyと、それが参照するvendor
  behavior/ruleだけを評価する。Documentation status、product surface、runtime `cwd`/target、trust、approval、
  enablement、selection、agent context、tool availability、
  installation、instruction-byte budget、managed policy、external stateを分離する。Global
  instructions-only consent外のCodex
  user/profile fallback name、`project_doc_max_bytes`、project rootを含め、missing/excluded inputはunknownの
  ままとする。Source-level factは架空のsource file relationshipを作らず、tool、説明rule、影響を受ける
  candidate/relationship-rule IDを保持する。Copilotのsurface差、Claudeのexact-launch-directory project
  settings、direct-child-onlyなCodex rule file、authoredだがactivatedでないplugin manifestは、matcherの
  side effectではなく明示的なstrategy/condition inputのままとする。
- Official-source registryは各behavior、rule、strategyへ相互参照するstable evidence ID、canonicalな公式HTTPS
  URL、正確でboundedなsection anchor、review date、semantic fingerprintを与える。Offline contract/build
  validationはchecked-in recordをloadし、これらpageをfetchできるのは明示的なmaintainer drift commandだけと
  する。Startupとscanはdocumentationへaccessせず、remote page textをpackageへcopyしない。
- Parserはsafe modeだけを使用する。YAMLはcustom tagなしのcore schemaと無効化したalias、JSONCは
  既知fieldのtree extraction、TOMLは値を実行しないnormalization、Markdown/frontmatterはHTML renderを
  行わないextractとする。最大2 parser `Worker` threadでsync parser workをhost event loopから隔離し、
  V8のold/young/stack limitを64/16/4 MiB、recognitionごとのtimeoutを2,000 msとし、超過時にworkerを
  kill/replaceする。Bounded traversalはdepth 64、50,000 node、64 KiB scalar、512 metadata entryをenforceする。
  Parser/resource failureでは対象recognitionのextraction result全体（relationship/derivation declarationを含む）を
  破棄し、既にmaskしたsourceと成功した別recognitionは利用可能に保つ。
- Maskingは固定のbounded linear scannerだけを使う。4,097個目のmatchまたは2 MiB超のmasked outputで
  non-readableな`masking-overflow`にする。Prefix、metadata、relationship、derivation、mask、comparison、
  revealを公開せず、raw/decoded contentを破棄し、fixed safe diagnostic付きpartial generationとする。
- Node hostは`node:http`、小さなstatic MIME table、URL fragmentで渡すrandom 256-bit capability、
  厳密なHost/Origin check、CORSなし、API responseの`Cache-Control: no-store`、restrictive CSPを使う。
  Hostはbind前にclosed static manifestと全packaged asset hashを検証する。CSPはsame-origin scriptとNuxt
  executable inline bootstrapの正確なbuild-recorded SHA-256だけを許可し、inline executable attribute、eval、
  nonce、external/blob workerを禁止し、inline style permissionはMonaco layout/theme outputだけに残す。
  API payloadはcaller指定filesystem pathではなくIDを使用する。Capabilityはmemory-onlyで、fragment削除後の
  refreshはAPI callを行わず、process-lifetimeの表示済みlaunch URLを開き直すよう案内する。固定
  client-route grammarとbuild-manifest assetだけがinert SPA shellを受け取る。Global consentはI/Oなしの
  lexical previewとsession-keyed digestを使う。Proposed rootが32 KiB UTF-8を超えるかbounded escaped displayが
  192 KiBを超える場合は`oversized`かつ`displayRoot: null`とし、normalize/authorizeせずdigestをそのnull/stateへ
  bindする。Consent後のcanonical alias差異は表示boundaryを暗黙変更せずenumeration前に拒否する。
- Browserはmask済みsourceとinert DTOだけを受け取り、Vue componentと`monaco-editor`のESM buildで
  表示し、`v-html`を使用しない。Single-file source modelとsource comparisonの両側をread-onlyとし、
  opaqueなin-memory URIを使い、`readOnly`、`domReadOnly`、`originalEditable: false`、`links: false`、
  `renderMarginRevertIcon: false`を設定し、mask済みtextだけを保持する。`accessibilitySupport`は`auto`、
  `accessibilityVerbose`はenabledとし、各viewに`ariaLabel`を付ける。
  上限付きliteral source comparisonはMonaco diff editorが所有する。Typed recognition metadataは
  editorへserializeせずfield単位で比較し、Vueで表示する。Editorはclient-onlyとし、file/compare routeで
  lazy-loadする。Nuxt/Viteは明示的にimportしたeditor workerをsame-origin static assetとして出力し、
  未使用language-service worker、CDN asset、external worker、blob workerを許可しない。Editor/model
  instanceとsubscriptionはroute close、selection replacement、source disable、generation replacement時に
  個別にdisposeする。Accessible diff viewer、意味のあるARIA label、keyboard navigation、narrow-screen
  inline viewを有効に保ち、browser testとmanual checkの両方で検証する。Line capまたはcomputation
  timeout時もcomplete masked side-by-side sourceを表示し、actionable diagnosticを示す。
- 単一coordinatorがRepository scan、Global scan、Global-disable transactionをserializeする。通常scanはFIFO、
  Global disableはpriority security barrierとし、active uncommitted transactionをabort/discardし、queued Global
  workをcancelし、次にzero-I/O Global removalをcommitし、中断したRepository commandはその後ろへ1回だけ
  requeueする。各scan jobはその時点のsession-wide active generationから始め、unscanned sourceを残りのshared file/byte/diagnostic
  budget内でcarry forwardし、replacementを別に構築する。Completeまたはbounded partial resultだけが次
  generationをcommitし、全commitで全source graphをrekeyしてfile ID、comparison selection、reveal済み値を
  invalidateする。Fatal attemptはprior generation/IDを維持し、cap対象session-lifecycle diagnosticだけを返す。
  FatalなGlobal enable/rescanはexact consent/boundaryと任意のprior Global graphを保持し、明示retry/disableを
  可能にする。
  Generation 0はfile/diagnosticを持たないzero-I/O bootstrap snapshotとし、最初のRepository scanと初回fatal
  attemptが常にlegalなactive baseを持つ。明示Repository rescanとenabled Global rescanは同じqueue ruleを使う。
  Global disableの再要求は既存barrierへjoinし、Global enabled flag、consent、nonempty graph、accepted root
  context、running/queued Global scan/enable commandが何もない場合は、Repository workの有無にかかわらず
  即時no-opとする。

## 複雑さの追跡

Pure Node.jsというproduct制約は、bounded read、検出したraceのfail-closed、secret safety、review要件を免除せず、
文書化した残存race riskを導入する。避けられない実装costを1件明示する。

| 複雑さ | 必要な理由 | 不採用とした単純案 |
|---|---|---|
| 上限付き`lstat`/`realpath`/`open`/`FileHandle.stat`の反復検証とsame-handle read | 通常の同時変更をbyte受理前に検出し、identity、metadata、canonical containmentが変化したresultを破棄する | 直接の`readFile(path)`やglob-only traversalにはgeneration-bound authorization、identity一致、post-read race detectionがない |

**残存riskと解消path**: Node.jsではpath validationと`open`が1つのatomic kernel operationではないため、十分な
権限を持つactive mutatorが検出不能なroot/ancestor/final-entry replacement raceに勝つ可能性がある。承認時は
そのactorをscope外と
扱い、current checkをcontainment proofと呼んではならない。Threat modelを拡張するには、atomicなbeneath/no-follow
semanticsを持つ将来のNode directory-relative API、またはscan rootを囲むOS強制のread-only snapshot/sandboxを
導入し、security reviewとadversarial test planを更新する必要がある。
