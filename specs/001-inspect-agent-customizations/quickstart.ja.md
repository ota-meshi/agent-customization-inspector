# Quickstartと検証guide

[English](quickstart.md)

このguideは、このfeatureで説明した実装のend-to-end acceptance pathである。対応する実装taskがnamed
script/fixtureを追加するとcommandが実行可能になる。Current scaffoldが既にそれらを持つとは主張しない。

## 前提条件

- 正確な`package.json` compatibility contract `^24.11.0 || ^26.0.0`
  （`>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`）を満たすNode.js。Development/build基準は
  Node.js 24.18.0
- Repositoryの`packageManager` declarationを満たすpnpm
- 追加compilerやplatform固有build workspaceは不要。Inspected-source accessはpackaged Node.js moduleで実装する
- Project setup commandでPlaywright 1.61.1がinstallする正確なChromium、Firefox、WebKit revision。これらのpin済み
  revisionは再現可能な自動browser-certification基準であり、userが実行できるbrowserの網羅的な一覧ではない
- `localhost`へ到達できるbrowser。Release evidenceでは、OS default handlerが別browserを選ぶ場合も含め、上記certified
  revisionの1つを使う

Toolchain確認:

```bash
node --version
pnpm --version
```

期待結果: 両commandがchecked-in package declarationを満たす。Performance evidenceにはchecked-in SC-002 profile IDと
fixture digest、および実際に使用したprofile valueを記載し、個人識別子と絶対user pathだけを省略する。
[research.ja.md](research.ja.md)に記録したNuxt/Vue互換性が変わるまでtoolchainのmajor versionを変更しない。

## Installと準備

Dependency revalidationをplanning gateとする。承認済みpackageまたはversionが1つでも変わった場合、packageまたは
configuration fileを編集する前に停止し、dependency baselineを含む`research`、`plan`、`quickstart`、`tasks`の
全英日pairを同期して、
`/speckit.plan`と`/speckit.tasks`を再実行する。2つ目のlocal dependency baselineで作業を継続しない。
Package/configuration作業前に、initial baselineについて記録済みのno-migration-impact判断、すなわち以前の公開済み
Inspector package、public contract、永続profile、user dataがないことを確認する。この前提が誤りなら停止して
replanningする。Acceptするdependency追加・変更または破壊的なpublic-contract変更はすべて、理由、影響を受ける
consumer/contract/data/workflow、移行・compatibility/support手順、rollback/support path、または理由付きの明示的な
no-impact判断を英日両方へ記録する。
Researchの`**Migration impact**`/`**移行影響**` sectionとplanの対応する
`**Dependency and breaking-change migration gate**`/`**Dependencyおよび破壊的変更の移行gate**` sectionを
T001の正確なdesign-evidence記録先とし、欠落、stale、
不一致のいずれかがある間はT002を開始しない。Release validationはpublication前に対応する英日evidenceを記録する。

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium firefox webkit
pnpm run build
```

期待結果:

- Committed lockfileを変更せずinstallする。
- Buildは最初にroot-resolvedなpackage所有の`.output/`、`dist/` treeだけを除去する
  （`scripts/clean-build-output.mjs`）。次に`nuxt build`が`nitro.output.publicDir`により
  root-absolute same-origin static assetを`dist/public`へ直接出力する。Post-build validatorも
  生成asset manifestも存在しない。出力treeはそれを生成するpipeline toolが所有し、devframe hostが
  runtimeでそのまま配信する。
- tsdownはfixed ESM extensionのnamed `cli.mjs` entry、inspection moduleを含むbundleされた
  server module、任意のcode-split chunkを`dist/`へ直接出力する。Staging copy stepも
  server側manifestも存在しない。
- Packaged `dist/cli.mjs`は、`src/server/cli.ts` entryからtsdownが保持したBOMなし、LF終端の正確な先頭行
  `#!/usr/bin/env node`で始まり、package managerがinstall時にlinkされたbinをexecutableにする。
  Node.js互換性はpacked `engines.node` rangeだけで宣言し、package managerのengines機構で
  enforceする。CLIは宣言済みstringも実行中versionも再検査せず、packed exact stringはpackage testで
  assertする。
- `package.json.bin`は正確に`{ "agent-customization-inspector": "dist/cli.mjs" }`、`main`、`module`、`exports`は不在。
- Pack前に`pnpm run verify:package`（全local buildの一部ではなくCI/release gate）で、正確に2つの
  packaged entry point、すなわちdevframe hostが配信するSPA shellの`dist/public/index.html`と
  `package.json.bin` targetの`dist/cli.mjs`がregular fileとして
  存在することをassertする。それ以外は再検証しない。残りの`dist` contentはNuxt/tsdownのbuild outputであり、
  同じpipelineが直前に生成したsibling artifactの再列挙はredundantなpolicyである。Missingまたはnon-regularな
  entryはpublish前にgateをfailさせる。Locked済みproduction dependencyはpackage testが`pnpm-lock.yaml`から
  直接assertする。これらのcheckはcustomization-file contentをvalidateしない。
- Project-authored application codeと全project/dependency tarball payload内のexecutable codeは、2つの限定的な記録済み例外を除きすべてJavaScriptとする。
  Package manager生成の`.bin` symlinkと
  `.cmd`/`.ps1` launch shimはpayload外に存在し、それぞれexactな宣言済み`package.json.bin` targetを
  audit済みNode JavaScriptへ対応させ、argvだけをforwardして追加input/application logicを持たせない。
  `open` packageのvendoredなPOSIX shell `xdg-open`はpayload内の唯一の例外である
  （spec.md FR-038）: Linux hostでは、package自身の選択policyがvendored copyを実行可能である限り使い、
  そうでないときにsystemの`xdg-open`へfallbackする。生成HTML shell、CSS、JSON file、必須documentation/license fileはdeclarativeかつnon-executableなartifactとする。Directなproduction dependencyは正確に9件、`devframe`、`gunshi`、`h3`、
  `jsonc-parser`、`open`、`smol-toml`、`vfile`、`vfile-matter`、`yaml`とする。devframeと`open`のtransitive treeはそれぞれのpackageとlockfileが所有する。
- Build outputにfixture、raw customization text、Global content、cache、inspected machineを公開する
  source-map pathが含まれない。

## Local Inspectorをmanual実行

Fresh checkoutからは、1つのscriptでbuildとlaunchを行う。

```bash
pnpm run build-and-start
```

`dist/`が最新の場合は、buildせずにlaunchする`start`を使う。

```bash
pnpm start
```

どちらもpackaged `dist/cli.mjs`——installした利用者が得るのと同じ`package.json.bin` entry——を
実行するため、manual launchはdevelopment専用経路ではなく出荷される経路を確認する。`start`が
buildしないのは意図的で、裏でrebuildするとどの`dist/`が動いているか分からなくなり、それは
launch確認が最も確実にしたい一点だからである。Optionは`--` separatorなしで渡す。pnpmはその
separatorをcommandへそのまま転送し、strictなrest-argument rejectionが拒否するためである。

```bash
pnpm start --no-open --root /path/to/repository
```

Portを決め打ちせず、printされたURLを読む。devframeはdefault portが既にbindされていれば別の
local portを選ぶため、実行したままの古いinspectorが接続を奪う可能性がある。

Root selectionを確認するには、implementation repositoryではなくfixture directoryがprocess `cwd`に
なるようconformance fixtureから起動する。

```bash
cd tests/fixtures/repositories/all-supported
node ../../../../dist/cli.mjs --no-open
```

別directoryから明示rootを指定する同等のlaunchは次のとおり。

```bash
cd /path/to/agent-customization-inspector
node dist/cli.mjs --no-open --root tests/fixtures/repositories/all-supported
```

CLIは呼び出し時の`process.cwd()`を1回だけcaptureする。省略時はそのexact stringを使う。`--root`は
受理し（反復指定はparserのlast valueへ解決）、absolute optionはそのまま保持し、relative optionはcaptureした呼び出しdirectoryに対してresolveする。
明示的なempty valueはsessionまたはbrowser attemptより前に固定actionableかつsource-value-freeなoutputを出して終了し、
valueの欠落は同じboundaryでGunshiのtyped argument validationによりrejectされる。
Selectionは`process.chdir()`を呼ばず、startup failureはsessionやsession-API errorではなくactionableなmessageとともに
launchを終了させる。

期待結果:

- Hostがbrowser attempt前にlocalな`http://localhost:<port>/` originを正確に1回表示し、non-loopback addressへ
  bindしない。表示URLはplainなoriginであり、per-session token、fragment、その他のsecretを含まない。
  CLIのnegatableなproduct flagである`--no-open`ではbrowserを開かず、browser-helper child processも作らない。
- Browser表示のRepository source rootは`all-supported` fixture自身。
- 1秒以内に現在のscan requestについて、queued、active phase名、complete、partial、またはfailedを明示するstatusを画面に
  表示しassistive technologyにも公開する。Failureは実行可能な次の手順も示し、Source/progressはそのrequestのopaqueな
  `scanRequestId`を識別する。一般的なspinner/loading label、変化しない
  control、scan stateを示さないacknowledgement、以前のscanのstatusは数えない。
- 最初のcomplete inventoryが表示され、凍結path contract外のfileを含まない。
- Process停止でserver sessionを破棄する。読み込み済みpageでは、devframeが問い合わせなしにtransport経由でloopback
  hostの喪失を報告する。Transportが報告するchannel loss、またはcurrentかつnon-supersededなsession RPCの
  clientが解釈できないprotocolは、session-ended view前にDTO、DOM source value、editor model/worker、
  comparison stateをあらゆるstate ownerとrender済みsurfaceからpurgeし、settlement authorityを失効させて、
  pending中のrequestが捕捉したresponseをno-opとしてsettleさせる（data-model.md § BrowserState）。SPAはliveness RPCを発行せず、visibility、unload、その他の
  page-lifecycle listenerを設置せず、pageがhiddenになっただけではpurgeせず、visibilityへ戻ってもrefetchしない。
  Polling interval、request timeout、retry timer、memory lease、continuously idleなpageに対するwall-clockの
  process-loss保証を定義しない。Portを再利用して再起動しても`sessionId`が変わり、purge前にcaptureしたresponseも
  session identityが一致しないresponseも、以前の表示stateを復元しない。
- Sessionはloopback bindの背後でunauthenticatedである。Productはper-session token、Origin/Host
  check、hand-written routerを追加せず、browser storage/cookieへ何も保存しない。Inspector実行中は
  他のlocal processと、DNS rebinding経由のmalicious web pageがsessionへ到達し得ることを、
  documentedなresidual
  limitationとする。

通常利用の同等launch contract:

```bash
cd /path/to/intended/repository-root
npx agent-customization-inspector
```

Port/host resolutionと表示originは、sessionをhostするdevframe local-tool
frameworkが所有する。devframeはbuild済みSPAを`dist/public`から配信し、session APIをそのRPC channelとして
公開する。Automatic browser openingはproductが`open` packageを通じて所有する: launch lineの後にhostが
表示origin付きで`open`の固定OS helperをspawnし、devframeのbundled openerは無効化されてspawnできる
helperは正確に1つになる。このfixed startup openingがinitial releaseで
許可する唯一のproduct起動child processであり、inspection由来のcontent、path、authored value、
user-supplied commandを受け取らず、launch environmentを変更なしで継承する — productはそこへ
inspection由来の値を書き込まず、user自身の`$BROWSER`を尊重するplatform helperはuser preferenceを
適用している。CLIのnegatableな`--open` flag
（default true）が`--no-open`のsuppressionを提供する。Openerがmissingまたはfailedでもserverは
継続し、既に表示したlocal originがFR-001のfallbackである。
任意の単一`--root`を除き、初期リリースにはrepository picker/ancestor-root discovery、remote-host flag、
static-export command、MCP commandはない。

Failureはordinaryに報告する。Startupの問題はactionableなmessageとともにlaunchを終了させ、failした
session-API requestはdevframe channel越しにreal errorを返す。その間sessionは利用可能なままで、最後の
committed snapshotは表示され続ける。別建てのoperational-event log、closedなerror-code taxonomy、
genericなerror envelopeは存在しない。Terminal/UI outputを読むのは、調査対象fileを所有するのと同じuserである。

Automatic openingは表示originをOS default browserへ委譲するだけで、helperはbrowser versionを選択も検証もしない。
Openの成功はcompatibility evidenceではない。Deterministicなcertificationでは`--no-open`を使い、表示URLを3つのpin済みPlaywright revisionの1つへ
貼り付ける。Enrollment済みのparticipant-study sessionごとに、実際のOS default handlerまたはそのunavailabilityと、解決可能な
場合は実際のbrowser family/revisionを記録する。Default handler自体がcertifiedである必要はなく、fallbackはenrollmentの前提では
ない。Automatic openingがdisabled、unsupported、または失敗した場合、handler/browserがunavailableまたはunidentifiableな場合、
もしくは解決したbrowserがcertification baseline外の場合は、同じenrollment済みsession内で表示URLをpin済みcertified browserに
入力し、そのfallbackを記録する。そのsessionのoutcomeは固定denominatorに残し、participantを置き換えない。Automatic-open
conditionは別に記録し、participantがprohibited hintなしでoriginal 2-minute interval内にfallbackを完了した場合、そのcondition
自体をSC-001の不成功としない。Timerをpause/restartせず、completionをpreventするfailureまたはinterruptionは不成功とする。

## 自動品質gate

実装変更をcompleteとみなす前に全gateを実行する。

```bash
pnpm run build
pnpm run verify:package
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run test:contract
pnpm run test:integration
pnpm run test:package
pnpm run test:performance
pnpm run test:coverage
pnpm run test:e2e
```

期待結果:

- Buildが完了する。Code formattingはPrettierが所有する（`pnpm run format`が書き換え、
  `format:check`がgateする）。line endingは`.gitattributes`がnormalizeし、editor慣習は
  `.editorconfig`が宣言する。
- Lint/type checkがignored failureなしで完了する。
- Unit testがpath classification、order、parser failure isolation、記述された値の完全表示、環境変数参照の非解決、
  diagnostic、state transition、deterministic projectionを扱う。
- Contract testが全session-API status ruleと全stable behavior、inspection-rule、composition-strategy、
  official-source IDを扱い、positive、1-rule near-miss、derived、relationship-only、excluded、
  multi-provenance、multi-tool、Global caseを含む。返却する全relationship kindがsupportedな
  `(tool, kind)`の維持管理するclosed presentation allowlistに含まれ、そのadmissionのsource-form extractorが認識する
  exact occurrenceであること、tuple membershipだけで1つのsource formのkindを別formへeligibleにしないことも証明する。
  Skillの宣言はこのgateを通らない。fileが書いたkeyだからである。Allowlistが記載していないreferenceは完全な
  source textからだけ利用可能とする。これらのtestまたはimplementationを開始する
  前に、3つすべてのvendor-contract language pairのPresentation Allowlist sectionがsupportedな全`(tool, kind)`とadmit済み
  source formを列挙済みでなければならない。このgateは承認済みrowとbilingual digestを検証するだけで、rowを作成したり
  semanticに編集したりしてはならない。Membership/source-form/extractor/relationshipに変更が必要なら作業を停止し、
  design artifactを同期してplan/task generationを再実行する。
- Integration/security testは記録済みlocal fixture rootを使い、productの全network/URL/MCP surfaceをinstrumentする。発行済みのexactな
  `localhost` authorityにおける2つのexactなFR-022 authorized internal loopback class、すなわちpackaged UI assetへのstatic/SPA
  `GET`/`HEAD`とlocal session API channel（どちらもloopback-onlyなdevframe bindの背後でunauthenticated）を別々に分類・検証する。Source containmentとcustomization由来のexecution、child process、MCP
  connection、FR-022で定義した禁止対象のdirect product-issued outbound request、dynamic evaluation、source mutationが0であることを証明する。Explicit
  UNC/server-share/device vectorではfilesystem/DNS/SMB call 0件を証明する。Lexicalに識別不能なpre-mounted/mapped network sourceはOS-mediated
  trafficを発生させ得るためFR-022のplatform/environment limitationとして別に記録する。`open` packageを通じた
  product所有のstartup
  browser openingへ渡すのは表示済みoriginだけであり、inspection由来のcontent/path、authored value、
  user-supplied commandを渡さず、productがinspection由来の値を書き込まないlaunch environmentを継承する。
  実行すべきhost-securityやHTTP-router contract suiteは存在しない。Per-session token、Origin check、hand-written routerは
  削除済みで、protectionはloopback限定の`localhost` bindだけであり、unexpectedなsession-API failureはreal errorをrequesting clientへ
  そのままpropagateし、sessionは利用可能なままとする。
- Phase 3 checkpointのpackage testは、無関係なworking directoryから`dist/cli.mjs`をlaunchし、
  packaged shell、closed manifest field、printed-URL fallback、調査対象fixtureが変更されないこと、
  graceful shutdownを検証する。これはpackaged pathだけのisolationであり、現行gateはtarballをinstallせず、
  installed package linkもinvokeしない。T917が、isolated fixtureへpack/installし、working treeまたは
  runtime downloadへ依存せず`npx --no-install`でlaunchするfinal-release testを所有する。
  Production-graph testは承認済みのdirect dependency 9 件、すなわち
  `devframe`、`gunshi`、`h3`、`jsonc-parser`、`open`、`smol-toml`、`vfile`、`vfile-matter`、`yaml`を正確にassertし（resolved versionとintegrity hashは
  commit済み`pnpm-lock.yaml`が所有し続ける）、negative packaging fixtureは、
  missingまたはnon-regularなrequired entry pointがpublish前に`verify:package`をfailさせることを証明する。
- Performance suiteはpackaged CLI（先にbuildする）に対してT183のSC-002 smoke passを実行する。
  Harness integrityはgateされる — check-in済みfixture manifest、そのcanonical SHA-256、
  reference profileが相互にbindし、構築した100,000-entry/500-file fixtureがrun前後で
  manifestのdigestと一致しなければならない — 一方、記録されるstatus/inventory/interaction
  timingはprofile IDとmanifest digestとともにgatingなしでpublishされる。正確な10-run
  9-of-10 release protocolはT918が所有する。
- Browser、contract、manual evidenceが4 user storyすべてを扱い、
  [SC-008の55行matrix](contracts/accessibility-acceptance.ja.md)のApplicableな全行とNot-applicable再確認を満たす。
  Axeのseverity結果だけではpassにならない。

## Contract registry検証

```bash
pnpm exec vitest run --project contract tests/contract/vendor-behaviors
pnpm exec vitest run --project contract tests/contract/inspection-rules
```

上記testはofflineである。Maintainerはupstream drift review時だけ`pnpm run check:official-sources`を明示実行し、
source checkでnetworkを使えるのはこのcommandだけとする。

確認項目:

1. 全shipped `behaviorId`、`ruleId`、`strategyId`が厳密に1つの所有bilingual contractと対応する
   immutable registryに存在する。全cross-referenceが解決し、recordの`evidence`配列にある全citationが
   引用先のofficial-sources contract rowと相互一致し、offline testがsemantic fingerprintを再計算する。明示drift checkは
   official HTTPS hostとexact section selection/normalizationを強制する。Recoverableなnetworkまたは実行環境failureは
   behavior/rule/strategy/check-in済みdigestを自動更新せずfail closedし、製品固有の数値fetch capはcontractに含めない。
2. Vendor lookup base、relative selector、traversal modeをInspector matcherから独立して検証する。全Repository
   selectorはtyped segment array program — literal、regex、非隣接recursive-directory segmentで、globのように
   見えるstring形式を持たない — として直接authorし、registry contract gateがunknown/misplaced tokenと
   隣接recursive tokenを拒否する。Fixtureはdescendant-plus-direct-childとdescendant-plus-recursive-subtreeの
   compositeを扱う。Build validationは
   authored programをimmutableかつversionedな`TraversalPlan` dataへcompileし、runtime testはinspection moduleがselector
   textを再parseしたりgeneric walkerへ置換したりせず、そのdataだけをinterpretすることを証明する。Global exact-file planは
   tool-home rootをopenせずfixed ancestor/target chainだけにtouchし、fixed-instruction-subtree planはそのnamed subtreeと
   permitted descendantだけをopenする。隣接する全Global setting、credential、state、plugin、その他neighbor pathへの
   `opendir`、`lstat`、`realpath`、open、read callは0件とする。ClosedなCodex Global planは最初に
   `AGENTS.override.md`をprobeし、readしたnon-empty override後は`AGENTS.md`へoperationを0件とし、absentまたは
   emptyと確定した場合だけ次へ進み、non-empty fileを最大1件だけpublishする。
   Emptyはpost-BOMの`decodedText.trim().length === 0`と正確に定義し、
   `utf-8-replaced`はordinary textで、全`U+FFFD`をnon-whitespaceとして扱う。Absent、empty、BOM-only、
   whitespace-only、non-empty、replacement-decoded、binary、symlinked、unreadable fixtureを両ordered targetへ独立に適用する。
   Absentなtargetはfallbackを選択し、presentなsymlinked overrideは他のfileと同じくtarget越しにtransparentにreadする。
   Unreadableなoverride（broken symbolic linkを含む）またはbinaryなoverrideは、fallbackせず
   per-file diagnostic（`file-unreadable`または`file-content-binary`）とともにselectionを終了する。
   これらのfixtureでcontent rule、short-circuit、および非選択targetへのoperation 0件を固定する。
3. Static ruleはtyped literal/regex/recursive-directory programとtraversal boundaryだけを許可し、runtimeで
   text globを評価しない。Staticとderivedの両ruleが
   受理したfileは両provenanceを保持する1つのinventory fileのままとする。各provenanceは自身のmatched pathを持つ。
   Provenanceが述べるのはどのruleが読み取りを認可しどこで一致したかであり、カスタマイズがどこに適用されるか、
   どの順序か、どの条件下かはどのsurfaceも行わないprojectionなので、どのDTOも運ばない。
4. Surface fixtureはGitHub Copilot VS Code、CLI、cloud lookup behaviorを分離する。VS Codeのworkspace-root
   instructionがexactである一方、CLIのstandard-location/target-path traversalはInspector globではなくvendor
   behaviorとして表現されることを証明する。Root-only/nested near missが差を示す。MCPではさらに、`.vscode/mcp.json`
   と並ぶexactなVS Code 1.118以降root `.mcp.json` provenance、CLI ruleもroot fileへmatchするときの1 inventory fileと
   1 Copilot/MCP recognition、release note/current guideへのreciprocal evidence、`documentationStatus: conflict`、
   VS Code所有root-schema field 0件、root、`.vscode`、User、agent、plugin input間のunknown same-name orderingを
   要求する。Nested `.mcp.json`はCLI-onlyのままとし、VS Code schemaまたはwinnerを推測しない。
5. Repository、文書化済みUser、consent済みGlobalの表を独立して検証する。FR-015からFR-018が明示しない限り、
   文書化済みUser locationはGlobal read authorityにならず、runtime compositionはInspectorのRepository/Global
   source graphをmergeしない。
6. 出荷済みの`bounded-derived-candidate` ruleは正確に4件であり、それぞれ自身のvendorの構成読み取り段階が
   展開する。runtime extension pointは存在しない。
   `copilot.derived.local-plugin-manifest`、`claude.derived.local-plugin-manifest`、
   `codex.derived.local-plugin-manifest`、`codex.derived.fallback-basename`とする。
   Skillのsibling `agents/openai.yaml`はこれに含まれない: それはderivationではなく、所有元skillの
   bounded companion censusを通じて公開される（contracts/vendors/openai-codex.ja.md § Derived
   Repository rule）。
   各ruleはexact seed pathまたはseed rule/kind、closed declaration syntax、fixed base/placement/suffixを持つtyped
   edge 1本で、callback、arbitrary join、expression、glob、recursive derivationを表現不能にする。Programはtarget、
   declaration、name、ancestryの数値上限を定義せず、利用可能なcapacityはNode.jsと実行環境から継承する。Bounded-derived
   provenance、generic relationship、sibling Codex subtree、remote source、任意config/component pathを別readのseedにしない。
   同じfileの独立static provenanceは自身のtyped ruleをseedにできる。全derived admissionは自身のderived ruleを名指し、2つのreaderの
   declarationは同じtargetへresolveしてもcollapseしない: そのpathは両方のadmissionを保持する。Codex fixtureは
   plain-stringとobject `source.path`の両local marketplace formを扱う。Seed-state fixtureはknown-satisfied
   output、unresolved conditional output、known unsatisfied/shadowedまたはbounded-derived seedからの出力なし、
   製品定義の保持件数なしのstable deduplicationを証明する。Pure path fixtureは全OSで
   ADS colon、Windows-special character/device name、trailing dot/space、
   8.3 aliasを検証し、それぞれをreference diagnosticとともにlexicalにrejectして決してreadしない。
7. 直接参照するbehavior、rule、strategyはそれぞれ自身のmaintenance recordを
   持つ。`documentationStatus`は`documented`、`partially-documented`、`unknown`、`conflict`だけを受理し、
   重複のない`lifecycleQualifiers`は固定順`preview`、`experimental`、`deprecated`を使う。Empty qualifierは
   lifecycle claimを行わず、`stable`を意味しない。Fixtureはこのenum内の`documentation-conflict`、重複または
   順序違反のqualifier、subjectの欠落/重複をrejectする。どのresponseもこれらをserializeしない。
   Fixtureが扱うべきapplicability/condition projectionは存在しない: 製品がfileをどう扱うかはhostが観測しない
   runtimeである（FR-009）。
8. Fixtureは既知order/override rule、documented conflict、settings disablement、Claude
   skills-directory plugin matrixを検証する。Matrixはlaunch-`cwd`対ancestor placement、workspace trust、
   implicit root skill、明示`skills: ["./"]`、`skills/`、別declared skills pathを含む。
9. Copilot agent fixtureはprofile body/name/description/metadata、`target`の`vscode`/`github-copilot`/省略時
   both、tool/invocation field、outer-model inheritance、IDE handoff/legacy agent/body link/hook、VS Code
   conditional instruction edge、unknownなCloud/CLI instruction composition/skill preload、Cloud対CLI MCP
   source order、独立受理済みRepository declaration、excluded source layerを扱う。
10. Claude agent fixtureはsettings選択main agentとexcluded CLI override、通常fresh対forked conversation
   context、継承instruction/rule context、custom-agentのparent MCP inheritance/tool filter、inline対named
   server、strict/bare/managed restriction、built-inのpositive/negative context fact、full-preload eligibility、
   任意Skill-tool discovery、3つの固定memory scope targetを扱う。
11. Codex agent fixtureは`nickname_candidates`、model/reasoning、sandbox、MCP、skill config欠落時のparent
   inheritance対explicit child value、live sandbox/approval再適用、local対hosted surface、unknownなAGENTS.md
   inheritanceを扱う。その他Codex fixtureは
   default `hooks/hooks.json`対manifest overrideでdocumented-default/null-authored-targetとexact authored occurrenceを
   区別する。Upstream設定のinstruction-budget behaviorはvendor applicability factのままとし、Inspector validation capとして
   再定義しない。
12. Symlinked-skill fixtureは、
   InspectorがClaude Codeとまったく同じようにskill symlinkをfollowしてlinked target contentをinspectionし、
   製品・インスペクター間のdivergence factが存在しないことを証明する。Fixtureが扱うべきsource-level
   condition projectionは存在しない: vendorが自身のconditionについて文書化していることはそのvendorの
   維持管理contractに残り、recognition・provenance・detailへprojectするものは無い（FR-009）。

## User story検証

### 1. Repository customizationの発見

確認項目:

1. OptionなしではRepository Sourceがcapture済みchild-process `process.cwd()`のexact valueと等しい。Relative/absolute
   `--root`では選択したrootと等しく、process working directoryは変化せず、picker/ancestor searchもない。
2. Source、tool、kind、Source-relative Path filterをkeyboard/pointerで操作できる。全inventory-file pathまたは安全に
   normalize済みのtarget pathはowning Sourceの1 rootからの相対値であり、Sourceをまたぐpath namespaceを意味しない。
   Escape済みのenabled-Source root labelとconsent-preview root labelはpresentation-onlyのままで、Source-relative Pathではなく、
   read authorityを与えない。
3. 1 physical `AGENTS.md`、`CLAUDE.md`、skill、`.mcp.json`、marketplaceをcontent重複のない1 fileとして保ち、
   `(file, tool, kind)`ごとに正確に1つの内部recognitionを持つ。Compatible admissionはそのrecordのprovenanceとしてmergeし、
   record自体はどのsession responseも運ばない。
   各inventory定義が公開するのは`not-attempted | parsed | failed`だけである。Fileはparse rollupを持たない。
   定義自身のstateがparseの事実であり、file-levelのaggregateには読み手がいなかったからである。
4. Near-miss pathがなく、empty repositoryに成功したsupport scope説明を表示する。
5. 最初のsnapshotはRepositoryのbootstrap generation 0を持ち、stable IDのidleなRepository Sourceを正確に1つ、
   escaped selected-root labelを持ち、調査対象Source I/O、file、Diagnosticは0件で、`globalGeneration`はnullとする。
   自動scan成功時はRepository generation 1をcommitする。Selected rootがmissingまたはunreadableな場合、そのscanは
   source-scopedな`root-unreadable` diagnosticとともにfailし、sessionとそのcontrolは利用可能なままとする。
   FailしたattemptはpartialなinventoryをpublishせずRepository generation 0を維持する。
6. 自動または明示的な各scanはopaqueな`scanRequestId`を1つ持つ。明示的Repository rescanのadmission response、
   waiting/active/complete/partial/failedを通じたSource/progress、commitしたgenerationはそのIDを保持し、以前のstatusや
   inventoryではnew commandを満たせない。

### 2. Activationなしのinspection

```bash
pnpm exec playwright test tests/e2e/boot.spec.ts
pnpm exec vitest run --project unit \
  tests/unit/app/api-client.test.ts \
  tests/unit/app/session-view-state.test.ts \
  tests/unit/app/client-data.test.ts
```

確認項目:

1. Hook command、script、plugin component、URI、markup、MCP declarationをinert text/dataとして表示し、
   execute/connect/load/navigateしない。
2. Detailまたはcomparisonのsurfaceは、fileを記述されたとおりそのまま表示する。何が含まれ得るかについての
   注意書きも、その前に立つ確認stepも持たない。読み手とcontentの間には何も立たない — acknowledgementもgateも常設の注意書きも無い。
   どちらも閲覧者自身のfileに対するloopback束縛のsessionが既に守っていないものは何も守らない。
   Skill自身のtab間の移動はnavigationであってgateではない。
   maintained fixtureの全literal credentialをsource/comparison viewへ記述されたまま表示し、表示metadata値は
   そのfieldについてparserが解決した値とする。mask/reveal controlは設けない。2回宣言されたkeyは後の宣言へ
   解決されるため値はfieldごとに1件であり、structural metadata comparisonは`(tool, kind, 宣言key)`で対応付ける。Boundary-sizeのTOML integer、float、date/time valueはJavaScript precision lossなく
   typed canonical semantic payloadを保ち、authored spellingも変更しない。Acknowledgement API、field、
   client stateはいずれも存在せず、必要でもない。Session APIはloopback-boundなlocal hostを通じてだけ
   到達でき、その境界がすべてだからである。Authored contentへは1つのfileまたは1つのcomparisonに対する明示的なrequestでのみ
   到達でき、中央full-session client-data purgeが破棄する。scope限定のroute、selection、file/Source、Global、
   generation cleanupは自分のmodelだけをdisposeする。
3. Sentinel process valueを設定しても環境変数参照をリテラルtextのまま保ち、参照先process environment値を
   表示contentへ混入させない。
4. Session Diagnosticは文書化済みのclosed fieldだけを含む。Failしたsession-API requestはgenericなerror envelopeや
   closedなoperational-event schemaを介さず、real error messageをbrowserへ返す。そのmessageをuserへ表示し、
   sessionは利用可能なままとする。
5. Malformed、binary、unreadable、broken symlink、発見からread前までに消失、cycle、traversal、boundary-crossingの
   fixtureはactionable safeなper-file Diagnostic（`recognition-parse-failed`、`file-content-binary`、
   `file-unreadable`、およびreference diagnostic）を作り、非影響fileはすべて完全なtraversal後の
   `partial` commitを通じて発見・閲覧可能なままとする。Symlinkされたcustomization fileは代わりにtransparentに
   readされ、そのlinked contentをinspectionする。Targetがmissingまたはunreadableなlinkだけが
   `file-unreadable`を生じる。単一fileに限定されないfailureはresult/generationを
   publishせず、prior snapshotがあれば維持し、real messageを持つordinary errorとしてfailureを報告する。
   Startup failureはactionableなmessageとともにlaunchを終了させる。File sizeとcollection件数からvalid/invalid、
   correctness、compliance、lintのverdictを一切作らない。
6. NUL byteが1つでもあればtextを持たない`binary` itemとする。admit済みcandidateではdiagnostic-only
   （`file-content-binary`）とし、他の条件でpublish可能なattemptは`partial` generationにする。census掲載
   companionのbinary bytesはassetの通常の事実である。NUL byteがなければUTF-8 replacement semanticsで正確に1回decodeし、先頭BOM 1つを記録して
   除去し、replacement resultを`utf-8-replaced`とlabelし、全`U+FFFD`をparser、source、comparisonまで保持する。その
   garbled readable textはそれ自体でcompleteであり、alternate decoderは実行せず、それ自体でscanをpartialにしない。
   Parser/extractor failureは対象recognitionのresult全体だけを`recognition-parse-failed` diagnosticとともに破棄し、
   完全なauthored sourceとcomparison eligibilityを保持する。全declared valueはそのparserが解決した値とする。
   Astral character、combining sequenceは、extractionとJSON transportを丸ごと通過する。
   Documentを指すものが存在しないため、entryもresponseもsource座標を持たない。
   Parseできなかったdocumentは、そのrecognitionをall-or-nothingでfailureにする。
   Authored relationshipはexact target token
   sliceを使い、`normalizedTarget`とderivationには別のdecoded valueだけを使ってnormalized valueをauthored表示へ
   置換しない。Conditional Codex default `hooks/hooks.json` relationは`targetOrigin: documented-default`かつnull
   `authoredTarget`とし、explicit hook fieldは`authored`としてdefaultを置換する。
7. Documentation completenessはregistry上のmaintenance recordのままとし、`documented`、
   `partially-documented`、`unknown`、`conflict`だけを使う。Upstream lifecycleは別のordered qualifier
   array `preview`、`experimental`、`deprecated`を使う。Empty qualifier arrayは`stable`でなくlifecycle
   claimなしを意味する。どのresponseもどのsurfaceもこれらを運ばないため、conditionality、disablement、
   omission、shadowing、unknown inputが発明した“effective”結果になることはない。
8. Inventory、Detail、Comparison、Global control、Diagnostic、API response、CLI text、
   documentationは、syntactic parsing、認識したkindが公開する宣言についてparserが解決した値の読み取り、
   frozen-catalog classification、documented structural scope/order/condition/selection/reference projectionの範囲に
   留まる。Natural-languageの意味やintentをinterpret/rankせず、correctness、validity、compliance、effectiveness、
   qualityを判定せず、policy/remediation advice、validation、lint、synchronization、conversion、formatting、fixingを
   提供しない。

### 3. 2 fileの比較

確認項目:

1. Repository comparison flowでは、2つ以上のreadableなentry fileを持つskill名がそのrowとdetail画面に比較エントリを
   1つ提供する。比較画面のswitcherは対応するファイルとcopyの間でペアを切り替え、少なくとも片方の現在のcopyが
   readableに持つ全ファイルを選択肢として提供する。片方のcopyだけが持つファイルは存在する側を明示された不在に
   対して表示する。readableなsource textなしに存在する対応物 — binaryを含む — は不在ではなく、そのペアを選ぶと
   ファイル名を挙げたnot-readableの結果を報告する。どちらのcopyでもreadableでないファイルは決して提供しない。
   Cross-Source comparisonは次のworkflowでGlobal enable後にだけ検証する。
2. Read-only Monaco source modelがmasking/環境置換なしで記述された完全なtextを保持し、link/editingを無効にし、
   filesystem pathではなくopaqueなin-memory URIを使う。
3. Monacoがsemantic ranking、merge、lint、validation、format、convert、fix suggestionなしでliteral
   source差を表示する。Recognition metadataは区別可能なまま、JSONへserializeせずVueでtyped fieldを
   比較する。
4. Monacoとbrowserのcapacityはbrowser engineと実行環境から継承する。Recoverableなeditor computation failureは
   記述された完全なread-only side-by-side sourceを削除せず、actionable diagnosticを示す。
5. Rescan、removal、Global disable、route closeがstale selectionと表示済みdetail stateをclearし、関連する
   全editor/model instanceをdisposeする。
6. Keyboard/screen-reader userがlabel付きcontrolとaccessible diff viewerを使い、focus trapなしでsource
   diffへ入り、navigateし、抜けられる。
7. Packed appがeditor workerをsame-origin static assetからloadし、external requestも`blob:` workerも
   発生させない。
8. `/`、`/skills/compare`、`/global-consent`、`/skills/<tool>/<Source相対パス>`のdirect loadが、devframe hostが配信する同じ
   root-absolute assetからbootする。
9. Session-loss/response-guard testは、devframe transportが報告するchannel loss、currentかつnon-supersededなRPCの
   現在の非supersededなRPCでのchannel lossまたは解釈できないprotocol、session-ID mismatch、greater Global content epochまたはnon-null disable fence、
   client epoch変更後のlate in-flight responseを扱う。CurrentなRPCでのtransport報告channel lossまたは解釈できないprotocolはshared full
   client-data purgeを実行してsession-ended viewへ入り — ordinaryなrequest rejectionはそのrequestの
   errorに留まり — あらゆるstate ownerとrender済みsurfaceがpre-purge inventory/detail/comparison/editor/authored-content
   DTO/DOM stateを落とし、何も自動復活せず、late settlementはrepopulationではなく
   no-opになることを証明する（data-model.md § BrowserState）。SPAはliveness functionを呼ばず、
   visibility、unload、その他のpage-lifecycle listenerを設置せず、経過時間、pageのhidden化、visibilityへの復帰を
   理由にrequestを発行しない。Event-drivenなhost-loss signalはdevframeが所有し、productはcontinuously idleなpageに
   wall-clockのprocess-loss deadlineを設定しない。Ordinaryなinspection-data responseのrender前にgreater epochまたは
   non-null disable projectionをfull client-data purge triggerとして扱いcontrol-only recoveryへ入る。Older epochはrejectし、
   equal epochかつnull projectionだけがcurrent baselineをconfirmできる。Deterministic delivery pauseはlinearize済み
   SessionSnapshot/FileDetailを保持したまま、scan commitがowning sequenceのgenerationを進めるかGlobal-disable acceptanceが
   epochを変更する間を扱い、envelopeと
   payloadが混在せず、全inspection-data successが最終publish時にepoch不変かつfence nullを再checkすることを証明する。SPAのmonotonic
   `clientDataEpoch`、sequence別generation（`repositoryGeneration`とnullableな`globalGeneration`）、latest request tokenを検証し、
   old-generationまたはsuperseded token/epochの
   responseがstateを再作成できないことを証明する。いずれかのsequenceのnewer generationをadoptする場合は先にclient epochを進め、
   そのsequenceのold requestと
   generation-owned stateをabort/disposeし、他方のsequenceのcommit済みviewは有効なままとする。File detailはcapture済み
   `(clientDataEpoch, sourceRelativePath)`がlive epochとselected fileに一致する場合だけadoptする。
   Pathはfileの安定したidentityであり、hostはそれをcurrentなgenerationに対して解決する。
10. Global disableはdistinctなrecovery pathを維持する。SPAはdisable request送信前にcentral full client-data purgeを
    実行し、任意のresponseでgreater epochまたはnon-null fenceを観測した場合はrender前に再びpurgeする。その後
    recoveryはloopback session API経由でfresh sessionを取得する。Purge済みIDを保持・比較せず返された`sessionId`を採用し、client-side
    `RecoveryViewState`だけを構築する。Disable fenceがnon-nullならsession routeはexactでcontrol-onlyな
    `GlobalFenceRecoverySnapshot`を返す。Fenceがnullならnormal full `InspectionSession`を返すが、recoveryは`globalContentEpoch`、Global controlと
    enable/disable projection、失敗した各toolの自身のcontrol上の`failureCode`、retain済みfailure error、任意のnewly verified
    frozen previewだけを採用し、inspection graphを破棄する。Inventory、Source、file、generation、detail、comparison、editor、authored source、selection、
    filterは復元しない。状態に応じてdisable/join/wait、retry-disable、またはeligibleなGlobal retryを利用できる。
    明示Resume inspection actionは`globalDisableInProgress`がnullの場合だけ表示し、matching sessionを再取得してdefault
    filterのfresh inventory summaryをatomicに構築する。後のdetail/comparison requestはfresh sessionから改めて取得する。

### 4. Global inspectionへのopt-in

Test harnessはisolated fake tool homeを渡し、developerのreal homeを絶対にinspectしない。確認項目:

1. Consent前にGlobal pathへ一切touchせず、previewを`stat`、`realpath`、enumeration、file readなしでlexicalに
   派生する。Instrumented captureは`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`をこの順で正確に1回ずつcaptureし、
   `undefined`だけをabsentとし、いずれかがabsentの場合だけ`node:os.homedir()`を正確に1回callし、active-platform
   `node:path.join`が対応する固定suffixだけを適用することを証明する。`HOME`/`USERPROFILE`の直接選択もexistence checkも行わない。
2. Consent viewが正確なCopilot/Claude/Codex lexical root、input state、除外、
   contract version `2026-07-20`を表示し、read scopeはpatternごとのpath表示ではなく平易な言葉で説明する。Frozen internal previewは各exact raw `lexicalRoot` stringを別に保持する。
   `displayRoot`はone-way escaped stringで、decodeしてread authorityにしない。
   Preview constructionのthrow/rejectionは、`scanRequestId`もauthorityも与えずreal errorを返す。
3. Opt-in後は文書化instruction candidateだけが0から3つの別識別tool-specific Global Sourceに表示される。
   Copilot、Claude、Codexごとに最大1つで、各Sourceは正確に1つのrootを持つ。Initial/retry transactionでadmitされた
   全Sourceは、観測可能なper-tool commitなしに1つのatomicなGlobal generationへ一緒に現れる — enable commitは
   Repositoryのviewとstateに触れずにGlobal sequenceをgeneration 1で作成する。ReadableなRepository file 1つとGlobal file
   1つを比較し、rootを統合せずsemanticな判定を行わず、それぞれが独立して識別されたowning SourceとSource-relative Pathの
   下に残ることを検証する。
4. Present-empty、relative、invalidのenv overrideは固定preview state/messageを使い、retained Diagnosticを
   作らずdefaultへ黙ってfallbackしない。設定がabsentの場合だけdefaultを使う。Consent済みrootがmissingまたは
   readableなdirectoryでない場合は、他のtoolのcommitを妨げずそのtoolをabsentまたはfailedとして記録する。
   Eligibleなabsolute rootは通常のhome外でもeligibleであり、その場所だけを理由にrejectしたりconsent前I/O authorityを
   与えたりしない。All-invalid preview、またはconsent後に3 rootすべてがabsentと判明するeligible previewも
   all-tools confirmationを1回受けてよく、deterministicallyに
   `active-no-job`になる。
5. 注入したunexpectedなadmission failureはtransaction全体をabortさせる。Initial enableはそのfailureの
   real errorを返し、consent/control/jobをactivateしない。Retryでは既存stateを維持する。
   Rootまたはescaped displayの数値上限は定義しない。
6. Stale/changed/cross-session replayed preview IDを拒否する。Enableはserverが保持する唯一のpreview recordを
   opaque `previewId`で指名する。そのrecordは各entryについて、stored raw `lexicalRoot`と
   escaped `displayRoot`を別々のfieldとして保持し、closed selection policyとcanonical program
   を特定するrecordレベルの`allowlistVersion`/`traversalPlanVersion` pairも保持する。Display fieldをraw fieldの代用にしない。Enableはfrozen raw
   valueとstored planだけを使い、environmentを再読込せず、`displayRoot`をreverse-convertしない。Recordが別fieldを保持し、admissionが
   stored raw valueを使うことをescape-collision、control-character、backslash fixtureで証明する。
   Previewで2 entryがeligible、1 entryがinvalidの場合もrequest側tool selectorは持たない。Initial enableは固定の
   `confirmedTools: [copilot, claude, codex]`を導出して3つすべてをevaluateする。Responseのdisjointな
   `acceptedTools`/`rejectedTools`のunionは3つすべてと一致する。`tools` keyなどselector-shaped inputはrejectする。
   Retryはnon-pending unpublished `admitted` controlと`same-preview` rejected controlからなるcomplete fixed-order
   `retryableTools` projectionをderiveし、published、pending、lexicalな`new-preview-required` controlを除外する。Clientは
   targetを追加、subset化、reorderできない。同じexact active consentはprojectionがnonemptyの場合だけ再利用でき、既存Sourceは
   semantic contentを変更せず、別preview/rootには先にdisableを要求する。Initial/retryで成功したadmitted-subset batch commitは
   正確に1つのGlobal generationをcommitし、旧Globalの
   detail/comparison/selection/editor stateだけをinvalidateする。Repositoryのgenerationとviewには触れず、
   逆にRepository rescanもcommit済みGlobal detail/comparison viewを有効なまま残す。
   Coordinatorはcorrectness-sensitiveなadmissionとscan workをserializeし、製品定義のslotまたはqueue-capacity上限を持たない。
   Unexpectedなadmission failureはstate mutation前にpropagateする。All-rejected、partial、accepted-batch error、cancellation、
   repeated-retry fixtureでterminal `GlobalEnableOperation` recordをunregisterすることを証明する。最後のlock済み
   disposition pointでoperationが先の順序なら、disable受理後にdeliveryしてもaccepted admissionをcommit済みとし、
   barrierが先の順序なら固定conflictを返し、
   late side effect/operation-history leakなしとし、
   次のenableを許可する。Validation中、admission後かつmutation前、単一batch enqueue/disposition直前でpauseして両順序を扱う。
7. Disableは全inspection dataに対するpriority security barrierである。Request送信前にSPAはFR-027のfull client-data
   purgeを実行する。Non-no-op barrierのfirst acceptanceは`globalContentEpoch`をatomicにincrementし、non-null
   `globalDisableInProgress`をinstallし、publication authorityをrevokeする。Session routeは
   `GlobalFenceRecoverySnapshot`だけを返し、その他すべてのinspection-data routeは固定の`global-disable-pending` conflictを返す。
   その後active uncommitted workをdiscardし、queued Global workをcancelする。PublicなGlobal consent、control、Source stateのいずれかが存在する場合、`remove-active-state`は
   Global generation sequence全体とそのSourceを破棄して何もcommitせず、中断したRepository commandを1回requeueする。
   Requeueされたcommandは後で最大1つのRepository generationを自らcommitし得る。Global file、exact-content DTO、generation diagnostic、`GlobalToolControl`所有lifecycle failure、
   comparison、removed Global Sourceのstale-failure entry/failure-reference pair、consent、全control、全retained root context、
   frozen previewを削除する。Repository sequence、そのgeneration、そのID、そのcontent、Repository stale-failure pairには触れない。
   未公開のoperation-local initial enableだけが`cleanup-only`を選べ、そのsuccessはcommitted stateを何も変えずにfenceを
   removeする。
   Validation/admissionをpauseするfixtureでdisableを受理し、command/content両epochをincrementしてenable operationをdrain/unregisterした後に
   late completionを解放する。そのcompletionは最後のcancellation sweep後にcontrol mutation、diagnostic、context、ID、scan
   jobを一切作らない。Accept後のcleanup、assembly failureではprocessをaliveに保ち、fenceを閉じ、
   failしたrequestのerrorをretainし、contentを復元せずretry/joinを利用可能にして、fallbackの次の手順として
   process restartを提示する。Accept前failureまたはtrue no-opではfenceをnullのままにし、既にpurge済みのclientがfreshな
   full snapshotを直ちに取得できるようにする。
8. 明示Global rescanはenabled時だけ受理し、Repository rescanと同じFIFO/dequeue時generation ruleに従い、commitで
   Global sequenceだけを進めて自sequenceのviewだけをinvalidateし、commit済みRepository viewは有効なままとする。
   そのadmission response、Source/progress、successful generationは同じopaqueな
   `scanRequestId`を保持する。Unknown/removed Sourceは固定の`stale-resource` rejection、disable pending/activeは
   固定の`global-disable-pending` conflict、duplicateは固定の`scan-in-progress` conflictを返す。Failしたattemptは
   uncommitted partial resultを0件publishし、exact consent/boundaryとtool別prior graphを保ち、そのSourceだけの
   stale-failure entryを作成または置換し、`root-unreadable`などのsource-scoped diagnostic、またはunexpected failureでは
   failしたrequestのerror messageをreferenceしてfailed/null progressを報告し、明示rescan/disableを
   可能にする。別Sourceの正常commitは両方をclearせず、affected Sourceのcomplete/partial正常rescanだけが両方をclearする。
9. Unexpectedにfailしたaccepted initial/retry batchはprovisional Source/file/generationをpublishせず、
   `StaleSourceFailure`を追加せず、prior snapshotを維持し、batchの`scanRequestId`をkeyとして、failしたrequestの
   errorをconsent全体で正確に1回retainして公開する。Root admissionでrejectされたtoolはexact-consent
   retry/disable用のclosed control stateを保持してよい。Mixed outcomeでretry validation/admission中に新たにvisibleと
   なるのはauthority-freeな`globalEnableInProgress`だけで、exact pre-operation `globalControl`、`pendingTools`、`retryableTools`、
   `batchStatus`、diagnostic projectionを変更しない。Atomic queued acceptanceだけが`pendingTools`/`batchStatus`をexact admitted
   accepted-batch subset/shared request IDへ設定する。Initial enableはatomic activationまでprojectionを持たず、その後はaccept済み
   batch toolだけを表示する。`unvalidated`はnon-serializedなoperation-local workだけに存在し、accepted-pending controlはすべて既に
   `admitted`で、activeなserialized controlを`unvalidated`にしない。
   Same-preview rejected/non-pending unpublished admitted controlをretryableとして表示してよいが、全pending work完了まではretryを
   disabledとして固定の`global-enable-in-progress` conflictを返す。その後はexact nonempty `retryableTools` projectionを使用して成功済みSourceを
   保持する。Lexicalな`new-preview-required` controlにはdisable/new previewを要求し、disableは直ちに利用できる。
10. Initial activationで3 toolすべてがlexicalまたはconsent後root validationでdeterministicallyにrejectされた場合、enableはempty
    `acceptedTools`、3つすべての`rejectedTools`、Source/job/generation/stale entryなしの`active-no-job`を返す。
    `globalControl`はsame-preview rejected controlだけをretryableとしてactiveのままとし、lexicalな`new-preview-required` controlを
    除外する。したがってall-lexically-invalid previewの`retryableTools`はemptyでdisable/new previewを必要とする。Preview routeは
    同じfrozen previewを返し、disableも利用できる。
    All-rejected retryはnew Source/jobを作らずgenerationをcommitせず、既存SourceとそのIDを正確に保持する。
    Partial acceptanceは`queued`を返してevaluateした全toolをpartitionし、subsetをatomicにpublishする。
    Failした初回scan後のretryでは、rejected controlの未公開IDを破棄し、
    後の完全な再admission前にそのcontrolへstaleなroot stateを残さない。
11. Barrierがdraining/committing中の2回目のdisableは同じoperationへjoinし、やはり何もcommitしない。Retained failure後のdisableは
   同じcleanup lineageと既にincrement済みcontent epochで再開する。Tool固有
   Global Source/graph、active consent record、
   running/queued Global scan/enable command、retained disable failureが一切
   ない場合だけ、無関係なRepository workがactiveでもtrue no-opとなる。Barrier中にactive consent/controlが存在する場合は
   `globalControl.state: disabling`かつpending/retry arrayをemptyとする。Operation-local initial enableだけならnullのままとする。
   どちらでもenableは固定の`global-disable-pending` conflictを返し、barrierがnon-terminalの間visible controlはGlobal retryを提示しない。

## 測定可能なoutcome protocol

### SC-001とSC-006のparticipant study

Product guidance、標準化したSC-001/SC-006 task prompt、対象fixture repository、SC-006の指定customization file、
3項目response form、事前定義したground truthを含む英日study kitを1つ用意する。通常の開発作業でGitと
command-line interfaceを使用するが、Inspectorの利用・開発経験がない人を正確に20人登録する。同じcohortを
1つのsessionでSC-001、SC-006の順に使用する。

Enrollment前にmaintainer teamは、accountable study owner、recruitment/compensation-funding owner、moderator/reviewer、
schedule/support contact、consent/privacyと匿名化retention procedure、提供repositoryとequipment/session support、accessibility
accommodationを示すbilingual planを公開する。Participantにpersonal repository、paid product、personal expenditureを要求しない。
通常のcontributorはparticipantをrecruit、fund、moderate、reviewしない。Resource不足はinitial-release claimをblockするが、
それ以外は適合するcontributionのreviewをblockしない。Primary workflow、提供guidance、fixture、scoring rubricのいずれかに
material changeがある場合だけstudyを再実施する。

Kit準備時に`tests/usability/sc001-sc006-study-inputs/`配下のexact closed member set、candidate-independentなversioned manifest、
companionをmaterializeしてcontract-testし、その段階ではcandidate digestをcompute/freezeしない。`manifestVersion`は1から始まるpositive
safe integer、`bundleRoot`は末尾`/`を含むそのexact literal、`inputs`はnonempty、7 roleはすべてnonzero coverageとする。Exact root-property
orderは`manifestVersion`、`bundleRoot`、`inputs`とし、既存のexact entry order/sort/serializerを使う。Verifierはcontract regular-file
member set/manifest path setとexactに一致するfileだけをrecursiveに発見し、link、alias、non-regularまたはidentity-unverifiable object、
path escape、missing/extra file、byte driftを認めない。別にbindするcandidateとstudy equipment/runtimeを除き、participant、moderator、scorerへ
渡すinput byteはrepository-owned builderが作成しindependent verifierがacceptしたbundle distributionだけとし、追加のlocal、remote、printed、ad hoc materialを使わない。

Pairのevaluation-fixture JSON memberはdeterministic virtual file-tree descriptorとして扱い、全derived output path、encoding、exact byte
representation、digestをclosedにする。`study:evidence:inputs -- materialize`をsole builderとし、independent verifierは20件すべての
distributionについてexact derived set/byteを再現しなければならない。
各distribution rootのdirect-child directoryはexact `study-inputs/`と`repository/`だけとする。前者はsource bundle 16 memberの
byte-identical copyだけを、後者はdescriptorのcomplete file treeを保持する。他のtop-level member、sidecar、collision、alias/reused
identity、escapeをrejectし、candidateとequipment/runtimeは別bindingのままroot外に置く。

Harness実行前にpublic builder、capture、verifier scriptがそれぞれself-contained single fileであり、sourceに含めてよいimportが
`node:` built-inのliteral static importだけであることを検証する。Local/package import/helper、dynamic `import()`、`require`、
`createRequire`、`eval`、`Function`、`vm`、`process.dlopen`、別loader hook、alternate worker/child entryを許可しない。Materializeが内部実行できるのは
descriptor-boundでdigest-verifiedなcapture fileのsupervisor modeだけとし、そのfileが自分自身をre-executeできるmodeは、
exact `supervisor`、`study-harness`、`scoring-moderator`、`reviewer-one`、`reviewer-two`、
3 named adapter、3 named watchdog modeだけを許可する。Product probeはdistinct import modeとし、各childはauthenticated inherited parent IPCとfresh one-use bootstrap nonceを使用する。

各parent/child edgeでunidirectional inherited anonymous pipe 2本（parent→child、child→parent）を作る。Childをverifyした後、fresh seed、nonce、
`channelId`を含むexact 96-byte bootstrap prefixをparent→child pipeへwriteし、その同じpipeをopenのままLF-framed parent→child messageへ継続する。
Bootstrap後にEOFを送らず、96 byte未満のEOFをrejectし、prefix後の全byteをcanonical frame dataとしてparseする。Child→parentの最初のmessageは
sequence 0のauthenticated one-use `ready`とする。Bootstrap materialにenvironment、argv、fileを使わず、domain/direction-separated HMAC keyをderiveする。LF終端canonical frameのexact root orderは
`schemaVersion`、`channelId`、`sequence`、`direction`、`senderRole`、`receiverRole`、`messageType`、`authenticationTag`、`payload`とする。
Tagをnullにして再構築したcompact canonical JSONはLFを含めず、populated transmitted frameだけLFをappendする。Constant timeでauthenticateする。各directionはsequence 0から1ずつ増やし、closed role/message matrixを
適用してreadyを1回だけconsumeする。Parse/tag/sequence/role/pipe/child/abort/crash/exit failure時は両pipeをcloseし、bootstrap/key/bufferをwipeし、
control commandを追加せずfailする。

Materialize前にrequired `INSPECTOR_STUDY_WORK_ROOT`をstudy setupが新規作成したabsolute、emptyなordinary-local directoryへ向ける。
`INSPECTOR_STUDY_CONTROL_ENDPOINT`はそのroot/全distribution外のtransient pathへ設定し、POSIXではabsolute Unix-domain-socket pathname、
Windowsではexact `\\.\pipe\agent-customization-inspector-study-`の後にlowercase hexadecimal 32文字を続ける。
`INSPECTOR_STUDY_CONTROL_TOKEN`はrunごとにfreshなexact 32 cryptographically random byte（256 bit）をunpadded base64url正確に43文字で
encodeした値へ設定する。TCP、UDP、DNS、他のnetwork transport、remote/network named-pipe spelling、work-root sidecarを使わない。
3変数はmaterializeからfinalizeまでの全commandでrequiredとする。Explicit platform UNC/server-share/device/network
spellingをI/O前にrejectし、Node.jsが区別できないpre-mounted/mapped filesystemはFR-022 limitationのままとする。

Materializeと`study:evidence:verify -- inputs`では`INSPECTOR_STUDY_CANDIDATE_TARBALL`を設定または参照せず、両commandはこれをignoreする。
Candidate fileは既に存在してよいが、environment valueを初めてrequiredとするのは`study:evidence:capture -- start`であり、以後finalizeまでの
各commandへ再送する。Work root/全distribution外のstable non-link regular fileを指定する。後続clientはcandidateを独立stat/hashし、
materializeが作成したsupervisorとのtoken-authenticated hello/challengeでsame lexical/canonical authorityをmemory内確認する。全runtime-control
authentication tagでexact canonical payloadを被覆する。Runtime-control pathのtransient/non-retained HMACはchannel integrityだけに許可し、
evidence commitment/hashはpath-freeのままとする。そのexact transient control-message HMACを除き、両path、control token、HMAC keyを
capture-evidence IPC、retained file、raw inputとしてのhash、log、diagnostic、outputへcopyしない。

Materialize時にauthorized setupはidentity-pinned `npx`をsanitized equipment PATHへ、work root/distribution外のreserved initially-empty candidate-launch store-bin slotを固定する。Materializer/inputsはslotをreadしない。Input verification成功後かつstart前にsetupだけがcandidate tarball+frozen production graphから同じknown slotへnetwork-disabled/scripts-disabled storeをprovisionしてdigest-bindする。Start時にsupervisorはinherited slotを再検証し、pinned `npx --no-install`でsole audited binだけをresolveする。Raw tarball pathをchild env/argvへ入れず、新しいenvironment/control fieldを作らない。Distribution mutation、cache/network/install、alternate PATH/global/fallback resolutionを禁止する。Storeはruntime/evidence外に置き、abort/stop/finalize後にdestroyしてabsence barrierを要求する。

Capture startからstopだけrequiredな`INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY`をruntime-onlyのexact `127.0.0.1:<port>`へ設定する。
Study setupはfresh browser contextのproxyだけをそのauthorityへ設定し、browser-wide/system proxyにしない。Exact routeをauthorized start-through-stop caller transient input→authenticated runtime-control `StudyLiveBinding`→supervisor dedicated memory→one-use `browser-proxy-binding`→adapter dedicated memory→attempt-local DevTools control request/browser contextにcloseし、ACK後にcaller/control/frame/request bufferをwipeする。`study-browser` adapterがexact listenerをbindする。
Participant candidateはsupervisor-owned grant correlationを使い、その他のbrowser trafficだけproxyがfresh safe opaque IDをassign/replaceする。別local clientはunrelatedとして扱い、required actor/process correlationなしにproductへattributeしない。
Materialize、input verification、finalizeはこの変数をread/requireせず、stop前checkpoint/continuationはrequiredとする。Proxy authority/browser proxy configurationを
retain/outputしない。

Materializeはdigest-verified capture fileをsole internal supervisor modeでexact 1回だけ開始する。Capture startは新しいsupervisorを作らずその既存live processを使い、long-lived study harness、scoring moderator、3 adapterをspawnし、
各adapterがwatchdogをspawnしてwatchdogをadapter childとするexact 8 internal long-lived descendant/processを構成する。Reviewed failureごとの2 ephemeral collectorはfailure後にmoderatorだけがspawnする。Supervisor/external endpointをcheckpoint、continuation、stop、
finalizeまでaliveに保つ。Initial work-root identity、start candidate identity/digest、checkpoint position、original handoff anchor、
supervisor-directの3 adapter/2 orchestrator exit、adapter-attestedの3 watchdog exit、moderator-attested ephemeral reviewer exit countだけをmemory内に保持する。Evidenceはpath-free HMAC work-root/candidate identity commitmentと1つの
`controlSessionId`だけを使う。

Authorized materialize callerはpairwise-distinctでbidirectional、nonrecording/no-echo/no-historyのexternal terminal-equipment handleを4件提供する。Fd6 participant、fd7 moderator、fd8 reviewer one、fd9 reviewer twoでinternal evidence IPCではない。Supervisor launch前にstable identity、distinctness、propertiesを検証する。Supervisorはfd6を保持しfd7〜9をmoderatorへ渡して自分のcopyをcloseする。

Supervisorの`ready`直後、materializerはone-use `runtime-bootstrap`でexact `StudySupervisorRuntimeBootstrap` root
`schemaVersion`, `workRootLexicalValue`, `workRootCanonicalValue`, `workRootIdentity`, `controlEndpoint`, `controlToken`を送る。Supervisorはrootを独立validateし、endpoint bind/token load/ACKを完了するまでwork-root mutationを禁止する。Consume後はframe bufferをwipeし、成功時はrole-specific lifecycle close/ACKでmaterializer edgeだけdetachしsupervisorをliveに保ち、failureはabort/exitする。Authorityはchild env/argvに入れずtransient bootstrap、supervisor memory、runtime-controlだけに置く。

Descendant witnessは`process-lifecycle-attestation`のexact `StudyProcessLifecycleAttestation` root
`schemaVersion`, `processRole`, `streamRole`, `componentRunId`, `instanceId`, `processRunId`, `event`, `exitCode`, `signal`、event `registered | exited`にcloseする。Adapter self-registrationはexit observationではない。Direct parentがOS-observeしてからreportをforward/createし、adapterはmatching watchdog registrationと直接観測したclean exit、moderatorはready reviewer registrationと直接観測したclean exit、supervisorはadapter/harness/moderatorをreportする。Reverse `acknowledgement`は直前valid attestationのみでcandidate/terminal reportに使わない。Adapter registration supervisor ACK→writer-binding relay、watchdog registration adapter/supervisor ACK→start、reviewer exit ACK→outcome、watchdog exit ACK→adapter exitとする。Startは6 registration、stopは3 watchdog attestationとdirect adapter/orchestrator exitを待ち、nonclean childは`lifecycle: child-exit`でrun invalid/witness非対象とする。

Stream commandはexact `StudyStreamControl` root `schemaVersion`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `streamRole`, `command`, `checkpointRequestId`, `handoffSha256`、command `start | checkpoint | anchor-handoff | stop`とする。Resultはexact `StudyStreamControlResult` root `schemaVersion`, `controlSessionId`, `studyRunId`, `streamRole`, `command`, `checkpointRequestId`, `sequence`, `monotonicNs`, `envelopeSha256`とする。Byte-identical `stream-control`をsupervisor→adapter→watchdog、semantic `stream-control-result`をreverse routeし、start/checkpoint/anchor/stopは3 resultを待つ。Start resultは`capture-start`+first heartbeat後のpositionとN/A `checkpointRequestId`を返す。Supervisorがcreate/validateしたstream fileの専用append-only handleをexact spawn inheritanceのfd5だけで渡す。Path-free runtime-only `StudyStreamWriterRuntimeBinding`はexpected adapter component/instance/process identityをfd5 stable handle identity、`nlink`、append modeへbindする。Adapter registration supervisor ACK後にbinding/handle relayとbinding ACK、watchdog independent validation/registrationとadapter/supervisor両ACKを行う。3系統すべてのwriter barrier/全6 registration後にproxy-binding ACK、その後にstream startする。Handleはcontract-fixed child-visible evidence-writer slotでadapter経由watchdogへ渡す。Path/cwd/env/argvは使わず、slotはnonstream roleになくthird IPC pipeではない。Adapterはtransfer-onlyでregistration後、supervisorはcomplete downstream ACK後にcopyをcloseし、extra/duplicate copyを禁止してwatchdogをsole writerとする。Stopはresult→handle close→exit、failureは全copy close/run invalidとする。

全6 registration/writer-binding barrierをsupervisorがACKした後にだけone-use `browser-proxy-binding`でexact `StudyBrowserProxyRuntimeBinding` root `schemaVersion`, `studyRunId`, `browserProxyAuthority`をready/registered study-browser-adapterへ送る。Adapterはvalidate/listener bind/ACKし、そのACK前に`stream-control:start`、capture-start、start completeを禁止する。Authority holderはstop/failure cleanupを除きsupervisor/adapter dedicated memoryとlive attempt contextだけとし、checkpoint/continuation equalityを検証してstopでwipeする。Env/argv/evidenceを禁止する。

Contractのcanonical control request/responseを使い、`requestId`とclosed response `errorCode`をretainし、raw tokenを送信しない。Materialize済み
supervisorはrun-scopedなfresh `controlSessionId`を1件生成してfinalizeまでstableに保つ。Helloはsession/challenge/tag/payloadをnullで送り、その
stable session IDを受け取り、fresh one-use `challengeId`だけを生成・authenticateする。以後のdirection-separated HMACはnull tagを含むcomplete
canonical messageを被覆し、challenge/request IDを1回だけ使う。`hello | verify-inputs | start | checkpoint | read-checkpoint |
anchor-handoff | verify-continuation | stop | finalize-prepare | finalize-commit | abort | register-pre-readiness-probe |
buffer-pre-readiness-product-event | register-product-probe | submit-product-event | close-product-probe`だけを許可する。Finalize-prepareはsupervisor内部でcurrent binding、continuity、exitを検証し、endpointを
liveに保ってcomplete witness materialを準備し、literal `null`を返す。Continuity keyはsupervisor memory外へ出さない。Separately authenticatedな
finalize-commit connectionをopenし、supervisorはaccept後にlistener teardownを開始して、既にopen済みのauthenticated connection上でexact
`StudyContinuityWitness`を返してからkeyを破棄してexitする。Complete responseに続くEOFとreconnection failureを要求し、その後にwitness pair、
次にseal pairをwrite/re-readする。

Retainするcapture fileはfixed 3 `capture/streams/<role>.ndjson` ledger、verifierが作る
`capture/study-capture-handoff.json`/`capture/study-capture-handoff.sha256`、finalize成功後の
`capture/study-continuity-witness.json`/`capture/study-continuity-witness.sha256`、`capture/study-capture-seal.json`/
`capture/study-capture-seal.sha256`だけとする。手作業で作成/editせず、各ledgerはenvelope/safe-payload lineを交互に保持し、他のretained
sidecarを許可しない。

SC-001直前に`pnpm run study:evidence:inputs -- materialize`でdescriptor-boundなfresh distribution 20件を作成し、その後
`pnpm run study:evidence:verify -- inputs`でsource bundleと20件すべてのactual distributionをrewriteなしで再列挙する。このverifierは
candidateをread、stat、hash、freezeせず、exit 0でfreezeするのはverified canonical study-input-manifest digestとexact-set stateだけとする。
Release candidate作成後に`INSPECTOR_STUDY_CANDIDATE_TARBALL`を全participantが使用するexact candidateへ向ける。
`pnpm run study:evidence:capture -- start`をcandidate authorityをreadする最初のphaseとし、capture前にcandidateをreopen、stat、hashして
identityとSHA-256をfreezeし、verified manifest digestへbindしてhandoff/release evidenceへ保持する。Candidate byte、bundle member、actual
distribution、digestの変更は両resultを無効にし、final pairがvalid evidenceとexact一致しない限りpaired study全体を再実施する。

- Moderatorは該当promptを同じ文面で読み直すことだけでき、command、navigation、interface操作のhintを提供しない。
- 登録後の全equipment/environment/product outcomeをfixed denominatorに残し、participantを除外・差し替えない。Timer開始前を
  含め、failureがcompletionをpreventまたはinterruptする場合は不成功とする。Handled SC-001 automatic-open failureは記録するが、
  participantがpin済みcertified browserで表示URLを使い、prohibited hintなしでoriginal 2-minute interval内に完了した場合、その
  condition自体を不成功としない。Timerをpause/restartしない。
- SC-001は標準化したprompt提示時にtimerを開始し、発見されたcustomization file 1つのsource/details viewが
  画面に開かれて操作可能になった時点で終了する。機材はprompt提示前に、verified distributionの`repository/` working
  directoryを意図するRepository rootとして準備する。固定fd6行
  `npx --no-install agent-customization-inspector --no-open`の入力、その準備済みrootからのInspector起動、pin済みcertified
  browserで必要なprinted-URL fallbackを完了するまでを計測に含める。Directory移動または`--root`指定はこのstudyの
  participant操作ではなく、それらのproduct capabilityはautomatedなUser Story 1テストで検証する。20人中19人以上が
  2分以内に成功しなければならない。
- SC-006はSC-001結果にかかわらず、全参加者を同じ指定fileが開いた同一の準備済みInspector stateへ置く。そのstateの
  準備完了後に標準化したpromptを提示した時点で開始する。Source、認識tool、file typeを2分以内に提出し、3項目すべてが事前定義したground truthと一致しなければ
  ならない。未回答・誤答が1項目でもあれば不成功とし、20人中18人以上の成功を必要とする。
- Capture startでsupervisorがfresh、unique、cryptographically random、run-local、unlinkableなparticipant tokenを正確に20件生成し、各tokenをexact
  32 random byte（256 bit）からunpadded base64url正確に43文字でencodeする。Participant固有`subjectId`だけにtokenを使い、その他は
  literal `not-applicable`とする。`subjectId`はsole pseudonymous human evidenceとし、identity/distribution/response mappingをretainせず、
  runごとにfresh生成する。Supervisorはordered token setのみをrun-localに保持し、次tokenだけをauthenticated `attempt-binding`内で送り、harnessはscheduleのみでtokenを作成/選択しない。Verifierはrun内uniquenessだけを検証し、cross-run registryを持たない。
  `study-browser` ledgerをworkflow sole authorityとし、各tokenとdiscovery、inspection、comparison、Global-consent workflowごとにterminal
  success/failure exact 1件、合計80件を要求する。Missing、duplicate、extra、mismatched pairを許可せず、そのexact denominatorから
  discovery >=19、inspection >=18を計算する。Nonterminal/request-event message数は制限しない。Exact-80 cardinality/canonicalityはsuccess
  thresholdと分離する。Validなterminal record 80件があれば、threshold未達でもverification、stop、finalize、witness、sealを完了できる。
  Threshold未達はrelease criterionをblockするがevidenceをinvalidateせずautomatic criticalにもせず、protocol、cardinality、authentication、
  privacy違反は別にfail closedとする。
- `capture -- start`はrun-levelだけとし、既存live supervisorでproxy/listenerをbindし、harness/moderator/3 adapterをlaunchし、各adapterがwatchdogをlaunchしてexact 8 internal long-lived descendantを構成し3 stream startを開始するがattempt-local stateを作らない。
  Participant 1〜19は各4 workflowをsequentialに完了/closeし、participant 20はdiscovery後にcheckpoint/handoff、continuationで残る3件を完了する。
  Terminalize済みならpost-anchor heartbeatをcontinuation progressとし、fresh profile/bootstrapはstream開始後かつ対象`npx`/first capturable request直前に作る。
- Exact-root runtime-only `StudyCurrentSubjectScoringContext`へ`automaticIssueCorrelationId`/`terminalizationClass`を追加する。
  Launch/bootstrap/buffer中はcontextを作らず、process bind+ordered release、open-binding両ACK、discovery-context ACK後だけreadinessを返し、その後にgrant/navigation/taskへ進む。
  Buffered eventはworkflow/process/link N/Aで後からlinkできない。許可するone-way updateはcorrelation N/A→first matching accepted prohibited observationとclass none→mapped causeだけとする。Supervisorがcurrent-workflow mirrorを所有し、open contextでsame-run/subject/process/workflowが一致するeventだけをcandidateとしてvalidateし、canonical safe-payload serialization前にcurrent workflowをtagしてexact 1回serializeする。下流adapter/watchdog ACK後にobservationをaccepted/countし、mirror update、updated `scoring-context`のmoderator ACK、release/outcomeの順とする。Accepted retained observationはimmutableで、後のworkflow tag mutation/backfillを禁止し、pre-ready/context-free N/Aは永久にN/Aとする。値はfailure用eligible candidateで、automatic issueは別count、outcome後context destroy、次prompt/timer/task前next context ACKとする。Moderatorがraw scoring inputと
  review field前にcorrelationを持つ`StudyWorkflowOutcomeSubmission`を所有する。Successはcandidate有無に関わらず全N/A、candidateがあるfailureはexact ACK済み`automatic-critical`を必須とし、candidate-free failureだけをreviewする。
- 正常完了するopen contextごとにfd7をexternal runtime-only `StudyModeratorInput` exact 1件へenableする。Compact canonical UTF-8 JSON+exact LFで、root orderは`schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `response`, `timing`, `groundTruth`, `rubric`、timingはcanonical nonnegative decimal string、他3 raw valueはcanonical JSON stringとする。EOF/parse/extra/trailing/replay/cross-contextをfailureにし、echo/history/recording/logを禁止してuse/abort後にframeをwipeする。Terminalization-synthesized remaining workflowはrecord 0、late rejectで空response/timingを捏造しない。
- Attempt前にsubject/workflowごとのdistinct human pairを割当て、human/collector-process/component-run identity/case assignmentのreuse、recording、IPCなしでpre-workflow terminal eventを含むsame live attemptを直接観察させる。Literal reviewer slotとsanitized terminal surfaceはdrain/reset後にfresh mappingで再利用できる。
  Failure後だけbyte-identical `StudySafetyReviewCase`をfresh isolated one-use collector 2件へ送り、case完全表示後にだけfd8/fd9をenableする。各collectorはslot-isolated surfaceからLF終端ASCII `product-caused-blocker | not-product-caused-blocker`をexact 1件読み、echo/history/recording/log/cross-slot outputを禁止してwipeし、first voteをreviewer twoへ見せない。両exit後にmoderator→supervisor→browser adapter→watchdog outcomeをacceptする。
  両non-product vote=`reviewer-cleared`、両product=`reviewer-confirmed-critical`、split=`reviewer-disagreement-critical`とし、後2者だけ`workflow-blocker`を使う。
  Published bilingual governance planにrequired reviewer rosterを記名し、repository bundle/work root/candidate/runtime IPC/capture/evidence外のseparate access-controlled administrative assignment recordにcaseごとのunique human pairをaudit用に記録し、consent-retention policyで破棄する。Identity/assignment/note/communication/human-process-assignment reuse/第三reviewはcollector/outcome/repository study-input/runtime IPC/capture/evidenceで禁止し、admin recordはscoring/runtime/evidenceに影響させない。
  Supervisor→browser adapterの`safe-payload`はnonworkflow browser observation専用でoutcomeを運んだりbypassしたりせず、supervisorだけがtag/constructしadapterがcandidate validateしてwatchdog ACK後だけsemantic ACKを返す。
  Browser-only releaseはそのACK、joined releaseはbrowser/server両safe ACK後とする。
- SC-004のproduct network/URL/MCP instrumentation、exact-authorityのInspector-server request ledger、study-browser request
  captureを、SC-001前のInspector launchから4つのworkflow観察完了まで継続して実行する。Process identity、発行済みのexact
  authority、request initiator/target、server ledgerを相関し、Inspector/bundled-SPAの全requestをexactな2つのauthorized internal
  loopback classのいずれか、または禁止対象へ分類する。帰属できるが分類できないtrafficは両class外とする。無関係な
  extension/host-process trafficはproductへ帰属させず記録し、観測できるOS-mediated mounted/mapped-source trafficはFR-022
  limitationとして別に記録する。
  Privacy-safeでexactなtarget classifier `targetClass`を使い、closed literalを
  `static-manifested-asset | static-spa-shell | static-client-route-fallback | connection-discovery-metadata |
  rpc-channel-upgrade | rpc-get-session | rpc-get-file-detail | rpc-rescan-repository |
  rpc-get-global-consent-preview | rpc-create-global-consent-preview | rpc-enable-global | rpc-rescan-global |
  rpc-disable-global | rpc-devframe-framework | other-loopback | remote | mcp | unclassifiable | not-applicable`とする。Authority、target、method、origin、same-host、attribution、request class、
  prohibited statusにまたがるcontractのclosed truth tableを使う。Session channelのRPC invocationはInspector-sideのdispatch境界で
  dispatchされた関数のrowとして分類し、method/originはnot-applicableとする。全rowに`eventCode: observation`、not-applicable workflow class、observed outcome
  class、correlation-context subject/process ID、fresh event/correlation IDを持たせる。Exact authorized-static/RPC table rowだけにeffect `none`と
  `prohibited: false`を使う。Table外のproduct-attributable exact-issued requestにはrequest observation、該当する
  `participant | bundled-spa | inspector` actor、exact-issued
  authority、prohibited request class、observed closed target/method/origin、unauthorized-request、true
  same-host/attribution/prohibitedを使う。Other-loopbackにはother-loopback authority/target、prohibited request class、observed closed method、
  not-applicable origin、unauthorized-request、同じ3件のtrue booleanを使う。Remoteにはremote authority/target、prohibited request
  class、observed closed method、not-applicable origin、prohibited-outbound-request、false same-host、true attribution/prohibitedを
  使う。Fully unclassifiableなproduct-correlated requestにはunknown actor、unclassifiableな
  authority/request/target/method/origin、unauthorized-request、false same-host、true attribution/prohibitedを使う。MCPにはMCP
  observation、Inspector actor、target `mcp`、not-applicable authority/request/method/origin、effect `mcp-connection`、false
  same-host、true attribution/prohibitedを使う。Proxy/serverの両方でexact Chromium-controlled `Sec-Fetch-Dest`、`Sec-Fetch-Mode`、
  `Sec-Fetch-Site`、`Sec-Fetch-User`、Origin、Refererを独立project/discardするが、Fetch Metadataをhuman attestationにしない。
  Product readiness後かつinitial navigation直前にrun/attempt/fresh correlation/stateを持つarmed `StudyParticipantNavigationGrant`を作る。
  Participantはvalid marker/participant-shaped tuple/exact authorized-static/current grantを全て要求する。Adapterはstateを変えずreserveし、supervisorはgrant/correlation/attempt/candidateをvalidateしてcanonical grantをarmedのままpending storeした後、sole exact one-use `browser-broker-decision: candidate-forward`を送る。別candidate ACKは存在せず、このdecisionだけがcandidate acceptanceとcanonical grant atomic consumeを行い、adapterはmatching decisionをvalidateしてからcopy consume/forwardする。Armed grantのないfresh HTTP request（nonexact/post-consumption/page-script navigationを含む）はopen-binding `unknown`とfresh proxy IDを持ち、product-attributable/prohibitedでblockするがgrantをconsumeせずrunをinvalidateしない。Authenticated candidate/grant IPCのreplay/duplicate/stale、simultaneous second consume、broker decision/ACKのskip/mismatchはforward 0/run invalid、closeでgrant destroyとする。
  Valid + not participant + missing user + exact-issued Originまたはmissing Origin + exact-issued Refererを
  `bundled-spa`とし、exact authorized static/RPC requestだけforward、その他はproduct-attributable/prohibited blockとする。Valid + extension Originは
  `browser-extension`、N/A、unrelated block。残るvalidは`unknown`、open binding ID、product-attributable/prohibited block。Bootstrap後missingは
  `other-host-process`、N/A、unrelated block。Invalid/duplicate/malformed/noncanonical/unknown/stale/mismatchedは`unknown`、N/A、unrelated block。
  Forwardしたexact authorized participant/SPAだけがbrowser+server/claimを使う。Blocked rowはbrowser-onlyでextension/other-host/unknown N/A claimは
  存在しない。Direct Inspector exact-issuedはproduct+server、nonexact InspectorとOS/effect/MCPはproduct-only、workflowはbrowser-onlyとする。
  Field-by-field negative testを実行する。Study-browser captureにはstudy
  equipmentが固定するcapture scriptのNode-built-in-onlyでdeny-by-defaultなlocal HTTP/CONNECT proxyを使い、Playwright/unbound
  instrumentationを使わない。Exact authorized loopback requestだけをforwardする。`other-loopback`、`remote`、`unclassifiable` targetと全
  CONNECT requestをprohibitedへclassifyし、DNS lookup、socket connection、request-body forwarding、response-content exposure前にblockして
  CONNECT tunnelを確立しない。Participant candidateはsupervisor-owned grant correlationを使い、その他のbrowser eventだけfresh
  32-byte/43-character unpadded-base64url `X-Inspector-Study-Correlation`をadapter/proxyが生成し、browser proxyがexisting valueを
  remove/replaceし、Inspector probeがassignする。このnon-capabilityをauth/routingに使用しない。Server instrumentationはduplicate/invalid
  grammarをrejectして同じsafe IDだけをledgerへ送り、IPC前にheader/raw fieldをdiscardする。Raw headerのname、framing、wire/encoded representation、
  noncanonical derivativeをretain/hash/logせず、strict grammar/canonical validation後はdecoded canonical safe-ID valueだけを`correlationId`として
  retained payload/digest chainへ入れる。Captured wire/browser/Inspector byte自体をhashしない。別local clientは
  actor/process correlationなしではunrelatedとする。Required role間でsafe classification、`subjectId`、`inspectorProcessId`を一致させる。
  Missing、duplicate、malformed、mismatchをcriticalとする。
- Contract/data modelの`StudyBrowserAttemptBinding`、`StudyBrowserRequestCandidate`、`StudyServerCorrelationClaim`、
  `StudyParticipantNavigationGrant`、`StudyBrowserBrokerDecision`を使う。Supervisor/brokerがattempt/bindingを生成し、prepared/open/closedの
  byte-identical snapshotをharness/browser adapterへ配布して両ACKを要求する。Ordered pre-readiness release、open両ACK、discovery-context ACK後だけreadinessを返し、その後だけgrant/candidateを許可する。`terminalization-decision`で両copyをterminalizingへ移す。Adapterはbrowser/grant/marker/reservation/candidate/pendingだけをdestroyしclosed ACKまでbindingを保持し、harnessはsynthesis/closed dual ACKまでbinding/fixed scheduleを保持する。両closed ACK後だけdestroy/nextとする。Stateはexact `prepared | open | terminalizing | closed`、live bindingは最大1件とする。
- Supervisorをsole participant-launch controller/direct OS child observerとpre-bootstrap exitを含むsole product-exit sourceにし、harnessはschedule/bindingだけを担う。Probe close時のserialized child stateがalready exitedならproduct-exit、liveならpremature-probe-close、normal 4-outcome/zero-pending closeならterminalization 0とする。Browser adapterはsole attempt-bound equipment observerで、`browser-exit`はactual browser process/context exitだけ、`equipment-failure`はcontroller/proxy/auth healthy中のexternal browser/OS/environment bootstrap failureだけをreportする。Adapter/proxy/controller/CDP/auth/marker/IPC/implementation/child-management faultはrun invalidとしoutcomeをsynthesizeしない。
  First valid cause wins/later reject、premature closeは`equipment-failure`へmapする。Terminalizationはaccepted row/joinをfreezeし、missing
  context/failure/reviewだけをfixed orderで作る。Evidence-role failureはrun invalid/synthesis 0とする。Byte-identical decisionをharness/adapterへfanoutし、
  adapterはattempt-local stateだけclearしてaliveを保つ。Child reportは`attempt-terminalization`、`browser-broker-decision`はsupervisor→adapterだけとし、
  `candidate-forward | browser-only-released | joined-pair-released`を使う。Attempt IDをactual browser/request/application/evidence/logへ入れない。
  Valid-marker bound browser-only decisionはopen attempt IDを使い、missing/invalid-marker unrelated branchだけN/Aとする。Pre-readiness terminal submission/case/両voteは同じN/A process IDを反復する。
- Prepared profile `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`をexactに選ぶ。これはUbuntu 24.04 x64/
  Node.js 24.18.0上のPlaywright 1.61.1 `chromium` revision `1228`、browserVersion `149.0.7827.55`、title `Chrome for Testing`、
  headed、fresh nonpersistent context、empty extension、browser-context-only proxy、
  `single-407-basic`である。Browser adapterはdigest/identity-verified pinned Chromiumをfixed anonymous `--remote-debugging-pipe`（internal evidence IPC外のbrowser-equipment control）で直接spawn/OS-observeする。Pinned DevToolsはexact proxy、`disposeOnDetach: true`、empty bypassの`Target.createBrowserContext`、`Fetch.enable(handleAuthRequests: true)`、`study`/marker challengeへのexact 1回の`Fetch.continueWithAuth` ProvideCredentials、exact 407→retry→204 verificationを使う。Supervisorがfresh `browserProxyMarkerSecret`を作りbrowser adapterへ直接installさせる。Actual-browser bootstrap/ACKまでprepared、
  成功後だけ両side active、failure時はactiveにせずdestroyする。Run stream開始後かつ対象attemptの`npx`/first capturable request直前にexact proxy-local URI
  `http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`をrequestし、sole authentication challenge
  `Proxy-Authenticate: Basic realm="inspector-study"`と`Connection: close`だけをexact header 2件として持つbodyless 407を1回、canonical Basic retryを1回、
  `Connection: close`だけをsole headerに持つbodyless 204を要求する。
  DNS/connect、application、correlation、candidate、forward、evidence effectは0件とし、capture中の各study requestはcanonical Basic marker exact 1件を持つ。
- Markerはtransport authenticationだけに使い、validityだけでactor、attribution、forwardingを決めない。Raw secretはadapter attempt-local control/auth request bufferだけに置きbrowser env/argv/profile/history/log/evidenceへ入れない。Secret、raw Basic、encoded/noncanonical
  derivative、proxy configをhash/evidence、log/output、file、environment、argv、persistent profile/history/cache/keychain/credential store、application
  requestへ入れない。Transitory marker-install frame authenticationだけをpreimage例外とする。Marker-install/DevTools request bufferをACK後wipeし、normal/abort/crash/terminalization/controller failure/child exitでcontext/processをdisposeして全marker materialをwipeする。Pinned Chromiumのremote-debugging-pipe disconnect contractが`CloseBrowserSoon`を呼ぶことを要求し、必要なplatform containmentはstudy equipment/setupが提供する。Adapter exit後は全browser-equipment descendant/context terminationとfresh-profile absenceを検証するまでnext attempt/finalizeをblockし、runtime OS observer dataをevidenceへretentionしない。各
  actual-browser path後にisolated HOME/XDG/profile/history/cache/credential storeをinspectしてmarker/encoded Basic/`browserAttemptId` residue 0件を要求する。
- Exact authorized participant/SPA forwardingではadapterがstateを変えずreserveし、supervisorがcanonical grantをarmedのままcomplete safe candidateをvalidate/pending storeしてsole authenticated `browser-broker-decision: candidate-forward`でaccept/atomic canonical consumeする。Adapterはmatching decision後にcopy consume/forwardし、別candidate ACKは使わない。Probeはcorrelationをstripし、
  sole permitted participant/SPA claimを作ってbroker ACK後にapplication handlingへ進む。`submit-product-event` outer rootは`inspectorProcessId`, `destinationRole`, `payload`だけで、outer processはregistered probeに一致し、claim subject/process equalityはpayload内でopen binding/outer IDに対して検証する。Brokerはcandidate/claim 1件ずつをvalidateし、browser/server両safe-payload ACK後に`joined-pair-released`で両recordをreleaseしてからACKする。Mismatchはrecord 0件とする。
  Timeout、clock、deadlineは使わない。HTTP transaction/request end/abort/error/close、inherited IPC/probe/attempt/binding close、capture stop、verified
  child exit、またはduplicate/replay/mismatch/unexpected role/order/second join/residue/late inputだけでfailする。Pending/marker stateをwipeし、partial
  recordを生成せずlate inputをrejectする。Deadline assertionなしでlifecycle-order/race caseを実行し、既存inherited IPCだけを使ってjoin専用のnew control commandを追加しない。
- 正常にlaunchしたparticipant Inspector processのexact readiness transition中、readiness responseを返す前に、supervisorにexact 32 cryptographically random byte
  （256 bit）をunpadded base64url正確に43文字でencodeしたfresh opaque `inspectorProcessId`を1件付与させ、OS PID、subject ID、
  watchdog/capture IDと区別する。これはnon-human launch correlation専用で、
  pseudonymous participant evidenceではない。同じlaunchの全cross-stream request/effect/workflow recordに同じsafe IDを使い、別launchでreuseしない。
  Launch/readiness前failureではprocess IDをliteral `not-applicable`とし、accepted rowを保存してmissing workflowだけにmapped-class
  terminal failure/reviewを記録する。Duplicate/extra workflow recordを追加しない。
  20 participant attemptをlaunch recordへbindし、missing、duplicate、malformed、reused process-ID propagationをrejectする。
- 各subjectでfd6をLF終端ASCII `npx --no-install agent-customization-inspector --no-open` exact 1行へenableし、他/extra inputをreject/wipeしてshellを使わない。対象verified distribution `repository/` cwdでsanitized equipment PATH上のsole audited candidate-bound binを直接spawn/OS-observeする。Child envはbound `NODE_OPTIONS` probe、control endpoint/token、minimum safe run/subject IDだけとし、candidate/proxy authorityをterminal/env/argvへ入れない。このfresh participant process/contextは8 internal long-lived descendant外のexternal ephemeral equipmentとする。各attempt後にcloseしfd6をdrain/reset/clearして以前のinput/output/historyを次attemptへ渡さない。
- `capture -- start`から`capture -- stop`まで、study setupはparticipantが`npx`で起動するInspector Node processへ、digest/identity-boundな
  capture script自身だけをexact `NODE_OPTIONS=--import=<bound-capture-script-file-url>` probeとしてinjectする。Probeはadapter/watchdogとは別process roleとする。
  Candidate bootstrapへ到達した場合はbody実行前にexact root `schemaVersion`, `productId`, `bootstrapEventId`の
  `StudyPreReadinessBootstrapProof`を使い、`register-pre-readiness-probe`へ`studyRunId`, `subjectId`, `bootstrapProof`を送り
  `preReadinessProbeId`を得る。Runtime-only `StudyPreReadinessProductBuffer`はexact root `schemaVersion`, `studyRunId`, `subjectId`,
  `preReadinessProbeId`, `state`、state `open | readiness-bound | terminalization-bound | destroyed`を持つ。
- Process/workflow/automatic/review N/Aのcanonical safe draftを`buffer-pre-readiness-product-event` request
  `preReadinessProbeId`, `destinationRole`, `payload`でbufferし、product effect前にsupervisor ACK、raw immediate discardを要求する。
  Readiness時は`register-product-probe`へ`studyRunId`, `preReadinessProbeId`, `readinessProof`, `requestedDestinationRoles`を送り、
  fresh process ID bind+ordered-release ACK、open-binding両ACK、discovery-context ACK後だけreadiness responseとする。Bootstrap未到達launch exitは通常pre-readiness terminalization、
  bootstrap到達後のidentity/register/ACK failureはrun invalidとする。Pre-readiness exitはprocess N/Aのrelease ACK後にterminalizationへ進む。
  Non-target/helperはregister/evidence 0でdiscardする。Participant processはsupervisor descriptorをinheritできないため、
  probeはendpoint/token environmentを`register-pre-readiness-probe`、`buffer-pre-readiness-product-event`、`register-product-probe`、
  `submit-product-event`、`close-product-probe`だけに使う。Supervisorが各safe eventとopaque `inspectorProcessId`をdistinct product/server adapter/watchdogへrouteする。
  `submit-product-event` outer exact rootは`inspectorProcessId`, `destinationRole`, `payload`だけとする。`destinationRole: inspector-server-ledger`の場合だけexact `StudyServerCorrelationClaim` payload variantを使い、outer process IDでregistered probeをauthenticateし、participant/SPA claimのsubject/process IDはpayload内でopen binding/outer IDと一致させる。Probeはraw
  discard前にclosed correlation headerをassignする。Browser
  helperへprobe/control environmentをinheritせず、probe path/options/environmentをevidence化しない。Missing/tampered/alternate/duplicate probeまたはunsafe raw IPCはcriticalとし、
  candidateはdormant readiness hookだけを提供してevidence authorityを持たない。
- Exact role `product-instrumentation`、`inspector-server-ledger`、`study-browser`を使い、それぞれdistinct adapter/watchdogを持たせ、watchdogを
  sole envelope writerとする。既にaliveなsupervisor経由で`pnpm run study:evidence:capture -- start`を実行する。Adapterはraw trafficをmemory内だけでinspectし、closed
  safe eventへclassifyしてIPC前にraw valueをdiscardし、authenticated IPC message 1件につきclosed safe payload正確に1件を送る。
  Primary-workflow observation 1件から任意件のmessageを送ってよく、全件をcount/chainする。Fixed code、protocol-owner-generated opaque ID、boolean/enum、safe integer、evidence digestだけを
  retain/hashし、raw headerのname/framing/wire/encoded representation、全noncanonical derivative、body、content/metadata、participant
  response、path、URL/authority value、capability、environment value、raw errorはretain/hashしない。Header由来の唯一の例外はstrict validation済み
  decoded canonical safe `correlationId`であり、retained canonical payload/digest chainへ入れる。Captured wire/browser/Inspector byte自体をhashしない。
- Contractのexact 11-property envelope、pairwise-distinct opaque watchdog/capture instance/process-run ID、closed kind-specific canonical safe
  payload、sequence 0からexact +1、prior-envelope chain、safe-payload hashを使う。Nominal scheduler targetを1,000 msに設定し、observed
  continuity ceiling 1,500,000,000 nsをstart→first heartbeat、consecutive heartbeat、latest heartbeat→checkpoint、last heartbeat→stopの
  各gapへ適用する。Intervening payloadでmissing heartbeatを隠せず、ceilingを超えればcritical、以下はscheduler toleranceとしてacceptする。
  `pnpm run study:evidence:capture -- checkpoint`は各sole writerにimmutable prefixをatomic snapshotさせ、heartbeat/eventを直ちに再開し、
  handoffを書かない。Later pairがappendを続ける間に`pnpm run study:evidence:verify -- checkpoint`がそのprefixだけをrecomputeしてopen SC-001
  handoffを作る。Verifierはrun ID、checkpoint request ID、exact handoff digestでsupervisorへauthenticateし、各watchdogにmatching
  `handoff-anchor` payload exact 1件をcheckpoint後かつstop前に、normal append/heartbeat schedulingをpauseせずappendさせる。
  Checkpoint取得時に既にqueue済みのordinary post-prefix pairはanchorより先にappendされてもよい。Continuationは全intervening pair、
  sole matching anchor、同じuninterrupted chain上でその後に続くordinary heartbeat/payload 1件以上を検証する。Stop/sealは同じdigestとstreamごとのanchor count literal 1をbindする。両handoff fileを
  別のvalid prefixへ置換した場合、companion/later linkを再計算してもfailureにする。
  SC-006前に`pnpm run study:evidence:verify -- continuation`が0を返さなければならない。4観察後に
  `pnpm run study:evidence:capture -- stop`、続いて`pnpm run study:evidence:verify -- finalize`を実行する。Startは6 stream process+ordered exact 2 orchestratorを返す。
  Stopはlive reviewer 0を要求して8 internal long-lived descendantを終了するがsupervisor/endpointをaliveに保つ。Finalizeはcommitment、original anchor、80 outcome、role matrix、
  supervisor-directの3 adapter/2 orchestrator exit、adapter-attestedの3 watchdog exit、`ephemeralReviewerProcessExitCount == reviewVoteCount`を
  独立検証し、endpointをliveに保ったままfinalize-prepareを完了する。Separately authenticatedなfinalize-commit connectionでlistener teardown
  開始後かつsupervisorのkey破棄/exit前にexact witnessを受信する。Complete response、EOF、reconnection failureでendpoint removalを証明してから
  continuity-witness pair、次にcanonical seal pairをwrite/re-readする。Witnessは
  `controlSessionId`、両identity commitment、handoff digest、8 long-lived exit、reviewer exit countを、sealはwitness/handoff digest、両study digest、exact 3 first/final
  root/record/kind count、exact aggregate summary
  `automaticCriticalIssueCount,suspectedWorkflowBlockerCount,reviewVoteCount,reviewDisagreementCount,reviewerCriticalIssueCount,criticalIssueCount,zeroCriticalIssueGate`
  をbindする。Automatic IDをexact `automatic:<correlationId>`からderiveし、vote count=全nonautomatic reviewed failure×2、
  confirmed/disagreement rowのreviewer-critical IDをexact `reviewer:<subjectId>:<workflowClass>`で再計算する。Totalはそのtagged/deduplicated union
  cardinalityとし、automatic-critical workflow rowを二重計上しない。Zero gateはunion emptyかつexact 20×4 terminal set completeの場合だけtrueとし、
  19/20・18/20 thresholdは独立とする。Validated terminal stop/envelope countでterminal sequenceをbindする。Prohibited value、process/watchdog
  pause/death/restart、endpoint/token/authentication/probe/correlation failure、identity change、subject/workflowまたはrole-matrix mismatch、scheduler
  misconfiguration、excessive gap、sequence/chain/payload/count/digest/commitment/anchor error、handoff rewrite、truncation、early/non-clean exit、
  teardown residue、missing role/witness/seal、failed verifier、stitchはautomatic criticalとする。
- Primary workflow全体でcritical usability issueを0件とする。禁止された支援なしでworkflow完了を妨げる問題、または
  意図しない実行、調査対象sourceの変更、FR-022で定義した禁止対象のdirect product-issued outbound requestまたはMCP connection、
  exactな2つのauthorized internal loopback class外のrequest、別machineへの調査content露出をcriticalとする。この2つのclosed classは
  outboundでもMCPでもなく、このeventには含めない。
  記録済みpre-mounted/mapped sourceのOS-mediated trafficはFR-022 limitationであり、このautomatic connection eventにはしない。
  ACK済みcontext correlationはfailure用eligible linkにすぎず、successは全N/Aのままautomatic issueを別countする。Candidateがあるfailureはexact accepted same-context
  `automatic-critical` linkをreviewなしで必須とし、candidate-free failureだけにisolated/hidden/one-use vote 2件を使う。両product-causedは`reviewer-confirmed-critical`、両non-product-causedは`reviewer-cleared`、一方ずつは
  `reviewer-disagreement-critical`とする。Confirmed/disagreementだけをreviewer criticalとし、identity/note/communication/human-process-case-assignment reuse/第三reviewerを禁止する一方、literal slot/sanitized terminal surfaceはresetできる。SC-006後に20人全員が標準化したcomparisonとGlobal
  consent taskを実施し、記録した観察で4つのprimary workflowすべてを扱う。

Study evidenceをacceptする前にfocused contract/source-structure、fake-clock、real OS-specific child-process/control-endpoint
integration/security suiteのpassを要求する。Env phase、canonical HMAC/one-use challenge、single-file/no-import closure、initially-empty candidate-launch slot、inputs後のdigest-bound provisioning、sole audited-bin resolution、network/scripts/cache/global/fallback rejectionとteardown absence、proxy/probe
attach/environment strip、correlation-header grammar/exact role matrix、20-token/80-outcome/process-ID equation、accepted workflow 0〜4件のcrashとmissing-row terminalization、
path/secret non-retention、8 long-lived exit/reviewer-exit equality/
commitment、alternate-valid-prefix handoff rewrite、endpoint teardown、witness、sealを扱う。

### SC-002 performance測定

正確に100,000 filesystem entryと500 matching customization fileを持つdeterministic fixtureを
測定前に1つ構築し、全runで変更せず使用する。Fixtureの構築/setupと`npx` download、installation、process起動は
両timerに含めない。

`tests/performance/sc002-reference-profile.json`で公開する同じversion付きprofile上で正確に10回測定する。Profileは正確な
OS image/version、processor architecture/modelとlogical count、memory、storage medium/filesystem、正確なruntime、benchmark
command/configuration、deterministic fixture manifest/digestを特定する。RunごとにInspectorを終了し、次のrunではfresh
processを起動してapplication-memory stateと以前のsnapshotを再利用しない。Operating systemのfilesystem cacheは
意図的にclear/resetせず、自然に変化する状態で測定する。各fresh processでは、まず自動初回Repository scanがterminal
stateへ達するまで待つ。そのscanとinventoryは両timerの対象外とする。次にbrowserから明示的Repository rescanを正確に
1件dispatchし、その時点で両timerを開始してadmission responseのopaqueな`scanRequestId`をcaptureする。1秒timerは、
上記qualifying statusが画面に表示されassistive technologyにも公開され、同じrequest IDを識別した場合だけ停止する。
10秒timerは、その同じrequest IDがcommitしたRepository generation由来のcomplete inventoryが表示され、主要list controlが
操作可能になった時点だけで停止する。以前のstatus、snapshot、自動scan generationではどちらのtimerも停止できない。
続いて標準化されたfilter actionとitem-selection actionを1回ずつ実施する。各interactionは、
browserのinput dispatchから対応するfiltered resultまたはselected-state feedbackが表示され操作可能になるまでを測定する。
同じ9 run以上からなる1つの共通subsetが、両scan thresholdと両interaction 100ミリ秒未満という4 thresholdすべてを
満たさなければならない。各runとaggregate結果を
profile ID、fixture digest、scan request ID、committedなRepository generation、実際のenvironment valueとともに記録し、個人識別子と
絶対user pathだけを省略する。Profile fieldを
変更すると新しい直接比較不能なmeasurement setを開始し、結果はportable performance guaranteeではなくprofile固有とする。

### SC-003/004/005/007 release-evidence fixture

Release candidateの測定前に`tests/fixtures/outcomes/manifest.json`とcanonicalな
`tests/fixtures/outcomes/manifest.sha256`をfreezeする。Manifest schema/version、一意でstableなcase ID、criterionと
required-classのmembership、fixtureまたは決定的builderへのreference、客観的expected outcome、参照する全fixture digest、
required classごとにdeclaredした非ゼロminimumをvalidateする。Manifest記載caseをすべて実行し、manifest version、canonical
digest、正確なcase ID、class count、resultを`validation.md`と`validation.ja.md`へ記録する。Missing、duplicate、undeclared、
unexecuted、digest-mismatched case、required classの空集合、fixture欠落、declared minimum未満のdenominatorは、影響する全criterionを
failureにする。

SC-004 manifestは、supported toolごとに1件以上のfixtureと、全prohibited-effect class、すなわちcustomization由来の
command/code execution、child process、MCP connection、FR-022で定義したdirect product-issued outbound request、
product-issuedな調査対象source mutationのfixture、およびRepository/Global各source kindのout-of-bound selector
fixtureを含む。そのcaseは、発行済み`localhost` authorityにおける2つのexactなFR-022 authorized internal loopback
classを独立にvalidateし、全fixture rootがlocalであることを記録しつつ、lexicalに識別不能なpre-mounted/mapped network
filesystemをFR-022のplatform/environment limitationとして文書化し（explicitなUNC/server-share/device vectorでは
filesystem/DNS/SMB call 0件を証明する）、mutation assertionのためにproduct filesystem operationをinstrumentし、
OS起因だけのaccess-time movementをcriterionの成否に数えず別に記録する。

SC-007 manifestは、全file-confined outcome class、すなわちmalformed content、binary content、invalidなnon-NUL
UTF-8 replacement decoding、unreadable file（broken symbolic linkを含む）、boundary-crossing referenceのfixtureと、全failure
class、すなわちjob acceptance前にrejectされたsession-API request、accepted session-API job後のfailure、startup failureのfixtureを
それぞれ1件以上含む。さらに、processがaliveのまま全inspection dataをfenceし、failしたrequestのerrorをretainして
retry/joinを利用可能にし、次の手順としてrestartを提示するpost-acceptance Global-disable failureも実行する。InvalidなNon-NUL UTF-8はreadableな
`utf-8-replaced` textとして処理され、それ自体でscanをpartialにしない。他の全file-confined outcomeは、そのfileの
actionable diagnosticと、他fileへ影響しない許可されたcompleteまたは`partial` commitを生じる。Failした全session-API
attemptは何もcommitせず、最後のcommitted snapshotだけを残し（accepted rescanのfailureではそのsnapshotをstaleとmarkする）、
failしたrequestのerrorを表示する。
Startup failureはactionableなmessageとともにlaunchを終了させる。

Caseのremove/reclassify、required-class定義の変更、expected outcomeの変更ではmanifest versionのincrementと明示的なreviewを必須とする。参照fixture byteだけを変更する場合は、影響する全fixture digestとcanonical manifest digestを更新する。どちらの変更も新しい直接比較不能なmeasurement setを開始し、digestの変更だけでdenominator semanticsの変更を認可せず、release denominatorを黙って弱めない。Automated contractはtable-drivenなprevious/current manifest revision pairでtransition ruleをtestし、human reviewを調査も立証もしない。実際のrelease diffについては、初回作成またはprior/current version、変更したcase ID、required-class定義またはexpected outcome、明示的なreviewer decisionまたはreview referenceを`validation.md`と`validation.ja.md`へ記録する。

## Boundaryと実行環境capacityの検証

```bash
pnpm exec vitest run --project integration tests/integration/boundaries
```

Inspectorはfile単体または合計byte、file/record数、path/parser structure、
retained graph、request/response body、package asset、preview、editor computation、coordinator work、
scan経過時間について製品定義の数値上限を持たない。利用可能なcapacityはNode.js、選択したparser、OS、
filesystem、browser engine、実行環境により決まる。それに相当する製品レベルのcapacity-validation
contractは公開しない。

Failure fixtureは調査対象Sourceのread、parser、coordination、assembly、serializationの各boundaryを実行する。
単一fileに限定されるfailureはそのfileのactionableなper-file diagnosticとなり、非影響fileはすべてcompleteのまま、
attemptはtraversal完了後に1つのatomic `partial` generationをcommitする。単一fileに限定されないfailureはitem、
result、generationを一切commitしない。Failしたsession-API requestはacceptance前のrejectionでもaccepted job後の
failureでもreal errorを返し、startup所有workはactionableなmessageとともにlaunchを終了させ、prior snapshotがあれば維持し、
API responseとauthored sourceをtruncateしない。Error pathはcustomizationのvalidity、correctness、compliance、
lint verdictを作らず、failureをcapacity、resource、operational causeで分類しない。

Per-file diagnostic fixtureは各file-confined classを扱う。Unreadableまたは発見からread前までに消失したfile
（targetがmissingまたはunreadableなsymbolic linkを含む）は`file-unreadable`を生じる。admit済みcandidateのNULを含むcontentは
diagnostic-onlyの`file-content-binary` itemを生じ、census掲載companionのbinary bytesは何も生じない。Parser/extractor failureは`recognition-parse-failed`を生じ、
完全なreadable sourceは表示およびcomparison-eligibleのまま残る。Boundary-crossing referenceはtargetをreadせずに
報告される。各fixtureは、affected itemが問題解決に十分なSourceとsource-relative path contextを保持し、同じscanが
完全な非影響fileをすべてpublishすることを証明する。Source rootがmissingまたはunreadableな場合は代わりにそのSourceの
scanがsource-scopedな`root-unreadable` diagnosticとともにfailし、sessionは利用可能なままとする。

Coordinator testはslot、queue capacity、scheduling deadlineを定義せず、deterministic serialization、sequence別の
generation atomicity、cancellation、disable/shutdown/supersession時のauthority revoke、late-result discardを保つ。
Independent-sequence fixtureは、Repository rescanのcommitがRepositoryのviewだけをinvalidateしてcommit済みGlobal
detail/comparison viewを有効なまま残すこと、Global rescanも同様にcommit済みRepository viewを有効なまま残すこと、
Global disableがgenerationを一切commitせずGlobal sequenceを破棄することを証明する。Session-loss/response-guard
contractとSC-002のtime thresholdはcapacity上限ではなくacceptance criterionであり、productはcontinuously idleなpageに
process-loss detection deadlineを設定しない。Testは、processを終了させる
out-of-memoryからのrecoveryや、uncancellableなNode.js/kernel I/Oの
physical cancellationは保証しない。

Traversal-plan call traceはさらに、Repository traversalがcompile済みimmutable planを実行し、Global exact targetがtool-home
rootをopenせず、fixed instruction-subtree walkがそのsubtreeだけをopenし、隣接Global pathへのI/Oが0であることを証明する。
Path-spelling fixtureはexact raw `Dirent.name` segmentが唯一の綴りであることを証明する。Filesystem operationはraw entry
nameを使い、publicなSource-relative Pathはその名前を`/`でjoinしたものであり、targeted fixed pathはimmutable registry target
spellingだけをI/O operandにするため、NFD-only nameはraw segmentでreadされそのraw綴りのまま公開される。Hard linkは
ordinaryなfileである。2つのhard-linkされたpathが両方ともallowlisted selectorにmatchするなら、それは単に2つの
inventory fileであり、identity grouping、alias ranking、group単位のbookkeepingはtest対象として存在しない。
Symbolic linkはagentが解決するのとまったく同じようにtransparentにfollowされ、symlinkされたcustomization fileは
そのlinked target越しにinspectionされる。Recursive traversalはvisited directoryをreal pathで追跡し、
link-cycle fixtureはscanがentryを重複させずterminateすることを証明する。Targetがmissingまたはunreadableな
linkは`file-unreadable`を生じる。

Parser-failure testは全formatを扱う。1つのfile内のparser/extractor failureは、returnされたかthrowされたかに
かかわらずfile-confinedである。対象recognitionのresult全体だけを破棄して`recognition-parse-failed` diagnosticを
attachし、完全なreadable sourceを表示およびcomparison-eligibleのまま保ち、他の全fileへ影響しない。
All-or-nothing recognition outputも扱う。
Exact-display testはsource/metadataに異なるliteral credentialと環境変数参照を置き、別のsentinel process valueを
設定する。Source/comparison viewが記述されたtextを正確に保持し、sentinel valueを混入させず、masking/reveal controlを
表示せず、Diagnosticにcustomization source valueを複製しないことを証明する。

Node.js filesystem testは、同じplatform-neutral packageに対してsupported macOS、Windows、Linux CI
matrixで実行する。各resultはplatformとNode.js versionを記録する。Readはordinaryである。
Symlinkの有無にかかわらず全fileをread-onlyかつtransparentにreadし、directory recursionはvisited directoryを
real pathで追跡してlink cycleでもwalkがterminateし、broken link targetを含むfile-confinedな任意のread errorは
そのfileの`file-unreadable` diagnosticになる。
Operation間でidentityを繰り返し再検証する機構、並行変更のfailure taxonomy、identity単位のbookkeepingといった
adversarial-input machineryはproductにもtestにも存在しない。

Filesystem call recorderはさらに、調査対象sourceへのopenが全てread-only、non-create、non-truncateであり、write、
append、create、truncate、rename、delete、link、chmod/chown、timestamp、extended-attribute、ACL、または同等の
mutation-capable callが一切ないことを証明する。Fixtureのbefore/after measurementはcontent、length、identity/link
state、mode、modification/change time、観測可能なextended attribute/ACLを比較する。OS readだけが原因のaccess-time
movementは別に記録し、no-product-mutation assertionをfailさせずproofにも数えず、product callから要求もしない。

Pack済みtarballでも同じfilesystem suiteを反復し、test専用instrumentationをproduction exportへ含めない。

Package testはpacked `package.json`、exactな`bin` mapping、`verify:package`がassertする2つのrequired entry
point、すなわち`dist/public/index.html`と`dist/cli.mjs`を、製品定義の
size/record-count上限なしで扱う。Nuxtとtsdownが直前にproduceしたsibling build outputは再検証しない。
Validate対象のstatic-asset manifest、CSP-hash record、asset単位digest ledgerは存在しない。Nuxtの
root-absolute assetは全client routeでdevframe hostを通じてそのままbootする。Build-cleanup caseは
`scripts/clean-build-output.mjs`がroot-resolvedなpackage所有の`.output/`、`dist/` treeだけを除去することを
証明し、negative fixtureはmissingまたはnon-regularなrequired entry pointがpublish前にgateをfailさせることを
証明する。これらpackage所有checkはいずれもcustomization validity/lint resultを報告しない。

Diagnostic-behavior testはorder-only aggregation — dedup passなしの固定phase/source/path/rule/code/occurrence順で、正当に繰り返されるrecord — extraction失敗は`(file, kind)`につき1 recordで、1 fileの2つのkindがそれぞれfailし得る — がすべてpublishされること — を扱う。
Diagnosticのretention/serialization中のfailureは単一fileに限定されない。Attemptをfailさせ、result/generationをpublishせず、
failしたrequestのmessageを持つordinary errorとして報告する。
Multi-Source caseではA/Bのentry-failure pairが共存し、B successがAを保持し、A successだけがAのpairをclearし、
A再failureがAのpairだけを置換し、Global disableがGlobal pairだけを除去することを証明する。Client起因API errorを反復してもretained
diagnostic countを増やさない。
同じfixtureでclosedな`file | source` scope unionも検証する。File scopeは`sourceId`と
`sourceRelativePath`を必須とし、source scopeは`sourceId`を必須にして`sourceRelativePath`を禁止する。
Pathlessなscopeは存在せず、source scopeのdiagnosticが表示、orderingのためにpathを捏造してはならない。

## Manual accessibility review

[SC-008 accessibility受入contract](contracts/accessibility-acceptance.ja.md)を規範とする。Automated E2E合格後、packed
release candidateに対してcriterion固有の全`AUTO-*` checkを合格させてから全`MANUAL-*` checkを実行し、完全なdiff、
packed tarballのfile list、render済みpacked interfaceに対して全`REVIEW-*` rationaleを再確認する。Axeのseverity resultだけでは
SC-008を立証できない。Contractはsamplingしない完全なexecution matrixを固定する。

1. Keyboardだけでlaunch/URL follow、filter、file open/close、skill rowのlinkからの比較openとcompared file/copy切替、
   Global consent open、Global enable/disable、rescan、inventory returnを行う。
2. Visible focus、logical focus order、skip/navigation landmark、unique label、status announcement、
   error/next-step association、generation replacement時にfocusを失わないことを確認する。
3. 3つのpin済みOS/engine/AT profile、5つの正確なviewport/orientation/zoom/text-spacing profile、
   3つのUI mode、8つのworkflow/state scenario、3つのinput profileの全contract cellを実行する。Native
   forced-colorsに関する2つの明示的N/A platform cellと、row固有の各cell N/Aを個別に記録する。
4. Tool、state、severity、selection、diffを色だけで示していないことを確認する。
5. `validation.md`と`validation.ja.md`へ、Level A/AA全55行の確定state、完全な必須check ID、IDごとのevidence/result、
   reviewer、各Not-applicable revalidation note、および全manual matrix cellのkey付きresultを記録する。0件ではないApplicable
   row数をdenominatorとして記録し、Applicable rowのfailureが0件であること、4つのkeyboard workflow outcomeも記録する。
   Applicableな1行のfailure、根拠のないrationale、check ID/cellの欠落、未完了keyboard workflow、未検査matrix cellの
   いずれかがあれば、severityにかかわらずSC-008は失敗する。

## Release package検証

全release evidence/remediation editを確定した後、次を順に再実行する。
いずれのcommandもtreeを書き換えてはならない。

```bash
pnpm outdated
pnpm run format:check
pnpm run test:package
git diff --check
```

`pnpm outdated`を見てblind upgradeしない。新しいprereleaseや非互換TypeScript/Vite majorは
[research.ja.md](research.ja.md)で文書化した最新互換versionを置換しない。Tarballがnpmの`package.json`と
exact `package.json.files` entryの`dist`、`README.md`、`README.ja.md`、`LICENSE`だけを含むこと、および展開した
`dist/**` treeが`verify:package`の検証する2つのentry point、すなわち`dist/public/index.html`と`dist/cli.mjs`
を含むことをassertする。残りの`dist` contentはNuxt/tsdownのbuild outputであり、
product manifestで再列挙しない。Exact `bin` mappingと
`main`/`module`/`exports`不在、license notice、保持されたexact shebang、
公開README pairを確認する。Directなproduction dependencyは正確に9件、`devframe`、`gunshi`、`h3`、
`jsonc-parser`、`open`、`smol-toml`、`vfile`、`vfile-matter`、`yaml`とする。devframeと`open`のtransitive treeはそれぞれのpackageと
lockfileが所有する。

再実行すべきhost-securityやHTTP-API-router contract stepは存在しない。devframeがhosting policy
を所有するため、productはper-session token、product所有のOrigin check、hand-written routerを
持たない。Transport protectionはdevframe hostのloopback限定`localhost` bindであり、devframe
authenticationは無効化されており、unexpectedなsession-API
failureはreal errorをrequesting clientへ返す。Unauthenticatedなloopback hostのresidual exposure、
すなわち他のlocal processとDNS rebinding経由のmalicious web pageは、documented limitationである。

Release recordでは、acceptしたdependencyまたは破壊的なpublic-contract判断ごとにmigration impactを記録する。
以前の公開package、public contract、永続profile、user data、影響を受けるconsumerがないことを確認した場合だけ、
initial baselineをno impactとして記録する。それ以外では必要なconsumer action、compatibility/support window、
rollback/support pathを記録する。Evidenceが欠落するか一方の言語だけならrelease gateをfailureとする。

承認済みproduction dependency setを`package.json`と`pnpm-lock.yaml` closureからassertする。すなわちdirect
dependency 9 件、`devframe`、`gunshi`、`h3`、`jsonc-parser`、`open`、`smol-toml`、`vfile`、`vfile-matter`、`yaml`を正確にassertし、graph変更は
dependency決定が明示的に見直されるまでgateをfailさせる。各resolved versionとそのintegrity hashはcommit済み
lockfileが所有し、全production packageのpayload byteをpinするのはこのlockfileである。
Exactな宣言済み
Package-manager生成`.bin` symlinkと`.cmd`/`.ps1` shimは、exactな宣言済み`package.json.bin` targetへmapしてargvをforwardする。生成HTML shell、CSS、JSON file、documentation、license fileは
declarativeかつnon-executableなpayload artifactとして受理し、HTMLが参照するbootstrap scriptはJavaScript executable codeの
ままとする。FR-038はproject-authored executable application codeと公開/install済みproductを対象とし、third-party
development/test toolingはその公開boundary外で別にauditする。payloadごとのcontent scan — platform selector、native/binary/Wasm magic、native build
source/metadata、non-Node shebang、shell helper — と、scripts-disabled/network-disabled
installの各run、OS別shim audit、およびdependency単位のversion/integrity hash assertionは
scope外とする。commit済みlockfileが各resolved versionとintegrity hashを既にpinしており、
それらをtestで再記述してもlockfileを二重化するだけであり、install時のenforcementは
package managerが所有するからである。

Launch testは、browser attempt前に表示されるorigin line、`--no-open`でbrowser-helper child processが
0件であること、automatic openingがdisabled、unsupported、failedでもinspectionが利用可能なままであることを扱う。
Port/host resolutionはdevframe所有、automatic openingとnegatableな`--open` flagは`open` packageを通じた
product所有であり、testはinspection由来の
content、path、authored valueがそのopenerへ到達しないことを証明する。
Gunshiのbindしないhelp/version、strict unknown-option拒否、明示的なpositional/rest拒否、固定されnonzero
validation failure、await済みcompletionに加え、defaultでcaptureしたexact `process.cwd()`と、
反復指定をparserのlast valueへ解決する`--root`、すなわちabsolute optionをそのまま保持すること、relative optionをcaptureした
呼び出しdirectoryに対してresolveすること、`chdir`なし、明示的なempty `--root` valueをsession/browser
作成前に固定actionableかつsource-value-freeなstartup errorでrejectすること、およびvalueの欠落を
Gunshiのtyped argument validationでrejectすることも扱う。
Testはさらに、automatic openingがOS default handlerへ委譲するだけでversionを
certifyできないことも証明する。Release recordはpin済みPlaywright revisionを使用し、`--no-open`と表示URLをmanual certified-browser
fallbackとする。Documentation gateはplanning setを公開せず、repository内の全英日document
pairを別に検証する。同じtarballを[research.ja.md](research.ja.md)で定義した正確な6つのlower-bound OS/architecture
certification jobでinstall/launchし、Node.js filesystem suiteに合格させる。Node.js 24.18.0はdevelopment/build
baselineである。これら有限sampleは、宣言済みNode.js 24/26 compatibility range内の全patch releaseをCIで網羅的に
実行したとは主張せず、そのruntime contractも狭めない。最後にcomplete diffをreviewし、untested branch、secret exposure、古いofficial-path assumption、
accidental source mutation、unrelated changeがないことを確認する。その結果生じたrepository remediationごとに、build、frozen install、
lint、typecheck、unit、contract、integration、security、package、performance、browser、coverage、documentation、lower-bound candidate
checkからなるcomplete applicable automated matrixを再実行し、影響するcandidate/profile/fixture/human/manual evidence setを再生成し、
concernが0件になるまでcomplete-diff/tarball reviewを反復する。次にbilingual Constitution Checkをsole planned validation-only editとして
記録しtreeをfreezeする。そのfrozen tree/candidateへ全applicable automated gateを再実行し、documentation gateと`git diff --check`で終えてからreleaseをapproveする。Final outcomeはrepository evidence
fileをeditせずexternal release/pull-request check logへcaptureする。その後repositoryをeditした場合は全outcome/approvalを無効にし、
Constitution/final-gate sequence前にremediation、candidate/study/evidence digest再validation、applicable gate再実行、complete-diff reviewへ戻る。

T917完了後、final-releaseの`pnpm run test:package` gateは新規pack済みtarballをisolated
fixtureへinstallし、`npx --no-install agent-customization-inspector --no-open`をspawnし、valid
loopback launch URLを観測してprocessを終了し、起動したCLIがbrowser-helper childをspawnしなかった
ことをassertしなければならない。Tarball/mapping inspectionだけではlaunch testにならない。
