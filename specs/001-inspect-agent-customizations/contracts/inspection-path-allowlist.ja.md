# 契約: 調査対象パスallowlistの文法とindex

[English](inspection-path-allowlist.md)

**契約バージョン**: 2026-07-15

**公式資料の再検証日**: 2026-07-15

**規範対象**: Rule class、matcher表記、source boundaryの解釈、read認可、vendor横断の適合要件

この文書はinspection rule registryの共通文法とinvariantを定義する。Vendor matrixそのものではない。
正確なvendor behavior、Inspector rule、runtime composition、evidenceは、以下のリンク先contractで一度だけ
定義する。

## Contract mapとidentifierのownership

| Contract | 唯一のownership |
|---|---|
| [GitHub Copilot](vendors/github-copilot.ja.md) | Copilotの`behaviorId` statementと、Copilotのstatic、bounded-derived、excluded `ruleId`定義 |
| [Claude Code](vendors/claude-code.ja.md) | Claudeの`behaviorId` statementと、Claudeのstatic、bounded-derived、excluded `ruleId`定義 |
| [OpenAI Codex](vendors/openai-codex.ja.md) | Codexの`behaviorId` statementと、Codexのstatic、bounded-derived、excluded `ruleId`定義 |
| [Runtime composition](runtime-composition.ja.md) | `strategyId`定義、precedence/composition projection、relationship-only `ruleId`定義、vendor横断のshared non-read `ruleId`定義 |
| [公式資料](official-sources.ja.md) | `sourceId`、canonicalな公式URL、boundedなsection anchor、review日、影響contractへの相互参照 |

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
したconsentを必要とする。1つの論理Global sourceは、consent済みのvendor home boundaryを別々に持ち得るが、
それらはRepositoryのchildではなく、Repository sourceへmergeしない。

Vendor contractは保守と将来のreviewのため、文書化済みの追加User behaviorを記録できる。そのrecordはread
authorityを与えない。FR-015からFR-018により、明示的にcontract化したGlobal instruction ruleだけがGlobal
candidateをclassifyできる。追加User settings、agent、skill、hook、MCP configuration、plugin、state、隣接
directoryは、仕様が変更されるまでexcludedのままとする。

## Structured Inspector matcher表記

全static Inspector ruleは、次のfieldを分離する。

| Field | 意味 |
|---|---|
| **Base** | 有効な1つの正確なboundary。`Repository`またはconsent済みのnamed `Global` vendor boundary |
| **Relative selector** | Boundary相対かつ`/`でnormalizeしたselector。Absolute path、environment expansion、home expansion、URI、暗黙のancestor searchを含まない |
| **Expansion** | `exact`、`direct-child`、`descendant-inventory`、`recursive-subtree`のいずれか1つのclosed mode |

Structured fieldをauthoritativeとする。Tableにcompact selectorを表示する場合、それはこれらのfieldをlosslessに
表記したものに限る。

### Repository selectorの要件

全Inspector Repository selectorは、正確なRepository source rootを意味するliteral `./`で始める。Bareな
`**/` prefixはinvalidであり、registry validationをfailureにしなければならない。

| Form | 必須のexpansion | 意味 |
|---|---|---|
| `./path/file` | `exact` | Repository source root相対の正確な1 file |
| `./path/*` | `direct-child` | Root相対の1 directoryのmatching direct child。`*`は`/`をcrossしない |
| `./**/name` | `descendant-inventory` | Root levelとその下を対象にした明示的なInspector inventory。`**`は0個以上のdirectory segmentを表す完全な1 segment |
| `./path/**/*.ext` | `recursive-subtree` | Root相対の1 subtree内の明示的なrecursive Inspector inventory。Subtree root levelも含む |

`./**/`が表すのはInspectorの下向きdescendant inventoryだけである。Vendorが下向きまたは上向きにwalkする、
ancestorを探す、すべてのnested repositoryを認識する、あるruntime contextでmatch fileを適用する、のいずれも
意味しない。これらの主張には別のvendor behavior recordとstrategy recordが必要である。

`*`は正確に1つのnon-empty segmentにmatchする。`**`はcomplete segmentとしてのみ、かつ明示的にrecursionを
許すexpansionでだけ有効である。Direct-child selectorとexact selectorはrecursive subdirectoryを暗黙に含まない。
Repository rule tableはcompact textだけに依存せず、Base、Relative selector、Expansionを別々に記載しなければ
ならない。

### Global selectorの要件

Global ruleは1つの正確なconsent済みvendor boundaryをBaseとして指定し、そのboundary相対のselectorを持つ。
Environment/default-homeの解決はboundary作成の責務であり、selectorの責務ではない。Global selectorは
Repository用の`./` prefixを再利用せず、別vendor boundaryを認可せず、FR-015からFR-018が許可するpathを
拡張できない。

### MatchingとNode.js entry verification

Pathはclassificationのためだけに`/`へnormalizeする。Canonicalまたはnormalized stringはdiagnostic dataで
あり、それ単独ではreadを認可しない。中央集約したNode.js filesystem serviceは、最初にlexical containmentを
確立し、source rootのidentityとcanonical `realpath`をsnapshotする。Candidateを検討する前に全ancestorを`lstat`
する。Enumeration、open直前、open後かつread前、bounded read後の全candidate verification phaseは、次の正確な順序を
使う。
(1) candidate pathを`lstat`し、symbolic link、non-regular type、unexpected identityを拒否する。(2) これが成功した
後だけcandidate `realpath`を解決し、`node:path.relative`でcontainmentを検証する。Platform separatorをnormalize
した結果はabsoluteでなく、`..`でも`../`始まりでもないことを要求する。(3) candidate pathを再び`lstat`し、identity、
type、size、関連timestampが最初の`lstat`と一致することを要求する。したがってstable symlinkはcandidate
`realpath` callがfollowする前に拒否される。Serviceは観測したroot、ancestor、path、canonical location、identity、
type、size、関連timestamp metadataを持つinternal source-relative enumeration recordを返す。Classifierは以前に
enumerateした正確なrecordだけを選択できる。

Derived selectorをenumeration-record lookupへ渡す前に、各NFC-normalized segmentについてNUL、control character、
Windows-special character、trailing dot/space、device basename、alternate-data-stream spelling、case・normalization・
short-name・その他aliasを拒否する。残った全segmentはenumerate済みentryと正確に一致しなければならない。
`.git/`、`.hg/`、`.svn/`内部はtraversal対象外とする。

## Rule class

全ruleはstableな`ruleId`と正確に1つのdiscovery classを持つ。

| Class | 意味 | Readを認可できるか |
|---|---|---|
| `static-candidate` | Ruleのstructured source-relative matcherだけでcandidateを作れる。 | Consentとsafe-read check後に可 |
| `bounded-derived-candidate` | 独立して受理したseedがclosedなvendor-specific derivationにより1 targetを宣言する。 | その1 edgeだけ、かつ全derivation bound内で可 |
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
requestできる。Candidateは有効なboundaryに属し、正確なenumerated regular-file recordにmatchし、すべての
file/source/generation limit内に残り、中央集約したNode.js serviceによるlexical/`realpath` containmentの再確認と
enumeration/open/post-read identity checkに合格しなければならない。

Bounded derivationは、独立して受理したstatic seedからの正確に1つのtyped edgeである。Derived candidateは別の
derivationをseedできない。Relationship-onlyおよびexcluded rule、vendor locator、runtime strategy、import、
component reference、remote source、MCP-server-provided instructionはreadを認可しない。

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
- Bounded read後かつparse、publish、commitより前に、root identityと全ancestor `lstat`を反復し、同じordered
  candidate verification sequenceを実行して、同じopen中`FileHandle`の`stat()`を呼ぶ。Error、ambiguity、
  containment failure、identity、type、size、関連timestampの変化を検出した場合はbyte buffer全体をdiscardして
  fail closedにする。Boundaryを検証不能な場合は`safe-fs-boundary-unverifiable`、その他の検出済みraceは該当する
  boundedかつsecret-safeなdiagnosticを返す。
- Public Node.js APIにはportableなdirectory-handle-relative openがない。そのためactiveなparent-directory
  replacementに限らず、activeなadversarial processはcheck間にancestorまたはfinal componentを置換でき、
  `O_NOFOLLOW`が存在しないか有効でない場合を含め、cross-platformなkernel-enforced containment guaranteeはない。
  このactive adversarial mutationは初期リリースのthreat model外とする。通常の同時editと全detectable raceは
  scope内であり、fail closedにして全byteをdiscardしなければならない。Same-device bind mount、報告されない
  reparse behavior、Node.jsが公開しないその他のOS semanticsは明示的なplatform limitationであり、absoluteな
  containment guaranteeとして表現しない。
- File byte、visited entry、candidate count、derivation fan-out、relationship count、parser work、diagnostic、
  deadlineには[data-model contract](../data-model.ja.md)の正確なlimitを使う。Limit到達時はcontract化したpartial resultまたはdiagnosticを
  返し、暗黙のexpansion、unbounded retry、fallback readを行わない。
- Unsafe、unreadable、malformed、changed、oversizedなcandidateが1つあっても、unaffected candidateのreportを
  妨げない。
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
4. 全staticおよびbounded-derived ruleにpositive、root/nested、boundary、symlink、alias、resource-limit、該当する
   multi-tool fixtureがある。Derived fixtureはさらにone-edge depth、fan-out limit、containment、deterministic
   retention、最初のrejected targetをreadしないことを証明する。
5. Relationship-onlyとexcluded fixtureは、targetが存在する場合やgeneric filenameにmatchする場合もread authorityが
   0であることを証明する。FR-015からFR-018の外側で記録したUser behaviorはGlobal candidateにならない。
6. 複数admissionを持つphysical fileは1回だけreadし、独立した各provenanceを保持する。Matcher、evidence、
   documentation、scope/order、applicabilityをcollapseしない。
7. 全supported OS上の中央集約Node.js filesystem fixtureは、lexical/`realpath` escape、`path.relative`
   containment、全phaseの正確な`lstat`/`realpath`/2回目`lstat`順序、symlink/non-regular rejection、利用可能時の
   有効な`O_NOFOLLOW`使用、上記全pre-read/post-read比較、root/parent/final-entry replacementを扱う。Stable-
   symlink fixtureはcandidate `realpath` callより前の拒否を証明する。通常の同時変更またはその他のdetectable
   changeではbyteをpublishせず、bounded diagnosticでfailする。報告されたerror、ambiguity、unusable metadataは
   `safe-fs-boundary-unverifiable`を返す。Node.jsが観測不能なOS behaviorはplatform limitationとして記録し、
   threat model外のactive-adversary raceに対するproofとして数えない。
8. Official-source fixtureは公式HTTPS host、bounded anchor、review date、semantic fingerprint、影響contractへの
   backlink、human-only updateを検証する。Drift resultがbehavior、rule、strategyを自動変更してはならない。
9. Unknown expansion mode、malformed selector、duplicate identifier、orphan reference、contract version mismatch、
   英日semantic differenceがあるregistryはfail closedにする。

Matcher base、selector、expansion、read-authorizing class、Global scopeの変更はcontract semanticsの変更である。
Maintainerはidentifier compatibilityをreviewし、影響する全evidence backlinkとfixtureを更新し、両言語contractを
同時に更新し、受理するGlobal boundaryが変わる場合はconsent-bound contract versionをbumpしなければならない。
