# Vendor Integration 要件チェックリスト: Antigravity CLI のサポート

[English](vendor-integration.md)

**目的**: Antigravity CLI を4つ目のサポート対象ツールにする要件 — 読み取り allowlist と evidence、親仕様の改訂、Global member、文書とリリース evidence の義務 — が、task 生成の前に完全・正確・一貫・測定可能であることを検証する
**作成日**: 2026-09-10
**対象機能**: [Antigravity CLI のサポート仕様](../spec.ja.md)
**深さ**: Standard
**読み手 / 時期**: 作者、`/speckit-tasks` の前

**注記**: このチェックリストは書かれた要件の品質を評価する。製品の振る舞いや実装の適合性を試すものではない。

## 要件の完全性

- [x] CHK001 FR-002 と FR-009 が admit するすべての location に、文書化された vendor behavior の行、Inspector rule の行、vendor contract 中の引用済み公式見出しがあり、類推だけに立つ admit されたパスが1つもないか [Completeness, Spec §FR-002, §FR-009; Contract §Inspector Repository rule, §Inspector Global rule]
- [x] CHK002 FR-003 と FR-010 が名指すすべての除外が、述べられた理由と contract の excluded group の behavior record を伴い、読み手が「書き忘れ」と「決定」を見分けられるか [Completeness, Spec §FR-003, §FR-010; Contract §Relationship-only と excluded group]
- [x] CHK003 このツールが publish する kind が行の単位 — ファイル、宣言された名前、宣言された server 名 — とともに名指され、publish しない kind が触れられないままではなく列挙されているか [Completeness, Spec §FR-004–FR-006, §FR-011, §FR-012; Data Model §Compiled unit]
- [x] CHK004 FR-014 が、このリリースがサポートしない製品を名指してはならない artifact の種類 — vendor module、contract、registry record、fixture、文書の節、label、mark、evidence record — をすべて名指し、凍結された件数にも届いているか [Completeness, Spec §FR-014; Plan §Implementation Boundaries]
- [x] CHK006 FR-001 が変わる親仕様の条項を列挙し、research § 11 が同じ集合を挙げ、片方にしか名指されない artifact がないか [Completeness, Spec §FR-001; Research §11]
- [x] CHK007 ファイルの形の skill の detail の要件 — file panel を出さない、tab strip を出さない、見出しは変えない — が、要件の裏付けのない表示上の判断のままではなく述べられているか [Completeness, Spec §FR-004, §Clarifications; Data Model §skill の行と detail]
- [x] CHK008 contract が名指す各 strategy が operation と引用済みの根拠を持ち、ページが解決を述べないものも含めて記録されているか [Completeness, Contract §Canonical evidence-assessment index, §文書化済み Repository behavior]

## 要件の明確さ

- [x] CHK009 「このリリースがサポートしない製品をどの surface も名指さない」が確認可能に書かれているか。SC-006 が探索対象 — 識別子、label、mark、contract、凍結件数 — を定義し、「痕跡なし」を判断に委ねていないか [Clarity, Spec §FR-001, §FR-014, §SC-006]
- [x] CHK010 member の label が1つの綴りに固定され、隣に表示される root パスとは別のものとして述べられ、2つが1つの field と読まれないか [Clarity, Spec §FR-008, §Clarifications]
- [x] CHK011 member に環境プロパティがないことが、読み手が推し量るべき欠落ではなく、理由を伴う要件として書かれているか [Clarity, Spec §FR-008; Research §4]
- [x] CHK012 ファイルの形の skill の命名規則が正確か。frontmatter の `name`、なければファイル自身の名前、そして拡張子が名前に含まれるかどうかを含む — 2026-09-10 に、代替の名前が拡張子を除いたファイル自身の名前であることを FR-004 に述べて充足した [Clarity, Spec §FR-004]
- [x] CHK013 home の settings ファイルについて「1つの carrier が3回 recognize される」ことが述べられ、ファイルとしては1度だけ現れ、重複行なしに3つの kind に届くと読み手が分かるか [Clarity, Spec §FR-011]
- [x] CHK014 `Antigravity CLI` がどの surface でも唯一の表示綴りとして固定され、ユーザー向けテキストの要件に別の綴りが現れないか [Clarity, Spec §FR-001]
- [x] CHK015 ルートのみの context の規則が、ネストした `GEMINI.md` や `AGENTS.md` を admit すると読めない形で書かれ、深さが確定した vendor の事実ではなく既知の不確実性として記録されているか [Clarity, Spec §FR-007; Contract §既知の不確実性 項目 1]
- [x] CHK016 legacy の MCP key の扱いが、製品が行わない検証としてではなく、書かれたものを分類せずに示すこととして述べられているか [Clarity, Spec §FR-005]

## 要件の一貫性

- [x] CHK017 FR-002 のリポジトリ location と contract の Inspector Repository rule が同じ集合を挙げ、片方にしかないパスがないか [Consistency, Spec §FR-002; Contract §Inspector Repository rule]
- [x] CHK018 FR-009 の home location と contract の Inspector Global rule が同じ集合を挙げているか [Consistency, Spec §FR-009; Contract §Inspector Global rule]
- [x] CHK019 FR-012 が挙げる「このツールが1つも publish しない kind」が、contract の presentation allowlist が持つ kind と整合するか [Consistency, Spec §FR-012; Contract §Initial release の規範的 presentation allowlist]
- [x] CHK020 member の記述が FR-008、data model の tuple、quickstart の consent の手順で5つに揃っているか [Consistency, Spec §FR-008; Data Model §GlobalMemberId と member の tuple; Quickstart §5つ目の member を見る]
- [x] CHK021 FR-013 が Copilot の root の recognition を変わらないものとして述べ、この機能が Copilot の record を編集すると示唆していないか [Consistency, Spec §FR-013]
- [x] CHK022 skill の行の決定が FR-004、User Story 3、data model で一致しているか。1つの名前に1行、両方の定義、優先順位なし [Consistency, Spec §FR-004, §US3; Data Model §skill の行と detail]
- [x] CHK023 member id と label が動くことを踏まえて、plan の「DTO の形は変わらない」という主張が data model と整合するか [Consistency, Plan §Constitution Check; Data Model §GlobalMemberId と member の tuple]

## 受け入れ基準の品質

- [x] CHK024 各成功基準が実装を名指さずに測定可能であり、品質を主張するのではなく何を数えるかを述べているか [Measurability, Spec §SC-001–§SC-007]
- [x] CHK025 初回利用評価の要件が測定可能か。何をもって実行が完了とされ、記録は何を述べる必要があるか [Measurability, Spec §QR-003; Quickstart §リリース evidence]
- [x] CHK026 outcome manifest の義務が「manifest を更新する」ではなく、version と digest の帰結を伴う denominator の変更として述べられているか [Measurability, Spec §QR-003, §QR-004; Quickstart §リリース evidence]

## シナリオと edge case の網羅

- [x] CHK027 読み手が出会いうる失敗ごとに edge case が述べられているか。frontmatter が parse できない skill ファイル、形式が parse できない MCP ファイル、空の skills ディレクトリ、端末のディレクトリを持たない home [Coverage, Spec §Edge Cases]
- [x] CHK028 vendor のページが合成を述べない箇所 — 同名の workspace と global の skill、同名の workspace と global の MCP server — で、製品が述べないことが gap のままではなく決定として書かれているか [Coverage, Gap; Contract §既知の不確実性 項目 2–3]
- [x] CHK029 `agent.md` の隣に他のファイルを持つ custom agent のディレクトリについて、それらが挙がるかどうかが読み手に分かる要件があるか — 2026-09-10 に、そのディレクトリは `agent.md` だけを挙げるという edge case を加えて充足した [Coverage, Gap, Spec §FR-006]

## 非機能要件・依存・前提

- [x] CHK030 vendor の mark の依存への帰結が述べられているか。collection を取らない限り package を追加しないこと、取る場合は icon の方針の3点セットが同時に揃うこと [Dependency, Plan §Technical Context; Research §8]
- [x] CHK031 home の security 要件がパスの一覧ではなく分類として述べられ、vendor が後から足す state ファイルが既に除外されているか [Non-Functional, Spec §QR-005, §FR-010]
- [x] CHK032 strict JSON という前提が、製品の読みが vendor の読みと分かれた場合にどうするかとともに述べられているか [Assumption, Spec §Assumptions; Data Model §Parser format の表]

## 曖昧さと矛盾

- [x] CHK033 admit されるパス、行の単位、命名規則のいずれかが、引用したページが述べない推論に立っていないか。立っている箇所がそれぞれ documented ではなく既知の不確実性として記録されているか [Ambiguity, Spec §FR-015; Contract §既知の不確実性]
- [x] CHK034 FR-001 の「他の製品を名指さない」と、label・パス・文書に現れる `~/.gemini` との緊張が明示的に解かれ、ディレクトリ名が製品の名指しに当たるかを読み手が判断せずに済むか [Conflict, Spec §FR-001, §FR-008, §Clarifications]

## 注記

- 各項目は書かれた要件についての問いである。問われている要件が存在し、正確で、名指す artifact と整合していれば通過する。読み手が答えを推し量る必要があれば通過しない。
