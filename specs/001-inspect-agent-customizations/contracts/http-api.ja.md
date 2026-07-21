# Contract: Local HTTP API

[English](http-api.md)

**API version**: 1
**Base path**: `/api/v1`
**Transport**: Loopback HTTP上のJSONだけ

このAPIはstatic Nuxt SPAを同じprocessのNode inspection hostへ接続する。Public network APIではない。
Opaque IDとclosed commandだけを受け付け、filesystem path、URL、command、source text、parser option、glob、
executable contentを受け付けるendpointはない。
FR-022は、発行済みのexactな`127.0.0.1` authorityで行うbrowser/host HTTPのうち、exactな2つのclosed
internal-loopback classだけを認可する。1つ目はsession dataを含まないmanifest-listed packaged static assetとclosed
SPA-shell/client-route fallback pathに対するunauthenticatedな`GET`/`HEAD`、2つ目は以下のexact Host、method、Origin
ruleに従ってbundled SPAから宣言済み`/api/v1` routeへ送るcapability-authenticated requestである。どちらもoutbound
requestでもMCP connectionでもない。Non-loopbackまたはremote authority、unlisted path/route/method、valid session
capabilityのないAPI request、customization-selected destination、別machineへの調査content送信は禁止対象のままとする。

## Host/capability要件

1. Processは`127.0.0.1`のephemeral portへbindする。初期リリースにはhost overrideがなく、`0.0.0.0`、
   LAN address、Unix socketへbindしない。Bind前にpacked `package.json`をstrictにread/parseして、
   `engines.node`が正確に`^24.11.0 || ^26.0.0`であること、
   実行中Node.js versionがその展開compatibility range内にあること、package version、closedなstatic/server manifest、
   それらがlistする全assetを検証して、全inspected-source operationに使う中央集約したNode.js filesystem serviceを
   初期化する。Package assetがmissing、malformed、inconsistent、またはfilesystem serviceが利用不能なら、
   HTTP session開始前にfixed actionable CLI errorで終了する。Project packageとproduction dependencyのtarball
   payload内にある全authored application code/executable codeはJavaScriptとする。生成HTML shell、CSS、JSON
   manifest、documentation、license fileはdeclarativeかつnon-executableなpackage artifactとする。HTML内の
   manifest-authorized bootstrapはJavaScript executable codeのままで、後述するCSP要件に従う。Package manager生成の
   `node_modules/.bin` symlinkと`.cmd`/`.ps1` launch shimはpackage payload外の唯一の限定interop例外とする。
   各shimは、targetがaudit済みNode JavaScriptである正確な宣言済み`package.json.bin` entryに対応し、argvだけを
   forwardし、追加inputも追加application logicも持たなければならない。Undeclared、mismatch、その他unexpected shimは
   install auditをfailする。Production graph digestは各packageのname、version、integrity、package-payload digestを
   対象とし、generated shimを除外して、CI OSごとに別shim auditを行う。Project/dependency package payloadはpackage-owned
   shell helperを含めてはならない。Production closureはそれ以外にもlifecycle build/download path、native addonまたは
   binary/Wasm artifact、platform固有artifact selector、non-Node shebang、executable non-JavaScript fileを含まない。
   Development/test toolingはshipped product application codeではない。
2. Process開始時にrandom 256-bit capabilityを作り、正確な
   `http://127.0.0.1:<port>/#cap=<43-character-base64url>` URLを構築する。Browser attempt前に起動元terminalへ1回
   表示する。`--no-open`でなければproject-owned TypeScript launcherがgrammarを再検証し、
   `node:child_process.spawn`を`shell: false`、ignored stdio、固定minimal environment、固定argv、`unref()`で呼ぶ。
   macOS/Linuxのexecutableはそれぞれ正確な`/usr/bin/open`/`/usr/bin/xdg-open`とし、argvは生成済みURL 1件だけとする。
   Portable Nodeから独立したtrusted system-helper boundaryを得られないため、このreleaseではWindowsとその他platformで
   helperをspawnせず、固定manual-URL warningを出してserverを継続する。
   Closed environment allowlistはmacOSの`HOME`、`TMPDIR`、`LANG`、`LC_ALL`、またはLinuxの`HOME`、`DISPLAY`、
   `WAYLAND_DISPLAY`、`XDG_CURRENT_DESKTOP`、`DESKTOP_SESSION`、`DBUS_SESSION_BUS_ADDRESS`、
   `XDG_RUNTIME_DIR`、`LANG`、`LC_ALL`とする。
   OS helper自身がこれらambient desktop/session valueをreadしてよいが、Inspectorはそこからhandlerを選択しない。
   Allowlist済みkeyはambient platform provenanceとしてだけlaunch environmentから直接copyする。Source/preview/candidate/file
   pathをinspection stateからcopyせず、lexical一致によってprovenanceもauthorityも変えない。`BROWSER`、`NODE_OPTIONS`、
   `NODE_PATH`、その他environment value、全inspection由来value、environment由来または追加argv elementは渡さない。
   Helper missing/nonzero、spawn error、unsupported platformは固定warningだけを
   出し、serverと表示済みfallback URLを残す。
   HelperはOS default browserへ委譲するだけで、そのversionを選択も検証もしない。Spawn成功はbrowser compatibility
   evidenceではない。自動release certificationはPlaywright 1.61.1がpinする正確なrevisionを使用し、
   `--no-open`と表示URLをmanual certified-browser fallbackとする。
3. FragmentはHTTP serverへ届かない。SPAは1回だけ読み、`history.replaceState`で削除し、memory内だけに
   保持し、全`/api/v1` requestへ`Authorization: Bearer <capability>`を送る。Capabilityをcookie、query
   string、`localStorage`、`sessionStorage`、IndexedDB、service worker、その他durable/browser-managed
   storeへ書かない。そのためfragment削除後のreload/direct navigationはauthorityを持たず、SPAはAPI
   requestを行わず「表示済みlaunch URLを再度開く」ことを正確なnext stepとするsafeなauthorization-lost
   viewを示す。そのURLは同じprocessのlifetime中だけ再利用でき、fragment付き`/`へ戻す。
4. 固定help/version text、必須の起動元terminal向け1回限りlaunch line、固定actionable startup warningは
   operational eventではなくpresentation outputとする。それ以外でHostがemitするのは、data modelで定義したclosedな
   `OperationalEvent` schema、すなわちstable event codeとoptionalなopaque session/source/file/scan-request/
   operation IDだけである。Operational eventにはfree-form fieldがなく、Source-relative/absolute/
   canonical path、root、filename、inspected content/metadata、authored value、capability、request/response body、
   parser/system error、exception string、Diagnostic argumentを一切含めない。Capability認証済みのfile Diagnosticは
   必要最小限の`sourceRelativePath`を保持してよいが、その値をoperational eventへcopyしない。Hostはcapabilityを
   constant timeで比較し、header、fragment、tokenをlogに残さない。
5. 全requestに割り当て済みの正確な`Host`値を要求する。State-changing requestには正確なsame-origin
   `Origin`も要求し、API navigation/cross-site fetch metadataを拒否する。CORS headerは出力しない。
6. Bind前にhostはdata model記載のclosedな`dist/manifests/static-assets.json`と
   `dist/manifests/server-assets.json`をstrictにloadする。Hostは全listed regular assetの正確なpath、declared
   byte length、actual byte length、lowercase SHA-256をimport/bind前に検証する。Fileとmanifestの容量はNode.js、
   OS、filesystem、実行環境から継承し、製品固有のsizeまたはrecord件数上限を定義しない。Buildはrelative/external executable
   asset、executable attribute、`<base>`、nonce、malformed/unrecorded inline script、symlink、unexpected outputを
   拒否する。Nuxtのstatic-host alias `200.html`/`404.html`を要求後に除去し、HTMLは`index.html`だけを許可する。
   Static responseのrestrictive CSPは`default-src 'none'`、`script-src 'self'`とNuxt executable
   inline bootstrap用manifest内の正確な`sha256-<base64>`だけ、`script-src-attr 'none'`を使い、scriptの
   `unsafe-inline`、`unsafe-eval`、nonceを使わない。Monacoがlayout/theme styleを生成するためだけの
   `style-src 'self' 'unsafe-inline'`、`font-src 'self'`、`connect-src 'self'`、`worker-src 'self'`、
   `img-src 'self' data:`、`object-src 'none'`、`base-uri 'none'`、`form-action 'none'`、
   `frame-ancestors 'none'`を使う。Monaco workerはroot-absolute same-origin static assetとして出力するため、
   external workerと`blob:` worker sourceを許可しない。API responseには`Cache-Control: no-store`と
   `X-Content-Type-Options: nosniff`を設定する。Build verification、packed-tarball verification、runtime bootstrapは
   同じpackage/static/server integrity contractをenforceする。
7. JSON request bodyは`application/json`を使用し、文書化済みkeyだけを含み、strict manual type/enum guardを
   通過しなければならない。Transport容量は製品定義のrequest-size上限ではなくNode.jsと実行環境から継承する。

Static assetとpackaged SPA shellはsession dataを含まないためcapabilityなしで取得できる。Shellは
上記authorization-lost behaviorを実行し、token/session snapshotをembedしない。Progress、diagnostic、Global
consent previewを含む全API routeはcapabilityを必要とする。

## 共通envelope

成功response:

```json
{
  "apiVersion": 1,
  "globalContentEpoch": 4,
  "generation": 3,
  "data": {}
}
```

通常のinspection-data成功envelopeはすべて`globalContentEpoch`と`generation`を持つ。Full
`InspectionSession`では`generation`が`data.activeGeneration`と一致し、`FileDetail`では返却する全
generation-owned IDがそのexact valueに属する。Serverはepochとgenerationをcaptureしてcomplete payloadを構築し、
immutable success bodyをbindする前にsession coordinator lock下でepochが不変かつ
`globalDisableInProgress`がnullのままであることを再検証する。再検証失敗時はbodyを破棄して
`409 global-disable-pending`を返す。Lock解放後に既にbind済みのenvelopeをserialize/deliverしてよいが、ある
generationを読んで別generationのdataを構築し、後からresponseのlabelを付け替えてはならない。Disable受理前に完全に
bind済みのbodyはboundedなpre-fence-authorized responseとして残り得るが、browserはgreater epochまたはfenceを観測後に
これをrejectまたはpurgeする。

通常envelopeは、後述するexactなcontrol-only `GlobalFenceRecoverySnapshot`またはexact liveness bodyには適用しない。
どちらもgenerationまたはinspection graphを含まない。

Inspection graphを返さないpreview/command successは`{ apiVersion, globalContentEpoch, data }`を使い、envelope-level
`generation`を省略する。文書化済みresult内部のgenerationは明示的なcommand outcomeとする。これによりcontrol responseを
generation snapshotとして提示せずepoch-awareに保つ。

APIはrequest body、file、item件数、parser構造、snapshot、detail、response bodyについて製品固有の数値上限を
定義しない。容量はNode.js、parser、OS、filesystem、browser、実行環境から継承する。Atomicなscan publication commit前に
serialization/encodingがthrowまたはrejectされた場合、triggerを所有するREST boundaryへpropagateし、そのattemptのresultまたは
generationをpublishせず、以前のsnapshotを維持し、後述するgeneric Operation Errorだけを返す。Domain layerはcauseを一切
classifyしない。Hostはsuccess envelopeのcomplete UTF-8
entity-body bufferを1回だけmaterializeし、同じbufferを変更せずHTTP responseへ渡す。`Content-Length`をemitする場合はactual
buffer lengthとする。Atomic commit後にsocket writeその他のtransport deliveryが失敗した場合、commit済みoutcomeとsnapshotを
変更しない。Successful response payloadを報告せず、truncated bodyをpartial resultとして扱わず、認証済みclientがcommit済み
generationを再取得できるようにする。

Error response:

```json
{
  "apiVersion": 1,
  "error": {
    "code": "stale-resource",
    "messageKey": "api.staleResource",
    "safeArgs": {},
    "nextStepKey": "api.refreshSession"
  }
}
```

Errorにはstack trace、任意exception message、customization sourceまたはdeclared-metadata value、API
capability、参照されたprocess-environment value、enabled source外canonical pathを含めない。Literal
credentialは明示的に要求されたreadable file detailの一部としてだけ返し、errorまたはoperational logへ
copyしない。Correlation IDを返してよいが、process memory内だけに保持する。Error envelopeと認証済みDiagnosticは、
path-freeなoperational eventとは別のものとする。

REST trigger所有のnon-carveoutとしてthrowまたはrejectされたoperationでは、`error` objectはclosedな`OperationError` shapeとし、正確に
opaqueな`operationErrorId`、`code: "operation-failed"`、`messageKey: "api.operationFailed"`、`nextStepKey: "api.retryOrRestart"`、opaqueな
`operationId`、`scanRequestId`を持つ。最後のfieldはasync job accept前にはnullで、job/IDを作らない。Accepted scan jobでは
HTTP requestがすでに`202`を返しており、後のauthenticated full sessionがそのjobのnon-null `scanRequestId`を持つ同じclosed
terminal objectを公開する。Two-stage Global-disable barrierだけが例外で、accept後failureはstill-open disable POSTからnull
`scanRequestId`のerrorを返し、fenced session用にもretainする。Diagnosticでもscan resultでもない。どちらのformも`safeArgs`、source/file/path/root identity、content、exception
class/message/stack/cause/code、parser/system error、runtime argumentを持たない。Accept前HTTP statusは常に`500`とし、その
`operationErrorId`はresponse専用でsessionにretainせず、cause固有のstatusを推論しない。Retain済みaccepted scan-job errorは
exact 1つの`StaleSourceFailure`または`globalControl.lastOperationErrorId`が所有する。Accepted Global-disable errorはnull
`scanRequestId`を持ち、`globalDisableOperationErrorId`だけが所有する。後のterminal outcomeはdata model定義どおりexact ownerを
clearまたはsupersedeする。REST responseはgeneric failureとして返り、processを終了させない。Automatic startupの
throw/rejectionにはREST ownerもproduct `OperationError`もなく、process top levelへ到達してprocessを終了させ得る。

## Route

### `GET /api/v1/session`

Current session snapshotとscan progressを返す。Source state変化時はclientがこのendpointを取得し、lifecycle-triggeredな
session verificationには後述の軽量liveness routeを使う。Timer、watcher、SSE、WebSocketは不要。

Response data:

```text
InspectionSession
├── sessionId, apiVersion, createdAt, activeGeneration, snapshotState, globalContentEpoch,
│   staleFailures[] { sourceId, failureRef, failedAt, baseGeneration },
│   operationErrors[] { operationErrorId, code, messageKey, nextStepKey, operationId, scanRequestId },
│   globalEnableInProgress null | { kind, operationId, previewId },
│   globalDisableInProgress null | { operationId, state }, globalDisableOperationErrorId,
│   globalControl null | { state, previewId, confirmedTools[], pendingTools[], retryableTools[],
│                         batchStatus null | { scanRequestId, tools[], phase, failureRef },
│                         toolFailures[] { tool, diagnosticId }, lastOperationErrorId },
│   sensitiveContentWarning { messageKey, nextStepKey, acknowledgementScope },
│   sessionDiagnosticIds, repositoryFailureDiagnosticId
├── sources[]
│   ├── sourceId, kind, tool, enabled, status, generation, scanRequestId
│   ├── root { displayRoot, origin }
│   ├── conditionFacts[] { tool, surface, ruleId, affectedRuleIds, behaviorRefs, strategyRefs, sourceRefs,
│   │                      evidenceAssessments[] { subjectKind, subjectId,
│   │                                                documentationStatus, lifecycleQualifiers[] },
│   │                      condition { key, status, reasonCode, basis } }
│   └── progress null | { scanRequestId, phase, visitedEntries, candidateFiles, readBytes,
│                         diagnosticCount, queuedAt, startedAt }
├── files[]
│   └── fileId, sourceId, sourceRelativePath, aliasSourceRelativePaths, readState, parseSummary, sizeBytes,
│       encoding, hadLeadingBom, recognition summaries { tool, kind, parseStatus, provenance count, diagnostic IDs }, diagnostic IDs
└── diagnostics[] { diagnosticId, code, severity, scope,
                    sourceId?, fileId?, sourceRelativePath?, messageKey, safeArgs, nextStepKey }
    （active-generation recordとsession-owned lifecycle record）
```

このfull DTOを返すのは`globalDisableInProgress`がnullの間だけとする。Non-no-op disable barrier受理後は、
このrouteが代わりに次のexact control DTOだけを返す。

```text
GlobalFenceRecoverySnapshot
├── sessionId, apiVersion, liveness, globalContentEpoch
├── globalControl, globalEnableInProgress, globalDisableInProgress（requiredかつnon-null）
├── toolFailureDiagnostics[]
├── lastGlobalOperationError
└── globalDisableOperationError
```

`toolFailureDiagnostics`には`globalControl.toolFailures`が参照するpathless session Diagnosticだけをexactに含め、
nullableな各errorは対応するcontrol/error IDの参照先recordとexactに一致する。このDTOはgeneration、Source、Repository
failure、stale failure、無関係なDiagnostic/error、file、path、authored value、relationship、resource fieldを一切持たない。
Disable stateが`failed`でもfenceを維持し、terminal disable successまたはprocess restartの後だけfull DTOを再び許可する。
Inventory/generation/Source/file/detail/Diagnostic/relationship/comparison dataを含むその他すべてのinspection-data routeは、
fence中ずっと`409 global-disable-pending`を返す。
各fenced routeではtransport/capability/Host/Origin/body-shape validationの後、resource-ID existence、generation staleness、
duplicate-work、その他inspection-state checkより前にfenceをcheckする。したがってretained graph stateをleakせずfence conflictが
常に優先する。

各Sourceは正確に1つのrootを持つ。Repository Sourceは`tool: null`とし、sessionはGlobal Sourceを0〜3個、
`tool: codex`、`tool: claude`、`tool: copilot`ごとに最大1個持つ。Global rootを別Source内のboundaryとして
表現しない。
`root.displayRoot`はone-way escapedなroot presentation labelであり、`SourceRelativePath`、inventory-item locator、
caller input、operational-log field、read authorityではない。同じ区別をadmission前のconsent-preview `displayRoot`にも
適用する。Owning Sourceが存在する前のabsoluteまたはinvalidなlexical rootを表し得る。
Bootstrap Repository rootは`--cwd`省略時に`origin: process-cwd`、指定時に`origin: cwd-option`を持つ。APIはretained raw rootも
canonical rootも公開しない。
各`conditionFacts` entryはevidence-linkedでorigin-file-lessなSource Condition Factであり、`files`とrecognitionから
分離する。Physical/synthetic file、file ID/path/text、comparison target、relationship origin、local/hosted read、
network requestを作成できない。`evidenceAssessments`はFile Detailで定義するexact record schema、closed enum、orderを使い、
scalar documentation statusをserializeしない。未観測の現在stateはconditionalまたはunavailableのままにする。
Top-levelの`snapshotState`は`current`または`stale-after-fatal-rescan`とする。Fatalな明示rescanだけがaffected
Sourceの`staleFailures` entryとfailure referenceを追加または置換する。決定的にreturnされたfailureはDiagnosticを参照し、
throw/rejectされたaccepted jobはOperation Errorだけを参照する。別Sourceのentry/failure recordは共存する。
Successfulなcompleteまたはcontract済みpartial scanがclearするのはrefreshしたSourceのentryと参照先failureだけであり、
別Sourceのcommitは両方を保持し、Global disableは除去するSourceの両方をclearする。Arrayがnon-emptyの間だけ
`snapshotState`はstaleである。自動初回Repository failureと初回Global-enable failureは`staleFailures` entryを作らず、
決定的なreturned failureはclosed Diagnosticを使用できる。Startupのthrow/rejectionはprocess top levelへ到達し、REST所有の
Global failureはOperation Errorだけを使用する。初回Global-enable failureは既存entryとそこから派生する
snapshot stateをすべて保持する。
各`sourceRelativePath`とalias pathはowning Sourceのsingle rootを基準とし、APIはabsolute/canonical filesystem
pathへ置き換えない。
Pathはcollision-freeなNFC valueとしてserializeし、filesystem operationはprovenance固有のexact segment、すなわちenumerated pathでは
`Dirent.name`、parent enumerationを禁止するtargeted fixed pathではimmutable registry spellingをinternalに保持する。検証済みhard-link
fileは、admit済みNFC valueをunsigned UTF-8-bytewise順に並べた最小値をprimaryとし、残りのunique valueをsort済みaliasとして返す。
Filter/selectionは両方へmatchし、file Diagnosticは常にprimaryを使う。同じNFC valueを持つ異なるraw pathはpathless
session-scoped collision Diagnosticを1件だけ作り、ambiguousなfile DTOもそのSource attemptのgenerationも作らない。
Inventory summaryはsource textを含まない。Sort orderはsource kind、Global tool（存在する場合）、
normalized source-relative path、file IDの決定的順序。
`parseSummary`はfile-levelのclosed projection
`not-applicable | all-parsed | mixed | all-failed`とする。全recognitionが`not-attempted`なら
`not-applicable`、1件以上が`parsed`で`failed`がなければ`all-parsed`、1件以上が`failed`で`parsed`が
なければ`all-failed`、`parsed`と`failed`が共存すれば`mixed`とする。`not-attempted` recordは後3 projectionを
変えない。Recognition summaryはtool/kind、recognition-level `parseStatus`、provenance count、diagnostic IDだけを持ち、
aggregate documentation/applicability status、parse result、winnerを発明しない。Record-by-recordの
evidence/applicabilityは後述するdetail provenance/relationshipだけに保持する。

1 generation内で各`(fileId, tool, kind)`に対する`ToolRecognition`は正確に1つとする。Compatible provenanceはその
recognitionへmergeする。Provenance間でparsed meaningがinconsistentなら、その1 recognitionを`failed`とし、当該
recognitionのmetadata、relationship、derivationを1件もpublishしない。Competing recognitionへ分割しない。
Recognition arrayはshipped closed tool order、次にshipped closed kind orderを使い、opaque IDをtie-breakにしない。

SPAは単調増加する`clientDataEpoch`、`currentGeneration`、state-bearing requestごとのopaque request tokenを所有する。
`currentGeneration`よりoldなsession responseは無視する。Equal-generation responseはtokenがlatest poll tokenのままで、
capture済みepochが`clientDataEpoch`と一致する場合だけadoptする。Valid responseがnewer generationを持つ場合、SPAは先に
`clientDataEpoch`をincrementし、全old data requestをabortし、generation-owned editor/modelとcomparison/detail stateを
disposeし、以前のDTO graphをclearしてから`currentGeneration`を設定し、complete new snapshotをadoptする。Old epochで
captureしたresponseはbyteが後から届いてもstateを再作成できない。
返す全diagnosticはactive generation/source/file graphまたは`sessionDiagnosticIds`から参照され、client起因
request errorをここへ蓄積しない。
返す全retained Operation Errorはexact 1つの`StaleSourceFailure`、`globalControl.lastOperationErrorId`、または
`globalDisableOperationErrorId`から参照し、Diagnostic listには一切入れない。
`scope`はdiagnostic lifetimeと独立した必須attachment discriminatorである。Legalなlocation shapeは正確に3つだけで、
`file`は`sourceId`、`fileId`、当該fileのSource-relative Pathをすべて持ち、`source`は`sourceId`だけを持ち、
`session`はlocation fieldを1つも持たない。Source/session scopeのrecordはfile IDやpathを捏造しない。
それ以外の組合せはserialization前に拒否する。
Progressは`idle`、`failed`でnull、active workおよびdata modelで定義したfinal `ready`/`partial`
counterではpresentとする。最初のlegal snapshotは、capture済み`process.cwd()`または単一の`--cwd`からlexicalに選択した
exact 1つのidle Repository Sourceを持ち、file/diagnosticなしのbootstrap generation 0である。Escape済みroot labelは中央admission
までauthorityを与えない。Startup throw/rejectionはprocessを終了させ得るため、後続のreadable snapshotを保証しない。

`sensitiveContentWarning`は、detail/comparison surfaceを開くとcredentialを含む可能性があるcompleteなauthored valueを
表示することを説明する固定warning/next-step message keyを提供する。Protected valueには完全なsource text、declared authored
metadata、authored relationship target、comparisonの両sideを含む。`acknowledgementScope`は
固定値`authorized-browser-session`とする。SPAは任意の`FileDetail`を
要求する前またはcomparisonを構築する前に、current authorized browser session用のin-memory acknowledgementを
要求する。Acknowledgementはclient-onlyで、このAPIへ送らず、どちらのsideも永続化しない。Filesystem
authorityを付与せず、返すcontentも変更しない。Bearer capabilityがhost-side authorization boundaryの全てであり、
APIはpresentation acknowledgementを受け付けず、enforceするとも主張しない。それでもshipped SPAはdetail requestまたは
comparison構築前にそのacknowledgementを取得しなければならない。新しくloadしたbrowser documentと中央full-session
client-data purgeはacknowledgementをresetする。Route close、selection replacement、file/Source removal、generation
replacementはその中央purgeではなくscope限定cleanupであり、読み込み済みdocumentのacknowledgementを維持してよい。
Global disableは中央purgeを使うためresetする。

`globalControl`はGlobal consent/control stateがinactiveな場合だけnullとなる。それ以外では`state`が`active`または
`disabling`となり、`previewId`がfrozen active previewを識別する。`confirmedTools`は常にfixed closed
`[copilot, claude, codex]` all-tools consent setとする。Initial enableとretryのvalidation/admissionはoperation-localのままとし、
authority-freeな`globalEnableInProgress { kind, operationId, previewId }`だけを公開する。Initial enableでは
`globalControl: null`を維持し、retryではbuffer-bound disposition 1件がatomic commitするまでexactなpre-operation control
projectionを維持する。このprojectionがnon-nullの間のduplicate enableは`409 global-enable-in-progress`を返し、disableは直ちに
利用できる。

Queued dispositionでは、`pendingTools`がadmitted non-empty batch subsetとexactに一致し、`batchStatus`はその同じsubset用の
exactな`{ scanRequestId, tools, phase, failureRef }`とする。`tools`をnon-empty、unique、fixed tool orderとする。Active `phase`は
`waiting | enumerating | reading | deriving | recognizing`で`failureRef`はnullとする。Batch successは全Sourceをatomicに
publishし、両fieldをclearしてgenerationを1回進める。Terminal deterministic failureはempty `pendingTools`と
`phase: failed`を維持し、`{ kind: 'tool-failures', failedTools }`を持つ。`failedTools`はbatch-owned `toolFailures` rowを持つ
non-empty fixed-order setで、Diagnostic IDを繰り返さない。Terminal non-carveout throw/rejectionは
`{ kind: 'operation-error', operationErrorId }`を使い、`lastOperationErrorId`とexactに一致させる。Failed batchはretry受理または
disableまでrequest correlationを維持する。`active-no-job` dispositionはnull `batchStatus`を持ち、job/generationを作らず、
決定的なrejected-tool controlだけをretainまたはreplaceする。

`state: active`の間、`retryableTools`はunpublishedかつnon-pendingの各`admitted` controlと、
`retryDisposition: same-preview`の各`rejected` controlだけとし、lexicalな`new-preview-required` controlを除外する。
Operation-local retry validation中はpre-operation projectionを保つ。Retryを提示するのは`globalEnableInProgress`がnull、
`pendingTools`がempty、matching frozen previewを取得・検証済みの場合だけとする。Non-failed active batch中のretryable toolは
情報表示だけで、enableは`409 global-enable-in-progress`を返す。

Disable-barrier受理からterminal successまでは`state: disabling`、empty pending/retry array、null `batchStatus`とし、
`globalDisableInProgress`は`draining`、`committing`、retained `failed`の全期間non-nullとする。Controlはsuccessful
`remove-active-state` completion時だけnullとなる。`cleanup-only` barrierでは`globalControl`がnullでもよい。
`toolFailures`はnon-nullな全control `diagnosticId`をexact toolへmapする
fixed-tool-orderかつuniqueなarrayで、各IDは`sessionDiagnosticIds`にも存在しsession-owned deterministic Diagnosticへresolveする。
Operation Errorを含まず、そのcontrol failureのclearまたはdisable commitまで保持する。`lastOperationErrorId`はnull、またはactive consent全体について1件の
accept済みadmitted-subset Global batchのnon-carveout throw/rejectionを参照する。Accept前retry failureは保持し、決定的な`active-no-job` retryまたは
replacement-batch acceptanceはclearし、replacementのterminal failureはsupersedeし、Global disableはremoveする。1 toolを
識別せず、`StaleSourceFailure`を作らない。

Status: fullまたはfenced DTO付き`200`、capability/origin failureは`401`/`403`。

### `GET /api/v1/session/liveness`

Success bodyはexactに`{ sessionId, globalContentEpoch, globalDisableInProgress }`とする。Handlerは最終publish時に3値すべてを1つの
current coordinator-lock snapshotから取得する。Inspection-data successと異なりfence nullを要求せず、別tabがdisableを観測できるよう
current non-null projectionも返す。SPAはinitial authorization、visible/focused pageへの復帰、明示的Resume、fresh session adoptionの場合だけ
このrouteを呼び、in-flight requestは最大1件とする。このsingle-flight ruleはstale responseを拒否するためstate adoptionをserializeする
functional coordination invariantであり、resource admissionまたはvalidation ceilingではない。Polling interval、request timeout、retry
timer、memory leaseを定義せず、request settlementはbrowser/network/runtimeが所有する。`sessionId`一致、equal epoch、null disable projectionでcurrent baselineを
establishまたはconfirmする。Older epochはrejectする。Baseline confirmまたはrenderの前にgreater epochまたはnon-null projectionを
観測した場合、中央full purgeを実行してnew epochをadoptし、control-only recoveryへ入る。Lifecycle checkはこの仕組みで別tabのdisableを観測する。

Network/runtime rejection、`401`/`403`、session mismatch、hidden/page lifecycle eventでもended/recovery viewのrender前にpurgeする。
Continuously visibleなidle page上のprocess lossにはproduct定義のwall-clock検出保証を設けず、次のlifecycle checkまたはauthorized request
outcomeで扱う。Memory-only capabilityはpurgeを越えて保持する。Recovery fetchはfreshな`sessionId`、
`globalContentEpoch`、`globalControl`、`globalEnableInProgress`、`globalDisableInProgress`、exactなtool-failure Diagnostic、存在する
場合に`globalControl.lastOperationErrorId`が参照するGlobal Operation Error 1件、disable error IDと存在する場合の参照先
Operation Error、optionally reverified frozen
previewだけをadoptする。Inventory、generation、Source、file、detail、relationship、comparison、editor、warning
acknowledgement、authored sourceを復元しない。Null disable projectionでは**Resume inspection**を許可し、matching full sessionを
再取得してdefault inventory viewをatomicに構築する。Draining/committing fenceではjoin/wait、failed fenceではretry-disableを
提示する。Global retryはmatching frozen preview取得済み、`globalEnableInProgress`がnull、`pendingTools`がempty、
`retryableTools`がnon-emptyの場合だけ再構築する。Authentication failureではsession-ended viewを維持する。Liveness callは
Node process lifetimeを延長せず、inspection graphを返さず、保存もcacheもしない。

Status: `200`、capability/origin failureは`401`/`403`。

### `GET /api/v1/files/{fileId}`

Active-generation file detailを1件返す。

```text
FileDetail
├── parseSummaryを含むfile summary fields
├── sourceText（non-readable read stateではnull）
├── recognitions[]
│   ├── recognitionId, fileId, tool, kind, parseStatus, diagnosticIds[]
│   ├── declaredMetadata[] { closed fieldId, zero-based occurrence, exact authoredLiteral }
│   └── provenances[] { provenanceId, ruleId, discoveryClass, matchedPath,
│                       seedFileId, seedProvenanceId, seedRuleId,
│                       declarationKey, scope, evidenceAssessments[], order,
│                       behaviorRefs, strategyRefs, sourceRefs,
│                       applicability { summary, strategyRefs, evaluatedFromGeneration,
│                                       condition facts[] } }
├── relationships[] { relationshipId, fromFileId, fromRecognitionId, fromProvenanceId,
│                     ruleId, kind, targetOrigin, authoredTarget（exact sliceまたはnull）、
│                     normalizedTarget, boundary status, resolution status,
│                     evidenceAssessments[], behaviorRefs, strategyRefs, sourceRefs,
│                     applicability { summary, strategyRefs, evaluatedFromGeneration,
│                                     condition facts[] } }
└── diagnostics[]
```

各derived provenanceは`seedFileId`、`seedProvenanceId`、`seedRuleId`の3つすべてにより、独立してadmit済みの
exact static seed 1件を識別する。Static provenanceは3つすべてをnullとしてserializeする。`scope`は
closed `ScopeDescriptor` union（`source-root`、`directory-subtree`、`matching-path`、`declared`）、`order`はnullまたは
`path-depth`、`registry-rank`、`source-occurrence` componentを1から4件持つclosed `OrderDescriptor`とする。
Exact fieldとstable comparison keyは[data-model contract](../data-model.ja.md#scopedescriptororderdescriptor)が定義し、APIは
implementation固有のscope/order objectを受理・返却しない。

Readable fileでは`sourceText`、全`declaredMetadata[].authoredLiteral`、`targetOrigin: authored`の全relationshipが、
credential detection、masking、redaction、reveal stepなしでdecoded sourceのstructural delimiter内かつround-trip可能な
exact sliceを保持する。
Metadata arrayはsource occurrence順と受理したduplicateを保つ。`occurrence`はowning recognition内のscopeとし、完全な
comparison identityは`(tool, kind, fieldId, occurrence)`とする。
Authored quote、escape、block/collection punctuation、number/date spelling、environment-reference syntaxを
parser-normalized valueの代わりに返す。別のinternal typed semantic valueをclassification、target normalization、
plan定義derivationに使ってよいが、serialize/displayしない。JSON transport escapeはclient上で同じ`authoredLiteral`
stringへround-tripしなければならない。Environment-variable referenceは
literal stringのままとし、hostは参照されたprocess-environment valueをread、resolve、substituteしない。
Inspectionが使うenvironment valueは、Global rootをconsent flowで導出するための明示的に文書化されたtool-home
variableだけとする。
Registry定義の`targetOrigin: documented-default` relationshipは`authoredTarget: null`とし、SPAは検証済み
`normalizedTarget`をdocumented defaultとlabelして、synthetic pathがsourceに出現したと示さない。

Inventory、Detail、Comparison、Global control、Diagnostics、Source Condition Facts、全API envelope、CLI output、documentationを通じて、productが
行うのは構文だけのparsing、exact authored-literal extraction、機械的なtyped decoding、frozen-catalog
classification、文書化済みstructural scope/order/condition/selection/reference projectionだけである。Natural-languageの
meaningまたはintentをinterpret/rankせず、customizationのcorrectness、validity、compliance、effectiveness、qualityを
判定せず、policy/remediation advice、validation、lint、synchronization、conversion、formatting、fixingを一切提供しない。
Inspector所有のmanifest、DTO、registry、capability、internal invariantに対するstrict validationは許可され、customization
validationではない。決定的なavailability Diagnosticはcontent verdictを含まない。Event-confirmed-close observationは既にconfirm済みの
successful close lifecycleだけを維持してerrorを作らず、non-carveoutとしてthrow/rejectされたoperationはouter-boundary
Operation Errorだけを使用してDiagnosticにはならない。

File encoding stateは、完了したsame-handle readがread後の全checkに成功してから割り当てる。NUL byteが1つでもあれば
`binary`、null `sourceText`、comparison不適格とし、その他の条件を満たせばcontracted-partial generationとしてpublish可能とする。それ以外の
byte sequenceはUTF-8 replacement semanticsで正確に1回decodeする。先頭BOM 1つは`hadLeadingBom: true`として除去する。
Valid textは`utf-8`または`utf-8-bom`、`U+FFFD`が1つでもinsertされた場合は`utf-8-replaced`とする。その文字化けした
exactで完全な`sourceText`をparsing、extraction、detail、comparisonへ渡し、それ自体を理由にgenerationをpartialにしない。
Alternate decode、charset guessing、sampling、truncation、製品固有のbyte/line/item上限はない。

各recognitionの`parseStatus`はclosed enum `not-attempted | parsed | failed`とする。Parse/extractionはrecognitionごとに
all-or-nothingであり、`failed`はそのrecognitionとdiagnostic IDを保持するが、failed result由来のmetadata、
relationship、derivationを返さない。同じfile上の別recognitionは`parsed`でよい。Session summaryで定めたuniqueness、
compatible-provenance merge、inconsistent-meaning failure、closed tool-then-kind orderをdetailにも同一に適用する。
FR-028対象となる決定的かつthrowしないparser/extraction outcomeだけがcontracted-partial generation内でこのfailed-recognition
stateを作成できる。Read/parser/Workerのthrowまたはrejectionはdomain catch、classification、retry、item、Diagnostic、generation
resultなしでpropagateし、REST所有の場合だけgeneric Operation Errorで公開する。
Structural metadata comparisonは`(tool, kind, fieldId, occurrence)`を使うため、field/occurrenceが同じでも別tool/kindは
衝突しない。

Metadata、authored relationship target、derivationを生成する全internal `SourceTextRange`は、ECMAScript UTF-16 code unitで
測るhalf-open `{ start, end }`とする。`sourceText.slice(start, end)`が返すauthored literalと正確に一致しなければならない。
UTF-8 byte measurementは別に保持しoffsetとして再利用しない。Unicode normalization、code-point count、grapheme countでrangeを
変更しない。同じlogical source occurrenceのmetadata/relationship/derivation outputは正確に同一のrangeをreuseしてよい。
別logical occurrenceのpartial overlap、nest、crossは禁止し、そのようなoverlap、曖昧boundary、non-round-trip rangeは
affected recognitionをall-or-nothingでfailさせる。

Responseはinert JSON stringを使う。SPAは`sourceText`とmetadataをVue text bindingでrenderし、`v-html`、
Markdown rendering、clickable link、URI handler、image loadを使わない。Responseは`no-store`でlogに残さない。
SPAは上記client-only sensitive-content acknowledgementを表示して取得した後だけrequestする。

Detail request tokenは正確な`(clientDataEpoch, currentGeneration, fileId)`をcaptureする。Captureした3値がlive epoch、
generation、selected fileと全て一致する場合だけSPAはresponseをadoptし、request token replacementはそのcaptureを
invalidateする。Mismatch時はmodel、DOM text、metadata row、comparison inputを作らずresponseをdisposeする。

各`evidenceAssessments` memberはexactに`{ subjectKind, subjectId, documentationStatus,
lifecycleQualifiers }`とする。`subjectKind`は`behavior | rule | strategy`、`documentationStatus`は
`documented | partially-documented | unknown | conflict`、`lifecycleQualifiers`は
`preview | experimental | deprecated`のuniqueなfixed-order subsetとする。Empty qualifier arrayはstabilityを一切主張しない。
各arrayはowning ruleと参照する全behavior/strategyについて1 recordずつ持ち、subject-kind order、次に`subjectId`でdeduplicate/
sortする。APIはscalarへcollapseしない。Runtimeの`ConditionFact.status: documentation-conflict`は別のcondition valueであり、
`DocumentationStatus` aliasではない。

Status: `200`。File IDがunknown、以前のgeneration/removed file所属、またはdisabled source所属なら
`404 stale-resource`。Disable fenceがnon-nullの間は`409 global-disable-pending`。

### `POST /api/v1/repository/rescan`

Body:

```json
{}
```

Repositoryにrunning/queued commandがない場合だけ1 scan commandを受理する。Hostはadmission時にopaqueな
`scanRequestId`を1つ生成して`ScanAdmission { scanRequestId, source }`を返す。Returned Source/progressの両方と、この
commandに対する後続のqueued、active、complete、partial、failed statusはすべて同じIDを保持する。Successfulなcommit済み
generationはそのIDを記録し、以前のstatusまたはinventoryはこのrequestを満たせない。Coordinatorがidleなら直ちに
開始し、別transactionがactiveならFIFOへqueueし、Repository summaryは`status: scanning`、
`progress.phase: waiting`、non-null `queuedAt`、null `startedAt`を返す。Jobはrequest時ではなくdequeue時の
active generationから開始する。Completeまたはcontracted-partial replacementをatomic publishするまでcurrent
generationをreadableに保ち、publish時は全old file IDとcomparison selectionをinvalidateする。明示rescanがcommit前に
failureとなった場合、provisional partial resultを含む全uncommitted resultをdiscardする。Last committed generationとそのIDを
readableなまま保ち、top-level snapshotは`snapshotState: stale-after-fatal-rescan`、Repository Sourceは`status: failed`を返す。
決定的にreturnされたfatal outcomeはclosedなactionable lifecycle Diagnosticを使用する。Throw/rejectionは全domain layerを
越えてpropagateし、accepted-job boundaryは同じ`scanRequestId`を持つgeneric Operation Errorだけを記録する。どちらの場合も
`staleFailures` entryはそのfailure representationだけを参照する。後のsuccessfulまたはcontract済みpartial Repository rescanが
両方をclearし、別Sourceのcommitは両方を未解決のまま保持する。

Authorization/body-shape validationと、non-null Global-disable fenceによる`409 global-disable-pending`の選択後、
`poisoned`なprocess-wide resource registryを次のpre-schedule gateとする。Request ID/jobを割り当てず、stateを変更せず、filesystem I/Oを行わずに
`409 resource-cleanup-restart-required`を返す。

Status: Request IDとupdated source summary付き`202`、duplicate running/queued Repository commandだけ
`409 scan-in-progress`。Disable fenceがnon-nullの間は`409 global-disable-pending`。Disable fenceがresponseを既に支配しておらず
registryがpoisonedなら`409 resource-cleanup-restart-required`。

### `GET /api/v1/global/consent-preview`

既にcurrentなprocess-memory previewだけを返す。Environment valueをcaptureせず、previewをcreate、replace、invalidateしない。
Active consentまたはregistered initial enableがある場合はそのexact frozen previewを返す。Disable fenceがnon-nullの間は、
control-only recovery viewがrevoke対象consentを表示できるよう、barrierのexact `frozenPreview`を返す。Current
unconsented previewもfrozen previewもなければ`404 consent-preview-missing`を返す。

### `POST /api/v1/global/consent-preview`

Body:

```json
{}
```

候補Global pathへ触れる前にunconsentedなlexical/process-scoped previewをcaptureし、atomicにcreateまたはreplaceする。
このstate-changing requestはcapabilityに加えてexact same-origin `Origin`を必要とする。

```text
GlobalConsentPreview
├── previewId, previewDigest, allowlistVersion, traversalPlanVersion
├── entries[] { tool, origin, displayRoot, pathPatterns[], inputState }
└── excludedRuleIds[]
```

Coordinator conflict確認後に許可したPOST capture attemptごとに、serverは`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`をこの順で正確に1回ずつ
readする。`undefined`だけをabsentとし、empty stringはpresentとする。1つでもabsentなら、そのrequestでimport済み
`node:os.homedir()`を正確に1回callし、対応するabsent entryについてactive-platformの`node:path.join`と固定suffix
`.copilot`、`.claude`、`.codex`を使う。`HOME`、`USERPROFILE`その他home sourceを独自選択せず、lexical capture/joinは
existence checkを行わない。それらのvariableは候補Global rootの特定だけに使い、inspected content内のreferenceのsubstitutionには
使わない。Serializeしないfrozen internal preview recordは、各entryの`lexicalRoot`をexact raw stringとして
追加保持する。Empty、relative、invalid、control-containing、backslash-containing valueは別の`inputState`とともに
exact raw stringのまま保持する。
`displayRoot`は`lexicalRoot`由来のone-way presentation escapeであり、pathへdecodeせずadmission inputにも使わない。
候補Global root配下の`stat`、`realpath`、directory enumeration、file readを行わない。Node.jsと実行環境が
valueを保持・escapeできるかを決める。Environment capture、`homedir()`、join、retention、presentation encoding、digest
construction、serializationのthrow/rejectionはこのaccept前REST boundaryへ到達し、null `scanRequestId`のgeneric
Operation Errorを返す。Authorizationを作らず、normalization、canonicalization、root creation、readを行わない。それ以外では`displayRoot`がescape済みの正確なlexical
valueを示し、invalidなempty/relative overrideはdefaultへ戻さずinvalidと表示する。Successful POSTはcomplete response
bufferがreadyになった後だけprior unconsented previewをatomicにreplaceする。Active consentでは
`409 consent-preview-frozen`、registered enableでは`409 global-enable-in-progress`、disable fenceでは
`409 global-disable-pending`を返し、environment recaptureもstate changeも行わない。GET routeがfresh-client recovery用のexact
frozen previewを提供し、別previewには先にdisableが必要となる。Canonical HMAC digestはsession、`previewId`、version、
順序付きtool entry、type tag付きlength-prefix encodingによる各exact raw `lexicalRoot`、および
別にlength-prefixしたescaped `displayRoot`、origin、state、exclusion、typed `TraversalPlan` version、
closed selection policy、canonical programをbindする。Escaped `displayRoot`をraw digest inputの代わりに使わないため、presentation
escape上で似て見える2つのraw valueはcollisionしない。

Public `pathPatterns` entryは全て同じshipped static typed `TraversalPlan`から生成し、説明表示であって別matcher/read
authorityではない。Consent/root admission後、exact-file operationはGlobal rootを`opendir`せず、exactな
root/ancestor/target chainだけを`lstat`して共通canonical identity checkを行い、neighborをenumerateしない。
Fixed-instruction-subtree operationはplan定義walkに必要なplan指定instruction subtree directoryだけを`opendir`できる。
どのoperationもsibling setting、credential、state、plugin、その他neighbor pathをlist、stat、readしない。

Codex planだけは`codex-global-first-non-empty`を使う。`AGENTS.override.md`を安全にprobeし、overrideがnon-emptyなら
`AGENTS.md`へ一切operationせずshort-circuitし、absentまたは安全にemptyと確定した場合だけ次へ進む。Present candidateが
決定的なunsafeまたはbinary outcomeならfallbackせずselectionを終了する。Optionalな先頭UTF-8 BOMだけ、または
whitespace-only contentは`decodedText.trim().length === 0`のもとでemptyとする。`utf-8-replaced`は通常textとして参加し、
全`U+FFFD`はnon-whitespaceである。Non-emptyなCodex instruction fileを最大1件だけpublishする。`absent`はroot verification後、
contract宣言済みexact targetの`lstat`が返すNodeのexact `ENOENT`だけを意味する。最初の観測後の同じcodeはfallbackでなく
`entry-disappeared`とする。FR-041のevent-confirmed-close observationは既にconfirm済みのsuccessful close lifecycleだけを維持し、fallbackを選択しない。
`open`/`read`を含むすべてのnon-carveoutなthrow/rejectionはdomain catch/fallbackなしでowning REST boundaryへpropagateする。

GET status: `200`、`404 consent-preview-missing`、またはcapability/Host failureの`401`/`403`。POST status: `201`、
`409 consent-preview-frozen`、`global-enable-in-progress`、`global-disable-pending`、
`resource-cleanup-restart-required`、またはcapability/Host/Origin failureの`401`/`403`。Capture/serializationのthrowまたは
rejectionはstatus `500`のgeneric accept前Operation Errorを返す。

POSTではauthorization/body-shape validationと既存のactive-consent、registered-enable、non-null-disable-fence conflict check後、
`poisoned`なprocess-wide resource registryを次のpre-capture gateとする。Environment valueのcapture、previewのcreate/replace、job/request IDの割り当て、state変更、filesystem I/Oを
一切行わず`409 resource-cleanup-restart-required`を返す。GETはread-onlyなcurrent-preview lookupのままでworkをscheduleしない。

### `POST /api/v1/global/enable`

Body:

```json
{
  "confirmed": true,
  "allowlistVersion": "2026-07-20",
  "previewId": "opaque-preview-id",
  "previewDigest": "opaque-keyed-digest"
}
```

Response data:

```text
GlobalEnableResult
├── state: queued | active-no-job
├── scanRequestId: opaque ID | null
├── acceptedTools[]（tool enumを0〜3個）
└── rejectedTools[]（tool enumを0〜3個）
```

UIはそのpreviewの3 toolすべての正確なGlobal path集合、lexical input state、exclusionを表示した後だけ
送信できる。Hostはfalse confirmation、古いcontract version、superseded preview、constant-time比較で不一致の
digestを拒否する。Stored internal raw `lexicalRoot`とstored typed traversal programだけを使い、environment inputを
読み直さず、`displayRoot`をreverse-convertせず、`pathPatterns`をauthorityとして受け付けない。Bodyは意図的にtool
selectorを持たない。Initial enableは、すでにlexicalにinvalidなentryも含むfrozen preview entry 3件すべてからexact fixed
`[copilot, claude, codex]` setをderiveする。Retryはcurrent server-side `retryableTools` subset、すなわちunpublishedかつ
non-pendingのadmitted controlとsame-preview rejected controlだけをexactにderiveする。Lexical
`new-preview-required` controlにはdisableとnew previewが必要となる。Clientはtoolを追加、omit、remove、reorderできない。

Confirmation field検証後、coordinatorはexact 1つの`GlobalEnableOperation`をregisterし、1つのprovisional transactionが
derived set全体をevaluateする間は`globalEnableInProgress { kind, operationId, previewId }`だけを公開する。Duplicate enableは
`409 global-enable-in-progress`を返す。このprojectionはtool outcome、root、context、Source、job、authorityを一切publishしない。Empty/relative/
表現不能entryはfilesystem callなしの決定的rejectionとする。Eligibleなabsolute rootでは、contract宣言済みstructural
`lstat`からのNodeのexact `ENOENT`だけを`absent`に変換する。正常にreturnされたlink/type/canonical/identity checkはfallbackなしで
そのtoolを決定的にrejectできる。FR-041のevent-confirmed-close observationは既にconfirm済みのsuccessful close lifecycleだけを維持する。
Permission failureや`open`/`read` rejectionを含むすべてのnon-carveoutなthrow/rejectionはdomain
classificationなしでREST ownerへpropagateする。Initial enableではjob accept前に発生するため、null `scanRequestId`のgeneric
Operation Errorを返し、consent/control/jobをactivateせず、provisional subsetを一切commitしない。Retryでは既存
consent/controlとprior snapshotを変更しない。どちらのaccept前failureも`globalEnableInProgress`をunregisterし、terminal
operation historyをretainしない。

そのようなexceptionなしでvalidationが終了すると、`acceptedTools`と`rejectedTools`はdisjointかつuniqueなfixed-tool-order
arrayとなり、そのunionがtransactionでevaluateした全toolと一致する。Coordinatorは3 toolすべてのcontrolを持つinitial
consentをatomicにactivateする。Rootを1つもadmitしなければ、
`state: active-no-job`、null `scanRequestId`、Source/job/generationなしで返し、disable用controlに加え、
`retryDisposition`が許可する場合だけsame-preview retry用controlを維持する。
それ以外では`scanRequestId`を1つallocateし、全admitted rootを1つのprovisional batch scanへtransferし、`state: queued`を返し、
そのbatch commit前にSourceを一切publishしない。同じatomic acceptanceで、promote済み`scanRequestId`、tool set、
`phase: waiting`、null `failureRef`を持つ`globalControl.pendingTools`と`batchStatus`をpublishし、fresh pollingによるlost `202`
recoveryを可能にする。Tool rootごとにSource identityは分離するが、admitted subsetの全
ready/partial Sourceはexact 1つのN+1 generationへ同時に現れ、per-tool commitはpollから観測できない。その1 commitはcarried
Sourceのstable ID/semantic contentを維持し、全generation-owned IDをrekeyし、old detail/comparison/editor stateをinvalidateし、
該当する決定的tool failureをclearする。

Operationは各async stepの前後でID/epoch、non-aborted signalに加え、initial enableでは同じoperation-local provisional state、
retryでは同じactive control snapshotをcheckする。単一batch enqueue直前にcoordinatorがinitial consent/controlをatomicに
activateするかretry partitionを適用し、生成されたactive control stateをverifyする。Disable-first raceはdrainしてlate mutationなしの
`409 global-disable-pending`を返し、operation-firstの`202`は後のbarrierがbatchを
cancelしてもaccepted dispositionのままとする。`202`後のnon-carveout throw/rejectionは同じnon-null `scanRequestId`を持つterminal generic
Operation Errorとし、subset Source/generationをcommitせずprior snapshotを維持する。Initial/retry admitted-subset Global batchでは
Diagnosticも`StaleSourceFailure`も作らず、代わりにoperation-wide errorを1件retainして
`globalControl.lastOperationErrorId`から参照する。後のretryとdisableにはsession projectionで定義した正確なclear/
supersede lifecycleを適用する。

同じexact consentをretryできるのはserver-derived `retryableTools` projectionがnonemptyの場合だけとする。そのexact eligible subsetは
単なるSource absenceではなくserverがderiveし、clientはnarrowできない。別preview/rootまたはlexical `new-preview-required` controlには
先にGlobal disableが必要で、empty projectionなら`409 no-retryable-global-tool`とする。Non-retryableなmissing toolが存在すること自体は
別のactive-consent conflictを作らない。全entryがlexicalにinvalidなpreviewもconfirmでき、
決定的な`active-no-job` stateを返すため、別の`no-eligible-global-root` responseは存在しない。

Status: `202`、`400 consent-required`、`allowlist-version-mismatch`、または`consent-preview-mismatch`、
`409 no-retryable-global-tool`、`global-enable-in-progress`、`global-disable-pending`、
`resource-cleanup-restart-required`、もしくはgenericなaccept前Operation Error。Authorization/body-shape validationと、non-null disable fenceによる
`global-disable-pending`の選択後、`poisoned`なprocess-wide resource registryを次のpre-schedule gateとする。
Consent/control stateを評価または変更せず、request ID/jobの割り当て、root admission、filesystem I/Oを行わずrestart-required conflictを返す。

### `POST /api/v1/global/rescan`

Body:

```json
{
  "sourceId": "opaque-enabled-global-source-id"
}
```

Global disableがpendingでない場合だけ、指定したenabled tool-specific Global Sourceのscan commandを1つ受理する。
`sourceId`はopaque IDでありpathではない。Repository rescanと同じFIFO、dequeue時base generation、atomic
publication、progress、invalidation、serialization ruleを使う。そのSourceのrunning/queued scan commandは
最大1つで、duplicateを暗黙coalesceしたり2回目のreadにしたりしない。Admissionは
`ScanAdmission { scanRequestId, source }`を返す。このopaque request IDはreturned Source/progress、commandの全後続status、
そのcommandがcommitするgenerationで同一とする。

Failed Global rescanは何もcommitせず、そのfailed attemptからpartial resultを0件publishする。Top-level
`snapshotState: stale-after-fatal-rescan`、Sourceのnull `progress`と`status: failed`を返し、`enabled: true`、正確なconsent、validated済み
single-root record、last committed graph、そのgraphの全IDを保持する。1件のactionable DiagnosticまたはOperation Errorは、
許可されたlifecycle contextだけを識別してretained session snapshotがstaleだと説明する。そのSourceの`staleFailures` entryだけを
作成または置換する。決定的にreturnされたfailureはlifecycle Diagnosticを参照し、non-carveoutなthrow/rejectionはdomainを越えてpropagateし、
この`scanRequestId`を持つgeneric accepted-job Operation Errorだけを参照する。後の同じSourceに対するsuccessfulまたは
contract済みpartial rescanがgraphをatomic replaceして両方をclearし、別Sourceのcommitは両方を保持する。

Status: Request IDとupdated source summary付き`202`。Unknown/removed Source IDは`404 stale-resource`、Global disableが
pending/activeなら`409 global-disable-pending`、disable fenceがresponseを既に支配しておらずregistryがpoisonedなら
`409 resource-cleanup-restart-required`、そのSourceのrunning/queued scanとduplicateなら`409 scan-in-progress`。
Poisoned-registry gateはauthorization/body-shape validationとnon-null-disable-fence check後、schedule前に実行し、
request ID/jobを割り当てず、stateを変更せず、filesystem I/Oを行わない。

### `POST /api/v1/global/disable`

Body:

```json
{}
```

Response data:

```text
GlobalDisableResult
├── state: disabled | no-op
├── operationId: opaque ID | null
├── commitKind: cleanup-only | remove-active-state | null
└── generation
```

これは単なるGlobal Source削除commandではなく、全inspection dataに対するpriority security barrierである。SPAは送信前に中央full
purgeを実行する。True no-opを許可するのはactive/queued Global authority、retained disable failure、対象closable-resource
recordが一切なく、resource registryもpoisonedでない場合だけとする。Ordinary accept前response-buffer gateを使い、null
operation/commit kindとunchanged generationを返し、`globalContentEpoch`をincrementせずRepository workへ干渉しない。
Validationまたはresponse constructionがbarrier受理前に失敗した場合、response-only generic Operation Errorを返して何もmutate
しない。Fresh sessionのfenceはnullなので、既にpurge済みのclientは直ちにfull snapshotをrecoverできる。
決定的なaccept前restart-required conflictも、同じmutationless/null-fence recovery behaviorを持つ。

Non-no-opのfirst acceptanceは必ずbarrier operationをatomicにallocateし、command epochと`globalContentEpoch`をincrementし、
publication authorityを取消不能にrevokeし、non-null `globalDisableInProgress`を公開する。既存`globalControl`を
`disabling`へ変えて`pendingTools`、`retryableTools`、`batchStatus`をclearする。Registered
`globalEnableInProgress` operationとGlobal scanをabortし、queued Global commandのdequeueと全generation-mutating commandを
fenceする。Repository rescan requestは`409 global-disable-pending`を返し、既にrunningのRepository workはrevokeしてterminal
disable success後の1回のrequeue用にholdする。Global enable/rescanも同じconflictを返す。Session routeは
`GlobalFenceRecoverySnapshot`だけを返し、その他すべてのinspection-data routeは同じconflictを返す。Livenessはgreater epochと
non-null projectionを返し続ける。
Active/queued Global stateが存在する場合、既存poisoned registryがこのrevocationをblockしてはならない。Barrierを先にacceptして
対象recordを全てadoptし、未解決cleanupはretained generic errorとfenceだけで報告する。

First acceptance時に`commitKind`を固定する。Public Global consent/control/Source stateが存在する場合だけ
`remove-active-state`、public stateをpublishしていないoperation-local initial enableをcancel/drainするだけの場合に限り
`cleanup-only`を選ぶ。Barrierはrevoke済みcontinuationをすべてdrainし、最後のqueued-Global-work cancellation sweepを実行し、
process-wide `ClosableResourceRegistry`を通じて全inspection `FileHandle`と`fs.Dir`をcloseまたはjoinする。中断したGlobal workを
requeueせず、expected cancellationはDiagnosticもOperation Errorも作らない。

Barrierが`draining`または`committing`の間に受けたrequestは同じ`operationId`とterminal resultへjoinし、いずれかのtransport
disconnectでもcancelしない。Drain、close/unregister、final assembly、success serialization failureを含むaccept後のunexpectedな
non-carveout throw/rejectionは、null `scanRequestId`のgeneric Operation Errorを返す。そのexact retained errorは
`globalDisableOperationErrorId`だけが所有する。`globalDisableInProgress.state`は`failed`となり、processはaliveのまま、prior
generationはinternalに残り、全inspection-data fenceを閉じたままとする。Failed cleanupでcontentを再公開しない。

`failed` stateでの後続disable POSTはnew operationでidempotent cleanupを開始または再開し、exactな`commitKind`、base generation、
frozen preview、cleanup ledger、resource record、close promise、observer、既にincrement済みの`globalContentEpoch`をinheritし、
retryではcontent epochを再incrementしない。不確実なclose outcomeを推測せず、
resourceをdouble-closeしない。再failureはsole retained disable errorをsupersedeし、terminal successだけがこれをclearしてfenceを
除去する。Close outcomeが無期限にunknownならprocess restartが必要だが、REST-triggered failure自体はprocessをexitさせない。

Terminal successはbuffer-boundかつatomicとする。`remove-active-state`では全Global Source、consent、control、root、preview、
stale failure、tool Diagnostic、owned Operation Errorをremoveし、fully rekeyedなRepository-only generation N+1をcommitし、fenceを
clearしてnew generationを返す。Hold済みRepository commandはN+1から1回だけrequeueされ、後でN+2をcommitできる。
`cleanup-only`ではunpublished operation-local stateだけをremoveし、fenceをclearし、generation-owned IDを一切変えずunchanged
generation Nを再公開する。Concurrent joinerは同じterminal resultを受ける。

Status: no-op、joined success、retry success、first-attempt successは`200`。Global state/barrierがなく無関係なpoisoned resource
registryがno-opを禁止する場合だけ`409 resource-cleanup-restart-required`。それ以外のaccept後generic Operation Errorはstatus
`500`。Disable自体は`global-disable-pending`を返さない。

## Method/media handling

- Unknown `/api/v1` pathは`404`、known pathへのwrong methodは明示的`Allow` header付き`405`。
- Unsupported media typeは`415`、malformed JSON/unexpected keyは`400`。Node.js transport/parserのthrowまたはrejectionは
  partial bodyなしのclosedなaccept前Operation Errorを返し、APIは製品固有のrequest-size上限を定義しない。
- Masking、redaction、reveal、environment-resolution APIは存在しない。特に
  `POST /api/v1/files/{fileId}/reveals`はunknown pathとして`404`を返す。
- API responseは常にUTF-8 JSON。Static fileは固定extension-to-MIME tableを使い、user-controlled content
  type/path traversalを許可しない。
- Static file resolutionはvalidated build生成manifestにあるpackaged `dist/public`配下のexact Nuxt output
  pathだけを使う。Nuxtは`app.baseURL: '/'`、`app.buildAssetsDir: '/_nuxt/'`、CDN URLなしとし、HTML shellは
  root-absolute same-origin asset referenceだけを含んで全nested routeでそのまま動く。`GET`/`HEAD`の場合に
  限り、`/`、`/compare`、`/global-consent`、
  `/files/<22-character-base64url-fileId>`はpackaged `index.html`へfallbackできる。これはexplicitな
  client-route allowlistであり、general history fallbackではない。Unknown route、trailing-path variant、encoded
  separator、encoded/literal dot segment、NUL、malformed percent escape、query-controlled asset path、non-manifest
  assetを拒否し、inspected fileへfallbackしない。Capabilityなしのallowlist route reloadにはinert SPA
  shellとauthorization-lost viewだけを返す。`/200.html`、`/404.html`、その他全HTML aliasはmanifestに存在せず
  `404`を返す。

## Concurrency/lifecycle

- 1つのcoordinatorがcorrectness invariantとしてscan transactionをserializeする。1 Sourceあたりrunningまたはqueuedの
  scan commandを1つ受理し、duplicate scanはconflict、別のRepositoryまたはtool-specific Global Source scanはFIFOへ
  queueしてwaiting phaseを示す。Catchまたはobserveするfilesystem rejection caseは、宣言済みstructural `lstat`からのexact `ENOENT` conversionと
  FR-041のevent-confirmed-close observationだけとする。すべてのnon-carveoutなadmission throw/rejectionはdomain state mutationなしで
  owning boundaryへpropagateする。Disableはpriority barrierの
  join/no-op ruleに従う。全自動/明示scanは1つのopaque `scanRequestId`を受け、実際のdequeue時にcurrentなgenerationから開始する。
- 全scanと`GlobalEnableOperation`に`AbortSignal`を渡し、process shutdownは全workをabortする。Global disableは上記priority barrierで、
  active uncommitted transactionをabortし、enable validationをabort/drainして最後のqueued Global work cancellation sweep後に
  fixedなcleanup-onlyまたはremove-active-state dispositionを次にcompleteし、terminal success後だけ中断したRepository commandを
  1回requeueする。Operationの完了はNode.jsと実行環境に従う。Disable、shutdown、
  supersession、propagateされたfatal operation failureはpublication authorityを取消不能にrevokeする。FR-028対象となる
  決定的entry-local outcomeだけでは、
  attemptのpublication authorityをrevokeしない。Revoke済みpending Node.js filesystem
  promiseはresource cleanup専用にretainし、late byte、graph record、Diagnostic、DTO、operational-event resultをすべて破棄する。
  取消不能なkernel operationを物理的にcancelできるとは保証しない。
- Successfulまたはcontract済みpartial scanは正確にN+1をcommitし、scanned Sourceと全carried Sourceのgeneration所有graph
  IDを再生成する。Process-lifetimeでstableなSource IDは変更しない。Scanned Sourceのstale-failure entryと参照先failureだけを
  clearし、別Sourceの両方をcarryする。
  Fatalな明示rescanはpartial resultを含む全uncommitted resultをdiscardし、NとIDをactiveのままにし、retained
  session snapshotをstaleにmarkして、affected Sourceを識別するcap対象actionable out-of-generation lifecycle
  DiagnosticまたはOperation Errorとentryを1件作成または置換し、同じSourceの再failureでは両方を置換する。Nはlegalなbootstrap generation 0でも
  よい。Barrier cancellationは何もemitしない。
- Session retrievalとlifecycle-triggered liveness checkはNode process lifetimeを延長せずdataを永続化せず、product固有のtime thresholdを
  定義しない。Matching session/equal epochかつdisable projectionがnullのexact authenticated responseでcurrent baselineをconfirmする。
  Greater epochまたはnon-null projectionではcontrol-only recoveryへ入る前に中央purgeを実行し、network/runtime failure、
  authorization/session mismatch、hidden/page lifecycle eventではended view表示前にpurgeする。Purgeはclient epochをincrementしてlate
  in-flight responseによるDTO/editor stateの復活を防ぎ、Monaco model/editor/worker/subscriptionをdisposeし、DOM/store
  contentとwarning acknowledgementをclearしてpending requestをabortする。Node process終了時はserver側capability、
  complete source content、source root、generation、diagnosticを破棄する。
- API callはMCP serverを起動せず、importを追わず、inspected URLを開かず、customization commandを
  invokeせず、inspected sourceへwriteしない。
- Enabled inspection sourceは`node:fs/promises`上に構築した1つの中央集約serviceだけでenumerate/readする。
  API request、relationship、source fileが与えた任意absolute pathは受け付けず、validated source IDとsource-relative
  enumeration recordだけを受け付ける。Process-wide `ClosableResourceRegistry`だけが全inspection `FileHandle`と`fs.Dir`の
  open/close stateを所有し、serviceがoperation lifecycleを中央管理する。利用可能なcapacityはNode.js、
  OS、filesystem、実行環境から継承する。全openはread-only、non-create、non-truncate flagだけを使う。Serviceはinspected sourceに対してwrite、append、
  create、truncate、rename、delete、link、chmod/chown、timestamp、extended-attribute、ACL、または同等のmutation-capable
  primitiveを一切callしない。Enumeration、open直前、open後かつbyteを読む前、同じhandleによるcomplete read後の全candidate
  verification phaseは、次の正確な順序を使う。(1) candidate pathを`lstat`し、symbolic link、non-regular type、
  unexpected identityを拒否する。(2) これが成功した後だけcandidate `realpath`を解決し、`node:path.relative`で
  canonical containmentを検証する。(3) candidate pathを再び`lstat`し、identity、type、size、関連timestampが最初の
  `lstat`と一致することを要求する。したがってstable symlinkはcandidate `realpath`がfollowする前に拒否される。
  Enumeration時とopen直前にはlexical containment、root identity、全ancestor `lstat`も検証する。
  `node:fs.constants.O_NOFOLLOW`が存在し、そのNode.js/platform combinationで有効な場合は`O_NOFOLLOW`付きでopenする。
  Open後はbyteを読む前にordered candidate sequenceを実行し、pre-read `FileHandle.stat()`をそのphaseの両`lstat`結果と
  以前のsnapshotに比較する。Read後かつparse、publish、commitより前にはrootとancestorのcheck、ordered
  candidate sequence、同じopen handleの`stat()`を反復する。Dataとしてreturnされたambiguity、containment failure、metadata
  changeを検出した場合はbyte buffer全体を破棄してfail closedにする。正常にreturnされた必要なmetadataまたはcanonicalizationが
  unusableなら`safe-fs-boundary-unverifiable`をemitしてcandidateを拒否し、rootまたは共有ancestorがunverifiableならsourceを
  拒否する。Contract宣言済みstructural `lstat`からのexact `ENOENT`だけを`absent`/`entry-disappeared`としてcatchし、FR-041の
  event-confirmed-close observationは既にconfirm済みのsuccessful close lifecycleだけを維持する。すべてのnon-carveoutな
  throw/rejectionは変更せずpropagateしてcandidate Diagnosticを作らない。決定的なcandidate-local returned outcomeだけが、
  complete traversalとacquireした全resourceのregistry-confirmed closure後に限りdiagnostic-only recordを保持できる。
  Root/shared-ancestorまたはdirectory-enumeration guard outcome、もしくはFileHandle/`fs.Dir`のclose未確認は、影響Source
  attemptをabortし、candidate record、contracted-partial generation、success receiptを作らない。
- Mutation verificationはproductのfilesystem callをinstrumentし、inspection前後のfixture content、length、identity/link
  state、mode、modification/change time、観測可能なextended attributeまたはACLを比較する。OS readだけによるaccess-time
  移動は別に記録する。No-product-mutation claimをfailさせず、そのproofにも数えず、productはaccess-time updateをrequest
  しない。Readのnon-carveout throw/rejectionはdomain classificationなしでpropagateし、incomplete attemptを破棄してitem/result/generationを
  commitせず、REST所有の場合はgeneric Operation Errorだけを生成する。Valid、invalid、correct、incorrect、lint-failingの
  いずれともlabelしない。
- Public Node.js APIにはportableなdirectory-handle-relative openがない。Check間にsource rootまたはancestorを置換する
  active adversarial processは全platformで初期リリースのthreat model外とし、final-component replacementも有効な
  `O_NOFOLLOW`が存在しない場合だけscope外とする。通常の同時editと全detectable raceはscope内で、全byteをdiscardする。Same-device bind mount、報告されない
  reparse behavior、Node.jsから利用不能なその他のOS semanticsは文書化したplatform limitationであり、absoluteな
  containment guaranteeではない。

## 必須contract test

1. 全API routeがmissing、wrong、expired-process capability、cross-origin、wrong-Host、navigation requestを
   session dataを返さず拒否する。Operational-event schema testは全extra/free-form fieldを拒否し、Source-relative/
   absolute/canonical path、root、filename、content、metadata、authored value、capability、body、raw parser/system error、
   exception string、Diagnostic argumentがcaptured operational outputへ入らないことを証明する。固定presentation-output
   testはhelp/version、1件のlaunch-URL line、固定startup warningだけをadmitし、inspected path/valueを含まない。
2. SuccessfulなRepository/Global rescanと`remove-active-state` Global disable後にold file IDが失敗する。
   `cleanup-only`はNと全generation-owned IDを維持する。Fatalな明示rescanは
   failed-attempt partialを0件publishし、last committed IDを保持し、retained session snapshotをstaleにmarkして、
   決定的なreturned failureではexact 1つのactionable Diagnostic、throw/rejectionではOperation Errorを参照する。
   Bootstrap generation 0はcapture済み`process.cwd()`/`--cwd`から選択したexact 1つのnon-authorizing Repository Sourceを持つ。
   Multi-Source sequenceではA/Bのentry-failure pairが共存し、B successがAをclearせず、
   Aのcontracted-partial successだけがAのpairをclearし、Aの再failureがAのpairだけを置換し、Global disableが
   除去Global Sourceのpairだけをclearすることを証明する。Diagnostic DTO fixtureは正確に3つのscope shape、すなわち
   matching `sourceId`/`fileId`/`sourceRelativePath`を持つfile、`sourceId`だけを持つsource、location fieldを持たない
   sessionだけをacceptする。Source/file/pathの欠落、余分、mismatch、捏造の全組合せをserialization前に拒否する。
   Operation Error fixtureはexact closed field、accept前のnull `scanRequestId`、scan job用admit済みID、accepted disable barrier用
   nullを必須とする。各retained fixtureはexact 1つのlegal lifecycle ownerを持ち、全Diagnostic/path/content/raw-error fieldを
   拒否する。REST-triggered rejectionはprocessをexitせずgeneric errorを返す。自動startup read rejectionはprocess top levelへ
   到達し、productはprocess livenessを保証しない。
3. Readable file detailはcompleteなauthored source、exact metadata/authored-relationship source slice、credential、
   environment-reference textをmask/reveal controlなしで返す。JSONC escape spelling、YAML quote/block spelling、
   TOML quote/date spelling、collection punctuation、source order、受理したduplicate occurrenceをtransportと
   structural comparison後も保持し、normalized semantic valueを表示へ置換しない。
   File summaryには`not-applicable | all-parsed | mixed | all-failed`だけを公開し、
   `(fileId, tool, kind)`ごとに正確に1つのrecognitionは`not-attempted | parsed | failed`とown diagnostic IDを公開する。
   Compatible provenanceを1回mergeし、inconsistent meaningはそのrecognitionをall-or-nothingでfailさせ、arrayはclosed
   tool-then-kind orderを使う。Comparison keyは`(tool, kind, fieldId, occurrence)`とする。Astral character、unpaired
   surrogate、combining sequence、通常BMP textにより、`SourceTextRange`がUTF-16 `String.prototype.slice` offsetを使い、
   UTF-8計測とは分離することを証明する。同じlogical occurrenceはmetadata/relationship/derivation間でidentical spanを
   reuseできるが、別occurrenceのpartial/nested/crossing overlapはrecognitionをfailさせる。
   返却する全metadata tuple `(tool, kind, fieldId)`とrelationship tuple
   `(tool, kind, relationship kind)`は、維持管理するpresentation allowlistに含まれ、かつexactなauthored occurrenceが
   recognitionのactualなadmission済みsource form用extractorでsupportされなければならない。Tuple membershipによって
   source form間でeligibilityをtransferしない。Unknownなauthored keyとreferenceは完全な`sourceText`からだけ利用可能とし、
   推論したmetadataまたはrelationshipを作らない。
   Evidence fixtureは`documented | partially-documented | unknown | conflict`だけをacceptし、unique fixed-orderの
   `preview | experimental | deprecated` qualifierを別に維持し、empty qualifier arrayをlifecycle claimなしとして扱う。
   Ruleと参照する全behavior/strategyについてsort済み`EvidenceAssessment`を1件ずつ要求し、lossy scalar assessmentを拒否して
   runtime `documentation-conflict`と区別する。
   Encoding fixtureはNULがbinary/diagnostic-only/contracted-partial、valid textが`utf-8`または`utf-8-bom`、invalid non-NUL
   inputがreadableな`utf-8-replaced`であり、全`U+FFFD`をparsing、detail、comparisonまで保持し、それ自体を理由にgenerationを
   partialにしないことを証明する。Alternate decoderを一切invokeしない。
   固定Codex default-hook fixtureは
   `targetOrigin: documented-default`、null `authoredTarget`、明示的な
   documented-default labelを返し、explicit manifest hookは`targetOrigin: authored`とexact occurrenceを返す。
   Sentinel process valueによりenvironment referenceをresolve/substitute
   しないことを証明する。SPAはdetail requestまたはcomparison構築前にin-memory sensitive-content
   acknowledgementを表示して取得した後だけ任意の`FileDetail`をrequestまたはcomparisonを構築し、それ以前はprotectedな
   authored-value requestもderived DOM/editor stateも存在しないことをassertする。削除済みreveal routeは`404`を返す。直接のauthorized API testはacknowledgement
   field/endpointが存在せず、server-side presentation gateという主張ではなくcapabilityがHost authorization boundaryである
   ことを証明する。Cross-surface negative fixtureはInventory、Detail、Comparison、Global control、Diagnostics、Source
   Condition Facts、API DTO、CLI output、documentationが文書化済みstructural projectionだけを公開することを証明する。Natural-language
   meaning/intentのinterpret/rank、correctness/validity/compliance/effectiveness/quality verdict、policy/remediation advice、
   validation、lint、synchronization、conversion、formatting、fixingのfieldまたはbehaviorを一切admitしない。
4. Extra JSON key、path-shaped input、malformed body、wrong method/media typeが文書化済みsafe errorを返す。
   Contract testはrequest、file、collection、parser、snapshot、detail、response DTOのいずれも、製品定義の数値capacity
   上限を公開またはenforceしないことを証明する。注入したnon-carveoutなNode.js、parser、filesystem、serializationのthrow/rejectionは
   domain classificationをbypassし、owning REST boundaryでgeneric Operation Errorだけを返す。Diagnostic、partial JSON body、
   incomplete generation、validity/correctness/compliance/lint verdictを返さない。Escape/key-order fixtureは1つのcomplete serialized bufferがHTTP
   entity bodyであり、存在する場合の`Content-Length`と一致することを証明する。
5. Static traversal/encoded traversal attemptが`dist/public`外へ出ない。Pack済みのroot、`/compare`、
   `/global-consent`、`/files/<fileId>`が同じroot-absolute assetとCSPでbootし、正確なhashはNuxt bootstrapだけを
   authorizeしてmodified/unrecorded inline scriptやexecutable attributeを許可しない。
6. Repositoryと各tool-specific Global rescanのqueue order、duplicate rejection、abort、contracted-partial outcome、fatal
   failure、pollingがwhole generationだけを公開する。
   別のSourceの後でqueueしたscanはその時点のcurrent generationから開始する。`remove-active-state` barrierはN/N+1/N+2、
   `cleanup-only` barrierはheld Repository commandがN+1をcommitし得る前にunchanged Nを再公開し、true no-opはNとRepository
   workを変更しない。どのbarrierもaborted transactionを公開せず、受理済みRepository commandをterminal success後だけ1回
   requeueする。`draining`/`committing`中のconcurrent disableは1 operation/resultへjoinし、`failed`後のrequestはinherited
   cleanup ledgerをretryする。
   Pauseしたvalidation/admission operationを最後のcancellation sweep前にabort/drainし、その後late continuationを解放しても
   mutation、diagnostic、context、ID、jobを作らない。注入したnon-carveoutなadmission rejectionはouter boundaryへpropagateし、
   domain stateを変更せず製品定義のslot数に依存しない。Deterministicなbarrier-race fixtureではoperationを(a) validation await中、(b) admission後かつ
   control/context/diagnostic mutation前、(c) job enqueue/final response disposition直前でpauseする。各pauseでbarrierが
   先なら`409`となり、late side effectを許さず、operationをunregisterして後のenableを許可する。Operationのfinal
   dispositionが先なら、disable受理後にresponse byteをdeliveryしても確定済み
   `202`を維持する。
   Fence fixtureはfirst non-no-op acceptanceが`globalContentEpoch`をincrementし、session routeを即control-onlyにしてその他全
   inspection-data routeがretained `failed`中も含め`409 global-disable-pending`を返すことを証明する。Event-confirmed-closeのlater-promise rejectionを
   注入してpoison、propagation、Operation Errorを伴わないsuccessful lifecycleを証明する。別にnon-carveoutなclose/unregisterとfinal
   serialization rejectionを注入し、null-scan-ID disable Operation Errorのsole owner、process survival、content非再公開、
   idempotent retryを検証する。別のdeterministic delivery pauseではscan commit/disable acceptanceの前後にdata responseを保持する。
   Envelope epoch/generationとpayloadが混在せず、fence linearize時に未bind bodyは`409`となり、既にbind済みbodyは文書化した
   bounded pre-fence responseとしてだけ扱ってclientがgreater epoch/fence観測時にpurgeすることを証明する。Old responseを無視し、
   newer snapshot採用時に`clientDataEpoch`をincrementしてold stateをabort/disposeし、detailはcapture済み
   epoch/generation/fileIdが全て一致する場合だけadoptする。Disable、shutdown、supersession、注入したread/parser/Worker/assembly/serialization
   rejectionのtestは
   filesystem promiseをpendingのままにし、publication authorityをrevokeして全late resultを破棄することを証明する。
   正しいouter boundaryだけがOperation Errorまたはstartup top-level propagationを公開する。別のFR-028対象となる決定的な
   entry-local caseは、complete traversalとacquireした全resourceのconfirmed closure後に、attempt全体のauthorityをrevokeせず
   contracted-partialをpublishすることを証明する。Root/shared-ancestorとdirectory-enumeration guard outcome、および
   FileHandle/`fs.Dir`のclose未確認は、candidate record、partial generation、success receiptなしでSource-attempt abortとなることを
   証明する。Underlying Node.js/kernel operationのhard cancellationや製品定義のcompletion deadlineはassertしない。
   Close-state fixtureはconcurrent join/retryがexactな`FileHandle`/`fs.Dir` registry recordとpromiseをshareし、double-closeせず、
   unknown outcomeをrestart next step付きfenceのままにすることを証明する。
7. Fragment削除後に全allowlist client routeをreloadしてもAPI request、session data公開がなく、実行中
   processの表示済みlaunch URLを開くよう案内する。Unknown route/malformed asset pathにSPA fallbackを返さない。
   Liveness testはexactな`{ sessionId, globalContentEpoch, globalDisableInProgress }` bodyを要求し、lifecycle-triggered check、
   browser/network/runtime rejection、authorization failure、hidden/page lifecycle purge、異なる`sessionId`でのport再利用、older/equal/greater epoch、
   null/draining/committing/failed projection、client epoch変更後のlate in-flight responseを扱い、pre-purge inventory/detail/comparison/
   editor/authored-content DTO/DOM stateまたはwarning acknowledgementが残留・復活しないことを証明する。Active consentが
   あるhidden-to-visible recoveryではretained capabilityだけで認証し、purge済みIDを保持・比較せず返された`sessionId`を
   採用してclosed recovery projectionだけを構築する。Active control/enable stateからdisableを直ちに利用でき、
   draining/committingではjoin/wait、failedではretry-disableを提示し、同じfrozen preview ID/digestを取得・検証した後はeligible
   retry controlだけを再構築する。Fenceがnon-nullの間は明示Resume inspection actionを表示しない。Null fenceではmatching full
   sessionを再取得してdefault stateのfresh inventory summaryを構築するが、pre-purge authored content、selection、filter、detail、comparison、
   editor、acknowledgementを復元しない。後のdetail/comparison requestにはnew acknowledgementを要求する。Accept前disable
   failureとtrue no-opはいずれもfresh-session fenceをnullのままにするため、purged clientは直ちにresumeできる。
8. Global consent previewは候補pathに触れず、confirmationをexact raw internal `lexicalRoot`、typed traversal-plan
   version/program、preview digestにbindする。Changed/superseded previewまたはcanonical alias mismatchはreadを許可できない。
   Same-origin POSTだけが3件すべてのenvironment inputをcaptureしてunconsented previewをatomicにcreate/replaceする。GETはcaptureを
   0回とし、disable fence中も含めcurrent/frozen previewだけを返す。Missing-current、active-consent、in-progress-enable、
   disable-fence caseはaccidental replacementなしで文書化したclosed outcomeを返す。
   Escape-collision、control-character、backslash fixtureはdigestがraw valueをlength-prefixし、enableがstored raw valueだけを
   使ってenvironmentを再読込せず`displayRoot`をreverse-convertしないことを証明する。Bodyはtool selectorを持たず、initial
   enableは凍結済みentry 3件すべてを必ずevaluateする。Exact structural-`lstat` `ENOENT`と決定的なlexical/link/type/boundary
   outcomeがrejected toolをpartitionし、event-confirmed-close observationは既にconfirm済みのsuccessful close lifecycleだけを維持し、
   すべてのnon-carveoutなthrow/rejectionはgeneric accept前Operation Errorを返し、initial
   control/jobをactivateせずprovisional subsetを一切commitしない。Provisional enable workはSourceをpublishしない。
   正常なcompleteまたはcontracted-partial batch commit 1件は1〜3個の別々にidentifiedされたGlobal Sourceをexact 1 generationに
   同時に作り、toolごとに最大1個、Sourceごとに正確に1 rootとし、cross-tool mergeもobservableなper-tool commitも行わない。
   Accepted batchのnon-carveout throw/rejectionはその1つの`scanRequestId`用terminal Operation Errorを作り、Source/generationもDiagnosticも作らない。
   Prior-currentとprior-staleの両caseをtestする。全rootを決定的にrejectするinitial activationは、all-lexically-invalid previewも含め、
   `202 active-no-job`、job/Source 0件、active `globalControl`を返す。`retryableTools`はexactなsame-preview subsetだけを含み、
   all-lexically-invalid previewではemptyとなってdisable/new previewを要求する。All-rejected retryもnew job/Sourceを0件とし、generationを
   commitせず既存Sourceのsemantic contentとstableな`sourceId`を保持する。Partial acceptanceはevaluateした全toolをpartitionする。
   初回またはretryのbatch publication成功はgenerationを正確に1回進め、carried graphのgeneration-owned IDをすべてrekeyし、
   old file/detail/comparison/editor stateを無効化する。
   Source publish成功はown control diagnosticをclearし、無関係な
   outcomeは保持し、disableはGlobal Source未公開でも全control diagnostic/contextを削除する。
   Initial/retry validation/admission中にnewly visibleなのは`globalEnableInProgress`だけとする。Initial enableは
   `globalControl`をnullのまま、retryはexact pre-operation control projectionを維持する。Buffer-bound queued acceptance時だけ
   accepted-batch toolを`pendingTools`へ表示し、`batchStatus`がexact promoted request ID、tool、active phaseを公開する。Terminal
   deterministic failureとnon-carveoutなthrow/rejectionはexact closed `failureRef` variantを使い、lost-202 recoveryはstatusをretainし、success、
   retry acceptance、disableはcontract済みclear/replace lifecycleを適用する。Active controlの`unvalidated` toolをretryableにしない。
   Mixed activation中は既にrejectedまたはnon-pending admittedとなったtoolを
   `retryableTools`へ表示してよいが、`pendingTools`がemptyになるまでretryをdisabledとし
   `409 global-enable-in-progress`を返す。Disableは全期間利用できる。
   注入したnon-carveoutなadmission rejectionはconsent/control/Source stateを変更せず、Operation Errorだけを公開し、全terminal
   outcomeでoperation-history leakがないことを証明する。
   Fatal初回scan後のretryでretained rootが変更済みまたは検証不能ならold contextをclose/unregisterし、未公開IDを
   破棄して、後の再admission前にauthorityなしのrejected controlを残す。
   Exact-active-consent retryはserverのexact `retryableTools` subsetをderiveし、lexical `new-preview-required` controlと
   changed consentには先にdisable/new previewを要求する。Traversal call traceはpublic patternがtyped plan由来で、exact Global targetは
   root directoryをopenせずexact ancestor/target chainだけにtouchし、fixed instruction-subtree walkはそのsubtreeだけをopenし、
   neighboring setting、credential、state、plugin pathへI/Oしないことを証明する。
9. 中央集約したNode.js filesystem serviceは、全supported OSでlexical/canonical escape、symbolic-link path
   segment、non-regular candidate、必須enumeration/pre-open/post-open-pre-read/post-read snapshotの全detectable
   mismatchを拒否する。各phaseのcall traceは、candidate-path `lstat`、次にcandidate `realpath`と`path.relative`
   containment、次に2回目のcandidate-path `lstat`という正確な順序と、`realpath`直前・直後の`lstat`結果でidentityが
   一致することを証明する。Stable symlink fixtureは最初の`lstat`がcandidate `realpath`をcallせず拒否することを
   証明する。利用可能な場合は有効な
   `O_NOFOLLOW`を使う。Root、parent、final-entry replacement fixtureは、通常の同時変更またはその他のdetectable
   changeでbyteをpublishしないことを証明する。Dataとしてreturnされたambiguity/unusable metadata/canonicalizationは
   `safe-fs-boundary-unverifiable`を返す。Contract宣言済みstructural `lstat`からのexact `ENOENT`だけをabsence/disappearanceへ
   変換し、event-confirmed-close observationは既にconfirm済みのsuccessful close lifecycleだけを維持する。`open`/`read`を含む
   すべてのnon-carveoutなthrow/rejectionはOperation Errorまたはstartup top levelへpropagateしてDiagnosticを
   作らない。観測不能なOS behaviorはplatform limitationとして記録し、threat model外の
   active-adversary raceに対するproofとして数えない。Instrumentationは全mutation-capable open flag、およびwrite、append、
   create、truncate、rename、delete、link、chmod/chown、timestamp、extended-attribute、ACL、同等のcallを拒否する。
   Before/after fixtureはcontent、length、identity/link state、mode、modification/change time、観測可能なextended attribute/
   ACLが不変であることを証明する。OS-only access-time movementは別に記録し、failureともproofともせず、product callはそれを
   requestしない。Operationとhandleのlifecycleは製品定義のconcurrency上限なしで中央管理する。
10. Bootstrapはmalformedなpacked `package.json`、変更されたpacked `engines.node` contract、または
    `>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`外の実行Node.js versionをCLI import/bind前に拒否する。Static loaderは
    malformed/extra-key/duplicate manifest、symlink/non-regular asset、unexpected file、
    path/MIME/size/hash mismatch、relative/external executable URL、`<base>`、nonce、executable attribute、未記録inline
    scriptをbind前に拒否する。Fixtureは各manifest path、declared byte length、actual byte length、MIME type、digestが一致し、
    製品定義のfile-sizeまたはrecord-count上限を課さないことを証明する。BuildはNuxtの固定`200.html`/`404.html`だけを要求後に除去し、それ以外の
    non-`index.html` HTML fileを拒否する。Packed file listは正確なnpm allowlistと一致する。Build/package
    verificationはcleanな`.output`/`.build`/`dist` treeから開始し、`dist`を2 manifestとlisted static/server
    recordだけにrecursive matchさせ、stale outputを拒否する。Build、packed-tarball、runtime-bootstrap fixtureは
    import/bind前に同一integrity contractをenforceし、customization-file contentを分類しない。
11. Package testはexact production dependencyを`gunshi`、`yaml`、`jsonc-parser`、`smol-toml`とし、`open`が全dependency
    section/lock closureにないことを要求する。全project/dependency tarball payloadとauthored application-code fileは
    JavaScriptまたは許可済みdeclarative artifactでなければならず、package-owned shell helperを拒否する。Isolatedな
    scripts-disabled/omit-dev installと、その後のnetwork-disabled
    normal installでproduction closure全体をauditし、lifecycle/build requirement、platform selector、bundled/optional
    native package、native/binary/Wasm extensionまたはmagic、native source/build metadata、non-Node shebang、executable
    non-JavaScript payload fileを拒否する。Graph digestはname/version/integrityと各package-payload digestをbindし、generated
    shimを除外する。OS別auditはexact declared Node-JavaScript `bin` target用のpackage-manager生成`.bin` symlink/
    `.cmd`/`.ps1` shimだけを許可し、argvだけをforwardして追加input/logicを持たないことを要求し、unexpected shimを拒否する。
    全CI OSで同じgraph digestを得る。Launcher testは2つのsupported platformのexact command、`shell: false`、URLだけのargv、exact minimal
    environment allowlist、terminal表示1回、`--no-open`でchild 0件、missing/nonzero/unsupported helper時の固定warning付き
    継続をassertする。Malicious `BROWSER`、`NODE_OPTIONS`、`NODE_PATH`、inspected/env-supplied argvはcommandを
    選択・変更できない。Windowsとその他unsupported platformはchildを0件とし、固定manual-URL warningを出す。Allowlist済みambient desktop/session valueはOS helperへ
    到達してよいがInspector handler overrideにはならない。Testはdefault-handler delegationとcertificationを区別し、helper
    成功がbrowser versionを証明しないこと、release evidenceがpin済みPlaywright revisionまたは`--no-open` manual fallbackを
    使用することを確認する。
12. 全自動/明示scanはuniqueなopaque `scanRequestId`を受ける。Repository/Global rescan admission response、Source summary、
    waiting/active/final progress、fatal status、successful generation recordは同じIDを保持し、stale/prior request stateは
    newer requestを満たせない。SC-002 browser protocolはfresh processを開始し、自動Repository scanがterminal stateへ
    到達するまでtiming外で待って、明示Repository rescanを正確に1件dispatchし、そのadmission IDをcaptureする。Status/
    inventory timerは、同じIDに関連付けられたvisible render済みstateとcommit済みgenerationでだけ停止する。EvidenceはIDと
    generationの両方を記録し、すでにrender済みの自動inventoryはqualifyしない。
