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

以下のgateはすべて2026-09-03に、`pnpm run build`後のこの変更時点のtreeに対して実行した。件数は各runが報告した値である。

| Gate | Command | 結果 |
|---|---|---|
| Format | `pnpm run format:check` | 無出力、exit 0 |
| Lint | `pnpm run lint` | 無出力、exit 0 |
| Types | `pnpm run typecheck` | 無出力、exit 0 |
| Unit | `pnpm run test:unit` | 52 file、1,211 test passed |
| Contract | `pnpm run test:contract` | 12 file、391 test passed |
| Integration | `pnpm run test:integration` | 10 file、268 test passed |
| Security | `pnpm run test:security` | 1 file、5 test passed |
| Package | `pnpm run verify:package`のあと`pnpm run test:package` | 検証はexit 0で無出力、8 file・56 test passed |
| Performance | `pnpm run test:performance` | 2 file、6 test passed |
| Browser | `pnpm exec playwright test --project=chromium` | 561 passed |
| Coverage | `pnpm run test:coverage` | 74 file、1,870 test passed。statement 86.25%、line 86.57% |
| Documentation | `pnpm run test:docs` | 1 file、41 test passed |

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

**このtreeの認証されたbrowser結果は、そのcommit自身に対するCI runである。** 3つのpinned
revisionにわたるものであり、ここでは再現していない。上表のrowはhost 1台のproject
1つであって、local runはそのどれの代わりにもならない。判断はreworkが始まったtreeから変わって
いない。変わったのは、認証runがどのcommitに対するものかである。

**Study lifecycleは2つのprojectが走らせるため、同時に走らせると機械を奪い合う。**
20 participantのlifecycle testは`integration`と`coverage`の双方に属し、各copyが自前のsupervisorと
8つの子processを実pipeでtimer無しに起動し、subjectごとの待ちには上限がある。通常の逐次chainでは
起こらない同時実行をこの機械で行うと、片方の copyがその上限を超え、verifierの`checkpoint`が
逐次runでは再現しないfailureを報告する。Work rootは毎回新しい`mkdtemp`、control
endpointはephemeral portであり、copy同士は何も共有しない。奪い合うのは機械そのものである。

**Coverageの百分率はあるrunの値であり、定数ではない。** このtreeに対する2回のrunは、6,848 statement
中5,907と5,909のcovered statement — 86.25%と86.28% — を報告し、file 74件・test 1,870件のpassは
どちらも同じだった。これらにthresholdをassertしている箇所はどこにも無く、上の行は後のrunである。

**Performance gateはsmoke passであり測定ではない。** `tests/performance/`は100,000
entryのfixtureに対して非gatingのpassを1回実行しharnessの整合性をassertする。このreleaseは、どこにも
timingのthresholdをassertしない。

## Outcome manifestによる基準

凍結manifestは`tests/fixtures/outcomes/manifest.json`、**version 3**、canonical SHA-256
`23ebf9ca12d61b95e7f4427c645709a5e57689194c0e74b2dee8d4e847d28c4a`であり、`tests/fixtures/outcomes/manifest.sha256`に記録している。その99
caseは、各caseが`verifiedBy`で名指す全suiteを実行することで実行した。11件のvitest
suiteは`pnpm run test:contract`/`test:integration`/`test:security`経由、browser
specは上記の3 project
Playwright run経由である。`tests/contract/outcome-fixture-manifest.test.ts`は同じsessionでcanonical
digestと66件のfixture digestすべてを再現した。

このsetは、interface rework前に記録したsetとは比較できない。fixture byteが変わっており、spec.md
§ Release-Evidence Fixture Governanceはそれを新しい測定setとする。manifest versionは3のままである。
同governanceがincrementを要求するのはcase・required class・expected outcomeの変更であり、今回は
そのいずれでもない — 同じ4 criteriaにわたる同じ99件のcase IDで、required classごとの件数はすべて
非ゼロのままである。この実行のbrowser側は、このhostのChromium projectであった。3つのpinned
revisionはCIのものであり、上のbrowser gateがそれを記録している。

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

**18件の`REVIEW-*` IDは実施した。** 2026-09-03に実施し、後掲の独自の節に記録している。

## Lower-bound certification

`.github/workflows/ci.yml`は`build` jobでtarballを1回packし、そのexact
byteを6つの`certify-lower-bounds` jobへ配布する。Node.js 24.11.0と26.0.0を`ubuntu-latest`・`macos-latest`・`windows-latest`に掛けたもので、各jobはinstallとlaunchの前にrunner
image、rangeが解決したNode.js version、受け取ったtarballのSHA-256を記録する。`tests/documentation/cross-artifact.test.ts`がその形をassertする（1回pack、sampleごとにdownload、環境を記録）。

**ここでは未実行。** 6
jobは3つのoperating systemと2つの固定Node.js versionを要するが、このsessionが持つのはmacOS
host 1台である。Certificationの結果はmatrix上のCI runが生むものであり、記録されているものはない。

## SC-001とSC-006のfirst-use session

**2026-09-03に、この候補のbuildに対して実施した20件のagent駆動session。**（`pnpm run build`のあと、
`pnpm run start:fixture`が構築するall-kind fixtureを、run全体を通じて1つのhostが配信した。）各session
は独立した自律agentであり、taskのほかに渡したものは2つだけ — 稼働中のInspectorが印字したoriginと、
`tests/usability/sc001-sc006-study-inputs/guidance.md`の本文である。Selectorもrouteも、そのguideを
超えるinterfaceの説明も与えていない。各sessionは自分のbrowserを駆動し自分の時計で計測し、taskはその
guideの隣にある4つのprompt fileである。

**何を強制し、何を強制しなかったか。** このproductのsource、test、specification、fixture、document
を読むことは指示で禁じた。読むsessionは、探し当てるのではなく答えを読むことになるからである。ただし
機構としては阻止していない。sessionはbrowser binaryのあるこのworking treeからPlaywrightを実行した
ので、treeはsessionから到達可能だった。access自体が無いsessionより弱い保証であり、主張を弱める形で
そのまま記録する。

**このrunの2つの条件が数値に効いている。** 各sessionには固有のscratch directoryを与え、同時に走らせた
のは4件である。もう1つは、あるsessionが自分のクラッシュしたscriptの残骸を探すうちに、共有debugging
port経由で隣のsessionの生きたbrowserに接続しclose()を呼んだことである。その後の自己確認では対象の
pageとcontextは開いたままであり、当時走っていた3 sessionはすべて完走し4 taskすべてに回答した。
session 13以降は、自分が起動していないbrowserへの接続を禁じる指示を加えた — `kill`の既存の禁止が
守っていたものに対し、それを迂回した機構を同じ規則で塞いだ形である。

**consentの状態はserver側にあり、hostは共有である。** personal inspectionは無効の状態から始まるので、
最初に確認したsessionが以降のすべてのsessionに対してそれを有効にし、`Disable personal inspection`を
使ったsessionが再び無効に戻す。1件のsessionは両方を行った — 完了済みの読み取りに到着し、それを無効化し、
きれいな状態から手順をやり直してgate自体を確かめ、仕様どおり働いたと報告している。4件は未同意のpageに
出会い、2段階のgateを報告した — confirmationのcheckboxを入れて初めて`Inspect these directories`
buttonが現れる。別の2件は反対側から結果を見た。再読み込みの間にあるkindの件数が動き、`Personal setup`が
`Not inspected`に戻ったが、自分は何もしていない。2件ともそれを自分が起こしたものではなくserver側の状態
として読んだ。これはproductの条件ではなくharnessの条件である。1台のhostは、process毎に一度きりの
confirmationについて独立した20件のfirst useを保持できず、sessionを1つ持つ読み手はその状態を自分の
操作でしか変えない。

**これはagent駆動のrunであり、そのように記録する。** 20件のagentが測るのは、productが自ら印字し
描画するguidanceだけでfileに到達し、productがそのfileについて述べていることを言えるかである。
同じinterfaceを人がどう体験するかはこの記録に無い。SC-001とSC-006は自身の文面でそう述べており、
ここのどの文もhuman-subjectの結果として読んではならない。このrunはcapture harnessを使っていない。
moderated studyが必要としたsealed-capture kitはこのrunで動かされておらず、その後退役した。後掲の
記録がそれを扱う。

| Workflow | 測るもの | 閾値 | 結果 |
|---|---|---|---|
| Discovery | SC-001: 発見した1 fileのdetail viewを2分以内に開く | 20件中19件 | **20件中20件**、0.753秒〜93.6秒、中央値5.72秒 |
| Inspection | SC-006: 指定`AGENTS.md`の3 fieldを2分以内に回答 | 20件中18件 | **20件中20件**、0.37秒〜29秒、中央値1.12秒 |
| Comparison | SC-006のcoverage: 標準comparison task | 20件すべてが試行 | **20件中20件**完了 |
| Global consent | SC-006のcoverage: 標準personal-setup consent task | 20件すべてが試行 | **20件中20件**完了 |
| Safety | SC-006のzero-critical gate | critical issueなし | **報告なし** |

全sessionの3 fieldが`tests/usability/sc001-sc006-study-inputs/ground-truth.json`と部分点なしで一致した
— source `Repository`、認識するtool `GitHub Copilot`**と**`OpenAI Codex`、file type `Instructions`。
pageを読んだのか当て推量なのかを分けるのはtool fieldである（fixtureのroot `AGENTS.md`はClaude Codeの
pathではない）。全sessionが両方のtoolを挙げ、Claude Codeを挙げたsessionは無い。多くは問われずに除外を
述べ、そのうち何件かはClaude Codeが実際に読む隣の`CLAUDE.md`を名指しした。

comparison taskはどの組かを指定しておらず、fixtureは複数を保持する。したがってsessionは、ground truthが
記録する組に到達したかではなく、driftを見つけて述べたかで採点される。runを通じて6つの組に到達し、いずれも
fixtureのbyteと照合した実在のdriftである — ground truthが名指しし13 sessionが見つけた、`.agents/skills/`の
`changelog` skillと`.github/skills/`にあるその複製。1つのdirectoryで1つの名前を宣言する2つのskill、
`alpha-a`と`alpha-b`。version `2.0.0`と`0.9.0`を持つplugin `changelog-writer`の2つのmanifest。
`docs/AGENTS.md`と`docs/CLAUDE.md` — 後者は`scope`配列が閉じておらず、productはその宣言を「無い」ではなく
「不明」と述べる。`packages/api/CLAUDE.md`と、その傍らのdirectory形式の複製。そして1つのtreeの下で2つの
fileが宣言するagent `debugger`。多くのsessionは、compare pageが本文の傍らに述べる認識の差も報告した。

| Session | Discovery | Inspection | Comparison | Consent | Safety |
|---|---|---|---|---|---|
| 01 | 29.2秒 | 10.1秒 | 完了 | 完了 | なし |
| 02 | 0.866秒 | 0.857秒 | 完了 | 完了 | なし |
| 03 | 93.6秒 | 12.8秒 | 完了 | 完了 | なし |
| 04 | 0.86秒 | 0.97秒 | 完了 | 完了 | なし |
| 05 | 76秒 | 29秒 | 完了 | 完了 | なし |
| 06 | 40.9秒 | 1.2秒 | 完了 | 完了 | なし |
| 07 | 1.146秒 | 1.111秒 | 完了 | 完了 | なし |
| 08 | 1.17秒 | 0.37秒 | 完了 | 完了 | なし |
| 09 | 0.82秒 | 0.92秒 | 完了 | 完了 | なし |
| 10 | 0.753秒 | 0.741秒 | 完了 | 完了 | なし |
| 11 | 19.8秒 | 12.2秒 | 完了 | 完了 | なし |
| 12 | 9.5秒 | 5.9秒 | 完了 | 完了 | なし |
| 13 | 51.1秒 | 1.0秒 | 完了 | 完了 | なし |
| 14 | 0.9秒 | 1.1秒 | 完了 | 完了 | なし |
| 15 | 1.15秒 | 1.13秒 | 完了 | 完了 | なし |
| 16 | 77.3秒 | 1.1秒 | 完了 | 完了 | なし |
| 17 | 66.0秒 | 6.3秒 | 完了 | 完了 | なし |
| 18 | 1.19秒 | 1.13秒 | 完了 | 完了 | なし |
| 19 | 1.94秒 | 0.99秒 | 完了 | 完了 | なし |
| 20 | 55.66秒 | 1.15秒 | 完了 | 完了 | なし |

除外も差し替えも行っておらず、採点対象のworkflowを落としたsessionも無い。したがって固定分母と記録件数
は同じ20件である。

**sessionがsafetyについて報告したこと。** 禁止された作用は無い — customizationに由来する実行も、
inspectedなsourceの変更も、outboundなrequestも、MCP接続も無い。前掲の共有consent状態を除いてsessionが
挙げたのはconsent page自身の誠実さであり、それを肯定的に挙げた — まだ何も読んでいないと述べること、
除外され続けるもの（認証情報、保存されたsession、cache、installされたpluginの複製、toolが自分のために
生成するもの）を名指しすること、そして表示するdirectoryが、何かが開けるpathではなくescaped presentation
であると述べること。

railのSource-diagnostic件数を、Source自身の`Partial · 14 files kept a diagnostic`と並べて矛盾として
読んだsessionは無かった。rail項目は数える単位を名前に持つ（`Source diagnostics`）。labelは、panelを
開くかどうかを決める前に読み手が持つ唯一のものであり、同じgroupの他の項目はすべてfile一覧の行数を
数えているので、修飾のない名詞は兄弟項目が教えた規則を招くからである。

同じ20 sessionの先行runは、このrunが報告しなかったことを1つ報告しており、harnessではなくproductに
ついてであるため残す — fileのdetail headerは、localなapplicationを起動するicon只のcontrolを持ち、
1件のsessionがiconが何かを探る途中で`Open in VS Code`を作動させた。editorは既に起動していたので、
何も起動せず何も変わらなかった。これはproductが仕様上持つfile-opening capabilityであり、読み手が
作動させるものであり、controlはaccessible nameを持つ（`FILE_OPEN_TARGET_TEXT`が`aria-label`と`title`
の双方を供給する） — sessionがそれを名指しできたのはそのためである。observationは、その名前が
*visible*なtextではないという点であり、WCAGがそれを求めるのはvisibleなlabelがある場合だけである。

**このrunが確立しないこと。** 人によるfirst useについては何も確立しない。基準の以前のparticipant形式が
測ろうとしていたのは、まさにそれである。capture bundleを持たないので、ここには封緘されたものも、
evidence artifactから独立に再検証できるものも無い。拠って立つのは前掲のsession毎の記録である。そして
host 1台、fixture tree 1つである — sessionが出会ったのは、このrepositoryが自分のtestのために構築する
customization fileであって、見たことのないrepositoryではない。

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
2026-09-03に`src/`とpacked `dist/`に対して全件を再確認し、全件が今も成り立つ。interface reworkに
伴って確認結果が変わったものが4件あるが、判定は変わっていない — inventoryのpath filterを置き換えた
検索、detailとcomparisonが得たtab strip、Source自身のsurfaceが増やしたroute、そして固有の色を持つ
vendor markである。確認した内容:

| Criteria | 再確認したrationale | 確認結果 |
|---|---|---|
| 1.2.1–1.2.5、1.4.2、2.3.1 | 録音・録画もliveのaudio/videoも無く、flashも無い | `src/`のどこにも`<audio>`、`<video>`、`new Audio`、`.play()`が無く、packed treeにいかなる形式のmedia fileも無い |
| 1.3.5 | WCAG input-purposeの値を集めるfieldが無い | `src/app`の`autocomplete`属性は1つ、shellの検索fieldの`off`である。集めるのは検査対象treeへのqueryであって、入力する人についての情報ではない |
| 1.4.5 | textを提示するimageが無い | `dist/public`にimage fileが1つも無い。IconはinlineのSVGにcompileされ、固有の色を持つvendor markも語ではなく形を描く（AGENTS.md § Icon policy） |
| 2.1.4 | 単一の印字可能文字でcommandが起動しない | `src/app`のkeyboard handlerは8つで、いずれも同じtab strip patternである — Sourceとkindのrail、およびdetail・comparisonの7つのtab strip — すべて`nextTabForKey`を通り、答えるのは`ArrowUp`、`ArrowDown`、`ArrowLeft`、`ArrowRight`、`Home`、`End`だけ。他のkeyは既定のまま残るのでTabはstripから出られる |
| 2.2.1、2.2.2 | 制限時間が無く、自動更新も無い | `src/app`に`setTimeout`も`setInterval`も無い。Statusは明示的なrefreshでのみ進む。唯一のobserverはshellがbarに張る`ResizeObserver`で、そのbarの高さをCSSの長さとして公開するだけでcontentは変えない（`App.vue` § barHeightObserver） |
| 2.4.5 | 単独のpageはinventoryだけ | top-levelのrouteは3つ — inventory、Source自身の`/repository` surface、`/global-consent` step — であり、後の2つはそのSourceの状態とそのconsentの判断であって、それ自体が行き先ではない。残るrouteはすべて1つのinspectionのdetailかcomparisonである |
| 2.5.1、2.5.4、2.5.7 | gesture・motion・dragging入力が無い | `src/app`に`draggable`、`dragstart`、`touchmove`、`devicemotion`、`deviceorientation`のhandlerが無い |
| 3.3.4 | 法的・金銭的commitmentが無く、永続dataを変更しない | inspectionとsessionのmoduleはfilesystem writeを一切発行しない。FR-023はmutation instrumentationが証明する |
| 3.3.7 | 同じことを二度尋ねない | 入力はshellが持つ名前とpathの検索1つ、inventoryのToolとSourceのselect、consent checkbox、comparisonの2つのfile pickerである。いずれも既に与えられた情報を尋ね直さない |

**Applicable rowの自動側**は上記のSC-008 accessibilityに記録している。34件の`AUTO-*` IDがchromiumと
firefoxで全件通過し、`AUTO-2.1.1`のみ認証外のmacOS WebKitでそこに記録したtab orderの理由により失敗する。

**`MANUAL-*` IDは未実行として記録する。** そのmatrixは3つのoperating systemと3つのscreen readerの組を
要し、このreleaseはそれを主張しない（contracts/accessibility-acceptance.ja.md § 判定rule）。


## Interface reworkと、それが開き直した記録

Phase 105–110のinterface reworkは、上に記録したすべてのoutcomeが観測されたsurfaceを変更した。
すべてのsurfaceが描かれるpalette、inventoryのrowとrail、ファイル自身の事実を伴うdetailの見出しと
前後への移動、detailがrecognitionごとに述べる呼び出し名、comparisonの見出し、そしてsession自身の
controlの位置である。このうち2つは、記録済みの測定が名指しで参照していたものを移動させた。
scan statusとcommitted generationはinventoryではなく`/repository` pageにあり、名前とpathの検索は
shellのもので、barにある。reworkが出発したtreeで取得したoutcomeは、そのtreeについて誤っているのでは
ない。このtreeを記述していないのである。したがって上の記録は、このtreeが生んだものを述べており、
それが同じ日付を持つ理由である。生んだrunがこのsessionではなくCIのものである場合は、その記録を
所有する節がそう述べている。

reworkが到達したものと、各記録をこのtreeで取り直すことになった理由:

| 記録 | reworkが到達した理由 |
|---|---|
| Release gate execution表 | どのsuiteもcaseの増減や変更を受けており、別のtreeで取った件数はこのtreeのrunを同定しない |
| SC-001とSC-006のfirst-use session | spec.md § Measurable Outcomesは、primary workflowへの実質的な変更の後に評価をやり直すことを求め、reworkは4つすべてのsurfaceを変更した |
| SC-008 accessibility（`AUTO-*`） | 34件の自動checkはreworkが移動させたmarkupを対象とし、さらにPhase 105は、すべてのcontrast checkが測定するpaletteを置き換えた |
| SC-008 Not-applicableの再検証（`REVIEW-*`） | 各rationaleは、reworkが変更した`src/`の読みである。3.3.7の行は名前とpathの検索を名指しし、reworkはそれをbarへ移した |
| SC-003、SC-004、SC-005、SC-007 | fixture byteが変わっており、spec.md § Release-Evidence Fixture Governanceはfixture byteの変更を新しい非比較可能な測定setとする。Phase 110はさらに、SC-003のshared-file caseとSC-005のrow caseが観測するskill・hook・MCPのdetail見出しを作り直した |

ここに書いたものはreworkに対する指摘ではない。この文書のevidenceが、featureの歴史全体ではなく
1つのtreeのものである理由である。
