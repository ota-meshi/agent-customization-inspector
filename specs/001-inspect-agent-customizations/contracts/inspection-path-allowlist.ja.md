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
`process.cwd()`を使う。Windowsではexplicit UNC/server-share/device、current-drive/root-relative、`C:`/`C:foo`
drive-relative formを`resolve`前にrejectし、plain relative optionだけをanchored captureに対してresolveしてabsolute drive
optionを保持する。POSIXはabsolute optionを保持するかrelative optionをcaptureに対してresolveする。全selected absolute
resultは下記と同じshared pure `LexicalAbsoluteRootParts` parserへ合格する。Selectionはfilesystem/network I/O、`chdir`、
per-drive working-directory resolutionを0件とし、invalid option shapeはsession/browser作成前にfailureとなる。
Generation 0は中央admission前にnon-authorizingなRepository Sourceを1つ持つ。Inspectorはselected rootの上位を
Gitまたはproductのproject rootを探すためにwalkしない。Repository inventoryは後でvalidateしたselected-root boundary
recordの内側だけで行う。Vendorが異なるruntime rootやwalk方向を使う場合、そのfactはvendor contractと
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
- `one-segment(suffix)`はnon-empty segmentを正確に1つmatchする。`suffix`がemptyなら`*`、それ以外は
  `*<fixed-literal-suffix>`と表記する。Non-empty suffixは`literal(value)`と同じclosed ASCII typeを使い、empty suffixは
  bare `*`を維持するためこのtokenだけで許可する。Non-terminalならdirectory step、terminalならregular-file stepとする。
- `recursive-directories`はcomplete segment `**`だけで表記し、0個以上のdirectoryをmatchする。Terminalにはできず、
  別のrecursive tokenと隣接不可とする。

Static fixed prefix、exact target、fixed derived suffixも同じclosed ASCII literal typeを使う。Registry validationは全non-ASCII
path literalをrejectするため、exact raw-byte/code-unit relevanceと後続NFC classificationは矛盾しない。Final tokenは
`literal`または`one-segment`で、regular fileを表す。Programはこのclosed typed grammarだけを使う。
Parser、token、depthのcapacityおよびcompletion behaviorはNode.js、parser、実行環境から継承する。Build compilerは
compact selectorをtyped programへparseし、selectorへのexact canonical round-tripを要求する。Runtimeはvalidated済みtyped programだけをloadし、
textをgeneral-purpose glob/regular-expression evaluatorへ渡さない。

Structured Base、selector list、segment programをauthoritativeとする。Vendor tableの**Expansion** cellはprogramから導く
human summaryで、`exact`、`direct-child`、`descendant-inventory`、`recursive-subtree` labelをprogram順に使う。
Composite selectorでは複数labelを記載できる。

### Repository selectorの要件

全Inspector Repository selectorは、正確なRepository source rootを意味するliteral `./`で始める。Bareな
`**/` prefixはinvalidであり、registry validationをfailureにしなければならない。

| Form | 必須program summary | 意味 |
|---|---|---|
| `./path/file` | `exact` | Repository source root相対の正確な1 file |
| `./path/*` | `direct-child` | Root相対の1 directoryのmatching direct child。`*`は`/`をcrossしない |
| `./**/name` | `descendant-inventory` | Root levelとその下を対象にした明示的なInspector inventory。`**`は0個以上のdirectory segmentを表す完全な1 segment |
| `./path/**/*.ext` | `recursive-subtree` | Root相対の1 subtree内の明示的なrecursive Inspector inventory。Subtree root levelも含む |
| `./**/.claude/skills/*/SKILL.md` | `descendant-inventory`の後に`direct-child` | Possible context directoryと正確に1つのdirect skill-name directoryのcross-product。Terminal fileはexact |
| `./**/.claude/rules/**/*.md` | `descendant-inventory`の後に`recursive-subtree` | Possible rule-layer rootと各固定`rules` directory配下のrecursive subtreeのcross-product |

`./**/`が表すのはInspectorの下向きdescendant inventoryだけである。Vendorが下向きまたは上向きにwalkする、
ancestorを探す、すべてのnested repositoryを認識する、あるruntime contextでmatch fileを適用する、のいずれも
意味しない。これらの主張には別のvendor behavior recordとstrategy recordが必要である。

`*`は正確に1つのnon-empty segmentにmatchする。`**`はcompleteな`recursive-directories` tokenとしてだけ有効である。
`one-segment` tokenはrecursionを暗黙に含まず、literal-only programはexactとする。Repository rule tableはcompact
textだけに依存せずBase、Relative selector、derived Expansion summaryを別々に記載し、immutable registryは1対1の
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

Global planはさらに狭く、vendor-home rootのenumerationから開始してはならない。Exact Global targetでは、filesystem
serviceはboundaryをsnapshotし、fixed literal ancestor chainとtargetだけを`lstat`する。Rootを`opendir`しない。
Contract済みCopilot `instructions/` subtreeのような明示的fixed subtreeでは、そのsubtreeまでのfixed chainだけを
`lstat`し、そのsubtreeとsegment programが許可するdescendantだけを`opendir`できる。Planが到達しない隣接pathに
対して`opendir`、`lstat`、`realpath`、open、readを一切実行しない。許可されたpathが存在しなくてもplanを広げず、
sibling discoveryを開始しない。Verificationに成功したfixed targetはtargeted enumeration recordを作る。
「Enumeration record」はparent directoryをlistしたことを意味しない。

Planはclosedな`selectionPolicy`も持つ。`codex.global.instructions`以外の全ruleは`all-matches`を使う。
`codex.global.instructions`のexact ordered selectorは`AGENTS.override.md`、次に`AGENTS.md`で、policyは
`codex-global-first-non-empty`とする。このbranchはoptionalな先頭UTF-8 BOMを除いたdecoded stringの
`String.prototype.trim().length > 0`を確定する目的だけでoverrideを安全にreadする。Non-empty overrideならfallbackへ一切operationせずshort-circuitし、
overrideがabsentまたは安全にemptyと確定した場合だけ`AGENTS.md`へ進む。Whitespace-only fileはemptyとする。
Replacement decodeされた`utf-8-replaced` textも変更せず判定に参加し、全`U+FFFD`をnon-whitespaceとする。
Deterministicにunsafeまたはbinaryなcandidateなら後続selectorを調べず終了する。`absent`はroot verification後に
contractで宣言したtarget `lstat`から返るexact `ENOENT`だけを意味し、同じcodeでもobservation後なら
`entry-disappeared`とする。`open`/`read`を含むその他すべてのthrow/rejectionはdomain catchもfallbackもせず
propagateする。Policyは選択したnon-empty fileをpublishし、両selectorを同時にはpublishしない。

No-I/O Global previewの`pathPatterns`は、この同じimmutable planからrenderし、別管理のpreview allowlistを持たない。
Consent digestはcontract version、traversal-plan schema/version、closed selection policy、canonical selector programへbindする。Enable operationは
display textから再compileせず、accepted previewが表す正確なplanを実行する。

### Closed structural-`lstat` checkpoint

Compile済みplanは下記exact ordered `StructuralLstatCheckpointTemplate` catalogを持ち、各selectorはinstantiate可能な
discovery checkpoint IDだけを持つ。各templateは`operation: lstat`、`readAuthority: false`、phase、target role、observation
state、exact-`ENOENT` outcome、multiplicityを固定する。`safe-fs.ts`はcall前にexact root operation、selectorまたはticket、
raw target identity、occurrenceへbindしたmodule-private single-call instanceをmintしなければならず、return/rejectionのどちらでも
consumeする。Callerはsynthesize、serialize、reuse、retarget、別operationへのtransferを行えない。

Selector compilationはlosslessかつclosedとする。`repository-program`はempty `fixedPrefix`、complete matcher programの
`remainder`、`discoveryCheckpointIds: []`を持つ。`global-exact`はterminal targetを含むnon-empty all-literal `fixedPrefix`とempty
`remainder`を持ち、1 component targetならrow 20、row 3、それ以外はrow 20、row 2、row 3の順とする。Row 20はdescendant I/O前にrootをrecheckし、row 2はtarget以外、row 3はtargetを
coverする。`global-fixed-subtree`はsubtree rootを含むnon-empty maximal leading literal chain、non-emptyかつnon-literal-firstな
remainder、row 20の後にrow 2を持ち、leafをopenする前に全prefix componentをrow 2でcoverする。全row-2 componentは次operand構築前に
それ自身のrows 4–7 directory sequenceを受け、leaf sequenceもopen前に完了する。Registry-authored field、empty/non-maximalな
Global prefix、その他全field/ID tupleをrejectする。Row 4–7はobserved candidateごとにautomaticでID arrayへ入れず、row 8–19は
ticketごと、rows 21–24は全`opendir`前、rows 25–28はcomplete sibling collection後かつbuffer使用前にautomaticとする。

| Order / checkpoint ID | Phaseとtarget role | Observation / exact-`ENOENT` outcome | Multiplicity |
|---|---|---|---|
| 1 `root-admission-component` | `root-admission`; `lexical-root-component` | `pre-observation`; `absent` | Parsed anchorに1回、続いて各componentへexact platform operandでroot-to-leaf |
| 2 `selector-fixed-prefix-discovery` | `selector-discovery`; `selector-fixed-prefix` | `pre-observation`; `absent` | 過去のselectorが観測済みかを問わず、各selector executionの全fixed-prefix component |
| 3 `selector-exact-target-discovery` | `selector-discovery`; `selector-exact-target` | `pre-observation`; `absent` | 試行するexact static targetごと。Codex primary/fallback checkpoint |
| 4 `enumerated-admission-root-recheck` | `enumerated-admission`; `admitted-root` | `post-observation`; `entry-disappeared` | Observed candidateごと |
| 5 `enumerated-admission-ancestor-recheck` | `enumerated-admission`; `admitted-ancestor` | `post-observation`; `entry-disappeared` | Admitted ancestor/observed candidateごとにroot-to-leaf |
| 6 `enumerated-admission-candidate-first` | `enumerated-admission`; `observed-candidate-first` | `post-observation`; `entry-disappeared` | `realpath`前にobserved candidateごと |
| 7 `enumerated-admission-candidate-repeat` | `enumerated-admission`; `observed-candidate-repeat` | `post-observation`; `entry-disappeared` | `realpath`後にobserved candidateごと |
| 8 `pre-open-root-recheck` | `pre-open`; `admitted-root` | `post-observation`; `entry-disappeared` | Ticketごと |
| 9 `pre-open-ancestor-recheck` | `pre-open`; `admitted-ancestor` | `post-observation`; `entry-disappeared` | Admitted ancestor/ticketごとにroot-to-leaf |
| 10 `pre-open-candidate-first` | `pre-open`; `ticketed-candidate-first` | `post-observation`; `entry-disappeared` | Candidate `realpath`前にticketごと |
| 11 `pre-open-candidate-repeat` | `pre-open`; `ticketed-candidate-repeat` | `post-observation`; `entry-disappeared` | Candidate `realpath`後にticketごと |
| 12 `pre-read-root-recheck` | `pre-read`; `admitted-root` | `post-observation`; `entry-disappeared` | Ticketごと |
| 13 `pre-read-ancestor-recheck` | `pre-read`; `admitted-ancestor` | `post-observation`; `entry-disappeared` | Admitted ancestor/ticketごとにroot-to-leaf |
| 14 `pre-read-candidate-first` | `pre-read`; `ticketed-candidate-first` | `post-observation`; `entry-disappeared` | Candidate `realpath`前にticketごと |
| 15 `pre-read-candidate-repeat` | `pre-read`; `ticketed-candidate-repeat` | `post-observation`; `entry-disappeared` | Candidate `realpath`後にticketごと |
| 16 `post-read-root-recheck` | `post-read`; `admitted-root` | `post-observation`; `entry-disappeared` | Ticketごと |
| 17 `post-read-ancestor-recheck` | `post-read`; `admitted-ancestor` | `post-observation`; `entry-disappeared` | Admitted ancestor/ticketごとにroot-to-leaf |
| 18 `post-read-candidate-first` | `post-read`; `ticketed-candidate-first` | `post-observation`; `entry-disappeared` | Candidate `realpath`前にticketごと |
| 19 `post-read-candidate-repeat` | `post-read`; `ticketed-candidate-repeat` | `post-observation`; `entry-disappeared` | Candidate `realpath`後にticketごと |
| 20 `selector-root-recheck` | `selector-discovery`; `admitted-root` | `post-observation`; `entry-disappeared` | 全Global selector execution開始時にrow 2/3より前 |
| 21 `pre-directory-open-root-recheck` | `pre-directory-open`; `admitted-root` | `post-observation`; `entry-disappeared` | 全`opendir`前。Source root自体ではsole pre-open row |
| 22 `pre-directory-open-ancestor-recheck` | `pre-directory-open`; `admitted-ancestor` | `post-observation`; `entry-disappeared` | Rootとnon-root open対象directoryの間の各directoryをroot-to-leaf |
| 23 `pre-directory-open-target-first` | `pre-directory-open`; `directory-to-open-first` | `post-observation`; `entry-disappeared` | Non-root open対象directoryのexact-platform `realpath`前 |
| 24 `pre-directory-open-target-repeat` | `pre-directory-open`; `directory-to-open-repeat` | `post-observation`; `entry-disappeared` | Non-root open対象directoryのexact-platform `realpath`後かつ`opendir`前 |
| 25 `post-directory-enumeration-root-recheck` | `post-directory-enumeration`; `admitted-root` | `post-observation`; `entry-disappeared` | Complete sibling collection後かつ使用前。Source rootではsole post-enumeration row |
| 26 `post-directory-enumeration-ancestor-recheck` | `post-directory-enumeration`; `admitted-ancestor` | `post-observation`; `entry-disappeared` | Rootとnon-root enumerated directoryの間の各directoryをroot-to-leaf |
| 27 `post-directory-enumeration-target-first` | `post-directory-enumeration`; `enumerated-directory-first` | `post-observation`; `entry-disappeared` | Non-root enumerated directoryのexact-platform `realpath`前 |
| 28 `post-directory-enumeration-target-repeat` | `post-directory-enumeration`; `enumerated-directory-repeat` | `post-observation`; `entry-disappeared` | Non-root enumerated directoryのexact-platform `realpath`後かつ`fs.Dir` close確認前 |

Compilerはmissing、extra、reordered、widened、unresolvedなcatalog/reference dataをrejectする。Runtimeはbound plan/ticketが
要求するoccurrenceだけをinstantiateする。Table orderはimmutable schema orderでglobal chronological runではない。各Global selectorではrow 20を
row 2/3より前に実行し、全`opendir`直前にrow 21、ancestor順row 22、row 23、exact-platform `realpath`、row 24を完了する。
Registry登録済み`fs.Dir`をexplicit `Dir.read()`がnullを返すまでdriveし、openのままrow 25、ancestor順row 26、row 27、exact-platform
`realpath`、row 28を完了する。Sibling classification/descent/ticket発行前にregistry `close-confirmed`を要求する。Source-root enumerationはrows 21/25だけを使う。Instanceの1回の`lstat`からの
`error.code === 'ENOENT'`だけがlisted outcomeを返す。Phase/role/target mismatch、consumedまたはmissing instance、別error
code、undeclared `lstat`、あるいは`opendir`、`open`、`read`、`realpath`、`FileHandle.stat`その他operationのrejectionは
変更せずpropagateする。成功したcheckpointを後続callのcatchへ再利用できない。Codex policyではprimary selectorのrow 3だけが
`absent`としてfallbackへ進める。
Observed candidateはcomplete sibling classification後のcollision-free selected `Dirent`、row 3で正常観測したimmutable exact
target、またはrow 2で正常観測した任意のimmutable Global fixed-prefix directory componentのいずれかである。それぞれticket発行、directory
descent、targeted `opendir`より前に正確に1回のrow 4–7 sequenceを持ち、expected file/directory typeをobservationへbindする。Rows 21–24で
directoryをopen直前、rows 25–28とconfirmed closeでcomplete enumerationのsibling buffer使用前に再検証する。Derived
candidateはselector-discovery row 2/3をmintしない。Existing collision-free record/ticketがあれば再利用し、なければcentral serviceが
exact `DerivationProgram` segment sequenceに認可されたtyped targeted enumerationだけを行う。Current admit済みparentへrows 21–24を完了してからopenし、complete
sibling name setを収集する。Rows 25–28とconfirmed closeを完了してからsetをclassifyし、uniqueなexact segmentを1つ選び、そのselected `Dirent`へdescent/ticket発行前にrow 4–7 sequenceを1回与える。
選ばれないsiblingへentry I/Oを行わない。Classification欠落はparent enumeration後のdeterministic miss、relevant unrepresentable nameまたは
collisionはSource-fatalとする。

Post-observation `entry-disappeared`ではroot-role rows 4/8/12/16/20/21/25をpathless source-fatal `safe-fs-root-stale`、ancestor-role
rows 5/9/13/17/22/26、directory-to-open rows 23/24、enumerated-directory rows 27/28をpathless source-fatal `safe-fs-ancestor-stale`へmapする。Candidate-file rowはdata-model
contractのexact mappingを使う。正常return recordはselector-discovery、enumerated-admission、pre-directory-open、post-directory-enumeration、pre-open、pre-read、post-readで同じ
first-match順を使う。Unusable required data → `safe-fs-boundary-unverifiable`、link → `safe-fs-link-rejected`、bound type mismatch →
`safe-fs-type-rejected`、canonical mismatch → `safe-fs-boundary-unverifiable`、`dev` change → `safe-fs-device-changed`、`ino`/handle identity
change → `safe-fs-race-detected`、その他mode/size/time/terminal-`nlink` change → `safe-fs-file-metadata-changed`とし、first matchで停止する。全Global
row-2 componentは次component operand構築前に`expectedType: directory`でこのclassificationとrows 4–7を直ちに受ける。
これは各selector executionごとに独立して繰り返し、過去のselectorが観測したshared prefixを後続selector独自のrow 2と
rows 4–7 sequenceなしに再利用しない。

### Root spelling admissionとplatform operand

Row 1その他のfilesystem callより前に、中央serviceは[data-model contract](../data-model.ja.md)で定義したclosed pure
`LexicalAbsoluteRootParts` parserをexact retained rootへ適用する。全platformでNULとunpaired UTF-16 surrogateをzero I/Oでrejectする。
POSIXはroot stringのU+FFFDもrejectし、`/`または1個の`/`で区切ったnon-empty non-dot componentだけを受理して、anchorと各componentの
private Buffer prefixを作る。Windowsはanchored drive formだけを受理する。Leading separator 2個を持つ全explicit UNC/server-share/device spelling、
current-drive、drive-relative、device-namespace、malformed drive formをI/O前にrejectし、server/share spellingを`lstat`、`realpath`、DNS、
SMB accessへ到達させない。Exact UTF-16 code unitを保持してdrive anchorと各componentだけをprobeする。Row 1はこれらexact operandだけを
使う。`realpath`はPOSIXでBuffer、Windowsでexact plainまたはmapped drive-namespace stringとして返してparseし、canonical valueは比較専用で
raw I/O operandを置換しない。Syntactically plain driveはOS-mapped network storageの場合があり、POSIX rootはnetwork mountの場合がある。
Pure grammarはそれらを識別できず、consent/root selection後のexact-operand checkはnetwork filesystem I/OとOS-mediated trafficを発生させ得る。
FR-022はこのtrafficをdirect product-issued outbound-request assertionから除外し、そのassertionにlocal fixture rootを要求する。このassertionは、
発行済みのexactな`127.0.0.1` authorityにおける2つのexactなFR-022 authorized internal loopback class、すなわちclosedなunauthenticated
static/SPA `GET`/`HEAD`とcapability-authenticated declared API requestを別々に分類・検証し、それ以外のproduct network/URL/MCP requestを0件とする。Pre-I/O
filesystem/DNS/SMB guaranteeはexplicit server/share spellingだけを対象にする。

`origin: process-cwd`の追加operandは`lstat('.')`だけで、そのidentityをselected absolute rootへ一致させる。Relative `--cwd`のoriginal
spellingはprobeせず、全admission/descendant I/Oがlexically selected absolute rootだけを使う。Root/candidate containmentはplatformの
exact component、すなわちPOSIX byteまたはWindows code unitをcase fold/Unicode normalizationなしで比較する。正常returnされた
malformed、non-round-tripping、non-contained canonical dataはfail closedとする。Redundantなplatform `path.relative` checkはlossless
parse後にrejectする目的だけで使用でき、admitもpath constructionもしない。Nodeが公開するcase、normalization、short-name expansion差を
rejectし、platformが公開しないaliasは明示的な`platform-unobservable` limitationとして残す。

### MatchingとNode.js entry verification

Enumerated POSIX nameは`opendir(parentBuffer, { encoding: 'buffer' })`が返すprivate defensive Buffer copy、Windows nameは
returned UTF-16 code-unit sequenceのexact valueとする。Planがparent enumerationを禁止するtargeted fixed pathでは、代わりにimmutable
registry literal segmentを同じplatform representationへcompileする。Closed ticket-path unionだけをdescendant operandにし、
all-enumerated `RawEntrySegment[]`、all-registry exact `RegistryTargetSegment[]`、またはnon-empty fixed registry prefixの後に
non-empty enumerated raw remainderが続く唯一のmixed formとする。Element-wise unionは禁止する。NFC `classificationSegments`、それを`/`でjoinした`SourceRelativePath`、canonical value、display stringから
filesystem pathを再構築しない。

Selector relevanceはtext decode前のexact byte/code unitで判定する。Literal/one-segment suffix comparisonはexactとする。Recursive
directory positionではknown directoryまたはunknown `Dirent` typeをpotentially relevant、known non-directoryだけを`lstat`なしでignoreできる。
Relevant POSIX nameは`isUtf8`とexact decode/re-encode equality、relevant Windows nameはunpaired surrogateなしを要求する。Relevantな
unrepresentable nameにはpathless session Diagnostic `safe-fs-entry-name-unrepresentable`を付け、そのentryへの`lstat`/descent/`realpath`/
open/readを0件とし、source attemptをfatalにしてgeneration/partial itemをpublishしない。Nonserialized lifecycle ownerは
`repositoryFailureDiagnosticId`、`GlobalControlView.toolFailures`、または`StaleSourceFailure`からだけ公開する。Irrelevantな
unrepresentable nameはignoreする。このfilename ruleはfile contentと別で、representable file内のinvalid non-NUL UTF-8 byteはreplacement
semanticsで1回decodeし、そのまま`utf-8-replaced` textとして処理する。

Rows 21–24は各open直前にdirectory/root/ancestorのexact bigint `dev`、`ino`、`mode`、`mtimeNs`、`ctimeNs`をbindする。
Openした各directoryはdescend/open前にcomplete raw sibling bufferへ収集する。Rows 25–28でsame identity/type/modeと不変の
`mtimeNs`/`ctimeNs`を要求し、registryが`fs.Dir` closureをconfirmするまでbufferをclassify/useしない。Enumeration中のdetectable
create/remove/renameはsource-fatalでgenerationをpublishしない。Completion/post-check/close中のthrow/rejectionはtrigger所有outer boundaryへ
propagateし、attempt result/generationをpublishせずcontracted-partialにもならない。同じNFC classification keyを持つ異なるraw relevant
siblingは全memberをpathless session Diagnostic `safe-fs-path-normalization-collision`でfail closedにする。どのmemberにもdescend/readせず、
source attemptをfatalにしてgeneration/partial itemをpublishしない。Collisionしない単一NFD spellingはexact raw segmentでreadし、public pathを
NFCにする。

Canonical containmentとrows 4–19 sequenceは上記platform representationを使う。各observationは`expectedType: directory | regular-file`を
bindする。Root、ancestor、fixed-subtree leaf、derived intermediate segment、nonterminal matcher stepはdirectory、terminal candidateだけが
regular fileを要求する。各phaseは最初に`lstat`してlink、bound expected typeと異なるtype、changed identityをrejectし、次にcandidate
`realpath`をparseしてexact component比較し、再度`lstat`してexact metadataを比較する。
したがってstable symlinkはcandidate `realpath`前にrejectされる。Serviceは結果のinternal enumeration recordだけを公開し、classifierは
そのexact recordだけをselectできる。

Terminal-file identityをusableとするのは、全path `lstat`とsame-handle `FileHandle.stat({ bigint: true })`がexact bigint field、
`ino !== 0n`、`nlink > 0n`を公開する場合だけとする。1 Source scan attempt内のhard-link groupingは全phase/memberで同一
`(dev, ino)`、stableかつequalな`nlink`、`nlink >= BigInt(admittedPathCount)`を要求する。Missing、non-bigint、zero/negative、
changing、group-inconsistentなidentity metadataはaccepted byte 0で`safe-fs-boundary-unverifiable`を返す。Nodeが識別できないplausible
non-unique valueは明示的な`platform-unobservable` limitationとする。Source、attempt、generation間でticket、receipt、buffer、
read-once groupを共有せず、各々が同じunderlying objectを1回独立にreadし得る。

下記content-dependent ordered Codex fallbackを除き、1 Source attemptは全static traversal、sibling classification、rows 4–7 admission、
physical-group formationを完了してからstatic groupをconsumeする。Groupはdeterministic primary-path順にconsumeし、後のlate static admissionは
second readではなくinternal invariant failureとする。そのattempt内でphysical groupをconsumeする前に1 physical fileの複数collision-free hard-link admissionを識別した場合、unsigned UTF-8-bytewiseで最小のNFC pathをprimaryとし、残るunique pathを
ordered aliasとする。全raw provenance/ticketを保持し、deterministic primary/alias順でsole primary-path open前に全ticketへrows 8–11、read前に
rows 12–15、primary handleから1回だけcomplete readした後もhandleを開いたままrows 16–19を実行する。Byte受理前に各pathのidentity/metadataが
enumeration snapshotと同じhandle identityへ一致し続けなければならない。Alias disappearance、replacement、divergenceは全byteを破棄し、旧観測からの
publishを禁止する。Filter/detail/selectionは全pathにmatchし、file Diagnosticはprimaryだけを使う。

`codex-global-first-non-empty` policyは唯一のstatic-discovery例外で、overrideがabsentまたは安全にreadしてemptyと判定するまで
fallback targetにtouchしない。Consume済みempty overrideと後からadmitしたfallbackが同じusable `(dev, ino)`の場合、fallbackの
open/readは0でalias/provenance mergeしない。Contracted-partial resultは`readState: boundary-rejected`とfile-scoped
`safe-fs-ordered-fallback-alias-rejected`を持つdiagnostic-only fallback fileを含み、empty override probeはpublishしない。Byte再利用、
group再open、fallbackのsilent omissionを禁止する。

Derivationはstatic seed read後に実行する。Exact already-verified raw pathは別ticket/readなしでderived provenanceを得る。別raw hard-link pathは
未consumeのphysical groupへjoinし、上記通常checkをすべて受けられる。しかしgroupをopen/read済みならlate derived aliasはopen/read 0件、
alias/provenanceとしてpublishせず、existing fileへfile-scoped `safe-fs-late-derived-alias-rejected`を追加する。Generationはcontracted-partialで、
existing byte/read stateを変えない。Re-read、late pathへのold byte reuse、Diagnosticのsilent dropは禁止する。

Derived selectorをenumeration-record lookupへ渡す前に、各NFC classification segmentについてNUL、control character、
Windows-special character、trailing dot/space、device basename、alternate-data-stream spelling、case・short-name・
その他aliasのambiguityを拒否する。残った全segmentはcollisionのないenumerated classification record
1つだけへresolveしなければならず、そのraw segmentだけをread用path spellingとして使う。`.git/`、`.hg/`、
`.svn/`内部はtraversal対象外とする。

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
そのattemptのphysical group consume前にacceptedとなった各`ruleId`、matched selector、
evidence、record-by-record documentation/lifecycle assessment、order fact、applicabilityを含む全accepted provenanceを保持する。
`DocumentationStatus`は正確に`documented | partially-documented | unknown | conflict`とする。Separateなunique fixed-order lifecycle
qualifier arrayは`preview`、`experimental`、`deprecated`で、emptyかstableを意味しない。Admissionを
recognition-level winnerへcollapseしてはならない。Cross-Source/attempt/generation readは独立する。Late ordered fallbackまたはderived
hard-link pathは上記の各explicit rejection protocolに従い、accepted alias admissionではない。

## Read認可とapplicability

Shippedかつcontract-versionedなregistry内の`static-candidate`または`bounded-derived-candidate`だけがsafe readを
requestできる。Candidateは有効なboundaryに属し、正確なenumerated regular-file recordにmatchし、
中央集約したNode.js serviceによるlexical/`realpath` containmentの再確認と
enumeration/open/post-read identity checkに合格しなければならない。

`bounded-derived-candidate`は独立して受理したstatic seedからのtyped edgeを使い、再帰しない。Derived candidateは別の
derivationをseedできない。Relationship-onlyおよびexcluded rule、vendor locator、runtime strategy、import、
component reference、remote source、MCP-server-provided instructionはreadを認可しない。

Bounded-derived candidateのread authorityは、中央集約serviceがinterpretするclosedかつversionedな
`DerivationProgram`だけから生じる。各programは正確なstatic seed rule、declaration field（該当する場合はclosedな
matched-path sentinelを含む）、seed kindを固定する。Baseは`seed-matched-path-parent`または`source-root`だけから選び、
1つのclosed extraction variantを指定する。Segment constructionにはfixed literal segment tokenと、そのvariantが
許可するclosed unionのtyped authored-segment tokenだけを使う。各authored tokenはunparsed pathを注入せず、
validated済みsegmentを正確に1つ生成する。Programはfixed suffixを持ち、許可する全output formを列挙する。
Extractしたsegmentは、static candidateと同じcollision-free classificationおよびcontainment admissionに
合格しなければならない。

Targeted derivationはfree-form path openへfallbackしない。各segmentでserviceはadmit済みenumeration recordを再利用するか、exact admit済みparent
だけをenumerateしてunique collision-free raw-name recordを選ぶ。新しく選んだdirectory/terminal fileは通常row 4–7 checkを持つobserved
candidateで、neighborはnameとしてだけ扱い`lstat`、`realpath`、open、readを行わない。次parentへは直前に選んだdirectory経由だけで到達でき、
interpreterはplanをwidenできない。

Authored local pathはdata-model contractのexact pure tokenizerを使う。Prefix policyが扱うのはliteral `./` 1個だけで、U+002Fだけをseparatorと
する。Empty input/segment、leading/trailing/repeated separator、`.`/`..`、backslash、colon、first-segment home marker、control、unpaired
surrogate、non-NFC segmentはcomplete derivationをzero target I/Oでrejectする。Percent/URL/URI decode、environment expansion、home resolve、
platform path parseはない。Interpreterはpath stringでなくtyped one-segment tokenを生成する。Fixed suffix alternativeはliteral
`first-present-exact`を使い、exact classification欠落だけがregistry orderの次alternativeへ進む。最初にfully observedしたpathは後続safe/type/
read/parse resultが不成功でもlater alternativeを停止する。Ancestor-chain placementではfixed root-to-narrow placementごとに独立適用する。

Derived-only ticketはmodule-private `DerivedTicketAuthority`により、exact program、current source/boundary/generation/scan、consumed static seed
ticket/provenance、source occurrence、placement/alternative index、typed segment tokenをtarget 1件へbindする。Serialize、retarget、revoke後reuse、
別derivationのseed化を禁止する。Static traversalから独立admit済みticketはそのtraversal authorityを保持して別provenanceだけを得る。Seed
traversal authorityをderived targetへwidenしない。

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

## Symlink、alias、resource invariant

- Symbolic-link file/directoryとnon-regular candidateを拒否する。Junction、mount-point change、reparse point、
  canonicalizeしにくいalias、boundary crossingは、Node.jsが検出に十分な情報を公開する場合にfail closedにする。
  Lexical containmentと`realpath` containmentの両方を確立できない場合もfail closedにする。正常に返された必要metadata
  またはcanonicalizationがambiguousまたはunusableな場合、serviceは
  `safe-fs-boundary-unverifiable`をemitし、candidateを拒否する。Unverifiable stateがrootまたはtraversalで共有する
  ancestorに属する場合はsource全体を拒否する。
- Validated source-boundary recordと正確なenumeration recordは、中央集約したread operationだけを認可する。
  Canonical path string、relationship target、source textだけでfilesystemを直接openしてはならない。
- Catchするfilesystem rejectionは、contractで宣言したstructural `lstat`からのexact `ENOENT`だけであり、
  observation前なら`absent`、後なら`entry-disappeared`にだけmapする。Message textからcodeを推測せず、このruleを
  `open`、`read`、その他のthrow/rejectionへ適用しない。
- Open直前にserviceはroot identityとancestor `lstat`を反復し、上記のordered candidate verification sequenceを
  実行する。`node:fs.constants.O_NOFOLLOW`が存在し、そのNode.js/platform combinationで有効な場合、
  candidateを`O_NOFOLLOW`付きでopenしなければならない。これはfinal componentに対する必須のdefense in depthで
  あり、周囲のcheckの代替ではない。Open後かつbyteを読む前に同じordered candidate verification sequenceを再び
  実行し、openした`FileHandle.stat()`のidentity、type、size、関連timestampを、そのphaseの両`lstat`結果および
  enumeration/pre-open snapshotと比較する。
- Read後かつparse、publish、commitより前に、root identityと全ancestor `lstat`を反復し、同じordered
  candidate verification sequenceを実行して、同じopen中`FileHandle`の`stat()`を呼ぶ。Ambiguity、
  containment failure、identity、type、size、関連timestampの変化を検出した場合はbyte buffer全体をdiscardして
  fail closedにする。Boundaryを検証不能な場合は`safe-fs-boundary-unverifiable`、その他の検出済みraceは該当する
  actionableかつsecret-safeなdiagnosticを返す。
- Public Node.js APIにはportableなdirectory-handle-relative openがない。そのためactive adversarial processがcheck間に
  source rootまたはancestorを置換する場合、全platformでcross-platformなkernel-enforced containment guaranteeはない。
  Final componentの置換は、有効な`O_NOFOLLOW`が存在しない場合だけ初期リリースのthreat model外とする。
  通常の同時editと全detectable raceは
  scope内であり、fail closedにして全byteをdiscardしなければならない。Same-device bind mount、報告されない
  reparse behavior、Node.jsが公開しないその他のOS semanticsは明示的なplatform limitationであり、absoluteな
  containment guaranteeとして表現しない。
- File、collection、derivation、relationship、parser、diagnostic、timingのcapacityは、
  [data-model contract](../data-model.ja.md)のとおりNode.js、parser library、OS、filesystem、実行環境から継承する。
  Throw/rejectionはdomain cause classificationもrecoveryもせずpropagateし、REST所有の場合はgeneric Operation Errorだけで
  表す。Contracted partialは、完全なtraversal後のFR-028対象でdeterministicなnon-throwing outcomeだけに許可する。どちらのpathも
  暗黙のexpansion、authorityなしのretry、fallback read、validity verdictを行わない。
- Deterministicにunsafe、malformed、binary、changedのcandidateが1つあっても、上記contracted-partial ruleを満たす場合は
  unaffected candidateのreportを妨げない。Throw/rejectionはcurrent-attempt resultをpublishせず、owning-boundary ruleに従う。
- Relationshipまたはexcluded recordのtargetが存在するという理由でcandidateへpromoteしてはならない。Targetを
  readできるのは、独立したstaticまたはbounded-derived admissionがある場合だけである。

## 共通適合要件

Contractとfixtureのvalidationは、次をすべて証明しなければならない。

1. 全`behaviorId`、`ruleId`、`strategyId`、`sourceId`が1回だけ定義され、全referenceが相互解決し、英語と日本語の
   rowがsemantically equivalentである。
2. 全Repository matcherが`./`で始まり、bare `**/`を拒否する。Exact、direct-child、`./**/` descendant、fixed-
   subtree recursive formに、それぞれ別のpositive fixtureとnear-miss fixtureがある。Matcher fixtureはcanonical bare `*`をacceptし、
   misplaced/adjacent `**`、全non-ASCIIまたはforbidden literal/suffix code unitをrejectする。
3. `./**/` fixtureが証明するのは下向きInspector inventoryだけであり、upstream traversalが確立していない場合は
   vendor-runtime factを別のunknownまたはconditionalとして保持する。
4. Typed matcherがimmutableかつversionedなplanへdeterministicallyにcompileされる。Global call-trace fixtureは、
   exact targetがrootを`opendir`せず、fixed subtreeがそのsubtreeと許可されたdescendantだけをopenし、隣接pathへの
   `opendir`、`lstat`、`realpath`、open、read callが0件であることを証明する。Preview fixtureは`pathPatterns`が
   同じplanから生成され、consent digestがそのversion、closed selection policy、canonical programへbindすることを証明する。
   Codex traceは両ordered targetへ独立にabsent、empty、BOM-only、whitespace-only、non-empty、replacement-decoded、binary、
   non-regular caseを適用し、exact structural-`lstat` `ENOENT`とその他すべてのthrow/rejectionを区別して
   short-circuit/propagation動作と両selectorを同時にpublishしないことを証明する。
   Shared-prefix Global traceは各selectorがrow 20、全row-2 prefix observation、その直後のrows 4–7 directory checkを次descendant
   operand前に独立して実行し、cross-selector admission cacheがcallをsuppressしないことを証明する。
   Global-consent fixtureはselector-shaped inputをrejectし、frozen entry 3つすべてをevaluateし、deterministicにrejectされた
   rootをisolateし、admit済みone-root Sourceをすべて1 batch generationへpublishする。その他のthrow/rejectionはprovisional
   subset全体をabortすることも証明する。
5. 全staticおよびbounded-derived ruleにpositive、root/nested、boundary、symlink、alias、thrown/rejected operation、該当する
   multi-tool fixtureがある。Derived fixtureはさらにcallbackまたはfree-form path constructionを使わないclosed
   `DerivationProgram` interpretation、nonrecursive derivation、containment、正常完了時のdeterministic retention、
   domain resultを作らないowning-boundary propagation、rejected targetをreadしないことを証明する。
6. Relationship-onlyとexcluded fixtureは、targetが存在する場合やgeneric filenameにmatchする場合もread authorityが
   0であることを証明する。FR-015からFR-018の外側で記録したUser behaviorはGlobal candidateにならない。
7. 1 Source scan attempt内でcomplete static discoveryはgroup readより先に完了し、usableな複数admissionを持つphysical groupを
   1回だけreadして独立した各provenanceを保持する。Matcher、evidence、record-by-record documentation/lifecycle assessment、
   scope/order、applicabilityをcollapseせず、
   各admitted hard-link pathが自身のticketを全post-read checkまで保持する。Cross-Source/attempt/generation fixtureは独立readを証明する。
   Codex fixtureはordered-fallback hard-linkのexplicit zero-read rejection、derived fixtureは別のlate-derived rejectionを証明する。Identity fixtureは
   `ino === 0n`、absent/non-bigint/zero `nlink`、changing `nlink`、identical unusable tuple、`nlink < admittedPathCount`を扱い、
   すべてaccepted byte 0のboundary-unverifiableとする。
8. 全supported OS上の中央集約Node.js filesystem fixtureはexact pure root grammar、anchor/component row-1 operand、POSIX Buffer/
   Windows code-unit form、malformed/device/current-drive/drive-relative reject、mixed separator formを含む全two-leading-separator
   UNC/server-share/device spelling、POSIX root U+FFFD reject、`process-cwd` identity verification、
   original relative `--cwd` spellingへのzero probeを扱う。さらにexact-component canonical containment、lexical/`realpath` escape、
   redundant-only `path.relative` rejection、正確なrow 20、per-selector row 2とrows 4–7、rows 21–24 pre-directory-open、
   rows 25–28 post-directory-enumeration、candidate phaseの`lstat`/`realpath`/2回目`lstat`順序を扱う。Directory fixtureはexplicit
   `Dir.read()`中にentryをcreate/remove/renameし、metadata-stale failure、confirmed close、descent/ticket/byte 0、generation非publishを証明する。
   また、symlink/non-regular rejection、利用可能時の有効な`O_NOFOLLOW`使用、上記全pre-read/post-read比較、root/parent/final-entry replacementを扱う。Stable-
   symlink fixtureはcandidate `realpath` callより前の拒否を証明する。通常の同時変更またはその他のdetectable
   changeではbyteをpublishせず、actionable diagnosticでfailする。正常に返されたambiguousまたはunusableなmetadataは
   `safe-fs-boundary-unverifiable`を返し、exact structural-`lstat` `ENOENT`だけをabsent/disappearedへ変換し、その他の
   throw/rejectionはすべてpropagateする。Node.jsが観測不能なOS behaviorはplatform limitationとして記録し、
   threat model外のactive-adversary raceに対するproofとして数えない。Explicit UNC/server-share spellingはfilesystem/DNS/SMB call 0を証明するが、
   mapped drive/POSIX network mountはlexically識別不能なpost-consent filesystem I/Oとしてtest/documentし、FR-022のzero-prohibited-direct-product-request assertionの対象外とする。
   このassertionはexactな2つのauthorized internal loopback classを別々に観測し、そのclass外のrequestをすべてrejectする。これにはcustomization-selected、remote-reference、MCP requestを含む。
9. Path spelling fixtureにはrelevant/irrelevant位置のinvalid UTF-8 POSIX Buffer name、literal U+FFFD name、Windows unpaired-surrogate/
   unknown-`Dirent` case、immutable exact-target segment、exact raw segmentでreadしてNFC displayするcollision-free NFD-only nameを含める。
   Decode前のrelevance判定、unrepresentable relevant nameのzero entry I/O、source-fatal pathless lifecycle ownership、generation/partial item
   非publish、invalid non-NUL file-content UTF-8の別replacement処理を証明する。NFC/NFD sibling collision fixtureも
   `safe-fs-path-normalization-collision`をemitし、全memberのdescend/open/readを0件、generationを非publishとし、ambiguous pathなしで
   lifecycle ownerを正確に1つ公開する。Hard-link fixtureはdeterministic primary/alias order、retained raw provenance/ticket、全path UI
   matching、primary-only file Diagnostic location、primary-handle read 1回、open前/read前/read後の各時点でaliasがdisappear/replaceされた
   場合のrejectと全byte破棄を証明する。
10. Official-source fixtureは公式HTTPS host、列挙済みanchor、review date、semantic fingerprint、影響contractへの
   backlink、human-only updateを検証する。Drift resultがbehavior、rule、strategyを自動変更してはならない。
11. Unknown matcher、traversal、derivation kind、不正なtoken列または位置、selector/programの対応またはcanonical
   round-tripの不一致、malformed selector、duplicate identifier、orphan reference、contract version mismatch、
   英日semantic differenceがあるregistryはfail closedにする。
12. Production-call instrumentationはsole accepted handleからのcontent read 1回とmutation-capable API/flag 0を証明する。Write/truncate/create/
    rename/delete/link、chmod/chown、utimes、xattr、ACL、requested atime mutationを使わない。External harnessだけがexecution前後のbyteと、
    stable APIがある場合のxattr/ACLをsnapshotし、そのobservationをsecond product readにしない。OS由来atime changeは別記する。
13. Resource-lifecycle fixtureはpreallocated `opening` reservation、open/opendir rejection、synchronous attachment failureのprocess-fatal、explicit
    `Dir.read()`、close call 1回、synchronous close throw、concurrent closer join、FileHandleのevent-before-fulfillment/event-before-rejection/
    rejection-before-late-event、`Dir.close()` rejection、poison clear、restart-required directory unknown、disable-lineage transfer、全required closeの
    confirmationまでpublication 0を証明する。

Matcher base、selector/program、derived expansion summary、read-authorizing class、Global scopeの変更はcontract semanticsの変更である。
Maintainerはidentifier compatibilityをreviewし、影響する全evidence backlinkとfixtureを更新し、両言語contractを
同時に更新し、受理するGlobal boundaryが変わる場合はconsent-bound contract versionをbumpしなければならない。
Implementation freeze taskは承認済みbilingual Presentation Allowlistとdigestを検証するだけである。Membership、
source-form applicability、extractor、relationship kindを作成またはsemanticに編集してはならない。そのようなdeltaがあれば
dependent workを停止し、designを同期してplan/taskを再生成する必要がある。
