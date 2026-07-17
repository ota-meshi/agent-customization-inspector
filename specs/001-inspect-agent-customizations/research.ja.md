# Phase 0 調査: エージェントカスタマイズの調査

[English](research.md)

**調査日**: 2026-07-16、2026-07-17再確認
**対象**: 参照architecture、現行互換toolchain、安全なlocal host設計、安全なparseとliteral表示、source/metadata比較、
bounded scan、公式customization path surface

## 1. Package architecture

**決定**: `app/`、`src/`、`shared/`、`tests/`、`bin.mjs`、1つの`dist/`を持つ公開可能な
ESM packageを1つ使用する。Client buildはNuxt、Node CLI bundleはtsdownが所有する。
Pure Node.jsの`src/inspection/safe-fs.ts` moduleが調査対象sourceのenumeration/readを全て所有し、CLIとともに
bundleする。Typed inert DTOだけをbrowserへ渡す。
Project-authored executable application codeはすべてJavaScript/TypeScriptとする。Project/dependency package payload内の
executable codeはJavaScriptだけとし、generated HTML/CSS、JSON manifest、documentation、licenseはdeclarative artifact
として許可する。Package-manager生成`.bin` symlink/`.cmd`/`.ps1` launcherはpayload外interoperability metadataとして
別のclosed auditを受ける。Third-party development/test toolingは別にpin/auditするが、
FR-038のpublished application codeには含めない。

**理由**: UIとCLIは1つのproductを形成し、1つのrelease versionを共有し、すべての`npx`起動で両方が
必要になる。単一packageはinstall/releaseをatomicに保ち、`app`/`src`/`shared` boundaryはbrowser codeが
filesystem accessを得ることを防ぐ。Build orchestrationはpackage所有output treeだけをcleanし、Nuxtに標準
`.output/public` staging treeを書かせ、accepted assetを検証して`dist/public`へcopyし、tsdownにnamed
CLI/Worker entryとcode-split chunkをcleanな別`.build/server` staging treeへ出力させる。固定manifestが
両output classをcopy/pack前に閉じる。小さなproject-owned `bin.mjs`がNode.js built-inを使い、packed package version、
両manifest、全listed static/server hashを検証してからvalidated CLIをdynamic importするため、独立version管理する
packageを作る必要はない。
Executable shimはBOMなし、LF終端の正確な先頭行`#!/usr/bin/env node`で始める。Release時のrepairではなく
package contractとする。

Cross-platform CIはmacOS、Linux、Windowsで同じNode.js filesystem integration/race-detection caseを実行する。
Published package自体はplatform固有artifactを含まない。

**検討した代案**:

- UI/core/CLI monorepoは、componentが同時releaseされ、独立consumerが存在しないため不採用。
- Nuxt SSR/Nitro application serverは、browser appがstaticでsecurity-sensitive APIが小さいため不採用。
- Dynamic config loading、無認証RPC、自動watch、static snapshot、remote host、build、MCP modeは、
  調査対象がuntrustedでsession dataを永続化・公開できないため不採用。

## 2. Buildとpackage boundary

**決定**: Nuxtは`ssr: false`、static Nitro preset、`app.baseURL: '/'`、
`app.buildAssetsDir: '/_nuxt/'`、空のCDN URL、root-absolute same-origin assetを使う。Full buildの開始時に
root-resolvedなpackage所有の`.output/`、`.build/`、`dist/` treeだけを除去する。`nuxt build`は標準
`.output/public` staging outputを使う。固定post-Nuxt stepはmalformed HTML、relative/external executable asset、
executable attribute、`<base>`、symlink、unexpected outputを拒否し、Nuxt生成のstatic-host fallback
`200.html`/`404.html`を要求するがcopyせず、`index.html`以外の全HTML fileを拒否する。Accepted treeだけを
新規`dist/public`へcopyし、正確なassetとexecutable inline-script hashを
`dist/manifests/static-assets.json`へ記録する。

tsdownはnamed entry
`{ cli: 'src/cli.ts', 'parser-worker': 'src/inspection/parsers/worker.ts' }`、Node ESM、
`fixedExtension: true`、source map/declaration無効、cleanな`.build/server` output、
`deps.skipNodeModulesBundle: true`とする。固定assemblerは安全なregular `.mjs` outputだけを受理し、
`cli.mjs`と`parser-worker.mjs`を要求し、全code-split chunkを`dist/manifests/server-assets.json`へ記録して
正確にそのoutputだけを`dist/`へcopyする。Hostはpackage所有の固定
`new URL('./parser-worker.mjs', import.meta.url)`からだけparser Workerをconstructし、調査対象dataがmoduleや
Worker URLを選べないようにする。

Pack前に`dist/`を両manifestから導くexact setとrecursiveに比較し、missing、stale、unexpected、link、
non-regular pathを拒否する。`package.json.files`は正確に
`["bin.mjs", "dist", "README.md", "README.ja.md", "LICENSE"]`とする。npmが自動で含める`package.json`と
それらのentryがcomplete tarball allowlistである。`package.json.bin`は正確に
`{ "agent-customization-inspector": "bin.mjs" }`とし、library APIがないため`main`、`module`、`exports`を
省略する。Install script、runtime download、end-user compileを使わない。Runtime packageは正確な
`dependencies`として宣言し、`npx`に監査可能なversionをinstallさせる。tsdownはproject所有moduleとshared
contractをbundleし、任意のtransitive packageはbundleしない。Production setはleaf packageの`cac`、`yaml`、
`jsonc-parser`、`smol-toml`の正確に4つだけとし、`open`を全dependency sectionとproduction lock closureから
除外する。

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

**理由**: Separate clean staging treeはcross-toolの`clean: false`へ依存せず、stale output拒否を機械的にする。
node_modulesをexternalにすると、
platform-sensitiveまたは変化するtransitive codeの暗黙inlineを避け、CLIがloadするものをmanifestで
表せる。[tsdown dependency documentation](https://tsdown.dev/options/dependencies)はexternal dependencyと
明示的`alwaysBundle`を区別し、[entry documentation](https://tsdown.dev/options/entry)はnamed multi-entry形式を
定義する。Web、CLI、parser Worker、safe-filesystem layerがpackaged locationからloadできることはtarball
smoke testで証明する。Tarballをisolated fixtureへinstallしてexecutableを実際に`npx --no-install`でinvokeし、
`bin` mappingのinspectionだけで済ませない。起動前にexact shebang/executable modeもassertする。
Install済みclosureのauditによりroot tarballだけのinspectionが残すgapを閉じ、2回目のnetwork-disabled installにより
normal lifecycle pathがplatform artifactをfetch、compile、substituteしないことを証明する。Exact leaf dependencyは
初期リリースのclosureとcross-OS digestをstableにする。
`/files/<fileId>`のようなnested routeにも同じshellを返すためroot-absolute assetが必要で、
relativeな`./_nuxt/` URLはそのroute配下へ誤ってresolveされる。
公式[Nuxt 4 configuration reference](https://nuxt.com/docs/4.x/api/nuxt-config#baseurl)は`baseURL`、
`buildAssetsDir`、defaultが空の`cdnURL`を定義する。正確な
[Nuxt output-directory documentation](https://nuxt.com/docs/4.x/directory-structure/output)は`.output`を生成済み
production build directoryと定義するため、assemblerはNuxtが`dist/public`へ直接書くと主張せず、明示的に
`.output/public`をconsumeする。正確な
[Nuxt 4.4.8 payload renderer](https://github.com/nuxt/nuxt/blob/v4.4.8/packages/nitro-server/src/runtime/utils/renderer/payload.ts#L28-L49)は
runtime configをexecutable inline JavaScriptとして出力するため、`script-src 'self'`だけではstock outputが
bootしない。Build-recorded CSP hashで生成scriptと`unsafe-inline`なしpolicyを両立する。
再現可能な4.4.8 minimal-SPA buildは`index.html`、`200.html`、`404.html`も出力する。Generic static hostではなく
explicit Node hostがstatus/fallback routingを所有するため、`index.html`だけを保持し、redundant aliasがclosed
client-route grammarを迂回しないようにする。

`dist/manifests/static-assets.json`はextra keyのない最大2 MiBのstrict JSONとし、
`manifestVersion: 1`、正確な`packageVersion`、`shellPath: "/index.html"`、最大4,096件のordered
`assets` record、最大32件のordered `inlineScriptSha256` valueを持つ。各assetは
`{ requestPath, file, byteLength, sha256, mediaType }`で、`requestPath`はuniqueな最大512 UTF-8 byteの
root-absolute URL path、`file`は対応する正確な`public/...` regular-file location、`byteLength`は
non-negative、`sha256`はlowercase 64 hex character、`mediaType`はclosed host table由来とする。Inline valueは
shell内の正確なexecutable script byteの44-character base64 SHA-256 digestである。`bin.mjs` bootstrapは固定package-relative
URLからmanifestをresolveしてstrict validationし、CLI import前に全listed assetのsize/hashを検証する。
Unlisted pathは配信しない。

`dist/manifests/server-assets.json`は最大1 MiBのstrict JSONで、exact keyの`manifestVersion: 1`、
`packageVersion`、ordered 2..256 recordの`assets` arrayを持つ。各recordは正確に
`{ file, byteLength, sha256 }`、安全なrelative `.mjs` pathはsort済みunique、listed byte合計最大64 MiB、
各file最大16 MiB、`cli.mjs`/`parser-worker.mjs`必須とする。全code-split tsdown outputをlistedする。Final
recursive verifierはこのmanifestとstatic manifestからlegalな`dist/` fileだけを導出し、pack前に全
stale/unexpected/link/non-regular pathを拒否してunpack済みtarballへ同じproofを適用する。Runtimeでも`bin.mjs`が
server manifestと全listed server hashを検証してから`cli.mjs`をimportするため、server bind前に両manifest classを検証する。

**検討した代案**:

- Runtime dependencyの全bundleはdependency/license監査とtransitive動作を見えにくくするため不採用。
- UIとCLIの別published package rootはmanifestで閉じた1つの`dist/`よりrelease boundaryが曖昧になるため不採用。
  Clean assembly用のisolated staging rootは使用する。
- Hosted snapshot commandはlocal customization textとsecretをassetに永続化し得るため不採用。

## 3. 最新の互換stable dependency基準

**決定**: `package.json`と`pnpm-lock.yaml`へ正確なversionをpinし、pnpm 11.13.0を使用する。
「最新」は選択したNuxt/Vue toolchainと互換性がある最新stable versionを意味し、prereleaseや非互換majorを
意味しない。最初のlockfile作成直前に同じregistry互換性確認を再実行する。

| 領域 | 選択version | 理由 |
|---|---:|---|
| Node.js | 24.18.0 Active LTS基準 | NuxtはproductionでActive LTSを推奨し、package enginesはsupport対象Node 26+も許可する |
| TypeScript | 6.0.3 | 現行Vue/Volarとtypescript-eslint toolchainがsupportする最新compiler |
| Nuxt / Vue | 4.4.8 / 3.5.39 | 現行stable release |
| Vue Router | 5.2.0 | Nuxt 4.4.8の宣言range `^5.1.0`を満たす現行stable release。別router abstractionは追加しない |
| tsdown | 0.22.8 | 現行stable release。Node 24.11+をsupport |
| Vite | 7.3.6 | Nuxt 4.4.8が宣言するbuilder range `^7.3.3`内の最新version |
| pnpm | 11.13.0 | 現行stable package manager |
| CLI | `cac` 7.0.0 | 小さく現行のESM-compatible leaf dependency。Browser launchは`node:child_process`上のproject-owned TypeScriptとしpackageを追加しない |
| Parser | `yaml` 2.9.0、`jsonc-parser` 3.3.1、`smol-toml` 1.7.0 | 現行stable inert data parser |
| Source view/diff | `monaco-editor` 0.55.1 | 現行stable read-only source/diff editor。固有diff engineによりclient dependency重複を避ける |
| Lint | ESLint 10.7.0、`@nuxt/eslint` 1.16.0 | 現行互換stable release |
| Unit/integration | Vitestとcoverage-v8 4.1.10、Nuxt Test Utils 4.0.3 | Vitest/coverageを同じversionにし、Nuxt supportのtest harnessを使う |
| Component/DOM | Vue Test Utils 2.4.11、happy-dom 20.10.6 | Nuxt Test Utils peerを満たす現行release |
| Browser/a11y | Playwright 1.61.1、`@axe-core/playwright` 4.12.1 | 現行stable browser/accessibility tooling |
| Type | `@types/node` 24.13.3、`vue-tsc` 3.3.7 | Node 24基準とVueに対応する最新互換type |

**理由**: 選択した集合は、公開済みpeer rangeとbuilder rangeが一致する最新stableの組み合わせであるため、
未supportのcompilerまたはbundler overrideを強制せず最初の実装を再現できる。

Versionの一次根拠はnpm registryの[Nuxt](https://www.npmjs.com/package/nuxt)、
[Vue](https://www.npmjs.com/package/vue)、[Vue Router](https://www.npmjs.com/package/vue-router)、
[tsdown](https://www.npmjs.com/package/tsdown)、
[TypeScript](https://www.npmjs.com/package/typescript)、[Vite](https://www.npmjs.com/package/vite)、
[pnpm](https://www.npmjs.com/package/pnpm)、[Monaco Editor](https://www.npmjs.com/package/monaco-editor)、
[Vitest](https://www.npmjs.com/package/vitest)、
[Playwright](https://www.npmjs.com/package/@playwright/test)である。Node公式の
[release status](https://nodejs.org/en/about/previous-releases)と
[Node 24 archive](https://nodejs.org/en/download/archive/v24)をLTS基準と正確なreleaseの根拠にする。
Monaco公式の[v0.55.1 release](https://github.com/microsoft/monaco-editor/releases/tag/v0.55.1)を
選択stable editor versionの根拠にする。
Safe-filesystem layerはNode built-inの`node:fs/promises`、`node:fs`、`node:path` APIだけを使用するため、
platform toolchainやruntime package dependencyを追加しない。
Production `dependencies` setはpin済みleaf packageの`cac`、`yaml`、`jsonc-parser`、`smol-toml`だけとする。
Nuxt/Vue/Vite/tsdown、Monaco、test toolingは必要outputをclosed product assetへassembleするためbuild/development-onlyとする。
Lockfileとisolated install済みproduction closureの両方をauditする。

**検討した代案**:

調査日時点のupstream stableにはTypeScript 7.0.2とVite 8.1.4もあるが、意図的に選択しない。
公式[TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)は
Vue/Volar workflowに当面TypeScript 6を要求し、
[typescript-eslint dependency policy](https://typescript-eslint.io/users/dependency-versions/)は7をまだ許可せず、
公開された[Nuxt 4.4.8 Vite builder manifest](https://registry.npmjs.org/@nuxt%2Fvite-builder/4.4.8)は
Vite 7を宣言している。これらを強制すると、動作する現行Nuxt stackを使うという要件に反する。
Dual TypeScript compilerとpnpm overrideは初期リリースに不要な複雑さとして不採用。

`open` 11.0.0はJavaScript APIが便利でも不採用とする。Published tarballがexecutableなPOSIX shell
`xdg-open` helperを含み、installed product closureをFR-038違反にしつつroot tarballだけのallowlistでは見逃すためである。
Browser launchは固定OS helper commandを呼ぶ小さなproject-owned TypeScript adapterとし、失敗時は既に表示したloopback
URLをmanual openできるままにする。

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
   selector、それらと1対1のtyped segment programを分離し、正確なlaunch rootから`./`で表記してbare `**/`を
   拒否する。Literal、one-segment、bounded recursive-directory tokenは1 program内でcomposeできる。`./**/`は
   明示的な下向きInspector descendant inventoryだけを表し、vendor traversalを主張しない。Build validationは同じ
   programをimmutable versioned `TraversalPlan` dataへcompileし、Global preview patternをそのplanからrenderしてconsentへ
   schema、closed selection policy、canonical programをbindする。Content依存policyはclosedなCodex Global
   first-non-empty branchだけで、overrideを先にprobeし、安全にreadできたnon-empty contentならshort-circuitし、absentまたは
   安全にemptyと確定した場合だけ次へ進み、unsafe/unreadableなpresent candidateではfallbackせずfail closedする。
3. **Runtime composition registry**は、selection、precedence、layering、fallback、condition projection、
   relationship-only ruleを表すstable `strategyId`を
   [runtime composition](contracts/runtime-composition.ja.md)に記録する。Strategyはpathを再記述せずbehavior IDと
   rule IDを参照する。
4. **Official source registry**はstableな`sourceId`、canonicalな公式URL、正確でboundedなsection anchor、
   review date、影響contract ID、assertion、semantic fingerprintを
   [公式資料](contracts/official-sources.ja.md)に記録する。

Launch `cwd`はimmutableなRepository inventory boundaryのままとする。Vendor runtime root、walk方向、target
file、trust、enablement、selection、installation、product surfaceは、matcherやfile存在から導出せず独立した
behavior/strategy factにする。Behavior record、source record、strategy、relationship、excluded ruleはreadを
認可しない。

Admitしたtool-home rootはtool別の独立したGlobal Sourceとして表す。Codex、Claude、Copilotごとに最大1つ、
したがって1 sessionで0から3つのGlobal Sourceとする。各Sourceは正確に1つのrootと1つのSource-relative Path
namespaceを所有し、そのroot配下にある異なるcustomization typeのfileは別々のinventory itemとして保つ。
「repository-relative path」はRepository Sourceだけに使い、DTO、filter、diagnostic、cross-source comparisonでは
Source-relative Pathを使う。

Bounded derivationは任意のreference追跡ではなく、fan-out limitを持つtyped single-edge provenance graphの
ままとする。Closed `DerivationProgram` unionのinitial mappingは、3 vendorのlocal-marketplace manifest rule、Codex
fallback basename placement、Codex skill metadataのexact 5件とする。各mappingはexact static seed provenance/rule/kind、
declaration field/syntax、base/placement、fixed suffix alternative、fan-outをpinし、callback、arbitrary path join、free-form
expression、glob、recursive derivationを表現不能にする。Derived provenanceは別edgeをseedできず、同じphysical fileの独立static provenanceはeligibleな
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
  する。VS Code rowをCLIまたはCloud traversal ruleとして再利用しない。Standard-instruction supportの一部、
  project対user custom-agent precedence、別agent-contextのinstruction order、agent-profile skill preloadには、
  current page間の競合または未記載が残るため、普遍的winnerを作らずconflictまたはunknownとする。
  Hook、settings、plugin、MCP、custom-agent body/tool/model/invocation、IDE handoffのlocator/compositionも
  surface-qualifiedとし、excluded User overrideはfileを推測せずcondition factにする。
- **Claude project settingsはlaunch directory exactである。** `.claude/settings.json`と
  `.claude/settings.local.json`は正確なlaunch `cwd`から読み、parent directoryからinheritせず、genericな
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

Registryはpage bodyをcopyして保持しない。正確なrecord bound、公式HTTPS host/redirect policy、timeout・
decompressed-size・content-type limit、anchored-section normalization、human update ruleは
[OfficialSourceRecord](data-model.ja.md#officialsourcerecord)で定める。URLへ到達できてもanchor sectionが消失、
重複、semantic changeした場合はfail closedとしてhuman reviewを要求する。

**検討した代案**:

- 1つのcombined vendor/path/precedence/source表は、1 cellでupstream locator、Inspector matcher、surface-specific
  composition strategyを区別できず、citationを独立reviewできないため不採用。
- Inventoryだけからeffective runtimeをsimulateする案は、runtime `cwd`、target path、surface、trust、
  CLI/environment/managed settings、installed plugin stateが利用不能または意図的に除外されるため不採用。
- 全manifest/config path、import file、skill resource、script、assetのreadは、untrusted contentがread boundaryを
  制御するため不採用。固定Inspector matcherとtyped derivationによりgeneric file-read primitiveを作らず有用な
  coverageを保つ。
- Globalをcurrent User customizationすべてへ拡張する案は、FR-015からFR-018に反し、specificationとconsentの
  redesignが必要になるため不採用。
- Admitした全tool homeを1つのmulti-root Global Sourceへまとめる案は、1つのSourceが1つのfilesystem trust
  boundaryと1つのSource-relative Path namespaceを表すため不採用。
- 1つの`certainty` enumは、documentation maturity、authored/installed state、trust、enablement、selection、
  runtime applicabilityが直交するため不採用。

## 5. Filesystemとscan safety

**決定**: Pure Node.jsの`src/inspection/safe-fs.ts` moduleを調査対象source I/O唯一のbackendとする。
Repository startupとconsent済みのtool別Global Sourceは、公開されたlexical rootの全componentを`lstat`で検査して
linkを拒否してから、accepted lexical root、その`realpath`、bigint directory identity/metadata snapshot、
owning source ID、lifecycle stateを持つinternal
`InspectionRootContext`を作る。このcontextはprivate application stateであり、OS capabilityではない。Serviceはtyped
matcherからcompileしたimmutable versioned `TraversalPlan` dataだけをinterpretする。Repository planはbounded descendant
traversalを表現できる。Global planはtool-home rootをenumerateせず、exact targetはfixed ancestor/target chainだけに触れ、
fixed Copilot instructions subtreeだけがprefix配下をopen/enumerateできる。隣接Global pathへのI/Oは0とする。

Opened directoryごとにdescend前にbounded sibling bufferをcompleteにする。Exact `Dirent.name` raw segmentはpath再構築/
verificationだけに保持し、NFC classification segmentはmatching/order/DTO pathだけに使う。Distinct raw siblingが1 NFC
classification keyへnormalizeする場合、group全memberをdescend/open/readせずfail closedにして
`safe-fs-path-normalization-collision`を付ける。CollisionのないNFD-only spellingはraw pathでreadしNFC表示する。
全entryをshared limitへcountし、bigint `lstat`とcanonical containment checkでVCS内部、link、非directory traversal
object、検出可能なdevice changeを拒否する。このserviceだけがprivateでgeneration-boundな`ScanEntryTicket`を発行でき、HTTP valueやparsed contentから
作成・再構築できない。

Candidate readは所有root contextとticketだけからpathを再構築する。Open前にrootと全ancestorの`lstat`を再検査し、
ticket snapshotと`dev`/`ino`/`mode`を比較する。まずcandidate pathを`lstat`し、linkまたはnon-regular objectを
拒否して、`dev`/`ino`/`mode`/`size`/`mtimeNs`/`ctimeNs`をenumeration metadataと比較する。次にcandidateを
`realpath`でresolveし、`path.relative`でcanonical containmentを要求して、直後にcandidate pathの`lstat`比較を
繰り返す。両方のpath-stat snapshotが相互に一致し、enumeration metadataとも一致した場合だけfileをopenする。
`O_NOFOLLOW`が存在しplatformで有効な場合は、必須のfinal-component
多層防御として使用する。不在または無効なsupportはcross-platform保証ではない。Byteを読む前に同じ順序の
root/ancestor/candidate-`lstat`/canonical/candidate-`lstat` sequenceを繰り返し、同じfieldを
`FileHandle.stat({ bigint: true })`と比較する。Byteは同じ`FileHandle`から上限付きchunkで読み、後のpath-based
`readFile`は使わない。Handleを開いたまま受理前に、
post-read validationとしてこの完全な順序付きsequenceと、同じ`FileHandle.stat`について同じfieldの比較を
繰り返す。いずれかの段階で不一致があればhandleをcloseし、収集済みbyteを全て破棄し、ticketをstale/rejectedと
し、readable content/receiptをcommitせず固定のsource-value-free diagnosticだけをemitする。安全にinventory済みのpathには
上限付きdiagnostic-only recordを残してよい。Root identity failureはそのsource attemptを
abortして以前にcommitしたgraphを維持し、entry-local changeはunaffected resultをbounded partial resultとして
利用可能に保つ。

Nodeが必要なidentity/metadataまたはcanonicalizationをunavailable、ambiguous、malformed、その他unusableと
報告した場合、`safe-fs-boundary-unverifiable`でboundaryまたはcandidateを拒否し、推測しない。Root-level failureは
source attemptをabortし、item-level failureには上限付きdiagnostic-only inventory recordだけを残してよい。

**理由**: 反復checkは通常の同時編集riskを実質的に減らし、検出した変更をcommitさせず、scan contractが要求する
正確なresource accountingを保つ。ただしkernel-enforced containmentは作らない。Node 24の
[filesystem API](https://nodejs.org/docs/latest-v24.x/api/fs.html#file-system-flags)はdirectory-handle-relative openや
atomicなbeneath/no-follow resolverを公開せず、POSIX `O_NOFOLLOW`はfinal componentだけで、Windowsには対応する
portable Node flagがない。Nodeは全Windows reparse tagや全mount transitionをportableに公開できない。
Same-device bind mountとNodeが公開しないreparse metadataは、automated-test proof外の明示的なplatform limitationとして残る。
[Permission Model](https://nodejs.org/docs/latest-v24.x/api/permissions.html#limitations-and-known-issues)と
[WASI](https://nodejs.org/docs/latest-v24.x/api/wasi.html#security)も不足するfilesystem primitiveの代替ではない。

したがってこのreleaseは検出した通常の同時変更とその他implementation-detectable raceをscope内とし、検出した
全caseをfail closedにするが、
path check間にroot、ancestor、final entryを差し替えられるactive adversarial processを除外する。Testは指定した検出動作の証拠で
あり、そのactorに対するproofではない。Threat model拡張前の具体的解消pathは、atomicなbeneath/no-follow
semanticsを持つ将来のNode directory-relative APIを採用するか、OS強制のread-only snapshot/sandbox内でscanし、
security reviewを再実行することである。単一bounded serviceはentry/depth/deadline/byte accountingとprogressを
引き続き集約する。Emitする全file pathはowning Sourceの1つのrootからのcollision-free NFC classification pathとし、
filesystem operationではraw spellingを保持する。

**検討した代案**:

- 直接の`readFile(path)`やglob-only implementationはgeneration-bound ticket、enumeration/open identity一致、
  post-read validation、complete scan accountingを持たないため不採用。
- Node Permission ModelやWASIをcontainment proofとみなす案は、documented limitationによりatomic child-open
  semanticsを提供しないため不採用。
- Pre/post path checkがactive root/ancestor/final-entry replacement attackerを防ぐと主張する案は、validationとopenが別operationの
  ままであるため不採用。
- 現在source内を指すsymlinkの追跡はparent swapとaliasがboundary/identityを複雑にするため不採用。
- Install時compilerやdownload済みplatform helperを使う案は、packageをNode.jsだけでas-shipped実行するため不採用。
- 1件のunsafe/changed fileによるscan全体失敗はFR-028に反するため不採用。

## 6. 安全なparse、literal表示、inert rendering

**決定**: Source byteを正とし、support対象textをstrictにdecodeする。読み取り可能なsource text、表示対象の
宣言済みmetadata値、comparison contentは、credential検出、content-based masking、redaction、reveal workflowを
使わず、記述されたまま返す。調査対象content内の環境変数参照はliteral textのままとし、Inspectorが参照先の
process値を読み取り、解決、置換する契機にしない。文書化済みの`CODEX_HOME`、`CLAUDE_CONFIG_DIR`、
`COPILOT_HOME` inputは、hostがtool別Global Source rootを特定するためだけに使い、content parseでは使わない。

Decode後にbest-effort metadata extractionを行うが、decode/normalize済みvalueを表示値には使わない。受理した
allowlist field occurrenceごとに、正確な`authoredLiteral` source sliceと別のinternal typed semantic valueを持つ。
Public metadata listはsource occurrence順を保ち、受理したduplicate occurrenceも保持する。Stable identityはclosed
tool、kind、field ID、そのfield内のzero-based occurrenceである。JSONC syntax-tree range、YAML CST/source-token range、semantic
parseと組み合わせるbounded TOML lexical-span scanner、bounded Markdown/frontmatter/import spanから正確なsliceを得る。
JSON/YAML/TOMLのquote、escape、block indicator、number/date spelling、collection punctuationを表示に残す。Typed
classification、relationship normalization、bounded derivationに使えるのは別のsemantic valueだけとする。
Authored relationshipは正確なtarget sliceを表示し、normalized targetにはsemantic stringだけを使う。Registry定義の
documented defaultにはsource sliceがないため`authoredTarget: null`とし、source-authored textではなくdocumented defaultと
labelする。RangeはECMAScript UTF-16 code-unit offsetを使い、`String.prototype.slice`でliteralを再現し、UTF-8 byte
boundとは分離する。Metadata、relationship、derivationは同じexact source occurrence/rangeを参照できる。Distinct origin
occurrence間のpartial、nested、crossing、identical overlapだけをinvalidとする。Rangeがmissing、illegal overlap、
ambiguous、またはsourceへround-tripしない場合はliteralを発明せずrecognitionのextraction全体を破棄する。

YAML semantic parseはcustom tagなしのcore schemaと無効化したalias、JSONCはsyntax treeからの既知path extractionと
する。Semantic valueはboundedかつJSON-safeなdiscriminated internal unionへnormalizeし、integer、float、date/time
payloadはtyped canonical stringを使ってJavaScript precision lossを防ぐ。Markdown/frontmatterとClaude importはtext
scanとする。V8 limit付きparser workerを最大2つ使い、recognitionごと2,000 ms/accepted message 2 MiB、depth 64、
50,000 node、64 KiB scalar、512 metadata entryをenforceし、generation parser message合計は32 MiBとする。64 KiB
scalar limitは正確なUTF-8 source sliceとtyped semantic valueへ独立に適用する。Parser limitまたは同じ
`(fileId, tool, kind)`への2 extractorのincompatible meaningでは、そのrecognitionのresult全体を破棄するが、読み取り可能な
source textや別recognitionは変更しない。Tool/kind pairごとにrecognitionは正確に1つで、compatible provenanceはそこへ
mergeする。Rule、script、markup、URL、control sequenceは
実行もrenderもしない。Operational diagnosticとlogはstable code、owning Source、Source-relative Pathを示し、
customization source valueを複製しない。

**理由**: Declaration/relationshipのlabelにはparseが必要だが、成功してもInspectorをvalidatorにしない。
Literal表示は、maskingなら隠してしまうcredentialその他の記述済み差分を維持する。Sourceまたはcomparison viewを
開く前に、完全な記述済みcontentが機密値を含み得ることをinterfaceで警告する。Authenticated loopback API、
`Cache-Control: no-store`、process/browser memoryだけのlifetime、Vue text binding、無効なlink、restrictive
content security policyにより、この意図的な表示をlocalかつinertに保ち、maskingをsecurity boundaryとして
扱わない。

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
Monacoが生成するinline layout/theme styleと、正確なhashがtrusted build manifestにあるNuxt executable inline
scriptだけをCSPで許可する。Executable attribute、evaluation、nonce、未記録inline script、external worker、
blob workerは許可しない。Diff highlightは各side最大20,000行の場合だけ、明示的な5,000 msの
computation timeoutで試み、いずれかのlimit到達時もcomplete read-only side-by-side sourceとdiagnosticを
残す。Recognition metadataはtool、kind、closed field ID、occurrenceで対応付け、正確な`authoredLiteral`をVueのrow/badgeで
比較・表示する。Internal typed semantic valueをUIへ置換せず、Monaco向けJSON textへ変換しない。
Monacoのaccessible diff viewer、ARIA label、keyboard navigation、narrow-screen inline modeを維持し、
明示的なaccessibility test対象にする。

**理由**: Source fileにはMarkdownとstructured configurationがあり、syntax coloring、line navigation、
virtualized rendering、search、synchronized scroll、実績のあるdiff surfaceがinspectionを明確に改善する。
Monacoはsource差分を計算し、file-size、computation-time、accessibility controlを提供するため、別の
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

Portable Node APIからsystem browser helperを選ぶ独立したtrusted boundaryを取得できないため、Windowsとその他platformは
automatic openをskipして固定manual-URL warningを出す。Child environmentのexact allowlistは、macOSが`HOME`、`TMPDIR`、
`LANG`、`LC_ALL`、Linuxが`HOME`、`DISPLAY`、`WAYLAND_DISPLAY`、`XDG_CURRENT_DESKTOP`、`DESKTOP_SESSION`、
`DBUS_SESSION_BUS_ADDRESS`、`XDG_RUNTIME_DIR`、`LANG`、`LC_ALL`とする。
`BROWSER`、`NODE_OPTIONS`、`NODE_PATH`、その他のenvironment value、inspected value、追加argvは渡さない。
OS helperはlisted desktop/session valueを利用できるが、Inspectorはそれからhandlerを選択しない。OS提供
`xdg-open`自体はsystem shell helperの場合があるが、package payload外の固定executableとして`shell: false`で呼び出す。

このsectionの固定contractとして、limit内の正確なraw `lexicalRoot`をinternal stateに保持し、その値、
escaped display、immutableな`TraversalPlan` schema/selection-policy/canonical programをconsent digestにbindする。Enableは
stored raw valueだけを使い、display textから逆変換せず、environmentを再readしない。
また、各SessionSnapshot/FileDetail requestは`clientDataEpoch`、generation、正確なrequest token、該当時は
file IDをcaptureする。Old snapshotは無視し、new generationをadoptする前にepochをincrementし、
全detail、comparison、editor objectをabort/disposeする。Equal-generation snapshotはcurrent tokenと一致する
場合だけ、FileDetailはepoch/generationが一致しreadable fileがまだ存在する場合だけadoptする。
Serverはcoordinator lock下で各response envelopeのgenerationとpayloadを一緒にcaptureする。

**決定**: 小さなversioned JSON APIとstatic-file serviceに`node:http`を使う。`127.0.0.1`のephemeral
portへbindし、processごとに256-bit capabilityを作り、URL fragmentでSPAへ渡し、全API requestで
要求する。Host/Originを厳密に検査し、CORSを設けず、非JSON/oversized bodyを拒否し、
`Cache-Control: no-store`とrestrictive CSPを送る。Client pathではなくfile IDとclosed commandを使う。
Capabilityはmemoryだけに保持し、fragment削除後のreloadではAPI requestを行わずprocess-lifetimeの表示済み
URLを開き直すよう案内する。Inert SPA shellはclosed client-route grammarとbuild-manifest assetだけへ返す。
CSPは`unsafe-inline`ではなく正確なbuild-recorded inline hashから導出する。Global consent前にcapability保護した
lexical/no-I/O path previewを公開し、proposed rootを32 KiB UTF-8、escaped displayを192 KiBでboundし、
session-keyed digestへconfirmationをbindして、oversized inputまたはconsent後のcanonical alias差異は
enumeration前に拒否する。Authorized pageがvisibleな間は、capability保護liveness routeを1秒ごとに750 ms
request timeout付きで呼び、2秒のmonotonic browser-memory leaseをrenewする。Liveness failure/mismatch、lease
expiry、hidden/page lifecycle event、process lossにはepoch guard付きの単一purgeを使い、全DOM/DTO/editor/warning
stateを除去してlate responseによるcontent復活を防ぐ。Hidden-page purgeを越えて保持するのはmemory capabilityだけとする。
Visibleへ戻るとretained capabilityでfresh sessionを認証する。SPAはpurge済みIDを保持・比較せず、返された`sessionId`を
new liveness baselineとして採用し、boundedかつcontrol-onlyな`globalControl` viewだけを保持する。Active consent中は
そのviewからdisableを直ちに利用でき、preview routeがexact frozen previewを返した後だけbrowser persistenceや
environment再readなしでretry controlを再構築できる。Recovery viewは常にResume inspectionを提示し、この明示actionは
matching sessionを再取得してdefaultのfresh inventory summaryを構築するが、old detail、comparison、editor、selection、
filter、authored source、acknowledgementを復元しない。後のdetail/comparison openにはnew acknowledgementを要求する。

Browser attempt前にclosed-grammar launch URLを起動元terminalへ正確に1回表示する。Project-owned
`src/launch-browser.ts`は`http://127.0.0.1:<port>/#cap=<43-character-base64url>`を再検証し、`--no-open`でなければ
`node:child_process.spawn`を`shell: false`、ignored stdio、固定argument、`unref()`で使う。macOSは
`/usr/bin/open`、LinuxはOS提供`/usr/bin/xdg-open`とする。Windowsとその他platformはautomatic openをskipして
固定manual-URL warningを出す。Browser override、inspected value、追加argumentをcommandへ渡さない。Helper
missing、spawn error、nonzero exit、unsupported platformは固定warningだけを出してserverを継続し、表示済みURLを
fallbackにする。Launch lineは意図したcapability表示の唯一の場所で、operational logへcopyしない。

**理由**: Loopback bindingだけではbrowser-origin requestやDNS rebindingを扱えない。Fragmentは最初の
HTTP requestで送信されず、JavaScriptがcustom authorization headerへ移してvisible historyから消せる。
Browser storageを使わなければambient credentialを作らずrefresh behaviorを明確にできる。Digest-bound preview
consentにより、hostがpathへ触れる前にuserが見たlexical root/patternを証明できる。Oversized inputは
normalization前に固定`oversized`/null-display stateとなるため、敵対的なenvironment sizeがunbounded consent
DTOを作ったりhidden valueをauthorizeしたりしない。小さな固定route集合へ
`node:http`を使えばserver frameworkが不要である。現行H3 v2 tagはrelease candidate、
stable H3 v1はより大きなlegacy dependencyである。
Bounded client leaseはdataを永続化せず、消失済みserverからのpushへ依存せずprocess lossを観測可能にする。
Hidden pageで直ちにpurgeすればbackground timer throttlingも避けられる。
Recovery DTOはSourceが0個でもall-failed Global consentを可視に保ち、previewを分離することで大きくなり得るdisplay
payloadをsession pollごとに繰り返さない。

**検討した代案**:

- 無認証RPCはcustomization fileにsecretが含まれ得るため不採用。
- Cookieのみまたはquery string tokenはambient cookieがCSRFを招き、queryがrequest log/historyへ
  残るため不採用。
- 一般的な`--host` supportとCORSはremote accessがscope外のため不採用。
- SSE/WebSocketによるsession pushは、1つのauthenticated liveness responseとlocal leaseでlong-lived transportなしに
  必要なteardown signalを得られるため不採用。
- `BROWSER` override、shell command string、bundled platform helperは、user-configurableなexecution pathが不要で
  product packageをJavaScript-onlyに保つため不採用。

## 9. Atomic generation、rescan、resource limit

共有で強制するgeneration全体のaggregate capは、alias 50,000件、recognition 8,000件、metadata entry
100,000件、candidate provenance 100,000件、relationship 100,000件、retained graph data 64 MiBとする。
Encoded `SessionSnapshot`はneutral-overlay base 5 MiBとsession所有overlay 3 MiBの正確な合計8 MiB、encoded
`FileDetail`は4 MiBまでとする。Overlayはlifecycle Diagnostic/ID insertion用最大2 MiBと、stale state、Global control、
Source lifecycle/progress projection用に分離した1 MiBで構成する。Paired lifecycle insertionは1件最大2 KiBとし、通常detail
受理前にそのsub-budgetの16 KiBを4つのkeyed failure slotとsentinel用に予約する。Oversized keyed failureは固定compact
per-key formへ変換し、oversized ordinary detailはsentinelへ抑止する。Replacementはold chargeをcreditしてからatomicに受理し、
build testはclosed control projectionのworst-caseが1 MiB sub-budget内であることを証明する。Allocation/retention前の
deterministicなrecord-byte accountingでwhole recordだけをadmitし、最初のexcess recordでgenerationをbounded partialとして
bounded diagnosticを付ける。Routeはcommit済みDTOをtruncateせず、あり得ないpost-commit size invariant違反は
safeにfailする。Canonical accountingはproduction JSON encoderで行い、そこでmaterializeした1つのUTF-8 entity-body
bufferを変更せずHTTP layerへ渡すため、2つ目のserializerによるbyte driftは起こらない。

**決定**: Repository scanは自動開始し、session snapshotでprogressを公開し、以後のRepositoryまたはenabledな
tool別Global Sourceのscanは明示的user actionだけで行う。自動Repository command前にlegalで空のzero-I/O
bootstrap generation 0を同期作成し、workがqueueされるまではsource progressをnullとする。単一coordinatorが
全`GlobalEnableOperation`、Repositoryまたはtool別Global Sourceの全scan、Global調査を無効にするtransactionをserializeする。
Initial enable/retryはstate mutation前に全tool-set capacityをreserveし、accepted shareをqueued scanへtransferして、
rejection/completion/failure/cancellation時に全shareをreleaseする。Reserve failureはstateを変更しない。最後のcoordinator
lock下operation-ID/epoch/state checkでenable response dispositionをatomicに選択する。Operationが先なら`202`をcommitして
lease close/unregisterを直ちに行い、disable barrierが先なら`409`をcommitしてdrainし、operation-local resourceと
untransferred capacityのrelease後だけclose/unregisterしてlate mutation/leakを防ぐ。
通常scanはFIFOとする。Global disableはpriority security barrierとして受理時に`globalControl.state: disabling`、
empty pending/retry array、increment済みcommand epochとし、new Global-enable/Global-rescan commandを拒否する。Active uncommitted transactionを
abort/discardし、enable validation/admissionをabort/drainして最後のqueued Global work cancellation sweep後、次に全active Global SourceをI/Oなしでremoveし、中断した
Repository commandをその後ろへ1回だけrequeueする。Repeated disableはqueued/active barrierへjoinし、tool固有
Global Source/graph、active consent record、retained admitted Global root context、open Global inspection `FileHandle`、
running/queued Global scan/enable commandがない
場合はRepository workにかかわらずno-opとする。
各scan jobはcurrent session-wide generationから開始し、unscanned sourceを残りのshared file/byte/
diagnostic budget内でcarryし、replacementを別に構築する。Completeまたはbounded partial resultだけを次
generationとしてatomic commitし、全source graphをrekeyして全file IDとcomparisonをinvalidateする。
未解決の明示rescan failureはimmutableなcommit済みgenerationのfieldではなく、Sourceをkeyとするsession所有entryで
保持する。Confirmed toolごとにsession所有`GlobalToolControl`をscan working set外に持ち、commitまではadmit済みroot
contextと未公開Source/boundary IDをそこで所有する。Source commit成功時はそのcontrolの予約済みtool failure diagnosticを
clearする。Consent後validationがrootを0個acceptする場合、全件reject requestは`active-no-job`を返してexact retry/disable用
consent/controlを保持し、new Source/jobをpublishしない。Initial activationではGlobal Sourceが0個となり、retryでは既存Sourceを
保持する。Mixed requestでは`pendingTools`がrunning enable/retry operationのvalidation/admissionとqueued/running initial scanを
含むため、`unvalidated` toolをretryableにしない。全work完了までretryable toolを情報表示だけとし、その後のretryは
preview-gated、disableは直ちに利用可能とする。Planとshared contract
記載のlimitをenforceする。

**理由**: Global serializationとatomic session generationはlost updateとold/new result混在を防ぐ。明示的な
再scanがfatalに失敗した場合、そのattemptのpartial resultを含む未commit結果をすべて破棄する。最後に正常
commitされたsnapshotを表示したまま残し、再scan失敗によりstaleとmarkして、実行可能なcap対象
out-of-generation session diagnosticを付ける。別Sourceのfailureは共存し、別Sourceの正常commitはcarryする。
Affected Sourceのcomplete/bounded-partial正常scanまたはそのSourceの除去だけがentryと予約済みdiagnosticをclearする。最初のRepository
scanがfatalに失敗した場合は、以前のinventoryを作り出さずlegalで空のbootstrap generation 0をcurrentのまま残す。Tool別
Global Sourceのrescanがfatalに失敗した場合、そのSourceのconsent、1つのaccepted root context、最後にcommitした
graphを保持して明示retry/disableを可能にする。RepositoryとGlobal toolごとに1つの固定failure 4 slotとsession sentinelにより、
1,024 cap内で通常session-lifecycle detailを1,019件保持する。独立したpost-commit byte overlayにより、これらrecordとその他session controlが
commit済み5 MiB baseをinvalidにしたり8 MiB responseをoverflowさせたりしない。30秒hard deadlineはhangを防ぎ、performance acceptance targetは
10秒のままにする。1 file 1 MiB、合計32 MiBは通常のcustomization file 500件を無制限に保持せず扱える。
Kill可能なV8 limit付きworkerでsync parser time/tree amplificationを制限する。Source comparisonは1 file
20,000行と5,000 ms Monaco computation timeoutで別に制限し、cap到達またはtimeoutしてもfull literal
side-by-side viewとdiagnosticを提供してcomparison不能にしない。

**検討した代案**:

- Automatic watch/rescanはFR-030が要求しないimplicit readとstale-state raceを作るため不採用。
- Active resultのincremental mutationはconsumerがgeneration混在を観測するため不採用。
- Per-source commitのconcurrent実行は、単一generation numberとgeneration-scoped IDにconflict-proneな
  commit-time rebaseを必要とするため不採用。
- Unlimited scan、parse、relationship、comparison workはuntrusted repositoryに対して安全でないため不採用。

## 10. 検証戦略

追加の固定fixtureは次を検証する。Browserはscan/disable commitをまたいでsnapshot/detail deliveryを一時停し、
epoch、generation、token、file existenceが合わないlate responseを拒否する。Previewはraw/display escape collisionを
作り、enableがstored raw rootを使うことを証明する。Global exact targetはrootをenumerateせず、fixed subtreeは許可された
descendantだけに触れ、隣接pathへのI/Oは0とする。Raw-path fixtureはcollisionのないNFD-only entryを正確な
spellingでreadし、NFC/NFD sibling collision groupをdescend/readなしでfail closedにする。Literal-span fixtureは全support
formatでastral、isolated-surrogate、combining sequenceをfield周辺に置き、UTF-16 `String.prototype.slice`
round trip、1つのorigin occurrenceからmetadata/relationship/derivationへの共有、distinct origin間overlapの拒否を
検証する。Multi-provenance fixtureはtool/kindごと正確に1 recognitionであること、hard-link alias seed
provenanceを別に保つことを証明する。Package fixtureはpackage payloadとpackage-manager生成symlink/`.cmd`/`.ps1`
launcherを分け、その正確なdeclared Node targetとargv-only bodyを検証する。Exact-limitと1-record-over fixtureは全aggregate
count、worker-message、graph、snapshot、detail budgetをresponse truncationなしで検証する。

**決定**: Vendor conformance fixtureとnegative near-missに加え、link、race、encoding、limit、literal
credential、環境変数参照、import、executable declaration、malformed formatのadversarial fixtureを保守する。
Pure recognizer/parserとliteral-display DTO、HTTP contract、source boundary integration、pack済み`npx`、
100k/500 performance case、4つの
Playwright user story、axeとkeyboard/manual checkによるWCAG 2.2 AAをtestする。4つのregistry fixture suiteは
全behavior/rule/strategy/source ID、相互evidence link、正確なsection anchor、英日parity、Inspector matcher
registryだけがreadを認可できることをvalidateする。Matcher fixtureは`./`なしのRepository selectorとbare
`**/`を拒否し、exact/direct-child/explicit descendant inventoryを区別し、`./**/`がvendor traversal factを
satisfiedにしないことを証明する。Targeted regression fixtureはCopilotの別々のVS Code/CLI/Cloud lookup表、
exact launch `cwd`だけのClaude project settings、non-recursiveなCodex rule directory、plugin activation対
authored manifest inventory、FR-015からFR-018外へのGlobal read 0件を扱う。
さらに、tool別Global Sourceが0から3つで各tool最大1つ、各Sourceが正確に1つのrootとSource-relative Path
namespaceを持つこと、literal credentialのexact表示、reveal controlがないこと、環境変数を置換しないことを
検証する。Lifecycle fixtureは全4 Sourceの未解決failure共存、Source別clear/replace/removal、自動初回failureの
current stateを扱う。Browser fixtureはliveness lease、visible process loss、hidden/page purge、session mismatchを
伴うport再利用、late responseのepoch rejectionを扱う。macOS、Linux、Windowsでpure Node.js
integration/race suiteを実行し、parent/final-component replacement、root rename、symlink/junction rejection、
検出可能なdevice change、identity/metadata mismatch、bounded same-handle read、byte破棄、readable contentの
no-commit、pack後実行を扱う。有効な`O_NOFOLLOW`が存在する場合は、その使用をtestで要求する。
Controlled barrierはpost-readのroot identity、全ancestor `lstat`、canonicalization前後のcandidate path `lstat`、
canonical containment、same-handle stat比較が検出する変更をexerciseする。Test専用filesystem barrierはtest harness内だけに置き、
production moduleからexportしない。
これらtestは指定したdetected-race動作を確立するもので、threat modelから除外したactive adversarial mutatorへの
proof、またはsame-device bind mountやNodeが全く公開しないreparse情報へのproofと記述してはならない。Inspected contentにより
outbound request、MCP connection、child process、dynamic evaluation、source mutationが発生するとtestを
失敗させる。

2026-07-17のmeasurable-outcome再確認により、次のobjective protocolを固定する。

- **SC-001**は、通常の開発作業でGitとcommand-line interfaceを使うがInspectorを利用したことも開発へ参加した
  こともない参加者を正確に20人使用し、提供されたproduct guidanceだけで2分以内に19人以上の成功を要求する。Timerは
  標準化されたtask promptの提示時に開始し、発見済みfile 1つのsource/details viewが画面に開かれて操作可能に
  なった時点で終了する。Repository rootへの移動とlaunch timeも含む。SC-001は同じcohortのSC-006より先に行う。
  Moderatorはpromptを同じ文面で読み直すことだけ可能とする。登録済み参加者の機材、環境、product failureは
  timer開始前も含めて不成功とし、参加者を除外または差し替えない。
- **SC-002**は、内容を変更しないdeterministicな100,000-entry/500-match fixtureを1つ用意し、メンテナーが指定
  する同じ現在のローカル基準環境で正確に10回の測定runに再利用する。Fixture構築、setup、`npx`
  download/installation、process startはtimer外とする。両timerはbrowserがscan requestを送信した時点で開始し、
  1秒以内にvisible progressまたはmeaningful status、10秒以内に完全で操作可能なinventoryを表示する。9回以上が
  runごとに両方のthresholdを満たす必要がある。各runは新しいInspector processを使い、application-memory stateや
  以前のsnapshotを再利用しない。Operating system filesystem cacheは意図的にclearせず自然に変化する状態を使う。
  結果は基準環境固有であり、repository documentationはその環境の具体的なmachine、operating system、hardware、
  runtime情報を公開しない。
- **SC-006**はSC-001後に同じ20人を以前の結果にかかわらず使用し、同じ指定fileを開いた同一の準備済みInspector
  stateから開始する。Timerはstateの準備完了後に標準化されたpromptを提示した時点で開始する。Standardized
  response formはsource、recognizing tool、file type、effective behaviorがcertainかconditionalかの4項目を必須と
  し、2分以内に全項目がpredefined ground truthと一致した場合だけ成功とする。提供されたproduct guidanceと
  SC-001のmoderator policyだけを使って18人以上の成功を要求する。禁止された支援なしでprimary workflowを
  完了できなくする問題、または意図しないexecution、inspected-source mutation、MCP/network connection、
  別machineへのinspected content開示を起こす問題をcritical usability issueとし、許容件数を0とする。

**理由**: 憲章はpassing testを証明ではなく証拠とするため、objective automationにfull-diff review、
manual accessibility check、documentation parity check、release tarball inspection、固定participant scoring、
再実行可能な基準環境固有performance measurementを組み合わせる。

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
   commitされたsnapshotをSource別stale-failure entryと予約済み実行可能diagnostic付きで残す。正常scanはown Sourceの
   entryとdiagnosticだけをclearし、無関係なcommitは両方を保持し、Source除去はremoved Sourceの両方をclearする。
   同じSourceの再fatal rescanはそのSourceの両方だけを置換する。
4. Fatalな自動初回Repository scanもprovisional resultをpublishせず、bootstrap generation 0をcurrentのまま保つ。
   Fatalな初回tool-enable jobはprovisional resultをpublishせず、missing tool用の`StaleSourceFailure` entryを追加せず、
   そのtoolのkey別予約済みfailure diagnosticを作成/置換し、既存entryとそこから派生するsnapshot stateをすべて保持する。
   初回Global enableでは、Sourceがまだない
   confirmed toolのretryまたはGlobal inspectionのdisableに必要なexact active consentとtool別`GlobalToolControl` stateだけを
   保持し、mixed outcomeで成功済みのtool Sourceは変更しない。Consent後validationは0 toolをacceptしてrecover可能な
   `active-no-job`を返せる。Purge済みclientはretry前にactive control viewとexact frozen previewをrecoverする。
5. Cross-sourceの表示、filter、diagnostic用語はSource-relative Pathとする。Repository-relative pathはlaunch
   `cwd`をrootとするRepository Sourceだけに使う。
6. SC-001、SC-002、SC-006はSection 10のobjective protocolを使う。SC-002はメンテナーが指定する現在の
   ローカル基準環境で測定し、その具体的なmachine、operating system、hardware、runtime情報をrepository
   documentationへ公開しない。

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
- Global fileへrepository-relative pathを使う案は、Global SourceがRepository `cwd`をrootとしないため不採用。
- Portableなperformance claimまたは現行reference machineの開示は、SC-002が意図的にenvironment-specificで
  あるため不採用。
