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

**Inspector matcher**は、すでに有効な1つのsource boundary内でInspectorがどのentry ticketをclassify
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
productのproject rootを探すためにその上位をwalkしない。Repository inventoryは保持したlaunch-root
capabilityの内側だけで行う。Vendorが異なるruntime rootやwalk方向を使う場合、そのfactはvendor contractと
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

### Matchingとnative entry identity

Pathはclassificationのためだけに`/`へnormalizeする。Canonicalまたはnormalized stringはdiagnostic dataで
あり、read authorityではない。Native backendは保持したroot capabilityからenumerateしてinternal entry ticketを
返し、classifierは以前にenumerateした正確なticketだけを選択できる。

Derived selectorをticket lookupへ渡す前に、各NFC-normalized segmentについてNUL、control character、
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
requestできる。Candidateは有効なboundaryに属し、正確なenumerated regular-file ticketにmatchし、すべての
file/source/generation limit内に残り、nativeのpre-read/post-read identity checkに合格しなければならない。

Bounded derivationは、独立して受理したstatic seedからの正確に1つのtyped edgeである。Derived candidateは別の
derivationをseedできない。Relationship-onlyおよびexcluded rule、vendor locator、runtime strategy、import、
component reference、remote source、MCP-server-provided instructionはreadを認可しない。

Matchが証明するのは、authored artifactがInspector inventory scope内にあることだけである。Vendorがそれをinstall、
enable、trust、select、load、merge、followすることは証明しない。Surface、project/root context、runtime working
directory、target path、trust、approval、enablement、selection、agent context、tool availability、installation、
managed policy、instruction budget、external stateは独立したcondition factのままとする。Missingまたはexcludedな
inputをsatisfiedとしてdefaultにしてはならず、UIはcandidateをsemantically effectiveと呼んではならない。

## Symlink、alias、resource invariant

- Symbolic-link fileとdirectoryはfollowしない。Junction、mount-point change、reparse point、canonicalizeしにくい
  alias、boundary crossingはfail closedにする。
- 保持したroot capabilityと正確なentry ticketだけをfilesystem authorityとする。Canonical path string、
  relationship target、source textからpathをreopenしてはならない。
- Enumeration、open、read、verificationの間にidentityまたはmetadataが変化した場合、全byteをdiscardし、boundedで
  secret-safeなdiagnosticを返す。
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
7. Native boundary fixtureは、symlink/reparse/mount traversalがないこと、path-reopenやNode-filesystem fallbackがない
   こと、race時にexact ticket identityを保つこと、全advertised targetでboundedにsafe failureすることを証明する。
8. Official-source fixtureは公式HTTPS host、bounded anchor、review date、semantic fingerprint、影響contractへの
   backlink、human-only updateを検証する。Drift resultがbehavior、rule、strategyを自動変更してはならない。
9. Unknown expansion mode、malformed selector、duplicate identifier、orphan reference、contract version mismatch、
   英日semantic differenceがあるregistryはfail closedにする。

Matcher base、selector、expansion、read-authorizing class、Global scopeの変更はcontract semanticsの変更である。
Maintainerはidentifier compatibilityをreviewし、影響する全evidence backlinkとfixtureを更新し、両言語contractを
同時に更新し、受理するGlobal boundaryが変わる場合はconsent-bound contract versionをbumpしなければならない。
