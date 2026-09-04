# Data model: エージェントカスタマイズの調査

[English](data-model.md)

Modelには2つの表現がある。

- **Internal session record**はabsolute path、raw byte、atomic snapshot
  構築中のdecoded authored contentを含み得る。Public DTOやDiagnosticには入れない。
- **Public DTO**はinventory済みfileと安全にnormalize済みのin-Source target用Source-relative locator field、readable fileの
  完全なauthored source text、認識したkindが公開する宣言ごとにparserが解決した値、authored relationship
  targetのexactなdecoded source slice、escape済みで非認可のroot
  presentation label、recognition、relationship、diagnostic、generation scopeのopaque IDを含む。Authored content内の
  環境変数参照はliteral textのままとし、process environment値をreadする権限を与えない。

Check-in済みrelease-evidence fixture manifestはtest-only dataでありproduct DTOではない。Closedでversion付きのschemaは、
一意でstableなcase ID、SC-003/004/005/007のcriterionとrequired-class membership、fixtureまたは決定的builderへのreference、
客観的expected outcome、参照する各fixture digest、declaredした非ゼロclass minimumを持つ。`manifestVersion`は初期値1のpositive safe integerとする。別のcanonical digest fileがmanifest
byteを対象とする。Release evidenceはそのversion/digestと実行した全case IDを示し、schema error、caseのduplicate/missing、
classの空集合、fixture/digest drift、未実行case、declared minimum未満のdenominator countはinvalidなrelease recordとする。Caseのremove/reclassify、required-class定義またはexpected outcomeの変更ではmanifest versionをincrementして明示的なreviewを受け、fixture byteだけの変更では代わりに影響するfixture digestとcanonical manifest digestを更新する。Revision-policy validatorはtest-onlyな2つのmanifest object `previous`と`current`を受け取り、denominator-semantics変更では`current.manifestVersion > previous.manifestVersion`を要求する。これらtable-driven comparison objectとchange classificationはcontract-test inputであり、release DTOまたはreview recordではない。Digest driftだけでdenominator semanticsの変更を認可しない。Human reviewは、初回作成またはprior/current-version context、変更したdenominator member/definition/outcome、reviewer decision/referenceとともにbilingual release validationへ別に記録する。

## Entity関係

```text
ContractRegistry（immutable、contract-versioned）
├── VendorBehaviorStatement
│   └── EvidenceCitation（1つ以上）
├── RuntimeCompositionStrategy
│   └── EvidenceCitation（1つ以上）
└── InspectionRuleRegistry
    └── InspectionRule
        └── EvidenceCitation（1つ以上）

SessionSnapshot
├── Source（Repositoryを正確に1つ）
│   ├── SourceBoundary（正確に1つ）
├── Source（Globalを0から4つ。memberごとに最大1つ）
│   ├── SourceBoundary（admit済みtool homeを正確に1つ） → owning GlobalToolControl
├── ScanAttempt（queuedを0以上、runningを最大1つ。commit前は非公開）
├── RepositoryScanGeneration（最後にcommit済みのものを正確に1つ。Repository sequenceはbootstrapから存在）
│   └── CustomizationFile
│       ├── ToolRecognition（0以上; 空になるのはrecognitionが所有しないfile —
│       │   censusだけが列挙したfile、またはreadがdiagnostic-onlyにしたadmit済み
│       │   candidate — に限る）
│       ├── Relationship（0以上）
│       └── Diagnostic（0以上）
├── GlobalScanGeneration（最後にcommit済みのものを0または1つ。Global sequenceはenableとdisableの
│   間だけ存在し、CustomizationFile substructureは同じ）
├── StaleSourceFailure（未解決の明示rescan失敗を0以上）
├── GlobalConsentPreview（current lexical previewを0または1つ）
├── GlobalConsent（active recordを0または1つ）
│   ├── GlobalToolControl（confirmed toolごとに1つ）
│   └── GlobalControlView（recover可能なpublic control DTOをnullまたは1つ）
├── GlobalEnableOperation（running/queued cancellable commandを0または1つ。internal）
├── GlobalDisableOperation（joined priority-barrier commandを0または1つ。internal）
└── Diagnostic（fileまたはsource scopeのfailure）

BrowserState
├── ClientDataState（request/epoch/session/fence guardと中央purge）
├── FilterState
├── ComparisonSelection（kind固有のcomparison surfaceごとに1つ: そのrouteの座標）
├── EditorModelState（0以上。active route/generationのみ）
├── RecoveryViewState（control-onlyなpurge後recoveryと明示resume）
└── SessionViewState（booting/inspection/recovery/ended viewとtransport-loss adoption）
```

## Entity

### SessionSnapshot

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `sessionId` | opaque string | DTO | Processごとにrandom。Non-authorizingなsession identityのみで、access-control secretではない |
| `createdAt` | `UtcTimestamp` | DTO | Process開始時刻 |
| `sources` | `Source[]` | DTO | Repositoryを正確に1つ、Globalを0から4つ。member — Copilot、Claude、Codex、共有agent home（FR-045） — ごとに最大1つ |
| `repositoryGeneration` | `GenerationNumber` | DTO | Repository sequenceの最後にcommit済みsnapshotを識別し、Repository sequenceのcompleteまたはpartialの正常commit時だけ単調増加 |
| `globalGeneration` | `GenerationNumber \| null` | DTO | Global sequenceの最後にcommit済みsnapshotを識別する。Global sequenceが存在しない間（Global inspectionがdisabledまたは未enable）はちょうどnull。1つのsequence内で単調増加し、disable後に新規作成したsequenceはincrement済み`globalContentEpoch`のもとで`1`から再開する |
| `snapshotState` | `current \| stale-after-fatal-rescan` | DTO | `staleFailures`から派生し、未解決の明示rescan失敗が1件以上ある間だけstale |
| `staleFailures` | `StaleSourceFailure[]` | DTO | Published Sourceごとにcurrent entryを1件持ち得る。Source順にsortし、`snapshotState`がcurrentの間だけ空 |
| `globalControl` | `GlobalControlView \| null` | DTO | Active consent/control stateがない場合だけnull。Raw rootを公開せず、purge後のfresh clientが即時disableとpreview-gated retry controlをrecoverできる |
| `globalEnableInProgress` | `{ kind: 'initial-enable' \| 'retry', operationId, previewId } \| null` | DTO | Registered Global enable operationを示すread-only coordinator projection。Tool subset/outcome、root、context、source/boundary/scan ID、job、authorityを含まず、fresh clientがduplicate retryを抑止し、frozen preview再取得とdisableを実行できる |
| `globalDisableInProgress` | `{ operationId, state: 'draining' \| 'committing' \| 'failed', message? } \| null` | DTO | `globalControl`がnullの場合も含むnon-complete disable barrierのread-only projection。Root/content/resource ledgerを含まず、control-only all-inspection-data fenceをselectし、`failed`中だけfailed requestのerror messageを`message`に保持し、fresh clientがcleanupへjoin/retryできる |
| `globalContentEpoch` | non-negative safe integer | DTO | 0から開始し、non-no-op Global disable barrierのfirst acceptanceごとにatomic incrementする。全ordinary successをbindし、serverはfence時点で未linearizeのinspection-data successをrejectし、clientはgreater epoch観測後にolder dataをrejectする |
| `sessionDiagnosticIds` | opaque string[] | DTO | Currentなout-of-generation lifecycle diagnostic |
| `repositoryFailureDiagnosticId` | opaque session Diagnostic IDまたはnull | DTO | Currentな決定的automatic Repository admission/initial-scan failure。最初のexplicit rescan実行中は保持し、successでclear、terminal failureではそのrescanの`StaleSourceFailure` ownerへatomic replace |
| `invocationCwd` | absolute platform path string | internal | CLI validation前に`process.cwd()`から正確に1回captureしたvalue。変更せず、read authorityとして公開しない |
| `rootOptionValue` | exact stringまたはnull | internal | 省略時null。それ以外はlifecycle/audit correlation専用にsole validated `--root` argumentを保持する。Lexical selection後はfilesystem operandに使わない |
| `selectedRepositoryRoot` | absolute platform path string | internal | `--root`省略時は`invocationCwd`。指定時はabsolute optionをそのまま保持するか、relative optionをplatformの`node:path` resolutionで`invocationCwd`に対してresolveする。Selectionはfilesystem/network I/Oを一切行わない |

`SessionSnapshot`はnormal full snapshotで、`globalDisableInProgress`がnullの場合だけ返す。Disable barrier acceptance後はcommit済み各generation/全Sourceを
cleanup/retry用にinternal保持してよいが、full session、inventory、generation、Source、file、detail、Diagnostic、relationship、authored metadata、
comparison routeはすべて固定の`global-disable-pending` conflictを返す。Session routeだけは下記control-only `GlobalFenceRecoverySnapshot`を返す。
各data handlerは`globalContentEpoch`をcaptureしてsuccess bodyを完全構築した後、coordinator lock下でepoch不変かつfence nullを要求してbodyをbindする。
それ以外はbodyをdiscardしてconflictを返す。Acceptance前に完全bind済みbodyはpre-fence-authorizedでrecallできず、別tabはgreater epoch/fence観測まで
receive/adoptし得る。このbounded in-flight residualをretroactive revocationと主張せず明記し、下記browser purgeがobservation後に除去する。
Disableが`failed`でもdata accessをrestoreしない。`remove-active-state`のterminal successはGlobal generation sequence全体と
そのSourceをdiscardし、Repository sequenceとそのgeneration/IDには触れない。`cleanup-only`のterminal successはcommitted stateを
一切変えずfenceを除去する。どちらのterminal successも変更のないRepository generationを再公開する。
Unrecoverable cleanupではprocess restartをfallbackとする。

### GlobalFenceRecoverySnapshot

`globalDisableInProgress`がnon-nullの間、session responseはこのexact DTOだけとする。正確に`{ sessionId,
globalContentEpoch, globalControl, globalEnableInProgress, globalDisableInProgress }`を含み、
disable projectionはrequired/non-nullで、`failed`中はfailed requestのerror messageを持つ。失敗したtoolの理由は
そのcontrol自身の`failureCode`に載るため、recoveryは専用のDiagnostic arrayを持たない。Generation、Source、
Repository failure、stale failure、Diagnostic/error、file、path、authored value、resource fieldを一切持たない。

CLIは`process.cwd()`を正確に1回captureし、`--root <path>`を受理する（反復`--root`は引数parserのlast valueへ解決）。明示的な
empty valueはsession作成とbrowser openの前にfixedでactionableかつsource-value-freeなstartup errorとし、
valueの欠落は同じboundaryでGunshiのtyped argument validationによりrejectする。Productはparser所有のcheckを重複実装しない（FR-001）。Absolute optionはそのまま保持し、
relative optionはcapture済み`invocationCwd`に対してresolveする。Root selectionは`process.chdir()`、environment reread、
filesystem I/Oを使わない。選択済みrootの存在とreadabilityはselection時ではなく最初のscanが判定する（FR-002）。
Process開始時にsessionは、file/diagnosticが
空のzero-I/O bootstrap Repository generation 0と、その選択済みstringだけをnon-authorizing identityとしてbindしたenabled/idleな
Repository Sourceをpublishする。Global Sourceはまだ作らず、最初のRepository scanを自動queueする。
Repository picker、ancestor search、profile、cache、resume identifierは持たない。

Local hostはauthenticationをdisableしたdevframe local-tool frameworkである
（spec Clarifications § Session 2026-07-22、Constitution § Quality and Safety Standards）。devframeはpackaged
`dist/public` treeからbuilt SPAを直接serveし、全session API operationを同じloopback channel上の
devframe RPC function（`defineRpcFunction`）として公開し、port選択とhost bindingを所有する。
Startup時のbrowser openはproductが`open` packageを通じて所有し、devframeのbundled openerは
無効化される。Session保護はloopback限定の`localhost` bindのみであり、このmodelはper-session
capability/token entityもrequest-classification recordも定義しない。Unauthenticatedな
loopback hostの残存exposure — 他local processと、DNS rebinding経由のmalicious web page —
はdocumented limitationである（QR-003）。

`UtcTimestamp`はvalidなcalendar fieldを持つ`YYYY-MM-DDTHH:mm:ss.sssZ` formのexact 24-byte ASCII UTC valueとし、
このmodelでtimestampと呼ぶ全fieldが使う。`GenerationNumber`はactive Node.js runtimeが表現できるnon-negative safe integerとする。

Node.js、parser library、browser、OS、filesystem、実行環境から継承するcapacity以外に、Inspector固有の
byte数、file数、entry数、graph数、parser depth、request/response size、queue capacity、
wall-clockのresource上限は定義しない。Error handlingは層構造に従う。1 fileに限定されたfailureはFR-028のもとで
そのfileのDiagnosticになり、それ以外のread/parser/scan operationのthrowまたはrejectionはdomain layerで
catch/classifyしない。そのようなoperationはattempt由来のitem、Diagnostic、scan result、response body、generationを
生成しない。Requestを所有するouter boundaryはそのfailureをrequestのerrorとして通常どおり報告し、自動startup operationはprocess
top levelへ到達する。Engine/processの回復不能な終了とruntime所有のuncaught-error outputをapplication Diagnosticへ変換または
controlできるとは主張しない。

成功するAPI responseはcomplete DTOを返し、意図的にtruncateしない。Response serializationは
devframe RPC channelが所有する。Handlerはcoordinator lock下でstate/jobをcommitして宣言済み
result valueを返し、devframeがその値を — successもhandler errorも — そのままserializeする。事前serialize済みの二重コピーはdevframe channel上では
冗長な二重serializeなしに表現できず、宣言済みresultはすべてplainなJSON値で、そのserializeは
実装バグ以外では失敗しない。
Handlerがreturnした後のserialization/encodingまたはdelivery failureはcommit済みjob/stateを
rollbackまたはduplicateせず、2件目のfailureを記録せず、truncated bodyをpartial DTOへ
変換しない。Requestは通常のerrorを報告し、clientはtransport failureとまったく同じように
fresh session snapshotからrecoverする。Monacoとbrowserも実行環境が提供する能力を使い、comparison failure時も存在する各側のcomplete
authored source view — 両ファイルの、または存在する1ファイルのviewとその明示された不在 — を利用可能なままにする。

`globalEnableInProgress`のようなauthority-free live-operation projectionはadmit済みsuccessではなく、所有session API requestの実行中に
表示され得る。Candidate state/authorityを含まず、atomic commit前にoperationが失敗すればremoveし、commit済みstateに対する
success-response gateを弱めない。

Global disableだけは、asynchronous drain完了前にbarrier acceptanceがpublication authorityをrevokeする必要があり、正当にrollbackを
主張できないため例外とする。そのacceptance mutation、terminal success gate、retained request failure、retry ruleは
`GlobalDisableOperation`で閉じ、他commandはこの例外を再利用できない。

### Source

| Field | Type | Rule |
|---|---|---|
| `sourceId` | opaque ASCII string | Server生成でprocess lifetime中はstable |
| `kind` | `repository \| global` | Repository Sourceを正確に1つ、Global Sourceを0から4つ |
| `member` | `copilot \| claude \| codex \| agents \| null` | Repositoryはnullと組み合わせる。各Global Sourceはfixedな4-member set（3つのsupport対象toolと共有agent home）のmemberを正確に1つ持ち、2つのGlobal Sourceが同じmemberを共有しない |
| `enabled` | boolean | Repositoryとpublishedな全Global Sourceはtrue。AbsenceはそのtoolにSource未公開であることだけを表し、disabled/pending/retryable control stateは`globalControl`で区別する。Disabling sourceはatomic removalまでtrue |
| `status` | `idle \| scanning \| disabling \| ready \| partial \| failed` | 後述transitionに従う。Publicな`partial`は、traversal完了後に1つ以上のfileがfile-confined outcome（unreadable、admit済みcandidateのbinary content、parse failure — censusが列挙したcompanionのbinary bytesはその通常の事実であり、何もconfineしない。FR-025）だけを持ち、影響のない全fileがcompleteであるgenerationのcommitだけを示す。`failed`は最新attemptが失敗し、最後のcommit済みsnapshotが利用可能であることを示す。Fatalな明示rescanだけがsnapshotをstaleにする |
| `boundary` | `SourceBoundary` | 選択済みrootを正確に1つ持つ。Repositoryはcapture済み`process.cwd()`またはresolve済み`--root`、GlobalはそのSourceのtoolについてconsent済みの1つのhome root |
| `generation` | `GenerationNumber` | 所属sequenceの最後にcommit済みgenerationと一致する。Repository Sourceは`repositoryGeneration`、公開済み各Global Sourceは`globalGeneration` |
| `scanRequestId` | opaque ASCII stringまたはnull | このSourceで最後にadmitしたscan。Admission直後に設定し、waiting/scanning/ready/partial/failedを通して保持して古いrequestのstatusとの混同を防ぐ。Scan admission前、またはこのSourceでadmitした全attemptのpublication authorityがrevokeされた後だけnull。Revokeされたattemptのoverlayはadmission前の状態へ正確に戻るため、Sourceは結果を破棄されたrequestではなく「requestなし」を述べる |
| `progress` | `ScanProgress`またはnull | `scanning`/`disabling`中および`ready`/`partial`後だけnon-null。`idle`、`failed`ではnull |
| `diagnosticIds` | opaque string[] | 最後のcommit済みgenerationのsource-scoped diagnostic |

`status`、`scanRequestId`、`progress`はsession所有のoperational overlayであり、fatal attemptはcommit済みSource graphや
generation所有IDを変更せず更新できる。Boundary、condition、file、recognition、relationship、generation-scoped
diagnostic contentはatomic generation commitでだけ変更する。

### SourceBoundary

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `member` | `copilot \| claude \| codex \| agents \| null` | internal | 公開済みowning Sourceのmemberと一致し、Repositoryはnull |
| `displayRoot` | ASCII `RootPresentationEncoding` string | DTO | Source rootのdeterministic encoding。`SourceRelativePath`、inventory-item locator、caller input、read authorityではない |
| `root` | exact absolute platform path string | internal | 選択済みRepository rootまたはそのtoolのconsent済みhome root。このSourceの全inspected-source filesystem operationのbase path |
| `origin` | `process-cwd \| root-option \| default-home \| environment` | DTO | Read authorityを与えずrootの選択理由を示す |

各Sourceは正確に1つのboundaryとrootを持つ。Repository boundaryはgeneration 0からescape済み`displayRoot`とともに存在し、
Global boundaryの`tool`は所有Sourceとactive `GlobalToolControl`に一致する。複数tool homeを1つのSourceへ結合しない。
Inspected-sourceの全filesystem I/Oは`src/server/inspection/`配下の単一inspection moduleに置き、boundary root配下の
read-onlyで通常の`node:fs/promises` traversalとする（QR-003、FR-019）。Traversalとreadはsymbolic linkを透過的に辿る。
Inspectorは同じpathをreadするagentが見る内容を示すためであり、targetがmissingまたはunreadableなlinkはそのfileの通常の
per-file diagnosticになり、再帰traversalはvisited directoryをreal pathで追跡してlink cycleがscanの終了を妨げないように
する（FR-024）。Readできないfileは他fileへ影響せずper-file diagnosticになる（FR-028）。存在しないかdirectoryとして
readできないRepository rootは、sessionを利用可能なまま保ちつつactionable diagnosticとともにscanを失敗させ、そのattemptの
partial inventoryをpublishしない（FR-002）。Missingまたはreadable directoryでないconsent済みGlobal rootは、他toolの
commitを妨げずそのtoolをabsent/failedとして記録する（FR-013）。

### SourceRelativePath

`SourceRelativePath`はfileの表示、filter、admission record、normalized relationship targetに使う
value objectである。

| Field | Type | Rule |
|---|---|---|
| `sourceId` | opaque ID | Pathを1つの所有Sourceへbindする。単独でread authorityとして受理しない |
| `value` | POSIX-style string | Exactなraw entry nameを`/`でjoinしたそのSource rootからの相対path。Leading slash、URI scheme、NUL、empty/dot segment、`..`、home shorthand、environment expansionなし |

Repository Sourceでは`value`を選択済みRepository rootからの相対pathとする。Global Sourceではそのtoolについてadmit済みの
home rootからの相対pathとする。Valueはpresentation、filter、lookup、selectionのidentityであり、traversalが返した
raw entry nameそのままの綴りである（FR-024）。Filesystem operationはこれを再parseせず、保持したraw segmentを使う。
Raw nameはNode.jsがそのentryに対して返したstringである — `fs`は文書化された既定としてnameをUTF-8で
decodeするため、valid UTF-8でないplatform上の名前はreplacement-decodeされて届き、そのstringを通じて
platformが再解決できない名前は、影響を受けるoperationの通常のfailureとして表面化する。
Presentationはstored valueを変えず、control character、双方向書式characters（U+061C、U+200E、U+200F、U+202A–U+202E、U+2066–U+2069）、lone surrogate、U+200Bのようなdefault-ignorable code pointをescapeする。書式charactersは周囲の文字順を反転させるため、いずれかを含むpathは自身が識別するpathとは別のpathとして表示されてしまい、lone surrogateは1つのreplacement glyphとして描画されるため、どのsurrogateを含むかだけが異なる2つの名前は同一に表示されてしまい、default-ignorable code pointは何も描画しないため、それを含む名前は含まない名前として表示されてしまう。空白は意図的にauthoredのまま残す。空白は読み手が認識できる文字だからである。すべての文字が空白であるpath labelは代わりに全体を綴って表示する。何も描画しないlabelは、そのcontrolに可視textもaccessible nameも残さないからであり、空白を畳むsurfaceが曖昧に描画してしまう値も同様に綴って表示する。
Wire上では`sourceRelativePath`は`value` stringだけをserializeし、
containing file DTOの`sourceId`がpublic ownership linkを提供する。

### Packaged dist内容

同梱するstatic-asset manifest entityは存在しない。Packaged `dist/` treeはtool所有のbuild
outputである。Pipelineのclean stepが新鮮な`dist/`を保証し、`nuxt build`がSPAを`dist/public`へ、
tsdownがNode server bundleをdist直下へ出力する。devframe hostは`dist/public`を直接serveし、
`package.json.bin`は`dist/cli.mjs`を直接指す。同梱されるartifact同士をuser runtimeで相互再検証
しない（Constitution Principle I — artifact integrityはbuild pipelineとrelease gateが所有する）。

`verify:package` release gateは、package contractが依存する正確に2つのentry pointだけを
regular fileとして検査する。`dist/public/index.html`（devframe hostがserveするSPA shell）と
`dist/cli.mjs`（`package.json.bin`の直接target）で
ある。Package testは別途、packed tarballに対してcontract済み`package.json`の`name`、`version`、
`type`、`bin: dist/cli.mjs`、`files`、`engines.node` valueのexact一致をassertする。`node:fs`は
package所有fileのreadに使えるが、build outputをinspected-source fallbackとしては扱わない。

### GlobalRootInputCapture

Sessionごとにeditor-launcher探索前のstartup captureを1つ作る。Hostはenvironment propertyを
`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`の固定順で正確に1回ずつreadする。CaptureしたJavaScript
`undefined`だけをabsentとし、`''`を含む全stringをpresent overrideとする。そのsessionでimport済み
`node:os.homedir()`を正確に1回callし — 共有agent homeは常にそこからderiveされる — 、そのexact return stringを`capturedHomedir`として保持する。Host自身は`HOME`、
`USERPROFILE`その他のplatform home inputをread/選択せず、そのplatform behaviorはNode.js APIが所有する。

Fixed mappingは、Copilot → `COPILOT_HOME`または`node:path.join(capturedHomedir, '.copilot')`、Claude →
`CLAUDE_CONFIG_DIR`または`node:path.join(capturedHomedir, '.claude')`、Codex → `CODEX_HOME`または
`node:path.join(capturedHomedir, '.codex')`とする。Joinはそのsessionのabsent propertyだけに最大1回行うlexical operationで、existence check
その他filesystem operationを行わない。Exact stringを`lexicalRoot`とし、empty、relative、NUL-containingその他表現不能な
resultもstringのままclosed lexical input stateを受け、別fallbackを行わない。Environment access、`homedir()`、join、retention、
classification、presentation encodingがthrowするかrequired stringを作れない場合、sessionもbrowserも存在しないstartupをそのownerless errorで通常どおり失敗させる。Preview、`scanRequestId`、consent、root、Source、authorityを作らない。正常なcaptureはsession全体で変更せず保持する。そのeligible rootを選択済みRepository rootと合わせて完全なlauncher exclusion setとする一方、capture自体はpreviewもauthorityも作らない。

### GlobalConsentPreview

Session APIのconsent routeは、sessionで1つだけ保持した`GlobalRootInputCapture`からprocess inputを再読込せずに全previewを作る。作成と返却のどちらでも、候補Global root配下のfilesystem operationを一切行わない。Complete preview objectのconstructionはatomicであり、constructionのthrow/rejectionはcreate requestをacceptance前にordinary errorで失敗させ、prior current previewを変更せず、jobもauthorityも作らない。Complete objectを保持した後のDTO/transport serializationのthrow/rejectionはそのrequestのordinary errorであり、新しく作成したpreviewがcurrentとして保持され得る。この場合もjobやauthorityは作らない。

| Field | Type | Rule |
|---|---|---|
| `previewId` | exact 43-character unpadded base64url string | 独立した32-byte CSPRNG drawのcanonical encodingでprocess-memory lookup key。新previewは以前の未同意previewをinvalidateし、active consent中はそのexact previewをfreeze/reuse |
| `previewEpoch` | non-negative safe integer | Internalでserializeしない。新しく作成したpreviewごとにincrementし、opaque IDをorder valueにせずreplacement/revalidationをbindする |
| `allowlistVersion` | date string | Current shipped contract version |
| `traversalPlanVersion` | date string | 同梱typed traversal-plan setのversion。`allowlistVersion`とのこのrecordレベルのpairが、previewがbindするclosed selection policyとcanonical selector programを特定する |
| `entries` | 正確に4 member entry | Copilot、Claude、Codex、共有agent homeの固定順 |
| `entries[].member` | member enum（`copilot \| claude \| codex \| agents`） | Closed value。`agents`は共有agent home（FR-045） |
| `entries[].origin` | `default-home \| environment` | Invalidでもenvironment entryを使い、暗黙fallbackしない |
| `entries[].lexicalRoot` | exact raw string | Internalのみ。Escape前のenvironment/default valueを保持し、log/serializeしない |
| `entries[].displayRoot` | ASCII `RootPresentationEncoding` string | `lexicalRoot`のexact deterministic encoding。Owning Sourceが存在する前にoriginを持ち、`SourceRelativePath`、inventory-item locator、canonicalization claim、read authorityではない |
| `entries[].inputState` | `eligible \| present-empty \| relative \| invalid` | I/O前に下記exact ordered `Global lexical state` algorithmでassignする。`eligible`だけがconsent後boundaryになれる |
| `excludedRuleIds` | sort済みexcluded rule ID[] | Authored proseを受け付けず表示除外を決める |

`allowlistVersion`と`traversalPlanVersion`はいずれも`YYYY-MM-DD`のdate stringで、それぞれ同梱contract全体と
同梱のcompile済み`TraversalPlan` setを指す。各々は指す対象の変更と歩調を合わせてbumpする —
`allowlistVersion`はpresentation allowlist/vendor contractの変更時、`traversalPlanVersion`は同梱setの
いずれかのcompile済みplanの変更時 — 各々は同梱registryに焼き込まれたcanonicalなcurrent valueを1つ持ち、
runtimeで導出しない。これらはplan-record形状をversionづけるper-plan `TraversalPlan.schemaVersion`（固定literal `1`）とは
別物で、plan setの内容ではない。plan setの変更は`schemaVersion`を変えずに`traversalPlanVersion`をbumpする。

Hostはsession-start captureを構築するときに、retained raw valueを変えず`RootPresentationEncoding`を適用する。Allocation能力はNode.js、OS、browserから継承する。
Complete captureを保持する前のthrow/rejectionは、上記のownerless startup-failure ruleに従い、sessionもbrowserも存在しない時点で失敗する。Previewや`scanRequestId`を作らず、normalization、
canonicalization、root creation、readも行わない。Size-based input stateも作らない。Previewはserverが
保持するopaque `previewId`で識別する唯一のrecordであり、root fieldはいずれもnullableでなく、どのencoding stepも
escapeの逆変換やUnicode normalizationには依存しない。
Invalid environment valueはescapeして
表示するが、許可pathにnormalizeしない。Present-empty、relative、invalid entryは固定preview表示だけを使い、retained `Diagnostic`を
作らない。Confirmation後は4 entryすべてが`GlobalToolControl`を受け取る。`eligible` entryだけがconsent後admissionへ進み、
後でtool failure Diagnosticを作り得る。Lexical-ineligible controlはpath-free rejected controlとなり、固定reasonは
frozen previewから表示する。
Absolute spellingは通常のhome外でもすべて`eligible`とし、その場所だけを理由にrejectしたりconsent前I/Oを許可したり
しない。文書化済みdefaultを選択するのは設定がabsentの場合だけで、empty、relative、invalid、consent後rejectの設定から
fallback authorityを作らない。
Admissionは保存済みinternal raw `lexicalRoot`だけを使い、`displayRoot`をpathに使わずenvironmentを再読込しない。
Preview creation/retrievalはcoordinator lock下でlinearizeする。Consentがactive、initial `GlobalEnableOperation`がregistered、またはnon-complete
`GlobalDisableOperation`がpreview fenceを保持する間、
preview取得はIDを含む同じ保存済みDTO-visible objectをfield semantics上byte-for-byteで返し、environmentを読み直さずreplacementも
作らない。どちらでもない場合だけretained captureからnew previewを作り、`previewEpoch`をincrementしてprior unconsented previewをreplaceできる。Complete constructionはreplacementより先に完了しなければならないが、その後のDTO/transport serialization failureではnew complete previewが保持され得る。
Initial operationがconsentをactivateせずterminalになった場合、そのoperationをunregisterした後だけfreezeを解除する。Client purge後にexact
consent表示を復元する唯一のpathであり、in-flight enableが到達不能previewのauthorityをcommitすることを防ぐ。

### GlobalConsent

| Field | Type | Rule |
|---|---|---|
| `allowlistVersion` | date string | 表示したcurrent contractと一致すること |
| `previewId` | opaque string | Current in-memory previewと完全一致すること |
| `confirmedTools` | exact `[copilot, claude, codex, agents]` | 凍結済み4 entryすべてと一致するserver-derived固定member set。Requestはselectorを持たずnarrowできない |
| `confirmedAt` | `UtcTimestamp` | Memoryのみ |
| `active` | boolean | Global inspection disable時にclearし、member Global Sourceをすべて除去 |

Consentはallowlist contractに表示したpathだけを許可する。隣接settings、credential、state、skill、
plugin、任意env pathは許可しない。
Confirmation commandはmember listを持たず、serverはfrozen previewを検証後、lexicalにinvalidと判明済みのentryも含む4 member
すべてをclosed orderで導出する。Retry時のoperation work setは`retryableTools`へprojectされたcontrol、すなわちnon-pending unpublished
admitted controlと`retryDisposition: same-preview`のrejected controlだけから導出する。Lexical `new-preview-required` controlはfrozen preview下で除外し、clientは
tool選択でconsentを変更できない。
Confirmation後、各eligibleなfrozen rootは、存在してreadableなdirectoryである場合にちょうどadmitされる。Missingまたは
unreadableなrootは、そのtoolだけをactionable failure recordとともにrejectし、fallbackを行わない。
Applicationは別rootへ暗黙置換せずconsentを広げない。Userはexact frozen rootがadmissibleになるようfilesystem/configurationを
修正してsame-preview retryを使う。Root string自体を変更する必要がある場合だけGlobal inspectionをdisableしてnew previewを取得する。
Admit済みtoolごとに、そのtoolの表示済みrootへbindしたGlobal Sourceを1つ作成できる。
Confirmationで複数toolを結合したGlobal Sourceを作らず、1 toolのSourceに別tool rootへの権限を与えない。
初回enable後もretryable toolにSourceがない場合（all-rejected/mixed outcomeを含む）、exact active consentとその
`GlobalToolControl` recordにより、server-derived retryable subset全体だけをrequeueできる。Lexical-ineligible controlにはdisable/new previewが
必要である。既存Sourceはsemantic contentとstableな
`sourceId`を保持する。ただし、初回またはretryのadmitted-subset transaction成功時には新規admit済みSourceをすべて一緒に
publishし、Global sequenceのgenerationを正確に1回commitする。Sequenceが存在しなければgeneration 1として作成し、
存在すればcurrent Global snapshotを正確にN+1でatomicに置換する。公開するSourceのgeneration-owned IDを再生成し — carried Sourceはrecordと
IDを保つ — 、adoptionが置き換えるsnapshotを通じてGlobal sequenceの
old file/detail/comparison/editor stateを無効化する。Repository sequenceとそのgeneration、ID、view
には触れない。別preview/root
には先にGlobal調査のdisableが必要で、retryable toolがないrequestはclosed conflict `no-retryable-global-tool`として拒否する。

Consent後のroot admissionは0から4 memberをadmitできる。Serialized coordinatorはconsentをactivateし、admitted
subset全体に最大1つのprovisional batch scanを作る。Lexical-invalid entry、およびmissingまたはreadable directoryでない
rootはそのtoolだけに影響する。予期しないthrow/rejectionはすべてsession API boundaryへpropagateし、
transaction全体をabortしてprovisional subsetを一切publishしない。全toolが決定的にrejectされた場合もconsentはactiveのまま、
new Source/scan jobをpublishせず、contract済み`active-no-job` stateを返す。
Initial activationではGlobal Sourceが0個となり、
all-rejected retryではgenerationをcommitせず、既存SourceとそのIDを変更しない。後のexact-consent retryはcurrent server-derived
`retryableTools` subsetだけを再validationできる。Root変更またはlexical-ineligible controlのeligible化にはdisable/new previewが必要である。

### GlobalToolControl

| Field | Type | Rule |
|---|---|---|
| `member` | member enum | Consentがactiveな間、Global memberごとに正確に1つ存在する |
| `previewId` | opaque string | Active frozen previewを参照し、in-place変更不可 |
| `state` | `unvalidated \| rejected \| admitted \| published` | Operation-localなprovisional control 4件はすべて`unvalidated`から始まるが、そのstateをactiveな`GlobalControlView`へserializeしない。Lexical-ineligible entryはfilesystem I/Oなしでrejected、`admitted`はreadable-directory admissionに合格したがSource未公開、`published`はSourceを正確に1つ持つ |
| `sourceId` | opaque IDまたはnull | Root admission成功後だけallocateし、Source commitまではinternal。Admissionをやり直す場合は破棄 |
| `failureCode` | closed reason codeまたはnull | そのtoolが失敗しpublished Sourceを持たない間だけnon-null。Lexicalなrejection reasonは正確に`present-empty \| relative \| invalid`、missingまたはreadable directoryでないrootは正確に`root-unreadable`、consent後の決定的scan failureは自身のreasonを持ち、いずれもpath/environment valueを含まない。これがfailure自体である — clientはそのcodeが名指す文を描画し、Diagnosticが言い直すことはない |
| `retryDisposition` | `same-preview \| new-preview-required \| null` | `rejected`以外はnull。Lexical reasonは正確に`new-preview-required`、決定的なconsent後admission/initial-scan reasonはすべて`same-preview` |

`GlobalToolControl`はsession control stateでありscan working setに入らない。正常admissionは単一provisional subset scanを
queueする前に未公開Source IDを事前割当する。決定的にfatalな初回scanはbatch working set全体を
破棄するが、このcontrolはexact-consent retry用に保持し、retryごとに同じfrozen rootを（readable directoryか否かで）scan前に
再admitする。Atomicなdispositionがrejected stateまたはadmitted replacementをcommitするまで、
pre-operation controlをmutateしない。予期しないthrow/rejectionではoperation-local stateだけを
discardし、pre-operation fieldをすべて維持する。Consent後admission failureはそのdisposition時だけ
`rejected` controlをcommitし、同じpreviewでrevalidationできる。Source commit成功時は事前割当IDをpublishし、`SourceBoundary`を
admit済みrootへbindする。決定的なadmission rejectionまたはfatal returned scan outcomeはそのcontrolのcurrent tool Diagnosticを作成/置換する。
Lexical `present-empty`、`relative`、`invalid` rejectionは、その`failureCode`とfrozen previewだけで説明し、それ以上を要さない。
予期しないthrow/rejectionはtool別failureを作らず、accept済みadmitted-subset Global batchではconsent全体について、
failed `batchStatus`へfailed requestのerrorを1回だけ記録する。Source commit成功は
該当する決定的failure recordをclearし、
無関係なtool outcomeは保持する。Global disableはworkをabortしてからcontrol所有diagnosticを
すべて削除し、consent、frozen preview、全controlを削除する。DTOはこのauthorityを作成・変更できない。

### GlobalControlView

| Field | Type | Rule |
|---|---|---|
| `state` | `active \| disabling` | Priority barrier受理時に`disabling`となり、single commitでfieldがnullになるまで維持 |
| `previewId` | exact 43-character base64url string | Activeな256-bit `GlobalConsentPreview.previewId`と一致するopaque lookup referenceで、filesystem pathでもauthorityの付与でもない |
| `confirmedTools` | exact `[copilot, claude, codex, agents]` | Fixed all-members consent setで、clientから選択しない |
| `pendingTools` | sort済みtool enum[] | Atomicなbatch acceptance後だけ、1 accepted subset scanが所有するadmitted tool。Initial/retry validation/admissionはoperation-localかつunobservable。Cancellation開始後の`disabling`中はnull `batchStatus`とempty |
| `batchStatus` | `GlobalBatchStatus \| null` | Accepted admitted-subset queueingからterminal success/failureまでnon-null。Fresh snapshot/lost-acceptance-response recovery用にpromote済み`scanRequestId`を保持 |
| `retryableTools` | sort済みtool enum[] | `active`中、non-pending unpublished `admitted` controlと`retryDisposition: same-preview`の`rejected` controlを正確に含む。Operation-local retry validation中はexact pre-operation projectionを維持し、lexical `new-preview-required` controlを除外する。`unvalidated`はnon-serializedなoperation-local workだけに存在し、`disabling`中はempty |

`GlobalControlView`はactive consent、その`GlobalToolControl` record、coordinator、published Sourceから派生する。
Consentまたはretained control stateがactiveな間、Global Sourceが0個のinitial all-failed/`active-no-job` outcomeと、
既存Sourceを保持するall-rejected retryを含め、
session snapshotごとに返す。Client purge後、SPAはfresh sessionを取得し、
`previewId`でpreview routeからexact stored previewを要求して全path/state/exclusionを再表示してからretryを提示する。
Disableは直ちに利用できる。Published toolは`sources[].tool`から派生しretryableと重複できない。このDTOはadmitted rootもsource contentも含まず、別取得するfrozen previewがunchanged enable request用のexact表示stateを提供する。
失敗したtoolの理由はそのtool自身のcontrolに載るため、fresh clientがownership mapでattachする必要はない。読んでいる
controlが、失敗したtoolそのものだからである。DiagnosticはSource内で何かを読んでいる最中に起きたことを述べるもので、
rootを一度もadmitされなかったtoolには、それが属するSourceが無い。だからこれはDiagnosticではなく、location欄を
空けたDiagnosticでもない。Owning control failureのclearまたはdisable commitまでcodeを保持する。
`GlobalBatchStatus`は正確に`{ scanRequestId, tools, phase, failureRef }`とする。`tools`はnon-empty fixed-tool-order admitted subset、
`phase`は`waiting \| deriving \| enumerating \| reading \| recognizing \| failed`、`failureRef`は`failed`以外nullとする。決定的terminal
failureは`{ kind: 'tool-failures', failedTools }`を使い、non-empty fixed-tool-order toolはそのbatchが失敗させたtoolと
正確に一致する。各toolは自身のcontrolの`failureCode`として理由を持ち、この一覧はそれを繰り返さない。予期しないthrow/reject terminal failureは
`{ kind: 'error', message }`を使い、failed requestのerror messageを持つ。Tool非依存のdeterministic Global batch failureは存在せず、全returned deterministic failureを1つ以上の
exact toolへ帰属させる。Cross-tool assembly/invariant/retention failureはthrow/rejectし、failed requestのerrorとして記録する。
Successでは全new Sourceが同じ`Source.scanRequestId`でpublishされるcommitだけが`batchStatus`をremoveし、`active-no-job`はstatusを作らない。
Retry acceptanceはprior failed statusをreplaceし、disable acceptanceはbatch revokeと同時にclearする。したがってqueued-acceptance responseのdelivery failure後も全accepted
queued/running/terminal batchをrequest-correlateできる。
Disable barrierがpending/activeの間は`state: disabling`かつjob/retry arrayを両方emptyとし、UIはretryを提示せずenable
APIもretryを拒否する。Disable commitが全control/consentを削除した時点だけviewをnullにする。
`state: active`かつ`globalEnableInProgress`がnon-nullの間、UIはenable/retryを提示せず、duplicate enableは固定の`global-enable-in-progress` conflictを
返す。Retryはatomic dispositionまでpre-operation `retryableTools` projectionを維持する。`state: active`かつ`pendingTools`がnon-emptyの間、`batchStatus`は同じtool setを持つnon-failed active phaseで、`retryableTools`は既に`rejected`またはnon-pending `admitted`となった
toolの情報projectionとして残るが、UIはretryを提示せずenable APIは固定の`global-enable-in-progress` conflictを返す。Disableは
直ちに利用できる。`pendingTools`がemptyとなりmatching frozen previewを取得・検証した後だけretryを提示する。
Activeなserialized viewに`unvalidated` controlが存在する状態を禁止する。Accepted pending controlはすべて既に`admitted`であり、
`pendingTools`と同じaccepted-batch membershipを持つ。

Accept済みadmitted-subset Global batchの予期しないthrow/rejectionは、failed requestのerror messageをfailed
`batchStatus.failureRef`へatomicに記録し、そのthrow/rejectionについてtool別failureを一切残さない。後のsame-consent retryは
accept前failureの間このfailed statusを保持し、決定的validationが`active-no-job`へ到達した時点でremoveし、replacement batchを
acceptした時点でreplaceする。そのreplacement batchのterminal failureは同じ方法でnew failureを記録する。Global disableはstatusと
retained errorをclearする。Repository operationとpublish済みSourceのrescanは保持する。したがってretained Global batch failureは
すべてexact accepted requestへ帰属したままとなる。

### GlobalEnableOperation

| Field | Type | Rule |
|---|---|---|
| `operationId` | opaque string | 1回のinitial enableまたはexact-consent retry用のunique coordinator command |
| `kind` | `initial-enable \| retry` | Closed operation type。どちらもcommit済みgenerationではない |
| `previewId` | opaque string | Operation全体でfrozen consent previewと一致 |

Recordが持つのはこの3 fieldだけであり、operationが要する各不変条件は、専用のfieldではなく既存の
機構が保つ。同時に1 operationだけであることはregistration自身が保つ。recordがある間は拒否するからで
ある。Async boundaryを越えた継続は、sessionの現在の`operationId`とregistrationが発行したものを比較して
検査する。Barrierがcancelしたoperationや、後のregistrationが置き換えたoperationはもう一致せず、その
継続は何もpublishしない。Operationが束縛されるpreviewはdomain自身のcurrent objectであり、`previewId`が
それを識別する。評価するmember setはsettlementで導出する。Initial enableでは固定の4件、retryでは
serverが導出する`retryableTools` subsetであり、clientから運ばれることはない。`scanRequestId`は
settlementがqueueするbatchのものであり、`batchStatus`で公開する。Operationが何に解決したかは
settleした`GlobalEnableResultDto.state`、すなわち`queued`または`active-no-job`である。Barrierがcancelした
場合は固定の`global-disable-pending` conflictで応答する。

Initial enableは同じcoordinator lock下でcommandを登録してexact current preview object/epochをfreezeするが、provisional consent、4件のcontrol、candidate ID、全admission outcomeを
operation-localかつ観測不能に保ち、4 entryすべての決定的validationが終わる前に`globalControl`を作成せず
`pendingTools`も変更しない。Registered中に見えるのはauthority-freeな`globalEnableInProgress { kind: 'initial-enable', operationId, previewId }`
coordinator projectionだけで、partial tool outcomeを公開せず、operation unregisterまたはatomicな`globalControl`作成時に消える。Retryはexisting active consentに対してcommandを登録し、mutation前のcontrol、failed `batchStatus`、
diagnostic、pending stateをsnapshotしてauthority-freeな`globalEnableInProgress { kind: 'retry', operationId, previewId }` projectionだけをpublishする。
Retry validation/admissionのその他stateもatomicなbatchまたはactive-no-job disposition commitまでは
operation-localかつunobservableとする。Root validation/admissionとscan-job作成はcoordinator配下だけで行う。全async boundaryの前後で、同じactive
`operationId`、`commandEpoch`、exact preview object/`previewEpoch`、non-aborted signalに加え、initialでは同じoperation-local provisional state、retryでは
同じactive controlを証明する。Initial enableとretryはいずれもsession stateを変更する前にcoordinator lock下でtransitionを
登録する。Cancellation/disableはoperationをdrainし、late continuationによるjob enqueueやauthority再取得を防ぐ。
Running/queued `GlobalEnableOperation`は最大1つとする。決定的なlexical outcomeとreadable-directory admissionはtoolを
rejected/admitted setへpartitionする。予期しないthrow/rejectionはすべてsession API ownerへunwindする。Initial enableは
consent/controlをactivateせず全provisional stateを破棄し、retryは正確なpre-operation snapshotを復元する。どちらもpartial
admitted subsetをcommitしない。全owning toolが決定的validation outcomeへ到達した後、coordinatorはlock下でgeneral
pre-acceptance response transactionを行う。最初にcurrent operation ID/command epoch/preview object/preview epoch/signalを検証し、publishせず、initial consentと4 control
またはretry partition、candidate batch/`scanRequestId`と`queued`、あるいはjobなし/null IDと`active-no-job`をprepareする。
続いて同じlock内で同じ
operation ID/command epoch/preview object/preview epoch/signal/barrier stateを再検証し、その後だけcontrolをatomic activate/applyする。
Accepted batchへadmitされた各toolのprior `failureCode`をclearし、candidate batch/IDをpromote/enqueueして`batchStatus`を作り
`pendingTools`を設定するか、null `batchStatus`でrejected-toolのfailure codeだけをretain/replaceしてactive-no-jobをcommitし、disposition選択、
`complete`化、unregisterをatomicに行い、宣言済みresult valueをdevframe channelのserialize対象として返す。
Per-tool Source commitはobserverに一切見えない。Disable barrierがそのcommit前に先にlinearizeした場合、prepared stateをdiscardし、
同じcheckは`global-disable-pending`を選んでcancellationを
drainする。Drain済みoperationは`cancelled`となり、barrier cleanup前に
unregisterする。Operationが先ならcommit済みqueued acceptance、barrierが先ならconflictとなり、両方にはならない。Terminal operation
historyは保持せず、単一accepted batchは完了までadmit済みtoolすべてにより`pendingTools`とexact `batchStatus.scanRequestId`へ表される。
Failed statusはempty `pendingTools`でretry acceptanceまたはdisableまで残る。Commit後のdeliveryでenvelopeを
再serializeしない。Zero-byte/partial write、socket close、write rejectionでもaccepted control/job/dispositionを維持し、failureも
stale overlayも記録しない。後のjob自体のfailureだけがpromote済みnon-null request IDのもとでaccepted jobのerrorを記録できる。

### GlobalDisableOperation

| Field | Type | Rule |
|---|---|---|
| `operationId` | opaque ASCII string | 1 accepted priority barrier。Join requestは同じIDとterminal resultを共有 |
| `commandEpoch` | non-negative safe integer | Barrier acceptanceでincrement/captureし、全continuation/final commitで一致を要求 |
| `commitKind` | `cleanup-only \| remove-active-state` | 最初のacceptance時に選択し全retryで不変。後者だけがremove対象のpublic Global consent/control/Source stateを持つ |
| `baseGenerations` | `{ repository: GenerationNumber, global: GenerationNumber \| null }` | Acceptance時のsequenceごとのexact commit済みgeneration。Barrierはどちらのsequenceにもgenerationをcommitしない。`remove-active-state`はGlobal sequence全体をdiscardし、`cleanup-only`はcommitted stateを変えない |
| `status` | `draining \| committing \| failed \| complete` | `failed`はrevoked authorityとretry可能cleanup stateを保持し、activeへrollbackしない |
| `frozenPreview` | internal exact preview reference | Pre-barrier previewを`failed`中も保持し、terminal successまでpreview creation/replacementをfence |

Active/queued Global authorityもretained disable failureもないno-op disableは通常single-stage response gateを使い、mutationしない。
それ以外はrequest validation/barrier registrationをcoordinator lock下でlinearizeする。最初のacceptance時にpublic Global consent/control/
Source stateがあれば`remove-active-state`を選び、public Global stateを一度もpublishしていないoperation-local initial enableだけをcancelする場合に
限って`cleanup-only`を選ぶ。Retained failureのretryはfailed operationのexact `commitKind`、`baseGenerations`、removal intent、`frozenPreview`を継承する。
Replacement operationはreinitializeせずsame cleanupを再開し、既に一部cleanupされたpublic projectionから`commitKind`を再計算しない。したがってfailed
`remove-active-state` operationはterminal successでpublic Global graphをremoveするまで`remove-active-state`のままとする。Acceptanceはepoch increment、operation register、
affected publication authorityの不可逆revoke、existing `globalControl`の`disabling`化、`pendingTools` empty化、`batchStatus` clear、
`globalContentEpoch` increment、public Global-content access fence activation、active/queued `GlobalEnableOperation`/Global scan abortをatomicに行う。Operation-local initial enableには公開control snapshotがないが、同じ
internal barrierでrevoke/drainする。このacceptance phaseだけはterminal success commitより先に実行するmodel唯一のtwo-stage例外である。
`draining`/`committing`中のsecond disableはsame completionへjoinし、joined transport disconnectはbarrierをcancelしない。

`globalDisableInProgress`はacceptanceからterminal failureまでoperation ID/statusだけをmirrorし、terminal success時だけremoveする。Cleanup detail/
authorityを公開しない。`globalEnableInProgress`はinitial-enableまたはretry operationがbarrierでcancel/unregisterされた時点で消える。

Acceptanceから`failed`、`committing`、retry drainを通じてbarrierはhighest-priority Global fenceのままとする。全Global enable/rescan requestは
固定の`global-disable-pending` conflictを返し、queued Global commandをdequeueせず、preview retrievalはnew previewのcreation/replacementなしで`frozenPreview`を返す。
Operation-local initial enableだけで`globalControl`がnullの場合も同じである。さらにgeneration fenceとして、non-complete barrier中はnew
Repository rescanをadmitせず、generation-mutating commandをdequeueせず、scan commitを一切許さない。New Repository rescanは
固定の`global-disable-pending` conflictを返す。Acceptance時にrunningだったRepository commandはcommit前にrevokeし、terminal disable success後に正確に
1回だけrequeueしてfailed attemptではreleaseしない。したがってfailed disableとretryの間に`baseGenerations`は変化できず、base mismatchは
rebase/overwrite ruleではなくinternal invariant failureとする。

同じfenceは全full session/inventory/generation/Source/file/detail/Diagnostic/relationship/comparison data requestをrejectし、
`GlobalFenceRecoverySnapshot`だけをselectする。Drain、close、terminal commitの成否に依存しない。Disable retryはincrement済み
`globalContentEpoch`を継承し、retained graphを再びreadableにしてはならない。Terminal successまたはprocess restartまでRepository/Global inspection dataを公開しない。

Barrierはenableが`cancelled`へ到達するまで待ち、final queued-Global-work cancellation sweepを実行し、影響を受けた
in-flight workのsettleを待ってそのlate resultをdiscardし、Global sequenceのzero-I/O discardをprepareする。Drained enable
continuationはjob enqueue/control mutationができない。この順序でacceptance後に完了したvalidationがsweep後へ
authorityを追加することを防ぐ。Barrierがenableのatomic disposition前に勝てばenableは固定の`global-disable-pending` conflict、enableが先にqueued acceptanceを
選べばbarrierがaccepted batchを通常どおりcancel/removeする。Expected cancellationはDiagnosticもretained errorも作らない。

Cleanup後、coordinator lock下でfinal public stateをpublic control/Source removalなしにprepareする。
どちらのcommit kindもnew generationをprepareしない。`remove-active-state`はGlobal sequence全体のdiscardをprepareし、
Repository sequenceとそのgeneration/fileには触れない。`cleanup-only`はcommitted stateを一切変えない。
続いてoperation ID、epoch、
barrier state、`baseGenerations`を再検証する。その後だけ1 atomic terminal commitがfrozen preview、残るoperation-local stateをremoveして
retainedなfailed requestのerrorをclearする。`remove-active-state`では同じcommitがcommit済みGlobal generationをdiscardし、全Global
Source/control/consentとそのstale failure/diagnostic/batch errorをremoveする。`cleanup-only`ではpublic graph transitionを行わない。
その後operationをcomplete化し、final resultをdevframe channelのserialize対象として返す。後のre-enableはincrement済み`globalContentEpoch`のもとでgeneration 1から
始まるfresh Global sequenceを作り、epochがそのeraを区別する。Commit後delivery failureは
rollbackも別error作成もしない。

Barrier acceptance後の予期しないthrow/rejection（drain、final assemblyを含む）はtrigger session API boundaryへ
propagateし、そのfailed requestのerrorとして通常どおり報告する。Operationは`failed`となり、join/retry表示用にそのerror messageを
atomicに保持する。Retained errorはfailed operation自体が持つため、operation-local initial enableだけで`globalControl`がnullの場合も
存在する。存在する`globalControl`は`disabling`のまま、publication authorityはrevokedのまま、
priorなcommit済み各generationをcurrentに保ち、success body/removal commitをpublishしない。
後のGlobal-disable requestはidempotent cleanupをstart/resumeしてfailed operationをreplaceする。別terminal failureはretained errorをreplaceし、terminal
successだけがclearする。Session API requestがtriggerなのでprocessは終了しない。Coordinator queueにproduct固有の数値capacityを設けない。

### EvidenceCitation

維持対象のbehavior、rule、strategyは、reviewした公式sectionをrecord自身の中でciteする。
Citationを主張の隣に置くことで、subjectをkeyとする別のcitation layerを避け、各recordの根拠を
直接確認できるようにする。

| Field | Type | Rules |
|---|---|---|
| `sourceId` | 閉じたsource ID union | このcitationが対応するofficial-sources contract row。Pageの安定した同一性であり、vendorがpageを移動しても変わらない（QR-005） |
| `url` | 絶対HTTPS URL | `officialHost`上のexactなauthored URL。credential、query、fragmentなし |
| `officialHost` | 小文字DNS hostname | このcitationのexact host allowlist。subdomainやsibling hostは含意しない |
| `sections` | non-emptyなexact heading text | Renderされたheading textのみ。heading ID、URL fragment、CSS/XPath等のselectorは不可 |
| `reviewedOn` | ISO date | 該当sectionを読み、引用元recordの主張と突き合わせた後にのみ更新する。見出しの実在確認では進めない。実施者は限定しない |
| `establishes` | Paraphraseしたassertion | Reviewしたsectionがciteするrecordに対して確立する内容。Page textのcopyは不可 |

Reviewしたpageごとの規範的な1 rowは引き続き[Official Sources](contracts/official-sources.md)が持つ。
ここでのcitationはその実装対応物であり、第二のregistryではない。したがって複数recordからciteされるpageは
URLとreview日を繰り返すが、これは主張の隣に根拠を書くこととの引き換えとして意図的に受け入れる。

Citationはpackaged CLIからcompileで除去される。同じbuild flagを共有するvendor locatorも一緒に除去される。
製品はどちらも読まない — citationは主張がどこで確立されたかを記録するもので、
locatorもcitationも運ぶDTO fieldは存在しない — ため、buildは`__ACI_SHIP_MAINTENANCE_DATA__`を
`false`に置換し、citation配列はすべて空に、`locator`はすべてnullに畳まれる。この置換は綴りを誤るか定義を失うと黙って
失敗するので、package suiteがbuild済みartifactにURL、host、review日、paraphrase、locator値が含まれない
ことを検査する。

明示的なmaintainer drift commandはcredential、cookie、repository data、その他のlocal stateを送らない。
CiteされたpageごとにUTF-8のHTML/Markdownを受け付け、citationのexact URLとallowlist hostからの直接`200`を
要求し、redirectは追わない。Redirect、誤ったcontent type、headingの欠落または重複、配信fragmentの未解決
または曖昧さ、decode失敗、回復可能なnetwork/runtime失敗はいずれもdrift checkのhard failureとする。

Drift結果がbehavior、rule、strategyを自動変更することはない。Maintainerはciteしている全recordと両言語の
contract/researchをreviewした後、heading、paraphrase、`reviewedOn`を明示的に更新する。Remote pageのtextや
response bodyはcheck inしない。

### DocumentationStatusとLifecycleQualifier

`DocumentationStatus`はcompleteness/consistencyを表すclosed enum `documented | partially-documented | unknown | conflict`とする。
`LifecycleQualifier`は別のclosed enum `preview | experimental | deprecated`とする。`LifecycleQualifier[]`はuniqueで、
`preview`、`experimental`、`deprecated`のfixed orderに並べる。Empty arrayはmaintain済みlifecycle claimなしだけを意味し、
`stable`と表示または推論しない。

どちらもbehavior・rule・strategy record自身の上にあるmaintenance recordである。どのresponseも
どのsurfaceも、これらを運ばない（QR-005）。製品が報告するのは見つけたカスタマイズファイルであって、
そのfileをadmitしたruleをvendorがどれだけ文書化しているかではない。

### VendorBehaviorStatement

`VendorBehaviorStatement`は、upstream documentationに対するatomicかつsurface-specificな解釈を記録する。
Productのlookup場所を説明するものでfilesystem matcherではなく、readを許可できない。

Locatorの4要素を1 fieldにするのは、それらがvendor自身のlocatorという1つの記述だからであり、また
packaged CLIがまとめて落とすからである。どのDTO fieldもこれらを運ばない。4つを独立にnull許容にすると、
どのbuildも生成しない「半分だけ記述されたrecord」を型が許してしまう。Statementはcondition keyの一覧を
記録しない: それを消費していたprojectionは、それを表示していたsurfaceとともに無くなっており、
どの消費者も読まないfieldはdriftするfieldである（FR-009）。

上向きtraversal descriptorは停止条件を名前に含める。walkがどのdirectoryへ到達するかを決めるのがそれだから
である。`ancestor-chain-to-repository-root`はrepository rootで終わり、`ancestor-chain-to-filesystem-root`
はそれを越えて進む。Vendorがrepository rootをどう認識するかはrecord側に属する — Codexは
`project_root_markers` entryを持つ最近傍のancestorを採り、既定は`.git`でユーザーが上書きできる。

| Field | Type | Rule |
|---|---|---|
| `behaviorId` | stable dotted string | Uniqueで、厳密に1つのbilingual vendor contractだけで定義 |
| `tool` | tool enum | 所有product |
| `surfaces` | non-empty surface enum[] | VS Code、CLI、cloud、shared local Codex clientなど。暗黙の“all”なし |
| `locator` | `VendorLocator`またはnull | Vendorがどこを見てどう辿るかを1 fieldにまとめる。`vendorScope`（repository/workspace、User、hosted/managed、plugin、runtime-only）、`lookupBase`（workspace root、Git/repository root、runtime `cwd`、target-path chain、tool home、profile data、active config layer、registered catalog、hosted state、undocumented — sourceがbaseをanchorしないまま相対locationを文書化している場合で、具体的なmemberを選ぶと推測を記録することになるとき）、`relativeSelector`（path textだけ。Inspector glob semanticsを含まずauthorityを与えない）、`traversal`（exact、ancestor-chain-to-repository-root、ancestor-chain-to-filesystem-root、standard-location chain、recursive-under-base、lazy descendant、explicit registration、none）。Packaged CLIではnull |
| `documentationStatus` | `DocumentationStatus` | `conflict`は競合する全source assertionを保持 |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Unique fixed order。Emptyはstability claimをしない |
| `evidence` | non-emptyな`EvidenceCitation[]` | このrecordを確立するreview済みdocumentation（§ EvidenceCitation）。Packaged CLIでは空 |

Registryはancestor walkを`**/`で表さない。Lookup base、relative selector、traversalを別々のclosed fieldにする。
Relative filenameが同じでもbase/traversalが異なる2 surfaceは、異なるbehavior IDを持つ。

Behavior statementはregistry間の参照を自身に持たない。§ RegistryRelationsを参照。

### RuntimeCompositionStrategy

`RuntimeCompositionStrategy`は、文書化済みlayering、selection、fallback、deduplication、precedenceをread
authorityへ変えずに記録する。

| Field | Type | Rule |
|---|---|---|
| `strategyId` | stable dotted string | Uniqueで、bilingual runtime-composition contractで定義 |
| `tool` / `surfaces` | tool enum / non-empty surface enum[] | 正確なproduct/surface boundary |
| `operations` | non-emptyなordered closed enum[] | 各entryは`append \| concatenate \| select-first \| select-closest \| replace \| merge-map \| deduplicate \| tighten-only \| filter \| retain-all \| unknown-order`。Array orderは文書化済みpipeline order、またはsourceがsequenceではなくkeyごとのpolicyを述べる場合はそれが列挙するalternativeである — Copilot CLIのrepository layerはsupportする各keyに1つのmerge behaviorを挙げる。`tighten-only`は、より近いinputが値を一方向にだけ動かせることを述べる。これはsource自身が名指している。`retain-all`は、文書化された全inputが利用可能なまま残りどれもmerge されないことを述べる。Collapsing entryが無いことはそれを述べない。Arrayは、あるsourceが文書化しているstepを記録するのであって、そのsourceが排除しているstepを記録するのではないからである |
| `documentationStatus` | `DocumentationStatus` | Partial/unknown/conflicting orderからwinnerを捏造しない |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Unique fixed order。Documentation completenessと分離 |
| `evidence` | non-emptyな`EvidenceCitation[]` | このrecordを確立するreview済みdocumentation（§ EvidenceCitation）。Packaged CLIでは空 |

Strategyはimmutable contract dataである。文書化されたcompositionと、そこから導出される同名解決を
説明するものであり、directoryのenumerate、
relationship targetのopen、InspectorのRepository/Global sourceのmergeはできない。

### StructuredInspectorMatcher

| Field | Type | Rule |
|---|---|---|
| `base` | 正確な1 Source-boundary descriptor | Repositoryまたはnamed consent済みmember Global boundary。Selectorから推測しない |
| `selectors` | non-emptyなordered uniqueなselector program（`MatcherSegment[][]`） | 1 static rule所有のalternative。各programはSource rootに相対なclosed ordered programで、final tokenはregular fileを表す |
| `MatcherSegment` | exact discriminated union | `{ kind: 'literal', value: NonEmptyMatcherLiteralSegment }`、`{ kind: 'regex', pattern: RegExp }`、`{ kind: 'recursive-directories' }`。Executable glob、implicit discriminator、extra fieldは不可 |

`StructuredInspectorMatcher`はauthored registry dataであり、そのliteralは実行前に制約される。vendorのreaderがscan attemptごとに組み立てるplanはそうではない: そのsegmentはrepository自身の構成が宣言したentry名であり、authoredのまま、filesystemが保持しうる任意のUnicodeで保たれる。walkはそれを列挙したnameと比較してentryを開くため、どのentryも名乗らない名前は何にも一致しない（spec.md FR-007、contracts/inspection-path-allowlist.ja.md § Read authority）。以下のgrammarは出荷済みmatcherだけを対象とする。

`NonEmptyMatcherLiteralSegment`はnon-empty printable ASCII stringで、code unitはU+0021–U+007Eのうち`/`、`\\`、`:`, `*`、`?`、`\"`、`<`、
`>`、`|`を除き、`.`と`..`も禁止する。同じclosed typeをstatic fixed prefix、exact target、fixed derived suffixで使う。
Compilerはnon-ASCII registry path literalをrejectするため、fixed prefixとexact targetについてはexactなraw byte/code-unit比較がrelevance判定のすべてである。
`literal`はcase-sensitiveなexact ASCII segmentを1つmatchする。`regex`は1つのJavaScript正規表現を持ち、
`pattern.test`がraw entry nameにmatchするとき、そのentry nameを正確に1つmatchする — 標準の`RegExp`
セマンティクスであり、anchoringとescapeはpattern作者の明示的な記述で、その正しさはshipped rule fixtureが
所有する。Patternがtestするraw entry nameはdisk上ではNFD綴りであり得る。Non-terminalならdirectory step、
terminalならfile stepとし、regex literal（例: `/\.md$/u`）として書く。`recursive-directories`—`**` step—は
0個以上のdirectoryをmatchする。non-terminalかつrecursive token同士の隣接不可とする。

`recursive-directories`が唯一の下向きの軸であり、上向きの軸は意図的に持たない。Runtime working directoryから
repository rootへ上る vendor lookupは選択済みrootで終わる。選択済みrootがそのrepository rootだからである（FR-001）。
したがってchainのin-scopeなlayerは正確に1つで、表現すべき記法はない。InspectorはSource rootより上を読むことはない。
そのpathは`SourceRelativePath`を持たず、boundaryの外にある。Registryはtyped segment形式で直接authorし、contract tableもそのauthored programを示す。
文法・literal alphabet・unique性・selection-policyの義務はbuild/contract validator（registry contract gate）が
enforceし、runtime logicで再検査しない。Runtimeはこのimmutable
typed formだけをloadする。これによりdescendant contextとdirect child、またはdescendant contextと固定recursive
subtreeのcompositeを、曖昧な単一expansion enumを発明せず表現できる。

### TraversalPlan

`TraversalPlan`は`StructuredInspectorMatcher`からcompileするimmutableな値で、inspection moduleがtraverseする
固定のtool別inspection-path allowlistを所有する（FR-003、FR-015からFR-017）。出荷済みmatcherからcompileしたplanはshipped dataであり
processの生存期間を通じて存在する。vendorのreaderが構成から組み立てるplanは、それを読んだ1回のscan attemptの間だけ存在し、
そのattemptが宣言されたentry名を運び、derived ruleのidentityのもとで同じwalkが実行する。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown versionはregistry loadをfailure |
| `boundary` | 正確なSource-boundary descriptor | Matcherからcopyし、request/display textから推測しない |
| `selectors` | non-emptyなordered `TraversalSelectorPlan[]` | Authorしたtyped selector programの決定的な1対1 compile結果 |
| `selectionPolicy` | `all-matches \| codex-global-first-non-empty` | Closed scheduler policy。後者はexact ordered selectorが`AGENTS.override.md`、`AGENTS.md`の`codex.global.instructions`だけで有効 |
| `TraversalSelectorPlan.mode` | `repository-program \| global-exact \| global-fixed-subtree` | Closed operation class。Generic ambient-root walkerなし |
| `TraversalSelectorPlan.fixedPrefix` | ASCII literal segment array | Repositoryではempty。Globalではexact targetまたはfixed-subtree rootまでのcomplete pathを、そのterminal target/subtree segmentを含めて持つ |
| `TraversalSelectorPlan.remainder` | `MatcherSegment[]` | Repositoryのcomplete selector program、Global exact targetではempty、またはGlobal fixed-subtree root直下だけのcomplete dynamic program |

Compilationはclosedなmappingとする。`repository-program`はemptyな`fixedPrefix`と、完全なselector programに等しい`remainder`を持つ。`global-exact`はall-literal selectorを、target fileで終わる
non-emptyな`fixedPrefix`とemptyな`remainder`へcompileする。`global-fixed-subtree`はmaximal leading literal directory
chainを`fixedPrefix`へcompileし、その直下のnon-emptyなdynamic programを`remainder`として保持する。

Traversal自体は`node:fs/promises`による通常の再帰walkである。Inspection moduleはselector programで到達可能な
directoryだけをenumerateし、entryをcompile済みsegmentと照合してmatchするfileをreadする。Symbolic linkは透過的に辿る。
Agentはcustomization fileのload時にlinkをresolveするためである。Targetがmissingまたはunreadableなlinkは通常の
`file-unreadable` diagnosticとなり、walkはvisited directoryをreal pathで追跡してlink cycleがscanの終了を妨げないように
する（FR-024）。Readできないfileは他fileへ影響せずその`file-unreadable` diagnosticとなる（FR-028）。表現されない隣接pathは
readしない。Global planはadmit済みtool home配下のexact targetとfixed subtreeだけをreadし、missing targetがsibling discoveryを
引き起こすことはない（FR-018）。

`codex-global-first-non-empty`はauthored logicではなくproject所有のclosed scheduler branchである。まず
`AGENTS.override.md`をreadする。Readable non-emptyなoverrideは単独のpublished fileとなり、`AGENTS.md`への一切のoperation
なしにshort-circuitする。Absentまたはreadable emptyなoverrideはexact `AGENTS.md` targetへ進み、そこのreadable non-emptyな
regular fileをpublishする。それ以外ではCodex instruction fileをpublishしない。Emptyとは、任意のleading UTF-8 BOMを1つ
除去した後のdecoded stringが`String.prototype.trim().length === 0`となることであり、whitespace-only fileはemptyである。
一方で保持した`U+FFFD`はnon-whitespaceのため、`utf-8-replaced` textはnon-emptyである（FR-035）。Binaryまたはunreadableな
overrideはそのdiagnosticとともにbranchを終了し、fallbackしない。

### RegistryRelations

Registry間の参照は、接続するrecordのfieldではなく独立したimmutable release dataである
。Recordは「それが何か」を述べ、relationは「他のregistryにどう依存するか」を
述べる。分離することで、各vendor catalogはその製品の記述として読め、reference graph全体は1箇所で
レビューできる。

| Subject | Field | Type | Rules |
|---|---|---|---|
| strategy | `consumesBehaviors` | non-emptyな順序付きbehavior record[] | そのstrategyが合成する文書化済みinputすべて。User scopeもhosted scopeも含む — behaviorはread authorityを与えないため、behaviorを名指すことはInspectorが何を開いてよいかではなくvendorが何を文書化しているかを述べ、維持管理behavior statementがrecordしたhosted inputは所在を持つscopeと同様に合成される（CopilotのCloud selectionにおけるremote-skill relay）。除外されるのはstrategyがそもそも合成しないもの — excluded surface、またはどのbehavior statementもrecordしないhosted input — であり、それらはexplicit conditionのまま |
| rule | `basedOnBehaviors` | 順序付きbehavior record[] | Policyが根拠とする文書化されたvendor behavior。その再記述ではない |
| rule | `explainedByStrategies` | 順序付きstrategy record[] | Order/applicabilityに使うcomposition fact。Path admissionには使わない |

各edgeはidentifierではなく参照先recordそのものを保持する。これは非循環graphだから可能であり、
循環をまたぐ`const`参照はmodule評価時に失敗する。配列は参照先identifier順に並べてmaterializationを
byte-stableに保つ。同一性 — edgeはregistryが公開するrecordを保持し、同形のcopyであってはならない — は
contract gateの義務である。型だけでは両者を区別できないためである。

すべてのedgeは一方向で、graphは非循環である: behavior ← strategy ← rule。Behaviorはrelationを
持たない。Relationは読み取り権限を与えない。権限は`InspectionRule`のdiscovery classだけが持つ。

どのreview済みdocumentationがrecordを確立するかはrelationではない: 全behavior・rule・strategyが
自身のcitationをrecord上のnon-emptyな順序付き`evidence`配列に書くため（§ EvidenceCitation）、根拠は
支える主張の隣に置かれる。Citationは製品が一切読まないmaintenance evidenceであり、`tsdown.config.ts`が
`__ACI_SHIP_MAINTENANCE_DATA__` defineでpackaged CLIからcompile除去する。この除外がなければ、
review済みURL・review日・paraphrase済みassertionがすべて出荷CLIに入る。

1種類の参照は別の理由でrecord側に残す。`InspectionRule.policyRefs`は他registryではなく
specificationが所有するFR/QR clauseを指す。各relation mapはclosed identifier catalogをkeyとし
網羅的であるため、参照を宣言しないrecordはbuildに失敗する。Conformance fixtureはすべての参照をidentifierとして
materializeする。JSONに参照はなく、recordを展開すると1契約が単独所有する定義を再記述してしまうためである。

### InspectionRule

`InspectionRule`は、二言語inspection-rule contractのimplementation counterpartとして保守するimmutableな
release dataである。
検査対象Repositoryから読み込むものではない。

| Field | Type | Rule |
|---|---|---|
| `ruleId` | stable dotted string | 1 registry内でunique。Semanticsがcompatibleな間だけversion間で維持 |
| `tool` | tool enumまたは`shared` | `shared`はvendor横断のsafety/derivation ruleだけ |
| `discoveryClass` | `static-candidate \| bounded-derived-candidate \| relationship-only \| excluded` | 最初の2つだけがreadを許可可能 |
| `kind` | customization-kind enumまたはnull | Kind横断relationship/exclusionはnull |
| `sourceKinds` | source-kind enum[] | Contractに明示されたRepository、Global、または両方 |
| `matcher` | `StructuredInspectorMatcher`またはnull | Static ruleだけで、`bounded-derived-candidate`ではnull。そのtargetは[inspection-path-allowlist contract](contracts/inspection-path-allowlist.ja.md)が定める境界のもとでvendorの構成読み取り段階から来る。Vendor locator、ambient path、executable glob、untyped selector stringではない |
| `policyRefs` | sort済みspecification ID[] | Surfaceを許可または意図的に除外するFR/QR clause。保守buildではnon-emptyで、packaged CLIではempty。どのDTOも運ばないreviewer向けtraceabilityだからである |
| `precedenceGroup` | stable stringまたはnull | 文書化されたselection/order semanticsを持つruleだけを結ぶ |
| `documentationStatus` | `DocumentationStatus` | Runtime stateではなくupstream documentationのcompleteness/consistencyを表す |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Separate upstream lifecycle claimをunique fixed orderで保持 |
| `evidence` | non-emptyな`EvidenceCitation[]` | このrecordを確立するreview済みdocumentation（§ EvidenceCitation）。Packaged CLIでは空 |

Build/contract validatorはpackage前にunique性、field組み合わせ、selector-programのtoken/position
rule、exact traversal compile、参照rule ID、全`bounded-derived-candidate` recordがidentityだけの形であること、fixtureとの
完全一致を検証する。
Runtime loaderはscan前にembedded registry schema、integrity、contract
versionを検証する。Repository提供pluginでruleを追加する機構は持たない。

### RepositoryScanGenerationとGlobalScanGeneration

RepositoryとGlobalのinspectionはlifecycleが独立しているため、それぞれが自分のatomic generation sequenceを持つ
（spec Clarifications § Session 2026-07-22、FR-030）。Repository sequenceはbootstrap generation 0から存在し、
Global sequenceはそれを作るenable commitからdisableがdiscardするまでだけ存在する。Commitは自sequenceの
viewだけをinvalidateし、他sequenceのstateを決して変更しない。Cross-source comparisonは影響を受けず、
常に各sourceの最後にcommit済みのstateを比較する。両generation entityは次のfieldを共有する。

| Field | Type | Rule |
|---|---|---|
| `generation` | `GenerationNumber` | 自sequence内でuniqueかつmonotonic。`0`はRepository sequenceだけに存在してbootstrap専用とし、Global sequenceを作るcommitは正確に`1` — Global sequenceにgeneration 0はない |
| `baseGeneration` | `GenerationNumber` | Serialized transaction開始時の同一sequenceの最後にcommit済みgeneration。Bootstrapとsequenceを作るGlobal enable commitでは`0` |
| `scannedSourceIds` | sort済みopaque source ID[] | Repository/per-Source Global rescanでは1件、initial/retry Global batchでは1〜4件、bootstrapではempty |
| `startedAt` / `finishedAt` | `UtcTimestamp` | Commit済みgenerationでは両方必須。In-flight timingは`ScanAttempt`/`ScanProgress`に属する |
| `outcome` | `complete \| partial` | `partial`はClosed Scan Publication Outcomes tableのfile-confined outcomeだけを意味する。すなわちtraversalが完了し、1つ以上のfileがfile-confined outcome（unreadable、admit済みcandidateのbinary content、parse failure — censusが列挙したcompanionのbinary bytesはその通常の事実であり、何もconfineしない。FR-025）だけを持ち、影響のない全fileがcompleteである。`utf-8-replaced`はcompleteで、throw/rejectされたattemptはgenerationにしない |
| `files` | `CustomizationFile[]` | 所属sequenceの全enabled Sourceを含む。Source、Source相対Path、IDの決定的順序は、読み手がこのlistを受け取る唯一の場所である公開snapshot projectionが確立し、保持されるassembly順はそれ自体の契約を持たない |
| `diagnostics` | `Diagnostic[]` | Customization sourceまたは宣言済みmetadata値を複製しない |

`RepositoryScanGeneration`は`transactionKind: bootstrap | repository-scan`と、bootstrap generation 0でだけnullとなり
全`repository-scan` commitで必須の`scanRequestId`を追加する（FR-030 request correlation）。`GlobalScanGeneration`は
`transactionKind: global-enable | global-scan`と、常に必須でnon-nullの`scanRequestId`を追加する。この1 IDはGlobal batchと
それがcommitする全Sourceで共有する。`global-enable`はadmit済み全tool Sourceをatomicにpublishするone-transaction
consent commitで（FR-014）、active-consent retry batchを含む。`global-scan`はenabled Global sourceの明示rescanである。
Global disableは意図的にtransaction kindではない。Global sequence全体をdiscardして何もcommitせず、後のre-enableは
increment済み`globalContentEpoch`のもとでgeneration 1からfresh sequenceを開始する。

Repository generation 0はprocess開始時に同期作成し、`baseGeneration: 0`、`transactionKind: bootstrap`、emptyの
`scannedSourceIds`、nullの`scanRequestId`、等しい`startedAt`/`finishedAt`/session `createdAt`、`outcome: complete`、空の
file/diagnosticを持つ。Sessionに`StaleSourceFailure`がないため、派生する初期`snapshotState`は`current`である。
Legalなreadable baseだがRepository admission/scan成功を意味せず、session内のexact 1つのnon-authorizingなidle
Repository Sourceと共存する。自動の初回Repository scanは0から開始する。Returned failure（存在しないかdirectoryとしてreadできない
Repository rootを含む）は、sessionを利用可能なまま保ちつつactionable failure diagnosticとともにgeneration 0を
currentのままにする（FR-002）。予期しないstartup operationのthrow/rejectionにはrequest ownerがなく、application failure
representationをpublishせずprocess top levelへ到達する。保持snapshotをstaleにできるのは、後続の
user-requested rescan failureだけである。

### StaleSourceFailure

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `sourceId` | opaque Source ID | DTO | 最新の明示rescanがfatalに失敗した、まだpublishedなSourceを1つ識別 |
| `failureRef` | `{ kind: diagnostic, diagnosticId } \| { kind: error, message }` | DTO | 正確に1つを参照。決定的にreturnされたfatal outcomeはlifecycle Diagnostic、throw/rejectされたaccepted session API jobはfailed requestのerror messageを持つ |
| `failedAt` | `UtcTimestamp` | DTO | Fatalな明示attemptが終了した時刻 |
| `baseGeneration` | `GenerationNumber` | DTO | Failed attemptが置換しようとした所属sequenceの最後にcommit済みgeneration |

`StaleSourceFailure`はsession所有のlifecycle overlayであり、どちらのcommit済みgeneration entityのfieldでもない。明示的なfatal
rescanはそのSourceのentryだけを作成または置換するため、別Sourceのfailureは共存する。
Completeまたはpartial scan commitがclearするのは正常refreshしたSourceのentryと参照先lifecycle Diagnosticだけであり、別Sourceの
commitは無関係なentryとfailure recordをcarryする。Global disableは除去するGlobal Sourceのentryと参照先recordをclearするが、Repository
entryが残ればsessionはstaleのままとなる。Arrayがnon-emptyの間だけ`snapshotState`は
`stale-after-fatal-rescan`である。自動初回Repository failureと初回Global enable failureは、commit済みSource
graphのrefresh失敗ではないため`StaleSourceFailure` entryを作らない。決定的なreturned failureはclosed lifecycle Diagnosticを
作り得る。Startupの予期しないthrow/rejectionはproduct failure recordを作らず、throw/rejectされたaccepted Global batchはfailed
`batchStatus`へfailed requestのerrorだけを記録する。
初回Global enableは既存entryとそこから派生するsnapshot stateもすべて保持する。
RetryのqueueはそのSourceのoperational statusを`scanning`へ変えるがentryも参照先failureもclearしない。無関係なcommitはentry、
failure reference、Sourceのfailed/scanning lifecycle overlayをcarryし、affected Sourceの正常commitだけが`ready`/`partial`へ移して
entryをresolveする。

### ScanAttempt

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `attemptId` | opaque string | internal | Serialize済みの1つの未commit transactionを識別 |
| `scanRequestId` | opaque ASCII string | internal | 全attemptで必須。Automatic/explicit commandのadmission時に生成してSource/progress/generationへcopyする。Global disable barrierはattemptではなく何もallocateしない |
| `triggerOwner` | `{ kind: 'startup', operationId: null } \| { kind: 'request', operationId: opaque ASCII string }` | internal | Automatic初回Repositoryは`startup`、explicit rescanはaccepted session API operation ID、Global batchは`GlobalEnableOperation.operationId`をcopyし、requeueもexact valueを保持 |
| `baseGeneration` | `GenerationNumber` | internal | Attempt開始時の所属sequenceの最後にcommit済みgenerationと一致。AttemptがGlobal sequenceを作る場合は`0` |
| `transactionKind` / `scannedSourceIds` | `repository-scan \| global-enable \| global-scan`と、所属generation entityの`scannedSourceIds` rule | internal | Commit済みstateを変えず、要求された1 Source scanまたはatomic Global subset operationを識別する。Bootstrapは同期session state、Global disableはbarrierであり、どちらもattemptではない |
| `status` | `waiting \| running \| committable-complete \| committable-partial \| cleanup-only \| fatal \| cancelled` | internal | 2つのcommittable outcomeだけが次generationを作成可能。`cleanup-only`はdisable/shutdown revoke後を表しpublic stateを変更できない |
| `publicationAuthority` | `active \| revoked` | internal | Disable/shutdownはlate continuationがpublishする前に不可逆に`revoked`へ変更 |
| `workingSet` | provisional source graph、file、metadata、relationship、diagnosticまたはnull | internal | Queued中はnull。Running後は1回のatomic commitまで全Public DTOから隔離し、fatal failureまたはcancel時に破棄 |

In-flight attemptのfieldをcommit済みsnapshotへmergeせず、snapshot経由で公開しない。Partial resultは、完全な
traversal、FR-028対象のfile-confined outcome、assembly/serialization成功、
`committable-partial`へのtransition、generation全体のatomic commit後だけ公開する。予期しないthrowまたはrejectionはscan domainでcatchせず、
domain transition/resultを作らない。Triggerを所有するouter boundaryはpublication authorityをrevokeし、cleanup可能になれば
abandoned working setを破棄し、prior snapshotを維持する。Accepted session API jobを所有する場合はそのfailureをfailed requestの
errorとして通常どおり報告する。そのfailureはjobの`triggerOwner`/`scanRequestId`とcorrelateしたままとなり、startup-owned propagation
にはrequest ownerがなくfailureを記録しない。
Batch acceptance後に`GlobalEnableOperation`をunregisterしてもcopy済みownerを消さず、disableで中断したRepository requeueも保持する。

単一`ScanCoordinator`が`GlobalEnableOperation`、Repository scan、Global scanのtransactionとGlobal-disable barrierをserializeする。
Source scanをconcurrent実行しない。通常source commandはFIFOとする。
Global disableはpriority barrierとして、active consent/control snapshotがある場合だけ受理時に
`globalControl.state: disabling`とempty pending/retry arrayへ変更する。Operation-local initial enableだけならinternal barrierが
drainする間も`globalControl`はnullのままとする。どちらの場合もnew Global-enable/Global-rescan commandを拒否する。Active
uncommitted transactionをabort/discardし、active/queued Global enable operationをabort/drainし、最後のqueued Global
command cancellation sweep後、queueの次で自身のzero-I/O terminal cleanupを行う。中断したRepository commandはterminal disable success後だけ
正確に1回requeueし、同じ`operationId`、`scanRequestId`、trigger owner、requested Source、queue orderを保持してexisting commandを
`waiting`へ戻し、新しいadmissionまたはinterim success statusを作らない。Failed disable中はholdする。中断したGlobal commandはrequeueしない。Barrierがdraining/committing中の2回目のdisableは同じcompletionへjoinし、追加transactionを
作らない。Tool固有Global Source/graph、active consent record、running/queued Global scan/enable command、
retained disable failureが何もない場合、
無関係なRepository workの有無にかかわらずdisableは即時no-opとする。
Scan transactionは自sequenceのその時点のgeneration Nから開始するか、存在しなければGlobal sequenceを作成し、
replacement snapshotを別に構築する。Repository/per-Source Global rescanでは1つのscanned Source、enable/retry batchでは
Global admitted subset全体である。Completeまたはpartial resultだけが所属sequenceで正確にN+1としてatomic commitされる
（sequenceを作るGlobal commitは正確に1）。その時点でそのsequenceの全Sourceがnew generationを報告する — fileのidentityはSource-relative Pathであり
commitを跨いで安定し、per-attemptのrecord identity（recognitionとdiagnosticのID）は新しいattempt自身のものである。
新snapshotは正常scanした各Sourceの
`StaleSourceFailure`と参照先failureだけをclearし、無関係な全Sourceのentryとfailureをcarryし、そのsequenceの
generation-scoped comparison/editor stateをclearする。Commitは他sequenceのgenerationやclient stateを決して
変更・invalidateしない。`remove-active-state` Global disableはscan transactionではない。そのterminal commitは
Global sequence全体 — commit済みgeneration、全member Global graph、各stale-failure entry/diagnostic pair — を
filesystem I/Oなしにdiscardし、どちらのsequenceにもgenerationをcommitしない。無関係なRepository pairは残る。
`cleanup-only` disableはoperation-local/frozen control stateだけをremoveし、committed stateを変えずheld Repository
commandをreleaseする。

決定的なfatal attemptはgenerationを作成もpartial mergeもせず、provisional partial resultを含む
`workingSet`全体を破棄する。所属sequenceのN、全prior ID、全commit済みcontentを表示したまま保持する。Attemptが明示rescanの
場合に限りsession overlayでそのSourceの`StaleSourceFailure`と実行可能lifecycle Diagnosticを作成または
置換し、別Sourceのfailureを保持する。Automatic failure後の最初のexplicit Repository rescanなら、terminal transitionは
`repositoryFailureDiagnosticId`とold `repository`-owned Diagnosticもremoveし、new stale entryが参照するdeterministic
`published-source:<sourceId>` Diagnosticを作るか、failed requestのerror messageを記録することを、同じatomic overlay updateで行う。自動の初回Repository scanのfatal failureではbootstrap generation 0をcurrentのままにする。
初回Global enableのfatal failureではmissing tool用の`StaleSourceFailure` entryを追加せず、そのtoolの
controlの`failureCode`を設定/置換して既存entryとそこから派生するsnapshot stateをすべて保持する。自動初回Repository failureも
Repository failure recordを使い、どちらもnew inventoryをcommitしなかったことを報告する。Global-disable barrierに
よるexpected cancellationはfailure diagnosticをemitしない。それ以外の決定的にreturnされたsafe failureはout-of-generation
session-lifecycle Diagnosticとする。そのattachment scopeは後述の`Diagnostic` ruleに従い、file scopeでは
`sourceId`とSource-relative Pathを一緒に持ち、source scopeではpathを捏造しない。
Customization source valueを含めず、`Source.diagnosticIds`へ入れない。Coordinatorは次のqueued transactionを
still-current Nから開始する。後続のaffected Sourceに対するcompleteまたはpartial正常scanがNをN+1へ
置換してそのentryとfailure referenceだけをclearし、別Sourceのcommitでは両方を未解決のまま保つ。予期しないthrow/rejectionはこの
domain classificationをbypassし、requestを所有するboundaryが通常どおり報告する。Accepted explicit rescanはDiagnostic referenceではなく
failed requestのerror messageを持つ同じstale overlayを作成しなければならず（MUST）、pre-acceptance failureはoverlayを作らない。1 sourceあたりrunning/queued
scan commandは最大1つで、duplicate scan commandはcontract済みconflictを
返す。Disableは上記join/no-op ruleを使い、duplicate scan commandではない。

Disableまたはprocess shutdownは新規schedulingを停止し、`publicationAuthority`をrevokeする。PendingのままのNode.js
filesystem promiseがある場合、attemptは`cleanup-only`へ移る。全late byte、graph/Diagnostic/DTO/log resultを破棄し、
open handleはcleanup中にcloseする。API処理は継続する。Disable barrierは
Global authorityを直ちにrevokeできるが、uncancellable kernel operationがsettleする前に物理的なdrain完了を主張できない。

### ScanProgress

| Field | Type | Rule |
|---|---|---|
| `scanRequestId` | opaque ASCII stringまたはnull | Waiting/active/final source-scan progressではnon-nullで`Source.scanRequestId`と一致。Barrier所有disable progressではnull |
| `phase` | `waiting \| cancelling \| deriving \| enumerating \| reading \| recognizing \| complete` | pipeline順に並ぶ。`waiting`はqueue中、`deriving`はvendorのreaderが固定pathのseedの宣言する内容を展開する段階であり、walkに先立つ構成読み取りを指す（admit済みのattemptはここから始まる）。`cancelling`はdisable/shutdown abortのdrain中。いずれもpath/source contentを含めない |
| `queuedAt` | `UtcTimestamp`またはnull | Accepted commandが別transaction待ちになると設定し、work開始時にclear |
| `startedAt` | `UtcTimestamp`またはnull | Source scan開始時、またはbarrier所有progressではdisable受理時。idle/waiting中はnull |
| `visitedEntries` | non-negative safe integer | Bound済みtraversal planがnameを観測したdirectory entry数 |
| `candidateFiles` | non-negative safe integer | Traversalが現在までにdiscoverしたallowlist対象candidate file数 |
| `readBytes` | non-negative safe integer | 完了readが返した現在までのbyte数。後でbinaryに分類したbyteも含む |
| `diagnosticCount` | non-negative safe integer | 現attemptで蓄積したdeterministic diagnostic数 |

`Source.progress`は`idle`、`failed`でnullとする。`scanning`では`waiting`にnon-null `queuedAt`とnull
`startedAt`が必要で、active phaseはnull `queuedAt`とnon-null `startedAt`が必要。`Source.scanRequestId`と
`progress.scanRequestId`は同じnon-null valueとする。`failed`はprogressがnullでもfailed request IDを保持する。
Commit済み`ready`/`partial` Source、そのfinal progress、source-scan generationは同じrequest IDを1つ持つ。`disabling`はbarrier drain中の
該当`cancelling` progressを公開する。Commit済み`ready`/`partial` sourceはnull `queuedAt`とnon-null
`startedAt`を持つ最終`complete` progressを保持する。Bootstrapにはsource progressがない。

Disable受理時にinternal保持中の全Global Sourceは直ちに`disabling`となり、そのprogressはnull `queuedAt`を持つ。
Drain対象がGlobal scanなら、そのscanned Sourceは元scanの`startedAt`を保持し、`phase`
だけ`cancelling`へ変える。Presentな他の各Global Sourceはbarrier所有のdisable-acceptance時刻の
`startedAt`を持つ`cancelling` progressを公開する。Global scanをdrainしていない場合、presentな全Global Sourceが
このbarrier所有progressを公開する。同時にdrainするRepository scanは自身の`startedAt`を保持し、`queuedAt`をclearして
phaseだけ`cancelling`へ変える。Single disable terminal commit後にGlobal sequence全体と全Global Sourceを除去する。中断Repository commandは
`phase: waiting`、requeue時のnon-null `queuedAt`、null `startedAt`、元の`scanRequestId`で再表示する。Joinしたdisable
requestは全valueを再利用し、別progress recordを作らない。
Fence active中、これらSource/progress transitionはcleanup-overlay stateだけであり、`GlobalFenceRecoverySnapshot`は一切公開しない。

4 counterはactive work開始時にzeroで、1 attempt内ではmonotonic non-decreasingとし、`complete` progressにfinal valueを保持する。
Waiting progressはzero counterを公開する。`cancelling`へのtransition時に最後にpublishしたcounterをfreezeし、cleanup activityではincrementしない。
中断Repository commandのrequeueはrequest IDを維持するが、work再開時のnew attemptはcounterをzeroから開始するため、monotonicityはその
requeue boundaryを跨がない。全valueはJavaScript safe integerでなければならず、次のexact countを表現できなければsaturate/wrapせず、
所有するruntime/session API error ruleに従ってpropagateする。

### CustomizationFile

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `sourceId` | opaque string | DTO | 1つのenabled Sourceを識別 |
| `sourceRelativePath` | `SourceRelativePath` | DTO | Source内でのfileのidentity（FR-030） — generationを跨いで安定で、世代ごとのfile IDは存在しない。所有Source rootからの表示・filter・lookup・selection、およびdetail requestのparameter |
| `encoding` | `utf-8 \| utf-8-replaced \| binary \| unknown` | DTO | Closedなvariant discriminator。Read stateはここから導出する（readable text、textを持たない`binary`、failed-read `unknown`）。NULを含まないinvalid sequenceはreplacement decode済みtextとしてreadableのまま保持 |
| `sizeBytes` | non-negative integer | DTO | Accept済みbyteを持つoutcomeであるreadable textと`binary`だけに存在する |
| `hadLeadingBom` | boolean | DTO | Readable textのみ。他variantにBOMの概念は存在しない。`sourceText` publish前に先頭UTF-8 BOMを正確に1つ記録・除去した場合だけtrue。Replacementの有無とは独立 |
| `sourceText` | string | DTO | Readable textのみで、nullにならない。完全なdecoded authored source。Literal valueと環境変数参照syntaxを正確に保持し、HTMLではない |
| `diagnosticIds` | opaque string[] | DTO | 全variantに存在し、同じgenerationを参照 |

Customization Fileは、Source-relative Pathで識別する、Source内で発見した1つのfileであり、そのencoding、
readable時の完全なsource text、recognition、relationship、diagnosticを持つ。各recognitionはさらに、
自身をadmitしたinspection ruleとmatched path（そのprovenance）を記録するため、どのruleが読み取りを認可したかは
lossyなfile-level aggregateではなくそのadmission recordへattachされたままになる。

`encoding`が3つのclosed per-file outcome（FR-024/FR-028）を判別する: readable text（`utf-8`または`utf-8-replaced`）、
textを持たない`binary`、failed readの`unknown`である。独立したread-state fieldはこのdiscriminatorの繰り返しに
しかならないため存在しない。Accept済みbyteを持ち`sizeBytes`を運ぶのはreadable textと`binary`だけである。`unknown`は、
discoveryとreadの間に消えたfile、read errorで失敗したfile、およびtargetがmissing/unreadableなsymbolic linkを記録し
（FR-024）、size、text、BOM record、parse summary、recognition、relationshipを一切運ばない。non-readable outcomeはcomparison対象にしない。
file-scoped diagnosticを持つかどうかは、そのfileに何が期待されていたかで決まる: `unknown`は常に持ち、`binary`は
admit済みcandidateでは持つが、censusが列挙したcompanionではassetの通常の事実として持たない（FR-025）。
Encodingは1回の完了したreadのbyteから割り当てる。NUL byteが1つでも
あれば`encoding: binary`とし、textもBOM recordも持たない — NUL checkはBOM処理より先に走るため、
binary byteにBOMの概念は存在しない。それ以外はbyte sequence全体をUTF-8 replacement
semanticsで正確に1回decodeする。先頭BOMが1つあれば`hadLeadingBom: true`として`sourceText`から除去する。replacementなしで
decodeできたinputは`utf-8`、`U+FFFD`が1つでもinsertされた場合は`utf-8-replaced`とし、
どちらも先頭BOM除去の有無とは直交する。Replacement decodeされたtextはreadableのままで、その文字化けしたexact `sourceText`をparsing、
display、extraction、comparisonへ渡し、それ自体を理由にgenerationをpartialにしない。Binary inputはtextを持たず
comparison不適格とする。Diagnosticにもなるかどうかは、admit済みcandidateとcensus掲載companionを分ける
FR-025の区別による。Charset guessing、別decode、sampling、truncationは表現不能とし、このstate machineに製品固有の
byte、line、item上限を適用しない。Fileはparse rollupを持たない: recognition自身の`parseStatus`がparseの事実であり、file-levelの
aggregateには読み手がいなかった。
Failed recognitionがあってもreadable textなら完全なsourceを表示でき、そのdiagnosticはInspector extraction
だけを説明しvendorに対するvalidity判断ではない。
Inspectorは`$TOKEN`、`${TOKEN}`、platform上の同等なenvironment referenceのようなstringをauthored textとして
扱う。Source、metadata、relationship、comparison DTOの構築時に、参照先process environment値をread、resolve、
substituteしない。

### 一覧の単位

一覧rowの単位は物理fileではなく認識されたkindが決める。出荷済みのkindは1つの単位で一致しない:

| Kind | 1 rowが示す単位 |
|---|---|
| `skill` | 1つのtoolが解決した1つのinvocation name（FR-007）: そのtool自身の文書がこのfileを呼び出す名前で、admitしたruleが答える — CodexとCopilotはauthoredなfrontmatter `name`、fileが宣言しない場合はskill directory名。Claude Codeはfrontmatterの宣言に依らずskill directoryで、nestedならroot相対のprefixを前置する。定義は1つのrecognition — `(file, tool)`につき1つ — であるため、1つのtoolが1つの名前で呼び出す複数fileは1 entryが各recognitionを定義として列挙し、toolごとに異なる名前で呼び出される1つのfileは各名前のentryで定義される。definitionはrecognitionであるため、pathで識別されるrowのrecognitionとまったく同じく、admitしたruleが依拠するdocumented behaviorのsurfaceを述べる（FR-009） |
| `MCP` | 宣言されたserver名1つ: その名前を解決するすべての`[mcp_servers.*]`型宣言 — `(carrier, tool)`ごとに1つ — がその名前のrowの中に列挙される。したがって1つの`.codex/config.toml`は宣言したserverごとに宣言を1つ寄与し、同じ名前を宣言する第2のcarrierはその名前のrowに合流する。宣言の住処は明示的なcarrierだけである: 他のkindのfileが自身の内容にMCP風のconfigurationを綴っても — skillやagentのfrontmatter、settings fileのinline map — それはそのkindの通常のcontentであり、そのfile自身のdetailに見えるだけで、MCP rowには合流しない。各宣言は自身のfileを名指す。nameがnullである1つのrowがlistを閉じ、現在named宣言を公開していないcarrier — rowが不明である読めない宣言block、または何も宣言しないcarrier — を保持する |
| `instructions` | 1つのSourceの1つの適用範囲: 担当するfile自身のpathが導出するglobであり、担当する各fileをそのfileのrecognitionとともに列挙する — 各recognitionは1つのproductと、そのfileをadmitしたruleが依拠するdocumented behaviorのsurfaceである。toolだけでは、productがそのfileをどこから読むのかを言えないためである。Sourceは行のidentityの半分であるため、repositoryの`**`とconsentされたhomeの`**`は2つの行である。一覧はその範囲の1つの見出しの下に両者を示し、Source familyごとに1つのblockへまとめる。familyとは、選択されたrepositoryと、読み手自身の設定ディレクトリである。comparisonは1つのblockのfileの組であり、consentされた2つのhomeを組にすることはあっても、2つのfamilyにまたがることはない（FR-011、FR-030）。blockが自身のfamilyを名乗るのはsessionが複数のSourceを保持する場合だけであり、fileがどのディレクトリにあったかを名乗るのはそのfamilyが複数のSourceを保持する場合だけである。1つの場合、どちらもpageの唯一の答えを繰り返すことになる |
| `rule` | File自身: rule fileはproductがcontextへ読み込むmodularなinstructionであり、rowのkeyにできる名前も、groupingできる範囲も持たないため、そのSource相対Pathがrowの同一性である。1つのfileを2つのproductが認識する場合は1 rowに2つのrecognitionが並び、各recognitionは1つのproductと、そのfileをadmitしたruleが依拠するdocumented behaviorのsurfaceを名指す |
| `permissions` | Policyを宣言するfile自身。条件は`rule` rowと同じ。別kindである理由は主題が違うことにある: permission policyはproductがどのcommandやtoolを実行してよいかを決めるものであり、ruleはproductが読む指針である。Codexは自身のpolicyを`.codex/rules/*.rules`に綴り、Claudeは自身のmodular instructionもまた`rules`と呼ぶため、vendorが共有する語でまとめると無関係な2つの主題が1つのlistに並ぶことになる。File全体がpolicyであるfileと、より大きなdocumentの1 blockとしてpolicyを運ぶfileは、どちらも1 rowである: 違うのはdetailが公開するものであって、rowが何であるかではない。Policyを宣言しないcarrierはrowにならない — documentの残りはそれを所有するrecognitionであり、rowにすれば作者が書いていないpolicyを述べることになる |
| `prompt/command` | 読み手が起動する名前1つであり、条件は`skill` rowと同じ: その名前を解決する各recognition — `(file, tool)`ごとに1つ — がdefinitionとして名前のrowの中に並ぶため、2つのproductが1つの名前で起動する1 fileはそのrowの2 definitionとなり、product間で名前が異なる場合はそれぞれの名前のrowにdefinitionを持つ。どの名前になるかは、そのfileをadmitしたrule自身のものである。このkindの2つのlocationが異なる答えを返すためである。Command fileの名前が著述されることはない — どちらのproductもcommand fileの`name` keyを無視する — ため、名前は各productのadmitしたrule自身がpathから導出する: Claude Codeはcommand directory配下のpathを取り、区切りをすべて`:`に置き換える。したがって`frontend/component.md`は`frontend:component`、`team/review/security.md`は`team:review:security`となる。stemが大文字小文字を問わず`skill`である葉だけは例外で、自身ではなくそのdirectoryの名前を取る。これはproductがそう振る舞うのであって、どのpageも文書化していない。stemは大文字小文字を無視して比較する一方、`.md`拡張子はmatcherがadmitするものそのものであるため、`SKILL.MD`はここではそもそもcommand fileにならない。Copilot CLIはnamespaceを文書化しておらずsubdirectoryにも到達しないため、file名だけを取る。したがって両者はroot直下の子で正確に一致し、そのfileは両productを名指す1 rowとなり、nestedなfileはClaude単独のrowとなる。一方、VS Code prompt fileは自身で名乗る: 文書化された`name`が読み手が`/`の後に入力するものであり、宣言がなければfile自身の名前が代わりに立つ — したがってcommandが解決する名前を宣言したpromptは、1つのskill名を持つ2 fileと同じように、そのcommandのrowのdefinitionとなる。Skillと違い、rowは同名解決を述べない。いまや2つのprompt fileが1つの名前に到達し得るが、VS Codeはその結果を文書化していないため、rowが答えればどのpageも問うていない問いに答えることになる — definitionは並んで立ち、読み手は両方を見る（FR-009） |
| `agent` | agent name 1つ: それを定義するすべてのfile — `(file, tool)`ごとに1 definition — がそのnameのrowの中に列挙されるので、1つのnameに解決される2つのfileは1 rowの2 definitionになる。nameはadmitしたproductがそのagentを識別する事実であり、どの事実かはproductによって異なる: OpenAI CodexとClaude Codeは`name` fieldをagentのidentityとし、filenameを一致させることはlookupではなくconventionだと述べている（Claude Codeはagents directory内のsubfolderもidentityに影響しないと述べる）ため、これらのrowをfileの名で名指せばproductが持たないagentを報告することになる。一方GitHub Copilotは`name`をoptionalなdisplay nameとして文書化し、profileをconfiguration file自身の名から`.md`または`.agent.md`を除いたもので識別するため、そのrowを宣言された`name`で名指せばCopilotがその名でdeduplicateしないagentを報告することになる。したがって2つのproductが認識する1つのfileは、両者の答えが異なる限り2つのrowに定義を持つ。Rowはskillのrowと違いsame-name resolutionを述べない: Claude Codeは1つの`.claude/agents/` tree配下で同名の2 fileのうち1つだけがloadされると述べ、どちらかを定めるruleを示さないので、答えるrowはどのpageも問うていない問いに答えることになる — definitionは並べて示され、読者は両方を見る（FR-009）。nameがnullである唯一のrowが末尾を締め、nameを公開しないfileを集める — 宣言された`name`でagentを識別するproductのもとで、宣言しないもの、scalar以外を宣言するもの、そして宣言をまったく読み取れずnameが不在ではなく不明なもの（FR-028）。file名で識別するproductのdefinitionはここに到達しない: fileが何を宣言していてもpathが答えるので、抽出の失敗はそのidentityを奪わない。Definitionは、admitしたruleが依拠するdocumented behaviorのsurfaceを、skill definitionと同じように述べる（FR-009）。sessionがそのagentをspawnした、あるいは選択したという主張では決してない |
| `hook` | 宣言されたlifecycle event 1つ: そのeventの各宣言 — `(carrier, tool)`ごとに1つ — がそのeventのrowの中に並ぶ。`MCP` rowと同じ条件である。宣言の住処はhookのためにruleがadmitしたcarrierであり、documentedな2形式のいずれかである: 全体がhookのためのfileと、他のcontentと共にadmitされたfile内のhook table。各宣言はどちらであるかを自身の事実として述べる。1つのconfig layerが両形式を持ちうえ、vendorはどちらかを選ばず両方をloadするからである。したがって1 layerのstandalone fileとinline tableが同じeventを宣言する場合、それはそのeventのrowにおける2つの宣言であり、両方が効いていることを読み手が見る場所がそのrowである。他のkindのfileがhook風のconfigurationを綴っていても、それはそのkindの通常のcontentであり自身のdetailに見え、hook rowには加わらない。他のcustomizationが何であるかの一部であるdocumentedなhook宣言 — Claudeのskillやsubagentのfrontmatter `hooks`、plugin manifestやcatalog entryのもの — も同じである: vendorがhook locationとして文書化していること自体はここでのrowを意味しない。それを運ぶcustomization自身が、fileの書いたkeyを既に公開しているからである。eventがnullである唯一のrowが、空であること自体がfindingであるcarrierでlistを閉じる — 読めなかったhook blockでeventが不明なものと、全体がhookのためのfileでありながら何も宣言しないもの。hook tableを含みうるだけのfileが含んでいない場合はどのrowにも載らない: それを設定のあるrepositoryすべてについて述べても何も言っていないに等しく、hookが1つもないrepositoryにこのkindのtabを出すことになる。RowはtrustもreviewもenablementもStateしない: managedでないhookはclientが実行する前に現在のhashに対してreviewされる必要があるが、それはこの製品が決して読まないruntime state（FR-009）であり、ここでは宣言されたcommandを何も実行しない（FR-020）|
| `plugin` | admitしたruleが解決する1つのplugin名。その名前を解決する各recognition — `(carrier, tool)`につき1つ — がcarrierとしてその名前のrow内に列挙される。`MCP` rowと同じ条件である。どの名前かはfileをadmitしたruleに属する。skillのinvocation nameと同じである（FR-007）: Codexはcatalogの提供を`plugin@marketplace`としてaddressするため、2つのcatalogが提供する同じ名前は2 rowになる。他の製品のpluginフェーズは自分の名前を自分で解決する。carrierはそのpluginを宣言するfileである — それを提供するentryを持つcatalog、あるいはclientが固定pathのmanifestを読む製品ではplugin自身のmanifest。catalogがrowになることは無い: catalogはplugin名を出どころのsourceへ解決する表であり、それはこのkindのcarrierだからである。Rowはpluginが同梱するfileも持つ — その提供が名指すplugin rootを丸ごと列挙したもので、pluginのmanifestもその1つである（contracts/inspection-path-allowlist.ja.md § Bounded companion census）。それらのfileは自身のrowを得ない: rowは件数を述べ、各fileはcarrier自身の詳細で開く。名前を1つも解決しないcarrierは1つのnull名rowに加わり、その状態はkindの無いfileではなく見えるrowのままになる（FR-028）。Rowはinstallation、enablement、trust、cachedコピーのいずれも述べない: 4つとも本製品が決して読まないUser stateである（FR-009） |
| `output style` | 読み手が選択する1つのstyle名。その名前を解決する各recognition — `(file, tool)`につき1つ — が定義としてその名前のrow内に列挙される。`prompt/command` rowと同じ条件である。どの名前かはadmitしたruleに属する。それはadmitするvendor自身のcontractだからである: Claude Codeは、frontmatterが`name`を設定しない限りfile名がstyle名になると文書化しており、authoredな空の名前は不在のものと同じくフォールバックする。文字を持たない名前ではpickerがstyleを表示できないからである。1つのrepositoryの2つのproject layerが1つの名前を定義しうる — pageはこれをsession working directoryへの近さで解決するが、この製品はそれを決して観測しない — ため、選択されたroot自身のlayerだけがadmitされ、rowはsame-name resolutionを述べない: 定義は並んで立ち、読み手はそれらを見る（FR-009） |
| `settings/config` | File自身。`rule` rowと同じ条件である: settingsまたはconfiguration fileは、rowのkeyになる名前を宣言せず、groupingの基準になる範囲も支配しないため、Source-relative Pathがrowのidentityであり、1つのfileを2つの製品が認識すれば1つのrow上の2つのrecognitionになる。主題が異なるため別のkindである: 製品が設定を読む先のfileであり、contextへ読み込むguidanceであるruleでも、何を実行してよいかを決めるpermission policyでもない。1つの物理fileがこのrowと別kindのrowを同時に持ちうる — Codexの`.codex/config.toml`は宣言した各serverのMCP rowと、それらの宣言が置かれたdocumentであるここのrowを持つ — また、linkがどのdetailを開くかはfileではなくそのlinkが載るrowから従う（FR-007） |

したがってCustomizationFileは自身の事実 — Source相対Path、read結果、size、diagnostic — を1度だけ
公開し、各kindの一覧はそれを繰り返さず、fileのidentity — それを保持するSourceとSource相対Path
（FR-030）— で参照する。すべてのkindのrow member — skill definition、MCP/hook
declaration、agent/prompt/output-style definition、rule/permissions/settings row、plugin
carrier — はpathの隣に自身の`sourceId`を述べる。Global memberがすべてのkindを公開し、
2つのSourceが1つのpathを持ちうるからである（FR-015〜FR-018、FR-030）。Companionは何を持っていても自身のrowに
ならない（FR-003）ため、rowはそれを所有する定義の隣で、自身のcensusに属するfileのdiagnosticを
pathで名指して述べる: customizationのdirectory内で失敗したreadはgenerationをpartialにしたfileの
1つであり、一覧の中でそれを言えるのはそのcustomizationのrowだけである（FR-028）。共有された1つのrow形では最初の2つの単位を
表現できない: 名前でgroupingするとToolRecognitionが依拠する`(file, tool, kind)`ごとに1 recognitionと
いう規定を壊し、file形のrowは1 carrierの宣言が必要とするN行になりようがない。
形がたまたま一致する2つの単位も、やはり2つである: rule rowはfileであり、permissions rowはpolicyで
あるため、1つの型で両方を表すと異なる2つの主題を1つだと述べることになり、他方が答えられない事実が
最初に必要になった時点で、それを対象としないrowへ追加することになる。

Instruction rowの適用範囲は、ほとんどのfileでは、fileのSource相対Pathから導出するのであって、vendorのruntimeからでは
ない: 範囲はfileが置かれたdirectoryであり、認識した製品がinstruction fileを置くためのdirectoryを
末尾から取り除いたうえで、Repository root相対のglobとして綴る。Claude Codeは`.claude`を
`CLAUDE.md`にだけ持つ — ページはproject instructionの唯一の場所として`./CLAUDE.md`**または**
`./.claude/CLAUDE.md`を挙げる一方、local instructionは`./CLAUDE.local.md`だけを挙げる — ため、
`.claude/CLAUDE.md`とrootの`CLAUDE.md`は1つの範囲を導出して1 rowを共有し、
`packages/api/.claude/CLAUDE.md`は`packages/api/**`を導出し、`.claude/CLAUDE.local.md`は自身の
directoryを保って`.claude/**`を導出する。そうしたdirectoryが何を意味するかはその製品自身の
事実であるため、共有の導出が読む一覧を宣言するのではなく、各製品が自身のruleについて答える。

導出した範囲はliteralから組み立てたpatternであるため、各directory名はglobがsyntaxとして読む
箇所をescapeする — wildcard、character classとbraceの区切り、extended groupの括弧、先頭の
negation、そしてescape文字自身である。したがって`packages/[api]`を持つrepositoryは
`packages/\[api\]/**`を公開し、`a`・`p`・`i`のclassではなくそのdirectory自身を表す。escapeは
parseではない: patternを解釈するものは無く、pathが述べるとおりの意味になるように自身の綴りを
決めるだけである。Rowはそのglobの厳密な文字列一致でgroupingする: globのparse、綴りの正規化、
2つの範囲が重なるかの判定は行わないため、`packages/api/**`と`packages/api/**/*`は2つの範囲で
ある。導出側の綴りはfileごとではなく製品が固定するものであり、それがgroupingの導出側を
一貫させる。自身の範囲を宣言するfile — Copilotの`applyTo` — はその宣言値でkeyされる。
宣言された範囲はparserが解決したとおりに公開する（§ Fieldの読み取り）— 値自身のquoteと
escapeは、すべての宣言値と同じく一度だけ解決される — 一方でこの製品はそれ以上escapeしない:
解決済みの値こそが著者自身のpatternであり、escapeすればその名前のdirectory literalとして
綴ってしまうからである。rowをkeyできる
ものを何も宣言しないそうしたfile — 宣言なし、authoredな空値、rowとして綴れないlistや
mapping、あるいは宣言をまったく読めなかったfile（FR-028） — は既知の範囲を持たない: その
vendorはこのfile名の適用可否を宣言だけから読むため、pathから読み取った範囲は、vendorが
何も与えないfileに最大の担当範囲を述べることになる。そうしたfileは`applicabilityRange`が
nullである1つのrowを共有し、すべての範囲付きrowの後にsortされる。
範囲はfileが担当する対象を述べる。
製品がそのfileをloadしたという主張では決してない: admissionはactivationではない（FR-009）。

Skill rowの名前は1つのtool自身の文書がこのfileを呼び出す名前である（FR-007）。名前がpathと
宣言からどう導かれるかはそのvendor自身のcontractであるため、admitしたruleが答える。Codexと
Copilotはauthoredなfrontmatter `name`を呼び出す —
fileが宣言しないか空で宣言する場合はskill directory名。名前付きdirectoryであることが
skillであり、これによりすべてのrowが名前を持ち、同名directoryに置かれたそうした2つの
fileは1つのrowを共有する。Claude Codeはfrontmatterの宣言に依らずskill directoryを呼び出し、
authoredな`name`は表示labelだけとして扱う（skills page § How a skill gets its command
name）。nestedなskillのcommandには`.claude`を保持するdirectoryの
root相対`/`-joined pathと`:`が前置される。したがって`name: ship`を宣言する
`apps/web/.claude/skills/deploy/SKILL.md`は、Claude Code rowでは`apps/web:deploy`、
Copilot rowでは`ship`である。そこに列挙されたtoolが応じない名前を見出しに持つrowは、読み手が
呼び出せないものを名指すことになる。だからrowと invocation nameは2つではなく1つの事実である。
Nested形には常にprefixが付く:
vendorは、この製品が決して読まない層に対する名前衝突時に、決して観測しないsession working
directory相対でqualifyするため、root相対のqualified綴りだけがstaticなinventoryが保証できる
唯一の安定した名前である。名前はSource相対Pathと同じ制御文字escaping
（§ SourceRelativePath）でrenderする: nestedなClaude rowのprefixはpath segmentであり、名前は
lookupと選択のidentityとして、それ自身として読めなければならない。

定義は自身のrecognitionのparse事実を運ぶ: その`parseStatus`と、そのkindのextraction失敗
referenceである（FR-028）。extractionは`(file, kind)`ごとに1回なので失敗のrecordも1件であり、
そのfileの失敗した各定義がそれを自身のparse事実として名指し、fileの`files[]` entryは
file-confinedな結果としてそれを1回だけ列挙する。extractionの
失敗はauthoredな名前を不在ではなく不明のまま残すため、それを呼び出すtoolはskill directoryへ
フォールバックする — 失敗したparseの読みではなくpath自身の事実である。そこで名付けられたrowは
暫定的なgroupingであり、その定義はそのtoolのsame-name衝突の証拠にならない。Claude Codeの
path由来command名はどちらでも成立する。

GroupingされたentryがInspectorの記録していない優劣を暗示することはない。各entryは、そのentryの定義の
うち2つ以上をproductが認識する名前について、そのproductがどう解決するかを述べる。記録された記述が異なる
ためである: Codexは同名skillをmergeせず両方が有効なまま残り文書化された順序は無い。Claude Codeは
1つのroot内ですべてを有効なまま残し — nestedなものはdirectory-qualified commandで — 作業中のfileに
合うvariantを選ぶ。CopilotのCLIは文書化されたsource orderの最初を解決する。CopilotのVS CodeとCloudの
surfaceは重複時の優先順位を一切文書化していない（contracts/runtime-composition.md）。定義の1つしか認識しないproductは何も述べない。衝突に直面して
いないため、その解決ruleはこのentryが問うていない問いに答えることになる。衝突は引用するruleが答える
ものでもなければならず、Claude Codeのruleはskill directoryに由来するunqualifiedなcommandの衝突に
答える: その記述は、Claude定義のskill directory名を同一generationの別のClaude認識skillと
共有するすべてのrowに付き、異なる名前のdirectoryの下でauthoredな名前だけを共有するrowには
決して付かない（FR-007）。

記述を公開するのは、composition strategyが出荷レジストリにあるproductだけとする。これはrowの欠落では
ない: skill ruleを持たないproductはskillを認識しないため、どのentryもそこへ到達せず、strategy recordが
存在しないうちにcontract表をproductへ書き写すことは、照合対象の無い主張を置くことになる。Productの
skill ruleを出荷する作業が、そのstrategyと記述を一緒に出荷する。

### ToolRecognition

Recognitionはcommit済みgenerationの内部recordであり、どのsession responseも運ばない
（FR-027）: inventory rowもdetailもこれらからprojectされる — 定義は1 recognitionの
`(file, tool)` identityであり、detailの`presentation`は1つのMarkdown recognition —
skillまたはinstruction file — のparseである。コード上は、recognizerが唯一のproduction構築場所であるclassとし、recognize seam
（`CandidateRecognition`）はテストがliteral doubleで満たすinterfaceのままとする。

Recognition recordのdetailsは`kind`で判別する。Recognitionを識別する情報はkindごとに異なり、1つの共有
optional fieldには収まらないからである: skillは単一の`name`を宣言するが、MCP carrierはserverごとに1つ
宣言する。Skillのdetailsはその宣言済み名を運ぶ。これは表示labelであり、すべてのrowの名前の
元となるidentityである（FR-007、FR-027）。Fileが宣言していない場合、名前はemptyではなく
absentとする。Fileが宣言しないか空で宣言するrowは、代わりにそのskill directory名で名付けられる。
Instruction recognitionのdetailsは同じ1回のparse — 書かれた順の宣言済みkeyとblockを
除いたbody — を運び、名前は意図的に持たない: recognitionを識別するのはそれが見つかったfile
であるため、recognitionが既に運ぶSource-relative Pathがidentityの全体である。これは
recognitionのidentityであってrowの単位ではない — instructions一覧はこれらのrecordが運ぶ適用範囲で
groupingする（§ 一覧の単位） — 。2つは別の問いのままである: 範囲を導出するのはadmitしたruleで1度きり
であり、そのvendorがそのfile名をどこから読むかを知るのはその単位だけだからである。Recordが範囲を
運ぶので、projectionは導出ではなくgroupingを行う。

Recognitionは一覧rowではない。Rowの単位はkind自身のものであり（§ 一覧の単位）、各kindの一覧はfileごとの
summaryとして公開されるのではなく、これらのrecordから組み立てられる: skillのrowはrecordを各toolが
解決した名前でgroupingし（§ 一覧の単位）、MCP carrierの宣言は宣言されたserver名でgroupingされ、全carrierを通じて名前ごとに1 rowになる。MCP kindのrecognitionは明示的なcarrier ruleだけから生まれる: 他のkindのfileが自身の内容にMCP風のconfigurationを綴っても — skillやagentのfrontmatter、settings fileのinline map — そのfileはそのkindのrecognitionだけを持ち、configurationはそのfile自身のdetailに書かれた宣言として見えるだけで、どのMCP rowにも合流しない。Fileは自身のrecognition summaryを
公開しないため、1 recordを裏づけるadmission数を述べる必要もない。Admissionはどのruleが読み取りを認可し
どこで一致したかを述べる。カスタマイズがどこに適用されるか、そのruleがどこまで文書化されているかは
admissionに載せない。どちらもsurfaceが示さないからである。

Skillのcensusが得たsort済みcompanion file listはdetailsには載せない。censusは列挙したfileを
generationの通常のfileとして公開し、listは公開する場所 — そのfileのrecognitionが裏づけるinventory
定義（contracts/http-api.md `skills[].definitions[].companionFiles`） — でそのpathから導く。
recognition上の2つ目の綴りはそれらと食い違い得る状態になるからであり、1つのfileのすべての定義 —
tool横断でもentry横断でも — は同じlistを運ぶ。directoryはそのfileのものだからである。`SKILL.md`が単独で置かれている
場合、listはabsentではなくemptyとする。Directoryであることこそがskillの正体であり、認識されたskillは必ず
列挙済みだからである。公開される件数はその`length`だけである
（contracts/inspection-path-allowlist.md § Bounded companion census）。

列挙された各pathは同じgenerationの`CustomizationFile`でもある。Directory形式のcustomizationは全体として
読むため、付随fileは各1回読まれ、他のfileと同様に — 自身のidentity、path、read outcomeを持ち、
readがtextを返した場合は完全なauthored sourceも含めて（FR-025） — 公開される。Census自体は何もadmitしない: censusだけが列挙するfileはrecognitionを持たず、どのkindの
inventoryにも現れない。一方、ruleが独立にadmitするpath — 別のskillのdirectory内にnestedな
`SKILL.md` — は、外側のcensusに列挙されていても自身のrecognitionを持つcandidateである。
定義のlistが付随fileを所属先のcustomizationに結び付けるものであり、detail surfaceは
これをもとにそのcustomizationのdirectoryを構成する。

| Field | Type | Rule |
|---|---|---|
| `sourceRelativePath` | `SourceRelativePath` | Recognitionが付くfileをそのidentityで名指す（FR-030）。複数recognitionが1 physical fileを参照可能 |
| `provenances` | ordered admission record[] | 共有tool/kind解釈についてのrule/path admissionのsort済み非空set。各recordは読み取りを認可したcompiled ruleを保持して`ruleId`と`RuleDiscoveryClass`をそこから導出し、matched `SourceRelativePath`を傍らに持つ — それ以上は持たない |
| `tool` | `copilot \| claude \| codex` | 必須 |
| `details` | kind判別payload | 認識されたkindと、そのkindのrecognitionを識別するもの — skillなら宣言名。1 fieldであるため、射影はkindごとの再構成ではなくcopyで済む |
| `parseStatus` | `not-attempted \| parsed \| failed` | `not-attempted`はallowlist extractorが非該当。`failed`は`(file, kind)`ごとにall-or-nothing: Markdown kindは1回のextractionを全recognizing toolで共有し、MCP kindは1つのdecoded text上で各recognizing tool自身のdocumented readingを実行する（§ Field reading）。それらのreadingはparser familyを共有するため、一方が拒むtextは全readingを失敗させ、失敗の単位は`(file, kind)`の組に留まる |
| `diagnosticIds` | opaque string[] | そのkindのextraction失敗record（FR-028）: `(file, kind)`ごとに1件で、そのkindの失敗した各recognitionが参照し、fileは1回だけ列挙する |

維持管理するsupported-customization文書を規範的なpresentation allowlistとする。Supportedな各`(tool, kind)`について、
relationship kindと、そのrowがcoverするadmit済みsource formを列挙する。Metadata fieldのcatalogは列挙しない。
Skillの宣言はfileが書いたkeyで公開され、authored keyの集合は閉じていないからである。Entryはtuple allowlistに含まれ、かつrecognitionのadmit済みsource formに対するexact extractorがそのauthored
occurrenceを定義する場合だけeligibleとする。1つのrowに複数source formがあっても、それらのschema fieldをunionしたり
別formへ移したりしない。どちらかのgateを満たさないauthored field/referenceは完全な`sourceText`内でだけ表示し、
公開値または`Relationship`を作らない。Parserはshape/nameから同等のものを推論しない。

規範的な列挙は、[GitHub Copilot](contracts/vendors/github-copilot.ja.md)、[Claude Code](contracts/vendors/claude-code.ja.md)、
[OpenAI Codex](contracts/vendors/openai-codex.ja.md) contractのPresentation Allowlist sectionとし、決定的な6件のtable digestと
抽出algorithmは[official-source contract](contracts/official-sources.ja.md)に記録する。依存するimplementation開始前に
frozen design inputとし、implementation gateは再計算とverifyだけを行う。Implementation開始後にfield、relationship kind、
source form、extractor applicability、allowlist membershipの変更が必要になった場合、production registry mutationより前に
dependent workを停止し、影響する英日specification、research、plan、quickstart、contract、data-model artifactをすべて同期して、
`/speckit.plan`、続いて`/speckit.tasks`を再実行する。改訂後のregistry、conformance fixture、test更新を認可できるのは、
再生成したtask setだけとする。

Customization-kind enumは共有するが、各recognizerがpath/interpretation ruleを所有する。共有`AGENTS.md`、
`CLAUDE.md`、`.mcp.json`、skill、marketplaceは1 fileのまま複数recognitionを持つ。`(file, tool, kind)` pairごとに
recognitionは正確に1つとする。Compatible admissionはその1 recordへprovenanceをmergeする。同じpairのextractorが
incompatibleなparsed meaningを返した場合、そのrecognitionを`failed`とし、完全なsourceとcompatible provenance
admissionを保持するがmetadata/relationship/derivation resultはpublishしない。Admissionをlossyな
recognition-level aggregateへcollapseすることはなく、各admissionは自身の読み取りを認可したruleと一致した
pathを保持する。
したがってRepository root `.mcp.json`のCopilot/MCP recognitionは、2つ目のfile/readを作らず
root-exactなCLI provenanceとexactなVS Code 1.118以降provenanceの両方を保持できる。CLI `mcpServers`
extractionはCLI provenanceに結び付けたままにする。VS Code provenanceはpath/surface-onlyで
`documentationStatus: conflict`を持ち、direct official documentationがroot schemaとtotal location orderを
確立するまでVS Code所有extractor fieldまたは推測したsame-name winnerを追加しない。
Parserはenvironment referenceをresolveしない。FR-028対象となる1 fileに限定されたparse/extraction failure
（通常どおりcatchされるparser exceptionを含む）では、そのrecognitionの
metadata/relationship/derivation result全体を破棄してsafe diagnosticを出し、partial generation内で完全なreadable
`sourceText`を維持してよい。Read、parser operationがそのfile-confined pathの外でthrowまたはrejectされた場合、recognizer/scan domainはcatch、
classify、retry、recoverしない。Triggerを所有するboundaryへpropagateし、そのattempt由来のrecognition、item、Diagnostic、
generation resultを作らず、session API boundaryがtriggerを所有する場合はfailed requestのerrorとして通常どおり報告する。

Recognitionはclosed tool順`copilot`、`claude`、`codex`、次にclosed kind順でsortし、opaque IDを使わない。
File間のdeclaration comparisonは、sideごとに1つのcanonical serialized documentをMonacoでdiffする（research.md § 7）。frontmatter宣言はfileの認識Markdown kindに対する1回のparseであってtoolは宣言の座標ではなく — tool recognitionはdiffの横のtypedなrowでtoolごとに比較する — 各sideはYAMLへserializeし、各comparisonはそのkindについてvendorが文書化しているkeyを、それを公開するpageの順で先頭に置き、それ以外のkeyをsort順で並べる（declaration-order.ts）。prompt-and-command comparisonが`description`から始まるのはVS Codeのprompt file formatの表がそうしているからであって、この製品が順位付けした結果ではない。行の名前は宣言された1つのkeyではなくadmitしたruleの答えのままである。MCP kindの宣言は各recognizing tool自身のreading（§ Field reading）であり、その比較surfaceは宣言済みserver名自身のもの — 1つの名前のdeclarationをその行の2つのcarrierそれぞれから取り、sideごとに1つのcanonical JSON documentへserializeしてMonacoでdiffする — で、通常の`get-mcp-carrier-detail` read 2件を通じてloadされる（§ BrowserState · ComparisonSelection）。いずれのdetailも自身のdeclaration contentを同じserialized documentとして、fileが書いたkey順のまま表示する（FR-007）。

### Field reading

Extractorは、認識したkindが公開する宣言を、そのformatのparserが解決した結果 — admit済みsource formごとに
文書化された決定的なreading 1つ、JSON familyについては`(tool, path)`ごとに1つ — として報告する:
Markdown fileのfrontmatterはYAML 1.2 core schema、`.codex/config.toml`のcarrierはTOML 1.0、
JSON carrierはいずれも`JSON.parse`である。そのparseは、readingのclient自身がcommentを受け付ける場合を除いて
strictである。受け付けるのはCopilotのeditorであり、`.vscode/mcp.json`、rootの`.mcp.json`、
`.claude/settings.json`と`.claude/settings.local.json`のpair、`.github/hooks/*.json`に対するそのreadingでは、
commentとtrailing commaを空白化してから同じparseへ渡す。それ以外のsyntax errorは依然としてdocument全体を
失敗させる。どちらのparseになるかはfileだけの事実ではなくreaderとfileの組の事実であるため、1つの物理documentが、
commentを受け付けるreaderを持つproductでは解決し、strictに読むproductでは失敗し得る。各答えとその測定根拠は
parsing seamに記録されている。どのformatでもquoteとescapeは1度だけ解決される。2回宣言されたkeyは、formatのparserが
解決を与える場合 — YAML schemaとstrict JSONはどちらも与える — 後の宣言に解決される。一方TOML 1.0は
keyの再定義そのものを拒むため、それを宣言するcarrierは、parserが拒む他のあらゆるdocumentと同じく
recognitionに失敗する。YAML schemaの下ではさらにaliasが指す先の値に解決され、`007`は`7`として読まれ、schema外のtagはそれが
担っていたscalarを残す。いずれも
拒否しない。scalarはplatform自身のstring変換でrenderするため、その変換が綴らない区別 —
signed zeroは`0`とrenderされる — はplatformの解決をそのまま受け入れたものであり、platformの
integer的keyの列挙順の受容とまったく同じである。parsed kind — string、number、boolean — は
rendered textの横に公開する（`DeclaredScalarKind`）。renderingだけでは`7`がnumberだったのか
quoted stringだったのか言えず、serializeするsurfaceは各scalarをこのkindで綴るからである
（research.md § 7）。kindとtextの組はraw解決値のJSON-safeなencodingである: raw値そのものはJSON
wireに載せられない — `NaN`とinfinityにはJSON値がなく、TOMLの64bit整数はdoubleを溢れる — が、
この組は値が必要な場所でtextに対する`Number`または`BigInt`で正確にdecodeし戻せる。datetimeなどの
host-object scalarは`string`として公開する: ISO renderingがそのspellingである。これはInspector自身のreadingとして述べるのであって、vendorのruntimeが持つ値の主張ではない:
vendorはfieldごとにさらにcoerceし得る — Claude Codeはbooleanなfrontmatter fieldで`yes`をtrueと読むが、
core schemaは文字列`yes`を残す — し、製品が値をどう扱うかはこのtoolが観測しないruntimeである（FR-009）。
Inspectorはその間に立つvalidatorでもない。kindがsourceをserveするfile — skill、instruction file、census
companion — では、綴りが必要なreaderのために完全なdecoded sourceが同じdetail responseの`sourceText`として
同席する。MCP carrierのdetailは意図的にそれを運ばない（FR-007）ため、その宣言がreadingの公開のすべてである。
Permission policy carrierも同じ条件で読む: 宣言された`permissions` blockがそのreadingの公開のすべてであり、
それを運ぶdocumentはpermissions detailからserveしない。documentの残りは別のrecognitionの内容であり、
このrowの主題はblockだからである。

Fileがfileの書いたとおりに見せられるものを何も提供しないとき、recognitionを拒否する。そのformatのparserが
まったくparseできないdocument — malformedなfrontmatter block、carrierのparserが拒むstrict JSONまたは
TOMLのsyntax — 、scalarでないYAMLのkey — 発明せずに行を名指すtextが存在しない。JSONとTOMLのkeyは常に
stringである — 、明示的な
YAML 1.1 tagがhost objectへ解決した値 — 綴りはlocale依存の日付か`[object Set]`しかない — 、そして
自分自身を含む値 — publishする形もsendするJSON形式も持たない — である。いずれも、この製品が作った
値ではなく「報告すべき値なし」を返す。これはrecognition単位でatomicと
する。parseできたfieldではなく、そのrecognitionについて何もpublishしない。部分的なextractionは、どのauthored値を
飛ばしたかを述べられないからである。そのfileはadmit済み・readable・comparison eligibleのまま残る。

Fieldはsource座標を持たない。Documentを指すものが存在せず — detail surfaceはfileを丸ごと表示し、inventory rowは
名前を表示する — rangeはreaderのいないfieldを全entryに載せることになり、しかも誰もcheckできない。
Extractorは測定するのと同じtextから値を取るため、両者の一致を要求してもその値を言い換えるだけであり、測定自体が
誤っていても成立してしまう。Sourceを指す必要のあるprojectionは、座標をそれが意味を持つcheckと共に導入する。

値は文字単位で読む。astral characterはUTF-16 code unit 2つ、combining markはcode point 2つだからである。よって
JSONC、YAML、TOML、Markdown/frontmatter/import、astral character、combining character fixtureは
extractionとJSON transportを変化なく通過しなければならない。

### Skillの表示

Skillのdetail surfaceは、それを運ぶfileではなくskill自身から始める: skill自身のdirectory —
それを読むどの製品も共有する唯一のidentity — を見出しとし、その下に、各認識製品がそのskillを
呼び出す名前を閉じたtool順で述べる。値はdetail上に再公開されるのではなく、そのfileを抱える
rowから読み取られる（contracts/http-api.md § get-session `skills[]`）。定義は1つのtoolの
recognitionであり、2つのtoolが異なる名前で
呼び出す1つのfileは各名前のrowの定義になる。pageはURLが選択したfileを示す —
detail URLは`/skills/detail/<source>/<SKILL.mdのSource相対パス>`というskill自身のidentityで、読んでいるfileは
その傍らの`file` queryが名指す — ため、どのdocumentがpageに出るかはlinkのidentityであって
preferenceではない。addressがskillでselectionがfileであるのは、pageの主題がskillだからである:
companionはそれ自身のpageを持たず、与えてみればどのURLもまず自分がどのskillに属するかを
解決しなければ何も述べられなくなった。tool segmentは
持たない: 1つの`SKILL.md`を読む2つの製品は同じbyte、同じfrontmatter、同じcompanion
directoryを読むため、製品ごとのaddressは1つのdocumentに、名前だけが異なる2つのURLを与える
ことになる。このidentityは再スキャンとserver起動を跨いで安定である — それはURLのpath半分のことで、
Source-relative Pathがwire上のfileのidentityであり、detail requestはそれを現在のcommit済み
snapshotに対して解決するため、bookmarkされたlinkのpathは、再スキャンを跨ぎ、同じrootを選択する
起動を跨いで、同じfileを名指し続ける（FR-030）。別のrootを選択する起動（FR-001）はそのrootの
scanに対して解決し、originはdevframeのport選択に属し、固定defaultが塞がっているときだけ移る
（quickstart.md）ため、portの移動が変えるのはbookmarkの指す先であって、そのpathが名指すfileではない。
現在のscanが保持しないpathはdead linkとして報告される。
authoredな`name`がdirectoryと異なるrootの`.claude` skillは、Copilotにはauthoredな名前で、
Claude Codeにはdirectory由来のcommandで呼び出され、pageはその両方を製品と対にして述べる。
公開値はprojectionのものであり、
clientはvendor namingを再導出せず公開値を描画する。
その下に2つのtab — skill自身と、そのfile — を置く。Skill tabはfrontmatterが宣言する全keyを1つのYAML documentとしてread-only viewerで提示し —
fileの記述順にかかわらず、vendorがskillに対して文書化しているkeyをClaude Code自身のfrontmatter referenceが公開する順で先頭に置き、それ以外のkeyはfileの順のまま。
blockそのものの言語なので、読み手は自分のfileと変換なしに比較し、変換なしにcopyできる
（FR-007）— 続いてそのblockを取り除いた指示を置く。File tabは
directoryと、開いているfileの完全なauthored `sourceText`を持ち、そこがすべてのauthored spellingの
読める場所である。1列ではなく2 tabとするのは、これらが2つの主題だからであり、積み重ねるとdirectoryが
skillの宣言と指示のすべての下に沈むからである。

Parse自体はdetail responseのskill variant（`SkillFileDetailDto.presentation`、
contracts/http-api.md § get-file-detail）に1回だけ公開される: parseはfileの事実であり —
shippedな全vendorが同じ固定YAML semanticsを読む — toolごとのcopyはwireに存在しない。
内部の`ToolRecognition.details`は`skill` kindについて次を運ぶ。

| Field | Type | Rule |
|---|---|---|
| `invocationName` | string | このrecognition自身のtoolがそのfileを呼び出す名前で、admitしたruleが答える（§ 一覧の単位、FR-007）。空にはならない: authoredなidentityを呼び出すruleは、Parserが解決した`name` scalar（§ Field reading）を読み、fileが宣言しない場合、空で宣言する場合、scalar以外へ解決する場合 — fileが名前として書いていないlistの先頭itemでskillを名指すのは、fileが宣言していないidentityになる — 、およびextractionが失敗した場合はskill directoryへフォールバックする。Claude Codeのruleは宣言を一切読まず、skill directoryを取り、nestedならroot相対のprefixを前置する。authoredな`name`自体はここには持たない: それは下の`frontmatter` entryの1つであり、保持すれば事実とそこから導出した値の二重公開になる |
| `frontmatter` | ordered entry[] | Fileが宣言するすべてのkeyを、fileが書いたkey — 維持管理上のcatalogのものではない — でauthored順に持つ。Frontmatter blockの無いdocument、mappingではなくlistや裸のscalarとして書かれたblock — そうしたblockはkeyを宣言せず、listを読めば得られるindex位置はfileが書いたkeyではない — 、`failed` extractionでは空 |
| `bodyText` | string | 同じdocumentからfrontmatter blockを取り除いたもの。`failed` extractionでは空 |

各frontmatter entryは`key`、その`keyKind`、`value`とする。`keyKind`はkeyのparse済みの型 —
string、number、boolean、null — であり、renderingの隣にpublishする。1つの綴りが2つのkeyを
表し得るからである: unquoteの`1`はnumber、`"1"`はstringで、どちらも`1`とrenderされ、file間で
宣言をmatchするsurfaceは綴り単独ではなくこのidentityでmatchする（FR-011）。`value`はparserが
解決した内容をfileが書いた形のまま
写す: scalarは解決済みのtextを持ち、authored nullは独自のvariantとし、sequenceはitemを、
mappingは自身のentryを再帰的に持つ。これによりnestしたblockはblockとして読める。構造を平坦化した
綴りはvalueにしない: それはfileが含まないtextだからである。YAML anchorが宣言し得る「自身を含む値」は
公開する形もJSON形式も持たないため、要約せずそのrecognitionをall-or-nothingで失敗させる（FR-028）。

宣言部と本文の分割はfrontmatter parser自身のものとする。Blockの終端を決めることは、行終端子、
閉じfenceの形、そして何をfenceと数えるかを決めることであり、それはparserが既に実装しているgrammarで、
それについての2つ目の意見は、parserが生成した値と食い違い得る意見である。

他のauthored valueは再公開しない: detail surfaceはこれらの傍らに完全な`sourceText`を提供するため、
同じ画面に既にある値のcaption付きの複製は1つの事実の2つの綴りになり、2つの綴りは食い違い得る。
値を読むことはmechanicalである: natural-languageの意味/意図、semantic rank、
validity/correctness/effectiveness/compliance/quality、policy/remediation advice、fix actionは表現できない。
JSON transport escapeはJSON decode後のstringを変更せず、extractorがparseできなかったdocumentは
recognitionのextraction全体を破棄する一方、完全なdecoded sourceは`sourceText`として利用可能なまま残る。

### Relationship

| Field | Type | Rule |
|---|---|---|
| `relationshipId` | opaque string | Generation内unique |
| origin reference | file identityとrecognition | 起点fileをそのSource-relative Path（FR-030）で、所有recognitionをその`(tool, kind)`で名指す。admission referenceの形は、これらのrecordを構築するrelationship phaseとともに到着する — 指し先になる世代ごとのfile/recognition IDは存在しない。参照したadmissionのmatched pathだけをpath-relative normalizationのbaseにする |
| `ruleId` | stable relationship-only rule ID | 参照がreadを許可できないことを示す |
| `kind` | `import \| declared-component \| skill-resource \| plugin-source \| agent-reference \| context-inheritance \| runtime-reference \| order \| fallback` | Descriptiveのみ |
| `targetOrigin` | `authored \| documented-default` | `authored`はexact source occurrenceを1つ要求し、`documented-default`は省略Codex plugin hookのようなregistry固定defaultだけに許可 |
| `authoredTarget` | stringまたはnull | `authored`ではauthored quote/escapeを含むtarget token/spanの正確なdecoded-source slice。`documented-default`ではnullとし、synthetic pathをauthoredとして表示しない |
| `semanticTarget` | string | Internal。Path normalization/applicability専用の別decode済みauthored targetまたはregistry固定default。Authored display valueへ置換しない |
| `normalizedTarget` | `SourceRelativePath`またはnull | Lexical normalizationが安全で、targetが所有Source内に残る場合だけ設定 |
| `boundaryStatus` | `inside \| outside \| invalid \| unknown` | Readを許可しない |
| `resolutionStatus` | `not-followed \| independently-admitted \| missing \| rejected` | Relationship自体はcontentを展開しない |
| `behaviorRefs` | sort済みbehavior ID[] | Edgeの説明を許すsurface-specific upstream statement |
| `strategyRefs` | sort済みstrategy ID[] | Edgeについて考慮したcomposition/selection strategy |
| `sourceRefs` | sort済みsource ID[] | Relationship rule、behavior、strategy recordからの正確なevidence union |

`Relationship.kind`は全体としてclosedだが、extractorがemitできるのは、owning `(tool, kind)`について維持管理する
presentation allowlistに記載したsubsetだけとする。未記載のrelationship kindを持つreferenceはauthored source text内にだけ
残し、generic、inferred、またはfallback relationshipへ昇格させない。

Relationshipはdirectのみ。Candidate targetはstaticまたはderived ruleで独立して受理し、relationship自体はtargetを
昇格させない。Typed candidate derivationはtargetのrecognition上のderived admission recordとして表し、relationship traversalではない。
Relationship summaryは、既知product ruleの下でreference edgeがavailable/selectedになり得るかだけを表し、
target fileのeffectivenessを表さない。

抽出済みreferenceはapplicableなadmission recordごとにemitし、別rule admissionが
別admissionのdirectoryをrelative baseとして借用しない。各extractorはclosed declaration-field identifier、
`targetOrigin`、zero-based sourceまたはdeterministic synthetic occurrenceだけからなるinternal origin
keyを付ける。Authored field valueを含めず、serializeしない。Deduplication keyは、origin fileのSource-relative Path、所有recognitionの`(tool, kind)`、
起点admissionのstable reference（relationship phaseが固定する形 — 世代ごとのfile/recognition/
provenance IDは存在しない）、`ruleId`、`kind`、origin key、target identityである。Target
identityは利用可能ならnormalized target、そうでなければ`authored`のexact authored targetのprocess-keyed digestまたは
`documented-default`の固定default IDとし、digest/default IDをmemory外やlogへ出さない。Extractorは起点provenanceのstable array key、recognition tool/kind、
relationship `ruleId`/kind、declaration-field identifier、source occurrenceの順でemitし、opaque IDをsortに
使わない。Semantic targetが同じでも別authored source occurrenceは別edgeのまま保つ。Documented defaultは
`authoredTarget: null`とし、UIはdocumented defaultとlabelして`normalizedTarget`を表示してよいが、
source-authored textとは表示しない。
Opaque IDはorderに使わない。Relationshipの構築または保持中にtargetを開かず、独立したcandidate admissionだけがreadを認可できる。

### Diagnostic

| Field | Type | Rule |
|---|---|---|
| `diagnosticId` | opaque ASCII string | Server生成でgeneration/session内unique |
| `code` | stable closed code | Objective testとdocumentation linkに利用可能。Shared registryが各codeのscope、severity、実行可能な英語message/next-step textを固定するため、いずれもserializeしない |
| `severity` | `info \| warning \| error` | `code`によりregistry固定でserializeしない。Vendor validationを意味しない |
| `scope` | `file \| source` | `code`によりregistry固定でserializeしない。必須attachment discriminator。Generation scopeかsession-lifecycleかというlifetimeとは独立 |
| `sourceId` | opaque ASCII ID | どちらのscopeでも必須。この製品が生成するdiagnosticはすべてSourceに属するため、path-lessなものは存在しない |
| `sourceRelativePath` | optionalなSource-relative Path | `file`だけで必須で、`sourceId`内の当該file pathと一致し、`source`で禁止 |
| `lifecycleOwnerKey` | `repository \| global:<tool> \| published-source:<sourceId> \| null` | Internalでserializeしない。全out-of-generation lifecycle Diagnosticでは必須non-null、generation-owned candidateではnullで、1つのpublic owner referenceと照合する |

Legalなattachment shapeは正確に次の2つだけである。`file`はnon-nullの`sourceId`と
`sourceRelativePath`を持つ。`source`はnon-nullの`sourceId`とnullのpath fieldを持つ。それ以外の
組合せを持つDTOはinvalidである。Path-lessなscopeは存在しない: diagnosticは何かを読む際に起きたことを述べる
ものであり、それを読んだSourceは解決可能にする最小の文脈である — どちらも名指さないrecordは、どこかで何かが
失敗したと伝えるだけになる。Scopeはlifetimeと直交する: fatal rescan lifecycle recordもfile単位のread failureも
source scopeまたはfile scopeであり、そのどちらであるかはcommit済みgeneration内に存在するかどうかを何も語らない。

Closed diagnostic-code registryはshared moduleでclosed code unionのそばに置き、各codeのseverity、
attachment scope、問題と実用的な次stepを示す1つの実行可能な英語messageを固定する。Serverとbrowserは
同じregistryを読み、client message catalogまたはlocalized/bilingualなruntime variantは存在しない。
`lifecycleOwnerKey`は1 lifecycle instanceの識別子で、serializeしない。
Candidateは
固定phase、lifecycle-owner semantic order（Repository、固定Global tool順、既存public Source順）、scope、Source-relative Path、rule/code、
emitter occurrence順でemitする。Opaque Source ID自体をsort orderに使わない。Aggregationはorder-onlyとする。
各emitterは各observationを正確に1回作成し、正当に繰り返されるrecordが存在する — extraction失敗は
`(file, kind)`につき1 recordであり（FR-028）、1 fileの2つのkindがそれぞれfailすると全public fieldを
共有する2 recordになる — ため、dedup passはなく、二重emitはtests/reviewが受け持つ通常の実装バグでありruntime filterではない。

Scan candidateは1つのcommit済みgenerationに属する。Commit不能なfatal scan attemptを含むout-of-generation lifecycle
candidateはsessionだけに属し、generation/Source ID listへ入れない。Malformed request、その他client起因
API errorはresponseで返すがdiagnosticとして保持しない。

Sessionはlifecycle owner keyごとにcurrentなactionable failureを最大1件保持する。Automatic Repository admission/initial-scanの
deterministic failureは`repositoryFailureDiagnosticId`から参照する。最初のexplicit rescanはrunning中そのreferenceを保持し、terminal
successならclear、deterministicまたはthrow/reject terminal failureならatomicにremoveして上記`published-source:<sourceId>` stale ownerを
作る。後続explicit outcomeは`StaleSourceFailure`だけを使う。Unpublished Global toolはlifecycle Diagnosticを一切持たない。そのfailureはcontrolの`failureCode`であり、Source
publication成功またはGlobal disableでclearする。Published Sourceのexplicit-rescan failureは`published-source:<sourceId>`を使い、そのSourceの
`StaleSourceFailure`だけから参照する。後続terminal failureは置換し、refresh成功またはSource removalでclearする。無関係なowner
commitは保持する。全non-null public referenceは`sessionDiagnosticIds`のunique member 1件へresolveし、各lifecycle Diagnosticには
public owner referenceが正確に1つある。Diagnosticを意図的にtruncateしたりaggregate suppression recordへ
置換したりしない。予期しないthrow/rejectされたoperationはこのregistryへ入れず、domainを越えてpropagateし、request所有の場合は
ordinary errorとして表面化し、Diagnosticにはならない。決定的Diagnostic自体のretain/serializeがthrowまたはrejectした場合、その予期しないfailureも同じruleに従い、
attempt由来のDiagnosticまたはgenerationを一切publishしない。

Inspection-traversal subsetは正確に次のとおりとする。

| Code | Scope | Severity |
|---|---|---|
| `root-unreadable` | published Sourceでは`source`、未公開Global toolでは`session` | `error` |
| `file-unreadable` | `file` | `error` |
| `file-content-binary` | `file` | `warning` |
| `recognition-parse-failed` | `file` | `warning` |

このsubsetでその他のcodeはinvalidとし、各codeは単一の固定scopeを持つ。`root-unreadable`は、存在しないか
directoryとしてreadできないSource rootを、そのSourceの`sourceId`を持つsource scopeで記録する（Repository Source、
またはrescan時のpublished Global Source）。未公開Global toolはrecordをattachするSourceを持たず、このmodelには
退避先となるpath-less scopeも存在しないため、そのfailureはDiagnosticではない: それが属する`GlobalToolControl`の
`failureCode`である。Diagnosticがその隙間を埋めるためにSourceやpathを捏造することはない。`file-unreadable`は、discoveryとreadの間に消えたfileやtargetがmissing/unreadableな
symbolic linkを含むper-file read failureを記録する（FR-024）。`file-content-binary`はadmit済みcandidateのNUL byteによる
diagnostic-only outcomeを記録する（FR-025）。censusが列挙したcompanionのbinary bytesはassetの通常の事実であり、
Diagnosticなしで公開される。`recognition-parse-failed`は、完全なreadable sourceを表示・comparison可能なまま保ち、
影響を受けたrecognitionの派生metadata/relationshipだけを省くFR-028のparser/extractor failureを記録する。これら3つの
file-confined outcomeのそれぞれが、それ以外はpublish可能なgenerationを`partial`にする。File rowは、generationが既に公開したfile — admit済みcandidate、またはcompanion censusが
その隣に列挙しscanが同じ経路で読んだfile — のcoherentなtupleを必須とする。どのrowもOS error text、outside path、filesystem handle/descriptor、source byteを
持てない。

### RootPresentationEncodingとGlobal lexical state

Repository/Global root labelは、exact ECMAScript UTF-16 code unitに対する共通のdeterministicかつinjectiveなpresentation
encodingを使う。Unicode normalizationまたはscalar/grapheme conversionを行わずstringをiterateする。ASCII letter、digit、
または5 code unit `.`, `/`, `:`, `_`, `-`は変更せずcopyする。それ以外の全code unit、すなわちspace、backslash、quote、
markup punctuation、control/bidi character、non-ASCII code unit、surrogate pairの各halfは、当該16-bit code unitを4桁uppercase
hexadecimalにした6 ASCII character `\uXXXX`としてemitする。Backslashをcopyしないためmappingはinjectiveかつunambiguousであり、
empty inputだけがempty outputになる。RenderingはHTML parseでなくtext node/`textContent`を使う。Encoded valueはdisplay専用で、
decodeまたはI/Oに使わない。

Global `inputState`はcaptured stringへ次の正確な順序でassignする。

1. `origin === 'environment'`かつ`lexicalRoot.length === 0`の場合に限り`present-empty`。
2. U+0000 code unitを1つでも含むか、UTF-16がwell-formedでない場合は`invalid`。すなわちhigh surrogate
   U+D800–U+DBFFの直後にlow surrogate U+DC00–U+DFFFがない、またはlow surrogateの直前にhigh surrogateがない場合。
3. Active-platform `node:path.isAbsolute(lexicalRoot)`がfalseなら`relative`。
4. その他は`eligible`とし、exact stringをpreviewへfreezeする。Consentまでread authorityを持たない。

このclosed algorithm以外のlexical spelling policyを追加しない。`eligible`なrootが使用可能かどうかはconsent後の
readable-directory admissionだけが判定し、後のNode.js/OS rejectionは通常boundary ruleに
従う。`isAbsolute`またはstate/presentation constructionのthrowは、sessionもbrowserも存在しない時点のownerless startup failureとなり、captureもpreviewも作らない。
どのstepもstringをnormalizeせず、separatorを変更せず、filesystemをcallせず、別rootを黙って選ばない。

### BrowserState

このstateはauthoritativeではなく永続化しない。

- `FilterState`: 選択したsource/tool/kindとSource-relative Path query。
- `ClientDataState`: Monotonicな`clientDataEpoch`、adopt済み`sessionId`と`globalContentEpoch`、
  sequenceごとのcurrent generation（adopt済みsnapshotの`repositoryGeneration`とnullableな
  `globalGeneration`）、request familyごとのexact request tokenを保持する。Ordinary settlementは最初に
  request tokenがcurrentのままでcapture済みclient epochが`clientDataEpoch`と一致することを要求する。
  Late rejectionにはnewer stateをpurgeするauthorityがない。Ordinary successはbrowser stateを変更する前に、
  adopt済みsession identity、Global content epoch、null disable fenceに対してcheckする。Sequenceの
  generationがcurrent未満なら無視する。あるsequenceのgreater generationをadoptする前に、そのsequenceのfileにboundされた
  detail/comparison requestをabortし、そのsequenceのdetail/editor/comparison objectをdisposeしてから、そのsequenceの
  inventory entryだけを置換する。他sequenceのstate、request、modelには触れない（FR-030）。Equal-generation responseは
  exactなstill-current request tokenだけを受理する。Detail requestは
  `{ clientDataEpoch, sourceRelativePath }`をcaptureし、callback時にもepochがcurrent stateと一致する場合だけresponseをadoptする。
  Pathはfileの安定したidentityであり（FR-030）、hostはそれをcurrentなgenerationに対して解決する。Purge前にcaptureされた
  responseがstateを再populateしないことを守るのはepochである。全central invalidation/purgeが同じepochをincrementするため、
  response deliveryが既にqueue済みでもlate callbackはno-opになる。
- `ComparisonSelection`: kind固有のcomparison routeがそのkind自身の座標で名指すもの
  （spec.md § Clarifications Session 2026-08-14）。Skill routeは、所有する行のinvocation name、比較する2つのcopyのentry fileの
  `sourceRelativePath` identity、copy相対の比較対象ファイルを名指し、所属sequenceのcurrentな
  commit済みgenerationに対して、0件、対応するreadableなfileを2つ、またはreadableなfile 1つと
  明示された不在へ解決される。行を2つのidentityから導出せず名指すのは、2つのfileが複数の行に
  同居しうるためである — 製品はskillを異なる事実で呼び出すため、他方のdirectory名を自身の`name`
  として宣言するfileは両方を両方の行に載せる — 。導出した行はgenerationが先に公開した方になり、
  読み手が開いた行の3つ目のcopyをroute自身のswitcherから取り落とす。Instruction routeは、先頭に立つSource familyと、side
  ごとのSourceと`sourceRelativePath` identityを名指す（FR-030）。ペアの所有者は、1つのapplicability
  rangeがそのfamilyに対して保持するblockである — skillの前例の行がここではblockになり、fileはちょうど
  1つのrangeを統治するため、そのrangeは2つのidentityから導出される — 。したがってペアはconsentされた
  2つのhomeのfileを持ちうるが、2つのfamilyにまたがることはない。0件またはreadableなfile 2つへ解決される:
  instruction fileはそれ自体で完結するため、どちらの側も明示された不在にはならず、所有するblockが
  保持しないペアは比較されずに報告される。MCP routeは
  1つの宣言済みserver名 — このkindのrow unit — と、current generationのその名前の行が保持する2つの
  carrierの`sourceRelativePath` identityを名指す。名指された行の外にあるselectionは — currentなどの行でも
  ない名前を含めて — 比較されずに報告される。そのペアは通常の`get-mcp-carrier-detail` read 2件でloadし、
  Monacoがdiffするのは、名指されたserverに対する各sideのdeclarationを1つのcanonical JSON documentへ
  serializeしたものである（research.md § 7）: carrier同士はsyntaxを共有するとは限らず、carrierはbytesを
  どこにも表示しない（FR-007）ため、serializationが両sideを読める唯一のspellingである。Prompt-and-command
  routeは、current generationの1つのinvocation-name行が保持する2つのfileの`sourceRelativePath` identityを
  名指す — ここでも行が所有するペアであり、skill名の行の位置に名前の行が立つ。出荷済みのどのruleでも1つのfileが
  2つの名前に解決されることはないため、所有する行は2つのidentityから導出される — 。0件またはreadableなfile
  2つへ解決される: このkindのfileはそれ自体で完結するため、どちらの側も明示された不在にはならず、単一の行が
  保持しないペアは比較されずに報告される。1つのkindは1つのcomparison surfaceであるため、このkindのlocationは
  ここで出会う: VS Code prompt fileは、自身が宣言した名前を持つcommand fileと向かい合って立つ。Source diffの
  横では、認識する各toolのcellが、そのtoolがそのsideのfileを起動する名前を述べる — admitしたruleがそれを答え、
  このkindの2つのlocationが異なる答えを返すため、これはこのkind自身のtypedな事実である — 。定義を持たないcellは、
  そのtoolがそのfileを読まないという事実のすべてである。Hook routeは、宣言済みlifecycle event 1つ —
  このkindの行単位 — と、current generationにおけるそのeventの行が保持する2つのcarrierの
  `sourceRelativePath` identityを名指す。内包された宣言はそれを運ぶfileを通じて名指される: 行が列挙し、
  detail requestが解決するのはそのfileだからである。名指された行の外の選択は、どのcurrent行でもないeventを
  含めて、比較されずに報告される。clientがruntimeに決めることは何一つ名指せない。そのような値をどの行も
  保持しないからである（FR-009）。ペアは通常の`get-hook-carrier-detail` read 2件でloadされ、Monacoがdiffする
  のは、名指されたeventに対する各sideのdeclarationを、入れ子のmappingのkeyをすべてsortした1つのcanonical
  JSON documentへserializeしたものである（research.md § 7）: 1つのeventはTOMLのconfiguration layerからも
  JSONのsettings documentからも宣言され得るうえ、carrierはbytesをどこにも表示しない（FR-007）ため、
  serializationが両sideを読める唯一のspellingである。Cross-source comparisonは常に各sourceの最後に
  commit済みstateを比較する。fileのペアは通常の`FileDetail` request 2件で、片側のskill comparisonは1件でloadする — 不在はrequestを
  要しない — 。MonacoはcompleteなsourceText同士を比較し、不在側は空として、存在する側の内容を行ごとにそれ自体が
  差分として描画する。Credential-like stringやenvironment referenceを含むliteralな差を表示する。
- `EditorModelState`: Opaqueなin-memory URIと完全なauthored `sourceText` — sideがfileではなくdeclarationで
  あるcomparisonでは、宣言済み値を完全に運び同じruleでpurgeされる、1つのdeclarationのparsed値のcanonical
  serialization — を持つgeneration-scoped Monaco model。
  所有editor、subscription、全modelはroute close、selection replacement、file removal、source disable、
  所属sequenceのgeneration変更時に個別にdisposeする。
- Sensitive-contentに関するstateは一切存在しない。acknowledged flagも、注意書きも、`FileDetail` requestや
  comparisonの前に立つ確認stepも持たない（FR-027）。sessionはloopback-boundでfileはユーザー自身のものであり、
  確認は何も守らない一方ですべてのfileを読むのに2回の操作を要求し、常設の注意書きは読み手自身のrepositoryに
  ついて読み手に説明するために画面を費やす。代わりにauthored contentを縛るのは、到達できる場所（fileまたはcomparisonを
  1つずつ。inventoryやsessionのresponseからは到達できない）と保持の長さであり、後者は下記の中央
  full-session purgeが終わらせる。Route close、selection replacement、file/Source removal、generation changeは
  対象scopeのmodelを個別にdisposeし、中央client-data purgeではない。
- Global disableは代わりに下記central full-session purgeを使う。Global-disable actionはrequest送信前に全inspection contentをlocal purgeする。Ordinary responseでより大きい`globalContentEpoch`または
  non-null `globalDisableInProgress`を観測した場合もrender前にidempotent purgeを繰り返す。Clientは`clientDataEpoch`をincrementし、inspection dataを
  返し得る全requestをabortし、全editor/model/comparisonをdisposeし、filter stateをclearして、全Source/generation/file/detail/authored
  metadata/relationship/Diagnostic DTO/DOM textをあらゆるstate ownerとrender済みsurfaceからremoveする。Disableへのjoin/retryに必要なcontrol/error projectionだけを保持できる。
  Purgeの同期保証はこのowner disposalとsettlement authorityの失効である: abort済みrequestをまだawaitしているcontinuationは、そのrequestがsettleして破棄されるまで捕捉済みresponseを保持し得るが、上記のepoch検査がそのsettlementをrepopulationではなくno-opにする。
  Accepted barrier failureではpurge済みcontentをrestoreせず、terminal disable successまたはprocess restart後のnew full snapshotだけからcontentを取得する。
  Barrier acceptance前にrequestがfailした場合、またはtrue no-opの場合、fresh session snapshotのfenceはnullであり、purge済みclientはnew full snapshotを直ちにfetchできる。
- `RecoveryViewState`: Global-disableのpre-send purge、またはordinary responseがgreater epochか
  non-null fenceを公開した後にfresh session snapshotをfetchした場合に作る。Page visibilityまたは
  navigationでは作らない。Transportが報告するchannel lossまたは解釈できないprotocol、session
  mismatchでは、中央purge後にsession-ended viewを維持する。Ordinaryなrequest rejectionは何もpurgeしない。Recoveryはadoptした`sessionId`、fresh
  `globalContentEpoch`/`globalControl`/`globalEnableInProgress`/`globalDisableInProgress` projection、
  失敗した各toolの自身のcontrol上の`failureCode`、presentなfailed
  `globalControl.batchStatus`またはdisable projectionが保持するfailed requestのerror、任意のnewly
  verified frozen previewだけを保持する。`globalDisableInProgress`がnullでnormal full snapshotを
  fetch可能な場合だけ**Resume inspection** actionを提示する。Controlまたは任意enableがactiveなら
  immediate disable、disable drain中ならjoin/wait、disable failedならretry-disableを提示する。Global
  retryはpreview検証済み、`globalEnableInProgress` null、`pendingTools` empty、`retryableTools`
  non-emptyの場合だけ提示する。Resumeはsessionを再取得して返された`sessionId`がadopt済みrecovery
  baselineと一致することを要求し、default filterのfresh inventory-summary viewをatomicに構築する。
  以前のdetail、comparison、editor state、authored sourceは復元せず、後でdetail/comparisonを開く場合は
  fresh sessionから改めて取得する。そのfetchがfailするか返された
  `sessionId`が一致しない場合は、表示済みprocess-lifetime URLを開き直すsession-lost next stepだけを残す。
- `SessionViewState`: Currentなbooting/inspection/recovery/ended viewを保持し、devframeのconnection-status
  signalを直接adoptする。独立したliveness RPC、probe、DTOは存在しない。Initial adoption、source-state
  refresh、明示的Resumeはordinary session functionを使い、elapsed time、idle page、page-lifecycle
  eventからrequestを発行しない。Clientはvisibility、focus、unload listenerを設置せず、
  `visibilitychange`、`pagehide`、`beforeunload`はpurgeもrefetchもtriggerしない。Discardされた
  documentは自身のreferenceをreleaseし、bfcache documentが保持するのは同じuserが自身のmachine上で
  見た自身のfileであり、trusted-workspace modelはこれをexposureとして扱わない。CurrentなRPCでtransportが
  報告するchannel lossまたは解釈できないprotocol、session-ID mismatchでは、
  session-ended viewをrenderする前に中央purgeを同期実行する。Ordinaryなhandler/serialization/delivery
  failureはそのrequestだけのerrorであり、何もpurgeしない。全Monaco
  editor/model/worker/subscriptionをdisposeし、comparisonとfilterのstateをclearし、全
  source/detail/metadata/diagnostic DTOをdropしてpending requestをabortし、epochを
  incrementして旧epochで開始したresponseを無視する。それらのDTOが描画していたDOMはframework自身の
  flushが除去する。これはmicrotaskであり次のpaintより前に完了するため、dropしたstateからframeが
  描かれることはない。Editor modelはDOM除去では解放されないresourceなので、明示的にdisposeする。Ordinary responseがcurrent baselineをconfirm
  またはrenderする前に、そのrequest token、`clientDataEpoch`、session identity、Global content epoch、
  fenceがすべてguardを通過しなければならない。Older epochはrejectし、equal epochかつnull fenceは
  baselineをconfirmし、greater epochまたはnon-null fenceでは同じpurgeを実行してcontrol-only
  recoveryへ入る。Productは別tabからのproactiveな観測をmodelしない。Polling interval、request
  timeout、retry timer、memory leaseを定義せず、continuously idleでvisibleなpage上のprocess lossに
  product定義のwall-clock検出保証を設けない。Service worker、browser storage、HTTP cacheへcontentを
  永続化しない。Applicationが保証するのは、state owner・rendered surface・editor modelの
  同期的なdisposalとsettlement authorityの失効 — abort済みrequestをまだawaitしているcontinuationは、
  no-opとしてsettleするまで捕捉済みresponseを保持し得る（§ ClientDataState） — であり、
  JavaScript制御外browser-process memoryの物理的zeroizationではない。

## State transition

以下のtransition diagramにある`partial`はすべて、Closed Scan Publication Outcomes tableのfile-confined `partial`
outcomeだけを意味し、provisional workやresource-failure resultを示さない。

### Repository source

```text
idle -> scanning（waitingまたはactive） -> ready
                                      -> partial
                                      -> failed（bootstrap snapshotをcommit済みかつcurrentのまま維持）

ready/partial -> scanning（waitingまたはactive） -> ready/partial
                                                \-> failed/stale（このSourceのentryを作成）

failed/current -> scanning（waitingまたはactive） -> ready/partial
                                                 \-> failed/stale（最初のstale entryを作成）

failed/stale -> scanning（waitingまたはactive） -> ready/partial（このSourceのentry + diagnosticをclear）
                                               \-> failed/stale（このSourceのentry + diagnosticを置換）
```

### Member Global source

```text
0 source -- consent preview --> 0 source（Source/I/Oなし）
0 source -- registered initial enable --> globalEnableInProgress。凍結済みentry 4件をoperation-localにvalidate
0 admitted root -------------> active-no-job（active control、Source/generationなし）
1..4 admitted root ----------> atomic queued acceptance + batchStatus(waiting/id) --> running --> 全ready/partial Sourceを含む1 atomic Global generation
                                                                            \-> failed（tool failureまたはfailed requestのerror、同じID）
exact retryable subset ------> 同じatomic batch lifecycle。Lexical-ineligible controlはdisable/new previewが必要
予期しないaccept前throw/rejection --> ordinary request error。Transaction由来のsubset Source/generationなし
ready/partial -- accepted per-source rescan --> scanning --> ready/partial
                                                       \-> failed/stale（own entryを作成）
failed/stale -- accepted per-source rescan --> scanning --> ready/partial（own entry + diagnosticをclear）
                                                       \-> failed/stale（own entry + diagnosticを置換）
active Global control（0..4 Source） -- disable --> disabling barrier --> inactive / 0 Source（Global sequenceをdiscardし、何もcommitしない）
                                                                    \-> failed + retained error --> retry disable
initial enableだけ -- disable --> cleanup-only barrier --> inactive / 0 Source（committed state不変）
                                                \-> failed + retained error --> retry disable
```

Enableには一致する`GlobalConsent`が必要。DisableはCoordinator barrierを実行してGlobal sequence全体をdiscardする。
すなわちmember Global file、generation diagnostic、control所有lifecycle diagnostic、comparison、source textをすべて削除する。
`remove-active-state`はgenerationをcommitせず、Repository sequenceとそのgeneration/IDに決して触れない。Operation-local
`cleanup-only`はcommitted stateを変えない。後のre-enableはincrement済み`globalContentEpoch`のもとでgeneration 1から
fresh Global sequenceを開始する。
Accept後failureは後続disable成功までbarrier/fence/errorをrecover可能なまま保持する。Lexical consent previewは`Source`ではない。Accepted enableはadmit済みtool
ごとに最大1つのSourceをcommitし、各Sourceは1 rootだけを持ち、admitted subset内の全Sourceが同じGlobal generationに現れる。
Applicable disable terminal commit後はすべてabsentになる。決定的なall-rejected初回enableはSource/generationをcommitせず、既存entryとそこから
派生するsnapshot stateを変更しない。Throw/rejectされたenableはfailed requestのerrorだけを報告し、provisional subsetを
一切commitしない。明示的なper-source rescan失敗では、そのSourceの
以前のcommit済みgraphをreadableのまま保持しsnapshotをstaleにする。どちらでも公開済みfailed Sourceの`progress`は
nullとし、failure kindに応じて実行可能なDiagnosticまたはfailed requestのerrorが破棄済みattemptを説明する。Fatal enable/rescanはnew graphも
partial graphもcommitしない。正確なconsentとadmit済みrootはsession control stateとして保持してretry/disableを
可能にし、どのSourceも別rootへfallbackしない。

Diagramの`current`/`stale` suffixはsession全体ではなく、そのSourceが`StaleSourceFailure`を所有するかを示す。
別Sourceの未解決entryにより、このSourceがready、partial、またはcurrentでもtop-level `snapshotState`はstaleに
なり得る。

### Customization file

```text
candidate -> readable + not-applicable/all-parsed/mixed/all-failed parse summary
                     -> 次generationでreplaced/removed
          -> binary
          -> unreadable
```

どのtransitionもsourceへwriteしない。Rescanはold file recordをin-place mutateせず新entityを作る。

## Entity横断invariant

1. Generation scopeの全DTOは1つのsessionと所属sequenceの最後にcommit済みgenerationに属し、detail requestはpathを
   そのgenerationに対して解決して、保持されていないpathには固定の`stale-resource` rejectionを返す。
   Commitは自sequenceのviewだけをinvalidateする。
   Fatal attemptは何もpublishせず、保持generationを変えない。
2. BootstrapからRepository Sourceは正確に1つ存在し、そのboundaryは選択済みRepository root、すなわちdefaultでは
   captureした呼び出し時のexact `process.cwd()`、指定時はそれに対してresolveした単一の`--root` valueである。
   Git rootである必要はなく、labelはread authorityを与えない。
3. Globalは全新processでdisabledである。SessionはGlobal Sourceを0から4つ持ち、Copilot、Claude、Codex、共有agent home
   ごとに最大1つとする。各Sourceはcurrent allowlistで同じmemberについてconsent済みのboundaryを正確に1つ所有する。
4. Accepted file pathは、そのSource root配下で同梱したstaticまたはtyped derived ruleによりadmitされる。
   Parsed valueがcandidateをadmitできるのはその正確なderivation ruleを満たす場合だけで、
   relationship/excluded ruleは決してadmitしない。Client供給のpath stringはreadを認可しない。
   Filesystem operationはraw entry-name segmentを使い、それを`/`でjoinしたものが公開されるdisplay pathである。Global traversalはconsent-bound
   `TraversalPlan`に表されたexact operationだけを行う。
5. Discovered fileはSource/generationごとに、Source-relative Pathで識別する1つの`CustomizationFile`と、
   tool/kind pairごとに最大1 recognitionを持つ。Distinctなpathはdistinctなinventory itemであり、
   physical-identity groupingは存在しない（FR-024、FR-019）。異なるSource、attempt、generationは独立してreadする。
6. 全readable file DTOは完全なauthored `sourceText`を返す。ただしcarrierは例外であり、
   宣言を公開するためにadmitされたfileはその宣言を返し、`sourceText`は一切返さない（spec.md FR-007）。
   さらに、返却する宣言済みmetadata値は
   その宣言についてparserが解決した値とする。Documented defaultはauthored textをnull、
   originを明示する。Comparisonは各fieldの解決済み値と`(kind, 宣言key)`を使い、tool recognitionはtoolごとに宣言の横で比較する。Environment referenceはliteralのままでprocess environmentのlookup/substitutionを
   起こさない。Session Diagnosticはactionable location fieldだけを持てる。
7. Documentation status、authored/installed state、selection、trust、enablement、その他condition factを
   provenance固有かつ直交したまま保ち、「effective configuration」やlossyなrecognition-level winnerへ
   まとめない。
8. Typed derivationはderived admission recordごとに厳密に1つのclosed derived-rule edgeであり、generic relationshipとderived
   admissionをseedにしない。Fileがderived admissionも持つ場合でも、独立static admissionは
   eligibleなままとする。
9. File起点relationshipは1つのrecognitionとadmission recordを指定し、そのrecordの
   matched pathだけをrelative targetのbaseに使う。
10. Resource capacityはNode.js、parser library、browser、OS、filesystem、実行環境から継承する。Inspector固有の
    byte/count/depth/queue/deadline上限を定義せず、environment capacity failureをcustomization validity verdictへ変えない。
11. Browser editor modelはopaqueなin-memory identityを使い、filesystem/remote URLを使わず、active routeと
   generationを越えてsourceを保持しない。Source/comparison surfaceは注意書きを掲げず、detail requestや
   comparisonの前に確認stepも立てない（FR-027）。
   session APIはloopback-bound local host経由でだけ到達可能であり、その境界がすべてだからである。CurrentなRPCでtransportが報告するchannel lossまたは解釈できないprotocol、session mismatch、
   Global-disableのpre-send action、responseで観測したgreater Global epoch/non-null fenceでは中央purgeを
   実行してapplication保持session contentをすべて除去する。全ordinary responseはrequest-token、
   `clientDataEpoch`、session、Global-epoch、fence guardを適用するため、responseから旧generationまたは
   purge済みstateを復活させない。Page-lifecycle eventはpurgeもrefetchもtriggerせず、clientは
   visibility/unload listenerを設置しない。Transportは独立したliveness probeやpolling intervalなしに
   host lossを報告するが、continuously idleでvisibleなpageにproduct固有のwall-clock保証を設けない。
12. 全behavior、rule、strategy、source IDは、所有するbilingual contractとexecutable registryで正確に1回だけ
    定義する。Record自身の`evidence` citationは所有rowのdirect Evidence cellと一致し、引用するofficial-source rowへ
    解決する。citation、documentation status、lifecycle qualifierはどのDTOも運ばない。
    製品が読まないmaintenance recordだからである。Missing、duplicate、orphan、language-divergentなrecordは
    buildをfailさせる。
13. Vendor lookup base/traversalとInspector matcherは別record typeである。全Repository matcherはselected
    Repository rootを基点にauthorしたtyped segment programである。`ANY_DIRECTORIES` segmentは明示的な下向きInspector inventoryだけを意味し、vendor traversalや
    runtime selectionを意味しない。先頭に置けるのは、vendorがworked-fileまたはdescendant anchorを通じて
    あらゆる深さで文書化しているlocationだけである。上へ辿るvendor lookupも同じselected rootで終わるため、
    in-scopeなlayerをちょうど1つ与えるだけで、selector tokenにはならない。
14. `snapshotState`はsession所有の`staleFailures`から派生し、commit済みgenerationへ保存せず変更にも
    使わない。各entryは1つのSourceとそのcurrentな実行可能failure reference（lifecycle `Diagnostic`またはfailed requestのerror message）を持ち、
    そこから`ScanAttempt`やworking-set memberへ到達できない。そのSourceのcomplete/partial正常scanまたはSource除去だけが
    entryとfailure referenceをclearし、無関係なcommitは両方を保持する。
15. Coordinator lockは全session snapshot/file-detail envelopeのgenerationとpayloadをlinearizeする。Network deliveryが
    後になってもcapture済みpayloadをrelabelできない。Clientはadopt時にrequest token、generation、epoch、file存在を全て再確認する。
16. Global previewはraw `lexicalRoot`とescaped `displayRoot`を、`previewId`の背後にある唯一のrecordとしてprocess memory
    だけに保持し、保存済みraw valueをadmissionに使う。Escaped `displayRoot`はpresentationだけで、enableはenvironment inputを再読込しない。
17. Product発行のmutation-capable filesystem operation/open flagは存在しない。Testはcontent、length、identity/link state、
    mode、mtime、ctime、observable xattr/ACLを比較する。OS-only atime changeは別に記録し、mutationもsafetyも証明しない。
18. Syntax parsing、認識したkindが公開する宣言についてparserが解決した値の読み取り、frozen-catalog classification、
    documented structural projectionだけを解釈operationとして許可する。DTO/internal projectionはnatural-languageの
    interpretation/ranking、customization validity/correctness/effectiveness/compliance/quality、policy/remediation advice、
    lint/sync/convert/format/fix behavior、size-based valid/invalid verdictを表現できない。
19. Coordinatorはscanをserializeする。Global disableはpublication authorityをrevokeするpriority barrierであり、
    disable/shutdown後のlate resultはpublishできない。
20. 全source scanはSource、progress、attempt、response、およびcommitしたscan generationで共有する1つの
    `scanRequestId`を持つ。Disable/shutdown revoke後のlate resultはpublishできず、物理的なkernel-I/O cancellationは主張しない。
