# Phase 0 調査: エージェントカスタマイズの調査

[English](research.md)

**調査日**: 2026-07-16、最終再確認 2026-07-22
**対象**: 参照architecture、現行互換toolchain、安全なlocal host設計、安全なparseとliteral表示、source/metadata比較、
実行環境に従うscan、公式customization path surface

## 1. Package architecture

**決定**: 全production sourceを`src/`配下に置き（browser SPAは`src/app/`、環境非依存の
serializable contractは`src/shared/`、Node専用CLI/host/inspection codeは`src/server/`）、`tests/`と
1つの`dist/`を持つ公開可能なESM packageを1つ使用する。Client buildはNuxt、Node CLI bundleはtsdownが所有する。
Pure Node.jsの`src/server/inspection/` directoryが調査対象sourceのenumeration/readを全て所有し、CLIとともに
bundleする。Typed inert DTOだけをbrowserへ渡す。
Project-authored executable application codeはすべてJavaScript/TypeScriptとする。Project/dependency package payload内の
executable codeはJavaScriptだけとし — 唯一の記録済みFR-038 closure例外は`open` packageのvendoredな
POSIX shell `xdg-open`である（§ 3） — generated HTML/CSS、JSON manifest、documentation、licenseはdeclarative artifact
として許可する。Package-manager生成`.bin` symlink/`.cmd`/`.ps1` launcherはpayload外interoperability metadataとして
別のclosed auditを受ける。Third-party development/test toolingは別にpin/auditするが、
FR-038のpublished application codeには含めない。

**理由**: UIとCLIは1つのproductを形成し、1つのrelease versionを共有し、すべての`npx`起動で両方が
必要になる。単一packageはinstall/releaseをatomicに保ち、`src/app`とNode host側の境界（`src/shared`は
環境非依存のcontractだけを持つ）はbrowser codeが
filesystem accessを得ることを防ぐ。Build orchestrationはpackage所有output treeだけをcleanし、Nuxtに標準
browser applicationを`dist/public`へ直接出力させ（`nitro.output.publicDir`）、tsdownに
CLI entryとcode-split chunkを`dist/`へ直接出力させる。Staging copy stepもoutput-manifest stepも存在しない
（シンプルな実装の方針）: buildは正確にclean → `nuxt build` → `tsdown`であり、devframe hostがNuxt所有の
`dist/public` treeを直接配信し（§ 8）、`verify:package` gateは必須の2 package entryだけをassertする（§ 2）。
`package.json.bin`はpackaged `dist/cli.mjs`を直接指す。同時に配布される
artifact同士をuser runtimeで相互検証してはならない（憲章原則I）ため、別のbootstrap wrapperは存在しない。
Startup処理の実効capacityはNode.js、OS、実行環境に従い、product独自の
byte数・item数制限を設けない。
`src/server/cli.ts` entryはBOMなし、LF終端の正確な先頭行`#!/usr/bin/env node`で始め、tsdownがbundleでそれを
保持する。Release時のrepairではなくpackage contractとする。

Cross-platform CIはmacOS、Linux、Windowsで同じNode.js filesystem integration caseを実行する。
Published package自体はplatform固有artifactを含まない。

**検討した代案**:

- UI/core/CLI monorepoは、componentが同時releaseされ、独立consumerが存在しないため不採用。
- Nuxt SSR/Nitro application serverは、browser appがstaticで、session APIがdevframe hostのlocal server上の
  小さなRPC surface（§ 8）であるため不採用。
- Dynamic config loading、自動watch、static snapshot、remote host、build、MCP modeは、
  served session dataにuser自身のsecretが含まれ得るため、local loopback sessionを越えた
  永続化・公開ができず不採用。

## 2. Buildとpackage boundary

**決定**: Nuxtは`ssr: false`、static Nitro preset、`app.baseURL: '/'`、
`app.buildAssetsDir: '/_nuxt/'`、空のCDN URL、root-absolute same-origin assetを使う。Full buildは正確に
clean → `nuxt build` → `tsdown`の3 stepとする。開始時に
root-resolvedなpackage所有の`.output/`、`dist/` treeだけを除去する。`nuxt build`は
`nitro.output.publicDir`によりbrowser applicationを`dist/public`へ直接出力し、build metadataは
`.output/`に残す。Post-Nuxtのvalidation/manifest stepは存在しない: 出力treeはNuxtが所有し、
devframe hostが`cli.distDir`からそのまま配信する（§ 8）。

tsdownは単一のnamed entry
`{ cli: 'src/server/cli.ts' }`、Node ESM、
`fixedExtension: true`、source map/declaration無効、`dist/`への直接出力と`clean: false`
（`dist/`の除去はpipeline自身のclean stepが所有する）、
`deps.skipNodeModulesBundle: true`とする。どちらの側にもoutput manifestは存在しない。
`dist/`の内容はpipeline自身のtool（pipeline所有のclean上のNuxtとtsdown）が所有し、`verify:package` gateは
package contractが依存する2つのentryだけをassertする: `dist/public/index.html`（devframe hostが配信する
SPA shell）、`dist/cli.mjs`（`package.json.bin`のtarget）。
Bundleされたparserはscan path上でin-processに実行し、調査対象dataがloadするmoduleを
選べないようにする。

`verify:package` checkはpackaged artifactへのassertが属する層である
CIとrelease gateで実行し、全local buildの内側では実行しない。`package.json.files`は正確に
`["dist", "docs/images", "README.md", "README.ja.md", "LICENSE"]`とする。npmが自動で含める`package.json`と
それらのentryがcomplete tarball allowlistである。`package.json.bin`は正確に
`{ "agent-customization-inspector": "dist/cli.mjs" }`とする。tsdown bundleがentryのshebangを保持し、
package managerがinstall時にlinkされたbinをexecutableにする。library APIがないため`main`、`module`、`exports`を
省略する。Install script、runtime download、end-user compileを使わない。Runtime packageは
`dependencies`にcaret rangeとして宣言し、commit済みlockfileがexactなresolved versionとintegrityをpinすることで
Committed lockfileは、このworkspaceがbuild、test、auditする対象のexactなversionとintegrityをpinする。
Lockfileはpublishされたpackageには同行しないため、consumerの`npx`はinstall時にそのcaret rangeを
registryに対して解決する。Auditが確立するのは、このprojectが出荷し検証するtreeであり、
後続の任意のinstallが生成するtreeではない。tsdownはproject所有moduleとshared
contractをbundleし、任意のtransitive packageはbundleしない。Directなproduction dependencyは
`devframe`、`env-editor`、`gunshi`、`h3`、`open`、`smol-toml`、`strip-json-comments`、`vfile`、`vfile-matter`、`which`、`yaml`の正確に11個とする（§ 3）。

承認済みのdirect production dependency set — その11個のnameだけで他は含まない — を`package.json`と
`pnpm-lock.yaml` closureからassertする。これによりnew production dependencyは§ 3の決定が明示的に
見直されるまでfailする。payload content scan — `os`/`cpu`/`libc` selector、bundled/optional native package、
native/binary/Wasm magicまたはELF/Mach-O/PE magic、`binding.gyp`、Rust/C/C++ source、`prebuilds`、
non-Node shebang、shell helper、executableなnon-JavaScript payload — と、lifecycle-disabled/
network-disabled installの各run、cross-OS shim audit、dependency単位のversion/integrity hash
assertionはscope外とする。commit済みlockfileが各resolved versionとintegrity hashを既にpinしており、
それらをtestで再記述してもlockfileを二重化するだけであり、hashが固定したcontentの再scanは憲章原則Iが
除く冗長な再検証で、install時のlifecycleとnetwork enforcementはpackage manager自身の設定が所有する。

**理由**: `dist/`への直接出力はstaging設計が必要とするcopy stepを除去する。Pipeline所有の単一clean stepが
新鮮な`dist/`を保証するため、出力される全fileは構成上pipeline自身のtoolが所有し、stale outputの拒否に
manifest閉包検査を必要としない。
node_modulesをexternalにすると、
platform-sensitiveまたは変化するtransitive codeの暗黙inlineを避け、CLIがloadするものをmanifestで
表せる。[tsdown dependency documentation](https://tsdown.dev/options/dependencies)はexternal dependencyと
明示的`alwaysBundle`を区別し、[entry documentation](https://tsdown.dev/options/entry)はnamed multi-entry形式を
定義する。Web、CLI、safe-filesystem layerがpackaged locationからloadできることはtarball
smoke testで証明する。Tarballをisolated fixtureへinstallしてexecutableを実際に`npx --no-install`でinvokeし、
`bin` mappingのinspectionだけで済ませない。起動前にexact shebang/executable modeもassertする。
commit済みlockfile — integrity hash付きの各resolved version — が、hashが既に固定したcontentを再scanせず、
lockfile自身の値をtestで再記述もせずに、初期リリースのproduction closureをstableにし
payloadをbyte-fixedにする。
`/skills/detail/<source>/<Source相対パス>`のようなnested routeにも同じshellを返すためroot-absolute assetが必要で、
relativeな`./_nuxt/` URLはそのroute配下へ誤ってresolveされる。
公式[Nuxt 4 configuration reference](https://nuxt.com/docs/4.x/api/nuxt-config#baseurl)は`baseURL`、
`buildAssetsDir`、defaultが空の`cdnURL`を定義する。正確な
[Nuxt output-directory documentation](https://nuxt.com/docs/4.x/directory-structure/output)は`.output`を
既定の生成build directoryと定義する。本projectは`nitro.output.publicDir`を`dist/public`へ上書きして
published treeを直接生成し、`nitro.output.dir`でbuild metadataを`.output/`に残す。Nuxt生成の
static-host fallback `200.html`/`404.html`はNuxt所有treeのordinaryなmemberとしてそのまま同梱され、
fallback routingはproduct routerではなくdevframe hostのSPA mountが所有する。

`verify:package`は意図的にminimalとする（シンプルな実装の方針）: `dist/`はpackage自身が実行するpipeline
だけが生成するため、出力fileすべての再導出・再hashは、同じpipelineが直前に生成したsibling build output
の再検証にしかならない。Asset manifestは持たない。Build-recorded asset/CSP-inline-hash manifestは、
それを書いたのと同じpipelineがvalidationするだけになる。devframe hostは`dist/public` treeを直接配信し、実行中のpackageは
same-tarballの再検証を行わない。配信の実効capacityはNode.js、filesystem、実行環境に従い、product独自の
file-size/asset-count validationを設けない。

Packed `package.json`のclosedなbin/package fieldはpackage testでassertする。
Node.js互換性はpacked `engines.node` rangeだけで宣言し、package managerの
engines機構でenforceする（pnpmとyarnは既定でmismatchを拒否し、classic npmはEBADENGINE warningを出す）。
CLIは宣言済みstringも実行中versionも再検査しない。同じpolicyを2箇所目に再実装してもdriftしか
生まないためであり、packed exact stringはpackage testとrelease gateでassertする。
Package fixtureはpacked manifest field、exact shebang、必須の2つの`dist/` entry、pack後実行を扱い、
product独自のfile-size/item-count境界を定義・検証しない。

**検討した代案**:

- Runtime dependencyの全bundleはdependency/license監査とtransitive動作を見えにくくするため不採用。
- UIとCLIの別published package rootはpipeline所有の1つの`dist/`よりrelease boundaryが曖昧になるため不採用。
  両build toolは`dist/`へ直接出力する。
- Hosted snapshot commandはlocal customization textとsecretをassetに永続化し得るため不採用。

## 3. 最新の互換stable dependency基準

**決定**: `package.json`にはcaret rangeを宣言し、commit済み`pnpm-lock.yaml`が全packageのexactな
resolved versionとintegrityをpinする。pnpm 11.13.0を使用する。`package.json`にexact specifierを書くとpinを二重管理することになる。caret boundは非互換majorを
——`devframe`や`gunshi`のような0.x packageでは次のminorも——除外し、range内へのupgradeは明示的な
`pnpm update`でのみ起き、plain installでは起きない。
「最新」は選択したNuxt/Vue toolchainと互換性がある最新stable versionを意味し、prereleaseや非互換majorを
意味しない。最初のlockfile作成直前に同じregistry互換性確認を再実行する。
このcheckはplanning gateとして扱う。選択済みpackageまたはversionが1つでも変わる場合、configuration
implementation前に停止してcompatibility decisionを再reviewし、dependency baselineを記載する英日両方の
research、plan、quickstart、task artifactをすべて同期して`/speckit.plan`、続いて`/speckit.tasks`を
再実行する。Localなpackage/lockfile editで
第2のdependency baselineを作ってはならない。
Renovateが自動mergeする更新はこのgateの外にある: どのpackageを選ぶか、なぜそれを選んだかは変わらない。
その更新はlockfileの中だけに収まらない。`:preserveSemverRanges`は`rangeStrategy: replace`であり、
新しいversionが現在のrangeの外に出れば`package.json`のrangeを書き換える。したがってbumpを裏づけるのは
ci.ymlであり、mergeの前にそのpull requestに対しsuite全体を走らせる。これらartifactに記録したversionは、
その理由をreviewした時点のものである。自動mergeされない更新が2つある。runtime dependencyのmajorと、
1.0.0未満のpackageのminorである（SemVerは`0.x`のどのreleaseでも破壊的変更を許す）。したがってpackageの置換、
majorの越境、pre-1.0のcaret rangeの移動は今もこのgateに届く（AGENTS.md § Release policy）。

| 領域                  |                                                                                  選択version | 理由                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js               |                                          Active LTS development/build基準、engines `^24.11.0 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | ^26.0.0`=`>=24.11.0 <25.0.0 |     | >=26.0.0 <27.0.0` | Node 24/26 range全体のruntime compatibilityを宣言し、release matrixでは各下限をcertifyして他majorを除外する |
| TypeScript            |                                                                                        6.0.3 | 現行Vue/Volarとtypescript-eslint toolchainがsupportする最新compiler                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Nuxt / Vue            |                                                                               4.4.8 / 3.5.39 | 現行stable release                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Vue Router            |                                                                                        5.2.0 | Nuxt 4.4.8の宣言range `^5.1.0`を満たす現行stable release。別router abstractionは追加しない                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| tsdown                |                                                                                       0.22.8 | 現行stable release。Node 24.11+をsupport                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Vite                  |                                                                                        7.3.6 | Nuxt 4.4.8が宣言するbuilder range `^7.3.3`内の最新version                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| pnpm                  |                                                                                      11.13.0 | 現行stable package manager                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Local host            |                                                                             `devframe` 0.7.5 | `@eslint/config-inspector`の基盤であるlocal-tool host framework。Packaged SPAを`cli.distDir`から配信し、session APIをRPC channelとして担い、認証は無効化する。Port/host解決を所有し（§ 8）、bundled openerはproductが`open`でbrowser openingを所有するため無効化される（§ 3）。Pre-1.0のため、commit済みlockfileがreview済みbaselineを固定し、manifestのcaret rangeは0.7.x内にとどまる                                                                                                                                                                                                                                                                                                                                                                                    |
| CLI                   |                                                                              `gunshi` 0.37.0 | 現行のruntime dependency 0件のESM CLI framework。Node.js `>=22` engine requirementは宣言済みrangeと互換                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Browser opener        |                                                                                `open` 11.0.1 | Startup openerのfallback（FR-001）を担う現行stableなcross-platform opener: macOSのChromium tab再利用が適用されないか失敗した場合に（§ 3）、bind済みloopback originをOS default handlerへbest-effortで渡し、devframeのbundled openerを無効化してproductのopenerだけが動くようにする。VendoredなPOSIX shell `xdg-open` — Linuxでは実行可能な限りそれを使い、そうでなければsystem helper — は記録済みのFR-038 closure例外である（§ 3）                                                                                                                                                                                                                                                                                                                                       |
| Host HTTP app         |                                                                             `h3` 2.0.1-rc.22 | Hostはdevframeがmountする先のH3 appを自ら構築し、devframeの拡張子guard付きSPA fallbackでは配信できないdetail familyのshell fallbackを載せる — shipped kind detailごとに1 family（§ 3）で、各detail URLは`SKILL.md`のようにfile自身の最終segmentで終わり、devframeは拡張子判定の前にdecodeするためpercent-encodeは代案にならないからである。他の直接依存と同じくcaret rangeで宣言し、lockfileがdevframe自身のh3へresolveするため、両者は1つのmodule instanceへ解決される。devframe自身が拡張子付きclient-route missをserveできるようになれば、この依存はhost shimとともに無くなる                                                                                                                                                                                          |
| Parser                |                                                              `yaml` 2.9.0、`smol-toml` 1.7.0 | 現行stable inert data parser。strict JSONはplatformの`JSON.parse`である                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| JSONC pre-parse       |                                                                  `strip-json-comments` 5.0.3 | JSONCのcommentとtrailing commaを空白へ置き換え、残りをstrict JSONと同じ`JSON.parse`へ通す — JSON family全体で解決は1つになる。独自にobjectを構築するlenient parserは、authoredな`__proto__` keyをown propertyとして保持できず、その名前の`.vscode/mcp.json` serverを無診断で消すため採らない                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Frontmatter           |                                                          `vfile-matter` 5.0.1、`vfile` 6.0.3 | Frontmatterのdelimiter処理。Frontmatter blockの開始と終了を決めることはBOM処理、改行、閉じfenceの形を決め直すことであり、正規表現ではなくparserの仕事である。これは同表の`yaml` engineでblockをparseする。独自の`js-yaml`を持つpackageは1つのdocumentに2つの意味を与えてしまう。js-yaml 3はYAML 1.1、`yaml`はYAML 1.2だからである                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| File opening          |                                                            `which` 6.0.1、`env-editor` 1.3.0 | Detail surfaceのopen control（FR-022）。`which`はlaunchが実行するeditor commandを解決するため、hostが提示するものと起動できるものが2つの食い違い得る事実ではなく1つの事実になる。`env-editor`は、そのcommandが`PATH`に無いときにinstallが置く場所を供給し、それらの場所を各editorのpackagingへ追随させる自前の表ではなく、維持された第三者の事実のままに保つ。`which`は6.xに留める: 7.0.0は`^24.15.0`を宣言し、本projectが支援するNode rangeの一部を除外するためである。Launch自体は上に挙げた`open`を再利用する。installされたapplicationを汎用に探すpackage（`locate-app`）は採らない: CommonJS専用であり、本projectがauditするproduction closureへprompt engineering用packageと`crypto-js`を持ち込むためである                                                         |
| Icon                  | `unplugin-icons` 23.0.1、`@iconify-json/lucide` 1.2.124、`@iconify-json/simple-icons` 1.2.93 | Build時のicon compile: `~icons/<collection>/<name>` importはそのicon自身のSVGを持つcomponentになるため、pageは何もfetchせず、icon runtimeも同梱されない — FR-022が要求する形であり、IconifyのAPI前提のruntime（`@nuxt/icon`、`@iconify/vue`）を採らない理由でもある。両collectionともicon dataを配布する一方で自身のlicense fileを持たないため、notice document（FR-043）が読めるよう、各setのupstream textを`licenses/`配下に本repositoryが保持する                                                                                                                                                                                                                                                                                                                      |
| Source view/diff      |                         `monaco-editor` 0.55.1、`@ota-meshi/site-kit-monarch-syntaxes` 0.7.3 | 現行stable read-only source/diff editor。固有diff engineによりclient dependency重複を避ける。MonacoはTOML grammarを持たず、`.codex/config.toml`はこのproductが開くcustomization formatであるため、`toml` idはsyntaxes packageから登録する: basic languageそのものであるMonarch grammarとlanguage configurationであり、language serviceもworkerも伴わない。この packageは自身のlicense fileを同梱しないため、notice documentが読めるようupstreamのtextを`licenses/`に置く（FR-043）                                                                                                                                                                                                                                                                                        |
| Colour-scheme control |                                                                     `shine-and-bright` 0.3.0 | 読み手がpageのcolour schemeを選ぶswitch。描画はこのpackageが同梱するstylesheetのものである: componentはそのclass名が選択するmarkupを描き、packageのcustom propertyを設定するだけなので、knobのスライドとsunからmoonへの変化はこのrepositoryのものではなくpackageのものである。上のiconやgrammar packageと同じく、CSSをclient bundleが運ぶdevDependencyであり、自身のlicense fileを同梱するため、notice documentはそのtextを読む（それらは`licenses/`配下に同梱テキストを置く）(FR-043)。forced colours有効時は`box-shadow`がすべて落ちるためsunとmoonも消えるが、buttonとknobのborderは読み手のpaletteで塗り直され、knobは依然として両端の間を移動する — 2026-08-25に計測。その状況で用途を述べるのはcontrolのaccessible nameである（WCAG 1.4.11）                        |
| Lint                  |                      ESLint 10.7.0、`@nuxt/eslint` 1.16.0、`@stylistic/eslint-plugin` 5.10.0 | 現行互換stable release。`@stylistic`はESLint 10がcoreから外したstylistic rule（例: `quotes`）を提供する                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Unit/integration      |                                            Vitestとcoverage-v8 4.1.10、Nuxt Test Utils 4.0.3 | Vitest/coverageを同じversionにし、Nuxt supportのtest harnessを使う                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Component/DOM         |                                                     Vue Test Utils 2.4.11、happy-dom 20.10.6 | Nuxt Test Utils peerを満たす現行release                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Browser/a11y          |                                             Playwright 1.61.1、`@axe-core/playwright` 4.12.1 | 現行stable browser/accessibility tooling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Type                  |                                                       `@types/node` 24.13.3、`vue-tsc` 3.3.7 | Node 24基準とVueに対応する最新互換type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Release               |                                `@changesets/cli` 3.0.1、`@changesets/changelog-github` 1.0.0 | version bump、changelog、publishをChangesetsが所有する: userが受け取る変更を運ぶpull requestは`.changeset/`のentryを追加し、mainへのpushはrelease pull requestを開くか更新するか、そのpull requestがversionを付けた内容をpublishする。releaseはCIで走り、公開packageはどちらもimportしないためdevDependencyである。changelog generatorはGitHub版を選んでおり、各entryが由来のpull requestへリンクする。これは`.changeset/config.json`が記述する2つの値のうちの1つでもある — 既定値をコピーしたものは、コピー元の既定値を追跡しなくなった値だからである。`.github/workflows/Release.yml`は結合actionではなくそのsub-actionを駆動し、それによってnpm trusted publishingがpublish tokenと交換する`id-token: write`をpublishするjobだけに置ける（AGENTS.md § Release policy） |

**理由**: 選択した集合は、公開済みpeer rangeとbuilder rangeが一致する最新stableの組み合わせであるため、
未supportのcompilerまたはbundler overrideを強制せず最初の実装を再現できる。

**Formattingの判断**: Code formattingはPrettier（`prettier` ^3.9.6）が所有する:
`pnpm run format`が書き換え、`pnpm run format:check`がローカルとCIでゲートするため、formattingを手で
直すことはない。`prettier.config.js`はcodebaseが既に定めていた2つの慣習（幅100、single quote）だけを
設定し、`.prettierignore`はreformatしてはならないもの — vendored skill、spec-kitのscaffolding、
記録済みSHA-256 digestでvendor contract表が凍結されているMarkdown — を除外する。Byte衛生は引き続き
宣言的な所有者に委ねる: `.gitattributes`（`* text=auto eol=lf`）でgitがline endingをnormalizeし、
`.editorconfig`がcharset/final-newline/trailing-whitespaceの慣習をeditorに宣言し、codeのsemantic/style lint
gateはESLintが担う。Tree全体のUTF-8 decode可能性やbyte ruleを検証する自作checkerは撤去した。その
failure modeはuserを守らず、digest-frozenなcontract tableは自身のSHA-256再計算gate（T004/T1034–T1037）が
守っており、byte-format checkの守備範囲ではないためである。Release-review
remediationごとにcomplete applicable automated gate matrix、影響するcandidate/profile/fixture/humanまたはmanual evidence protocol、
complete-diff/tarball reviewへ戻り、concernが0件になるまでloopする。次にbilingual Constitution recordとその他すべてのrepository
evidence editを完了し、frozen tree/candidateへ全applicable automated gateをもう一度実行し、`test:docs` →
`git diff --check`で終える。Outcomeはexternal release/pull-request check logだけへ保持する。その後repositoryを
editした場合は全outcomeを無効にし、final sequence前にremediation、digest/evidence再validation、applicable gate、complete-diff
reviewへ戻る。

**移行影響**: このinitial-release dependency baselineのplanned impactはnoneとする。移行対象となる以前の公開済み
Inspector package、public contract、永続profile、user dataが存在しないためである。T001はpackage/configuration
作業前にこの判断を確認しなければならず、影響を受けるconsumerまたは以前のcontractが見つかった場合は判断を
無効としてreplanningする。後でacceptするdependency追加・変更または破壊的なpublic-contract変更はすべて、影響を
受けるconsumer、contract、data、workflow、必要な移行・compatibility/support手順、rollback/support pathを記録するか、
理由付きの明示的なno-impact判断を記録する。Renovateが自動mergeする更新はそうした変更ではなく、上の
dependency gateがそう述べている。この`**移行影響**` sectionと対応する`**Migration impact**` section、
およびplanの`**Dependency and breaking-change migration gate**`/
`**Dependencyおよび破壊的変更の移行gate**` sectionの英日design evidenceが欠落またはstaleならT002を
blockする。Release-validation pairは後で対応するdecision evidenceを記録し、英日validation evidenceが欠落すれば
releaseをblockする。

`open` dependency — startup openerのfallback helper（§ 3）— には理由付きの明示的な
no-impact判断を記録する: public contract、session API shape、永続data、workflowに一切触れない。CLIの
`--open`/`--no-open` surface、単一のlaunch line、表示済みURL fallbackは、どのpackageがhelperを
所有するかに依存しない。直接宣言するpackageがhelperを所有し、devframeのbundled openerは無効化
されており、devframe自身のopenerは`createDevServer`の`openBrowser` optionを通じてfallback pathとして
残っている。影響を受けるconsumer、移行手順、support windowは存在しない。

CLIはGunshiのstableなroot `define`/`cli` APIだけを使用する。Negatableな`open` booleanをdefault trueとして
宣言して`--no-open`を提供し、`cli()`を`strict: true`で呼び出し、host bind前に
すべてのpositional/rest argumentを明示的に拒否する。非同期resultをawaitし、parserが所有するvalidation
`AggregateError`を通常どおり伝播させてnonzero exitとする。その経路にproject-ownedのrendererは置かない: argument
validationとそのmessageはGunshiが所有しており、2つ目のrendererはそれが記述する当のparserから乖離する
duplicated policyになるからである。Built-in help/versionはbindせずreturnする。
Production entryは`gunshi/agent`、lazy command、custom plugin、experimental parser combinatorをimportしない。
Gunshiはnpm graph上の1 leafだが、bundle済みinternal argument/plugin/resource codeもpayload、integrity、license、
import-boundary digestの監査対象とする。Lockfileがpinするresolved version（caret rangeにより同じ0.x minorに限定され、Renovateはその境界を自分では越えない）とこれらのtestによってpre-1.0 API変更riskを有界化する。

監査した0.37.0のregistry tarballはtext-onlyのJavaScript、declaration、JSON、documentation、license file
34件（unpacked 239,298 byte）で、runtime/optional/peer/bundled dependency、install lifecycle hook、platform
selector、shell/native/binary/Wasm payloadを含まない。これにより既存Node-only package gateを維持しつつ、
Gunshiのより大きなbundle済みJavaScript payloadをrelease auditで明示する。

devframe 0.7.5は意図的にleaf packageではない: transitiveなruntime treeとして`h3` 2.0.1-rc.22、`birpc`、
`crossws`、`valibot`、`@valibot/to-json-schema`、`destr`、`mrmime`、`nostics`、`pathe`、`ufo`を持ち込む。
このtree（`h3` release-candidate pinを含む）はdevframe自身のdependency宣言とcommit済みlockfileが所有し、
member単位のproduct決定として再判断するのではなく、maintainされたhost layerの採用の一部として受け入れる。
lockfileが全memberをname/version/integrity hashでpinし（OS間で同一）、payload byteはdependency review時に
固定される。devframe自身のtarball payloadはJavaScript/TypeScript textだけであるためNode-only package gateは維持される。
devframeはpre-1.0であり、0.x minorがAPIをmigrateし得るため、caret rangeがそれらを除外し、commit済み
lockfileがresolved versionをpinし、その
minorを越えることは自動mergeされるbumpではなく§ 3のplanning-gate changeとして扱う。`tests/package/production-graph.test.ts`は、承認済みの11個の
direct dependencyであることを正確にassertする。versionとintegrityはlockfileが所有し続ける。

### 有限なrelease-certification行列

**決定**: 宣言済みNode.js 24/26 engine range全体を3つのOS targetでsupportする。Active LTS
Node.jsのdevelopment/build baselineの`ubuntu-latest`で1つのplatform非依存tarballをbuildして別のbuild/package smoke checkを
実行し、同一byteをNode.js `24.11.0`と`26.0.0`に`ubuntu-latest`、`macos-latest`、`windows-latest`を
掛け合わせた正確な6つのlower-bound certification jobでinstallする。各release jobで解決されたrunner-image identifierと
実際のNode versionを記録する。Playwright 1.61.1がinstallする正確なChromium、Firefox、WebKit revisionのそれぞれで、
primary-workflowとaccessibilityの完全なbrowser suiteをactive LTS Node.jsの`ubuntu-latest`で実行する。これらのbrowser
revisionはuser browserの網羅的listではなく、再現可能なautomated certification baselineである。OS helperはbrowser
family/versionを選択・検証せずURLをdefault handlerへ渡す。Helper成功をcompatibility evidenceとせず、表示済みURLと
`--no-open`をcertified browserのmanual選択fallbackとする。

**理由**: Closedなcertification行列は再現可能で、より広いsemver compatibility contractを誤表示せずrelease完了を
判定可能にする。各Node majorのsupport下限を使って宣言したengine floorを検査し、同一tarball byteでpackageがplatformに
より変化しないことを証明する。PinしたPlaywright browser revisionは、OS default handlerがそれを選ぶと主張せず有限な
automated gateを与える。

**検討した代案**: 無上限の`>=26.0.0` engine rangeは将来のmajorを暗黙に主張するため不採用とした。
`*-latest` runnerが解決したimageを記録しないことと、特定しないmodern-browser targetは、repository変更なしにrelease denominatorが変化するため不採用とした。labelそのものは採用し、各jobが解決したimage identifierとNode versionを記録する。
Chromium-only testは、local launcherが別のbrowser engineを開く可能性があり、productが3つのPlaywright engineで動作することを意図した
standard browser APIを使用するため不採用とした。

Versionの一次根拠はnpm registryの[Nuxt](https://www.npmjs.com/package/nuxt)、
[Vue](https://www.npmjs.com/package/vue)、[Vue Router](https://www.npmjs.com/package/vue-router)、
[tsdown](https://www.npmjs.com/package/tsdown)、
[TypeScript](https://www.npmjs.com/package/typescript)、[Vite](https://www.npmjs.com/package/vite)、
[pnpm](https://www.npmjs.com/package/pnpm)、[Monaco Editor](https://www.npmjs.com/package/monaco-editor)、
[devframe 0.7.5 registry metadata](https://registry.npmjs.org/devframe/0.7.5)、
[Gunshi 0.37.0 registry metadata](https://registry.npmjs.org/gunshi/0.37.0)、
[Vitest](https://www.npmjs.com/package/vitest)、
[Playwright](https://www.npmjs.com/package/@playwright/test)である。Node公式の
[release status](https://nodejs.org/en/about/previous-releases)を、development/build baselineが解決する
active LTS lineの根拠にし、[Node 26.0.0 archive](https://nodejs.org/en/download/archive/v26.0.0)を第2のengine floorの根拠にする。GitHub公式の
[runner-image labels](https://github.com/actions/runner-images#available-images)を3つのOS targetの根拠にする。
Monaco公式の[v0.55.1 release](https://github.com/microsoft/monaco-editor/releases/tag/v0.55.1)を
選択stable editor versionの根拠にする。
Gunshi公式の[setup requirement](https://gunshi.dev/guide/introduction/setup)と
[declarative/strict CLI guide](https://gunshi.dev/guide/essentials/declarative)を、ここで用いる
Node/TypeScript互換性とclosedなunknown-option behaviorの根拠にする。
Safe-filesystem layerはNode built-inの`node:fs/promises`、`node:fs`、`node:path` APIだけを使用するため、
platform toolchainやruntime package dependencyを追加しない。
Directなproduction `dependencies` setは`devframe`、`env-editor`、`gunshi`、`h3`、`open`、`smol-toml`、`strip-json-comments`、`vfile`、`vfile-matter`、`which`、`yaml`の
正確に11個とする（caret rangeで宣言し、lockfileがexactなresolved versionへpinする。`h3`のresolved versionはdevframe自身のh3と一致し、両者は1つのmodule instanceへ解決される）: CLIとparserのpackageはnpm graph上のleafであり、h3は下記のtransitive host treeに既に含まれ、devframeがそのtreeを
持ち込み、`open`はhelper検出の小さなtree（`default-browser`、`is-wsl`とそのleaf）をlockfileのpin付きで持ち込む。
Nuxt/Vue/Vite/tsdown、Monaco、test toolingは必要outputをclosed product assetへassembleするためbuild/development-onlyとする。
Lockfileとisolated install済みproduction closureの両方をauditする。

**検討した代案**:

`cac` 7.0.0も互換なruntime dependency 0件のESM parserだが、改訂後のCLI frameworkにはGunshiの
declarativeかつtypedなcommand定義とstrict validationを採用する。同じ責務を重複させないため、`cac`を
第2のparserとして残さずproduction baselineから除外する。

調査日時点のupstream stableにはTypeScript 7.0.2とVite 8.1.4もあるが、意図的に選択しない。
公式[TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)は
Vue/Volar workflowに当面TypeScript 6を要求し、
[typescript-eslint dependency policy](https://typescript-eslint.io/users/dependency-versions/)は7をまだ許可せず、
公開された[Nuxt 4.4.8 Vite builder manifest](https://registry.npmjs.org/@nuxt%2Fvite-builder/4.4.8)は
Vite 7を宣言している。これらを強制すると、動作する現行Nuxt stackを使うという要件に反する。
Dual TypeScript compilerとpnpm overrideは初期リリースに不要な複雑さとして不採用。

Browser launchをdevframe hostのbundled openerに委ねる案は、既に監査済みのdevframe payload内で
完結するとしても不採用とする。devframeは`open` packageのlogicを自前のbundleとして抱えているため、
どのhelperが動くか — そしてOS handlerをどう解決するか — が、このproductが自ら宣言・review・更新する
dependencyではなくdevframeのbundle判断で固定されてしまう。Directな`open` dependencyはhelperを
production closureの名前付きlockfile-pinned memberにし、hostはdevframeのbundled openerを無効化して
productのopenerだけが動くようにする。`open`のpublished tarballが含む唯一のnon-JavaScript executable —
vendoredなPOSIX shell `xdg-open`で、package自身の選択policyがLinux hostでは実行可能である限りそれを使い、
そうでないときにsystemの`xdg-open`へfallbackする —
は記録済みのFR-038 closure例外である（spec.md FR-038）。openの失敗またはunsupported時は
既に表示したloopback URLをmanual openできるままにする。

macOSでは、Viteが実装しているのと同じ方法で、起動中のChromium系browserが既にsession originを
開いているtabの再利用をまず試みる: 固定の`ps cax` probeが固定一覧のapplication（Chrome系variant、
Microsoft Edge、Brave、Vivaldi、Chromium）のどれが起動中かを読み、product-authoredな固定JXA script —
JavaScriptであり、create-react-appのMIT-licensed openerから改変し、packaged CLIを単一bundleに保つため
source定数として埋め込む — をOSの`osascript` automation hostで実行して、一致するtabをfocusして
reloadし、空のnew-tab pageをretargetし、それも無いときだけそのbrowserに新しいtabを開く。この
attemptは、起動中のChromium系browserをOS default handlerより意図的に優先する。macOSはこれを
一度きりのautomation consentの背後に置き、拒否されればattemptは静かに失敗する。あらゆる失敗 —
固定一覧のbrowserが起動していない場合を含む — は上記の`open` helperへfallbackし、それは常に新しい
tabを開く。Windows、Linux、非Chromium browserに再利用は無い:「このURLを表示しているtab」を
指すplatform APIが存在しないため、macOS上のautomation-scriptableなChromium系が到達可能な
surfaceの全てである。spawnされるどのprocessも、固定の引数とbind済みloopback originだけを受け取る
（FR-022、spec.md § Clarifications Session 2026-07-19）。

## 4. Vendor behavior、Inspector matcher、evidence

**決定**: 1つの混在path matrixではなく、ownershipを分離した4つのcontract-versioned registryを保守する。

1. **Vendor behavior registry**は、文書化済みlookup base、locator、traversal、surface、scope、不確実性を表す
   stable `behaviorId` statementを記録する。規範的なhuman contractは
   [GitHub Copilot](contracts/vendors/github-copilot.ja.md)、
   [Claude Code](contracts/vendors/claude-code.ja.md)、
   [OpenAI Codex](contracts/vendors/openai-codex.ja.md)とする。各contractはRepositoryとUser behaviorを別表にし、
   Copilot contractはさらにVS Code、CLI、Cloudを別表にする。
2. **Inspector matcher registry**はstableな`ruleId`を記録し、共通の
   [allowlist grammar](contracts/inspection-path-allowlist.ja.md)に従う。全Repository matcherはBase、ordered Relative
   selector、それらと1対1のtyped segment programを分離し、正確なselected Repository rootから`./`で表記してbare `**/`を
   拒否する。Literal、regex、non-adjacent recursive-directory tokenは1 program内でcomposeできる。`./**/`は
   明示的な下向きInspector descendant inventoryだけを表し、vendor traversalを主張しない。Build validationは同じ
   programをimmutable versioned `TraversalPlan` dataへcompileし、Global preview patternをそのplanからrenderしてconsentへ
   schema、closed selection policy、canonical programをbindする。Content依存policyはclosedなCodex Global
   first-non-empty branchだけで、overrideを先にprobeし、readしたnon-empty contentならshort-circuitし、absentまたは
   emptyの場合だけ次へ進む。Unreadableまたはbinaryのoverrideはそのfileのdiagnosticで
   branchを終了し、fallbackしない（FR-035）。 Selectorはtyped segment arrayとして直接authorする。`./`表記のBase/selector string形式、bare `**/`拒否、
   canonical selector round-trip、rendering layerは持たない。Consent digestも持たず、previewはserverが保持し
   `previewId`で識別するrecordで、`allowlistVersion`/`traversalPlanVersion`で同梱planへbindする。Token語彙、
   composability、Codex first-non-empty policyは維持する。
3. **Runtime composition registry**は、selection、precedence、layering、fallback、
   relationship-only ruleを表すstable `strategyId`を
   [runtime composition](contracts/runtime-composition.ja.md)に記録する。Strategyはpathを再記述せずbehavior IDと
   rule IDを参照する。
4. **Official source**はpageごとに[公式資料](contracts/official-sources.ja.md)へ記録する — canonicalな
   公式URL、正確でboundedなsection anchor、review date、影響contract ID、assertion、semantic fingerprint。
   Recordは並行registryを経由せず自身の`evidence`配列でそれらを引用するため、根拠は支える主張の隣に置かれる。
   これらのrecordを照合するのは`pnpm run check:official-sources -- --network`であり、既定chainの外に置く
   maintainer専用commandである。scriptに判定できること — record自身のhostからredirectなしの直接`200`、
   および各引用sectionが配信された見出し1件、あるいはclient renderingページの目次anchor slug 1件として
   解決すること — を判定し、参照ではない2つの読解はreviewerに残す。各reviewの結論は
   [validation.ja.md](validation.ja.md)に記録する。

**Evidence statusの決定:** Documentation completenessとupstream lifecycleは直交させる。Atomicなbehavior、
rule、strategyはそれぞれ自身のrecord上に`documentationStatus`と`lifecycleQualifiers`を持つ。
`documentationStatus`は正確に`documented`、`partially-documented`、`unknown`、`conflict`のいずれかとし、
重複のない`lifecycleQualifiers`は固定順`preview`、`experimental`、`deprecated`を使う。Empty qualifier arrayは
lifecycle stateを主張せず、`stable`として表示しない。これらはmaintenance recordであり、どのresponseも
どのsurfaceも運ばない。したがってcandidate provenanceが公開するのはどのruleがfileをadmitしたかであって、
そのruleがどれだけ文書化されているかではない。

選択したRepository rootはimmutableなRepository inventory boundaryのままとする。CLIは`process.cwd()`を1回だけ
captureし、defaultではその正確な文字列を使う。`--root`は受理し（反復指定はparserのlast valueへ解決）、absolute optionはそのまま保持し、
relative optionはcaptureした起動directoryに対してresolveする（FR-001）。明示的なempty valueは
session/browser作成前に固定actionableかつsource-value-freeなstartup errorで失敗させる。Valueの欠落は
そこでGunshiのtyped argument validationによりrejectされ、productはそのcheckを重複実装しない。CLIは`process.chdir()`を
決して呼ばず、bootstrapはscan I/Oより前に、readを認可しない唯一のRepository Sourceを作成する。Vendor runtime root、
walk方向、target file、trust、enablement、selection、installation、product surfaceは、matcherやfile存在から導出せず
独立したbehavior/strategy factにする。Behavior record、source record、strategy、relationship、excluded ruleはreadを
認可しない。

Admitしたtool-home rootはtool別の独立したGlobal Sourceとして表す。Codex、Claude、Copilotごとに最大1つ、
したがって1 sessionで0から4つのGlobal Sourceとする。各Sourceは正確に1つのrootと1つのSource-relative Path
namespaceを所有し、そのroot配下にある異なるcustomization typeのfileは別々のinventory itemとして保つ。
「repository-relative path」はRepository Sourceだけに使い、inventory-file/normalized-targetのDTO locator field、filter、
file-scoped diagnostic、cross-source comparisonではSource-relative Pathを使う。Enabled Sourceとconsent previewの
`displayRoot` fieldはone-way escapedなroot presentation labelであり、Source-relative locatorでもread authorityでもない。
Preview labelはowning Sourceが存在する前にoriginを持ち、absoluteまたはinvalidなlexical rootを表し得る。

Bounded derivationは任意のreference追跡ではなく、closedかつdeterministicなtarget constructionを持つtyped single-edge provenance graphの
ままとする。これは各vendor自身の構成読み取り段階が行い、その段階が展開しうる出荷済み`bounded-derived-candidate` ruleは、
3 vendorのlocal-marketplace manifest ruleとCodex fallback basename placementである。Skillのsibling `agents/openai.yaml`はこれに含まれない:
それはderivationではなく、所有元skillのbounded companion censusを通じて公開される
（contracts/vendors/openai-codex.ja.md § Derived Repository rule）。各ruleはexact seed pathまたはseed rule/kind、
declaration field/syntax、base/placement、fixed suffix alternativeをpinし、callback、arbitrary path join、free-form
expression、glob、recursive derivationを表現不能にする。Derived provenanceは別edgeをseedできず、同じfileの独立static provenanceはeligibleな
ままとする。安全なCodex fallback basenameと、検証済みlocal marketplace root配下の
vendor-specific plugin manifestだけを受理する。Agent memory、任意role-config target、plugin component、
import、その他任意component/config path、skill resource、script、asset、remote source、MCP server提供instructionは
relationshipまたはexcludedのままとする。

**理由**: Frozen inspection pathを対象とするcurrent official documentationの限定的な再監査により、1つのtableに
まとめるとInspector matcherがvendor lookup behaviorのように見える箇所が複数生じることが判明した。

- **Copilotのsurfaceには重要な差がある。** VS Codeのrepository-wideな
  `.github/copilot-instructions.md` locationはworkspace rootのexact pathであり、recursiveな
  `**/.github/copilot-instructions.md`と書くとnested workspace fileを示唆してしまう。Copilot CLIはruntime
  contextからrepository boundaryへ向かう独自の文書化済みstandard-location traversalを持ち、Cloud/code-
  review surfaceはさらに別のsupport/composition modelを持つ。これらは別behavior rowにする。Inspector matcherが先頭に
  `ANY_DIRECTORIES` segmentを持てるのは、vendorがあらゆる深さで文書化しているlocation — worked-fileまたは
  descendant anchorを持つlocation — だけであり、applicabilityはconditionalのままにする。Runtime cwd chain上で
  しか文書化されていないlocationは、chainの唯一の共有メンバーであるselected rootでadmitする。VS Code rowをCLI
  またはCloud traversal ruleとして再利用しない。VS Code MCPにはcurrent-guide viewに対する
  意図的なversion付き例外が1つある。1.118 release noteはexact workspace root `.mcp.json`を追加してmost-specific
  same-name deduplicationを告知する一方、current MCP guideは`.vscode/mcp.json`とUser configurationを網羅的location
  として提示し続ける。Specific versioned pathはadmitするがevidence statusを`conflict`とする。選択したofficial
  sectionのどちらもroot schemaまたはroot、`.vscode`、User、agent、plugin input間のtotal orderを述べないため、
  VS Code root provenanceはpath/surface-onlyのままにし、winnerを推測してprojectしない。そのroot fileは
  すでにCLI candidateなので、compatibleなCLI/VS Code provenanceは同じfile上の1つのCopilot/MCP recognitionを
  共有し、CLI extractionはprovenance-specificのままにする。Standard-instruction supportの一部、
  project対user custom-agent precedence、別agent-contextのinstruction order、agent-profile skill preloadには、
  current page間の競合または未記載が残るため、普遍的winnerを作らずconflictまたはunknownとする。
  Hook、settings、plugin、MCP、custom-agent body/tool/model/invocation、IDE handoffのlocator/compositionも
  surface-qualifiedとし、excluded User overrideはfileを推測せずcondition factにする。
- **Claude project settingsはlaunch directory exactである。** `.claude/settings.json`と
  `.claude/settings.local.json`は選択した正確なRepository rootから読み、parent directoryからinheritせず、genericな
  descendant runtime scanでもない。Instruction、rule、skill、command、agent、output style、MCPはそれぞれ異なる
  baseとtraversal/activation ruleを持つ。Recursive legacy-command namespace、subagentのskill/MCP/memory field、
  settings選択agent、通常対forked conversation context、parent MCP inheritance/filter、workspace trust、built-in-
  agent omissionは別behaviorまたはstrategy factのままとする。Project/local subagent memory、full preload対任意の
  Skill-tool discovery、strict/bare/managed restrictionをpreload listから推測しない。
- **Codex ruleのrecursionは確立していない。** Current official textが文書化するのはactive layerの
  `.codex/rules/` directory直下のrule fileであり、nested subdirectory recursionは確立していない。したがって
  Inspector matcherはRepository root自身のconfiguration layerでdirect-child selectorを使い、
  `.codex/rules/**/*.rules`を使わない。Project config、instruction、hook、MCP、skill、agent、marketplace、local対
  hosted surfaceは、それぞれ固有のdocumentedまたはconditionalなtraversal/trust inputを保つ。正確なRepository
  marketplace root、layered project config/instruction fallback、local marketplace sourceの両form、default対
  explicit plugin hook、project/hook-hash trust、instruction byte budgetを別factにする。Custom-agent fileは
  spawned-session config layerであり、欠けたmodel/reasoning、sandbox、MCP、skill fieldはparentからinheritでき、
  live sandbox/approval overrideを再適用する。Local agent fileはhosted configurationではなく、AGENTS.md
  inheritanceは未文書化のままとし、任意model-instruction、compact-prompt、skill pathは未読relationshipにする。
- **Plugin rootはactivateされるものであり、任意のrecursive manifest searchでdiscoverされない。** Marketplace
  registration、installation、明示plugin directory、その他文書化済みmechanismがplugin rootを確立する。
  Claudeのplugin manifestはoptionalであり、任意のRepository descendantにmatching manifestまたはcatalogが
  あるだけではvendor auto-discovery eventにならない。Inspectorはroot-exactなauthored-project
  matcherを保持する。Validated localなsourceがplugin rootを指名するcatalog entryの下では、censusがそのroot以下のfile（manifestを含む）をcatalog自身のrowの下に列挙し、nested manifestをadmitするruleもderiveするruleも存在しない。
  Presenceはregistration、installation、enablement、trust、component loading、precedenceを証明しない。

Vendor contractは将来の保守のため、文書化済みUser settings、agent、skill、rule、hook、MCP source、plugin、
state、deprecated surfaceもinventoryする。これらUser tableはevidenceでありconsentではない。FR-015からFR-018とFR-045が認可するのは、
正確に4 memberのfrozen Global rule catalog — 各memberの文書化済みcustomization kindと、共有agent homeのskillおよび個人plugin
marketplace file — であり、vendor behavior registryが記録していても、それらcatalog外のUser
surfaceはspecification変更なしではすべて`excluded`のままとする。

全vendor behavior、Inspector rule、composition strategyは正確な公式`sourceId`を参照する。Official-source
recordはそれらIDをboundedなURL sectionと影響contract IDへ逆mapするため、page変更時のreview setを有限にできる。
Checked-in fixtureとmoduleはidentifier uniqueness、相互link、英日semantic parity、source anchor、offline semantic
fingerprintを検証する。Networkへaccessできるのは明示的なmaintainer drift checkだけで、behavior、rule、
strategy、assertion、fingerprintを自動更新しない。Product startupとRepository/Global scanはdocumentationを
fetchしない。

Registryはpage bodyをcopyして保持しない。公式HTTPS host/redirect policy、content-type check、
recoverableなtransport failure動作、anchored-section normalization、human update ruleは
[EvidenceCitation](data-model.ja.md#evidencecitation)で定める。URLへ到達できてもanchor sectionが消失、
重複、semantic changeした場合はfail closedとしてhuman reviewを要求する。

**検討した代案**:

- 1つのcombined vendor/path/precedence/source表は、1 cellでupstream locator、Inspector matcher、surface-specific
  composition strategyを区別できず、citationを独立reviewできないため不採用。
- Current VS Code MCP guideのomissionを、1.118 root `.mcp.json`がunsupportedである証拠として扱う案は、
  version付きfirst-party release noteが直接追加しているため不採用。Schemaまたはtotalな「most-specific」orderを
  推測する案も、選択したofficial sectionがどちらもそのfactを述べないため不採用。
- Inventoryだけからeffective runtimeをsimulateする案は、runtime `cwd`、target path、surface、trust、
  CLI/environment/managed settings、installed plugin stateが利用不能または意図的に除外されるため不採用。
- 全manifest/config path、import file、skill resource、script、assetのreadは、authored referenceがread setを
  選択することになり、固定のdocumented allowlistがInspectorのread対象をboundしなくなるため不採用。
  固定Inspector matcherとtyped derivationによりgeneric file-read primitiveを作らず有用な
  coverageを保つ。
- Globalをcurrent User customizationすべてへ拡張する案は、FR-015からFR-018に反し、specificationとconsentの
  redesignが必要になるため不採用。
- Admitした全tool homeを1つのmulti-root Global Sourceへまとめる案は、1つのSourceが1つのfilesystem trust
  boundaryと1つのSource-relative Path namespaceを表すため不採用。
- 1つの`certainty` enumは、documentation maturity、authored/installed state、trust、enablement、selection、
  runtime applicabilityが直交するため不採用。

## 5. Filesystemとscan safety

**決定**: このsectionの規範recordは`spec.md`のclarification session（Clarifications
§ Session 2026-07-22）とする。Inspectorはuserが既に信頼しているworkspace内で動作し、AI agentが
読む内容をそのまま表示するproductであるため、調査対象customization fileをadversaryとして
model化しない。Adversarial-file機構（operation間のcheckpoint
identity再検証、race-detection taxonomy、hard-linkのread-once grouping、read ticket/receipt、
resource-registry close-state machine）は不採用とし、ordinary traversalとper-file diagnosticを
採る。

Traversalは、immutable versioned `TraversalPlan` data（§ 4）へcompileした固定inspection-path
allowlist上の、Node `fs/promises`によるordinaryなrecursive directory walkとする。
Pure Node.jsの`src/server/inspection/` directoryは引き続き調査対象source I/Oの唯一の
backendであり、fileをread-onlyで開き、mutation-capableなfilesystem operationを公開しない
（QR-003）。Symbolic linkは透過的に追跡する。Inspectorは同じpathを読むagentが見る内容を
表示するためである。Targetがmissingまたはunreadableなlinkはordinaryなper-file
`file-unreadable` diagnosticを生成し、recursive traversalはreal pathでvisited directoryを
追跡するためlink cycleがscanの終了を妨げることはない（FR-024）。Hard linkはordinaryなfileであり、
physical-identity grouping、primary/alias選択、read-once semanticsを持たない。Publicな
Source-relative Pathはraw entry nameを`/`でjoinしたものであり、filesystem operationが使うのと同じ綴りである。

Failureはfileごとに分離する（FR-028）。Unreadable file（broken symbolic linkを含む）、
binary content、
parser/extractor failureは、closed registry（data-model.md § Diagnostic）の`file-unreadable`、
`file-content-binary`、`recognition-parse-failed`という、そのfileのactionable diagnosticに
なり、scanはpublic status `partial`でatomicにcommitする。Source rootがmissingまたは
directoryとしてreadできない場合、そのSourceのscanはsource-scopedな`root-unreadable`
diagnosticで失敗する（FR-002）。Consent済みGlobal rootでは、他のtoolをblockせずそのtoolを
absent/failedとして記録する（§ 9）。1つのfileに限定されないunexpected failureはattempt全体を
失敗させ、失敗requestのerrorをordinaryに報告する。何もcommitせず、最後にcommitした
snapshotを表示し続ける。

Admitした各fileのbyteは正確に1回だけdecodeする（FR-025）。NUL byteを含むitemは`binary`
（diagnostic-onlyで、他の点ではpublish可能なgenerationを`partial`にする）とclassifyする。
それ以外の全byte streamはUTF-8 replacement semanticsで1回だけdecodeし、`U+FFFD`が挿入された
場合のencoding stateは`utf-8-replaced`だが、結果はcomplete、readable、comparableのままとする。
先頭BOM 1つは記録して取り除く。

**理由**: Ordinary traversalは既知の要求（allowlisted pathの列挙、存在するfileのread、
fileごとの問題報告）を完全に満たすため、憲章原則Iがよりsimpleな実装を拘束力を持って要求する。
Defensive機構は実際にuserを守るfailure modeに対してだけ存在でき、そうした機構が防御する
adversaryはproduct modelに存在しない。維持する義務は各sectionが所有する: 調査対象
contentは決して実行しない（§ 6）、served contentにuser自身のsecretが含まれ得るため
session hostはloopbackだけにbindし起動machineの外へ決して公開しない（§ 8）、表示contentはinertにrenderする（§ 6、§ 7）。

**検討した代案**:

- TOCTOU checkpoint model（全enumeration/readを挟むpre/post identity check、
  fail-closedなrace outcome、registry-confirmed close）は、productがmodel化しないadversaryへの
  防御であるため採らない。信頼するworkspace内の同時編集は、最悪でも
  ordinaryなper-file diagnosticか、明示的rescanで更新されるstale snapshotになるだけである。
- 1件のunreadable/binary fileによるscan全体の失敗は、FR-028がunaffected resultの利用継続を
  要求するため不採用。

## 6. 安全なparse、literal表示、inert rendering

**決定**: Scanがreadしたsource byteを正とする。NUL byteを1つでも含む場合はbinaryとする。admit済みcandidateでは
diagnostic-onlyであり、他の点ではpublish可能なgenerationを`partial`にする。censusが列挙したcompanionでは
assetの通常の事実である。それ以外のbyte sequenceは全て、UTF-8 replacement semanticsで
正確に1回だけdecodeする。先頭BOMを1つ記録して取り除く。Decodeが`U+FFFD`を挿入した場合は`utf-8-replaced`を使い、
その文字をgarbled source全体に保持したままparse、extraction、display、comparisonを続ける。Replacementだけでcomplete
outcomeとし、別charsetを推測したりretryしたりしない。読み取り可能なsource textとcomparison contentは
記述されたまま返し、これがすべてのauthored valueが読み手に届く経路となる。表示する宣言名はそのparserが解決した値 —
fileを読み込む製品が得るtextであり、quoteやescapeを含むliteralではその周囲の文字ではなくsyntaxの意味 — として返す。いずれもcredential検出、
content-based masking、redaction、reveal workflowを使わない。
調査対象content内の環境変数参照はliteral textのままとし、Inspectorが参照先のprocess値を読み取り、解決、置換する
契機にしない。文書化済みの`CODEX_HOME`、`CLAUDE_CONFIG_DIR`、`COPILOT_HOME` inputは、hostがmember Global Source
rootを特定するためだけに使い、content parseでは使わない。Inspectorはfile-size/file-count validationを適用しない。
Read、decode、parse、retentionはNode.js、parser library、OS、実行環境が利用可能にするcapacityを使う。
Error処理はordinaryとする。1つのfileに限定されるfailureはそのfileの
actionable diagnosticになり、scanは`partial`としてcommitする（FR-028）。1つのfileに限定されない
unexpected failureはattemptへresultを提供せず、実messageのままordinaryにpropagateする。失敗した
RPC handlerのerrorはdevframeがserializeする形のままdevframe channelを渡り、sanitizer wrapperを
持たない。Startup所有failureはprocess top levelへ到達する。Process-level OOMやkernel terminationからのrecoverは保証しない。

Decode後にbest-effort metadata extractionを行う。認識したkindが公開する宣言ごとに、そのparserが解決した値を持つentryを
1件持つ。Public metadata listはそのkindが公開する順で宣言ごとに1件とし、cross-file identityはkindと宣言keyとする。listはそのfileの認識kindに対する1回のparseであり、認識する全toolが共有するため、toolは宣言の座標ではない。
2回宣言されたkeyは後の宣言へ解決され、それがそのfileを読み込む製品の得る値である。
JSON/YAML/TOMLのquote、escape、block indicator、number/date spelling、collection punctuationを表示に残す。Typed
classification、relationship normalization、bounded derivationを駆動するのも、その解決済みの値である。
別に復号した値を持てば、表示している値と食い違い得る複製になる。
Authored relationshipは正確なtarget sliceを表示し、normalized targetにはsemantic stringだけを使う。Registry定義の
documented defaultにはsource sliceがないため`authoredTarget: null`とし、source-authored textではなくdocumented defaultと
labelする。Entryはsource座標を持たない。Documentを指すものが存在せず、
取得元の値の隣に置いたrangeはその値をcheckするのではなく言い換えるだけだからである。
Parseできなかったdocumentは、値を発明せずrecognitionのextraction全体を破棄する。

CarrierをどのJSON formatで読むかは、fileだけの事実ではなく、読み手とfileの組の事実であり、各回答は
仮定ではなく計測による。Copilotのhook file、cross-toolの
`.claude/settings*.json`、workspace rootの`.mcp.json`、およびeditor自身の`.vscode/mcp.json`を
JSONCとして読む。本productが読む
その他のJSON carrierは、Copilot自身のrepository settings pairを含めてすべてstrictである。product間の形を決めるのは`.claude/settings.json`である。
Claude Codeはsettings file中の`//` commentを次回起動時に報告するsyntax errorとして文書化する一方、
CopilotのeditorはそのfileをJSONC readerでparseする。したがって1つの物理fileに2つの回答があり、
各productのrecognitionは自身の回答を取る（FR-004）。

Copilotのsurface同士が食い違うこともあり、4つのJSONC carrierのうち3つがその事例である。Copilot CLIは、
cross-toolのpair、hook file、workspace rootの`.mcp.json`のいずれについても
commentを拒否する（それぞれ出荷buildに対して計測した）。一方editorは3つともJSONCとして読む。そのproductのsurfaceのうち1つでもcommentを
受け入れるなら、commentを受け入れる側を取る。commentを含まないfileはどちらでも同じに読めるため、この
選択が決めるのはcommentを含むfileの見え方だけである。strictに読めばそのfileはdeclarationを1つも持たず、
行は「読めなかった」と述べ、そのsurfaceが読み込んでいる内容を隠す。JSONCとして読めば、CLIが1つも
読み込まないdeclarationが、CLIの名も並ぶ行に公開される。内容とsurfaceを見せる後者の方が誤りは軽い。

Copilot自身のrepository settings pairはこの規則が届かない事例であり、strictに読む理由でもある。この2 fileを
緩く読むsurfaceがこのproductには存在しない。editorのsettings lookupは除外されており、editorの
hook-locations表が名指すのはClaude形式のpairであってこのpairではないため、読み手はCLIだけである。そのCLIの
2つの経路は互いに異なる: `/settings`が表示に使う経路はcommentを受け入れるが、設定を有効化しhook loadingが
通る経路は拒否する。fileをloadせず表示するだけの経路は合併の対象となるsurfaceではなく、上の「誤りが軽い方」の
比較も成り立たない。ここではcommentを含むfileはどこでも有効にならないため、緩く読めば、どのproductも
読み込まないdeclarationを行に載せるだけで、その代わりに隠さずに済むものが何も無い。
surfaceごとに答えることは現状では表現できない — recognitionはsurfaceを名指すが、parseは1つである —
ため、この食い違いは公開せず、判断を下す位置に記録する。

この合併はCopilotに限る。Copilotのsurfaceはeditor、CLI、hosted agentと提供元が異なり、計測上も食い違う
からである。他のproductのsurfaceは同一vendorのものであり、いずれも同じbinaryへ至る。したがって、他社の
session fileをeditorが緩く走査していても、それはそのsessionが何を持つかの発見であって読み込みではなく、
各productはその製品自身のclientの読み取りで答える。

各回答を確立したもの — vendorのpage、sourceとして読んだ出荷実装、または版を特定したbuildへの呼び出し
— は、取得した版とともに記録する。実装の挙動は恒常的な事実ではなく日付付きの事実だからである。localな
clientが読むcarrierはすべてそのclientに対して計測済みであり、未計測として残るのは、localな呼び出しが
届かないhosted surfaceである。

YAML semantic parseはYAML 1.2 core schemaとする。aliasは指す先の値へ解決し、未解決tagはそれが担っていたscalarを残す。
どちらもそのfileを読み込む製品が読む値であり、このtoolはvalidateではなく記述するからである。JSONCはcomment syntaxを
空白へ置き換え、残りを同じstrict parseで解決する。Decoded valueはsyntaxがscalar — string、number、またはboolean — へ解決する場合にだけ、parser自身の
解決結果のtextとして保持し、collectionへ解決するkeyはentryが名づけられる何ものにも解決しない。
Markdown/frontmatterとClaude importはtext scanとする。Parseはbundleされたparser libraryでscan path上のin-process実行とし、memory、syntax tree、scalarの
capacityはNode.js、parser library、実行環境に従う。ProductはV8 memory ceilingやparser item/depth/time
limitを設定しない。Parser/extractor failure、または同じ`(file, tool, kind)`への2 extractorの
incompatible meaningはそのfileに限定される。Per-fileの`recognition-parse-failed` diagnosticの背後で
そのrecognitionのextraction result全体を破棄して`partial` commitとするが、読み取り可能なsource textや
別recognitionは変更しない（FR-028）。
Tool/kind pairごとにrecognitionは正確に1つで、compatible provenanceはそこへ
mergeする。Rule、script、markup、URL、control sequenceは実行もrenderもしない。Literalのdecodeは機械的である。Inventory、Detail、Comparison、Global control、Diagnostic、
API、CLI output、documentationの全surfaceで、productはnatural-languageの意味をinterpret/
rankせず、validity/correctness/effectiveness/compliance/qualityを判定せず、remediationを助言せず、customization
contentをlint、synchronize、convert、format、fixしない。Inspector所有のmanifest、DTO、registry、invariantを
validateすることはinternal safety checkであり、customizationへのverdictではない。

Log-content禁止事項を伴うoperational-event語彙も、layeredなgeneric-error doctrineも採らない
（spec.md § Clarifications Session 2026-07-22、Constitution § Quality and Safety Standards）。Productにtelemetryはなく
（FR-022がoutbound trafficを禁止する）、terminal/UI outputは調査対象fileを所有する同じuserが読むため、
path、filename、error causeを隠しても誰も守られず、failureをdebug不能にするだけである。Sessionの`Diagnostic`はfile-specificな問題へ対処するために
必要なSource-relative Pathとmetadataを持ち、failureは実messageを保ち、fixed CLI help/version、
1行のlaunch URL、fixed startup warningはordinaryなpresentation outputのままである。

**理由**: Declaration/relationshipのlabelにはparseが必要だが、成功してもInspectorをvalidatorにしない。
Literal表示は、maskingなら隠してしまうcredentialその他の記述済み差分を維持する。Bundled interfaceはfileをそのまま表示し、注意書きも事前の問いも持たない。
`FileDetail` requestやcomparisonの前の確認は何も守らない。
sessionはloopbackへbindしたdevframe host（§ 8）経由でだけ到達可能で、fileはユーザー自身のものだからである。
一方でそれはすべてのfileを読むのに2回の操作を要求していた。Authored contentを縛るのは、fileまたは
comparisonを1つずつしか到達できず（inventoryやsessionのresponseからは到達できない）、clientが保持するものを
中央full-session client-data purgeが終わらせることである。通常のscope限定route、file/Source、generation
cleanupはそのpurgeではなく、Global disableは明示的なfull-purge例外である。
Loopback限定のsession API、process/browser memoryだけのlifetime、Vue text
binding、無効なlinkにより、この意図的な表示をlocalかつinertに保ち、maskingを
security boundaryとして扱わない。

**検討した代案**:

- Dynamic import、`jiti`、TOML/YAML custom constructor、Starlark評価、MCP probeは実行なので不採用。
- Credential maskingとvalue単位のrevealはliteral comparisonに反し、productが調査すべき差分を隠し得るうえ、
  全sensitive valueの検出を保証せずreveal stateだけを作るため不採用。
- 調査対象content内の環境変数参照を解決する案は、記述済みtextをambient process stateで置換し、admitした
  Sourceから読んでいない値を露出し得るため不採用。
- Zodは追加しない。宣言済みsession-API parameterはserver-retained stateに対して解決される
  referenceであり、resolution自体がvalidationである。Schema層はresolutionが既にfail closedにする
  ものを再拒否するだけで、Zodはfilesystem
  inputを安全にしない。

## 7. Source/metadata比較UI

**決定**: File/compare routeで`monaco-editor`のESM buildをclient-only lazy-loadし、read-only
single-file source viewとliteral source比較に使う。Editor workerと全basic-language contributionを
importし、Nuxt/Viteにsame-origin assetとして出力させ、language-service workerは一切含めない。
選抜ではなく全basic-language setとするのは、読み手が出会う言語がcustomization自身のdirectoryの中身で
決まるためであり（contracts/inspection-path-allowlist.md § Bounded companion census）、各contributionは
lazy loaderを登録するだけで、grammar chunkはその言語のfileを開いたときにだけ取得される。Basic language
はtextに色を付けるだけである。Language serviceのworker-backedな機能 — 何よりdiagnostics、そして
completion、hover、formatting、symbols — は除外する。与えられたものをvalidateし、調査対象の
customizationをinvalidと示すのは、この productが下さないverdictだからである。JSONにはbasic-language
grammarが無いため、登録moduleの中で1つ組み立てる: `json` idをJSON serviceのcontributionが行うのと同じ
extension claimで登録し、そのidに配線する唯一の機能はservice自身のlocal tokenizer — workerを持たない
module — である。contribution自体は決してimportしない。そのlazyにloadされるmodeがserviceのworkerを
emitされるbundleへ引き込み、language-service workerの出荷はpackage gateが禁じるものだからである。
したがって本物の`json` coloringがvalidationもworkerもなしで出荷され、`.jsonc`は同じtokenizerへmapされる
（comment対応はtokenizer自身のもの）。Monacoが何も持たないTOMLは、grammarを
`@ota-meshi/site-kit-monarch-syntaxes`から取る: serviceを伴わないMonarch grammarとlanguage
configurationであり、`toml` idへbasic languageと同じlazy factoryで登録するため、それらを運ぶchunkは
最初の`.toml` fileを開いたときに取得される。登録にpackage自身の`setupTomlLanguage`は使わない。その
parameterは`monaco-editor` entry point全体であり、その型にはこのbundleが除外するlanguage serviceが
含まれるため、呼び出すことはこのapplicationが意図的に持たない形を主張することになるからである。
`.jsonc`のmappingはinternalで、model URIはopaqueのままであり、textはいずれにせよ
記述されたとおりに表示される。
Modelはopaqueなin-memory URIと完全な記述済みsource textを保持し、route close、selection replacement、source
disable、generation replacement時にeditor/subscriptionとは別にdisposeする。Monacoのtext modelはdocumentごとに
1つのend-of-line sequenceを保持するため、行末が混在するfileは多数派の行末でrenderされ、editorからのcopyも
それに従う。行の内容と行数は変わらず、正確な`sourceText`は影響を受けない: それはdetail responseが運び、
comparisonが消費する値である。`readOnly`、`domReadOnly`、
`originalEditable: false`、`links: false`、`renderMarginRevertIcon: false`を設定し、
`accessibilitySupport: 'auto'`、enabledな`accessibilityVerbose`、各source sideの`ariaLabel`を使う。
`unicodeHighlight`（`nonBasicASCII`、`invisibleCharacters`、`ambiguousCharacters`）は
オフにする。これらのdefaultは読み手自身のfileの文字にdecorationとwarning hoverを付けるもので、
FR-032がこのsurfaceに禁じるlintingそのものである。文字の綴りが問題になる場面ではproduct自身が
path presentationで明示する（data-model.md § SourceRelativePath）。Monacoのannounceは
`document.body`直下のdefaultではなく、editor composable moduleが所有し全mountが共有する一つの
elementへ行い、teardownでその
element内のlive regionを空にする。Monacoのaria moduleはそれらをmodule-levelの変数で保持するため、
detachするだけでは最後にannounceされたauthored sourceの行が到達可能なまま残る（FR-027）。Editor
moduleがそもそもload
できない場合は同じsourceをinertな`pre`でrenderし、pointerなしでもscroll boxへ到達できるよう
focusableにする。
devframe hostがNuxt outputを直接配信するため（§ 8）、product-assembledなCSP-hash manifestは存在しない。
表示のinert性はread-onlyなeditor設定、Vue text binding、無効なlinkによって成立し、clientは引き続き
external worker、blob worker、evaluated stringをloadしない。Diff highlightはproduct独自のline数/computation-time cutoffを設けず、Monacoとbrowserの
capacityに従う。Monacoまたはbrowserがrecoverable failureを報告した場合もcomplete read-only side-by-side sourceと
diagnosticを残す。Tool recognitionはtoolごとに比較し、fileの宣言済みmetadataは1回だけ比較する。
toolは宣言の座標ではないからである: 各sideを1つのcanonical documentへserializeし、2つの
documentをMonacoでdiffする。例外はcarrier自身が宣言であるsideである: plugin manifestは
その内容全体で自身のpluginを宣言し、既にstrict JSONであるため、そのsideは書かれたままのfileと
する。serializeし直せば同じdocumentを書き手が書いたものから1往復遠ざけることになり、
そのためどのsurfaceも表示のためにmanifestをparseしない
（contracts/http-api.ja.md § get-plugin-carrier-detail）。tool ごとの記述をどう描くかはkind自身のものである: 2つのsideが
1つの名前が解決する2つのfileであるkindでは、tool 1件につき1 rowのtableとする。片方だけを認識する
productがあることを述べるのがそのrowだからである。両sideがcarrier file そのものであるkindでは
side ごとに1行とする。あるfileを読むproductはそのfile自身の事実であり、2行が既にそれを担うからである。
1行に収まらないlistはpageを広げず折り返す。その背後のparseは、Markdown系kindについては`(file, kind)`ごとに
1回である。shippedな全vendorが同じ固定YAML semanticsで読むためである。custom-agent kindは
例外で`(file, tool)`ごとに1回になる。agent fileがどこで分割されるかはadmitしたrule自身の
読み取りであり、Codexのagentは`developer_instructions`のstringがproseであるTOMLだからである。Markdown系kindのfrontmatterは
YAML — blockそのものの言語 — へserializeし、各comparisonはそのkindについてvendorが文書化して
いるkeyを、それを公開するpageの順で先頭に置き、それ以外のkeyをsort順で並べる
（frontmatter-yaml.ts、declaration-order.ts）。MCP comparisonは表ではなくserializationで比較する:
その単位はkindのinventory row unitである1つの宣言済みserver名（data-model.md § Inventory unit）で、
各sideはそのrowのcarrierの1つにあるその名前のdeclarationであり、surfaceは各declarationのparsed
entryを1つのpretty-printed JSON documentへserializeし、2つのdocumentをMonacoでdiffする。
表示専用のspellingではなくJSONなのは、このdocumentがJSON carrierのentryがserver名の下に持つ
valueそのものであり、そのcarrierの読み手は自分のentryの本体としてpasteできるからである — TOML
carrierの読み手はsyntaxではなくvalueをcopyする。comparisonのserializationは順序もspellingもcanonicalなので、
両sideはlineごとに揃い、lineの差はfieldの差である:
共通のdeclaration keyが1つの固定された読み順 — serverの種別、起動方法、接続先、与える環境 — で先頭に
立ち、それ以外のkeyとnested mappingのすべてのkeyはsort順で続き、sequenceのitemは宣言自身のdataである
自分の順序を保つ。scalarはwireがtextの横に公開するparsed kind（data-model.md § Field reading）で
綴られる — numberとbooleanは値として再構築されbareで綴り、JSONが綴れないnumber（`NaN`、doubleの
範囲を超える64bit整数）は正確なtextをJSON stringとして保ち、stringはstringのまま
`JSON.stringify`自身のescapingを受ける。authoredな`'7'`は`"7"`のまま、数値の`7`はbareのまま — 改行は
`\n`と綴られ、制御文字やlone surrogateはそのescapeになる — 両side同一に。documentはserializerが
並べ替えたtreeに対する`JSON.stringify(value, null, 2)`自身のpretty-printed outputなので、property順は
platformの列挙順である — 整数風keyが先頭に並ぶ。これは`String(-0)`が`0`を表示するのと同じtradeとして
platform自身のspellingとして受け入れ、両sideで同一に決定的である。
MCP detailは各declarationのfieldを同じJSON documentとして、fileが書いたkey順のまま表示する
（detailが公開する順序はFR-007のもの）。1つの名前の2つのcarrierはsyntaxを共有するとは
限らず（`.codex/config.toml`はTOML、`.mcp.json`はJSONで宣言する）、carrierはbytesをどこにも
表示しない（FR-007）ため、canonical serializationが両sideを読める唯一のspellingである。
Monacoのaccessible diff viewer、ARIA label、keyboard navigation、narrow-screen inline modeを維持し、
明示的なaccessibility test対象にする。

**理由**: Source fileにはMarkdownとstructured configurationがあり、syntax coloring、line navigation、
virtualized rendering、search、synchronized scroll、実績のあるdiff surfaceがinspectionを明確に改善する。
Monacoはsource差分を計算し、editor/環境依存のcomputation動作とaccessibility controlを提供するため、別の
text-diff packageは責務を重複させる。Recognition factにはdomain semanticsがある —
set-like recognitionとそのsurfaceはtypedなrowでstructureとして比較し、literal spellingの差は
source diffで観測可能に保つ。declaration blockには失われるstructureがない:
sideごとに1つのauthored mappingであり、canonical serializationがfieldを両sideで同一に並べるため、
added/removed/changedなfieldはまさにそのlineとして現れる。公式[diff editor options](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor_editor_api.editor.IDiffEditorOptions.html)と
[Monaco repository](https://github.com/microsoft/monaco-editor)がeditor、worker、accessibility、model
lifecycle capabilityを文書化している。意図的に狭いESM importはlockfileがpinするresolved versionと
packaged browser testでupgrade時に保護する。
Content-based display transformは適用しない。記述済みvalueは、前にも隣にもwarningを置かずに表示したままとし、
inert renderingによってcontent自体の実行、load、navigateを防ぐ。

**検討した代案**:

- Monacoと併せた`diff`追加は、現時点でCLI、API、patch export、headless consumerが第2のdiff engineを
  必要としないため不採用。
- Recognition metadata — どのtoolがどのsurfaceでsideを認識するか — のMonaco向けserializeは
  property orderとline changeがdomain fieldのadded/removed/changedを不明瞭にするため不採用。
  declarationのserialization — MCPのJSON、frontmatterのYAML — はこのcaseではない:
  各sideは1つのauthored mappingで、そのcanonical documentはfieldを両sideで同一に並べる。
- Custom `<pre>` source diffはnavigation、large-document rendering、synchronization、accessibility、
  diff interactionを再実装するため不採用。

## 8. Local session transport

**決定**: `@eslint/config-inspector`の基盤であるlocal-tool frameworkの`devframe` 0.7.5をsession hostとして
採用し、devframe認証を無効化する（`auth: false`。2026-07-22のowner決定、spec.md § Clarifications
Session 2026-07-22、Constitution § Quality and Safety Standards）。CLIは`devframe/adapters/dev`の`createDevServer`でhostを起動する:
devframeがloopbackの`localhost`へbindし、build済みNuxt SPAを`cli.distDir`（`dist/public`）から直接配信し、
session APIを、`defineRpcFunction`で宣言してdefinitionの`setup`で登録するdevframe RPC functionとして
担う。同じchannelにはdevframe自身のbuilt-in — `devframe:agent:*`、`devframe:rpc:server-state:*`、
`devframe:streaming:*` — もframeworkが無条件に登録する。Productはそれらにagent tool、shared server
state、streaming channelを一切登録せず、editor/finder helper（`devframe:open-in-editor`、
`devframe:open-in-finder`）はこのproductがimportしないopt-in recipeである。Port/host解決、SPA
fallback付きstatic配信、RPC channelはproduct codeではなく
devframeのpolicyであり、browser openingはproductがstartup opener — macOSのChromium tab再利用を
`open` packageのhelperの前段に置く — を通じて所有し、devframeの
bundled openerは無効化される（§ 3）。ただしstatic配信の前段にclosedなproduct所有の要素が1つある:
`/skills/**`、`/instructions/**`、`/mcp/**`、`/rules/**`、`/permissions/**`の`GET`/`HEAD`を`/`へ書き換えるrewrite（shipped kind detailごとに
1 route family）で、extension-guardedなfallbackがserveできない
detail deep linkにdevframe自身のhandlerがshellをserveできるようにする(§ 3 h3行)。Session保護はloopback bindingとする: productはper-session tokenも、独自のOrigin/Host分類も、
hand-written HTTP routerも追加しない。devframeはWebSocket upgradeへ自身のorigin gateを適用して
おり、それがproduct所有のcheckを置かない理由である。ただしこのgateは以下のexposureを有界化する
ものではなく、そう読んではならない。Gateは`Origin`を持たないrequest（非browser client）と、
loopback判定に一致するhostnameのoriginをすべて許可する。そしてその判定はspelling testである:
`127.`で始まる、または`.localhost`で終わるhostnameは通過するため、攻撃者が登録した
`127.<label>.example`から配信されるpageは許可され、全session functionへ到達する。Gateが止めるのは
通常のremote originであって、hostnameを自分で選んだpageではない。ここから狭めることもできない:
devframeの`allowedOrigins`はallow-listを広げるだけで、`false`はgate自体を取り除く。残余
limitationは防御ではなく文書化する: Inspectorの実行中、他の
local processと、DNS rebinding経由のmalicious web pageが無認証sessionへ到達し得る（QR-003）。Session APIは
引き続きSource-relative pathとclosed commandだけを公開し、絶対filesystem pathを使わない。

Global consent前に、lexical/no-I/O path previewをsession API上で、serverが保持しopaque `previewId`で識別する
唯一のrecordとして公開し、confirmationがそのIDを指名する。このsectionの固定contractとして、new unconsented previewごとにoperation-local input captureを1つ作る。
`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`をこの順で1回ずつreadし、`undefined`だけをabsentとする。1つでも
absentならimport済み`node:os.homedir()`を1回callして、active-platform `node:path.join`と固定suffix `.copilot`、
`.claude`、`.codex`を使う。`HOME`/`USERPROFILE`を独自選択せず、capture中にexistence checkを行わない。正確なraw
`lexicalRoot`、escaped display、immutableな`TraversalPlan` schema/selection-policy/canonical programを、serverが保持する
そのrecordに保持し、`allowlistVersion`/`traversalPlanVersion` pairで同梱planへbindする。Enableは
stored raw valueだけを使い、display textから逆変換せず、environmentを再readしない。 Session-keyed consent digestは持たない。Previewはserverが保持しopaque `previewId`で識別する唯一の
recordであり、enableはそのIDを指名する。
また、ordinary responseはbrowser stateを変更する前に、正確なrequest token、capture済み
`clientDataEpoch`、adopt済み`sessionId`、`globalContentEpoch`、null disable fenceに対してcheckする。
各SessionSnapshot/FileDetail requestはさらにowning sequenceのgeneration — session snapshotは
`repositoryGeneration`とnullableな`globalGeneration`を公開する — と、該当時はfileのSource-relative Pathをcaptureする。
Old snapshotは無視し、いずれかのsequenceのnew generationをadoptする前にepochをincrementし、
そのsequenceの置換されたgenerationが所有するdetail、comparison、editor objectをabort/disposeする。他方のsequenceの
commit済みviewは有効なままとする。Equal-generation snapshotはcurrent tokenと一致する場合だけ、
FileDetailはepochとowning sequenceのgenerationが一致しreadable fileがまだ存在する場合だけadoptする。
Serverはcoordinator lock下で各response envelopeのsequence generationとpayloadを一緒にcaptureする。
自動または明示的な各scanにはopaqueな`scanRequestId`も付与する。Source progress、rescan admission response、
successfulなsource-scan generationは同じIDを持ち、nullを使うのはbootstrap generationだけであり、Global disableは
generationを一切commitしない。Clientはcurrent
statusとrender済みinventoryのcompletionをadmit済みrequest IDへbindし、以前のstatus/generationを拒否する。

Preview parse/transportのcapacityはNode.js、browser、実行環境に従い、proposed rootや
escaped displayへproduct独自のbyte上限を設けない。独立したliveness RPC/probeは定義しない。
devframeは問い合わせなしに自身のconnection-status signalでhost lossを報告する。SPAはvisibility、
focus、unload listenerを設置せず、page-lifecycle eventをpurgeまたはrefetchのtriggerにしない。
Polling interval、request timeout、retry timer、memory leaseを定義しない。CurrentなRPCでtransportが報告する
channel lossまたは解釈できないprotocol、session mismatchでは、ended viewをrenderする前に
`clientDataEpoch` guard付きshared purgeを実行する。Ordinaryなhandler/serialization/delivery failureは
そのrequestだけのerrorである。Global-disable clickではrequest dispatch前に同じ
purgeを実行し、ordinary responseでgreater Global content epochまたはnon-null disable fenceを観測した
場合もrender前に繰り返してclient-side `RecoveryViewState`へ入る。Purgeはstate ownerとrender済みsurfaceが保持するDOM/DTO/editor
stateを除去してlate responseによるcontent復活を防ぐ。Request tokenがcurrentでないsettlement、または
capture済み`clientDataEpoch`がpurgeより古いsettlementは、late rejectionを含めno-opとする。Transport
signalにはproduct定義のdelivery deadlineがないため、continuously idleでvisibleなpage上のprocess
lossにはproduct定義のwall-clock検出保証を設けない。

Non-null fenceならsession routeはexactでcontrol-onlyな`GlobalFenceRecoverySnapshot`を返す。
Null fenceならnormal full `SessionSnapshot`を返すが、recovering clientはcontrol/error projectionだけを
採用してinspection graphを破棄する。Recoveryはpurge済みIDを保持・比較せず、返された`sessionId`を
new baselineとして採用する。Active consent中はそのviewからdisableを直ちに利用でき、preview routeが
exact frozen previewを返した後だけbrowser persistenceやenvironment再readなしでretry controlを再構築
できる。Recovery viewはfenceがnullでnormal full snapshotを取得可能な場合だけResume inspectionを提示
する。この明示actionはmatching sessionを再取得してdefaultのfresh inventory summaryを構築するが、
old detail、comparison、editor、selection、filter、authored sourceを復元しない。後の
detail/comparison openはfresh sessionから改めて取得する。このrecoveryはGlobal-disableの
purge/epoch/fence pathがtriggerし、page visibilityまたはnavigationはtriggerにしない。

Session APIは、明示的なdetail requestにだけ完全なauthored contentを返す。Bundled SPAはそのcontentを、何が含まれ得るかについての注意書きも
前に立つ確認stepも持たずに表示する。保持・送信・resetすべきacknowledgement stateもnotice stateも存在しない。通常のscope限定route、file/Source、generation cleanupは中央purgeではなく、
Global disableは明示的なfull-purge例外である。

Browser attempt前に、解決済みlocal origin `http://localhost:<port>/`をhostのready callbackから起動元
terminalへ正確に1回表示する（FR-001）。それがどのportかはdevframeの解決に属する: CLIの`--port`は
希望を述べるだけで、devframeは自身のdefaultと同じ方法でそれを解決する — 空いていればそのport、
塞がっていれば別port、0なら空きportの自動選択 — ため、bindされたportを述べるのは表示originだけであり、
誰かが確保しているportを奪ってはならない起動は`--port 0`を渡す。
Browser openingはstartup openerを通じたproductのpolicyである（§ 3）:
CLIのnegatableな`--open` flag（default true）は、hostがlaunch lineの後にそれを実行するかを決め、
devframeのbundled openerは無効化されてproductのopenerだけが動く。macOSでは、起動中のChromium系
browserが既に持つsession tabを、`open`のhelperが新しいtabをspawnする前にfocusする。spawnされる
どのprocessも固定の引数とその解決済みoriginだけを受け取り、inspection由来のcontent/pathを決して
受け取らない（FR-022）。固定一覧に基づく再利用の選択を超えて、Productは解決されたhandlerの
browser family/versionを選択・probe・検証しない（FR-001）。Automatic openのdisabled、unsupported、失敗は
serverを継続させ、いずれの場合も表示済みoriginがfallbackである。

**理由**: Hosting policy — port/host解決、SPA fallback付きstatic配信、RPC transport — は、
maintainされたdevframe layerが既に所有しenforceするpolicyである。素の`node:http`上での再実装はその
layerを重複させ、productに独自のrouterと認証機構の所有を強制していた（憲章原則I、シンプルな実装の方針）。
`@eslint/config-inspector`は同じ形 — auth gateなしのdevframe上のtrusted single-user localhost inspector —
で出荷されており、devframeはまさにそのclassのtool向けに`auth: false`を文書化している。devframeが
そのpolicyを所有するため、productはhand-written API router、per-session capability module、
static-assets manifest generatorのいずれも持たず、それらのcontract testも持たない。Genericなrequestごとのerror boundaryも持たない — productはlog-content ruleもsanitized error
envelopeも定義しない — ため、product所有のhost codeはdevframe app definitionだけである。失敗したRPC handlerのerrorはdevframeがserializeする形のまま
devframe channelを渡り、sanitizer wrapperを持たない。Trade-offは明示的でownerが決定した
（2026-07-22）: devframeのdefaultであるinteractive OTP認証なら他のlocal processやDNS rebinding pageから
sessionをgateできるが、ownerはそのdefaultよりconfig-inspector parityを選んだ。したがって無認証loopback
hostの残余exposureは、sessionが起動userの既に読める内容だけを配信するというtrusted-workspace modelに
有界化された、文書化済みlimitationである（Constitution § Quality and Safety Standards、QR-003）。Consentが指名するserver保持frozen
previewは引き続き、hostがpathへ触れる前にuserが見たlexical rootを証明し、preview構築中のNode.jsまたはbrowserの
recoverable failureは未表示valueをauthorizeせずfailする。devframeのconnection-status signalとguard済みの
current RPC outcomeは、dataを永続化せずproduct timerを定義せずにsession lossを公開する。Page lifecycleは
session-loss signalではなく、purgeもrefetchも行わない。Discardされたdocumentは自身のreferenceをreleaseし、
bfcache documentが保持するのはaccepted trusted-workspace modelのもとで同じuserが自身のmachine上で見た自身の
fileだけである。Continuously idleでvisibleなpageには意図的にproduct定義のwall-clock process-loss保証を
設けない。
Recovery DTOはSourceが0個でもall-failed Global consentを可視に保ち、previewを分離することで大きくなり得るdisplay
payloadをsession retrievalごとに繰り返さない。

**検討した代案**:

- Hand-written transport — 素の`node:http`、closedなhand-written router、URL fragmentで渡して全API
  requestで要求するper-processの256-bit capability token、exactなHost/Origin enforcement、
  `Cache-Control: no-store`、build-recorded inline hashから導出するCSP — は採らない。
  devframeが所有するhosting policyを再実装することになり、それが防御する
  browser-origin/DNS rebinding exposureは、無認証loopback hostの文書化済み残余limitationとして受け入れる。
- devframeのdefaultであるinteractive OTP認証はconfig-inspector parityのため不採用。devframe自身が、
  printed one-time-codeのround-tripが邪魔になるだけのtrusted single-user localhost tool向けに
  `auth: false`を文書化している。
- 一般的な`--host` supportとCORSはremote accessがscope外のため不採用。Hostはloopbackの`localhost`だけへbindする。
- RPC channel上のproduct定義push/liveness protocolは不採用。devframeがhost lossを既に報告し、全ordinary
  responseにrequest-token、client-epoch、session、Global-epoch、fence guardを適用する。Support対象の
  single-browser-session useには別tabをproactiveに観測するrequirementがない。
- Project-ownedなbrowser-launch adapter（ambient environment allowlist付きの固定`/usr/bin/open`/`xdg-open`
  spawn）は採らない。Cross-platformのhelper解決はmaintainされた`open` packageが既に所有するpolicyである
  （§ 3）。そのfallbackの前段に立つmacOSのtab再利用はこのようなadapterではない: handlerを一切解決せず
  platform mapも持たず — 起動中の固定一覧applicationを1つ操作し、それ以外のすべての場合を`open`へ
  渡す — spawnされるどのprocessも固定の引数と解決済みlocal originだけを受け取る。

## 9. Atomic generation、rescan、実行環境依存capacity

**決定**: Repository scanは自動開始し、session snapshotでprogressを公開し、以後のRepositoryまたはenabledな
member Global Sourceのscanは明示的user actionだけで行う。自動Repository command前にlegalで空のzero-I/O
bootstrap generation 0を同期作成する。これには、captureした`process.cwd()`または任意指定の単一`--root`から選択した、
idleでreadを認可しないRepository Sourceを正確に1つ含め、boundary admissionとworkがqueueされるまではsource progressを
nullとする。自動または明示的な各scanにopaqueな`scanRequestId`を割り当て、そのSource progressとsuccessfulな
source-scan generationに同じIDを保持する。Nullを使うのはbootstrap generationだけとする。RepositoryとGlobalの
inspectionはlifecycleが独立しているため、それぞれ独立したatomic generation sequenceを保持する: Repository
sequenceはbootstrap generation 0から始まりRepository scanだけで進み、Global sequenceはそれを作るenable
commit — Global generation 1 — からdisableが破棄するまでの間だけ存在する。Disableはgenerationをcommitしない
ため、disable用のtransaction kindもnull-IDのdisable generationも存在しない。再enableされたGlobal sequenceは
generation 1から再開し、incrementされた`globalContentEpoch`がeraを区別するため、disable前のstaleなGlobal
referenceがre-enable後のrequestを満たすことはない。

単一coordinatorが全`GlobalEnableOperation`、Repositoryまたはmember Global Source scan、Global調査を無効にする
transactionをserializeする。Product独自のqueue、slot、concurrency capacityは公開もenforceもしない。通常scanはFIFOで
実行する。Global disableはpriority security barrierとし、dispatch前にbrowserがfull client-data purgeを実行する。Non-no-op
barrierの最初のaccept時、command epochと`globalContentEpoch`をatomicにincrementし、non-null
`globalDisableInProgress`をinstallし、publication authorityをrevokeして新しいGlobal-enable/Global-rescan commandを拒否する。
全inspection-data routeは`409 global-disable-pending`を返し、session routeは`GlobalFenceRecoverySnapshot`だけを返す。
各inspection-data successはcaptureしたepochへbindし、最終publish時にcoordinator lock下でepoch不変かつ
fence nullを再checkする。Disableを実行したpageは自身のdisable responseと後続session fetchからfenceを知る。
独立したliveness responseまたは別tab用projectionは存在しない。Active
consent/controlが存在する場合だけ`globalControl.state: disabling`としてpending/retry arrayをemptyにし、operation-local initial
enableだけならcontrol projectionはnullだがfenceを表示する。Active uncommitted workとqueued Global workを
abort/discardし、terminal success後だけ中断Repository commandをrequeueする。
PublicなGlobal consent/control/Source stateのいずれかがあるsuccessは`remove-active-state`でGlobal generation sequence全体と
そのSourceを破棄し、何もcommitしない。Repository sequence、そのgeneration、そのIDには触れない。
未公開operation-local initial enableだけが`cleanup-only`を使い、committed stateを何も変えずにfenceをremoveする。Repeated disableは同じbarrierへjoinする。
Accept後のfailureではprocessを維持しながらfence、失敗requestのerror、retry/join pathを保持し、unrecoverable
cleanupはrestartを必要とする。Accept前failureまたはtrue no-opはfenceをnullのままとする。最後のcoordinator lock下
operation-ID/epoch/state checkによりenableの`202`またはdisableへ負けた`409`を決め、late workによるGlobal state復元を防ぐ。

各scanはowning sequenceのcurrent generation — Repository scanはcommit済み`RepositoryScanGeneration`、Global scanは
commit済み`GlobalScanGeneration` — から開始してreplacementを別に構築する。Complete result、または問題が
file-confined diagnostic（FR-028）だけのpartial resultをそのsequenceの次generationとしてatomic commitする。Commitは
そのsequenceの旧detail/comparison/selection/editor stateだけを
staleにする — file identityはSource-relative Pathであり、commitを跨いで安定である。
他方のsequenceのcommit済みstateとviewは有効なままとする（FR-030）。Carry-forward機構は持たない。
Global commitがRepository inventoryをcopyして維持する必要は、そもそも生じない。明示rescanのfatal failureは全uncommitted
outputを破棄する。最後のsuccessful snapshotはSource-keyed stale-failure entryとともに表示し続け、root自体を
readできない場合はactionableな`root-unreadable` diagnosticを、unexpected failureでは失敗requestの
error messageを参照する（FR-030）。Startupのfailureにはrequest ownerが
ないためprocess top levelへ到達する。Tool別Global rescanのfatal failureはその
Sourceのconsent、accepted root context、最後にcommitしたgraphをretry/disable用に保持する。

Session-wide consent 1件で4 member全てを固定し、frozen preview entryごとに`GlobalToolControl`を1つ持ち、selectorは
持たない。Consent後validationは、missingまたはreadable directoryではないconsent済みrootを、他のmemberを
blockせずそのtoolのabsent/failed outcomeとして記録する（FR-014）。1つのtoolのrootに限定されない
unexpected failureは全transactionをowning request
boundary経由でabortする。Validationがrootを1つもadmitしない場合、`active-no-job`はretry/disable用controlを保持し、
Source/job/generationをpublishしない。1つから4つをadmitした場合、provisional batch scan 1件が各rootの独立したSourceを
正確に1つのGlobal generation — Global sequenceを作るenable commit — でまとめてpublishし、tool別commitは観測できない。Active-consent retryのvalidation/admissionは
operation-localで、新たにvisibleとなるのは`globalEnableInProgress`だけとし、`pendingTools`、`retryableTools`、`batchStatus`、
Diagnostic、control、Source、prior snapshotはexactなpre-operation projectionを維持する。Atomic queued acceptanceだけが
`pendingTools`をqueued/running scanのadmitted subsetへ変更し、`active-no-job` dispositionはpending workを作らずevaluated controlを
commitする。Initial enableはatomic activationまでcontrol projectionを持たず、その後はaccept済みbatchのtoolだけをpendingとする。
したがってactive controlのunvalidated toolをpublicにretryableとせず、全work完了後のretryはpreview-gatedとし、disableは直ちに利用可能とする。

Inspectorはfile-size、file-count、aggregate record、graph、Diagnostic、parser message、response-size、queue capacity、
scan-timeのproduct独自limitを定義しない。実効capacityはNode.js、parser/editor engine、browser、OS、filesystem、実行環境に
従う。これらのlayerからの
unexpected failureへdomainはcapacity/resource/operational causeを割り当てない。Trigger ownerへ
propagateし、attempt result/generationを返却もcommitもせず、request所有boundaryがsurviveする場合は以前のsnapshotを維持する。
このfailureは`partial`を決して認可しない。Routeはcommit済みDTOを一度だけserializeし、silent truncateしない。
Process-level OOM、kernel termination、無期限にpendingとなるuncancellable filesystem operationはapplication contractでは
recoverもboundもできない。

Disable、shutdown、generation replacementはelapsed timeと無関係にpublication authorityをrevokeする。Revoke後にsettleした
resultは破棄し、取得済みresourceはunderlying operationがcleanupを許す時点でreleaseし、revoked dataをsessionへ戻さない。
Session RPC workはNode.js上でscheduleされ、devframeはchannel lossを報告できるが、runtime exhaustionや
blocked/terminated processをsurviveするproduct probe/timerは存在せず、そのようなwall-clock保証を主張しない。

**理由**: Serializationとatomicなper-sequence generationはlost updateとold/new result混在を防ぐ。Repositoryと
Globalはlifecycleが独立している — Repository Sourceは常に存在し、Global sourceはenableからdisableの間だけ
存在する — ため独立したsequenceを保持し、commitが他方のsequenceのstateをcarryやinvalidateする必要は
なく、carry-forward機構自体が不要である。Capacityを実runtimeから
導くことで、任意のproduct数値をportableなsafety guaranteeとして提示しない。Ordinaryに報告されるerrorはdomain causeを
発明せずexecution lifecycleを維持し、application制御外のfailureは明示的なplatform limitationとして残す。

**検討した代案**:

- Automatic watch/rescanはFR-030が要求しないimplicit readとstale-state raceを作るため不採用。
- Active resultのincremental mutationはconsumerがgeneration混在を観測するため不採用。
- Per-source commitのconcurrent実行は、各sequenceの単一generation numberとgeneration-scoped IDにconflict-proneな
  commit-time rebaseを必要とするため不採用。
- RepositoryとGlobal inspectionが共有する1つのsession-wide generation sequenceは、2つのlifecycleが独立している
  ため2026-07-22に不採用となった。全Global commit — およびdisable — に、触れていないRepository inventoryを
  carry forwardさせ、data変更が正当化しないRepository viewのinvalidationを
  強制していた。
- Product独自のbyte、item-count、parser、queue、deadline capは、実効capacityがNode.jsと周辺実行環境に属するため不採用。

## 10. 検証戦略

追加の固定fixtureは次を検証する。Browserはscan commitとdisable barrierをまたいでsnapshot/detail deliveryを一時停し、
epoch、owning sequenceのgeneration、token、file existenceが合わないlate responseを拒否する。Previewはraw/display escape collisionを
作り、enableがstored raw rootを使うことを証明する。Global exact targetはrootをenumerateせず、fixed subtreeは許可された
descendantだけに触れ、隣接pathへのI/Oは0とする。Raw-path fixtureはNFD spellingのentryをraw nameで
readし、そのraw綴りをSource-relative Pathとして公開することを検証する。Whole-character fixtureは全support
formatでastralとcombining sequenceをfieldの値に置き、extractionとJSON transportを
経ても変化しないことを要求する。これが、各層がUTF-16 code unitではなく文字単位で動くことの証明になる。Multi-provenance fixtureはtool/kindごと正確に1 recognitionであることを証明する。Package fixtureはpackage payloadとpackage-manager生成symlink/`.cmd`/`.ps1`
launcherを分け、その正確なdeclared Node targetとargv-only bodyを検証する。Package fixtureはさらに必須の
2つの`dist/` entryとpacked manifest fieldを扱い、byte/item-count境界をassertしない。Coordinator fixtureは
slot-capacity fixtureなしでFIFO serialization、disable priority、`202`/`409` race disposition、cancellation、late-result rejectionを
検証する。Injected recoverable Node.js/parser/editor/transport failureはsafe failure、atomic publication、responseをtruncateしない
ことを証明し、file sizeとcollection cardinalityがproduct validation ruleではないことも確認する。Process-level OOMとkernel
terminationはin-process recovery testのscope外とする。Diagnostic fixtureはclosedな
`file | source` scope unionをenforceする。File scopeはowning `sourceId`と`sourceRelativePath`を持ち、
source scopeはowning `sourceId`だけを持って`sourceRelativePath`を持たない。Pathlessなscopeは存在せず、
source scopeのDiagnosticが表示またはordering fieldを満たすためにpathを捏造してはならない。

**決定**: Vendor conformance fixtureとnegative near-missに加え、symlink-transparent read、encoding、recoverableな環境failure、literal
credential、環境変数参照、import、executable declaration、malformed formatのfixtureを保守する。
Pure recognizer/parserとliteral-display DTO、session API contract、source boundary integration、pack済み`npx`、
100k/500 performance case、4つのPlaywright user storyをtestする。SC-008は
[accessibility受入contract](contracts/accessibility-acceptance.ja.md)のWCAG 2.2 Level A/AA全55行applicability matrixと
客観的pass ruleに対し、criterion固有のstable check IDと指定済みautomated、keyboard、manual evidenceを組み合わせて評価する。
Closed manual matrixはpacked candidate、3つのsupported OS/browser/assistive-technology cell、responsive/visual
profile、workflow state、input profileをfreezeし、applicableな全cellを記録して、frozen value変更時は全manual checkを再実行する。
Axeのseverity結果だけを
受入evidenceとせず、Applicable行のfailureをpassへ変更できない。SC-003、SC-004、SC-005、SC-007は、
stable case ID、required-class membership、客観的expected outcome、fixture/builder reference、fixtureごとのdigestを持つ
version付きでcheck-in済みのrelease-evidence fixture manifestを共有し、release candidateごとの正確で非ゼロなdenominatorを
freezeする。Canonical manifest digestと実行済みcase IDをevidence recordへ入れる。Contractはmissing、duplicate、undeclared、
unexecuted、digest-mismatched case、required classの空集合、fixture欠落、declared minimum未満のdenominatorを拒否する。
黙ったdelete/reclassifyを認めず、caseのremove/reclassify、required-class定義の変更、expected outcomeの変更ではmanifest versionをincrementして明示的なreviewを受ける。Fixture byteだけを変更する場合は、影響するfixture digestとcanonical manifest digestを更新する。どちらの変更も新しい直接比較不能なmeasurement setを開始し、digest driftだけでdenominator semanticsの変更を認可しない。Automated contractはtable-drivenなprevious/current manifest revision pairでこれらのtransition ruleを検証し、reviewer stateを推測しない。実際のrelease diffについては、T1062が初回作成またはprior/current version、変更したcase ID、required-class定義またはexpected outcome、明示的なreviewer decision/referenceをbilingual validation recordへ記録する。これによりmaintained suiteを
進化可能にしつつ、releaseがdenominatorを暗黙に縮小することを防ぐ。Registry fixture suiteは
全behavior/rule/strategy/source ID、相互evidence link、正確なsection anchor、英日parity、Inspector matcher
registryだけがreadを認可できることをvalidateする。Matcher fixtureはclosed token grammarに違反するRepository selector program（例: 隣接する
recursive-directory segment）を拒否し、exact/direct-child/explicit descendant inventoryを区別し、先頭の
`ANY_DIRECTORIES` segmentがvendor traversal factをsatisfiedにしないことを証明する。Targeted regression fixtureはCopilotの別々のVS Code/CLI/Cloud lookup表、
選択した正確なRepository rootだけのClaude project settings、non-recursiveなCodex rule directory、plugin activation対
authored manifest inventory、FR-015からFR-018外へのGlobal read 0件を扱う。
さらに、member Global Sourceが0から4つで各member最大1つ、各Sourceが正確に1つのrootとSource-relative Path
namespaceを持つこと、literal credentialのexact表示、reveal controlがないこと、環境変数を置換しないことを
検証する。Lifecycle fixtureは全4 Sourceの未解決failure共存、Source別clear/replace/removal、自動初回failureの
current stateを扱う。Browser fixtureはordinaryなrequest rejectionがrequest-localに留まること、transportが報告する
channel loss、session mismatchを伴うport再利用、page-lifecycle listener/purge/refetchが存在しないこと、
continuously idleでvisibleなpage上のprocess lossにwall-clock保証がないこと、scan commit/disable barrierを
またぐsnapshot/detail deliveryについてrequest token、`clientDataEpoch`、session、Global epoch/fence、owning
sequence generation、file existenceでlate response/rejectionを拒否することを扱う。macOS、Linux、Windowsでpure Node.js
integration suiteを実行し、symlink-transparent read、broken linkの`file-unreadable` diagnostic、
link cycleでのscan終了、unreadable file、binary content、全byte decode
outcome、missing/unreadableなroot、`partial` commitによるper-file failure分離、最後にcommitした
snapshotへのfatal-rescan rollback、pack後実行を扱う。Local fixture rootとproductの全
socket/HTTP(S)/DNS/SMB/URI/image/remote-reference/MCP surfaceをinstrumentする。発行済みのexactな`localhost` authorityにおける
2つのexactなFR-022 authorized internal loopback class、すなわちpackaged UI asset向けstatic/SPA `GET`/`HEAD`と
local session API channelを別々に分類・検証する。Inspected contentにより、それ以外のFR-022で定義したdirect product-issued outbound request、MCP connection、child process、dynamic evaluation、product-issued
source mutationが発生するとtestを失敗させる。Explicit UNC/server-share/device vectorはfilesystem/DNS/SMB call 0件を証明し、lexicalに
識別不能なmounted/mapped network storageはOS-mediated platform/environment limitationとして別に記録する。Mutation testはread-only/mutation-capableなfilesystem API/flagをinstrumentし、content、length、
identity/link state、mode、mtime、ctime、観測可能なxattr/ACLを比較する。OS-only atime changeは別に記録し、failureにも
proofにも数えない。Failure-path testは、失敗したrequestがsessionを利用可能なまま残し、そのerrorをordinaryに表示する
ことを確認する一方、sessionのDiagnostic DTO testでは許可したfieldだけを
保持させる。Cross-surface negative testはInventory、Detail、Comparison、Global control、Diagnostic、Source Condition
Fact、API/CLI output、documentationを網羅し、customization validation、natural-language interpretation/ranking、verdict、
policy/remediation advice、conversion、synchronization、formatting、fixingを一切公開しないことを証明する。

2026-07-17のmeasurable-outcome再確認により、次のobjective protocolを固定する。

- **SC-001**は、20件の独立したfirst-use sessionを使用する。各sessionは、稼働中のInspectorが印字した
  originと標準化task promptだけを与えられた自律agentが駆動する。19件以上が、発見した
  customization file 1件を2分以内に開かなければならない。計測はpromptの提示から、そのfileの
  source/details viewが開いて操作可能になるまでとする。印字されたURLでInspectorへ到達することは
  提供guidanceの一部であり、timerをpauseもrestartもしない。Rootの選択は自動化されたUser Story 1
  testが検証するproduct capabilityであって、ここで計測する操作ではない。登録された全sessionは
  固定分母に残り置換されない。完了を妨げるまたは中断するenvironment/product failureは不成功である。

  人ではなくagentであるのは、初見のparticipant 20名がこのprojectには得られないからである。これは
  この基準が何を立証するか — product自身のguidanceで足りるか — の限界を定めるものであり、runの
  どの記録もそれを明記する。
- **Performance suite**は、内容を変更しないdeterministicな100,000-entry/500-match fixtureを
  非gatingなsmoke pass 1回に再利用する。Timingのthresholdは一切主張しない。測定するには、
  runの前にprocessor型番・image revision・memory・storageを記録した凍結hostを指名する必要があり、
  同じ数値を他所で取ればそれはそのマシンの説明であってこのproductの説明ではないからである。
  このpassが証明するのは、harnessが今もmanifestの宣言的ruleを展開し、buildしたtreeを走査し、
  全entryとcontent digestを再計算できることである。したがってbuilderの変更や紛れ込んだfileは、
  別のrepositoryを黙って測るのではなくpassを無効化する。
- **SC-006**はSC-001後に同じ20 sessionを、以前の結果にかかわらず同じ指定fileから開始させる。
  3項目 — source、認識するtool、file type — を2分以内に提出し、check-in済みground truthと
  すべて一致しなければならない。部分点は無く、18件以上が成功しなければならない。その後20件
  すべてがcomparison taskとpersonal-setup taskを同じノーヒント方針で実施し、SC-001のdiscovery
  観測と合わせて4つのprimary workflowを覆う。

  Safetyの側こそ自動runが最もよく測る。Sessionは禁止された作用を、自身のbrowserが発したrequestと
  被検査treeの状態から観測する。同じ性質は自動化されたFR-022およびUser Story suiteが各自のgateで
  assertしており、そのための独立したinstrumentation、proxy、reviewer processは存在しない。

**理由**: 憲章はpassing testを証明ではなく証拠とするため、objective automationにfull-diff review、
documentation parity check、release tarball inspection、agent駆動のfirst-use
runの固定scoringを組み合わせる。

**検討した代案**:

- Snapshot-only testはnegative security behaviorを証明しないため不採用。
- Unit/contract coverageなしのbrowser testは遅くfailureの特定が難しいため不採用。
- Coverage percentageだけではnamed boundary/non-execution invariantを示せないため不採用。

## 11. 仕様再確認の決定（2026-07-17）

**決定**: Phase 0設計を2026-07-17のclarificationと照合し、次のruleを後続の全design artifactへ引き継ぐ。

1. Admitしたmember root 1つをmember Global Source 1つとし、Codex、Claude、Copilot、共有agent homeごとに最大1つ、
   1 sessionで0から4つとする。
2. 読み取り可能なsource、表示対象の宣言済みmetadata、comparison contentは記述済みliteral valueを維持する。
   Credential maskingとreveal workflowは持たない。調査対象content内の環境変数参照はliteralのまま解決も置換も
   せず、文書化済みの3つのtool-home変数はGlobal rootの特定だけに使う。
3. 明示的な再scanがfatalに失敗した場合、partial outputを含む未commit outputをすべて破棄し、最後に正常
   commitされたsnapshotをSource別stale-failure entryとともに残す。そのentryは決定的なDiagnosticまたは
   失敗requestのerror messageを参照し、errorはordinaryに報告される（FR-030）。正常scanはown Sourceのentryと
   参照先failureだけをclearし、無関係なcommitは両方を保持し、Source除去はremoved Sourceの両方をclearする。
   同じSourceの再fatal rescanはそのSourceの両方だけを置換する。
4. Generation 0はreadを認可しないRepository Sourceを既に含む。決定的な自動failureはprovisional resultをpublishせず、
   startupのthrow/rejectionはsurvival保証なしでprocess top levelへ到達する。初回Global enableは固定のall-tools consentと、
   admitted-subset batch 1件を使う。決定的なall-rejected outcomeは`active-no-job`を返す。Non-carveout throw/rejectionはREST
   Unexpected failureはtransactionをabortし、そのrequestをそのerrorでordinaryに失敗させ、subsetを一切commitしない。
   Purge済みclientはselectorなしでretryする前にactive control viewとexact frozen previewをrecoverする。
5. Cross-sourceの表示、filter、diagnostic用語はSource-relative Pathとする。Repository-relative pathは、選択した
   Repository rootをrootとするRepository Sourceだけに使う。
6. SC-001とSC-006はSection 10のobjective protocolを、participant cohortではなく20件の独立した
   自律agentセッションに対して使う。測るのはproduct自身のguidanceが十分かであり、そこから得た
   evidenceはhuman-subject studyではなくagent駆動runとして記録する。

**理由**: これらの決定により、multi-root Source、mask/reveal、fatal result、path用語、outcome測定の
曖昧さはいずれも存在せず、productのread-only、local、non-executing boundaryを維持する。

**検討した代案**:

- Multi-root Global SourceはSource ownershipとpathの意味を弱めるため不採用。
- Credential masking、reveal state、environment substitutionは記述済みevidenceを変更するかambient valueを
  混入させるため不採用。
- Fatal scanの未commit outputをpublishする案と、old snapshotをcurrentとして無表示で残す案は、generationを
  混在させるかfreshnessを誤表示するため不採用。
- 初回scan/enable失敗をstaleにする案は、以前にcommit済みのSourceをrefreshできなかった事象ではなく、current
  snapshotが最後の正確なcommit済みstateのままであるため不採用。
- Global fileへrepository-relative pathを使う案は、Global Sourceが選択したRepository rootをrootとしないため不採用。
- Mutableかつ非公開のreference environmentは、別maintainerがprotocolを再現したりbaseline変更を解釈したりできないため
  不採用。Thresholdの主張には誰も指名していない凍結測定hostが要り、他所で取った数値はそのマシンの測定である。

## 12. 仕様再確認の決定（2026-07-19）

**決定**: 最終analysis remediationをplanningとimplementationへ引き継ぐ。

1. Startup時のbrowser openingを、許可するproductのchild-process surfaceの一方とする（もう一方はreaderが明示的に要求するopen-in-editorである）: macOSでは固定の
   process一覧probeと、OSの`osascript` automation hostで実行する固定のtab再利用script、それ以外では
   固定startup OS browser helper（§ 3）。spawnされるどのprocessも固定の引数と表示済み
   loopback originだけを受け取り、inspection由来content/path、authored value、user-supplied commandを受け取らない。
   各childはlaunch environmentを変更なしで継承する: productはどの環境変数にもinspection由来の値を書き込まず、
   `xdg-open`が`$BROWSER`を参照するようにplatform helperがuser自身の設定を尊重するのは、inspection由来の
   inputではなくuser preferenceの適用である。Ambient valueとSource rootのlexical一致はprovenanceを変えず
   authorityを与えない。Discovery、read、parse、display、
   comparison、relationship処理はchild processを開始せず、`--no-open`、unsupported、failure pathでも利用可能なmanual URLを残す。
2. 各supported `(tool, kind)`がclosedなrelationship kindとadmission済みsource-form applicabilityを所有する。
   Relationshipは、そのkindが維持管理するpresentation-allowlist rowに属し、かつactualなadmission済みsource formの
   exact extractorがそのauthored occurrenceを認識する場合だけserialize/displayする。どちらかのgateを満たさないものは
   完全なsource text内だけで見えるままにし、推論したりsource form間でpromoteしたりしない。Kindの宣言はこのgateを
   通らない。Skillの宣言はfileが書いたkeyであり、authored keyの集合は閉じていないからである。
3. Dependency再確認はplanning gateとする。Packageまたはversion変更をacceptした場合、dependency baselineを記載する英日両方のdesign/task
   artifactをすべて同期し、implementation前にplanningとtask generationを再実行する。ただしRenovateが
   自動mergeする更新は例外であり、それはci.ymlがgateする。
4. Origin-file-less hosted/runtime inputはスコープ外とする。製品は見つけたカスタマイズファイルを
   報告する。どのfileも起点にしないbehaviorはvendor自身の文書に属し、それを説明するsurfaceは持たない。
5. Maintainer teamがinitial-releaseのfirst-use評価を担当し、
   通常のcontributorへ義務を負わせない。
6. `engines.node`をNode 24/26 runtime compatibility range全体とし、正確な6つのfloor jobをlower-bound certification sample、
   Active LTS Node.jsをdevelopment/build baselineとする。Pinした3つのPlaywright revisionはautomated browser-certification baselineであり、
   startup helperは未検証のOS default handlerへ委譲して表示済み/manual-open fallbackを常に残す。
7. RepositoryとGlobalは独立したgeneration sequenceを保持する。InitialまたはretryのGlobal admitted-subset
   batch commitはGlobal sequenceだけを作成または前進させ、自sequenceのviewだけをinvalidateし、
   Repositoryのstateには決して触れない。
8. SC-008は維持管理する英日55行のWCAG 2.2 Level A/AA applicability matrixを使う。各criterionのexpected observationを
   stable check IDへbindし、closed manual matrixではapplicableなlocale/platform/viewport/mode/scenario/input cellの
   samplingを禁止する。Applicableな全行、全Not-applicable rationaleの再確認、4つのkeyboard workflow、必須responsive
   variationをすべて合格とし、`validation.md`と
   `validation.ja.md`へ0件ではないApplicable-row denominator、Applicable rowのfailure 0件、完全なevidenceを記録する。
   Axeだけまたはseverity基準による免除はない。
9. Diagnostic scopeはclosedな`file | source` unionとする。`sourceRelativePath`を持つのはfile scopeだけで、
   source scopeはpathなしの`sourceId`を持ち、pathlessなscopeは存在しない。別の
   outer-boundary error entityは存在しない。Unexpected failureはordinaryに報告され、Diagnosticには決してならない。

**理由**: これらのruleにより、既存security/documentation parity requirementを弱めず、child-process boundary、
presentation scope、performance denominator、runtime-fact model、participation ownership、compatibility/certificationの分離、
dependency baselineを独立にtest可能にする。

**検討した代案**: Browser launchをcustomization由来executionへ含める案、任意authored keyからmetadataを推論する案、
interaction targetをtrace不能なplan-only goalのままにする案、`package.json`だけでversionをpatchする案は、いずれも
矛盾または第2のundocumented contractを作るため不採用。

## 13. Analysis前のordering決定（2026-07-19）

**決定**: 次の4つの明示的dependency gateからimplementation taskを再生成する。

1. Setupはbyte衛生を宣言的に所有する: `.gitattributes`がline endingをnormalizeし、`.editorconfig`が
   editor慣習を宣言する。Code formattingはPrettierのものであり、ローカルとCIの`format:check`がゲートする。
2. Setupは、package command、tsdown設定、CI job、runnableなSetup checkpointが依存する前に、CLI entryと
   参照されるbuild/manifest scriptをscaffoldする。
3. 英日vendor contractは、metadata/relationshipのparser、recognizer、API、UI、acceptance taskが利用する前に、
   supportedな全`(tool, kind)`の完全でclosedなPresentation Allowlist、admit済みsource form、exact source-form
   extractor applicabilityを列挙する。Implementation gateは、既に承認済みの英日designとdigestだけをverifyし、rowを
   authoringもsemantic editもしない。Tuple membershipとsource-form extractionは別々の必須gateとする。Semantic deltaが
   あればdependent workを停止し、全design artifactを同期してplan/task generationを再実行する。後続のevidence reviewは
   driftをreconcileするが、規範的listを初めて定義するphaseにはしない。
4. 元のfamily-vertical order、すなわちSKILL（Skill Metadataを含む）→ Instructions → MCP → Rules → Commands →
   Copilot Prompts → Custom Agents → Configuration/Settings → Output Styles → Marketplaces → Plugin Manifests →
   Hooksを維持する。各familyでUS1 discoveryとUS2の完全で不活性なdetailを完了してから、そのUS3 comparisonを行う。
   その後、Repository-wide Inventory、Detail、Comparison AcceptanceでRepository workを閉じてからUS4 Global
   inspectionを開始し、cross-cutting/release workは最後に実施する。

**理由**: これらのgateにより、設定済みcommandとacceptance testへ既存のprerequisiteと規範的oracleを与え、
確立済みのdependency-safeなdelivery incrementを維持し、無関係な後続familyがproductを拡張する前に各comparisonで
completeなfamilyをvalidateできる。

**検討した代案**: 存在しないentryを参照するrunnable Setup checkpointと、release直前まで文書化しないcode-first
presentation fieldは、checkpointを達成不能にするかimplementation自身にcontractを定義させるため不採用。すべての
comparisonを全familyのdiscovery/detailより後ろへ水平移動する案も、元のtask orderを壊し、独立してtest可能なfamily
checkpointを遅らせるため不採用。Comparisonが自身のfamilyのdiscoveryと完全で不活性なdetailより前に来ることはない。

## 14. Cross-artifact remediation決定（2026-07-19）

**決定**: 残るsafetyとmeasurement contractをtask再生成前に次のとおり固定する。

1. Operational-event語彙は存在せず、そのcontent禁止事項も持たない。ErrorはordinaryにReportする。Session Diagnosticは
   別のactionableなsurfaceとして維持し、fixed CLI help/version、1つのlaunch URL、fixed startup warningはpresentation
   outputである。Session APIはper-session capability valueも認証も持たず、loopback bindingの背後でだけ到達可能である
   （§ 8参照）。
2. `package.json.bin`は`dist/cli.mjs`を直接指す。Import/bind前にvalidateするbootstrap wrapperもoutput manifestも
   存在せず、`verify:package`は必須の2 entryだけをassertする（§ 2、§ 8参照）。Build、tarball、runtimeは
   product独自のfile-size、aggregate-size、asset-count、buffer-size、handle-count境界を設けない。
3. Coordinatorはproduct独自のslot/queue capacityを公開せず、Source scan、Global enable、disableをserializeする。
   Disableはpriority security barrierのままとし、enable/disable raceはlate mutationなしでatomicに解決する。
4. 各scanに`scanRequestId`を付与する。Performance smoke passは自動初回Repository scanを待って
   明示的rescanを1回行い、そのrequest IDを持つstatusとcommitted inventory generationだけを受理する。
5. Disable、shutdown、generation replacementはelapsed timeと無関係にpublication authorityをrevokeする。Late resultを
   破棄し、cleanupはunderlying Node.js/OS operationに従う。Hard kernel-I/O cancellationやOOM recoveryは主張しない。
6. 許可するinterpretationはclosed syntax、認識したkindが公開する宣言についてparserが解決した値の読み取り、frozen-catalog
   classification、documented structural projectionだけとする。Product/documentationの全surfaceでnatural-language
   interpretation/ranking、customization verdict、policy/remediation advice、linting、synchronization、conversion、
   formatting、fixingを禁止する。
7. Product-issued mutationはmutation-capableなfilesystem request/flag全てを意味する。Testはそれらのcallとstableな
   source propertyをinstrumentし、OS-only atime changeはfailureにもproofにも数えず別に記録する。
8. Loopback bindingがAPI access boundaryである。Bundled SPAはauthored contentを、何が含まれ得るかについての
   注意書きも`FileDetail` requestやcomparisonの前に立つ確認stepも持たずに表示し、acknowledgement stateも
   どこにも存在しない。Session APIは認証を持たず、loopback bindingの背後でだけ到達可能で、
   その境界がすべてである。

**理由**: これらのboundaryにより、literal inspectionを維持し、capacityをNode.jsと周辺実行環境のpropertyとしながら、
integrity、cleanup、disclosure、negative-product-scope testの曖昧さを除去する。

**検討した代案**: Pathを含むlog、product独自のresource cap、integrity checkなしのstatic load、以前のgenerationによる
performance completion、timerに基づくphysical I/O cancellationの主張、広いsemantic analysis、literal atimeを
mutationとしてscoreすること、server-sideおよびclient-sideのacknowledgement stateは、platform guaranteeを過大に述べる、integrityを弱める、
またはpresentationとAPI authorizationを混同するため不採用。

## 15. 最終clarification決定（2026-07-20）

**決定**: 最終的なuser choiceを1つのclosed runtime contractとして適用する。

1. `process.cwd()`を正確に1回captureする。`--root`がなければ、その文字列を選択したRepository rootとして使う。
   Absolute `--root`はそのまま保持し、relative optionはそのcaptureに対してresolveする。Filesystem/network I/Oは
   0件で、`chdir`も行わない。Shared lexical root parserもWindows spelling taxonomyも持たず、spellingのsemanticsは
   platform自身のpath処理が所有する。Valueの欠落はGunshiのtyped argument validationが所有し、productの固定
   startup errorを受けるのは明示的なempty valueだけで、反復optionはparserのlast valueへ解決する。Generation 0は
   stableでreadを認可しないRepository Sourceを同期的に含む。
2. Global consentはselectorなしのall-tools action 1件とする。Initial processingは必ずfrozen preview entry 3件全てを評価し、
   retryはcurrent server-side `retryableTools`のcomplete set、すなわちnon-pending unpublished `admitted` controlと
   `retryDisposition: same-preview`の`rejected` controlを導出し、lexicalな`new-preview-required`を除外する。決定的に
   rejectされたentryはsiblingをblockしない。Admitした全rootをbatch
   1件としてscanし、それぞれ独立したone-root Sourceをatomic generation 1件でpublishする。
3. 1つのfileに閉じたfailureはそのfileのdiagnosticとなり、scanは`partial`としてcommitする（FR-028）。それ以外の
   throw/rejectionはattemptをfailさせ、そのerrorはtriggerを所有するboundaryへ通常どおり報告される: accepted jobは
   processと以前のsnapshotを保ち、startup所有のfailureはprocess top levelへ届く。Pre-acceptanceのREST ownerは`scanRequestId`なしの固定
   処理する。
4. admit済みcandidateのNULはbinary/diagnostic-only/`partial`とし、companionのNULは単なるbinaryの事実とする。
   NULを含まない全byte streamはUTF-8 replacement semanticsで1回だけ
   decodeする。`utf-8-replaced`は全`U+FFFD`文字を文字化けしたtextとしてそのまま表示、parse、extract、compareする形で保持し、
   それ自体をcomplete outcomeとする。
5. Filesystem operationを行うのはraw entry segmentだけとし、それを`/`でjoinしたものがpublicな
   classification/display pathである — filesystemは1つの名前につき1つのentryしか保持しないため、
   公開されるpathはすべて曖昧さを持たない。Hard linkはgrouping、primary/alias選択、read-once
   semanticsを持たないordinaryなfileである。
6. Presentation Allowlist rowは承認済みdesign inputである。Implementation gateはrowとそのbilingual digestだけをverifyする。
   Semantic changeではworkを停止し、designを同期してplan/taskを再生成してから利用する。

**理由**: これらのchoiceは、実際のread errorを要求どおりruntime所有に保ちながらoptional pathのabsenceをfatalにせず、
user-selectableなGlobal scopeをなくし、bootstrap identityをread authorityから独立させ、不正なtextをUTF-8 decoderが生成した
正確な形でinspect可能に保つ。

**検討した代案**: 全`lstat` absenceをuncaught runtime failureとして扱う案は、文書化済みfallbackと自動的なexisting-root
selectionを不可能にする。Permission、`open`、`read` errorをdomain outcomeとしてcatchする案はruntime ownershipに反する。
Tool別Global commitは中間subsetを公開しgenerationを複数回進める。Charset guessingはoutputをenvironment-dependentにする。
Normalized display segmentをfilesystem operationへ使う案はboundaryを弱める。いずれも不採用。
