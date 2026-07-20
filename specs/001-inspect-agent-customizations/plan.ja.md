# 実装計画: エージェントカスタマイズの調査

[English](plan.md)

**ブランチ**: `dev` | **日付**: 2026-07-20 | **仕様**: [spec.ja.md](spec.ja.md)

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
enumerate/readできる唯一の経路とする。Registry指向の`node:fs/promises` traversal、canonical path check、opaqueな
scan ticket、同じ`FileHandle`でのread前後のidentity/metadata checkを使用する。Browserは記述された完全な
sourceをread-only Monaco editorで表示し、source比較にはMonaco diff editorを使う。Recognition metadataは
tool/kind/field/occurrenceで対応付け、parser-normalized表示値ではなくexact authored literalを通常のVue componentで比較・表示する。

選択されたRepository rootは、session bootstrap前にfilesystem I/Oなしでcaptureする。CLIは`process.cwd()`を1回captureし、
`--cwd`省略時はそのexact stringを使う。Windowsではexplicit UNC/server-share/device、current-drive/root-relative、
`C:`/`C:foo`を含むdrive-relative valueを`resolve`前にrejectし、plain relative optionだけをanchored captureに対して
resolveし、absolute drive optionは保持する。POSIXはabsolute optionを保持するかrelative optionをcaptureに対してresolveする。
Selected absolute resultはshared pure `LexicalAbsoluteRootParts` parserにfilesystem/network I/O 0件で合格しなければならない。
CLIは`process.chdir()`を呼ばずper-drive working directoryも使わない。Missing、empty、duplicate、pre-resolution-invalid、
parser-rejected valueはsession作成またはbrowser起動より前にfailする。Bootstrap
generation 0は、stableな`sourceId`とescape済みでauthorityを与えないroot labelを持つ1つのRepository Sourceを
synchronousに含み、その後の中央boundary admissionだけがread authorityを付与できる。

Security boundaryを厳密にする。Browserはfilesystemを読まず、Node hostは
カスタマイズファイルをdynamic importせず、初期リリースにはstatic export、MCP、remote host、
自動watch modeを設けない。Loopback限定hostはprocessごとのrandom capabilityで保護したversioned
HTTP APIを通じてinert DTOを送る。APIはcapability認証済みの明示的なdetail requestにだけ、完全な
authored sourceとdeclared authored valueを含む`FileDetail`を返す。Bundled browserはclient memory内で
機密contentへのacknowledgementを保持し、acknowledgement後にだけそのrequestを行うかcomparisonを構築する。
このacknowledgementはpresentation
invariantであり、APIのauthorization factorではない。環境変数参照はリテラルtextのまま保持し、process
environmentのlookupまたは置換を認可しない。
明示的scanは凍結したinspection path allowlistを使用し、symlink traversalを拒否し、inertなbest-effort parserを
使用してin-memory generationをatomicに置換するため、古いgeneration所有のdetail/comparisonは正常rescanを
越えて残らない。Fatal rescanはuncommitted resultを1件もpublishせず、最後にcommitしたsnapshotを明示的な
Source別stale-failure entryとactionableなlifecycle diagnostic付きで、そのSourceがrefreshまたは除去されるまで保持する。

Customization discoveryは、文書化済みvendor lookup behavior（`behaviorId`）、Inspector matcher/read policy
（`ruleId`）、runtime composition strategy（`strategyId`）、official source record（`sourceId`）という4つの
contract-versioned registryとして保守する。
共通allowlist contractはmatcher grammarとsafety invariant、Copilot・Claude・Codexの個別contractはvendor
behaviorとtool固有rule、composition contractはorderとrelationship-only rule、source registryは正確な公式
URL/section evidenceとreview metadataを所有する。RepositoryとUser/Global behaviorは別表とし、Copilotの
VS Code、CLI、Cloud surfaceを1つのlookup modelへcollapseしない。
VS Code 1.118以降については、Copilot contractが既存のexact `./.vscode/mcp.json` ruleと並べてexactな
root `./.mcp.json` Inspector ruleを追加する。Version付きrelease noteは新しいroot pathとmost-specific
same-name ruleを確立する一方、current guideは`.vscode/mcp.json`とUser configurationを網羅的locationとして
提示し続ける。そのためbehavior/strategyは`conflict`を保持し、root provenanceはpath/surface-onlyで
VS Code所有extractor fieldを追加せず、schemaとtotal orderをunknownのままにする。CLI descendant ruleが
同じphysical root fileをすでにadmitするため、両compatible provenanceは1つの`(fileId, copilot, MCP)`
recognitionと1回のverified readへmergeする。

Userへ公開するinventory/API filesystem locatorのうち、inventory済みcustomization fileまたはowning Source内で
安全にnormalizeされたtargetを識別するものはすべて、そのSourceの1つのrootから計算したSource-relative Pathとする。
これにはprimary/alias file path、provenance path、non-nullのnormalized relationship target、comparison/filter label、
file-scoped Diagnostic locationを含む。Repository Sourceの場合だけrepository-relativeであり、各Global Sourceは
自身のadmit済みtool-home rootを使い、別Sourceとpath namespaceを共有しない。Authored literalは別のsurfaceで、
記述どおり正確に表示する。

Root labelは別のpresentation surfaceとする。Enabled `SourceBoundary.displayRoot`はそのSource rootのone-way
escaped presentationである。`GlobalConsentPreview.entries[].displayRoot`はowning Sourceがまだ存在しないadmission前に
originを持つproposed lexical rootのone-way escaped presentationで、absoluteまたはinvalidになり得る。どちらも
`SourceRelativePath`ではなく、inventory itemを識別せず、read authorityを与えず、operational logに入れない。

全Inspector Repository matcherは選択されたRepository rootを明示baseとし、`./`から始めて表記する。Bareな`**/`はinvalidで、
`./**/`が意味するのは下向きInspector descendant inventoryだけであり、vendor traversalではない。Static
candidate、vendor-specific one-edge derivation、relationship-only reference、exclusionを分離する。File存在と
product surface、runtime root/`cwd`、target match、trust、enablement、selection、installation、managed policy、
external runtime factを別に保ち、inventoryをeffective agent configurationに見せない。Originating fileを
持たないhosted/runtime inputは、関連Sourceに紐づくevidence-linkedな`SourceConditionFact`とし、
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
`/speckit.plan`、続いて`/speckit.tasks`を再実行する。Configuration、CI、release、package-policy
instructionは、その1つの同期済みbaselineだけを使用しなければならない（MUST）。

**Dependencyおよび破壊的変更の移行gate**: このinitial-release baselineは、移行対象となる以前の公開済み
Inspector package、public contract、永続profile、user dataが存在しないため、planned migration impactを
noneとする。T001はpackageまたはconfiguration作業前に、`research.md`の`**Migration impact**` section、
`research.ja.md`の`**移行影響**` section、および`plan.md`/`plan.ja.md`の対応する
`**Dependency and breaking-change migration gate**`/`**Dependencyおよび破壊的変更の移行gate**` sectionで
この判断を確認しなければならず（MUST）、
その正確な英日section pairをdesign evidenceの記録先とする。影響を受けるconsumerまたは以前のcontractが
見つかった場合は判断を無効としてimplementationを停止し、replanningする。Acceptする新規・変更dependency
および破壊的なpublic-contract変更はすべて、理由とmigration impactを記録しなければならない（MUST）。
Design evidenceはimplementation前、対応する`validation.md`/`validation.ja.md` evidenceはrelease前に存在しなければ
ならない（MUST）。各recordには影響を受けるconsumer、contract、data、workflow、必要な移行手順と
compatibility/support window、rollback/support pathを含めるか、理由付きの明示的なno-impact判断を記載する。
英日design evidenceが欠落またはstaleならT002をblockし、英日validation evidenceが欠落すればrelease gateをfailする。

`src/cli.ts`はGunshiのstableなroot `define`/`cli` APIだけを使用する。Negatableな`open` booleanを
default trueとして定義して`--no-open`を提供し、単一のstring-valued `cwd` optionで`--cwd <path>`を提供する。
`strict: true`を有効にし、bind前にすべてのpositional/rest argumentを明示的に拒否し、`cli()`をawaitし、
validation `AggregateError`を固定されたactionable outputとnonzero exitへ対応付ける。Session作成前に
`process.cwd()`を正確に1回captureし、emptyまたはduplicateな`--cwd`を拒否する。Windowsではleading separator 2個の
全UNC/server-share/device spelling、single-separator current-drive/root-relative value、`C:`/`C:foo`などのdrive-relative
valueを`resolve`前にrejectし、plain relative optionだけをcapture済みanchored drive-form valueに対してresolveし、absolute
drive optionは保持する。POSIXはabsolute optionを保持するかrelative optionをcaptureに対してresolveする。Option省略時の
captureを含む結果のabsolute stringは、Global previewと中央admissionが再利用するshared pure `LexicalAbsoluteRootParts` parserへ
合格しなければならない。Selectionはfilesystem/network I/O 0件で、process working directoryを変更せず、per-drive
working-directory semanticsを使わない。Built-in help/versionはbindせずに処理する。Production entryは`gunshi/agent`、
lazy command、custom plugin、experimental parser combinatorをimportしない。

**ストレージ**: 永続的application storageは使用しない。Session state、調査対象file byte、記述された完全な
source DTO、diagnostic、機密content警告のacknowledgement、comparison selectionはprocess/browser memoryだけに存在する。

**テスト**: Vitest 4.1.10と`@vitest/coverage-v8` 4.1.10、Nuxt Test Utils 4.0.3、
Vue Test Utils 2.4.11、happy-dom 20.10.6、Playwright 1.61.1、
`@axe-core/playwright` 4.12.1。Fixture駆動のunit、contract、integration、packaging、
performance、security、browser testとmanual accessibility checkを使用する。`vitest.config.ts`にはunit、contract、
integration、security、package、performance、coverageのnamed projectを定義する。Security projectはT996のGlobal
zero-activation testを含む`tests/security/**/*.test.ts`だけをincludeし、その他のprojectはこのrootをexcludeして、
root security testを正確に1回ずつ実行する。`tests/integration/security/`配下のsecurity testはintegration projectが
引き続き所有する。Browser release gateは、pinした
Playwright versionがinstallする正確なChromium、Firefox、WebKit revisionでprimary-workflowとaccessibilityの
完全なsuiteを、startup helperがそのrevisionを選ぶという主張ではなく再現可能なautomated certification baselineとして実行する。
日英の`contracts/accessibility-acceptance.md`と`contracts/accessibility-acceptance.ja.md`のmatrixはWCAG 2.2 Level A/AAの全55 criterionをinventoryし、各rowについて
Applicableまたはcriterion固有の理由を持つNot-applicable stateと必須のautomated/manual evidenceを確定し、0件ではない
Applicable row数をSC-008 denominatorにする。全Applicable rowの必須check、全Not-applicable rationaleの再validation、4つの
keyboard workflow、英日recordの意味的等価性がすべてpassした場合だけrelease gateをpassし、severity labelでfailureを免除しない。
Criterion固有のstable IDでautomated checkをexact E2E test titleへ、manual checkを各rowのexpected observationへbindする。
Closed manual matrixはpacked tarball、両locale、3つのsupported OS/browser/assistive-technology cell、正確なresponsive/zoom/spacing
profile、visual mode、workflow state、input profileを使う。実行前にactual version/revision valueをfreezeし、releaseまたはmatrixを
変更した場合は全manual checkを再実行し、applicableなcellをsamplingまたは暗黙省略しない。SC-003、SC-004、SC-005、SC-007、
SC-009では、check-in済みの`tests/fixtures/outcomes/manifest.json`とcanonicalな
`tests/fixtures/outcomes/manifest.sha256`を、version付きでclosedな1つのrelease-evidence denominatorとして使用する。
Manifestの各caseは、一意でstableなID、criterionとrequired-classのmembership、fixtureまたは決定的builderへのreference、
客観的expected outcome、参照する全fixture byteのdigestを持つ。Contract testはcanonical digestを再計算し、schema/version error、
missing/duplicate/undeclared case、fixture digest drift、required classの空集合、fixture欠落、declaredした非ゼロminimum未満の
denominatorを拒否する。Caseのremove/reclassify、required-class定義またはexpected outcomeの変更ではmanifest versionをincrementして明示的なreviewを受け、fixture byteだけの変更では影響するfixture digestとcanonical manifest digestの両方を更新する。`manifestVersion`は1から始まるpositive safe integerとする。Contractは`tests/contract/outcome-fixture-manifest.test.ts`内のtable-drivenなprevious/current manifest objectを使い、current versionがprevious versionより大きくないdenominator-semantics変更と、両digestを更新しないfixture-byte-only変更を拒否する。VCS、network、reviewer stateを調査せず、human reviewを立証しない。T1062が実際の初回作成またはprior/current version、変更したdenominator semantics、reviewer decision/referenceをbilingual release validationへ別に記録する。どちらの変更も新しい直接比較不能なmeasurement setを開始する。Required classは、SC-003ではexactなtool/kind/admitted-source row、rejected selector family、shared-file
combination、SC-004ではprohibited effect、Repository/Global boundary rejection、検出可能read-change class、SC-005ではexactな
tool/kind/source row、source/comparison surface、literal-credential/environment-reference class、set/unset referenced-variable state、
SC-007では名称付きfailureとfirst/explicit-rescan lifecycle class、SC-009では保守するすべてのSource Condition Fact row、tool、
product surface、documented/unavailable stateとする。Release recordはmanifest version/digestと実行した全case IDを示し、missing、
omitted、unexecuted、mismatched evidenceは該当criterionをfailureにする。
保守するusability study kitは、
SC-001、SC-006の順に同じ初回利用者20人cohortを使い、固定promptとmoderator制限、差し替えなしでfailureを不成功へ
算入するrule、定義済みtimer boundary、固定ground truthで採点するSC-006の4項目response formを含む。
時間計測したSC-006回答後、同じ参加者が標準化されたcomparisonとGlobal consentの課題を実施する。Moderatorは
客観的workflow outcomeと事前定義済みsafety eventを記録する。Study equipmentはSC-004のproduct network/URL/MCP
instrumentation、exact-authorityのInspector-server request ledger、study-browser request captureをSC-001前のInspector launchから
4つの観察完了まで継続する。Process identity、発行済みのexact authority、request initiator/target、server-ledgerの相関により、
Inspector/bundled-SPA trafficをexactな2つのauthorized internal loopback classまたは禁止対象へ漏れなく分類する。無関係な
extension/host-process trafficと観測できるOS-mediated mounted/mapped-source trafficは別に記録し、帰属できるが分類できないtrafficは
2つのclass外とする。全safety eventを自動的にcriticalとする。Product起因と
疑われるworkflow blockerだけを2人がrubricに対して独立分類し、不一致は第3の裁定者なしでcriticalとして数える。
Gateは20人全員が4つのprimary workflowすべてを実施し、自動判定またはreviewer確認済みcritical issueが1件もない
場合だけ合格とする。Maintainer teamが公開study planを通じてrecruitment、compensation funding、moderation、review、
consent/privacy handling、提供equipment/session support、bilingual material、accessibility accommodationを担当し、通常の
contributorには負わせない。各study sessionではactualなdefault handlerまたはその利用不能状態と、解決可能な場合はactualな
browser family/revisionを記録する。Automatic openingがdisabled、unsupported、または失敗した場合、handlerまたは解決先browserが
利用不能もしくは識別不能な場合、または解決先browserがrelease-certification baseline外の場合は、同じenrollment済みsession内で
certified browserによる文書化済みmanual-open fallbackを使用・記録し、そのsessionを固定denominatorに残してparticipantを
置き換えない。Default handler自体がcertifiedである必要はない。

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
baseline外のhandler、利用不能なhandler、または識別不能な解決先browserの場合、自動openはbest-effortのままとし、表示済みURLと
`--no-open`を使ってcertified browserでmanual openすることをactionable fallbackとする。公開project/dependency package payloadとproject-authored installed application codeはplatform非依存の
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
queue済みであること、active phase名、またはcomplete/`partial`（contracted-partialのみ）/failedのいずれかを示しassistive technologyにも公開される
statusを1秒以内にbrowserへ表示し、内容を変更しない1つのdeterministic fixture（100,000 filesystem entry、500 matching
file）について、正確に10回のfresh-process runのうち9回以上で10秒以内に完全なinventoryを表示して主要なlist controlを
操作可能にする。Spinner、generic loading label、scan stateのないacknowledgement、変化しないcontrol、以前のrequestのstatusは
qualifyしない。各fresh processでは自動の初回Repository scanがterminal stateへ到達するまでmeasurement外で待ち、
その後、明示的なRepository rescanを正確に1件dispatchする。両timerはそのbrowser requestで開始し、そのopaqueな
`scanRequestId`をcaptureして、そのIDを持つqualifying statusと、その同じrequestがcommitした操作可能なinventory
generationについてだけ停止する。それ以前のstatus、snapshot、自動scan generationはqualifyしない。Fixture構築、
`npx` download/install/process起動、自動の初回scanは除外し、run間でoperating systemのfilesystem cacheを意図的に
resetしない。Profile ID、実際のenvironment field、fixture-manifest digest、request ID、commit済みgenerationを記録し、
personal identifierとabsolute user pathだけを省略する。Profile fieldを変更すると新しい直接比較不能なmeasurement setを開始する。
各runで完全なinventoryが
操作可能になった後、標準化されたfilter actionとitem-selection actionを1回ずつ実施する。各actionはbrowserの
input dispatchから、対応するfiltered resultまたはselected-state feedbackが表示され操作可能になるまでを測定し、
同じ10回のrunのうち9回以上で両interactionを100 ms未満にする。
SC-002は、その正確な10回のうち同一の9回以上が、現在requestのstatusを1秒以内、完全で操作可能なinventoryを
10秒以内、filter feedbackを100 ms未満、selection feedbackを100 ms未満という4つすべての閾値を満たす場合だけ合格とする。
閾値ごとに異なる9/10のsubsetを使ってはならない。

**制約**: 調査対象カスタマイズによりexecution、child process、dynamic import、FR-022で定義した禁止対象のdirect product-issued network request、MCP connection、
product-issued source mutationを発生させない。発行済みのexactな`127.0.0.1` authorityにおける2つのexactなFR-022 browser/host class、
すなわちclosedなunauthenticated static/SPA `GET`/`HEAD`とcapability-authenticated declared API requestはauthorized internal loopback
transportであり、outbound requestでもMCP connectionでもない。この2 class外のrequest、customization-selected request、MCP requestはすべて禁止対象のままとする。
Lexicalに識別不能なpre-mounted POSIX network filesystemまたはmapped Windows driveへの通常の
Node.js filesystem I/OはOS-mediated trafficを発生させ得るため明示的なplatform/environment limitationとし、explicit UNC/server-share/device spellingは
filesystem、DNS、SMB callより前にrejectする。Inspected-source I/O boundaryはwrite/append/create/truncate open、
write、truncate、create、rename、delete、link、mode/ownership/time/xattr/ACL変更、または同等のplatform mutationを
一切requestしない。Testではこれらのcallをinstrumentし、content、length、identity/link state、mode、mtime、ctime、
観測可能なxattr/ACLを比較する。OSのread semanticsだけによるatime更新は別に記録し、failureともmutationの証明とも
しない。別途制約されたstartup launcherは、許可するproduct起動child processを唯一所有し、
その対象は固定OS browser helperだけとする。このhelperはargvまたはenvironmentとしてinspection由来のcontent/path、
authored value、user-supplied command、environmentで選択したhandlerを受け取らない。Closedなambient platform key setだけを
launch environmentから直接copyしてよい。Ambient valueがSource rootとlexicalに同じでもprovenanceは変化せずread authorityを
与えない。自動起動を無効にした場合、非対応の場合、または失敗した場合もsessionを利用可能に保つ。Boundary外byteを受理・公開しない。公開済みsymlinkを意図的に追わず、検出したpath changeの
byteをcommitしない。文書化したactive source-root/ancestor mutatorと、有効な`O_NOFOLLOW`を利用できない場合に限るactive
final-component mutatorはcurrent threat modelのscope外とする。
Global read前に明示的opt-inを要求する。Capability認証済みloopback APIは明示的なdetail requestにだけ完全な
authored sourceを返し、bundled browserはmemory内で機密contentへのacknowledgementを行う前にそのrequestを発行せず、
comparisonを構築しない。環境変数参照は解決も置換もしない。Inert textだけをrenderする。Acknowledgementはreloadまたは
client purge時にresetし、APIへ送信しない。
表示するmetadata fieldとrelationship kindは、supportedな`(tool, kind)`について維持管理するclosedなpresentation
allowlist rowに属し、かつactualなadmission済みsource formのexact extractorが認識するものだけとする。どちらかのgateを
満たさないauthored entryは完全なsource textからだけ利用可能とし、metadataまたはrelationshipとして推論しない。
Product surfaceは、syntactic parsing、exact authored-literal extraction、機械的なtyped decoding、凍結済み
catalog classification、文書化済みorder/scope/condition/selection/reference factのprojectionだけに限定する。
Inventory、Detail、Comparison、Global control、Diagnostics、Source Condition Facts、API、CLI output、documentationは、
natural-language meaningのinterpret/rank、validity/correctness/effectiveness/compliance/qualityの判定、remediationの助言、
customization contentのlint、synchronize、convert、format、fixを一切行わない。Inspector所有のmanifest、registry、DTO、
invariantの内部validationはcustomization fileに対するjudgmentではない。WCAG 2.2
Level A/AAの受入には上記の完全なbilingual criterion matrixを使用し、英語・日本語文書を意味的に同等に保つ。
Inspectorは、file byte、aggregate byte、発見file/entry、parser depth/node、diagnostic、graph record、message、
request/response body、package asset、retained session dataにproduct固有の上限を定義しない。Capacityは、supported
Node.js runtime、parser library、operating system、filesystem、browser、現在のexecution environmentから継承する。
決定的かつthrowしないentry-local outcomeは、完全なtraversalとserialize可能なassembly後にcontracted-partial pathを
使用でき、binary inputはそのようなoutcomeの1つである。NULを含まない不正なUTF-8は、代わりに完全にreadableな
`utf-8-replaced` outcomeとする。Domain layerがcatchしてよい調査対象sourceのexceptionは、contractがstructural existence
checkpointとして宣言した`lstat` callからのNodeの正確な`ENOENT` codeだけとする。そのcheckpointは、entryをまだ
observeしていなければ`absent`、以前にobserveまたはticket発行済みのentryが消えた場合は`entry-disappeared`だけを返す。
Messageを調べず、`realpath`、`open`、`FileHandle.stat`、readを含む別codeまたは別operationへ適用しない。それ以外で
調査対象sourceのreadがthrowしたexceptionまたはrejectされたpromiseは、filesystem、parser、recognition、scanのdomain
layerでcatch、classify、retryしたり、file、Diagnostic、scan result、partial generationへ変換したりしない。Triggerを
所有するouter boundaryがcatchできるのはexecution lifecycleを表すためだけとする。REST所有operationは、path/contentを
含まないgenericなaccept前HTTP error、またはaccepted jobのterminal Operation Errorを返し、processと以前のsnapshotを
利用可能なまま保つ。REST ownerを持たない自動startup operationはprocess top levelへ到達し、process/sessionのsurvivalは
保証しない。Runtime所有のlocal uncaught-error outputはproduct API、log、telemetry外にある明示的なresidual disclosure
limitationとする。

Relationship projectionは機能上、各originating recognitionからdirect 1 hopに限定し、非再帰とする。これはsemantic/read-authority
boundaryでありresource quotaではない。Generic relationshipのread authorityは0であり、relationship処理はtargetを追跡せず、
target自身のrelationshipをoriginating edgeからprojectしない。Parser、recognizer、compositionのoutputがnestedまたはtransitive
relationshipを作ろうとする場合、target access前にそのprojectionを省略し、eligibleなdirect relationshipと記述された完全な
sourceを保持し、actionableかつsource値を含まないrelationship diagnosticをemitする。
Authorized browserは1秒のliveness heartbeat、750 ms request timeout、2秒のmonotonic memory leaseを使い、
hidden/page lifecycle eventでは直ちにpurgeする。
Monacoには記述された完全なsourceを渡す。Browserまたはeditor runtimeがdiffを計算できない場合、UIは完全な
read-only side-by-side sourceを利用可能なまま保ち、どちらのartifactもvalid/invalidと扱わずactionableなcomparison
failureを報告する。HTTP deliveryはAPI DTOをtruncateしない。

Typed derivationはclosedな`DerivationProgram` schemaを使い、exact static seed provenanceからのdirect edgeだけを扱う。
Derived provenanceは別のderivation edgeのseedにできないが、同じfileの独立static provenanceはeligibleなままとする。
Path derivationに使うvalueはsupported runtime/platformのpath representationを満たさなければならない。完全なtraversal後の
決定的かつentry-localでcapacityに起因しないparser/path failureは、target access前にそのderivationを省略する
contracted-partial outcomeを許可してよい。Memory、capacity、その他のenvironment-resource conditionがthrowまたはrejectionとして
現れた場合、application定義のclassificationまたはrecovery pathは存在せず、triggerを所有するboundaryへpropagateし、そのattemptの
resultをpublishせず、以前のcommitを変更しない。決定的にreturnされたderivation outcomeが使用できるのは、closedなcompleteまたは
contracted-partial transitionだけとする。

Coordinatorはproduct定義のwall-clock scan cutoffを設けない。Global disable、process shutdown、明示的operation
cancellationはpublication authorityを取消不能にrevokeする。その時点で未完了のNode.js filesystem promiseは
cleanup-only continuationとなり、late byte/result、DTO、operational eventをすべて破棄する。Event loopが処理できる間は
APIとliveness endpointをresponsiveに保つが、取消不能なkernel operationがsettleする前のphysical cleanupは保証しない。

Trusted package manifestはbuild、packed-package、runtime verificationで同じclosed schemaを使う。両manifestはunknown keyを
拒否し、recursiveにexactなdeclared file setを検証し、各declared lengthをactual file lengthと比較し、import/host bind前に
hashを検証する。SizeとrecordのcapacityはNode.js、filesystem、現在のbuild/runtime environmentから継承し、manifestまたは
listed assetをread、parse、hash、retainできないrecoverable failureはimport/bind前にfail closedとする。

Operational event recordは、fixed codeとopaqueなsession/source/file/scan/operation IDだけを含む1つのclosed logger
schemaを使う。Operational eventにはSource-relative/absolute/canonical path、root、filename、inspected content/metadata、
authored value、capability、body、raw parser/system error、exception stringを一切含めない。認証済みのfile-scope
`Diagnostic` DTOは必要最小限のSource-relative Pathを保持してよいが、log projectionはそれをcopyしない。
固定CLI help/version text、1件のlaunch-URL line、固定actionable startup warningはoperational eventではなくpresentation
outputであり、なおinspected-content/path/valueのnegative testを受ける。

**規模・scope**: ローカルuser 1人、parser-acceptedな選択済みRepository root（defaultでは1回captureしたexact invocation
`process.cwd()`、またはplatform-specific pre-resolution gate後のaccepted single `--cwd` value）をrootとするRepository sourceを正確に1つ、session-wideな
all-tools opt-in 1回から作るadmit済みのtool別Global sourceを0から3つ（Copilot、Claude、Codexごとに最大1つ）、Sourceごとにrootを正確に1つ、
comparison内file数は正確に2つ。Inventory sizeはproduct定義のitem上限ではなくsupported runtimeと
execution environmentによって決まる。

## 憲章適合確認

*GATE: Phase 0調査前に合格し、Phase 1設計後に再確認済み。*

- [x] **根本原因を解く設計**: 1 packageとSourceごとに正確に1つのimmutable rootでlaunchとinspectionを
      解決し、workspace分割、repository picker、root discovery、static export、file watcher、
      speculativeなextension systemを追加しない。
- [x] **読みやすい実装**: `host`、`inspection/rules`、`recognizers`、`parsers`、`session`が
      別々のinvariantを所有する。Vendor behavior、Inspector matcher、runtime composition、official evidenceは
      4つのclosed registryに分け、vendor固有policyを分離し、shared behaviorは小さく明示的に保つ。
- [x] **Dependencyおよびpublic-contract governance**: 未公開のinitial baselineについて、T001が確認する
      理由付きno-migration-impact判断を記録する。Acceptする新規・変更dependencyおよび破壊的な
      public-contract変更は、理由、影響を受けるconsumer/contract/data/workflow、移行・compatibility手順、
      rollback/support path、または理由付きの明示的なno-impact判断を記録する。英日design evidenceが欠落または
      staleならT002をblockし、英日validation evidenceが欠落すればreleaseをblockする。
- [x] **完全な検証**: Unit、contract、integration、security、package、performance、end-to-end、error、
      boundary、accessibility、adversarial safety scenario、4つのuser story、公開SC-002 profile/status
      request/generation protocol、thrownまたはrejectedなoperationを所有execution boundaryまで変更なく伝播する処理、product-issued mutationと
      OS atimeの分離、path/content-free operational log、product-wideなFR-032 negative boundary、完全なbilingual
      55-row WCAG Level A/AA acceptance matrix、
      FR-039/SC-009のorigin-file-less Source Condition Fact、SC-003/004/005/007/009のversion付きでdigest-boundな
      非ゼロrelease-evidence denominatorをtest layoutで扱う。
- [x] **文書の言語同等性**: Phase 0/1 artifactにはcanonical英語版と意味的に同等な`*.ja.md`を用意する。
      実装では両言語のuser/Contributor guide、全vendor/Repository/User/Global/surface表、official evidence、
      security boundary、diagnosticを更新する。
- [x] **安全なboundary**: Read candidateを凍結し、local APIを認証して、capability認証済みAPI accessとbundled
      browserのmemory内の機密content acknowledgementを分離する。このgateは`FileDetail`の全authored-value fieldと
      comparison由来stateを対象とする。中央のfull-session purgeを通常のscope限定route/Source/generation cleanupから
      区別し、Global disableはrequest前にfull purgeをinvokeする明示的な例外とする。意図的に調査した完全なcontentはinert、local、
      session-onlyのままで、persistence、egress、logには含めない。認証済みDiagnosticはactionableな
      location fieldだけを保持できる一方、operational eventはfixed codeとopaque IDだけを含み、path、content、metadata、
      capability、body、raw errorを一切含めない。Resource capacityはNode.js、parser library、OS、filesystem、browser、
      execution environmentから継承し、recoverable failure、authority revocation、late cleanup、fail-closed behaviorを
      明示する。Product-issued mutationを禁止してOS-only atime effectと区別する。Node-observableな全linkまたは
      検証不能boundaryを拒否し、revoke済み/late byteを破棄して、非原子的、platform-unobservable、physicalに取消不能な
      I/Oの残存riskと解消pathを記録する。
- [x] **参加しやすさ**: 単一package setup、再現可能なpinned tooling、客観的期待結果、keyboard-first
      workflow、actionable error、自動・manual accessibility gateで参加の障壁を抑える。Maintainer-owned release studyは
      必要性、accountable owner、funding、support、privacy、accessibility、rerun policyを公開し、通常のcontributorへ
      recruitmentまたはreview義務を移さない。

### 設計後の再確認

Data modelはphysical file、candidate provenance、documentation status、runtime applicability factを分離する。
HTTP contractはcapability認証済みの明示的なdetail requestにだけ記述された完全なsourceとdeclared authored valueを返し、
bundled SPAはclient-memoryの警告gate前に`FileDetail`をrequestせずcomparison contentも構築しない。APIはacknowledgementを受信も永続化も
しない。Masking/reveal workflowを持たず、環境変数参照を解決せず、維持管理するclosedなpresentation-allowlist rowに属し、actualなadmission済み
source formのexact extractorが認識するmetadata fieldとrelationship kindだけをemitする。Matcher contractは明示的staticまたはvendor-specific one-edge
derived candidateだけを許可し、relationship、component、vendor locator、excluded inputはread boundaryを
拡張できない。Relationship projectionは各originからdirectな1 hopへ制限して非再帰とし、read authorityを一切持たず、nested/transitive
projectionの試行をtarget access前にactionableなdiagnosticで報告する。Quickstartは全stable behavior/rule/strategy/source ID、official-source drift review、Repositoryの
`./` grammarとbare `**/` rejection、必須品質gate、4つのend-to-end storyを扱う。Monacoはclient-only、
same-origin、model lifetime scopeとし、固有diff engineでdependency重複を避け、exact authored metadata比較を
明示的に保つ。Project-owned browser launcherによりshellを含む`open` packageを除去し、許可する唯一のproduct child
processを、inspection由来のcontent/path、authored value、user command、environment-selected handlerを受け取らない固定startup
OS helperへ限定する。Closedなambient platform key setだけをlaunch environmentから直接copyし、Source rootとのlexical一致は
provenanceを変えずauthorityを与えない。Package gateはroot tarballと
exactなinstall済みproduction closureのJavaScript-only application code、lifecycle/build/download path、selector、
native/binary artifactをauditする。Third-party development/test toolingはpublished FR-038 boundary外のままとする。
Node.js-onlyの検証制約は、active mutator/platformの残存riskと、憲章が求める将来の
public Node.js filesystem APIまたはOS強制snapshot/sandboxという具体的解消pathとともに記録する。Passing testによるproofや
暗黙のwaiverとして扱わない。同じresidual recordはstalled kernel filesystem operationをhard-cancelできない点も扱う。
Disable、shutdown、cancellationはpublication authorityをrevokeしてlate resultを破棄するが、physical completionは
operationがsettleするまで待つ。未解決clarificationまたは既知の憲章違反は残っていない。Frozen outcome-fixture
manifestとdigestはSC-003/004/005/007/009のrelease denominatorをclosedにし、class、case、fixture、execution record、
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
│   ├── operational-events.ts
│   ├── runtime-failures.ts
│   ├── server.ts
│   └── static-files.ts
├── inspection/
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
│       ├── source-ranges.ts
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
├── operational-events.ts
├── runtime-failures.ts
└── registries/
    ├── vendor-behaviors.ts
    ├── inspection-rules.ts
    ├── runtime-composition.ts
    └── official-sources.ts

tests/
├── unit/
├── contract/
├── integration/
├── security/
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
    ├── outcomes/
    │   ├── manifest.json
    │   └── manifest.sha256
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
`package.json`をparseし、両closed manifestと全listed static/serverのdeclared length/hashを検証してから
validated `dist/cli.mjs`をdynamic importする。Manifest/asset処理はsupported Node.js/filesystem/build-environmentの
capacityを使い、必要なdataをread、parse、hash、retainできないrecoverable failureはimport/host bind前にfail closedとする。

`app/locales/en.ts`と`app/locales/ja.ts`をuser-visible UI copyの明示ownerとし、componentはstable message keyを
使用して英日UI parityをad hocに追加しない。`validation.md`と`validation.ja.md`はfinal SC evidenceを記録し、
意味的に同等に保つ。`.github/workflows/`でCI/releaseのownershipを明示し、documentation parity、package
exact-set、release gateを含める。

Task generationは、すべてのP1 workをすべてのP2 workより前へstable partitionせず、元のfamily-vertical delivery
orderを維持する。最初にSetupとblocking secure foundationを実施する。次に各familyでUS1 discoveryとUS2の完全で
不活性なdetailを完了してからUS3 comparisonを行い、その後にだけ次のfamilyへ進む。正確な順序は、SKILL
（Skill Metadataを含む）→ Instructions → MCP → Rules → Commands → Copilot Prompts → Custom Agents →
Configuration/Settings → Output Styles → Marketplaces → Plugin Manifests → Hooksとする。その後、Repository-wide
Inventory、Detail、Comparison Acceptanceをこの順で完了する。Global inspection（US4、P3）、cross-cutting
verification、release evidenceは最後に実施する。

4つのregistry moduleは、1つのvalidatorがclosed graphとしてloadする場合もownershipを分離する。
`vendor-behaviors.ts`は文書化済みvendor lookup statement、`inspection-rules.ts`だけがstatic/derived matcherの
read authority、`runtime-composition.ts`はstrategyとrelationship-only policy、`official-sources.ts`はdevelopment/
test専用offline evidence mapのimplementation counterpartを所有し、startupまたはscan entry graphからimport
しない。4つのconformance JSON fixtureはこれらmoduleをmirrorし、相互IDを要求し、duplicate、orphan reference、
anchorなしevidence、`./`で
始まらないInspector Repository matcher、bare `**/` matcherがあればbuildをfailさせる。

維持管理する3つのvendor contractにあるPresentation Allowlist sectionを、独立した規範的design inputとする。
最初のparser、recognizer、API、UI detail taskより前に、supportedな全`(tool, kind)`、そのrowがcoverするadmit済み
source form、正確なmetadata `fieldId`/relationship-kind setを英日両方で列挙する。Effective eligibilityはtuple
membershipと、そのrowが記載するexact source-form extractorの二重gateで決定する。1つのsource formについて列挙した
fieldを、tuple membershipだけで別formへ移してはならない。Registry/conformance workは両gateを入力としてtestし、
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

Buildは最初にroot-resolvedなpackage所有の`.output/`、`.build/`、`dist/` treeだけを除去する。Nuxt標準
`.output/public` staging treeへ`nuxt build`し、strict normalizerがそのtreeを検証して新規`dist/public`へ
accepted fileだけをcopyするため、Nuxtが`dist`へ直接出力するとは仮定しない。Normalizerは
external/relative asset URL、executable attribute、malformed inline script、symlink、unexpected outputを拒否し、
closedな`dist/manifests/static-assets.json` inventoryと正確なCSP hashを書く。Node hostがstatus routingを
所有するため、Nuxtのredundantなstatic-host fallback `200.html`/`404.html`を要求するがcopyせず、保持する
`index.html`以外の全HTML fileを拒否する。Copyまたはhash前に各declared lengthをactual fileと比較し、Node.jsと現在の
filesystemが提供するstreamingを使う。Resource exhaustionまたは他のrecoverableなenvironment failureはassemblyをabortし、
artifactをvalidまたはinvalidと分類しない。

`package.json`がrunnable command graphを所有する。`build` scriptは固定clean step、Nuxt client build、tsdownの
`cli`/`parser-worker` build、両manifest assembler、recursive exact-set verifierを順に実行する。
`check:official-sources`だけをnetwork有効のevidence-drift commandとして文書化する。`src/cli.ts`とparser-worker
entry、`tsdown.config.ts`、assembly script、これらpackage scriptはfoundation prerequisiteであり、存在する前に
build、package、manifest quality gateを配置しない。
したがってSetupでは、package command、tsdown entry、CI quality gateを設定または実行する前に、CLI/
parser-worker entryと参照される全assembly scriptをscaffoldする。それらのpathが存在するまでSetup checkpointを
runnableとみなさない。
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

- `src/inspection/rules/types.ts`が最初に、stableなschema/version discriminantを含むminimum closedかつimmutableで
  versionedな`TraversalPlan`とsegment-program typeを所有する。Registry compilationはその定義済みtypeだけをpopulateし、
  widenしてはならない。`src/inspection/safe-fs.ts`だけがenabled inspection sourceをenumerate/readできる。公開されたlexical rootの
  全componentを`lstat`で検査してlinkを拒否し、accepted rootを`realpath`でresolveし、directoryであることを
  要求してbigint identity/metadataを記録し、internal `InspectionRootContext`を作る。Typed matcherからcompileした
  immutable versioned `TraversalPlan`だけをinterpretする。Repository planは明示されたdescendant programを使える。
  Global planはhome rootをenumerateせず、exact targetではfixed ancestor/targetだけを`lstat`し、Copilotのfixed
  instructions subtreeではそのsubtreeと許可descendantだけを`opendir`する。隣接Global pathへのI/Oは0とする。Directory
  enumerationごとに、process-wide resource-registry reservationを先にpreallocateし、`opendir`直前にcheckpoint rows 21–24を
  完了する。登録済み`fs.Dir`をexplicit `Dir.read()`だけでnullまでdriveし、directoryをopenのままrows 25–28を繰り返す。
  Registry `close-confirmed`へ到達してからだけ、complete sibling setをclassifyし、descendし、ticketを発行できる。
  Checkはroot、利用可能なancestor、target-directoryのidentity/typeとbound済み`mtimeNs`/`ctimeNs`を比較し、検出可能な
  create/remove/rename、検証不能check、close未確認ではenumerationを破棄する。そのpath operation用exact `Dirent.name` raw segmentと、
  matching/sort/DTO path用NFC classification segmentを分ける。異なるraw sibling spellingが1 NFC keyになる場合はcollision
  group全体をdescend/readせずfail closedにし、collisionのないNFD-only spellingはraw segmentでreadしてNFC表示する。
  Collision diagnosticは、unambiguousなpublic file pathが存在しないためpathless session scopeの1件とする。1つのSource scan attemptでは、
  content-dependentなCodex ordered fallbackを除き、static discovery、admission、normalization-collision rejection、physical
  groupingをgroup read前に完了する。Physical identityをusableとするには、exact bigintの`dev`/`ino`/`nlink`、`ino !== 0n`、
  stableかつpositiveな`nlink`、`nlink`以下のgroup countを必要とし、それ以外はaccepted byte 0のboundary-unverifiableとする。
  複数のallowlist済みhard-link pathを通じてadmitされた1つのusableな検証済みphysical fileについて、primary handle/content readを
  正確に1回だけ行い、primary `sourceRelativePath`はNFC classification pathをunsigned
  UTF-8-byte lexicographic orderで並べた最小のpathとし、残りのunique pathは同じ順序で
  `aliasSourceRelativePaths`へ格納する。Enumerated raw segmentは各provenanceとの関連を維持し、そのfilesystem operandには
  それだけを使う。Parent enumerationを禁止するtargeted fixed pathでは、代わりにimmutable registryのexact target-spelling
  segmentだけを使い、NFC classification/display spellingを代入しない。
  Inventory filter、detail label、selectionはprimaryと全aliasにmatchし、file-scoped Diagnosticはprimary pathだけを使用する。
  Source、scan attempt、generationは独立にverify/readする。Group consume後に発見したhard-link pathはmergeもreopenもせず、Codex
  ordered fallbackとlate derived pathは、それぞれ異なるcontract済みzero-read rejection diagnosticを使う。
  Link、非directory traversal object、検出可能なdevice
  changeを拒否してからgeneration-boundな`ScanEntryTicket`を発行する。Ticketはprivate JS stateでbrandし、
  serialize、DTO/HTTP requestからの再構築を許さず、最大1回だけconsumeできる。Client指定pathはI/Oを認可しない。
- Traversal contractは実行前にstructural existence checkpointをすべて列挙する。そのcheckpoint用`lstat` wrapperだけが
  Nodeのerror codeが正確に`ENOENT`かを検査してよい。Successful observationより前なら`absent`を返し、successful
  observationまたはticket発行後なら`entry-disappeared`を返す。どちらのoutcomeもauthorityを付与せずbyteを保持しない。
  Wrapperはerror messageを調べたりcauseを推論したりせず、別の`lstat` errorをcatchしない。Non-structuralな`lstat`、
  `realpath`、`opendir`、`open`、`FileHandle.stat`、byte read、parse、その他operationからのthrowまたはrejectionは、codeが
  `ENOENT`でもすべてFR-041に従って変更せずpropagateする。
- Candidate readは、その所有root contextとticketだけからpathを再構築する。Rootと全ancestorをbigint `lstat`で
  再検査し、ticket snapshotと`dev`、`ino`、`mode`を比較する。まずcandidate pathを`lstat`し、linkまたは
  non-regular objectを拒否して、`dev`、`ino`、`mode`、`size`、`mtimeNs`、`ctimeNs`をenumeration metadataと
  比較する。次にcandidate `realpath`と`path.relative`でcanonical containmentを確認し、直後にcandidate pathの
  `lstat`比較を繰り返す。両方のpath-stat snapshotが相互に一致し、enumeration metadataとも一致した場合だけ
  `open`する。`O_NOFOLLOW`が存在しplatformで有効な場合は、必須の
  final-component多層防御としてopenに使用する。不在または無効なsupportをcross-platform保証とはみなさない。
  Byteを読む前に、同じ順序のroot/ancestor/candidate-`lstat`/canonical/candidate-`lstat` sequenceを繰り返し、
  同じfieldを`FileHandle.stat({ bigint: true })`と比較する。Readerは、Node.js、filesystem、execution environmentが提供できる
  範囲で、同じ`FileHandle`から記述されたbyteを読む。
  Handleを開いたままbyte受理前に、post-read validationとしてこの完全な順序付きsequenceと、同じ
  `FileHandle.stat`について同じfieldの比較を繰り返し、`finally`でregistry closerをinvokeまたはjoinし、handleが
  `close-confirmed`になるまでresultを受理しない。検出したlink、boundary、identity、type、size、metadataの変化はcandidateを
  拒否する。収集済みbyteを破棄し、readable content/receiptをcommitせず、安全にinventory済みのpathには
  diagnostic-only recordだけを残してよい。認証済みDiagnosticをemitする。そのSource-relative Pathは
  fixed-code/opaque-ID operational eventへprojectしない。
  Root変化はそのsource attemptをabortし、以前にcommitしたgraphを維持する。
- Process-wideな`ClosableResourceRegistry` 1つだけが、全inspection `FileHandle`と`fs.Dir`のowner/close-state machineとなる。
  `open`/`opendir`前にcoordinatorが`opening` reservationをinsertし、acquire成功時はresourceがescapeする前にrecordへ格納し、
  acquire失敗時は削除する。Exact resourceのcloseは1回だけで、全callerがretained close promiseへjoinする。Close fulfillmentまたは
  FileHandle `close` eventがclosureをconfirmする。Eventが先にconfirmした場合、後のraw close-promise rejectionはobserveするが
  successとして扱い、propagateもpoisonもしない。Confirmationなしのrejectionは`close-unknown`となって所有REST/startup boundaryへ
  propagateし、later FileHandle eventがconfirmするまでnew inspection schedulingをpoisonする。Unknownな`fs.Dir` closeはprocess restartを
  必要とする。Disableも同じregistryをreuseし、cleanup lineage内の全resourceが`close-confirmed`になるまでcommitできない。
- Inspected-source filesystem workはscan serializationとcoordinationし、generation publicationがoverlap/interleaveしない
  ようにする。Openはread-only flagを使い、moduleはmutation可能なopen、
  write、truncate、create、rename、delete、link、chmod/chown、utimes、xattr、ACL、または同等のoperationを公開しない。
  Safety testではcallをinstrumentし、前後のbyte、length、identity/link state、mode、mtime、ctime、観測可能な
  xattr/ACLを比較する。OS-onlyなatime changeは別に記録し、failureもsuccessも証明しない。Global disable、process
  shutdown、明示的cancellationはticket/attemptのpublication authorityをrevokeする。Pending promiseはsettle時にcleanupだけを
  行ってよく、late byte、diagnostic、graph change、DTO、operational eventは破棄する。Node.jsとkernelがoperationのsettleを
  報告する前にphysical cancellationしたとはclaimしない。
- Successful operationが、必要なidentity/metadataまたはcanonical path dataとしてunavailable、ambiguous、malformed、
  その他unusableな値を返した場合、layerは決定的な`safe-fs-boundary-unverifiable` boundaryまたはcandidate outcomeを返し、
  推測しない。Root-level outcomeはsource attemptをabortし、candidate-level outcomeにはdiagnostic recordだけを残してよい。
  このclassificationはreturned dataだけを使用する。上記の正確なstructural-`lstat` `ENOENT`変換だけがcatch可能なexceptionで、
  その他すべてのthrowまたはrejectionにはFR-041を適用する。
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
  upstream lookupを記述するだけでI/Oを認可せず、static/typed derived Inspector ruleだけがreadを認可し、
  runtime strategyはorder、condition、relationship-only edgeをprojectし、official source recordはevidenceを
  提供するだけでruleを自動変更しない。全Repository matcherはBase、Relative selector、Expansionを分離し、
  正確な選択済みRepository rootから`./`で表記し、bare `**/`を拒否する。明示的な`./**/`は下向きInspector inventoryだけを
  意味する。CopilotのVS Code、CLI、Cloud behaviorと、各vendorのRepository対User/Global behaviorは、推測した
  traversalを共有せず独立してaddress可能に保つ。全Repository selectorをclosedかつcanonical round-tripする
  segment programへcompileする。Literal、one-segment、非隣接recursive-directory tokenで、general glob
  engineを使わずcompositeなdescendant/direct-child/subtree ruleを表す。Compilerはimmutable `TraversalPlan`もemitし、
  Global preview patternを同じrecordから作ってconsent digestへschema、closed selection policy、canonical programをbindする。
  Content依存のscheduler branchはexactな`codex-global-first-non-empty` policyだけとする。これは
  `AGENTS.override.md`を安全にprobeし、non-emptyならshort-circuitし、安全にemptyと確定した場合、またはcontractで宣言した
  pre-observation structural `lstat`が正確な`ENOENT`を返して`absent`となった場合だけ`AGENTS.md`へ進み、publishするCodex
  Global instruction fileは最大1件とする。Optionalな先頭BOMを1つ除去した後、
  emptyはsupported ECMAScript runtimeで正確に`decodedText.trim().length === 0`であることを意味する。Decode済みの
  `utf-8-replaced` stringはそのまま参加するため、別のnon-whitespace textによってすでにnon-emptyである場合を除けば、
  `U+FFFD`が1つでもあればnon-emptyになる。Binaryは決定的なno-fallback outcomeとする。Overrideをobserveした後のcontractで
  宣言されたstructural recheckから正確な`ENOENT`が返った場合は`entry-disappeared`となり、同様にfallbackしない。その他の
  throwまたはrejectされたprobeはすべてFR-041に従いfallbackせず、initialまたはretryのGlobal batch中ならsibling subsetを
  commitせずtransaction全体をabortする。
- Static matcherとclosed `DerivationProgram` unionのexact initial 5 mappingだけをread authorityとする。Derivation schemaは
  static seed provenance/rule/kind、closed declaration field/syntax、seed-relativeまたはsource-root base、固定placement/
  suffix、deterministic target constructionをpinし、callback、arbitrary path join、free-form expression、glob、recursive derivationを表現不能にする。
  Derived segmentは
  host-independent NFC/Windows-special grammarを通し、collisionのないexact enumerated `ScanEntryTicket` 1件へresolveできた
  場合だけ読み、ADS、device、trailing-dot/space、ambiguousなcase/normalization alias、8.3 aliasはcandidate
  open前に拒否する。UniqueなNFD raw entryはそのNFC classification record 1件を通じてeligibleのままとする。
  Vendor behavior registryがその他の
  supported User customizationを記録する場合も、FR-015からFR-018によりGlobal readは3 instruction setだけに
  制限し続ける。
- Tool recognizerは`(fileId, tool, kind)`ごとにexact `ToolRecognition` 1件を付け、closed tool/kind順でsortする。
  Compatible admissionはprovenanceをmergeし、incompatible parsed meaningはそのrecognitionのall-or-nothing extractionだけを
  failする。Recognitionは1 physical fileを1回だけ読み、受理済みの独立candidate provenanceをすべて保持する。完全なtraversal後の
  決定的かつentry-localでcapacityに起因しないextraction failureは、そのrecognitionだけを破棄するcontracted-partial outcomeを
  許可してよい。Throwまたはrejectされたread/parser/Worker operationはrecognizerまたはscan domainでcatch/translateせず、
  owning outer boundaryへpropagateし、そのattemptのitemまたはgeneration resultには一切寄与しない。Declarationをinert dataとして
  parseしてよいが、import、evaluate、remote content解決、relationship targetのreadは禁止する。Context
  extractionが合成できるのは独立受理済みfile間または固定relationship-only defaultへのclosedな
  vendor-documented edgeだけで、non-file/excluded contextはsource-level condition factにする。Relationship projectionは
  各originating recognitionからのdirectな1-hop edgeだけに制限して非再帰とする。Closed composition ruleに従う複数の
  direct edgeを許可する。独立してadmit済みのtargetは自身のdirect edgeを自身の
  recognitionでだけ公開でき、originating edgeからtransitiveに展開しない。Relationshipのread authorityは0とする。Nested/
  transitive projectionの試行はtarget access前に拒否し、eligibleなdirect edgeと記述された完全なsourceを利用可能なまま保ち、
  actionableかつsource値を含まないrelationship-depth diagnosticをemitする。固定defaultを
  authored targetとしてlabel/serializeしない。Public provenance scope/orderはSource-relative pathとstable comparison keyを
  持つclosed `ScopeDescriptor`/`OrderDescriptor` unionとし、unknown orderはnullとcondition factで表す。Derived provenanceは
  exact `seedProvenanceId`を指定し、hard-link alias seedをcollapseしない。
  特にRepository root `.mcp.json`は、別file/readを作らずCopilot CLI provenanceとexactなVS Code 1.118以降の
  path-only provenanceをmergeする。CLI `mcpServers` extractionはprovenance-specificのままにし、登録済みの
  release-note/current-guide conflictがopenな間、VS Code provenanceはschema fieldまたは推測したwinnerを追加しない。
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
  URL、正確なsection anchor、review date、semantic fingerprintを与える。Offline contract/build
  validationはchecked-in recordをloadし、これらpageをfetchできるのは明示的なmaintainer drift commandだけと
  する。Startupとscanはdocumentationへaccessせず、remote page textをpackageへcopyしない。
- Decodeはsame-handle readとread後の全identity checkが完了してから開始する。`0x00` byteが1つでもあれば
  `encoding: binary`、`sourceText`なし、diagnostic-only、comparison不適格とする。それ以外のbyteはすべてreplacement semanticsを
  用いてUTF-8として正確に1回decodeする。先頭UTF-8 BOMが正確に1つあれば記録して`sourceText`から除去する。それ以外のvalid inputは
  `utf-8`、BOMを持つvalid inputは`utf-8-bom`、replacementされたinvalid sequenceが1件でもある場合は
  `utf-8-replaced`とする（先頭BOMが存在すればその除去も記録する）。生成された`U+FFFD`はすべて、parsing、display、extraction、
  comparisonへ渡す完全な`sourceText`内に保持する。Charset detection、alternate decode、sampling、truncationは行わず、
  このoutcomeだけを理由にgenerationをpartialにしない。
- Parserはsafe modeだけを使用する。YAMLはcustom tagなしのcore schemaと無効化したalias、JSONCは
  既知fieldのtree extraction、TOMLはlexical-span extractionと値を実行しないsemantic normalization、
  Markdown/frontmatterはHTML renderを行わないextractとする。JSONC tree range、YAML CST/source-token range、
  TOML lexical span、Markdown/import spanはdecoded sourceへround-tripしなければならない。Allowlist field occurrence
  ごとにsource順の正確な`authoredLiteral` sliceと別のinternal typed semantic valueを出し、受理したduplicate occurrenceを
  分離したまま保つ。`SourceTextRange` offsetはECMAScript UTF-16 code unitで、`String.prototype.slice`によりliteralを
  再現する。Semantic valueはJSON-safeなdiscriminated unionとし、integer、float、date/time
  payloadはtyped canonical stringを使ってJavaScript precisionやparser固有objectによる変化を防ぐ。
  Metadata/authored relationshipの表示・比較にはexact sliceだけ、typed classification、target
  normalization、derivationにはsemantic valueだけを使う。Registry定義の固定relationship defaultはauthored textをnull、
  originを明示`documented-default`とする。Metadata、relationship、derivation projectionは1 exact occurrence/rangeを共有でき、
  distinct origin occurrence間のpartial/nested/crossing/identical overlapだけをinvalidとする。Parser workはすべてparser
  `Worker` threadで実行し、host event loop上のsynchronous fallbackを設けない。Worker scheduling/capacityはsupported
  Node.js runtime、parser library、browser、OS、execution environmentに従い、Inspectorはproduct固有のworker件数、V8
  heap/stack、message size、parser depth/node/scalar、wall-clock extraction上限を設定しない。Missing/ambiguous/illegal
  overlap/non-round-tripping span、または別の決定的かつthrowしないparser/extraction outcomeでは、対象
  recognitionのextraction result全体（relationship/derivation declarationを含む）を破棄し、記述された完全なsource、
  comparison eligibility、成功した別recognitionをcontracted partial generationで利用可能に保つ。Parser/Workerのthrowまたは
  rejectionはdomain catch、classification、retry、Diagnostic、partial resultなしでpropagateし、REST所有の場合はgenericな
  outer-boundary Operation Errorだけで表す。Parser/presentation stepはauthored sliceを
  decoded valueで置換せず、環境変数参照の解決、credential detection、masking、redactionを行わない。Internalな
  `semanticValue`という名称はauthored literalの機械的なtyped decodingだけを意味し、natural-language interpretation、
  rank、validity/correctness/effectiveness/compliance/quality verdict、remediation adviceを一切保持しない。同じ禁止は、
  すべてのinventory、detail、comparison、Global-control、Diagnostic、Source Condition Fact、API、CLI、documentation
  projectionへ適用する。
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
  lexical previewとsession-keyed digestを使う。New unconsented previewごとに`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、
  `CODEX_HOME`をこの順で正確に1回ずつreadし、`undefined`だけをabsentとし、1つでもabsentならimport済み
  `node:os.homedir()`を正確に1回callする。Absent entryだけにactive-platformの`node:path.join`と固定suffix `.copilot`、
  `.claude`、`.codex`を使い、`HOME`/`USERPROFILE`を独自選択しない。Proposed rootはproduct定義のbyte上限ではなくsupported Node.js、browser、
  platformのstring/path facilityで表現・escapeする。Environmentがrootをrecoverableに表現、escape、retainできない場合は
  normalize/authorizeせず、unsafe dataをechoしないactionable failureをpreviewに示す。Accepted entryはinternal exact raw
  `lexicalRoot`も保持し、digestはraw value、escaped display、immutable
  traversal-plan schema/selection-policy/programをbindする。Enableは保存済みraw valueだけを使い、`displayRoot`を逆変換せずenvironmentを
  再読込しない。Consent後のcanonical alias差異は表示boundaryを暗黙変更せずenumeration前に拒否する。
- `src/launch-browser.ts`はlaunch前にclosed-grammar capability URLを1回表示し、loopback/port/
  43-character-base64url formを再検証して、`node:child_process.spawn`を`shell: false`、ignored stdio、固定argv、
  `unref()`だけで使う。Closed platform mapはmacOSの`/usr/bin/open`とLinuxのOS提供`/usr/bin/xdg-open`だけとする。
  Portable Node APIから独立したtrusted helper boundaryを取得できないため、このreleaseではWindowsとその他platformの
  automatic openを意図的にskipし、固定manual-URL warningを出してserverを継続する。`--no-open`ではchildを作らず、
  helper failureでも表示済みURLを残してserverを継続する。Child environmentのexact platform allowlistはmacOSが`HOME`、
  `TMPDIR`、`LANG`、`LC_ALL`、Linuxが`HOME`、`DISPLAY`、`WAYLAND_DISPLAY`、`XDG_CURRENT_DESKTOP`、`DESKTOP_SESSION`、
  `DBUS_SESSION_BUS_ADDRESS`、`XDG_RUNTIME_DIR`、`LANG`、`LC_ALL`とする。`BROWSER`、`NODE_OPTIONS`、`NODE_PATH`、allowlist外の
  全environment key、inspection由来のcontent、path、authored value、およびextra argvを除外する。Allowlist済みkeyは
  launch environmentからambient platform contextとしてだけ直接copyする。Source root、preview root、candidate path、
  file path、authored valueはinspection stateからargv/environmentへcopyしない。そのtextがambient valueとlexicalに
  一致してもprovenanceを変更せず、read authorityを与えず、handlerを選択しない。OS helperはlisted desktop/session ambient valueをconsumeできるが、Inspectorはそこからhandlerを
  選ばない。HelperはnavigationをOS default handlerへ委譲するだけでbrowser family/versionを選択・検証せず、spawn成功を
  compatibility evidenceとしない。そのhandlerまたは解決先browserが利用不能、識別不能、またはrelease-certification baseline外の場合、
  表示済みURLと`--no-open`により、certified browserでの文書化済みmanual-open fallbackを利用する。Package-owned/user-supplied shell helper、shell command string、packaged platform helperは禁止する。固定OS提供
  `xdg-open`はpackage payload外で、引き続き`shell: false`でinvokeする。Terminalのlaunch line 1件だけを意図したcapability表示とし、
  operational logへcopyしない。
- Capability認証済みAPIはinert DTOと完全なauthored valueを明示的なdetail requestにだけ返す。Bundled browserは
  acknowledgementをmemory内だけで保持してreloadまたは中央full-session purge時にresetし、機密content警告への
  acknowledgement前に`FileDetail`をrequestせずcomparisonを構築しない。このgateは完全なsource text、declared authored
  metadata、authored relationship target、comparisonの両sideを対象とする。Route close、通常のfile/Source removal、
  selection replacement、generation replacementは対象scopeのmodelだけをdisposeし、それ自体は中央purgeではないため、
  読み込み済みdocumentのacknowledgementを維持してよい。Global disableは異なり、actionがrequest送信前に中央purgeを
  invokeし、より大きい`globalContentEpoch`またはnon-null disable fenceの観測時にもrender前に同じpurgeを繰り返す。
  AcknowledgementはAPIへ送信も永続化もしない。Vue componentと
  `monaco-editor`のESM buildで
  表示し、`v-html`を使用しない。Single-file source modelとsource comparisonの両側をread-onlyとし、
  opaqueなin-memory URIを使い、`readOnly`、`domReadOnly`、`originalEditable: false`、`links: false`、
  `renderMarginRevertIcon: false`を設定し、環境変数参照を解決せず記述された完全なtextを保持する。`accessibilitySupport`は`auto`、
  `accessibilityVerbose`はenabledとし、各viewに`ariaLabel`を付ける。
  Literal source comparisonはMonaco diff editorが所有する。Recognition metadataは
  `(tool, kind, fieldId, occurrence)`で対応付けてexact `authoredLiteral`を比較・Vue表示し、typed valueへ置換またはeditorへ
  serializeしない。Repository comparison acceptanceでは最初に同じRepository Source内のreadableなcurrent-generation file
  2件を使用し、正常なGlobal commit後だけ、各owning SourceとSource-relative namespaceを維持したままreadableなRepository
  fileとGlobal fileの比較をUS4で検証する。他contentと並行して表示するRepository/Globalの自動更新scan/status informationは、共通のkeyboard操作可能な
  pause/resumeとon-demand-refresh controlを使う。Pauseはunderlying scanを停止せず、表示/live-region statusをlast valueで
  freezeし、resumeまたは明示refreshでcurrent stateを表示する。Editorはclient-onlyとし、file/compare routeで
  lazy-loadする。Nuxt/Viteは明示的にimportしたeditor workerをsame-origin static assetとして出力し、
  未使用language-service worker、CDN asset、external worker、blob workerを許可しない。Editor/model
  instanceとsubscriptionはroute close、selection replacement、source disable、generation replacement時に
  個別にdisposeする。Accessible diff viewer、意味のあるARIA label、keyboard navigation、narrow-screen
  inline viewを有効に保ち、browser testとmanual checkの両方で検証する。Browserまたはeditorが利用可能なenvironment
  capacityでdiffを計算できない場合も、記述された完全なside-by-side sourceを表示し、actionable diagnosticを示す。
  `app/composables/liveness.ts`はshared central client-data purge実装と軽量なcapability保護
  `/api/v1/session/liveness` heartbeatを所有する。Visible pageで1秒ごと、request timeout 750 ms、monotonicな
  browser-memory lease 2秒とする。Heartbeat failure/mismatch、lease expiry、hidden/page lifecycle event、process
  loss、または同等のterminal full-session resetではeditor model/worker/subscriptionをdisposeし、全session DTO/DOM/detail/comparison/warning stateをclearして
  requestをabortし、`clientDataEpoch`をincrementしてlate responseによるcontent復活を防ぐ。全SessionSnapshot/FileDetail
  requestはepoch、current generation、該当時file ID、exact request tokenをcaptureする。Older session generationは無視し、
  admitted済みの自動または明示scanはそれぞれopaqueな`scanRequestId`を持ち、そのSource progressとcommitするgenerationは
  同じIDを保持する。Clientはcurrent explicit request IDを保存し、それ以前のstatusまたはinventory generationをそのrequestの
  completionとして扱わない。Newer generation採用前にepochをincrementして全detail/editor/comparison stateをabort/disposeする。Equal generationは
  current tokenを要求し、file detailはepoch/generationがcurrentのままでreadable fileが存在する場合だけ採用する。Browser storage、service
  worker、response cacheへinspected contentを永続化しない。Successful liveness responseは正確に
  `{ sessionId, globalContentEpoch, globalDisableInProgress }`へbindする。Older epochをrejectし、equal epochかつnull fenceで
  leaseをrenewし、greater epochまたはnon-null fenceではrender前にfull purgeとcontrol-only Global recoveryを実行する。
  Capabilityはhidden-page purgeを越えてmemory-onlyで
  保持し、visibleへ戻るとretained capabilityでfresh session snapshotを認証する。SPAはpurge済みIDを保持・比較せず、
  返された`sessionId`をnew liveness baselineとして採用し、epoch、Global control/progress、pathless tool-failure Diagnostic、
  generic Operation Errorだけから最小限のclient-side `RecoveryViewState`を構築する。Disable fenceがnon-nullならsession routeはexactで
  control-onlyな`GlobalFenceRecoverySnapshot`を返す。Fenceがnullならnormal full `InspectionSession`を返すが、recovering clientは
  そのcontrol/error fieldだけを採用してinspection graphを破棄する。Activeなら
  そのviewからdisableを直ちに利用でき、matching frozen consent previewを取得・検証してからretry controlを再構築する。
  Recovery viewはdisable fenceがnullでnormal full snapshotを取得可能な場合だけ明示Resume inspection actionを提示し、matching sessionを再取得してdefault
  stateのfresh inventory summaryを構築するが、old detail、comparison、editor、selection、filter、authored source、
  acknowledgementを復元しない。後のdetail/comparison openにはnew acknowledgementを要求する。Authentication failureでは
  ended stateと表示済みURLを開き直すnext stepを維持する。
- 単一coordinatorがcancellable `GlobalEnableOperation`のadmissionとその単一`GlobalBatchScan`、Repository scan、後続の
  明示的なsingle-Source Global rescan、Global-disable transactionをserializeし、scanをoverlapさせずgenerationを
  interleaveさせない。Queue/operation capacityはNode.jsと現在のprocess environmentから継承し、Inspectorはcommand slot、
  queue depth、handle count、admission byteのquotaを定義しない。Global disableはordinary workと独立してacceptし、既存disable
  transactionへjoinできるpriority security barrierとする。
  1つのconsent recordは常にfixed closed-order tuple `[copilot, claude, codex]`をpreviewし、UI/APIのper-tool selectorを
  持たない1つのall-tools confirmation actionを提供する。`confirmedTools`は、lexical previewがinvalidなfrozen entryも含む
  この完全なtupleとし、eligibilityによってconsentをnarrowしない。Serverはtuple memberごとにinternal `GlobalToolControl`を
  1つ所有する。Filesystem I/Oを伴わないrequest/digest validation後も、initial enableはfrozen consentと3 controlすべてを
  root admission中operation-localかつ観測不能に保ち、session `globalControl`またはpending stateをまだ作成しない。Retryは
  existing active consent/control stateを正確なpre-operation snapshotとして使用する。どちらもnew root contextとcandidate
  Source/boundary IDをoperation-localに保つ。Owned toolすべてが決定的なadmission outcomeに達した後の1回のcoordinator decisionで
  initial consent/controlをactivateするかretry partitionを適用し、rootをadmitした場合だけ全contextをattachして1 batchへ
  transferする。その後もbatch scan resultとgraph recordは1回のgeneration commitまでtentativeのままにする。
  Initial enableはfrozen entry 3件すべてを試行する。Retryは同じfixed tupleから、現在missingまたは決定的にreject済みのset全体を
  server側でderiveし、requestはそれをselect、omit、narrowできない。Admissionはserver所有のsetを、決定的なrejected subsetと
  0〜3件のrootからなるadmitted subsetへpartitionする。Lexicalにinvalidなentry、contractで宣言したpre-observation root
  `lstat`からの正確な`ENOENT`、またはthrowしない決定的なlink/type/change/boundary/identity rejectionはそのrootだけを除外し、
  admit可能なsiblingを続行させる。Observation後の宣言済みstructural recheckで正確な`ENOENT`が返れば
  `entry-disappeared`とし、fallbackしない。その他のthrowまたはrejectionはすべてFR-041を適用してenable/retry transaction全体を
  abortする。全siblingのtentative context/resultを破棄し、admitted subsetを一切commitせず、正確なpre-operation snapshotを
  復元する。Initial enableのsnapshotにはactive consent/controlが存在せず、retryではpre-existing consent/controlをtentativeな
  root authorityなしでretry/disable用に保持する。
  Admit済みsubsetがemptyでoperationのthrow/rejectがない場合、coordinatorは決定的にrejectされたcontrolを記録して
  `active-no-job`を返し、`scanRequestId`、scan job、Source、generationを作らない。1件以上のrootをadmitした場合は、全admitted
  contextとcandidate IDを各controlへatomicにattachし、一緒に、1つの`scanRequestId`、1つのpublication authority、1つの
  working setを持つ正確に1つの`GlobalBatchScan`へtransferする。そのbatchはadmit済みtool/root pairごとに独立識別された
  Global Sourceを1つassembleし、
  Copilot、Claude、Codexを1つのlogical Sourceへ結合しない。全Sourceを、post-read-verifiedな
  `committable-complete`または`committable-partial` generation commit 1回だけで一緒にpublishする。Initialまたはretryには、
  batch levelのscan job、result、観測可能なcommitが正確に1つだけ存在する。
  Admissionとbatch transfer後、coordinator lock下の最後のoperation-ID/epoch/state checkでresponse dispositionをatomicに
  選択する。Batch operationがraceに勝てばshared `scanRequestId`付き`202`を返し、全件reject operationなら
  `active-no-job`を返す。Disable barrierが先なら`409`を返してdrainingへ入り、operation-local cleanup後だけunregisterし、
  late mutation/leakを生じさせない。
  Sessionの`globalControl` DTOはroot authorityを公開せず、fixed confirmed tupleとpending/retryable toolを識別する。
  Active-consent retryでは、`pendingTools`はvalidation/admissionからsingle batchまでserverがderiveしたmissing-Source setを
  projectする。Initial enableは最後のatomic activationまで全provisional valueをoperation-localに保って`globalControl`を作らず、
  その後はaccept済みbatchのtoolだけをpendingとして表示する。Active controlの`unvalidated` memberは常にpendingとする。Workが1件でも
  pendingの間、retryable toolは情報表示だけとし、`pendingTools`がemptyになった後だけretryを提示する一方、disableは直ちに
  利用できる。Consent-preview routeはclient purge後もfrozen active previewを返す。
  Ordinary workはFIFO、Global disableはpriority security barrierとする。Non-no-op barrierの最初のaccept時にcommand epochと
  `globalContentEpoch`をatomicにincrementし、non-null `globalDisableInProgress`をinstallし、publication authorityをrevokeしてnew
  Global-enable/Global-rescan commandを拒否する。Active control snapshotが存在する場合だけ
  `globalControl.state: disabling`としてpending/retry arrayをemptyにし、operation-local initial enableだけならcontrol projectionを
  nullのままとするが、barrierはcontrol-only recovery DTOへ表示する。全ordinary inspection-data routeを
  `409 global-disable-pending`でfenceし、session routeは`GlobalFenceRecoverySnapshot`だけを返す。各inspection-data handlerはcaptureした
  `globalContentEpoch`へbindし、最終publish時にcoordinator lock下でepoch不変かつfence nullを要求し、それ以外はbodyを破棄する。Liveness handlerは
  代わりにpublish時の1つのcurrent coordinator-lock snapshotからexactな`{ sessionId, globalContentEpoch, globalDisableInProgress }`値へbindし、
  current fenceがnon-nullでも返して別tabがbarrierを観測できるようにする。
  Barrierはactive uncommitted batchをabort/discardし、shared resource registryを通じてenable admissionと全tentative root
  context/resultをdrainし、最後のqueued Global work cancellation sweepを行う。中断Repository commandはterminal success後だけ
  1回requeueする。PublicなGlobal consent、control、Source stateのいずれかがあるsuccessはRepository-only N+1を正確にpublishして
  carried graph IDをrekeyする。未公開のoperation-local initial-enableだけがcleanup-only successを使い、Nと全generation-owned IDを
  維持してfenceをremoveする。
  Disable、shutdown、明示的cancellation後のpending workはcleanupだけを行い、late resultをpublish/interleaveしない。Lineageの
  全resourceが`close-confirmed`になった後だけdisableは成功する。Unknown closeその他のaccept後failureではprocessを維持する一方、
  data fenceとgeneric Operation Errorをretry可能なまま保持し、unrecoverable cleanupではrestartをfallbackとする。Accept前failureまたは
  true no-opはfenceをnullのままにする。Event loopが処理できる間はAPI/liveness handlingを継続するが、underlying promiseが
  settleする前にdisableがphysical drain完了をclaimしてはならない。
  Global batchはsession-wideなactive generationから始め、非影響のRepository Sourceと以前にcommit済みのGlobal Sourceをすべて
  carry forwardし、全admitted replacementを別に構築する。正常なcompleteまたはcontracted-partial batchはgenerationを正確に
  1回進め、assemble済みGlobal Sourceをすべてatomicにpublishし、参加controlの該当failure stateだけをclearし、全generation-owned
  graphをrekeyし、old file ID、detail DTO、comparison selection、editor stateを1回無効化する。CarryしたSourceはstableな
  `sourceId`、semantic inventory、authored source contentを保持する。全件rejectのenable/retryはgenerationをcommitせず、carryした
  IDを変更しない。同じcoordinator lockで全SessionSnapshot/FileDetail envelopeのgeneration/payloadをlinearizeし、後のnetwork
  deliveryでmix/relabelさせない。
  後続の明示rescanは既存Source 1件に対するsingle jobのままとし、同じcomplete/contracted-partial ruleでreplacement generationを
  1つcommitできる。成功時はそのSourceのstale-failure entryとlifecycle diagnosticだけをclearし、別Sourceのfailureをcarryする。
  Fatal failureではそのSourceだけのstale overlayを作成または置換してよい。このsingle-Source rescan pathは、initial enableまたは
  retryに対するatomic batch要件を変更しない。
  Global batch中のunexpectedなthrowまたはrejectionはdomain resultを生成せず、triggerを所有するREST boundaryに従う。Job
  accept前なら`scanRequestId`を作らず、accept後なら1つのshared requestをgenericかつpath/content-freeなOperation Errorで
  terminateする。どちらもtentativeなsibling Source/resultを一切commitせず、最後にcommitしたgenerationとIDを維持し、まだ
  uncommittedなtool用`StaleSourceFailure`を追加せず、正確なpre-operation consent/control、admit済みroot contextとcandidate
  ID、以前のtool別graphをretry/disable用に保持する。自動の初回Repository scanのfatal failureでは、別途bootstrap generation
  0をcurrentのままにする。Global disableはcontrol所有のlifecycle diagnosticを削除し、retained root contextをすべて
  close/removeして全control、consent record、frozen previewを削除する。
  保持する各Diagnosticはgeneration/session-lifecycleのlifetimeと独立して、正確に1つのattachment scopeを使う。File scopeは
  matching `sourceId`、`fileId`、Source-relative Pathを必須とし、source scopeは`sourceId`だけを必須とし、session scopeは
  これらのlocation fieldを一切許可しない。Invalidな組合せを拒否し、source/session recordはfile IDやpathを捏造しない。
  Generation 0は、capture済みの呼び出しworking directoryとoptionalな`--cwd`からlexicalに選択したexact 1つのidleな
  Repository Sourceを持ち、file/diagnosticを持たないcommit済みzero-I/O bootstrap snapshotとし、初回fatal attemptでもlegalな
  retained current baseを持つ。明示Repository rescan、enabled-Global single-Source rescan、Global batchは同じqueue ruleを使う。
  Global disableの再要求は既存barrierへjoinし、tool固有Global Source/graph、active consent record、retained admitted Global
  root context、`opening`/`open`/`closing`/`close-unknown`の`FileHandle`または`fs.Dir`に対するaffected
  `ClosableResourceRegistry` record、running/queued Global scan/enable command、retained disable failureが何もなく、かつregistryが
  poisonedでない場合は、無関係なRepository workの有無にかかわらず即時no-opとする。無関係なregistry poisonがある場合は代わりに
  `409 resource-cleanup-restart-required`を返す。どちらの分岐もfilesystemをenumerate/readせず、jobを作成せず、generation、epoch、fenceを変更しない。

### ClosedなRuntime State Table

#### Global root admission

| Input/phase | Internal transition | I/Oおよびpublic result |
|---|---|---|
| Tool-home設定を`undefined`としてcapture | `preview-default` | Request全体で1回の`node:os.homedir()` captureから、active-platform `node:path.join`とtool固定`.copilot`/`.claude`/`.codex` suffixを使ってfilesystem I/Oなしでexact stringを計算し、下記ordered rowでclassifyする。このtoolをfixed three-entry confirmationに保持してauthorityを作らない |
| Capture済みenvironment設定のlengthが0 | `inputState: present-empty` / `preview-invalid` | Environment-origin valueだけに最初に適用する。Entryをfixed three-entry confirmationに保持し、fallbackもfilesystem/network I/Oも行わず、そのentry用root、Source、job、generationを作らない |
| それ以外でexact stringがU+0000またはunpaired UTF-16 surrogateを含む | `inputState: invalid` / `preview-invalid` | `path.isAbsolute`とshared parserより前にrejectし、filesystem/network I/O 0件かつauthorityなしでinvalid preview entryだけを保持する |
| それ以外でactive-platform `node:path.isAbsolute`がfalseを返す | `inputState: relative` / `preview-invalid` | Filesystem/network I/O 0件でrelative preview entryを保持し、normalize、resolve、fallback、authority作成を行わない |
| それ以外でshared pure `LexicalAbsoluteRootParts` parserがabsolute spellingをreject | `inputState: invalid` / `preview-invalid` | Filesystem/network I/O 0件で、closedなPOSIX U+FFFD、empty/dot/dot-dot component、repeated/non-root trailing separator case、およびclosedなWindows UNC/network/device/current-drive、malformed-drive、invalid-component caseをrejectし、parsed operandもauthorityも保持しない |
| それ以外でshared parserが通常のhome外を含むabsolute spellingをaccept | `inputState: eligible` / `preview-eligible` | Exact parsed platform operandを保持し、保存済みraw lexical valueをfilesystem/network I/Oなしでescape/digestし、fixed three-entry confirmationに保持して1回のall-tools consent actionを待つ。このrowだけがconsent後admissionへ進める |
| Consent/digestがstale、replayed、または不一致 | `consent-rejected` | Proposed-root I/Oを行わず、authorityを作らない |
| Contractで宣言したpre-observation root `lstat`が正確な`ENOENT`を返す | `absent` | 中央集約したstructural checkだけがそのproposed rootへaccessする。FallbackせずそのSourceを作らず、同じfixed-three transactionのpartitionを続行する |
| Entryをobserveまたはticket発行した後、contractで宣言したstructural `lstat`が正確な`ENOENT`を返す | `entry-disappeared` | Tentative authorityとbyteを破棄してfallbackせず、適用可能な決定的rejected/scan outcomeだけを使用し、非影響siblingをeligibleなまま保つ |
| Consent後のlexical/canonical/link/type/containment/identity checkがthrowせず決定的なfailureを返す | `root-rejected` | `safe-fs`だけがproposed rootへaccessする。FallbackせずそのSourceを作らず、同じtransactionのpartitionを続行する |
| 宣言済みstructural `lstat`の正確な`ENOENT`以外でproposed-root operationがthrowまたはreject | FR-041 propagation | Global transaction全体をabortし、全provisional sibling context/resultを破棄し、admitted subsetを一切publishせず以前のsnapshotを保持する |
| 1件以上のrootでconsent後admissionが成功し、operationのthrow/rejectがない | `root-admitted` batch subset | 全admitted private context/IDを各controlへatomicにattachし、一緒に1つの`GlobalBatchScan`へtransferして、その1回のatomic commit前にpublic Source/graphを作らない |

#### 検証済みbyteのdecoding

| 検証済みbyteのcondition | `encoding` | Sourceおよびrecognition state |
|---|---|---|
| `0x00` byteが1つ以上 | `binary` | Diagnostic-only item。`sourceText`、parser dispatch、recognition extraction、comparison eligibilityなし |
| NULなし、先頭UTF-8 BOMが1つ、残りをreplacementなしでdecode可能 | `utf-8-bom` | BOMを記録して除去し、残りの完全なtextをWorkerへdispatchする |
| NULもBOMもなく、全byteをreplacementなしでdecode可能 | `utf-8` | 完全な`sourceText`を保持し、Workerへdispatchする |
| NULがなく、先頭BOMの有無を問わず不正なUTF-8 sequenceが1件以上 | `utf-8-replaced` | Replacement semanticsで正確に1回decodeし、先頭BOMがあれば記録・除去し、生成された全`U+FFFD`を保持して、その完全に文字化けしたtextをparsing、extraction、display、comparisonに使用する。このconditionだけではcompleteのままとする |

#### Scan publicationおよびfailure ownership

| Terminal condition | Internal outcomeおよびowner | Atomicなpublic result |
|---|---|---|
| Traversalが完全、全admit済みentryがcomplete、assembly/serializationが成功、authorityがcurrent | `committable-complete`、coordinator | 1つの`complete` generationとcomplete responseをcommitする。Initial/retry Global batchは全admitted tool固有Sourceをこの1回のcommitで一緒にpublishする |
| Traversalが完全、決定的かつentry-localでcapacityに起因しないfailureだけが存在、非影響entryがcomplete、assembly/serializationが成功、authorityがcurrent | `committable-partial`、scan assemblerからcoordinator | 影響diagnosticと完全な非影響entryを持つ1つの`contracted-partial` generationをcommitする。Initial/retry Global batchもcommittableなadmitted subset全体をこの1回のcommitでpublishする |
| Fixed-three Global admissionが全rootを決定的にrejectし、operationのthrow/rejectがない | `active-no-job`、Global coordinator | Active consent/controlを保持し、`scanRequestId`、batch、Source、generationを作らず、carryした全IDを維持する |
| 宣言済みstructural-`lstat`の正確な`ENOENT`変換以外で、REST job accept前にfilesystem、parser、Worker、coordinator、assembly、serialization、authority operationがthrowまたはreject | REST request boundaryへのunclassified propagation | `scanRequestId`、item、Diagnostic、scan result、attempt由来のresponse body、generationを作らず、全tentative Global siblingをabortし、path/content-freeなgeneric HTTP Operation Errorを1件返し、process/sessionと以前のsnapshotを利用可能なまま保つ |
| REST job accept後にそのようなoperationがthrowまたはreject | accepted-job boundaryへのunclassified propagation | 全tentative Global batch siblingを含むrequest全体をabortし、attempt result、Source、generationをcommitしない。以前のsnapshotを維持し、1つの`scanRequestId`にpath/content-freeなgeneric terminal Operation Errorを1件公開し、process/sessionを利用可能なまま保つ |
| REST ownerを持たない自動startup workがthrowまたはreject | Process top levelへのunclassified propagation | Attempt resultまたはgenerationをpublishせず、process/sessionのsurvivalを保証しない。Product API/log/telemetryはraw errorを含まず、runtime所有のlocal uncaught-error outputはproduct control外に残る |
| Completeまたはcontracted-partial transitionを使用できない別の決定的なfatal returned outcome | Closed coordinator outcome | Attemptをabortし、resultまたはgenerationをcommitせず、以前のsnapshotを維持し、固定されたpath/content-freeなlifecycle representationだけを公開する。明示rescanではそのSourceをstaleとしてmarkしてよい |
| Disable/shutdown/supersession/failureがauthorityをrevoke | `revoked`、coordinator | Late byte、extraction、diagnostic、DTO、event、graph mutationをすべて破棄する |
| Atomic commit後にtransportが失敗 | 既存のcommit済みoutcome、host | Truncated bodyをpartialとしてrelabelまたは公開せず、commit済みgenerationの認証済みrefetchを許可する |

## 複雑さの追跡

Pure Node.jsというproduct制約は、same-handle read、検出したraceのfail-closed、source valueを複製しない
diagnostic/logging、review要件を免除せず、
文書化した残存race riskを導入する。避けられない実装costを明示的に追跡する。

| 複雑さ | 必要な理由 | 不採用とした単純案 |
|---|---|---|
| `lstat`/`realpath`/`open`/`FileHandle.stat`の反復検証とsame-handle read | 通常の同時変更をbyte受理前に検出し、identity、metadata、canonical containmentが変化したresultを破棄する | 直接の`readFile(path)`やglob-only traversalにはgeneration-bound authorization、identity一致、post-read race detectionがない |
| Publication-authority revocationとcleanup-onlyなlate continuation | Disable、shutdown、cancellation後に完了したworkが新しいsession stateを変更するのを防ぐ | Cancellationをphysicalなkernel-I/O terminationと扱うと未対応の保証になる |

**残存riskと解消path**: Node.jsではpath validationと`open`が1つのatomic kernel operationではないため、十分な
権限を持つactive mutatorが検出不能なroot/ancestor replacement race、または有効な`O_NOFOLLOW`を利用できない場合の
final-entry replacement raceに勝つ可能性がある。承認時はそのcaseだけをscope外として扱い、current checkをcontainment
proofと呼んではならない。Threat modelを拡張するには、atomicなbeneath/no-follow
semanticsを持つ将来のNode directory-relative API、またはscan rootを囲むOS強制のread-only snapshot/sandboxを
導入し、security reviewとadversarial test planを更新する必要がある。

またNode.jsはstalled kernel filesystem operationすべてのwall-clock cancellationを保証できない。Disable、shutdown、
明示的cancellationはpublication authorityをrevokeしてlate resultを破棄し、coordinator serializationによりcommit済み
generationとのinterleaveを防ぐ。Approvalはauthority revocationをphysical cancellationやproduct定義時間内のkernel completionの
証明として記述してはならない。このresidualを除去するには、将来のpublicなcancellable filesystem primitive、またはterminate/drain可能な
OS-enforced read-only worker/sandboxを採用し、resource-leakとdisable-raceのtestを更新する必要がある。
