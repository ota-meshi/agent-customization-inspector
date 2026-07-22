# Phase 0 調査: エージェントカスタマイズの調査

[English](research.md)

**調査日**: 2026-07-16、2026-07-18再確認、CLI dependency選択を2026-07-19再確認、product boundary決定を2026-07-20再確認、2026-07-22にtrusted-workspace framingへ再scopeし、devframe local hostへ再基盤化し、ordinaryなerror報告へ再基盤化（FR-040/FR-041削除）
**対象**: 参照architecture、現行互換toolchain、安全なlocal host設計、安全なparseとliteral表示、source/metadata比較、
実行環境に従うscan、公式customization path surface

## 1. Package architecture

**決定**: 全production sourceを`src/`配下に置き（browser SPAは`src/app/`、環境非依存の
serializable contractは`src/shared/`、Node専用CLI/host/inspection codeは`src/server/`）、`tests/`と
1つの`dist/`を持つ公開可能なESM packageを1つ使用する。Client buildはNuxt、Node CLI bundleはtsdownが所有する。
Pure Node.jsの`src/server/inspection/` directoryが調査対象sourceのenumeration/readを全て所有し、CLIとともに
bundleする。Typed inert DTOだけをbrowserへ渡す。
Project-authored executable application codeはすべてJavaScript/TypeScriptとする。Project/dependency package payload内の
executable codeはJavaScriptだけとし、generated HTML/CSS、JSON manifest、documentation、licenseはdeclarative artifact
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
`["dist", "README.md", "README.ja.md", "LICENSE"]`とする。npmが自動で含める`package.json`と
それらのentryがcomplete tarball allowlistである。`package.json.bin`は正確に
`{ "agent-customization-inspector": "dist/cli.mjs" }`とする。tsdown bundleがentryのshebangを保持し、
package managerがinstall時にlinkされたbinをexecutableにする。library APIがないため`main`、`module`、`exports`を
省略する。Install script、runtime download、end-user compileを使わない。Runtime packageは正確な
`dependencies`として宣言し、`npx`に監査可能なversionをinstallさせる。tsdownはproject所有moduleとshared
contractをbundleし、任意のtransitive packageはbundleしない。Directなproduction dependencyはpin済みの
`devframe`、`gunshi`、`jsonc-parser`、`smol-toml`、`yaml`の正確に5つとし（§ 3）、`open`を全dependency
sectionとproduction lock closureから除外する。

全project/dependency tarball payloadとinstall済みproduction graphをauditする。最初にpacked artifactをlifecycle script無効かつ
development dependency省略でinstallし、lockfile/manifestどおりのexact graphを要求する。Recursive auditは
lifecycle/build requirement、`os`/`cpu`/`libc` selector、bundledまたはoptional native package、
native/binary/Wasm extensionまたはELF/Mach-O/PE magic、`binding.gyp`、Rust/C/C++ source、`prebuilds`、package-owned
non-Node shebang、shell helper、executable non-JavaScript payloadを拒否する。その後、同じverified cacheからnetwork
accessを無効にしてnormal lifecycleのproduction installを実行する。Package-manager生成`node_modules/.bin` symlinkと
Windows `.cmd`/`.ps1` shimだけをpayload外例外とし、exact nameはaudit済み`package.json.bin`由来、symlink target/
generated bodyは宣言済みaudit済みNode JavaScript targetへのdispatchとargv forwardだけを行い、extra logic、environment/
configuration input、unexpected shimを拒否する。Cross-OS production-graph digestはpackage name/version/integrityと
package-payload digestを対象としてgenerated `.bin` artifactを除外し、OS固有shim auditを併用する。New production
dependencyまたはartifactは明示reviewまでfailする。

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
Install済みclosureのauditによりroot tarballだけのinspectionが残すgapを閉じ、2回目のnetwork-disabled installにより
normal lifecycle pathがplatform artifactをfetch、compile、substituteしないことを証明する。Exactなdirect pinと
commit済みlockfileが初期リリースのclosureとcross-OS digestをstableにする。
`/files/<fileId>`のようなnested routeにも同じshellを返すためroot-absolute assetが必要で、
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
の再検証にしかならない。以前の`dist/manifests/static-assets.json` — hand-written hostがvalidationして
配信に使っていたbuild-recorded asset/CSP-inline-hash manifest — とその生成scriptは、2026-07-22にその
hostとともに削除した（§ 8）。devframe hostは`dist/public` treeを直接配信し、実行中のpackageは
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

**決定**: `package.json`と`pnpm-lock.yaml`へ正確なversionをpinし、pnpm 11.13.0を使用する。
「最新」は選択したNuxt/Vue toolchainと互換性がある最新stable versionを意味し、prereleaseや非互換majorを
意味しない。最初のlockfile作成直前に同じregistry互換性確認を再実行する。
このcheckはplanning gateとして扱う。選択済みpackageまたはversionが1つでも変わる場合、configuration
implementation前に停止してcompatibility decisionを再reviewし、dependency baselineを記載する英日両方の
research、plan、quickstart、task artifactをすべて同期して`/speckit.plan`、続いて`/speckit.tasks`を
再実行する。Localなpackage/lockfile editで
第2のdependency baselineを作ってはならない。

| 領域 | 選択version | 理由 |
|---|---:|---|
| Node.js | 24.18.0 LTS development/build基準、engines `^24.11.0 || ^26.0.0` = `>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0` | Node 24/26 range全体のruntime compatibilityを宣言し、release matrixでは各下限をcertifyして他majorを除外する |
| TypeScript | 6.0.3 | 現行Vue/Volarとtypescript-eslint toolchainがsupportする最新compiler |
| Nuxt / Vue | 4.4.8 / 3.5.39 | 現行stable release |
| Vue Router | 5.2.0 | Nuxt 4.4.8の宣言range `^5.1.0`を満たす現行stable release。別router abstractionは追加しない |
| tsdown | 0.22.8 | 現行stable release。Node 24.11+をsupport |
| Vite | 7.3.6 | Nuxt 4.4.8が宣言するbuilder range `^7.3.3`内の最新version |
| pnpm | 11.13.0 | 現行stable package manager |
| Local host | `devframe` 0.7.5 | `@eslint/config-inspector`の基盤であるlocal-tool host framework。Packaged SPAを`cli.distDir`から配信し、session APIをRPC channelとして担い、認証は無効化する。Port/host解決とbrowser openingを所有する（§ 8）。Pre-1.0のため、exact pinとlockfileで0.x migration churnを有界化する |
| CLI | `gunshi` 0.37.0 | 現行のruntime dependency 0件のESM CLI framework。Node.js `>=22` engine requirementは宣言済みrangeと互換。Browser openingはdevframe hostが所有し（§ 8）、追加packageを必要としない |
| Parser | `yaml` 2.9.0、`jsonc-parser` 3.3.1、`smol-toml` 1.7.0 | 現行stable inert data parser |
| Source view/diff | `monaco-editor` 0.55.1 | 現行stable read-only source/diff editor。固有diff engineによりclient dependency重複を避ける |
| Lint | ESLint 10.7.0、`@nuxt/eslint` 1.16.0 | 現行互換stable release |
| Unit/integration | Vitestとcoverage-v8 4.1.10、Nuxt Test Utils 4.0.3 | Vitest/coverageを同じversionにし、Nuxt supportのtest harnessを使う |
| Component/DOM | Vue Test Utils 2.4.11、happy-dom 20.10.6 | Nuxt Test Utils peerを満たす現行release |
| Browser/a11y | Playwright 1.61.1、`@axe-core/playwright` 4.12.1 | 現行stable browser/accessibility tooling |
| Type | `@types/node` 24.13.3、`vue-tsc` 3.3.7 | Node 24基準とVueに対応する最新互換type |

**理由**: 選択した集合は、公開済みpeer rangeとbuilder rangeが一致する最新stableの組み合わせであるため、
未supportのcompilerまたはbundler overrideを強制せず最初の実装を再現できる。

**Formattingの判断**: Formatter dependencyもrepository-wideなbyte checkerも追加しない。Byte衛生は
それを所有するlayerに委ねる: `.gitattributes`（`* text=auto eol=lf`）でgitがline endingをnormalizeし、
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
理由付きの明示的なno-impact判断を記録する。この`**移行影響**` sectionと対応する`**Migration impact**` section、
およびplanの`**Dependency and breaking-change migration gate**`/
`**Dependencyおよび破壊的変更の移行gate**` sectionの英日design evidenceが欠落またはstaleならT002を
blockする。Release-validation pairは後で対応するdecision evidenceを記録し、英日validation evidenceが欠落すれば
releaseをblockする。

CLIはGunshiのstableなroot `define`/`cli` APIだけを使用する。Negatableな`open` booleanをdefault trueとして
宣言して`--no-open`を提供し、`cli()`を`strict: true`で呼び出し、host bind前に
すべてのpositional/rest argumentを明示的に拒否する。非同期resultをawaitし、validation failureをproject-ownedの
固定された安全なrendererと明示的な`AggregateError`処理によってnonzero exitへ対応付ける。Built-in help/versionはbindせずreturnする。
Production entryは`gunshi/agent`、lazy command、custom plugin、experimental parser combinatorをimportしない。
Gunshiはnpm graph上の1 leafだが、bundle済みinternal argument/plugin/resource codeもpayload、integrity、license、
import-boundary digestの監査対象とする。Exact pinとこれらのtestによってpre-1.0 API変更riskを有界化する。

監査した0.37.0のregistry tarballはtext-onlyのJavaScript、declaration、JSON、documentation、license file
34件（unpacked 239,298 byte）で、runtime/optional/peer/bundled dependency、install lifecycle hook、platform
selector、shell/native/binary/Wasm payloadを含まない。これにより既存Node-only package gateを維持しつつ、
Gunshiのより大きなbundle済みJavaScript payloadをrelease auditで明示する。

devframe 0.7.5は意図的にleaf packageではない: transitiveなruntime treeとして`h3` 2.0.1-rc.22、`birpc`、
`crossws`、`valibot`、`@valibot/to-json-schema`、`destr`、`mrmime`、`nostics`、`pathe`、`ufo`を持ち込む。
このtree（`h3` release-candidate pinを含む）はdevframe自身のdependency宣言とcommit済みlockfileが所有し、
member単位のproduct決定として再判断するのではなく、maintainされたhost layerの採用の一部として受け入れる。
Install済みproduction-graph auditとcross-OS digestは引き続き全memberのpayloadを対象とし、監査した
devframe tarball payloadはJavaScript/TypeScript textだけであるためNode-only package gateは維持される。
devframeはpre-1.0であり、0.x minorがAPIをmigrateし得るため、productはexact versionをpinし、あらゆる
bumpを§ 3のplanning-gate changeとして扱う。`tests/package/production-graph.test.ts`は、5つのdirect
dependencyがlocked versionでregistry integrityを持つことを正確にassertする。

### 有限なrelease-certification行列

**決定**: 宣言済みNode.js 24/26 engine range全体を3つの固定OS/architecture targetでsupportする。Node.js 24.18.0
development/build baselineの`ubuntu-24.04` x64で1つのplatform非依存tarballをbuildして別のbuild/package smoke checkを
実行し、同一byteをNode.js `24.11.0`と`26.0.0`に`ubuntu-24.04` x64、`macos-15` arm64、`windows-2025` x64を
掛け合わせた正確な6つのlower-bound certification jobでinstallする。各release jobで解決されたrunner-image identifierと
実際のNode versionを記録する。Playwright 1.61.1がinstallする正確なChromium、Firefox、WebKit revisionのそれぞれで、
primary-workflowとaccessibilityの完全なbrowser suiteをNode.js 24.18.0の`ubuntu-24.04` x64で実行する。これらのbrowser
revisionはuser browserの網羅的listではなく、再現可能なautomated certification baselineである。OS helperはbrowser
family/versionを選択・検証せずURLをdefault handlerへ渡す。Helper成功をcompatibility evidenceとせず、表示済みURLと
`--no-open`をcertified browserのmanual選択fallbackとする。

**理由**: Closedなcertification行列は再現可能で、より広いsemver compatibility contractを誤表示せずrelease完了を
判定可能にする。各Node majorのsupport下限を使って宣言したengine floorを検査し、同一tarball byteでpackageがplatformに
より変化しないことを証明する。PinしたPlaywright browser revisionは、OS default handlerがそれを選ぶと主張せず有限な
automated gateを与える。

**検討した代案**: 無上限の`>=26.0.0` engine rangeは将来のmajorを暗黙に主張するため不採用とした。
可変な`*-latest` runner labelと特定しないmodern-browser targetは、repository変更なしにrelease denominatorが変化するため不採用とした。
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
[release status](https://nodejs.org/en/about/previous-releases)と
[Node 24.18.0 release](https://nodejs.org/en/blog/release/v24.18.0)をLTS基準と正確なbuild releaseの根拠にし、
[Node 26.0.0 archive](https://nodejs.org/en/download/archive/v26.0.0)を第2のengine floorの根拠にする。GitHub公式の
[runner-image labels](https://github.com/actions/runner-images#available-images)を3つの固定OS/architecture jobの根拠にする。
Monaco公式の[v0.55.1 release](https://github.com/microsoft/monaco-editor/releases/tag/v0.55.1)を
選択stable editor versionの根拠にする。
Gunshi公式の[setup requirement](https://gunshi.dev/guide/introduction/setup)と
[declarative/strict CLI guide](https://gunshi.dev/guide/essentials/declarative)を、ここで用いる
Node/TypeScript互換性とclosedなunknown-option behaviorの根拠にする。
Safe-filesystem layerはNode built-inの`node:fs/promises`、`node:fs`、`node:path` APIだけを使用するため、
platform toolchainやruntime package dependencyを追加しない。
Directなproduction `dependencies` setはpin済みの`devframe`、`gunshi`、`jsonc-parser`、`smol-toml`、`yaml`の
正確に5つとする: CLIとparserのpackageはnpm graph上のleafであり、devframeは上記のtransitive host treeを
持ち込む。
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

`open` 11.0.0はJavaScript APIが便利でも不採用とする。Published tarballがexecutableなPOSIX shell
`xdg-open` helperを含み、installed product closureをFR-038違反にしつつroot tarballだけのallowlistでは見逃すためである。
Browser launchは代わりにdevframe hostのopener（§ 8）が所有する。それは監査済みdevframe payload内の
plain JavaScriptであり、`open`はproduction closureに存在しないままで、openの失敗またはunsupported時は
既に表示したloopback URLをmanual openできるままにする。

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
   拒否する。Literal、one-segment、non-adjacent recursive-directory tokenは1 program内でcomposeできる。`./**/`は
   明示的な下向きInspector descendant inventoryだけを表し、vendor traversalを主張しない。Build validationは同じ
   programをimmutable versioned `TraversalPlan` dataへcompileし、Global preview patternをそのplanからrenderしてconsentへ
   schema、closed selection policy、canonical programをbindする。Content依存policyはclosedなCodex Global
   first-non-empty branchだけで、overrideを先にprobeし、readしたnon-empty contentならshort-circuitし、absentまたは
   emptyの場合だけ次へ進む。Unreadableまたはbinaryのoverrideはそのfileのdiagnosticで
   branchを終了し、fallbackしない（FR-035）。
3. **Runtime composition registry**は、selection、precedence、layering、fallback、condition projection、
   relationship-only ruleを表すstable `strategyId`を
   [runtime composition](contracts/runtime-composition.ja.md)に記録する。Strategyはpathを再記述せずbehavior IDと
   rule IDを参照する。
4. **Official source registry**はstableな`sourceId`、canonicalな公式URL、正確でboundedなsection anchor、
   review date、影響contract ID、assertion、semantic fingerprintを
   [公式資料](contracts/official-sources.ja.md)に記録する。

**Evidence statusの決定:** Documentation completenessとupstream lifecycleは直交させる。Atomicなbehavior、
rule、strategyはそれぞれ`(subjectKind, subjectId)`をkeyとする1件の`EvidenceAssessment`を所有する。
`documentationStatus`は正確に`documented`、`partially-documented`、`unknown`、`conflict`のいずれかとし、
重複のない`lifecycleQualifiers`は固定順`preview`、`experimental`、`deprecated`を使う。Empty qualifier arrayは
lifecycle stateを主張せず、`stable`として表示しない。`documentation-conflict`はconflictがruntime projectionへ
影響するときに生成する`ConditionFact.status`だけに残す。Candidate provenanceとrelationshipは、直接参照する
behavior/rule/strategy recordごとのassessmentをsort・deduplicateして保持する。単一scalar status、best/worst statusへの
縮約、qualifier unionは、どのofficial assertionがどのsubjectへ適用されるかを失うため不採用とした。

選択したRepository rootはimmutableなRepository inventory boundaryのままとする。CLIは`process.cwd()`を1回だけ
captureし、defaultではその正確な文字列を使う。`--cwd`は最大1回だけ受理し、absolute optionはそのまま保持し、
relative optionはcaptureした起動directoryに対してresolveする（FR-001）。Missing/empty valueまたは
duplicate optionはsession/browser作成前に固定のactionable startup errorで失敗させ、CLIは`process.chdir()`を
決して呼ばず、bootstrapはscan I/Oより前に、readを認可しない唯一のRepository Sourceを作成する。Vendor runtime root、
walk方向、target file、trust、enablement、selection、installation、product surfaceは、matcherやfile存在から導出せず
独立したbehavior/strategy factにする。Behavior record、source record、strategy、relationship、excluded ruleはreadを
認可しない。

Admitしたtool-home rootはtool別の独立したGlobal Sourceとして表す。Codex、Claude、Copilotごとに最大1つ、
したがって1 sessionで0から3つのGlobal Sourceとする。各Sourceは正確に1つのrootと1つのSource-relative Path
namespaceを所有し、そのroot配下にある異なるcustomization typeのfileは別々のinventory itemとして保つ。
「repository-relative path」はRepository Sourceだけに使い、inventory-file/normalized-targetのDTO locator field、filter、
file-scoped diagnostic、cross-source comparisonではSource-relative Pathを使う。Enabled Sourceとconsent previewの
`displayRoot` fieldはone-way escapedなroot presentation labelであり、Source-relative locatorでもread authorityでもない。
Preview labelはowning Sourceが存在する前にoriginを持ち、absoluteまたはinvalidなlexical rootを表し得る。

Bounded derivationは任意のreference追跡ではなく、closedかつdeterministicなtarget constructionを持つtyped single-edge provenance graphの
ままとする。Closed `DerivationProgram` unionのinitial mappingは、3 vendorのlocal-marketplace manifest rule、Codex
fallback basename placement、Codex skill metadataのexact 5件とする。各mappingはexact static seed provenance/rule/kind、
declaration field/syntax、base/placement、fixed suffix alternativeをpinし、callback、arbitrary path join、free-form
expression、glob、recursive derivationを表現不能にする。Derived provenanceは別edgeをseedできず、同じfileの独立static provenanceはeligibleな
ままとする。安全なCodex fallback basename、Codex skill UI metadata、検証済みlocal marketplace root配下の
vendor-specific plugin manifestだけを受理する。Agent memory、任意role-config target、plugin component、
import、その他任意component/config path、skill resource、script、asset、remote source、MCP server提供instructionは
relationshipまたはexcludedのままとする。

**理由**: Frozen inspection pathを対象とするcurrent official documentationの限定的な再監査により、旧combined
tableではInspector matcherがvendor lookup behaviorのように見える箇所が複数判明した。

- **Copilotのsurfaceには重要な差がある。** VS Codeのrepository-wideな
  `.github/copilot-instructions.md` locationはworkspace rootのexact pathであり、recursiveな
  `**/.github/copilot-instructions.md`と書くとnested workspace fileを示唆してしまう。Copilot CLIはruntime
  contextからrepository boundaryへ向かう独自の文書化済みstandard-location traversalを持ち、Cloud/code-
  review surfaceはさらに別のsupport/composition modelを持つ。これらは別behavior rowにする。Inspector matcherが
  possible descendant contextをinventoryする場合は明示的な`./**/`だけを使い、applicabilityはconditionalのままに
  する。VS Code rowをCLIまたはCloud traversal ruleとして再利用しない。VS Code MCPにはcurrent-guide viewに対する
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
  Inspector matcherはinventoried possible layerごとにdirect-child selectorを使い、
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
  あるだけではvendor auto-discovery eventにならない。Inspectorが保持できるのはroot-exactなauthored-project
  matcherであり、nested local manifestは独立して受理したcatalogからのbounded derivationによってのみadmitする。
  Presenceはregistration、installation、enablement、trust、component loading、precedenceを証明しない。

Vendor contractは将来の保守のため、文書化済みUser settings、agent、skill、rule、hook、MCP source、plugin、
state、deprecated surfaceもinventoryする。これらUser tableはevidenceでありconsentではない。FR-015からFR-018は
正確な3つのGlobal instruction setだけを引き続き認可し、vendor behavior registryが記録していても、隣接User
surfaceはspecification変更なしではすべて`excluded`のままとする。

全vendor behavior、Inspector rule、composition strategyは正確な公式`sourceId`を参照する。Official-source
recordはそれらIDをboundedなURL sectionと影響contract IDへ逆mapするため、page変更時のreview setを有限にできる。
Checked-in fixtureとmoduleはidentifier uniqueness、相互link、英日semantic parity、source anchor、offline semantic
fingerprintを検証する。Networkへaccessできるのは明示的なmaintainer drift checkだけで、behavior、rule、
strategy、assertion、fingerprintを自動更新しない。Product startupとRepository/Global scanはdocumentationを
fetchしない。

Registryはpage bodyをcopyして保持しない。公式HTTPS host/redirect policy、content-type check、
recoverableなtransport failure動作、anchored-section normalization、human update ruleは
[OfficialSourceRecord](data-model.ja.md#officialsourcerecord)で定める。URLへ到達できてもanchor sectionが消失、
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
model化しない。このsectionが以前規定していたadversarial-file機構（operation間のcheckpoint
identity再検証、race-detection taxonomy、hard-linkのread-once grouping、read ticket/receipt、
resource-registry close-state machine）は、ordinary traversalとper-file diagnosticにより
置き換える。

Traversalは、immutable versioned `TraversalPlan` data（§ 4）へcompileした固定inspection-path
allowlist上の、Node `fs/promises`によるordinaryなrecursive directory walkとする。
Pure Node.jsの`src/server/inspection/` directoryは引き続き調査対象source I/Oの唯一の
backendであり、fileをread-onlyで開き、mutation-capableなfilesystem operationを公開しない
（QR-003）。Symbolic linkは透過的に追跡する。Inspectorは同じpathを読むagentが見る内容を
表示するためである。Targetがmissingまたはunreadableなlinkはordinaryなper-file
`file-unreadable` diagnosticを生成し、recursive traversalはreal pathでvisited directoryを
追跡するためlink cycleがscanの終了を妨げることはない（FR-024）。Hard linkはordinaryなfileであり、
physical-identity grouping、primary/alias選択、read-once semanticsを持たない。Publicな
Source-relative PathはNFC display segmentを使い、filesystem operationはraw entry nameを使う。

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
Defensive機構は実際にuserを守るfailure modeに対してだけ存在でき、以前の機構が防御していた
adversaryはもはやproduct modelに存在しない。維持する義務は各sectionが所有する: 調査対象
contentは決して実行しない（§ 6）、served contentにuser自身のsecretが含まれ得るため
session hostはloopbackだけにbindし起動machineの外へ決して公開しない（§ 8）、表示contentはinertにrenderする（§ 6、§ 7）。

**検討した代案**:

- 以前のTOCTOU checkpoint model（全enumeration/readを挟むpre/post identity check、
  fail-closedなrace outcome、registry-confirmed close）は、productがmodel化しないadversaryへの
  防御であるため2026-07-22に不採用とした。信頼するworkspace内の同時編集は、最悪でも
  ordinaryなper-file diagnosticか、明示的rescanで更新されるstale snapshotになるだけである。
- 1件のunreadable/binary fileによるscan全体の失敗は、FR-028がunaffected resultの利用継続を
  要求するため不採用。

## 6. 安全なparse、literal表示、inert rendering

**決定**: Scanがreadしたsource byteを正とする。NUL byteを1つでも含む場合はbinaryかつdiagnostic-onlyとし、他の点では
publish可能なgenerationを`partial`にする。それ以外のbyte sequenceは全て、UTF-8 replacement semanticsで
正確に1回だけdecodeする。先頭BOMを1つ記録して取り除く。Decodeが`U+FFFD`を挿入した場合は`utf-8-replaced`を使い、
その文字をgarbled source全体に保持したままparse、extraction、display、comparisonを続ける。Replacementだけでcomplete
outcomeとし、別charsetを推測したりretryしたりしない。読み取り可能なsource text、表示対象の宣言済みmetadata値、
comparison contentは、credential検出、content-based masking、redaction、reveal workflowを使わず、記述されたまま返す。
調査対象content内の環境変数参照はliteral textのままとし、Inspectorが参照先のprocess値を読み取り、解決、置換する
契機にしない。文書化済みの`CODEX_HOME`、`CLAUDE_CONFIG_DIR`、`COPILOT_HOME` inputは、hostがtool別Global Source
rootを特定するためだけに使い、content parseでは使わない。Inspectorはfile-size/file-count validationを適用しない。
Read、decode、parse、retentionはNode.js、parser library、OS、実行環境が利用可能にするcapacityを使う。
Error処理はordinaryとする。1つのfileに限定されるfailureはそのfileの
actionable diagnosticになり、scanは`partial`としてcommitする（FR-028）。1つのfileに限定されない
unexpected failureはattemptへresultを提供せず、実messageのままordinaryにpropagateする。失敗した
RPC handlerのerrorはdevframeがserializeする形のままdevframe channelを渡り、sanitizer wrapperを
持たない。Startup所有failureはprocess top levelへ到達する。Process-level OOMやkernel terminationからのrecoverは保証しない。

Decode後にbest-effort metadata extractionを行うが、decode/normalize済みvalueを表示値には使わない。受理した
allowlist field occurrenceごとに、正確な`authoredLiteral` source sliceと別のinternal typed semantic valueを持つ。
Public metadata listはsource occurrence順を保ち、受理したduplicate occurrenceも保持する。Stable identityはclosed
tool、kind、field ID、そのfield内のzero-based occurrenceである。JSONC syntax-tree range、YAML CST/source-token range、semantic
parseと組み合わせるTOML lexical-span scanner、Markdown/frontmatter/import spanから正確なsliceを得る。
JSON/YAML/TOMLのquote、escape、block indicator、number/date spelling、collection punctuationを表示に残す。Typed
classification、relationship normalization、bounded derivationに使えるのは別のsemantic valueだけとする。
Authored relationshipは正確なtarget sliceを表示し、normalized targetにはsemantic stringだけを使う。Registry定義の
documented defaultにはsource sliceがないため`authoredTarget: null`とし、source-authored textではなくdocumented defaultと
labelする。RangeはECMAScript UTF-16 code-unit offsetを使い、`String.prototype.slice`でliteralを再現する。
Metadata、relationship、derivationは同じexact source occurrence/rangeを参照できる。Distinct origin
occurrence間のpartial、nested、crossing、identical overlapだけをinvalidとする。Rangeがmissing、illegal overlap、
ambiguous、またはsourceへround-tripしない場合はliteralを発明せずrecognitionのextraction全体を破棄する。

YAML semantic parseはcustom tagなしのcore schemaと無効化したalias、JSONCはsyntax treeからの既知path extractionと
する。Semantic valueはJSON-safeなdiscriminated internal unionへnormalizeし、integer、float、date/time
payloadはtyped canonical stringを使ってJavaScript precision lossを防ぐ。Markdown/frontmatterとClaude importはtext
scanとする。Parseはbundleされたparser libraryでscan path上のin-process実行とし、memory、syntax tree、scalarの
capacityはNode.js、parser library、実行環境に従う。ProductはV8 memory ceilingやparser item/depth/time
limitを設定しない。Parser/extractor failure、または同じ`(fileId, tool, kind)`への2 extractorの
incompatible meaningはそのfileに限定される。Per-fileの`recognition-parse-failed` diagnosticの背後で
そのrecognitionのextraction result全体を破棄して`partial` commitとするが、読み取り可能なsource textや
別recognitionは変更しない（FR-028）。
Tool/kind pairごとにrecognitionは正確に1つで、compatible provenanceはそこへ
mergeする。Rule、script、markup、URL、control sequenceは実行もrenderもしない。Internalな`semanticValue`という
名称はmechanicalなtyped decodingだけを意味する。Inventory、Detail、Comparison、Global control、Diagnostic、
Source Condition Fact、API、CLI output、documentationの全surfaceで、productはnatural-languageの意味をinterpret/
rankせず、validity/correctness/effectiveness/compliance/qualityを判定せず、remediationを助言せず、customization
contentをlint、synchronize、convert、format、fixしない。Inspector所有のmanifest、DTO、registry、invariantを
validateすることはinternal safety checkであり、customizationへのverdictではない。

以前のoperational-event語彙とそのlog-content禁止事項（FR-040）、およびlayeredなgeneric-error
doctrine（FR-041）は2026-07-22に削除された（spec.md § Clarifications Session 2026-07-22、憲章
v4.0.0）。Productにtelemetryはなく（FR-022がoutbound trafficを禁止する）、terminal/UI outputは
調査対象fileを所有する同じuserが読むため、path、filename、error causeを隠しても誰も守られず、
failureをdebug不能にするだけだった。Sessionの`Diagnostic`はfile-specificな問題へ対処するために
必要なSource-relative Pathとmetadataを持ち、failureは実messageを保ち、fixed CLI help/version、
1行のlaunch URL、fixed startup warningはordinaryなpresentation outputのままである。

**理由**: Declaration/relationshipのlabelにはparseが必要だが、成功してもInspectorをvalidatorにしない。
Literal表示は、maskingなら隠してしまうcredentialその他の記述済み差分を維持する。任意の`FileDetail` requestまたは
comparison構築前に、bundled interfaceは完全なsource text、declared authored metadata、authored relationship target、
comparisonの両sideをgateするin-memory acknowledgementを要求する。Document reloadまたは中央full-session client-data
purgeでresetし、通常のscope限定route、file/Source、generation cleanupでは読み込み済みdocumentについて維持してよいが、
Global disableは明示的なfull-purge例外である。
Acknowledgementはaccess-control factorではない: session APIはloopbackへbindしたdevframe host（§ 8）経由で
だけ到達可能であり、acknowledgementを受信も永続化もしない。Loopback限定のsession API、process/browser memoryだけのlifetime、Vue text
binding、無効なlinkにより、この意図的な表示をlocalかつinertに保ち、maskingを
security boundaryとして扱わない。

**検討した代案**:

- Dynamic import、`jiti`、TOML/YAML custom constructor、Starlark評価、MCP probeは実行なので不採用。
- Credential maskingとvalue単位のrevealはliteral comparisonに反し、productが調査すべき差分を隠し得るうえ、
  全sensitive valueの検出を保証せずreveal stateだけを作るため不採用。
- 調査対象content内の環境変数参照を解決する案は、記述済みtextをambient process stateで置換し、admitした
  Sourceから読んでいない値を露出し得るため不採用。
- Zodは追加しない。Request commandは小さなclosed shapeでmanual guardが単純であり、Zodはfilesystem
  inputを安全にしない。

## 7. Source/metadata比較UI

**決定**: File/compare routeで`monaco-editor`のESM buildをclient-only lazy-loadし、read-only
single-file source viewとliteral source比較に使う。Editor workerと必要なbasic-language contributionだけを
importし、Nuxt/Viteにsame-origin assetとして出力させ、未使用language-service workerを含めない。
Modelはopaqueなin-memory URIと完全な記述済みsource textを保持し、route close、selection replacement、source
disable、generation replacement時にeditor/subscriptionとは別にdisposeする。`readOnly`、`domReadOnly`、
`originalEditable: false`、`links: false`、`renderMarginRevertIcon: false`を設定し、
`accessibilitySupport: 'auto'`、enabledな`accessibilityVerbose`、各source sideの`ariaLabel`を使う。
devframe hostがNuxt outputを直接配信するため（§ 8）、product-assembledなCSP-hash manifestは存在しない。
表示のinert性はread-onlyなeditor設定、Vue text binding、無効なlinkによって成立し、clientは引き続き
external worker、blob worker、evaluated stringをloadしない。Diff highlightはproduct独自のline数/computation-time cutoffを設けず、Monacoとbrowserの
capacityに従う。Monacoまたはbrowserがrecoverable failureを報告した場合もcomplete read-only side-by-side sourceと
diagnosticを残す。Recognition metadataはtool、kind、closed field ID、occurrenceで対応付け、正確な`authoredLiteral`をVueのrow/badgeで
比較・表示する。Internal typed semantic valueをUIへ置換せず、Monaco向けJSON textへ変換しない。
Monacoのaccessible diff viewer、ARIA label、keyboard navigation、narrow-screen inline modeを維持し、
明示的なaccessibility test対象にする。

**理由**: Source fileにはMarkdownとstructured configurationがあり、syntax coloring、line navigation、
virtualized rendering、search、synchronized scroll、実績のあるdiff surfaceがinspectionを明確に改善する。
Monacoはsource差分を計算し、editor/環境依存のcomputation動作とaccessibility controlを提供するため、別の
text-diff packageは責務を重複させる。Metadataにはset-like recognition、ordered precedence、stable
identity付きfieldというdomain semanticsがあり、serialized lineではなくstructureとして比較しつつliteral spellingの差を
観測可能にする必要がある。公式[diff editor options](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor_editor_api.editor.IDiffEditorOptions.html)と
[Monaco repository](https://github.com/microsoft/monaco-editor)がeditor、worker、accessibility、model
lifecycle capabilityを文書化している。意図的に狭いESM importはexact version pinとpackaged browser
testでupgrade時に保護する。
Content-based display transformは適用しない。必須warning後も記述済みsensitive valueは表示したままとし、
inert renderingによってcontent自体の実行、load、navigateを防ぐ。

**検討した代案**:

- Monacoと併せた`diff`追加は、現時点でCLI、API、patch export、headless consumerが第2のdiff engineを
  必要としないため不採用。
- Recognition metadataのMonaco向けserializeはproperty orderとline changeがdomain fieldの
  added/removed/changedを不明瞭にするため不採用。
- Custom `<pre>` source diffはnavigation、large-document rendering、synchronization、accessibility、
  diff interactionを再実装するため不採用。

## 8. Local session transport

**決定**: `@eslint/config-inspector`の基盤であるlocal-tool frameworkの`devframe` 0.7.5をsession hostとして
採用し、devframe認証を無効化する（`auth: false`。2026-07-22のowner決定、spec.md § Clarifications
Session 2026-07-22、憲章v3.0.0）。CLIは`devframe/adapters/dev`の`createDevServer`でhostを起動する:
devframeが`127.0.0.1`へbindし、build済みNuxt SPAを`cli.distDir`（`dist/public`）から直接配信し、
session APIを、`defineRpcFunction`で宣言してdefinitionの`setup`で登録するdevframe RPC functionとして
担う。Port/host解決、SPA fallback付きstatic配信、RPC channel、browser openingはproduct codeではなく
devframeのpolicyである。Session保護はloopback bindingだけとする: per-session tokenも、Origin/Host分類も、
hand-written HTTP routerも存在しない。残余limitationは防御ではなく文書化する: Inspectorの実行中、他の
local processと、DNS rebinding経由のmalicious web pageが無認証sessionへ到達し得る（QR-003）。Session APIは
引き続きfile IDとclosed commandだけを公開し、client pathを使わない。

Global consent前に、lexical/no-I/O path previewをsession API上で公開し、session-keyed digestへ
confirmationをbindする。このsectionの固定contractとして、new unconsented previewごとにoperation-local input captureを1つ作る。
`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`をこの順で1回ずつreadし、`undefined`だけをabsentとする。1つでも
absentならimport済み`node:os.homedir()`を1回callして、active-platform `node:path.join`と固定suffix `.copilot`、
`.claude`、`.codex`を使う。`HOME`/`USERPROFILE`を独自選択せず、capture中にexistence checkを行わない。正確なraw
`lexicalRoot`をinternal stateに保持し、その値、
escaped display、immutableな`TraversalPlan` schema/selection-policy/canonical programをconsent digestにbindする。Enableは
stored raw valueだけを使い、display textから逆変換せず、environmentを再readしない。
また、各SessionSnapshot/FileDetail requestは`clientDataEpoch`、owning sequenceのgeneration — session snapshotは
`repositoryGeneration`とnullableな`globalGeneration`を公開する — 、正確なrequest token、該当時は
file IDをcaptureする。Old snapshotは無視し、いずれかのsequenceのnew generationをadoptする前にepochをincrementし、
そのsequenceの置換されたgenerationが所有するdetail、comparison、editor objectをabort/disposeする。他方のsequenceの
commit済みviewは有効なままとする。Equal-generation snapshotはcurrent tokenと一致する
場合だけ、FileDetailはepochとowning sequenceのgenerationが一致しreadable fileがまだ存在する場合だけadoptする。
Serverはcoordinator lock下で各response envelopeのsequence generationとpayloadを一緒にcaptureする。
自動または明示的な各scanにはopaqueな`scanRequestId`も付与する。Source progress、rescan admission response、
successfulなsource-scan generationは同じIDを持ち、nullを使うのはbootstrap generationだけであり、Global disableは
generationを一切commitしない。Clientはcurrent
statusとrender済みinventoryのcompletionをadmit済みrequest IDへbindし、以前のstatus/generationを拒否する。

Preview parse/transportのcapacityはNode.js、browser、実行環境に従い、proposed rootや
escaped displayへproduct独自のbyte上限を設けない。Liveness routeは、initial load、visible/focused
stateへの復帰、明示的Resume、fresh session採用という観測可能なlifecycle transitionだけで呼ぶ。In-flight checkは最大1件とし、
request settlementはbrowser/network/runtimeに委ねる。このsingle-flight ruleはstale responseを拒否するためstate adoptionを
serializeするfunctional coordination invariantであり、resource admissionまたはvalidation ceilingではない。Polling interval、
request timeout、retry timer、memory leaseを定義しない。
Network/runtime rejection、session mismatch、hidden/page lifecycle event、request dispatch前の
Global-disable click、greater Global content epochまたはnon-null disable fenceの観測には、`clientDataEpoch` guard付きのshared purgeを使い、
全DOM/DTO/editor/warning stateを除去してlate responseによるcontent復活を防ぐ。Continuously visibleなidle page上のprocess lossには
product定義のwall-clock検出保証を設けず、次のlifecycle signalまたはordinaryなrequest outcomeで扱う。Hidden-page purgeは
session dataを保持しない。Visibleへ戻るとSPAはRPC channel経由でfresh sessionを取得し、purge済みIDを
保持・比較せず、返された`sessionId`をnew liveness baselineとして採用する。Successful liveness bodyは正確に
`{ sessionId, globalContentEpoch, globalDisableInProgress }`とする。Older epochはrejectし、equal epochかつnull fenceはbaselineを
confirmし、greater epochまたはnon-null fenceではrender前にpurgeしてclient-side `RecoveryViewState`へ入る。Non-null fenceならsession routeは
exactでcontrol-onlyな`GlobalFenceRecoverySnapshot`を返す。Null fenceならnormal full `InspectionSession`を返すが、recovering clientは
control/error projectionだけを採用してinspection graphを破棄する。Active consent中は
そのviewからdisableを直ちに利用でき、preview routeがexact frozen previewを返した後だけbrowser persistenceや
environment再readなしでretry controlを再構築できる。Recovery viewはfenceがnullでnormal full snapshotを取得可能な場合だけ
Resume inspectionを提示する。この明示actionはmatching sessionを再取得してdefaultのfresh inventory summaryを構築するが、old detail、comparison、editor、selection、
filter、authored source、acknowledgementを復元しない。後のdetail/comparison openにはnew acknowledgementを要求する。

Session APIは、明示的なdetail requestにだけ完全なauthored contentを返す。Sensitive-content
acknowledgementはbundled-SPAの必須presentation invariantであり、authorization credentialではない。Client memoryだけに
置き、APIへ送信せず、document reloadと中央full-session purgeでresetし、bundled clientの全`FileDetail` requestと
comparison constructionをgateする。通常のscope限定route、file/Source、generation cleanupはそのpurgeではなく、
読み込み済みdocumentについてacknowledgementを維持してよい。Global disableは明示的なfull-purge例外である。

Browser attempt前に、解決済みlocal origin `http://127.0.0.1:<port>/`をhostのready callbackから起動元
terminalへ正確に1回表示する（FR-001）。Browser openingはdevframeのpolicyである: CLIのnegatableな
`--open` flag（default true）はdevframeのopen flagへ対応し、devframeのopenerはその解決済みoriginだけを
受け取り、inspection由来のcontent/pathを決して受け取らない（FR-022）。Productは解決されたhandlerの
browser family/versionを選択・probe・検証しない（FR-001）。Automatic openのdisabled、unsupported、失敗は
serverを継続させ、いずれの場合も表示済みoriginがfallbackである。

**理由**: Hosting policy — port/host解決、SPA fallback付きstatic配信、RPC transport、browser opening — は、
maintainされたdevframe layerが既に所有しenforceするpolicyである。素の`node:http`上での再実装はその
layerを重複させ、productに独自のrouterと認証機構の所有を強制していた（憲章原則I、シンプルな実装の方針）。
`@eslint/config-inspector`は同じ形 — auth gateなしのdevframe上のtrusted single-user localhost inspector —
で出荷されており、devframeはまさにそのclassのtool向けに`auth: false`を文書化している。採用により
hand-written API router、per-session capability module、static-assets manifest generatorをそれらの
contract testとともに削除した。同日のFR-040/FR-041削除により、genericなrequest-owned error
boundary（`src/server/host/runtime-failures.ts`）も削除され、devframe app definitionが実装されるまで
product所有のhost codeは存在しない。失敗したRPC handlerのerrorはdevframeがserializeする形のまま
devframe channelを渡り、sanitizer wrapperを持たない。Trade-offは明示的でownerが決定した
（2026-07-22）: devframeのdefaultであるinteractive OTP認証なら他のlocal processやDNS rebinding pageから
sessionをgateできるが、ownerはそのdefaultよりconfig-inspector parityを選んだ。したがって無認証loopback
hostの残余exposureは、sessionが起動userの既に読める内容だけを配信するというtrusted-workspace modelに
有界化された、文書化済みlimitationである（憲章v3.0.0、QR-003）。Digest-bound preview consentは引き続き、
hostがpathへ触れる前にuserが見たlexical root/patternを証明し、preview構築中のNode.jsまたはbrowserの
recoverable failureは未表示valueをauthorizeせずfailする。Lifecycle-triggered liveness checkとordinaryな
request outcomeは、dataを永続化せずproduct timerを定義せず、観測可能なboundaryでsession lossを公開する。
Hidden pageで直ちにpurgeすればbackground retentionを避けられ、continuously visibleなidle page上のprocess
lossには意図的にproduct定義のwall-clock保証を設けない。
Recovery DTOはSourceが0個でもall-failed Global consentを可視に保ち、previewを分離することで大きくなり得るdisplay
payloadをsession retrievalごとに繰り返さない。

**検討した代案**:

- 以前のhand-written transport — 素の`node:http`、closedなhand-written router、URL fragmentで渡して全API
  requestで要求するper-processの256-bit capability token、exactなHost/Origin enforcement、
  `Cache-Control: no-store`、build-recorded inline hashから導出するCSP — は2026-07-22のowner決定により
  supersededとなった。devframeが所有するhosting policyを再実装しており、それが防御していた
  browser-origin/DNS rebinding exposureは、無認証loopback hostの文書化済み残余limitationとして受け入れる。
- devframeのdefaultであるinteractive OTP認証はconfig-inspector parityのため不採用。devframe自身が、
  printed one-time-codeのround-tripが邪魔になるだけのtrusted single-user localhost tool向けに
  `auth: false`を文書化している。
- 一般的な`--host` supportとCORSはremote accessがscope外のため不採用。Hostは`127.0.0.1`だけへbindする。
- RPC channel上のproduct定義push protocolは、lifecycle-triggered liveness check、ordinaryなrequest outcome、
  hidden/pageでの即時purgeにより、product timerなしで必要なobservable teardown signalを得られるため不採用。
- Project-ownedなbrowser-launch adapter（ambient environment allowlist付きの固定`/usr/bin/open`/`xdg-open`
  spawn）はhand-written hostとともにsupersededとなった。Browser openingはdevframeのpolicyであり、その
  openerは解決済みlocal originだけを受け取る。

## 9. Atomic generation、rescan、実行環境依存capacity

**決定**: Repository scanは自動開始し、session snapshotでprogressを公開し、以後のRepositoryまたはenabledな
tool別Global Sourceのscanは明示的user actionだけで行う。自動Repository command前にlegalで空のzero-I/O
bootstrap generation 0を同期作成する。これには、captureした`process.cwd()`または任意指定の単一`--cwd`から選択した、
idleでreadを認可しないRepository Sourceを正確に1つ含め、boundary admissionとworkがqueueされるまではsource progressを
nullとする。自動または明示的な各scanにopaqueな`scanRequestId`を割り当て、そのSource progressとsuccessfulな
source-scan generationに同じIDを保持する。Nullを使うのはbootstrap generationだけとする。RepositoryとGlobalの
inspectionはlifecycleが独立しているため、それぞれ独立したatomic generation sequenceを保持する: Repository
sequenceはbootstrap generation 0から始まりRepository scanだけで進み、Global sequenceはそれを作るenable
commit — Global generation 1 — からdisableが破棄するまでの間だけ存在する。Disableはgenerationをcommitしない
ため、disable用のtransaction kindもnull-IDのdisable generationも存在しない。再enableされたGlobal sequenceは
generation 1から再開し、incrementされた`globalContentEpoch`がeraを区別するため、disable前のstaleなGlobal
referenceがre-enable後のrequestを満たすことはない。

単一coordinatorが全`GlobalEnableOperation`、Repositoryまたはtool別Global Source scan、Global調査を無効にする
transactionをserializeする。Product独自のqueue、slot、concurrency capacityは公開もenforceもしない。通常scanはFIFOで
実行する。Global disableはpriority security barrierとし、dispatch前にbrowserがfull client-data purgeを実行する。Non-no-op
barrierの最初のaccept時、command epochと`globalContentEpoch`をatomicにincrementし、non-null
`globalDisableInProgress`をinstallし、publication authorityをrevokeして新しいGlobal-enable/Global-rescan commandを拒否する。
全inspection-data routeは`409 global-disable-pending`を返し、session routeは`GlobalFenceRecoverySnapshot`だけを返す。
各inspection-data successはcaptureしたepochへbindし、最終publish時にcoordinator lock下でepoch不変かつfence nullを再checkする。各liveness successは
代わりにpublish時の1つのcurrent coordinator-lock snapshotからexactな`{ sessionId, globalContentEpoch, globalDisableInProgress }`値へbindし、
current fenceがnon-nullでも返す。Active
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
そのsequenceが所有するfile IDを全てrekeyし、そのsequenceの旧file/detail/comparison/selection/editor referenceだけを
staleにする。他方のsequenceのcommit済みstateとviewは有効なままとする（FR-030）。以前のcarry-forward機構 —
Repository inventoryを変更せず維持しながら全session IDをrekeyするGlobal commit — は削除された。明示rescanのfatal failureは全uncommitted
outputを破棄する。最後のsuccessful snapshotはSource-keyed stale-failure entryとともに表示し続け、root自体を
readできない場合はactionableな`root-unreadable` diagnosticを、unexpected failureでは失敗requestの
error messageを参照する（FR-030）。Startupのfailureにはrequest ownerが
ないためprocess top levelへ到達する。Tool別Global rescanのfatal failureはその
Sourceのconsent、accepted root context、最後にcommitしたgraphをretry/disable用に保持する。

Session-wide consent 1件で3 tool全てを固定し、frozen preview entryごとに`GlobalToolControl`を1つ持ち、selectorは
持たない。Consent後validationは、missingまたはreadable directoryではないconsent済みrootを、他のtoolを
blockせずそのtoolのabsent/failed outcomeとして記録する（FR-014）。1つのtoolのrootに限定されない
unexpected failureは全transactionをowning request
boundary経由でabortする。Validationがrootを1つもadmitしない場合、`active-no-job`はretry/disable用controlを保持し、
Source/job/generationをpublishしない。1つから3つをadmitした場合、provisional batch scan 1件が各rootの独立したSourceを
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
Liveness pathはNode.js上で独立scheduleするが、runtime exhaustionやblocked/terminated processをsurviveするとは主張しない。

**理由**: Serializationとatomicなper-sequence generationはlost updateとold/new result混在を防ぐ。Repositoryと
Globalはlifecycleが独立している — Repository Sourceは常に存在し、Global sourceはenableからdisableの間だけ
存在する — ため独立したsequenceを保持し、commitが他方のsequenceのstateをcarry、rekey、invalidateする必要は
なく、以前のcarry-forward機構はまるごと削除された。Capacityを実runtimeから
導くことで、任意のproduct数値をportableなsafety guaranteeとして提示しない。Ordinaryに報告されるerrorはdomain causeを
発明せずexecution lifecycleを維持し、application制御外のfailureは明示的なplatform limitationとして残す。

**検討した代案**:

- Automatic watch/rescanはFR-030が要求しないimplicit readとstale-state raceを作るため不採用。
- Active resultのincremental mutationはconsumerがgeneration混在を観測するため不採用。
- Per-source commitのconcurrent実行は、各sequenceの単一generation numberとgeneration-scoped IDにconflict-proneな
  commit-time rebaseを必要とするため不採用。
- RepositoryとGlobal inspectionが共有する1つのsession-wide generation sequenceは、2つのlifecycleが独立している
  ため2026-07-22に不採用となった。全Global commit — およびdisable — に、触れていないRepository inventoryを
  carry forwardさせながら全session IDをrekeyさせ、data変更が正当化しないRepository viewのinvalidationを
  強制していた。
- Product独自のbyte、item-count、parser、queue、deadline capは、実効capacityがNode.jsと周辺実行環境に属するため不採用。

## 10. 検証戦略

追加の固定fixtureは次を検証する。Browserはscan commitとdisable barrierをまたいでsnapshot/detail deliveryを一時停し、
epoch、owning sequenceのgeneration、token、file existenceが合わないlate responseを拒否する。Previewはraw/display escape collisionを
作り、enableがstored raw rootを使うことを証明する。Global exact targetはrootをenumerateせず、fixed subtreeは許可された
descendantだけに触れ、隣接pathへのI/Oは0とする。Raw-path fixtureはNFD spellingのentryをraw nameで
readし、そのSource-relative PathをNFCで表示することを検証する。Literal-span fixtureは全support
formatでastral、isolated-surrogate、combining sequenceをfield周辺に置き、UTF-16 `String.prototype.slice`
round trip、1つのorigin occurrenceからmetadata/relationship/derivationへの共有、distinct origin間overlapの拒否を
検証する。Multi-provenance fixtureはtool/kindごと正確に1 recognitionであることを証明する。Package fixtureはpackage payloadとpackage-manager生成symlink/`.cmd`/`.ps1`
launcherを分け、その正確なdeclared Node targetとargv-only bodyを検証する。Package fixtureはさらに必須の
2つの`dist/` entryとpacked manifest fieldを扱い、byte/item-count境界をassertしない。Coordinator fixtureは
slot-capacity fixtureなしでFIFO serialization、disable priority、`202`/`409` race disposition、cancellation、late-result rejectionを
検証する。Injected recoverable Node.js/parser/editor/transport failureはsafe failure、atomic publication、responseをtruncateしない
ことを証明し、file sizeとcollection cardinalityがproduct validation ruleではないことも確認する。Process-level OOMとkernel
terminationはin-process recovery testのscope外とする。Diagnostic fixtureはclosedな
`file | source | session` scope unionをenforceする。File scopeはowning `sourceId`、`fileId`、`sourceRelativePath`を持ち、
source scopeはowning `sourceId`だけを持って`fileId`と`sourceRelativePath`を持たず、session scopeはこれら3 fieldを
いずれも持たない。Source/session scopeのDiagnosticが表示またはordering fieldを満たすためにpathを捏造してはならない。

**決定**: Vendor conformance fixtureとnegative near-missに加え、symlink-transparent read、encoding、recoverableな環境failure、literal
credential、環境変数参照、import、executable declaration、malformed formatのfixtureを保守する。
Pure recognizer/parserとliteral-display DTO、session API contract、source boundary integration、pack済み`npx`、
100k/500 performance case、4つのPlaywright user storyをtestする。SC-008は
[accessibility受入contract](contracts/accessibility-acceptance.ja.md)のWCAG 2.2 Level A/AA全55行applicability matrixと
客観的pass ruleに対し、criterion固有のstable check IDと指定済みautomated、keyboard、manual evidenceを組み合わせて評価する。
Closed manual matrixはpacked candidate、両locale、3つのsupported OS/browser/assistive-technology cell、responsive/visual
profile、workflow state、input profileをfreezeし、applicableな全cellを記録して、frozen value変更時は全manual checkを再実行する。
Axeのseverity結果だけを
受入evidenceとせず、Applicable行のfailureをpassへ変更できない。SC-003、SC-004、SC-005、SC-007、SC-009は、
stable case ID、required-class membership、客観的expected outcome、fixture/builder reference、fixtureごとのdigestを持つ
version付きでcheck-in済みのrelease-evidence fixture manifestを共有し、release candidateごとの正確で非ゼロなdenominatorを
freezeする。Canonical manifest digestと実行済みcase IDをevidence recordへ入れる。Contractはmissing、duplicate、undeclared、
unexecuted、digest-mismatched case、required classの空集合、fixture欠落、declared minimum未満のdenominatorを拒否する。
黙ったdelete/reclassifyを認めず、caseのremove/reclassify、required-class定義の変更、expected outcomeの変更ではmanifest versionをincrementして明示的なreviewを受ける。Fixture byteだけを変更する場合は、影響するfixture digestとcanonical manifest digestを更新する。どちらの変更も新しい直接比較不能なmeasurement setを開始し、digest driftだけでdenominator semanticsの変更を認可しない。Automated contractはtable-drivenなprevious/current manifest revision pairでこれらのtransition ruleを検証し、reviewer stateを推測しない。実際のrelease diffについては、T1062が初回作成またはprior/current version、変更したcase ID、required-class定義またはexpected outcome、明示的なreviewer decision/referenceをbilingual validation recordへ記録する。これによりmaintained suiteを
進化可能にしつつ、releaseがdenominatorを暗黙に縮小することを防ぐ。4つのregistry fixture suiteは
全behavior/rule/strategy/source ID、相互evidence link、正確なsection anchor、英日parity、Inspector matcher
registryだけがreadを認可できることをvalidateする。Matcher fixtureは`./`なしのRepository selectorとbare
`**/`を拒否し、exact/direct-child/explicit descendant inventoryを区別し、`./**/`がvendor traversal factを
satisfiedにしないことを証明する。Targeted regression fixtureはCopilotの別々のVS Code/CLI/Cloud lookup表、
選択した正確なRepository rootだけのClaude project settings、non-recursiveなCodex rule directory、plugin activation対
authored manifest inventory、FR-015からFR-018外へのGlobal read 0件を扱う。
さらに、tool別Global Sourceが0から3つで各tool最大1つ、各Sourceが正確に1つのrootとSource-relative Path
namespaceを持つこと、literal credentialのexact表示、reveal controlがないこと、環境変数を置換しないことを
検証する。Lifecycle fixtureは全4 Sourceの未解決failure共存、Source別clear/replace/removal、自動初回failureの
current stateを扱う。Browser fixtureはlifecycle-triggered check、browser/network/runtime rejection、hidden/page purge、
session mismatchを伴うport再利用、continuously visibleなidle page上のprocess lossにwall-clock保証がないこと、late responseの
epoch rejectionを扱う。macOS、Linux、Windowsでpure Node.js
integration suiteを実行し、symlink-transparent read、broken linkの`file-unreadable` diagnostic、
link cycleでのscan終了、unreadable file、binary content、全byte decode
outcome、missing/unreadableなroot、`partial` commitによるper-file failure分離、最後にcommitした
snapshotへのfatal-rescan rollback、pack後実行を扱う。Local fixture rootとproductの全
socket/HTTP(S)/DNS/SMB/URI/image/remote-reference/MCP surfaceをinstrumentする。発行済みのexactな`127.0.0.1` authorityにおける
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

- **SC-001**は、通常の開発作業でGitとcommand-line interfaceを使うがInspectorを利用したことも開発へ参加した
  こともない参加者を正確に20人使用し、提供されたproduct guidanceだけで2分以内に19人以上の成功を要求する。Timerは
  標準化されたtask promptの提示時に開始し、発見済みfile 1つのsource/details viewが画面に開かれて操作可能に
  なった時点で終了する。機材はprompt提示前に、verified distributionの`repository/` working directoryを意図する
  Repository rootとして準備する。計測対象のparticipant操作は固定fd6行
  `npx --no-install agent-customization-inspector --no-open`の入力から始まり、起動とpin済みcertified browserでの意図的な
  printed-URL fallbackを含む。Directory移動または`--cwd`指定はこのstudyのparticipant操作ではなく、automatedなUser Story 1
  テストで検証するproduct capabilityとして維持する。SC-001は同じcohortのSC-006より先に行う。
  Moderatorはpromptを同じ文面で読み直すことだけ可能とする。登録済み参加者は全員fixed denominatorに残し、
  差し替えない。機材、環境、product failureがcriterion completionをpreventまたはinterruptする場合は、timer開始前を
  含めて不成功とする。唯一のscoring carveoutはhandled automatic-browser-opening conditionであり、そのconditionを記録して
  pin済みcertified browserでprinted-URL fallbackを要求する。Original 2-minute timerはpause/resetせず継続し、no-hintsで
  original interval内に完了した場合はunsuccessfulではなくsuccessfulと数える。Fallbackのprevent/interruptionは不成功のままとする。
- **SC-002**は、内容を変更しないdeterministicな100,000-entry/500-match fixtureを1つ用意し、version付きで公開した
  1つのreference-environment profile上で正確に10回の測定runに再利用する。Checked-in profileは正確なOS image/version、
  processor architecture/modelとlogical count、memory、storage/filesystem、application runtime、benchmark command/configuration、
  fixture manifest/digestを記録する。結果には実際のvalueを記録し、personal identifierとabsolute user pathだけを省略する。
  Profile変更時は直接比較不能な新しいsetを開始する。Fixture構築、setup、`npx` download/installation、process start、
  自動初回Repository scanはtimer外とする。各fresh processでその自動scanがterminal stateへ達するまで待ち、browserから
  明示的なRepository rescanを正確に1件dispatchした時点で両timerを開始する。そのadmission responseからopaqueな
  `scanRequestId`を得る。1秒以内に同じIDを持つstatusがqueue済みであること、active scan phase名、または
  complete/`partial`（file-confined outcomeのみ）/failedのいずれかを画面とassistive technologyへ表示し、failureには実用的next stepを含める。
  Generic spinner、loading label、変化しないcontrol、scan stateのないacknowledgement、以前のrequestのstatusはqualifyしない。
  同じrequestがcommitしたgeneration由来の完全で操作可能なinventoryを10秒以内に表示し、以前のstatus、snapshot、
  automatic-scan generationはqualifyしない。結果にはrequest IDとcommitted generationを記録する。各runで
  inventoryが操作可能になった後、標準化されたfilter actionとitem-selection actionを1回ずつ実施し、browserの
  input dispatchから対応するfiltered resultまたはselected-state feedbackが表示され操作可能になるまでを測定する。
  9回以上がrunごとに両方のscan thresholdを満たし、両interactionを100ミリ秒未満に保つ必要がある。各runは新しいInspector processを使い、application-memory stateや
  以前のsnapshotを再利用しない。Operating system filesystem cacheは意図的にclearせず自然に変化する状態を使う。
  結果はportable guaranteeではなく公開profile固有とする。
- **SC-006**はSC-001後に同じ20人を以前の結果にかかわらず使用し、同じ指定fileを開いた同一の準備済みInspector
  stateから開始する。Timerはstateの準備完了後に標準化されたpromptを提示した時点で開始する。Standardized
  response formはsource、recognizing tool、file type、effective behaviorがcertainかconditionalかの4項目を必須と
  し、2分以内に全項目がpredefined ground truthと一致した場合だけ成功とする。提供されたproduct guidanceと
  SC-001のmoderator policyだけを使って18人以上の成功を要求する。Moderatorは客観的workflow outcomeと事前定義済み
  safety eventを記録する。Study equipmentはSC-004のproduct network/URL/MCP instrumentation、exact-authorityの
  Inspector-server request ledger、study-browser request captureをSC-001前のInspector launchから4つのworkflow観察完了まで
  継続する。Prepared stateは固定profile `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`、すなわちUbuntu 24.04 x64/
  Node.js 24.18.0上のPlaywright 1.61.1 Chromium、headedなfresh nonpersistent context、empty extension、browser-context-only proxy、
  `single-407-basic`を選ぶ。Proxy/serverはChromium-controlled Fetch Metadataとexact Origin/Refererを独立project/discardするが、
  Metadataはconsistencyだけとし、participantにはarmed supervisor-owned navigation grantとexact authorized-static targetも要求する。Exact authorized participant/bundled-SPAだけをforwardする。Extension、missing-secret other-host、invalid-secret unknownは
  N/A IDのunrelatedとし、残るvalid-secret unknownはopen binding IDでproduct-attributable/prohibitedとする。観測できるOS-mediated mounted/mapped-
  source trafficはFR-022 limitationとして別に記録する。意図しないexecution、inspected-source mutation、FR-022で定義した禁止対象のdirect product-issued outbound requestまたはMCP connection、
  exactな2つのauthorized internal loopback class外のrequest、別machineへのinspected content開示はすべて自動的にcriticalとする。この2つのclosed classは
  outboundでもMCPでもなく、このeventには含めない。記録済みpre-mounted/mapped sourceのOS-mediated trafficはFR-022 limitationであり、このautomatic
  connection eventにはしない。ACK済みcorrelationはfailure用eligible linkにすぎず、successは全N/Aのままautomatic issueを別countする。
  Candidateがあるfailureはsame-contextのexact `automatic-critical` linkをreviewなしで必須とし、candidate-free failureだけがisolated/hidden/one-use classification 2件を使う。両`product-caused-blocker`は`reviewer-confirmed-critical`、両
  `not-product-caused-blocker`は`reviewer-cleared`、一方ずつは`reviewer-disagreement-critical`とする。Published bilingual governance planはrequired reviewer rosterを記名し、repository bundle/work root/candidate/runtime IPC/capture/evidence外のseparate access-controlled administrative assignment recordがcaseごとのunique human pairをaudit用に記録し、consent-retention policyで破棄する。Identity、assignment、note、communication、human/process/case-assignment reuse、第三reviewerはcollector/outcome/repository study-input/runtime IPC/capture/evidenceで禁止し、admin recordはscoring/runtime/evidenceに影響させない。`reviewer-confirmed-critical`/`reviewer-disagreement-critical`だけが`workflow-blocker`を使う。
  `automatic:<correlationId>`と`reviewer:<subjectId>:<workflowClass>`のtagged/deduplicated unionをemptyとし、automatic-linked workflow rowを
  二重計上しない。
  このためcapture start時にsupervisorはfresh、unique、cryptographically random、run-local、unlinkableなparticipant tokenをexactly 20件作り、各tokenを
  exact 32 random byte（256 bit）からunpadded base64url正確に43文字でencodeする。`subjectId`だけを許可するpseudonymous human
  evidenceとし、identity、distribution、response、retained external mappingを持たせない。Participant observationはtoken 1件、その他の
  observationはliteral `not-applicable`を使う。Supervisorはordered setだけをrun-localに保持し、次tokenのみをauthenticated `attempt-binding`で送り、harnessはscheduleのみでtokenを作成/選択しない。Study-browser streamだけが各tokenとdiscovery、inspection、comparison、Global consentを
  crossしたterminal success/failureを正確に1件ずつ、合計80件記録し、19/20、18/20の式とsame-cohort ruleを機械的に検証可能にする。
  Nonterminal/request messageは任意件のままとする。Exact-80 cardinality/canonicalityはsuccess thresholdから独立し、validなterminal record
  80件があればthreshold未達でもverification、stop、finalize、witness、sealを完了できる。Threshold未達はrelease criterionをblockするが
  evidenceをinvalidateせずautomatic criticalにもせず、protocol、cardinality、authentication、privacy違反は別にfail closedとする。
  Capture startはrun-levelだけとし、materializeがexact 1回だけ起動した既存live supervisorを使い、harness/moderator/3 adapterをlaunchし、各adapterにwatchdogをlaunchさせ、watchdogをadapter childとするexact 8 internal long-lived descendant/processを構成する。Participant 1〜19はsequentialに4 workflow全てを完了/closeし、participant 20はcheckpoint前にdiscoveryを完了して、
  terminalizeされなければsole open attemptとしてcontinuationで残る3件を完了する。Terminalize済みならpost-anchor heartbeatをcontinuation progressとする。
  Attempt-local profile/marker/bootstrapはstream開始後かつ対象`npx`/first capturable request直前に作る。

  Study harnessはattempt schedule、scoring moderatorはcall-local raw response/rubric inputを所有する。Runtime-only
  `StudyCurrentSubjectScoringContext`は`automaticIssueCorrelationId`と`terminalizationClass`を追加する。Launch/bootstrap/buffer中はcontextを作らず、process bind+
  ordered release、open-binding両ACK、discovery-context ACKの後だけreadiness、grant/navigation、taskへ進む。Buffered eventはworkflow/process/link N/Aで後からlinkできない。
  許可するone-way updateは
  N/A→first matching accepted correlationとnone→mapped causeだけとする。Supervisorがsafe current-workflow mirrorを所有し、open contextでsame-run/subject/process/workflowが一致するeventだけをcandidateとしてvalidateし、canonical safe-payload serialization前にcurrent workflowをtagしてexact 1回serializeする。下流adapter/watchdog ACK後にobservationをaccepted/countし、mirror update、updated `scoring-context`のmoderator ACK、release/outcomeの順とする。Accepted retained observationはimmutableで、後のworkflow tag mutation/backfillを禁止し、pre-ready/context-free N/Aは永久にN/Aとする。この値はfailure用eligible candidateでoutcomeを決定せず、automatic issueは別にcountする。Outcome accept後にcontextをdestroyし、次prompt/timer/task前にnext contextをACKする。
  Exact-once `StudyWorkflowOutcomeSubmission`はreview field前に`automaticIssueCorrelationId`を追加し、successはcandidateがあっても全N/A、candidateがあるfailureはexact
  ACK済みsame-context `automatic-critical`を必須とし、candidate-free failureだけをreviewする。
  各attempt前にsubject/workflowごとのdistinct human pairを割当て、recording/IPCまたはhuman/collector process/component-run identity/case assignmentのreuseなしでsame live attemptとterminal eventを直接観察させる。Literal reviewer slotとsanitized terminal surfaceはdrain/reset後にfresh mappingで再利用できる。
  Failure後だけmoderatorがbyte-identical `StudySafetyReviewCase`をfresh isolated one-use vote collector 2件へ送り、caseが完全表示された後だけslot-isolated inputをenableする。各collectorはLF終端ASCII enum `product-caused-blocker | not-product-caused-blocker`をexact 1件読み、echo/history/recording/log/cross-slot outputを禁止してcall-localにwipeし、first voteをreviewer twoへ見せない。両collector exit後にacceptする。
  両non-product voteは`reviewer-cleared`、両product voteは`reviewer-confirmed-critical`、splitは`reviewer-disagreement-critical`とし、後2者だけ`workflow-blocker`を使う。
  Outcome pathはmoderator→supervisor→browser adapter→watchdogとする。Supervisor→browser adapterの`safe-payload`はnonworkflow browser専用でoutcomeを運んだりbypassしたりせず、
  supervisorだけがtag/constructしadapterがcandidate validateしwatchdog ACK後だけsemantic ACKを返す。Browser-only releaseはそのACK、joined releaseはbrowser/server両safe ACK後とする。Raw scoring/reviewer
  materialはIPC、retention、hash、log、outputへ入れない。Authorized materialize callerはpairwise-distinctでbidirectional、nonrecording/no-echo/no-historyのexternal terminal-equipment handleを4件提供する。Fd6 participant、fd7 moderator、fd8 reviewer one、fd9 reviewer twoでinternal evidence IPCではなく、materializerがsupervisor launch前にstable identity、distinctness、propertiesを検証する。Supervisorはfd6を保持しfd7〜9をmoderatorへ渡して自分のcopyをcloseする。正常完了するopen contextごとにfd7はcompact canonical UTF-8 `StudyModeratorInput` JSON+exact LFを1件だけ運び、root orderは`schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `response`, `timing`, `groundTruth`, `rubric`、timingはcanonical nonnegative decimal string、他3 raw valueはcanonical JSON stringとする。EOF/parse/extra/trailing/replay/cross-contextをfailureとし、inputをcontext限定でenableしてuse/abort後wipeする。Terminalization-synthesized remaining workflowはrecord 0、late rejectで空response/timingを捏造しない。Negative testは全field/review branch、両process-ID branch、exact-onceを変化させる。
  正常にlaunchしたparticipant Inspector processのexact readiness transition中、readiness responseを返す前に、
  supervisorはexact 32 cryptographically random byte（256 bit）をunpadded base64url正確に43文字でencodeしたfresh opaque
  `inspectorProcessId`を1件付与し、
  OS PID、subject ID、watchdog/capture identifierと区別する。これはnon-human launch correlation専用で、pseudonymous human evidenceではない。
  同じlaunchのrequest/effect/workflow recordへ同じIDを伝播し、別launchではreuseしない。
  Launch/readiness前failureはprocess IDをliteral `not-applicable`とする。Terminalizationはaccepted rowを保存し、fixed orderでmissing workflowだけの
  mapped-class context、terminal failure、required reviewを生成してduplicate/extra workflow recordを作らない。
  これによりreal process IDをretentionせず20 attemptとobserved product
  processを安全にbindする。

20人studyは、automationとprojectに詳しいcontributorだけではproject contextを持たない初回利用者のdiscoverabilityと
interpretationを確認できないため、initial-release evidenceとして実施する。固定denominatorはpopulation-levelの統計的
主張ではない。Maintainer teamは、accountable study owner、recruitmentとcompensation-funding owner、moderation/review staff、
schedule/support contact、consent/privacyとanonymized-retention process、提供repository/equipment/session support、accessibility
accommodationを示すbilingual planを公開する。通常のcontributorはparticipantをrecruit、fund、moderate、reviewしない。
Study resource不足はrelease claimをblockするが、それ以外は適合するcontributionのreviewをblockしない。Materialなworkflow、
guidance、fixture、rubric変更は次のstudyをtriggerする。Kit authoring中に、maintainerは
`tests/usability/sc001-sc006-study-inputs/`配下のexact repository-owned member set、candidate-independentなversioned manifest、
companionをmaterializeしてcontract-testする。Manifestは`manifestVersion`と`inputs`の間にexactな`bundleRoot`を追加し、entryの
fixed `inputId`/`role`/`path`/`sha256` order、raw-UTF-16 input-ID sort、全role nonzero coverage、root配下のunique path、bilingual別ID、
raw-byte digest、exact Node.js pretty-JSON serializerを維持する。Recursive regular-file setはcontract member set/manifest path setの
両方と一致しなければならない。Link、alias、non-regularまたはidentity-unverifiable object、path escape、distribution drift、追加の
local/remote/printed/ad hoc inputはfailureとする。Repository-owned builderだけがdistributionを作成でき、independent verifierがacceptしなければならない。
SC-001直前にverifierがsource bundleと20件すべてのactual distributionをrewriteせず再列挙するが、candidateをread、stat、hash、freezeしない。
成功したinputs phaseがfreezeするのはverified canonical study-input-manifest digestとexact-set stateだけとする。Candidate作成後、
`capture -- start`をcandidate authorityをreadする最初のphaseとし、capture開始前にcandidateをreopen/stat/hashしてidentityとSHA-256をfreezeし、
そのmanifest digestへbindする。
Candidate byteまたはbundle member変更は両criterionを無効にし、final candidate/manifest pairがvalid evidenceとexact一致しない限りpaired
protocol全体を再実施する。

Pairのevaluation-fixture JSONは全derived repository path、encoding、exact byte representation、digestを固定するdeterministic virtual
file-tree descriptorとする。別のrepository-owned builderがfresh repository 20件をmaterializeし、independent verifierが全derived set/byteを
再計算する。両descriptorはbuilder、verifier、capture-controller scriptのpath/digestをbindし、focused contract/integration/security suiteの
実行結果をrelease evidenceとすることで、generated fixture byteをunmanifested-input escapeにしない。各distribution rootはexact
direct-child directory `study-inputs/`と`repository/`だけにcloseする。前者はsource 16 memberのbyte-identical copy、後者はcomplete
descriptor output treeを保持し、他のtop-level member、sidecar、collision、alias/reused identity、escapeをacceptしない。Candidateと
equipment/runtimeのbindingはそのroot外に置く。

Publicなbuilder、capture、verifier harness 3件はそれぞれNode.js built-inだけに限定したself-containedなsingle source fileとする。
Sourceに含めてよいimportは`node:` built-inのliteral static importだけとする。Local/package import/helper、dynamic `import()`、`require`、
`createRequire`、`eval`、`Function`、`vm`、`process.dlopen`、別loader hook、alternate worker/child entryを禁止することで、各descriptor
digestがcomplete executable implementationを被覆する。Builderが実行できるのはmaterializeのinternal supervisor modeにおけるdigest-verified capture fileだけとし、
そのfileはexact `supervisor`、`study-harness`、`scoring-moderator`、`reviewer-one`、`reviewer-two`、3 named adapter、3 named watchdog modeだけに自分自身をre-executeする。
Product probeはdistinct import modeとし、各childをauthenticated inherited parent IPCとfresh one-use bootstrap nonceでgateする。

**Inherited-capture IPCの決定**: 各parent/child edgeはenvironment、argv、fileではなくunidirectional inherited anonymous pipe 2本（parent→child、
child→parent）を使う。Child verification後、parent→child pipeの先頭へfresh seed、nonce、`channelId`を含むexact 96-byte bootstrap prefixを送り、
同じpipeをopenのままLF-framed parent→child messageへtransitionする。Bootstrap EOFを送らず、96 byte未満のEOFはfailure、prefix後の全byteは
canonical frame parsingへ入る。Child→parent pipeはsequence 0のauthenticated one-use `ready` frameを最初に送る。Verified childはdomain-separated HMACでdirection keyを分離導出する。LF終端canonical frameのexact
root orderは`schemaVersion`、`channelId`、`sequence`、`direction`、`senderRole`、`receiverRole`、`messageType`、`authenticationTag`、
`payload`とする。Authenticationはtagをnullにしたcompact canonical JSONをLFなしで再構築し、populated transmitted frameだけLFをappendしてconstant timeで比較する。各directionはsequence 0から1ずつ増え、
role/message matrixとone-use ready transitionをclosedにする。Parse/auth/sequence/role/pipe/child/abort/crash/exit failureはmaterialをwipeし、new control
commandなしでfail closedにする。Verified child/directionをpayload受付前にbindし、ambient process configurationへbootstrap authorityを露出しないため採用した。
Environment/argv/file bootstrapはobservable/inheritable residueを作るため、shared bidirectional pipeはdirection/close-state reasoningを弱めるため不採用とした。

**Bootstrap/lifecycle/stream routeの決定**: Materializer edgeは`ready`直後にone-use `runtime-bootstrap`でexact
`StudySupervisorRuntimeBootstrap` root `schemaVersion`, `workRootLexicalValue`, `workRootCanonicalValue`, `workRootIdentity`, `controlEndpoint`, `controlToken`を送る。Supervisorがroot独立validation、endpoint bind、token load、ACKを完了するまでwork-root mutationを禁止し、consume後frame bufferをwipeする。成功時はrole-specific lifecycle close/ACKでedgeだけdetachしsupervisorをliveに保ち、failureはabort/exitする。Authorityはchild env/argvに入れずtransient bootstrap、supervisor memory、runtime-controlだけに置く。

Descendant witnessは`process-lifecycle-attestation`のexact `StudyProcessLifecycleAttestation` root `schemaVersion`, `processRole`, `streamRole`, `componentRunId`, `instanceId`, `processRunId`, `event`, `exitCode`, `signal`、event `registered | exited`にcloseする。Adapter self-registrationはexit observationではない。Direct parentがOS-observeしてからreportをforward/createし、adapterはmatching watchdog registrationと直接観測したclean exit、moderatorはready reviewer registrationと直接観測したclean exit、supervisorはadapter/harness/moderatorをreportする。Reverse `acknowledgement`は直前valid attestationのみでcandidate/terminal reportに使わない。Adapter registrationのsupervisor ACK後にwriter-binding relay、watchdog registrationのadapter/supervisor ACK後にstart、reviewer exit ACK→outcome、watchdog exit ACK→adapter exitとする。Startは6 registration、stopは3 watchdog attestationとdirect adapter/orchestrator exitを待ち、nonclean childは`lifecycle: child-exit`でrun invalid/witness非対象とする。

Stream lifecycleはexact `StudyStreamControl` root `schemaVersion`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `streamRole`, `command`, `checkpointRequestId`, `handoffSha256`、command `start | checkpoint | anchor-handoff | stop`と、exact `StudyStreamControlResult` root `schemaVersion`, `controlSessionId`, `studyRunId`, `streamRole`, `command`, `checkpointRequestId`, `sequence`, `monotonicNs`, `envelopeSha256`を使う。Byte-identical `stream-control`をsupervisor→adapter→watchdog、semantic `stream-control-result`をreverse routeし、各barrierは3 resultを待つ。Start resultは`capture-start`+first heartbeat後のpositionとN/A `checkpointRequestId`を返す。Supervisorがcreate/validateしたstream fileの専用append-only handleをexact spawn inheritanceのfd5だけで渡す。Path-free runtime-only `StudyStreamWriterRuntimeBinding`はexpected adapter component/instance/process identityをfd5 stable handle identity、`nlink`、append modeへbindする。Adapter registrationのsupervisor ACK後にbinding/handle relayとbinding ACK、watchdog independent validation/registrationとadapter/supervisor両ACKを行う。3系統すべてのwriter barrier/全6 registration後にproxy-binding ACK、その後にstream startする。Handleはcontract-fixed child-visible evidence-writer slotでadapter経由watchdogへ渡す。Path/cwd/env/argvは使わず、slotはnonstream roleになくthird IPC pipeではない。Adapterはtransfer-onlyでregistration後、supervisorはcomplete downstream ACK後にcopyをcloseし、extra/duplicate copyを禁止してwatchdogをsole writerとする。Stopはresult→handle close→exit、failureは全copy close/run invalidとする。

Proxy authorityのexact raw routeはauthorized start-through-stop caller transient input→authenticated runtime-control `StudyLiveBinding`→supervisor dedicated memory→one-use `browser-proxy-binding`→adapter dedicated memory→attempt-local DevTools control request/browser contextとする。Caller/control/frame/request bufferはACK後にwipeする。全6 registration/writer-binding barrierをsupervisorがACKした後にだけexact `StudyBrowserProxyRuntimeBinding` root `schemaVersion`, `studyRunId`, `browserProxyAuthority`をready/registered adapterへ送り、validate/listener bind/ACKさせる。そのACK前に`stream-control:start`、capture-start、start completeを禁止する。Authority holderはstop/failure cleanupを除いてsupervisor/adapter dedicated memoryとlive contextだけとし、checkpoint/continuation equalityを検証してstopでwipeする。Env/argv/evidenceを禁止する。

Executable protocolはphase matrixを使う。`INSPECTOR_STUDY_WORK_ROOT`、externalな`INSPECTOR_STUDY_CONTROL_ENDPOINT`、runごとにfreshな
exact 32 cryptographically random byte（256 bit）をunpadded base64url正確に43文字でencodeした`INSPECTOR_STUDY_CONTROL_TOKEN`を
materializeからfinalizeまでrequiredとする。Materialize/input verificationは
`INSPECTOR_STUDY_CANDIDATE_TARBALL`をignoreしてrequiredとせず、startで初めてrequiredとし、以後finalizeまで各clientが再送する。
Candidateは事前に存在してよく、materializerが作るのはdistributionであってcandidate fileではない。Materialize時にauthorized setupはidentity-pinned `npx`をsanitized equipment PATHへ、work root/distribution外のreserved initially-empty candidate-launch store-bin slotを固定し、materializer/inputsはslotをreadしない。Input verification成功後かつstart前にsetupだけがcandidate tarball+frozen production graphから同じknown slotへnetwork-disabled/scripts-disabled storeをprovisionしてdigest-bindする。Start時にsupervisorはinherited slotを再検証し、pinned `npx --no-install`でsole audited binだけをresolveする。Raw tarball pathをchild env/argvへ入れず新しいenvironment/control fieldを作らない。Distribution mutation、cache/network/install/alternate PATH/global/fallback resolutionを禁止する。Abort/stop/finalizeでruntime/evidence外storeをdestroyしてabsence barrierを要求する。Work rootはstudy setup提供のstableな
absolute empty ordinary-local workspaceとし、explicit platform network spellingをI/O前にrejectする。Pre-mounted/mapped-filesystemはlocality
proofをclaimせず既存FR-022 limitationのままとする。

4番目のruntime-only input `INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY`はstartからstopだけrequiredとし、exact `127.0.0.1:<port>`形式とする。
Materialize、input verification、finalizeはreadせず、stop前checkpoint/continuationはrequiredとする。Study setupはfresh browser contextのproxyだけへ設定し、
browser-wide/system proxyにせず、study-browser adapterがexact listenerをbindする。Participant candidateはsupervisor-owned grant correlationを使い、
その他のbrowser trafficだけproxyがfresh safe opaque IDをassign/replaceする。別local clientはunrelatedのままでactor/process
correlationなしにproductへattributeしない。Authority/proxy configurationをevidence、hash、log、diagnostic、outputへ入れない。

Endpointはwork root/distribution外のtransient endpointとする。POSIXではabsolute Unix-domain-socket pathname、Windowsではexact
`\\.\pipe\agent-customization-inspector-study-`の後にlowercase hexadecimal 32文字を続ける。TCP、UDP、DNS、全network transport、
remote/network named-pipe spelling、work-root sidecarをrejectする。Materializerがdigest-verified capture fileをsole internal supervisorとしてexact 1回だけ起動する。
Capture startはその既存live supervisorを使い、long-lived harness/moderator/3 adapterをspawnし、各adapterがwatchdogをspawnする。Reviewed failureごとの2 ephemeral collectorはmoderatorだけがfailure後にspawnする。
Token-authenticated hello/challenge
protocolでfinalizeまでaliveに保つ。全runtime-control authentication tagはexact canonical payloadを被覆する。Runtime-control path valueの
transient/non-retained HMACはchannel integrityだけに許可し、evidence commitment/hashはpath-freeのままとする。Work-root/candidateのlexical/canonical authority valueを扱えるのはauthenticated runtime-control IPCと
supervisor memoryだけとし、後続clientは値を再送してcandidateを独立stat/hashする。Exact transient control-message HMACを除き、
capture-evidence IPC、raw commitment input、retained artifact、log、outputへpath、HMAC key、tokenを入れない。Supervisorはinitial work-root
identity、start candidate identity/digest、checkpoint
position、original handoff anchor、supervisor-directの3 adapter/2 orchestrator exit、adapter-attestedの3 watchdog exit、moderator-attested ephemeral reviewer exit countを記憶する。Path-free HMAC commitmentと1つの
`controlSessionId`をstart、handoff、continuity witness、sealへbindし、finalize中に全authority value/secretを破棄する。

Canonical control request/responseは`requestId`とclosed response `errorCode`をretainし、raw tokenを送らない。Materialize済みsupervisorはrun-scopedな
fresh `controlSessionId`を1件生成してfinalizeまでstableに保つ。Helloはsession/challenge/tag/payloadをnullで開始し、そのstable session IDを返して
fresh one-use `challengeId`だけを生成・authenticateする。以後のdirection-separated HMACはnull tagを含むcomplete canonical messageを被覆し、
challenge/request IDを1回だけ使う。Closed commandは`hello | verify-inputs | start | checkpoint |
read-checkpoint | anchor-handoff | verify-continuation | stop | finalize-prepare | finalize-commit | abort | register-pre-readiness-probe |
buffer-pre-readiness-product-event | register-product-probe | submit-product-event | close-product-probe`とする。Finalize-prepareはsupervisor内部でcurrent binding、continuity、exitを検証し、endpointをliveに
保ったままcomplete witness materialを準備してliteral `null`を返す。Continuity keyはsupervisor memory外へ出さない。Separately authenticatedな
finalize-commit connectionをacceptしたsupervisorはlistener teardownを開始し、既にopen済みのconnection上でexact `StudyContinuityWitness`を返して
からkeyを破棄してexitする。Verifierはcomplete responseに続くEOFとreconnection failureを要求し、その後にwitness pair、次にseal pairを
write/re-readする。

Workspaceのretained stateを20件のnamed distribution、envelope/safe-payload lineが交互に並ぶ3 ledger、verifier-only canonical
handoff/digest pair、finalize成功後のexact `capture/study-continuity-witness.json`/`.sha256` pairと
`capture/study-capture-seal.json`/`.sha256` pairへcloseし、他のsidecarをretainしない。各writerはimmutable checkpoint prefixをatomic
snapshotした直後にheartbeat/event appendを再開する。Verifierがhandoffを書いた後、run/request/digestをsupervisor経由で送り、各watchdogが
matching `handoff-anchor` record exact 1件をcheckpoint後かつstop前に、normal append/heartbeat schedulingをpauseせずappendする。
Checkpoint取得時に既にqueue済みのordinary post-prefix pairはanchorより先にappendされてもよい。Continuationは全intervening pair、sole
matching anchor、同じuninterrupted chain上でその後に続くordinary heartbeat/payload 1件以上を検証する。Stop/sealは同じdigestとliteral-one countをbindするため、両handoff fileを別の
internally valid prefixへ置換しlater linkを再計算してもfailureになる。

Evidence designはexact 3 roleを使い、各roleはdistinct capture adapterと、sole envelope writerとなるdistinct watchdogを持つ。Adapterはraw
trafficをmemory内でだけinspectし、closed safe eventをderiveし、IPC前に全raw valueをdiscardする。Raw headerのname/framing/wire/encoded
representation、全noncanonical derivative、body、content/metadata、participant response、path、URL/authority value、capability、environment
value、raw errorをhash/retainしない。Header由来の唯一の例外はstrict validation済みdecoded canonical safe IDを`correlationId`としてretained
canonical payload/digest chainへ入れる場合である。Captured wire/browser/Inspector byte自体をhash preimageにしない。IPC message 1件はsafe payload
正確に1件を運ぶが、primary-workflow observation 1件からcount/chain対象のevent messageを任意件生成できる。Fixed code、
protocol-owner-generated opaque ID、boolean/enum、safe integer、evidence digestだけがcanonical safe-payload byteへ入る。各requestはさらにprivacy-safeで
exactなroute/target classifier `targetClass`を使う。Closed literalは
`static-manifested-asset | static-spa-shell | static-client-route-fallback | api-get-session | api-get-session-liveness | api-get-file |
api-post-repository-rescan | api-get-global-consent-preview | api-post-global-consent-preview | api-post-global-enable |
api-post-global-rescan | api-post-global-disable | other-loopback | remote | mcp | unclassifiable | not-applicable`とする。Closed truth tableはauthority、target、route、method、capability、origin、same-host、attribution、request
class、prohibited statusにまたがるauthorized-static/declared-API combinationだけを許可する。全rowは`eventCode: observation`、
not-applicable workflow class、observed outcome class、correlation-context subject/process ID、fresh event/correlation IDを持つ。Exact authorized-static/API
table rowだけがeffect `none`とprohibited falseを使う。Table外のproduct-attributable exact-issued requestはrequest observation、該当する
`participant | bundled-spa | inspector` actor、exact-issued authority、prohibited request class、observed closed target/method/capability/origin、unauthorized-request、true
same-host/attribution/prohibitedを使う。Other-loopbackはother-loopback authority/target、prohibited request class、observed closed method、
not-applicable capability/origin、unauthorized-request、同じ3件のtrue booleanを使う。Remoteはremote authority/target、prohibited request class、
observed closed method、not-applicable capability/origin、prohibited-outbound-request、false same-host、true attribution/prohibitedを使う。
Fully unclassifiableなproduct-correlated requestはunknown actor、unclassifiableなauthority/request/target/method/capability/origin、
unauthorized-request、false same-host、true attribution/prohibitedを使う。MCPはMCP observation、Inspector actor、target `mcp`、
not-applicable authority/request/method/capability/origin、mcp-connection、false same-host、true attribution/prohibitedを使う。Browser trafficではproxy/serverが
exact Chromium-controlled `Sec-Fetch-Dest`、`Sec-Fetch-Mode`、`Sec-Fetch-Site`、`Sec-Fetch-User`とOrigin/Refererを独立project/discardするが、
Fetch Metadataはhuman attestationではない。Product readiness後かつinitial navigation直前にsupervisorはrun/attempt/fresh correlation/stateを持つarmed
`StudyParticipantNavigationGrant`をbrowser adapterへ送る。

| Secret/projection | Actor/binding | Decision |
|---|---|---|
| Valid、navigate/document/`?1`、missing Origin、site none/same-origin、exact authorized-static、current armed grant | `participant`、open binding | Adapterはstateを変えずreserveし、supervisorはcanonical grantをarmedのままvalidate/pending storeする。Sole one-use `candidate-forward`がcandidateをacceptしてcanonical grantをatomic consumeし、adapterはmatching decisionをvalidateしてからcopy consume/forwardする。 |
| Valid、participantではない、missing user、exact-issued Originまたはmissing Origin + exact-issued Referer | `bundled-spa`、open binding | Exact authorized static/APIだけforwardし、その他はproduct-attributable/prohibitedとしてblockする。 |
| Valid、extension Origin | `browser-extension`、N/A ID | 常にunrelatedとしてblockする。 |
| 残るvalid projection | `unknown`、open binding | Product-attributable/prohibitedとしてblockする。 |
| Bootstrap後missing | `other-host-process`、N/A ID | Unrelatedとしてblockする。 |
| Invalid/duplicate/malformed/noncanonical/unknown/stale/mismatched | `unknown`、N/A ID | Unrelatedとしてblockする。 |

Armed grantのないfresh HTTP request（nonexact target/post-consumption/user-activated page-script navigationを含む）はopen-binding `unknown`とfresh proxy IDを持ち、product-attributable/prohibitedとしてblockするがgrantをconsumeせずrunをinvalidateしない。Browserはproxy injection前にgrantを見ない。Adapterはstateを変えずreserveし、supervisorはgrant/correlation/attempt/candidateをvalidateしてcanonical grantをarmedのままpending storeした後、sole exact one-use `browser-broker-decision: candidate-forward`を送る。別candidate ACKは存在せず、このdecisionだけがcandidate acceptanceとcanonical grantのatomic consumeを行い、adapterはmatching decisionをvalidateしてからcopyをconsume/forwardする。Authenticated candidate/grant IPCのreplay/duplicate/stale、simultaneous second consume、broker decision/ACKのskip/mismatchはforward 0/run invalidとし、closeでgrantをdestroyする。

Forwardしたexact authorized participant/bundled-SPAだけがbrowser/server join/claimを生成する。Blocked rowはbrowser-onlyで、extension/other-host/
unknown N/A-claim branchは存在しない。Direct Inspector exact-issuedはproduct+server、nonexact InspectorとOS/effect/MCPはproduct-only、workflowは
browser-onlyとする。Field-by-field testはprojection、binding、role、booleanを1件でも変えたrowをrejectする。Study-browser captureはPlaywright/unbound instrumentationではなく、
capture scriptのNode-built-in-onlyでdeny-by-defaultなlocal HTTP/CONNECT proxyとする。Exact authorized loopback requestだけをforwardする。
`other-loopback`、`remote`、`unclassifiable` targetと全CONNECT requestをprohibitedへclassifyし、DNS lookup、socket connection、
request-body forwarding、response-content exposure前にblockしてCONNECT tunnelを確立しない。Participant candidateはsupervisor-owned grantのfresh correlationを使い、
その他のbrowser eventだけadapter/proxyがfresh 32-byte/43-character unpadded-base64url `X-Inspector-Study-Correlation`を生成する。Browser proxyはexisting valueをremove/replaceし、Inspector probeはassignする。このnon-capabilityを
auth/routing inputにしない。Server instrumentationはduplicate/invalid grammarをrejectして同じsafe IDだけをledgerへ送り、adapterはIPC前に
header/raw fieldをdiscardする。Raw headerのname、framing、wire/encoded representation、noncanonical derivativeをretain/hash/logせず、strict grammar/
canonical validation後はdecoded canonical safe-ID valueだけを`correlationId`としてretainできる。別local clientはactor/process correlationなしではunrelatedのままとする。Required
role間でsafe classification、`subjectId`、`inspectorProcessId`を一致させ、missing、duplicate、malformed、reused、mismatched propagationは
gateをfailureにする。

Evidence contract/data modelは`StudyBrowserAttemptBinding`、`StudyBrowserRequestCandidate`、`StudyServerCorrelationClaim`、
`StudyParticipantNavigationGrant`、`StudyBrowserBrokerDecision`を所有する。Supervisor/brokerはattempt/bindingを生成し、
prepared/open/closedのbyte-identical snapshotをharness/browser adapterへ送り両ACKを要求する。Open ACK後だけreadiness/grant/candidateを許可し、
ordered pre-readiness releaseとdiscovery-context ACKもreadiness前に完了し、
terminalization-decisionで両copyをterminalizingへ移す。Adapterはbrowser/grant/marker/reservation/candidate/pendingだけをdestroyしclosed ACKまでbindingを保持し、harnessはsynthesis/closed dual ACKまでbinding/fixed scheduleを保持する。両closed ACK後だけdestroy/nextへ進む。Stateはexact
`prepared | open | terminalizing | closed`とする。

Supervisorはsole participant-launch controller/direct OS child observerで、pre-bootstrap exitを含むsole product-exit sourceとし、harnessはschedule/bindingだけを担う。Probe close時のserialized child stateがalready exitedならproduct-exit、liveならpremature-probe-close、normal 4-outcome/zero-pending closeならterminalization 0とする。Browser adapterはsole attempt-bound equipment observerで、`browser-exit`はactual browser process/context exitだけ、`equipment-failure`はcontroller/proxy/auth healthy中のexternal browser/OS/environment bootstrap failureだけをreportする。Adapter/proxy/controller/CDP/auth/marker/IPC/implementation/child-management faultはrun invalidとしoutcomeをsynthesizeしない。
First valid cause wins/later reject、premature probe closeはscoring `equipment-failure`へmapする。Terminalizationはaccepted row/joinをfreezeし、
missing workflowだけのcontext/failure/reviewをfixed orderで作る。Evidence-role failureはrun invalidでsynthesis 0とする。
Byte-identical decisionはharness/adapterへfanoutし、adapterはattempt-local stateだけclearしてaliveを保つ。Broker decisionはsupervisor→adapterだけで
`candidate-forward | browser-only-released | joined-pair-released`とする。Attempt IDはsupervisor/broker/harness/adapter memory/frame/grant/candidateだけに置く。
Valid-marker bound browser-only decisionはopen attempt IDを使い、missing/invalid-marker unrelated branchだけN/Aとする。Pre-readiness terminal submission/case/両voteは同じN/A process IDを反復する。

**Browser profile/markerの決定**: Actual captureはprepared-state-selected fixed profile
`playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`を使う。これはPlaywright 1.61.1 `chromium` revision `1228`、
browserVersion `149.0.7827.55`、title `Chrome for Testing`、Ubuntu 24.04 x64、Node.js 24.18.0、headed、fresh nonpersistent context、
  empty extension、browser-context-only proxy、`single-407-basic`である。Browser adapterはdigest/identity-verified pinned Chromiumをfixed anonymous `--remote-debugging-pipe`（internal evidence IPC外のbrowser-equipment control）で直接spawn/OS-observeする。Pinned DevToolsはexact proxy、`disposeOnDetach: true`、empty bypassの`Target.createBrowserContext`、`Fetch.enable(handleAuthRequests: true)`、`study`/marker challengeへのexact 1回の`Fetch.continueWithAuth` ProvideCredentials、exact 407→retry→204 verificationを使う。Supervisorはfresh `browserProxyMarkerSecret`を生成してbrowser adapterへ直接installさせる。
Markerはactual-browser bootstrap/ACKまでprepared、成功後だけ両side active、failure時はactiveにせずdestroyする。
Run stream開始後かつ対象attemptの`npx`/first capturable request直前にcontextがexact proxy-local URI
`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`をrequestし、sole authentication challenge
`Proxy-Authenticate: Basic realm="inspector-study"`と`Connection: close`だけをexact header 2件として持つbodyless 407を1回、canonical Basic retryを1回、
`Connection: close`だけをsole headerに持つbodyless 204を受ける。
DNS/connect、application、correlation、candidate、forward、evidence effectは0件とする。Capture中は各study requestがcanonical Basic markerをexact 1件持つ。

Markerはtransportだけをauthenticateし、validityだけでactor、product attribution、forwardingを決定しない。Raw secretはadapter attempt-local control/auth request bufferだけに置きbrowser environment/argv/profile/history/log/evidenceへ入れない。Secret、raw Basic、encoded/
noncanonical derivative、proxy configurationをhash/evidence、log/output、file、environment、argv、persistent profile/history/cache/keychainまたは他の
credential store、application requestへ入れない。唯一のpreimage例外はtransient marker-install frame authenticationである。Marker-install/DevTools request bufferはACK後wipeし、normal/abort/crash/terminalization/controller failure/child exitでcontext/processをdisposeして全marker materialをwipeする。Pinned buildのpipe-disconnect contractは`CloseBrowserSoon`を呼び、integrationでそのpathを検証する。追加のplatform containmentはstudy equipment/setupが提供し、internal Node.js-built-in-only capture roleとして捏造しない。Adapter crash/DevTools EOFでorphanを残さず、supervisorはadapter exit後に全browser-equipment descendant/context terminationとfresh profile cleanup absenceを検証するまでnext attempt/finalizeをblockする。Runtime OS observer dataはevidenceにしない。Actual-browser testは各path後のisolated HOME/XDG、profile/history/cache、credential storeをinspectし、marker、
encoded Basic、`browserAttemptId` residue 0件を要求する。

Browser-controlled Fetch Metadata/proxy challengeをreproducibleにしつつcontextをdisposable/extension-freeにするため、このfixed profileを採用した。
Marker-only actor attributionはmarked contextを使う別processも同じtransport credentialを提示できるため不採用とした。System-wide/browser-wide proxyは
unrelated host trafficをcaptureしstudy context外へconfigurationを残すため不採用とした。`browserAttemptId`をpasswordにする案はbinding IDをbrowser
stateへ露出し、独立scopeのauthorityを統合してしまうため不採用とした。

Exact authorized participant/bundled-SPA requestでは、adapterがstateを変えずreserveし、supervisorがcanonical grantをarmedのままcomplete candidateをvalidate/pending storeしてsole authenticated `browser-broker-decision: candidate-forward`でaccept/atomic canonical consumeする。Adapterはmatching decision後にcopy consume/forwardし、別candidate ACKは使わない。Probeはcorrelationを
stripして唯一許可されたclaimを作り、broker ACK後にapplication handlingへ進む。`submit-product-event` outer rootは`inspectorProcessId`, `destinationRole`, `payload`だけで、outer processをregistered probeに一致させ、claim subject/process equalityはpayload内でopen binding/outer IDに対して検証する。Brokerはcandidate/claim exact 1件ずつをvalidateし、browser/server両safe-payload ACK後に`joined-pair-released`で2 recordをreleaseし、
その後だけcompletion ACKを返す。Mismatchはrecord 0件、
blocked/unrelated rowはclaim 0件とする。

**Joinの決定**: Brokerはlifecycle-bound/timer-freeとする。HTTP transaction/requestのend/abort/error/close、関連inherited IPC/probe/attempt/binding
close、capture stop、verified child exitのいずれかだけでlifecycle failureにする。Duplicate、replay、mismatch、unexpected role/order、second join、
residue、late inputもfail closedにし、pending stateをwipeしてpartial recordを生成せずlate inputをrejectする。Lifecycle-order/race testはdeadlineなしで
各interleavingをcoverする。Claim timeoutはscheduler latencyをprotocol failureと誤認しnondeterministicなpartial-pair raceを作るため不採用とした。
Transaction/process lifecycleがterminal conditionを網羅する。

各subjectでsupervisorはfd6をenableしてLF終端ASCII `npx --no-install agent-customization-inspector --no-open`をexact 1行だけ受け、他/extra inputをreject/wipeしshellを使わない。Verified distributionの`repository/` cwdでsanitized PATH上のsole audited candidate-bound binを直接spawn/OS-observeする。Child envはbound `NODE_OPTIONS` probe、control endpoint/token、minimum safe run/subject IDだけとし、candidate/proxy authorityをterminal/env/argvへ入れない。このfresh participant process/contextは8 internal long-lived descendant外のexternal ephemeral equipmentとする。各attempt後にcloseしてfd6をdrain/reset/clearし、以前のinput/output/historyを次attemptへ渡さない。Product instrumentationではstartからstopまでstudy setupがparticipantの各`npx` Inspector processへdigest/identity-bound capture script自身だけを
exact `NODE_OPTIONS=--import=<bound-capture-script-file-url>`としてinjectする。OS PID/subject/capture IDと異なるexact 32-byte/43-character
`inspectorProcessId`が同じlaunchのrequest/effect/workflow recordをbindする。Pre-readiness failureは代わりに`not-applicable`と同じsubjectの
missing workflowだけにmapped-class terminal failure/reviewを使う。Candidateはdormant optional readiness hook
だけを持つ。Bootstrap到達時はbodyをblockし、exact `StudyPreReadinessBootstrapProof` `schemaVersion,productId,bootstrapEventId`を
`register-pre-readiness-probe`（`studyRunId,subjectId,bootstrapProof`）へ送り`preReadinessProbeId`を得る。Exact
`StudyPreReadinessProductBuffer` `schemaVersion,studyRunId,subjectId,preReadinessProbeId,state`は
`open | readiness-bound | terminalization-bound | destroyed`を使う。Canonical N/A observationは
`buffer-pre-readiness-product-event`（`preReadinessProbeId,destinationRole,payload`）で送り、effect前supervisor ACK/raw immediate discardを要求する。
`register-product-probe`は`studyRunId,preReadinessProbeId,readinessProof,requestedDestinationRoles`を受け、process bind+ordered release ACK後にopen-binding両ACKとdiscovery-context ACKを完了し、その後だけreadinessを返す。
Bootstrap未到達exitは通常terminalization、到達後はN/A release後にterminalizeする。Helperはregister/evidence 0、identity/register/ACK failureはrun invalidとする。Supervisor descriptorをinheritできないため、
probeはendpoint/token environmentを`register-pre-readiness-probe`、`buffer-pre-readiness-product-event`、`register-product-probe`、
`submit-product-event`、`close-product-probe`だけに使う。Supervisorが各safe event/process IDをdistinct
product/server adapter/watchdogへrouteする。`submit-product-event` outer exact rootは`inspectorProcessId`, `destinationRole`, `payload`だけとする。`destinationRole: inspector-server-ledger`の場合だけexact
`StudyServerCorrelationClaim` payload variantを運び、outer process IDでregistered probeをauthenticateし、participant/bundled-SPA claimのsubject/process IDはpayload内でopen binding/outer IDと一致させる。Probeがraw discard前にclosed correlation headerをassignし、browser helperがprobe/control
environmentをstripする。Missing/tampered/alternate/duplicate probe、
raw IPC、retained probe configuration、unsafe process-ID propagationはcriticalとする。このgateはbootstrap後/readiness前にもcandidate effectが起こり得るため採用し、
safe bufferとeffect-before-ACKでfinal process IDを捏造せずattribution intervalをcloseする。Pre-readiness observation全discardはautomatic safety eventを隠し得るため、
readiness前のfinal process ID付与はfailed launchをreadyに見せるため不採用とした。Envelopeはsequence、kind、
monotonic time、prior digest、safe-payload digestの前に`schemaVersion`、stream role、pairwise-distinctなwatchdog/capture instance/process-run IDを
追加する。Closed start/heartbeat/handoff-anchor/stop payloadは両study digest、観測済みprocess/IPC health、prior envelope、final sequence、kind countをbindする。
Nominal 1,000-ms scheduler設定と、start/heartbeat、consecutive-heartbeat、heartbeat/checkpoint、heartbeat/stop gapへ適用する唯一の
1,500,000,000-ns ceilingを別assertionとし、payloadでmissing heartbeatを隠せない。Repository-owned controllerと
independent verifierをexact package commandで実行し、deterministic schema/privacy/fake-clock testとreal child-process/IPC failure testを持つ。
Startは6 stream process+separate ordered exact 2 orchestratorを返す。Stopはlive reviewer 0を要求して8 internal long-lived descendantをterminateするがsupervisorをaliveに保つ。
Finalizeは全safe payload/envelope、commitment、original anchor、terminal-outcome equation、role matrix、supervisor-directの3 adapter/2 orchestrator exit、adapter-attestedの3 watchdog exit、
`ephemeralReviewerProcessExitCount == reviewVoteCount`を独立検証し、endpointをliveに保ったままfinalize-prepareを完了する。
Separately authenticatedなfinalize-commit connectionはlistener teardown開始後かつsupervisorのkey破棄/exit前にexact witnessを受信する。Verifierは
complete response、EOF、reconnection failureでendpoint removalを証明してからwitness pair、次にseal pairをwrite/re-readする。Witnessはcontrol
session、両commitment、original handoff、8 long-lived exit、ephemeral reviewer exit countをbindし、sealはwitness/handoff digest、exact
3 final root/count、両study digest、exact aggregate summary
`automaticCriticalIssueCount,suspectedWorkflowBlockerCount,reviewVoteCount,reviewDisagreementCount,reviewerCriticalIssueCount,criticalIssueCount,zeroCriticalIssueGate`
をbindする。Verifierはautomatic IDをexact `automatic:<correlationId>`からderiveし、review vote = suspected×2（suspectedは全nonautomatic reviewed failure）、
reviewer-critical IDをconfirmed/disagreement rowのexact `reviewer:<subjectId>:<workflowClass>`として再計算する。Critical totalは
`automatic:<correlationId>`と`reviewer:<subjectId>:<workflowClass>`のtagged/deduplicated union cardinalityとし、automatic-critical workflow rowはsecond
issueを加えない。Zero gateはunion emptyかつexact 20×4 terminal set completeを要求し、success thresholdは独立とする。Contract testはphase/env/token rule、workflow cardinality、request truth table、role matrix、
privacyを、source-structure testはsingle-file/no-import boundaryを、OS-specific integration/security testはauthenticated endpoint lifecycle、
safe-ID/process-ID propagation、initially-empty candidate-launch slot、inputs後のdigest-bound provisioning、sole audited-bin resolution、network/scripts/cache/global/fallback rejectionとteardown absence、secret/path non-retention、commitment/exit、accepted workflow 0〜4件のcrash terminalization、alternate-valid-prefix rewriteを担当する。Prohibited value/combination、
process/watchdog/supervisor discontinuity、過大gap、identity/chain/count/digest/commitment/anchor mismatch、truncation、early stop、failed
teardown/verifier、missing role/witness/seal、stitchはautomatic criticalとする。

**理由**: 憲章はpassing testを証明ではなく証拠とするため、objective automationにfull-diff review、
manual accessibility check、documentation parity check、release tarball inspection、固定participant scoring、
再実行可能なversion付きprofile固有performance measurementを組み合わせる。

**検討した代案**:

- Snapshot-only testはnegative security behaviorを証明しないため不採用。
- Unit/contract coverageなしのbrowser testは遅くfailureの特定が難しいため不採用。
- Coverage percentageだけではnamed boundary/non-execution invariantを示せないため不採用。

## 11. 仕様再確認の決定（2026-07-17）

**決定**: Phase 0設計を2026-07-17のclarificationと照合し、次のruleを後続の全design artifactへ引き継ぐ。

1. Admitしたtool-home root 1つをtool別Global Source 1つとし、Codex、Claude、Copilotごとに最大1つ、
   1 sessionで0から3つとする。
2. 読み取り可能なsource、表示対象の宣言済みmetadata、comparison contentは記述済みliteral valueを維持する。
   Credential maskingとreveal workflowは持たない。調査対象content内の環境変数参照はliteralのまま解決も置換も
   せず、文書化済みの3つのtool-home変数はGlobal rootの特定だけに使う。
3. 明示的な再scanがfatalに失敗した場合、partial outputを含む未commit outputをすべて破棄し、最後に正常
   commitされたsnapshotをSource別stale-failure entryと、決定的なDiagnosticまたはthrow/rejectされたjobのOperation
   Error付きで残す。正常scanはown Sourceのentryと参照先failureだけをclearし、無関係なcommitは両方を保持し、
   Source除去はremoved Sourceの両方をclearする。
   同じSourceの再fatal rescanはそのSourceの両方だけを置換する。
   *（superseded 2026-07-22（一部）: FR-040/FR-041削除 — stale entryは決定的なDiagnosticまたは
   失敗requestのerror messageを参照し、errorはordinaryに報告される（FR-030）。破棄/clear/置換の
   ruleは維持される。）*
4. Generation 0はreadを認可しないRepository Sourceを既に含む。決定的な自動failureはprovisional resultをpublishせず、
   startupのthrow/rejectionはsurvival保証なしでprocess top levelへ到達する。初回Global enableは固定のall-tools consentと、
   admitted-subset batch 1件を使う。決定的なall-rejected outcomeは`active-no-job`を返す。Non-carveout throw/rejectionはREST
   Operation Errorだけを作り、subsetを一切commitしない。Purge済みclientはselectorなしでretryする前にactive control viewと
   exact frozen previewをrecoverする。*（superseded 2026-07-22: carve-out doctrineの置き換えに続き
   FR-040/FR-041自体が削除された — errorはordinaryに報告される。Unexpected failureは引き続き
   transactionをabortし、そのrequestをそのerrorで失敗させる。）*
5. Cross-sourceの表示、filter、diagnostic用語はSource-relative Pathとする。Repository-relative pathは、選択した
   Repository rootをrootとするRepository Sourceだけに使う。
6. SC-001、SC-002、SC-006はSection 10のobjective protocolを使う。SC-002はchecked-in version付きreference profileを
   1つ使い、各結果でprofile ID、fixture digest、実際の非personal environment fieldを公開する。変更したprofile IDの結果を
   直接比較可能としてはならない。

**理由**: これらの決定により、以前のmulti-root Source、mask/reveal、fatal result、path用語、outcome測定の
曖昧さを除去し、productのread-only、local、non-executing boundaryを維持する。

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
  不採用。SC-002はportable performance guaranteeではなくprofile固有のままとする。

## 12. 仕様再確認の決定（2026-07-19）

**決定**: 最終analysis remediationをplanningとimplementationへ引き継ぐ。

1. 固定startup OS browser helperを、許可する唯一のproduct起動child processとする。Inspection由来content/path、
   authored value、user-supplied command、environmentで選択したhandlerを渡さない。Closedなambient platform key setだけを
   launch environmentから直接copyしてよいが、Source rootとのlexical一致はprovenanceを変えずauthorityを与えない。Discovery、read、parse、display、
   comparison、relationship処理はchild processを開始せず、`--no-open`、unsupported、failure pathでも利用可能なmanual URLを残す。
2. 各supported `(tool, kind)`がclosedなdeclared-metadata field ID、relationship kind、admission済みsource-form
   applicabilityを所有する。Entryは、維持管理するpresentation-allowlist rowに属し、かつactualなadmission済みsource formの
   exact extractorがそのauthored occurrenceを認識する場合だけserialize/displayする。どちらかのgateを満たさないentryは
   完全なsource text内だけで見えるままにし、metadata/relationshipとして推論したりsource form間でpromoteしたりしない。
3. SC-002はSection 10で定義した標準化filter/item-selection測定を含み、同じ9件以上の各runが両scan thresholdと
   両interaction thresholdのすべてに合格しなければならない。
4. Dependency再確認はplanning gateとする。Packageまたはversion変更をacceptした場合、dependency baselineを記載する英日両方のdesign/task
   artifactをすべて同期し、implementation前にplanningとtask generationを再実行する。
5. SC-002 environmentはchecked-in version付き公開profileとし、現在のrequestに対する客観的status停止条件を持つ。
   Private local-machine identityはcontractに含めない。
6. Origin-file-less hosted/runtime inputは関連Sourceに紐づくevidence-linked Source Condition Factとする。
   File/path/source text/comparison targetを作らず、read authorityを付与せず、local/hosted I/Oを実行せず、未観測のcurrent stateを
   conditionalまたはunavailableのままにする。
7. Maintainer teamがinitial-release participant study、funding、support、privacy、accessibility、定義済みreview protocolを担当し、
   通常のcontributorへ義務を負わせない。
8. `engines.node`をNode 24/26 runtime compatibility range全体とし、正確な6つのfloor jobをlower-bound certification sample、
   Node 24.18.0をdevelopment/build baselineとする。Pinした3つのPlaywright revisionはautomated browser-certification baselineであり、
   startup helperは未検証のOS default handlerへ委譲して表示済み/manual-open fallbackを常に残す。
9. InitialまたはretryのGlobal admitted-subset batch commitが成功しても、既存Repository resultを保持するのはsemanticな
   意味だけである。Generationを正確に1回進め、carryした全graphとgeneration所有IDをrekeyし、旧file/detail/comparison/
   selection/editor参照をstaleにする。
   *（superseded 2026-07-22: RepositoryとGlobalは独立したgeneration sequenceを保持する — Global commitは
   Global sequenceだけを作成または前進させ、自身のgeneration所有IDだけをrekeyし、Repositoryのstate/viewには
   決して触れない。）*
10. SC-008は維持管理する英日55行のWCAG 2.2 Level A/AA applicability matrixを使う。各criterionのexpected observationを
    stable check IDへbindし、closed manual matrixではapplicableなlocale/platform/viewport/mode/scenario/input cellの
    samplingを禁止する。Applicableな全行、全Not-applicable rationaleの再確認、4つのkeyboard workflow、必須responsive
    variationをすべて合格とし、`validation.md`と
    `validation.ja.md`へ0件ではないApplicable-row denominator、Applicable rowのfailure 0件、完全なevidenceを記録する。
    Axeだけまたはseverity基準による免除はない。
11. Diagnostic scopeはclosedな`file | source | session` unionとする。`sourceRelativePath`を持つのはfile scopeだけで、
    source scopeはpathなしの`sourceId`を持ち、session scopeはsource/path identityをどちらも持たない。Operation Errorは
    path/content/raw-errorを含まない別のclosed outer-boundary entityであり、Diagnosticには決してならない。
    *（superseded 2026-07-22（一部）: FR-040/FR-041削除 — Operation Error entityは削除され、errorは
    ordinaryに報告される。ClosedなDiagnostic scope unionは維持される。）*

**理由**: これらのruleにより、既存security/documentation parity requirementを弱めず、child-process boundary、
presentation scope、performance denominator、runtime-fact model、participation ownership、compatibility/certificationの分離、
dependency baselineを独立にtest可能にする。

**検討した代案**: Browser launchをcustomization由来executionへ含める案、任意authored keyからmetadataを推論する案、
interaction targetをtrace不能なplan-only goalのままにする案、`package.json`だけでversionをpatchする案は、いずれも
矛盾または第2のundocumented contractを作るため不採用。

## 13. Analysis前のordering決定（2026-07-19）

**決定**: 次の4つの明示的dependency gateからimplementation taskを再生成する。

1. Setupはbyte衛生を宣言的に所有する: `.gitattributes`がline endingをnormalizeし、`.editorconfig`が
   editor慣習を宣言する。Repository-wideなformatting checkerもformatting CI jobも存在しない。
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

1. Operational eventはfixed codeとopaque IDだけを使う。Path、root、filename、調査対象content/metadata、authored
   value、capability、body、raw error、exception stringは禁止する。Authenticated session Diagnosticは別の
   actionableなsurfaceとして維持する。Fixed CLI help/version、1つのlaunch URL、fixed startup warningはpresentation
   outputである。*（superseded 2026-07-22: devframe採用によりper-session capability valueとAPI認証は
   存在せず（§ 8参照）、FR-040/FR-041削除によりoperational-event語彙とそのcontent禁止事項も削除された —
   errorはordinaryに報告される。Session Diagnosticとfixed presentation outputは残る。）*
2. Package bootstrapはclosed manifest structure、declared/actual length、全listed hashをimport/bind前にvalidateする。
   Build、tarball、runtimeは同じintegrity ruleを使うが、product独自のfile-size、aggregate-size、asset-count、buffer-size、
   handle-count境界を設けない。*（superseded 2026-07-22: bootstrap wrapperとoutput manifestは削除された —
   `package.json.bin`は`dist/cli.mjs`を直接指し、`verify:package`は必須の2 entryだけをassertする。
   § 2、§ 8参照。）*
3. Coordinatorはproduct独自のslot/queue capacityを公開せず、Source scan、Global enable、disableをserializeする。
   Disableはpriority security barrierのままとし、enable/disable raceはlate mutationなしでatomicに解決する。
4. 各scanに`scanRequestId`を付与する。SC-002は自動初回Repository scanを待って明示的rescan 1件を計測し、その
   request IDを持つstatusとcommitted inventory generationだけを受理する。
5. Disable、shutdown、generation replacementはelapsed timeと無関係にpublication authorityをrevokeする。Late resultを
   破棄し、cleanupはunderlying Node.js/OS operationに従う。Hard kernel-I/O cancellationやOOM recoveryは主張しない。
6. 許可するinterpretationはclosed syntax、exact literal extraction、mechanical typed decoding、frozen-catalog
   classification、documented structural projectionだけとする。Product/documentationの全surfaceでnatural-language
   interpretation/ranking、customization verdict、policy/remediation advice、linting、synchronization、conversion、
   formatting、fixingを禁止する。
7. Product-issued mutationはmutation-capableなfilesystem request/flag全てを意味する。Testはそれらのcallとstableな
   source propertyをinstrumentし、OS-only atime changeはfailureにもproofにも数えず別に記録する。
8. Capability authenticationがAPI access boundaryである。Sensitive-content acknowledgementはreset可能なclient-memory
   presentation gateであり、bundled SPAが全`FileDetail` requestまたはcomparison constructionの前に適用し、APIへは送らない。
   Document reloadと中央full-session purgeでresetし、通常のscope限定cleanupでは維持してよいが、Global disableは明示的な
   full-purge例外である。*（superseded 2026-07-22: devframe採用によりAPI認証は削除された — session APIは
   loopback bindingの背後でだけ到達可能であり、acknowledgementのruleは維持される。§ 8参照。）*

**理由**: これらのboundaryにより、literal inspectionを維持し、capacityをNode.jsと周辺実行環境のpropertyとしながら、
integrity、cleanup、disclosure、negative-product-scope testの曖昧さを除去する。

**検討した代案**: Pathを含むlog、product独自のresource cap、integrity checkなしのstatic load、以前のgenerationによる
performance completion、timerに基づくphysical I/O cancellationの主張、広いsemantic analysis、literal atimeを
mutationとしてscoreすること、server-side acknowledgement stateは、platform guaranteeを過大に述べる、integrityを弱める、
またはpresentationとAPI authorizationを混同するため不採用。

## 15. 最終clarification決定（2026-07-20）

**決定**: 最終的なuser choiceを1つのclosed runtime contractとして適用する。

1. `process.cwd()`を正確に1回captureする。`--cwd`がなければ、その文字列を選択したRepository rootとして使う。Windowsでは
   explicit UNC/server-share/device、current-drive/root-relative、`C:`/`C:foo` drive-relative formを`resolve`前にrejectし、
   absolute drive optionを保持してplain relative optionだけをanchored captureに対してresolveする。POSIXはabsolute optionを
   保持するかrelative optionをcaptureに対してresolveする。全selected absolute resultをsingle shared pure
   `LexicalAbsoluteRootParts` parserへfilesystem/network I/O 0件で渡し、`chdir`もper-drive resolutionも使わず、invalid inputは
   session/browser作成前にrejectする。Generation 0はstableで
   readを認可しないRepository Sourceを同期的に含み、admissionは後で行う。
   *（superseded 2026-07-22: FR-001はabsolute `--cwd`をそのまま保持し、relative optionをcaptureした
   `process.cwd()`に対してresolveする。Shared `LexicalAbsoluteRootParts` parserとWindows spelling
   taxonomyは削除された。単一capture、no-`chdir` rule、missing/empty/duplicate optionへの固定
   startup errorは残る。）*
2. Global consentはselectorなしのall-tools action 1件とする。Initial processingは必ずfrozen preview entry 3件全てを評価し、
   retryはcurrent server-side `retryableTools`のcomplete set、すなわちnon-pending unpublished `admitted` controlと
   `retryDisposition: same-preview`の`rejected` controlを導出し、lexicalな`new-preview-required`を除外する。決定的に
   rejectされたentryはsiblingをblockしない。Admitした全rootをbatch
   1件としてscanし、それぞれ独立したone-root Sourceをatomic generation 1件でpublishする。
3. Domain内でcatchまたはobserveするfilesystem rejection caseは、FR-041の2つの限定的なcarve-outだけとする。Contractで
   宣言したstructural `lstat`からの正確な`ENOENT`は、root absence、exact-target fallback、observed-entry disappearanceに必要な
   closed factを提供し、event-confirmed-close observationは既にconfirm済みのsuccessful close lifecycleだけを維持する。
   `open`/`read`からの`ENOENT`を含むすべてのnon-carveout throw/rejectionは、変更せずpropagateする。Pre-acceptanceのREST ownerは`scanRequestId`なしの固定
   HTTP 500 Operation Errorを返す。Accepted jobは同じgeneric terminal entityをそのIDとともに公開し、processと以前のsnapshotを
   維持する。Startup所有failureはprocess top levelへ到達する。Raw errorはproduct API、log、telemetryへ入れないが、runtime所有の
   local uncaught outputはlimitationとして残る。
   *（superseded 2026-07-22: carve-out doctrineの置き換えに続きFR-040/FR-041自体が削除された。
   1つのfileに限定されるfailureはそのfileのdiagnosticになりscanは`partial`としてcommitし（FR-028）、
   unexpected failureはattemptを失敗させ、そのerrorはordinaryに報告される。）*
4. NULはbinary/diagnostic-only/contracted-partialとする。NULを含まない全byte streamはUTF-8 replacement semanticsで1回だけ
   decodeする。`utf-8-replaced`は全`U+FFFD`文字を文字化けしたtextとしてそのまま表示、parse、extract、compareする形で保持し、
   それ自体をcomplete outcomeとする。
   *（superseded 2026-07-22（名称のみ）: public status `contracted-partial`は`partial`へ改名された。
   Decode ruleは維持される。）*
5. Filesystem operationを行うのはraw entry segmentだけとする。Collision-freeなNFC valueがpublic classification/displayを
   所有する。Normalization collisionでは曖昧なfileを作らない。Hard-link admissionでは、unsigned UTF-8 bytewiseで最小のNFC
   pathをprimaryとして決定的に選び、残りをaliasとしてsortし、全raw provenanceを保持する。
   *（superseded 2026-07-22: hard linkはgrouping、primary/alias選択、read-once semanticsを持たない
   ordinaryなfileであり、normalization-collision rejectionは削除された。Raw nameは引き続き
   filesystem I/Oを行い、NFCがdisplayを所有する。）*
6. Presentation Allowlist rowは承認済みdesign inputである。Implementation gateはrowとそのbilingual digestだけをverifyする。
   Semantic changeではworkを停止し、designを同期してplan/taskを再生成してから利用する。

**理由**: これらのchoiceは、実際のread errorを要求どおりruntime所有に保ちながらoptional pathのabsenceをfatalにせず、
user-selectableなGlobal scopeをなくし、bootstrap identityをread authorityから独立させ、不正なtextをUTF-8 decoderが生成した
正確な形でinspect可能に保つ。

**検討した代案**: 全`lstat` absenceをuncaught runtime failureとして扱う案は、文書化済みfallbackと自動的なexisting-root
selectionを不可能にする。Permission、`open`、`read` errorをdomain outcomeとしてcatchする案はruntime ownershipに反する。
Tool別Global commitは中間subsetを公開しgenerationを複数回進める。Charset guessingはoutputをenvironment-dependentにする。
Normalized display segmentをfilesystem operationへ使う案はboundaryを弱める。いずれも不採用。
