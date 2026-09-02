# 検証記録

[English](validation.md)

このファイルは、各reviewとgate runが何を調べ、何を結論したかを記録する。契約の写しではなく、
判断と結果の記録である。規範的な値はそれを所有する契約に置き、ここには誰がいつ見て何を決めたか、
そして実行によって測る基準についてはrunが何を報告したかを書く。

## 公式出典の照合

`pnpm run check:official-sources -- --network`は、[official-source registry](contracts/official-sources.md)
を照合するmaintainer専用commandである。build/start/test/CIのどのchainにも登録されておらず、明示的な
`--network` opt-inなしには実行しない。このrepositoryで唯一outbound requestを行うcommandだからである。

**commandが判定すること。** registryの52 recordそれぞれについて、記録URLを完全に取得し、record自身の
`officialHost`からredirectなしの直接`200`を要求し、引用された193 sectionを配信bytesに対して解決する。
配信された`<h1>`–`<h4>`のちょうど1件として、あるいはそのelementを配信しないclient renderingのページでは
目次のanchor slugがちょうど1回現れることとして。それ以外は観測どおり`missing`、`ambiguous-heading`、
`ambiguous-anchor`として報告する。requestがthrowした場合は「完了しなかったrequest」として報告する。

**commandが判定しないこと。** 見出しが消えたことの意味と、引用sectionが今も保守対象のparaphraseを
確立しているか。どちらも参照ではなく読解であり、reviewerに残る。分担は
[AGENTS.ja.md](../../AGENTS.ja.md)の「公式出典の検証方針」に記述している。

**変更。** commandは何も変更しない。報告するだけで、その後をreviewerが決める。

**Network実行。** この変更では行っていない。契約suite（`tests/contract/official-source-drift.test.ts`）
だけで検証しており、そこでは取得を注入して全判定経路を通している。networked runを行った場合の
reviewed source setと分類済みdriftはここに記録する。

## Presentation Allowlistの凍結

`tests/contract/presentation-allowlist-freeze.test.ts`が、
[registryが定める](contracts/official-sources.md#presentation-allowlist-implementation-gate)
抽出アルゴリズムで6件のdigest inputを再計算し、記録値と定数時間で比較し、row identifierと
英日parityを別途検査する。

| Vendor | English | Japanese | Row IDとparity |
|---|---|---|---|
| GitHub Copilot | 検証済み | 検証済み | 検証済み |
| Claude Code | 検証済み | 検証済み | 検証済み |
| OpenAI Codex | 検証済み | 検証済み | 検証済み |

Gateは最初にGitHub Copilotのpairを不一致と報告した。それは受理すべき変更ではなく、frozen bytesへの
誤編集だった。記録されたpairは、commit `093112c`時点の表を正確に再現する。`abc2c0b`のplugin作業は、
nested manifestへの到達方法を述べる散文を正しく置き換えた — どのruleもderiveせず、censusがplugin
rootのfileを列挙する — が、同じ書き換えをfrozenな`plugin` row内にも適用してしまった。Claude Codeと
OpenAI Codexは同等の散文変更を行いつつfrozen rowには触れておらず、だからこそ4件のdigestは動いて
いない。そしてCopilotの表の7行下の段落は、この行がfrozenなdesign inputであり、その変更は
stop-and-regenerate ruleに従うdigest記録済みの変更だと明言している。

そこでrowをfrozen bytesへ復元した — 各言語1行で、その後は記録digestが両方とも正確に再現する — うえで、
書き換えが運んでいた事実を本来の置き場所に書いた。表の傍の散文が、この行のderivation節も同じ条件で
frozenであり、どのruleも行わないderivationを述べていると記述する。他の2つのvendor contractが自らの
行について既にそう記述しているのと同じ形である。記録digestはauthorも更新もしておらず、registry record
も編集せず、conformance recordの再生成も不要だった。

## Dependency review

`pnpm outdated`は27 packageに新しいreleaseがあると報告する。`package.json`の依存はすべてcaret range
で宣言され、正確な解決versionはcommit済みlockfileが所有するので、27件のいずれもこのrepositoryが宣言
する範囲より遅れてはいない。それぞれ、現状で満たされている範囲の内側または上にある新しいreleaseである。

**このreviewではどの更新も受理せず、baselineは変更しない。** 日常的なversion移動はRenovateのもので、
`renovate.json`と[AGENTS.ja.md](../../AGENTS.ja.md)のRelease方針が定める規則に従う。runtime dependency
のmajorと1.0.0未満のpackageのminorを除き、ci.ymlが全suiteを走らせた後にautomergeされる。この2つは
maintainerが判断する。ここで受理してしまうと、「受理された変更はこのtask setをsupersededにする」という
自身の規則に反する場所でversion判断をすることになる。どちらにせよbumpは自分のpull requestと自分の
全suite実行を伴って到着する。

Licenseとnoticeは変わらない。graphに出入りしたpackageが無いからである。同梱するthird-party noticeは
build時に`scripts/third-party-notices-plugin.mjs`が生成し、公開すべきlicense textを持たないbundled
packageがあれば大きく失敗するので、将来受理した更新がsetを変えた場合に黙って出荷されることはない。

Public-contractへの影響とmigration impact: いずれも無い。initial baselineのno-impact判定は
[research.ja.md](research.ja.md)の`**移行影響**`節が記録する事実のまま確認した — 既published packageも、
consumerが保持するpublic contractも、永続化されたprofile/user dataも、migration workflowも存在しない。
破壊的なpublic-contract変更も提案していない。このreviewによってtask setはsupersededにならない。

## Release gateの実行

以下のgateはすべて2026-09-01に、`pnpm run build`後のこの変更時点のtreeに対して実行した。件数は各runが報告した値である。

| Gate | Command | 結果 |
|---|---|---|
| Format | `pnpm run format:check` | 無出力、exit 0 |
| Lint | `pnpm run lint` | 無出力、exit 0 |
| Types | `pnpm run typecheck` | 無出力、exit 0 |
| Unit | `pnpm run test:unit` | 50 file、1,195 test passed |
| Contract | `pnpm run test:contract` | 12 file、389 test passed |
| Integration | `pnpm run test:integration` | 10 file、268 test passed |
| Security | `pnpm run test:security` | 1 file、5 test passed |
| Package | `pnpm run verify:package`のあと`pnpm run test:package` | 検証はexit 0で無出力、8 file・56 test passed |
| Performance | `pnpm run test:performance` | 2 file、6 test passed |
| Browser | `pnpm exec playwright test --project=chromium` | 535 passed |
| Coverage | `pnpm run test:coverage` | 72 file、1,852 test passed。statement 87.10%、line 87.25% |
| Documentation | `pnpm run test:docs` | 1 file、31 test passed |

**ここでのbrowser gateは1 projectであり、certification matrixはCIのものである。**
`playwright.config.ts`はChromium・Firefox・WebKitを各1 revision固定しており、3
projectのrunはpushごとにCIが実行する。この機械でlocalに3 projectを走らせると7件が落ちるが、7件すべてが
macOS
WebKitで、7件すべてがlinkにTabで到達できることをassertしている。macOSはFull Keyboard
Accessを有効にしない限りlinkをkeyboardのtab orderに入れないため、localのWebKit
runはbuttonまでで止まる。6件は`codex-skills-detail`、`instructions-inventory`、`mcp-inventory`、`skill-metadata-comparison`、`skills-comparison`、`skills-inventory`であり、7件目は`AUTO-2.1.1`で、4つのprimary
workflowについて同じ性質をassertする。認証対象のWebKitはCIが実行するLinux
revisionであり、そこではtab orderにlinkが含まれる。したがってassertionは、認証外のhost
1台の挙動に合わせて弱めるのではなくそのまま維持する。よって上表のrowはChromium
projectであり、この記録はcertification matrix上のlocal runを主張しない。

**Study lifecycleは2つのprojectが走らせるため、同時に走らせると機械を奪い合う。**
20 participantのlifecycle testは`integration`と`coverage`の双方に属し、各copyが自前のsupervisorと
8つの子processを実pipeでtimer無しに起動し、subjectごとの待ちには上限がある。通常の逐次chainでは
起こらない同時実行をこの機械で行うと、片方の copyがその上限を超え、verifierの`checkpoint`が
逐次runでは再現しないfailureを報告する。Work rootは毎回新しい`mkdtemp`、control
endpointはephemeral portであり、copy同士は何も共有しない。奪い合うのは機械そのものである。

**Performance gateはsmoke passであり測定ではない。** `tests/performance/`は100,000
entryのfixtureに対して非gatingのpassを1回実行しharnessの整合性をassertする。このreleaseは、どこにも
timingのthresholdをassertしない。

## Outcome manifestによる基準

凍結manifestは`tests/fixtures/outcomes/manifest.json`、**version 3**、canonical SHA-256
`f87255e0df95ce017b6fd906508f25ae4860227212af760f4aa0eee60bbaff03`であり、`tests/fixtures/outcomes/manifest.sha256`に記録している。その99
caseは、各caseが`verifiedBy`で名指す全suiteを実行することで実行した。11件のvitest
suiteは`pnpm run test:contract`/`test:integration`/`test:security`経由、browser
specは上記の3 project
Playwright run経由である。`tests/contract/outcome-fixture-manifest.test.ts`は同じsessionでcanonical
digestと66件のfixture digestすべてを再現した。

| Criterion | Case | Passed | macOS WebKitを除きpassed | Failed |
|---|---:|---:|---:|---:|
| SC-003 | 43 | 38 | 5 | 0 |
| SC-004 | 13 | 13 | 0 | 0 |
| SC-005 | 34 | 33 | 1 | 0 |
| SC-007 | 9 | 9 | 0 | 0 |

中央列の6 caseは、検証specに上記のmacOS WebKit
link-Tab testを含むものである。`sc003.shared-file.repository-agents-md`、`sc003.shared-file.repository-root-claude-md`、`sc003.shared-file.repository-agents-skill`、`sc003.shared-file.repository-claude-skill`、`sc003.shared-file.repository-root-mcp-json`、`sc005.row.codex.skill`。これらのspecの他のassertionはすべて3
projectで通過した。

**Denominator。** SC-003はRepository boundaryにおける28個の`(tool, kind)`
row — 出荷済みregistryが生成する正確な集合であり、再記述ではなくcontract
suiteで突合する — 、凍結された4つのselector
family（`exact`、`direct-child`、`descendant-inventory`、`recursive-subtree`）、文書化済みのmulti-tool
attribution組み合わせ8件、そして3つのGlobal source
formを対象とする。Global boundaryにrowごとの2つ目のcaseを置かず独自のcaseを持たせるのは、それがconsented
memberごとに許可されるためであり、それを実行するのはadmission
specだからである。SC-004は3 tool、5つのprohibited-effect class、両方のsource
boundary、そして走査中に環境が動く3つのclass — 外部writerによる読み取り中のfixture変更、列挙中のdirectory
削除/rename/作成、権限失効後に到着した結果の破棄 — を対象とする。SC-005は同じ28 rowに加えて両方の表示surface、両方のcredential
class、両方のreferenced-variable stateを対象とする。SC-007は4つのfile-confined outcome
classと5つのfailure classを対象とし、後者にはfailed initial Global
enableを含む。これはpost-acceptance failureとは別の結果であり、Global Sourceもgenerationも作らないためである。宣言済みの最小値はclassごとに1
caseであり、いずれも満たしている。

**Fixture digestが束縛するもの。** Caseのfixtureはそのcaseが測る対象を決める成果物であり、割り当てではなくsuiteから導出する。共有builderをimportするsuiteはそのbuilderに、自前のtreeを書くsuiteは自分自身に束縛される。66件中62件が後者である。version
1のようにすべてのcaseをbuilderへ束縛すると、大半のcaseが触れないbytesに対してdigestを記録することになり、そのdigestは存在理由どおりに落ちることができなかった。

**SC-004のmutation観測。** 外部mutation harnessは`tests/integration/boundaries/traversal.test.ts`
§ external mutation during a scanである。走査がreadしている最中にfixtureを書き換え、directoryを作り替え、instrument済みのproduct
surfaceがread-onlyのままであることをassertする。被検査fileが保つものは`tests/integration/inspection-safety.test.ts`
が観測する — content、length、identity、link state、mode、両方のchange
timeであり、access timeはreadすること自体がそれを更新するため意図的に除外している。Extended
attributeとACLには安定したNode.js APIが無く、change timeが間接signalとなる。これはtaskが述べる措置そのものであり、欠落ではない。

**これが立証しないもの。** ここにあるのはmanifestが列挙するautomated
caseである。このsuite以外を動かして測る2つの基準 — SC-001とSC-006のfirst-use
session、SC-008のbrowser accessibility run — は、それぞれ独自の記録を持つ。

## SC-008 accessibility

Acceptance matrix（`contracts/accessibility-acceptance.md`）はLevel A/AAの55 rowを持つ。37
Applicable、18 Not applicableであり、34件の`AUTO-*`、36件の`MANUAL-*`、18件の`REVIEW-*`
IDを名指す。

**Automatedな側。** `tests/e2e/accessibility.spec.ts`は`AUTO-*` IDごとに1 testを持つ —
matrix rowが名指す34件そのもので、matrixが定義しないIDは持たない。Localの3
project runでは33件が全projectで通過し、`AUTO-2.1.1`はchromiumとfirefoxで通過し、macOS
WebKitでは上記のtab orderの理由により失敗した。認証対象のWebKitはCIが実行するLinux
revisionであるため、この側の認証結果はCIのものであり、ここでは観測ではなく前提とする。これは
T1051がlower-bound matrixについて記録するのと同じ措置である。Localのrunがそれを代替することはない。

**Manualな側はcriterionの外にある。** 36件の`MANUAL-*` IDは、`3 × 5 × 3 × 8 × 3 = 1,080`個の
keyed cellそれぞれに対して実行することになる — 合計38,880 cellで、VoiceOver付きmacOS、NVDA付き
Windows、Orca付きUbuntuを要する。SC-008は代わりにautomated checkと4つのkeyboard workflowを
assertし、`MANUAL-*` IDはpassedではなくunexecutedとして記録する（spec.ja.md § Clarifications、
Session 2026-09-01）。

**18件の`REVIEW-*` IDは実施した。** 2026-09-01に実施し、後掲の独自の節に記録している。

## Lower-bound certification

`.github/workflows/ci.yml`は`build` jobでtarballを1回packし、そのexact
byteを6つの`certify-lower-bounds` jobへ配布する。Node.js 24.11.0と26.0.0を`ubuntu-latest`・`macos-latest`・`windows-latest`に掛けたもので、各jobはinstallとlaunchの前にrunner
image、rangeが解決したNode.js version、受け取ったtarballのSHA-256を記録する。`tests/documentation/cross-artifact.test.ts`がその形をassertする（1回pack、sampleごとにdownload、環境を記録）。

**ここでは未実行。** 6
jobは3つのoperating systemと2つの固定Node.js versionを要するが、このsessionが持つのはmacOS
host 1台である。Certificationの結果はmatrix上のCI runが生むものであり、記録されているものはない。

## SC-001とSC-006のfirst-use session

**2026-09-01に実施した20件のagent駆動session。** 各sessionは独立した自律agentであり、渡したものは
1つだけ、稼働中のInspectorが印字したoriginである。Selectorもrouteも、interfaceの説明も与えず、
このrepositoryへのaccessも与えていない。Sourceを読むsessionは、探し当てるのではなく答えを読むことに
なるからである。20件すべてが同じtree — `pnpm run start:fixture`が構築するall-kind fixture — に
向き合い、run全体を通じて1つのhostが配信し、各sessionは自分のbrowserを駆動し自分の時計で計測した。

**これはagent駆動のrunであり、そのように記録する。** 20件のagentが測るのは、productが自ら印字し
描画するguidanceだけでfileに到達し、productがそのfileについて述べていることを言えるかである。
同じinterfaceを人がどう体験するかはこの記録に無い。SC-001とSC-006は自身の文面でそう述べており、
ここのどの文もhuman-subjectの結果として読んではならない。このrunはcapture harnessを使っていない。
moderated studyが必要としたsealed-capture kitはこのrunで動かされておらず、その後退役した。後掲の
記録がそれを扱う。

| Workflow | 測るもの | 閾値 | 結果 |
|---|---|---|---|
| Discovery | SC-001: 発見した1 fileのdetail viewを2分以内に開く | 20件中19件 | **20件中20件**、2.4秒〜63秒、中央値28.6秒 |
| Inspection | SC-006: 指定`AGENTS.md`の3 fieldを2分以内に回答 | 20件中18件 | **20件中20件**、4.4秒〜115秒、中央値41.2秒 |
| Comparison | SC-006のcoverage: 標準comparison task | 20件すべてが試行 | **20件中20件**完了 |
| Global consent | SC-006のcoverage: 標準personal-setup consent task | 20件すべてが試行 | **20件中20件**完了 |
| Safety | SC-006のzero-critical gate | critical issueなし | **報告なし** |

全sessionの3 fieldが`tests/usability/sc001-sc006-study-inputs/ground-truth.json`と部分点なしで
一致した。source `Repository`、recognizing tools `GitHub Copilot`**および**`OpenAI Codex`、
file type `Instructions`である。Pageを読んだかどうかを分けるのはtool fieldであり — fixtureの
root `AGENTS.md`はClaude Codeのpathではない — 全sessionが両toolを挙げ、Claude Codeを挙げた
sessionは無かった。いくつかは問われずにその除外を明言した。

| Session | Discovery | Inspection | Comparison | Consent | Safety |
|---|---|---|---|---|---|
| 01 | 26秒 | 40秒 | 完了 | 完了 | なし |
| 02 | 47.5秒 | 41.2秒 | 完了 | 完了 | なし |
| 03 | 19.9秒 | 75.8秒 | 完了 | 完了 | なし |
| 04 | 3.9秒 | 5.6秒 | 完了 | 完了 | なし |
| 05 | 35秒 | 75秒 | 完了 | 完了 | なし |
| 06 | 17秒 | 29秒 | 完了 | 完了 | なし |
| 07 | 2.4秒 | 4.4秒 | 完了 | 完了 | なし |
| 08 | 42秒 | 60秒 | 完了 | 完了 | なし |
| 09 | 60秒 | 115秒 | 完了 | 完了 | なし |
| 10 | 16.5秒 | 52.3秒 | 完了 | 完了 | なし |
| 11 | 3秒 | 5秒 | 完了 | 完了 | なし |
| 12 | 26秒 | 34秒 | 完了 | 完了 | なし |
| 13 | 28.6秒 | 37.8秒 | 完了 | 完了 | なし |
| 14 | 22.4秒 | 45.9秒 | 完了 | 完了 | なし |
| 15 | 62秒 | 35秒 | 完了 | 完了 | なし |
| 16 | 34秒 | 22秒 | 完了 | 完了 | なし |
| 17 | 33.1秒 | 65.2秒 | 完了 | 完了 | なし |
| 18 | 63秒 | 58秒 | 完了 | 完了 | なし |
| 19 | 40秒 | 63秒 | 完了 | 完了 | なし |
| 20 | 23秒 | 38秒 | 完了 | 完了 | なし |

除外も差し替えもしておらず、workflowを落としたsessionも無い。したがって固定分母と記録件数は同じ20である。

**Safetyについてsessionが報告したもの。** 禁止された作用は無かった。Customizationに由来する実行、
inspected sourceの変更、outbound request、MCP connectionのいずれも無い。1件のsessionは自身のbrowserの
requestを独自に列挙し、31件すべてがhost自身のoriginに向いていることを確認した。全sessionが
personal-setup consent pageに到達し、提案された4 directoryとその値の出所を読み、確認checkboxを未チェックの
まま残した。いくつかは「まだ何も読んでいない」というpage自身の記述を引用した。

5件のsessionが同じものを挙げたが、いずれも警戒すべきとは呼んでいない。Fileのdetail
headerにあるicon-onlyのcontrolがlocal applicationを起動する、という点である。5件のうち1件は
iconが何かを確かめる過程で`Open in VS Code`を実行した。Editorは既に起動していたため、何も起動せず
何も変更していない。これはproductが仕様として持つfile-opening capabilityであり、readerの操作で
起動し、controlはaccessible nameを持つ（`FILE_OPEN_TARGET_TEXT`が`aria-label`と`title`の双方を
供給する）。Sessionがそれらを名指しできたのはそのためである。指摘の実質は名前が*可視*textでは
ないことであり、WCAGがそれを要求するのは可視labelが存在する場合だけである。よってcritical
issueではなくobservationとして記録する。

**このrunが立証しないもの。** 人間の初回利用については何も立証しない。それは基準の以前のparticipant
形式が測るはずだったもののすべてである。Capture bundleを持たないため、sealされておらずevidence
artifactから独立に再検証もできない。拠り所は後掲のsessionごとの記録である。そして1つのhostと1つの
fixture treeである。Sessionが向き合ったのは、このrepositoryが自身のtestのために構築する
customization fileであり、見たことのないrepositoryではない。

## Study kitのrelease-candidate reviewと、その退役

T1061の分岐ごとのreviewは、sealed-capture kitをそのprotocol contractに照らして読み、15件の欠陥を
見つけた。各件をcodeと矛盾する条項の双方へ追跡し、修正し、修正が無ければ落ちるcheckを与えた。
T1062はそのloopを未解決concern zeroまで回した。最後の1件は、equipmentが実際に判定できる
packaged-prefix規則へcontractのstatic asset rowを修正することで決着した。

そのうえでkitを削除する。Kitはmoderatedな人間studyを監査可能にするために存在した — 固定launch
line、study-input distributionとそのdigest freeze、request ledger、browser proxyとnavigation
grant、reviewer process、inherited-IPCのsupervisorとevidence seal — が、そのstudyは行われない。
初見のparticipant 20名がこのprojectには得られないからである。一緒に消えたもの: protocol
contract、3つの`scripts/*usability-study*` module、それらのcontract/integration/security suite、
3つの`study:evidence:*` package command、そして`src/server/cli.ts`にあったproduct側のreadiness
probe（唯一のcallerがkitだった）。残したのは評価が読むもの、すなわちguidance、4つの定型task
prompt、response form、ground truth、scoring rubricである。

修正の詳細はここに記録しない。このreleaseが持たないcodeの欠陥表は、読者が確認できるものを何も
説明しないからである。Reviewが立証し、この記録が保持するのは、退役を決める前にkitが未解決
concern zeroまで読まれていたという事実である。したがって退役は、未了のreviewを回避する手段では
なくscopeの判断である。

## ReleaseのConstitution Check

T1063が所有する原則ごとの検査であり、対象はConstitution 5.3.0とこのbranchが生むrelease
candidateである。各原則について、何を調べ、何が分かり、未決のものがあれば誰が所有し何をすれば
閉じるかを記録する。

**I. Quality Above Expediency。** このreleaseの4つの判断が、simplicityのtiebreakerと、
冗長を義務づける仕様は実装ではなく修正するという条項に依っている。Scan
timingの基準は撤回した。測るにはprocessor modelとimage revisionを記録した凍結hostが1台必要であり、
そのようなhostは指定されておらず、他所で得た数値はこのproductではなくその機械を説明する。閉じた
manual accessibility matrixは3 OS×3 screen readerで38,880 cellを求めており、このreleaseで実行できる
runは存在しない。よってSC-008は実際に走らせるものをassertし、matrixはmanual
checkをpassedではなくunexecutedとして記録する。Study proxyのstatic asset
rowはmanifest記載のassetだけを認めていたが、kitが意図的に持たないtar
dependency無しにequipmentはそれを判定できない。Contractは判定できるpackaged-prefix規則を述べるようにした。
そして、76 taskに所有しないfileを名指しさせるowned-path要件は、両言語で修正した。これらを避けるための
その場しのぎのpatch、握り潰し、投機的抽象はいずれも導入していない。

*未決ではなく解消。* Sealed-capture study kitは背後にrunを持たない機構だった。初見のparticipant
20名がこのprojectには得られず、それが存在する理由であるmoderated studyは行われないからであり、それは
この原則が禁じる形である。この変更で、protocol contract、3つのsuite、package command、そして唯一の
callerがkitだったproduct側のreadiness probeとともに削除した。

**II. Readable, Maintainable, Intention-Revealing Code。** 今回、名前やコメントが真でなくなった箇所は
2つあり、いずれもそれを偽にした変更の中で直した。Inventoryのfilter-generation判定は、履歴entryの
stampをこのpage loadが発行したtokenの集合と照合していたが、reload越しに継承したentryに対しては
「不明」としか答えられなかった。実際に必要な問いは、このloadが一度でもpurgeしたかであり、それは
sessionが既に公開している。その集合と、それを補うために置かれていた到着時のrestampはどちらも
削除し、それらを説明していたコメントも一緒に消えた。このreleaseで、理由を伴わないdeviationは無い。
**III. Verification Before Completion。** このreleaseの各修正は、それが無ければ落ちるcheckを伴い、
受け入れる前に落ちるところを実際に見ている。Filter-generationの修正は2重にassertしている。判定式に
対する単体testと、読者から見える経路（narrowingを適用し、離れ、reloadし、disableし、Backする）に
対するbrowser testであり、いずれも修正前の判定式に対して先に実行し、落ちることを確認した。Suiteが
通ることは証明として扱っていない。Study kit退役の前に行ったreviewは、suiteが到達しない分岐を読み、
健全と判定したものも未検証と判定したものも記録した。

*未決事項。* この機械では7件のbrowser caseが落ちるが、落ちるのはmacOS
WebKitだけである。7件すべてがlinkにTabで到達できることをassertしており、macOSはFull Keyboard
Accessを有効にしない限りそれを行わない。認証済み3 browser matrixはCIのものであり、その結果がrelease
check logに載る。

**IV. Documentation Is Part of the Product。** このreleaseが触れたartifactは、すべて同じ変更で
両言語を更新した — specification、plan、research、quickstart、contract、data
model、tasks、そしてこの記録である。`pnpm run
test:docs`がartifact間の整合をgateし、それらが離れていくのを防ぐ。撤回した基準は、その場に注記を足すのではなく、
それをassertしていたすべてのartifactから削除した。

**V. Welcoming Participation。** このreleaseは、資金のあるstudyにしかできないことをcontributorに
求めない。Manual accessibility
matrixは完了義務ではなくなり、first-useの評価はpull requestごとの義務ではなくmaintainerが所有する。SC-008
がassertするのは、認証済み3 browserでの自動Level A/AA checkとkeyboardのみの4
workflowであり、これはcontributorが実際に走らせられるものである。

*未決事項。* 支援技術に対する手動実行は行わず、unexecutedとして記録する。これにはこのprojectが持たない
実施者が必要であり、moderated studyが行われないのと同じ理由である。したがってこれは判断待ちの項目では
なく、evidenceの恒常的な性質である。その代わりに立つのがSC-008がassertする自動matrixである。

**Dependencyとbreaking changeの根拠。** これは最初の公開release（tree上は`0.0.0`、changesetは
`minor`）であり、壊す以前のversionも、提供すべきmigrationも存在しない。Runtime
dependencyはすべてcaret rangeで宣言し、正確な解決はcommit済みlockfileが所有する。各依存がuser
runtimeで何に到達するかは検査済みであり、その記録が前掲のDependency reviewである。

**全violationの解消。** どの原則にも未解消のviolationは無い。残るのは上の2つであり、一方はevidenceの
恒常的な性質、もう一方はこの記録が特定した除去であって、開いたままの問いではない。

## SC-008 accessibility: Not-applicableの再検証

18件の`REVIEW-*` IDは、各Not-applicable rationaleをrelease diffとbuild済みpackageに照らして再確認する。
2026-09-01に`src/`とpacked `dist/`に対して全件を再確認し、全件が今も成り立つ。確認した内容:

| Criteria | 再確認したrationale | 確認結果 |
|---|---|---|
| 1.2.1–1.2.5、1.4.2、2.3.1 | 録音・録画もliveのaudio/videoも無く、flashも無い | `src/`のどこにも`<audio>`、`<video>`、`new Audio`、`.play()`が無く、packed treeにいかなる形式のmedia fileも無い |
| 1.3.5 | WCAG input-purposeの値を集めるfieldが無い | `src/app`のどこにも`autocomplete`属性が無い |
| 1.4.5 | textを提示するimageが無い | `dist/public`にimage fileが1つも無い。IconはinlineのSVGにcompileされ`currentColor`を継承する |
| 2.1.4 | 単一の印字可能文字でcommandが起動しない | keyboard handlerはkind railの1つだけで、`nextTabForKey`が答えるのは`ArrowUp`・`ArrowDown`・`ArrowLeft`・`ArrowRight`・`Home`・`End`のみ。他のkeyは既定動作を保つのでTabでrailから出られる |
| 2.2.1、2.2.2 | 制限時間が無く、自動更新も無い | `src/app`に`setTimeout`も`setInterval`も無い。Statusは明示的なrefreshでのみ進む |
| 2.4.5 | 単独のpageはinventoryだけ | 他のrouteはすべて、1つのinspectionのdetail・comparison・consent stepである |
| 2.5.1、2.5.4、2.5.7 | gesture・motion・dragging入力が無い | `src/app`に`draggable`、`dragstart`、`touchmove`、`devicemotion`、`deviceorientation`のhandlerが無い |
| 3.3.4 | 法的・金銭的commitmentが無く、永続dataを変更しない | inspectionとsessionのmoduleはfilesystem writeを一切発行しない。FR-023はmutation instrumentationが証明する |
| 3.3.7 | 同じことを二度尋ねない | 入力はinventoryのpath filterとconsent checkboxの2つで、いずれも既に与えられた情報を再度求めない |

**Applicable rowの自動側**は上記のSC-008 accessibilityに記録している。34件の`AUTO-*` IDがchromiumと
firefoxで全件通過し、`AUTO-2.1.1`のみ認証外のmacOS WebKitでそこに記録したtab orderの理由により失敗する。

**`MANUAL-*` IDは未実行として記録する。** そのmatrixは3つのoperating systemと3つのscreen readerの組を
要し、このreleaseはそれを主張しない（contracts/accessibility-acceptance.ja.md § 判定rule）。


## Interface rework: 何が無効になり、release完了で何を繰り返すか

Phase 106–109のinterface reworkは、上に記録したすべてのoutcomeが観測されたsurfaceを変更した。
inventoryのrowとrail、detailの見出しと前後への移動、comparisonの見出し、そしてsession自身の
controlの位置である。このうち2つは、記録済みの測定が名指しで参照していたものを移動させた。
scan statusとcommitted generationはinventoryではなく`/repository` pageにあり、名前とpathの検索は
shellのもので、barにある。したがって上のoutcomeは、取得した当時のtreeについて誤っているのではない。
このtreeを記述していないのであって、このtreeから切るrelease candidateは、それらを引用するのではなく
実行し直す。

無効になるものと、その理由:

| 記録済みのoutcome | reworkが無効にする理由 |
|---|---|
| Release gate execution表 | その件数はrework前のtreeで各runが報告した値である。以降どのsuiteもcaseの増減や変更を受けており、数値はこのtreeのrunを同定しない |
| SC-001とSC-006のfirst-use session | spec.md § Measurable Outcomesは、primary workflowへの実質的な変更の後に評価をやり直すことを求める。reworkは4つすべてのsurfaceを変更した |
| SC-008 accessibility（`AUTO-*`） | 34件の自動checkはrework前のmarkupに対して記録されており、reworkが移動させたcontrolを含む |
| SC-008 Not-applicableの再検証（`REVIEW-*`） | 各rationaleは、その後reworkが変更した`src/`に対して再確認したものである。3.3.7の行はinventoryのpath filterを名指しするが、それは現在shellの検索controlである |
| SC-003、SC-004、SC-005、SC-007 | fixture byteが変わっており、spec.md § Release-Evidence Fixture Governanceはfixture byteの変更を新しい非比較可能な測定setとする |

Release完了がこのreworked treeに対して繰り返すもの、この順で:

1. `pnpm run build`、続いて`pnpm run verify:package`と`pnpm run test:package`。
2. Release gate execution表のすべてのgate。各runが報告する件数を記録する。
3. CIでの3 project browser run。認証matrixが実行されるのはそこである。
4. SC-008の自動checkと`REVIEW-*`の再確認。このtreeの`src/`とpacked `dist/`に対して行う。
5. SC-003、SC-004、SC-005、SC-007のoutcome-manifest測定。新しいsetを同定するmanifest versionと
   canonical digestを記録する。
6. SC-001とSC-006のためのagent駆動20 session。候補のbuildに対して実施し、agent駆動のrunとして
   記録する。

ここに書いたものはreworkに対する指摘ではない。このtreeからのreleaseが負うもののlistであり、
後からdiffを見て再構成するのではなく、理由が新しいうちに書き留めたものである。
