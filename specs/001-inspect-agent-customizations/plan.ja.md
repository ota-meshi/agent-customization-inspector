# 実装計画: エージェントカスタマイズの調査

[English](plan.md)

**ブランチ**: `dev` | **日付**: 2026-07-20 | **仕様**: [spec.ja.md](spec.ja.md)

**入力**: `specs/001-inspect-agent-customizations/spec.ja.md` の機能仕様

## 概要

`npx`で起動し、GitHub Copilot、Claude Code、OpenAI Codexのallowlist対象
カスタマイズファイルを、有効化せずに一覧表示・比較する読み取り専用ローカルInspectorを構築する。
1つの凝集したpackageとして、Nuxt client SPAを`src/app/`、Node CLIとローカルinspection hostを`src/server/`、
serializable contractを`src/shared/`に置き、1つの公開`dist/`にまとめ、その`dist/cli.mjs`を`package.json.bin`の直接targetとする。
固定clean stepはpackage所有の以前の`.output/`、`dist/` treeだけを除去する。`nuxt build`は
静的browser appを`dist/public`へ直接出力し、tsdownはCLI bundleを`dist/`へ直接出力する。
`verify:package` gateは正確に2つのpackaged entry point（`dist/public/index.html`、`dist/cli.mjs`）
を要求する。Staging copy step、static-asset manifest、CSP-hash記録stepは
存在しない。Inspectorはuserがすでに信頼している
workspace内で動作する。調査対象のカスタマイズファイルをadversaryとしてmodel化せず、調査対象sourceへの
filesystem I/Oはすべて`src/server/inspection/` directory配下だけに置く。そこでは固定inspection path allowlistに対する
通常の再帰的`node:fs/promises` walkを行い、使用できないentryにはfile別diagnosticを付ける。Browserは記述された完全な
sourceをread-only Monaco editorで表示し、source比較にはMonaco diff editorを使う。Tool recognitionは
toolごとに比較し、宣言済みmetadataは1回だけ比較する — sideごとに1つのcanonical documentへ
serializeし、それをdiff editorがsourceの傍らにmountする。kind/fieldで対応付けてVue
componentで描画するのではない。その背後のparseは、Markdown系kindについては`(file, kind)`
ごと、custom-agent kindについては`(file, tool)`ごとに1回であり、後者の分割はadmitした
rule自身の読み取りである。

Root selectionは単純かつlexicalとする。CLIは`process.cwd()`を正確に1回captureし、`--root <path>`を
acceptする（反復指定はparserのlast valueへ解決）。Absolute optionはそのまま保持し、relative optionはcapture済みinvocation directoryに対して
resolveし、その結果をselected Repository rootとする。CLIは`process.chdir()`を呼ばない。明示的にemptyな
`--root` valueは、session作成またはbrowser起動より前に固定actionableかつsource-value-freeなstartup errorでfailする。
Valueの欠落は同じboundaryでGunshiのtyped argument validationによりrejectされ、productはparser所有のcheckを重複実装しない。
Repository sequenceのbootstrap generation 0は、stableな`sourceId`とescape済みroot labelを持つ1つの
Repository Sourceをsynchronousに含む。

Security boundaryを厳密にする。Browserはfilesystemを読まず、Node hostは
カスタマイズファイルをdynamic importせず、初期リリースにはstatic export、MCP、remote host、
自動watch modeを設けない。Local hostにはeslint/config-inspectorと同じ基盤であるdevframe local-tool
frameworkをauthentication無効で採用する。devframeはbuild済みSPAを`cli.distDir`（`dist/public`）から
配信し、devframeのRPC session API channelを通じてinert DTOを送り、port選択とhost bindingを所有する。
起動時のbrowser openはproductが所有する — macOSのChromium tab再利用を`open` packageのhelperの
前段に置く（research.md § 3）— 形で、devframeのbundled openerは無効化される。
保護はloopback限定の`localhost` bindだけであり、per-session token、product所有のOrigin check、
hand-writtenなrouterは存在しない。認証なしloopback hostの残存exposure（他のlocal processと、
DNS rebinding経由の悪意あるweb page）は、Constitution § Quality and Safety Standardsが記録するdocumented limitationとする。
Session APIは明示的なdetail requestにだけ、完全な
authored sourceとdeclared authored valueを含む`FileDetail`を返す。Bundled browserはfileまたはcomparisonを
1つずつ要求する。何が含まれ得るかについての注意書きも、その前に立つ確認stepも持たない。loopback bindingが
境界のすべてであり、どちらも何も守らないからである。環境変数参照はリテラルtextのまま保持し、process
environmentのlookupまたは置換を認可しない。
明示的scanは凍結したinspection path allowlistを使用し、agentが同じpathをloadするのと同じように
symbolic linkを透過的にreadし（link先がmissingまたはunreadableなlinkはそのfileのfile別diagnosticになる）、
inertなbest-effort parserを
使用してowning sequenceのin-memory generationをatomicに置換する — RepositoryとGlobalのinspectionはlifecycleが
独立しているため、それぞれ独立したgeneration sequenceを保持する — ため、そのsequenceの古いgeneration所有の
detail/comparisonは正常rescanを越えて残らず、他方のsequenceのcommit済みviewは有効なままとする。Global enableは
Repository stateに触れずにGlobal sequenceをgeneration 1で作成し、Global disableは何もcommitせずにその
sequenceを破棄する。Fatal rescanはuncommitted resultを1件もpublishせず、最後にcommitしたsnapshotを、failed requestのerrorまたは
決定的なlifecycle diagnosticを示すSource別stale-failure entry付きで、そのSourceがrefreshまたは除去されるまで保持する。

Customization discoveryは、文書化済みvendor lookup behavior（`behaviorId`）、Inspector matcher/read policy
（`ruleId`）、runtime composition strategy（`strategyId`）という3つのcontract-versioned registryとして
保守する。各recordは、それを確立するofficial pageを`sourceId`をkeyとする自身の`evidence`配列で引用し、
専用のregistryは持たない。
共通allowlist contractはmatcher grammarとsafety invariant、Copilot・Claude・Codexの個別contractはvendor
behaviorとtool固有rule、composition contractはorderとrelationship-only rule、source registryは正確な公式
URL/section evidenceとreview metadataを所有する。RepositoryとUser/Global behaviorは別表とし、Copilotの
VS Code、CLI、Cloud surfaceを1つのlookup modelへcollapseしない。
VS Code 1.118以降については、Copilot contractが既存のexact `./.vscode/mcp.json` ruleと並べてexactな
root `./.mcp.json` Inspector ruleを追加する。Version付きrelease noteは新しいroot pathとmost-specific
same-name ruleを確立する一方、current guideは`.vscode/mcp.json`とUser configurationを網羅的locationとして
提示し続ける。そのためbehavior/strategyは`conflict`を保持し、root provenanceはpath/surface-onlyで
VS Code所有extractor fieldを追加せず、schemaとtotal orderをunknownのままにする。CLI descendant ruleが
同じphysical root fileをすでにadmitするため、両compatible provenanceは1つの`(file, copilot, MCP)`
recognitionとそのfileの1回のreadへmergeする。

Userへ公開するinventory/API filesystem locatorのうち、inventory済みcustomization fileまたはowning Source内で
安全にnormalizeされたtargetを識別するものはすべて、そのSourceの1つのrootから計算したSource-relative Pathとする。
これにはfile path、provenance path、non-nullのnormalized relationship target、comparison/filter label、
file-scoped Diagnostic locationを含む。Repository Sourceの場合だけrepository-relativeであり、各Global Sourceは
自身のadmit済みtool-home rootを使い、別Sourceとpath namespaceを共有しない。Authored literalは別のsurfaceで、
記述どおり正確に表示する。

Root labelは別のpresentation surfaceとする。Enabled `SourceBoundary.displayRoot`はそのSource rootのone-way
escaped presentationである。`GlobalConsentPreview.entries[].displayRoot`はowning Sourceがまだ存在しないadmission前に
originを持つproposed lexical rootのone-way escaped presentationで、absoluteまたはinvalidになり得る。どちらも
`SourceRelativePath`ではなく、inventory itemを識別せず、read authorityを与えない。

全Inspector Repository matcherは選択されたRepository rootを明示baseとし、globのように見えるrendered string
形式を持たないtyped segment array programとしてauthorする。先頭の`ANY_DIRECTORIES` segmentが意味するのは、
vendorがworked-fileまたはdescendant anchorを通じてあらゆる深さで文書化しているlocationに対する下向き
Inspector descendant inventoryだけであり、vendor traversalではない。Runtime cwd chain上でしか文書化されて
いないlocationはselected rootだけでadmitする。Static
candidate、vendor-specific one-edge derivation、relationship-only reference、exclusionを分離する。File存在と
product surface、runtime root/`cwd`、target match、trust、enablement、selection、installation、managed policy、
external runtime factを別に保ち、inventoryをeffective agent configurationに見せない。Originating fileを
持たないhosted/runtime inputはスコープ外とする。製品は見つけたカスタマイズファイルを報告し、
どのfileも起点にしないbehaviorについては何も述べない。Closed context
relationshipは、agentが参照し得る独立inventory済みinstruction、rule、skill、MCP declaration、memory scopeを
path追跡なしで示す。Codex instruction-byte limitとexcluded non-file inputは明示condition factのままとする。

## 技術コンテキスト

**言語・バージョン**: 開発・build基準はactive LTSのNode.js、package runtime compatibility contractは
`^24.11.0 || ^26.0.0`、正確には`>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`、TypeScript 6.0.3、
Vue 3.5.39とする。6つのNode/OS floor jobはcompatibleな全minor/patch releaseを列挙するものではなく、
宣言した2つの下限をcertifyする。各floor未満、Node 25、将来のmajorはcontract外とする。

**主要依存関係**: Nuxt 4.4.8、Vue Router 5.2.0、tsdown 0.22.8、Vite 7.3.6
（Nuxtと互換性のある最新release）、`devframe` 0.7.5（pre-1.0 local-tool host framework）、
`gunshi` 0.37.0、`open` 11.0.1、`yaml` 2.9.0、
`strip-json-comments` 5.0.3、`smol-toml` 1.7.0、`h3` 2.0.1-rc.22、`monaco-editor` 0.55.1、
`@ota-meshi/site-kit-monarch-syntaxes` 0.7.3（Monacoが持たないTOML Monarch grammar）。いずれも`package.json`には
caret rangeで宣言し、commit済みlockfileがこれらのexactなresolved versionとintegrityをpinする。
`h3`のresolved versionはdevframe自身のh3と一致するため、hostの`/skills/**` shell fallbackと
devframeは1つのH3 module instanceに解決される（research.md § 3）。devframeの残りのtransitive tree
（birpc、crossws、valibot、destr、mrmime、nostics、pathe、ufo）はdirect dependencyとして
宣言せず、devframeとlockfileが所有する。最初のlockfile作成時に
これらの正確なstable resolved versionを再確認しなければならない（MUST）。Prereleaseや互換性のない
新しいmajorは「最新」の対象にしないが、devframeの選定とそのlockfile所有h3 release candidateは、
framework採用決定（spec Clarifications § Session 2026-07-22）とともにacceptした唯一のreview済み
例外とする。
この再確認はplanning gateであり、task内だけでpackageまたはversionを変更する許可ではない。選択済み
packageまたはversionが1つでも変わる場合、configuration作業前にimplementationを停止してcompatibility
decisionを再reviewし、dependency baselineを記載する英日両方のresearch、plan、quickstart、task artifactを
すべて同期し、作業再開前に
`/speckit.plan`、続いて`/speckit.tasks`を再実行する。
Renovateが自動mergeする更新はこのgateの外にある: どのpackageを選ぶか、なぜそれを選んだかは変わらない。
その更新はlockfileの中だけに収まらない。`:preserveSemverRanges`は`rangeStrategy: replace`であり、
新しいversionが現在のrangeの外に出れば`package.json`のrangeを書き換える。したがってbumpを裏づけるのは
ci.ymlであり、mergeの前にそのpull requestに対しsuite全体を走らせる。これらartifactに記録したversionは、
その理由をreviewした時点のものである。自動mergeされない更新が2つある。runtime dependencyのmajorと、
1.0.0未満のpackageのminorである（SemVerは`0.x`のどのreleaseでも破壊的変更を許す）。したがってpackageの置換、
majorの越境、pre-1.0のcaret rangeの移動は今もこのgateに届く（AGENTS.md § Release policy）。
Configuration、CI、release、package-policy
instructionは、その1つの同期済みbaselineだけを使用しなければならない（MUST）。

**Formatting/Linting**: Code formattingはPrettierが所有する — `pnpm run format`が書き換え、
`pnpm run format:check`がローカルとCIでゲートする。Byte衛生は宣言的なまま残る: `.gitattributes`
（`* text=auto eol=lf`）でgitがline endingをnormalizeし、`.editorconfig`がcharset/final-newline/
trailing-whitespaceの慣習をeditorに宣言する（research § 3）。
ESLint 10.7.0と`@nuxt/eslint` 1.16.0はlint gateとし、`tsconfig.json`で設定した
application、shared、source、script、test codeへのstrict TypeScript type checkを同等に独立した
`typecheck` gateとして実行する。local verification、独立CI job、releaseでは
ESLintと`typecheck`を別に実行する。

**Dependencyおよび破壊的変更の移行gate**: このinitial-release baselineは、移行対象となる以前の公開済み
Inspector package、public contract、永続profile、user dataが存在しないため、planned migration impactを
noneとする。T001はpackageまたはconfiguration作業前に、`research.md`の`**Migration impact**` section、
`research.ja.md`の`**移行影響**` section、および`plan.md`/`plan.ja.md`の対応する
`**Dependency and breaking-change migration gate**`/`**Dependencyおよび破壊的変更の移行gate**` sectionで
この判断を確認しなければならず（MUST）、
その正確な英日section pairをdesign evidenceの記録先とする。影響を受けるconsumerまたは以前のcontractが
見つかった場合は判断を無効としてimplementationを停止し、replanningする。Acceptする新規・変更dependency
および破壊的なpublic-contract変更はすべて、理由とmigration impactを記録しなければならない（MUST）。
Renovateが自動mergeする更新はそうした変更ではない（上のdependency gateを参照）。
Design evidenceはimplementation前、対応する`validation.md`/`validation.ja.md` evidenceはrelease前に存在しなければ
ならない（MUST）。各recordには影響を受けるconsumer、contract、data、workflow、必要な移行手順と
compatibility/support window、rollback/support pathを含めるか、理由付きの明示的なno-impact判断を記載する。
英日design evidenceが欠落またはstaleならT002をblockし、英日validation evidenceが欠落すればrelease gateをfailする。

`src/server/cli.ts`はGunshiのstableなroot `define`/`cli` APIだけを使用する。Negatableな`open` booleanを
default trueとして定義して`--no-open`を提供し、単一のstring-valued `root` optionで`--root <path>`を、
number-valuedな`port` optionで`--port <number>`を提供し、false-defaultの
`inspect-personal-setup` booleanを提供する。後者の存在自体がconsentのconfirmationであり、
entryはpreviewをcaptureして確認し、hostの起動前にcommit済みのGlobal generationをawaitする。
自動Repository scanをawaitするのと同じ形である（FR-013）。
`strict: true`を有効にし、bind前にすべてのpositional/rest argumentを明示的に拒否し、`cli()`をawaitし、
parser所有のvalidation `AggregateError`を通常どおりnonzeroのprocess exitへ伝播させる。Session作成前に
`process.cwd()`を正確に1回captureし、明示的なempty valueの`--root`はsession作成またはbrowser起動より前に
固定actionableかつsource-value-freeなstartup errorで拒否し、valueの欠落は同じboundaryでGunshiのtyped
validationによりrejectする（反復`--root`はparserのlast valueへ解決）。Absoluteな`--root` valueはそのまま保持し、relative valueは
`node:path.resolve`でcapture済みinvocation directoryに対してresolveし、その結果をselected Repository rootと
する。CLIは`process.chdir()`を呼ばない。Built-in help/versionはbindせずに処理する。Production entryは`gunshi/agent`、
lazy command、custom plugin、experimental parser combinatorをimportしない。Validation後、CLIは
`src/server/host/devframe-app.ts`のapp definitionを通じてdevframe hostを起動する。devframeがport選択、
loopbackの`localhost` bind、起動時のbrowser-open試行を所有し、CLIはFR-001のmanual fallback用にloopback originを
1回表示する。`--port`の値はparseされたままdefinitionの`cli.port`へ届き、devframeが解決する希望である。
Optionを省略した場合そのkeyは存在せず、devframe自身のdefaultが適用される。

**ストレージ**: 調査対象は何も保存しない。Session state、調査対象file byte、記述された完全な
source DTO、diagnostic、comparison selectionはprocess/browser memoryだけに存在する。読み手の
preferenceは2つだけ、このoriginのbrowser local storageに残る。いずれもrepositoryから読んだものを
含まない: open controlがfileを開くapplicationと、pageを描くcolour schemeである。どちらも読み手自身の
machineについての値であり、reloadとrescanを越えて残り、読み手が選ぶまでは存在しない。

**テスト**: Automated suiteにはVitest 4.1.10と
`@vitest/coverage-v8` 4.1.10、Nuxt Test Utils 4.0.3、
Vue Test Utils 2.4.11、happy-dom 20.10.6、Playwright 1.61.1、
`@axe-core/playwright` 4.12.1。Fixture駆動のunit、contract、integration、packaging、
performance、security、browser testとmanual accessibility checkを使用する。`vitest.config.ts`にはsuiteごとのnamed projectを定義し、各projectは自身が所有するdirectoryだけをincludeする。
どのsuiteに属するかはtestが置かれる場所で決まる。Directoryを所有しない唯一のprojectが`coverage`であり、
coverage値はunit/contract/integrationのrootをまたいで取るため、それらをまとめて再実行する。Suiteのproject、`package.json`のcommand、CI job、quickstart entryは、そのsuiteの最初のtestと同じ変更で
まとめて追加する: T996が`tests/security/`を、T183が`tests/performance/`を、T1041が
`tests/documentation/`を持ち込む。`passWithNoTests`は設定しないため、自身のfileに1つもmatchしない
projectは、何も実行していないのにgreenを報告せずfailする。だからsuiteはtestを持つまでどこにも
宣言しない。`tests/integration/security/`配下のsecurity testは、その下の
他の全directoryと同様にintegration projectが所有する。Browser release gateは、pinした
Playwright versionがinstallする正確なChromium、Firefox、WebKit revisionでprimary-workflowとaccessibilityの
完全なsuiteを、startup helperがそのrevisionを選ぶという主張ではなく再現可能なautomated certification baselineとして実行する。
日英の`contracts/accessibility-acceptance.md`と`contracts/accessibility-acceptance.ja.md`のmatrixはWCAG 2.2 Level A/AAの全55 criterionをinventoryし、各rowについて
Applicableまたはcriterion固有の理由を持つNot-applicable stateと必須のautomated/manual evidenceを確定し、0件ではない
Applicable row数をSC-008 denominatorにする。全Applicable rowの必須check、全Not-applicable rationaleの再validation、4つの
keyboard workflow、英日recordの意味的等価性がすべてpassした場合だけrelease gateをpassし、severity labelでfailureを免除しない。
Criterion固有のstable IDでautomated checkをexact E2E test titleへ、manual checkを各rowのexpected observationへbindする。
Manual matrixは`MANUAL-*` checkが定義される形 — 3つのOS/assistive-technology cell、responsive/zoom/spacing
profile、visual mode、workflow state、input profile — を述べるが、このreleaseはそのいずれも実行しない。各`MANUAL-*` IDは
passedではなくunexecutedとして記録する。実行には3つのOSと3つのscreen readerが必要であり、ここで可能なrunでは produce できないからである。SC-003、SC-004、SC-005、SC-007では、check-in済みの`tests/fixtures/outcomes/manifest.json`とcanonicalな
`tests/fixtures/outcomes/manifest.sha256`を、version付きでclosedな1つのrelease-evidence denominatorとして使用する。
Manifestの各caseは、一意でstableなID、criterionとrequired-classのmembership、fixtureまたは決定的builderへのreference、
客観的expected outcome、参照する全fixture byteのdigestを持つ。Contract testはcanonical digestを再計算し、schema/version error、
missing/duplicate/undeclared case、fixture digest drift、required classの空集合、fixture欠落、declaredした非ゼロminimum未満の
denominatorを拒否する。Caseのremove/reclassify、required-class定義またはexpected outcomeの変更ではmanifest versionをincrementして明示的なreviewを受け、fixture byteだけの変更では影響するfixture digestとcanonical manifest digestの両方を更新する。`manifestVersion`は1から始まるpositive safe integerとする。Contractは`tests/contract/outcome-fixture-manifest.test.ts`内のtable-drivenなprevious/current manifest objectを使い、current versionがprevious versionより大きくないdenominator-semantics変更と、両digestを更新しないfixture-byte-only変更を拒否する。VCS、network、reviewer stateを調査せず、human reviewを立証しない。T1062が実際の初回作成またはprior/current version、変更したdenominator semantics、reviewer decision/referenceをbilingual release validationへ別に記録する。どちらの変更も新しい直接比較不能なmeasurement setを開始する。Required classは、SC-003ではexactなtool/kind/admitted-source row、rejected selector family、shared-file
combination、SC-004ではprohibited effectとRepository/Global boundary rejection、SC-005ではexactな
tool/kind/source row、source/comparison surface、literal-credential/environment-reference class、set/unset referenced-variable state、
SC-007では全file-confined outcome classとfailure classとする。Release recordはmanifest version/digestと実行した全case IDを示し、missing、
omitted、unexecuted、mismatched evidenceは該当criterionをfailureにする。
SC-001とSC-006のfirst-use評価は、release candidateについて1回実施する20件の独立した自律agent
sessionである。各sessionには稼働中のInspectorが印字したoriginと標準化task promptだけを渡し、
discovery、inspection、comparison、personal-setup consentを実施させ、除外も置換もせず記録する。
Participant cohort、moderator、reviewer、capture harnessは存在しない。初見のparticipant 20名は
このprojectには得られないため、この評価は自動runが立証できるものをassertし、runのどの記録も
agent駆動であったことを明記する。材料は`tests/usability/sc001-sc006-study-inputs/`配下のguidance、
4つのtask prompt、response form、ground truth、scoring rubricであり、runの実施方法は
`tests/usability/sc001-sc006-study-kit.ja.md`とその英語版にある。

**対象platform**: Supported runtime contractは宣言済みNode.js 24/26 engine range全体を`ubuntu-latest`、
`macos-latest`、`windows-latest`で使用するものとする。`24.11.0`/`26.0.0`の各floorと3つのOS/architecture targetを
掛け合わせた正確な6 jobは、compatibleな全Node minor/patch releaseの一覧ではなく必須のlower-bound release-certification
sampleである。1つのplatform非依存tarballをactive LTS Node.jsのdevelopment/build baselineの`ubuntu-latest`でbuildし、
同環境で別のbuild/package smoke checkを実行してから、同一byteを6つのfloor jobすべてでinstallして検証する。各releaseで
解決されたrunner-image identifierと実際のNode versionを記録する。その他のOS/architecture targetと宣言したengine range外の
Node versionはunsupportedとする。Browser release certificationでは、Playwright 1.61.1がinstallする正確なChromium、Firefox、
WebKit revisionについて、active LTS Node.jsの`ubuntu-latest`で完全なbrowser/accessibility suiteを実行する。これらのrevisionは
再現可能で有限なcertification baselineであり、user browserの網羅的listではない。固定OS helperは表示済みURLをuserのdefault
handlerへ渡すだけでbrowser family/versionを選択または検証せず、helper成功をbrowser compatibility evidenceとしない。Certification
baseline外のhandler、利用不能なhandler、または識別不能な解決先browserの場合、自動openはbest-effortのままとし、表示済みURLと
`--no-open`を使ってcertified browserでmanual openすることをactionable fallbackとする。公開project/dependency package payloadとproject-authored installed application codeはplatform非依存の
JavaScript application codeとdeclarativeなstatic/package dataだけを含み — 唯一の例外は記録済みFR-038 closure例外である
`open` packageのvendoredなPOSIX shell `xdg-open` — install script、runtime download、end-user compilerを必要としない。
Package-manager生成`node_modules/.bin` symlink/`.cmd`/`.ps1` launcherはpayload外interoperability metadataであり、
宣言済み`package.json.bin` targetへmapする。Development-only toolingはproduct package外で別にpin/auditする。
Serverはloopback interface（host `localhost`）だけへbindし、remote deployment modeを持たない。

**Project type**: 静的Nuxt web client、Node CLI/local HTTP service、shared serializable
contractを含む単一の公開可能なESM npm package。Project-authored executable application codeはすべて
JavaScript/TypeScriptとし、全published package payload内のexecutable codeはJavaScriptとする。Generated HTML/CSS、
JSON manifest、documentation、licenseはdeclarative package artifactとして
許可する。このFR-038 boundaryでthird-party development/test toolingをpublished application codeと誤分類しない。

**性能目標**: releaseのthresholdとしては何も主張しない。Scan timingやinteraction latencyの測定には、
runの前にprocessor型番・image revision・memory・storageを記録した凍結host 1台を指名する必要がある。
同じ数値を他所で取ればそれはそのマシンの説明であってこのproductの説明ではないからであり、そうしたhostは
指名されていない。残るのは`tests/performance/`であり、`tests/performance/sc002-fixture-manifest.json`が
versionとcanonical SHA-256で束縛するdeterministicな100,000 entry fixtureに対する非gatingのsmoke passである。
Harnessが今もそのfixtureを展開・走査・digestできることを証明し、thresholdは一切主張しない。

**制約**: 調査対象カスタマイズによりexecution、child process、dynamic import、FR-022で定義した禁止対象のdirect product-issued network request、MCP connection、
product-issued source mutationを発生させない。発行済みのexactな`localhost` authorityにおける2つのexactなFR-022 browser/host class、
すなわちpackaged UI assetとlocal session API channelに対するclosedなstatic/SPA `GET`/`HEAD`はauthorized internal loopback
transportであり、outbound requestでもMCP connectionでもない。この2 class外のrequest、customization-selected request、MCP requestはすべて禁止対象のままとする。
Lexicalに識別不能なpre-mounted POSIX network filesystemまたはmapped Windows driveへの通常の
Node.js filesystem I/OはOS-mediated trafficを発生させ得るため明示的なplatform/environment limitationとし、explicit UNC/server-share/device spellingは
filesystem、DNS、SMB callより前にrejectする。Inspected-source I/O boundaryはwrite/append/create/truncate open、
write、truncate、create、rename、delete、link、mode/ownership/time/xattr/ACL変更、または同等のplatform mutationを
一切requestしない。Testではこれらのcallをinstrumentし、content、length、identity/link state、mode、mtime、ctime、
観測可能なxattr/ACLを比較する。OSのread semanticsだけによるatime更新は別に記録し、failureともmutationの証明とも
しない。別途制約されたstartup launcherは、許可する2つのproduct child-process surfaceの一方を所有し — もう一方はreader自身が明示的に要求するopen-in-editorである（FR-022） — 、
その対象はmacOSでは固定のprocess一覧probeと、OSの`osascript` automation hostで実行する固定のtab再利用script、それ以外では固定OS browser helperとする。spawnされるどのprocessも固定の引数と表示済みloopback originだけを受け取り、inspection由来のcontent/path、
authored value、user-supplied commandを受け取らない。各childはlaunch environmentを変更なしで継承する:
productはどの環境変数にもinspection由来の値を書き込まず、`xdg-open`が`$BROWSER`を参照するように
platform helperがuser自身の設定を尊重するのはuser preferenceの適用である。Ambient valueがSource rootとlexicalに同じでもprovenanceは変化せずread authorityを
与えない。自動起動を無効にした場合、非対応の場合、または失敗した場合もsessionを利用可能に保つ。Boundary外byteを受理・公開しない。Symbolic linkは透過的にreadし、link先がmissingまたは
unreadableなlinkはそのfileのfile別diagnosticになる。
Global read前に明示的opt-inを要求する。Loopback session APIは明示的なdetail requestにだけ完全な
authored sourceを返し、bundled browserはfileまたはcomparisonを1つずつ要求する。contentの前に確認stepは
立たず、その前にも隣にも注意書きは置かない。環境変数参照は解決も置換もしない。Inert textだけをrenderする。
表示するrelationship kindは、supportedな`(tool, kind)`について維持管理するclosedなpresentation
allowlist rowに属し、かつactualなadmission済みsource formのexact extractorが認識するものだけとする。どちらかのgateを
満たさないreferenceは完全なsource textからだけ利用可能とし、relationshipとして推論しない。宣言とその公開の間に
allowlistは立たない。Skillの宣言はfileが書いたkeyであり、authored keyの集合は閉じていないからである。
Product surfaceは、syntactic parsing、認識したkindが公開する宣言についてparserが解決した値の読み取り、凍結済み
catalog classification、文書化済みorder/scope/condition/selection/reference relationshipのprojectionだけに限定する。
Inventory、Detail、Comparison、Global control、Diagnostics、API、CLI output、documentationは、
natural-language meaningのinterpret/rank、validity/correctness/effectiveness/compliance/qualityの判定、remediationの助言、
customization contentのlint、synchronize、convert、format、fixを一切行わない。Inspector所有のmanifest、registry、DTO、
invariantの内部validationはcustomization fileに対するjudgmentではない。WCAG 2.2
Level A/AAの受入には上記の完全なbilingual criterion matrixを使用し、英語・日本語文書を意味的に同等に保つ。
Inspectorは、file byte、aggregate byte、発見file/entry、parser depth/node、diagnostic、graph record、message、
request/response body、package asset、retained session dataにproduct固有の上限を定義しない。Capacityは、supported
Node.js runtime、parser library、operating system、filesystem、browser、現在のexecution environmentから継承する。
Error handlingは通常どおりとする。1 fileに限定されるfailure（unreadableなfile、
binary content、parserまたはextractorのfailure）はそのfileのactionable diagnosticとなり（FR-028）、残りのtraversalが
完了すれば、scanは完全な非影響fileをすべて含む`partial` generationをcommitする。NULを含まない不正なUTF-8だけは、
代わりに完全にreadableな`utf-8-replaced` outcomeとする。それ以外のunexpected failureは該当attemptを通常のerrorとして
failさせる。Request-ownedなsession-API operationのfailureは、devframeがserializeするままcallerへ伝わり、sanitizing
wrapperやgeneric error envelopeは存在せず、process、session、以前のcommit済みsnapshotは利用可能なまま保つ（FR-030）。
Request ownerを持たない自動startup operationはprocess top levelへ到達し、process/sessionのsurvivalは保証しない。

Relationship projectionは機能上、各originating recognitionからdirect 1 hopに限定し、非再帰とする。これはsemantic/read-authority
boundaryでありresource quotaではない。Generic relationshipのread authorityは0であり、relationship処理はtargetを追跡せず、
target自身のrelationshipをoriginating edgeからprojectしない。Parser、recognizer、compositionのoutputがnestedまたはtransitive
relationshipを作ろうとする場合、target access前にそのprojectionを省略し、eligibleなdirect relationshipと記述された完全な
sourceを保持し、actionableかつsource値を含まないrelationship diagnosticをemitする。
Authorized browserはheartbeat interval、request timeout、retry delay、memory lease、およびliveness probeを定義しない
。Transportが報告するchannel lossまたは解釈できないprotocol、session mismatch、
greater content epoch、non-null disable fenceでpurgeする — ordinaryなrequest rejectionでは決してpurgeしない。host喪失はloopback socketのcloseとしてdevframeが問い合わせなしにpageへ報告するため、
process lossはpollingせずに検出される。Page-lifecycle eventはtriggerに含めない: FR-027はfailureまたは同等のterminal reset後にpurgeするもので、
tab切り替えもページからの離脱もそのどちらでもないため、clientはvisibility/unload listenerを設置しない。
Monacoには記述された完全なsourceを渡す。Browserまたはeditor runtimeがdiffを計算できない場合、UIは完全な
read-only side-by-side sourceを利用可能なまま保ち、どちらのartifactもvalid/invalidと扱わずactionableなcomparison
failureを報告する。HTTP deliveryはAPI DTOをtruncateしない。

Typed derivationはvendor自身のreaderであり、自らseedを開く場合はwalkの前に、seedがwalkの受理したfileである場合はwalkの後に走る: そのvendor contractが固定したseedを読み、そのcontractの
declaration fieldが持つ値を取り、出荷済みderived ruleのidentityのもとで同じwalkのplanへ展開する — 値はwalkが
entry名と比較するものか、contract行がpathを組み立てる場合はruleの固定base配下でjoinされるsegmentである。Derived candidateは別のderivationをseedできないが、同じfileの独立static provenanceはeligibleなままとする。
Path derivationに使うvalueはsupported runtime/platformのpath representationを満たさなければならない。完全なtraversal後に
1 fileへ限定されるparser/path failureは、target access前にそのfileのdiagnosticとともに`partial` outcomeとして
そのderivationを省略する。Memory、capacity、その他のenvironment-resource conditionがthrowまたはrejectionとして
現れた場合、application定義のclassificationまたはrecovery pathは存在せず、triggerを所有するboundaryへpropagateし、そのattemptの
resultをpublishせず、以前のcommitを変更しない。決定的にreturnされたderivation outcomeが使用できるのは、closedなcompleteまたは
partial transitionだけとする。

Coordinatorはproduct定義のwall-clock scan cutoffを設けない。Global disable、process shutdown、明示的operation
cancellationはpublication authorityを取消不能にrevokeする。その時点で未完了のNode.js filesystem promiseは
cleanup-only continuationとなり、late byte/result、DTOをすべて破棄する。Event loopが処理できる間は
APIをresponsiveに保つが、取消不能なkernel operationがsettleする前のphysical cleanupは保証しない。

同時に配布されるpackaged artifactをuser runtimeで相互検証しない。`dist/`はそれを生成した
clean → `nuxt build` → tsdown pipelineが所有し、devframe hostはそのtreeを`cli.distDir`からそのまま
配信し、packaged file setへのexact-value assertionは`verify:package` CI/release gateとpackage testだけに
置く（Constitution Principle I）。

Failureは通常のerrorとして報告する。Constitution § Quality and Safety Standardsに従い、productはlog-content ruleもsanitized error envelopeも
定義しない。telemetryを持たず、terminal/UI outputは調査対象fileを所有する同じuserが読むためである。Session-onlyの
file-scope `Diagnostic` DTOは、actionableなlocationとして必要最小限のSource-relative Pathを保持する。

**規模・scope**: ローカルuser 1人、選択済みRepository root（defaultでは1回captureしたexact invocation
`process.cwd()`、またはaccepted single `--root` value）をrootとするRepository sourceを正確に1つ、session-wideな
all-members opt-in 1回から作るadmit済みのmember Global sourceを0から4つ（Copilot、Claude、Codex、共有agent homeごとに最大1つ）、Sourceごとにrootを正確に1つ、
comparison内は異なるreadableなカスタマイズファイル最大2件、または明示された不在の対応物に対して表示する1件。Inventory sizeはproduct定義のitem上限ではなくsupported runtimeと
execution environmentによって決まる。

## 憲章適合確認

_GATE: Phase 0調査前に合格し、Phase 1設計後に再確認済み。_

- [x] **根本原因を解く設計**: 1 packageとSourceごとに正確に1つのimmutable rootでlaunchとinspectionを
      解決し、workspace分割、repository picker、root discovery、static export、file watcher、
      speculativeなextension systemを追加しない。
- [x] **読みやすい実装**: `host`、`inspection/rules`、`recognizers`、`parsers`、`session`が
      別々のinvariantを所有する。Vendor behavior、Inspector matcher、runtime composition、official evidenceは
      4つのclosed registryに分け、vendor固有policyを分離し、shared behaviorは小さく明示的に保つ。
      全moduleとexported nameは、似ているものではなく実体を述べる。短い名前が理解に周囲の文脈を
      必要とするなら、長い方を採る（AGENTS.md § Naming policy）。
- [x] **Dependencyおよびpublic-contract governance**: 未公開のinitial baselineについて、T001が確認する
      理由付きno-migration-impact判断を記録する。Acceptする新規・変更dependencyおよび破壊的な
      public-contract変更は、理由、影響を受けるconsumer/contract/data/workflow、移行・compatibility手順、
      rollback/support path、または理由付きの明示的なno-impact判断を記録する。英日design evidenceが欠落または
      staleならT002をblockし、英日validation evidenceが欠落すればreleaseをblockする。
- [x] **完全な検証**: Byte衛生は`.gitattributes`と`.editorconfig`に委ねる。lint、typecheck、automated
      suiteはlocalと独立CI jobで実行し、release pathはそのどれも再実行しない。同じcommitに対しpull requestが既に実行したsuiteを、publish credentialの隣でもう一度走らせても得るものはない。Release reviewで見つかったrepository remediationごとに、
      complete applicable automated matrixを再実行し、影響するcandidate/profile/fixture/human/manual evidence setを無効化・再生成し、
      concernが0件になるまでcomplete-diff/tarball reviewを反復する。Bilingual Constitution recordをsole planned validation-only editとして
      完了した後、frozen final tree/final candidateへ全applicable automated gateを再実行する。Outcomeはrepository外へcaptureする。
      その後repositoryをeditした場合は結果を無効にし、final sequence前にremediation、digest/evidence再validation、applicable gate再実行、
      complete-diff reviewへ戻る。独立したESLint gateと独立したstrict `typecheck`
      type-checking gateはci.yml自身のjobである。
      Unit、contract、integration、security、package、performance、end-to-end、error、
      boundary、accessibility scenario、4つのuser story、通常error方式のfailure model（1 fileに限定されるfailureはFR-028により
      そのfileのdiagnosticとして`partial` generationに入り、それ以外のfailureは何もcommitせず以前のsnapshotを
      保持してFR-030によりfailed requestのerrorを報告する）、product-issued mutationと
      OS atimeの分離、product-wideなFR-032 negative boundary、完全なbilingual
      55-row WCAG Level A/AA acceptance matrix、
      SC-003/004/005/007のversion付きでdigest-boundな
      非ゼロrelease-evidence denominator、first-use評価の採点に用いるtask材料をtest layoutで覆う。
      その評価はparticipant cohortではなく20件の自律agent sessionであり、実行と記録の間にcapture、seal、
      reviewer protocolは介在しない。
- [x] **文書の言語同等性**: Phase 0/1 artifactにはcanonical英語版と意味的に同等な`*.ja.md`を用意する。
      実装では両言語のuser/Contributor guide、全vendor/Repository/User/Global/surface表、official evidence、
      security boundary、diagnosticを更新する。
- [x] **安全なboundary**: 憲章のtrusted-workspace clauseに従い、productはuserがすでに信頼している
      workspace内で動作し、調査対象のカスタマイズファイルをadversaryとしてmodel化しない。保持する
      3つのobligation—調査対象contentを決して実行しない、配信contentがuser自身のsecretを含み得るため
      session hostはloopbackだけにbindして起動machineの外へ公開しない、表示contentをinertに
      renderする—がこの設計のanchorとなる。Session hostはそのloopback bindingの背後で
      authenticationなしに動作し、Inspectorの実行中は他のlocal processと、DNS rebinding経由の
      悪意あるweb pageがsessionへ到達し得ることをdocumented residual limitationとして記録する。
      設計はread candidateを凍結し、authored valueへは明示的な`FileDetail` requestまたは
      comparison構築を通じてのみ到達できるようにする。inventoryやsessionのresponseからは到達できない。
      中央のfull-session purgeを通常のscope限定route/Source/generation cleanupから
      区別し、Global disableはrequest前にfull purgeをinvokeする明示的な例外とする。意図的に調査した完全なcontentはinert、local、
      session-onlyのままで、persistenceとegressには含めない。Study capture adapterもraw trafficを一時的にだけclassifyしてIPC前に
      discardし、retain evidenceはclosedでcontent-freeなsafe eventだけをhashする。Raw headerのname/framing/wire/encoded representation、全
      noncanonical derivative、body、content/metadata、participant response、path、URL/authority value、capability、environment value、raw
      errorをrejectする。唯一の例外はstrict validation済みdecoded canonical safe `correlationId`であり、retained canonical payload/digest chainへ入れる。
      Captured wire/browser/Inspector byte自体をhash preimageにしない。Session Diagnosticはactionableな
      location fieldだけを保持できる。Failureは通常のerrorとして報告する。Constitution § Quality and Safety Standardsのclauseに従い、
      productはlog-content ruleもsanitized error envelopeも定義しない。telemetryを持たず、outputは調査対象fileを
      所有する同じuserが読むためである。Resource capacityはNode.js、parser library、OS、filesystem、browser、
      execution environmentから継承し、recoverable failure、authority revocation、late cleanup、fail-closed behaviorを
      明示する。Product-issued mutationを禁止してOS-only atime effectと区別する。Symbolic linkは
      透過的にreadしてbrokenなlinkにfile別diagnosticを付け、revoke済み/late byteを破棄して、physicalに取消不能な
      I/Oの残存riskと解消pathを記録する。
- [x] **参加しやすさ**: 単一package setup、再現可能なpinned tooling、客観的期待結果、keyboard-first
      workflow、actionable error、自動・manual accessibility gateで参加の障壁を抑える。Maintainer-owned release studyは
      必要性、accountable owner、funding、support、privacy、accessibility、rerun policyを公開し、通常のcontributorへ
      recruitmentまたはreview義務を移さない。

### 設計後の再確認

Data modelはphysical fileとcandidate provenanceを分離する。Documentation statusはregistry上の維持管理record
であり、製品がruntimeに何をするかはどこにもprojectしない。
Session API contractはloopback devframe channel上の明示的なdetail requestにだけ記述された完全なsourceとdeclared authored valueを返し、
bundled SPAはfileを1つずつrequestするかcomparisonを1つずつ構築し、その結果を、前にも隣にも注意書きを
置かずに表示する。Session APIはacknowledgementもnotice stateも受信・永続化
しない。どちらも存在しないからである。Masking/reveal workflowを持たず、環境変数参照を解決せず、維持管理するclosedなpresentation-allowlist rowに属し、actualなadmission済み
source formのexact extractorが認識するrelationship kindだけをemitする。Matcher contractは明示的staticまたはvendor-specific one-edge
derived candidateだけを許可し、relationship、component、vendor locator、excluded inputはread boundaryを
拡張できない。Relationship projectionは各originからdirectな1 hopへ制限して非再帰とし、read authorityを一切持たず、nested/transitive
projectionの試行をtarget access前にactionableなdiagnosticで報告する。Failure報告はConstitution § Quality and Safety Standardsの
ordinary-error clauseに一致する。1 fileに限定されるfailureはそのfileのdiagnosticとなり、それ以外のfailureは
failed requestの実errorとともにattemptをfailさせ（RPC handlerのfailureはdevframeがserializeするままdevframe
channelを渡る）、sanitized envelope、generic error entity、log-content ruleは設計に残らない。Quickstartは全stable behavior/rule/strategy/source ID、official-source drift review、typed segment array
selector grammarとそのcontract-gate rejection、lintと残りのtest、
その他の必須品質gate、4つのend-to-end storyを扱う。Monacoはclient-only、
same-origin、model lifetime scopeとし、固有diff engineでdependency重複を避け、exact authored metadata比較を
明示的に保つ。Product-owned browser launcherは、productのchild processをstartup openingに限定する —
macOSでは固定のprocess一覧probeと、OSの`osascript` automation hostで実行する固定のtab再利用script、
それ以外ではmaintainされた`open` packageの固定startup OS helper。spawnされるどのprocessも
固定の引数と表示済みloopback originだけを受け取り、inspection由来のcontent/path、authored value、
user commandを受け取らない。各childはlaunch environmentを変更なしで継承し、productはそこへinspection由来の
値を書き込まない。Source rootとのlexical一致は
provenanceを変えずauthorityを与えない。Package gateは承認済みのdirect production dependency setを
`package.json`と`pnpm-lock.yaml` closureからassertし、commit済みlockfileが各resolved versionとintegrity hashを
pinすることでproduction payloadをそのdigestでbyte-pinし続ける。Third-party development/test toolingはpublished FR-038 boundary外のままとする。
記録する唯一のresidual verification limitationは、stalled kernel filesystem operationをhard-cancelできない
点である。Disable、shutdown、cancellationはpublication authorityをrevokeしてlate resultを破棄するが、physical completionは
operationがsettleするまで待つ。Passing testによるproofや暗黙のwaiverとして扱わない。未解決clarificationまたは既知の憲章違反は残っていない。Frozen outcome-fixture
manifestとdigestはSC-003/004/005/007のrelease denominatorをclosedにし、class、case、fixture、execution record、
digest matchのいずれかが欠ければfailureにする。

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
│   ├── accessibility-acceptance.md
│   ├── accessibility-acceptance.ja.md
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
├── tasks.md                         # 後で /speckit.tasks が作成
└── tasks.ja.md                      # tasks.mdと同時に作成
```

### Source code（repository root）

```text
src/
├── app/
│   ├── App.vue
│   ├── router.options.ts   # page identity、ページ変更時のscroll、一覧のreturn point
│   ├── worker-modules.d.ts
│   ├── components/
│   │   ├── inventory/
│   │   ├── inspection/
│   │   ├── skill-comparison/
│   │   ├── consent/
│   │   └── diagnostics/
│   ├── composables/
│   │   ├── skill-comparison.ts
│   │   ├── filters.ts
│   │   ├── monaco.ts
│   │   └── monaco-languages.ts
│   ├── session/
│   │   ├── api-client.ts
│   │   ├── client-data.ts
│   │   └── view-state.ts
│   ├── pages/
│   │   ├── index.vue
│   │   ├── global-consent.vue
│   │   ├── skills/compare/[family].vue
│   │   └── skills/detail/[source]/[...path].vue
│   └── styles/
├── server/
│   ├── cli.ts
│   ├── host/
│   │   ├── devframe-app.ts      # devframe app definition（RPC session APIとcreateDevServerの配線点）
│   │   └── global-consent.ts    # Global consent/enable/retry/disableのRPC handler
│   ├── inspection/
│   │   ├── scan.ts
│   │   ├── rules/
│   │   │   ├── registry.ts
│   │   │   ├── copilot.ts
│   │   │   ├── claude.ts
│   │   │   └── codex.ts
│   │   ├── recognizers/
│   │   │   └── candidate.ts
│   │   └── parsers/
│   │       ├── extraction.ts
│   │       ├── json.ts
│   │       ├── markdown.ts
│   │       └── toml.ts
│   └── session/
│       ├── scan-generation.ts
│       ├── stale-failures.ts
│       └── session.ts
└── shared/
    ├── api-types.ts
    ├── api-text.ts               # what api-types' closed unions read as on screen
    ├── diagnostics.ts
    ├── entities.ts
    ├── rejection-codes.ts
    └── registries/
        ├── identifier-types.ts       # closed BehaviorId/StrategyId/RuleId unions
        ├── behavior-types.ts         # record shapes, one per registry
        ├── strategy-types.ts
        ├── rule-types.ts
        ├── relation-types.ts         # the edge kinds between the registries
        ├── evidence-types.ts         # on-record citations
        ├── maintenance-data.ts       # the build flag that drops data the product never reads
        ├── vendor-behaviors.ts       # aggregates: the public surface
        ├── inspection-rules.ts
        ├── runtime-composition.ts
        ├── relations.ts              # the graph the recognizer walks
        └── codex/                    # one directory per vendor, four files each
            ├── behaviors.ts
            ├── strategies.ts
            ├── rules.ts
            └── relations.ts

tests/
├── unit/
├── contract/
├── integration/
├── security/
├── package/
├── performance/
├── e2e/
├── usability/
│   ├── sc001-sc006-study-kit.md
│   ├── sc001-sc006-study-kit.ja.md
│   └── sc001-sc006-study-inputs/
│       ├── guidance.md
│       ├── guidance.ja.md
│       ├── task-prompt-sc001.md
│       ├── task-prompt-sc001.ja.md
│       ├── task-prompt-sc006.md
│       ├── task-prompt-sc006.ja.md
│       ├── task-prompt-comparison.md
│       ├── task-prompt-comparison.ja.md
│       ├── task-prompt-consent.md
│       ├── task-prompt-consent.ja.md
│       ├── prepared-state.json
│       ├── prepared-state.ja.json
│       ├── response-form.json
│       ├── response-form.ja.json
│       ├── ground-truth.json
│       ├── ground-truth.ja.json
│       ├── scoring-rubric.json
│       └── scoring-rubric.ja.json
└── fixtures/
    ├── conformance/
    │   ├── vendor-behaviors.json
    │   ├── inspection-rules.json
    │   ├── runtime-composition.json
    │   └── relations.json
    ├── outcomes/
    │   ├── manifest.json
    │   └── manifest.sha256
    ├── repositories/
    ├── global-homes/
    └── secrets/

scripts/
├── clean-build-output.mjs
├── verify-package-files.mjs
├── check-official-sources.ts

.github/workflows/
├── ci.yml
└── Release.yml

package.json
pnpm-lock.yaml
nuxt.config.ts
tsconfig.json
eslint.config.js
tsdown.config.ts
playwright.config.ts
vitest.config.ts
.gitignore
AGENTS.md
AGENTS.ja.md
README.md
README.ja.md
LICENSE
```

**構成判断**: UIとCLIを同時にrelease/version管理するため、全production sourceを`src/`配下に置く構成
（browser SPAは`src/app/`、Node専用CLI/host/inspection codeは`src/server/`、環境非依存contractは`src/shared/`）を
使用する。NuxtはSPA（`ssr: false`）とし、static Nitro preset、`app.baseURL: '/'`、
`app.buildAssetsDir: '/_nuxt/'`、CDN URLなし、明示的importを使い、component auto-discoveryを無効にする。
これにより全nested client routeが同じroot-absolute same-origin asset URLをresolveする。Detail routeは、それが表示する
認識済みkindに属する。`/skills/detail/<source>/<SKILL.mdのSource相対パス>`がfileではなく`skills`を名乗るのはそのためである: detailが示すのはskillの宣言、
指示、directoryであり、別kindのdetailは別のlayoutで別の問いに答える。そのdirectoryのどのfileを読んでいるかは
addressの傍らの`file` queryであり、主題はpageが記述するcustomizationのままとなる。detail surfaceを持つ認識済みの各kindがこの形のrouteを1つずつ出荷しており、
新しいkindを認識するphaseがそのkindのrouteとpageを併せて追加する。`src/server/cli.ts` entryは
BOMなし、LF終端の正確な先頭行`#!/usr/bin/env node`で始まり、tsdownがpackaged `dist/cli.mjs`でそのshebangを
保持し、`package.json.bin`は別のbootstrap wrapperなしでそれを直接指す。同時に配布されるartifact同士を
user runtimeで相互検証せず、packaged entry pointは`verify:package` CI/release gateがenforceする。
Root selection自体は純粋にlexicalとする。`process.cwd()`を1回captureし、absoluteな`--root`は保持し、
relativeな値はそのcaptureに対してresolveする。Inspection I/O contractはdirectory-levelのownershipとする。
調査対象sourceへのfilesystem I/Oはすべて`src/server/inspection/` directory配下だけに置き、他のmoduleは
調査対象sourceをenumerate/readしない。

`src/app/session/`はsession transportとlifecycleのmoduleを保持する——shared client-data purge（`client-data.ts`)、
guarded RPC client（`api-client.ts`)、およびそれらを受けpage-lifecycle listenerを設置しないreactive browser view state（`view-state.ts`）である。
`client-data.ts`はdependency leafで何もimportしないため、API clientとview stateはmodule cycleなしに同じ`clientDataEpoch`を
観測できる。liveness moduleは存在しない——独自のprobeは、host喪失をカバーするtransport自身の
connection-status signalと、残りをカバーするresponse経路のepoch/fence checkを重複させるだけである。
これらはいずれもVue composableではなく、instance-localなstate（`#`-private）を持ち1度だけ構築されるclassであるため、
`use*` reactivityを約束する名前のdirectory配下に置くと実態を誤って説明することになる。よって
`src/app/composables/`の外に置く。

User-visible UI copyはそれを描画するcomponentに書き、message catalogは持たない。
UIは1言語だけ出荷するため、QR-004の二言語義務はuser/contributor documentationとWCAG applicability matrixに掛かり、
動作中の画面には掛からない。よってmanual accessibility matrixにlocale軸は無く、shellはnegotiateせず固定の
`lang="en"`を設定する。message名をkeyとするcatalogは、keyとその唯一のstringの間にlookupを足すだけになる。
例外は閉じたunionが固定するtext——Source status、boundary origin、Diagnostic code——であり、
これらは`src/shared/entities.ts`と`src/shared/diagnostics.ts`のunionのそばで宣言する。
新しいmemberはtextなしではcompileできず、serverとbrowserは同じ語彙を1か所から読む。
unionがruntime codeを出荷しない`-types` moduleで宣言されている場合、その表は隣の`*-text.ts` companionに置く。
`src/shared/api-text.ts`である。
これはcontract識別子を画面に出さないための仕組みでもある。rule ID、behaviorまたはstrategyのID、matcher lookup baseは
registry recordのkeyでありgateの照合対象であるtokenなので、すべてのsurfaceはそのtokenが名指す言明を描画し、
それを運ぶDTO fieldは`string`ではなく閉じたunionとして型付けする。そうすれば表がcatalogから遅れることはない。
`validation.md`と`validation.ja.md`はfinal SC evidenceを記録し、
意味的に同等に保つ。`.github/workflows/`でCI/releaseのownershipを明示し、documentation parity、package
exact-set、release gateを含める。

Task generationは、すべてのP1 workをすべてのP2 workより前へstable partitionせず、元のfamily-vertical delivery
orderを維持する。最初にSetupとblocking secure foundationを実施する。次に各familyでUS1 discoveryとUS2の完全で
不活性なdetailを完了してからUS3 comparisonを行い、その後にだけ次のfamilyへ進む。正確な順序は、SKILL
（Skill Metadataを含む）→ Instructions → MCP → Rules → Commands → Copilot Prompts → Custom Agents →
Configuration/Settings → Output Styles → Plugins → Hooksとする。その後、Repository-wide
Inventory、Detail、Comparison Acceptanceをこの順で完了する。Global inspection（US4、P3）、cross-cutting
verification、release evidenceは最後に実施する。

3つのregistry moduleは、1つのvalidatorがclosed graphとしてloadする場合もownershipを分離する。
`vendor-behaviors.ts`は文書化済みvendor lookup statement、`inspection-rules.ts`だけがstatic/derived matcherの
read authority、`runtime-composition.ts`はstrategyとrelationship-only policyを所有する。Evidenceは専用moduleを
持たない: 維持対象の各recordが自身のcitationを`evidence`配列に書くため、根拠は支える主張の隣に置かれ、
そこから乖離しうる並行mapにはならない。Packaged CLIはそれらのcitationをcompile除去する。Conformance JSON
fixtureはこれらmoduleをmirrorし、相互IDを要求し、duplicate、orphan reference、
anchorなしevidence、またはauthorしたsegment programがclosed token grammarに違反する（例:
隣接するrecursive-directory segment）Inspector Repository matcherがあればbuildをfailさせる。

各registry moduleは自身のsubject recordにあるexactな`documentationStatus`と`lifecycleQualifiers`を
所有する。これらはmaintenance recordであり、どのresponseも運ばず、製品内にassembleする箇所も読む箇所もない。
Contract gateはrecord自身から読み、`(subjectKind, subjectId)`ごとにexactなsubject
recordを1件copyし、missing/duplicate subjectをrejectしてfixed subject-kind/ID orderでsortする。

維持管理する3つのvendor contractにあるPresentation Allowlist sectionを、独立した規範的design inputとする。
最初のparser、recognizer、API、UI detail taskより前に、supportedな全`(tool, kind)`、そのrowがcoverするadmit済み
source form、relationship-kind setを英日両方で列挙する。Rowはmetadata fieldのcatalogを持たない。
Skillの宣言はfileが書いたkeyで公開されるため、列挙できる閉じた集合が存在しないからである。Effective eligibilityはtuple
membershipと、そのrowが記載するexact source-form extractorの二重gateで決定する。1つのsource formについて列挙した
kindを、tuple membershipだけで別formへ移してはならない。Registry/conformance workは両gateを入力としてtestし、
implementation自身に満たすべきcontractを定義させない。後続のofficial-evidence phaseはdriftをreview/reconcile
してよいが、initial allowlistを初めて作成するphaseにはしない。
Implementation gateは、すでに凍結済みのbilingual rowと記録済みdigestだけをverifyし、implementation taskのもとで
membership、identifier、source-form applicabilityを編集してはならない。Semantic mismatchまたは望ましい変更があれば
dependent workを停止し、変更後のrowをconsumeする前に同期済みplan/task regenerationを必要とする。
Evidence location、section anchor、review metadata、またはsemanticに変化しないcorrectionの更新はcurrent task setで
継続してよい。Accepted driftがnormative behavior、inspection rule、runtime strategy、Presentation Allowlist membership
またはsource-form gate、registry shape、conformance expectationを変更する場合は、production registryまたはsuperseded IDへ
依存する後続taskより前にworkを停止する。英日specification、research、plan、quickstart、contractを同期し、planningとtask
generationを再実行し、regenerate済みtask setだけを継続する。

Buildは最初にroot-resolvedなpackage所有の`.output/`、`dist/` treeだけを除去する。`nuxt build`は
`nitro.output.publicDir`によりbrowser applicationを`dist/public`へ直接出力し、build metadataは`.output/`に
残り、その後tsdownを実行する。Staging copy、build後のvalidator、asset manifest、CSP-hash stepは存在しない。
出力treeはdevframe hostが`cli.distDir`（`dist/public`）からそのまま配信し、`dist/`を生成したpipeline自身が
その内容を所有するため、packaged-artifactへのassertionは`verify:package` CI/release gateとpackage testだけに
置く（Implementation simplicity policy）。

`package.json`がrunnable command graphを所有する。`build` scriptは固定clean step、Nuxt client build、tsdownの
`cli` buildを順に実行する。別の`verify:package` scriptは
packaged entry-point verifier `scripts/verify-package-files.mjs`を実行し、正確に
`dist/public/index.html`、`dist/cli.mjs`を要求する。Packaged artifactの検証はCI/release gateの層に属するため、
これは全local buildの一部ではなくCIとreleaseのgateである。Package testは承認済みproduction-leaf setを
assertし、locked versionとそのintegrityはcommit済みlockfileが所有し続ける。別のproduction-graph scriptや
evidence fileは存在しない。`typecheck` scriptは
`tsconfig.json`で設定したapplication、shared、source、script、test codeへのstrict TypeScript type checkを実行し、
local verificationと独自の独立CI jobで必須のquality gateとする。CIは`format:check`を独立jobとして実行する。`check:official-sources`だけをnetwork有効のevidence-drift commandとして文書化する。`src/server/cli.ts`
entry、`tsdown.config.ts`、assembly script、これらpackage scriptはfoundation prerequisiteであり、存在する前に
buildまたはpackage quality gateを配置しない。
したがってSetupでは、package command、tsdown entry、CI quality gateを設定または実行する前にformatterを
設定し、CLI entryと参照される全assembly scriptをscaffoldする。それらのpathが存在するまでSetup stageを
runnableとみなさない。
Production `dependencies`はcaret宣言のdirect set `devframe`、`env-editor`、`gunshi`、`h3`、`open`、
`smol-toml`、`strip-json-comments`、`vfile`、`vfile-matter`、`which`、`yaml`とし、`tests/package/production-graph.test.ts`が`pnpm-lock.yaml`から直接assertする。
devframe、`open`、`which`のtransitiveはlockfileが所有する。Nuxt/Vue/Vite/tsdown、Monaco、Playwright、その他
build/test toolingはdevelopment-onlyとする。

Cross-platform CIはmacOS、Linux、Windowsで同じpure Node.js inspection-filesystem integration suiteを
実行する。tsdownは単一のnamed `cli` entry（`src/server/cli.ts`）、
`fixedExtension: true`、`dist/`への直接出力と`clean: false`（`dist/`の除去はpipeline自身のclean stepが
所有する）、source map/declaration無効、Node ESM
target、project moduleのbundle、`deps.skipNodeModulesBundle: true`による宣言済みruntime dependencyのexternal
維持を行う。Pipelineのclean stepが新鮮な`dist/`を保証するため、
dist直下の全`.mjs`は構成上tsdown outputであり、`verify:package` gateは`cli.mjs`を
regular fileとして要求する。Bundleされたparserはscan path上でin-processに実行するため、
CLI bundleが唯一のtsdown entryである。

`verify:package` gateは`npm pack`前に、正確に2つのpackaged entry point
（devframe hostが配信するSPA shellの`dist/public/index.html`と`dist/cli.mjs`）
をregular fileとして要求する。`dist/`の残りは、それを直接生成した
clean → `nuxt build` → tsdown pipelineが所有するため、recursiveな再検証でそのownershipを
重複させない。Install時build/downloadは行わない。
`package.json.files`は正確に
`["dist", "docs/images", "README.md", "README.ja.md", "LICENSE"]`とする。npmは`package.json`も含めるため、
tarball allowlistは`dist/`と上記4 entryおよびその内容だけで、source、fixture、planning artifactを
含めない。PackageはCLI-onlyとし、`package.json.bin`は正確に
`{ "agent-customization-inspector": "dist/cli.mjs" }`、`main`、`module`、`exports`は不在とし、存在しないlibrary
entry pointをadvertiseしない。Package testはbin targetの保持された正確なshebangを検証し、binが指すbuild済み
`dist/cli.mjs`を起動し、loopback URLを観測して終了する。これによりNuxt asset、CLI、inspection layerがbuild済み
locationから解決されることを証明する。Pack済みtarballは証明しない: tarballをisolated fixtureへinstallし
`npx --no-install`で起動するのはT917であり、release gateが所有する。

Package gateは、承認済みのdirect production dependency set — その11個のnameだけで他は含まない — を
`package.json`と`pnpm-lock.yaml` closureからassertする。これによりnew production dependencyは
research.md § 3の決定が明示的に見直されるまでfailする。各resolved versionとそのintegrity hashは
commit済みlockfileが所有し、production payload byteを固定し続けるのはこのlockfileである。payload content scan — native/binary/Wasm magic、shell helperとshebang audit、
lifecycle-disabled/network-disabled installの各run、cross-OS shim audit — と
dependency単位のversion/integrity hash assertionはscope外とする。これらはexactな
hash-pinned payloadの性質であり、dependency review時に一度確立されるものであって、
integrity hashが既に固定したcontentを再scanすること、あるいはlockfileが既にpinしている
値をtestで再記述することは、憲章原則Iが除く冗長な再検証だからである。install時の
lifecycleとnetwork enforcementはpackage manager自身の設定が所有する。

## 実装boundary

- 調査対象sourceへのfilesystem I/Oはすべて`src/server/inspection/` directory配下だけに置き、
  その外のmoduleは調査対象sourceをenumerate/readしない。これは単一のauthority fileではなく
  directory-levelのownershipである。Traversalは、typed matcherからcompileした固定inspection path
  allowlistに対する通常の再帰的`node:fs/promises` walkとする。Repository planは明示された
  descendant programを通じてselected Repository rootから下向きにwalkし、Global planは文書化済み
  instruction pathだけに触れる。Exact targetは自身のpathだけをcheckし、Copilotのfixed instructions
  subtreeはそのsubtreeだけをenumerateし、隣接Global pathへのI/Oは0とする。Inspectorは同じpathを
  readするagentが見るものを示すため、traversalとreadはsymbolic linkを透過的にfollowする。再帰的
  traversalは訪問済みdirectoryをreal pathで追跡するため、link cycleがscanのterminationを妨げることは
  なく、link先がmissingまたはunreadableなlinkはfile-scoped `file-unreadable` diagnosticになる。
  Hard linkは通常のfileとする。Filesystem operandにはraw entry nameだけを使い、publicな
  Source-relative Pathはそれを`/`でjoinしたものである。Client指定pathはI/Oを認可せず、readは
  compile済みallowlist planとserver所有identifierだけで駆動する。
- File別の問題はclosedなDiagnostic registryを使う。`root-unreadable`（source scope、error）、
  `file-unreadable`（file scope、error）、`file-content-binary`（file scope、warning）、
  `recognition-parse-failed`（file scope、warning）。
  選択済みRepository rootが存在しないかdirectoryとしてreadできない場合、そのscanはsource-scoped
  `root-unreadable` diagnosticでfailし、sessionは利用可能なまま残り、そのattemptはpartial inventoryを
  publishしない（FR-002）。Consent済みGlobal rootがmissingまたはunreadableな場合は、sibling toolを
  blockせずにそのtoolをabsentまたはfailedとして記録する。Readできないfile（link先がmissingまたは
  unreadableなsymbolic linkや、discoveryとreadの間に消えたfileを含む）は、他のfileへ影響せず
  `file-unreadable`となる。
- Error handlingは通常どおりとする。1 fileに限定されるfailureはそのfileのdiagnosticとなり、
  scanは完全な非影響fileすべてを含むpublic status `partial`をpublishする（FR-028）。それ以外のunexpected failureは、
  request-owningなsession-API handlerから通常のerrorとしてpropagateし（RPC failureはsanitizing wrapperなしに
  devframeがcallerへserializeする）、request ownerのない自動startup workではprocess top levelへ到達する。
  いずれの場合もそのattemptから何もcommitせず、以前のcommit済みsnapshotを保持する（FR-030）。
- Inspected-source filesystem workはscan serializationとcoordinationし、generation publicationがoverlap/interleaveしない
  ようにする。Openはread-only flagを使い、inspection directoryはmutation可能なopen、
  write、truncate、create、rename、delete、link、chmod/chown、utimes、xattr、ACL、または同等のoperationを公開しない。
  Safety testではcallをinstrumentし、前後のbyte、length、identity/link state、mode、mtime、ctime、観測可能な
  xattr/ACLを比較する。OS-onlyなatime changeは別に記録し、failureもsuccessも証明しない。Global disable、process
  shutdown、明示的cancellationはattemptのpublication authorityをrevokeする。Pending promiseはsettle時にcleanupだけを
  行ってよく、late byte、diagnostic、graph change、DTOは破棄する。Node.jsとkernelがoperationのsettleを
  報告する前にphysical cancellationしたとはclaimしない。
- 3つのregistryは1つのreference graphとしてvalidateするが、与えるauthorityは異なる。Vendor behavior recordは
  upstream lookupを記述するだけでI/Oを認可せず、static/typed derived Inspector ruleだけがreadを認可し、
  runtime strategyはorder、condition、relationship-only edgeをprojectし、official source recordはevidenceを
  提供するだけでruleを自動変更しない。全Repository selectorはtyped segment array programとして直接author
  する。Literal、regex、非隣接recursive-directory segmentで、general glob engineもglobのように見える
  string形式も使わずcompositeなdescendant/direct-child/subtree ruleを表し、immutableかつversionedな
  `TraversalPlan` dataへ決定的にcompileする。CopilotのVS Code、CLI、Cloud behaviorと、各vendorのRepository対User/Global behaviorは、推測した
  traversalを共有せず独立してaddress可能に保つ。Global preview entryは、serverが保持しopaque `previewId`で
  識別する唯一のrecordのfrozen lexical rootであり、admitted root配下で何をreadするかは保持済み
  `allowlistVersion`/`traversalPlanVersion` pairがbindする。
  Content依存のscheduler branchはexactな`codex-global-first-non-empty` policyだけとする。これは
  `AGENTS.override.md`をprobeし、non-emptyならshort-circuitし、overrideがabsentまたはemptyとして
  readされた場合だけ`AGENTS.md`へ進み、publishするCodex
  Global instruction fileは最大1件とする。Optionalな先頭BOMを1つ除去した後、
  emptyはsupported ECMAScript runtimeで正確に`decodedText.trim().length === 0`であることを意味する。Decode済みの
  `utf-8-replaced` stringはそのまま参加するため、別のnon-whitespace textによってすでにnon-emptyである場合を除けば、
  `U+FFFD`が1つでもあればnon-emptyになる。Binaryまたはunreadableなoverrideは、そのfile別diagnosticとともに
  branchを終了し、fallbackしない（FR-035）。
- Static matcherと、出荷済み`bounded-derived-candidate` ruleごとに1つあるvendorの構成readerだけをcandidate read authorityとする。
  これらがカバーしない唯一のreadはcensus-listed fileのreadであり、それはどのadmissionも認可せず、
  2つのboundのいずれかに収まる: admit済みcandidate自身のdirectory、または、validatedなcatalog entryの
  local sourceが名指すSource-relativeなplugin root — vendorの文書化済みlocal formに対して検証され、同じSourceに
  containされる（contracts/inspection-path-allowlist.ja.md § Bounded companion census）— skillのsibling
  `agents/openai.yaml`と宣言されたpluginのfileはこの経路で公開される
  （contracts/vendors/openai-codex.ja.md § Derived Repository rule）。Derivation schemaは
  static seed provenance/rule/kind、closed declaration field/syntax、seed-relativeまたはsource-root base、固定placement/
  suffix、deterministic target constructionをpinし、callback、arbitrary path join、free-form expression、glob、recursive derivationを表現不能にする。
  Derived segmentは
  host-independentなclosed spelling grammarを通し、enumerate済みallowlist entry正確に1件へresolveできた
  場合だけ読み、ADS、device、trailing-dot/space spellingはfile open前に拒否する。
  Vendor behavior registryがその他の
  supported User customizationを記録する場合も、FR-015からFR-018とFR-045によりGlobal readは4 memberのfrozen rule catalogだけに
  制限し続ける。
- Tool recognizerは`(file, tool, kind)`ごとにexact `ToolRecognition` 1件を付け、closed tool/kind順でsortする。
  Compatible admissionはprovenanceをmergeし、incompatible parsed meaningはそのrecognitionのall-or-nothing extractionだけを
  failする。Recognitionは1つのunderlying fileについて、受理済みの独立candidate provenanceをすべて保持する。
  Parserまたはextractorのfailureはfile-confinedとする。そのfileの`recognition-parse-failed` diagnosticと
  `partial` outcomeのもとで、そのrecognitionのderived metadata/relationshipだけを破棄し、完全なreadable
  sourceは表示可能かつcomparison-eligibleなまま残す（FR-028）。Declarationをinert dataとして
  parseしてよいが、import、evaluate、remote content解決、relationship targetのreadは禁止する。Context
  extractionが合成できるのは独立受理済みfile間または固定relationship-only defaultへのclosedな
  vendor-documented edgeだけで、non-file/excluded contextはsource-level condition factにする。Relationship projectionは
  各originating recognitionからのdirectな1-hop edgeだけに制限して非再帰とする。Closed composition ruleに従う複数の
  direct edgeを許可する。独立してadmit済みのtargetは自身のdirect edgeを自身の
  recognitionでだけ公開でき、originating edgeからtransitiveに展開しない。Relationshipのread authorityは0とする。Nested/
  transitive projectionの試行はtarget access前に拒否し、eligibleなdirect edgeと記述された完全なsourceを利用可能なまま保ち、
  actionableかつsource値を含まないrelationship-depth diagnosticをemitする。固定defaultを
  authored targetとしてlabel/serializeしない。Public provenanceは、読み取りを認可したruleと一致したSource-relative pathを名指し、それ以上は持たない。
  カスタマイズがどこに適用されるか、どの順序かは、どのsurfaceも行わないprojectionだからである。Derived provenanceは
  derived candidateのadmissionは、static candidateがplanの一致したruleを名指すのと同様に、
  それを展開したderived ruleを名指す。
  特にRepository root `.mcp.json`は、別file/readを作らずCopilot CLI provenanceとexactなVS Code 1.118以降の
  path-only provenanceをmergeする。CLI `mcpServers` extractionはprovenance-specificのままにし、登録済みの
  release-note/current-guide conflictがopenな間、VS Code provenanceはschema fieldまたは推測したwinnerを追加しない。
- Admitされたfileを製品が使うかどうかを投影するmoduleは存在しない。Documentation status、product surface、
  runtime `cwd`/target、trust、approval、enablement、selection、agent context、tool availability、
  installation、instruction-byte budget、managed policy、external stateは、このtoolが観測しないruntime
  inputであり、recognitionはそれらについて何も述べない。Global instructions-only consent外のCodex
  user/profile fallback name、`project_doc_max_bytes`、project root、Copilotのsurface差、Claudeの
  exact-launch-directory project settings、direct-child-onlyなCodex rule file、authoredだがactivatedでない
  plugin manifestは、いずれも同じ規則の適用例である。Fileをvendorがどう扱うかはそのvendorの文書であって、
  この製品が導出する事実ではない。Source-level factは架空のsource file relationshipを作らず、tool、説明rule、
  影響を受けるcandidate/relationship-rule IDを保持する。
- Official-source registryは各behavior、rule、strategyへ相互参照するstable evidence ID、canonicalな公式HTTPS
  URL、正確なsection anchor、review date、semantic fingerprintを与える。Offline contract/build
  validationはchecked-in recordをloadし、これらpageをfetchできるのは明示的なmaintainer drift commandだけと
  する。Startupとscanはdocumentationへaccessせず、remote page textをpackageへcopyしない。
- Decodeはfileのbyteをreadしてから開始する。`0x00` byteが1つでもあれば
  `encoding: binary`とし、`sourceText`を持たずcomparison不適格とする。admit済みcandidateではさらに
  file-scoped `file-content-binary` diagnosticを生み、otherwise publishableなgenerationを`partial`にする。
  censusが列挙したcompanionのbinary bytesはassetの通常の事実である（FR-025）。それ以外のbyteはすべてreplacement semanticsを
  用いてUTF-8として正確に1回decodeする。先頭UTF-8 BOMが正確に1つあれば`hadLeadingBom`として記録し`sourceText`から除去する。
  encodingはこの記録と直交し、replacementなしでdecodeできたinputは`utf-8`、replacementされた
  invalid sequenceが1件でもある場合は`utf-8-replaced`とする。生成された`U+FFFD`はすべて、parsing、display、extraction、
  comparisonへ渡す完全な`sourceText`内に保持する。Charset detection、alternate decode、sampling、truncationは行わず、
  `utf-8-replaced` outcomeだけを理由にgenerationをpartialにしない。
- Parserはsafe modeだけを使用する。YAMLはYAML 1.2 core schemaとし、aliasは指す先の値へ解決し、未解決tagが担っていたscalarは残す。これはそのfileを読み込む製品が読む値であって、このtoolが拒否するものではない。JSONCは
  既知fieldのtree extraction、TOMLはlexical-span extractionと値を実行しないsemantic normalization、
  Markdown/frontmatterはHTML renderを行わないextractとする。認識したkindが公開する宣言ごとに、そのparserが解決した値を持つentryを
  そのkindが公開する順で1件持つ。skillであればfileが書いた順である。2回宣言されたkeyは1つの値へ解決される
  ため、occurrence indexは持たない。Entryはsource座標を持たない。Documentを指すものが存在せず、
  取得元の値の隣に置いたrangeはそれ以上を主張しないからである。Registry定義の固定relationship defaultは
  authored textをnull、originを明示`documented-default`とする。Parser workはすべて
  bundleされたparser libraryでscan path上のin-process実行とする。Parseのcapacityはsupported
  Node.js runtime、parser library、browser、OS、execution environmentに従い、Inspectorはproduct固有のV8
  heap/stack、parser depth/node/scalar、wall-clock extraction上限を設定しない。1 fileに限定される
  parser/extraction failure（missing/ambiguous/illegal overlap/non-round-tripping span、throwまたはrejectされた
  parse、そのfileに限定されるその他のparser/extraction outcome）はFR-028のもとでfile-confinedとする。対象
  recognitionのextraction result全体（relationship/derivation declarationを含む）を破棄し、そのfileの
  `recognition-parse-failed` diagnosticを記録して、記述された完全なsource、
  comparison eligibility、成功した別recognitionを`partial` generationで利用可能に保つ。1 fileに限定されない
  failureは代わりに該当attemptをfailさせ、request-owningな
  boundaryで通常のerrorとして報告する。Parser/presentation stepは環境変数参照の解決、credential detection、masking、redactionを行わない。Authored literalのdecodeは機械的であり、decoded valueはnatural-language interpretation、
  rank、validity/correctness/effectiveness/compliance/quality verdict、remediation adviceを一切保持しない。同じ禁止は、
  すべてのinventory、detail、comparison、Global-control、Diagnostic、API、CLI、documentation
  projectionへ適用する。
- Node hostはdevframe 0.7.5とする。CLIは`devframe/adapters/dev`の`createDevServer`でapp definitionを
  起動し、`auth: false`を設定してloopbackの`localhost`だけへbindする。devframeはbuild済みSPAを`cli.distDir`
  （`dist/public`）から配信し、port選択とhost bindingを所有する。起動時のbrowser openはproductが
  所有し — macOSのChromium tab再利用を`open` packageのhelperの前段に置く（research.md § 3）—、
  devframeのbundled openerは無効化される。Session APIは
  app definitionの`setup`（`src/server/host/devframe-app.ts`）で`defineRpcFunction`により宣言するdevframe RPC
  functionの集合とする。同じchannelにはdevframe自身のbuilt-in（`devframe:agent:*`、
  `devframe:rpc:server-state:*`、`devframe:streaming:*`）もframeworkが無条件に登録するが、この
  productはそれらを空・未使用のまま残し、editor/finder helper（`devframe:open-in-editor`、
  `devframe:open-in-finder`）はこのproductがimportしないopt-in recipeに属する。Productは
  per-session token、Origin/Host check、hand-writtenなrouter、product所有の
  static-file layerを追加しない。保護はloopback bindであり、認証なしloopback
  hostの残存exposure
  （他のlocal processと、DNS rebinding経由の悪意あるweb page）はConstitution § Quality and Safety Standardsが記録する
  documented limitationとする。devframeはWebSocket upgradeへ自身のorigin gateを適用しており、
  それがproduct所有のcheckを置かない理由である。ただしそのlimitationを有界化するものではない
  （research.md § 8）。`package.json.bin`は`dist/cli.mjs`を直接指す。
  Node.js互換性はpacked `engines.node` range `^24.11.0 || ^26.0.0`だけで宣言し、package managerの
  engines機構でenforceする。CLIは宣言済みstringも実行中versionも再検査せず、packed exactな
  stringはruntimeで再比較せずpackage testでassertする。
  Session API payloadはcaller指定filesystem pathではなくIDを使用する。RPC handlerのunexpected failureは
  handlerからpropagateし、devframeがserializeするままdevframe channelを渡る。Sanitizing wrapperやgeneric error
  envelopeは存在せず、startup pathはcatchを持たないためownerless rejectionはprocess top levelへ到達する。
  Global consentはI/Oなしのlexical previewを使い、serverはそれをopaque `previewId`で識別する
  唯一のrecordとして保持する。New unconsented previewごとに`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、
  `CODEX_HOME`をこの順で正確に1回ずつreadし、`undefined`だけをabsentとし、import済み
  `node:os.homedir()`をpreviewごとに正確に1回callする — 共有agent homeは常にそこから導出される（FR-013、FR-045）。Absentなtool entryだけにactive-platformの`node:path.join`と固定suffix `.copilot`、
  `.claude`、`.codex`を使い、`.agents`は同じ1回のcaptureから導出し、`HOME`/`USERPROFILE`を独自選択しない。Proposed rootはproduct定義のbyte上限ではなくsupported Node.js、browser、
  platformのstring/path facilityで表現・escapeする。Environmentがproposed rootをrecoverableに表現、escape、retain、
  serializeできない場合、そのthrow/rejectionを通常のerrorとして変更せずpreviewのsession-API request boundaryへ
  伝播させ、preview、authority、job、retained failure stateを作成しない。Accepted entryはinternal exact raw
  `lexicalRoot`もescaped displayと並べて同じrecordに保持する。Enableは保存済みraw valueだけを使い、`displayRoot`を逆変換せずenvironmentを
  再読込しない。
- 起動時のbrowser openはproductがstartup openerを通じて所有する。CLIは、hostがFR-022で許可された
  closedなchild-process surface — macOSでは固定のprocess一覧probeと、OSの`osascript` automation host
  で実行する固定のtab再利用scriptを固定OS browser-launch helperの前段に置き、それ以外ではそのhelper
  だけ（research.md § 3）— の中でopenerを実行する前にplainなloopback originを1回表示し、devframeの
  bundled openerは無効化されてproductのopenerだけが動き、`--no-open`はchild processを一切作らずにその
  試行を無効化する。spawnされるどの呼び出しも固定の引数と表示済みloopback originだけを受け取り、
  inspection由来のcontent/path、authored value、user-supplied commandを受け取らない。
  Source root、preview root、candidate path、file path、authored valueはinspection stateから
  argvへも、変更なしで継承されるenvironmentへもcopyせず、そうした値とambientなenvironment textの
  lexical一致はprovenanceを変えず、read authorityを与えない。Fallback helperはnavigationだけをplatform自身の
  解決 — `$BROWSER`のようなuser自身の設定を含む — へ委譲し、固定一覧に基づく再利用の選択を超えて
  productはbrowser family/versionを選択・検証しない。再利用の成功もopenの成功もcompatibility evidenceではない。自動openが
  無効、非対応、失敗の場合、またはhandlerや解決先browserが利用不能、識別不能、release-certification
  baseline外の場合もserverは継続し、表示済みURLと`--no-open`がcertified browserでの文書化済み
  manual-open fallbackを提供する（FR-001）。Testは`open` packageの隣にproduct所有のplatform mapを再実装する
  代わりに、launch pathをinstrumentしてargv/environment boundaryを証明する。Terminalのlaunch line 1件は
  presentation outputとする。
- Session APIはinert DTOと完全なauthored valueを明示的なdetail requestにだけ返す。Bundled browserは
  fileまたはcomparisonを1つずつ要求する。注意書きも、前に立つ確認stepも持たない。sessionは
  loopback-boundでfileはユーザー自身のものだからである。したがって完全なsource text、
  declared authored metadata、authored relationship target、comparisonの両sideへは、それら明示的なrequestを
  通じてのみ到達でき、inventoryやsessionのresponseからは到達できない。Route close、通常のfile/Source removal、
  selection replacement、generation replacementは対象scopeのmodelだけをdisposeし、それ自体は中央purgeではない。
  Global disableは異なり、actionがrequest送信前に中央purgeを
  invokeし、より大きい`globalContentEpoch`またはnon-null disable fenceの観測時にもrender前に同じpurgeを繰り返す。
  AcknowledgementはAPIへ送信も永続化もしない。そもそも存在しないからである。Vue componentと
  `monaco-editor`のESM buildで
  表示し、`v-html`を使用しない。Single-file source modelとsource comparisonの両側をread-onlyとし、
  opaqueなin-memory URIを使い、`readOnly`、`domReadOnly`、`originalEditable: false`、`links: false`、
  `renderMarginRevertIcon: false`を設定し、環境変数参照を解決せず記述された完全なtextを保持する。`accessibilitySupport`は`auto`、
  `accessibilityVerbose`はenabledとし、各viewに`ariaLabel`を付ける。
  Literal source comparisonはMonaco diff editorが所有する。Tool recognitionはtoolごとに
  比較し、fileの宣言済みmetadataは1回だけ比較する — sideごとに1つのcanonical documentへ
  serializeし、それをdiff editorがsourceの傍らにmountする。kind/fieldで対応付けてVue
  componentで描画するのではない。その背後のparseは、Markdown系kindについては`(file, kind)`
  ごと、custom-agent kindについては`(file, tool)`ごとに1回であり、後者の分割はadmitした
  rule自身の読み取りである。Repository comparison acceptanceでは最初に同じRepository Source内のreadableなcurrent-generation distinctなカスタマイズファイル
  2件を使用し、正常なGlobal commit後だけ、2つのconsented homeが持つ同じrowのreadableなfileどうしの
  比較を、各owning SourceとSource-relative namespaceを維持したままUS4で検証する — 比較は1つの
  Source family内に留まるため、RepositoryとGlobalを跨ぐpairは存在しない。他contentと並行して表示するRepository/Globalの自動更新scan/status informationは、共通のkeyboard操作可能な
  pause/resumeとon-demand-refresh controlを使う。Pauseはunderlying scanを停止せず、表示/live-region statusをlast valueで
  freezeし、resumeまたは明示refreshでcurrent stateを表示する。Editorはclient-onlyとし、file/compare routeで
  lazy-loadする。Nuxt/Viteは明示的にimportしたeditor workerをsame-origin static assetとして出力し、
  basic languageごとのgrammar chunkはlazyに取得する。Language-service worker、CDN asset、
  external worker、blob workerを許可しない。Editor/model
  instanceとsubscriptionはroute close、selection replacement、source disable、generation replacement時に
  個別にdisposeする。Accessible diff viewer、意味のあるARIA label、keyboard navigation、narrow-screen
  inline viewを有効に保ち、browser testとmanual checkの両方で検証する。Browserまたはeditorが利用可能なenvironment
  capacityでdiffを計算できない場合も、記述された完全なside-by-side sourceを表示し、actionable diagnosticを示す。
  `src/app/session/client-data.ts`はshared central client-data purge実装を所有し、
  `src/app/session/view-state.ts`はloopback session API channel上で`App.vue`が描画するreactive valueを所有する。
  listenerは一切設置しない: liveness probeも、product定義のpolling interval、request timeout、retry timer、
  memory leaseも、page-lifecycle purgeも無い。transportがhost喪失を自ら報告するため、
  process lossはpollingせずにended viewになる。通常のhandler/delivery rejectionはそのrequest自身の
  errorであり、commit済みsnapshotは画面に残り、次のrefreshが成功しうる（FR-030）。Channel喪失、
  未対応のsession protocol、session mismatch、または同等のterminal full-session resetではeditor model/worker/subscriptionをdisposeし、ownerとrender済みsurfaceが保持するsession DTO/DOM/detail/comparison stateをclearして
  requestをabortし、`clientDataEpoch`をincrementしてlate responseをcontent復活ではなくno-opとしてsettleさせる。全SessionSnapshot/FileDetail
  requestはepoch、owning sequenceのcurrent generation — session snapshotは`repositoryGeneration`とnullableな
  `globalGeneration`を公開する — 該当時fileのSource-relative Path、exact request tokenをcaptureする。Owning sequenceのolder generationは無視し、
  admitted済みの自動または明示scanはそれぞれopaqueな`scanRequestId`を持ち、そのSource progressとcommitするgenerationは
  同じIDを保持する。Clientはcurrent explicit request IDを保存し、それ以前のstatusまたはinventory generationをそのrequestの
  completionとして扱わない。いずれかのsequenceのnewer generation採用前にepochをincrementし、そのsequenceの置換された
  generationが所有するdetail/editor/comparison stateをabort/disposeする。他方のsequenceのcommit済みviewは有効なままとする。Equal generationは
  current tokenを要求し、file detailはepochとowning sequenceのgenerationがcurrentのままでreadable fileが存在する場合だけ採用する。Browser storage、service
  worker、response cacheへinspected contentを永続化しない。全responseは採用済みの
  `{ sessionId, globalContentEpoch }` baselineに対してcheckする。Older epochをrejectし、equal epochかつnull fenceで
  current baselineをconfirmし、greater epochまたはnon-null fenceではrender前にfull purgeを実行する。Control-only Global recoveryと、
  同じloopback channelを通じた後続のfresh session snapshot取得はT1027が所有し、そのrecoveryはpurge前のsession dataを一切保持しない。
  SPAはpurge済みIDを保持・比較せず、
  返された`sessionId`をnew baselineとして採用し、epoch、Global control/progress、失敗した各toolのcontrol `failureCode`、
  failed requestのerrorだけから最小限のclient-side `RecoveryViewState`を構築する。Disable fenceがnon-nullならsession routeはexactで
  control-onlyな`GlobalFenceRecoverySnapshot`を返す。Fenceがnullならnormal full `SessionSnapshot`を返すが、recovering clientは
  そのcontrol/error fieldだけを採用してinspection graphを破棄する。Activeなら
  そのviewからdisableを直ちに利用でき、matching frozen consent previewを取得・検証してからretry controlを再構築する。
  Recovery viewはdisable fenceがnullでnormal full snapshotを取得可能な場合だけ明示Resume inspection actionを提示し、matching sessionを再取得してdefault
  stateのfresh inventory summaryを構築するが、old detail、comparison、editor、selection、filter、authored sourceを
  復元しない。後のdetail/comparison openはfresh sessionから改めて取得する。再adoptionできない
  session（host processが消滅または置換された場合）はendedのままとし、表示済みURLを開き直すnext stepを維持する。
- 単一coordinatorがcancellable `GlobalEnableOperation`のadmissionとその単一`GlobalBatchScan`、Repository scan、後続の
  明示的なsingle-Source Global rescan、Global-disable transactionをserializeし、scanをoverlapさせずgenerationを
  interleaveさせない。Queue/operation capacityはNode.jsと現在のprocess environmentから継承し、Inspectorはcommand slot、
  queue depth、handle count、admission byteのquotaを定義しない。Global disableはordinary workと独立してacceptし、既存disable
  transactionへjoinできるpriority security barrierとする。
  1つのconsent recordは常にfixed closed-order tuple `[copilot, claude, codex, agents]`をpreviewし、UI/APIのper-tool selectorを
  持たない1つのall-tools confirmation actionを提供する。`confirmedTools`は、lexical previewがinvalidなfrozen entryも含む
  この完全なtupleとし、eligibilityによってconsentをnarrowしない。Serverはtuple memberごとにinternal `GlobalToolControl`を
  1つ所有する。Filesystem I/Oを伴わないrequest/`previewId` validation後も、initial enableはfrozen consentと4 controlすべてを
  root admission中operation-localかつ観測不能に保ち、session `globalControl`またはpending stateをまだ作成しない。Retryは
  existing active consent/control stateを正確なpre-operation snapshotとして使用する。どちらもnew root contextとcandidate
  Source/boundary IDをoperation-localに保つ。Owned toolすべてが決定的なadmission outcomeに達した後の1回のcoordinator decisionで
  initial consent/controlをactivateするかretry partitionを適用し、rootをadmitした場合だけ全contextをattachして1 batchへ
  transferする。その後もbatch scan resultとgraph recordは1回のgeneration commitまでtentativeのままにする。
  Initial enableはfrozen entry 4件すべてを試行する。Retryは同じfixed tupleから、non-pending unpublished `admitted` controlと
  `retryDisposition: same-preview`の`rejected` controlで構成するfixed-order `retryableTools` projection全体をserver側でderiveする。
  Published、pending、lexicalな`new-preview-required` controlを除外し、requestはtargetを追加、omit、reorderできない。
  Admissionはserver所有のsetを、決定的なrejected subsetと
  0〜4件のrootからなるadmitted subsetへpartitionする。Lexicalにinvalidなentry、またはmissingか
  readableなdirectoryでないconsent済みrootはそのrootだけを除外し（closed admission outcomeに従って
  absentまたはfailedとして記録する）、admit可能なsiblingを続行させる。それ以外のunexpectedなthrowまたは
  rejectionは通常のerrorとしてattemptをfailさせ、enable/retry transaction全体を
  abortする。全siblingのtentative context/resultを破棄し、admitted subsetを一切commitせず、正確なpre-operation snapshotを
  復元する。Initial enableのsnapshotにはactive consent/controlが存在せず、retryではpre-existing consent/controlをtentativeな
  root authorityなしでretry/disable用に保持する。
  Admit済みsubsetがemptyでoperationのthrow/rejectがない場合、coordinatorは決定的にrejectされたcontrolを記録して
  `active-no-job`を返し、`scanRequestId`、scan job、Source、generationを作らない。1件以上のrootをadmitした場合は、全admitted
  contextとcandidate IDを各controlへatomicにattachし、一緒に、1つの`scanRequestId`、1つのpublication authority、1つの
  working setを持つ正確に1つの`GlobalBatchScan`へtransferする。そのbatchはadmit済みtool/root pairごとに独立識別された
  Global Sourceを1つassembleし、
  Copilot、Claude、Codexを1つのlogical Sourceへ結合しない。全Sourceを、
  `committable-complete`または`committable-partial`のGlobal generation commit 1回だけで一緒にpublishする。Initialまたはretryには、
  batch levelのscan job、result、観測可能なcommitが正確に1つだけ存在する。
  Admissionとbatch transfer後、coordinator lock下の最後のoperation-ID/epoch/state checkでresponse dispositionをatomicに
  選択する。Batch operationがraceに勝てばshared `scanRequestId`付きのqueued acceptanceを返し、全件reject operationなら
  `active-no-job`を返す。Disable barrierが先なら固定の`global-disable-pending` conflictを返してdrainingへ入り、operation-local cleanup後だけunregisterし、
  late mutation/leakを生じさせない。
  Sessionの`globalControl` DTOはroot authorityを公開せず、fixed confirmed tupleとpending/retryable toolを識別する。
  Active-consent retryはvalidation/admissionをoperation-localに保ち、新たにvisibleとなるのはauthority-freeな
  `globalEnableInProgress`だけとする。Exact pre-operation `globalControl`、`pendingTools`、`retryableTools`、batch、diagnostic projectionは
  変更しない。Atomicなqueued acceptanceだけが`pendingTools`をexact admitted accepted-batch subsetへreplaceし、matching
  `batchStatus`/shared request IDをinstallする。`active-no-job`ではpendingをempty、batch statusをnullのままcontrol outcomeをatomicに
  commitする。Initial enableは最後のatomic activationまで全provisional valueをoperation-localに保って`globalControl`を作らず、
  その後はaccept済みbatchのtoolだけをpendingとして表示する。`unvalidated`はnon-serializedなoperation-local workだけに存在し、
  accepted pending controlはすべて既に`admitted`で、activeなserialized viewは`unvalidated`を含まない。Workが1件でもpendingの間、retryable toolは情報表示だけとし、`globalEnableInProgress`がnull、
  `pendingTools`がempty、matching previewがverified、`retryableTools`がnonemptyの場合だけretryを提示する一方、disableは直ちに
  利用できる。Consent-preview routeはclient purge後もfrozen active previewを返す。
  Ordinary workはFIFO、Global disableはpriority security barrierとする。Non-no-op barrierの最初のaccept時にcommand epochと
  `globalContentEpoch`をatomicにincrementし、non-null `globalDisableInProgress`をinstallし、publication authorityをrevokeしてnew
  Global-enable/Global-rescan commandを拒否する。Active control snapshotが存在する場合だけ
  `globalControl.state: disabling`としてpending/retry arrayをemptyにし、operation-local initial enableだけならcontrol projectionを
  nullのままとするが、barrierはcontrol-only recovery DTOへ表示する。全ordinary inspection-data routeを
  固定の`global-disable-pending` conflictでfenceし、session routeは`GlobalFenceRecoverySnapshot`だけを返す。各inspection-data handlerはcaptureした
  `globalContentEpoch`へbindし、最終publish時にcoordinator lock下でepoch不変かつfence nullを要求し、それ以外はbodyを破棄する。Liveness handlerは
  代わりにpublish時の1つのcurrent coordinator-lock snapshotからexactな`{ sessionId, globalContentEpoch, globalDisableInProgress }`値へbindし、
  current fenceがnon-nullでも返して別tabがbarrierを観測できるようにする。
  Barrierはactive uncommitted batchをabort/discardし、enable admissionと全tentative root
  context/resultをdrainし、最後のqueued Global work cancellation sweepを行う。同じ中断Repository commandをterminal success後だけ
  正確に1回requeueする。Requeueはexactな`operationId`、`scanRequestId`、trigger owner、requested Source、queue orderを保持し、
  existing commandを`waiting`へ戻し、新しいsession-API admissionまたはinterim success statusを作成しない。PublicなGlobal consent、
  control、Source stateのいずれかがあるsuccessは`remove-active-state`を使い、Global generation sequence全体と
  そのSourceを破棄して何もcommitしない。Repository sequence、そのgeneration、そのIDには触れない。
  未公開のoperation-local initial-enableだけがcleanup-only successを使い、committed stateを何も変えずに
  fenceをremoveする。
  Disable、shutdown、明示的cancellation後のpending workはcleanupだけを行い、late resultをpublish/interleaveしない。Drain、
  closeが完了した後だけdisableは成功する。Accept後failureではprocessを維持する一方、
  data fence、failed requestのerror、retry/join controlを保持し、unrecoverable cleanupではrestartをfallbackとする。Accept前failureまたは
  true no-opはfenceをnullのままにする。Event loopが処理できる間はAPI handlingを継続するが、underlying promiseが
  settleする前にdisableがphysical drain完了をclaimしてはならない。
  Global batchはGlobal generation sequenceだけを所有し、全admitted replacementを別に構築する。正常なcompleteまたは
  partial batchは正確に1つのGlobal generationをcommitする — Global generationが存在しなければsequenceをgeneration 1で
  作成し、存在すればその最後のcommit済みsnapshotから前進させる。Assemble済みGlobal Sourceをすべてatomicにpublishし、
  参加controlの該当failure stateだけをclearし、oldなGlobalの
  detail DTO、comparison selection、editor stateを1回無効化する — file identityはSource-relative Pathであり、
  commitを跨いで安定である。Repository stateはcommitに含まれない: Repository
  sequence、そのgeneration、そのviewには触れない。全件rejectのenable/retryはgenerationをcommitせず、commit済みの
  stateを変更しない。同じcoordinator lockで全SessionSnapshot/FileDetail envelopeのsequence generation/payloadをlinearizeし、後のnetwork
  deliveryでmix/relabelさせない。
  後続の明示rescanは既存Source 1件に対するsingle jobのままとし、同じcomplete/partial ruleでowning sequenceのreplacement generationを
  1つcommitできる。成功時はそのSourceのstale-failure entryとlifecycle diagnosticだけをclearし、別Sourceのfailureを保持する。
  Fatal failureではそのSourceだけのstale overlayを作成または置換しなければならない。Accept済みthrow/rejectionではfailed requestの
  error messageを保存し、決定的なreturned fatal outcomeではlifecycle `Diagnostic`を参照する。このsingle-Source rescan pathは、
  initial enableまたはretryに対するatomic batch要件を変更しない。
  Global batch中のunexpectedなthrowまたはrejectionはdomain resultを生成せず、triggerを所有するsession-API request boundaryで
  通常のerrorとしてpropagateする。Job
  accept前なら`scanRequestId`を作らず、accept後なら1つのshared requestをfailed requestのerrorで
  terminateする。どちらもtentativeなsibling Source/resultを一切commitせず、最後にcommitしたgenerationとIDを維持し、まだ
  uncommittedなtool用`StaleSourceFailure`を追加せず、正確なpre-operation consent/control、admit済みroot contextとcandidate
  ID、以前のtool別graphをretry/disable用に保持する。自動の初回Repository scanのfatal failureでは、別途bootstrap generation
  0をcurrentのままにする。Global disableはcontrol所有のlifecycle diagnosticを削除し、retained root contextをすべて
  close/removeして全control、consent record、frozen previewを削除する。
  保持する各Diagnosticはgeneration/session-lifecycleのlifetimeと独立して、正確に1つのattachment scopeを使う。File scopeは
  matching `sourceId`とSource-relative Pathを必須とし、source scopeは`sourceId`だけを必須とする。Pathlessな
  scopeは存在しない: invalidな組合せを拒否し、source-scoped recordはpathを捏造しない。未admitのGlobal tool
  のfailureはDiagnosticではなくcontrolの`failureCode`である。
  Generation 0は、capture済みの呼び出しworking directoryとoptionalな`--root`からlexicalに選択したexact 1つのidleな
  Repository Sourceを持ち、file/diagnosticを持たないcommit済みzero-I/O bootstrap snapshotとし、初回fatal attemptでもlegalな
  retained current baseを持つ。明示Repository rescan、enabled-Global single-Source rescan、Global batchは同じqueue ruleを使う。
  Global disableの再要求は既存barrierへjoinし、member Global Source/graph、active consent record、retained admitted Global
  root context、running/queued Global scan/enable command、retained disable failureが何もない場合は、
  無関係なRepository workの有無にかかわらず即時no-opとする。No-op分岐はfilesystemをenumerate/readせず、jobを作成せず、generation、epoch、fenceを変更しない。

### ClosedなRuntime State Table

#### Global root admission

| Input/phase                                                         | Internal transition                             | I/Oおよびpublic result                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool-home設定を`undefined`としてcapture                             | `preview-default`                               | Request全体で1回の`node:os.homedir()` captureから、active-platform `node:path.join`とtool固定`.copilot`/`.claude`/`.codex` suffixを使ってfilesystem I/Oなしでexact stringを計算し、下記ordered rowでclassifyする。このtoolをfixed four-entry confirmationに保持してauthorityを作らない |
| Capture済みenvironment設定のlengthが0                               | `inputState: present-empty` / `preview-invalid` | Environment-origin valueだけに最初に適用する。Entryをfixed four-entry confirmationに保持し、fallbackもfilesystem/network I/Oも行わず、そのentry用root、Source、job、generationを作らない                                                                                               |
| それ以外でexact stringがU+0000またはunpaired UTF-16 surrogateを含む | `inputState: invalid` / `preview-invalid`       | `path.isAbsolute`より前にrejectし、filesystem/network I/O 0件かつauthorityなしでinvalid preview entryだけを保持する                                                                                                                                                                    |
| それ以外でactive-platform `node:path.isAbsolute`がfalseを返す       | `inputState: relative` / `preview-invalid`      | Filesystem/network I/O 0件でrelative preview entryを保持し、normalize、resolve、fallback、authority作成を行わない                                                                                                                                                                      |
| それ以外（通常のhome外を含むabsolute string）                       | `inputState: eligible` / `preview-eligible`     | 保存するexact raw lexical valueをfilesystem/network I/Oなしでescapeしてserver保持preview recordに保持し、fixed four-entry confirmationに保持して1回のall-tools consent actionを待つ。このrowだけがconsent後admissionへ進める                                                           |
| Consentがstale、replayed、またはsupersededな`previewId`を指名       | `consent-rejected`                              | Proposed-root I/Oを行わず、authorityを作らない                                                                                                                                                                                                                                         |
| Consent済みrootがmissing、またはreadableなdirectoryでない           | `absent`または`root-rejected`                   | そのSourceを作らず、sibling memberをblockせずにそのmemberをabsentまたはfailedとして記録する。initialでは全4 member、retryではexact `retryableTools`というcurrent server-owned setのpartitionを続行する                                                                                 |
| Proposed-root operationがunexpectedにthrowまたはreject              | 通常のerror propagation                         | Global transaction全体をabortし、全provisional sibling context/resultを破棄し、admitted subsetを一切publishせず以前のsnapshotを保持する                                                                                                                                                |
| 1件以上のrootでconsent後admissionが成功                             | `root-admitted` batch subset                    | 全admitted context/IDを各controlへatomicにattachし、一緒に1つの`GlobalBatchScan`へtransferして、その1回のatomic commit前にpublic Source/graphを作らない                                                                                                                                |

#### Byteのdecoding

| Byteのcondition                                               | `encoding`       | Sourceおよびrecognition state                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0x00` byteが1つ以上                                          | `binary`         | `sourceText`、parser dispatch、recognition extraction、comparison eligibilityなし。admit済みcandidateはfile-scoped `file-content-binary` diagnosticを持つdiagnostic-only itemとなり、otherwise publishableなgenerationを`partial`にする。census掲載companionはdiagnosticなしのassetの通常の事実となる |
| NULなし、全byteをreplacementなしでdecode可能                  | `utf-8`          | 先頭BOMが1つあれば記録して除去し、完全な`sourceText`を保持してin-processでparseする                                                                                                                                                                                                                   |
| NULがなく、先頭BOMの有無を問わず不正なUTF-8 sequenceが1件以上 | `utf-8-replaced` | Replacement semanticsで正確に1回decodeし、先頭BOMがあれば記録・除去し、生成された全`U+FFFD`を保持して、その完全に文字化けしたtextをparsing、extraction、display、comparisonに使用する。このconditionだけではcompleteのままとする                                                                      |

#### Scan publicationおよびfailure ownership

| Terminal condition                                                                                                                                                                                                                                      | Internal outcomeおよびowner                                     | Atomicなpublic result                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Traversalが完全、readableな`utf-8-replaced` resultを含む全fileがcomplete、assembly/serializationが成功、authorityがcurrent                                                                                                                              | `committable-complete`、coordinator                             | Owning sequenceの`complete` generation 1つとcomplete responseをcommitする。Initial/retry Global batchは全admitted tool固有SourceをこのGlobal-sequence commit 1回で一緒にpublishし、Repository stateに触れない                                                                                                                                          |
| Traversalが完全、1件以上のfileがfile-confined outcome（unreadable、admit済みcandidateのbinary content、parse failure — censusが列挙したcompanionのbinary bytesはその通常の事実であり、何もconfineしない。FR-025）だけを持ち、非影響fileはすべてcomplete | `committable-partial`、scan assemblerからcoordinator            | 影響fileのdiagnosticと完全な非影響resultを持つowning sequenceの`partial` generation 1つをcommitする。Initial/retry Global batchもcommittableなadmitted subset全体をこのGlobal-sequence commit 1回でpublishする                                                                                                                                         |
| Fixed-four Global admissionが全rootを決定的にreject                                                                                                                                                                                                     | `active-no-job`、Global coordinator                             | Active consent/controlを保持し、`scanRequestId`、batch、Source、generationを作らず、既存のcommit済み全IDを正確に維持する                                                                                                                                                                                                                               |
| 選択済みRepository rootが存在しない、またはdirectoryとしてreadできない                                                                                                                                                                                  | 決定的なfatal outcome、coordinator                              | Source-scoped `root-unreadable` diagnosticでattemptをfailさせ、sessionは利用可能なまま残す。何もcommitせず、partial inventoryをpublishせず、以前のsnapshotを維持する。Attemptが明示rescanの場合に限り、retained snapshotをそのSourceについてstaleとしてmarkする                                                                                        |
| 1 fileに限定されない他の理由でattemptがcommit前にfail                                                                                                                                                                                                   | その`scanRequestId`の`failed`、所有session-API request boundary | 全tentative Global batch siblingを含め、attemptから何もcommitしない。Failed requestのerrorを通常どおり報告する（job accept前は`scanRequestId`をnullとする）。以前のcommit済みsnapshotを維持する。Accept済みjobが明示rescanの場合に限り、そのSourceのstale overlayを作成または置換してそのerrorのmessageを保存する。Process/sessionを利用可能なまま保つ |
| Request ownerを持たない自動startup workがfail                                                                                                                                                                                                           | Process top levelへのpropagation                                | Attempt resultまたはgenerationをpublishせず、process/sessionのsurvivalを保証しない。Runtimeの通常のuncaught-error報告を適用する                                                                                                                                                                                                                        |
| Disable/shutdown/supersession/failureがauthorityをrevoke                                                                                                                                                                                                | `revoked`、coordinator                                          | Late byte、extraction、diagnostic、DTO、graph mutationをすべて破棄し、revokeされたrequestから何もcommitしない                                                                                                                                                                                                                                          |
| Atomic commit後にtransportが失敗                                                                                                                                                                                                                        | 既存のcommit済みoutcome、host                                   | Truncated bodyをpartialとしてrelabelまたは公開せず、commit済みgenerationのloopback session API経由のrefetchを許可する                                                                                                                                                                                                                                  |

## 複雑さの追跡

Trusted-workspace clarification（spec Clarifications § Session 2026-07-22）により、正当化すべき
adversarial-file inspection機構は存在しないため、この表にそのrowはない。devframe採用
（spec Clarifications § Session 2026-07-22、Constitution § Quality and Safety Standards）により、per-session capability token、
product所有のOrigin check、hand-writtenなHTTP router、static-manifest/CSP pipelineのrowも同様に存在しない。
log-content ruleもsanitized error envelopeも定義しない（spec Clarifications § Session 2026-07-22、Constitution § Quality and Safety Standards）ため、
generic error-envelopeもoperational-log/telemetry機構も存在せず、それらのrowも同様に存在しない。
残る避けられない実装costを明示的に追跡する。

| 複雑さ                                                                                                             | 必要な理由                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 不採用とした単純案                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lockfile所有transitive（h3 2.0.1-rc.22 release candidateを含む）を持つlockfile-pinnedなpre-1.0 devframe 0.7.5 host | Hand-writtenなrouter、token authentication、static-manifest pipelineを維持する代わりに、config-inspectorで実証済みのlocal-tool hostをstatic配信とRPC session APIに再利用する。本repository自身のdevelopmentとCIの中では、公開packageが持たないcommit済みlockfileが、全build/test runでpre-1.0のAPI churnとRC transitiveを1つのreview済みbaselineに固定し、manifestの`^0.7.5`はここでの意図的なupdateが動ける受け入れrangeを宣言するだけである（pre-1.0のcaretは0.8.0未満にとどまる）。公開package consumerのpackage managerは、他の任意のpre-1.0 dependencyと同様に、install時にその同じ`^0.7.5`をregistryに対して新たにresolveする。Packageのどこもconsumerのruntime baselineを固定しない | Exactなmanifest pinは、本repository自身のbuildについてはcommit済みlockfileがそこですでに所有するresolutionを重複させるだけである — どちらでもversionの移動はreviewされるlockfile変更である — が、package consumerがresolveするものは変えない。公開tarballはどちらの場合もlockfileを運ばないためである。Hostのin-repo再実装はdevframeがすでに所有する複雑さを再現する |
| Publication-authority revocationとcleanup-onlyなlate continuation                                                  | Disable、shutdown、cancellation後に完了したworkが新しいsession stateを変更するのを防ぐ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Cancellationをphysicalなkernel-I/O terminationと扱うと未対応の保証になる                                                                                                                                                                                                                                                                                             |

これらはConstitutionの例外またはwaiverではなく、既存のclosed authority、privacy、provenance、verification原則を実装するためのboundary controlである。不採用とした単純案はそれらの原則を満たさない。

**残存riskと解消path**: Node.jsはstalled kernel filesystem operationすべてのwall-clock cancellationを保証できない。Disable、shutdown、
明示的cancellationはpublication authorityをrevokeしてlate resultを破棄し、coordinator serializationによりcommit済み
generationとのinterleaveを防ぐ。Approvalはauthority revocationをphysical cancellationやproduct定義時間内のkernel completionの
証明として記述してはならない。このresidualを除去するには、将来のpublicなcancellable filesystem primitive、またはterminate/drain可能な
OS-enforced read-only worker/sandboxを採用し、resource-leakとdisable-raceのtestを更新する必要がある。
