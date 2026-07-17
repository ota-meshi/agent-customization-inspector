# Phase 0 調査: エージェントカスタマイズの調査

[English](research.md)

**調査日**: 2026-07-16
**対象**: 参照architecture、現行互換toolchain、安全なlocal host設計、parseとmask、source/metadata比較、
bounded scan、公式customization path surface

## 1. Package architecture

**決定**: `app/`、`src/`、`shared/`、`tests/`、`bin.mjs`、1つの`dist/`を持つ公開可能な
ESM packageを1つ使用する。Client buildはNuxt、Node CLI bundleはtsdownが所有する。
Pure Node.jsの`src/inspection/safe-fs.ts` moduleが調査対象sourceのenumeration/readを全て所有し、CLIとともに
bundleする。Typed inert DTOだけをbrowserへ渡す。
Runtime、build、testの全executable codeはJavaScript/TypeScriptとする。Generated HTML/CSS、JSON manifest、
documentation、licenseはdeclarative artifactとして許可する。

**理由**: UIとCLIは1つのproductを形成し、1つのrelease versionを共有し、すべての`npx`起動で両方が
必要になる。単一packageはinstall/releaseをatomicに保ち、`app`/`src`/`shared` boundaryはbrowser codeが
filesystem accessを得ることを防ぐ。Build orchestrationはpackage所有output treeだけをcleanし、Nuxtに標準
`.output/public` staging treeを書かせ、accepted assetを検証して`dist/public`へcopyし、tsdownにnamed
CLI/Worker entryとcode-split chunkをcleanな別`.build/server` staging treeへ出力させる。固定manifestが
両output classをcopy/pack前に閉じる。最小の`bin.mjs`がCLIをimportでき、
独立version管理するpackageを作る必要はない。
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
contractをbundleし、任意のtransitive packageはbundleしない。

**理由**: Separate clean staging treeはcross-toolの`clean: false`へ依存せず、stale output拒否を機械的にする。
node_modulesをexternalにすると、
platform-sensitiveまたは変化するtransitive codeの暗黙inlineを避け、CLIがloadするものをmanifestで
表せる。[tsdown dependency documentation](https://tsdown.dev/options/dependencies)はexternal dependencyと
明示的`alwaysBundle`を区別し、[entry documentation](https://tsdown.dev/options/entry)はnamed multi-entry形式を
定義する。Web、CLI、parser Worker、safe-filesystem layerがpackaged locationからloadできることはtarball
smoke testで証明する。Tarballをisolated fixtureへinstallしてexecutableを実際に`npx --no-install`でinvokeし、
`bin` mappingのinspectionだけで済ませない。起動前にexact shebang/executable modeもassertする。
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
shell内の正確なexecutable script byteの44-character base64 SHA-256 digestである。Runtimeは
`import.meta.url`からmanifestをresolveしてstrict validationし、bind前に全listed assetのsize/hashを検証する。
Unlisted pathは配信しない。

`dist/manifests/server-assets.json`は最大1 MiBのstrict JSONで、exact keyの`manifestVersion: 1`、
`packageVersion`、ordered 2..256 recordの`assets` arrayを持つ。各recordは正確に
`{ file, byteLength, sha256 }`、安全なrelative `.mjs` pathはsort済みunique、listed byte合計最大64 MiB、
各file最大16 MiB、`cli.mjs`/`parser-worker.mjs`必須とする。全code-split tsdown outputをlistedする。Final
recursive verifierはこのmanifestとstatic manifestからlegalな`dist/` fileだけを導出し、pack前に全
stale/unexpected/link/non-regular pathを拒否してunpack済みtarballへ同じproofを適用する。

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
| CLI/browser open | `cac` 7.0.0 / `open` 11.0.0 | 小さく現行のESM-compatible dependency |
| Parser | `yaml` 2.9.0、`jsonc-parser` 3.3.1、`smol-toml` 1.7.0 | 現行stable inert data parser |
| Source view/diff | `monaco-editor` 0.55.1 | 現行stable read-only source/diff editor。固有diff engineによりclient dependency重複を避ける |
| Lint | ESLint 10.7.0、`@nuxt/eslint` 1.16.0 | 現行互換stable release |
| Unit/integration | Vitestとcoverage-v8 4.1.10、Nuxt Test Utils 4.0.3 | Vitest/coverageを同じversionにし、Nuxt supportのtest harnessを使う |
| Component/DOM | Vue Test Utils 2.4.11、happy-dom 20.10.6 | Nuxt Test Utils peerを満たす現行release |
| Browser/a11y | Playwright 1.61.1、`@axe-core/playwright` 4.12.1 | 現行stable browser/accessibility tooling |
| Type | `@types/node` 24.13.3、`vue-tsc` 3.3.7 | Node 24基準とVueに対応する最新互換type |

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

調査日時点のupstream stableにはTypeScript 7.0.2とVite 8.1.4もあるが、意図的に選択しない。
公式[TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)は
Vue/Volar workflowに当面TypeScript 6を要求し、
[typescript-eslint dependency policy](https://typescript-eslint.io/users/dependency-versions/)は7をまだ許可せず、
公開された[Nuxt 4.4.8 Vite builder manifest](https://registry.npmjs.org/@nuxt%2Fvite-builder/4.4.8)は
Vite 7を宣言している。これらを強制すると、動作する現行Nuxt stackを使うという要件に反する。
Dual TypeScript compilerとpnpm overrideは初期リリースに不要な複雑さとして不採用。

## 4. Vendor behavior、Inspector matcher、evidence

**決定**: 1つの混在path matrixではなく、ownershipを分離した4つのcontract-versioned registryを保守する。

1. **Vendor behavior registry**は、文書化済みlookup base、locator、traversal、surface、scope、不確実性を表す
   stable `behaviorId` statementを記録する。規範的なhuman contractは
   [GitHub Copilot](contracts/vendors/github-copilot.ja.md)、
   [Claude Code](contracts/vendors/claude-code.ja.md)、
   [OpenAI Codex](contracts/vendors/openai-codex.ja.md)とする。各contractはRepositoryとUser behaviorを別表にし、
   Copilot contractはさらにVS Code、CLI、Cloudを別表にする。
2. **Inspector matcher registry**はstableな`ruleId`を記録し、共通の
   [allowlist grammar](contracts/inspection-path-allowlist.ja.md)に従う。全Repository matcherはBase、Relative
   selector、Expansionを分離し、正確なlaunch rootから`./`で表記し、bare `**/`を拒否する。`./**/`は明示的な
   下向きInspector descendant inventoryだけを表し、vendor traversalを主張しない。
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

Bounded derivationは任意のreference追跡ではなく、fan-out limitを持つtyped single-edge provenance graphの
ままとする。Derived provenanceは別edgeをseedできず、同じphysical fileの独立static provenanceはeligibleな
ままとする。安全なCodex fallback basename、Codex skill UI metadata、検証済みlocal marketplace root配下の
vendor-specific plugin manifestだけを受理する。Agent memory、任意role-config target、plugin component、
import、その他任意component/config path、skill resource、script、asset、remote source、MCP server提供instructionは
relationshipまたはexcludedのままとする。

**理由**: Current official documentationの再監査により、旧combined tableではInspector matcherがvendor lookup
behaviorのように見える箇所が複数判明した。

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
- 1つの`certainty` enumは、documentation maturity、authored/installed state、trust、enablement、selection、
  runtime applicabilityが直交するため不採用。

## 5. Filesystemとscan safety

**決定**: Pure Node.jsの`src/inspection/safe-fs.ts` moduleを調査対象source I/O唯一のbackendとする。
Repository startupとconsent済みの各Global boundaryは、公開されたlexical rootの全componentを`lstat`で検査して
linkを拒否してから、accepted lexical root、その`realpath`、bigint directory identity/metadata snapshot、
source/boundary ID、lifecycle stateを持つinternal
`InspectionRootContext`を作る。このcontextはprivate application stateであり、OS capabilityではない。
Deterministicなbounded walkerは`node:fs/promises.opendir`を使い、残entry budget内でdirectoryごとにentryを
収集・sortし、全relative segmentをvalidateし、全entryを
shared limitへcountし、bigint `lstat`とcanonical containment checkでVCS内部、link、非directory traversal
object、検出可能なdevice changeを拒否する。このwalkerだけがprivateでgeneration-boundな`ScanEntryTicket`を
発行でき、HTTP valueやparsed contentから作成・再構築できない。

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
し、readable content/receiptをcommitせず固定のsecret-safe diagnosticだけをemitする。安全にinventory済みのpathには
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
security reviewを再実行することである。単一bounded walkerはentry/depth/deadline/byte accountingとprogressを
引き続き集約する。

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

## 6. Parse、mask、inert display

**決定**: Source byteを正とする。Support対象textをstrictにdecodeし、known secret-bearing key配下の値と
credential patternをDTO出力前にmaskし、その後best-effort metadata extractionを行う。YAMLはcustom tag
なしのcore schemaと無効化したalias、JSONCはsyntax treeから既知pathを抽出、TOMLはJSON-safe dataへ
normalizeし、Markdown/frontmatterとClaude importはtextとしてscanする。固定linear mask detectorは1 file
最大4,096 match、masked UTF-8 output 2 MiBとし、overflowでは露出し得るsuffixを返さずsource/metadata全体を
非公開にする。V8 limit付きparser workerを最大2つ使い、recognitionごと2,000 ms、depth 64、50,000 node、
64 KiB scalar、512 metadata entryをenforceする。Parser limitでは対象recognitionのextraction result全体を
破棄する。Rule、script、markup、URL、control sequenceは実行もrenderもしない。

**理由**: Declaration/relationshipのlabelにはparseが必要だが、成功してもvalidatorにせず、失敗しても
安全なraw textを隠さない。Raw値をNode側に置けば、browser developer tool上でmaskが見かけだけに
ならない。Monacoへはrendered markupではなくmask済みmodel textだけを渡し、metadataはVue text
bindingを使い、linkを無効にする。Restrictive CSPと合わせ、inspected markupのload/navigationを防ぐ。

**検討した代案**:

- Dynamic import、`jiti`、TOML/YAML custom constructor、Starlark評価、MCP probeは実行なので不採用。
- Raw sourceを送ってVueだけでmaskする案はAPI payload/browser memoryに全secretが残るため不採用。
- Zodは追加しない。Request commandは小さなclosed shapeでmanual guardが単純であり、Zodはfilesystem
  inputを安全にしない。

## 7. Source/metadata比較UI

**決定**: File/compare routeで`monaco-editor`のESM buildをclient-only lazy-loadし、read-only
single-file source viewとmask済みsource比較に使う。Editor workerと必要なbasic-language contributionだけを
importし、Nuxt/Viteにsame-origin assetとして出力させ、未使用language-service workerを含めない。
Modelはopaqueなin-memory URIとmask済みsourceだけを保持し、route close、selection replacement、source
disable、generation replacement時にeditor/subscriptionとは別にdisposeする。`readOnly`、`domReadOnly`、
`originalEditable: false`、`links: false`、`renderMarginRevertIcon: false`を設定し、
`accessibilitySupport: 'auto'`、enabledな`accessibilityVerbose`、各source sideの`ariaLabel`を使う。
Monacoが生成するinline layout/theme styleと、正確なhashがtrusted build manifestにあるNuxt executable inline
scriptだけをCSPで許可する。Executable attribute、evaluation、nonce、未記録inline script、external worker、
blob workerは許可しない。Diff highlightは各side最大20,000行の場合だけ、明示的な5,000 msの
computation timeoutで試み、いずれかのlimit到達時もcomplete read-only side-by-side sourceとdiagnosticを
残す。Recognition
metadataはtyped field identityで比較してVueのrow/badgeとして表示し、Monaco向けJSON textへ変換しない。
Monacoのaccessible diff viewer、ARIA label、keyboard navigation、narrow-screen inline modeを維持し、
明示的なaccessibility test対象にする。

**理由**: Source fileにはMarkdownとstructured configurationがあり、syntax coloring、line navigation、
virtualized rendering、search、synchronized scroll、実績のあるdiff surfaceがinspectionを明確に改善する。
Monacoはsource差分を計算し、file-size、computation-time、accessibility controlを提供するため、別の
text-diff packageは責務を重複させる。Metadataにはset-like recognition、ordered precedence、stable
identity付きfieldというdomain semanticsがあり、serialized lineではなくstructureとして比較する必要が
ある。公式[diff editor options](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor_editor_api.editor.IDiffEditorOptions.html)と
[Monaco repository](https://github.com/microsoft/monaco-editor)がeditor、worker、accessibility、model
lifecycle capabilityを文書化している。意図的に狭いESM importはexact version pinとpackaged browser
testでupgrade時に保護する。

**検討した代案**:

- Monacoと併せた`diff`追加は、現時点でCLI、API、patch export、headless consumerが第2のdiff engineを
  必要としないため不採用。
- Recognition metadataのMonaco向けserializeはproperty orderとline changeがdomain fieldの
  added/removed/changedを不明瞭にするため不採用。
- Custom `<pre>` source diffはnavigation、large-document rendering、synchronization、accessibility、
  diff interactionを再実装するため不採用。

## 8. Local session transport

**決定**: 小さなversioned JSON APIとstatic-file serviceに`node:http`を使う。`127.0.0.1`のephemeral
portへbindし、processごとに256-bit capabilityを作り、URL fragmentでSPAへ渡し、全API requestで
要求する。Host/Originを厳密に検査し、CORSを設けず、非JSON/oversized bodyを拒否し、
`Cache-Control: no-store`とrestrictive CSPを送る。Client pathではなくfile IDとclosed commandを使う。
Capabilityはmemoryだけに保持し、fragment削除後のreloadではAPI requestを行わずprocess-lifetimeの表示済み
URLを開き直すよう案内する。Inert SPA shellはclosed client-route grammarとbuild-manifest assetだけへ返す。
CSPは`unsafe-inline`ではなく正確なbuild-recorded inline hashから導出する。Global consent前にcapability保護した
lexical/no-I/O path previewを公開し、proposed rootを32 KiB UTF-8、escaped displayを192 KiBでboundし、
session-keyed digestへconfirmationをbindして、oversized inputまたはconsent後のcanonical alias差異は
enumeration前に拒否する。

**理由**: Loopback bindingだけではbrowser-origin requestやDNS rebindingを扱えない。Fragmentは最初の
HTTP requestで送信されず、JavaScriptがcustom authorization headerへ移してvisible historyから消せる。
Browser storageを使わなければambient credentialを作らずrefresh behaviorを明確にできる。Digest-bound preview
consentにより、hostがpathへ触れる前にuserが見たlexical root/patternを証明できる。Oversized inputは
normalization前に固定`oversized`/null-display stateとなるため、敵対的なenvironment sizeがunbounded consent
DTOを作ったりhidden valueをauthorizeしたりしない。小さな固定route集合へ
`node:http`を使えばserver frameworkが不要である。現行H3 v2 tagはrelease candidate、
stable H3 v1はより大きなlegacy dependencyである。

**検討した代案**:

- 無認証RPCはcustomization fileにsecretが含まれ得るため不採用。
- Cookieのみまたはquery string tokenはambient cookieがCSRFを招き、queryがrequest log/historyへ
  残るため不採用。
- 一般的な`--host` supportとCORSはremote accessがscope外のため不採用。

## 9. Atomic generation、rescan、resource limit

**決定**: Repository scanは自動開始し、session snapshotでprogressを公開し、以後のRepositoryまたはenabled
Global scanは明示的user actionだけで行う。自動Repository command前にlegalで空のzero-I/O bootstrap
generation 0を同期作成し、workがqueueされるまではsource progressをnullとする。単一coordinatorが全
Repository/Global scanとGlobal-disable transactionをserializeする。
通常scanはFIFOとする。Global disableはpriority security barrierとしてactive uncommitted transactionを
abort/discardし、queued Global workをcancelし、次にzero-I/O removalを実行し、中断したRepository commandを
その後ろへ1回だけrequeueする。Repeated disableはqueued/active barrierへjoinし、Global enabled flag、consent、
nonempty graph、accepted root context、scan/enable commandがない場合はRepository workにかかわらずno-opとする。
各scan jobはcurrent session-wide generationから開始し、unscanned sourceを残りのshared file/byte/
diagnostic budget内でcarryし、replacementを別に構築する。Completeまたはbounded partial resultだけを次
generationとしてatomic commitし、全source graphをrekeyして全file ID、comparison、revealをinvalidateする。
Planとshared contract記載のlimitをenforceする。

**理由**: Global serializationとatomic session generationはlost updateとold/new result混在を防ぎ、reveal
cleanupを観測可能にする。Fatal attemptはbootstrap 0を含むprior generationを変更せず、cap対象out-of-generation session
diagnostic channelを使う。FatalなGlobal enable/rescanはexact consent、accepted boundary、root context、prior
graphを保持し、明示retry/disableを可能にする。30秒hard deadlineはhangを防ぎ、performance acceptance targetは10秒のままにする。1 file 1 MiB、合計32 MiBは
通常のcustomization file 500件を無制限に保持せず扱える。Per-file mask-output capは一部だけscanしたsuffixを
返さずfail closedとし、kill可能なV8 limit付きworkerでsync parser time/tree amplificationを制限する。
Source comparisonは1 file 20,000行と5,000 ms Monaco computation timeoutで別に制限し、cap到達またはtimeoutしてもfull masked
side-by-side viewとdiagnosticを提供してcomparison不能にしない。

**検討した代案**:

- Automatic watch/rescanはFR-030が要求しないimplicit readとreveal-state raceを作るため不採用。
- Active resultのincremental mutationはconsumerがgeneration混在を観測するため不採用。
- Per-source commitのconcurrent実行は、単一generation numberとgeneration-scoped IDにconflict-proneな
  commit-time rebaseを必要とするため不採用。
- Unlimited scan、parse、relationship、comparison workはuntrusted repositoryに対して安全でないため不採用。

## 10. 検証戦略

**決定**: Vendor conformance fixtureとnegative near-missに加え、link、race、encoding、limit、secret、
import、executable declaration、malformed formatのadversarial fixtureを保守する。Pure recognizer/parser/
masker、HTTP contract、source boundary integration、pack済み`npx`、100k/500 performance case、4つの
Playwright user story、axeとkeyboard/manual checkによるWCAG 2.2 AAをtestする。4つのregistry fixture suiteは
全behavior/rule/strategy/source ID、相互evidence link、正確なsection anchor、英日parity、Inspector matcher
registryだけがreadを認可できることをvalidateする。Matcher fixtureは`./`なしのRepository selectorとbare
`**/`を拒否し、exact/direct-child/explicit descendant inventoryを区別し、`./**/`がvendor traversal factを
satisfiedにしないことを証明する。Targeted regression fixtureはCopilotの別々のVS Code/CLI/Cloud lookup表、
exact launch `cwd`だけのClaude project settings、non-recursiveなCodex rule directory、plugin activation対
authored manifest inventory、FR-015からFR-018外へのGlobal read 0件を扱う。macOS、Linux、Windowsでpure Node.js
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

**理由**: 憲章はpassing testを証明ではなく証拠とするため、objective automationにfull-diff review、
manual accessibility check、documentation parity check、release tarball inspectionを組み合わせる。

**検討した代案**:

- Snapshot-only testはnegative security behaviorを証明しないため不採用。
- Unit/contract coverageなしのbrowser testは遅くfailureの特定が難しいため不採用。
- Coverage percentageだけではnamed boundary/non-execution invariantを示せないため不採用。
