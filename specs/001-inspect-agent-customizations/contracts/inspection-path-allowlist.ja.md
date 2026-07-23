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

Repository boundaryはselected rootである。`--cwd`を省略した場合は呼び出し時に1回captureしたexact
`process.cwd()`を使う。`--cwd`は最大1回だけ受理する。Absolute valueはそのまま保持し、relative valueは
active platformの`node:path.resolve`でcapture済みの呼び出しdirectoryに対してresolveする。Valueの欠落/empty、
optionの重複は、session/browser作成前に固定actionable startup errorでfailureとなる（FR-001）。Selectionは
filesystem/network I/Oを0件とし、`chdir`を行わない。Generation 0はfilesystem I/Oなしで作成した1つの
Repository Sourceを持つ。そのescape済みroot labelはread authorityを与えず、最初のscanがretained selected
rootをreadする。Rootが存在しないかdirectoryとしてreadできない場合、そのscanはsource-scopedな
`root-unreadable` Diagnosticでfailする（FR-002）。Inspectorはselected rootの上位を
Gitまたはproductのproject rootを探すためにwalkしない。Repository inventoryはselected root配下の通常の
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
| **Relative selector** | Boundary相対かつ`/`でnormalizeしたselectorのnon-empty ordered list。Absolute path、environment expansion、home expansion、URI、暗黙のancestor searchを含まない |
| **Selector program** | Selectorごとに同じ順序で正確に1つのclosed segment program。1 programは複数のtyped expansion stepを持てる |

各selector programは次のclosed unionからなるnon-emptyなordered segment token列を持つ。

- `literal(value)`はcase-sensitiveなexact ASCII segmentを正確に1つmatchする。`value`はU+0021–U+007Eから
  `/`、`\\`、`:`, `*`、`?`、`\"`、`<`、`>`、`|`を除いたcode unitだけからなるnon-empty stringで、`.`と`..`も禁止する。
- `regex(pattern)`はentry nameを正確に1つmatchする。判定は1つのJavaScript正規表現を
  raw entry nameへ標準の`RegExp.prototype.test`セマンティクスで適用する — anchoringとescapeは
  pattern作者の明示的な記述であり、その正しさはshipped rule fixtureが所有する。Non-terminalなら
  directory step、terminalならregular-file stepとし、regex literal（例: `/\.md$/u`）として表記する。
- `recursive-directories`はsegment `**`と表記し、0個以上のdirectoryをmatchする。Terminalにはできず、
  別のrecursive tokenと隣接不可とする。

Static fixed prefix、exact target、fixed derived suffixも同じclosed ASCII literal typeを使う。Registry validationは全non-ASCII
path literalをrejectするため、fixed prefixとexact targetについてはexact raw-byte/code-unit relevanceと後続NFC
classificationは矛盾しない。一方`regex` patternはraw entry name（diskの上ではNFD綴りであり得る）を
testする。Final tokenは
`literal`または`regex`で、regular fileを表す。Programはこのclosed typed grammarだけを使う。
Token、depthのcapacityおよびcompletion behaviorはNode.jsと実行環境から継承する。Registryはこのtyped
program形式で直接authorし、selector textをparser入力にすることはない。本contractのtableは
そのauthored programを示す。文法とliteralの義務はrelease前のregistry contract gateがenforceし、
runtimeで再検査しない。Runtimeはtyped
programだけをloadし、いかなるselector textもgeneral-purpose glob evaluatorへ渡さない。
Product内で唯一のpattern評価は、各`regex` step自身の正規表現をenumerateした1つのentry nameへ
適用することである。

Structured Base、selector list、segment programをauthoritativeとする。Vendor tableの**Expansion** cellはprogramから導く
human summaryで、`exact`、`direct-child`、`descendant-inventory`、`recursive-subtree` labelをprogram順に使う。
Composite selectorでは複数labelを記載できる。

### Repository selectorの要件

全Inspector Repository selector programは正確なRepository source root相対とする。

| Authored program（Repository base） | 必須program summary | 意味 |
|---|---|---|
| `['path', 'file']` | `exact` | Repository source root相対の正確な1 file |
| `['path', ANY_NAME]` | `direct-child` | Root相対の1 directoryのmatching direct child。Segmentは`/`をcrossしない |
| `[ANY_DIRECTORIES, 'name']` | `descendant-inventory` | Root levelとその下を対象にした明示的なInspector inventory。`ANY_DIRECTORIES`は0個以上のdirectory segmentにmatchする |
| `['path', ANY_DIRECTORIES, /\.ext$/u]` | `recursive-subtree` | Root相対の1 subtree内の明示的なrecursive Inspector inventory。Subtree root levelも含む |
| `[ANY_DIRECTORIES, '.claude', 'skills', ANY_NAME, 'SKILL.md']` | `descendant-inventory`の後に`direct-child` | Possible context directoryと正確に1つのdirect skill-name directoryのcross-product。Terminal fileはexact |
| `[ANY_DIRECTORIES, '.claude', 'rules', ANY_DIRECTORIES, /\.md$/u]` | `descendant-inventory`の後に`recursive-subtree` | Possible rule-layer rootと各固定`rules` directory配下のrecursive subtreeのcross-product |

先頭の`ANY_DIRECTORIES`が表すのはInspectorの下向きdescendant inventoryだけである。Vendorが下向きまたは上向きにwalkする、
ancestorを探す、すべてのnested repositoryを認識する、あるruntime contextでmatch fileを適用する、のいずれも
意味しない。これらの主張には別のvendor behavior recordとstrategy recordが必要である。

`ANY_NAME`は常にmatchする`regex` stepで、entry nameを正確に1つmatchする。`**`は
`recursive-directories` tokenの通称である。`regex` stepはrecursionを暗黙に含まず、literal-only programはexactとする。
Repository rule tableはBase、authored selector program、derived Expansion summaryを別々に記載し、immutable registryはその1対1の
typed selector programを保持しなければならない。

### Global selectorの要件

Global ruleは1つの正確なconsent済みvendor boundaryをBaseとして指定し、そのboundary相対のselectorを持つ。
Environment/default-homeの解決はboundary作成の責務であり、selectorの責務ではない。Global selectorは
Repository用の`./` prefixを再利用せず、別vendor boundaryを認可せず、FR-015からFR-018が許可するpathを
拡張できない。

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
Admitted root配下で何をreadするかはdigestがbindするversionが特定する同梱planで固定されるため、
別管理のpreview allowlistは存在しない。Consent digestはcontract versionとtraversal-plan
schema/versionへbindし、それらがclosed selection policyとcanonical selector programを特定する。
Enable operationはdisplay textから再compileせず、accepted previewが表す正確なplanを実行する。

### 通常のtraversalとfileごとのoutcome

Runtime scanはcompile済みplanを`node:fs/promises`上の通常のrecursive walkとして実行する（FR-019）。
Enumerateしたraw entry nameをfilesystem operandとし、public Source-relative PathはそのNFC display
segmentを使う（FR-024）。NFC segment、`/`でjoinした`SourceRelativePath`、display stringから
filesystem pathを再構築しない。Selector relevanceはenumerateしたentry nameに対するexactな
literal比較と、各`regex` patternの標準regular-expression testで判定する — これは
product内で唯一のpattern評価であり、一度に1つのentry nameへ適用される。Symbolic linkは透過的にfollowする。Inspectorは同じpathを
readするagentが見るものを表示するからである。Targetがmissingまたはunreadableなlinkはそのfileの
`file-unreadable` Diagnosticになり、recursiveなtraversalはreal pathで訪問済みdirectoryを追跡して
link cycleがscanの終了を妨げないようにする。Hard linkは通常のfileであり、physical-identity grouping、
read-once semantics、primary/alias path selectionは存在しない。`.git/`、`.hg/`、`.svn/`内部は
traversal対象外とする。

1 fileに限定された問題はそのfileに閉じる（FR-028）。Unreadable fileはfile-scopedな
`file-unreadable` Diagnostic、NULを含むcontentは`file-content-binary`、parser/extractor failureは
`recognition-parse-failed`となり、完全なreadable sourceは表示とcomparison eligibilityを保つ。これらの
outcomeは、その他の条件を満たせばpublish可能なgenerationを、影響を受けない全fileをcompleteに保ったまま
`partial`とする。Invalid non-NULなfile-content UTF-8は代わりにreplacement semanticsで1回decodeし、
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
各`ruleId`、matched selector、
evidence、record-by-record documentation/lifecycle assessment、order fact、applicabilityを含む全accepted provenanceを保持する。
`DocumentationStatus`は正確に`documented | partially-documented | unknown | conflict`とする。Separateなunique fixed-order lifecycle
qualifier arrayは`preview`、`experimental`、`deprecated`で、emptyかstableを意味しない。Admissionを
recognition-level winnerへcollapseしてはならない。Cross-Source/attempt/generation readは独立する。

## Read認可とapplicability

Shippedかつcontract-versionedなregistry内の`static-candidate`または`bounded-derived-candidate`だけがreadを
requestできる。Candidateは有効なboundaryに属し、上記の通常traversalが生成したentryにmatchしなければ
ならない。Inspection moduleはAPI request、relationship、source fileが与えた任意のabsolute pathを
受け付けない。

`bounded-derived-candidate`は独立して受理したstatic seedからのtyped edgeを使い、再帰しない。Derived candidateは別の
derivationをseedできない。Relationship-onlyおよびexcluded rule、vendor locator、runtime strategy、import、
component reference、remote source、MCP-server-provided instructionはreadを認可しない。

Bounded-derived candidateのread authorityは、inspection moduleがinterpretするclosedかつversionedな
`DerivationProgram`だけから生じる。各programは正確なstatic seed rule、declaration field（該当する場合はclosedな
matched-path sentinelを含む）、seed kindを固定する。Baseは`seed-matched-path-parent`または`source-root`だけから選び、
1つのclosed extraction variantを指定する。Segment constructionにはfixed literal segment tokenと、そのvariantが
許可するclosed unionのtyped authored-segment tokenだけを使う。各authored tokenはunparsed pathを注入せず、
validated済みsegmentを正確に1つ生成する。Programはfixed suffixを持ち、許可する全output formを列挙する。
Extractしたsegmentは、static candidateのsegmentと同様にowning Source boundary内で解決しなければ
ならない。

Targeted derivationはfree-form path openへfallbackしない。Interpretした各segmentはseedのdocumented
base配下でdirectoryまたはterminal-file stepを1つずつ解決し、neighborはnameとしてだけ扱ってopenも
readもしない。次parentへは直前に選んだdirectory経由だけで到達でき、
interpreterはplanをwidenできない。

Authored local pathはdata-model contractのexact pure tokenizerを使う。Prefix policyが扱うのはliteral `./` 1個だけで、U+002Fだけをseparatorと
する。Empty input/segment、leading/trailing/repeated separator、`.`/`..`、backslash、colon、first-segment home marker、control、unpaired
surrogate、non-NFC segmentはcomplete derivationをzero target I/Oでrejectする。Percent/URL/URI decode、environment expansion、home resolve、
platform path parseはない。Interpreterはpath stringでなくtyped regex tokenを生成する。Fixed suffix alternativeはliteral
`first-present-exact`を使い、exact classification欠落だけがregistry orderの次alternativeへ進む。最初にpresentとなったpathは後続の
read/parse resultが不成功でもlater alternativeを停止する。Ancestor-chain placementではfixed root-to-narrow placementごとに独立適用する。

Static traversalから独立してadmit済みのpathはderived provenanceを追加で得るだけである。Static selectorの
scopeをderived targetへwidenせず、derived resultが別のderivationのseedになることもない。

Registryはdataだけを持つ。Callback、function pointer、任意の`path.join` recipe、free-form path expression、glob、
regular expressionを供給できない。正確なclosed schemaと初期derived-rule mappingは
[data-model contract](../data-model.ja.md)で列挙する。
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
- Relationship target、canonical path string、source textだけではfilesystem openを認可しない。Shipped
  registry内のstaticまたはbounded-derived admissionだけが認可する。
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
   step（`ANY_NAME`を含む）をacceptし、
   terminalまたはadjacentな`recursive-directories` step、全non-ASCIIまたはforbidden literal code unitをrejectする。
3. 先頭`ANY_DIRECTORIES`のfixtureが証明するのは下向きInspector inventoryだけであり、upstream traversalが確立していない場合は
   vendor-runtime factを別のunknownまたはconditionalとして保持する。
4. Typed matcherがimmutableかつversionedなplanへdeterministicallyにcompileされる。Global fixtureは、
   exact targetがrootをenumerateせずにreadされ、fixed subtreeがそのsubtreeと許可されたdescendantだけを
   enumerateし、隣接pathへのenumeration、open、read callが0件であることを証明する。Preview fixtureは
   previewがresolved rootとlexical stateだけを提示すること、consent digestがclosed selection policyと
   canonical programを特定するallowlist/traversal-plan versionへbindすることを証明する。Codex fixtureは両ordered targetへ独立にabsent、empty、BOM-only、
   whitespace-only、non-empty、replacement-decoded、binary、unreadable caseを適用し、fallbackがabsent
   または安全にreadしたempty overrideの場合だけ適用されること、unreadable/binaryなoverrideがそのfile
   Diagnosticでbranchを終了してfallbackしないこと、両selectorを同時にpublishしないことを証明する。
   Global-consent fixtureはselector-shaped inputをrejectし、frozen entry 3つすべてをevaluateし、
   missing/unreadableなrootとadmit済みreadable rootをpartitionし、admit済みone-root Sourceをすべて
   1 batch generationへpublishし、unexpected failureが実際のerrorを報告してprovisional
   subset全体をabortすることを証明する。
5. 全staticおよびbounded-derived ruleにpositive、root/nested、boundary、symlink（透過的read）、
   unreadable、該当するmulti-tool fixtureがある。Derived fixtureはさらにcallbackまたはfree-form path
   constructionを使わないclosed `DerivationProgram` interpretation、nonrecursive derivation、boundary
   containment、rejected targetをreadしないことを証明する。
6. Relationship-onlyとexcluded fixtureは、targetが存在する場合やgeneric filenameにmatchする場合もread authorityが
   0であることを証明する。FR-015からFR-018の外側で記録したUser behaviorはGlobal candidateにならない。
7. 1 Source内の複数ruleが受理した1つのphysical fileはSource scan attemptごとに1回readし、独立した各
   provenanceを保持する。Matcher、evidence、record-by-record documentation/lifecycle assessment、
   scope/order、applicabilityをcollapseしない。同じunderlying fileへのhard linkである2つのallowlisted
   pathは、grouping、alias、read-once behaviorを持たない2つの通常の独立fileである。
   Cross-Source/attempt/generation fixtureは独立readを証明する。
8. Root-selection fixtureは、1回だけcaptureした`process.cwd()`、そのまま保持するabsolute `--cwd`、
   captureに対してresolveするrelative `--cwd`、value欠落/empty/option重複時の固定startup errorを扱い、
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
9. Path-spelling fixtureには、exact raw segmentでreadしてNFCでdisplayするnon-NFC entry nameと、invalid
   non-NULなfile-content UTF-8をreadableな`utf-8-replaced` textとして別途replacement処理するcaseを
   含める。NFC segment、`SourceRelativePath`、display stringからfilesystem pathを再構築しない。
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
