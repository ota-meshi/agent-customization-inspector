# Quickstartと検証guide

[English](quickstart.md)

このguideは、このfeatureで説明した実装のend-to-end acceptance pathである。対応する実装taskがnamed
script/fixtureを追加するとcommandが実行可能になる。Current scaffoldが既にそれらを持つとは主張しない。

## 前提条件

- 正確な`package.json` compatibility contract `^24.11.0 || ^26.0.0`
  （`>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`）を満たすNode.js。Development/build基準は
  active LTSのNode.js
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

期待結果: 両commandがchecked-in package declarationを満たす。
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
  そうでないときにsystemの`xdg-open`へfallbackする。生成HTML shell、CSS、JSON file、必須documentation/license fileはdeclarativeかつnon-executableなartifactとする。Directなproduction dependencyは正確に11件、`devframe`、`env-editor`、`gunshi`、`h3`、`open`、`smol-toml`、`strip-json-comments`、`vfile`、`vfile-matter`、`which`、`yaml`とする。devframeと`open`のtransitive treeはそれぞれのpackageとlockfileが所有する。
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

`--port <number>`はdevframeのdefaultに代えて希望portを述べ、`--port 0`は空きportの自動選択を
求める。希望はdefaultと同じ方法で解決される — 塞がっていればやはり別portへ移る — ため、
bindされたportを述べる場所はprintされたURLだけである。誰かが自分用に確保しているportを
奪ってはならない起動には`--port 0`を使う。suiteも同じ理由でその形で起動する
（AGENTS.md § Agent-started process policy）。

`--inspect-personal-setup`は、4つのmember root — 各tool自身の設定ディレクトリと共有agent home — に
ある文書化済みカスタマイズfileもinspectする。consent pageのcheckboxが認可するのと同じreadを、commandで
述べる形である。このflagそのものがconfirmationである。CLIはstartupで1回captureしたimmutableなGlobal
root inputからpreviewを構築して確認し、batchのsettleを待つ。したがってprintされたURLが現れる時点で、
そのconfirmationが生んだものは既にcommit済みである。Rootを1つ以上admitした場合はGlobal generationと
そのSourceがinventoryに載る。4件すべてがrejectされた場合、settleしたdispositionは`active-no-job`で
あり、Sourceもgenerationも存在せず、各memberの`failureCode`が説明するcontrol stateだけが残る。Flagもpreview requestも環境プロパティやhome directoryを
再captureしない。各toolがどう終わったか、何が除外されたままかは、これまでどおりconsent pageにある。
Flagなしのlaunchは選択されたrepositoryの外を一切readせず、pageはディレクトリの割り出しを申し出る。

```bash
pnpm start --no-open --inspect-personal-setup
```

決定論的なfixture repository — suiteがassertする対象と同一の、
`tests/fixtures/repositories/build-fixtures.ts`のbuilderが書き出すtree — に対してinspectorを
確認するには、1つのscriptが指名されたfixtureをgit-ignoredな`.tmp/fixtures/` treeの下に
再構築し、同じpackaged CLIで配信する。

```bash
pnpm run start:fixture all-instructions --no-open
```

第1引数はfixture名（省略時は`all`。これはすべての`all-*` treeを1つのrootに構築し、1回のlaunchで3つのinventory全部を配信する。未知の名前は利用可能な一覧を表示する）で、それ以降は
すべてCLIへそのまま渡す。CLI自身のoptionの前でも名前は省略可能である。`-`で始まる引数は
そのoptionであるため、`pnpm run start:fixture --inspect-personal-setup`はその名前のfixtureを
探すのではなく、defaultのtreeをそのoptionつきで配信する。Launchごとにそのfixtureの前回treeを置き換えるため、閲覧中の手編集が
次回へ漏れることはなく、treeはその後もinspection用にdisk上へ残る。Launcherは`--root`でrootを
選択する。呼び出し`cwd`によるselectionを確認するには、launchが残したtreeへ移動してそこから
CLIを起動する。

```bash
cd .tmp/fixtures/all-instructions
node ../../../dist/cli.mjs --no-open
```

CLIは呼び出し時の`process.cwd()`を1回だけcaptureする。省略時はそのexact stringを使う。`--root`は
受理し（反復指定はparserのlast valueへ解決）、absolute optionはそのまま保持し、relative optionはcaptureした呼び出しdirectoryに対してresolveする。
明示的なempty valueはsessionまたはbrowser attemptより前に固定actionableかつsource-value-freeなoutputを出して終了し、
valueの欠落は同じboundaryでGunshiのtyped argument validationによりrejectされる。Editor launcherの探索と
session作成より前に、CLIは文書化された3つのtool-home環境プロパティを固定順で1回ずつcaptureし、
`node:os.homedir()`を無条件で1回callする。そのretained captureをlauncher lookupから除外するeligibleな
personal rootとすべてのpreviewに使う。Selectionは`process.chdir()`を呼ばず、startupのinput capture、
classification、またはdisplay escapeのfailureはsessionやbrowserが存在する前にlaunchを終了させ、
sessionまたはsession-API errorではなくactionableなmessageを出す。

期待結果:

- Hostがbrowser attempt前にlocalな`http://localhost:<port>/` originを正確に1回表示し、non-loopback addressへ
  bindしない。表示URLはplainなoriginであり、per-session token、fragment、その他のsecretを含まない。
  CLIのnegatableなproduct flagである`--no-open`ではbrowserを開かず、browser-helper child processも作らない。
- Browser表示のRepository source rootはlaunchしたfixture tree自身。
- 現在のscan requestについて、queued、active phase名、complete、partial、またはfailedを明示するstatusを画面に
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
  check、hand-written routerを追加せず、session identity・credential・inspectedな値をbrowser storage/cookieへ保存しない。保存されるのはFR-044の2つのpresentation preference（配色とopen先）だけで、どちらもinspectedな値を持たない。Inspector実行中は
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
公開する。Automatic browser openingはproductがstartup openerを通じて所有する: launch lineの後、
macOSではまず、起動中のChromium系browserが既に表示originを開いているsession tabのfocusを試み
（固定のprocess一覧probeと、OSの`osascript` automation hostで実行する固定のtab再利用script）、
それ以外の場合は表示origin付きで`open`の固定OS helperをspawnし、devframeのbundled openerは
無効化されてproductのopenerだけが動く。このfixed startup openingがinitial releaseで
readerが明示的に要求するopen-in-editorと並ぶ、許可するproductのchild-process surfaceである。
Startup openerのprocessは固定の引数と表示originだけを受け取る。Open-in-editor requestは
それに加えて正確に1つの値 — readerが開くよう求めたcommitted fileのabsolute path、それがこの機能そのもの —
を渡し、authored contentやuser-supplied commandは渡さない。spawnされるどのprocessも
launch environmentを変更なしで継承する — productはそこへ
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
Openの成功はcompatibility evidenceではない。Deterministicなcertificationでは`--no-open`を用い、印字されたURLをpin済みPlaywright
revisionのいずれかへ貼り付ける。First-use評価でもinspectorへは印字URLで到達する。それはsessionへ与える
guidanceの一部であり、2分のtimerをpauseもrestartもせず、それ自体をSC-001の不成功ともしない。完了を妨げる
不能や中断は不成功である。

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
pnpm run test:security
pnpm run test:package
pnpm run test:docs
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
  trafficを発生させ得るためFR-022のplatform/environment limitationとして別に記録する。Product所有の
  startup browser opening — macOSでは固定のtab再利用attemptを`open` packageのhelperの前段に置く —
  がそのchild processへ渡すのは固定の引数と表示済みoriginだけであり、inspection由来のcontent/path、authored value、
  user-supplied commandを渡さず、spawnされるどのprocessも、productがinspection由来の値を書き込まないlaunch environmentを継承する。
  実行すべきhost-securityやHTTP-router contract suiteは存在しない。Per-session token、Origin check、hand-written routerは
  削除済みで、protectionはloopback限定の`localhost` bindだけであり、unexpectedなsession-API failureはreal errorをrequesting clientへ
  そのままpropagateし、sessionは利用可能なままとする。
- Phase 3 checkpointのpackage testは、無関係なworking directoryから`dist/cli.mjs`をlaunchし、
  packaged shell、closed manifest field、printed-URL fallback、調査対象fixtureが変更されないこと、
  graceful shutdownを検証する。これはpackaged pathだけのisolationであり、現行gateはtarballをinstallせず、
  installed package linkもinvokeしない。T917は同じnon-installing pathをcompleteなpacked-entry/default-browser/helper/environment
  instrumentationまで拡張する。T1051の`certify-lower-bounds` matrixが、build jobの1つのtarballを新しい
  directoryへinstallし、そのpackage linkを`npx --no-install`で解決して、install済みcopyをlaunchする責務を持つ。
  Production-graph testは承認済みのdirect dependency 11 件、すなわち
  `devframe`、`env-editor`、`gunshi`、`h3`、`open`、`smol-toml`、`strip-json-comments`、`vfile`、`vfile-matter`、`which`、`yaml`を正確にassertし（resolved versionとintegrity hashは
  commit済み`pnpm-lock.yaml`が所有し続ける）、negative packaging fixtureは、
  missingまたはnon-regularなrequired entry pointがpublish前に`verify:package`をfailさせることを証明する。
- Documentation testはこのrepository自身のartifactを読み、それらが一致することを証明する。どちらかのquickstartが
  名指す`pnpm run` commandはすべて`package.json`が宣言するscriptであり、宣言されたCI jobはすべて
  `.github/workflows/ci.yml`に記載順で存在し、Normative Requirement Traceability matrixは全FR/QR/SC rowを
  持ち宣言済みtask IDをすべて名指し、各taskの英日entryは同じnormative identifierと同じowned file pathを持つ。
  Taskが引用するpathのうちここで何にも解決しないものはcontent literal — 被検査location、package名、glob形 —
  であり、そのように読む。
- Performance suiteはpackaged CLI（先にbuildする）に対して、変更しないmanifest-bound
  100,000-entry/500-file fixtureへの非gatingなsmoke passを1回実行する。fresh processで、
  automatic scanはpassの外で落ち着かせ、rendered page上でrescanを1回行い、自身のadmissionの
  request IDをstatusとcommitしたgenerationの両方に持つ。fixtureとmanifestのdigestはその前後で
  再計算するため、builderの変更や紛れ込んだfileは、別のrepositoryを黙って測るのではなくpassを
  無効化する。Timingのthresholdは主張しない。別のmachineで測った同じ数値はそのmachineの測定である。
- Browser、contract、manual evidenceが4 user storyすべてを扱い、
  [SC-008の55行matrix](contracts/accessibility-acceptance.ja.md)のApplicableな全行とNot-applicable再確認を満たす。
  Axeのseverity結果だけではpassにならない。

## Contract registry検証

```bash
pnpm exec vitest run --project contract tests/contract/vendor-behaviors
pnpm exec vitest run --project contract tests/contract/runtime-composition
pnpm exec vitest run --project contract tests/contract/inspection-rules
```

上記testはofflineである。Maintainerはupstream drift review時だけ`pnpm run check:official-sources --
--network`を明示実行し、
source checkでnetworkを使えるのはこのcommandだけとする。

確認項目:

1. 全shipped `behaviorId`、`ruleId`、`strategyId`が厳密に1つの所有bilingual contractと対応する
   immutable registryに存在する。全cross-referenceが解決し、recordの`evidence`配列にある全citationが
   引用先のofficial-sources contract rowと相互一致する。明示drift checkはofficial HTTPS hostとexact section
   resolutionを強制する。Recoverableなnetworkまたは実行環境failureは
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
5. Repository、文書化済みUser、consent済みGlobalの表を独立して検証する。FR-015からFR-018またはFR-045が明示しない限り、
   文書化済みUser locationはGlobal read authorityにならず、runtime compositionはInspectorのRepository/Global
   source graphをmergeしない。
6. 出荷済みの`bounded-derived-candidate` ruleは正確に1件であり、自身のvendorの構成読み取り段階が
   展開する。runtime extension pointは存在しない。
   `codex.derived.fallback-basename`である。3種類のfileは
   意図的にこれに含まれない: 所有元skillのbounded companion censusを通じて公開されるskillのsibling
   `agents/openai.yaml`と、plugin root配下のfileである。後者はadmitしたruleが
   名指したdirectory形式のcustomizationであるがゆえに列挙される。いずれもcandidateではないため、
   derivationでもない（contracts/vendors/openai-codex.ja.md § Derived Repository rule、
   contracts/vendors/claude-code.ja.md § Repository vendor behavior）。
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

```bash
pnpm exec playwright test tests/e2e/discovery.spec.ts
pnpm exec playwright test tests/e2e/repository-complete-inventory.spec.ts
```

確認項目:

1. OptionなしではRepository Sourceがcapture済みchild-process `process.cwd()`のexact valueと等しい。Relative/absolute
   `--root`では選択したrootと等しく、process working directoryは変化せず、picker/ancestor searchもない。
2. railが表示するkindを選び、その隣のSource/Tool selectがlistを絞り、1つの検索が名前または
   Source-relative Pathに一致する。いずれもkeyboard/pointerで操作できる（FR-006）。全inventory-file pathまたは安全に
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
pnpm exec playwright test tests/e2e/inspection-safety.spec.ts
pnpm exec playwright test tests/e2e/repository-complete-detail.spec.ts
pnpm exec vitest run --project unit \
  tests/unit/app/api-client.test.ts \
  tests/unit/app/session-view-state.test.ts \
  tests/unit/app/client-data.test.ts
pnpm run test:security
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
   解決されるため値はfieldごとに1件であり、structural metadata comparisonは`(kind, 宣言key)`で対応付け、tool recognitionはtoolごとに宣言の横で比較する。Boundary-sizeのTOML integer、float、date/time valueはJavaScript precision lossなく
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
5. Malformed、binary、unreadable、broken symlink、発見からread前までに消失、cycle、traversalの
   fixtureはactionable safeなper-file Diagnostic（`recognition-parse-failed`、`file-content-binary`、
   `file-unreadable`）を作り、非影響fileはすべて完全なtraversal後の
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

```bash
pnpm exec playwright test tests/e2e/comparison.spec.ts
pnpm exec playwright test tests/e2e/repository-complete-comparison.spec.ts
```

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
   source差を表示する。宣言済みmetadataはsideごとに1つのcanonical serialized documentとして比較し、
   各surfaceがVueで描画するtypedなrecognition rowの横でMonacoがdiffする。このserializationはFR-012が
   定めるparseの提示であり — 異なるsyntaxで書かれた2つのsideを共に読める唯一のspellingである —
   どちらのfileの変換でもない。
4. Monacoとbrowserのcapacityはbrowser engineと実行環境から継承する。Recoverableなeditor computation failureは
   記述された完全なread-only side-by-side sourceを削除せず、actionable diagnosticを示す。
5. Rescan、removal、Global disable、route closeがstale selectionと表示済みdetail stateをclearし、関連する
   全editor/model instanceをdisposeする。
6. Keyboard/screen-reader userがlabel付きcontrolとaccessible diff viewerを使い、focus trapなしでsource
   diffへ入り、navigateし、抜けられる。
7. Packed appがeditor workerをsame-origin static assetからloadし、external requestも`blob:` workerも
   発生させない。
8. `/`、`/global-consent`、各kindの`compare`先頭のcomparison route（`/skills/compare/<family>`、
   `/instructions/compare/<family>`、`/mcp/compare/<family>`、
   `/prompts-and-commands/compare/<family>`、`/agents/compare/<family>`、
   `/plugins/compare/<family>`、`/hooks/compare/<family>`）、各kindのdetail routeのdirect loadが、
   devframe hostが配信する同じroot-absolute assetからbootする。
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
    `GlobalFenceRecoverySnapshot`を返す。Fenceがnullならnormal full `SessionSnapshot`を返すが、recoveryは`globalContentEpoch`、Global controlと
    enable/disable projection、失敗した各toolの自身のcontrol上の`failureCode`、retain済みfailure error、任意のnewly verified
    frozen previewだけを採用し、inspection graphを破棄する。Inventory、Source、file、generation、detail、comparison、editor、authored source、selection、
    filterは復元しない。状態に応じてdisable/join/wait、retry-disable、またはeligibleなGlobal retryを利用できる。
    明示Resume inspection actionは`globalDisableInProgress`がnullの場合だけ表示し、matching sessionを再取得してdefault
    filterのfresh inventory summaryをatomicに構築する。後のdetail/comparison requestはfresh sessionから改めて取得する。

### 4. Global inspectionへのopt-in

opt-in の全体が出荷されています: preview、固定4 memberの確認、memberごとの再スキャン、
same-preview retry、そしてすべてのGlobal結果を再び除去する優先disable barrierです。

```bash
pnpm exec playwright test tests/e2e/global-consent-preview.spec.ts
pnpm exec playwright test tests/e2e/global-consent.spec.ts
pnpm exec playwright test tests/e2e/global-disable.spec.ts
pnpm exec playwright test tests/e2e/global-codex-admission.spec.ts
pnpm exec playwright test tests/e2e/global-claude-admission.spec.ts
pnpm exec vitest run --project unit tests/unit/host/global-consent.test.ts
pnpm exec vitest run --project unit tests/unit/session/coordinator.test.ts
pnpm exec vitest run --project contract tests/contract/http-api-global.test.ts
pnpm exec vitest run --project integration tests/integration/global-boundaries.test.ts
```

Test harnessはisolated fake tool homeを渡し、developerのreal homeを絶対にinspectしない。確認項目:

1. Consent前はproposed rootをproduct自身のfilesystem operationのoperandにせず、previewを`stat`、`realpath`、
   enumeration、file readなしでlexicalに派生する。FR-013が述べる唯一の例外はeditor launcherの探索であり、
   そのoperandはmachine自身の`PATH`と設定済みeditorで、OSがその解決をproposed root経由で行い得る。この探索は
   proposed rootから何もenumerate・read・publishせず、その内側のlauncherをofferしない。Instrumented startup captureは`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`をこの順で正確に
   1回ずつcaptureし、`undefined`だけをabsentとし、`node:os.homedir()`を無条件で正確に1回callすることを
   証明する — 共有agent homeは常にそこから導出される。Active-platformの`node:path.join`は対応する固定suffix
   だけを適用する。同じretained captureをlauncher exclusionとすべてのpreviewに使い、preview requestも
   `--inspect-personal-setup`もprocess inputを再読込しない。`HOME`/`USERPROFILE`の直接選択もexistence checkも
   行わない。Capture、classification、またはdisplay escapeのthrowはlauncher探索、session作成、browser
   attemptより前にstartupをfailさせる。
2. Consent viewが正確なCopilot/Claude/Codex/共有agent home lexical root、input state、除外を表示し、
   read scopeはpatternごとのpath表示ではなく平易な言葉で説明する。previewが束縛する2つのversionは
   どちらも表示しない。読み手はどちらに対しても行動できず、参照先もなく、それらが守るversion不一致は
   previewが画面にある間には起こりえない — 値はbuildの定数であり、異なるbuildは確認できるpreviewを
   持たないためである。確認は`allowlistVersion`を送信し、hostは一致しないものを拒否する。対はそこに属する。Frozen internal previewは各exact raw `lexicalRoot` stringを別に保持する。
   `displayRoot`はone-way escaped stringで、decodeしてread authorityにしない。Completeなpreview objectの構築前に
   起きたfailureはreal errorを返し、prior current previewを置き換えない。DTO構築またはtransport serializationは
   completeなpreviewがcurrentになった後にfailし得る。その場合はordinary request errorとなり、新しく作成したpreviewが
   retainedされたままになり得る。どちらのfailureもauthorityやjobを作らず、`scanRequestId`を発行しない。
3. Opt-in後は文書化されたmember candidateだけが0から4つの別識別member Global Sourceに表示される。
   Copilot、Claude、Codexごとに最大1つで、各Sourceは正確に1つのrootを持つ。Initial/retry transactionでadmitされた
   全Sourceは、観測可能なper-tool commitなしに1つのatomicなGlobal generationへ一緒に現れる — enable commitは
   Repositoryのviewとstateに触れずにGlobal sequenceをgeneration 1で作成する。同じrowの2つのconsent済みhomeのreadableなfileを比較し
   — comparisonは1つのSource familyの内側に留まるため、Repository fileがそのpairのsideとして提示されることはない
   （spec.md § Clarifications Session 2026-08-28）— rootを統合せずsemanticな判定を行わず、それぞれが独立して識別された
   owning SourceとSource-relative Pathの下に残ることを検証する。
4. Present-empty、relative、invalidのenv overrideは固定preview state/messageを使い、retained Diagnosticを
   作らずdefaultへ黙ってfallbackしない。設定がabsentの場合だけdefaultを使う。Consent済みrootがmissingまたは
   readableなdirectoryでない場合は、他のtoolのcommitを妨げずそのtoolをabsentまたはfailedとして記録する。
   Eligibleなabsolute rootは通常のhome外でもeligibleであり、その場所だけを理由にrejectしたりconsent前I/O authorityを
   与えたりしない。All-invalid preview、またはconsent後に4 rootすべてがabsentと判明するeligible previewも
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
   Previewにeligibleとinvalidのentryが混在してもrequest側tool selectorは持たない。Initial enableは固定の
   `confirmedTools: [copilot, claude, codex, agents]`を導出して4つすべてをevaluateする。Responseのdisjointな
   `acceptedTools`/`rejectedTools`のunionは4つすべてと一致する。`tools` keyなどselector-shaped inputはrejectする。
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
10. Initial activationで4 memberすべてがlexicalまたはconsent後root validationでdeterministicallyにrejectされた場合、enableはempty
    `acceptedTools`、4つすべての`rejectedTools`、Source/job/generation/stale entryなしの`active-no-job`を返す。
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

### SC-001とSC-006のfirst-use評価

20件の独立した自律agent sessionを、release candidateについて1回実施する。各sessionにはall-kind
fixtureの自分の複製とguidanceだけを渡し、このworking treeの外で開始させ、session自身にInspectorを
起動させて、discovery、inspection、comparison、personal-setup consentを実施させる。Runの実施方法、sessionへ言ってよいこと、記録するものは
[`tests/usability/sc001-sc006-study-kit.ja.md`](../../tests/usability/sc001-sc006-study-kit.ja.md)
にある。Sessionが読むtask prompt、guidance、response form、ground truth、scoring rubricは
`tests/usability/sc001-sc006-study-inputs/`配下にある。

Run の前に各sessionへ自分のfolderを用意する。そのfolderから`npx --no-install`が解決する場所に
packしたrelease candidateを入れ、`tests/fixtures/repositories/build-fixtures.ts`がそのfolderの
`repository/`としてall-kind fixtureをその場所に構築し、`tests/fixtures/global-homes/build-fixtures.ts`が
自分だけの`HOME`の下に4つのpersonal-setup homeを構築する。1つの共有hostではrunにならない。
20 sessionは20回の起動と20個のconsent状態である。全sessionを`validation.md`と`validation.ja.md`へ
記録する。4つのworkflow outcome、2つの計測区間、safetyの観測を、除外も置換もせず記録し、runが
agent駆動であったことと、どのmodelで走ったかも記録する。


### Performance smoke pass

このreleaseではscan timingもinteraction latencyもthresholdを主張しない。実行するのは、
`tests/performance/sc002-fixture-manifest.json`がversionとcanonical SHA-256で束縛する
deterministicな100,000-entry/500-match fixtureに対する非gatingのpass 1回である。Validatorは
manifestの宣言的ruleを展開し、buildしたtreeを走査し、全entryとcontent digestを再計算する。
したがってbuilderの変更や紛れ込んだfileは、別のrepositoryを黙って測るのではなくpassを無効化する。
実行:

```bash
pnpm run test:performance
```

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
UTF-8 replacement decoding、unreadable file（broken symbolic linkを含む）のfixtureと、全failure
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
完全なreadable sourceは表示およびcomparison-eligibleのまま残る。各fixtureは、affected itemが問題解決に十分なSourceとsource-relative path contextを保持し、同じscanが
完全な非影響fileをすべてpublishすることを証明する。Source rootがmissingまたはunreadableな場合は代わりにそのSourceの
scanがsource-scopedな`root-unreadable` diagnosticとともにfailし、sessionは利用可能なままとする。

Coordinator testはslot、queue capacity、scheduling deadlineを定義せず、deterministic serialization、sequence別の
generation atomicity、cancellation、disable/shutdown/supersession時のauthority revoke、late-result discardを保つ。
Independent-sequence fixtureは、Repository rescanのcommitがRepositoryのviewだけをinvalidateしてcommit済みGlobal
detail/comparison viewを有効なまま残すこと、Global rescanも同様にcommit済みRepository viewを有効なまま残すこと、
Global disableがgenerationを一切commitせずGlobal sequenceを破棄することを証明する。Session-loss/response-guard
contractはcapacity上限ではなくacceptance criterionであり、productはcontinuously idleなpageに
process-loss detection deadlineを設定しない。Testは、processを終了させる
out-of-memoryからのrecoveryや、uncancellableなNode.js/kernel I/Oの
physical cancellationは保証しない。

Traversal-plan call traceはさらに、Repository traversalがcompile済みimmutable planを実行し、Global exact targetがtool-home
rootをopenせず、fixed instruction-subtree walkがそのsubtreeだけをopenし、隣接Global pathへのI/Oが0であることを証明する。
Path-spelling fixtureはexact raw `Dirent.name` segmentが唯一の綴りであることを証明する。Filesystem operationはplanが保持した
segmentを使い、publicなSource-relative Pathはそのsegmentを`/`でjoinしたものであり、targeted fixed pathはimmutable registry target
spellingを唯一のI/O operandとしかつ公開segmentとするため、NFD-only nameはraw segmentでreadされそのraw綴りのまま公開される。Hard linkは
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
release candidateに対してcriterion固有の全`AUTO-*` checkを実行し、完全なdiff、packed tarballのfile list、
render済みpacked interfaceに対して全`REVIEW-*` rationaleを再確認し、全`MANUAL-*` IDは理由とともに未実行
として記録する。このreleaseがassertするのはautomated layerであり、manual matrixは3つのOSと3つのscreen
readerなしには実行できない。Axeのseverity resultだけでは
SC-008を立証できない。Contractはsamplingしない完全なexecution matrixを固定する。

1. Keyboardだけでlaunch/URL follow、filter、file open/close、skill rowのlinkからの比較openとcompared file/copy切替、
   Global consent open、Global enable/disable、rescan、inventory returnを行う。
2. Visible focus、logical focus order、skip/navigation landmark、unique label、status announcement、
   error/next-step association、generation replacement時にfocusを失わないことを確認する。
3. `MANUAL-*` cellは1つも実行しない。このreleaseはautomated layerをassertし、manual matrixはsamplingではなく
   未実行として記録する。
4. Tool、state、severity、selection、diffを色だけで示していないことを確認する。
5. `validation.md`と`validation.ja.md`へ、Level A/AA全55行の確定state、完全な必須check ID、IDごとのevidence/result、
   reviewer、各Not-applicable revalidation noteを記録し、`MANUAL-*` IDはすべて未実行として記録する。0件ではないApplicable
   row数をdenominatorとして記録し、Applicable rowのfailureが0件であること、4つのkeyboard workflow outcomeも記録する。
   Applicableな1行のfailure、根拠のないrationale、check IDの欠落、未完了keyboard workflowの
   いずれかがあれば、severityにかかわらずSC-008は失敗する。

## Release package検証

全release evidence/remediation editを確定した後、次を順に再実行する。
いずれのcommandもtreeを書き換えてはならない。

```bash
pnpm outdated
pnpm run format:check
pnpm run test:package
pnpm run test:docs
git diff --check
```

`pnpm outdated`を見てblind upgradeしない。新しいprereleaseや非互換TypeScript/Vite majorは
[research.ja.md](research.ja.md)で文書化した最新互換versionを置換しない。Tarballがnpmの`package.json`と
exact `package.json.files` entryの`dist`、`docs/images`、`README.md`、`README.ja.md`、`LICENSE`だけを含むこと、および展開した
`dist/**` treeが`verify:package`の検証する2つのentry point、すなわち`dist/public/index.html`と`dist/cli.mjs`
を含むことをassertする。残りの`dist` contentはNuxt/tsdownのbuild outputであり、
product manifestで再列挙しない。Exact `bin` mappingと
`main`/`module`/`exports`不在、license notice、保持されたexact shebang、
公開README pairを確認する。Directなproduction dependencyは正確に11件、`devframe`、`env-editor`、`gunshi`、`h3`、`open`、`smol-toml`、`strip-json-comments`、`vfile`、`vfile-matter`、`which`、`yaml`とする。devframeと`open`のtransitive treeはそれぞれのpackageと
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
dependency 11 件、`devframe`、`env-editor`、`gunshi`、`h3`、`open`、`smol-toml`、`strip-json-comments`、`vfile`、`vfile-matter`、`which`、`yaml`を正確にassertし、graph変更は
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

Launch testは、browser attempt前に表示されるorigin line、`--no-open`でopenerのchild processが
0件であること、automatic openingがdisabled、unsupported、failedでもinspectionが利用可能なままであることを扱う。
Port/host resolutionはdevframe所有、automatic openingとnegatableな`--open` flagはstartup opener —
macOSのChromium tab再利用を`open` packageのhelperの前段に置く — を通じた
product所有であり、testはinspection由来の
content、path、authored valueがそのopenerへ到達しないことを証明する。
Gunshiのbindしないhelp/version、strict unknown-option拒否、明示的なpositional/rest拒否、固定されnonzero
validation failure、await済みcompletionに加え、defaultでcaptureしたexact `process.cwd()`と、
反復指定をparserのlast valueへ解決する`--root`、すなわちabsolute optionをそのまま保持すること、relative optionをcaptureした
呼び出しdirectoryに対してresolveすること、`chdir`なし、明示的なempty `--root` valueをsession/browser
作成前に固定actionableかつsource-value-freeなstartup errorでrejectすること、およびvalueの欠落を
Gunshiのtyped argument validationでrejectすること、省略可能な`--port`の希望がparseされたまま
hostへ届くこと — 0を含む。0はdevframeに空きportの自動選択を求める値だからである — と、
省略時はdevframe自身のdefaultが残ることも扱う。
Testはさらに、automatic openingがOS default handlerへ委譲するだけでversionを
certifyできないことも証明する。Release recordはpin済みPlaywright revisionを使用し、`--no-open`と表示URLをmanual certified-browser
fallbackとする。Documentation gateはplanning setを公開せず、repository内の全英日document
pairを別に検証する。同じtarballを[research.ja.md](research.ja.md)で定義した正確な6つのlower-bound OS/architecture
certification jobでinstall/launchし、Node.js filesystem suiteに合格させる。Active LTSのNode.jsがdevelopment/build
baselineである。これら有限sampleは、宣言済みNode.js 24/26 compatibility range内の全patch releaseをCIで網羅的に
実行したとは主張せず、そのruntime contractも狭めない。最後にcomplete diffをreviewし、untested branch、secret exposure、古いofficial-path assumption、
accidental source mutation、unrelated changeがないことを確認する。その結果生じたrepository remediationごとに、build、frozen install、
lint、typecheck、unit、contract、integration、security、package、performance、browser、coverage、documentation、lower-bound candidate
checkからなるcomplete applicable automated matrixを再実行し、影響するcandidate・profile・fixtureのevidence setを再生成し、
concernが0件になるまでcomplete-diff/tarball reviewを反復する。次にbilingual Constitution Checkをsole planned validation-only editとして
記録しtreeをfreezeする。そのfrozen tree/candidateへ全applicable automated gateを再実行し、documentation gateと`git diff --check`で終えてからreleaseをapproveする。Final outcomeはrepository evidence
fileをeditせずexternal release/pull-request check logへcaptureする。その後repositoryをeditした場合は全outcome/approvalを無効にし、
Constitution/final-gate sequence前にremediation、candidate/study/evidence digest再validation、applicable gate再実行、complete-diff reviewへ戻る。

installしたtarballのlaunchはCIのものである。`.github/workflows/ci.yml`のlower-bound jobの
`Launch the packed tarball` stepが、新規pack済みtarballを新しいdirectoryへinstallし、
`npx --no-install agent-customization-inspector --help`でbinを解決したうえで、installした
packageに対して`scripts/check-installed-launch.mjs`を実行する。このscriptはその`bin`が名指す
fileを`--no-open --port 0`で起動し、1行のloopback launch lineを観測し、そこでpackaged shellを
fetchし、processを終了する。`pnpm run test:package`は無関係なworking directoryから`dist/cli.mjs`
を実行し、packed manifest、launch line、配信されるshell、fixtureが変更されないこと、graceful
shutdownをassertする。tarballはinstallしない。installにはnetworkが要り、package gateは意図して
それなしで行うからである（`tests/package/npx-launch.test.ts` § scope note）。Tarball/mapping
inspectionだけでは、どちらの経路でもlaunch testにならない。
