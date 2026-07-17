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
   LAN address、Unix socketへbindしない。Bind前にpackage version、closedなstatic/server manifest、それらが
   listする全assetを検証して、全inspected-source operationに使う中央集約したNode.js filesystem serviceを
   初期化する。Package assetがmissing、malformed、inconsistent、またはfilesystem serviceが利用不能なら、
   HTTP session開始前にfixed actionable CLI errorで終了する。Executableなruntime product codeはすべて
   JavaScriptとし、生成HTML shell、CSS、JSON manifest、documentation、license fileはdeclarativeかつ
   non-executableなpackage artifactとする。HTML内のmanifest-authorized bootstrapはJavaScript executable codeの
   ままで、後述するCSP要件に従う。Packageはnative addon、platform固有artifact selector、runtime download、
   runtime build pathを含まない。
2. Process開始時にrandom 256-bit capabilityを作り、SPAを
   `http://127.0.0.1:<port>/#cap=<base64url>`で開く。Browser openが失敗またはdisabledなら同じlocal
   URLを表示する。
3. FragmentはHTTP serverへ届かない。SPAは1回だけ読み、`history.replaceState`で削除し、memory内だけに
   保持し、全`/api/v1` requestへ`Authorization: Bearer <capability>`を送る。Capabilityをcookie、query
   string、`localStorage`、`sessionStorage`、IndexedDB、service worker、その他durable/browser-managed
   storeへ書かない。そのためfragment削除後のreload/direct navigationはauthorityを持たず、SPAはAPI
   requestを行わず「表示済みlaunch URLを再度開く」ことを正確なnext stepとするsafeなauthorization-lost
   viewを示す。そのURLは同じprocessのlifetime中だけ再利用でき、fragment付き`/`へ戻す。
4. Hostはcapabilityをconstant timeで比較し、header、fragment、token、request/response body、source
   path、raw parser error、source valueをlogに残さない。
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

Errorにはstack trace、任意exception message、raw content、secret、API capability、enabled source外canonical
pathを含めない。Correlation IDを返してよいが、process memory内だけに保持する。

## Route

### `GET /api/v1/session`

Current session snapshotとscan progressを返す。Source scan中はclientがこのendpointをpollする。Watcher、
SSE、WebSocketは不要。

Response data:

```text
SessionSnapshot
├── sessionId, createdAt, activeGeneration, limits, maskingWarning, sessionDiagnosticIds
├── sources[]
│   ├── sourceId, kind, enabled, status, generation
│   ├── boundaries[] { boundaryId, tool, displayRoot, origin }
│   ├── conditionFacts[] { tool, ruleId, affectedRuleIds, behaviorRefs, strategyRefs,
│   │                      condition { key, status, reasonCode, basis } }
│   └── progress null | { phase, visitedEntries, candidateFiles, readBytes, diagnosticCount, queuedAt, startedAt }
├── files[]
│   └── fileId, sourceId, boundaryId, relativePath, aliasPaths, readState, parseStatus, sizeBytes,
│       encoding, recognition summaries, diagnostic IDs
└── diagnostics[]（active-generation recordとbounded out-of-generation lifecycle record）
```

Inventory summaryはsource text/raw mask valueを含まない。Sort orderはsource kind、boundary/tool、normalized
relative path、file IDの決定的順序。
Recognition summaryはtool/kind、provenance count、provenance documentation/applicability stateのsort済み
setだけを持ち、aggregate winnerを発明しない。
返す全diagnosticはactive generation/source/file graphまたは`sessionDiagnosticIds`から参照され、client起因
request errorをここへ蓄積しない。正確なfile/source/generation/session capとoverflow sentinelは`limits`から得る。
Progressは`idle`、`failed`でnull、active workおよびdata modelで定義したfinal `ready`/`partial`
counterではpresentとする。最初のlegal snapshotはfile/diagnosticなしのbootstrap generation 0で、自動の初回
Repository scanがfatal failureでもreadableなまま残る。

Status: `200`、capability/origin failureは`401`/`403`。

### `GET /api/v1/files/{fileId}`

Active-generation file detailを1件返す。

```text
FileDetail
├── file summary fields
├── maskedText（non-readable read stateではnull）
├── masks[] { maskId, kind, placeholder }
├── recognitions[]
│   ├── recognitionId, fileId, tool, kind, masked metadata
│   └── provenances[] { provenanceId, ruleId, discoveryClass, matchedPath, seed IDs, depth,
│                       declarationKey, scope, documentationStatus, order,
│                       behaviorRefs, strategyRefs, sourceRefs,
│                       applicability { summary, strategyRefs, evaluatedFromGeneration,
│                                       condition facts[] } }
├── relationships[] { relationshipId, fromFileId, fromRecognitionId, fromProvenanceId,
│                     ruleId, kind, masked target,
│                     boundary status, resolution status,
│                     documentationStatus, behaviorRefs, strategyRefs, sourceRefs,
│                     applicability { summary, strategyRefs, evaluatedFromGeneration,
│                                     condition facts[] } }
└── diagnostics[]
```

Responseはinert JSON stringを使う。SPAは`maskedText`をVue text bindingでrenderし、`v-html`、Markdown
rendering、clickable link、URI handler、image loadを使わない。

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
generationをreadableに保ち、publish時は全old file ID、comparison selection、revealed valueをinvalidateする。

Status: Updated source summary付き`202`、duplicate running/queued Repository commandだけ
`409 scan-in-progress`、bounded coordinatorがcommandを受理できない場合だけ`503`。

### `GET /api/v1/global/consent-preview`

候補Global pathに触れる前の、lexicalかつprocess-scopedなpreviewを返す。

```text
GlobalConsentPreview
├── previewId, previewDigest, allowlistVersion
├── entries[] { tool, origin, displayRoot, pathPatterns[], inputState }
└── excludedRuleIds[]
```

Serverはprocess environment、default-home value、同梱contractだけからこれを派生し、候補Global root配下の
`stat`、`realpath`、directory enumeration、file readを行わない。Raw valueをincrementalにcountして32 KiB
UTF-8を超えた時点で止め、limit内valueはincrementalにescapeして192 KiB UTF-8 outputを超える前に止める。
どちらのoverflowも`inputState: oversized`、`displayRoot: null`と固定localized
`global.previewTooLarge`表示だけを返し、normalization、canonicalization、root creation、readを行わない。
Userはenvironmentを修正して新previewを要求する。それ以外では`displayRoot`がescape済みの正確なlexical
valueを示し、invalidなempty/relative overrideはdefaultへ戻さずinvalidと表示する。新previewは以前の未同意
previewをinvalidateする。Keyed digestはsession、version、順序付きtool entry、正確な表示rootまたはnull、
pattern/state、exclusionをbindする。

Status: `200`、capability/origin failureは`401`/`403`。

### `POST /api/v1/global/enable`

Body:

```json
{
  "confirmed": true,
  "allowlistVersion": "2026-07-15",
  "previewId": "opaque-preview-id",
  "previewDigest": "opaque-keyed-digest"
}
```

UIはそのpreviewの3 toolすべての正確なGlobal path集合、lexical input state、exclusionを表示した後だけ
送信できる。Hostはfalse confirmation、古いcontract version、superseded preview、constant-time比較で不一致の
digestを拒否する。Environment inputを読み直さずstored preview valueを使う。Consent後、各eligible tool
homeを独立にresolveする。Symlink、junction、case、Unicode normalization、short name、その他aliasにより
canonical rootが表示済みlexical absolute rootとcomponentごとに一致しない場合、enumeration前にそのtoolを
actionable diagnostic付きで拒否し、canonical targetへ置換せずconsentを広げない。無効env overrideも
tool固有diagnosticを返して黙ってfallbackしない。Oversized entryはconfirm/resolveできない。Command受理時に
logical Global sourceをenableしscanningとしてpublishする。別transactionがactiveなら
`progress.phase: waiting`としてFIFOへqueueし、scanはdequeue時のactive generationから開始してready/partialを
atomic publishする。

Status: `202`、`400 consent-required`、`allowlist-version-mismatch`、または`consent-preview-mismatch`、
Globalが既にenabledまたはrunning/queued enable commandを持つ場合は`409`。

### `POST /api/v1/global/rescan`

Body:

```json
{}
```

Globalがenabledかつdisablingでない場合だけGlobal scan commandを1つ受理する。Repository rescanと同じFIFO、
dequeue時base generation、atomic publication、progress、invalidation、bounded capacity ruleを使う。
Running/queued Global scan/enable commandは最大1つで、duplicateを暗黙coalesceしたり2回目のreadにしたりしない。
FatalなGlobal enable/rescanはcommitせず、null `progress`の`status: failed`を返す。`enabled: true`、正確な
consent、accepted済みvalidated boundary record、任意のprior Global graphを保持し、後の明示rescan/disableを
許可する。

Status: updated source summary付き`202`。Globalがnot enabledまたはdisablingなら`409 source-disabled`、
running/queued Global scan/enableのduplicateなら`409 scan-in-progress`、bounded coordinatorが受理不能な場合だけ
`503`。

### `POST /api/v1/global/disable`

Body:

```json
{}
```

Priority security barrierとして動作する。Globalがenabled、consented、running、queuedのいずれかなら、
coordinatorはactiveなtransactionをabort/discardし、全queued Global commandをcancelしてzero-I/O
Global-disable transactionを次に実行する。中断したRepository commandはfresh counterでbarrier直後へ正確に
1回requeueし、中断したGlobal commandはrequeueしない。PollingではGlobalの`status: disabling`、drain中active
sourceの`progress.phase: cancelling`、続いてrequeue済みRepositoryの`progress.phase: waiting`が見えてよい。
Global progressはnull `queuedAt`を持つ。Global scanをdrainする場合はそのscanのcounter/`startedAt`を保持し、
それ以外はzero counterとdisable-acceptance `startedAt`を使う。Drain対象Repositoryはcounter/startを保持して
`queuedAt`をclearし、requeue後はzero counter、新しいnon-null `queuedAt`、null `startedAt`とする。
Disable commitはconsentをclearし、全Global source-root recordをinvalidateし、open中のinspection
`FileHandle`をcloseして、全Global raw byte/recordを削除し、NをN+1へincrementし、retained Repository graphを
rekeyする。Prior generation参照comparison/mask/revealがすべて無効になってから返す。RequeueされたRepository
jobはN+1から開始し、後でN+2をcommitできる。Barrier cancellationはexpectedなのでfailure diagnosticを追加しない。
同じbarrierがqueued/active中のdisable requestはそのbarrierへjoinし、single commit完了時にreturnする。Barrierを
abortせず追加generationも作らない。Global enabled flag、consent record、nonempty graph、retained validated root
record、open inspection `FileHandle`、
running/queued Global scan/enable commandが何もない場合、即時idempotent no-opとしてreturnし、generationを
incrementせずRepository workへ干渉しない。

Status: `200`。

### `POST /api/v1/files/{fileId}/reveals`

Body:

```json
{
  "maskId": "opaque-active-mask-id"
}
```

Active readable fileへの明示action後、正確に1つのraw valueを返す。

```json
{
  "apiVersion": 1,
  "generation": 3,
  "data": {
    "fileId": "opaque-active-file-id",
    "maskId": "opaque-active-mask-id",
    "value": "the explicitly requested value"
  }
}
```

Serverはdurable reveal stateを作らない。SPAはopen file view内だけに値を保持し、route close、file removal、
generation変更、Global disable、session終了時にdropする。Responseは`no-store`でbodyをlogに残さない。

Status: `200`、`404 stale-resource`、`409 file-not-readable`（`masking-overflow`を含む）、
`422 unknown-mask`。

## Method/media handling

- Unknown `/api/v1` pathは`404`、known pathへのwrong methodは明示的`Allow` header付き`405`。
- Unsupported media typeは`415`、malformed JSON/unexpected keyは`400`、oversized requestはparse前に`413`。
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

- 1つのbounded coordinatorが正確に1 transactionずつ実行する。1 sourceあたりrunning/queued scan commandは
  最大1つでduplicate scanはconflict、別source scanはFIFOへqueueしてwaiting phaseを示す。Disableは代わりに
  barrier join/no-op ruleに従う。全scanは実際のdequeue時にcurrentなgenerationから開始する。
- 全scanに`AbortSignal`を渡し、process shutdownは全workをabortする。Global disableは上記priority barrierで、
  active uncommitted transactionをabortし、queued Global workをcancelし、次にremovalをcommitし、中断した
  Repository commandを1回requeueする。Deadlineではbounded partial generationとdiagnosticを作る。
- Successfulまたはcontract済みpartial scanは正確にN+1をcommitし、scanned/carried両sourceのIDを再生成する。
  Fatal attemptはNとIDをactiveのままにしてcap対象out-of-generation lifecycle diagnosticだけをemitする。
  Nはlegalなbootstrap generation 0でもよい。Barrier cancellationは何もemitしない。
- Session pollingはsession lifetimeを延長せずdataを永続化しない。Node process終了時にcapability、raw
  value、source root、generation、diagnosticを破棄する。
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
- Public Node.js APIにはportableなdirectory-handle-relative openがない。`O_NOFOLLOW`が存在しないか有効でない場合を
  含め、check間にancestorまたはfinal componentを置換するactive adversarial processは初期リリースのthreat model外
  とする。通常の同時editと全detectable raceはscope内で、全byteをdiscardする。Same-device bind mount、報告されない
  reparse behavior、Node.jsから利用不能なその他のOS semanticsは文書化したplatform limitationであり、absoluteな
  containment guaranteeではない。

## 必須contract test

1. 全API routeがmissing、wrong、expired-process capability、cross-origin、wrong-Host、navigation requestを
   session dataを返さず拒否する。
2. Repository/Global rescanおよびGlobal disable後にold file/mask IDが失敗する。Bootstrap generation 0は自動
   初回scanのlegalなempty baseで、初回fatal attempt後もactiveに残る。
3. Revealは要求値だけを返し、adjacent valueを返さず、log、diagnostic、session snapshot、後続file
   responseに含まれない。
4. Extra JSON key、path-shaped input、malformed/oversized body、wrong method/media typeが文書化済みsafe
   errorを返す。
5. Static traversal/encoded traversal attemptが`dist/public`外へ出ない。Pack済みのroot、`/compare`、
   `/global-consent`、`/files/<fileId>`が同じroot-absolute assetとCSPでbootし、正確なhashはNuxt bootstrapだけを
   authorizeしてmodified/unrecorded inline scriptやexecutable attributeを許可しない。
6. 両rescan routeのqueue order、duplicate rejection、abort、partial limit、fatal failure、pollingがwhole generationだけを公開する。
   別sourceの後でqueueしたscanはその時点のcurrent generationから開始し、Global-disable barrierは文書化した
   N/N+1/N+2 sequenceを作り、aborted transactionを公開せず、受理済みRepository commandを1回requeueして保つ。
   Concurrentなrepeated disableは1 barrierへjoinし、既にemptyなGlobalへのno-opはRepository workを中断しない。
7. Fragment削除後に全allowlist client routeをreloadしてもAPI request、session data公開がなく、実行中
   processの表示済みlaunch URLを開くよう案内する。Unknown route/malformed asset pathにSPA fallbackを返さない。
8. Global consent previewは候補pathに触れず、confirmationをexact preview digestにbindする。Changed/
   superseded previewまたはcanonical alias mismatchはreadを許可できない。Exact-limitと1 byte超過のroot/display
   fixtureで、`oversized`がnormalization、prefix表示、allocation expansion、authorizationなしにnullを返すことを
   証明する。
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
10. Static loaderはoversized/malformed/extra-key/duplicate manifest、symlink/non-regular asset、unexpected file、
    path/MIME/size/hash mismatch、relative/external executable URL、`<base>`、nonce、executable attribute、未記録inline
    scriptをbind前に拒否する。BuildはNuxtの固定`200.html`/`404.html`だけを要求後に除去し、それ以外の
    non-`index.html` HTML fileを拒否する。Packed file listは正確なnpm allowlistと一致する。Build/package
    verificationはcleanな`.output`/`.build`/`dist` treeから開始し、`dist`を2 manifestとlisted static/server
    recordだけにrecursive matchさせ、stale outputを拒否する。
