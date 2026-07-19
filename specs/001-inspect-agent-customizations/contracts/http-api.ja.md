# Contract: Local HTTP API

[English](http-api.md)

**API version**: 1
**Base path**: `/api/v1`
**Transport**: Loopback HTTP上のJSONだけ

このAPIはstatic Nuxt SPAを同じprocessのNode inspection hostへ接続する。Public network APIではない。
Opaque IDとclosed commandだけを受け付け、filesystem path、URL、command、source text、parser option、glob、
executable contentを受け付けるendpointはない。

## Host/capability要件

1. Processは`127.0.0.1`のephemeral portへbindする。初期リリースにはhost overrideがなく、`0.0.0.0`、
   LAN address、Unix socketへbindしない。Bind前にpacked `engines.node`が正確に`^24.11.0 || ^26.0.0`であること、
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
   `BROWSER`、`NODE_OPTIONS`、`NODE_PATH`、全inspected value、その他environment value、environment由来または追加argv
   elementは渡さない。Helper missing/nonzero、spawn error、unsupported platformは固定warningだけを
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
4. 必須の起動元terminal向け1回限りlaunch lineはpresentation outputであってoperational logではない。その例外以外、
   Hostはcapabilityをconstant timeで比較し、header、fragment、token、request/response body、raw parser
   error、customization sourceまたはdeclared metadataからcopyした値をlogに残さない。Operational
   diagnostic/logはopaque source/file IDとsource-relative locationを識別してよいが、inspected contentを
   複製しない。
5. 全requestに割り当て済みの正確な`Host`値を要求する。State-changing requestには正確なsame-origin
   `Origin`も要求し、API navigation/cross-site fetch metadataを拒否する。CORS headerは出力しない。
6. Bind前にhostはdata model記載の最大2 MiB `dist/manifests/static-assets.json`をstrictにloadし、全listed
   regular assetの正確なpath、byte length、lowercase SHA-256を検証する。Buildはrelative/external executable
   asset、executable attribute、`<base>`、nonce、malformed/unrecorded inline script、symlink、unexpected outputを
   拒否する。Nuxtのstatic-host alias `200.html`/`404.html`を要求後に除去し、HTMLは`index.html`だけを許可する。
   Static responseのrestrictive CSPは`default-src 'none'`、`script-src 'self'`とNuxt executable
   inline bootstrap用manifest内の正確な`sha256-<base64>`だけ、`script-src-attr 'none'`を使い、scriptの
   `unsafe-inline`、`unsafe-eval`、nonceを使わない。Monacoがlayout/theme styleを生成するためだけの
   `style-src 'self' 'unsafe-inline'`、`font-src 'self'`、`connect-src 'self'`、`worker-src 'self'`、
   `img-src 'self' data:`、`object-src 'none'`、`base-uri 'none'`、`form-action 'none'`、
   `frame-ancestors 'none'`を使う。Monaco workerはroot-absolute same-origin static assetとして出力するため、
   external workerと`blob:` worker sourceを許可しない。API responseには`Cache-Control: no-store`と
   `X-Content-Type-Options: nosniff`を設定する。
7. JSON request bodyは`application/json`、declared/actual size最大64 KiB、文書化済みkeyだけを含み、
   strict manual type/enum guardを通過しなければならない。

Static assetとpackaged SPA shellはsession dataを含まないためcapabilityなしで取得できる。Shellは
上記authorization-lost behaviorを実行し、token/session snapshotをembedしない。Progress、diagnostic、Global
consent previewを含む全API routeはcapabilityを必要とする。

## 共通envelope

成功response:

```json
{
  "apiVersion": 1,
  "generation": 3,
  "data": {}
}
```

`GET /api/v1/session`と`GET /api/v1/files/{fileId}`の成功envelopeは常に`generation`を持つ。
`SessionSnapshot`では`data.activeGeneration`と一致し、`FileDetail`では返却する全generation-owned IDがその値に
属する。Serverはsession coordinator lock下の1つのlinearization pointでgenerationを選び、complete payloadを構築する。
Lock解放後に既に確定したenvelopeをserialize/deliverしてよいが、あるgenerationを読んで別generationのdataを構築し、
後からresponseのlabelを付け替えてはならない。

`ResourceLimits.maxSessionSnapshotBytes`は8 MiB、`ResourceLimits.maxFileDetailBytes`は4 MiBとし、completeな
UTF-8 JSON成功envelopeで測定する。Snapshot limitはsession所有mutable fieldを全てneutralにしたexact 5 MiBの
`maxSessionSnapshotBaseBytes` projectionと、3 MiBの`maxSessionSnapshotOverlayBytes` deltaへ分ける。Overlayは2 MiBの
`maxSessionLifecycleDiagnosticBytes` sub-budgetと、`snapshotState`、最大4つの`staleFailures`、`globalControl`、Source
lifecycle/progress projection用に分離した1 MiBの`maxSessionSnapshotControlBytes` sub-budgetで構成する。
各lifecycle insertionはDiagnostic、重複する`sessionDiagnosticIds` occurrence、separator込みで最大2 KiBとし、通常recordは
4つのkeyed failure slotとsession sentinel用16 KiB reservationを使えない。Oversized keyed failureは固定compact per-key
recordへ変換し、oversized ordinary detailは抑止してsession sentinelをincrementする。Keyed replacementはold chargeを
creditしてからnew recordをatomicに受理する。Build-time worst-case
encoding testはclosedなserver所有control form全てを1 MiB reservation内に保つ。このoverlay accountingはgeneration commit後も
継続するため、後続session control/lifecycle-diagnostic mutationがcomplete envelopeを8 MiB超へ押し出せない。
Scan構築時にdeterministicなcanonical byte budgetを使い、contract順のcompleteな
file-summary、recognition、metadata、provenance、relationship、diagnostic record単位でadmit/rejectする。String、array
element、objectを途中で切らない。次のrecordでbudget超過となる場合はapplicable accumulationをその前で停止し、generationを
partialにして固定bounded diagnosticをcommit前に渡す。APIはresponse時にtruncateしない。Commit済みstateからin-limitの
complete envelopeを生成できないinvariant violationでは、partial `data`なしの固定safe
`500 response-size-invariant` errorを返す。
Canonical accountingはproduction JSON encodingそのものとし、contract field order、escape、separator、omission ruleを
固定して追加whitespaceを入れない。Hostはsuccess envelopeのcomplete UTF-8 entity-body bufferを1回だけmaterializeし、
その正確なbyte lengthを検査して同じbufferを変更せずHTTP responseへ渡す。Accounting済みDTOを再serializeしない。
`Content-Length`をemitする場合は、そのbuffer lengthとする。

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
copyしない。Correlation IDを返してよいが、process memory内だけに保持する。

## Route

### `GET /api/v1/session`

Current session snapshotとscan progressを返す。Source state変化時はclientがこのendpointをpollし、継続的な
lifetime検出には後述の軽量liveness routeを使う。Watcher、SSE、WebSocketは不要。

Response data:

```text
SessionSnapshot
├── sessionId, createdAt, activeGeneration, snapshotState, limits,
│   liveness { heartbeatIntervalMs, requestTimeoutMs, leaseDurationMs },
│   staleFailures[] { sourceId, diagnosticId, failedAt, baseGeneration },
│   globalControl null | { state, previewId, confirmedTools[], pendingTools[], retryableTools[] },
│   sensitiveContentWarning { messageKey, nextStepKey, acknowledgementScope }, sessionDiagnosticIds
├── sources[]
│   ├── sourceId, kind, tool, enabled, status, generation
│   ├── root { displayRoot, origin }
│   ├── conditionFacts[] { tool, surface, ruleId, affectedRuleIds, behaviorRefs, strategyRefs, sourceRefs,
│   │                      condition { key, status, reasonCode, basis } }
│   └── progress null | { phase, visitedEntries, candidateFiles, readBytes, diagnosticCount, queuedAt, startedAt }
├── files[]
│   └── fileId, sourceId, sourceRelativePath, aliasSourceRelativePaths, readState, parseSummary, sizeBytes,
│       encoding, recognition summaries { tool, kind, parseStatus, provenance count, diagnostic IDs }, diagnostic IDs
└── diagnostics[]（active-generation recordとbounded out-of-generation lifecycle record）
```

各Sourceは正確に1つのrootを持つ。Repository Sourceは`tool: null`とし、sessionはGlobal Sourceを0〜3個、
`tool: codex`、`tool: claude`、`tool: copilot`ごとに最大1個持つ。Global rootを別Source内のboundaryとして
表現しない。
各`conditionFacts` entryはevidence-linkedでorigin-file-lessなSource Condition Factであり、`files`とrecognitionから
分離する。Physical/synthetic file、file ID/path/text、comparison target、relationship origin、local/hosted read、
network requestを作成できず、未観測の現在stateはconditionalまたはunavailableのままにする。
Top-levelの`snapshotState`は`current`または`stale-after-fatal-rescan`とする。Fatalな明示rescanだけがaffected
Sourceの`staleFailures` entryと予約済みdiagnosticを追加または置換し、別Sourceの両方は共存する。
Successfulなcompleteまたはcontract済みpartial scanがclearするのはrefreshしたSourceのentryと予約済みdiagnosticだけであり、
別Sourceのcommitは両方を保持し、Global disableは除去するSourceの両方をclearする。Arrayがnon-emptyの間だけ
`snapshotState`はstaleである。自動初回Repository failureと初回Global-enable failureは`staleFailures` entryを作らず、
key別Repository/Global-tool予約済みfailure slotを使う。初回Global-enable failureは既存entryとそこから派生する
snapshot stateをすべて保持する。
各`sourceRelativePath`とalias pathはowning Sourceのsingle rootを基準とし、APIはabsolute/canonical filesystem
pathへ置き換えない。
Inventory summaryはsource textを含まない。Sort orderはsource kind、Global tool（存在する場合）、
normalized source-relative path、file IDの決定的順序。
`parseSummary`はfile-levelのclosed projection
`not-applicable | all-parsed | mixed | all-failed`とする。全recognitionが`not-attempted`なら
`not-applicable`、1件以上が`parsed`で`failed`がなければ`all-parsed`、1件以上が`failed`で`parsed`が
なければ`all-failed`、`parsed`と`failed`が共存すれば`mixed`とする。`not-attempted` recordは後3 projectionを
変えない。Recognition summaryはtool/kind、recognition-level `parseStatus`、provenance count、diagnostic ID、
provenance documentation/applicability stateのsort済みsetを持ち、aggregate parse resultやwinnerを発明しない。

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
request errorをここへ蓄積しない。正確なfile/source/generation/session capとoverflow sentinelは`limits`から得る。
Progressは`idle`、`failed`でnull、active workおよびdata modelで定義したfinal `ready`/`partial`
counterではpresentとする。最初のlegal snapshotはfile/diagnosticなしのbootstrap generation 0で、自動の初回
Repository scanがfatal failureでもreadableかつcurrentのまま残る。

`sensitiveContentWarning`は、source/comparison contentを開くとcredentialを含む可能性があるcompleteな
authored valueを表示することを説明する固定warning/next-step message keyを提供する。`acknowledgementScope`は
固定値`authorized-browser-session`とする。SPAはfile detailを
要求する前またはcomparisonを構築する前に、current authorized browser session用のin-memory acknowledgementを
要求する。Acknowledgementはclient-onlyで、このAPIへ送らず、どちらのsideも永続化しない。Filesystem
authorityを付与せず、返すcontentも変更しない。

`globalControl`はGlobal consent/control stateがinactiveな場合だけnullとなる。それ以外では`state`が`active`または
`disabling`となり、`previewId`がfrozen active previewを識別する。Consent済みtoolを`confirmedTools`へ返す。
`pendingTools`はvalidation/admission中のrunning/queued enable/retry operation、またはそのrunning/queued initial scan jobが
所有するtoolを返す。`retryableTools`は`rejected`またはnon-pending `admitted` controlで、published Sourceもactive
operation/jobもないconfirmed toolだけを返し、`unvalidated` controlは常にpendingとする。これらのsort済み
closed arrayはcanonical root、digest、source contentを公開しない。Global Sourceが0個のall-failedおよびpost-validation
initial `active-no-job` outcomeと、既存Sourceを保持するall-rejected retryでもfieldを返すため、
fresh clientは常にdisableを提示でき、retry前にmatching previewを取得できる。
Priority barrier受理からcommitまでは`state: disabling`とし、`pendingTools`/`retryableTools`をemptyにしてUIはretryを
提示せずenable routeも拒否する。Disable commit時にfieldをnullにする。
`state: active`でも`pendingTools`がnon-emptyの間、`retryableTools`は情報表示だけとし、UIはretryを提示せずenable
routeは`409 global-enable-in-progress`を返す。Disableは直ちに利用できる。`pendingTools`がemptyとなりmatching frozen
previewを取得・検証した後だけretryを提示する。

Status: `200`、capability/origin failureは`401`/`403`。

### `GET /api/v1/session/liveness`

Current `sessionId`と固定`leaseDurationMs: 2000`だけを返す。Authorized pageがvisibleな間、SPAは
`heartbeatIntervalMs: 1000`ごとに`requestTimeoutMs: 750`のtimeout付きでこのrouteを呼ぶ。Responseの
`sessionId`が最初のauthenticated snapshotと完全一致する場合だけmonotonic browser-memory leaseをrenewする。
Timeout、network failure、`401`/`403`、session mismatch、lease expiryではsession-ended viewのrender前に中央client
purgeを実行する。Leaseはtimer schedulingまたはcompletion callbackが遅れた場合のhard fallbackである。
Hidden/page lifecycle eventでは直ちにpurgeする。Memory-only capabilityはpurgeを越えて保持し、visibleへ戻る場合はfreshな
authenticated session snapshotを要求する。New sensitive-content acknowledgementは後でsource/detailまたはcomparisonを
開く場合だけ要求する。Recoveryはretained capabilityでsnapshotを
認証し、purge済みIDを保持・比較せず返された`sessionId`をnew liveness baselineとして採用する。`globalControl` projectionだけを
保持してその他のsnapshot fieldをinventory/detail/acknowledgement stateへ復元せず破棄する。Recovery viewは常に明示的な
**Resume inspection** actionを提示する。Resumeはsessionを再取得して`sessionId`が採用済みbaselineと一致することを要求し、
default filterのfresh inventory-summary viewをatomicに構築するが、以前のdetail、comparison、editor、warning
acknowledgement、authored sourceを復元しない。Projectionがnon-nullならdisableを
直ちに利用でき、SPAはexact frozen active previewを取得して`previewId`を検証してからretry controlを再構築する。Authentication failureでは
session-ended viewを維持する。Liveness callはNode process lifetimeを延長せず、source/
root/diagnostic dataを返さず、保存もcacheもしない。

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
│                       seedFileId, seedProvenanceId, seedRuleId, depth,
│                       declarationKey, scope, documentationStatus, order,
│                       behaviorRefs, strategyRefs, sourceRefs,
│                       applicability { summary, strategyRefs, evaluatedFromGeneration,
│                                       condition facts[] } }
├── relationships[] { relationshipId, fromFileId, fromRecognitionId, fromProvenanceId,
│                     ruleId, kind, targetOrigin, authoredTarget（exact sliceまたはnull）、
│                     normalizedTarget, boundary status, resolution status,
│                     documentationStatus, behaviorRefs, strategyRefs, sourceRefs,
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
credential detection、masking、redaction、reveal stepなしでdecoded sourceのvalidated済みexact sliceを保持する。
Metadata arrayはsource occurrence順と受理したduplicateを保つ。`occurrence`はowning recognition内のscopeとし、完全な
comparison identityは`(tool, kind, fieldId, occurrence)`とする。
Authored quote、escape、block/collection punctuation、number/date spelling、environment-reference syntaxを
parser-normalized valueの代わりに返す。別のinternal typed semantic valueをclassification、target normalization、
bounded derivationに使ってよいが、serialize/displayしない。JSON transport escapeはclient上で同じ`authoredLiteral`
stringへround-tripしなければならない。Environment-variable referenceは
literal stringのままとし、hostは参照されたprocess-environment valueをread、resolve、substituteしない。
Inspectionが使うenvironment valueは、Global rootをconsent flowで導出するための明示的に文書化されたtool-home
variableだけとする。
Registry定義の`targetOrigin: documented-default` relationshipは`authoredTarget: null`とし、SPAはbounded
`normalizedTarget`をdocumented defaultとlabelして、synthetic pathがsourceに出現したと示さない。

各recognitionの`parseStatus`はclosed enum `not-attempted | parsed | failed`とする。Parse/extractionはrecognitionごとに
all-or-nothingであり、`failed`はそのrecognitionとbounded diagnostic IDを保持するが、failed result由来のmetadata、
relationship、derivationを返さない。同じfile上の別recognitionは`parsed`でよい。Session summaryで定めたuniqueness、
compatible-provenance merge、inconsistent-meaning failure、closed tool-then-kind orderをdetailにも同一に適用する。
Structural metadata comparisonは`(tool, kind, fieldId, occurrence)`を使うため、field/occurrenceが同じでも別tool/kindは
衝突しない。

Metadata、authored relationship target、derivationを生成する全internal `SourceTextRange`は、ECMAScript UTF-16 code unitで
測るhalf-open `{ start, end }`とする。`sourceText.slice(start, end)`が返すauthored literalと正確に一致しなければならない。
UTF-8 byte limitは別にcountしoffsetとして再利用しない。Unicode normalization、code-point count、grapheme countでrangeを
変更しない。同じlogical source occurrenceのmetadata/relationship/derivation outputは正確に同一のrangeをreuseしてよい。
別logical occurrenceのpartial overlap、nest、crossは禁止し、そのようなoverlap、曖昧boundary、non-round-trip rangeは
affected recognitionをall-or-nothingでfailさせる。

Responseはinert JSON stringを使う。SPAは`sourceText`とmetadataをVue text bindingでrenderし、`v-html`、
Markdown rendering、clickable link、URI handler、image loadを使わない。Responseは`no-store`でlogに残さない。
SPAは上記client-only sensitive-content acknowledgementを表示して取得した後だけrequestする。

Detail request tokenは正確な`(clientDataEpoch, currentGeneration, fileId)`をcaptureする。Captureした3値がlive epoch、
generation、selected fileと全て一致する場合だけSPAはresponseをadoptし、request token replacementはそのcaptureを
invalidateする。Mismatch時はmodel、DOM text、metadata row、comparison inputを作らずresponseをdisposeする。

Status: `200`。File IDがunknown、以前のgeneration/removed file所属、またはdisabled source所属なら
`404 stale-resource`。

### `POST /api/v1/repository/rescan`

Body:

```json
{}
```

Repositoryにrunning/queued commandがない場合だけ1 scan commandを受理する。Coordinatorがidleなら直ちに
開始し、別transactionがactiveならFIFOへqueueし、Repository summaryは`status: scanning`、
`progress.phase: waiting`、non-null `queuedAt`、null `startedAt`を返す。Jobはrequest時ではなくdequeue時の
active generationから開始する。Completeまたはbounded-partial replacementをatomic publishするまでcurrent
generationをreadableに保ち、publish時は全old file IDとcomparison selectionをinvalidateする。明示rescanが
fatal failureなら、そのattemptのpartial resultを含む全uncommitted resultをdiscardする。Last committed
generationとそのIDをreadableなまま保ち、top-level snapshotは`snapshotState: stale-after-fatal-rescan`、
Repository Sourceは`status: failed`を返す。
1件のbounded actionable lifecycle diagnosticがrescan failureとretained snapshotがstaleであることを説明する。
これは`staleFailures`のRepository entryと予約済みdiagnosticを作成または置換する。後のsuccessfulまたは
contract済みpartial Repository rescanが両方をclearし、別Sourceのcommitは両方を未解決のまま保持する。

Status: Updated source summary付き`202`、duplicate running/queued Repository commandだけ
`409 scan-in-progress`、bounded coordinatorがcommandを受理できない場合だけ`503`。

### `GET /api/v1/global/consent-preview`

候補Global pathに触れる前の、lexicalかつprocess-scopedなpreviewを返す。

```text
GlobalConsentPreview
├── previewId, previewDigest, allowlistVersion, traversalPlanVersion
├── entries[] { tool, origin, displayRoot, pathPatterns[], inputState }
└── excludedRuleIds[]
```

Serverは文書化された3つのtool-home environment variable、default-home value、同梱contractだけからこれを
派生する。それらのvariableは候補Global rootの特定だけに使い、inspected content内のreferenceのsubstitutionには
使わない。Serializeしないfrozen internal preview recordは、各entryの`lexicalRoot`をexact bounded raw stringまたは
nullとして追加保持する。Nullはraw/display valueがoversizedの場合だけ使う。In-limitのempty、relative、invalid、
control-containing、backslash-containing valueは別の`inputState`とともにexact raw stringのまま保持する。
`displayRoot`は`lexicalRoot`由来のone-way presentation escapeであり、pathへdecodeせずadmission inputにも使わない。
候補Global root配下の`stat`、`realpath`、directory enumeration、file readを行わない。Raw valueを
incrementalにcountして32 KiB
UTF-8を超えた時点で止め、limit内valueはincrementalにescapeして192 KiB UTF-8 outputを超える前に止める。
どちらのoverflowも`inputState: oversized`、`displayRoot: null`と固定localized
`global.previewTooLarge`表示だけを返し、normalization、canonicalization、root creation、readを行わない。
Userはenvironmentを修正して新previewを要求する。それ以外では`displayRoot`がescape済みの正確なlexical
valueを示し、invalidなempty/relative overrideはdefaultへ戻さずinvalidと表示する。Active consentがない場合、
新previewは以前の未同意previewをinvalidateする。Consentがactiveなら、このrouteはenvironmentを読み直さずreplacementも
作らず、`globalControl.previewId`で識別するexact frozen previewを同じdigest付きで返す。Purge後のfresh authenticated
clientはこれによりexact displayをrecoverでき、別previewには先にdisableが必要である。Keyed digestはsession、version、
順序付きtool entry、type tag付きlength-prefix encodingによる各exact raw `lexicalRoot`またはnull、および
別にlength-prefixしたescaped `displayRoot`またはnull、origin、state、exclusion、typed `TraversalPlan` version、
closed selection policy、canonical programをbindする。Escaped `displayRoot`をraw digest inputの代わりに使わないため、presentation
escape上で似て見える2つのraw valueはcollisionしない。

Public `pathPatterns` entryは全て同じshipped static typed `TraversalPlan`から生成し、説明表示であって別matcher/read
authorityではない。Consent/root admission後、exact-file operationはGlobal rootを`opendir`せず、exactな
root/ancestor/target chainだけを`lstat`して共通canonical identity checkを行い、neighborをenumerateしない。
Fixed-instruction-subtree operationはbounded walkに必要なplan指定instruction subtree directoryだけを`opendir`できる。
どのoperationもsibling setting、credential、state、plugin、その他neighbor pathをlist、stat、readしない。

Codex planだけは`codex-global-first-non-empty`を使う。`AGENTS.override.md`を安全にprobeし、overrideがnon-emptyなら
`AGENTS.md`へ一切operationせずshort-circuitし、absentまたは安全にemptyと確定した場合だけ次へ進む。Present candidateが
unsafe、unreadable、oversized、またはdecode不能ならfallbackせずfail closedする。Optionalな先頭UTF-8 BOMだけならempty、
whitespace-only contentもemptyとし、non-emptyなCodex instruction fileを最大1件だけpublishする。`absent`はroot
verification後にexact targetの`lstat`が明示的not-foundを返す場合だけとする。Permission、type、metadata、
ancestor/root、canonicalization、最初の観測後の消失はfallback conditionではなくfailureとする。

Status: `200`、capability/origin failureは`401`/`403`。

### `POST /api/v1/global/enable`

Body:

```json
{
  "confirmed": true,
  "allowlistVersion": "2026-07-17",
  "previewId": "opaque-preview-id",
  "previewDigest": "opaque-keyed-digest"
}
```

Response data:

```text
GlobalEnableResult
├── state: queued | active-no-job
├── acceptedTools[]（tool enumを0〜3個）
└── rejectedTools[]（tool enumを0〜3個）
```

UIはそのpreviewの3 toolすべての正確なGlobal path集合、lexical input state、exclusionを表示した後だけ
送信できる。Hostはfalse confirmation、古いcontract version、superseded preview、constant-time比較で不一致の
digestを拒否する。Stored internal raw `lexicalRoot`とstored typed traversal programだけを使い、environment inputを
読み直さず、`displayRoot`をreverse-convertせず、`pathPatterns`をauthorityとして受け付けない。Bodyは意図的にtool
selectorを持たず、initial enableはfrozen previewの全`eligible` entryをconfirmし、serverはそのexact closed-order setを
`confirmedTools`として導出する。Retryはconfirmed toolのうちSourceがまだないtoolをwork setに導出し、requestは
consented toolを追加、除外、並べ替えできない。Consent後、各eligible tool homeを独立にresolveする。Symlink、
junction、case、Unicode normalization、short name、その他aliasにより
canonical rootがpreviewに示したstored raw lexical absolute rootとcomponentごとに一致しない場合、enumeration前にそのtoolを
予約済みtool diagnostic付きで拒否し、canonical targetへ置換せずconsentを広げない。Lexically present-empty、relative、
invalid、oversizedなenvironment entryはconfirmせずretained Diagnosticも作らない。固定preview `inputState`/messageが
完全な説明となり黙ってfallbackしない。Lexically eligibleだがmissing、unreadable、その他unusableなrootはconsent後
rejectionとしてそのtoolの予約済みdiagnosticを使う。Oversized entryはconfirm/resolveできない。Consent activate前に
coordinatorは全confirmed toolのcapacityをreserveし、failureはstateを変えず`503`を返す。Consent後validationはrootを
0〜3個acceptできる。Reserve成功時はconsent activate、confirmed eligible toolの`unvalidated` control作成、validation/
admission/scan-job queueing全体をcommand epochと`pendingTools`で覆う1つのcancellable `GlobalEnableOperation`登録を
atomicに行う。
Initial enableは導出済み`confirmedTools`全体、retryは導出済みmissing-tool work set全体をstate変更前にreserveする。
Retryのreserve failureも既存control、
diagnostic、context、Sourceを変更せず`503`を返す。Rejectionはown shareをreleaseし、accepted workはown shareをqueued
scanへtransferする。全shareはterminal rejection、scan completion/failure/cancellation、またはdrain済みdisableでreleaseする。
全validation outcome/job transfer後、coordinator lock下で最後のoperation-ID/epoch/state checkを行う。その単一の
linearization pointでresponse dispositionをatomicに選択する。`202`では同時にoperationをcompleteにし、leaseをcloseして
unregisterする。`409`ではdrainingへ入り、cancellationがuntransferred shareとoperation-local resourceをreleaseした後だけ
leaseをcloseしてcancelledとなり、barrier cleanup前にunregisterする。Terminal operation historyを保持せず、後のresponse
byte deliveryで選択済みdispositionを変更できない。
Accepted tool rootごとに、正確に1 rootを持つ独立したtool固有Global Source用のprovisional
scan jobを1つ作り、異なるtoolのroot/fileをmergeしない。Rejected toolは`GlobalToolControl`所有のkey別予約済み
tool failure diagnosticを作成/置換し、Source、stale-failure entry、jobを作らない。`acceptedTools`と`rejectedTools`はこのrequestでvalidationしたtoolを
partitionする。Operationは全async stepの前後とcontrol/diagnostic mutationまたはjob enqueue直前に、operation ID/epoch、
non-aborted signal、`globalControl.state: active`をcheckする。Operationがfinal disposition pointへ先に到達した場合、後で
disableを受理してからresponseをdeliveryしても選択済み`202`を維持し、そのbarrierはaccepted workを通常どおりcancel/remove
できる。Disable barrierが先にlinearizeした場合はoperationをdrainし、late mutation/jobを許可せず
`409 global-disable-pending`を選択する。両dispositionを同時に生じさせない。Accepted jobが1件以上なら
`202 state: queued`、全件rejectなら`202 state: active-no-job`を返し、Source
summaryは返さない。どちらでもconsentと`globalControl`はactiveのままとする。Provisional Sourceとそのprogressはpublish
しない。Accepted scanをFIFOへqueueし、dequeue時のactive generationから開始して、completeまたはcontract済み
partial generationと同時にnew Sourceをatomic publishする。後続のsession
pollは各Sourceのscan commit後だけそのSourceを観測する。Publish成功時はその`GlobalToolControl`の予約済みtool
failure diagnosticを`sessionDiagnosticIds`からclearし、無関係なtoolのdiagnosticは変更しない。

同じexact active consentが既に存在する場合、commit済みGlobal Sourceが0個でも1個以上でも、このrouteはconfirmed済み
eligible toolのうちSourceがまだないtoolをretryするためだけに再度呼べる。Hostは同じsession-bound frozen preview
ID/digest、active consent、その`GlobalToolControl` recordを比較し、既存Sourceを変更せず
`globalControl.retryableTools`のtoolだけをvalidationする。Admit済みretained contextの再validationはdata modelの
close/discard/re-admit ruleに従い、root mismatchまたは検証不能ならold contextをcloseしてregistryから除去し、未公開IDを
破棄してからcontrolを`rejected`にする。別preview/rootを使うには先にGlobal
disableが必要で、missing toolがないrequestはconflictとする。Fatalな初回tool enableはfile/Source resultをpublishせず、
missing tool用の`StaleSourceFailure` entryを追加せず、既存entryとそこから派生するsnapshot stateをすべて保持する。
Affected `GlobalToolControl`所有のkey別予約済みtool failure diagnosticを作成/置換し、このexact-consent retryまたはdisableに必要なconsentと
`GlobalToolControl` stateだけを保持する。Lexical previewにeligible tool rootが1つもない場合はconsent/control
recordをactivateせず`400 no-eligible-global-root`を返す。Eligible toolがあってもconsent後validationで全件rejectした
場合は、上記active recovery/disable control付き`202 active-no-job`を返す。

Status: `202`、`400 consent-required`、`no-eligible-global-root`、`allowlist-version-mismatch`、または`consent-preview-mismatch`、
confirmed済みeligible toolにmissingがなければ`409 no-missing-global-tool`、active consentを変更するrequestなら
`409 active-global-consent-conflict`、enable/retry operationまたはそこからtransfer済みのinitial scan jobが
running/queuedなら`409 global-enable-in-progress`、Global
disableがpending/activeなら`409 global-disable-pending`、bounded coordinatorがenable operation全体のcapacityを
reserveできない場合だけ`503`。

### `POST /api/v1/global/rescan`

Body:

```json
{
  "sourceId": "opaque-enabled-global-source-id"
}
```

Global disableがpendingでない場合だけ、指定したenabled tool-specific Global Sourceのscan commandを1つ受理する。
`sourceId`はopaque IDでありpathではない。Repository rescanと同じFIFO、dequeue時base generation、atomic
publication、progress、invalidation、bounded capacity ruleを使う。そのSourceのrunning/queued scan commandは
最大1つで、duplicateを暗黙coalesceしたり2回目のreadにしたりしない。

FatalなGlobal rescanは何もcommitせず、そのfailed attemptからpartial resultを0件publishする。Top-level
`snapshotState: stale-after-fatal-rescan`、Sourceのnull `progress`と`status: failed`を返し、`enabled: true`、正確なconsent、validated済み
single-root record、last committed graph、そのgraphの全IDを保持する。1件のbounded actionable lifecycle
diagnosticがaffected Sourceを識別してretained session snapshotがstaleだと説明し、そのSourceの
`staleFailures` entryと予約済みdiagnosticを作成または置換する。後の同じSourceに対するsuccessfulまたは
contract済みpartial rescanがgraphをatomic replaceして両方をclearし、別Sourceのcommitは両方を保持する。

Status: updated source summary付き`202`。Unknown/removed Source IDは`404 stale-resource`、Global disableが
pending/activeなら`409 global-disable-pending`、そのSourceのrunning/queued scanとduplicateなら
`409 scan-in-progress`、bounded coordinatorが受理不能な場合だけ`503`。

### `POST /api/v1/global/disable`

Body:

```json
{}
```

全tool-specific Global Sourceに対するpriority security barrierとして動作する。Tool固有Global Source/graph、active consent
record、retained admitted Global root context、open Global inspection `FileHandle`、running/queued Global scan/enable commandの
いずれかが存在する場合、
coordinatorは`globalControl.state: disabling`とempty pending/retry arrayを設定し、command epochをincrementしてnew
Global-enable/Global-rescan commandを拒否する。Active transactionをabort/discardし、active/queued `GlobalEnableOperation`をabortして
validation/admission continuationがmutation/enqueueなしにdrainするまで待ち、最後のqueued Global command cancellation
sweep後にzero-I/O Global-disable transactionを次に実行する。中断したRepository commandはfresh counterでbarrier直後へ正確に
1回requeueし、中断したGlobal commandはrequeueしない。Pollingではretainedな全Global Sourceの
`status: disabling`、drain中active Sourceの`progress.phase: cancelling`、続いてrequeue済みRepositoryの
`progress.phase: waiting`が見えてよい。Drain中Global Sourceはnull `queuedAt`を持つ。Global scanをdrainする
場合はそのscanのcounter/`startedAt`を保持し、それ以外はzero counterとdisable-acceptance `startedAt`を使う。
Drain対象Repositoryはcounter/startを保持して
`queuedAt`をclearし、requeue後はzero counter、新しいnon-null `queuedAt`、null `startedAt`とする。
Disable commitはconsentをclearし、全Global Sourceとroot recordを削除し、open中のinspection
`FileHandle`をcloseして全Global source/metadata recordを削除する。さらに全`GlobalToolControl`所有の予約済みtool diagnosticを
`sessionDiagnosticIds`からclearし、control所有root contextとfrozen previewをすべてclose/removeしてNをN+1へincrementし、retained Repository
graphをrekeyする。Prior generation参照comparisonがすべて無効になってから返す。RequeueされたRepository
jobはN+1から開始し、後でN+2をcommitできる。除去した全Global Sourceの`staleFailures` entryと予約済み
diagnosticも削除するが、Repositoryのentryと予約済みdiagnosticは保持してsessionをstaleのままにする。Barrier cancellationはexpectedなのでfailure diagnosticを追加しない。
同じbarrierがqueued/active中のdisable requestはそのbarrierへjoinし、single commit完了時にreturnする。Barrierを
abortせず追加generationも作らない。Global Source、consent record、nonempty Global graph、retained validated
Global root record、open Global inspection `FileHandle`、
running/queued Global scan/enable commandが何もない場合、即時idempotent no-opとしてreturnし、generationを
incrementせずRepository workへ干渉しない。

Status: `200`。

## Method/media handling

- Unknown `/api/v1` pathは`404`、known pathへのwrong methodは明示的`Allow` header付き`405`。
- Unsupported media typeは`415`、malformed JSON/unexpected keyは`400`、oversized requestはparse前に`413`。
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

- 1つのbounded coordinatorが正確に1 root-admission/scan/disable commandずつ実行する。`GlobalEnableOperation`は1つの
  abort signal/command epochでvalidation/admission/job queueingを所有する。1 sourceあたりrunning/queued scan commandは
  最大1つでduplicate scanはconflict、別のRepositoryまたはtool-specific Global Source scanはFIFOへqueueして
  waiting phaseを示す。Disableは代わりにbarrier join/no-op ruleに従う。全scanは実際のdequeue時にcurrentな
  generationから開始する。
- 全scanと`GlobalEnableOperation`に`AbortSignal`を渡し、process shutdownは全workをabortする。Global disableは上記priority barrierで、
  active uncommitted transactionをabortし、enable validationをabort/drainして最後のqueued Global work cancellation sweep後に
  removalをcommitし、中断した
  Repository commandを1回requeueする。Deadlineではbounded partial generationとdiagnosticを作る。
- Successfulまたはcontract済みpartial scanは正確にN+1をcommitし、scanned Sourceと全carried Sourceのgeneration所有graph
  IDを再生成する。Process-lifetimeでstableなSource IDは変更しない。Scanned Sourceのstale-failure entryと予約済みdiagnosticだけをclearし、別Sourceの両方をcarryする。
  Fatalな明示rescanはpartial resultを含む全uncommitted resultをdiscardし、NとIDをactiveのままにし、retained
  session snapshotをstaleにmarkして、affected Sourceを識別するcap対象actionable out-of-generation lifecycle
  diagnosticとentryを1件作成または置換し、同じSourceの再failureでは両方を置換する。Nはlegalなbootstrap generation 0でも
  よい。Barrier cancellationは何もemitしない。
- Snapshot pollingとliveness heartbeatはNode process lifetimeを延長せずdataを永続化しない。Browserはmatching
  authenticated liveness responseからだけ2秒のmonotonic memory leaseをrenewする。Failure、lease expiry、hidden/page
  lifecycle event、process lossではended view表示前に中央purgeを実行する。Purgeはclient epochをincrementしてlate
  in-flight responseによるDTO/editor stateの復活を防ぎ、Monaco model/editor/worker/subscriptionをdisposeし、DOM/store
  contentとwarning acknowledgementをclearしてpending requestをabortする。Node process終了時はserver側capability、
  complete source content、source root、generation、diagnosticを破棄する。
- API callはMCP serverを起動せず、importを追わず、inspected URLを開かず、customization commandを
  invokeせず、inspected sourceへwriteしない。
- Enabled inspection sourceは`node:fs/promises`上に構築した1つの中央集約serviceだけでenumerate/readする。
  API request、relationship、source fileが与えた任意absolute pathは受け付けず、validated source IDとsource-relative
  enumeration recordだけを受け付ける。Enumeration、open直前、open後かつbyteを読む前、bounded read後の全candidate
  verification phaseは、次の正確な順序を使う。(1) candidate pathを`lstat`し、symbolic link、non-regular type、
  unexpected identityを拒否する。(2) これが成功した後だけcandidate `realpath`を解決し、`node:path.relative`で
  canonical containmentを検証する。(3) candidate pathを再び`lstat`し、identity、type、size、関連timestampが最初の
  `lstat`と一致することを要求する。したがってstable symlinkはcandidate `realpath`がfollowする前に拒否される。
  Enumeration時とopen直前にはlexical containment、root identity、全ancestor `lstat`も検証する。
  `node:fs.constants.O_NOFOLLOW`が存在し、そのNode.js/platform combinationで有効な場合は`O_NOFOLLOW`付きでopenする。
  Open後はbyteを読む前にordered candidate sequenceを実行し、pre-read `FileHandle.stat()`をそのphaseの両`lstat`結果と
  以前のsnapshotに比較する。Bounded read後かつparse、publish、commitより前にはrootとancestorのcheck、ordered
  candidate sequence、同じopen handleの`stat()`を反復する。Error、ambiguity、containment failure、metadata changeを
  検出した場合はbyte buffer全体を破棄してfail closedにする。必要なmetadataまたはcanonicalizationがunusableなら
  `safe-fs-boundary-unverifiable`をemitしてcandidateを拒否し、rootまたは共有ancestorがunverifiableならsourceを
  拒否する。
- Public Node.js APIにはportableなdirectory-handle-relative openがない。Check間にsource rootまたはancestorを置換する
  active adversarial processは全platformで初期リリースのthreat model外とし、final-component replacementも有効な
  `O_NOFOLLOW`が存在しない場合だけscope外とする。通常の同時editと全detectable raceはscope内で、全byteをdiscardする。Same-device bind mount、報告されない
  reparse behavior、Node.jsから利用不能なその他のOS semanticsは文書化したplatform limitationであり、absoluteな
  containment guaranteeではない。

## 必須contract test

1. 全API routeがmissing、wrong、expired-process capability、cross-origin、wrong-Host、navigation requestを
   session dataを返さず拒否する。
2. SuccessfulなRepository/Global rescanとGlobal disable後にold file IDが失敗する。Fatalな明示rescanは
   failed-attempt partialを0件publishし、last committed IDを保持し、retained session snapshotをstaleにmarkして、
   actionable lifecycle diagnosticでaffected Sourceを識別する。Bootstrap generation 0は自動初回scanのlegalな
   empty baseとする。Multi-Source sequenceではA/Bのentry-diagnostic pairが共存し、B successがAをclearせず、
   Aのbounded-partial successだけがAのpairをclearし、Aの再failureがAのpairだけを置換し、Global disableが
   除去Global Sourceのpairだけをclearすることを証明する。
3. Readable file detailはcompleteなauthored source、exact metadata/authored-relationship source slice、credential、
   environment-reference textをmask/reveal controlなしで返す。JSONC escape spelling、YAML quote/block spelling、
   TOML quote/date spelling、collection punctuation、source order、受理したduplicate occurrenceをtransportと
   structural comparison後も保持し、normalized semantic valueを表示へ置換しない。
   File summaryには`not-applicable | all-parsed | mixed | all-failed`だけを公開し、
   `(fileId, tool, kind)`ごとに正確に1つのrecognitionは`not-attempted | parsed | failed`とown diagnostic IDを公開する。
   Compatible provenanceを1回mergeし、inconsistent meaningはそのrecognitionをall-or-nothingでfailさせ、arrayはclosed
   tool-then-kind orderを使う。Comparison keyは`(tool, kind, fieldId, occurrence)`とする。Astral character、unpaired
   surrogate、combining sequence、通常BMP textにより、`SourceTextRange`がUTF-16 `String.prototype.slice` offsetを使い、
   UTF-8 limitを別に保つことを証明する。同じlogical occurrenceはmetadata/relationship/derivation間でidentical spanを
   reuseできるが、別occurrenceのpartial/nested/crossing overlapはrecognitionをfailさせる。
   返却する全metadata tuple `(tool, kind, fieldId)`とrelationship tuple
   `(tool, kind, relationship kind)`は、維持管理するpresentation allowlistに含まれなければならない。Unknownなauthored
   keyとreferenceは完全な`sourceText`からだけ利用可能とし、推論したmetadataまたはrelationshipを作らない。
   固定Codex default-hook fixtureは
   `targetOrigin: documented-default`、null `authoredTarget`、明示的な
   documented-default labelを返し、explicit manifest hookは`targetOrigin: authored`とexact occurrenceを返す。
   Sentinel process valueによりenvironment referenceをresolve/substitute
   しないことを証明する。SPAはdetail requestまたはcomparison構築前にin-memory sensitive-content
   acknowledgementを表示して取得し、削除済みreveal routeは`404`を返す。
4. Extra JSON key、path-shaped input、malformed/oversized body、wrong method/media typeが文書化済みsafe
   errorを返す。Exact-limitとcomplete record 1件超過fixtureにより、neutral-overlay base 5 MiB、lifecycle-diagnostic
   sub-budget 2 MiB、control sub-budget 1 MiB、complete session overlay 3 MiB、complete snapshot 8 MiB、detail 4 MiBの
   各budgetがcomplete recordだけをadmitすることを証明する。Post-commit lifecycleのadd/replace/clear/overflow fixtureは
   paired 2 KiB charge、16 KiB fixed-diagnostic reservation、compact keyed fallback、ordinary-detail suppression、old-charge
   creditを扱う。最大legalなstale state、Global control、Source progressのtransitionは1 MiB control reservation内に収まり、
   worst-case encodingが正確に1 MiB + 1 byteとなるbuild専用synthetic schema variantはfailureになる。Escape/key-order
   fixtureはaccount済みexact bufferがHTTP
   entity bodyであり、存在する場合の`Content-Length`と一致することを証明する。Scan構築時はbounded partial diagnosticを
   publishし、response時にtruncateしない。意図的に壊したover-limit committed-state fixtureはpartial `data`なしで
   `500 response-size-invariant`を返す。
5. Static traversal/encoded traversal attemptが`dist/public`外へ出ない。Pack済みのroot、`/compare`、
   `/global-consent`、`/files/<fileId>`が同じroot-absolute assetとCSPでbootし、正確なhashはNuxt bootstrapだけを
   authorizeしてmodified/unrecorded inline scriptやexecutable attributeを許可しない。
6. Repositoryと各tool-specific Global rescanのqueue order、duplicate rejection、abort、partial limit、fatal
   failure、pollingがwhole generationだけを公開する。
   別のSourceの後でqueueしたscanはその時点のcurrent generationから開始し、Global-disable barrierは文書化した
   N/N+1/N+2 sequenceを作り、aborted transactionを公開せず、受理済みRepository commandを1回requeueして保つ。
   Concurrentなrepeated disableは1 barrierへjoinし、既にemptyなGlobalへのno-opはRepository workを中断しない。
   Pauseしたvalidation/admission operationを最後のcancellation sweep前にabort/drainし、その後late continuationを解放しても
   mutation、diagnostic、context、ID、jobを作らない。全capacity shareを正確に1回transfer/releaseし、terminal operationを
   unregisterする。Deterministicなbarrier-race fixtureではoperationを(a) validation await中、(b) admission後かつ
   control/context/diagnostic mutation前、(c) job enqueue/final response disposition直前でpauseする。各pauseでbarrierが
   先なら`409`となり、late side effectを許さず、全untransferred shareをreleaseしてoperationをunregisterし、後のenableが
   capacityをreserveできる。Operationのfinal dispositionが先なら、disable受理後にresponse byteをdeliveryしても確定済み
   `202`を維持する。
   別のdeterministic delivery pauseでは、linearize済みSessionSnapshot/FileDetail responseを保持している間にscan commitまたは
   Global-disable commitでgenerationを進める。Envelope generationとpayloadが混在せず、old responseを無視し、newer snapshot
   採用時に`clientDataEpoch`をincrementしてold stateをabort/disposeし、detailはcapture済みepoch/generation/fileIdが全て
   一致する場合だけadoptすることを証明する。
7. Fragment削除後に全allowlist client routeをreloadしてもAPI request、session data公開がなく、実行中
   processの表示済みlaunch URLを開くよう案内する。Unknown route/malformed asset pathにSPA fallbackを返さない。
   Liveness testはvisible pageでのprocess終了、request timeout、lease expiry、hidden/page lifecycle purge、異なる
   `sessionId`でのport再利用、client epoch変更後のlate in-flight responseを扱い、pre-purge inventory/detail/comparison/
   editor/authored-content DTO/DOM stateまたはwarning acknowledgementが残留・復活しないことを証明する。Active consentが
   あるhidden-to-visible recoveryではretained capabilityだけで認証し、purge済みIDを保持・比較せず返された`sessionId`を
   採用してfresh `globalControl` projectionを構築する。Disableはそのprojectionから直ちに利用でき、同じfrozen preview
   ID/digestを取得・検証した後はretry controlだけを再構築する。明示Resume inspection actionはmatching sessionを再取得して
   default stateのfresh inventory summaryを構築するが、pre-purge authored content、selection、filter、detail、comparison、
   editor、acknowledgementを復元しない。後のdetail/comparison requestにはnew acknowledgementを要求する。
8. Global consent previewは候補pathに触れず、confirmationをexact raw internal `lexicalRoot`、typed traversal-plan
   version/program、preview digestにbindする。Changed/superseded previewまたはcanonical alias mismatchはreadを許可できない。
   Escape-collision、control-character、backslash fixtureはdigestがraw valueをlength-prefixし、enableがstored raw valueだけを
   使ってenvironmentを再読込せず`displayRoot`をreverse-convertしないことを証明する。Exact-limitと1 byte超過のroot/display
   fixtureで、`oversized`がnormalization、prefix表示、allocation expansion、authorizationなしにnullを返し、
   all-ineligible previewがconsentをactivateしないことを証明する。Provisional enable workはSourceをpublishしない。
   正常なcomplete/partial commitは0〜3個の別々に
   identifiedされたGlobal Sourceを作り、toolごとに最大1個、Sourceごとに正確に1 rootとし、cross-tool Source mergeを
   行わない。All-failed/mixed outcomeのfailed missing-tool jobは`StaleSourceFailure` entryを追加せず、key別予約済み
   tool diagnosticを作成/置換して既存entryとそこから派生するsnapshot stateをすべて保持し、successful tool commitは
   無関係なentryとdiagnosticをcarryする。
   Prior-currentとprior-staleの両caseをtestする。Initial activationでconsent後rootの全件rejectは
   `202 active-no-job`、new job 0件、Global Source 0件、
   active `globalControl`、retryable tool、affected `GlobalToolControl`ごとにreplace可能な予約済みdiagnostic 1件となり、partial
   acceptanceはaccepted/rejected toolをpartitionする。All-rejected retryもnew job/Sourceを0件とし既存Sourceを保持する。
   Source publish成功はown control diagnosticをclearし、無関係な
   outcomeは保持し、disableはGlobal Source未公開でも全control diagnostic/contextを削除する。
   Validation/admissionとinitial scan中はrunning enable/retry operationが所有する全toolを`pendingTools`へ表示し、
   `unvalidated` toolをretryableにしない。Mixed activation中は既にrejectedまたはnon-pending admittedとなったtoolを
   `retryableTools`へ表示してよいが、`pendingTools`がemptyになるまでretryをdisabledとし
   `409 global-enable-in-progress`を返す。Disableは全期間利用できる。
   Initial-enable/retryのreserve exhaustionはいずれもconsent/control/diagnostic/Source stateをbyte-for-byte変更せず`503`を
   返す。Exact-capacityと全terminal outcomeでreservation/operation-history leakがないことを証明する。
   Fatal初回scan後のretryでretained rootが変更済みまたは検証不能ならold contextをclose/unregisterし、未公開IDを
   破棄して、後の再admission前にauthorityなしのrejected controlを残す。
   Exact-active-consent retryはconfirmed missing toolだけをqueueし、
   changed consentには先にdisableを要求する。Traversal call traceはpublic patternがtyped plan由来で、exact Global targetは
   root directoryをopenせずexact ancestor/target chainだけにtouchし、fixed instruction-subtree walkはそのsubtreeだけをopenし、
   neighboring setting、credential、state、plugin pathへI/Oしないことを証明する。
9. 中央集約したNode.js filesystem serviceは、全supported OSでlexical/canonical escape、symbolic-link path
   segment、non-regular candidate、必須enumeration/pre-open/post-open-pre-read/post-read snapshotの全detectable
   mismatchを拒否する。各phaseのcall traceは、candidate-path `lstat`、次にcandidate `realpath`と`path.relative`
   containment、次に2回目のcandidate-path `lstat`という正確な順序と、`realpath`直前・直後の`lstat`結果でidentityが
   一致することを証明する。Stable symlink fixtureは最初の`lstat`がcandidate `realpath`をcallせず拒否することを
   証明する。利用可能な場合は有効な
   `O_NOFOLLOW`を使う。Root、parent、final-entry replacement fixtureは、通常の同時変更またはその他のdetectable
   changeでbyteをpublishしないことを証明する。報告されたerror、ambiguity、unusable metadata/canonicalizationは
   `safe-fs-boundary-unverifiable`を返す。観測不能なOS behaviorはplatform limitationとして記録し、threat model外の
   active-adversary raceに対するproofとして数えない。
10. Bootstrapは変更されたpacked `engines.node` contract、または
    `>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`外の実行Node.js versionをCLI import/bind前に拒否する。Static loaderは
    oversized/malformed/extra-key/duplicate manifest、symlink/non-regular asset、unexpected file、
    path/MIME/size/hash mismatch、relative/external executable URL、`<base>`、nonce、executable attribute、未記録inline
    scriptをbind前に拒否する。BuildはNuxtの固定`200.html`/`404.html`だけを要求後に除去し、それ以外の
    non-`index.html` HTML fileを拒否する。Packed file listは正確なnpm allowlistと一致する。Build/package
    verificationはcleanな`.output`/`.build`/`dist` treeから開始し、`dist`を2 manifestとlisted static/server
    recordだけにrecursive matchさせ、stale outputを拒否する。
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
