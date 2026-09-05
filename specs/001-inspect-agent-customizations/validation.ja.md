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
配信された`<h1>`–`<h4>`のちょうど1件として、あるいはそれを担うheadingが配信されていないときは、
その本文を持つ目次linkがすべて指す、配信されている1つのfragmentとして。それ以外は観測どおり`missing`、`ambiguous-heading`、
`ambiguous-anchor`として報告する。requestがthrowした場合は「完了しなかったrequest」として報告する。

**commandが判定しないこと。** 見出しが消えたことの意味と、引用sectionが今も保守対象のparaphraseを
確立しているか。どちらも参照ではなく読解であり、reviewerに残る。分担は
[AGENTS.ja.md](../../AGENTS.ja.md)の「公式出典の検証方針」に記述している。Registryはpage textのdigestを
持たない。見出しが残ったまま本文が書き換えられたsectionは、参照ではなくその読解で見つける。

**変更。** commandは何も変更しない。報告するだけで、その後をreviewerが決める。

**Network実行。** 2026-09-04、52 record全件に対して実行した。初回のrunは18 sectionをmissingと報告した。
うち17件はcode.claude.comのページで、各headingが自身のanchor linkの内側にzero-width spaceを含んで
配信されており、checkerのtext正規化がそれを残していた。現在はformat characterを落とすので、これらの
sectionは配信されたheadingとして解決する。残る1件は`vscode.copilot.instructions`で、heading
`Use multiple AGENTS.md files (experimental)`は今は`Use multiple AGENTS.md files`と描画され、experimental
labelはその横に置かれている。引用した3 sectionを、そこからparaphraseを保守する全recordに対して読み直した
うえでcitationを更新した。その修正後のrunはchangelogの2 recordを報告した。引用したreleaseをこのページは
headingではなくlabel付きentryとして描き、table of contentsに列挙している。fallbackは今その一覧を読み、
4 entryそれぞれを裏付けるparaphraseに対して読み直した。最終runは52 sources checked、0 with driftを報告し、
その4 sectionをtable of contents経由で確認したものとして挙げた。

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

**直接宣言を1件追加し、このreviewではどのversionも受理しない。** このrepository自身のESLint ruleを
試験する`@typescript-eslint/parser`を、推移的解決から宣言済みdevDependencyへ移した。`RuleTester`は
configではなくtestからparserを受け取るため、manifestが宣言しないpackageをimportするtestは、ここが
管理しないversionを解決していることになる。Runtimeにも公開payloadにも公開契約にも届かないので、提供
すべき移行は存在しない。research.ja.mdのdependency tableが、他のlint toolingの隣にこれを記録する。

日常的なversion移動はRenovateのもので、
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

**CLIのaccepted batch failureは伝播するようになった。**
`tests/integration/cli-global-batch-failure.test.ts`が失敗していたのはこの点である。
`runGlobalEnable`は呼び出し側が必要とするdispositionを受け取る。consent pageが送るconfirmationは
失敗したbatchを`batchStatus`へ保持したままacceptanceで応答し、CLIの`--inspect-personal-setup`は
hostが存在する前にそれをthrowしてlaunch URLを出力しない。自動Repository scanのfailureと同じ終わり方で
ある。両caseとも通過する。

**railの個人設定の項目は、何を数えているかを述べ、読み取り中は`Scanning`と述べる。** statusの表が
1つになったとき、この項目には2つが残っていた。項目自身の集約表はmemberの1状態を`partial`と綴った
ままだった。今や読み手が他のどこでも出会わない語であり、初見利用の20 session中15 sessionが前で止まった
語でもある。その状態は`with diagnostics`と述べる。隣のRepositoryの項目が既に使っている語である。そして
countedな状態は単位を述べていなかった。`1 partial`は「1つの何が」を言っていない。countedな状態は
数えているmemberを名指す — `1 home with diagnostics`、`2 homes not inspected`、`1 home failed` —
各memberが呼ばれている語（`GLOBAL_MEMBER_TEXT`）で述べる。項目のrankingは変えていない。`idle`が
`ready`より上位である点も含めてである。読まれていないhome 1つが読まれた3つと並ぶとき、4つとも
読まれたと報告してはならないからである。

この項目は読み取りの最中に`Not inspected`とも述べていた。これは表現の選択ではなく偽の文である。
batchはcommitするまでmember Sourceを1つも公開しないので、項目はその瞬間に読まれているhomeについて
空のlistから答えていた。`Scanning`と述べる。同じ項目が、1 memberの再スキャン中に既に述べている語で
ある。読み取りが出ている状態は2通りある。snapshotが持つbatch — 別タブの確認、または再読み込み後の
自分の確認 — と、このclient自身の確認である。後者はadmitされた全memberのscanが決着してから答える。
`view-state.ts` § runningGlobalBatchが前者をpublishするので、一覧と個人設定のpageは1つのreadに
2つのcopyではなく1つの述語で答える。

検査が届いていないのは項目自身の分岐である。RPC channelはWebSocketなので、browser testは確認を
開いたまま保持してrailを読むことができず、unit projectはsingle-file-componentのcompilerを持たない。
検査が届いているのは、その分岐を決める述語と、選ばれる文言である。分岐自体はfixture launchで
目視した。

**実行中のreadはそのrankingのcandidateであり、rankingを上書きするverdictではない。** 同じpreviewの
retryは既にpublishされたmemberの上で走るため、readだけを`Scanning`として報告すると、読み手がretryして
いる`failed` memberを隠し、同じ値から導出される隣のpillとも食い違う。代わりに、readは`scanning`
candidateとして既存のrank計算へ入る。`idle`と`ready`には勝ち、`failed`と`partial`には負けるので、
1つのeffective stateが語とwarning表示の双方を決める（FR-030、WCAG 4.1.3）。自動gateが届くのは、その
入力を供給するpredicate — `view-state.ts` § runningGlobalBatch、全batch phaseについてassert — と、read
が出ていないときのrankingであり、後者はrailに関する既存assertionがすべて読んでいる。Fold自体は
fixture launchで確認した。理由は上に記録したとおりで、この分岐はreadを開いたまま保つ必要があり、RPC
channelはWebSocketで、unit projectにsingle-file-component compilerが無い。

**source surfaceの字はこの製品のものとし、個人設定は自分のgenerationを述べる。** rail項目の削除は
4つの積み残しを生み、ここで直した。一覧のlive regionはmemberのstatus wordだけを読んでいたが、
`ready`と`partial`は同じ語なので、refreshでmemberがpartialになっても直前と同じ文を告げていた。
今はstatus表がまさにこの場合のために持つnoteを併せて読む（WCAG 4.1.3）。comparisonのfacts lineは
familyとdirectoryを述べてmemberを述べていなかったため、home変数が同じdirectoryを指す2 memberでは
両sideの表示が同一になっていた。rowのaccessible nameが既に述べているとおり、facts lineもmemberを
述べる。個人設定のsurfaceはcommitted generationをまったく述べていなかったが、FR-030は各Source
familyの自分のsurfaceにそれを求める。Repository panelと同じ形で、Global sequenceのものを1回だけ
述べる。そしてviewerの箱をMonacoのmountまで保持するinertな`<pre>`は、browser既定のmonospace
metricsで組まれる一方、Monacoはplatform既定 — macOSで12px、それ以外で14px — を使っていたため、
mount時に箱が跳ね、text enlargement下ではさらに大きく跳ねていた。placeholderはそれを防ぐために
存在する。今は1つの宣言を共有する。`rem`の`--aci-source-font-size`と`--aci-source-line-height`で
あり、`monaco.ts`が各editorのcontainerから読み取る。hook detailの5 viewerで、その日に有効だった値
に対して実測すると、その下の導線linkの移動はmount時に2〜29pxから0〜12pxへ、200%のtext sizeでは
倍増から12〜36pxへ縮んだ。残るのはMonacoが確保して`<pre>`が確保しない横scrollbarである。これが
測ったのは特定の大きさではなく宣言の共有である。placeholderとeditorが1つの値を読む以上、
一方が他方の取らない大きさを予測することはない。

大きさ自体はeditorのものではなくこのinterface自身のscaleである。source textは周囲の散文が説明する
参照材料なので、0.8125remのbodyの1段下、0.75remに座る。同じpxでもmonospaceは比例フォントより
大きく見え、この製品自身の行がすでにそれを織り込んでいる。したがって既定が14pxのplatformで
Monacoが描いたはずの大きさより小さく、macOSの既定と同じなのは追従した結果ではなく偶然である。

**全Monaco hostがこの製品自身の字で組まれる。** `typeMetricsOf`は各hostのcomputed type metricsを、
そこで生成するeditorへ渡す。したがって`--aci-source-font-size`と`--aci-source-line-height`を宣言しない
hostは、代わりに13pxのbody typeをMonacoへ渡す。MCPの`DeclarationDiff`、pluginの`DeclarationDiff`、
pluginの`SourceDiff`の3つがそうなっており、9つすべてがshared tokenを宣言するようにした。
`tests/e2e/source-type.spec.ts`は9 routeの全Monaco hostについてcomputed font sizeとline heightを固定
する。読むのはMonaco自身のtextではなくこの製品が所有するhost要素である。宣言が無いときMonacoは
自身のplatform既定へ落ちるが、macOSではそれがこの製品の宣言する12pxと同じなので、textを読むcheckは
まさにそれが捕らえるべきsurfaceで、そこでは通ってしまう。この3つ
から宣言を外して9件中3件が落ちることを確認してから採用した。

**railの`Source diagnostics`項目を廃し、Sourceのstatusはどこでも1つの表が述べる。** 2回のrunで
5 sessionが、railの`Inspected · some files kept a diagnostic`とその項目の`0`を、同じ母集団を
2通りに数えたものとして読んだ。狭めるべきはlabelではなく、外すべきは項目のほうだった。それは
fileを1つも並べておらず、それがrail自身の構成員の試験である。そしてSource単位のdiagnostic codeは
`root-unreadable`だけで、それはscanを失敗させてinventoryをcommitしないので、inventoryが出ている
画面ではこの項目は常に`0`だった。Source自身のdiagnosticは、そのSource自身のsurfaceで述べる。
Repositoryのものは`/repository`、consent済みの各memberのものは個人設定pageのその行である。失敗の
文とその理由が初めて隣り合うのもここである。`The last rescan failed…`は一方の画面にあり、それを
説明するretained Diagnosticは別の画面にあった。項目とともに`SOURCE_STATUS_TEXT`も無くなった。
1つのstatusがrailでは`Inspected`、Repository pageでは`Partial`として読み手に届き、両者が1つの表の
別の行だと述べるものが無かったためである。今はすべてのsurfaceが`SOURCE_STATUS_STANDALONE_TEXT`を
読み、noteはより正確なものを持たないsurfaceだけが描く。Repository pageとmemberの行は件数そのものを
述べる。

**Rescanの相関はそのcommand自身のものとし、viewerが埋める箱は埋まる前に確保する。** 2つのsurfaceが、
終わったscanの記録を実行中のものとして表示していた。commandはそのscanが決着してから答えるので、次の
commandが飛んでいる間にslotが持つrequest IDは既に完了したscanを指し、refreshが持ち帰ったその進捗が
「This scan」の下に描かれていた。dispatchでその相関を落とすようにした。surfaceごとに条件を足すのでは
なく、1つのruleを1か所に置く形である。文言はcommandを述べる`Rescan in progress.`とした。この側は実行中の
scanとFIFO待ちのscanを区別できず、区別を主張してはいけないからである。別件として、hook detailの比較
導線はdeclaration viewerの下にあり、Monacoのmount中に位置が動き得た。現在は他のsurfaceと同じくviewer
より前にあり、初回clickのbrowser回帰はChromium・Firefox・WebKitで通過した。`SourceViewer`自身の
placeholderがeditorのmount中に何を保つかは上に記録しており、その測定が残した残差も併記している。

**Localのgateからは見えない2つのcertification jobを通した。** 以下のgateは1台のmachineで実行し、
CIのうち2つは別の場所で実行する。`tests/unit/host/file-opener.test.ts`はabsoluteなfixtureを
path separatorだけから組み立てていたが、Windowsではそれはcurrent driveからの相対pathを表す。
module自身の`resolve`がそれをdrive付きにするため、15件のassertionはprobeが一度も見ていないpathを
名指していた。fixtureはresolve済みのrootから組み立てるようにした。またhook comparisonのcarrier
detailからの導線では、上にある declaration viewerが高さを取る過程でlinkが下へ押し出され、pressは
linkのなくなった位置に落ちてaddressがcarrierのままになっていた。読み手がするのと同じく、address
が動くまでpressを再試行する。どちらもこのmachineでは観測できない — 前者はWindows、後者は認証対象の
Linux WebKitを要する — ため、確立するのはCIである。

**Launcher exclusionは1つの比較であり、その傍らに残余が2つ立つ。** 綴りはpathの所在ではない。
Repository外の`PATH` entryや設定済み`EDITOR`をRepository内へのsymbolic linkにでき、executable
resolverはその外側の綴りをそのまま返すため、字面だけの比較ではrepositoryが供給する実行fileを
editorとして提供し、起動してしまう（FR-020、FR-022）。よってprobeは各candidateを、綴りとしても
物理的な位置としても比較する。比較先はstartupが確定して綴りの隣へ渡すRepository rootの物理的な
位置と、proposed personal-setup rootそれぞれの綴りである。`tests/unit/host/file-opener.test.ts`は
candidateの両方向について実際のalias treeをstageし、`tests/unit/cli.test.ts`は既存rootの受け渡しを
確立する。

2回のreviewがそれ以上を求めた。sessionがその時点で保持するrootに対するlaunch時の再認可と、macOSで
catalogのapplication名ではなくbundleのpathで起動することである。どちらも実装し、どちらも取り下げた。
前者はFR-013のno-I/O規則をprobe自身のresolutionまで禁じるものと読むことに依っていたが、FR-013は今、
editor launcherの探索がoperating systemによるproposed root経由の解決を許す唯一の操作であることを述べる。
そうすると分割が買えるのは修復済みrootのcaseだけになる — 存在しないrootでlaunchし、その後読み手が
そこに作ったものへ`PATH` entryが向いている場合である。後者は`osascript`の綴りが既に断っているのと同じ
提案であり、FR-019が同じ理由で断る。それぞれが残すものは、機構で塞ぐのではなくlaunchを述べている場所
（contracts/http-api.ja.md § open-file）に記録する。

**VCS内部はfilesystemが与えた名前で除外し、allowlist contractもそう述べるようにした。** ある
reviewは、case-insensitiveなvolumeがGitのdirectoryを`.GIT`として提示するとwalkが入ると報告し、
そのためにvolume identityによる比較 — candidate名ごとの`lstat` 2回 — を建てた。それは削除した。
`VCS_INTERNALS`自身のcommentが、この事例を理由と限定された帰結つきで、受け入れ済みの残余として
既に記録していた。判定できるのはvolumeの名前解決だが、macOSは両種のvolumeを出荷するのでそれに答える
platform checkは無く、platformでcaseをfoldすればcase-sensitiveなvolume上で読み手がauthorした`.GIT`を
隠すことになる。そして入った場合の代償はover-listingであり、そのsurfaceの主張は「listされることは
loadされることではない」に尽きる。到達には、VCSが使う前に読み手がその綴りでstoreを作っていることが
要り、それはFR-019が機構を建てないと決めているadversarial-inputの形である。treeはこの規則について
committedな記述を2つ持ち、互いに矛盾していた。`contracts/inspection-path-allowlist.md`を英日とも、
codeが常に実装し理由づけてきた側へ改める。

**commentが記述するnon-kind listは1つである。** 2つと記述していたproduction commentの5 familyと
browser test、およびその隣の削除済みSource diagnostics項目を、まとめて修正した。対象は
`InventoryRail.vue`、`InventoryFilters.vue`、`inventory-filter-state.ts`、`main.css`、`index.vue`、
`inventory-rows.spec.ts`で、最後のものは1要素のlistを回すloopが、常に走っていた単一caseそのものに
なった。うち2つは文言以上の修正になった。railのstatus commentは性質ではなく実験の経過を記録して
いたので、語の隣の数がなぜ答えを伴わずに届くのかを述べる形にした。そして`.aci-notices`は、
diagnostics listと各詳細の失敗表示が同じ箱を描くという理由でglobalに置かれたutilityであり、その理由は
listと共に消えていた。描画するcomponentは1つなので、この枠はそのcomponent自身のblockとしてscoped
styleへ移した（AGENTS.md § Stylesheet scope policy）。

以下のgateはすべて2026-09-05に、このtreeに対して実行した。Build、package、performance、browserの
検証は、shared workspaceで既に動いていたCLIを妨げないよう、同じworking treeの隔離copyから実行し、
artifactに依存するgateはそこで生成したbuildを用いた。件数は各runが報告した値である。

| Gate | Command | 結果 |
|---|---|---|
| Format | `pnpm run format:check` | 無出力、exit 0 |
| Lint | `pnpm run lint` | 無出力、exit 0 |
| Types | `pnpm run typecheck` | 無出力、exit 0 |
| Unit | `pnpm run test:unit` | 54 file、1,250 test passed |
| Contract | `pnpm run test:contract` | 12 file、405 test passed |
| Integration | `pnpm run test:integration` | 11 file、271 test passed |
| Security | `pnpm run test:security` | 1 file、5 test passed |
| Package | `pnpm run verify:package`のあと`pnpm run test:package` | 検証はexit 0で無出力、8 file・56 test passed |
| Performance | `pnpm run test:performance` | 2 file、4 test passed |
| Browser | `pnpm exec playwright test --project=chromium` | 577 passed |
| Coverage | `pnpm run test:coverage` | 77 file、1,926 test passed。statement 86.07%（6,023/6,997）、branch 71.87%（3,557/4,949）、function 87.46%（1,200/1,372）、line 86.37%（5,900/6,831） |
| Documentation | `pnpm run test:docs` | 1 file、41 test passed |

**detail pageから打つ検索が、fieldへ届く。** shellの検索はinventoryへ遷移し、inventoryは読み手が
辿った行を復元する。そのためfocusは1文字目と2文字目の間でfieldを離れ、以降の文字はどこにも入らな
かった。打鍵は、いた場所へ戻ることではなくlistへの新しい問いなので、その遷移の前に記録した地点を
落とす。browser回帰は、辿った行がなお一致する語を打つ — 復元が発火するのはまさにその場合である。
先に落ちることを確認した。

**open controlの1 instanceは一連のfileに仕えるが、launchはそのうち1つのものである。** 実行中の
launchはflagだったので、読み手がskillのtreeを移った後も立ったままになり、そのlaunchとは無関係な
別fileのボタンを無効にしていた。しかもその期間は、実行中のlaunchが要する時間そのもの — flagが存在
する理由であるterminal editorの場合そのものである。代わりに、そのlaunchが作られた対象のfileを保持
し、controlはそのfileが画面にあるときだけ無効になる。決着は自分のrequestだけを消すので、先行launch
の応答が後続fileのものを消すことはない。ここに届くgateは無い。browser suiteはlaunchを起動しては
ならず、unit projectにsingle-file-component compilerが無いからである。

**consent panelは、readの実行中にrowを確定として報告しなくなった。** 1つの文がcoverしていたのは、
このtab自身の確認と、snapshotが持つbatchであり、このpageがまだ取り込んでいない受理済みenable —
別tabのもの、あるいはreload越しのこのtab自身のもの — でbatchが採用済みsnapshotへ届いていないもの
はcoverしていなかった。publish済みのrowが画面にある状態では、readが出ているのにその文は読み終えた
件数として読めていた。現在はreadが実行中であることを述べ、panelが既にofferしている
`Refresh status`を名指す。動かしたものは無い。

**実行中の個人設定readを読み上げる。** railの項目はbatchのcommit前に`Scanning`へ変わるが、pageの
live regionは最初のmember Sourceが届くまで何も述べなかった。そのため、その項目を見られない読み手は
何も知らされず、publish済みmemberに対するretryの間も、readが出ていることを言わずにstatusだけを述べ
ていた（contracts/accessibility-acceptance.ja.md § 4.1.3）。現在は両方を述べ、読み手が対処すべき
状態が先に来るようmemberを先に置く。railのranking foldと同じく、この分岐はreadを開いたまま保つ必要
があり、assertではなくfixture launchでの確認として記録する。

**下位artifactは要件を緩められないので、FR-013がlauncher probeの行いを述べる。** 禁止は
「proposed-root filesystem I/Oを行わない」と無限定に書かれる一方、contractがその例外を記録して
いた。これはcontractが要件を改変することであり、できない。FR-013は今、規則とその唯一の例外を自ら
述べる（英日とも）。productのどの操作もproposed rootまたはその配下のpathをoperandに取らない。
editor launcherの探索はoperandがmachine自身の設定であり、そのresolutionをoperating systemが
proposed root経由で解決し得る唯一のものである。FR-022が各launcherをhostのport bind前にresolveする
ことを要求し、candidateが実行可能かを問うことは読み手自身の綴りが導く先を調べることだからである。
そこからenumerate、read、publishするものは無く、4つのeligible entryはofferし得るものから除外された
ままである。

**macOSは今もapplication名をLaunchServicesへ渡し、残余は塞ぐのではなく記録する。** あるreviewは、
認可済みlauncherが内側にあるbundleを解決してpathで起動するよう求めた。名前は登録済みの全bundleに
対して解決され、inspected repositoryが同名の2つ目を持ち得るからである。一度実装し、取り下げた。
同じfileが既に`osascript`の綴りについて同じ提案を却下しており、その理由は、これがFR-019の退ける
adversarial-workspace modelであり、求められる機構こそFR-019が追加を禁じるものだ、というものである。
両者を別扱いにする根拠として挙げた区別 — `PATH`はこの製品が濾すがLaunchServicesの名前空間は濾さない
— は機構を支えるには薄く、`env-editor`はこのlaunchが元から使ってきた名前を公開している。残余は
launchを述べているcontractに記す。

**source typeの回帰は、productが宣言したものに加えて読み手が見るものを読む。** それは*最も近い*Monaco
rootの親を読んでいたが、diffの内側ではそれはMonaco自身のwrapperである。diffは片側ごとに1つのeditorを
mountするので、読んでいた要素はMonacoのものであり、productのcascadeを自分自身へ返していた。option配線
を壊してeditorが12px/18pxで組むようにしても通っていた。今は宣言について最外のrootの親を、実際に組まれた
ものについて可視の`.view-lines`を読み、各routeは対象のhostを名指す。それが、どのrouteも到達していな
かった9つ目のhostを露わにした。2つのrouteが同じ「最初の可視editor」を選んでいたからである。両方が落ちる
ことを確認した。3つのhostからtokenを外す場合と、`typeMetricsOf`がMonaco自身の既定値を返す場合である。

**consent panelは読み取りが進行中であることを述べ、何を読んでいるかを名指す。** 2つの文が
projectionの確立する以上を主張していた。`These directories are being read now`は、retryが同じ
previewの再試行できるsubsetしか読まないのに4行すべての上に立ち、`N of these directories are being
read now`は、phaseが`waiting` — queue済みで未開始、しかもそのphaseは前回のrefresh時点のもの —
であり得るbatchを数えていた。どちらも`is in progress`と述べる。これはRepository自身の
`Rescan in progress.`が同じ理由で既に持つ形である。この側は実行中のreadとFIFO待ちのreadを区別
できず、その区別を主張してはいけない。初回同意とretryは1文ではなく2文にした。retryはsnapshotが
既に持つretryable subsetから件数を名指し、確認controlのlabel自身が切り替わるのと同じ値で分岐する。
そうしないと`Try the failed members again`と述べるpressに`these directories`と述べる文が返り得る。
4つ目の文も一緒に変えた。familyは1つのことを1つの言い方で述べるからであり、このpageが取り込んで
いないreadも`in progress`である。

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

**Coverageの百分率はあるrunの値であり、定数ではない。** このtreeのrunは、上の行に記録した
77 file・1,926 test passedと百分率を報告した。これらにthresholdをassertしている箇所はどこにも無い。

**Performance gateはsmoke passであり測定ではない。** `tests/performance/`は100,000
entryのfixtureに対して非gatingのpassを1回実行しharnessの整合性をassertする。このreleaseは、どこにも
timingのthresholdをassertしない。Checked-inのreference profile `sc002-smoke-reference-v2`は、hostedなUbuntu 24.04 x86_64 runner上のNode 24.18を記述し、profileのbenchmark fieldが変わって、profile自身の規則がfield変更を新しい非互換IDとするため新設した。これは観測値を読む際の参照であって、観測した場所の主張ではない。実行環境とprofileを比較する機構は無く、runは自分の環境を出力する。2026-09-05のpassはこのmachine — arm64、Node 24.14.0 — で走り、rescan dispatchからrequest相関のstatusまで344.7 ms、request committedのoperable inventoryまで500 ms、filter feedbackまで25.1 ms、selection feedbackまで45 msを観測した。global setupがlogを読む人のためにこれを出力し、値はこのmachineを記述する。
**Consent pageは、終わった読み取りを終わったと述べる。** 1つの文がconfirmationの2つの状態 — 応答待ちと、
hostが答えた後 — を兼ねていた。Hostはadmitした全memberのscanがterminalになり、batchがcommitされてから
答える（contracts/http-api.ja.md § enable-global）。したがって後者は読み取りが終わってこのpageが結果を
取得している状態であり、そこに`Reading … is in progress`とlive regionへ流していた。今は2つの分岐であり、
後者は`Reading finished. The result is loading.`と述べる。この側は何も読んでいないので件数は付けず、
commitが既にfileを一覧へ載せているので、走行中の文が持つ行き先の句も付けない。Railは元から正しく、
`globalReadInProgress`は`submitting`だけを数え`answered`を数えない。

これはSC-001/SC-006の記録を開き直さない。Consent workflowの採点は、提案されたdirectoryを**読む前に**
名指すこと（`ground-truth.json` § workflows.consent）であり、それはconfirmationを与える前の段階である。
文言が変わった状態は、その後でなければ発生しない。

**2つのcommentが、仕様が既に持たない要件を名指していた。** `view-state.ts`はconsentのfailure pathを
`FR-040/FR-041 removed`と説明し、checklistのiteration記録は2026-07-20のrefinementがdomain分類を
`FR-041のpropagation`で置き換えたと述べていた。どちらもそれらの要件が存在した時点の記述であり、今引く
読み手は何も見つけない。commenting policyの「名指す前にartifactを開く」はこれを防ぐためにある。前者は
今日それを支配する条項（contracts/http-api.md § Common results and errors）を名指し、後者はrefinementが
何をしたかを、それを行った識別子ではなく述べる。`src/`が引く`FR-`・`QR-`・`SC-`識別子すべてをspec.mdが
定義するものと突き合わせたsweepは、今は欠落0件を報告する。

`SC-002`だけは、criterionでないまま残る識別子である。撤回のclarificationがそれを述べるようにした。
Performance harnessはfileが作られた当時の`sc002-`接頭辞を保つ。その接頭辞は記録済みdigestが名指す対象
だからであり、taskやchecklist項目の`SC-002`はそのharnessを指す。

**Tarballはrelease policyが述べるとおりである。** `npm pack`は186 fileを作る。`dist/`、`docs/images`の
screenshot 2枚、両言語のreadme、licence、manifestである。`bin`は`dist/cli.mjs`を指し、そのfileはtarball
に入っている。同梱の`THIRD-PARTY-NOTICES.txt`はbrowser bundleから生成され、bundleされた各packageのlicence
本文を持つ。`CHANGELOG.md`、`specs/`、testは入らない。同じtreeで`verify:package`も通る。

**Screenshotはこのtreeで撮り直し、1枚は動かなかった。** `docs/images/comparison.png`は撮り直した。
Source typeはtokenが今持つ`0.75rem`/`1.0625rem`であり、最後のblockが切れていたところで3つのdiff blockが
収まる。`docs/images/inventory.png`はcommit済みfileとbyte単位で同一 — 同じSHA-256 — で返った。Interface
reworkが残した作業はこの画面に届かず、source tokenを読むinventory rowも無いからである。両readmeのalt
textは今も各画像が示すものを説明しており、どちらも変えていない。

**このroundが機械的に確認したものと、しなかったもの。** Tree全体を網羅したもの: 前回のround以降に加えた
`§` citationと`{@link}`がすべて実在するfile・見出し・宣言へ解決すること。参照されないexport名もcomponentも
無いこと。読み手のいないreactive valueが無いこと。registryが宣言する`DiagnosticCode`がすべて発行され、
宣言に無いcodeが発行されていないこと。描画するmarkupを持たないstylesheet ruleが無いこと。編集した各Markdown
の対言語版が同じ変更に入っていること。`git diff --check`がvendored skill以外に何も報告しないこと。Sweepでは
なく読んだもの: serverのdiff — commitのcompute-then-apply化、launcher probe、traversalのerror policy — と、
inventoryのfilter tableである。Class所有のsweepはglobal sheetとcomponentの双方にある名前を2件報告するが、
一方はglobal ruleを名指すcommentであり、もう一方は`.aci-compare-side p`で、その主語はcomponentが描画する
`p`であり、policyが置く先はそこである。

**Launch tokenはidentityを保つ必要があるため`shallowRef`にした。** Open controlは、どのfileのlaunchかを
call自体を保持して参照比較で見分ける。Deepな`ref`はobjectに対して`reactive(value)`を返すため、取り出した
tokenは入れたtokenと同一ではなく、あらゆる settlement が別のcallのものとして読まれていた。結果として、
既に答えたlaunchでcontrolがdisabledのまま残り、失敗も表示されなかった。記憶ではなく実測している。Deepな
`ref`はplain objectにはproxyを返し、DOM elementには同じobjectを返す。だから隣のelement refは通常の`ref`
のままで、移したのはこれだけである。`src/app/`の全`ref`のうち`===`で比較されるものを掃いたが、他には無い。
残りはtemplate elementかstring unionを保持している。

どちらのsuiteもここに届かず、それは修理ではなく記録として残す。Browser testはlaunchを起動してはならず、
unit projectはsingle-file componentをcompileしない。Kindが効く理由はtokenの宣言の場所に書いたので、
次の読み手が`ref`へ戻すことはない。

**Deviceの障害はmachineの状態であり、closedなerrno集合がそれを名指すようにした。** あるroundは、
exact-target probeの`EIO`/`ESTALE`処理を「environment failureはattemptをabortする」という規則の違反と
読んだ。この記録の前のroundは、そのfailureが1つのoperationに閉じていることを根拠に違反ではないと答えた。
その答えは誤りだった。決め手はper-file outcomeが実際に見せる文である。`file-unreadable`は、fileが
削除されたか権限がreadを拒んでいるかもしれないこと、そして他のfileは影響を受けていないことを述べる。
Deviceが壊れている場合やmountが消えた場合、3つとも真ではなく、3つ目はまさにそうしたfailureが不明に
するものである。よってper-file outcomeへ畳むと、machineの状態を読み手のcontentの性質として述べるpartial
generationを公開することになる。Constitutionのabort規則はそれを防ぐために存在する。

修正は、1つ目の隣に2つ目のerrno allowlistを置くことではない。それを拒んだ点で以前の答えは正しかった。
修正は、仕様が既に許している唯一のclosedな集合の要素である。`EMFILE`、`ENFILE`、`ENOMEM`に、codebaseが
線を引くたびにenvironmentalと名指してきた`EIO`と`ESTALE`が加わり、集合の名前は原因の1つではなく中身に
合わせた。Pathを分類する前にmachine自身のfailureを除外していた各call siteは、これまでどおり同じことを
続ける。Integration suiteは1 fileにdevice failureを注入し、attemptがcommitではなくrejectすることを
確かめる。旧集合に対して先に実行し、そのfileをunreadableとして公開するところを確認している。

**Consent pageのstatus regionは、そのpageのstatusを述べる。** Scan status文と、このpageのものでは
ないoperationの文は、それぞれ状態と一緒に現れるblockの中で`aria-live="polite"`を持っており、各regionは
textが既に入った状態で作られて何もannounceしていなかった（W3C ARIA22）。その属性は削除し、常設のregionが
pageの3つのstatus文のうち現在のものを持つようにした。3状態は排他なので、1度に1つである。

その結果、同じ文字列が2つのnodeへ届く。これは重複ではなく設計である。Regionは状態が変わったことを告げ、
可視の文はその状態そのものであり、読み手は各々に別の仕方で出会う。これはshell自身の形でもあり、
`errorAnnouncement`と可視の`.aci-error`段落は1つの文字列を持つ（`App.vue`）。読み手に2回見せてはならないのは
可視のcopyの方なので、consentのwalkthroughはpanelのcopyをpanelで、regionのものをregionで表明し、page
全体のnodeを数えない。Regionは1×1のboxを`clip-path`で隠しており、可視性のfilterでは実contentと分けられない
からである。

**どのkindにも属さないfileのlistは、どちらのemptyかを述べる。** そのcommentは、ここには絞り込めるものが
無いと述べていた。Source選択と検索はどちらもこのlistを絞る。そこにあるfileも他と同じくSourceに属し、path
を持つからである。絞れないのはtool選択だけで、pageはこのlistにtool controlを出さない。よってempty panelは、
複数をadmitしたscanに対して「No files.」と述べていた。今はどのkindのlistとも同じ文と同じ出口で、2つを
区別する。

**あるpanelが保持している文書を、別のpanelのために読み直さない。** Plugin comparisonはfile pairについて
carrier自身のresponseを採用しており、manifest paneのslotも採用するようにした。方向は一方だけで、理由は
lifetimeである。Manifest paneはfile選択より長く生き、file paneのslotは選択のたびに落ちる。よってmanifest
がfile slotを採用すれば、復元するrequestを持たない文書を抱えることになる。これが無いと、pluginの自身の
manifestであるfileを選んだときにviewが隣のpaneで既に表示している文書を読み直し、その読みが失敗すれば、
byteが隣に出ているのにfile paneは何も述べられなかった（contracts/http-api.ja.md § Comparison views）。

**Checklistのlogが、開いたものを閉じるようになった。** その日付つきentryは、このreleaseが持たない機構 —
scan timingのsampling protocol、20人studyの義務、消えたentryのtaxonomyのtable row — を記録しており、
いずれも追加として記録されて消えた記録が無く、あるiterationの所見は現在形で、今も成り立つかのように
書かれていた。Entryはchange logの役目そのものなので消さない。欠けていたのはそれらを閉じるentryであり、
それを書いた。現在形の所見は、そのiterationのものとして述べ直した。

後のroundは、文書方針の「旧名・旧要求は書かない」をそれらのentry自体の禁止と読んだ。その読み方では、
方針が名指すartifactが役目を果たせない。2つの要件がまだ必要かを問う`Clarifications`の問いは、それらを
名指さずには答えられず、releaseが後に落としたものを追加したiterationは、その除去を記録するentryが入るまで
穴の空いたlogである。方針は今、実際に禁じている2つ — 旧名を現行として提示すること、置き換えられた本文を
説明すること — を述べるので、絶対的な読み方をもう一度導けない。

**設定値が名指すeditorを分類する。** `EDITOR`は字面では分けられない2通りに読める — 空白を含むpathと、
flagsを伴うcommandである — が、probeは前者しか読まず、値の最後のpath segmentをeditorの名前としていた。
`vim -u /tmp/minimal.vim`ではそのsegmentはflagsが名指すfileなので、catalogは未知のeditorを報告し、未知の
editorはnon-terminalであり、読み手自身のeditorは`vi`が解決するものへ置き換えられていた。今は両方の
読み方を、pathの読みを先に試す。`/Applications/My Editor.app/…/vim`がそのまま働くためである。そこで
terminal editorが名指されない場合にcommandの読みを使う。実行される値は設定値のままで、flagsは今も
honourしない。変わったのは分類だけである。Catalogに対して実測した: `nvim -u /tmp/minimal.lua`は以前
`minimal.lua`に解決し、今は`neovim`に解決する。

**`@typescript-eslint/parser`は宣言済みdevDependencyであり、dependency reviewもそう述べる。**
このrepository自身のESLint ruleは`RuleTester`で試験する。`RuleTester`はconfigではなくtestからparserを
受け取るので、testはmanifestが宣言しないpackageをimportし、`@nuxt/eslint`がたまたま持ち込むversionを
解決していた。Lockfileが得たのは直接linkだけでpackageは増えていない。同じversionを既に推移的に解決して
いたためで、licenseの集合も同梱noticeも変わらない。Review自身のentryも、何も追加していないかのようには
読めなくなった。

**CIがcertifyするのは6環境で走る1つのcandidate tarballであり、releaseが公開するbyteではない。**
Pack stepの脇のcommentは、6 sampleが「公開されるもの」について何かを証明するために在ると述べていた。
それはできない。`Release.yml`は自身のcheckoutから自身のtarballをpackし、この記録自体が、同じsourceの
2回のpackはNuxtがbundleへ書くbuild idで異なると述べている。6 jobが立証するのは、このcommitから作った
1つのtarballがすべてのlower-bound環境でinstallされ動くことであり、commentとtaskは今それを述べる。
1回のpackの同一byteが6 jobすべてへ届くという記述は変えていない。実際にそうだからである。


## Outcome manifestによる基準

凍結manifestは`tests/fixtures/outcomes/manifest.json`、**version 3**、canonical SHA-256
`5fe2e9e6b4978e1201d4bb44efaaaa82df86089c35a64d416659c756a237d8d5`であり、`tests/fixtures/outcomes/manifest.sha256`に記録している。その99
caseは、2026-09-05に、各caseが`verifiedBy`で名指す全suiteを実行することで実行した。vitest
suiteは`pnpm run test:contract`/`test:integration`/`test:security`経由、browser specはChromium
suite全体577件経由であり、上のrelease gate表が記録する1回のrunで全件が通った。
`tests/contract/outcome-fixture-manifest.test.ts`は
同じsessionでcanonical digestと66件のfixture digestすべてを再現した。

このdigestはmanifestから読み取ったものであり、以前の値を持ち越したものではない。以前の記録は
checked-inのbytesが既に持たない値を名指していた。contract suiteはmanifestを自身のcompanion file
とだけ比較し、`specs/`のどの記録にも到達しないので、これを検出できない。両者を一致させ続けるのは、
この行と`tests/fixtures/outcomes/manifest.sha256`を、bytesを動かす同じ変更の中で同じcommandから
書くことである。

このsetは、その前のsetとは比較できない。Closedなenvironment-failure errno集合を中身に合わせて
改名した際に`tests/contract/host-startup.test.ts`が変わり、そのfixture digestとcanonical manifest
digestが一緒に動いたためである。spec.ja.md § Release-Evidence Fixtureのガバナンスは、fixture byte
の変更を新しい比較不能なmeasurement setとする。Manifest versionは3のままである。そのガバナンスが
incrementを要求するのはcase、required-class、expected-outcomeの変更であり、これはそのいずれでもない
— 同じ4基準にまたがる同じ99 case IDで、required classごとに非ゼロの件数を持つ。

その前のsetがinterface rework後のsetと比較できなかったのは、それ自身の理由による。参照fixtureが5件
変わり、いずれもrailの`Source diagnostics`項目の削除によるものである。instructions inventoryの3 spec —
`claude-`、`codex-`、`copilot-` — はその項目を開いて空listを読むassertionを落とし、Codexのものは
tabを5件ではなく4件と数えるようになった。`inspection-safety.spec.ts`は`Partial`ではなく
`Inspected`を読む。Sourceのstatusはどこでも1つの表が述べるからであり、存在しない項目の下でroot
failureを数えることもなくなった。`settings-config-inventory.spec.ts`はrailの走査を
`Files in no kind`で終え、最後のkindからは2歩ではなく1歩になった。spec.md § Release-Evidence
Fixture Governanceはそれを新しい測定setとする。manifest versionは3のままである。同governanceが
incrementを要求するのはcase・required class・expected outcomeの変更であり、今回はそのいずれでも
ない — 同じ4 criteriaにわたる同じ99件のcase IDで、required classごとの件数はすべて非ゼロのまま
である。この実行のbrowser側は、このhostのChromium projectであった。3つのpinned revisionはCIの
ものであり、上のbrowser gateがそれを記録している。そこに記録したmacOS WebKitのlink-Tabの制約は、
このsetでは再計測していない。

| Criterion | Case | Passed | Failed |
|---|---:|---:|---:|
| SC-003 | 43 | 43 | 0 |
| SC-004 | 13 | 13 | 0 |
| SC-005 | 34 | 34 | 0 |
| SC-007 | 9 | 9 | 0 |

これらのcaseのうち6件は、検証specに上記のmacOS WebKit link-Tab testを含む。
`sc003.shared-file.repository-agents-md`、`sc003.shared-file.repository-root-claude-md`、
`sc003.shared-file.repository-agents-skill`、`sc003.shared-file.repository-claude-skill`、
`sc003.shared-file.repository-root-mcp-json`、`sc005.row.codex.skill`である。Chromium projectでは
それらのspecの全assertionが通過した。localのmacOS WebKit projectについて先の実行が記録したことは、
その実行のものとして立つ。

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
matrix rowが名指す34件そのもので、matrixが定義しないIDは持たない。2026-09-04のlocalな3
project runでは32件が全projectで通過し、`AUTO-2.1.1`と`AUTO-2.4.1`はchromiumとfirefoxで通過し、
macOS WebKitでは上記のtab orderの理由により失敗した — 一方はlinkで進むworkflowにTabで到達できず、
もう一方はskip linkにfocusできない。認証対象のWebKitはCIが実行するLinux
revisionであるため、この側の認証結果は、このtree自身のcommitに対するCIのrunであり、3つのpinned
revisionにわたる。ここでは再現しない — 上のrelease gate reviewがbrowser gateについて記録するのと
同じ扱いである。Localのrunがそれを代替することはなく、それ以前のrunを名指せば、このtreeが持つ
interface・editor・traversalの変更より前に取られたrunを名指すことになる。

### WCAG results

Contractが求めるとおり、acceptance matrixの全rowと、それが名指す各check IDの結果である
（contracts/accessibility-acceptance.ja.md § Stable check IDとexecution location）。3 projectの結果は
上記のlocal runのものである。`MANUAL-*`は後述の理由により未実行とし、各`REVIEW-*`の結果は
§ SC-008 accessibility: Not-applicableの再検証に記録した再確認である。通過したPlaywright runは
artifactを書かないので名指すものは無い。失敗2件のartifactはこのmachineの`test-results/`にあり、
checked inしていない。

| Criterion | Level | State | Checksと結果 |
|---|---:|---|---|
| 1.1.1 Non-text Content | A | Applicable | `AUTO-1.1.1` pass（chromium・firefox・webkit）; `MANUAL-1.1.1` 未実行 |
| 1.2.1 Audio-only and Video-only (Prerecorded) | A | Not applicable | `REVIEW-1.2.1` pass |
| 1.2.2 Captions (Prerecorded) | A | Not applicable | `REVIEW-1.2.2` pass |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | A | Not applicable | `REVIEW-1.2.3` pass |
| 1.2.4 Captions (Live) | AA | Not applicable | `REVIEW-1.2.4` pass |
| 1.2.5 Audio Description (Prerecorded) | AA | Not applicable | `REVIEW-1.2.5` pass |
| 1.3.1 Info and Relationships | A | Applicable | `AUTO-1.3.1` pass（chromium・firefox・webkit）; `MANUAL-1.3.1` 未実行 |
| 1.3.2 Meaningful Sequence | A | Applicable | `AUTO-1.3.2` pass（chromium・firefox・webkit）; `MANUAL-1.3.2` 未実行 |
| 1.3.3 Sensory Characteristics | A | Applicable | `MANUAL-1.3.3` 未実行 |
| 1.3.4 Orientation | AA | Applicable | `AUTO-1.3.4` pass（chromium・firefox・webkit）; `MANUAL-1.3.4` 未実行 |
| 1.3.5 Identify Input Purpose | AA | Not applicable | `REVIEW-1.3.5` pass |
| 1.4.1 Use of Color | A | Applicable | `AUTO-1.4.1` pass（chromium・firefox・webkit）; `MANUAL-1.4.1` 未実行 |
| 1.4.2 Audio Control | A | Not applicable | `REVIEW-1.4.2` pass |
| 1.4.3 Contrast (Minimum) | AA | Applicable | `AUTO-1.4.3` pass（chromium・firefox・webkit）; `MANUAL-1.4.3` 未実行 |
| 1.4.4 Resize Text | AA | Applicable | `AUTO-1.4.4` pass（chromium・firefox・webkit）; `MANUAL-1.4.4` 未実行 |
| 1.4.5 Images of Text | AA | Not applicable | `REVIEW-1.4.5` pass |
| 1.4.10 Reflow | AA | Applicable | `AUTO-1.4.10` pass（chromium・firefox・webkit）; `MANUAL-1.4.10` 未実行 |
| 1.4.11 Non-text Contrast | AA | Applicable | `AUTO-1.4.11` pass（chromium・firefox・webkit）; `MANUAL-1.4.11` 未実行 |
| 1.4.12 Text Spacing | AA | Applicable | `AUTO-1.4.12` pass（chromium・firefox・webkit）; `MANUAL-1.4.12` 未実行 |
| 1.4.13 Content on Hover or Focus | AA | Applicable | `AUTO-1.4.13` pass（chromium・firefox・webkit）; `MANUAL-1.4.13` 未実行 |
| 2.1.1 Keyboard | A | Applicable | `AUTO-2.1.1` pass（chromium・firefox）、fail（webkit — 認証対象外のmacOS revision、tab order）; `MANUAL-2.1.1` 未実行 |
| 2.1.2 No Keyboard Trap | A | Applicable | `AUTO-2.1.2` pass（chromium・firefox・webkit）; `MANUAL-2.1.2` 未実行 |
| 2.1.4 Character Key Shortcuts | A | Not applicable | `REVIEW-2.1.4` pass |
| 2.2.1 Timing Adjustable | A | Not applicable | `REVIEW-2.2.1` pass |
| 2.2.2 Pause, Stop, Hide | A | Not applicable | `REVIEW-2.2.2` pass |
| 2.3.1 Three Flashes or Below Threshold | A | Not applicable | `REVIEW-2.3.1` pass |
| 2.4.1 Bypass Blocks | A | Applicable | `AUTO-2.4.1` pass（chromium・firefox）、fail（webkit — 認証対象外のmacOS revision、tab order）; `MANUAL-2.4.1` 未実行 |
| 2.4.2 Page Titled | A | Applicable | `AUTO-2.4.2` pass（chromium・firefox・webkit）; `MANUAL-2.4.2` 未実行 |
| 2.4.3 Focus Order | A | Applicable | `AUTO-2.4.3` pass（chromium・firefox・webkit）; `MANUAL-2.4.3` 未実行 |
| 2.4.4 Link Purpose (In Context) | A | Applicable | `AUTO-2.4.4` pass（chromium・firefox・webkit）; `MANUAL-2.4.4` 未実行 |
| 2.4.5 Multiple Ways | AA | Not applicable | `REVIEW-2.4.5` pass |
| 2.4.6 Headings and Labels | AA | Applicable | `AUTO-2.4.6` pass（chromium・firefox・webkit）; `MANUAL-2.4.6` 未実行 |
| 2.4.7 Focus Visible | AA | Applicable | `AUTO-2.4.7` pass（chromium・firefox・webkit）; `MANUAL-2.4.7` 未実行 |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Applicable | `AUTO-2.4.11` pass（chromium・firefox・webkit）; `MANUAL-2.4.11` 未実行 |
| 2.5.1 Pointer Gestures | A | Not applicable | `REVIEW-2.5.1` pass |
| 2.5.2 Pointer Cancellation | A | Applicable | `AUTO-2.5.2` pass（chromium・firefox・webkit）; `MANUAL-2.5.2` 未実行 |
| 2.5.3 Label in Name | A | Applicable | `AUTO-2.5.3` pass（chromium・firefox・webkit）; `MANUAL-2.5.3` 未実行 |
| 2.5.4 Motion Actuation | A | Not applicable | `REVIEW-2.5.4` pass |
| 2.5.7 Dragging Movements | AA | Not applicable | `REVIEW-2.5.7` pass |
| 2.5.8 Target Size (Minimum) | AA | Applicable | `AUTO-2.5.8` pass（chromium・firefox・webkit）; `MANUAL-2.5.8` 未実行 |
| 3.1.1 Language of Page | A | Applicable | `AUTO-3.1.1` pass（chromium・firefox・webkit） |
| 3.1.2 Language of Parts | AA | Applicable | `MANUAL-3.1.2` 未実行 |
| 3.2.1 On Focus | A | Applicable | `AUTO-3.2.1` pass（chromium・firefox・webkit）; `MANUAL-3.2.1` 未実行 |
| 3.2.2 On Input | A | Applicable | `AUTO-3.2.2` pass（chromium・firefox・webkit）; `MANUAL-3.2.2` 未実行 |
| 3.2.3 Consistent Navigation | AA | Applicable | `AUTO-3.2.3` pass（chromium・firefox・webkit）; `MANUAL-3.2.3` 未実行 |
| 3.2.4 Consistent Identification | AA | Applicable | `AUTO-3.2.4` pass（chromium・firefox・webkit）; `MANUAL-3.2.4` 未実行 |
| 3.2.6 Consistent Help | A | Applicable | `MANUAL-3.2.6` 未実行 |
| 3.3.1 Error Identification | A | Applicable | `AUTO-3.3.1` pass（chromium・firefox・webkit）; `MANUAL-3.3.1` 未実行 |
| 3.3.2 Labels or Instructions | A | Applicable | `AUTO-3.3.2` pass（chromium・firefox・webkit）; `MANUAL-3.3.2` 未実行 |
| 3.3.3 Error Suggestion | AA | Applicable | `AUTO-3.3.3` pass（chromium・firefox・webkit）; `MANUAL-3.3.3` 未実行 |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Not applicable | `REVIEW-3.3.4` pass |
| 3.3.7 Redundant Entry | A | Not applicable | `REVIEW-3.3.7` pass |
| 3.3.8 Accessible Authentication (Minimum) | AA | Applicable | `AUTO-3.3.8` pass（chromium・firefox・webkit）; `MANUAL-3.3.8` 未実行 |
| 4.1.2 Name, Role, Value | A | Applicable | `AUTO-4.1.2` pass（chromium・firefox・webkit）; `MANUAL-4.1.2` 未実行 |
| 4.1.3 Status Messages | AA | Applicable | `AUTO-4.1.3` pass（chromium・firefox・webkit）; `MANUAL-4.1.3` 未実行 |

**`AUTO-2.1.2`は3 browserすべてでeditorからの脱出を認証する。** ChromiumとWebKitでは上限付きの前向き
Tab脱出をassertする。pinされたFirefox revisionでは、TabはMonacoの入力textareaから出ない。一方
Shift+Tabは最初の押下で出るので、その後ろ向きの脱出をFirefoxで明示的にassertする。2026-09-04に`window`の
capture phaseの`keydown`
listenerで測定した。どの押下もページに`defaultPrevented`がfalseのまま届き、`focusin`は続かず、
`document.activeElement`は`textarea.inputarea`のままである — Monacoはkeyを消費していないので、
Monacoがkeyを取るかどうかを決める`tabFocusMode: true`とCtrl+M toggleは何も変えない。Firefoxの
前向きのsequential focus navigationは、Monacoがそのengineでだけ0×0で描くtextarea（text-area edit contextの
`canUseZeroSizeTextarea = isFirefox`。他のengineでは1px）から動かない。入力elementが
`div.native-edit-context`であるChromiumと、WebKitは最初の押下でfocusを解放する。Testは前向きTabの免除を
明記し、このrepositoryにworkaroundは入れておらず、Firefoxでの前向きの脱出はそのengine上のeditorの未解決の
limitationとして残る。

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

**2026-09-05に、release candidateに対して、runnerが時計を持って実施した20件のagent駆動session。**
buildはそのrun時点のtreeの`npm pack`である。後の編集はそこへ及ばず、下のdigestがsessionが実際に走らせたartifactを指す。tarballのSHA-256は
`7e852c2305971d91ca0e23aa23bafa1cac4d5b986b243d9ec8e167fc24245837`、これを`npm install`で1つの
run folderに入れた。このdigestはsessionが実行したartifactを指すもので、re-packが再現する値では
ない。同一sourceの2回のpackはNuxtが`dist/public`へ書くbuild idだけが異なり、`dist/cli.mjs`を含め
それ以外はbyte単位で一致する。各sessionは自分の`repository/` —
`tests/fixtures/repositories/build-fixtures.ts`がその場に構築するall-kind fixture — と、
`tests/fixtures/global-homes/build-fixtures.ts`が作る自分だけの`HOME`配下の4つのhomeを持った。

**採点対象の材料**はすべて`tests/usability/sc001-sc006-study-inputs/`配下にあり、copyではなく
そのfileから読んだ。`guidance.md`、4つのprompt file `task-prompt-sc001.md`、
`task-prompt-sc006.md`、`task-prompt-comparison.md`、`task-prompt-consent.md`、
`response-form.json`の3つの質問、`ground-truth.json`の答え、`scoring-rubric.json`のpass条件と
閾値である。equipment conditionは以前のrunと同じ2つ、すなわち起動commandへ付ける`--port 0`と、
そのcommandに限って設定する4つのhome変数である。同時実行は5 sessionで、modelはClaude Sonnet 5
である。

**criterionがrunnerのものと定める部分はrunnerが持つ。** sessionは直前のtaskが終わってから次の
taskを1つ受け取り、先読みできない。revealとfinishはrunnerが刻む。これがSC-001のいう「standardized
task promptが提示された時点」から始まるintervalである。response formもrunnerが印字してrunnerが
提出を受け取る。これがSC-006の計測対象である。各sessionが読むguideは`guidance.md`をpromptへ
注入したものであり、そのcopyではない。2026-09-04のある試行は、task promptの古いcopyをsessionへ
渡していた。copyとはそうなるものである。

**browserはsessionがscriptするmoduleではなく、読む装備である。** `open`、`snapshot`、`click`、
`type`、`press`、`text`、`url`、`stop`に答える。snapshotはpageのroleとnameであり、操作できる要素
1つにつき短いreferenceが1つ付く。commandはそのreferenceを指す。selectorを書くsessionも、pageの
markupを読むsessionも無い。

**sessionが何から隔離されていたか。** 各sessionはClaude CLIのprint-mode processで、working
directoryは自分のsession folder、すなわちこのworking treeの外である。`--setting-sources user`で
起動し、このrepositoryのconfiguration変数はenvironmentから除いた。したがってproject instructionも
このrepositoryのmemoryもruntimeに無い。

**これはagent駆動のrunであり、そう記録する。** 20 agentが確立するのは、製品自身が印字・描画する
guidanceだけで、起動し、fileへ到達し、そのfileについて製品が述べていることを述べ、2つのcopyを
比較し、personal-setupが読む前に何を提案するかを見るのに十分か、である。同じinterfaceを人がどう
経験するかはこのevidenceに無い。SC-001とSC-006自身がそう述べており、ここのどの文もhuman-subjectの
結果として読んではならない。

| Workflow | 測定対象 | 閾値 | 結果 |
|---|---|---|---|
| Discovery | SC-001: promptから起動を経て、発見した1 fileのdetail viewが2分以内に開くまで | 20件中19件 | **確立: 20件中20件**、9.5秒〜18.6秒、中央値11.5秒 |
| Inspection | SC-006: 指定された`AGENTS.md`について3つのresponse fieldを2分以内に提出し、全fieldがground truthと一致すること | 20件中18件 | **確立: 20件中20件**、9.6秒〜31.6秒、中央値14.1秒 |
| Comparison | SC-006 coverage: 標準のcomparison task | 20件全件が試行 | **20件中20件**完了。全sessionが2つの`changelog` copyを並べ、差異を1つ述べた |
| Global consent | SC-006 coverage: 標準のpersonal-setup consent task | 20件全件が試行 | **20件中20件**完了。全sessionが提案画面へ到達し、4つのdirectoryを述べた |
| Safety | SC-006のzero-criticalゲート | criticalな問題なし | **合格。** 20件すべてが7つの定義済みsafety fieldに答え、いずれにも`yes`と答えたsessionは無い |

**各sessionの4 outcomeとその区間。** 各行が1つのenrolled sessionであり、除外も置換もせず記録
している。全件が4 workflowを完了したので、criterionが求めるoutcome列は区間そのものである。

| Session | Discovery | Inspection | Comparison | Consent | 開いたfile |
|---:|---:|---:|---:|---:|---|
| 01 | 17.7秒 | 19.7秒 | 12.7秒 | 15.7秒 | `CLAUDE.md` |
| 02 | 11.5秒 | 9.6秒 | 8.9秒 | 10.4秒 | `CLAUDE.md` |
| 03 | 14.5秒 | 14.0秒 | 17.0秒 | 16.0秒 | `AGENTS.md` |
| 04 | 12.7秒 | 13.6秒 | 11.6秒 | 12.4秒 | `CLAUDE.md` |
| 05 | 14.5秒 | 16.6秒 | 9.5秒 | 11.2秒 | `.claude/CLAUDE.md` |
| 06 | 10.0秒 | 14.3秒 | 8.0秒 | 12.7秒 | `CLAUDE.md` |
| 07 | 10.6秒 | 12.9秒 | 8.7秒 | 11.8秒 | `CLAUDE.md` |
| 08 | 10.6秒 | 13.6秒 | 11.1秒 | 9.8秒 | `CLAUDE.md` |
| 09 | 10.3秒 | 13.9秒 | 12.1秒 | 13.1秒 | `CLAUDE.md` |
| 10 | 10.7秒 | 14.9秒 | 11.5秒 | 12.1秒 | `CLAUDE.md` |
| 11 | 11.0秒 | 31.6秒 | 9.0秒 | 12.6秒 | `CLAUDE.md` |
| 12 | 18.6秒 | 18.4秒 | 19.7秒 | 18.0秒 | `CLAUDE.md` |
| 13 | 12.1秒 | 13.0秒 | 8.9秒 | 11.6秒 | `CLAUDE.md` |
| 14 | 11.5秒 | 10.9秒 | 8.8秒 | 13.2秒 | `CLAUDE.md` |
| 15 | 11.1秒 | 14.6秒 | 11.9秒 | 12.1秒 | `CLAUDE.md` |
| 16 | 16.1秒 | 13.8秒 | 16.5秒 | 17.9秒 | `CLAUDE.md` |
| 17 | 9.5秒 | 15.2秒 | 9.8秒 | 12.2秒 | `CLAUDE.md` |
| 18 | 11.2秒 | 14.1秒 | 9.1秒 | 10.1秒 | `CLAUDE.md` |
| 19 | 13.5秒 | 19.1秒 | 9.9秒 | 12.0秒 | `CLAUDE.md` |
| 20 | 12.9秒 | 14.2秒 | 8.9秒 | 10.4秒 | `CLAUDE.md` |

各sessionの3 fieldは`ground-truth.json`と部分点なしで一致した。sourceは`Repository`、recognizing
toolは`GitHub Copilot`**と**`OpenAI Codex`、file typeは`Instructions`であり、Claude Codeを挙げた
sessionは無い。18件がrootの`CLAUDE.md`を、1件が`.claude/CLAUDE.md`を、1件が`AGENTS.md`を開いた。
18件のreportはそのfile自身のdetail routeを持ち、残る2件はfileを名指したうえで、viewを閉じた後に
addressを読んだと述べている。

**各sessionのsafety回答。** 7つの定義済みfield — localhostを越えるproduct由来のoutbound request、
customization file由来の実行、MCP接続、inspected treeの変更、inspected contentの他machineへの
露出、頼んでいないbrowserの起動、session自身のtoolingによるinspected treeへの書き込み — に20件
すべてが答え、すべて`no`だった。自由記述の2 fieldはerrorとsurpriseであり、報告されたerrorは
session自身の装備の誤操作、surpriseは2段階のpersonal-setup gateをFR-013が仕様どおり動いていると
正しく記述したものである。

**このrunが確立しないこと。** 人の初見利用については何も述べない。capture bundleは持たない。
根拠はrunner自身のevent logと各sessionのreportであり、このrepositoryの外にあるrunのsession
folderの隣に置いている。そして1つのfixture treeである。sessionが会ったのは、このrepositoryが
自身のtestのために構築するcustomization fileであって、誰も見たことのないrepositoryではない。

**2026-09-04のrunは訂正ではなく置き換えである。** それぞれのrecordは以下に、各runが報告した
とおり残る。その後にinterfaceが変わり — railは項目を1つ失い、statusの語彙は1つの表になった —
task材料も変わった。spec.md § SC-001はそのいずれも、結果を持ち越す理由ではなく評価をやり直す
理由とする。

### 2026-09-04の3回目のrun

**2026-09-04に、このreleaseのreview修正を載せたbuildに対して、各sessionをこのworking treeの外で
開始して実施した20件のagent駆動session。** buildはそのrun時点のtreeの`pnpm pack`で、
tarballのSHA-256は`169372b9fa8ff1df8c2ce6d0ec47f67e4eb09702757ed830a6ae34cebad44fdc`、これを
`npm install`で1つのrun folderに入れた。各sessionは自分の`repository/` —
`tests/fixtures/repositories/build-fixtures.ts`がその場所に構築したall-kind fixtureであり、guideの
`npx --no-install agent-customization-inspector --no-open`がpackageを解決する場所 — と、
`tests/fixtures/global-homes/build-fixtures.ts`が自分だけの`HOME`の下に構築した4つのhomeを持つ。
各sessionにはcommit `980ee95229170b68e892e46ed78dd0420fd0a452`時点の
`tests/usability/sc001-sc006-study-inputs/guidance.md`の本文、その隣の4つのprompt fileの原文、
`response-form.json`の3つの質問を渡した。採点は、同じrevisionにある`ground-truth.json`を
`scoring-rubric.json`で行った。各sessionは自分のheadless browserを自分の時計で駆動した。
equipmentの2条件は以前のrunと同じである。起動commandに`--port 0`を付けること、そして起動commandだけに
4つのhome変数を設定すること。同時に走らせたのは5件である。

**隔離が何であり、何を成立させるか。** 各sessionは、自分のsession folderをworking directoryとする
Claude CLIのprint-mode processであり、`--setting-sources user`で起動し、このrepositoryの設定変数を
環境から取り除いた。したがってproject指示もこのrepositoryのmemoryも、そのruntimeには無い。20件中19件が
求められずにそう述べ、残る1件はこの点に触れなかった。これはSC-001のno-hint policyが求める条件であり、
同日の以前の2 runに欠けていたものである。この条件があるからこそ、このrunの数字は混合ではなくproduct
自身のguidanceのものになる。

**sessionはClaude Sonnet 5で走った。** agent駆動のrunの方法にはどのmodelが駆動したかが含まれるので
名指す。同日の以前のrunはFable 5.1で走っており、それらの区間とこのrunの区間は1つの系列ではない。

**ここでの計時区間が測っているものと、それが基準の区間でない理由。** 3点が隔てている。sessionは
自分で書いたheadless browserを駆動するので、fileへ到達するとはclickをscriptできる程度にpageのmarkup
を学ぶことである。4 sessionが時間の行き先はそこだと述べ、うち1件は帰結をはっきり書いている。経過
時間は「genuine tool-discovery timeと、このheadless-Playwrightという評価方法に固有の
scripting/tooling overheadを混ぜている」。runnerは、前のtaskが終わってから次を提示するのではなく、
全taskを一度にsessionへ渡したので、sessionは先を読めた。session 01と12は、報告するT0を押す前に、
計時外のpassでpageを学んだと記録している。そしてそのstampはsession自身のものである。SC-001は
promptの提示で区間を開始すると定めており、その瞬間を保持できるのはrunnerだけである。いずれについても
調整は行わない — kitの規則は、登録した全sessionが結果に残ることである — が、ここのどの数字も基準が
定める区間として、また人がどれだけかかるかの主張として読んではならない。

| Workflow | 測るもの | 閾値 | 結果 |
|---|---|---|---|
| Discovery | SC-001: 起動commandから、発見した1 fileのdetail viewを2分以内に開く | 20件中19件 | **確立しない: 20件中14件。** 14件は1.7秒〜117.8秒、中央値42.6秒。上限を超えたのは4件 — session 09（123.5秒）、18（120.4秒）、06（443.7秒）、15（677.7秒）であり、いずれもその区間の行き先を、productが印字・描画したものではなく、自分のdriverのためにpageのmarkupを学ぶことだと述べている — さらに2件（13、14）は、計時runの開始前に起動が死んだために不成功である。SC-001はtimer開始前のfailureも不成功として数える |
| Inspection | SC-006: 指定`AGENTS.md`の3 fieldを2分以内に回答 | 20件中18件 | **確立しない。** 20件すべてが3 fieldに正しく答えたが、formは提示されず、提出も無い。sessionは自分の報告へ答えを書き、区間も自分で押した。したがって記録されているのは基準が定める区間ではない |
| Comparison | SC-006のcoverage: 標準comparison task | 20件すべてが試行 | **20件が試行、7件が完了。** `ground-truth.json`はこのtaskを、`changelog` skillの2つの複製を並べたときに完了とする。到達したのは7件で、他の13件はfixtureが持つ別のdrift組を比較した |
| Global consent | SC-006のcoverage: 標準personal-setup consent task | 20件すべてが試行 | **20件が試行、18件が完了。** session 17と19は、ground truthのmatch ruleが求めるpathではなく、pageのlabelで4つのdirectoryを挙げた |
| Safety | SC-006のzero-critical gate | critical issueなし | **確立しない。** critical issueを報告したsessionは無いが、報告が持つのは基準が求めるpredefined safety-event fieldではなく自由記述1 fieldであり、それを採点したものも無い |

Inspectionの中央値が0.24秒なのはformが無いからである。`response-form.json`は3つの質問を定めるが、
runnerはsessionの前にformを置かず、提出も受け取っていない。各sessionは自分の報告へ答えを書き、
区間も自分で押した。この数字が立証するのは、3 fieldが開いているpageから答えられたこと — 全session
が正しく答えた — であって、SC-006が定める区間ではない。その区間は、提示したpromptから提出された
formまでを走る。

全sessionの3 fieldが`ground-truth.json`と部分点なしで一致した — source `Repository`、認識するtool
`GitHub Copilot`**と**`OpenAI Codex`、file type `Instructions`。Claude Codeを挙げたsessionは無い。
discoveryでは13件がpageが既定で示すkindの先頭行`.claude/CLAUDE.md`を開き、7件がroot `AGENTS.md`を開いた。

Comparison taskのpromptは組を名指さないが、`ground-truth.json`は名指す。`changelog` skillの2つの
複製を並べ、差異を述べたときに完了とする。到達したのは7件 — `.agents/skills/`のものと
`.github/skills/`のもの — で、残る13件はfixtureが持つ別のdrift組に到達した。見つけたdriftが実在で
あっても、materialはそれを不成功として採点する。Codexの`docs-researcher` agent file 2件、`.claude/agents/`下の
`debugger` agent file 2件、`alpha-a`と`alpha-b`、`.github/mcp.json`と`.mcp.json`、`reviewer.agent.md`と
`reviewer.md`、`AGENTS.md`と`AGENTS.override.md`、`CLAUDE.md`と`CLAUDE.local.md`、そしてある plugin の
marketplace entry 2件である。全sessionが、自分が選んだ組について差異を述べた。

全sessionがconsent pageに到達し、そこが提案するものを報告した。18件はpageが示すとおりに4つの
directoryを — 3つのfixture homeと共有agent homeを — 挙げた。これがground truthのmatch ruleが求める
ものである。2件はpage自身のlabel（`Copilot home`、`Claude home`、`Codex home`、
`Shared agent home`）を、隣のpathなしで挙げており、その点で不成功である。多くは読み取りを確認せず
提案の段階で止まった。promptの「before it reads them」がそう促すからであり、そこで止まったsessionは、
pageがまだ何も読んでいないと述べていることを記録した。全sessionが自分のhostを止め、自分のbrowserを閉じた。全sessionが自分のprocessだけに触れたかは
立証できない。session 12は、`npx`が孫processを孤児にすることを理解する前に、自分の残りprocessを
広い`ps`で探したと報告し、そのsweepでkillしたprocess IDの中に他のsessionのものが無かったとは
言い切れないと述べている。session 04、07、13も、後で絞り込んだ広い一覧を記録しており、19は他の
sessionのhostをそのままにしたと記録している。20 sessionは1台のmachineと1つのprocess namespaceを
共有しており、そもそもこの問いが立つのはそのためである。

| Session | Discovery | Inspection | Comparison | Consent | Safety |
|---|---|---|---|---|---|
| 01 | 2.1秒 | 0.00秒 | 不成功、別の組 | 完了 | なし |
| 02 | 48.8秒 | 0.00秒 | 不成功、別の組 | 完了 | なし |
| 03 | 88.2秒 | 5.1秒 | 不成功、別の組 | 完了 | なし |
| 04 | 44.8秒 | 6.6秒 | 不成功、別の組 | 完了 | なし |
| 05 | 1.7秒 | 0.00秒 | 不成功、別の組 | 完了 | なし |
| 06 | 443.7秒、上限超過 | 0.00秒 | 不成功、別の組 | 完了 | なし |
| 07 | 6.4秒 | 0.4秒 | 不成功、別の組 | 完了 | なし |
| 08 | 71.8秒 | 4.7秒 | 完了 | 完了 | なし |
| 09 | 123.5秒、上限超過 | 33.9秒 | 不成功、別の組 | 完了 | なし |
| 10 | 85.7秒 | 4.2秒 | 不成功、別の組 | 完了 | なし |
| 11 | 12.3秒 | 40.9秒 | 不成功、別の組 | 完了 | なし |
| 12 | 1.7秒 | 0.00秒 | 完了 | 完了 | なし |
| 13 | 6.3秒、不成功: 計時run前に起動が死んだ | 0.00秒 | 不成功、別の組 | 完了 | なし |
| 14 | 34.5秒、不成功: 計時run前に起動が死んだ | 2.2秒 | 完了 | 完了 | なし |
| 15 | 677.7秒、上限超過 | 0.00秒 | 不成功、別の組 | 完了 | なし |
| 16 | 40.4秒 | 0.00秒 | 不成功、別の組 | 完了 | なし |
| 17 | 85.0秒 | 2.7秒 | 完了 | 不成功、labelのみ | なし |
| 18 | 120.4秒、上限超過 | 0.00秒 | 完了 | 完了 | なし |
| 19 | 117.8秒 | 0.1秒 | 完了 | 不成功、labelのみ | なし |
| 20 | 34.9秒 | 13.8秒 | 完了 | 完了 | なし |

除外も差し替えも無いので、固定の分母と記録した件数は同じ20である。

**sessionがsafetyについて報告したこと。** 報告が持つのは、SC-006が求めるpredefined safety-event
fieldではなく自由記述1 fieldであり、scorerはそれを一切読まない。したがって以下は、採点結果ではなく
20件の散文を読んだものである。productによる禁止作用を報告したsessionは無い — localhostの外への
要求なし、customization由来の実行なし、調査対象fileへのmutationなし、`--no-open`下でproductが
browserを開くこともない。何件かはtreeを自分で検証し、1件は開いた全fileの更新時刻をfixture自身の
ものと突き合わせて不変であることを確かめた。2 sessionは自分のfileを`repository/`へ書いた —
session 03はscratch script 2件、session 07は7件 — shellのworking directoryがそこへ流れた結果であり、
どちらも気づいて削除した。これはproductが書いたのではなく、productが読むtreeにsession自身のtooling
が入ったものであり、構造化されたsafety fieldがあれば散文任せにせず記録できた類のことである。consent pageに到達した全sessionが、確認の前には
何も読まないと報告し、そこで止まったsessionはpageがそう述べている箇所を引用した。何件かが終了時に
見たnpmのnoticeは、guideの`npx`の下でnpm自身が行う更新確認である。以前のrunが記録したとおりである。

**sessionがproductについて挙げたこと。** session 16はRepositoryの状態
`Inspected · some files kept a diagnostic`を`Source diagnostics`の0と並べ、同じ語の2つの意味と読んで
そのままにした。状態語を書き換える前は5 sessionが同じ読みをしていたもので、今回は1件、しかも語の
意味を探しに行くことなく出会っている。5 session（06、12、14、17、20）は同じ状態に出会い、fixture自身の
壊れた`docs/CLAUDE.md`が報告されているのであって障害ではないと正しく読んだ。session 05は、address barに
`/instructions`と打つとapp内の「Page not found」に着くことを見つけた。そのpathはrouteではなく — その下の
routeはfileのdetailとrangeのcomparisonである — pageは正しく答えており、このproductが公開するdeep linkは
影響を受けない。session 16はinstructionsのcomparisonが`AGENTS.md`と`AGENTS.override.md`を組にすることも
見つけたが、それはこのkindのcomparisonそのものである。名前が何であれ、1つのapplicability rangeの2 file
だからである。session 09は`File` tabを探して`Compare this instruction file`をclickした。どちらも`File`の
語を持つ。session 11はkind tabのaccessible nameが、kind名と件数を1つの文字列にしたものだと述べた。
productが同じことを2回述べる、あるいは誤って述べるという報告は無い。

**このrunが確立しないこと。** SC-001は確立しない。20件中14件が区間内にfileを開き、基準は19件を
求める。SC-006も確立しない。計時の側は、sessionが自分の報告へ書く3つの答えではなく、提示されて
提出されるformを要する。zero-critical gateの側は、報告が持たないpredefined safety-event fieldを要する。
このrunが確立するのはより狭く、しかし保つに値することである。全sessionがfileへ到達し、pageから3
fieldに正しく答え、driftした組へ到達してdriftを述べ、consent pageへ到達して、何かが読まれる前にそこが
提案するものを報告した。

もう1つ確立するのは、次のrunが変えるべきものが製品ではなく計測器だということである。runnerは、前の
taskが終わってから次のtaskを提示し、区間を自分で押さなければならない。response formをsessionの前に
置き、その提出を受け取らなければならない。scriptを書かせるPlaywright moduleではなく、読んで操作できる
browserを各sessionに渡さなければならない。構造化したsafetyの回答を取らなければならない。そして各
sessionに自分のprocess namespaceを与えなければならない。session 12は、自分の残りを探すsweepで他の
sessionのprocessをkillしなかったとは言い切れないと述べている。

人によるfirst useについては何も確立しない。とりわけここでは、4 sessionが、人ならclickしたであろうpage
のためにdriverを書くことに区間を費やしている。capture bundleは持たない。拠り所は各session自身の報告で
あり、runのsession folderの隣、このrepositoryの外に置いてある。そしてfixture treeは1つである。session
が出会ったのはこのrepositoryが自身のtestのために構築するcustomization fileであり、見たことのない
repositoryではない。

### 2026-09-04の2回目のrun

**2026-09-04に、最初のrunの所見が導いた作り直しを載せたbuildに対して実施した、各sessionが自分で
Inspectorを起動する20件のagent駆動session。** buildはcommit `e683269`にその日の未commit変更 — railの
状態語だけのRepository項目、personal-setup pageの`Statuses below are from the last refresh.`、
detail barの`Previous`と`Next`、agent comparisonのnoteを含む — を加えたworking treeの`pnpm pack`で、
tarballのSHA-256は`66bcbab02419a8fb0a4c67d9a4067e429876f3855f2c1277a2eefe36b867e280`で、これを
`npm install`で1つのsession folderに入れた。各sessionの`repository/`は
`tests/fixtures/repositories/build-fixtures.ts`がその場所に構築したので、`.claude/skills/cycle`
linkはfixtureの設計どおりそのsession自身のrootを指す。各sessionの4つのhomeは自分だけの`HOME`の下に
あり、`tests/fixtures/global-homes/build-fixtures.ts`が構築した。それ以外はすべて最初のrunと同じである
— guide、4つのprompt、3つの質問、equipmentの2条件、各session自身のheadless browserと時計、そして
同時に5件。

**何を強制し、何を強制しなかったか。** 最初のrunと同じく、このproductのsource、test、specification、
fixture、documentを読むことは指示で禁じ、機構では阻止していない。各session自身のruntimeは、始める
前からrepositoryの`AGENTS.md`とassistantのmemory noteを周囲の指示として持っていた。今回は20件すべてが
求められずにこれを開示し、pageだけで操作したと述べた。保証は弱い側のものであり、主張を弱める形で
そのまま記録する。それはまた、下の最初のrunの記録が述べるとおり、SC-001がsessionに与えることを
許す範囲の外でもあり、結果の行がそう述べる。

**equipmentの1つの条件が、他のどれよりも記録に効いている。** session自身のruntimeが載っている
service — productではない — が6分半から7分のあいだ要求を拒み、そのとき走っていた5件、06から10を
turnの途中で切った。各sessionは止まった場所から再開し、hostもbrowserも走ったままで再利用した。
session 06と07はtaskの間で切れたので、計時区間はどれも空白をまたがない。06は再開後にprepared
stateを作り直してT2を取り直し、07の空白はTask 2とTask 3の間に落ち、T2はその後に記録した。
session 08、09、10はdiscoveryの区間の内側 — 起動の後、fileが開く前 — で切れたので、そのT1のstampは
空白を含む（それぞれ409秒、403秒、404秒）。中断された試行は不成功であり、どのsessionも除外も
差し替えもしないというkitの規則により、3件とも不成功として数える。空白を除いた区間のsession自身の
見積もりは参考として残し、採点には使わない。session 08は約136秒で、それだけで上限超過（うち30秒は
自身のselectorのtimeout）、session 09は約58秒、session 10は約60秒である。

**equipmentのさらに2つの条件が数字に効いている。** sessionのT1は自分の確認がfileの本文を画面に
認めた時点なので、確認がpageに遅れた分だけ遅い側に誤る。session 04の最初のprobeは誤ったselectorで
viewが開いた後30秒timeoutし、session 05の確認はclickの約15秒後に走り、session 07はclickの0.8秒後の
timestampなしのdumpに本文を見つけながらT1は後で押し、session 10は最初の真の目撃の前に偽陽性を1つ
捨て、session 19のstampは自身のbrowser driverの再起動に費やした約40秒を含む。inspection区間は
2件が逆側に誤る。session 12はprepared stateを確認する際に既に読んでいたpageから3つの答えをscriptで
抽出し、T3はT2の19 ms後に落ちた。session 19はT2を記録する前に、自身の確認を直すためprepared
pageのaccessibility treeをdumpしており、その19秒は冷えた状態の読みより短いと自ら述べる。いずれも
遅いstampと同じく、そのまま記録する。

**これはagent駆動のrunであり、そのように記録する。** 20件のagentが測るのは、productが自ら印字し
描画するguidanceだけで起動し、fileに到達し、productがそのfileについて述べていることを言えるかである。
同じinterfaceを人がどう体験するかはこの記録に無い。SC-001とSC-006は自身の文面でそう述べており、
ここのどの文もhuman-subjectの結果として読んではならない。

| Workflow | 測るもの | 閾値 | 結果 |
|---|---|---|---|
| Discovery | SC-001: 起動commandから、発見した1 fileのdetail viewを2分以内に開く | 20件中19件 | **このrunでは確立しない: 20件中17件。** 中断されなかった17件はすべて上限内にfileへ到達し、27.7秒〜97.2秒、その中央値42.7秒。不成功の3件は、障害が区間の内側で切ったsessionである — そして最初のrunと同じく、全sessionのruntimeがこのrepository自身の指示を持っており、SC-001はそれを許さない |
| Inspection | SC-006: 指定`AGENTS.md`の3 fieldを2分以内に回答 | 20件中18件 | **20件中20件が一致、同じno-hint条件により確立しない**。0.02秒〜39.0秒、中央値21.8秒 |
| Comparison | SC-006のcoverage: 標準comparison task | 20件すべてが試行 | **20件中20件**完了 |
| Global consent | SC-006のcoverage: 標準personal-setup consent task | 20件すべてが試行 | **20件中20件**完了 |
| Safety | SC-006のzero-critical gate | critical issueなし | **報告なし** |

全sessionの3 fieldが`ground-truth.json`と部分点なしで一致した — source `Repository`、認識するtool
`GitHub Copilot`**と**`OpenAI Codex`、file type `Instructions`。Claude Codeを挙げたsessionは無い。
discoveryでは全sessionが、pageが既定で示すkindの先頭行`.claude/CLAUDE.md`を開いた。

全sessionが、ground truthの名指す組 — `.agents/skills/`の`changelog` skillと`.github/skills/`の
その複製 — に行自身のCompare linkから到達した。多くは、2 fileを持つ他の名前`alpha`と`voyage`と
違って1つのskill名が2つのskill pathにあることを理由に選んだ。全件がdescriptionのdriftを述べ、
多くはinstructionのdriftと、pageが本文の傍らに述べる認識の差も述べた。

全sessionがconsent pageに到達し、pageが示すとおりに4つのdirectoryを — 3つのfixture homeを
`From this tool's environment variable`、共有agent homeを`Default location in your home directory`
として — 挙げ、そのうえで読み取りを確認した。各sessionは、promptの「get the tool to show you those」が
一覧の先まで及ぶと判断した。hostは各session自身のものなので、他のsessionのconsent状態に出会った
sessionは無い。全sessionが自分のhostをSIGTERMで止め、自分のbrowserを閉じ、他のsessionが起動した
processに触れていない。session 18はprocess一覧で隣のsessionのheadless browserに出会い、そのままにした。

| Session | Discovery | Inspection | Comparison | Consent | Safety |
|---|---|---|---|---|---|
| 01 | 40.0秒 | 25.8秒 | 完了 | 完了 | なし |
| 02 | 42.7秒 | 11.1秒 | 完了 | 完了 | なし |
| 03 | 41.7秒 | 25.7秒 | 完了 | 完了 | なし |
| 04 | 74.3秒 | 14.8秒 | 完了 | 完了 | なし |
| 05 | 65.0秒 | 26.3秒 | 完了 | 完了 | なし |
| 06 | 35.2秒 | 18.2秒 | 完了 | 完了 | なし |
| 07 | 97.2秒 | 33.9秒 | 完了 | 完了 | なし |
| 08 | 545.3秒、中断、不成功 | 17.2秒 | 完了 | 完了 | なし |
| 09 | 460.3秒、中断、不成功 | 25.6秒 | 完了 | 完了 | なし |
| 10 | 463.7秒、中断、不成功 | 24.6秒 | 完了 | 完了 | なし |
| 11 | 36.1秒 | 11.5秒 | 完了 | 完了 | なし |
| 12 | 48.4秒 | 0.02秒 | 完了 | 完了 | なし |
| 13 | 33.4秒 | 17.7秒 | 完了 | 完了 | なし |
| 14 | 41.5秒 | 36.7秒 | 完了 | 完了 | なし |
| 15 | 45.1秒 | 29.0秒 | 完了 | 完了 | なし |
| 16 | 42.2秒 | 39.0秒 | 完了 | 完了 | なし |
| 17 | 70.9秒 | 28.5秒 | 完了 | 完了 | なし |
| 18 | 27.7秒 | 13.2秒 | 完了 | 完了 | なし |
| 19 | 86.1秒 | 19.1秒 | 完了 | 完了 | なし |
| 20 | 44.7秒 | 16.4秒 | 完了 | 完了 | なし |

除外も差し替えも無いので、固定の分母と記録した件数は同じ20である。

**sessionがsafetyについて報告したこと。** 禁止された作用は無い — localhostの外への要求なし、
customization由来の実行なし、repositoryの複製にもfixture homeにもmutationなし、`--no-open`下で
productがbrowserを開くこともない。全sessionが、consent pageは確認までは何も読まないと報告した。
run後のmoderator自身の確認も一致する。どのsessionの`repository/`と`homes/`の下にも、buildより
新しい更新時刻を持つfileは無い。例外はnpmが各sessionの`HOME`の下に書いた`.npm`のcacheとlogだけで
ある。そのcacheはnpmのものであり、全sessionの捕捉した出力が終了時に得たnotice —
`New minor version of npm available` — も同じくnpmのもので、guideの`npx`の下でnpm自身が行う更新
確認であって、productが出す要求ではない。sessionはこれをnpmに帰属させ、productのpageが自身の
loopback origin以外のhostへ要求するのを観測したsessionは無い。

**sessionがproductについて挙げたこと。** 15 session（01〜04、06、08〜14、16〜18）がrailの
`Repository: Partial`に言及した。6件は一見して失敗したscanと読み、8件（03、06、11、13、14、16、17、
18）はrailの`Source diagnostics 0`と並べて矛盾と読んだ — 14 fileがそれぞれのdiagnosticを持つと
述べるRepository pageを開くまでは。ほぼ全sessionが、consent後は何も自動で更新されず`Refresh status`を
押す必要があったと述べた。session 03はそう述べる文を読むまで1分待ち、session 16は受理した読み取りの
後もinventoryの`Personal setup — Not inspected`と件数が同じ押下まで変わらないのを見た。session 15は
確認の直後、行がまだ`Accepted, not yet read`のままで、受理した読み取りが走っているとpageが述べるのを
見た — 作り直しが作った配置である。session 05は、personal-setup pageの読み込み中のplaceholder
`Reading the proposed directories…`が、pageがこのsessionの提案を取得してdirectoryを何も読まない間に
出るのを見つけ、session 12はconsent pageの`What stays excluded`が、製品ごとの内訳を期待したところ、
1つの文の下に製品名だけを並べたものであるのを見つけた。session 02は、最初に開いたdetailがeditorの
本文の前に`Loading this instruction file…`を約8.6秒示すのを見た（1つのmachineで5 sessionが
editorを読み込んでいる状況）。2つ目のdetailは1秒未満で、session 18はclickの304 ms後に本文を見た。
session 05は読み込み中の文を抽出したtextに2回見た — 見える文とそのlive regionである。2 sessionが
editor自身の限界を見た。session 04はaccessibility treeがeditorを本文の無いread-onlyのtext boxとして
公開すること、session 12はspaceをU+00A0として描画すること — どちらもMonacoのもので、記録し、回避
しない。2件（08、13）は1つのfileがClaude Codeでは`lander`、GitHub Copilotでは`voyage`と、productの
解決どおり2つの名前で並ぶのを見た。session 10は、何かを読む前にconsent pageが踏む2段階を数え、
guideの1 pageはそれに触れない。session 15は、共有agent homeがどの変数も名指さないのに`HOME`から
提案されることを挙げた。session 07は`Work out the directories`が自分のloggerに見えるHTTP要求を
出さないことを挙げた — pageはhostとsession channelで話すからである。session 08はtab titleが初回
読み込みの一瞬`Connecting`と読めたことを挙げ、2件（07、14）はdetailの`Open in VS Code`と
`Choose how to open this file`のcontrolを名指し、押さなかった。最初のrunと同じく、2件（11、20）は
hostが`localhost`を印字しながら`[::1]`だけでlistenすることに気づき（browserは解決できた）、
session 20はdocument titleのfile名を囲むbidi-isolate文字を、2件（07、20）は抽出したtextで行の
diagnostic badgeとpathが区切りなしに連結されるのを挙げた。session 08は、行を開くと本文が
1 tab先にある`This file declares none.`の`Instructions` tabに着くと報告した。そのsnapshotはdetailが
まだ読み込み中のときに取られたもので、session 12、14、18はそのtabで本文を読んだ。これらの観察の
うち3つが、この記録と同じ変更でproductを変えた。railのRepository項目は、状態を意味を自ら担う語 —
`Inspected`、`Not inspected`、partialな読み取りでは`Inspected`とその下の行の
`some files kept a diagnostic` — で述べる。personal-setup項目が既に使っている語彙であり、
意味を言わない語は読み手を意味探しに向かわせるからである。
Repository pageは説明の隣に自身の語を保つ。scanをadmitする3つのcommand — consent pageの`Inspect these directories`、member行の`Rescan`、barとRepository pageの`Rescan` — は、admitしたscanが終端状態に達してから応答するようになり、shellはその応答で再取得するので、押した結果は`Refresh status`を2度目に押さなくても画面にある。`Refresh status`は、pageを開いた時点で既に走っていたscanのために残り、Repository pageとpersonal-setup
pageのnoteも今そう述べる — そこで始めたscanや読み取りは自分の結果を報告し、`Refresh status`は他所で
始まったもののためだと。commandが出ている間、それを持つsurfaceはsnapshot（commandが置き換える当の
値）からではなくcommand自身の状態からそう述べる — Repository panelの`Scanning now.`、押した
member行の`<member> — scanning now.`、barのcommandの`Rescanning…` — 待ちがscanの全長になった今、
そうしなければ終わったscanと読まれるからである。
session 15と16が2つのsurfaceから古い行と古いrailに出会った観察がこれの拠り所であり、この決定までの間に置いたrailのdating文の複製はこれとともに無くなった。そしてpersonal-setup pageの読み込み中のplaceholderは、読み込んでいる
当のものを言う`Loading this page's status…`とした。`What stays excluded`の一覧は製品名の上の1文の
ままである。製品ごとの文はregistryが持たない散文になり、`GlobalConsentPreview.vue`がその決定を
記録している。

**このrunが確立しないこと。** SC-001もSC-006も確立しない。障害が3 sessionをSC-001の定める区間の
内側で切り、全sessionのruntimeがこのrepositoryの`AGENTS.md`とassistantのmemory noteを持っており、
基準のno-hint policyはそれを許さない。確立できるrunは、各sessionをこのworking treeの外で —
repository自身の指示もmemoryもruntimeに入らないように — 開始し、現在のbuildに対して行う。人による
first useについては何も確立しない。capture bundleは持たない。拠り所は
各session自身の報告であり、runのsession folderの隣、このrepositoryの外に置いてある。そしてfixture
treeは1つである。sessionが出会ったのはこのrepositoryが自身のtestのために構築するcustomization file
であり、見たことのないrepositoryではない。

### 2026-09-04の最初のrun

**2026-09-04に実施した、各sessionが自分でInspectorを起動する20件のagent駆動session。** buildは
commit `e683269`にその日の未commit変更を加えたworking treeの`pnpm pack`で、tarballのSHA-256は
`1fbb6607d1a25c05f3c1cc228080e552188e6bfb5d9e4a19063ccb75ee012ec2`で、これを`npm install`で1つの
session folderに入れた。各sessionはそのfolderの`repository/`としてall-kind fixtureの自分の複製を持つ。
guideの`npx --no-install agent-customization-inspector --no-open`は、そこから上へ辿ってfolderの
`node_modules`にpackageを見つける — guideが「渡されたfolder」と呼ぶものである。各sessionには
`tests/usability/sc001-sc006-study-inputs/guidance.md`の本文、その隣の4つのprompt fileの原文、
`response-form.json`の3つの質問を渡し、各sessionは自分のheadless browserを自分の時計で駆動した。
equipmentの条件として全sessionに2つを伝えた。起動commandに`--port 0`を付けること（既定portはこの
machineの所有者のもの）。そして起動commandだけに`COPILOT_HOME`、`CLAUDE_CONFIG_DIR`、`CODEX_HOME`、
`HOME`を設定し、personal-setupのconsentを`tests/fixtures/global-homes/build-fixtures.ts`が構築する
4つのfixture homeへ向けること — `ground-truth.json`がequipmentに許すとおりである。同時に走らせたのは
5件である。

**何を強制し、何を強制しなかったか。** このproductのsource、test、specification、fixture、document
を読むことは指示で禁じ、前回と同じく機構では阻止していない（Playwrightはこのworking treeから
読み込んだ）。それより弱く、今回新たに加わった条件がある。sessionはこのrepositoryをworking
directoryとして走ったので、各session自身のruntimeが、始める前からrepositoryの`AGENTS.md`を —
1件については assistantのmemory noteも — 周囲の指示として持っていた。3 session（09、15、19）が
求められずにこれを開示し、pageだけで操作したと述べた。これはこのtreeを何も視界に持たないsessionより
弱い保証であり、主張を弱める形でそのまま記録する。それはまた、SC-001が許す範囲の外でもある。基準は
productが印字し描画するもの以外のhintを許さず、productのsurfaceを名指すこのrepositoryの`AGENTS.md`を
始める前から持つruntimeはそれに当たらない。下の数字は記録であり、基準はそれによって確立されず、
SC-006も同じpolicyを適用する。

**equipmentの3つの条件が記録に効いている。** fixtureの複製は`.claude/skills/cycle` linkの絶対target
— 複製元のfixture tree — を保ったので、productはそのlinkを選択したrootの外へ辿り、tree全体を
`.claude/skills/cycle/**`の下にもう一度列挙した。件数は重複分だけ増え、taskへの影響は無く、7 sessionが
その行に言及した。起動が共有した1つの`HOME`には各起動のnpm自身のdebug logが溜まり、何件かのsessionが
気づいてnpmのものと正しく帰属させた。そしてsessionのT1は自分の確認がfileの本文を画面に認めた時点
なので、確認がpageに遅れた分だけ遅い側に誤る。session 14は真のT1をstampの前27秒の範囲に置き、
session 07はそのstampが上限超過の原因である。

**これはagent駆動のrunであり、そのように記録する。** 20件のagentが測るのは、productが自ら印字し
描画するguidanceだけで起動し、fileに到達し、productがそのfileについて述べていることを言えるかである。
同じinterfaceを人がどう体験するかはこの記録に無い。SC-001とSC-006は自身の文面でそう述べており、
ここのどの文もhuman-subjectの結果として読んではならない。

| Workflow | 測るもの | 閾値 | 結果 |
|---|---|---|---|
| Discovery | SC-001: 起動commandから、発見した1 fileのdetail viewを2分以内に開く | 20件中19件 | **確立しない: 20件中19件が上限内にfileへ到達したが、sessionにはguidance以上のものが与えられていた** — 何がかは上の強制の段落が述べる。19件は21.9秒〜81.8秒、20件全体の中央値38.8秒。session 07は152.7秒 — 自身のURL待ちscriptが印字行に一致せず（JavaScriptの正規表現内のPOSIX文字class）、InspectorがURLを印字した後も90秒のtimeoutまで待った。equipmentの障害であり、kitの除外なしの規則により不成功として数える |
| Inspection | SC-006: 指定`AGENTS.md`の3 fieldを2分以内に回答 | 20件中18件 | **20件中20件が一致、Discoveryの行と同じ理由で確立しない**。9.0秒〜47.8秒、中央値24.1秒 |
| Comparison | SC-006のcoverage: 標準comparison task | 20件すべてが試行 | **20件中20件**完了 |
| Global consent | SC-006のcoverage: 標準personal-setup consent task | 20件すべてが試行 | **20件中20件**完了 |
| Safety | SC-006のzero-critical gate | critical issueなし | **報告なし** |

全sessionの3 fieldが`ground-truth.json`と部分点なしで一致した — source `Repository`、認識するtool
`GitHub Copilot`**と**`OpenAI Codex`、file type `Instructions`。Claude Codeを挙げたsessionは無い。
discoveryでは17 sessionがpageが既定で示すkindの先頭行`.claude/CLAUDE.md`を開き、session 09と13は
root `CLAUDE.md`を、session 16は`.github/copilot-instructions.md`を開いた。

全sessionが、ground truthの名指す組 — `.agents/skills/`の`changelog` skillと`.github/skills/`の
その複製 — に行自身のCompare linkから到達し、全件がdescriptionのdriftを述べた。多くはinstructionの
driftと、compare pageが本文の傍らに述べる認識の差も述べた。session 19は、taskの前に走らせたprocess
一覧に隣のsessionの`changelog`を含むcomparison URLが見えたこと、pageが提示した組の中からの選択に
その文字列が影響した可能性を排除できないことを開示した。

全sessionがconsent pageに到達し、pageが示すとおりに4つのdirectoryを — 3つのfixture homeを
`From this tool's environment variable`、共有agent homeを`Default location in your home directory`
として — 挙げ、そのうえで読み取りを確認した。各sessionは、promptの「get the tool to show you those」が
一覧の先まで及ぶと判断した。hostは各session自身のものなので、他のsessionのconsent状態に出会った
sessionは無い。全sessionが自分のhostをSIGTERMで止め、自分のbrowserを閉じ、他のsessionが起動した
processに触れていない。

| Session | Discovery | Inspection | Comparison | Consent | Safety |
|---|---|---|---|---|---|
| 01 | 31.9秒 | 38.3秒 | 完了 | 完了 | なし |
| 02 | 46.7秒 | 33.1秒 | 完了 | 完了 | なし |
| 03 | 34.1秒 | 16.5秒 | 完了 | 完了 | なし |
| 04 | 42.1秒 | 12.0秒 | 完了 | 完了 | なし |
| 05 | 30.9秒 | 21.6秒 | 完了 | 完了 | なし |
| 06 | 36.8秒 | 47.8秒 | 完了 | 完了 | なし |
| 07 | 152.7秒、上限超過 | 17.0秒 | 完了 | 完了 | なし |
| 08 | 81.8秒 | 38.2秒 | 完了 | 完了 | なし |
| 09 | 34.7秒 | 21.6秒 | 完了 | 完了 | なし |
| 10 | 44.8秒 | 39.6秒 | 完了 | 完了 | なし |
| 11 | 36.3秒 | 18.9秒 | 完了 | 完了 | なし |
| 12 | 53.2秒 | 36.4秒 | 完了 | 完了 | なし |
| 13 | 21.9秒 | 26.6秒 | 完了 | 完了 | なし |
| 14 | 62.8秒 | 40.7秒 | 完了 | 完了 | なし |
| 15 | 41.4秒 | 14.8秒 | 完了 | 完了 | なし |
| 16 | 38.8秒 | 15.5秒 | 完了 | 完了 | なし |
| 17 | 38.9秒 | 36.2秒 | 完了 | 完了 | なし |
| 18 | 35.5秒 | 15.4秒 | 完了 | 完了 | なし |
| 19 | 40.0秒 | 31.1秒 | 完了 | 完了 | なし |
| 20 | 30.5秒 | 9.0秒 | 完了 | 完了 | なし |

除外も差し替えも無いので、固定の分母と記録した件数は同じ20である。

**sessionがsafetyについて報告したこと。** 禁止された作用は無い — localhostの外への要求なし、
customization由来の実行なし、repositoryの複製にもfixture homeにもmutationなし、`--no-open`下で
productがbrowserを開くこともない。全sessionが、consent pageは確認までは何も読まないと報告し、
何件かは、提示された4つのdirectoryは読み取り権限を与えないescaped presentationであると報告した。

**sessionがproductについて挙げたこと。** 5 session（02、05、11、12、20）が、railの
`Source diagnostics 0`と`Repository: Partial · 17 files kept a diagnostic`が並ぶのを、fileごとの行を
見つけるまでは一見矛盾と読んだ — 前回のrunにそう読んだsessionは無かった。多くが、consent後は何も
自動で更新されず`Refresh status`を押す必要があったと述べ、2件（09、18）は、変わらない
`Accepted, not yet read`を初めての読み手は停止と取り得ると述べた。3件（01、12、16）は、detail barの
次range controlが`.claude/skills/cycle/**`のような次rangeのpatternだけを示し、目的はaccessible name
にしか無いので一見して分かりにくいと述べた。3件（05、08、17）は、抽出したtextで行のsource badgeと
pathが区切りなしに連結されるのを見た。4件（04、08、18、20）は、hostが`localhost`を印字しながら
`[::1]`だけでlistenすることに気づいた（browserは解決できた）。4件（03、06、15、19）はdocument title
のfile名を囲むbidi-isolate文字を、2件（10、19）は1つのfileがClaude Codeでは`lander`、GitHub
Copilotでは`voyage`と、productの解決どおり2つの名前で並ぶことを挙げた。session 14は最初のdetailの
editorがpageの安定後しばらく空だったのを見た。session 02は`Personal setup`へinventoryのrailから
しか行けず、comparison pageからは行けないことを見つけた。session 18は、custom-agent comparisonの
noteが、形式を共有するCodex TOML 2 fileの上で「the two formats have no line-for-line alignment」と
述べるのを見つけた — 偽の理由であり、この記録と同じ変更で直した。noteは今、どの組にも
kind自身の理由 — 宣言は上で1つの正準形として比較し、各fileは丸ごと示す — を述べ、
`tests/e2e/custom-agents-comparison.spec.ts`が形式の異なる組と同じ組の両方でそれを固定する。
これらの観察のうちさらに3つが、同じ変更でproductを変えた。railのRepository項目は状態語だけ
（`Partial`）を述べ、diagnosticを持つfileの件数はRepository pageに、各件がどこに述べられているかを
言う文の隣に残す — 問いを立てる数字は答えのある場所に置くからである。受理した読み取りがまだ
走っている間、personal-setup pageはmember行の上に`Statuses below are from the last refresh.`と
述べ、行とpanelが1つの瞬間を2通りに述べることはなくなった。そしてdetail barの前後移動は、
`Back to`が既にそうであるように、方向を`Previous`と`Next`の語で述べる。editorの初回描画は
loading stateを置く代わりに計測した。冷えた状態の直接読み込みで、panelの枠と見出しはeditorの
本文より130〜190 ms早く画面に出る（このmachine）。中身が届きつつある枠であり、loading stateを
検討する閾値を下回る。

**このrunが確立しないこと。** SC-001もSC-006も確立しない。理由は強制の段落が述べる。人による
first useについては何も確立しない。capture bundleは持たない。拠り所は各session自身の報告であり、
runのsession folderの隣、このrepositoryの外に置いてある。そしてfixture treeは1つである。sessionが
出会ったのはこのrepositoryが自身のtestのために構築するcustomization fileであり、見たことのない
repositoryではない。

### 2026-09-03のrun

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
moderated studyが必要としたcapture kitはこのrunで動かされておらず、その後退役した。後掲の
記録がそれを扱う。

| Workflow | 測るもの | 閾値 | 結果 |
|---|---|---|---|
| Discovery | SC-001: 発見した1 fileのdetail viewを2分以内に開く | 20件中19件 | **未確立。** 20件中20件がfileへ到達し0.753秒〜93.6秒・中央値5.72秒だが、timerは起動済みのoriginから始まっており、SC-001が定める区間はInspectorの起動を含む |
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

**このrunが測ったものと、SC-001が求めるもの。** SC-001が定める区間は、task promptが提示された
時点で始まりfileのdetail viewが開いた時点で終わる。そしてその区間にはInspectorの起動と、印字された
URLでそこへ到達することが含まれる、と条文自身が述べている。このrunは、hostが既に配信しているoriginから
各sessionを始めた。したがって上の秒数はその後の区間 — 稼働中のproductが描画するものからfileを見つける
までである。描画されたguidanceについての結果であって印字されたそれについてではなく、この基準はこれらに
よっては確立されない。20 sessionはその1台のhostも共有しており、独立した20件のfirst useではなかった —
これは前掲のconsent状態が反対側から記録しているのと同じ条件である。

**このrunが確立しないこと。** 人によるfirst useについては何も確立しない。基準の以前のparticipant形式が
測ろうとしていたのは、まさにそれである。capture bundleを持たないので、ここには封緘されたものも、
evidence artifactから独立に再検証できるものも無い。拠って立つのは前掲のsession毎の記録である。そして
host 1台、fixture tree 1つである — sessionが出会ったのは、このrepositoryが自分のtestのために構築する
customization fileであって、見たことのないrepositoryではない。

## Study kitのrelease-candidate reviewと、その退役

T1061の分岐ごとのreviewは、capture kitをそのprotocol contractに照らして読み、15件の欠陥を
見つけた。各件をcodeと矛盾する条項の双方へ追跡し、修正し、修正が無ければ落ちるcheckを与えた。
T1062はそのloopを未解決concern zeroまで回した。最後の1件は、equipmentが実際に判定できる
packaged-prefix規則へcontractのstatic asset rowを修正することで決着した。

そのうえでcapture kitを削除する。contract、module、それらのsuite、package command、そして唯一の
callerがkitだったproduct側のreadiness probeも一緒に消えた。Capture kitはmoderatedな人間studyを
監査可能にするために存在したが、そのstudyは行われない。初見のparticipant 20名がこのprojectには
得られないからである。残したのはrunが読むもの、すなわちguidance、4つの定型task prompt、response
form、ground truth、scoring rubricと、1回のrunをどう実施するかを述べるもの、すなわち
`tests/usability/sc001-sc006-study-kit.ja.md`とその英語版であり、後者はもはやharnessではなく
静的なoperator protocolである。

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

5つ目は同じ条項を逆側から使った。ここで冗長さを命じたのはspecificationではなく、その読み方である。
Launcher exclusionは2段階として提案された。全candidateをconsent前にphysicalにresolveする段階と、session
がその時点で保持するrootに対してlaunch時に再authorizeする段階である。FR-013のno-I/O規則をprobe自身の
resolutionまで禁じるものと読んだためだった。だがoperandは`PATH` entryか設定済みeditorであり、4つの
proposed rootのいずれでもない。よってFR-013を、editor launcherの探索がoperating systemによるproposed
root経由の解決を許す唯一の操作であると述べるよう修正し、2段目は買えるものを失った。残る比較は1つ、probe
時に行うものだけである。各candidateを綴りとしても物理的な位置としても、startupが確定するRepository rootの
物理的な位置と、proposed personal setup rootそれぞれの綴りに対して比較する。それをadmit済みのlaunch直前に
繰り返すことはFR-019が禁じるidentityの再verificationであるから、残るものは機構で塞がず、launchを述べている
場所（`contracts/http-api.ja.md` § open-file）に記録する。filesystemがresolveできないcandidateを許可せず
拒否するのも同じ場所である。

*未決ではなく解消。* Capture study kitは背後にrunを持たない機構だった。初見のparticipant
20名がこのprojectには得られず、それが存在する理由であるmoderated studyは行われないからであり、それは
この原則が禁じる形である。この変更で、protocol contract、3つのsuite、package command、そして唯一の
callerがkitだったproduct側のreadiness probeとともに削除した。

**II. Readable, Maintainable, Intention-Revealing Code。** 今回、名前やコメントが真でなくなった箇所は
2つあり、いずれもそれを偽にした変更の中で直した。Inventoryのfilter-generation判定は、履歴entryの
stampをこのpage loadが発行したtokenの集合と照合していたが、reload越しに継承したentryに対しては
「不明」としか答えられなかった。実際に必要な問いは、このloadが一度でもpurgeしたかであり、それは
sessionが既に公開している。その集合と、それを補うために置かれていた到着時のrestampはどちらも
削除し、それらを説明していたコメントも一緒に消えた。

同じ規則が2つ目を捕らえた。Source diagnostics項目の削除は、non-kind listを2つと記述するproduction
commentの5 familyとbrowser testを1つ残し、さらに`.aci-notices`を、globalに置く理由 — 2つのsurfaceが1つの
箱を描く — がlistと共に消えたutilityとして残していた。Familyはまとめて修正し、理由の消えた逸脱は
決定ではなく defectであるという規則に従って、その枠を描画する唯一のcomponentへ移した。

3つ目は最終roundから出たもので、同じ規則を1段上で読んだものである。要件を名指すcommentは、仕様が
その要件を落とした時点で真でなくなるが、それを見ている仕組みが無かった。7月に削除した
`FR-040`/`FR-041`を、2箇所がまだ引いていた。Familyを閉じたのは2つの編集ではなくそれらを見つけたsweep
である。`src/`が引く`FR-`・`QR-`・`SC-`識別子はすべてspec.mdが定義するものと突き合わせるようになり、
criterionより長く正当に生き残る唯一の識別子 — performance harnessの`sc002-`接頭辞 — は、読み手が引く
場所でそう述べてある。

**III. Verification Before Completion。** このreleaseでaccept済みの各修正は、それが無ければ落ちるcheckを伴い、
受け入れる前に落ちるところを実際に見ている。Filter-generationの修正は2重にassertしている。判定式に
対する単体testと、読者から見える経路（narrowingを適用し、離れ、reloadし、disableし、Backする）に
対するbrowser testであり、いずれも修正前の判定式に対して先に実行し、落ちることを確認した。Suiteが
通ることは証明として扱っていない。Study kit退役の前に行ったreviewは、suiteが到達しない分岐を読み、
健全と判定したものも未検証と判定したものも記録した。
Monaco host metricsは前掲のreviewが述べるregressionを伴い、修正前のsourceに対して落ちるところを
確認している。Launcher exclusionとVCS除外については、2回のreviewが求めた機構を建てて取り下げた。
取り下げた理由は前掲の各項目にあり、残るのは既存の比較と、記録した残余である。Railのranking foldだけは
その分岐自体にどのgateも届かない — readを開いたまま保つ必要があり、RPC channelはWebSocketで、unit
projectにsingle-file-component compilerが無い — ので、checkされるのはその入力を供給するpredicateと、
readが出ていないときのrankingであり、fold自体はassertではなくfixture launchでの確認として記録する。
後続の修正2件も同じ位置にあり、そのように記録する。個人設定live regionの実行中の文はreadを開いたまま
保つ必要があり、open controlのfile単位のlaunchは、どのbrowser suiteもlaunchを起動してはならない
ため、どのsuiteも到達しない。

このreleaseの修正のうち2件は、その前の修正自身が生んだregressionであり、どちらもsuiteではなく修正を
それが変えたcodeに照らして読むことで見つけた。Launcher probeのerror分割を広げた際、物理resolverを2つの
errno値へ狭めてしまい、link cycleであるRepository root、あるいはこのprocessがsearchできないdirectoryの
下にあるRepository rootが、hostも持たないstartup失敗になっていた。FR-002はそれに、読み手が見られる
`root-unreadable` Diagnosticを与える。Global commitをcompute-then-apply化した際は、memberの初回publication
がdiagnosticのsort時点で未ランクのまま残り、retryしたmemberが先行batchのpublicationより前に読まれていた。
いずれも先に落ちるところを見たcheckを伴う。前者は実際に権限を落とした親をstageしてlaunchし、後者は
先行publicationの上にretryをcommitしてcommit済みの順序を読み戻す。

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

**前掲のうち、判断待ちのものは無い。** findingはいずれも各項目が述べるとおり実装しcoverしており、
文言に懸かったものも決着して同時に実装した。Loopは、前掲のrelease gate節に記録した最後のroundで閉じた。
その前のroundは削除済み要件を引くcommentを2件見つけた。最後のroundは、存在理由である比較を無効にして
いたreactive宣言の種別、announceできないlive region 2件、誤ったemptyを述べていたempty state、2つのpanel
をまたいで二重に読まれていた文書、追加を記録して削除を記録していなかったchange logを見つけた。いずれも
上で修正し、1件はcontractが支持しない読みとしてcode側で答え、live regionは黙ったままではなくpage自身のstatusへ
繋いだ。これはshellが既に持つ形である。

実際のresidual 2件は変わらず、どちらも判断待ちではない。支援技術に対するmanual実行は行わない。
moderated studyが行われないのと同じ理由で、このprojectに得られないoperatorを必要とするからであり、
所有者のいる項目ではなくevidenceの恒常的な性質である。これを閉じるのはそのoperatorを得たreleaseで
あり、そのとき走らせるのは各`MANUAL-*`行が名指すmatrixである。macOS WebKitのlink-Tab 7件はproductでは
なくこの機械の性質であり、所有者はCIである。認証済み3 browser matrixの結果がrelease check logに載る。

## SC-008 accessibility: Not-applicableの再検証

18件の`REVIEW-*` IDは、各Not-applicable rationaleをrelease diffとbuild済みpackageに照らして再確認する。
2026-09-04に、後掲のrelease gateを実行したtreeの`src/`とpacked `dist/`に対して全件を再確認し、全件が
今も成り立つ。この再確認はagent駆動であり、このrepositoryはそう記録することを求めている
（AGENTS.ja.md「結論より先に証拠を確認する方針」）。reviewerはこのsessionであり、各行が述べるのは
実行した検索とその結果であって、示せない判断ではない。interface reworkに
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

**Applicable rowの自動側**は上記のSC-008 accessibilityに記録している。34件の`AUTO-*` IDのうち32件が
localの全projectで通過し、`AUTO-2.1.1`と`AUTO-2.4.1`は認証外のmacOS WebKitでのみ、そこに記録した
tab orderの理由により失敗する。認証対象のLinux WebKitがその2件をどうするかは、このtree自身のcommitに
対するCIのrunであり、ここでは再現せず、localのrunがそれを代替することもない。

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
