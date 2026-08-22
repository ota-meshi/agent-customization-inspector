# Contract: Local Session Transport

[English](http-api.md)

**API version**: 1
**Transport**: `localhost`（loopbackのみ）へbindし、authenticationをdisable（`auth: false`）した
devframe 0.7.5 standalone host
**RPC namespace**: 全session functionを`agent-customization-inspector:` name prefixで登録する

このcontractは、eslint/config-inspectorと同じ基盤であるdevframe local-tool frameworkを
通じて、static Nuxt SPAを同じprocessのNode inspection hostへ接続する。このfileはcross-reference安定の
ため歴史的な`http-api` filenameを保持するが、定義する内容はlocal session transportの全体である。
Public network APIではない。Session channelはopaque ID、commit済みSource-relative Path、closed command
だけを受け付ける — Source-relative Pathはcommit済みsnapshotに対して解決される公開identityであって
filesystem operandではない — 。rawまたはabsoluteな
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
3. Static byte servingはdevframe-ownedである。ServeされるSPA shellとassetはNuxt buildがpackaged
   `dist/public`へ出力したものそのままであり、productはstatic-assets manifest、per-asset
   integrity再検証、hand-written routerを一切定義しない。その前段にあるproduct所有の要素は
   closedなdetail-route rewrite — `/skills/**`、`/instructions/**`、`/mcp/**`、`/rules/**`、`/permissions/**`、shipped kind
   detailごとに1 family — だけである: これらのroute familyに入るpathの`GET`/`HEAD`を`/`へ
   書き換えてfall throughさせ、extension-guardedなSPA fallbackがfile missとして扱うdetail deep
   linkにも、devframe自身のstatic handlerがpackaged shellをserveする。Rewriteはfilesystemに
   触れず何もshadowしない — いずれのfamily配下にもpackaged assetは存在しない(§ 必須contract test
   項目5)。Nuxtは
   `app.baseURL: '/'`、CDN URLなしを使うため、shellは全client routeで変更なしに動作する。
   Static servingはpackaged UI output directoryの外へ到達せず、inspected fileへfallbackしない。
4. 起動時にhostは正確な`http://localhost:<port>/` URLを起動元terminalへ1回表示する。自動browser
   openingはstartup openerを通じたproduct-ownedかつFR-001に基づくbest-effortであり、openerは
   launch lineの後にだけ動き、devframeのbundled openerは無効化されてproductのopenerだけが動く。
   macOSでは、起動中のChromium系browserが既に持つsession tabを、`open` packageのhelperが新しい
   tabをspawnする前にfocusする（research.md § 3）。`--no-open`はopeningを何も出力
   せずに抑止する。Unsupportedまたはfailedのopenerはstartupを妨げず、表示済みURLがfallbackとして
   残る。Productはbrowser opening outcomeを報告しない: openingはbest-effortで表示済みURLが完全な
   fallbackであるため、openerのfailureは表面化させず握りつぶす。spawnされるどのprocessもinspection由来のcontentもpathも受け取らない
   （FR-022）。任意のclient routeのreload/direct navigationにtokenは不要である。Serveされる
   shellはsession dataをembedせず、新しくloadしたSPAはRPC channelだけを通じてstateをadoptする。
5. 固定help/version textと必須の起動元terminal向け1回限りlaunch lineのほかに、hostはtelemetryも
   operational-event streamも定義しない。FR-022が既に起動
   machine外への送信を禁止している。Terminal/UI outputを読むのはinspected fileを所有する同じ
   userであるため、failureは通常どおり報告する。すなわち実際のerror messageを、product定義の
   content filterなしで表示または返却する。
6. 各functionは宣言済みparameterだけをreadし、各functionの節がそのparameterと、
   不一致が生むrejectionを文書化する。宣言済みparameterの検証はresolutionであって、
   その前に置くshape guardではない: 出荷済みcatalogが宣言するparameterの形は1つだけ —
   `get-file-detail`、`get-mcp-carrier-detail`、`get-permission-policy-detail`がそれぞれ
   取るcommit済みSource-relative Path、すなわちcommit済みgenerationに対して解決される
   published identityであって
   filesystem operandではない — であり、invokeされたfunctionがそのresourceを保持しない
   あらゆる値は、別の型の値も含めて、どこにも解決されず`stale-resource` rejectionになる。
   Global functionのpreview、allowlist-version、consentの各parameterも同じ形で自身の
   文書化済みcodeを持つ。汎用のmalformed-argument語彙は存在しない。Resolutionが既に
   一致させ得ないshapeや、functionがreadしない余分なpositional argumentの拒否は、
   保護すべきfailure modeを持たないruntime guardだからである。`Parameters: none`と
   宣言したfunctionはinputを一切readしないため、boundaryで検証するものがない。宣言する
   全resultとrejectionは1つのcompleteなJSON-serializable value — plain object、array、string、number、booleanのみで、`Map`、`Set`、`Date`、class instanceを含まない — とする。Transport容量は
   製品定義のrequest-size上限ではなくNode.js、devframe、実行環境から継承する。

## RPC function一覧

| Function | Kind | Purpose |
|---|---|---|
| `agent-customization-inspector:get-session` | read | Full `SessionSnapshot` snapshot、またはfence中のcontrol-only `GlobalFenceRecoverySnapshot` |
| `agent-customization-inspector:get-file-detail` | read | Active-generationの`FileDetail` 1件 |
| `agent-customization-inspector:get-mcp-carrier-detail` | read | Active-generationの`McpCarrierDetail` 1件: MCPを宣言する1 fileの宣言とfileの事実。sourceは決して含まない |
| `agent-customization-inspector:get-permission-policy-detail` | read | Active-generationの`PermissionPolicyDetail` 1件: 宣言された1つのpermission policyを、document全体またはblockとして |
| `agent-customization-inspector:rescan-repository` | command | 明示Repository scan command 1件の受理 |
| `agent-customization-inspector:open-file` | command | Commit済みfile 1件をreader自身のmachine上のapplicationで開く |
| `agent-customization-inspector:get-global-consent-preview` | read | Currentまたはfrozenの`GlobalConsentPreview` |
| `agent-customization-inspector:create-global-consent-preview` | command | Unconsented previewのcaptureとatomicなcreate/replace |
| `agent-customization-inspector:enable-global` | command | Session-wide consentの確認。Initial enableとactive-consent retry |
| `agent-customization-inspector:rescan-global` | command | Enabled Global Source 1件のscan command受理 |
| `agent-customization-inspector:disable-global` | command | Priority Global-disable barrier |

Comparison viewは最大2件の`get-file-detail` resultから — MCP declaration comparisonでは
2件の`get-mcp-carrier-detail` resultから — client側で構築する — 存在する側ごとに1件で、
片側comparisonの明示された不在の対応物はrequestを要しない — 。独立したcomparison functionは存在しない。Catalogのどこにもmasking、redaction、reveal、environment-resolution
functionは存在せず、hostはdevframeのoptional MCP routeをenableしない。

同じchannelには、このcatalogではなくframeworkが無条件に登録するdevframe自身のbuilt-inも載る:
`devframe:agent:list-tools` / `invoke-tool` / `list-resources` / `read-resource`（空 —
productはagent toolもresourceも登録しない）、`devframe:rpc:server-state:subscribe` / `get` /
`set` / `patch`（未使用 — productはserver stateを共有しない）、`devframe:streaming:*`（未使用 —
productはstreaming channelを宣言しない）。Editor/finder helper（`devframe:open-in-editor`、
`devframe:open-in-finder`）はこのproductがimportしないopt-in recipeであり、登録されない:
どちらもcallerが送ったpathをそのまま開くのに対し、§ open-fileは先にpathをcommit済み
generationへ解決するため、launchが受け取り得る絶対pathはこのsessionが公開したものだけになる
（FR-022）。

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
generation 1として作成し、disableが何もcommitせずに破棄する。Full `SessionSnapshot`では
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
SessionSnapshot
├── fileOpenTargets[] — このhostがcommit済みfileを渡せるapplication。detail surfaceが
│   提示する順で、通常のclickが使うものが先頭: このmachineでhostが解決したeditorが並び、
│   続いてどのmachineも自身のhandlerで満たす`default-application`と
│   `containing-folder`（§ open-fileを参照）
├── sessionId, createdAt, repositoryGeneration, globalGeneration, snapshotState, globalContentEpoch,
│   staleFailures[] { sourceId, failureRef, failedAt, baseGeneration },
│   globalEnableInProgress null | { kind, operationId, previewId },
│   globalDisableInProgress null | { operationId, state, message? },
│   globalControl null | { state, previewId, confirmedTools[], pendingTools[], retryableTools[],
│                         batchStatus null | { scanRequestId, tools[], phase, failureRef } },
│   sessionDiagnosticIds, repositoryFailureDiagnosticId
├── sources[]
│   ├── sourceId, kind, tool, enabled, status, generation, scanRequestId
│   ├── boundary { displayRoot, origin }
│   └── progress null | { scanRequestId, phase, visitedEntries, candidateFiles, readBytes,
│                         diagnosticCount, queuedAt, startedAt }
├── files[]
│   └── sourceId, sourceRelativePath, diagnostic IDs, and encoding as the variant
│       discriminator — readable text adds sizeBytes and hadLeadingBom;
│       binary adds only sizeBytes; unknown adds nothing. A file publishes its own facts
│       only; what it was recognized as belongs to a per-kind inventory below
├── instructions[]
│   └── applicabilityRange string | null,
│       files[] { sourceRelativePath, recognitions[] { tool, surfaces[] } } —
│       適用範囲1つにつき1行、その範囲が担当する各 file を、その file の
│       recognition を closed tool order で、各 recognition の product surface を
│       closed surface order で持つ。null の1行が一覧を閉じ、既知の範囲を
│       持たない file を持つ
├── rules[]
│   └── sourceRelativePath, recognitions[] { tool, surfaces[] } —
│       認識された rule file 1つにつき1行、その recognition を closed tool order
│       で、各 recognition の product surface を closed surface order で持つ
├── prompts[]
│   └── name string,
│       definitions[] { sourceRelativePath, tool, surfaces[], diagnosticIds[] } —
│       読み手が起動する名前1つにつき1行を name 順で持ち、各行はその名前で
│       起動される file を Source 相対パス順、次に tool 順で列挙する。どの名前
│       になるかは、その file を admit した rule のものである。command file
│       の名前が著述されることはない: どちらの product も command file の
│       `name` key を無視し、それぞれが command を path から導出する。両者が
│       一致する root 直下の子は両方を名指す 1 row となり、nested な file は
│       Claude 単独の row となる。VS Code prompt file の名前は、その file が
│       宣言した `name` であり、宣言がなければ自身の file 名が代わりに立つ —
│       command が解決する名前を宣言した prompt は、その command の row の
│       definition となる
├── permissions[]
│   └── sourceRelativePath, recognitions[] { tool, surfaces[] },
│       diagnosticIds[] —
│       宣言された permission policy 1つにつき1行。宣言する file の path で
│       名指す。宣言しない carrier は残りを所有する kind として認識され、
│       ここには row を持たない
├── skills[]
│   └── name string,
│       definitions[] { sourceRelativePath, tool, surfaces[], parseStatus,
│                       invocationName, diagnosticIds[], companionFiles[] },
│       sameNameResolutions[] { tool, resolution } — one per tool facing a collision
├── mcp[]
│   └── name string | null,
│       declarations[] { sourceRelativePath, tool, surfaces[], parseStatus,
│       diagnosticIds[] } —
│       宣言されたserver名1つにつき1行で、その名前を解決する各宣言を
│       carrier path順、次にtool順で持ち、各宣言はadmissionが依拠するvendor
│       surfaceをinstruction fileのrecognitionと同じ形で運ぶ。nullの1行が一覧を閉じ、
│       named宣言を公開していないcarrierを持つ
└── diagnostics[] { diagnosticId, code, sourceId string,
    sourceRelativePath string | null — file scope以外はnull }
    （active-generation recordとsession-owned lifecycle record）
```

一覧rowの単位はfileではなくkindが決める。Skillは1つのtoolが解決した1つの名前である
（data-model.md § 一覧の単位）: authoredなfrontmatter `name` — fileが宣言しないか空で
宣言する場合、またはextractionが失敗した場合はskill directory名。directoryはpath自身の事実であり、
失敗したparseから読み出した値ではない（FR-028）。したがって`name`がnullや空になることはない — であり、
nestedなskillのClaude Code recognitionはroot相対のprefixを前置するため、`name: deploy`を宣言する
`apps/web/.claude/skills/deploy/SKILL.md`はClaude rowでは`apps/web:deploy`である。
1つの名前に解決される複数の
`SKILL.md`は、複数の定義を持つ1つのentryとして公開される — 名前を宣言せず同名のskill
directoryに置かれた2つのfileもその一例である。認識toolごとに異なる名前へ解決される
定義は1つのtoolによる1つのfileのrecognition — ToolRecognitionの単位、`(file, tool)`につき
1つで、`definitions[].tool`が名指す — であるため、2つのtoolが1つの名前に解決するfileはその
entryの2つの定義であり、toolごとに異なる名前へ解決されるfileは各名前のentryで定義される。
定義の`invocationName`は、その定義自身のtoolの文書がこのfileに与えるinvocation nameである: Claude Codeの
command名はfrontmatterの宣言に依らずpathから導出され — skill directory名で、nestedなら
root相対prefix付き — 、CodexとCopilotはauthoredな`name`を、fileが宣言しない場合はrowと同じ
skill directoryフォールバック付きで呼び出す。Toolがauthoredな名前を呼び出し、かつその定義の
extractionが失敗した場合に限りnullとする: その名前は不在ではなく不明であり、directoryを公開すれば
失敗したparseから値を読み出すことになるからである（FR-028）。定義は自身のrecognitionの
`parseStatus`とextraction失敗の`diagnosticIds`も運ぶ: extractionはkindごとに1回なので失敗の
recordも1件であり（FR-028）、そのfileの失敗した各定義がそれを参照し、fileの`files[]` entryは
それを1回だけ列挙する。Detailは公開されている場合にpageを所有する定義のinvocation nameを
row名の傍らに示す（data-model.md § Skillの表示）。値はrowをkeyする同じprojectionから来るため、vendor
namingがserverとclientの間で乖離することはない。MCP rowは宣言されたserver名1つであり、その名前を解決するすべての`[mcp_servers.*]`型宣言 —
`(carrier, tool)`ごとに1つ — を列挙する。したがってadmit済みの`.codex/config.toml` 1つは宣言した
serverごとに宣言を1つ寄与し、同じ名前を宣言する第2のcarrierはその名前のrowに合流する。宣言の
住処は明示的なcarrier — Codexのconfiguration layer、Claudeのroot `.mcp.json`、Copilot CLIの
root `.mcp.json`と`.github/mcp.json`、VS Codeの`.vscode/mcp.json` — だけである:
他のkindのfileが自身の内容にMCP風のconfigurationを綴っても — skillやagentのfrontmatter、
settings fileのinline map — それはそのkindの通常のcontentであり、そのfile自身のdetailに
見えるだけで、MCP rowには合流しない。各宣言は自身のfileを名指す。2つのproductが
admitする1つの物理file — root `.mcp.json` — は、宣言する各名前の下でrecognizing toolごとに
1宣言になる。nameが
nullである1つのrowがlistを閉じ、現在named宣言を公開していないcarrierを保持する — 宣言blockが
読めなかったのか何も宣言していないのかは、各宣言自身の`parseStatus`が区別する（FR-028）。Instructions rowは1つの適用範囲 — 担当するfile自身のpathが導出するglobであり、Repository rootでは`**`、あるいはfileが自身のために宣言したもの — であり、担当する各fileを列挙する。したがってrootの`AGENTS.md`と`CLAUDE.md`は1 rowを共有し、`packages/api/CLAUDE.md`は自身のrowを持つ（data-model.md § 一覧の単位）。範囲がnullである1つのrowが一覧を閉じる: そのfileのvendorはこのfile名の適用可否を宣言だけから読み、宣言はrowをkeyできるものを何も供給していない — あるいはまったく読めなかった。その理由は各file自身のdiagnosticsが述べるため、rowは「宣言がない」ではなく「既知の範囲がない」と述べる（FR-028）。列挙されるfileはtoolではなくrecognitionを名指す。toolだけでは、productがそのfileをどこから読むのかを言えないためである: GitHub CopilotのeditorとCLIとcloudの各surfaceは、同じ名前のfileに対して異なるlookup baseをdocumentしている。したがってrootの`.github/copilot-instructions.md`は3つのsurfaceすべてが読み、同じ名前でもsubdirectoryにあるものはCLIのcontextだけである。各recognitionの`surfaces`は、そのfileをadmitしたruleが依拠するdocumented behaviorのsurfaceであり、surfaceを名指すことはそのsurfaceがfileをloadしたという主張では決してない（FR-009）。Skillのdefinitionも同じ理由でこれを述べる: definitionは名前の下にある1つのrecognitionであり、FR-009はproductがいくつsurfaceを持つかによらず、すべてのrecognitionの隣にsurfaceを述べるよう定めている。Rules rowはrule file 1つ、permissions rowは宣言されたpermission policy 1つであり、宣言するfileのpathで名指す: どちらもrowのkeyにできる名前を宣言せず、groupingできる範囲も担当しないため、Source相対Pathがrowの同一性であり、2つのproductが認識するfileは2つのrecognitionを持つ1 rowになる。名指し方はinstruction fileのrecognitionと同じである（data-model.md § 一覧の単位）。2つのkindである理由は主題が違うことにある — permission policyはproductがどのcommandやtoolを実行してよいかを決め、ruleはproductが読む指針である — うえ、両vendorがたまたま自身のdirectoryを`rules`と呼ぶため、その共有された語でまとめると無関係な2つの主題が1つのlistに並ぶ。Permissions rowはpolicyが宣言されている場所にちょうど存在する: file全体がpolicyであるfileは1 row、より大きなdocumentの1 blockとしてpolicyを運ぶfileも1 row、そのblockを宣言しないcarrierはどちらでもない — そのdocumentの残りはそれを所有するrecognitionのものであり、rowにすれば作者が書いていないpolicyを述べることになる。Permissions rowは`diagnosticIds[]`を運ぶ唯一のkindのrowであり、その例外はこのkindが何を読むかに由来する: 宣言されたblockはparserが拒み得るdocumentから読み出されるため、extraction自身のrecord — blockは1度だけ読むので、fileごとに1件 — が、見えているrowが何も公開しない理由を読み手に伝えるものである。他のどのkindのrowもfileの事実を繰り返さない。述べるべき自身の事実を持たないからである。Rowはproductがそのfileをloadまたは強制しているという主張では決してない: ruleがcontextにあるか、permission ruleが有効かは、このtoolが観測しないruntimeに依存する（FR-009）。他のkindの単位は、その一覧を出荷するtaskが、そのkind自身の
vendor contractから決める。したがって物理fileは
`files[]`に自身の事実 — path、read結果、size、diagnostic — とともに1度だけ現れ、各kindの一覧は
`sourceRelativePath`で参照してそれらを繰り返さない。定義が持つrecognition所有のparse事実だけが
意図した唯一の例外である。定義がそのrecognitionだからである。

`files[]`は、directory形式のcustomizationに付随するfileも運ぶ。Skillは全体として読むため、その
directory内のscript、reference、assetは他のfileと同様に公開される
（contracts/inspection-path-allowlist.md § Bounded companion census）。Census自体は何もadmitしない
ため、censusだけが列挙するfileはどのkindの一覧にも属さない。ruleが独立にadmitするpath — 別のskillの
directory内にnestedな`SKILL.md` — は、外側のcensusに列挙されていても自身のrecognitionとrowを持つ
candidateである。付随fileを名指すのは所属するskillの
`definitions[].companionFiles`であり、各pathがそのfileのidentityそのものなので、clientは
`files[]`を通じて各fileの自身の事実へ到達し、そのcustomizationのdirectoryを提示する。

`sameNameResolutions`は、entryの定義のうち2つ以上をproductが認識する名前について、そのproductが
どう解決するかを述べる。これによりgroupingがInspectorの記録していない優劣を暗示することはない。記述を
持つのはその衝突に直面するproductだけとする: 定義が1つのentryには解決すべきものが無く、複数のうち
1つしか認識しないproductには選ぶ対象が無い。他の定義はそのproductのfileではなく、そこにruleを引いても
問われていない問いに答えることになるからである。衝突は引用するruleが答えるものでもなければならず、
Claude Codeのruleはskill directoryに由来するunqualifiedなcommandの衝突に答える: その記述は、
Claude定義のskill directory名を同一generationの別のClaude認識skillと共有するすべてのentryに付く。
extractionが失敗した定義は、authoredな名前を呼び出すtoolにとって衝突の証拠にならない: その名前は
不明であり、rowへの所属はtoolが解決した名前ではなくこのproductの暫定的なgroupingだからである
（FR-028）。Skill strategyが出荷レジストリに無いproductも持たない。
そのproductはskillを認識しないため、どのentryもそこへ到達しない。記述はproductごとに異なり、
どれも完全には文書化されていない。

このfull DTOを返すのは`globalDisableInProgress`がnullの間だけとする。Non-no-op disable barrier
受理後は、このfunctionが代わりに次のexact control DTOだけを返す。

```text
GlobalFenceRecoverySnapshot
├── sessionId, globalContentEpoch
└── globalControl, globalEnableInProgress, globalDisableInProgress（requiredかつnon-null）
```

失敗したtoolの理由は失敗したcontrol自身の`failureCode`に載るため、recoveryは専用のDiagnostic
arrayを持たない。Retain済みfailed disable requestのerror messageは、non-null projectionの
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
sequenceのcommitはそのsequenceのviewだけをinvalidateし、他方の
sequenceのfile、detail、comparison viewには触れない（FR-030）。
`boundary.displayRoot`はone-way escapedなroot presentation labelであり、`SourceRelativePath`、
inventory-item locator、caller input、read authorityではない。同じ区別を
admission前のconsent-preview `displayRoot`にも適用する。Owning Sourceが存在する前のabsoluteまたは
invalidなlexical rootを表し得る。
Bootstrap Repository rootは`--root`省略時に`origin: process-cwd`、指定時に`origin: root-option`を
持つ。APIはretained raw rootもcanonical rootも公開しない。
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
source-relative pathの決定的順序 — pathはSource内でuniqueなので、これで既にtotal orderである。
Fileはrecognition summaryもparse rollupも持たない — recognition自身の`parseStatus`がparseの
事実であり、file-levelのaggregateには読み手がいなかった。何として認識されたかはkindごとの一覧に属し、
各rowはそのkindを識別するものだけを運ぶ。Aggregateなdocumentation/applicability status、parse result、
winnerを発明することはない。製品が発見したfileを使うかどうかは、どのresponseも述べない: それは
hostが決して観測しないruntimeに依存するため、それについては何もpublishしない（FR-009）。

1 generation内で各`(file, tool, kind)`に対する`ToolRecognition`は正確に1つとする — これは
inventoryとdetailの両方がprojectされるcommit済みgenerationの内部recordであり
（data-model.md § ToolRecognition）、どのresponseも運ばない。Compatible
provenanceはそのrecognitionへmergeする。Provenance間でparsed meaningがinconsistentなら、その1
recognitionを`failed`とし、当該recognitionのmetadata、relationship、derivationを1件もpublish
しない。Competing recognitionへ分割しない。

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
常に2つとも存在し、そのscopeが使わないものはnullとする。Legalな組み合わせは2つだけで、`file`は
`sourceId`と当該fileのSource-relative Pathが両方non-null、`source`は`sourceId`が
non-nullでpathがnullとする。Path-lessなscopeは存在せず（すべてのdiagnosticはSourceに属する）、
source scopeのrecordはpathを捏造しない。それ以外の組合せはserialization前に拒否する。
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
のみ到達でき、inventoryやsessionのresponseはそれを運ばない。例外はrowが列挙される識別子で
ある。自らが列挙するものを名指せない一覧はinventoryではないからである（FR-007、data-model.md
§ 一覧の単位）。これを持つrowは2つある: skill entryの`name` — 認識した各toolが解決する名前、
つまりauthoredな`name`で、nestedなClaude Code recognitionではroot相対のprefix付き — と、
fileがpathから導出するのではなく自身のために宣言した場合のinstructions entryの
`applicabilityRange`、すなわちCopilotの`applyTo`である。それぞれのauthoredな部分は、scan時の一度のparseが解決した値である（data-model.md § Fieldの読み取り）— skill nameの`007`は`7`として、rangeのquoteとescapeは解決済みで — この製品はmasking・escape・正規化のいずれも加えない。skill名のうちこの製品が供給する部分 — fileが宣言しないときのdirectory fallbackと、nestedなClaude Code recognitionが持つroot相対のprefix — は、responseが既に公開しているpathから、FR-007の命名ruleに従って構成される。
どちらもrowのidentityを超えて広がらず、他の宣言値がそれに伴って運ばれることはないため、
それ以外の宣言済みの値は明示的なdetail requestの背後にとどまる。中央full-session client-data purgeは
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
`waiting | deriving | enumerating | reading | recognizing`で`failureRef`はnullとする。Batch
successは全Sourceをatomicにpublishし、両fieldをclearしてGlobal generationをexactに1回commitする
（initial enableではgeneration 1、retry batchではGlobal sequenceのN+1）。Terminal
deterministic failureはempty `pendingTools`と`phase: failed`を維持し、
`{ kind: 'tool-failures', failedTools }`を持つ。`failedTools`はこのbatchが失敗させたtoolの
non-empty fixed-order setで、各toolは自身のcontrol上にnon-nullな`failureCode`を持つ。Terminalなthrow/rejectionは
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
Controlの`failureCode`は、そのtoolが失敗したclosedな理由であり、そのtoolが失敗しpublished Source
を持たない間だけnon-nullとする。Clientはそのcodeが名指す文を、あらゆるclosed unionと同じように
描画する。これはDiagnosticではない: DiagnosticはSource内で何かを読んでいる最中に起きたことを
述べるものであり、rootを一度もadmitされなかったtoolには、それが属するSourceが無い。そのcontrol
failureのclearまたはdisable commitまで保持する。Failed `batchStatus`のerror messageは、active consent全体について
1件のaccept済みadmitted-subset Global batch throw/rejectionを記録する唯一のretained recordで
ある。Accept前retry failureは保持し、決定的な
`active-no-job` retryまたはreplacement-batch acceptanceはclearし、replacementのterminal failureは
supersedeし、Global disableはremoveする。1 toolを識別せず、`StaleSourceFailure`を作らない。

Outcomes: fullまたはfenced DTO。

### `agent-customization-inspector:get-file-detail`

Parameters: commit済みSource-relative Pathを1つ、functionの単一positional argumentとして
渡す。Fileのidentityは、そのSourceとSource-relative Pathである（FR-030）。1つのpathを
保持できるSourceが1つだけの間 — Global commitが第2のSourceをpublishするまでの全session —
はpath単独がそのidentityを運ぶ。2つのSourceが1つのpathを保持できるようになるのと同じ
phaseで、Global taskがこのfunctionとdetail/comparison routeへSource qualifierを追加する
（tasks.md T1001/T1003）ため、同一pathのGlobal fileがRepository fileに隠されることはない。

```json
".claude/skills/deploy/SKILL.md"
```

Active-generation file detailを1件返す。fileをrecognitionが所有するかどうかで判別される。

```text
FileDetail — kind: 'skill' | 'instructions' | 'prompt/command' | 'rule' | 'file'
├── kind 'skill' — fileは認識されたskillのentry point:
│   ├── file — encodingで判別されるCustomizationFile 1件:
│   │   ├── sourceId, sourceRelativePath, encoding, diagnosticIds[]
│   │   ├── readable textはさらにhadLeadingBom, sourceText, sizeBytesを持つ
│   │   └── binaryはさらにsizeBytesを持ち、unknownはこれ以上何も持たない
│   ├── presentation — scan時の1回のparse。extractionがall-or-nothingで
│   │   失敗したときは正確にnull（FR-028）:
│   │   ├── frontmatter[] { key, keyKind, value } — valueは
│   │   │   { kind: 'scalar', scalarKind, text }、{ kind: 'absent' }、
│   │   │   { kind: 'sequence', items[] }、
│   │   │   { kind: 'mapping', entries[] { key, keyKind, value } }のいずれかで、再帰する
│   │   └── bodyText
│   └── diagnostics[]
├── kind 'instructions' — fileは認識されたinstruction file:
│   ├── file — 上と同じ
│   ├── presentation — skill variantと同じ: 同じscan時の1回のparseで、
│   │   失敗時nullの規則も同じ（FR-028）
│   └── diagnostics[]
├── kind 'prompt/command' — fileは認識されたcommand file:
│   ├── file — 上と同じ
│   ├── presentation — skill variantと同じ: 同じscan時の1回のparseで、
│   │   失敗時nullの規則も同じ（FR-028）
│   └── diagnostics[]
├── kind 'rule' — fileは認識されたrule file:
│   ├── file — 上と同じ
│   └── diagnostics[]
└── kind 'file' — fileを所有するrecognitionが無い（censusだけが列挙したfile、
    またはdiagnostic-onlyのcandidate）:
    ├── file — 上と同じ
    └── diagnostics[]
```

どのvariantも、このproductの外でfileを指すlocatorを持たない。Reader自身のmachine上の
applicationで開くのは§ open-fileの役目であり、同じSource-relative Pathを同じcommit済み
generationへ解決する: 絶対pathはhostのものであり、clientがSourceのrootとして受け取るのは
一方向の`displayRoot` escapingだけである（data-model.md § SourceBoundary）。したがって
detail responseは、pageが開けるものを何も渡さない。

この木がresponseの形そのものである: clientは正確にこのfieldだけに依存できる。
`prompt/command` variantが`presentation`を持つのは、prompt/command fileがskillと同じ
frontmatter keyを取るためであり、そのdetailはfileが書いたdeclarationと、その後に続く
promptから始まる。持たないのは、読み手が入力する名前である: これはdetailのfieldではなく
ruleが答えるものであるため、inventoryの事実であり — 各`prompts[]` rowがgroup化される
名前そのものであり — skillの認識toolとinvocation nameが`skills[]`の事実であるのと同じで
ある。名前を宣言したprompt fileも例外ではない: その宣言はfileが書いた他のkeyと同じく
`presentation.frontmatter`にあり、ruleがそこから何を作ったかがrowの事実である。
`rule` variantは`presentation`を持たない: これらのfileはauthorが書いた
1つのdocumentとして公開され、そこから何も読み出さないためである。Claudeの`.claude/rules/**` fileは
frontmatter blockを含めて丸ごとresponseへ届く — ruleをdeclarationとbodyへ割ると、1つの
fileとして書かれたものを2つの半分として読者に見せることになる。何も読み出さない以上、読み出しに
失敗することもない: このkindはextraction diagnosticを生じず、宣言された`paths` globは
本productがfilesystem pathに対して評価することのないauthored textである。それでも独自の
variantであるのは、recognitionがこのfileを所有しており、そのinventory rowがそう述べて
いるからである。

Permission policyはこれらのvariantに含まれない。Permissions rowが名指すのはfileではなくpolicyで
あり — あるvendorのpolicyはそれ自体が1つのdocumentであり、別のvendorのそれは、他のkeyが別の
recognitionに属するsettings fileの1 blockである — したがってpolicyは
`get-permission-policy-detail`のresultであって、対象ではないfileについて答えねばならなくなる
ここでのshapeではない。
他の認識kindが示すparseはfileの事実であって認識toolのものではない — shippedな全vendorが同じ固定YAML
semanticsを読むため、extractionは`(file, kind)`ごとに1回実行される — ので、responseは
それを`presentation`として1回だけ公開する。Toolごとのrecognition一覧は存在しない:
どのtoolがこのfileを認識するか、各toolのinvocation name、そのparse stateはinventoryの
事実（`skills[].definitions[]`）であり、routeのtool segmentがpageの対象定義を言う。
instruction fileの認識toolはそのinventory row（`instructions[]`）でfileの隣に
列挙され、detail routeはtool segmentを持たない。pageが示す内容を分ける
toolごとの事実が存在しないためである。
Admission recordも存在しない: どのruleがreadを認可しどこにmatchしたかは、relationship
phaseが読むことになるcommit済みgenerationの内部record（data-model.md § ToolRecognition）
であり、session responseは運ばない — したがって設定済みfallback instruction fileの
detailは、staticなものと形の上で区別できない。Edge recordの`relationships` arrayも存在しない —
shipped recognitionはedgeを1つも生成できないため、すべてのresponseで空になる。これは
それを埋めるrelationship phaseとともに到着する。Instruction fileは、どのproductが認識しても
1つも生成しない。この製品はprose中から参照を読み取らない: 書かれた`@path`状のtokenがどこで
終わるかを定めたvendor pageは無く、境界ruleはすべてこの製品自身の発明になり、誤ったruleは
読者が書いていない参照を主張することになるからである。そのtokenはsource textのままであり、
instruction originをcoverするrelationship-only ruleも存在しない。後続phaseが公開するedgeは、
formatが区切る宣言 — frontmatterの値、JSON/TOMLのfield、mapのkey — に由来する。境界を決めるのは
formatであって、この製品ではない。

各frontmatter entryの`keyKind`はclosed union `string | number | boolean | null`であり、
宣言keyのYAML 1.2 core schema下でのparse済みの型である。宣言のidentityは`(keyKind, key)`の
組である — unquoteの`1`とquoteされた`"1"`は、どちらも`key` textとして`1`をrenderする2つの
keyである — ため、file間で宣言をmatchするclientは`key`単独ではなくこの組でmatchする。
同じentry形は`keyKind`を含めて、nestした全`mapping` value内へ再帰する。

Readable fileでは`sourceText`を完全なdecoded sourceとし、書かれたとおりに保持する。standaloneのMCP declaration carrier — MCP kindがrecognizeし、skill kindがclaimしないfile — は`FileDetail`を一切持たない: 宣言を公開するためにadmitされたfileはその宣言を示し、自身のbyteは決して示さない（FR-007）。authored sourceをserveすることが目的のfunctionは、それを差し控えねばならないvariantを運ばない。この差し控えは、同じpathが運ぶ他のあらゆるrecognitionに優先する: Codexの`project_doc_fallback_filenames` entryが`.mcp.json`を指名するとcarrierはinstructions candidateにもなるが、そのvariantのdetailは完全なbody text — まさにFR-007が差し控えるbyte — であるため、carrierはfallback recognitionの下で答えられるのではなく、差し控えられたままになる。そのようなcarrierのdetailは`get-mcp-carrier-detail`自身のresultであり、そのpathをこのfunctionへrequestすると、このfunctionがdetailを保持しない他のあらゆるpathと同じ`stale-resource` rejectionに解決される。MCP recognitionを持つのは明示的なcarrierだけである: 他のkindのfileが自身の内容にMCP風のconfigurationを綴っても — skillやagentのfrontmatter、settings fileのinline map — それはそのkindの通常のcontentであり、このfunctionが自身のkindの下でserveするpresentationに宣言済みkeyとして見えるだけで、どのMCP surfaceにも合流しない。

Permission policyも同じ条件で、2つのformのいずれもここでは差し控える。Policy blockを宣言するcarrierは、そのblockを公開するためにadmitされたfileであるため、その周囲のbyteは決してserveしない。またfile全体の内容がpolicyであるfileは、このfunctionが自身として述べることを何も持たないfileではなくpolicyである: permissions rowが名指すのはpolicyだからである（data-model.md § 一覧の単位）。どちらのpathもここへrequestすると`stale-resource` rejectionに解決し、policyをserveするのは`get-permission-policy-detail`である。

Skillの`presentation`は、宣言している内容と指示している内容である。detail surfaceがそれを先頭に
置くからである。`frontmatter[]`はfileが宣言するすべてのkeyを、fileが書いたkeyそのもの —
vendor catalogのものではない — で、authored順に列挙する。`bodyText`は同じdocumentから
frontmatter blockを取り除いたものであり、両者は重ならない。この分割はfrontmatter parser自身の
ものとする: blockの終端を決め直すことは、formatについての2つ目の意見になる。各entryの`value`は、parserが解決した内容をfileが書いた形のまま写す: `scalar`は解決済みの
text — quoteとescapeは解決され、`007`は`7`として読まれ、2回宣言されたkeyは後の宣言として
読まれる — を持ち、`absent`はauthored null、`sequence`はitemを、`mapping`は自身のentryを
再帰的に持つ。fileが含まない綴りへ平坦化することはない。自身を含む値はその形もJSON形式も
持たないため、要約せずそのextractionをall-or-nothingで失敗させる（FR-028）。
宣言済み名を宣言一覧の傍らに公開することはない。それは宣言の1つであり、pageの出自である
rowが解決済みidentityを既に示していて、1つの事実を2か所へ置けば食い違い得る2つのstateに
なるからである。いずれの値もmask、redact、短縮しない。
JSON transport escapeはclient上で同じstringへround-tripしなければならない。
Environment-variable referenceは書かれたままの文字とし、hostは参照されたprocess-environment
valueをread、resolve、substituteしない。Inspectionが使うenvironment valueは、Global rootを
consent flowで導出するための明示的に文書化されたtool-home variableだけとする。
Registry定義の`targetOrigin: documented-default` relationshipは`authoredTarget: null`とし、SPAは
検証済み`normalizedTarget`をdocumented defaultとlabelして、synthetic pathがsourceに出現したと
示さない。

Inventory、Detail、Comparison、Global control、Diagnostics、全API result、
CLI output、documentationを通じて、productが行うのは構文だけのparsing、認識したkindが公開する宣言についてparserが解決した値の読み取り、
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

定義の`parseStatus`はclosed enum `not-attempted | parsed | failed`とする
（§ get-session `skills[]`）。
Parse/extractionは`(file, kind)`ごとにall-or-nothingであり、detailの`presentation`は
`failed`なextractionで正確にnullになる。failed result由来のmetadata、relationship、
derivationは返さず、file-scopedな`recognition-parse-failed` Diagnostic — kindを認識する
toolがいくつあっても1 record — がgenerationを`partial`にし、完全なreadable sourceの表示と
comparison eligibilityは保たれる（FR-028）。1 fileに限定されないfailureは
attemptをfailさせ、RPC所有の場合はrequestのordinary errorとして公開する。
Declaration comparisonは、sideごとに1つのcanonical serialized documentをclient側でdiffする
（research.md § 7）。frontmatter宣言はfileのMarkdown kindに対する1回のparseであって認識する
全toolが共有するため、toolは宣言の座標ではなく、tool recognitionはdiffの横でtoolごとに比較する。
各sideはYAMLへserializeし、skill comparisonは`name`と`description`を先頭にそれ以外のkeyを
sort順で、instruction comparisonとprompt-and-command comparisonは全keyをsort順で並べる。Prompt-and-command
comparisonはrecognitionごとにもう1つ事実を述べる。このkindの行はfileではなく名前であるためで、認識する
各toolのcellが、そのtoolがそのsideのfileを起動する名前を運ぶ。MCP kindの宣言は各recognizing tool
自身のreading（data-model.md § Field reading）であり、その比較surfaceは宣言済みserver名自身の
もの — 1つの名前のdeclarationをその行の2つのcarrierそれぞれから取り、sideごとに1つの
canonical JSON documentへserializeする — で、通常の`get-mcp-carrier-detail` result 2件を通じて
loadされる。いずれのdetailも自身のdeclaration contentを同じserialized documentとして、
fileが書いたkey順のまま表示する（FR-007）。

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

Detail request tokenは正確な`(clientDataEpoch, sourceRelativePath)`をcaptureする。Captureした
epochがlive epochと一致し、pathがselected fileのままである場合だけSPAはresultをadoptし、
request token replacementはそのcaptureをinvalidateする。Pathはfileの安定したidentityなので、
hostはそれをcurrentなgenerationに対して解決し、purge前にcaptureされたresponseがstateを
再populateしないことを守るのはepochである。Mismatch時はmodel、DOM text、metadata
row、comparison inputを作らずresultをdisposeする。

Documentation status、lifecycle qualifier、evidence assessmentはどのresponseも運ばない。これらは
registry自身のmaintenance recordである（QR-005）。candidate provenanceが公開するのはどのruleが
fileをadmitしたかであり、そのruleの文書化の程度ではない。

Outcomes: `FileDetail` result。現在のcommitted generationがそのpathにこのfunctionのdetailを
保持しない場合 — 一度もscanされていない、後のcommitで除去された、disabled sourceに属する、
`get-mcp-carrier-detail`だけがdetailをserveする純粋なMCP carrierである、または
`get-permission-policy-detail`だけがdetailをserveする宣言されたpermission policyである。別の型の値も
同じ形で解決されるため、独立したmalformed-argument outcomeは存在しない — は`stale-resource`
rejection。Disable fenceがnon-nullの間は`global-disable-pending` conflict rejection。

### `agent-customization-inspector:get-mcp-carrier-detail`

Parameters: commit済みSource-relative Pathを1つ、functionの単一positional argumentとして
渡す。`get-file-detail`が取るのと同じ形で、宣言するfileのidentityである（FR-030）。

```json
".codex/config.toml"
```

Active-generationのMCP carrier detailを1件返す: fileが行う宣言と、file自身の
事実であり、`sourceText` fieldは意図的に一切存在しない。答えるのは明示的なcarrierだけである: 宣言を
公開するためにadmitされた
fileはその宣言を示し、自身のbyteは決して示さない（FR-007）。carrierのdetailが`FileDetail`の
variantではなくこのfunction自身のresultであるのはそのためである — fieldはshapeから不在なの
であって、surfaceが描画を拒むべき値ではない。他のkindのfileは、内容にどんなMCP風の
configurationを綴っていてもここでは決して解決されない: そのconfigurationはそのfile自身の
宣言contentであり、file自身のkindの下の`get-file-detail` presentationに見える。

```text
McpCarrierDetail
├── file — carrierのcontent-free summary。encodingで判別される:
│   ├── sourceId, sourceRelativePath, encoding, diagnosticIds[]
│   ├── readable textはさらにhadLeadingBomとsizeBytesを持つ — sourceTextは決して持たない
│   └── binaryはさらにsizeBytesを持ち、unknownはこれ以上何も持たない
├── servers[] — 宣言。parserが解決した順にserverごとに1つで、carrierが何も宣言しなければ
│   空 — またはextractionがall-or-nothingでfailedになった場合に限りnull（FR-028）。その
│   Diagnosticは下にある:
│   └── name, fields[] { key, keyKind, value } — 宣言されたserver名と、宣言が書く全field。
│       carrierが書いたkeyのままで、`presentation.frontmatter`と同じentry shapeを使う
└── diagnostics[]
```

このtreeがresponseのshapeである: clientは正確にこれらのfieldだけに依存できる。宣言は
carrier自身のものであり — 各recognizing productのdocumented readingを1つのdecoded text上で
実行し、宣言名で1つのresponseへ統合する（data-model.md § Field reading） —
すべての値はcarrierのliteralである: environment referenceは書かれた文字のままで、process
値がそれに代入されることはない（FR-026）。`get-file-detail`と同じinert-rendering、
single-request、request-token ruleが適用され、`(clientDataEpoch, sourceRelativePath)`の
captureも同じである。

Outcomes: `McpCarrierDetail` result — parseされたが serverを宣言しないcarrierは空の
`servers`を持つresultであってrejectionではない。現在のcommitted generationがそのpathにMCP
recognitionを保持しない場合 — 一度もscanされていない、または後のcommitで除去された。
別の型の値も同じ形で解決されるため、
独立したmalformed-argument outcomeは存在しない — は`stale-resource` rejection。Disable
fenceがnon-nullの間は`global-disable-pending` conflict rejection。

### `agent-customization-inspector:get-permission-policy-detail`

Parameters: `get-file-detail`とまったく同じく、commit済みSource相対Pathを1つ、functionの
唯一のpositional argumentとして取る — policyを宣言するfileのpathであり、これがpermissions row
の同一性である（FR-030）。

```json
".codex/rules/deploy.rules"
```

Active-generationのpermission policyを1件、宣言するproductが綴る形で返す。Permissions rowが
名指すのはfileではなくpolicyであるため、そのdetailはこのfunction自身のresultである: ある
vendorはpolicyをそれ自体1つのdocumentとして書き、別のvendorは、残りのkeyが別のrecognitionの
内容であるsettings fileの中で宣言する。file形のresult 1つでは、対象ではないfileについて
答えねばならなくなる。

```text
PermissionPolicyDetail — form: 'whole-document' | 'declared-block'
├── form 'whole-document' — 宣言するfile全体の内容がpolicyである:
│   ├── file — encodingで判別する1つのCustomizationFile。`get-file-detail`が
│   │   公開するものとまったく同じで、readable textはsourceTextを持つ
│   └── diagnostics[]
└── form 'declared-block' — policyはcarrierの1 blockであり、その他のkeyは別の
    recognitionに属する:
    ├── file — encodingで判別するcarrierのcontent-free summary。
    │   `get-mcp-carrier-detail`が公開するものとまったく同じで、sourceTextは持たない
    ├── declaredPolicy[] { key, keyKind, value } — 宣言されたblock自身のentryを
    │   parserの解決順で。`presentation.frontmatter`が使うのと同じentry shapeで
    │   あり、extractionがall-or-nothingで失敗したときにちょうどnull（FR-028）。
    │   そのDiagnosticは下にある
    └── diagnostics[]
```

この木がresponseの形そのものである: clientは正確にこのfieldだけに依存できる。

`whole-document`のpolicyは、authorが書いた1つのdocumentとしてserveし、そこから何も読み出さない:
Codexの`.rules` fileのvendor contractはStarlarkから`runtime-reference` relationshipだけを認め、
commentと未収載の式をsource textのままに残す（contracts/vendors/openai-codex.md § Normative
initial-release presentation allowlist）うえ、edgeを生成するshipped recognitionも存在しない。
何も読み出さない以上、読み出しに失敗することもないため、このformはextraction diagnosticを
生じない。

`declared-block`のpolicyは同じ原則を反対側から見たものである。このfileは1つのblockを公開する
ためにadmitされたcarrierなので、そのblockを公開し、自身のbytesは決して公開しない。MCP carrier
とまったく同じである（FR-007） — Claude settings fileのその他のkeyは`settings/config`
recognitionの内容であり、permissions responseには届かない。Blockは丸ごと公開する。authoredな
objectが持つ全entryをparserの解決順で公開するのであり、一部のkeyだけをallowlistすると、どの
authored policyを落としたか言えないまま落とすことになるからである（FR-028）。Rule文字列は
authorが書いたtextのまま運ぶ: tool名と任意のspecifierであって、file・command・domainへ解決する
ことはなく（contracts/vendors/claude-code.md § Normative initial-release presentation
allowlist）、何かに対して評価することもない（FR-019）。inert rendering、single request、
request tokenの規則は`get-file-detail`と同じで、`(clientDataEpoch, sourceRelativePath)`の
captureも含む。

Outcome: `PermissionPolicyDetail` result。現在のcommit済みgenerationがそのpathにpermissions
recognitionを保持しないときは`stale-resource` rejection — 走査されたことがない、後続のcommitで
削除された、あるいはgeneration間で宣言blockが取り下げられたcarrierである。別の型の値も同じ経路
で解決するため、malformed-argumentの独立したoutcomeは存在しない。Disable fenceがnon-nullである
間は`global-disable-pending` conflict rejection。

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
PublicationはRepository fileを含む全detail/comparison viewをinvalidateする — file identityは
Source-relative Pathであり安定なので、保持されたlinkは新しいgenerationに対して解決される。
Global sequence、そのgeneration、Global-onlyのviewには触れないため、clientはRepository dataだけを
再取得する。明示rescanが
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

### `agent-customization-inspector:open-file`

Parameters（順に）:

```json
[".claude/skills/deploy/SKILL.md", "visual-studio-code"]
```

開くfileのSource-relative Pathと、閉じたtarget集合
`visual-studio-code | sublime-text | terminal-editor | default-application | containing-folder`の1メンバー。

名指されたfileを、hostが動いているmachine上の名指されたapplicationで開く。絶対pathはhostの
ものであるためhostがlaunchを行う: clientがSourceのrootとして受け取るのは一方向の
`displayRoot` escapingだけであり（data-model.md § SourceBoundary）、pageは他のrequestと同じ
identityを送るだけで、自らpathを保持しない。Pathは何かをlaunchする前にcurrentのcommit済み
generationへ解決されるため、launchが受け取り得る絶対pathはこのsessionが公開したものだけである
（FR-022）。

各targetが届く先:

- `visual-studio-code`と`sublime-text`は、hostがportをbindする前にこのmachineで解決した
  editor launcherを実行する — `PATH`上のeditor command、またはcommandが`PATH`に無いときは
  既知のinstall場所にあるlauncher。
- `terminal-editor`は、`$EDITOR`または`$VISUAL`が指すeditorを実行するterminal windowを開く。
  どちらもterminal editorを指していないとき — 未設定であるか、指されたeditorが自前のwindowを
  持つとき — はPOSIXが既定とする`vi`を実行する。macOSのinstallはそれらの変数を設定しないためである。
  これはhostがそのwindowを開ける場所 — macOSで、OSの`osascript` automation hostを通じて — にだけ現れ、
  そこでeditorのcommandが解決できるときにだけ現れる。Terminalはcommand行を実行することでprogramを載せるため、
  これはargumentがshellへ到達する唯一のlaunchである: pathは固定scriptへargumentとして渡し、
  command行への挿入はautomation host自身のPOSIX shell用quotingが行うため、shellのmetacharacterを
  含むauthoredな名前も1つのliteralなargumentのままである。macOSは最初のrequestを一度きりの同意dialogで
  gateし、readerがそれに応じないこともあるため、そのhostへの待ちには上限がある。
- `default-application`は、そのkindのfileに対してこのmachineが登録しているhandlerへfileを渡す。
- `containing-folder`は、fileのdirectoryを同じ登録済みhandlerへ渡す。これが各platformで
  folderを自身のfile managerで開く方法である。その中で何かが選択されることはない: readerが
  求めたのはfolderだからである。

`get-session` snapshotの`fileOpenTargets`は、このmachineでこのfunctionが受理する集合そのもので
あり、surfaceが提示する順に並ぶ。Hostが解決しなかったeditorはそこに存在しない — したがって
surfaceは、hostがlaunchできないapplicationを提示しない。Resultはpayloadを持たない: launchを
要求したことだけを報告し、machineがそのfileをどう扱ったかについては何も述べない。それはその
machineの領分である。

Outcome: payloadがnullのcommand result。あるいは、currentのcommit済みgenerationがそのpathに
fileを保持しないときの`stale-resource` rejection — scanされたことがない場合と、pageが描画された
snapshotを置き換えたcommitで削除された場合は区別できず、同じように応答する。閉じた集合の外の
targetは、このproductが出荷していないclientであり、宣言されたfunctional outcomeではなく通常の
errorとして伝播する。

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
Sourceのstable Source ID/semantic contentを維持し、
old Globalのdetail/comparison/editor stateをinvalidateし、該当する決定的tool failureをclear
する。Repository sequence、そのgeneration、Repositoryのviewには触れない。

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
Global sequence内で使う。すなわちsuccessful commitはそのsequenceのexactなN+1であり、Globalのviewだけを
invalidateし、Repository sequence、そのgeneration、Repositoryのviewには
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
2. SuccessfulなRepository/Global rescan後は、detail requestのpathをcommitしたsequenceの新しい
   generationに対して解決する — そのgenerationがpathに保持するfileを提供するか、保持しない場合は
   `stale-resource` rejectionを返す — 一方、他方のsequenceのdetail/comparison viewはvalidのまま
   である。`remove-active-state` Global disableは全Global pathを失敗させつつ、Repositoryの全file
   を維持する。`cleanup-only`はcommitted stateを変えず、両sequenceのgenerationを維持する。
   Fatalな明示rescanは
   failed-attempt partialを0件publishし、last committed snapshotを保持し、
   staleにmarkして、exact 1つのfailure representation、すなわち決定的なreturned failureでは
   actionable Diagnosticへの参照、throw/rejectionではfailed requestのerror messageを運ぶ。
   Stale-failure fixtureはそのretained messageがstale snapshotとともに返ることをassertする。
   Bootstrap generation 0はcapture済み
   `process.cwd()`/`--root`から選択したexact 1つのnon-authorizing Repository Sourceを持つ。
   Multi-Source sequenceではA/Bのentry-failure pairが共存し、B successがAをclearせず、Aの
   partial successだけがAのpairをclearし、Aの再failureがAのpairだけを置換し、Global disableが
   除去Global Sourceのpairだけをclearすることを証明する。Diagnostic DTO fixtureは正確に2つの
   scope shape、すなわちmatching `sourceId`/`sourceRelativePath`を持つfileと、`sourceId`
   だけを持つsourceだけをacceptする。Pathlessなshapeは存在しない。この製品が生成するdiagnosticは
   すべて何かを読んでいる最中に生じたものであり、それを読んだSourceは解決可能にする最小の文脈だから
   である。Source/file/pathの欠落、余分、mismatch、捏造の全組合せをserialization前に拒否する。Failure fixtureは、accept前
   throw/rejectionがそのinvocationだけをrejectして何もretainしないこと、accepted scan-job
   failureがその`scanRequestId`とともにfailed requestのerror messageとしてexact 1つの
   lifecycle ownerにretainされること、accepted disable-barrier failureがfailed
   `globalDisableInProgress` projectionの`message`だけにretainされることを証明する。Failed requestはsessionをusableに保つ。すなわち同じ
   channelが直後にretained prior snapshotをserveする。Request-owned rejectionはprocessをexit
   せず実際のerrorでrejectする。自動startup read rejectionはprocess top levelへ到達し、productは
   process livenessを保証しない。
3. Readable file detailはcompleteなauthored sourceと、fileが書いた各keyについてparserが解決した
   値を、credentialとenvironment-reference textを含めてmask/reveal controlなしで返す。値はkeyごとに
   1件であり、2回宣言されたkeyは後の宣言へ解決される。File summaryはparse rollupを一切公開せず、各inventory定義が自身の
   `not-attempted | parsed | failed` stateとそのkindのextraction失敗reference — 認識tool数に
   よらず1 record — を公開する。Parseが何をしたかを読み手が知るのはそこである。
   Compatible provenanceは内部のrecognition record内で1回mergeし、inconsistent meaningは
   そのextractionをall-or-nothingでfailさせる。Comparison keyは
   `(kind, 宣言key)`とし、tool recognitionはtoolごとに宣言の横で比較する。Astral character、combining sequence、通常BMP textにより、
   declared valueがextractionとJSON transportを丸ごと通過することを証明する。返却する全relationship tuple
   `(tool, kind, relationship kind)`は、維持管理するpresentation allowlistに含まれ、かつexactな
   authored occurrenceがrecognitionのactualなadmission済みsource form用extractorでsupportされ
   なければならない。Tuple membershipによってsource form間でeligibilityをtransferしない。
   Authored keyとその公開の間にallowlistは立たない。Skillの宣言はfileが書いたkeyであり、authored key
   の集合は閉じていないからである。Allowlistが記載していないreferenceは完全な`sourceText`からだけ
   利用可能とし、推論したrelationshipを作らない。Evidence
   fixtureは`documented | partially-documented | unknown | conflict`だけをacceptし、unique
   fixed-orderの`preview | experimental | deprecated` qualifierを別に維持し、empty qualifier
   arrayをlifecycle claimなしとして扱う。これらはregistry recordであり、どのresponseも
   serializeしない。Encoding fixtureは、admit済みcandidateのNULがbinary/diagnostic-only/`partial`であり、companionのNULは
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
   Inventory、Detail、Comparison、Global control、Diagnostics、API
   DTO、CLI output、documentationが文書化済みstructural projectionだけを公開することを証明
   する。Natural-language meaning/intentのinterpret/rank、
   correctness/validity/compliance/effectiveness/quality verdict、policy/remediation advice、
   validation、lint、synchronization、conversion、formatting、fixingのfieldまたはbehaviorを
   一切admitしない。
4. 宣言済みparameterはresolutionで検証される: invokeされたfunctionがそのresourceを保持しない
   `get-file-detail`、`get-mcp-carrier-detail`、`get-permission-policy-detail`のargument —
   別の型の値や、他のfunctionのresourceも含む — は`stale-resource` rejectionであり、余分なpositional argumentは
   readされず何も変えず、unknown function nameは登録されずinvokeできない。Contract testは
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
   `/global-consent`、各kindのcomparison route（`/skills/compare`、`/instructions/compare`、
   `/mcp/compare`、`/prompts-and-commands/compare`）、各kindのdetail route
   （`/skills/<tool>/<Source相対パス>`、`/instructions/<Source相対パス>`、`/mcp/<Source相対パス>`、
   `/rules/<Source相対パス>`、`/prompts-and-commands/<Source相対パス>`、
   `/permissions/<Source相対パス>`）のclient routeがすべて同じpackaged SPA shellをbootし、
   そのshellはsession dataをembedしない。
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
   capture済みepochとpathが一致する場合だけ
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
   ordinaryなrequest rejectionがrequest-localに留まること、channel loss、異なる`sessionId`でのport再利用、older/equal/greater epoch、
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
   generation 1として作成する）、old Globalのdetail/comparison/editor stateだけを無効化する。
   Repositoryのviewは変更されずに残存する。Source publish成功は
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
