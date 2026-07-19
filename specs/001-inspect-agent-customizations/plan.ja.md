# 実装計画: エージェントカスタマイズの調査

[English](plan.md)

**ブランチ**: `dev` | **日付**: 2026-07-19 | **仕様**: [spec.ja.md](spec.ja.md)

**入力**: `specs/001-inspect-agent-customizations/spec.ja.md` の機能仕様

## 概要

`npx`で起動し、GitHub Copilot、Claude Code、OpenAI Codexのallowlist対象
カスタマイズファイルを、有効化せずに一覧表示・比較する読み取り専用ローカルInspectorを構築する。
1つの凝集したpackageとして、Nuxt client SPAを`app/`、Node CLIとローカルinspection hostを`src/`、
serializable contractを`shared/`、小さなproject-owned integrity bootstrapを`bin.mjs`に置き、1つの公開`dist/`にまとめる。
固定clean stepはpackage所有の以前の`.output/`、`.build/`、`dist/` treeだけを除去する。`nuxt build`は
標準`.output/public` staging treeへ静的browser appを作り、固定assembly stepがroot-absolute assetを検証して
`dist/public`へcopyし、正確なinline-script CSP hashを記録し、tsdownのCLI/parser-Worker bundleをmanifestで
閉じた`.build/server`からcopyする。Pure Node.jsの`src/inspection/safe-fs.ts` layerを、調査対象sourceを
enumerate/readできる唯一の経路とする。上限付き`node:fs/promises` traversal、canonical path check、opaqueな
scan ticket、同じ`FileHandle`でのread前後のidentity/metadata checkを使用する。Browserは記述された完全な
sourceをread-only Monaco editorで表示し、source比較にはMonaco diff editorを使う。Recognition metadataは
tool/kind/field/occurrenceで対応付け、parser-normalized表示値ではなくexact authored literalを通常のVue componentで比較・表示する。

Security boundaryを厳密にする。Browserはfilesystemを読まず、Node hostは
カスタマイズファイルをdynamic importせず、初期リリースにはstatic export、MCP、remote host、
自動watch modeを設けない。Loopback限定hostはprocessごとのrandom capabilityで保護したversioned
HTTP APIを通じてinert DTOを送り、完全なsourceは機密content警告後の明示的なdetail/comparison requestにだけ
含める。環境変数参照はリテラルtextのまま保持し、process environmentのlookupまたは置換を認可しない。
明示的scanは凍結したinspection path allowlistを使用し、symlink traversalを拒否し、readとbest-effort parserに
上限を適用してin-memory generationをatomicに置換するため、古いgeneration所有のdetail/comparisonは正常rescanを
越えて残らない。Fatal rescanはuncommitted resultを1件もpublishせず、最後にcommitしたsnapshotを明示的な
Source別stale-failure entryとactionableなlifecycle diagnostic付きで、そのSourceがrefreshまたは除去されるまで保持する。

Customization discoveryは、文書化済みvendor lookup behavior（`behaviorId`）、Inspector matcher/read policy
（`ruleId`）、runtime composition strategy（`strategyId`）、official source record（`sourceId`）という4つの
contract-versioned registryとして保守する。
共通allowlist contractはmatcher grammarとsafety invariant、Copilot・Claude・Codexの個別contractはvendor
behaviorとtool固有rule、composition contractはorderとrelationship-only rule、source registryは正確な公式
URL/section evidenceとreview metadataを所有する。RepositoryとUser/Global behaviorは別表とし、Copilotの
VS Code、CLI、Cloud surfaceを1つのlookup modelへcollapseしない。

Userへ公開する全inventory/API pathは、所有Sourceの1つのrootから計算したSource-relative Pathとする。
Repository Sourceの場合だけrepository-relativeであり、各Global Sourceは自身のadmit済みtool-home rootを使い、
別Sourceとpath namespaceを共有しない。

全Inspector Repository matcherはlaunch rootを明示baseとし、`./`から始めて表記する。Bareな`**/`はinvalidで、
`./**/`が意味するのは下向きInspector descendant inventoryだけであり、vendor traversalではない。Static
candidate、vendor-specific one-edge derivation、relationship-only reference、exclusionを分離する。File存在と
product surface、runtime root/`cwd`、target match、trust、enablement、selection、installation、managed policy、
external runtime factを別に保ち、inventoryをeffective agent configurationに見せない。Originating fileを
持たないhosted/runtime inputは、関連Sourceに紐づく上限付きでevidence-linkedな`SourceConditionFact`とし、
I/O authority、synthetic file、path、source text、relationship origin、comparison targetを一切作らない。Closed context
relationshipは、agentが参照し得る独立inventory済みinstruction、rule、skill、MCP declaration、memory scopeを
path追跡なしで示す。Codex instruction-byte limitとexcluded non-file inputは明示condition factのままとする。

## 技術コンテキスト

**言語・バージョン**: 開発・build基準はNode.js 24.18.0 LTS、package runtime compatibility contractは
`^24.11.0 || ^26.0.0`、正確には`>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`、TypeScript 6.0.3、
Vue 3.5.39とする。6つのNode/OS floor jobはcompatibleな全minor/patch releaseを列挙するものではなく、
宣言した2つの下限をcertifyする。各floor未満、Node 25、将来のmajorはcontract外とする。

**主要依存関係**: Nuxt 4.4.8、Vue Router 5.2.0、tsdown 0.22.8、Vite 7.3.6
（Nuxtと互換性のある最新release）、`gunshi` 0.37.0、`yaml` 2.9.0、
`jsonc-parser` 3.3.1、`smol-toml` 1.7.0、`monaco-editor` 0.55.1。最初のlockfile作成時に
これらの正確なstable versionを再確認しなければならない（MUST）。Prereleaseや互換性のない
新しいmajorは「最新」の対象にしない。
この再確認はplanning gateであり、task内だけでpackageまたはversionを変更する許可ではない。選択済み
packageまたはversionが1つでも変わる場合、configuration作業前にimplementationを停止してcompatibility
decisionを再reviewし、dependency baselineを記載する英日両方のresearch、plan、quickstart、task artifactを
すべて同期し、作業再開前に
`/speckit-plan`、続いて`/speckit-tasks`を再実行する。Configuration、CI、release、package-policy
instructionは、その1つの同期済みbaselineだけを使用しなければならない（MUST）。

`src/cli.ts`はGunshiのstableなroot `define`/`cli` APIだけを使用する。Negatableな`open` booleanを
default trueとして定義して`--no-open`を提供し、`strict: true`を有効にし、bind前にすべての
positional/rest argumentを明示的に拒否し、`cli()`をawaitし、validation `AggregateError`を固定された上限付きoutputと
nonzero exitへ対応付ける。Built-in help/versionはbindせずに処理する。Production entryは`gunshi/agent`、
lazy command、custom plugin、experimental parser combinatorをimportしない。

**ストレージ**: 永続的application storageは使用しない。Session state、上限付きfile byte、記述された完全な
source DTO、diagnostic、機密content警告のacknowledgement、comparison selectionはprocess/browser memoryだけに存在する。

**テスト**: Vitest 4.1.10と`@vitest/coverage-v8` 4.1.10、Nuxt Test Utils 4.0.3、
Vue Test Utils 2.4.11、happy-dom 20.10.6、Playwright 1.61.1、
`@axe-core/playwright` 4.12.1。Fixture駆動のunit、contract、integration、packaging、
performance、security、browser testとmanual accessibility checkを使用する。Browser release gateは、pinした
Playwright versionがinstallする正確なChromium、Firefox、WebKit revisionでprimary-workflowとaccessibilityの
完全なsuiteを、startup helperがそのrevisionを選ぶという主張ではなく再現可能なautomated certification baselineとして実行する。
保守するusability study kitは、
SC-001、SC-006の順に同じ初回利用者20人cohortを使い、固定promptとmoderator制限、差し替えなしでfailureを不成功へ
算入するrule、定義済みtimer boundary、固定ground truthで採点するSC-006の4項目response formを含む。
時間計測したSC-006回答後、同じ参加者が標準化されたcomparisonとGlobal consentの課題を実施する。Moderatorは
客観的workflow outcomeと事前定義済みsafety eventを記録し、全safety eventを自動的にcriticalとする。Product起因と
疑われるworkflow blockerだけを2人がrubricに対して独立分類し、不一致は第3の裁定者なしでcriticalとして数える。
Gateは20人全員が4つのprimary workflowすべてを実施し、自動判定またはreviewer確認済みcritical issueが1件もない
場合だけ合格とする。Maintainer teamが公開study planを通じてrecruitment、compensation funding、moderation、review、
consent/privacy handling、提供equipment/session support、bilingual material、accessibility accommodationを担当し、通常の
contributorには負わせない。Study environmentではdefault browser handlerがrelease-certified revisionへ解決することを記録する。

**対象platform**: Supported runtime contractは宣言済みNode.js 24/26 engine range全体を`ubuntu-24.04` x64、
`macos-15` arm64、`windows-2025` x64で使用するものとする。`24.11.0`/`26.0.0`の各floorと3つのOS/architecture targetを
掛け合わせた正確な6 jobは、compatibleな全Node minor/patch releaseの一覧ではなく必須のlower-bound release-certification
sampleである。1つのplatform非依存tarballをNode.js 24.18.0 development/build baselineの`ubuntu-24.04` x64でbuildし、
同環境で別のbuild/package smoke checkを実行してから、同一byteを6つのfloor jobすべてでinstallして検証する。各releaseで
解決されたrunner-image identifierと実際のNode versionを記録する。その他のOS/architecture targetと宣言したengine range外の
Node versionはunsupportedとする。Browser release certificationでは、Playwright 1.61.1がinstallする正確なChromium、Firefox、
WebKit revisionについて、Node.js 24.18.0の`ubuntu-24.04` x64で完全なbrowser/accessibility suiteを実行する。これらのrevisionは
再現可能で有限なcertification baselineであり、user browserの網羅的listではない。固定OS helperは表示済みURLをuserのdefault
handlerへ渡すだけでbrowser family/versionを選択または検証せず、helper成功をbrowser compatibility evidenceとしない。Certification
baseline外のhandlerはbest-effortであり、表示済みURLと`--no-open`を使ってcertified browserでmanual openすることをactionable
fallbackとする。公開project/dependency package payloadとproject-authored installed application codeはplatform非依存の
JavaScript application codeとdeclarativeなstatic/package dataだけを含み、install script、runtime download、end-user compilerを必要としない。
Package-manager生成`node_modules/.bin` symlink/`.cmd`/`.ps1` launcherはpayload外interoperability metadataとして別の
exact-target/content auditを受ける。Development-only toolingはproduct package外で別にpin/auditする。
Serverは`127.0.0.1`だけへbindし、remote deployment modeを持たない。

**Project type**: 静的Nuxt web client、Node CLI/local HTTP service、shared serializable
contractを含む単一の公開可能なESM npm package。Project-authored executable application codeはすべて
JavaScript/TypeScriptとし、全published package payload内のexecutable codeはJavaScriptとする。Generated HTML/CSS、
JSON manifest、documentation、licenseはdeclarative package artifactとして
許可する。このFR-038 boundaryでthird-party development/test toolingをpublished application codeと誤分類しない。

**性能目標**: `tests/performance/sc002-reference-profile.json`にversion付きで公開するprofile上で、現在のrequestが
queue済みであること、active phase名、またはcomplete/partial/failedのいずれかを示しassistive technologyにも公開される
statusを1秒以内にbrowserへ表示し、内容を変更しない1つのdeterministic fixture（100,000 filesystem entry、500 matching
file）について、正確に10回のfresh-process runのうち9回以上で10秒以内に完全なinventoryを表示して主要なlist controlを
操作可能にする。Spinner、generic loading label、scan stateのないacknowledgement、変化しないcontrol、以前のrequestのstatusは
qualifyしない。両timerはbrowserのscan requestで開始し、fixture構築と`npx` download/install/process起動は除外し、run間で
operating systemのfilesystem cacheを意図的にresetしない。Profile ID、実際のenvironment field、fixture-manifest digestを記録し、
personal identifierとabsolute user pathだけを省略する。Profile fieldを変更すると新しい直接比較不能なmeasurement setを開始する。
各runで完全なinventoryが
操作可能になった後、標準化されたfilter actionとitem-selection actionを1回ずつ実施する。各actionはbrowserの
input dispatchから、対応するfiltered resultまたはselected-state feedbackが表示され操作可能になるまでを測定し、
同じ10回のrunのうち9回以上で両interactionを100 ms未満にする。

**制約**: 調査対象カスタマイズによりexecution、child process、dynamic import、network request、MCP connection、
source mutationを発生させない。別途boundedなstartup launcherは、許可するproduct起動child processを唯一所有し、
その対象は固定OS browser helperだけとする。このhelperは調査対象content、調査対象path、authored value、
user-supplied command、environmentで選択したhandlerを受け取らず、自動起動を無効にした場合、非対応の場合、
または失敗した場合もsessionを利用可能に保つ。Boundary外byteを受理・公開しない。公開済みsymlinkを意図的に追わず、検出したpath changeの
byteをcommitしない。文書化したactive source-root/ancestor mutatorと、有効な`O_NOFOLLOW`を利用できない場合に限るactive
final-component mutatorはcurrent threat modelのscope外とする。
Global read前に明示的opt-inを要求する。リテラルcredentialを含む記述された完全なsourceと表示metadataは、
機密content警告後にmask/reveal controlなしで表示する。環境変数参照は解決も置換もしない。Inert textだけをrenderする。
表示するmetadata fieldとrelationship kindは、supported customization typeごとに維持管理するclosedなpresentation
allowlistへ限定する。未記載のauthored entryは完全なsource textからだけ利用可能とし、metadataまたはrelationshipとして
推論しない。WCAG 2.2
AAを満たし、英語・日本語文書を同等に保つ。Hard limitは1 fileあたり1 MiB、file byte合計32 MiB、
訪問entry 200,000件、customization file 2,000件、path segment 64、aliasは1 file 1,024件/generation 50,000件、
recognitionは1 file 36件/generation 8,000件、direct relationshipは1 file 1,000件/generation 100,000件、
candidate provenanceは1 recognition 2,000件/generation 100,000件、1 sourceあたりsource-level condition fact 256件、
1 assessmentあたりcondition fact 64件、diagnosticは1 file 128件、1 source 5,000件、1 generation 10,000件、
1 sessionあたりout-of-generation lifecycle diagnostic 1,024件（RepositoryとGlobal toolごとに1つの固定failure 4予約slot、session
sentinel 1 slot、通常detail 1,019件）、lifecycle record/ID insertion 1件2 KiB、固定diagnostic-control record用16 KiBを
予約したlifecycle-diagnostic sub-budget 2 MiB、分離したsession-control/progress sub-budget 1 MiB、session overlay合計3 MiB、proposed Global-root input 1件32 KiBと
escaped Global-root display 1件192 KiB、
parser depth 64、parser node 50,000、scalarごと64 KiB、metadata entryは1 recognition 512件/generation 100,000件、
1 recognitionあたり2,000 msとworker message 2 MiB、generationあたりparser message 32 MiB、parser worker最大2つと
old/young/stack 64/16/4 MiB、retained graph 64 MiB、neutral-overlay snapshot base 5 MiBとoverlay 3 MiBを含む
complete session snapshot 8 MiB、file detail 4 MiB、request body
64 KiB、scan deadline 30秒とする。
Authorized browserは1秒のliveness heartbeat、750 ms request timeout、2秒のmonotonic memory leaseを使い、
hidden/page lifecycle eventでは直ちにpurgeする。
Monaco diff highlightは各side最大20,000行
の場合だけ試み、明示的な5,000 ms computation timeoutを使い、1 MiBのread limitを超えるfileは渡さない。
Contractがpartial publicationを指定するscan accumulation limitに到達した場合だけ、bounded partial resultと
diagnosticを返す。Request、registry validation、per-item、editorの各limitは`ResourceLimits`とcontractに
定めた個別の動作に従う。Aggregate admissionはcomplete record保持前にdeterministic count/encoded-byte accountingを
適用し、API DTOをtruncateしない。Canonical accountingとHTTP deliveryは1つのdeterministic production JSON encoderと
同じaccount済みUTF-8 entity-body bufferを共有する。Typed derivationは1 closed `DerivationProgram` edge、exact static seed provenanceごとに
128 targetまで、deterministicなrule/field/source順で先頭128 distinct targetだけを扱い、129件目はtarget
access前に停止してcontract済みpartial resultをpublishする。1 Codex configのfallback basenameは16個かつ各128 UTF-8 byteまでとする。Generic relationshipはreadを
許可しない。Depthはprovenance単位で、bounded-derived provenanceはedgeをseedにできないが、同じfileの
独立static provenanceはeligibleなままとする。

Trusted package manifestはscan DTO limitとは別のfail-closed build/runtime limitを使う。Static manifestは
2 MiB、asset 4,096件、request pathごと512 UTF-8 byte、inline hash 32件、server manifestは1 MiB、`.mjs`
record 256件、1 file 16 MiB、listed合計64 MiBとする。両方ともunknown keyを拒否し、published packageでは
recursiveにexactなdeclared setを検証する。

**規模・scope**: ローカルuser 1人、起動時`cwd`をrootとするRepository sourceを正確に1つ、tool別の
opt-in Global sourceを0から3つ（Copilot、Claude、Codexごとに最大1つ）、Sourceごとにrootを正確に1つ、
一時session内最大2,000 item、comparison内file数は正確に2つ

## 憲章適合確認

*GATE: Phase 0調査前に合格し、Phase 1設計後に再確認済み。*

- [x] **根本原因を解く設計**: 1 packageとSourceごとに正確に1つのimmutable rootでlaunchとinspectionを
      解決し、workspace分割、repository picker、root discovery、static export、file watcher、
      speculativeなextension systemを追加しない。
- [x] **読みやすい実装**: `host`、`inspection/rules`、`recognizers`、`parsers`、`session`が
      別々のinvariantを所有する。Vendor behavior、Inspector matcher、runtime composition、official evidenceは
      4つのclosed registryに分け、vendor固有policyを分離し、shared behaviorは小さく明示的に保つ。
- [x] **完全な検証**: Unit、contract、integration、package、performance、end-to-end、error、
      boundary、accessibility、adversarial safety scenario、4つのuser story、公開SC-002 profile/status protocol、
      FR-039/SC-009のorigin-file-less Source Condition Factをtest layoutで扱う。
- [x] **文書の言語同等性**: Phase 0/1 artifactにはcanonical英語版と意味的に同等な`*.ja.md`を用意する。
      実装では両言語のuser/Contributor guide、全vendor/Repository/User/Global/surface表、official evidence、
      security limit、diagnosticを更新する。
- [x] **安全なboundary**: Read candidateを凍結し、local APIを認証し、機密content警告後にloopback sessionだけで
      記述された完全なcontentを送り、diagnosticとlogにsource valueを複製せず、
      Node.jsが公開するすべてのlinkまたは検証不能boundaryを拒否し、検出済みrace後のbyteを破棄し、
      すべてのscan次元を制限して、非原子的・platform-unobservableな残存制約を記録する。
      憲章のsecret-safe display要件は意図しない漏えいを防ぐことで満たす。Contentは明示acknowledgement後に
      起動元のcapability認証済みbrowserだけで不活性かつsession内限定で表示し、diagnostic/logへ複製せず、
      別machineへ送信しない。明示的に要求されたliteral sourceをmasking/redactionで変更することはしない。
- [x] **参加しやすさ**: 単一package setup、再現可能なpinned tooling、客観的期待結果、keyboard-first
      workflow、actionable error、自動・manual accessibility gateで参加の障壁を抑える。Maintainer-owned release studyは
      必要性、accountable owner、funding、support、privacy、accessibility、rerun policyを公開し、通常のcontributorへ
      recruitmentまたはreview義務を移さない。

### 設計後の再確認

Data modelはphysical file、candidate provenance、documentation status、runtime applicability factを分離する。
HTTP contractは警告gate後の明示的なdetail/comparison requestにだけ記述された完全なsourceを返し、masking/reveal
workflowを持たず、環境変数参照を解決せず、維持管理するclosedなpresentation allowlistに含まれるmetadata fieldと
relationship kindだけをemitする。Matcher contractは明示的staticまたはvendor-specific one-edge
derived candidateだけを許可し、relationship、component、vendor locator、excluded inputはread boundaryを
拡張できない。Quickstartは全stable behavior/rule/strategy/source ID、official-source drift review、Repositoryの
`./` grammarとbare `**/` rejection、必須品質gate、4つのend-to-end storyを扱う。Monacoはclient-only、
same-origin、bounded、model lifetime scopeとし、固有diff engineでdependency重複を避け、exact authored metadata比較を
明示的に保つ。Project-owned browser launcherによりshellを含む`open` packageを除去し、許可する唯一のproduct child
processを、調査対象content/path、authored value、user command、environment-selected handlerを受け取らない固定startup
OS helperへ限定する。Package gateはroot tarballと
exactなinstall済みproduction closureのJavaScript-only application code、lifecycle/build/download path、selector、
native/binary artifactをauditする。Third-party development/test toolingはpublished FR-038 boundary外のままとする。
Node.js-onlyの検証制約は、active mutator/platformの残存riskと、憲章が求める将来の
public Node.js filesystem APIまたはOS強制snapshot/sandboxという具体的解消pathとともに記録する。Passing testによるproofや
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
├── validation.md                     # Release gate実行時に作成
├── validation.ja.md                  # validation.mdと同時に作成
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
├── tasks.md                         # 後で /speckit-tasks が作成
└── tasks.ja.md                      # tasks.mdと同時に作成
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
│   ├── liveness.ts
│   ├── monaco.ts
│   └── session.ts
├── pages/
│   ├── index.vue
│   ├── compare.vue
│   ├── global-consent.vue
│   └── files/[id].vue
├── locales/
│   ├── en.ts
│   └── ja.ts
└── styles/

src/
├── cli.ts
├── launch-browser.ts
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
│   └── parsers/
│       ├── json.ts
│       ├── markdown.ts
│       ├── pool.ts
│       ├── toml.ts
│       ├── worker.ts
│       └── yaml.ts
└── session/
    ├── scan-generation.ts
    ├── stale-failures.ts
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
├── usability/
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
├── build-production-graph.mjs
├── verify-package-files.mjs
└── check-official-sources.ts

.github/workflows/
├── ci.yml
└── release.yml

bin.mjs
package.json
pnpm-lock.yaml
nuxt.config.ts
tsconfig.json
eslint.config.js
tsdown.config.ts
playwright.config.ts
vitest.config.ts
.gitignore
```

**構成判断**: UIとCLIを同時にrelease/version管理するため、単一packageの`app`/`src`/`shared`分離を
使用する。NuxtはSPA（`ssr: false`）とし、static Nitro preset、`app.baseURL: '/'`、
`app.buildAssetsDir: '/_nuxt/'`、CDN URLなし、明示的importを使い、component auto-discoveryを無効にする。
これにより全nested client routeが同じroot-absolute same-origin asset URLをresolveする。Executableな
`bin.mjs`はBOMなし、LF終端の正確な先頭行`#!/usr/bin/env node`で始まる。Node.js built-inを使い、packed
`package.json`、両manifest、全listed static/server hashを検証してからvalidated `dist/cli.mjs`をdynamic importし、
check完了前にhostをbindさせない。

`app/locales/en.ts`と`app/locales/ja.ts`をuser-visible UI copyの明示ownerとし、componentはstable message keyを
使用して英日UI parityをad hocに追加しない。`validation.md`と`validation.ja.md`はfinal SC evidenceを記録し、
意味的に同等に保つ。`.github/workflows/`でCI/releaseのownershipを明示し、documentation parity、package
exact-set、release gateを含める。

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

`package.json`がrunnable command graphを所有する。`build` scriptは固定clean step、Nuxt client build、tsdownの
`cli`/`parser-worker` build、両manifest assembler、recursive exact-set verifierを順に実行する。
`check:official-sources`だけをnetwork有効のevidence-drift commandとして文書化する。`src/cli.ts`とparser-worker
entry、`tsdown.config.ts`、assembly script、これらpackage scriptはfoundation prerequisiteであり、存在する前に
build、package、manifest quality gateを配置しない。
Production `dependencies`はexact-version leaf setの`gunshi`、`yaml`、`jsonc-parser`、`smol-toml`だけとし、`open`を
全dependency sectionとproduction lock closureから除外する。Nuxt/Vue/Vite/tsdown、Monaco、Playwright、その他
build/test toolingはdevelopment-onlyとし、assemble済みproduct outputをclosed manifestで検証する。

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

Package gateはroot tarballだけでなく全project/dependency tarball payloadとinstall済みproduction graphもauditする。
最初にlifecycle scriptをdisabled、development dependencyをomitしてinstallし、exact graphをlockfile/package manifestと
比較して、`preinstall`/`install`/`postinstall`またはbuild requirement、`os`/`cpu`/`libc` selector、bundled/optional
native package、native/binary/Wasm extensionまたはELF/Mach-O/PE magic、`binding.gyp`、Rust/C/C++ source、
`prebuilds`、package-owned non-Node shebang、shell helper、executable non-JavaScript payloadを拒否する。その後、同じ
verified cacheからnetwork-disabledなnormal lifecycle installを行う。Package-manager生成`node_modules/.bin`
symlinkとWindows `.cmd`/`.ps1` shimだけをpayload外例外とし、exact nameはaudit済み`package.json.bin`由来、symlink
target/generated bodyは宣言済みaudit済みNode JavaScript targetへのdispatchとargv forwardだけを行い、extra logic、
environment/configuration input、unexpected shimを許可しない。Cross-OS production-graph digestはpackage name/version/
integrityとpackage-payload digestを対象としgenerated `.bin` artifactを除外するが、OS固有shim auditを併用する。New
production dependency/artifactは明示reviewまでfailする。

## 実装boundary

- `src/inspection/safe-fs.ts`だけがenabled inspection sourceをenumerate/readできる。公開されたlexical rootの
  全componentを`lstat`で検査してlinkを拒否し、accepted rootを`realpath`でresolveし、directoryであることを
  要求して上限付きbigint identity/metadataを記録し、internal `InspectionRootContext`を作る。Typed matcherからcompileした
  immutable versioned `TraversalPlan`だけをinterpretする。Repository planは明示されたbounded descendant programを使える。
  Global planはhome rootをenumerateせず、exact targetではfixed ancestor/targetだけを`lstat`し、Copilotのfixed
  instructions subtreeではそのsubtreeと許可descendantだけを`opendir`する。隣接Global pathへのI/Oは0とする。Opened
  directoryごとにdescend前にcomplete bounded sibling bufferを収集し、path operation用exact `Dirent.name` raw segmentと、
  matching/sort/DTO path用NFC classification segmentを分ける。異なるraw sibling spellingが1 NFC keyになる場合はcollision
  group全体をdescend/readせずfail closedにし、collisionのないNFD-only spellingはraw segmentでreadしてNFC表示する。
  Link、非directory traversal object、検出可能なdevice
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
  checkはpath check間にrootまたはancestorを差し替えるactive adversarial process、ならびに有効な`O_NOFOLLOW`を
  利用できないNode.js/platform combinationでfinal entryを差し替えるprocessに対するkernel-enforced containmentを
  証明できない。またNodeだけでは全Windows reparse tagや全mount transitionをportableに識別できず、
  same-device bind mountとNodeが報告しないreparse metadataはtest proof外の明示的なplatform limitationとして残る。
  このreleaseのrace threat modelは通常の同時編集、検出可能な全change、有効な`O_NOFOLLOW`によるfinal-component
  defenseを対象とし、検出した全caseをfail closedにする。Active source-root/ancestor replacementと、有効な
  `O_NOFOLLOW`を利用できない場合だけのfinal-component replacementを明示的にscope外とする。Test resultをより強い
  containmentの証明と記述してはならない。具体的解消pathは、将来のNode handle-relative APIが利用可能になった時点で採用するか、
  threat model拡張前にscanをOS強制のread-only snapshot/sandbox内へ置くことである。
- 4つのregistryは1つのreference graphとしてvalidateするが、与えるauthorityは異なる。Vendor behavior recordは
  upstream lookupを記述するだけでI/Oを認可せず、static/bounded-derived Inspector ruleだけがreadを認可し、
  runtime strategyはorder、condition、relationship-only edgeをprojectし、official source recordはevidenceを
  提供するだけでruleを自動変更しない。全Repository matcherはBase、Relative selector、Expansionを分離し、
  正確なlaunch rootから`./`で表記し、bare `**/`を拒否する。明示的な`./**/`は下向きInspector inventoryだけを
  意味する。CopilotのVS Code、CLI、Cloud behaviorと、各vendorのRepository対User/Global behaviorは、推測した
  traversalを共有せず独立してaddress可能に保つ。全Repository selectorをclosedかつcanonical round-tripする
  segment programへcompileする。Literal、one-segment、最大2つの非隣接recursive-directory tokenで、general glob
  engineを使わずcompositeなdescendant/direct-child/subtree ruleを表す。Compilerはimmutable `TraversalPlan`もemitし、
  Global preview patternを同じrecordから作ってconsent digestへschema、closed selection policy、canonical programをbindする。
  Content依存のscheduler branchはexactな`codex-global-first-non-empty` policyだけとする。これは
  `AGENTS.override.md`を安全にprobeし、non-emptyならshort-circuitし、absentまたは安全にemptyと確定した場合だけ
  `AGENTS.md`へ進む。Present candidateを安全に分類できなければfallbackせずfail closedし、publishするCodex Global
  instruction fileは最大1件とする。
- Static matcherとclosed `DerivationProgram` unionのexact initial 5 mappingだけをread authorityとする。Derivation schemaは
  static seed provenance/rule/kind、closed declaration field/syntax、seed-relativeまたはsource-root base、固定placement/
  suffix、fan-outをpinし、callback、arbitrary path join、free-form expression、glob、recursive derivationを表現不能にする。
  Derived segmentは
  host-independent NFC/Windows-special grammarを通し、collisionのないexact enumerated `ScanEntryTicket` 1件へresolveできた
  場合だけ読み、ADS、device、trailing-dot/space、ambiguousなcase/normalization alias、8.3 aliasはcandidate
  open前に拒否する。UniqueなNFD raw entryはそのNFC classification record 1件を通じてeligibleのままとする。
  Vendor behavior registryがその他の
  supported User customizationを記録する場合も、FR-015からFR-018によりGlobal readは3 instruction setだけに
  制限し続ける。
- Tool recognizerは`(fileId, tool, kind)`ごとにexact `ToolRecognition` 1件を付け、closed tool/kind順でsortする。
  Compatible admissionはprovenanceをmergeし、incompatible parsed meaningはそのrecognitionのall-or-nothing extractionだけを
  failする。Recognitionは1 physical fileを1回だけ読み、受理済みかつ上限内の独立candidate provenanceをすべて保持し、overflow時は
  contract済みpartial resultとdiagnosticをpublishする。Declarationをinert dataとして
  parseしてよいが、import、evaluate、remote content解決、relationship targetのreadは禁止する。Context
  extractionが合成できるのは独立受理済みfile間または固定relationship-only defaultへのclosedな
  vendor-documented edgeだけで、non-file/excluded contextはsource-level condition factにする。固定defaultを
  authored targetとしてlabel/serializeしない。Public provenance scope/orderはSource-relative pathとstable comparison keyを
  持つclosed `ScopeDescriptor`/`OrderDescriptor` unionとし、unknown orderはnullとcondition factで表す。Derived provenanceは
  exact `seedProvenanceId`を指定し、hard-link alias seedをcollapseしない。
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
  既知fieldのtree extraction、TOMLはbounded lexical-span extractionと値を実行しないsemantic normalization、
  Markdown/frontmatterはHTML renderを行わないextractとする。JSONC tree range、YAML CST/source-token range、
  TOML lexical span、Markdown/import spanはdecoded sourceへround-tripしなければならない。Allowlist field occurrence
  ごとにsource順の正確な`authoredLiteral` sliceと別のinternal typed semantic valueを出し、受理したduplicate occurrenceを
  分離したまま保つ。`SourceTextRange` offsetはECMAScript UTF-16 code unitで、`String.prototype.slice`によりliteralを
  再現し、UTF-8 scalar-byte limitとは分離する。Semantic valueはboundedかつJSON-safeなdiscriminated unionとし、integer、float、date/time
  payloadはtyped canonical stringを使ってJavaScript precisionやparser固有objectによる変化を防ぐ。
  Metadata/authored relationshipの表示・比較にはexact sliceだけ、typed classification、target
  normalization、derivationにはsemantic valueだけを使う。Registry定義の固定relationship defaultはauthored textをnull、
  originを明示`documented-default`とする。Metadata、relationship、derivation projectionは1 exact occurrence/rangeを共有でき、
  distinct origin occurrence間のpartial/nested/crossing/identical overlapだけをinvalidとする。最大2 parser `Worker` threadで
  sync parser workをhost event loopから隔離し、V8のold/young/stack limitを64/16/4 MiB、recognitionごとのtimeoutを
  2,000 ms、accepted worker-message boundを2 MiB、generation合計を32 MiBとし、超過時にworkerをkill/replaceする。
  Bounded traversalはdepth 64、50,000 node、64 KiB scalar、1 recognition 512 metadata entryとaggregate graph/response
  limitをenforceし、scalar boundはUTF-8 literal sliceとsemantic valueへ別々に適用する。Missing/ambiguous/illegal overlap/non-round-tripping spanまたは
  parser/resource failureでは対象recognitionのextraction result全体（relationship/derivation declarationを含む）を
  破棄し、記述された完全なsourceと成功した別recognitionは利用可能に保つ。Parser/presentation stepはauthored sliceを
  decoded valueで置換せず、環境変数参照の解決、credential detection、masking、redactionを行わない。
- Node hostは`node:http`、小さなstatic MIME table、URL fragmentで渡すrandom 256-bit capability、
  厳密なHost/Origin check、CORSなし、API responseの`Cache-Control: no-store`、restrictive CSPを使う。
  CLI import前にproject-owned `bin.mjs`がpacked `engines.node` stringが正確に`^24.11.0 || ^26.0.0`であること、
  `process.versions.node`がその展開済みrange内であること、両closed manifest、全listed static/server hashを検証する。
  Range外runtimeは固定されたactionable errorで終了し、それ以前にhostをbindさせない。CSPはsame-origin scriptとNuxt
  executable inline bootstrapの正確なbuild-recorded SHA-256だけを許可し、inline executable attribute、eval、
  nonce、external/blob workerを禁止し、inline style permissionはMonaco layout/theme outputだけに残す。
  API payloadはcaller指定filesystem pathではなくIDを使用する。Capabilityはmemory-onlyで、fragment削除後の
  refreshはAPI callを行わず、process-lifetimeの表示済みlaunch URLを開き直すよう案内する。固定
  client-route grammarとbuild-manifest assetだけがinert SPA shellを受け取る。Global consentはI/Oなしの
  lexical previewとsession-keyed digestを使う。Proposed rootが32 KiB UTF-8を超えるかbounded escaped displayが
  192 KiBを超える場合は`oversized`かつ`displayRoot: null`とし、normalize/authorizeせずdigestをそのnull/stateへ
  bindする。In-limit entryはinternal exact raw `lexicalRoot`も保持し、digestはraw value、escaped display、immutable
  traversal-plan schema/selection-policy/programをbindする。Enableは保存済みraw valueだけを使い、`displayRoot`を逆変換せずenvironmentを
  再読込しない。Consent後のcanonical alias差異は表示boundaryを暗黙変更せずenumeration前に拒否する。
- `src/launch-browser.ts`はlaunch前にclosed-grammar capability URLを1回表示し、loopback/port/
  43-character-base64url formを再検証して、`node:child_process.spawn`を`shell: false`、ignored stdio、固定argv、
  `unref()`だけで使う。Closed platform mapはmacOSの`/usr/bin/open`とLinuxのOS提供`/usr/bin/xdg-open`だけとする。
  Portable Node APIから独立したtrusted helper boundaryを取得できないため、このreleaseではWindowsとその他platformの
  automatic openを意図的にskipし、固定manual-URL warningを出してserverを継続する。`--no-open`ではchildを作らず、
  helper failureでも表示済みURLを残してserverを継続する。Child environmentのexact platform allowlistはmacOSが`HOME`、
  `TMPDIR`、`LANG`、`LC_ALL`、Linuxが`HOME`、`DISPLAY`、`WAYLAND_DISPLAY`、`XDG_CURRENT_DESKTOP`、`DESKTOP_SESSION`、
  `DBUS_SESSION_BUS_ADDRESS`、`XDG_RUNTIME_DIR`、`LANG`、`LC_ALL`とする。`BROWSER`、`NODE_OPTIONS`、`NODE_PATH`、その他environment value、inspected value、
  extra argvを除外する。OS helperはlisted desktop/session ambient valueをconsumeできるが、Inspectorはそこからhandlerを
  選ばない。HelperはnavigationをOS default handlerへ委譲するだけでbrowser family/versionを選択・検証せず、spawn成功を
  compatibility evidenceとしない。そのhandlerがrelease-certification baseline外の場合、表示済みURLと`--no-open`によって
  certified browserでmanual openできる。Package-owned/user-supplied shell helper、shell command string、packaged platform helperは禁止する。固定OS提供
  `xdg-open`はpackage payload外で、引き続き`shell: false`でinvokeする。Terminalのlaunch line 1件だけを意図したcapability表示とし、
  operational logへcopyしない。
- Browserはinert DTOを受け取り、完全なsourceは機密content警告後の明示的なdetail/comparison requestでだけ受け取る。
  Vue componentと`monaco-editor`のESM buildで
  表示し、`v-html`を使用しない。Single-file source modelとsource comparisonの両側をread-onlyとし、
  opaqueなin-memory URIを使い、`readOnly`、`domReadOnly`、`originalEditable: false`、`links: false`、
  `renderMarginRevertIcon: false`を設定し、環境変数参照を解決せず記述された完全なtextを保持する。`accessibilitySupport`は`auto`、
  `accessibilityVerbose`はenabledとし、各viewに`ariaLabel`を付ける。
  上限付きliteral source comparisonはMonaco diff editorが所有する。Recognition metadataは
  `(tool, kind, fieldId, occurrence)`で対応付けてexact `authoredLiteral`を比較・Vue表示し、typed valueへ置換またはeditorへ
  serializeしない。Editorはclient-onlyとし、file/compare routeで
  lazy-loadする。Nuxt/Viteは明示的にimportしたeditor workerをsame-origin static assetとして出力し、
  未使用language-service worker、CDN asset、external worker、blob workerを許可しない。Editor/model
  instanceとsubscriptionはroute close、selection replacement、source disable、generation replacement時に
  個別にdisposeする。Accessible diff viewer、意味のあるARIA label、keyboard navigation、narrow-screen
  inline viewを有効に保ち、browser testとmanual checkの両方で検証する。Line capまたはcomputation
  timeout時も記述された完全なside-by-side sourceを表示し、actionable diagnosticを示す。
  `app/composables/liveness.ts`は唯一のclient purge pathと軽量なcapability保護
  `/api/v1/session/liveness` heartbeatを所有する。Visible pageで1秒ごと、request timeout 750 ms、monotonicな
  browser-memory lease 2秒とする。Heartbeat failure/mismatch、lease expiry、hidden/page lifecycle event、process
  lossではeditor model/worker/subscriptionをdisposeし、全session DTO/DOM/detail/comparison/warning stateをclearして
  requestをabortし、`clientDataEpoch`をincrementしてlate responseによるcontent復活を防ぐ。全SessionSnapshot/FileDetail
  requestはepoch、current generation、該当時file ID、exact request tokenをcaptureする。Older session generationは無視し、
  newer generation採用前にepochをincrementして全detail/editor/comparison stateをabort/disposeする。Equal generationは
  current tokenを要求し、file detailはepoch/generationがcurrentのままでreadable fileが存在する場合だけ採用する。Browser storage、service
  worker、response cacheへinspected contentを永続化しない。Capabilityはhidden-page purgeを越えてmemory-onlyで
  保持し、visibleへ戻るとretained capabilityでfresh session snapshotを認証する。SPAはpurge済みIDを保持・比較せず、
  返された`sessionId`をnew liveness baselineとして採用し、boundedかつcontrol-onlyな`globalControl` recovery viewだけを
  保持する。Activeならそのviewからdisableを直ちに利用でき、matching frozen consent previewを取得・検証してからretry
  controlを再構築する。Recovery viewは常に明示Resume inspection actionを提示し、matching sessionを再取得してdefault
  stateのfresh inventory summaryを構築するが、old detail、comparison、editor、selection、filter、authored source、
  acknowledgementを復元しない。後のdetail/comparison openにはnew acknowledgementを要求する。Authentication failureでは
  ended stateと表示済みURLを開き直すnext stepを維持する。
- 単一coordinatorがcancellable `GlobalEnableOperation`のvalidation/admission、Repository scan、tool別Global scan、
  Global-disable transactionをserializeする。1つのconsent
  recordで文書化された3つのtool-home rootをpreviewし、confirmed toolごとにinternal `GlobalToolControl`を1つ所有する。
  各controlはadmit済みroot contextと未公開Source/boundary IDをscan working set外で所有するため、初回scan failureで
  working set全体を破棄してもretry/disable authorityを失わない。Initial enable/retryはstate mutation前に全tool set用
  coordinator capacityをreserveする。Rejectはown shareをreleaseし、accepted workはown shareをqueued scanへtransferし、
  complete/failure/cancelでreleaseする。Reserve failureはstate変更なしのall-or-none `503`とする。Validation/job transfer完了後、
  coordinator lock下の最後のoperation-ID/epoch/state checkでenable response dispositionをatomicに選択する。Operationが
  先なら`202`をcommitしてcapacity leaseをcloseし直ちにunregisterする。Disable barrierが先なら`409`をcommitしてdrainingへ
  入り、operation-local resourceとuntransferred capacityのrelease後だけclose/unregisterし、late mutation/leakを生じさせない。
  Consent後validationはrootを0〜3個acceptし、accepted
  rootをprovisionalにscanする。Completeまたは
  contract済みpartial commitは、正確に1 toolで識別され1 rootへboundされた独立Global Sourceを作り、そのcontrolの
  予約済みtool failure diagnosticをclearする。Copilot、Claude、Codexを1つのlogical Sourceへ結合しない。全件reject
  requestはactive consent/controlを保持してnew Source/scan jobなしの`active-no-job`を返す。Initial activationでは
  Global Sourceが0個となり、retryでは既存Sourceを保持する。Sessionの`globalControl` DTOはroot authorityを公開せず
  confirmed/pending/retryable toolを識別する。`pendingTools`にはrunning enable/retry operationのvalidation/admissionが
  所有する全toolと、そのqueued/running initial scanを含め、`unvalidated` toolは常にpendingとする。これらworkが1件でも
  pendingの間、retryable toolは情報表示だけとし、
  `pendingTools`がemptyになった後だけretryを提示する一方、disableは直ちに利用できる。Consent-preview routeはclient purge後も
  frozen active previewを返す。通常scanはFIFO、Global disableは
  priority security barrierとし、受理時に`globalControl.state: disabling`、empty pending/retry array、increment済みcommand
  epochとしてnew Global-enable/Global-rescan commandを拒否する。Active uncommitted transactionをabort/discardし、enable
  validation/admissionをabort/drainして最後のqueued Global work cancellation sweep後、次に
  全Global Sourceのremovalをcommitし、中断したRepository commandはその後ろへ1回だけrequeueする。各scan jobはその時点の
  session-wide active generationから始め、未scanの全Sourceを残りのshared file/byte/diagnostic budget内でcarry forwardし、
  replacementを別に構築する。Completeまたはcontractで許可されたbounded partial resultだけが次generationをcommitする。
  正常source scanはそのSourceのsession所有stale-failure entryと予約済みdiagnosticだけをclearし、別Sourceの両方をcarryして、generation
  所有graphをrekeyし古いfile ID、detail DTO、comparison selectionをinvalidateする。同じcoordinator lockで全
  SessionSnapshot/FileDetail envelopeのgeneration/payloadをlinearizeし、後のnetwork deliveryでmix/relabelさせない。
  Global disableは除去Global Sourceの
  entryと予約済みdiagnosticをclearするがRepositoryのentryとdiagnosticを保持する。Fatal attemptはuncommitted resultを0件publishし、最後にcommitした
  generationとIDを維持する。明示rescanならそのSourceのstale-failure entryと予約済みactionable diagnosticを作成または
  置換し、別Sourceのfailureを削除しない。自動の初回Repository scanのfatal failureではbootstrap generation 0をcurrentの
  ままにする。初回Global enableのfatal failureではmissing tool用の`StaleSourceFailure` entryを追加せず、
  既存entryとそこから派生するsnapshot stateをすべて保持する。どちらもkey別の予約済みfailure diagnosticでnew inventoryを
  commitしなかったことを報告する。
  FatalなGlobal enable/rescanはexact consent、tool別`GlobalToolControl` record、既存のtool別
  Global graphを保持し、明示retry/disableを可能にする。Global disableはcontrol所有の予約済みtool lifecycle diagnosticを削除し、
  root contextをすべてclose/removeして全control、consent record、frozen previewを削除する。
  Generation 0はfile/diagnosticを持たないcommit済みzero-I/O bootstrap
  snapshotとし、初回fatal attemptでもlegalなretained current baseを持つ。明示Repository rescanとenabled Global rescanは同じ
  queue ruleを使う。Global disableの再要求は
  既存barrierへjoinし、tool固有Global Source/graph、active consent record、retained admitted Global root context、open Global
  inspection `FileHandle`、running/queued Global scan/enable commandが何もない場合は、
  Repository workの有無にかかわらず即時no-opとする。

## 複雑さの追跡

Pure Node.jsというproduct制約は、bounded read、検出したraceのfail-closed、source valueを複製しない
diagnostic/logging、review要件を免除せず、
文書化した残存race riskを導入する。避けられない実装costを1件明示する。

| 複雑さ | 必要な理由 | 不採用とした単純案 |
|---|---|---|
| 上限付き`lstat`/`realpath`/`open`/`FileHandle.stat`の反復検証とsame-handle read | 通常の同時変更をbyte受理前に検出し、identity、metadata、canonical containmentが変化したresultを破棄する | 直接の`readFile(path)`やglob-only traversalにはgeneration-bound authorization、identity一致、post-read race detectionがない |

**残存riskと解消path**: Node.jsではpath validationと`open`が1つのatomic kernel operationではないため、十分な
権限を持つactive mutatorが検出不能なroot/ancestor replacement race、または有効な`O_NOFOLLOW`を利用できない場合の
final-entry replacement raceに勝つ可能性がある。承認時はそのcaseだけをscope外として扱い、current checkをcontainment
proofと呼んではならない。Threat modelを拡張するには、atomicなbeneath/no-follow
semanticsを持つ将来のNode directory-relative API、またはscan rootを囲むOS強制のread-only snapshot/sandboxを
導入し、security reviewとadversarial test planを更新する必要がある。
