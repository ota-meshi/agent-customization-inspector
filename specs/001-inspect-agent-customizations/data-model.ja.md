# Data model: エージェントカスタマイズの調査

[English](data-model.md)

Modelには2つの表現がある。

- **Internal session record**はabsolute path、raw byte、atomic snapshot
  構築中のdecoded authored contentを含み得る。Public DTOやDiagnosticには入れない。
- **Public DTO**はinventory済みfileと安全にnormalize済みのin-Source target用Source-relative locator field、readable fileの
  完全なauthored source text、返却するexactな宣言済みmetadata/relationship source slice、escape済みで非認可のroot
  presentation label、recognition、relationship、diagnostic、generation scopeのopaque IDを含む。Authored content内の
  環境変数参照はliteral textのままとし、process environment値をreadする権限を与えない。

Check-in済みrelease-evidence fixture manifestはtest-only dataでありproduct DTOではない。Closedでversion付きのschemaは、
一意でstableなcase ID、SC-003/004/005/007/009のcriterionとrequired-class membership、fixtureまたは決定的builderへのreference、
客観的expected outcome、参照する各fixture digest、declaredした非ゼロclass minimumを持つ。`manifestVersion`は初期値1のpositive safe integerとする。別のcanonical digest fileがmanifest
byteを対象とする。Release evidenceはそのversion/digestと実行した全case IDを示し、schema error、caseのduplicate/missing、
classの空集合、fixture/digest drift、未実行case、declared minimum未満のdenominator countはinvalidなrelease recordとする。Caseのremove/reclassify、required-class定義またはexpected outcomeの変更ではmanifest versionをincrementして明示的なreviewを受け、fixture byteだけの変更では代わりに影響するfixture digestとcanonical manifest digestを更新する。Revision-policy validatorはtest-onlyな2つのmanifest object `previous`と`current`を受け取り、denominator-semantics変更では`current.manifestVersion > previous.manifestVersion`を要求する。これらtable-driven comparison objectとchange classificationはcontract-test inputであり、release DTOまたはreview recordではない。Digest driftだけでdenominator semanticsの変更を認可しない。Human reviewは、初回作成またはprior/current-version context、変更したdenominator member/definition/outcome、reviewer decision/referenceとともにbilingual release validationへ別に記録する。

## Entity関係

```text
ContractRegistry（immutable、contract-versioned）
├── OfficialSourceRecord
├── VendorBehaviorStatement
├── RuntimeCompositionStrategy
└── InspectionRuleRegistry
    └── InspectionRule

InspectionSession
├── Source（Repositoryを正確に1つ）
│   ├── SourceBoundary（正確に1つ）
│   └── SourceConditionFact（0以上。起点fileなし）
├── Source（Globalを0から3つ。support対象toolごとに最大1つ）
│   ├── SourceBoundary（admit済みtool homeを正確に1つ） → owning GlobalToolControl
│   └── SourceConditionFact（0以上。起点fileなし）
├── ScanAttempt（queuedを0以上、runningを最大1つ。commit前は非公開）
├── RepositoryScanGeneration（最後にcommit済みのものを正確に1つ。Repository sequenceはbootstrapから存在）
│   └── CustomizationFile
│       ├── ToolRecognition（1つ以上）
│       │   ├── DeclaredMetadataEntry（0以上。authored occurrence順）
│       │   └── ApplicabilityAssessment（rule/path admission recordごとに1つ）
│       ├── Relationship（0以上）
│       │   └── ApplicabilityAssessment
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
└── Diagnostic（session/source level failure）

BrowserState
├── FilterState
├── ComparisonSelection（0またはreadable fileを正確に2つ）
├── EditorModelState（0以上。active route/generationのみ）
├── SensitiveContentNoticeState（session内だけのpresentation state）
├── RecoveryViewState（control-onlyなpurge後recoveryと明示resume）
└── SessionLivenessState（pageのlifecycle-check/purge state）
```

## Entity

### InspectionSession

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `sessionId` | opaque string | DTO | Processごとにrandom。Non-authorizingなsession identityのみで、access-control secretではない |
| `createdAt` | `UtcTimestamp` | DTO | Process開始時刻 |
| `sources` | `Source[]` | DTO | Repositoryを正確に1つ、Globalを0から3つ。Copilot、Claude、Codexごとに最大1つ |
| `repositoryGeneration` | `GenerationNumber` | DTO | Repository sequenceの最後にcommit済みsnapshotを識別し、Repository sequenceのcompleteまたはpartialの正常commit時だけ単調増加 |
| `globalGeneration` | `GenerationNumber \| null` | DTO | Global sequenceの最後にcommit済みsnapshotを識別する。Global sequenceが存在しない間（Global inspectionがdisabledまたは未enable）はちょうどnull。1つのsequence内で単調増加し、disable後に新規作成したsequenceはincrement済み`globalContentEpoch`のもとで`1`から再開する |
| `snapshotState` | `current \| stale-after-fatal-rescan` | DTO | `staleFailures`から派生し、未解決の明示rescan失敗が1件以上ある間だけstale |
| `staleFailures` | `StaleSourceFailure[]` | DTO | Published Sourceごとにcurrent entryを1件持ち得る。Source順にsortし、`snapshotState`がcurrentの間だけ空 |
| `globalControl` | `GlobalControlView \| null` | DTO | Active consent/control stateがない場合だけnull。Raw rootを公開せず、purge後のfresh clientが即時disableとpreview-gated retry controlをrecoverできる |
| `globalEnableInProgress` | `{ kind: 'initial-enable' \| 'retry', operationId, previewId } \| null` | DTO | Registered Global enable operationを示すread-only coordinator projection。Tool subset/outcome、root、context、source/boundary/scan ID、job、authorityを含まず、fresh clientがduplicate retryを抑止し、frozen preview再取得とdisableを実行できる |
| `globalDisableInProgress` | `{ operationId, state: 'draining' \| 'committing' \| 'failed', message? } \| null` | DTO | `globalControl`がnullの場合も含むnon-complete disable barrierのread-only projection。Root/content/resource ledgerを含まず、control-only all-inspection-data fenceをselectし、`failed`中だけfailed requestのerror messageを`message`に保持し、fresh clientがcleanupへjoin/retryできる |
| `globalContentEpoch` | non-negative safe integer | DTO | 0から開始し、non-no-op Global disable barrierのfirst acceptanceごとにatomic incrementする。全liveness/inspection-data successをbindし、serverはfence時点で未linearizeのsuccessをrejectし、clientはgreater epoch観測後にolder dataをrejectする |
| `sessionDiagnosticIds` | opaque string[] | DTO | Currentなout-of-generation lifecycle diagnostic |
| `repositoryFailureDiagnosticId` | opaque session Diagnostic IDまたはnull | DTO | Currentな決定的automatic Repository admission/initial-scan failure。最初のexplicit rescan実行中は保持し、successでclear、terminal failureではそのrescanの`StaleSourceFailure` ownerへatomic replace |
| `invocationCwd` | absolute platform path string | internal | CLI validation前に`process.cwd()`から正確に1回captureしたvalue。変更せず、read authorityとして公開しない |
| `cwdOptionValue` | exact stringまたはnull | internal | 省略時null。それ以外はlifecycle/audit correlation専用にsole validated `--cwd` argumentを保持する。Lexical selection後はfilesystem operandに使わない |
| `selectedRepositoryRoot` | absolute platform path string | internal | `--cwd`省略時は`invocationCwd`。指定時はabsolute optionをそのまま保持するか、relative optionをplatformの`node:path` resolutionで`invocationCwd`に対してresolveする。Selectionはfilesystem/network I/Oを一切行わない |

`InspectionSession`はnormal full snapshotで、`globalDisableInProgress`がnullの場合だけ返す。Disable barrier acceptance後はcommit済み各generation/全Sourceを
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

`globalDisableInProgress`がnon-nullの間、session responseはこのexact DTOだけとする。正確に`{ sessionId, liveness,
globalContentEpoch, globalControl, globalEnableInProgress, globalDisableInProgress, toolFailureDiagnostics }`を含み、
disable projectionはrequired/non-nullで、`failed`中はfailed requestのerror messageを持つ。`toolFailureDiagnostics`は`globalControl.toolFailures`参照先の
pathless session Diagnosticだけを含む。Generation、Source、Repository failure、
stale failure、unrelated Diagnostic/error、file、path、authored value、resource fieldを一切持たない。

CLIは`process.cwd()`を正確に1回captureし、`--cwd <path>`を最大1回受理する。Missing/emptyなvalueまたはduplicateなoptionは、
session作成とbrowser openの前にfixedでactionableなstartup errorとする（FR-001）。Absolute optionはそのまま保持し、
relative optionはcapture済み`invocationCwd`に対してresolveする。Root selectionは`process.chdir()`、environment reread、
filesystem I/Oを使わない。選択済みrootの存在とreadabilityはselection時ではなく最初のscanが判定する（FR-002）。
Process開始時にsessionは、file/diagnosticが
空のzero-I/O bootstrap Repository generation 0と、その選択済みstringだけをnon-authorizing identityとしてbindしたenabled/idleな
Repository Sourceをpublishする。Global Sourceはまだ作らず、最初のRepository scanを自動queueする。
Repository picker、ancestor search、profile、cache、resume identifierは持たない。

Local hostはauthenticationをdisableしたdevframe local-tool frameworkである
（spec Clarifications § Session 2026-07-22、Constitution v3.0.0）。devframeはpackaged
`dist/public` treeからbuilt SPAを直接serveし、全session API operationを同じloopback channel上の
devframe RPC function（`defineRpcFunction`）として公開し、port選択、host binding、startup時の
browser openを所有する。Session保護はloopback限定の`localhost` bindのみであり、このmodelはper-session
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

成功するAPI responseはcomplete DTOを返し、意図的にtruncateしない。後述する明示的two-stage Global-disable barrierだけを除き、
successがjobをadmitする、またはcommit済みauthority/control/Source stateを変更する全session API commandについて、coordinatorはID、state、job、disposition、exact success envelopeをtentativeにprepareし、
まだ何もpublishしない。同じserialization lockを保持したまま、hostがそのenvelopeをcompleteにJSON serializeしてUTF-8 encodeし、
1つのimmutable response bufferを作る。Serialization/encodingのthrowまたはrejectionではtentative ID/job/stateをdiscardし、
attempt、admission、control transition、response disposition、generationをpublishせずprior snapshotを維持し、trigger所有session API
requestをadmit済み`scanRequestId`なしで通常どおり失敗させる。Complete buffer作成後、coordinatorは同じlock内で
operation ID、epoch、abort/barrier state、base snapshotを再検証し、exact tentative state/job/dispositionをatomic commitして
immutable bufferをaccepted responseへbindする。再検証失敗ではbufferをdiscardし、partial mutationなしでcontract済み
conflict/cancellation outcomeに従う。Commit後のsocket close、write throw/rejection、その他delivery failureはaccepted job/stateを
rollbackまたはduplicateせず、2件目のfailureを記録せず、successful payloadを報告せず、truncated bodyをpartial DTOへ
変換しない。Clientはfresh session snapshotからrecoverする。Failed requestのerrorのserializationはdevframe RPC
transport boundaryが所有し、handler errorをそのままserializeする。Monacoとbrowserも実行環境が提供する能力を使い、comparison failure時も両方のcomplete
authored source viewを利用可能なままにする。

`globalEnableInProgress`のようなauthority-free live-operation projectionはadmit済みsuccessではなく、所有session API requestの実行中に
表示され得る。Candidate state/authorityを含まず、buffer-bound commit前にoperationが失敗すればremoveし、commit済みstateに対する
success-response gateを弱めない。

Global disableだけは、asynchronous drain完了前にbarrier acceptanceがpublication authorityをrevokeする必要があり、正当にrollbackを
主張できないため例外とする。そのacceptance mutation、terminal success-buffer gate、retained request failure、retry ruleは
`GlobalDisableOperation`で閉じ、他commandはこの例外を再利用できない。

### Source

| Field | Type | Rule |
|---|---|---|
| `sourceId` | opaque ASCII string | Server生成でprocess lifetime中はstable |
| `kind` | `repository \| global` | Repository Sourceを正確に1つ、Global Sourceを0から3つ |
| `tool` | `copilot \| claude \| codex \| null` | Repositoryはnullと組み合わせる。各Global Sourceはsupport対象toolを正確に1つ持ち、2つのGlobal Sourceが同じtoolを共有しない |
| `enabled` | boolean | Repositoryとpublishedな全Global Sourceはtrue。AbsenceはそのtoolにSource未公開であることだけを表し、disabled/pending/retryable control stateは`globalControl`で区別する。Disabling sourceはatomic removalまでtrue |
| `status` | `idle \| scanning \| disabling \| ready \| partial \| failed` | 後述transitionに従う。Publicな`partial`は、traversal完了後に1つ以上のfileがfile-confined outcome（unreadable、binary、parse failure）だけを持ち、影響のない全fileがcompleteであるgenerationのcommitだけを示す。`failed`は最新attemptが失敗し、最後のcommit済みsnapshotが利用可能であることを示す。Fatalな明示rescanだけがsnapshotをstaleにする |
| `boundary` | `SourceBoundary` | 選択済みrootを正確に1つ持つ。Repositoryはcapture済み`process.cwd()`またはresolve済み`--cwd`、GlobalはそのSourceのtoolについてconsent済みの1つのhome root |
| `generation` | `GenerationNumber` | 所属sequenceの最後にcommit済みgenerationと一致する。Repository Sourceは`repositoryGeneration`、公開済み各Global Sourceは`globalGeneration` |
| `scanRequestId` | opaque ASCII stringまたはnull | このSourceで最後にadmitしたscan。Admission直後に設定し、waiting/scanning/ready/partial/failedを通して保持して古いrequestのstatusとの混同を防ぐ。Scan admission前だけnull |
| `progress` | `ScanProgress`またはnull | `scanning`/`disabling`中および`ready`/`partial`後だけnon-null。`idle`、`failed`ではnull |
| `conditionFacts` | `SourceConditionFact[]` | 起点fileを持たないdocumented non-file behaviorまたはexcluded/runtime inputについてのsource-level fact |
| `diagnosticIds` | opaque string[] | 最後のcommit済みgenerationのsource-scoped diagnostic |

`status`、`scanRequestId`、`progress`はsession所有のoperational overlayであり、fatal attemptはcommit済みSource graphや
generation所有IDを変更せず更新できる。Boundary、condition、file、recognition、relationship、generation-scoped
diagnostic contentはatomic generation commitでだけ変更する。

Source-level condition factはpath readを許可せず、`Relationship.fromFileId`を捏造しない。
`affectedRuleIds`にruleがあるcandidate provenanceまたはrelationshipは、関連conditionをapplicability
assessmentへ投影できるが、documented product behavior、検査しないenvironment/user setting、managed
policy、その他起点fileを持たないexcluded/runtime inputの正準な説明はsource factに残す。

### SourceConditionFact

| Field | Type | Rule |
|---|---|---|
| `tool` | tool enum | Documented non-file behaviorまたは検査しないinputを持つproduct |
| `surface` | product-surface enum | 正確なCLI、IDE、Cloud、その他保守対象surface。Owning Source kindから推論しない |
| `ruleId` | stable excludedまたはrelationship-only rule ID | Non-file factを定義し、file candidateを許可できない |
| `affectedRuleIds` | non-emptyなsort済みinspection-rule ID[] | 同梱registryのcandidate/relationship-only subsetで、factを投影できるprovenance/edgeを制御 |
| `behaviorRefs` | sort済み`VendorBehaviorStatement.behaviorId`[] | Factを説明する正確なsurface/scope lookup statement。Readを許可しない |
| `strategyRefs` | sort済み`RuntimeCompositionStrategy.strategyId`[] | Projectionに使った正確なcomposition/selection statement |
| `sourceRefs` | non-emptyなsort済み`OfficialSourceRecord.sourceId`[] | Factで公開し相互validationするstable evidence。Readを許可しない |
| `evidenceAssessments` | `EvidenceAssessment[]` | `ruleId`と全`behaviorRefs`/`strategyRefs` memberごとに正確に1 assessment。Aggregate statusなし |
| `condition` | `ConditionFact` | 固定reason codeと任意のdocumented status。`satisfied`はnon-file runtime factを記録するだけでread authorityを与えず、authored source valueを複製しない |

固定registryのentryはtool、surface、説明rule、affected-rule set、evidence set、
condition key、reason codeでdeduplicateする。Factはfile ID、path、authored source、relationship origin、comparison
targetを持たず、local/hosted I/Oを開始しない。

### SourceBoundary

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `tool` | `copilot \| claude \| codex \| null` | internal | 公開済みowning Sourceのtoolと一致し、Repositoryはnull |
| `displayRoot` | ASCII `RootPresentationEncoding` string | DTO | Source rootのdeterministic encoding。`SourceRelativePath`、inventory-item locator、caller input、read authorityではない |
| `root` | exact absolute platform path string | internal | 選択済みRepository rootまたはそのtoolのconsent済みhome root。このSourceの全inspected-source filesystem operationのbase path |
| `origin` | `process-cwd \| cwd-option \| default-home \| environment` | DTO | Read authorityを与えずrootの選択理由を示す |

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
| `value` | NFC POSIX-style string | Display segmentを`/`でjoinしたそのSource rootからの相対path。Leading slash、URI scheme、NUL、empty/dot segment、`..`、home shorthand、environment expansionなし |

Repository Sourceでは`value`を選択済みRepository rootからの相対pathとする。Global Sourceではそのtoolについてadmit済みの
home rootからの相対pathとする。Public Source-relative PathはNFC display segmentを使い、filesystem operationはtraversalが
返したraw entry nameを使う（FR-024）。NFC valueはpresentation、filter、lookup、selectionのidentityであり、I/O operandでは
ない。Presentationはstored valueを変えずcontrol characterをescapeする。
Wire上では`sourceRelativePath`はnormalized `value` stringだけをserializeし、
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

New unconsented previewを作るrequestごとに、operation-local captureを1つ作る。Hostはenvironment propertyを
`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`の固定順で正確に1回ずつreadする。CaptureしたJavaScript
`undefined`だけをabsentとし、`''`を含む全stringをpresent overrideとする。1 property以上がabsentなら、そのrequestでimport済み
`node:os.homedir()`を正確に1回callし、そのexact return stringを`capturedHomedir`として保持する。Host自身は`HOME`、
`USERPROFILE`その他のplatform home inputをread/選択せず、そのplatform behaviorはNode.js APIが所有する。

Fixed mappingは、Copilot → `COPILOT_HOME`または`node:path.join(capturedHomedir, '.copilot')`、Claude →
`CLAUDE_CONFIG_DIR`または`node:path.join(capturedHomedir, '.claude')`、Codex → `CODEX_HOME`または
`node:path.join(capturedHomedir, '.codex')`とする。Joinはabsent propertyだけに最大1回行うlexical operationで、existence check
その他filesystem operationを行わない。Exact stringを`lexicalRoot`とし、empty、relative、NUL-containingその他表現不能な
resultもstringのままclosed lexical input stateを受け、別fallbackを行わない。Environment access、`homedir()`、join、retention、
presentation encoding、preview serializationがthrow/rejectするかrequired stringを作れない場合、
operation-local captureをdiscardし、session API requestはacceptance前にそのerrorで通常どおり失敗する。Preview、`scanRequestId`、
consent、root、Source、authorityを作らない。正常previewがcaptureと3 exact rootをfreezeし、active consent retrievalでは繰り返さない。

### GlobalConsentPreview

Session APIのconsent routeは、正確に1つの`GlobalRootInputCapture`からlexical path operationだけで
このpreviewを作る。作成と返却のどちらでも、候補Global root配下のfilesystem operationを一切行わない。

| Field | Type | Rule |
|---|---|---|
| `previewId` | exact 43-character unpadded base64url string | 独立した32-byte CSPRNG drawのcanonical encodingでprocess-memory lookup key。新previewは以前の未同意previewをinvalidateし、active consent中はそのexact previewをfreeze/reuse |
| `previewEpoch` | non-negative safe integer | Internalでserializeしない。New captured previewごとにincrementし、opaque IDをorder valueにせずreplacement/revalidationをbindする |
| `allowlistVersion` | date string | Current shipped contract version |
| `entries` | 正確に3 tool entry | Copilot、Claude、Codexの固定順 |
| `entries[].tool` | tool enum | Closed value |
| `entries[].origin` | `default-home \| environment` | Invalidでもenvironment entryを使い、暗黙fallbackしない |
| `entries[].lexicalRoot` | exact raw string | Internalのみ。Escape前のenvironment/default valueを保持し、log/serializeしない |
| `entries[].displayRoot` | ASCII `RootPresentationEncoding` string | `lexicalRoot`のexact deterministic encoding。Owning Sourceが存在する前にoriginを持ち、`SourceRelativePath`、inventory-item locator、canonicalization claim、read authorityではない |
| `entries[].inputState` | `eligible \| present-empty \| relative \| invalid` | I/O前に下記exact ordered `Global lexical state` algorithmでassignする。`eligible`だけがconsent後boundaryになれる |
| `excludedRuleIds` | sort済みexcluded rule ID[] | Authored proseを受け付けず表示除外を決める |

Hostはretained raw valueを変えず`RootPresentationEncoding`を適用する。Allocation能力はNode.js、OS、browserから継承する。
Lexical preview作成中のthrow/rejectionはaccept前のsession API request boundaryへ到達し、`scanRequestId`、normalization、
canonicalization、root creation、readなしでそのrequestを通常どおり失敗させる。Size-based input stateは作らない。Previewはserverが
保持するopaque `previewId`で識別する唯一のrecordであり、root fieldはいずれもnullableでなく、どのencoding stepも
escapeの逆変換やUnicode normalizationには依存しない。
Invalid environment valueはescapeして
表示するが、許可pathにnormalizeしない。Present-empty、relative、invalid entryは固定preview表示だけを使い、retained `Diagnostic`を
作らない。Confirmation後は3 entryすべてが`GlobalToolControl`を受け取る。`eligible` entryだけがconsent後admissionへ進み、
後でtool failure Diagnosticを作り得る。Lexical-ineligible controlはpath-free rejected controlとなり、固定reasonは
frozen previewから表示する。
Absolute spellingは通常のhome外でもすべて`eligible`とし、その場所だけを理由にrejectしたりconsent前I/Oを許可したり
しない。文書化済みdefaultを選択するのは設定がabsentの場合だけで、empty、relative、invalid、consent後rejectの設定から
fallback authorityを作らない。
Admissionは保存済みinternal raw `lexicalRoot`だけを使い、`displayRoot`をpathに使わずenvironmentを再読込しない。
Preview creation/retrievalはcoordinator lock下でlinearizeする。Consentがactive、initial `GlobalEnableOperation`がregistered、またはnon-complete
`GlobalDisableOperation`がpreview fenceを保持する間、
preview取得はIDを含む同じ保存済みDTO-visible objectをfield semantics上byte-for-byteで返し、environmentを読み直さずreplacementも
作らない。どちらでもない場合だけnew captureを実行し、`previewEpoch`をincrementしてprior unconsented previewをreplaceできる。
Initial operationがconsentをactivateせずterminalになった場合、そのoperationをunregisterした後だけfreezeを解除する。Client purge後にexact
consent表示を復元する唯一のpathであり、in-flight enableが到達不能previewのauthorityをcommitすることを防ぐ。

### GlobalConsent

| Field | Type | Rule |
|---|---|---|
| `allowlistVersion` | date string | 表示したcurrent contractと一致すること |
| `previewId` | opaque string | Current in-memory previewと完全一致すること |
| `confirmedTools` | exact `[copilot, claude, codex]` | 凍結済み3 entryすべてと一致するserver-derived固定set。Requestはselectorを持たずnarrowできない |
| `confirmedAt` | `UtcTimestamp` | Memoryのみ |
| `active` | boolean | Global inspection disable時にclearし、tool固有Global Sourceをすべて除去 |

Consentはallowlist contractに表示したpathだけを許可する。隣接settings、credential、state、skill、
plugin、任意env pathは許可しない。
Confirmation commandはtool listを持たず、serverはfrozen previewを検証後、lexicalにinvalidと判明済みのentryも含む3 tool
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
存在すればcurrent Global snapshotを正確にN+1でatomicに置換する。Globalのgeneration-owned IDをすべて再生成し、
Global sequenceのold file/detail/comparison/editor stateだけを無効化する。Repository sequenceとそのgeneration、ID、view
には触れない。別preview/root
には先にGlobal調査のdisableが必要で、retryable toolがないrequestはclosed conflict `no-retryable-global-tool`として拒否する。

Consent後のroot admissionは0から3 toolをadmitできる。Serialized coordinatorはconsentをactivateし、admitted
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
| `tool` | tool enum | Consentがactiveな間、support対象toolごとに正確に1つ存在する |
| `previewId` | opaque string | Active frozen previewを参照し、in-place変更不可 |
| `state` | `unvalidated \| rejected \| admitted \| published` | Operation-localなprovisional control 3件はすべて`unvalidated`から始まるが、そのstateをactiveな`GlobalControlView`へserializeしない。Lexical-ineligible entryはfilesystem I/Oなしでrejected、`admitted`はreadable-directory admissionに合格したがSource未公開、`published`はSourceを正確に1つ持つ |
| `sourceId` | opaque IDまたはnull | Root admission成功後だけallocateし、Source commitまではinternal。Admissionをやり直す場合は破棄 |
| `rejectionCode` | closed reason codeまたはnull | `rejected`の場合だけnon-null。Lexical reasonは正確に`present-empty \| relative \| invalid`、missingまたはreadable directoryでないrootは正確に`root-unreadable`で、path/environment valueを含まない |
| `retryDisposition` | `same-preview \| new-preview-required \| null` | `rejected`以外はnull。Lexical reasonは正確に`new-preview-required`、決定的なconsent後admission/initial-scan reasonはすべて`same-preview` |
| `diagnosticId` | session diagnostic IDまたはnull | Lexical `new-preview-required` rejectionだけはnull。それ以外では、そのtoolにpublished Sourceがない間のcurrentな決定的admission/initial-scan Diagnosticを参照する。Published-Source rescan failureは`StaleSourceFailure`だけに属し、throw/rejectionは参照しない |

`GlobalToolControl`はsession control stateでありscan working setに入らない。正常admissionは単一provisional subset scanを
queueする前に未公開Source IDを事前割当する。決定的にfatalな初回scanはbatch working set全体を
破棄するが、このcontrolはexact-consent retry用に保持し、retryごとに同じfrozen rootを（readable directoryか否かで）scan前に
再admitする。Atomicなbuffer-bound dispositionがrejected stateまたはadmitted replacementをcommitするまで、
pre-operation controlをmutateしない。予期しないthrow/rejectionまたはserialization failureではtentative stateだけを
discardし、pre-operation fieldをすべて維持する。Consent後admission failureはそのdisposition時だけ
`rejected` controlをcommitし、同じpreviewでrevalidationできる。Source commit成功時は事前割当IDをpublishし、`SourceBoundary`を
admit済みrootへbindする。決定的なadmission rejectionまたはfatal returned scan outcomeはそのcontrolのcurrent tool Diagnosticを作成/置換する。
Lexical `present-empty`、`relative`、`invalid` rejectionは`diagnosticId: null`を維持し、fixed rejection codeとfrozen previewだけで説明する。
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
| `confirmedTools` | exact `[copilot, claude, codex]` | Fixed all-tools consent setで、clientから選択しない |
| `pendingTools` | sort済みtool enum[] | Atomicかつbuffer-boundなbatch acceptance後だけ、1 accepted subset scanが所有するadmitted tool。Initial/retry validation/admissionはoperation-localかつunobservable。Cancellation開始後の`disabling`中はnull `batchStatus`とempty |
| `batchStatus` | `GlobalBatchStatus \| null` | Accepted admitted-subset queueingからterminal success/failureまでnon-null。Fresh snapshot/lost-acceptance-response recovery用にpromote済み`scanRequestId`を保持 |
| `retryableTools` | sort済みtool enum[] | `active`中、non-pending unpublished `admitted` controlと`retryDisposition: same-preview`の`rejected` controlを正確に含む。Operation-local retry validation中はexact pre-operation projectionを維持し、lexical `new-preview-required` controlを除外する。`unvalidated`はnon-serializedなoperation-local workだけに存在し、`disabling`中はempty |
| `toolFailures` | fixed-tool-order `{ tool, diagnosticId }[]` | Non-nullな全`GlobalToolControl.diagnosticId`のexact public ownership map。Tool/diagnostic IDはuniqueで、throw/rejectされたbatch failureを含まない |

`GlobalControlView`はactive consent、その`GlobalToolControl` record、coordinator、published Sourceから派生する。
Consentまたはretained control stateがactiveな間、Global Sourceが0個のinitial all-failed/`active-no-job` outcomeと、
既存Sourceを保持するall-rejected retryを含め、
session snapshotごとに返す。Client purge後、SPAはfresh sessionを取得し、
`previewId`でpreview routeからexact stored previewを要求して全path/state/exclusionを再表示してからretryを提示する。
Disableは直ちに利用できる。Published toolは`sources[].tool`から派生しretryableと重複できない。このDTOはadmitted rootもsource contentも含まず、別取得するfrozen previewがunchanged enable request用のexact表示stateを提供する。
`toolFailures`によりfresh clientはsession-ownedな決定的admission/scan Diagnosticをexact toolへattachでき、そのIDは
`sessionDiagnosticIds`にも存在する。Null `diagnosticId`のcontrolにはrowを作らず、dangling、duplicate、cross-tool、
non-session Diagnostic referenceはserializationでrejectする。Owning control failureのclearまたはdisable commitまでrowを保持する。
`GlobalBatchStatus`は正確に`{ scanRequestId, tools, phase, failureRef }`とする。`tools`はnon-empty fixed-tool-order admitted subset、
`phase`は`waiting \| enumerating \| reading \| deriving \| recognizing \| failed`、`failureRef`は`failed`以外nullとする。決定的terminal
failureは`{ kind: 'tool-failures', failedTools }`を使い、non-empty fixed-tool-order toolは、そのbatchが生じさせたsole current Diagnostic
ownerの`toolFailures` rowと正確に一致する。Diagnostic IDを繰り返さず別owner referenceも作らない。予期しないthrow/reject terminal failureは
`{ kind: 'error', message }`を使い、failed requestのerror messageを持つ。Tool非依存のdeterministic Global batch failureは存在せず、全returned deterministic failureを1つ以上の
exact toolへ帰属させる。Cross-tool assembly/invariant/retention/serialization failureはthrow/rejectし、failed requestのerrorとして記録する。
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
| `commandEpoch` | non-negative integer | 受理時のcoordinator値をcaptureし、全async continuationで一致を要求 |
| `previewId` | opaque string | Operation全体でfrozen consent previewと一致 |
| `previewEpoch` | non-negative safe integer | Registration時にexact preview objectからcaptureし、全async boundary後とterminal commit前にobject identityとともにrevalidate |
| `tools` | non-emptyなsort済みtool enum[] | Initial enableではexact fixed 3-tool set、retryではcomplete server-derived `retryableTools` subset。Clientから供給またはnarrowしない |
| `scanRequestId` | opaque ASCII stringまたはnull | Rootを1つ以上admitして単一subset scanをacceptした場合だけ正確に1回allocateし、そのbatchとcommitする1つのGlobal generationで共有する |
| `status` | `waiting \| validating \| admitting \| queueing-batch \| draining \| cancelled \| complete` | Disableがabortすると`draining`になり、以後new authority/jobをpublishできない |
| `responseDisposition` | `unset \| queued \| active-no-job \| global-disable-pending` | Coordinator linearization pointで正確に1回選択し、`queued`は1つのatomic admitted-subset jobを表す |
| `abortSignal` | internal `AbortSignal` | Root validation/admissionとqueue前filesystem callすべてで共有 |

Initial enableは同じcoordinator lock下でcommandを登録してexact current preview object/epochをfreezeするが、provisional consent、3件のcontrol、candidate ID、全admission outcomeを
operation-localかつ観測不能に保ち、3 entryすべての決定的validationが終わる前に`globalControl`を作成せず
`pendingTools`も変更しない。Registered中に見えるのはauthority-freeな`globalEnableInProgress { kind: 'initial-enable', operationId, previewId }`
coordinator projectionだけで、partial tool outcomeを公開せず、operation unregisterまたはatomicな`globalControl`作成時に消える。Retryはexisting active consentに対してcommandを登録し、mutation前のcontrol、failed `batchStatus`、
diagnostic、pending stateをsnapshotしてauthority-freeな`globalEnableInProgress { kind: 'retry', operationId, previewId }` projectionだけをpublishする。
Retry validation/admissionのその他stateもbuffer-bound batchまたはactive-no-job disposition commitまでは
operation-localかつunobservableとする。Root validation/admissionとscan-job作成はcoordinator配下だけで行う。全async boundaryの前後で、同じactive
`operationId`、`commandEpoch`、exact preview object/`previewEpoch`、non-aborted signalに加え、initialでは同じoperation-local provisional state、retryでは
同じactive controlを証明する。Initial enableとretryはいずれもsession stateを変更する前にcoordinator lock下でtransitionを
登録する。Cancellation/disableはoperationをdrainし、late continuationによるjob enqueueやauthority再取得を防ぐ。
Running/queued `GlobalEnableOperation`は最大1つとする。決定的なlexical outcomeとreadable-directory admissionはtoolを
rejected/admitted setへpartitionする。予期しないthrow/rejectionはすべてsession API ownerへunwindする。Initial enableは
consent/controlをactivateせず全provisional stateを破棄し、retryは正確なpre-operation snapshotを復元する。どちらもpartial
admitted subsetをcommitしない。全owning toolが決定的validation outcomeへ到達した後、coordinatorはlock下でgeneral
pre-acceptance response transactionを行う。最初にcurrent operation ID/command epoch/preview object/preview epoch/signalを検証し、publishせず、initial consentと3 control
またはretry partition、candidate batch/`scanRequestId`と`queued`、あるいはjobなし/null IDと`active-no-job`、および
exact projected success envelopeをprepareする。Control activation、job transfer、failed `batchStatus` replace、
newly admitted toolのsuperseded diagnostic clear、public disposition選択より
先に、そのenvelopeを完全にvalidate、JSON serialize、UTF-8 encode、length-materializeして1つのimmutable bufferを作る。
Serialization failureではinitial provisional stateをdiscardするかretryのexact pre-operation control/pending/batch-status snapshotをrestoreし、
candidate IDは`scanRequestId`にならず、requestはadmit済みrequest IDなしで通常どおり失敗する。Buffer作成後、同じlock内で同じ
operation ID/command epoch/preview object/preview epoch/signal/barrier stateを再検証し、その後だけcontrolをatomic activate/applyする。
Accepted batchへadmitされた各toolのprior `diagnosticId`をclearし、candidate batch/IDをpromote/enqueueして`batchStatus`を作り
`pendingTools`を設定するか、null `batchStatus`でrejected-tool diagnosticだけをretain/replaceしてactive-no-jobをcommitし、disposition選択、
`complete`化、unregister、exact buffer bindをatomicに行う。
Per-tool Source commitはobserverに一切見えない。Disable barrierがそのcommit前に先にlinearizeした場合、prepared buffer/stateをdiscardし、
同じcheckは`global-disable-pending`を選んでcancellationを
drainする。Drain済みoperationは`cancelled`となり、barrier cleanup前に
unregisterする。Operationが先ならcommit/buffer-bind済みqueued acceptance、barrierが先ならconflictとなり、両方にはならない。Terminal operation
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
| `frozenPreview` | internal exact preview reference | Pre-barrier previewを`failed`中も保持し、terminal successまでpreview capture/replacementをfence |
| `successBuffer` | immutable UTF-8 bufferまたはnull | Drain/cleanupとcomplete final-snapshot construction後、removal commit前だけ作成 |

Active/queued Global authorityもretained disable failureもないno-op disableは通常single-stage response gateを使い、mutationしない。
それ以外はrequest validation/barrier registrationをcoordinator lock下でlinearizeする。最初のacceptance時にpublic Global consent/control/
Source stateがあれば`remove-active-state`を選び、public Global stateを一度もpublishしていないoperation-local initial enableだけをcancelする場合に
限って`cleanup-only`を選ぶ。Retained failureのretryはfailed operationのexact `commitKind`、`baseGenerations`、removal intent、`frozenPreview`を継承する。
Replacement operationはreinitializeせずsame cleanupを再開し、既に一部cleanupされたpublic projectionから`commitKind`を再計算しない。したがってfailed
`remove-active-state` operationはterminal successでpublic Global graphをremoveするまで`remove-active-state`のままとする。Acceptanceはepoch increment、operation register、
affected publication authorityの不可逆revoke、existing `globalControl`の`disabling`化、`pendingTools` empty化、`batchStatus` clear、
`globalContentEpoch` increment、public Global-content access fence activation、active/queued `GlobalEnableOperation`/Global scan abortをatomicに行う。Operation-local initial enableには公開control snapshotがないが、同じ
internal barrierでrevoke/drainする。このacceptance phaseだけはterminal response serializationより先に実行するmodel唯一のtwo-stage例外である。
`draining`/`committing`中のsecond disableはsame completionへjoinし、joined transport disconnectはbarrierをcancelしない。

`globalDisableInProgress`はacceptanceからterminal failureまでoperation ID/statusだけをmirrorし、terminal success時だけremoveする。Cleanup detail/
authorityを公開しない。`globalEnableInProgress`はinitial-enableまたはretry operationがbarrierでcancel/unregisterされた時点で消える。

Acceptanceから`failed`、`committing`、retry drainを通じてbarrierはhighest-priority Global fenceのままとする。全Global enable/rescan requestは
固定の`global-disable-pending` conflictを返し、queued Global commandをdequeueせず、preview retrievalはnew capture/replacementなしで`frozenPreview`を返す。
Operation-local initial enableだけで`globalControl`がnullの場合も同じである。さらにgeneration fenceとして、non-complete barrier中はnew
Repository rescanをadmitせず、generation-mutating commandをdequeueせず、scan commitを一切許さない。New Repository rescanは
固定の`global-disable-pending` conflictを返す。Acceptance時にrunningだったRepository commandはcommit前にrevokeし、terminal disable success後に正確に
1回だけrequeueしてfailed attemptではreleaseしない。したがってfailed disableとretryの間に`baseGenerations`は変化できず、base mismatchは
rebase/overwrite ruleではなくinternal invariant failureとする。

同じfenceは全full session/inventory/generation/Source/file/detail/Diagnostic/relationship/comparison data requestをrejectし、
`GlobalFenceRecoverySnapshot`だけをselectする。Drain、close、final serialization、terminal commitの成否に依存しない。Disable retryはincrement済み
`globalContentEpoch`を継承し、retained graphを再びreadableにしてはならない。Terminal successまたはprocess restartまでRepository/Global inspection dataを公開しない。

Barrierはenableが`cancelled`へ到達するまで待ち、final queued-Global-work cancellation sweepを実行し、影響を受けた
in-flight workのsettleを待ってそのlate resultをdiscardし、Global sequenceのzero-I/O discardをprepareする。Drained enable
continuationはjob enqueue/control mutationができない。この順序でacceptance後に完了したvalidationがsweep後へ
authorityを追加することを防ぐ。Barrierがenableのbuffer-bound disposition前に勝てばenableは固定の`global-disable-pending` conflict、enableが先にqueued acceptanceを
選べばbarrierがaccepted batchを通常どおりcancel/removeする。Expected cancellationはDiagnosticもretained errorも作らない。

Cleanup後、coordinator lock下でfinal public state/success envelopeをpublic control/Source removalなしにprepareする。
どちらのcommit kindもnew generationをprepareしない。`remove-active-state`はGlobal sequence全体のdiscardをprepareし、
Repository sequenceとそのgeneration/IDには触れずdisableでrekeyしない。`cleanup-only`はcommitted stateを一切変えない。
Envelopeを完全にvalidate、JSON serialize、UTF-8 encode、length-materializeして`successBuffer`を作り、operation ID、epoch、
barrier state、`baseGenerations`を再検証する。その後だけ1 atomic terminal commitがfrozen preview、残るoperation-local stateをremoveして
retainedなfailed requestのerrorをclearする。`remove-active-state`では同じcommitがcommit済みGlobal generationをdiscardし、全Global
Source/control/consentとそのstale failure/diagnostic/batch errorをremoveする。`cleanup-only`ではpublic graph transitionを行わない。
その後operation complete化とexact buffer bindを行う。後のre-enableはincrement済み`globalContentEpoch`のもとでgeneration 1から
始まるfresh Global sequenceを作り、epochがそのeraを区別する。Commit後delivery failureは
rollbackも別error作成もしない。

Barrier acceptance後の予期しないthrow/rejection（drain、final assembly、success serializationを含む）はtrigger session API boundaryへ
propagateし、そのfailed requestのerrorとして通常どおり報告する。Operationは`failed`となり、join/retry表示用にそのerror messageを
atomicに保持する。Retained errorはfailed operation自体が持つため、operation-local initial enableだけで`globalControl`がnullの場合も
存在する。存在する`globalControl`は`disabling`のまま、publication authorityはrevokedのまま、
priorなcommit済み各generationをcurrentに保ち、success body/removal commitをpublishしない。
後のGlobal-disable requestはidempotent cleanupをstart/resumeしてfailed operationをreplaceする。別terminal failureはretained errorをreplaceし、terminal
successだけがclearする。Session API requestがtriggerなのでprocessは終了しない。Coordinator queueにproduct固有の数値capacityを設けない。

### OfficialSourceRecord

`tests/fixtures/conformance/official-sources.json`はimmutableなrelease/test dataで、検査対象Repositoryのinputでは
なく、product startup/scan中にfetchしない。

| Field | Type | Rule |
|---|---|---|
| `sourceId` | stable dotted string | Unique。Behavior、rule、strategyの全`sourceRefs` entryはこのkeyだけを参照 |
| `canonicalUrl` | absolute HTTPS URL | `officialHost`上の正確なauthored URL。Credential、query、fragmentなし |
| `officialHost` | lowercase DNS hostname | Recordごとのexact host allowlist。URLと許可する全redirect hopが正確に一致し、subdomainやsibling hostを暗黙に許可しない |
| `sectionAnchors` | non-emptyなexact heading-text string | Exact rendered heading textだけ。Heading ID、URL fragment、CSS/XPath、その他executable selectorは不可 |
| `affectedBehaviorIds` | sort済みbehavior ID[] | 参照する全`VendorBehaviorStatement.sourceRefs` entryと相互一致 |
| `affectedRuleIds` | sort済みrule ID[] | 参照する全`InspectionRule.sourceRefs` entryと相互一致 |
| `affectedStrategyIds` | sort済みstrategy ID[] | 参照する全`RuntimeCompositionStrategy.sourceRefs` entryと相互一致 |
| `reviewedOn` | ISO date | Human semantic review後だけ更新 |
| `normalizationVersion` | literal `1` | Checked-in deterministic normalization algorithmを選択 |
| `snapshotFingerprint` | lowercase SHA-256 | 選択したofficial sectionだけのnormalized text digest |
| `assertions` | non-emptyなmaintained assertion[] | Stable assertion ID、paraphrase済み期待semantics、affected behavior、rule、strategy ID。Page textをcopyしない |
| `semanticFingerprint` | lowercase SHA-256 | Sort済みmaintained assertionのcanonical JSON digest |

Offline contract testはID、相互contract-record link、exact official hostをvalidateして`semanticFingerprint`を再計算し、
networkへ接続しない。明示maintainer drift commandはcredential、cookie、Repository data、その他local stateを
送信しない。UTF-8 HTML/Markdownだけを受理し、全HTTPS redirect hopがそのsourceのallowlist済みofficial host内に
留まることを要求し、redirect loopはfail closedとする。別final URLへのredirectは
`canonicalUrl`を黙って変えずreview対象として報告する。Downgrade、cross-host redirect、誤content type、
anchor欠落/重複、decode failure、recover可能なnetwork/runtime failureはhard drift-check failureとする。

Normalizationは各anchored headingから同level以上の次heading直前までを選択し、document chromeとscript/style
nodeを除去してprose/code textを保持し、entity decode、Unicode NFC、LF ending、line edge trim、horizontal
whitespace collapseを適用し、列挙順にsectionをjoinしてSHA-256を計算する。Digest/assertion driftからbehavior、rule、strategyを
自動変更しない。Maintainerがaffected contract recordと両言語contract/researchをreviewした後、anchor、assertion、
fingerprint、`reviewedOn`を明示更新する。Remote page text/response bodyはcheck inしない。

Affected-ID arrayの少なくとも1つはnon-emptyとする。各assertionはgenericなproduct areaではなく、そのrecordの
reverse-index済みbehavior、rule、strategy IDのnon-empty subsetを指定する。Unsupportedなrecordはpackage前のoffline contract/build
validationをfailさせる。Scannerはこのtest mapをloadせず、source record、anchor、assertionをtruncateしない。

### DocumentationStatus、LifecycleQualifier、EvidenceAssessment

`DocumentationStatus`はcompleteness/consistencyを表すclosed enum `documented | partially-documented | unknown | conflict`とする。
`LifecycleQualifier`は別のclosed enum `preview | experimental | deprecated`とする。`LifecycleQualifier[]`はuniqueで、
`preview`、`experimental`、`deprecated`のfixed orderに並べる。Empty arrayはmaintain済みlifecycle claimなしだけを意味し、
`stable`と表示または推論しない。

`EvidenceAssessment`はexact DTO record `{ subjectKind, subjectId, documentationStatus, lifecycleQualifiers }`とする。
`subjectKind`は`behavior | rule | strategy`、`subjectId`は対応するimmutable registry recordをresolveする。Arrayはcompleteかつdeduplicate済みで、
subject-kind順`behavior`、`rule`、`strategy`、次に`subjectId`でsortする。Valueはrecordごとにcopyし、worst/best scalarへcollapseしない。
`ConditionFact.status`の`documentation-conflict`は別のruntime condition resultのままで、`DocumentationStatus`のaliasではない。

### VendorBehaviorStatement

`VendorBehaviorStatement`は、upstream documentationに対するatomicかつsurface-specificな解釈を記録する。
Productのlookup場所を説明するものでfilesystem matcherではなく、readを許可できない。

| Field | Type | Rule |
|---|---|---|
| `behaviorId` | stable dotted string | Uniqueで、厳密に1つのbilingual vendor contractだけで定義 |
| `tool` | tool enum | 所有product |
| `surfaces` | non-empty surface enum[] | VS Code、CLI、cloud、shared local Codex clientなど。暗黙の“all”なし |
| `vendorScope` | closed scope enum | Repository/workspace、User、hosted/managed、plugin、runtime-only |
| `lookupBase` | closed locator-base descriptor | Workspace root、Git/repository root、runtime `cwd`、target-path chain、tool home、profile data、active config layer、registered catalog、hosted state |
| `relativeSelector` | vendor-relative stringまたはnull | Path textだけ。Inspector glob semanticsを含まずauthorityを与えない |
| `traversal` | closed traversal descriptor | Exact、ancestor chain、standard-location chain、recursive-under-base、lazy descendant、explicit registration、none |
| `activationConditions` | condition-key enum[] | Trust、feature flag、target match、installation、enablement、runtime version、その他必須input |
| `strategyRefs` | sort済みstrategy ID[] | このbehaviorに適用するcomposition/selection record |
| `documentationStatus` | `DocumentationStatus` | `conflict`は競合する全source assertionを保持 |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Unique fixed order。Emptyはstability claimをしない |
| `sourceRefs` | non-empty source ID[] | このstatementのためreviewした正確なofficial section。Source recordと相互一致 |

Registryはancestor walkを`**/`で表さない。Lookup base、relative selector、traversalを別々のclosed fieldにする。
Relative filenameが同じでもbase/traversalが異なる2 surfaceは、異なるbehavior IDを持つ。

### RuntimeCompositionStrategy

`RuntimeCompositionStrategy`は、文書化済みlayering、selection、fallback、deduplication、precedenceをread
authorityへ変えずに記録する。

| Field | Type | Rule |
|---|---|---|
| `strategyId` | stable dotted string | Uniqueで、bilingual runtime-composition contractで定義 |
| `tool` / `surfaces` | tool enum / non-empty surface enum[] | 正確なproduct/surface boundary |
| `operations` | non-emptyなordered closed enum[] | 各entryは`append \| concatenate \| select-first \| select-closest \| replace \| merge-map \| deduplicate \| filter \| unknown-order`。Array orderは文書化済みpipeline order |
| `inputBehaviorRefs` | non-emptyなsort済みbehavior ID[] | Documented inputだけ。Excluded/user/hosted inputは明示conditionのまま |
| `requiredConditionKeys` | condition-key enum[] | Terminal applicability resultを許す前に必要な全input |
| `documentationStatus` | `DocumentationStatus` | Partial/unknown/conflicting orderからwinnerを捏造しない |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Unique fixed order。Documentation completenessと分離 |
| `sourceRefs` | non-empty source ID[] | Operationsに対する相互一致するofficial evidence |

Strategyはimmutable contract dataである。Applicability assessmentを説明・projectできるが、directoryのenumerate、
relationship targetのopen、InspectorのRepository/Global sourceのmergeはできない。

### StructuredInspectorMatcher

| Field | Type | Rule |
|---|---|---|
| `base` | 正確な1 Source-boundary descriptor | Repositoryまたはnamed consent済みtool固有Global boundary。Selectorから推測しない |
| `selectors` | non-emptyなordered uniqueなselector program（`MatcherSegment[][]`） | 1 static rule所有のalternative。各programはbase boundary相対のclosed ordered programで、final tokenはregular fileを表す |
| `MatcherSegment` | exact discriminated union | `{ kind: 'literal', value: NonEmptyMatcherLiteralSegment }`、`{ kind: 'regex', pattern: RegExp }`、`{ kind: 'recursive-directories' }`。Executable glob、implicit discriminator、extra fieldは不可 |

`NonEmptyMatcherLiteralSegment`はnon-empty printable ASCII stringで、code unitはU+0021–U+007Eのうち`/`、`\\`、`:`, `*`、`?`、`\"`、`<`、
`>`、`|`を除き、`.`と`..`も禁止する。同じclosed typeをstatic fixed prefix、exact target、fixed derived suffixで使う。
Compilerはnon-ASCII registry path literalをrejectするため、fixed prefixとexact targetについてraw byte/code-unit relevanceと後続NFC classificationは不一致にならない。
`literal`はcase-sensitiveなexact ASCII segmentを1つmatchする。`regex`は1つのJavaScript正規表現を持ち、
`pattern.test`がraw entry nameにmatchするとき、そのentry nameを正確に1つmatchする — 標準の`RegExp`
セマンティクスであり、anchoringとescapeはpattern作者の明示的な記述で、その正しさはshipped rule fixtureが
所有する。Patternがtestするraw entry nameはdisk上ではNFD綴りであり得る。Non-terminalならdirectory step、
terminalならfile stepとし、regex literal（例: `/\.md$/u`）として書く。`recursive-directories`—`**` step—は
0個以上のdirectoryをmatchする。Non-terminalかつrecursive token同士の
隣接不可とする。Registryはtyped segment形式で直接authorし、contract tableもそのauthored programを示す。
文法・literal alphabet・unique性・selection-policyの義務はbuild/contract validator（registry contract gate）が
enforceし、runtime logicで再検査しない。Runtimeはこのimmutable
typed formだけをloadする。これによりdescendant contextとdirect child、またはdescendant contextと固定recursive
subtreeのcompositeを、曖昧な単一expansion enumを発明せず表現できる。

### TraversalPlan

`TraversalPlan`は`StructuredInspectorMatcher`からcompileするimmutable shipped dataで、inspection moduleがtraverseする
固定のtool別inspection-path allowlistを所有する（FR-003、FR-015からFR-017）。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown versionはregistry loadをfailure |
| `boundary` | 正確なSource-boundary descriptor | Matcherからcopyし、request/display textから推測しない |
| `selectors` | non-emptyなordered `TraversalSelectorPlan[]` | Matcher selectorの1対1 canonical compile結果 |
| `selectionPolicy` | `all-matches \| codex-global-first-non-empty` | Closed scheduler policy。後者はexact ordered selectorが`AGENTS.override.md`、`AGENTS.md`の`codex.global.instructions`だけで有効 |
| `TraversalSelectorPlan.mode` | `repository-program \| global-exact \| global-fixed-subtree` | Closed operation class。Generic ambient-root walkerなし |
| `TraversalSelectorPlan.fixedPrefix` | NFC literal segment array | Repositoryではempty。Globalではexact targetまたはfixed-subtree rootまでのcomplete pathを、そのterminal target/subtree segmentを含めて持つ |
| `TraversalSelectorPlan.remainder` | `MatcherSegment[]` | Repositoryのcomplete selector program、Global exact targetではempty、またはGlobal fixed-subtree root直下だけのcomplete dynamic program |

Compilationはclosedかつlosslessなmappingとする。`repository-program`はemptyな`fixedPrefix`とcomplete
完全なselector programに等しい`remainder`を持つ。`global-exact`はall-literal selectorを、target fileで終わる
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

### InspectionRule

`InspectionRule`は、二言語inspection-rule contractのimplementation counterpartとして保守するimmutableな
release dataである。
検査対象Repositoryから読み込むものではない。

| Field | Type | Rule |
|---|---|---|
| `ruleId` | stable dotted string | 1 registry内でunique。Semanticsがcompatibleな間だけversion間で維持 |
| `contractVersion` | date string | `GlobalConsent`および同梱registryと一致 |
| `tool` | tool enumまたは`shared` | `shared`はvendor横断のsafety/derivation ruleだけ |
| `discoveryClass` | `static-candidate \| bounded-derived-candidate \| relationship-only \| excluded` | 最初の2つだけがreadを許可可能 |
| `kind` | customization-kind enumまたはnull | Kind横断relationship/exclusionはnull |
| `sourceKinds` | source-kind enum[] | Contractに明示されたRepository、Global、または両方 |
| `matcher` | `StructuredInspectorMatcher`またはnull | Static ruleだけ。Vendor locator、ambient path、executable glob、untyped selector stringではない |
| `derivation` | closed derived-target mappingまたはnull | `bounded-derived-candidate` ruleだけに存在する。独立してadmit済みのseed fileのallowlist済み宣言occurrence（またはseedのmatched path）と固定literal registry suffixから、derived target pathを1つresolveする固定registry mapping。Callback、自由形式path expression、glob、正規表現、再帰derivationは持たない |
| `behaviorRefs` | sort済みbehavior ID[] | このpolicyに関連する正確なupstream lookup statement。Exclusionはreadを許可せずdocumented User behaviorを参照可能 |
| `policyRefs` | non-emptyなsort済みspecification ID[] | Surfaceを許可または意図的に除外するFR/QR clause |
| `strategyRefs` | sort済みstrategy ID[] | Order/applicabilityに使うcomposition fact。Path admissionには使わない |
| `conditionKeys` | condition-key enum[] | 適用可能性判定前に必要なruntime fact |
| `precedenceGroup` | stable stringまたはnull | 文書化されたselection/order semanticsを持つruleだけを結ぶ |
| `documentationStatus` | `DocumentationStatus` | Runtime stateではなくupstream documentationのcompleteness/consistencyを表す |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Separate upstream lifecycle claimをunique fixed orderで保持 |
| `sourceRefs` | non-empty `OfficialSourceRecord.sourceId`[] | このruleのEvidence cellに直接記載した正確なsourceで、相互検証する。参照behavior/strategyが所有するevidenceは各IDから到達可能なままとし、このregistry fieldへ暗黙copyしない |

Build/contract validatorはpackage前にunique性、field組み合わせ、selector-programのtoken/position
rule、exact traversal compile、参照rule ID、closed derivation mapping/acyclic性、fixtureとの
完全一致を検証する。
Runtime loaderはscan前にembedded registry schema、integrity、contract
versionを検証する。Repository提供pluginでruleを追加する機構は持たない。

### RepositoryScanGenerationとGlobalScanGeneration

RepositoryとGlobalのinspectionはlifecycleが独立しているため、それぞれが自分のatomic generation sequenceを持つ
（spec Clarifications § Session 2026-07-22、FR-030）。Repository sequenceはbootstrap generation 0から存在し、
Global sequenceはそれを作るenable commitからdisableがdiscardするまでだけ存在する。Commitは自sequenceのIDと
viewだけをrekey/invalidateし、他sequenceのstateを決して変更しない。Cross-source comparisonは影響を受けず、
常に各sourceの最後にcommit済みのstateを比較する。両generation entityは次のfieldを共有する。

| Field | Type | Rule |
|---|---|---|
| `generation` | `GenerationNumber` | 自sequence内でuniqueかつmonotonic。`0`はRepository sequenceだけに存在してbootstrap専用とし、Global sequenceを作るcommitは正確に`1` — Global sequenceにgeneration 0はない |
| `baseGeneration` | `GenerationNumber` | Serialized transaction開始時の同一sequenceの最後にcommit済みgeneration。Bootstrapとsequenceを作るGlobal enable commitでは`0` |
| `scannedSourceIds` | sort済みopaque source ID[] | Repository/per-Source Global rescanでは1件、initial/retry Global batchでは1〜3件、bootstrapではempty |
| `startedAt` / `finishedAt` | `UtcTimestamp` | Commit済みgenerationでは両方必須。In-flight timingは`ScanAttempt`/`ScanProgress`に属する |
| `outcome` | `complete \| partial` | `partial`はClosed Scan Publication Outcomes tableのfile-confined outcomeだけを意味する。すなわちtraversalが完了し、1つ以上のfileがfile-confined outcome（unreadable、binary、parse failure）だけを持ち、影響のない全fileがcompleteである。`utf-8-replaced`はcompleteで、throw/rejectされたattemptはgenerationにしない |
| `files` | `CustomizationFile[]` | 所属sequenceの全enabled Sourceを含み、Source、Source-relative Path、IDの順で決定的sort |
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
（sequenceを作るGlobal commitは正確に1）。その時点でそのsequenceの全Sourceがnew generationを報告し、unchanged Sourceを
含むそのsequenceの全file/recognition/admission/relationship IDを再生成する。新snapshotは正常scanした各Sourceの
`StaleSourceFailure`と参照先failureだけをclearし、無関係な全Sourceのentryとfailureをcarryし、そのsequenceの
generation-scoped comparison/editor stateをclearする。Commitは他sequenceのgeneration、ID、client stateを決して
変更・rekey・invalidateしない。`remove-active-state` Global disableはscan transactionではない。そのterminal commitは
Global sequence全体 — commit済みgeneration、全tool固有Global graph、各stale-failure entry/diagnostic pair — を
filesystem I/Oなしにdiscardし、どちらのsequenceにもgenerationをcommitしない。無関係なRepository pairは残る。
`cleanup-only` disableはoperation-local/frozen control stateだけをremoveし、committed stateを変えずheld Repository
commandをreleaseする。

決定的なfatal attemptはgenerationを作成もpartial mergeもせず、provisional partial resultを含む
`workingSet`全体を破棄する。所属sequenceのN、全prior ID、全commit済みcontentを表示したまま保持する。Attemptが明示rescanの
場合に限りsession overlayでそのSourceの`StaleSourceFailure`と実行可能lifecycle Diagnosticを作成または
置換し、別Sourceのfailureを保持する。Automatic failure後の最初のexplicit Repository rescanなら、terminal transitionは
`repositoryFailureDiagnosticId`とold `repository`-owned Diagnosticもremoveし、new stale entryが参照するdeterministic
`published-source:<sourceId>` Diagnosticを作るか、failed requestのerror messageを記録することを、同じatomic overlay updateで行う。自動の初回Repository scanのfatal failureではbootstrap generation 0をcurrentのままにする。
初回Global enableのfatal failureではmissing tool用の`StaleSourceFailure` entryを追加せず、そのtoolのkey別
failure diagnosticを作成/置換して既存entryとそこから派生するsnapshot stateをすべて保持する。自動初回Repository failureも
Repository failure recordを使い、どちらもnew inventoryをcommitしなかったことを報告する。Global-disable barrierに
よるexpected cancellationはfailure diagnosticをemitしない。それ以外の決定的にreturnされたsafe failureはout-of-generation
session-lifecycle Diagnosticとする。そのattachment scopeは後述の`Diagnostic` ruleに従い、file scopeでは
`sourceId`、`fileId`、Source-relative Pathを一緒に持つが、source/session scopeではfile IDやpathを捏造しない。
Customization source valueを含めず、`Source.diagnosticIds`へ入れない。Coordinatorは次のqueued transactionを
still-current Nから開始する。後続のaffected Sourceに対するcompleteまたはpartial正常scanがNをN+1へ
置換してそのentryとfailure referenceだけをclearし、別Sourceのcommitでは両方を未解決のまま保つ。予期しないthrow/rejectionはこの
domain classificationをbypassし、requestを所有するboundaryが通常どおり報告する。Accepted explicit rescanはDiagnostic referenceではなく
failed requestのerror messageを持つ同じstale overlayを作成しなければならず（MUST）、pre-acceptance failureはoverlayを作らない。1 sourceあたりrunning/queued
scan commandは最大1つで、duplicate scan commandはcontract済みconflictを
返す。Disableは上記join/no-op ruleを使い、duplicate scan commandではない。

Disableまたはprocess shutdownは新規schedulingを停止し、`publicationAuthority`をrevokeする。PendingのままのNode.js
filesystem promiseがある場合、attemptは`cleanup-only`へ移る。全late byte、graph/Diagnostic/DTO/log resultを破棄し、
open handleはcleanup中にcloseする。API/liveness処理は継続する。Disable barrierは
Global authorityを直ちにrevokeできるが、uncancellable kernel operationがsettleする前に物理的なdrain完了を主張できない。

### ScanProgress

| Field | Type | Rule |
|---|---|---|
| `scanRequestId` | opaque ASCII stringまたはnull | Waiting/active/final source-scan progressではnon-nullで`Source.scanRequestId`と一致。Barrier所有disable progressではnull |
| `phase` | `waiting \| cancelling \| enumerating \| reading \| deriving \| recognizing \| complete` | `waiting`はqueue中、`cancelling`はdisable/shutdown abortのdrain中。どちらもpath/source contentを含めない |
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
| `fileId` | 128-bit、22-character base64url opaque string | DTO | Generationごとに新規。APIはpathを受け付けない |
| `sourceId` | opaque string | DTO | 1つのenabled Sourceを識別 |
| `sourceRelativePath` | `SourceRelativePath` | DTO | Source内でのfileのidentity。所有Source rootからの表示・filter・lookup・selection path |
| `encoding` | `utf-8 \| utf-8-replaced \| binary \| unknown` | DTO | Closedなvariant discriminator。Read stateはここから導出する（readable text、diagnostic-only `binary`、failed-read `unknown`）。NULを含まないinvalid sequenceはreplacement decode済みtextとしてreadableのまま保持 |
| `parseSummary` | `not-applicable \| all-parsed \| mixed \| all-failed` | DTO | Readable textのみ。Recognition-level extraction stateのprojection。Vendor validation resultではない |
| `sizeBytes` | non-negative integer | DTO | Accept済みbyteを持つoutcomeであるreadable textと`binary`だけに存在する |
| `hadLeadingBom` | boolean | DTO | Readable textのみ。他variantにBOMの概念は存在しない。`sourceText` publish前に先頭UTF-8 BOMを正確に1つ記録・除去した場合だけtrue。Replacementの有無とは独立 |
| `sourceText` | string | DTO | Readable textのみで、nullにならない。完全なdecoded authored source。Literal valueと環境変数参照syntaxを正確に保持し、HTMLではない |
| `recognitionIds` | opaque string[] | DTO | Readable textのみ。Accepted customization fileは1つ以上 |
| `relationshipIds` | opaque string[] | DTO | Readable textのみ。同じgenerationを参照 |
| `diagnosticIds` | opaque string[] | DTO | 全variantに存在し、同じgenerationを参照 |

Customization Fileは、Source-relative Pathで識別する、Source内で発見した1つのfileであり、そのencoding、
readable時の完全なsource text、recognition、relationship、diagnosticを持つ。各recognitionはさらに、
自身をadmitしたinspection ruleとmatched path（そのprovenance）を記録するため、scope、order、applicability、
record-by-record evidence assessmentはlossyなfile-level aggregateではなくそのadmission recordへattachされたままになる。

`encoding`が3つのclosed per-file outcome（FR-024/FR-028）を判別する: readable text（`utf-8`または`utf-8-replaced`）、
diagnostic-only `binary`、failed readの`unknown`である。独立したread-state fieldはこのdiscriminatorの繰り返しに
しかならないため存在しない。Accept済みbyteを持ち`sizeBytes`を運ぶのはreadable textと`binary`だけである。`unknown`は、
discoveryとreadの間に消えたfile、read errorで失敗したfile、およびtargetがmissing/unreadableなsymbolic linkを記録し
（FR-024）、size、text、BOM record、parse summary、recognition、relationshipを一切運ばない。各non-readable outcomeは
そのfile-scoped diagnosticを持ち、comparison対象にしない。
Encodingは1回の完了したreadのbyteから割り当てる。NUL byteが1つでも
あれば`encoding: binary`とし、textもBOM recordも持たない — NUL checkはBOM処理より先に走るため、
binary byteにBOMの概念は存在しない。それ以外はbyte sequence全体をUTF-8 replacement
semanticsで正確に1回decodeする。先頭BOMが1つあれば`hadLeadingBom: true`として`sourceText`から除去する。replacementなしで
decodeできたinputは`utf-8`、`U+FFFD`が1つでもinsertされた場合は`utf-8-replaced`とし、
どちらも先頭BOM除去の有無とは直交する。Replacement decodeされたtextはreadableのままで、その文字化けしたexact `sourceText`をparsing、
display、extraction、comparisonへ渡し、それ自体を理由にgenerationをpartialにしない。Binaryだけをdiagnostic-onlyかつ
comparison不適格とする。Charset guessing、別decode、sampling、truncationは表現不能とし、このstate machineに製品固有の
byte、line、item上限を適用しない。`parseSummary`は全recognitionが`not-attempted`なら
`not-applicable`、1つ以上がparsedでfailedがなければ`all-parsed`、1つ以上がfailedでparsedがなければ
`all-failed`、parsed/failedが共存すれば`mixed`とする。`not-attempted` recordは後3 projectionを変えない。
Failed recognitionがあってもreadable textなら完全なsourceを表示でき、そのdiagnosticはInspector extraction
だけを説明しvendorに対するvalidity判断ではない。
Inspectorは`$TOKEN`、`${TOKEN}`、platform上の同等なenvironment referenceのようなstringをauthored textとして
扱う。Source、metadata、relationship、comparison DTOの構築時に、参照先process environment値をread、resolve、
substituteしない。

### ToolRecognition

| Field | Type | Rule |
|---|---|---|
| `recognitionId` | opaque string | Generation内unique |
| `fileId` | opaque string | 複数recognitionが1 physical fileを参照可能 |
| `provenances` | ordered admission record[] | 共有tool/kind解釈についてのrule/path admissionのsort済み非空set。各recordは`ruleId`、matched `SourceRelativePath`、derived candidateではseed fileと宣言occurrence、`ScopeDescriptor`、任意の`OrderDescriptor`、`ApplicabilityAssessment`、record-by-record `EvidenceAssessment[]`（ruleと参照behavior/strategyごとに正確に1件。Lossy aggregateなし）を持つ |
| `tool` | `copilot \| claude \| codex` | 必須 |
| `kind` | closed customization-kind enum | Instruction、rule、skill、agent、prompt/command、hook、MCP、settings/config、output style、plugin、marketplace、skill metadata |
| `parseStatus` | `not-attempted \| parsed \| failed` | `not-attempted`はallowlist extractorが非該当。`failed`はこのrecognitionだけall-or-nothing |
| `declaredMetadata` | ordered `DeclaredMetadataEntry[]` | Allowlist対象のclosed field IDだけ。Source occurrence順と受理したduplicateを保持 |
| `diagnosticIds` | opaque string[] | Owning fileのrecognition-scoped extraction failure |

維持管理するsupported-customization文書を規範的なpresentation allowlistとする。Supportedな各`(tool, kind)`について、
表示対象となるexactでclosedなmetadata `fieldId`、relationship kind、そのrowがcoverするadmit済みsource formを
列挙する。Entryはtuple allowlistに含まれ、かつrecognitionのadmit済みsource formに対するexact extractorがそのauthored
occurrenceを定義する場合だけeligibleとする。1つのrowに複数source formがあっても、それらのschema fieldをunionしたり
別formへ移したりしない。どちらかのgateを満たさないauthored field/referenceは完全な`sourceText`内でだけ表示し、
`DeclaredMetadataEntry`または`Relationship`を作らない。Parserはshape/nameから同等entryを推論しない。

規範的な列挙は、[GitHub Copilot](contracts/vendors/github-copilot.ja.md)、[Claude Code](contracts/vendors/claude-code.ja.md)、
[OpenAI Codex](contracts/vendors/openai-codex.ja.md) contractのPresentation Allowlist sectionとし、決定的な6件のtable digestと
抽出algorithmは[official-source contract](contracts/official-sources.ja.md)に記録する。依存するimplementation開始前に
frozen design inputとし、implementation gateは再計算とverifyだけを行う。Implementation開始後にfield、relationship kind、
source form、extractor applicability、allowlist membershipの変更が必要になった場合、production registry mutationより前に
dependent workを停止し、影響する英日specification、research、plan、quickstart、contract、data-model artifactをすべて同期して、
`/speckit.plan`、続いて`/speckit.tasks`を再実行する。改訂後のregistry、conformance fixture、test更新を認可できるのは、
再生成したtask setだけとする。

Customization-kind enumは共有するが、各recognizerがpath/interpretation ruleを所有する。共有`AGENTS.md`、
`CLAUDE.md`、`.mcp.json`、skill、marketplaceは1 fileのまま複数recognitionを持つ。`(fileId, tool, kind)` pairごとに
recognitionは正確に1つとする。Compatible admissionはその1 recordへprovenanceをmergeする。同じpairのextractorが
incompatibleなparsed meaningを返した場合、そのrecognitionを`failed`とし、完全なsourceとcompatible provenance
admissionを保持するがmetadata/relationship/derivation resultはpublishしない。Path固有scope、order、record-by-record
evidence assessment、applicabilityをlossyなrecognition-level aggregateにしない。
したがってRepository root `.mcp.json`のCopilot/MCP recognitionは、2つ目のfile/readを作らずCLI
descendant-inventory provenanceとexactなVS Code 1.118以降provenanceの両方を保持できる。CLI `mcpServers`
extractionはCLI provenanceに結び付けたままにする。VS Code provenanceはpath/surface-onlyで
`documentationStatus: conflict`を持ち、direct official documentationがroot schemaとtotal location orderを
確立するまでVS Code所有extractor fieldまたは推測したsame-name winnerを追加しない。
Parserはenvironment referenceをresolveしない。FR-028対象となる1 fileに限定されたparse/extraction failure
（通常どおりcatchされるparser exceptionを含む）では、そのrecognitionの
metadata/relationship/derivation result全体を破棄してsafe diagnosticを出し、partial generation内で完全なreadable
`sourceText`を維持してよい。Read、parser operationがそのfile-confined pathの外でthrowまたはrejectされた場合、recognizer/scan domainはcatch、
classify、retry、recoverしない。Triggerを所有するboundaryへpropagateし、そのattempt由来のrecognition、item、Diagnostic、
generation resultを作らず、session API boundaryがtriggerを所有する場合はfailed requestのerrorとして通常どおり報告する。

Recognitionはclosed tool順`copilot`、`claude`、`codex`、次に表記載のkind順でsortし、opaque IDを使わない。
File間metadata comparisonは`(tool, kind, fieldId, occurrence)`を使い、field ID一致だけで無関係recognitionを比較しない。

### SourceTextRange、ExtractedSourceOccurrence

全authored projectionは最初にinternalな`ExtractedSourceOccurrence` 1件として表す。そのkeyはowning recognition、
closed `fieldId`、zero-based occurrenceからなり、exact authored literal、利用可能ならtyped semantic value、
`SourceTextRange` 1件を持つ。RangeはECMAScript UTF-16 code unitで測るhalf-open `{ start, end }`で、
`sourceText.slice(start, end) === authoredLiteral`の場合だけvalidとする。

Metadata、authored relationship、derivationは同じoccurrenceを参照し、そのexact rangeを再利用できる。
Exact range再利用は同じoccurrence keyかつidentical literalの場合だけlegalとする。Distinct emitted occurrenceのrangeは
disjointでなければならず、別origin key間のpartial、crossing、containment、identical overlapはambiguousとして
recognitionのcomplete extractionをfailureにする。Child value occurrenceをemitするextractorはenclosing collectionを
別metadata occurrenceとして同時にemitしない。JSONC、YAML、TOML、Markdown/frontmatter/import、astral character、
isolated surrogate、combining character fixtureで`String.prototype.slice` round-tripを検証する。

### DeclaredMetadataEntry

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `fieldId` | closed metadata-field identifier | DTO | Allowlist field/path用のregistry所有identity。任意のauthored keyにはしない |
| `occurrence` | zero-based integer | DTO | この`fieldId`のsource順occurrenceを数え、`fieldId`と組み合わせてstable metadata-comparison identityにする |
| `authoredLiteral` | string | DTO | Authored quote、escape、block/collection punctuation、environment-reference syntaxを含むvalue token/spanの正確なdecoded-`sourceText` slice。Decoded valueに置換しない |
| `sourceOccurrenceKey` | closed field/occurrence origin key | internal | Shared `ExtractedSourceOccurrence` 1件を参照。Relationship/derivation projectionはspanをcopyせずこのkeyを再利用 |
| `sourceRange` | `SourceTextRange` | internal | UTF-16 half-open range。`String.prototype.slice`が`authoredLiteral`と一致 |
| `semanticValue` | `SemanticMetadataValue`またはnull | internal | Typed classification、relationship normalization、derivation専用の別decode value。Serialize/displayしない。Literal表示は可能だがtyped valueがambiguousならnull |

`SemanticMetadataValue`はnull、boolean、string、integer、float、date/time、array、object用のclosedかつJSON-safeな
discriminated unionとする。Integer、float、date/time payloadは明示type tagとcanonical stringを使い、
JavaScript number precisionやparser固有date objectにsemantic valueを変化させない。Array/objectは既存の
parser/runtimeがsupportする範囲で同じunionをrecursiveに含み、objectはJavaScript object mapではなくordered key/value
entryを使う。
Field名にかかわらず、このunionはauthored literalのmechanical typed decodeである。Natural-languageの意味/意図、
semantic rank、validity/correctness/effectiveness/compliance/quality、policy/remediation advice、fix actionは表現できない。
Inspector所有schema/registryの検査は、これをcustomization-file verdictへ変換しない。

Arrayは正確なsource occurrence順でserializeする。受理したduplicate field occurrenceをmapでcollapseしない。JSON
transport escapeはJSON decode後のDTO stringを変更しない。JSONC syntax-tree range、YAML CST/source-token range、
semantic parseとcross-checkしたTOML lexical span、Markdown/frontmatter/import spanは正確なsubstringを
再現しなければならない。Missing、ambiguous、illegal overlap、non-round-tripping spanはrecognitionのmetadata/relationship/
derivation extraction全体を破棄する。Structural comparisonは`(tool, kind, fieldId, occurrence)`で対応付けて`authoredLiteral`を
比較するため、semanticに同値でもlexicalに異なるvalueを見えるまま保つ。

### ScopeDescriptor、OrderDescriptor

Public scope/order shapeはclosed DTO unionとし、rendering/comparisonをimplementation固有objectへ依存させない。

`ScopeDescriptor`は`kind`とvariantごとに次のfieldだけを持つ。

| `kind` | 追加field | 意味 |
|---|---|---|
| `source-root` | なし | Owning Repositoryまたはtool固有Global Source root |
| `directory-subtree` | `path: SourceRelativePath` | 1 Source-relative directoryとそのdescendant |
| `matching-path` | `path: SourceRelativePath`, `selectorIndex: non-negative integer` | Exact admitted pathとimmutable matcher-selector alternative |
| `declared` | `fieldId`, `occurrence` | Authored valueを複製せず1 `DeclaredMetadataEntry`を参照 |

Path fieldは所有admission recordと同じSourceに属する。Stable scope keyは上記variant順、次に該当するSource-relative
path、selector index、field ID、occurrenceとする。

`OrderDescriptor`は次のclosed unionからなるnon-emptyなordered `components` arrayを持つ。

| Component `kind` | Field | 意味 |
|---|---|---|
| `path-depth` | `direction: broad-to-narrow \| narrow-to-broad`, `depth: non-negative integer`, `path: SourceRelativePath` | Documented path-layer orderだけ |
| `registry-rank` | `strategyId`, `rank: non-negative integer` | 1 strategy内の固定documented fallback/precedence rank |
| `source-occurrence` | `fieldId`, `occurrence` | Valueをcopyしないauthored declaration order |

Componentはdocumented pipeline順で保持する。Stable comparison keyはcomponent position、上記component-kind順、次に
direction/depth/path、strategy/rank、またはfield/occurrenceとする。Unknown/conflicting orderはfabricated rankではなく
nullとapplicability/documentation factで表す。

### ApplicabilityAssessment

| Field | Type | Rule |
|---|---|---|
| `summary` | `authored \| available \| selected \| omitted \| shadowed \| disabled \| conditional \| unknown` | 便宜的projectionにすぎず、`effective`と呼ばない |
| `conditions` | `ConditionFact[]` | key・reason code・basis・status順でsort/deduplicateし、欠けたinputをtrueにしない |
| `strategyRefs` | sort済みstrategy ID[] | Projectionに使ったstrategy。Authorshipしか判明しない場合はempty |
| `evaluatedFromGeneration` | integer | このassessmentを計算した所属sequenceのgeneration。Rescanを越えてfactを残さない |

各`ConditionFact`は`key`（`surface`、`engine-version`、`runtime-cwd`、`workspace-root`、
`repository-root`、`project-root`、`worked-path`、`target-match`、`scope-availability`、`feature-state`、
`trust`、`approval`、`enablement`、`selection`、`settings-inputs`、`plugin-state`、`agent-context`、`event`、
`documentation-variant`、`tool-availability`、`installation`、`managed-policy`、
`instruction-byte-budget`、`content-limits`、`external-runtime`）、
`status`（`satisfied`、`unsatisfied`、`unknown`、`documentation-conflict`）、固定`reasonCode`、
`basis`（`inspected-data`、`official-rule`、`excluded-input`、`runtime-input`）を持つ。
Applicableなofficial ruleと結論に必要な全inputが判明した場合だけsummaryを`selected`、`omitted`、
`shadowed`、`disabled`にする。それ以外は`conditional`または`unknown`のままとする。

同梱condition-reason registryは各`reasonCode`を、許可するkey/basis/status shape、結論にrequiredかどうか、
1つのprojection role（`authorship`、`availability`、`selection`、`omission`、`shadowing`、`disablement`、
`documentation-uncertainty`）へmapする。Emitterはsummaryを直接選べない。各generationで次のdecision tableを
使って再計算し、最初にproofが完成したrowを採用する。

| Priority | Summary | 必要なcomplete proof |
|---:|---|---|
| 1 | `disabled` | Documented enablement、managed-policy、tool-availability controlがuseを禁止すると判明。このproofは後続selection factにかかわらず十分 |
| 2 | `shadowed` | Completeなapplicable precedence chainで別candidateが勝つと証明し、disable proofなし |
| 3 | `omitted` | Completeなsurface/target/selection/budget ruleで除外を証明し、higher-priority proofなし |
| 4 | `selected` | Documented selection ruleでinclusionを証明し、selectionを妨げ得る全conditionがsatisfied |
| 5 | `unknown` | Required composition/applicability ruleのdocumentationがabsent/conflictingで、十分なnegative proofなし |
| 6 | `conditional` | Documented applicability pathはあるがrequired runtime/excluded inputがunknown/conflictingで、十分なnegative proofなし |
| 7 | `available` | 全documented availability requirementがsatisfiedで、availabilityを妨げる未解決factがなく、selection resultは主張しない |
| 8 | `authored` | Accepted authored declarationだけを証明し、installation/availabilityを意図的に主張しない |

`authored`をprojectできるのはfile起点candidate declarationだけで、より強いproofがないrelationshipは
`conditional`または`unknown`とする。Unrelated informational factはterminal resultを妨げず、reason registryで
requiredとしたfactだけが妨げる。Higher-priority sufficient outcomeが勝ってもconditionは正本として全て表示する。
これらsummaryはdocumented explicit factをmechanicalにprojectするだけで、natural-language contentを解釈せず、
customizationのvalidity/correctness/effectiveness/compliance/qualityを判定せず、remediationを助言しない。

### Relationship

| Field | Type | Rule |
|---|---|---|
| `relationshipId` | opaque string | Generation内unique |
| `fromFileId` | opaque string | 必須 |
| `fromRecognitionId` | opaque string | 必須。`fromFileId`に属し、`fromProvenanceId`を所有すること |
| `fromProvenanceId` | opaque string | 必須。`fromRecognitionId`が所有する1つのadmission recordをresolveし、そのmatched pathだけをpath-relative normalizationのbaseにする |
| `ruleId` | stable relationship-only rule ID | 参照がreadを許可できないことを示す |
| `kind` | `import \| declared-component \| skill-resource \| plugin-source \| agent-reference \| context-inheritance \| runtime-reference \| order \| fallback` | Descriptiveのみ |
| `targetOrigin` | `authored \| documented-default` | `authored`はexact source occurrenceを1つ要求し、`documented-default`は省略Codex plugin hookのようなregistry固定defaultだけに許可 |
| `authoredTarget` | stringまたはnull | `authored`ではauthored quote/escapeを含むtarget token/spanの正確なdecoded-source slice。`documented-default`ではnullとし、synthetic pathをauthoredとして表示しない |
| `sourceOccurrenceKey` | internal occurrence referenceまたはnull | `authored`では該当時にmetadata/derivationと同じ`ExtractedSourceOccurrence`を参照。`documented-default`ではnull |
| `targetSourceRange` | `SourceTextRange`またはnull | Internal。`authored`では必須でUTF-16 offsetを使い`authoredTarget`を再現。`documented-default`ではnull |
| `semanticTarget` | string | Internal。Path normalization/applicability専用の別decode済みauthored targetまたはregistry固定default。Authored display valueへ置換しない |
| `normalizedTarget` | `SourceRelativePath`またはnull | Lexical normalizationが安全で、targetが所有Source内に残る場合だけ設定 |
| `boundaryStatus` | `inside \| outside \| invalid \| unknown` | Readを許可しない |
| `resolutionStatus` | `not-followed \| independently-admitted \| missing \| rejected` | Relationship自体はcontentを展開しない |
| `evidenceAssessments` | `EvidenceAssessment[]` | この`ruleId`と全`behaviorRefs`/`strategyRefs` memberごとに正確に1件。Partial、unknown、conflict、lifecycle qualifierをrecord別に維持 |
| `behaviorRefs` | sort済みbehavior ID[] | Edgeの説明を許すsurface-specific upstream statement |
| `strategyRefs` | sort済みstrategy ID[] | Edgeについて考慮したcomposition/selection strategy |
| `sourceRefs` | sort済みsource ID[] | Relationship rule、behavior、strategy recordからの正確なevidence union |
| `applicability` | `ApplicabilityAssessment` | Edge固有context/tool/trust/selection fact。Targetのread authorityにはしない |

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
keyを付ける。Authored field valueを含めず、serializeしない。Deduplication keyは`fromFileId`、
`fromRecognitionId`、`fromProvenanceId`、`ruleId`、`kind`、origin key、target identityである。Target
identityは利用可能ならnormalized target、そうでなければ`authored`のexact authored targetのprocess-keyed digestまたは
`documented-default`の固定default IDとし、digest/default IDをmemory外やlogへ出さない。Extractorは起点provenanceのstable array key、recognition tool/kind、
relationship `ruleId`/kind、declaration-field identifier、source occurrenceの順でemitし、opaque IDをsortに
使わない。Semantic targetが同じでも別authored source occurrenceは別edgeのまま保つ。Documented defaultは
`authoredTarget: null`とし、UIはdocumented defaultとlabelして`normalizedTarget`を表示してよいが、
source-authored textとは表示しない。
1つのdeclared fieldがmetadata、relationship、derivationを駆動する場合、3 projectionはその1 occurrence/rangeを
参照し、distinct origin occurrence間のoverlapだけがextraction failureになる。
Opaque IDはorderに使わない。Relationshipの構築または保持中にtargetを開かず、独立したcandidate admissionだけがreadを認可できる。

### Diagnostic

| Field | Type | Rule |
|---|---|---|
| `diagnosticId` | opaque ASCII string | Server生成でgeneration/session内unique |
| `code` | stable closed code | Objective testとdocumentation linkに利用可能。Registryが各codeのscope、severity、localized message/next-step textを固定するため、いずれもserializeしない |
| `severity` | `info \| warning \| error` | `code`によりregistry固定でserializeしない。Vendor validationを意味しない |
| `scope` | `file \| source \| session` | `code`によりregistry固定でserializeしない。必須attachment discriminator。Generation scopeかsession-lifecycleかというlifetimeとは独立 |
| `sourceId` | optional opaque ASCII ID | `file`と`source`で必須、`session`で禁止 |
| `fileId` | optional opaque ASCII ID | `file`だけで必須、`source`と`session`で禁止 |
| `sourceRelativePath` | optionalなSource-relative Path | `file`だけで必須で、`sourceId`内の当該file pathと一致し、`source`と`session`で禁止 |
| `lifecycleOwnerKey` | `repository \| global:<tool> \| published-source:<sourceId> \| null` | Internalでserializeしない。全out-of-generation lifecycle Diagnosticでは必須non-null、generation-owned candidateではnullで、1つのpublic owner referenceと照合する |

Legalなattachment shapeは正確に次の3つだけである。`file`はnon-nullの`sourceId`、`fileId`、
`sourceRelativePath`を持つ。`source`はnon-nullの`sourceId`とnullのfile/path fieldを持つ。`session`は3つの
location fieldがすべてnullとなる。それ以外の組合せを持つDTOはinvalidである。Scopeはlifetimeと直交し、例えば
generation-wide deterministic assembly-outcome Diagnosticをsession scopeに、fatal rescan lifecycle recordをsource scopeにできる。

Closed diagnostic-code registryは各codeのseverityとattachment scopeを固定し、`code`をkeyとするclientの
二言語catalogが同等の英語・日本語messageと実用的な次actionを全errorへ供給する。
`lifecycleOwnerKey`は1 lifecycle instanceの識別子で、serializeしない。
Candidateはcode、`lifecycleOwnerKey`、source/file ID、Source-relative Pathでdeduplicateし、
固定phase、lifecycle-owner semantic order（Repository、固定Global tool順、既存public Source順）、scope、Source-relative Path、rule/code、
emitter occurrence順でemitする。Opaque Source ID自体をsort orderに使わない。

Scan candidateは1つのcommit済みgenerationに属する。Commit不能なfatal scan attemptを含むout-of-generation lifecycle
candidateはsessionだけに属し、generation/Source ID listへ入れない。Malformed request、その他client起因
API errorはresponseで返すがdiagnosticとして保持しない。

Sessionはlifecycle owner keyごとにcurrentなactionable failureを最大1件保持する。Automatic Repository admission/initial-scanの
deterministic failureは`repositoryFailureDiagnosticId`から参照する。最初のexplicit rescanはrunning中そのreferenceを保持し、terminal
successならclear、deterministicまたはthrow/reject terminal failureならatomicにremoveして上記`published-source:<sourceId>` stale ownerを
作る。後続explicit outcomeは`StaleSourceFailure`だけを使う。Unpublished Global toolは`global:<tool>` control recordと`toolFailures`を使い、Source publication
成功またはGlobal disableでclearする。Published Sourceのexplicit-rescan failureは`published-source:<sourceId>`を使い、そのSourceの
`StaleSourceFailure`だけから参照する。後続terminal failureは置換し、refresh成功またはSource removalでclearする。無関係なowner
commitは保持する。全non-null public referenceは`sessionDiagnosticIds`のunique member 1件へresolveし、各lifecycle Diagnosticには
public owner referenceが正確に1つある。Diagnosticを意図的にtruncateしたりaggregate suppression recordへ
置換したりしない。予期しないthrow/rejectされたoperationはこのregistryへ入れず、domainを越えてpropagateし、request所有の場合は
ordinary errorとして表面化し、Diagnosticにはならない。決定的Diagnostic自体のretain/serializeがthrowまたはrejectした場合、その予期しないfailureも同じruleに従い、
attempt由来のDiagnosticまたはgenerationを一切publishしない。

Inspection-traversal subsetは正確に次のとおりとする。

| Code | Scope | Severity |
|---|---|---|
| `root-unreadable` | `source` | `error` |
| `file-unreadable` | `file` | `error` |
| `file-content-binary` | `file` | `warning` |
| `recognition-parse-failed` | `file` | `warning` |

このsubsetでその他のcodeはinvalidとする。`root-unreadable`は、存在しないかdirectoryとしてreadできないSource rootを
記録する。Published Source（Repository Source、またはrescan時のpublished Global Source）ではその`sourceId`を持つsource
scopeとし、unpublished Global toolではout-of-generationでpathlessなsession-scoped lifecycle recordとして
`lifecycleOwnerKey`を`global:<tool>`、唯一のpublic ownerを`GlobalControlView.toolFailures`とする。Diagnostic自体は
Source/pathを捏造しない。`file-unreadable`は、discoveryとreadの間に消えたfileやtargetがmissing/unreadableな
symbolic linkを含むper-file read failureを記録する（FR-024）。`file-content-binary`はNUL byteによるdiagnostic-only
outcomeを記録する（FR-025）。`recognition-parse-failed`は、完全なreadable sourceを表示・comparison可能なまま保ち、
影響を受けたrecognitionの派生metadata/relationshipだけを省くFR-028のparser/extractor failureを記録する。これら3つの
file-confined outcomeのそれぞれが、それ以外はpublish可能なgenerationを`partial`にする。File rowは
coherentなalready admitted candidate tupleを必須とする。どのrowもOS error text、outside path、filesystem handle/descriptor、source byteを
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
従う。`isAbsolute`またはstate/presentation constructionのthrowはpreview session API boundaryへpropagateし、previewを作らない。
どのstepもstringをnormalizeせず、separatorを変更せず、filesystemをcallせず、別rootを黙って選ばない。

### BrowserState

このstateはauthoritativeではなく永続化しない。

- `FilterState`: 選択したsource/tool/kindとSource-relative Path query。
- `ClientDataState`: Monotonicな`clientDataEpoch`、sequenceごとのcurrent generation（採用済みsnapshotの
  `repositoryGeneration`とnullableな`globalGeneration`）、session/detail requestごとのrequest tokenを
  保持する。Session responseはrequest tokenがcurrent epochに属する場合だけadoptする。Sequenceのgenerationが
  current未満なら無視する。あるsequenceのgreater generationをadoptする前に、そのsequenceのfileにboundされた
  detail/comparison requestをabortし、そのsequenceのdetail/editor/comparison objectをdisposeしてから、そのsequenceの
  inventory entryだけを置換する。他sequenceのstate、request、modelには触れない（FR-030）。Equal-generation responseは
  exactなstill-current request tokenだけを受理する。Detail requestは所属sequenceのcurrent generationで
  `{ clientDataEpoch, generation, fileId }`をcaptureし、callback時にもepochとそのsequenceのgenerationがcurrent stateと一致し、その
  readable `fileId`がinventoryに残る場合だけresponseをadoptする。全central invalidation/purgeが同じepochをincrementするため、
  response deliveryが既にqueue済みでもlate callbackはno-opになる。
- `ComparisonSelection`: Readableな`fileId`を0または正確に2つ持ち、それぞれ所属sequenceのcurrentなcommit済み
  generationに属する。Cross-source comparisonは常に各sourceの最後にcommit済みstateを比較する。Literal comparisonは
  Monacoで両方の完全な`sourceText`を比較し、Vueで返却済みの完全な`declaredMetadata`値をsource textへ
  serializeせず比較する。Credential-like stringやenvironment referenceを含むliteralな差を表示する。
- `EditorModelState`: Opaqueなin-memory URIと完全なauthored `sourceText`を持つgeneration-scoped Monaco model。
  所有editor、subscription、全modelはroute close、selection replacement、file removal、source disable、
  所属sequenceのgeneration変更時に個別にdisposeする。
- `SensitiveContentNoticeState`: 固定warning objectとcurrent authorized browser-session memory lifetime用の
  `acknowledged` boolean。完全なsource text、declared authored metadata、authored relationship target、comparisonの両sideは
  機密値を含み得るため、UIは最初の`FileDetail` requestまたはcomparison構築前にacknowledgementを要求する。一度acknowledge
  すれば、そのSPA documentの全authored-value surfaceを対象とし、document reloadまたはbrowser-document closeで失う。
  このclient-only stateはAPIへ送信せずread authorityを与えず、中央full-session purge pathで破棄する。Route close、selection
  replacement、file/Source removal、generation changeは対象scopeのmodelを個別にdisposeする。これらは中央
  client-data purgeではなく、読み込み済みdocumentのacknowledgementを維持してよい。
- Global disableは代わりに下記central full-session purgeを使う。Global-disable actionはrequest送信前に全inspection contentをlocal purgeする。Session responseでより大きい`globalContentEpoch`または
  non-null `globalDisableInProgress`を観測した場合もrender前にidempotent purgeを繰り返す。Clientは`clientDataEpoch`をincrementし、inspection dataを
  返し得る全requestをabortし、全editor/model/comparisonをdisposeし、warning/filter stateをclearして、全Source/generation/file/detail/authored
  metadata/relationship/Diagnostic DTO/DOM textをremoveする。Disableへのjoin/retryに必要なcontrol/error projectionだけを保持できる。
  Accepted barrier failureではpurge済みcontentをrestoreせず、terminal disable successまたはprocess restart後のnew full snapshotだけからcontentを取得する。
  Barrier acceptance前にrequestがfailした場合、またはtrue no-opの場合、fresh session snapshotのfenceはnullであり、purge済みclientはnew full snapshotを直ちにfetchできる。
- `RecoveryViewState`: Global-disable action、liveness epoch/fence observation、hidden/page-lifecycle purgeを含む任意のcentral purge後、
  fresh session snapshotをfetchした場合に作る。採用した
  `sessionId`、fresh `globalContentEpoch`/`globalControl`/`globalEnableInProgress`/`globalDisableInProgress` projection、presentな
  `globalControl.toolFailures`が参照するexact pathless session Diagnostic、presentなfailed `globalControl.batchStatus`または
  disable projectionが保持するfailed requestのerror、任意のnewly verified frozen previewだけを保持する。
  `globalDisableInProgress`がnullでnormal full snapshotをfetch可能な場合だけ**Resume inspection** actionを提示する。Controlまたは任意enableがactiveならimmediate disable、disable drain中ならjoin/wait、disable
  failedならretry-disableを提示する。Global retryはpreview検証済み、`globalEnableInProgress` null、`pendingTools` empty、`retryableTools` non-emptyの場合だけ提示する。
  Resumeはsessionを再取得して返された`sessionId`が採用済みliveness
  baselineと一致することを要求し、default filterのfresh inventory-summary viewをatomicに構築する。以前のdetail、
  comparison、editor、warning acknowledgement、authored sourceは復元せず、後でdetail/comparisonを開く場合はnew
  acknowledgementを要求する。そのfetchがfailするか返された`sessionId`が一致しない場合は、表示済みprocess-lifetime URLを開き直す
  session-lost next stepだけを残す。
- `SessionLivenessState`: 期待`sessionId`、last observed `globalContentEpoch`、同じ`clientDataEpoch`を保持する。
  Initial page load、visible/focused pageへの復帰、明示的Resume、fresh session adoptionの場合だけliveness routeを呼び、
  in-flight requestは最大1件とする。このsingle-flight ruleはstale responseを拒否するためstate adoptionをserializeする
  functional coordination invariantであり、resource admissionまたはvalidation ceilingではない。Polling interval、request timeout、
  retry timer、memory leaseを定義せず、request settlementはbrowser/network/runtimeが所有する。Network/runtime rejectionまたは
  session-ID mismatchでは、session-ended viewをrenderする前に中央purgeを同期実行する。
  全Monaco editor/model/worker/subscriptionをdisposeし、comparison/notice/filter stateをclearし、全source/detail/metadata/
  diagnostic DTOとDOM textを除去してpending requestをabortし、epochをincrementして旧epochで開始したresponseを無視する。
  `visibilitychange`でhiddenになった時点、`pagehide`、
  `beforeunload`でも同じpurgeを直ちに実行し、background timerによるretentionを避ける。Visibleへ戻る場合はfreshな
  session snapshotを要求し、source/detailまたはcomparisonを後で開く場合だけnew warning acknowledgementを要求する。
  Successful liveness bodyは正確に`{ sessionId, globalContentEpoch, globalDisableInProgress }`とし、3値すべてを最終publish時の1つの
  current coordinator-lock snapshotから取得する。Fence nullを要求せず、別tabがdisableを観測できるようcurrent non-null projectionも返す。Current baselineのconfirm/renderより前にgreater epochまたは
  non-null disable projectionを観測した場合、同じfull purgeを実行してgreater epochをadoptし、control-only recoveryへ入る。Older epochはrejectし、
  equal epochかつnull projectionだけがordinary baseline confirmationとなる。したがって別tabのdisableは次のlifecycle-triggered liveness checkまたは
  別のsession responseで観測する。Continuously visibleなidle page上のprocess lossにはproduct定義のwall-clock検出保証を設けず、
  次のobservable lifecycleまたはrequest outcomeで扱う。
  Hidden-page purge後、clientはfresh session snapshotをfetchし、purge済みIDを保持・比較せず返された`sessionId`をnew liveness baselineとして採用する。
  `globalContentEpoch`、`globalControl`、`globalEnableInProgress`、`globalDisableInProgress`、`globalControl.toolFailures`が参照するexact pathless session Diagnostic、
  presentなfailed `globalControl.batchStatus`またはdisable projectionが保持するfailed requestのerror、
  任意のnewly verified frozen previewだけから`RecoveryViewState`を作り、その他の全fieldをinventory/detail/comparison/acknowledgement stateへ
  復元せず破棄する。`globalControl`または`globalEnableInProgress`がpreviewを識別する場合はmatching
  frozen previewを取得してからapplicable controlを再構築する。
  Fetch failureまたはsession-ID mismatchではsession-ended viewを維持する。Service worker、browser storage、HTTP cacheへcontentを
  永続化しない。Applicationが保証するのはlive referenceの除去であり、JavaScript制御外browser-process memoryの物理的
  zeroizationではない。

## Release usability-study evidence

これらのrecordはtest/release evidenceであり、product/API DTOではない。Normative ownerは
[Usability-study evidence contract](contracts/usability-study-evidence.ja.md)である。Unknown、
missing、extra、non-canonical fieldは無視せず、そのcontractをfailさせる。

### StudyInputBundle

`StudyInputBundle`はSC-001/SC-006で使うclosedかつcandidate-independentなinput setであり、
repository layoutを次で固定する。

| Field | Exact value | Rule |
|---|---|---|
| `manifestPath` | `tests/usability/sc001-sc006-study-inputs.json` | Canonical `StudyInputManifest` byte |
| `manifestDigestPath` | `tests/usability/sc001-sc006-study-inputs.sha256` | Exact manifest byteのlowercase SHA-256とLF 1つ |
| `bundleRoot` | `tests/usability/sc001-sc006-study-inputs/` | Closedなdirect-child root。Subdirectory、symlink、その他memberは禁止 |
| `memberPaths` | 下記exact 16 path | Recursively observeしたregular-file setおよびmanifestの`inputs[].path` setと一致 |

`bundleRoot`直下のexact memberは次のとおり。

```text
guidance.md
guidance.ja.md
task-prompt-sc001.md
task-prompt-sc001.ja.md
task-prompt-sc006.md
task-prompt-sc006.ja.md
evaluation-fixture.json
evaluation-fixture.ja.json
prepared-state.json
prepared-state.ja.json
response-form.json
response-form.ja.json
ground-truth.json
ground-truth.ja.json
scoring-rubric.json
scoring-rubric.ja.json
```

各`prepared-state*.json`はfresh `studyBrowserProfile` object 1件を含み、complete exact property orderを
`profileId`, `playwrightVersion`, `browserEngine`, `browserRevision`, `browserVersion`,
`browserDistribution`, `operatingSystem`, `architecture`, `nodeVersion`, `headed`, `contextPersistence`, `extensionSet`,
`proxyConfigurationScope`, `proxyAuthenticationMode`とする。Valueは順にliteral
`playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`, `1.61.1`, `chromium`,
`1228`, `149.0.7827.55`, `chrome-for-testing`, `ubuntu-24.04`, `x64`, `24.18.0`, literal `true`,
`fresh-nonpersistent`, empty array, `browser-context-only`, `single-407-basic`とする。これはPlaywright 1.61.1
install revision `1228`、browser version `149.0.7827.55`のheaded Chrome for Testing、Ubuntu 24.04 x64、Node 24.18.0、empty-extension fresh nonpersistent context、
browser-context-only proxyを意味する。Verificationから出せるのはfixed profile ID/pass-fail statusと必須input/
evidence digestだけで、executable/profile path、revision/config byte、store contentはruntime-onlyとする。

各英日pairは別々のID、path、byte、digestを持ち、semantic equivalentである。Manifestと
companionは`bundleRoot`のmemberではなくsiblingとする。Candidate tarballとそのdigestも
このcandidate-independent bundleの外に置く。

#### ParticipantStudyDistribution

20件の各`ParticipantStudyDistribution` rootはfreshなclosed directoryであり、complete direct-child setは
directory `study-inputs/`と`repository/`のexact 2件とする。

| Direct child | Complete contents |
|---|---|
| `study-inputs/` | `StudyInputBundle`のexact 16 direct-child nameとbyte-for-byte copyだけ。Nested directory/他memberなし |
| `repository/` | Descriptorの`outputs[].path` regular fileと、そのpathが示すproper directory-prefix setだけ |

Candidateとequipment/runtimeは別にbindし、distribution memberにしない。Stored `outputs[].path`はすべて
`repository/` directory相対でそのprefixを含めず、`study-inputs/`をaddressできない。Top-level file、
third directory、その他extra member、sidecar、cross-tree namespace collision、symlink/non-regular member、
tree内、tree間、distribution間のhard-link/reused file identity、normalized/case-folded/canonical-path alias、
root escapeがあれば20件すべてをinvalidにする。

#### Participant fixture repository descriptor

Fixed member `evaluation-fixture.json`と`evaluation-fixture.ja.json`は、participantへ配布する
actual Repository treeの英日`ParticipantFixtureRepositoryDescriptor`である。Looseなfixture labelや
unclosed generatorへの参照ではない。各descriptorはfresh objectであり、exact root-property orderを
`schemaVersion`, `descriptorLocale`, `distributionIds`, `materializer`, `verifier`,
`captureHarness`, `outputs`とする。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown versionはfail closed |
| `descriptorLocale` | `en \| ja` | `evaluation-fixture.json`だけが`en`、companionだけが`ja`。それ以外の全operational fieldはsemanticかつbyte-for-byteにequal |
| `distributionIds` | exact fixed string array | Ascending orderの`participant-01`から`participant-20`だけ。Study slotでありparticipant identity/personal dataではない |
| `materializer` | `RepositoryArtifactBinding` | Repository所有のexact `scripts/build-usability-study-inputs.mjs` byte |
| `verifier` | `RepositoryArtifactBinding` | Repository所有のexact `scripts/verify-usability-study-evidence.mjs` byte |
| `captureHarness` | `RepositoryArtifactBinding` | Repository所有のexact `scripts/run-usability-study-capture.mjs` byte |
| `outputs` | nonempty `ParticipantFixtureOutput[]` | Uniqueで`path`のraw UTF-16 code unit順にsort。両descriptorで同一としcomplete derived regular-file setを定義 |

各`RepositoryArtifactBinding`はexact order `path`, `sha256`でfreshに構築する。`path`は上記の
対応するexact repository-relative literalで、repository所有のnon-symlink regular fileを指定する。
`sha256`はそのfileのexact raw byteに対する64 lowercase hexadecimal characterとする。3 bindingすべてを
必須とし、installed、downloaded、PATH-resolved、network-fetched、digest-mismatchedな代替物は
distributionのmaterialize/verifyに使用できない。

各`ParticipantFixtureOutput`はexact order `path`, `contentEncoding`, `bytesBase64`, `sha256`で
freshに構築する。

| Field | Type | Rule |
|---|---|---|
| `path` | Prefixを含めず保存するnormalized `repository/`-relative path | Nonempty unique `/`-separated path。Absolute、backslash、empty、`.`/`..`、percent-encoded、NUL spellingを禁止し、`study-inputs/`をaddressできず、raw UTF-16 orderをauthorityとする |
| `contentEncoding` | `utf-8 \| binary` | `utf-8`はrepresented byteのstrict UTF-8 decodeを要求する。いずれもnormalization/transcodingを許可しない |
| `bytesBase64` | canonical padded RFC 4648 base64 | 全distributionへ書くexact byteへround-tripする。Parse-equivalent textでは不十分 |
| `sha256` | 64 lowercase hexadecimal character | Decoded `bytesBase64`のexact byteに対するSHA-256で、materialize済みraw file byteと一致 |

両descriptorは`distributionIds`、artifact path/digest、output path、encoding、exact represented byte、
output digestを同一にし、`descriptorLocale`だけが異なる。Complete derived directory setは
`outputs[].path`が示すproper directory-prefix setだけで、complete derived file setは正確に
`outputs[].path`とする。Generated sidecar、ignored file、implicit default、unmanifested derived byteは存在しない。

Exact `pnpm run study:evidence:inputs -- materialize`は最初にbound script 3件すべてのdigestを
verifyし、そのbound materializerだけを使ってfixed distribution ID 20件それぞれに両fixed namespaceを含むfresh closed
distributionを作成する。Exact `pnpm run study:evidence:verify -- inputs`は3 script bindingと両
descriptorを独立verifyし、actual distributionをread-onlyでenumerate/hashする。Materializerが生成した
file list/digestはtrustしない。Missing/extra file/directory、symlink、non-regular output、hard-link/file-identity
alias、normalized/case-folded/canonical-path alias、encoding/base64 mismatch、byte/digest drift、unequal
distribution、script drift、selected `repository/` root外outputは20-distribution set全体をfailさせる。
Clean materializationとindependent recomputationが両方passするまでparticipant enrollment/evidence captureを開始できない。

### StudyEvidenceWorkspace

Executable protocolにはoperational environment binding 5件がある。Required bindingはそのcommandでexact 1回
readする。Raw valueはevidence field、log、retained byte、validation-record value、evidence digest/identity
commitmentのpreimage、ID、outputにしない。唯一のhash例外は後述のexact transient runtime-bootstrap、browser-proxy-
binding、authenticated-control-message HMACである。

| Binding | Rule |
|---|---|
| `INSPECTOR_STUDY_WORK_ROOT` | `materialize`時にstudy setupが提供するabsolute、existing、emptyなordinary-local directory。Active-platformのexplicit UNC/server-share/device/network spellingはI/O前にfailureとし、`finalize`までsame lexical value、canonical location、type、stable root identityを要求 |
| `INSPECTOR_STUDY_CONTROL_ENDPOINT` | Study setupが提供するexternal OS-local endpoint。Work/distribution root外のabsolute Unix-domain socket locationまたはlocal Windows named-pipe nameだけを許可し、TCP、IP、URL、remote-pipe、network、work-root-sidecar spellingをreject |
| `INSPECTOR_STUDY_CONTROL_TOKEN` | 256 random bitをencodeするexact 43 unpadded base64url character。External control endpointのchallenge authenticationだけに使用 |
| `INSPECTOR_STUDY_CANDIDATE_TARBALL` | Work root/全distribution外のexact non-symlink regular candidate fileで`nlink === 1`。`start`から`finalize`だけでrequired/readとし、stable identity 1件を保持し全verifier phase/finalizationで独立rehash |
| `INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY` | Study setupが提供するexact runtime `127.0.0.1:<nonzero-port>` authority。Capture live中だけrequiredで、`study-browser` adapterが`start`時にbindし`stop`時にclose。Hostname、IPv6、zero port、URL syntax、credential、path、query、fragmentは禁止 |

Phase matrixはclosedとする。Requiredはmissing/malformed inputをcommandのfilesystem operation前に
failさせること、forbiddenはambient environmentに存在してもcommandがbindingをreadもrequireもしない
ことを意味する。

| Exact command | Work root | Control endpoint | Control token | Candidate | Browser proxy authority |
|---|---:|---:|---:|---:|---:|
| `study:evidence:inputs -- materialize` | required | required | required | forbidden | forbidden |
| `study:evidence:verify -- inputs` | required | required | required | forbidden | forbidden |
| `study:evidence:capture -- start` | required | required | required | required | required |
| `study:evidence:capture -- checkpoint` | required | required | required | required | required |
| `study:evidence:verify -- checkpoint` | required | required | required | required | required |
| `study:evidence:verify -- continuation` | required | required | required | required | required |
| `study:evidence:capture -- stop` | required | required | required | required | required |
| `study:evidence:verify -- finalize` | required | required | required | required | forbidden |

Inputs executableはcanonical `materialize`だけ、captureはexternalにcanonical `start`,`checkpoint`,`stop`だけ、verifierは
`inputs`,`checkpoint`,`continuation`,`finalize`だけをacceptする。Internal modeはcurrent-parent-sponsored inherited
channelだけで利用でき、command aliasではない。Wrong entrypoint/spelling/phase/extra argumentはphase work前にfailする。

Work rootのretained layoutはclosedかつlifecycle-additiveとする。

```text
distributions/participant-01/ ... participant-20/
capture/streams/product-instrumentation.ndjson
capture/streams/inspector-server-ledger.ndjson
capture/streams/study-browser.ndjson
capture/study-capture-handoff.json
capture/study-capture-handoff.sha256
capture/study-continuity-witness.json
capture/study-continuity-witness.sha256
capture/study-capture-seal.json
capture/study-capture-seal.sha256
```

各distributionは上記exact two-directory layoutを持つ。各stream ledgerはsequenceごとにcompact canonical envelope line、その直後に
compact canonical safe-payload lineを置く。Handoff pairはcheckpoint verification中だけ、continuity-witness pair、
次にseal pairはsuccessful finalization後だけ現れる。他のretained artifact、control file、work root配下のendpoint、
retention handle、sidecarを許可しない。

Exact materializationはbound capture scriptのrepository path、raw-byte digest、non-link regular-file type、
`nlink === 1`、stable identityをverifyし、そのscriptのinternal supervisorをinherited anonymous IPC channelで
launchする。Ready後にmaterializerがexact `StudySupervisorRuntimeBootstrap`を送り、そのACK後だけempty rootを変更できる。
Authenticated lifecycle closeはそのedgeをdetachするがsupervisorをliveのまま残す。Supervisorはbootstrapだけからexternal local
endpointをbindし、materializationからfinalizationまで存続する。Initial work-root identity、start-time candidate identity/digest、
checkpoint snapshot、handoff anchor、direct OS-observed adapter/orchestrator exit、accepted adapter-OS-observed watchdog exit
attestation、accepted moderator-OS-observed reviewer exit attestationをruntimeで保持できる唯一のownerとする。`stop`はwatchdog/
capture child 6件とorchestrator 2件をterminateするがsupervisorをretainする。
`finalize`はcomplete continuity stateをauthenticate/verifyし、supervisorにexternal endpointをclose/removeさせ、
new connectionが不可能なことを独立に証明し、その後だけwitness pair、seal pairの順にwriteする。TCP listener、network
request、remote pipe、work-root socket/control artifact、PID file、lock file、runtime filesystem sidecarは禁止する。

Authorized materialize caller/study setupはexact 4 distinct bidirectional nonrecording external terminal-equipment handleを
child-visible descriptor `6` participant、`7` moderator、`8` reviewer-one、`9` reviewer-twoとしてmaterializerへ渡す。
Materializerはterminal type、pairwise-distinct stable equipment identity、echo/history/recording/transcript disabledをverifyし、
same slotをsupervisorへinheritしruntime-bootstrap ACK後だけown copyをcloseする。Closed external-equipment exceptionであり、
inherited IPCでもenv/argv/path/evidence authorityでもない。Missing/alias/reorder/extra/echo/recordingはmutation前にfailし、
bootstrap failure/abort/crashで全copy/pending bufferをclose/wipeする。

Node.jsは通常のlexical pathがpre-mounted/mapped network filesystemにbackされていないことを証明できない。このcaseは既存FR-022
platform/environment limitationのままとし、proven localとは記録しないが、観測可能なidentity、containment、alias、drift checkを緩和しない。

#### Study runtime bindingとidentity commitment

`StudyRuntimeIdentityTuple`はin-memory-onlyなfresh objectであり、exact property orderを
`platformClass`, `objectType`, `device`, `inode`, `typeBits`とする。`platformClass`は`posix | windows`、
`objectType`は`directory | regular-file`、残る3値は1件のBigInt `lstat` snapshotから得るcanonical
nonnegative decimal stringとする。Tupleはpath、timestamp、byte count、digest、PID、OS handleを含まない。
各commandはfresh tupleを取得し、supervisorが保存したinitial tupleおよび別途requiredなlexical/canonical valueと比較する。

Runtime-only `StudyWorkRootBinding`のexact orderは`workRootLexicalValue`, `workRootCanonicalValue`,
`workRootIdentity`, `studyInputManifestSha256`とする。Runtime-only `StudyFullBinding`のexact orderは
`workRootLexicalValue`, `workRootCanonicalValue`, `workRootIdentity`, `candidateLexicalValue`,
`candidateCanonicalValue`, `candidateIdentity`, `candidateSha256`, `studyInputManifestSha256`とする。
Raw work-root valueはmaterializer input、sole `runtime-bootstrap` frame、runtime control、supervisor dedicated memoryだけを
crossできる。Raw candidate valueはauthorized post-input/pre-start candidate-store provisioner transient input、authorized
start-or-later caller input、runtime control、supervisor dedicated memoryだけをcrossでき、runtime-bootstrap/provisioned storeへ
入れない。いずれもcapture-evidence IPCをcrossせず、commit、retain、log、returnしない。その
唯一のhash利用はexact permitted frame/requestのnon-retained authentication tagであり、identity commitment/evidence digestには
入れない。`verify-inputs`は
`StudyWorkRootBinding`だけをacceptし、start-through-finalize commandは`StudyFullBinding`をacceptするため、
materialization/input verificationがcandidate stateを誤ってinspectできない。

Capture live中の`StudyLiveBinding`はexact order `runtimeBinding`, `browserProxyAuthority`とし、
`runtimeBinding`はexact `StudyFullBinding`、authorityはcurrent exact `127.0.0.1:<nonzero-port>` valueとする。
これはruntime-onlyでraw path valueと同じnon-retention/non-hashing ruleに従う。Startからstopはこれをrequiredとし、
finalizeは`StudyFullBinding`だけをacceptしてstop後のproxy bindingをreadしない。

Raw proxy authorityのexact routeは`authorized start-through-stop caller transient input -> authenticated runtime-control
StudyLiveBinding -> supervisor dedicated memory -> exact one-use browser-proxy-binding -> study-browser-adapter dedicated
memory -> attempt-local DevTools control request/browser context`だけとする。Caller/transfer/control bufferをresponse/ACK
直後にwipeし、supervisor/adapterのdedicated run-level copyはstopまで、attempt request/auth cacheはnormal close/abort/
crash/terminalizationまでとする。Runtime-bootstrap、Chromium env/argv/profile、evidence、別holder/hash/preimage/retained
artifactへ入れず、browser contextだけをequipment-side raw exceptionとする。Complete allowed secret/raw HMAC preimageは
exact runtime-bootstrap、browser-proxy-binding、authenticated runtime-control request、inherited-IPC frame、domain-separated
identity commitment、proxy-marker-installだけとし、他digest/commitment/tag/IDへ入れない。

`StudySupervisorRuntimeBootstrap`はruntime-onlyで、exact root orderを`schemaVersion`, `workRootLexicalValue`,
`workRootCanonicalValue`, `workRootIdentity`, `controlEndpoint`, `controlToken`とする。Versionはliteral `1`、identityはfresh current
exact `StudyRuntimeIdentityTuple`、endpointはexact absent local authority、tokenはstrict decodeでfresh 32 byteとなるcanonical
43-character unpadded base64url textとする。Ready後/root mutation前にmaterializer→supervisorだけでexact 1回送る。Supervisorは
root value/current identity、endpoint authority/absence、tokenを独立revalidateし、stable session/continuity stateを作り、endpointを
bindしてからACKする。ACK後にtransfer bufferをwipeし、failureではsupervisor/endpointをteardownしてretained mutationを許可しない。

`StudyBrowserProxyRuntimeBinding`はruntime-onlyで、exact root orderを`schemaVersion`, `studyRunId`,
`browserProxyAuthority`とする。Versionはliteral `1`、runはcurrent、authorityはexact `127.0.0.1:<1..65535>`とする。Adapter/
watchdog registration後にsupervisorがstudy-browser-adapterだけへexact 1回送り、adapterがvalidate/bind/ACKした後だけstart control/
capture-startを許可する。Transfer bufferをwipeし、dedicated copyはstopまでだけ存続させ、checkpoint/continuation authorityは
supervisor copyとexact一致させる。

`StudyStreamWriterRuntimeBinding`はpath-free runtime-onlyで、exact root orderは`schemaVersion`,
`controlSessionId`, `studyRunId`, `streamRole`, `captureComponentRunId`, `captureInstanceId`,
`captureProcessRunId`, `writerFileIdentity`, `writerLinkCount`, `writerOpenMode`とする。Version `1`、session/run/
stream current、capture IDはmatching adapter ready/self-registration、`writerFileIdentity`はregular stream fileのexact
path-free `StudyRuntimeIdentityTuple`、link count literal `1`、mode literal `append-only`とし、path/descriptor/handle/
authority/retained valueを含めない。

Per streamでadapter ready+self-registration→supervisor ACK→one-use writer binding→adapter fd5/ID verify+byte-identical
relay→watchdog fd5 stable identity/`nlink === 1`/append-only verify+binding ACK→watchdog self-registration→adapter ACK/
forward→supervisor ACKの順とする。Adapter upstream binding ACKはdownstream ACK後だけで、adapter/supervisor fd5 closeは
それぞれrelay/upstream registration ACK後とする。Browser-proxy bindingはbrowser両registration supervisor ACK後に送り、
adapter ACKを必須とする。全3 binding、全6 registration、proxy ACK前にstream start/capture-start/start completionを
禁止する。

Supervisor作成時にfresh 256-bit `continuityKey`をsupervisor memoryだけに保持する。64-lowercase-hexの
`workRootIdentityCommitment`/`candidateIdentityCommitment`はexact canonical identity tupleと
`controlSessionId`に対するdomain-separated HMAC-SHA-256とし、preimageにlexical/canonical pathを含めない。
Work-root commitmentはmaterialization、candidate commitmentはstartでfixedにする。Raw token、authentication key
material、continuity key、identity tuple、raw binding、commitmentへのmappingはretain/emissionせず、finalizationが
supervisorをcloseするときzero/dropする。

`StudyOpaqueId`を全opaque study identifierの唯一のgrammarとする。正確に43 ASCII characterで
`[A-Za-z0-9_-]{43}`とmatchし、`=` paddingを持たず、strict base64url decode結果がexact 32 byteで、canonical
unpadded re-encodingが入力とbyte-for-byte一致しなければならない。各valueはcryptographically randomなfresh 32 byteから
生成し、新しくallocateするsemantic IDをcurrent run内の他allocated IDとdistinctにする。Fresh cryptographic
generationがcross-run non-reuse/unlinkabilityを提供するが、verifierがexact uniquenessをcheckするのはcurrent run内
だけであり、retained cross-run registryを持たない。Schemaが同じsemantic
IDのreferenceを要求する場合はそのexact valueをrepeatし、new allocationとして扱わない。このgrammarを`requestId`、`controlSessionId`、
`challengeId`、`studyRunId`、`checkpointRequestId`、`eventId`、`correlationId`、`browserAttemptId`、`subjectId`、
`preReadinessProbeId`、`bootstrapEventId`、`readinessEventId`、`inspectorProcessId`、`componentRunId`、全watchdog/capture instance/process-run IDへ適用する。Closed unionがliteral
`not-applicable`を許すfieldでは、そのliteralをseparate non-ID variantとして扱う。Control tokenも同じcanonical
32-byte/43-character encoding grammarを使い、全HMAC-SHA-256 `authenticationTag`はexact 32 output byteのcanonical
unpadded base64url encodingとする。Wrong length、padding、non-alphabet character、noncanonical encoding、wrong decoded
length、duplicate allocation、cross-purpose reuseはfail closedにする。

#### Study control protocol

Supervisorはfresh opaque `controlSessionId`を1件生成する。External controlはOS-authenticated local
Unix-domain socketまたはlocal Windows named pipeだけを使う。全commandはexact hello/challenge exchangeを行う。
`StudyControlRequest`のexact root orderは`schemaVersion`, `requestId`, `command`, `controlSessionId`,
`challengeId`, `authenticationTag`, `payload`、`StudyControlResponse`は`schemaVersion`, `requestId`,
`command`, `controlSessionId`, `challengeId`, `ok`, `errorCode`, `authenticationTag`, `payload`とする。
Versionはliteral `1`。Unknown、missing、extra、
reordered、noncanonical、oversized、truncated、trailing dataはfail closedにする。

Fixed command enumは`hello | verify-inputs | start | checkpoint | read-checkpoint |
anchor-handoff | verify-continuation | stop | finalize-prepare | finalize-commit | abort |
register-pre-readiness-probe | buffer-pre-readiness-product-event | register-product-probe |
submit-product-event | close-product-probe`とする。各`requestId`はfresh run-local
43-character base64url tokenとする。`hello` requestのsession、challenge、authentication tag、payloadはnullで、
responseはrequest ID/commandをrepeatし、session ID、fresh 43-character base64url `challengeId`、authentication
tagを返す。Non-hello requestはsession/challengeをrepeatし、`authenticationTag`をnullにしたcomplete exact canonical
request byte（exact canonical payload byteを含む）をdirection/domain separatedにしてdecoded control tokenで
HMAC-SHA-256 authenticationする。これはraw path-bearing control valueが許される唯一のtransient hash preimageで、
tagはretainしない。Responseはrequest ID/command/session/challengeをrepeatし、`authenticationTag`をnullにした
complete canonical byteを逆directionでauthenticateする。Challengeは
accepted/rejected/malformed/disconnected/replayed request全体でsingle-useとし、各commandにnew helloを要求する。
Token/tagはconstant timeでcompareし、argv、file、evidence、log、errorに入れない。Child environmentへの唯一の
利用は後述するexact start-through-stop participant Inspector product-probe bindingで、study-browser adapterはdirect
Chromium spawn前にstripする。

`errorCode`はclosed enum `none | malformed-message | authentication-failed |
challenge-replayed | command-not-allowed | payload-invalid | binding-mismatch |
state-mismatch | runtime-control-unavailable`とする。`ok: true`は`errorCode: none`、`ok: false`はexact 1件の
non-`none` codeとnull payloadを要求する。Token、path、identity component、raw field、child detailのどれが
failureしたかをcodeでexposeしない。Command payloadは次のclosed schemaに従う。

| Command | Request payload | Successful response payload |
|---|---|---|
| `hello` | null | null |
| `verify-inputs` | exact `StudyWorkRootBinding` | `workRootIdentityCommitment`, `runtimeControlReady: true` |
| `start` | exact `StudyLiveBinding` | exact root order `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `processes`, `orchestrators`。Fixed stream identity 6件+orchestrator identity 2件 |
| `checkpoint` | exact `StudyLiveBinding` | supervisorがimmutable three-stream snapshotを保存した後のfresh `checkpointRequestId` |
| `read-checkpoint` | exact `StudyLiveBinding` | unmodified supervisor-owned checkpoint snapshot。Handoff byteを作らない |
| `anchor-handoff` | exact `liveBinding`, `checkpointRequestId`, `handoffSha256` | sole writer 3件がappendした後のfixed 3 stream anchor position |
| `verify-continuation` | exact `liveBinding`, `checkpointRequestId`, `handoffSha256` | 保存した3 anchor position |
| `stop` | exact `liveBinding`, `checkpointRequestId`, `handoffSha256` | exact stop result 3件、direct OS-observed adapter exit 3件、accepted adapter-OS-observed watchdog exit attestation 3件、direct OS-observed orchestrator exit 2件、live reviewer 0件、browser-proxy closure後だけnull |
| `finalize-prepare` | exact `runtimeBinding`, `checkpointRequestId`, `handoffSha256` | independent current-state check完了、complete witness material ready、endpoint liveの状態でnull |
| `finalize-commit` | exact `runtimeBinding`, `checkpointRequestId`, `handoffSha256` | listener teardown開始後、authenticated existing connectionだけへexact `StudyContinuityWitness` |
| `abort` | null | live child、endpoint、key、raw binding、in-memory continuity stateをwitness/sealなしでdestroy後null |
| `register-pre-readiness-probe` | exact `studyRunId`, `subjectId`, `bootstrapProof` | fresh runtime-only `preReadinessProbeId` 1件 |
| `buffer-pre-readiness-product-event` | exact `preReadinessProbeId`、sole `destinationRole: product-instrumentation`、exact `StudyPreReadinessProductObservationDraft` | draftを順序validate/store後null |
| `register-product-probe` | exact `studyRunId`、still-open `preReadinessProbeId`、readiness proof、requested destination-role set | candidate-owned handshake成功かつreadiness-bound bufferのrelease/ACK/destroy後だけfresh `inspectorProcessId` 1件 |
| `submit-product-event` | exact outer registered `inspectorProcessId`, `destinationRole`、closed payload variant 1件（canonical safe observation、または`inspector-server-ledger`限定exact `StudyServerCorrelationClaim`） | safe observationをselected adapter/watchdogへexact 1回、またはserver claimをin-memory brokerへexact 1回route後null |
| `close-product-probe` | exact `inspectorProcessId` | registered probeからlater eventをsubmit不能にした後null |

Start `processes` arrayはfixed stream order、各watchdog then captureのexact 6 entry、entry exact orderは
`streamRole`, `processRole`, `instanceId`, `processRunId`とする。Separate `orchestrators`は
`study-harness`, `scoring-moderator`の順のexact 2 entry、exact orderは`processRole`, `componentRunId`とする。
IDはauthenticated ready frameと一致し、OS PID/reviewer/extra/duplicate/reordered entryを許可しない。

ここで`runtimeBinding`はexact `StudyFullBinding`、`liveBinding`はexact `StudyLiveBinding`、
`destinationRole`はexact `product-instrumentation | inspector-server-ledger`で、いずれもnested/freshかつ他fieldを
許可しない。`bootstrapProof`はexact `StudyPreReadinessBootstrapProof` root order `schemaVersion`, `productId`,
`bootstrapEventId`、valueはliteral `1`, literal `agent-customization-inspector`, fresh one-use opaque IDとする。
`readinessProof`はexact root order `schemaVersion`, `productId`, `readinessEventId`、valueはliteral `1`, literal
`agent-customization-inspector`, fresh one-use opaque IDとする。Register-product requestはsame run/subject/bootstrapの
still-open exact `preReadinessProbeId`を必須とし、`requestedDestinationRoles`はfixed order
`product-instrumentation`, `inspector-server-ledger`のnonempty duplicate-free subsetとする。IDをenvironment、argv、application code、evidence、digest、outputへ
入れない。

`buffer-pre-readiness-product-event`はsole destination literal `product-instrumentation`と下記exact closed draftだけを
許し、server claim/他safe variantをinvalidとする。Readiness後のsafe-observation payloadのprocess IDはregistered outer IDと一致する。Claim payloadはalready-pending
browser candidate 1件かつserver-ledger destinationだけでacceptし、outer IDはregistered probeをauthenticateする。
Claim内subject/process fieldはregistered ID、actorはexact `participant | bundled-spa`とし、N/A claim ID/
他actorをinvalidとする。Supervisorはclaimをbrokerだけへ送りwatchdogへ直接送らない。Unknown/duplicate/replay/post-bind/
wrong run/subject/ID/destination/raw-bearing/mutated/reordered pre-readiness inputをfailする。Probe commandはstart後からclose/stop前だけ有効で、requestごとにfresh hello/challengeを使い、raw
observationを運ばず、`study-browser`をselectできない。Lifecycle phase前にrejectしたcommandは`ok: false`かつ
null payloadとし、free-form error payloadを設けない。`finalize-commit`はsuccessful `finalize-prepare`後にexact 1回だけ
acceptし、commit前failureではfail-closed retryまたは`abort`用にendpointをliveのまま保つ。Finalizationではauthenticated existing connectionがlistenerと
Unix socket pathのremoveまたはWindows pipe acceptance停止後にwitnessをreturnでき、verifierはevidence persist前に
endpoint reconnection failureを要求する。

#### StudyInheritedIpcFrameとbinary bootstrap

全internal channelはowner contractのexact inherited-IPC protocolを使う。Closed role enumは
`materializer | supervisor | study-harness | scoring-moderator | reviewer-one | reviewer-two |
product-instrumentation-adapter | inspector-server-ledger-adapter | study-browser-adapter |
product-instrumentation-watchdog | inspector-server-ledger-watchdog | study-browser-watchdog`とする。
各allowed parent/verified-child edgeはexact 2本のfresh unidirectional anonymous inherited pipe、parent-to-childと
child-to-parentを持つ。Parent-to-child pipeは`channelSeed` 32 fresh byte、`bootstrapNonce` 32 fresh byte、
`channelId` 32 fresh byteの順のexact 96-byte prefixで始まり、その後LF-framed parent-to-child messageへ
switchする。Childはfirst 96 byteをconsume後だけframe parseし、later byteをbootstrapにできない。Byte 96前の
EOF/parent closeはtruncated-bootstrap failure、prefix後のmalformed/trailing byteはframe failureとする。これらを
environment、argv、file、endpoint、log、output、evidenceへ入れない。

Role/edge/type matrixはclosedとする。

| Parent | Child | Parent-to-child type | Child-to-parent type |
|---|---|---|---|
| `materializer` | `supervisor` | `runtime-bootstrap`, `lifecycle` | `ready`, `acknowledgement`, `lifecycle` |
| `supervisor` | `study-harness` | `attempt-binding`, `terminalization-decision`, `lifecycle` | `ready`, `acknowledgement`, `lifecycle` |
| `supervisor` | `scoring-moderator` | `scoring-context`, `acknowledgement`, `lifecycle` | `ready`, `workflow-outcome`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |
| `scoring-moderator` | `reviewer-one`/`reviewer-two` | `review-case`, `lifecycle` | `ready`, `reviewer-vote`, `acknowledgement`, `lifecycle` |
| `supervisor` | `study-browser-adapter` | `browser-proxy-binding`, `stream-writer-binding`, `attempt-binding`, `proxy-marker-install`, `participant-navigation-grant`, `browser-broker-decision`, `safe-payload`, `workflow-outcome`, `terminalization-decision`, `stream-control`, `acknowledgement`, `lifecycle` | `ready`, `browser-request-candidate`, `attempt-terminalization`, `stream-control-result`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |
| `supervisor` | `product-instrumentation-adapter`/`inspector-server-ledger-adapter` | `stream-writer-binding`, `safe-payload`, `stream-control`, `acknowledgement`, `lifecycle` | `ready`, `stream-control-result`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |
| 各`*-adapter` | matching `*-watchdog` | `stream-writer-binding`, `safe-payload`, `stream-control`, `acknowledgement`, `lifecycle` | `ready`, `stream-control-result`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |

Harness→browser-adapter edgeはない。`workflow-outcome`はexact `StudyWorkflowOutcomeSubmission`だけをmoderator→
supervisor、次にsupervisor→browser adapterへ運び、adapterだけがcanonical workflow payloadを自watchdogへの
`safe-payload`にする。他typeを流用しない。Supervisor→browser-adapter edgeの`safe-payload`はvalidated/stored matching candidateと
current-context decisionからsupervisor brokerが構築するexact canonical nonworkflow browser-observation variantだけを許す。
下記complete observation-payload root、literal `eventCode: observation`、nonworkflow `observationClass`を必須とする。
Workflow/product/server dataやcandidate state bypassを許さず、adapterはbindingをvalidateするだけでworkflow tagをderiveしない。
Blocked candidateはvalidated/storedだがacceptedではなく、forwarded branchのcandidate-forwardだけがacceptanceである。

`StudyInheritedIpcFrame` exact root orderは`schemaVersion`, `channelId`, `sequence`, `direction`,
`senderRole`, `receiverRole`, `messageType`, `authenticationTag`, `payload`とする。Versionはliteral `1`、directionは
`parent-to-child | child-to-parent`、sequenceは各directionで`0`からexact +1、payloadはmatrix-selected exact
schemaとする。Direction keyは次のexact byteでderiveする。

```text
K_parent_to_child = HMAC-SHA-256(channelSeed,
  ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId ||
  ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)
K_child_to_parent = HMAC-SHA-256(channelSeed,
  ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId ||
  ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)
```

First child-to-parent frameはsequence `0`の`ready`で、payload exact orderは`schemaVersion`,
`bootstrapNonce`, `componentRunId`とする。Authenticate後にseed/nonceをwipeする。各frameはtag nullのcompact
canonical no-LF bytesを作り、exact `ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 ||
canonicalFrameBytes`を該当direction keyでHMAC-SHA-256する。Canonical 43-character tagを設定したcompact JSON+
LF 1件だけをwire formとし、constant-time validationをpayload/state action前に行う。Acknowledgement payload exact
orderは`schemaVersion`, `acknowledgedSequence`, `result`（literal `accepted`）、lifecycle payload exact orderは
`schemaVersion`, `event`（`close | abort | child-exit`）とする。

Materializer→supervisor edgeだけはready後のfirst parent-to-child frame sequence `0`をsole `runtime-bootstrap`とする。Full
validation、stable session/continuity creation、endpoint bindの後だけACKし、そのACKだけがroot mutationを許可する。Successful
authenticated lifecycle closeはsupervisorを止めずmaterializer edgeをdetach/wipeし、failure/abortは両方をteardownする。
Moderator、adapter、watchdog edgeのparent-to-child acknowledgementは、immediately preceding valid child-to-parent
`process-lifecycle-attestation` sequenceだけをACKできる。Candidate、terminalization、workflow、vote、ready、stream result、その他
messageをACKできない。Watchdog registration ACKはupstream relay前、supervisor registration ACKはstart前、watchdog exit ACKは
adapter exit前、reviewer exit ACKはoutcome前とする。

Supervisor→study-browser-adapterの`workflow-outcome`に対するchild-to-parent `acknowledgement`をexact accepted
sequenceのmandatory semantic responseとし、matching watchdog safe-payload ACK後だけ送る。Next context/binding/
lifecycle/controlはimplicit ACKではなく、missing/wrong/premature/duplicate/cross-typeをfailする。Parent-to-child
attestation-only ruleは広げない。

Named payload-bearing messageは対応exact canonical recordをwrapperなしで運び、`stream-writer-binding`はexact
`StudyStreamWriterRuntimeBinding`だけを運ぶ。`StudyBrowserBrokerDecision` exact
root orderは`schemaVersion`, `studyRunId`, `browserAttemptId`, `correlationId`, `decision`、decisionは
`candidate-forward | browser-only-released | joined-pair-released`、versionはliteral `1`とする。Candidate-forward/joined-
pair-releasedはcurrent non-N/A browserAttemptId、browser-only-releasedはvalid-marker boundならcurrent ID、missing/
invalid-marker unrelatedでderived subject/processもN/AならN/Aだけを許す。Eligible validated/stored candidateとarmed
canonical grantにcandidate-forward exact 1回を使い、sole acceptance/authorization commitでgrantをatomic consumeしてから
forwardする。Blocked browser adapter/watchdog downstream ACK後にmutually-exclusive browser-only-released
exact 1回、forwarded join+両payload downstream ACK後にjoined-pair-released exact 1回とし、duplicate/skip/reorder/wrong-state/reuseをfailする。

`StudyProcessLifecycleAttestation` exact root orderは`schemaVersion`, `processRole`, `streamRole`, `componentRunId`,
`instanceId`, `processRunId`, `event`, `exitCode`, `signal`とする。Versionはliteral `1`、process roleはnamed adapter、matching
watchdog、またはreviewer slotとする。Adapter/watchdogのstream/fresh instance/process IDはprefix/uninterrupted envelopeと一致し、
reviewerはstream/instance/processをliteral `not-applicable`、component IDは常にreadyと一致させる。Eventは`registered | exited`、
registeredはexit field null/null、accepted clean exitはbyte-identical registered identityと`0`/nullを要求する。Adapter
ready/self-registration+supervisor ACK後にwriter bindingをrelayし、そのwatchdog ACK後だけwatchdog self-registrationを
adapterへ送りACK/byte-identical relayする。Adapterはdirect OS child observation後だけwatchdog exit attestationをconstructし、moderatorは
ready/direct OS child observationからreviewer registered/exit attestationをconstructする。Self/sibling exit attestationを禁止し、
nonclean child exitはlifecycle `child-exit`でrunをinvalidateする。

`StudyStreamControl` exact root orderは`schemaVersion`, `controlSessionId`, `studyRunId`,
`workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `streamRole`,
`command`, `checkpointRequestId`, `handoffSha256`とする。Immutable binding valueはstart値をrepeatし、commandは
`start | checkpoint | anchor-handoff | stop`、startはfinal 2 fieldをliteral `not-applicable`、checkpointはfresh IDとliteral
`not-applicable` digest、anchor/stopはexact current ID/digestとする。`StudyStreamControlResult` exact root orderは`schemaVersion`, `controlSessionId`, `studyRunId`,
`streamRole`, `command`, `checkpointRequestId`, `sequence`, `monotonicNs`, `envelopeSha256`とし、matching actual first-
heartbeat、immutable checkpoint、anchor、terminal-stopのposition/digestを返す。
result checkpoint IDはstartでliteral `not-applicable`、checkpointでfresh ID、anchor-handoff/stopでcurrent accepted IDとし、
他N/Aを禁止する。Adapterはcontrol/resultをbyte-identical relayし、action/synthesis/mutationできない。
Resultはsemantic responseでありgeneric ACKではない。

`attempt-terminalization`/`terminalization-decision`はbyte-identical exact `StudyAttemptTerminalization` root
`schemaVersion`, `studyRunId`, `browserAttemptId`, `subjectId`, `inspectorProcessId`, `cause`を運ぶ。Causeは
`product-exit | browser-exit | equipment-failure | premature-probe-close`、versionはliteral `1`とする。Harnessは
terminalization sourceではない。Supervisorはsole participant-launch controller/OS observerでdirect child waitだけから
product-exitをderiveし、bootstrap前exitはexclusively product-exitとする。Study-browser-adapterはChromium child/contextを
direct own/observeし、actual exitをbrowser-exit、adapter/proxy/DevTools controller/marker/IPC/implementation healthyな
external failureをequipment-failureとする。Internal proxy/controller/DevTools/auth/marker/IPC/implementation/adapter/
watchdog faultはcleanup+no synthesis+invalidateとする。Probe close/EOFをOS child stateとserializeし、already exitedは
product-exit、still liveかつ4 outcome前はpremature、4 outcome+join 0件後はnormalとする。Supervisorはfirst valid
committed causeをacceptしlater/raceをreject、byte-identical
decisionをharness/browser adapterへfanoutする。Adapterはbrowser/grant/marker/reservation/candidate/pendingをcleanするがterminalizing
bindingを保持し、harnessもterminalizing binding/fixed scheduleを保持する。Moderator/supervisorが4 outcomeを完了しclosed snapshot
dual ACKを得た後だけ両bindingをdestroyする。

Truncated bootstrap、wrong role/edge/type/channel/direction/order/tag、duplicate/skip/replay、trailing/partial/late
frame、child exitはchannel/runをfailしpartial routeを0件とする。Close/abort/crash/child exit/auth failureはdirection
key、buffer、sequence/replay stateをwipeする。Control token、continuity key、marker secret、他channel seed/keyを
reuseしない。Inherited capture IPC内でruntime secret payloadをauthenticateできるのはこのtransient frame HMAC
（exact marker-install frameを含む）だけで、frame/tagをcapture evidence/別digest inputにしない。Cross-protocolの
complete HMAC-preimage setは上記enumerationだけとし、その他preimageを禁止する。

#### Study harness executable closure

`scripts/build-usability-study-inputs.mjs`、`scripts/run-usability-study-capture.mjs`、
`scripts/verify-usability-study-evidence.mjs`はそれぞれself-contained single-file literal Node.js programとする。
Static importは`node:` built-inだけを許可する。Repository-local/package import、dynamic import、CommonJS `require`、
`createRequire`、`eval`、`Function`、`node:vm`、worker/cluster entrypoint、download/PATH-resolved helper、alternate
child entry fileは禁止する。Internal exceptionはidentity/digest-verifiedなexact capture script executionである。
Materializationはinherited anonymous IPCでそのsupervisorをstartでき、capture scriptは自身のverified fileだけを
exact `process.execPath`でclosed internal mode `supervisor`, `study-harness`, `scoring-moderator`, `reviewer-one`,
`reviewer-two`, named adapter 3件、matching watchdog 3件としてre-executeでき、authentication materialはinherited
IPCだけで運ぶ。各internal invocationはcurrent verified parent-sponsored channel+fresh nonceを必須とし、unsponsored/
replayed invocationはcurrent endpoint/session/channel-key namespaceへjoinできない。このcapabilityはsame-userが別の
emulated runを作る場合のsource identity認証をclaimしない。

External-equipment execution exceptionは、supervisorがverified subject repositoryでshellなしにexact
`npx --no-install agent-customization-inspector --no-open` participant closureをspawnしcapture scriptをsole NODE_OPTIONS
importとすること、およびstudy-browser-adapterがidentity/digest-pinned Chromium binary/profileだけをdirect spawnする
ことだけとする。Participant/Chromiumはinternal modeではなく、他helper/import/package/child closureを禁止する。

Process treeはexactとする。Materializationがlong-lived supervisor 1件をlaunchし、startでsupervisorが順にharness、
moderator、product/server/browser adapterを各1件launchし、各adapterがready前にmatching watchdogをlaunchする。
Exact 8 long-lived internal descendant、すなわちorchestrator 2件+stream process 6件とする。Watchdogはadapter childで
supervisor direct childではなく、attempt-local participant/Chromiumはexternal equipmentで8件外とする。Supervisorは
fd7/8/9をmoderatorへsame slotで渡してown copyをcloseし、fd6をparticipant ingress用に保持する。Reviewed failureだけでmoderatorがfresh reviewer-one/two one-use collectorを
slot順にspawnし、両readyとsupervisor-ACKed registered attestation 2件を待ってからbyte-identical safe caseを送りhidden first
vote/second voteをacceptする。両clean exitをdirect OS observationし、supervisor-ACKed exit attestation 2件を待った後だけ
outcomeをsubmitする。Success/valid automatic-link failureではspawnしない。Stopはlive reviewer/case/attempt/join 0件、harness then
moderator then fixed adapter orderでcloseする。各adapterはwatchdogをclose/direct OS observationし、watchdog clean-exit
attestationを送ってsupervisor ACKを受けてからexitする。Supervisorはadapter 3件とorchestrator 2件をdirect OS observationし、
remaining long-lived factにはaccepted adapter-OS-observed watchdog exit attestation 3件を使い、finalizeまで残る。Wrong
parent/order/cardinality/reuse/extra/nonclean exitまたはevidence
harness/orchestrator/adapter/watchdog/reviewer failureはrun invalid、synthesisなしとする。

Supervisorは`start`でexact stream file各1件をsecure createし、append-only handle各1件をopenする。全internal childで
child-visible descriptor `3`はparent-to-child read IPC、descriptor `4`はchild-to-parent write IPC、descriptor `5`はadapter/
watchdog modeだけのmatching evidence-writer append handleとし、その他roleのfd5はabsent/closedとする。Fd5はthird IPC channel
ではなく、exact supervisor→adapter→matching-watchdog spawn mappingだけのsole required non-IPC inheritance exceptionとする。
Adapterはverify/passだけでread/write/seek/duplicate/retainせず、downstream writer-binding ACK+watchdog registration relay後に
copyをcloseする。Supervisorはupstream registration ACK後にcopyをcloseする。Watchdog registrationはbinding matching
stable regular-file identity、`nlink === 1`、append-only authorityを要求し、その後watchdogがsole holder/writerとなる。
Extra duplicate/read/write/seek/retainを禁止する。Stop result後にhandleをcloseしclean exitする。
Wrong/readable/swapped/extra/missing handle、adapter access、identity drift、path/cwd/environment/argv leakageはinvalidateする。

Materializer→supervisor launch時、sanitized ordinary equipment `PATH`をidentity/digest-pinned npx launcher binと、work
root/distribution/control/browser profile外のreserved initially-empty candidate-launch-store bin slotのexact 2 entryにfix/
inheritする。Materialize/inputsはslot contentをread/requireしない。Successful verify-inputs後/start前だけauthorized setupが
exact tarball+frozen production graphからnetwork/lifecycle-script disabledでそのsame known slotへprovisionし、package/bin/
runtime payload identity/digestをcandidate digestへbindする。Startでsupervisorはinherited fixed slotだけをresolve/reverifyし、
new env/control/path frame/post-materialize pathを受けない。Participantにはsame 2-entry PATHだけを渡し、raw tarball authority/
distribution mutation/global/cache/network/install/fallback/substitutionを禁止する。Store path/identityはruntime equipmentだけで、
stop/finalize/abort/crashでdestroyしabsenceまでblockする。Provisioningは8 internal descendant外とする。

Supervisorはsole participant-launch controller/OS observerで、attempt preparation後にfd6からexact one LF ASCII
`npx --no-install agent-customization-inspector --no-open`だけをacceptし、verified subject `repository/` cwdでshellなしに
direct spawnする。Envはfixed product、exact audited PATH、sole exact `NODE_OPTIONS=--import=<verified-capture-script-file-URL>`,
control endpoint/token、minimum safe run/subjectだけとし、candidate/proxy/browserAttempt/internal channelをargv/env/terminalへ
入れない。Command bufferをspawn後wipeしchild handle/waitをownする。Attempt/exit/abort/crashでchild view close、fd6 drain/
reset、pending input/output/history/context wipe/absence proofを行い、surfaceだけreuse、process/probe contextはfreshとする。
Inspector-process IDを事前assign/environment格納しない。Single-file capture scriptのproduct-probe modeはcandidate-owned
fixed optional readiness handshakeをpackaged `dist/cli.mjs` entryへattachする。

Candidate module-body evaluation前にimported codeはbound candidate bootstrap identityをtransient verifyし、raw identityを
即discardしてexact `StudyPreReadinessBootstrapProof`でregisterする。Supervisorはruntime-only
`StudyPreReadinessProductBuffer` root order `schemaVersion`, `studyRunId`, `subjectId`, `preReadinessProbeId`, `state`を作る。
Versionはliteral `1`、IDはcurrent/fresh safe value、stateはexact `open | readiness-bound | terminalization-bound |
destroyed`でopen→いずれかbound→destroyedのone-wayとする。Probe IDはmodule-private/runtime-onlyとする。

`StudyPreReadinessProductObservationDraft`はcanonical observation payloadとsame complete root order
`schemaVersion`, `eventCode`, `eventId`, `correlationId`, `subjectId`, `inspectorProcessId`, `observationClass`,
`actorClass`, `authorityClass`, `requestClass`, `targetClass`, `methodClass`, `capabilityClass`, `originClass`,
`effectClass`, `workflowClass`, `outcomeClass`, `automaticIssueCorrelationId`, `reviewDisposition`,
`reviewerOneClassification`, `reviewerTwoClassification`, `sameInspectorHost`, `productAttributable`, `prohibited`を
持つ。Version/eventは`1`/`observation`、event/correlationはfresh transient ID、subjectはcurrent、process/workflow/
automatic/review fieldはliteral `not-applicable`、outcomeは`observed`、残るtupleはclosed product-instrumentation rowとする。
Draftはevidenceでもserver claimでもない。

Observable/prohibited pre-readiness effectを続行する前にhookはsafe classifyしてrawを即discardし、sole destination
`product-instrumentation`へexact `buffer-pre-readiness-product-event`をsubmitしてACKを待つ。ACK前にeffectを続行しない。
Supervisorはaccepted draftをexact orderでvalidate/storeし、まだhash/route/evidence retainしない。Abrupt target exitでも
ACK済みdraftを消さない。

Exact candidate-owned readiness時、`register-product-probe`はopen `preReadinessProbeId`を含む。Supervisorはbufferを
`readiness-bound`へ変更し、fresh `inspectorProcessId`を生成し、fresh evidence event/correlation IDとそのprocess IDでstored
orderどおりfresh canonical payloadをreconstructし、product-instrumentationへrouteしてadapter ACKを待つ。Empty bufferも
destroyした後だけacknowledged attempt-open flowへ進む。Responseは全buffer release ACK/destroy、両open-binding ACK、
moderator discovery-context ACKまでblockし、その後だけprocess ID/readinessを返す。Grant/navigation/taskはさらに後だけ
開始する。Pre-readiness terminalizationではbufferを
`terminalization-bound`へ変更し、全draftをprocess ID `not-applicable`で順序reconstruct/releaseし、全ACK後emptyを含むbufferを
destroyしてからterminalization decision/synthesized workflow outcomeへ進む。

Canonical product-attributable observationが`inspectorProcessId: not-applicable`を持てるのは、readiness前にこのsame-run/
same-subject `terminalization-bound` bufferからreleaseされ、workflowも`not-applicable`のときだけとする。全
`readiness-bound` releaseは新規assignしたnon-N/A IDを使う。Readiness後を含むその他product-attributable N/A rowはinvalidとする。

Readiness後はlater safe observationごとにdistinct `submit-product-event`を使い、browser-origin server correlationは同commandの
exact `StudyServerCorrelationClaim` variantを使い、registered IDをouter authentication fieldだけに置く。Orderly Inspector
exitでIDをcloseする。Probeはadapter/watchdogではなくevidenceを書かない。Readiness proofをmintする前にrequired pre-server/
pre-browser pointのbound fixed bootstrap identity由来callをverifyしてraw call-site/pathをdiscardし、helper/wrapperがglobal symbolを
direct callしてproofをmintできないようにする。

Exact bootstrap identityを持たないhelper/unrelated processはregisterせずlocal dataをevidence 0件でdiscardする。Supervisorが
direct observeしたexpected participant childがbound bootstrap到達前にexitした場合はexclusively pre-readiness
product-exit+reviewed failure 4件とし、candidate-body
effectは不可能とする。Bound bootstrap到達後はregistration ACKまでmodule-body evaluationをblockする。Identity/register/ACK
failureはbody未評価のままrunをinvalidateする。Buffer ACK failure、missing/wrong/duplicate readiness、direct/duplicate probe
install、changed self-import、raw IPC、binding mismatch、duplicate/replayed/mutated/post-bind draftもrunをinvalidateしsynthesisを
許可しない。

Study-browser adapterはdirect Chromium作成前に`NODE_OPTIONS`、control binding 2件、safe-context binding 2件、candidate authority、
inherited internal IPCをstripし、proxy authorityはDevTools routeだけへ渡す。Probe path/options/environmentとrejected non-target dataはruntime-only/unretainedとする。
Contract/integration testはactual pinned `npx --no-install`のsole audited store resolution、target readiness、pre-readiness buffering、non-target discard、helper stripping、missing/
tampered probe、全product/server observation surfaceをexerciseする。

Workflow terminal outcomeはstudy-control command、`submit-product-event`、browser proxy request path、
product/server destinationのいずれも使わない。Scoring moderatorがsole raw scoring ownerでfd7だけから読む。Matching
open context delivery+workflow display complete後にexact one LF-terminated compact canonical UTF-8 JSON
`StudyModeratorInput`をenableする。Exact root orderは`schemaVersion`, `studyRunId`, `subjectId`,
`inspectorProcessId`, `workflowClass`, `response`, `timing`, `groundTruth`, `rubric`。Version `1`、open context
ID/workflow match、process non-N/A、timing canonical nonnegative decimal string、他3件call-local canonical JSON stringと
する。Unknown/extra/reorder/noncanonical/CR/extra line/EOF/replay/duplicate/cross-contextをfailし、echo/history/recording/
transcript/log/retain/other-surface routeを禁止する。Safe outcome後record/rawをwipeしinput disable+fd7 drain/resetし、
abort/crash/terminalizationでpartialをwipeする。Normal workflowごとにexact 1 recordを必須とし、terminalization-
synthesized remaining workflowはrecordを読まず、late synthetic/closed/already-accepted inputをfailする。Accepted prefixは
normal rowごとにconsume済みで、empty/default rawを捏造しない。Runtime-only
`StudyCurrentSubjectScoringContext`を最多1件保持する。Exact root orderは`schemaVersion`, `studyRunId`, `subjectId`,
`inspectorProcessId`, `workflowClass`, `automaticIssueCorrelationId`, `terminalizationClass`, `state`。Versionはliteral `1`、
ID/workflowはcurrent safe value、automatic fieldはinitially N/A、terminalizationは`none | product-exit | browser-exit |
equipment-failure`、stateは`open | submitted | destroyed`をその順にmonotonicとする。Open中だけautomatic N/A→earliest matching accepted correlation exact 1回、terminalization none→
mapped cause exact 1回を許可し、later synthesized contextはmapped classでinitする。他mutation/reversal/replacement/
second/post-submit updateはfailする。Call-local safe associationだけを許可し、identity/recruitment/distribution/profile/
retained/external/reidentifying/cross-workflow mappingを禁止、rawをcontext/IPC/hash/log/output/evidenceへ入れない。

Supervisorがsafe context mirrorをownし`scoring-context`でmoderatorへ送る。Sourceはworkflowをself-declareしない。
Canonical serialization前にcurrent open workflow tagまたはeligible contextなし/pre-readiness時のpermanent N/Aをassignする。
Downstream ACK(s)→immutable observation accept/count後だけfirst matching prohibited eventでmirror correlationをatomic update/
complete context再送し、moderator ACK後だけrelease/matching outcomeを許す。Accepted observationはmutate/backfill/retag
せず、late/closed/cross-contextはoriginal workflowを保持する。

Scheduleはclosedとする。Pre-readiness buffered observationはeligible contextなしでworkflow N/Aのままにする。Buffer
release/destroyとopen-binding両ACK後、Inspector body/readiness response/discovery task/grant/navigationをblockしたまま
supervisorがdiscovery mirrorをopenしてmoderator ACKを待ち、その後だけreadinessを返す。各workflow outcomeがbrowser
watchdogまでacceptされた後、contextをsubmitted→destroyedとし、next fixed-order contextをtask/timer/prompt開始前に
open/ACKする。Post-ready/pre-context event intervalは不可能とする。

`StudyWorkflowOutcomeSubmission`はmoderator→supervisor→browser adapterのexact
`workflow-outcome`だけをcrossし、adapterだけがcanonical workflow payloadをwatchdogへ送りwatchdog ACK後だけsubmissionを
ACKする。Root orderは`schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`,
`workflowClass`, `outcomeClass`, `automaticIssueCorrelationId`, `reviewDisposition`, `reviewerOneClassification`,
`reviewerTwoClassification`。Versionはliteral `1`、workflowは`discovery | inspection | comparison | global-consent`、
outcomeは`success | failure`とする。Dispositionは`not-applicable | automatic-critical | reviewer-cleared |
reviewer-confirmed-critical | reviewer-disagreement-critical`、classificationは
`not-applicable | product-caused-blocker | not-product-caused-blocker`とする。
`inspectorProcessId`は`StudyOpaqueId | not-applicable`で、N/Aはexact terminalization-bound pre-readiness synthetic branch
だけに許しsubmission/review case/both voteでmatchさせる。Normal input/post-readiness terminalizationはnon-N/Aを使う。
Automatic-criticalはsame bindingのalready accepted earliest
prohibited linkを必須とする。Context correlationはeligible failure-link candidateでoutcome overrideではない。Successは
candidate有無を問わずautomatic ID/disposition/vote N/Aをsubmitし、underlying prohibited nonworkflow observationを
independent automatic issueとしてcountする。Failureでcandidate non-N/Aならexact same link、automatic-critical、N/A voteを
必須としreviewer dispositionをinvalidにする。Candidate N/Aのfailureだけがautomatic ID N/A、reviewer disposition 1件、
2 votesを使う。Open contextなしでacceptしたpre-readiness observationはworkflow N/Aのままbackfill/linkせず、independent
automatic issue setにはcountする。Missing/unrelated/later/mismatch/reuse/fresh independent issue IDをfailし、issueは
`automatic:<correlationId>`/`reviewer:<subjectId>:<workflowClass>`だけとする。

Attempt前にworkflowごとのdistinct human pairをout-of-band assignし、人をreuseしない。Separate governed access-controlled
administrative roster/assignment recordはuniqueness auditに必要なminimum identity/slotをretainしてよいが、repository bundle、work
root、candidate、runtime、capture/evidence、hash、log、output、handoff、witness、sealの外に置き、published consent/privacy retention
procedureに従ってdestroyする。Runtimeはslotだけを使い、bundle/runtime/evidenceはidentity/assignmentをretainしない。各pairはsame
live attempt/workflow（開始前terminal eventを含む）をrecording/internal IPCなしに独立観察する。Fixed slot/equipmentは
drain/reset後reuse可だが、human identity、case-local assignment instance、collector componentRunId/process instance、caseを
reuseしない。Synthesized rowもsame live eventを使う。
Context candidateがliteral N/Aのfailureだけでexact `StudySafetyReviewCase` root `schemaVersion`, `studyRunId`, `subjectId`,
`inspectorProcessId`, `workflowClass`, `caseClass`、version `1`、process IDは上記union/rule、case literal `nonautomatic-workflow-failure`を作る。Fresh reviewer-one/
two collector両ready後、moderatorはregistered attestationを送ってsupervisor ACKを待ち、vote前にbyte-identical safe caseを送りraw
caseをIPCへ入れない。Reviewer-oneへfd8だけ、reviewer-twoへfd9だけをmapし、case accept/display complete後に各collectorが
own slotからLF-terminated ASCII enum exact 1行`product-caused-blocker | not-product-caused-blocker`だけを読む。
CR/variant/extra/echo/history/recording/transcript/log/raw IPCを禁止し、safe vote後raw wipe/input disable/child view closeする。
First voteをmoderator memoryだけにhidden保持してfd9/他surfaceへ出さない。`StudySafetyReviewVote` rootは`schemaVersion`,
`studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `reviewerSlot`, `classification`。First hidden、second後
clean exit/destroyする。Versionは`1`、process IDは上記union/rule、slotは`reviewer-one | reviewer-two`、classificationは
`product-caused-blocker | not-product-caused-blocker`とする。Moderatorは両exitをdirect OS observationし、matching clean-exit
attestationを送ってsupervisor ACKを待った後だけoutcome/destroyを許可しfd8/9をdrain/resetする。EOF/malformed/extra/
replay/cross-case/cross-descriptor/first-vote exposure/abort/crashはboth view close+raw/hidden wipe+run invalidとする。
Identity/note/raw/recording/third/replacement/replay/reuseを禁止する。

Truthはcontext candidate有無を問わずsuccess=N/A/effect none、candidate non-N/A failureはrequired linked correlation/
automatic/N/A votes/effect none、candidate N/A failureだけは2 voteを必須とし、two nonblocker=cleared/none、two blocker=confirmed/workflow-blocker、disagreement=
disagreement-critical/workflow-blockerとする。Adapterがfresh event/correlationを生成しown watchdogへonce submitする。

### StudyBrowserAttemptBindingとbrowser/server request join

`StudyBrowserAttemptBinding`はsupervisor生成runtime-only canonical recordで、exact `attempt-binding`によりbroker、
standardized harness、`study-browser` adapterへだけdistributeする。
Control command、capture payload、evidence/retained digest input、log/output value、retained recordにはならない。
Complete field set/exact root orderは次のとおり。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown/missing/extra/reordered fieldはfail |
| `studyRunId` | `StudyOpaqueId` | Live supervisor runと一致 |
| `browserAttemptId` | fresh `StudyOpaqueId` | Stream start後、next subject candidate `npx`直前にsupervisorが生成し、その他全IDとdistinct |
| `subjectId` | `StudyOpaqueId` | Fixed 20-subject orderのnext memberと一致 |
| `inspectorProcessId` | `StudyOpaqueId \| not-applicable` | Prepared/pre-readiness closeでは`not-applicable`、openではreadiness-generated ID |
| `state` | `prepared \| open \| terminalizing \| closed` | `prepared -> open -> closed`, `prepared -> terminalizing -> closed`, `prepared -> open -> terminalizing -> closed`だけ |

全runtime stateを通じbinding最多1件、closed destroy後だけnextを作る。`browserAttemptId`はsupervisor/broker/
harness/adapter memory、authenticated frame、candidateだけに存在し、actual browser process/context/profile/config/
credential/application/env/argv/evidence/retained digestへ渡さない。Replicationはprepared snapshot両ACK後launch、
open snapshot両ACK後discovery-context moderator ACKを得てからregister response、その後grant/candidate/task、
terminalization decisionで全copy terminalizing、4 outcome後closed
snapshot両ACK（adapterはattempt cleanup後ACK）、全destroy後next、normal closeもsame pathとする。Wrong/skip/stale/
reorder/duplicate/mismatch/partial ACKはfailする。Supervisorは別にfresh 32-byte/43-character
`browserProxyMarkerSecret`とruntime-only `StudyBrowserProxyMarkerBinding`を生成する。Exact root orderは
`schemaVersion`, `studyRunId`, `browserAttemptId`, `browserProxyMarkerSecret`, `state`、stateは`prepared |
active | destroyed`とする。Supervisor→browser adapter `proxy-marker-install`だけを許可し、harnessへ渡さない。
Adapterはexact bootstrap成功後だけACKし、そのacceptでmarker copyだけをactiveにし、attempt bindingはreadiness/open dual ACKまで
preparedのままとする。Actual browser process/context exitはprepared markerをdestroyして`browser-exit`をreportする。Adapter/proxy/
marker/IPC/implementation/DevTools controllerがhealthyなまま観測したexternal browser/bootstrap/environment failureはmarkerをdestroyして
`equipment-failure`をreportする。Internal malformed 407/204/output、proxy/controller、DevTools/auth、marker、IPC、implementation、adapter/watchdog faultは
markerをdestroyするがrunをinvalidateしsynthesisしない。このframeをsecretを含むsole transient HMAC preimageとする。

Study-browser adapterがexact identity/digest-pinned Chromium binary/profileをdirect revalidate/spawnし、headed/fresh
nonpersistent context/empty extensionsとする。AdapterがOS child/contextをown/direct exit observeする。Closed nonsecret
argvはliteral `--remote-debugging-pipe`+exact pinned headed/profile switchだけで、shell/helper/package/import expansion、
raw proxy/marker/browserAttemptId/control/internal IPCをChromium argv/env/profile/history/log/evidenceへ入れない。

Anonymous browser-equipment DevTools pipeはinternal IPC外でretainなしとする。Per attemptにraw authorityをproxyServer、
`disposeOnDetach: true`、empty bypassとしてexact `Target.createBrowserContext`、次に`handleAuthRequests: true`のexact
`Fetch.enable`をcallする。Sole exact Proxy Basic `Fetch.authRequired`へexact `Fetch.continueWithAuth`の
`ProvideCredentials`、username `study`、password markerを1回返す。Authorized dedicated adapter proxy-authority/marker-binding
copy以外のDevTools-stage raw copyはadapter call-local request buffer+actual context/auth cacheだけに置き、response ACK後
bufferをwipeし、actual contextでexact `407 -> retry -> 204`をverify後marker ACKする。
Normal/abort/crash/terminalization/internal faultでcontext/auth/pipe/child/fresh isolated profileをdestroyしreuseしない。

Pinned Chromiumはverified remote-debugging-pipe implementationがexact
`StartRemoteDebuggingPipeHandler(base::BindOnce(&ChromeDevToolsManagerDelegate::CloseBrowserSoon))`でdisconnect時browser
closeをscheduleする場合だけeligibleとする。Adapterがpipe/childをownする。Supported platformはNode.js built-in child-
spawn/OS boundaryでfresh attempt process-group/job containment+emptiness observationを供給し、helper/import/IPC/env/path
authorityにはしない。Unsupported platformはlaunch前failする。Live EOFはcontext dispose→pipe close→child exit→profile
destroy、adapter crashはpipe closeでverified `CloseBrowserSoon`をinvokeしcontainmentがsurvivor cleanupする。Supervisorはraw
handle/PIDをruntime observer stateだけに保持し、adapter exit後zero descendant/context/profile proof前にnext attempt/stop/
finalizeへ進めない。Failureはcleanup+invalid、observer stateはevidence外とする。

Browser-context usernameは`study`、passwordはmarker secret。全stream start後かつattempt `npx`/first request直前にfixed proxy-local
`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`でbodyless 407 exact 1件（sole
headerは順に`Proxy-Authenticate: Basic realm="inspector-study"`, `Connection: close`）、canonical Basic retry exact 1件、
sole header `Connection: close`のbodyless fixed 204を行い、stream live中もDNS/connect/application/candidate/
correlation/evidenceを0件とする。Healthy adapter/proxyがexact specified responseを出した後のactual browser/environment retry/
credential/sequence/completion failureはexternal equipment-failure、adapter/proxy-generated status/header/body/network/evidence/output
deviationはinternal run-invalidating faultとする。Capture中はlater requestごとにexact
Basic 1件。Syntactically valid missing secretはother-host、malformed/duplicate/noncanonical/unknown/stale/
mismatched secretはunknownで、両方N/A/unrelated/false、DNS/connect前blockとする。

Secretはproxy transportだけをauthenticateしactor/product/application/control/forwardingをauthorizeしない。
Raw secret/Basic/config/bindingを他IPC/hash/file/env/argv/log/output/evidence/application request/persistent profile/
history/cache/keychain/credential storeへ入れない。Control/continuity/channel key、`browserAttemptId`、derivativeを
reuseしない。Close/abort/crash/child exitはcontext/process/configurationと全secret/binding copyをdestroyする。
Actual Chromium testはnormal/abort/crash後のisolated HOME/XDG/profile/history/cache/credential storeをinspectし、secret/
encoded Basic/browserAttemptId persistence 0件を要求してnext attempt前にdestroyする。Pinned-binary integrationは全boundaryで
remote-debugging pipe disconnectを行いverified `CloseBrowserSoon`+absence barrierを証明し、adapter crash後orphan child/
context/profileを0件とする。

Proxy/serverはsame unchanged certified-Chromium-controlled `Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site`,
`Sec-Fetch-User`, `Origin`, `Referer`から独立にruntime-only `StudyBrowserInitiatorProjection`をderiveする。Exact
root orderは`schemaVersion`, `destinationClass`, `modeClass`, `siteClass`, `userClass`,
`originEvidenceClass`, `refererEvidenceClass`。Closed valueは`document | other | unknown`, `navigate | other |
unknown`, `none | same-origin | other | unknown`, `present | missing | unknown`、last 2 fieldは`missing |
exact-issued | extension-scheme | other | unknown`。Exact `?1`だけpresentとする。Duplicate/noncanonical/unknown/
inconsistent headerはactor unknown、rawはIPC前discard、proxyは6 headerをunchanged forwardしserver projectionと
exact一致させる。Productionはextension empty、test-only extension profileでFetch Metadata spoof preventionを証明する。

Fetch Metadataはconsistencyだけとする。Product readiness後/sole initial navigation直前にsupervisorはexact
`StudyParticipantNavigationGrant` root `schemaVersion`, `studyRunId`, `browserAttemptId`, `correlationId`, `state`
（version literal `1`、IDはcurrent/fresh safe value、state `armed | consumed | destroyed`）を作りcanonical broker copyをownしadapterへarmed copyを送る。Injection前に
browser/page/applicationへ見せない。Adapterはmutex下でvalid secret+participant projection+authorized-static targetに
armed copyをreserveするがstate変更せず、grant correlation candidateをno-forwardで送る。Supervisorはarmed copy/
attempt/correlation/tupleをverifyしcandidateをpending storeするが両grantをarmedに保つ。Exact one-use
`candidate-forward`をsole acceptance/authorizationとしてcommitしcanonical grantをatomic consumedにする。Generic ACK/
predecision acceptanceはない。Adapterはmatching decision validate後だけown copy consume/forwardする。Decision前failureは
pending wipe+grant armed維持、authenticated replay/raceはinvalid+destroyとする。
Armed grantなし、wrong target、page-script origin、またはconsume後のfresh HTTP requestはfresh proxy correlationを使う下記unknown/
prohibited blocked observationとなり、grantをconsumeせずinvalidateしない。Duplicate/replayed/stale authenticated candidate/grant IPC、
simultaneous second consume、authenticated reservation/decision mismatch、committed decisionのadapter側missing/mutation、
wrong authenticated attemptはrun invalid/no forward、closeで
全copy destroyedとする。

Decision orderはexact: valid secret+navigate/document/?1/missing Origin+site none/same-origin+exact authorized static+
armed grantだけparticipantとしてforwardする。Participant-shaped nonexact/no-grant/replayed/user-activated page-scriptは
valid-secret unknown/binding ID/critical unauthorized trueでblockする。Nonparticipant valid
secret+user missing+（Origin exact-issuedまたはOrigin missing/Referer exact-issued）はbundled-SPAで、exact authorized
static/APIだけforwardし、他はbinding ID/product/prohibitedでblockする。Extension-schemeはextension/N/A/
unrelated/false/block。残るvalid-secretはunknown/binding ID/unauthorized/true/critical block。Missing secretは
syntactically valid other-hostまたはmalformed unknownとして上記N/A branch。Forward/claimはexact participant/SPAだけ。

Exact in-memory request-correlation recordもcontent-freeとする。`StudyBrowserRequestCandidate`のcomplete field set/
exact root orderは`schemaVersion`, `studyRunId`, `browserAttemptId`, `correlationId`, `actorClass`,
`authorityClass`, `requestClass`, `targetClass`, `methodClass`, `capabilityClass`, `originClass`, `effectClass`,
`sameInspectorHost`, `productAttributable`, `prohibited`とする。`studyRunId`/`correlationId`はcurrent/fresh
`StudyOpaqueId`、`browserAttemptId`はcurrent valid binding IDまたはmissing/invalid marker時のliteral
`not-applicable`とする。`StudyServerCorrelationClaim`のcomplete field set/
exact root orderは`schemaVersion`, `studyRunId`, `correlationId`, `subjectId`, `inspectorProcessId`, `actorClass`,
`authorityClass`, `requestClass`, `targetClass`, `methodClass`, `capabilityClass`, `originClass`, `effectClass`,
`sameInspectorHost`, `productAttributable`, `prohibited`とする。両versionはliteral `1`、claim `subjectId`/
`inspectorProcessId`はcurrent binding/registered `StudyOpaqueId`、actorはexact `participant | bundled-spa`とし、
N/A claim ID/他actorをinvalidとする。その他
全IDはcurrent `StudyOpaqueId`、全class/booleanはclosed observation table由来とする。`eventId`、raw header/method/path/authority/
body、capability、URL、error、content、extra fieldを含めない。

Supervisorはexact `studyRunId + correlationId`をkeyにするsole content-free in-memory brokerを所有する。Proxyは
participantでsupervisor grant correlationを使いreplacementを生成しない。SPA/browser-only non-grantだけadapterがfresh
IDを生成する。Forwarded participant/SPAではincoming correlation
fieldをremoveし、canonical `X-Inspector-Study-Correlation` exact 1件をinjectする。Serverはexact 1 fieldをstrict
43-character decode/re-encodeしてequalを要求しapplication前にstripする。Canonical stringはsole retained header-
derived valueでsafe payloadとpayload/stream/handoff/witness/seal digest chainへ入れる。Raw header name/case/order/
framing/wire/encoded/whitespace/duplicate/noncanonical/alternate derived valueをIPC前にdiscardしhash/retainしない。

Validated candidateごとにsupervisor brokerがbinding/current open contextをsnapshotし、workflow/link scopeをsole deriveする。
Source/adapterはworkflowをsupply/inferできない。Canonical serialization前にcurrent open workflow tagをassignし、eligible
contextがなければworkflow/linkをpermanent N/A、readiness前ならprocessもN/Aとし、accepted payloadをbackfill/mutateしない。Brokerがfresh evidence event IDとexact derived fieldを加え、canonical nonworkflow browser observationをrestricted
supervisor→browser-adapter `safe-payload`だけで送る。Adapterはvalidated candidate/bindingとの一致をvalidateしてunchanged payloadを
watchdogへ送り、watchdog ACK後だけACKする。その後だけobservationをaccept/countする。Still-open matching contextのfirst
product-attributable prohibited observationなら、その後にmirrorをupdateし、complete updated scoring-contextとmoderator ACKを
release decision/outcome submissionより前に完了する。Retag/direct writeを禁止する。

Joinはtimer-free。Participantではbrokerがcanonical grant armedのままvalidated `candidate-pending`をstoreし、SPAはgrantなし。
One-use `candidate-forward` commitをsole acceptance/authorization+atomic canonical consumeとし、adapter decision validate/
own consume後だけproxyがforwardする。Predecision failureはpending wipe+armed維持（authenticated replay/raceはinvalid）。Probeは
participant/SPA claimをsubmitしbroker ACK後だけapplication handlingする。Brokerはbinding/registered ID/projection/
class/boolean/exact once/participant grantをvalidateし、atomicに`candidate-pending -> joined`、event ID 2件、browser/server
payloadを構築する。Browser memberはrestricted supervisor→browser-adapter、server memberはsupervisor→server-ledger-adapterの
各`safe-payload`で送り、各adapterはcandidate/claim validate後watchdog ACKを得てからACKする。両downstream ACK後にjoined
observation 2件をaccept/countし、eligible mirror/update-context ACK barrierをapplicableなら完了してから`released`へ変更する。
Exact one-use `joined-pair-released`を送ってdecision ACKを待ち、その後だけclaim ACK/application/response completionを許す。
両payloadはcorrelation、subject/process、class、supervisor-selected workflow、N/A automatic/review field、booleanが一致しevent IDだけ
distinctとする。Complete join前write/released decision前completionを禁止する。

Wall-clock deadline/timeout/stateはない。Candidate-forward commit後のpending中のproxy transaction end/abort/error/connection close、Inspector
request abort、IPC close、probe/attempt close、stop、child exitはrunをfailしpendingをwipeしpartial pair 0件とする。
Late claim、claim-before-candidate、`candidate-forward`前forward、downstream ACK前accept/count、required updated-context ACK前release、
claim ACK前application、released decision前responseもfailし、clock advanceだけでstateは変わらない。Released-decision ACK前の
response/application completionもfailする。

Blocked candidateはvalidated/storedだがacceptedではなくcandidate-forward/server claimを許さない。Brokerのrestricted browser `safe-payload`をadapterがcandidateとmatchし、watchdog
write/ACK後にdownstream ACKする。その後にobservationをaccept/countし、required mirror/update-context ACKを完了してからexact
one-use `browser-only-released`を受ける。Blocked completionはdecision ACKを待つ。

Exact blocked caseは、participant-shaped nonexact/no-grant/replayならbinding ID/critical、extension、missing-secret
other-host、invalid-secret unknownならN/A/unrelated/false、blocked bundled-SPAならbinding ID/product/prohibited、remaining valid-secret
unknownはbinding ID/critical prohibited tuple。Exact candidate order/correlation/actor/projection/class/boolean/roleを
validateする。

Readiness時、supervisorはsole prepared bindingのrun/subjectをverifyし、fresh `inspectorProcessId`をallocateして
bindingをatomicに`open`へ変更する。Existing `register-product-probe` responseは上記prebuffer/dual-ACK replication/
discovery-context ACK chain後だけ返す。Supervisorはparticipant OS child waitだけからproduct-exitをderiveし、harnessは
terminalization sourceではない。Healthy study-browser-adapterはactual browser
process/context exitをbrowser-exit、defined external browser/bootstrap/environment branchをequipment-failureとしてreportする。Internal
adapter/proxy/controller/DevTools/marker/auth/IPC/implementation/child faultはcleanup+synthesisなしでinvalidateする。Probe
close/EOFをOS child stateとserializeし、already exited=product-exit、still liveかつ4 outcome前=premature、4 outcome+join
0後=normalとする。First committed cause
wins、accepted prefix freeze、pending join no-partial close、state terminalizing、decision fanoutとする。Mapはprematureを
equipment-failure、他をsame名にする。Accepted count 0..4についてremaining fixed orderでmoderatorがmapped context、failure+reviewを
same subject/process（pre-readinessはN/A）でsynthesize/acceptし、harnessはfixed remaining scheduleだけをownする。Accepted rowは
immutableとする。Decision時adapterはbrowser/grant/marker/reservation/candidate/pendingをdestroyするが、adapter/harnessはterminalizing
binding copyをretainする。4件後にsupervisorがclosed snapshotを両方へ送りdual ACKを得てから全join/grant/marker/config/context/
browser/storage/bindingをdestroyしnextを許可する。Normal pathも
4 outcome+probe close+join 0件後にsame close。Evidence process failureはinvalid/no synthesis。Stop/finalizeはlive state 0件。

Duplicate/replayed authenticated candidate/grant IPCまたはclaim、second consume、correlation reuse、wrong run/binding/projection/actor/class/boolean/role/order、
lifecycle termination、close/stop時unmatched、late-after-close inputは
complete runをfailさせる。Fresh no-grant/nonexact/page-script/post-consumption HTTP requestはfresh correlationのblocked observationで
ありinvalidateしない。Incomplete joinはevidence memberをreleaseせずwipeする。Raw valueをbrokerへ入れない。
Direct Inspector-origin correlationはexisting product/server pathを使い、browser-attempt markerを運搬/consumeできない。

### StudyInputManifest

Manifest rootはfreshに構築したobjectであり、exact property orderとcomplete field setを
`manifestVersion`, `bundleRoot`, `inputs`とする。

| Field | Type | Rule |
|---|---|---|
| `manifestVersion` | positive safe integer | Initial valueは`1`。Denominator semanticsの変更時にincrement |
| `bundleRoot` | literal `tests/usability/sc001-sc006-study-inputs/` | `/`で終わり、absolute、backslash、dot-segment、empty-segment、percent-encoded spellingは禁止 |
| `inputs` | exact 16 `StudyInputEntry` record | Unique `inputId`のraw UTF-16 code unit順にsortし、closed roleすべてをnonzero coverage |

各`StudyInputEntry`はfresh objectであり、exact property orderとcomplete field setを
`inputId`, `role`, `path`, `sha256`とする。

| Field | Type | Rule |
|---|---|---|
| `inputId` | nonempty stable ASCII ID | Uniqueとし、localized contentから推論しない |
| `role` | `guidance \| task-prompt \| evaluation-fixture \| prepared-state \| response-form \| ground-truth \| scoring-rubric` | Fixed memberの用途と一致し、両language memberは同じroleを使う |
| `path` | `/`-normalized repository-relative path | Uniqueで、正確に`bundleRoot`とfixed direct-child nameを結合したもの |
| `sha256` | 64 lowercase hexadecimal character | Memberのexact raw byteに対するSHA-256 |

Canonical manifest byteは正確に
`Buffer.from(JSON.stringify(canonicalValue, null, 2) + '\n', 'utf8')`とする。構築でも
比較でもUnicode normalizationを行わず、parse equivalenceではなくbyte equalityをauthorityとする。
Companionはそのbyteのlowercase SHA-256とLF 1つだけを含む。Missing/extra member、directory、
symlink、duplicate ID/path、noncanonical order/byte、unreadable member、role mismatch/empty role、
bilingual omission、digest mismatchはparticipant enrollment前にbundleをinvalidにする。

### StudyCaptureEnvelope

独立streamは`product-instrumentation`, `inspector-server-ledger`, `study-browser`の
exact 3つだけとし、このfixed orderを使う。各streamは独自のwatchdog processとcapture processを
持つ。Watchdogはstreamのcanonical payload fileとenvelope ledgerのsole writerである。
Capture processはclosed `StudyCapturePayload` valueだけをsubmitでき、evidenceのappend、rewrite、
seal、repairを行えない。Authenticated IPC message 1件はそのvalue正確に1件を運び、primary-workflow observation 1件から任意件の
messageを生成でき、watchdogは全件をcount/chainする。

Process startごとにfresh opaque `watchdogProcessRunId`または`captureProcessRunId`を割り当てる。
これらはOS PIDとは別で再利用しない。Logical watchdog/capture instanceにもfresh opaque
`watchdogInstanceId`/`captureInstanceId`を割り当てる。4値と`streamRole`はsole startから
sole stopまで不変とする。Restart/replacementは対応するprocess-run/instance IDを必ず変え、
paired studyをinvalidにする。以前のIDを保持またはcopyしてもrestartをcontinuousにできない。

`StudyCaptureEnvelope`はUnicode normalizationやextra fieldなしでfreshに構築し、次のexact
property orderを持つ。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown versionはfail closed |
| `streamRole` | closed 3-value stream role | Stableでsealed stream slotと一致 |
| `watchdogInstanceId` | opaque instance ID | このlogical watchdog instanceでstableかつunique |
| `watchdogProcessRunId` | opaque process-run ID | 1つのuninterrupted watchdog processでstable、3 stream間でunique |
| `captureInstanceId` | opaque instance ID | Study run内のこのstreamでstableかつunique |
| `captureProcessRunId` | opaque process-run ID | 1つのuninterrupted capture processでstable、3 stream間でunique |
| `sequence` | nonnegative safe integer | Sole startは`0`、以後はprior sequence + 1と正確に一致 |
| `recordKind` | `capture-start \| payload \| heartbeat \| handoff-anchor \| capture-stop` | Closed canonical payload variantを正確に1つselect |
| `monotonicNs` | canonical nonnegative decimal string | Watchdog monotonic clock。`0`以外のleading zeroを禁止し減少しない |
| `priorDigest` | 64 lowercase hexadecimal character | Sequence 0はzero 64個。それ以外はLFを含むprior exact envelope byteのSHA-256 |
| `payloadSha256` | 64 lowercase hexadecimal character | Retainしたexact canonical `StudyCapturePayload` byteのSHA-256 |

Exact envelope byteは
`Buffer.from(JSON.stringify(canonicalEnvelope) + '\n', 'utf8')`とする。Sequence 0はsole
`capture-start`で、`handoff-anchor`はhandoff pair write後かつstop前に正確に1回、`capture-stop`は
正確に1回だけterminalに置く。Handoff/verificationはopen chainをclose/rewriteしない。

### StudyCapturePayload

`StudyCapturePayload`は次のclosed discriminated unionである。各variantはfresh objectとして
構築し、正確に`Buffer.from(JSON.stringify(canonicalPayload) + '\n', 'utf8')`でserializeする。
各rowのkey listをcomplete field setかつexact insertion orderとする。

| Envelope `recordKind` | Exact payload key order | Value rule |
|---|---|---|
| `capture-start` | `schemaVersion`, `eventCode`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `captureProcessReady`, `watchdogReady` | Versionはliteral `1`、`eventCode`はliteral `capture-start`、ready fieldは両方literal `true`。Session/run ID、commitment、lowercase digestは3 streamで共通 |
| `payload` | `schemaVersion`, `eventCode`, `eventId`, `correlationId`, `subjectId`, `inspectorProcessId`, `observationClass`, `actorClass`, `authorityClass`, `requestClass`, `targetClass`, `methodClass`, `capabilityClass`, `originClass`, `effectClass`, `workflowClass`, `outcomeClass`, `automaticIssueCorrelationId`, `reviewDisposition`, `reviewerOneClassification`, `reviewerTwoClassification`, `sameInspectorHost`, `productAttributable`, `prohibited` | Versionはliteral `1`、IDはopaqueまたはexact not-applicable literal、全class/event codeはclosed privacy-safe table由来、最後の3 fieldはboolean。Verifierはretain済みraw dataからこれらを推論しない。Product-attributable observationのprocess N/Aはordered same-run/same-subject terminalization-bound pre-readiness releaseかつworkflow N/Aだけをacceptし、readiness-boundはassigned non-N/A IDを使い、その他/readiness後のproduct N/A rowをinvalidとする |
| `heartbeat` | `schemaVersion`, `eventCode`, `studyRunId`, `watchdogHealthy`, `captureProcessHealthy`, `acceptedPayloadCount` | `eventCode`はliteral `heartbeat`、health fieldは両方literal `true`、run IDはstartと一致、nonnegative safe-integer countはそれ以前のaccepted `payload` record数と一致 |
| `handoff-anchor` | `schemaVersion`, `eventCode`, `studyRunId`, `checkpointRequestId`, `handoffSha256` | `eventCode`はliteral `handoff-anchor`。Run/request IDはsupervisor snapshot/canonical handoffと一致し、lowercase digestはcompanion/exact handoff byteと一致 |
| `capture-stop` | `schemaVersion`, `eventCode`, `studyRunId`, `candidateSha256`, `studyInputManifestSha256`, `checkpointRequestId`, `handoffSha256`, `continuityPassed`, `finalSequence`, `envelopeCount`, `payloadRecordCount`, `heartbeatRecordCount`, `handoffAnchorRecordCount`, `priorEnvelopeSha256` | `eventCode`はliteral `capture-stop`。Run ID/study digest 2件はstart、checkpoint/handoff valueはsole anchorと一致。Continuityはliteral `true`、`handoffAnchorRecordCount`はliteral `1`。`finalSequence`はstop envelope sequence、`envelopeCount`は`finalSequence + 1`、observed total、`2 + payloadRecordCount + heartbeatRecordCount + handoffAnchorRecordCount`のすべてと一致。全kind countはobserved prior recordと一致。`priorEnvelopeSha256`はexact preceding-envelope digestとstop envelopeの`priorDigest`に一致し、verifierがseal前に全valueを独立recompute |

#### Study observation classificationとpseudonym

Closed observation-class fieldは次のとおり。

| Field | Closed values |
|---|---|
| `observationClass` | `request \| mcp \| execution \| inspected-source-mutation \| workflow` |
| `actorClass` | `inspector \| bundled-spa \| browser-extension \| other-host-process \| operating-system \| participant \| unknown` |
| `authorityClass` | `exact-issued \| other-loopback \| remote \| unclassifiable \| not-applicable` |
| `requestClass` | `authorized-static \| authorized-api \| prohibited \| unrelated \| os-mediated \| unclassifiable \| not-applicable` |
| `targetClass` | `static-manifested-asset \| static-spa-shell \| static-client-route-fallback \| api-get-session \| api-get-session-liveness \| api-get-file \| api-post-repository-rescan \| api-get-global-consent-preview \| api-post-global-consent-preview \| api-post-global-enable \| api-post-global-rescan \| api-post-global-disable \| other-loopback \| remote \| mcp \| unclassifiable \| not-applicable` |
| `methodClass` | `get \| head \| post \| other \| unclassifiable \| not-applicable` |
| `capabilityClass` | `valid \| missing \| invalid \| unclassifiable \| not-applicable` |
| `originClass` | `exact-same-origin \| missing \| mismatched \| unclassifiable \| not-applicable` |
| `effectClass` | `none \| unauthorized-request \| command-or-code-execution \| child-process \| mcp-connection \| prohibited-outbound-request \| inspected-source-mutation \| cross-machine-content-exposure \| workflow-blocker` |
| `workflowClass` | `discovery \| inspection \| comparison \| global-consent \| not-applicable` |
| `outcomeClass` | `observed \| success \| failure \| not-applicable` |
| `automaticIssueCorrelationId` | `StudyOpaqueId \| not-applicable` |
| `reviewDisposition` | `not-applicable \| automatic-critical \| reviewer-cleared \| reviewer-confirmed-critical \| reviewer-disagreement-critical` |
| `reviewerOneClassification`, `reviewerTwoClassification` | `not-applicable \| product-caused-blocker \| not-product-caused-blocker` |

全nonworkflow observationはautomatic/review field 4件をliteral `not-applicable`とする。Workflowはsupervisorが
canonical serialization前に各observationへcurrent eligible open workflow、eligible contextなしならpermanent N/Aを
assignする。Accepted tagはimmutableで、source self-declareは禁止する。

Authorized-static requestは下表exact 1 rowとmatchしなければならない。全rowは`authorityClass: exact-issued`、
`requestClass: authorized-static`、`capabilityClass: not-applicable`、`originClass: not-applicable`、
`sameInspectorHost: true`、`productAttributable: true`、`effectClass: none`、`prohibited: false`を要求する。

| `targetClass` | Exact method |
|---|---|
| `static-manifested-asset` | Manifest-listed non-HTML assetへの`get \| head` |
| `static-spa-shell` | `get \| head` to packaged `/`/`index.html` shell |
| `static-client-route-fallback` | Closed client-route fallback 1件への`get \| head` |

Authorized-api requestは下表exact 1 rowとmatchしなければならない。全rowは`authorityClass: exact-issued`、
`requestClass: authorized-api`、`capabilityClass: valid`、`sameInspectorHost: true`、
`productAttributable: true`、`effectClass: none`、`prohibited: false`を要求する。GETは
`originClass: missing | exact-same-origin`だけ、POSTは`originClass: exact-same-origin`だけを許可する。

| `targetClass` | `methodClass` | Exact HTTP contract route |
|---|---|---|
| `api-get-session` | `get` | `/api/v1/session` |
| `api-get-session-liveness` | `get` | `/api/v1/session/liveness` |
| `api-get-file` | `get` | Valid opaque IDを持つ`/api/v1/files/{fileId}` |
| `api-post-repository-rescan` | `post` | `/api/v1/repository/rescan` |
| `api-get-global-consent-preview` | `get` | `/api/v1/global/consent-preview` |
| `api-post-global-consent-preview` | `post` | `/api/v1/global/consent-preview` |
| `api-post-global-enable` | `post` | `/api/v1/global/enable` |
| `api-post-global-rescan` | `post` | `/api/v1/global/rescan` |
| `api-post-global-disable` | `post` | `/api/v1/global/disable` |

他のcross-field combinationはauthorizationされない。次の5行をcomplete product-attributable prohibited
request/MCP effect tableとする。全rowでworkflowはcoordinator exception以外N/A、`outcomeClass: observed`を使い、subject/
process IDはapplicable open browser-attempt bindingまたはregistered product probeから得る。Automatic/review field 4件はN/Aとする。

| Case | Exact classification/boolean |
|---|---|
| Authorized table外のexact-issued request | `observationClass: request`、observed product-attributable `participant \| bundled-spa \| inspector` actor、`authorityClass: exact-issued`、`requestClass: prohibited`、observed closed `targetClass`/`methodClass`/`capabilityClass`/`originClass`、`effectClass: unauthorized-request`、`sameInspectorHost: true`、`productAttributable: true`、`prohibited: true` |
| Other-loopback request | `observationClass: request`、observed product-attributable `participant \| bundled-spa \| inspector` actor、`authorityClass: other-loopback`、`requestClass: prohibited`、`targetClass: other-loopback`、observed closed non-N/A `methodClass`、`capabilityClass: not-applicable`、`originClass: not-applicable`、`effectClass: unauthorized-request`、`sameInspectorHost: true`、`productAttributable: true`、`prohibited: true` |
| Remote request | `observationClass: request`、observed product-attributable `participant \| bundled-spa \| inspector` actor、`authorityClass: remote`、`requestClass: prohibited`、`targetClass: remote`、observed closed non-N/A `methodClass`、`capabilityClass: not-applicable`、`originClass: not-applicable`、`effectClass: prohibited-outbound-request`、`sameInspectorHost: false`、`productAttributable: true`、`prohibited: true` |
| Fully unclassifiable product-correlated request | `observationClass: request`、`actorClass: unknown`、`authorityClass: unclassifiable`、`requestClass: unclassifiable`、`targetClass: unclassifiable`、`methodClass: unclassifiable`、`capabilityClass: unclassifiable`、`originClass: unclassifiable`、`effectClass: unauthorized-request`、`sameInspectorHost: false`、`productAttributable: true`、`prohibited: true` |
| Product MCP observation | `observationClass: mcp`、`actorClass: inspector`、`authorityClass: not-applicable`、`requestClass: not-applicable`、`targetClass: mcp`、`methodClass: not-applicable`、`capabilityClass: not-applicable`、`originClass: not-applicable`、`effectClass: mcp-connection`、`sameInspectorHost: false`、`productAttributable: true`、`prohibited: true` |

Browser-attempt pathはexact initiator decisionをauthorityとする。Extension、missing-secret other-host、invalid-
secret unknownはN/A/unrelated/effect none/false。Participant-shaped nonexact/no-grant/replay/user-activated page-scriptとremaining valid-secret unknownはbinding ID/
critical unauthorized/true、blocked bundled-SPAはbinding ID/applicable product/prohibited tupleとする。すべて
nonworkflow/observed/automatic/review N/Aとする。Observable mounted/mapped backing-store
trafficは`observationClass: request`、`actorClass: operating-system`、`authorityClass: not-applicable`、
`requestClass: os-mediated`、`targetClass: not-applicable`、`methodClass: not-applicable`、
`capabilityClass: not-applicable`、`originClass: not-applicable`、`effectClass: none`、`workflowClass: not-applicable`、
`outcomeClass: observed`、`sameInspectorHost: true`、`productAttributable: false`、`prohibited: false`、両ID
`not-applicable`とし、Inspector requestをauthorized classへ変換しない。Unlisted field value/cross-field combinationは
すべてfail closedにする。

`subjectId`はfresh run-local 43-character base64url random token 20件のexact 1件またはliteral
`not-applicable`とする。`start`でsupervisorがexact 20 tokenを生成/所有してfixed orderを決め、`attempt-binding`ではnext token
だけを渡す。Token-set message/mapping routeは存在しない。Tokenは当該study slot observationだけに許可するpseudonymous evidenceであり、distribution
ID、participant identity、response、browser profile、recruitment、external/re-identifying dataへ結び付けるretained/
external mappingを禁止する。Runtime associationはsupervisorのordered set、current attempt-binding copy、exact at-most-one call-local
`StudyCurrentSubjectScoringContext`だけに限定し、raw scoring inputを含めずdefined boundaryでdestroyする。Exact safe fieldsは上記
automatic/terminalization/stateを含む。Fresh generationがcross-run non-reuse/
unlinkabilityを提供する。Unrelated/OS-mediatedはN/Aとする。

`inspectorProcessId`はfresh run-local 43-character base64url tokenまたはliteral `not-applicable`とする。
Fixed readiness handshake後にparticipant-launched Inspectorごとにtokenを生成し、同launchのcorrelated safe recordは
same tokenを使い、later launchでreuseしない。OS PIDではなく、PID、path、candidate digest、distribution、subject、
process metadataからderiveしない。Bound bootstrap到達前にfailureしたlaunchはproduct observationを作れず、そのsubjectのterminal
workflow record 4件すべてで`inspectorProcessId: not-applicable`を使う。すなわちfailed discoveryに加え、launchがblockされて
workをstartできなかったfailed inspection/comparison/Global-consent recordを作る。ACK済みpre-readiness registration後に
terminalizationした場合に許可するN/A product observationは上記terminalization-bound bufferから順序releaseしたrowだけで、
workflowはN/Aのままとする。Handshake成功時はそのsubjectのterminal workflow record 4件すべてでsame non-
`not-applicable` process tokenを要求する。Token/`not-applicable`のmix、token change、その他N/A product-attributable eventは
runをinvalidにする。

Workflow recordを含められるのは`study-browser` streamだけで、exact 80 terminal recordを含む。Closed 20-token
subject setと4 workflow classのcross productごとに`success | failure` recordをexact 1件持ち、duplicate/extra
subject/workflow pairを禁止する。このexact-set/canonicality checkをsuccess thresholdから独立させる。threshold-failingなvalid
runもfailureをproveできるようcomplete/seal/retainする。Verifierは別途、discovery passをsuccess 19件以上、inspection passを
success 18件以上としてcomputeする。Missはrelease approvalをblockするが、remaining observation、stop、witness、sealを
suppressしない。Comparison/Global-consentは20件すべてのoutcomeをadditional success thresholdなしで記録する。この80 recordは
他authenticated message/observation件数を制限しない。

Scheduleはexactとする。Startはrun-level listener/proxy、orchestrator 2+stream process 6、start/heartbeat 3件だけで、
attempt/profile/context/marker/grant/bootstrapを作らない。Start後、subject 1–19は4 workflowを順に完了しattemptを
destroy後nextへ進む。Subject 20はdiscovery後checkpoint/handoffをsole open attemptとして跨ぎ、continuation後remaining
3件を完了する。Early terminalize済みなら4 row/destroy済みでpost-anchor heartbeatがprogressとなる。Checkpoint時
discovery 20件、binding最多1件とする。Per-attempt equipment/bootstrapはstream start後かつ自身の`npx`/first request
直前、bootstrap candidate/correlation/evidence 0件とする。

全terminal workflow payloadはexact 1つのcross-field tupleを持つ。`eventCode`はliteral `observation`、
`observationClass`は`workflow`、`actorClass`は`participant`、`authorityClass`、`requestClass`、`targetClass`、
`methodClass`、`capabilityClass`、`originClass`はすべて`not-applicable`とする。`workflowClass`/`outcomeClass`は
accepted `StudyWorkflowOutcomeSubmission`と一致し、`sameInspectorHost`/`productAttributable`はliteral `true`、
`prohibited`はliteral `false`とする。Automatic/review field 4件もaccepted submissionと一致する。Successはall N/A/
effect none。Failureはexact review truthを使い、confirmed/disagreementだけ`workflow-blocker`、automatic/clearedは
effect noneとする。`subjectId`はsubmissionに含まれるclosed twenty-token setのmemberとする。
`inspectorProcessId`はsubject launchのready token、またはそのlaunchがreadiness前にfailした場合だけ4 recordすべてで
`not-applicable`とする。`eventId`/`correlationId`はadapter-generated fresh `StudyOpaqueId`で、correlationは
`study-browser`だけに置く。他workflow cross-field combination、caller-supplied event/correlation ID、wrong process-ID variant、
他streamのworkflow recordはrejectする。

#### Safe cross-stream correlation

Logical observationごとにfresh run-local correlation token 1件を割り当てる。下表の各required roleにexact 1 recordを
置き、それ以外のroleに置かない。同correlation内では`correlationId`, `subjectId`, `inspectorProcessId`、全closed
classification、boolean 3件が同一で、`eventId`はretained recordごとにuniqueとする。

| Observation origin | Required stream roles |
|---|---|
| Exact authorized projected `participant \| bundled-spa` requestを`exact-issued`へforward | `inspector-server-ledger`, `study-browser` |
| Browser requestをforward前にblock | `study-browser`だけ |
| `inspector`から`exact-issued`へのrequest | `product-instrumentation`, `inspector-server-ledger` |
| `inspector`から`other-loopback`, `remote`, `mcp`, `unclassifiable`へのrequest | `product-instrumentation`だけ |
| OS-mediated trafficまたはproduct execution、mutation、MCP、その他non-request effect | `product-instrumentation`だけ |
| Participant workflow terminal outcome | `study-browser`だけ |

`study-browser` adapterはNode-built-in deny-by-default local HTTP/CONNECT proxyであり、
`INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY`へbindしてstudy equipment/browser proxy configurationに固定する。
`StudyBrowserProxyMarkerBinding`で定義したexact runtime-only Basic credentialだけをacceptしてconsume/stripし、
authorizing proxy credentialまたは`INSPECTOR_STUDY_CONTROL_TOKEN`由来valueをacceptしない。Safe classification後、valid-
secretのexact authorized participant/SPA exact-issued loopback requestだけをforwardし、他はordered decision tableで
blockする。Secret validityはactor/product/application/control/forwardingをauthorizeしない。

Eligible browser requestではproxyがexact `X-Inspector-Study-Correlation`をparticipant grant correlationまたはadapter-
generated SPA candidate correlationでcreate/replaceする。Inspector-side single-file probeはapplication handling前にstripし、
exact claimをbrokerへsubmitする。Timer-free supervisor brokerはsole authenticated `candidate-forward` acceptance→forward、claim
validate/join→restricted browser/server両`safe-payload` downstream ACK→observation accept/countとmirror/update-context ACK→
`joined-pair-released` decision ACK→claim ACK/application/response completionの順をenforceする。Blocked candidateはbrowser
`safe-payload` downstream ACK→observation accept/countとcontext ACK→`browser-only-released` decision ACK→completionとする。Direct
Inspector HTTPはexisting two-product-role pathを使う。Blocked caseまたはextension/
other-host/unknown actorにはclaimを許さない。Missing pair、duplicate/replay、projection/tuple mismatch、unexpected
role/order、pending中のenumerated lifecycle termination、close/stop時unmatched、late input、stop/finalize時residual
binding/pending/marker/context/processはrunをinvalidにしpartial pairをemitしない。Elapsed timeだけではjoinへ影響しない。
Raw method/path/authority/URL/marker/projection/correlation-header representation/capability/bodyはIPC前にdiscardする。
Strictly decoded canonical 43-character correlation stringだけをsafe IPC/evidenceとrequired digest chainへ置ける。

1秒はnominal watchdog scheduling cadenceでありacceptance maximumではない。Watchdogはこのcadenceで
heartbeatをscheduleする。Heartbeat continuity gapはexactにstart-to-first-heartbeat、consecutive-heartbeat、
latest-heartbeat-to-checkpoint/handoff、last-heartbeat-to-stopの4つとし、それぞれ1,500,000,000 monotonic
nanosecond以下でなければならない（MUST）。全envelopeの`monotonicNs`は`payload` envelopeを含めて
nondecreasingとするが、intervening payloadはheartbeat endpointをresetせず、over-limit gapをmaskできない。
したがってscheduling testはnominal 1秒、continuity verificationは明示したmaximum 1.5秒を使う。

Writer boundaryを越えてhash/retainできるのはcanonical privacy-safe payload byteだけとする。Raw header name/
case/order/framing/wire/encoded/whitespace/duplicate layout、noncanonical/alternate derived header value、request/
response body、inspected/authored content、path/name、capability、URL、authority、raw error、participant responseを
payload/envelope/sidecar/evidenceへ入れない。Sole retained header-derived exceptionはstrict decode/canonical re-
encodeした43-character `correlationId`で、provenanceはcontract-defined protocol ownerでありcanonical payload/stream/
handoff/witness/seal digest chainへ入る。Separate marker secretはexact install-frame HMACとephemeral equipment
configurationだけのruntime exceptionとする。他禁止valueをencode/normalize/redact/hashしてもsafeにならない。

### StudyCaptureHandoff

Independent checkpoint verifierだけが`StudyCaptureHandoff`とcompanionを作成する。Supervisorは各adapter経由でexact
`checkpoint` stream controlをbyte-identical relayし、各sole writerにimmutable prefix position/monotonic value 1件をatomic
snapshotさせる。Watchdog resultをadapterがbyte-identical reverse relayし、supervisorはmatching result 3件をmemoryでretainする。
Append queue/heartbeat emissionをpauseせず、handoffをserializeしない。Rootのexact property orderは`schemaVersion`, `controlSessionId`,
`studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`,
`studyInputManifestSha256`, `checkpointRequestId`, `streams`とする。Versionはliteral `1`、session/request/run ID、
commitment、digestはstart/supervisor stateと一致し、`streams`はfixed 3-role orderを使う。

各`StudyCaptureHandoffStream`のexact orderは`streamRole`, `watchdogInstanceId`, `watchdogProcessRunId`, `captureInstanceId`,
`captureProcessRunId`, `checkpointSequence`, `checkpointMonotonicNs`, `envelopeCount`, `payloadRecordCount`, `heartbeatRecordCount`,
`lastEnvelopeSha256`, `latestHeartbeatSequence`, `latestHeartbeatMonotonicNs`, `latestHeartbeatEnvelopeSha256`, `running`, `sealed`とする。

| Field group | Rule |
|---|---|
| Role/4 ID | Verified prefixの全envelopeにあるimmutable valueと一致 |
| `checkpointSequence` / `envelopeCount` | Nonnegative safe integer。Sequenceはverified prefix最後のenvelope、countはsequence plus one |
| `checkpointMonotonicNs` | Watchdogがatomic sampleするcanonical nonnegative decimal。Prefixのlast envelopeより前でなく、latest heartbeatから1,500,000,000 ns以内 |
| Kind count | Verified prefixのobservation/heartbeat record countと一致 |
| `lastEnvelopeSha256` | Verified prefixのexact final envelope line digest |
| Latest-heartbeat field | Prefixのactual latest heartbeat sequence、monotonic value、exact-envelope digestを識別 |
| `running` / `sealed` | Literal `true` / literal `false` |

Handoff byteはpretty canonical serializerを使い、companionはそのexact byteのlowercase SHA-256とLF 1件とする。Verifierはlater pairが
appendを続ける間もimmutable prefixをreadでき、handoff構築時はlater pairを無視しなければならない。両fileをwrite/re-readした後、
同じverifierがexact `checkpointRequestId`/`handoffSha256`をruntime control `anchor-handoff`でsendする。Supervisorは各byte-
identical adapter relay経由でmatching stream controlを送り、各watchdogはstill-growing chainへcanonical `handoff-anchor` pairを
exact 1件appendし、exact resultをbyte-identical reverse relayで返す。Verifierはresult/anchor 3件すべてをwait/validateしてから
`verify -- checkpoint`をsuccessにし、heartbeat/payload appendをblockしない。

Continuationはhandoff file 2件、complete checkpoint prefix、全intervening pair、sole anchorをverifyする。各streamのfirst
later envelopeは全same ID、checkpoint sequence plus one、`lastEnvelopeSha256`と同じ`priorDigest`を要求し、anchorはalready-queued
post-prefix pairの後でもよいがstop前にexact 1件だけ置く。Replacement、alternate-valid-prefix rewrite、handoff rewrite、
missing/duplicate/mismatched anchor、stale barrier、extra field、mismatch、noncanonical byteはpaired studyをinvalidにする。
Valid prefix/handoffを別valid digestへrewriteしてもsupervisor-retained anchor bindingはrewriteできない。

### StudyContinuityWitness

Final verifierだけが、supervisor-observed adapter exit 3件、accepted adapter-observed watchdog exit attestation 3件、supervisor-
observed orchestrator exit 2件、accepted moderator-observed reviewer exit attestationすべてをvalidateし、supervisorがexternal
listener/socketをremoveした後にauthenticated witnessを受け、
そのremoveを独立にproveしてreconnect attemptがfailした後に`capture/study-continuity-witness.json`とcompanionを書く。Fresh canonical rootの
exact property orderは`schemaVersion`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`,
`candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `checkpointRequestId`,
`handoffSha256`, `processes`, `orchestrators`, `ephemeralReviewerProcessExitCount`,
`runtimeControlRemoved`とする。

| Field | Rule |
|---|---|
| `schemaVersion` | Literal `1` |
| ID、commitment、digest | Capture start、handoff、supervisor state、independently revalidated current binding、exact canonical handoff byte/companionと一致 |
| `processes` | Fixed stream-role orderごとにwatchdog、次にcaptureを置くexact 6 entry。Identityはaccepted registrationと一致し、watchdog exitはmatching adapter parent-OS attestation、capture/adapter exitはsupervisor direct OS observationを根拠とする |
| `orchestrators` | `study-harness`, `scoring-moderator`のexact 2 entry。Exact root `processRole`, `componentRunId`, `exitCode`, `signal`、start ID一致、supervisor-direct exit `0`/`null` |
| `ephemeralReviewerProcessExitCount` | `reviewVoteCount`とexact equalなnonnegative safe integer。各distinct one-use collectorにmoderator parent-OS observation由来のregistered/clean-exit attestationがありoutcome前にACK済み、live/replaced collectorなし |
| `runtimeControlRemoved` | Literal `true`。Write前にverifierもendpoint disappearanceを独立証明 |

各process entryのexact property orderは`streamRole`, `processRole`, `instanceId`, `processRunId`,
`stopEnvelopeSha256`, `exitCode`, `signal`とする。`processRole`は`watchdog | capture`、IDはuninterrupted stream
envelope/supervisor launch recordと一致し、`stopEnvelopeSha256`は当該streamのexact terminal envelope digest、
`exitCode`はliteral `0`、`signal`はliteral `null`とする。6 combinationをexact 1回ずつ置き、open、replacement、
restarted、signalled、unknown、nonzero-exit stateはwitness output前にfailさせる。
Supervisor-observed adapter exit 3件、accepted adapter-observed watchdog exit 3件、supervisor-observed orchestrator exit 2件が
stop前のexact 8 long-lived clean exit factとなり、supervisor-OS-observed grandchildとは主張しない。

Witness byteはexact `Buffer.from(JSON.stringify(canonicalWitness, null, 2) + '\n', 'utf8')`、companionはその
byteのlowercase SHA-256とLF 1件とする。Path、PID、endpoint、token、challenge、key、identity tuple、raw exit text、
runtime handle、retention handleを含めず許可もしない。Failed/partial finalizationはwitness/sealをどちらもwriteしない。

### StudyCaptureSeal

`StudyCaptureSeal`はexact 20-subject-by-4-workflow terminal set完了後、各streamがvalid terminal
`capture-stop`を持ち、verifierがcontinuity witness、watchdog/capture process 6件、orchestrator 2件、全ephemeral
reviewer processのclean terminationを
validateした後だけ作る。Fresh canonical objectのexact root orderは`schemaVersion`, `controlSessionId`,
`studyRunId`, `workRootIdentityCommitment`,
`candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `handoffSha256`,
`continuityWitnessSha256`, `automaticCriticalIssueCount`, `suspectedWorkflowBlockerCount`,
`reviewVoteCount`, `reviewDisagreementCount`, `reviewerCriticalIssueCount`, `criticalIssueCount`,
`zeroCriticalIssueGate`, `streams`とする。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown versionはfail closed |
| `controlSessionId` | opaque ID | Capture start、handoff、witness、one uninterrupted supervisor sessionと一致 |
| `studyRunId` | opaque ID | 全start payloadと一致し、rerunで再利用しない |
| `workRootIdentityCommitment` / `candidateIdentityCommitment` | lowercase HMAC-SHA-256 | Capture start、handoff、witness、supervisor-verified current runtime identity tupleと一致 |
| `candidateSha256` | lowercase SHA-256 | 全start payloadおよびexact installed candidateと一致 |
| `studyInputManifestSha256` | lowercase SHA-256 | 全start payloadおよびverified canonical manifest companionと一致 |
| `handoffSha256` | lowercase SHA-256 | Handoff pair、anchor payload 3件、stop payload 3件、witnessと一致し、handoff/witnessがone checkpoint request IDをbind |
| `continuityWitnessSha256` | lowercase SHA-256 | Exact canonical witness byte/companionと一致 |
| Critical aggregate field 7件 | nonnegative safe integer 6件+boolean | 下記tagged/deduplicated equationからindependent recompute |
| `streams` | exact 3 `StudyCaptureStreamSeal` record | Fixed stream-role order。Missing/extra/duplicate/reordered roleは禁止 |

Nonworkflow `prohibited: true` rowのdistinct correlationごとにtagged automatic issue ID
`automatic:<correlationId>`を1件作る。Workflow-N/A pre-readiness observationとsuccess workflowのcandidate observationも
setに残し、link使用/不使用でsuppress/duplicateしない。Dispositionが`reviewer-confirmed-critical |
reviewer-disagreement-critical`のworkflow rowごとにtagged reviewer issue ID
`reviewer:<subjectId>:<workflowClass>`を1件作る。Prefixにより2 classはdisjointで、各class内もIDでdedupeする。
Automatic set cardinalityを`A`、dispositionが`reviewer-cleared | reviewer-confirmed-critical |
reviewer-disagreement-critical`のworkflow row countを`S`、disagreement countを`D`、reviewer issue set cardinalityを
`R`とする。`automaticCriticalIssueCount=A`、`suspectedWorkflowBlockerCount=S`、`reviewVoteCount=2*S`、
`reviewDisagreementCount=D`、`reviewerCriticalIssueCount=R`、`criticalIssueCount`はtagged automatic/reviewer set
unionのcardinality（disjointのため`A+R`）とする。`automatic-critical` workflow rowはreviewer issue IDを作らず、
separate automatic correlationだけがcountされ、automatic disposition linkはaccepted observation ruleに一致する。
Threshold miss、reviewer-clearedはcritical countへ
入らない。`zeroCriticalIssueGate`は`criticalIssueCount===0`かつexact 20×4 terminal workflow set completeの場合に
限りliteral `true`とする。Protocol/review errorはsealをpreventする。

各stream sealのexact property orderは`streamRole`, `watchdogInstanceId`,
`watchdogProcessRunId`, `captureInstanceId`, `captureProcessRunId`, `envelopeCount`,
`payloadRecordCount`, `heartbeatRecordCount`, `handoffAnchorRecordCount`, `firstEnvelopeSha256`,
`lastEnvelopeSha256`, `streamRootSha256`とする。

| Field | Type | Rule |
|---|---|---|
| IDと`streamRole` | 当該streamの全envelope由来value | すべてconstantで、必要な範囲でunique、fixed stream slotと一致 |
| `envelopeCount` | positive safe integer | Terminal sequence + 1およびretain済みenvelope/payload pair数と一致 |
| `payloadRecordCount` | nonnegative safe integer | Observeした`recordKind: payload` record数およびterminal payloadのdeclared countと一致 |
| `heartbeatRecordCount` | positive safe integer | Observeしたheartbeat record数およびterminal payloadのdeclared countと一致 |
| `handoffAnchorRecordCount` | literal `1` | Sole canonical anchorおよびterminal payloadのdeclared countと一致 |
| `firstEnvelopeSha256` | lowercase SHA-256 | LFを含むexact sequence-0 envelope byteのdigest |
| `lastEnvelopeSha256` | lowercase SHA-256 | LFを含むexact terminal envelope byteのdigest |
| `streamRootSha256` | lowercase SHA-256 | Sequence順の各pairについて`envelopeBytes`、次に`safePayloadBytes`を並べたnonempty concatenationのSHA-256。Pair-by-pair verificationの代替としてacceptしない |

Seal byteは正確に`Buffer.from(JSON.stringify(canonicalSeal, null, 2) + '\n',
'utf8')`とする。Companionはそのexact byteのlowercase SHA-256とLF 1つだけを含む。Release
verifierはderived fieldをtrustせず次のとおりreconstructする。

| Verification stage | Required recomputation | Failure condition |
|---|---|---|
| Bundle closure | `bundleRoot`をenumerateし、全entry digestとcanonical manifest/digestをrebuild | Exact 16-member set、bilingual pair、role、byte、digestからの逸脱 |
| Payload privacy/canonicality | Kind固有safe objectをreconstructしてexact byte/digestを比較 | Unknown/extra field、noncanonical byte、禁止raw value、variant mismatch、digest mismatch |
| Per-stream identity/chain | 全envelope、sequence、prior-envelope digest、payload digest、全envelopeのnondecreasing monotonic order、payload maskingなしのexact 4 heartbeat gapをrebuild | ID/role change、over-limit gap、regression、missing/duplicate/reorder、truncation、restart、stitch、payload-masked liveness failure |
| Handoff anchoring | Handoff pairをrecomputeし、各streamのmatching anchor 1件とsupervisor anchor stateを比較してalternate valid prefix/handoffをreject | Missing/duplicate/reordered anchor、anchor/handoff mismatch、prefix rewrite、post-anchor handoff replacement |
| Terminal closure | Sole start/sole handoff anchor/sole terminal stopを要求し、stop study/handoff binding、preceding-envelope digest、final sequence、total/kind/anchor count、continuity、exact count/root、supervisor-direct adapter exit 3件、accepted adapter-OS watchdog exit attestation 3件、supervisor-direct orchestrator exit 2件、moderator-OS-attested `ephemeralReviewerProcessExitCount === reviewVoteCount`をrecompute | Premature/missing stop、stop/witness binding mismatch、exit source/cardinality/equation mismatch、open process、replacement、non-clean exit、stop後append |
| Cross-stream seal | Sealed ledgerからtagged issue union/aggregate 7件をindependent recomputeし、同一session/study/identity/candidate/manifest/handoff/witness valueからfixed 3 stream seal/root sealをrebuild | Missing/extra/reordered stream、session/run/commitment/digest/count/aggregate mismatch、noncanonical seal、derived-field mismatch |

Failed/partial streamのreplace、concatenate、cross-stream stitchは禁止する。Failureが1つでもあればcomplete
SC-001/SC-006 evidence pairをinvalidとし、新しいprocess-run/instance/study-run IDでfresh study runを要求する。

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

### Tool固有Global source

```text
0 source -- consent preview --> 0 source（Source/I/Oなし）
0 source -- registered initial enable --> globalEnableInProgress。凍結済みentry 3件をoperation-localにvalidate
0 admitted root -------------> active-no-job（active control、Source/generationなし）
1..3 admitted root ----------> buffer-bound queued acceptance + batchStatus(waiting/id) --> running --> 全ready/partial Sourceを含む1 atomic Global generation
                                                                            \-> failed（tool failureまたはfailed requestのerror、同じID）
exact retryable subset ------> 同じbuffer-bound batch lifecycle。Lexical-ineligible controlはdisable/new previewが必要
予期しないaccept前throw/rejection --> ordinary request error。Transaction由来のsubset Source/generationなし
ready/partial -- accepted per-source rescan --> scanning --> ready/partial
                                                       \-> failed/stale（own entryを作成）
failed/stale -- accepted per-source rescan --> scanning --> ready/partial（own entry + diagnosticをclear）
                                                       \-> failed/stale（own entry + diagnosticを置換）
active Global control（0..3 Source） -- disable --> disabling barrier --> inactive / 0 Source（Global sequenceをdiscardし、何もcommitしない）
                                                                    \-> failed + retained error --> retry disable
initial enableだけ -- disable --> cleanup-only barrier --> inactive / 0 Source（committed state不変）
                                                \-> failed + retained error --> retry disable
```

Enableには一致する`GlobalConsent`が必要。DisableはCoordinator barrierを実行してGlobal sequence全体をdiscardする。
すなわちtool固有Global file、generation diagnostic、control所有lifecycle diagnostic、comparison、source textをすべて削除する。
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

1. Generation scopeの全DTOは1つのsessionと所属sequenceの最後にcommit済みgenerationに属し、置換済みgenerationのIDは
   固定の`stale-resource` rejectionを返す。Commitは自sequenceのIDとviewだけをrekey/invalidateする。
   Fatal attemptはpublic IDを作らず、保持generationのIDを変えない。
2. BootstrapからRepository Sourceは正確に1つ存在し、そのboundaryは選択済みRepository root、すなわちdefaultでは
   captureした呼び出し時のexact `process.cwd()`、指定時はそれに対してresolveした単一の`--cwd` valueである。
   Git rootである必要はなく、labelはread authorityを与えない。
3. Globalは全新processでdisabledである。SessionはGlobal Sourceを0から3つ持ち、Copilot、Claude、Codexごとに
   最大1つとする。各Sourceはcurrent allowlistで同じtoolについてconsent済みのboundaryを正確に1つ所有する。
4. Accepted file pathは、そのSource root配下で同梱したstaticまたはtyped derived ruleによりadmitされる。
   Parsed valueがcandidateをadmitできるのはその正確なderivation ruleを満たす場合だけで、
   relationship/excluded ruleは決してadmitしない。Client供給のpath stringはreadを認可しない。
   Filesystem operationはraw entry-name segmentを使い、NFC segmentはdisplay専用とする。Global traversalはconsent-bound
   `TraversalPlan`に表されたexact operationだけを行う。
5. Discovered fileはSource/generationごとに、Source-relative Pathで識別する1つの`CustomizationFile`と、
   tool/kind pairごとに最大1 recognitionを持つ。Distinctなpathはdistinctなinventory itemであり、
   physical-identity groupingは存在しない（FR-024、FR-019）。異なるSource、attempt、generationは独立してreadする。
6. 全readable file DTOは完全なauthored `sourceText`を返し、返却する宣言済みmetadata値とauthored relationship targetは
   validated済みの正確なUTF-16-indexed `String.prototype.slice`とする。Documented defaultはauthored textをnull、
   originを明示する。Metadata/relationship/derivationは1 exact occurrence rangeを再利用できるが、distinct originは
   overlapできない。Comparisonはauthored sliceと`(tool, kind, fieldId, occurrence)`を使い、semantic decode後もauthored literalの差を
   保持する。Environment referenceはliteralのままでprocess environmentのlookup/substitutionを
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
   generationを越えてsourceを保持しない。Source/comparison surfaceはauthored content表示前にsessionの
   sensitive-content noticeを提示してin-memory acknowledgementを受け取ってから、同梱SPAがdetail contentをrequestまたは
   comparisonを構築する。Acknowledgementはpresentation専用でaccess-control factorではなく（FR-027）、session APIは
   loopback-bound local host経由でだけ到達可能で、acknowledgementを受信も永続化もしない。Lifecycle-triggered liveness checkと中央purgeは、browser/network/runtime failure、
   session mismatch、hidden/page lifecycle eventによってsession lossを観測した時点でapplication保持session contentをすべて除去し、
   product固有のtime thresholdを定義しない。Generation replacementは
   `clientDataEpoch`をincrementし、responseから旧generationを復活させない。
12. 全behavior、rule、strategy、source IDは、所有するbilingual contractとexecutable registryで正確に1回だけ
    定義する。Registryの`sourceRefs` arrayは所有rowのdirect Evidence cellと一致し、official-source逆引きindexと
    相互一致する。Runtime provenance/relationship DTOは表示用にこれらdirect recordのdeterministic unionを公開してよいが、
    そのderived unionはregistry backlinkを変更しない。`evidenceAssessments`はowning ruleと全referenced behavior/strategyごとに正確に1 recordを持ち、
    各recordのdocumentation status/lifecycle qualifierを上記fixed orderで保持する。Missing、duplicate、orphan、language-divergentなrecordは
    buildをfailさせる。
13. Vendor lookup base/traversalとInspector matcherは別record typeである。全Repository matcherは`./`で始まり、
    bare `**/`はinvalidとする。`./**/`は明示的な下向きInspector inventoryだけを意味し、vendor traversalや
    runtime selectionを意味しない。
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
18. Syntax parsing、exact authored-literal extraction、mechanical typed decoding、frozen-catalog classification、
    documented structural projectionだけを解釈operationとして許可する。DTO/internal projectionはnatural-languageの
    interpretation/ranking、customization validity/correctness/effectiveness/compliance/quality、policy/remediation advice、
    lint/sync/convert/format/fix behavior、size-based valid/invalid verdictを表現できない。
19. Coordinatorはscanをserializeする。Global disableはpublication authorityをrevokeするpriority barrierであり、
    disable/shutdown後のlate resultはpublishできない。
20. 全source scanはSource、progress、attempt、response、およびcommitしたscan generationで共有する1つの
    `scanRequestId`を持つ。Disable/shutdown revoke後のlate resultはpublishできず、物理的なkernel-I/O cancellationは主張しない。
21. Release usability evidenceはclosedかつprivacy-safeとする。Canonical manifestはexact 16-member bilingual
    `StudyInputBundle`をすべてcoverし、exact 3 capture streamは1つのstudy run、candidate digest、manifest digestへ
    bindする。さらにone control sessionとruntime identity commitment 2件へbindする。Closed canonical
    `StudyCapturePayload` byteだけをretain/hashし、禁止raw valueをevidence artifactまたは
    digest preimageへ入れない。20件すべてのparticipant distributionをbyte-identicalな`study-inputs/`とdescriptor-completeな
    `repository/` namespaceだけにcloseし、descriptor-bound repository scriptだけでmaterializeして、exact closed output path、
    encoding、byte representation、digestからindependentにrecomputeする。Unmanifested byte、extra namespace、
    file-identity/path aliasを一切許可しない。Release approvalには、3つのterminal stop、supervisor-direct adapter exit 3件、
    accepted adapter-OS watchdog exit attestation 3件、supervisor-direct orchestrator exit 2件というexact 8 long-lived clean exit fact、
    distinct ephemeral reviewerの全moderator-OS attested clean exitとexit count=review-vote count、
    verified runtime-control teardown後に、全payload/envelope chain、handoff、
    streamごとのanchored handoff digest exact 1件、exact 80 subject/workflow terminal record、
    `StudyContinuityWitness`、cross-stream `StudyCaptureSeal`をrecomputeすることを要求する。Missing、extra、
    drifted、aliased、noncanonical、restarted、unclosed、privacy-unsafe、stitched
    evidenceはcomplete paired studyをinvalidにする。
