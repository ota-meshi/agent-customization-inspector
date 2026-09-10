# Vendor Integration 要件チェックリスト: Gemini CLI のサポート

[English](vendor-integration.md)

**目的**: Gemini CLI を追加する要件 — その read allowlist と evidence、親仕様の改訂、5つ目の Global member、文書と release-evidence の義務 — が、task 生成の前に完全・正確・一貫・測定可能であることを検証する
**作成日**: 2026-09-10
**機能**: [Gemini CLI のサポートに関する仕様](../spec.ja.md)
**深さ**: Standard
**対象 / 時期**: 作者。`/speckit-tasks` の前

**Note**: このチェックリストは書かれた要件の品質を評価する。プロダクトの挙動や実装の適合性は検査しない。

## 要件の完全性

- [ ] CHK001 FR-002 と FR-010 が admit するすべての場所に、文書化された vendor behavior の行、Inspector rule の行、vendor contract で引用された公式 heading があり、類推だけに依る admit パスがないか？ [Completeness, Spec §FR-002, §FR-010; Contract §Inspector Repository rules, §Inspector Global rule]
- [ ] CHK002 FR-003 と FR-010 が名指しするすべての除外に、述べられた理由と contract の excluded group の behavior record があり、読者が漏れと決定を区別できるか？ [Completeness, Spec §FR-003, §FR-010; Contract §Relationship-only and excluded groups]
- [ ] CHK003 Gemini CLI が publish する8つの kind すべてが、その行の単位 — ファイル、宣言名、`:` で結んだパス、宣言された server 名 — と共に名指しされているか？ [Completeness, Spec §FR-006–FR-009; Data Model §Compiled unit]
- [ ] CHK004 FR-001 は3ツールまたは4メンバーから変わる親仕様のすべての clause を列挙し、research § 10 は同じ集合 — data-model、http-api、readme、study input、`validation.md` を含む — を挙げ、片方だけに名指しされる artifact がないか？ [Completeness, Spec §FR-001; Research §10]
- [ ] CHK005 親の FR-018 に対する Gemini CLI の managed・runtime state の除外は、他 vendor が使う同じ分類 — インストール済みコピー、trust record、environment file、credential、session と history の state、一時ファイル — で綴られているか？ [Completeness, Spec §FR-010]
- [ ] CHK006 `.agents/skills/` の3つ目の recognition はリポジトリと shared agent home の両方について述べられ、「読むもの」の記述の所有者として `docs/which-files-are-listed` が名指しされているか？ [Completeness, Spec §FR-002, §FR-012, §QR-004]
- [ ] CHK007 8つの strategy record それぞれが、解決が `unknown` のものも含め、operation と引用された根拠を持つか？ [Completeness, Data Model §Vendor registry record; Contract §Canonical evidence-assessment index]

## 要件の明確性

- [ ] CHK008 context file の「任意のディレクトリ」は明示的に境界付けられているか — 選択された root とその下、root の上への親 walk は除外、walk 自身の除外 (`node_modules`、VCS internals) は言い直さず継承？ [Clarity, Spec §FR-002, §FR-005, Edge Cases]
- [ ] CHK009 `GEMINI_CLI_HOME` の導出は各 lexical state — absent、eligible、present-empty、relative、invalid — について、分類が join に先立つことを含めて述べられ、推論に任される state がないか？ [Clarity, Spec §FR-011, Edge Cases; Data Model §GlobalRootInputCapture]
- [ ] CHK010 受け付ける `context.fileName` の文法は正確 — 空でない文字列、または空でない文字列の空でない配列 — で、それ以外の形 (空文字列、空配列、混在配列、別の型) それぞれに正確に1つの outcome が割り当てられているか？ [Clarity, Spec §FR-004, Edge Cases]
- [ ] CHK011 command 名の導出は直接の子と入れ子パスについて述べられ、プロダクトが entry 名を `/` で結んで保持することを踏まえ、どの区切りを `:` に置き換えるかが明確か？ [Clarity, Spec §FR-006]
- [ ] CHK012 「1つの carrier が3回認識される」は、settings ファイルがファイルとしては1回現れ、行を重複させずに3つの kind に届くと読者が分かるように述べられているか？ [Clarity, Spec §FR-009]
- [ ] CHK013 skill 行の命名規則 — 宣言された `name`、fallback はディレクトリ — は親と同じに述べられ、名前はディレクトリと一致すべきという vendor の指針をプロダクトが強制しないことは明確か？ [Clarity, Spec §FR-007]
- [ ] CHK014 `Gemini CLI` はすべての surface での唯一の表示表記として固定され、ユーザー向け文言の要件に別表記 (`Google Gemini CLI`、`gemini`) が現れないか？ [Clarity, Spec §FR-001, §Clarifications]

## 要件の一貫性

- [ ] CHK015 計画が既定を持つ派生ルール1本を作る以上、FR-002 の instructions の節は導出の隣に静的な `GEMINI.md` ルールがあると示唆しない表現になっているか？ [Consistency, Spec §FR-002; Research §2; Contract §Derived Repository rules]
- [ ] CHK016 FR-004 (「何も設定せず、`GEMINI.md` が残る」) と User Story 3 シナリオ3 (parse 失敗、absent であるかのように `GEMINI.md`) は、どの recognition が diagnostic を持つかを含め同じ outcome を述べているか？ [Consistency, Spec §FR-004, US3]
- [ ] CHK017 `hooks` object が何を宣言していても matcher で hook recognition を持つという FR-009 は、User Story 1 シナリオ3 と、引用する Claude・Codex の前例と一致するか？ [Consistency, Spec §FR-009, US1]
- [ ] CHK018 FR-011、Assumptions、data-model の5メンバー tuple のメンバー順は一致するか？ [Consistency, Spec §FR-011, Assumptions; Data Model §GlobalMemberId と member tuple]
- [ ] CHK019 Copilot のルート `GEMINI.md` recognition は — 保たれる、ルートだけ — FR-013、User Story 1 シナリオ1–2、User Story 3 シナリオ1 で同一に記述されているか？ [Consistency, Spec §FR-013]
- [ ] CHK020 contract の presentation allowlist の kind は要件が publish する kind と一致するか — `plugin` なし、`rule` なし、`permissions` は Global member だけ？ [Consistency, Contract §Normative initial-release presentation allowlist; Spec §FR-002, §FR-010]
- [ ] CHK021 parser format の決定と trailing comma の注記は research § 6 と contract で同じに述べられ、noise になるユーザー向け文書の要件からは外されているか？ [Consistency, Research §6; Contract §Inspector Repository rules; Spec §QR-004]

## Acceptance Criteria の品質

- [ ] CHK022 SC-001 は名指しされた fixture 集合だけから測れるか — ファイルごとの期待 recognition 数 (ルート `GEMINI.md` に2、`.agents/skills/` に3) を固定しているか？ [Measurability, Spec §SC-001]
- [ ] CHK023 SC-002 は「すべての selector family への near-miss」を fixture を列挙できるほど具体的に — どの family、どの near-miss — 定義しているか？ [Measurability, Spec §SC-002]
- [ ] CHK024 SC-003 は `GEMINI_CLI_HOME` の4状態と、状態ごとの期待 root と分類を、test がそのまま読み取れる形で述べているか？ [Measurability, Spec §SC-003; Data Model §GlobalRootInputCapture]
- [ ] CHK025 SC-005 は containment gate をその測定として名指しし、その gate が得なければならない派生ルールの `GEMINI.md` と `context.fileName` の記載も cover しているか？ [Measurability, Spec §SC-005; Research §9]
- [ ] CHK026 評価再実施の条件は、判断ではなく名指しされた artifact — どの指定ファイル、どの ground-truth field — から決定可能か？ [Measurability, Spec §Clarifications, §QR-002]

## シナリオと Edge Case の coverage

- [ ] CHK027 `.gemini/` 内の `GEMINI.md` について要件が述べられているか — 導出する range と、ディレクトリを剥がさないこと？ [Coverage, Spec §FR-005, Edge Cases]
- [ ] CHK028 設定された context filename が他ツールの instruction file である場合 — Codex はルートだけ、Copilot は任意の場所、Gemini CLI は任意の場所で読む `AGENTS.md` — について、range で key された行上の複数 recognition を持つ1ファイルとして要件が述べられているか？ [Coverage, Spec US3 シナリオ1; Data Model §Customization File と Tool Recognition]
- [ ] CHK029 `mcpServers` の値が空、absent、または object でない場合 — MCP 行なし、settings 行は不変 — について要件が述べられているか？ [Coverage, Gap, Spec §FR-009]
- [ ] CHK030 parse できない、または命名 field を欠く sub-agent や command のファイルについて — 不明な名前かパス由来の名前か、diagnostic がどこに載るか — declared-name と path-named の family と一貫した要件が述べられているか？ [Coverage, Gap, Spec §FR-006, §FR-008]
- [ ] CHK031 symbolic link である Gemini CLI home、またはディレクトリでなくファイルを指す `GEMINI_CLI_HOME` について要件が述べられているか？ [Coverage, Spec §FR-011; 親 FR-014, FR-024]
- [ ] CHK032 5つ目のメンバーの disable と retry の挙動は、継承に任せるのではなく、他と同一 — メンバーごとの selector なし — と述べられているか？ [Coverage, Spec §FR-011, US2]

## 非機能要件、依存関係、Assumption

- [ ] CHK033 公式ページ、その取得日、引用しない2つのパス (redirect、404) は、`reviewedOn` の値と host を再導出せずに入力できるように記録されているか？ [Dependency, Research §8; Contract header]
- [ ] CHK034 settings loader の計測 (コメントを剥がす) は、official-source verification policy に従い、現れるすべての箇所で文書ではなく計測として mark されているか？ [Assumption, Research §6; Contract §Known uncertainties]
- [ ] CHK035 freeze と gate の更新 — count、digest 表、version literal、manifest version、containment gate の配列、この機能の task 数 freeze — は、test が失敗してはじめて見つかるものがないよう網羅的に列挙されているか？ [Dependency, Research §9; Spec §QR-002]
- [ ] CHK036 新しい mark の accessibility 要件は他と同じに述べられているか — accessible name はプロダクト名、legend は key、色だけでは情報を運ばない？ [Non-Functional, Spec §FR-001, §QR-004]
- [ ] CHK037 changeset の level (`minor`) とその理由は、pull request 時に任せず要件として記録されているか？ [Dependency, Spec §QR-004; Research §移行影響]

## 曖昧さと矛盾

- [ ] CHK038 派生ルールへの再構成の後、contract のどこかに静的な `GEMINI.md` ルールを示唆する文言が残っていないか — assessment index、uncertainties、allowlist の行？ [Ambiguity, Contract §Canonical evidence-assessment index, §Known uncertainties]
- [ ] CHK039 vendor の語「workspace」は、両方が現れるすべての箇所で「Repository Source」「選択された root」と区別され、`context.includeDirectories` が root を広げると読まれないか？ [Ambiguity, Spec §FR-005; Contract §Documented Repository behavior]

## Notes

- 完了した項目は `[x]` で mark する
- comment や所見は inline に書く
- 項目は参照しやすいよう連番である
