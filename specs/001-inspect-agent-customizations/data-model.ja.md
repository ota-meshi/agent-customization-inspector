# Data model: エージェントカスタマイズの調査

[English](data-model.md)

Modelには2つの表現がある。

- **Internal session record**はcanonical path、上限付きread中のfile descriptor、raw byte、atomic snapshot
  構築中のdecoded authored contentを含み得る。Operational diagnosticとlogには入れない。
- **Public DTO**はSource-relative Path、readable fileの完全なauthored source text、返却するexactな宣言済み
  metadata/relationship source slice、recognition、relationship、diagnostic、generation scopeのopaque IDを含む。Authored content内の
  環境変数参照はliteral textのままとし、process environment値をreadする権限を与えない。

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
│   ├── SourceBoundary（正確に1つ） → InspectionRootContext（internal）
│   └── SourceConditionFact（0以上。起点fileなし）
├── Source（Globalを0から3つ。support対象toolごとに最大1つ）
│   ├── SourceBoundary（admit済みtool homeを正確に1つ） → owning GlobalToolControl
│   └── SourceConditionFact（0以上。起点fileなし）
├── ScanAttempt（queuedを0以上、runningを最大1つ。commit前は非公開）
├── ScanGeneration（session-wideで最後にcommit済みのものを正確に1つ）
│   └── CustomizationFile
│       ├── ScanEntryTicket + VerifiedReadReceipt（internal）
│       ├── ToolRecognition（1つ以上）
│       │   ├── DeclaredMetadataEntry（0以上。authored occurrence順）
│       │   └── CandidateProvenance（1つ以上）
│       │       └── ApplicabilityAssessment
│       ├── Relationship（0以上）
│       │   └── ApplicabilityAssessment
│       └── Diagnostic（0以上）
├── StaleSourceFailure（未解決の明示rescan失敗を0から4件）
├── GlobalConsentPreview（current lexical previewを0または1つ）
├── GlobalConsent（active recordを0または1つ）
│   ├── GlobalToolControl（confirmed toolごとに1つ。任意のInspectionRootContextを所有）
│   └── GlobalControlView（recover可能なpublic control DTOをnullまたは1つ）
├── GlobalEnableOperation（running/queued cancellable commandを0または1つ。internal）
└── Diagnostic（session/source level failure）

BrowserState
├── FilterState
├── ComparisonSelection（0またはreadable fileを正確に2つ）
├── EditorModelState（0以上。active route/generationのみ）
├── SensitiveContentNoticeState（session内だけのpresentation state）
├── RecoveryViewState（control-onlyなpurge後recoveryと明示resume）
└── SessionLivenessState（authorized pageのheartbeat/purge state）
```

## Entity

### InspectionSession

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `sessionId` | opaque string | DTO | Processごとにrandom。API capabilityではない |
| `apiVersion` | literal `1` | DTO | 非互換clientを拒否する |
| `createdAt` | `UtcTimestamp` | DTO | Process開始時刻 |
| `sources` | `Source[]` | DTO | Repositoryを正確に1つ、Globalを0から3つ。Copilot、Claude、Codexごとに最大1つ |
| `activeGeneration` | `GenerationNumber` | DTO | 最後にcommit済みのsnapshotを識別し、completeまたはbounded-partialの正常commit時だけ単調増加 |
| `snapshotState` | `current \| stale-after-fatal-rescan` | DTO | `staleFailures`から派生し、未解決の明示rescan失敗が1件以上ある間だけstale |
| `staleFailures` | `StaleSourceFailure[]` | DTO | Published Sourceごとにcurrent entryを最大1件、合計最大4件。Source順にsortし、`snapshotState`がcurrentの間だけ空 |
| `liveness` | `{ heartbeatIntervalMs: 1000, requestTimeoutMs: 750, leaseDurationMs: 2000 }` | DTO | Authorized pageの固定liveness protocol。Liveness response成功ごとにcurrent browser-memory leaseだけをrenew |
| `globalControl` | `GlobalControlView \| null` | DTO | Active consent/control stateがない場合だけnull。Canonical rootを公開せず、purge後のfresh authenticated clientが即時disableとpreview-gated retry controlをrecoverできる |
| `limits` | `ResourceLimits` | DTO | 助言値ではなく実際にenforceする正確なlimit |
| `sensitiveContentWarning` | `{ messageKey, nextStepKey, acknowledgementScope }` | DTO | Source/comparisonを開く前にcomplete authored contentが機密値を含み得ると固定localized keyで説明し、scopeはliteral `authorized-browser-session` |
| `sessionDiagnosticIds` | opaque string[] | DTO | 1,024件のsession limit内で受理したout-of-generation lifecycle diagnostic |
| `capability` | 256-bit random token | internal | Constant-time比較。snapshot/logへserializeしない |

Sessionはlaunch processの`cwd`から作成する。Process開始時にfile/diagnosticが空のzero-I/O bootstrap
generation 0とenabled/idle Repository sourceをpublishし、Global Sourceはまだ作らず、最初のRepository scanを
自動queueする。Repository picker、ancestor search、profile、cache、resume identifierは持たない。

`UtcTimestamp`はvalidなcalendar fieldを持つ`YYYY-MM-DDTHH:mm:ss.sssZ` formのexact 24-byte ASCII UTC valueとし、
このmodelでtimestampと呼ぶ全fieldが使う。`GenerationNumber`は`0`から`Number.MAX_SAFE_INTEGER`
（`9,007,199,254,740,991`）までのintegerとする。次にこの値を超えるcoordinator operationはmutation前に固定process-restart
errorで拒否する。

### ResourceLimits

| Field | 値 | Limit時の動作 |
|---|---:|---|
| `maxFileBytes` | 1 MiB | 上限を越えてreadせずinventory itemをdiagnostic付きで保持 |
| `maxTotalFileBytes` | 32 MiB | Bounded partial generationをpublish |
| `maxVisitedEntries` | 200,000 | 決定的にenumeration停止 |
| `maxCustomizationFiles` | 2,000 | 新candidate acceptance停止 |
| `maxPathSegments` | 64 | より深いentryをdiagnostic付きでskip |
| `maxAliasPathsPerFile` | 1,024 | Primary identityを保持し、alias受理を停止してpartial/diagnosticを作る |
| `maxAliasPathsPerGeneration` | 50,000 | Deterministicなfile/path順でalias受理を停止し、partial/diagnosticを作る |
| `maxRecognitionsPerFile` | 36 | Closedなtool/kind pairごとに最大1 recordとし、そのfileの後続recognition extractionをfail closed |
| `maxRecognitionsPerGeneration` | 8,000 | Deterministicなfile/tool/kind順でrecognition受理を停止し、partialをpublish |
| `maxDirectRelationshipsPerFile` | 1,000 | Stable extractor orderの先頭1,000件を保持し、diagnostic付きpartialをpublishしてrelationshipを追跡しない |
| `maxRelationshipsPerGeneration` | 100,000 | Stable global順でcomplete relationship recordの受理を停止し、partialをpublish |
| `maxProvenancesPerRecognition` | 2,000 | 追加admissionの受理を停止し、partial generationとdiagnosticを作る |
| `maxCandidateProvenancesPerGeneration` | 100,000 | Stable global順でcomplete provenance recordの受理を停止し、partialをpublish |
| `maxDerivedTargetsPerSeed` | 128 | Stable typed-extractor順の先頭128 distinct validated targetを保持し、次のtargetでseedを停止、partialをpublishしてdiagnostic candidateを渡す |
| `maxDerivationDepth` | 1 | Bounded-derived provenanceは別derived edgeのseedになれない |
| `maxFallbackBasenamesPerConfig` | 16 | それ以降のCodex fallback valueをlimit diagnostic付きで拒否 |
| `maxFallbackBasenameBytes` | 128 UTF-8 byte | 個別のCodex fallback valueを拒否 |
| `maxParseDepth` | 64 | 対象recognitionのextraction resultを破棄しpartial diagnosticをpublish |
| `maxParseNodes` | 50,000 | 対象recognitionのextraction resultを破棄しpartial diagnosticをpublish |
| `maxScalarBytes` | 64 KiB UTF-8 | Exact authored-literal source sliceとinternal typed semantic valueへ独立に適用し、いずれかが超過したらrecognitionのextraction resultを破棄してmetadata、relationship、derivationに値を残さない |
| `maxMetadataEntriesPerRecognition` | 512 | Lossyなprefixを返さず対象recognitionのextraction result全体を破棄 |
| `maxMetadataEntriesPerGeneration` | 100,000 | 次のrecognitionのextraction result全体を拒否し、partialをpublishしてそのrecognitionのprefixを保持しない |
| `parseTimeBudgetMs` | recognitionごと2,000 | Parser workerをterminate/replaceし、完全なreadable source textとdiagnosticを保持するがpartial metadata extractionは保持しない |
| `maxParserWorkers` | 2 | 別workerを作らずbounded parser jobをqueue |
| `parserWorkerMaxOldGenerationMiB` | 64 | WorkerのV8 old-generation resource limitを設定し、超過したrecognition resultを破棄 |
| `parserWorkerMaxYoungGenerationMiB` | 16 | WorkerのV8 young-generation resource limitを設定し、超過したrecognition resultを破棄 |
| `parserWorkerStackSizeMiB` | 4 | WorkerのV8 stack resource limitを設定し、超過したrecognition resultを破棄 |
| `maxParserMessageBytesPerRecognition` | 2 MiB | Host保持前にworker messageを拒否し、そのrecognition extractionをatomicにfailure |
| `maxParserMessageBytesPerGeneration` | 32 MiB | Deterministic順の後続recognition parse dispatchを停止し、partialをpublish |
| `maxRetainedGraphBytes` | 64 MiB | 次のcomplete graph record保持前に停止し、partialをpublishしてpartial recordを保持しない |
| `maxSourceConditionFactsPerSource` | 256 | 無効な同梱registryをscan前に拒否し、既知limitationをtruncateしない |
| `maxConditionFactsPerAssessment` | 64 | 既知factをtruncateせず、無効なregistry emitterをscan前に拒否 |
| `maxDiagnosticsPerFile` | 128 | 最終slotをfile-limit sentinel用に予約し、overflow時は後続detailを抑止してpartialをpublish |
| `maxDiagnosticsPerSource` | 5,000 | 最終slotをsource-limit sentinel用に予約し、overflow時は後続detailを抑止してpartialをpublish |
| `maxDiagnosticsPerGeneration` | 10,000 | 最終slotをgeneration-limit sentinel用に予約し、overflow時は後続detailを抑止してpartialをpublish |
| `maxDiagnosticsPerSession` | 1,024 | Out-of-generation lifecycle diagnosticを制限し、固定failure slotを4つ（Repositoryとsupported Global toolごとに1つ）、session-limit sentinel用に最終slotを予約する。通常detailは1,019件までとし、commit済みgeneration contentを置換しない |
| `maxSessionLifecycleDiagnosticRecordBytes` | 2 KiB canonical UTF-8 JSON delta | Lifecycle record 1件を重複ID-list occurrenceとseparator込みで制限。Oversized keyed failureはcompact per-key recordへ置換し、oversized ordinary detailはsession sentinelへ抑止 |
| `maxSessionLifecycleDiagnosticBytes` | 2 MiB canonical UTF-8 JSON delta | Paired lifecycle Diagnostic/ID insertion全体をcommit済みgeneration contentから独立して制限 |
| `reservedSessionLifecycleFixedBytes` | 16 KiB | 通常lifecycle detail受理前に4つの固定failure slotとsession sentinel用として確保 |
| `maxSessionSnapshotControlBytes` | 1 MiB canonical UTF-8 JSON delta | Session所有`snapshotState`、`staleFailures`、`globalControl`、Source lifecycle/progress projection用に予約。Customization由来stringは使用不可 |
| `maxSessionSnapshotOverlayBytes` | 3 MiB canonical UTF-8 JSON delta | 2 MiB lifecycle-diagnostic sub-budgetと1 MiB session-control sub-budgetの正確な合計 |
| `maxGlobalPreviewRootInputBytes` | 32 KiB UTF-8 | Normalization/escape前にbounded length countingを停止し、`oversized` null-display entryを返す |
| `maxGlobalPreviewDisplayBytes` | 192 KiB UTF-8 | Output expansion前にstreaming escapeを停止し、同じ`oversized` null-display entryを返す |
| `maxRequestBodyBytes` | 64 KiB | JSON parse前にreject |
| `maxSessionSnapshotBaseBytes` | 5 MiB canonical UTF-8 JSON | Session所有mutable overlay fieldを全てneutral formにしたcomplete success envelopeをgeneration構築中に制限 |
| `maxSessionSnapshotBytes` | 8 MiB UTF-8 JSON | 5 MiB baseと3 MiB session overlay budgetの正確な合計。API responseをtruncateしない |
| `maxFileDetailBytes` | 4 MiB UTF-8 JSON | File record受理中にenforceし、source textまたはgraph recordをtruncateしない |
| `scanDeadlineMs` | 30,000 | Abortしてbounded partial generationをpublish |
| `maxComparisonLinesPerFile` | 20,000 | Monaco diff highlightをskipし、両方の完全なauthored source viewを保持 |
| `comparisonTimeBudgetMs` | 5,000 | Monaco diff computationをcancelし、両方の完全なauthored source viewを保持 |

Serverはscan、parser、retained-graph、response、request limitをenforceする。Parser jobはhost event loop外の最大2つの
`Worker` thread poolで実行する。各workerにold generation 64 MiB、young generation 16 MiB、stack
4 MiBのV8 resource limitを設け、timeout、resource-limit exit、uncaught failure後に交換する。Tree
traversalでは上記depth、node、scalar、metadata-entry limitもenforceする。Failureとなったrecognition
resultはall-or-nothingとし、そこからのmetadata、relationship、derived declarationをpublishしない。同じphysical
fileの成功した別recognitionは残してよい。Completeなalias、recognition、metadata set、provenance、relationship、
parser message、DTO-visible diagnosticをallocateまたはretainする前に、hostはnumeric count limitとdeterministicな
UTF-8 JSON/record-byte accounting functionを適用する。Per-file、generation、snapshot、detail budgetを超える最初の
recordで停止し、そのrecordのprefixを保持せず、generationをpartialにして該当するbounded diagnosticをemitする。
Snapshot accountingのbase projectionはgeneration diagnosticを含み、session所有mutable fieldをneutral form、すなわち
`sessionDiagnosticIds: []`、`diagnostics`内lifecycle class recordなし、`snapshotState: current`、`staleFailures: []`、
`globalControl: null`、Source lifecycle/progress deltaなしとし、全published Sourceを`status: idle`かつ`progress: null`へ
projectしたcomplete success envelopeで、最大5 MiBとする。Lifecycle recordのchargeは、その完全な
Diagnostic、重複するID-list occurrence、必要separatorをprojectionへ挿入したcanonical byte差分とする。Lifecycle aggregatorは
このdeltaを最大2 MiBまで受理し、通常detail受理前に4つの固定failure recordとsession sentinel用16 KiBを確保する。
2 KiB per-record chargeを超えるkeyed failure candidateはaccounting前に同じRepository/tool key用の固定compact diagnosticへ
置換する。Oversized ordinary detailにはそのkeyがないため抑止して予約済みsession sentinelをincrementする。
別に予約した1 MiB control deltaはclosedかつserver所有の`snapshotState`、最大4つの`staleFailures`、`globalControl`、
Source lifecycle/progress projectionの全legal encodingを収める。Build-time worst-case encoding testがsub-budgetを超えた
implementation changeを拒否し、diagnostic/base byteから借用しない。したがって全post-commit session mutationは3 MiB overlay内に
留まり、final envelopeは8 MiBを超えない。Commit済みgraphは常にcomplete
snapshotとcomplete file detailとしてencode可能である。RouteはDTOを
truncateせず、commit後に起こり得ないsize invariant違反はfixed safe internal errorを返してpartial contentを公開しない。
Clientは同じDTO値から2つのcomparison limitをenforceし、
Monacoへ同じ有限time budgetを設定する。どちらの側もこれらの値をadvisoryとして扱わない。

Canonical JSON accountingには正確なdeterministic production encoderを使う。Contract field order、JSON escape、separator、
omission ruleを固定し、追加whitespaceを入れない。Record-delta admissionとfinal envelopeは同じencoderを使う。
Success responseでは、選択したsnapshotがcoherentな間にcomplete UTF-8 entity-body bufferを1回だけmaterializeして正確な
byte lengthを検査し、その同じbufferを変更せずHTTP layerへ渡す。Routeは2つ目のserializerを呼ばないため、accounting
byteとdeliveryするentity-body byteは乖離しない。

### Source

| Field | Type | Rule |
|---|---|---|
| `sourceId` | 最大64 byteのopaque ASCII string | Server生成でprocess lifetime中はstable |
| `kind` | `repository \| global` | Repository Sourceを正確に1つ、Global Sourceを0から3つ |
| `tool` | `copilot \| claude \| codex \| null` | Repositoryはnullと組み合わせる。各Global Sourceはsupport対象toolを正確に1つ持ち、2つのGlobal Sourceが同じtoolを共有しない |
| `enabled` | boolean | Repositoryとpublishedな全Global Sourceはtrue。AbsenceはそのtoolにSource未公開であることだけを表し、disabled/pending/retryable control stateは`globalControl`で区別する。Disabling sourceはatomic removalまでtrue |
| `status` | `idle \| scanning \| disabling \| ready \| partial \| failed` | 後述transitionに従う。`failed`は最新attemptが失敗し、最後のcommit済みsnapshotが利用可能であることを示す。Fatalな明示rescanだけがsnapshotをstaleにする |
| `boundary` | `SourceBoundary` | Rootを正確に1つ持つ。Repositoryはlaunch `cwd`、GlobalはそのSourceのtoolについてconsent済みの1つのhome root |
| `generation` | `GenerationNumber` | 公開済み全Sourceでsession-wideの最後にcommit済みgenerationと一致 |
| `progress` | `ScanProgress`またはnull | `scanning`/`disabling`中および`ready`/`partial`後だけnon-null。`idle`、`failed`ではnull |
| `conditionFacts` | `SourceConditionFact[]` | 起点fileを持たないdocumented non-file behaviorまたはexcluded/runtime inputについてのboundedなsource-level fact |
| `diagnosticIds` | opaque string[] | 5,000件のsource limit内で受理した最後のcommit済みgenerationのsource-scoped diagnostic |

`status`と`progress`はsession所有のoperational overlayであり、fatal attemptはcommit済みSource graphや
generation所有IDを変更せず更新できる。Boundary、condition、file、recognition、relationship、generation-scoped
diagnostic contentはatomic generation commitでだけ変更する。

Snapshot-byte accountingでは全published Sourceを同じsynthetic neutral form、すなわち`status: idle`かつ`progress: null`とする。
Commit済み`ready`/`partial`とfinal progress、およびtransientな`scanning`、`disabling`、`failed` formを含む全actual Source
lifecycle/progress projectionを1 MiB session-control overlayへchargeする。別Sourceの後続generationからper-Source historical
baselineを推測する必要はない。

Source-level condition factはpath readを許可せず、`Relationship.fromFileId`を捏造しない。
`affectedRuleIds`にruleがあるcandidate provenanceまたはrelationshipは、関連conditionをapplicability
assessmentへ投影できるが、documented product behavior、検査しないenvironment/user setting、managed
policy、その他起点fileを持たないexcluded/runtime inputの正準な説明はsource factに残す。

### SourceConditionFact

| Field | Type | Rule |
|---|---|---|
| `tool` | tool enum | Documented non-file behaviorまたは検査しないinputを持つproduct |
| `ruleId` | stable excludedまたはrelationship-only rule ID | Non-file factを定義し、file candidateを許可できない |
| `affectedRuleIds` | non-emptyなsort済みinspection-rule ID[] | 同梱registryのcandidate/relationship-only subsetで、factを投影できるprovenance/edgeを制御 |
| `behaviorRefs` | sort済み`VendorBehaviorStatement.behaviorId`[] | Factを説明する正確なsurface/scope lookup statement。Readを許可しない |
| `strategyRefs` | sort済み`RuntimeCompositionStrategy.strategyId`[] | Projectionに使った正確なcomposition/selection statement |
| `condition` | `ConditionFact` | 固定reason codeと任意のdocumented status。`satisfied`はnon-file runtime factを記録するだけでread authorityを与えず、authored source valueを複製しない |

固定registryが1 sourceあたり最大256 entryを生成し、tool、説明rule、affected-rule set、condition key、
reason codeでdeduplicateする。

### SourceBoundary

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `boundaryId` | opaque string | internal | Ticketとroot contextをbindする。全Sourceがboundaryを正確に1つ持つためDTOには不要 |
| `tool` | `copilot \| claude \| codex \| null` | internal | 公開済みowning Sourceのtoolと一致し、Repositoryはnull |
| `displayRoot` | string | DTO | User向けlocal path。Control characterをescapeし`maxGlobalPreviewDisplayBytes`でboundする |
| `canonicalRoot` | absolute canonical pathまたはnull | internal | Diagnostic/consent比較と反復containment checkに使用。単独ではreadを認可できず、enabled boundary外へ返さない |
| `rootContext` | `InspectionRootContext` | internal | Enumeration前に必須。Repositoryは直接所有し、Global boundaryはactive consentの`GlobalToolControl`所有contextを参照する。中央safe-filesystem layerだけが作成・consumeできる |
| `origin` | `cwd \| default-home \| environment` | DTO | Boundary選択理由を示す |

各Sourceは正確に1つのboundaryとrootを持つ。Repository boundaryはlaunch `cwd`をrootとするcontextを直接所有する。
Global boundaryの`tool`は所有Sourceとactive `GlobalToolControl`に一致し、そのcontrolのadmit済みhome contextを
1つ参照する。複数tool homeを1つのSourceへ結合しない。

### SourceRelativePath

`SourceRelativePath`はfileの表示、filter、alias、provenance path、normalized relationship targetに使う
value objectである。

| Field | Type | Rule |
|---|---|---|
| `sourceId` | opaque ID | Pathを1つの所有Sourceへbindする。単独でread authorityとして受理しない |
| `boundaryId` | opaque ID | そのSourceの唯一のboundaryへのinternal binding。Serializeせずclientから受け付けない |
| `value` | collision-free NFC POSIX-style string | Classification segmentを`/`でjoinしたそのSource rootからの相対path。Leading slash、URI scheme、NUL、empty/dot segment、`..`、home shorthand、environment expansionなし |

Repository Sourceでは`value`をlaunch `cwd`からの相対pathとする。Global Sourceではそのtoolについてadmit済みの
home rootからの相対pathとする。Presentationはstored valueを変えずcontrol characterをescapeする。Stored valueを
filesystem pathの再構築には使わず、internalなexact raw entry-name segmentだけがその役割を持つ。Accepted aliasも
同じvalue objectと所有Sourceを使う。
Wire上では`sourceRelativePath`と各`aliasSourceRelativePaths` entryはnormalized `value` stringだけをserializeし、
containing file DTOの`sourceId`がpublic ownership linkを提供する。`boundaryId`はHTTP boundaryを越えない。

### InspectionRootContext、ScanEntryTicket、VerifiedReadReceipt

これらpure Node.js recordはinternalだけで、serialize、DTOからのclone、HTTP pathからのreconstruct、request
からの受理を許さない。Private module brandはapplication-level authorityをenforceするが、OS filesystem
capabilityではない。

| Entity / field | Type | Rule |
|---|---|---|
| `InspectionRootContext.privateBrand` | module-private symbol/registry membership | `src/inspection/safe-fs.ts`だけが作成・検査し、process memory外へ出さない |
| `InspectionRootContext.sourceId` / `boundaryId` | opaque ID | 正確に1 Repository boundary、または1つの`GlobalToolControl`が事前割当した未公開IDへbindし、commit時だけGlobal Source/boundary IDになる |
| `InspectionRootContext.lexicalRoot` / `canonicalRoot` | absolute path | Accepted internal rootとその`realpath`。作成後にclient valueで置換できない |
| `InspectionRootContext.rootIdentity` | bigint `dev`/`ino`/`mode` snapshot | `lstat`でcaptureし、traversal前とcandidate readごとに再比較 |
| `InspectionRootContext.rootDevice` | bigint `dev` | Nodeが公開するdevice changeを検出するが、全mount transitionの識別は主張しない |
| `InspectionRootContext.state` | `active \| closed` | Repository/process終了、owning Global controlのdispose/disable、またはadmit済みrootを拒否するretry再validationでcloseし、closed後の全callを拒否 |
| `ScanEntryTicket.privateBrand` / `rootContext` | module-private brand / internal reference | 1 active root contextのbounded enumerationだけが発行 |
| `ScanEntryTicket.sourceId` / `boundaryId` / `generationId` | opaque ID / integer | 正確に1 source boundaryとscan generationへticketをbind |
| `ScanEntryTicket.traversalPlan` | internal immutable reference | Targeted lookupまたはdirectory enumerationを認可した正確なversioned plan |
| `ScanEntryTicket.rawRelativeSegments` | exact `Dirent.name`/target-spelling segment array | Filesystem pathの再構築、検証、readに使う唯一のsegment。Serializeせずclientから受け付けない |
| `ScanEntryTicket.classificationSegments` | collision-free NFC segment array | Matcher classification、deterministic order、`SourceRelativePath`だけに使い、filesystem operationへ置換しない |
| `ScanEntryTicket.canonicalAtEnumeration` | absolute canonical path | Internal比較値で、単独のread authorityではない |
| `ScanEntryTicket.ancestorSnapshots` | bounded ordered snapshot[] | Relative directory prefixごとに`dev`、`ino`、`mode`を持ち、open前・read前・read後に比較 |
| `ScanEntryTicket.enumerationIdentity` / `enumerationMetadata` | bigint path-stat snapshot | 正確な`dev`、`ino`、`mode`、`size`、`mtimeNs`、`ctimeNs`をbyte read前にpath/opened `FileHandle`と比較 |
| `ScanEntryTicket.occurrence` | non-negative integer | Deterministic enumeration order。`maxVisitedEntries`対象 |
| `ScanEntryTicket.state` | `enumerated \| consumed \| stale \| rejected` | Generationごとに最大1回read。Stale/rejected ticketはaccepted byteを返さない |
| `VerifiedReadReceipt.entryTicket` | internal reference | このfileでconsumeした正確なticket |
| `VerifiedReadReceipt.fileHandleIdentity` | bigint `dev`/`ino`/`mode` snapshot | `CustomizationFile.identity`の唯一source。Durableとはみなさない |
| `VerifiedReadReceipt.preOpenChecks` | bounded verification record | `open`前にroot identity、全ancestor `lstat`、candidate path `lstat`、candidate `realpath`/`path.relative`、再度のcandidate path `lstat`をこの順序で記録する。Applicableな`dev`、`ino`、`mode`、`size`、`mtimeNs`、`ctimeNs`を比較し、最初のcandidate checkでcanonicalization前にlink/non-regular objectを拒否し、両candidate snapshotが相互およびenumerationと一致することを要求 |
| `VerifiedReadReceipt.preReadChecks` / `postReadChecks` | bounded verification record | `open`後かつread前と、同じhandleを開いたread後に、exactなpre-open sequenceを同じ順序で繰り返し、その後に同じ`FileHandle.stat({ bigint: true })` fieldを比較 |
| `VerifiedReadReceipt.fileType` | literal `regular-file` | Directory、link、device、socket、pipeではない。Unsupported/unverifiable objectは拒否 |
| `VerifiedReadReceipt.acceptedByteCount` | integer | `maxFileBytes`または残total budgetを超えない |
| `VerifiedReadReceipt.finalOpenDefense` | `o-nofollow \| unavailable-postcheck-only` | Nodeが有効な`O_NOFOLLOW`を公開する場合は`o-nofollow`必須。Fallbackは明示的なcross-platform limitationを記録 |
| `VerifiedReadReceipt.containmentMode` | literal `node-realpath-fstat-best-effort` | Atomic kernel containmentを主張せず、反復canonical/same-handle validationを記録 |

Repository root contextはprocess `cwd`から作る。Global root contextは一致preview consent後だけ作る。Root作成は
公開されたlexical componentを全て`lstat`で検査してlinkを拒否し、accepted rootの`realpath`とidentityを記録する。
これらの分離checkには後述の残存raceがある。Bounded Node filesystem serviceだけがimmutableな`TraversalPlan`を
interpretしてticketを作り、static/derived classifierはselectできても作れない。Opened directoryごとに、descend前に
completeかつboundedなsibling setをbufferする。異なるraw sibling nameが同じNFC classification keyへnormalizeする
場合はcollision group全memberをdescend/open/readせず拒否し、boundedな
`safe-fs-path-normalization-collision`を付ける。CollisionのないNFD-only entryはexact raw segmentでreadし、
classification/display pathはNFCにする。Derived valueはcollision-free classification record 1件と正確に一致しなければ
ならない。Candidate readは所有root contextとticketのraw segmentだけからpathを再構築する。`open`前にroot identityと
全ancestor snapshotを比較し、candidate pathを`lstat`してlink/non-regular
objectを拒否しexact fieldを比較する。次にcandidate `realpath`/`path.relative`を検査し、candidate pathの`lstat`
比較を繰り返して、両snapshotが相互およびenumerationと一致することを要求する。`open`後かつread前にこの
順序付きsequenceを繰り返し、opened
`FileHandle.stat({ bigint: true })`も比較する。Bounded same-handle read後もhandleを開いたまま、byte受理前に
同じexact fieldについてこの完全な順序付きpre-read sequenceを繰り返す。検出したidentity/type/metadata/
boundary changeは収集済みbyteを全て破棄し、ticketをstale/rejectedにする。Client/HTTP path stringはreadを認可しない。

Nodeが必要なidentity/metadataまたはcanonicalizationをunavailable、ambiguous、malformed、その他unusableと
報告した場合は`safe-fs-boundary-unverifiable`とし、推測しない。Root-level failureはsource attemptをabortし、
item-level failureには上限付きdiagnostic-only inventory recordだけを残してよい。

Nodeはatomicなdirectory-handle-relative child openを提供しないため、これらrecordはpath check間にroot、
ancestor、final entryを差し替えるactive processへのcontainmentを証明できない。そのactorはcurrent threat
modelのscope外である。
検出した通常の同時変更とその他全detected raceはfail closedにする。Threat model拡張には、将来のatomic Node beneath/no-follow
API、またはOS強制のread-only snapshot/sandboxとrenewed reviewが必要である。
Same-device bind mountとNodeが全く公開しないreparse metadataは、automated-test proof外の明示的なplatform
limitationとして残る。

### StaticAssetManifest、ServerBundleManifest

これらはtrusted packaged-build recordで、inspection-source DTOではない。Build/package verifierは両方を
固定package-root pathだけからresolveする。Runtimeではproject所有`bin.mjs` bootstrapがpacked `package.json`と
両manifestを自身の`import.meta.url`相対の固定URLだけからresolveする。Node.js built-inだけを使い、両strict manifestと
全listed static/server assetのhashを検証してから、既に検証済みの`dist/cli.mjs`をdynamic importする。Hostは先にbind
できない。`node:fs`はpackage所有fileのread/hashに使えるが、build manifestをinspected-source fallbackには使えない。
Runtime validationはoversized document、malformed JSON、duplicate/unknown/
missing key、unexpected order、symlink、non-regular file、size/hash mismatch、package-version mismatchをserver
bind前に拒否する。
これらJSON manifest、generated HTML/CSS、documentation、licenseはdeclarative artifactである。Project所有の全
executable application codeとpackageに同梱する全executable componentは、JavaScript/TypeScript sourceから生成した
JavaScriptとする。このboundaryはthird-party development/test toolingをproduct codeとして分類しない。

Static manifest作成前に固定normalizerがNuxt標準`.output/public` staging treeを読み、regularな生成済み
`200.html`/`404.html`を要求するがredundant static-host fallback 2つはcopyせず、`index.html`以外の全HTML
fileを拒否する。他のaccepted regular fileは新規`dist/public`へcopyし、manifestは全copied fileを記述し、
packaged outputにaliasを含めない。Server assemblerもcleanな`.build/server` staging treeだけを読み、
manifest-listed regular `.mjs` fileだけを`dist/`へcopyする。

| Entity / field | Type | Rule |
|---|---|---|
| `StaticAssetManifest` | 最大2 MiBのstrict JSON | Exact keyは`manifestVersion`、`packageVersion`、`shellPath`、`assets`、`inlineScriptSha256` |
| `StaticAssetManifest.manifestVersion` | literal `1` | Compatibilityを推測しない |
| `StaticAssetManifest.packageVersion` | 最大64 UTF-8 byteのsemver string | Packed `package.json`からembedしたversionと一致 |
| `StaticAssetManifest.shellPath` | literal `/index.html` | 正確なSPA fallback byte |
| `StaticAssetManifest.assets` | ordered unique record 1..4,096件 | `requestPath`順。全post-normalization generated regular fileを正確に1回含む |
| `StaticAssetRecord` | closed object | Exact keyは`requestPath`、`file`、`byteLength`、`sha256`、`mediaType` |
| `StaticAssetRecord.requestPath` | 最大512 UTF-8 byteのroot-absolute URL path | Query、fragment、dot segment、encoded separator、malformed escape、external originなし |
| `StaticAssetRecord.file` | exact `public/...` relative path | `requestPath`のuniqueなlexical counterpart。Separator alias/traversalなし |
| `StaticAssetRecord.byteLength` / `sha256` | non-negative integer / lowercase 64 hex | Bind前にpackaged byteと照合 |
| `StaticAssetRecord.mediaType` | closed MIME enum | Hostと同じ固定extension tableでbuild時に決定。HTMLは`/index.html`だけlegal |
| `StaticAssetManifest.inlineScriptSha256` | ordered uniqueな44-character base64 hash 0..32件 | `/index.html`内の各executable inline-script exact byteのSHA-256。Executable attribute、`<base>`、nonce、external URL、未記録inline scriptはbuildを通らない |
| `ServerBundleManifest` | 最大1 MiBのstrict JSON | Exact keyは`manifestVersion`、`packageVersion`、`assets` |
| `ServerBundleManifest.manifestVersion` | literal `1` | Compatibilityを推測しない |
| `ServerBundleManifest.packageVersion` | 最大64 UTF-8 byteのsemver string | 同じpacked-package versionと一致 |
| `ServerBundleManifest.assets` | ordered unique record 2..256件 | `file`順。`cli.mjs`、`parser-worker.mjs`、全tsdown code-split chunkを正確に1回含み、listed byte合計は最大64 MiB |
| `ServerBundleRecord` | closed object | Exact keyは`file`、`byteLength`、`sha256` |
| `ServerBundleRecord.file` | 最大256 UTF-8 byteのnormalized relative `.mjs` path | Absolute path、empty/dot segment、separator alias、traversal、top-level `public`/`manifests` collisionなし |
| `ServerBundleRecord.byteLength` / `sha256` | non-negative integer / lowercase 64 hex | Copy前にstaged byte、pack前にpackaged byteと照合。1 file最大16 MiB |

全assembly後のrecursive expected setは2 manifest file、`StaticAssetManifest`にlistedされた全`public/...` path、
`ServerBundleManifest`にlistedされた全server pathだけである。Final verifierはstale regular file、unlisted chunk、symlink、fileの
代わりのdirectory、その他platform-safe non-regular objectを含む全差異を拒否する。Package testはunpackした
tarballへ同じsetを適用する。

### GlobalConsentPreview

Capabilityで保護したconsent routeは、process environmentとdefault-home valueからlexical path operationだけで
このpreviewを作る。作成と返却のどちらでも、候補Global root配下の`stat`、`realpath`、directory
enumeration、file readを行わない。

| Field | Type | Rule |
|---|---|---|
| `previewId` | 256-bit random opaque string | Process-memoryのlookup key。新previewは以前の未同意previewをinvalidateし、active consent中はそのexact previewをfreeze/reuse |
| `previewDigest` | keyed SHA-256 | 下記全fieldと`sessionId`のcanonical encodingを対象とし、constant timeで比較。別processの値を受理しない |
| `allowlistVersion` | date string | Current shipped contract version |
| `traversalPlanVersion` | literal `1` | 全immutable entry planのschema versionと一致し、`previewDigest`へbind |
| `entries` | 正確に3 tool entry | Copilot、Claude、Codexの固定順 |
| `entries[].tool` | tool enum | Closed value |
| `entries[].origin` | `default-home \| environment` | Invalidでもenvironment entryを使い、暗黙fallbackしない |
| `entries[].lexicalRoot` | exact bounded raw stringまたはnull | Internalのみ。Escape前のenvironment/default valueを保持し、`oversized`だけnull。Log/serializeしない |
| `entries[].displayRoot` | escape済みlexical absolute/invalid valueまたはnull | Bound内なら正確なproposed rootを示す。Nullは`oversized`だけで、canonicalization済みとは主張しない |
| `entries[].pathPatterns` | non-emptyな固定relative-pattern array | 正確なimmutable Global `TraversalPlan`からrender。隣接customization classなし |
| `entries[].inputState` | `eligible \| present-empty \| relative \| invalid \| oversized` | I/O前に決定し、`eligible`だけがconsent後boundaryになれる |
| `excludedRuleIds` | sort済みexcluded rule ID[] | Authored proseを受け付けず表示除外を決める |

Hostはproposed rootのUTF-8 lengthをincrementalにcountし、別copyを構築せず32 KiBを超えた時点で止める。
Limit内valueはincrementalにescapeし、outputが192 KiBを超える前に止める。どちらのoverflowでも
`inputState: oversized`、`displayRoot: null`とし、normalization/canonicalization/root creation/readを行わない。
UIは固定localized `global.previewTooLarge` messageだけを示し、userはenvironmentを修正して新previewを
要求する。Digestはlength-prefix付きUTF-8 field、explicit null tag、固定enum encoding、表のarray順を用いる。
Limit内のraw `lexicalRoot`、そのescaped `displayRoot`、`pathPatterns`の背後にあるtraversal-plan schema/versionと
canonical selector programをbindし、または両rootのnullと`oversized`を明示的にbindする。Escapeの逆変換やUnicode
normalizationには依存しない。固定registry stringは既にcanonical NFCであり、filesystemから得た値を含まない。
Limit内のinvalid environment valueはescapeして
表示するが、許可pathにnormalizeしない。Present-empty、relative、invalid、oversized entryは固定preview表示だけを使い、
retained `Diagnostic`を作らない。`eligible` entryだけがconfirmation後に`GlobalToolControl`を受け取り得て、後で予約済みtool failure
diagnosticを作り得る。
Admissionは保存済みinternal raw `lexicalRoot`だけを使い、`displayRoot`をpathに使わずenvironmentを再読込しない。
Consentがactiveな間、preview取得はID/digestを含む同じ保存済みDTO-visible objectをfield semantics上byte-for-byteで
返し、environmentを読み直さずreplacementも作らない。Client purge後にexact consent表示を復元する唯一のpathである。

### GlobalConsent

| Field | Type | Rule |
|---|---|---|
| `allowlistVersion` | date string | 表示したcurrent contractと一致すること |
| `previewId` / `previewDigest` | opaque string | Current in-memory previewと完全一致すること |
| `confirmedTools` | non-emptyなsort済みtool enum[] | Non-null pathを表示した全`eligible` preview entryだけで構成するserver-derivedのexact set。Requestはそれら全てをconfirmしsubset選択できない。全entry ineligibleのpreviewはactive consentを作れない |
| `confirmedAt` | `UtcTimestamp` | Memoryのみ |
| `active` | boolean | Global inspection disable時にclearし、tool固有Global Sourceをすべて除去 |

Consentはallowlist contractに表示したpathだけを許可する。隣接settings、credential、state、skill、
plugin、任意env pathは許可しない。
Confirmation commandはtool listを持たず、serverはfrozen previewを検証後、closed tool順の全`eligible` entryだけから
`confirmedTools`を導出する。Retry時のoperation work setは、そのimmutable setのうちSourceがまだないtoolだけとし、
clientはtool選択でconsentを変更できない。
Confirmation後、candidate entryを追跡せずに各eligible lexical rootをcanonicalizeする。Canonical rootと
表示済みlexical absolute rootがcomponentごとに一致しない場合、symlink、junction、case、Unicode
normalization、short-name aliasを含め、enumeration前にそのtoolをsafe diagnostic付きで拒否する。
Applicationはcanonical targetへ暗黙置換せずconsentを広げず、userにconfigured rootの修正と新previewの
取得を求める。
Confirmed済みのeligible toolごとに、そのtoolの表示済みrootへbindしたGlobal Sourceを1つ作成できる。
Confirmationで複数toolを結合したGlobal Sourceを作らず、1 toolのSourceに別tool rootへの権限を与えない。
初回enable後もconfirmed toolにSourceがない場合（all-failed/mixed outcomeを含む）、exact active consentとその
`GlobalToolControl` recordにより、そのmissing toolだけをrequeueできる。既存Sourceは変更しない。別preview/root
には先にGlobal調査のdisableが必要で、missing toolがないrequestはconflictとして拒否する。

Consent後のcanonical/root validationは0から3 toolをacceptできる。Hostはconsent activate前にconfirmed tool
すべてのcoordinator capacityをreserveし、accepted rootごとにjobを1つqueueする。全toolがenumeration前に
rejectされた場合もconsentはactiveのまま、new Source/scan jobをpublishせず、affected toolの予約済みfailure slotに
bounded diagnosticを持つcontract済み`active-no-job` stateを返す。Initial activationではGlobal Sourceが0個となり、
all-rejected retryでは既存Sourceを変更しない。後のexact-consent retryはSourceがまだないtoolだけを再validationでき、lexical rootを
変更するにはdisableとnew previewが必要である。

### GlobalToolControl

| Field | Type | Rule |
|---|---|---|
| `tool` | tool enum | Active consent内でuniqueかつ`confirmedTools`に含まれる |
| `previewId` | opaque string | Active frozen previewを参照し、in-place変更不可 |
| `state` | `unvalidated \| rejected \| admitted \| published` | `admitted`はvalidなretained contextを持つがSource未公開、`published`はSourceを正確に1つ持つ |
| `sourceId` / `boundaryId` | opaque IDまたはnull | Root admission成功後だけ一緒にallocateし、Source commitまではinternal。Admissionをやり直す場合は破棄 |
| `rootContext` | `InspectionRootContext \| null` | Lexical/canonical/root-identity validation後にsafe-fsだけが作り、Sourceがなくてもここで所有 |
| `rejectionCode` | closed reason codeまたはnull | `rejected`の場合だけnon-null。Path/environment valueを含まない |
| `diagnosticId` | session diagnostic IDまたはnull | Consent後rejectionまたはfatal初回scan用にそのtoolの予約済みfailure slotを参照し、後にpublished Sourceのfatal rescanも同じslotを使う |

`GlobalToolControl`はsession control stateでありscan working setに入らない。正常admissionはprovisional scanを
queueする前に未公開Source/boundary IDとroot contextを事前割当する。Fatalな初回scanはjob working set全体を
破棄するが、このcontrol/contextはexact-consent retry用に保持し、retryごとにenumeration前のroot identity/
containmentを再checkする。Retained contextが一致すればactiveのまま再利用する。以前admitしたrootをいずれかのcheckが
拒否または検証不能とした場合、safe-fsはold contextをcloseしてregistryから除去し、未公開Source/boundary IDを破棄して
各fieldをnullにし、別jobをqueueする前にcontrolを`rejected`へ変える。後のretryは同じfrozen lexical previewの下で完全な
new admissionに成功した場合だけnew context/IDを作れる。したがってconsent後validation failureはID/contextなしの
`rejected` controlを残し、そのpreviewでだけ再validationできる。Source commit成功時は事前割当IDをpublishし、`SourceBoundary`がこのcontextを
参照する。Rejectionまたはfatal初回scanはそのcontrolの予約済みtool diagnostic 1件を作成/置換し、Source commit成功はclearし、
無関係なtool outcomeは保持する。Global disableはworkをabortしてopen file handleをcloseしてからcontrol所有diagnosticを
すべて削除し、control所有contextをすべてcloseしてconsent、frozen preview、全controlを削除する。DTOはこのauthorityを作成・変更できない。

### GlobalControlView

| Field | Type | Rule |
|---|---|---|
| `state` | `active \| disabling` | Priority barrier受理時に`disabling`となり、single commitでfieldがnullになるまで維持 |
| `previewId` | exact 43-character base64url string | Activeな256-bit `GlobalConsentPreview.previewId`と一致し、capabilityでもfilesystem pathでもない |
| `confirmedTools` | non-emptyなsort済みtool enum[] | Active consentがbindしたexact tool |
| `pendingTools` | sort済みtool enum[] | Validation/admission中のrunning/queued enable/retry operation、またはそのrunning/queued initial scan jobが所有するconfirmed tool。Cancellation開始後の`disabling`中はempty |
| `retryableTools` | sort済みtool enum[] | `active`中、`rejected`またはnon-pending `admitted` controlで、published Sourceもactive operation/jobもないconfirmed toolだけ。`unvalidated` controlは常にpending。`disabling`中はempty |

`GlobalControlView`はactive consent、その`GlobalToolControl` record、coordinator、published Sourceから派生する。
Consentまたはretained control stateがactiveな間、Global Sourceが0個のinitial all-failed/`active-no-job` outcomeと、
既存Sourceを保持するall-rejected retryを含め、
authenticated session snapshotごとに返す。Client purge後、SPAはfresh sessionを取得し、
`previewId`でpreview routeからexact stored previewを要求して全path/state/exclusionを再表示してからretryを提示する。
Disableは直ちに利用できる。Published toolは`sources[].tool`から派生しretryableと重複できない。このDTOはcanonical/
admitted root、digest、source contentを含まず、別取得するcapability保護previewがunchanged enable request用digestを提供する。
Disable barrierがpending/activeの間は`state: disabling`かつjob/retry arrayを両方emptyとし、UIはretryを提示せずenable
APIもretryを拒否する。Disable commitが全control/consentを削除した時点だけviewをnullにする。
`state: active`かつ`pendingTools`がnon-emptyの間、`retryableTools`は既に`rejected`またはnon-pending `admitted`となった
toolの情報projectionとして残るが、UIはretryを提示せずenable APIは`409 global-enable-in-progress`を返す。Disableは
直ちに利用できる。`pendingTools`がemptyとなりmatching frozen previewを取得・検証した後だけretryを提示する。
`unvalidated` controlが`pendingTools`外に存在する状態は禁止する。

### GlobalEnableOperation

| Field | Type | Rule |
|---|---|---|
| `operationId` | opaque string | 1回のinitial enableまたはexact-consent retry用のunique coordinator command |
| `kind` | `initial-enable \| retry` | Closed operation type。どちらもcommit済みgenerationではない |
| `commandEpoch` | non-negative integer | 受理時のcoordinator値をcaptureし、全async continuationで一致を要求 |
| `previewId` | opaque string | Operation全体でfrozen consent previewと一致 |
| `tools` | non-emptyなsort済みtool enum[] | Operationが最初に所有するmissing confirmed tool。Rejected toolはterminal validationで`pendingTools`を離れ、accepted toolはinitial scan jobへpending ownershipをtransferしてjob終端まで残る |
| `capacityLease` | internal bounded reservation | 全owning toolのvalidation/admissionとpossible scan-command slot用all-or-none reservation。Consent/control mutation前に取得 |
| `status` | `waiting \| validating \| admitting \| queueing-scans \| draining \| cancelled \| complete` | Disableがabortすると`draining`になり、以後new authority/jobをpublishできない |
| `responseDisposition` | `unset \| 202-queued \| 202-active-no-job \| 409-global-disable-pending` | Coordinator linearization pointで正確に1回選択し、transport deliveryは後でよい |
| `abortSignal` | internal `AbortSignal` | Root validation/admissionとqueue前safe-fs callすべてで共有 |

Operation全体のcapacity reserve成功後、initial enableはconsent activate、confirmed eligible tool用`unvalidated`
control作成、command登録、全owning toolの`pendingTools`追加をatomicに行う。Retryはexisting consentに対して同じcommandを
登録する。Root validation/admissionとscan-job作成はcoordinator配下だけで行う。全async boundaryの前後と、control/
diagnostic mutationまたはscan-job enqueue直前に、同じactive `operationId`、`commandEpoch`、non-aborted signal、
`globalControl.state: active`を証明する。
Initial enableとretryはいずれもconsent、control、context、ID、diagnosticを変更する前に`capacityLease`全体を取得し、
reserve failureはstate変更なしで`503`を返す。Rejected toolはterminal control/diagnostic update後にown shareをreleaseし、
accepted toolはown shareをqueued scan commandへtransferする。All-rejected completionは全share release後にoperation leaseをcloseし、
transfer済みshareはscanのcomplete/failure/cancel時にreleaseする。Cancellation/disableはoperationをdrainしてから全untransferred
shareをreleaseし、retry/repeated failureによるcapacity leakを防ぐ。
Running/queued `GlobalEnableOperation`は最大1つとする。全owning toolがterminal validation outcomeへ到達し、accepted scan
commandをすべてtransferした後、coordinator lock下で最後のoperation-ID/epoch/state checkを行う。`202-queued`または
`202-active-no-job` disposition選択、`complete`化、lease handle close、unregisterをatomicに行い、後のresponse byte deliveryで
linearizationを変えない。Disable barrierが先にlinearizeした場合、同じcheckは`409-global-disable-pending`を選んでcancellationを
drainする。Drain済みoperationは全untransferred shareをreleaseし、lease handleをcloseして`cancelled`となり、barrier cleanup前に
unregisterする。Operationがraceに勝てば確定済み`202`、barrierが勝てば`409`となり、両方にはならない。Terminal operation
historyは保持せず、pending scan jobは完了まで独立して`pendingTools`へ残す。

Global-disable受理はcontrol stateを`disabling`へ変え、coordinator epochをincrementし、active/queued
`GlobalEnableOperation`をabortして`cancelled`へdrainするまで待ってから、最後のqueued Global work cancellation sweepと
zero-I/O removal transactionを実行する。Drainされたcontinuationがclose/unregisterするのは`GlobalToolControl`へ未attachの
operation-local provisional contextだけで、同様に未attachなID/diagnosticだけを破棄する。Controlへattach済みのcontextはその
controlが所有したまま、disable commitが正確に1回closeする。Continuationはjob enqueue/control mutationを行えない。この順序によりbarrier受理後に完了したvalidationがcancellation
sweep後へauthority/workを追加することを防ぐ。Barrierがdisposition pointに勝ったenable requestは
`409 global-disable-pending`で完了する。Operationが先に`202`を選んだ場合、後続barrierはそのaccepted workを通常どおり
cancel/removeできる。Barrier cancellationはfailure diagnosticを作らない。

### OfficialSourceRecord

`tests/fixtures/conformance/official-sources.json`はimmutableなrelease/test dataで、検査対象Repositoryのinputでは
なく、product startup/scan中にfetchしない。

| Field | Type | Rule |
|---|---|---|
| `sourceId` | stable dotted string | Unique。Behavior、rule、strategyの全`sourceRefs` entryはこのkeyだけを参照 |
| `canonicalUrl` | absolute HTTPS URL | `officialHost`上の正確なauthored URL。Credential、query、fragmentなし |
| `officialHost` | lowercase DNS hostname | Recordごとのexact host allowlist。URLと許可する全redirect hopが正確に一致し、subdomainやsibling hostを暗黙に許可しない |
| `sectionAnchors` | 1..16 exact heading-text string | Exact rendered heading textだけ。各最大256 UTF-8 byte。Heading ID、URL fragment、CSS/XPath、その他executable selectorは不可 |
| `affectedBehaviorIds` | sort済みbehavior ID[] | 参照する全`VendorBehaviorStatement.sourceRefs` entryと相互一致 |
| `affectedRuleIds` | sort済みrule ID[] | 参照する全`InspectionRule.sourceRefs` entryと相互一致 |
| `affectedStrategyIds` | sort済みstrategy ID[] | 参照する全`RuntimeCompositionStrategy.sourceRefs` entryと相互一致 |
| `reviewedOn` | ISO date | Human semantic review後だけ更新 |
| `normalizationVersion` | literal `1` | Checked-in deterministic normalization algorithmを選択 |
| `snapshotFingerprint` | lowercase SHA-256 | 選択したofficial sectionだけのnormalized text digest |
| `assertions` | 1..64 maintained assertion[] | Stable assertion ID、最大1,024 UTF-8 byteのparaphrase済み期待semantics、affected behavior、rule、strategy ID。Page textをcopyしない |
| `semanticFingerprint` | lowercase SHA-256 | Sort済みmaintained assertionのcanonical JSON digest |

Offline contract testはID、相互contract-record link、exact official host、boundをvalidateして`semanticFingerprint`を再計算し、
networkへ接続しない。明示maintainer drift commandはcredential、cookie、Repository data、その他local stateを
送信しない。1 sourceあたり10秒、decompress後2 MiB、UTF-8 HTML/Markdown、最大3 HTTPS redirectに制限し、
全hopがそのsourceのallowlist済みofficial host内に留まることを要求する。別final URLへのredirectは
`canonicalUrl`を黙って変えずreview対象として報告する。Downgrade、cross-host redirect、誤content type、
oversize、anchor欠落/重複、decode failureはhard drift-check failureとする。

Normalizationは各anchored headingから同level以上の次heading直前までを選択し、document chromeとscript/style
nodeを除去してprose/code textを保持し、entity decode、Unicode NFC、LF ending、line edge trim、horizontal
whitespace collapseを適用し、列挙順にsectionをjoinしてSHA-256を計算する。Digest/assertion driftからbehavior、rule、strategyを
自動変更しない。Maintainerがaffected contract recordと両言語contract/researchをreviewした後、anchor、assertion、
fingerprint、`reviewedOn`を明示更新する。Remote page text/response bodyはcheck inしない。

Affected-ID arrayの少なくとも1つはnon-emptyとする。各assertionはgenericなproduct areaではなく、そのrecordの
reverse-index済みbehavior、rule、strategy IDのnon-empty subsetを指定する。Mapは最大128 source recordとする。上限外またはunsupportedなrecordはpackage前のoffline contract/build
validationをfailさせる。Scannerはこのtest mapをloadせず、source record、anchor、assertionをtruncateしない。

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
| `relativeSelector` | bounded vendor-relative stringまたはnull | Path textだけ。Inspector glob semanticsを含まずauthorityを与えない |
| `traversal` | closed traversal descriptor | Exact、ancestor chain、standard-location chain、recursive-under-base、lazy descendant、explicit registration、none |
| `activationConditions` | condition-key enum[] | Trust、feature flag、target match、installation、enablement、runtime version、その他必須input |
| `strategyRefs` | sort済みstrategy ID[] | このbehaviorに適用するcomposition/selection record |
| `documentationStatus` | documentation-status enum | `conflict`は競合する全source assertionを保持 |
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
| `operations` | 1..4 ordered closed enum[] | 各entryは`append \| concatenate \| select-first \| select-closest \| replace \| merge-map \| deduplicate \| filter \| unknown-order`。Array orderは文書化済みpipeline order |
| `inputBehaviorRefs` | non-emptyなsort済みbehavior ID[] | Documented inputだけ。Excluded/user/hosted inputは明示conditionのまま |
| `requiredConditionKeys` | condition-key enum[] | Terminal applicability resultを許す前に必要な全input |
| `documentationStatus` | documentation-status enum | Ambiguous/conflicting orderからwinnerを捏造しない |
| `sourceRefs` | non-empty source ID[] | Operationsに対する相互一致するofficial evidence |

Strategyはimmutable contract dataである。Applicability assessmentを説明・projectできるが、directoryのenumerate、
relationship targetのopen、InspectorのRepository/Global sourceのmergeはできない。

### StructuredInspectorMatcher

| Field | Type | Rule |
|---|---|---|
| `base` | 正確な1 Source-boundary descriptor | Repositoryまたはnamed consent済みtool固有Global boundary。Selectorから推測しない |
| `selectors` | 1..32個のordered unique `MatcherSelector[]` | 1 static rule所有のalternative。Repository renderingは`./`で始まり、Global renderingはそのtool boundary相対 |
| `MatcherSelector.rendered` | bounded canonical string | Human contract spelling。Typed segment programから正確にround-tripする |
| `MatcherSelector.segments` | 1..64個の`MatcherSegment[]` | Closed ordered program。Final tokenはregular fileを表し、全traversalがshared scan limitをconsumeする |
| `MatcherSegment` | discriminated union | `literal { value }`、`one-segment { suffix }`、`recursive-directories`。Executable glob/regular-expression objectは不可 |

`literal`はcase-sensitiveなNFC segmentを1つmatchする。`one-segment`は`*`と固定literal suffixで表記し、non-empty
segmentを1つmatchする。Non-terminalならdirectory step、terminalならfile stepとする。`recursive-directories`は
complete `**` segmentだけで表記し、0個以上のdirectoryをmatchする。Non-terminal、最大2回、recursive token同士の
隣接不可とする。Build validationは全renderingをcompileしてcanonical round-tripを行い、runtimeはこのimmutable
typed formだけをloadする。これによりdescendant contextとdirect child、またはdescendant contextと固定recursive
subtreeのbounded compositeを、曖昧な単一expansion enumを発明せず表現できる。

### TraversalPlan

`TraversalPlan`は`StructuredInspectorMatcher`からcompileするimmutable shipped dataで、`safe-fs.ts`が受理する唯一の
traversal programである。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | literal `1` | Global preview digestにbindし、unknown versionはregistry loadをfailure |
| `boundary` | 正確なSource-boundary descriptor | Matcherからcopyし、request/display textから推測しない |
| `selectors` | 1..32個のordered `TraversalSelectorPlan[]` | Matcher selectorの1対1 canonical compile結果 |
| `selectionPolicy` | `all-matches \| codex-global-first-non-empty` | Closed scheduler policy。後者はexact ordered selectorが`AGENTS.override.md`、`AGENTS.md`の`codex.global.instructions`だけで有効 |
| `TraversalSelectorPlan.mode` | `repository-program \| global-exact \| global-fixed-subtree` | Closed operation class。Generic ambient-root walkerなし |
| `TraversalSelectorPlan.fixedPrefix` | NFC literal segment array | `lstat`可能なexact ancestor。Global entryは許可subtree/target前の全path componentを含む |
| `TraversalSelectorPlan.remainder` | bounded `MatcherSegment[]` | Global exact targetではempty。Global subtree remainderはfixed prefix配下だけをenumerate可能 |

Repository planはselector programが明示するbounded broad traversalを実行できる。Global planはhome rootの`opendir`から
開始しない。Exact targetはfixed ancestor/targetだけをtargeted `lstat`/verifyし、fixed subtreeはそのsubtreeと許可済み
descendantだけを`opendir`できる。Missing targetからsibling discoveryへ広げず、planにない隣接pathへの`opendir`、
`lstat`、`realpath`、open、read callは0とする。`GlobalConsentPreview.pathPatterns`はこのexact selectorからrenderし、
digestはschema version、selection policy、canonical programをbindする。

`codex-global-first-non-empty`はproject所有のclosed scheduler branchであり、authored logicではない。最初に
`AGENTS.override.md`だけを安全にprobeする。安全にreadできたnon-empty overrideを唯一のfileとしてpublishし、
`AGENTS.md`へ一切operationせずshort-circuitする。Overrideがabsentまたは安全にreadできてemptyの場合だけ、exact
`AGENTS.md` targetへ進む。そこで安全にreadできたnon-empty regular fileをpublishし、それ以外はCodex instruction
fileをpublishしない。Emptyはoptionalな先頭UTF-8 BOMを除いたdecoded stringについて
`String.prototype.trim().length === 0`であることを意味し、whitespace-only fileはemptyとする。Present candidateがunsafe、unreadable、oversized、またはshared file contractでdecode不能なら
bounded diagnostic付きでselectionをfail closedし、後続selectorをinspectしない。`absent`はadmit済みrootのverificationが
維持された状態でexact targetの`lstat`が明示的not-foundを返した場合だけとする。Permission、type、metadata、ancestor/root、
canonicalization、その他全error、および最初の観測後にtargetが消えたcaseはabsenceではなくfailureとする。したがってempty判定では
first targetを安全にreadする場合があるが、planがpublishするreadable customization fileは最大1件で、unrepresented neighbor
pathへtouchしない。

### DerivationProgram

`DerivationProgram`は、独立して受理したstatic provenanceをbounded-derived read candidateへ変換できる唯一のprogramで
ある。Executable registry contentではなくimmutableなclosed discriminated unionとする。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown versionはregistry loadをfailure |
| `variant` | `marketplace-local-plugin \| codex-fallback-basename \| codex-skill-metadata` | Project所有interpreter branchを1つ選択 |
| `seedRuleId` / `seedKind` | 正確な1 static rule ID / kind | Owning static `CandidateProvenance`とrecognitionの両方に一致 |
| `declarationFieldId` | closed field IDまたはliteral `matched-path` | Exact allowlisted source occurrence。`matched-path`はlocation-derived skill-metadata ruleだけ |
| `syntaxVariants` | non-empty closed enum[] | Listed JSON/JSONC/TOML/frontmatter shapeだけ。Authored keyでcodeを選ばない |
| `base` | `seed-matched-path-parent \| source-root` | Exact seed provenanceからresolveし、別alias/provenanceやambient pathを使わない |
| `placement` | `at-base \| ancestor-chain-through-seed-owner` | Ancestor-chain formはCodex fallback basenameだけで、seedのcollision-free pathとsource rootでbound |
| `prefixPolicy` | `none \| optional-dot-slash \| required-dot-slash` | 個別segment validation前に適用 |
| `fixedSuffixAlternatives` | NFC literal segment array 1..4件 | Extracted segment後にappendするregistry constant。Authored suffix/free-form joinなし |
| `maxTargetsPerDeclaration` | integer `1..64` | Shared 128-target seed boundより前のlocal hard bound。Marketplace/skill mappingは4/1/1/1、1 fallback basenameはbounded ancestor position最大64件 |

Closedなinitial mappingは次のとおり。

| Derived rule | Variantとexact seed | Declaration/syntax | Baseとconstruction |
|---|---|---|---|
| `copilot.derived.local-plugin-manifest` | `marketplace-local-plugin`; `copilot.repo.marketplace`、kind `marketplace` | `marketplace.plugin.source`; plain stringまたはobject `source.path`; optional `./` | Seed matched-path parent。Validated relative-path segmentごとにbounded authored-segment tokenを1つemitし、`.plugin/plugin.json`、`plugin.json`、`.github/plugin/plugin.json`、`.claude-plugin/plugin.json`の1つをappend。1 declaration最大4 |
| `claude.derived.local-plugin-manifest` | `marketplace-local-plugin`; `claude.repo.marketplace`、kind `marketplace` | Same field; plain stringまたはobject `source.path`; required `./` | Seed matched-path parent。Validated authored segmentと固定`.claude-plugin/plugin.json`。最大1 |
| `codex.derived.local-plugin-manifest` | `marketplace-local-plugin`; `codex.repo.marketplace`、kind `marketplace` | Same field; plain stringまたはobject `source.path`; required `./` | Seed matched-path parent。Validated authored segmentと固定`.codex-plugin/plugin.json`。最大1 |
| `codex.derived.fallback-basename` | `codex-fallback-basename`; `codex.repo.config`、kind `settings/config` | `codex.config.project-doc-fallback-filename`; TOML string-array basenameだけ | Source root。Source rootからseedの`.codex` directoryのexact parentまでの固定ancestor chainの各位置でvalidated basename 1 segmentをroot-to-narrow順に配置。1 declaration最大64 position、shared最大16 name/128 target |
| `codex.derived.skill-metadata` | `codex-skill-metadata`; `codex.repo.skill`、kind `skill` | `matched-path`; authored declarationなし | Seed matched-path parent。固定`agents/openai.yaml`。最大1 |

Marketplace extractionはdocumented local relative pathを最大64個のindividual segmentへdecodeし、各emitted segmentは
fixed suffixを検討する前に同じNFC collision、Windows-special、alias、containment grammarへ合格しなければならない。
Callback、function pointer、arbitrary `path.join` recipe、free-form expression、glob、regular expression、recursive
derivationは表現不能とする。Variant/mapping追加にはcontract version変更とbilingual fixtureが必要である。

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
| `derivation` | `DerivationProgram`またはnull | Bounded-derived ruleだけに存在し、上記exact 5 mappingがinitial registryの全件 |
| `behaviorRefs` | sort済みbehavior ID[] | このpolicyに関連する正確なupstream lookup statement。Exclusionはreadを許可せずdocumented User behaviorを参照可能 |
| `policyRefs` | non-emptyなsort済みspecification ID[] | Surfaceを許可または意図的に除外するFR/QR clause |
| `strategyRefs` | sort済みstrategy ID[] | Order/applicabilityに使うcomposition fact。Path admissionには使わない |
| `conditionKeys` | condition-key enum[] | 適用可能性判定前に必要なruntime fact |
| `precedenceGroup` | stable stringまたはnull | 文書化されたselection/order semanticsを持つruleだけを結ぶ |
| `documentationStatus` | `documented \| ambiguous \| conflict \| experimental \| deprecated` | Runtime stateではなくupstream ruleを表す |
| `sourceRefs` | non-empty `OfficialSourceRecord.sourceId`[] | このruleのEvidence cellに直接記載した正確なsourceで、相互検証する。参照behavior/strategyが所有するevidenceは各IDから到達可能なままとし、このregistry fieldへ暗黙copyしない |

Build/contract validatorはpackage前にunique性、field組み合わせ、selector-programのtoken/count/positionと
canonical-round-trip rule、exact traversal compile、参照rule ID、closed derivation mapping/acyclic性、fixtureとの
完全一致を検証する。
Runtime loaderはscan前にembedded registry schema、integrity、contract
versionを検証する。Repository提供pluginでruleを追加する機構は持たない。

### ScanGeneration

| Field | Type | Rule |
|---|---|---|
| `generation` | `GenerationNumber` | Process内でuniqueかつmonotonic。`0`はbootstrap専用 |
| `baseGeneration` | `GenerationNumber` | Bootstrapは`0`、それ以外はserialized transaction開始時の最後のcommit済みgeneration |
| `transactionKind` | `bootstrap \| repository-scan \| global-scan \| global-disable` | Closed transaction classification |
| `scannedSourceId` | opaque source IDまたはnull | いずれかのscan kindでは1 source、bootstrap/zero-I/O Global disableではnull |
| `startedAt` / `finishedAt` | `UtcTimestamp` | Commit済みgenerationでは両方必須。In-flight timingは`ScanAttempt`/`ScanProgress`に属する |
| `outcome` | `complete \| partial` | Partialにはlimit/diagnostic必須。Fatal attemptはgenerationにしない |
| `files` | `CustomizationFile[]` | 全enabled Sourceを含み、Source、Source-relative Path、IDの順で決定的sort |
| `diagnostics` | `Diagnostic[]` | Overflow sentinelを含め最大10,000件。Customization sourceまたは宣言済みmetadata値を複製しない |
| `counters` | `ScanProgress`またはnull | Source scanでは必須で設定limit内。zero-I/O bootstrap/disableではnull |

Generation 0はprocess開始時に同期作成し、`baseGeneration: 0`、`transactionKind: bootstrap`、nullの
`scannedSourceId`/`counters`、等しい`startedAt`/`finishedAt`/session `createdAt`、`outcome: complete`、空の
file/diagnosticを持つ。Sessionに`StaleSourceFailure`がないため、派生する初期`snapshotState`は`current`である。
Legalなreadable baseだが
Repository scan成功を意味しない。自動の初回Repository scanは0から開始し、fatal failureならgeneration 0を
commit済みかつcurrentのまま保持し、最初のinventoryをcommitできなかったことをbounded session-lifecycle
diagnosticで説明する。保持snapshotをstaleにできるのは、後続のuser-requested rescan failureだけである。

### StaleSourceFailure

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `sourceId` | opaque Source ID | DTO | 最新の明示rescanがfatalに失敗した、まだpublishedなSourceを1つ識別 |
| `diagnosticId` | session diagnostic ID | DTO | そのSource用に予約した実行可能fatal-rescan diagnosticを参照 |
| `failedAt` | `UtcTimestamp` | DTO | Fatalな明示attemptが終了した時刻 |
| `baseGeneration` | `GenerationNumber` | DTO | Failed attemptが置換しようとした最後のcommit済みgeneration |

`StaleSourceFailure`はsession所有のlifecycle overlayであり、`ScanGeneration` fieldではない。明示的なfatal
rescanはそのSourceのentryだけを作成または置換するため、別Sourceのfailureは共存し、最大4 entryになる。
Completeまたはbounded-partial scan commitがclearするのは正常refreshしたSourceのentryと予約済みdiagnosticだけであり、別Sourceの
commitは無関係なentryと予約済みdiagnosticをcarryする。Global disableは除去するGlobal Sourceのentryと予約済みdiagnosticをclearするが、Repository
entryが残ればsessionはstaleのままとなる。Arrayがnon-emptyの間だけ`snapshotState`は
`stale-after-fatal-rescan`である。自動初回Repository failureと初回Global enable failureは、commit済みSource
graphのrefresh失敗ではないため`StaleSourceFailure` entryを作らない。Key別の予約済みfailure diagnostic slotを使用しても
snapshotをstaleにはせず、初回Global enableは既存entryとそこから派生するsnapshot stateもすべて保持する。
RetryのqueueはそのSourceのoperational statusを`scanning`へ変えるがentryも予約済みdiagnosticもclearしない。無関係なcommitはentry、
予約済みdiagnostic、Sourceのfailed/scanning lifecycle overlayをcarryし、affected Sourceの正常commitだけが`ready`/`partial`へ移して
entryをresolveする。

### ScanAttempt

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `attemptId` | opaque string | internal | Serialize済みの1つの未commit transactionを識別 |
| `baseGeneration` | `GenerationNumber` | internal | Attempt開始時の最後にcommit済みgenerationと一致 |
| `transactionKind` / `scannedSourceId` | `ScanGeneration`と同じclosed value | internal | Commit済みstateを変えず、要求されたsource operationを識別 |
| `status` | `waiting \| running \| committable-complete \| committable-partial \| fatal \| cancelled` | internal | 2つのcommittable outcomeだけが次generationを作成可能 |
| `workingSet` | provisional source graph、file、metadata、relationship、diagnosticまたはnull | internal | Queued中はnull。Running後は1回のatomic commitまで全Public DTOから隔離し、fatal failureまたはcancel時に破棄 |

In-flight attemptのfieldをcommit済みsnapshotへmergeせず、snapshot経由で公開しない。Bounded partial resultは
`committable-partial`へ到達し、generation全体をatomic commitした後だけ公開する。

単一`ScanCoordinator`が`GlobalEnableOperation`、Repository scan、Global scan、Global-disable transactionをserializeし、
2 source scanとroot admissionをconcurrent実行しない。通常source commandはFIFOとする。Global disableはpriority barrierとして受理時に
`globalControl.state: disabling`、empty pending/retry arrayとし、new Global-enable/Global-rescan commandを拒否する。Active
uncommitted transactionをabort/discardし、active/queued Global enable operationをabort/drainし、最後のqueued Global
command cancellation sweep後にzero-I/O disable transactionを次に置く。中断したRepository commandはfresh counterでbarrierの直後へ正確に1回requeueし、中断したGlobal
commandはrequeueしない。Barrierがqueued/active中の2回目のdisableは同じcompletionへjoinし、追加transactionを
作らない。Tool固有Global Source/graph、active consent record、retained admitted Global root context、open Global inspection
`FileHandle`、running/queued Global scan/enable commandが何もない場合、無関係なRepository workの有無にかかわらず
disableは即時no-opとする。
Transactionはその時点のgeneration Nから開始する。Unchanged source graphを
carry forwardし、scanned sourceにはsession-wide file-count、retained-byte、generation-diagnostic budgetの
残量だけを渡し、replacementを別に構築する。`maxVisitedEntries`とdeadlineはactive source jobへ適用する。
Completeまたはcontract済みpartial resultだけが正確にN+1としてatomic commitされる。その時点で全sourceが
N+1を報告し、unchanged sourceを含む全file/recognition/provenance/relationship IDを再生成する。新snapshotは
正常scanしたSourceの`StaleSourceFailure`と予約済みdiagnosticだけをclearし、別Sourceの両方をcarryしてgeneration
scopeのcomparison/editor stateをclearする。Global-disable transactionは同じcommit ruleでtool固有Global graphとその
stale-failure entry/diagnostic pairをfilesystem I/Oなしにすべて除くが、無関係なRepository pairは残す。

Fatal attemptは`ScanGeneration`を作成もpartial mergeもせず、provisional bounded-partial resultを含む
`workingSet`全体を破棄する。N、全prior ID、全commit済みcontentを表示したまま保持する。Attemptが明示rescanの
場合に限りsession overlayでそのSourceの`StaleSourceFailure`と予約済みの実行可能lifecycle diagnosticを作成または
置換し、別Sourceのfailureを保持する。自動の初回Repository scanのfatal failureではbootstrap generation 0をcurrentのままにする。
初回Global enableのfatal failureではmissing tool用の`StaleSourceFailure` entryを追加せず、そのtoolのkey別予約済み
failure diagnosticを作成/置換して既存entryとそこから派生するsnapshot stateをすべて保持する。自動初回Repository failureも
Repository failure slotを使い、どちらもnew inventoryをcommitしなかったことを報告する。Global-disable barrierに
よるexpected cancellationはfailure diagnosticをemitしない。それ以外のbounded safe failureはout-of-generation
session-lifecycle diagnosticとし、表示用`sourceId`とSource-relative Pathを持ててもcustomization source valueを
含めず、`Source.diagnosticIds`やsource/generation capへ入れない。Coordinatorは次のqueued transactionを
still-current Nから開始する。後続のaffected Sourceに対するcompleteまたはbounded-partial正常scanがNをN+1へ
置換してそのentryと予約済みdiagnosticだけをclearし、別Sourceのcommitでは両方を未解決のまま保つ。1 sourceあたりrunning/queued
scan commandは最大1つで、duplicate scan commandはcontract済みconflictを
返す。Disableは上記join/no-op ruleを使い、duplicate scan commandではない。

### ScanProgress

| Field | Type | Rule |
|---|---|---|
| `phase` | `waiting \| cancelling \| enumerating \| reading \| deriving \| recognizing \| complete` | `waiting`はqueue中、`cancelling`はdisable/shutdown abortのdrain中。どちらもpath/source contentを含めない |
| `visitedEntries` | non-negative integer | 最大200,000 |
| `candidateFiles` | non-negative integer | Accepted item最大2,000 |
| `readBytes` | non-negative integer | 最大32 MiB |
| `diagnosticCount` | non-negative integer | Sentinelを含む受理数。最大10,000 |
| `queuedAt` | `UtcTimestamp`またはnull | Accepted commandが別transaction待ちになると設定し、work開始時にclear |
| `startedAt` | `UtcTimestamp`またはnull | Source scan開始時、またはbarrier所有progressではdisable受理時。idle/waiting中はnull |

`Source.progress`は`idle`、`failed`でnullとする。`scanning`では`waiting`にnon-null `queuedAt`とnull
`startedAt`が必要で、active phaseはnull `queuedAt`とnon-null `startedAt`が必要。`disabling`はbarrier drain中の
該当`cancelling` progressを公開する。Commit済み`ready`/`partial` sourceはnull `queuedAt`とnon-null
`startedAt`を持つ最終`complete` progressを保持する。Bootstrapにはsource progressがない。

Disable受理時にpresentな全Global Sourceは直ちに`disabling`となり、そのprogressはnull `queuedAt`を持つ。
Drain対象がGlobal scanなら、そのscanned Sourceはcurrent bounded counterと元scanの`startedAt`を保持し、`phase`
だけ`cancelling`へ変える。Presentな他の各Global Sourceはbarrier所有の全4 counter zero、disable-acceptance時刻の
`startedAt`を持つ`cancelling` progressを公開する。Global scanをdrainしていない場合、presentな全Global Sourceが
このbarrier所有progressを公開する。同時にdrainするRepository scanは自身のcounter/`startedAt`を保持し、`queuedAt`をclearして
phaseだけ`cancelling`へ変える。Single disable commit後に全Global Sourceを除去する。中断Repository commandは
zero counter、`phase: waiting`、requeue時のnon-null `queuedAt`、null `startedAt`で再表示する。Joinしたdisable
requestは全valueを再利用し、別progress recordを作らない。Barrierはsource I/Oをしないため、commit済みdisable
generationの`counters`は引き続きnullとする。

### CustomizationFile

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `fileId` | 128-bit、22-character base64url opaque string | DTO | Generationごとに新規。APIはpathを受け付けない |
| `sourceId` | opaque string | DTO | 1つのenabled Sourceを識別 |
| `boundaryId` | opaque string | internal | FileをそのSourceの唯一のboundaryへbindし、serializeしない |
| `sourceRelativePath` | `SourceRelativePath` | DTO | 所有Source rootからのprimary表示・filter path |
| `aliasSourceRelativePaths` | `SourceRelativePath[]` | DTO | 同じSourceにある別allowlist対象hard-link pathを最大1,024件、sort済みで保持。Symlinkはaliasにしない |
| `identity` | `VerifiedReadReceipt`のfile-handle identity | internal | Alias/race detection専用。Durableとみなさない |
| `verifiedReadReceipt` | `VerifiedReadReceipt`またはnull | internal | 受理済みreadable fileだけにあり、serializeしない |
| `readState` | file read-state enum | DTO | 後述 |
| `parseSummary` | `not-applicable \| all-parsed \| mixed \| all-failed` | DTO | Recognition-level extraction stateのprojection。Vendor validation resultではない |
| `sizeBytes` | integerまたはnull | DTO | Readable fileは最大1 MiB |
| `encoding` | `utf-8 \| utf-8-bom \| unsupported \| binary \| unknown` | DTO | Invalid textはdiagnosticのみ |
| `sourceText` | stringまたはnull | DTO | Readable text fileの完全なdecoded authored source。Literal valueと環境変数参照syntaxを正確に保持し、HTMLではない |
| `contentDigest` | sessionごとのkeyed digest | internal | 再利用可能content hashを公開せずstale検出 |
| `recognitionIds` | opaque string[] | DTO | Accepted customization fileは1つ以上 |
| `relationshipIds` / `diagnosticIds` | opaque string[] | DTO | 同じgenerationを参照。Diagnosticは128件のfile limit内で受理 |

Read stateは`readable`、`unreadable`、`oversized`、`binary`、`unsupported-encoding`、
`stale`、`unsafe-link`、`boundary-rejected`、`limit-skipped`。`parseSummary`は全recognitionが`not-attempted`なら
`not-applicable`、1つ以上がparsedでfailedがなければ`all-parsed`、1つ以上がfailedでparsedがなければ
`all-failed`、parsed/failedが共存すれば`mixed`とする。`not-attempted` recordは後3 projectionを変えない。
Failed recognitionがあっても`readState: readable`なら完全なsourceを表示でき、そのdiagnosticはInspector extraction
だけを説明しvendorに対するvalidity判断ではない。Non-readable stateはnullの`sourceText`を持ち、comparison対象にしない。
Inspectorは`$TOKEN`、`${TOKEN}`、platform上の同等なenvironment referenceのようなstringをauthored textとして
扱う。Source、metadata、relationship、comparison DTOの構築時に、参照先process environment値をread、resolve、
substituteしない。

### ToolRecognition

| Field | Type | Rule |
|---|---|---|
| `recognitionId` | opaque string | Generation内unique |
| `fileId` | opaque string | 複数recognitionが1 physical fileを参照可能 |
| `provenances` | `CandidateProvenance[]` | 共有tool/kind解釈についてのrule/path admissionのsort済み非空set。最大2,000件 |
| `tool` | `copilot \| claude \| codex` | 必須 |
| `kind` | closed customization-kind enum | Instruction、rule、skill、agent、prompt/command、hook、MCP、settings/config、output style、plugin、marketplace、skill metadata |
| `parseStatus` | `not-attempted \| parsed \| failed` | `not-attempted`はallowlist extractorが非該当。`failed`はこのrecognitionだけall-or-nothing |
| `declaredMetadata` | ordered `DeclaredMetadataEntry[]` | Allowlist対象のclosed field IDだけ。Source occurrence順と受理したduplicateを保持し、最大512 entry |
| `diagnosticIds` | opaque string[] | Owning fileのdiagnostic cap内にあるrecognition-scoped extraction failure/limit |

Customization-kind enumは共有するが、各recognizerがpath/interpretation ruleを所有する。共有`AGENTS.md`、
`CLAUDE.md`、`.mcp.json`、skill、marketplaceは1 fileのまま複数recognitionを持つ。`(fileId, tool, kind)` pairごとに
recognitionは正確に1つとする。Compatible admissionはその1 recordへprovenanceをmergeする。同じpairのextractorが
incompatibleなparsed meaningを返した場合、そのrecognitionを`failed`とし、完全なsourceとcompatible provenance
admissionを保持するがmetadata/relationship/derivation resultはpublishしない。Path固有scope、order、documentation
status、applicabilityをlossyなrecognition-level aggregateにしない。
Parserはenvironment referenceをresolveしない。Metadataのdepth、node、scalar、entry limitを超えた場合、truncate
または変換したauthored valueを返さず、そのrecognitionのmetadata extraction全体を破棄してdiagnosticを出す。
完全なreadable `sourceText`は利用可能なまま残す。

Recognitionはclosed tool順`copilot`、`claude`、`codex`、次に表記載のkind順でsortし、opaque IDを使わない。
File間metadata comparisonは`(tool, kind, fieldId, occurrence)`を使い、field ID一致だけで無関係recognitionを比較しない。

### SourceTextRange、ExtractedSourceOccurrence

全authored projectionは最初にinternalな`ExtractedSourceOccurrence` 1件として表す。そのkeyはowning recognition、
closed `fieldId`、zero-based occurrenceからなり、exact authored literal、利用可能ならtyped semantic value、
`SourceTextRange` 1件を持つ。RangeはECMAScript UTF-16 code unitで測るhalf-open `{ start, end }`で、
`sourceText.slice(start, end) === authoredLiteral`の場合だけvalidとする。64 KiB scalar boundは別にUTF-8 byteで測り、
offset unitを変えない。

Metadata、authored relationship、bounded derivationは同じoccurrenceを参照し、そのexact rangeを再利用できる。
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
| `authoredLiteral` | string | DTO | Authored quote、escape、block/collection punctuation、environment-reference syntaxを含むvalue token/spanの正確なdecoded-`sourceText` slice。最大64 KiB UTF-8でdecoded valueに置換しない |
| `sourceOccurrenceKey` | closed field/occurrence origin key | internal | Shared `ExtractedSourceOccurrence` 1件を参照。Relationship/derivation projectionはspanをcopyせずこのkeyを再利用 |
| `sourceRange` | `SourceTextRange` | internal | UTF-16 half-open range。`String.prototype.slice`が`authoredLiteral`と一致 |
| `semanticValue` | bounded `SemanticMetadataValue`またはnull | internal | Typed classification、relationship normalization、bounded derivation専用の別decode value。Serialize/displayしない。Literal表示は可能だがtyped valueがambiguousならnull |

`SemanticMetadataValue`はnull、boolean、string、integer、float、date/time、array、object用のclosedかつJSON-safeな
discriminated unionとする。Integer、float、date/time payloadは明示type tagとbounded canonical stringを使い、
JavaScript number precisionやparser固有date objectにsemantic valueを変化させない。Array/objectは既存の
depth/node/scalar limit内で同じunionをrecursiveに含み、objectはJavaScript object mapではなくordered key/value
entryを使う。

Arrayは正確なsource occurrence順でserializeする。受理したduplicate field occurrenceをmapでcollapseしない。JSON
transport escapeはJSON decode後のDTO stringを変更しない。JSONC syntax-tree range、YAML CST/source-token range、
semantic parseとcross-checkしたbounded TOML lexical span、bounded Markdown/frontmatter/import spanは正確なsubstringを
再現しなければならない。Missing、ambiguous、illegal overlap、non-round-tripping spanはrecognitionのmetadata/relationship/
derivation extraction全体を破棄する。Structural comparisonは`(tool, kind, fieldId, occurrence)`で対応付けて`authoredLiteral`を
比較するため、semanticに同値でもlexicalに異なるvalueを見えるまま保つ。

### CandidateProvenance

| Field | Type | Rule |
|---|---|---|
| `provenanceId` | opaque string | Generationと所有recognition内でunique。Path-relative relationshipの起点に使う |
| `discoveryClass` | `static-candidate \| bounded-derived-candidate` | Relationship/excluded ruleは出現不可 |
| `ruleId` | stable inspection-rule ID | 所有recognitionを受理した同梱ruleの1つ |
| `matchedPath` | `SourceRelativePath` | このruleが受理した正確なcandidate path。同じSource内のfile primaryまたはalias pathであること |
| `seedFileId` | opaque stringまたはnull | Derived candidateでは必須、static candidateではnull |
| `seedProvenanceId` | opaque provenance IDまたはnull | Derived candidateでは必須で正確な1 independently admitted static provenanceをresolve。Static candidateではnull |
| `seedRuleId` | stable rule IDまたはnull | そのexact seed provenanceのrule。Derived candidateでは必須、static candidateではnull |
| `depth` | integer `0..1` | Staticは0、derivedは1 |
| `declarationKey` | closed field/component identifierまたはnull | 任意のauthored declaration valueを複製しない |
| `seedSourceOccurrenceKey` | internal occurrence referenceまたはnull | Declaration-driven derivationではseedのexact authored occurrenceを再利用。Staticまたはfixed matched-path derivationだけnull |
| `scope` | `ScopeDescriptor` | Runtime effectivenessをevaluateせずclosedかつdisplay可能なadmission scopeを説明 |
| `documentationStatus` | documentation-status enum | このruleからコピーし、runtime applicabilityと分離 |
| `applicability` | `ApplicabilityAssessment` | このrule/path/seed admissionだけのconditionとsummary |
| `order` | `OrderDescriptor`またはnull | このadmissionについて文書化されたbroad-to-narrow/fallback factだけ |
| `behaviorRefs` | `VendorBehaviorStatement.behaviorId`[] | Ruleからcopyし、該当surface lookup statementを示す |
| `strategyRefs` | `RuntimeCompositionStrategy.strategyId`[] | このprovenanceのorder/applicabilityで実際に考慮したstrategy |
| `sourceRefs` | `OfficialSourceRecord.sourceId`[] | 曖昧なproduct aggregateではなく、このprovenanceの正確なvalidated evidence union |

Provenanceはsource identity、`matchedPath`、`ruleId`、`seedProvenanceId`、`seedRuleId`、
`declarationKey`でdeduplicateし、同じphysical seed fileのhard-link aliasを含む2つのseed provenanceからの宣言を
まとめない。Staticとderivedの両ruleで受理した
fileは1回だけ読み、両entryを保持する。全derivation provenanceは1本のtyped edgeで、別edgeのseedには
なれない。同じphysical fileの独立static provenanceは自身のtyped ruleをseedにできる。
Arrayのstable orderは`matchedPath`、`ruleId`、resolve済みnullable seed provenanceのstable
source/boundary/`matchedPath`/rule key、nullable declaration keyとする。Opaque file/provenance IDはidentityをresolve
するがsortには使わない。Overflow時は
追加admissionを停止してgenerationをpartialにする。

独立受理済みstatic seed provenanceごとに、typed extractorはderivation `ruleId`、closed declaration
field、zero-based source occurrence順で列挙する。Validate後、seedのstable provenance key、derivation
rule、normalized target、declaration keyでdeduplicateし、最初のoccurrenceを残す。先頭128 distinct targetは
通常のcandidate/safe-read limitへ進める。129件目でtargetのstat/read前にそのseedのderivationを停止し、
generationをpartialにしてfixed-code diagnostic candidate 1件をdiagnostic aggregatorへ渡す。Known
unsatisfied/shadowed seedは何も生成せず、未解決eligible static seedはconditional candidateだけを生成し、
bounded-derived provenanceはこのalgorithmに入らない。
Validationはgeneration-bound ticket選択前に行い、contractのplatform-independent NFC segment grammar、列挙済みの
collision-free entry 1件とのexact match、canonical component-identity checkを適用する。このためADS/device/
trailing-dot-space、ambiguousなcaseまたはnormalization alias、8.3 aliasは、そのspellingが解決可能なhostでも
開かず拒否する。1 NFC classification recordへuniqueにmapするNFD raw spelling 1件はaliasではなく、その
recordを通じてeligibleのままとする。

### ScopeDescriptor、OrderDescriptor

Public scope/order shapeはclosed DTO unionとし、rendering/comparisonをimplementation固有objectへ依存させない。

`ScopeDescriptor`は`kind`とvariantごとに次のfieldだけを持つ。

| `kind` | 追加field | 意味 |
|---|---|---|
| `source-root` | なし | Owning Repositoryまたはtool固有Global Source root |
| `directory-subtree` | `path: SourceRelativePath` | Collision-freeな1 Source-relative directoryとそのdescendant |
| `matching-path` | `path: SourceRelativePath`, `selectorIndex: 0..31` | Exact admitted pathとimmutable matcher-selector alternative |
| `declared` | `fieldId`, `occurrence` | Authored valueを複製せず1 `DeclaredMetadataEntry`を参照 |

Path fieldはprovenanceと同じSource/boundaryに属する。Stable scope keyは上記variant順、次に該当するSource-relative
path、selector index、field ID、occurrenceとする。

`OrderDescriptor`は次のclosed unionからなるordered `components` array 1..4件を持つ。

| Component `kind` | Field | 意味 |
|---|---|---|
| `path-depth` | `direction: broad-to-narrow \| narrow-to-broad`, `depth: 0..64`, `path: SourceRelativePath` | Documented path-layer orderだけ |
| `registry-rank` | `strategyId`, `rank: 0..255` | 1 strategy内の固定documented fallback/precedence rank |
| `source-occurrence` | `fieldId`, `occurrence` | Valueをcopyしないauthored declaration order |

Componentはdocumented pipeline順で保持する。Stable comparison keyはcomponent position、上記component-kind順、次に
direction/depth/path、strategy/rank、またはfield/occurrenceとする。Unknown/conflicting orderはfabricated rankではなく
nullとapplicability/documentation factで表す。

### ApplicabilityAssessment

| Field | Type | Rule |
|---|---|---|
| `summary` | `authored \| available \| selected \| omitted \| shadowed \| disabled \| conditional \| unknown` | 便宜的projectionにすぎず、`effective`と呼ばない |
| `conditions` | `ConditionFact[]` | 最大64件、key・reason code・basis・status順でsort/deduplicateし、欠けたinputをtrueにしない |
| `strategyRefs` | sort済みstrategy ID[] | Projectionに使ったstrategy。Authorshipしか判明しない場合はempty |
| `evaluatedFromGeneration` | integer | Rescanを越えてfactを残さない |

各`ConditionFact`は`key`（`surface`、`engine-version`、`runtime-cwd`、`workspace-root`、
`repository-root`、`project-root`、`worked-path`、`target-match`、`scope-availability`、`feature-state`、
`trust`、`approval`、`enablement`、`selection`、`settings-inputs`、`plugin-state`、`agent-context`、`event`、
`content-limits`、`documentation-variant`、`tool-availability`、`installation`、`managed-policy`、
`instruction-byte-budget`、`external-runtime`）、
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

### Relationship

| Field | Type | Rule |
|---|---|---|
| `relationshipId` | opaque string | Generation内unique |
| `fromFileId` | opaque string | 必須 |
| `fromRecognitionId` | opaque string | 必須。`fromFileId`に属し、`fromProvenanceId`を所有すること |
| `fromProvenanceId` | opaque string | 必須。その`matchedPath`だけをpath-relative normalizationのbaseにする |
| `ruleId` | stable relationship-only rule ID | 参照がreadを許可できないことを示す |
| `kind` | `import \| declared-component \| skill-resource \| plugin-source \| agent-reference \| context-inheritance \| runtime-reference \| order \| fallback` | Descriptiveのみ |
| `targetOrigin` | `authored \| documented-default` | `authored`はexact source occurrenceを1つ要求し、`documented-default`は省略Codex plugin hookのようなregistry固定defaultだけに許可 |
| `authoredTarget` | stringまたはnull | `authored`ではauthored quote/escapeを含むtarget token/spanの正確なdecoded-source slice。`documented-default`ではnullとし、synthetic pathをauthoredとして表示しない |
| `sourceOccurrenceKey` | internal occurrence referenceまたはnull | `authored`では該当時にmetadata/derivationと同じ`ExtractedSourceOccurrence`を参照。`documented-default`ではnull |
| `targetSourceRange` | `SourceTextRange`またはnull | Internal。`authored`では必須でUTF-16 offsetを使い`authoredTarget`を再現。`documented-default`ではnull |
| `semanticTarget` | bounded string | Internal。Path normalization/applicability専用の別decode済みauthored targetまたはregistry固定default。Authored display valueへ置換しない |
| `normalizedTarget` | `SourceRelativePath`またはnull | Lexical normalizationが安全で、targetが所有Source内に残る場合だけ設定 |
| `boundaryStatus` | `inside \| outside \| invalid \| unknown` | Readを許可しない |
| `resolutionStatus` | `not-followed \| independently-admitted \| missing \| rejected` | Relationship自体はcontentを展開しない |
| `documentationStatus` | documentation-status enum | Runtime-dependentまたはconflicting referenceを明示したままにする |
| `behaviorRefs` | sort済みbehavior ID[] | Edgeの説明を許すsurface-specific upstream statement |
| `strategyRefs` | sort済みstrategy ID[] | Edgeについて考慮したcomposition/selection strategy |
| `sourceRefs` | sort済みsource ID[] | Relationship rule、behavior、strategy recordからの正確なevidence union |
| `applicability` | `ApplicabilityAssessment` | Edge固有context/tool/trust/selection fact。Targetのread authorityにはしない |

Relationshipはdirectのみ。最大depth 1、1 file最大1,000件。Candidate targetはstaticまたは
bounded-derived ruleで独立して受理し、relationship自体はtargetを昇格させない。Typed candidate
derivationは`CandidateProvenance`で表し、別のdepth/count limitを持ち、relationship traversalではない。
Relationship summaryは、既知product ruleの下でreference edgeがavailable/selectedになり得るかだけを表し、
target fileのeffectivenessを表さない。

抽出済みreferenceはapplicableなcandidate provenanceごとにemitし、hard-link aliasや別rule admissionが
別provenanceのdirectoryをrelative baseとして借用しない。各extractorはclosed declaration-field identifier、
`targetOrigin`、zero-based sourceまたはdeterministic synthetic occurrenceだけからなるinternal origin
keyを付ける。Authored field valueを含めず、serializeしない。Deduplication keyは`fromFileId`、
`fromRecognitionId`、`fromProvenanceId`、`ruleId`、`kind`、origin key、target identityである。Target
identityは利用可能ならnormalized target、そうでなければ`authored`のexact authored targetのprocess-keyed digestまたは
`documented-default`の固定default IDとし、digest/default IDをmemory外やlogへ出さない。Extractorは起点provenanceのstable array key、recognition tool/kind、
relationship `ruleId`/kind、declaration-field identifier、source occurrenceの順でemitし、opaque IDをsortに
使わない。Semantic targetが同じでも別authored source occurrenceは別edgeのまま保つ。Documented defaultは
`authoredTarget: null`とし、UIはdocumented defaultとlabelしてbounded `normalizedTarget`を表示してよいが、
source-authored textとは表示しない。
1つのdeclared fieldがmetadata、relationship、derivationを駆動する場合、3 projectionはその1 occurrence/rangeを
参照し、distinct origin occurrence間のoverlapだけがextraction failureになる。
Opaque IDはorderに使わない。1,001件目のdistinct edgeでそのfileの
extractionを停止し、先頭1,000件を同じ順序で保持してgenerationをpartialにし、fixed-code limit diagnosticを
1件diagnostic aggregatorへ渡す。Outer diagnostic capが抑止した場合は、そのcapのfixed sentinelが抑止を
表す。保持対象を決める間もtargetを開かない。

### Diagnostic

| Field | Type | Rule |
|---|---|---|
| `diagnosticId` | 最大64 byteのopaque ASCII string | Server生成でgeneration/session内unique |
| `code` | stable closed code | Objective testとdocumentation linkに利用可能 |
| `severity` | `info \| warning \| error` | Vendor validationを意味しない |
| `sourceId` / `fileId` | 最大64 byteのoptional opaque ASCII ID | Client pathを受け付けずscope指定 |
| `messageKey` | localized key | 英語・日本語messageを同等に保つ |
| `safeArgs` | bounded JSON-safe map | Customization source、宣言済みmetadata値、comparison content、process environment値、任意exception string、outside pathなし |
| `nextStepKey` | localized key | 全errorが実用的な次actionを示す |

Closed diagnostic-code registryがseverity、message/next-step key、code固有argument schemaを固定する。
`safeArgs`はscalar最大16 entryで、stringはpresentation escape後最大256 UTF-8 byteとする。Candidateはcode、
source/file ID、canonical safe argumentでdeduplicateし、固定phase、source/boundary、Source-relative Path、
rule/code、emitter occurrence順でemitする。Opaque IDはretention orderに使わない。

Aggregation前に各candidateを正確に1つのlifetime classへ割り当てる。Scan candidateは1つの
`ScanGeneration`に属し、applicableなfile/source/generation capを全て通す。各aggregatorは最終slotを予約し、
detailを最大127、4,999、9,999件保持する。Commit不能なfatal scan attemptを含むout-of-generation
lifecycle candidateはsessionだけに属して別session capを通し、generation/source ID listへ入れない。
Authentication、malformed request、その他client起因API errorはresponseで返すがdiagnosticとして保持しない。
Session aggregatorはRepository、Copilot、Claude、Codexをkeyとする固定failure slotを正確に4つ、session-limit sentinel用に
最終slotを予約し、通常lifecycle detailを最大1,019件保持する。各slotはcurrentな実行可能diagnosticを最大1件持つ。
Repository slotは自動初回Repository failureまたはRepository fatal rescan、各Global tool slotはconsent後rejection、fatal
初回enable、またはpublished Sourceのfatal rescanを保持する。Global control diagnosticはSource publish前/時にclearするため、
そのSourceの後続stale-failure diagnosticと共存しない。同じkeyの後続outcomeはslotを置換し、Repository refresh成功、Global
Source publish/refresh成功、Source removal、Global disableはapplicable slotをclearする。無関係なtool/Source commitは保持する。
予約済みdiagnosticは通常lifecycle detail overflowで抑止されず、surviveしたIDは`sessionDiagnosticIds`に残る。

Lifecycle byte admissionはcount admissionと同じdeterministic順を使う。通常detailが使えるのは16 KiB fixed-diagnostic reservationを
除いた2 MiB lifecycle-diagnostic budgetだけである。4つのkeyed failure slotとsession sentinelはそのreservationを使い、各recordは重複IDを
含む2 KiB chargeにも従う。想定外に大きいkeyed failureは固定compact per-key formへ変換し、oversized ordinary detailは
抑止する。Count/byteいずれのoverflowも同じ
saturating session-sentinel suppressed countを増やす。Keyed slot置換はold record分をcreditしつつreplacementをchargeしてから
atomicに受理するため、overlayは一時的にも最終的にもbyte budgetを超えない。

Overflow sentinel用slotはoverflowまで未使用のままとする。Applicableなdetail allowanceを超える最初のdistinct
candidateで、そのslotへfixed `diagnostic-limit-file`、`diagnostic-limit-source`、
`diagnostic-limit-generation`、または`diagnostic-limit-session` sentinelとsaturating 32-bit suppressed countを
置き、後続detailはcountして抑止する。Applicableな全capを通過したdiagnosticだけを`diagnostics`またはID
listへ載せる。Scan-class overflowはgenerationをpartialにする。Session-class overflowではsession sentinelに加え、
使用中のRepository/Global-tool failure slotをすべて保持する。Commit済みgeneration contentを置換せず、派生するsession
snapshot stateも変更しない。

Unknown internal exceptionはgeneric codeとmemory内だけのcorrelation IDへmapする。Stack traceとraw parser
errorは既定でbrowserへ送らない。
Closed registryは`safe-fs-root-rejected`、`safe-fs-boundary-unverifiable`、`safe-fs-link-rejected`、
`safe-fs-device-changed`、`safe-fs-entry-stale`、`safe-fs-race-detected`、
`safe-fs-file-metadata-changed`、`safe-fs-path-normalization-collision`、`safe-fs-open-failed`を含む。ArgumentにOS error text、outside path、
filesystem handle/descriptor、source byteを含めない。

### BrowserState

このstateはauthoritativeではなく永続化しない。

- `FilterState`: 選択したsource/tool/kindとSource-relative Path query。
- `ClientDataState`: Monotonicな`clientDataEpoch`、`currentGeneration`、session/detail requestごとのrequest tokenを
  保持する。Session responseはrequest tokenがcurrent epochに属する場合だけadoptする。Generationが
  `currentGeneration`未満なら無視する。Greater generationをadoptする前にepochをincrementし、全detail/comparison
  requestをabortし、全detail/editor/comparison objectをdisposeしてからinventoryを置換する。Equal-generation responseは
  exactなstill-current request tokenだけを受理する。Detail requestは
  `{ clientDataEpoch, generation: currentGeneration, fileId }`をcaptureし、callback時にもepoch/generationがcurrent stateと一致し、その
  readable `fileId`がinventoryに残る場合だけresponseをadoptする。全invalidation/purgeが同じepochをincrementするため、
  response deliveryが既にqueue済みでもlate callbackはno-opになる。
- `ComparisonSelection`: active generation内のreadableな`fileId`を0または正確に2つ。Literal comparisonは
  Monacoで両方の完全な`sourceText`を比較し、Vueで返却済みの完全な`declaredMetadata`値をsource textへ
  serializeせず比較する。Credential-like stringやenvironment referenceを含むliteralな差を表示する。
- `EditorModelState`: Opaqueなin-memory URIと完全なauthored `sourceText`を持つgeneration-scoped Monaco model。
  所有editor、subscription、全modelはroute close、selection replacement、file removal、source disable、
  generation変更時に個別にdisposeする。
- `SensitiveContentNoticeState`: 固定warning objectとcurrent authorized browser-session memory lifetime用の
  `acknowledged` boolean。完全なauthored contentは機密値を含み得るため、UIは最初のsource-detail requestまたは
  comparison構築前にacknowledgementを要求する。一度acknowledgeすればそのSPA sessionでは両surfaceを対象とし、
  reload/closeで失う。このclient-only stateはAPIへ送信せずread authorityを与えず、中央purge pathで破棄する。
- `RecoveryViewState`: Hidden-page purge後、retained capabilityがfresh sessionを認証した場合だけ作る。採用した
  `sessionId`、fresh `globalControl` projection、任意のnewly verified frozen previewだけを保持する。常に明示的な
  **Resume inspection** actionを提示する。Global controlがactiveならdisableを直ちに提示し、preview検証済みかつ
  `pendingTools`がemptyの場合だけretryを提示する。Resumeはsessionを再取得して返された`sessionId`が採用済みliveness
  baselineと一致することを要求し、default filterのfresh inventory-summary viewをatomicに構築する。以前のdetail、
  comparison、editor、warning acknowledgement、authored sourceは復元せず、後でdetail/comparisonを開く場合はnew
  acknowledgementを要求する。Authentication failure時は表示済みprocess-lifetime URLを開き直すauthorization-lost
  next stepだけを残す。
- `SessionLivenessState`: 期待`sessionId`、monotonicな2秒のbrowser-memory lease、同じ`clientDataEpoch`を保持する。Authorized pageが
  visibleな間、capability保護liveness routeを1秒ごとに750 ms request timeout付きで呼ぶ。Timeout、network error、
  `401`/`403`、session-ID mismatch、lease expiryでは、session-ended viewをrenderする前に中央purgeを同期実行する。
  全Monaco editor/model/worker/subscriptionをdisposeし、comparison/notice/filter stateをclearし、全source/detail/metadata/
  diagnostic DTOとDOM textを除去してpending requestをabortし、epochをincrementして旧epochで開始したresponseを無視する。
  `visibilitychange`でhiddenになった時点、`pagehide`、
  `beforeunload`でも同じpurgeを直ちに実行し、background timerによるretentionを避ける。Visibleへ戻る場合はfreshな
  authenticated snapshotを要求し、source/detailまたはcomparisonを後で開く場合だけnew warning acknowledgementを要求する。
  Memory-only capability自体はhidden-page purgeを越えて保持する。
  Retained capabilityでfresh snapshotを認証し、purge済みIDを保持・比較せず返された`sessionId`をnew liveness baselineとして採用する。
  `globalControl` projectionだけから`RecoveryViewState`を作り、その他の全fieldをinventory/detail/
  comparison/acknowledgement stateへ復元せず破棄する。Projectionがnon-nullならmatching frozen previewを取得してからretry
  controlを再構築する。
  Authentication failureではsession-ended viewを維持する。Service worker、browser storage、HTTP cacheへcontentを
  永続化しない。Applicationが保証するのはlive referenceの除去であり、JavaScript制御外browser-process memoryの物理的
  zeroizationではない。

## State transition

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
0 source -- accepted enable --> 0..3 provisional scan job（toolごとに最大1つ）
0 job ------------------------> active-no-job（active control、Sourceなし）
各job -----------------------> ready/partial Sourceを1つcommit
                             \-> そのtoolのSourceなし（commit済みgraph/stale stateは不変、control diagnostic更新）
ready/partial -- accepted per-source rescan --> scanning --> ready/partial
                                                       \-> failed/stale（own entryを作成）
failed/stale -- accepted per-source rescan --> scanning --> ready/partial（own entry + diagnosticをclear）
                                                       \-> failed/stale（own entry + diagnosticを置換）
active Global control（0..3 Source） -- disable --> disabling/cancelling barrier --> inactive / 0 Source
```

Enableには一致する`GlobalConsent`が必要。Disableはcoordinator barrierを実行し、次DTO公開前にGlobal file、
generation diagnostic、control所有lifecycle diagnostic、comparison、source text、root contextをすべて削除し、
carried Repository entityをrekeyする。Lexical consent previewは`Source`ではない。Accepted enableはconfirmed済みeligible tool
ごとに最大1つのSourceをcommitし、各Sourceは1 rootだけを持つ。Disable commit後はすべてabsentになる。初回enable
失敗ではSourceをcommitせず、そのtool用の`StaleSourceFailure` entryを追加せず、toolのkey別予約済みfailure diagnosticを
作成/置換して既存entryとそこから派生するsnapshot stateを変更しない。明示的なper-source rescan失敗では、そのSourceの
以前のcommit済みgraphをreadableのまま保持しsnapshotをstaleにする。どちらでも公開済みfailed Sourceの`progress`は
nullとし、cap対象の実行可能なlifecycle diagnosticが破棄済みattemptを説明する。Fatal enable/rescanはnew graphも
partial graphもcommitしない。正確なconsentとadmit済みrootはsession control stateとして保持してretry/disableを
可能にし、どのSourceも別rootへfallbackしない。

Diagramの`current`/`stale` suffixはsession全体ではなく、そのSourceが`StaleSourceFailure`を所有するかを示す。
別Sourceの未解決entryにより、このSourceがready、partial、またはcurrentでもtop-level `snapshotState`はstaleに
なり得る。

### Customization file

```text
candidate -> readable + not-applicable/all-parsed/mixed/all-failed parse summary
                     -> 次generationでstale/removed
          -> unreadable/oversized/binary/unsupported-encoding
          -> unsafe-link/boundary-rejected/limit-skipped
```

どのtransitionもsourceへwriteしない。Rescanはold file recordをin-place mutateせず新entityを作る。

## Entity横断invariant

1. Generation scopeの全DTOは1つのsessionと最後にcommit済みのgenerationに属し、置換済みgenerationのIDは
   `404 stale-resource`を返す。Fatal attemptはpublic IDを作らず、保持generationのIDを変えない。
2. Repository sourceは正確に1つで、Git rootでなくてもboundaryはlaunch `cwd`である。
3. Globalは全新processでdisabledである。SessionはGlobal Sourceを0から3つ持ち、Copilot、Claude、Codexごとに
   最大1つとする。各Sourceはcurrent allowlistで同じtoolについてconsent済みのboundaryを正確に1つ所有する。
4. Accepted file pathは同梱したstaticまたはtyped bounded-derived ruleで許可され、safe-read checkを
   独立して満たす。Parsed valueがaccessを許可できるのはその正確なderivation ruleを満たす場合だけで、
   relationship/excluded ruleは決して許可しない。
   Authorizationは既存`ScanEntryTicket`をselectし、中央safe-filesystem layerだけがそのticketと所有active
   `InspectionRootContext`を組み合わせられる。Readable resultは文書化したpre-open、pre-read、post-read checkを
   全て通らなければならず、client path stringはcontext/ticket pairの代替にならない。Filesystem operationにはraw
   entry-name segmentだけを使い、NFC classification collisionはfail closedにする。Global traversalはconsent-bound
   `TraversalPlan`に表されたexact operationだけを行う。
5. Physical fileはsource/generationごとに1つの`CustomizationFile`とtool/kind pairごとに最大1 recognitionを持つ。
   受理済みかつ上限内のhard-link aliasは`aliasSourceRelativePaths`で見えるままにし、source contentを重複しない。
   Overflowは要求済みpartial resultとdiagnosticで表す。
6. 全readable file DTOは完全なauthored `sourceText`を返し、返却する宣言済みmetadata値とauthored relationship targetは
   validated済みの正確なUTF-16-indexed `String.prototype.slice`とする。Documented defaultはauthored textをnull、
   originを明示する。Metadata/relationship/derivationは1 exact occurrence rangeを再利用できるが、distinct originは
   overlapできない。Comparisonはauthored sliceと`(tool, kind, fieldId, occurrence)`を使い、semantic decode後もauthored literalの差を
   保持する。Environment referenceはliteralのままでprocess environmentのlookup/substitutionを
   起こさない。Operational diagnostic、log、progress、exceptionはcustomization source、宣言済みmetadata、
   comparison valueを複製しない。
7. Documentation status、authored/installed state、selection、trust、enablement、その他condition factを
   provenance固有かつ直交したまま保ち、「effective configuration」やlossyなrecognition-level winnerへ
   まとめない。
8. Typed derivationは厳密に1 closed `DerivationProgram` edge、exact `seedProvenanceId`ごとに最大128 targetであり、generic relationshipとbounded-derived
   provenanceをseedにしない。Physical fileがderived provenanceも持つ場合でも、独立static provenanceは
   eligibleなままとする。
9. File起点relationshipは1つのrecognitionとcandidate provenanceを指定し、そのprovenanceの
   `matchedPath`だけをrelative targetのbaseに使う。
10. 全array、string、parse/worker message、retained graph record、response byte、comparison、request body、
   filesystem work、derivation、relationship extractionをexact count/byte budgetでallocation/processing前に制限する。
11. Browser editor modelはopaqueなin-memory identityを使い、filesystem/remote URLを使わず、active routeと
   generationを越えてsourceを保持しない。Source/comparison surfaceはauthored content表示前にsessionの
   sensitive-content noticeを提示する。Liveness leaseと中央purgeはsession loss、hidden/page lifecycle event、
   browser-memory lease expiry時にapplication保持session contentをすべて除去する。Generation replacementは
   `clientDataEpoch`をincrementし、responseから旧generationを復活させない。
12. 全behavior、rule、strategy、source IDは、所有するbilingual contractとexecutable registryで正確に1回だけ
    定義する。Registryの`sourceRefs` arrayは所有rowのdirect Evidence cellと一致し、official-source逆引きindexと
    相互一致する。Runtime provenance/relationship DTOは表示用にこれらdirect recordのdeterministic unionを公開してよいが、
    そのderived unionはregistry backlinkを変更しない。Missing、duplicate、orphan、language-divergentなrecordは
    buildをfailさせる。
13. Vendor lookup base/traversalとInspector matcherは別record typeである。全Repository matcherは`./`で始まり、
    bare `**/`はinvalidとする。`./**/`は明示的な下向きInspector inventoryだけを意味し、vendor traversalや
    runtime selectionを意味しない。
14. `snapshotState`はsession所有の`staleFailures`から派生し、commit済み`ScanGeneration`へ保存せず変更にも
    使わない。各entryは1つのSourceとその予約済み実行可能diagnosticを識別し、そこから`ScanAttempt`やworking-set
    memberへ到達できない。そのSourceのcomplete/bounded-partial正常scanまたはSource除去だけがentryと予約済みdiagnosticをclearし、
    無関係なcommitは両方を保持する。
15. Coordinator lockは全session snapshot/file-detail envelopeのgenerationとpayloadをlinearizeする。Network deliveryが
    後になってもcapture済みpayloadをrelabelできない。Clientはadopt時にrequest token、generation、epoch、file存在を全て再確認する。
16. Global previewはbounded raw `lexicalRoot`をprocess memoryだけに保持し、それとexact `TraversalPlan`をdigestへbindして、
    保存済みraw valueをadmissionに使う。Escaped `displayRoot`はpresentationだけで、enableはenvironment inputを再読込しない。
17. Commit済みgenerationのneutral-overlay SessionSnapshot projectionは最大5 MiBとする。Session所有lifecycle recordは
    重複ID occurrenceを含む独立2 MiB sub-budgetだけを使い、そのうち16 KiBをfixed diagnostic-control record用に予約する。
    その他session所有mutable projectionは分離した1 MiB control sub-budgetを使う。両者で3 MiB overlayを構成するため、
    全post-commit session mutation後もcomplete-envelope 8 MiB limit以内に必ず収まる。
