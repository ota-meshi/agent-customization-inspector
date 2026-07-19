# 契約: 調査対象パスallowlistの文法とindex

[English](inspection-path-allowlist.md)

**契約バージョン**: 2026-07-17

**検査パス決定の再検証日**: 2026-07-17

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

Repository boundaryは、userが`npx`を起動した正確なprocess working directoryである。InspectorはGitまたは
productのproject rootを探すためにその上位をwalkしない。Repository inventoryはvalidated launch-root boundary
recordの内側だけで行う。Vendorが異なるruntime rootやwalk方向を使う場合、そのfactはvendor contractと
runtime-composition contractに属し、このboundaryを変更しない。

### Global

Global inspectionは新しいsessionごとに無効であり、current contract versionと正確なno-I/O previewにbind
したconsentを必要とする。Accepted vendor-home rootごとに独立したtool-specific Global Sourceを作り、Copilot、
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

- `literal(value)`はcase-sensitiveなNFC segmentを正確に1つmatchする。`value`にseparator、wildcard、empty/dot
  segment、Windows-special spellingを含めない。
- `one-segment(suffix)`はnon-empty segmentを正確に1つmatchする。`suffix`がemptyなら`*`、それ以外は
  `*<fixed-literal-suffix>`と表記する。Non-terminalならdirectory step、terminalならregular-file stepとする。
- `recursive-directories`はcomplete segment `**`だけで表記し、0個以上のdirectoryをmatchする。Terminalにはできず、
  別のrecursive tokenと隣接不可とする。

Final tokenは`literal`または`one-segment`で、regular fileを表す。Programはこのclosed typed grammarだけを使う。
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
overrideがabsentまたは安全にemptyと確定した場合だけ`AGENTS.md`へ進む。Whitespace-only fileはemptyとする。Present candidateが
unsafe、unreadable、environment failure、またはdecode不能なら後続selectorを調べずfail closedする。`absent`はroot verification後の
exact target `lstat`が明示的not-foundを返す場合だけで、permission、type、metadata、ancestor/root、canonicalization、
最初の観測後の消失はfailureとする。Policyは選択したnon-empty fileをpublishし、両selectorを同時にはpublishしない。

No-I/O Global previewの`pathPatterns`は、この同じimmutable planからrenderし、別管理のpreview allowlistを持たない。
Consent digestはcontract version、traversal-plan schema/version、closed selection policy、canonical selector programへbindする。Enable operationは
display textから再compileせず、accepted previewが表す正確なplanを実行する。

### MatchingとNode.js entry verification

Directory enumerationで得た各nameについて、serviceは正確な`Dirent.name` spellingを使ったinternal
`rawRelativeSegments`を保持する。このraw segmentはfilesystem pathの再構築、verification、readだけに使う。
別にNFCの`classificationSegments`を計算し、それを`/`でjoinしたものだけをmatcher classification、deterministic
sort、serialized `SourceRelativePath`に使う。Normalizedまたはcanonical spellingをfilesystem operation用pathへ
置き換えてはならない。

Openした各directoryは、そのentryのいずれかへdescendまたはopenする前に、completeなsibling bufferへ
収集する。Buffer完成前のrecoverableなcapacityまたはenvironment-resource failureではscan attempt全体をabortし、item、
Source、recognition、derived result、scan-result record/response、generationを一切公開せず、prior committed snapshotだけを
利用可能に保つ。不完全なtraversalをcontracted-partial resultにしてはならない。異なるraw sibling
nameが同じNFC segment、したがって同じparent-relative classification keyへnormalizeする場合、そのcollision groupの
全entryをfail closedにする。いずれにもdescendまたはreadせず、serviceはdiagnostic
`safe-fs-path-normalization-collision`をemitする。CollisionしないNFD spellingが1つだけの場合はvalidであり、serviceは
raw segmentでreadしつつ、NFCの`SourceRelativePath`でmatch、sort、displayする。

Canonicalまたはnormalized stringはdiagnostic/classification dataであり、それ単独ではreadを認可しない。中央集約
したNode.js filesystem serviceは、最初にlexical containmentを確立し、source rootのidentityとcanonical
`realpath`をsnapshotする。Candidateを検討する前にplanが認可した全ancestorを`lstat`する。Enumeration、open直前、
open後かつread前、同じhandleによるcomplete read後の全candidate verification phaseは、次の正確な順序を
使う。
(1) candidate pathを`lstat`し、symbolic link、non-regular type、unexpected identityを拒否する。(2) これが成功した
後だけcandidate `realpath`を解決し、`node:path.relative`でcontainmentを検証する。Platform separatorをnormalize
した結果はabsoluteでなく、`..`でも`../`始まりでもないことを要求する。(3) candidate pathを再び`lstat`し、identity、
type、size、関連timestampが最初の`lstat`と一致することを要求する。したがってstable symlinkはcandidate
`realpath` callがfollowする前に拒否される。Serviceは観測したroot、ancestor、path、canonical location、identity、
type、size、関連timestamp metadataを持つinternal source-relative enumeration recordを返す。Classifierは以前に
enumerateした正確なrecordだけを選択できる。

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

1つのphysical fileを複数ruleやtoolが受理できる。そのfileは1回だけreadし、各`ruleId`、matched selector、
evidence、documentation status、order fact、applicabilityを含む全accepted provenanceを保持する。Admissionを
recognition-level winnerへcollapseしてはならない。

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
  Lexical containmentと`realpath` containmentの両方を確立できない場合もfail closedにする。Node.jsが必要metadata
  またはcanonicalizationをerrored、ambiguous、unusableとして報告した場合、serviceは
  `safe-fs-boundary-unverifiable`をemitし、candidateを拒否する。Unverifiable stateがrootまたはtraversalで共有する
  ancestorに属する場合はsource全体を拒否する。
- Validated source-boundary recordと正確なenumeration recordは、中央集約したread operationだけを認可する。
  Canonical path string、relationship target、source textだけでfilesystemを直接openしてはならない。
- Open直前にserviceはroot identityとancestor `lstat`を反復し、上記のordered candidate verification sequenceを
  実行する。`node:fs.constants.O_NOFOLLOW`が存在し、そのNode.js/platform combinationで有効な場合、
  candidateを`O_NOFOLLOW`付きでopenしなければならない。これはfinal componentに対する必須のdefense in depthで
  あり、周囲のcheckの代替ではない。Open後かつbyteを読む前に同じordered candidate verification sequenceを再び
  実行し、openした`FileHandle.stat()`のidentity、type、size、関連timestampを、そのphaseの両`lstat`結果および
  enumeration/pre-open snapshotと比較する。
- Read後かつparse、publish、commitより前に、root identityと全ancestor `lstat`を反復し、同じordered
  candidate verification sequenceを実行して、同じopen中`FileHandle`の`stat()`を呼ぶ。Error、ambiguity、
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
  Recoverableなcapacity failureはattemptをabortし、contract済みlifecycle failureだけを返し、item、recognition、derived result、
  scan-result record/response、generationを一切commitせず、prior committed snapshotだけを利用可能に保つ。
  Contracted partialは、完全なtraversal後の決定的かつentry-localでcapacityに起因しないfailureだけに許可する。どちらのpathも
  暗黙のexpansion、authorityなしのretry、fallback read、validity verdictを行わない。
- Unsafe、unreadable、malformed、changedのcandidateが1つあっても、上記contracted-partial ruleを満たす場合は
  unaffected candidateのreportを妨げない。Environment-resource failureはattemptをabortし、current-attempt resultを一切公開せず、
  prior committed snapshotだけを利用可能に保つ。
- Relationshipまたはexcluded recordのtargetが存在するという理由でcandidateへpromoteしてはならない。Targetを
  readできるのは、独立したstaticまたはbounded-derived admissionがある場合だけである。

## 共通適合要件

Contractとfixtureのvalidationは、次をすべて証明しなければならない。

1. 全`behaviorId`、`ruleId`、`strategyId`、`sourceId`が1回だけ定義され、全referenceが相互解決し、英語と日本語の
   rowがsemantically equivalentである。
2. 全Repository matcherが`./`で始まり、bare `**/`を拒否する。Exact、direct-child、`./**/` descendant、fixed-
   subtree recursive formに、それぞれ別のpositive fixtureとnear-miss fixtureがある。
3. `./**/` fixtureが証明するのは下向きInspector inventoryだけであり、upstream traversalが確立していない場合は
   vendor-runtime factを別のunknownまたはconditionalとして保持する。
4. Typed matcherがimmutableかつversionedなplanへdeterministicallyにcompileされる。Global call-trace fixtureは、
   exact targetがrootを`opendir`せず、fixed subtreeがそのsubtreeと許可されたdescendantだけをopenし、隣接pathへの
   `opendir`、`lstat`、`realpath`、open、read callが0件であることを証明する。Preview fixtureは`pathPatterns`が
   同じplanから生成され、consent digestがそのversion、closed selection policy、canonical programへbindすることを証明する。
   Codex traceは両ordered targetへ独立にabsent、empty、BOM-only、whitespace-only、non-empty、unreadable、environment failure、
   decode不能、non-regular caseを適用し、exact-target not-foundとその他全errorを区別してshort-circuit/fail-closed動作と
   両selectorを同時にpublishしないことを証明する。
5. 全staticおよびbounded-derived ruleにpositive、root/nested、boundary、symlink、alias、recoverable environment failure、該当する
   multi-tool fixtureがある。Derived fixtureはさらにcallbackまたはfree-form path constructionを使わないclosed
   `DerivationProgram` interpretation、nonrecursive derivation、containment、正常完了時のdeterministic retention、
   recoverable environment failureのsafe handling、rejected targetをreadしないことを証明する。
6. Relationship-onlyとexcluded fixtureは、targetが存在する場合やgeneric filenameにmatchする場合もread authorityが
   0であることを証明する。FR-015からFR-018の外側で記録したUser behaviorはGlobal candidateにならない。
7. 複数admissionを持つphysical fileは1回だけreadし、独立した各provenanceを保持する。Matcher、evidence、
   documentation、scope/order、applicabilityをcollapseしない。
8. 全supported OS上の中央集約Node.js filesystem fixtureは、lexical/`realpath` escape、`path.relative`
   containment、全phaseの正確な`lstat`/`realpath`/2回目`lstat`順序、symlink/non-regular rejection、利用可能時の
   有効な`O_NOFOLLOW`使用、上記全pre-read/post-read比較、root/parent/final-entry replacementを扱う。Stable-
   symlink fixtureはcandidate `realpath` callより前の拒否を証明する。通常の同時変更またはその他のdetectable
   changeではbyteをpublishせず、actionable diagnosticでfailする。報告されたerror、ambiguity、unusable metadataは
   `safe-fs-boundary-unverifiable`を返す。Node.jsが観測不能なOS behaviorはplatform limitationとして記録し、
   threat model外のactive-adversary raceに対するproofとして数えない。
9. Path spelling fixtureには、正確なraw `Dirent.name` segmentでreadしNFC `SourceRelativePath`としてdisplayする
   collisionのないNFD-only nameと、同じclassification keyを持つNFC/NFD sibling spellingを含める。後者は
   `safe-fs-path-normalization-collision`をemitし、collisionした全siblingへのdescend/open/read operationが0件で
   あることを証明する。
10. Official-source fixtureは公式HTTPS host、列挙済みanchor、review date、semantic fingerprint、影響contractへの
   backlink、human-only updateを検証する。Drift resultがbehavior、rule、strategyを自動変更してはならない。
11. Unknown matcher、traversal、derivation kind、不正なtoken列または位置、selector/programの対応またはcanonical
   round-tripの不一致、malformed selector、duplicate identifier、orphan reference、contract version mismatch、
   英日semantic differenceがあるregistryはfail closedにする。

Matcher base、selector/program、derived expansion summary、read-authorizing class、Global scopeの変更はcontract semanticsの変更である。
Maintainerはidentifier compatibilityをreviewし、影響する全evidence backlinkとfixtureを更新し、両言語contractを
同時に更新し、受理するGlobal boundaryが変わる場合はconsent-bound contract versionをbumpしなければならない。
