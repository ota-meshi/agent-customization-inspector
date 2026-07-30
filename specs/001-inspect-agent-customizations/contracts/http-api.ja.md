# Contract: Local Session Transport

[English](http-api.md)

**API version**: 1
**Transport**: `localhost`（loopbackのみ）へbindし、authenticationをdisable（`auth: false`）した
devframe 0.7.5 standalone host
**RPC namespace**: 全session functionを`agent-customization-inspector:` name prefixで登録する

このcontractは、eslint/config-inspectorと同じ基盤であるdevframe local-tool frameworkを
通じて、static Nuxt SPAを同じprocessのNode inspection hostへ接続する。このfileはcross-reference安定の
ため歴史的な`http-api` filenameを保持するが、定義する内容はlocal session transportの全体である。
Public network APIではない。Session channelはopaque IDとclosed commandだけを受け付け、
filesystem path、URL、command、source text、parser option、glob、executable contentを受け付ける
functionはない。

FR-022は、発行済みの`localhost` authorityにおけるexactな2つのclosed internal-loopback class
だけを認可する。

1. **Packaged UI serving** — packaged UI assetへのunauthenticatedな`GET`/`HEAD`。すなわち
   devframeが`cli.distDir`（`dist/public`）から`/`でserveするbuilt Nuxt SPA outputで、SPA shell、
   そのclient-route fallback、devframe自身のconnection-discovery metadataを含む。Serveされる
   static contentはsession dataを含まない。
2. **Local session RPC channel** — 以下に宣言するfunctionを運ぶdevframe RPC channel（同じ
   loopback authorityでのWebSocket upgradeとdevframe自身のmessage frame）。Frame encodingは
   devframeが所有する: このadapterは全messageをstructured-clone textとして運び、product側は
   functionごとのwire formatを宣言しない。

どちらもoutbound requestでもMCP connectionでもない。Non-loopbackまたはremote authority、
customization-selected destination、別machineへの調査content送信は禁止対象のままとする。

## Host要件

1. Processはdevframeが選択したlocal portへ、固定のhost名`localhost`（platformのresolverがIPv4 `127.0.0.1`またはIPv6 `::1`として解決する）を通じてloopback interfaceだけでbindする。Host overrideはなく、どの
   configuration/flagも`0.0.0.0`、LAN address、Unix socketへbindしない。全inspected-source
   filesystem operationはinspection module（`src/server/inspection/`）が発行する。他の
   production moduleはNode.jsのfilesystem APIをimportせず、その前段に別のadmission serviceは
   存在しない。Node.js互換性は
   `engines.node`で1回だけ宣言してpackage managerがenforceし、package/asset integrityはpackage
   testとrelease gateがenforceする。Hostは自身のpackaged artifactをruntimeで再検証しない
   （Constitution Principle I）。
2. Session hostはloopback bindingの内側でunauthenticatedに動作する。Productはper-session
   token/capability、bearer header、独自のorigin/fetch-metadata classification、CORS出力を
   追加せず、config-inspectorと
   同じくdevframe authenticationをdisable（`auth: false`）する。Loopback bindingがhost-side
   protectionの全てである（QR-003、Constitution § Quality and Safety Standards）。残余limitationを文書化する。すなわち
   inspector実行中は、他のlocal processと、DNS rebindingを介したmalicious web pageがsessionへ
   到達し得る。devframeはWebSocket upgradeへ自身のorigin gateを適用しており、それが
   product所有のcheckを置かない理由である。ただしそのgateはloopback判定に一致する
   hostnameをすべて許可するため、このlimitationを狭めない（research.md § 8）。Serveされるcontentはuser自身のsecretを含み得るため、hostを起動machineの外へ
   決して公開しない。
3. Static servingはdevframe-ownedである。ServeされるSPA shellとassetはNuxt buildがpackaged
   `dist/public`へ出力したものそのままであり、productはstatic-assets manifest、per-asset
   integrity再検証、HTML alias rule、hand-written routerを一切定義しない。Nuxtは
   `app.baseURL: '/'`、CDN URLなしを使うため、shellは全client routeで変更なしに動作する。
   Static servingはpackaged UI output directoryの外へ到達せず、inspected fileへfallbackしない。
4. 起動時にhostは正確な`http://localhost:<port>/` URLを起動元terminalへ1回表示する。自動browser
   openingはdevframe-ownedかつFR-001に基づくbest-effortであり、`--no-open`はopeningを何も出力
   せずに抑止する。Unsupportedまたはfailedのhelperはstartupを妨げず、表示済みURLがfallbackとして
   残る。devframeはhelper outcomeを公開しないため、productはbrowser
   opening outcomeのwarningを捏造しない。Helperはinspection由来のcontentもpathも受け取らない
   （FR-022）。任意のclient routeのreload/direct navigationにtokenは不要である。Serveされる
   shellはsession dataをembedせず、新しくloadしたSPAはRPC channelだけを通じてstateをadoptする。
5. 固定help/version textと必須の起動元terminal向け1回限りlaunch lineのほかに、hostはtelemetryも
   operational-event streamも定義しない。FR-022が既に起動
   machine外への送信を禁止している。Terminal/UI outputを読むのはinspected fileを所有する同じ
   userであるため、failureは通常どおり報告する。すなわち実際のerror messageを、product定義の
   content filterなしで表示または返却する。
6. 宣言済みparameterを持つ各functionは、その文書化済みparameterだけを受け付け、strict manual type/enum guardで検証する。
   Extra key、path-shaped value、malformed argumentは文書化済みsafe rejectionで拒否する。`Parameters: none`と
   宣言したfunctionはinputを一切readしないため、boundaryで検証するものがない。functionがreadしないargumentの拒否は、
保護すべきfailure modeを持たないruntime guardだからである。宣言する
   全resultとrejectionは1つのcompleteなJSON-serializable value — plain object、array、string、number、booleanのみで、`Map`、`Set`、`Date`、class instanceを含まない — とする。Transport容量は
   製品定義のrequest-size上限ではなくNode.js、devframe、実行環境から継承する。

## RPC function一覧

| Function | Kind | Purpose |
|---|---|---|
| `agent-customization-inspector:get-session` | read | Full `InspectionSession` snapshot、またはfence中のcontrol-only `GlobalFenceRecoverySnapshot` |
| `agent-customization-inspector:get-file-detail` | read | Active-generationの`FileDetail` 1件 |
| `agent-customization-inspector:rescan-repository` | command | 明示Repository scan command 1件の受理 |
| `agent-customization-inspector:get-global-consent-preview` | read | Currentまたはfrozenの`GlobalConsentPreview` |
| `agent-customization-inspector:create-global-consent-preview` | command | Unconsented previewのcaptureとatomicなcreate/replace |
| `agent-customization-inspector:enable-global` | command | Session-wide consentの確認。Initial enableとactive-consent retry |
| `agent-customization-inspector:rescan-global` | command | Enabled Global Source 1件のscan command受理 |
| `agent-customization-inspector:disable-global` | command | Priority Global-disable barrier |

Comparison viewは2件の`get-file-detail` resultからclient側で構築し、独立したcomparison
functionは存在しない。Catalogのどこにもmasking、redaction、reveal、environment-resolution
functionは存在せず、hostはdevframeのoptional MCP routeをenableしない。

同じchannelには、このcatalogではなくframeworkが無条件に登録するdevframe自身のbuilt-inも載る:
`devframe:agent:list-tools` / `invoke-tool` / `list-resources` / `read-resource`（空 —
productはagent toolもresourceも登録しない）、`devframe:rpc:server-state:subscribe` / `get` /
`set` / `patch`（未使用 — productはserver stateを共有しない）、`devframe:streaming:*`（未使用 —
productはstreaming channelを宣言しない）。Editor/finder helper（`devframe:open-in-editor`、
`devframe:open-in-finder`）はこのproductがimportしないopt-in recipeであり、登録されない。

## 共通resultとerror

成功したinspection-data result:

```json
{
  "globalContentEpoch": 4,
  "repositoryGeneration": 3,
  "globalGeneration": 1,
  "data": {}
}
```

通常のinspection-data成功resultはすべて`globalContentEpoch`、`repositoryGeneration`、
`globalGeneration`（Global sequenceが存在しない間はnull）を持つ。RepositoryとGlobalの
inspectionはlifecycleが独立であるため、それぞれ独立したgeneration sequenceを保つ（FR-030）。
すなわちRepository sequenceはbootstrap generation 0から始まり、Global sequenceはenable commitが
generation 1として作成し、disableが何もcommitせずに破棄する。Full `InspectionSession`では
result-levelの値が`data.repositoryGeneration`と`data.globalGeneration`に一致し、`FileDetail`では
返却する全generation-owned IDがそのfileのowning sequenceのexactなcommitted generationに属する。
Serverはepochと両generationをcaptureしてcomplete
payloadを構築し、immutable success resultをbindする前にsession coordinator lock下でepochが不変
かつ`globalDisableInProgress`がnullのままであることを再検証する。再検証失敗時はresultを破棄して
`global-disable-pending` conflict rejectionを返す。Lock解放後に既にbind済みのresultをdeliverして
よいが、あるgenerationを読んで別generationのdataを構築し、後からresultのlabelを付け替えては
ならない。Disable受理前に完全にbind済みのresultはboundedなpre-fence-authorized responseとして
残り得るが、browserはgreater epochまたはfenceを観測後にこれをrejectまたはpurgeする。

通常のresult shapeは、後述するexactなcontrol-only `GlobalFenceRecoverySnapshot`には適用しない。
これはgenerationもinspection graphも含まない。

Inspection graphを返さないpreview/command successは`{ globalContentEpoch, data }`を
使い、result-levelのgeneration fieldを省略する。文書化済みresult内部のgenerationは明示的なcommand
outcomeとする。これによりcontrol resultをgeneration snapshotとして提示せずepoch-awareに保つ。

APIはparameter、file、item件数、parser構造、snapshot、detail、resultについて製品固有の数値上限を
定義しない。容量はNode.js、parser、OS、filesystem、browser、実行環境から継承する。Response
serializationはdevframe channelが所有する。Handlerは宣言済みresult valueを返し、handlerがreturnした
後のserialization/encodingまたはdelivery failureは、handlerがcommitしたstateをrollbackも
duplicateもせずそのrequestの通常のerrorとして報告する。Successful resultを
報告せず、部分的にdeliverされたmessageをpartial resultとして扱わず、clientはtransport failureと
まったく同じようにcommit済みgenerationを再取得する。Domain layerはfailureのcauseを一切classifyしない。

決定的rejection:

```json
{
  "error": {
    "code": "stale-resource"
  }
}
```

各functionのoutcomeは、宣言済みのclosed resultまたはrejection variantのいずれか1つ、または
unexpected failureのordinary errorとする。HTTP status semanticsはそのvariantが担う。すなわちqueued command acceptanceは文書化済みacceptance result、各`4xx`
conflict/validation failureは同じ`code`を持つ名前付き決定的rejection（例:
`stale-resource`、`scan-in-progress`、`global-enable-in-progress`、
`global-disable-pending`、`consent-preview-frozen`、`consent-preview-missing`、
`consent-required`、`allowlist-version-mismatch`、`consent-preview-mismatch`、
`no-retryable-global-tool`）である。これらの決定的variantは固定codeを持つ宣言済みfunctional
outcomeであって、sanitizationではない。

Unexpectedにthrow/rejectされたhandler failureをproduct envelopeで包まない。devframe channelを
ordinaryなserialized RPC error（devframe/birpcの挙動）として横断し、clientは実際のerror message
を表示する。Async job accept前のfailureはそのinvocationだけをrejectし、jobも`scanRequestId`も
作らず、sessionに何もretainしない。Accepted scan jobでは、invocationがすでにqueued acceptance
でresolveしているため、terminal failureはdata modelが定義する場所にretainされる。すなわち明示
rescanのfailureはaffected Sourceの`staleFailures` entryに`{ kind: 'error', message }`として、
accepted admitted-subset Global batchのfailureはfailed `batchStatus`にretainされる。Two-stage
Global-disable barrierだけが例外で、accept後failureはstill-pendingなdisable invocationを実際の
errorでrejectし、同じmessageをfenced session用にfailed disable projectionの
`globalDisableInProgress.message`（`state`が`failed`の間だけ存在する）としてもretainする
（FR-042）。Failed requestはsessionをusableに保ち、processを終了させない。Prior committed
snapshotは保持済みIDのままreadableに残る。Automatic startupのthrow/rejectionにはRPC ownerが
なく、process top levelへ到達してprocessを終了させ得る。

## RPC function

### `agent-customization-inspector:get-session`

Parameters: なし。

Current session snapshotとscan progressを返す。clientは初回adoption時とSource state変化時に
このfunctionをinvokeする。独立したliveness probeもpage-lifecycleでの再取得も存在しない
（§ Concurrency and lifecycleを参照）。Productはinspection dataのtimer、
filesystem watcher、server-initiated pushを定義しない。
devframe channelは宣言済みfunctionのrequest/responseとしてだけ使う。

Result data:

```text
InspectionSession
├── sessionId, createdAt, repositoryGeneration, globalGeneration, snapshotState, globalContentEpoch,
│   staleFailures[] { sourceId, failureRef, failedAt, baseGeneration },
│   globalEnableInProgress null | { kind, operationId, previewId },
│   globalDisableInProgress null | { operationId, state, message? },
│   globalControl null | { state, previewId, confirmedTools[], pendingTools[], retryableTools[],
│                         batchStatus null | { scanRequestId, tools[], phase, failureRef },
│                         toolFailures[] { tool, diagnosticId } },
│   sessionDiagnosticIds, repositoryFailureDiagnosticId
├── sources[]
│   ├── sourceId, kind, tool, enabled, status, generation, scanRequestId
│   ├── boundary { displayRoot, origin }
│   ├── conditionFacts[] { tool, surface, ruleId, affectedRuleIds, behaviorRefs, strategyRefs, sourceRefs,
│   │                      evidenceAssessments[] { subjectKind, subjectId,
│   │                                                documentationStatus, lifecycleQualifiers[] },
│   │                      condition { key, status, reasonCode, basis } }
│   └── progress null | { scanRequestId, phase, visitedEntries, candidateFiles, readBytes,
│                         diagnosticCount, queuedAt, startedAt }
├── files[]
│   └── fileId, sourceId, sourceRelativePath, diagnostic IDs, and encoding as the variant
│       discriminator — readable text adds sizeBytes and hadLeadingBom;
│       binary adds only sizeBytes; unknown adds nothing. A file publishes its own facts
│       only; what it was recognized as belongs to a per-kind inventory below
├── skills[]
│   └── declaredName null | string,
│       definitions[] { fileId, tools[], companionFiles[] },
│       sameNameResolutions[] { tool, resolution } — empty unless several definitions
└── diagnostics[] { diagnosticId, code, sourceId?, fileId?, sourceRelativePath? }
    （active-generation recordとsession-owned lifecycle record）
```

一覧rowの単位はfileではなくkindが決める。Skillは宣言名1つである — vendor自身のselectorが使う
identifierであり、それを収めるdirectory名と一致する必要はない — したがって1つの名前を宣言する複数の
`SKILL.md`は、複数の定義を持つ1つのentryとして公開され、名前を宣言しない定義が他のentryへまとめられる
ことはない。MCP serverはcarrier内の`[mcp_servers.*]`宣言1つであり、admit済みの`.codex/config.toml` 1つは
宣言したserverの数だけrowを公開する。Instructions fileはfile自身である。他のkindの単位は、その一覧を出荷するtaskが、そのkind自身の
vendor contractから決める。したがって物理fileは
`files[]`に自身の事実 — path、read結果、size、diagnostic — とともに1度だけ現れ、各kindの一覧は
`fileId`で参照してそれらを繰り返さない。

`files[]`は、directory形式のcustomizationに付随するfileも運ぶ。Skillは全体として読むため、その
directory内のscript、reference、assetは他のfileと同様に公開される
（contracts/inspection-path-allowlist.md § Bounded companion census）。Ruleがadmitしておらず何も
認識していないため、どのkindの一覧にも属さない。それらを名指すのは所属するskillの
`definitions[].companionFiles`であり、clientは`files[]`を通じて各pathを`fileId`へ解決し、
そのcustomizationのdirectoryを提示する。

`sameNameResolutions`は、複数の定義が宣言する名前を各認識productがどう解決するかを述べる。これにより
groupingがInspectorの記録していない優劣を暗示することはない。定義が1つのentryはこれを持たない。解決
すべきものが無いからである。Skill strategyが出荷レジストリに無いproductも持たない。そのproductは
skillを認識しないため、どのentryもそこへ到達しない。記述はproductごとに異なり、vendor contractは
そのうち2つを不完全と記録している。

このfull DTOを返すのは`globalDisableInProgress`がnullの間だけとする。Non-no-op disable barrier
受理後は、このfunctionが代わりに次のexact control DTOだけを返す。

```text
GlobalFenceRecoverySnapshot
├── sessionId, globalContentEpoch
├── globalControl, globalEnableInProgress, globalDisableInProgress（requiredかつnon-null）
└── toolFailureDiagnostics[]
```

`toolFailureDiagnostics`には`globalControl.toolFailures`が参照するsession Diagnosticだけを
exactに含める。Retain済みfailed disable requestのerror messageは、non-null projectionの
`globalDisableInProgress.message`としてだけ運ばれ、その`state`が`failed`の間だけexactに存在
する。この
DTOはgeneration、Source、Repository failure、stale failure、無関係なDiagnostic/error、file、path、
authored value、relationship、resource fieldを一切持たない。Disable stateが`failed`でもfenceを
維持し、terminal disable successまたはprocess restartの後だけfull DTOを再び許可する。
Inventory/generation/Source/file/detail/Diagnostic/relationship/comparison dataを含むその他
すべてのinspection-data functionは、fence中ずっと`global-disable-pending` conflict rejectionを
返す。各fenced functionではparameter-shape validationの後、resource-ID existence、generation
staleness、duplicate-work、その他inspection-state checkより前にfenceをcheckする。したがって
retained graph stateをleakせずfence conflictが常に優先する。

各Sourceは正確に1つのrootを持つ。Repository Sourceは`tool: null`とし、sessionはGlobal Sourceを
0〜3個、`tool: codex`、`tool: claude`、`tool: copilot`ごとに最大1個持つ。Global rootを別Source内の
boundaryとして表現しない。
`repositoryGeneration`と`globalGeneration`は2つのsequenceがそれぞれ独立してcommitした
generationであり、`globalGeneration`はGlobal inspectionがdisabledでGlobal sequenceが存在しない間
だけexactにnullとする。各Sourceの`generation`はowning sequenceの値である。すなわちRepository
Sourceは`repositoryGeneration`を、各Global Sourceは`globalGeneration`を運ぶ。各`staleFailures`
entryの`baseGeneration`も同様にaffected Sourceのowning sequenceのgenerationを参照する。一方の
sequenceのcommitはそのsequenceのgeneration-owned IDとviewだけをrekey/invalidateし、他方の
sequenceのfile、detail、comparison view、IDには触れない（FR-030）。
`boundary.displayRoot`はone-way escapedなroot presentation labelであり、`SourceRelativePath`、
inventory-item locator、caller input、read authorityではない。同じ区別を
admission前のconsent-preview `displayRoot`にも適用する。Owning Sourceが存在する前のabsoluteまたは
invalidなlexical rootを表し得る。
Bootstrap Repository rootは`--root`省略時に`origin: process-cwd`、指定時に`origin: root-option`を
持つ。APIはretained raw rootもcanonical rootも公開しない。
各`conditionFacts` entryはevidence-linkedでorigin-file-lessなSource Condition Factであり、`files`と
recognitionから分離する。Physical/synthetic file、file ID/path/text、comparison target、
relationship origin、local/hosted read、network requestを作成できない。`evidenceAssessments`は
File Detailで定義するexact record schema、closed enum、orderを使い、scalar documentation statusを
serializeしない。未観測の現在stateはconditionalまたはunavailableのままにする。
Top-levelの`snapshotState`は`current`または`stale-after-fatal-rescan`とする。Fatalな明示rescan
だけがaffected Sourceの`staleFailures` entryとfailure referenceを追加または置換する。その
`failureRef`は、決定的にreturnされたfailureでは`{ kind: 'diagnostic', diagnosticId }`、
throw/rejectされたaccepted jobではfailed requestのerror messageを運ぶ
`{ kind: 'error', message }`とする。別Sourceのentry/failure recordは共存する。
Successfulなcompleteまたはpartial scanがclearするのはrefreshしたSourceのentryとそこから参照する
Diagnosticだけであり、別Sourceのcommitは両方を保持し、Global disableは除去するSourceの両方をclearする。
Arrayがnon-emptyの間だけ`snapshotState`はstaleである。自動初回Repository failureと初回
Global-enable failureは`staleFailures` entryを作らない。決定的なreturned failureはclosed
Diagnosticを使用でき、startupのthrow/rejectionはprocess top levelへ到達し、RPC所有のGlobal
failureはそのrequestのordinary errorとして表面化する。初回Global-enable failureは既存entryと
そこから派生するsnapshot stateをすべて保持する。
各`sourceRelativePath`はowning Sourceのsingle rootを基準とし、APIはabsolute/canonical filesystem
pathへ置き換えない。
Public Source-relative Pathは、filesystem operationがinternalに使うのと同じexactなraw entry
nameを`/`でjoinしてserializeする（FR-024）。Hard linkは通常のfileであり、physical-identity grouping、
primary-path selection、alias path listは存在しない。
Inventory summaryはsource textを含まない。Sort orderはsource kind、Global tool（存在する場合）、
source-relative path、file IDの決定的順序。
Fileはrecognition summaryもparse rollupも持たない — recognition自身の`parseStatus`がparseの
事実であり、file-levelのaggregateには読み手がいなかった。何として認識されたかはkindごとの一覧に属し、
各rowはそのkindを識別するものだけを運ぶ。Aggregateなdocumentation/applicability status、parse result、
winnerを発明することはない。Record-by-recordのevidence/applicabilityは後述するdetail
provenanceだけに保持する。

1 generation内で各`(fileId, tool, kind)`に対する`ToolRecognition`は正確に1つとする。Compatible
provenanceはそのrecognitionへmergeする。Provenance間でparsed meaningがinconsistentなら、その1
recognitionを`failed`とし、当該recognitionのmetadata、relationship、derivationを1件もpublish
しない。Competing recognitionへ分割しない。Recognition arrayはshipped closed tool order、次に
shipped closed kind orderを使い、opaque IDをtie-breakにしない。

SPAは単調増加する`clientDataEpoch`（中央full client-data purgeだけがincrementする）、sequence
ごとのcurrent generation（`currentRepositoryGeneration`と`currentGlobalGeneration`）、
state-bearing requestごとのopaque request tokenを所有する。どちらかのsequenceについてolderな値を
運ぶsession resultは無視する。Equal-generationsのresultはtokenがlatest request tokenのままで、
capture済みepochが`clientDataEpoch`と一致する場合だけadoptする。Valid resultがあるsequenceの
newer generationを運ぶ場合、SPAはそのsequenceのoutstanding data requestをabortし、そのsequence
のgeneration-owned editor/modelと、そのsequenceのfileを含むdetail/comparison stateだけを
disposeし、そのsequenceのcurrent generationを設定してcomplete new snapshotをadoptする。他方の
sequenceのcommit済みfile、detail、comparison view、editor modelはvalidのままで再取得しない。Old
epochまたはsupersededなowning-sequence generationでcaptureしたresultはbyteが後から届いても
stateを再作成できない。
返す全diagnosticはactive generation/source/file graphまたは`sessionDiagnosticIds`から参照され、
client起因request errorをここへ蓄積しない。
Retainする全failed-request error messageはexact 1つの`staleFailures` entry、failed
`batchStatus`、またはfailed disable projectionの`globalDisableInProgress.message`が所有し、
Diagnostic
listには一切入れない。
`scope`はdiagnostic lifetimeと独立した必須attachment discriminatorである。Location fieldは
常に3つとも存在し、そのscopeが使わないものはnullとする。Legalな組み合わせは2つだけで、`file`は
`sourceId`、`fileId`、当該fileのSource-relative Pathがすべてnon-null、`source`は`sourceId`が
non-nullで他の2つがnullとする。Path-lessなscopeは存在せず（すべてのdiagnosticはSourceに属する）、
source scopeのrecordはfile IDやpathを捏造しない。それ以外の組合せはserialization前に拒否する。
Progressは`idle`、`failed`でnull、active workおよびdata modelで定義したfinal `ready`/`partial`
counterではpresentとする。最初のlegal snapshotは、capture済み`process.cwd()`または単一の`--root`
からlexicalに選択したexact 1つのidle Repository Sourceを持ち、file/diagnosticなしのbootstrap
generation 0である。Escape済みroot labelはpresentation専用でread authorityを与えない。最初の
scanがretained selected rootをreadし、rootが存在しないかdirectoryとしてreadできない場合は、
sessionをusableに保ったままsource-scopedな`root-unreadable` Diagnosticでそのscanをfailさせる
（FR-002）。Startup throw/rejectionはprocessを終了させ得るため、後続のreadable snapshotを保証
しない。

authored contentに何が含まれ得るかについての注意書きは、どのsurfaceも掲げない。APIもそのためのwarning
fieldを送らない。閲覧者自身のfileをloopback束縛のsession上で表示するviewerには警告すべきものが無く、
常設の注意書きは読み手自身のrepositoryについて読み手に説明するために画面を費やす。contentの前に立つものも
無い。Acknowledgement stepもacknowledgement stateも存在しない（FR-027）。Loopback bindingがhost-side protectionの全てで
あり（QR-003）、確認は何も守らない一方ですべてのfileを読むのに2回の操作を要求することになる。
APIはacknowledgementを受け付けず、enforceするとも主張しない。
Authored value（完全なsource text、declared authored metadata、authored relationship target、
comparisonの両side）へは、`FileDetail`を1つずつrequestするかcomparisonを1つずつ構築することで
のみ到達でき、inventoryやsessionのresponseはそれを運ばない。例外はskillの`declaredName`
1つだけであり、inventory entryはrowが列挙される識別子としてこれを運ぶ: vendor自身のselectorや
menuがskillをその名前で指し、Source相対Pathからは復元できず、自らが列挙するものを名指せない
一覧はinventoryではない（FR-007、data-model.md § ToolRecognition）。それ以外の宣言済みの値は
明示的なdetail requestの背後にとどまる。中央full-session client-data purgeは
clientが保持するものを破棄する。Route close、selection replacement、file/Source removal、
どちらかのsequenceのgeneration replacementはその中央purgeではなくscope限定cleanupであり、
generation replacementはそのsequenceのscoped modelだけをdisposeする。Global disableは中央purgeを
使う。いずれもfilesystem authorityを付与せず、返すcontentも変更しない。

`globalControl`はGlobal consent/control stateがinactiveな場合だけnullとなる。それ以外では`state`が
`active`または`disabling`となり、`previewId`がfrozen active previewを識別する。`confirmedTools`は
常にfixed closed `[copilot, claude, codex]` all-tools consent setとする。Initial enableとretryの
validation/admissionはoperation-localのままとし、authority-freeな
`globalEnableInProgress { kind, operationId, previewId }`だけを公開する。Initial enableでは
`globalControl: null`を維持し、retryではresult-bound disposition 1件がatomic commitするまでexactな
pre-operation control projectionを維持する。このprojectionがnon-nullの間のduplicate enableは
`global-enable-in-progress` conflict rejectionを返し、disableは直ちに利用できる。

Queued dispositionでは、`pendingTools`がadmitted non-empty batch subsetとexactに一致し、
`batchStatus`はその同じsubset用のexactな`{ scanRequestId, tools, phase, failureRef }`とする。
`tools`をnon-empty、unique、fixed tool orderとする。Active `phase`は
`waiting | enumerating | reading | deriving | recognizing`で`failureRef`はnullとする。Batch
successは全Sourceをatomicにpublishし、両fieldをclearしてGlobal generationをexactに1回commitする
（initial enableではgeneration 1、retry batchではGlobal sequenceのN+1）。Terminal
deterministic failureはempty `pendingTools`と`phase: failed`を維持し、
`{ kind: 'tool-failures', failedTools }`を持つ。`failedTools`はbatch-owned `toolFailures` rowを
持つnon-empty fixed-order setで、Diagnostic IDを繰り返さない。Terminalなthrow/rejectionは
failed requestのerror messageを運ぶ`{ kind: 'error', message }`を使う。
Failed batchはretry受理またはdisableまでrequest correlationを維持する。`active-no-job`
dispositionはnull `batchStatus`を持ち、job/generationを作らず、決定的なrejected-tool controlだけを
retainまたはreplaceする。

`state: active`の間、`retryableTools`はunpublishedかつnon-pendingの各`admitted` controlと、
`retryDisposition: same-preview`の各`rejected` controlだけとし、lexicalな`new-preview-required`
controlを除外する。Operation-local retry validation中はpre-operation projectionを保つ。Retryを
提示するのは`globalEnableInProgress`がnull、`pendingTools`がempty、matching frozen previewを
取得・検証済みの場合だけとする。Non-failed active batch中のretryable toolは情報表示だけで、
enableは`global-enable-in-progress` conflict rejectionを返す。

Disable-barrier受理からterminal successまでは`state: disabling`、empty pending/retry array、null
`batchStatus`とし、`globalDisableInProgress`は`draining`、`committing`、retained `failed`の全期間
non-nullとする。Controlはsuccessful `remove-active-state` completion時だけnullとなる。
`cleanup-only` barrierでは`globalControl`がnullでもよい。
`toolFailures`はnon-nullな全control `diagnosticId`をexact toolへmapするfixed-tool-orderかつ
uniqueなarrayで、各IDは`sessionDiagnosticIds`にも存在しsession-owned deterministic Diagnosticへ
resolveする。参照するのはdeterministic Diagnosticだけであり、そのcontrol failureのclearまたは
disable commitまで保持する。Failed `batchStatus`のerror messageは、active consent全体について
1件のaccept済みadmitted-subset Global batch throw/rejectionを記録する唯一のretained recordで
ある。Accept前retry failureは保持し、決定的な
`active-no-job` retryまたはreplacement-batch acceptanceはclearし、replacementのterminal failureは
supersedeし、Global disableはremoveする。1 toolを識別せず、`StaleSourceFailure`を作らない。

Outcomes: fullまたはfenced DTO。

### `agent-customization-inspector:get-file-detail`

Parameters: opaque file IDを1つ、functionの単一positional argumentとして渡す。

```json
"opaque-file-id"
```

Active-generation file detailを1件返す。

```text
FileDetail
├── file — encodingで判別されるCustomizationFile 1件:
│   ├── fileId, sourceId, sourceRelativePath, encoding, diagnosticIds[]
│   ├── readable textはさらにhadLeadingBom, sourceText, sizeBytes,
│   │   recognitionIds[], relationshipIds[]（本releaseでは空。下記参照）を持つ
│   └── binaryはさらにsizeBytesを持ち、unknownはこれ以上何も持たない
├── recognitions[]
│   ├── recognitionId, fileId, tool, parseStatus, diagnosticIds[]
│   ├── details { kind。skillのdetailsはさらにdeclaredName — recognizerが
│   │             何もextractしなかったときは不在 — とcompanionFiles[]を運ぶ }
│   ├── declaredMetadata[] { closed fieldId, 解決済みvalue }
│   └── provenances[] { ruleId, discoveryClass, matchedPath, scope,
│                       evidenceAssessments[],
│                       applicability { summary, conditions[] } }
└── diagnostics[]
```

この木がresponseの形そのものである: clientは正確にこのfieldだけに依存できる。
Edge recordの`relationships` arrayは存在しない — shipped recognitionはedgeを1つも生成できないため、
すべてのresponseで空になる。これはそれを埋めるrelationship phaseとともに到着する。上記のreadable
fileの`relationshipIds`は同じ事実のID list形であり、存在して空である。
provenanceも同様に、`provenanceId`（relationshipが来るまでadmissionを指し返すものが無い）、
`order`とderived-seedの3つ組`seedFileId`/`seedProvenanceId`/`seedRuleId`（shipped ruleに
derivedは無く、shipped strategyはorderを文書化していない。derivation/ordering phaseとともに
到着する）、`declarationKey`（shippedな唯一のkindはfile全体）、
`behaviorRefs`/`strategyRefs`/`sourceRefs`（参照されるsubjectは既にそれぞれ
`evidenceAssessments`のrecordであり、citationはpackaged CLIが持たないmaintenance data）の
いずれも持たない。`scope`はclosed `ScopeDescriptor` union（`source-root`、
`directory-subtree`、`matching-path`、`declared`）とする。Exact fieldとstable comparison key
は[data-model contract](../data-model.ja.md#scopedescriptororderdescriptor)が定義し、
APIはimplementation固有のscope objectを受理・返却しない。

Readable fileでは`sourceText`は完全なdecoded sourceとし、全`declaredMetadata[].value`は
そのfieldについてparserが解決した値 — quoteとescapeは解決され、`007`は`7`として読まれ、
2回宣言されたkeyは後の宣言として読まれる — を、credential detection、masking、redaction、
reveal stepなしで保持する。Entryはallowlist rowの順でfieldごとに1件とし、comparison identityは
`(tool, kind, fieldId)`とする。scalar以外へ解決するfieldはentryを持たない。rowが名指すのは
scalar fieldだからである。JSON transport escapeはclient上で同じstringへround-tripしなければならない。
Environment-variable referenceは書かれたままの文字とし、hostは参照されたprocess-environment
valueをread、resolve、substituteしない。Inspectionが使うenvironment valueは、Global rootを
consent flowで導出するための明示的に文書化されたtool-home variableだけとする。
Registry定義の`targetOrigin: documented-default` relationshipは`authoredTarget: null`とし、SPAは
検証済み`normalizedTarget`をdocumented defaultとlabelして、synthetic pathがsourceに出現したと
示さない。

Inventory、Detail、Comparison、Global control、Diagnostics、Source Condition Facts、全API result、
CLI output、documentationを通じて、productが行うのは構文だけのparsing、allowlist fieldについてparserが解決した値の読み取り、
frozen-catalog classification、文書化済みstructural
scope/order/condition/selection/reference projectionだけである。Natural-languageのmeaningまたは
intentをinterpret/rankせず、customizationのcorrectness、validity、compliance、effectiveness、
qualityを判定せず、policy/remediation advice、validation、lint、synchronization、conversion、
formatting、fixingを一切提供しない。Inspector所有のDTO、registry、internal invariantに対する
strict validationは許可され、customization validationではない。決定的なavailability Diagnosticは
content verdictを含まない。1 fileに限定されたfailureはFR-028に従ってそのfileのDiagnosticになり、
それ以外のunexpectedなRPC所有failureはrequestのordinary errorとしてpropagateしてDiagnosticには
ならない。

File encoding stateは、完了した通常readのbyteから割り当てる。NUL byteが1つでもあれば`binary`とし、`sourceText`もBOM recordもなく、comparison不適格とする。admit済みcandidateではそれはdiagnostic-onlyであり、
その他の条件を満たせばgenerationを`partial`にする。censusが列挙したcompanionのbinary bytesはassetの通常の
事実である（FR-025）。それ以外のbyte sequenceはUTF-8 replacement semanticsで正確に1回decodeする。先頭BOM
1つは`hadLeadingBom: true`として除去する。Replacementなしでdecodeできたtextは`utf-8`、`U+FFFD`が1つでも
insertされた場合は`utf-8-replaced`とする。その文字化けしたexactで完全な`sourceText`をparsing、
extraction、detail、comparisonへ渡し、それ自体を理由にgenerationをpartialにしない。Alternate
decode、charset guessing、sampling、truncation、製品固有のbyte/line/item上限はない。

各recognitionの`parseStatus`はclosed enum `not-attempted | parsed | failed`とする。
Parse/extractionはrecognitionごとにall-or-nothingであり、`failed`はそのrecognitionとdiagnostic
IDを保持するが、failed result由来のmetadata、relationship、derivationを返さない。同じfile上の別
recognitionは`parsed`でよい。Session summaryで定めたuniqueness、compatible-provenance merge、
inconsistent-meaning failure、closed tool-then-kind orderをdetailにも同一に適用する。1
recognitionに限定されたparser/extractor failureは、完全なreadable sourceの表示とcomparison
eligibilityを保ったまま（FR-028）、`partial` generation内でこのfailed-recognition stateと
file-scopedな`recognition-parse-failed` Diagnosticを作成する。1 fileに限定されないfailureは
attemptをfailさせ、RPC所有の場合はrequestのordinary errorとして公開する。
Structural metadata comparisonは`(tool, kind, fieldId)`を使うため、fieldが同じでも
別tool/kindは衝突しない。

Declared valueは文字を丸ごと運ぶ。astral characterはUTF-16 code unit 2つ、combining markは
code point 2つだからである。よってextractionとJSON transportを変化なく通過し、Unicode normalizationも
適用しない。Responseはsource座標を持たない。Documentを指すものが存在せず、取得元の値の隣に置かれた
rangeはその値が既に述べていること以上を主張しないからである。Parseできなかったdocumentは
affected recognitionをall-or-nothingでfailさせる。一方でその完全な`sourceText`は利用可能なまま残る。
値がもはや運ばない綴りをreaderが求める先はそこである。

Resultはinert JSON stringを使う。SPAは`sourceText`とmetadataをVue text bindingでrenderし、
`v-html`、Markdown rendering、clickable link、URI handler、image loadを使わない。Resultはmemory内
だけに保持し、durableにcacheせず、logに残さない。SPAはfileを1つずつrequestし、その隣に
注意書きを置かずに表示する。

Detail request tokenは正確な`(clientDataEpoch, owning sequenceのcurrent generation, fileId)`を
captureする。Captureした3値がlive epoch、owning sequenceのgeneration、selected fileと全て一致
する場合だけSPAはresultをadoptし、
request token replacementはそのcaptureをinvalidateする。Mismatch時はmodel、DOM text、metadata
row、comparison inputを作らずresultをdisposeする。

各`evidenceAssessments` memberはexactに`{ subjectKind, subjectId, documentationStatus,
lifecycleQualifiers }`とする。`subjectKind`は`behavior | rule | strategy`、`documentationStatus`は
`documented | partially-documented | unknown | conflict`、`lifecycleQualifiers`は
`preview | experimental | deprecated`のuniqueなfixed-order subsetとする。Empty qualifier arrayは
stabilityを一切主張しない。各arrayはowning ruleと参照する全behavior/strategyについて1 recordずつ
持ち、subject-kind order、次に`subjectId`でdeduplicate/sortする。APIはscalarへcollapseしない。
Runtimeの`ConditionFact.status: documentation-conflict`は別のcondition valueであり、
`DocumentationStatus` aliasではない。

Outcomes: `FileDetail` result。File IDがunknown、owning sequenceのsuperseded generation/removed
file所属、またはdisabled source所属なら`stale-resource` rejection。Disable fenceがnon-nullの間は
`global-disable-pending` conflict rejection。

### `agent-customization-inspector:rescan-repository`

Parameters: なし。

Repositoryにrunning/queued commandがない場合だけ1 scan commandを受理する。Hostはadmission時に
opaqueな`scanRequestId`を1つ生成して`ScanAdmission { scanRequestId, source }`を返す。Returned
Source/progressの両方と、このcommandに対する後続のqueued、active、complete、partial、failed
statusはすべて同じIDを保持する。Successfulなcommit済みgenerationはそのIDを記録し、以前のstatus
またはinventoryはこのrequestを満たせない。Coordinatorがidleなら直ちに開始し、別transactionが
activeならFIFOへqueueし、Repository summaryは`status: scanning`、`progress.phase: waiting`、
non-null `queuedAt`、null `startedAt`を返す。Jobはrequest時ではなくdequeue時のRepository sequenceの
committed generationから開始する。CompleteまたはpartialのreplacementをexactにRepository
generation N+1としてatomic publishするまでcurrent Repository generationをreadableに保つ。
PublicationはRepositoryのgeneration-owned IDだけをrekeyし、old Repositoryの全file IDと
Repository fileを含む全detail/comparison viewをinvalidateする。Global sequence、そのgeneration、
ID、Global-onlyのviewには触れないため、clientはRepository dataだけを再取得する。明示rescanが
commit前にfailureとなった場合、provisional partial resultを含む全uncommitted resultをdiscard
する。Last committed generationとそのIDをreadableなまま保ち、top-level snapshotは
`stale-after-fatal-rescan`、Repository Sourceは`failed`となる。決定的にreturnされたfatal outcome
はclosedなactionable lifecycle Diagnosticを使用し、unreadableなselected rootは`root-unreadable`を
使用する。1 fileに限定されないthrow/rejectionは全domain layerを越えてpropagateし、accepted job
は同じ`scanRequestId`についてfailed requestのerror messageをretainする。どちらの場合も
`staleFailures` entryはexactにそのfailure representation、すなわち
`{ kind: 'diagnostic', diagnosticId }`または`{ kind: 'error', message }`を運ぶ。後のsuccessが
両方をclearし、別Sourceのcommitは両方を保持する。

Outcomes: Request IDとupdated source summary付きacceptance result。Duplicate running/queued
Repository commandだけ`scan-in-progress` conflict rejection。Disable fenceがnon-nullの間は
`global-disable-pending` conflict rejection。

### `agent-customization-inspector:get-global-consent-preview`

Parameters: なし。

既にcurrentなprocess-memory previewだけを返す。Environment valueをcaptureせず、previewを
create、replace、invalidateしない。Active consentまたはregistered initial enableがある場合はその
exact frozen previewを返す。Disable fenceがnon-nullの間は、control-only recovery viewがrevoke
対象consentを表示できるよう、barrierのexact `frozenPreview`を返す。Current unconsented previewも
frozen previewもなければ`consent-preview-missing` rejectionを返す。Read-onlyなcurrent-preview
lookupのままでworkをscheduleしない。

Outcomes: currentまたはfrozenの`GlobalConsentPreview`。`consent-preview-missing` rejection。

### `agent-customization-inspector:create-global-consent-preview`

Parameters: なし。

候補Global pathへ触れる前にunconsentedなlexical/process-scoped previewをcaptureし、atomicに
createまたはreplaceする。

```text
GlobalConsentPreview
├── previewId, allowlistVersion, traversalPlanVersion
├── entries[] { tool, origin, displayRoot, inputState }
└── excludedRuleIds[]
```

Coordinator conflict確認後に許可したcreate invocationごとに、serverは`COPILOT_HOME`、
`CLAUDE_CONFIG_DIR`、`CODEX_HOME`をこの順で正確に1回ずつreadする。`undefined`だけをabsentとし、
empty stringはpresentとする。1つでもabsentなら、そのrequestでimport済み`node:os.homedir()`を
正確に1回callし、対応するabsent entryについてactive-platformの`node:path.join`と固定suffix
`.copilot`、`.claude`、`.codex`を使う。`HOME`、`USERPROFILE`その他home sourceを独自選択せず、
lexical capture/joinはexistence checkを行わない。それらのvariableは候補Global rootの特定だけに
使い、inspected content内のreferenceのsubstitutionには使わない。Serializeしないfrozen internal
preview recordは、各entryの`lexicalRoot`をexact raw stringとして追加保持する。Empty、relative、
invalid、control-containing、backslash-containing valueは別の`inputState`とともにexact raw
stringのまま保持する。
`displayRoot`は`lexicalRoot`由来のone-way presentation escapeであり、pathへdecodeせずadmission
inputにも使わない。候補Global root配下の`stat`、`realpath`、directory enumeration、file readを
行わない。Node.jsと実行環境がvalueを保持・escapeできるかを決める。Environment capture、
`homedir()`、join、retention、presentation encoding、serializationの
throw/rejectionはこのaccept前RPC boundaryへ到達し、invocationをordinary errorでrejectする
（jobも`scanRequestId`も作らない）。Read authorityを作らず、normalization、canonicalization、
root creation、readを行わない。
それ以外では`displayRoot`がescape済みの正確なlexical valueを示し、invalidなempty/relative
overrideはdefaultへ戻さずinvalidと表示する。Successful createはcomplete resultがbindされた後
だけprior unconsented previewをatomicにreplaceする。Active consentでは`consent-preview-frozen`
conflict rejection、registered enableでは`global-enable-in-progress` conflict rejection、disable
fenceでは`global-disable-pending` conflict rejectionを返し、environment recaptureもstate change
も行わない。Read functionがfresh-client recovery用のexact frozen previewを提供し、別previewには
先にdisableが必要となる。Previewはserverが保持するopaque `previewId`で識別する唯一のrecordで
あり、enableとretryはそのIDを指名する。Serverは自身のstored recordだけに基づいて動作し、
server-retained stateのcryptographicな再検証は行わない。

Previewは意図的にpatternごとの表示を持たない。Admitted root配下で何をreadするかは、保持済み
`allowlistVersion`/`traversalPlanVersion` pairが特定するshipped static typed `TraversalPlan`で
固定され、consent文言がその範囲を平易な言葉で説明する。Consent/root admission後、exact-file ruleは指定fileだけを
readしてGlobal rootをenumerateせず、fixed-instruction-subtree ruleはそのwalkに必要なplan指定
instruction subtreeだけをenumerateする。どのoperationもsibling setting、credential、state、
plugin、その他neighbor pathをlist、stat、readしない。

Codex planだけは`codex-global-first-non-empty`を使う。まず`AGENTS.override.md`をreadし、override
がnon-emptyなら`AGENTS.md`へ一切operationせずshort-circuitし、absentまたは安全にreadしてemptyと
確定した場合だけ次へ進む。`absent`はoverride fileが存在しないことを意味する。Unreadableまたは
binaryなoverrideは、そのfile Diagnostic（`file-unreadable`または`file-content-binary`）で
selectionを終了し、fallbackしない。Optionalな先頭UTF-8 BOMだけ、またはwhitespace-only contentは
`decodedText.trim().length === 0`のもとでemptyとする。`utf-8-replaced`は通常textとして参加し、全
`U+FFFD`はnon-whitespaceである。Non-emptyなCodex instruction fileを最大1件だけpublishする。

Outcomes: 作成した`GlobalConsentPreview`。`consent-preview-frozen`、
`global-enable-in-progress`、`global-disable-pending` conflict rejection。
Capture/serializationのthrow/rejectionではそのrequestのordinaryなaccept前error。

### `agent-customization-inspector:enable-global`

Parameters:

```json
{
  "confirmed": true,
  "allowlistVersion": "2026-07-20",
  "previewId": "opaque-preview-id"
}
```

Result data:

```text
GlobalEnableResult
├── state: queued | active-no-job
├── scanRequestId: opaque ID | null
├── acceptedTools[]（tool enumを0〜3個）
└── rejectedTools[]（tool enumを0〜3個）
```

UIはそのpreviewの3 toolすべての正確なGlobal path集合、lexical input state、exclusionを表示した
後だけ送信できる。Hostはfalse confirmation、古いcontract version、superseded previewを
拒否する。Stored internal raw `lexicalRoot`とstored typed
traversal programだけを使い、environment inputを読み直さず、`displayRoot`をreverse-convertしない。
Parameterは意図的にtool selectorを持たない。Initial
enableは、すでにlexicalにinvalidなentryも含むfrozen preview entry 3件すべてからexact fixed
`[copilot, claude, codex]` setをderiveする。Retryはcurrent server-side `retryableTools` subset、
すなわちunpublishedかつnon-pendingのadmitted controlとsame-preview rejected controlだけをexactに
deriveする。Lexical `new-preview-required` controlにはdisableとnew previewが必要となる。Clientは
toolを追加、omit、remove、reorderできない。

Confirmation field検証後、coordinatorはexact 1つの`GlobalEnableOperation`をregisterし、1つの
provisional transactionがderived set全体をevaluateする間は
`globalEnableInProgress { kind, operationId, previewId }`だけを公開する。Duplicate enableは
`global-enable-in-progress` conflict rejectionを返す。このprojectionはtool outcome、root、
context、Source、job、authorityを一切publishしない。Empty、relative、invalidなentryは
filesystem callなしの決定的rejectionとする。Eligibleなabsolute rootがmissingまたはreadable
directoryでない場合は、他toolのcommitを妨げずにそのtoolをabsentまたはfailedとして記録する
（FR-014）。1 toolのfileに限定されないunexpectedなthrow/rejectionはdomain classificationなしで
RPC ownerへpropagateする。Initial enableではjob accept前に発生するため、invocationをordinary
errorでrejectし（`scanRequestId`を作らない）、consent/control/jobをactivateせず、provisional
subsetを一切commitしない。Retryでは既存consent/controlとprior snapshotを変更しない。どちらの
accept前failureも`globalEnableInProgress`をunregisterし、terminal operation historyをretain
しない。

そのようなexceptionなしでvalidationが終了すると、`acceptedTools`と`rejectedTools`はdisjointかつ
uniqueなfixed-tool-order arrayとなり、そのunionがtransactionでevaluateした全toolと一致する。
Coordinatorは3 toolすべてのcontrolを持つinitial consentをatomicにactivateする。Rootを1つも
admitしなければ、`state: active-no-job`、null `scanRequestId`、Source/job/generationなしで返し、
disable用controlに加え、`retryDisposition`が許可する場合だけsame-preview retry用controlを維持
する。それ以外では`scanRequestId`を1つallocateし、全admitted rootを1つのprovisional batch scanへ
transferし、`state: queued`を返し、そのbatch commit前にSourceを一切publishしない。同じatomic
acceptanceで、promote済み`scanRequestId`、tool set、`phase: waiting`、null `failureRef`を持つ
`globalControl.pendingTools`と`batchStatus`をpublishし、fresh pollingによるlost acceptance
recoveryを可能にする。Tool rootごとにSource identityは分離するが、admitted subsetの全
ready/partial Sourceはexact 1つのGlobal generationへ同時に現れる。すなわちenable commitがGlobal
sequenceをgeneration 1として作成し、既存Global Sourceの隣で行うretry batchはそのsequenceの
exactなN+1をcommitし、per-tool commitはpollから観測できない。その1 commitはcarried Global
Sourceのstable Source ID/semantic contentを維持し、Globalのgeneration-owned IDをすべてrekeyし、
old Globalのdetail/comparison/editor stateをinvalidateし、該当する決定的tool failureをclear
する。Repository sequence、そのgeneration、ID、Repositoryのviewには触れない。

Operationは各async stepの前後でID/epoch、non-aborted signalに加え、initial enableでは同じ
operation-local provisional state、retryでは同じactive control snapshotをcheckする。単一batch
enqueue直前にcoordinatorがinitial consent/controlをatomicにactivateするかretry partitionを適用
し、生成されたactive control stateをverifyする。Disable-first orderingはdrainしてlate mutation
なしの`global-disable-pending` conflict rejectionを返し、operation-firstのqueued acceptanceは後の
barrierがbatchをcancelしてもaccepted dispositionのままとする。Queued acceptance後の
throw/rejectionは同じnon-null `scanRequestId`のterminal failureとし、subset
Source/generationをcommitせずprior snapshotを維持する。Initial/retry admitted-subset Global
batchではDiagnosticも`StaleSourceFailure`も作らず、代わりにoperation-wideなfailed-request
error messageを1件failed `batchStatus`にretainする。後のretryとdisableにはsession projectionで
定義した正確なclear/supersede lifecycleを適用する。

同じexact consentをretryできるのはserver-derived `retryableTools` projectionがnonemptyの場合だけ
とする。そのexact eligible subsetは単なるSource absenceではなくserverがderiveし、clientはnarrow
できない。別preview/rootまたはlexical `new-preview-required` controlには先にGlobal disableが必要
で、empty projectionなら`no-retryable-global-tool` conflict rejectionとする。Non-retryableな
missing toolが存在すること自体は別のactive-consent conflictを作らない。全entryがlexicalに
invalidなpreviewもconfirmでき、決定的な`active-no-job` stateを返すため、別の
`no-eligible-global-root` outcomeは存在しない。

Outcomes: acceptance result。`consent-required`、`allowlist-version-mismatch`、
`consent-preview-mismatch` rejection。`no-retryable-global-tool`、
`global-enable-in-progress`、`global-disable-pending` conflict rejection。もしくはunexpectedな
accept前throw/rejectionではそのrequestのordinary error。

### `agent-customization-inspector:rescan-global`

Parameters:

```json
{ "sourceId": "opaque-enabled-global-source-id" }
```

Global disableがpendingでない場合だけ、指定したenabled tool-specific Global Sourceのscan
commandを1つ受理する。`sourceId`はopaque IDでありpathではない。Repository rescanと同じFIFO、
dequeue時base generation、atomic publication、progress、invalidation、serialization ruleを
Global sequence内で使う。すなわちsuccessful commitはそのsequenceのexactなN+1であり、Globalの
generation-owned IDだけをrekeyし、Repository sequence、そのgeneration、ID、Repositoryのviewには
触れないため、clientはGlobal dataだけを再取得する。
そのSourceのrunning/queued scan commandは最大1つで、duplicateを暗黙coalesceしたり2回目のreadに
したりしない。Admissionは`ScanAdmission { scanRequestId, source }`を返す。このopaque request IDは
returned Source/progress、commandの全後続status、そのcommandがcommitするgenerationで同一とする。

Failed Global rescanは何もcommitせず、そのfailed attemptからpartial resultを0件publishする。
Top-level `snapshotState: stale-after-fatal-rescan`、Sourceのnull `progress`と`status: failed`を
返し、`enabled: true`、正確なconsent、validated済みsingle-root record、last committed graph、その
graphの全IDを保持する。そのSourceの`staleFailures` entryだけを作成または置換し、そのentryが
retained snapshotのstaleを説明する。決定的にreturnされたfailureはactionableなlifecycle
Diagnosticを参照し、1 fileに限定されないthrow/rejectionはdomainを越えてpropagateし、この
`scanRequestId`についてfailed requestのerror messageとしてretainされる。後の同じSourceに対する
successfulなcompleteまたは
partial rescanがgraphをatomic replaceして両方をclearし、別Sourceのcommitは両方を保持する。

Outcomes: Request IDとupdated source summary付きacceptance result。Unknown/removed Source IDは
`stale-resource` rejection、Global disableがpending/activeなら`global-disable-pending` conflict
rejection、そのSourceのrunning/queued scanとduplicateなら`scan-in-progress` conflict rejection。

### `agent-customization-inspector:disable-global`

Parameters: なし。

Result data:

```text
GlobalDisableResult
├── state: disabled | no-op
├── operationId: opaque ID | null
├── commitKind: cleanup-only | remove-active-state | null
└── repositoryGeneration
```

これは単なるGlobal Source削除commandではなく、全inspection dataに対するpriority security
barrierである。SPAは送信前に中央full purgeを実行する。True no-opを許可するのはactive/queued
Global authorityもretained disable failureも一切ない場合だけとする。Ordinaryなaccept前
result-binding gateを使い、null operation/commit kindとunchangedな`repositoryGeneration`を返し、
`globalContentEpoch`をincrementせずRepository workへ干渉しない。どのdisable dispositionも
どちらのsequenceにもgenerationをcommitしない。すなわち`repositoryGeneration`は常にunchangedな
Repositoryの値であり、successful `remove-active-state`の後はGlobal sequenceが存在しないため、
次のfull snapshotは`globalGeneration: null`を報告する（FR-042）。Validationまたはresult
constructionがbarrier受理前に失敗した場合、invocationをordinary errorでrejectして何も
mutateしない。Fresh sessionのfenceはnullなので、既にpurge済みのclientは直ちにfull snapshotを
recoverできる。

Non-no-opのfirst acceptanceは必ずbarrier operationをatomicにallocateし、command epochと
`globalContentEpoch`をincrementし、publication authorityを取消不能にrevokeし、non-null
`globalDisableInProgress`を公開する。既存`globalControl`を`disabling`へ変えて`pendingTools`、
`retryableTools`、`batchStatus`をclearする。Registered `globalEnableInProgress` operationと
Global scanをabortし、queued Global commandのdequeueと全generation-mutating commandをfenceする。
Repository rescan requestは`global-disable-pending` conflict rejectionを返し、既にrunningの
Repository workはrevokeしてterminal disable success後の1回のrequeue用にholdする。Global
enable/rescanも同じconflictを返す。Session functionは`GlobalFenceRecoverySnapshot`だけを返し、
その他すべてのinspection-data functionは同じconflictを返す。Livenessはgreater epochとnon-null
projectionを返し続ける。

First acceptance時に`commitKind`を固定する。Public Global consent/control/Source stateが存在する
場合だけ`remove-active-state`、public stateをpublishしていないoperation-local initial enableを
cancel/drainするだけの場合に限り`cleanup-only`を選ぶ。Barrierはrevoke済みcontinuationをすべて
drainし、最後のqueued-Global-work cancellation sweepを実行する。中断したGlobal workをrequeue
せず、expected cancellationはDiagnosticを作らずerrorもretainしない。

Barrierが`draining`または`committing`の間に受けたrequestは同じ`operationId`とterminal resultへ
joinし、いずれかのtransport disconnectでもcancelしない。Drainまたはfinal assembly
failureを含むaccept後のunexpectedなthrow/rejectionは、still-pendingなその
invocationを実際のerrorでrejectする。`globalDisableInProgress.state`は`failed`となって同じ
messageをその`message` fieldとしてretainし、processはaliveのまま、prior
generationはinternalに残り、全inspection-data fenceを閉じたままとする。Failed cleanupでcontentを
再公開しない。

`failed` stateでの後続disable invocationはnew operationでidempotent cleanupを開始または再開し、
exactな`commitKind`、base generation、frozen preview、既にincrement済みの`globalContentEpoch`を
inheritし、retryではcontent epochを再incrementしない。再failureはsole retained disable errorを
supersedeし、terminal successだけがこれをclearしてfenceを除去する。Cleanupを確認できない場合の
fallbackはprocess restartだが、request-owned failure自体はprocessをexitさせない。

Terminal successはresult-boundかつatomicとする。`remove-active-state`ではGlobal generation
sequence全体、すなわち全Global Source、consent、control、root、preview、stale failure、tool
Diagnostic、retained failure messageを破棄し、どちらのsequenceにもgenerationをcommitせず、
fenceをclearしてunchangedな`repositoryGeneration`を返す。Repositoryのgeneration-owned IDは
すべてvalidのままであり、後のre-enableは既にincrement済みのgreater `globalContentEpoch`の
もとでGlobal sequenceをgeneration 1から再開する（FR-042）。Hold済みRepository commandは1回だけ
requeueされ、後でRepository sequenceのN+1をcommitできる。
`cleanup-only`ではunpublished operation-local stateだけをremoveし、fenceをclearし、committed
stateを一切変えない。すなわち両sequenceのgenerationとgeneration-owned IDは不変である。
Concurrent joinerは同じterminal resultを受ける。

Outcomes: no-op、joined success、retry success、first-attempt successではresult。Accept後
failureではそのordinary error。Disable自体は`global-disable-pending`を返さない。

## Concurrency/lifecycle

- 1つのcoordinatorがcorrectness invariantとしてscan transactionをserializeする。1 Sourceあたり
  runningまたはqueuedのscan commandを1つ受理し、duplicate scanはconflict、別のRepositoryまたは
  tool-specific Global Source scanはFIFOへqueueしてwaiting phaseを示す。1 fileに限定された
  failureはそのfileのDiagnosticになる（FR-028）。それ以外のscan/admission throw/rejectionは
  domain state mutationなしでowning boundaryへpropagateする。Disableはpriority
  barrierのjoin/no-op ruleに従う。全自動/明示scanは1つのopaque `scanRequestId`を受け、実際の
  dequeue時にowning sequenceのcurrentなgenerationから開始する。
- Workの停止はcancellation signalではなく、attemptのpublication authorityをrevokeすることで行う。
  Revokeされたattemptのlate resultは破棄され、Source overlayはadmission前の状態へ正確に戻るため、
  そのattemptが生成したものは何もcommitされない。実行中のreadはそのまま完了させる。中断しても、
  破棄が既に与えているもの以上は得られないからである。Process shutdownはhostをcloseする前に全attemptを
  revokeする。Global disableは上記priority barrierで、active uncommitted transactionをrevokeし、enable
  validationをabort/drainして最後のqueued Global work cancellation sweep後にfixedなcleanup-only
  またはremove-active-state dispositionを次にcompleteし、terminal success後だけ中断した
  Repository commandを1回requeueする。Operationの完了はNode.jsと実行環境に従う。Disable、
  shutdown、supersession、propagateされたfatal operation failureはpublication authorityを取消
  不能にrevokeする。1 fileに限定されたoutcome（FR-028）だけでは、attemptのpublication authority
  をrevokeしない。Revocation後は、late byte、graph record、Diagnostic、DTO resultをすべて
  破棄する。取消不能なkernel operationを物理的にcancelできるとは保証しない。
- Successfulなcompleteまたはpartial scanはowning sequence内で正確にN+1をcommitし、scanned
  Sourceと、Global batch commitでは全carried Global Sourceについて、そのsequenceのgeneration
  所有graph IDを再生成する。Process-lifetimeでstableなSource IDと、他方のsequence全体、すなわち
  そのgeneration、ID、viewは変更しない。
  Scanned Sourceのstale-failure entryと参照先failureだけをclearし、別Sourceの両方をcarryする。
  Fatalな明示rescanはpartial resultを含む全uncommitted resultをdiscardし、owning sequenceのNと
  IDをactiveのままにし、retained session snapshotをstaleにmarkして、affected Sourceの
  `staleFailures` entryを1件
  作成または置換する。そのentryはactionableなlifecycle Diagnosticを参照するか、failed request
  のerror messageを運び、同じ
  Sourceの再failureでは両方を置換する。RepositoryのNはlegalなbootstrap generation 0でもよい。
  Global enable commitはそのsequenceをgeneration 1として作成し、disableはgenerationをcommit
  せずにそのsequenceを破棄する（FR-042）。Barrier
  cancellationは何もemitしない。
- Session retrievalはNode process lifetimeを延長せずdataを永続化せず、product固有のtime
  thresholdを定義しない。Liveness probeは存在しない——productは2枚目のbrowser tabをmodelせず、
  host喪失はloopback socketのcloseとしてtransportが問い合わせなしにpageへ報告するためである
  。全responseは引き続きcheckされるので、matching sessionでepochが等しく
  disable projectionがnullのresultはcurrent baselineをconfirmする。Greater epochまたはnon-null
  projectionではcontrol-only recoveryへ入る前に中央purgeを実行し、network/runtime failure、
  channel loss、session mismatchではended view表示前にpurgeする。Page-lifecycle eventはpurge triggerではない: FR-027はdocument-liveness failureまたは同等のterminal reset後にpurgeするものであり、tab切り替えもページからの離脱もそのどちらでもない。破棄されたdocumentは自分のmemoryを解放し、bfcacheに入ったdocumentが保持するのは同じユーザーが自分のマシンで自分のファイルを見た状態であって、trusted-workspace modelはこれをexposureとして扱わない。clientはvisibility/unload listenerを設置しない。
  Purgeはclient epochをincrementしてlate in-flight resultによるDTO/editor stateの復活を防ぎ、
  Monaco model/editor/worker/subscriptionをdisposeし、DOM/store contentをclearして
  pending requestをabortする。Node process終了時はserver側session
  state、complete source content、source root、generation、diagnosticを破棄する。
- Session-channel invocationはMCP serverを起動せず、importを追わず、inspected URLを開かず、
  customization commandをinvokeせず、inspected sourceへwriteしない。Hostはdevframeのoptional
  MCP routeをenableしない。
- Enabled inspection sourceは`node:fs/promises`上に構築したinspection moduleだけで
  enumerate/readする。API request、relationship、source fileが与えた任意absolute pathは受け付け
  ず、validated source IDとsource-relative enumeration recordだけを受け付ける。利用可能な
  capacityはNode.js、OS、filesystem、実行環境から継承する。全openはread-only、non-create、
  non-truncate flagだけを使う。Serviceはinspected sourceに対してwrite、append、create、
  truncate、rename、delete、link、chmod/chown、timestamp、extended-attribute、ACL、または同等の
  mutation-capable primitiveを一切callしない。Traversalは固定inspection-path allowlistの通常の
  recursive walkである。Symbolic linkは透過的にfollowする。Inspectorは同じpathをreadするagentが
  見るものを表示するからである。Targetがmissingまたはunreadableなlinkはそのfileの
  `file-unreadable` Diagnosticになり、recursiveなtraversalはreal pathで訪問済みdirectoryを追跡
  してlink cycleがscanの終了を妨げないようにする（FR-024）。Hard linkはphysical-identity
  groupingを持たない通常のfileである。Readに失敗したfileは`file-unreadable`、admit済みcandidateのNULを含むcontentは
  `file-content-binary`となる — censusが列挙したcompanionのbinary bytesは何も生まない。これらの
  Diagnosticを伴うoutcomeはfileに閉じ、影響を受けない全fileをcompleteに
  保ち、その他の条件を満たせばpublish可能なgenerationを`partial`とする（FR-028）。Selected
  rootが存在しないかdirectoryとしてreadできない場合は、Source attemptを`root-unreadable`で
  failさせ、そのattemptのgenerationをpublishしない（FR-002）。Operation間の反復identity再検証、
  race-detection taxonomy、ticket、receipt、resource-registry machineryは存在しない（FR-019）。
- Mutation verificationはproductのfilesystem callをinstrumentし、inspection前後のfixture
  content、length、identity/link state、mode、modification/change time、観測可能なextended
  attributeまたはACLを比較する。OS readだけによるaccess-time移動は別に記録する。
  No-product-mutation claimをfailさせず、そのproofにも数えず、productはaccess-time updateを
  requestしない。1 fileのread failureは`partial` generation内のそのfileの`file-unreadable`
  Diagnosticになる。1 fileに限定されないfailureはincomplete attemptを破棄して
  item/result/generationをcommitせず、RPC所有の場合はrequestのordinary errorとして表面化する。
  どちらのoutcomeもvalid、invalid、correct、incorrect、lint-failingのいずれともlabelしない。
- Productはuserが既にtrustしているworkspace内で動作する。Inspected customization fileを
  adversaryとしてmodelせず、scan中に変化または消滅したfileはrace-detection machineryではなく
  上記のper-file diagnosticまたは次の明示rescanで扱う。保持するobligationは、inspected content
  を実行しないこと、session hostがloopbackだけにbindして起動machineの外へ公開されないこと、
  表示contentをinertにrenderすることである。

## 必須contract test

1. Startup fixtureは、standalone hostのlistening socketが全supported OSでloopback address（platformの`localhost`解決に応じてIPv4 `127.0.0.1`またはIPv6 `::1`）へbindされ、
   どのconfiguration/flagも`0.0.0.0`、LAN address、Unix socketへbindしないこと、表示済みlaunch
   lineが`localhost` authorityを持つことをassertする。Channel fixtureは、productがsession channelへtoken、
   session capability、bearer header、origin classificationを追加しないこと — そこにある
   WebSocket origin gateはdevframe自身のものである — と、shipped
   documentationが残余unauthenticated-loopback limitation（他local process、DNS rebinding）を
   記載することを証明する。Presentation-output testはhelp/version text、1件の
   launch-URL line、固定startup warningをcoverし、unexpectedなstartup failureはそのordinary
   errorを表示する。
2. SuccessfulなRepository/Global rescan後は、commitしたsequenceのold file IDが失敗する一方、
   他方のsequenceのfile IDとdetail/comparison viewはvalidのままである。`remove-active-state`
   Global disableは全Global file IDを失敗させつつ、Repositoryの全generation-owned IDを維持
   する。`cleanup-only`はcommitted stateを変えず、両sequenceのgenerationと全generation-owned
   IDを維持する。Fatalな明示rescanは
   failed-attempt partialを0件publishし、last committed IDを保持し、retained session snapshotを
   staleにmarkして、exact 1つのfailure representation、すなわち決定的なreturned failureでは
   actionable Diagnosticへの参照、throw/rejectionではfailed requestのerror messageを運ぶ。
   Stale-failure fixtureはそのretained messageがstale snapshotとともに返ることをassertする。
   Bootstrap generation 0はcapture済み
   `process.cwd()`/`--root`から選択したexact 1つのnon-authorizing Repository Sourceを持つ。
   Multi-Source sequenceではA/Bのentry-failure pairが共存し、B successがAをclearせず、Aの
   partial successだけがAのpairをclearし、Aの再failureがAのpairだけを置換し、Global disableが
   除去Global Sourceのpairだけをclearすることを証明する。Diagnostic DTO fixtureは正確に3つの
   scope shape、すなわちmatching `sourceId`/`fileId`/`sourceRelativePath`を持つfile、`sourceId`
   だけを持つsource、location fieldを持たないsessionだけをacceptする。Source/file/pathの欠落、
   余分、mismatch、捏造の全組合せをserialization前に拒否する。Failure fixtureは、accept前
   throw/rejectionがそのinvocationだけをrejectして何もretainしないこと、accepted scan-job
   failureがその`scanRequestId`とともにfailed requestのerror messageとしてexact 1つの
   lifecycle ownerにretainされること、accepted disable-barrier failureがfailed
   `globalDisableInProgress` projectionの`message`だけにretainされることを証明する。Failed requestはsessionをusableに保つ。すなわち同じ
   channelが直後にretained prior snapshotをserveする。Request-owned rejectionはprocessをexit
   せず実際のerrorでrejectする。自動startup read rejectionはprocess top levelへ到達し、productは
   process livenessを保証しない。
3. Readable file detailはcompleteなauthored sourceと、各allowlist fieldについてparserが解決した
   値を、credentialとenvironment-reference textを含めてmask/reveal controlなしで返す。値はfieldごとに
   1件であり、2回宣言されたkeyは後の宣言へ解決される。File summaryはparse rollupを一切公開せず、`(fileId, tool, kind)`ごとに
   正確に1つのrecognitionが`not-attempted | parsed | failed`とown diagnostic IDを公開する。
   Parseが何をしたかを読み手が知るのはそこである。
   Compatible provenanceを1回mergeし、inconsistent meaningはそのrecognitionをall-or-nothingで
   failさせ、arrayはclosed tool-then-kind orderを使う。Comparison keyは
   `(tool, kind, fieldId)`とする。Astral character、combining sequence、通常BMP textにより、
   declared valueがextractionとJSON transportを丸ごと通過することを証明する。返却する全metadata tuple
   `(tool, kind, fieldId)`とrelationship tuple `(tool, kind, relationship kind)`は、維持管理する
   presentation allowlistに含まれ、かつexactなauthored occurrenceがrecognitionのactualな
   admission済みsource form用extractorでsupportされなければならない。Tuple membershipによって
   source form間でeligibilityをtransferしない。Unknownなauthored keyとreferenceは完全な
   `sourceText`からだけ利用可能とし、推論したmetadataまたはrelationshipを作らない。Evidence
   fixtureは`documented | partially-documented | unknown | conflict`だけをacceptし、unique
   fixed-orderの`preview | experimental | deprecated` qualifierを別に維持し、empty qualifier
   arrayをlifecycle claimなしとして扱う。Ruleと参照する全behavior/strategyについてsort済み
   `EvidenceAssessment`を1件ずつ要求し、lossy scalar assessmentを拒否してruntime
   `documentation-conflict`と区別する。Encoding fixtureは、admit済みcandidateのNULがbinary/diagnostic-only/`partial`であり、companionのNULは
   単なるbinaryの事実であること、
   valid textが`utf-8`、invalid non-NUL inputがreadableな`utf-8-replaced`で
   あり、全`U+FFFD`をparsing、detail、comparisonまで保持し、それ自体を理由にgenerationを
   partialにしないことを証明する。Alternate decoderを一切invokeしない。固定Codex default-hook
   fixtureは`targetOrigin: documented-default`、null `authoredTarget`、明示的な
   documented-default labelを返し、explicit manifest hookは`targetOrigin: authored`とexact
   occurrenceを返す。Sentinel process valueによりenvironment referenceをresolve/substitute
   しないことを証明する。testはdetail surfaceにauthored contentについての注意書きが
   現れないこと、`FileDetail` requestやcomparisonの前に確認stepが立たないこと、inventoryや
   sessionのresponseがauthored contentを運ばないこと、Reveal functionがRPC catalogに存在しない
   ことをassertする。直接のRPC testはacknowledgementのparameterもfunctionも存在せず、
   server-side presentation gateという主張ではなくloopback bindingが
   host-side protectionの全てであることを証明する。Cross-surface negative fixtureは
   Inventory、Detail、Comparison、Global control、Diagnostics、Source Condition Facts、API
   DTO、CLI output、documentationが文書化済みstructural projectionだけを公開することを証明
   する。Natural-language meaning/intentのinterpret/rank、
   correctness/validity/compliance/effectiveness/quality verdict、policy/remediation advice、
   validation、lint、synchronization、conversion、formatting、fixingのfieldまたはbehaviorを
   一切admitしない。
4. Extra parameter key、path-shaped input、malformedまたはwrongly typedなargumentが文書化済み
   safe rejectionを返し、unknown function nameは登録されずinvokeできない。Contract testは
   request、file、collection、parser、snapshot、detail、result DTOのいずれも、製品定義の数値
   capacity上限を公開またはenforceしないことを証明する。注入した1 fileに限定されないNode.js、
   parser、filesystem、serializationのfailureはdomain classificationをbypassし、owning RPC
   boundaryで実際のmessageを運ぶordinary errorとしてrejectする。Partial result、incomplete
   generation、validity/correctness/compliance/lint verdictを返さず、その後もsessionはusable
   でprior snapshotはreadableのままとする。Escape/key-order fixtureは1つの
   completeなJSON-serializable result valueがchannelを変更なしに通過し、clientで
   round-tripすることを証明する。
5. Static traversal/encoded traversal attemptがpackaged `dist/public` outputの外へ出ない。Serve
   される全byteがそのpackaged Nuxt outputに由来し、inspected fileを一切serveせず、root、
   `/compare`、`/global-consent`、`/skills/<fileId>`のclient routeがすべて同じpackaged SPA shell
   をbootし、そのshellはsession dataをembedしない。
6. Repositoryと各tool-specific Global rescanのqueue order、duplicate rejection、abort、partial
   outcome、fatal failure、pollingがwhole generationだけを公開する。別のSourceの後でqueueした
   scanはowning sequenceのその時点のcurrent generationから開始し、一方のsequenceのcommitは
   他方のsequenceのcommitted stateを観測可能なまま変更しない。`remove-active-state` barrierは
   generationをcommitせずにGlobal sequenceを破棄し、held Repository commandがN+1をcommitし得る
   前にRepository sequenceをunchanged Nのままにする。後のre-enableは既にincrement済みの
   greater `globalContentEpoch`のもとでGlobal sequenceをgeneration 1から再開するため、破棄
   されたera由来のGlobal resultはadoptされ得ない。`cleanup-only` barrierはcommitted stateを
   変えず、true no-opは両sequenceとRepository workを変更しない。どのbarrierもaborted
   transactionを公開せず、受理
   済みRepository commandをterminal success後だけ1回requeueする。`draining`/`committing`中の
   concurrent disableは1 operation/resultへjoinし、`failed`後のrequestはinherited cleanupを再開
   する。Pauseしたvalidation/admission operationを最後のcancellation sweep前にabort/drainし、
   その後late continuationを解放してもmutation、diagnostic、context、ID、jobを作らない。注入
   したunexpectedなadmission rejectionはouter boundaryへpropagateし、domain stateを変更せず
   製品定義のslot数に依存しない。Deterministicなbarrier-ordering fixtureではoperationを(a)
   validation await中、(b) admission後かつcontrol/context/diagnostic mutation前、(c) job
   enqueue/final result disposition直前でpauseする。各pauseでbarrierが先なら
   `global-disable-pending` conflict rejectionとなり、late side effectを許さず、operationを
   unregisterして後のenableを許可する。Operationのfinal dispositionが先なら、disable受理後に
   resultをdeliveryしても確定済みqueued acceptanceを維持する。Fence fixtureはfirst non-no-op
   acceptanceが`globalContentEpoch`をincrementし、session functionを即control-onlyにしてその他
   全inspection-data functionがretained `failed`中も含め`global-disable-pending` conflict
   rejectionを返すことを証明する。Accept後のdrain rejectionを
   注入し、failed requestのerror messageが`state: 'failed'`の間
   `globalDisableInProgress.message`だけにretainされること、process
   survival、content非再公開、
   idempotent retryを検証する。別のdeterministic delivery pauseではscan commit/disable
   acceptanceの前後にdata resultを保持する。Result epoch/generationとpayloadが混在せず、fence
   linearize時に未bind resultはconflict rejectionとなり、既にbind済みresultは文書化した
   bounded pre-fence responseとしてだけ扱ってclientがgreater epoch/fence観測時にpurgeすることを
   証明する。Old resultを無視し、あるsequenceのnewer generation採用時はそのsequenceのstateだけを
   abort/disposeして他方のsequenceのdetail/comparison viewはcommit後も残存し、detailは
   capture済みepoch、owning sequenceのgeneration、fileIdが全て一致する場合だけ
   adoptする。Disable、shutdown、supersession、注入したassembly/serialization rejectionのtestは
   filesystem promiseをpendingのままにし、publication authorityをrevokeして全late resultを破棄
   することを証明する。正しいouter boundaryだけがfailure、すなわちordinaryなRPC errorまたは
   startup top-level
   propagationを表面化させる。別の1 fileに限定されたcase、すなわちunreadable file、binary content、
   parse failureは、attempt全体のauthorityをrevokeせずに、影響fileのDiagnosticと影響を受けない
   全complete fileを持つ`partial`をpublishすることを証明する。Unreadable rootは代わりに
   `root-unreadable`とgenerationなしのfailed Source attemptを証明する。Underlying
   Node.js/kernel operationのhard cancellationや製品定義のcompletion deadlineはassertしない。
7. 全client routeのreloadはsession dataを一切開示しない。Serveされるshellはsnapshotをembed
   せず、新しくloadしたSPAはloopback RPC channelだけを通じてstateをadoptする。Session response/recovery testは
   browser/network/runtime rejection、channel loss、異なる`sessionId`でのport再利用、older/equal/greater epoch、
   null/draining/committing/failed projection、client epoch変更後のlate in-flight resultを扱い、
   pre-purge inventory/detail/comparison/editor/authored-content DTO/DOM stateが
   残留・復活しないことを証明する。Active consentがあるgreater epoch、non-null fence、または
   明示Resume後のrecoveryではloopback channel経由で再接続し、purge済みIDを保持・比較せず返された`sessionId`を
   採用してclosed recovery projectionだけを構築する。Active control/enable stateからdisableを
   直ちに利用でき、draining/committingではjoin/wait、failedではretry-disableを提示し、同じ
   frozen previewを取得・検証した後はeligible retry controlだけを再構築する。Fenceがnon-nullの
   間は明示Resume inspection actionを表示しない。Null fenceではpageがmatching full sessionを再取得
   してdefault stateのfresh inventory summaryを構築するが、pre-purge authored content、
   selection、filter、detail、comparison、editor stateを復元しない。後の
   detail/comparison requestはfresh sessionから改めて取得する。Accept前disable failureとtrue
   no-opはいずれもfresh-session fenceをnullのままにするため、purged clientは直ちにresume
   できる。
8. Global consent previewは候補pathに触れず、confirmationはserverが保持する唯一のpreviewを
   `previewId`で指名して、そのpreviewが保持するexact raw internal `lexicalRoot`とtyped
   traversal-plan version/programをbindする。Changed/superseded previewは
   readを許可できない。Create functionだけが3件すべてのenvironment inputをcaptureして
   unconsented previewをatomicにcreate/replaceする。Read functionはcaptureを0回とし、disable
   fence中も含めcurrent/frozen previewだけを返す。Missing-current、active-consent、
   in-progress-enable、disable-fence caseはaccidental replacementなしで文書化したclosed
   outcomeを返す。Escape-collision、control-character、backslash fixtureは、enableがstored raw
   valueだけを使ってenvironmentを再読込せず`displayRoot`を
   reverse-convertしないことを証明する。Parameterはtool selectorを持たず、initial enableは凍結
   済みentry 3件すべてを必ずevaluateする。Missing/unreadableなconsented rootと決定的なlexical
   outcomeがrejected toolとadmitted toolをpartitionし、unexpectedなthrow/rejectionは
   invocationをordinary errorでrejectし、initial control/jobをactivateせずprovisional subsetを
   一切commitしない。Provisional enable workはSourceをpublishしない。正常なcompleteまたはpartial
   batch commit 1件は1〜3個の別々にidentifiedされたGlobal Sourceをexact 1つのGlobal generation
   に同時に作り、toolごとに最大1個、Sourceごとに正確に1 rootとし、cross-tool mergeも
   observableなper-tool commitも行わない。1 fileに限定されないaccepted batch throw/rejectionはその1つの
   `scanRequestId`についてfailed requestのerror messageをfailed `batchStatus`にretainし、
   Source/generationもDiagnosticも作らない。
   Prior-currentとprior-staleの両caseをtestする。全rootを決定的にrejectするinitial activation
   は、all-lexically-invalid previewも含め、決定的な`active-no-job` acceptance、job/Source 0件、
   active `globalControl`を返す。`retryableTools`はexactなsame-preview subsetだけを含み、
   all-lexically-invalid previewではemptyとなってdisable/new previewを要求する。All-rejected
   retryもnew job/Sourceを0件とし、generationをcommitせず既存Sourceのsemantic contentとstable
   な`sourceId`を保持する。Partial acceptanceはevaluateした全toolをpartitionする。初回または
   retryのbatch publication成功はGlobal sequenceを正確に1回進め（initial enable commitが
   generation 1として作成する）、carried Global graphのGlobal generation-owned IDをすべて
   rekeyし、old Globalのfile/detail/comparison/editor stateだけを無効化する。RepositoryのID
   とviewは変更されずに残存する。Source publish成功は
   own control diagnosticをclearし、無関係なoutcomeは保持し、disableはGlobal Source未公開でも
   全control diagnostic/contextを削除する。Initial/retry validation/admission中にnewly visible
   なのは`globalEnableInProgress`だけとする。Initial enableは`globalControl`をnullのまま、
   retryはexact pre-operation control projectionを維持する。Result-boundなqueued acceptance時
   だけaccepted-batch toolを`pendingTools`へ表示し、`batchStatus`がexact promoted request ID、
   tool、active phaseを公開する。Terminal deterministic failureとthrow/rejectionはexact closed
   `failureRef` variantを使い、lost-acceptance recoveryはstatusをretainし、success、retry
   acceptance、disableはcontract済みclear/replace lifecycleを適用する。Active controlの
   `unvalidated` toolをretryableにしない。Mixed activation中は既にrejectedまたはnon-pending
   admittedとなったtoolを`retryableTools`へ表示してよいが、`pendingTools`がemptyになるまで
   retryをdisabledとし`global-enable-in-progress` conflict rejectionを返す。Disableは全期間
   利用できる。注入したunexpectedなadmission rejectionはconsent/control/Source stateを変更
   せず、invocationのordinary errorだけを表面化させ、全terminal outcomeで不要なoperation
   historyがretainされないことを証明する。Fatal初回scan後のretryでretained rootが変更済みまたはread不能になった場合、old
   operation-local contextと未公開IDを破棄して、後の再admission前にauthorityなしのrejected
   controlを残す。Exact-active-consent retryはserverのexact `retryableTools` subsetをderive
   し、lexical `new-preview-required` controlとchanged consentには先にdisable/new previewを
   要求する。Traversal fixtureはpublic patternがtyped plan由来で、exact Global targetはGlobal
   rootをenumerateせずにreadされ、fixed instruction-subtree walkはそのsubtreeだけをenumerate
   し、neighboring setting、credential、state、plugin pathへI/Oしないことを証明する。
9. Inspection moduleは、全supported OSでallowlisted inspection pathだけを
   readする。Symlinkされたcustomization fileは透過的にreadされ、他のfileと同様にlink先content
   を表示する。Targetがmissingまたはunreadableなlinkは`partial` generation内のfile-scopedな
   `file-unreadable` Diagnosticになる。Directory link cycle fixtureは、recursiveなtraversalが
   real pathで訪問済みdirectoryを追跡して終了することを証明する。Hard linkされたentryは
   grouping、alias、read-once behaviorを持たない通常の独立fileである。Unreadable fileは影響を
   受けない全fileをcompleteに保ったまま`partial` generation内の`file-unreadable`となり、
   unreadable rootは`root-unreadable`とgenerationなしのfailed Source attemptとなる。
   Instrumentationは全mutation-capable open flag、およびwrite、append、create、truncate、
   rename、delete、link、chmod/chown、timestamp、extended-attribute、ACL、同等のcallを拒否
   する。Before/after fixtureはcontent、length、identity/link state、mode、
   modification/change time、観測可能なextended attribute/ACLが不変であることを証明する。
   OS-only access-time movementは別に記録し、failureともproofともせず、product callはそれを
   requestしない。Operationのlifecycleは製品定義のconcurrency上限なしで管理する。
10. Packaged CLIはauthenticationをdisableしたdevframe standalone adapterをbootする。Fixtureは
    `auth: false`、packaged `dist/public` UI directory、`agent-customization-inspector:`
    function namespaceをassertし、`--no-open`がbrowserを開かないこと、自動openingが
    disabled/unsupported/failedでもinspectionをusableに保つこと（FR-001、FR-022）を証明する。
    Package integrity、dependency-closure、packed-fileのassertionはpackage testとrelease gate
    が所有する。Runtimeはmanifestやsibling-artifactの再検証を行わず（Constitution Principle
    I）、どのpackaging fixtureもcustomization-file contentを分類しない。
11. 全自動/明示scanはuniqueなopaque `scanRequestId`を受ける。Repository/Global rescan
    admission result、Source summary、waiting/active/final progress、fatal status、successful
    generation recordは同じIDを保持し、stale/prior request stateはnewer requestを満たせない。
    SC-002 browser protocolはfresh processを開始し、自動Repository scanがterminal stateへ到達
    するまでtiming外で待って、明示Repository rescanを正確に1件dispatchし、そのadmission IDを
    captureする。Status/inventory timerは、同じIDに関連付けられたvisible render済みstateと
    commit済みRepository generationでだけ停止する。EvidenceはIDとRepository generationの両方を
    記録し、すでにrender済みの自動inventoryはqualifyしない。
