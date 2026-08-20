# 契約: 調査対象パスallowlistの文法とindex

[English](inspection-path-allowlist.md)

**契約バージョン**: 2026-07-20

**検査パス決定の再検証日**: 2026-07-20

**規範対象**: Rule class、matcher表記、source boundaryの解釈、read認可、vendor横断の適合要件

この文書はinspection rule registryの共通文法とinvariantを定義する。Vendor matrixそのものではない。
正確なvendor behavior、Inspector rule、runtime composition、evidenceは、以下のリンク先contractで一度だけ
定義する。
上記日付はこのInspector path decisionの再検証日であり、registry全体のsemantic source review日ではない。
Recordごとのreview日は[公式資料](official-sources.ja.md)だけが所有する。

## Contract mapとidentifierのownership

| Contract | 唯一のownership |
|---|---|
| [GitHub Copilot](vendors/github-copilot.ja.md) | Copilotの`behaviorId` statementと、Copilotのstatic、bounded-derived、excluded `ruleId`定義 |
| [Claude Code](vendors/claude-code.ja.md) | Claudeの`behaviorId` statementと、Claudeのstatic、bounded-derived、excluded `ruleId`定義 |
| [OpenAI Codex](vendors/openai-codex.ja.md) | Codexの`behaviorId` statementと、Codexのstatic、bounded-derived、excluded `ruleId`定義 |
| [Runtime composition](runtime-composition.ja.md) | `strategyId`定義、precedence/composition projection、relationship-only `ruleId`定義、vendor横断のshared non-read `ruleId`定義 |
| [公式資料](official-sources.ja.md) | `sourceId`、canonicalな公式URL、列挙済みsection anchor、review日、影響contractへの相互参照 |

Identifierは厳密に1つのcontractだけで規範的に定義する。他のcontractはそのidentifierを参照し、ruleを
再記述してはならない。`behaviorId`は文書化済みvendor behaviorに対する保守対象の解釈、`ruleId`は
Inspector policy、`strategyId`はruntime compositionまたはprojection、`sourceId`はそれら1つ以上のrecordに
対してreviewした公式evidenceを表す。

全vendor behaviorとstrategy rowはevidenceとなる`sourceId`を示す。全Inspector ruleは関連する
`behaviorId`と仕様policyの参照を示す。実行可能registryと両言語contractは、それらの参照を相互に解決
しなければならない。

## Vendor locatorとInspector matcherは別物である

**Vendor locator**は、vendorがcustomizationを探すと文書化した場所を表す。Repository root、Git root、
workspace、target file、runtime working directory、user home、configuration home、profile、hosted contextの
いずれかに対する相対位置になり得る。また、上向き探索、下向き探索、directoryごとの選択、surface固有
layerを表し得る。

**Inspector matcher**は、すでに有効な1つのsource boundary内でInspectorがどのenumerated entry recordをclassify
できるかを表す。常にruleが指定した正確なboundaryに対する相対指定であり、vendor locatorの暗黙のbaseや
traversalを継承しない。

したがって、次をinvariantとする。

- Vendor locatorはenumerationもreadも認可しない。
- Inspector matcherはvendorのruntime traversalを再現したとは主張しない。
- 類似したpath textを使う場合でも、vendor behavior表とInspector rule表を分離する。
- Runtime applicability、order、selectionはcondition factとstrategyで表し、matcherの拡張で表さない。

## Source boundary

### Repository

Repository boundaryはselected rootである。`--root`を省略した場合は呼び出し時に1回captureしたexact
`process.cwd()`を使う。`--root`を受理する（反復指定はparserのlast valueへ解決）。Absolute valueはそのまま保持し、relative valueは
active platformの`node:path.resolve`でcapture済みの呼び出しdirectoryに対してresolveする。明示的なempty valueは
session/browser作成前に固定actionableかつsource-value-freeなstartup errorでfailureとなり、valueの欠落は同じ
boundaryでGunshiのtyped argument validationによりrejectされる。Productはparser所有のcheckを重複実装しない（FR-001）。Selectionは
filesystem/network I/Oを0件とし、`chdir`を行わない。Generation 0はfilesystem I/Oなしで作成した1つの
Repository Sourceを持つ。そのescape済みroot labelはread authorityを与えず、最初のscanがretained selected
rootをreadする。Rootが存在しないかdirectoryとしてreadできない場合、そのscanはsource-scopedな
`root-unreadable` Diagnosticでfailする（FR-002）。InspectorはSource rootより上を読むことはない。そのpathは
`SourceRelativePath`を持たず、boundaryの外にある。Rootを見つけるためにrepository markerをprobeすることもない。
Selected rootが既にrepository rootだからである — runtime working directoryから上るvendor lookupは正確にそこで
終わる（FR-001）。Repository inventoryはselected root配下の通常の
recursive traversalである。Vendorが異なるruntime rootやwalk方向を使う場合、そのfactはvendor contractと
runtime-composition contractに属し、このboundaryを変更しない。

### Global

Global inspectionは新しいsessionごとに無効であり、current contract versionと正確なno-I/O previewにbind
したconsentを必要とする。Consentは固定Copilot/Claude/Codex entryに対するselectorなしの1 actionである。
1 transactionで3つすべてをevaluateする。Deterministic rejectionはadmit済みsiblingをblockせず、1 batchが
resulting Sourceをすべて1つのatomic generationへpublishする。Accepted vendor-home rootごとに独立したtool-specific Global Sourceを作り、Copilot、
Claude、Codexのいずれかとして別々に識別する。各toolは自身のSourceへ対応し、各Sourceは正確に1つのrootへ
bindする。これらはRepositoryのchildではなく、互いにmergeせず、Repository Sourceにもmergeしない。

表示またはserializeする全candidate pathは、owning Sourceのsingle rootから計算したSource-relative Pathとする。
Repository Sourceの場合だけrepository-relativeであり、各Global Sourceは自身のadmit済みtool-home rootを使う。

Vendor contractは保守と将来のreviewのため、文書化済みの追加User behaviorを記録できる。そのrecordはread
authorityを与えない。FR-015からFR-018により、明示的にcontract化したGlobal instruction ruleだけがGlobal
candidateをclassifyできる。追加User settings、agent、skill、hook、MCP configuration、plugin、state、隣接
directoryは、仕様が変更されるまでexcludedのままとする。

## Structured Inspector matcher表記

全static Inspector ruleは、次のfieldを分離する。

| Field | 意味 |
|---|---|
| **Base** | 有効な1つの正確なboundary。`Repository`またはconsent済みのnamed `Global` vendor boundary |
| **Selector program** | Source rootに対して相対にauthorしたtyped segment programのnon-empty ordered list。Programはabsolute path、environment expansion、home expansion、URI、暗黙のancestor searchを表現できない |

各selector programは次のclosed unionからなるnon-emptyなordered segment token列を持つ。

- `literal(value)`はcase-sensitiveなexact ASCII segmentを正確に1つmatchする。`value`はU+0021–U+007Eから
  `/`、`\\`、`:`, `*`、`?`、`\"`、`<`、`>`、`|`を除いたcode unitだけからなるnon-empty stringで、`.`と`..`も禁止する。
- `regex(pattern)`はentry nameを正確に1つmatchする。判定は1つのJavaScript正規表現を
  raw entry nameへ標準の`RegExp.prototype.test`セマンティクスで適用する — anchoringとescapeは
  pattern作者の明示的な記述であり、その正しさはshipped rule fixtureが所有する。Non-terminalなら
  directory step、terminalならregular-file stepとし、regex literal（例: `/\.md$/u`）として表記する。
- `recursive-directories`はsegment `**`と表記し、0個以上のdirectoryをmatchする。terminalにはできず、
  別のrecursive tokenと隣接不可とする。下降のstepのみであり、parent directoryを名指すtokenは存在せず、必要でもない。
  Allowlistは選択されたrootにanchorされ、そのrootのcustomizationを報告するからである（FR-003）。

Static fixed prefix、exact target、fixed derived suffixも同じclosed ASCII literal typeを使う。Registry validationは全non-ASCII
path literalをrejectするため、fixed prefixとexact targetについてはexact raw-byte/code-unit比較が
relevance判定のすべてである。一方`regex` patternはraw entry name（diskの上ではNFD綴りであり得る）を
testする。Final tokenは
`literal`または`regex`で、regular fileを表す。Programはこのclosed typed grammarだけを使う。
Token、depthのcapacityおよびcompletion behaviorはNode.jsと実行環境から継承する。Registryはこのtyped
program形式で直接authorし、selector textをparser入力にすることはない。本contractのtableは
そのauthored programを示す。文法とliteralの義務はrelease前のregistry contract gateがenforceし、
runtimeで再検査しない。Runtimeはtyped
programだけをloadし、いかなるselector textもgeneral-purpose glob evaluatorへ渡さない。
Product内で唯一のpattern評価は、各`regex` step自身の正規表現をenumerateした1つのentry nameへ
適用することである。

Structured Baseとauthorしたsegment programをauthoritativeとする。Vendor tableの**Expansion** cellはprogramから導く
human summaryで、`exact`、`direct-child`、`descendant-inventory`、`recursive-subtree` labelをprogram順に使う。
Composite selectorでは複数labelを記載できる。

### Repository selectorの要件

全Inspector Repository selector programは正確なRepository source root相対とする。

| Authored program（Repository base） | 必須program summary | 意味 |
|---|---|---|
| `['path', 'file']` | `exact` | Repository source root相対の正確な1 file |
| `['path', ANY_NAME]` | `direct-child` | Root相対の1 directoryのmatching direct child。Segmentは`/`をcrossしない |
| `[ANY_DIRECTORIES, 'name']` | `descendant-inventory` | Root levelとその配下の全directoryを対象にした明示的なInspector inventory |
| `['path', ANY_DIRECTORIES, /\.ext$/u]` | `recursive-subtree` | Root相対の1 subtree内の明示的なrecursive Inspector inventory。Subtree root levelも含む |
| `['.agents', 'skills', ANY_NAME, 'SKILL.md']` | `exact`の後に`direct-child` | Source rootで適用する1つのanchored program。Terminal fileはexact |

`ANY_DIRECTORIES`が唯一の方向性を持つ軸であり、それは下向きである。それが表すのは
anchorより下のdirectoryに対するInspectorのinventoryだけである。Vendorが下向きまたは上向きにwalkする、ancestorを
探す、すべてのnested repositoryを認識する、あるruntime contextでmatch fileを適用する、のいずれも意味しない。
これらの主張には別のvendor behavior recordとstrategy recordが必要である。先頭の`ANY_DIRECTORIES`をauthorできる
のは、vendorがあらゆる深さで文書化しているlocation — サブディレクトリのon-demand loadや、作業中fileのpath上の
directoryでのdiscoveryといった、worked-fileまたはdescendant anchorを持つlocation — だけである。

上向きの軸は意図的に持たない。Allowlistは選択されたrootにanchorされ、そのrootのcustomizationを報告する
（FR-003）。したがってruntime working directoryから上るvendor lookupが与えるin-scopeなlayerはちょうど1つであり、
表現すべき記法はなく、そのように解決するvendorのruleは素直にanchorしたprogramとして書く。代わりに先頭
`ANY_DIRECTORIES`で書くと、このproductが選択しないworking directoryに属するnested copyをinventoryしてしまい、
問われたrootを過剰近似することになる。

Vendor lookupの起点となるworking directoryは引き続き`runtime-cwd` condition factであり、Sourceを選んだ
invocation directoryとは意図的に区別する。`$CWD`と`$REPO_ROOT`を同一視するのはlookupの*終点*を定めることであって
runtimeの起点を定めることではないため、実行中のagentが実際にどのlayerから始めるかはconditionalのままである。

`ANY_NAME`は常にmatchする`regex` stepで、entry nameを正確に1つmatchする。`**`は
`recursive-directories` tokenの通称である。`regex` stepはrecursionを暗黙に含まず、literal-only programはexactとする。
Repository rule tableはBase、authored selector program、derived Expansion summaryを別々に記載し、immutable registryはその1対1の
typed selector programを保持しなければならない。

### Bounded companion census

Customizationの中にはfileではなくdirectoryであるものがある。Skillが最も分かりやすい例である:
admitされるのは`SKILL.md`で、その傍らのscript、reference、assetこそがskillを一段落以上のものに
している。そこで、そうしたkindのadmit済みcandidateを含むdirectoryを再帰的に列挙し、付随する
regular fileをlistにする。

Censusが適用されるかどうかは、ruleの個別宣言ではなく認識されたkindから決まる。Directoryで
あることはkindの正体の一部であり、そのkindをadmitするruleはすべてcensusを求める。Rule単位の
flagは、片方が既に決めていることを二重に述べるだけである。

Censusの結果は件数ではなく、sortされたSource相対Pathのlistである。各pathは公開される他のすべての
pathと同じく、exactなraw entry nameを`/`でjoinしたものである: filesystemは1つの名前につき1つの
entryしか保持しないため、列挙されるpathはすべて曖昧さを持たず、見た目が同じにrenderされ得る2つの
raw綴りは、別々に列挙される2つの実在fileである。Inventory rowはfile件数を述べ、
file detail viewは各fileを名指す。件数をlistから導けば事実は1つで済み、両方を公開すれば食い違いうる
2つの状態になる。

Censusは列挙したfileを読む。Directory形式のcustomizationとは、entry pointとその傍らのfileの総体で
あり、entry pointだけを表示してそれが同梱するfileを伏せるtoolは、そのcustomizationを表示していない。
付随するfileも`SKILL.md`と同じくproductに与えられるものの一部である。各fileはscan試行ごとに正確に
1回、admit済みcandidateと同じ読み取り経路・同じ閉じたper-file分類で読み、generationの通常のfileとして
公開する。分類が何を意味するかは、そのfileに何が期待されていたかで異なる。Binaryのbytesはassetの通常の
事実である。画像やcompile済みfileはskillが同梱するものの一部であり、rowはDiagnosticなしで`binary`を記録し、
generationはcompleteのままとなる。同じbytesがadmit済みcandidateにあれば、ruleがtext customizationとして
admitしたfileについてのfindingである。読み取りの失敗は両者にとってfailureである。censusがそのfileをlist
した以上、skillはそれを同梱しており、読み手はそれを見られない。link先が失われているentryもこれに含まれる。
他と同じくlistして読むため、読み取りは`file-unreadable`を返し、rowがそう述べる。落としてしまうと、自身の
directoryにあるfileを欠いたskillを見せることになる。

それでもcensusは列挙であってadmitではない。列挙されたfileはrule、recognition、kind、自身のinventory row
のいずれも獲得しない。そのdirectoryを持つcustomizationの一部であり、そのcustomizationには既にrowが
ある。Censusはwalkを広げない。降りるのはadmit済みcandidate自身のdirectoryの内側だけであり、その外のpathを
列挙することはない。列挙したentryは他のfileと同じく、platformが透過的に解決するsymbolic linkを通して
読む。そのdirectoryを読むagentが得るものがそれだからである。Censusに現れることは
それらがvendorにloadされる証拠ではなく、relationship targetがそのedge経由で読まれることも依然としてない。
Targetが読めるようになるのは、独立にadmitされるか、既にそれを内包するcensusの内側にある場合だけである。

Censusはallowlist walkの一部ではない。Traversalはshipped selector programを実行し、どのfileを
読んでよいかに答える。Censusはcustomization自身のdirectoryに他に何があるかに答えるもので、どの
selectorもそれを表現せず、censusを持つkindだけがそれを求める。したがってtraversalが既にadmitした
candidateに対して実行し、起点はadmit済みcandidate自身のdirectoryだけである。任意のpathは存在しない。
Censusはrecognizerの中で、認識されたkindとcandidate自身のpathから実行する。どちらも
recognitionが既に保持しているため、どのkindがcensusを求めるかを先行するphaseが知る必要はない。

したがってcensusは、censusを持つkindのrecognitionごとに必ず実行され、その結果はそのrecognitionが
裏づけるinventory定義の上で1回だけ公開される（contracts/http-api.md
`skills[].definitions[].companionFiles`）。recognition上の2つ目の綴りは1つ目と食い違い得るからである。
admitされたfileが単独で置かれている場合、listはabsentではなくemptyになる。「censusが実行されなかった」
状態は存在せず、「何も付随しない」と区別する必要もない。Seed自身とVCS internalsを除外し、通常のtraversalと同じreal-path cycle規則でsymbolic linkを辿るため、
subtreeへ戻るlinkは無限に辿られず終了する。

下降は二重に封じ込められている。Censusはdirectoryのreal pathがcensus root内にある場合にだけそこへ入り、
census root自身もそのreal pathがSource rootのreal path内にある場合にだけ有効とする。2つめのcheckは
冗長ではない: candidate自身のdirectoryがtreeの外へのsymbolic linkでありうるため、そのreal pathは
外部のdirectoryをcensus rootにしてしまう。そのように到達したcandidateには何も付随しない — Sourceは
inspectionが認可された範囲の境界であり、その外はどのSourceにも属さない。このwalkを有界にしているのは
この封じ込めである。通常のtraversalはselector programが有界にしており、どのselectorも一致し得なく
なった時点で下降を止める。Censusにはselectorが無いため、封じ込めがなければancestorへのlink 1つで
repository全体を1つのskillのcompanionとして報告してしまう。列挙は同じようには封じ込めない:
fileへのsymbolic linkはentry自身のpathで列挙する。Directoryに置かれているのはそのentryであり、
それを読むagentも同様にlinkを解決するからである。

列挙のfailureは1 fileに限定されず、通常のwalkと同様に伝播する。空のlistはadmitされたfileが単独で
置かれていることを述べるため、permissionやI/O errorに対してそれを返すことは、読んでいないことを根拠に
directoryについての事実を公開することになる。

### Global selectorの要件

Global ruleは1つの正確なconsent済みvendor boundaryをBaseとして指定し、そのboundary相対のselectorを持つ。
Environment/default-homeの解決はboundary作成の責務であり、selectorの責務ではない。Global selectorは
consent済みvendor boundaryを基点にauthorし、Repository rootを基点にせず、別vendor boundaryを認可せず、
FR-015からFR-018が許可するpathを拡張できない。

### Traversal planのcompileとGlobalのleast privilege

Build validationは、validated済みtyped matcherをそれぞれimmutableかつversionedな`TraversalPlan`へcompileする。
Planはclosed selector programを保持し、それが認可できるfilesystem edgeとoperation classを正確に固定する。
Runtime scanはそのplanをdataとしてloadし、selector textを再parseしたりgeneric walkerへ置き換えたりしない。
Repository planはselector programとexclusionが明示するbroad traversalだけを実行できる。Entry、depth、time、workの
capacityおよびcompletion behaviorはNode.js、filesystem、実行環境から継承する。

Global planはさらに狭く、vendor-home rootのenumerationから開始してはならない。Exact Global target ruleは
admit済みroot配下の指定fileだけをreadし、rootをenumerateしない。Contract済みCopilot `instructions/`
subtreeのような明示的fixed subtree ruleは、そのsubtreeとsegment programが許可するdescendantだけを
enumerateする。どちらのruleもplanが到達しない隣接pathをlist、open、readしない。許可されたpathが
存在しなくてもplanを広げず、sibling discoveryを開始しない。

Planはclosedな`selectionPolicy`も持つ。`codex.global.instructions`以外の全ruleは`all-matches`を使う。
`codex.global.instructions`のexact ordered selectorは`AGENTS.override.md`、次に`AGENTS.md`で、policyは
`codex-global-first-non-empty`とする。このbranchはoptionalな先頭UTF-8 BOMを除いたdecoded stringの
`String.prototype.trim().length > 0`を確定する目的でoverrideをreadする。Non-empty overrideならfallbackへ一切operationせずshort-circuitし、
overrideがabsentまたは安全にreadしてemptyと確定した場合だけ`AGENTS.md`へ進む。`absent`はoverride fileが
存在しないことを意味する。Whitespace-only fileはemptyとする。
Replacement decodeされた`utf-8-replaced` textも変更せず判定に参加し、全`U+FFFD`をnon-whitespaceとする。
Unreadableまたはbinaryなoverrideは、そのfile Diagnostic（`file-unreadable`または`file-content-binary`）で
branchを終了し、fallbackしない。Policyは選択したnon-empty fileをpublishし、両selectorを同時にはpublishしない。

No-I/O Global previewは各toolのresolved rootとlexical stateだけを提示し、patternごとの表示を持たない。
Admitted root配下で何をreadするかは保持済み`allowlistVersion`/`traversalPlanVersion` pairが特定する
同梱planで固定されるため、別管理のpreview allowlistは存在しない。そのversionがclosed selection policyと
canonical selector programを特定する。
Enable operationはdisplay textから再compileせず、accepted previewが表す正確なplanを実行する。

### 通常のtraversalとfileごとのoutcome

Runtime scanはcompile済みplanを`node:fs/promises`上の通常のrecursive walkとして実行する（FR-019）。
Enumerateしたraw entry nameをfilesystem operandとし、public Source-relative Pathはその名前を`/`で
joinしたものである（FR-024）。`/`でjoinした`SourceRelativePath`とdisplay stringから
filesystem pathを再構築しない — operationは保持したraw segmentを使う。Selector relevanceはenumerateしたentry nameに対するexactな
literal比較と、各`regex` patternの標準regular-expression testで判定する — これは
product内で唯一のpattern評価であり、一度に1つのentry nameへ適用される。Symbolic linkは透過的にfollowする。Inspectorは同じpathを
readするagentが見るものを表示するからである。Targetがmissingまたはunreadableなlinkはそのfileの
`file-unreadable` Diagnosticになり、recursiveなtraversalはreal pathで訪問済みdirectoryを追跡して
link cycleがscanの終了を妨げないようにする。Hard linkは通常のfileであり、physical-identity grouping、
read-once semantics、primary/alias path selectionは存在しない。`.git`、`.hg`、`.svn`、`node_modules`という名前のdirectoryには決して入らない。VCS内部は
repository自身の機構であってrepositoryでauthorされたcustomizationではない。`node_modules`
directoryはpackage managerがinstallしたpackageを保持するため、その中のcustomization fileは
それをshipしたpackageのものであり、検査対象のrepositoryでauthorされたものではなくmanifestと
lockfileから再現される。製品はruntimeでそのfileを読み得る — Claude Codeはfileをreadした
subdirectoryの`CLAUDE.md`を発見する — ため、この除外はagentがloadできるものの記述ではなく、
この製品がinventoryする対象を狭めるものである。

VCS内部は解決済みreal pathでも除外し、その判定はwalk自身のcontainer — Source root、または
targeted walkに与えられたfixed subtree — からの相対で行う。したがって別名でそこへ到達するentryも
除外される一方、Source root自身のpathにそのsegmentが含まれているだけの場合は通常のrootとして
走査する。`node_modules`はentry名だけで除外し、それ以外では除外しない。さらにentryのtypeを解決した後で
判定する: object storeへ到達するのはwalkの経路によらず誤りである一方、repositoryが自身のpathに
置いたdirectoryは、そのlinkが何へ解決されようとrepositoryのものだからである。したがって
authorされた場所にあるsymbolic linkは、その場所の条件でinventoryする — linkを透過的に辿るのと
同じ理由である（FR-024）。この除外はdirectoryについてのものなので、その名前のentryが通常のfileへ
解決される場合は通常のfileであり、それを名指すruleが admit する。

対象はこれらの名前だけであり、他のecosystemのinstalled-dependency directoryはそれを報告する
事例とともに追加する。推測で集合を広げることはせず、除外の判断にignore fileを読むこともしない。

1 fileに限定された問題はそのfileに閉じる（FR-028）。Unreadable fileはfile-scopedな
`file-unreadable` Diagnostic、admit済みcandidateのNULを含むcontentは`file-content-binary`となる —
censusが列挙したcompanionのbinary bytesはassetの通常の事実であり、Diagnosticを生まない（§ Bounded
companion census）。parser/extractor failureは`recognition-parse-failed`となり、完全なreadable sourceは
表示とcomparison eligibilityを保つ。これらのDiagnosticを伴うoutcomeは、その他の条件を満たせばpublish
可能なgenerationを、影響を受けない全fileをcompleteに保ったまま`partial`とする。Invalid non-NULなfile-content UTF-8は代わりにreplacement semanticsで1回decodeし、
readableな`utf-8-replaced` textとして変更せず処理する。Selected rootが存在しないかdirectoryとして
readできない場合、Source attemptはsource-scopedな`root-unreadable` Diagnosticでfailし、generationを
publishしない。その他のunexpected failureはattemptを通常のerrorとしてfailさせる。失敗したsession-API requestは
実際のerrorを報告してprior committed snapshotを保持し（FR-030）、startup failureは実行可能なmessageと
ともにlaunchを終了する。
Productはoperation間の反復identity再検証、race-detection taxonomy、ticket、receipt、guard、
resource-registry machineryを追加しない。

Network filesystem上のrootはread時にOS-mediated trafficを発生させ得る。FR-022の
zero-outbound-request assertionはproduct-issued requestを対象とし、local fixture rootを使い、発行済みの
exactな`localhost` authorityにおける2つのauthorized internal loopback class、すなわちpackaged UI assetへの
static/SPA `GET`/`HEAD`とlocal session API channelを別々に検証して、
それ以外のproduct network/URL/MCP requestをすべて拒否する。

## Rule class

全ruleはstableな`ruleId`と正確に1つのdiscovery classを持つ。

| Class | 意味 | Readを認可できるか |
|---|---|---|
| `static-candidate` | Ruleのstructured source-relative matcherだけでcandidateを作れる。 | Consentとsafe-read check後に可 |
| `bounded-derived-candidate` | 独立して受理したseedがclosedなvendor-specific derivationによりtargetを宣言する。 | そのclosed ruleが列挙したderived pathだけ可 |
| `relationship-only` | Productがtargetをfollowまたはuseし得ることを、Inspectorがopenせずに記録する。 | 不可 |
| `excluded` | 文書化済みsurfaceだが、このreleaseまたはsource boundaryでは意図的に対象外とする。 | 不可 |

受理済みfile内のinline declarationは、bounded-derived ruleが別candidateを明示的に作る場合を除き、そのphysical
fileのrecognition metadataである。Listedされていないfield、import、link、component path、command、directory、
vendor locator、`behaviorId`、`strategyId`はread authorityを与えない。

1つのphysical fileを1 Source内の複数ruleが受理するか、複数tool Sourceが独立して受理できる。そのfileはSource scan attemptごとに1回だけreadし、
全accepted provenance — 読み取りを認可したruleと一致したpathであり、それ以上ではない — を保持する。
`DocumentationStatus`は正確に`documented | partially-documented | unknown | conflict`とする。Separateなunique fixed-order lifecycle
qualifier arrayは`preview`、`experimental`、`deprecated`とし、emptyであることが`stable`を意味することは
決してない。どちらもregistry上のmaintenance recordであり、provenanceのfieldには決してならない。Admissionを
recognition-level winnerへcollapseしてはならない。Cross-Source/attempt/generation readは独立する。

## Read認可とapplicability

Shippedかつcontract-versionedなregistry内の`static-candidate`または`bounded-derived-candidate`だけが
candidateを作り、そのreadをrequestできる。Candidateは有効なboundaryに属し、上記の通常traversalが生成した
entryにmatchしなければならない。Inspection moduleはAPI request、relationship、source fileが与えた任意の
absolute pathを受け付けない。これが覆わない唯一のreadはcompanionのそれであり、admissionが認可するもの
ではなく、admit済みcandidate自身のdirectoryの外のpathには届かない（§ Bounded companion census）。

`bounded-derived-candidate`は自身のmatcherではなくvendor自身のreaderが展開する — readerがwalkの前に開く構成から、またはwalkが受理して読んだfileから — 。再帰はせず、derived candidateは別の
derivationをseedできない。Relationship-onlyおよびexcluded rule、vendor locator、runtime strategy、import、
component reference、remote source、MCP-server-provided instructionはreadを認可しない。

Bounded-derived candidateのread authorityは、そのvendor自身のreaderだけから生じ、readerがwalkをwidenできる形は
1つに限られる。readerはvendor contractが固定したseed — reader自身がwalkの前に開き、そのtargetが同じwalkに加わる構成path、
またはwalkが既に受理して読んだfileであり、そのtargetはwalkの後に自身のreadとともに受理される（tasks.md T759/T761） — を読み、そのcontractが名指すdeclaration fieldを取り、宣言された各値をそのcontract行が定める
nameまたはsegmentとして読み、出荷済みderived ruleのidentityと、そのrule contract行が固定するbase・validate済みsegment・
その行の固定literal suffixから成るtraversal planを返す。返すのはplanであってpathではなく、各segmentはwalkが列挙した
nameと比較されるため、宣言値は固定base配下のentry 1つにしか届かない。planはstatic candidateと同様にowning Source
boundary内で解決しなければならない。reader自身が開くseedはinputであってcandidateではない —
それが同時にpublishされるかどうかは、それを受理するstatic rule（存在する場合）の別の決定である。

Targeted derivationはfree-form path openへfallbackしない。Validateした各segmentはruleが名指すbase配下で
directoryまたはterminal-file stepを1つずつ解決し、neighborはnameとしてだけ扱ってopenも
readもしない。次parentへは直前に選んだdirectory経由だけで到達でき、
readerはplanをwidenできない。

以下のgrammarは、readerがpathへ変換するauthored value — baseの下でjoinしてprobeするsegment — を対象とする。
readerが1つのentry nameとしてwalkへ渡す値はpathではなくnameである: walkはまったく同じ綴りのentryを列挙した
場合にだけそれを受理し、そのentryを開くため、separator・dot segment・home markerを含む値は外へ届くのではなく
何にも届かない。したがってそうした値はauthoredのまま扱い、rejectしてもその傍らで宣言された通常の名前を
落とすだけである。

Authored local pathはdata-model contractのexact pure tokenizerを使う。Prefix policyが扱うのはliteral `./` 1個だけで、U+002Fだけをseparatorと
する。Empty input/segment、leading/trailing/repeated separator、`.`/`..`、backslash、colon、first-segment home marker、control、unpaired
surrogateはcomplete derivationをzero target I/Oでrejectする。Percent/URL/URI decode、environment expansion、home resolve、
platform path parseはない。Readerはpath stringでなくvalidated literal segmentを生成する。Fixed suffix alternativeはliteral
`first-present-exact`を使い、exact classification欠落だけがregistry orderの次alternativeへ進む。最初にpresentとなったpathは後続の
read/parse resultが不成功でもlater alternativeを停止する。Ancestor-chain placementではfixed root-to-narrow placementごとに独立適用する。

Static traversalから独立してadmit済みのpathはderived provenanceを追加で得るだけである。Static selectorの
scopeをderived targetへwidenせず、derived resultが別のderivationのseedになることもない。

Registryはdataだけを持つ。Callback、function pointer、任意の`path.join` recipe、free-form path expression、glob、
regular expressionを供給できない。したがって`bounded-derived-candidate` recordはidentityだけを持ち、`matcher`はnullである:
vendorのreaderが生成しうるものはfieldではなく本sectionが定めるため、展開を記述できるrecordはその境界が
乖離しうる2つ目の場所になる。出荷済みderived ruleは
vendor contractのderived-rule table
（[GitHub Copilot](vendors/github-copilot.ja.md)、[Claude Code](vendors/claude-code.ja.md)、
[OpenAI Codex](vendors/openai-codex.ja.md)）が列挙する。
Variantまたはmappingの追加はcontract-versionedな変更であり、
runtime extension pointではない。

Matchが証明するのは、authored artifactがInspector inventory scope内にあることだけである。Vendorがそれをinstall、
enable、trust、select、load、merge、followすることは証明しない。Surface、project/root context、runtime working
directory、target path、trust、approval、enablement、selection、agent context、tool availability、installation、
managed policy、instruction budget、external stateは独立したcondition factのままとする。Missingまたはexcludedな
inputをsatisfiedとしてdefaultにしてはならず、UIはcandidateをsemantically effectiveと呼んではならない。

Contract群は、existenceとactivationを区別する固定vocabularyを使う。`present`は、authored regular fileが
enabledなboundary内のallowlisted locationに存在することだけを意味する。`recognized`は、present fileが
Inspector ruleにmatchし`(tool, kind)` recognitionを所有することを意味する。`supported`は、`(tool, kind)`
カスタマイズ種別がこのreleaseのfrozen contract catalogにあることを意味する。この3語はauthoredな存在と
Inspector分類だけを表す。`available`は、scopeまたはruntime inputがそのsurfaceに実際に存在することを意味する
（`scope-availability`、`tool-availability`、`installation`）。`applicable`は、vendorのdocumented
applicability condition—surface、各root、`target-match`、関連fact—が具体的なruntime contextで満たされる
ことを意味する。`selected`は、vendorのdocumented resolutionが代替の中からそのartifactを選んだことを意味する
（`selection`）。`enabled`は、該当scopeで該当enablement gateが有効であることを意味する（`enablement`）。
`effective`は、documented runtime edgeの必要condition factがすべて`satisfied`であることを意味する。
この5つのactivation用語はcondition factだけで確立され、file existenceでは決して確立されず、未解決factが
1つでもあればprojectionはconditionalまたは`unknown`のままとなる。

## Symlinkとreadのinvariant

- Symbolic linkは透過的にfollowする。Inspectorは同じpathをreadするagentが見るものを表示するからである。
  Targetがmissingまたはunreadableなlinkはそのfileの`file-unreadable` Diagnosticになり、recursiveな
  traversalはreal pathで訪問済みdirectoryを追跡してlink cycleがscanの終了を妨げないようにする
  （FR-024）。
- Readはread-only、non-create、non-truncateなoperationだけを使い、inspected sourceに対して
  mutation-capable primitiveを一切callしない（FR-023）。
- Relationship target、canonical path string、source textだけではfilesystem openを認可しない。Pathが
  readableになる経路は2つだけである: shipped registry内のstaticまたはbounded-derived admissionと、
  そのadmission自身のdirectoryに限定されたcompanion censusである。
- 1 fileに限定されたfailureはそのfileのDiagnosticとなり、その他の条件を満たせばpublish可能なgenerationを、
  影響を受けない全fileをcompleteに保ったまま`partial`とする（FR-028）。Unreadable rootはSource attemptを
  `root-unreadable`でfailさせ、generationをpublishしない（FR-002）。その他のunexpected failureはattemptをfailさせ、実際の
  errorを報告する。どちらのpathも暗黙のmatcher expansion、fallback read、validity verdictを許可しない。
- File、collection、derivation、relationship、parser、diagnostic、timingのcapacityは、
  [data-model contract](../data-model.ja.md)のとおりNode.js、parser library、OS、filesystem、実行環境から
  継承する。
- Relationshipまたはexcluded recordのtargetが存在するという理由でcandidateへpromoteしてはならない。
  Targetをreadできるのは、独立したstaticまたはbounded-derived admissionがある場合だけである。

## 共通適合要件

Contractとfixtureのvalidationは、次をすべて証明しなければならない。

1. 全`behaviorId`、`ruleId`、`strategyId`、`sourceId`が1回だけ定義され、全referenceが相互解決し、英語と日本語の
   rowがsemantically equivalentである。
2. 全Repository matcher programがRepository source root相対である。Exact、direct-child、descendant-inventory、fixed-
   subtree recursive formに、それぞれ別のpositive fixtureとnear-miss fixtureがある。Matcher fixtureは`regex`
   step（`ANY_NAME`を含む）をacceptし、terminal・adjacentな`recursive-directories` step、
   全non-ASCIIまたはforbidden literal code unitをrejectする。
3. 上向きに解決するvendorのanchored fixtureは、Source rootより上のdirectoryを開かないこと、repository marker
   probeを行わないこと、同じpathのwell-formedなcopyがroot直下の1 directory下にある場合はcandidateではなく
   near missになることを証明する。またupstream traversalが確立していない場合は、vendor-runtime factを別の
   unknownまたはconditionalとして保持する。
4. Typed matcherがimmutableかつversionedなplanへdeterministicallyにcompileされる。Global fixtureは、
   exact targetがrootをenumerateせずにreadされ、fixed subtreeがそのsubtreeと許可されたdescendantだけを
   enumerateし、隣接pathへのenumeration、open、read callが0件であることを証明する。Preview fixtureは
   previewがresolved rootとlexical stateだけを提示すること、保持済みpreview recordがclosed selection policyと
   canonical programを特定するallowlist/traversal-plan versionをbindすることを証明する。Codex fixtureは両ordered targetへ独立にabsent、empty、BOM-only、
   whitespace-only、non-empty、replacement-decoded、binary、unreadable caseを適用し、fallbackがabsent
   または安全にreadしたempty overrideの場合だけ適用されること、unreadable/binaryなoverrideがそのfile
   Diagnosticでbranchを終了してfallbackしないこと、両selectorを同時にpublishしないことを証明する。
   Global-consent fixtureはselector-shaped inputをrejectし、frozen entry 3つすべてをevaluateし、
   missing/unreadableなrootとadmit済みreadable rootをpartitionし、admit済みone-root Sourceをすべて
   1 batch generationへpublishし、unexpected failureが実際のerrorを報告してprovisional
   subset全体をabortすることを証明する。
5. 全staticおよびbounded-derived ruleにpositive、root/nested、boundary、symlink（透過的read）、
   unreadable、該当するmulti-tool fixtureがある。Derived fixtureはさらに、vendorのreaderがcallbackや
   free-form path constructionを使わずvalidated literal segmentだけを受理すること、nonrecursive derivation、
   boundary containment、rejected targetをreadしないことを証明する。
6. Relationship-onlyとexcluded fixtureは、targetが存在する場合やgeneric filenameにmatchする場合もread authorityが
   0であることを証明する。FR-015からFR-018の外側で記録したUser behaviorはGlobal candidateにならない。
7. 1 Source内の複数ruleが受理した1つのphysical fileはSource scan attemptごとに1回readし、独立した各
   provenance — 読み取りを認可したruleと一致したpath — を保持し、admissionをrecognition-level winnerへ
   collapseしない。同じunderlying fileへのhard linkである2つのallowlisted
   pathは、grouping、alias、read-once behaviorを持たない2つの通常の独立fileである。
   Cross-Source/attempt/generation fixtureは独立readを証明する。
8. Root-selection fixtureは、1回だけcaptureした`process.cwd()`、そのまま保持するabsolute `--root`、
   captureに対してresolveするrelative `--root`、明示的なempty valueへの固定startup error、および
   Gunshiのtyped missing-value rejectionを扱い、
   `chdir` call 0件とselection時filesystem I/O 0件を証明する。全supported OS上のtraversal fixtureは、
   symlinkされたcustomization fileが透過的にreadされてlink先contentを表示すること、targetがmissing
   またはunreadableなlinkが`partial` generation内の`file-unreadable`となること、directory link cycleが
   real pathによる訪問済みdirectory追跡で終了すること、unreadable fileが影響を受けない全fileをcomplete
   に保ったまま`file-unreadable`となること、unreadable rootが`root-unreadable`とfailed Source attempt
   になりgenerationをpublishしないことを証明する。Mapped driveとPOSIX network mountはOS-mediatedな
   post-consent filesystem I/Oとしてtest/documentし、FR-022のzero-prohibited-direct-product-request
   assertionの対象外とする。このassertionはexactな2つのauthorized internal loopback classを別々に観測し、
   そのclass外のrequestをすべてrejectする。これにはcustomization-selected、remote-reference、MCP
   requestを含む。
9. Path-spelling fixtureには、exact raw segmentでreadしそのraw綴りのまま公開されるNFD entry nameと、
   invalid non-NULなfile-content UTF-8をreadableな`utf-8-replaced` textとして別途replacement処理する
   caseを含める。`SourceRelativePath`とdisplay stringからfilesystem pathを再構築しない。
10. Official-source fixtureは公式HTTPS host、列挙済みanchor、review date、semantic fingerprint、影響contractへの
   backlink、human-only updateを検証する。Drift resultがbehavior、rule、strategyを自動変更してはならない。
11. Unknown matcher、traversal、derivation kind、不正なtoken列または位置、programとcontract tableの
   対応不一致、malformed selector program、duplicate identifier、orphan reference、contract version mismatch、
   英日semantic differenceがあるregistryはfail closedにする。
12. Production-call instrumentationは、publishされた各fileについてSource scan attemptごとにcontent read
    1回とmutation-capable API/flag 0件を証明する。Write/truncate/create/rename/delete/link、chmod/chown、
    utimes、xattr、ACL、requested atime mutationを使わない。External harnessだけがexecution前後のbyteと、
    stable APIがある場合のxattr/ACLをsnapshotし、そのobservationをsecond product readにしない。OS由来
    atime changeは別記する。

Matcher base、selector/program、derived expansion summary、read-authorizing class、Global scopeの変更はcontract semanticsの変更である。
Maintainerはidentifier compatibilityをreviewし、影響する全evidence backlinkとfixtureを更新し、両言語contractを
同時に更新し、受理するGlobal boundaryが変わる場合はconsent-bound contract versionをbumpしなければならない。
Implementation freeze taskは承認済みbilingual Presentation Allowlistとdigestを検証するだけである。Membership、
source-form applicability、extractor、relationship kindを作成またはsemanticに編集してはならない。そのようなdeltaがあれば
dependent workを停止し、designを同期してplan/taskを再生成する必要がある。
