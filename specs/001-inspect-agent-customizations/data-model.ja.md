# Data model: エージェントカスタマイズの調査

[English](data-model.md)

Modelには2つの表現がある。

- **Internal session record**はcanonical path、検証済みread中のfile descriptor、raw byte、atomic snapshot
  構築中のdecoded authored contentを含み得る。Operational diagnosticとlogには入れない。
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
│   ├── SourceBoundary（正確に1つ。admissionまでroot contextなし）
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
├── StaleSourceFailure（未解決の明示rescan失敗を0以上）
├── OperationError（outer-boundary failureを0以上。scan resultではない）
├── GlobalConsentPreview（current lexical previewを0または1つ）
├── GlobalConsent（active recordを0または1つ）
│   ├── GlobalToolControl（confirmed toolごとに1つ。任意のInspectionRootContextを所有）
│   └── GlobalControlView（recover可能なpublic control DTOをnullまたは1つ）
├── GlobalEnableOperation（running/queued cancellable commandを0または1つ。internal）
├── GlobalDisableOperation（joined priority-barrier commandを0または1つ。internal）
├── ClosableResourceRegistry（process-wide internal ownership/state registryを1つ）
└── Diagnostic（session/source level failure）

BrowserState
├── FilterState
├── ComparisonSelection（0またはreadable fileを正確に2つ）
├── EditorModelState（0以上。active route/generationのみ）
├── SensitiveContentNoticeState（session内だけのpresentation state）
├── RecoveryViewState（control-onlyなpurge後recoveryと明示resume）
└── SessionLivenessState（authorized pageのlifecycle-check/purge state）
```

## Entity

### InspectionSession

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `sessionId` | opaque string | DTO | Processごとにrandom。API capabilityではない |
| `apiVersion` | literal `1` | DTO | 非互換clientを拒否する |
| `createdAt` | `UtcTimestamp` | DTO | Process開始時刻 |
| `sources` | `Source[]` | DTO | Repositoryを正確に1つ、Globalを0から3つ。Copilot、Claude、Codexごとに最大1つ |
| `activeGeneration` | `GenerationNumber` | DTO | 最後にcommit済みのsnapshotを識別し、completeまたはcontracted-partialの正常commit時だけ単調増加 |
| `snapshotState` | `current \| stale-after-fatal-rescan` | DTO | `staleFailures`から派生し、未解決の明示rescan失敗が1件以上ある間だけstale |
| `staleFailures` | `StaleSourceFailure[]` | DTO | Published Sourceごとにcurrent entryを1件持ち得る。Source順にsortし、`snapshotState`がcurrentの間だけ空 |
| `globalControl` | `GlobalControlView \| null` | DTO | Active consent/control stateがない場合だけnull。Canonical rootを公開せず、purge後のfresh authenticated clientが即時disableとpreview-gated retry controlをrecoverできる |
| `globalEnableInProgress` | `{ kind: 'initial-enable' \| 'retry', operationId, previewId } \| null` | DTO | Registered Global enable operationを示すread-only coordinator projection。Tool subset/outcome、root、context、source/boundary/scan ID、job、authorityを含まず、fresh clientがduplicate retryを抑止し、frozen preview再取得とdisableを実行できる |
| `globalDisableInProgress` | `{ operationId, state: 'draining' \| 'committing' \| 'failed' } \| null` | DTO | `globalControl`がnullの場合も含むnon-complete disable barrierのread-only projection。Root/content/resource ledgerを含まず、control-only all-inspection-data fenceをselectし、fresh clientがcleanupへjoin/retryできる |
| `globalContentEpoch` | non-negative safe integer | DTO | 0から開始し、non-no-op Global disable barrierのfirst acceptanceごとにatomic incrementする。全liveness/inspection-data successをbindし、serverはfence時点で未linearizeのsuccessをrejectし、clientはgreater epoch観測後にolder dataをrejectする |
| `sensitiveContentWarning` | `{ messageKey, nextStepKey, acknowledgementScope }` | DTO | Source/comparisonを開く前にcomplete authored contentが機密値を含み得ると固定localized keyで説明し、scopeはliteral `authorized-browser-session` |
| `sessionDiagnosticIds` | opaque string[] | DTO | Currentなout-of-generation lifecycle diagnostic |
| `repositoryFailureDiagnosticId` | opaque session Diagnostic IDまたはnull | DTO | Currentな決定的automatic Repository admission/initial-scan failure。最初のexplicit rescan実行中は保持し、successでclear、terminal failureではそのrescanの`StaleSourceFailure` ownerへatomic replace |
| `globalDisableOperationErrorId` | opaque Operation Error IDまたはnull | DTO | Consent/control DTOが存在しない場合も含むcurrent post-acceptance Global-disable barrier failure。後続disable正常完了時だけclear |
| `operationErrors` | `OperationError[]` | DTO | Accepted REST operation/jobのcurrent generic outer-boundary error。GenerationにもDiagnostic listにも含めない |
| `capability` | 256-bit random token | internal | Constant-time比較。snapshot/logへserializeしない |
| `previewDigestKey` | 正確に32 random byte | internal | Global preview用の独立HMAC key。Process-session bootstrapで1回生成し、serialize、log、persist、Worker/child processへの送信を行わない |
| `invocationCwd` | absolute platform path string | internal | CLI validation前に`process.cwd()`から正確に1回captureしたvalue。変更せず、read authorityとして公開しない |
| `cwdOptionValue` | exact stringまたはnull | internal | 省略時null。それ以外はlifecycle/audit correlation専用にsole validated `--cwd` argumentを保持する。Lexical selection後はfilesystem operandに使わない |
| `selectedRepositoryRoot` | parser-accepted absolute platform path string | internal | `--cwd`省略時は`invocationCwd`。指定時はabsolute optionを保持するか、下記Windows pre-resolution rejection gate後のplatform-validなplain relative optionだけをそれに対してlexicalにresolveする。Resultは、先行する固定package所有integrity readとは独立してselection-stageのfilesystem/network I/O 0件でshared pure `LexicalAbsoluteRootParts`へ合格する |
| `closableResourceRegistry` | `ClosableResourceRegistry` | internal | 全open済みinspection `FileHandle`/`fs.Dir`のsole process-wide owner/state machine。Serializeしない |

`InspectionSession`はnormal full snapshotで、`globalDisableInProgress`がnullの場合だけ返す。Disable barrier acceptance後はcommit済みgeneration/全Sourceを
cleanup/retry用にinternal保持してよいが、full session、inventory、generation、Source、file、detail、Diagnostic、relationship、authored metadata、
comparison routeはすべて`409 global-disable-pending`を返す。Session routeだけは下記control-only `GlobalFenceRecoverySnapshot`を返す。
各data handlerは`globalContentEpoch`をcaptureしてsuccess bodyを完全構築した後、coordinator lock下でepoch不変かつfence nullを要求してbodyをbindする。
それ以外はbodyをdiscardしてconflictを返す。Acceptance前に完全bind済みbodyはpre-fence-authorizedでrecallできず、別tabはgreater epoch/fence観測まで
receive/adoptし得る。このbounded in-flight residualをretroactive revocationと主張せず明記し、下記browser purgeがobservation後に除去する。
Disableが`failed`でもdata accessをrestoreしない。`remove-active-state`のterminal successはnew Repository-only generationをpublishし、
`cleanup-only`のterminal successはfenceを除去して変更のない既存generationを再公開する。Unrecoverable cleanupではprocess restartをfallbackとする。

### GlobalFenceRecoverySnapshot

`globalDisableInProgress`がnon-nullの間、session responseはこのexact DTOだけとする。正確に`{ sessionId, apiVersion, liveness,
globalContentEpoch, globalControl, globalEnableInProgress, globalDisableInProgress, toolFailureDiagnostics, lastGlobalOperationError,
globalDisableOperationError }`を含み、disable projectionはrequired/non-nullである。`toolFailureDiagnostics`は`globalControl.toolFailures`参照先の
pathless session Diagnosticだけを含み、各optional errorは対応control/error IDが指定するexact recordとする。Generation、Source、Repository failure、
stale failure、unrelated Diagnostic/error、file、path、authored value、resource fieldを一切持たない。

CLIは`process.cwd()`を正確に1回captureし、missing/emptyまたはduplicateな`--cwd`、U+0000 code unit、unpaired UTF-16 surrogateを
session作成前に拒否する。Windowsでは
`resolve`を呼ぶ前にexplicit two-leading-separator UNC/server-share/device spelling、single-separator current-drive/root-relative value、`C:`/`C:foo`を含むdrive-relative valueを
すべてrejectする。Plain relative optionだけをcaptured anchored drive-form `invocationCwd`に対してlexical resolveし、absolute drive optionは変更せず保持する。
POSIXはabsolute optionを保持するかrelative optionをcaptureに対してlexical resolveする。Option省略時の`invocationCwd`を含むselected absolute resultは、
authority boundaryと同じpure `LexicalAbsoluteRootParts` parserへ合格しなければならない。Failureはfilesystem/network I/Oとsession publishなしの
fixed startup argument/root errorとする。`process.chdir()`、per-drive working directory、environment reread、filesystem I/Oは使わない。
Process開始時にsessionは、file/diagnosticが
空のzero-I/O bootstrap generation 0と、その選択済みstringだけをnon-authorizing identityとしてbindしたenabled/idleな
Repository Sourceをpublishする。Global Sourceはまだ作らず、boundary admissionと最初のRepository scanを自動queueする。
Repository picker、ancestor search、profile、cache、resume identifierは持たない。

Hostはprocess-session bootstrap中に、独立した32-byte CSPRNG drawから`previewDigestKey`を正確に1回取得する。
`sessionId`、API capability、各`previewId`、その他全opaque IDに使うdraw/valueとは別とする。Preview置換、consent、retry、
Global disable、generation changeの間も変更せず、process終了までprocess memoryだけに保持して終了時に破棄する。
Key生成のthrow/rejectionはsession publishまたはhost bind前にprocess top levelへ到達し、代替keyの導出、persist、rotationを行わない。

`UtcTimestamp`はvalidなcalendar fieldを持つ`YYYY-MM-DDTHH:mm:ss.sssZ` formのexact 24-byte ASCII UTC valueとし、
このmodelでtimestampと呼ぶ全fieldが使う。`GenerationNumber`はactive Node.js runtimeが表現できるnon-negative safe integerとする。
次generationを表現できないcoordinator operationはmutation前に固定process-restart errorで拒否する。

Node.js、parser library、browser、OS、filesystem、実行環境から継承するcapacity以外に、Inspector固有の
byte数、file数、entry数、graph数、parser depth、message size、request/response size、worker数、queue capacity、
wall-clockのresource上限は定義しない。Event-confirmed-close observationは既にconfirm済みのsuccessful close lifecycleだけを維持する。
Read/parser/Worker/scan operationのnon-carveout throwまたはrejectionはdomain layerでcatch/classifyしない。そのようなoperationはattempt由来のitem、Diagnostic、scan result、response body、generationを
生成しない。RESTを所有するouter boundaryはlifecycleだけをgenericな`OperationError`へ変換し、自動startup operationはprocess
top levelへ到達する。Engine/processの回復不能な終了とruntime所有のuncaught-error outputをapplication Diagnosticへ変換または
controlできるとは主張しない。

成功するAPI responseはcomplete DTOを返し、意図的にtruncateしない。後述する明示的two-stage Global-disable barrierだけを除き、
successがjobをadmitする、またはcommit済みauthority/control/Source stateを変更する全REST commandについて、coordinatorはID、state、job、disposition、exact success envelopeをtentativeにprepareし、
まだ何もpublishしない。同じserialization lockを保持したまま、hostがそのenvelopeをcompleteにJSON serializeしてUTF-8 encodeし、
1つのimmutable entity-body bufferを作る。Serialization/encodingのthrowまたはrejectionではtentative ID/job/stateをdiscardし、
attempt、admission、control transition、response disposition、generationをpublishせずprior snapshotを維持し、trigger所有REST
boundaryのnull `scanRequestId`を持つgenericなaccept前Operation Errorへ到達する。Complete buffer作成後、coordinatorは同じlock内で
operation ID、epoch、abort/barrier state、base snapshotを再検証し、exact tentative state/job/dispositionをatomic commitして
immutable bufferをaccepted responseへbindする。再検証失敗ではbufferをdiscardし、partial mutationなしでcontract済み
conflict/cancellation outcomeに従う。Commit後のsocket close、write throw/rejection、その他delivery failureはaccepted job/stateを
rollbackまたはduplicateせず、2件目のproduct Operation Errorを作らず、successful payloadを報告せず、truncated bodyをpartial DTOへ
変換しない。Clientはfresh authenticated session snapshotからrecoverする。Generic error envelope自体のserializationはREST
runtime/transport boundaryが所有する。Monacoとbrowserも実行環境が提供する能力を使い、comparison failure時も両方のcomplete
authored source viewを利用可能なままにする。

`globalEnableInProgress`のようなauthority-free live-operation projectionはadmit済みsuccessではなく、所有REST requestの実行中に
表示され得る。Candidate state/authorityを含まず、buffer-bound commit前にoperationが失敗すればremoveし、commit済みstateに対する
success-response gateを弱めない。

Global disableだけは、asynchronous drain完了前にbarrier acceptanceがpublication authorityをrevokeする必要があり、正当にrollbackを
主張できないため例外とする。そのacceptance mutation、terminal success-buffer gate、retained REST failure、retry ruleは
`GlobalDisableOperation`で閉じ、他commandはこの例外を再利用できない。

### Source

| Field | Type | Rule |
|---|---|---|
| `sourceId` | opaque ASCII string | Server生成でprocess lifetime中はstable |
| `kind` | `repository \| global` | Repository Sourceを正確に1つ、Global Sourceを0から3つ |
| `tool` | `copilot \| claude \| codex \| null` | Repositoryはnullと組み合わせる。各Global Sourceはsupport対象toolを正確に1つ持ち、2つのGlobal Sourceが同じtoolを共有しない |
| `enabled` | boolean | Repositoryとpublishedな全Global Sourceはtrue。AbsenceはそのtoolにSource未公開であることだけを表し、disabled/pending/retryable control stateは`globalControl`で区別する。Disabling sourceはatomic removalまでtrue |
| `status` | `idle \| scanning \| disabling \| ready \| partial \| failed` | 後述transitionに従う。Publicな`partial`は、完全なtraversal後の決定的かつentry-localでcapacityに起因しないfailureについてcommitしたcontracted-partial resultだけを示す。`failed`は最新attemptが失敗し、最後のcommit済みsnapshotが利用可能であることを示す。Fatalな明示rescanだけがsnapshotをstaleにする |
| `boundary` | `SourceBoundary` | 選択済みrootを正確に1つ持つ。Repositoryはcapture済み`process.cwd()`/lexicalにresolveした`--cwd`、GlobalはそのSourceのtoolについてconsent済みの1つのhome root |
| `generation` | `GenerationNumber` | 公開済み全Sourceでsession-wideの最後にcommit済みgenerationと一致 |
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
| `boundaryId` | opaque string | internal | Ticketとroot contextをbindする。全Sourceがboundaryを正確に1つ持つためDTOには不要 |
| `tool` | `copilot \| claude \| codex \| null` | internal | 公開済みowning Sourceのtoolと一致し、Repositoryはnull |
| `displayRoot` | ASCII `RootPresentationEncoding` string | DTO | Enabled Source rootのdeterministic encoding。`SourceRelativePath`、inventory-item locator、caller input、operational-log field、read authorityではない |
| `canonicalRoot` | exact platform canonical representationまたはnull | internal | 比較と反復containment checkに使うPOSIX private BufferまたはWindows exact code-unit string。単独ではreadを認可できず、raw operandへ置換せず、enabled boundary外へ返さない |
| `rootContext` | `InspectionRootContext \| null` | internal | Bootstrap Repository Sourceでは中央admission成功までnullで、enumeration前には必須。以後Repositoryは直接所有し、Global boundaryはactive consentの`GlobalToolControl`所有contextを参照する。中央safe-filesystem layerだけが作成・consumeできる |
| `origin` | `process-cwd \| cwd-option \| default-home \| environment` | DTO | Read authorityを与えずlexical boundaryの選択理由を示す |

各Sourceは正確に1つのboundaryとrootを持つ。Repository boundaryはgeneration 0からescape済み`displayRoot`とnull contextで
存在する。中央admissionは後で`selectedRepositoryRoot`からcontextを作り、決定的なrejectionではSourceとnull contextを維持し、
throw/rejectされたstartup admissionはprocess top levelへpropagateする。Global boundaryの`tool`は所有Sourceとactive `GlobalToolControl`に一致し、そのcontrolのadmit済みhome contextを
1つ参照する。複数tool homeを1つのSourceへ結合しない。

### LexicalAbsoluteRootPartsとroot spelling admission

Preview eligibilityは`RootPresentationEncodingとGlobal lexical state`の4-state no-I/O algorithmのままで、spelling admissionを
意味しない。Repository bootstrap後またはmatching Global consent後、対象rootへの最初のfilesystem call前に、`safe-fs.ts`は
exact retained stringへ次のpure closed parserを適用する。`normalize`、`resolve`、`join`、case-fold、Unicode normalization、
separator変更を行わない。Resultはrow 1が使うexact platform path operandを所有する。

全platformで最初にU+0000とunpaired UTF-16 surrogateをpath-free `safe-fs-root-rejected`としてzero I/O rejectする。Node throwへ
依存せず、CLI/Global-preview invariantをauthority boundaryで再検証する。

| Field | Type | Rule |
|---|---|---|
| `platform` | `posix \| win32` | Active Node platformだけ |
| `anchorKind` | `posix-root \| drive-root` | Explicit UNC/server-share、current-drive、device、volume-relative anchorは表現不能 |
| `anchorParts` | exact string[] | POSIXはempty、Windowsはraw drive letter 1つ |
| `components` | exact string[] | Anchor後のnon-empty path segmentを順に保持。Normalizationなし |
| `lstatPrefixes` | `{ platform: 'posix', prefixes: private Buffer[] } \| { platform: 'win32', prefixes: string[] }` | Anchorを先頭に各component prefixを続ける。POSIXはaccepted root Bufferをparsed component-byte endでsliceして各prefixをdefensive copyし、Windowsはoriginal stringをparsed code-unit boundaryでsliceする |

POSIXは最初にU+FFFD code unitを含むroot spellingをunrepresentableとしてrejectする。Nodeのstring-valuedな`process.cwd()`、argv、
environment、`homedir()` inputではliteral U+FFFD filenameとinvalid filesystem byteのreplacementを区別できないためで、このroot-only
ruleはfile-content replacement decodeと別である。その後、正確に`/`または`/segment(/segment)*`を受理する。Segmentはnon-emptyで
`.`/`..`ではない。Repeated separatorまたはroot以外のtrailing slashはdeterministic zero-I/O
`safe-fs-root-rejected`とする。`/`自体はsole prefix `/`を持つ。Accepted stringだけを
`Buffer.from(lexicalRoot, 'utf8')`で1回encodeし、そのBufferのdecode/re-encodeがstringとexact byteの両方を再現することを要求する。
Private byte copyをsole POSIX root operandとする。

Windowsはparse中だけU+005CまたはU+002Fをseparatorとして扱う。Leading separator 2個を持つstringは残りのcode unitにかかわらず
unsupported explicit UNC/server-shareまたはdevice authorityとしてzero I/O rejectする。Drive formは正確に`[A-Za-z]:<sep>`と、任意の
`segment(<sep>segment)*`。その他のempty/dot/dot-dot segment、repeated/non-root trailing separatorはI/Oなしでrejectする。
Single-leading-separator current-drive pathもrejectし、`C:relative`は既にnon-absoluteである。Prefixはdrive rootを先頭に各component
prefixを続ける。全explicit spellingのUNC/device/volume-GUID pathを`lstat`、`realpath`、DNS、SMB access前に除去し、server/share spellingをprobeしない。
その他のWindows reserved-name/character policyは追加せず、後のNode/OS
throwはouter-boundary ruleに従う。

Syntactically plainなdrive rootはOS-mapped network driveの場合があり、POSIX rootはnetwork mount上の場合がある。Pure parserはどちらも識別できず、
consent/root selection後のordinary exact-operand checkはnetwork filesystem I/OとOS-mediated trafficを発生させ得る。FR-022はこのtrafficをdirect
product-issued outbound-request定義から除外し、そのassertionにlocal rootを要求して、documented platform/environment limitationとして保持する。
これはexplicit-UNC zero-I/O bypassでもall network-backed storageをrejectする保証でもない。
これとは別に、FR-022は発行済みのexactな`127.0.0.1` authorityにおけるexactな2つのbrowser/host HTTP class、すなわちclosedな
unauthenticated static/SPA `GET`/`HEAD`とcapability-authenticated declared API requestを、outbound trafficまたはMCPではなくauthorized
internal loopback transportとして分類する。Network instrumentationは両closed classを別々に検証し、customization-selected、remote-reference、
MCP requestを含むclass外requestを0件とする。

Serviceはanchorと各componentにrow-1 checkpointを1つずつmintし、exact platform operandで`lstat(prefix, { bigint: true })`を順に呼ぶ。
Exact `ENOENT`だけが`absent`を返し、lifecycle ownerはそのreturned outcomeを`safe-fs-root-absent`として記録する。その`lstat`からのその他のrejectionは変更せずpropagateする。Returned link、detectable reparse object、
non-directory、unusable identityはdeterministic root rejectionとする。全prefix成功後だけexact raw rootを`realpath`し、そのcallには
catch carve-outを適用しない。POSIXはBuffer resultを要求してexact absolute byte vectorとしてparseし、全componentにstrict UTF-8
validationとexact decode/re-encode round tripを要求する。満たさなければboundary-unverifiableとする。Windowsはplain drive resultだけを受理し、
comparison専用にNode-returned code-unit prefix `[0x005C, 0x005C, 0x003F, 0x005C]`へdrive letter、U+003A、separator 1個、componentsが
続く形をdrive vectorへmapする。Plain UNC result、device-prefix `UNC` result、malformed/root-relative/volume-GUID output、その他network/device
formは`safe-fs-boundary-unverifiable`とする。Comparisonでは同じanchor kind、exact drive letter、component count、exact component
code unit/UTF-8 byteを要求する。Windows separator glyphだけを
無視し、case-foldもnormalizeもしない。Nodeが公開したcase、normalization、short-name expansion差は
`safe-fs-root-rejected`とする。Canonical outputはcomparison/containment dataだけで、raw I/O operandを置換しない。

`origin: process-cwd`ではさらに`lstat('.')` identityとselected absolute-root identityの一致を要求する。これによりgeneration 0を
変更せず別rootを選ぶことなくlossyまたはdriftした`process.cwd()` resultを検出する。このverification `lstat`はrow 1外で、
`ENOENT`を含むrejectionをcatch/convertしない。Relative `--cwd`のoriginal process-relative spellingはsymlink resolutionにより
lexically selected absolute root外をprobeし得るため、決してfilesystem operandにしない。Admissionと全I/Oは
`selectedRepositoryRoot`だけを使う。Absolute optionと全Global rootもretained exact absolute stringを使う。Identity mismatchは
path-free `safe-fs-boundary-unverifiable`とする。

### SourceRelativePath

`SourceRelativePath`はfileの表示、filter、alias、provenance path、normalized relationship targetに使う
value objectである。

| Field | Type | Rule |
|---|---|---|
| `sourceId` | opaque ID | Pathを1つの所有Sourceへbindする。単独でread authorityとして受理しない |
| `boundaryId` | opaque ID | そのSourceの唯一のboundaryへのinternal binding。Serializeせずclientから受け付けない |
| `value` | collision-free NFC POSIX-style string | Classification segmentを`/`でjoinしたそのSource rootからの相対path。Leading slash、URI scheme、NUL、empty/dot segment、`..`、home shorthand、environment expansionなし |

Repository Sourceでは`value`を選択済みRepository rootからの相対pathとする。Global Sourceではそのtoolについてadmit済みの
home rootからの相対pathとする。Presentationはstored valueを変えずcontrol characterをescapeする。Stored valueを
filesystem pathの再構築には使わない。Closedな`ScanEntryTicket.rawRelativeSegments` unionだけがその役割を持ち、all-enumerated raw segment、
all-registry exact target、またはnon-empty fixed registry prefixの後にnon-empty enumerated raw remainderが続く唯一許可されたmixed formの
いずれかとする。Element-wise segment unionもNFC valueもI/O operandにしない。Accepted aliasも
同じvalue objectと所有Sourceを使う。
Wire上では`sourceRelativePath`と各`aliasSourceRelativePaths` entryはnormalized `value` stringだけをserializeし、
containing file DTOの`sourceId`がpublic ownership linkを提供する。`boundaryId`はHTTP boundaryを越えない。

NFC classificationはauthorityを与えない。異なるraw pathが同じpublic `value`へnormalizeされる場合は1つのcollision groupを
形成し、どのmemberにもfile DTOまたはreadを与えない。Unambiguousなpublished Source-relative item pathがなく、initial Global Sourceは
未作成の場合もあるため、対応するDiagnosticはpathlessなsession scopeとし、nonserialized `lifecycleOwnerKey`がownerを保持する。
Public contextは該当する`repositoryFailureDiagnosticId`、`GlobalControlView.toolFailures`、またはpublished Sourceの
`StaleSourceFailure`から正確に1回だけ公開する。Source-fatal attemptはgenerationをpublishしない。
1つのSource scan attempt内で、group consume前に識別した複数のcollision-freeなallowlist済みraw pathが1つの検証済みphysical regular fileへresolveする場合、primary pathは`value`を
unsigned UTF-8-byte lexicographic orderで並べた最小値とし、残りのunique valueは同じ順序でaliasとする。各provenanceはadmitに
使ったexact raw segmentを保持する。Filtering、返却DTO内のitem lookup、detail label、comparison selectionはprimaryと全aliasに
matchする一方、file-scoped Diagnosticは常にprimary `sourceRelativePath`を持つ。Alias固有のobservationはprovenanceに保持し、
2件目のfileまたはambiguousなDiagnostic locatorを作らない。Group consume後だけに発見した別raw hard-link pathはaccepted alias/provenanceにせず、
下記`safe-fs-late-derived-alias-rejected` protocolに従う。

### RawEntrySegment、RegistryTargetSegment、InspectionRootContext、DirectoryEnumerationGuard、ScanEntryTicket、VerifiedReadReceipt

これらpure Node.js recordはinternalだけで、serialize、DTOからのclone、HTTP pathからのreconstruct、request
からの受理を許さない。Private module brandはapplication-level authorityをenforceするが、OS filesystem
capabilityではない。

| Entity / field | Type | Rule |
|---|---|---|
| `RawEntrySegment` | `{ platform: 'posix', bytes: private Buffer } \| { platform: 'win32', codeUnits: string }` | Exact directory-entry identity。POSIXは`encoding: 'buffer'` nameのdefensive copy、Windowsはreturned UTF-16 code-unit sequenceをexactに保持する。Module-privateとし、serialize、log、normalize、replacement decodeしない |
| `RegistryTargetSegment` | `{ platform: 'posix', bytes: private Buffer } \| { platform: 'win32', codeUnits: string }` | 1つのimmutable、NFC、well-formed registry literalのcompile/load-time platform form。POSIX UTF-8 encodingはexact decode/re-encode round trip必須、Windowsはexact code unitを保持する。Separator、NUL、empty/dot segment、extra fieldをrejectする |
| `InspectionRootContext.privateBrand` | module-private symbol/registry membership | `src/inspection/safe-fs.ts`だけが作成・検査し、process memory外へ出さない |
| `InspectionRootContext.sourceId` / `boundaryId` | opaque ID | 正確に1 Repository boundary、または1つの`GlobalToolControl`が事前割当した未公開IDへbindし、commit時だけGlobal Source/boundary IDになる |
| `InspectionRootContext.lexicalRoot` | exact accepted absolute string | Retained identity/presentation input。作成後にclient valueで置換できない |
| `InspectionRootContext.canonicalRoot` | `{ platform: 'posix', bytes: private Buffer } \| { platform: 'win32', codeUnits: string }` | 比較/containment専用のexact parsed `realpath` result。I/O replacement operandにはしない |
| `InspectionRootContext.lexicalParts` / `canonicalParts` | exact `LexicalAbsoluteRootParts`互換vector | Admission時component比較。Canonical partsはcomparison専用でI/O operandにしない |
| `InspectionRootContext.rawRootOperand` | private POSIX Bufferまたはexact Windows string | Descendant I/Oの唯一root base。POSIXはexact byte copy、Windowsはexact UTF-16 code unitを保持 |
| `InspectionRootContext.rootIdentity` | bigint `dev`/`ino`/`mode` snapshot | `lstat`でcaptureし、Global fixed-selector descendant I/O前にrow 20、全source-root directory enumerationの前後にrows 21/25、全candidate read phaseでidentity/typeを再比較する。Long-lived root stateはdirectory timestampをfreezeしない |
| `InspectionRootContext.rootDevice` | bigint `dev` | Nodeが公開するdevice changeを検出するが、全mount transitionの識別は主張しない |
| `InspectionRootContext.state` | `active \| closed` | Open OS handleを含まず、module-registryのclose/unregister transitionはsynchronousかつnon-throwing。Repository/process終了、owning Global controlのdispose/disable、またはadmit済みrootをreject/replaceするretryのatomic successful disposition時にcloseし、closed後の全callを拒否 |
| `DirectoryEnumerationGuard.preOpenSnapshots` | ordered internal snapshot[] | Rows 21–24がroot、relative ancestor、該当時non-root targetに作るper-`opendir`のephemeral record。Exact bigint `dev`、`ino`、`mode`、`mtimeNs`、`ctimeNs`を持ち、serializeも別enumerationへのreuseもしない |
| `DirectoryEnumerationGuard.postEnumerationChecks` | ordered internal verification[] | Sibling collection後かつconfirmed close/use前にrows 25–28がcorresponding pre-open snapshotと同じoperandを比較する。Verification/closeの成否にかかわらずguardをconsumeする |
| `ScanEntryTicket.privateBrand` / `rootContext` | module-private brand / internal reference | 1 active root contextの認可済みenumerationだけが発行 |
| `ScanEntryTicket.sourceId` / `boundaryId` / `generationId` | opaque ID / integer | 正確に1 source boundaryとscan generationへticketをbind |
| `ScanEntryTicket.scanRequestId` | opaque ASCII string | Publication authorityを正確に1つのautomatic/explicit source scanへbindし、revoke後の全late continuationをcleanup-onlyにする |
| `ScanEntryTicket.authorizingProgram` | internal closed union | `{ kind: 'traversal', plan: TraversalPlan }`または`{ kind: 'bounded-derivation', authority: DerivedTicketAuthority }`。Seed planをderived target authorityへ代用しない |
| `ScanEntryTicket.structuralCheckpointInstances` | ordered module-private consumed/unconsumed record | Enumerated admission、pre/post-directory-enumeration、pre-open/pre-read/post-read recheck用のexact catalog由来instance。Caller定義catch authorityなし |
| `ScanEntryTicket.rawRelativeSegments` | closed exact-path union | Pathのreconstruct/verify/readに使うsole ordered segment。`{ kind: 'enumerated', segments: RawEntrySegment[] }`、`{ kind: 'registry-target', segments: RegistryTargetSegment[] }`、または`{ kind: 'fixed-prefix-enumerated', fixedPrefix: non-empty RegistryTargetSegment[], enumeratedRemainder: non-empty RawEntrySegment[] }`。3番目だけが許可済みmixed representationでprefix-then-remainder順を保ち、array element union、empty part、reorder、serialize、client inputを禁止 |
| `ScanEntryTicket.classificationSegments` | collision-free NFC segment array | Matcher classification、deterministic order、`SourceRelativePath`だけに使い、filesystem operationへ置換しない |
| `ScanEntryTicket.canonicalAtEnumeration` | exact platform canonical representation | Ticket用に返されlosslessにparseしたPOSIX private BufferまたはWindows exact code-unit string。Internal比較値で、単独のread authorityではない |
| `ScanEntryTicket.ancestorSnapshots` | ordered snapshot[] | Relative directory prefixごとにexact bigint `dev`、`ino`、`mode`、`mtimeNs`、`ctimeNs`を持つ。Directory enumerationではsibling収集前後にこれらをbind/比較し、candidate readではopen前・read前・read後にidentity/modeを比較 |
| `ScanEntryTicket.enumerationIdentity` / `enumerationMetadata` | bigint path-stat snapshot | 正確な`dev`、`ino`、`nlink`、`mode`、`size`、`mtimeNs`、`ctimeNs`を全path snapshot/opened `FileHandle`とbyte受理前に比較 |
| `ScanEntryTicket.occurrence` | non-negative integer | Deterministic enumeration order |
| `ScanEntryTicket.state` | `enumerated \| consumed \| stale \| rejected` | Generationごとに最大1回read。Stale/rejected ticketはaccepted byteを返さない |
| `VerifiedReadReceipt.entryTickets` | non-empty ordered internal reference | このphysical fileへ統合したcollision-free admitted raw pathごとに正確に1つのconsume済みticket。Primaryの後にunsigned-UTF-8-bytewise NFC alias順で、全phaseが全ticketをrevalidateし、path/ticket重複はない |
| `VerifiedReadReceipt.primaryEntryTicket` | internal reference | `entryTickets`の先頭memberで、physical fileをopen/readするsole path operand |
| `VerifiedReadReceipt.fileHandleIdentity` | bigint `dev`/`ino`/`nlink`/`mode` snapshot | `CustomizationFile.identity`の唯一source。Durableとはみなさない |
| `VerifiedReadReceipt.preOpenChecks` | ordered per-ticket verification record | Sole primary `open`前に全`entryTickets` memberを順にrows 8–11で検証し、root identity、全ancestor `lstat`、candidate path `lstat`、exact-platform candidate `realpath` containment、repeat candidate `lstat`を記録する。各pathは自身のenumeration snapshotと同一physical identityへ一致する |
| `VerifiedReadReceipt.preReadChecks` / `postReadChecks` | ordered per-ticket verification record | `open`後かつread前にはrows 12–15、complete read後かつsame handle open中にはrows 16–19を同じticket順で記録し、その後`FileHandle.stat({ bigint: true })`を比較する。Byte受理前に全ticketが同じhandle identityとexact metadataへ一致し続けることを要求 |
| `VerifiedReadReceipt.fileType` | literal `regular-file` | Directory、link、device、socket、pipeではない。Unsupported/unverifiable objectは拒否 |
| `VerifiedReadReceipt.acceptedByteCount` | non-negative integer | Verified handleから受理したexact byte数で、readable file recordのbyte数と一致 |
| `VerifiedReadReceipt.finalOpenDefense` | `effective-o-nofollow \| no-effective-o-nofollow-postchecks` | Nodeが公開しplatformがenforceする場合は前者必須。後者は不在と無効なsupportの両方を扱い、明示的な残存limitationを記録 |
| `VerifiedReadReceipt.containmentMode` | literal `node-realpath-fstat-best-effort` | Atomic kernel containmentを主張せず、反復canonical/same-handle validationを記録 |
| `VerifiedReadReceipt.openMode` | literal `read-only` | Mutation-capable open flagは表現不能としinstrumentation testでrejectを確認 |
| `VerifiedReadReceipt.mutationObservation` | runtime metadata record | Contract済みpath `lstat`/`realpath`、same-handle `FileHandle.stat` checkで既に得たvalueと、1 accepted byte count/digestだけを含む。Observed atime差を別記し、未queryのxattr/ACLまたはsecond content snapshotを主張しない |

Terminal-file identityをusableとするのは、全`lstat`とsame-handle `FileHandle.stat({ bigint: true })`がexact bigint field、
`ino !== 0n`、`nlink > 0n`を公開する場合だけとする。Physical groupは1つのSource scan attempt内だけに存在し、全member snapshotが
同じ`(dev, ino)`、同じstable `nlink`を持ち、`nlink >= BigInt(admittedPathCount)`の場合だけ形成する。`nlink`は
enumerated admission、pre-open、pre-read、handle-stat、post-readを通じて他のfile metadataと同様に比較する。Missing、non-bigint、
zero/negative、changing、group-inconsistentなidentity fieldはbyte受理前に`safe-fs-boundary-unverifiable`とし、grouping keyに使わない。
Nodeが公開するfieldを超えてplausibleだがnon-uniqueなidentity valueを返すfilesystemは、proofを主張せず明示的な
`platform-unobservable` limitationとする。Repository/Global Source、2つのGlobal tool Source、異なるscan attempt/generationは
ticket、receipt、byte buffer、read-once groupを共有しない。したがって、各独立admit済みSource attemptは同じunderlying objectを1回readし得る。

Contentはsole accepted handleから正確に1回readする。Mutation conformanceはexternal fixture harnessがproduct run前後のfixture byteと、OSがstableな
test APIを提供する場合のxattr/ACLをsnapshotして検証する。Harness observationはtest evidenceであり`VerifiedReadReceipt` fieldでもproductionの
追加readでもない。OS read path由来のatime changeは別記し、application mutation/containment safetyのどちらも証明しない。

Repository root contextは、zero-I/O Sourceが存在した後に、すでに選択済みのlexical Repository rootから作る。
Global root contextは一致preview consent後だけ作る。Root作成は
公開されたlexical componentを全て`lstat`で検査してlinkを拒否し、accepted rootの`realpath`とidentityを記録する。
これらの分離checkには後述の残存raceがある。Node filesystem serviceだけがimmutableな`TraversalPlan`を
interpretしてticketを作り、static/derived classifierはselectできても作れない。

POSIXではnon-recursiveな`opendir(parentBuffer, { encoding: 'buffer' })`だけを呼び、returned nameをすべてdefensive copyする。
Descendantの`lstat`、`realpath`、`opendir`、`open` operandは1つのclosed `appendChild` helperで作る。POSIXではparentがanchor
Buffer `/`ならexact name byteを直接appendし、それ以外では1 byte `0x2f`の後にname byteをappendするため`//`を作らない。
Windowsではdrive-form parentがaccepted separator glyphのいずれかで終わる場合はexact child code unitだけをappendし、それ以外では
native U+005C code unitを正確に1つ挿入する。Emptyまたはseparator-containing child segmentはunrepresentableとする。同じhelperをenumerated/
registry-target segmentに使う。Enumerated operandへdefault directory decode、`Dirent.parentPath`、string conversion、`node:path.join`を使わない。
Text/NFC classification前に`node:buffer.isUtf8(rawName)`を呼び、true resultを正確に1回decodeして
`Buffer.from(decoded, 'utf8')`がoriginal byteと一致することを要求する。Falseまたはnon-round-tripping resultはreplacement decodeも
charset推測もしない。Windowsでは
exact `Dirent.name` UTF-16 code unitを保持し、classification前にunpaired surrogateをrejectする。Literal relevanceはregistry literalの
UTF-8 byte/code unitとのexact equality、`one-segment` relevanceはnon-empty raw nameとregistry suffix byte/code unitのexact suffixとする。
Recursive directory positionでは`Dirent.isDirectory() === true`または全type predicateがfalseのunknown typeをpotentially relevantとし、
known non-directoryだけを`lstat`なしでirrelevantにできる。Selector-relevantなunrepresentable nameにはpathlessなsession-scoped
`safe-fs-entry-name-unrepresentable` Diagnosticを1件付け、そのentryへの`lstat`、descend、`realpath`、open、read callを0件とする。
Irrelevant nameはignoreする。これはcaught file-read errorでなく、正常enumerationから得たdeterministic resultだが、unambiguousな
FR-028 item pathを作れないためsource-fatal returned outcomeとする。Attemptはgeneration/partial itemをpublishしない。Diagnosticは
source/file/path fieldを持たず、nonserialized lifecycle ownerは`GlobalControlView.toolFailures`、`StaleSourceFailure`、または
`InspectionSession.repositoryFailureDiagnosticId`からだけ公開するため、unpublished Sourceを捏造しない。File-content byteは別で、representable name配下のinvalid non-NUL UTF-8 contentは従来どおり
replacement decodeして`utf-8-replaced`として処理する。

Rows 21–24は各open直前にdirectory/root/ancestorのexact bigint `dev`、`ino`、`mode`、`mtimeNs`、`ctimeNs`をbindする。
Opened directoryごとに、explicit `Dir.read()`でdescend前にraw sibling setをcompleteにし、rows 25–28でsame identity/type/modeと
不変の`mtimeNs`/`ctimeNs`を要求する。Registryが`fs.Dir` closureをconfirmするまでbufferをclassify/useしない。Enumeration中の
detectable create/remove/renameはsource-fatalでgenerationをpublishしない。FileHandleの`close` eventが先にclosureをconfirmした後の
retained close-promise rejectionは既にconfirm済みのsuccessful close lifecycleだけを維持する。Completion/post-check/close中の
non-carveout throw/rejectionはtrigger所有outer boundaryへpropagateし、attempt resultをpublishしない。Representableかつrelevantなnameのうち、異なるraw sibling nameが
同じNFC classification keyへnormalizeする場合はcollision group全memberをdescend/open/readせず拒否し、
pathless session-scoped `safe-fs-path-normalization-collision`を1件付ける。このcollisionもsource-fatalで、FR-028 contracted-partial item outcomeにはしない。
CollisionのないNFD-only entryはexact raw segmentでreadし、
classification/display pathはNFCにする。Windowsではcandidate `realpath` resultをverified canonical root相対にparseし、returned componentが
enumeratedまたはregistry target code unitとexactに一致しなければならない。Nodeが返したcase、normalization、short-name、trailing-dot/space
その他alias差はopen前にfail closedとする。Derived valueはcollision-free classification record 1件と正確に一致しなければ
ならない。Candidate readは所有root contextと各ticketのraw segmentだけからpathを再構築する。全POSIX candidate `realpath`はBufferを
要求してabsolute byte-component vectorとしてparseし、全componentに`isUtf8`とexact decode/re-encode equalityを要求する。Candidateは
exact byte vectorがcanonical rootと等しいか、canonical rootのexact componentをprefixとしてその後に1 component以上を持つ場合だけ
containedとする。Windows resultはadmit済みplain driveまたはmapped drive-namespace code-unit vectorとしてだけparseし、同等のexact
drive-anchor/component ruleだけでcontainedとする。UNC/network resultはすべて`safe-fs-boundary-unverifiable`としてrejectする。Malformedまたはnon-round-tripping canonical outputはdeterministic
`safe-fs-boundary-unverifiable`で、replacement decodeしない。Lossless decode/parse後に`path.posix.relative`/
`path.win32.relative` checkをredundant defenseとして追加しrejectしてよいが、candidateをadmitせずI/O operandにもならない。

1 lifecycle ownerがattemptごとに保持するsource-fatal Diagnosticは最大1件とする。Directory entryはmatcher classification前に、POSIXでは
unsigned raw byte、Windowsではunsigned UTF-16 code unit順でsortする。Complete sibling setを1 unitとしてevaluateし、selector-relevantな
unrepresentable nameが1件以上あれば`safe-fs-entry-name-unrepresentable`だけをretainする。それがなくrelevant NFC collisionが1件以上あれば
`safe-fs-path-normalization-collision`だけをretainする。Member/groupが複数でも追加Diagnosticをemitしない。Directoryを跨ぐ場合と後続checkpointでは、
selector order、root-to-leaf traversal order、sorted entry order、checkpoint-catalog/ticket orderの順で最初のfatalを採用してSource attemptを直ちに停止し、
later fatal conditionをevaluate/emitしない。Root admissionはtraversalより先である。このfixed precedenceによりsingle lifecycle ownerを維持しつつ、
先に到達したfailureをtimingで隠さない。

下記ordered Codex fallback branchを除き、Source attemptは全static matcher traversal、sibling classification、rows 4–7 admission、
physical-group formationを完了してからstatic groupをconsumeする。Group consumeはその後deterministic primary-path順に行う。
したがってplanが到達する全static hard-link pathはsole group open/read前に存在する。Discoveryとreadは別phaseであり、
consume後のlate static admissionはinternal invariant failureで、暗黙のsecond readにしない。

その1 Source attempt内のhard-link統合では全admitted path ticketをprimary/alias順で保持する。Sole primary-path `open`前に全ticketへrows 8–11を順に実行し、
root、ancestor、repeated candidate snapshot、canonical containment、enumeration identity、physical identityの一致を要求する。
`open`後かつread前には全ticketへrows 12–15を実行し、全identityを1回の`FileHandle.stat({ bigint: true })`へ一致させる。Byteはその
primary handleから正確に1回だけreadする。Complete read後もhandleを開いたまま、全ticketへrows 16–19を実行してfinal same-handle statを
行い、その後だけbyteを受理する。Alias disappearance、replacement、identity divergence、その他identity/type/metadata/boundary changeは
収集済みbyteを全て破棄し、該当ticketをstale/rejectedにする。旧観測のaliasをpublishし続けてはならない。Client/HTTP path stringはreadを認可しない。

Derivationはstatic seed read後だけtargetを発見できる。Derived targetがalready verified fileのexact same raw admitted pathなら、別ticket/readなしで
derived provenanceをexisting ticket/receiptへattachする。別derived raw pathがまだconsumeされていないphysical-identity groupへresolveする場合、
sole open前にticketをgroupへjoinして上記全checkを通常どおり適用する。Groupを既にopen/read済みならlate hard-link pathをpre-open/pre-read checkへ
遡及挿入できないため、open/read 0、alias/provenance非publishとし、existing fileへfile-scoped
`safe-fs-late-derived-alias-rejected`を付ける。Generationはcontracted-partialで、existing fileのread state/byteは変えない。Physical file再read、
late pathへのold byte採用、Diagnosticのsilent dropを禁止する。

このmodel内でcatchまたはobserveするfilesystem rejection caseは、FR-041の2つの限定的なcarve-outだけとする。Registry宣言済み
structural existence checkpointで呼び出した`lstat`からのNodeのexactな`ENOENT`は、admission前なら`absent`を意味し、entry観測後は
決定的な`entry-disappeared`として全byteを破棄する。Handlerはmessageではなく`error.code === 'ENOENT'`だけを検査し、その変換を
`open`にも`read`にも適用しない。これとは別に、FileHandleの`close` eventがclosureをconfirmした後は、resource registryが同じhandleの
retained close promiseの後続rejectionをobserveし、既にconfirm済みのsuccessful close lifecycleだけを維持してよい。すべての
non-carveout exceptionまたはrejectionはfilesystem、parser、recognition、scanのdomain layerを越えて変更せずpropagateする。

Process全体で1つのexecutorがinspected-source filesystem workをserializeする。Production moduleはread-only
operationだけを公開し、write、truncate、create、rename、delete、link、chmod/chown、utimes、xattr、ACL、atime変更を
一切要求しない。Disableまたはprocess shutdownは対象requestのpublication authorityをrevokeして新規scheduleを停止する。
Pending promiseはcleanup-onlyになり、そのlate byteと全graph/Diagnostic/DTO/log mutationを破棄し、openしたhandleは
`finally`でcloseする。ここで「close」は`ClosableResourceRegistry` helperのinvoke/joinを意味し、`close-confirmed`だけがclosureを証明する。
Rejected unknown closeはrestartまで後続filesystem schedulingをpoisonする。Nodeはapplication authority revoke時の物理的なkernel-I/O終了を保証しない。将来のcancellable
primitiveまたはOS強制worker/sandboxをresolution pathとする。

必要なidentity/metadataまたはcanonicalizationが正常にreturnされたものの、structurally absent、ambiguous、malformed、
その他unusableな場合は、決定的な`safe-fs-boundary-unverifiable` outcomeとし、推測しない。Root-level outcomeはsource
attemptをabortし、item-level outcomeにはcomplete traversalとacquireした全resourceのregistry-confirmed closure後に限って
diagnostic-only inventory recordだけを残してよい。Root/shared-ancestorまたはdirectory-enumeration guard outcome、もしくは
FileHandle/`fs.Dir`のclose未確認は、影響Source attemptをabortし、diagnostic-only candidate record、contracted-partial
generation、success receiptを作らない。そのdata取得中のthrowまたはrejectionは、代わりにpropagation ruleへ従う。

Nodeはatomicなdirectory-handle-relative child openを提供しないため、これらrecordはpath check間にroot/ancestorを
差し替えるactive process、または有効な`O_NOFOLLOW`を利用できない場合のfinal-entry replacementへのcontainmentを
証明できない。Actor class全体ではなくそのcaseだけをcurrent threat modelのscope外とする。
検出した通常の同時変更、有効な`O_NOFOLLOW`によるfinal-component defense、その他全detected raceはscope内でfail
closedにする。Threat model拡張には、将来のatomic Node beneath/no-follow
API、またはOS強制のread-only snapshot/sandboxとrenewed reviewが必要である。
Public Node.js APIがactual case、Unicode spelling、short-name expansionを公開しないfilesystemでは、boundary外parentを
enumerateせずhidden aliasの不存在を証明できない。Inspectorはparent enumerationを行わず、containment proofを主張せず
`platform-unobservable` limitationとして記録する。
Same-device bind mountとNodeが全く公開しないreparse metadataは、automated-test proof外の明示的なplatform
limitationとして残る。

### StaticAssetManifest、ServerBundleManifest

これらはtrusted packaged-build recordで、inspection-source DTOではない。Build/package verifierは両方を
固定package-root pathだけからresolveする。Runtimeではproject所有`bin.mjs` bootstrapがpacked `package.json`と
両manifestを自身の`import.meta.url`相対の固定URLだけからresolveする。Node.js built-inだけを使い、packed
`package.json`と両strict manifestを検証し、各declared asset byte lengthとpackaged byteの完全一致を確認する。
全listed static/server assetをhashしてから、既に検証済みの
`dist/cli.mjs`をdynamic importする。Hostは先にbind
できない。`node:fs`はpackage所有fileのread/hashに使えるが、build manifestをinspected-source fallbackには使えない。
Runtime bootstrapはmalformed JSON、duplicate/unknown/missing key、unexpected order、symlink、non-regular file、size/hash mismatch、
package-version mismatchをhash/import/server bind前に拒否する。
これらJSON manifest、generated HTML/CSS、documentation、licenseはdeclarative artifactである。Project所有の全
executable application codeとpackageに同梱する全executable componentは、JavaScript/TypeScript sourceから生成した
JavaScriptとする。このboundaryはthird-party development/test toolingをproduct codeとして分類しない。
Verifierが定義するのはintegrityであり、resource admissionまたはcustomization file validationではない。Package処理能力は
Node.js、OS、実行環境から継承し、recover可能なruntime failureはimportとhost bindを防止する。

Static manifest作成前に固定normalizerがNuxt標準`.output/public` staging treeを読み、regularな生成済み
`200.html`/`404.html`を要求するがredundant static-host fallback 2つはcopyせず、`index.html`以外の全HTML
fileを拒否する。他のaccepted regular fileは新規`dist/public`へcopyし、manifestは全copied fileを記述し、
packaged outputにaliasを含めない。Server assemblerもcleanな`.build/server` staging treeだけを読み、
manifest-listed regular `.mjs` fileだけを`dist/`へcopyする。

| Entity / field | Type | Rule |
|---|---|---|
| `StaticAssetManifest` | strict JSON | Exact keyは`manifestVersion`、`packageVersion`、`shellPath`、`assets`、`inlineScriptSha256` |
| `StaticAssetManifest.manifestVersion` | literal `1` | Compatibilityを推測しない |
| `StaticAssetManifest.packageVersion` | semver string | Packed `package.json`からembedしたversionと一致 |
| `StaticAssetManifest.shellPath` | literal `/index.html` | 正確なSPA fallback byte |
| `StaticAssetManifest.assets` | ordered unique record | `requestPath`順。全post-normalization generated regular fileを正確に1回含む |
| `StaticAssetRecord` | closed object | Exact keyは`requestPath`、`file`、`byteLength`、`sha256`、`mediaType` |
| `StaticAssetRecord.requestPath` | root-absolute URL path | Query、fragment、dot segment、encoded separator、malformed escape、external originなし |
| `StaticAssetRecord.file` | exact `public/...` relative path | `requestPath`のuniqueなlexical counterpart。Separator alias/traversalなし |
| `StaticAssetRecord.byteLength` / `sha256` | non-negative integer / lowercase 64 hex | Declared byte lengthをbind前にpackaged byteと照合し、完全一致しなければfail closed |
| `StaticAssetRecord.mediaType` | closed MIME enum | Hostと同じ固定extension tableでbuild時に決定。HTMLは`/index.html`だけlegal |
| `StaticAssetManifest.inlineScriptSha256` | ordered uniqueな44-character base64 hash | `/index.html`内の各executable inline-script exact byteのSHA-256。Executable attribute、`<base>`、nonce、external URL、未記録inline scriptはbuildを通らない |
| `ServerBundleManifest` | strict JSON | Exact keyは`manifestVersion`、`packageVersion`、`assets` |
| `ServerBundleManifest.manifestVersion` | literal `1` | Compatibilityを推測しない |
| `ServerBundleManifest.packageVersion` | semver string | 同じpacked-package versionと一致 |
| `ServerBundleManifest.assets` | ordered unique record | `file`順。`cli.mjs`、`parser-worker.mjs`、全tsdown code-split chunkを正確に1回含む |
| `ServerBundleRecord` | closed object | Exact keyは`file`、`byteLength`、`sha256` |
| `ServerBundleRecord.file` | normalized relative `.mjs` path | Absolute path、empty/dot segment、separator alias、traversal、top-level `public`/`manifests` collisionなし |
| `ServerBundleRecord.byteLength` / `sha256` | non-negative integer / lowercase 64 hex | Copy前にstaged byte、import前にpackaged byteと照合し、完全一致を要求 |

全assembly後、**`dist/`内**のrecursive expected setは2 manifest file、`StaticAssetManifest`にlistedされた全`public/...` path、
`ServerBundleManifest`にlistedされた全server pathだけである。Final dist verifierはstale regular file、unlisted chunk、symlink、fileの
代わりのdirectory、その他platform-safe non-regular objectを含む全差異を拒否する。

Unpacked npm packageは別のclosed package-root setを使う。Exact regular non-symlink file `package.json`、`bin.mjs`、`README.md`、
`README.ja.md`、`LICENSE`と、上記recursive dist setだけを含む`dist/`であり、directory entryはstructuralのみ、その他file/objectを許可しない。
`package.json`はcontract済みname、version、`type`、`bin`、`files`、`engines.node` valueにもexact一致する。Pack verifierは5 fixed root fileの
exact byte length/SHA-256をpre-pack sourceと比較し、全dist assetへ両manifestのlength/hash recordを適用する。Runtime bootstrapは固定
`package.json`、`bin.mjs`、両manifest、全declared assetを`lstat`し、read/hash/import前にregular non-symlink fileを要求する。Packed metadataと
manifest hashは上記どおり検証するが、executing codeが自身のpre-execution byteをself-authenticateできるとは主張しない。Package testはunpacked
tarball全体へpackage-root set、その`dist/` subtreeだけへdist setを適用する。

Build normalizer、unpacked-package verifier、runtime bootstrapは同じmanifest schema、path rule、byte-length完全一致、
hash verificationを共有する。Mismatchまたはrecover可能なenvironment failureをCLI import/host bind前に拒否することをtestする。

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
presentation encoding、digest construction、preview serializationがthrow/rejectするかrequired stringを作れない場合、
operation-local captureをdiscardし、REST ownerはgeneric pre-acceptance Operation Errorだけを返す。Preview、`scanRequestId`、
consent、root context、authorityを作らない。正常previewがcaptureと3 exact rootをfreezeし、active consent retrievalでは繰り返さない。

### GlobalConsentPreview

Capabilityで保護したconsent routeは、正確に1つの`GlobalRootInputCapture`からlexical path operationだけで
このpreviewを作る。作成と返却のどちらでも、候補Global root配下の`stat`、`realpath`、directory
enumeration、file readを行わない。

| Field | Type | Rule |
|---|---|---|
| `previewId` | exact 43-character unpadded base64url string | 独立した32-byte CSPRNG drawのcanonical encodingでprocess-memory lookup key。新previewは以前の未同意previewをinvalidateし、active consent中はそのexact previewをfreeze/reuse |
| `previewEpoch` | non-negative safe integer | Internalでserializeしない。New captured previewごとにincrementし、opaque IDをorder valueにせずreplacement/revalidationをbindする |
| `previewDigest` | 43-character base64url HMAC-SHA-256 | `sessionId`と`previewId`を含むexact `GlobalPreviewDigestEncoding` top recordを対象とし、constant timeで比較。別processの値を受理しない |
| `allowlistVersion` | date string | Current shipped contract version |
| `traversalPlanVersion` | literal `1` | 全immutable entry planのschema versionと一致し、`previewDigest`へbind |
| `entries` | 正確に3 tool entry | Copilot、Claude、Codexの固定順 |
| `entries[].tool` | tool enum | Closed value |
| `entries[].origin` | `default-home \| environment` | Invalidでもenvironment entryを使い、暗黙fallbackしない |
| `entries[].lexicalRoot` | exact raw string | Internalのみ。Escape前のenvironment/default valueを保持し、log/serializeしない |
| `entries[].displayRoot` | ASCII `RootPresentationEncoding` string | `lexicalRoot`のexact deterministic encoding。Owning Sourceが存在する前にoriginを持ち、`SourceRelativePath`、inventory-item locator、canonicalization claim、operational-log field、read authorityではない |
| `entries[].pathPatterns` | non-emptyな固定relative-pattern array | 正確なimmutable Global `TraversalPlan`からrender。隣接customization classなし |
| `entries[].inputState` | `eligible \| present-empty \| relative \| invalid` | I/O前に下記exact ordered `Global lexical state` algorithmでassignする。`invalid`はexplicit Windows UNC/server-share spellingを含むshared pure root parser拒否のabsolute spellingも含み、`eligible`だけがconsent後boundaryになれる |
| `excludedRuleIds` | sort済みexcluded rule ID[] | Authored proseを受け付けず表示除外を決める |

Hostはretained raw valueを変えず`RootPresentationEncoding`を適用する。Allocation能力はNode.js、OS、browserから継承する。
Lexical preview作成中のthrow/rejectionはaccept前のREST request boundaryへ到達し、`scanRequestId`、normalization、
canonicalization、root creation、readなしでgeneric Operation Errorを返す。Size-based input stateは作らない。Digestは下記exact
`GlobalPreviewDigestEncoding`を使い、root fieldはいずれもnullableでない。
Raw `lexicalRoot`、そのescaped `displayRoot`、`pathPatterns`の背後にあるtraversal-plan schema/versionと
canonical selector programをbindする。Escapeの逆変換やUnicode
normalizationには依存しない。固定registry stringは既にcanonical NFCであり、filesystemから得た値を含まない。
Invalid environment valueはescapeして
表示するが、許可pathにnormalizeしない。Present-empty、relative、invalid entryは固定preview表示だけを使い、retained `Diagnostic`を
作らない。Confirmation後は3 entryすべてが`GlobalToolControl`を受け取る。`eligible` entryだけがsafe-fs admissionへ進み、root
context/IDを受け取り、後でtool failure Diagnosticを作り得る。Lexical-ineligible controlはpath-free rejected controlとなり、固定reasonは
frozen previewから表示する。
Shared pure root parserが受理するabsolute pathは通常のhome外でもすべて`eligible`とし、その場所だけを理由にrejectしたりconsent前I/Oを許可したり
しない。Explicit UNC/server-shareその他parser-rejected spellingは`invalid`とする。文書化済みdefaultを選択するのは設定がabsentの場合だけで、empty、relative、invalid、consent後rejectの設定から
fallback authorityを作らない。
Admissionは保存済みinternal raw `lexicalRoot`だけを使い、`displayRoot`をpathに使わずenvironmentを再読込しない。
Preview creation/retrievalはcoordinator lock下でlinearizeする。Consentがactive、initial `GlobalEnableOperation`がregistered、またはnon-complete
`GlobalDisableOperation`がpreview fenceを保持する間、
preview取得はID/digestを含む同じ保存済みDTO-visible objectをfield semantics上byte-for-byteで返し、environmentを読み直さずreplacementも
作らない。どちらでもない場合だけnew captureを実行し、`previewEpoch`をincrementしてprior unconsented previewをreplaceできる。
Initial operationがconsentをactivateせずterminalになった場合、そのoperationをunregisterした後だけfreezeを解除する。Client purge後にexact
consent表示を復元する唯一のpathであり、in-flight enableが到達不能previewのauthorityをcommitすることを防ぐ。

### GlobalConsent

| Field | Type | Rule |
|---|---|---|
| `allowlistVersion` | date string | 表示したcurrent contractと一致すること |
| `previewId` / `previewDigest` | opaque string | Current in-memory previewと完全一致すること |
| `confirmedTools` | exact `[copilot, claude, codex]` | 凍結済み3 entryすべてと一致するserver-derived固定set。Requestはselectorを持たずnarrowできない |
| `confirmedAt` | `UtcTimestamp` | Memoryのみ |
| `active` | boolean | Global inspection disable時にclearし、tool固有Global Sourceをすべて除去 |

Consentはallowlist contractに表示したpathだけを許可する。隣接settings、credential、state、skill、
plugin、任意env pathは許可しない。
Confirmation commandはtool listを持たず、serverはfrozen previewを検証後、lexicalにinvalidと判明済みのentryも含む3 tool
すべてをclosed orderで導出する。Retry時のoperation work setは`retryableTools`へprojectされたcontrol、すなわちnon-pending unpublished
admitted controlと`retryDisposition: same-preview`のrejected controlだけから導出する。Lexical `new-preview-required` controlはfrozen preview下で除外し、clientは
tool選択でconsentを変更できない。
Confirmation後、candidate entryを追跡せずに各eligible lexical rootをcanonicalizeする。Canonical rootと
表示済みlexical absolute rootがcomponentごとに一致しない場合、enumeration前にそのtoolをsafe diagnostic付きで拒否する。
Contract済みNode checkが公開するsymlink、junction、case、Unicode normalization、short-name差はすべて拒否し、public Node APIが
公開しないaliasは文書化した`platform-unobservable` limitationとして残す。
Applicationはcanonical targetへ暗黙置換せずconsentを広げない。Userはexact frozen lexical rootがadmissibleになるようfilesystem/configurationを
修正してsame-preview retryを使う。Lexical root string自体を変更する必要がある場合だけGlobal inspectionをdisableしてnew previewを取得する。
Admit済みtoolごとに、そのtoolの表示済みrootへbindしたGlobal Sourceを1つ作成できる。
Confirmationで複数toolを結合したGlobal Sourceを作らず、1 toolのSourceに別tool rootへの権限を与えない。
初回enable後もretryable toolにSourceがない場合（safe-fs all-rejected/mixed outcomeを含む）、exact active consentとその
`GlobalToolControl` recordにより、server-derived retryable subset全体だけをrequeueできる。Lexical-ineligible controlにはdisable/new previewが
必要である。既存Sourceはsemantic contentとstableな
`sourceId`を保持する。ただし、初回またはretryのadmitted-subset transaction成功時には新規admit済みSourceをすべて一緒に
publishし、session generationを正確に1回進め、carried graphすべてのgeneration-owned IDを再生成し、old
file/detail/comparison/editor stateを無効化する。別preview/root
には先にGlobal調査のdisableが必要で、retryable toolがないrequestはclosed conflict `no-retryable-global-tool`として拒否する。

Consent後のcanonical/root validationは0から3 toolをadmitできる。Serialized coordinatorはconsentをactivateし、admitted
subset全体に最大1つのprovisional batch scanを作る。Contract宣言済みroot `lstat`からのexact `ENOENT`、lexical-invalid entry、
または決定的なlink/type/boundary rejectionはそのtoolだけに影響する。Event-confirmed-close observationは既にconfirm済みのsuccessful
close lifecycleだけを維持する。すべてのnon-carveout throw/rejectionはREST boundaryへpropagateし、
transaction全体をabortしてprovisional subsetを一切publishしない。全toolが決定的にrejectされた場合もconsentはactiveのまま、
new Source/scan jobをpublishせず、contract済み`active-no-job` stateを返す。
Initial activationではGlobal Sourceが0個となり、
all-rejected retryではgenerationをcommitせず、既存SourceとそのIDを変更しない。後のexact-consent retryはcurrent server-derived
`retryableTools` subsetだけを再validationできる。Lexical root変更またはlexical-ineligible controlのeligible化にはdisable/new previewが必要である。

### GlobalToolControl

| Field | Type | Rule |
|---|---|---|
| `tool` | tool enum | Consentがactiveな間、support対象toolごとに正確に1つ存在する |
| `previewId` | opaque string | Active frozen previewを参照し、in-place変更不可 |
| `state` | `unvalidated \| rejected \| admitted \| published` | Operation-localなprovisional control 3件はすべて`unvalidated`から始まるが、そのstateをactiveな`GlobalControlView`へserializeしない。Lexical-ineligible entryはsafe-fs I/Oなしでrejected、`admitted`はvalidなretained contextを持つがSource未公開、`published`はSourceを正確に1つ持つ |
| `sourceId` / `boundaryId` | opaque IDまたはnull | Root admission成功後だけ一緒にallocateし、Source commitまではinternal。Admissionをやり直す場合は破棄 |
| `rootContext` | `InspectionRootContext \| null` | Lexical/canonical/root-identity validation後にsafe-fsだけが作り、Sourceがなくてもここで所有 |
| `rejectionCode` | closed reason codeまたはnull | `rejected`の場合だけnon-null。Lexical reasonは正確に`present-empty \| relative \| invalid`、root absenceは正確に`safe-fs-root-absent`、その他はowning deterministic Diagnosticのexact codeで、path/environment valueを含まない |
| `retryDisposition` | `same-preview \| new-preview-required \| null` | `rejected`以外はnull。Lexical reasonは正確に`new-preview-required`、決定的なconsent後admission/initial-scan reasonはすべて`same-preview` |
| `diagnosticId` | session diagnostic IDまたはnull | Lexical `new-preview-required` rejectionだけはnull。それ以外では、そのtoolにpublished Sourceがない間のcurrentな決定的admission/initial-scan Diagnosticを参照する。Published-Source rescan failureは`StaleSourceFailure`だけに属し、throw/rejectionは参照しない |

`GlobalToolControl`はsession control stateでありscan working setに入らない。正常admissionは単一provisional subset scanを
queueする前に未公開Source/boundary IDとroot contextを事前割当する。決定的にfatalな初回scanはbatch working set全体を
破棄するが、このcontrol/contextはexact-consent retry用に保持し、retryごとにenumeration前のroot identity/
containmentを再checkする。Retained contextが一致すればactiveのまま再利用する。以前admitしたrootをいずれかのcheckが
拒否または検証不能とした場合、safe-fsはpre-operation contextをmutate/closeせずtentative rejectionとtentative context/ID replacementを
記録する。後のretryは同じfrozen lexical previewの下でcomplete new admission後だけnew context/IDを作れる。Success buffer作成まではold
contextをexact rollback snapshotとして保持し、registered operationがadmission/dequeueを抑止するためjobはこれを使えない。Buffer-bound
dispositionで1 synchronous non-throwing memory transactionがold handle-free contextをrevoke/close/unregisterし、old unpublished IDをdiscardして、
rejected null-context stateまたはtentative admitted replacementを適用する。Non-carveout throw/rejectionまたはserialization failureではtentative resourceだけを
discardし、pre-operation field/contextをbyte-for-byte維持する。Consent後validation failureはそのdisposition時だけID/contextなしの
`rejected` controlをcommitし、同じpreviewでrevalidationできる。Source commit成功時は事前割当IDをpublishし、`SourceBoundary`がこのcontextを
参照する。Safe-fsの決定的rejectionまたはfatal returned scan outcomeはそのcontrolのcurrent tool Diagnosticを作成/置換する。
Lexical `present-empty`、`relative`、`invalid` rejectionは`diagnosticId: null`を維持し、fixed rejection codeとfrozen previewだけで説明する。
Non-carveout throw/rejectionはtool別failureを作らず、accept済みadmitted-subset Global batchではconsent全体について
`GlobalControlView.lastOperationErrorId`が参照するoperation-level REST Operation Errorを1件だけ作る。Source commit成功は
該当する決定的failure recordをclearし、
無関係なtool outcomeは保持する。Global disableはworkをabortしてopen file handleをcloseしてからcontrol所有diagnosticを
すべて削除し、control所有contextをすべてcloseしてconsent、frozen preview、全controlを削除する。DTOはこのauthorityを作成・変更できない。

### GlobalControlView

| Field | Type | Rule |
|---|---|---|
| `state` | `active \| disabling` | Priority barrier受理時に`disabling`となり、single commitでfieldがnullになるまで維持 |
| `previewId` | exact 43-character base64url string | Activeな256-bit `GlobalConsentPreview.previewId`と一致し、capabilityでもfilesystem pathでもない |
| `confirmedTools` | exact `[copilot, claude, codex]` | Fixed all-tools consent setで、clientから選択しない |
| `pendingTools` | sort済みtool enum[] | Atomicかつbuffer-boundなbatch acceptance後だけ、1 accepted subset scanが所有するadmitted tool。Initial/retry validation/admissionはoperation-localかつunobservable。Cancellation開始後の`disabling`中はnull `batchStatus`とempty |
| `batchStatus` | `GlobalBatchStatus \| null` | Accepted admitted-subset queueingからterminal success/failureまでnon-null。Fresh snapshot/lost-202 recovery用にpromote済み`scanRequestId`を保持 |
| `retryableTools` | sort済みtool enum[] | `active`中、non-pending unpublished `admitted` controlと`retryDisposition: same-preview`の`rejected` controlを正確に含む。Operation-local retry validation中はexact pre-operation projectionを維持し、lexical `new-preview-required` controlを除外する。`unvalidated`はnon-serializedなoperation-local workだけに存在し、`disabling`中はempty |
| `toolFailures` | fixed-tool-order `{ tool, diagnosticId }[]` | Non-nullな全`GlobalToolControl.diagnosticId`のexact public ownership map。Tool/diagnostic IDはuniqueで、Operation Errorを含まない |
| `lastOperationErrorId` | opaque Operation Error IDまたはnull | Active consent全体についてcurrentなaccept済みadmitted-subset Global batchのnon-carveout throw/rejection。`InspectionSession.operationErrors`の正確に1 entryへresolveし、1 toolへ帰属させない |

`GlobalControlView`はactive consent、その`GlobalToolControl` record、coordinator、published Sourceから派生する。
Consentまたはretained control stateがactiveな間、Global Sourceが0個のinitial all-failed/`active-no-job` outcomeと、
既存Sourceを保持するall-rejected retryを含め、
authenticated session snapshotごとに返す。Client purge後、SPAはfresh sessionを取得し、
`previewId`でpreview routeからexact stored previewを要求して全path/state/exclusionを再表示してからretryを提示する。
Disableは直ちに利用できる。Published toolは`sources[].tool`から派生しretryableと重複できない。このDTOはcanonical/
admitted root、digest、source contentを含まず、別取得するcapability保護previewがunchanged enable request用digestを提供する。
`toolFailures`によりfresh clientはsession-ownedな決定的admission/scan Diagnosticをexact toolへattachでき、そのIDは
`sessionDiagnosticIds`にも存在する。Null `diagnosticId`のcontrolにはrowを作らず、dangling、duplicate、cross-tool、
non-session Diagnostic referenceはserializationでrejectする。Owning control failureのclearまたはdisable commitまでrowを保持する。
`GlobalBatchStatus`は正確に`{ scanRequestId, tools, phase, failureRef }`とする。`tools`はnon-empty fixed-tool-order admitted subset、
`phase`は`waiting \| enumerating \| reading \| deriving \| recognizing \| failed`、`failureRef`は`failed`以外nullとする。決定的terminal
failureは`{ kind: 'tool-failures', failedTools }`を使い、non-empty fixed-tool-order toolは、そのbatchが生じさせたsole current Diagnostic
ownerの`toolFailures` rowと正確に一致する。Diagnostic IDを繰り返さず別owner referenceも作らない。Non-carveout throw/reject terminal failureは
`{ kind: 'operation-error', operationErrorId }`を使い、
`lastOperationErrorId`と一致する。Tool非依存のdeterministic Global batch failureは存在せず、全returned deterministic failureを1つ以上の
exact toolへ帰属させる。Cross-tool assembly/invariant/retention/serialization failureはthrow/rejectしてgeneric Operation Errorを使う。
Successでは全new Sourceが同じ`Source.scanRequestId`でpublishされるcommitだけが`batchStatus`をremoveし、`active-no-job`はstatusを作らない。
Retry acceptanceはprior failed statusをreplaceし、disable acceptanceはbatch revokeと同時にclearする。したがって202 delivery failure後も全accepted
queued/running/terminal batchをrequest-correlateできる。
Disable barrierがpending/activeの間は`state: disabling`かつjob/retry arrayを両方emptyとし、UIはretryを提示せずenable
APIもretryを拒否する。Disable commitが全control/consentを削除した時点だけviewをnullにする。
`state: active`かつ`globalEnableInProgress`がnon-nullの間、UIはenable/retryを提示せず、duplicate enableは`409 global-enable-in-progress`を
返す。Retryはatomic dispositionまでpre-operation `retryableTools` projectionを維持する。`state: active`かつ`pendingTools`がnon-emptyの間、`batchStatus`は同じtool setを持つnon-failed active phaseで、`retryableTools`は既に`rejected`またはnon-pending `admitted`となった
toolの情報projectionとして残るが、UIはretryを提示せずenable APIは`409 global-enable-in-progress`を返す。Disableは
直ちに利用できる。`pendingTools`がemptyとなりmatching frozen previewを取得・検証した後だけretryを提示する。
Activeなserialized viewに`unvalidated` controlが存在する状態を禁止する。Accepted pending controlはすべて既に`admitted`であり、
`pendingTools`と同じaccepted-batch membershipを持つ。

Accept済みadmitted-subset Global batchのnon-carveout throw/rejectionは、1件の`OperationError`をatomicに作り、そのIDを
`lastOperationErrorId`へ設定し、そのnon-carveout throw/rejectionについてtool別failureを一切残さない。後のsame-consent retryは
accept前failureの間このreferenceを保持し、決定的validationが`active-no-job`へ到達した時点、またはreplacement batchを
acceptした時点だけclearする。Replacement batchの正常commit後もclearのままとし、そのbatchのterminal failureはnew errorで
atomicに置換してsupersede済みunreferenced errorを削除する。Global disableはfieldと参照先errorをclearする。Repository operationと
publish済みSourceのrescanは両方を保持する。したがってnon-null valueは正確に1 retained errorへresolveし、各Global batch errorは
正確に1 ownerを持つ。

### GlobalEnableOperation

| Field | Type | Rule |
|---|---|---|
| `operationId` | opaque string | 1回のinitial enableまたはexact-consent retry用のunique coordinator command |
| `kind` | `initial-enable \| retry` | Closed operation type。どちらもcommit済みgenerationではない |
| `commandEpoch` | non-negative integer | 受理時のcoordinator値をcaptureし、全async continuationで一致を要求 |
| `previewId` | opaque string | Operation全体でfrozen consent previewと一致 |
| `previewEpoch` | non-negative safe integer | Registration時にexact preview objectからcaptureし、全async boundary後とterminal commit前にobject identityとともにrevalidate |
| `tools` | non-emptyなsort済みtool enum[] | Initial enableではexact fixed 3-tool set、retryではcomplete server-derived `retryableTools` subset。Clientから供給またはnarrowしない |
| `scanRequestId` | opaque ASCII stringまたはnull | Rootを1つ以上admitして単一subset scanをacceptした場合だけ正確に1回allocateし、そのbatchとcommitする1 generationで共有する |
| `status` | `waiting \| validating \| admitting \| queueing-batch \| draining \| cancelled \| complete` | Disableがabortすると`draining`になり、以後new authority/jobをpublishできない |
| `responseDisposition` | `unset \| 202-queued \| 202-active-no-job \| 409-global-disable-pending` | Coordinator linearization pointで正確に1回選択し、`202-queued`は1つのatomic admitted-subset jobを表す |
| `abortSignal` | internal `AbortSignal` | Root validation/admissionとqueue前safe-fs callすべてで共有 |

Initial enableは同じcoordinator lock下でcommandを登録してexact current preview object/epochをfreezeするが、provisional consent、3件のcontrol、context、candidate ID、全admission outcomeを
operation-localかつ観測不能に保ち、3 entryすべての決定的validationが終わる前に`globalControl`を作成せず
`pendingTools`も変更しない。Registered中に見えるのはauthority-freeな`globalEnableInProgress { kind: 'initial-enable', operationId, previewId }`
coordinator projectionだけで、partial tool outcomeを公開せず、operation unregisterまたはatomicな`globalControl`作成時に消える。Retryはexisting active consentに対してcommandを登録し、mutation前のcontrol、failed `batchStatus`、
diagnostic、pending stateをsnapshotしてauthority-freeな`globalEnableInProgress { kind: 'retry', operationId, previewId }` projectionだけをpublishする。
Retry validation/admissionのその他stateもbuffer-bound batchまたはactive-no-job disposition commitまでは
operation-localかつunobservableとする。Root validation/admissionとscan-job作成はcoordinator配下だけで行う。全async boundaryの前後で、同じactive
`operationId`、`commandEpoch`、exact preview object/`previewEpoch`、non-aborted signalに加え、initialでは同じoperation-local provisional state、retryでは
同じactive controlを証明する。Initial enableとretryはいずれもsession stateを変更する前にcoordinator lock下でtransitionを
登録する。Cancellation/disableはoperationをdrainし、late continuationによるjob enqueueやauthority再取得を防ぐ。
Running/queued `GlobalEnableOperation`は最大1つとする。決定的なlexical、exact structural-`lstat` absence、link/type、boundary
outcomeはtoolをrejected/admitted setへpartitionする。Event-confirmed-close observationは既にconfirm済みのsuccessful close
lifecycleだけを維持する。すべてのnon-carveout throw/rejectionはREST ownerへunwindする。Initial enableは
consent/controlをactivateせず全provisional stateを破棄し、retryは正確なpre-operation snapshotを復元する。どちらもpartial
admitted subsetをcommitしない。全owning toolが決定的validation outcomeへ到達した後、coordinatorはlock下でgeneral
pre-acceptance response transactionを行う。最初にcurrent operation ID/command epoch/preview object/preview epoch/signalを検証し、publishせず、initial consentと3 control
またはretry partition、candidate batch/`scanRequestId`と`202-queued`、あるいはjobなし/null IDと`202-active-no-job`、および
exact projected success envelopeをprepareする。Control activation、job transfer、`lastOperationErrorId` clear、failed `batchStatus` replace、
newly admitted toolのsuperseded diagnostic clear、public disposition選択より
先に、そのenvelopeを完全にvalidate、JSON serialize、UTF-8 encode、length-materializeして1つのimmutable bufferを作る。
Serialization failureではinitial provisional stateをdiscardするかretryのexact pre-operation control/pending/error snapshotをrestoreし、
candidate IDは`scanRequestId`にならず、REST ownerがnull-IDのaccept前Operation Errorを返す。Buffer作成後、同じlock内で同じ
operation ID/command epoch/preview object/preview epoch/signal/barrier stateを再検証し、その後だけcontrolをatomic activate/applyする。
Accepted batchへadmitされた各toolのprior `diagnosticId`をclearし、candidate batch/IDをpromote/enqueueして`batchStatus`を作り
`pendingTools`を設定するか、null `batchStatus`でrejected-tool diagnosticだけをretain/replaceしてactive-no-jobをcommitし、disposition選択、
`complete`化、unregister、exact buffer bindをatomicに行う。
Per-tool Source commitはobserverに一切見えない。Disable barrierがそのcommit前に先にlinearizeした場合、prepared buffer/stateをdiscardし、
同じcheckは`409-global-disable-pending`を選んでcancellationを
drainする。Drain済みoperationは`cancelled`となり、barrier cleanup前に
unregisterする。Operationがraceに勝てばcommit/buffer-bind済み`202`、barrierが勝てば`409`となり、両方にはならない。Terminal operation
historyは保持せず、単一accepted batchは完了までadmit済みtoolすべてにより`pendingTools`とexact `batchStatus.scanRequestId`へ表される。
Failed statusはempty `pendingTools`でretry acceptanceまたはdisableまで残る。Commit後のdeliveryでenvelopeを
再serializeしない。Zero-byte/partial write、socket close、write rejectionでもaccepted control/job/dispositionを維持し、Operation Error、
stale overlay、`lastOperationErrorId`を作らない。後のjob自体のfailureだけがpromote済みnon-null IDを持つaccepted-job errorを作れる。

### ClosableResourceRegistry

Process-wide registryはinspection resourceのsole owner/close state machineである。`GlobalDisableOperation`はcleanup lineageを参照するだけで、
second state mapを所有しない。

| Field | Type | Rule |
|---|---|---|
| `records` | opaque resource IDをkeyにしたinternal map | Open済みinspection resourceごとにexact live recordを1つ。ID/recordはserializeしない |
| `record.resource` | `{ kind: 'file-handle', value: FileHandle } \| { kind: 'directory', value: fs.Dir } \| null` | Preallocated reservationが`opening`の間だけnull。それ以外はexact strong reference。Numeric descriptor/reconstructed wrapperなし |
| `record.owner` | `scan-attempt \| global-enable-operation \| global-disable-lineage`とexact owner ID/source scope | Coordinator lock下だけで変更し、revoked continuationはprior ownerを再取得できない |
| `record.state` | `opening \| open \| closing \| close-confirmed \| close-unknown` | Closed transition machine。`open`へresetせず`close-unknown`からclose callをretryしない |
| `record.closePromise` | shared Promiseまたはnull | `close()`がsole promiseをreturn後にnon-null。FileHandle eventが先にconfirmしてもsettlementまで全waiter用に保持 |
| `record.closeObserver` | one-shot FileHandle `close` observerまたはnull | `file-handle`だけ`close` call前にarmし、`fs.Dir`には同等confirmation eventなし |
| `poisoned` | boolean | Retained `close-unknown` recordが1件以上ある間だけtrue。New inspection filesystem workをblockするが、late FileHandle `close` eventがlast unknownをconfirmすればclear可能 |

`open()`/`opendir()` call前にcoordinatorがopaque IDをallocateし、exact ownerを持つ`opening` reservationをinsertする。Failureはresource作成前に起きる。
Fulfillmentはuser callback/intervening awaitなしでreturned exact resourceをpreexisting slotへsynchronous attachして`open`へ変え、rejectionはempty
reservationをremoveする。このattachを妨げるengine failureはlive resourceをownできないためprocess-fatalで、continuing REST errorへ変換しない。
Directory enumerationはexplicit `Dir.read()`で行い、async-iterator auto-closeは禁止する。Normal/fatal/cancel/disableの全`finally`はregistry helperだけを
invoke/joinする。1 synchronous coordinator critical sectionでfirst closerが該当時FileHandle observerをinstallし、exact resourceの`close()`を1回呼ぶ。
Promise return前にcallがthrowした場合は`open`から直接`close-unknown`へ移し、exact resource/observerを保持してregistryをpoisonする。Returnした場合は
promiseを保存して`closing`をpublishしてからcritical sectionをreleaseし、observer/callerがnull promiseの`closing`を観測できない。Synchronousに
close eventを観測した場合は`close-confirmed`が勝ち、returned promiseはsettlementまでshareする。FulfillmentまたはFileHandle `close` eventで
不可逆に`close-confirmed`へ移る。Event confirmation後にraw promiseがrejectした場合、helperはそrejectionをobserveするが、物理closureが独立に
confirm済みなのでshared close resultをsuccessとし、propagateもpoisonもしない。Rejection handling時点でconfirming eventのないFileHandle、
および全rejected `Dir.close()`は`close-unknown`へ移し、current ownerへpropagateし、`poisoned`を再計算する。Late FileHandle `close` eventがunknown recordをconfirmした場合は`close-confirmed`へ変え、
last unknownなら`poisoned`をclearして他fenceがない限りordinary schedulingをresumeできる。Directory unknownには同等recoveryがなくrestartを要する。
Confirmed recordはowning attemptと全参照disable lineageがreleaseした後だけremoveできる。
Unknown record/exact resourceはstrongly heldのままとする。

Disable acceptanceはaffected Global recordとinterrupted running Repository command所有recordをすべて`cleanupResourceIds`へatomic transferする。
Revoke済みpending `open`/`opendir`が後でfulfillした場合、returned resourceをcleanup-onlyとしてそのdisable lineageへ最初にregisterし、read/enumerateせず
helperをinvoke/joinする。Barrierは全affected continuation settlementを待ち、terminal commit前にregistry sweepを繰り返すためlate resourceはlineage外へ
逃げない。Retryはsame exact ID/record/promise/observer/strong referenceを再利用する。

Event-confirmed-close observationでは既にconfirm済みのsuccessful close lifecycleを維持する。Close未確認を含むnon-carveoutなnormal close rejectionはtrigger-owning runtime/REST boundaryへpropagateしattempt resultをpublishしない。`poisoned`中はfilesystem workにつながり得る
new Repository/Global admission、scan、rescan、enable retry、Global preview captureをscheduleせず、それらREST mutationは
`409 resource-cleanup-restart-required`を返す。Global-disable fenceがなければcommit済みread-only DTO/livenessは利用できる。Global disableはsecurity
exceptionであり、active/queued Global stateがある場合のfirst requestはaffected registry recordをadoptする前にrevocation/epoch increment/control-only
data fenceをlinearizeする。Existing disable cleanup retryもlineageへjoin/sweepでき、unknownがcompletionをblockする間generic disable Operation Errorを
return/retainする。Global state/barrierがなければdisableはunrelated poisonをrepairできずrestart-required conflictを返す。Automatic-startup ownerはprocess top levelへ到達する。
REST ownerではprocessを維持するが、late FileHandle eventがlast unknownをclearしない限りreclamationにrestartが必要である。したがって`finally`が保証するのはhelper invocation/joinであり、physical close
confirmationではない。

### GlobalDisableOperation

| Field | Type | Rule |
|---|---|---|
| `operationId` | opaque ASCII string | 1 accepted priority barrier。Join requestは同じIDとterminal resultを共有 |
| `commandEpoch` | non-negative safe integer | Barrier acceptanceでincrement/captureし、全continuation/final commitで一致を要求 |
| `commitKind` | `cleanup-only \| remove-active-state` | 最初のacceptance時に選択し全retryで不変。後者だけがremove対象のpublic Global consent/control/Source stateを持つ |
| `baseGeneration` | `GenerationNumber` | Acceptance時のexact current generation |
| `candidateGeneration` | `GenerationNumber \| null` | `remove-active-state`だけbase + 1。`cleanup-only`はnullでbaseと全generation-owned IDを維持 |
| `status` | `draining \| committing \| failed \| complete` | `failed`はrevoked authorityとretry可能cleanup stateを保持し、activeへrollbackしない |
| `closedResourceKeys` | internal set | Synchronously unregister済みhandle-free contextと`close-confirmed` closable resourceだけを含む。Confirmation後だけmemberを追加し、uncertain close outcomeの推測には使わない |
| `cleanupResourceIds` | internal set | Interrupted Repository workを含むこのcleanup lineageのresourceについてprocess-wide `ClosableResourceRegistry`へのexact referenceを保持。Failed-operation replacementはcloneせずsame set/recordを継承 |
| `frozenPreview` | internal exact preview reference | Pre-barrier previewを`failed`中も保持し、terminal successまでpreview capture/replacementをfence |
| `successBuffer` | immutable UTF-8 bufferまたはnull | Drain/cleanupとcomplete final-snapshot construction後、removal commit前だけ作成 |

Active/queued Global authorityもretained disable failureもないno-op disableは通常single-stage response gateを使い、mutationしない。
それ以外はrequest validation/barrier registrationをcoordinator lock下でlinearizeする。最初のacceptance時にpublic Global consent/control/
Source stateがあれば`remove-active-state`を選び、public Global stateを一度もpublishしていないoperation-local initial enableだけをcancelする場合に
限って`cleanup-only`を選ぶ。Retained failureのretryはfailed operationのexact `commitKind`、`baseGeneration`、removal intent、
`closedResourceKeys`、全strong resource reference/shared promise/observerを含むexact registry recordへの`cleanupResourceIds`、`frozenPreview`を継承する。
Replacement operationはclone/reinitializeせずsame cleanup lineageを保持し、既に一部cleanupされたpublic projectionから`commitKind`を再計算しない。したがってfailed
`remove-active-state` operationはterminal successでpublic Global graphをremoveするまで`remove-active-state`のままとする。Acceptanceはepoch increment、operation register、
affected publication authorityの不可逆revoke、existing `globalControl`の`disabling`化、`pendingTools` empty化、`batchStatus` clear、
`globalContentEpoch` increment、public Global-content access fence activation、active/queued `GlobalEnableOperation`/Global scan abortをatomicに行う。Operation-local initial enableには公開control snapshotがないが、同じ
internal barrierでrevoke/drainする。このacceptance phaseだけはterminal response serializationより先に実行するmodel唯一のtwo-stage例外である。
`draining`/`committing`中のsecond disableはsame completionへjoinし、joined transport disconnectはbarrierをcancelしない。

`globalDisableInProgress`はacceptanceからterminal failureまでoperation ID/statusだけをmirrorし、terminal success時だけremoveする。Cleanup detail/
authorityを公開しない。`globalEnableInProgress`はinitial-enableまたはretry operationがbarrierでcancel/unregisterされた時点で消える。

Acceptanceから`failed`、`committing`、retry drainを通じてbarrierはhighest-priority Global fenceのままとする。全Global enable/rescan requestは
`409 global-disable-pending`を返し、queued Global commandをdequeueせず、preview retrievalはnew capture/replacementなしで`frozenPreview`を返す。
Operation-local initial enableだけで`globalControl`がnullの場合も同じである。さらにgeneration fenceとして、non-complete barrier中はnew
Repository rescanをadmitせず、generation-mutating commandをdequeueせず、scan commitを一切許さない。New Repository rescanは
`409 global-disable-pending`を返す。Acceptance時にrunningだったRepository commandはcommit前にrevokeし、terminal disable success後に正確に
1回だけrequeueしてfailed attemptではreleaseしない。したがってfailed disableとretryの間に`baseGeneration`は変化できず、base mismatchは
rebase/overwrite ruleではなくinternal invariant failureとする。

同じfenceは全full session/inventory/generation/Source/file/detail/Diagnostic/relationship/comparison data requestをrejectし、
`GlobalFenceRecoverySnapshot`だけをselectする。Drain、close、final serialization、terminal commitの成否に依存しない。Disable retryはincrement済み
`globalContentEpoch`を継承し、retained graphを再びreadableにしてはならない。Terminal successまたはprocess restartまでRepository/Global inspection dataを公開しない。

Barrierはenableが`cancelled`へ到達するまで待ち、final queued-Global-work cancellation sweepを実行し、cleanup state machineにより全provisional/
control-owned context/open closable resourceをclose/unregisterしてzero-I/O removal generationをprepareする。Drained enable continuationはunattached
operation-local resourceだけをcloseでき、job enqueue/control mutationはできない。この順序でacceptance後に完了したvalidationがsweep後へ
authorityを追加することを防ぐ。Barrierがenableのbuffer-bound disposition前に勝てばenableは`409 global-disable-pending`、enableが先に`202`を
選べばbarrierがaccepted batchを通常どおりcancel/removeする。Expected cancellationはDiagnostic/Operation Errorを作らない。

Barrierは`cleanupResourceIds`の全IDについて`ClosableResourceRegistry`だけを使う。Acceptanceとraceしたnormal cleanupは既にsame recordへ
transfer済み、またはsame promiseをshareする。Referenced recordが`close-confirmed`になった場合、barrierはそのIDを`closedResourceKeys`へ追加できる。
Disable lineage外のnormal cleanupにはこのsetは不要である。Retryは`closing`へjoinし、still-`open` recordをhelperで1回だけcloseし、confirmed recordを
skipし、referenced `close-unknown`が残る間generic Operation Errorを再度返す。Guess/double-closeは禁止する。Terminal disable successは全referenced
closable resourceの`close-confirmed`と全contextのsynchronous unregisterを要求する。Indefinitely unknown outcomeでは全public inspection contentを
fenceし続け、resource reclamationにprocess restartが必要だが、REST-triggered failure自体はprocessをterminateしない。

Cleanup後、coordinator lock下でfinal public state/success envelopeをpublic control/Source removalなしにprepareする。
`remove-active-state`ではbase + 1と完全rekey済みcarried Repository graphもprepareし、`cleanup-only`ではresponseがbaseを報告してgeneration
graph/IDを変えない。Envelopeを完全にvalidate、JSON serialize、UTF-8 encode、length-materializeして`successBuffer`を作り、operation ID、epoch、
barrier state、base generationを再検証する。その後だけ1 atomic terminal commitがfrozen preview、残るoperation-local resourceをremoveして
`globalDisableOperationErrorId`をclearする。`remove-active-state`では同じcommitが全Global Source/control/consentとそのstale failure/diagnostic/
batch errorをremoveしてcandidate generationをcommitし、`cleanup-only`ではgeneration/public graph transitionを行わない。その後operation complete化と
exact buffer bindを行う。Commit後delivery failureは
rollbackも別error作成もしない。

Barrier acceptance後のunexpectedなnon-carveout throw/rejection（drain、close/unregister、final assembly、success serializationを含む）はtrigger REST boundaryへ
propagateしgeneric Operation Errorとして返す。このoperation ID/null `scanRequestId`を持つretained errorをatomic create/replaceして
`InspectionSession.globalDisableOperationErrorId`から参照する。存在する`globalControl`は`disabling`のまま、publication authorityはrevokedのまま、
prior generationをcurrentに保ち、success body/removal commitをpublishしない。Operation-local initial enableだけだった場合もownerを提供する。
後の`POST /api/v1/global/disable`はledgerからidempotent cleanupをstart/resumeしてfailed operationをreplaceする。別terminal failureはreferenced errorをreplaceし、terminal
successだけがclearする。REST triggerなのでprocessは終了しない。Coordinator queueにproduct固有の数値capacityを設けない。

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
| `selectors` | non-emptyなordered unique `MatcherSelector[]` | 1 static rule所有のalternative。Repository renderingは`./`で始まり、Global renderingはそのtool boundary相対 |
| `MatcherSelector.rendered` | canonical string | Human contract spelling。Typed segment programから正確にround-tripする |
| `MatcherSelector.segments` | non-emptyな`MatcherSegment[]` | Closed ordered program。Final tokenはregular fileを表す |
| `MatcherSegment` | exact discriminated union | `{ kind: 'literal', value: NonEmptyMatcherLiteralSegment }`、`{ kind: 'one-segment', suffix: MatcherLiteralSuffix }`、`{ kind: 'recursive-directories' }`。Executable glob、regular-expression object、implicit discriminator、extra fieldは不可 |

`NonEmptyMatcherLiteralSegment`はnon-empty printable ASCII stringで、code unitはU+0021–U+007Eのうち`/`、`\\`、`:`, `*`、`?`、`\"`、`<`、
`>`、`|`を除き、`.`と`..`も禁止する。同じclosed typeをstatic fixed prefix、exact target、fixed derived suffixで使う。
`MatcherLiteralSuffix`はempty stringまたは1 `NonEmptyMatcherLiteralSegment`で、emptyはcanonical bare `*` tokenをrenderし、`one-segment`
suffixだけで許可する。Compilerはnon-ASCII registry path literalをrejectするため、raw byte/code-unit relevanceと後続NFC classificationは不一致にならない。
`literal`はcase-sensitiveなexact ASCII segmentを1つmatchする。`one-segment`は`*`と固定literal suffixで表記し、non-empty
segmentを1つmatchする。Non-terminalならdirectory step、terminalならfile stepとする。`recursive-directories`は
complete `**` segmentだけで表記し、0個以上のdirectoryをmatchする。Non-terminalかつrecursive token同士の
隣接不可とする。Build validationは全renderingをcompileしてcanonical round-tripを行い、runtimeはこのimmutable
typed formだけをloadする。これによりdescendant contextとdirect child、またはdescendant contextと固定recursive
subtreeのcompositeを、曖昧な単一expansion enumを発明せず表現できる。

### TraversalPlan

`TraversalPlan`は`StructuredInspectorMatcher`からcompileするimmutable shipped dataで、`safe-fs.ts`が受理する唯一の
traversal programである。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | literal `1` | Global preview digestにbindし、unknown versionはregistry loadをfailure |
| `boundary` | 正確なSource-boundary descriptor | Matcherからcopyし、request/display textから推測しない |
| `selectors` | non-emptyなordered `TraversalSelectorPlan[]` | Matcher selectorの1対1 canonical compile結果 |
| `selectionPolicy` | `all-matches \| codex-global-first-non-empty` | Closed scheduler policy。後者はexact ordered selectorが`AGENTS.override.md`、`AGENTS.md`の`codex.global.instructions`だけで有効 |
| `TraversalSelectorPlan.mode` | `repository-program \| global-exact \| global-fixed-subtree` | Closed operation class。Generic ambient-root walkerなし |
| `TraversalSelectorPlan.fixedPrefix` | NFC literal segment array | Repositoryではempty。Globalではexact targetまたはfixed-subtree rootまでのcomplete pathを、そのterminal target/subtree segmentを含めて持つ |
| `TraversalSelectorPlan.remainder` | `MatcherSegment[]` | Repositoryのcomplete selector program、Global exact targetではempty、またはGlobal fixed-subtree root直下だけのcomplete dynamic program |
| `structuralCheckpointTemplates` | exact ordered `StructuralLstatCheckpointTemplate[]` | 下記closed catalog。Missing、extra、reorder、widenしたtemplateはbuild validationでreject |
| `TraversalSelectorPlan.discoveryCheckpointIds` | ordered checkpoint ID[] | このselectorがinstantiate可能なexact discovery template。全IDはowning planでresolveし、runtime指定IDを受け付けない |

Compilationはclosedかつlosslessなmappingとし、registry-authored traversal fieldをrejectする。

| Mode | Exact field invariant | Exact `discoveryCheckpointIds` |
|---|---|---|
| `repository-program` | `fixedPrefix`はempty、`remainder`はcomplete `MatcherSelector.segments`と等しく、そのprogramが表すbounded directory enumerationだけでmatchする | `[]` |
| `global-exact` | 全matcher segmentが`kind: literal`。`fixedPrefix`はterminal regular-file targetを含む全literal valueのnon-empty array、`remainder`はempty | `fixedPrefix.length === 1`なら`['selector-root-recheck', 'selector-exact-target-discovery']`、それ以外は`['selector-root-recheck', 'selector-fixed-prefix-discovery', 'selector-exact-target-discovery']` |
| `global-fixed-subtree` | `fixedPrefix`はfixed-subtree rootを含むnon-emptyなmaximal leading literal directory chain。`remainder`はnon-emptyな残りのsegment programでfirst segmentはnon-literal。`fixedPrefix`の各valueをliteral recordにした列と`remainder`の連結がmatcher programを正確に再現 | `['selector-root-recheck', 'selector-fixed-prefix-discovery']` |

全Global selector executionでrow 20を最初に実行し、descendant I/Oのrow 2/3より前に完了する。`global-exact`ではrow 2をfinal target以外の全`fixedPrefix` componentについてarray順にinstantiateし、row 3をfinal componentに
正確に1回instantiateする。`global-fixed-subtree`ではsubtree-root leafを含む全`fixedPrefix` componentにrow 2をinstantiateし、
row 2の全componentはそのselector executionでfresh observationとする。直ちにexpected type directoryでrows 4–7を受け、
次component operand構築前に成功しなければならない。過去のselectorのobservationを代用しない。Repository selectorはいずれのrowも
instantiateしない。Row 4–7はobserved candidate、すなわち選択済みcollision-free enumerated entry、row 2で正常観測した全immutable Global
fixed-prefix directory component、またはrow 3で正常観測したimmutable exact-file targetごとにautomaticで、`discoveryCheckpointIds`には
含めない。Row 8–19はticketごと、rows 21–24は全`opendir`前、rows 25–28はcomplete sibling collection後かつbuffer使用前にautomaticとする。Empty fixed prefix、non-maximal prefix、
literal-first subtree remainder、またはこのtableと異なるfield tupleを持つGlobal selectorはinvalidとする。このderivationだけをbuild
validation/runtimeのmode/segment-to-checkpoint mappingに使う。

### StructuralLstatCheckpointTemplate

このschemaは、rejectionを変換してよいfilesystem callの完全なmachine-readable定義である。Call siteは`lstat`を呼ぶ前に、
active `TraversalPlan`からmodule-privateなsingle-call checkpoint instanceを取得しなければならない。Instanceはtemplate ID、exact
phase、exact target role、owning root contextまたはadmission前root operation、該当するselector/ticket、raw target identity、
occurrenceへbindする。`lstat`がreturn/rejectのどちらでもconsumeし、再利用、serialize、callerによるsynthesize、または
`open`、`read`、`opendir`、`realpath`、`FileHandle.stat`へのtransferを許可しない。

| Field | Type | Rule |
|---|---|---|
| `checkpointId` | closed literal ID | 下記catalog rowの正確に1つ |
| `phase` | `root-admission \| selector-discovery \| enumerated-admission \| pre-directory-open \| post-directory-enumeration \| pre-open \| pre-read \| post-read` | Exact algorithmic call site。Generic verification phaseなし |
| `targetRole` | `lexical-root-component \| selector-fixed-prefix \| selector-exact-target \| admitted-root \| admitted-ancestor \| directory-to-open-first \| directory-to-open-repeat \| enumerated-directory-first \| enumerated-directory-repeat \| observed-candidate-first \| observed-candidate-repeat \| ticketed-candidate-first \| ticketed-candidate-repeat` | Instanceがspelling/identityをbindするexact structural object |
| `observation` | `pre-observation \| post-observation` | Catalogで固定し、error message/current filesystem stateから推測しない |
| `operation` | literal `lstat` | 他operationは表現不能 |
| `onExactEnoent` | `absent \| entry-disappeared` | `error.code === 'ENOENT'`だけに返す唯一outcome。Observationで固定 |
| `readAuthority` | literal `false` | Checkpoint resultはopen/readを認可しない |
| `multiplicity` | `per-root-component \| per-selector-execution \| per-selector-prefix-component \| per-target \| per-observed-candidate \| per-observed-ancestor \| per-directory-open \| per-directory-open-ancestor \| per-directory-enumeration \| per-directory-enumeration-ancestor \| per-ticket-and-phase` | Bound plan/ticketが要求するoccurrenceだけをruntimeでinstantiate可能 |

Ordered catalogは次の正確な内容とする。

| Order / checkpoint ID | Phase | Target role | Observation / exact-`ENOENT` outcome | Multiplicity |
|---|---|---|---|---|
| 1 `root-admission-component` | `root-admission` | `lexical-root-component` | `pre-observation` / `absent` | Parsed anchorに1回、続いてlexical componentごとにexact platform operandでroot-to-leaf |
| 2 `selector-fixed-prefix-discovery` | `selector-discovery` | `selector-fixed-prefix` | `pre-observation` / `absent` | 過去のselectorが観測済みかを問わず、各selector executionのplan宣言済みfixed-prefix componentごと |
| 3 `selector-exact-target-discovery` | `selector-discovery` | `selector-exact-target` | `pre-observation` / `absent` | 試行するexact static targetごとに1回。Codex primary/fallback absence checkpoint |
| 4 `enumerated-admission-root-recheck` | `enumerated-admission` | `admitted-root` | `post-observation` / `entry-disappeared` | Observed candidateごとに1回 |
| 5 `enumerated-admission-ancestor-recheck` | `enumerated-admission` | `admitted-ancestor` | `post-observation` / `entry-disappeared` | Admitted ancestor/observed candidateごとにroot-to-leaf |
| 6 `enumerated-admission-candidate-first` | `enumerated-admission` | `observed-candidate-first` | `post-observation` / `entry-disappeared` | Candidate `realpath`前にobserved candidateごとに1回 |
| 7 `enumerated-admission-candidate-repeat` | `enumerated-admission` | `observed-candidate-repeat` | `post-observation` / `entry-disappeared` | Candidate `realpath`後にobserved candidateごとに1回 |
| 8 `pre-open-root-recheck` | `pre-open` | `admitted-root` | `post-observation` / `entry-disappeared` | Ticketごとに1回 |
| 9 `pre-open-ancestor-recheck` | `pre-open` | `admitted-ancestor` | `post-observation` / `entry-disappeared` | Admitted ancestor/ticketごとにroot-to-leaf |
| 10 `pre-open-candidate-first` | `pre-open` | `ticketed-candidate-first` | `post-observation` / `entry-disappeared` | Candidate `realpath`前にticketごとに1回 |
| 11 `pre-open-candidate-repeat` | `pre-open` | `ticketed-candidate-repeat` | `post-observation` / `entry-disappeared` | Candidate `realpath`後にticketごとに1回 |
| 12 `pre-read-root-recheck` | `pre-read` | `admitted-root` | `post-observation` / `entry-disappeared` | Ticketごとに1回 |
| 13 `pre-read-ancestor-recheck` | `pre-read` | `admitted-ancestor` | `post-observation` / `entry-disappeared` | Admitted ancestor/ticketごとにroot-to-leaf |
| 14 `pre-read-candidate-first` | `pre-read` | `ticketed-candidate-first` | `post-observation` / `entry-disappeared` | Candidate `realpath`前にticketごとに1回 |
| 15 `pre-read-candidate-repeat` | `pre-read` | `ticketed-candidate-repeat` | `post-observation` / `entry-disappeared` | Candidate `realpath`後にticketごとに1回 |
| 16 `post-read-root-recheck` | `post-read` | `admitted-root` | `post-observation` / `entry-disappeared` | Ticketごとに1回 |
| 17 `post-read-ancestor-recheck` | `post-read` | `admitted-ancestor` | `post-observation` / `entry-disappeared` | Admitted ancestor/ticketごとにroot-to-leaf |
| 18 `post-read-candidate-first` | `post-read` | `ticketed-candidate-first` | `post-observation` / `entry-disappeared` | Candidate `realpath`前にticketごとに1回 |
| 19 `post-read-candidate-repeat` | `post-read` | `ticketed-candidate-repeat` | `post-observation` / `entry-disappeared` | Candidate `realpath`後にticketごとに1回 |
| 20 `selector-root-recheck` | `selector-discovery` | `admitted-root` | `post-observation` / `entry-disappeared` | 全Global selector execution開始時にrow 2/3より前に1回 |
| 21 `pre-directory-open-root-recheck` | `pre-directory-open` | `admitted-root` | `post-observation` / `entry-disappeared` | 全`opendir`前に1回。Source root自体ではこれがcomplete pre-open sequence |
| 22 `pre-directory-open-ancestor-recheck` | `pre-directory-open` | `admitted-ancestor` | `post-observation` / `entry-disappeared` | Rootより下かつopen対象directoryより上の全admitted directory ancestorをroot-to-leaf |
| 23 `pre-directory-open-target-first` | `pre-directory-open` | `directory-to-open-first` | `post-observation` / `entry-disappeared` | Non-root open対象directoryについてexact-platform `realpath`前に1回 |
| 24 `pre-directory-open-target-repeat` | `pre-directory-open` | `directory-to-open-repeat` | `post-observation` / `entry-disappeared` | Non-root open対象directoryについてexact-platform `realpath`後かつ`opendir`前に1回 |
| 25 `post-directory-enumeration-root-recheck` | `post-directory-enumeration` | `admitted-root` | `post-observation` / `entry-disappeared` | Complete sibling collection後かつ使用前に1回。Source-root enumerationではcomplete post-enumeration sequence |
| 26 `post-directory-enumeration-ancestor-recheck` | `post-directory-enumeration` | `admitted-ancestor` | `post-observation` / `entry-disappeared` | Rootより下かつenumerated directoryより上の全admitted directory ancestorをroot-to-leaf |
| 27 `post-directory-enumeration-target-first` | `post-directory-enumeration` | `enumerated-directory-first` | `post-observation` / `entry-disappeared` | Non-root enumerated directoryのexact-platform `realpath`前に1回 |
| 28 `post-directory-enumeration-target-repeat` | `post-directory-enumeration` | `enumerated-directory-repeat` | `post-observation` / `entry-disappeared` | Non-root enumerated directoryのexact-platform `realpath`後かつ`fs.Dir` close確認前に1回 |

Compilerはこのexact catalogと各selectorのexact discovery referenceをemitする。`safe-fs.ts`だけがdynamicな
per-component/per-entry/per-ticket occurrenceをinstantiateする。Table number順はimmutable schema orderで、global chronological runではない。
各Global selectorではrow 20がrow 2/3に先行し、全`opendir`直前にrow 21、ancestor順row 22、row 23、exact-platform `realpath`、row 24を完了する。
Registry登録済み`fs.Dir`をexplicit `Dir.read()`がnullを返すまでdriveし、openのままrow 25、ancestor順row 26、row 27、exact-platform
`realpath`、row 28を完了する。Registry helperが`close-confirmed`に達するまでsibling bufferのclassify、descent、ticket発行を禁止する。
Source rootではrows 21/25だけを使う。先行`lstat`の成功を使って、後続`opendir`、`open`、`read`、
`realpath`、handle operationへcheckpointを再利用できない。宣言外call、phase/role/target mismatch、consume済みtoken、
non-`ENOENT` code、または別operationのnon-carveout rejectionは変更せずpropagateする。Event-confirmed-close observationは代わりに
既にconfirm済みのsuccessful close lifecycleだけを維持する。`codex-global-first-non-empty`では、primary selectorのrow 3だけが
`absent`を返してfallbackへ進める。Unsafe/binary outcomeまたはその他のnon-carveout rejectionは別記どおりbranchを終了する。

Post-observation `entry-disappeared`では、root-role row 4/8/12/16/20/21/25をpathless source-fatal `safe-fs-root-stale`、ancestor-role row
5/9/13/17/22/26をpathless source-fatal `safe-fs-ancestor-stale`へmapする。`CustomizationFile`、generation、contracted-partial resultを作らない。
Pre-ticket candidate row 6/7では、expected directoryをprospective shared ancestorとしてpathless source-fatal `safe-fs-ancestor-stale`へmapする。一方expected terminal
regular fileは後述のcoherent attempt-local file identityを既に持つため、contracted-partial rule下でfile-scoped `safe-fs-entry-stale`と
`readState: stale`へmapする。Ticket発行済みcandidate row 10/11、14/15、18/19も同じfile-scoped code/stateへmapする。Directory-to-open row
23/24とenumerated-directory row 27/28はpathless source-fatal `safe-fs-ancestor-stale`へmapする。
その他のrole-to-code mappingはinvalidとする。

全observationは`expectedType: directory | regular-file`もbindする。Root component、admitted ancestor、fixed-subtree leaf、derived intermediate
segment、nonterminal matcher stepは`directory`を期待し、rows 6/7のdescent前を含む全non-root directory observationは
`ownerKind: shared-ancestor-lifecycle`を使う。Terminal file candidateだけは`regular-file`を期待する。Returned symbolic link/detectable reparse
linkは`safe-fs-link-rejected`へmapする。正常returnされたdirectory/device/socket/pipe/その他non-link typeが`expectedType`と異なれば
`safe-fs-type-rejected`、unusable/ambiguous type metadataなら`safe-fs-boundary-unverifiable`へmapし、metadata operationのthrow/rejectionは
propagateする。Root/shared ancestor/directory observationではpathless source-fatal lifecycle outcomeとなり、descent/ticket/generationは0。
Observed terminal fileではserviceがread authorityなしのattempt-local coherent source/file/path identityを先にbindするため、linkは
`readState: unsafe-link`、non-link type mismatchは`readState: boundary-rejected`だけをcontracted-partial rule下でcommitできる。Ticket/open/byteは
得ない。その他のexpected/actual-type mappingはinvalidとする。

Exact-`ENOENT`処理後、正常returnされた全verification recordを次のfirst-match順でclassifyする。Selector-root、enumerated-admission、
pre-directory-open、post-directory-enumeration、pre-open、pre-read、post-readでorderは同じであり、phaseが変えるのはcheck時点であってcodeではない。

| Priority / failed check | Exact code | Terminal-file read state | Root/ancestor/directory outcome |
|---|---|---|---|
| 1 required identity/type/canonical fieldがabsent、malformed、ambiguous、unusable | `safe-fs-boundary-unverifiable` | `boundary-rejected` | Pathless source-fatal |
| 2 detectable symbolic/reparse link | `safe-fs-link-rejected` | `unsafe-link` | Pathless source-fatal |
| 3 returned non-link typeが`expectedType`と不一致 | `safe-fs-type-rejected` | `boundary-rejected` | Pathless source-fatal |
| 4 parsed canonical anchor/componentまたはcontainmentがadmit済みexact vectorと不一致 | `safe-fs-boundary-unverifiable` | `boundary-rejected` | Pathless source-fatal |
| 5 `dev`がbound snapshot/handleと不一致 | `safe-fs-device-changed` | `stale` | Pathless source-fatal |
| 6 `ino`不一致、またはpath identityとsole open handleが不一致 | `safe-fs-race-detected` | `stale` | Pathless source-fatal |
| 7 non-type mode bit不一致。Terminal fileではsize、`mtimeNs`、`ctimeNs`、`nlink`不一致、directoryではbound pre-open/post-enumeration snapshot間の`mtimeNs`または`ctimeNs`不一致も含む | `safe-fs-file-metadata-changed` | `stale` | Pathless source-fatal |

1 rowがmatchしたらそのobservationのevaluateを停止し、lower-priority codeを追加emitしない。Terminal fileはcoherent file ownerを使いcontracted
partialにだけ参加でき、その他roleはsource lifecycle ownerを使いgenerationをpublishしない。Root-admission canonical spelling inequalityは
先行special outcome `safe-fs-root-rejected`のままとする。全read/post-read check成功後、NUL byteは正確に`readState: binary`、
`encoding: binary`、file-scoped `file-content-binary`へmapし、safe-fs race codeにはしない。

Derived candidateはselector-discovery row 2/3をinstantiateしない。Complete derived pathにcollision-free enumeration recordが既にあれば、
derivationはそのrecordとexisting admission sequence/ticketを再利用する。なければ中央集約serviceだけがtyped targeted enumerationを行う。
Admit済みprogram baseから開始し、現在のadmit済みdirectoryについてrows 21–24を完了した後だけopenしてcomplete sibling name setを取得する。
そのsetをinspectする前にrows 25–28を完了し、registry登録済み`fs.Dir`の`close-confirmed`を要求してから、platform-independent classificationが
次のvalidated program segmentと一致するunique raw entryを選ぶ。新しく選んだ各`Dirent`をobserved candidateとし、directory descentまたは
ticket発行前にrow 4–7 sequenceを正確に1回実行する。選ばれなかったsiblingへ`lstat`、`realpath`、open、readを行わない。Exact
classificationがなければdirectory enumeration後のdeterministic miss、relevant name不正またはclassification collisionならowning Source-fatal
filename outcomeとする。Interpreterはprogramのexact segment sequence外をenumerateできず、derived provenanceは別enumerationをseedできない。
Global exact targetではrow 3成功がexact 1つのimmutable targeted-file
observationを作り、ticket発行前に正確に1回のrow 4–7 sequenceを続ける。Fixed subtreeではfinal row 2成功がexact 1つの
immutable targeted-directory observationを作り、row 4–7がexpected type directoryをbindした後、`opendir`直前にrows 21–24でdirectory guardを再実行する。
Rows 25–28とconfirmed closeが完了するまでreturned setを使用しない。Enumerated entryでは
sibling completion/collision解決後、ticket発行またはdirectory descent前に正確に1回のrow 4–7 sequenceを行う。

Repository planはselector programが明示するbroad traversalを実行できるが、rows 21–28で全directory enumerationのopen/read/close sequence前後をguardする。Global planはhome rootの`opendir`から
開始せず、fixed selector I/O前にrow 20でrootをguardする。Exact targetはfixed ancestor/targetだけをtargeted `lstat`/verifyし、fixed subtreeはそのsubtreeと許可済み
descendantだけを`opendir`できる。Missing targetからsibling discoveryへ広げず、planにない隣接pathへの`opendir`、
`lstat`、`realpath`、open、read callは0とする。`GlobalConsentPreview.pathPatterns`はこのexact selectorからrenderし、
digestはschema version、selection policy、canonical programをbindする。

`codex-global-first-non-empty`はproject所有のclosed scheduler branchであり、authored logicではない。最初に
`AGENTS.override.md`だけを安全にprobeする。安全にreadできたnon-empty overrideを唯一のfileとしてpublishし、
`AGENTS.md`へ一切operationせずshort-circuitする。Overrideがabsentまたは安全にreadできてemptyの場合だけ、exact
`AGENTS.md` targetへ進む。そこで安全にreadできたnon-empty regular fileをpublishし、それ以外はCodex instruction
fileをpublishしない。Emptyはoptionalな先頭UTF-8 BOMを除いたdecoded stringについて
`String.prototype.trim().length === 0`であることを意味し、whitespace-only fileはemptyとする。Present candidateが決定的な
unsafeまたはbinary outcomeならsafe diagnostic付きでselectionを終了し、後続selectorをinspectしない。
`utf-8-replaced` stringはこのpolicyでは通常のdecoded textであり、`U+FFFD`はwhitespaceではないためreplacement byteがあれば
non-emptyになる。Event-confirmed-close observationは既にconfirm済みのsuccessful close lifecycleだけを維持し、fallbackを選択しない。
Non-carveoutなthrowまたはrejectされたprobeはdomain catch/fallbackなしでpropagateする。`absent`はadmit済みrootのverificationが
維持された状態でexact targetの`lstat`が明示的not-foundを返した場合だけとする。Permission、type、metadata、ancestor/root、
canonicalization、その他全error、および最初の観測後にtargetが消えたcaseはabsenceではなくfailureとする。したがってempty判定では
first targetを安全にreadする場合があるが、planがpublishするreadable customization fileは最大1件で、unrepresented neighbor
pathへtouchしない。このbranchはfallback authorityがdecoded primary contentに依存するため、唯一のstatic-discovery例外とする。
Empty overrideを既にconsumeし、後からadmitしたfallbackが同じusable `(dev, ino)` identityを持つ場合、fallbackのopen/readは0で、
alias/provenanceとしてmergeしない。Attemptは`readState: boundary-rejected`とfile-scoped
`safe-fs-ordered-fallback-alias-rejected`を持つdiagnostic-only fallback `CustomizationFile`をemitし、contracted-partialとする。
Empty override probeはpublishしない。そのbyte再利用、group再open、fallbackのsilent omissionを禁止する。

### DerivationProgram

`DerivationProgram`は、独立して受理したstatic provenanceをderived read candidateへ変換できる唯一のprogramで
ある。Executable registry contentではなくimmutableなclosed discriminated unionとする。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown versionはregistry loadをfailure |
| `variant` | `marketplace-local-plugin \| codex-fallback-basename \| codex-skill-metadata` | Project所有interpreter branchを1つ選択 |
| `seedRuleId` / `seedKind` | 正確な1 static rule ID / kind | Owning static `CandidateProvenance`とrecognitionの両方に一致 |
| `declarationFieldId` | closed field IDまたはliteral `matched-path` | Exact allowlisted source occurrence。`matched-path`はlocation-derived skill-metadata ruleだけ |
| `syntaxVariants` | non-empty closed enum[] | Listed JSON/JSONC/TOML/frontmatter shapeだけ。Authored keyでcodeを選ばない |
| `base` | `seed-matched-path-parent \| source-root` | Exact seed provenanceからresolveし、別alias/provenanceやambient pathを使わない |
| `placement` | `at-base \| ancestor-chain-through-seed-owner` | Ancestor-chain formはCodex fallback basenameだけで、seedのcollision-free pathとsource rootに制約される |
| `prefixPolicy` | `none \| optional-dot-slash \| required-dot-slash` | 個別segment validation前に適用 |
| `fixedSuffixAlternatives` | non-empty orderedな`NonEmptyMatcherLiteralSegment[]`のarray | Extracted segment後にappendするregistry constant。Inner arrayがemptyでよいのは`codex-fallback-basename`だけ。Authored suffix/free-form joinなし |
| `suffixSelectionPolicy` | literal `first-present-exact` | Placementごとにregistry orderでalternativeを試す。Exact classification欠落だけが次へ進み、最初に観測したpathは後続safe/type/read/parse outcomeにかかわらずalternative列を停止 |

Closedなinitial mappingは次のとおり。

| Derived rule | Variantとexact seed | Declaration/syntax | Baseとconstruction |
|---|---|---|---|
| `copilot.derived.local-plugin-manifest` | `marketplace-local-plugin`; `copilot.repo.marketplace`、kind `marketplace` | `marketplace.plugin.source`; plain stringまたはobject `source.path`; optional `./` | Seed matched-path parent。Validated relative-path segmentごとにauthored-segment tokenを1つemitし、`.plugin/plugin.json`、`plugin.json`、`.github/plugin/plugin.json`、`.claude-plugin/plugin.json`の1つをappend |
| `claude.derived.local-plugin-manifest` | `marketplace-local-plugin`; `claude.repo.marketplace`、kind `marketplace` | Same field; plain stringまたはobject `source.path`; required `./` | Seed matched-path parent。Validated authored segmentと固定`.claude-plugin/plugin.json` |
| `codex.derived.local-plugin-manifest` | `marketplace-local-plugin`; `codex.repo.marketplace`、kind `marketplace` | Same field; plain stringまたはobject `source.path`; required `./` | Seed matched-path parent。Validated authored segmentと固定`.codex-plugin/plugin.json` |
| `codex.derived.fallback-basename` | `codex-fallback-basename`; `codex.repo.config`、kind `settings/config` | `codex.config.project-doc-fallback-filename`; TOML string-array basenameだけ | Source root。Source rootからseedの`.codex` directoryのexact parentまでの固定ancestor chainの各位置でvalidated basename 1 segmentをroot-to-narrow順に配置 |
| `codex.derived.skill-metadata` | `codex-skill-metadata`; `codex.repo.skill`、kind `skill` | `matched-path`; authored declarationなし | Seed matched-path parent。固定`agents/openai.yaml` |

Marketplace extractionはdocumented local relative pathをindividual segmentへdecodeし、各emitted segmentは
fixed suffixを検討する前に同じNFC collision、Windows-special、alias、containment grammarへ合格しなければならない。
Callback、function pointer、arbitrary `path.join` recipe、free-form expression、glob、regular expression、recursive
derivationは表現不能とする。Variant/mapping追加にはcontract version変更とbilingual fixtureが必要である。

Authored-path tokenizerは1つのclosed pure algorithmである。Programのexact `ExtractedSourceOccurrence`のsemantic stringだけをconsumeし、
display literalをtokenizeせず、environment reference展開、percent/URL decode、URI decode、home marker resolve、platform path API適用を行わない。
`optional-dot-slash`は先頭のexact U+002E U+002F pairを最大1回stripし、`required-dot-slash`はexact 1 pairを要求してstripし、`none`は何も
stripしない。その後valueはnon-emptyで、U+002Fだけでsplitする。Leading/trailing U+002F、repeated U+002F、任意位置U+005C、first
segment先頭U+007E、任意位置U+003A、empty/`.`/`..` segment、U+0000–U+001F/U+007F、unpaired surrogate、既にNFC formと一致しない
segmentはcomplete derivationをzero target filesystem callでrejectする。Percent signその他accepted code unitはliteralのままでdecodeしない。
`codex-fallback-basename` variantは`prefixPolicy: none`で同じsingle-segment grammarを使い、exact 1 segmentを追加要求する。
Matched-path variantはauthored tokenをemitしない。

`first-present-exact`はplacementのsuffix alternativeを保存順にtyped targeted-enumeration algorithmでevaluateする。1 alternativeの任意segmentで
exact classificationが欠けた場合だけ、name enumeration以外のsibling touchなしで次alternativeへ進む。Alternative全segmentを観測した時点で
後続alternativeのfilesystem callは0となり、そのselected pathのlink/type/boundary/binary/parse/deterministic outcomeを採用する。
Event-confirmed-close observationは既にconfirm済みのsuccessful close lifecycleだけを維持し、non-carveout throw/rejectionはpropagateする。
At-base mappingはplacement 1件。`ancestor-chain-through-seed-owner`は独立認可した全placementをfixed root-to-narrow orderでemitし、
`first-present-exact`をplacementごとに適用してplacement間をcollapseしない。

### DerivedTicketAuthority

`DerivedTicketAuthority`はindependently accepted static seedからのextraction成功後に`safe-fs.ts`だけがmintするmodule-private immutable recordで
ある。Exact `DerivationProgram` reference、owning source/boundary/generation/scan ID、consumed seed ticket、seed file/provenance/rule IDと
nullable source-occurrence key、placement/suffix-alternative index、exact validated `AuthoredSegmentToken[]`、selected targetのcollision-free classification
segmentを持つ。全IDは同じaccepted seed recognition/current attemptに一致する。Authorityはそのderived target 1件だけに有効で、serialize、clone、
retarget、revoke後使用、別seed化を禁止する。Source-occurrence keyはdeclaration-driven programでnon-nullかつexact extracted occurrenceへ
resolveし、`declarationFieldId: matched-path`だけはnullで、その代わりexact seed ticketとseed provenance `matchedPath`を必須とする。
各`AuthoredSegmentToken`はalready-NFC segment 1個とclosed declaration field/occurrenceを保持し、
path expression/executable operationを持たない。Derived-only ticketは`authorizingProgram`にこのrecordを持つ。Already admitted static ticketは
traversal authorityを保持し、second ticketをmintせずderived provenanceをattachする。

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
| `derivation` | `DerivationProgram`またはnull | Derived ruleだけに存在し、上記exact 5 mappingがinitial registryの全件 |
| `behaviorRefs` | sort済みbehavior ID[] | このpolicyに関連する正確なupstream lookup statement。Exclusionはreadを許可せずdocumented User behaviorを参照可能 |
| `policyRefs` | non-emptyなsort済みspecification ID[] | Surfaceを許可または意図的に除外するFR/QR clause |
| `strategyRefs` | sort済みstrategy ID[] | Order/applicabilityに使うcomposition fact。Path admissionには使わない |
| `conditionKeys` | condition-key enum[] | 適用可能性判定前に必要なruntime fact |
| `precedenceGroup` | stable stringまたはnull | 文書化されたselection/order semanticsを持つruleだけを結ぶ |
| `documentationStatus` | `DocumentationStatus` | Runtime stateではなくupstream documentationのcompleteness/consistencyを表す |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Separate upstream lifecycle claimをunique fixed orderで保持 |
| `sourceRefs` | non-empty `OfficialSourceRecord.sourceId`[] | このruleのEvidence cellに直接記載した正確なsourceで、相互検証する。参照behavior/strategyが所有するevidenceは各IDから到達可能なままとし、このregistry fieldへ暗黙copyしない |

Build/contract validatorはpackage前にunique性、field組み合わせ、selector-programのtoken/positionと
canonical-round-trip rule、exact traversal compile、参照rule ID、closed derivation mapping/acyclic性、fixtureとの
完全一致を検証する。
Runtime loaderはscan前にembedded registry schema、integrity、contract
versionを検証する。Repository提供pluginでruleを追加する機構は持たない。

### ScanGeneration

| Field | Type | Rule |
|---|---|---|
| `generation` | `GenerationNumber` | Process内でuniqueかつmonotonic。`0`はbootstrap専用 |
| `baseGeneration` | `GenerationNumber` | Bootstrapは`0`、それ以外はserialized transaction開始時の最後のcommit済みgeneration |
| `transactionKind` | `bootstrap \| repository-scan \| global-scan \| global-enable-batch \| global-disable` | Closed transaction classification |
| `scannedSourceIds` | sort済みopaque source ID[] | Repository/per-Source Global rescanでは1件、initial/retry Global batchでは1〜3件、bootstrap/disableではempty |
| `scanRequestId` | opaque ASCII stringまたはnull | Global enable batchとそれがcommitする全Sourceで共有する1 IDを含む全scan kindで必須。Bootstrap/Global disableではnull |
| `startedAt` / `finishedAt` | `UtcTimestamp` | Commit済みgenerationでは両方必須。In-flight timingは`ScanAttempt`/`ScanProgress`に属する |
| `outcome` | `complete \| partial` | `partial`は完全なtraversalとserialize可能なassembly後のFR-028対象となる決定的かつthrowしないentry-local outcomeだけを含むcontracted partialを意味する。`utf-8-replaced`はcompleteで、throw/rejectされたattemptはgenerationにしない |
| `files` | `CustomizationFile[]` | 全enabled Sourceを含み、Source、Source-relative Path、IDの順で決定的sort |
| `diagnostics` | `Diagnostic[]` | Customization sourceまたは宣言済みmetadata値を複製しない |

Generation 0はprocess開始時に同期作成し、`baseGeneration: 0`、`transactionKind: bootstrap`、emptyの
`scannedSourceIds`、nullの`scanRequestId`、等しい`startedAt`/`finishedAt`/session `createdAt`、`outcome: complete`、空の
file/diagnosticを持つ。Sessionに`StaleSourceFailure`がないため、派生する初期`snapshotState`は`current`である。
Legalなreadable baseだがRepository admission/scan成功を意味せず、session内のexact 1つのnon-authorizingなidle
Repository Sourceと共存する。自動の初回Repository scanは0から開始する。決定的なreturned failureはclosed lifecycle stateと
ともにgeneration 0をcurrentのままにできる。Non-carveoutとしてthrow/rejectされたoperationにはREST ownerがなく、application failure
representationをpublishせず、liveness保証なしでprocess top levelへ到達する。保持snapshotをstaleにできるのは、後続の
user-requested rescan failureだけである。

### StaleSourceFailure

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `sourceId` | opaque Source ID | DTO | 最新の明示rescanがfatalに失敗した、まだpublishedなSourceを1つ識別 |
| `failureRef` | `{ kind: diagnostic, diagnosticId } \| { kind: operation-error, operationErrorId }` | DTO | 正確に1つを参照。決定的にreturnされたfatal outcomeはlifecycle Diagnostic、throw/rejectされたaccepted REST jobはgeneric Operation Errorだけを使用 |
| `failedAt` | `UtcTimestamp` | DTO | Fatalな明示attemptが終了した時刻 |
| `baseGeneration` | `GenerationNumber` | DTO | Failed attemptが置換しようとした最後のcommit済みgeneration |

`StaleSourceFailure`はsession所有のlifecycle overlayであり、`ScanGeneration` fieldではない。明示的なfatal
rescanはそのSourceのentryだけを作成または置換するため、別Sourceのfailureは共存する。
Completeまたはcontracted-partial scan commitがclearするのは正常refreshしたSourceのentryと参照先Diagnostic/Operation Errorだけであり、別Sourceの
commitは無関係なentryとfailure recordをcarryする。Global disableは除去するGlobal Sourceのentryと参照先recordをclearするが、Repository
entryが残ればsessionはstaleのままとなる。Arrayがnon-emptyの間だけ`snapshotState`は
`stale-after-fatal-rescan`である。自動初回Repository failureと初回Global enable failureは、commit済みSource
graphのrefresh失敗ではないため`StaleSourceFailure` entryを作らない。決定的なreturned failureはclosed lifecycle Diagnosticを
作り得る。Startupのnon-carveout throw/rejectionはproduct failure recordを作らず、REST所有Global errorはOperation Errorだけを作る。
初回Global enableは既存entryとそこから派生するsnapshot stateもすべて保持する。
RetryのqueueはそのSourceのoperational statusを`scanning`へ変えるがentryも参照先failureもclearしない。無関係なcommitはentry、
failure reference、Sourceのfailed/scanning lifecycle overlayをcarryし、affected Sourceの正常commitだけが`ready`/`partial`へ移して
entryをresolveする。

### ScanAttempt

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `attemptId` | opaque string | internal | Serialize済みの1つの未commit transactionを識別 |
| `scanRequestId` | opaque ASCII stringまたはnull | internal | Source scanでは必須でautomatic/explicit commandごとに生成し、Source/progress/generationへcopy。Zero-I/O disableだけnull |
| `triggerOwner` | `{ kind: 'startup', operationId: null } \| { kind: 'rest', operationId: opaque ASCII string }` | internal | Automatic初回Repositoryは`startup`、explicit rescanはaccepted REST operation ID、Global batchは`GlobalEnableOperation.operationId`をcopyし、requeueもexact valueを保持 |
| `baseGeneration` | `GenerationNumber` | internal | Attempt開始時の最後にcommit済みgenerationと一致 |
| `transactionKind` / `scannedSourceIds` | `ScanGeneration`と同じclosed value | internal | Commit済みstateを変えず、要求された1 Source scanまたはatomic Global subset operationを識別 |
| `status` | `waiting \| running \| committable-complete \| committable-partial \| cleanup-only \| fatal \| cancelled` | internal | 2つのcommittable outcomeだけが次generationを作成可能。`cleanup-only`はdisable/shutdown revoke後を表しpublic stateを変更できない |
| `publicationAuthority` | `active \| revoked` | internal | Disable/shutdownはlate continuationがpublishする前に不可逆に`revoked`へ変更 |
| `workingSet` | provisional source graph、file、metadata、relationship、diagnosticまたはnull | internal | Queued中はnull。Running後は1回のatomic commitまで全Public DTOから隔離し、fatal failureまたはcancel時に破棄 |

In-flight attemptのfieldをcommit済みsnapshotへmergeせず、snapshot経由で公開しない。Contracted partial resultは、完全な
traversal、FR-028対象となる決定的かつthrowしないentry-local outcome、assembly/serialization成功、
`committable-partial`へのtransition、generation全体のatomic commit後だけ公開する。Non-carveoutなthrowまたはrejectionはscan domainでcatchせず、
domain transition/resultを作らない。Triggerを所有するouter boundaryはpublication authorityをrevokeし、cleanup可能になれば
abandoned working setを破棄し、prior snapshotを維持する。Accepted REST jobを所有する場合だけgeneric REST `OperationError`を記録する。
全accepted scan-job Operation Errorは`triggerOwner`/`scanRequestId`の両IDをcopyし、startup-owned propagationはOperation Errorを作らない。
Batch acceptance後に`GlobalEnableOperation`をunregisterしてもcopy済みownerを消さず、disableで中断したRepository requeueも保持する。

単一`ScanCoordinator`が`GlobalEnableOperation`、Repository scan、Global scan、Global-disable transactionをserializeする。
Source scanとroot admissionをconcurrent実行しない。通常source commandはFIFOとする。
Global disableはpriority barrierとして、active consent/control snapshotがある場合だけ受理時に
`globalControl.state: disabling`とempty pending/retry arrayへ変更する。Operation-local initial enableだけならinternal barrierが
drainする間も`globalControl`はnullのままとする。どちらの場合もnew Global-enable/Global-rescan commandを拒否する。Active
uncommitted transactionをabort/discardし、active/queued Global enable operationをabort/drainし、最後のqueued Global
command cancellation sweep後にzero-I/O disable transactionを次に置く。中断したRepository commandはterminal disable success後だけ
正確に1回requeueし、同じ`operationId`、`scanRequestId`、trigger owner、requested Source、queue orderを保持してexisting commandを
`waiting`へ戻し、新しいREST admissionまたはinterim success statusを作らない。Failed disable中はholdする。中断したGlobal commandはrequeueしない。Barrierがdraining/committing中の2回目のdisableは同じcompletionへjoinし、追加transactionを
作らない。Tool固有Global Source/graph、active consent record、retained admitted Global root context、`opening`/`open`/`closing`/`close-unknown`の
affected `ClosableResourceRegistry` record、running/queued Global scan/enable command、retained disable failureが何もなくregistryがpoisonedでない場合、
無関係なRepository workの有無にかかわらずdisableは即時no-opとする。Unrelated poisonがあれば代わりに`409 resource-cleanup-restart-required`を返す。
Transactionはその時点のgeneration Nから開始する。Unchanged source graphをcarry forwardし、1つのscanned Source replacement、
またはGlobal admitted subset全体を別に構築する。Completeまたはcontracted-partial resultだけが正確にN+1としてatomic commitされる。その時点で全sourceが
N+1を報告し、unchanged sourceを含む全file/recognition/provenance/relationship IDを再生成する。新snapshotは
正常scanした各Sourceの`StaleSourceFailure`と参照先failureだけをclearし、別Sourceの両方をcarryしてgeneration
scopeのcomparison/editor stateをclearする。`remove-active-state` Global-disable transactionは同じN+1 commit ruleでtool固有Global graphとその
stale-failure entry/diagnostic pairをfilesystem I/Oなしにすべて除き、無関係なRepository pairを残す。`cleanup-only` disableはoperation-local/
frozen control resourceだけをremoveし、Nと全generation-owned IDを維持してからheld Repository commandをreleaseする。

決定的なfatal attemptは`ScanGeneration`を作成もpartial mergeもせず、provisional partial resultを含む
`workingSet`全体を破棄する。N、全prior ID、全commit済みcontentを表示したまま保持する。Attemptが明示rescanの
場合に限りsession overlayでそのSourceの`StaleSourceFailure`と実行可能lifecycle Diagnosticを作成または
置換し、別Sourceのfailureを保持する。Automatic failure後の最初のexplicit Repository rescanなら、terminal transitionは
`repositoryFailureDiagnosticId`とold `repository`-owned Diagnosticもremoveし、new stale entryが参照するdeterministic
`published-source:<sourceId>` Diagnosticまたはaccepted-job Operation Errorを同じatomic overlay updateで作る。自動の初回Repository scanのfatal failureではbootstrap generation 0をcurrentのままにする。
初回Global enableのfatal failureではmissing tool用の`StaleSourceFailure` entryを追加せず、そのtoolのkey別
failure diagnosticを作成/置換して既存entryとそこから派生するsnapshot stateをすべて保持する。自動初回Repository failureも
Repository failure recordを使い、どちらもnew inventoryをcommitしなかったことを報告する。Global-disable barrierに
よるexpected cancellationはfailure diagnosticをemitしない。それ以外の決定的にreturnされたsafe failureはout-of-generation
session-lifecycle Diagnosticとする。そのattachment scopeは後述の`Diagnostic` ruleに従い、file scopeでは
`sourceId`、`fileId`、Source-relative Pathを一緒に持つが、source/session scopeではfile IDやpathを捏造しない。
Customization source valueを含めず、`Source.diagnosticIds`へ入れない。Coordinatorは次のqueued transactionを
still-current Nから開始する。後続のaffected Sourceに対するcompleteまたはcontracted-partial正常scanがNをN+1へ
置換してそのentryとfailure referenceだけをclearし、別Sourceのcommitでは両方を未解決のまま保つ。Non-carveout throw/rejectionはこの
domain classificationをbypassし、`OperationError`の記述どおりにだけ処理する。Accepted explicit rescanはDiagnosticではなく
そのOperation Errorを参照する同じstale overlayを作成しなければならず（MUST）、pre-acceptance failureはoverlayを作らない。1 sourceあたりrunning/queued
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
| `visitedEntries` | non-negative safe integer | Bound済みtraversal/targeted-enumeration planがnameを観測したexact directory entry数 |
| `candidateFiles` | non-negative safe integer | Row 4–7でadmitしたcollision-free file candidate数。Hard-link aliasはadmit pathごとにcount |
| `readBytes` | non-negative safe integer | 完了readが返した現在までのbyte数。後でbinary分類またはdeterministic post-read raceによりdiscardしたbyteも含む |
| `diagnosticCount` | non-negative safe integer | 現attemptで蓄積したdeterministic diagnostic数。Lifecycle `OperationError`は除外 |

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
phaseだけ`cancelling`へ変える。Single disable commit後に全Global Sourceを除去する。中断Repository commandは
`phase: waiting`、requeue時のnon-null `queuedAt`、null `startedAt`、元の`scanRequestId`で再表示する。Joinしたdisable
requestは全valueを再利用し、別progress recordを作らない。
Fence active中、これらSource/progress transitionはcleanup-overlay stateだけであり、`GlobalFenceRecoverySnapshot`は一切公開しない。

4 counterはactive work開始時にzeroで、1 attempt内ではmonotonic non-decreasingとし、`complete` progressにfinal valueを保持する。
Waiting progressはzero counterを公開する。`cancelling`へのtransition時に最後にpublishしたcounterをfreezeし、cleanup activityではincrementしない。
中断Repository commandのrequeueはrequest IDを維持するが、work再開時のnew attemptはcounterをzeroから開始するため、monotonicityはその
requeue boundaryを跨がない。全valueはJavaScript safe integerでなければならず、次のexact countを表現できなければsaturate/wrapせず、
所有するruntime/REST error ruleに従ってpropagateする。

### CustomizationFile

| Field | Type | 公開範囲 | Rule |
|---|---|---|---|
| `fileId` | 128-bit、22-character base64url opaque string | DTO | Generationごとに新規。APIはpathを受け付けない |
| `sourceId` | opaque string | DTO | 1つのenabled Sourceを識別 |
| `boundaryId` | opaque string | internal | FileをそのSourceの唯一のboundaryへbindし、serializeしない |
| `sourceRelativePath` | `SourceRelativePath` | DTO | 所有Source rootからのprimary表示・filter path |
| `aliasSourceRelativePaths` | `SourceRelativePath[]` | DTO | 同じSourceにある別allowlist対象hard-link pathをsort済みで保持。Symlinkはaliasにしない |
| `identity` | `VerifiedReadReceipt`のfile-handle identityまたはnull | internal | Verified-byte outcomeだけにあり、alias/race detection専用。Durableとみなさない |
| `verifiedReadReceipt` | `VerifiedReadReceipt`またはnull | internal | 受理済み`readable`または`binary` fileだけにあり、serializeしない |
| `readState` | file read-state enum | DTO | 後述 |
| `parseSummary` | `not-applicable \| all-parsed \| mixed \| all-failed` | DTO | Recognition-level extraction stateのprojection。Vendor validation resultではない |
| `sizeBytes` | non-negative integerまたはnull | DTO | Verified-byte `readable`または`binary` fileのexact byte数 |
| `encoding` | `utf-8 \| utf-8-bom \| utf-8-replaced \| binary \| unknown` | DTO | NULを含まないinvalid sequenceはreplacement decode済みtextとしてreadableのまま保持 |
| `hadLeadingBom` | boolean | DTO | `sourceText` publish前に先頭UTF-8 BOMを正確に1つ記録・除去した場合だけtrue。Replacementの有無とは独立 |
| `sourceText` | stringまたはnull | DTO | Readable text fileの完全なdecoded authored source。Literal valueと環境変数参照syntaxを正確に保持し、HTMLではない |
| `contentDigest` | sessionごとのkeyed digestまたはnull | internal | Verified-byte outcomeだけにあり、再利用可能content hashを公開せずstale検出 |
| `recognitionIds` | opaque string[] | DTO | Accepted customization fileは1つ以上 |
| `relationshipIds` / `diagnosticIds` | opaque string[] | DTO | 同じgenerationを参照 |

Read stateは`readable`、`binary`、`stale`、`unsafe-link`、
`boundary-rejected`。`readable`と`binary`だけがverified-byte outcomeであり、`verifiedReadReceipt`、`identity`、`contentDigest`、
`sizeBytes`の4つはすべてnon-nullで、唯一のaccepted handle/readからderiveする。`stale`、`unsafe-link`、`boundary-rejected`ではbyteを
acceptせず、この4 fieldはnull、`encoding`は`unknown`、`sourceText`はnull、`hadLeadingBom`はfalseとする。Encodingは完了したsame-handle readがread後の全checkに成功してから割り当てる。NUL byteが1つでも
あれば`readState: binary`、`encoding: binary`、nullの`sourceText`とする。それ以外はbyte sequence全体をUTF-8 replacement
semanticsで正確に1回decodeする。先頭BOMが1つあれば`hadLeadingBom: true`として`sourceText`から除去する。BOMなしのvalid
inputは`utf-8`、BOM付きvalid inputは`utf-8-bom`、`U+FFFD`が1つでもinsertされた場合は先頭BOM除去の有無を問わず
`utf-8-replaced`とする。Replacement decodeされたtextは`readable`のままで、その文字化けしたexact `sourceText`をparsing、
display、extraction、comparisonへ渡し、それ自体を理由にgenerationをpartialにしない。Binaryだけをdiagnostic-onlyかつ
comparison不適格とする。Charset guessing、別decode、sampling、truncationは表現不能とし、このstate machineに製品固有の
byte、line、item上限を適用しない。`parseSummary`は全recognitionが`not-attempted`なら
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
| `provenances` | `CandidateProvenance[]` | 共有tool/kind解釈についてのrule/path admissionのsort済み非空set |
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
Parserはenvironment referenceをresolveしない。FR-028対象となる決定的かつthrowしないextraction failureでは、そのrecognitionの
metadata/relationship/derivation result全体を破棄してsafe diagnosticを出し、contracted partial generation内で完全なreadable
`sourceText`を維持してよい。Read、parser、Worker operationがnon-carveoutとしてthrowまたはrejectされた場合、recognizer/scan domainはcatch、
classify、retry、recoverしない。Triggerを所有するboundaryへpropagateし、そのattempt由来のrecognition、item、Diagnostic、
generation resultを作らず、REST boundaryがtriggerを所有する場合だけgenericな`OperationError`で表す。

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
| `declarationKey` | closed field/component identifierまたはnull | 任意のauthored declaration valueを複製しない |
| `seedSourceOccurrenceKey` | internal occurrence referenceまたはnull | Declaration-driven derivationではseedのexact authored occurrenceを再利用。Staticまたはfixed matched-path derivationだけnull |
| `scope` | `ScopeDescriptor` | Runtime effectivenessをevaluateせずclosedかつdisplay可能なadmission scopeを説明 |
| `evidenceAssessments` | `EvidenceAssessment[]` | この`ruleId`と1件、および全`behaviorRefs`/`strategyRefs` memberごとに正確に1件を保持し、lossy aggregateにしない。Runtime applicabilityと分離 |
| `applicability` | `ApplicabilityAssessment` | このrule/path/seed admissionだけのconditionとsummary |
| `order` | `OrderDescriptor`またはnull | このadmissionについて文書化されたbroad-to-narrow/fallback factだけ |
| `behaviorRefs` | `VendorBehaviorStatement.behaviorId`[] | Ruleからcopyし、該当surface lookup statementを示す |
| `strategyRefs` | `RuntimeCompositionStrategy.strategyId`[] | このprovenanceのorder/applicabilityで実際に考慮したstrategy |
| `sourceRefs` | `OfficialSourceRecord.sourceId`[] | 曖昧なproduct aggregateではなく、このprovenanceの正確なvalidated evidence union |

Provenanceはsource identity、`matchedPath`、`ruleId`、`seedProvenanceId`、`seedRuleId`、
`declarationKey`でdeduplicateし、同じphysical seed fileのhard-link aliasを含む2つのseed provenanceからの宣言を
まとめない。1 Source scan attempt内でStaticとderivedの両ruleで受理したfileは1回だけ読み、両entryを保持する。
全derivation provenanceは1本のtyped edgeで、別edgeのseedには
なれない。同じphysical fileの独立static provenanceは自身のtyped ruleをseedにできる。
Arrayのstable orderは`matchedPath`、`ruleId`、resolve済みnullable seed provenanceのstable
source/boundary/`matchedPath`/rule key、nullable declaration keyとする。Opaque file/provenance IDはidentityをresolve
するがsortには使わない。

独立受理済みstatic seed provenanceごとに、typed extractorはderivation `ruleId`、closed declaration
field、zero-based source occurrence順で列挙する。Validate後、seedのstable provenance key、derivation
rule、normalized target、declaration keyでdeduplicateし、最初のoccurrenceを残す。各distinct targetは
同じcandidate/safe-read checkへ進める。Known
unsatisfied/shadowed seedは何も生成せず、未解決eligible static seedはconditional candidateだけを生成し、
derived provenanceはこのalgorithmに入らない。
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
| `matching-path` | `path: SourceRelativePath`, `selectorIndex: non-negative integer` | Exact admitted pathとimmutable matcher-selector alternative |
| `declared` | `fieldId`, `occurrence` | Authored valueを複製せず1 `DeclaredMetadataEntry`を参照 |

Path fieldはprovenanceと同じSource/boundaryに属する。Stable scope keyは上記variant順、次に該当するSource-relative
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
| `evaluatedFromGeneration` | integer | Rescanを越えてfactを残さない |

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
| `fromProvenanceId` | opaque string | 必須。その`matchedPath`だけをpath-relative normalizationのbaseにする |
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
昇格させない。Typed candidate derivationは`CandidateProvenance`で表し、relationship traversalではない。
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
`authoredTarget: null`とし、UIはdocumented defaultとlabelして`normalizedTarget`を表示してよいが、
source-authored textとは表示しない。
1つのdeclared fieldがmetadata、relationship、derivationを駆動する場合、3 projectionはその1 occurrence/rangeを
参照し、distinct origin occurrence間のoverlapだけがextraction failureになる。
Opaque IDはorderに使わない。Relationshipの構築または保持中にtargetを開かず、独立したcandidate admissionだけがreadを認可できる。

### Diagnostic

| Field | Type | Rule |
|---|---|---|
| `diagnosticId` | opaque ASCII string | Server生成でgeneration/session内unique |
| `code` | stable closed code | Objective testとdocumentation linkに利用可能 |
| `severity` | `info \| warning \| error` | Vendor validationを意味しない |
| `scope` | `file \| source \| session` | 必須attachment discriminator。Generation scopeかsession-lifecycleかというlifetimeとは独立 |
| `sourceId` | optional opaque ASCII ID | `file`と`source`で必須、`session`で禁止 |
| `fileId` | optional opaque ASCII ID | `file`だけで必須、`source`と`session`で禁止 |
| `sourceRelativePath` | optionalなSource-relative Path | `file`だけで必須で、`sourceId`内の当該file pathと一致し、`source`と`session`で禁止 |
| `messageKey` | localized key | 英語・日本語messageを同等に保つ |
| `safeArgs` | JSON-safe map | Customization source、宣言済みmetadata値、comparison content、process environment値、任意exception string、outside pathなし |
| `nextStepKey` | localized key | 全errorが実用的な次actionを示す |
| `lifecycleOwnerKey` | `repository \| global:<tool> \| published-source:<sourceId> \| null` | Internalでserializeしない。全out-of-generation lifecycle Diagnosticでは必須non-null、generation-owned candidateではnullで、1つのpublic owner referenceと照合する |

Legalなattachment shapeは正確に次の3つだけである。`file`はnon-nullの`sourceId`、`fileId`、
`sourceRelativePath`を持つ。`source`はnon-nullの`sourceId`とnullのfile/path fieldを持つ。`session`は3つの
location fieldがすべてnullとなる。それ以外の組合せを持つDTOはinvalidである。Scopeはlifetimeと直交し、例えば
generation-wide deterministic assembly-outcome Diagnosticをsession scopeに、fatal rescan lifecycle recordをsource scopeにできる。

Closed diagnostic-code registryは`(code, ownerKind)`をkeyとし、severity、attachment scope、message/next-step key、argument schemaを
固定する。`ownerKind`はinternal shape discriminant、`lifecycleOwnerKey`は1 lifecycle instanceの識別子で、どちらもserializeしない。
Candidateはcode、`ownerKind`、`lifecycleOwnerKey`、scope、source/file ID、Source-relative Path、canonical safe argumentでdeduplicateし、
固定phase、lifecycle-owner semantic order（Repository、固定Global tool順、既存public Source順）、scope、Source-relative Path、rule/code、
emitter occurrence順でemitする。Opaque Source ID自体をsort orderに使わない。

Scan candidateは1つの`ScanGeneration`に属する。Commit不能なfatal scan attemptを含むout-of-generation lifecycle
candidateはsessionだけに属し、generation/Source ID listへ入れない。Authentication、malformed request、その他client起因
API errorはresponseで返すがdiagnosticとして保持しない。

Sessionはlifecycle owner keyごとにcurrentなactionable failureを最大1件保持する。Automatic Repository admission/initial-scanの
deterministic failureは`repositoryFailureDiagnosticId`から参照する。最初のexplicit rescanはrunning中そのreferenceを保持し、terminal
successならclear、deterministicまたはthrow/reject terminal failureならatomicにremoveして上記`published-source:<sourceId>` stale ownerを
作る。後続explicit outcomeは`StaleSourceFailure`だけを使う。Unpublished Global toolは`global:<tool>` control recordと`toolFailures`を使い、Source publication
成功またはGlobal disableでclearする。Published Sourceのexplicit-rescan failureは`published-source:<sourceId>`を使い、そのSourceの
`StaleSourceFailure`だけから参照する。後続terminal failureは置換し、refresh成功またはSource removalでclearする。無関係なowner
commitは保持する。全non-null public referenceは`sessionDiagnosticIds`のunique member 1件へresolveし、各lifecycle Diagnosticには
public owner referenceが正確に1つある。Diagnosticを意図的にtruncateしたりaggregate suppression recordへ
置換したりしない。Event-confirmed-close observationはこのregistryへ入れず、既にconfirm済みのsuccessful close lifecycleだけを維持する。
Non-carveoutとしてthrowまたはrejectされたoperationはこのregistryへ入れず、domainを越えてpropagateし、REST所有の場合だけ
`OperationError`で表す。決定的Diagnostic自体のretain/serializeがthrowまたはrejectした場合、そのnon-carveoutなnew failureも同じruleに従い、
attempt由来のDiagnosticまたはgenerationを一切publishしない。

Safe-filesystem subsetは正確に次のとおりとする。

| Code | Allowed `ownerKind` → serialized scope | Severity | Message key | Next-step key | `safeArgs` |
|---|---|---|---|---|---|
| `safe-fs-root-absent` | `root-lifecycle` → `session` | `error` | `diagnostic.safeFsRootAbsent` | `diagnostic.createOrRestoreConfiguredRoot` | exact `{}` |
| `safe-fs-root-rejected` | `root-lifecycle` → `session` | `error` | `diagnostic.safeFsRootRejected` | `diagnostic.correctConfiguredRoot` | exact `{}` |
| `safe-fs-root-stale` | `root-lifecycle` → `session` | `error` | `diagnostic.safeFsRootStale` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-ancestor-stale` | `shared-ancestor-lifecycle` → `session` | `error` | `diagnostic.safeFsAncestorStale` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-boundary-unverifiable` | `root-lifecycle`または`shared-ancestor-lifecycle` → `session`、`candidate-file` → `file` | `error` | `diagnostic.safeFsBoundaryUnverifiable` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-link-rejected` | `root-lifecycle`または`shared-ancestor-lifecycle` → `session`、`candidate-file` → `file` | `error` | `diagnostic.safeFsLinkRejected` | `diagnostic.replaceLinkWithRegularPath` | exact `{}` |
| `safe-fs-type-rejected` | `root-lifecycle`または`shared-ancestor-lifecycle` → `session`、`candidate-file` → `file` | `error` | `diagnostic.safeFsTypeRejected` | `diagnostic.replaceWithExpectedFilesystemType` | exact `{}` |
| `safe-fs-device-changed` | `root-lifecycle`または`shared-ancestor-lifecycle` → `session`、`candidate-file` → `file` | `error` | `diagnostic.safeFsDeviceChanged` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-entry-stale` | `candidate-file` → `file` | `error` | `diagnostic.safeFsEntryStale` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-race-detected` | `root-lifecycle`または`shared-ancestor-lifecycle` → `session`、`candidate-file` → `file` | `error` | `diagnostic.safeFsRaceDetected` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-file-metadata-changed` | `root-lifecycle`または`shared-ancestor-lifecycle` → `session`、`candidate-file` → `file` | `error` | `diagnostic.safeFsFileMetadataChanged` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-ordered-fallback-alias-rejected` | `candidate-file` → `file` | `error` | `diagnostic.safeFsOrderedFallbackAliasRejected` | `diagnostic.replaceOrderedFallbackHardLinkAndRescan` | exact `{}` |
| `safe-fs-late-derived-alias-rejected` | `candidate-file` → `file` | `error` | `diagnostic.safeFsLateDerivedAliasRejected` | `diagnostic.removeLateHardLinkAndRescan` | exact `{}` |
| `file-content-binary` | `candidate-file` → `file` | `warning` | `diagnostic.fileContentBinary` | `diagnostic.useTextCustomizationFile` | exact `{}` |
| `safe-fs-entry-name-unrepresentable` | `name-lifecycle` → `session` | `error` | `diagnostic.safeFsEntryNameUnrepresentable` | `diagnostic.correctFilesystemName` | exact `{}` |
| `safe-fs-path-normalization-collision` | `collision-lifecycle` → `session` | `error` | `diagnostic.safeFsPathNormalizationCollision` | `diagnostic.correctFilesystemName` | exact `{}` |

その他のcode/owner pairingはinvalidとする。Session-scoped lifecycle rowはvalidated `lifecycleOwnerKey`を正確に1つ持ち、affected
Global tool control、published-Source stale-failure record、または`repositoryFailureDiagnosticId`から参照される。Diagnostic自体は
Source/pathを捏造しない。File rowは
coherentなalready admitted candidate tupleを必須とする。どのrowもOS error text、outside path、filesystem handle/descriptor、source byteを
持てない。

### OperationError

`OperationError`は、RESTを所有するouter boundaryにおけるnon-carveoutなthrow/rejectされたoperationの唯一のproduct representationである。
Execution-lifecycle stateであり、`Diagnostic`、`CustomizationFile`、`ScanGeneration`、parser result、operational-log payloadではない。

| Field | Type | Rule |
|---|---|---|
| `operationErrorId` | opaque ASCII string | Server生成でexceptionからderiveしない。Retained accepted job/barrier instanceは正確に1つの`StaleSourceFailure`、`GlobalControlView.lastOperationErrorId`、または`InspectionSession.globalDisableOperationErrorId`から参照され、response-only accept前instanceはretained ownerを持たない |
| `code` | literal `operation-failed` | Cause taxonomyを持たない固定generic code |
| `messageKey` | literal `api.operationFailed` | Exception interpolationなしの固定actionable localized message |
| `nextStepKey` | literal `api.retryOrRestart` | 固定された実用的next step |
| `operationId` | opaque ASCII string | Lifecycleだけをcorrelateし、path-free operational eventにも現れ得る |
| `scanRequestId` | opaque ASCII stringまたはnull | Accept前HTTP errorまたはaccepted Global-disable barrier errorではnull。それ以外のretained accepted scan-job terminal errorでは必須で、そのjobのadmit済みIDと一致 |

以上がserialized fieldのすべてである。特にOperation Errorは`sourceId`、`fileId`、path/root/filename、`safeArgs`、
content/metadata/authored value、capability、request/response body、exception class/message/stack/cause/code、parser/system error、
runtime argument、filesystem descriptorを持たない。Accept前instanceはfailure HTTP responseで返し、
`InspectionSession.operationErrors`にはretainしない。Accepted-job instanceは正確に1つのlifecycle ownerが参照する間だけretainする。
明示Source rescanでは、そのownerはSourceの`StaleSourceFailure`であり、success、Source removal、または後続terminal failureが
clear/supersedeする。Initial/retry admitted-subset Global batchでは、そのownerは
`GlobalControlView.lastOperationErrorId`であり、same-consentの決定的retry outcomeまたはreplacement-batch acceptanceがclearし、
後続terminal batch failureがsupersedeし、Global disableがremoveする。失敗attemptのSourceが存在しないためGlobal batchは
`StaleSourceFailure`を作らない。Accepted Global-disable barrierでは`globalDisableOperationErrorId`だけがownerで、scan IDはnull、後続terminal
disable failureがsupersedeし、terminal disable successがclearする。自動startup rejectionにはREST boundary ownerがないためOperation Errorはなく、process top levelへ到達する。

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
4. Shared pure `LexicalAbsoluteRootParts` parserがabsolute spellingをrejectする場合は`invalid`。POSIX U+FFFD、empty/dot/dot-dot component、
   repeatedまたはnon-root trailing separator、および全Windows UNC/network/device/current-drive form、malformed drive form、対応するinvalid
   componentを含む。Parserはfilesystem/network I/Oを一切行わない。
5. その他は`eligible`とし、parserが受理したexact platform operandをconsent後root admissionへ引き継ぐ。

Shared parser以外のWindows reserved-name/character lexical policyを追加せず、後のNode.js/OS rejectionは通常boundary ruleに
従う。`isAbsolute`またはstate/presentation constructionのthrowはpreview REST boundaryへpropagateし、previewを作らない。
どのstepもstringをnormalizeせず、separatorを変更せず、filesystemをcallせず、別rootを黙って選ばない。

### GlobalPreviewDigestEncoding

`previewDigest`はprocessの256-bit preview keyを使うHMAC-SHA-256結果をpaddingなし43-character base64urlにした値とする。
Inputは1つのcanonical byte recordである。`u64(n)`はunsigned 8-byte big-endian integer。`string(s)`はbyte `0x53`、
`u64(s.length)`、続いてexact ECMAScript UTF-16 code unitごとの2-byte big-endianであり、lone surrogateを保持してreplacement
encodingを使わない。`array`はbyte `0x41`、`u64(elementCount)`、続いて各element。`record`はbyte `0x4f`、
`u64(fieldCount)`、続いて宣言順の各`string(fieldName)`とvalue。Integerはbyte `0x49`と`u64`、Boolean falseは
`0x42 0x00`、trueは`0x42 0x01`、enum/IDはすべて`string`を使う。このdigest schemaはnullを使わない。

Top valueはfield count 7の正確に1 recordで、field orderは`domain`（fixed value
`agent-customization-inspector/global-preview/v1`）、`sessionId`、`previewId`、`allowlistVersion`、
`traversalPlanVersion`、`entries`、`excludedRuleIds`とする。EntryはCopilot、Claude、Codex順を保ち、各recordはfield count 7で
正確に`tool`、`origin`、`lexicalRoot`、`displayRoot`、`pathPatterns`、`inputState`、`traversalPlans`の順とする。
`pathPatterns`は表示順を保つ。`traversalPlans`はunsigned UTF-8-bytewiseな`ruleId`順で、各recordはfield count 6、正確に
`ruleId`、`schemaVersion`、`boundary`（`repository`、`global-copilot`、`global-claude`、`global-codex`のいずれか）、
`selectionPolicy`、`structuralCheckpointTemplates`、`selectors`の順とする。各checkpoint templateはfield count 8で正確に
`checkpointId`、`phase`、`targetRole`、`observation`、`operation`、`onExactEnoent`、`readAuthority`、`multiplicity`の順、
各selectorはfield count 4で正確に`mode`、`fixedPrefix`、`remainder`、`discoveryCheckpointIds`の順とする。Literal matcher segmentは
field count 2で`kind: 'literal'`、`value`、one-segment matcherはfield count 2で`kind: 'one-segment'`、`suffix`、recursive matcherは
field count 1で`kind: 'recursive-directories'`だけとする。Arrayはcontract済みorderを保ち、`excludedRuleIds`はcontract済みsortを保つ。
Unknown/missing/extra field、noncanonical order、またはencoded planからround-tripしないpublic patternはpreview作成を妨げる。
Constant-time compareはdecode済み32 digest byteへ行う。Valueが正確に43 ASCII base64url characterでない、正確に32 byteへdecode
しない、または同じunpadded canonical base64urlへround-tripしない場合はcompare前にrejectする。

### OperationalEvent

Operational eventは、capability認証済みsessionの`Diagnostic` DTOおよび固定CLI presentation outputとは別entityである。
Closed schemaにはfree-form fieldが存在しない。

| Field | Type | Rule |
|---|---|---|
| `eventCode` | stable closed code | 必須。Error/message stringをembedせず固定event classを伝える |
| `sessionId` / `sourceId` / `fileId` | opaque ASCII IDまたはnull | 任意のevent identityだけ。Root、filename、pathへresolveせず併記もしない |
| `scanRequestId` / `operationId` | opaque ASCII IDまたはnull | 任意のcommand identity |

その他のfieldはすべてrejectする。特にSource-relative/absolute/canonical path、root、filename、inspected content/metadata、
authored value、capability、request/response body、parser/system error、exception string、Diagnostic argumentを含めない。
File-scoped Diagnosticはcapability認証済みsessionへ`sourceRelativePath`を公開できるが、どのprojectionもそれを
`OperationalEvent`へcopyしない。固定help/version text、単一launch-URL line、固定actionable startup warningは
operational eventではなくpresentation outputであり、それでもinspected content/path/authored valueを含めない。

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
  `acknowledged` boolean。完全なsource text、declared authored metadata、authored relationship target、comparisonの両sideは
  機密値を含み得るため、UIは最初の`FileDetail` requestまたはcomparison構築前にacknowledgementを要求する。一度acknowledge
  すれば、そのSPA documentの全authored-value surfaceを対象とし、document reloadまたはbrowser-document closeで失う。
  このclient-only stateはAPIへ送信せずread authorityを与えず、中央full-session purge pathで破棄する。Route close、selection
  replacement、file/Source removal、generation changeは対象scopeのmodelを個別にdisposeする。これらは中央
  client-data purgeではなく、読み込み済みdocumentのacknowledgementを維持してよい。
- Global disableは代わりに下記central full-session purgeを使う。Global-disable actionはrequest送信前に全inspection contentをlocal purgeする。Authenticated responseでより大きい`globalContentEpoch`または
  non-null `globalDisableInProgress`を観測した場合もrender前にidempotent purgeを繰り返す。Clientは`clientDataEpoch`をincrementし、inspection dataを
  返し得る全requestをabortし、全editor/model/comparisonをdisposeし、warning/filter stateをclearして、全Source/generation/file/detail/authored
  metadata/relationship/Diagnostic DTO/DOM textをremoveする。Disableへのjoin/retryに必要なcontrol/error projectionだけを保持できる。
  Accepted barrier failureではpurge済みcontentをrestoreせず、terminal disable successまたはprocess restart後のnew full snapshotだけからcontentを取得する。
  Barrier acceptance前にrequestがfailした場合、またはtrue no-opの場合、authenticated fresh sessionのfenceはnullであり、purge済みclientはnew full snapshotを直ちにfetchできる。
- `RecoveryViewState`: Global-disable action、liveness epoch/fence observation、hidden/page-lifecycle purgeを含む任意のcentral purge後、
  retained capabilityがfresh sessionを認証した場合に作る。採用した
  `sessionId`、fresh `globalContentEpoch`/`globalControl`/`globalEnableInProgress`/`globalDisableInProgress` projection、presentな
  `globalControl.toolFailures`が参照するexact pathless session Diagnostic、presentな`globalControl.lastOperationErrorId`が参照するgeneric
  Operation Error 1件、
  `globalDisableOperationErrorId`と参照先generic Operation Error、任意のnewly verified frozen previewだけを保持する。
  `globalDisableInProgress`がnullでnormal full snapshotをfetch可能な場合だけ**Resume inspection** actionを提示する。Controlまたは任意enableがactiveならimmediate disable、disable drain中ならjoin/wait、disable
  failedならretry-disableを提示する。Global retryはpreview検証済み、`globalEnableInProgress` null、`pendingTools` empty、`retryableTools` non-emptyの場合だけ提示する。
  Resumeはsessionを再取得して返された`sessionId`が採用済みliveness
  baselineと一致することを要求し、default filterのfresh inventory-summary viewをatomicに構築する。以前のdetail、
  comparison、editor、warning acknowledgement、authored sourceは復元せず、後でdetail/comparisonを開く場合はnew
  acknowledgementを要求する。Authentication failure時は表示済みprocess-lifetime URLを開き直すauthorization-lost
  next stepだけを残す。
- `SessionLivenessState`: 期待`sessionId`、last observed `globalContentEpoch`、同じ`clientDataEpoch`を保持する。
  Initial authorization、visible/focused pageへの復帰、明示的Resume、fresh session adoptionの場合だけcapability保護liveness routeを呼び、
  in-flight requestは最大1件とする。このsingle-flight ruleはstale responseを拒否するためstate adoptionをserializeする
  functional coordination invariantであり、resource admissionまたはvalidation ceilingではない。Polling interval、request timeout、
  retry timer、memory leaseを定義せず、request settlementはbrowser/network/runtimeが所有する。Network/runtime rejection、`401`/`403`、
  session-ID mismatchでは、session-ended viewをrenderする前に中央purgeを同期実行する。
  全Monaco editor/model/worker/subscriptionをdisposeし、comparison/notice/filter stateをclearし、全source/detail/metadata/
  diagnostic DTOとDOM textを除去してpending requestをabortし、epochをincrementして旧epochで開始したresponseを無視する。
  `visibilitychange`でhiddenになった時点、`pagehide`、
  `beforeunload`でも同じpurgeを直ちに実行し、background timerによるretentionを避ける。Visibleへ戻る場合はfreshな
  authenticated snapshotを要求し、source/detailまたはcomparisonを後で開く場合だけnew warning acknowledgementを要求する。
  Successful liveness bodyは正確に`{ sessionId, globalContentEpoch, globalDisableInProgress }`とし、3値すべてを最終publish時の1つの
  current coordinator-lock snapshotから取得する。Fence nullを要求せず、別tabがdisableを観測できるようcurrent non-null projectionも返す。Current baselineのconfirm/renderより前にgreater epochまたは
  non-null disable projectionを観測した場合、同じfull purgeを実行してgreater epochをadoptし、control-only recoveryへ入る。Older epochはrejectし、
  equal epochかつnull projectionだけがordinary baseline confirmationとなる。したがって別tabのdisableは次のlifecycle-triggered liveness checkまたは
  別のauthorized responseで観測する。Continuously visibleなidle page上のprocess lossにはproduct定義のwall-clock検出保証を設けず、
  次のobservable lifecycleまたはrequest outcomeで扱う。
  Memory-only capability自体はhidden-page purgeを越えて保持する。
  Retained capabilityでfresh snapshotを認証し、purge済みIDを保持・比較せず返された`sessionId`をnew liveness baselineとして採用する。
  `globalContentEpoch`、`globalControl`、`globalEnableInProgress`、`globalDisableInProgress`、`globalControl.toolFailures`が参照するexact pathless session Diagnostic、
  presentな`globalControl.lastOperationErrorId`が参照するgeneric Operation Error、`globalDisableOperationErrorId`と参照先generic Operation Error、
  任意のnewly verified frozen previewだけから`RecoveryViewState`を作り、その他の全fieldをinventory/detail/comparison/acknowledgement stateへ
  復元せず破棄する。`globalControl`または`globalEnableInProgress`がpreviewを識別する場合はmatching
  frozen previewを取得してからapplicable controlを再構築する。
  Authentication failureではsession-ended viewを維持する。Service worker、browser storage、HTTP cacheへcontentを
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
fixed optional readiness handshakeを`./bin.mjs`へattachする。

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

以下のtransition diagramにある`partial`はすべてclosedなpublic `contracted-partial` outcomeを意味し、provisional workや
resource-failure resultを示さない。

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
1..3 admitted root ----------> buffer-bound 202 + batchStatus(waiting/id) --> running --> 全ready/partial Sourceを含む1 atomic generation
                                                                            \-> failed（tool failureまたはOperation Error、同じID）
exact retryable subset ------> 同じbuffer-bound batch lifecycle。Lexical-ineligible controlはdisable/new previewが必要
unexpected non-carveout accept前throw/rejection --> Operation Error。Transaction由来のsubset Source/generationなし
ready/partial -- accepted per-source rescan --> scanning --> ready/partial
                                                       \-> failed/stale（own entryを作成）
failed/stale -- accepted per-source rescan --> scanning --> ready/partial（own entry + diagnosticをclear）
                                                       \-> failed/stale（own entry + diagnosticを置換）
active Global control（0..3 Source） -- disable --> disabling barrier --> inactive / 0 Source（N+1）
                                                                    \-> failed + retained error --> retry disable
initial enableだけ -- disable --> cleanup-only barrier --> inactive / 0 Source（N不変）
                                                \-> failed + retained error --> retry disable
```

Enableには一致する`GlobalConsent`が必要。Disableはcoordinator barrierを実行し、次DTO公開前にGlobal file、
generation diagnostic、control所有lifecycle diagnostic、comparison、source text、root contextをすべて削除する。
`remove-active-state`はN+1でcarried Repository entityをrekeyし、operation-local `cleanup-only`はNと全generation-owned IDを維持する。
Accept後failureは後続disable成功までbarrier/fence/errorをrecover可能なまま保持する。Lexical consent previewは`Source`ではない。Accepted enableはadmit済みtool
ごとに最大1つのSourceをcommitし、各Sourceは1 rootだけを持ち、admitted subset内の全Sourceが同じgenerationに現れる。
Applicable disable terminal commit後はすべてabsentになる。決定的なall-rejected初回enableはSource/generationをcommitせず、既存entryとそこから
派生するsnapshot stateを変更しない。Throw/rejectされたenableはREST Operation Errorだけを公開し、provisional subsetを
一切commitしない。明示的なper-source rescan失敗では、そのSourceの
以前のcommit済みgraphをreadableのまま保持しsnapshotをstaleにする。どちらでも公開済みfailed Sourceの`progress`は
nullとし、failure kindに応じて実行可能なDiagnosticまたはOperation Errorが破棄済みattemptを説明する。Fatal enable/rescanはnew graphも
partial graphもcommitしない。正確なconsentとadmit済みrootはsession control stateとして保持してretry/disableを
可能にし、どのSourceも別rootへfallbackしない。

Diagramの`current`/`stale` suffixはsession全体ではなく、そのSourceが`StaleSourceFailure`を所有するかを示す。
別Sourceの未解決entryにより、このSourceがready、partial、またはcurrentでもtop-level `snapshotState`はstaleに
なり得る。

### Customization file

```text
candidate -> readable + not-applicable/all-parsed/mixed/all-failed parse summary
                     -> 次generationでstale/removed
          -> binary
          -> unsafe-link/boundary-rejected
```

どのtransitionもsourceへwriteしない。Rescanはold file recordをin-place mutateせず新entityを作る。

## Entity横断invariant

1. Generation scopeの全DTOは1つのsessionと最後にcommit済みのgenerationに属し、置換済みgenerationのIDは
   `404 stale-resource`を返す。Fatal attemptはpublic IDを作らず、保持generationのIDを変えない。
2. BootstrapからRepository Sourceは正確に1つ存在し、そのlexical boundaryは選択済みRepository root、すなわちdefaultでは
   captureした呼び出し時のexact `process.cwd()`、指定時はそれに対してlexicalにresolveした単一の`--cwd` valueである。
   Admit済み`rootContext`を持たない場合があり、Git rootである必要はなく、labelはread authorityを与えない。
3. Globalは全新processでdisabledである。SessionはGlobal Sourceを0から3つ持ち、Copilot、Claude、Codexごとに
   最大1つとする。各Sourceはcurrent allowlistで同じtoolについてconsent済みのboundaryを正確に1つ所有する。
4. Accepted file pathは同梱したstaticまたはtyped derived ruleで許可され、safe-read checkを
   独立して満たす。Parsed valueがaccessを許可できるのはその正確なderivation ruleを満たす場合だけで、
   relationship/excluded ruleは決して許可しない。
   Authorizationは既存`ScanEntryTicket`をselectし、中央safe-filesystem layerだけがそのticketと所有active
   `InspectionRootContext`を組み合わせられる。Readable resultは文書化したpre-open、pre-read、post-read checkを
   全て通らなければならず、client path stringはcontext/ticket pairの代替にならない。Filesystem operationにはraw
   entry-name segmentだけを使い、NFC classification collisionはfail closedにする。Global traversalはconsent-bound
   `TraversalPlan`に表されたexact operationだけを行う。
5. Physical fileはSource/generationごとに1つの`CustomizationFile`とtool/kind pairごとに最大1 recognitionを持つ。
   1 Source scan attempt内でusable physical groupを1回だけconsumeし、受理済みhard-link aliasは`aliasSourceRelativePaths`で
   見えるままにし、source contentを重複しない。異なるSource、attempt、generationは独立したauthorityを持ち、各1回readし得る。
6. 全readable file DTOは完全なauthored `sourceText`を返し、返却する宣言済みmetadata値とauthored relationship targetは
   validated済みの正確なUTF-16-indexed `String.prototype.slice`とする。Documented defaultはauthored textをnull、
   originを明示する。Metadata/relationship/derivationは1 exact occurrence rangeを再利用できるが、distinct originは
   overlapできない。Comparisonはauthored sliceと`(tool, kind, fieldId, occurrence)`を使い、semantic decode後もauthored literalの差を
   保持する。Environment referenceはliteralのままでprocess environmentのlookup/substitutionを
   起こさない。Capability認証済みDiagnosticはactionable location fieldだけを持てる。Operational eventは
   fixed code/opaque IDだけを持ち、path、root、filename、inspected content/metadata、authored value、capability、body、
   raw error、exception string、Diagnostic argumentを一切含めない。
7. Documentation status、authored/installed state、selection、trust、enablement、その他condition factを
   provenance固有かつ直交したまま保ち、「effective configuration」やlossyなrecognition-level winnerへ
   まとめない。
8. Typed derivationはderived provenanceごとに厳密に1 closed `DerivationProgram` edgeであり、generic relationshipとderived
   provenanceをseedにしない。Physical fileがderived provenanceも持つ場合でも、独立static provenanceは
   eligibleなままとする。
9. File起点relationshipは1つのrecognitionとcandidate provenanceを指定し、そのprovenanceの
   `matchedPath`だけをrelative targetのbaseに使う。
10. Resource capacityはNode.js、parser library、browser、OS、filesystem、実行環境から継承する。Inspector固有の
    byte/count/depth/worker/queue/deadline上限を定義せず、environment capacity failureをcustomization validity verdictへ変えない。
11. Browser editor modelはopaqueなin-memory identityを使い、filesystem/remote URLを使わず、active routeと
   generationを越えてsourceを保持しない。Source/comparison surfaceはauthored content表示前にsessionの
   sensitive-content noticeを提示してin-memory acknowledgementを受け取ってから、同梱SPAがdetail contentをrequestまたは
   comparisonを構築する。API access boundaryはacknowledgementではなくcapability authenticationであり、APIは
   acknowledgementを受信も永続化もしない。Lifecycle-triggered liveness checkと中央purgeは、browser/network/runtime failure、
   authorization/session mismatch、hidden/page lifecycle eventによってsession lossを観測した時点でapplication保持session contentをすべて除去し、
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
14. `snapshotState`はsession所有の`staleFailures`から派生し、commit済み`ScanGeneration`へ保存せず変更にも
    使わない。各entryは1つのSourceとそのcurrentな実行可能failure reference（`Diagnostic`または`OperationError`）を識別し、
    そこから`ScanAttempt`やworking-set memberへ到達できない。そのSourceのcomplete/contracted-partial正常scanまたはSource除去だけが
    entryとreferenced failureをclearし、無関係なcommitは両方を保持する。
15. Coordinator lockは全session snapshot/file-detail envelopeのgenerationとpayloadをlinearizeする。Network deliveryが
    後になってもcapture済みpayloadをrelabelできない。Clientはadopt時にrequest token、generation、epoch、file存在を全て再確認する。
16. Global previewはraw `lexicalRoot`をprocess memoryだけに保持し、それとexact `TraversalPlan`をdigestへbindして、
    保存済みraw valueをadmissionに使う。Escaped `displayRoot`はpresentationだけで、enableはenvironment inputを再読込しない。
17. Product発行のmutation-capable filesystem operation/open flagは存在しない。Testはcontent、length、identity/link state、
    mode、mtime、ctime、observable xattr/ACLを比較する。OS-only atime changeは別に記録し、mutationもsafetyも証明しない。
18. Syntax parsing、exact authored-literal extraction、mechanical typed decoding、frozen-catalog classification、
    documented structural projectionだけを解釈operationとして許可する。DTO/internal projectionはnatural-languageの
    interpretation/ranking、customization validity/correctness/effectiveness/compliance/quality、policy/remediation advice、
    lint/sync/convert/format/fix behavior、size-based valid/invalid verdictを表現できない。
19. Coordinatorはscanとroot admissionをserializeする。Global disableはpublication authorityをrevokeするpriority barrierであり、
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
